// =============================================================================
// CLOUD AUTO-SYNC — Real-Time Encrypted Inventory Sync (STAK-149)
// =============================================================================
//
// Automatic background sync: when inventory changes, pushes an encrypted
// .stvault to Dropbox. On other devices, a background poller detects the
// new file via staktrakr-sync.json and prompts the user to pull.
//
// Sync file:  /StakTrakr/sync/staktrakr-sync.stvault  (full encrypted snapshot)
// Metadata:   /StakTrakr/sync/staktrakr-sync.json     (lightweight pointer, polled)
// Backups:    /StakTrakr/backups/                      (pre-sync + manual backups)
//
// Depends on: cloud-storage.js, vault.js, constants.js, utils.js
// =============================================================================

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** @type {number|null} setInterval handle for the polling loop */
var _syncPollerTimer = null;

/** @type {boolean} Whether a push is currently in progress */
var _syncPushInFlight = false;

/** @type {boolean} Whether the sync password prompt is currently open */
var _syncPasswordPromptActive = false;

/** @type {number} Retry backoff multiplier for 429 / network errors */
var _syncRetryDelay = 2000;

/** @type {Function} Debounced version of pushSyncVault */
var scheduleSyncPush = null;

/** @type {string} Currently active sync provider */
var _syncProvider = 'dropbox';

/** @type {BroadcastChannel|null} Multi-tab coordination channel */
var _syncChannel = null;

/** @type {boolean} Whether this tab is the sync leader */
var _syncIsLeader = false;

/** @type {number} Timestamp when this tab was opened (used for leader election) */
var _syncTabOpenedAt = Date.now();

/** @type {number|null} Timer for visibility-based leadership handoff */
var _syncLeaderHiddenTimer = null;

/** @type {object|null} Pull metadata stashed for deferred recording after preview apply */
var _previewPullMeta = null;

// ---------------------------------------------------------------------------
// Device identity
// ---------------------------------------------------------------------------

/**
 * Get or create a stable per-device UUID, persisted in localStorage.
 * @returns {string}
 */
function getSyncDeviceId() {
  var stored = localStorage.getItem('cloud_sync_device_id');
  if (stored) return stored;
  var id = typeof generateUUID === 'function' ? generateUUID() : _syncFallbackUUID();
  try { localStorage.setItem('cloud_sync_device_id', id); } catch (_) { /* ignore */ }
  return id;
}

/** Fallback UUID generator when generateUUID from utils.js is unavailable */
function _syncFallbackUUID() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, function (c) {
    return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
  });
}

// ---------------------------------------------------------------------------
// Manifest helpers (Layer 4 — REQ-4)
// ---------------------------------------------------------------------------

/**
 * Convert a SHA-256 ArrayBuffer to a hex string.
 * Shared by computeInventoryHash and computeSettingsHash.
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
function sha256BufferToHex(buffer) {
  var hashArray = new Uint8Array(buffer);
  var hex = '';
  for (var j = 0; j < hashArray.length; j++) {
    hex += ('0' + hashArray[j].toString(16)).slice(-2);
  }
  return hex;
}

/**
 * Compute a deterministic SHA-256 hash of sorted item keys.
 * Returns hex string or null if hashing is unavailable (file:// protocol).
 * @param {object[]} items
 * @returns {Promise<string|null>}
 */
async function computeInventoryHash(items) {
  try {
    if (!crypto || !crypto.subtle || !crypto.subtle.digest) return null;
    var arr = Array.isArray(items) ? items : [];
    var keys = [];
    for (var i = 0; i < arr.length; i++) {
      keys.push(typeof DiffEngine !== 'undefined' ? DiffEngine.computeItemKey(arr[i]) : String(i));
    }
    keys.sort();
    var joined = keys.join('|');
    var encoded = new TextEncoder().encode(joined);
    var hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    return sha256BufferToHex(hashBuffer);
  } catch (e) {
    debugLog('[CloudSync] computeInventoryHash failed:', e.message);
    return null;
  }
}

/**
 * Summarize inventory by metal type.
 * @param {object[]} items
 * @returns {object} e.g. { gold: 12, silver: 45 }
 */
function summarizeMetals(items) {
  var result = {};
  var arr = Array.isArray(items) ? items : [];
  for (var i = 0; i < arr.length; i++) {
    var metal = arr[i].metal || 'unknown';
    result[metal] = (result[metal] || 0) + 1;
  }
  return result;
}

/**
 * Compute total weight in troy ounces (weight * qty for each item).
 * @param {object[]} items
 * @returns {number}
 */
function computeTotalWeight(items) {
  var total = 0;
  var arr = Array.isArray(items) ? items : [];
  for (var i = 0; i < arr.length; i++) {
    var w = parseFloat(arr[i].weight) || 0;
    var q = parseInt(arr[i].qty, 10) || 1;
    total += w * q;
  }
  return total;
}

/**
 * Compute SHA-256 hash of sync-scoped settings (non-inventory localStorage keys).
 * Returns hex string or null if hashing is unavailable.
 * @returns {Promise<string|null>}
 */
async function computeSettingsHash() {
  try {
    if (!crypto || !crypto.subtle || !crypto.subtle.digest) return null;
    var keys = typeof SYNC_SCOPE_KEYS !== 'undefined' ? SYNC_SCOPE_KEYS : [];
    var settings = {};
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] === 'metalInventory') continue; // skip inventory — covered by inventoryHash
      var val = loadData(keys[i]);
      if (val !== null && val !== undefined) settings[keys[i]] = val;
    }
    var sorted = JSON.stringify(settings, Object.keys(settings).sort());
    var encoded = new TextEncoder().encode(sorted);
    var hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    return sha256BufferToHex(hashBuffer);
  } catch (e) {
    debugLog('[CloudSync] computeSettingsHash failed:', e.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Multi-tab sync coordination (Layer 7)
// ---------------------------------------------------------------------------

/**
 * Initialize BroadcastChannel-based leader election so only one tab
 * performs sync operations at a time. Falls back gracefully when
 * BroadcastChannel is unavailable (e.g. Safari < 15.4) — every tab
 * acts as leader in that case (no regression from current behavior).
 */
function initSyncTabCoordination() {
  if (typeof BroadcastChannel === 'undefined') {
    _syncIsLeader = true;
    debugLog('[CloudSync] BroadcastChannel unavailable — this tab is leader (fallback)');
    return;
  }

  try {
    _syncChannel = new BroadcastChannel('staktrakr-sync');
  } catch (e) {
    _syncIsLeader = true;
    debugLog('[CloudSync] BroadcastChannel creation failed — this tab is leader (fallback)');
    return;
  }

  // Claim leadership immediately
  _syncIsLeader = true;
  debugLog('[CloudSync] Tab opened at', _syncTabOpenedAt, '— claiming leadership');
  _syncChannel.postMessage({ type: 'leader-claim', tabId: getSyncDeviceId(), ts: _syncTabOpenedAt });

  _syncChannel.onmessage = function (event) {
    var msg = event.data;
    if (!msg || !msg.type) return;

    if (msg.type === 'leader-claim') {
      // Yield to older tab (lower timestamp = opened earlier = wins)
      if (msg.ts < _syncTabOpenedAt && _syncIsLeader) {
        _syncIsLeader = false;
        debugLog('[CloudSync] Yielding leadership to older tab (ts:', msg.ts, ')');
      } else if (msg.ts > _syncTabOpenedAt && !_syncIsLeader) {
        // We are older — reclaim
        _syncIsLeader = true;
        _syncChannel.postMessage({ type: 'leader-claim', tabId: getSyncDeviceId(), ts: _syncTabOpenedAt });
        debugLog('[CloudSync] Reclaiming leadership (we are older)');
      }
    } else if (msg.type === 'sync-push-complete') {
      debugLog('[CloudSync] Broadcast received: push complete from another tab');
      refreshSyncUI();
    } else if (msg.type === 'sync-pull-complete') {
      debugLog('[CloudSync] Broadcast received: pull complete from another tab');
      if (typeof loadInventory === 'function') loadInventory();
      refreshSyncUI();
    }
  };

  // Visibility-based leadership handoff
  document.addEventListener('visibilitychange', function () {
    if (!_syncChannel) return;

    if (document.hidden && _syncIsLeader) {
      // Leader tab hidden — start 60s handoff timer
      _syncLeaderHiddenTimer = setTimeout(function () {
        if (document.hidden && _syncIsLeader) {
          _syncIsLeader = false;
          debugLog('[CloudSync] Leader hidden >60s — releasing leadership');
          _syncChannel.postMessage({ type: 'leader-claim', tabId: 'yield', ts: Infinity });
        }
      }, 60000);
    } else if (!document.hidden) {
      // Tab became visible
      if (_syncLeaderHiddenTimer) {
        clearTimeout(_syncLeaderHiddenTimer);
        _syncLeaderHiddenTimer = null;
      }
      // If no leader, claim it
      if (!_syncIsLeader) {
        _syncIsLeader = true;
        _syncChannel.postMessage({ type: 'leader-claim', tabId: getSyncDeviceId(), ts: _syncTabOpenedAt });
        debugLog('[CloudSync] Tab visible — claiming leadership');
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Sync state helpers
// ---------------------------------------------------------------------------

function syncGetLastPush() {
  try { return JSON.parse(localStorage.getItem('cloud_sync_last_push') || 'null'); } catch (_) { return null; }
}

function syncSetLastPush(meta) {
  try { localStorage.setItem('cloud_sync_last_push', JSON.stringify(meta)); } catch (_) { /* ignore */ }
}

function syncGetLastPull() {
  try { return JSON.parse(localStorage.getItem('cloud_sync_last_pull') || 'null'); } catch (_) { return null; }
}

function syncSetLastPull(meta) {
  try { localStorage.setItem('cloud_sync_last_pull', JSON.stringify(meta)); } catch (_) { /* ignore */ }
}

function syncGetCursor() {
  return localStorage.getItem('cloud_sync_cursor') || null;
}

function syncSetCursor(rev) {
  try { localStorage.setItem('cloud_sync_cursor', rev || ''); } catch (_) { /* ignore */ }
}

function syncIsEnabled() {
  return localStorage.getItem('cloud_sync_enabled') === 'true';
}

// ---------------------------------------------------------------------------
// Override backup — snapshot local data before a remote pull overwrites it
// ---------------------------------------------------------------------------

/**
 * Snapshot all SYNC_SCOPE_KEYS raw localStorage strings into a single JSON blob.
 * Called immediately before vaultDecryptAndRestore() in pullSyncVault().
 */
function syncSaveOverrideBackup() {
  try {
    var keys = typeof SYNC_SCOPE_KEYS !== 'undefined' ? SYNC_SCOPE_KEYS : [];
    var data = {};
    for (var i = 0; i < keys.length; i++) {
      var raw = localStorage.getItem(keys[i]);
      if (raw !== null) data[keys[i]] = raw;
    }
    var backup = {
      timestamp: Date.now(),
      itemCount: typeof inventory !== 'undefined' ? inventory.length : 0,
      appVersion: typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'unknown',
      data: data,
    };
    localStorage.setItem('cloud_sync_override_backup', JSON.stringify(backup));
    debugLog('[CloudSync] Override backup saved:', Object.keys(data).length, 'keys');
  } catch (err) {
    debugLog('[CloudSync] Override backup failed:', err);
  }
}

/**
 * Restore the pre-pull local snapshot saved by syncSaveOverrideBackup().
 * Prompts for confirmation, writes raw strings back, and refreshes the UI.
 */
async function syncRestoreOverrideBackup() {
  var backup = null;
  try { backup = JSON.parse(localStorage.getItem('cloud_sync_override_backup') || 'null'); } catch (_) {}

  if (!backup || !backup.data) {
    if (typeof showAppAlert === 'function') await showAppAlert('No snapshot available.', 'Sync History');
    return;
  }

  var ts = new Date(backup.timestamp).toLocaleString();
  var msg = 'Restore local snapshot from ' + ts + '?\n\n' +
    'Items at snapshot: ' + (backup.itemCount || '?') + '\n' +
    'App version: v' + (backup.appVersion || '?') + '\n\n' +
    'This will overwrite your current inventory and cannot be undone.';

  var confirmed = typeof showAppConfirm === 'function'
    ? await showAppConfirm(msg, 'Restore Snapshot')
    : false;
  if (!confirmed) return;

  try {
    var bkeys = Object.keys(backup.data);
    // Guard: only clear scope keys when the snapshot is non-empty.
    // An empty snapshot likely indicates corruption — don't wipe localStorage.
    if (bkeys.length > 0 && typeof SYNC_SCOPE_KEYS !== 'undefined') {
      for (var k = 0; k < SYNC_SCOPE_KEYS.length; k++) {
        localStorage.removeItem(SYNC_SCOPE_KEYS[k]);
      }
      debugLog('[CloudSync] Cleared', SYNC_SCOPE_KEYS.length, 'scope keys before restore');
    }
    for (var j = 0; j < bkeys.length; j++) {
      if (typeof ALLOWED_STORAGE_KEYS !== 'undefined' && ALLOWED_STORAGE_KEYS.indexOf(bkeys[j]) !== -1) {
        localStorage.setItem(bkeys[j], backup.data[bkeys[j]]);
      }
    }
    if (typeof loadItemTags === 'function') loadItemTags();
    if (typeof loadInventory === 'function') await loadInventory();
    if (typeof updateSummary === 'function') updateSummary();
    if (typeof renderTable === 'function') renderTable();
    if (typeof renderActiveFilters === 'function') renderActiveFilters();
    if (typeof loadSpotHistory === 'function') loadSpotHistory();
    logCloudSyncActivity('override_restore', 'success', 'Snapshot from ' + ts + ' restored');
    if (typeof showCloudToast === 'function') showCloudToast('Local snapshot restored successfully.');
    if (typeof renderSyncHistorySection === 'function') renderSyncHistorySection();
  } catch (err) {
    debugLog('[CloudSync] Restore failed:', err);
    if (typeof showAppAlert === 'function') await showAppAlert('Restore failed: ' + String(err.message || err), 'Sync History');
  }
}

// ---------------------------------------------------------------------------
// Sync status indicator (small badge in Settings cloud card)
// ---------------------------------------------------------------------------

/**
 * Update the auto-sync status indicator in the Settings UI.
 * @param {'idle'|'syncing'|'error'|'disabled'} state
 * @param {string} [detail] optional status text (e.g. "Just now", error message)
 */
function updateSyncStatusIndicator(state, detail) {
  var el = safeGetElement('cloudAutoSyncStatus');
  if (!el) return;

  var dot = el.querySelector('.cloud-sync-dot');
  var text = el.querySelector('.cloud-sync-status-text');

  if (dot) {
    dot.className = 'cloud-sync-dot';
    if (state === 'syncing') dot.classList.add('cloud-sync-dot--syncing');
    else if (state === 'error') dot.classList.add('cloud-sync-dot--error');
    else if (state === 'idle') dot.classList.add('cloud-sync-dot--ok');
    // 'disabled' = no extra class (grey)
  }

  if (text) {
    var label = '';
    if (state === 'syncing') label = 'Syncing\u2026';
    else if (state === 'error') label = detail || 'Sync error';
    else if (state === 'idle') label = detail || 'Synced';
    else label = 'Auto-sync off';
    text.textContent = label;
  }

  // Keep header icon in sync
  updateCloudSyncHeaderBtn();
}

/**
 * Updates the header cloud sync button state (green/orange/gray) based on
 * connection status, vault password, and Dropbox account ID presence.
 * Called on init, password change, and sync enable/disable.
 */
function updateCloudSyncHeaderBtn() {
  var btn = safeGetElement('headerCloudSyncBtn');
  var dot = safeGetElement('headerCloudDot');
  if (!btn) return;

  if (localStorage.getItem('cloud_sync_enabled') === 'false') {
    btn.style.display = 'none';
    return;
  }

  btn.style.display = '';
  if (!dot) return;
  dot.className = 'cloud-sync-dot header-cloud-dot';

  var connected = typeof cloudIsConnected === 'function' ? cloudIsConnected(_syncProvider) : false;
  var hasPw = !!localStorage.getItem('cloud_vault_password');
  var hasAccountId = !!localStorage.getItem('cloud_dropbox_account_id');

  if (connected && hasPw && hasAccountId) {
    dot.classList.add('header-cloud-dot--green');
    btn.title = 'Cloud sync active';
    btn.setAttribute('aria-label', 'Cloud sync active');
    btn.dataset.syncState = 'green';
  } else if (connected && (!hasPw || !hasAccountId)) {
    dot.classList.add('header-cloud-dot--orange');
    btn.title = 'Cloud sync needs setup — tap to configure';
    btn.setAttribute('aria-label', 'Cloud sync needs setup');
    btn.dataset.syncState = 'orange';
  } else {
    dot.classList.add('header-cloud-dot--gray');
    btn.title = 'Cloud sync — tap to configure';
    btn.setAttribute('aria-label', 'Cloud sync not configured');
    btn.dataset.syncState = 'gray';
  }
}

/**
 * Refresh the "Last synced" text and toggle state in the cloud card.
 * Called by syncCloudUI() when switching to the Cloud settings panel.
 */
function refreshSyncUI() {
  // Sync toggle
  var toggle = safeGetElement('cloudAutoSyncToggle');
  if (toggle) toggle.checked = syncIsEnabled();

  // Last synced label
  var lastPush = syncGetLastPush();
  var lastSyncEl = safeGetElement('cloudAutoSyncLastSync');
  if (lastSyncEl) {
    if (lastPush && lastPush.timestamp) {
      lastSyncEl.textContent = _syncRelativeTime(lastPush.timestamp);
    } else {
      lastSyncEl.textContent = 'Never';
    }
  }

  // Sync Now button — enabled only when connected AND sync is on
  var syncNowBtn = safeGetElement('cloudSyncNowBtn');
  if (syncNowBtn) {
    var connected = typeof cloudIsConnected === 'function' ? cloudIsConnected(_syncProvider) : false;
    syncNowBtn.disabled = !(syncIsEnabled() && connected);
  }

  // Status dot
  if (!syncIsEnabled()) {
    updateSyncStatusIndicator('disabled');
  } else {
    var lp = syncGetLastPush();
    if (lp && lp.timestamp) {
      updateSyncStatusIndicator('idle', _syncRelativeTime(lp.timestamp));
    } else {
      updateSyncStatusIndicator('idle', 'Not yet synced');
    }
  }

  if (typeof renderSyncHistorySection === 'function') renderSyncHistorySection();
}

/** Format a timestamp as a relative time string ("just now", "5 min ago", etc.) */
function _syncRelativeTime(ts) {
  var diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return 'just now';
  if (diff < 60) return diff + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  var d = new Date(ts);
  var pad = function (n) { return n < 10 ? '0' + n : String(n); };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

// ---------------------------------------------------------------------------
// Password management
// ---------------------------------------------------------------------------

/**
 * Interactively prompt for / confirm the vault password.
 * Called when getSyncPasswordSilent() returns null (new device, first connection).
 * On success: stores password in localStorage, returns combined key string.
 * @returns {Promise<string|null>}
 */
function getSyncPassword() {
  // If getSyncPasswordSilent already has a valid key, return it immediately.
  // Do not add a redundant localStorage check — getSyncPasswordSilent() handles
  // both Unified mode (password+accountId) and Simple-mode migration (accountId only).
  var silent = getSyncPasswordSilent();
  if (silent) return Promise.resolve(silent);

  var accountId = localStorage.getItem('cloud_dropbox_account_id');
  var isNewAccount = !localStorage.getItem('cloud_vault_password');

  return new Promise(function (resolve) {
    var modal = safeGetElement('cloudSyncPasswordModal');
    var input = safeGetElement('syncPasswordInput');
    var confirmBtn = safeGetElement('syncPasswordConfirmBtn');
    var cancelBtn = safeGetElement('syncPasswordCancelBtn');
    var cancelBtn2 = safeGetElement('syncPasswordCancelBtn2');
    var errorEl = safeGetElement('syncPasswordError');
    var titleEl = safeGetElement('syncPasswordModalTitle');
    var subtitleEl = safeGetElement('syncPasswordModalSubtitle');

    if (!modal || !input || !confirmBtn) {
      var prompt = isNewAccount ? 'Set a vault password for cloud sync:' : 'Enter your vault password:';
      if (typeof appPrompt === 'function') {
        appPrompt(prompt, '', 'Cloud Sync').then(function (pw) {
          if (pw && pw.length >= 8) {
            try { localStorage.setItem('cloud_vault_password', pw); } catch (_) {}
            resolve(accountId ? pw + ':' + accountId : pw);
          } else {
            resolve(null);
          }
        });
      } else {
        resolve(null);
      }
      return;
    }

    // Update modal copy based on new vs returning user
    if (titleEl) titleEl.textContent = isNewAccount ? 'Set Vault Password' : 'Enter Vault Password';
    if (subtitleEl) subtitleEl.textContent = isNewAccount
      ? 'Choose a password to encrypt your Dropbox backups. It will be remembered in this browser.'
      : 'Enter your vault password to unlock cloud sync on this device.';

    input.value = '';
    if (errorEl) { errorEl.textContent = ''; errorEl.style.display = 'none'; }

    var cleanup = function () {
      _syncPasswordPromptActive = false;
      confirmBtn.removeEventListener('click', onConfirm);
      if (cancelBtn) cancelBtn.removeEventListener('click', onCancel);
      if (cancelBtn2) cancelBtn2.removeEventListener('click', onCancel);
      input.removeEventListener('keydown', onKeydown);
      if (typeof closeModalById === 'function') closeModalById('cloudSyncPasswordModal');
      else modal.style.display = 'none';
    };

    var onConfirm = function () {
      var pw = input.value;
      if (!pw || pw.length < 8) {
        if (errorEl) {
          errorEl.textContent = 'Password must be at least 8 characters.';
          errorEl.style.display = '';
        }
        return;
      }
      try { localStorage.setItem('cloud_vault_password', pw); } catch (_) {}
      cleanup();
      if (typeof updateCloudSyncHeaderBtn === 'function') updateCloudSyncHeaderBtn();
      setTimeout(function () { if (typeof pushSyncVault === 'function') pushSyncVault(); }, 100);
      resolve(accountId ? pw + ':' + accountId : pw);
    };

    var onCancel = function () { cleanup(); resolve(null); };
    var onKeydown = function (e) {
      if (e.key === 'Enter') onConfirm();
      if (e.key === 'Escape') onCancel();
    };

    confirmBtn.addEventListener('click', onConfirm);
    if (cancelBtn) cancelBtn.addEventListener('click', onCancel);
    if (cancelBtn2) cancelBtn2.addEventListener('click', onCancel);
    input.addEventListener('keydown', onKeydown);

    _syncPasswordPromptActive = true;
    if (typeof openModalById === 'function') openModalById('cloudSyncPasswordModal');
    else modal.style.display = 'flex';
    setTimeout(function () { input.focus(); }, 50);
  });
}

/**
 * Get the sync password/key without any user interaction.
 * Unified mode: combines vault_password (localStorage) + account_id (Dropbox OAuth).
 * Returns null if either value is missing — caller must prompt user.
 * Never opens a modal or popover — safe to call from background processes.
 * @returns {string|null}
 */
function getSyncPasswordSilent() {
  var vaultPw = localStorage.getItem('cloud_vault_password');
  var accountId = localStorage.getItem('cloud_dropbox_account_id');

  // Unified mode: both required
  if (vaultPw && accountId) {
    return vaultPw + ':' + accountId;
  }

  // Migration: old Simple mode (account_id only) — re-encrypt on next push
  if (!vaultPw && accountId && localStorage.getItem('cloud_sync_mode') === 'simple') {
    return STAKTRAKR_SIMPLE_SALT + ':' + accountId;
  }

  return null;
}

/**
 * Change the stored vault password and re-encrypt the vault on Dropbox.
 * Called from the Advanced sub-modal "Change Password" flow.
 * @param {string} newPassword
 * @returns {Promise<boolean>} true on success
 */
async function changeVaultPassword(newPassword) {
  if (!newPassword || newPassword.length < 8) return false;

  try {
    // Write new password first; next push will re-encrypt the vault with the new key.
    // If the page closes before the push fires, the next session's getSyncPasswordSilent()
    // will use the new password — the remote vault remains decryptable with the old key until overwritten.
    localStorage.setItem('cloud_vault_password', newPassword);
    logCloudSyncActivity('password_change', 'success', 'Vault password updated');
    if (typeof updateCloudSyncHeaderBtn === 'function') updateCloudSyncHeaderBtn();
    if (syncIsEnabled() && typeof scheduleSyncPush === 'function') {
      scheduleSyncPush();
    }
    if (typeof showCloudToast === 'function') showCloudToast('Vault password updated — syncing now', 3000);
    return true;
  } catch (err) {
    if (typeof debugLog === 'function') debugLog('[CloudSync] changeVaultPassword failed:', err);
    if (typeof showCloudToast === 'function') showCloudToast('Failed to update password — try again', 3000);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Activity logging
// ---------------------------------------------------------------------------

function logCloudSyncActivity(action, result, detail, duration) {
  if (typeof recordCloudActivity === 'function') {
    recordCloudActivity({
      action: action,
      provider: _syncProvider,
      result: result || 'success',
      detail: detail || '',
      duration: duration != null ? duration : null,
    });
  }
}

// ---------------------------------------------------------------------------
// Manifest generation (diff-merge architecture — STAK-184 Task 4)
// ---------------------------------------------------------------------------

/**
 * Prune manifest entries to only include those from the last N sync cycles.
 * Prevents the manifest from growing unbounded.
 * @param {Array} entries - Full array of changeLog entries
 * @param {number} maxSyncs - Number of sync cycles to retain (default: 10)
 * @returns {Array} Pruned entries (subset of input)
 */
function pruneManifestEntries(entries, maxSyncs) {
  if (!entries || entries.length === 0) return entries;
  if (!maxSyncs || maxSyncs <= 0) maxSyncs = 10;

  // Scan changeLog for sync-marker entries to find the cutoff timestamp
  // getManifestEntries already filters by timestamp, but we need to find
  // the Nth-most-recent sync-marker to establish the pruning boundary
  var changeLogRaw = typeof loadData === 'function' ? loadData('changeLog') : null;
  var changeLog = [];
  if (changeLogRaw) {
    try {
      changeLog = typeof changeLogRaw === 'string' ? JSON.parse(changeLogRaw) : changeLogRaw;
    } catch (_) {
      changeLog = [];
    }
  }

  // Find all sync-marker entries, sorted by timestamp descending
  var syncMarkers = [];
  for (var i = 0; i < changeLog.length; i++) {
    if (changeLog[i].type === 'sync-marker' && changeLog[i].timestamp) {
      syncMarkers.push(changeLog[i]);
    }
  }
  syncMarkers.sort(function(a, b) { return b.timestamp - a.timestamp; });

  // If fewer than maxSyncs markers exist, keep all entries (no pruning needed)
  if (syncMarkers.length < maxSyncs) return entries;

  // The Nth sync-marker timestamp is the cutoff
  var cutoffTimestamp = syncMarkers[maxSyncs - 1].timestamp;

  // Filter entries to only include those at or after the cutoff
  var pruned = [];
  for (var j = 0; j < entries.length; j++) {
    if (entries[j].timestamp >= cutoffTimestamp) {
      pruned.push(entries[j]);
    }
  }

  debugLog('[CloudSync] Manifest pruned:', entries.length, '→', pruned.length, 'entries (maxSyncs:', maxSyncs + ')');
  return pruned;
}

/**
 * Build a sync manifest from the changeLog and upload it encrypted to Dropbox.
 * The manifest captures field-level changes since the last push so that
 * diff-merge can resolve conflicts without downloading the full vault.
 *
 * Failure here is non-blocking — the caller wraps this in try/catch so that
 * a manifest error never prevents the vault push from completing.
 *
 * @param {string} token   - Dropbox OAuth bearer token
 * @param {string} password - Vault encryption password (composite key)
 * @param {string} syncId  - The syncId generated for this push
 * @returns {Promise<void>}
 */
async function buildAndUploadManifest(token, password, syncId) {
  // 1. Determine the cutoff timestamp from the last successful push
  var lastPush = syncGetLastPush();
  var lastSyncTimestamp = lastPush ? lastPush.timestamp : null;

  // 2. Collect changeLog entries since the last push
  var entries = [];
  if (typeof getManifestEntries === 'function') {
    entries = getManifestEntries(lastSyncTimestamp) || [];
  } else {
    debugLog('[CloudSync] getManifestEntries not available — manifest will have empty changes');
  }

  // 2b. Prune entries to prevent manifest from growing unbounded
  var maxSyncs = 10;
  if (typeof loadData === 'function') {
    var threshold = loadData('manifestPruningThreshold');
    if (threshold != null) {
      var parsed = parseInt(threshold, 10);
      if (!isNaN(parsed) && parsed > 0) maxSyncs = parsed;
    }
  }
  entries = pruneManifestEntries(entries, maxSyncs);

  // 3. Transform entries: group by itemKey, collect field-level changes
  var changesByKey = {};
  var summary = { itemsAdded: 0, itemsEdited: 0, itemsDeleted: 0, settingsChanged: 0 };
  var countedKeys = { add: {}, edit: {}, delete: {}, setting: {} };

  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    var key = entry.itemKey || '_settings';

    if (!changesByKey[key]) {
      changesByKey[key] = {
        itemKey: key,
        itemName: entry.itemName || null,
        type: entry.type,
        fields: [],
      };
    }

    changesByKey[key].fields.push({
      field: entry.field || null,
      oldValue: entry.oldValue != null ? entry.oldValue : null,
      newValue: entry.newValue != null ? entry.newValue : null,
      timestamp: entry.timestamp,
    });

    // Count unique items per type for the summary
    var entryType = entry.type;
    if (entryType === 'add' && !countedKeys.add[key]) {
      countedKeys.add[key] = true;
      summary.itemsAdded++;
    } else if (entryType === 'edit' && !countedKeys.edit[key]) {
      countedKeys.edit[key] = true;
      summary.itemsEdited++;
    } else if (entryType === 'delete' && !countedKeys.delete[key]) {
      countedKeys.delete[key] = true;
      summary.itemsDeleted++;
    } else if (entryType === 'setting' && !countedKeys.setting[key]) {
      countedKeys.setting[key] = true;
      summary.settingsChanged++;
    }
  }

  // Convert grouped changes object to array
  var transformedEntries = [];
  var keys = Object.keys(changesByKey);
  for (var k = 0; k < keys.length; k++) {
    transformedEntries.push(changesByKey[keys[k]]);
  }

  // 4. Build manifest JSON (schema v1)
  var manifestPayload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    deviceId: getSyncDeviceId(),
    syncId: syncId,
    previousSyncId: lastPush ? lastPush.syncId : null,
    changes: transformedEntries,
    summary: summary,
  };

  // 5. Encrypt the manifest
  if (typeof encryptManifest !== 'function') {
    throw new Error('encryptManifest not available — cannot build manifest');
  }
  var manifestBytes = await encryptManifest(manifestPayload, password);

  // 6. Upload encrypted manifest to Dropbox
  debugLog('[CloudSync] Uploading manifest to', SYNC_MANIFEST_PATH, '…');
  var manifestArg = JSON.stringify({
    path: SYNC_MANIFEST_PATH,
    mode: 'overwrite',
    autorename: false,
    mute: true,
  });
  var manifestResp = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': manifestArg,
    },
    body: manifestBytes,
  });

  if (!manifestResp.ok) {
    var respBody = await manifestResp.text().catch(function () { return ''; });
    throw new Error('Manifest upload failed: ' + manifestResp.status + ' ' + respBody);
  }

  debugLog('[CloudSync] Manifest uploaded:', transformedEntries.length, 'change groups,', entries.length, 'total entries');
}

// ---------------------------------------------------------------------------
// Push (upload encrypted vault to Dropbox)
// ---------------------------------------------------------------------------

/**
 * Encrypt the sync-scoped inventory and upload to Dropbox.
 * Also updates the lightweight staktrakr-sync.json metadata pointer.
 * Skips silently if not connected or sync is disabled.
 */
async function pushSyncVault() {
  debugLog('[CloudSync] pushSyncVault called. enabled:', syncIsEnabled(), 'provider:', _syncProvider);

  if (!syncIsEnabled()) {
    debugLog('[CloudSync] Push skipped — sync not enabled');
    return;
  }

  if (!_syncIsLeader) {
    debugLog('cloud-sync', 'Not leader tab — skipping push');
    return;
  }

  var token = typeof cloudGetToken === 'function' ? await cloudGetToken(_syncProvider) : null;
  debugLog('[CloudSync] Token obtained:', !!token);
  if (!token) {
    debugLog('[CloudSync] No token — push skipped');
    updateSyncStatusIndicator('error', 'Not connected');
    return;
  }

  if (_syncPushInFlight) {
    debugLog('[CloudSync] Push already in flight — skipped');
    return;
  }

  var password = getSyncPasswordSilent();
  debugLog('[CloudSync] Password obtained (silent):', !!password);
  if (!password) {
    debugLog('[CloudSync] No password — push deferred (tap cloud icon to unlock)');
    return;
  }

  _syncPushInFlight = true;
  updateSyncStatusIndicator('syncing');
  var pushStart = Date.now();

  try {
    // -----------------------------------------------------------------------
    // Layer 3 — Folder migration check (REQ-3)
    // Migrate legacy flat /StakTrakr/ layout to /sync/ + /backups/ on first run.
    // -----------------------------------------------------------------------
    if (loadData('cloud_sync_migrated') !== 'v2') {
      debugLog('[CloudSync] Migration needed — running cloudMigrateToV2');
      try {
        await cloudMigrateToV2(_syncProvider);
      } catch (migErr) {
        debugLog('[CloudSync] Migration error (non-blocking):', migErr.message);
      }
    }

    // -----------------------------------------------------------------------
    // Layer 1 — Empty-vault push guard (REQ-1)
    // If local inventory is empty, check remote metadata before allowing push.
    // Prevents overwriting a populated cloud vault from a fresh/empty browser.
    // -----------------------------------------------------------------------
    var localItemCount = typeof inventory !== 'undefined' ? inventory.length : 0;
    if (localItemCount === 0) {
      debugLog('[CloudSync] Empty-vault guard: local inventory is 0 — checking remote metadata');
      var guardBlocked = false;
      try {
        var guardApiArg = JSON.stringify({ path: SYNC_META_PATH });
        var guardResp = await fetch('https://content.dropboxapi.com/2/files/download', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Dropbox-API-Arg': guardApiArg,
          },
        });
        if (guardResp.status === 409) {
          // No remote meta file — first push, allow
          debugLog('[CloudSync] Empty-vault guard: no remote meta (first push) — allowing');
        } else if (guardResp.ok) {
          var guardMeta = await guardResp.json();
          if (guardMeta && guardMeta.itemCount && guardMeta.itemCount > 0) {
            // Remote has items, local is empty — hard block
            debugLog('[CloudSync] Empty-vault guard: BLOCKED — remote has', guardMeta.itemCount, 'items');
            logCloudSyncActivity('auto_sync_push', 'blocked', 'Empty local vault, remote has ' + guardMeta.itemCount + ' items');
            updateSyncStatusIndicator('error', 'Empty vault — pull first');
            guardBlocked = true;
            _syncPushInFlight = false;
            showAppConfirm(
              'Your local vault is empty but the cloud has ' + guardMeta.itemCount + ' items. ' +
              'Push cancelled to prevent data loss. Pull from cloud instead?',
              function () { pullWithPreview(); },
              null,
              'Pull from Cloud',
              'Cancel'
            );
            return;
          } else {
            debugLog('[CloudSync] Empty-vault guard: remote is also empty — allowing');
          }
        } else {
          // Network/API error — fail-safe: block push
          debugLog('[CloudSync] Empty-vault guard: BLOCKED — meta check failed with status', guardResp.status);
          logCloudSyncActivity('auto_sync_push', 'blocked', 'Empty vault guard: meta check failed (' + guardResp.status + ')');
          updateSyncStatusIndicator('error', 'Sync check failed');
          _syncPushInFlight = false;
          return;
        }
      } catch (guardErr) {
        // Network failure — fail-safe: block push
        debugLog('[CloudSync] Empty-vault guard: BLOCKED — network error:', guardErr.message);
        logCloudSyncActivity('auto_sync_push', 'blocked', 'Empty vault guard: network error — ' + String(guardErr.message || guardErr));
        updateSyncStatusIndicator('error', 'Sync check failed');
        _syncPushInFlight = false;
        return;
      }
    }

    // Encrypt sync-scoped payload
    debugLog('[CloudSync] Encrypting payload…');
    var fileBytes = typeof vaultEncryptToBytesScoped === 'function'
      ? await vaultEncryptToBytesScoped(password)
      : await vaultEncryptToBytes(password);
    debugLog('[CloudSync] Encrypted:', fileBytes.byteLength, 'bytes');

    // -----------------------------------------------------------------------
    // Layer 2 — Cloud-side backup-before-overwrite (REQ-2)
    // Copy the existing cloud vault to /backups/ before overwriting.
    // Non-blocking: if copy fails (first push, no existing file), log and continue.
    // -----------------------------------------------------------------------
    try {
      var backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
      var backupPath = SYNC_BACKUP_FOLDER + '/pre-sync-' + backupTimestamp + '.stvault';
      debugLog('[CloudSync] Backup-before-overwrite: copying vault to', backupPath);
      var backupResp = await fetch('https://api.dropboxapi.com/2/files/copy_v2', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_path: SYNC_FILE_PATH,
          to_path: backupPath,
        }),
      });
      if (backupResp.ok) {
        debugLog('[CloudSync] Backup-before-overwrite: created', backupPath);
      } else {
        var backupStatus = backupResp.status;
        debugLog('[CloudSync] Backup-before-overwrite: copy returned', backupStatus, '(expected on first push)');
      }
    } catch (backupErr) {
      debugLog('[CloudSync] Backup-before-overwrite: failed (non-blocking):', backupErr.message);
    }

    var syncId = typeof generateUUID === 'function' ? generateUUID() : _syncFallbackUUID();
    var now = Date.now();
    var itemCount = typeof inventory !== 'undefined' ? inventory.length : 0;
    var appVersion = typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'unknown';
    var deviceId = getSyncDeviceId();

    // Upload the vault file (overwrite)
    debugLog('[CloudSync] Uploading vault to', SYNC_FILE_PATH, '…');
    var vaultArg = JSON.stringify({
      path: SYNC_FILE_PATH,
      mode: 'overwrite',
      autorename: false,
      mute: true,
    });
    var vaultResp = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': vaultArg,
      },
      body: fileBytes,
    });
    debugLog('[CloudSync] Vault upload response:', vaultResp.status);

    if (vaultResp.status === 429) {
      _syncRetryDelay = Math.min(_syncRetryDelay * 2, 300000); // cap at 5 min
      throw new Error('Rate limited (429). Retry in ' + Math.round(_syncRetryDelay / 1000) + 's');
    }

    if (!vaultResp.ok) {
      var errBody = await vaultResp.text().catch(function () { return ''; });
      throw new Error('Vault upload failed: ' + vaultResp.status + ' ' + errBody);
    }
    _syncRetryDelay = 2000; // reset backoff on success

    var vaultResult = await vaultResp.json();
    var rev = vaultResult.rev || '';
    debugLog('[CloudSync] Vault uploaded, rev:', rev);

    // Upload image vault if user photos exist and have changed (STAK-181)
    var imageVaultMeta = null;
    try {
      if (typeof collectAndHashImageVault === 'function') {
        var imgData = await collectAndHashImageVault();
        if (imgData) {
          var lastPush = syncGetLastPush();
          var lastImageHash = lastPush ? lastPush.imageHash : null;
          if (imgData.hash !== lastImageHash) {
            debugLog('[CloudSync] Image vault changed — uploading', imgData.imageCount, 'photos');
            var imageBytes = await vaultEncryptImageVault(password, imgData.payload);
            var imgArg = JSON.stringify({ path: SYNC_IMAGES_PATH, mode: 'overwrite', autorename: false, mute: true });
            var imgResp = await fetch('https://content.dropboxapi.com/2/files/upload', {
              method: 'POST',
              headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/octet-stream', 'Dropbox-API-Arg': imgArg },
              body: imageBytes,
            });
            if (!imgResp.ok) throw new Error('Image vault upload failed: ' + imgResp.status);
            imageVaultMeta = { imageCount: imgData.imageCount, hash: imgData.hash };
            debugLog('[CloudSync] Image vault uploaded:', imgData.imageCount, 'photos');
          } else {
            // Hash unchanged — carry forward existing meta so other devices can still detect it
            imageVaultMeta = lastImageHash ? { imageCount: imgData.imageCount, hash: imgData.hash } : null;
            debugLog('[CloudSync] Image vault unchanged — skipping upload');
          }
        }
      }
    } catch (imgErr) {
      // Image vault failure is non-fatal — inventory sync continues
      var imgErrMsg = String(imgErr.message || imgErr);
      console.warn('[CloudSync] Image vault push error (non-fatal):', imgErrMsg);
      logCloudSyncActivity('image_vault_push', 'fail', imgErrMsg);
    }

    // Upload the metadata pointer JSON
    var metaPayload = {
      rev: rev,
      timestamp: now,
      appVersion: appVersion,
      itemCount: itemCount,
      syncId: syncId,
      deviceId: deviceId,
    };
    if (imageVaultMeta) metaPayload.imageVault = imageVaultMeta;

    // Layer 4 — Manifest schema v2 enrichment (REQ-4)
    metaPayload.manifestVersion = 2;
    metaPayload.vaultSizeBytes = fileBytes.byteLength;
    var _inv = typeof inventory !== 'undefined' ? inventory : [];
    metaPayload.metals = summarizeMetals(_inv);
    metaPayload.totalWeight = computeTotalWeight(_inv);
    try {
      var invHash = await computeInventoryHash(_inv);
      if (invHash) metaPayload.inventoryHash = invHash;
    } catch (_hashErr) {
      debugLog('[CloudSync] Inventory hash failed (omitting):', _hashErr.message);
    }
    try {
      var setHash = await computeSettingsHash();
      if (setHash) metaPayload.settingsHash = setHash;
    } catch (_sHashErr) {
      debugLog('[CloudSync] Settings hash failed (omitting):', _sHashErr.message);
    }

    var metaBytes = new TextEncoder().encode(JSON.stringify(metaPayload));
    var metaArg = JSON.stringify({
      path: SYNC_META_PATH,
      mode: 'overwrite',
      autorename: false,
      mute: true,
    });
    var metaResp = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': metaArg,
      },
      body: metaBytes,
    });
    if (!metaResp.ok) throw new Error('Metadata upload failed: ' + metaResp.status);

    // Upload manifest (non-blocking — failure must NOT prevent push completion)
    try {
      await buildAndUploadManifest(token, password, syncId);
    } catch (manifestErr) {
      debugLog('[CloudSync] Manifest upload failed (non-blocking):', manifestErr.message);
    }

    // Persist push state
    var pushMeta = { syncId: syncId, timestamp: now, rev: rev, itemCount: itemCount };
    if (imageVaultMeta) pushMeta.imageHash = imageVaultMeta.hash;
    syncSetLastPush(pushMeta);
    syncSetCursor(rev);

    var duration = Date.now() - pushStart;
    logCloudSyncActivity('auto_sync_push', 'success', itemCount + ' items, ' + Math.round(fileBytes.byteLength / 1024) + ' KB', duration);
    debugLog('[CloudSync] Push complete:', syncId, 'rev:', rev, '(' + duration + 'ms)');
    updateSyncStatusIndicator('idle', 'just now');
    refreshSyncUI();

    // Auto-prune old backups (fire-and-forget)
    if (typeof cloudPruneBackups === 'function') {
      var pruneMax = parseInt(loadData(CLOUD_BACKUP_HISTORY_KEY), 10) || CLOUD_BACKUP_HISTORY_DEFAULT;
      cloudPruneBackups(_syncProvider, pruneMax).catch(function (e) {
        debugLog('[CloudSync] Prune error (non-blocking):', e.message);
      });
    }

    // Broadcast push completion to other tabs
    if (_syncChannel) {
      try { _syncChannel.postMessage({ type: 'sync-push-complete', tabId: getSyncDeviceId() }); } catch (_) { /* ignore */ }
    }

  } catch (err) {
    var errMsg = String(err.message || err);
    console.error('[CloudSync] Push failed:', errMsg, err);
    logCloudSyncActivity('auto_sync_push', 'fail', errMsg);
    updateSyncStatusIndicator('error', errMsg.slice(0, 60));
  } finally {
    _syncPushInFlight = false;
  }
}

// ---------------------------------------------------------------------------
// Poll (check remote for changes)
// ---------------------------------------------------------------------------

/**
 * Download staktrakr-sync.json and compare syncId with last pull.
 * If different, hand off to handleRemoteChange().
 * Skips silently if not connected or sync is disabled.
 */
async function pollForRemoteChanges() {
  if (!syncIsEnabled()) return;
  if (!_syncIsLeader) {
    debugLog('cloud-sync', 'Not leader tab — skipping poll');
    return;
  }
  if (document.hidden) return; // Page Visibility API: skip background polls

  var token = typeof cloudGetToken === 'function' ? await cloudGetToken(_syncProvider) : null;
  if (!token) return;

  // Layer 3 — Folder migration check (REQ-3)
  if (loadData('cloud_sync_migrated') !== 'v2') {
    debugLog('[CloudSync] Poll: migration needed — running cloudMigrateToV2');
    try {
      await cloudMigrateToV2(_syncProvider);
    } catch (migErr) {
      debugLog('[CloudSync] Poll: migration error (non-blocking):', migErr.message);
    }
  }

  try {
    var apiArg = JSON.stringify({ path: SYNC_META_PATH });
    var resp = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Dropbox-API-Arg': apiArg,
      },
    });

    // Layer 3d — Legacy fallback: if new path returns 404/409, retry at legacy path
    if (resp.status === 409 || resp.status === 404) {
      debugLog('[CloudSync] Poll: new meta path not found — trying legacy path');
      var legacyApiArg = JSON.stringify({ path: SYNC_META_PATH_LEGACY });
      var legacyResp = await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Dropbox-API-Arg': legacyApiArg,
        },
      });
      if (legacyResp.ok) {
        debugLog('[CloudSync] Poll: found metadata at legacy path');
        resp = legacyResp;
      } else if (legacyResp.status === 409 || legacyResp.status === 404) {
        // No sync file at either path — first device
        debugLog('[CloudSync] No remote sync file yet (checked both paths)');
        return;
      }
      // If legacy also failed with other status, fall through to existing error handling
      if (!legacyResp.ok && legacyResp.status !== 409 && legacyResp.status !== 404) {
        resp = legacyResp;
      }
    }
    if (resp.status === 429) {
      _syncRetryDelay = Math.min(_syncRetryDelay * 2, 300000);
      debugLog('[CloudSync] Poll rate limited — backing off');
      return;
    }
    if (!resp.ok) {
      debugLog('[CloudSync] Poll meta fetch failed:', resp.status);
      return;
    }
    _syncRetryDelay = SYNC_POLL_INTERVAL;

    var remoteMeta = await resp.json();
    if (!remoteMeta || !remoteMeta.syncId) return;

    var lastPull = syncGetLastPull();

    // Echo detection: if this device pushed this syncId, just record the pull
    if (remoteMeta.deviceId === getSyncDeviceId()) {
      debugLog('[CloudSync] Poll: remote is our own push, skipping');
      if (!lastPull || lastPull.syncId !== remoteMeta.syncId) {
        syncSetLastPull({ syncId: remoteMeta.syncId, timestamp: remoteMeta.timestamp, rev: remoteMeta.rev });
      }
      return;
    }

    // No change since last pull
    if (lastPull && lastPull.syncId === remoteMeta.syncId) {
      debugLog('[CloudSync] Poll: no new changes');
      return;
    }

    // Layer 4 — Hash-based change detection (REQ-4)
    // Skip notification if inventory hashes match (content is identical)
    if (remoteMeta.inventoryHash) {
      try {
        var localInv = typeof inventory !== 'undefined' ? inventory : [];
        var localHash = await computeInventoryHash(localInv);
        if (localHash && localHash === remoteMeta.inventoryHash) {
          debugLog('[CloudSync] Poll: inventoryHash matches — skipping notification');
          syncSetLastPull({ syncId: remoteMeta.syncId, timestamp: remoteMeta.timestamp, rev: remoteMeta.rev });
          return;
        }
      } catch (_hashErr) {
        debugLog('[CloudSync] Poll: hash comparison failed (falling through):', _hashErr.message);
      }
    }

    debugLog('[CloudSync] Poll: remote change detected — syncId:', remoteMeta.syncId);
    logCloudSyncActivity('auto_sync_poll', 'success', 'Remote change detected: ' + remoteMeta.itemCount + ' items');
    await handleRemoteChange(remoteMeta);

  } catch (err) {
    debugLog('[CloudSync] Poll error:', err);
  }
}

// ---------------------------------------------------------------------------
// Conflict detection & resolution
// ---------------------------------------------------------------------------

/**
 * Determine whether we have local unpushed changes.
 * We consider local "dirty" if our last push was more recent than our last pull
 * (meaning we've pushed something that predates the remote change, so both
 * sides have diverged independently).
 * @returns {boolean}
 */
function syncHasLocalChanges() {
  var lastPush = syncGetLastPush();
  var lastPull = syncGetLastPull();
  if (!lastPush) return false;
  if (!lastPull) return true; // pushed but never pulled
  return lastPush.timestamp > lastPull.timestamp;
}

/**
 * Show the "Update available" modal and return a Promise that resolves true
 * (user accepted) or false (user dismissed / closed).
 * @param {object} remoteMeta - The parsed staktrakr-sync.json content
 * @returns {Promise<boolean>}
 */
function showSyncUpdateModal(remoteMeta) {
  return new Promise(function (resolve) {
    var modal = safeGetElement('cloudSyncUpdateModal');
    if (!modal) { resolve(false); return; } // fallback: decline if no modal in DOM

    // Populate metadata fields
    var itemCountEl = safeGetElement('syncUpdateItemCount');
    var timestampEl = safeGetElement('syncUpdateTimestamp');
    var deviceEl    = safeGetElement('syncUpdateDevice');

    if (itemCountEl) itemCountEl.textContent = remoteMeta.itemCount != null ? String(remoteMeta.itemCount) : '—';
    if (timestampEl) {
      var ts = remoteMeta.timestamp ? new Date(remoteMeta.timestamp) : null;
      timestampEl.textContent = ts ? ts.toLocaleString() : '—';
    }
    if (deviceEl) {
      var devId = remoteMeta.deviceId || '';
      deviceEl.textContent = devId ? devId.slice(0, 8) + '\u2026' : 'unknown';
    }

    modal.style.display = 'flex';

    function cleanup(result) {
      modal.style.display = 'none';
      acceptBtn.removeEventListener('click', onAccept);
      dismissBtn.removeEventListener('click', onDismiss);
      dismissX.removeEventListener('click', onDismiss);
      resolve(result);
    }

    function onAccept()  { cleanup(true); }
    function onDismiss() { cleanup(false); }

    var acceptBtn  = safeGetElement('syncUpdateAcceptBtn');
    var dismissBtn = safeGetElement('syncUpdateDismissBtn');
    var dismissX   = safeGetElement('syncUpdateDismissX');

    if (acceptBtn)  acceptBtn.addEventListener('click', onAccept);
    if (dismissBtn) dismissBtn.addEventListener('click', onDismiss);
    if (dismissX)   dismissX.addEventListener('click', onDismiss);
  });
}

/**
 * Handle a detected remote change.
 * If no local changes → show update-available modal, then pull on Accept.
 * If both sides changed → show conflict modal.
 * @param {object} remoteMeta - The parsed staktrakr-sync.json content
 */
async function handleRemoteChange(remoteMeta) {
  // Don't interrupt the user mid-password-entry — retry on next poll cycle
  if (_syncPasswordPromptActive) {
    debugLog('[CloudSync] Password prompt active — deferring remote change notification');
    return;
  }

  // Cancel any queued debounced push before showing the update/conflict modal.
  // Without this, the debounced push can fire while the modal is open, overwriting
  // the remote vault with stale local data. The pull then downloads our own just-pushed
  // data instead of the remote device's changes — silently discarding them.
  if (typeof scheduleSyncPush === 'function' && typeof scheduleSyncPush.cancel === 'function') {
    scheduleSyncPush.cancel();
    debugLog('[CloudSync] Cancelled queued push — remote change takes priority');
  }

  var hasLocal = syncHasLocalChanges();

  if (!hasLocal) {
    // Show the update-available modal — let user decide before password prompt
    debugLog('[CloudSync] Remote change detected — showing update modal');
    var accepted = await showSyncUpdateModal(remoteMeta);
    if (!accepted) {
      debugLog('[CloudSync] User dismissed update — will retry next poll');
      return;
    }
    // Layer 5 — Show restore preview instead of direct pull (REQ-5)
    await pullWithPreview(remoteMeta);
    return;
  }

  // Conflict: both sides have changes
  debugLog('[CloudSync] Conflict detected — showing conflict modal');
  var lastPush = syncGetLastPush();
  showSyncConflictModal({
    local: {
      itemCount: typeof inventory !== 'undefined' ? inventory.length : 0,
      timestamp: lastPush ? lastPush.timestamp : null,
      appVersion: typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'unknown',
    },
    remote: {
      itemCount: remoteMeta.itemCount || 0,
      timestamp: remoteMeta.timestamp || null,
      appVersion: remoteMeta.appVersion || 'unknown',
      deviceId: remoteMeta.deviceId || '',
    },
    remoteMeta: remoteMeta,
  });
}

// ---------------------------------------------------------------------------
// Pull (download and restore remote vault)
// ---------------------------------------------------------------------------

/**
 * Download staktrakr-sync.stvault, decrypt, and restore inventory.
 * @param {object} remoteMeta - Remote sync metadata (from pollForRemoteChanges)
 */
async function pullSyncVault(remoteMeta) {
  // Try silent key first (Simple mode or cached Secure password)
  var password = getSyncPasswordSilent();
  if (!password) {
    // Secure mode with no cached password — prompt interactively
    password = await getSyncPassword();
  }
  if (!password) {
    debugLog('[CloudSync] Pull cancelled — no password');
    return;
  }

  var token = typeof cloudGetToken === 'function' ? await cloudGetToken(_syncProvider) : null;
  if (!token) throw new Error('Not connected to cloud provider');

  var pullStart = Date.now();
  updateSyncStatusIndicator('syncing');

  try {
    var apiArg = JSON.stringify({ path: SYNC_FILE_PATH });
    var resp = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Dropbox-API-Arg': apiArg,
      },
    });

    if (!resp.ok) throw new Error('Vault download failed: ' + resp.status);

    var bytes = new Uint8Array(await resp.arrayBuffer());

    syncSaveOverrideBackup();

    if (typeof vaultDecryptAndRestore === 'function') {
      await vaultDecryptAndRestore(bytes, password);
    } else {
      throw new Error('vaultDecryptAndRestore not available');
    }

    // Pull image vault if remote has photos we don't have (STAK-181)
    var pulledImageHash = null;
    if (remoteMeta && remoteMeta.imageVault && typeof vaultDecryptAndRestoreImages === 'function') {
      try {
        var lastPull = syncGetLastPull();
        var localImageHash = lastPull ? lastPull.imageHash : null;
        if (remoteMeta.imageVault.hash !== localImageHash) {
          debugLog('[CloudSync] Image vault changed — pulling', remoteMeta.imageVault.imageCount, 'photos');
          var imgApiArg = JSON.stringify({ path: SYNC_IMAGES_PATH });
          var imgPullResp = await fetch('https://content.dropboxapi.com/2/files/download', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token, 'Dropbox-API-Arg': imgApiArg },
          });
          if (imgPullResp.ok) {
            var imgBytes = new Uint8Array(await imgPullResp.arrayBuffer());
            var restoredCount = await vaultDecryptAndRestoreImages(imgBytes, password);
            pulledImageHash = remoteMeta.imageVault.hash;
            debugLog('[CloudSync] Image vault restored:', restoredCount, 'photos');
          } else if (imgPullResp.status === 404) {
            // File not yet uploaded (fresh account or first push in progress) — not an error.
            // Set hash sentinel to stop retry loop until manifest changes.
            pulledImageHash = remoteMeta.imageVault.hash;
            debugLog('[CloudSync] Image vault not found on remote (404) — skipping');
          } else {
            var imgErrBody = await imgPullResp.text().catch(function () { return ''; });
            console.warn('[CloudSync] Image vault download failed:', imgPullResp.status, imgErrBody.slice(0, 120));
            logCloudSyncActivity('image_vault_pull', 'fail', 'HTTP ' + imgPullResp.status);
          }
        } else {
          debugLog('[CloudSync] Image vault hash matches — no image pull needed');
          pulledImageHash = localImageHash;
        }
      } catch (imgErr) {
        var imgPullErrMsg = String(imgErr.message || imgErr);
        console.warn('[CloudSync] Image vault pull error (non-fatal):', imgPullErrMsg);
        logCloudSyncActivity('image_vault_pull', 'fail', imgPullErrMsg);
      }
    }

    // Record the pull
    var pullMeta = {
      syncId: remoteMeta ? remoteMeta.syncId : null,
      timestamp: remoteMeta ? remoteMeta.timestamp : Date.now(),
      rev: remoteMeta ? remoteMeta.rev : null,
    };
    if (pulledImageHash) pullMeta.imageHash = pulledImageHash;
    syncSetLastPull(pullMeta);

    var duration = Date.now() - pullStart;
    logCloudSyncActivity('auto_sync_pull', 'success', (remoteMeta ? remoteMeta.itemCount : '?') + ' items restored', duration);
    debugLog('[CloudSync] Pull complete (' + duration + 'ms)');

    if (typeof showCloudToast === 'function') {
      showCloudToast('Auto-sync: inventory updated from another device.');
    }
    updateSyncStatusIndicator('idle', 'just now');
    refreshSyncUI();

    // Broadcast pull completion to other tabs
    if (_syncChannel) {
      try { _syncChannel.postMessage({ type: 'sync-pull-complete', tabId: getSyncDeviceId() }); } catch (_) { /* ignore */ }
    }

  } catch (err) {
    var errMsg = String(err.message || err);
    debugLog('[CloudSync] Pull failed:', errMsg);
    logCloudSyncActivity('auto_sync_pull', 'fail', errMsg);
    updateSyncStatusIndicator('error', errMsg.slice(0, 60));
    if (typeof showCloudToast === 'function') showCloudToast('Auto-sync pull failed: ' + errMsg);
  }
}

// ---------------------------------------------------------------------------
// Conflict modal
// ---------------------------------------------------------------------------

/**
 * Show the sync conflict modal with local vs. remote comparison.
 * @param {{local: object, remote: object, remoteMeta: object}} opts
 */
function showSyncConflictModal(opts) {
  var modal = safeGetElement('cloudSyncConflictModal');
  if (!modal) {
    var msg = 'Sync conflict detected.\n\n' +
      'Local:  ' + opts.local.itemCount + ' items\n' +
      'Remote: ' + opts.remote.itemCount + ' items\n\n' +
      'Keep YOUR local version? (Cancel to keep the remote version)';
    if (typeof appConfirm === 'function') {
      appConfirm(msg, 'Sync Conflict').then(function (keepMine) {
        if (keepMine) pushSyncVault();
        else pullWithPreview(opts.remoteMeta).catch(function (err) {
          debugLog('[CloudSync] pullWithPreview failed in conflict fallback:', err);
          updateSyncStatusIndicator('error', 'Pull failed — ' + err.message);
        });
      });
    }
    return;
  }

  // Populate modal fields
  var setEl = function (id, text) {
    var el = safeGetElement(id);
    if (el) el.textContent = text || '\u2014';
  };

  setEl('syncConflictLocalItems', opts.local.itemCount + ' items');
  setEl('syncConflictLocalTime', opts.local.timestamp ? _syncRelativeTime(opts.local.timestamp) : 'Unknown');
  setEl('syncConflictLocalVersion', 'v' + opts.local.appVersion);
  setEl('syncConflictRemoteItems', opts.remote.itemCount + ' items');
  setEl('syncConflictRemoteTime', opts.remote.timestamp ? _syncRelativeTime(opts.remote.timestamp) : 'Unknown');
  setEl('syncConflictRemoteVersion', 'v' + opts.remote.appVersion);
  setEl('syncConflictRemoteDevice', opts.remote.deviceId ? opts.remote.deviceId.slice(0, 8) + '\u2026' : 'Another device');

  // Wire buttons
  var keepMineBtn = safeGetElement('syncConflictKeepMine');
  var keepTheirsBtn = safeGetElement('syncConflictKeepTheirs');
  var skipBtn = safeGetElement('syncConflictSkip');

  var closeModal = function () {
    modal.style.display = 'none';
    if (typeof closeModalById === 'function') closeModalById('cloudSyncConflictModal');
  };

  if (keepMineBtn) {
    keepMineBtn.onclick = function () {
      closeModal();
      pushSyncVault();
    };
  }
  if (keepTheirsBtn) {
    keepTheirsBtn.onclick = function () {
      closeModal();
      // Layer 5 — Show restore preview instead of direct pull (REQ-5)
      pullWithPreview(opts.remoteMeta).catch(function (err) {
        debugLog('[CloudSync] pullWithPreview failed on Keep Theirs:', err);
        updateSyncStatusIndicator('error', 'Pull failed — ' + err.message);
      });
    };
  }
  if (skipBtn) {
    skipBtn.onclick = closeModal;
  }

  if (typeof openModalById === 'function') {
    openModalById('cloudSyncConflictModal');
  } else {
    modal.style.display = 'flex';
  }
}

// ---------------------------------------------------------------------------
// Restore preview (Layer 5 — REQ-5)
// ---------------------------------------------------------------------------

/**
 * Show a modal previewing what will change when applying a remote vault.
 * @param {object} diffResult - From DiffEngine.compareItems()
 * @param {object} settingsDiff - From DiffEngine.compareSettings()
 * @param {object} remotePayload - Decrypted remote vault payload
 * @param {object} remoteMeta - Remote sync metadata
 */
function showRestorePreviewModal(diffResult, settingsDiff, remotePayload, remoteMeta) {
  // Delegate to DiffModal (STAK-184) — falls back to false if unavailable
  if (typeof DiffModal === 'undefined' || !DiffModal.show) {
    debugLog('[CloudSync] DiffModal not available — falling back');
    return false;
  }

  var addedCount = diffResult.added ? diffResult.added.length : 0;
  var removedCount = diffResult.deleted ? diffResult.deleted.length : 0;
  var modifiedCount = diffResult.modified ? diffResult.modified.length : 0;

  DiffModal.show({
    source: { type: 'sync', label: _syncProvider || 'Cloud' },
    diff: diffResult,
    settingsDiff: settingsDiff || null,
    meta: {
      deviceId: remoteMeta.deviceId,
      timestamp: remoteMeta.timestamp,
      itemCount: remoteMeta.itemCount,
      appVersion: remoteMeta.appVersion
    },
    onApply: function () {
      try {
        syncSaveOverrideBackup();
        restoreVaultData(remotePayload);
        debugLog('[CloudSync] Restore preview: applied changes');
        // Record pull only on actual apply
        if (typeof _previewPullMeta !== 'undefined' && _previewPullMeta) {
          syncSetLastPull(_previewPullMeta);
          _previewPullMeta = null;
        }
        if (typeof showCloudToast === 'function') {
          showCloudToast('Sync update applied: ' + addedCount + ' added, ' + removedCount + ' removed, ' + modifiedCount + ' modified.');
        }
        updateSyncStatusIndicator('idle', 'just now');
        refreshSyncUI();
        // Notify other tabs (Layer 7)
        if (_syncChannel) {
          try { _syncChannel.postMessage({ type: 'sync-pull-complete', tabId: getSyncDeviceId(), ts: Date.now() }); } catch (e) { /* ignore */ }
        }
      } catch (applyErr) {
        debugLog('[CloudSync] Restore preview: apply failed:', applyErr);
        updateSyncStatusIndicator('error', 'Restore failed');
        if (typeof showCloudToast === 'function') showCloudToast('Restore failed: ' + applyErr.message);
      }
    },
    onCancel: function () { /* no-op */ }
  });

  return true;
}

/**
 * Build a diff-like result from a decrypted manifest payload.
 * Converts manifest.changes into the {added, modified, deleted, unchanged}
 * format that DiffModal expects.
 * @param {object} manifest - Decrypted manifest object from decryptManifest()
 * @returns {object} DiffModal-compatible diff result
 */
function _buildDiffFromManifest(manifest) {
  var added = [];
  var modified = [];
  var deleted = [];
  var changes = manifest.changes || [];

  for (var i = 0; i < changes.length; i++) {
    var change = changes[i];
    if (change.type === 'add') {
      added.push({ name: change.itemName || change.itemKey, itemKey: change.itemKey });
    } else if (change.type === 'edit') {
      var modChanges = [];
      var fields = change.fields || [];
      for (var f = 0; f < fields.length; f++) {
        modChanges.push({
          field: fields[f].field,
          localVal: fields[f].oldValue,
          remoteVal: fields[f].newValue,
        });
      }
      modified.push({ item: { name: change.itemName || change.itemKey }, changes: modChanges });
    } else if (change.type === 'delete') {
      deleted.push({ name: change.itemName || change.itemKey, itemKey: change.itemKey });
    }
  }

  // We can't know the exact unchanged count from the manifest alone, so use
  // an empty array — DiffModal handles empty unchanged gracefully.
  var unchanged = [];

  return { added: added, modified: modified, deleted: deleted, unchanged: unchanged };
}

/**
 * Deferred vault restore — downloads the full vault, decrypts, and restores.
 * Called from the manifest-first pull path's onApply callback, so the heavy
 * vault download only happens when the user confirms the diff preview.
 * @param {string} token - Dropbox OAuth bearer token
 * @param {string} password - Vault encryption password
 * @param {object} remoteMeta - Remote sync metadata
 * @returns {Promise<void>}
 */
async function _deferredVaultRestore(token, password, remoteMeta) {
  try {
    updateSyncStatusIndicator('syncing');
    var apiArg = JSON.stringify({ path: SYNC_FILE_PATH });
    var resp = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Dropbox-API-Arg': apiArg,
      },
    });
    if (!resp.ok) throw new Error('Vault download failed: ' + resp.status);
    var bytes = new Uint8Array(await resp.arrayBuffer());

    syncSaveOverrideBackup();
    await vaultDecryptAndRestore(bytes, password);
    debugLog('[CloudSync] Deferred vault restore complete');

    if (_previewPullMeta) {
      syncSetLastPull(_previewPullMeta);
      _previewPullMeta = null;
    }
    if (typeof showCloudToast === 'function') {
      showCloudToast('Sync update applied');
    }
    updateSyncStatusIndicator('idle', 'just now');
    refreshSyncUI();
    if (_syncChannel) {
      try { _syncChannel.postMessage({ type: 'sync-pull-complete', tabId: getSyncDeviceId(), ts: Date.now() }); } catch (e) { /* ignore */ }
    }
  } catch (err) {
    debugLog('[CloudSync] Deferred vault restore failed:', err.message);
    updateSyncStatusIndicator('error', 'Restore failed');
    if (typeof showCloudToast === 'function') showCloudToast('Restore failed: ' + err.message);
  }
}

/**
 * Download remote vault, decrypt without restoring, compute diff, and show preview.
 * Attempts manifest-first path (lightweight diff preview without full vault download).
 * Falls back to vault-first path if manifest is unavailable or fails.
 * @param {object} remoteMeta - Remote sync metadata
 */
async function pullWithPreview(remoteMeta) {
  var password = getSyncPasswordSilent();
  if (!password) {
    password = await getSyncPassword();
  }
  if (!password) {
    debugLog('[CloudSync] Pull preview cancelled — no password');
    return;
  }

  var token = typeof cloudGetToken === 'function' ? await cloudGetToken(_syncProvider) : null;
  if (!token) {
    debugLog('[CloudSync] Pull preview — no token');
    updateSyncStatusIndicator('error', 'Not connected');
    return;
  }

  updateSyncStatusIndicator('syncing');

  try {
    // ── Manifest-first pull attempt ──
    // Try downloading the lightweight .stmanifest first so we can show a
    // diff preview without fetching the full vault. If the manifest is
    // unavailable (404, decrypt failure, DiffModal missing) we fall through
    // to the vault-first path below.
    try {
      if (typeof decryptManifest === 'function' && typeof DiffModal !== 'undefined' && DiffModal.show) {
        var manifestApiArg = JSON.stringify({ path: SYNC_MANIFEST_PATH });
        var manifestResp = await fetch('https://content.dropboxapi.com/2/files/download', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Dropbox-API-Arg': manifestApiArg,
          },
        });

        if (manifestResp.ok) {
          var manifestBytes = new Uint8Array(await manifestResp.arrayBuffer());
          var manifest = await decryptManifest(manifestBytes, password);

          // Build diff-like result from manifest data
          var manifestDiff = _buildDiffFromManifest(manifest);

          // Stash pull metadata
          _previewPullMeta = {
            syncId: remoteMeta ? remoteMeta.syncId : null,
            timestamp: remoteMeta ? remoteMeta.timestamp : Date.now(),
            rev: remoteMeta ? remoteMeta.rev : null,
          };

          // Show DiffModal with manifest preview — vault download deferred to onApply
          DiffModal.show({
            source: { type: 'sync', label: _syncProvider || 'Cloud' },
            diff: manifestDiff,
            meta: {
              deviceId: manifest.deviceId || (remoteMeta ? remoteMeta.deviceId : null),
              timestamp: remoteMeta ? remoteMeta.timestamp : null,
              itemCount: remoteMeta ? remoteMeta.itemCount : null,
              appVersion: remoteMeta ? remoteMeta.appVersion : null,
            },
            onApply: function () {
              // Deferred: download full vault, decrypt, restore
              _deferredVaultRestore(token, password, remoteMeta);
            },
            onCancel: function () {
              debugLog('[CloudSync] Manifest preview cancelled — no vault download');
            }
          });
          updateSyncStatusIndicator('idle', 'just now');
          return; // manifest path succeeded — skip vault-first path
        }
      }
    } catch (manifestErr) {
      debugLog('[CloudSync] Manifest-first pull failed, falling back to vault-first:', manifestErr.message);
    }

    // ── Vault-first fallback (existing path) ──
    var apiArg = JSON.stringify({ path: SYNC_FILE_PATH });
    var resp = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Dropbox-API-Arg': apiArg,
      },
    });

    if (!resp.ok) throw new Error('Vault download failed: ' + resp.status);

    var bytes = new Uint8Array(await resp.arrayBuffer());

    // Attempt to decrypt and preview
    try {
      var remotePayload = await vaultDecryptToData(bytes, password);
      var remoteItems = remotePayload.data || [];
      var localItems = typeof inventory !== 'undefined' ? inventory : [];

      var diffResult = typeof DiffEngine !== 'undefined'
        ? DiffEngine.compareItems(localItems, remoteItems)
        : { added: [], deleted: [], modified: [], unchanged: [] };

      // Compare settings
      var localSettings = {};
      var remoteSettings = remotePayload.settings || {};
      if (typeof SYNC_SCOPE_KEYS !== 'undefined') {
        for (var i = 0; i < SYNC_SCOPE_KEYS.length; i++) {
          if (SYNC_SCOPE_KEYS[i] === 'metalInventory') continue;
          var v = loadData(SYNC_SCOPE_KEYS[i]);
          if (v !== null && v !== undefined) localSettings[SYNC_SCOPE_KEYS[i]] = v;
        }
      }
      var settingsDiff = typeof DiffEngine !== 'undefined'
        ? DiffEngine.compareSettings(localSettings, remoteSettings)
        : { changed: [], unchanged: [] };

      // Stash pull metadata for deferred recording (applied by preview modal or fallback)
      _previewPullMeta = {
        syncId: remoteMeta ? remoteMeta.syncId : null,
        timestamp: remoteMeta ? remoteMeta.timestamp : Date.now(),
        rev: remoteMeta ? remoteMeta.rev : null,
      };

      var shown = showRestorePreviewModal(diffResult, settingsDiff, remotePayload, remoteMeta);
      if (!shown) {
        // Modal not in DOM — fall back to direct restore
        debugLog('[CloudSync] Preview modal unavailable — falling back to direct restore');
        syncSaveOverrideBackup();
        await vaultDecryptAndRestore(bytes, password);
        syncSetLastPull(_previewPullMeta);
        _previewPullMeta = null;
      }

    } catch (decryptErr) {
      // Decryption or diff failed — offer fallback
      debugLog('[CloudSync] Preview decryption failed:', decryptErr.message);
      var errorEl = safeGetElement('restorePreviewError');
      var modal = safeGetElement('restorePreviewModal');
      if (modal && errorEl) {
        errorEl.textContent = 'Could not decrypt vault for preview: ' + decryptErr.message;
        errorEl.style.display = '';
        var diffListEl = safeGetElement('restorePreviewDiffList');
        if (diffListEl) diffListEl.innerHTML = '';
        var summaryEl = safeGetElement('restorePreviewSummary');
        if (summaryEl) summaryEl.textContent = '';

        // Show modal with just error + fallback restore button
        var applyBtn = safeGetElement('restorePreviewApplyBtn');
        if (applyBtn) {
          applyBtn.textContent = 'Restore without preview';
          applyBtn.onclick = function () {
            modal.style.display = 'none';
            if (typeof closeModalById === 'function') closeModalById('restorePreviewModal');
            applyBtn.textContent = 'Apply Changes';
            pullSyncVault(remoteMeta).catch(function (err) {
              debugLog('[CloudSync] Fallback restore failed:', err);
              updateSyncStatusIndicator('error', 'Restore failed');
            });
          };
        }

        if (typeof openModalById === 'function') {
          openModalById('restorePreviewModal');
        } else {
          modal.style.display = 'flex';
        }
      } else {
        // No modal at all — direct restore
        await pullSyncVault(remoteMeta);
      }
    }

    updateSyncStatusIndicator('idle', 'just now');

  } catch (err) {
    var errMsg = String(err.message || err);
    debugLog('[CloudSync] Pull preview failed:', errMsg);
    updateSyncStatusIndicator('error', errMsg.slice(0, 60));
    // Fall back to direct pull
    await pullSyncVault(remoteMeta);
  }
}

// ---------------------------------------------------------------------------
// Poller lifecycle
// ---------------------------------------------------------------------------

/** Schedule the next poll using the current _syncRetryDelay (respects backoff). */
function _schedulePoll() {
  _syncPollerTimer = setTimeout(async function () {
    await pollForRemoteChanges();
    if (_syncPollerTimer !== null) _schedulePoll();
  }, _syncRetryDelay);
}

/** Start the background polling loop. Uses setTimeout so backoff delay is honoured. */
function startSyncPoller() {
  stopSyncPoller();
  _syncRetryDelay = SYNC_POLL_INTERVAL;
  _schedulePoll();
  debugLog('[CloudSync] Poller started (initial delay', SYNC_POLL_INTERVAL / 60000, 'min)');
}

/** Stop the background polling loop. */
function stopSyncPoller() {
  if (_syncPollerTimer !== null) {
    clearTimeout(_syncPollerTimer);
    _syncPollerTimer = null;
    debugLog('[CloudSync] Poller stopped');
  }
}

// ---------------------------------------------------------------------------
// Enable / disable
// ---------------------------------------------------------------------------

/**
 * Enable auto-sync: do an initial push, then start the poller.
 * @param {string} [provider='dropbox']
 */
async function enableCloudSync(provider) {
  _syncProvider = provider || 'dropbox';
  try { localStorage.setItem('cloud_sync_enabled', 'true'); } catch (_) { /* ignore */ }

  debugLog('[CloudSync] Enabling auto-sync for', _syncProvider);

  // Ensure we have a device ID
  getSyncDeviceId();

  // Update UI immediately so Sync Now button is enabled before the async push
  refreshSyncUI();

  // Initial push (this will open the password modal if no cached password)
  await pushSyncVault();

  // Start the poller
  startSyncPoller();

  // Update UI again with post-push state (last-synced timestamp)
  refreshSyncUI();

  if (typeof showCloudToast === 'function') showCloudToast('Auto-sync enabled. Your inventory will sync automatically.');
  logCloudSyncActivity('auto_sync_enable', 'success', 'Auto-sync enabled');
}

/**
 * Disable auto-sync: persist the disabled flag, stop the poller, and update UI.
 */
function disableCloudSync() {
  try { localStorage.setItem('cloud_sync_enabled', 'false'); } catch (_) { /* ignore */ }
  stopSyncPoller();
  refreshSyncUI();
  updateSyncStatusIndicator('disabled');
  logCloudSyncActivity('auto_sync_disable', 'success', 'Auto-sync disabled');
  debugLog('[CloudSync] Auto-sync disabled');
}
// ---------------------------------------------------------------------------
// Initialization (called from init.js Phase 13)
// ---------------------------------------------------------------------------

/**
 * Initialize the cloud sync module.
 * Creates the debounced push function and starts the poller if sync was enabled.
 */
function initCloudSync() {
  // Initialize multi-tab coordination (Layer 7)
  initSyncTabCoordination();

  // Build the debounced push wrapper
  if (typeof debounce === 'function') {
    scheduleSyncPush = debounce(pushSyncVault, SYNC_PUSH_DEBOUNCE);
  } else {
    // Fallback: simple delayed call (no de-duplication)
    scheduleSyncPush = (function () {
      var _timer = null;
      return function () {
        clearTimeout(_timer);
        _timer = setTimeout(pushSyncVault, SYNC_PUSH_DEBOUNCE);
      };
    }());
  }

  // Expose globally so saveInventory() hook can reach it
  window.scheduleSyncPush = scheduleSyncPush;

  if (!syncIsEnabled()) {
    debugLog('[CloudSync] Auto-sync is disabled — poller not started');
    updateCloudSyncHeaderBtn();
    return;
  }

  var connected = typeof cloudIsConnected === 'function' ? cloudIsConnected(_syncProvider) : false;
  if (!connected) {
    debugLog('[CloudSync] Auto-sync enabled but not connected to', _syncProvider);
    updateCloudSyncHeaderBtn();
    return;
  }

  debugLog('[CloudSync] Resuming auto-sync from previous session');

  var hasPw = getSyncPasswordSilent();
  updateCloudSyncHeaderBtn();

  if (!hasPw) {
    // No password available — show orange indicator, wait for user to tap
    debugLog('[CloudSync] No vault password — showing setup toast');
    setTimeout(function () {
      if (typeof showCloudToast === 'function') {
        showCloudToast('Cloud sync paused — tap the cloud icon to set your vault password', 5000);
      }
    }, 1000);
    return;
  }

  startSyncPoller();
  setTimeout(function () { pollForRemoteChanges(); }, 3000);
}

// ---------------------------------------------------------------------------
// Page Visibility API: pause/resume poller
// ---------------------------------------------------------------------------

document.addEventListener('visibilitychange', function () {
  if (!syncIsEnabled()) return;
  if (document.hidden) {
    // Tab hidden: pause is automatic since pollForRemoteChanges() checks document.hidden
    debugLog('[CloudSync] Tab hidden — polls will skip');
  } else {
    // Tab visible again: fire an immediate poll
    debugLog('[CloudSync] Tab visible — polling for remote changes');
    setTimeout(function () { pollForRemoteChanges(); }, 500);
  }
});

// ---------------------------------------------------------------------------
// Window exports
// ---------------------------------------------------------------------------

window.initCloudSync = initCloudSync;
window.enableCloudSync = enableCloudSync;
window.disableCloudSync = disableCloudSync;
window.pushSyncVault = pushSyncVault;
window.pullSyncVault = pullSyncVault;
window.pollForRemoteChanges = pollForRemoteChanges;
window.showSyncConflictModal = showSyncConflictModal;
window.showSyncUpdateModal = showSyncUpdateModal;
window.showRestorePreviewModal = showRestorePreviewModal;
window.pullWithPreview = pullWithPreview;
window.computeInventoryHash = computeInventoryHash;
window.summarizeMetals = summarizeMetals;
window.computeTotalWeight = computeTotalWeight;
window.computeSettingsHash = computeSettingsHash;
window.refreshSyncUI = refreshSyncUI;
window.updateSyncStatusIndicator = updateSyncStatusIndicator;
window.updateCloudSyncHeaderBtn = updateCloudSyncHeaderBtn;
window.getSyncDeviceId = getSyncDeviceId;
window.getSyncPasswordSilent = getSyncPasswordSilent;
window.syncIsEnabled = syncIsEnabled;
window.syncSaveOverrideBackup = syncSaveOverrideBackup;
window.syncRestoreOverrideBackup = syncRestoreOverrideBackup;
window.changeVaultPassword = changeVaultPassword;
window.syncGetLastPush = syncGetLastPush;
window._syncRelativeTime = _syncRelativeTime;

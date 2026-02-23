// =============================================================================
// CLOUD AUTO-SYNC — Real-Time Encrypted Inventory Sync (STAK-149)
// =============================================================================
//
// Automatic background sync: when inventory changes, pushes an encrypted
// .stvault to Dropbox. On other devices, a background poller detects the
// new file via staktrakr-sync.json and prompts the user to pull.
//
// Sync file:  /StakTrakr/staktrakr-sync.stvault  (full encrypted snapshot)
// Metadata:   /StakTrakr/staktrakr-sync.json     (lightweight pointer, polled)
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
 * Update the header cloud sync icon button state and visibility.
 * Called alongside updateSyncStatusIndicator() at every state change.
 * States: hidden (sync disabled) | gray (not connected) | orange (needs password) | green (synced)
 */
function updateCloudSyncHeaderBtn() {
  var btn = safeGetElement('headerCloudSyncBtn');
  var dot = safeGetElement('headerCloudDot');
  if (!btn) return;

  // Hide entirely when sync is explicitly disabled
  if (!syncIsEnabled()) {
    btn.style.display = 'none';
    return;
  }

  btn.style.display = '';

  if (!dot) return;
  dot.className = 'cloud-sync-dot header-cloud-dot';

  var hasCachedPw = typeof cloudGetCachedPassword === 'function'
    ? !!cloudGetCachedPassword(_syncProvider)
    : false;
  var connected = typeof cloudIsConnected === 'function'
    ? cloudIsConnected(_syncProvider)
    : false;

  if (hasCachedPw) {
    // Green: password cached, sync is running normally
    dot.classList.add('header-cloud-dot--green');
    btn.title = 'Cloud sync active';
    btn.setAttribute('aria-label', 'Cloud sync active');
    btn.dataset.syncState = 'green';
  } else if (connected) {
    // Orange: connected but password expired/missing
    dot.classList.add('header-cloud-dot--orange');
    btn.title = 'Cloud sync needs your password';
    btn.setAttribute('aria-label', 'Cloud sync needs your password');
    btn.dataset.syncState = 'orange';
  } else {
    // Gray: sync on but not yet connected/configured
    btn.title = 'Set up cloud sync';
    btn.setAttribute('aria-label', 'Set up cloud sync');
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
 * Get the session-cached sync password, or open the sync password modal.
 * Returns a Promise that resolves with the password string, or null if cancelled.
 * @returns {Promise<string|null>}
 */
function getSyncPassword() {
  // Try cached password first
  var cached = typeof cloudGetCachedPassword === 'function'
    ? cloudGetCachedPassword(_syncProvider)
    : null;
  if (cached) return Promise.resolve(cached);

  // Open the dedicated sync password modal and resolve when the user submits/cancels
  return new Promise(function (resolve) {
    var modal = safeGetElement('cloudSyncPasswordModal');
    var input = safeGetElement('syncPasswordInput');
    var confirmBtn = safeGetElement('syncPasswordConfirmBtn');
    var cancelBtn = safeGetElement('syncPasswordCancelBtn');
    var cancelBtn2 = safeGetElement('syncPasswordCancelBtn2');
    var errorEl = safeGetElement('syncPasswordError');

    if (!modal || !input || !confirmBtn) {
      if (typeof appPrompt === 'function') {
        appPrompt('Vault password for sync:', '', 'Cloud Sync Password').then(function (pw) {
          if (pw && typeof cloudCachePassword === 'function') cloudCachePassword(_syncProvider, pw);
          resolve(pw || null);
        });
      } else {
        resolve(null);
      }
      return;
    }

    // Reset state
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
      cleanup();
      if (typeof cloudCachePassword === 'function') cloudCachePassword(_syncProvider, pw);
      // Update header icon to green immediately; if modal was opened from header icon, trigger a push
      if (typeof updateCloudSyncHeaderBtn === 'function') updateCloudSyncHeaderBtn();
      setTimeout(function () { if (typeof pushSyncVault === 'function') pushSyncVault(); }, 100);
      resolve(pw);
    };

    var onCancel = function () {
      cleanup();
      resolve(null);
    };

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

    // Focus the input after the modal opens
    setTimeout(function () { input.focus(); }, 50);
  });
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

  var password = await getSyncPassword();
  debugLog('[CloudSync] Password obtained:', !!password);
  if (!password) {
    debugLog('[CloudSync] No password — push skipped');
    return;
  }

  _syncPushInFlight = true;
  updateSyncStatusIndicator('syncing');
  var pushStart = Date.now();

  try {
    // Encrypt sync-scoped payload
    debugLog('[CloudSync] Encrypting payload…');
    var fileBytes = typeof vaultEncryptToBytesScoped === 'function'
      ? await vaultEncryptToBytesScoped(password)
      : await vaultEncryptToBytes(password);
    debugLog('[CloudSync] Encrypted:', fileBytes.byteLength, 'bytes');

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
  if (document.hidden) return; // Page Visibility API: skip background polls

  var token = typeof cloudGetToken === 'function' ? await cloudGetToken(_syncProvider) : null;
  if (!token) return;

  try {
    var apiArg = JSON.stringify({ path: SYNC_META_PATH });
    var resp = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Dropbox-API-Arg': apiArg,
      },
    });

    if (resp.status === 409) {
      // File not found — no sync file yet (first device)
      debugLog('[CloudSync] No remote sync file yet');
      return;
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

  var hasLocal = syncHasLocalChanges();

  if (!hasLocal) {
    // Show the update-available modal — let user decide before password prompt
    debugLog('[CloudSync] Remote change detected — showing update modal');
    var accepted = await showSyncUpdateModal(remoteMeta);
    if (!accepted) {
      debugLog('[CloudSync] User dismissed update — will retry next poll');
      return;
    }
    await pullSyncVault(remoteMeta);
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
  var password = await getSyncPassword();
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
        else pullSyncVault(opts.remoteMeta);
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
      pullSyncVault(opts.remoteMeta);
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
    return;
  }

  var connected = typeof cloudIsConnected === 'function' ? cloudIsConnected(_syncProvider) : false;
  if (!connected) {
    debugLog('[CloudSync] Auto-sync enabled but not connected to', _syncProvider);
    return;
  }

  debugLog('[CloudSync] Resuming auto-sync from previous session');

  // Check if password is available before starting any sync that would prompt for it
  var hasCachedPw = typeof cloudGetCachedPassword === 'function'
    ? !!cloudGetCachedPassword(_syncProvider)
    : false;

  if (!hasCachedPw) {
    // No password cached — skip the auto-push/poll that would open the modal.
    // Show the header icon in orange and a polite toast instead.
    debugLog('[CloudSync] No cached password on load — skipping initial push, showing toast');
    updateCloudSyncHeaderBtn();
    setTimeout(function () {
      if (typeof showCloudToast === 'function') {
        showCloudToast('Cloud sync needs your password — tap the sync icon to unlock', 5000);
      }
    }, 1000);
    // Still start the poller — it will skip pushes until getSyncPassword() succeeds
    startSyncPoller();
    return;
  }

  startSyncPoller();

  // Poll immediately on startup to catch any changes while app was closed
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
window.refreshSyncUI = refreshSyncUI;
window.updateSyncStatusIndicator = updateSyncStatusIndicator;
window.updateCloudSyncHeaderBtn = updateCloudSyncHeaderBtn;
window.getSyncDeviceId = getSyncDeviceId;
window.syncIsEnabled = syncIsEnabled;
window.syncSaveOverrideBackup = syncSaveOverrideBackup;
window.syncRestoreOverrideBackup = syncRestoreOverrideBackup;

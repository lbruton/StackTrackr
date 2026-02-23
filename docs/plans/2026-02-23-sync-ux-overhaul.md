# Sync UX Overhaul + Simple Mode — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate all auto-opening sync modals on page load, add a "Simple" Dropbox-account-derived encryption mode, and replace Secure-mode password entry with an inline header popover.

**Architecture:** The root cause of the on-load modal is that `saveInventory()` calls `scheduleSyncPush()` during initialization, which eventually calls `getSyncPassword()`, which opens the modal. The fix splits this into `getSyncPasswordSilent()` (background, never prompts) used by `pushSyncVault()`, and interactive password collection handled exclusively through the header popover. Simple mode derives the vault encryption key from the user's stable Dropbox account ID via PBKDF2 — no user interaction ever needed.

**Tech Stack:** Vanilla JS, Web Crypto API (PBKDF2 already used by vault.js), localStorage, Dropbox REST API.

**Design doc:** `docs/plans/2026-02-23-sync-ux-overhaul-design.md`

---

## Root Cause Reference

`saveInventory()` → `scheduleSyncPush()` → `pushSyncVault()` → `getSyncPassword()` → `openModalById('cloudSyncPasswordModal')`.

This chain fires during app initialization. All background pushes must use `getSyncPasswordSilent()` instead, which never opens a modal.

---

### Task 1: Add Simple Mode Constants (`constants.js`)

**Files:**
- Modify: `js/constants.js`

**Step 1: Add the Simple-mode salt constant**

Find the `CLOUD_VAULT_IDLE_TIMEOUT_KEY` constant declaration (around line 571). Add below it:

```js
/** App-namespace salt for Simple mode key derivation. Never change — changing invalidates all Simple-mode syncs. */
const STAKTRAKR_SIMPLE_SALT = '53544b52:53494d504c45:76310000';
```

**Step 2: Add the two new localStorage keys to ALLOWED_STORAGE_KEYS**

Find the line `CLOUD_VAULT_IDLE_TIMEOUT_KEY,  // number string: vault password idle lock timeout...` (around line 804). Add the two new keys directly below it, before the `];`:

```js
  "cloud_sync_mode",                           // string: "simple" | "secure" — sync encryption mode
  "cloud_dropbox_account_id",                  // string: Dropbox account_id for Simple mode key derivation
```

**Step 3: Export STAKTRAKR_SIMPLE_SALT to window**

Find `window.CLOUD_VAULT_IDLE_TIMEOUT_KEY = CLOUD_VAULT_IDLE_TIMEOUT_KEY;` (around line 1637). Add below it:

```js
  window.STAKTRAKR_SIMPLE_SALT = STAKTRAKR_SIMPLE_SALT;
```

**Step 4: Verify in browser console**

Open `index.html` in a browser and run:
```js
console.log(window.STAKTRAKR_SIMPLE_SALT); // '53544b52:53494d504c45:76310000'
console.log(window.ALLOWED_STORAGE_KEYS.includes('cloud_sync_mode')); // true
console.log(window.ALLOWED_STORAGE_KEYS.includes('cloud_dropbox_account_id')); // true
```

**Step 5: Commit**

```bash
git add js/constants.js
git commit -m "feat(sync): add Simple mode constants to constants.js"
```

---

### Task 2: Fetch and Store Dropbox Account ID (`cloud-storage.js`)

**Files:**
- Modify: `js/cloud-storage.js`

**Step 1: Fetch account ID after OAuth token exchange**

In `cloudExchangeCode()`, find the line `cloudStoreToken(provider, tokenData);` (around line 480). Add a non-blocking fetch immediately after it:

```js
    cloudStoreToken(provider, tokenData);

    // Fetch Dropbox account ID for Simple mode key derivation (non-blocking, Dropbox-only)
    if (provider === 'dropbox') {
      fetch('https://api.dropboxapi.com/2/users/get_current_account', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + tokenData.access_token,
          'Content-Type': 'application/json',
        },
        body: 'null',
      }).then(function (r) { return r.ok ? r.json() : null; })
        .then(function (info) {
          if (info && info.account_id) {
            localStorage.setItem('cloud_dropbox_account_id', info.account_id);
            debugLog('[CloudStorage] Stored Dropbox account ID for Simple mode');
          }
        })
        .catch(function (e) { debugLog('[CloudStorage] Failed to fetch Dropbox account ID', e); });
    }
```

**Step 2: Clear account ID on disconnect**

In `cloudDisconnect()`, find `localStorage.removeItem('cloud_last_backup');` and add below it:

```js
  if (provider === 'dropbox') {
    localStorage.removeItem('cloud_dropbox_account_id');
  }
```

**Step 3: Manual verification**

1. Open app in browser, go to Settings → Cloud
2. Click "Connect Dropbox" and complete OAuth
3. Open browser console and run: `localStorage.getItem('cloud_dropbox_account_id')`
4. Expected: a string beginning with `dbid:` (e.g. `dbid:AAH4abc...`)
5. Click "Disconnect Dropbox"
6. Run: `localStorage.getItem('cloud_dropbox_account_id')`
7. Expected: `null`

**Step 4: Commit**

```bash
git add js/cloud-storage.js
git commit -m "feat(sync): fetch and store Dropbox account ID for Simple mode"
```

---

### Task 3: Add `getSyncPasswordSilent()` and Fix `pushSyncVault()` (`cloud-sync.js`)

**Files:**
- Modify: `js/cloud-sync.js`

This is the **core bug fix**. `pushSyncVault()` currently calls the interactive `getSyncPassword()`, which can open a modal from background processes like `saveInventory()`.

**Step 1: Add `getSyncPasswordSilent()` after `getSyncPassword()`**

Find the closing `}` of `getSyncPassword()` (around line 405). Add the new function immediately after:

```js
/**
 * Get the sync password/key without any user interaction.
 * Simple mode: returns the Dropbox account ID derived key.
 * Secure mode: returns the cached session password or null.
 * Never opens a modal or popover — safe to call from background processes.
 * @returns {string|null}
 */
function getSyncPasswordSilent() {
  if (localStorage.getItem('cloud_sync_mode') === 'simple') {
    var accountId = localStorage.getItem('cloud_dropbox_account_id');
    if (!accountId) return null;
    // Prefix with app salt to namespace away from user-chosen passwords.
    // The vault module's own PBKDF2 derives the actual key from this string.
    return STAKTRAKR_SIMPLE_SALT + ':' + accountId;
  }
  // Secure mode: return cached password or null
  return typeof cloudGetCachedPassword === 'function'
    ? cloudGetCachedPassword(_syncProvider)
    : null;
}
```

**Step 2: Update `pushSyncVault()` to use the silent getter**

In `pushSyncVault()`, find (around line 453):

```js
  var password = await getSyncPassword();
  debugLog('[CloudSync] Password obtained:', !!password);
  if (!password) {
    debugLog('[CloudSync] No password — push skipped');
    return;
  }
```

Replace with:

```js
  var password = getSyncPasswordSilent();
  debugLog('[CloudSync] Password obtained (silent):', !!password);
  if (!password) {
    debugLog('[CloudSync] No password — push deferred (tap cloud icon to unlock)');
    return;
  }
```

**Step 3: Add window export for `getSyncPasswordSilent`**

At the bottom of `cloud-sync.js`, find the exports block and add:

```js
window.getSyncPasswordSilent = getSyncPasswordSilent;
```

**Step 4: Verify no auto-modal on page load**

1. Set `localStorage.setItem('cloud_sync_enabled', 'true')` in the console
2. Connect Dropbox (so `cloud_token_dropbox` is set)
3. Reload the page
4. **Expected:** No password modal appears. Orange dot shows on header cloud button. A toast appears after ~1 second: "Cloud sync needs your password — tap the sync icon to unlock"
5. **Not expected:** Any modal auto-opening

**Step 5: Commit**

```bash
git add js/cloud-sync.js
git commit -m "fix(sync): use silent password getter in pushSyncVault to prevent auto-modal"
```

---

### Task 4: Update `initCloudSync()` for Simple Mode (`cloud-sync.js`)

**Files:**
- Modify: `js/cloud-sync.js`

**Step 1: Add Simple mode branch to `initCloudSync()`**

Find the section in `initCloudSync()` that starts with `debugLog('[CloudSync] Resuming auto-sync from previous session');` (around line 1075). Replace the entire block from that line to the end of the function body with:

```js
  debugLog('[CloudSync] Resuming auto-sync from previous session');

  var isSimple = localStorage.getItem('cloud_sync_mode') === 'simple';

  if (isSimple) {
    var accountId = localStorage.getItem('cloud_dropbox_account_id');
    updateCloudSyncHeaderBtn();
    if (!accountId) {
      // Simple mode connected but account ID missing — need a fresh OAuth
      debugLog('[CloudSync] Simple mode: no account ID — showing reconnect toast');
      setTimeout(function () {
        if (typeof showCloudToast === 'function') {
          showCloudToast('Cloud sync paused — tap the cloud icon to reconnect Dropbox', 5000);
        }
      }, 1000);
    }
    // Simple mode always starts the poller and polls immediately — no password needed
    startSyncPoller();
    setTimeout(function () { pollForRemoteChanges(); }, 3000);
    return;
  }

  // Secure mode: check for cached session password
  var hasCachedPw = typeof cloudGetCachedPassword === 'function'
    ? !!cloudGetCachedPassword(_syncProvider)
    : false;

  if (!hasCachedPw) {
    debugLog('[CloudSync] Secure mode: no cached password on load — showing toast');
    updateCloudSyncHeaderBtn();
    setTimeout(function () {
      if (typeof showCloudToast === 'function') {
        showCloudToast('Cloud sync needs your password — tap the cloud icon to unlock', 5000);
      }
    }, 1000);
    // Start poller — background pushes will skip silently until password is provided
    startSyncPoller();
    return;
  }

  // Secure mode with cached password: full resume
  updateCloudSyncHeaderBtn();
  startSyncPoller();
  setTimeout(function () { pollForRemoteChanges(); }, 3000);
}
```

**Step 2: Verify Simple mode on page load (requires Task 2 complete)**

1. Set `localStorage.setItem('cloud_sync_mode', 'simple')`, `cloud_sync_enabled` = `'true'`, ensure `cloud_dropbox_account_id` is set and `cloud_token_dropbox` is set
2. Reload the page
3. **Expected:** Green dot appears immediately, no prompts, sync starts. Console shows: `[CloudSync] Simple mode: ...`
4. **Verify Secure mode still works:** Remove `cloud_sync_mode` from localStorage, reload — orange dot + toast, no modal

**Step 3: Commit**

```bash
git add js/cloud-sync.js
git commit -m "feat(sync): add Simple mode branch to initCloudSync"
```

---

### Task 5: Add `setSyncMode()` and Mode UI Refresh (`cloud-sync.js`)

**Files:**
- Modify: `js/cloud-sync.js`

**Step 1: Add `setSyncMode()` function**

After `disableCloudSync()` (around line 1034), add:

```js
/**
 * Switch the sync encryption mode.
 * Called after user confirms the mode-switch warning.
 * @param {'simple'|'secure'} mode
 */
function setSyncMode(mode) {
  var currentMode = localStorage.getItem('cloud_sync_mode') || 'secure';
  if (mode === currentMode) return;

  localStorage.setItem('cloud_sync_mode', mode);

  // Clear the cached password — it's mode-specific
  if (typeof cloudClearCachedPassword === 'function') cloudClearCachedPassword();

  logCloudSyncActivity('mode_switch', 'success', 'Switched to ' + mode + ' mode');
  updateCloudSyncHeaderBtn();

  if (syncIsEnabled() && typeof scheduleSyncPush === 'function') {
    scheduleSyncPush();
  }

  var label = mode === 'simple' ? 'Simple (Dropbox account)' : 'Secure (vault password)';
  if (typeof showCloudToast === 'function') showCloudToast('Sync mode: ' + label, 4000);
  debugLog('[CloudSync] Sync mode switched to', mode);
}
```

**Step 2: Add `refreshSyncModeUI()` function**

Add immediately after `setSyncMode()`:

```js
/**
 * Update the sync mode radio selector in Settings → Cloud.
 * Called from refreshSyncUI() whenever the cloud panel is rendered.
 */
function refreshSyncModeUI() {
  var modeSec = safeGetElement('cloudSyncModeSection');
  if (!modeSec) return;

  var connected = typeof cloudIsConnected === 'function' ? cloudIsConnected('dropbox') : false;
  var enabled = syncIsEnabled();
  modeSec.style.display = (connected && enabled) ? '' : 'none';

  if (!connected || !enabled) return;

  var currentMode = localStorage.getItem('cloud_sync_mode') || 'secure';
  var simpleRadio = safeGetElement('cloudSyncModeSimple');
  var secureRadio = safeGetElement('cloudSyncModeSecure');
  if (simpleRadio) simpleRadio.checked = currentMode === 'simple';
  if (secureRadio) secureRadio.checked = currentMode !== 'simple';

  // Hide the confirmation warning on re-render
  var warning = safeGetElement('cloudSyncModeSwitchWarning');
  if (warning) warning.style.display = 'none';
}
```

**Step 3: Call `refreshSyncModeUI()` from `refreshSyncUI()`**

In `refreshSyncUI()`, add at the very end (before the closing `}`):

```js
  if (typeof refreshSyncModeUI === 'function') refreshSyncModeUI();
```

**Step 4: Export both new functions**

In the exports block at the bottom of `cloud-sync.js`, add:

```js
window.setSyncMode = setSyncMode;
window.refreshSyncModeUI = refreshSyncModeUI;
```

**Step 5: Commit**

```bash
git add js/cloud-sync.js
git commit -m "feat(sync): add setSyncMode and refreshSyncModeUI"
```

---

### Task 6: Update `updateCloudSyncHeaderBtn()` for Simple Mode States (`cloud-sync.js`)

**Files:**
- Modify: `js/cloud-sync.js`

**Step 1: Replace the body of `updateCloudSyncHeaderBtn()`**

Find `function updateCloudSyncHeaderBtn()` (around line 217). Replace its full body with:

```js
function updateCloudSyncHeaderBtn() {
  var btn = safeGetElement('headerCloudSyncBtn');
  var dot = safeGetElement('headerCloudDot');
  if (!btn) return;

  // Hide entirely only when sync is explicitly disabled
  if (localStorage.getItem('cloud_sync_enabled') === 'false') {
    btn.style.display = 'none';
    return;
  }

  btn.style.display = '';
  if (!dot) return;
  dot.className = 'cloud-sync-dot header-cloud-dot';

  var connected = typeof cloudIsConnected === 'function'
    ? cloudIsConnected(_syncProvider)
    : false;
  var isSimple = localStorage.getItem('cloud_sync_mode') === 'simple';

  if (isSimple) {
    var accountId = localStorage.getItem('cloud_dropbox_account_id');
    if (connected && accountId) {
      dot.classList.add('header-cloud-dot--green');
      btn.title = 'Cloud sync active (Simple mode)';
      btn.setAttribute('aria-label', 'Cloud sync active');
      btn.dataset.syncState = 'green';
    } else if (connected) {
      // Connected but account ID missing — needs re-fetch via reconnect
      dot.classList.add('header-cloud-dot--orange');
      btn.title = 'Cloud sync needs to reconnect to Dropbox';
      btn.setAttribute('aria-label', 'Cloud sync needs to reconnect');
      btn.dataset.syncState = 'orange-simple';
    } else {
      btn.title = 'Set up cloud sync';
      btn.setAttribute('aria-label', 'Set up cloud sync');
      btn.dataset.syncState = 'gray';
    }
    return;
  }

  // Secure mode (original behavior)
  var hasCachedPw = typeof cloudGetCachedPassword === 'function'
    ? !!cloudGetCachedPassword(_syncProvider)
    : false;

  if (hasCachedPw) {
    dot.classList.add('header-cloud-dot--green');
    btn.title = 'Cloud sync active';
    btn.setAttribute('aria-label', 'Cloud sync active');
    btn.dataset.syncState = 'green';
  } else if (connected) {
    dot.classList.add('header-cloud-dot--orange');
    btn.title = 'Cloud sync needs your password';
    btn.setAttribute('aria-label', 'Cloud sync needs your password');
    btn.dataset.syncState = 'orange';
  } else {
    btn.title = 'Set up cloud sync';
    btn.setAttribute('aria-label', 'Set up cloud sync');
    btn.dataset.syncState = 'gray';
  }
}
```

**Step 2: Commit**

```bash
git add js/cloud-sync.js
git commit -m "feat(sync): update header button state logic for Simple mode"
```

---

### Task 7: Add Popover HTML and Mode Selector to `index.html`

**Files:**
- Modify: `index.html`

**Step 1: Wrap the header cloud button in a relative-positioned div and add the popover**

Find the block (around line 425):

```html
        <!-- Cloud sync status button (STAK-264) -->
        <button class="btn theme-btn header-toggle-btn" id="headerCloudSyncBtn"
```

Replace it with the button wrapped in a div, and add the popover as a sibling:

```html
        <!-- Cloud sync status button + inline popover wrapper (STAK-264) -->
        <div style="position:relative;display:inline-flex" id="headerCloudSyncWrapper">
          <button class="btn theme-btn header-toggle-btn" id="headerCloudSyncBtn"
                  title="Cloud sync status" aria-label="Cloud sync status" style="display:none;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
            </svg>
            <span class="cloud-sync-dot header-cloud-dot" id="headerCloudDot"></span>
          </button>
          <!-- Secure mode: inline password popover (never auto-opens) -->
          <div id="cloudSyncHeaderPopover" role="dialog" aria-label="Sync password" style="display:none;position:absolute;top:calc(100% + 6px);right:0;background:var(--card-bg,#fff);border:1px solid var(--border-color,#ddd);border-radius:8px;padding:0.75rem;box-shadow:0 4px 16px rgba(0,0,0,0.18);z-index:999;min-width:240px">
            <div style="font-size:0.8rem;font-weight:600;margin-bottom:0.5rem;color:var(--text-primary)">&#x1F512; Vault Password</div>
            <div style="display:flex;gap:0.4rem">
              <input type="password" id="cloudSyncPopoverInput" placeholder="Enter password"
                     autocomplete="current-password"
                     style="flex:1;font-size:0.85rem;padding:0.3rem 0.5rem;border:1px solid var(--border-color,#ddd);border-radius:4px;background:var(--input-bg,#fff);color:var(--text-primary)">
              <button class="btn success" id="cloudSyncPopoverUnlockBtn" style="font-size:0.8rem;padding:0.3rem 0.6rem">Unlock</button>
            </div>
            <div id="cloudSyncPopoverError" style="color:var(--danger,#e74c3c);font-size:0.75rem;margin-top:0.3rem;display:none"></div>
            <button id="cloudSyncPopoverCancelBtn" style="background:none;border:none;color:var(--text-secondary);font-size:0.75rem;margin-top:0.4rem;cursor:pointer;padding:0">Cancel</button>
          </div>
        </div>
```

**Step 2: Add the Sync Mode selector in Settings → Cloud**

Find the "Auto-Sync Controls" section. After the "Last synced" row div (the one containing `id="cloudAutoSyncLastSync"`, around line 3115), and before the "Sync Now" button div, add the mode selector:

```html
                  <!-- Sync Mode selector (shown only when connected + enabled) -->
                  <div id="cloudSyncModeSection" style="display:none;margin-top:0.6rem;padding:0.5rem 0.6rem;border:1px solid var(--border-color,#ddd);border-radius:6px;background:var(--card-bg-alt,rgba(0,0,0,0.02))">
                    <div style="font-size:0.8rem;font-weight:600;margin-bottom:0.4rem;color:var(--text-primary)">Encryption Mode</div>
                    <label style="display:flex;align-items:flex-start;gap:0.5rem;margin-bottom:0.4rem;cursor:pointer">
                      <input type="radio" name="cloudSyncMode" id="cloudSyncModeSimple" value="simple" style="margin-top:2px" onchange="if(typeof handleSyncModeChange==='function')handleSyncModeChange('simple')">
                      <span>
                        <strong style="font-size:0.8rem">Simple</strong>
                        <span class="settings-subtext" style="display:block;font-size:0.72rem">Your Dropbox account is the key — no extra password needed on any device.</span>
                      </span>
                    </label>
                    <label style="display:flex;align-items:flex-start;gap:0.5rem;cursor:pointer">
                      <input type="radio" name="cloudSyncMode" id="cloudSyncModeSecure" value="secure" style="margin-top:2px" onchange="if(typeof handleSyncModeChange==='function')handleSyncModeChange('secure')">
                      <span>
                        <strong style="font-size:0.8rem">Secure</strong>
                        <span class="settings-subtext" style="display:block;font-size:0.72rem">Encrypt with your own vault password — zero-knowledge from Dropbox.</span>
                      </span>
                    </label>
                    <div id="cloudSyncModeSwitchWarning" style="display:none;margin-top:0.5rem;padding:0.4rem 0.5rem;background:var(--warning-bg,#fff8e6);border:1px solid var(--warning-border,#ffc107);border-radius:4px;font-size:0.75rem;color:var(--text-primary)">
                      &#x26A0;&#xFE0F; <strong>Make a manual backup first.</strong> Old syncs encrypted in the previous mode won't be readable in the new mode.
                      <div style="margin-top:0.4rem;display:flex;gap:0.4rem">
                        <button class="btn warning" id="cloudSyncModeConfirmBtn" style="font-size:0.75rem;padding:0.2rem 0.5rem" onclick="if(typeof confirmSyncModeSwitch==='function')confirmSyncModeSwitch()">Switch Mode</button>
                        <button class="btn" id="cloudSyncModeCancelBtn" style="font-size:0.75rem;padding:0.2rem 0.5rem" onclick="if(typeof cancelSyncModeSwitch==='function')cancelSyncModeSwitch()">Cancel</button>
                      </div>
                    </div>
                  </div>
```

**Step 3: Verify HTML renders correctly**

Open app, go to Settings → Cloud → connect Dropbox → enable Auto-sync.
Expected: Mode selector appears below "Last synced" row with "Simple" and "Secure" radio options.

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat(sync): add header popover and mode selector HTML"
```

---

### Task 8: Update Header Button Event Handler + Popover Logic (`events.js`)

**Files:**
- Modify: `js/events.js`

**Step 1: Replace the header cloud sync button click handler**

Find the existing `headerCloudSyncBtn` click handler (around line 700). Replace its entire `safeAttachListener` block with:

```js
  var headerCloudSyncBtn = safeGetElement('headerCloudSyncBtn');
  if (headerCloudSyncBtn) {
    safeAttachListener(
      headerCloudSyncBtn,
      'click',
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        var state = headerCloudSyncBtn.dataset.syncState;
        var isSimple = localStorage.getItem('cloud_sync_mode') === 'simple';

        if (state === 'orange' && !isSimple) {
          // Secure mode needs password — open inline popover
          _openCloudSyncPopover();
        } else if (state === 'orange-simple' || (state === 'orange' && isSimple)) {
          // Simple mode needs Dropbox reconnect
          if (typeof cloudAuthStart === 'function') cloudAuthStart('dropbox');
        } else if (state === 'green') {
          var lp = typeof syncGetLastPush === 'function' ? syncGetLastPush() : null;
          var msg = lp && lp.timestamp
            ? 'Cloud sync active \u2014 last synced ' + _syncRelativeTimeLocal(lp.timestamp)
            : 'Cloud sync active';
          if (typeof showCloudToast === 'function') showCloudToast(msg, 2500);
        } else {
          // Gray: not configured
          if (typeof showSettingsModal === 'function') showSettingsModal('cloud');
        }
      },
      'Cloud Sync Header Button'
    );
  }

  // Close popover on outside click
  document.addEventListener('mousedown', function (e) {
    var wrapper = safeGetElement('headerCloudSyncWrapper');
    var popover = safeGetElement('cloudSyncHeaderPopover');
    if (popover && popover.style.display !== 'none') {
      if (wrapper && !wrapper.contains(e.target)) {
        popover.style.display = 'none';
      }
    }
  });
```

**Step 2: Add `_openCloudSyncPopover()` and `_syncRelativeTimeLocal()` helpers**

Add these two functions near the bottom of `events.js`, before the last closing line:

```js
/** Open the inline Secure-mode password popover below the header cloud button. */
function _openCloudSyncPopover() {
  var popover = safeGetElement('cloudSyncHeaderPopover');
  var input = safeGetElement('cloudSyncPopoverInput');
  var unlockBtn = safeGetElement('cloudSyncPopoverUnlockBtn');
  var cancelBtn = safeGetElement('cloudSyncPopoverCancelBtn');
  var errorEl = safeGetElement('cloudSyncPopoverError');
  if (!popover) return;

  if (input) input.value = '';
  if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }
  popover.style.display = '';
  if (input) setTimeout(function () { input.focus(); }, 50);

  function cleanup() {
    popover.style.display = 'none';
    if (unlockBtn) unlockBtn.onclick = null;
    if (cancelBtn) cancelBtn.onclick = null;
    if (input) input.onkeydown = null;
  }

  function onUnlock() {
    var pw = input ? input.value : '';
    if (!pw || pw.length < 8) {
      if (errorEl) {
        errorEl.textContent = 'Password must be at least 8 characters.';
        errorEl.style.display = '';
      }
      return;
    }
    cleanup();
    if (typeof cloudCachePassword === 'function') cloudCachePassword('dropbox', pw);
    if (typeof updateCloudSyncHeaderBtn === 'function') updateCloudSyncHeaderBtn();
    setTimeout(function () { if (typeof pushSyncVault === 'function') pushSyncVault(); }, 100);
  }

  if (unlockBtn) unlockBtn.onclick = onUnlock;
  if (cancelBtn) cancelBtn.onclick = cleanup;
  if (input) {
    input.onkeydown = function (e) {
      if (e.key === 'Enter') onUnlock();
      if (e.key === 'Escape') cleanup();
    };
  }
}

/** Format a timestamp relative to now for the header toast (mirrors _syncRelativeTime in cloud-sync.js). */
function _syncRelativeTimeLocal(ts) {
  var diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return 'just now';
  if (diff < 60) return diff + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
  return Math.floor(diff / 3600) + 'h ago';
}
```

**Step 3: Add mode-switch handler functions**

Add these two more functions in `events.js` (they are called from the inline `onchange` in `index.html`):

```js
/** Called when user clicks a sync mode radio — shows warning before applying. */
function handleSyncModeChange(newMode) {
  var currentMode = localStorage.getItem('cloud_sync_mode') || 'secure';
  if (newMode === currentMode) return;

  // Store the pending mode so confirmSyncModeSwitch knows what to apply
  window._pendingSyncMode = newMode;

  var warning = safeGetElement('cloudSyncModeSwitchWarning');
  if (warning) warning.style.display = '';

  // Revert radio to current mode visually until user confirms
  var simpleRadio = safeGetElement('cloudSyncModeSimple');
  var secureRadio = safeGetElement('cloudSyncModeSecure');
  if (simpleRadio) simpleRadio.checked = currentMode === 'simple';
  if (secureRadio) secureRadio.checked = currentMode !== 'simple';
}

/** Applies the pending mode switch after user clicks "Switch Mode". */
function confirmSyncModeSwitch() {
  var mode = window._pendingSyncMode;
  if (!mode) return;
  window._pendingSyncMode = null;

  var warning = safeGetElement('cloudSyncModeSwitchWarning');
  if (warning) warning.style.display = 'none';

  if (typeof setSyncMode === 'function') setSyncMode(mode);
  if (typeof refreshSyncModeUI === 'function') refreshSyncModeUI();
}

/** Cancels a pending mode switch. */
function cancelSyncModeSwitch() {
  window._pendingSyncMode = null;
  var warning = safeGetElement('cloudSyncModeSwitchWarning');
  if (warning) warning.style.display = 'none';
  if (typeof refreshSyncModeUI === 'function') refreshSyncModeUI(); // resets radios
}
```

**Step 4: Verify complete UX flow**

**Scenario A — Secure mode, page reload:**
1. `cloud_sync_enabled` = `'true'`, `cloud_sync_mode` = `'secure'` (or unset), Dropbox connected, no cached pw
2. Reload → orange dot in header, toast after 1s, **no modal**
3. Click orange button → password popover drops down below header button
4. Enter password ≥8 chars, click Unlock → green dot, sync pushes

**Scenario B — Simple mode, page reload:**
1. `cloud_sync_mode` = `'simple'`, account ID stored, Dropbox connected
2. Reload → green dot immediately, no prompts, console shows sync activity

**Scenario C — Mode switch:**
1. Go to Settings → Cloud, both radios visible
2. Click "Simple" → warning appears with "Make a manual backup first"
3. Click "Switch Mode" → mode changes, toast confirms, radios update

**Step 5: Commit**

```bash
git add js/events.js
git commit -m "feat(sync): add header popover, mode-switch handlers in events.js"
```

---

### Task 9: Final QA Checklist

**Manual verification checklist — run all scenarios before calling complete:**

- [ ] Fresh page load, sync disabled: no cloud icon visible in header
- [ ] Fresh page load, sync enabled, Secure mode, no cached pw: orange dot + toast, **zero modals**
- [ ] Click orange dot (Secure): popover opens with password input
- [ ] Enter < 8 chars, click Unlock: error message shown in popover
- [ ] Enter valid password, click Unlock: popover closes, dot turns green, sync push fires
- [ ] Press Escape in popover: popover closes, no action
- [ ] Click outside popover: popover closes
- [ ] Fresh page load, sync enabled, Simple mode, account ID present: green dot, no prompts
- [ ] Simple mode, orange dot (account ID missing): click → triggers Dropbox OAuth
- [ ] Settings → Cloud: mode selector only visible when Dropbox connected AND auto-sync enabled
- [ ] Mode selector shows current mode checked correctly
- [ ] Switching mode → warning shown before applying
- [ ] "Cancel" on warning → radios revert, no mode change
- [ ] "Switch Mode" → mode changes, toast confirms
- [ ] `saveInventory()` no longer triggers modal (inventory edit → save → no modal)
- [ ] "Sync Now" button works in both modes (uses cached/derived key silently)

**Step: Commit notes and close**

```bash
git add .
git commit -m "chore: final QA pass — sync UX overhaul complete"
```

---

## Summary of Changes

| File | What changed |
|---|---|
| `js/constants.js` | `STAKTRAKR_SIMPLE_SALT`, two new `ALLOWED_STORAGE_KEYS`, window export |
| `js/cloud-storage.js` | Fetch + store `cloud_dropbox_account_id` after OAuth; clear on disconnect |
| `js/cloud-sync.js` | `getSyncPasswordSilent()`, `setSyncMode()`, `refreshSyncModeUI()`; `pushSyncVault()` uses silent getter; `initCloudSync()` Simple branch; `updateCloudSyncHeaderBtn()` Simple states |
| `js/events.js` | Header button handler (mode-aware); `_openCloudSyncPopover()`; `handleSyncModeChange()`, `confirmSyncModeSwitch()`, `cancelSyncModeSwitch()` |
| `index.html` | Header button wrapped in `#headerCloudSyncWrapper` + `#cloudSyncHeaderPopover`; `#cloudSyncModeSection` in Settings |

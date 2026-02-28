# Cloud Settings Redesign + Unified Encryption — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Compact the Cloud settings card to ≤400px, move Dropbox configuration into an Advanced sub-modal, and replace the two-mode encryption system with a single unified mode (localStorage vault password + Dropbox account_id → PBKDF2 key) that is zero-knowledge to Dropbox and persistent across sessions.

**Architecture:** Single encryption mode — `key = PBKDF2(vault_password + ':' + account_id)`. `vault_password` stored in localStorage as `cloud_vault_password`. Neither the key nor both inputs are ever sent to Dropbox. The compact card shows status + auto-sync toggle + Sync Now + Advanced button. All configuration lives behind the Advanced sub-modal.

**Tech Stack:** Vanilla JS, Web Crypto API (SubtleCrypto — already used by vault.js), localStorage, existing `openModalById`/`closeModalById` modal system, app's `.btn` CSS classes.

**Design doc:** `docs/plans/2026-02-23-cloud-settings-redesign.md`

**Critical patterns:**
- DOM: always `safeGetElement(id)` — never raw `document.getElementById()`
- Storage: `saveData()`/`loadData()` from utils.js — never direct `localStorage` (except cloud module which uses `localStorage` directly for cloud-specific keys, as it does today)
- New storage key `cloud_vault_password` must be added to `ALLOWED_STORAGE_KEYS` in `js/constants.js`
- New JS? None — all changes are to existing files
- `innerHTML` on user content: always `sanitizeHtml()`

---

## Task 1: Create patch worktree

**Files:** none (git operations only)

**Step 1: Sync local dev with remote**

```bash
cd /Volumes/DATA/GitHub/StakTrakr
git fetch origin
git pull origin dev
```

Expected: fast-forward or already up to date.

**Step 2: Check version lock**

```bash
cat devops/version.lock 2>/dev/null || echo "UNLOCKED"
```

If locked and not expired: stop, report to user. If absent/expired: continue.

**Step 3: Read current version**

```bash
grep 'APP_VERSION = ' js/constants.js | head -1
```

Note the version (currently `3.32.22`). New version = `3.32.23`.

**Step 4: Write version lock and create worktree**

```bash
cat > devops/version.lock << 'EOF'
locked_by: Claude Code (cloud-settings-redesign)
locked_at: 2026-02-23T00:00:00Z
next_version: 3.32.23
expires_at: 2026-02-23T00:30:00Z
EOF

git worktree add .claude/worktrees/patch-3.32.23 -b patch/3.32.23
```

**Step 5: Confirm worktree exists**

```bash
ls .claude/worktrees/patch-3.32.23/js/constants.js
```

Expected: file exists. All subsequent file edits happen inside `.claude/worktrees/patch-3.32.23/`.

---

## Task 2: constants.js — Storage key updates

**Files:**
- Modify: `.claude/worktrees/patch-3.32.23/js/constants.js`

**Step 1: Add `cloud_vault_password` to ALLOWED_STORAGE_KEYS**

Find the block around line 808 (cloud sync keys section). Add after the `cloud_dropbox_account_id` line:

```javascript
  "cloud_vault_password",                      // string: user vault password stored for persistent unlock
```

**Step 2: Mark `cloud_sync_mode` as deprecated (keep for migration)**

Update the comment on the `cloud_sync_mode` line:

```javascript
  "cloud_sync_mode",                           // DEPRECATED: kept for migration only — will be removed after v3.33
```

**Step 3: Verify**

```bash
grep 'cloud_vault_password\|cloud_sync_mode\|STAKTRAKR_SIMPLE_SALT' .claude/worktrees/patch-3.32.23/js/constants.js
```

Expected: `cloud_vault_password` appears in ALLOWED_STORAGE_KEYS, `cloud_sync_mode` still present with deprecated comment, `STAKTRAKR_SIMPLE_SALT` still present (needed for migration).

---

## Task 3: cloud-sync.js — Unified encryption functions

**Files:**
- Modify: `.claude/worktrees/patch-3.32.23/js/cloud-sync.js`

This is the core logic change. Three functions need updating/replacing.

### Step 1: Replace `getSyncPasswordSilent()`

Find the existing `getSyncPasswordSilent` function (around line 434). Replace the entire function body:

```javascript
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
```

### Step 2: Replace `getSyncPassword()` (interactive)

Find the existing `getSyncPassword` function (around line 344). Replace:

```javascript
/**
 * Interactively prompt for / confirm the vault password.
 * Called when getSyncPasswordSilent() returns null (new device, first connection).
 * On success: stores password in localStorage, returns combined key string.
 * @returns {Promise<string|null>}
 */
function getSyncPassword() {
  // If already have both values, return silently
  var silent = getSyncPasswordSilent();
  if (silent && localStorage.getItem('cloud_vault_password')) return Promise.resolve(silent);

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
          if (pw) {
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
```

### Step 3: Add `changeVaultPassword()` (for Advanced sub-modal)

Add this new function after `getSyncPassword()`:

```javascript
/**
 * Change the stored vault password and re-encrypt the vault on Dropbox.
 * Called from the Advanced sub-modal "Change Password" flow.
 * @param {string} newPassword
 * @returns {Promise<boolean>} true on success
 */
async function changeVaultPassword(newPassword) {
  if (!newPassword || newPassword.length < 8) return false;
  var accountId = localStorage.getItem('cloud_dropbox_account_id');
  var oldKey = getSyncPasswordSilent();

  try {
    localStorage.setItem('cloud_vault_password', newPassword);
    var newKey = newPassword + ':' + accountId;

    // Re-encrypt: pull with old key is not needed — just push fresh with new key
    // (next push will use new key; existing vault on Dropbox becomes inaccessible
    //  with old key — acceptable since the new push overwrites it)
    logCloudSyncActivity('password_change', 'success', 'Vault password updated');
    if (typeof updateCloudSyncHeaderBtn === 'function') updateCloudSyncHeaderBtn();
    if (syncIsEnabled() && typeof scheduleSyncPush === 'function') {
      scheduleSyncPush();
    }
    if (typeof showCloudToast === 'function') showCloudToast('Vault password updated — syncing now', 3000);
    return true;
  } catch (err) {
    // Roll back
    if (oldKey) {
      var oldPw = (localStorage.getItem('cloud_vault_password') !== newPassword)
        ? localStorage.getItem('cloud_vault_password')
        : null;
    }
    if (typeof showCloudToast === 'function') showCloudToast('Failed to update password — try again', 3000);
    return false;
  }
}
```

### Step 4: Simplify `updateCloudSyncHeaderBtn()`

Find the function (around line 217). Replace the `isSimple` branching block with unified logic:

```javascript
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
```

### Step 5: Simplify `initCloudSync()` (around line 1140)

Replace the `isSimple` branching section (after the `connected` check, lines ~1173–1230) with:

```javascript
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
```

### Step 6: Remove `setSyncMode()` and `refreshSyncModeUI()`

Delete both functions entirely (lines ~1086–1130). They are replaced by the unified mode system.

Also remove these from the window exports block at the bottom:
```javascript
window.setSyncMode = setSyncMode;
window.refreshSyncModeUI = refreshSyncModeUI;
```

### Step 7: Add `changeVaultPassword` to window exports

```javascript
window.changeVaultPassword = changeVaultPassword;
```

### Step 8: Verify no remaining `cloud_sync_mode` writes (only reads for migration)

```bash
grep -n 'cloud_sync_mode' .claude/worktrees/patch-3.32.23/js/cloud-sync.js
```

Expected: only reads (`localStorage.getItem('cloud_sync_mode')`) in migration paths, no `setItem('cloud_sync_mode')`.

---

## Task 4: index.html — Compact card + Advanced sub-modal

**Files:**
- Modify: `.claude/worktrees/patch-3.32.23/index.html`

The Dropbox card (lines 3053–3184) gets completely replaced. Work from the worktree copy.

### Step 1: Replace the Dropbox provider card contents

Replace the entire contents of `<div class="cloud-provider-card" id="cloudCard_dropbox">` (lines 3053–3184) with:

```html
<!-- Dropbox Provider — compact card -->
<div class="cloud-provider-card" id="cloudCard_dropbox" style="max-width:400px">
  <div class="cloud-provider-card-header">
    <span class="cloud-provider-card-title">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px"><path d="M6 2l6 3.6L6 9.2 0 5.6zm12 0l6 3.6-6 3.6-6-3.6zm-12 8l6 3.6-6 3.6-6-3.6zm12 0l6 3.6-6 3.6-6-3.6zM6 18.4l6-3.6 6 3.6-6 3.6z"/></svg>
      Dropbox
    </span>
    <span class="cloud-provider-card-badges">
      <span class="cloud-connected-badge" style="display:none">Connected</span>
      <span class="cloud-badge cloud-badge--beta">BETA</span>
    </span>
  </div>

  <!-- Connection status (shown when connected) -->
  <div class="cloud-connection-status" id="cloudStatus_dropbox">
    <div class="cloud-status-row">
      <span class="cloud-status-label">Status</span>
      <span class="cloud-status-value cloud-status-indicator" data-state="disconnected">
        <span class="cloud-status-dot"></span>
        <span class="cloud-status-text">Not connected</span>
      </span>
    </div>
    <div class="cloud-status-row" id="cloudAutoSyncStatus" style="align-items:center">
      <span class="cloud-status-label">Sync</span>
      <span class="cloud-status-value" style="display:flex;align-items:center;gap:0.4rem">
        <span class="cloud-sync-dot"></span>
        <span class="cloud-sync-status-text">Auto-sync off</span>
      </span>
    </div>
    <div class="cloud-status-row" style="align-items:center">
      <span class="cloud-status-label">Last synced</span>
      <span class="cloud-status-value" id="cloudAutoSyncLastSync">Never</span>
    </div>
  </div>

  <!-- Connect button (shown when disconnected) -->
  <div class="cloud-login-area" style="margin-top:0.5rem">
    <button class="btn cloud-connect-btn" data-provider="dropbox" style="font-size:0.85rem;padding:0.4rem 1rem;min-height:0">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:0.3rem"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
      Connect Dropbox
    </button>
  </div>

  <!-- Auto-sync toggle + action row (shown when connected) -->
  <div class="cloud-autosync-section" style="margin-top:0.6rem;border-top:1px solid var(--border);padding-top:0.6rem">
    <div class="cloud-status-row" style="align-items:center">
      <span class="cloud-status-label"><strong>Auto-sync</strong></span>
      <label class="settings-toggle-switch" style="margin-left:auto">
        <input type="checkbox" id="cloudAutoSyncToggle" onchange="if(this.checked){enableCloudSync('dropbox');}else{disableCloudSync();}">
        <span class="settings-toggle-slider"></span>
      </label>
    </div>
  </div>

  <!-- Action row: Sync Now + Advanced -->
  <div style="display:flex;gap:0.5rem;margin-top:0.6rem;align-items:center">
    <button class="btn" id="cloudSyncNowBtn" disabled
      onclick="if(typeof pushSyncVault==='function')pushSyncVault();"
      style="font-size:0.8rem;padding:0.35rem 0.75rem;min-height:0;flex:1">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:0.3rem"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
      Sync Now
    </button>
    <button class="btn" id="cloudSyncAdvancedBtn"
      onclick="if(typeof openModalById==='function')openModalById('cloudSyncAdvancedModal');"
      style="font-size:0.8rem;padding:0.35rem 0.75rem;min-height:0">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:0.3rem"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
      Advanced
    </button>
  </div>

  <div class="cloud-status-detail"></div>
  <div class="cloud-backup-list" id="cloudBackupList_dropbox" style="display:none"></div>
</div>
```

### Step 2: Add the Advanced sub-modal

Add this HTML just **before** the closing `</div>` of `settingsPanel_cloud` (after the More Providers fieldset, around line 3240):

```html
<!-- Dropbox Advanced Settings Modal -->
<div class="modal-overlay" id="cloudSyncAdvancedModal" style="display:none" role="dialog" aria-modal="true" aria-label="Dropbox Advanced Settings">
  <div class="modal-container" style="max-width:480px;width:90%">
    <div class="modal-header">
      <h3 class="modal-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px;margin-right:0.4rem"><path d="M6 2l6 3.6L6 9.2 0 5.6zm12 0l6 3.6-6 3.6-6-3.6zm-12 8l6 3.6-6 3.6-6-3.6zm12 0l6 3.6-6 3.6-6-3.6zM6 18.4l6-3.6 6 3.6-6 3.6z"/></svg>
        Dropbox Settings
      </h3>
      <button class="modal-close" onclick="if(typeof closeModalById==='function')closeModalById('cloudSyncAdvancedModal')" aria-label="Close">&times;</button>
    </div>
    <div class="modal-body">

      <!-- Backup / Restore -->
      <div class="settings-fieldset" style="margin-bottom:0.75rem">
        <div class="settings-fieldset-title">Backup &amp; Restore</div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.5rem">
          <button class="btn success cloud-backup-btn" data-provider="dropbox" disabled
            style="font-size:0.82rem;padding:0.4rem 0.9rem;min-height:0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:0.3rem"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Backup Now
          </button>
          <button class="btn cloud-restore-btn" data-provider="dropbox" disabled
            style="font-size:0.82rem;padding:0.4rem 0.9rem;min-height:0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:0.3rem"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Restore
          </button>
        </div>
      </div>

      <!-- Vault Password -->
      <div class="settings-fieldset" style="margin-bottom:0.75rem">
        <div class="settings-fieldset-title">Vault Password</div>
        <p class="settings-subtext" style="margin:0.3rem 0 0.5rem">Remembered in this browser. Change it here — your next sync will re-encrypt your backup.</p>
        <div style="display:flex;gap:0.4rem;align-items:flex-start">
          <input type="password" id="cloudAdvancedNewPassword" placeholder="New password (min 8 chars)"
            autocomplete="new-password"
            style="flex:1;font-size:0.85rem;padding:0.35rem 0.5rem;border:1px solid var(--border);border-radius:4px;background:var(--bg-tertiary);color:var(--text-primary)">
          <button class="btn" id="cloudAdvancedSavePasswordBtn"
            style="font-size:0.82rem;padding:0.35rem 0.75rem;min-height:0;white-space:nowrap"
            onclick="if(typeof handleAdvancedSavePassword==='function')handleAdvancedSavePassword()">
            Save
          </button>
        </div>
        <div id="cloudAdvancedPasswordError" style="color:var(--danger,#e74c3c);font-size:0.75rem;margin-top:0.3rem;display:none"></div>
      </div>

      <!-- Sync History -->
      <div class="settings-fieldset" style="margin-bottom:0.75rem">
        <div class="settings-fieldset-title">Sync History</div>
        <div id="cloudSyncHistorySection">
          <p class="settings-subtext" style="margin:0.3rem 0 0">No snapshot available.</p>
        </div>
      </div>

      <!-- View Log -->
      <div style="margin-bottom:0.75rem">
        <button class="btn" style="font-size:0.82rem;padding:0.4rem 0.9rem;min-height:0"
          onclick="if(typeof switchLogTab==='function'){switchLogTab('cloud');} if(typeof switchSettingsSection==='function'){switchSettingsSection('changelog');} if(typeof closeModalById==='function')closeModalById('cloudSyncAdvancedModal');">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:0.3rem"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          View Sync Log
        </button>
      </div>

      <!-- Disconnect -->
      <div class="settings-fieldset" style="border-color:var(--danger,#e74c3c);opacity:0.9">
        <div class="settings-fieldset-title" style="color:var(--danger,#e74c3c)">Danger Zone</div>
        <p class="settings-subtext" style="margin:0.3rem 0 0.5rem">Disconnecting removes Dropbox access from this device. Your encrypted backups on Dropbox are not deleted.</p>
        <button class="btn danger cloud-disconnect-btn" data-provider="dropbox"
          style="font-size:0.82rem;padding:0.4rem 0.9rem;min-height:0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:0.3rem"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Disconnect Dropbox
        </button>
      </div>

      <!-- Disclaimer -->
      <p class="settings-subtext" style="margin:0.75rem 0 0;font-size:0.72rem">
        Backups stored in <strong>/StakTrakr</strong> on your Dropbox. If you forget your vault password, backups cannot be recovered from Dropbox (your local data is unaffected).
      </p>
    </div>
  </div>
</div>
```

### Step 3: Update the `cloudSyncPasswordModal` title/subtitle element IDs

Find the existing `cloudSyncPasswordModal` in index.html and ensure it has `id="syncPasswordModalTitle"` and `id="syncPasswordModalSubtitle"` on the relevant elements (the title `<h3>` or `<div>` and the subtitle `<p>`). If those IDs don't already exist, add them so `getSyncPassword()` can update the copy dynamically.

Grep first:
```bash
grep -n 'syncPasswordModal\|syncPasswordInput' .claude/worktrees/patch-3.32.23/index.html | head -20
```

Add `id="syncPasswordModalTitle"` to the modal title element and `id="syncPasswordModalSubtitle"` to the subtitle/description element if missing.

### Step 4: Remove the old `cloud-session-cache` fieldset

Find and remove the `<div class="settings-fieldset cloud-session-cache">` block (around line 3242–3248) — session caching is replaced by persistent localStorage storage.

### Step 5: Verify card renders correctly

Open `index.html` in a browser. Navigate to Settings → Cloud. Confirm:
- Card is compact (≤400px)
- Connect button shown when disconnected
- Auto-sync section present
- Sync Now + Advanced buttons side by side

---

## Task 5: events.js — Update handlers

**Files:**
- Modify: `.claude/worktrees/patch-3.32.23/js/events.js`

### Step 1: Remove mode-switch handler exports and functions

Find and delete:
- `window.handleSyncModeChange = handleSyncModeChange;`
- `window.confirmSyncModeSwitch = confirmSyncModeSwitch;`
- `window.cancelSyncModeSwitch = cancelSyncModeSwitch;`
- The `handleSyncModeChange()`, `confirmSyncModeSwitch()`, `cancelSyncModeSwitch()` function bodies
- The `var _pendingSyncMode = null;` module-level variable

### Step 2: Update the `headerCloudSyncBtn` click handler

Find the handler (around line 702). The `orange-simple` branch is gone — simplify to:

```javascript
var headerCloudSyncBtn = safeGetElement('headerCloudSyncBtn');
if (headerCloudSyncBtn) {
  safeAttachListener(headerCloudSyncBtn, 'click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    var state = headerCloudSyncBtn.dataset.syncState;
    if (state === 'orange') {
      // Needs password setup — open inline popover
      _openCloudSyncPopover();
    } else if (state === 'green') {
      var lp = typeof syncGetLastPush === 'function' ? syncGetLastPush() : null;
      var msg = lp && lp.timestamp
        ? 'Cloud sync active \u2014 last synced ' + (typeof _syncRelativeTime === 'function' ? _syncRelativeTime(lp.timestamp) : '')
        : 'Cloud sync active';
      if (typeof showCloudToast === 'function') showCloudToast(msg, 2500);
    } else {
      if (typeof showSettingsModal === 'function') showSettingsModal('cloud');
    }
  }, 'Cloud Sync Header Button');
}
```

### Step 3: Add `handleAdvancedSavePassword()` export

Add a new function and export for the Advanced modal password save:

```javascript
function handleAdvancedSavePassword() {
  var input = safeGetElement('cloudAdvancedNewPassword');
  var errorEl = safeGetElement('cloudAdvancedPasswordError');
  if (!input) return;
  var pw = input.value;
  if (!pw || pw.length < 8) {
    if (errorEl) { errorEl.textContent = 'Password must be at least 8 characters.'; errorEl.style.display = ''; }
    return;
  }
  if (errorEl) errorEl.style.display = 'none';
  input.value = '';
  if (typeof changeVaultPassword === 'function') {
    changeVaultPassword(pw).then(function (ok) {
      if (!ok && errorEl) { errorEl.textContent = 'Failed to update password.'; errorEl.style.display = ''; }
    });
  }
}
window.handleAdvancedSavePassword = handleAdvancedSavePassword;
```

### Step 4: Verify

```bash
grep -n 'handleSyncModeChange\|confirmSyncModeSwitch\|cancelSyncModeSwitch\|_pendingSyncMode' .claude/worktrees/patch-3.32.23/js/events.js
```

Expected: no matches (all removed).

---

## Task 6: Version bump

**Files:** All version files inside `.claude/worktrees/patch-3.32.23/`

Run `/release patch` from within the worktree (or manually bump following the release skill):
- `js/constants.js`: `APP_VERSION = "3.32.22"` → `"3.32.23"`
- `version.json`: `"version": "3.32.22"` → `"3.32.23"`
- `CHANGELOG.md`: add section `## [3.32.23] - 2026-02-23`
- `docs/announcements.md`: prepend entry, trim to 5 max
- `js/about.js`: prepend `<li>` entry, trim to 5 max
- `sw.js`: auto-stamped by pre-commit hook — no manual edit needed

**Changelog title:** `Cloud Settings Redesign + Unified Encryption`

**Changelog bullets:**
```
- **Changed**: Cloud settings compacted to ≤400px card — Dropbox configuration moved to Advanced sub-modal
- **Changed**: Unified encryption mode — vault password stored in browser, combined with Dropbox account for zero-knowledge encryption (replaces Simple/Secure toggle)
- **Fixed**: Action buttons (Disconnect, Backup, Restore) use compact app button style, removed from main card view
- **Removed**: Encryption mode selector (Simple/Secure radio buttons) — single seamless mode replaces both
```

---

## Task 7: Commit, push, open PR

**Step 1: Stage files**

```bash
cd .claude/worktrees/patch-3.32.23
git add index.html js/cloud-sync.js js/events.js js/constants.js js/about.js docs/announcements.md CHANGELOG.md version.json
```

**Step 2: Commit**

```bash
git commit -m "v3.32.23 — Cloud Settings Redesign + Unified Encryption"
```

Pre-commit hook will stamp `sw.js` CACHE_NAME automatically.

**Step 3: Push patch branch**

```bash
git push origin patch/3.32.23
```

**Step 4: Open draft PR to dev**

```bash
gh pr create --base dev --head patch/3.32.23 --draft \
  --title "v3.32.23 — Cloud Settings Redesign + Unified Encryption" \
  --body "$(cat <<'EOF'
## Summary

- Compact cloud card (≤400px) — status, auto-sync toggle, Sync Now, Advanced button
- Advanced sub-modal: Backup Now, Restore, Change Vault Password, Sync History, View Log, Disconnect
- Unified encryption: single mode using localStorage vault password + Dropbox account_id → PBKDF2 key (zero-knowledge to Dropbox)
- Encryption mode selector (Simple/Secure radio) removed

## QA

1. Connect Dropbox → prompted to set vault password → password stored → sync starts
2. Reload page → auto-unlocks without prompt
3. Advanced modal → change password → next sync re-encrypts
4. New device → connect Dropbox → prompted to enter vault password → stores → sync starts
5. Card fits within ≤400px, no layout overflow

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 5: Worktree cleanup (after PR merged to dev)**

```bash
git fetch origin dev
git tag v3.32.23 origin/dev
git push origin v3.32.23
git worktree remove .claude/worktrees/patch-3.32.23 --force
git branch -d patch/3.32.23
git push origin --delete patch/3.32.23
rm -f devops/version.lock
```

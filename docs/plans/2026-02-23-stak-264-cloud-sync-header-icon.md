# STAK-264: Cloud Sync Header Icon Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the jarring on-load vault password modal with an ambient header icon (gray/orange/green) that shows cloud sync status and serves as the deliberate entry point for re-entering a password.

**Architecture:** Add a `#headerCloudSyncBtn` button to `index.html` between the About and Settings buttons. Add `updateCloudSyncHeaderBtn()` to `cloud-sync.js` and call it at every existing `updateSyncStatusIndicator()` call site. Modify `initCloudSync()` to suppress the on-load push (and its implicit password modal) when no cached password exists, instead showing a brief toast.

**Tech Stack:** Vanilla JS, localStorage/sessionStorage, existing `showCloudToast()`, existing `openModalById()` / `showSettingsModal()`, existing `cloud-sync-dot` CSS color tokens.

---

## Background: Key APIs

- **`syncIsEnabled()`** — returns `true` if `localStorage.getItem('cloud_sync_enabled') === 'true'`
- **`cloudIsConnected(provider)`** — returns `true` if an OAuth token exists for the provider (`cloud-storage.js:259`)
- **`cloudGetCachedPassword(provider)`** — returns the sessionStorage-cached password or `null` (`cloud-storage.js:1031`)
- **`showCloudToast(message, durationMs)`** — shows a self-dismissing toast (`cloud-sync.js:1115`)
- **`showSettingsModal(section)`** — opens Settings modal to a named section, e.g. `'cloud'` (`settings.js:8`)
- **`openModalById(id)`** / **`closeModalById(id)`** — global modal manager
- **`updateSyncStatusIndicator(state, detail)`** — updates the settings-panel dot; called at 10 sites in `cloud-sync.js`
- **`_syncProvider`** — module-level var holding the active provider string (e.g. `'dropbox'`)

## CSS tokens already in `css/styles.css`

- `.cloud-sync-dot--ok` → green (`--success`)
- `.cloud-sync-dot--error` → red (`--danger`)
- `.cloud-sync-dot--syncing` → blue pulse (`--info`)
- Gray (default `.cloud-sync-dot`) → `--text-secondary`
- Orange: use `var(--warning, #f59e0b)` — same pattern, no new token needed

---

## Task 1: Add `#headerCloudSyncBtn` to `index.html`

**Files:**
- Modify: `index.html` (around line 425 — between `#aboutBtn` and `#settingsBtn`)

**Step 1: Insert the button HTML**

In `index.html`, find this block (line ~425):
```html
        <button class="btn theme-btn" id="aboutBtn" title="About" aria-label="About">
```

Insert the following **immediately before** that `#aboutBtn` button:

```html
        <!-- Cloud sync status button (STAK-264) -->
        <button class="btn theme-btn header-toggle-btn" id="headerCloudSyncBtn"
                title="Cloud sync" aria-label="Cloud sync status" style="display:none; position:relative;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
          </svg>
          <span class="cloud-sync-dot header-cloud-dot" id="headerCloudDot"></span>
        </button>
```

**Step 2: Verify HTML structure**

Open `index.html` and confirm the button order in `.app-header-actions` is now:
Theme → Currency → Market → Trend → SyncSpot → **CloudSync** → About → Settings

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat(STAK-264): add #headerCloudSyncBtn HTML between About and Settings"
```

---

## Task 2: Add CSS for the header dot overlay

**Files:**
- Modify: `css/styles.css` (after the `.cloud-sync-dot--syncing` block, around line 3044)

**Step 1: Add the orange state + header dot positioning**

Find the end of the cloud sync dot block in `css/styles.css` (after line 3044 `}`). Add immediately after:

```css
/* Header cloud sync icon dot overlay (STAK-264) */
.header-cloud-dot {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: 1.5px solid var(--bg-primary, #fff);
  background: var(--text-secondary, #94a3b8);
  transition: background 0.2s, box-shadow 0.2s;
}
.header-cloud-dot--green {
  background: var(--success, #198754);
  box-shadow: 0 0 4px var(--success, #198754);
}
.header-cloud-dot--orange {
  background: var(--warning, #f59e0b);
  box-shadow: 0 0 4px var(--warning, #f59e0b);
}
```

**Step 2: Verify visually (skip for now — will verify after Task 3 wires the JS)**

**Step 3: Commit**

```bash
git add css/styles.css
git commit -m "feat(STAK-264): add header cloud dot CSS (gray/orange/green states)"
```

---

## Task 3: Add `updateCloudSyncHeaderBtn()` to `cloud-sync.js`

**Files:**
- Modify: `js/cloud-sync.js` (add new function after `updateSyncStatusIndicator()`, around line 207)

**Step 1: Add the function**

In `js/cloud-sync.js`, find the closing `}` of `updateSyncStatusIndicator()` (line ~207). Insert immediately after:

```javascript
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
```

**Step 2: Expose globally** (at the bottom of `cloud-sync.js` near the other `window.*` assignments, around line 1054):

```javascript
window.updateCloudSyncHeaderBtn = updateCloudSyncHeaderBtn;
```

**Step 3: Call it inside `updateSyncStatusIndicator()`**

At the very end of `updateSyncStatusIndicator()` (before its closing `}`), add:

```javascript
  // Keep header icon in sync
  updateCloudSyncHeaderBtn();
```

> **Note:** This single hook propagates every state change automatically — no need to manually call it elsewhere.

**Step 4: Commit**

```bash
git add js/cloud-sync.js
git commit -m "feat(STAK-264): add updateCloudSyncHeaderBtn(), hook into updateSyncStatusIndicator()"
```

---

## Task 4: Wire click handler in `events.js`

**Files:**
- Modify: `js/events.js` (find the About Button listener block, around line 699)

**Step 1: Add the listener**

In `js/events.js`, find the `// About Button` listener block (around line 699). Add the following **immediately before** it:

```javascript
  // Cloud sync header icon button (STAK-264)
  var headerCloudSyncBtn = safeGetElement('headerCloudSyncBtn');
  if (headerCloudSyncBtn) {
    safeAttachListener(
      headerCloudSyncBtn,
      'click',
      function (e) {
        e.preventDefault();
        var state = headerCloudSyncBtn.dataset.syncState;
        if (state === 'orange') {
          // Needs password: open the password modal, then push on confirm
          if (typeof openModalById === 'function') {
            openModalById('cloudSyncPasswordModal');
          }
        } else if (state === 'green') {
          // Already synced: show last-synced toast
          var lp = typeof syncGetLastPush === 'function' ? syncGetLastPush() : null;
          var msg = lp && lp.timestamp
            ? 'Cloud sync active — last synced ' + (typeof _syncRelativeTime === 'function' ? _syncRelativeTime(lp.timestamp) : 'recently')
            : 'Cloud sync active';
          if (typeof showCloudToast === 'function') showCloudToast(msg, 2500);
        } else {
          // Gray: not configured — open cloud settings
          if (typeof showSettingsModal === 'function') showSettingsModal('cloud');
        }
      },
      'Cloud Sync Header Button'
    );
  }
```

> **Important:** `_syncRelativeTime` is a private function in `cloud-sync.js`. If calling it from `events.js` causes a reference error, replace it with a simple fallback: `'recently'`. The green toast is cosmetic — don't let it break.

**Step 2: Commit**

```bash
git add js/events.js
git commit -m "feat(STAK-264): wire headerCloudSyncBtn click handler (gray/orange/green)"
```

---

## Task 5: Suppress on-load password modal, show toast instead

**Files:**
- Modify: `js/cloud-sync.js` — `initCloudSync()` function (around line 989)

**Step 1: Modify `initCloudSync()`**

Find `initCloudSync()` (line ~989). The current startup path is:

```javascript
  if (!connected) {
    debugLog('[CloudSync] Auto-sync enabled but not connected to', _syncProvider);
    return;
  }

  debugLog('[CloudSync] Resuming auto-sync from previous session');
  startSyncPoller();

  // Poll immediately on startup to catch any changes while app was closed
  setTimeout(function () { pollForRemoteChanges(); }, 3000);
```

Replace the block from `debugLog('[CloudSync] Resuming auto-sync...')` onward with:

```javascript
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
```

**Step 2: Verify `pollForRemoteChanges()` / `pushSyncVault()` already guards missing password**

Confirm `pushSyncVault()` (line ~378) already returns early when `getSyncPassword()` resolves null (line ~400):
```javascript
  if (!password) {
    debugLog('[CloudSync] No password — push skipped');
    return;
  }
```
It does — so the poller running without a password is safe. No extra guard needed.

**Step 3: Commit**

```bash
git add js/cloud-sync.js
git commit -m "feat(STAK-264): suppress on-load password modal; show orange icon + toast instead"
```

---

## Task 6: Trigger push after password entered via header icon

When the user clicks the orange header icon, `cloudSyncPasswordModal` opens. On confirm, the existing modal logic caches the password and resolves. But we need to also trigger a push immediately after.

**Files:**
- Modify: `js/cloud-sync.js` — `getSyncPassword()` confirm handler (around line 318)

**Step 1: Find the confirm handler in `getSyncPassword()`**

Around line 318-330 in `cloud-sync.js`, the confirm button handler does:
```javascript
      if (typeof cloudCachePassword === 'function') cloudCachePassword(_syncProvider, pw);
      resolve(pw);
```

**Step 2: Add a post-confirm header update**

After `cloudCachePassword(...)` and before `resolve(pw)`, add:

```javascript
      // Update header icon to green now that password is cached
      if (typeof updateCloudSyncHeaderBtn === 'function') updateCloudSyncHeaderBtn();
```

> This ensures the icon turns green the moment the user confirms their password — before the push even completes — giving instant feedback.

**Step 3: Verify the push fires**

When the orange icon is clicked → modal opens → user confirms password → `getSyncPassword()` resolves → the **caller** (`pushSyncVault()`) receives the password and proceeds with the upload.

Trace the call chain to confirm:
- `events.js` click handler → `openModalById('cloudSyncPasswordModal')`
- BUT: `openModalById` just shows the modal. It does NOT call `pushSyncVault()`.

The modal confirm button currently only resolves the Promise inside `getSyncPassword()`. Since we're opening the modal directly (not via `pushSyncVault()`), we need to also trigger a push on confirm.

**Step 4: Add push trigger to the orange-icon confirm path**

In the same confirm handler block in `getSyncPassword()` (around line 318), after `updateCloudSyncHeaderBtn()`:

```javascript
      // If opened from the header icon (not from an in-flight push), trigger a push now
      if (typeof pushSyncVault === 'function') {
        setTimeout(function () { pushSyncVault(); }, 100);
      }
```

> The `setTimeout` gives the modal time to close cleanly before the push starts.

**Step 5: Commit**

```bash
git add js/cloud-sync.js
git commit -m "feat(STAK-264): update header icon to green + trigger push on password confirm"
```

---

## Task 7: Manual verification

Open the app in a browser with cloud sync enabled. Clear sessionStorage first:

```javascript
// In browser console — clears cached password to simulate fresh load
sessionStorage.removeItem('cloud_vault_pw_cache');
location.reload();
```

**Verify each scenario from the design:**

| # | Scenario | Expected result |
|---|---|---|
| 1 | Sync disabled (`cloud_sync_enabled=false`) | `#headerCloudSyncBtn` has `display:none` |
| 2 | Fresh load, sync enabled, no cached pw | Icon visible + orange dot + toast appears after ~1s |
| 3 | Click orange icon → enter password → confirm | Icon turns green, push fires (check Network tab for Dropbox upload) |
| 4 | Click orange icon → cancel | Icon stays orange, no push |
| 5 | Wait for idle timeout to clear password | Icon transitions green → orange (check with short timeout: set to 1min in settings) |
| 6 | Click green icon | Toast shows "Cloud sync active — last synced X ago" |
| 7 | Click gray icon (connected=false) | Settings modal opens to Cloud tab |
| 8 | Toggle sync off in settings | Button immediately hides |
| 9 | Toggle sync on again | Button reappears in correct state |

**Step 1: Run through checklist above, fix any issues found**

**Step 2: Final commit if any fixes applied, then proceed to release**

```bash
git add -p  # stage only what changed
git commit -m "fix(STAK-264): <describe fix>"
```

---

## Task 8: Release patch

Once all scenarios pass, run:

```
/release patch
```

This claims the next version lock (after STAK-270's `3.32.17` is released), creates the worktree, bumps the version, and opens a draft PR.

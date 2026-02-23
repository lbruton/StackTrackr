# Sync UX Overhaul + Simple Mode — Design

**Date:** 2026-02-23
**Status:** Approved
**Approach:** B — UX Fix + Simple Mode

---

## Problem

Cloud sync is unusable in its current state:

1. The sync password modal auto-opens on every page load when no cached password exists.
2. Users must re-enter their vault password each session — high friction for a background
   sync feature.
3. The poller can trigger a "Sync Update Available" modal within 3 seconds of load,
   chaining to the password modal on Accept.

---

## Solution Overview

- Add two sync modes: **Simple** (Dropbox account ID as key) and **Secure** (user vault
  password, existing behavior).
- **Eliminate all auto-opening modals** on page load. Toast + colored header dot are the
  only passive prompts.
- Replace the password modal (when triggered by header button in Secure mode) with a
  compact inline popover.
- Warn users to make a manual backup before switching modes.

---

## Sync Modes

Stored in `localStorage` key `cloud_sync_mode` ("simple" | "secure").

| | Simple | Secure |
|---|---|---|
| Encryption key | Derived from Dropbox account ID | User-defined vault password |
| Session friction | None after OAuth connect | Must enter password each session |
| Zero-knowledge | No | Yes |
| Multi-device | Automatic | Same password on each device |

Mode selector is shown in Settings → Cloud → Auto-Sync section, only when Dropbox is
connected. Switching modes shows a blocking warning:

> **Make a manual backup first.** Backups encrypted in your old mode cannot be decrypted
> in the new mode. Once you switch, new syncs will use the new mode.

After the user confirms, sync is re-initialized in the new mode.

---

## Key Derivation — Simple Mode

1. After `cloudExchangeCode()` OAuth success, call Dropbox
   `/2/users/get_current_account` to get the stable `account_id`
   (e.g. `dbid:AAH4...`).
2. Store `account_id` in `localStorage` as `cloud_dropbox_account_id`.
3. In `getSimpleModeKey()`:

   ```
   key = PBKDF2(
     password  = utf8(account_id),
     salt      = STAKTRAKR_SIMPLE_SALT,   // fixed 16-byte constant in constants.js
     iterations = 600_000,
     hash      = SHA-256,
     keylen    = 256 bits
   )
   ```

4. The resulting key is passed as the `password` argument to the existing
   `vaultEncryptToBytes` / `vaultDecryptAndRestore` functions — **no vault format
   changes needed**.
5. Because `account_id` is stable, the same key is derived on every device with the
   same Dropbox account without any user interaction.

`STAKTRAKR_SIMPLE_SALT` is a hardcoded constant (32 hex chars) in `constants.js`,
added to `ALLOWED_STORAGE_KEYS` and the `window.` export block.

---

## On-Load Behavior (no auto-modals)

`initCloudSync()` is updated to never open any modal automatically:

| State | Behavior |
|---|---|
| Simple mode + connected + account ID available | Start sync immediately, no prompts |
| Simple mode + token expired / no account ID | Toast: "Cloud sync paused — tap the cloud icon to reconnect Dropbox" |
| Secure mode + password cached | Start sync immediately |
| Secure mode + no cached password | Toast: "Cloud sync needs your password — tap the cloud icon to unlock" (orange dot) |
| Sync disabled | Hide header button (existing) |

The `cloudSyncPasswordModal` is not removed — it stays as a manual fallback — but
`getSyncPassword()` is updated to never call `openModalById` automatically on load.
The modal is only reachable by deliberate user action.

---

## Header Button Popover (Secure Mode)

Clicking the orange header button in Secure mode opens a small inline popover:

```
┌─────────────────────────────────┐
│  🔒 Vault Password              │
│  [••••••••••••] [Unlock ▶]     │
│  Cancel                         │
└─────────────────────────────────┘
```

- `position: absolute` below `#headerCloudSyncBtn`, `z-index` above main content.
- Dismissed on Escape, outside click, or Cancel.
- Submit → `cloudCachePassword()` + `pushSyncVault()`.
- In **Simple mode**, orange button means the Dropbox token expired. The popover is
  replaced by a single "Reconnect to Dropbox" button that calls
  `cloudAuthStart('dropbox')`.

Popover HTML is a single `<div id="cloudSyncHeaderPopover">` injected near the header
button in `index.html`.

---

## Files Touched

| File | Change |
|---|---|
| `js/cloud-sync.js` | `initCloudSync()` — remove auto-modal paths; `getSyncPassword()` — mode-aware (Simple skips prompt); new `getSimpleModeKey()`; `enableCloudSync()` — fetch + store account ID for Simple |
| `js/cloud-storage.js` | `cloudExchangeCode()` success path — fetch `account_id`, store `cloud_dropbox_account_id` |
| `js/constants.js` | Add `STAKTRAKR_SIMPLE_SALT`; add `cloud_sync_mode` and `cloud_dropbox_account_id` to `ALLOWED_STORAGE_KEYS` and exports |
| `js/events.js` | Header button click handler — mode-aware popover vs. reconnect vs. toast; close popover on outside click |
| `index.html` | Sync Mode radio in Cloud settings; `#cloudSyncHeaderPopover` HTML; mode-switch warning copy |

`sw.js` does not need changes (no new files added to the asset list).

---

## Safety Gate — Mode Switching

Before any mode switch:

1. Show a `showAppConfirm()` dialog with the backup warning.
2. Only proceed after user confirms.
3. Clear `cloud_sync_mode`, `cloud_vault_pw_cache`, and (for Simple → Secure)
   `cloud_dropbox_account_id` from the relevant stores.
4. Re-call `initCloudSync()` to re-initialize in the new mode.

No automatic re-encryption of existing Dropbox backups. Old backups remain in their
original encryption — users can manually restore them with the old password/mode.

---

## Out of Scope

- Re-encrypting existing cloud backups when switching modes.
- pCloud or Box Simple mode (Dropbox only for now).
- Conflict resolution UX changes (handled separately).

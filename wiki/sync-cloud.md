---
title: Cloud Sync
category: frontend
owner: staktrakr
lastUpdated: v3.33.25
date: 2026-03-02
sourceFiles:
  - js/cloud-sync.js
  - js/cloud-storage.js
relatedPages:
  - storage-patterns.md
  - backup-restore.md
---
# Cloud Sync

> **Last updated:** v3.33.25 — 2026-03-02
> **Source files:** `js/cloud-sync.js`, `js/cloud-storage.js`

---

## Overview

StakTrakr supports Dropbox-based cloud sync that automatically pushes an encrypted vault snapshot whenever inventory changes, and polls for remote updates on other devices.

The active provider is Dropbox (`_syncProvider = 'dropbox'`). pCloud and Box are defined in `CLOUD_PROVIDERS` but are partially implemented (token URLs use a `/api/` proxy that does not exist in production). Treat them as future-facing stubs.

Three files live in Dropbox under `/StakTrakr/sync/`:

| File | Purpose |
|---|---|
| `staktrakr-sync.stvault` | Full encrypted inventory snapshot |
| `staktrakr-sync.json` | Lightweight metadata pointer, polled for change detection |
| `staktrakr-sync.stmanifest` | Encrypted field-level changelog (manifest-first diff path) |

A separate image vault lives at:

| File | Purpose |
|---|---|
| `staktrakr-images.stvault` | Encrypted image vault (user photos only, not pattern assets) |

> **Legacy paths:** Flat-root paths (`/StakTrakr/staktrakr-sync.*`) are retained as `*_LEGACY` constants in `js/constants.js` for migration only. Active sync uses `/StakTrakr/sync/`; auto-backups go to `/StakTrakr/backups/`. The `cloudMigrateToV2()` function runs once per device (guarded by `cloud_sync_migrated === 'v2'` in localStorage) to move existing files.

---

## Key Rules (read before touching this area)

1. **Never bypass `getSyncPasswordSilent()`** — do not add your own `localStorage.getItem('cloud_vault_password')` reads inline. All key derivation logic (Simple mode migration, Unified mode construction) is encapsulated there.
2. **`.catch()` on `pushSyncVault()` is optional** — it catches internally and all guard conditions return silently. **`.catch()` on `pullSyncVault()` is required** — the token check at the top fires before the internal try/catch, so callers must handle rejection.
3. **Cancel the debounced push before pulling** — `handleRemoteChange()` calls `scheduleSyncPush.cancel()` before opening any modal. If you add a new pull path, replicate this cancel guard or the vault overwrite race will reopen.
4. **Do not duplicate `getSyncPassword()` logic** — the fast-path check at the top delegates to `getSyncPasswordSilent()`, which handles both modes and the migration edge case. Adding a second localStorage read before it breaks Simple-mode migration.
5. **Only the leader tab pushes and polls** — `_syncIsLeader` guards both `pushSyncVault()` and `pollForRemoteChanges()`. Do not call the underlying network operations directly from UI code without this guard, or multi-tab races occur.

---

## Architecture

### File Responsibilities

| File | Role |
|---|---|
| `js/cloud-sync.js` | Auto-sync orchestration: push/pull, polling loop, conflict resolution, manifest generation, multi-tab coordination, password management |
| `js/cloud-storage.js` | Provider layer: OAuth flow, token storage/refresh, manual backup upload/download, vault list/delete, activity log, cloud UI rendering |

`cloud-sync.js` depends on `cloud-storage.js` for token operations (`cloudGetToken`, `cloudIsConnected`, `cloudStoreToken`). `cloud-storage.js` does not depend on `cloud-sync.js`.

### Supported Providers

Defined in `CLOUD_PROVIDERS` constant (in `cloud-storage.js`):

| Provider | Auth | PKCE | Refreshable | Status |
|---|---|---|---|---|
| `dropbox` | OAuth2 popup | Yes | Yes | Production |
| `pcloud` | OAuth2 popup | No | No (lifetime tokens) | Stub |
| `box` | OAuth2 popup | No | Yes | Stub |

### Two Sync Modes

#### Unified Mode (default)

The encryption key combines the user-chosen vault password and the Dropbox account ID:

```
key = vaultPassword + ':' + accountId
```

- `cloud_vault_password` and `cloud_dropbox_account_id` are both required.
- `getSyncPasswordSilent()` returns null on a new device until the user enters the password at least once — this triggers `getSyncPassword()` which opens the password modal.
- After first entry, the password is cached in `cloud_vault_password` (localStorage) so subsequent page loads are silent.
- Zero-knowledge: Dropbox OAuth access alone is insufficient to decrypt the vault.

#### Simple Mode (legacy migration only)

```
key = STAKTRAKR_SIMPLE_SALT + ':' + accountId
```

- Only applies when `cloud_sync_mode === 'simple'` is present in localStorage.
- `STAKTRAKR_SIMPLE_SALT` is a fixed hex string baked into `js/cloud-sync.js`.
- Any device with the same Dropbox OAuth token can derive the key — weaker security.
- `cloud_sync_mode === 'simple'` will be removed after v3.33. Devices on this mode will silently re-encrypt to Unified mode on the next push once a password is set.

### Key Derivation Flow

```
getSyncPasswordSilent()
  ├─ vaultPw + accountId present → return vaultPw + ':' + accountId   (Unified)
  ├─ accountId only + cloud_sync_mode==='simple' → return SALT + ':' + accountId  (Simple migration)
  └─ null → caller must call getSyncPassword() to open the password modal
```

`getSyncPassword()` checks `getSyncPasswordSilent()` first. If null, opens `cloudSyncPasswordModal`. On confirm, writes `cloud_vault_password` to localStorage and fires `pushSyncVault()` 100ms later.

### Multi-Tab Coordination

`initSyncTabCoordination()` (called from `initCloudSync()`) sets up a `BroadcastChannel('staktrakr-sync')` for leader election:

- The oldest open tab (lowest `_syncTabOpenedAt` timestamp) wins leadership.
- Only the leader tab polls and pushes.
- If the leader tab is hidden for >60 seconds, leadership is released so another tab can take over.
- When a tab becomes visible again it reclaims leadership if no other leader is present.
- When a push or pull completes, the leader broadcasts `sync-push-complete` or `sync-pull-complete` so other tabs refresh their UI without performing duplicate operations.
- Falls back gracefully to "every tab is leader" when `BroadcastChannel` is unavailable (Safari < 15.4).

---

## Key Functions

### `cloud-sync.js`

| Function | Signature | Purpose |
|---|---|---|
| `initCloudSync()` | `() → void` | Entry point (called from `init.js` Phase 13). Creates debounced push, starts poller if sync was enabled. |
| `enableCloudSync(provider?)` | `(string?) → Promise<void>` | Enable auto-sync: initial push + start poller. |
| `disableCloudSync()` | `() → void` | Disable auto-sync: persist flag, stop poller, update UI. |
| `pushSyncVault()` | `() → Promise<void>` | Encrypt and upload inventory to Dropbox. Includes empty-vault guard, backup-before-overwrite, image vault upload, manifest upload, metadata pointer write. |
| `scheduleSyncPush` | `debounced fn` | Debounced wrapper around `pushSyncVault` (2000ms delay). Exposed on `window` so `saveInventory()` can call it. |
| `pullSyncVault(remoteMeta)` | `(object) → Promise<void>` | Download, decrypt, and restore vault. Throws if no token — callers must `.catch()`. |
| `pullWithPreview(remoteMeta)` | `(object) → Promise<void>` | Primary pull path. Manifest-first: downloads `.stmanifest`, builds diff, shows `DiffModal`. Falls back to vault-first if manifest unavailable. |
| `pollForRemoteChanges()` | `() → Promise<void>` | Download `staktrakr-sync.json`, compare `syncId` with last pull, call `handleRemoteChange()` on change. Only runs if leader tab + visible. |
| `handleRemoteChange(remoteMeta)` | `(object) → Promise<void>` | Route a detected remote change: cancel debounced push, then show update modal (no local changes) or conflict modal (both sides changed). |
| `showSyncConflictModal(opts)` | `({local, remote, remoteMeta}) → void` | Display conflict modal with Keep Mine / Keep Theirs / Skip. |
| `showSyncUpdateModal(remoteMeta)` | `(object) → Promise<boolean>` | Display "Update available" modal, resolves true/false on user action. |
| `getSyncPasswordSilent()` | `() → string\|null` | Non-interactive key derivation — safe to call from background loops. |
| `getSyncPassword()` | `() → Promise<string\|null>` | Interactive key prompt — falls back to modal if `getSyncPasswordSilent()` returns null. |
| `changeVaultPassword(newPassword)` | `(string) → Promise<boolean>` | Update vault password in localStorage and trigger re-encrypt push. |
| `syncSaveOverrideBackup()` | `() → void` | Snapshot all `SYNC_SCOPE_KEYS` from localStorage before a pull overwrites them. |
| `syncRestoreOverrideBackup()` | `() → Promise<void>` | Restore the pre-pull snapshot (with confirmation dialog). |
| `getSyncDeviceId()` | `() → string` | Get or create stable per-device UUID (persisted in `cloud_sync_device_id`). |
| `syncHasLocalChanges()` | `() → boolean` | True if last push timestamp is newer than last pull timestamp. |
| `buildAndUploadManifest(token, password, syncId)` | `(...) → Promise<void>` | Build and encrypt a field-level changelog from `changeLog`, upload to Dropbox. Non-blocking (failure does not prevent vault push). |
| `pruneManifestEntries(entries, maxSyncs)` | `(array, number) → array` | Trim manifest entries to the last N sync cycles (default: 10). |
| `computeInventoryHash(items)` | `(object[]) → Promise<string\|null>` | SHA-256 hash of sorted item keys for change detection. Returns null on `file://`. |
| `computeSettingsHash()` | `() → Promise<string\|null>` | SHA-256 hash of `SYNC_SCOPE_KEYS` settings (excluding `metalInventory`). |
| `initSyncTabCoordination()` | `() → void` | Set up BroadcastChannel leader election. |
| `startSyncPoller()` / `stopSyncPoller()` | `() → void` | Start/stop the background `setTimeout` polling loop. |
| `refreshSyncUI()` | `() → void` | Update toggle, last-synced label, Sync Now button state, status dot in Settings. |
| `updateSyncStatusIndicator(state, detail?)` | `('idle'\|'syncing'\|'error'\|'disabled', string?) → void` | Update the status badge in the cloud card + header button. |

### `cloud-storage.js`

| Function | Signature | Purpose |
|---|---|---|
| `cloudAuthStart(provider)` | `(string) → void` | Open OAuth popup (PKCE for Dropbox). Must be called from a click handler to avoid popup blockers. |
| `cloudExchangeCode(code, state)` | `(string, string) → Promise<void>` | Exchange OAuth code for access/refresh tokens. Validates state parameter against saved session. |
| `cloudGetToken(provider)` | `(string) → Promise<string\|null>` | Return valid access token. Attempts refresh if expired (with 60s buffer). Clears token and returns null on refresh failure. |
| `cloudIsConnected(provider)` | `(string) → boolean` | True if a stored token exists for the provider. |
| `cloudStoreToken(provider, tokenData)` | `(string, object) → void` | Persist token to localStorage under `cloud_token_<provider>`. |
| `cloudClearToken(provider)` | `(string) → void` | Remove stored token. |
| `cloudDisconnect(provider)` | `(string) → void` | Clear token + account ID + last backup; update UI. |
| `cloudUploadVault(provider, fileBytes)` | `(string, ArrayBuffer) → Promise<void>` | Manual backup upload. Writes versioned `.stvault` file + `staktrakr-latest.json` pointer. Records to activity log. |
| `cloudDownloadVault(provider)` | `(string) → Promise<Uint8Array>` | Download latest backup by pointer, or by listing if no pointer. |
| `cloudDownloadVaultByName(provider, filename)` | `(string, string) → Promise<Uint8Array>` | Download a specific named backup file. |
| `cloudListBackups(provider)` | `(string) → Promise<object[]>` | List `.stvault` files in the provider folder, sorted newest-first. |
| `cloudDeleteBackup(provider, filename)` | `(string, string) → Promise<void>` | Delete a specific backup file; clears `cloud_last_backup` if it matches. |
| `cloudCheckConflict(provider)` | `(string) → Promise<object>` | Compare remote `staktrakr-latest.json` timestamp against local last-backup record. Returns `{conflict: bool, ...}`. |
| `recordCloudActivity(entry)` | `(object) → void` | Append an entry to the cloud activity log (capped at 500 entries, purges >180 days old). |
| `renderCloudActivityTable()` | `() → void` | Render the sortable activity table in Settings → Cloud. |
| `renderSyncHistorySection()` | `() → void` | Render the Sync History section (override backup metadata + restore button). |
| `syncCloudUI()` | `() → void` | Refresh provider card UI (connect/disconnect buttons, status badge, backup metadata). |
| `cloudCachePassword(provider, password)` | `(string, string) → void` | XOR-obfuscated session-only password cache (sessionStorage). Starts idle lock timer. |
| `cloudGetCachedPassword(provider)` | `(string) → string\|null` | Retrieve session-cached password. |
| `cloudClearCachedPassword()` | `() → void` | Clear session cache and stop idle lock timer. |
| `showCloudToast(message, durationMs?)` | `(string, number?) → void` | Display a transient toast notification. |

---

## Sync Flow

### Push (inventory → Dropbox)

Triggered by `scheduleSyncPush()` (debounced, 2000ms) from `saveInventory()`.

```
saveInventory()
  └─ scheduleSyncPush()   ← debounced 2000ms
       └─ pushSyncVault()
            ├─ Guard: syncIsEnabled() + _syncIsLeader + token + getSyncPasswordSilent()
            ├─ Empty-vault guard (REQ-1): if local is empty, check remote — block push if remote has items
            ├─ cloudMigrateToV2() if not yet migrated
            ├─ Backup-before-overwrite (REQ-2): copy existing vault to /backups/pre-sync-<ts>.stvault
            ├─ Encrypt with vaultEncryptToBytesScoped() or vaultEncryptToBytes()
            ├─ Upload: /sync/staktrakr-sync.stvault (overwrite)
            ├─ Upload image vault if hash changed (non-fatal)
            ├─ Upload: /sync/staktrakr-sync.json (metadata pointer, includes inventoryHash, settingsHash)
            ├─ buildAndUploadManifest() — field-level changelog (non-fatal)
            ├─ syncSetLastPush() + syncSetCursor()
            ├─ Auto-prune old backups (fire-and-forget)
            └─ Broadcast sync-push-complete to other tabs
```

Rate limiting (HTTP 429): exponential backoff doubles `_syncRetryDelay` on each 429, caps at 5 minutes. Resets to `SYNC_POLL_INTERVAL` on success.

### Poll (check for remote changes)

`pollForRemoteChanges()` runs on a `setTimeout` loop:

```
pollForRemoteChanges()
  ├─ Guard: syncIsEnabled() + _syncIsLeader + !document.hidden + token
  ├─ Download: /sync/staktrakr-sync.json
  ├─ Legacy fallback: if 404/409, retry at SYNC_META_PATH_LEGACY
  ├─ Echo detection: if remoteMeta.deviceId === getSyncDeviceId() → skip (our own push)
  ├─ No change: if remoteMeta.syncId === lastPull.syncId → skip
  ├─ Hash check (REQ-4): if inventoryHash matches local → skip notification, record pull silently
  └─ handleRemoteChange(remoteMeta)
```

### Remote Change Handling

```
handleRemoteChange(remoteMeta)
  ├─ Defer if password prompt is active
  ├─ scheduleSyncPush.cancel()   ← CRITICAL: prevents vault overwrite race
  ├─ syncHasLocalChanges()?
  │    No  → showSyncUpdateModal() → user accepts → pullWithPreview()
  │    Yes → showSyncConflictModal()
  │             ├─ Keep Mine  → pushSyncVault()
  │             ├─ Keep Theirs → pullWithPreview(remoteMeta)
  │             └─ Skip → close modal
```

### Pull (Dropbox → inventory)

`pullWithPreview()` is the primary entry point for all remote pulls:

```
pullWithPreview(remoteMeta)
  ├─ getSyncPasswordSilent() or getSyncPassword()
  │
  ├─ Manifest-first path (preferred):
  │    ├─ Download /sync/staktrakr-sync.stmanifest
  │    ├─ decryptManifest() → build diff from changelog entries
  │    ├─ DiffModal.show() with manifest diff
  │    │    └─ onApply: _deferredVaultRestore() — download full vault only now
  │    └─ return (vault download deferred until user confirms)
  │
  └─ Vault-first fallback (if manifest unavailable or DiffModal missing):
       ├─ Download /sync/staktrakr-sync.stvault
       ├─ vaultDecryptToData() → DiffEngine.compareItems() + compareSettings()
       ├─ showRestorePreviewModal(diffResult, settingsDiff, ...)
       │    └─ onApply: _applyAndFinalize()
       └─ fallback: direct pullSyncVault() if modal unavailable
```

`pullSyncVault()` is the lower-level restore function (full overwrite, no preview):

```
pullSyncVault(remoteMeta)
  ├─ getSyncPasswordSilent() or getSyncPassword()
  ├─ token guard (THROWS if no token — callers MUST .catch())
  ├─ Download /sync/staktrakr-sync.stvault
  ├─ syncSaveOverrideBackup()
  ├─ vaultDecryptAndRestore()
  ├─ Pull image vault if hash differs (non-fatal)
  └─ syncSetLastPull()
```

### Image Vault

Runs as part of push and pull, non-fatally:

- **Push:** `collectAndHashImageVault()` → compare hash with `lastPush.imageHash` → skip if unchanged → `vaultEncryptImageVault()` → upload to `/sync/staktrakr-images.stvault`.
- **Pull:** compare `remoteMeta.imageVault.hash` with `lastPull.imageHash` → skip if unchanged → download → `vaultDecryptAndRestoreImages()`.
- Only `userImages` IDB records are synced. `patternImages` (built-in catalog assets) are not included.

---

## Conflict Resolution

**Default: remote wins** when there are no local changes (user accepts the update modal).

`syncHasLocalChanges()` returns true if `lastPush.timestamp > lastPull.timestamp` — meaning the local device has pushed changes that predated the remote update, so both sides have diverged.

When both sides have changes, the conflict modal displays:

| Side | Fields shown |
|---|---|
| Local | item count, last-push timestamp (relative), app version |
| Remote | item count, timestamp (relative), app version, device ID (first 8 chars) |

Choices:
- **Keep Mine** → `pushSyncVault()` — overwrites remote with local
- **Keep Theirs** → `pullWithPreview(remoteMeta)` — shows diff preview, then applies remote
- **Skip** → close modal, no action (remote change will reappear on next poll)

The override backup (`syncSaveOverrideBackup`) is written before any pull, enabling "Restore This Snapshot" in the Sync History section.

---

## Backup/Restore Relationship

Cloud sync and manual backups are parallel systems:

| Operation | File location | Who calls |
|---|---|---|
| Auto-sync push | `/StakTrakr/sync/staktrakr-sync.stvault` | `pushSyncVault()` — triggered by `saveInventory()` debounce |
| Backup-before-overwrite | `/StakTrakr/backups/pre-sync-<ts>.stvault` | Inside `pushSyncVault()`, each push cycle |
| Manual backup | `/StakTrakr/staktrakr-backup-<ts>.stvault` + `staktrakr-latest.json` | `cloudUploadVault()` — user-initiated |
| Override backup (pre-pull snapshot) | `cloud_sync_override_backup` localStorage key | `syncSaveOverrideBackup()` — before every pull |

The override backup is the safety net for "Keep Theirs" conflicts or unwanted sync pulls. It restores raw localStorage strings (not Dropbox files) directly back to the pre-pull state.

---

## localStorage Keys

| Key | Purpose |
|---|---|
| `cloud_vault_password` | User vault password (Unified mode) |
| `cloud_dropbox_account_id` | Dropbox account ID (used in key derivation for both modes) |
| `cloud_sync_mode` | `'simple'` — deprecated, kept for migration only, will be removed after v3.33 |
| `cloud_sync_enabled` | `'true'` when auto-sync is active |
| `cloud_sync_device_id` | Stable per-device UUID |
| `cloud_sync_last_push` | JSON: `{syncId, timestamp, rev, itemCount, imageHash?}` |
| `cloud_sync_last_pull` | JSON: `{syncId, timestamp, rev, imageHash?}` |
| `cloud_sync_cursor` | Last-seen remote revision (from Dropbox vault upload response `.rev`) |
| `cloud_sync_override_backup` | JSON snapshot of `SYNC_SCOPE_KEYS` taken before a pull |
| `cloud_sync_migrated` | `'v2'` when flat-layout migration is complete |
| `cloud_token_<provider>` | JSON: `{access_token, refresh_token, expires_at}` |
| `cloud_last_backup` | JSON: last manual backup metadata (for manual backup UI) |
| `cloud_activity_log` | JSON array: cloud activity entries (max 500, 180-day TTL) |
| `cloud_kraken_seen` | `'true'` after first successful backup (suppresses easter-egg toast) |

---

## Error Handling Patterns

- **`pushSyncVault()`** — all errors caught internally; sets status indicator to `'error'`; returns silently. No caller catch required.
- **`pullSyncVault()`** — token guard THROWS before the internal try/catch. All callers must `.catch()` or wrap in try/catch.
- **`pullWithPreview()`** — catches internally; falls back to `pullSyncVault()` on outer error; sets status indicator to `'error'`.
- **`buildAndUploadManifest()`** — must be called inside try/catch; failure is intentionally non-blocking relative to the vault push.
- **Image vault** — all image upload/download errors are caught with `console.warn`; inventory sync continues uninterrupted.
- **Rate limiting (429)** — `pushSyncVault()` and `pollForRemoteChanges()` both handle 429 by doubling `_syncRetryDelay` (capped at 5 min). Resets to `SYNC_POLL_INTERVAL` on success.
- **Activity log** — `recordCloudActivity()` is called on every meaningful cloud operation (connect, disconnect, push, pull, backup, restore, refresh, auth failure) with action, provider, result, detail, and duration.

---

## Common Mistakes

### Adding a raw localStorage read for the vault password

```js
// WRONG — breaks Simple-mode migration and Unified mode
var pw = localStorage.getItem('cloud_vault_password');

// CORRECT — handles all modes and migration edge cases
var pw = getSyncPasswordSilent();
```

### Adding a pull path without cancelling the debounced push

```js
// WRONG — vault overwrite race (STAK fix: v3.32.24)
async function myNewPullPath(remoteMeta) {
  await pullWithPreview(remoteMeta);
}

// CORRECT
async function myNewPullPath(remoteMeta) {
  if (typeof scheduleSyncPush === 'function' && typeof scheduleSyncPush.cancel === 'function') {
    scheduleSyncPush.cancel();
  }
  await pullWithPreview(remoteMeta);
}
```

### Calling `pullSyncVault()` without `.catch()`

```js
// WRONG — token guard throws before try/catch
pullSyncVault(remoteMeta);

// CORRECT
pullSyncVault(remoteMeta).catch(function (err) {
  updateSyncStatusIndicator('error', err.message);
});
```

### Calling push/poll operations without checking leadership

```js
// WRONG — bypasses multi-tab guard
await pushSyncVault();

// CORRECT — use the public entry points which include _syncIsLeader check
scheduleSyncPush(); // for inventory changes
// or call enableCloudSync() / disableCloudSync() to start/stop the system
```

### Assuming the manifest path succeeds for all pulls

`pullWithPreview()` has two distinct paths: manifest-first (lightweight) and vault-first (full download). The manifest path is best-effort. Code that hooks into the pull flow must handle both paths.

---

## Vault Overwrite Race (fixed v3.32.24)

**Symptom:** On two-device setups, choosing "Keep Theirs" in the conflict modal silently discarded the remote device's changes.

**Root cause:** `initSyncModule()` builds `scheduleSyncPush` with a 2000ms debounce. If the poller detected a remote change within that 2-second window, the debounced push fired during or after the conflict modal, overwriting the remote vault before the pull could complete.

**Fix (v3.32.24):** `handleRemoteChange()` calls `scheduleSyncPush.cancel()` as its first substantive action — before any modal is shown.

**Both devices must be on v3.32.24+.** A device on v3.32.23 will still exhibit the bug on its own debounced push, even if the other device is updated.

---

## Related Pages

- `storage-patterns.md` — `saveData()` / `loadData()` patterns, `ALLOWED_STORAGE_KEYS`, `SYNC_SCOPE_KEYS`
- `backup-restore.md` — ZIP backup, encrypted vault, image vault, cloud sync coverage matrix

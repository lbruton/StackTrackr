---
title: Backup & Restore
category: frontend
owner: staktrakr
lastUpdated: v3.33.25
date: 2026-03-02
sourceFiles:
  - js/cloud-storage.js
  - js/cloud-sync.js
  - js/utils.js
relatedPages:
  - sync-cloud.md
  - storage-patterns.md
---
# Backup & Restore

> **Last updated:** v3.33.25 — 2026-03-02
> **Source files:** `js/cloud-storage.js`, `js/cloud-sync.js`, `js/utils.js`

## Overview

StakTrakr has **4 backup/restore mechanisms**. Each covers a different slice of application data — no single mechanism backs up everything. Full recovery requires combining mechanisms (typically ZIP + vault, or vault + image vault).

There is no dedicated `backup.js` or `restore.js`. All backup and restore logic lives in:

- `js/cloud-storage.js` — OAuth token management, manual cloud backup upload/download/delete, vault upload to Dropbox/pCloud/Box, conflict detection, activity logging
- `js/cloud-sync.js` — Auto-sync push/pull, override backup snapshots, password management, multi-tab coordination, manifest building
- `js/inventory.js` — ZIP backup creation and restore (`createBackupZip`, `restoreBackupZip`)
- `js/vault.js` — AES-256-GCM encryption/decryption for vault and image vault files

| Mechanism | Format | Encrypted | Trigger |
|-----------|--------|-----------|---------|
| ZIP Backup | `.zip` | No | Settings → "Backup All Data" button |
| Encrypted Vault | `.stvault` | Yes (AES-256-GCM) | Settings → Vault → "Export Vault" |
| Image Vault | `.stvault` | Yes (AES-256-GCM) | Cloud auto-sync (automatic) |
| Cloud Sync | Dropbox | Yes (vault-wrapped) | Settings → Cloud → Auto-sync toggle |

---

## Key Rules

- **Full recovery requires two steps.** Vault alone restores localStorage only. User-uploaded photo blobs live in IndexedDB (IDB) and need a ZIP restore or image vault restore separately.
- **CDN image URLs survive a vault restore.** Numista-enriched images (`obverseImageUrl`, `reverseImageUrl`) are stored on the inventory items in localStorage, so they come back immediately with any vault or ZIP restore. Only user-uploaded blobs need IDB restore.
- **`coinImages` IDB store is legacy — never touch it.** The schema is retained to avoid a forced migration but is never read or written. ZIP restore explicitly skips this folder.
- **`SYNC_SCOPE_KEYS`** intentionally excludes API keys, OAuth tokens, and spot history. Cloud sync is scoped to inventory + display prefs.
- When modifying restore logic, always verify the post-restore call sequence: `loadInventory()` → `renderTable()` → `renderActiveFilters()` → `loadSpotHistory()`.
- **All imports go through `buildImportValidationResult()` before DiffModal opens.** Items that fail validation are surfaced as a pre-validation warning toast and excluded from the DiffModal. If all items are invalid, the import is aborted with an error toast.
- **All exports embed `exportOrigin` (`window.location.origin`).** On import, if the file's `exportOrigin` differs from the current domain, a cross-domain warning toast is shown before the DiffModal opens. This is informational only and never blocks the import.
- **DiffModal shows a live count header** (Backup / Current / After import) and a warning when the projected count is less than the backup count.
- **A summary banner appears after every import** (`showImportSummaryBanner()`) showing added / updated / removed / skipped counts, with collapsible skip reasons when items were rejected.

---

## Architecture

### cloud-storage.js Role

`cloud-storage.js` handles the **OAuth layer and manual vault operations**:

- OAuth PKCE flow for Dropbox, pCloud, and Box (`cloudAuthStart`, `cloudExchangeCode`)
- Token storage, refresh, and expiry management (`cloudGetToken`, `cloudStoreToken`, `cloudClearToken`)
- Manual vault upload to cloud provider (`cloudUploadVault`) — writes a versioned `.stvault` file and a `staktrakr-latest.json` pointer
- Cloud backup listing (`cloudListBackups`), download by name (`cloudDownloadVaultByName`), and deletion (`cloudDeleteBackup`)
- Conflict detection via `cloudCheckConflict()` comparing remote `latest.json` timestamp against `cloud_last_backup` in localStorage
- Cloud activity log: all transactions recorded to `cloud_activity_log` (capped at 500 entries, max 180 days)
- UI state management via `syncCloudUI()`

**Manual cloud backup flow:**

1. `vaultEncryptToBytes(password)` encrypts all `ALLOWED_STORAGE_KEYS` into a binary `.stvault`
2. `cloudUploadVault(provider, fileBytes)` uploads the vault as `staktrakr-backup-YYYYMMDD-HHmmss.stvault` to the provider folder
3. Also writes `staktrakr-latest.json` (pointer with `filename`, `timestamp`, `appVersion`, `itemCount`)
4. Records `cloud_last_backup` in localStorage

### cloud-sync.js Role

`cloud-sync.js` handles **automatic background sync** (auto-sync mode):

- Debounced push on inventory change via `scheduleSyncPush` (debounced `pushSyncVault`)
- Leader election across multiple open tabs via `BroadcastChannel` — only one tab syncs at a time
- Pre-pull local snapshot via `syncSaveOverrideBackup()` (rollback-only backup, enables "Restore Override Backup" button)
- Post-push cloud-side backup-before-overwrite: copies existing cloud vault to `/StakTrakr/backups/pre-sync-TIMESTAMP.stvault` before overwriting
- Sync manifest building and encrypted upload (`buildAndUploadManifest`) for diff-merge support
- Multi-tab coordination via `BroadcastChannel('staktrakr-sync')` — push/pull events broadcast to all tabs
- Password management (`getSyncPassword`, `getSyncPasswordSilent`, `changeVaultPassword`)
- Empty-vault push guard: blocks push when local is empty but remote has items

**Auto-sync file layout on Dropbox:**

| File | Path | Contents |
|------|------|----------|
| Inventory vault | `/StakTrakr/sync/staktrakr-sync.stvault` | Sync-scoped vault (inventory + display prefs) |
| Image vault | `/StakTrakr/sync/staktrakr-images.stvault` | `userImages` IDB blobs (base64) |
| Metadata pointer | `/StakTrakr/sync/staktrakr-sync.json` | `rev`, `itemCount`, `syncId`, `deviceId`, `imageVault` hash |
| Manifest | `/StakTrakr/sync/staktrakr-manifest.stvault` | Encrypted field-level change log for diff-merge |
| Pre-push backups | `/StakTrakr/backups/pre-sync-TIMESTAMP.stvault` | Auto-backups before each vault overwrite |

> **Legacy paths:** Flat-root paths (`/StakTrakr/staktrakr-sync.*`) are retained as `*_LEGACY` constants in `js/constants.js` for migration only. Active sync uses `/StakTrakr/sync/`. Migration runs once on first push (`cloudMigrateToV2`).

### utils.js Role

`js/utils.js` provides the import validation pipeline shared across all import paths:

- `buildImportValidationResult(items, skippedNonPM)` — batch validation before DiffModal
- `showImportSummaryBanner(result)` — persistent dismissible banner after import completes
- `saveData(key, value)` / `loadData(key)` — all localStorage reads/writes go through these (never direct `localStorage.setItem`)
- `sanitizeImportedItem(item)` — sanitizes raw imported item before validation

---

## Export Format

### JSON Export (inventory items only)

`exportJson()` in `js/inventory.js` wraps the item array in an envelope object:

```json
{
  "items": [ /* inventory items */ ],
  "exportMeta": {
    "exportOrigin": "https://www.staktrakr.com",
    "exportDate": "2026-03-02T00:00:00.000Z",
    "version": "3.33.25",
    "itemCount": 47
  }
}
```

`importJson` handles both the new wrapped format and the legacy plain array format. Old files still import correctly.

### ZIP Backup (full, non-encrypted)

**Output filename:** `precious_metals_backup_YYYYMMDD.zip`

| File in ZIP | Contents | Storage restored to |
|-------------|----------|---------------------|
| `inventory_data.json` | Full inventory array (includes CDN URLs: `obverseImageUrl`, `reverseImageUrl`) | localStorage (`LS_KEY`) |
| `settings.json` | Theme, catalog mappings, feature flags, chip config, table settings, `exportOrigin` | localStorage (multiple keys) |
| `spot_price_history.json` | Historical spot prices | localStorage (`SPOT_HISTORY_KEY`) |
| `item_price_history.json` | Per-item price history | Merged via `mergeItemPriceHistory()` |
| `item_tags.json` | Item tags | localStorage |
| `retail_prices.json` | Retail price data | localStorage |
| `retail_price_history.json` | Retail price history | localStorage |
| `image_metadata.json` | Numista enrichment metadata | IDB `coinMetadata` store |
| `user_images/` | User-uploaded photo blobs (obverse/reverse per UUID) | IDB `userImages` store |
| `user_image_manifest.json` | UUID→filename mapping | Used during restore |
| `pattern_images/` | Pattern rule image blobs | IDB `patternImages` store |
| `inventory_export.csv` | Human-readable CSV | Not restored (report only) |
| `inventory_report.html` | HTML report | Not restored (report only) |

What is NOT included: `coinImages` IDB store (legacy/dead, explicitly skipped), API keys, OAuth tokens, cloud sync state.

### Encrypted Vault (.stvault — full scope)

**Crypto:** AES-256-GCM, PBKDF2 (600K iterations), 56-byte binary header

**Full scope** (`vaultEncryptToBytes`) includes all `ALLOWED_STORAGE_KEYS` (~80+ keys):

- Inventory items with CDN URLs
- API keys and Dropbox OAuth tokens
- Spot history, theme, all settings

Does NOT include: `userImages`, `patternImages`, or `coinMetadata` IDB blobs.

### Sync-Scoped Vault (.stvault — sync scope)

**Sync scope** (`vaultEncryptToBytesScoped`) includes only `SYNC_SCOPE_KEYS`:

- `metalInventory`, `itemTags`, display preferences, `chipMinCount`, `chipMaxCount`

Intentionally excludes: API keys, OAuth tokens, spot price history.

### Image Vault (.stvault — images only)

Built by `collectAndHashImageVault()` → encrypted by `vaultEncryptImageVault()`.

**Payload shape:**

```json
{
  "_meta": {
    "appVersion": "3.33.25",
    "exportTimestamp": "2026-03-02T...",
    "imageCount": 42
  },
  "records": [
    {
      "uuid": "abc123",
      "obverse": "<base64>",
      "reverse": "<base64>",
      "cachedAt": "...",
      "size": 12345
    }
  ]
}
```

**Hash tracking:** `simpleHash(uuid + ':' + size + ':' + obverse.slice(0, 32))` — detects content changes even when file size is identical.

### Export Origin Metadata

All export formats embed `exportOrigin` (`window.location.origin`) for cross-domain detection:

| Format | Where stored |
|--------|-------------|
| JSON (`exportJson`) | `exportMeta.exportOrigin` in the wrapper object |
| ZIP (`createBackupZip`) | `exportOrigin` field in `settings.json` |
| Vault (`collectVaultData`) | `_meta.exportOrigin` in the vault payload |
| CSV (`exportCsv`) | Comment line at top: `# exportOrigin: https://...` |

Old exports without `exportOrigin` import silently with no warning.

### Export Format UI Labels

The backup/export panel shows a `<small class="format-desc">` beneath each option:

| Format | Description label |
|--------|------------------|
| CSV | "Inventory items only — spreadsheet compatible" |
| JSON | "Inventory items only — no settings or price history" |
| HTML report | "Inventory items only — printable report" |
| ZIP | "Full backup — inventory, settings, price history, and images" |
| .stvault | "Encrypted full backup — inventory, settings, price history, and images" |

---

## Import/Restore Flow

### JSON Import (`importJson`)

1. Parse file: detect new wrapped format (`{ items, exportMeta }`) vs legacy plain array
2. Check `exportMeta.exportOrigin` — show cross-domain warning toast if origin differs
3. Sanitize each item via `sanitizeImportedItem()`
4. Run `buildImportValidationResult(items, skippedNonPM)` — filter invalid items
5. If all invalid: abort with error toast
6. If some invalid: show warning toast, proceed with valid items only
7. Open `DiffModal` with `backupCount` and `localCount` for live count header
8. On apply: merge items, call post-restore sequence, show `showImportSummaryBanner(result)`

### ZIP Restore (`restoreBackupZip`)

1. Unzip all files
2. Restore localStorage keys from `inventory_data.json`, `settings.json`, `spot_price_history.json`, etc.
3. Restore `userImages` IDB from `user_images/` using `user_image_manifest.json`; falls back to filename parsing for old ZIPs pre-STAK-226
4. Restore `patternImages` IDB from `pattern_images/`
5. Restore `coinMetadata` IDB from `image_metadata.json`
6. Explicitly skip `coinImages/` folder (logs: `"skipping legacy coinImages folder (store deprecated)"`)
7. Post-restore sequence: `loadInventory()` → `renderTable()` → `renderActiveFilters()` → `loadSpotHistory()`

### Vault Restore (`vaultDecryptAndRestore`)

1. Read 56-byte binary header to extract salt, IV, and version
2. Derive key via PBKDF2 (600K iterations, SHA-256)
3. Decrypt AES-256-GCM payload
4. Parse JSON and write all scoped localStorage keys
5. Check `_meta.exportOrigin` — show cross-domain warning if origin differs
6. Post-restore sequence: `loadInventory()` → `renderTable()` → `renderActiveFilters()` → `loadSpotHistory()`

Image blobs are NOT restored via vault — requires a separate ZIP or image vault restore.

### Image Vault Restore (`vaultDecryptAndRestoreImages` → `restoreImageVaultData`)

1. Decrypt image vault `.stvault` using same AES-256-GCM scheme
2. Parse records array
3. Decode each base64 blob back to a `Blob` object
4. Write each record to `userImages` IDB via `imageCache.importUserImageRecord()`

### Auto-Sync Pull (`pullSyncVault` in `cloud-sync.js`)

1. `syncSaveOverrideBackup()` — snapshot all `SYNC_SCOPE_KEYS` to `cloud_sync_override_backup` in localStorage (rollback-only backup)
2. Download inventory vault from `/StakTrakr/sync/staktrakr-sync.stvault`
3. `vaultDecryptAndRestore(fileBytes, password)` — decrypt and write sync-scoped localStorage keys
4. Check remote `staktrakr-sync.json` `imageVault.hash` vs last pull hash
5. If image hash changed: download image vault → `vaultDecryptAndRestoreImages()`
6. Post-restore sequence: `loadInventory()` → `renderTable()` → `renderActiveFilters()` → `loadSpotHistory()`

### Auto-Sync Push (`pushSyncVault` in `cloud-sync.js`)

1. Empty-vault guard: if local inventory is empty and remote has items, block push and prompt to pull instead
2. Migration check: run `cloudMigrateToV2()` if not yet migrated (once per device)
3. `vaultEncryptToBytesScoped(password)` — encrypt sync-scope vault
4. Cloud-side backup-before-overwrite: copy existing cloud vault to `/StakTrakr/backups/pre-sync-TIMESTAMP.stvault` (non-blocking)
5. Upload inventory vault to `/StakTrakr/sync/staktrakr-sync.stvault` (overwrite)
6. `collectAndHashImageVault()` — compute image hash; if changed, encrypt and upload image vault (non-fatal on failure)
7. Upload `staktrakr-sync.json` metadata pointer (`rev`, `itemCount`, `syncId`, `deviceId`, `imageVault`)
8. `buildAndUploadManifest()` — encrypt and upload field-level change log for diff-merge (non-blocking)

---

## Key Functions

### cloud-storage.js

| Function | Signature | Purpose |
|----------|-----------|---------|
| `cloudUploadVault` | `async (provider, fileBytes)` | Upload a pre-built `.stvault` to cloud; writes versioned file + `latest.json` pointer |
| `cloudDownloadVaultByName` | `async (provider, filename)` | Download a named `.stvault` from cloud; returns `Uint8Array` |
| `cloudDownloadVault` | `async (provider)` | Download the latest vault (reads `latest.json` pointer first, falls back to newest in folder) |
| `cloudListBackups` | `async (provider)` | List all `.stvault` files in cloud folder; returns array sorted newest-first |
| `cloudDeleteBackup` | `async (provider, filename)` | Delete a named vault file; clears `cloud_last_backup` if matched |
| `cloudCheckConflict` | `async (provider)` | Compare remote `latest.json` timestamp vs `cloud_last_backup`; returns conflict info object |
| `cloudGetToken` | `async (provider)` | Get OAuth access token; auto-refreshes if expired; clears token on refresh failure |
| `cloudIsConnected` | `(provider)` | Returns `true` if a stored token exists for the provider |
| `cloudAuthStart` | `(provider)` | Opens OAuth popup; initiates PKCE flow for Dropbox |
| `cloudExchangeCode` | `async (code, state)` | Exchanges OAuth auth code for access token; stores in localStorage |
| `cloudDisconnect` | `(provider)` | Clears token and `cloud_last_backup` |
| `recordCloudActivity` | `(entry)` | Appends to `cloud_activity_log` (max 500 entries, 180-day rolling window) |
| `syncCloudUI` | `()` | Refreshes cloud card UI state (connected badge, backup status, button states) |

### cloud-sync.js

| Function | Signature | Purpose |
|----------|-----------|---------|
| `pushSyncVault` | `async ()` | Encrypt and push sync-scoped vault to Dropbox; includes empty-vault guard, image vault, and manifest |
| `pullWithPreview` | `async ()` — (calls `pullSyncVault`) | Download and decrypt sync vault; saves override backup before applying |
| `syncSaveOverrideBackup` | `()` | Snapshot all `SYNC_SCOPE_KEYS` raw strings to `cloud_sync_override_backup` |
| `syncRestoreOverrideBackup` | `async ()` | Restore pre-pull snapshot with confirmation; clears scope keys then rewrites from snapshot |
| `getSyncPassword` | `()` → `Promise<string|null>` | Interactively prompt for vault password; stores in localStorage; returns composite key |
| `getSyncPasswordSilent` | `()` → `string|null` | Return composite key (`password:accountId`) without UI; returns `null` if either missing |
| `changeVaultPassword` | `async (newPassword)` → `boolean` | Store new password; triggers debounced push to re-encrypt vault |
| `syncIsEnabled` | `()` → `boolean` | Returns `true` when `cloud_sync_enabled === 'true'` in localStorage |
| `syncGetLastPush` | `()` → `object|null` | Read `cloud_sync_last_push` from localStorage |
| `syncSetLastPush` | `(meta)` | Write `cloud_sync_last_push` to localStorage |
| `syncGetLastPull` | `()` → `object|null` | Read `cloud_sync_last_pull` from localStorage |
| `getSyncDeviceId` | `()` → `string` | Get or create stable per-device UUID in localStorage |
| `buildAndUploadManifest` | `async (token, password, syncId)` | Build encrypted field-level manifest from changeLog; upload to Dropbox (non-blocking) |
| `initSyncTabCoordination` | `()` | Initialize `BroadcastChannel` leader election; falls back gracefully |
| `updateSyncStatusIndicator` | `(state, detail)` | Update sync status dot (`idle`/`syncing`/`error`/`disabled`) |
| `refreshSyncUI` | `()` | Refresh "Last synced" text, toggle state, and sync history section |
| `computeInventoryHash` | `async (items)` → `string|null` | SHA-256 of sorted item keys; used for change detection |
| `computeSettingsHash` | `async ()` → `string|null` | SHA-256 of sync-scoped settings values |

### utils.js (import/restore pipeline)

| Function | Signature | Purpose |
|----------|-----------|---------|
| `buildImportValidationResult` | `(items, skippedNonPM)` → `object` | Batch-validate sanitized items; returns `{ valid, invalid, skippedNonPM, skippedCount }` |
| `showImportSummaryBanner` | `(result)` | Render dismissible summary banner above inventory table after import |
| `saveData` | `(key, value)` | Write to localStorage via allowed-key guard |
| `loadData` | `(key, defaultValue)` | Read from localStorage with JSON parse |

---

## Conflict Resolution During Restore

### Manual cloud backup conflict

`cloudCheckConflict(provider)` compares `latest.json` remote timestamp against `cloud_last_backup.timestamp` in localStorage. Returns `{ conflict: true, reason, remote, local }` when remote is newer. The UI renders a conflict modal; user chooses to download remote or keep local.

### Auto-sync conflict

Conflict detection is driven by `syncHasLocalChanges()`, which checks whether both local and remote have diverged (last push timestamp is more recent than last pull timestamp). When both sides have diverged, the conflict modal appears. It is not triggered by item-count differences alone.

`syncSaveOverrideBackup()` stores a pre-pull snapshot enabling the "Restore Override Backup" button in the sync history section. If the user accepts a conflicting pull and wants to revert, `syncRestoreOverrideBackup()` writes the pre-pull snapshot back.

**Override backup guard:** `syncRestoreOverrideBackup()` only clears scope keys if the snapshot is non-empty — an empty snapshot is treated as corruption and does not wipe localStorage.

### Merge strategy during import

All JSON/CSV/vault imports use a **merge strategy** (not replace-all):

- Items in the import are merged into the existing inventory using `DiffEngine`
- DiffModal shows added / modified / removed diffs; user selects which to apply
- The apply callback calls `saveData` with the merged result
- Post-apply summary banner shows final counts

---

## Manual Backup vs Automatic Cloud Sync

| Aspect | Manual Backup (cloud-storage.js) | Auto-Sync (cloud-sync.js) |
|--------|----------------------------------|---------------------------|
| Trigger | User clicks "Backup" button | Debounced on every inventory change |
| Vault scope | Full (`ALLOWED_STORAGE_KEYS`) | Sync-scope (`SYNC_SCOPE_KEYS`) only |
| What's included | All localStorage keys including API keys and spot history | Inventory + display prefs only |
| Filename | Versioned: `staktrakr-backup-YYYYMMDD-HHmmss.stvault` | Fixed: `staktrakr-sync.stvault` |
| Pointer file | `staktrakr-latest.json` | `staktrakr-sync.json` (rev + hash + syncId) |
| Image vault | Not part of manual backup | Pushed when `userImages` hash changes |
| Conflict check | `cloudCheckConflict()` on manual download | `syncHasLocalChanges()` on pull |
| Pre-restore snapshot | No | Yes: `syncSaveOverrideBackup()` before every pull |
| Provider support | Dropbox, pCloud, Box | Dropbox only |

---

## Coverage Matrix

| Data | ZIP Backup | Encrypted Vault (full) | Image Vault | Cloud Auto-Sync |
|------|:----------:|:----------------------:|:-----------:|:---------------:|
| Inventory items | Yes | Yes | No | Yes (sync scope) |
| CDN image URLs on items | Yes (in items) | Yes (in items) | No | Yes (in items) |
| User-uploaded photo blobs | Yes `user_images/` | No | Yes | Yes (conditional) |
| Pattern rule image blobs | Yes `pattern_images/` | No | No | No |
| Numista metadata cache | Yes `image_metadata.json` | No | No | No |
| API keys / OAuth tokens | No | Yes (full scope) | No | No |
| Spot price history | Yes | Yes (full scope) | No | No |
| Settings / theme / prefs | Yes | Yes | No | Yes (display prefs only) |
| `coinImages` (legacy) | No (SKIPPED) | No | No | No |

**Key takeaway:** Full recovery requires BOTH a ZIP backup (for IDB blobs) AND a vault (for localStorage including API keys). Cloud sync alone does not cover pattern images or Numista metadata.

---

## Full Recovery Playbook

### Scenario A: Full restore from ZIP backup

1. Settings → "Backup All Data" produces the ZIP
2. Settings → Restore → select the `.zip` file → `restoreBackupZip(file)`
3. Restores: localStorage keys + `userImages` + `patternImages` + `coinMetadata`
4. Verify inventory loads and photos appear

### Scenario B: Full restore from vault + image vault

1. Restore encrypted vault → `vaultDecryptAndRestore(fileBytes, password)`
   - Restores: all localStorage (inventory, settings, API keys, spot history)
   - CDN image URLs come back immediately (stored on items)
2. Restore image vault → `vaultDecryptAndRestoreImages(fileBytes, password)`
   - Restores: `userImages` IDB blobs
3. Pattern images and Numista metadata are NOT recovered via this path

### Scenario C: Cloud auto-sync pull only

- Restores inventory + display prefs (sync scope)
- CDN image URLs come back immediately
- If remote image hash differs from local, image vault is pulled and `userImages` restored
- Pattern images and API keys are NOT restored

---

## Common Mistakes

| Symptom | Cause | Fix |
|---------|-------|-----|
| "My photos are gone after restoring vault" | Vault only restores localStorage. User-uploaded blobs live in IDB and require a separate restore. CDN URLs survive, but locally uploaded images do not. | Also restore from ZIP (`user_images/`) or from the image vault. |
| "Pattern images disappeared after restore" | Only the ZIP backup includes `pattern_images/`. Cloud sync and the image vault do not cover this store. | Restore from ZIP backup to recover pattern images. |
| "Numista images came back immediately after vault restore" | Expected behavior. Numista CDN URLs (`obverseImageUrl`, `reverseImageUrl`) are stored on the inventory items in localStorage, so they survive any vault restore without touching IDB. | No action needed — this is correct. |
| "Image vault upload failed during cloud push" | Image vault upload is non-fatal — the inventory vault still succeeds. | Check Dropbox token validity. The next successful push will retry the image vault if the hash changed. |
| "Conflict prompt appeared after cloud pull" | Both local and remote have diverged — last push is more recent than last pull, meaning both sides have independent changes. | Review the conflict UI and choose which version to keep. |
| "DiffModal shows fewer items than I expected" | Pre-validation in `buildImportValidationResult()` filters out invalid items before DiffModal opens. The count header shows backup count (including skipped) vs. projected count. | Check the pre-validation warning toast for the number of skipped items and their reasons. The post-import summary banner also lists skip reasons. |
| "I see a yellow cross-domain warning on import" | The file's `exportOrigin` (e.g., `https://beta.staktrakr.com`) differs from the current domain. | The warning is informational only. Proceed if you intentionally want to merge across environments. |
| "The JSON file I exported doesn't look like a plain array anymore" | `exportJson()` now wraps items in an object with `items` and `exportMeta` fields. | Both the wrapped format and the legacy plain-array format are supported on import. Old files still import correctly. |
| "Import shows a banner but also a toast" | If `safeGetElement()` cannot find the inventory table container, `showImportSummaryBanner()` falls back to `showToast()`. | Verify the inventory container element id is present in the DOM at import time. |
| "Push was blocked with 'Empty vault — pull first'" | Empty-vault guard in `pushSyncVault()` detected remote has items but local is empty. | Pull from cloud first to restore local inventory, then push will proceed normally. |

> **Never modify the `coinImages` IDB store.** It is a legacy store retained only to avoid a forced migration. It is never read or written. ZIP restore explicitly skips `coinImages/` and logs: `"skipping legacy coinImages folder (store deprecated)"`.

---

## Related Pages

- [sync-cloud.md](sync-cloud.md) — Dropbox OAuth setup and auto-sync troubleshooting
- [storage-patterns.md](storage-patterns.md) — localStorage key patterns, `saveData`/`loadData`, `ALLOWED_STORAGE_KEYS`

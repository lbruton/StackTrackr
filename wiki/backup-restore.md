---
title: "Backup & Restore"
category: frontend
owner: staktrakr
lastUpdated: v3.33.19
date: 2026-03-01
sourceFiles:
  - js/inventory.js
  - js/vault.js
  - js/cloud-sync.js
  - js/cloud-storage.js
  - js/image-cache.js
relatedPages:
  - cloud-sync.md
  - image-pipeline.md
  - idb-stores.md
  - vault-crypto.md
  - constants.md
---
# Backup & Restore

> **Last updated:** v3.33.19 — 2026-03-01
> **Source files:** `js/inventory.js`, `js/vault.js`, `js/cloud-sync.js`, `js/cloud-storage.js`, `js/image-cache.js`

## Overview

StakTrakr has **4 backup/restore mechanisms**. Each covers a different slice of application data — no single mechanism backs up everything. Full recovery requires combining mechanisms (typically ZIP + vault, or vault + image vault).

| Mechanism | Format | Encrypted | Trigger |
|-----------|--------|-----------|---------|
| ZIP Backup | `.zip` | No | Settings → "Backup All Data" button |
| Encrypted Vault | `.stvault` | Yes (AES-256-GCM) | Settings → Vault → "Export Vault" |
| Image Vault | `.stvault` | Yes (AES-256-GCM) | Dropbox cloud sync (auto) |
| Cloud Sync | Dropbox | Yes (vault-wrapped) | Settings → Cloud → Sync |

---

## Key Rules (read before touching this area)

- **Full recovery requires two steps.** Vault alone restores localStorage only. User-uploaded photo blobs live in IndexedDB (IDB) and need a ZIP restore or image vault restore separately.
- **CDN image URLs survive a vault restore.** Numista-enriched images (`obverseImageUrl`, `reverseImageUrl`) are stored on the inventory items in localStorage, so they come back immediately with any vault or ZIP restore. Only user-uploaded blobs need IDB restore.
- **`coinImages` IDB store is legacy — never touch it.** The schema is retained to avoid a forced migration but is never read or written. ZIP restore explicitly skips this folder.
- **`SYNC_SCOPE_KEYS`** intentionally excludes API keys, OAuth tokens, and spot history. Cloud sync is scoped to inventory + display prefs.
- When modifying restore logic, always verify the post-restore call sequence: `loadInventory()` → `renderTable()` → `renderActiveFilters()` → `loadSpotHistory()`.

---

## ZIP Backup (Non-Encrypted)

**Trigger:** Settings → "Backup All Data" button (`exportZipBtn`)
**Function:** `createBackupZip()` in `js/inventory.js`
**Output filename:** `precious_metals_backup_YYYYMMDD.zip`

### Files included in the ZIP

| File in ZIP | Contents | Storage restored to |
|-------------|----------|---------------------|
| `inventory_data.json` | Full inventory array (includes CDN URLs: `obverseImageUrl`, `reverseImageUrl`) | localStorage (`LS_KEY`) |
| `settings.json` | Theme, catalog mappings, feature flags, chip config, table settings | localStorage (multiple keys) |
| `spot_price_history.json` | Historical spot prices | localStorage (`SPOT_HISTORY_KEY`) |
| `item_price_history.json` | Per-item price history | Merged via `mergeItemPriceHistory()` |
| `item_tags.json` | Item tags | localStorage |
| `retail_prices.json` | Retail price data | localStorage |
| `retail_price_history.json` | Retail price history | localStorage |
| `image_metadata.json` | Numista enrichment metadata | IDB `coinMetadata` store |
| `user_images/` | User-uploaded photo blobs (obverse/reverse per UUID) | IDB `userImages` store |
| `user_image_manifest.json` | UUID→filename mapping (STAK-226) | Used during restore |
| `pattern_images/` | Pattern rule image blobs | IDB `patternImages` store |
| `inventory_export.csv` | Human-readable CSV | Not restored (report only) |
| `inventory_report.html` | HTML report | Not restored (report only) |

### What is NOT included

- `coinImages` IDB store (legacy/dead — explicitly skipped)
- API keys and Dropbox OAuth tokens
- Cloud sync state

### Restore function

`restoreBackupZip(file)` in `js/inventory.js`

- `coinImages/` folder explicitly skipped with debug log: `"skipping legacy coinImages folder (store deprecated)"`
- User images use manifest-based import (`user_image_manifest.json`); falls back to filename parsing for old ZIPs that predate STAK-226
- Post-restore sequence: `loadInventory()` → `renderTable()` → `renderActiveFilters()` → `loadSpotHistory()`

---

## Encrypted Vault (.stvault)

**Trigger:** Settings → Vault → "Export Vault"
**Function:** `vaultEncryptToBytes()` in `js/vault.js`
**Crypto:** AES-256-GCM, PBKDF2 (600K iterations), 56-byte header
**Output:** `*.stvault` binary file

### What is included

All localStorage keys listed in `ALLOWED_STORAGE_KEYS` (~80+ keys), including:

- Inventory items with CDN URLs (`obverseImageUrl`, `reverseImageUrl`)
- API keys and Dropbox OAuth tokens
- Spot history, theme, all settings

### What is NOT included

- `userImages` IDB blobs
- `patternImages` IDB blobs
- `coinMetadata` IDB records

### Scope variants

| Scope | Function | Keys included | Used by |
|-------|----------|---------------|---------|
| `'full'` | `vaultEncryptToBytes()` | All `ALLOWED_STORAGE_KEYS` | Manual export |
| `'sync'` | `vaultEncryptToBytesScoped()` | `SYNC_SCOPE_KEYS` only (excludes API keys, tokens, spot history) | Cloud auto-sync |

### Restore function

`vaultDecryptAndRestore(fileBytes, password)` in `js/vault.js`

- Decrypts and writes all scoped localStorage keys
- Image blobs are NOT restored — requires a separate ZIP or image vault restore
- Post-restore sequence: `loadInventory()` → `renderTable()` → `renderActiveFilters()` → `loadSpotHistory()`

---

## Image Vault

**Functions:** `collectAndHashImageVault()` → `vaultEncryptImageVault()` in `js/vault.js`
**Crypto:** AES-256-GCM (same as regular vault)
**Cloud path:** `/StakTrakr/sync/staktrakr-images.stvault` (Dropbox)

### What is included

All `userImages` IDB records serialized as base64 blobs.

**Payload shape:**

```json
{
  "_meta": {
    "appVersion": "3.32.41",
    "exportTimestamp": "2026-02-25T...",
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

### What is NOT included

- `patternImages` IDB blobs
- `coinMetadata` IDB records

### Restore function

`vaultDecryptAndRestoreImages(fileBytes, password)` → `restoreImageVaultData()` in `js/vault.js`

- Decodes base64 strings back to `Blob` objects
- Writes each record to `userImages` IDB via `imageCache.importUserImageRecord()`

---

## Cloud Sync (Dropbox)

**Functions:** `pushSyncVault()` and `pullSyncVault()` in `js/cloud-sync.js`
**Provider:** Dropbox via OAuth token

### Remote paths

| File | Path | Contents |
|------|------|----------|
| Inventory vault | `/StakTrakr/sync/staktrakr-sync.stvault` | Sync-scoped vault (inventory + display prefs) |
| Image vault | `/StakTrakr/sync/staktrakr-images.stvault` | `userImages` blobs only |
| Metadata pointer | `/StakTrakr/sync/staktrakr-sync.json` | `imageHash`, `itemCount`, `syncId`, `deviceId` |

> **Legacy paths:** Flat-root paths (`/StakTrakr/staktrakr-sync.*`) are retained as `*_LEGACY` constants in `js/constants.js` for migration only. Active sync uses `/StakTrakr/sync/`; backups go to `/StakTrakr/backups/`.

### Push sequence

1. `vaultEncryptToBytesScoped(password)` — build sync-scope vault
2. Upload inventory vault to Dropbox
3. `collectAndHashImageVault()` — compute current image hash; compare vs last push
4. If hash changed → `vaultEncryptImageVault()` → upload image vault (failure here is non-fatal)
5. Upload metadata pointer JSON with `imageHash`, `itemCount`, `syncId`, `deviceId`

### Pull sequence

1. `syncSaveOverrideBackup()` — snapshot local state before overwrite (rollback-only backup)
2. Download + decrypt inventory vault → `vaultDecryptAndRestore()`
3. Check remote `imageVault` hash vs local — if differs: download + decrypt image vault → `vaultDecryptAndRestoreImages()`
4. Post-restore sequence: `loadInventory()` → `renderTable()` → `renderActiveFilters()` → `loadSpotHistory()`

### Sync scope

`SYNC_SCOPE_KEYS` (defined in `js/constants.js`) includes: `metalInventory`, `itemTags`, display preferences.

Intentionally excludes: API keys, OAuth tokens, spot price history.

### Conflict detection

`syncSaveOverrideBackup()` stores a pre-pull snapshot as a rollback-only backup (enabling the "Restore Override Backup" button in the sync history section). Conflict detection is driven by `syncHasLocalChanges()`, which checks whether both local and remote have diverged (i.e., the last push timestamp is more recent than the last pull timestamp). When both sides have diverged, the conflict modal appears; it is not triggered by item-count differences between the snapshot and pulled data.

---

## Coverage Matrix

| Data | ZIP Backup | Encrypted Vault | Image Vault | Cloud Sync |
|------|:----------:|:---------------:|:-----------:|:----------:|
| Inventory items | ✅ | ✅ | ❌ | ✅ (sync scope) |
| CDN image URLs on items | ✅ (in items) | ✅ (in items) | ❌ | ✅ (in items) |
| User-uploaded photo blobs | ✅ `user_images/` | ❌ | ✅ | ✅ conditional |
| Pattern rule image blobs | ✅ `pattern_images/` | ❌ | ❌ | ❌ |
| Numista metadata cache | ✅ `image_metadata.json` | ❌ | ❌ | ❌ |
| API keys / OAuth tokens | ❌ | ✅ (full scope) | ❌ | ❌ |
| Spot price history | ✅ | ✅ (full scope) | ❌ | ❌ |
| Settings / theme / prefs | ✅ | ✅ | ❌ | ✅ (display prefs only) |
| `coinImages` (legacy) | ❌ SKIPPED | ❌ | ❌ | ❌ |

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

### Scenario C: Cloud sync pull only

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

> **Never modify the `coinImages` IDB store.** It is a legacy store retained only to avoid a forced migration. It is never read or written. ZIP restore explicitly skips `coinImages/` and logs: `"skipping legacy coinImages folder (store deprecated)"`.

---

## Related Pages

- [cloud-sync.md](cloud-sync.md) — Dropbox OAuth setup and sync troubleshooting
- [image-pipeline.md](image-pipeline.md) — Numista enrichment, CDN URL lifecycle, IDB stores
- [idb-stores.md](idb-stores.md) — IndexedDB store reference (`userImages`, `patternImages`, `coinMetadata`, `coinImages`)
- [vault-crypto.md](vault-crypto.md) — AES-256-GCM vault format, header layout, PBKDF2 parameters
- [constants.md](constants.md) — `ALLOWED_STORAGE_KEYS`, `SYNC_SCOPE_KEYS`, `IMAGE_ZIP_MANIFEST_VERSION`

# Image Storage Expansion — Design

**Date:** 2026-02-23
**Status:** Approved — ready for implementation planning
**Related issues:** STAK-300 (storage quota), STAK-304 (this feature)

---

## Problem

StakTrakr enforces a self-imposed 50 MB cap on its IndexedDB image store (`_quotaBytes` in `image-cache.js`). A user with a large collection — e.g., 188 silver items × 2 sides × ~200 KB avg compressed WebP — can easily exceed this. The browser's actual quota (Chrome: 50% of disk, typically several GB) is orders of magnitude larger. Additionally:

- No persistent storage is ever requested, so Chrome may silently evict IndexedDB data under storage pressure
- Users have no visibility into how much image storage they are using
- User-uploaded photos are excluded from encrypted backups and cannot be exported or imported independently
- The current per-item image model has no foundation for future image reuse across items

---

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Quota strategy | Dynamic via `navigator.storage.estimate()` | Adapts to actual disk; no hardcoded guess |
| Persistent storage | Request on first photo upload | Prevents silent eviction; Chrome auto-grants on engaged sites |
| Storage gauge | Two rows: user photos + Numista cache, separately | User can act on Numista cache independently |
| Image export format | ZIP (JSZip) + `manifest.json` + `.webp` files | WebP blobs already exist; no re-encoding; user gets real image files |
| Encrypted backup | New "Full Backup (with images)" ZIP option; existing JSON backup unchanged | Keeps existing flow intact; avoids embedding 50+ MB in JSON |
| Vault sync (Dropbox) | Deferred — future `vault-images.enc` alongside `vault.enc` | Embedding images in vault JSON not practical at scale |
| Image reuse foundation | Copy-on-tag model with `sharedImageId` metadata | Keeps IndexedDB schema simple; no foreign-key graph; enables future "browse" UI |

---

## Section 1: Storage System

### 1.1 Dynamic Quota

Replace the hardcoded `_quotaBytes = 50 * 1024 * 1024` in `image-cache.js` with a startup call to `navigator.storage.estimate()`:

```js
async _initQuota() {
  if (!navigator?.storage?.estimate) {
    this._quotaBytes = 500 * 1024 * 1024; // 500 MB safe fallback
    return;
  }
  const { quota, usage } = await navigator.storage.estimate();
  // Use 60% of available (quota - usage), min 500 MB, max 4 GB
  const available = (quota || 0) - (usage || 0);
  this._quotaBytes = Math.min(
    Math.max(available * 0.6, 500 * 1024 * 1024),
    4 * 1024 * 1024 * 1024
  );
}
```

Called once during `ImageCache._ensureDb()` initialization. Result cached in `this._quotaBytes`. Falls back gracefully on `file://` where `estimate()` may return 0.

### 1.2 Persistent Storage

Call `navigator.storage.persist()` the first time a user uploads a photo (in `saveUserImageForItem()`). Store the result in localStorage under key `storagePersistGranted`:

- `"true"` — granted; show a ✅ indicator in Settings
- `"false"` — denied; show a one-time soft warning in Settings ("Your browser may clear images under storage pressure — consider using Full Backup regularly")
- `null/missing` — not yet requested

Do not re-request after the first attempt. Chrome typically auto-grants for `staktrakr.com` due to engagement signals. On `file://`, behavior varies; silence any errors.

### 1.3 Storage Gauge (Settings Panel)

Add a new **"Image Storage"** sub-section to the Settings panel, below the existing storage/backup controls. Two rows:

```
Image Storage
─────────────────────────────────────────────────────
📷 Your Photos     ████████░░░░░░░░  42 MB    [Export] [Import]
🪙 Numista Cache   ██░░░░░░░░░░░░░░   8 MB             [Clear]

Persistent storage: ✅ Protected  (or ⚠️ Not protected)
```

**Data source:** `imageCache.getStorageUsage()` already returns per-store counts and byte sizes. Extend it to return `userImageBytes`, `userImageCount`, `numistaBytes`, `numistaCount` separately.

**Progress bar:** `used / _quotaBytes`, capped at 100%. Color: green < 70%, amber 70–90%, red > 90%.

**"Clear Numista Cache":** Deletes `coinImages` and `coinMetadata` IndexedDB stores only. Confirms with "Clear Numista reference images? Your own uploaded photos are not affected." Modal. Does not touch `userImages` or `patternImages`.

**Gauge refresh:** Computed once when Settings panel opens; not live-updating.

---

## Section 2: Data Model Foundation (Image Reuse)

### 2.1 Current Model

```
userImages store: { uuid (item UUID), obverse: Blob, reverse: Blob, cachedAt, size }
inventory item:   { ..., obverseImageUrl: string, reverseImageUrl: string }
```

`obverseImageUrl` / `reverseImageUrl` are either external HTTP URLs or ephemeral `blob://` object URLs created from IndexedDB blobs at display time.

### 2.2 Foundation Added Today

**`userImages` record gains one optional field:**

```js
{
  uuid,           // item UUID — primary key, unchanged
  obverse,        // Blob
  reverse,        // Blob | null
  cachedAt,
  size,
  sharedImageId,  // string | null — UUID of source image if this was tagged from another item
}
```

`sharedImageId` is `null` for all original uploads. In a future patch, when a user browses and selects an existing image for a new item, the system writes a new `userImages` record with `sharedImageId` pointing to the source item's UUID. **Blobs are copied, not referenced** — no foreign-key graph, clean deletes, simple import/export.

**Inventory item gains two optional fields:**

```js
{
  ...,
  obverseSharedImageId: string | null,  // source UUID if tagged from library
  reverseSharedImageId: string | null,
}
```

These fields travel with the item in backup and sync. They are ignored by the current codebase (no lookup logic today) but preserved on import. A future "browse/search/pick" modal will populate them.

### 2.3 Why Copy, Not Reference

- IndexedDB has no foreign keys — referential integrity would require manual bookkeeping
- Deleting or replacing an image for item A must not affect item B
- Export/import is straightforward: each manifest entry is self-contained
- Storage cost: a shared 150 KB WebP copied to 10 items = 1.5 MB — negligible at 500px
- If deduplication ever matters, it can be added in the "browse" patch without touching this schema

### 2.4 What the Future "Browse" Patch Adds (Not Built Today)

- A new `sharedImages` metadata index (not a store — just a view over `userImages` grouped by `sharedImageId` chains)
- A search/pick modal in the item edit form showing thumbnail grid of existing images
- Auto-populate `sharedImageId` on tag
- No UI changes to image display or deletion today

---

## Section 3: ZIP Image Export / Import

### 3.1 Library

**JSZip** (~100 KB minified, loaded from CDN). Added to `index.html` script load order and `sw.js` CORE_ASSETS. No build step required.

CDN URL: `https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js`

Graceful fallback: if JSZip fails to load, Export/Import buttons show "Unavailable (requires network to load ZIP library)" and are disabled.

### 3.2 ZIP Structure

```
staktrakr-images-2026-02-23.zip
├── manifest.json
└── images/
    ├── <item-uuid>-obv.webp
    ├── <item-uuid>-rev.webp
    └── ...
```

File naming: `<uuid>-obv.webp` and `<uuid>-rev.webp`. UUID is the item's `uuid` field. If a record has `sharedImageId`, the file name still uses the record's own `uuid` (the item it belongs to) — the `sharedImageId` appears in the manifest only.

### 3.3 `manifest.json` Schema

```json
{
  "version": "1.0",
  "exportedAt": "2026-02-23T22:00:00Z",
  "appVersion": "3.32.26",
  "totalImages": 183,
  "images": [
    {
      "imageId": "<item-uuid>",
      "itemUuid": "<item-uuid>",
      "itemName": "2023 ASE 1 oz Silver Eagle",
      "sharedImageId": null,
      "obverseFile": "images/<item-uuid>-obv.webp",
      "reverseFile": "images/<item-uuid>-rev.webp"
    }
  ]
}
```

- `imageId` — same as `itemUuid` today; will diverge in the future shared-images model if an image ID is decoupled from the item UUID
- `itemName` — human-readable label for the user browsing the ZIP; sourced from `inventory.find(i => i.uuid === record.uuid)?.name || "Unknown Item"`
- `sharedImageId` — `null` for original uploads; populated for tagged copies
- `reverseFile` — `null` if item has no reverse image

### 3.4 Export Flow

1. User clicks **Export** in the Settings storage gauge
2. Show a loading state ("Preparing export…")
3. Iterate all `userImages` records via `imageCache.getAllUserImages()` (new method)
4. For each record, add `<uuid>-obv.webp` and (if present) `<uuid>-rev.webp` to the ZIP
5. Cross-reference inventory array to populate `itemName` in manifest
6. Write `manifest.json`
7. Generate ZIP blob, trigger `<a download="staktrakr-images-YYYY-MM-DD.zip">` download

If `inventory` is not available for name lookup (edge case), use `imageId` as the name fallback.

### 3.5 Import Flow

1. User clicks **Import** in Settings, selects `.zip` file
2. Parse ZIP with JSZip; locate `manifest.json`
3. Validate: check `version === "1.0"`, check `appVersion` is parseable
4. Show preview: "Found 183 images for 183 items. This will add or replace images for matching items. Continue?"
5. For each manifest entry: read obverse blob + optional reverse blob from ZIP, call `imageCache.cacheUserImage(uuid, obvBlob, revBlob)`, write `sharedImageId` if present
6. Show result: "Imported 183 images. 0 errors."
7. Refresh storage gauge

**Conflict handling:** Import overwrites existing `userImages` for the same UUID. No merge prompt — the imported ZIP is treated as authoritative for the images it contains.

**Items not in current inventory:** Image is stored anyway (UUID key still valid). If the item was deleted, the image record becomes orphaned; it will be cleaned up by the existing orphan-purge logic in `CatalogManager.purgeOrphanedMappings()` (or a new equivalent for `userImages`).

---

## Section 4: Full Backup with Images

### 4.1 Existing Backup (Unchanged)

The current **"Backup"** button produces an AES-encrypted JSON file containing inventory + settings. This is unchanged.

### 4.2 New "Full Backup (with images)" Option

Add a second export button in the Backup section: **"Full Backup (with images)"**. Produces a ZIP:

```
staktrakr-full-backup-2026-02-23.zip
├── backup.enc              ← existing encrypted JSON backup, bit-for-bit identical
└── images/
    ├── manifest.json
    ├── <uuid>-obv.webp
    └── ...
```

The `backup.enc` is generated by the existing backup pipeline with no changes. The `images/` folder is the same as the standalone export (Section 3).

### 4.3 Import from Full Backup ZIP

The existing **"Restore"** flow accepts `.enc` files. Extend it to also accept `.zip` files:

1. Detect file type by extension (`.zip`) or by attempting JSZip parse
2. If ZIP: extract `backup.enc` and the `images/` folder
3. Restore `backup.enc` through the existing encrypted import pipeline (no changes)
4. If `images/` folder is present, run the image import flow (Section 3.5) after inventory is restored — order matters so `itemName` lookups work

### 4.4 Vault Sync (Deferred)

Dropbox vault sync stores inventory JSON in `vault.enc`. Embedding 50+ MB of image blobs in this JSON is not practical. Future design: store a parallel `vault-images.enc` in the same Dropbox folder, encrypted with the same vault key. The cloud sync code will need a second upload/download pass for this file. **This is not part of the current implementation.** A note will be left in `cloud-sync.js` and a Linear issue filed.

---

## Section 5: New Linear Issue

File **STAK-304** to track this feature batch. The implementation plan (from `writing-plans`) will break STAK-304 into sub-tasks.

---

## File Impact Summary

| File | Change |
|---|---|
| `js/image-cache.js` | Dynamic quota, `_initQuota()`, `getAllUserImages()`, `sharedImageId` field, `getStorageUsage()` per-store breakdown |
| `js/image-export.js` | **New file** — ZIP export/import logic (JSZip wrapper, manifest generation, import flow) |
| `js/events.js` | Call `navigator.storage.persist()` on first upload; write `sharedImageId: null` to new records |
| `js/settings.js` (or equivalent) | Storage gauge UI, Clear Numista button, Export/Import button wiring |
| `index.html` | JSZip script tag; storage gauge HTML in Settings panel |
| `sw.js` | Add `image-export.js` and JSZip CDN URL to CORE_ASSETS |
| `js/constants.js` | New storage key `STORAGE_PERSIST_GRANTED_KEY` in ALLOWED_STORAGE_KEYS; `IMAGE_ZIP_MANIFEST_VERSION` |
| `js/types.js` | JSDoc for `sharedImageId`, `obverseSharedImageId`, `reverseSharedImageId` |
| `js/inventory.js` | Preserve `obverseSharedImageId` / `reverseSharedImageId` through load/save cycles |
| `js/cloud-sync.js` | Comment: vault image sync deferred to future `vault-images.enc` patch |

---

## Out of Scope (Future Patches)

- **Vault image sync** (`vault-images.enc` in Dropbox)
- **Browse/search/pick image modal** in item edit form
- **Image deduplication** across items
- **`sharedImages` metadata index** for browsing
- **Orphan image cleanup UI** (images whose item UUID no longer exists in inventory)

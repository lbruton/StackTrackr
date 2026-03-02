---
title: Image Pipeline
category: frontend
owner: staktrakr
lastUpdated: v3.33.25
date: 2026-03-02
sourceFiles:
  - js/image-cache.js
  - js/image-processor.js
  - js/image-cache-modal.js
  - js/bulk-image-cache.js
  - js/seed-images.js
relatedPages:
  - storage-patterns.md
  - data-model.md
---

## Image Pipeline

> **Last updated:** v3.33.25 — 2026-03-02
> **Source files:** `js/image-cache.js`, `js/image-processor.js`, `js/image-cache-modal.js`, `js/bulk-image-cache.js`, `js/seed-images.js`

## Overview

StakTrakr stores item images entirely client-side using **IndexedDB** (database `StakTrakrImages`, version 3). There is no server-side image storage. Each item can have an obverse and a reverse image, sourced from two tiers: user uploads and pattern rule images. Resolution runs per-side independently via `imageCache.resolveImageUrlForItem(item, side)`.

Key design decisions:

- **IndexedDB, not localStorage** — blobs live in IDB; localStorage holds only metadata keys.
- **No raw uploads** — every image passes through `ImageProcessor` (resize → WebP/JPEG → byte-budget loop) before being stored.
- **Per-side cascade** — obverse and reverse resolve independently, so a user obverse + pattern reverse is a valid configuration.
- **Numista CDN URLs** are stored as plain strings on inventory items (`item.obverseImageUrl`, `item.reverseImageUrl`) — no blob is fetched or stored for CDN images.
- **`coinImages` IDB store** still exists in the schema (schema version 3) but is never read or written. It was deprecated in STAK-339 (v3.32.41). Do not add new code that touches it.

---

## Key Rules (read before touching this area)

- **Never** call `document.getElementById` for image elements — always use `safeGetElement()`.
- **Never** write directly to the `userImages` IDB store — always go through `imageCache.cacheUserImage()`.
- **Do not** assume obverse is always populated — reverse-only records are valid since v3.32.41.
- `resolveImageForItem()` is the legacy item-level function — use `resolveImageUrlForItem(item, side)` for per-side resolution in all new code.
- Always **revoke object URLs** after use — uncollected object URLs leak memory.
- Call `renderTable()` after any IDB write or thumbnails will not update.
- **Do not touch the `coinImages` store** — it is retained schema-only for migration safety.

---

## Architecture: Each File's Role

| File | Role |
|---|---|
| `js/image-cache.js` | IDB lifecycle, CRUD for all four stores, image resolution cascade, resize/compress pipeline |
| `js/image-processor.js` | Canvas-based resize → WebP/JPEG → iterative byte-budget enforcement |
| `js/image-cache-modal.js` | Settings UI for Numista bulk metadata sync: stats bar, eligible items table, activity log |
| `js/bulk-image-cache.js` | Batch metadata sync engine: resolves catalog IDs, calls Numista API, applies tags, sequential with rate-limit delay |
| `js/seed-images.js` | First-run demo: embeds base64 WebP images for two pattern rules (ASE + CML), loads them into IDB on first launch |

---

## IDB Storage Architecture

Database: **`StakTrakrImages`**, schema version **3**

| Store | Key | Value shape | Status |
|---|---|---|---|
| `userImages` | `uuid` (item UUID string) | `{ uuid, obverse: Blob, reverse: Blob\|null, sharedImageId: string\|null, cachedAt: number, size: number }` | **ACTIVE** |
| `patternImages` | `ruleId` (pattern rule ID string) | `{ ruleId, obverse: Blob\|null, reverse: Blob\|null, cachedAt: number, size: number }` | **ACTIVE** |
| `coinMetadata` | `catalogId` (Numista N# string) | Numista enrichment data (title, country, weight, tags, etc.) | **ACTIVE** |
| `coinImages` | `catalogId` | Legacy CDN blob cache | **LEGACY** — schema retained, never read or written (removed STAK-339, v3.32.41) |

### Storage quota

`ImageCache` dynamically calculates its quota on init:

```
quota = min(60% of available browser storage, 4 GB)
        with floor of min(available, 500 MB)
```

Default (when `navigator.storage.estimate` is unavailable, e.g. `file://`): **500 MB**.

The quota is stored in `this._quotaBytes` and is surfaced via `getStorageUsage().limitBytes`. It is advisory — IDB itself enforces the actual browser limit. When the browser's storage limit is hit, `put()` operations throw and `cacheUserImage()` returns `false`.

### Image constants (from `js/constants.js`)

| Constant | Value | Meaning |
|---|---|---|
| `IMAGE_MAX_DIM` | `500` px | Max width or height after resize |
| `IMAGE_QUALITY` | `0.75` | Initial compression quality (0–1) |
| `IMAGE_MAX_BYTES` | `512000` (500 KB) | Max output size per image side |

---

## Image Storage Format

All images are stored as **Blobs** inside IDB records. No base64 strings are stored in IDB (base64 is only used in `seed-images.js` as an embedded source format, immediately converted to a Blob before being written to IDB).

**User image record shape:**

```js
{
  uuid: "abc123...",          // item UUID — IDB key
  obverse: Blob,              // WebP or JPEG blob, max 500 KB
  reverse: Blob | null,       // null if only one side uploaded
  sharedImageId: string|null, // source UUID if copied from another item
  cachedAt: 1234567890123,    // Date.now() timestamp
  size: 102400                // (obverse.size + reverse.size) in bytes
}
```

**Pattern image record shape:**

```js
{
  ruleId: "seed-custom-img-0",  // pattern rule ID — IDB key
  obverse: Blob | null,
  reverse: Blob | null,
  cachedAt: 1234567890123,
  size: 15360
}
```

**Metadata record shape** (in `coinMetadata` store):

```js
{
  catalogId: "N12345",         // Numista N# — IDB key
  title: "...",
  country: "...",
  weight: 31.1,
  tags: [...],
  // + many more Numista fields
  cachedAt: 1234567890123
}
```

---

## image-cache.js: Caching Strategy and Retrieval

`ImageCache` is a singleton (`window.imageCache`) opened lazily on first use. The DB connection is guarded by `_ensureDb()` before every public operation, which probes the connection with a lightweight readonly transaction and reconnects if it is stale (browser can close IDB connections under storage pressure or tab backgrounding).

### Image resolution cascade

```
imageCache.resolveImageUrlForItem(item, side)  // 'obverse' | 'reverse'
```

Per-side resolution order:

| Priority | Source | Lookup |
|---|---|---|
| 1 | User upload | `userImages[item.uuid][side]` |
| 2 | Pattern rule image | `patternImages[NumistaLookup.matchQuery(item.name).rule.seedImageId][side]` |
| 3 (not IDB) | Numista CDN URL | `item.obverseImageUrl` / `item.reverseImageUrl` (string on item, not from IDB) |

Returns a **object URL** (caller must revoke) or `null`. The CDN URL step is handled by the caller (viewModal, inventory, card-view), not by the cascade function itself — `resolveImageUrlForItem` returns null at step 3 and callers fall back to the string URL directly.

### Key public methods

| Method | Description |
|---|---|
| `imageCache.init()` | Opens/creates IDB. Safe to call multiple times. |
| `imageCache.isAvailable()` | Returns `true` if IDB is open and accessible. |
| `imageCache.cacheUserImage(uuid, obverse, reverse, sharedImageId)` | Write user upload blobs to `userImages`. |
| `imageCache.getUserImage(uuid)` | Read the full user image record. |
| `imageCache.getUserImageUrl(uuid, side)` | Read and return an object URL for one side. |
| `imageCache.deleteUserImage(uuid)` | Delete user image record. |
| `imageCache.cachePatternImage(ruleId, obverseBlob, reverseBlob)` | Write pattern image blobs. |
| `imageCache.getPatternImage(ruleId)` | Read the full pattern image record. |
| `imageCache.getPatternImageUrl(ruleId, side)` | Read and return an object URL for one side. |
| `imageCache.deletePatternImage(ruleId)` | Delete pattern image record. |
| `imageCache.cacheMetadata(catalogId, numistaResult)` | Write Numista metadata. |
| `imageCache.getMetadata(catalogId)` | Read Numista metadata. |
| `imageCache.deleteMetadata(catalogId)` | Delete Numista metadata. |
| `imageCache.resolveImageForItem(item)` | Legacy per-item resolver — returns `{catalogId, source}`. Prefer `resolveImageUrlForItem`. |
| `imageCache.resolveImageUrlForItem(item, side)` | Per-side URL resolver — returns object URL or null. |
| `imageCache.getStorageUsage()` | Detailed byte/count breakdown across all stores. |
| `imageCache.clearAll()` | Wipe all four IDB stores. |
| `imageCache.exportAllMetadata()` | Dump all `coinMetadata` records (ZIP backup). |
| `imageCache.exportAllUserImages()` | Dump all `userImages` records (ZIP backup). |
| `imageCache.exportAllPatternImages()` | Dump all `patternImages` records (ZIP backup). |
| `imageCache.importMetadataRecord(record)` | Restore one metadata record from ZIP. |
| `imageCache.importUserImageRecord(record)` | Restore one user image record from ZIP. |
| `imageCache.importPatternImageRecord(record)` | Restore one pattern image record from ZIP. |

### Internal resize/compress path

When storing a blob (not a URL), `_resizeAndCompress(source)` delegates to `imageProcessor.processFile()` when available. If `ImageProcessor` throws (e.g. WebP encoding failure), it falls back to an inline Canvas JPEG resize using the same `_maxDim` and `_quality` constants.

---

## image-processor.js: Resize, Compression, Format Conversion

`ImageProcessor` is a singleton (`window.imageProcessor`). It is the authoritative resize/compress pipeline for all image writes.

### Processing pipeline

```
processFile(file, opts)
  → createImageBitmap(file)      -- decode to bitmap
  → _processSource(bitmap, opts)
      → scale dimensions (maxDim, maintain aspect ratio)
      → draw to Canvas
      → supportsWebP()           -- cached detection (1px canvas probe)
      → format = 'image/webp' | 'image/jpeg'
      → iterative quality loop:
          while (blob.size > maxBytes && quality > minQuality)
              quality -= qualityStep
              re-encode
      → return { blob, width, height, originalSize, compressedSize, format }
```

### Default parameters

| Parameter | Default | Source |
|---|---|---|
| `maxDim` | `500` px | `IMAGE_MAX_DIM` from `js/constants.js` |
| `quality` | `0.75` | `IMAGE_QUALITY` from `js/constants.js` |
| `maxBytes` | `512000` (500 KB) | `IMAGE_MAX_BYTES` from `js/constants.js` |
| `qualityStep` | `0.05` | Hardcoded constructor default |
| `minQuality` | `0.30` | Hardcoded constructor default |

All parameters can be overridden per-call via the `opts` argument.

### WebP detection

`supportsWebP()` probes by calling `canvas.toBlob(..., 'image/webp')` on a 1×1 canvas. The result is cached after the first call. All images are encoded as WebP when supported; JPEG is used on browsers that do not support WebP canvas encoding (rare in 2026).

### Key public methods

| Method | Description |
|---|---|
| `imageProcessor.processFile(file, opts)` | Main entry: File/Blob → compressed Blob |
| `imageProcessor.processFromUrl(url, opts)` | Fetch URL + process (CORS required) |
| `imageProcessor.createPreview(blob)` | Wrap blob in object URL for preview display |
| `imageProcessor.estimateStorage(blob)` | Returns `blob.size` (used for quota checks) |
| `imageProcessor.supportsWebP()` | Detect WebP canvas encoding support |

---

## image-cache-modal.js: Settings UI for Numista Sync

This file is **not** a modal in the traditional sense — it is the inline Numista sync panel rendered inside **Settings > API > Numista**. It has no dedicated `<dialog>` element.

### Components

| Function | Element | Description |
|---|---|---|
| `renderNumistaSyncUI()` | `#numistaSyncStats` + `#numistaSyncTableContainer` | Entry point: renders stats bar + eligible items table |
| `renderSyncStats()` | `#numistaSyncStats` | Shows "N API cache · M eligible" counts |
| `renderEligibleItemsTable()` | `#numistaSyncTableContainer` | Table of N#-linked items with cache status and action buttons |
| `startBulkSync()` | `#numistaSyncStartBtn`, `#numistaSyncCancelBtn`, `#numistaSyncProgress` | Triggers `BulkImageCache.cacheAll()`, wires progress/log callbacks |
| `clearAllCachedData()` | — | Confirms then calls `imageCache.clearAll()` |
| `logSyncActivity(message, type)` | `#numistaSyncLog` | Appends timestamped monospaced log lines |
| `updateStatusCell(catalogId, text, color)` | `_statusCells` Map | Live-updates per-row status during bulk sync |
| `resyncCachedEntry(catalogId)` | — | Deletes metadata then re-fetches from Numista API for one entry |

### Status cell tracking

`_statusCells` is a `Map<catalogId, HTMLElement>` rebuilt every time `renderEligibleItemsTable()` runs. It enables `BulkImageCache.cacheAll()`'s `onLog` callback to update individual row status cells in real time without re-rendering the whole table.

---

## bulk-image-cache.js: Batch Metadata Sync

`BulkImageCache` is an IIFE singleton (`window.BulkImageCache`). It syncs **Numista metadata** (not image blobs) for all inventory items that have a Numista catalog ID. Image downloading is intentionally excluded — images are loaded on-demand when the user opens the view modal.

### Catalog ID resolution

`resolveCatalogId(item)` checks in order:

1. `item.numistaId` (direct)
2. `catalogManager.getCatalogId(item.serial)` (fallback for catalogManager-mapped items)

### Eligible list

`buildEligibleList()` iterates the full inventory and returns `[{item, catalogId}]` deduplicated by catalog ID (one entry per unique N#, even if multiple items share the same N#).

### `cacheAll(opts)` loop

```
buildEligibleList()
for each { item, catalogId }:
  1. Repair malformed obverse/reverse URLs on the item (clear empty strings)
  2. Check if metadata already cached (imageCache.getMetadata)
  3. If cached + URLs present → apply tags from cache → skip
  4. Try local provider cache (free, no API call)
  5. Fall back to catalogAPI.lookupItem(catalogId) (Numista API)
  6. Write metadata to IDB (imageCache.cacheMetadata)
  7. Apply Numista tags to all items sharing this catalogId
  8. Wait `delay` ms (default 200 ms) before next item
post-loop:
  saveItemTags()    -- if any tags were written
  saveInventory()   -- if any URLs were written back to items
```

A pre-built `Map<catalogId, uuid[]>` enables O(1) tag application per catalog ID across all inventory items sharing the same N#.

### Abort

`BulkImageCache.abort()` sets an `_aborted` flag checked at the top of each loop iteration. The running operation finishes its current item before stopping.

### Public API

| Method | Description |
|---|---|
| `BulkImageCache.cacheAll(opts)` | Run the full batch metadata sync |
| `BulkImageCache.abort()` | Cancel a running sync |
| `BulkImageCache.isRunning()` | Returns true if a sync is active |
| `BulkImageCache.buildEligibleList()` | Returns the deduplicated N#-linked item list |
| `BulkImageCache.resolveCatalogId(item)` | Resolve catalog ID for one item |

---

## seed-images.js: Default Images for First-Time Users

`seed-images.js` provides a first-run demo experience. On first launch, it creates two custom pattern rules (American Silver Eagle and Canadian Gold Maple Leaf) with real coin photos embedded as base64 WebP data URIs. These appear in **Settings > Images > Custom Pattern Rules** where users can interact with them (edit, delete, export) to learn the pattern image feature before uploading their own images.

### How it works

```
loadSeedImages()   // called at app init
  1. Guard: requires imageCache + NumistaLookup to be available
  2. Check localStorage 'seedImagesVer' against SEED_IMAGES_VERSION
     → if already loaded at current version, return immediately
  3. For each entry in SEED_CUSTOM_RULES:
     a. Convert base64 data URI → Blob (dataUriToBlob)
     b. NumistaLookup.addRule(pattern, replacement, numistaId, seedImageId)
     c. imageCache.cachePatternImage(seedImageId, obvBlob, revBlob)
  4. localStorage.setItem('seedImagesVer', SEED_IMAGES_VERSION)
```

### Key constants and structures

| Identifier | Description |
|---|---|
| `SEED_IMAGES_VERSION` | Version string (currently `'1'`). Bump this to force a re-load of seed images on existing installs. |
| `SEED_CUSTOM_RULES` | Array of `{pattern, replacement, numistaId, obverse, reverse}` entries. `obverse` and `reverse` are base64 WebP data URIs embedded in the source file. |
| `dataUriToBlob(dataUri)` | Converts a base64 data URI to a Blob. |
| `loadSeedImages()` | Entry point, exposed as `window.loadSeedImages`. |

### Seed image IDs

Each rule gets a deterministic `seedImageId` of the form `seed-custom-img-{i}` (zero-indexed). These IDs are used as keys in the `patternImages` IDB store. They appear in pattern rule objects as `rule.seedImageId` and are referenced by the image resolution cascade.

### Version gating

Seed image loading is gated by `localStorage` key `seedImagesVer`. If the stored version matches `SEED_IMAGES_VERSION`, the function returns immediately (no IDB writes, no rule creation). To update demo images: replace the base64 data URIs in `SEED_CUSTOM_RULES` and increment `SEED_IMAGES_VERSION`. Existing users will get the new images on their next app load.

---

## Storage Limits and Overflow Behavior

The effective quota is computed dynamically at IDB init (see image-cache.js quota section above). When the limit is approached or exceeded:

- `imageCache.cacheUserImage()` returns `false` if the IDB `put()` throws.
- `imageProcessor.processFile()` iteratively reduces quality (down to `minQuality = 0.30`) before giving up — this reduces the chance of hitting the limit on individual images.
- No automatic eviction is performed. The user must manually clear cached data via the **Settings > API > Numista** panel (Clear Cache button, which calls `clearAllCachedData()`).
- `getStorageUsage()` returns a breakdown by store (`numistaBytes`, `userImageBytes`, `patternImageBytes`, `metadataBytes`, `totalBytes`, `limitBytes`) for display in the settings footer.

---

## Bulk Operations

### Backup / restore (ZIP)

All three active IDB stores participate in ZIP backup:

| Direction | Method |
|---|---|
| Export metadata | `imageCache.exportAllMetadata()` → array of records |
| Export user images | `imageCache.exportAllUserImages()` → array of records |
| Export pattern images | `imageCache.exportAllPatternImages()` → array of records |
| Import metadata | `imageCache.importMetadataRecord(record)` |
| Import user images | `imageCache.importUserImageRecord(record)` |
| Import pattern images | `imageCache.importPatternImageRecord(record)` |

### Bulk metadata sync

Triggered from Settings via `startBulkSync()` → `BulkImageCache.cacheAll()`. See the bulk-image-cache.js section for loop details. Image blobs are not downloaded during bulk sync — only metadata. Images are fetched on demand when the user opens the view modal.

### Clear all

`imageCache.clearAll()` wipes all four IDB stores (including the legacy `coinImages` store) in a single multi-store transaction.

---

## Common Mistakes

| Mistake | Correct approach |
|---|---|
| `document.getElementById('img-el')` | `safeGetElement('img-el')` |
| Writing directly to `userImages` IDB | `imageCache.cacheUserImage(uuid, obvBlob, revBlob)` |
| Assuming obverse is always set | Always null-check both sides; reverse-only records are valid since v3.32.41 |
| Using `resolveImageForItem()` (legacy) | `resolveImageUrlForItem(item, side)` for per-side resolution |
| Not revoking object URLs | Track URLs in an array, call `URL.revokeObjectURL()` on cleanup |
| IDB write without `renderTable()` | Always call `renderTable()` after writes so thumbnails refresh |
| Touching `coinImages` IDB store | Store is legacy — do not read or write it |
| Storing base64 strings in IDB | Always convert to Blob first (`dataUriToBlob`); IDB stores Blobs, not base64 |
| Assuming WebP is always used | `ImageProcessor` falls back to JPEG when browser does not support WebP canvas encoding |
| Running `BulkImageCache.cacheAll()` twice concurrently | Check `BulkImageCache.isRunning()` before calling `cacheAll()` |

---

## Version History

| Version | Ticket | Change |
|---|---|---|
| v3.32.42 | — | Pattern rule promotion reads from existing per-item `userImages` IDB when no pending blobs are in memory; per-item record deleted after promotion (two-session workflow fix) |
| v3.32.41 | STAK-339 | Removed `coinImages` layer; per-side cascade; `cacheUserImage` accepts reverse-only records; `ignorePatternImages` UI hidden, field preserved |
| v3.32.40 | STAK-337 | Fixed race condition in `cacheImages` re-render |
| v3.32.39 | STAK-333 | Fixed CDN URL writeback; added per-item pattern opt-out flag (`ignorePatternImages`) |

---

## Related Pages

- [Storage Patterns](storage-patterns.md) — `saveData()`/`loadData()` wrappers, `ALLOWED_STORAGE_KEYS`, localStorage conventions
- [Data Model](data-model.md) — Item schema, `obverseImageUrl`/`reverseImageUrl` fields, storage patterns, spot state

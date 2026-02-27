# Image Pipeline Simplification — Design

**Date:** 2026-02-25
**Issues:** STAK-339, STAK-311 (follow-up), general image pipeline tech debt
**Approach:** Remove coinImages IDB cache layer entirely

## Problem

The `coinImages` IndexedDB store caches blob copies of Numista CDN thumbnails locally. This was designed before CDN URLs were stored on inventory items. Now both exist — a blob in IDB AND a URL string on the item — creating dual-source ambiguity that has caused STAK-309, STAK-311, STAK-332, STAK-333, and STAK-339.

The coinImages store is the single largest source of image pipeline bugs because:
1. Cache invalidation is manual and error-prone
2. Stale blobs get served over fresh CDN URLs
3. `resyncCachedEntry()` writes CDN URLs back to inventory items (mutation side-effect)
4. Pattern image override interactions create race conditions

## Solution

Remove the `coinImages` step from the image resolution cascade entirely.

### New Cascade (4 steps, was 5)

```
1. User upload (userImages[uuid])        — per-item photos from camera/file picker
2. Pattern image (patternImages[ruleId]) — if !item.ignorePatternImages
3. CDN URL (item.obverseImageUrl)        — Numista thumbnail URL stored on item
4. Metal-themed SVG placeholder          — gold/silver/platinum/palladium colors
```

### What Stays
- `userImages` IDB store — per-item user photos (keyed by UUID)
- `patternImages` IDB store — shared pattern rule images (keyed by ruleId)
- `coinMetadata` IDB store — Numista enrichment data (denomination, weight, composition, etc.)
- `coinImages` IDB object store definition — left in schema (v3 unchanged) but never read/written
- All CDN URL handling — `obverseImageUrl`/`reverseImageUrl` on inventory items

### What Gets Removed
- `cacheImages()` method and all 3 callers (viewModal.js, catalog-api.js, settings-listeners.js)
- `getImages()`, `getImageUrl()`, `hasImages()` methods
- `_checkNumistaCache()` step in `resolveImageForItem()`
- Background cache trigger in `loadViewImages()` (viewModal.js)
- CDN blob download in ZIP export (settings-listeners.js) — export CDN URLs as strings instead
- `resyncCachedEntry()` blob operations in image-cache-modal.js

### Impact Report — Files

| File | Change |
|------|--------|
| `js/image-cache.js` | Remove `cacheImages`, `getImages`, `getImageUrl`, `hasImages`, `_fetchAndResize` (if only used by cacheImages). Update `resolveImageForItem` cascade. |
| `js/viewModal.js` | Remove `cacheImages()` triggers (lines ~109, 116). Simplify `loadViewImages` to: user → pattern → CDN URL. |
| `js/inventory.js` | Table thumb: remove numista IDB step, CDN URL is already the fallback. Edit modal: simplify preview resolution. |
| `js/card-view.js` | Remove `_checkNumistaCache` from card image loading. CDN URL path already works. |
| `js/catalog-api.js` | Remove `cacheImages()` call after Numista form fill (~line 2028). |
| `js/settings-listeners.js` | Remove ZIP export CDN-from-IDB path. If CDN export is needed, fetch directly or just store URLs. |
| `js/image-cache-modal.js` | `resyncCachedEntry()`: remove blob purge/re-cache. Keep metadata resync. |
| `js/bulk-image-cache.js` | Already metadata-only — minimal or no changes. |

### STAK-339 Fix

The specific edge case (removing one image while keeping the other, with Numista sync) is fixed by this simplification because:
- No more coinImages blob getting re-injected after partial removal
- CDN URL on the item is the single source of truth for Numista images
- User can clear one URL without a cached blob overriding the removal
- Pattern images respect `ignorePatternImages` flag (already implemented in v3.32.39)

### Offline Considerations

CDN URLs require network. For users who need offline viewing:
- User uploads (IDB blobs) work offline — unaffected
- Pattern images (IDB blobs) work offline — unaffected
- Numista thumbnails will show placeholder offline instead of cached blob
- This is acceptable: the app requires network for spot prices anyway

### Rollback Plan

If issues discovered:
1. Code is in a patch branch — revert the PR
2. IDB schema unchanged — no data migration needed
3. coinImages data still exists in IDB for users who had it — just not read

## Non-Goals

- No changes to `userImages` or `patternImages` stores
- No changes to `coinMetadata` store
- No IDB schema version bump
- No changes to image upload/download UI
- No changes to pattern image matching logic
- STAK-336 and STAK-338 are separate patches

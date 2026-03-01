---
title: "Image Pipeline"
category: infrastructure
owner: staktrakr-api
lastUpdated: v3.32.42
date: 2026-02-25
sourceFiles: []
relatedPages:
  - health.md
  - spot-pipeline.md
  - fly-container.md
---

# Image Pipeline

> **Last updated:** v3.32.42 — 2026-02-25
> **Source files:** `js/image-cache.js`, `js/image-processor.js`, `js/events.js`, `js/viewModal.js`, `js/inventory.js`, `js/card-view.js`, `js/bulk-image-cache.js`, `js/image-cache-modal.js`

## Overview

StakTrakr stores item images entirely client-side using IndexedDB (database `StakTrakrImages`, version 3). There is no server-side image storage. Each item can have an obverse and a reverse image, sourced from three tiers: user uploads, pattern rule images, and Numista CDN URLs. The resolution cascade resolves each side independently.

The pipeline was significantly refactored in v3.32.41 (STAK-339): the legacy `coinImages` IDB store was removed, and image resolution became per-side rather than per-item.

---

## Key Rules (read before touching this area)

- **Never** call `document.getElementById` for image elements — always use `safeGetElement()`.
- **Never** write directly to the `userImages` IDB store — always go through `imageCache.cacheUserImage()`.
- **Do not** assume obverse is always populated — v3.32.41 allows reverse-only records.
- `resolveImageForItem()` is the legacy item-level function — use `resolveImageUrlForItem(item, side)` for per-side resolution.
- Always revoke object URLs after use or you will leak memory.
- Call `renderTable()` after any IDB write or thumbnails will not update.

---

## IDB Storage Architecture

Database: **`StakTrakrImages`**, version **3**

| Store | Key | Value shape | Status |
|---|---|---|---|
| `userImages` | `uuid` (item UUID) | `{ uuid, obverse: Blob, reverse: Blob, cachedAt, size, sharedImageId }` | ACTIVE |
| `patternImages` | `ruleId` | `{ ruleId, obverse: Blob, reverse: Blob }` | ACTIVE |
| `coinMetadata` | `catalogId` (Numista N#) | Numista enrichment data | ACTIVE |
| `coinImages` | `catalogId` | Legacy cached CDN blobs | LEGACY — schema retained, never read or written (removed in STAK-339, v3.32.41) |

The `coinImages` store still exists in the schema to avoid migration complexity, but no code reads from or writes to it. Do not add new code that touches it.

---

## Image Resolution Cascade

Each side (obverse and reverse) is resolved **independently** using:

```
imageCache.resolveImageUrlForItem(item, side)   // side = 'obverse' | 'reverse'
```

Located in `js/image-cache.js`. Resolution order per side:

| Priority | Source | Detail |
|---|---|---|
| 1 | User upload | `userImages[uuid][side]` — blob stored in IDB |
| 2 | Pattern rule image | `patternImages[ruleId][side]` — shared blob for all matching items |
| 3 | Numista CDN URL | `item.obverseImageUrl` / `item.reverseImageUrl` — string URL on inventory item |
| 4 | Placeholder | Empty slot — no image shown |

**Important:** Because resolution is per-side, uploading only an obverse leaves the reverse on its own cascade step (pattern or CDN). There is no requirement for both sides to come from the same source.

Prior to v3.32.41 this was a single item-level resolution that returned one source for both sides. The old function `resolveImageForItem()` still exists for backward compatibility but should not be used in new code.

---

## Upload Flow

1. **File selection** — User picks an image file in the edit form (obverse or reverse slot).
2. **Resize/compress** — `js/image-processor.js` resizes and compresses the file to a JPEG blob. No raw uploads are stored.
3. **Pending blob** — The compressed blob is held in memory as `_pendingObverseBlob` or `_pendingReverseBlob` inside `js/events.js`. Nothing is written to IDB yet.
4. **Form save** — On save, `saveUserImageForItem(uuid)` in `js/events.js`:
   - Reads any existing IDB record for this UUID so the other side is preserved (partial upload keeps the untouched side).
   - Calls `imageCache.cacheUserImage(uuid, obvBlob, revBlob)` — either blob argument may be `null`; v3.32.41 accepts reverse-only records.
   - Calls `renderTable()` to refresh displayed thumbnails immediately.
5. **IDB write** — `cacheUserImage()` writes the merged record to `userImages`.

```
User selects file
  → image-processor.js (resize/compress → JPEG blob)
  → _pendingObverseBlob / _pendingReverseBlob (events.js in-memory)
  → form save triggers saveUserImageForItem(uuid)
      → reads existing IDB record (preserve untouched side)
      → imageCache.cacheUserImage(uuid, obvBlob, revBlob)
          → writes to userImages IDB store
      → renderTable()
```

**Deletion** is also handled in `js/events.js`. Deleting a side calls `imageCache.deleteUserImageSide(uuid, side)`, which merges a null blob into the existing record and writes back. If both sides become null the record is removed entirely.

---

## Pattern Rules

Pattern rules let a single image cover many items that share a name pattern.

- Defined in **Settings → Images → Pattern Rules**.
- Each rule matches by item name keywords or regex and carries a `seedImageId`.
- `NumistaLookup.matchQuery(item.name)` returns the first matching rule for an item name.
- Pattern images are stored in `patternImages` IDB by `ruleId` — one blob record shared across all matching items.
- User uploads **always override pattern** on a per-side basis: uploading an obverse replaces the pattern obverse for that item, while the pattern reverse still shows for that item's reverse slot.
- Items have an `ignorePatternImages` flag for opting out at the item level. The UI for this flag is hidden in v3.32.41 but the data field is preserved for future per-slot control.
- Pattern rule UI wiring lives in `js/settings-listeners.js`.
- **Pattern rule promotion (`imagePatternToggle`)** reads from the existing per-item `userImages` IDB record when no pending blobs are in memory — this supports two-session workflows (upload → save → re-open → promote). After promotion the per-item `userImages` record is deleted so the item falls through to the shared pattern image on future resolution.

---

## Numista CDN URLs

- Stored as plain strings directly on inventory items: `item.obverseImageUrl` and `item.reverseImageUrl`.
- Populated when the user assigns a Numista result via the N# picker, or during a bulk Numista import.
- Refreshed only on an explicit Numista API action — not on every page load.
- No IDB blob is stored for CDN images; the string URL is used directly in `<img src>`.
- Serve as cascade step 3 — used when no user upload or pattern image exists for that side.
- CDN URL writeback was fixed in v3.32.39 (STAK-333).

---

## Rendering (Table / Card / View Modal)

### Table thumbnails

`js/inventory.js` → `_loadThumbImage(item, side)`

- Calls `resolveImageUrlForItem(item, side)` for each side.
- Creates an object URL from any returned blob.
- Caller is responsible for revoking object URLs after the thumbnail is no longer displayed.
- `renderTable()` must be called after any IDB write for thumbnails to update.

### Card thumbnails

`js/card-view.js` → `_loadCardImage(item, side)`

- Same pattern as table thumbnails.
- Object URLs created per card, revoked when the card is removed from DOM.

### View modal

`js/viewModal.js` → `loadViewImages(item, container)`

- Calls `resolveImageUrlForItem(item, 'obverse')` and `resolveImageUrlForItem(item, 'reverse')` independently.
- Falls back to CDN URLs on the item (`item.obverseImageUrl` / `item.reverseImageUrl`) if both sides return null from IDB (defensive fallback, cascade should already have returned these).
- Object URLs are tracked in `_viewModalObjectUrls` array and revoked on modal close to prevent memory leaks.

---

## Common Mistakes

| Mistake | Correct approach |
|---|---|
| `document.getElementById('img-el')` | `safeGetElement('img-el')` |
| Direct IDB write to `userImages` | `imageCache.cacheUserImage(uuid, obvBlob, revBlob)` |
| Assuming obverse is always set | Always null-check both sides; reverse-only records are valid since v3.32.41 |
| Using `resolveImageForItem()` (legacy) | Use `resolveImageUrlForItem(item, side)` |
| Not revoking object URLs | Track URL in array and call `URL.revokeObjectURL()` when done |
| IDB write without `renderTable()` | Always call `renderTable()` after writes so thumbnails refresh |
| Touching `coinImages` IDB store | Store is legacy — do not add code that reads or writes it |

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

- [health.md](health.md) — API and poller health checks
- [spot-pipeline.md](spot-pipeline.md) — Spot price data pipeline
- [fly-container.md](fly-container.md) — Fly.io container management

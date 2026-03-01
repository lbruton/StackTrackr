# Image Pipeline Simplification — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the `coinImages` IDB cache layer from the image resolution cascade, eliminating the root cause of STAK-309/311/332/333/339 and simplifying the pipeline to: user upload → pattern image → CDN URL → placeholder.

**Architecture:** The `coinImages` store cached blob copies of Numista CDN thumbnails locally. This was designed before CDN URLs were stored on inventory items. Now both exist, creating dual-source bugs. We remove all `coinImages` reads/writes, the `numistaOverridePersonal` toggle (no longer meaningful without cached blobs to prioritize), and the ZIP export CDN-from-IDB path. The IDB schema stays at v3 — we just stop using the store.

**Tech Stack:** Vanilla JS, IndexedDB, no build step

**Design doc:** `docs/plans/2026-02-25-image-pipeline-simplification-design.md`

**File Touch Map:**

| Action | File | Scope |
|--------|------|-------|
| MODIFY | `js/image-cache.js` | Remove `cacheImages`, `getImages`, `getImageUrl`, `hasImages`, `_fetchAndResize`, `_checkNumistaCache`. Update `resolveImageForItem` and `resolveImageUrlForItem`. |
| MODIFY | `js/viewModal.js` | Remove `cacheImages()` calls (lines 109, 116). Remove `numistaOverride` logic (lines 97-98). Simplify `shouldReplaceWithApi`. |
| MODIFY | `js/inventory.js` | Remove `numistaOverride` from `_loadThumbImage` (line 1455). |
| MODIFY | `js/card-view.js` | Remove `numistaOverride` from `_loadCardImage` (line 995). |
| MODIFY | `js/catalog-api.js` | Remove `cacheImages()` call (lines 2028-2032). Keep `cacheMetadata`. |
| MODIFY | `js/settings-listeners.js` | Remove `includeCdn` ZIP export IDB path (lines 908-934). Remove `_restoreCdnFolderFromZip` (lines 948-978). Remove `numistaOverrideToggle` wiring (line 827-829). |
| MODIFY | `js/image-cache-modal.js` | Remove blob operations from `resyncCachedEntry()`. Keep metadata resync. |
| MODIFY | `js/settings.js` | Remove `numistaOverrideToggle` sync (line 65) and label entry (line 1953). |
| MODIFY | `js/constants.js` | Remove `numistaOverridePersonal` from `ALLOWED_STORAGE_KEYS`. |
| MODIFY | `index.html` | Remove Numista override settings card (lines 3100-3107). |
| MODIFY | `tests/numista-regression.spec.js` | Update tests that reference coinImages behavior. |

---

## Task Table

| ID | Step | Est | Files | Validation | Risk/Notes | Agent |
|----|------|-----|-------|------------|------------|-------|
| T1 | Remove `coinImages` methods from `image-cache.js` | 5 | `js/image-cache.js` | App loads, no console errors | Core change — drives everything else | Claude |
| T2 | Simplify `resolveImageForItem` cascade | 3 | `js/image-cache.js` | `resolveImageForItem` returns user/pattern/null only | Removes `_checkNumistaCache` | Claude |
| T3 | Update `resolveImageUrlForItem` | 2 | `js/image-cache.js` | No `getImageUrl` calls remain | Simple routing change | Claude |
| T4 | Remove `cacheImages` calls from `viewModal.js` | 3 | `js/viewModal.js` | View modal shows CDN URLs directly for Numista items | Keep metadata caching | Claude |
| T5 | Remove `numistaOverride` from table/card/view | 3 | `js/inventory.js`, `js/card-view.js`, `js/viewModal.js` | Table/card thumbnails still resolve correctly | CDN URL fallback already exists | Claude |
| T6 | Remove `cacheImages` from catalog-api fill | 2 | `js/catalog-api.js` | Fill form still works, metadata still cached | Keep `cacheMetadata` call | Claude |
| T7 | Remove CDN ZIP export/import IDB paths | 3 | `js/settings-listeners.js` | Image ZIP export still works for user/pattern images | CDN images no longer exported as blobs | Claude |
| T8 | Remove `numistaOverride` toggle from settings | 3 | `index.html`, `js/settings.js`, `js/settings-listeners.js`, `js/constants.js` | Settings page loads cleanly, no orphan toggle | UI + storage key cleanup | Claude |
| T9 | Clean up `image-cache-modal.js` resync | 2 | `js/image-cache-modal.js` | Resync button still works (metadata only) | Remove blob purge/re-cache | Claude |
| T10 | Update regression tests | 3 | `tests/numista-regression.spec.js` | Tests pass | May need new assertions for CDN-only flow | Claude |
| T11 | Manual QA checklist | 5 | — | All image scenarios render correctly | Human verification | Human |
| T12 | Version bump + commit | 3 | 7 version files | `git log` shows commit | Use `/release patch` | Claude |

---

## Task Details

### Task T1: Remove coinImages methods from image-cache.js ← NEXT

**Files:**
- Modify: `js/image-cache.js:150-270` (remove `cacheImages`, `getImages`, `getImageUrl`, `hasImages`)
- Modify: `js/image-cache.js:776+` (remove `_fetchAndResize` if only used by `cacheImages`)

**Step 1: Remove `cacheImages()` method** (lines 150-183)
Delete the entire method. It fetches CDN images, resizes them, and stores blobs in `coinImages`.

**Step 2: Remove `getImages()` method** (lines 224-244)
Delete — reads blob records from `coinImages` store.

**Step 3: Remove `getImageUrl()` method** (lines 246-257)
Delete — creates object URL from `getImages()` blob.

**Step 4: Remove `hasImages()` method** (lines 259-268)
Delete — checks if `coinImages` has a record for a catalogId.

**Step 5: Check if `_fetchAndResize()` is used elsewhere**
Search for callers. If only `cacheImages` calls it, remove it too (line 776+).

**Step 6: Verify app loads without console errors**
Open `index.html` in browser, check console.

---

### Task T2: Simplify resolveImageForItem cascade

**Files:**
- Modify: `js/image-cache.js:460-522`

**Step 1: Remove `_checkNumistaCache` helper** (lines 494-501)

**Step 2: Remove numista branch from both cascade paths** (lines 503-519)
The cascade becomes:
```javascript
// Default: user uploads → pattern rules
const user = await _checkUserImage();
if (user) return user;
const pattern = await _checkPatternImage();
if (pattern) return pattern;
return null;
```

**Step 3: Remove `numistaOverride` localStorage read** (line 466)
No longer needed — there's no "Numista wins" mode without cached blobs.

---

### Task T3: Update resolveImageUrlForItem

**Files:**
- Modify: `js/image-cache.js:532-544`

**Step 1: Remove the `numista` source routing** (line 543)
After the change, only `user` and `pattern` sources exist:
```javascript
async resolveImageUrlForItem(item, side = 'obverse') {
    const normalizedSide = side === 'reverse' ? 'reverse' : 'obverse';
    const resolved = await this.resolveImageForItem(item);
    if (!resolved) return null;
    if (resolved.source === 'user') {
      return this.getUserImageUrl(resolved.catalogId, normalizedSide);
    }
    if (resolved.source === 'pattern') {
      return this.getPatternImageUrl(resolved.catalogId, normalizedSide);
    }
    return null;
}
```

---

### Task T4: Remove cacheImages calls from viewModal.js

**Files:**
- Modify: `js/viewModal.js:94-118`

**Step 1: Remove the `cacheImages` calls at lines 108-110 and 115-117**

The view modal should still:
- Show CDN URLs directly from the API result when no user/pattern image exists
- Cache metadata (keep `loadViewNumistaData` call at line 126)

After change, lines 94-118 become:
```javascript
if (shouldReplaceWithApi && apiResult && (apiResult.imageUrl || apiResult.reverseImageUrl)) {
    const section = body.querySelector('#viewImageSection');
    if (section) {
      const slots = section.querySelectorAll('.view-image-slot');
      if (apiResult.imageUrl) _setSlotImage(slots[0], apiResult.imageUrl);
      if (apiResult.reverseImageUrl) _setSlotImage(slots[1], apiResult.reverseImageUrl);
    }
}
```

---

### Task T5: Remove numistaOverride from table/card/view

**Files:**
- Modify: `js/inventory.js:1455-1459` — remove `numistaOverride` check and CDN-shortcut
- Modify: `js/card-view.js:995-999` — same
- Modify: `js/viewModal.js:97-98` — remove override logic from `shouldReplaceWithApi`

For table thumbnails (`_loadThumbImage`), the flow becomes:
```
resolveImageUrlForItem() → IDB blob (user/pattern only)
  → if null, CDN URL fallback
  → if null, metal placeholder
```

For `shouldReplaceWithApi` in viewModal, simplify to:
```javascript
const shouldReplaceWithApi = !imagesLoaded;
```

---

### Task T6: Remove cacheImages from catalog-api fill

**Files:**
- Modify: `js/catalog-api.js:2025-2037`

**Step 1: Remove `cacheImages` call (lines 2028-2032). Keep `cacheMetadata` (lines 2033-2036).**

After:
```javascript
// Fire-and-forget: cache metadata in IndexedDB
if (window.imageCache?.isAvailable() && selectedNumistaResult.catalogId &&
    window.featureFlags?.isEnabled('COIN_IMAGES')) {
  imageCache.cacheMetadata(
    selectedNumistaResult.catalogId,
    selectedNumistaResult
  ).catch(e => console.warn('Metadata cache failed:', e));
}
```

---

### Task T7: Remove CDN ZIP export/import IDB paths

**Files:**
- Modify: `js/settings-listeners.js:908-934` — remove `includeCdn` block that calls `cacheImages`/`getImages`
- Modify: `js/settings-listeners.js:948-978` — remove `_restoreCdnFolderFromZip` function

The `includeCdn` checkbox in the export UI can remain but should now be a no-op or removed. If the export UI has a "Include CDN images" checkbox, remove it since CDN images are URLs, not blobs.

---

### Task T8: Remove numistaOverride toggle from settings

**Files:**
- Modify: `index.html:3100-3107` — remove the Numista override settings card
- Modify: `js/settings.js:65` — remove `syncChipToggle('numistaOverrideToggle', ...)`
- Modify: `js/settings.js:1953` — remove label entry for `numistaOverridePersonal`
- Modify: `js/settings-listeners.js:827-829` — remove `wireStorageToggle('numistaOverrideToggle', ...)`
- Modify: `js/constants.js:807` — remove `numistaOverridePersonal` from `ALLOWED_STORAGE_KEYS`

---

### Task T9: Clean up image-cache-modal.js resync

**Files:**
- Modify: `js/image-cache-modal.js` — `resyncCachedEntry()` function

**Step 1: Remove the `coinImages` delete** — currently deletes `coinImages[catalogId]` before re-syncing
**Step 2: Keep metadata delete + re-cache** — `coinMetadata[catalogId]` purge + `cacheMetadata()` call
**Step 3: Remove any `cacheImages()` calls if present** in this file

---

### Task T10: Update regression tests

**Files:**
- Modify: `tests/numista-regression.spec.js`

Review existing tests:
- `STAK-309-a`: Clearing N# + URL persists — should still pass (no coinImages involvement)
- `STAK-309-b`: Clearing N# wipes numistaData — should still pass
- `STAK-311`: Changing N# clears old CDN URL — should still pass

If any tests reference `coinImages`, `hasImages`, or `cacheImages`, update them.

---

### Task T11: Manual QA Checklist

| Scenario | Expected |
|----------|----------|
| Item with user-uploaded obverse | User photo shown in table/card/view modal |
| Item with pattern image match | Pattern image shown (unless `ignorePatternImages`) |
| Item with Numista N# + CDN URLs | CDN thumbnail shown in table/card/view modal |
| Item with N# but no CDN URLs | Placeholder shown (no crash) |
| Remove one image, keep other | Removed side shows placeholder, kept side persists |
| Numista fill form → save | CDN URLs saved on item, metadata cached, images from CDN |
| View modal for Numista item | Shows CDN URL images + enrichment section |
| Settings → Images → no crash | Numista override toggle is gone |
| Bulk sync | Metadata synced, no blob caching |
| Image ZIP export | User/pattern images exported, no CDN blob export |

---

### Task T12: Version bump + commit

Use `/release patch` skill. Commit message:
```
feat: simplify image pipeline — remove coinImages IDB cache layer (STAK-339)

Removes the coinImages IndexedDB store from the image resolution cascade.
CDN URLs stored on inventory items are now the sole Numista image source.
Eliminates the root cause of STAK-309/311/332/333/339 image bugs.

New cascade: user upload → pattern image → CDN URL → placeholder
```

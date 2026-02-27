# Image Storage Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the hardcoded 50 MB image storage cap with dynamic quota, request persistent storage on first upload, split the storage gauge into user-photos vs. Numista rows with progress bars, and lay the `sharedImageId` foundation for future image reuse across items.

**Architecture:** Three focused changes to `image-cache.js` (dynamic quota + per-store byte tracking), one change to `events.js` + `constants.js` (persistent storage request), a UI update to `settings.js` + `index.html` (enhanced split gauge), and schema additions to `image-cache.js` + `events.js` + `inventory.js` + `types.js` (sharedImageId foundation).

**Tech Stack:** Vanilla JS, IndexedDB (`StakTrakrImages` DB), `navigator.storage.estimate()`, `navigator.storage.persist()`, localStorage (persist grant flag)

**Design doc:** `docs/plans/2026-02-23-image-storage-expansion-design.md`

**File Touch Map:**

| Action | File | Scope |
|--------|------|-------|
| MODIFY | `js/image-cache.js` | `_quotaBytes` init (~line 24), `getStorageUsage()` (~line 363), `cacheUserImage()` (~line 538) |
| MODIFY | `js/constants.js` | Add `STORAGE_PERSIST_GRANTED_KEY` + `IMAGE_ZIP_MANIFEST_VERSION` to ALLOWED_STORAGE_KEYS and constants |
| MODIFY | `js/events.js` | `saveUserImageForItem()` (~line 218) — request persist on first upload; `commitItemToInventory()` — add `sharedImageId` null fields |
| MODIFY | `js/settings.js` | `renderImageStorageStats()` (~line 1619) — replace text spans with split two-row gauge |
| MODIFY | `index.html` | `imageStorageStats` container (~line 3315) — replace inner markup with gauge HTML |
| MODIFY | `js/inventory.js` | `loadInventory()` — preserve `obverseSharedImageId`/`reverseSharedImageId` through load/save |
| MODIFY | `js/types.js` | JSDoc for new image fields on InventoryItem |

---

## Context for the Implementing Agent

**What already exists (do NOT re-implement):**
- JSZip is already loaded and used by `createBackupZip()` in `inventory.js`
- `createBackupZip()` already exports user images to `user_images/<uuid>_obverse.jpg` with `user_image_manifest.json` including `uuid` + `itemName`
- `importImagesBtn` and `exportAllImagesBtn` exist in Settings with full handlers
- `clearNumistaCacheBtn` exists and works
- `renderImageStorageStats()` exists but shows combined text stats only
- `imageStorageStats` container exists in `index.html` at ~line 3315
- `getStorageUsage()` returns counts per store but NOT separate byte totals per store
- `exportAllUserImages()` exists in `image-cache.js`

**Critical pattern:** Never use raw `localStorage.setItem/getItem` — use `saveData()`/`loadData()` for JSON values or `localStorage.getItem/setItem` only for scalar string preferences. `STORAGE_PERSIST_GRANTED_KEY` is a scalar boolean string → raw `localStorage` is correct.

**New storage key must be added to `ALLOWED_STORAGE_KEYS` in `js/constants.js`** before use.

---

## Task Table

| ID | Step | Est (min) | Files | Validation | Risk/Notes | Agent |
|----|------|-----------|-------|------------|------------|-------|
| T1 | Add `STORAGE_PERSIST_GRANTED_KEY` to constants | 3 | `js/constants.js` | Key appears in ALLOWED_STORAGE_KEYS | Must come before T2 | Claude |
| T2 | Dynamic quota: replace hardcoded 50 MB with `_initQuota()` | 10 | `js/image-cache.js` | `imageCache._quotaBytes` > 50 MB in DevTools console | `navigator.storage.estimate()` may return 0 on `file://` — handle gracefully | Claude |
| T3 | Add per-store byte tracking to `getStorageUsage()` | 8 | `js/image-cache.js` | `getStorageUsage()` returns `numistaBytes`, `userImageBytes` | Don't break existing callers — additive change only | Claude |
| T4 | Commit T1–T3 | 1 | — | `git log` shows commit | — | Claude |
| T5 | Request persistent storage on first upload | 8 | `js/events.js`, `js/constants.js` | After uploading a photo: `localStorage.getItem('storagePersistGranted')` is `'true'` or `'false'` | Chrome may return `false` on `localhost`/`file://` — that's expected | Claude |
| T6 | Enhanced split storage gauge | 15 | `js/settings.js`, `index.html` | Settings → Images → Storage shows two rows with progress bars and persist indicator | Read existing CSS class patterns (`settings-fieldset`, `stat-item`) before writing new markup | Claude |
| T7 | Commit T5–T6 | 1 | — | `git log` shows commit | — | Claude |
| T8 ← NEXT | `sharedImageId` in `cacheUserImage()` records | 8 | `js/image-cache.js` | New `userImages` records have `sharedImageId: null` field | IndexedDB schema version does NOT need bumping — adding a field to existing records is schema-compatible | Claude |
| T9 | `obverseSharedImageId`/`reverseSharedImageId` in inventory items | 8 | `js/events.js`, `js/inventory.js` | Edit+save an item; exported JSON contains the two new null fields | Must be preserved through load, save, import, and export | Claude |
| T10 | JSDoc for new fields | 5 | `js/types.js` | JSDoc rendered for all 3 new fields | — | Claude |
| T11 | Commit T8–T10 | 1 | — | `git log` shows commit | — | Claude |
| T12 | File STAK-304 Linear issue | 3 | — | Issue visible in Linear | — | Claude |
| T13 | `/release patch` — version bump + PR | 5 | all version files | PR open targeting `dev` | Use release skill | Claude |

---

## Task Detail

### Task T1: Add constants

**Files:**
- Modify: `js/constants.js` — find `ALLOWED_STORAGE_KEYS` array and the constants block above it

**Step 1: Add the new constants**

Find the block where other storage key constants are defined (near `RETAIL_INTRADAY_KEY`, etc.) and add:

```javascript
const STORAGE_PERSIST_GRANTED_KEY = 'storagePersistGranted';
const IMAGE_ZIP_MANIFEST_VERSION = '1.0';
```

**Step 2: Add `STORAGE_PERSIST_GRANTED_KEY` to `ALLOWED_STORAGE_KEYS`**

Find the `ALLOWED_STORAGE_KEYS` array and add the new key alongside other storage keys.

**Step 3: Export to window (find the constants window export block)**

```javascript
window.STORAGE_PERSIST_GRANTED_KEY = STORAGE_PERSIST_GRANTED_KEY;
window.IMAGE_ZIP_MANIFEST_VERSION = IMAGE_ZIP_MANIFEST_VERSION;
```

**Step 4: Verify**

```bash
grep -n "STORAGE_PERSIST_GRANTED_KEY\|IMAGE_ZIP_MANIFEST_VERSION" js/constants.js
```
Expected: appears in constant declaration, ALLOWED_STORAGE_KEYS, and window export.

---

### Task T2: Dynamic quota

**Files:**
- Modify: `js/image-cache.js` — constructor area (~line 24) and `_ensureDb()`

**Step 1: Replace the hardcoded quota line**

Find:
```javascript
this._quotaBytes = 50 * 1024 * 1024;
```

Replace with:
```javascript
this._quotaBytes = 500 * 1024 * 1024; // 500 MB default; updated async by _initQuota()
```

**Step 2: Add `_initQuota()` method** in the class, after the constructor:

```javascript
async _initQuota() {
  try {
    if (!navigator?.storage?.estimate) return;
    const { quota = 0, usage = 0 } = await navigator.storage.estimate();
    const available = quota - usage;
    if (available <= 0) return; // file:// or estimate unavailable
    // 60% of available space, min 500 MB, max 4 GB
    this._quotaBytes = Math.min(
      Math.max(available * 0.6, 500 * 1024 * 1024),
      4 * 1024 * 1024 * 1024
    );
  } catch {
    // Leave at 500 MB default
  }
}
```

**Step 3: Call `_initQuota()` inside `_ensureDb()`**

Find the `_ensureDb()` method. After the DB opens successfully (after the `onsuccess` or after `this._db` is set), add a fire-and-forget call. The quota update races harmlessly — it will be correct before the first save operation completes:

```javascript
// After this._db is assigned inside _ensureDb():
this._initQuota(); // non-blocking, updates _quotaBytes async
```

**Step 4: Verify in browser DevTools console**

Open the app, then run:
```javascript
imageCache._quotaBytes / 1024 / 1024
```
Expected: a number significantly larger than 50 (e.g., 8000 on a 16 GB machine with 50% available).

---

### Task T3: Per-store byte tracking

**Files:**
- Modify: `js/image-cache.js` — `getStorageUsage()` (~line 363)

**Step 1: Add per-store byte accumulators to the result object**

Find the `result` initialization line:
```javascript
const result = { count: 0, totalBytes: 0, metadataCount: 0, userImageCount: 0, patternImageCount: 0, numistaCount: 0, limitBytes: this._quotaBytes };
```

Replace with:
```javascript
const result = {
  count: 0,
  totalBytes: 0,
  numistaBytes: 0,
  userImageBytes: 0,
  patternImageBytes: 0,
  metadataBytes: 0,
  metadataCount: 0,
  userImageCount: 0,
  patternImageCount: 0,
  numistaCount: 0,
  limitBytes: this._quotaBytes,
};
```

**Step 2: Accumulate per-store bytes**

In the `coinImages` iteration block, add: `result.numistaBytes += rec.size || 0;`
In the `coinMetadata` iteration block, add: `result.metadataBytes += new Blob([JSON.stringify(rec)]).size;`
In the `userImages` iteration block, add: `result.userImageBytes += rec.size || 0;`
In the `patternImages` iteration block, add: `result.patternImageBytes += rec.size || 0;`

**Step 3: Verify**

In browser console:
```javascript
imageCache.getStorageUsage().then(u => console.log(u))
```
Expected: result object includes `numistaBytes`, `userImageBytes` alongside existing fields.

---

### Task T4: Commit T1–T3

```bash
git add js/image-cache.js js/constants.js
git commit -m "feat(storage): dynamic quota + per-store byte tracking — replace hardcoded 50MB cap (STAK-304)"
```

---

### Task T5: Persistent storage request

**Files:**
- Modify: `js/events.js` — `saveUserImageForItem()` (~line 218)

**Step 1: Add the persist request helper**

Add near the top of the file (after existing helpers in the upload state section):

```javascript
const _requestStoragePersistOnce = async () => {
  if (localStorage.getItem(STORAGE_PERSIST_GRANTED_KEY) !== null) return; // already asked
  if (!navigator?.storage?.persist) {
    localStorage.setItem(STORAGE_PERSIST_GRANTED_KEY, 'false');
    return;
  }
  try {
    const granted = await navigator.storage.persist();
    localStorage.setItem(STORAGE_PERSIST_GRANTED_KEY, granted ? 'true' : 'false');
  } catch {
    localStorage.setItem(STORAGE_PERSIST_GRANTED_KEY, 'false');
  }
};
```

**Step 2: Call it inside `saveUserImageForItem()` before the actual save**

Inside `saveUserImageForItem()`, after the `hasNewImages` guard and before `imageCache.cacheUserImage(...)`:

```javascript
_requestStoragePersistOnce(); // fire-and-forget — no await needed
```

**Step 3: Verify**

Upload a photo. Check:
```javascript
localStorage.getItem('storagePersistGranted') // → 'true' or 'false'
```

---

### Task T6: Enhanced split storage gauge

**Files:**
- Modify: `js/settings.js` — `renderImageStorageStats()` (~line 1619)
- Modify: `index.html` — `imageStorageStats` container (~line 3315)

**Step 1: Update HTML container**

Find:
```html
<div id="imageStorageStats" class="image-storage-stats">
  <span class="stat-item">Loading...</span>
</div>
```

Replace with:
```html
<div id="imageStorageStats" class="image-storage-stats">
  <div class="storage-gauge-row">
    <span class="storage-gauge-label">📷 Your Photos</span>
    <div class="storage-gauge-bar-wrap"><div id="gaugeUserBar" class="storage-gauge-bar"></div></div>
    <span id="gaugeUserSize" class="storage-gauge-size">—</span>
  </div>
  <div class="storage-gauge-row">
    <span class="storage-gauge-label">🪙 Numista Cache</span>
    <div class="storage-gauge-bar-wrap"><div id="gaugeNumistaBar" class="storage-gauge-bar"></div></div>
    <span id="gaugeNumistaSize" class="storage-gauge-size">—</span>
  </div>
  <div id="gaugePersistLine" class="storage-gauge-persist">—</div>
</div>
```

**Step 2: Replace `renderImageStorageStats()` body in `settings.js`**

Find the function and replace its body (keep the signature and the `if (!container) return;` guard):

```javascript
const renderImageStorageStats = async () => {
  const container = document.getElementById('imageStorageStats');
  if (!container) return;

  if (!window.imageCache?.isAvailable()) {
    container.innerHTML = '<span class="stat-item">IndexedDB unavailable</span>';
    return;
  }

  const usage = await imageCache.getStorageUsage();
  const limitBytes = usage.limitBytes || 1;

  const fmt = (b) => {
    if (b >= 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB';
    return Math.round(b / 1024) + ' KB';
  };

  const pct = (b) => Math.min(100, ((b / limitBytes) * 100)).toFixed(1);

  const barColor = (b) => {
    const p = (b / limitBytes) * 100;
    if (p > 90) return 'var(--danger, #e74c3c)';
    if (p > 70) return 'var(--warning, #f39c12)';
    return 'var(--accent, #3498db)';
  };

  const userBar = document.getElementById('gaugeUserBar');
  const userSize = document.getElementById('gaugeUserSize');
  const numistaBar = document.getElementById('gaugeNumistaBar');
  const numistaSize = document.getElementById('gaugeNumistaSize');
  const persistLine = document.getElementById('gaugePersistLine');

  if (userBar) {
    userBar.style.width = pct(usage.userImageBytes || 0) + '%';
    userBar.style.background = barColor(usage.userImageBytes || 0);
  }
  if (userSize) {
    userSize.textContent = `${fmt(usage.userImageBytes || 0)} (${usage.userImageCount} items)`;
  }
  if (numistaBar) {
    numistaBar.style.width = pct(usage.numistaBytes || 0) + '%';
    numistaBar.style.background = barColor(usage.numistaBytes || 0);
  }
  if (numistaSize) {
    numistaSize.textContent = `${fmt(usage.numistaBytes || 0)} (${usage.numistaCount} coins)`;
  }
  if (persistLine) {
    const granted = localStorage.getItem(STORAGE_PERSIST_GRANTED_KEY);
    if (granted === 'true') {
      persistLine.textContent = '✅ Persistent storage granted — browser will not auto-clear your images';
      persistLine.style.color = 'var(--success, #27ae60)';
    } else if (granted === 'false') {
      persistLine.textContent = '⚠️ Persistent storage not granted — consider using Full Backup regularly';
      persistLine.style.color = 'var(--warning, #f39c12)';
    } else {
      persistLine.textContent = 'Upload a photo to request persistent storage protection';
      persistLine.style.color = 'var(--text-secondary)';
    }
  }
};
```

**Step 3: Add CSS**

Find the stylesheet block or a relevant CSS section (check for `image-storage-stats` class). Add alongside or after existing rules:

```css
.storage-gauge-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  font-size: 0.82em;
}
.storage-gauge-label {
  min-width: 7rem;
  color: var(--text-secondary);
}
.storage-gauge-bar-wrap {
  flex: 1;
  height: 6px;
  background: var(--border, #333);
  border-radius: 3px;
  overflow: hidden;
  min-width: 60px;
}
.storage-gauge-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
  width: 0%;
}
.storage-gauge-size {
  min-width: 8rem;
  text-align: right;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}
.storage-gauge-persist {
  font-size: 0.78em;
  margin-top: 0.3rem;
}
```

**Step 4: Verify**

Open Settings → Images → Storage. Should show two rows with progress bars and the persist line.

---

### Task T7: Commit T5–T6

```bash
git add js/events.js js/settings.js index.html
git commit -m "feat(storage): persistent storage request + split storage gauge UI (STAK-304)"
```

---

### Task T8 ← NEXT: `sharedImageId` in `cacheUserImage()` records

**Files:**
- Modify: `js/image-cache.js` — `cacheUserImage()` (~line 538)

**Step 1: Update the method signature** to accept optional `sharedImageId`:

```javascript
async cacheUserImage(uuid, obverse, reverse = null, sharedImageId = null) {
```

**Step 2: Add `sharedImageId` to the record object**

Find the `record` object construction inside `cacheUserImage`:
```javascript
const record = {
  uuid,
  obverse,
  reverse: reverse || null,
  cachedAt: Date.now(),
  size,
};
```
Replace with:
```javascript
const record = {
  uuid,
  obverse,
  reverse: reverse || null,
  sharedImageId: sharedImageId || null,
  cachedAt: Date.now(),
  size,
};
```

**Step 3: No IndexedDB schema version bump needed.** Adding a field to existing records is backward-compatible. Existing records without `sharedImageId` will return `undefined` for that field — callers should treat `undefined` as `null`.

**Step 4: Verify**

Upload a photo on a test item. In DevTools → Application → IndexedDB → StakTrakrImages → userImages, inspect the record. It should have `sharedImageId: null`.

---

### Task T9: `obverseSharedImageId` / `reverseSharedImageId` in inventory items

**Files:**
- Modify: `js/events.js` — `commitItemToInventory()` (~line 1041)
- Modify: `js/inventory.js` — `loadInventory()` and `exportInventory()` (preserve fields through load/save)

**Step 1: Add fields to new item creation in `commitItemToInventory()` (add mode, ~line 1107)**

In the `inventory.push({ ... })` block, add:
```javascript
obverseSharedImageId: null,
reverseSharedImageId: null,
```

**Step 2: Add fields to edit mode in `commitItemToInventory()` (edit mode, ~line 1054)**

In the `inventory[editIdx] = { ...oldItem, ...buildItemFields(f), ... }` block, add:
```javascript
obverseSharedImageId: oldItem.obverseSharedImageId || null,
reverseSharedImageId: oldItem.reverseSharedImageId || null,
```
This preserves whatever was there before — future code will set these when tagging shared images.

**Step 3: Verify fields survive save/reload**

Add an item, check localStorage inventory JSON contains both new fields. Reload page, edit the item, confirm fields are still present.

---

### Task T10: JSDoc

**Files:**
- Modify: `js/types.js` — InventoryItem typedef

Find the `@typedef {Object} InventoryItem` block and add the three new properties alongside `obverseImageUrl` and `reverseImageUrl`:

```javascript
 * @property {string|null} [obverseSharedImageId] - UUID of source item if obverse image was tagged from the shared library (null for original uploads)
 * @property {string|null} [reverseSharedImageId] - UUID of source item if reverse image was tagged from the shared library (null for original uploads)
```

And in the `image-cache.js` JSDoc for `cacheUserImage()`:
```javascript
 * @param {string|null} [sharedImageId] - Source item UUID if this image was copied from another item's upload; null for original uploads
```

---

### Task T11: Commit T8–T10

```bash
git add js/image-cache.js js/events.js js/inventory.js js/types.js
git commit -m "feat(storage): sharedImageId foundation for future image reuse across items (STAK-304)"
```

---

### Task T12: File STAK-304

Create a Linear issue:
- **Team:** StakTrakr (`f876864d-ff80-4231-ae6c-a8e5cb69aca4`)
- **Title:** `Image storage expansion — dynamic quota, persistent storage, split gauge, sharedImageId foundation`
- **Priority:** High (2)
- **Description:** Reference `docs/plans/2026-02-23-image-storage-expansion-design.md`

---

### Task T13: Release patch

Run `/release patch` to claim a version lock, create a worktree, bump the version, and open a draft PR to `dev`.

Changelog title: `Image Storage Expansion — Dynamic Quota, Split Gauge, sharedImageId Foundation (STAK-304)`

Bullets:
- **Added**: Dynamic IndexedDB quota via `navigator.storage.estimate()` — replaces hardcoded 50 MB cap; adapts to available disk space
- **Added**: Persistent storage request on first photo upload — prevents browser from silently evicting user images
- **Added**: Split storage gauge in Settings → Images → Storage — separate rows for Your Photos vs. Numista Cache, each with progress bar and byte count
- **Added**: `sharedImageId` field on `userImages` records and `obverseSharedImageId`/`reverseSharedImageId` on inventory items — foundation for future image reuse across items

---

## Auto-Quiz

1. **Which task is NEXT?** T8 — `sharedImageId` in `cacheUserImage()` records
2. **Validation for NEXT?** Upload a photo on a test item → DevTools IndexedDB → StakTrakrImages → userImages → inspect record → field `sharedImageId: null` present
3. **Commit message for NEXT?** Part of T11: `feat(storage): sharedImageId foundation for future image reuse across items (STAK-304)`
4. **Breakpoint?** After T7 commit — human should verify the split gauge renders correctly in Settings before proceeding to schema changes

## Notes

- T1–T3 are pure logic changes; T6 is the most UI-risk task — verify gauge appearance on both light and dark themes
- The CSS classes added in T6 follow existing patterns from `settings-fieldset` — check neighboring CSS before finalizing class names
- Vault image sync (`vault-images.enc`) is explicitly out of scope — leave a `// TODO STAK-305: vault-images.enc` comment in `js/cloud-sync.js` when running T13
- The existing backup ZIP already uses `user_images/<uuid>_obverse.jpg` — the standalone image export uses `user/` with `.webp`. Verify these are consistent when testing T8; if a mismatch is found, fix in T9 and note in the PR

# Image Storage Stress Test — Design

**Date:** 2026-02-23
**Status:** Approved — ready for implementation planning
**Related issues:** STAK-305 (image storage expansion)

---

## Problem

StakTrakr's image storage expansion (v3.32.27) replaced a hardcoded 50 MB IndexedDB cap with a dynamic quota. A power user reported issues at ~188 items × 2 images. We need automated stress tests that exercise the full image lifecycle at 100, 500, and 1000 items to catch quota, export, import, and UI degradation issues before they reach users.

---

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Data injection | Programmatic via `imageCache.importUserImageRecord()` | Skips canvas resize, exact sizes, follows existing pattern in `backup-restore.spec.js` |
| Scale levels | 100 / 500 / 1000 items | Covers typical (100), heavy (500), and power-user (1000) cases |
| CRUD + export/import | Full UI at all three scales | User confirmed: run the full test matrix at every scale |
| Image size | 80 KB synthetic WebP blob per image | Realistic size without real files; 1000×2×80KB = ~160 MB total |
| Reverse images | 50% of items (every even index) | Tests null-reverse path in export/import without doubling storage cost |
| Timeouts | 60s / 120s / 180s (per scale) | Calibrated to allow IndexedDB writes + UI interactions at each scale |
| Helper location | `tests/test-utils.js` — `seedImageInventory()` | Reuse existing utility file pattern; other specs can use it |

---

## Architecture

```
tests/image-storage-stress.spec.js
  ├── describe: "100-item scale"  (timeout: 60s)
  │     ├── beforeEach: wipe + seed 100 items
  │     ├── test: dynamic quota > 50 MB
  │     ├── test: storage gauge shows correct counts
  │     ├── test: edit first item name (UI)
  │     ├── test: delete last item (UI)
  │     ├── test: export ZIP via UI + manifest entry count
  │     ├── test: clear Numista cache (UI) — user images intact
  │     └── test: import ZIP via UI — count restored
  ├── describe: "500-item scale"  (timeout: 120s)
  │     └── [same 7 tests]
  └── describe: "1000-item scale" (timeout: 180s)
        └── [same 7 tests]

tests/test-utils.js  (additive — new export)
  └── seedImageInventory(page, count, imgSizeKb = 80)
```

---

## Section 1: Seeding Helper

`seedImageInventory(page, count, imgSizeKb = 80)` — added to `tests/test-utils.js`.

Runs entirely inside `page.evaluate()`. Uses `imageCache.importUserImageRecord()` (not `cacheUserImage()`) to bypass canvas processing. Writes items directly to `window.inventory` and `localStorage.inventoryData`.

```javascript
export const seedImageInventory = async (page, count, imgSizeKb = 80) => {
  return await page.evaluate(async ({ count, imgSizeKb }) => {
    const sizeBytes = imgSizeKb * 1024;
    const imgData = new Uint8Array(sizeBytes);
    const items = [];

    for (let i = 0; i < count; i++) {
      const uuid = `stress-${String(count).padStart(4,'0')}-${String(i).padStart(5,'0')}`;
      const obv = new Blob([imgData], { type: 'image/webp' });
      // 50% have reverse (every even index) — tests null-reverse export path
      const rev = i % 2 === 0 ? new Blob([imgData], { type: 'image/webp' }) : null;

      await imageCache.importUserImageRecord({
        uuid, obverse: obv, reverse: rev,
        cachedAt: Date.now(),
        size: obv.size + (rev?.size ?? 0),
        sharedImageId: null,
      });

      items.push({
        uuid, metal: 'Silver', composition: 'Silver',
        name: `Stress Coin ${i + 1}`, qty: 1, type: 'Coin',
        weight: 1, weightUnit: 'oz', purity: 1.0, price: 30,
        date: '2026-01-01', obverseImageUrl: '', reverseImageUrl: '',
        obverseSharedImageId: null, reverseSharedImageId: null,
        serialNumber: '', purchaseLocation: '', storageLocation: '',
        notes: '', spotPriceAtPurchase: 0, premiumPerOz: 0,
        totalPremium: 0, marketValue: 0, numistaId: '', year: '2026',
        grade: '', gradingAuthority: '', certNumber: '',
        pcgsNumber: '', pcgsVerified: false, serial: uuid,
      });
    }

    window.inventory = items;
    localStorage.setItem('inventoryData', JSON.stringify(items));
    return { seededItems: count, seededImages: items.length };
  }, { count, imgSizeKb });
};
```

---

## Section 2: Test Matrix (same at all three scales)

| # | Test | Method | Key Assertion |
|---|------|--------|---------------|
| 1 | Dynamic quota > 50 MB | `page.evaluate` | `imageCache._quotaBytes > 50 * 1024 * 1024` |
| 2 | Storage gauge correct counts | UI: Settings → Images → Storage | `#gaugeUserSize` text contains item count |
| 3 | Edit first item name | UI: table row → edit modal → save | Table reflects new name |
| 4 | Delete last item | UI: table row → delete → confirm | Row count decreases by 1 |
| 5 | Export ZIP fires download | UI: `#exportAllImagesBtn` | Download event fires |
| 6 | ZIP manifest entry count | intercept `URL.createObjectURL` in `page.evaluate` | manifest entries === seeded item count |
| 7 | Clear Numista cache UI | UI: `#clearNumistaCacheBtn` → confirm | `numistaCount` → 0; `userImageCount` unchanged |
| 8 | Import ZIP restores count | UI: `#importImagesBtn` + file input upload | `userImageCount` matches original seed count |

---

## Section 3: Edge Cases

| Edge Case | How Tested |
|---|---|
| 50% of items have no reverse image | Every odd-index item has `reverse: null` — export ZIP must not include a missing `.webp` file |
| Duplicate UUID import | Import same ZIP twice — count must not double |
| Gauge byte math | `userImageBytes` assertion: `~= count * 80KB * 1.5` (accounting for ~50% having reverse) |
| Dynamic quota | `_quotaBytes > 50MB` assertion at each scale level |

---

## Section 4: Export ZIP Interception Pattern

To verify ZIP contents without a real file download in browserless Docker, intercept `URL.createObjectURL` inside `page.evaluate()`. This pattern comes from `backup-restore.spec.js:94-127`:

```javascript
const zipStats = await page.evaluate(async () => {
  let capturedBlob = null;
  const origCreate = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (blob) => { capturedBlob = blob; return origCreate(blob); };

  // trigger export via existing handler
  document.getElementById('exportAllImagesBtn').click();

  // wait briefly for async export to complete
  await new Promise(r => setTimeout(r, 3000));
  URL.createObjectURL = origCreate;

  if (!capturedBlob) return null;
  const ab = await capturedBlob.arrayBuffer();
  const zip = await JSZip.loadAsync(ab);
  const manifest = zip.file('manifest.json') || zip.file('user_image_manifest.json');
  const manifestJson = manifest ? await manifest.async('string') : null;
  const fileCount = Object.keys(zip.files).length;
  return { fileCount, manifestJson: manifestJson ? JSON.parse(manifestJson) : null };
});
```

**Note:** The export handler may show a confirmation dialog ("Download CDN catalog images?"). The test should click "No" before triggering export, or mock the dialog via `page.on('dialog', ...)`.

---

## Section 5: beforeEach Wipe Pattern

Each `describe` block needs a clean slate:

```javascript
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await dismissAckModal(page);

  // Wipe all data (follows crud.spec.js pattern)
  await page.locator('#settingsBtn').click();
  const storageTab = page.locator('#settingsModal .settings-nav-item[data-section="storage"]');
  if (await storageTab.isVisible()) {
    await storageTab.click();
    const wipeBtn = page.locator('#boatingAccidentBtn');
    if (await wipeBtn.isVisible()) {
      await wipeBtn.click();
      await page.locator('#appDialogOk').click();
      await page.locator('#appDialogOk').click();
    }
  }
  await page.keyboard.press('Escape');

  // Seed fresh data
  const result = await seedImageInventory(page, COUNT);
  expect(result.seededItems).toBe(COUNT);

  // Reload so UI reflects injected inventory
  await page.reload();
  await dismissAckModal(page);
});
```

**Important:** `page.reload()` after seeding so the inventory table renders from the freshly-written localStorage.

---

## File Touch Map

| Action | File | Scope |
|---|---|---|
| MODIFY | `tests/test-utils.js` | Add `seedImageInventory()` export |
| CREATE | `tests/image-storage-stress.spec.js` | New spec — 3 describe blocks × 7 tests = 21 tests |

---

## Out of Scope

- Real image file fixtures (not needed — synthetic blobs suffice)
- Testing on `file://` protocol (browserless serves via HTTP)
- Visual regression testing (separate concern)
- Testing the gauge CSS colors (too fragile for automated test)

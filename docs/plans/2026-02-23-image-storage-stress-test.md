# Image Storage Stress Test — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Playwright stress test suite (`tests/image-storage-stress.spec.js`) that seeds 100, 500, and 1000 inventory items with images programmatically, then validates quota, storage gauge, CRUD, ZIP export, Numista cache clear, and ZIP import at each scale.

**Architecture:** Programmatic injection via `imageCache.importUserImageRecord()` inside `page.evaluate()` seeds the dataset fast (no canvas processing, exact sizes). UI automation then exercises the export button, import file input, and gauge display. Three describe blocks share identical test logic via a `COUNT` constant — just the timeout and seed call differ.

**Tech Stack:** Playwright, browserless Docker (self-hosted at ws://localhost:3000), JSZip (already loaded in app), `imageCache` global (window-exposed singleton), `seedImageInventory()` helper in `test-utils.js`.

**Design doc:** `docs/plans/2026-02-23-image-storage-stress-test-design.md`

**File Touch Map:**
| Action | File | Scope |
|--------|------|-------|
| MODIFY | `tests/test-utils.js` | Add `seedImageInventory()` export |
| CREATE | `tests/image-storage-stress.spec.js` | 3 describe blocks × 8 tests = 24 tests |

---

## Context for the Implementing Agent

**Project:** StakTrakr — single-page vanilla JS precious metals tracker. Tests run via Playwright against a local HTTP server (`http://host.docker.internal:8765`) using browserless Docker.

**Run command:**
```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npx playwright test tests/image-storage-stress.spec.js --reporter=list
```

**Critical patterns from existing tests:**
- `dismissAckModal(page)` — call at start of every test (imported from `./test-utils.js`)
- `page.evaluate(async (args) => { ... }, args)` — inject/read app data; all `imageCache.*` methods are available on `window`
- Wipe via Settings → Storage → `#boatingAccidentBtn` → `#appDialogOk` twice (see `crud.spec.js:beforeEach`)
- Import file input: `page.locator('#importImagesFile').setInputFiles(filepath)` — no need to click `#importImagesBtn` first
- Export dialog: the export button shows a custom dialog (`#appDialogModal`) asking about CDN images — dismiss with `#appDialogCancel` before checking results
- `test.setTimeout(ms)` — must be called at the top of each test that needs more than 60s

**What `imageCache.importUserImageRecord(record)` expects:**
```javascript
{
  uuid: string,          // item UUID — must match an inventory item
  obverse: Blob,         // required
  reverse: Blob | null,  // optional
  cachedAt: number,      // Date.now()
  size: number,          // obverse.size + (reverse?.size ?? 0)
  sharedImageId: null,   // always null for seeded test data
}
```

**What `buildImageExportZip({ includeCdn: false })` returns:** a JSZip instance (not yet serialized). Call `.generateAsync({ type: 'blob' })` to get a Blob.

**The import handler watches `#importImagesFile` for a `change` event.** `page.locator('#importImagesFile').setInputFiles(path)` fires that event directly — no button click needed.

**The export button `#exportAllImagesBtn` shows `#appDialogModal`** asking "Download CDN catalog images?" — wait for the dialog then click `#appDialogCancel` (the "No" button).

---

## Task Table

| ID | Step | Est (min) | Files | Validation | Risk/Notes | Agent |
|----|------|-----------|-------|------------|------------|-------|
| T1 ← NEXT | Add `seedImageInventory` to test-utils.js | 5 | `tests/test-utils.js` | `grep seedImageInventory tests/test-utils.js` shows export | Must match `importUserImageRecord` record shape exactly | Claude |
| T2 | Create spec scaffolding + 100-item tests 1–4 | 15 | `tests/image-storage-stress.spec.js` | `npx playwright test ... --list` shows 4+ tests | beforeEach must wipe + seed + reload | Claude |
| T3 | Add tests 5–8 to 100-item block (export/clear/import) | 15 | `tests/image-storage-stress.spec.js` | `--list` shows 8 tests for 100-item block | Export dialog handling is the trickiest part | Claude |
| T4 | Run 100-item suite — verify all 8 pass | 5 | — | All 8 tests pass | Fix any dialog timing issues before continuing | Claude |
| T5 | Add 500-item and 1000-item describe blocks | 5 | `tests/image-storage-stress.spec.js` | `--list` shows 24 tests total | Copy 100-item block, change COUNT + timeout | Claude |
| T6 | Run full 24-test suite — verify all pass | 10 | — | 24/24 pass | 1000-item seed takes ~20s; timeout must be 180s | Claude |
| T7 | Commit | 1 | — | `git log` shows commit | — | Claude |

---

## Task T1: Add `seedImageInventory` to test-utils.js ← NEXT

**Files:**
- Modify: `tests/test-utils.js`

**Step 1: Read the current test-utils.js**

```bash
cat tests/test-utils.js
```

It currently exports only `dismissAckModal`. We'll add `seedImageInventory` below it.

**Step 2: Add the helper**

Append to `tests/test-utils.js` (after the existing `dismissAckModal` export):

```javascript
/**
 * Seeds N inventory items with synthetic WebP images directly into IndexedDB and localStorage.
 * Uses imageCache.importUserImageRecord() — skips canvas processing for speed.
 * 50% of items have a reverse image (every even index).
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} count - Number of items to seed
 * @param {number} [imgSizeKb=80] - Size of each image blob in KB
 * @returns {Promise<{seededItems: number, seededImages: number}>}
 */
export const seedImageInventory = async (page, count, imgSizeKb = 80) => {
  return await page.evaluate(async ({ count, imgSizeKb }) => {
    const sizeBytes = imgSizeKb * 1024;
    const imgData = new Uint8Array(sizeBytes);
    const items = [];

    for (let i = 0; i < count; i++) {
      const uuid = `stress-${String(count).padStart(4, '0')}-${String(i).padStart(5, '0')}`;
      const obv = new Blob([imgData], { type: 'image/webp' });
      // 50% have reverse (every even index) — tests null-reverse export path
      const rev = i % 2 === 0 ? new Blob([imgData], { type: 'image/webp' }) : null;

      await imageCache.importUserImageRecord({
        uuid,
        obverse: obv,
        reverse: rev,
        cachedAt: Date.now(),
        size: obv.size + (rev?.size ?? 0),
        sharedImageId: null,
      });

      items.push({
        uuid,
        metal: 'Silver',
        composition: 'Silver',
        name: `Stress Coin ${i + 1}`,
        qty: 1,
        type: 'Coin',
        weight: 1,
        weightUnit: 'oz',
        purity: 1.0,
        price: 30,
        date: '2026-01-01',
        obverseImageUrl: '',
        reverseImageUrl: '',
        obverseSharedImageId: null,
        reverseSharedImageId: null,
        serialNumber: '',
        purchaseLocation: '',
        storageLocation: '',
        notes: '',
        spotPriceAtPurchase: 0,
        premiumPerOz: 0,
        totalPremium: 0,
        marketValue: 0,
        numistaId: '',
        year: '2026',
        grade: '',
        gradingAuthority: '',
        certNumber: '',
        pcgsNumber: '',
        pcgsVerified: false,
        serial: uuid,
      });
    }

    window.inventory = items;
    localStorage.setItem('inventoryData', JSON.stringify(items));
    return { seededItems: count, seededImages: items.length };
  }, { count, imgSizeKb });
};
```

**Step 3: Verify**

```bash
grep -n "seedImageInventory" tests/test-utils.js
node --input-type=module < tests/test-utils.js 2>&1 | head -3
```

Expected: `seedImageInventory` appears, no syntax errors.

---

## Task T2: Spec scaffolding + 100-item tests 1–4

**Files:**
- Create: `tests/image-storage-stress.spec.js`

**What tests 1–4 cover:**
1. Dynamic quota > 50 MB
2. Storage gauge shows correct count
3. Edit first item name via UI
4. Delete last item via UI

**Create the file:**

```javascript
// tests/image-storage-stress.spec.js
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { dismissAckModal, seedImageInventory } from './test-utils.js';

// Helper: wipe all app data via Settings UI
async function wipeAllData(page) {
  await page.locator('#settingsBtn').click();
  const storageTab = page.locator('#settingsModal .settings-nav-item[data-section="storage"]');
  if (await storageTab.isVisible()) {
    await storageTab.click();
    const wipeBtn = page.locator('#boatingAccidentBtn');
    if (await wipeBtn.isVisible()) {
      await wipeBtn.click();
      await expect(page.locator('#appDialogModal')).toBeVisible();
      await page.locator('#appDialogOk').click();
      await page.locator('#appDialogOk').click();
      await expect(page.locator('#appDialogModal')).not.toBeVisible();
    }
  }
  await page.keyboard.press('Escape');
}

// ─────────────────────────────────────────────────────────────
// 100-item scale
// ─────────────────────────────────────────────────────────────
test.describe('Image storage stress — 100 items', () => {
  const COUNT = 100;
  const TIMEOUT = 60_000;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissAckModal(page);
    await wipeAllData(page);
    const result = await seedImageInventory(page, COUNT);
    expect(result.seededItems).toBe(COUNT);
    await page.reload();
    await dismissAckModal(page);
  });

  test('dynamic quota is greater than 50 MB', async ({ page }) => {
    const quotaBytes = await page.evaluate(() => imageCache._quotaBytes);
    expect(quotaBytes).toBeGreaterThan(50 * 1024 * 1024);
  });

  test('storage gauge shows correct user image count', async ({ page }) => {
    await page.locator('#settingsBtn').click();
    const imagesTab = page.locator('#settingsModal .settings-nav-item[data-section="images"]');
    if (await imagesTab.isVisible()) await imagesTab.click();
    // Wait for gauge to populate
    await page.waitForFunction(() => {
      const el = document.getElementById('gaugeUserSize');
      return el && el.textContent && !el.textContent.includes('—');
    }, { timeout: 10_000 });
    const gaugeText = await page.locator('#gaugeUserSize').textContent();
    expect(gaugeText).toContain(`${COUNT} items`);
    await page.keyboard.press('Escape');
  });

  test('edit first item name via UI', async ({ page }) => {
    // Click first table row edit button
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.locator('[data-action="edit"], .edit-btn, button[title*="edit" i]').first().click();
    await expect(page.locator('#itemModal')).toBeVisible();
    await page.locator('#itemModal #itemName').fill('Stress Coin EDITED');
    await page.locator('#itemModalSubmit').click();
    await expect(page.locator('#itemModal')).not.toBeVisible();
    await expect(page.locator('table tbody')).toContainText('Stress Coin EDITED');
  });

  test('delete last item via UI', async ({ page }) => {
    const rowsBefore = await page.locator('table tbody tr').count();
    const lastRow = page.locator('table tbody tr').last();
    await lastRow.locator('[data-action="delete"], .delete-btn, button[title*="delete" i]').first().click();
    // Handle confirmation dialog
    const dialog = page.locator('#appDialogModal');
    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.locator('#appDialogOk').click();
      await expect(dialog).not.toBeVisible();
    }
    const rowsAfter = await page.locator('table tbody tr').count();
    expect(rowsAfter).toBe(rowsBefore - 1);
  });
});
```

**Verify the file exists and syntax is clean:**

```bash
node -e "import('./tests/image-storage-stress.spec.js')" 2>&1 | head -5
# or just check it has no obvious syntax errors:
node --input-type=module --eval "$(cat tests/image-storage-stress.spec.js)" 2>&1 | head -5
```

The import will fail (Playwright not available outside test runner) but should NOT show a syntax error.

---

## Task T3: Add tests 5–8 to 100-item block (export / clear / import)

**Files:**
- Modify: `tests/image-storage-stress.spec.js` — add 4 more tests inside the `'Image storage stress — 100 items'` describe block, before the closing `});`

**Test 5: Export ZIP fires download + manifest entry count**

```javascript
  test('export ZIP contains correct manifest entry count', async ({ page }) => {
    test.setTimeout(TIMEOUT);
    // Call buildImageExportZip directly via evaluate — avoids the CDN dialog
    const stats = await page.evaluate(async () => {
      const zip = await buildImageExportZip({ includeCdn: false });
      const blob = await zip.generateAsync({ type: 'blob' });
      const ab = await blob.arrayBuffer();
      const loaded = await JSZip.loadAsync(ab);

      // Find manifest file — may be user_image_manifest.json or manifest.json
      const manifestFile = loaded.file('user_image_manifest.json') || loaded.file('manifest.json');
      const manifestJson = manifestFile ? JSON.parse(await manifestFile.async('string')) : null;
      const fileKeys = Object.keys(loaded.files).filter(k => !loaded.files[k].dir);
      return {
        totalFiles: fileKeys.length,
        manifestEntries: manifestJson?.entries?.length ?? manifestJson?.length ?? null,
        blobBytes: blob.size,
      };
    });
    expect(stats.blobBytes).toBeGreaterThan(0);
    expect(stats.manifestEntries).toBe(COUNT);
  });
```

**Test 6: Clear Numista cache leaves user images intact**

```javascript
  test('clear Numista cache does not remove user images', async ({ page }) => {
    const beforeCount = await page.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.userImageCount)
    );

    await page.locator('#settingsBtn').click();
    const imagesTab = page.locator('#settingsModal .settings-nav-item[data-section="images"]');
    if (await imagesTab.isVisible()) await imagesTab.click();

    const clearBtn = page.locator('#clearNumistaCacheBtn');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      const dialog = page.locator('#appDialogModal');
      if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.locator('#appDialogOk').click();
        await expect(dialog).not.toBeVisible();
      }
    }
    await page.keyboard.press('Escape');

    const afterCount = await page.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.userImageCount)
    );
    // User images untouched
    expect(afterCount).toBe(beforeCount);

    // Numista count should be 0 (was already 0 in stress test, confirms no regression)
    const numistaCount = await page.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.numistaCount)
    );
    expect(numistaCount).toBe(0);
  });
```

**Test 7: Import ZIP restores image count after clear**

```javascript
  test('import ZIP restores image count', async ({ page }) => {
    test.setTimeout(TIMEOUT);

    // Step 1: Export ZIP to a temp file
    const zipBytes = await page.evaluate(async () => {
      const zip = await buildImageExportZip({ includeCdn: false });
      const blob = await zip.generateAsync({ type: 'blob' });
      const ab = await blob.arrayBuffer();
      return Array.from(new Uint8Array(ab));
    });
    const tempPath = path.join(process.cwd(), 'test-results', `stress-images-${COUNT}.zip`);
    fs.mkdirSync(path.dirname(tempPath), { recursive: true });
    fs.writeFileSync(tempPath, Buffer.from(zipBytes));

    // Step 2: Clear all user images via programmatic deleteUserImage calls
    await page.evaluate(async () => {
      const all = await imageCache.exportAllUserImages();
      for (const rec of all) {
        await imageCache.deleteUserImage(rec.uuid);
      }
    });
    const afterClear = await page.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.userImageCount)
    );
    expect(afterClear).toBe(0);

    // Step 3: Import via file input (triggers change handler)
    await page.locator('#importImagesFile').setInputFiles(tempPath);

    // Step 4: Wait for import to complete (poll for count to restore)
    await page.waitForFunction(
      (expected) => imageCache.getStorageUsage().then(u => u.userImageCount >= expected),
      COUNT,
      { timeout: 30_000 }
    );

    const afterImport = await page.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.userImageCount)
    );
    expect(afterImport).toBe(COUNT);

    // Cleanup temp file
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  });
```

**Test 8: Re-import same ZIP is idempotent (no double-count)**

```javascript
  test('importing ZIP twice does not double the image count', async ({ page }) => {
    test.setTimeout(TIMEOUT);

    const zipBytes = await page.evaluate(async () => {
      const zip = await buildImageExportZip({ includeCdn: false });
      const blob = await zip.generateAsync({ type: 'blob' });
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    });
    const tempPath = path.join(process.cwd(), 'test-results', `stress-dup-${COUNT}.zip`);
    fs.mkdirSync(path.dirname(tempPath), { recursive: true });
    fs.writeFileSync(tempPath, Buffer.from(zipBytes));

    const before = await page.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.userImageCount)
    );

    // Import twice
    await page.locator('#importImagesFile').setInputFiles(tempPath);
    await page.waitForTimeout(5000);
    await page.locator('#importImagesFile').setInputFiles(tempPath);
    await page.waitForTimeout(5000);

    const after = await page.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.userImageCount)
    );
    // Should be same as before — UUIDs are identical so second import overwrites
    expect(after).toBe(before);

    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  });
```

---

## Task T4: Run 100-item suite — verify all 8 tests pass

**Step 1: Verify HTTP server and browserless are running**

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8765/index.html
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
```

Expected: `200` and `404` (browserless returns 404 at root — that's healthy).

If HTTP server not running:
```bash
npx http-server /Volumes/DATA/GitHub/StakTrakr -p 8765 --silent &
sleep 1
```

If browserless not running:
```bash
cd /Volumes/DATA/GitHub/StakTrakr/devops/browserless && docker compose up -d
```

**Step 2: Run 100-item suite only**

```bash
cd /Volumes/DATA/GitHub/StakTrakr
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 \
  npx playwright test tests/image-storage-stress.spec.js \
  --grep "100 items" --reporter=list
```

Expected: `8 passed` (or note failures for fixing before T5).

**Step 3: Triage any failures**

Common failure patterns and fixes:
- **Edit button selector wrong** — check table row structure: `page.locator('table tbody tr').first().screenshot()` or look at `crud.spec.js` for the selector pattern used there
- **Import dialog `#importImagesFile` not found** — check if it's inside Settings; may need to open Settings first
- **`gaugeUserSize` text format wrong** — check what the gauge actually shows vs. what we assert; adjust the `.toContain()` string
- **Export `buildImageExportZip` undefined** — ensure the page is fully loaded; add `await page.waitForFunction(() => typeof buildImageExportZip === 'function')`

---

## Task T5: Add 500-item and 1000-item describe blocks

**Files:**
- Modify: `tests/image-storage-stress.spec.js` — append two more describe blocks after the 100-item block

The 500-item and 1000-item blocks are identical to the 100-item block with only three changes:
1. `const COUNT = 500` / `const COUNT = 1000`
2. `const TIMEOUT = 120_000` / `const TIMEOUT = 180_000`
3. The describe label

**Pattern — append these blocks:**

```javascript
// ─────────────────────────────────────────────────────────────
// 500-item scale
// ─────────────────────────────────────────────────────────────
test.describe('Image storage stress — 500 items', () => {
  const COUNT = 500;
  const TIMEOUT = 120_000;

  test.beforeEach(async ({ page }) => {
    // identical to 100-item beforeEach
    await page.goto('/');
    await dismissAckModal(page);
    await wipeAllData(page);
    const result = await seedImageInventory(page, COUNT);
    expect(result.seededItems).toBe(COUNT);
    await page.reload();
    await dismissAckModal(page);
  });

  // Copy all 8 tests verbatim — only COUNT and TIMEOUT references resolve differently
  // via the block-scoped const above.
});

// ─────────────────────────────────────────────────────────────
// 1000-item scale
// ─────────────────────────────────────────────────────────────
test.describe('Image storage stress — 1000 items', () => {
  const COUNT = 1000;
  const TIMEOUT = 180_000;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissAckModal(page);
    await wipeAllData(page);
    const result = await seedImageInventory(page, COUNT);
    expect(result.seededItems).toBe(COUNT);
    await page.reload();
    await dismissAckModal(page);
  });

  // Copy all 8 tests verbatim
});
```

**Verify test count:**

```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 \
  npx playwright test tests/image-storage-stress.spec.js --list | grep "•" | wc -l
```

Expected: `24` tests listed.

---

## Task T6: Run full 24-test suite

```bash
cd /Volumes/DATA/GitHub/StakTrakr
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 \
  npx playwright test tests/image-storage-stress.spec.js --reporter=list
```

Expected output pattern:
```
  ✓ Image storage stress — 100 items › dynamic quota is greater than 50 MB
  ✓ Image storage stress — 100 items › storage gauge shows correct user image count
  ✓ Image storage stress — 100 items › edit first item name via UI
  ... (8 × 3 = 24 tests)
  24 passed
```

**If any 1000-item tests timeout:** increase `TIMEOUT` to `240_000` in the 1000-item block only. The seed phase at 1000 items × 80 KB × 1.5 images avg = ~120 MB of IndexedDB writes — takes ~15-25s on modern hardware.

**If `importUserImageRecord` is undefined:** This method was added recently. Verify the version served by the HTTP server matches the worktree: `curl -s http://localhost:8765/js/image-cache.js | grep importUserImageRecord | head -3`.

---

## Task T7: Commit

```bash
cd /Volumes/DATA/GitHub/StakTrakr
git add tests/test-utils.js tests/image-storage-stress.spec.js
git commit -m "$(cat <<'EOF'
test(stress): add 100/500/1000-item image storage stress tests — quota, gauge, CRUD, export, import

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Auto-Quiz

1. **Which task is NEXT?** T1 — Add `seedImageInventory` to `tests/test-utils.js`
2. **Validation for NEXT?** `grep -n "seedImageInventory" tests/test-utils.js` — expected: the function definition appears
3. **Commit message for NEXT?** Covered in T7 (all test files committed together)
4. **Breakpoint?** After T4 — all 8 × 100-item tests must pass before expanding to 500 and 1000. If test 3 (edit) or test 4 (delete) fail due to wrong selector, fix the selectors by inspecting the table HTML before proceeding.

## Notes

- `seedImageInventory` uses `importUserImageRecord` (not `cacheUserImage`) — skips canvas, ~5-10ms per record. 1000 records ≈ 10-20 seconds.
- 50% of seeded items have no reverse image — tests that the export ZIP correctly omits missing files.
- `buildImageExportZip({ includeCdn: false })` is called directly from `page.evaluate()` rather than clicking `#exportAllImagesBtn` — avoids the CDN dialog and is more reliable for programmatic export/import tests.
- The import file input `#importImagesFile` may be hidden inside the Settings modal. If `setInputFiles` fails, open Settings → Images tab first.
- All temp ZIP files are cleaned up within each test to avoid accumulation.

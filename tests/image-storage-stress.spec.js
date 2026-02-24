// tests/image-storage-stress.spec.js
// Stress test suite: seeds 100 / 500 / 1000 inventory items with synthetic images
// and validates quota, gauge, CRUD, ZIP export, Numista cache clear, and ZIP import.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { dismissAllStartupModals, seedImageInventory } from './test-utils.js';

// Helper: wipe all app data via Settings → Storage → Wipe All Data
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
      // Second confirm (shows "erased" message)
      const secondOk = page.locator('#appDialogOk');
      if (await secondOk.isVisible({ timeout: 3000 }).catch(() => false)) {
        await secondOk.click();
      }
      await expect(page.locator('#appDialogModal')).not.toBeVisible();
    }
  }
  await page.keyboard.press('Escape');
}

// Helper: switch to table view and return row count
async function switchToTableView(page) {
  const tableViewBtn = page.locator('button[data-style="D"], [title="Table view"]').first();
  if (await tableViewBtn.isVisible()) await tableViewBtn.click();
  await expect(page.locator('#inventoryTable')).toBeVisible({ timeout: 10_000 });
}

// ─────────────────────────────────────────────────────────────
// 100-item scale — single shared context, seeded once in beforeAll.
// Same serial/beforeAll pattern as 500 and 1000-item suites to
// minimise total browser-context churn across the full run.
// ─────────────────────────────────────────────────────────────
test.describe('Image storage stress — 100 items', () => {
  const COUNT = 100;
  const TIMEOUT = 60_000;
  test.describe.configure({ mode: 'serial' });

  /** @type {import('@playwright/test').Page} */
  let p100;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    p100 = await ctx.newPage();
    const url = process.env.TEST_URL || 'http://host.docker.internal:8765';
    await p100.goto(url);
    await dismissAllStartupModals(p100);
    await wipeAllData(p100);
    const result = await seedImageInventory(p100, COUNT, 1);
    expect(result.seededItems).toBe(COUNT);
    await p100.goto(url);
    await dismissAllStartupModals(p100);
    // Expose a single file-writer for all ZIP tests in this suite.
    await p100.exposeFunction('__writeFile100', (filePath, chunks) => {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, Buffer.from(chunks));
    });
  }, TIMEOUT);

  test.afterAll(async () => {
    await p100.context().close();
  });

  test('dynamic quota is greater than 50 MB', async () => {
    test.setTimeout(TIMEOUT);
    const quotaBytes = await p100.evaluate(() => imageCache._quotaBytes);
    expect(quotaBytes).toBeGreaterThan(50 * 1024 * 1024);
  });

  test('storage gauge shows correct user image count', async () => {
    test.setTimeout(TIMEOUT);
    await p100.locator('#settingsBtn').click();
    const imagesTab = p100.locator('#settingsModal .settings-nav-item[data-section="images"]');
    if (await imagesTab.isVisible()) await imagesTab.click();
    await p100.waitForFunction(() => {
      const el = document.getElementById('gaugeUserSize');
      return el && el.textContent && !el.textContent.includes('—');
    }, { timeout: 10_000 });
    const gaugeText = await p100.locator('#gaugeUserSize').textContent();
    expect(gaugeText).toContain(`${COUNT}`);
    await p100.keyboard.press('Escape');
  });

  test('export ZIP contains correct user image file count', async () => {
    test.setTimeout(TIMEOUT);
    const stats = await p100.evaluate(async () => {
      const zip = await buildImageExportZip({ includeCdn: false });
      const blob = await zip.generateAsync({ type: 'blob' });
      const ab = await blob.arrayBuffer();
      const loaded = await JSZip.loadAsync(ab);
      const userFiles = Object.keys(loaded.files).filter(
        k => k.startsWith('user/') && !loaded.files[k].dir
      );
      const uuids = new Set(
        userFiles.map(f => f.replace(/^user\//, '').replace(/_(obverse|reverse)\.webp$/, ''))
      );
      return { blobBytes: blob.size, userFileCount: userFiles.length, uniqueUuids: uuids.size };
    });
    expect(stats.blobBytes).toBeGreaterThan(0);
    expect(stats.uniqueUuids).toBe(COUNT);
    expect(stats.userFileCount).toBe(COUNT + COUNT / 2);
  });

  test('clear Numista cache does not remove user images', async () => {
    test.setTimeout(TIMEOUT);
    const beforeCount = await p100.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.userImageCount)
    );
    await p100.locator('#settingsBtn').click();
    const imagesTab = p100.locator('#settingsModal .settings-nav-item[data-section="images"]');
    if (await imagesTab.isVisible()) await imagesTab.click();
    const clearBtn = p100.locator('#clearNumistaCacheBtn');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      const dialog = p100.locator('#appDialogModal');
      if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
        await p100.locator('#appDialogOk').click();
        await expect(dialog).not.toBeVisible();
      }
    }
    await p100.keyboard.press('Escape');
    const afterCount = await p100.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.userImageCount)
    );
    expect(afterCount).toBe(beforeCount);
    const numistaCount = await p100.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.numistaCount)
    );
    expect(numistaCount).toBe(0);
  });

  test('edit first item name via UI', async () => {
    test.setTimeout(TIMEOUT);
    await switchToTableView(p100);
    const firstRow = p100.locator('#inventoryTable tbody tr').first();
    await firstRow.locator('[title="Edit item"]').first().click();
    await expect(p100.locator('#itemModal')).toBeVisible({ timeout: 5000 });
    await p100.locator('#itemModal #itemName').fill('Stress Coin EDITED');
    await p100.locator('#itemModalSubmit').click();
    await expect(p100.locator('#itemModal')).not.toBeVisible();
    await expect(p100.locator('#inventoryTable tbody')).toContainText('Stress Coin EDITED');
  });

  test('import ZIP restores image count after clear', async () => {
    test.setTimeout(TIMEOUT);
    const tempPath = path.join(process.cwd(), 'test-results', `stress-images-${COUNT}.zip`);
    await p100.evaluate(async (fp) => {
      const zip = await buildImageExportZip({ includeCdn: false });
      const uint8 = await zip.generateAsync({ type: 'uint8array' });
      await window.__writeFile100(fp, Array.from(uint8));
    }, tempPath);
    await p100.evaluate(async () => {
      const all = await imageCache.exportAllUserImages();
      for (const rec of all) await imageCache.deleteUserImage(rec.uuid);
    });
    const afterClear = await p100.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.userImageCount)
    );
    expect(afterClear).toBe(0);
    await p100.locator('#importImagesFile').setInputFiles(tempPath);
    const deadline = Date.now() + 30_000;
    let afterImport = 0;
    while (Date.now() < deadline) {
      afterImport = await p100.evaluate(() =>
        imageCache.getStorageUsage().then(u => u.userImageCount)
      );
      if (afterImport >= COUNT) break;
      await p100.waitForTimeout(500);
    }
    expect(afterImport).toBe(COUNT);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  });

  test('importing ZIP twice does not double the image count', async () => {
    test.setTimeout(TIMEOUT);
    const tempPath = path.join(process.cwd(), 'test-results', `stress-dup-${COUNT}.zip`);
    await p100.evaluate(async (fp) => {
      const zip = await buildImageExportZip({ includeCdn: false });
      const uint8 = await zip.generateAsync({ type: 'uint8array' });
      await window.__writeFile100(fp, Array.from(uint8));
    }, tempPath);
    const before = await p100.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.userImageCount)
    );
    // First import — poll until count stabilises back to `before`
    await p100.locator('#importImagesFile').setInputFiles(tempPath);
    const dl1 = Date.now() + 30_000;
    while (Date.now() < dl1) {
      const n = await p100.evaluate(() =>
        imageCache.getStorageUsage().then(u => u.userImageCount)
      );
      if (n >= before) break;
      await p100.waitForTimeout(500);
    }
    // Second import — count should stay the same (upsert by UUID)
    await p100.locator('#importImagesFile').setInputFiles(tempPath);
    const dl2 = Date.now() + 30_000;
    while (Date.now() < dl2) {
      const n = await p100.evaluate(() =>
        imageCache.getStorageUsage().then(u => u.userImageCount)
      );
      if (n >= before) break;
      await p100.waitForTimeout(500);
    }
    const after = await p100.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.userImageCount)
    );
    expect(after).toBe(before);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  });

  test('delete last item via UI', async () => {
    test.setTimeout(TIMEOUT);
    await switchToTableView(p100);
    const rowsBefore = await p100.locator('#inventoryTable tbody tr').count();
    const lastRow = p100.locator('#inventoryTable tbody tr').last();
    await lastRow.locator('[title="Delete item"]').first().click();
    await expect(p100.locator('#appDialogModal')).toBeVisible({ timeout: 3000 });
    await p100.locator('#appDialogOk').click();
    await expect(p100.locator('#appDialogModal')).not.toBeVisible();
    const rowsAfter = await p100.locator('#inventoryTable tbody tr').count();
    expect(rowsAfter).toBe(rowsBefore - 1);
  });
});

// ─────────────────────────────────────────────────────────────
// 500-item scale — single shared context, seeded once in beforeAll.
// Tests run serially and share one page to avoid re-seeding 8× which
// exhausts Chrome's V8 heap inside browserless Docker.
// afterAll closes the context so memory is released before the 1000-item suite.
// ─────────────────────────────────────────────────────────────
test.describe('Image storage stress — 500 items', () => {
  const COUNT = 500;
  const TIMEOUT = 120_000;
  test.describe.configure({ mode: 'serial' });

  /** @type {import('@playwright/test').Page} */
  let p500;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    p500 = await ctx.newPage();
    const url = process.env.TEST_URL || 'http://host.docker.internal:8765';
    await p500.goto(url);
    await dismissAllStartupModals(p500);
    await wipeAllData(p500);
    const result = await seedImageInventory(p500, COUNT, 1);
    expect(result.seededItems).toBe(COUNT);
    await p500.goto(url);
    await dismissAllStartupModals(p500);
    // Expose a single file-writer for all ZIP tests in this suite.
    await p500.exposeFunction('__writeFile500', (filePath, chunks) => {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, Buffer.from(chunks));
    });
  }, TIMEOUT);

  test.afterAll(async () => {
    // Release context so Chrome frees the 500-item IndexedDB heap
    // before the 1000-item suite starts.
    await p500.context().close();
  });

  // Tests ordered: read-only first → edit (name only) → import (restores) → double-import → delete (last)
  test('dynamic quota is greater than 50 MB', async () => {
    test.setTimeout(TIMEOUT);
    const quotaBytes = await p500.evaluate(() => imageCache._quotaBytes);
    expect(quotaBytes).toBeGreaterThan(50 * 1024 * 1024);
  });

  test('storage gauge shows correct user image count', async () => {
    test.setTimeout(TIMEOUT);
    await p500.locator('#settingsBtn').click();
    const imagesTab = p500.locator('#settingsModal .settings-nav-item[data-section="images"]');
    if (await imagesTab.isVisible()) await imagesTab.click();
    await p500.waitForFunction(() => {
      const el = document.getElementById('gaugeUserSize');
      return el && el.textContent && !el.textContent.includes('—');
    }, { timeout: 10_000 });
    const gaugeText = await p500.locator('#gaugeUserSize').textContent();
    expect(gaugeText).toContain(`${COUNT}`);
    await p500.keyboard.press('Escape');
  });

  test('export ZIP contains correct user image file count', async () => {
    test.setTimeout(TIMEOUT);
    const stats = await p500.evaluate(async () => {
      const zip = await buildImageExportZip({ includeCdn: false });
      const blob = await zip.generateAsync({ type: 'blob' });
      const ab = await blob.arrayBuffer();
      const loaded = await JSZip.loadAsync(ab);
      const userFiles = Object.keys(loaded.files).filter(
        k => k.startsWith('user/') && !loaded.files[k].dir
      );
      const uuids = new Set(
        userFiles.map(f => f.replace(/^user\//, '').replace(/_(obverse|reverse)\.webp$/, ''))
      );
      return { blobBytes: blob.size, userFileCount: userFiles.length, uniqueUuids: uuids.size };
    });
    expect(stats.blobBytes).toBeGreaterThan(0);
    expect(stats.uniqueUuids).toBe(COUNT);
    expect(stats.userFileCount).toBe(COUNT + COUNT / 2);
  });

  test('clear Numista cache does not remove user images', async () => {
    test.setTimeout(TIMEOUT);
    const beforeCount = await p500.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.userImageCount)
    );
    await p500.locator('#settingsBtn').click();
    const imagesTab = p500.locator('#settingsModal .settings-nav-item[data-section="images"]');
    if (await imagesTab.isVisible()) await imagesTab.click();
    const clearBtn = p500.locator('#clearNumistaCacheBtn');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      const dialog = p500.locator('#appDialogModal');
      if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
        await p500.locator('#appDialogOk').click();
        await expect(dialog).not.toBeVisible();
      }
    }
    await p500.keyboard.press('Escape');
    const afterCount = await p500.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.userImageCount)
    );
    expect(afterCount).toBe(beforeCount);
    const numistaCount = await p500.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.numistaCount)
    );
    expect(numistaCount).toBe(0);
  });

  test('edit first item name via UI', async () => {
    test.setTimeout(TIMEOUT);
    await switchToTableView(p500);
    const firstRow = p500.locator('#inventoryTable tbody tr').first();
    await firstRow.locator('[title="Edit item"]').first().click();
    await expect(p500.locator('#itemModal')).toBeVisible({ timeout: 5000 });
    await p500.locator('#itemModal #itemName').fill('Stress Coin EDITED');
    await p500.locator('#itemModalSubmit').click();
    await expect(p500.locator('#itemModal')).not.toBeVisible();
    await expect(p500.locator('#inventoryTable tbody')).toContainText('Stress Coin EDITED');
  });

  test('import ZIP restores image count after clear', async () => {
    test.setTimeout(TIMEOUT);
    const tempPath = path.join(process.cwd(), 'test-results', `stress-images-${COUNT}.zip`);
    await p500.evaluate(async (fp) => {
      const zip = await buildImageExportZip({ includeCdn: false });
      const uint8 = await zip.generateAsync({ type: 'uint8array' });
      await window.__writeFile500(fp, Array.from(uint8));
    }, tempPath);
    await p500.evaluate(async () => {
      const all = await imageCache.exportAllUserImages();
      for (const rec of all) await imageCache.deleteUserImage(rec.uuid);
    });
    const afterClear = await p500.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.userImageCount)
    );
    expect(afterClear).toBe(0);
    await p500.locator('#importImagesFile').setInputFiles(tempPath);
    const deadline = Date.now() + 60_000;
    let afterImport = 0;
    while (Date.now() < deadline) {
      afterImport = await p500.evaluate(() =>
        imageCache.getStorageUsage().then(u => u.userImageCount)
      );
      if (afterImport >= COUNT) break;
      await p500.waitForTimeout(500);
    }
    expect(afterImport).toBe(COUNT);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  });

  test('importing ZIP twice does not double the image count', async () => {
    test.setTimeout(TIMEOUT);
    const tempPath = path.join(process.cwd(), 'test-results', `stress-dup-${COUNT}.zip`);
    await p500.evaluate(async (fp) => {
      const zip = await buildImageExportZip({ includeCdn: false });
      const uint8 = await zip.generateAsync({ type: 'uint8array' });
      await window.__writeFile500(fp, Array.from(uint8));
    }, tempPath);
    const before = await p500.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.userImageCount)
    );
    // First import — poll until count stabilises back to `before`
    await p500.locator('#importImagesFile').setInputFiles(tempPath);
    const dl1 = Date.now() + 60_000;
    while (Date.now() < dl1) {
      const n = await p500.evaluate(() =>
        imageCache.getStorageUsage().then(u => u.userImageCount)
      );
      if (n >= before) break;
      await p500.waitForTimeout(500);
    }
    // Second import — count should stay the same (upsert by UUID)
    await p500.locator('#importImagesFile').setInputFiles(tempPath);
    const dl2 = Date.now() + 60_000;
    while (Date.now() < dl2) {
      const n = await p500.evaluate(() =>
        imageCache.getStorageUsage().then(u => u.userImageCount)
      );
      if (n >= before) break;
      await p500.waitForTimeout(500);
    }
    const after = await p500.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.userImageCount)
    );
    expect(after).toBe(before);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  });

  test('delete last item via UI', async () => {
    test.setTimeout(TIMEOUT);
    await switchToTableView(p500);
    const rowsBefore = await p500.locator('#inventoryTable tbody tr').count();
    const lastRow = p500.locator('#inventoryTable tbody tr').last();
    await lastRow.locator('[title="Delete item"]').first().click();
    await expect(p500.locator('#appDialogModal')).toBeVisible({ timeout: 3000 });
    await p500.locator('#appDialogOk').click();
    await expect(p500.locator('#appDialogModal')).not.toBeVisible();
    const rowsAfter = await p500.locator('#inventoryTable tbody tr').count();
    expect(rowsAfter).toBe(rowsBefore - 1);
  });
});

// ─────────────────────────────────────────────────────────────
// 1000-item scale — same beforeAll/serial pattern as 500-item.
// ─────────────────────────────────────────────────────────────
test.describe('Image storage stress — 1000 items', () => {
  const COUNT = 1000;
  const TIMEOUT = 180_000;
  test.describe.configure({ mode: 'serial' });

  /** @type {import('@playwright/test').Page} */
  let p1000;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    p1000 = await ctx.newPage();
    const url = process.env.TEST_URL || 'http://host.docker.internal:8765';
    await p1000.goto(url);
    await dismissAllStartupModals(p1000);
    await wipeAllData(p1000);
    const result = await seedImageInventory(p1000, COUNT, 1);
    expect(result.seededItems).toBe(COUNT);
    await p1000.goto(url);
    await dismissAllStartupModals(p1000);
    await p1000.exposeFunction('__writeFile1000', (filePath, chunks) => {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, Buffer.from(chunks));
    });
  }, TIMEOUT);

  test.afterAll(async () => {
    await p1000.context().close();
  });

  test('dynamic quota is greater than 50 MB', async () => {
    test.setTimeout(TIMEOUT);
    const quotaBytes = await p1000.evaluate(() => imageCache._quotaBytes);
    expect(quotaBytes).toBeGreaterThan(50 * 1024 * 1024);
  });

  test('storage gauge shows correct user image count', async () => {
    test.setTimeout(TIMEOUT);
    await p1000.locator('#settingsBtn').click();
    const imagesTab = p1000.locator('#settingsModal .settings-nav-item[data-section="images"]');
    if (await imagesTab.isVisible()) await imagesTab.click();
    await p1000.waitForFunction(() => {
      const el = document.getElementById('gaugeUserSize');
      return el && el.textContent && !el.textContent.includes('—');
    }, { timeout: 15_000 });
    const gaugeText = await p1000.locator('#gaugeUserSize').textContent();
    expect(gaugeText).toContain(`${COUNT}`);
    await p1000.keyboard.press('Escape');
  });

  test('export ZIP contains correct user image file count', async () => {
    test.setTimeout(TIMEOUT);
    const stats = await p1000.evaluate(async () => {
      const zip = await buildImageExportZip({ includeCdn: false });
      const blob = await zip.generateAsync({ type: 'blob' });
      const ab = await blob.arrayBuffer();
      const loaded = await JSZip.loadAsync(ab);
      const userFiles = Object.keys(loaded.files).filter(
        k => k.startsWith('user/') && !loaded.files[k].dir
      );
      const uuids = new Set(
        userFiles.map(f => f.replace(/^user\//, '').replace(/_(obverse|reverse)\.webp$/, ''))
      );
      return { blobBytes: blob.size, userFileCount: userFiles.length, uniqueUuids: uuids.size };
    });
    expect(stats.blobBytes).toBeGreaterThan(0);
    expect(stats.uniqueUuids).toBe(COUNT);
    expect(stats.userFileCount).toBe(COUNT + COUNT / 2);
  });

  test('clear Numista cache does not remove user images', async () => {
    test.setTimeout(TIMEOUT);
    const beforeCount = await p1000.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.userImageCount)
    );
    await p1000.locator('#settingsBtn').click();
    const imagesTab = p1000.locator('#settingsModal .settings-nav-item[data-section="images"]');
    if (await imagesTab.isVisible()) await imagesTab.click();
    const clearBtn = p1000.locator('#clearNumistaCacheBtn');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      const dialog = p1000.locator('#appDialogModal');
      if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
        await p1000.locator('#appDialogOk').click();
        await expect(dialog).not.toBeVisible();
      }
    }
    await p1000.keyboard.press('Escape');
    const afterCount = await p1000.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.userImageCount)
    );
    expect(afterCount).toBe(beforeCount);
    const numistaCount = await p1000.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.numistaCount)
    );
    expect(numistaCount).toBe(0);
  });

  test('edit first item name via UI', async () => {
    test.setTimeout(TIMEOUT);
    await switchToTableView(p1000);
    const firstRow = p1000.locator('#inventoryTable tbody tr').first();
    await firstRow.locator('[title="Edit item"]').first().click();
    await expect(p1000.locator('#itemModal')).toBeVisible({ timeout: 5000 });
    await p1000.locator('#itemModal #itemName').fill('Stress Coin EDITED');
    await p1000.locator('#itemModalSubmit').click();
    await expect(p1000.locator('#itemModal')).not.toBeVisible();
    await expect(p1000.locator('#inventoryTable tbody')).toContainText('Stress Coin EDITED');
  });

  test('import ZIP restores image count after clear', async () => {
    test.setTimeout(TIMEOUT);
    const tempPath = path.join(process.cwd(), 'test-results', `stress-images-${COUNT}.zip`);
    await p1000.evaluate(async (fp) => {
      const zip = await buildImageExportZip({ includeCdn: false });
      const uint8 = await zip.generateAsync({ type: 'uint8array' });
      await window.__writeFile1000(fp, Array.from(uint8));
    }, tempPath);
    await p1000.evaluate(async () => {
      const all = await imageCache.exportAllUserImages();
      for (const rec of all) await imageCache.deleteUserImage(rec.uuid);
    });
    const afterClear = await p1000.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.userImageCount)
    );
    expect(afterClear).toBe(0);
    await p1000.locator('#importImagesFile').setInputFiles(tempPath);
    const deadline = Date.now() + 90_000;
    let afterImport = 0;
    while (Date.now() < deadline) {
      afterImport = await p1000.evaluate(() =>
        imageCache.getStorageUsage().then(u => u.userImageCount)
      );
      if (afterImport >= COUNT) break;
      await p1000.waitForTimeout(500);
    }
    expect(afterImport).toBe(COUNT);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  });

  test('importing ZIP twice does not double the image count', async () => {
    test.setTimeout(TIMEOUT);
    const tempPath = path.join(process.cwd(), 'test-results', `stress-dup-${COUNT}.zip`);
    await p1000.evaluate(async (fp) => {
      const zip = await buildImageExportZip({ includeCdn: false });
      const uint8 = await zip.generateAsync({ type: 'uint8array' });
      await window.__writeFile1000(fp, Array.from(uint8));
    }, tempPath);
    const before = await p1000.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.userImageCount)
    );
    // First import — poll until count stabilises back to `before`
    await p1000.locator('#importImagesFile').setInputFiles(tempPath);
    const dl1 = Date.now() + 90_000;
    while (Date.now() < dl1) {
      const n = await p1000.evaluate(() =>
        imageCache.getStorageUsage().then(u => u.userImageCount)
      );
      if (n >= before) break;
      await p1000.waitForTimeout(500);
    }
    // Second import — count should stay the same (upsert by UUID)
    await p1000.locator('#importImagesFile').setInputFiles(tempPath);
    const dl2 = Date.now() + 90_000;
    while (Date.now() < dl2) {
      const n = await p1000.evaluate(() =>
        imageCache.getStorageUsage().then(u => u.userImageCount)
      );
      if (n >= before) break;
      await p1000.waitForTimeout(500);
    }
    const after = await p1000.evaluate(() =>
      imageCache.getStorageUsage().then(u => u.userImageCount)
    );
    expect(after).toBe(before);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  });

  test('delete last item via UI', async () => {
    test.setTimeout(TIMEOUT);
    // Navigate to release memory accumulated by prior import tests before
    // rendering a 1000-row table (which would otherwise OOM the browser).
    const url = process.env.TEST_URL || 'http://host.docker.internal:8765';
    await p1000.goto(url);
    await dismissAllStartupModals(p1000);
    await switchToTableView(p1000);
    const rowsBefore = await p1000.locator('#inventoryTable tbody tr').count();
    const lastRow = p1000.locator('#inventoryTable tbody tr').last();
    await lastRow.locator('[title="Delete item"]').first().click();
    await expect(p1000.locator('#appDialogModal')).toBeVisible({ timeout: 3000 });
    await p1000.locator('#appDialogOk').click();
    await expect(p1000.locator('#appDialogModal')).not.toBeVisible();
    const rowsAfter = await p1000.locator('#inventoryTable tbody tr').count();
    expect(rowsAfter).toBe(rowsBefore - 1);
  });
});

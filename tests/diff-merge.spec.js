/**
 * diff-merge.spec.js — E2E Playwright tests for diff/merge import flows (STAK-184, Task 11)
 *
 * StakTrakr is a single-page vanilla JS app served from index.html with no build step.
 * All state is persisted in localStorage under the key 'metalInventory'.
 *
 * Test server: These tests expect the app to be served via a local HTTP server.
 * The Playwright config (playwright.config.js) sets baseURL to
 * http://host.docker.internal:8765 by default (for Browserless Docker),
 * overridable via TEST_URL env var.
 *
 * Start the server before running tests:
 *   npx http-server . -p 8765 --cors -c-1
 *
 * Run tests:
 *   npx playwright test tests/diff-merge.spec.js
 */

// @ts-check
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dismissAllStartupModals } from './test-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Seed inventory fixture (5 items)
// ---------------------------------------------------------------------------

const SEED_INVENTORY = [
  {
    uuid: 'test-001', serial: 'SN-001', serialNumber: '', name: '2023 American Eagle',
    metal: 'Silver', composition: 'Silver', type: 'Coin', weight: 1, weightUnit: 'oz',
    purity: 1.0, qty: 3, price: 29.99, purchasePrice: 29.99, marketValue: 0,
    date: '2023-01-15', numistaId: '', year: '2023', grade: '', gradingAuthority: '',
    certNumber: '', pcgsNumber: '', pcgsVerified: false, spotPriceAtPurchase: 0,
    premiumPerOz: 0, totalPremium: 0, purchaseLocation: '', storageLocation: '',
    notes: '', obverseImageUrl: '', reverseImageUrl: '',
  },
  {
    uuid: 'test-002', serial: 'SN-002', serialNumber: '', name: 'Credit Suisse 1oz',
    metal: 'Gold', composition: 'Gold', type: 'Bar', weight: 1, weightUnit: 'oz',
    purity: 1.0, qty: 1, price: 1950.00, purchasePrice: 1950.00, marketValue: 0,
    date: '2023-03-10', numistaId: '', year: '2023', grade: '', gradingAuthority: '',
    certNumber: '', pcgsNumber: '', pcgsVerified: false, spotPriceAtPurchase: 0,
    premiumPerOz: 0, totalPremium: 0, purchaseLocation: '', storageLocation: '',
    notes: '', obverseImageUrl: '', reverseImageUrl: '',
  },
  {
    uuid: 'test-003', serial: 'SN-003', serialNumber: '', name: 'Generic Silver Round',
    metal: 'Silver', composition: 'Silver', type: 'Round', weight: 1, weightUnit: 'oz',
    purity: 1.0, qty: 10, price: 24.50, purchasePrice: 24.50, marketValue: 0,
    date: '2023-05-20', numistaId: '', year: '2023', grade: '', gradingAuthority: '',
    certNumber: '', pcgsNumber: '', pcgsVerified: false, spotPriceAtPurchase: 0,
    premiumPerOz: 0, totalPremium: 0, purchaseLocation: '', storageLocation: '',
    notes: '', obverseImageUrl: '', reverseImageUrl: '',
  },
  {
    uuid: 'test-004', serial: 'SN-004', serialNumber: '', name: '1oz Palladium Bar',
    metal: 'Palladium', composition: 'Palladium', type: 'Bar', weight: 1, weightUnit: 'oz',
    purity: 1.0, qty: 1, price: 1450.00, purchasePrice: 1450.00, marketValue: 0,
    date: '2023-07-01', numistaId: '', year: '2023', grade: '', gradingAuthority: '',
    certNumber: '', pcgsNumber: '', pcgsVerified: false, spotPriceAtPurchase: 0,
    premiumPerOz: 0, totalPremium: 0, purchaseLocation: '', storageLocation: '',
    notes: '', obverseImageUrl: '', reverseImageUrl: '',
  },
  {
    uuid: 'test-005', serial: 'SN-005', serialNumber: '', name: '10oz Sunshine Bar',
    metal: 'Silver', composition: 'Silver', type: 'Bar', weight: 10, weightUnit: 'oz',
    purity: 1.0, qty: 2, price: 245.00, purchasePrice: 245.00, marketValue: 0,
    date: '2023-09-15', numistaId: '', year: '2023', grade: '', gradingAuthority: '',
    certNumber: '', pcgsNumber: '', pcgsVerified: false, spotPriceAtPurchase: 0,
    premiumPerOz: 0, totalPremium: 0, purchaseLocation: '', storageLocation: '',
    notes: '', obverseImageUrl: '', reverseImageUrl: '',
  },
];

// ---------------------------------------------------------------------------
// CSV fixture: 3 matching (SN-001 modified, SN-002/SN-003 unchanged) + 2 new
// ---------------------------------------------------------------------------

const TEST_CSV = `name,metal,weight,qty,purchasePrice,date,serial,UUID
"2023 American Eagle",Silver,1,5,31.50,2023-01-15,SN-001,test-001
"Credit Suisse 1oz",Gold,1,1,1950.00,2023-03-10,SN-002,test-002
"Generic Silver Round",Silver,1,10,24.50,2023-05-20,SN-003,test-003
"2025 Silver Eagle",Silver,1,5,33.00,2025-01-10,SN-NEW-001,new-001
"2024 Gold Maple",Gold,1,1,2100.00,2024-06-15,SN-NEW-002,new-002`;

// ---------------------------------------------------------------------------
// CSV fixture: backward-compat — NO UUID column (old exports / third-party)
// Serial matching bridge should kick in so items match by serial → local UUID
// ---------------------------------------------------------------------------

const LEGACY_CSV_NO_UUID = `name,metal,weight,qty,purchasePrice,date,serial
"2023 American Eagle",Silver,1,5,31.50,2023-01-15,SN-001
"Credit Suisse 1oz",Gold,1,1,1950.00,2023-03-10,SN-002
"Generic Silver Round",Silver,1,10,24.50,2023-05-20,SN-003
"2025 Silver Eagle",Silver,1,5,33.00,2025-01-10,SN-NEW-001
"2024 Gold Maple",Gold,1,1,2100.00,2024-06-15,SN-NEW-002`;

// ---------------------------------------------------------------------------
// CSV fixture that exactly matches seed inventory (zero diff)
// ---------------------------------------------------------------------------

const EXACT_MATCH_CSV = `name,metal,weight,qty,purchasePrice,date,serial,UUID
"2023 American Eagle",Silver,1,3,29.99,2023-01-15,SN-001,test-001
"Credit Suisse 1oz",Gold,1,1,1950.00,2023-03-10,SN-002,test-002
"Generic Silver Round",Silver,1,10,24.50,2023-05-20,SN-003,test-003
"1oz Palladium Bar",Palladium,1,1,1450.00,2023-07-01,SN-004,test-004
"10oz Sunshine Bar",Silver,10,2,245.00,2023-09-15,SN-005,test-005`;

// ---------------------------------------------------------------------------
// JSON fixture: seed + 1 new item + settings
// ---------------------------------------------------------------------------

const TEST_JSON = {
  items: [
    ...SEED_INVENTORY,
    {
      uuid: 'test-new-1', serial: 'SN-JSON-001', serialNumber: '', name: 'New JSON Item',
      metal: 'Silver', composition: 'Silver', type: 'Round', weight: 1, weightUnit: 'oz',
      purity: 1.0, qty: 1, price: 30.00, purchasePrice: 30.00, marketValue: 0,
      date: '2025-01-01', numistaId: '', year: '2025', grade: '', gradingAuthority: '',
      certNumber: '', pcgsNumber: '', pcgsVerified: false, spotPriceAtPurchase: 0,
      premiumPerOz: 0, totalPremium: 0, purchaseLocation: '', storageLocation: '',
      notes: '', obverseImageUrl: '', reverseImageUrl: '',
    },
  ],
  settings: {
    appTheme: 'dark',
    displayCurrency: 'EUR',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Seeds inventory into localStorage and reloads the page so the app picks it up.
 * Also dismisses startup modals (acknowledgment + version "What's New").
 * @param {import('@playwright/test').Page} page
 */
async function seedAndReload(page) {
  await page.evaluate((items) => {
    // Clear all localStorage first to prevent quota issues from accumulated
    // data (e.g. retailIntradayData) across tests in quota-limited containers
    localStorage.clear();
    localStorage.setItem('metalInventory', JSON.stringify(items));
    // Set serial counter high enough to avoid collisions
    localStorage.setItem('inventorySerial', '1000');
  }, SEED_INVENTORY);
  await page.reload();
  await dismissAllStartupModals(page);
  // Wait for inventory table to be present in the DOM
  await page.waitForSelector('#inventoryTable', { timeout: 15000 });
}

/**
 * Creates a temporary file on disk and returns its absolute path.
 * @param {string} filename
 * @param {string} content
 * @returns {string} Absolute path to the temp file
 */
function writeTempFile(filename, content) {
  const tmpPath = path.join(__dirname, `_temp_${filename}`);
  fs.writeFileSync(tmpPath, content, 'utf8');
  return tmpPath;
}

/**
 * Opens Settings > System section (where import/export buttons live).
 * @param {import('@playwright/test').Page} page
 */
async function openImportSection(page) {
  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsModal')).toBeVisible({ timeout: 5000 });
  const systemTab = page.locator('#settingsModal .settings-nav-item[data-section="system"]');
  await systemTab.click();
}

/**
 * Returns current inventory item count from localStorage.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>}
 */
async function getInventoryCount(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('metalInventory');
    if (!raw) return 0;
    try { return JSON.parse(raw).length; } catch { return 0; }
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('Diff/Merge Import Flows', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate and dismiss startup modals
    await page.goto('/');
    await dismissAllStartupModals(page);
  });

  test.afterAll(() => {
    // Clean up any temp files created during tests
    const patterns = ['_temp_import.csv', '_temp_import.json', '_temp_exact.csv', '_temp_override.csv', '_temp_override.json', '_temp_legacy.csv'];
    for (const p of patterns) {
      const fp = path.join(__dirname, p);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
  });

  // -----------------------------------------------------------------------
  // Test 1: CSV import with DiffModal review — correct counts, apply works
  // -----------------------------------------------------------------------

  test('CSV import shows DiffModal with correct counts and apply updates inventory', async ({ page }) => {
    await seedAndReload(page);

    const initialCount = await getInventoryCount(page);
    expect(initialCount).toBe(5);

    // Write temp CSV to disk
    const csvPath = writeTempFile('import.csv', TEST_CSV);

    // Open settings and navigate to import section
    await openImportSection(page);

    // Click "Merge CSV" to trigger merge (non-override) flow
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#importCsvMerge').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(csvPath);

    // DiffModal should appear
    const modal = page.locator('#diffReviewModal');
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Verify summary chips show expected counts:
    //   SN-001: modified (qty 3->5, purchasePrice 29.99->31.50)
    //   SN-002, SN-003: unchanged
    //   SN-NEW-001, SN-NEW-002: added
    //   SN-004, SN-005: deleted (not in CSV)
    const summary = page.locator('#diffReviewSummary');
    await expect(summary).toBeVisible();

    // Check that "added" chip is present with count 2
    await expect(summary.locator('text=/\\+2 added/')).toBeVisible();
    // Check that "modified" chip is present (CSV parsing produces field diffs on matching items)
    await expect(summary.locator('text=/modified/')).toBeVisible();

    // Apply button should be enabled with a count
    const applyBtn = page.locator('#diffReviewApplyBtn');
    await expect(applyBtn).toBeEnabled();
    const applyText = await applyBtn.textContent();
    // Should show non-zero count like "Apply (5)" or "Apply (3)"
    expect(applyText).toMatch(/Apply\s*\(\d+\)/);

    // Click Apply
    await applyBtn.click();

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // With all checked: 2 added, 3 modified (in place), 2 deleted = 5 - 2 + 2 = 5 items
    // Wait a beat for localStorage to be updated
    await page.waitForTimeout(500);
    const finalCount = await getInventoryCount(page);
    // We expect 5 items: SN-001 (modified), SN-002, SN-003 (unchanged), SN-NEW-001, SN-NEW-002 (added)
    // SN-004 and SN-005 are deleted
    expect(finalCount).toBe(5);
  });

  // -----------------------------------------------------------------------
  // Test 2: CSV import cancel — inventory unchanged
  // -----------------------------------------------------------------------

  test('CSV import cancel leaves inventory unchanged', async ({ page }) => {
    await seedAndReload(page);

    const initialCount = await getInventoryCount(page);
    expect(initialCount).toBe(5);

    const csvPath = writeTempFile('import.csv', TEST_CSV);

    await openImportSection(page);

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#importCsvMerge').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(csvPath);

    // Wait for DiffModal
    const modal = page.locator('#diffReviewModal');
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Click Cancel
    await page.locator('#diffReviewCancelBtn').click();

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Inventory must be unchanged
    const finalCount = await getInventoryCount(page);
    expect(finalCount).toBe(5);

    // Verify the exact same items are still present (unchanged serials)
    const serials = await page.evaluate(() => {
      const items = JSON.parse(localStorage.getItem('metalInventory') || '[]');
      return items.map(/** @param {any} i */ (i) => i.serial).sort();
    });
    expect(serials).toEqual(['SN-001', 'SN-002', 'SN-003', 'SN-004', 'SN-005']);
  });

  // -----------------------------------------------------------------------
  // Test 3: JSON import with DiffModal and settings diff section
  // -----------------------------------------------------------------------

  test('JSON import shows DiffModal with settings diff and apply updates inventory', async ({ page }) => {
    await seedAndReload(page);

    // Write JSON fixture to disk
    const jsonPath = writeTempFile('import.json', JSON.stringify(TEST_JSON));

    await openImportSection(page);

    // Click "Merge JSON" button to trigger merge (non-override) flow
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#importJsonMerge').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(jsonPath);

    // DiffModal should appear
    const modal = page.locator('#diffReviewModal');
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Summary should show 1 added item (SN-JSON-001) and modified/unchanged chips
    const summary = page.locator('#diffReviewSummary');
    await expect(summary).toBeVisible();
    await expect(summary.locator('text=/\\+1 added/')).toBeVisible();

    // Settings diff section should be visible with content
    const settingsSection = page.locator('#diffReviewSettings');
    await expect(settingsSection).toBeVisible();
    // Should mention setting changes (appTheme and/or displayCurrency)
    const settingsText = await settingsSection.textContent();
    expect(settingsText.length).toBeGreaterThan(0);
    // At least one of the changed settings should appear
    expect(settingsText).toMatch(/appTheme|displayCurrency|setting/i);

    // Apply and verify modal closes
    const applyBtn = page.locator('#diffReviewApplyBtn');
    await applyBtn.click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Wait for "Import complete" toast (showImportDiffReview fires it after save)
    const toast = page.locator('.cloud-toast');
    await expect(toast).toBeVisible({ timeout: 10000 });
    const toastText = await toast.textContent();
    expect(toastText).toMatch(/import complete/i);

    // Verify the new item was added — check by name (serial is sanitized by the app)
    const result = await page.evaluate(() => {
      const inv = JSON.parse(localStorage.getItem('metalInventory') || '[]');
      return {
        count: inv.length,
        hasNewItem: inv.some(i => i.name === 'New JSON Item'),
      };
    });
    expect(result.hasNewItem).toBe(true);
    expect(result.count).toBe(6);
  });

  // -----------------------------------------------------------------------
  // Test 4: Override mode bypasses DiffModal entirely
  // -----------------------------------------------------------------------

  test('Override import bypasses DiffModal and replaces inventory', async ({ page }) => {
    await seedAndReload(page);

    const initialCount = await getInventoryCount(page);
    expect(initialCount).toBe(5);

    // CSV with only 2 items — override should replace all 5 with these 2
    const overrideCsv = `name,metal,weight,qty,purchasePrice,date,serial
"Override Item A",Silver,1,1,30.00,2025-01-01,SN-OVR-001
"Override Item B",Gold,1,1,2000.00,2025-02-01,SN-OVR-002`;
    const csvPath = writeTempFile('override.csv', overrideCsv);

    await openImportSection(page);

    // Click the override "Import CSV" button — triggers a confirmation dialog
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#importCsvOverride').click();

    // The app shows an appConfirm dialog first — accept it
    const confirmDialog = page.locator('#appDialogModal');
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    await page.locator('#appDialogOk').click();

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(csvPath);

    // DiffModal should NOT appear — override skips it
    const modal = page.locator('#diffReviewModal');
    // Give a short window for it to potentially appear, then confirm it did not
    await page.waitForTimeout(1500);
    await expect(modal).not.toBeVisible();

    // Inventory should be replaced with exactly 2 items
    await page.waitForTimeout(500);
    const finalCount = await getInventoryCount(page);
    expect(finalCount).toBe(2);
  });

  // -----------------------------------------------------------------------
  // Test 5: Select All / Deselect All toggle
  // -----------------------------------------------------------------------

  test('Select All and Deselect All toggle Apply button count', async ({ page }) => {
    await seedAndReload(page);

    const csvPath = writeTempFile('import.csv', TEST_CSV);

    await openImportSection(page);

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#importCsvMerge').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(csvPath);

    // Wait for DiffModal
    const modal = page.locator('#diffReviewModal');
    await expect(modal).toBeVisible({ timeout: 10000 });

    const applyBtn = page.locator('#diffReviewApplyBtn');

    // Initially all items should be selected — Apply button shows a count
    await expect(applyBtn).toBeEnabled();
    const initialText = await applyBtn.textContent();
    expect(initialText).toMatch(/Apply\s*\(\d+\)/);

    // Click Deselect All
    await page.locator('#diffReviewDeselectAll').click();

    // Apply button should now show zero count or be disabled
    await expect(applyBtn).toBeDisabled();
    const deselectedText = await applyBtn.textContent();
    // With 0 selected, button text is just "Apply" with no count, and is disabled
    expect(deselectedText).toBe('Apply');

    // Click Select All
    await page.locator('#diffReviewSelectAll').click();

    // Apply button should show a count again and be enabled
    await expect(applyBtn).toBeEnabled();
    const reselectedText = await applyBtn.textContent();
    expect(reselectedText).toMatch(/Apply\s*\(\d+\)/);

    // Clean up — cancel out of the modal
    await page.locator('#diffReviewCancelBtn').click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  // -----------------------------------------------------------------------
  // Test 6: CSV with matching items — DiffModal shows modified only (no added/deleted)
  // -----------------------------------------------------------------------

  test('CSV with matching items shows only modified (no added or deleted)', async ({ page }) => {
    await seedAndReload(page);

    // Use a CSV that matches the seed inventory in key fields.
    // CSV parsing strips fields (uuid, purchaseLocation, etc.) so DiffEngine
    // detects field-level diffs — items appear as "modified", not "unchanged".
    // The important assertion: zero added, zero deleted.
    const csvPath = writeTempFile('exact.csv', EXACT_MATCH_CSV);

    await openImportSection(page);

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#importCsvMerge').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(csvPath);

    // DiffModal opens because DiffEngine detects field-level diffs from CSV parsing
    const modal = page.locator('#diffReviewModal');
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Summary should show ONLY modified — no added, no deleted
    const summary = page.locator('#diffReviewSummary');
    await expect(summary.locator('text=/modified/')).toBeVisible();
    // Verify "added" chip is NOT present
    const addedChip = summary.locator('text=/added/');
    await expect(addedChip).not.toBeVisible();
    // Verify "deleted" chip is NOT present
    const deletedChip = summary.locator('text=/deleted/');
    await expect(deletedChip).not.toBeVisible();

    // Cancel — inventory should be unchanged
    await page.locator('#diffReviewCancelBtn').click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    const finalCount = await getInventoryCount(page);
    expect(finalCount).toBe(5);
  });

  // -----------------------------------------------------------------------
  // Test 7: Backward-compat — CSV without UUID column still matches by serial
  // -----------------------------------------------------------------------

  test('Legacy CSV without UUID column matches items by serial bridge', async ({ page }) => {
    await seedAndReload(page);

    const initialCount = await getInventoryCount(page);
    expect(initialCount).toBe(5);

    // Use legacy CSV that has NO UUID column — serial bridge should copy local UUIDs
    const csvPath = writeTempFile('legacy.csv', LEGACY_CSV_NO_UUID);

    await openImportSection(page);

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#importCsvMerge').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(csvPath);

    // DiffModal should appear (not "no changes" toast) because SN-001 has modified fields
    const modal = page.locator('#diffReviewModal');
    await expect(modal).toBeVisible({ timeout: 10000 });

    const summary = page.locator('#diffReviewSummary');
    await expect(summary).toBeVisible();

    // Key assertion: items with matching serials should NOT appear as "added"
    // SN-001/SN-002/SN-003 should match local items via serial→UUID bridge
    // SN-NEW-001/SN-NEW-002 are genuinely new (no serial match in seed)
    await expect(summary.locator('text=/\\+2 added/')).toBeVisible();

    // Cancel out
    await page.locator('#diffReviewCancelBtn').click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });
});

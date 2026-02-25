import { test, expect } from '@playwright/test';
import { dismissAllStartupModals } from './test-utils.js';

/**
 * Numista Data Integrity — Regression Tests
 *
 * Tests for bugs STAK-309, STAK-311 where Numista image URLs / metadata
 * re-populate after being cleared, or cross-contaminate between items.
 *
 * No Numista API key required — items are seeded directly into localStorage.
 * These tests are expected to FAIL on unpatched code and PASS after the fix.
 */

/** Minimal inventory item with all required fields. */
const makeItem = (overrides = {}) => ({
  serial: 1,
  name: 'Regression Test Coin',
  metal: 'Silver',
  type: 'Coin',
  qty: 1,
  weight: 1,
  weightUnit: 'oz',
  price: 30,
  currency: 'USD',
  purchaseLocation: '',
  storageLocation: '',
  date: '2024-01-01',
  ...overrides,
});

/**
 * Inject items into localStorage and reload.
 * @param {import('@playwright/test').Page} page
 * @param {object[]} items
 * @param {object} [extraKeys] - Additional localStorage keys to set { key: value }
 */
async function seedInventory(page, items, extraKeys = {}) {
  await page.evaluate(({ inv, extra }) => {
    localStorage.setItem('metalInventory', JSON.stringify(inv));
    for (const [k, v] of Object.entries(extra)) {
      localStorage.setItem(k, JSON.stringify(v));
    }
  }, { inv: items, extra: extraKeys });
  await page.reload();
  await dismissAllStartupModals(page);
}

/** Read parsed inventory array directly from localStorage. */
async function getInventory(page) {
  return await page.evaluate(() => {
    const raw = localStorage.getItem('metalInventory');
    return raw ? JSON.parse(raw) : [];
  });
}

// ── Test suite ──────────────────────────────────────────────────────────────

test.describe('Numista Data Integrity — Regression (STAK-309 / STAK-311)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissAllStartupModals(page);
    // Clear inventory so each test starts clean
    await page.evaluate(() => {
      localStorage.removeItem('metalInventory');
      localStorage.removeItem('staktrakr.catalog.cache');
    });
  });

  // ── STAK-309-a: Clearing N# and URL persists through save + reload ─────────

  test('STAK-309-a: clearing N# and URL stays cleared after save and reload', async ({ page }) => {
    // Seed catalog cache so CDN backfill (Bug C) can also be exercised on reload
    await seedInventory(
      page,
      [makeItem({ numistaId: '99999', obverseImageUrl: 'https://example.com/obv.jpg' })],
      { 'staktrakr.catalog.cache': { '99999': { imageUrl: 'https://cdn.numista.com/99999-test.jpg' } } }
    );

    // Open edit modal directly
    await page.evaluate(() => window.editItem(0));
    await expect(page.locator('#itemModal')).toBeVisible();

    // Clear N# and URL fields
    await page.fill('#itemCatalog', '');
    await page.fill('#itemObverseImageUrl', '');

    // Save
    await page.locator('#itemModalSubmit').click();
    await expect(page.locator('#itemModal')).not.toBeVisible({ timeout: 8000 });

    // Verify after save — Bug A causes this to fail (URL is restored from oldItem)
    const afterSave = await getInventory(page);
    expect(afterSave[0].numistaId, 'numistaId should be empty after save').toBe('');
    expect(afterSave[0].obverseImageUrl, 'obverseImageUrl should be empty after save').toBe('');

    // Reload and verify again — Bug C causes URL to re-appear from catalog cache
    await page.reload();
    await dismissAllStartupModals(page);

    const afterReload = await getInventory(page);
    expect(afterReload[0].numistaId, 'numistaId should remain empty after reload').toBe('');
    expect(afterReload[0].obverseImageUrl, 'obverseImageUrl should remain empty after reload').toBe('');
  });

  // ── STAK-309-b: numistaData is wiped when N# is cleared ───────────────────

  test('STAK-309-b: numistaData fields are wiped when N# is cleared', async ({ page }) => {
    await seedInventory(page, [
      makeItem({
        numistaId: '99998',
        numistaData: {
          country: 'USA',
          denomination: '1 Dollar',
          source: 'api',
          updatedAt: Date.now(),
        },
      }),
    ]);

    // Open edit modal — populateNumistaDataFields pre-fills #numistaCountry with 'USA'
    await page.evaluate(() => window.editItem(0));
    await expect(page.locator('#itemModal')).toBeVisible();

    // Clear only the N# field — leave numistaCountry as populated by the form
    await page.fill('#itemCatalog', '');

    // Save
    await page.locator('#itemModalSubmit').click();
    await expect(page.locator('#itemModal')).not.toBeVisible({ timeout: 8000 });

    // Verify numistaData is empty — Bug D causes country to be preserved
    const afterSave = await getInventory(page);
    expect(
      afterSave[0].numistaData?.country,
      'numistaData.country should be cleared when N# is removed'
    ).toBeUndefined();
  });

  // ── STAK-311: Changing N# clears old CDN image URL ────────────────────────

  test('STAK-311: changing N# to a new value clears the old CDN image URL', async ({ page }) => {
    await seedInventory(page, [
      makeItem({
        numistaId: '111',
        obverseImageUrl: 'https://cdn.numista.com/catalog/photos/111.jpg',
      }),
    ]);

    // Open edit modal — #itemObverseImageUrl is pre-filled with '111.jpg'
    await page.evaluate(() => window.editItem(0));
    await expect(page.locator('#itemModal')).toBeVisible();

    // Change N# from '111' to '222', clear the URL field
    await page.fill('#itemCatalog', '222');
    await page.fill('#itemObverseImageUrl', '');

    // Save
    await page.locator('#itemModalSubmit').click();
    await expect(page.locator('#itemModal')).not.toBeVisible({ timeout: 8000 });

    // Verify — Bug A causes '111.jpg' to be restored via oldItem fallback
    const afterSave = await getInventory(page);
    expect(afterSave[0].numistaId, 'numistaId should be updated to 222').toBe('222');
    expect(
      afterSave[0].obverseImageUrl,
      'old CDN URL should not be carried over when N# changes and URL field is blank'
    ).toBe('');
  });
});

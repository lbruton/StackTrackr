import { test, expect } from '@playwright/test';
import { dismissAckModal } from './test-utils.js';

test.describe('Valuation and Calculations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissAckModal(page);
  });

  test('Verify melt value calculation for Silver', async ({ page }) => {
    // 1. Set spot price for Silver to a fixed value via injection
    await page.evaluate(() => {
      spotPrices.silver = 30.00;
      // Also update the UI components that depend on it
      if (typeof renderTable === 'function') renderTable();
      if (typeof updateSummary === 'function') updateSummary();
    });

    // 2. Add a Silver item
    await page.locator('#newItemBtn').click();
    await page.selectOption('#itemMetal', 'Silver');
    await page.fill('#itemModal #itemName', 'Calculation Test Silver');
    await page.fill('#itemQty', '2');
    await page.fill('#itemWeight', '1'); // 1 oz
    await page.selectOption('#itemPuritySelect', '0.999'); // 99.9%
    await page.fill('#itemPrice', '25.00'); // Purchase price $25 each
    await page.locator('#itemModalSubmit').click();

    // 3. Verify Melt Value
    const itemCard = page.locator('article', { hasText: 'Calculation Test Silver' });
    // Expected Melt Value = 2 (qty) * 1 (oz) * 30.00 (spot) * 0.999 (purity) = 59.94
    await expect(itemCard).toContainText('$59.94'); 
  });

  test('Unit conversion: Grams to Ounces', async ({ page }) => {
    await page.evaluate(() => {
      spotPrices.gold = 2000.00;
      if (typeof renderTable === 'function') renderTable();
      if (typeof updateSummary === 'function') updateSummary();
    });

    await page.locator('#newItemBtn').click();
    await page.selectOption('#itemMetal', 'Gold');
    await page.fill('#itemModal #itemName', 'Gram Test Gold');
    await page.fill('#itemQty', '1');
    await page.fill('#itemWeight', '31.1035'); // 1 troy oz in grams
    await page.selectOption('#itemWeightUnit', 'g');
    await page.locator('#itemModalSubmit').click();

    // Melt value should be ~$2000.00
    await expect(page.locator('article', { hasText: 'Gram Test Gold' })).toContainText('$2,000.00');
  });
});

// @ts-check
import { test, expect } from '@playwright/test';
import { dismissAckModal } from './test-utils.js';

const TEST_URL = process.env.TEST_URL || 'http://localhost:8765';

test.describe('Market Icon Toggle Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL);
    await dismissAckModal(page);
  });

  test('Test 1: New user sees all 5 header buttons by default', async ({ page }) => {
    // Clear localStorage to simulate fresh install
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Wait for page to load
    await page.waitForSelector('#headerThemeBtn');

    // Verify all 5 buttons are visible
    await expect(page.locator('#headerThemeBtn')).toBeVisible();
    await expect(page.locator('#headerCurrencyBtn')).toBeVisible();
    await expect(page.locator('#headerMarketBtn')).toBeVisible();
    await expect(page.locator('#headerTrendBtn')).toBeVisible();
    await expect(page.locator('#headerSyncBtn')).toBeVisible();
  });

  test('Test 2: Market button opens Settings modal on Market tab', async ({ page }) => {
    // Click Market button
    await page.click('#headerMarketBtn');

    // Wait for modal to appear
    await page.waitForSelector('#settingsModal', { state: 'visible', timeout: 5000 });

    // Verify Settings modal is open
    const modal = page.locator('#settingsModal');
    await expect(modal).toBeVisible();

    // Verify Market tab is active
    const marketTab = page.locator('[data-section="market"]');
    await expect(marketTab).toHaveClass(/active/);
  });

  test('Test 3: Market toggle controls button visibility', async ({ page }) => {
    // Open Settings → Appearance
    await page.click('#settingsBtn');
    await page.waitForSelector('#settingsModal', { state: 'visible' });
    await page.click('[data-section="site"]');

    // Verify Market toggle shows "On" by default
    const marketToggle = page.locator('#settingsHeaderMarketBtn_hdr');
    const onButton = marketToggle.locator('[data-val="yes"]');
    await expect(onButton).toHaveClass(/active/);

    // Click "Off"
    await marketToggle.locator('[data-val="no"]').click();

    // Wait a moment for visibility to update
    await page.waitForTimeout(100);

    // Verify Market button is hidden
    await expect(page.locator('#headerMarketBtn')).toBeHidden();

    // Click "On"
    await onButton.click();

    // Wait a moment for visibility to update
    await page.waitForTimeout(100);

    // Verify Market button is visible again
    await expect(page.locator('#headerMarketBtn')).toBeVisible();

    // Refresh page and verify state persists
    await page.reload();
    await page.waitForSelector('#headerMarketBtn');
    await expect(page.locator('#headerMarketBtn')).toBeVisible();
  });

  test('Test 4: Responsive grid layout (3-col → 2-col → 1-col)', async ({ page }) => {
    await page.click('#settingsBtn');
    await page.waitForSelector('#settingsModal', { state: 'visible' });
    await page.click('[data-section="site"]');

    const grid = page.locator('.settings-card-grid--compact').first();

    // Desktop/tablet: 2 columns (≥600px breakpoint)
    await page.setViewportSize({ width: 1200, height: 800 });
    const desktopCols = await grid.evaluate((el) =>
      getComputedStyle(el).gridTemplateColumns
    );
    expect(desktopCols.split(' ').length).toBe(2);

    // Tablet: still 2 columns
    await page.setViewportSize({ width: 900, height: 800 });
    const tabletCols = await grid.evaluate((el) =>
      getComputedStyle(el).gridTemplateColumns
    );
    expect(tabletCols.split(' ').length).toBe(2);

    // Mobile: 1 column (<600px breakpoint)
    await page.setViewportSize({ width: 500, height: 800 });
    const mobileCols = await grid.evaluate((el) =>
      getComputedStyle(el).gridTemplateColumns
    );
    expect(mobileCols.split(' ').length).toBe(1);
  });

  test('Test 5: Existing user migration - preserves hidden buttons, Market defaults visible', async ({ page }) => {
    // Simulate existing user with Theme and Trend hidden
    await page.evaluate(() => {
      localStorage.setItem('headerThemeBtnVisible', 'false');
      localStorage.setItem('headerTrendBtnVisible', 'false');
      // Note: headerMarketBtnVisible not set (simulates existing user before this release)
    });
    await page.reload();
    await page.waitForSelector('#headerCurrencyBtn');

    // Verify Theme is HIDDEN (preserves existing state)
    await expect(page.locator('#headerThemeBtn')).toBeHidden();

    // Verify Trend is HIDDEN (preserves existing state)
    await expect(page.locator('#headerTrendBtn')).toBeHidden();

    // Verify Market is VISIBLE (new key, defaults ON)
    await expect(page.locator('#headerMarketBtn')).toBeVisible();

    // Verify Currency is VISIBLE
    await expect(page.locator('#headerCurrencyBtn')).toBeVisible();

    // Verify Sync is VISIBLE
    await expect(page.locator('#headerSyncBtn')).toBeVisible();
  });

  test('Test 6: No console errors during normal usage', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Perform normal user actions
    await page.click('#headerMarketBtn');
    await page.waitForSelector('#settingsModal', { state: 'visible' });
    await page.click('[data-section="site"]');

    // Toggle Market button off/on
    const marketToggle = page.locator('#settingsHeaderMarketBtn_hdr');
    await marketToggle.locator('[data-val="no"]').click();
    await page.waitForTimeout(100);
    await marketToggle.locator('[data-val="yes"]').click();

    // Close modal
    await page.locator('#settingsCloseBtn').click();

    // Verify no console errors
    expect(consoleErrors).toEqual([]);
  });
});

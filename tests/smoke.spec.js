import { test, expect } from '@playwright/test';
import { dismissAckModal } from './test-utils.js';

test.describe('StakTrakr Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissAckModal(page);
  });

  test('Page title and main components are visible', async ({ page }) => {
    await expect(page).toHaveTitle(/StakTrakr/);
    await expect(page.locator('#spotPricesSection')).toBeVisible();
    await expect(page.locator('#totalsSectionEl')).toBeVisible();
    await expect(page.locator('#tableSectionEl')).toBeVisible();
  });

  test('About modal can be opened and closed', async ({ page }) => {
    await page.locator('#aboutBtn').click();
    await expect(page.locator('#aboutModal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#aboutModal')).not.toBeVisible();
  });

  test('Settings modal can be opened and closed', async ({ page }) => {
    await page.locator('#settingsBtn').click();
    await expect(page.locator('#settingsModal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#settingsModal')).not.toBeVisible();
  });

  test('Add Item modal can be opened and closed', async ({ page }) => {
    await page.locator('#newItemBtn').click();
    await expect(page.locator('#itemModal')).toBeVisible();
    await page.locator('#itemCloseBtn').click();
    await expect(page.locator('#itemModal')).not.toBeVisible();
  });
});

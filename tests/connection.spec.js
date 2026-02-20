import { test, expect } from '@playwright/test';

test('browserless connection + page load @smoke', async ({ page }) => {
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:8765');
  await expect(page).toHaveTitle(/StakTrakr/);
});

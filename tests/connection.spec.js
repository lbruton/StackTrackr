import { test, expect } from '@playwright/test';

test('browserless connection + page load', { tag: ['@smoke'] }, async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/StakTrakr/);
});

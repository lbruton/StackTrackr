import { test, expect } from '@playwright/test';

// For file:// mode (BROWSER_BACKEND=browserless + TEST_URL=file:///workspace/StakTrakr/index.html),
// goto('/') resolves to file:/// (filesystem root), so navigate to the full URL directly.
const startUrl = (process.env.TEST_URL || '').startsWith('file://') ? process.env.TEST_URL : '/';

test('browserless connection + page load', { tag: ['@smoke'] }, async ({ page }) => {
  await page.goto(startUrl);
  await expect(page).toHaveTitle(/StakTrakr/);
});

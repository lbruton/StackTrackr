import { test, expect } from '@playwright/test';

test('hello-kitty easter egg: shift+click Sepia applies pink/purple theme', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/StakTrakr/);

  // Wait for app to fully init
  await page.waitForFunction(() => typeof setTheme === 'function', { timeout: 10_000 });

  // Open Settings modal
  await page.click('[title="Settings"], button[aria-label="Settings"], .settings-btn, [data-action="settings"]', { timeout: 5_000 }).catch(() =>
    page.evaluate(() => showSettingsModal && showSettingsModal())
  );

  // Wait for settings modal to appear
  await page.waitForSelector('.settings-nav-item[data-section="appearance"], .theme-option', { timeout: 5_000 });

  // Navigate to Appearance section if not already there
  const appearanceNav = page.locator('.settings-nav-item[data-section="appearance"]');
  if (await appearanceNav.count()) {
    await appearanceNav.click();
  }

  // Confirm the Sepia button is visible
  const sepiaBtn = page.locator('.theme-option[data-theme="sepia"]');
  await expect(sepiaBtn).toBeVisible();

  // Shift+click Sepia to trigger the easter egg
  await sepiaBtn.click({ modifiers: ['Shift'] });

  // Verify data-theme="hello-kitty" is set on <html>
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'hello-kitty');

  // Verify the background is pink (spot check one computed color)
  const bgColor = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim()
  );
  expect(bgColor).toBe('#f472b6');

  // Screenshot proof
  await page.screenshot({ path: 'test-results/hello-kitty-theme.png', fullPage: false });
});

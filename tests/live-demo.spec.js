import { test, expect } from '@playwright/test';
import { dismissAckModal } from './test-utils.js';

test('live demo — load, hover spot cards, open About', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2000);
  await expect(page).toHaveTitle(/StakTrakr/);

  await dismissAckModal(page);
  await page.waitForTimeout(800);

  // Hover over each spot price card
  const cards = page.locator('.spot-card');
  const count = await cards.count();
  for (let i = 0; i < Math.min(count, 4); i++) {
    await cards.nth(i).hover();
    await page.waitForTimeout(600);
  }

  // Open the About modal
  const aboutBtn = page.locator('#about-btn, [data-bs-target="#aboutModal"], button:has-text("About")').first();
  if (await aboutBtn.isVisible()) {
    await aboutBtn.click();
    await page.waitForTimeout(2000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
  }
});

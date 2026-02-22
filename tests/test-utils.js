import { expect } from '@playwright/test';

/**
 * Dismisses the first-run acknowledgment modal if it is visible.
 * @param {import('@playwright/test').Page} page
 */
export const dismissAckModal = async (page) => {
  const ackModal = page.locator('#ackModal');
  if (await ackModal.isVisible()) {
    await page.locator('#ackAcceptBtn, #ackModal button, #ackModal .btn').first().click();
    await expect(ackModal).not.toBeVisible();
  }
};

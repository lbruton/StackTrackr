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

/**
 * Dismisses all startup modals (ack modal + version "What's New" modal).
 * Call after page.goto() or page.reload() before interacting with the page.
 * @param {import('@playwright/test').Page} page
 */
export const dismissAllStartupModals = async (page) => {
  // Wait for app to finish loading before checking modals
  await page.waitForLoadState('domcontentloaded');
  // Dismiss ack modal
  const ackModal = page.locator('#ackModal');
  if (await ackModal.isVisible({ timeout: 5000 }).catch(() => false)) {
    await page.locator('#ackAcceptBtn, #ackModal button, #ackModal .btn').first().click();
    await expect(ackModal).not.toBeVisible();
  }
  // Dismiss version "What's New" modal — may appear with a short delay after load
  const versionModal = page.locator('#versionModal');
  if (await versionModal.isVisible({ timeout: 5000 }).catch(() => false)) {
    await page.locator('#versionCloseBtn').click();
    await expect(versionModal).not.toBeVisible({ timeout: 5000 });
  }
};

/**
 * Seeds N inventory items with synthetic WebP images directly into IndexedDB and localStorage.
 * Uses imageCache.importUserImageRecord() — skips canvas processing for speed (~5-10ms per record).
 * 50% of items have a reverse image (every even index).
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} count - Number of items to seed
 * @param {number} [imgSizeKb=80] - Size of each image blob in KB
 * @returns {Promise<{seededItems: number, seededImages: number}>}
 */
export const seedImageInventory = async (page, count, imgSizeKb = 80) => {
  return await page.evaluate(async ({ count, imgSizeKb }) => {
    const sizeBytes = imgSizeKb * 1024;
    const imgData = new Uint8Array(sizeBytes);
    const items = [];

    for (let i = 0; i < count; i++) {
      const uuid = `stress-${String(count).padStart(4, '0')}-${String(i).padStart(5, '0')}`;
      const obv = new Blob([imgData], { type: 'image/webp' });
      // 50% have reverse (every even index) — tests null-reverse export path
      const rev = i % 2 === 0 ? new Blob([imgData], { type: 'image/webp' }) : null;

      await imageCache.importUserImageRecord({
        uuid,
        obverse: obv,
        reverse: rev,
        cachedAt: Date.now(),
        size: obv.size + (rev?.size ?? 0),
        sharedImageId: null,
      });

      items.push({
        uuid,
        metal: 'Silver',
        composition: 'Silver',
        name: `Stress Coin ${i + 1}`,
        qty: 1,
        type: 'Coin',
        weight: 1,
        weightUnit: 'oz',
        purity: 1.0,
        price: 30,
        date: '2026-01-01',
        obverseImageUrl: '',
        reverseImageUrl: '',
        obverseSharedImageId: null,
        reverseSharedImageId: null,
        serialNumber: '',
        purchaseLocation: '',
        storageLocation: '',
        notes: '',
        spotPriceAtPurchase: 0,
        premiumPerOz: 0,
        totalPremium: 0,
        marketValue: 0,
        numistaId: '',
        year: '2026',
        grade: '',
        gradingAuthority: '',
        certNumber: '',
        pcgsNumber: '',
        pcgsVerified: false,
        serial: uuid,
      });
    }

    // 'metalInventory' is LS_KEY — the app's inventory localStorage key
    localStorage.setItem('metalInventory', JSON.stringify(items));
    return { seededItems: count, seededImages: items.length };
  }, { count, imgSizeKb });
};

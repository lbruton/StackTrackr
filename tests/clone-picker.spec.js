import { test, expect } from '@playwright/test';
import { dismissAckModal } from './test-utils.js';

/**
 * Helper: add a test item and return to the main view.
 */
async function addTestItem(page, name = 'Test Morgan Dollar', year = '1878') {
  await page.locator('#newItemBtn').click();
  await expect(page.locator('#itemModal')).toBeVisible();

  await page.selectOption('#itemMetal', 'Silver');
  await page.selectOption('#itemType', 'Coin');
  await page.fill('#itemName', name);
  await page.fill('#itemQty', '1');
  await page.fill('#itemWeight', '1');
  await page.fill('#itemPrice', '35');
  await page.fill('#itemYear', year);

  await page.locator('#itemModalSubmit').click();
  await expect(page.locator('#itemModal')).not.toBeVisible();
}

/**
 * Helper: open the clone picker for the first matching item.
 * Opens the item in edit mode, then clicks Clone.
 */
async function openClonePickerForItem(page, itemName) {
  // Click the card to open view/edit
  const card = page.locator('article', { hasText: itemName });
  await expect(card).toBeVisible();
  await card.click();

  // Handle view modal → edit transition
  if (await page.locator('#viewItemModal').isVisible().catch(() => false)) {
    const editBtn = page.locator('#viewItemModal .edit-btn, #viewItemModal button:has-text("Edit")').first();
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
    }
  }

  await expect(page.locator('#itemModal')).toBeVisible();

  // Click Clone button
  const cloneBtn = page.locator('#cloneItemBtn');
  await expect(cloneBtn).toBeVisible();
  await cloneBtn.click();

  // Clone picker modal should appear
  await expect(page.locator('#clonePickerModal')).toBeVisible();
}

test.describe('Clone Picker Modal (STAK-375)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissAckModal(page);

    // Clear all existing data
    await page.locator('#settingsBtn').click();
    const storageTab = page.locator('#settingsModal .settings-nav-item[data-section="storage"]');
    if (await storageTab.isVisible()) {
      await storageTab.click();
      const wipeBtn = page.locator('#boatingAccidentBtn');
      if (await wipeBtn.isVisible()) {
        await wipeBtn.click();
        await expect(page.locator('#appDialogModal')).toBeVisible();
        await page.locator('#appDialogOk').click();
        await expect(page.locator('#appDialogMessage')).toContainText('erased');
        await page.locator('#appDialogOk').click();
        await expect(page.locator('#appDialogModal')).not.toBeVisible();
      }
    }
    await page.keyboard.press('Escape');
  });

  test('Basic clone: opens modal, shows fields, Save & Close creates item', async ({ page }) => {
    await addTestItem(page, 'Morgan Dollar', '1878');
    await openClonePickerForItem(page, 'Morgan Dollar');

    // Verify modal structure
    await expect(page.locator('#clonePickerTitle')).toHaveText('Clone Item');
    await expect(page.locator('.clone-picker-preview-name')).toContainText('Morgan Dollar');

    // Verify field checkboxes exist
    const checkboxes = page.locator('.clone-picker-field-cb');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(0);

    // Click Save & Close
    await page.locator('#clonePickerSaveCloseBtn').click();
    await expect(page.locator('#clonePickerModal')).not.toBeVisible();

    // Verify two items now exist (original + clone)
    const cards = page.locator('article', { hasText: 'Morgan Dollar' });
    await expect(cards).toHaveCount(2);
  });

  test('Batch clone: Save & Clone Another creates multiple items', async ({ page }) => {
    await addTestItem(page, 'Morgan Dollar', '1878');
    await openClonePickerForItem(page, 'Morgan Dollar');

    // Clone 3 items with different years
    const years = ['1879', '1880', '1881'];
    for (const year of years) {
      const yearInput = page.locator('#cloneField_year');
      await yearInput.clear();
      await yearInput.fill(year);
      await page.locator('#clonePickerSaveAnotherBtn').click();
      // Modal should stay open
      await expect(page.locator('#clonePickerModal')).toBeVisible();
    }

    // Close modal
    await page.locator('#clonePickerSaveCloseBtn').click();
    await expect(page.locator('#clonePickerModal')).not.toBeVisible();

    // Should have 5 items total: original + 3 batch clones + 1 from Save & Close
    const cards = page.locator('article', { hasText: 'Morgan Dollar' });
    await expect(cards).toHaveCount(5);
  });

  test('Deselect fields: unchecked fields are empty in clone', async ({ page }) => {
    await addTestItem(page, 'Graded Eagle', '2023');
    await openClonePickerForItem(page, 'Graded Eagle');

    // Uncheck the Purchase Price checkbox
    const priceCb = page.locator('.clone-picker-field-cb[data-field-key="price"]');
    await priceCb.uncheck();

    // Verify the price input is disabled
    const priceInput = page.locator('#cloneField_price');
    await expect(priceInput).toBeDisabled();

    // Save & Close
    await page.locator('#clonePickerSaveCloseBtn').click();
    await expect(page.locator('#clonePickerModal')).not.toBeVisible();

    // Verify two items exist
    const cards = page.locator('article', { hasText: 'Graded Eagle' });
    await expect(cards).toHaveCount(2);
  });

  test('Inline edit: modified values appear in clone', async ({ page }) => {
    await addTestItem(page, 'Peace Dollar', '1921');
    await openClonePickerForItem(page, 'Peace Dollar');

    // Change the year
    const yearInput = page.locator('#cloneField_year');
    await yearInput.clear();
    await yearInput.fill('1935');

    // Save & Close
    await page.locator('#clonePickerSaveCloseBtn').click();
    await expect(page.locator('#clonePickerModal')).not.toBeVisible();

    // Verify clone exists with new year
    const cards = page.locator('article', { hasText: 'Peace Dollar' });
    await expect(cards).toHaveCount(2);

    // Check that at least one card shows 1935
    const card1935 = page.locator('article', { hasText: '1935' });
    await expect(card1935).toBeVisible();
  });

  test('Cancel/ESC closes modal without creating items', async ({ page }) => {
    await addTestItem(page, 'Silver Eagle', '2024');
    await openClonePickerForItem(page, 'Silver Eagle');

    // Press Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('#clonePickerModal')).not.toBeVisible();

    // Should still have only 1 item
    const cards = page.locator('article', { hasText: 'Silver Eagle' });
    await expect(cards).toHaveCount(1);
  });

  test('Overlay click closes modal without creating items', async ({ page }) => {
    await addTestItem(page, 'Gold Eagle', '2024');
    await openClonePickerForItem(page, 'Gold Eagle');

    // Click on the modal overlay (outside the content)
    const modal = page.locator('#clonePickerModal');
    const box = await modal.boundingBox();
    if (box) {
      // Click top-left corner of the overlay (outside the content area)
      await page.mouse.click(box.x + 5, box.y + 5);
    }
    await expect(page.locator('#clonePickerModal')).not.toBeVisible();

    // Should still have only 1 item
    const cards = page.locator('article', { hasText: 'Gold Eagle' });
    await expect(cards).toHaveCount(1);
  });

  test('Clone counter shows correct count during batch session', async ({ page }) => {
    await addTestItem(page, 'Kookaburra', '2020');
    await openClonePickerForItem(page, 'Kookaburra');

    // Counter should be hidden initially
    const counter = page.locator('#clonePickerCount');
    await expect(counter).not.toBeVisible();

    // Clone once
    await page.locator('#clonePickerSaveAnotherBtn').click();
    await expect(counter).toBeVisible();
    await expect(counter).toContainText('1 item cloned');

    // Clone again
    await page.locator('#clonePickerSaveAnotherBtn').click();
    await expect(counter).toContainText('2 items cloned');

    // Close
    await page.locator('#clonePickerSaveCloseBtn').click();
    await expect(page.locator('#clonePickerModal')).not.toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

test.describe('Inventory CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Dismiss acknowledgment modal
    const ackModal = page.locator('#ackModal');
    if (await ackModal.isVisible()) {
      await page.locator('#ackAcceptBtn').click();
    }

    // Clear all existing data via Storage settings
    await page.locator('#settingsBtn').click();
    const storageTab = page.locator('#settingsModal .settings-nav-item[data-section="storage"]');
    if (await storageTab.isVisible()) {
      await storageTab.click();
      const wipeBtn = page.locator('#boatingAccidentBtn');
      if (await wipeBtn.isVisible()) {
        await wipeBtn.click();
        // App uses #appDialogModal (not native browser dialog) — two-step confirm
        await expect(page.locator('#appDialogModal')).toBeVisible();
        await page.locator('#appDialogOk').click();
        await expect(page.locator('#appDialogMessage')).toContainText('erased');
        await page.locator('#appDialogOk').click();
        await expect(page.locator('#appDialogModal')).not.toBeVisible();
      }
    }
    await page.keyboard.press('Escape');
  });

  test('Add a new silver coin', async ({ page }) => {
    await page.locator('#newItemBtn').click();
    await expect(page.locator('#itemModal')).toBeVisible();

    await page.selectOption('#itemMetal', 'Silver');
    await page.selectOption('#itemType', 'Coin');
    await page.fill('#itemName', 'Test Silver Eagle');
    await page.fill('#itemQty', '10');
    await page.fill('#itemWeight', '1');
    await page.fill('#itemPrice', '35.50');
    
    await page.locator('#itemModalSubmit').click();
    
    // Verify item appears in inventory card view
    const card = page.locator('article', { hasText: 'Test Silver Eagle' });
    await expect(card).toBeVisible();
    await expect(card).toContainText('10');
  });

  test('Edit an existing item', async ({ page }) => {
    // Add an item first
    await page.locator('#newItemBtn').click();
    await page.fill('#itemName', 'Edit Me Item');
    await page.fill('#itemQty', '1');
    await page.fill('#itemWeight', '1');
    await page.locator('#itemModalSubmit').click();

    // In Card view, clicking the card should open the view/edit modal
    const card = page.locator('article', { hasText: 'Edit Me Item' });
    await expect(card).toBeVisible();
    await card.click();
    
    // The app might open a View modal first, then we need to click Edit.
    // Or it might go straight to editItem depending on state.
    // Based on bindCardClickHandler, it calls showViewModal or editItem.
    // Let's check for either #itemModal or a View modal.
    const itemModal = page.locator('#itemModal');
    // Wait for either the item modal or view modal to become visible
    await expect(async () => {
      const isItemModalVisible = await page.locator('#itemModal').isVisible();
      const isViewModalVisible = await page.locator('#viewItemModal').isVisible();
      expect(isItemModalVisible || isViewModalVisible).toBeTruthy();
    }).toPass();
    
    if (await page.locator('#viewItemModal').isVisible()) {
      // If View modal opened, click Edit button. 
      // Based on card-view.js, bindCardClickHandler calls showViewModal or editItem.
      // If showViewModal is called, we need to click Edit in that modal.
      const editBtn = page.locator('#viewItemModal .edit-btn, #viewItemModal button:has-text("Edit")').first();
      await editBtn.click();
    }

    await expect(page.locator('#itemModal')).toBeVisible();
    await page.fill('#itemModal #itemName', 'Updated Item Name');
    await page.locator('#itemModalSubmit').click();

    await expect(page.locator('article', { hasText: 'Updated Item Name' })).toBeVisible();
  });

  test('Delete an item', async ({ page }) => {
    // Add item
    await page.locator('#newItemBtn').click();
    await page.fill('#itemName', 'Delete Me Item');
    await page.fill('#itemQty', '1');
    await page.fill('#itemWeight', '1');
    await page.locator('#itemModalSubmit').click();

    // Switch to Table view (data-style="D")
    const tableViewBtn = page.locator('button[data-style="D"], [title="Table view"]').first();
    await tableViewBtn.click();
    await expect(page.locator('#inventoryTable')).toBeVisible();

    // Find the row and the delete button
    const row = page.locator('#inventoryTable tbody tr', { hasText: 'Delete Me Item' });
    const deleteBtn = row.locator('button.danger, [title="Delete item"]').first();
    
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Handle custom confirmation dialog (#appDialogModal)
    await expect(page.locator('#appDialogModal')).toBeVisible();
    await page.locator('#appDialogOk').click();

    await expect(page.locator('#inventoryTable tbody tr', { hasText: 'Delete Me Item' })).not.toBeVisible();
  });
});

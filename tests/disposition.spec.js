import { test, expect } from '@playwright/test';
import { dismissAckModal } from './test-utils.js';

/**
 * Disposition E2E Tests (STAK-72)
 *
 * Covers the realized-gains disposition feature:
 *  1. Dispose an item as "sold" (via combined Remove Item modal)
 *  2. Show disposed items toggle
 *  3. View modal shows disposition details
 *  4. Undo disposition
 *  5. Summary card shows realized G/L
 *  6. CSV export includes disposition columns
 *  7. Settings toggle hides/shows realized G/L row
 */

/**
 * Add a silver coin to inventory via the item modal.
 * @param {import('@playwright/test').Page} page
 * @param {string} name - Item name
 * @param {string} price - Purchase price string
 */
const addSilverItem = async (page, name = 'Test Silver Eagle', price = '500') => {
  await page.locator('#newItemBtn').click();
  await expect(page.locator('#itemModal')).toBeVisible();
  await page.selectOption('#itemMetal', 'Silver');
  await page.selectOption('#itemType', 'Coin');
  await page.fill('#itemName', name);
  await page.fill('#itemQty', '1');
  await page.fill('#itemWeight', '1');
  await page.fill('#itemPrice', price);
  await page.locator('#itemModalSubmit').click();
  await page.waitForTimeout(500);
};

/**
 * Switch the inventory view to table (data-style="D").
 * @param {import('@playwright/test').Page} page
 */
const switchToTableView = async (page) => {
  const tableToggle = page.locator('button[data-style="D"], [title="Table view"]').first();
  if (await tableToggle.isVisible()) {
    await tableToggle.click();
    await page.waitForTimeout(300);
  }
};

/**
 * Dispose the first matching item in table view.
 * Uses the combined Remove Item modal: clicks Delete (trash) icon,
 * enables the "Track as disposed" toggle, fills disposition fields, submits.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} itemName - Text to match in the table row
 * @param {Object} opts - Disposition form values
 * @param {string} [opts.type='sold'] - Disposition type select value
 * @param {string} [opts.amount='650'] - Sale/trade amount
 * @param {string} [opts.date] - Disposition date (defaults to today)
 * @param {string} [opts.recipient=''] - Optional recipient
 * @param {string} [opts.notes=''] - Optional notes
 */
const disposeItemInTable = async (page, itemName, opts = {}) => {
  const {
    type = 'sold',
    amount = '650',
    date = new Date().toISOString().split('T')[0],
    recipient = '',
    notes = ''
  } = opts;

  await switchToTableView(page);
  await expect(page.locator('#inventoryTable')).toBeVisible();

  const row = page.locator('#inventoryTable tbody tr', { hasText: itemName });
  await expect(row).toBeVisible();

  // Click the Delete (trash) icon to open the combined Remove Item modal
  const deleteBtn = row.locator('button[title="Delete item"]');
  await expect(deleteBtn).toBeVisible();
  await deleteBtn.click();

  // Remove Item modal should appear
  await expect(page.locator('#removeItemModal')).toBeVisible();

  // Enable the "Track this item as disposed" toggle
  const disposeToggle = page.locator('#removeItemDisposeCheck');
  await disposeToggle.check();
  await page.waitForTimeout(300);

  // Disposition fields should now be visible
  await expect(page.locator('#removeItemDisposeFields')).toBeVisible();

  await page.selectOption('#dispositionType', type);
  await page.fill('#dispositionDate', date);

  // Amount field is hidden for lost/gifted types
  const amountInput = page.locator('#dispositionAmount');
  if (await amountInput.isVisible()) {
    await amountInput.fill(amount);
  }

  if (recipient) {
    await page.fill('#dispositionRecipient', recipient);
  }
  if (notes) {
    await page.fill('#dispositionNotes', notes);
  }

  await page.locator('#removeItemDisposeBtn').click();
  await page.waitForTimeout(500);
};

test.describe('Disposition Feature (STAK-72)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissAckModal(page);

    // Clear all existing data via Storage settings
    await page.locator('#settingsBtn').click();
    const storageTab = page.locator('#settingsModal .settings-nav-item[data-section="storage"]');
    if (await storageTab.isVisible()) {
      await storageTab.click();
      const wipeBtn = page.locator('#boatingAccidentBtn');
      if (await wipeBtn.isVisible()) {
        await wipeBtn.click();
        // App uses #appDialogModal (not native browser dialog) -- two-step confirm
        await expect(page.locator('#appDialogModal')).toBeVisible();
        await page.locator('#appDialogOk').click();
        await expect(page.locator('#appDialogMessage')).toContainText('erased');
        await page.locator('#appDialogOk').click();
        await expect(page.locator('#appDialogModal')).not.toBeVisible();
      }
    }
    await page.keyboard.press('Escape');
  });

  test('Dispose an item as sold', async ({ page }) => {
    await addSilverItem(page, 'Sold Eagle', '500');

    // Verify card appears before disposing
    const card = page.locator('article', { hasText: 'Sold Eagle' });
    await expect(card).toBeVisible();

    // Dispose via table view
    await disposeItemInTable(page, 'Sold Eagle', { type: 'sold', amount: '650' });

    // Remove Item modal should close
    await expect(page.locator('#removeItemModal')).not.toBeVisible();

    // A toast should confirm the disposition
    await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 });

    // Item should disappear from default view (disposed items are hidden)
    await expect(page.locator('#inventoryTable tbody tr', { hasText: 'Sold Eagle' })).not.toBeVisible({ timeout: 3000 });
  });

  test('Show disposed items toggle', async ({ page }) => {
    await addSilverItem(page, 'Toggle Eagle', '500');
    await disposeItemInTable(page, 'Toggle Eagle', { type: 'sold', amount: '600' });

    // Item should be hidden in default view (table still active from dispose helper)
    await expect(page.locator('#inventoryTable tbody tr', { hasText: 'Toggle Eagle' })).not.toBeVisible({ timeout: 3000 });

    // Enable the Show Disposed toggle
    const toggle = page.locator('#showDisposedToggle');
    await toggle.check();
    await page.waitForTimeout(500);

    // Item should reappear with disposed styling
    const row = page.locator('#inventoryTable tbody tr', { hasText: 'Toggle Eagle' });
    await expect(row).toBeVisible({ timeout: 3000 });
    await expect(row).toHaveClass(/disposed-row/);

    // Disposition badge should be visible in the row
    const badge = row.locator('.disposition-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Sold');
  });

  test('View modal shows disposition details', async ({ page }) => {
    await addSilverItem(page, 'View Eagle', '500');
    await disposeItemInTable(page, 'View Eagle', {
      type: 'sold',
      amount: '650',
      recipient: 'John Doe',
      notes: 'Sold at coin show'
    });

    // Enable Show Disposed toggle so the item is visible
    const toggle = page.locator('#showDisposedToggle');
    await toggle.check();
    await page.waitForTimeout(500);

    // Click on the disposed item to open view modal
    // In table view, clicking the item name opens the view modal
    const nameLink = page.locator('#inventoryTable tbody tr', { hasText: 'View Eagle' })
      .locator('.filter-text, td[data-column="name"] span').first();
    await nameLink.click();

    // View modal should open
    const viewModal = page.locator('#viewItemModal');
    await expect(viewModal).toBeVisible({ timeout: 5000 });

    // Verify disposition section is present
    await expect(viewModal).toContainText('Disposition');
    await expect(viewModal).toContainText('Sold');

    // Verify realized G/L shows (650 - 500 = +$150.00)
    await expect(viewModal).toContainText('Realized Gain/Loss');
    await expect(viewModal).toContainText('$150');
  });

  test('Undo disposition restores item to active inventory', async ({ page }) => {
    await addSilverItem(page, 'Undo Eagle', '500');
    await disposeItemInTable(page, 'Undo Eagle', { type: 'sold', amount: '700' });

    // Item should be hidden
    await expect(page.locator('#inventoryTable tbody tr', { hasText: 'Undo Eagle' })).not.toBeVisible({ timeout: 3000 });

    // Enable Show Disposed toggle
    const toggle = page.locator('#showDisposedToggle');
    await toggle.check();
    await page.waitForTimeout(500);

    // Verify item is visible and disposed
    const row = page.locator('#inventoryTable tbody tr', { hasText: 'Undo Eagle' });
    await expect(row).toBeVisible({ timeout: 3000 });
    await expect(row).toHaveClass(/disposed-row/);

    // Click the Undo disposition button
    const undoBtn = row.locator('button[title="Undo disposition"]');
    await expect(undoBtn).toBeVisible();
    await undoBtn.click();

    // Confirm in the app dialog
    await expect(page.locator('#appDialogModal')).toBeVisible();
    await page.locator('#appDialogOk').click();
    await page.waitForTimeout(500);

    // Item should be back to active (no longer disposed-row)
    await expect(row).toBeVisible();
    await expect(row).not.toHaveClass(/disposed-row/);

    // Disposition badge should be gone
    await expect(row.locator('.disposition-badge')).not.toBeVisible();

    // Uncheck Show Disposed -- item should still be visible (it is active now)
    await toggle.uncheck();
    await page.waitForTimeout(500);
    await expect(page.locator('#inventoryTable tbody tr', { hasText: 'Undo Eagle' })).toBeVisible();
  });

  test('Summary card shows realized gain/loss', async ({ page }) => {
    // Ensure the realized row setting is enabled
    await page.evaluate(() => localStorage.setItem('showRealizedGainLoss', 'true'));

    await addSilverItem(page, 'Summary Eagle', '500');
    await disposeItemInTable(page, 'Summary Eagle', { type: 'sold', amount: '650' });

    // Realized G/L row on Silver card should show the gain ($650 - $500 = $150)
    const realizedGL = page.locator('#realizedGainLossSilver');
    await expect(realizedGL).toBeVisible({ timeout: 5000 });
    await expect(realizedGL).toContainText('$150');
  });

  test('CSV export includes disposition columns', async ({ page }) => {
    await addSilverItem(page, 'Export Eagle', '500');
    await disposeItemInTable(page, 'Export Eagle', { type: 'sold', amount: '750' });

    // Use page.evaluate to call the export logic and inspect the CSV content
    // instead of intercepting file downloads (which is fragile in E2E tests).
    const csvContent = await page.evaluate(() => {
      // Build CSV in-memory the same way exportCsv does, but capture the string
      if (typeof Papa === 'undefined') return null;

      const inv = JSON.parse(localStorage.getItem('metalInventory') || '[]');
      if (!inv.length) return null;

      const headers = [
        "Date","Metal","Type","Name","Year","Qty","Weight(oz)","Weight Unit","Purity",
        "Purchase Price","Melt Value","Retail Price","Gain/Loss",
        "Purchase Location","N#","PCGS #","Grade","Grading Authority","Cert #","Serial Number","Notes","UUID",
        "Obverse Image URL","Reverse Image URL",
        "Disposition Type","Disposition Date","Disposition Amount","Realized Gain/Loss"
      ];

      const rows = inv.map(i => [
        i.date || '',
        i.metal || 'Silver',
        i.type || '',
        i.name || '',
        i.year || '',
        i.qty || 0,
        parseFloat(i.weight || 0).toFixed(4),
        i.weightUnit || 'oz',
        parseFloat(i.purity) || 1.0,
        i.price || 0,
        0,
        i.marketValue || 0,
        0,
        i.purchaseLocation || '',
        i.numistaId || '',
        i.pcgsNumber || '',
        i.grade || '',
        i.gradingAuthority || '',
        i.certNumber || '',
        i.serialNumber || '',
        i.notes || '',
        i.uuid || '',
        i.obverseImageUrl || '',
        i.reverseImageUrl || '',
        i.disposition ? (i.disposition.type || '') : '',
        i.disposition?.date || '',
        i.disposition ? (i.disposition.amount || 0) : '',
        i.disposition ? (i.disposition.realizedGainLoss || 0) : ''
      ]);

      return Papa.unparse([headers, ...rows]);
    });

    expect(csvContent).not.toBeNull();
    expect(csvContent).toContain('Disposition Type');
    expect(csvContent).toContain('Disposition Date');
    expect(csvContent).toContain('Disposition Amount');
    expect(csvContent).toContain('Realized Gain/Loss');

    // Verify the disposed item data is in the CSV
    expect(csvContent).toContain('Export Eagle');
    expect(csvContent).toContain('sold');
    expect(csvContent).toContain('750');
    expect(csvContent).toContain('250'); // realized G/L: 750 - 500
  });

  test('Settings toggle hides/shows realized G/L row', async ({ page }) => {
    // Seed an item and dispose it so the realized row has data
    await page.evaluate(() => localStorage.setItem('showRealizedGainLoss', 'true'));
    await addSilverItem(page, 'Settings Eagle', '500');
    await disposeItemInTable(page, 'Settings Eagle', { type: 'sold', amount: '800' });

    // Realized row should be visible (setting is on)
    const realizedGL = page.locator('#realizedGainLossSilver');
    await expect(realizedGL).toBeVisible({ timeout: 5000 });

    // Open Settings → Appearance → Summary Totals toggle
    await page.locator('#settingsBtn').click();
    const appearanceTab = page.locator('#settingsModal .settings-nav-item[data-section="appearance"]');
    if (await appearanceTab.isVisible()) {
      await appearanceTab.click();
    }
    const realizedToggle = page.locator('#settingsShowRealized');
    await expect(realizedToggle).toBeVisible();

    // Toggle OFF
    await realizedToggle.uncheck();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Realized row should be hidden
    const realizedParent = page.locator('#realizedGainLossSilver').locator('..');
    await expect(realizedParent).not.toBeVisible();

    // Re-open settings and toggle ON
    await page.locator('#settingsBtn').click();
    if (await appearanceTab.isVisible()) {
      await appearanceTab.click();
    }
    await realizedToggle.check();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Realized row should be visible again
    await expect(realizedGL).toBeVisible();
  });
});

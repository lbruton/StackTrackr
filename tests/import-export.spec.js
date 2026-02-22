import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// The item modal has collapsible <details> sections that must be expanded
// before filling or reading fields inside them:
//   "Pricing & Details"       — contains #itemSerialNumber
//   "Grading & Certification" — contains #itemGrade, #itemCertNumber, #itemYear
const expandPricingSection = (page) =>
  page.locator('#itemModal summary.form-section-header', { hasText: 'Pricing' }).click();
const expandGradingSection = (page) =>
  page.locator('#itemModal summary.form-section-header', { hasText: 'Grading' }).click();
const expandNotesSection = (page) =>
  page.locator('#itemModal summary.form-section-header', { hasText: 'Notes' }).click();

test.describe('Import/Export Round-Trip', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
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
        await expect(page.locator('#appDialogModal')).toBeVisible();
        await page.locator('#appDialogOk').click();
        await expect(page.locator('#appDialogMessage')).toContainText('erased');
        await page.locator('#appDialogOk').click();
        await expect(page.locator('#appDialogModal')).not.toBeVisible();
      }
    }
    await page.keyboard.press('Escape');
  });

  test('JSON round-trip preserves serialNumber', async ({ page }) => {
    // --- Step 1: Add item with serial number ---
    await page.locator('#newItemBtn').click();
    await expect(page.locator('#itemModal')).toBeVisible();

    await page.selectOption('#itemMetal', 'Silver');
    await page.selectOption('#itemType', 'Bar');
    await page.fill('#itemName', 'Serial Round-Trip Bar');
    await page.fill('#itemQty', '1');
    await page.fill('#itemWeight', '10');
    await page.fill('#itemPrice', '350');

    // Expand "Pricing & Details" to access serial number field
    await expandPricingSection(page);
    await page.fill('#itemSerialNumber', 'SN-TEST-12345');
    await page.locator('#itemModalSubmit').click();

    const card = page.locator('article', { hasText: 'Serial Round-Trip Bar' });
    await expect(card).toBeVisible();

    // --- Step 2: Export to JSON ---
    await page.locator('#settingsBtn').click();
    const inventorySection = page.locator('#settingsModal .settings-nav-item[data-section="system"]');
    await inventorySection.click();

    const [ download ] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.locator('#exportJsonBtn').click()
    ]);

    const downloadPath = path.join(process.cwd(), 'test-results', 'roundtrip.json');
    await download.saveAs(downloadPath);

    // Verify serialNumber exists in the exported JSON file
    const jsonContent = fs.readFileSync(downloadPath, 'utf8');
    const backupData = JSON.parse(jsonContent);
    expect(Array.isArray(backupData)).toBeTruthy();
    const exportedItem = backupData.find(i => i.name === 'Serial Round-Trip Bar');
    expect(exportedItem).toBeTruthy();
    expect(exportedItem.serialNumber).toBe('SN-TEST-12345');

    // --- Step 3: Wipe inventory ---
    const storageSection = page.locator('#settingsModal .settings-nav-item[data-section="storage"]');
    await storageSection.click();

    await page.locator('#boatingAccidentBtn').click();
    await expect(page.locator('#appDialogModal')).toBeVisible();
    await page.locator('#appDialogOk').click();
    await expect(page.locator('#appDialogMessage')).toContainText('erased');
    await page.locator('#appDialogOk').click();
    await expect(page.locator('#appDialogModal')).not.toBeVisible();

    await expect(page.locator('article', { hasText: 'Serial Round-Trip Bar' })).not.toBeVisible();

    // --- Step 4: Re-import the JSON ---
    if (!(await page.locator('#settingsModal').isVisible())) {
      await page.locator('#settingsBtn').click();
    }
    await inventorySection.click();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#importJsonOverride').click();

    await expect(page.locator('#appDialogModal')).toBeVisible();
    await page.locator('#appDialogOk').click();

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(downloadPath);

    // Close settings to see inventory
    await page.keyboard.press('Escape');

    // --- Step 5: Verify serial number survived ---
    const reimportedCard = page.locator('article', { hasText: 'Serial Round-Trip Bar' });
    await expect(reimportedCard).toBeVisible();

    // Open the item to verify serial number in edit form
    await reimportedCard.click();

    // Handle view modal -> edit modal transition
    if (await page.locator('#viewItemModal').isVisible()) {
      const editBtn = page.locator('#viewItemModal .edit-btn, #viewItemModal button:has-text("Edit")').first();
      await editBtn.click();
    }

    await expect(page.locator('#itemModal')).toBeVisible();
    await expandPricingSection(page);
    await expect(page.locator('#itemSerialNumber')).toHaveValue('SN-TEST-12345');

    if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
  });

  test('JSON round-trip preserves all key fields', async ({ page }) => {
    // Add an item with many fields populated
    await page.locator('#newItemBtn').click();
    await expect(page.locator('#itemModal')).toBeVisible();

    await page.selectOption('#itemMetal', 'Gold');
    await page.selectOption('#itemType', 'Coin');
    await page.fill('#itemName', 'Full Fields Eagle');
    await page.fill('#itemQty', '2');
    await page.fill('#itemWeight', '1');
    await page.fill('#itemPrice', '2100');

    // Expand collapsible sections to fill optional fields
    await expandPricingSection(page);
    await page.fill('#itemSerialNumber', 'ABC-123/456');

    await expandGradingSection(page);
    await page.fill('#itemYear', '2024');
    await page.selectOption('#itemGrade', 'MS-70');
    await page.fill('#itemCertNumber', 'CERT-99887');

    await expandNotesSection(page);
    await page.fill('#itemNotes', 'Test notes for round-trip');
    await page.locator('#itemModalSubmit').click();

    await expect(page.locator('article', { hasText: 'Full Fields Eagle' })).toBeVisible();

    // Export
    await page.locator('#settingsBtn').click();
    const inventorySection = page.locator('#settingsModal .settings-nav-item[data-section="system"]');
    await inventorySection.click();

    const [ download ] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.locator('#exportJsonBtn').click()
    ]);

    const downloadPath = path.join(process.cwd(), 'test-results', 'roundtrip-fields.json');
    await download.saveAs(downloadPath);

    // Verify all fields in exported JSON
    const backupData = JSON.parse(fs.readFileSync(downloadPath, 'utf8'));
    const exported = backupData.find(i => i.name === 'Full Fields Eagle');
    expect(exported).toBeTruthy();
    expect(exported.metal).toBe('Gold');
    expect(exported.type).toBe('Coin');
    expect(exported.qty).toBe(2);
    expect(exported.serialNumber).toBe('ABC-123/456');
    expect(exported.year).toBe('2024');
    expect(exported.grade).toBe('MS-70');
    expect(exported.certNumber).toBe('CERT-99887');
    expect(exported.notes).toBe('Test notes for round-trip');

    // Wipe
    const storageSection = page.locator('#settingsModal .settings-nav-item[data-section="storage"]');
    await storageSection.click();

    await page.locator('#boatingAccidentBtn').click();
    await expect(page.locator('#appDialogModal')).toBeVisible();
    await page.locator('#appDialogOk').click();
    await expect(page.locator('#appDialogMessage')).toContainText('erased');
    await page.locator('#appDialogOk').click();
    await expect(page.locator('#appDialogModal')).not.toBeVisible();

    await expect(page.locator('article', { hasText: 'Full Fields Eagle' })).not.toBeVisible();

    // Re-import
    if (!(await page.locator('#settingsModal').isVisible())) {
      await page.locator('#settingsBtn').click();
    }
    await inventorySection.click();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#importJsonOverride').click();
    await expect(page.locator('#appDialogModal')).toBeVisible();
    await page.locator('#appDialogOk').click();

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(downloadPath);

    await page.keyboard.press('Escape');

    // Verify item survived
    const reimportedCard = page.locator('article', { hasText: 'Full Fields Eagle' });
    await expect(reimportedCard).toBeVisible();

    // Open edit modal and verify fields
    await reimportedCard.click();
    if (await page.locator('#viewItemModal').isVisible()) {
      const editBtn = page.locator('#viewItemModal .edit-btn, #viewItemModal button:has-text("Edit")').first();
      await editBtn.click();
    }

    await expect(page.locator('#itemModal')).toBeVisible();

    // Expand collapsible sections to read field values
    await expandPricingSection(page);
    await expect(page.locator('#itemSerialNumber')).toHaveValue('ABC-123/456');

    await expandGradingSection(page);
    await expect(page.locator('#itemYear')).toHaveValue('2024');
    await expect(page.locator('#itemGrade')).toHaveValue('MS-70');
    await expect(page.locator('#itemCertNumber')).toHaveValue('CERT-99887');

    if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
  });

  test('JSON round-trip handles numeric serial number', async ({ page }) => {
    await page.locator('#newItemBtn').click();
    await page.fill('#itemName', 'Numeric Serial Bar');
    await page.fill('#itemQty', '1');
    await page.fill('#itemWeight', '1');

    await expandPricingSection(page);
    await page.fill('#itemSerialNumber', '12345');
    await page.locator('#itemModalSubmit').click();

    await expect(page.locator('article', { hasText: 'Numeric Serial Bar' })).toBeVisible();

    // Export
    await page.locator('#settingsBtn').click();
    await page.locator('#settingsModal .settings-nav-item[data-section="system"]').click();

    const [ download ] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.locator('#exportJsonBtn').click()
    ]);

    const downloadPath = path.join(process.cwd(), 'test-results', 'roundtrip-numeric.json');
    await download.saveAs(downloadPath);

    // Wipe
    await page.locator('#settingsModal .settings-nav-item[data-section="storage"]').click();
    await page.locator('#boatingAccidentBtn').click();
    await expect(page.locator('#appDialogModal')).toBeVisible();
    await page.locator('#appDialogOk').click();
    await expect(page.locator('#appDialogMessage')).toContainText('erased');
    await page.locator('#appDialogOk').click();
    await expect(page.locator('#appDialogModal')).not.toBeVisible();

    // Re-import
    if (!(await page.locator('#settingsModal').isVisible())) {
      await page.locator('#settingsBtn').click();
    }
    await page.locator('#settingsModal .settings-nav-item[data-section="system"]').click();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#importJsonOverride').click();
    await expect(page.locator('#appDialogModal')).toBeVisible();
    await page.locator('#appDialogOk').click();

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(downloadPath);

    await page.keyboard.press('Escape');

    // Verify numeric serial survived as string
    const card = page.locator('article', { hasText: 'Numeric Serial Bar' });
    await expect(card).toBeVisible();
    await card.click();

    if (await page.locator('#viewItemModal').isVisible()) {
      await page.locator('#viewItemModal .edit-btn, #viewItemModal button:has-text("Edit")').first().click();
    }

    await expect(page.locator('#itemModal')).toBeVisible();
    await expandPricingSection(page);
    await expect(page.locator('#itemSerialNumber')).toHaveValue('12345');

    if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
  });

  test('CSV round-trip preserves serialNumber', async ({ page }) => {
    // Add item with serial number
    await page.locator('#newItemBtn').click();
    await page.fill('#itemName', 'CSV Serial Test');
    await page.fill('#itemQty', '1');
    await page.fill('#itemWeight', '5');
    await page.fill('#itemPrice', '175');

    await expandPricingSection(page);
    await page.fill('#itemSerialNumber', 'CSV-SN-999');
    await page.locator('#itemModalSubmit').click();

    await expect(page.locator('article', { hasText: 'CSV Serial Test' })).toBeVisible();

    // Export CSV
    await page.locator('#settingsBtn').click();
    await page.locator('#settingsModal .settings-nav-item[data-section="system"]').click();

    const [ download ] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.locator('#exportCsvBtn').click()
    ]);

    const downloadPath = path.join(process.cwd(), 'test-results', 'roundtrip.csv');
    await download.saveAs(downloadPath);

    const csvContent = fs.readFileSync(downloadPath, 'utf8');
    expect(csvContent).toContain('CSV-SN-999');

    // Wipe
    await page.locator('#settingsModal .settings-nav-item[data-section="storage"]').click();
    await page.locator('#boatingAccidentBtn').click();
    await expect(page.locator('#appDialogModal')).toBeVisible();
    await page.locator('#appDialogOk').click();
    await expect(page.locator('#appDialogMessage')).toContainText('erased');
    await page.locator('#appDialogOk').click();
    await expect(page.locator('#appDialogModal')).not.toBeVisible();

    // Re-import CSV
    if (!(await page.locator('#settingsModal').isVisible())) {
      await page.locator('#settingsBtn').click();
    }
    await page.locator('#settingsModal .settings-nav-item[data-section="system"]').click();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#importCsvOverride').click();
    await expect(page.locator('#appDialogModal')).toBeVisible();
    await page.locator('#appDialogOk').click();

    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(downloadPath);

    await page.keyboard.press('Escape');

    // Verify
    const card = page.locator('article', { hasText: 'CSV Serial Test' });
    await expect(card).toBeVisible();
    await card.click();

    if (await page.locator('#viewItemModal').isVisible()) {
      await page.locator('#viewItemModal .edit-btn, #viewItemModal button:has-text("Edit")').first().click();
    }

    await expect(page.locator('#itemModal')).toBeVisible();
    await expandPricingSection(page);
    await expect(page.locator('#itemSerialNumber')).toHaveValue('CSV-SN-999');

    if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
  });
});

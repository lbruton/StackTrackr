import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Backup and Restore', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const ackModal = page.locator('#ackModal');
    if (await ackModal.isVisible()) {
      await page.locator('#ackAcceptBtn').click();
    }
  });

  test('Export Inventory as CSV', async ({ page }) => {
    await page.locator('#newItemBtn').click();
    await page.fill('#itemModal #itemName', 'Export CSV Test');
    await page.fill('#itemQty', '1');
    await page.fill('#itemWeight', '1');
    await page.locator('#itemModalSubmit').click();

    await page.locator('#settingsBtn').click();
    const inventorySection = page.locator('#settingsModal .settings-nav-item[data-section="system"]');
    await inventorySection.click();

    const [ download ] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.locator('#exportCsvBtn').click()
    ]);
    
    const downloadPath = path.join(process.cwd(), 'test-results', 'backup.csv');
    await download.saveAs(downloadPath);
    
    const csvContent = fs.readFileSync(downloadPath, 'utf8');
    expect(csvContent).toContain('Export CSV Test');
    if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
  });

  test('Export and Restore JSON', async ({ page }) => {
    await page.locator('#newItemBtn').click();
    await page.fill('#itemModal #itemName', 'JSON Backup Test');
    await page.fill('#itemQty', '1');
    await page.fill('#itemWeight', '1');
    await page.locator('#itemModalSubmit').click();

    await page.locator('#settingsBtn').click();
    const inventorySection = page.locator('#settingsModal .settings-nav-item[data-section="system"]');
    await inventorySection.click();

    const [ download ] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.locator('#exportJsonBtn').click()
    ]);
    
    const downloadPath = path.join(process.cwd(), 'test-results', 'backup.json');
    await download.saveAs(downloadPath);
    
    const jsonContent = fs.readFileSync(downloadPath, 'utf8');
    const backupData = JSON.parse(jsonContent);
    expect(Array.isArray(backupData)).toBeTruthy();
    
    const storageSection = page.locator('#settingsModal .settings-nav-item[data-section="storage"]');
    await storageSection.click();
    
    await page.locator('#boatingAccidentBtn').click();
    await expect(page.locator('#appDialogModal')).toBeVisible();
    await page.locator('#appDialogOk').click();

    await expect(page.locator('#appDialogMessage')).toContainText('erased');
    await page.locator('#appDialogOk').click();
    await expect(page.locator('#appDialogModal')).not.toBeVisible();
    
    await expect(page.locator('article', { hasText: 'JSON Backup Test' })).not.toBeVisible();

    // Settings modal should still be open
    if (!(await page.locator('#settingsModal').isVisible())) {
      await page.locator('#settingsBtn').click();
    }
    await inventorySection.click();
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#importJsonOverride').click();
    
    // Confirmation dialog before file picker
    await expect(page.locator('#appDialogModal')).toBeVisible();
    await page.locator('#appDialogOk').click();
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(downloadPath);

    await expect(page.locator('article', { hasText: 'JSON Backup Test' })).toBeVisible();
    if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
  });

  test('Vault encrypted backup flow', async ({ page }) => {
    // PBKDF2 600K iterations takes 30–60s in browserless headless Docker vs ~2s in a
    // real browser. Wipe seed inventory to keep the AES-GCM payload small.
    test.setTimeout(120_000);

    await page.locator('#settingsBtn').click();
    await page.locator('#settingsModal .settings-nav-item[data-section="storage"]').click();
    const wipeBtn = page.locator('#boatingAccidentBtn');
    if (await wipeBtn.isVisible()) {
      await wipeBtn.click();
      await expect(page.locator('#appDialogModal')).toBeVisible();
      await page.locator('#appDialogOk').click();
      await expect(page.locator('#appDialogMessage')).toContainText('erased');
      await page.locator('#appDialogOk').click();
      await expect(page.locator('#appDialogModal')).not.toBeVisible();
    }
    // Close settings modal so #newItemBtn is clickable
    await page.locator('#settingsCloseBtn').click();

    await page.locator('#newItemBtn').click();
    await page.fill('#itemModal #itemName', 'Vault Test');
    await page.fill('#itemQty', '1');
    await page.fill('#itemWeight', '1');
    await page.locator('#itemModalSubmit').click();

    if (!(await page.locator('#settingsModal').isVisible())) {
      await page.locator('#settingsBtn').click();
    }
    const inventorySection = page.locator('#settingsModal .settings-nav-item[data-section="system"]');
    await inventorySection.click();

    await page.locator('#vaultExportBtn').click();
    await expect(page.locator('#vaultModal')).toBeVisible();
    await page.fill('#vaultPassword', 'test-password');
    await page.fill('#vaultConfirmPassword', 'test-password');

    // 90s timeout: PBKDF2 600K iterations can take 30–60s in resource-constrained
    // headless Docker. Vault encryption works fine in real browsers (confirmed in prod).
    const [ download ] = await Promise.all([
      page.waitForEvent('download', { timeout: 90_000 }),
      page.locator('#vaultActionBtn').click()
    ]);
    
    const downloadPath = path.join(process.cwd(), 'test-results', 'backup.stvault');
    await download.saveAs(downloadPath);
    
    await page.evaluate(() => { localStorage.clear(); });
    await page.reload();

    const ackModal = page.locator('#ackModal');
    if (await ackModal.isVisible()) {
      await page.locator('#ackAcceptBtn').click();
    }
    
    await expect(page.locator('article', { hasText: 'Vault Test' })).not.toBeVisible();

    await page.locator('#settingsBtn').click();
    await page.locator('#settingsModal .settings-nav-item[data-section="system"]').click();
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#vaultImportBtn').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(downloadPath);

    await expect(page.locator('#vaultModal')).toBeVisible();
    await page.fill('#vaultPassword', 'test-password');
    await page.locator('#vaultActionBtn').click();

    await expect(page.locator('article', { hasText: 'Vault Test' })).toBeVisible();
    if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
  });
});

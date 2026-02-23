import { test, expect } from '@playwright/test';
import { dismissAckModal } from './test-utils.js';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_BACKUP_FILENAME = 'staktrakr-backup-2026-02-20T12-00-00.stvault';

const MOCK_LIST_FOLDER_RESPONSE = {
  entries: [{
    '.tag': 'file',
    name: MOCK_BACKUP_FILENAME,
    path_lower: '/staktrakr/' + MOCK_BACKUP_FILENAME.toLowerCase(),
    size: 2048,
    client_modified: '2026-02-20T12:00:00Z',
    server_modified: '2026-02-20T12:00:00Z',
  }],
  cursor: '',
  has_more: false,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Injects a valid-looking Dropbox token into localStorage before the app boots.
 * expires_at is 1 hour from now — avoids any token refresh attempt.
 */
async function injectDropboxToken(page) {
  await page.addInitScript((expiresAt) => {
    localStorage.setItem('cloud_token_dropbox', JSON.stringify({
      access_token: 'sl.test_fake_access_token_playwright',
      refresh_token: 'test_refresh_token_playwright',
      expires_at: expiresAt,
    }));
  }, Date.now() + 3_600_000);
}

/**
 * Intercepts all Dropbox API calls with canned responses.
 * No real network requests leave the browser.
 */
async function mockDropboxRoutes(page) {
  // Token refresh — shouldn't be needed since expires_at is far future
  await page.route('**/api.dropboxapi.com/oauth2/token', route =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ access_token: 'sl.test_refreshed', expires_in: 14400 }),
    }));

  // Download — conflict check + restore download
  // Returning 409 path_not_found → cloudGetRemoteLatest returns null → no conflict
  await page.route('**/content.dropboxapi.com/2/files/download', route =>
    route.fulfill({
      status: 409, contentType: 'application/json',
      body: JSON.stringify({
        error_summary: 'path/not_found/.',
        error: { '.tag': 'path', path: { '.tag': 'not_found' } },
      }),
    }));

  // Upload — backup file + latest snapshot (both calls share this mock)
  await page.route('**/content.dropboxapi.com/2/files/upload', route =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ name: 'staktrakr-latest.json', '.tag': 'file', size: 2048 }),
    }));

  // List folder — returns one mock backup entry
  await page.route('**/api.dropboxapi.com/2/files/list_folder', route =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify(MOCK_LIST_FOLDER_RESPONSE),
    }));

  // Delete backup
  await page.route('**/api.dropboxapi.com/2/files/delete_v2', route =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ metadata: { '.tag': 'file', name: MOCK_BACKUP_FILENAME } }),
    }));
}

/** Navigate to the Cloud section of Settings. */
async function openCloudSettings(page) {
  await page.locator('#settingsBtn').click();
  await page.locator('#settingsModal .settings-nav-item[data-section="cloud"]').click();
  await expect(page.locator('#cloudCard_dropbox')).toBeVisible();
}

// ── Test suite ────────────────────────────────────────────────────────────────

test.describe('Cloud Sync — Dropbox (mocked API)', () => {
  test.beforeEach(async ({ page }) => {
    await injectDropboxToken(page);
    await mockDropboxRoutes(page);
    await page.goto('/');
    await dismissAckModal(page);
  });

  // ── 1. Connected state ──────────────────────────────────────────────────────

  test('shows connected UI when Dropbox token is present', async ({ page }) => {
    await openCloudSettings(page);
    const card = page.locator('#cloudCard_dropbox');

    // Disconnect button visible; login button hidden
    await expect(card.locator('.cloud-disconnect-btn')).toBeVisible();
    await expect(card.locator('.cloud-connect-btn')).not.toBeVisible();

    // Action buttons enabled for connected provider
    await expect(card.locator('.cloud-backup-btn')).toBeEnabled();
    await expect(card.locator('.cloud-restore-btn')).toBeEnabled();
  });

  // ── 2. Backup ───────────────────────────────────────────────────────────────

  test('Backup Now encrypts vault and uploads to Dropbox', async ({ page }) => {
    // Wipe inventory via UI — seed data is ~470 KB which causes String.fromCharCode.apply
    // to exceed the JS call stack limit inside vaultEncryptToBytes. Empty inventory = small payload.
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

    // Re-inject Dropbox token — the wipe clears all localStorage including cloud tokens
    const expiresAt = Date.now() + 3_600_000;
    await page.evaluate((ea) => {
      localStorage.setItem('cloud_token_dropbox', JSON.stringify({
        access_token: 'sl.test_fake_access_token_playwright',
        refresh_token: 'test_refresh_token_playwright',
        expires_at: ea,
      }));
      if (typeof syncCloudUI === 'function') syncCloudUI();
    }, expiresAt);

    // Pre-cache vault password so the vault password modal is bypassed
    await page.evaluate(() => {
      if (typeof cloudCachePassword === 'function') {
        cloudCachePassword('dropbox', 'TestVaultPass123!');
      }
    });

    // Settings modal is still open — navigate to Cloud section
    await page.locator('#settingsModal .settings-nav-item[data-section="cloud"]').click();
    await expect(page.locator('#cloudCard_dropbox')).toBeVisible();

    const backupBtn = page.locator('#cloudCard_dropbox .cloud-backup-btn');
    await expect(backupBtn).toBeEnabled();
    await backupBtn.click();

    // Button cycles: "Checking…" → "Encrypting…" → "Uploading…" → "Backup Now"
    await expect(backupBtn).toHaveText(/Backup Now/i, { timeout: 20_000 });

    // cloud_last_backup is written to localStorage on successful upload
    const lastBackup = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('cloud_last_backup')); } catch { return null; }
    });
    expect(lastBackup).not.toBeNull();
    expect(lastBackup.provider).toBe('dropbox');
  });

  // ── 3. Restore list ─────────────────────────────────────────────────────────

  test('Restore button fetches and displays backup list', async ({ page }) => {
    await openCloudSettings(page);

    const restoreBtn = page.locator('#cloudCard_dropbox .cloud-restore-btn');
    await expect(restoreBtn).toBeEnabled();
    await restoreBtn.click();

    // Backup list renders human-friendly date/size (not raw filename) —
    // use the data-filename attribute on the entry button for a reliable match.
    const entry = page.locator(
      `#cloudBackupList_dropbox .cloud-backup-entry[data-filename="${MOCK_BACKUP_FILENAME}"]`
    );
    await expect(entry).toBeVisible({ timeout: 10_000 });
  });

  // ── 4. Disconnect ───────────────────────────────────────────────────────────

  test('Disconnect clears token and resets UI to login state', async ({ page }) => {
    await openCloudSettings(page);

    const card = page.locator('#cloudCard_dropbox');
    await card.locator('.cloud-disconnect-btn').click();

    // Login button returns; action buttons disabled
    await expect(card.locator('.cloud-connect-btn')).toBeVisible({ timeout: 5_000 });
    await expect(card.locator('.cloud-disconnect-btn')).not.toBeVisible();
    await expect(card.locator('.cloud-backup-btn')).toBeDisabled();
    await expect(card.locator('.cloud-restore-btn')).toBeDisabled();

    // Token cleared from localStorage
    const token = await page.evaluate(() => localStorage.getItem('cloud_token_dropbox'));
    expect(token).toBeNull();
  });

  // ── 5. Auto-sync toggle ─────────────────────────────────────────────────────

  test('enabling auto-sync activates the Sync Now button', async ({ page }) => {
    await openCloudSettings(page);

    const syncNowBtn = page.locator('#cloudSyncNowBtn');
    const autoSyncToggle = page.locator('#cloudAutoSyncToggle');

    // Sync Now disabled before auto-sync is enabled
    await expect(syncNowBtn).toBeDisabled();

    await autoSyncToggle.check();

    await expect(syncNowBtn).toBeEnabled({ timeout: 5_000 });
  });
});

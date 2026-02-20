import { test, expect } from '@playwright/test';

/**
 * API Integration Tests
 * 
 * These tests require API keys and external service access.
 * Once 1Password integration is ready, keys can be retrieved from environment variables
 * or a secure vault.
 * 
 * TODO: Integrate with 1Password for credentials.
 */

test.describe('API Integrations (Requires Keys)', () => {
  test.skip('Dropbox: Login and sync', async ({ page }) => {
    // 1. Open Settings -> Cloud
    // 2. Click "Login to Dropbox"
    // 3. Handle OAuth redirect (requires credentials)
    // 4. Verify sync status
  });

  test.skip('Numista: Search and fill item', async ({ page }) => {
    // 1. Configure Numista API Key in Settings -> API
    // 2. Add Item -> Search Numista by name
    // 3. Select a result and verify fields are auto-filled
  });

  test.skip('PCGS: Verify cert number', async ({ page }) => {
    // 1. Configure PCGS API Key in Settings -> API
    // 2. Open an item with PCGS authority
    // 3. Click "Verify" and check status
  });

  test.skip('Metal price providers: Sync current prices', async ({ page }) => {
    // 1. Configure Metals.dev or other provider
    // 2. Click Sync
    // 3. Verify spot prices updated
  });
});

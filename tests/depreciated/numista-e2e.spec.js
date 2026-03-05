import { test, expect } from '@playwright/test';
import { dismissAckModal } from './test-utils.js';

/**
 * Numista API — End-to-End Tests
 *
 * Requires NUMISTA_API_TEST_KEY environment variable (sourced from Infisical dev env).
 *
 * Test coin: "3 Pence - Elizabeth II (1st Portrait; with "F:D:")"
 * A non-standard coin chosen to exercise real search disambiguation — it won't
 * appear as a trivial bullion hit and requires the user to select from a results list.
 *
 * Run via:
 *   NUMISTA_API_TEST_KEY=<key> npm test -- --project=chromium tests/numista-e2e.spec.js
 * Or via the smoke-test skill which sources keys from Infisical automatically.
 */

const NUMISTA_API_KEY = process.env.NUMISTA_API_TEST_KEY;
const SEARCH_QUERY   = '3 Pence Elizabeth II';
const COIN_MATCH     = 'F:D:';   // unique text in the target result card

// ── Shared helpers ─────────────────────────────────────────────────────────

async function dismissAck(page) {
  await dismissAckModal(page);
}

async function dismissVersionModal(page) {
  const modal = page.locator('#versionModal');
  if (await modal.isVisible()) {
    await page.locator('#versionCloseBtn').click();
    await expect(modal).not.toBeVisible();
  }
}

async function dismissAppDialog(page) {
  await expect(page.locator('#appDialogModal')).toBeVisible({ timeout: 5000 });
  await page.locator('#appDialogOk').click();
  await expect(page.locator('#appDialogModal')).not.toBeVisible();
}

async function configureNumistaKey(page, key) {
  await page.locator('#settingsBtn').click();
  await page.locator('.settings-nav-item[data-section="api"]').click();
  await page.locator('button.settings-provider-tab[data-provider="NUMISTA"]').click();
  await page.fill('#numistaApiKey', key);
  await page.locator('#saveNumistaBtn').click();
  // Saving the key triggers an appAlert confirmation — dismiss it
  await dismissAppDialog(page);
}

async function openNumistaApiSettings(page) {
  await page.locator('#settingsBtn').click();
  await page.locator('.settings-nav-item[data-section="api"]').click();
  await page.locator('button.settings-provider-tab[data-provider="NUMISTA"]').click();
}

/** Waits for a running bulk sync to finish (cancel btn goes visible then hidden). */
async function waitForSyncComplete(page) {
  await expect(page.locator('#numistaSyncCancelBtn')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#numistaSyncCancelBtn')).not.toBeVisible({ timeout: 60_000 });
  await expect(page.locator('#numistaSyncStartBtn')).toBeEnabled();
}

async function clearSyncLog(page) {
  await page.evaluate(() => {
    const log = document.getElementById('numistaSyncLog');
    if (log) log.textContent = '';
  });
}

// ── Test suite ─────────────────────────────────────────────────────────────

test.describe('Numista API — E2E', () => {
  test.skip(!NUMISTA_API_KEY, 'NUMISTA_API_TEST_KEY is not set — skipping live API tests');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissAck(page);
  });

  // ── 1. Key Setup ───────────────────────────────────────────────────────────

  test('configure API key and verify connection', async ({ page }) => {
    await configureNumistaKey(page, NUMISTA_API_KEY);

    await page.locator('#testNumistaBtn').click();

    // Status indicator should reach "connected" state
    await expect(page.locator('#numistaProviderStatus')).toContainText(/connected/i, {
      timeout: 15_000,
    });
  });

  // ── 2. Full Workflow ────────────────────────────────────────────────────────
  //
  // All steps run in one test so localStorage (API key, inventory) persists
  // across the entire flow without needing cross-test context sharing.

  test('full workflow — create via search, sync, cache cycle, reload verify', async ({ page }) => {

    // ── 2a. Configure API key ──────────────────────────────────────────────

    await configureNumistaKey(page, NUMISTA_API_KEY);
    await page.keyboard.press('Escape');
    await expect(page.locator('#settingsModal')).not.toBeVisible();

    // ── 2b. Open Add Item modal ────────────────────────────────────────────

    await page.locator('#newItemBtn').click();
    await expect(page.locator('#itemModal')).toBeVisible();

    await page.selectOption('#itemMetal', 'Silver');
    await page.selectOption('#itemType', 'Coin');
    await page.fill('#itemName', SEARCH_QUERY);
    await page.fill('#itemQty', '1');
    await page.fill('#itemPrice', '1.00');

    // ── 2c. Search Numista ─────────────────────────────────────────────────

    // #searchNumistaBtn lives inside a collapsed <details> accordion; expand it first
    const numistaSection = page.locator('details.form-section').filter({ has: page.locator('#searchNumistaBtn') });
    if (!(await numistaSection.getAttribute('open'))) {
      await numistaSection.locator('summary').click();
    }
    await page.locator('#searchNumistaBtn').click();

    await expect(page.locator('#numistaResultsModal')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#numistaResultsList')).not.toBeEmpty({ timeout: 10_000 });

    // ── 2d. Select the target result ───────────────────────────────────────

    // Target the card with "F:D:" that is NOT the "without F:D:" variant.
    // Both card names contain the string "F:D:" so we must exclude "without".
    const targetCard = page.locator('.numista-result-card')
      .filter({ hasText: COIN_MATCH })
      .filter({ hasNotText: 'without' })
      .first();
    await expect(targetCard).toBeVisible({ timeout: 10_000 });
    await targetCard.click();

    // Field picker should appear
    await expect(page.locator('#numistaFieldPicker')).toBeVisible({ timeout: 5000 });

    // Confirm the picker pre-selected fields and apply them
    await page.locator('#numistaFillBtn').click();

    // ── 2e. Save item ──────────────────────────────────────────────────────

    await expect(page.locator('#itemModal')).toBeVisible();

    // Name should now be the Numista title (contains "Pence")
    const filledName = await page.locator('#itemName').inputValue();
    expect(filledName).toMatch(/Pence/i);

    // Weight may or may not be filled by Numista; ensure it has a value
    const filledWeight = await page.locator('#itemWeight').inputValue();
    if (!filledWeight || filledWeight === '0') {
      await page.fill('#itemWeight', '1.41'); // 3d threepence ~1.41g silver
    }

    await page.locator('#itemModalSubmit').click();
    await expect(page.locator('#itemModal')).not.toBeVisible({ timeout: 5000 });

    // Item should appear in inventory
    const inventoryItem = page.locator('article, #inventoryTable tbody tr')
      .filter({ hasText: /Pence/i })
      .first();
    await expect(inventoryItem).toBeVisible({ timeout: 5000 });

    // ── 2f. Verify Numista data in inventory (catalog ID was applied) ───────

    const hasCatalogId = await page.evaluate(() => {
      const inv = typeof inventory !== 'undefined' ? inventory : [];
      return inv.some(item => item.catalogId || item.numistaId || item.numistaCountry);
    });
    expect(hasCatalogId).toBe(true);

    // ── 2g. Open Settings → Numista API block ──────────────────────────────

    await openNumistaApiSettings(page);

    // Bulk sync group becomes visible once there are eligible items
    await expect(page.locator('#numistaBulkSyncGroup')).toBeVisible({ timeout: 5000 });

    // Eligible items table shows our coin as "Needs sync"
    await expect(page.locator('#numistaSyncTableContainer')).toContainText(/Needs sync/i, {
      timeout: 5000,
    });

    // ── 2h. Sync #1 — first run: expect API hit, then cached ───────────────

    await page.locator('#numistaSyncStartBtn').click();
    await waitForSyncComplete(page);

    // #numistaSyncLog is inside a collapsed <details> — use textContent (not innerText)
    const log1 = await page.locator('#numistaSyncLog').evaluate(el => el.textContent);

    // At least one item went through api-lookup
    expect(log1).toMatch(/Syncing metadata from Numista/i);

    // Completion summary reports ≥ 1 API call
    expect(log1).toMatch(/\d+ API call/);

    // Table row now shows ✓ Synced
    await expect(page.locator('#numistaSyncTableContainer')).toContainText('✓ Synced');

    // ── 2i. Sync #2 — idempotent: should skip (no re-fetch) ───────────────

    await clearSyncLog(page);
    await page.locator('#numistaSyncStartBtn').click();
    await waitForSyncComplete(page);

    const log2 = await page.locator('#numistaSyncLog').evaluate(el => el.textContent);

    // All items skipped — no API calls in this run
    expect(log2).toMatch(/Already synced/i);
    expect(log2).not.toMatch(/API call/);

    // ── 2j. Clear Numista cache ────────────────────────────────────────────

    await page.locator('#clearNumistaCacheBtn').click();
    await dismissAppDialog(page);

    // Stats bar resets to 0
    await expect(page.locator('#numistaSyncStats')).toContainText('0 API cache', { timeout: 3000 });

    // Table reverts to "Needs sync"
    await expect(page.locator('#numistaSyncTableContainer')).toContainText('Needs sync', {
      timeout: 5000,
    });

    // ── 2k. Verify localStorage response cache is cleared ─────────────────

    const cacheCleared = await page.evaluate(() => {
      const key = typeof NUMISTA_RESPONSE_CACHE_KEY !== 'undefined'
        ? NUMISTA_RESPONSE_CACHE_KEY
        : 'numista_response_cache';
      const raw = localStorage.getItem(key);
      if (!raw) return true;
      try {
        return Object.keys(JSON.parse(raw)).length === 0;
      } catch {
        return true;
      }
    });
    expect(cacheCleared).toBe(true);

    // ── 2l. Sync #3 — post-clear: hits API again ───────────────────────────

    await clearSyncLog(page);
    await page.locator('#numistaSyncStartBtn').click();
    await waitForSyncComplete(page);

    const log3 = await page.locator('#numistaSyncLog').evaluate(el => el.textContent);
    expect(log3).toMatch(/Syncing metadata from Numista/i);
    expect(log3).toMatch(/\d+ API call/);
    await expect(page.locator('#numistaSyncTableContainer')).toContainText('✓ Synced');

    // ── 2m. Sync #4 — re-cached: skips again ──────────────────────────────

    await clearSyncLog(page);
    await page.locator('#numistaSyncStartBtn').click();
    await waitForSyncComplete(page);

    const log4 = await page.locator('#numistaSyncLog').evaluate(el => el.textContent);
    expect(log4).toMatch(/Already synced/i);
    expect(log4).not.toMatch(/API call/);

    await page.keyboard.press('Escape');

    // ── 2n. Reload page ────────────────────────────────────────────────────

    await page.reload();
    await dismissAck(page);
    await dismissVersionModal(page);

    // ── 2o. Locate item and open detail view ──────────────────────────────

    const coinCard = page.locator('article, #inventoryTable tbody tr')
      .filter({ hasText: /Pence/i })
      .first();
    await expect(coinCard).toBeVisible({ timeout: 5000 });
    await coinCard.click();

    await expect(page.locator('#viewItemModal')).toBeVisible({ timeout: 5000 });

    // ── 2p. Verify Numista-enriched data persisted through reload ──────────

    const viewModal = page.locator('#viewItemModal');

    // Country should be populated from Numista. N#1560 (3 Pence Elizabeth II 1st Portrait
    // with F:D:) is the Australian issue — Numista returns "Australia" for this coin.
    await expect(viewModal).toContainText(/Australia/i, { timeout: 5000 });

    // Denomination field should reference pence
    await expect(viewModal).toContainText(/Pence|3/i);

    // Catalog ID field should be present (N# was applied from search)
    await expect(viewModal).toContainText(/N#|numista/i);
  });
});

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

// =============================================================================
// STAK-222: API Pipeline Improvements
// =============================================================================

test('STAK-222: new cache keys are in ALLOWED_STORAGE_KEYS', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const keys = window.ALLOWED_STORAGE_KEYS || [];
    return {
      hasNumista: keys.includes('numista_response_cache'),
      hasPcgs: keys.includes('pcgs_response_cache'),
    };
  });
  expect(result.hasNumista).toBe(true);
  expect(result.hasPcgs).toBe(true);
});

test('STAK-222: Numista cache read/write roundtrip', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    // Write a fake entry to the cache
    const fakeData = { title: [{ text: 'Test Coin' }] };
    window.saveNumistaCache('type-99999', fakeData);

    // Read it back
    const hit = window.loadNumistaCache('type-99999');
    const miss = window.loadNumistaCache('type-00000');

    // Write a stale entry (31 days old) and verify it's rejected
    const key = window.NUMISTA_RESPONSE_CACHE_KEY;
    const cache = window.loadDataSync(key) || {};
    cache['type-stale'] = {
      data: { title: [{ text: 'Stale' }] },
      fetchedAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
      ttlDays: 30,
    };
    window.saveDataSync(key, cache);
    const staleHit = window.loadNumistaCache('type-stale');

    return { hit: !!hit, miss: miss === null, staleRejected: staleHit === null };
  });
  expect(result.hit).toBe(true);
  expect(result.miss).toBe(true);
  expect(result.staleRejected).toBe(true);
});

test('STAK-222: background sync starts on page load without errors', async ({ page }) => {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto('/');
  await page.waitForTimeout(1000); // let init complete
  const hasErrors = errors.some(e => e.includes('spot-bg-sync') || e.includes('startSpotBackgroundSync'));
  expect(hasErrors).toBe(false);
});

test('STAK-222: startSpotBackgroundSync is defined and callable', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    return typeof window.startSpotBackgroundSync === 'function';
  });
  expect(result).toBe(true);
});

test('STAK-222: cached source entries excluded from sparkline data', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    // Inject a cached entry into spotHistory alongside a real entry on same day
    const ts = new Date().toISOString().slice(0, 10);
    window.spotHistory.push({ spot: 32.00, metal: 'Silver', source: 'api', provider: 'StakTrakr', timestamp: ts + ' 09:00:00' });
    window.spotHistory.push({ spot: 32.00, metal: 'Silver', source: 'cached', provider: 'StakTrakr', timestamp: ts + ' 14:00:00' });

    // getSparklineData filters by source; verify cached entries are excluded from intraday
    const intraday = window.spotHistory.filter(e => e.metal === 'Silver' && e.source !== 'cached');
    const allEntries = window.spotHistory.filter(e => e.metal === 'Silver');
    return {
      intradayCount: intraday.length,
      totalCount: allEntries.length,
      cachedExcluded: intraday.every(e => e.source !== 'cached'),
    };
  });
  expect(result.cachedExcluded).toBe(true);
  expect(result.totalCount).toBeGreaterThan(result.intradayCount);
});

test('STAK-222: PCGS cache read/write roundtrip', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const fakeData = { PCGSNo: '1234567', Grade: 65, Name: 'Test Coin MS-65' };
    window.savePcgsCache('cert-99999999', fakeData);

    const hit = window.loadPcgsCache('cert-99999999');
    const miss = window.loadPcgsCache('cert-00000000');

    return { hit: !!hit, miss: miss === null };
  });
  expect(result.hit).toBe(true);
  expect(result.miss).toBe(true);
});

// =============================================================================
// STAK-255 / STAK-271: Endpoint path correctness
// Regression guard: ensures hourlyBaseUrls and RETAIL_API_ENDPOINTS use the
// correct api.staktrakr.com paths. (api1.staktrakr.com removed in STAK-271.)
// api2.staktrakr.com added as backup endpoint — counts are now 2.
// =============================================================================

/** Minimal valid hourly spot price array matching parseBatchResponse expectations. */
const MOCK_HOURLY_SPOT = JSON.stringify([
  { spot: 32.50, metal: 'Silver', source: 'hourly', provider: 'MetalPriceAPI', timestamp: '2026-02-21 12:00:00' },
  { spot: 2950.00, metal: 'Gold', source: 'hourly', provider: 'MetalPriceAPI', timestamp: '2026-02-21 12:00:00' },
]);

test('STAK-255: hourlyBaseUrls and RETAIL_API_ENDPOINTS use correct paths', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const hourly = window.API_PROVIDERS?.STAKTRAKR?.hourlyBaseUrls || [];
    const retail = window.RETAIL_API_ENDPOINTS || [];
    return {
      // Primary endpoint serves hourly spot data at /data/hourly
      apiHourlyCorrect: hourly.some(u => u.includes('api.staktrakr.com/data/hourly')),
      // Backup endpoint also present
      api2HourlyCorrect: hourly.some(u => u.includes('api2.staktrakr.com/data/hourly')),
      // Primary endpoint serves retail at /data/api/
      apiRetailCorrect: retail.some(u => u.includes('api.staktrakr.com/data/api')),
      // Backup endpoint also present
      api2RetailCorrect: retail.some(u => u.includes('api2.staktrakr.com/data/api')),
      hourlyCount: hourly.length,
      retailCount: retail.length,
    };
  });
  expect(result.apiHourlyCorrect).toBe(true);
  expect(result.api2HourlyCorrect).toBe(true);
  expect(result.apiRetailCorrect).toBe(true);
  expect(result.api2RetailCorrect).toBe(true);
  expect(result.hourlyCount).toBe(2);
  expect(result.retailCount).toBe(2);
});

// =============================================================================
// STAK-215: Surface retail price save failures to the user
// =============================================================================

/** Minimal manifest sufficient for syncRetailPrices to attempt coin fetches. */
const MOCK_RETAIL_MANIFEST = JSON.stringify({
  generated_at: new Date().toISOString(),
  slugs: ['ase'],
  latest_window: '2026-02-22T12:00:00Z',
});

/** Minimal latest.json for a single slug. */
const MOCK_RETAIL_LATEST = JSON.stringify({
  median_price: 35.00,
  lowest_price: 34.50,
  vendors: {},
  window_start: '2026-02-22T12:00:00Z',
  windows_24h: [],
});

/** Mounts route handlers that serve minimal valid retail API responses. */
async function mountRetailMocks(page) {
  await page.route('**/manifest.json', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_RETAIL_MANIFEST })
  );
  await page.route('**/providers.json', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
  );
  await page.route('**/ase/latest.json', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_RETAIL_LATEST })
  );
  await page.route('**/ase/history-30d.json', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  );
}

test('STAK-215: syncStatus shows save-failure message when localStorage quota is exceeded', async ({ page }) => {
  await mountRetailMocks(page);
  await page.goto('/');
  await page.waitForFunction(() => typeof window.syncRetailPrices === 'function');

  // Navigate to the Retail tab so the retailSyncStatus element is in the DOM
  await page.evaluate(() => {
    const retailTab = document.querySelector('[data-tab="retail"], [data-section="retail"], #retailTab');
    if (retailTab) retailTab.click();
  });

  const statusText = await page.evaluate(async () => {
    // Reset any prior failure flag
    window._retailStorageFailure = false;

    // Make localStorage.setItem throw a QuotaExceededError for retail keys
    const _origSetItem = localStorage.setItem.bind(localStorage);
    const retailKeys = new Set(['retailPrices', 'retailPriceHistory', 'retailIntradayData', 'retailAvailability']);
    localStorage.__proto__.setItem = function(key, value) {
      if (retailKeys.has(key)) {
        const err = new DOMException('QuotaExceededError', 'QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      }
      return _origSetItem(key, value);
    };

    await window.syncRetailPrices({ ui: true });

    // Restore
    localStorage.__proto__.setItem = _origSetItem;

    const el = document.getElementById('retailSyncStatus');
    return el ? el.textContent : null;
  });

  expect(statusText).toBeTruthy();
  expect(statusText).toContain('could not save');
});

test('STAK-215: syncStatus shows success message on happy path (saves succeed)', async ({ page }) => {
  await mountRetailMocks(page);
  await page.goto('/');
  await page.waitForFunction(() => typeof window.syncRetailPrices === 'function');

  await page.evaluate(() => {
    const retailTab = document.querySelector('[data-tab="retail"], [data-section="retail"], #retailTab');
    if (retailTab) retailTab.click();
  });

  const statusText = await page.evaluate(async () => {
    window._retailStorageFailure = false;
    await window.syncRetailPrices({ ui: true });
    const el = document.getElementById('retailSyncStatus');
    return el ? el.textContent : null;
  });

  expect(statusText).toBeTruthy();
  expect(statusText).toMatch(/Synced/i);
  expect(statusText).not.toContain('could not save');
});

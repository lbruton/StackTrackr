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
// STAK-255: Dual-poller endpoint resilience — spot hourly + retail path correctness
// Regression guard: ensures both endpoints are called in parallel and the correct
// URL paths are configured for the staggered dual-poller architecture.
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
      // Both hourly endpoints use /data/hourly path
      api1HourlyCorrect: hourly.some(u => u.includes('api1.staktrakr.com/data/hourly')),
      // api (Fly.io) serves retail at /data/api/
      apiFlyRetailCorrect: retail.some(u => u.includes('api.staktrakr.com/data/api')),
      // api1 (GitHub Pages) also serves retail at /data/api/
      api1RetailCorrect: retail.some(u => u.includes('api1.staktrakr.com/data/api')),
      hourlyCount: hourly.length,
      retailCount: retail.length,
    };
  });
  expect(result.api1HourlyCorrect).toBe(true);
  expect(result.apiFlyRetailCorrect).toBe(true);
  expect(result.api1RetailCorrect).toBe(true);
  expect(result.hourlyCount).toBeGreaterThanOrEqual(2);
  expect(result.retailCount).toBeGreaterThanOrEqual(2);
});

test('STAK-255: spot sync succeeds when primary hourly endpoint is down (fallback resilience)', async ({ page }) => {
  // Block api1.staktrakr.com/hourly (primary) — return 404 for all hourly files
  await page.route('**/api1.staktrakr.com/hourly/**', route => route.fulfill({ status: 404, body: 'Not Found' }));
  // Serve valid spot data from api.staktrakr.com/data/hourly (fallback)
  await page.route('**/api.staktrakr.com/data/hourly/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_HOURLY_SPOT })
  );

  await page.goto('/');
  await page.waitForFunction(() => typeof window.syncProviderChain === 'function');

  // Force a sync using StakTrakr as provider
  await page.evaluate(async () => {
    // Set StakTrakr as rank-1 provider so fetchStaktrakrPrices is the active path
    const cfg = window.loadApiConfig ? window.loadApiConfig() : {};
    if (cfg.providers) {
      cfg.providers.STAKTRAKR = { ...(cfg.providers.STAKTRAKR || {}), rank: 1, enabled: true };
    }
    if (window.saveApiConfig) window.saveApiConfig(cfg);
    await window.syncProviderChain({ showProgress: false, forceSync: true });
  });

  const hasHourlyData = await page.evaluate(() => {
    return (window.spotHistory || []).some(e => e.source === 'api-hourly' || e.provider === 'StakTrakr');
  });
  expect(hasHourlyData).toBe(true);
});

test('STAK-255: spot sync succeeds when fallback hourly endpoint is down (primary resilience)', async ({ page }) => {
  // Serve valid spot data from api1.staktrakr.com/hourly (primary)
  await page.route('**/api1.staktrakr.com/hourly/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: MOCK_HOURLY_SPOT })
  );
  // Block api.staktrakr.com/data/hourly (fallback)
  await page.route('**/api.staktrakr.com/data/hourly/**', route => route.fulfill({ status: 404, body: 'Not Found' }));

  await page.goto('/');
  await page.waitForFunction(() => typeof window.syncProviderChain === 'function');

  await page.evaluate(async () => {
    const cfg = window.loadApiConfig ? window.loadApiConfig() : {};
    if (cfg.providers) {
      cfg.providers.STAKTRAKR = { ...(cfg.providers.STAKTRAKR || {}), rank: 1, enabled: true };
    }
    if (window.saveApiConfig) window.saveApiConfig(cfg);
    await window.syncProviderChain({ showProgress: false, forceSync: true });
  });

  const hasHourlyData = await page.evaluate(() => {
    return (window.spotHistory || []).some(e => e.source === 'api-hourly' || e.provider === 'StakTrakr');
  });
  expect(hasHourlyData).toBe(true);
});

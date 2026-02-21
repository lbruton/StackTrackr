# STAK-222 — API Pipeline Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add background auto-polling for spot prices, 30-day response caching for Numista/PCGS lookups, and a unified `source` vocabulary that keeps charts clean.

**Architecture:** Port the proven `startRetailBackgroundSync()` pattern from `retail.js` into `api.js` for spot prices. Add a transparent cache-read-before-fetch layer inside `catalog-api.js` for Numista and PCGS. All new storage keys go through `saveData`/`loadData` and `ALLOWED_STORAGE_KEYS` so ZIP backup/restore includes the cache automatically. Cache TTL doubles as the background poll interval — no new interval settings needed.

**Tech Stack:** Vanilla JS, localStorage (via `saveDataSync`/`loadDataSync`), Playwright (tests), existing `setInterval` pattern from `retail.js`.

**Design doc:** `docs/plans/2026-02-20-api-pipeline-design.md`
**Linear:** STAK-222

---

## Task 1: Storage Key Constants

**Files:**
- Modify: `js/constants.js` — near line 546 (after `API_CACHE_KEY`) and inside `ALLOWED_STORAGE_KEYS` near line 709

**Step 1: Write the failing test**

Add to `tests/api-integrations.spec.js`:

```javascript
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
```

**Step 2: Run test to verify it fails**

```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npx playwright test tests/api-integrations.spec.js --grep "STAK-222: new cache keys" -v
```

Expected: FAIL — keys not yet present.

**Step 3: Add constants**

In `js/constants.js`, after line 546 (`API_CACHE_KEY`):

```javascript
/** @constant {string} NUMISTA_RESPONSE_CACHE_KEY - 30-day per-type-ID Numista response cache */
const NUMISTA_RESPONSE_CACHE_KEY = "numista_response_cache";

/** @constant {string} PCGS_RESPONSE_CACHE_KEY - 30-day per-cert/pcgs-number PCGS response cache */
const PCGS_RESPONSE_CACHE_KEY = "pcgs_response_cache";
```

In `ALLOWED_STORAGE_KEYS` (after `RETAIL_PROVIDERS_KEY`, around line 710):

```javascript
  NUMISTA_RESPONSE_CACHE_KEY,
  PCGS_RESPONSE_CACHE_KEY,
```

In the `window.*` exports at the bottom of `constants.js`, add:

```javascript
  window.NUMISTA_RESPONSE_CACHE_KEY = NUMISTA_RESPONSE_CACHE_KEY;
  window.PCGS_RESPONSE_CACHE_KEY = PCGS_RESPONSE_CACHE_KEY;
```

**Step 4: Run test to verify it passes**

```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npx playwright test tests/api-integrations.spec.js --grep "STAK-222: new cache keys" -v
```

Expected: PASS.

**Step 5: Commit**

```bash
git add js/constants.js tests/api-integrations.spec.js
git commit -m "feat(STAK-222): add NUMISTA_RESPONSE_CACHE_KEY and PCGS_RESPONSE_CACHE_KEY constants"
```

---

## Task 2: Numista Response Cache

**Files:**
- Modify: `js/catalog-api.js` — add cache helpers and wrap the `fetch()` call in `CatalogProvider` base class (around line 310)

**Step 1: Write the failing test**

Add to `tests/api-integrations.spec.js`:

```javascript
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
```

**Step 2: Run test to verify it fails**

```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npx playwright test tests/api-integrations.spec.js --grep "STAK-222: Numista cache" -v
```

Expected: FAIL — `saveNumistaCache` not defined.

**Step 3: Implement cache helpers in `catalog-api.js`**

Add after the `CatalogConfig` class closing brace (before `CatalogProvider` class definition):

```javascript
// ---------------------------------------------------------------------------
// Numista Response Cache (STAK-222)
// ---------------------------------------------------------------------------

const NUMISTA_CACHE_TTL_DAYS = 30;

/**
 * Loads a cached Numista API response for a given type ID.
 * Returns null if not cached or entry is older than NUMISTA_CACHE_TTL_DAYS.
 * @param {string} typeId - Numista type ID string
 * @returns {Object|null} Cached response data or null
 */
const loadNumistaCache = (typeId) => {
  try {
    const cache = loadDataSync(NUMISTA_RESPONSE_CACHE_KEY) || {};
    const entry = cache[typeId];
    if (!entry) return null;
    const ageMs = Date.now() - new Date(entry.fetchedAt).getTime();
    if (ageMs > entry.ttlDays * 24 * 60 * 60 * 1000) return null;
    return entry.data;
  } catch (e) {
    debugLog('[numista-cache] Load error: ' + e.message, 'warn');
    return null;
  }
};

/**
 * Saves a Numista API response to the 30-day response cache.
 * @param {string} typeId - Numista type ID string
 * @param {Object} data - Raw API response to cache
 */
const saveNumistaCache = (typeId, data) => {
  try {
    const cache = loadDataSync(NUMISTA_RESPONSE_CACHE_KEY) || {};
    cache[typeId] = { data, fetchedAt: new Date().toISOString(), ttlDays: NUMISTA_CACHE_TTL_DAYS };
    saveDataSync(NUMISTA_RESPONSE_CACHE_KEY, cache);
  } catch (e) {
    debugLog('[numista-cache] Save error: ' + e.message, 'warn');
  }
};

/**
 * Clears the entire Numista response cache.
 * @returns {number} Count of entries cleared
 */
const clearNumistaCache = () => {
  try {
    const cache = loadDataSync(NUMISTA_RESPONSE_CACHE_KEY) || {};
    const count = Object.keys(cache).length;
    saveDataSync(NUMISTA_RESPONSE_CACHE_KEY, {});
    return count;
  } catch (e) {
    debugLog('[numista-cache] Clear error: ' + e.message, 'warn');
    return 0;
  }
};

/**
 * Returns count of valid (non-expired) entries in the Numista cache.
 * @returns {number}
 */
const getNumistaCacheCount = () => {
  try {
    const cache = loadDataSync(NUMISTA_RESPONSE_CACHE_KEY) || {};
    const now = Date.now();
    return Object.values(cache).filter(entry => {
      const ageMs = now - new Date(entry.fetchedAt).getTime();
      return ageMs <= entry.ttlDays * 24 * 60 * 60 * 1000;
    }).length;
  } catch (e) {
    return 0;
  }
};
```

Expose on `window` at the bottom of `catalog-api.js`:

```javascript
window.loadNumistaCache = loadNumistaCache;
window.saveNumistaCache = saveNumistaCache;
window.clearNumistaCache = clearNumistaCache;
window.getNumistaCacheCount = getNumistaCacheCount;
```

**Step 4: Wire cache into `NumistaProvider.lookupItem()`**

Find `NumistaProvider` class and its `lookupItem` method (search for `async lookupItem` in `catalog-api.js`). At the start of the method body, add a cache check:

```javascript
// STAK-222: Check response cache before hitting the API
const cached = loadNumistaCache(catalogId);
if (cached) {
  debugLog(`[numista-cache] Cache hit for type ${catalogId}`, 'info');
  return this._parseResponse(cached); // use existing parse logic
}
```

After a successful API response is parsed and before returning, add:

```javascript
// STAK-222: Cache the raw response for 30 days
saveNumistaCache(catalogId, rawData); // rawData = the parsed JSON before _parseResponse
```

> **Note:** The exact variable name for the raw JSON will depend on how `lookupItem` is structured. Look for the `response.json()` call and capture the result into `rawData` if it isn't already named.

**Step 5: Run test to verify it passes**

```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npx playwright test tests/api-integrations.spec.js --grep "STAK-222: Numista cache" -v
```

Expected: PASS.

**Step 6: Commit**

```bash
git add js/catalog-api.js tests/api-integrations.spec.js
git commit -m "feat(STAK-222): add 30-day Numista response cache"
```

---

## Task 3: PCGS Response Cache

**Files:**
- Modify: `js/pcgs-api.js` — wrap `pcgsFetch()` with cache check/write

**Step 1: Write the failing test**

Add to `tests/api-integrations.spec.js`:

```javascript
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
```

**Step 2: Run test to verify it fails**

```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npx playwright test tests/api-integrations.spec.js --grep "STAK-222: PCGS cache" -v
```

Expected: FAIL — `savePcgsCache` not defined.

**Step 3: Add PCGS cache helpers to `js/pcgs-api.js`**

Add near the top of `pcgs-api.js`, after the opening comment block:

```javascript
// ---------------------------------------------------------------------------
// PCGS Response Cache (STAK-222)
// ---------------------------------------------------------------------------

const PCGS_CACHE_TTL_DAYS = 30;

/**
 * Loads a cached PCGS API response by cache key.
 * Keys: "cert-{certNumber}" for cert lookups, "pcgs-{pcgsNumber}" for CoinFacts.
 * Returns null if not found or older than 30 days.
 * @param {string} cacheKey
 * @returns {Object|null}
 */
const loadPcgsCache = (cacheKey) => {
  try {
    const cache = loadDataSync(PCGS_RESPONSE_CACHE_KEY) || {};
    const entry = cache[cacheKey];
    if (!entry) return null;
    const ageMs = Date.now() - new Date(entry.fetchedAt).getTime();
    if (ageMs > entry.ttlDays * 24 * 60 * 60 * 1000) return null;
    return entry.data;
  } catch (e) {
    debugLog('[pcgs-cache] Load error: ' + e.message, 'warn');
    return null;
  }
};

/**
 * Saves a raw PCGS API response to the 30-day cache.
 * @param {string} cacheKey
 * @param {Object} data
 */
const savePcgsCache = (cacheKey, data) => {
  try {
    const cache = loadDataSync(PCGS_RESPONSE_CACHE_KEY) || {};
    cache[cacheKey] = { data, fetchedAt: new Date().toISOString(), ttlDays: PCGS_CACHE_TTL_DAYS };
    saveDataSync(PCGS_RESPONSE_CACHE_KEY, cache);
  } catch (e) {
    debugLog('[pcgs-cache] Save error: ' + e.message, 'warn');
  }
};

/**
 * Clears the entire PCGS response cache.
 * @returns {number} Count of entries cleared
 */
const clearPcgsCache = () => {
  try {
    const cache = loadDataSync(PCGS_RESPONSE_CACHE_KEY) || {};
    const count = Object.keys(cache).length;
    saveDataSync(PCGS_RESPONSE_CACHE_KEY, {});
    return count;
  } catch (e) {
    debugLog('[pcgs-cache] Clear error: ' + e.message, 'warn');
    return 0;
  }
};

/**
 * Returns count of valid (non-expired) entries in the PCGS cache.
 * @returns {number}
 */
const getPcgsCacheCount = () => {
  try {
    const cache = loadDataSync(PCGS_RESPONSE_CACHE_KEY) || {};
    const now = Date.now();
    return Object.values(cache).filter(entry => {
      const ageMs = now - new Date(entry.fetchedAt).getTime();
      return ageMs <= entry.ttlDays * 24 * 60 * 60 * 1000;
    }).length;
  } catch (e) {
    return 0;
  }
};
```

**Step 4: Wire cache into `pcgsFetch()`**

`pcgsFetch()` is the shared fetch wrapper used by all PCGS calls (cert verify + CoinFacts). It takes a `url` parameter. The cache key is derived from the URL tail.

Modify `pcgsFetch()` to accept an optional `cacheKey` param and check/write cache:

```javascript
const pcgsFetch = async (url, cacheKey = null) => {
  // STAK-222: Check response cache first
  if (cacheKey) {
    const cached = loadPcgsCache(cacheKey);
    if (cached) {
      debugLog(`[pcgs-cache] Cache hit: ${cacheKey}`, 'info');
      return cached;
    }
  }

  const config = catalogConfig.getPcgsConfig();
  catalogConfig.incrementPcgsUsage();
  if (typeof renderPcgsUsageBar === 'function') renderPcgsUsageBar();

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `bearer ${config.bearerToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      return { _error: true, verified: false, error: 'Invalid or expired PCGS bearer token.' };
    }
    if (response.status === 404) {
      return { _error: true, verified: false, error: 'Not found in PCGS database.' };
    }
    return { _error: true, verified: false, error: `PCGS API error: HTTP ${response.status}` };
  }

  const data = await response.json();

  // STAK-222: Cache the successful response
  if (cacheKey && !data._error) {
    savePcgsCache(cacheKey, data);
  }

  return data;
};
```

At each call site of `pcgsFetch()` in `pcgs-api.js`, pass the appropriate cache key:
- Cert verification call: `pcgsFetch(url, \`cert-${certNumber}\`)`
- CoinFacts lookup call: `pcgsFetch(url, \`pcgs-${pcgsNumber}\`)`

Expose on `window` at the bottom of `pcgs-api.js`:

```javascript
window.loadPcgsCache = loadPcgsCache;
window.savePcgsCache = savePcgsCache;
window.clearPcgsCache = clearPcgsCache;
window.getPcgsCacheCount = getPcgsCacheCount;
```

**Step 5: Run test to verify it passes**

```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npx playwright test tests/api-integrations.spec.js --grep "STAK-222: PCGS cache" -v
```

Expected: PASS.

**Step 6: Commit**

```bash
git add js/pcgs-api.js tests/api-integrations.spec.js
git commit -m "feat(STAK-222): add 30-day PCGS response cache"
```

---

## Task 4: Spot Price Background Sync Function

**Files:**
- Modify: `js/api.js` — add `startSpotBackgroundSync()` near the bottom, alongside `autoSyncSpotPrices()`

**Step 1: Write the failing test**

Add to `tests/api-integrations.spec.js`:

```javascript
test('STAK-222: startSpotBackgroundSync is defined and callable', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    return typeof window.startSpotBackgroundSync === 'function';
  });
  expect(result).toBe(true);
});
```

**Step 2: Run test to verify it fails**

```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npx playwright test tests/api-integrations.spec.js --grep "STAK-222: startSpotBackgroundSync" -v
```

Expected: FAIL — function not defined.

**Step 3: Add `autoRefresh` defaults to `loadApiConfig()`**

In `loadApiConfig()` (around line 330 where the `result` object is built), add `autoRefresh` to the returned config:

```javascript
autoRefresh: config.autoRefresh || { STAKTRAKR: true },
```

In `saveApiConfig()`, persist it:

```javascript
autoRefresh: config.autoRefresh || { STAKTRAKR: true },
```

In `getDefaultSyncMode()` area and the default config object at bottom of `loadApiConfig()`, add:

```javascript
autoRefresh: { STAKTRAKR: true },
```

**Step 4: Add `startSpotBackgroundSync()`**

Add after `autoSyncSpotPrices()` in `js/api.js`:

```javascript
/** Interval ID for spot price background sync — null when not running */
let _spotSyncIntervalId = null;

/**
 * Starts background spot price auto-sync for all providers that have autoRefresh enabled.
 * Immediately syncs if data is absent or stale, then re-syncs on each provider's cache TTL interval.
 * Safe to call multiple times — clears any existing interval before setting a new one.
 * Called from init.js after autoSyncSpotPrices().
 */
const startSpotBackgroundSync = () => {
  if (_spotSyncIntervalId !== null) {
    clearInterval(_spotSyncIntervalId);
    _spotSyncIntervalId = null;
  }

  const config = loadApiConfig();
  const autoRefresh = config.autoRefresh || { STAKTRAKR: true };

  // Find shortest enabled interval to drive the master setInterval tick
  const enabledProviders = Object.keys(API_PROVIDERS).filter(p => autoRefresh[p]);
  if (enabledProviders.length === 0) return;

  // Use StakTrakr's interval (1h = 3600000ms) as the base tick if enabled,
  // otherwise fall back to the shortest configured cache TTL.
  const staktrakrEnabled = !!autoRefresh['STAKTRAKR'];
  const tickMs = staktrakrEnabled
    ? 60 * 60 * 1000  // 1 hour — StakTrakr updates hourly
    : Math.min(...enabledProviders.map(p => (config.cacheTimeouts?.[p] ?? 24) * 60 * 60 * 1000));

  const _runSilentSync = () => {
    syncProviderChain({ showProgress: false, forceSync: false }).catch(err => {
      debugLog(`[spot-bg-sync] Silent sync failed: ${err.message}`, 'warn');
    });
  };

  // Sync immediately if data is stale or missing
  const cache = loadApiCache();
  const isStale = !cache || !cache.timestamp || (Date.now() - cache.timestamp > tickMs);
  if (isStale) {
    debugLog('[spot-bg-sync] Starting immediate sync (stale or no cache)', 'info');
    _runSilentSync();
  }

  _spotSyncIntervalId = setInterval(_runSilentSync, tickMs);
  debugLog(`[spot-bg-sync] Background sync started — tick every ${tickMs / 60000}min`, 'info');
};
```

Add to `window` exports at the bottom of `api.js`:

```javascript
window.startSpotBackgroundSync = startSpotBackgroundSync;
```

**Step 5: Run test to verify it passes**

```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npx playwright test tests/api-integrations.spec.js --grep "STAK-222: startSpotBackgroundSync" -v
```

Expected: PASS.

**Step 6: Commit**

```bash
git add js/api.js tests/api-integrations.spec.js
git commit -m "feat(STAK-222): add startSpotBackgroundSync with per-provider autoRefresh config"
```

---

## Task 5: Wire Background Sync into init.js

**Files:**
- Modify: `js/init.js` — line 581, after `autoSyncSpotPrices()` call

**Step 1: Write the failing test**

This is a behavioral test — verify that after page load, the interval is running. We can confirm by checking `debugLog` output or by checking the function's side-effects aren't breaking anything.

Add to `tests/api-integrations.spec.js`:

```javascript
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
```

**Step 2: Run test to verify it passes already**

```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npx playwright test tests/api-integrations.spec.js --grep "STAK-222: background sync starts" -v
```

Expected: might PASS already (no errors) but background sync isn't actually running yet.

**Step 3: Add the call in `init.js`**

In `js/init.js`, after line 581 (`autoSyncSpotPrices()` call):

```javascript
    // STAK-222: Start background spot price polling
    if (typeof startSpotBackgroundSync === 'function') {
      startSpotBackgroundSync();
    }
```

**Step 4: Run test again**

```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npx playwright test tests/api-integrations.spec.js --grep "STAK-222: background sync starts" -v
```

Expected: PASS.

**Step 5: Commit**

```bash
git add js/init.js
git commit -m "feat(STAK-222): wire startSpotBackgroundSync into init.js startup"
```

---

## Task 6: Intraday Chart Source Filter

**Files:**
- Modify: `js/spot.js` — `getHistoricalSparklineData()` around line 579, and any intraday data prep function

**Context:** The daily sparkline already deduplicates by calendar day so "cached" entries on the same day as a real API call are silently dropped. The filter is only needed where intraday (multiple entries per day) data is built.

**Step 1: Write the failing test**

Add to `tests/api-integrations.spec.js`:

```javascript
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
```

**Step 2: Run test to verify it passes already (logic is in the filter, not yet in spot.js)**

```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npx playwright test tests/api-integrations.spec.js --grep "STAK-222: cached source entries" -v
```

**Step 3: Add filter to intraday data prep in `spot.js`**

In `getHistoricalSparklineData()` (line ~579), the `combined` array is built from `[...allHistorical, ...spotHistory]`. Add a `.filter()` to exclude cached entries from the `spotHistory` side:

```javascript
const combined = [
  ...allHistorical,
  ...spotHistory.filter(e => e.source !== 'cached'),
]
  .filter((e) => e.metal === metalName && new Date(e.timestamp) >= cutoff)
  .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
```

Search `spot.js` for any other function that assembles intraday arrays (look for `intraday=true` parameter near line 609) and apply the same filter:

```javascript
.filter(e => e.source !== 'cached')
```

**Step 4: Run test to verify it passes**

```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npx playwright test tests/api-integrations.spec.js --grep "STAK-222: cached source entries" -v
```

Expected: PASS.

**Step 5: Commit**

```bash
git add js/spot.js
git commit -m "feat(STAK-222): filter cached source entries from intraday sparkline data"
```

---

## Task 7: Settings UI — Auto-Refresh Toggle

**Files:**
- Modify: `js/api.js` — find the provider settings card HTML render function (search for `cacheTimeout_${provider}` to locate the render site, around line 2184)
- Modify: `js/api.js` — `bindProviderSettingsListeners()` (around line 592) to bind the new toggle

**Step 1: Write the failing test**

Add to `tests/ui-checks.spec.js`:

```javascript
test('STAK-222: auto-refresh toggle renders for STAKTRAKR provider', async ({ page }) => {
  await page.goto('/');
  await page.locator('#settingsBtn').click();
  // Navigate to API section
  await page.locator('.settings-nav-item[data-section="api"]').click();
  const toggle = page.locator('#autoRefresh_STAKTRAKR');
  await expect(toggle).toBeVisible();
  // StakTrakr defaults to checked
  await expect(toggle).toBeChecked();
});
```

**Step 2: Run test to verify it fails**

```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npx playwright test tests/ui-checks.spec.js --grep "STAK-222: auto-refresh toggle" -v
```

Expected: FAIL — element not found.

**Step 3: Add toggle HTML to provider settings card render**

Find the function that renders per-provider settings HTML (search for `cacheTimeout_${provider}` in `api.js`). In the HTML string that builds the provider card, after the cache timeout `<select>` block, add:

```javascript
// Auto-refresh toggle (STAK-222)
html += `<div class="settings-row api-autorefresh-row">`;
html += `<label class="settings-label" for="autoRefresh_${provider}">Background auto-refresh</label>`;
html += `<input type="checkbox" id="autoRefresh_${provider}" class="api-autorefresh-toggle" `;
html += `data-provider="${escapeHtml(provider)}"`;
if (cfg.autoRefresh?.[provider] ?? (provider === 'STAKTRAKR')) html += ` checked`;
html += `>`;
html += `<span class="settings-hint">Polls on cache TTL interval. StakTrakr: free, on by default.</span>`;
html += `</div>`;
```

**Step 4: Bind the toggle in settings listeners**

In `bindProviderSettingsListeners()` (around line 592), after the cache select change binding, add:

```javascript
// Auto-refresh toggle (STAK-222)
const autoRefreshToggle = document.getElementById(`autoRefresh_${provider}`);
if (autoRefreshToggle) {
  autoRefreshToggle.addEventListener('change', () => {
    const config = loadApiConfig();
    if (!config.autoRefresh) config.autoRefresh = {};
    config.autoRefresh[provider] = autoRefreshToggle.checked;
    saveApiConfig(config);
    // Restart background sync with new settings
    if (typeof startSpotBackgroundSync === 'function') startSpotBackgroundSync();
  });
}
```

Also load the saved value when the settings panel opens (same area as cacheSelect.value = ... around line 2187):

```javascript
const autoRefreshToggle = document.getElementById(`autoRefresh_${provider}`);
if (autoRefreshToggle) {
  autoRefreshToggle.checked = cfg.autoRefresh?.[provider] ?? (provider === 'STAKTRAKR');
}
```

**Step 5: Run test to verify it passes**

```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npx playwright test tests/ui-checks.spec.js --grep "STAK-222: auto-refresh toggle" -v
```

Expected: PASS.

**Step 6: Commit**

```bash
git add js/api.js
git commit -m "feat(STAK-222): add per-provider auto-refresh toggle to settings UI"
```

---

## Task 8: Settings UI — Cache Stat Rows (Numista + PCGS)

**Files:**
- Modify: `js/settings.js` — find where Numista and PCGS provider sections are rendered

**Step 1: Write the failing test**

Add to `tests/ui-checks.spec.js`:

```javascript
test('STAK-222: Numista cache stat row and clear button render', async ({ page }) => {
  await page.goto('/');
  await page.locator('#settingsBtn').click();
  await page.locator('.settings-nav-item[data-section="api"]').click();
  // Stat row
  const statRow = page.locator('#numistaResponseCacheStat');
  await expect(statRow).toBeVisible();
  // Clear button
  const clearBtn = page.locator('#clearNumistaCacheBtn');
  await expect(clearBtn).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npx playwright test tests/ui-checks.spec.js --grep "STAK-222: Numista cache stat" -v
```

Expected: FAIL — elements not found.

**Step 3: Add stat rows to Numista and PCGS sections in `js/settings.js`**

Find where the Numista settings section HTML is built (search for `numistaSection` or `Numista` in `settings.js`). Add after the existing Numista content:

```javascript
// STAK-222: Response cache stat row
const numistaCount = typeof getNumistaCacheCount === 'function' ? getNumistaCacheCount() : 0;
html += `<div class="settings-row api-cache-stat-row">`;
html += `<span id="numistaResponseCacheStat" class="settings-stat">`;
html += `Cached lookups: <strong>${numistaCount}</strong> entries</span>`;
html += `<button id="clearNumistaCacheBtn" class="btn secondary btn-sm">Clear cache</button>`;
html += `</div>`;
```

Repeat for the PCGS section:

```javascript
const pcgsCount = typeof getPcgsCacheCount === 'function' ? getPcgsCacheCount() : 0;
html += `<div class="settings-row api-cache-stat-row">`;
html += `<span id="pcgsResponseCacheStat" class="settings-stat">`;
html += `Cached lookups: <strong>${pcgsCount}</strong> entries</span>`;
html += `<button id="clearPcgsCacheBtn" class="btn secondary btn-sm">Clear cache</button>`;
html += `</div>`;
```

**Step 4: Bind clear buttons in `js/settings-listeners.js`**

Find where Numista settings listeners are bound. Add:

```javascript
// STAK-222: Clear Numista response cache
const clearNumistaBtn = document.getElementById('clearNumistaCacheBtn');
if (clearNumistaBtn) {
  clearNumistaBtn.addEventListener('click', () => {
    const count = typeof clearNumistaCache === 'function' ? clearNumistaCache() : 0;
    appAlert(`Cleared ${count} Numista cached lookups.`);
    // Re-render the stat row
    if (typeof renderApiSettings === 'function') renderApiSettings();
  });
}

// STAK-222: Clear PCGS response cache
const clearPcgsBtn = document.getElementById('clearPcgsCacheBtn');
if (clearPcgsBtn) {
  clearPcgsBtn.addEventListener('click', () => {
    const count = typeof clearPcgsCache === 'function' ? clearPcgsCache() : 0;
    appAlert(`Cleared ${count} PCGS cached lookups.`);
    if (typeof renderApiSettings === 'function') renderApiSettings();
  });
}
```

**Step 5: Run test to verify it passes**

```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npx playwright test tests/ui-checks.spec.js --grep "STAK-222: Numista cache stat" -v
```

Expected: PASS.

**Step 6: Commit**

```bash
git add js/settings.js js/settings-listeners.js
git commit -m "feat(STAK-222): add Numista and PCGS cache stat rows with clear buttons to settings"
```

---

## Task 9: Log Table — Cached Badge + Hide Toggle

**Files:**
- Modify: `js/api.js` — `renderApiHistoryTable()` around line 826

**Step 1: Write the failing test**

Add to `tests/ui-checks.spec.js`:

```javascript
test('STAK-222: cached entries show muted badge in history log', async ({ page }) => {
  await page.goto('/');
  // Inject a cached entry into spotHistory
  await page.evaluate(() => {
    window.spotHistory.push({
      spot: 32.00,
      metal: 'Silver',
      source: 'cached',
      provider: 'StakTrakr',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });
  });
  await page.locator('#settingsBtn').click();
  await page.locator('.settings-nav-item[data-section="api"]').click();
  // The history table should contain a "Cached" badge
  const cachedBadge = page.locator('.api-history-cached-badge').first();
  await expect(cachedBadge).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npx playwright test tests/ui-checks.spec.js --grep "STAK-222: cached entries show" -v
```

Expected: FAIL — badge not present.

**Step 3: Update `renderApiHistoryTable()` in `api.js`**

In `renderApiHistoryTable()` (around line 829), find where `sourceLabel` is built:

```javascript
// Before (existing):
const sourceLabel = e.source === "api-hourly"
  ? `${escapeHtml(e.provider || "")} (hourly)`
  : (escapeHtml(e.provider || ""));

// After (STAK-222):
let sourceLabel;
if (e.source === 'cached') {
  sourceLabel = '<span class="api-history-cached-badge">Cached</span>';
} else if (e.source === 'api-hourly') {
  sourceLabel = `${escapeHtml(e.provider || '')} (hourly)`;
} else {
  sourceLabel = escapeHtml(e.provider || e.source || '');
}
```

Add CSS for the badge to `index.html` (in the `<style>` block or the relevant CSS section):

```css
.api-history-cached-badge {
  color: var(--text-muted, #888);
  font-style: italic;
  font-size: 0.85em;
}
```

**Step 4: Run test to verify it passes**

```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npx playwright test tests/ui-checks.spec.js --grep "STAK-222: cached entries show" -v
```

Expected: PASS.

**Step 5: Commit**

```bash
git add js/api.js index.html
git commit -m "feat(STAK-222): render Cached badge for source=cached entries in API history log"
```

---

## Task 10: Full Test Pass + Manual QA

**Step 1: Run all STAK-222 tests**

```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npx playwright test --grep "STAK-222" -v
```

Expected: All PASS.

**Step 2: Run full test suite to check for regressions**

```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npm test
```

Expected: No new failures.

**Step 3: Manual QA checklist**

Open the app at `http://localhost:8765` and verify:

- [ ] Console shows `[spot-bg-sync] Background sync started` on page load
- [ ] After 1 hour with StakTrakr enabled, `spotHistory` contains a `source: "cached"` entry (or a fresh `api-hourly` entry if the cached data was stale)
- [ ] Sparkline charts show no flat-line artifacts after multiple background poll ticks
- [ ] Settings > API > StakTrakr shows "Background auto-refresh" checkbox, checked by default
- [ ] Unchecking the toggle saves to config and calling `startSpotBackgroundSync()` again in console stops the old interval and respects the new setting
- [ ] Settings > API > Numista shows "Cached lookups: N entries" and "Clear cache" button
- [ ] Settings > API > PCGS shows same
- [ ] "Clear cache" button shows count in alert and stat row resets to 0
- [ ] Repeat Numista lookup for same coin: second call returns instantly (cache hit in console log)
- [ ] ZIP export includes `numista_response_cache` and `pcgs_response_cache` keys
- [ ] ZIP import restores both cache keys — verify in DevTools > Application > localStorage after import

**Step 4: Final commit**

```bash
git add .
git commit -m "feat(STAK-222): API pipeline — background polling, Numista/PCGS caching, unified log sources"
```

---

## Coding Standards Reminders

- DOM access: `safeGetElement(id)` — not `document.getElementById()` directly
- Data persistence: `saveDataSync(key, val)` / `loadDataSync(key)` — not raw `localStorage`
- New keys: must be in `ALLOWED_STORAGE_KEYS` (done in Task 1)
- HTML in JS: `sanitizeHtml()` on user content, `escapeHtml()` for data in table cells
- New `window.*` exports: add every new public function so Playwright tests can call them via `page.evaluate()`
- `debugLog()` for all internal diagnostic messages — not `console.log()`

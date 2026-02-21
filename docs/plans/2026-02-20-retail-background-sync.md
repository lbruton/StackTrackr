# Retail Market Prices — Background Sync & Data Retention Fix

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Retail market prices are fetched automatically in the background on every page load so that by the time a user opens Settings → Market the cards and history tables are already populated — no manual "Sync Now" required.

**Architecture:** Extend `syncRetailPrices()` in `js/retail.js` to (a) accept a `{ ui }` flag for silent/background mode and (b) iterate all `manifest.dates[]` instead of only `latestDate`, fetching any date not already in history. A new `startRetailBackgroundSync()` function is called once from `init.js` after the localStorage load; it immediately fires a silent sync if data is stale and sets a 4-hour periodic refresh interval.

**Tech Stack:** Vanilla JS, `fetch()`, `setInterval`, `localStorage` via `saveDataSync`/`loadDataSync`, `safeGetElement` for DOM access.

---

## Root Causes Being Fixed

| # | Symptom | Root Cause |
|---|---------|------------|
| 1 | Only 1 day of history despite 2 days on API | `syncRetailPrices()` reads `manifest.latestDate` only; ignores `manifest.dates[]` |
| 2 | Empty Market tab until user clicks Sync | `init.js` loads from localStorage but never triggers an API fetch |
| 3 | History table stays stale after sync | `syncRetailPrices()` calls `renderRetailCards()` but not `renderRetailHistoryTable()` |
| 4 | Retail data missing from ZIP backup | ZIP export only includes inventory/spot/settings — not retail price keys |

---

## Files to Touch

- **Modify:** `js/retail.js` — main changes (sync logic, background scheduler)
- **Modify:** `js/init.js` — call `startRetailBackgroundSync()` after retail data is loaded
- **Modify:** `js/inventory.js` — add retail price data to ZIP backup/restore
- **Reference:** `js/constants.js` — `RETAIL_PRICES_KEY`, `RETAIL_PRICE_HISTORY_KEY`, `ALLOWED_STORAGE_KEYS` (no changes needed)
- **Reference:** `js/utils.js` — `saveDataSync`, `loadDataSync` (no changes needed)

---

## Task 1: Fix `syncRetailPrices()` — multi-date fetch & silent mode

**File:** `js/retail.js`

The current function fetches only `manifest.latestDate`. We need it to:
1. Read all dates from `manifest.dates[]`
2. For each date, skip if already present in every slug's history
3. Fetch only missing dates (cap at 30 to prevent runaway requests)
4. Accept `{ ui = true }` to suppress button/status updates for background calls
5. After save, also refresh history table if the market log tab is currently active

**Step 1: Replace the `syncRetailPrices` function signature and UI guard**

Find this in `js/retail.js` (line 121):
```js
const syncRetailPrices = async () => {
  const syncBtn = safeGetElement("retailSyncBtn");
  const syncStatus = safeGetElement("retailSyncStatus");

  syncBtn.disabled = true;
  syncBtn.textContent = "Syncing…";
  syncStatus.textContent = "";
  _retailSyncInProgress = true;
  renderRetailCards();
```

Replace with:
```js
/**
 * Fetches manifest then all per-slug final JSON files for any dates not
 * already in history. Appends new entries (deduped by date). Saves to localStorage.
 * @param {{ ui?: boolean }} [opts]
 *   ui=true (default) updates the Sync button and status text.
 *   ui=false runs silently in the background.
 * @returns {Promise<void>}
 */
const syncRetailPrices = async ({ ui = true } = {}) => {
  const syncBtn = safeGetElement("retailSyncBtn");
  const syncStatus = safeGetElement("retailSyncStatus");

  if (ui) {
    syncBtn.disabled = true;
    syncBtn.textContent = "Syncing…";
    syncStatus.textContent = "";
  }
  _retailSyncInProgress = true;
  renderRetailCards();
```

**Step 2: Replace the single-date fetch with multi-date iteration**

Find this block (lines 132–175 approx):
```js
    const manifestResp = await fetch(`${RETAIL_BASE_URL}/manifest.json`);
    if (!manifestResp.ok) throw new Error(`Manifest fetch failed: ${manifestResp.status}`);
    const manifest = await manifestResp.json();
    const targetDate = manifest.latestDate;
    if (!targetDate) throw new Error("Manifest missing latestDate");

    const results = await Promise.allSettled(
      RETAIL_SLUGS.map(async (slug) => {
        const resp = await fetch(`${RETAIL_BASE_URL}/${slug}/${targetDate}-final.json`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        return { slug, data };
      })
    );

    const prices = {};
    let fetchCount = 0;
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        const { slug, data } = r.value;
        prices[slug] = {
          average_price:  data.average_price,
          median_price:   data.median_price,
          lowest_price:   data.lowest_price,
          prices_by_site: data.prices_by_site || {},
          scores_by_site: data.scores_by_site || {},
        };
        fetchCount++;
      } else {
        debugLog(`[retail] Failed to fetch ${RETAIL_SLUGS[i]}: ${r.reason?.message || r.reason}`, "warn");
      }
    });

    retailPrices = { lastSync: new Date().toISOString(), date: targetDate, prices };
    saveRetailPrices();

    Object.entries(prices).forEach(([slug, priceData]) => {
      if (!retailPriceHistory[slug]) retailPriceHistory[slug] = [];
      const existing = retailPriceHistory[slug];
      if (!existing.some((e) => e.date === targetDate)) {
        existing.unshift({ date: targetDate, ...priceData });
        if (existing.length > 365) existing.splice(365);
      }
    });
    saveRetailPriceHistory();

    syncStatus.textContent = `Updated ${fetchCount}/${RETAIL_SLUGS.length} coins · ${targetDate}`;
```

Replace with:
```js
    const manifestResp = await fetch(`${RETAIL_BASE_URL}/manifest.json`);
    if (!manifestResp.ok) throw new Error(`Manifest fetch failed: ${manifestResp.status}`);
    const manifest = await manifestResp.json();
    if (!manifest.latestDate) throw new Error("Manifest missing latestDate");

    // Determine which dates need fetching — all dates in manifest not already in history.
    // manifest.dates is an array of available date strings (ISO, e.g. "2026-02-19").
    // Fall back to [latestDate] for older manifest formats that lack the dates array.
    const allDates = Array.isArray(manifest.dates) && manifest.dates.length
      ? manifest.dates
      : [manifest.latestDate];

    // A date is "complete" if the representative slug (ase) already has it in history.
    const alreadyHave = new Set((retailPriceHistory["ase"] || []).map((e) => e.date));
    const datesToFetch = allDates
      .filter((d) => !alreadyHave.has(d))
      .sort((a, b) => b.localeCompare(a)) // newest first
      .slice(0, 30);                       // safety cap

    let totalFetched = 0;
    let latestDateFetched = manifest.latestDate;

    if (datesToFetch.length === 0) {
      debugLog("[retail] All dates already in history — nothing to fetch", "info");
    }

    for (const targetDate of datesToFetch) {
      const results = await Promise.allSettled(
        RETAIL_SLUGS.map(async (slug) => {
          const resp = await fetch(`${RETAIL_BASE_URL}/${slug}/${targetDate}-final.json`);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const data = await resp.json();
          return { slug, data };
        })
      );

      const prices = {};
      let fetchCount = 0;
      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          const { slug, data } = r.value;
          prices[slug] = {
            average_price:  data.average_price,
            median_price:   data.median_price,
            lowest_price:   data.lowest_price,
            prices_by_site: data.prices_by_site || {},
            scores_by_site: data.scores_by_site || {},
          };
          fetchCount++;
        } else {
          debugLog(`[retail] ${targetDate} — ${RETAIL_SLUGS[i]}: ${r.reason?.message || r.reason}`, "warn");
        }
      });

      // Update history for this date (deduped per slug)
      Object.entries(prices).forEach(([slug, priceData]) => {
        if (!retailPriceHistory[slug]) retailPriceHistory[slug] = [];
        const existing = retailPriceHistory[slug];
        if (!existing.some((e) => e.date === targetDate)) {
          existing.unshift({ date: targetDate, ...priceData });
          if (existing.length > 365) existing.splice(365);
        }
      });

      // Keep retailPrices pointing at the latest date's snapshot
      if (targetDate === manifest.latestDate) {
        retailPrices = { lastSync: new Date().toISOString(), date: targetDate, prices };
      }

      totalFetched += fetchCount;
      latestDateFetched = manifest.latestDate;
    }

    // If latestDate wasn't in datesToFetch (already had it), ensure retailPrices is set
    if (!retailPrices || retailPrices.date !== manifest.latestDate) {
      // Reconstruct from history for the latest date
      const latestPrices = {};
      RETAIL_SLUGS.forEach((slug) => {
        const entry = (retailPriceHistory[slug] || []).find((e) => e.date === manifest.latestDate);
        if (entry) {
          const { date: _d, ...priceData } = entry;
          latestPrices[slug] = priceData;
        }
      });
      if (Object.keys(latestPrices).length > 0) {
        retailPrices = {
          lastSync: retailPrices ? retailPrices.lastSync : new Date().toISOString(),
          date: manifest.latestDate,
          prices: latestPrices,
        };
      }
    }

    saveRetailPrices();
    saveRetailPriceHistory();

    const newDatesCount = datesToFetch.length;
    const statusMsg = newDatesCount > 0
      ? `Fetched ${newDatesCount} date(s) · ${totalFetched} coin records · latest: ${latestDateFetched}`
      : `Up to date · ${manifest.latestDate}`;
    if (ui) syncStatus.textContent = statusMsg;
    debugLog(`[retail] Sync complete: ${statusMsg}`, "info");
```

**Step 3: Fix the `finally` block to also refresh the history table**

Find this block:
```js
  } finally {
    _retailSyncInProgress = false;
    renderRetailCards();
    syncBtn.disabled = false;
    syncBtn.textContent = "Sync Now";
  }
```

Replace with:
```js
  } finally {
    _retailSyncInProgress = false;
    renderRetailCards();
    // Also refresh the history table if the market log tab is currently visible
    const mktLogActive = document.querySelector('[data-log-tab="market"].active');
    if (mktLogActive && typeof renderRetailHistoryTable === "function") {
      renderRetailHistoryTable();
    }
    if (ui) {
      syncBtn.disabled = false;
      syncBtn.textContent = "Sync Now";
    }
  }
```

**Step 4: Manually test the multi-date fetch in browser console**

Open the app at `http://localhost:8765`, open DevTools console, run:
```js
// Clear existing retail history to force a fresh fetch
localStorage.removeItem('retailPrices');
localStorage.removeItem('retailPriceHistory');
location.reload();
// After reload, in console:
await syncRetailPrices({ ui: false });
console.log(Object.keys(retailPriceHistory).length, 'slugs');
console.log((retailPriceHistory['ase'] || []).length, 'ase history entries');
```
Expected: no errors, ase history shows all available dates from manifest.

**Step 5: Commit**

```bash
git add js/retail.js
git commit -m "fix(retail): fetch all manifest dates and add silent sync mode"
```

---

## Task 2: Add background auto-sync on page load

**File:** `js/retail.js`

Add a `startRetailBackgroundSync()` function that:
- Checks if data is stale (never synced, or `lastSync` is > 1 hour old)
- If stale, immediately fires `syncRetailPrices({ ui: false })`
- Always sets a 4-hour periodic interval for re-sync
- Is exported to `window`

**Step 1: Add the function after `initRetailPrices`**

Find the `initRetailPrices` function and the `// Global exposure` comment below it. Insert the new function between them:

```js
/** Interval ID for the periodic background sync — stored to allow future cancellation */
let _retailSyncIntervalId = null;

/** How stale (ms) data must be before a background sync is triggered on startup */
const RETAIL_STALE_MS = 60 * 60 * 1000; // 1 hour

/** How often (ms) to re-sync in the background while the page is open */
const RETAIL_POLL_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Starts the background retail price auto-sync.
 * Immediately syncs if data is absent or stale, then re-syncs on a periodic interval.
 * Safe to call multiple times — only one interval is kept running.
 * Called from init.js after initRetailPrices().
 */
const startRetailBackgroundSync = () => {
  // Clear any previous interval (e.g., if called on reinit)
  if (_retailSyncIntervalId !== null) {
    clearInterval(_retailSyncIntervalId);
    _retailSyncIntervalId = null;
  }

  const _runSilentSync = () => {
    syncRetailPrices({ ui: false }).catch((err) => {
      debugLog(`[retail] Background sync failed: ${err.message}`, "warn");
    });
  };

  // Sync immediately if no data or data is stale
  const lastSync = retailPrices && retailPrices.lastSync ? new Date(retailPrices.lastSync).getTime() : 0;
  const isStale = Date.now() - lastSync > RETAIL_STALE_MS;
  if (isStale) {
    debugLog("[retail] Data absent or stale — triggering background sync", "info");
    _runSilentSync();
  }

  // Periodic re-sync
  _retailSyncIntervalId = setInterval(_runSilentSync, RETAIL_POLL_INTERVAL_MS);
};
```

**Step 2: Export `startRetailBackgroundSync` in the window exposure block**

In the `if (typeof window !== "undefined")` block at the bottom of `js/retail.js`, add:
```js
  window.startRetailBackgroundSync = startRetailBackgroundSync;
```

**Step 3: Verify exports**

The full window exposure block should now include (among others):
```js
window.syncRetailPrices = syncRetailPrices;
window.startRetailBackgroundSync = startRetailBackgroundSync;
```

**Step 4: Commit**

```bash
git add js/retail.js
git commit -m "feat(retail): add startRetailBackgroundSync for auto-polling on page load"
```

---

## Task 3: Wire background sync into init.js

**File:** `js/init.js`

After the existing retail load calls (lines 424–426), add the background sync kickoff.

**Step 1: Find the retail load block in `init.js`**

```js
    // Load retail market prices
    if (typeof loadRetailPrices === 'function') loadRetailPrices();
    if (typeof loadRetailPriceHistory === 'function') loadRetailPriceHistory();
```

**Step 2: Add the background sync call immediately after**

```js
    // Load retail market prices
    if (typeof loadRetailPrices === 'function') loadRetailPrices();
    if (typeof loadRetailPriceHistory === 'function') loadRetailPriceHistory();
    // Start background auto-sync — runs immediately if stale, then every 4 hours
    if (typeof startRetailBackgroundSync === 'function') startRetailBackgroundSync();
```

**Step 3: Verify behavior in browser**

1. Clear localStorage: `localStorage.clear()` in DevTools console, then reload
2. Watch DevTools Network tab — you should see requests to `api.staktrakr.com/data/retail/...` fire automatically within 1–2 seconds
3. Open Settings → Market — cards should already be populated (or populating)
4. Close and reopen the tab (not hard refresh) — data should still be there (from localStorage)
5. Hard refresh — data should still show (loaded from localStorage in init, background sync refreshes it)

**Step 4: Commit**

```bash
git add js/init.js
git commit -m "feat(retail): wire startRetailBackgroundSync into init.js startup"
```

---

## Task 4: Add retail data to ZIP backup/restore

**File:** `js/inventory.js`

The encrypted vault (`.stvault`) already includes retail data via `ALLOWED_STORAGE_KEYS`. The ZIP backup does not. Add it.

**Step 1: Find the ZIP backup creation section in `inventory.js`**

Look for where `spot_price_history.json` is added to the ZIP (around line 119):
```js
    zip.file('spot_price_history.json', JSON.stringify(spotHistoryData, null, 2));
```

**Step 2: Add retail data files to the ZIP after the spot history file**

```js
    zip.file('spot_price_history.json', JSON.stringify(spotHistoryData, null, 2));

    // Retail market price snapshot and history
    const retailPricesData = loadDataSync(RETAIL_PRICES_KEY) || null;
    const retailHistoryData = loadDataSync(RETAIL_PRICE_HISTORY_KEY) || {};
    if (retailPricesData) {
      zip.file('retail_prices.json', JSON.stringify(retailPricesData, null, 2));
    }
    if (Object.keys(retailHistoryData).length > 0) {
      zip.file('retail_price_history.json', JSON.stringify(retailHistoryData, null, 2));
    }
```

**Step 3: Find the ZIP restore section and add retail restore**

Look for where `spot_price_history.json` is restored (around line 364):
```js
    const historyStr = await zip.file("spot_price_history.json")?.async("string");
```

After the spot history restore block, add:
```js
    // Restore retail market prices
    const retailPricesStr = await zip.file("retail_prices.json")?.async("string");
    if (retailPricesStr) {
      const retailPricesRestored = JSON.parse(retailPricesStr);
      saveDataSync(RETAIL_PRICES_KEY, retailPricesRestored);
      if (typeof loadRetailPrices === 'function') loadRetailPrices();
    }
    const retailHistoryStr = await zip.file("retail_price_history.json")?.async("string");
    if (retailHistoryStr) {
      const retailHistoryRestored = JSON.parse(retailHistoryStr);
      if (!Array.isArray(retailHistoryRestored) && typeof retailHistoryRestored === 'object') {
        saveDataSync(RETAIL_PRICE_HISTORY_KEY, retailHistoryRestored);
        if (typeof loadRetailPriceHistory === 'function') loadRetailPriceHistory();
      }
    }
```

**Step 4: Commit**

```bash
git add js/inventory.js
git commit -m "feat(retail): include retail price data in ZIP backup/restore"
```

---

## Task 5: Verification pass

**Step 1: Fresh-start test**

1. Clear ALL localStorage: `localStorage.clear()` in DevTools, then hard refresh
2. Wait 3 seconds without touching the app
3. Open Settings → Market
4. Confirm: cards show data, "Last synced" shows a recent timestamp
5. Confirm: DevTools Network shows the manifest + per-slug fetch calls fired automatically

**Step 2: Retention test**

1. After data is loaded, hard refresh (Ctrl+R / Cmd+R)
2. Open Settings → Market
3. Confirm: cards show data without any new network requests (loaded from localStorage)
4. DevTools Network: no retail API calls on this reload (because last sync was < 1 hour ago)

**Step 3: History table test**

1. With data loaded, click "Sync Now" button
2. While sync is running, switch to the Activity Log → Market tab
3. After sync completes, confirm the history table updates automatically (without needing to switch tabs)

**Step 4: Multi-date test**

1. In DevTools console: `console.log(retailPriceHistory['ase'].map(e => e.date))`
2. Confirm it shows all available dates from the manifest (not just `latestDate`)

**Step 5: ZIP backup test**

1. Export a ZIP backup (Settings → Storage or via inventory export)
2. Import it back
3. Confirm retail data survived: `console.log(retailPrices, Object.keys(retailPriceHistory))`

---

## Notes

- The `RETAIL_STALE_MS` (1 hour) and `RETAIL_POLL_INTERVAL_MS` (4 hours) are tuned for a public API with daily data. Adjust if the API starts publishing more frequently.
- The safety cap of 30 dates in `datesToFetch.slice(0, 30)` prevents runaway requests if the manifest ever has hundreds of dates. Adjust to 7 if you only want to backfill 7 days.
- The "Sync Now" button remains in the UI for manual troubleshooting. It triggers `syncRetailPrices({ ui: true })` (default) which shows the button spinner and status message as before.
- Silent sync errors are logged to `debugLog` only — users are not interrupted by background failures.

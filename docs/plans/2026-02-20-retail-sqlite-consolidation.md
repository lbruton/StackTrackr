# Retail SQLite Consolidation + Intraday UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Retire the per-date JSON file pipeline entirely. SQLite + `data/api/` are the only data store and output. Frontend migrates to the new REST API and gains intraday sparklines on cards + a 24h chart tab in the per-coin modal. STAK-217 visual polish ships in the same pass.

**Architecture:** SQLite is the time-series store written by price-extract.js every 15 min. api-export.js reads SQLite and generates `data/api/` static JSON. The frontend fetches from `data/api/` and uses `windows_24h` for sparklines. No more `data/retail/` JSON files.

**Tech Stack:** better-sqlite3, Chart.js, vanilla JS, StakTrakr patterns (`safeGetElement`, `saveDataSync`, `debugLog`).

**Design doc:** `docs/plans/2026-02-20-retail-sqlite-consolidation-design.md`

---

## Backend

---

### Task B1: Remove JSON file writes from price-extract.js + rewrite PATCH_GAPS mode

**Files:**
- Modify: `devops/retail-poller/price-extract.js`
- Modify: `devops/retail-poller/db.js` (add `readTodayFailures`)

**Step 1: Add `readTodayFailures` to db.js**

Open `devops/retail-poller/db.js` and add this function after `writeConfidenceScores`:

```js
/**
 * Returns all (coin_slug, vendor) pairs that failed today (is_failed = 1).
 * Used by PATCH_GAPS mode to find which vendors need FBP gap-fill.
 * @param {import('better-sqlite3').Database} db
 * @returns {Array<{coin_slug: string, vendor: string}>}
 */
export function readTodayFailures(db) {
  const today = new Date().toISOString().slice(0, 10);
  return db.prepare(`
    SELECT coin_slug, vendor FROM price_snapshots
    WHERE is_failed = 1 AND substr(window_start, 1, 10) = ?
    GROUP BY coin_slug, vendor
  `).all(today);
}
```

**Step 2: Delete `writeDailyJson` and `updateProviderCandidates` from price-extract.js**

Find and delete the `writeDailyJson` function (starts with `function writeDailyJson`), the `updateProviderCandidates` function (starts with `function updateProviderCandidates`), and the single call to `writeDailyJson()` near the bottom of the main scrape loop (currently passes `coinSlug, dateStr, { date: dateStr, window_start: winStart, ... }`), and the call to `updateProviderCandidates(allFailures, dateStr)`.

**Step 3: Add `readTodayFailures` to the import in price-extract.js**

Find the existing import of `db.js`:

```js
import {
  openDb, writeSnapshot, windowFloor,
} from "./db.js";
```

Change to:

```js
import {
  openDb, writeSnapshot, windowFloor, readTodayFailures,
} from "./db.js";
```

**Step 4: Rewrite the PATCH_GAPS block in price-extract.js**

Find the block starting with `if (PATCH_GAPS) {` and replace it entirely with:

```js
  if (PATCH_GAPS) {
    log(`Gap-fill run for ${dateStr}`);
    if (DRY_RUN) log("DRY RUN — no SQLite writes");

    const gapDb = DRY_RUN ? null : openDb(DATA_DIR);
    try {
      // Query SQLite for failed vendors today
      const failures = DRY_RUN ? [] : readTodayFailures(gapDb);
      if (failures.length === 0) {
        log("No gaps found — all vendors succeeded today. Nothing to do.");
        return;
      }

      // Group by coin slug
      const gapsByCoin = {};
      for (const { coin_slug, vendor } of failures) {
        if (!gapsByCoin[coin_slug]) gapsByCoin[coin_slug] = [];
        gapsByCoin[coin_slug].push(vendor);
      }

      const gapCoins = Object.keys(gapsByCoin);
      log(`Gaps found in ${gapCoins.length} coin(s): ${gapCoins.join(", ")}`);

      let totalFilled = 0;
      const scrapedAt = new Date().toISOString();
      const winStart = windowFloor();

      for (const [coinSlug, vendors] of Object.entries(gapsByCoin)) {
        const coinData = providersJson.coins[coinSlug];
        if (!coinData?.fbp_url) { warn(`No fbp_url for ${coinSlug} — skipping`); continue; }
        log(`Scraping FBP for ${coinSlug} (gaps: ${vendors.join(", ")})`);
        try {
          const md = await scrapeUrl(coinData.fbp_url, "fbp");
          const fbpPrices = extractFbpPrices(md, coinData.metal, coinData.weight_oz || 1);

          for (const providerId of vendors) {
            const fbp = fbpPrices[providerId];
            if (!fbp) { warn(`  FBP had no data for ${coinSlug}/${providerId}`); continue; }
            const price = fbp.ach;
            log(`  ↩ ${coinSlug}/${providerId}: $${price.toFixed(2)} ACH (fbp)`);
            if (!DRY_RUN) {
              writeSnapshot(gapDb, { scrapedAt, winStart, coinSlug, vendor: providerId, price, source: "fbp", isFailed: 0 });
            }
            totalFilled++;
          }
        } catch (err) {
          warn(`  ✗ FBP scrape failed for ${coinSlug}: ${err.message.slice(0, 120)}`);
        }
      }

      log(`Gap-fill done: ${totalFilled} price(s) recovered`);
      if (totalFilled === 0 && gapCoins.length > 0) {
        console.error("Gap-fill failed: no prices recovered from FBP.");
        process.exit(1);
      }
    } finally {
      if (gapDb) gapDb.close();
    }
    return;
  }
```

**Step 5: Remove now-unused file-system imports from price-extract.js**

After the changes, `writeDailyJson` and `updateProviderCandidates` are gone. Check the import line at the top:

```js
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
```

`writeFileSync` and `mkdirSync` are no longer used (PATCH_GAPS no longer writes files). Change to:

```js
import { readFileSync, existsSync } from "node:fs";
```

**Step 6: Verify**

```bash
cd devops/retail-poller
node --check price-extract.js
# Expected: no output (syntax OK)
node --check db.js
# Expected: no output
```

**Step 7: Commit**

```bash
git add devops/retail-poller/price-extract.js devops/retail-poller/db.js
git commit -m "feat(retail-poller): remove JSON file writes, rewrite PATCH_GAPS mode for SQLite"
```

---

### Task B2: Add confidence scoring to api-export.js

**Files:**
- Modify: `devops/retail-poller/api-export.js`

**Context:** Now that merge-prices.js is removed from the pipeline, api-export.js must compute confidence scores for each vendor's price. The scoring is simpler than merge-prices.js — only one source per vendor.

**Step 1: Add confidence scoring function to api-export.js**

Add this function after the `aggregateDailyRows` function, before `main()`:

```js
/**
 * Score a vendor price for a single coin window.
 * @param {number} price - The vendor's price for this window
 * @param {number|null} medianPrice - Median of all vendors for this window
 * @param {number|null} prevMedian - Previous day's median (for day-over-day check)
 * @returns {number} Score 0-100
 */
function scoreVendorPrice(price, medianPrice, prevMedian) {
  let score = 50; // base: single source
  if (medianPrice) {
    const deviation = Math.abs(price - medianPrice) / medianPrice;
    if (deviation <= 0.03) score += 10;
    else if (deviation > 0.08) score -= 15;
  }
  if (prevMedian) {
    const dayDiff = Math.abs(price - prevMedian) / prevMedian;
    if (dayDiff > 0.10) score -= 20;
  }
  return Math.max(0, Math.min(100, score));
}
```

**Step 2: Add `writeConfidenceScores` to the db.js import**

Find the existing import at the top of api-export.js:

```js
import {
  openDb,
  readLatestWindow,
  readCoinSlugs,
  readCoinWindow,
  readRecentWindows,
  readRecentWindowStarts,
  readDailyAggregates,
} from "./db.js";
```

Add `writeConfidenceScores`:

```js
import {
  openDb,
  readLatestWindow,
  readCoinSlugs,
  readCoinWindow,
  readRecentWindows,
  readRecentWindowStarts,
  readDailyAggregates,
  writeConfidenceScores,
} from "./db.js";
```

**Step 3: Add confidence scoring to the per-slug export loop**

Find the per-slug loop section. Inside it, the structure is:

```js
for (const slug of coinSlugs) {
  const latestRows = readCoinWindow(db, slug, latestWindow);
  const vendors = vendorMap(latestRows);
  // ... then windows24h, then writeApiFile for latest.json
```

AFTER `const vendors = vendorMap(latestRows);`, add confidence scoring:

```js
    // Confidence scoring: compute score per vendor, then update SQLite
    const windowMedian = medianPrice(latestRows);

    // Previous day's median for day-over-day check
    const raw2d = readDailyAggregates(db, slug, 2);
    const prevEntries = aggregateDailyRows(raw2d);
    const today = latestWindow.slice(0, 10);
    const prevEntry = prevEntries.find((e) => e.date !== today);
    const prevMedian = prevEntry ? prevEntry.avg_median : null;

    const confidenceUpdates = [];
    for (const [vendorId, vendorData] of Object.entries(vendors)) {
      const score = scoreVendorPrice(vendorData.price, windowMedian, prevMedian);
      vendorData.confidence = score;
      confidenceUpdates.push({ coinSlug: slug, vendor: vendorId, windowStart: latestWindow, confidence: score });
    }
    if (confidenceUpdates.length > 0) {
      try {
        writeConfidenceScores(db, confidenceUpdates);
      } catch (err) {
        warn(`Could not write confidence scores for ${slug}: ${err.message}`);
      }
    }
```

**Step 4: Verify**

```bash
cd devops/retail-poller
node --check api-export.js
# Expected: no output
```

**Step 5: Commit**

```bash
git add devops/retail-poller/api-export.js
git commit -m "feat(retail-poller): add confidence scoring to api-export.js, retire merge-prices from pipeline"
```

---

### Task B3: Update run-local.sh — remove merge step, fix git add

**Files:**
- Modify: `devops/retail-poller/run-local.sh`

**Step 1: Read the current run-local.sh**

```bash
cat devops/retail-poller/run-local.sh
```

**Step 2: Remove the merge-prices.js call**

Find the line:
```bash
node /app/merge-prices.js
```
Delete it.

**Step 3: Change git add to only include data/api/**

Find the line:
```bash
git add data/retail/ data/api/
```
Change to:
```bash
git add data/api/
```

**Step 4: Verify syntax**

```bash
bash -n devops/retail-poller/run-local.sh
# Expected: no output (syntax OK)
```

**Step 5: Commit**

```bash
git add devops/retail-poller/run-local.sh
git commit -m "feat(retail-poller): remove merge step from run-local.sh, git add data/api/ only"
```

---

### Task B4: Rewrite run-fbp.sh for SQLite-based gap detection

**Files:**
- Modify: `devops/retail-poller/run-fbp.sh`

**Context:** The old `run-fbp.sh` reads `{date}.json` files to find `failed_sites`. After Task B1, PATCH_GAPS mode in price-extract.js queries SQLite directly. run-fbp.sh becomes simpler — just invoke price-extract.js in PATCH_GAPS mode and call api-export.js.

**Step 1: Replace run-fbp.sh entirely**

Write this content to `devops/retail-poller/run-fbp.sh`:

```bash
#!/bin/bash
# StakTrakr Gap-Fill Run — 3pm ET follow-up after the 11am full scrape.
# Queries SQLite for today's failed vendors, scrapes FindBullionPrices for
# those coins, and writes recovered prices back to SQLite. Then regenerates
# the data/api/ REST endpoints.

set -euo pipefail

DATE=$(date -u +%Y-%m-%d)
echo "[$(date -u +%H:%M:%S)] Starting SQLite gap-fill run for $DATE"

if [ -z "${DATA_REPO_PATH:-}" ]; then
  echo "ERROR: DATA_REPO_PATH not set (path to data branch git checkout)"
  exit 1
fi

cd "$DATA_REPO_PATH"
git pull --rebase origin data

PATCH_GAPS=1 \
DATA_DIR="$DATA_REPO_PATH/data" \
FIRECRAWL_BASE_URL="${FIRECRAWL_BASE_URL:-http://firecrawl:3002}" \
node /app/price-extract.js

DATA_DIR="$DATA_REPO_PATH/data" \
node /app/api-export.js

cd "$DATA_REPO_PATH"
git add data/api/
if git diff --cached --quiet; then
  echo "[$(date -u +%H:%M:%S)] No gaps filled — nothing to commit."
else
  git commit -m "retail: ${DATE} gap-fill (fbp)"
  git pull --rebase origin data
  git push origin data
  echo "[$(date -u +%H:%M:%S)] Pushed gap-fill patches to data branch."
fi

echo "[$(date -u +%H:%M:%S)] Done."
```

**Step 2: Make executable**

```bash
chmod +x devops/retail-poller/run-fbp.sh
```

**Step 3: Verify syntax**

```bash
bash -n devops/retail-poller/run-fbp.sh
# Expected: no output
```

**Step 4: Commit**

```bash
git add devops/retail-poller/run-fbp.sh
git commit -m "feat(retail-poller): rewrite run-fbp.sh for SQLite-based gap detection"
```

---

## Frontend

---

### Task F1: Add RETAIL_API_BASE_URL and RETAIL_INTRADAY_KEY to constants.js

**Files:**
- Modify: `js/constants.js`

**Step 1: Add `RETAIL_API_BASE_URL` constant**

Find in constants.js around line 483:
```js
/** @constant {string} RETAIL_PRICES_KEY - LocalStorage key for current retail price snapshot */
const RETAIL_PRICES_KEY = "retailPrices";
```

Add BEFORE that line:
```js
/** @constant {string} RETAIL_API_BASE_URL - Base URL for the SQLite-backed REST API */
const RETAIL_API_BASE_URL = "https://api.staktrakr.com/data/api";
```

**Step 2: Add `RETAIL_INTRADAY_KEY` constant**

Find:
```js
/** @constant {string} RETAIL_PROVIDERS_KEY - LocalStorage key for cached providers.json lookup map */
const RETAIL_PROVIDERS_KEY = "retailProviders";
```

Add AFTER that line:
```js
/** @constant {string} RETAIL_INTRADAY_KEY - LocalStorage key for 15-min intraday window data */
const RETAIL_INTRADAY_KEY = "retailIntradayData";
```

**Step 3: Add `RETAIL_INTRADAY_KEY` to `ALLOWED_STORAGE_KEYS`**

Find the `ALLOWED_STORAGE_KEYS` array. After `RETAIL_PROVIDERS_KEY,`, add:
```js
  RETAIL_INTRADAY_KEY,
```

**Step 4: Export to window**

Find the window exports block for retail:
```js
  window.RETAIL_PRICES_KEY = RETAIL_PRICES_KEY;
  window.RETAIL_PRICE_HISTORY_KEY = RETAIL_PRICE_HISTORY_KEY;
  window.RETAIL_PROVIDERS_KEY = RETAIL_PROVIDERS_KEY;
```

Add after:
```js
  window.RETAIL_API_BASE_URL = RETAIL_API_BASE_URL;
  window.RETAIL_INTRADAY_KEY = RETAIL_INTRADAY_KEY;
```

**Step 5: Verify**

```bash
grep -n "RETAIL_API_BASE_URL\|RETAIL_INTRADAY_KEY" js/constants.js
# Expected: 4 lines — declaration, window export for each
```

**Step 6: Commit**

```bash
git add js/constants.js
git commit -m "feat(retail): add RETAIL_API_BASE_URL and RETAIL_INTRADAY_KEY to constants"
```

---

### Task F2: Add retailIntradayData state and persistence to retail.js

**Files:**
- Modify: `js/retail.js`

**Step 1: Add `retailIntradayData` state variable**

Find:
```js
/** True while syncRetailPrices() is running — triggers skeleton render */
let _retailSyncInProgress = false;
```

Add AFTER that line:
```js
/** 15-min intraday window data keyed by slug. Shape: { ase: { window_start, windows_24h: [{window, median, low}] } } */
let retailIntradayData = {};
```

**Step 2: Add load/save helpers**

Find `const saveRetailProviders = () => {` and its closing `};`. Add AFTER that entire function:

```js
const loadRetailIntradayData = () => {
  try {
    const loaded = loadDataSync(RETAIL_INTRADAY_KEY);
    retailIntradayData = (loaded && typeof loaded === "object" && !Array.isArray(loaded)) ? loaded : {};
  } catch (err) {
    console.error("[retail] Failed to load intraday data:", err);
    retailIntradayData = {};
  }
  if (typeof window !== "undefined") window.retailIntradayData = retailIntradayData;
};

const saveRetailIntradayData = () => {
  try {
    saveDataSync(RETAIL_INTRADAY_KEY, retailIntradayData);
  } catch (err) {
    console.error("[retail] Failed to save intraday data:", err);
  }
};
```

**Step 3: Add `loadRetailIntradayData()` to `initRetailPrices()`**

Find:
```js
const initRetailPrices = () => {
  loadRetailPrices();
  loadRetailPriceHistory();
  loadRetailProviders();
};
```

Change to:
```js
const initRetailPrices = () => {
  loadRetailPrices();
  loadRetailPriceHistory();
  loadRetailProviders();
  loadRetailIntradayData();
};
```

**Step 4: Commit**

```bash
git add js/retail.js
git commit -m "feat(retail): add retailIntradayData state and persistence"
```

---

### Task F3: Rewrite syncRetailPrices() for the new data/api/ endpoints

**Files:**
- Modify: `js/retail.js`

**Context:** The old `syncRetailPrices()` fetches from `data/retail/manifest.json` then per-date `{date}-final.json` files. The new version fetches from `data/api/manifest.json` then per-slug `latest.json` + `history-30d.json`.

**New data shapes from the API:**

`data/api/manifest.json` → `{ latest_window, coins: ["ase", ...] }`

`data/api/{slug}/latest.json` → `{ slug, window_start, median_price, lowest_price, vendors: { apmex: { price, confidence, source } }, windows_24h: [{ window, median, low }] }`

`data/api/{slug}/history-30d.json` → `[{ date, avg_median, avg_low, sample_count, vendors: { apmex: { avg } } }]` (oldest first from api-export)

**New retailPrices shape:**
```js
{ lastSync: ISO, window_start: ISO, prices: { ase: { median_price, lowest_price, vendors: { apmex: { price, confidence, source } } } } }
```

**New retailPriceHistory shape:**
```js
{ ase: [{ date, avg_median, avg_low, sample_count, vendors: { apmex: { avg } } }, ...] }  // newest first
```

**New retailIntradayData shape:**
```js
{ ase: { window_start: ISO, windows_24h: [{ window, median, low }, ...] } }
```

**Step 1: Replace `syncRetailPrices()` with the new implementation**

Find and replace the entire `syncRetailPrices` function (from `const syncRetailPrices = async` to the closing `};`). Replace with:

```js
/**
 * Fetches manifest then all per-slug latest.json + history-30d.json from the
 * SQLite-backed REST API (data/api/). Updates retailPrices, retailPriceHistory,
 * and retailIntradayData. Saves all three to localStorage.
 * @param {{ ui?: boolean }} [opts]
 *   ui=true (default) updates the Sync button and status text.
 *   ui=false runs silently in the background.
 * @returns {Promise<void>}
 */
const syncRetailPrices = async ({ ui = true } = {}) => {
  if (_retailSyncInProgress) {
    debugLog("[retail] Sync already in progress — skipping", "info");
    return;
  }
  const syncBtn = safeGetElement("retailSyncBtn");
  const syncStatus = safeGetElement("retailSyncStatus");

  if (ui) {
    syncBtn.disabled = true;
    syncBtn.textContent = "Syncing\u2026";
    syncStatus.textContent = "";
  }
  _retailSyncInProgress = true;
  renderRetailCards();

  try {
    const manifestResp = await fetch(`${RETAIL_API_BASE_URL}/manifest.json`);
    if (!manifestResp.ok) throw new Error(`Manifest fetch failed: ${manifestResp.status}`);
    const manifest = await manifestResp.json();
    if (!manifest.latest_window) throw new Error("Manifest missing latest_window");

    const slugs = Array.isArray(manifest.coins) && manifest.coins.length
      ? manifest.coins
      : RETAIL_SLUGS;

    // Fetch latest + history-30d for each slug in parallel
    const results = await Promise.allSettled(
      slugs.map(async (slug) => {
        const [latestResp, histResp] = await Promise.all([
          fetch(`${RETAIL_API_BASE_URL}/${slug}/latest.json`),
          fetch(`${RETAIL_API_BASE_URL}/${slug}/history-30d.json`),
        ]);
        const latest = latestResp.ok ? await latestResp.json() : null;
        const history = histResp.ok ? await histResp.json() : null;
        return { slug, latest, history };
      })
    );

    const newPrices = {};
    let fetchCount = 0;

    results.forEach((r, i) => {
      if (r.status !== "fulfilled") {
        debugLog(`[retail] ${slugs[i]}: ${r.reason?.message || r.reason}`, "warn");
        return;
      }
      const { slug, latest, history } = r.value;

      // Update retailPrices snapshot
      if (latest) {
        newPrices[slug] = {
          median_price: latest.median_price,
          lowest_price: latest.lowest_price,
          vendors: latest.vendors || {},
        };

        // Update retailIntradayData
        if (latest.windows_24h) {
          retailIntradayData[slug] = {
            window_start: latest.window_start,
            windows_24h: latest.windows_24h,
          };
        }
        fetchCount++;
      }

      // Update retailPriceHistory from 30d daily aggregates (newest first for UI)
      if (Array.isArray(history) && history.length) {
        retailPriceHistory[slug] = history.slice().reverse();
      }
    });

    if (Object.keys(newPrices).length > 0) {
      retailPrices = {
        lastSync: new Date().toISOString(),
        window_start: manifest.latest_window,
        prices: newPrices,
      };
    }

    saveRetailPrices();
    saveRetailPriceHistory();
    saveRetailIntradayData();

    const statusMsg = `Fetched ${fetchCount} coin(s) \u00b7 window: ${manifest.latest_window}`;
    if (ui) syncStatus.textContent = statusMsg;
    debugLog(`[retail] Sync complete: ${statusMsg}`, "info");
  } catch (err) {
    debugLog(`[retail] Sync error: ${err.message}`, "warn");
    if (ui) syncStatus.textContent = `Sync failed: ${err.message}`;
  } finally {
    _retailSyncInProgress = false;
    renderRetailCards();
    const mktLogActive = document.querySelector('[data-log-tab="market"].active');
    if (mktLogActive && typeof renderRetailHistoryTable === "function") {
      renderRetailHistoryTable();
    }
    if (ui) {
      syncBtn.disabled = false;
      syncBtn.textContent = "Sync Now";
    }
  }
};
```

**Step 2: Update stale check to remove `missingProviders` check**

Find in `startRetailBackgroundSync`:
```js
const missingProviders = !retailProviders || Object.keys(retailProviders).length === 0;
if (isStale || missingProviders) {
```

Change to:
```js
if (isStale) {
```

**Step 3: Commit**

```bash
git add js/retail.js
git commit -m "feat(retail): rewrite syncRetailPrices for data/api/ endpoints and new data model"
```

---

### Task F4: Update render helpers for new data shapes

**Files:**
- Modify: `js/retail.js`

**Step 1: Update `_computeRetailTrend()` — use `avg_median`**

Find:
```js
  const latest = Number(history[0].average_price);
  const prev   = Number(history[1].average_price);
```

Change to:
```js
  const latest = Number(history[0].avg_median);
  const prev   = Number(history[1].avg_median);
```

**Step 2: Update `_renderRetailSparkline()` — use intraday windows_24h**

Find and replace the entire `_renderRetailSparkline` function:

```js
/**
 * Renders a 12h intraday sparkline on a card's canvas using windows_24h data.
 * Destroys any prior Chart instance first to prevent Canvas reuse errors.
 * @param {string} slug
 */
const _renderRetailSparkline = (slug) => {
  const canvas = safeGetElement(`retail-spark-${slug}`);
  if (!(canvas instanceof HTMLCanvasElement) || typeof Chart === "undefined") return;
  const intraday = retailIntradayData[slug];
  if (!intraday || !Array.isArray(intraday.windows_24h)) return;
  // Use last 48 windows (12h) for compact display
  const windows = intraday.windows_24h.slice(-48);
  const data = windows.map((w) => Number(w.median)).filter((v) => isFinite(v));
  if (data.length < 2) return;
  if (_retailSparklines.has(slug)) {
    _retailSparklines.get(slug).destroy();
  }
  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: Array(data.length).fill(""),
      datasets: [{
        data,
        borderColor: "#3b82f6",
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.3,
        fill: false,
      }],
    },
    options: {
      responsive: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } },
      animation: false,
    },
  });
  _retailSparklines.set(slug, chart);
};
```

**Step 3: Update `_buildRetailCard()` — summary row labels + vendor data shape**

**Summary row** — Find:
```js
[["Avg", priceData.average_price], ["Med", priceData.median_price], ["Low", priceData.lowest_price]].forEach(...)
```
Change to (two items only):
```js
[["Med", priceData.median_price], ["Low", priceData.lowest_price]].forEach(...)
```

**Lowest-price highlight** — Find:
```js
const availPrices = Object.values(priceData.prices_by_site || {}).filter((p) => p != null);
```
Change to:
```js
const availPrices = Object.values(priceData.vendors || {}).map((v) => v.price).filter((p) => p != null);
```

**Vendor rows** — Find:
```js
Object.entries(RETAIL_VENDOR_NAMES).forEach(([key, label]) => {
  const price = (priceData.prices_by_site || {})[key];
  const score = priceData.scores_by_site && priceData.scores_by_site[key];
  if (price == null) return;
```
Change to:
```js
Object.entries(RETAIL_VENDOR_NAMES).forEach(([key, label]) => {
  const vendorData = (priceData.vendors || {})[key];
  const price = vendorData ? vendorData.price : null;
  const score = vendorData ? vendorData.confidence : null;
  if (price == null) return;
```

**Card footer date** — Find:
```js
dateSpan.textContent = `Data: ${retailPrices && retailPrices.date ? retailPrices.date : "\u2014"}`;
```
Change to:
```js
const windowDate = retailPrices && retailPrices.window_start ? retailPrices.window_start.slice(0, 10) : null;
dateSpan.textContent = `Data: ${windowDate || "\u2014"}`;
```

**Sparkline footer label** — After `footer.appendChild(dateSpan);` and before `footer.appendChild(sparkCanvas);`, add:
```js
const sparkLabel = document.createElement("span");
sparkLabel.className = "retail-spark-label";
sparkLabel.textContent = "today";
footer.appendChild(sparkLabel);
```

**Step 4: Update `renderRetailHistoryTable()` — new field names and column count**

Find the cells array:
```js
const cells = [
  entry.date,
  _fmtRetailPrice(entry.average_price),
  _fmtRetailPrice(entry.median_price),
  _fmtRetailPrice(entry.lowest_price),
  _fmtRetailPrice(entry.prices_by_site && entry.prices_by_site.apmex),
  _fmtRetailPrice(entry.prices_by_site && entry.prices_by_site.monumentmetals),
  _fmtRetailPrice(entry.prices_by_site && entry.prices_by_site.sdbullion),
  _fmtRetailPrice(entry.prices_by_site && entry.prices_by_site.jmbullion),
];
```
Change to (7 columns):
```js
const cells = [
  entry.date,
  _fmtRetailPrice(entry.avg_median),
  _fmtRetailPrice(entry.avg_low),
  _fmtRetailPrice(entry.vendors && entry.vendors.apmex && entry.vendors.apmex.avg),
  _fmtRetailPrice(entry.vendors && entry.vendors.monumentmetals && entry.vendors.monumentmetals.avg),
  _fmtRetailPrice(entry.vendors && entry.vendors.sdbullion && entry.vendors.sdbullion.avg),
  _fmtRetailPrice(entry.vendors && entry.vendors.jmbullion && entry.vendors.jmbullion.avg),
];
```

Also update the empty-state colSpan from 8 to 7:
```js
td.colSpan = 7;
```

**Step 5: Commit**

```bash
git add js/retail.js
git commit -m "feat(retail): update render helpers for new API data shapes and intraday sparkline"
```

---

### Task F5: Update retail-view-modal.js — new data shape + 24h chart tab

**Files:**
- Modify: `js/retail-view-modal.js`
- Modify: `index.html`

**Step 1: Add tab HTML to index.html**

Find the retailViewModal section. Locate the modal header:
```html
      <div class="modal-header">
        <div>
          <h2 id="retailViewCoinName"></h2>
          <span id="retailViewModalSubtitle" class="settings-subtext"></span>
        </div>
        <button class="modal-close" onclick="closeRetailViewModal()" ...
```

After the `</div>` that closes the header, and before `<h3 class="retail-view-section-title">Current Prices</h3>`, add the tab bar:
```html
        <div class="retail-view-tabs">
          <button class="retail-view-tab retail-view-tab--active" data-retail-tab="history" type="button">Price History</button>
          <button class="retail-view-tab" data-retail-tab="intraday" type="button">24h Chart</button>
        </div>
```

Wrap the existing history section (from `<h3 class="retail-view-section-title">Price History</h3>` through the closing `</div>` of `retail-view-table-wrap` that contains `retailViewHistoryTableBody`) in a new div:
```html
        <div id="retailViewHistoryPanel">
          <!-- existing Price History h3, chart-wrap, and table-wrap here -->
        </div>
```

After that `</div>`, add the 24h panel:
```html
        <div id="retailViewIntradayPanel" style="display:none;">
          <div class="retail-intraday-chart-wrap">
            <canvas id="retailViewIntradayChart" aria-label="24-hour intraday price chart"></canvas>
          </div>
          <p id="retailViewIntradayEmpty" class="settings-subtext" style="display:none;text-align:center;padding:1rem 0;">
            No intraday data \u2014 check back after the next 15-minute sync.
          </p>
        </div>
```

**Step 2: Update retailViewModal history table headers in index.html**

Find:
```html
<th>Date</th><th>Avg</th><th>Median</th><th>Lowest</th>
<th>APMEX</th><th>Monument</th><th>SDB</th><th>JM</th>
```
Change to (7 columns):
```html
<th>Date</th><th>Avg Med</th><th>Avg Low</th>
<th>APMEX</th><th>Monument</th><th>SDB</th><th>JM</th>
```

Also update the Activity Log market history table headers at `retailHistoryTable`:
```html
<th>Avg</th>
<th>Median</th>
```
Change to:
```html
<th>Avg Med</th>
<th>Avg Low</th>
```
And remove the `<th>Low</th>` header if present (the table now has 7 columns: Date, Avg Med, Avg Low, APMEX, Monument, SDB, JM).

**Step 3: Update retail-view-modal.js — add second chart reference**

Add at the top of the file after `let _retailViewModalChart = null;`:
```js
let _retailViewIntradayChart = null;
```

**Step 4: Update `openRetailViewModal()` — current prices table reads from `vendors`**

Find:
```js
const price = priceData.prices_by_site && priceData.prices_by_site[key];
const score = priceData.scores_by_site && priceData.scores_by_site[key];
if (price == null) return;
```
Change to:
```js
const vendorData = priceData.vendors && priceData.vendors[key];
const price = vendorData ? vendorData.price : null;
const score = vendorData ? vendorData.confidence : null;
if (price == null) return;
```

**Step 5: Update history table rows in `openRetailViewModal()`**

Find the history.forEach block:
```js
  [
    entry.date,
    fmt(entry.average_price),
    fmt(entry.median_price),
    fmt(entry.lowest_price),
    fmt(entry.prices_by_site?.apmex),
    fmt(entry.prices_by_site?.monumentmetals),
    fmt(entry.prices_by_site?.sdbullion),
    fmt(entry.prices_by_site?.jmbullion),
  ].forEach((text) => {
```
Change to (7 columns):
```js
  [
    entry.date,
    fmt(entry.avg_median),
    fmt(entry.avg_low),
    fmt(entry.vendors && entry.vendors.apmex && entry.vendors.apmex.avg),
    fmt(entry.vendors && entry.vendors.monumentmetals && entry.vendors.monumentmetals.avg),
    fmt(entry.vendors && entry.vendors.sdbullion && entry.vendors.sdbullion.avg),
    fmt(entry.vendors && entry.vendors.jmbullion && entry.vendors.jmbullion.avg),
  ].forEach((text) => {
```

**Step 6: Update the Price History chart to use `avg_median`**

Find in `openRetailViewModal`:
```js
data: sorted.map((e) => e.average_price),
```
Change to:
```js
data: sorted.map((e) => e.avg_median),
```

Also update the label:
```js
label: "Avg Price (USD)",
```
Change to:
```js
label: "Avg Median (USD)",
```

**Step 7: Add 24h chart rendering + tab switching to `openRetailViewModal()`**

After the `if (typeof openModalById === "function") openModalById("retailViewModal");` line (the last line before the closing `};`), insert this block BEFORE the `openModalById` call:

```js
  // --- 24h intraday chart ---
  if (_retailViewIntradayChart) {
    _retailViewIntradayChart.destroy();
    _retailViewIntradayChart = null;
  }
  const intradayCanvas = safeGetElement("retailViewIntradayChart");
  const intradayPanel = safeGetElement("retailViewIntradayPanel");
  const intradayEmpty = safeGetElement("retailViewIntradayEmpty");
  const intraday = typeof retailIntradayData !== "undefined" ? retailIntradayData[slug] : null;
  const windows = intraday && Array.isArray(intraday.windows_24h) ? intraday.windows_24h : [];

  if (intradayCanvas instanceof HTMLCanvasElement) {
    if (windows.length >= 2 && typeof Chart !== "undefined") {
      intradayCanvas.style.display = "";
      if (intradayEmpty) intradayEmpty.style.display = "none";
      const timeLabels = windows.map((w) => {
        const d = new Date(w.window);
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      });
      _retailViewIntradayChart = new Chart(intradayCanvas, {
        type: "line",
        data: {
          labels: timeLabels,
          datasets: [
            {
              label: "Median",
              data: windows.map((w) => w.median),
              borderColor: "#3b82f6",
              backgroundColor: "transparent",
              pointRadius: 0,
              tension: 0.2,
            },
            {
              label: "Low",
              data: windows.map((w) => w.low),
              borderColor: "#22c55e",
              backgroundColor: "transparent",
              borderDash: [4, 2],
              pointRadius: 0,
              tension: 0.2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: "top" },
          },
          scales: {
            x: {
              ticks: {
                maxTicksLimit: 12,
                color: typeof getChartTextColor === "function" ? getChartTextColor() : undefined,
              },
            },
            y: {
              ticks: {
                color: typeof getChartTextColor === "function" ? getChartTextColor() : undefined,
                callback: (v) => `$${Number(v).toFixed(2)}`,
              },
            },
          },
        },
      });
    } else {
      intradayCanvas.style.display = "none";
      if (intradayEmpty) intradayEmpty.style.display = "";
    }
  }

  // --- Tab toggle ---
  const modalTabs = document.querySelectorAll("#retailViewModal .retail-view-tab");
  const histPanel = safeGetElement("retailViewHistoryPanel");
  modalTabs.forEach((tab) => {
    // Clone to remove old listeners before re-adding
    const fresh = tab.cloneNode(true);
    tab.parentNode.replaceChild(fresh, tab);
    fresh.addEventListener("click", () => {
      document.querySelectorAll("#retailViewModal .retail-view-tab").forEach((t) => t.classList.remove("retail-view-tab--active"));
      fresh.classList.add("retail-view-tab--active");
      const isHistory = fresh.dataset.retailTab === "history";
      if (histPanel) histPanel.style.display = isHistory ? "" : "none";
      if (intradayPanel) intradayPanel.style.display = isHistory ? "none" : "";
    });
  });
  // Reset to history tab on open
  if (histPanel) histPanel.style.display = "";
  if (intradayPanel) intradayPanel.style.display = "none";
  const histTabEl = document.querySelector("#retailViewModal [data-retail-tab='history']");
  if (histTabEl) histTabEl.classList.add("retail-view-tab--active");
  const intradayTabEl = document.querySelector("#retailViewModal [data-retail-tab='intraday']");
  if (intradayTabEl) intradayTabEl.classList.remove("retail-view-tab--active");
```

**Step 8: Update `closeRetailViewModal()` to destroy the 24h chart**

Find:
```js
const closeRetailViewModal = () => {
  if (_retailViewModalChart) {
    _retailViewModalChart.destroy();
    _retailViewModalChart = null;
  }
```

Add the intraday chart cleanup:
```js
  if (_retailViewIntradayChart) {
    _retailViewIntradayChart.destroy();
    _retailViewIntradayChart = null;
  }
```

**Step 9: Commit**

```bash
git add js/retail-view-modal.js index.html
git commit -m "feat(retail-view-modal): add 24h intraday chart tab, update data shapes"
```

---

### Task F6: Add CSS for new UI elements

**Files:**
- Modify: `css/styles.css`

**Step 1: Find the append point**

```bash
grep -n "retail-sparkline\|retail-vendor-details\|retail-conf-seg" css/styles.css | tail -5
```

Note the last line of the existing retail CSS section.

**Step 2: Append new styles after existing retail CSS**

Add after the last existing retail CSS rule:

```css
/* ---- Retail: view modal tab controls ---- */
.retail-view-tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border-color, #dee2e6);
  padding-bottom: 0.25rem;
}

.retail-view-tab {
  background: none;
  border: none;
  padding: 0.375rem 0.75rem;
  cursor: pointer;
  color: var(--text-muted, #6c757d);
  border-bottom: 2px solid transparent;
  font-size: 0.875rem;
  transition: color 0.15s, border-color 0.15s;
}

.retail-view-tab:hover {
  color: var(--text-primary, #212529);
}

.retail-view-tab--active {
  color: var(--primary, #0d6efd);
  border-bottom-color: var(--primary, #0d6efd);
  font-weight: 600;
}

/* ---- Retail: 24h intraday chart container ---- */
.retail-intraday-chart-wrap {
  position: relative;
  height: 200px;
  margin-bottom: 1rem;
}

.retail-intraday-chart-wrap canvas {
  width: 100% !important;
  height: 100% !important;
}

/* ---- Retail: sparkline today label ---- */
.retail-spark-label {
  font-size: 0.65rem;
  color: var(--text-muted, #6c757d);
  margin-right: 0.25rem;
  align-self: flex-end;
}
```

**Step 3: Verify**

```bash
grep -c "retail-view-tab" css/styles.css
# Should be > 0 (the new rules)
```

**Step 4: Commit**

```bash
git add css/styles.css
git commit -m "feat(retail): CSS for 24h intraday tab, chart container, and sparkline label"
```

---

### Task F7: Smoke test + verification

**Step 1: Start the local HTTP server**

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8765/index.html
# If not 200:
npx http-server . -p 8765 --silent &
sleep 1
```

**Step 2: Open the app and sync**

Open `http://localhost:8765/index.html`. Navigate to Settings → Market Prices. Click "Sync Now".

Expected:
- Status shows: `Fetched N coin(s) · window: 2026-02-20T...`
- Cards render with metal badges, confidence bars
- Cards show "Med" and "Low" labels (not "Avg")
- Data date in card footer shows window date

**Step 3: Console verification**

Open browser DevTools and check:

```js
retailIntradayData
// Expected: { ase: { window_start: "...", windows_24h: [...] }, ... }

retailPriceHistory
// Expected: { ase: [{ date: "...", avg_median: ..., avg_low: ..., vendors: {...} }, ...] }

retailPrices
// Expected: { lastSync: "...", window_start: "...", prices: { ase: { median_price, lowest_price, vendors: {...} } } }
```

**Step 4: Modal verification**

Click a "View" button on any coin card. Expected:
- Modal opens with [Price History] [24h Chart] tabs
- Price History tab: current prices table shows vendor rows with confidence bars; history table has "Avg Med" and "Avg Low" columns
- 24h Chart tab: if `windows_24h` has data, chart shows blue median line + green dashed low line; if empty, shows "No intraday data" message

**Step 5: Activity log market tab**

Click the log icon → Market tab. Expected:
- History table has "Avg Med" and "Avg Low" headers

**Step 6: Run smoke tests**

Verify browserless is running:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
# Expected: 200 or 404 (either means browserless is running)
```

Run tests:
```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npm test
# Expected: all specs pass (api-integrations.spec.js skipped — needs API keys)
```

**Step 7: Final commit**

```bash
git status
# If there are any leftover changes, stage and commit them
git add -p
git commit -m "fix(retail): post-verification cleanup"
```

---

## Backend Docker Rebuild (post-frontend)

After all frontend tasks are committed:

```bash
cd devops/firecrawl-docker
docker compose build retail-poller
docker compose up -d retail-poller
docker compose ps retail-poller
# Expected: State = Up
```

Manual test run:
```bash
docker compose exec retail-poller /app/run-local.sh
```

Verify API output in the data branch:
```bash
cat ~/staktrakr-data/data/api/manifest.json
cat ~/staktrakr-data/data/api/ase/latest.json | python3 -m json.tool | head -30
```

Verify `data/retail/` is gone:
```bash
ls ~/staktrakr-data/data/
# Expected: api/ directory only
```

Delete `data/retail/` from data branch (run from the data branch checkout):
```bash
cd ~/staktrakr-data
git rm -r data/retail/
git commit -m "chore: remove data/retail/ — SQLite+data/api/ is now the sole data store"
git push origin data
```

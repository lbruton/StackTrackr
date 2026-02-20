# Market Price Page — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Market Price settings panel that displays current retail bullion prices from
11 tracked coin slugs, with per-vendor breakdown and a history log tab.

**Architecture:** New `js/retail.js` handles fetch/storage/render; `js/retail-view-modal.js`
handles per-coin detail modal. Data is fetched from `api.staktrakr.com/data/retail/manifest.json`
then per-slug final JSON files. History is stored in localStorage and displayed as a sub-tab in
the existing Activity Log section. A manifest generation step is added to `merge-prices.js`.

**Tech Stack:** Vanilla JS, localStorage (via `saveDataSync`/`loadDataSync`), Chart.js (for
history chart in view modal), existing settings modal infrastructure.

**Design doc:** `docs/plans/2026-02-20-market-price-design.md`

**Codebase patterns to match:**
- DOM access: always `safeGetElement(id)`, never `document.getElementById()` (except init.js/about.js)
- localStorage: always `saveDataSync(KEY, val)` / `loadDataSync(KEY)` — never raw `localStorage`
- New localStorage keys must be in `ALLOWED_STORAGE_KEYS` in `js/constants.js`
- Settings sections: `switchSettingsSection(name)` shows `settingsPanel_${name}`, hides all others
- Log sub-tabs: `switchLogTab(key)` shows `logPanel_${key}`, dispatches via `LOG_TAB_RENDERERS`
- Script load order: new files inserted after `js/goldback.js`, before `js/api.js`
- New files must be added to `sw.js` CORE_ASSETS array

---

## Task 1: Add localStorage Constants

**Files:**
- Modify: `js/constants.js` (around line 470 for key definitions, line 697 for ALLOWED list)

**Context:** Two new keys are needed. `GOLDBACK_PRICES_KEY` and `GOLDBACK_PRICE_HISTORY_KEY` near
line 697 in `ALLOWED_STORAGE_KEYS` are the pattern to follow. Key definitions live around line 470
alongside `SPOT_HISTORY_KEY`.

**Step 1: Add key constant definitions**

In `js/constants.js`, after the `GOLDBACK_PRICE_HISTORY_KEY` line (search for it), add:

```js
/** @constant {string} RETAIL_PRICES_KEY - LocalStorage key for current retail price snapshot */
const RETAIL_PRICES_KEY = "retailPrices";

/** @constant {string} RETAIL_PRICE_HISTORY_KEY - LocalStorage key for retail price history */
const RETAIL_PRICE_HISTORY_KEY = "retailPriceHistory";
```

**Step 2: Add to ALLOWED_STORAGE_KEYS array**

In the `ALLOWED_STORAGE_KEYS` array (around line 697), after `GOLDBACK_PRICE_HISTORY_KEY`, add:

```js
  RETAIL_PRICES_KEY,
  RETAIL_PRICE_HISTORY_KEY,
```

**Step 3: Expose via window object**

Near the bottom of `js/constants.js`, in the `window.*` assignment block (search for
`window.GOLDBACK_PRICES_KEY`), add:

```js
window.RETAIL_PRICES_KEY = RETAIL_PRICES_KEY;
window.RETAIL_PRICE_HISTORY_KEY = RETAIL_PRICE_HISTORY_KEY;
```

**Step 4: Commit**

```bash
git add js/constants.js
git commit -m "feat(retail): add RETAIL_PRICES_KEY and RETAIL_PRICE_HISTORY_KEY constants"
```

---

## Task 2: Add Manifest Generation to merge-prices.js

**Files:**
- Modify: `devops/retail-poller/merge-prices.js` (insert before the closing `}` of `main()`,
  after line 324, before the `main().catch(...)` call)

**Context:** The `main()` function writes `{date}-final.json` files (line ~301) and
`{date}-vision-needed.json` (line ~319). We add manifest writing at the end of `main()`.
`DATA_DIR`, `dateStr`, `generatedAt`, and `providersJson` are already in scope. `writeFileSync`,
`readFileSync`, `existsSync`, `join` are already imported at the top.

**Step 1: Add manifest write block inside `main()` before its closing `}`**

Find this text in `merge-prices.js`:
```
  } else {
    log("Vision needed: 0 targets — firecrawl confidence is high across the board");
  }
}
```

Replace with:
```js
  } else {
    log("Vision needed: 0 targets — firecrawl confidence is high across the board");
  }

  // Write/update manifest.json — consumed by the StakTrakr app to discover latest data
  const manifestPath = join(DATA_DIR, "retail", "manifest.json");
  let manifest = { dates: [], slugs: Object.keys(providersJson) };
  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    } catch (_e) {
      warn("Could not parse existing manifest.json — rebuilding");
      manifest = { dates: [], slugs: Object.keys(providersJson) };
    }
  }
  if (!manifest.dates.includes(dateStr)) {
    manifest.dates.unshift(dateStr);
  }
  manifest.dates = [...new Set(manifest.dates)].sort((a, b) => b.localeCompare(a)).slice(0, 90);
  manifest.latestDate = manifest.dates[0] || dateStr;
  manifest.lastUpdated = generatedAt;
  manifest.slugs = Object.keys(providersJson);

  if (DRY_RUN) {
    log("[DRY RUN] manifest.json");
    console.log(JSON.stringify(manifest, null, 2));
  } else {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    log(`Wrote manifest.json (${manifest.dates.length} dates, latest: ${manifest.latestDate})`);
  }
}
```

**Step 2: Test locally with DRY_RUN**

```bash
cd /Volumes/DATA/GitHub/StakTrakr/devops/retail-poller
DRY_RUN=1 node merge-prices.js 2026-02-19
```

Expected: Log shows `[DRY RUN] manifest.json` and prints valid JSON with `dates`, `slugs`,
`latestDate`. No files should be written in dry-run mode.

**Step 3: Commit**

```bash
git add devops/retail-poller/merge-prices.js
git commit -m "feat(retail-poller): generate manifest.json after each merge run"
```

---

## Task 3: Create js/retail.js

**Files:**
- Create: `js/retail.js`

**Context:** Core retail price module. Mirrors `js/goldback.js` in structure: globals at top,
localStorage load/save functions, async fetch, render functions. `saveDataSync`/`loadDataSync`
are globals from `js/utils.js`. `RETAIL_PRICES_KEY`/`RETAIL_PRICE_HISTORY_KEY` from
`js/constants.js`. `sanitizeHtml` from `js/utils.js`. `safeGetElement` from `js/init.js`.
`debugLog` from `js/debug-log.js`.

All DOM text that comes from external data must go through `sanitizeHtml()`. Use
`element.textContent =` for plain text; `element.innerHTML =` only with sanitized strings
or fully controlled static HTML (no user/API data inserted raw).

Create `js/retail.js` with this content:

```js
// RETAIL MARKET PRICES
// =============================================================================

/** Base URL for retail price data */
const RETAIL_BASE_URL = "https://api.staktrakr.com/data/retail";

/** All tracked coin slugs, display order */
const RETAIL_SLUGS = [
  "ase", "maple-silver", "britannia-silver", "krugerrand-silver",
  "generic-silver-round", "generic-silver-bar-10oz",
  "age", "buffalo", "maple-gold", "krugerrand-gold", "ape",
];

/** Coin metadata keyed by slug */
const RETAIL_COIN_META = {
  "ase":                     { name: "American Silver Eagle",    weight: 1.0,  metal: "silver"   },
  "maple-silver":            { name: "Silver Maple Leaf",        weight: 1.0,  metal: "silver"   },
  "britannia-silver":        { name: "Silver Britannia",         weight: 1.0,  metal: "silver"   },
  "krugerrand-silver":       { name: "Silver Krugerrand",        weight: 1.0,  metal: "silver"   },
  "generic-silver-round":    { name: "Generic Silver Round",     weight: 1.0,  metal: "silver"   },
  "generic-silver-bar-10oz": { name: "Generic 10oz Silver Bar",  weight: 10.0, metal: "silver"   },
  "age":                     { name: "American Gold Eagle",      weight: 1.0,  metal: "gold"     },
  "buffalo":                 { name: "American Gold Buffalo",    weight: 1.0,  metal: "gold"     },
  "maple-gold":              { name: "Gold Maple Leaf",          weight: 1.0,  metal: "gold"     },
  "krugerrand-gold":         { name: "Gold Krugerrand",          weight: 1.0,  metal: "gold"     },
  "ape":                     { name: "Australian Platinum Eagle", weight: 1.0, metal: "platinum" },
};

/** Vendor display names */
const RETAIL_VENDOR_NAMES = {
  apmex:          "APMEX",
  monumentmetals: "Monument",
  sdbullion:      "SDB",
  jmbullion:      "JM",
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** @type {{lastSync: string, date: string, prices: Object}|null} */
let retailPrices = null;

/** @type {Object.<string, Array>} History keyed by slug */
let retailPriceHistory = {};

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const loadRetailPrices = () => {
  retailPrices = loadDataSync(RETAIL_PRICES_KEY) || null;
};

const saveRetailPrices = () => {
  saveDataSync(RETAIL_PRICES_KEY, retailPrices);
};

const loadRetailPriceHistory = () => {
  retailPriceHistory = loadDataSync(RETAIL_PRICE_HISTORY_KEY) || {};
};

const saveRetailPriceHistory = () => {
  saveDataSync(RETAIL_PRICE_HISTORY_KEY, retailPriceHistory);
};

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------

/**
 * Returns price history entries for one coin slug, newest first.
 * @param {string} slug
 * @returns {Array}
 */
const getRetailHistoryForSlug = (slug) => retailPriceHistory[slug] || [];

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

/**
 * Fetches manifest then all per-slug final JSON files in parallel.
 * Appends new entries to history (deduped by date). Saves to localStorage.
 * @returns {Promise<void>}
 */
const syncRetailPrices = async () => {
  const syncBtn = safeGetElement("retailSyncBtn");
  const syncStatus = safeGetElement("retailSyncStatus");

  syncBtn.disabled = true;
  syncBtn.textContent = "Syncing\u2026";
  syncStatus.textContent = "";

  try {
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
    results.forEach((r) => {
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

    renderRetailCards();
    syncStatus.textContent = `Updated ${fetchCount}/${RETAIL_SLUGS.length} coins \u00b7 ${targetDate}`;
  } catch (err) {
    debugLog(`[retail] Sync error: ${err.message}`, "warn");
    syncStatus.textContent = `Sync failed: ${err.message}`;
  } finally {
    syncBtn.disabled = false;
    syncBtn.textContent = "Sync Now";
  }
};

// ---------------------------------------------------------------------------
// Render - Settings Panel Cards
// ---------------------------------------------------------------------------

/**
 * Renders all coin price cards into #retailCardsGrid.
 * Called on market section open and after each sync.
 */
const renderRetailCards = () => {
  const grid = safeGetElement("retailCardsGrid");
  const lastSyncEl = safeGetElement("retailLastSync");

  if (retailPrices && retailPrices.lastSync) {
    const d = new Date(retailPrices.lastSync);
    lastSyncEl.textContent = `Last synced: ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } else {
    lastSyncEl.textContent = "Never synced";
  }

  grid.innerHTML = "";
  RETAIL_SLUGS.forEach((slug) => {
    const meta = RETAIL_COIN_META[slug];
    const priceData = retailPrices && retailPrices.prices ? retailPrices.prices[slug] || null : null;
    grid.appendChild(_buildRetailCard(slug, meta, priceData));
  });
};

/**
 * Builds a single coin price card element.
 * @param {string} slug
 * @param {{name:string, weight:number, metal:string}} meta
 * @param {Object|null} priceData
 * @returns {HTMLElement}
 */
const _buildRetailCard = (slug, meta, priceData) => {
  const card = document.createElement("div");
  card.className = "retail-price-card";
  card.dataset.slug = slug;

  const header = document.createElement("div");
  header.className = "retail-card-header";

  const nameSpan = document.createElement("span");
  nameSpan.className = "retail-coin-name";
  nameSpan.textContent = meta.name;

  const badge = document.createElement("span");
  badge.className = `retail-metal-badge retail-metal-${meta.metal}`;
  badge.textContent = meta.metal;

  header.appendChild(nameSpan);
  header.appendChild(badge);
  card.appendChild(header);

  const weightEl = document.createElement("div");
  weightEl.className = "retail-coin-weight";
  weightEl.textContent = `${meta.weight} troy oz`;
  card.appendChild(weightEl);

  if (!priceData) {
    const noData = document.createElement("div");
    noData.className = "retail-no-data";
    noData.textContent = "No data \u2014 click Sync";
    card.appendChild(noData);
  } else {
    const fmt = (v) => (v != null ? `$${Number(v).toFixed(2)}` : "\u2014");

    const summary = document.createElement("div");
    summary.className = "retail-summary-row";
    [["Avg", priceData.average_price], ["Med", priceData.median_price], ["Low", priceData.lowest_price]].forEach(([label, val]) => {
      const item = document.createElement("span");
      item.className = "retail-summary-item";
      const lbl = document.createElement("span");
      lbl.className = "retail-label";
      lbl.textContent = label;
      item.appendChild(lbl);
      item.appendChild(document.createTextNode(fmt(val)));
      summary.appendChild(item);
    });
    card.appendChild(summary);

    const vendors = document.createElement("div");
    vendors.className = "retail-vendors";
    Object.entries(RETAIL_VENDOR_NAMES).forEach(([key, label]) => {
      const price = priceData.prices_by_site && priceData.prices_by_site[key];
      const score = priceData.scores_by_site && priceData.scores_by_site[key];
      if (price == null) return;
      const row = document.createElement("div");
      row.className = "retail-vendor-row";

      const nameEl = document.createElement("span");
      nameEl.className = "retail-vendor-name";
      nameEl.textContent = label;

      const priceEl = document.createElement("span");
      priceEl.className = "retail-vendor-price";
      priceEl.textContent = fmt(price);

      const scoreEl = document.createElement("span");
      scoreEl.className = "retail-vendor-score";
      scoreEl.title = `Confidence: ${score != null ? score : "?"}`;
      scoreEl.textContent = _buildScoreDots(score);

      row.appendChild(nameEl);
      row.appendChild(priceEl);
      row.appendChild(scoreEl);
      vendors.appendChild(row);
    });
    card.appendChild(vendors);

    const footer = document.createElement("div");
    footer.className = "retail-card-footer";
    const dateSpan = document.createElement("span");
    dateSpan.className = "retail-data-date";
    dateSpan.textContent = `Data: ${retailPrices && retailPrices.date ? retailPrices.date : "\u2014"}`;
    footer.appendChild(dateSpan);
    card.appendChild(footer);
  }

  const histBtn = document.createElement("button");
  histBtn.className = "btn btn-secondary retail-history-btn";
  histBtn.type = "button";
  histBtn.dataset.slug = slug;
  histBtn.textContent = "History";
  card.appendChild(histBtn);

  return card;
};

/**
 * Returns 5-dot confidence indicator string.
 * @param {number|null} score - 0 to 100
 * @returns {string}
 */
const _buildScoreDots = (score) => {
  if (score == null) return "\u00b7\u00b7\u00b7\u00b7\u00b7";
  const filled = Math.min(5, Math.round((score / 100) * 5));
  return "\u25cf".repeat(filled) + "\u25cb".repeat(5 - filled);
};

// ---------------------------------------------------------------------------
// Render - History Table (Activity Log sub-tab)
// ---------------------------------------------------------------------------

/**
 * Renders the retail price history table in logPanel_market.
 * Called by switchLogTab('market') via LOG_TAB_RENDERERS.
 */
const renderRetailHistoryTable = () => {
  const select = safeGetElement("retailHistorySlugSelect");
  const tbody = safeGetElement("retailHistoryTableBody");

  if (select.options.length === 0) {
    RETAIL_SLUGS.forEach((slug) => {
      const meta = RETAIL_COIN_META[slug];
      const opt = document.createElement("option");
      opt.value = slug;
      opt.textContent = meta.name;
      select.appendChild(opt);
    });
  }

  const slug = select.value || RETAIL_SLUGS[0];
  const history = getRetailHistoryForSlug(slug);
  tbody.innerHTML = "";

  if (!history.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 8;
    td.className = "settings-subtext";
    td.style.textAlign = "center";
    td.textContent = "No history yet \u2014 sync from the Market Prices section.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  history.forEach((entry) => {
    const tr = document.createElement("tr");
    const fmt = (v) => (v != null ? `$${Number(v).toFixed(2)}` : "\u2014");
    const cells = [
      entry.date,
      fmt(entry.average_price),
      fmt(entry.median_price),
      fmt(entry.lowest_price),
      fmt(entry.prices_by_site && entry.prices_by_site.apmex),
      fmt(entry.prices_by_site && entry.prices_by_site.monumentmetals),
      fmt(entry.prices_by_site && entry.prices_by_site.sdbullion),
      fmt(entry.prices_by_site && entry.prices_by_site.jmbullion),
    ];
    cells.forEach((text) => {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
};

// ---------------------------------------------------------------------------
// Initializer
// ---------------------------------------------------------------------------

const initRetailPrices = () => {
  loadRetailPrices();
  loadRetailPriceHistory();
};

// ---------------------------------------------------------------------------
// Global exposure
// ---------------------------------------------------------------------------

window.retailPrices = retailPrices;
window.retailPriceHistory = retailPriceHistory;
window.syncRetailPrices = syncRetailPrices;
window.loadRetailPrices = loadRetailPrices;
window.saveRetailPrices = saveRetailPrices;
window.loadRetailPriceHistory = loadRetailPriceHistory;
window.saveRetailPriceHistory = saveRetailPriceHistory;
window.getRetailHistoryForSlug = getRetailHistoryForSlug;
window.renderRetailCards = renderRetailCards;
window.renderRetailHistoryTable = renderRetailHistoryTable;
window.initRetailPrices = initRetailPrices;
window.RETAIL_COIN_META = RETAIL_COIN_META;
window.RETAIL_SLUGS = RETAIL_SLUGS;
window.RETAIL_VENDOR_NAMES = RETAIL_VENDOR_NAMES;

// =============================================================================
```

**Step 1: Commit**

```bash
git add js/retail.js
git commit -m "feat(retail): add retail.js — fetch, storage, card render, history table"
```

---

## Task 4: Create js/retail-view-modal.js

**Files:**
- Create: `js/retail-view-modal.js`

**Context:** Opens a simple modal for per-coin detail. Re-uses existing modal infrastructure
(`openModalById`, `closeModalById` globals from `js/init.js`). Chart.js available globally
from `js/charts.js`. `retailPrices`, `getRetailHistoryForSlug`, `RETAIL_COIN_META`,
`RETAIL_VENDOR_NAMES` are globals from `js/retail.js` (loads before this file).

Create `js/retail-view-modal.js`:

```js
// RETAIL VIEW MODAL
// =============================================================================

let _retailViewModalChart = null;

/**
 * Opens the per-coin retail price detail modal.
 * @param {string} slug - Coin slug (e.g. "ase")
 */
const openRetailViewModal = (slug) => {
  const meta = RETAIL_COIN_META[slug];
  if (!meta) return;

  const titleEl = safeGetElement("retailViewModalTitle");
  const subtitleEl = safeGetElement("retailViewModalSubtitle");
  const currentTableBody = safeGetElement("retailViewCurrentTableBody");
  const historyTableBody = safeGetElement("retailViewHistoryTableBody");
  const chartCanvas = safeGetElement("retailViewChart");

  titleEl.textContent = meta.name;
  subtitleEl.textContent = `${meta.weight} troy oz \u00b7 ${meta.metal}`;

  // Current prices table
  const priceData = retailPrices && retailPrices.prices ? retailPrices.prices[slug] || null : null;
  currentTableBody.innerHTML = "";
  if (priceData) {
    Object.entries(RETAIL_VENDOR_NAMES).forEach(([key, label]) => {
      const price = priceData.prices_by_site && priceData.prices_by_site[key];
      const score = priceData.scores_by_site && priceData.scores_by_site[key];
      if (price == null) return;
      const tr = document.createElement("tr");

      const tdLabel = document.createElement("td");
      tdLabel.textContent = label;

      const tdPrice = document.createElement("td");
      tdPrice.textContent = `$${Number(price).toFixed(2)}`;

      const tdScore = document.createElement("td");
      tdScore.textContent = score != null ? String(score) : "\u2014";

      tr.appendChild(tdLabel);
      tr.appendChild(tdPrice);
      tr.appendChild(tdScore);
      currentTableBody.appendChild(tr);
    });
  } else {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.className = "settings-subtext";
    td.textContent = "No current data";
    tr.appendChild(td);
    currentTableBody.appendChild(tr);
  }

  // History table
  const history = getRetailHistoryForSlug(slug);
  historyTableBody.innerHTML = "";
  history.forEach((entry) => {
    const tr = document.createElement("tr");
    const fmt = (v) => (v != null ? `$${Number(v).toFixed(2)}` : "\u2014");
    [entry.date, fmt(entry.average_price), fmt(entry.median_price), fmt(entry.lowest_price)].forEach((text) => {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });
    historyTableBody.appendChild(tr);
  });

  // Chart
  if (_retailViewModalChart) {
    _retailViewModalChart.destroy();
    _retailViewModalChart = null;
  }
  if (history.length > 1 && chartCanvas && typeof Chart !== "undefined") {
    const sorted = [...history].reverse();
    _retailViewModalChart = new Chart(chartCanvas, {
      type: "line",
      data: {
        labels: sorted.map((e) => e.date),
        datasets: [{
          label: "Avg Price (USD)",
          data: sorted.map((e) => e.average_price),
          borderColor: "var(--accent-primary, #4a9eff)",
          backgroundColor: "transparent",
          pointRadius: 2,
          tension: 0.3,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { ticks: { callback: (v) => `$${v}` } } },
      },
    });
  }

  if (typeof openModalById === "function") openModalById("retailViewModal");
};

const closeRetailViewModal = () => {
  if (_retailViewModalChart) {
    _retailViewModalChart.destroy();
    _retailViewModalChart = null;
  }
  if (typeof closeModalById === "function") closeModalById("retailViewModal");
};

window.openRetailViewModal = openRetailViewModal;
window.closeRetailViewModal = closeRetailViewModal;

// =============================================================================
```

**Step 1: Commit**

```bash
git add js/retail-view-modal.js
git commit -m "feat(retail): add retail-view-modal.js — per-coin detail modal with chart"
```

---

## Task 5: Add HTML — Nav Button, Panel, Log Tab, View Modal

**Files:**
- Modify: `index.html` (four insertion points)

**Context:**
- Goldback nav button at line ~2014 — insert Market nav button immediately after it (before
  the Storage nav button).
- `settingsPanel_goldback` closing tag at line ~3492 — insert `settingsPanel_market` after it,
  before the `<!-- ===== ACTIVITY LOG` comment.
- Activity Log sub-tab bar at line ~3500 — add "Market" tab button after the "Cloud" tab button.
- `logPanel_cloud` closing `</div>` — add `logPanel_market` div after it.
- Before `</body>` — add the `retailViewModal` overlay.

**Step 1: Add Market nav button**

Find (in the `<nav class="settings-sidebar">` block):
```html
            <button class="settings-nav-item" data-section="storage">
```

Insert before it:
```html
            <button class="settings-nav-item" data-section="market">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="14" x2="21" y2="14"/></svg>
              Market
            </button>
```

**Step 2: Add `settingsPanel_market` after `settingsPanel_goldback` closing div**

Find:
```html
            <!-- ===== ACTIVITY LOG ===== -->
```

Insert before it:
```html
            <!-- ===== MARKET PRICES ===== -->
            <div class="settings-section-panel" id="settingsPanel_market" style="display: none">
              <h3>Market Prices</h3>
              <p class="settings-subtext">Current retail prices for common bullion coins from major dealers.</p>
              <div class="retail-sync-bar">
                <button class="btn" id="retailSyncBtn" type="button">Sync Now</button>
                <span class="settings-subtext" id="retailLastSync">Never synced</span>
                <span class="settings-subtext" id="retailSyncStatus" style="margin-left: auto;"></span>
              </div>
              <div class="retail-cards-grid" id="retailCardsGrid"></div>
            </div>

```

**Step 3: Add "Market" log sub-tab button**

Find:
```html
                <button class="settings-log-tab" data-log-tab="cloud" type="button">Cloud</button>
```

Insert after it:
```html
                <button class="settings-log-tab" data-log-tab="market" type="button">Market</button>
```

**Step 4: Add `logPanel_market` div**

Find the closing `</div>` of `logPanel_cloud` (search for `id="logPanel_cloud"`, then find
its matching `</div>`). Insert after it:

```html

              <!-- Market Price History panel -->
              <div class="settings-log-panel" id="logPanel_market" style="display: none">
                <p class="settings-subtext">Retail price history synced from bullion dealers.</p>
                <div class="settings-pricehistory-controls">
                  <select class="settings-filter-input" id="retailHistorySlugSelect"></select>
                </div>
                <div class="settings-changelog-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th><th>Avg</th><th>Median</th><th>Lowest</th>
                        <th>APMEX</th><th>Monument</th><th>SDB</th><th>JM</th>
                      </tr>
                    </thead>
                    <tbody id="retailHistoryTableBody"></tbody>
                  </table>
                </div>
              </div>
```

**Step 5: Add retailViewModal before `</body>`**

Find `</body>` and insert before it:

```html
  <!-- ===== RETAIL VIEW MODAL ===== -->
  <div class="modal-overlay" id="retailViewModal" style="display:none" role="dialog" aria-modal="true">
    <div class="modal-container" style="max-width: 600px">
      <div class="modal-header">
        <div>
          <h2 class="modal-title" id="retailViewModalTitle"></h2>
          <p class="modal-subtitle" id="retailViewModalSubtitle" style="margin:0;opacity:0.7;font-size:0.85rem"></p>
        </div>
        <button class="modal-close-btn" onclick="closeRetailViewModal()" type="button" aria-label="Close">&#x2715;</button>
      </div>
      <div class="modal-body">
        <h4 style="margin-top:0">Current Prices</h4>
        <table>
          <thead><tr><th>Dealer</th><th>Price</th><th>Confidence</th></tr></thead>
          <tbody id="retailViewCurrentTableBody"></tbody>
        </table>
        <h4>Price History</h4>
        <canvas id="retailViewChart" height="120" style="margin-bottom:1rem"></canvas>
        <div class="settings-changelog-wrap">
          <table>
            <thead><tr><th>Date</th><th>Avg</th><th>Median</th><th>Lowest</th></tr></thead>
            <tbody id="retailViewHistoryTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
```

**Step 6: Commit**

```bash
git add index.html
git commit -m "feat(retail): add market nav, settings panel, log tab, view modal HTML"
```

---

## Task 6: Wire settings.js and settings-listeners.js

**Files:**
- Modify: `js/settings.js`
- Modify: `js/settings-listeners.js`

**Context:**
- `switchSettingsSection()` at line ~87 has a pattern: check `targetName === 'storage'` and call
  `renderStorageSection()`. Mirror this for 'market'.
- `LOG_TAB_RENDERERS` at line ~145 maps sub-tab keys to global function names.
- `settings-listeners.js` wires event handlers. Find `setupSettingsEventListeners` or a similar
  exported function and add retail listeners there.

**Step 1: Add market section init in `js/settings.js`**

Find:
```js
  // Populate Storage section when switching to it
  if (targetName === 'storage' && typeof renderStorageSection === 'function') {
    renderStorageSection();
  }
};
```

Replace with:
```js
  // Populate Storage section when switching to it
  if (targetName === 'storage' && typeof renderStorageSection === 'function') {
    renderStorageSection();
  }

  // Populate Market Prices section when switching to it
  if (targetName === 'market' && typeof renderRetailCards === 'function') {
    renderRetailCards();
  }
};
```

**Step 2: Update JSDoc comment on `switchSettingsSection`**

On the `@param {string} name` line (around line 38), add 'market' to the list of valid keys.

**Step 3: Add to `LOG_TAB_RENDERERS` in `js/settings.js`**

Find:
```js
  cloud: 'renderCloudActivityTable',
};
```

Replace with:
```js
  cloud: 'renderCloudActivityTable',
  market: 'renderRetailHistoryTable',
};
```

**Step 4: Add listeners in `js/settings-listeners.js`**

Locate the function that wires settings event listeners (search for `setupSettingsEventListeners`
or `addEventListener` usage at the top level). Add these three listener registrations near the
other section-specific setups:

```js
// Retail sync button
safeGetElement("retailSyncBtn").addEventListener("click", () => {
  if (typeof syncRetailPrices === "function") syncRetailPrices();
});

// Retail card History button (event delegation on the grid)
safeGetElement("retailCardsGrid").addEventListener("click", (e) => {
  const btn = e.target.closest(".retail-history-btn");
  if (!btn) return;
  if (typeof openRetailViewModal === "function") openRetailViewModal(btn.dataset.slug);
});

// Retail history slug selector change
safeGetElement("retailHistorySlugSelect").addEventListener("change", () => {
  if (typeof renderRetailHistoryTable === "function") renderRetailHistoryTable();
});
```

**Step 5: Commit**

```bash
git add js/settings.js js/settings-listeners.js
git commit -m "feat(retail): wire settings section switch, log tab renderer, event listeners"
```

---

## Task 7: Add Script Tags and SW Cache Entries

**Files:**
- Modify: `index.html`
- Modify: `sw.js`

**Context:** New scripts must go after `js/goldback.js` in both files. In `index.html`,
the `<script defer>` tags are around line 4643. In `sw.js`, `CORE_ASSETS` has
`'./js/goldback.js'` at line ~52.

**Step 1: Update `index.html` script load order**

Find:
```html
    <script defer src="./js/goldback.js"></script>
    <script defer src="./js/api.js"></script>
```

Replace with:
```html
    <script defer src="./js/goldback.js"></script>
    <script defer src="./js/retail.js"></script>
    <script defer src="./js/retail-view-modal.js"></script>
    <script defer src="./js/api.js"></script>
```

**Step 2: Update `sw.js` CORE_ASSETS**

Find:
```js
  './js/goldback.js',
  './js/api.js',
```

Replace with:
```js
  './js/goldback.js',
  './js/retail.js',
  './js/retail-view-modal.js',
  './js/api.js',
```

**Step 3: Commit**

```bash
git add index.html sw.js
git commit -m "feat(retail): add retail scripts to load order and SW cache"
```

---

## Task 8: Init Hook and CSS

**Files:**
- Modify: `js/init.js`
- Modify: `css/styles.css`

**Context:** `init.js` calls feature initializers at startup. Search for `initGoldbackPrices`
to find the right location. CSS uses `var(--bg-card)`, `var(--border-color)`, `var(--text-primary)`,
`var(--accent-primary)` — no hardcoded colors.

**Step 1: Call `initRetailPrices` in `js/init.js`**

Find the line containing `initGoldbackPrices`. Insert after it:

```js
if (typeof initRetailPrices === 'function') initRetailPrices();
```

**Step 2: Add CSS to `css/styles.css`**

Find the Goldback CSS section in `styles.css` (search for a comment like `/* goldback */` or
`/* Goldback`). Add after that section:

```css
/* ── Retail Market Prices ─────────────────────────────────────────────── */
.retail-sync-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.retail-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.retail-price-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.retail-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.retail-coin-name { font-weight: 600; font-size: 0.95rem; }
.retail-coin-weight { font-size: 0.8rem; opacity: 0.65; }

.retail-metal-badge {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
  flex-shrink: 0;
}

.retail-metal-silver   { background: var(--bg-secondary, #eee); color: var(--text-secondary, #555); }
.retail-metal-gold     { background: rgba(184,134,11,0.13); color: #b8860b; }
.retail-metal-platinum { background: rgba(70,130,180,0.13); color: #4682b4; }

.retail-summary-row {
  display: flex;
  gap: 0.75rem;
  font-size: 0.9rem;
  padding: 0.25rem 0;
}

.retail-summary-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.retail-label {
  font-size: 0.7rem;
  opacity: 0.55;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.retail-vendors { display: flex; flex-direction: column; gap: 0.15rem; font-size: 0.82rem; }

.retail-vendor-row { display: flex; align-items: center; gap: 0.4rem; }
.retail-vendor-name  { flex: 0 0 60px; opacity: 0.75; }
.retail-vendor-price { flex: 0 0 60px; font-weight: 500; }
.retail-vendor-score { font-family: monospace; letter-spacing: -0.05em; font-size: 0.75rem; opacity: 0.6; }

.retail-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  opacity: 0.55;
  margin-top: auto;
  padding-top: 0.25rem;
}

.retail-no-data { font-size: 0.82rem; opacity: 0.55; font-style: italic; }

.retail-history-btn {
  font-size: 0.78rem;
  padding: 0.2rem 0.55rem;
  margin-top: 0.25rem;
  align-self: flex-end;
}
```

**Step 3: Commit**

```bash
git add js/init.js css/styles.css
git commit -m "feat(retail): init hook and CSS for market price cards"
```

---

## Task 9: Smoke Test

**Step 1: Open the app in a browser**

Open `index.html` via HTTP (e.g. `npx serve .` or your local dev server).

**Step 2: Open Settings and navigate to Market**

- Open Settings modal
- Click "Market" in the sidebar
- Verify: panel appears with "Never synced" and 11 empty cards showing "No data — click Sync"

**Step 3: Click Sync Now**

- Click the Sync Now button
- Verify: status updates to "Updated X/11 coins · YYYY-MM-DD"
- Verify: all reachable cards populate with price data

**Step 4: Test History button**

- Click "History" on any card
- Verify: view modal opens with current prices and (after first sync) one history entry

**Step 5: Test Activity Log Market tab**

- Navigate to Log section in Settings
- Click "Market" tab
- Verify: slug selector and history table appear with synced data

**Step 6: Commit any fixes, then final commit**

```bash
git add -p   # stage only intentional fixes
git commit -m "fix(retail): smoke test fixes"
```

---

## Task 10: Update Instruction Files

**Step 1: Run sync-instructions skill**

```
/sync-instructions
```

The skill will detect 2 new JS files (script count 54 → 56) and the new globals from
`retail.js` and `retail-view-modal.js`.

**Step 2: Commit**

```bash
git add AGENTS.md .github/copilot-instructions.md
git commit -m "docs: sync instruction files for retail market price feature"
```

---

## Completion

After all tasks pass, run `superpowers:finishing-a-development-branch` to create the PR.

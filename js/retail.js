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
  syncBtn.textContent = "Syncing…";
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
    syncStatus.textContent = `Updated ${fetchCount}/${RETAIL_SLUGS.length} coins · ${targetDate}`;
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
    noData.textContent = "No data — click Sync";
    card.appendChild(noData);
  } else {
    const fmt = (v) => (v != null ? `$${Number(v).toFixed(2)}` : "—");

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
    dateSpan.textContent = `Data: ${retailPrices && retailPrices.date ? retailPrices.date : "—"}`;
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
  if (score == null) return "·····";
  const filled = Math.min(5, Math.round((score / 100) * 5));
  return "●".repeat(filled) + "○".repeat(5 - filled);
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
    td.textContent = "No history yet — sync from the Market Prices section.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  history.forEach((entry) => {
    const tr = document.createElement("tr");
    const fmt = (v) => (v != null ? `$${Number(v).toFixed(2)}` : "—");
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

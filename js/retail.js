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
  "ape":                     { name: "American Platinum Eagle",   weight: 1.0, metal: "platinum" },
};

/** Vendor display names */
const RETAIL_VENDOR_NAMES = {
  apmex:          "APMEX",
  monumentmetals: "Monument",
  sdbullion:      "SDB",
  jmbullion:      "JM",
};

/**
 * Formats a price value as USD string, or "—" if null/undefined.
 * Retail prices are USD source data — display in USD regardless of user currency setting.
 * @param {number|null|undefined} v
 * @returns {string}
 */
const _fmtRetailPrice = (v) => (v != null ? `$${Number(v).toFixed(2)}` : "\u2014");

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** @type {{lastSync: string, date: string, prices: Object}|null} */
let retailPrices = null;

/** @type {Object.<string, Array>} History keyed by slug */
let retailPriceHistory = {};

/** True while syncRetailPrices() is running — triggers skeleton render */
let _retailSyncInProgress = false;

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const loadRetailPrices = () => {
  try {
    retailPrices = loadDataSync(RETAIL_PRICES_KEY) || null;
  } catch (err) {
    console.error("[retail] Failed to load retail prices:", err);
    retailPrices = null;
  }
};

const saveRetailPrices = () => {
  try {
    saveDataSync(RETAIL_PRICES_KEY, retailPrices);
  } catch (err) {
    console.error("[retail] Failed to save retail prices:", err);
  }
};

const loadRetailPriceHistory = () => {
  try {
    retailPriceHistory = loadDataSync(RETAIL_PRICE_HISTORY_KEY) || {};
  } catch (err) {
    console.error("[retail] Failed to load retail price history:", err);
    retailPriceHistory = {};
  }
};

const saveRetailPriceHistory = () => {
  try {
    saveDataSync(RETAIL_PRICE_HISTORY_KEY, retailPriceHistory);
  } catch (err) {
    console.error("[retail] Failed to save retail price history:", err);
  }
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
  _retailSyncInProgress = true;
  renderRetailCards();

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

    _retailSyncInProgress = false;
    renderRetailCards();
    syncStatus.textContent = `Updated ${fetchCount}/${RETAIL_SLUGS.length} coins · ${targetDate}`;
  } catch (err) {
    debugLog(`[retail] Sync error: ${err.message}`, "warn");
    syncStatus.textContent = `Sync failed: ${err.message}`;
  } finally {
    _retailSyncInProgress = false;
    syncBtn.disabled = false;
    syncBtn.textContent = "Sync Now";
  }
};

// ---------------------------------------------------------------------------
// Render - Settings Panel Cards
// ---------------------------------------------------------------------------

/**
 * Renders all coin price cards into #retailCardsGrid.
/**
 * Builds a shimmer skeleton placeholder card for the loading state.
 * @returns {HTMLElement}
 */
const _buildSkeletonCard = () => {
  const card = document.createElement("div");
  card.className = "retail-price-card retail-price-card--skeleton";
  [
    "retail-skel retail-skel--title",
    "retail-skel retail-skel--stats",
    "retail-skel retail-skel--vendors",
  ].forEach((cls) => {
    const el = document.createElement("div");
    el.className = cls;
    card.appendChild(el);
  });
  return card;
};

/**
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
  if (_retailSyncInProgress) {
    RETAIL_SLUGS.forEach(() => grid.appendChild(_buildSkeletonCard()));
    return;
  }
  RETAIL_SLUGS.forEach((slug) => {
    const meta = RETAIL_COIN_META[slug];
    const priceData = retailPrices && retailPrices.prices ? retailPrices.prices[slug] || null : null;
    grid.appendChild(_buildRetailCard(slug, meta, priceData));
  });
};

/** Metal emoji icons keyed by metal name */
const RETAIL_METAL_EMOJI = { gold: "🥇", silver: "🥈", platinum: "🔷", palladium: "⬜" };
/**
 * Computes price trend vs. the previous history entry.
 * @param {string} slug
 * @returns {{ dir: 'up'|'down'|'flat', pct: string }|null} null if insufficient history
 */
const _computeRetailTrend = (slug) => {
  const history = retailPriceHistory[slug];
  if (!history || history.length < 2) return null;
  const latest = Number(history[0].average_price);
  const prev   = Number(history[1].average_price);
  if (!isFinite(latest) || !isFinite(prev) || prev === 0) return null;
  const change = ((latest - prev) / prev) * 100;
  const pct = Math.abs(change).toFixed(1);
  if (change > 0.2) return { dir: "up", pct };
  if (change < -0.2) return { dir: "down", pct };
  return { dir: "flat", pct: "0.0" };
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
  badge.className = `retail-metal-badge retail-metal-badge--${meta.metal}`;
  const _emoji = RETAIL_METAL_EMOJI[meta.metal];
  badge.textContent = _emoji ? `${_emoji} ${meta.metal}` : meta.metal;

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
    const summary = document.createElement("div");
    summary.className = "retail-summary-row";
    [["Avg", priceData.average_price], ["Med", priceData.median_price], ["Low", priceData.lowest_price]].forEach(([label, val]) => {
      const item = document.createElement("span");
      item.className = "retail-summary-item";
      const lbl = document.createElement("span");
      lbl.className = "retail-label";
      lbl.textContent = label;
      const valSpan = document.createElement("span");
      valSpan.className = "retail-summary-value";
      valSpan.textContent = _fmtRetailPrice(val);
      item.appendChild(lbl);
      item.appendChild(valSpan);
      summary.appendChild(item);
    });
    card.appendChild(summary);

    const trend = _computeRetailTrend(slug);
    if (trend) {
      const trendEl = document.createElement("span");
      const arrow = { up: "\u2191", down: "\u2193", flat: "\u2192" }[trend.dir];
      const sign  = trend.dir === "up" ? "+" : trend.dir === "down" ? "-" : "";
      trendEl.className = `retail-trend retail-trend--${trend.dir}`;
      trendEl.textContent = `${arrow} ${sign}${trend.pct}%`;
      card.appendChild(trendEl);
    }

    const vendorDetails = document.createElement("details");
    vendorDetails.className = "retail-vendor-details";

    const vendorSummary = document.createElement("summary");
    vendorSummary.className = "retail-vendor-summary";
    vendorDetails.appendChild(vendorSummary);

    const vendors = document.createElement("div");
    vendors.className = "retail-vendors";

    const _availPrices = Object.values(priceData.prices_by_site || {}).filter((p) => p != null);
    const _lowestPrice = _availPrices.length ? Math.min(..._availPrices) : null;
    Object.entries(RETAIL_VENDOR_NAMES).forEach(([key, label]) => {
      const price = (priceData.prices_by_site || {})[key];
      const score = priceData.scores_by_site && priceData.scores_by_site[key];
      if (price == null) return;
      const row = document.createElement("div");
      row.className = "retail-vendor-row";
      if (_lowestPrice !== null && Math.abs(price - _lowestPrice) < 0.001) {
        row.classList.add("retail-vendor-row--best");
      }

      const nameEl = document.createElement("span");
      nameEl.className = "retail-vendor-name";
      nameEl.textContent = label;

      const priceEl = document.createElement("span");
      priceEl.className = "retail-vendor-price";
      priceEl.textContent = _fmtRetailPrice(price);

      const scoreEl = _buildConfidenceBar(score);

      row.appendChild(nameEl);
      row.appendChild(priceEl);
      row.appendChild(scoreEl);
      vendors.appendChild(row);
    });

    const count = vendors.children.length;
    vendorSummary.textContent = `${count} vendor${count !== 1 ? "s" : ""}`;
    vendorDetails.appendChild(vendors);
    card.appendChild(vendorDetails);

    const footer = document.createElement("div");
    footer.className = "retail-card-footer";
    const dateSpan = document.createElement("span");
    dateSpan.className = "retail-data-date";
    dateSpan.textContent = `Data: ${retailPrices && retailPrices.date ? retailPrices.date : "—"}`;
    footer.appendChild(dateSpan);
    card.appendChild(footer);
  }

  const btnRow = document.createElement("div");
  btnRow.className = "retail-card-btn-row";

  const viewBtn = document.createElement("button");
  viewBtn.className = "btn btn-sm btn-outline-primary retail-view-btn";
  viewBtn.type = "button";
  viewBtn.dataset.retailViewSlug = slug;
  viewBtn.textContent = "View";
  btnRow.appendChild(viewBtn);

  const histBtn = document.createElement("button");
  histBtn.className = "btn btn-sm btn-secondary retail-history-btn";
  histBtn.type = "button";
  histBtn.dataset.retailHistorySlug = slug;
  histBtn.textContent = "History";
  btnRow.appendChild(histBtn);

  card.appendChild(btnRow);

  return card;
};

/**
 * Builds a 5-segment colored confidence bar element.
 * @param {number|null} score - 0 to 100
 * @returns {HTMLElement}
 */
const _buildConfidenceBar = (score) => {
  const filled = score != null ? Math.min(5, Math.round((score / 100) * 5)) : 0;
  const tier = filled <= 2 ? "low" : filled === 3 ? "mid" : "high";
  const wrap = document.createElement("div");
  wrap.className = `retail-conf-bar retail-conf-bar--${tier}`;
  wrap.title = `Confidence: ${score != null ? `${score}/100` : "unknown"}`;
  for (let i = 0; i < 5; i++) {
    const seg = document.createElement("span");
    seg.className = `retail-conf-seg${i < filled ? " retail-conf-seg--fill" : ""}`;
    wrap.appendChild(seg);
  }
  return wrap;
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

  const slug = select.value || RETAIL_SLUGS[0];
  const allHistory = getRetailHistoryForSlug(slug);

  const tfBtn = document.querySelector("#logPanel_market [data-retail-timeframe].active");
  const days = tfBtn ? tfBtn.dataset.retailTimeframe : "7";
  const history = days === "all" ? allHistory : (() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days, 10));
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return allHistory.filter((entry) => entry.date >= cutoffStr);
  })();
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

if (typeof window !== "undefined") {
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
}

// =============================================================================

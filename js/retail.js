// RETAIL MARKET PRICES
// =============================================================================

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
  apmex:            "APMEX",
  monumentmetals:   "Monument",
  sdbullion:        "SDB",
  jmbullion:        "JM",
  herobullion:      "Hero",
  bullionexchanges: "BullionX",
  summitmetals:     "Summit",
};

/** Vendor homepage URLs for popup links */
const RETAIL_VENDOR_URLS = {
  apmex:            "https://www.apmex.com",
  monumentmetals:   "https://www.monumentmetals.com",
  sdbullion:        "https://www.sdbullion.com",
  jmbullion:        "https://www.jmbullion.com",
  herobullion:      "https://www.herobullion.com",
  bullionexchanges: "https://www.bullionexchanges.com",
  summitmetals:     "https://www.summitmetals.com",
};

/** Per-vendor brand colors — shared with retail-view-modal.js for chart lines and card labels */
const RETAIL_VENDOR_COLORS = {
  apmex:            "#3b82f6",  // blue
  jmbullion:        "#f59e0b",  // amber
  sdbullion:        "#10b981",  // emerald
  monumentmetals:   "#a78bfa",  // violet
  herobullion:      "#f87171",  // red
  bullionexchanges: "#ec4899",  // pink
  summitmetals:     "#06b6d4",  // cyan
};

/**
 * Formats a price value as USD string, or "—" if null/undefined.
 * Retail prices are USD source data — display in USD regardless of user currency setting.
 * @param {number|null|undefined} v
 * @returns {string}
 */
const _fmtRetailPrice = (v) => (v != null ? `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "\u2014");

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** @type {{lastSync: string, window_start: string|null, prices: Object}|null} */
let retailPrices = null;

/** @type {Object.<string, Array>} History keyed by slug */
let retailPriceHistory = {};

/** @type {Object.<string, {window_start: string, windows_24h: Array}>} Intraday 15-min window data keyed by slug */
let retailIntradayData = {};

/**
 * Per-slug, per-vendor product page URLs fetched from providers.json.
 * Shape: { "ase": { "apmex": "https://...", "monumentmetals": "https://..." }, ... }
 * @type {Object.<string, Object.<string, string>>|null}
 */
let retailProviders = null;

/** @type {Object.<string, Object.<string, boolean>>} Out-of-stock status by slug and vendorId */
let retailAvailability = {};

/** @type {Object.<string, Object.<string, number>>} Last known prices by slug and vendorId */
let retailLastKnownPrices = {};

/** @type {Object.<string, Object.<string, string>>} Last available dates by slug and vendorId */
let retailLastAvailableDates = {};

/** True while syncRetailPrices() is running — triggers skeleton render */
let _retailSyncInProgress = false;

/** Active sparkline Chart instances keyed by slug — destroyed before re-render to prevent Canvas reuse errors */
const _retailSparklines = new Map();

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const _handleSaveError = (label, err) => {
  const msg = `Failed to save ${label}: ${err.message}. Your browser storage may be full.`;
  debugLog(`[retail] ${msg}`, "error");
  if (typeof showAppAlert === "function") showAppAlert(msg, "Storage Error");
  if (typeof window !== "undefined") window._retailStorageFailure = true;
};

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
    _handleSaveError("retail prices", err);
  }
};

const loadRetailPriceHistory = () => {
  try {
    const loaded = loadDataSync(RETAIL_PRICE_HISTORY_KEY);
    // Guard: stored value must be a plain object; arrays (corrupt/legacy data) are discarded.
    retailPriceHistory = (loaded && !Array.isArray(loaded) && typeof loaded === "object") ? loaded : {};
  } catch (err) {
    console.error("[retail] Failed to load retail price history:", err);
    retailPriceHistory = {};
  }
  // Re-export so window.retailPriceHistory reflects the new reference after reassignment.
  if (typeof window !== "undefined") window.retailPriceHistory = retailPriceHistory;
};

const saveRetailPriceHistory = () => {
  try {
    saveDataSync(RETAIL_PRICE_HISTORY_KEY, retailPriceHistory);
  } catch (err) {
    _handleSaveError("retail price history", err);
  }
};

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
  // STAK-300: cap windows_24h to last 96 entries per slug (24h of 15-min data)
  // to prevent localStorage quota overflow on large collections
  const pruned = {};
  for (const [slug, entry] of Object.entries(retailIntradayData)) {
    if (entry && Array.isArray(entry.windows_24h)) {
      pruned[slug] = { ...entry, windows_24h: entry.windows_24h.slice(-96) };
    } else {
      pruned[slug] = entry;
    }
  }
  retailIntradayData = pruned;
  try {
    saveDataSync(RETAIL_INTRADAY_KEY, retailIntradayData);
  } catch (err) {
    _handleSaveError("retail intraday data", err);
  }
};

// Max sync log entries kept in localStorage
const RETAIL_SYNC_LOG_MAX = 50;

/**
 * Appends one entry to the retail sync log and persists it.
 * @param {{success: boolean, coins: number, window: string|null, error: string|null}} entry
 */
const _appendSyncLogEntry = (entry) => {
  try {
    const existing = loadDataSync(RETAIL_SYNC_LOG_KEY) || [];
    const log = Array.isArray(existing) ? existing : [];
    log.push({ ts: new Date().toISOString(), ...entry });
    if (log.length > RETAIL_SYNC_LOG_MAX) log.splice(0, log.length - RETAIL_SYNC_LOG_MAX);
    saveDataSync(RETAIL_SYNC_LOG_KEY, log);
  } catch (err) {
    debugLog(`[retail] Failed to save sync log: ${err.message}`, "warn");
  }
};

const loadRetailProviders = () => {
  try {
    const loaded = loadDataSync(RETAIL_PROVIDERS_KEY, null);
    retailProviders = (loaded && typeof loaded === "object" && !Array.isArray(loaded)) ? loaded : null;
  } catch (err) {
    console.error("[retail] Failed to load retail providers:", err);
    retailProviders = null;
  }
  // Re-export so window.retailProviders reflects the new reference after reassignment.
  if (typeof window !== "undefined") window.retailProviders = retailProviders;
};

const saveRetailProviders = () => {
  try {
    saveDataSync(RETAIL_PROVIDERS_KEY, retailProviders);
  } catch (err) {
    _handleSaveError("retail providers", err);
  }
};

const loadRetailAvailability = () => {
  try {
    const loaded = loadDataSync(RETAIL_AVAILABILITY_KEY, null);
    if (loaded && typeof loaded === "object" && !Array.isArray(loaded)) {
      retailAvailability = loaded.availability || {};
      retailLastKnownPrices = loaded.lastKnownPrices || {};
      retailLastAvailableDates = loaded.lastAvailableDates || {};
    } else {
      retailAvailability = {};
      retailLastKnownPrices = {};
      retailLastAvailableDates = {};
    }
  } catch (err) {
    console.error("[retail] Failed to load retail availability:", err);
    retailAvailability = {};
    retailLastKnownPrices = {};
    retailLastAvailableDates = {};
  }
  if (typeof window !== "undefined") {
    window.retailAvailability = retailAvailability;
    window.retailLastKnownPrices = retailLastKnownPrices;
    window.retailLastAvailableDates = retailLastAvailableDates;
  }
};

const saveRetailAvailability = () => {
  try {
    const data = {
      availability: retailAvailability,
      lastKnownPrices: retailLastKnownPrices,
      lastAvailableDates: retailLastAvailableDates,
      date: new Date().toISOString().slice(0, 10),
    };
    saveDataSync(RETAIL_AVAILABILITY_KEY, data);
  } catch (err) {
    _handleSaveError("retail availability", err);
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

/** Last API base URL that returned a valid manifest — used by retail-view-modal.js */
let _lastSuccessfulApiBase = typeof RETAIL_API_ENDPOINTS !== "undefined" ? RETAIL_API_ENDPOINTS[0] : "https://api.staktrakr.com/data/api";

/**
 * Fetch manifest.json from configured endpoints in order (primary first).
 * Tries each endpoint with a 5-second timeout; returns on the first success.
 * @returns {Promise<Array<{base: string, manifest: Object, ts: string}> | null>}
 */
async function _pickFreshestEndpoint() {
  const endpoints = typeof RETAIL_API_ENDPOINTS !== "undefined" ? RETAIL_API_ENDPOINTS : [RETAIL_API_BASE_URL];
  for (const base of endpoints) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const resp = await fetch(`${base}/manifest.json`, { signal: controller.signal }).finally(() => clearTimeout(timeoutId));
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const manifest = await resp.json();
      return [{ base, manifest, ts: manifest.generated_at || "" }];
    } catch {
      // try next endpoint
    }
  }
  return null;
}

const _processSlugResult = (slug, latest, hist30) => {
  const result = {
    slug,
    hasLatest: false,
    price: null,
    intraday: null,
    availabilityBySite: null,
    lastKnownPriceBySite: null,
    lastAvailableDateBySite: null,
    history30: Array.isArray(hist30) ? hist30 : null,
  };

  if (!latest) return result;

  result.hasLatest = true;
  result.price = {
    median_price: latest.median_price,
    lowest_price: latest.lowest_price,
    vendors: latest.vendors || {},
  };
  result.intraday = {
    window_start: latest.window_start,
    windows_24h: Array.isArray(latest.windows_24h) ? latest.windows_24h : [],
  };
  result.availabilityBySite = latest.availability_by_site || null;
  result.lastKnownPriceBySite = latest.last_known_price_by_site || null;
  result.lastAvailableDateBySite = latest.last_available_date_by_site || null;

  return result;
};

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

/**
 * Fetches manifest then all per-slug latest.json and history-30d.json from the
 * REST API. Updates retailPrices (current snapshot), retailPriceHistory (daily),
 * and retailIntradayData (15-min windows). Saves all three to localStorage.
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
    syncBtn.textContent = "Syncing…";
    syncStatus.textContent = "";
  }
  _retailSyncInProgress = true;
  renderRetailCards();

  try {
    // Multi-endpoint: race all configured APIs, pick freshest manifest
    let apiBase, manifest;
    const ranked = await _pickFreshestEndpoint();
    if (ranked) {
      apiBase = ranked[0].base;
      manifest = ranked[0].manifest;
      _lastSuccessfulApiBase = apiBase;
      window._lastSuccessfulApiBase = apiBase;
      debugLog(`[retail] Using ${apiBase} (generated: ${ranked[0].ts}, ${ranked.length} endpoint(s) reachable)`, "info");
    } else {
      debugLog("[retail] All endpoints unreachable, using fallback slug list", "warn");
      apiBase = RETAIL_API_ENDPOINTS[0];
      manifest = { slugs: RETAIL_SLUGS, latest_window: null };
    }
    const slugs = Array.isArray(manifest.slugs) && manifest.slugs.length ? manifest.slugs : RETAIL_SLUGS;

    // Fetch providers.json (product page URLs for each coin+vendor)
    try {
      const providersResp = await fetch(`${apiBase}/providers.json`);
      if (providersResp.ok) {
        retailProviders = await providersResp.json();
        saveRetailProviders();
        debugLog(`[retail] Loaded ${Object.keys(retailProviders || {}).length} coin provider mappings`, "info");
      } else {
        debugLog(`[retail] Providers fetch returned HTTP ${providersResp.status} — using fallback URLs`, "warn");
      }
    } catch (providersErr) {
      debugLog(`[retail] Providers fetch failed (${providersErr.message}) — using homepage fallback URLs`, "warn");
    }

    const results = await Promise.allSettled(
      slugs.map(async (slug) => {
        const [latestResp, histResp] = await Promise.all([
          fetch(`${apiBase}/${slug}/latest.json`),
          fetch(`${apiBase}/${slug}/history-30d.json`),
        ]);
        const latest = latestResp.ok ? await latestResp.json() : null;
        const hist30 = histResp.ok ? await histResp.json() : null;
        return { slug, latest, hist30 };
      })
    );

    let successCount = 0;
    const newPrices = {};

    results.forEach((r) => {
      if (r.status !== "fulfilled") {
        debugLog(`[retail] Slug fetch failed: ${r.reason?.message || r.reason}`, "warn");
        return;
      }
      const { slug, latest, hist30 } = r.value;
      const processed = _processSlugResult(slug, latest, hist30);

      if (processed.hasLatest) {
        newPrices[slug] = processed.price;
        retailIntradayData[slug] = processed.intraday;
        // Update availability data
        if (processed.availabilityBySite) {
          if (!retailAvailability[slug]) retailAvailability[slug] = {};
          Object.assign(retailAvailability[slug], processed.availabilityBySite);
        }
        if (processed.lastKnownPriceBySite) {
          if (!retailLastKnownPrices[slug]) retailLastKnownPrices[slug] = {};
          Object.assign(retailLastKnownPrices[slug], processed.lastKnownPriceBySite);
        }
        if (processed.lastAvailableDateBySite) {
          if (!retailLastAvailableDates[slug]) retailLastAvailableDates[slug] = {};
          Object.assign(retailLastAvailableDates[slug], processed.lastAvailableDateBySite);
        }
        successCount++;
      }

      if (processed.history30) {
        retailPriceHistory[slug] = processed.history30;
      }
    });

    if (successCount > 0) {
      retailPrices = {
        lastSync: new Date().toISOString(),
        window_start: manifest.latest_window || null,
        prices: newPrices,
      };
    }

    // Check if all fetches failed
    if (successCount === 0 && slugs.length > 0) {
      const errorMsg = "All coin price fetches failed — check your network connection.";
      debugLog(`[retail] ${errorMsg}`, "error");
      if (ui) syncStatus.textContent = errorMsg;
      _appendSyncLogEntry({ success: false, coins: 0, window: null, error: errorMsg });
      return;
    }

    if (successCount > 0) {
      saveRetailPrices();
      saveRetailPriceHistory();
      saveRetailIntradayData();
      saveRetailAvailability();
    }

    const statusMsg = `Synced ${successCount} coin(s) · ${manifest.latest_window || "unknown window"}`;
    if (ui) syncStatus.textContent = statusMsg;
    debugLog(`[retail] Sync complete: ${statusMsg}`, "info");
    _appendSyncLogEntry({ success: true, coins: successCount, window: manifest.latest_window || null, error: null });
  } catch (err) {
    debugLog(`[retail] Sync error: ${err.message}`, "warn");
    if (ui) syncStatus.textContent = `Sync failed: ${err.message}`;
    _appendSyncLogEntry({ success: false, coins: 0, window: null, error: err.message });
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

// ---------------------------------------------------------------------------
// Render - Settings Panel Cards
// ---------------------------------------------------------------------------

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
 * Renders a 15-min intraday sparkline on a card's canvas (last 48 windows = 12h).
 * Falls back to 7-day daily history if no intraday data is available.
 * Destroys any prior Chart instance first to prevent Canvas reuse errors.
 * @param {string} slug
 */
const _renderRetailSparkline = (slug) => {
  const canvas = safeGetElement(`retail-spark-${slug}`);
  if (!(canvas instanceof HTMLCanvasElement) || typeof Chart === "undefined") return;
  const intraday = retailIntradayData[slug];
  let data;
  if (intraday && Array.isArray(intraday.windows_24h) && intraday.windows_24h.length >= 2) {
    data = intraday.windows_24h.slice(-48).map((w) => Number(w.median)).filter((v) => isFinite(v));
  } else {
    // Fallback: 7-day daily history
    data = (retailPriceHistory[slug] || []).slice(0, 7).reverse()
      .map((e) => Number(e.avg_median ?? e.average_price)).filter((v) => isFinite(v));
  }
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

/** Called on market section open and after each sync. */
const renderRetailCards = () => {
  const grid = safeGetElement("retailCardsGrid");
  const lastSyncEl = safeGetElement("retailLastSync");
  const disclaimer = safeGetElement("retailDisclaimer");

  if (retailPrices && retailPrices.lastSync) {
    const d = new Date(retailPrices.lastSync);
    lastSyncEl.textContent = `Last synced: ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } else {
    lastSyncEl.textContent = "Never synced";
  }

  grid.innerHTML = "";
  if (_retailSyncInProgress) {
    disclaimer.style.display = "";
    safeGetElement("retailEmptyState").style.display = "none";
    RETAIL_SLUGS.forEach(() => grid.appendChild(_buildSkeletonCard()));
    return;
  }

  const emptyState = safeGetElement("retailEmptyState");
  const hasData = retailPrices && retailPrices.prices && Object.keys(retailPrices.prices).length > 0;
  emptyState.style.display = hasData ? "none" : "";
  disclaimer.style.display = hasData ? "" : "none";
  if (!hasData) return;

  RETAIL_SLUGS.forEach((slug) => {
    const meta = RETAIL_COIN_META[slug];
    const priceData = retailPrices && retailPrices.prices ? retailPrices.prices[slug] || null : null;
    grid.appendChild(_buildRetailCard(slug, meta, priceData));
  });
  RETAIL_SLUGS.forEach((slug) => _renderRetailSparkline(slug));
};

/** Metal emoji icons keyed by metal name */
const RETAIL_METAL_EMOJI = { gold: "🟡", silver: "⚪", platinum: "🔷", palladium: "⬜" };
/**
 * Computes price trend vs. the previous history entry.
 * @param {string} slug
 * @returns {{ dir: 'up'|'down'|'flat', pct: string }|null} null if insufficient history
 */
const _computeRetailTrend = (slug) => {
  const history = retailPriceHistory[slug];
  if (!history || history.length < 2) return null;
  const latest = Number(history[0].avg_median);
  const prev   = Number(history[1].avg_median);
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
  const emoji = RETAIL_METAL_EMOJI[meta.metal];
  const metalLabel = meta.metal === "platinum" ? "PLAT" : meta.metal.toUpperCase();
  badge.textContent = emoji ? `${emoji} ${metalLabel}` : metalLabel;

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
    [["Med", priceData.median_price], ["Low", priceData.lowest_price]].forEach(([label, val]) => {
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

    // Add trend chip to the right side of the summary row
    const trend = _computeRetailTrend(slug);
    if (trend) {
      const trendEl = document.createElement("span");
      const arrow = { up: "\u2191", down: "\u2193", flat: "\u2192" }[trend.dir];
      const sign  = trend.dir === "up" ? "+" : trend.dir === "down" ? "-" : "";
      trendEl.className = `retail-trend retail-trend--${trend.dir}`;
      trendEl.textContent = `${arrow} ${sign}${trend.pct}%`;
      summary.appendChild(trendEl);
    }

    card.appendChild(summary);

    const vendorDetails = document.createElement("div");
    vendorDetails.className = "retail-vendor-details";

    const vendors = document.createElement("div");
    vendors.className = "retail-vendors";

    const vendorMap = priceData.vendors || {};
    const availability = retailAvailability[slug] || {};
    const lastKnownPrices = retailLastKnownPrices[slug] || {};
    const lastKnownDates = retailLastAvailableDates[slug] || {};

    // Build list of all vendors (in-stock and OOS)
    const allVendorKeys = new Set([
      ...Object.keys(vendorMap),
      ...Object.keys(availability),
    ]);

    // Sort: high-confidence in-stock vendors (≥60) by price asc, then low-confidence, then OOS vendors
    const sortedVendorEntries = Array.from(allVendorKeys)
      .map((key) => {
        const vendorData = vendorMap[key];
        const isAvailable = availability[key] !== false; // default true if not specified
        const price = vendorData ? vendorData.price : null;
        const score = vendorData ? vendorData.confidence : null;
        const label = RETAIL_VENDOR_NAMES[key] || key;
        return { key, label, price, score, isAvailable };
      })
      .filter(({ price, isAvailable }) => price != null || !isAvailable) // show if has price OR is OOS
      .sort((a, b) => {
        // OOS vendors always go last
        if (!a.isAvailable && b.isAvailable) return 1;
        if (a.isAvailable && !b.isAvailable) return -1;
        if (!a.isAvailable && !b.isAvailable) return 0; // both OOS, maintain order
        // Both in-stock: sort by confidence and price
        const aHigh = a.score != null && a.score >= 60;
        const bHigh = b.score != null && b.score >= 60;
        if (aHigh && bHigh) return a.price - b.price;
        if (aHigh) return -1;
        if (bHigh) return 1;
        return 0;
      });

    // Award medals to top 3 high-confidence (≥60%) in-stock vendors by price
    const qualifyingVendors = sortedVendorEntries
      .filter(({ isAvailable, score }) => isAvailable && score != null && score >= 60);
    const top3 = qualifyingVendors.slice(0, 3).map(({ key }) => key);
    const medals = { 0: "🥇", 1: "🥈", 2: "🥉" };

    sortedVendorEntries.forEach(({ key, label, price, score, isAvailable }) => {
      if (!isAvailable) {
        // Render out-of-stock vendor
        const oosRow = _buildOOSVendorRow(key, lastKnownPrices[key], lastKnownDates[key]);
        vendors.appendChild(oosRow);
        return;
      }

      // Render in-stock vendor (existing logic)
      const row = document.createElement("div");
      row.className = "retail-vendor-row";
      const medalIndex = top3.indexOf(key);
      if (medalIndex !== -1) {
        row.classList.add(`retail-vendor-row--medal-${medalIndex + 1}`);
      }

      const nameEl = document.createElement("span");
      nameEl.className = "retail-vendor-name";
      const vendorColor = RETAIL_VENDOR_COLORS[key] || null;
      // Prefer specific product page from providers.json; fall back to vendor homepage
      const vendorUrl = (retailProviders && retailProviders[slug] && retailProviders[slug][key])
        || RETAIL_VENDOR_URLS[key];
      if (vendorUrl) {
        const link = document.createElement("a");
        link.href = "#";
        link.textContent = label;
        link.className = "retail-vendor-link";
        if (vendorColor) link.style.color = vendorColor;
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const popup = window.open(vendorUrl, `retail_vendor_${key}`, "width=1250,height=800,scrollbars=yes,resizable=yes,toolbar=no,location=no,menubar=no,status=no");
          if (!popup) window.open(vendorUrl, "_blank");
        });
        nameEl.appendChild(link);
      } else {
        nameEl.textContent = label;
        if (vendorColor) nameEl.style.color = vendorColor;
      }

      const priceEl = document.createElement("span");
      priceEl.className = "retail-vendor-price";
      priceEl.textContent = _fmtRetailPrice(price);

      const scoreEl = _buildConfidenceBar(score);

      row.appendChild(nameEl);
      row.appendChild(priceEl);
      row.appendChild(scoreEl);
      vendors.appendChild(row);
    });

    vendorDetails.appendChild(vendors);
    card.appendChild(vendorDetails);

    const footer = document.createElement("div");
    footer.className = "retail-card-footer";
    const dateSpan = document.createElement("span");
    dateSpan.className = "retail-data-date";
    dateSpan.textContent = retailPrices && retailPrices.window_start ? "today" : "—";
    footer.appendChild(dateSpan);
    const sparkCanvas = document.createElement("canvas");
    sparkCanvas.id = `retail-spark-${slug}`;
    sparkCanvas.className = "retail-sparkline";
    sparkCanvas.width = 80;
    sparkCanvas.height = 28;
    footer.appendChild(sparkCanvas);
    card.appendChild(footer);
  }

  const btnRow = document.createElement("div");
  btnRow.className = "retail-card-btn-row";

  const viewBtn = document.createElement("button");
  viewBtn.className = "retail-card-action retail-view-btn";
  viewBtn.type = "button";
  viewBtn.dataset.retailViewSlug = slug;
  viewBtn.textContent = "View";
  btnRow.appendChild(viewBtn);

  const histBtn = document.createElement("button");
  histBtn.className = "retail-card-action retail-history-btn";
  histBtn.type = "button";
  histBtn.dataset.retailHistorySlug = slug;
  histBtn.textContent = "History";
  btnRow.appendChild(histBtn);

  card.appendChild(btnRow);

  return card;
};

/**
 * Builds a compact confidence percentage chip.
 * @param {number|null} score - 0 to 100
 * @returns {HTMLElement}
 */
const _buildConfidenceBar = (score) => {
  const chip = document.createElement("span");
  const tier = (score == null) ? "low" : score >= 60 ? "high" : score >= 40 ? "mid" : "low";
  chip.className = `retail-conf-chip retail-conf-chip--${tier}`;
  chip.textContent = score != null ? `${Math.round(score)}%` : "?";
  chip.title = `Confidence: ${score != null ? `${Math.round(score)}/100` : "unknown"}`;
  return chip;
};

/**
 * Builds a grayed-out vendor row for out-of-stock items.
 * @param {string} vendorId - Vendor key (e.g., "apmex")
 * @param {number|null} lastKnownPrice - Last known price before going OOS
 * @param {string|null} lastAvailableDate - Last date item was in stock (YYYY-MM-DD)
 * @returns {HTMLElement}
 */
const _buildOOSVendorRow = (vendorId, lastKnownPrice, lastAvailableDate) => {
  const row = document.createElement("div");
  row.className = "retail-vendor-row retail-vendor-row--out-of-stock";

  const nameEl = document.createElement("span");
  nameEl.className = "retail-vendor-name text-muted";
  const vendorLabel = RETAIL_VENDOR_NAMES[vendorId] || vendorId;
  nameEl.textContent = vendorLabel;

  const priceEl = document.createElement("span");
  priceEl.className = "retail-vendor-price";

  const priceText = document.createElement("del");
  priceText.textContent = lastKnownPrice ? _fmtRetailPrice(lastKnownPrice) : "\u2014";
  priceEl.appendChild(priceText);

  const oosLabel = document.createElement("small");
  oosLabel.className = "text-danger ms-1";
  oosLabel.textContent = "OOS";
  oosLabel.title = "Out of stock";
  priceEl.appendChild(oosLabel);

  const badgeEl = document.createElement("span");
  badgeEl.className = "retail-conf-chip badge-muted";
  badgeEl.textContent = "\u2014";

  const tooltipText = lastAvailableDate
    ? `Out of stock (last seen: ${priceText.textContent} on ${lastAvailableDate})`
    : "Out of stock";
  row.title = tooltipText;

  row.appendChild(nameEl);
  row.appendChild(priceEl);
  row.appendChild(badgeEl);

  return row;
};

// ---------------------------------------------------------------------------
// Render - History Table (Activity Log sub-tab)
// ---------------------------------------------------------------------------

/**
 * Renders the retail price history table in logPanel_market.
 * Called by switchLogTab('market') via LOG_TAB_RENDERERS.
 */
const renderRetailHistoryTable = () => {
  // Sync log section — rendered at top of Market tab
  const syncLogContainer = safeGetElement("retailSyncLogContainer");
  while (syncLogContainer.firstChild) syncLogContainer.removeChild(syncLogContainer.firstChild);
  try {
    const rawLog = loadDataSync(RETAIL_SYNC_LOG_KEY);
    const syncLog = Array.isArray(rawLog) ? rawLog : [];
    const recent = syncLog.slice(-10).reverse();

    const heading = document.createElement("p");
    heading.className = "retail-history-label";
    heading.style.cssText = "font-weight:600;margin:0 0 0.4rem;";
    heading.textContent = "Recent Syncs";
    syncLogContainer.appendChild(heading);

    if (recent.length === 0) {
      const msg = document.createElement("p");
      msg.className = "settings-subtext";
      msg.style.marginBottom = "0.75rem";
      msg.textContent = "No sync events yet — waiting for first background poll.";
      syncLogContainer.appendChild(msg);
    } else {
      const wrap = document.createElement("div");
      wrap.className = "retail-history-table-wrap";
      wrap.style.marginBottom = "1rem";
      const table = document.createElement("table");
      table.className = "retail-history-table";
      const thead = document.createElement("thead");
      const hrow = document.createElement("tr");
      ["Time", "Status", "Coins", "Window (UTC)"].forEach((label) => {
        const th = document.createElement("th");
        th.textContent = label;
        hrow.appendChild(th);
      });
      thead.appendChild(hrow);
      table.appendChild(thead);
      const tbody2 = document.createElement("tbody");
      recent.forEach((entry) => {
        const tr = document.createElement("tr");
        const ts = entry.ts ? new Date(entry.ts) : null;
        const timeStr = (ts && !isNaN(ts))
          ? `${ts.toLocaleDateString()} ${ts.getHours().toString().padStart(2, "0")}:${ts.getMinutes().toString().padStart(2, "0")}`
          : "--";
        const windowStr = (() => {
          if (!entry.window) return "\u2014";
          const wd = new Date(entry.window);
          if (isNaN(wd)) return "\u2014";
          return `${wd.getUTCHours().toString().padStart(2, "0")}:${wd.getUTCMinutes().toString().padStart(2, "0")}`;
        })();
        [timeStr, entry.success ? "\u2705 OK" : "\u274C Failed", entry.success ? String(entry.coins) : "\u2014", windowStr].forEach((text) => {
          const td = document.createElement("td");
          td.textContent = text;
          tr.appendChild(td);
        });
        tbody2.appendChild(tr);
      });
      table.appendChild(tbody2);
      wrap.appendChild(table);
      syncLogContainer.appendChild(wrap);
    }
  } catch (err) {
    debugLog(`[retail] Failed to render sync log: ${err.message}`, "warn");
  }

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
    td.colSpan = 7;
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
      _fmtRetailPrice(entry.avg_median),
      _fmtRetailPrice(entry.avg_low),
      _fmtRetailPrice(entry.vendors && entry.vendors.apmex && entry.vendors.apmex.avg),
      _fmtRetailPrice(entry.vendors && entry.vendors.monumentmetals && entry.vendors.monumentmetals.avg),
      _fmtRetailPrice(entry.vendors && entry.vendors.sdbullion && entry.vendors.sdbullion.avg),
      _fmtRetailPrice(entry.vendors && entry.vendors.jmbullion && entry.vendors.jmbullion.avg),
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
  loadRetailIntradayData();
  loadRetailProviders();
  loadRetailAvailability();
};
// ---------------------------------------------------------------------------
// Background Auto-Sync
// ---------------------------------------------------------------------------

/** Interval ID for the periodic background sync — stored to allow future cancellation */
let _retailSyncIntervalId = null;

/** How stale (ms) data must be before a background sync is triggered on startup */
const RETAIL_STALE_MS = 60 * 60 * 1000; // 1 hour

/** How often (ms) to re-sync in the background while the page is open */
const RETAIL_POLL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes (poller cron runs every 30 min)

/**
 * Starts the background retail price auto-sync.
 * Immediately syncs if data is absent or stale, then re-syncs on a periodic interval.
 * Safe to call multiple times — only one interval is kept running.
 * Called from init.js after initRetailPrices().
 */
const startRetailBackgroundSync = () => {
  // Clear any previous interval (safe to call multiple times)
  if (_retailSyncIntervalId !== null) {
    clearInterval(_retailSyncIntervalId);
    _retailSyncIntervalId = null;
  }

  const _runSilentSync = () => {
    syncRetailPrices({ ui: false }).catch((err) => {
      debugLog(`[retail] Background sync failed: ${err.message}`, "warn");
    });
  };

  // Sync immediately if no data, data is stale, or providers.json hasn't been fetched yet
  const lastSync = retailPrices && retailPrices.lastSync ? new Date(retailPrices.lastSync).getTime() : 0;
  const isStale = Date.now() - lastSync > RETAIL_STALE_MS;
  const missingProviders = !retailProviders || Object.keys(retailProviders).length === 0;
  if (isStale || missingProviders) {
    debugLog(`[retail] Background sync triggered (stale=${isStale}, missingProviders=${missingProviders})`, "info");
    _runSilentSync();
  }

  // Set up periodic re-sync while the page is open
  _retailSyncIntervalId = setInterval(_runSilentSync, RETAIL_POLL_INTERVAL_MS);
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
  window.startRetailBackgroundSync = startRetailBackgroundSync;
  window.retailProviders = retailProviders;
  window.loadRetailProviders = loadRetailProviders;
  window.saveRetailProviders = saveRetailProviders;
  window.retailIntradayData = retailIntradayData;
  window.loadRetailIntradayData = loadRetailIntradayData;
  window.saveRetailIntradayData = saveRetailIntradayData;
  window.RETAIL_COIN_META = RETAIL_COIN_META;
  window.RETAIL_SLUGS = RETAIL_SLUGS;
  window.RETAIL_VENDOR_NAMES = RETAIL_VENDOR_NAMES;
  window.RETAIL_VENDOR_URLS = RETAIL_VENDOR_URLS;
  window.RETAIL_VENDOR_COLORS = RETAIL_VENDOR_COLORS;
  window._buildConfidenceBar = _buildConfidenceBar;
  window.retailAvailability = retailAvailability;
  window.retailLastKnownPrices = retailLastKnownPrices;
  window.retailLastAvailableDates = retailLastAvailableDates;
  window.loadRetailAvailability = loadRetailAvailability;
  window.saveRetailAvailability = saveRetailAvailability;
  window._lastSuccessfulApiBase = _lastSuccessfulApiBase;
}

// =============================================================================

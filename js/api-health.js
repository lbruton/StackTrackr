// API HEALTH CHECK
// =============================================================================
// Three independent freshness checks:
//   Market prices  — manifest.json       — stale after 15 min
//   Spot prices    — spot-history-YYYY   — stale after 75 min
//   Goldback       — goldback-spot.json  — stale after 25 hr (daily scrape)

const API_HEALTH_MARKET_STALE_MIN   = 15;
const API_HEALTH_SPOT_STALE_MIN     = 75;
const API_HEALTH_GOLDBACK_STALE_MIN = 25 * 60; // 25 hours in minutes

/**
 * Returns a compact relative time string ("8m ago", "2h ago", "1d ago").
 * Mirrors the logic in cloud-sync.js _syncRelativeTime.
 * @param {string|Date} timestamp
 * @returns {string}
 */
const _timeAgo = (timestamp) => {
  if (!timestamp) return "unknown";
  const ageMs = Date.now() - new Date(timestamp).getTime();
  if (isNaN(ageMs) || ageMs < 0) return "just now";
  const minutes = Math.floor(ageMs / 60000);
  const hours   = Math.floor(ageMs / 3600000);
  const days    = Math.floor(ageMs / 86400000);
  if (days > 0)    return `${days}d ago`;
  if (hours > 0)   return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
};

/**
 * Fetches all three API feeds in parallel and returns a combined health result.
 * Each feed resolves independently — a failure in one does not block the others.
 * @returns {Promise<{market: object, spot: object, goldback: object}>}
 */
const fetchApiHealth = async () => {
  const base = (typeof RETAIL_API_BASE_URL !== "undefined")
    ? RETAIL_API_BASE_URL
    : "https://api.staktrakr.com/data/api";
  const dataBase = base.replace(/\/api$/, "");
  const year = new Date().getFullYear();

  const _fetchWithTimeout = (url, ms = 10000) => {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { cache: "no-store", signal: ctrl.signal })
      .then((r) => { clearTimeout(tid); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .catch((e) => { clearTimeout(tid); throw e; });
  };

  const [marketResult, spotResult, goldbackResult] = await Promise.allSettled([
    _fetchWithTimeout(`${base}/manifest.json`),
    _fetchWithTimeout(`${dataBase}/spot-history-${year}.json`),
    _fetchWithTimeout(`${base}/goldback-spot.json`),
  ]);

  // --- Market prices (manifest.json) ---
  let market = { ok: false, ageMin: null, ago: null, coins: [], error: null };
  if (marketResult.status === "fulfilled") {
    const data = marketResult.value;
    const generatedAt = new Date(data.generated_at);
    if (!isNaN(generatedAt.getTime())) {
      market.ageMin = Math.max(0, Math.floor((Date.now() - generatedAt.getTime()) / 60000));
      market.ago    = _timeAgo(data.generated_at);
      market.ok     = market.ageMin <= API_HEALTH_MARKET_STALE_MIN;
      market.coins  = data.coins || [];
    } else {
      market.error = `Invalid timestamp: ${data.generated_at}`;
    }
  } else {
    market.error = marketResult.reason?.message || String(marketResult.reason);
  }

  // --- Spot prices (spot-history-YYYY.json, last entry) ---
  let spot = { ok: false, ageMin: null, ago: null, error: null };
  if (spotResult.status === "fulfilled") {
    const entries = spotResult.value;
    const last    = Array.isArray(entries) && entries[entries.length - 1];
    const ts      = last && last.timestamp;
    if (ts) {
      spot.ageMin = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 60000));
      spot.ago    = _timeAgo(ts);
      spot.ok     = spot.ageMin <= API_HEALTH_SPOT_STALE_MIN;
    } else {
      spot.error = "No entries found";
    }
  } else {
    spot.error = spotResult.reason?.message || String(spotResult.reason);
  }

  // --- Goldback daily scrape (informational only — does not affect overall status) ---
  let goldback = { ok: false, ago: null, error: null };
  if (goldbackResult.status === "fulfilled") {
    const data     = goldbackResult.value;
    const scrapedAt = new Date(data.scraped_at);
    if (data.scraped_at && !isNaN(scrapedAt.getTime())) {
      const ageMin    = Math.max(0, Math.floor((Date.now() - scrapedAt.getTime()) / 60000));
      goldback.ago    = _timeAgo(data.scraped_at);
      goldback.ok     = ageMin <= API_HEALTH_GOLDBACK_STALE_MIN;
    } else if (data.scraped_at) {
      goldback.error = `Invalid timestamp: ${data.scraped_at}`;
    } else {
      goldback.error = "No scraped_at field";
    }
  } else {
    goldback.error = goldbackResult.reason?.message || String(goldbackResult.reason);
  }

  return { market, spot, goldback };
};

/**
 * Updates both health badge elements with a compact per-feed summary.
 * Badge reflects market + spot only (goldback is informational).
 * @param {{market: object, spot: object, goldback: object}} health
 */
const updateHealthBadges = (health) => {
  const { market, spot } = health;
  const allOk = market.ok && spot.ok;
  const icon  = allOk ? "✅" : "⚠️";

  const marketPart = market.error ? "Market ❌" : `Market ${market.ago ?? "?"}`;
  const spotPart   = spot.error   ? "Spot ❌"   : `Spot ${spot.ago ?? "?"}`;

  const label = `${icon} ${marketPart} · ${spotPart}`;
  ["apiHealthBadge", "apiHealthBadgeAbout"].forEach((id) => {
    const el = safeGetElement(id);
    if (el) el.textContent = label;
  });
};

/**
 * Populates the health detail modal table with fetched data.
 * @param {{market: object, spot: object, goldback: object}} health
 */
const populateApiHealthModal = (health) => {
  const { market, spot, goldback } = health;
  const allOk = market.ok && spot.ok;

  const statusEl   = safeGetElement("apiHealthStatus");
  const marketEl   = safeGetElement("apiHealthMarket");
  const spotEl     = safeGetElement("apiHealthSpot");
  const goldbackEl = safeGetElement("apiHealthGoldback");
  const coinsEl    = safeGetElement("apiHealthCoins");
  const verdictEl  = safeGetElement("apiHealthVerdict");

  if (statusEl) statusEl.textContent = allOk ? "✅ Healthy" : "⚠️ Check feeds";

  if (marketEl) {
    marketEl.textContent = market.error
      ? `❌ ${market.error}`
      : market.ok
        ? `✅ ${market.ago}`
        : `⚠️ ${market.ago} — stale (>${API_HEALTH_MARKET_STALE_MIN}m)`;
  }

  if (spotEl) {
    spotEl.textContent = spot.error
      ? `❌ ${spot.error}`
      : spot.ok
        ? `✅ ${spot.ago}`
        : `⚠️ ${spot.ago} — stale (>${API_HEALTH_SPOT_STALE_MIN}m)`;
  }

  if (goldbackEl) {
    goldbackEl.textContent = goldback.error
      ? `❌ ${goldback.error}`
      : goldback.ok
        ? `✅ ${goldback.ago}`
        : `⚠️ ${goldback.ago} — missed scrape?`;
  }

  if (coinsEl) {
    coinsEl.textContent = market.coins.length ? `${market.coins.length} coins tracked` : "—";
  }

  if (verdictEl) {
    if (market.error || spot.error) {
      verdictEl.textContent = "One or more feeds unreachable — check Fly.io dashboard.";
    } else if (!market.ok && !spot.ok) {
      verdictEl.textContent = "Both market and spot feeds are stale — poller may be down.";
    } else if (!market.ok) {
      verdictEl.textContent = `Market feed is stale (>${API_HEALTH_MARKET_STALE_MIN} min). Spot prices are current.`;
    } else if (!spot.ok) {
      verdictEl.textContent = `Spot feed is stale (>${API_HEALTH_SPOT_STALE_MIN} min). Market prices are current.`;
    } else {
      verdictEl.textContent = "All feeds are current. Poller is healthy.";
    }
  }
};

/**
 * Populates the health detail modal with an error state.
 * @param {Error} err
 */
const populateApiHealthModalError = (err) => {
  const statusEl  = safeGetElement("apiHealthStatus");
  const verdictEl = safeGetElement("apiHealthVerdict");
  if (statusEl)  statusEl.textContent  = "❌ Unreachable";
  if (verdictEl) verdictEl.textContent = `Could not reach API: ${err.message}`;
  ["apiHealthMarket", "apiHealthSpot", "apiHealthGoldback", "apiHealthCoins"].forEach((id) => {
    const el = safeGetElement(id);
    if (el) el.textContent = "—";
  });
  ["apiHealthBadge", "apiHealthBadgeAbout"].forEach((id) => {
    const el = safeGetElement(id);
    if (el) el.textContent = "❌ API ?";
  });
};

// Cached result so the modal reflects the same data as the badge
let _lastHealth = null;

/**
 * Sets modal fields to a loading/checking placeholder state.
 */
const _setModalLoading = () => {
  const statusEl  = safeGetElement("apiHealthStatus");
  const verdictEl = safeGetElement("apiHealthVerdict");
  if (statusEl)  statusEl.textContent  = "⏳ Checking…";
  if (verdictEl) verdictEl.textContent = "Fetching status…";
};

/**
 * Opens the API health modal, populating it if data already loaded.
 */
const showApiHealthModal = () => {
  if (_lastHealth) {
    populateApiHealthModal(_lastHealth);
  } else {
    _setModalLoading();
  }
  if (window.openModalById) window.openModalById("apiHealthModal");
};

/**
 * Hides the API health modal.
 */
const hideApiHealthModal = () => {
  if (window.closeModalById) window.closeModalById("apiHealthModal");
};

// Guard to ensure the keydown listener is registered only once
let _keydownRegistered = false;

/**
 * Sets up event listeners for the health modal.
 * Uses document.getElementById directly — safeGetElement lives in init.js
 * which loads after this file in the defer queue.
 */
const setupApiHealthModalEvents = () => {
  const closeBtn = document.getElementById("apiHealthCloseBtn");
  const modal    = document.getElementById("apiHealthModal");
  if (closeBtn) closeBtn.addEventListener("click", hideApiHealthModal);
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) hideApiHealthModal();
    });
  }
  if (!_keydownRegistered) {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideApiHealthModal();
    });
    _keydownRegistered = true;
  }
};

/**
 * Main entry point — fetches health data and wires up the UI.
 * If the modal is already open when the fetch resolves (user opened it while
 * data was in-flight), populate it immediately rather than leaving it on
 * the "Checking…" placeholder.
 */
const initApiHealth = async () => {
  setupApiHealthModalEvents();
  try {
    const health = await fetchApiHealth();
    _lastHealth  = health;
    updateHealthBadges(health);
    // If the modal is open, push the result in now rather than leaving placeholder text.
    // Use getElementById directly — safeGetElement returns a dummy whose style.display
    // is always undefined (never "none"), which would make this guard always true.
    const modal = document.getElementById("apiHealthModal");
    if (modal && modal.style.display !== "none") {
      populateApiHealthModal(health);
    }
  } catch (err) {
    console.warn("API health check failed:", err);
    _lastHealth = null; // clear stale data so modal shows error state, not old green result
    populateApiHealthModalError(err);
  }
};

// Expose globally for other modules and onclick handlers
if (typeof window !== "undefined") {
  window.showApiHealthModal = showApiHealthModal;
  window.hideApiHealthModal = hideApiHealthModal;
  window.initApiHealth      = initApiHealth;
}

// initApiHealth() is called by init.js after safeGetElement and all DOM setup
// are complete. Do NOT auto-init here — init.js (script #64) runs after this
// file (script #56) in the defer queue, so safeGetElement is not yet defined.

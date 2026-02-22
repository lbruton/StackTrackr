// API HEALTH CHECK
// =============================================================================

const API_HEALTH_STALE_MINUTES = 300; // 5 hours — matches GitHub Action STALE_SECONDS

/**
 * Fetches manifest.json and returns parsed health data.
 * @returns {Promise<{generatedAt: Date, ageMinutes: number, coins: string[], isStale: boolean}>}
 */
const fetchApiHealth = async () => {
  const base = (typeof RETAIL_API_BASE_URL !== "undefined")
    ? RETAIL_API_BASE_URL
    : "https://api.staktrakr.com/data/api";
  // Health check uses primary endpoint only — freshness-racing via RETAIL_API_ENDPOINTS is for data fetches
  const res = await fetch(`${base}/manifest.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const generatedAt = new Date(data.generated_at);
  if (isNaN(generatedAt.getTime())) {
    throw new Error(`Invalid generated_at: ${data.generated_at}`);
  }
  const ageMinutes = Math.max(0, Math.floor((Date.now() - generatedAt.getTime()) / 60000));
  return {
    generatedAt,
    ageMinutes,
    coins: data.coins || [],
    isStale: ageMinutes > API_HEALTH_STALE_MINUTES,
  };
};

/**
 * Updates both health badge elements with current status.
 * @param {{isStale: boolean, ageMinutes: number}} health
 */
const updateHealthBadges = (health) => {
  const label = health.isStale
    ? `❌ API ${health.ageMinutes}m old`
    : `✅ API ${health.ageMinutes}m old`;
  ["apiHealthBadge", "apiHealthBadgeAbout"].forEach((id) => {
    const el = safeGetElement(id);
    if (el) el.textContent = label;
  });
};

/**
 * Populates the health detail modal with fetched data.
 * @param {{generatedAt: Date, ageMinutes: number, coins: string[], isStale: boolean}} health
 */
const populateApiHealthModal = (health) => {
  const statusEl = safeGetElement("apiHealthStatus");
  const generatedEl = safeGetElement("apiHealthGeneratedAt");
  const ageEl = safeGetElement("apiHealthAge");
  const coinsEl = safeGetElement("apiHealthCoins");
  const verdictEl = safeGetElement("apiHealthVerdict");

  if (statusEl) statusEl.textContent = health.isStale ? "❌ Stale" : "✅ Fresh";
  if (generatedEl) generatedEl.textContent = health.generatedAt.toLocaleString();
  if (ageEl) ageEl.textContent = `${health.ageMinutes} min`;
  if (coinsEl) coinsEl.textContent = `${health.coins.length} coins tracked`;
  if (verdictEl) {
    verdictEl.textContent = health.isStale
      ? `Data is over ${API_HEALTH_STALE_MINUTES} minutes old — poller may be down.`
      : `Data is current. Poller is healthy.`;
  }
};

/**
 * Populates the health detail modal with an error state.
 * @param {Error} err
 */
const populateApiHealthModalError = (err) => {
  const statusEl = safeGetElement("apiHealthStatus");
  const verdictEl = safeGetElement("apiHealthVerdict");
  if (statusEl) statusEl.textContent = "❌ Unreachable";
  if (verdictEl) verdictEl.textContent = `Could not reach API: ${err.message}`;
  const generatedEl = safeGetElement("apiHealthGeneratedAt");
  const ageEl = safeGetElement("apiHealthAge");
  const coinsEl = safeGetElement("apiHealthCoins");
  if (generatedEl) generatedEl.textContent = "—";
  if (ageEl) ageEl.textContent = "—";
  if (coinsEl) coinsEl.textContent = "—";
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
  const statusEl = safeGetElement("apiHealthStatus");
  const verdictEl = safeGetElement("apiHealthVerdict");
  if (statusEl) statusEl.textContent = "⏳ Checking…";
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
 */
const setupApiHealthModalEvents = () => {
  const closeBtn = safeGetElement("apiHealthCloseBtn");
  const modal = safeGetElement("apiHealthModal");
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
 */
const initApiHealth = async () => {
  setupApiHealthModalEvents();
  try {
    const health = await fetchApiHealth();
    _lastHealth = health;
    updateHealthBadges(health);
  } catch (err) {
    console.warn("API health check failed:", err);
    populateApiHealthModalError(err);
  }
};

// Expose globally for other modules and onclick handlers
if (typeof window !== "undefined") {
  window.showApiHealthModal = showApiHealthModal;
  window.hideApiHealthModal = hideApiHealthModal;
  window.initApiHealth = initApiHealth;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApiHealth);
} else {
  initApiHealth();
}

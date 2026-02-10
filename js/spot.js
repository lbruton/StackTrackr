// SPOT PRICE FUNCTIONS
// =============================================================================

/**
 * Saves spot history to localStorage
 */
const saveSpotHistory = () => {
  try {
    saveDataSync(SPOT_HISTORY_KEY, spotHistory);
  } catch (error) {
    console.error('Error saving spot history:', error);
  }
};

/**
 * Loads spot history from localStorage
 */
const loadSpotHistory = () => {
  try {
    const data = loadDataSync(SPOT_HISTORY_KEY, []);
    // Ensure data is an array
    spotHistory = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error loading spot history:', error);
    spotHistory = [];
  }
};

/**
 * Removes spot history entries older than the specified number of days
 *
 * @param {number} days - Number of days to retain
 */
const purgeSpotHistory = (days = 180) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  spotHistory = spotHistory.filter(
    (entry) => new Date(entry.timestamp) >= cutoff,
  );
};

/**
 * Stores last cache refresh and API sync timestamps
 *
 * @param {string} source - Source of spot price ('api' or 'cached')
 * @param {string|null} provider - Provider name if available
 * @param {string} timestamp - ISO timestamp of the event
 */
const updateLastTimestamps = (source, provider, timestamp) => {
  const apiEntry = {
    provider: provider || "API",
    timestamp,
  };

  if (source === "api") {
    saveData(LAST_API_SYNC_KEY, apiEntry);
    saveData(LAST_CACHE_REFRESH_KEY, apiEntry);
  } else if (source === "cached") {
    const cacheEntry = {
      provider: provider ? `${provider} (cached)` : "Cached",
      timestamp,
    };
    saveData(LAST_CACHE_REFRESH_KEY, cacheEntry);
  }
};

/**
 * Records a new spot price entry in history
 *
 * @param {number} newSpot - New spot price value
 * @param {string} source - Source of spot price ('manual', 'api', etc.)
 * @param {string} metal - Metal type ('Silver', 'Gold', 'Platinum', or 'Palladium')
 * @param {string|null} provider - Provider name if source is API-based
 * @param {string|null} timestamp - Optional ISO timestamp for historical entries
 */
const recordSpot = (
  newSpot,
  source,
  metal,
  provider = null,
  timestamp = null,
) => {
  purgeSpotHistory();
  const entryTimestamp = timestamp
    ? new Date(timestamp).toISOString().replace("T", " ").slice(0, 19)
    : new Date().toISOString().replace("T", " ").slice(0, 19);

  // Historical backfill (explicit timestamp): full-array dedup by timestamp+metal.
  // Real-time entries (no explicit timestamp): fast O(1) tail check.
  const isDuplicate = timestamp
    ? spotHistory.some(
        (e) => e.timestamp === entryTimestamp && e.metal === metal,
      )
    : spotHistory.length > 0 &&
      spotHistory[spotHistory.length - 1].spot === newSpot &&
      spotHistory[spotHistory.length - 1].metal === metal;

  if (!isDuplicate) {
    spotHistory.push({
      spot: newSpot,
      metal,
      source,
      provider,
      timestamp: entryTimestamp,
    });
  }
  if (source === "api" || source === "cached") {
    updateLastTimestamps(source, provider, entryTimestamp);
  }
  saveSpotHistory();
};

/**
 * Updates spot card color based on price movement compared to last history entry
 *
 * @param {string} metalKey - Metal key ('silver', 'gold', etc.)
 * @param {number} newPrice - Newly set spot price
 */
const updateSpotCardColor = (metalKey, newPrice) => {
  const metalConfig = Object.values(METALS).find((m) => m.key === metalKey);
  if (!metalConfig) return;

  const el = elements.spotPriceDisplay[metalKey];
  if (!el) return;

  // Find the most recent API/manual entry with a DIFFERENT price.
  // This ensures the direction indicator persists across page refreshes —
  // cached reads reload the same price, so comparing against them (or against
  // the most recent same-price API entry) would always show "unchanged".
  const lastEntry = [...spotHistory]
    .reverse()
    .find((e) => e.metal === metalConfig.name && e.source !== "cached" && e.spot !== newPrice);

  let arrow = "";
  const formatted = typeof formatCurrency === "function"
    ? formatCurrency(newPrice)
    : newPrice.toFixed(2);

  if (!lastEntry) {
    el.classList.remove("spot-up", "spot-down", "spot-unchanged");
    el.textContent = formatted;
    return;
  }

  if (newPrice > lastEntry.spot) {
    el.classList.add("spot-up");
    el.classList.remove("spot-down", "spot-unchanged");
    arrow = "\u25B2"; // Up arrow
  } else if (newPrice < lastEntry.spot) {
    el.classList.add("spot-down");
    el.classList.remove("spot-up", "spot-unchanged");
    arrow = "\u25BC"; // Down arrow
  } else {
    el.classList.add("spot-unchanged");
    el.classList.remove("spot-up", "spot-down");
    arrow = "=";
  }

  el.textContent = `${arrow} ${formatted}`.trim();
};

/**
 * Fetches and displays current spot prices from localStorage or defaults
 */
const fetchSpotPrice = () => {
  // Load spot prices for all metals
  Object.values(METALS).forEach((metalConfig) => {
    const storedSpot = localStorage.getItem(metalConfig.localStorageKey);
    if (storedSpot) {
      spotPrices[metalConfig.key] = parseFloat(storedSpot);
      if (
        elements.spotPriceDisplay[metalConfig.key] &&
        elements.spotPriceDisplay[metalConfig.key].textContent !== undefined
      ) {
        elements.spotPriceDisplay[metalConfig.key].textContent = formatCurrency(
          spotPrices[metalConfig.key],
        );
      }
    } else {
      // Use default price if no stored price
      const defaultPrice = metalConfig.defaultPrice;
      spotPrices[metalConfig.key] = defaultPrice;
      if (
        elements.spotPriceDisplay[metalConfig.key] &&
        elements.spotPriceDisplay[metalConfig.key].textContent !== undefined
      ) {
        elements.spotPriceDisplay[metalConfig.key].textContent = formatCurrency(
          spotPrices[metalConfig.key],
        );
      }
      // Don't record default prices in history automatically
    }

    // Update timestamp display
    const timestampElement = document.getElementById(
      `spotTimestamp${metalConfig.name}`,
    );
    if (timestampElement) {
      updateSpotTimestamp(metalConfig.name);
    }

    // Update card color based on price movement
    updateSpotCardColor(metalConfig.key, spotPrices[metalConfig.key]);
  });

  updateSummary();
};

/**
 * Updates spot price for specified metal from user input
 *
 * @param {string} metalKey - Key of metal to update ('silver', 'gold', 'platinum', 'palladium')
 */
const updateManualSpot = (metalKey) => {
  const metalConfig = Object.values(METALS).find((m) => m.key === metalKey);
  if (!metalConfig) return;

  const input = elements.userSpotPriceInput[metalKey];
  const value = input.value;

  if (!value) return;

  const num = parseFloat(value);
  if (isNaN(num) || num <= 0)
    return alert(`Invalid ${metalConfig.name.toLowerCase()} spot price.`);

  localStorage.setItem(metalConfig.localStorageKey, num);
  spotPrices[metalKey] = num;

  if (
    elements.spotPriceDisplay[metalKey] &&
    elements.spotPriceDisplay[metalKey].textContent !== undefined
  ) {
    elements.spotPriceDisplay[metalKey].textContent = formatCurrency(
      spotPrices[metalKey],
    );
  }

  updateSpotCardColor(metalKey, num);
  recordSpot(num, "manual", metalConfig.name);

  // Update timestamp display
  const timestampElement = document.getElementById(
    `spotTimestamp${metalConfig.name}`,
  );
  if (timestampElement) {
    updateSpotTimestamp(metalConfig.name);
  }

  updateSummary();

  // Clear the input and hide the manual input section if available
  input.value = "";
  if (typeof hideManualInput === "function") {
    hideManualInput(metalConfig.name);
  }
};

/**
 * Resets spot price for specified metal to default or API cached value
 *
 * @param {string} metalKey - Key of metal to reset ('silver', 'gold', 'platinum', 'palladium')
 */
const resetSpot = (metalKey) => {
  const metalConfig = Object.values(METALS).find((m) => m.key === metalKey);
  if (!metalConfig) return;

  let resetPrice = metalConfig.defaultPrice;
  let source = "default";
  let providerName = null;

  // If we have cached API data, use that instead
  if (
    typeof apiCache !== "undefined" &&
    apiCache &&
    apiCache.data &&
    apiCache.data[metalKey]
  ) {
    resetPrice = apiCache.data[metalKey];
    source = "api";
    providerName = API_PROVIDERS[apiCache.provider]?.name || null;
  }

  // Update price
  localStorage.setItem(metalConfig.localStorageKey, resetPrice.toString());
  spotPrices[metalKey] = resetPrice;

  // Update display
  if (
    elements.spotPriceDisplay[metalKey] &&
    elements.spotPriceDisplay[metalKey].textContent !== undefined
  ) {
    elements.spotPriceDisplay[metalKey].textContent = formatCurrency(
      spotPrices[metalKey],
    );
  }

  updateSpotCardColor(metalKey, resetPrice);

  // Record in history
  recordSpot(resetPrice, source, metalConfig.name, providerName);

  // Update timestamp display
  const timestampElement = document.getElementById(
    `spotTimestamp${metalConfig.name}`,
  );
  if (timestampElement) {
    updateSpotTimestamp(metalConfig.name);
  }

  // Update summary
  updateSummary();

  // Hide manual input if shown and function is available
  if (typeof hideManualInput === "function") {
    hideManualInput(metalConfig.name);
  }
};

/**
 * Alternative reset function that works with metal name instead of key
 * This provides compatibility with the API.js resetSpotPrice function
 *
 * @param {string} metalName - Name of metal to reset ('Silver', 'Gold', etc.)
 */
const resetSpotByName = (metalName) => {
  const metalConfig = Object.values(METALS).find((m) => m.name === metalName);
  if (metalConfig) {
    resetSpot(metalConfig.key);
  }
};

// =============================================================================
// SPARKLINE FUNCTIONS
// =============================================================================

/**
 * Returns the theme-aware color for a metal sparkline by reading the
 * CSS custom property (--silver, --gold, etc.) from the active theme.
 * Falls back to hardcoded defaults if getComputedStyle is unavailable.
 * @param {string} metalKey - 'silver', 'gold', 'platinum', 'palladium'
 * @returns {string} CSS color string
 */
const getMetalColor = (metalKey) => {
  const prop = getComputedStyle(document.documentElement).getPropertyValue(`--${metalKey}`).trim();
  if (prop) return prop;
  const fallback = { silver: "#d1d5db", gold: "#fbbf24", platinum: "#f3f4f6", palladium: "#d8b4fe" };
  return fallback[metalKey] || "#6366f1";
};

/**
 * Loads saved trend range preferences from localStorage
 * @returns {Object} Map of metal key → days (default 30)
 */
const loadTrendRanges = () => {
  try {
    const stored = loadDataSync(SPOT_TREND_RANGE_KEY, null);
    return stored && typeof stored === "object" ? stored : {};
  } catch (e) {
    return {};
  }
};

/**
 * Saves a single metal's trend range preference
 * @param {string} metalKey - Metal key
 * @param {number} days - Number of days
 */
const saveTrendRange = (metalKey, days) => {
  const ranges = loadTrendRanges();
  ranges[metalKey] = days;
  saveDataSync(SPOT_TREND_RANGE_KEY, ranges);
};

/**
 * Extracts sparkline data from spotHistory for a given metal and date range
 * @param {string} metalName - Metal name ('Silver', 'Gold', etc.)
 * @param {number} days - Number of days to look back
 * @returns {{ labels: string[], data: number[] }} Arrays for Chart.js
 */
const getSparklineData = (metalName, days) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const entries = spotHistory
    .filter((e) => e.metal === metalName && new Date(e.timestamp) >= cutoff)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Deduplicate by date string (keep last entry per day)
  const byDay = new Map();
  entries.forEach((e) => {
    const day = e.timestamp.slice(0, 10);
    byDay.set(day, e);
  });

  const sorted = [...byDay.values()].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
  );

  return {
    labels: sorted.map((e) => e.timestamp.slice(0, 10)),
    data: sorted.map((e) => e.spot),
  };
};

/**
 * Renders or updates a sparkline chart for a single metal card
 * @param {string} metalKey - Metal key ('silver', 'gold', etc.)
 */
const updateSparkline = (metalKey) => {
  const metalConfig = Object.values(METALS).find((m) => m.key === metalKey);
  if (!metalConfig) return;

  const canvasId = `sparkline${metalConfig.name}`;
  const canvas = document.getElementById(canvasId);
  if (!canvas || !canvas.getContext) return;

  // Determine range from dropdown or saved preference
  const rangeSelect = document.getElementById(`spotRange${metalConfig.name}`);
  const days = rangeSelect ? parseInt(rangeSelect.value, 10) : 90;

  const { labels, data } = getSparklineData(metalConfig.name, days);

  // Destroy existing chart instance
  if (sparklineInstances[metalKey]) {
    sparklineInstances[metalKey].destroy();
    sparklineInstances[metalKey] = null;
  }

  // 1-day view: solid color bar instead of sparkline
  // TODO: Future enhancement — use MetalpriceAPI /v1/hourly endpoint
  // for intraday sparkline when provider is configured (paid tier: up to 7 days)
  if (days === 1) {
    const ctx = canvas.getContext("2d");
    const color = getMetalColor(metalKey);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color + "20"; // 12% opacity
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    updateSpotChangePercent(metalKey);
    return;
  }

  // Need at least 2 data points for a meaningful line
  if (data.length < 2) {
    updateSpotChangePercent(metalKey);
    return;
  }

  const ctx = canvas.getContext("2d");
  const color = getMetalColor(metalKey);

  // Create gradient fill
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight || 80);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "transparent");

  sparklineInstances[metalKey] = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          data: data.map((val, i) => ({ x: i, y: val })),
          borderColor: color,
          backgroundColor: gradient,
          fill: true,
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 6, right: 0, bottom: 0, left: 0 } },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        x: {
          type: "linear",
          display: false,
          min: 0,
          max: data.length - 1,
        },
        y: { display: false, beginAtZero: false },
      },
      animation: { duration: 400 },
      interaction: { enabled: false },
    },
  });

  updateSpotChangePercent(metalKey);
};

/**
 * Computes and displays % change on a spot card based on the selected sparkline period.
 * Compares oldest vs newest data point in the selected range.
 *
 * @param {string} metalKey - Metal key ('silver', 'gold', etc.)
 */
const updateSpotChangePercent = (metalKey) => {
  const metalConfig = Object.values(METALS).find((m) => m.key === metalKey);
  if (!metalConfig) return;
  const el = document.getElementById(`spotChange${metalConfig.name}`);
  if (!el) return;

  const rangeSelect = document.getElementById(`spotRange${metalConfig.name}`);
  const days = rangeSelect ? parseInt(rangeSelect.value, 10) : 90;
  const { data } = getSparklineData(metalConfig.name, days);

  if (data.length < 2) {
    el.textContent = "";
    return;
  }

  const oldest = data[0];
  const newest = data[data.length - 1];
  const pctChange = ((newest - oldest) / oldest) * 100;
  const sign = pctChange > 0 ? "+" : "";
  el.textContent = `${sign}${pctChange.toFixed(2)}%`;
  el.className =
    "spot-card-change " +
    (pctChange > 0 ? "spot-change-up" : pctChange < 0 ? "spot-change-down" : "");

  // Override the arrow direction on the price display to match the period-based
  // trend. updateSpotCardColor() compares against the last different price in ALL
  // history, but the user expects the arrow to reflect the selected period.
  const priceEl = elements.spotPriceDisplay[metalKey];
  if (priceEl) {
    const currentPrice = spotPrices[metalKey];
    const formatted =
      typeof formatCurrency === "function"
        ? formatCurrency(currentPrice)
        : currentPrice.toFixed(2);

    if (pctChange > 0) {
      priceEl.classList.add("spot-up");
      priceEl.classList.remove("spot-down", "spot-unchanged");
      priceEl.textContent = `\u25B2 ${formatted}`;
    } else if (pctChange < 0) {
      priceEl.classList.add("spot-down");
      priceEl.classList.remove("spot-up", "spot-unchanged");
      priceEl.textContent = `\u25BC ${formatted}`;
    } else {
      priceEl.classList.add("spot-unchanged");
      priceEl.classList.remove("spot-up", "spot-down");
      priceEl.textContent = `= ${formatted}`;
    }
  }
};

/**
 * Refreshes sparklines on all 4 metal cards
 */
const updateAllSparklines = () => {
  Object.values(METALS).forEach((mc) => updateSparkline(mc.key));
};

/**
 * Destroys all sparkline Chart.js instances (cleanup)
 */
const destroySparklines = () => {
  Object.keys(sparklineInstances).forEach((key) => {
    if (sparklineInstances[key]) {
      sparklineInstances[key].destroy();
      sparklineInstances[key] = null;
    }
  });
};

/**
 * Opens an inline input on a spot card price for manual editing (shift+click)
 * @param {HTMLElement} valueEl - The .spot-card-value element that was clicked
 * @param {string} metalKey - Metal key ('silver', 'gold', etc.)
 */
const startSpotInlineEdit = (valueEl, metalKey) => {
  if (valueEl.querySelector(".spot-inline-input")) return; // already editing

  const metalConfig = Object.values(METALS).find((m) => m.key === metalKey);
  if (!metalConfig) return;

  const currentPrice = spotPrices[metalKey] || 0;
  const originalHTML = valueEl.innerHTML;

  const input = document.createElement("input");
  input.type = "number";
  input.className = "spot-inline-input";
  input.value = currentPrice > 0 ? currentPrice.toFixed(2) : "";
  input.step = "0.01";
  input.min = "0";

  valueEl.textContent = "";
  valueEl.appendChild(input);
  input.focus();
  input.select();

  const cancel = () => {
    valueEl.innerHTML = originalHTML;
  };

  const save = () => {
    const num = parseFloat(input.value);
    if (isNaN(num) || num <= 0) {
      cancel();
      return;
    }

    localStorage.setItem(metalConfig.localStorageKey, num);
    spotPrices[metalKey] = num;
    valueEl.textContent = formatCurrency(num);
    updateSpotCardColor(metalKey, num);
    recordSpot(num, "manual", metalConfig.name);
    updateSpotTimestamp(metalConfig.name);
    updateSummary();
    updateSparkline(metalKey);
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  });

  input.addEventListener("blur", cancel);
};

// =============================================================================

// Ensure global availability
window.fetchSpotPrice = fetchSpotPrice;
window.updateSpotCardColor = updateSpotCardColor;
window.updateSparkline = updateSparkline;
window.updateAllSparklines = updateAllSparklines;
window.destroySparklines = destroySparklines;
window.updateSpotChangePercent = updateSpotChangePercent;
window.startSpotInlineEdit = startSpotInlineEdit;
window.getMetalColor = getMetalColor;
window.loadTrendRanges = loadTrendRanges;
window.saveTrendRange = saveTrendRange;

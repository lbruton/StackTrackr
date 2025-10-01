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
  if (
    !spotHistory.length ||
    spotHistory[spotHistory.length - 1].spot !== newSpot ||
    spotHistory[spotHistory.length - 1].metal !== metal
  ) {
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

  const lastEntry = [...spotHistory]
    .reverse()
    .find((e) => e.metal === metalConfig.name);

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

// Ensure global availability
window.fetchSpotPrice = fetchSpotPrice;
window.updateSpotCardColor = updateSpotCardColor;

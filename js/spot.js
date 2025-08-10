// SPOT PRICE FUNCTIONS
// =============================================================================

/**
 * Saves spot history to localStorage
 */
const saveSpotHistory = () => saveData(SPOT_HISTORY_KEY, spotHistory);

/**
 * Loads spot history from localStorage
 */
const loadSpotHistory = () => (spotHistory = loadData(SPOT_HISTORY_KEY, []));

/**
 * Records a new spot price entry in history
 *
 * @param {number} newSpot - New spot price value
 * @param {string} source - Source of spot price ('manual', 'api', etc.)
 * @param {string} metal - Metal type ('Silver', 'Gold', 'Platinum', or 'Palladium')
 * @param {string|null} provider - Provider name if source is API-based
 */
const recordSpot = (newSpot, source, metal, provider = null) => {
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
      timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
    });
    saveSpotHistory();
  }
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
        elements.spotPriceDisplay[metalConfig.key].textContent = formatDollar(
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
        elements.spotPriceDisplay[metalConfig.key].textContent = formatDollar(
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
      const lastUpdate = getLastUpdateTime(metalConfig.name);
      timestampElement.textContent = lastUpdate || "No data";
    }
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
    elements.spotPriceDisplay[metalKey].textContent = formatDollar(
      spotPrices[metalKey],
    );
  }
  recordSpot(num, "manual", metalConfig.name);

  // Update timestamp display
  const timestampElement = document.getElementById(
    `spotTimestamp${metalConfig.name}`,
  );
  if (timestampElement) {
    timestampElement.textContent =
      getLastUpdateTime(metalConfig.name) || "No data";
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
    elements.spotPriceDisplay[metalKey].textContent = formatDollar(
      spotPrices[metalKey],
    );
  }

  // Record in history
  recordSpot(resetPrice, source, metalConfig.name, providerName);

  // Update timestamp display
  const timestampElement = document.getElementById(
    `spotTimestamp${metalConfig.name}`,
  );
  if (timestampElement) {
    timestampElement.textContent =
      getLastUpdateTime(metalConfig.name) || "No data";
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

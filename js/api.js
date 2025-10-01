// API INTEGRATION FUNCTIONS
// =============================================================================

// Track provider connection status for settings UI
const providerStatuses = {
  METALS_DEV: "disconnected",
  METALS_API: "disconnected",
  METAL_PRICE_API: "disconnected",
  CUSTOM: "disconnected",
};

const renderApiStatusSummary = () => {
  const container = document.getElementById("apiStatusSummary");
  if (!container) return;
  const html = Object.keys(API_PROVIDERS)
    .map((prov) => {
      const status = providerStatuses[prov] || "disconnected";
      const name = API_PROVIDERS[prov].name;
      const statusText =
        status === "connected"
          ? "Connected"
          : status === "cached"
            ? "Connected (cached)"
            : status === "error"
              ? "Error"
              : "Disconnected";
      const statusClass = status === "cached" ? "connected" : status;
      return `<span class="status-item ${statusClass}">${name}: ${statusText}</span>`;
    })
    .join("");
  container.innerHTML = html;
};

// API history table state
let apiHistoryEntries = [];
let apiHistorySortColumn = "";
let apiHistorySortAsc = true;
let apiHistoryFilterText = "";

/**
 * Loads Metals API configuration from localStorage
 * @returns {Object|null} Metals API configuration or null if not set
 */
const loadApiConfig = () => {
  try {
    const stored = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (stored) {
      const config = JSON.parse(stored);
      if (config.keys) {
        Object.keys(config.keys).forEach((p) => {
          if (config.keys[p]) {
            config.keys[p] = atob(config.keys[p]);
          }
        });
      } else if (config.apiKey && config.provider) {
        // Legacy format migration
        config.keys = { [config.provider]: atob(config.apiKey) };
      }
      const usage = config.usage || {};
      const metals = config.metals || {};
      const historyDays = config.historyDays || {};
      const historyTimes = config.historyTimes || {};
      const currentMonth = currentMonthKey();
      const savedMonth = config.usageMonth;
      Object.keys(API_PROVIDERS).forEach((p) => {
        if (!usage[p]) usage[p] = { quota: DEFAULT_API_QUOTA, used: 0 };
        if (!metals[p])
          metals[p] = {
            silver: true,
            gold: true,
            platinum: true,
            palladium: true,
          };
        else {
          ["silver", "gold", "platinum", "palladium"].forEach((m) => {
            if (typeof metals[p][m] === "undefined") metals[p][m] = true;
          });
        }
        if (typeof historyDays[p] !== "number") {
          historyDays[p] = p === "METALS_DEV" ? 29 : 30;
        } else if (p === "METALS_DEV" && historyDays[p] > 30) {
          historyDays[p] = 30;
        }
        if (!Array.isArray(historyTimes[p])) historyTimes[p] = [];
      });
      let needsSave = false;
      if (savedMonth !== currentMonth) {
        Object.keys(usage).forEach((p) => (usage[p].used = 0));
        needsSave = true;
      }
      const result = {
        provider: config.provider || "",
        // Clone keys object to prevent accidental cross-provider references
        keys: { ...(config.keys || {}) },
        cacheHours:
          typeof config.cacheHours === "number" ? config.cacheHours : 24,
        customConfig: config.customConfig || {
          baseUrl: "",
          endpoint: "",
          format: "symbol",
        },
        metals,
        usage,
        historyDays,
        historyTimes,
        usageMonth: currentMonth,
      };
      if (needsSave) {
        saveApiConfig(result);
      }
      return result;
    }
  } catch (error) {
    console.error("Error loading API config:", error);
  }
  const usage = {};
  const metals = {};
  const historyDays = {};
  const historyTimes = {};
  Object.keys(API_PROVIDERS).forEach((p) => {
    usage[p] = { quota: DEFAULT_API_QUOTA, used: 0 };
    metals[p] = { silver: true, gold: true, platinum: true, palladium: true };
    historyDays[p] = p === "METALS_DEV" ? 29 : 30;
    historyTimes[p] = [];
  });
  return {
    provider: "",
    keys: {},
    cacheHours: 24,
    customConfig: { baseUrl: "", endpoint: "", format: "symbol" },
    metals,
    usage,
    historyDays,
    historyTimes,
    usageMonth: currentMonthKey(),
  };
};

/**
 * Saves Metals API configuration to localStorage
 * @param {Object} config - Metals API configuration object
 */
const saveApiConfig = (config) => {
  try {
    const configToSave = {
      provider: config.provider || "",
      keys: {},
      cacheHours:
        typeof config.cacheHours === "number" ? config.cacheHours : 24,
      customConfig: config.customConfig || {
        baseUrl: "",
        endpoint: "",
        format: "symbol",
      },
      metals: config.metals || {},
      usage: config.usage || {},
      historyDays: config.historyDays || {},
      historyTimes: config.historyTimes || {},
      usageMonth: config.usageMonth || currentMonthKey(),
    };
    Object.keys(config.keys || {}).forEach((p) => {
      if (config.keys[p]) {
        configToSave.keys[p] = btoa(config.keys[p]);
      }
    });
    localStorage.setItem(API_KEY_STORAGE_KEY, JSON.stringify(configToSave));

    // Store a cloned copy in memory to avoid shared references
    apiConfig = {
      ...config,
      keys: { ...(config.keys || {}) },
    };
    updateSyncButtonStates();
  } catch (error) {
    console.error("Error saving API config:", error);
  }
};

/**
 * Clears Metals API configuration
 */
const clearApiConfig = () => {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
  localStorage.removeItem(API_CACHE_KEY);
  apiConfig = {
    provider: "",
    keys: {},
    cacheHours: 24,
    customConfig: { baseUrl: "", endpoint: "", format: "symbol" },
  };
  apiCache = null;
  Object.keys(providerStatuses).forEach((p) =>
    setProviderStatus(p, "disconnected"),
  );
  updateSyncButtonStates();
};

/**
 * Clears only the API cache, keeping the configuration
 */
const clearApiCache = () => {
  localStorage.removeItem(API_CACHE_KEY);
  apiCache = null;
  clearApiHistory(true);
  alert(
    "API cache and history cleared. Next sync will pull fresh data from the API.",
  );
};

/**
 * Gets cache duration in milliseconds
 * @returns {number} Cache duration
 */
const getCacheDurationMs = () => {
  const hours = apiConfig?.cacheHours ?? 24;
  return hours * 60 * 60 * 1000;
};

/**
 * Sets connection status for a provider in the settings UI
 * @param {string} provider
 * @param {"connected"|"disconnected"|"error"|"cached"} status
*/
const setProviderStatus = (provider, status) => {
  providerStatuses[provider] = status;
  renderApiStatusSummary();
  const block = document.querySelector(
    `.api-provider[data-provider="${provider}"] .provider-status`,
  );
  if (!block) return;
  block.classList.remove(
    "status-connected",
    "status-disconnected",
    "status-error",
    "status-cached",
  );
  block.classList.add(
    status === "cached" ? "status-connected" : `status-${status}`,
  );
  const text = block.querySelector(".status-text");
  if (text) {
    text.textContent =
      status === "connected"
        ? "Connected"
        : status === "cached"
          ? "Connected (cached)"
          : status === "error"
            ? "Error"
            : "Disconnected";
  }
};

/**
 * Updates batch calculation display for a provider
 * @param {string} provider - Provider key
 */
const updateBatchCalculation = (provider) => {
  const config = loadApiConfig();
  const providerConfig = API_PROVIDERS[provider];
  const selected = config.metals?.[provider] || {};
  const selectedMetals = Object.keys(selected).filter(metal => selected[metal] !== false);
  let historyDays = parseInt(document.getElementById(`historyDays_${provider}`)?.value || 0);
  if (provider === "METALS_DEV" && historyDays > 30) historyDays = 30;
  
  const batchInfoEl = document.getElementById(`batchInfo_${provider}`);
  if (!batchInfoEl) return;
  
  if (providerConfig?.batchSupported && selectedMetals.length > 1) {
    const usage = calculateApiUsage(selectedMetals, historyDays, true);
    batchInfoEl.innerHTML = `📊 Batch Request: ${selectedMetals.length} metals + ${historyDays} days = 1 API call<br><span class="batch-savings">(saves ${usage.saved} calls vs individual requests)</span>`;
  } else if (selectedMetals.length === 1) {
    batchInfoEl.innerHTML = `📊 Single Request: 1 metal = 1 API call<br><span class="batch-savings">(no batch optimization needed)</span>`;
  } else if (selectedMetals.length === 0) {
    batchInfoEl.innerHTML = `⚠️ No metals selected<br><span class="batch-savings">(select metals to track)</span>`;
  } else {
    const usage = calculateApiUsage(selectedMetals, historyDays, false);
    batchInfoEl.innerHTML = `📊 Individual Requests: ${selectedMetals.length} metals = ${usage.calls} API calls<br><span class="batch-savings">(batch requests not supported)</span>`;
  }
};

/**
 * Updates provider settings from form inputs
 * @param {string} provider - Provider key
 */
const updateProviderSettings = (provider) => {
  const config = loadApiConfig();
  
  // Update cache timeout
  const cacheSelect = document.getElementById(`cacheTimeout_${provider}`);
  if (cacheSelect) {
    if (!config.cacheTimeouts) config.cacheTimeouts = {};
    config.cacheTimeouts[provider] = parseInt(cacheSelect.value);
  }
  
  // Update history days
  const historyInput = document.getElementById(`historyDays_${provider}`);
  if (historyInput) {
    if (!config.historyDays) config.historyDays = {};
    let days = parseInt(historyInput.value) || 0;
    if (provider === "METALS_DEV" && days > 30) days = 30;
    config.historyDays[provider] = days;
  }

  // Update history times
  const timesInput = document.getElementById(`historyTimes_${provider}`);
  if (timesInput) {
    if (!config.historyTimes) config.historyTimes = {};
    const times = timesInput.value
      .split(',')
      .map(t => t.trim())
      .filter(t => /^\d{2}:\d{2}$/.test(t));
    config.historyTimes[provider] = times;
  }

  saveApiConfig(config);
  updateBatchCalculation(provider);
};

/**
 * Sets up event listeners for provider settings
 * @param {string} provider - Provider key
 */
const setupProviderSettingsListeners = (provider) => {
  // Cache timeout change
  const cacheSelect = document.getElementById(`cacheTimeout_${provider}`);
  if (cacheSelect) {
    cacheSelect.addEventListener('change', () => updateProviderSettings(provider));
  }
  
  // History days change
  const historyInput = document.getElementById(`historyDays_${provider}`);
  if (historyInput) {
    historyInput.addEventListener('input', () => updateProviderSettings(provider));
  }

  // History times change
  const timesInput = document.getElementById(`historyTimes_${provider}`);
  if (timesInput) {
    timesInput.addEventListener('input', () => updateProviderSettings(provider));
  }

  // Metal selection changes
  document.querySelectorAll(`.provider-metal[data-provider="${provider}"]`).forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const config = loadApiConfig();
      const metalKey = e.target.dataset.metal;
      if (!config.metals[provider]) config.metals[provider] = {};
      config.metals[provider][metalKey] = e.target.checked;
      saveApiConfig(config);
      updateBatchCalculation(provider);
    });
  });
};

/**
 * Renders API usage/quota data for each provider
 */
const updateProviderHistoryTables = () => {
  const config = loadApiConfig();
  Object.keys(API_PROVIDERS).forEach((prov) => {
      const container = document.querySelector(
        `.api-provider[data-provider="${prov}"] .provider-settings .provider-history`,
      );
    if (!container) return;
    const usage = config.usage?.[prov] || {
      quota: DEFAULT_API_QUOTA,
      used: 0,
    };
    const usedPercent = Math.min((usage.used / usage.quota) * 100, 100);
    const remainingPercent = 100 - usedPercent;
    const warning = usage.used / usage.quota >= 0.9;
    const usageHtml = `<div class="api-usage"><div class="usage-bar"><div class="used" style="width:${usedPercent}%"></div><div class="remaining" style="width:${remainingPercent}%"></div></div><div class="usage-text">${usage.used}/${usage.quota} calls${warning ? " 🚩" : ""}</div></div>`;
    container.innerHTML = usageHtml;
  });
};

/**
 * Refreshes provider statuses based on stored keys and cache age
 */
const refreshProviderStatuses = () => {
  const config = loadApiConfig();
  let cache = null;
  try {
    const stored = localStorage.getItem(API_CACHE_KEY);
    cache = stored ? JSON.parse(stored) : null;
  } catch (err) {
    console.error("Error reading API cache for status check:", err);
  }
  const now = Date.now();
  const duration = getCacheDurationMs();
  Object.keys(API_PROVIDERS).forEach((prov) => {
    if (config.keys[prov]) {
      // API key is stored
      if (cache && cache.provider === prov && cache.timestamp) {
        const age = now - cache.timestamp;
        if (age <= duration) {
          setProviderStatus(prov, "connected");  // Recently used with fresh data
        } else {
          setProviderStatus(prov, "cached");     // Key stored but data is old
        }
      } else {
        setProviderStatus(prov, "cached");       // Key stored but no recent usage
      }
    } else {
      setProviderStatus(prov, "disconnected");   // No API key stored
    }
  });
};

/**
 * Updates default provider button states
 */
const updateDefaultProviderButtons = () => {
  const config = loadApiConfig();
  const keys = config.keys || {};
  const active = Object.keys(API_PROVIDERS).filter((p) => keys[p]);
  if (active.length === 1) {
    config.provider = active[0];
    saveApiConfig(config);
  }
  Object.keys(API_PROVIDERS).forEach((prov) => {
    const btn = document.querySelector(
      `.provider-default-btn[data-provider="${prov}"]`,
    );
    if (!btn) return;
    btn.classList.remove("default", "backup", "inactive");
    if (config.provider === prov && keys[prov]) {
      btn.textContent = "Default";
      btn.classList.add("default");
    } else if (keys[prov]) {
      btn.textContent = "Backup";
      btn.classList.add("backup");
    } else {
      btn.textContent = "Not in use";
      btn.classList.add("inactive");
    }
  });
};

/**
 * Renders API history table with filtering, sorting and pagination
 */
const renderApiHistoryTable = () => {
  const table = document.getElementById("apiHistoryTable");
  if (!table) return;
  let data = [...apiHistoryEntries];
  if (apiHistoryFilterText) {
    const f = apiHistoryFilterText.toLowerCase();
    data = data.filter((e) =>
      Object.values(e).some((v) => String(v).toLowerCase().includes(f)),
    );
  }
  if (apiHistorySortColumn) {
    data.sort((a, b) => {
      const valA = a[apiHistorySortColumn];
      const valB = b[apiHistorySortColumn];
      if (valA < valB) return apiHistorySortAsc ? -1 : 1;
      if (valA > valB) return apiHistorySortAsc ? 1 : -1;
      return 0;
    });
  }
  if (!apiHistorySortColumn) {
    data.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }

  let html =
    "<tr><th data-column=\"timestamp\">Time</th><th data-column=\"metal\">Metal</th><th data-column=\"spot\">Price</th><th data-column=\"provider\">API</th></tr>";
  data.forEach((e) => {
    html += `<tr><td>${e.timestamp}</td><td>${e.metal}</td><td>${formatCurrency(
      e.spot,
    )}</td><td>${e.provider || ""}</td></tr>`;
  });
  table.innerHTML = html;

  table.querySelectorAll("th").forEach((th) => {
    th.addEventListener("click", () => {
      const col = th.dataset.column;
      if (apiHistorySortColumn === col) {
        apiHistorySortAsc = !apiHistorySortAsc;
      } else {
        apiHistorySortColumn = col;
        apiHistorySortAsc = true;
      }
      renderApiHistoryTable();
    });
  });

};

/**
 * Shows API history modal with table
 */
const showApiHistoryModal = () => {
  const modal = document.getElementById("apiHistoryModal");
  if (!modal) return;
  loadSpotHistory();
  apiHistoryEntries = spotHistory.filter((e) => e.source === "api");
  apiHistorySortColumn = "";
  apiHistorySortAsc = true;
  apiHistoryFilterText = "";
  const filterInput = document.getElementById("apiHistoryFilter");
  const clearFilterBtn = document.getElementById("apiHistoryClearFilterBtn");
  if (filterInput) {
    filterInput.value = "";
    filterInput.oninput = (e) => {
      apiHistoryFilterText = e.target.value;
      renderApiHistoryTable();
    };
  }
  if (clearFilterBtn) {
    clearFilterBtn.onclick = () => {
      apiHistoryFilterText = "";
      if (filterInput) filterInput.value = "";
      renderApiHistoryTable();
    };
  }
  renderApiHistoryTable();
  modal.style.display = "flex";
};

/**
 * Hides API history modal
 */
const hideApiHistoryModal = () => {
  const modal = document.getElementById("apiHistoryModal");
  if (modal) modal.style.display = "none";
};

/**
 * Shows API providers modal
 */
const showApiProvidersModal = () => {
  const modal = document.getElementById("apiProvidersModal");
  if (modal) {
    refreshProviderStatuses();
    updateProviderHistoryTables();
    
    // Initialize provider settings
    Object.keys(API_PROVIDERS).forEach(provider => {
      setupProviderSettingsListeners(provider);
      
      // Load current settings
      const config = loadApiConfig();
      
      // Set cache timeout
      const cacheSelect = document.getElementById(`cacheTimeout_${provider}`);
      if (cacheSelect) {
        const timeout = config.cacheTimeouts?.[provider] || 24;
        cacheSelect.value = timeout;
      }
      
      // Set history days
      const historyInput = document.getElementById(`historyDays_${provider}`);
      if (historyInput) {
        const defaultDays = provider === "METALS_DEV" ? 29 : 30;
        let days = config.historyDays?.[provider];
        if (typeof days !== "number" || isNaN(days)) days = defaultDays;
        if (provider === "METALS_DEV" && days > 30) days = 30;
        historyInput.value = days;
      }

      // Set history times
      const timesInput = document.getElementById(`historyTimes_${provider}`);
      if (timesInput) {
        const times = config.historyTimes?.[provider] || [];
        timesInput.value = Array.isArray(times) ? times.join(',') : '';
      }

      // Set metal selections
      const metals = config.metals?.[provider] || {};
      ['silver', 'gold', 'platinum', 'palladium'].forEach(metal => {
        const checkbox = document.querySelector(`.provider-metal[data-provider="${provider}"][data-metal="${metal}"]`);
        if (checkbox) {
          checkbox.checked = metals[metal] !== false;
        }
      });
      
      // Update batch calculation
      updateBatchCalculation(provider);
    });
    
    modal.style.display = "flex";
  }
};

/**
 * Hides API providers modal
 */
const hideApiProvidersModal = () => {
  const modal = document.getElementById("apiProvidersModal");
  if (modal) modal.style.display = "none";
};

/**
 * Clears stored API price history
 * @param {boolean} [silent=false] - When true, does not reopen the history modal
 */
const clearApiHistory = (silent = false) => {
  spotHistory = [];
  saveSpotHistory();
  updateProviderHistoryTables();
  if (!silent) {
    showApiHistoryModal();
  }
};

/**
 * Updates default provider selection in config
 * @param {string} provider
 */
const setDefaultProvider = (provider) => {
  const config = loadApiConfig();
  if (!config.keys[provider]) {
    alert("Please enter your API key first");
    return;
  }
  config.provider = provider;
  saveApiConfig(config);
  updateDefaultProviderButtons();
  updateSyncButtonStates();
};

/**
 * Clears stored API key for a provider
 * @param {string} provider
 */
const clearApiKey = (provider) => {
  const config = loadApiConfig();
  delete config.keys[provider];
  if (config.provider === provider) {
    config.provider = "";
  }
  const active = Object.keys(API_PROVIDERS).filter((p) => config.keys[p]);
  if (active.length === 1) {
    config.provider = active[0];
  }
  saveApiConfig(config);
  const input = document.getElementById(`apiKey_${provider}`);
  if (input) input.value = "";
  if (provider === "CUSTOM") {
    config.customConfig = { baseUrl: "", endpoint: "", format: "symbol" };
    const base = document.getElementById("apiBase_CUSTOM");
    const endpoint = document.getElementById("apiEndpoint_CUSTOM");
    const format = document.getElementById("apiFormat_CUSTOM");
    if (base) base.value = "";
    if (endpoint) endpoint.value = "";
    if (format) format.value = "symbol";
    saveApiConfig(config);
  }
  setProviderStatus(provider, "disconnected");
  updateDefaultProviderButtons();
  updateProviderHistoryTables();
};

/**
 * Refreshes display using cached data without making API calls
 * @returns {boolean} Success status
 */
const refreshFromCache = () => {
  const cache = loadApiCache();
  if (!cache || !cache.data) {
    return false;
  }

  let updatedCount = 0;
  Object.entries(cache.data).forEach(([metal, price]) => {
    const metalConfig = Object.values(METALS).find((m) => m.key === metal);
    if (metalConfig && price > 0) {
      // Save to localStorage
      localStorage.setItem(metalConfig.spotKey, price.toString());
      spotPrices[metal] = price;

      // Update display
      elements.spotPriceDisplay[metal].textContent = formatCurrency(price);

      updateSpotCardColor(metal, price);

      // Record in history as 'cached' to distinguish from fresh API calls
      recordSpot(
        price,
        "cached",
        metalConfig.name,
        API_PROVIDERS[cache.provider]?.name,
      );

      const ts = document.getElementById(`spotTimestamp${metalConfig.name}`);
      if (ts) {
        updateSpotTimestamp(metalConfig.name);
      }

      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    // Update summary calculations
    updateSummary();
    return true;
  }

  return false;
};

/**
 * Loads cached API data from localStorage
 * @returns {Object|null} Cached data or null if expired/not found
 */
const loadApiCache = () => {
  try {
    const stored = localStorage.getItem(API_CACHE_KEY);
    if (stored) {
      const cache = JSON.parse(stored);
      const now = new Date().getTime();

      const duration = getCacheDurationMs();
      if (cache.timestamp && now - cache.timestamp < duration) {
        return cache;
      } else {
        // Cache expired, remove it
        localStorage.removeItem(API_CACHE_KEY);
      }
    }
  } catch (error) {
    console.error("Error loading API cache:", error);
  }
  return null;
};

/**
 * Saves API data to cache
 * @param {Object} data - Data to cache
 */
const saveApiCache = (data, provider) => {
  try {
    const duration = getCacheDurationMs();
    if (duration === 0) {
      localStorage.removeItem(API_CACHE_KEY);
      apiCache = null;
      return;
    }
    const cacheObject = {
      timestamp: new Date().getTime(),
      data: data,
      provider,
    };
    localStorage.setItem(API_CACHE_KEY, JSON.stringify(cacheObject));
    apiCache = cacheObject;
  } catch (error) {
    console.error("Error saving API cache:", error);
  }
};

/**
 * Automatically syncs spot prices if API keys exist and cache is stale
 * @returns {Promise<void>} Resolves when sync completes or immediately if no sync needed
 */
const autoSyncSpotPrices = async () => {
  if (
    !apiConfig ||
    !apiConfig.provider ||
    !apiConfig.keys ||
    !apiConfig.keys[apiConfig.provider]
  ) {
    return;
  }

  const cache = loadApiCache();
  const now = Date.now();
  const duration = getCacheDurationMs();

  const cacheValid =
    cache &&
    cache.provider === apiConfig.provider &&
    cache.timestamp &&
    now - cache.timestamp < duration;

  if (!cacheValid) {
    await syncSpotPricesFromApi(false, true);
    updateSyncButtonStates();
  } else {
    refreshFromCache();
  }
};

/**
 * Calculates API usage for batch vs individual requests
 * @param {Array} selectedMetals - Array of metal keys
 * @param {number} historyDays - Number of history days
 * @param {boolean} batchSupported - Whether provider supports batch requests
 * @returns {Object} Usage calculation result
 */
const calculateApiUsage = (selectedMetals, historyDays = 0, batchSupported = false) => {
  if (batchSupported && selectedMetals.length > 1) {
    return {
      calls: 1,
      type: 'batch',
      metals: selectedMetals.length,
      days: historyDays,
      saved: selectedMetals.length - 1 + (historyDays > 0 ? selectedMetals.length * historyDays : 0)
    };
  } else {
    const currentPriceCalls = selectedMetals.length;
    const historicalCalls = historyDays > 0 ? selectedMetals.length * historyDays : 0;
    return {
      calls: currentPriceCalls + historicalCalls,
      type: 'individual',
      metals: selectedMetals.length,
      days: historyDays,
      saved: 0
    };
  }
};

/**
 * Makes batch API request for multiple metals
 * @param {string} provider - Provider key from API_PROVIDERS
 * @param {string} apiKey - API key
 * @param {Array} selectedMetals - Array of metal keys to fetch
 * @param {number} historyDays - Number of historical days to fetch
 * @param {Array} historyTimes - Array of HH:MM times to fetch each day
 * @returns {Promise<Object>} Promise resolving to spot prices data
 */
const fetchBatchSpotPrices = async (provider, apiKey, selectedMetals, historyDays = 0, historyTimes = []) => {
  const providerConfig = API_PROVIDERS[provider];
  if (!providerConfig || !providerConfig.batchSupported) {
    throw new Error("Provider does not support batch requests");
  }

  if (provider === "METALS_DEV" && historyDays > 30) historyDays = 30;

  const config = loadApiConfig();
  const usage = config.usage?.[provider] || { quota: DEFAULT_API_QUOTA, used: 0 };

  try {
    let url = providerConfig.baseUrl + providerConfig.batchEndpoint;

    // Replace placeholders based on provider specifics
    if (provider === 'METALS_DEV') {
      const metals = selectedMetals.join(',');
      url = url.replace('{API_KEY}', apiKey)
              .replace('{METALS}', metals);
    } else if (provider === 'METALS_API') {
      const symbolMap = { silver: 'XAG', gold: 'XAU', platinum: 'XPT', palladium: 'XPD' };
      const symbols = selectedMetals.map(metal => symbolMap[metal]).join(',');
      url = url.replace('{API_KEY}', apiKey)
              .replace('{SYMBOLS}', symbols);
    } else if (provider === 'METAL_PRICE_API') {
      const symbolMap = { silver: 'XAG', gold: 'XAU', platinum: 'XPT', palladium: 'XPD' };
      const currencies = selectedMetals.map(metal => symbolMap[metal]).join(',');
      url = url.replace('{API_KEY}', apiKey)
              .replace('{CURRENCIES}', currencies);
    }

    // Apply historical parameters if supported
    if (url.includes('{DAYS}')) {
      url = url.replace('{DAYS}', historyDays);
      if (Array.isArray(historyTimes) && historyTimes.length) {
        const timesParam = historyTimes.map(t => encodeURIComponent(t)).join(',');
        if (url.includes('{TIMES}')) {
          url = url.replace('{TIMES}', timesParam);
        } else {
          url += `&times=${timesParam}`;
        }
      }
    }

    const headers = {
      "Content-Type": "application/json",
    };

    if (provider === "METALS_DEV" && apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: headers,
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    usage.used++; // Only increment by 1 for batch request

    const { current = {}, history = {} } =
      providerConfig.parseBatchResponse(data) || {};

    // Filter results to only include selected metals
    const filteredResults = {};
    selectedMetals.forEach((metal) => {
      if (current[metal] && current[metal] > 0) {
        filteredResults[metal] = current[metal];
      }
    });

    if (Object.keys(filteredResults).length === 0) {
      throw new Error("No valid prices retrieved from batch request");
    }

    // Record historical data if provided
    const providerName = providerConfig.name;
    Object.entries(history).forEach(([metal, entries]) => {
      const metalName = METALS[metal]?.name || metal;
      entries.forEach(({ timestamp, price }) => {
        recordSpot(price, "api", metalName, providerName, timestamp);
      });
    });
    if (Object.keys(history).length) {
      renderApiHistoryTable();
    }

    // Update usage
    config.usage[provider] = usage;
    saveApiConfig(config);

    return filteredResults;
  } catch (error) {
    throw new Error(`Batch request failed: ${error.message}`);
  }
};

/**
 * Makes API request for spot prices (individual or batch)
 * @param {string} provider - Provider key from API_PROVIDERS
 * @param {string} apiKey - API key
 * @returns {Promise<Object>} Promise resolving to spot prices data
 */
const fetchSpotPricesFromApi = async (provider, apiKey) => {
  const providerConfig = API_PROVIDERS[provider];
  if (!providerConfig) {
    throw new Error("Invalid API provider");
  }

  const config = loadApiConfig();
  const selected = config.metals?.[provider] || {};
  const usage = config.usage?.[provider] || {
    quota: DEFAULT_API_QUOTA,
    used: 0,
  };

  // Get selected metals
  const selectedMetals = Object.keys(selected).filter(
    (metal) => selected[metal] !== false,
  );

  if (selectedMetals.length === 0) {
    throw new Error("No metals selected for sync");
  }

  // Try batch request first if supported
  if (providerConfig.batchSupported) {
    try {
      let historyDays = config.historyDays?.[provider] || 0;
      if (provider === "METALS_DEV" && historyDays > 30) historyDays = 30;
      const historyTimes = config.historyTimes?.[provider] || [];
      return await fetchBatchSpotPrices(
        provider,
        apiKey,
        selectedMetals,
        historyDays,
        historyTimes,
      );
    } catch (batchError) {
      console.warn(
        `Batch request failed for ${provider}, falling back to individual requests:`,
        batchError.message,
      );
      // Fall through to individual requests
    }
  }

  const results = {};
  const errors = [];

  if (provider === "CUSTOM") {
    const config = loadApiConfig();
    const custom = config.customConfig || {};
    const base = custom.baseUrl || "";
    const pattern = custom.endpoint || "";
    const format = custom.format || "symbol";
    const metalCodes = {
      silver: format === "symbol" ? "XAG" : "silver",
      gold: format === "symbol" ? "XAU" : "gold",
      platinum: format === "symbol" ? "XPT" : "platinum",
      palladium: format === "symbol" ? "XPD" : "palladium",
    };
    for (const metal of Object.keys(metalCodes)) {
      if (selected[metal] === false) continue;
      try {
        const endpoint = pattern
          .replace("{API_KEY}", apiKey)
          .replace("{METAL}", metalCodes[metal]);
        const url = `${base}${endpoint}`;
        const response = await fetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          mode: "cors",
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        usage.used++;
        const price = providerConfig.parseResponse(data, metal);
        if (price && price > 0) {
          results[metal] = price;
        } else {
          errors.push(`${metal}: Invalid price data`);
        }
      } catch (error) {
        errors.push(`${metal}: ${error.message}`);
      }
    }
  } else {
    // Fetch prices for each metal using predefined endpoints
    for (const [metal, endpoint] of Object.entries(providerConfig.endpoints)) {
      if (selected[metal] === false) continue;
      try {
        const url = `${providerConfig.baseUrl}${endpoint.replace("{API_KEY}", apiKey)}`;

        const headers = {
          "Content-Type": "application/json",
        };

        if (provider === "METALS_DEV" && apiKey) {
          headers["Authorization"] = `Bearer ${apiKey}`;
        }

        const response = await fetch(url, {
          method: "GET",
          headers: headers,
          mode: "cors",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        usage.used++;
        const price = providerConfig.parseResponse(data, metal);

        if (price && price > 0) {
          results[metal] = price;
        } else {
          errors.push(`${metal}: Invalid price data`);
        }
      } catch (error) {
        errors.push(`${metal}: ${error.message}`);
      }
    }
  }

  if (Object.keys(results).length === 0) {
    throw new Error(`No valid prices retrieved. Errors: ${errors.join(", ")}`);
  }

  // If we got some results but not all, show a warning
  if (errors.length > 0) {
    console.warn("Some metals failed to fetch:", errors);
  }

  config.usage[provider] = usage;
  saveApiConfig(config);
  return results;
};

/**
 * Syncs spot prices from API and updates the application
 * @param {boolean} showProgress - Whether to show progress indicators
 * @param {boolean} forceSync - Whether to force sync even if cache is valid
 * @returns {Promise<boolean>} Promise resolving to success status
 */
const syncSpotPricesFromApi = async (
  showProgress = true,
  forceSync = false,
) => {
  if (
    !apiConfig ||
    !apiConfig.provider ||
    !apiConfig.keys[apiConfig.provider]
  ) {
    alert(
      "No Metals API configuration found. Please configure an API provider first.",
    );
    return false;
  }

  // Check cache age if not forcing sync
  if (!forceSync) {
    const cache = loadApiCache();
    if (cache && cache.data && cache.timestamp) {
      const now = new Date().getTime();
      const cacheAge = now - cache.timestamp;
      const duration = getCacheDurationMs();

      if (cacheAge < duration) {
        if (showProgress) {
          const hoursAgo = Math.floor(cacheAge / (1000 * 60 * 60));
          const minutesAgo = Math.floor(cacheAge / (1000 * 60));
          const timeText =
            hoursAgo > 0
              ? `${hoursAgo} hours ago`
              : `${minutesAgo} minutes ago`;

          alert(
            `Using cached prices from ${timeText}. To pull fresh data from the API, go to the Metals API configuration and clear the cache first.`,
          );
        }

        // Use cached data to refresh display
        return refreshFromCache();
      }
    }
  }

  if (showProgress) {
    updateSyncButtonStates(true); // Show syncing state
  }

  try {
    const spotPricesData = await fetchSpotPricesFromApi(
      apiConfig.provider,
      apiConfig.keys[apiConfig.provider],
    );

    // Update spot prices in the application
    let updatedCount = 0;
    Object.entries(spotPricesData).forEach(([metal, price]) => {
      const metalConfig = Object.values(METALS).find((m) => m.key === metal);
      if (metalConfig && price > 0) {
        // Save to localStorage
        localStorage.setItem(metalConfig.spotKey, price.toString());
        spotPrices[metal] = price;

        // Update display
        elements.spotPriceDisplay[metal].textContent = formatCurrency(price);

        updateSpotCardColor(metal, price);

        // Record in history
        recordSpot(
          price,
          "api",
          metalConfig.name,
          API_PROVIDERS[apiConfig.provider].name,
        );

        const ts = document.getElementById(`spotTimestamp${metalConfig.name}`);
        if (ts) {
          updateSpotTimestamp(metalConfig.name);
        }

        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      // Save to cache
      saveApiCache(spotPricesData, apiConfig.provider);

      // Update summary calculations
      updateSummary();
      if (typeof updateStorageStats === "function") {
        updateStorageStats();
      }

      setProviderStatus(apiConfig.provider, "connected");

      if (showProgress) {
        alert(
          `Successfully synced ${updatedCount} metal prices from ${API_PROVIDERS[apiConfig.provider].name}`,
        );
      }

      return true;
    } else {
      setProviderStatus(apiConfig.provider, "error");
      throw new Error("No valid prices were retrieved from API");
    }
  } catch (error) {
    console.error("API sync error:", error);
    setProviderStatus(apiConfig.provider, "error");
    if (showProgress) {
      alert(`Failed to sync prices: ${error.message}`);
    }
    return false;
  } finally {
    if (showProgress) {
      updateSyncButtonStates(false); // Reset sync button states
    }
  }
};

/**
 * Tests API connection
 * @param {string} provider - Provider key
 * @param {string} apiKey - API key to test
 * @returns {Promise<boolean>} Promise resolving to connection test result
 */
const testApiConnection = async (provider, apiKey) => {
  try {
    // Just test one metal (silver) to verify connection
    const providerConfig = API_PROVIDERS[provider];
    if (!providerConfig) {
      throw new Error("Invalid provider");
    }

    let url = "";
    const headers = {
      "Content-Type": "application/json",
    };
    if (provider === "CUSTOM") {
      const config = loadApiConfig();
      const custom = config.customConfig || {};
      const metal = custom.format === "word" ? "silver" : "XAG";
      url = `${custom.baseUrl || ""}${(custom.endpoint || "")
        .replace("{API_KEY}", apiKey)
        .replace("{METAL}", metal)}`;
    } else {
      const endpoint = providerConfig.endpoints.silver;
      url = `${providerConfig.baseUrl}${endpoint.replace("{API_KEY}", apiKey)}`;
      if (provider === "METALS_DEV" && apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }
    }

    const response = await fetch(url, {
      method: "GET",
      headers: headers,
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const price = providerConfig.parseResponse(data, "silver");

    return price && price > 0;
  } catch (error) {
    console.error("API connection test failed:", error);
    return false;
  }
};

/**
 * Handles testing and syncing for a specific provider
 * @param {string} provider - Provider key
 */
const handleProviderSync = async (provider) => {
  const keyInput = document.getElementById(`apiKey_${provider}`);
  if (!keyInput) return;

  const apiKey = keyInput.value.trim();
  if (!apiKey) {
    alert("Please enter your API key");
    return;
  }

  const config = loadApiConfig();
  // Ensure keys object exists and clone to avoid mutating shared references
  config.keys = { ...(config.keys || {}) };
  config.keys[provider] = apiKey;
  if (provider === "CUSTOM") {
    const base = document.getElementById("apiBase_CUSTOM")?.value.trim() || "";
    const endpoint =
      document.getElementById("apiEndpoint_CUSTOM")?.value.trim() || "";
    const format =
      document.getElementById("apiFormat_CUSTOM")?.value || "symbol";
    if (!base || !endpoint) {
      alert("Please enter base URL and endpoint");
      return;
    }
    config.customConfig = { baseUrl: base, endpoint, format };
  }
  config.timestamp = new Date().getTime();
  saveApiConfig(config);
  updateDefaultProviderButtons();
  updateSyncButtonStates();
  setProviderStatus(provider, "disconnected");

  // Test connection
  const ok = await testApiConnection(provider, apiKey);
  if (!ok) {
    alert("API connection test failed.");
    setProviderStatus(provider, "error");
    return;
  }

  try {
    const data = await fetchSpotPricesFromApi(provider, apiKey);
    let updatedCount = 0;
    Object.entries(data).forEach(([metal, price]) => {
      const metalConfig = Object.values(METALS).find((m) => m.key === metal);
      if (metalConfig && price > 0) {
        localStorage.setItem(metalConfig.spotKey, price.toString());
        spotPrices[metal] = price;
        elements.spotPriceDisplay[metal].textContent = formatCurrency(price);
        updateSpotCardColor(metal, price);
        recordSpot(
          price,
          "api",
          metalConfig.name,
          API_PROVIDERS[provider].name,
        );
        const ts = document.getElementById(`spotTimestamp${metalConfig.name}`);
        if (ts) {
          updateSpotTimestamp(metalConfig.name);
        }
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      saveApiCache(data, provider);
      updateSummary();
      setProviderStatus(provider, "connected");
      updateProviderHistoryTables();
      alert(
        `Successfully synced ${updatedCount} metal prices from ${API_PROVIDERS[provider].name}`,
      );
    } else {
      setProviderStatus(provider, "error");
      alert("No valid prices retrieved from API");
    }
  } catch (error) {
    console.error("API sync error:", error);
    setProviderStatus(provider, "error");
    alert("Failed to sync prices: " + error.message);
  }
};

/**
 * Syncs all configured providers and records results
 */
const syncAllProviders = async () => {
  const config = loadApiConfig();
  if (!config || !config.keys) return 0;
  let updated = 0;
  for (const prov of Object.keys(API_PROVIDERS)) {
    const apiKey = config.keys[prov];
    if (!apiKey) continue;
    try {
      const data = await fetchSpotPricesFromApi(prov, apiKey);
      Object.entries(data).forEach(([metal, price]) => {
        const metalConfig = Object.values(METALS).find((m) => m.key === metal);
        if (metalConfig && price > 0) {
          recordSpot(
            price,
            "api",
            metalConfig.name,
            API_PROVIDERS[prov].name,
          );
          updated++;
        }
      });
      setProviderStatus(prov, "connected");
    } catch (err) {
      console.error(`Sync failed for ${prov}:`, err);
      setProviderStatus(prov, "error");
    }
  }
  updateProviderHistoryTables();
  return updated;
};

/**
 * Updates sync button states based on API availability
 * @param {boolean} syncing - Whether sync is in progress
 */
const updateSyncButtonStates = (syncing = false) => {
  const hasApi =
    apiConfig && apiConfig.provider && apiConfig.keys[apiConfig.provider];

  Object.values(METALS).forEach((metalConfig) => {
    const syncBtn = document.getElementById(`syncBtn${metalConfig.name}`);
    if (syncBtn) {
      syncBtn.disabled = !hasApi || syncing;
      syncBtn.textContent = syncing ? "..." : "Sync";
      syncBtn.title = hasApi
        ? syncing
          ? "Syncing..."
          : "Sync from API"
        : "Configure API first";
    }
  });
};

/**
 * Updates API status display in modal
 */
/**
 * Shows settings modal and populates API fields
 */
const showApiModal = () => {
  const modal = document.getElementById("apiModal");
  if (!modal) return;
  let currentConfig = loadApiConfig() || {
    provider: "",
    keys: {},
    cacheHours: 24,
    customConfig: { baseUrl: "", endpoint: "", format: "symbol" },
  };
  if (!currentConfig.provider) {
    currentConfig.provider = Object.keys(API_PROVIDERS)[0];
    saveApiConfig(currentConfig);
  }

  Object.keys(API_PROVIDERS).forEach((prov) => {
    const input = document.getElementById(`apiKey_${prov}`);
    if (input) input.value = currentConfig.keys?.[prov] || "";
    setProviderStatus(prov, providerStatuses[prov] || "disconnected");
  });
  renderApiStatusSummary();

  const baseInput = document.getElementById("apiBase_CUSTOM");
  if (baseInput) baseInput.value = currentConfig.customConfig?.baseUrl || "";
  const endpointInput = document.getElementById("apiEndpoint_CUSTOM");
  if (endpointInput)
    endpointInput.value = currentConfig.customConfig?.endpoint || "";
  const formatSelect = document.getElementById("apiFormat_CUSTOM");
  if (formatSelect)
    formatSelect.value = currentConfig.customConfig?.format || "symbol";

  updateDefaultProviderButtons();
  updateProviderHistoryTables();
  modal.style.display = "flex";
};

/**
 * Hides API modal
 */
const hideApiModal = () => {
  const modal = document.getElementById("apiModal");
  if (modal) {
    modal.style.display = "none";
  }
};

const showFilesModal = () => {
  const modal = document.getElementById("filesModal");
  if (window.openModalById) {
    openModalById('filesModal');
  } else if (modal) {
    modal.style.display = "flex";
    document.body.style.overflow = 'hidden';
  }
};

const hideFilesModal = () => {
  if (window.closeModalById) {
    closeModalById('filesModal');
  } else {
    const modal = document.getElementById("filesModal");
    if (modal) {
      modal.style.display = "none";
    }
    try { 
      document.body.style.overflow = ''; 
    } catch (e) {
      console.warn('Failed to reset body overflow:', e);
    }
  }
};


/**
 * Shows provider information modal
 * @param {string} providerKey
 */
const showProviderInfo = (providerKey) => {
  const modal = document.getElementById("apiInfoModal");
  if (!modal || !API_PROVIDERS[providerKey]) return;

  const provider = API_PROVIDERS[providerKey];
  const title = document.getElementById("apiInfoTitle");
  const body = document.getElementById("apiInfoBody");

  if (title) title.textContent = "Provider Information";
  if (body) {
    body.innerHTML = `
      <div class="info-provider-name">${provider.name}</div>
      <div>Base URL: ${provider.baseUrl}</div>
      <div>Metals: Silver, Gold, Platinum, Palladium</div>
      <div class="api-key-info">
        <div>📋 <strong>API Key Management:</strong></div>
        <ul>
          <li>Visit the documentation link below to manage your API key</li>
          <li>You can view usage, reset, or regenerate your key there</li>
          <li>Keep your API key secure and never share it publicly</li>
        </ul>
      </div>
      <a class="btn info-docs-btn" href="${provider.documentation}" target="_blank" rel="noopener">
        📄 ${provider.name} Documentation & Key Management
      </a>
    `;
  }

  modal.style.display = "flex";
};

/**
 * Hides provider information modal
 */
const hideProviderInfo = () => {
  const modal = document.getElementById("apiInfoModal");
  if (modal) {
    modal.style.display = "none";
  }
};

// Make modal controls available globally
  window.showApiModal = showApiModal;
  window.hideApiModal = hideApiModal;
  window.showFilesModal = showFilesModal;
  window.hideFilesModal = hideFilesModal;
  window.showProviderInfo = showProviderInfo;
  window.hideProviderInfo = hideProviderInfo;

window.handleProviderSync = handleProviderSync;
window.clearApiKey = clearApiKey;
window.clearApiCache = clearApiCache;
window.setDefaultProvider = setDefaultProvider;
window.showApiHistoryModal = showApiHistoryModal;
window.hideApiHistoryModal = hideApiHistoryModal;
window.clearApiHistory = clearApiHistory;
window.syncAllProviders = syncAllProviders;
window.autoSyncSpotPrices = autoSyncSpotPrices;

/**
 * Shows manual price input for a specific metal
 * @param {string} metal - Metal name (Silver, Gold, etc.)
 */
const showManualInput = (metal) => {
  const manualInput = document.getElementById(`manualInput${metal}`);
  if (manualInput) {
    manualInput.style.display = "block";

    // Focus the input field
    const input = document.getElementById(`userSpotPrice${metal}`);
    if (input) {
      input.focus();
    }
  }
};

/**
 * Hides manual price input for a specific metal
 * @param {string} metal - Metal name (Silver, Gold, etc.)
 */
const hideManualInput = (metal) => {
  const manualInput = document.getElementById(`manualInput${metal}`);
  if (manualInput) {
    manualInput.style.display = "none";

    // Clear the input
    const input = document.getElementById(`userSpotPrice${metal}`);
    if (input) {
      input.value = "";
    }
  }
};

/**
 * Resets spot price to default or API cached value
 * @param {string} metal - Metal name (Silver, Gold, etc.)
 */
const resetSpotPrice = (metal) => {
  const metalConfig = Object.values(METALS).find((m) => m.name === metal);
  if (!metalConfig) return;

  let resetPrice = metalConfig.defaultPrice;
  let source = "default";
  let providerName = null;

  // If we have cached API data, use that instead
  if (apiCache && apiCache.data && apiCache.data[metalConfig.key]) {
    resetPrice = apiCache.data[metalConfig.key];
    source = "api";
    providerName = API_PROVIDERS[apiCache.provider]?.name || null;
  }

  // Update price
  localStorage.setItem(metalConfig.spotKey, resetPrice.toString());
  spotPrices[metalConfig.key] = resetPrice;

  // Update display
  elements.spotPriceDisplay[metalConfig.key].textContent =
    formatCurrency(resetPrice);

  updateSpotCardColor(metalConfig.key, resetPrice);

  // Record in history
  recordSpot(resetPrice, source, metalConfig.name, providerName);

  // Update summary
  updateSummary();

  // Hide manual input if shown
  hideManualInput(metal);
};

/**
 * Exports backup data including Metals API configuration
 * @returns {Object} Complete backup data object
 */
const createBackupData = () => {
  const backupData = {
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    inventory: loadData(LS_KEY, []),
    spotHistory: loadData(SPOT_HISTORY_KEY, []),
    apiConfig:
      apiConfig && apiConfig.provider
        ? {
            provider: apiConfig.provider,
            providerName: API_PROVIDERS[apiConfig.provider]?.name || "Unknown",
            keyLength: apiConfig.keys[apiConfig.provider]
              ? apiConfig.keys[apiConfig.provider].length
              : 0,
            hasKey: !!apiConfig.keys[apiConfig.provider],
            timestamp: apiConfig.timestamp,
          }
        : null,
    spotPrices: { ...spotPrices },
  };

  return backupData;
};

/**
 * Downloads complete backup files including inventory and Metals API configuration
 */
const downloadCompleteBackup = async () => {
  try {
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[T:]/g, "-");

    // 1. Create inventory CSV using existing export logic
    const inventory = loadDataSync(LS_KEY, []);
    if (inventory.length > 0) {
      // Create CSV manually for backup instead of calling exportCsv()
      const headers = [
        "Metal",
        "Name",
        "Qty",
        "Type",
        "Weight(oz)",
        "Purchase Price",
        "Spot Price ($/oz)",
        "Premium ($/oz)",
        "Total Premium",
        "Purchase Location",
        "Storage Location",
        "Notes",
        "Date",
        "Collectable",
      ];
      const sortedInventory = [...inventory].sort(
        (a, b) => new Date(b.date) - new Date(a.date),
      );

      const rows = sortedInventory.map((item) => [
        item.metal || "Silver",
        item.name,
        item.qty,
        item.type,
        parseFloat(item.weight).toFixed(4),
        formatCurrency(item.price),
        item.isCollectable ? "N/A" : formatCurrency(item.spotPriceAtPurchase),
        item.isCollectable ? "N/A" : formatCurrency(item.premiumPerOz),
        item.isCollectable ? "N/A" : formatCurrency(item.totalPremium),
        item.purchaseLocation,
        item.storageLocation || "Unknown",
        item.notes || "",
        item.date,
        item.isCollectable ? "Yes" : "No",
      ]);

      const inventoryCsv = Papa.unparse([headers, ...rows]);
      downloadFile(
        `inventory-backup-${timestamp}.csv`,
        inventoryCsv,
        "text/csv",
      );
    }

    // 2. Create spot history CSV
    const spotHistory = loadDataSync(SPOT_HISTORY_KEY, []);
    if (spotHistory.length > 0) {
      const historyData = [
        ["Timestamp", "Metal", "Price", "Source"],
        ...spotHistory.map((entry) => [
          entry.timestamp,
          entry.metal,
          entry.spot,
          entry.source,
        ]),
      ];

      const historyCsv = Papa.unparse(historyData);
      downloadFile(
        `spot-price-history-${timestamp}.csv`,
        historyCsv,
        "text/csv",
      );
    }

    // 3. Create complete JSON backup
    const completeBackup = {
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      data: {
        inventory: inventory,
        spotHistory: spotHistory,
        spotPrices: { ...spotPrices },
        apiConfig:
          apiConfig && apiConfig.provider
            ? {
                provider: apiConfig.provider,
                providerName:
                  API_PROVIDERS[apiConfig.provider]?.name || "Unknown",
                hasKey: !!apiConfig.keys[apiConfig.provider],
                keyLength: apiConfig.keys[apiConfig.provider]
                  ? apiConfig.keys[apiConfig.provider].length
                  : 0,
                timestamp: apiConfig.timestamp,
              }
            : null,
      },
    };

    const backupJson = JSON.stringify(completeBackup, null, 2);
    downloadFile(
      `complete-backup-${timestamp}.json`,
      backupJson,
      "application/json",
    );

    // 4. Create API documentation and restoration guide
    const backupData = createBackupData();
    const apiInfo = `# StackrTrackr - Complete Backup

Generated: ${new Date().toLocaleString()}
Application Version: ${APP_VERSION}

## Backup Contents

1. **inventory-backup-${timestamp}.csv** - Complete inventory data
2. **spot-price-history-${timestamp}.csv** - Historical spot price data
3. **complete-backup-${timestamp}.json** - Full application backup
4. **backup-info-${timestamp}.md** - This documentation file

## Metals API Configuration
${
  backupData.apiConfig
    ? `
- Provider: ${backupData.apiConfig.providerName}
- Has API Key: ${backupData.apiConfig.hasKey}
- Key Length: ${backupData.apiConfig.keyLength} characters
- Configured: ${new Date(backupData.apiConfig.timestamp).toLocaleString()}

**⚠️ Security Note:** API keys are not included in backups for security.
After restoring, reconfigure your API key in the API settings.

### API Key Management
${
  API_PROVIDERS[apiConfig?.provider]
    ? `
**${API_PROVIDERS[apiConfig.provider].name}**
- Documentation: ${API_PROVIDERS[apiConfig.provider].documentation}
- If you need to reset your API key, visit the documentation link above
`
    : ""
}
`
    : "No Metals API configuration found."
}

## Current Data Summary
- Inventory Items: ${inventory.length}
- Spot Price History: ${spotHistory.length} entries
- Silver Price: ${spotPrices.silver || "Not set"}
- Gold Price: ${spotPrices.gold || "Not set"}
- Platinum Price: ${spotPrices.platinum || "Not set"}
- Palladium Price: ${spotPrices.palladium || "Not set"}

## Restoration Instructions

1. Import **inventory-backup-${timestamp}.csv** using the CSV import feature
2. Reconfigure API settings if needed (keys not backed up for security)
3. Use **complete-backup-${timestamp}.json** for full data restoration if needed

*This backup was created by StackrTrackr v${APP_VERSION}*
`;

    downloadFile(`backup-info-${timestamp}.md`, apiInfo, "text/markdown");

    alert(
      `Complete backup created! Downloaded files:\n\n✓ Inventory CSV (${inventory.length} items)\n✓ Spot price history (${spotHistory.length} entries)\n✓ Complete JSON backup\n✓ Documentation & restoration guide\n\nCheck your Downloads folder.`,
    );
  } catch (error) {
    console.error("Backup error:", error);
    alert("Error creating backup: " + error.message);
  }
};

// =============================================================================

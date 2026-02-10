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
  const container = document.getElementById("apiHeaderStatusRow");
  if (!container) return;

  // Build provider list: Numista first, then metals providers
  const items = [];

  // Numista status
  let numistaStatus = "disconnected";
  try {
    if (typeof catalogConfig !== "undefined" && catalogConfig.getNumistaConfig) {
      const nc = catalogConfig.getNumistaConfig();
      numistaStatus = nc.apiKey ? "connected" : "disconnected";
    }
  } catch (e) { /* ignore */ }
  items.push({ name: "Numista", status: numistaStatus, provider: "NUMISTA" });

  // PCGS status
  let pcgsStatus = "disconnected";
  try {
    if (typeof catalogConfig !== "undefined" && catalogConfig.isPcgsEnabled) {
      pcgsStatus = catalogConfig.isPcgsEnabled() ? "connected" : "disconnected";
    }
  } catch (e) { /* ignore */ }
  items.push({ name: "PCGS", status: pcgsStatus, provider: "PCGS" });

  // Metals providers
  Object.keys(API_PROVIDERS).forEach((prov) => {
    const status = Object.hasOwn(providerStatuses, prov) ? providerStatuses[prov] : "disconnected"; // eslint-disable-line security/detect-object-injection
    const providerConfig = Object.hasOwn(API_PROVIDERS, prov) ? API_PROVIDERS[prov] : null; // eslint-disable-line security/detect-object-injection
    if (!providerConfig) return;
    const name = providerConfig.name;
    const statusClass = status === "cached" ? "connected" : status;
    const lastSync = typeof getLastProviderSyncTime === "function" ? getLastProviderSyncTime(prov) : null;
    let tsLabel = "";
    if (lastSync) {
      const d = new Date(lastSync);
      tsLabel = d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    }
    items.push({ name, status: statusClass, tsLabel, provider: prov });
  });

  container.textContent = '';
  items.forEach(item => {
    const span = document.createElement('span');
    span.className = 'api-header-status-item ' + item.status;
    const dot = document.createElement('span');
    dot.className = 'status-dot';
    const nameEl = document.createElement('span');
    nameEl.className = 'status-name';
    nameEl.textContent = item.name;
    span.append(dot, nameEl);
    if (item.tsLabel) {
      const ts = document.createElement('span');
      ts.className = 'status-timestamp';
      ts.textContent = item.tsLabel;
      span.appendChild(ts);
    }
    container.appendChild(span);
  });
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
      // Reconstruct per-provider cache timeouts, defaulting to global cacheHours or 24
      const cacheTimeouts = config.cacheTimeouts || {};
      const globalCache = Number.isFinite(config.cacheHours) ? config.cacheHours : 24;
      Object.keys(API_PROVIDERS).forEach((p) => {
        if (!Number.isFinite(cacheTimeouts[p]) || cacheTimeouts[p] < 0) {
          cacheTimeouts[p] = globalCache;
        }
      });

      const result = {
        provider: config.provider || "",
        // Clone keys object to prevent accidental cross-provider references
        keys: { ...(config.keys || {}) },
        cacheHours:
          typeof config.cacheHours === "number" ? config.cacheHours : 24,
        cacheTimeouts,
        customConfig: config.customConfig || {
          baseUrl: "",
          endpoint: "",
          format: "symbol",
        },
        metals,
        usage,
        historyDays,
        historyTimes,
        syncMode: config.syncMode || {},
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
  const defaultCacheTimeouts = {};
  Object.keys(API_PROVIDERS).forEach((p) => {
    usage[p] = { quota: DEFAULT_API_QUOTA, used: 0 };
    metals[p] = { silver: true, gold: true, platinum: true, palladium: true };
    historyDays[p] = p === "METALS_DEV" ? 29 : 30;
    historyTimes[p] = [];
    defaultCacheTimeouts[p] = 24;
  });
  return {
    provider: "",
    keys: {},
    cacheHours: 24,
    cacheTimeouts: defaultCacheTimeouts,
    customConfig: { baseUrl: "", endpoint: "", format: "symbol" },
    metals,
    usage,
    historyDays,
    historyTimes,
    syncMode: {},
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
      cacheTimeouts: config.cacheTimeouts || {},
      customConfig: config.customConfig || {
        baseUrl: "",
        endpoint: "",
        format: "symbol",
      },
      metals: config.metals || {},
      usage: config.usage || {},
      historyDays: config.historyDays || {},
      historyTimes: config.historyTimes || {},
      syncMode: config.syncMode || {},
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
const getCacheDurationMs = (provider) => {
  let hours;
  if (provider && Number.isFinite(apiConfig?.cacheTimeouts?.[provider])) {
    hours = apiConfig.cacheTimeouts[provider];
  } else {
    hours = apiConfig?.cacheHours ?? 24;
  }
  return (Number.isFinite(hours) && hours >= 0 ? hours : 24) * 60 * 60 * 1000;
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

  // Update last-used timestamp in provider card
  const lastUsed = block.querySelector(".status-last-used");
  if (lastUsed && typeof getLastProviderSyncTime === "function") {
    const ts = getLastProviderSyncTime(provider);
    if (ts) {
      const d = new Date(ts);
      lastUsed.textContent = "Last: " + d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    } else {
      lastUsed.textContent = "";
    }
  }
};

/**
 * Updates the history pull cost indicator for a provider
 * @param {string} provider - Provider key
 */
const updateHistoryPullCost = (provider) => {
  const config = loadApiConfig();
  const providerConfig = API_PROVIDERS[provider];
  const costEl = document.getElementById(`historyPullCost_${provider}`);
  if (!costEl || !providerConfig) return;

  const selected = config.metals?.[provider] || {};
  const selectedMetals = Object.keys(selected).filter(metal => selected[metal] !== false);
  const daysSelect = document.getElementById(`historyPullDays_${provider}`);
  const totalDays = daysSelect ? parseInt(daysSelect.value, 10) : 30;
  const maxPerReq = providerConfig.maxHistoryDays || 30;
  const chunks = Math.ceil(totalDays / maxPerReq);

  let calls;
  if (providerConfig.symbolsPerRequest === 1) {
    calls = chunks * selectedMetals.length;
    costEl.textContent = `${totalDays}d \u00D7 ${selectedMetals.length} metals = ${calls} API calls`;
  } else {
    calls = chunks;
    costEl.textContent = `${totalDays}d = ${calls} API call${calls > 1 ? "s" : ""}`;
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

  saveApiConfig(config);
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

  // History pull days dropdown — update cost indicator
  const pullDaysSelect = document.getElementById(`historyPullDays_${provider}`);
  if (pullDaysSelect) {
    pullDaysSelect.addEventListener('change', () => updateHistoryPullCost(provider));
  }

  // History pull button
  const pullBtn = document.querySelector(`.api-history-btn[data-provider="${provider}"]`);
  if (pullBtn) {
    pullBtn.addEventListener('click', () => handleHistoryPull(provider));
  }

  // Metal selection changes
  document.querySelectorAll(`.provider-metal[data-provider="${provider}"]`).forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const config = loadApiConfig();
      const metalKey = e.target.dataset.metal;
      if (!config.metals[provider]) config.metals[provider] = {};
      config.metals[provider][metalKey] = e.target.checked;
      saveApiConfig(config);
      updateHistoryPullCost(provider);
    });
  });

  // Sync mode toggle
  const syncModeToggle = document.getElementById(`syncMode_${provider}`);
  if (syncModeToggle) {
    syncModeToggle.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip-sort-btn');
      if (!btn) return;
      const mode = btn.dataset.mode;
      syncModeToggle.querySelectorAll('.chip-sort-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.mode === mode);
      });
      const config = loadApiConfig();
      if (!config.syncMode) config.syncMode = {};
      config.syncMode[provider] = mode;
      saveApiConfig(config);
    });
  }
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
    const usageHtml = `<div class="api-usage" data-quota-provider="${prov}" style="cursor:pointer" title="Click to edit quota"><div class="usage-bar"><div class="used" style="width:${usedPercent}%"></div><div class="remaining" style="width:${remainingPercent}%"></div></div><div class="usage-text">${usage.used}/${usage.quota} calls${warning ? " 🚩" : ""}</div></div>`;
    container.innerHTML = usageHtml;

    // Make quota bar clickable
    const usageEl = container.querySelector('.api-usage[data-quota-provider]');
    if (usageEl) {
      usageEl.addEventListener('click', () => {
        const modal = document.getElementById('apiQuotaModal');
        const input = document.getElementById('apiQuotaInput');
        if (modal && input) {
          const cfg = loadApiConfig();
          const u = cfg.usage?.[prov] || { quota: DEFAULT_API_QUOTA, used: 0 };
          input.value = u.quota;
          // Store provider for the save handler
          modal.dataset.quotaProvider = prov;
          if (window.openModalById) openModalById('apiQuotaModal');
          else modal.style.display = 'flex';
        }
      });
    }
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
  Object.keys(API_PROVIDERS).forEach((prov) => {
    const duration = getCacheDurationMs(prov);
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
 * Auto-selects the default provider based on tab order and key availability.
 * Tab order determines priority: first tab with an API key becomes the primary provider.
 */
const autoSelectDefaultProvider = () => {
  const config = loadApiConfig();
  const keys = config.keys || {};

  // Read tab order from localStorage, fall back to default order
  let order;
  try {
    const stored = localStorage.getItem("apiProviderOrder");
    order = stored ? JSON.parse(stored) : null;
  } catch (e) { order = null; }
  if (!Array.isArray(order) || order.length === 0) {
    order = Object.keys(API_PROVIDERS);
  }

  // Select first provider with a key as default
  const active = order.filter((p) => keys[p]);
  if (active.length > 0 && config.provider !== active[0]) {
    config.provider = active[0];
    saveApiConfig(config);
  } else if (active.length === 0 && config.provider) {
    config.provider = "";
    saveApiConfig(config);
  }
};

// Backward-compatible alias
const updateDefaultProviderButtons = autoSelectDefaultProvider;

/**
 * Returns the metals provider priority order from localStorage.
 * @returns {string[]} Provider keys in priority order
 */
const getProviderOrder = () => {
  try {
    const stored = localStorage.getItem("apiProviderOrder");
    const order = stored ? JSON.parse(stored) : null;
    if (Array.isArray(order) && order.length > 0) return order;
  } catch (e) { /* ignore */ }
  return Object.keys(API_PROVIDERS);
};

/**
 * Returns default sync mode for a provider based on priority position.
 * First provider with an API key → "always", rest → "backup".
 * @param {string} provider - Provider key
 * @returns {string} "always" or "backup"
 */
const getDefaultSyncMode = (provider) => {
  const order = getProviderOrder();
  const config = loadApiConfig();
  const firstWithKey = order.find(p => config.keys?.[p]);
  return provider === firstWithKey ? "always" : "backup";
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
  // Redirect to Settings modal API section
  if (typeof showSettingsModal === "function") {
    showSettingsModal('api');
  }
};

/**
 * Hides API providers modal
 */
const hideApiProvidersModal = () => {
  // Legacy — Settings modal handles its own close
  if (typeof hideSettingsModal === "function") {
    hideSettingsModal();
  }
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
    if (typeof updateAllSparklines === "function") {
      updateAllSparklines();
    }
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

      const duration = getCacheDurationMs(cache.provider);
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
    const duration = getCacheDurationMs(provider);
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
  const config = loadApiConfig();
  const hasAnyKey = Object.values(config.keys || {}).some(k => k);
  if (!hasAnyKey) return;

  await syncProviderChain({ showProgress: false, forceSync: false });
  updateSyncButtonStates();
};

/**
 * Gets the last sync timestamp for a specific provider from spot history
 * @param {string} provider - Provider key
 * @returns {number|null} Timestamp in ms or null if never synced
 */
const getLastProviderSyncTime = (provider) => {
  try {
    const providerName = API_PROVIDERS[provider]?.name;
    if (!providerName || !spotHistory || !spotHistory.length) return null;
    // Find most recent API entry from this provider
    for (let i = spotHistory.length - 1; i >= 0; i--) {
      const entry = spotHistory[i];
      if (entry.source === "api" && entry.provider === providerName) {
        // Parse timestamp string "YYYY-MM-DD HH:MM:SS" to ms
        const ts = new Date(entry.timestamp).getTime();
        if (!isNaN(ts)) return ts;
      }
    }
  } catch (e) {
    console.warn("Error checking provider sync time:", e);
  }
  return null;
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
 * Fetches today's prices only using individual /latest endpoints (no timeseries).
 * For providers that support batch latest (metals.dev), uses a single call.
 * Cost: 1 API call total (metals.dev batch) or 1 per metal (other providers).
 *
 * @param {string} provider - Provider key from API_PROVIDERS
 * @param {string} apiKey - API key
 * @param {Array} selectedMetals - Array of metal keys to fetch
 * @returns {Promise<Object>} Promise resolving to { silver: 29.50, gold: 2650.00, ... }
 */
const fetchLatestPrices = async (provider, apiKey, selectedMetals) => {
  const providerConfig = API_PROVIDERS[provider];
  if (!providerConfig) throw new Error("Invalid API provider");

  const config = loadApiConfig();
  const usage = config.usage?.[provider] || { quota: DEFAULT_API_QUOTA, used: 0 };
  const results = {};

  // metals.dev supports a batch /latest endpoint returning all metals in one call
  if (provider === "METALS_DEV" && providerConfig.latestBatchEndpoint) {
    try {
      const url = providerConfig.baseUrl + providerConfig.latestBatchEndpoint.replace("{API_KEY}", apiKey);
      const headers = { "Content-Type": "application/json" };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

      const response = await fetch(url, { method: "GET", headers, mode: "cors" });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const data = await response.json();
      usage.used++;

      const parsed = providerConfig.parseLatestBatchResponse(data);
      selectedMetals.forEach((metal) => {
        if (parsed[metal] && parsed[metal] > 0) results[metal] = parsed[metal];
      });
    } catch (err) {
      console.warn("Batch latest failed for METALS_DEV, falling back to individual:", err.message);
      // Fall through to individual requests below
    }
  }

  // Individual requests for remaining metals (or all metals for non-batch providers)
  if (Object.keys(results).length < selectedMetals.length) {
    const remaining = selectedMetals.filter((m) => !results[m]);

    if (provider === "CUSTOM") {
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
      for (const metal of remaining) {
        try {
          const endpoint = pattern.replace("{API_KEY}", apiKey).replace("{METAL}", metalCodes[metal]);
          const url = `${base}${endpoint}`;
          const response = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" }, mode: "cors" });
          if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          const data = await response.json();
          usage.used++;
          const price = providerConfig.parseResponse(data, metal);
          if (price && price > 0) results[metal] = price;
        } catch (err) {
          console.warn(`Latest fetch failed for ${metal}:`, err.message);
        }
      }
    } else {
      for (const metal of remaining) {
        const endpoint = providerConfig.endpoints[metal];
        if (!endpoint) continue;
        try {
          const url = `${providerConfig.baseUrl}${endpoint.replace("{API_KEY}", apiKey)}`;
          const headers = { "Content-Type": "application/json" };
          if (provider === "METALS_DEV" && apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
          const response = await fetch(url, { method: "GET", headers, mode: "cors" });
          if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          const data = await response.json();
          usage.used++;
          const price = providerConfig.parseResponse(data, metal);
          if (price && price > 0) results[metal] = price;
        } catch (err) {
          console.warn(`Latest fetch failed for ${metal}:`, err.message);
        }
      }
    }
  }

  if (Object.keys(results).length === 0) {
    throw new Error("No valid prices retrieved from latest endpoints");
  }

  config.usage[provider] = usage;
  saveApiConfig(config);
  return results;
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
      url = url.replace('{API_KEY}', apiKey);
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

    // Compute start/end dates for timeseries endpoints (all providers)
    if (url.includes('{START_DATE}') || url.includes('{END_DATE}')) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - (historyDays || 29));
      const fmt = (d) => d.toISOString().slice(0, 10);
      url = url.replace('{START_DATE}', fmt(start))
              .replace('{END_DATE}', fmt(end));
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
      const metalConfig = Object.values(METALS).find((m) => m.key === metal);
      const metalName = metalConfig?.name || metal;
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
 * Makes API request for spot prices — latest only (no history backfill).
 * Uses fetchLatestPrices() for efficient single-call sync.
 * History pulls are now user-initiated via handleHistoryPull().
 *
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

  // Get selected metals
  const selectedMetals = Object.keys(selected).filter(
    (metal) => selected[metal] !== false,
  );

  if (selectedMetals.length === 0) {
    throw new Error("No metals selected for sync");
  }

  // Latest-only: no history backfill on regular sync
  return await fetchLatestPrices(provider, apiKey, selectedMetals);
};

// =============================================================================
// BATCHED HISTORY PULL
// =============================================================================

/**
 * Splits a total number of days into date range chunks respecting provider limits.
 * @param {number} totalDays - Total days of history to fetch
 * @param {number} maxPerRequest - Maximum days per single API request
 * @returns {Array<{start: Date, end: Date}>} Array of date range chunks (newest first)
 */
const getDateChunks = (totalDays, maxPerRequest) => {
  const chunks = [];
  const today = new Date();
  let remaining = totalDays;
  let endDate = new Date(today);
  while (remaining > 0) {
    const chunkSize = Math.min(remaining, maxPerRequest);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - chunkSize);
    chunks.push({ start: new Date(startDate), end: new Date(endDate) });
    endDate = new Date(startDate);
    remaining -= chunkSize;
  }
  return chunks;
};

/**
 * Fetches historical spot price data in batches, respecting per-provider limits.
 * Generic batching that works across all 3 providers by using their existing
 * batchEndpoint + parseBatchResponse infrastructure.
 *
 * @param {string} provider - Provider key
 * @param {string} apiKey - API key
 * @param {Array<string>} selectedMetals - Metal keys to fetch
 * @param {number} totalDays - Total days of history to pull
 * @returns {Promise<{totalEntries: number, callsMade: number}>} Summary
 */
const fetchHistoryBatched = async (provider, apiKey, selectedMetals, totalDays) => {
  const providerConfig = API_PROVIDERS[provider];
  if (!providerConfig || !providerConfig.batchSupported) {
    throw new Error("Provider does not support history requests");
  }

  const maxPerReq = providerConfig.maxHistoryDays || 30;
  const chunks = getDateChunks(totalDays, maxPerReq);
  const config = loadApiConfig();
  const usage = config.usage?.[provider] || { quota: DEFAULT_API_QUOTA, used: 0 };
  const providerName = providerConfig.name;
  const fmt = (d) => d.toISOString().slice(0, 10);

  // Build symbol groups based on provider capability
  let symbolGroups;
  if (providerConfig.symbolsPerRequest === 1) {
    // One metal per request (e.g., metals-api)
    symbolGroups = selectedMetals.map((m) => [m]);
  } else {
    // All metals in one request
    symbolGroups = [selectedMetals];
  }

  let totalEntries = 0;
  let callsMade = 0;

  for (const chunk of chunks) {
    for (const metals of symbolGroups) {
      let url = providerConfig.baseUrl + providerConfig.batchEndpoint;

      // Replace API key placeholder
      url = url.replace("{API_KEY}", apiKey);

      // Replace date placeholders
      url = url.replace("{START_DATE}", fmt(chunk.start)).replace("{END_DATE}", fmt(chunk.end));

      // Replace symbol/currency placeholders
      if (provider === "METALS_API") {
        const symbolMap = { silver: "XAG", gold: "XAU", platinum: "XPT", palladium: "XPD" };
        const symbols = metals.map((m) => symbolMap[m]).join(",");
        url = url.replace("{SYMBOLS}", symbols);
      } else if (provider === "METAL_PRICE_API") {
        const symbolMap = { silver: "XAG", gold: "XAU", platinum: "XPT", palladium: "XPD" };
        const currencies = metals.map((m) => symbolMap[m]).join(",");
        url = url.replace("{CURRENCIES}", currencies);
      }

      const headers = { "Content-Type": "application/json" };
      if (provider === "METALS_DEV" && apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      try {
        const response = await fetch(url, { method: "GET", headers, mode: "cors" });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        const data = await response.json();
        callsMade++;
        usage.used++;

        const { history = {} } = providerConfig.parseBatchResponse(data) || {};

        Object.entries(history).forEach(([metal, entries]) => {
          if (!selectedMetals.includes(metal)) return;
          const metalConfig = Object.values(METALS).find((m) => m.key === metal);
          const metalName = metalConfig?.name || metal;
          entries.forEach(({ timestamp, price }) => {
            recordSpot(price, "api", metalName, providerName, timestamp);
            totalEntries++;
          });
        });
      } catch (err) {
        console.error(`History batch failed (${fmt(chunk.start)}..${fmt(chunk.end)}):`, err.message);
      }
    }
  }

  // Save updated usage
  config.usage[provider] = usage;
  saveApiConfig(config);

  return { totalEntries, callsMade };
};

/**
 * Handles a user-initiated history pull for a specific provider.
 * Reads the dropdown selection, calculates cost, confirms, and executes.
 *
 * @param {string} provider - Provider key
 */
const handleHistoryPull = async (provider) => {
  const config = loadApiConfig();
  const apiKey = config.keys?.[provider];
  if (!apiKey) {
    alert("No API key configured for this provider. Please save your key first.");
    return;
  }

  const providerConfig = API_PROVIDERS[provider];
  if (!providerConfig || !providerConfig.batchSupported) {
    alert("This provider does not support history pulls.");
    return;
  }

  const selected = config.metals?.[provider] || {};
  const selectedMetals = Object.keys(selected).filter((m) => selected[m] !== false);
  if (selectedMetals.length === 0) {
    alert("No metals selected. Please select at least one metal to track.");
    return;
  }

  const daysSelect = document.getElementById(`historyPullDays_${provider}`);
  const totalDays = daysSelect ? parseInt(daysSelect.value, 10) : 30;

  // Calculate cost
  const maxPerReq = providerConfig.maxHistoryDays || 30;
  const chunks = Math.ceil(totalDays / maxPerReq);
  const symbolGroups = providerConfig.symbolsPerRequest === 1 ? selectedMetals.length : 1;
  const totalCalls = chunks * symbolGroups;

  const usage = config.usage?.[provider] || { quota: DEFAULT_API_QUOTA, used: 0 };
  const remaining = Math.max(0, usage.quota - usage.used);

  const proceed = confirm(
    `Pull ${totalDays} days of history from ${providerConfig.name}.\n\n` +
    `This will use ${totalCalls} API call${totalCalls > 1 ? "s" : ""} ` +
    `(${remaining} remaining this month).\n\nProceed?`
  );
  if (!proceed) return;

  // Disable button during pull
  const btn = document.querySelector(`.api-history-btn[data-provider="${provider}"]`);
  const origText = btn ? btn.textContent : "";
  if (btn) { btn.textContent = "Pulling..."; btn.disabled = true; }

  try {
    const result = await fetchHistoryBatched(provider, apiKey, selectedMetals, totalDays);
    alert(
      `History pull complete!\n\n` +
      `Pulled ${result.totalEntries} data points using ${result.callsMade} API call${result.callsMade > 1 ? "s" : ""}.`
    );
    updateProviderHistoryTables();
    if (typeof updateAllSparklines === "function") updateAllSparklines();
  } catch (err) {
    console.error("History pull failed:", err);
    alert("History pull failed: " + err.message);
  } finally {
    if (btn) { btn.textContent = origText; btn.disabled = false; }
  }
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
  const config = loadApiConfig();
  const hasAnyKey = Object.values(config.keys || {}).some(k => k);

  if (!hasAnyKey) {
    if (showProgress) {
      alert(
        "No Metals API configuration found. Please configure an API provider first.",
      );
    }
    return false;
  }

  // Interactive cache prompt (only when user-initiated with visible UI)
  if (showProgress && !forceSync) {
    const cache = loadApiCache();
    if (cache && cache.data && cache.timestamp) {
      const now = Date.now();
      const cacheAge = now - cache.timestamp;
      const duration = getCacheDurationMs(apiConfig?.provider || config.provider);

      if (cacheAge < duration) {
        const hoursAgo = Math.floor(cacheAge / (1000 * 60 * 60));
        const minutesAgo = Math.floor(cacheAge / (1000 * 60));
        const timeText =
          hoursAgo > 0
            ? `${hoursAgo} hours ago`
            : `${minutesAgo} minutes ago`;

        const override = confirm(
          `Cached prices from ${timeText}.\n\nFetch fresh prices from the API?`,
        );
        if (!override) {
          return refreshFromCache();
        }
      }
    }
  }

  // Delegate to provider chain
  const { updatedCount, anySucceeded, results } = await syncProviderChain({
    showProgress,
    forceSync: forceSync || showProgress, // User-initiated always forces
  });

  if (showProgress && updatedCount > 0) {
    const summary = Object.entries(results)
      .filter(([_, status]) => status !== "skipped")
      .map(([prov, status]) => `${API_PROVIDERS[prov]?.name || prov}: ${status}`)
      .join("\n");
    alert(`Synced ${updatedCount} prices.\n\n${summary}`);
  } else if (showProgress && !anySucceeded) {
    alert("Failed to sync prices from any provider.");
  }

  return anySucceeded;
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
      if (typeof updateAllSparklines === "function") {
        updateAllSparklines();
      }
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
  const { updatedCount } = await syncProviderChain({ showProgress: false, forceSync: true });
  updateProviderHistoryTables();
  return updatedCount;
};

/**
 * Core sync engine — runs providers in priority order respecting sync modes.
 *
 * "Always" providers run unconditionally (subject to cache).
 * "Backup" providers only run if no provider has succeeded yet.
 *
 * @param {Object} opts
 * @param {boolean} opts.showProgress - Show syncing UI state
 * @param {boolean} opts.forceSync    - Ignore per-provider cache
 * @returns {Promise<{results: Object, updatedCount: number, anySucceeded: boolean}>}
 */
const syncProviderChain = async ({ showProgress = false, forceSync = false } = {}) => {
  const config = loadApiConfig();
  const order = getProviderOrder();
  const results = {};
  let updatedCount = 0;
  let anySucceeded = false;

  if (showProgress) {
    updateSyncButtonStates(true);
  }

  try {
    for (const prov of order) {
      const apiKey = config.keys?.[prov];
      if (!apiKey) continue;

      const mode = config.syncMode?.[prov] || getDefaultSyncMode(prov);

      // Skip backup providers when an earlier provider already succeeded
      if (mode === "backup" && anySucceeded) {
        results[prov] = "skipped";
        continue;
      }

      // Check per-provider cache unless forcing
      if (!forceSync) {
        const provDuration = getCacheDurationMs(prov);
        const lastSync = getLastProviderSyncTime(prov);
        if (lastSync && Date.now() - lastSync < provDuration) {
          results[prov] = "cached";
          anySucceeded = true;
          continue;
        }
      }

      // Attempt fetch
      try {
        const data = await fetchSpotPricesFromApi(prov, apiKey);
        let provUpdated = 0;

        Object.entries(data).forEach(([metal, price]) => {
          const metalConfig = Object.values(METALS).find((m) => m.key === metal);
          if (metalConfig && price > 0) {
            localStorage.setItem(metalConfig.spotKey, price.toString());
            spotPrices[metal] = price;
            elements.spotPriceDisplay[metal].textContent = formatCurrency(price);
            updateSpotCardColor(metal, price);
            recordSpot(price, "api", metalConfig.name, API_PROVIDERS[prov].name);
            const ts = document.getElementById(`spotTimestamp${metalConfig.name}`);
            if (ts) updateSpotTimestamp(metalConfig.name);
            provUpdated++;
          }
        });

        if (provUpdated > 0) {
          saveApiCache(data, prov);
          updatedCount += provUpdated;
          anySucceeded = true;
          results[prov] = "success";
          setProviderStatus(prov, "connected");
        } else {
          results[prov] = "no data";
          setProviderStatus(prov, "error");
        }
      } catch (err) {
        console.warn(`Chain sync failed for ${prov}:`, err.message);
        results[prov] = "error";
        setProviderStatus(prov, "error");
      }
    }

    // Post-sync updates if anything changed
    if (updatedCount > 0) {
      updateSummary();
      if (typeof updateStorageStats === "function") updateStorageStats();
      if (typeof updateAllSparklines === "function") updateAllSparklines();
    }
  } finally {
    if (showProgress) {
      updateSyncButtonStates(false);
    }
  }

  return { results, updatedCount, anySucceeded };
};

/**
 * Updates sync button states based on API availability
 * @param {boolean} syncing - Whether sync is in progress
 */
const updateSyncButtonStates = (syncing = false) => {
  const hasApi =
    apiConfig && apiConfig.provider && apiConfig.keys[apiConfig.provider];

  Object.values(METALS).forEach((metalConfig) => {
    // New sparkline card sync icon
    const syncIcon = document.getElementById(`syncIcon${metalConfig.name}`);
    if (syncIcon) {
      syncIcon.disabled = !hasApi || syncing;
      syncIcon.title = hasApi
        ? syncing
          ? "Syncing..."
          : "Sync from API"
        : "Configure API first";
      if (syncing) {
        syncIcon.classList.add("syncing");
      } else {
        syncIcon.classList.remove("syncing");
      }
    }
  });
};

/**
 * Updates API status display in modal
 */
/**
 * Populates the API section fields with current configuration.
 * Called when switching to the API section in the Settings modal.
 */
const populateApiSection = () => {
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

  // Populate Numista tab
  if (typeof catalogConfig !== "undefined" && catalogConfig.getNumistaConfig) {
    const nc = catalogConfig.getNumistaConfig();
    const numistaKeyInput = document.getElementById("numistaApiKey");
    if (numistaKeyInput) numistaKeyInput.value = nc.apiKey || "";
    if (typeof renderNumistaUsageBar === "function") renderNumistaUsageBar();
    // Update Numista status indicator
    const numistaStatusEl = document.getElementById("numistaProviderStatus");
    if (numistaStatusEl) {
      numistaStatusEl.classList.remove("status-connected", "status-disconnected");
      if (nc.apiKey) {
        numistaStatusEl.classList.add("status-connected");
        const dot = numistaStatusEl.querySelector(".status-dot");
        const text = numistaStatusEl.querySelector(".status-text");
        if (dot) dot.style.background = "";
        if (text) text.textContent = "Connected";
      } else {
        numistaStatusEl.classList.add("status-disconnected");
        const text = numistaStatusEl.querySelector(".status-text");
        if (text) text.textContent = "Disconnected";
      }
    }
  }

  // Populate PCGS tab status
  if (typeof catalogConfig !== "undefined" && catalogConfig.isPcgsEnabled) {
    const pcgsStatusEl = document.getElementById("pcgsProviderStatus");
    if (pcgsStatusEl) {
      pcgsStatusEl.classList.remove("status-connected", "status-disconnected");
      if (catalogConfig.isPcgsEnabled()) {
        pcgsStatusEl.classList.add("status-connected");
        const dot = pcgsStatusEl.querySelector(".status-dot");
        const text = pcgsStatusEl.querySelector(".status-text");
        if (dot) dot.style.background = "";
        if (text) text.textContent = "Connected";
      } else {
        pcgsStatusEl.classList.add("status-disconnected");
        const text = pcgsStatusEl.querySelector(".status-text");
        if (text) text.textContent = "Disconnected";
      }
    }
  }

  // Populate metals provider tabs
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

  autoSelectDefaultProvider();
  updateProviderHistoryTables();

  // Initialize provider settings listeners and load saved values
  const cfg = loadApiConfig();
  Object.keys(API_PROVIDERS).forEach(provider => {
    if (typeof setupProviderSettingsListeners === 'function') {
      setupProviderSettingsListeners(provider);
    }

    // Load saved cache timeout
    const cacheSelect = document.getElementById(`cacheTimeout_${provider}`);
    if (cacheSelect) {
      cacheSelect.value = cfg.cacheTimeouts?.[provider] || 24;
    }

    // Initialize history pull cost indicator
    if (typeof updateHistoryPullCost === 'function') {
      updateHistoryPullCost(provider);
    }

    // Load saved metal selections
    const metals = cfg.metals?.[provider] || {};
    ['silver', 'gold', 'platinum', 'palladium'].forEach(metal => {
      const checkbox = document.querySelector(`.provider-metal[data-provider="${provider}"][data-metal="${metal}"]`);
      if (checkbox) {
        checkbox.checked = metals[metal] !== false;
      }
    });

    // Load saved sync mode
    const syncModeToggle = document.getElementById(`syncMode_${provider}`);
    if (syncModeToggle) {
      const mode = cfg.syncMode?.[provider] || getDefaultSyncMode(provider);
      syncModeToggle.querySelectorAll('.chip-sort-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
      });
    }
  });

  // Restore tab ordering from localStorage
  if (typeof loadProviderTabOrder === 'function') {
    loadProviderTabOrder();
  }

  if (typeof refreshProviderStatuses === 'function') {
    refreshProviderStatuses();
  }

  // Wire up spot history export/import buttons
  if (typeof initSpotHistoryButtons === 'function') {
    initSpotHistoryButtons();
  }
};

/**
 * Legacy showApiModal — redirects to Settings modal API section
 */
const showApiModal = () => {
  if (typeof showSettingsModal === "function") {
    showSettingsModal('api');
  }
};

/**
 * Legacy hideApiModal — redirects to hideSettingsModal
 */
const hideApiModal = () => {
  if (typeof hideSettingsModal === "function") {
    hideSettingsModal();
  }
};

/**
 * Legacy showFilesModal — redirects to Settings modal Files section
 */
const showFilesModal = () => {
  if (typeof showSettingsModal === "function") {
    showSettingsModal('files');
  }
};

/**
 * Legacy hideFilesModal — redirects to hideSettingsModal
 */
const hideFilesModal = () => {
  if (typeof hideSettingsModal === "function") {
    hideSettingsModal();
  } else {
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
  window.populateApiSection = populateApiSection;
  window.showProviderInfo = showProviderInfo;
  window.hideProviderInfo = hideProviderInfo;

/**
 * Saves provider settings (key, cache timeout, history days) without testing or fetching
 * @param {string} provider - Provider key
 */
const handleProviderSave = (provider) => {
  const keyInput = document.getElementById(`apiKey_${provider}`);
  if (!keyInput) return;

  const apiKey = keyInput.value.trim();
  const config = loadApiConfig();
  config.keys = { ...(config.keys || {}) };

  if (apiKey) {
    config.keys[provider] = apiKey;
  }

  if (provider === "CUSTOM") {
    const base = document.getElementById("apiBase_CUSTOM")?.value.trim() || "";
    const endpoint = document.getElementById("apiEndpoint_CUSTOM")?.value.trim() || "";
    const format = document.getElementById("apiFormat_CUSTOM")?.value || "symbol";
    config.customConfig = { baseUrl: base, endpoint, format };
  }

  // Persist per-provider settings (cache timeout)
  updateProviderSettings(provider);

  // Re-load after updateProviderSettings saved, then layer key + CUSTOM config on top
  const updated = loadApiConfig();
  updated.keys = { ...(updated.keys || {}) };
  if (apiKey) updated.keys[provider] = apiKey;
  if (provider === "CUSTOM") {
    updated.customConfig = {
      baseUrl: document.getElementById("apiBase_CUSTOM")?.value.trim() || "",
      endpoint: document.getElementById("apiEndpoint_CUSTOM")?.value.trim() || "",
      format: document.getElementById("apiFormat_CUSTOM")?.value || "symbol",
    };
  }
  saveApiConfig(updated);

  updateDefaultProviderButtons();
  updateSyncButtonStates();

  // Brief visual confirmation via status indicator
  const btn = document.querySelector(`.api-save-btn[data-provider="${provider}"]`);
  if (btn) {
    const origText = btn.textContent;
    btn.textContent = "Saved!";
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = origText;
      btn.disabled = false;
    }, 1200);
  }
};

window.handleProviderSave = handleProviderSave;
window.handleProviderSync = handleProviderSync;
window.clearApiKey = clearApiKey;
window.clearApiCache = clearApiCache;
window.setDefaultProvider = setDefaultProvider;
window.showApiHistoryModal = showApiHistoryModal;
window.hideApiHistoryModal = hideApiHistoryModal;
window.clearApiHistory = clearApiHistory;
window.syncAllProviders = syncAllProviders;
window.syncProviderChain = syncProviderChain;
window.autoSyncSpotPrices = autoSyncSpotPrices;
window.handleHistoryPull = handleHistoryPull;
window.updateHistoryPullCost = updateHistoryPullCost;
window.fetchHistoryBatched = fetchHistoryBatched;

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
    const apiInfo = `# StakTrakr - Complete Backup

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

*This backup was created by StakTrakr v${APP_VERSION}*
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
// SPOT HISTORY EXPORT/IMPORT
// =============================================================================

/**
 * Exports all spot history data as a CSV file
 */
const exportSpotHistory = () => {
  loadSpotHistory();
  if (!spotHistory.length) {
    alert("No spot history to export.");
    return;
  }

  const csv = Papa.unparse([
    ["Timestamp", "Metal", "Price", "Source", "Provider"],
    ...spotHistory.map((e) => [
      e.timestamp,
      e.metal,
      e.spot,
      e.source,
      e.provider || "",
    ]),
  ]);
  downloadFile(
    `spot-history-${new Date().toISOString().slice(0, 10)}.csv`,
    csv,
    "text/csv",
  );
};

/**
 * Imports spot history data from a CSV or JSON file
 * @param {File} file - File to import
 */
const importSpotHistory = (file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    let entries = [];
    try {
      if (file.name.endsWith(".json")) {
        const parsed = JSON.parse(e.target.result);
        // Support both flat array and { history: [...] } wrapper
        entries = Array.isArray(parsed) ? parsed : parsed.history || [];
      } else {
        const parsed = Papa.parse(e.target.result, { header: true });
        entries = parsed.data
          .map((row) => ({
            timestamp: row.Timestamp,
            metal: row.Metal,
            spot: parseFloat(row.Price),
            source: row.Source || "import",
            provider: row.Provider || "import",
          }))
          .filter((entry) => entry.timestamp && entry.metal && entry.spot > 0);
      }
    } catch (err) {
      alert("Failed to parse file: " + err.message);
      return;
    }

    if (entries.length === 0) {
      alert("No valid entries found in file.");
      return;
    }

    loadSpotHistory();
    let imported = 0;
    entries.forEach((entry) => {
      recordSpot(
        entry.spot,
        entry.source || "import",
        entry.metal,
        entry.provider || "import",
        entry.timestamp,
      );
      imported++;
    });

    alert(`Imported ${imported} spot history entries.`);
    if (typeof updateAllSparklines === "function") updateAllSparklines();

    // Refresh the visible history table after import
    apiHistoryEntries = spotHistory.filter((e) => e.source === "api");
    renderApiHistoryTable();
  };
  reader.readAsText(file);
};

/**
 * Wires up spot history export/import button event listeners.
 * Called during populateApiSection() or init.
 */
const initSpotHistoryButtons = () => {
  const exportBtn = document.getElementById("exportSpotHistoryBtn");
  if (exportBtn) exportBtn.addEventListener("click", exportSpotHistory);

  const importBtn = document.getElementById("importSpotHistoryBtn");
  const importFile = document.getElementById("importSpotHistoryFile");
  if (importBtn && importFile) {
    importBtn.addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        importSpotHistory(e.target.files[0]);
        e.target.value = ""; // Reset so same file can be re-imported
      }
    });
  }
};

window.exportSpotHistory = exportSpotHistory;
window.importSpotHistory = importSpotHistory;
window.initSpotHistoryButtons = initSpotHistoryButtons;

// =============================================================================

// CONFIGURATION & GLOBAL CONSTANTS
/**
 * API Provider configurations for metals pricing services
 *
 * Each provider configuration contains:
 * @property {string} name - Display name for the provider
 * @property {string} baseUrl - Base API endpoint URL
 * @property {Object} endpoints - API endpoints for different metals
 * @property {function} parseResponse - Function to parse API response into standard format
 * @property {string} documentation - URL to provider's API documentation
 * @property {boolean} batchSupported - Whether provider supports batch requests
 * @property {string} batchEndpoint - Batch request endpoint pattern
 * @property {function} parseBatchResponse - Function to parse batch API response
 */
const API_PROVIDERS = {
  METALS_DEV: {
    name: "Metals.dev",
    baseUrl: "https://api.metals.dev/v1",
    endpoints: {
      silver: "/metal/spot?api_key={API_KEY}&metal=silver&currency=USD",
      gold: "/metal/spot?api_key={API_KEY}&metal=gold&currency=USD",
      platinum: "/metal/spot?api_key={API_KEY}&metal=platinum&currency=USD",
      palladium: "/metal/spot?api_key={API_KEY}&metal=palladium&currency=USD",
    },
    parseResponse: (data) => data.rate?.price || null,
    documentation: "https://www.metals.dev/docs",
    batchSupported: true,
    batchEndpoint: "/metals/spot?api_key={API_KEY}&metals={METALS}&days={DAYS}&currency=USD",
    parseBatchResponse: (data) => {
      const current = {};
      const history = {};
      if (Array.isArray(data?.data)) {
        data.data.forEach((entry) => {
          const ts =
            entry.timestamp || entry.datetime || entry.date || entry.time || entry[0];
          const metalsData = entry.metals || entry.prices || entry;
          Object.entries(metalsData).forEach(([metal, val]) => {
            if (["timestamp", "datetime", "date", "time"].includes(metal)) return;
            const hPrice =
              val.price || val.rate?.price || val.value || val;
            if (hPrice) {
              const key = metal.toLowerCase();
              if (!history[key]) history[key] = [];
              const tsNorm =
                typeof ts === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ts)
                  ? `${ts} 00:00:00`
                  : ts;
              history[key].push({ timestamp: tsNorm, price: hPrice });
              current[key] = hPrice;
            }
          });
        });
      } else if (data?.data) {
        Object.entries(data.data).forEach(([metal, info]) => {
          const price = info.price || info.rate?.price || null;
          if (price) current[metal] = price;
          if (info.history) {
            const entries = [];
            if (Array.isArray(info.history)) {
              info.history.forEach((h) => {
                const hPrice = h.price || h.rate?.price || h.value;
                const ts =
                  h.timestamp || h.datetime || h.date || h.time || h[0];
                if (hPrice && ts) {
                  const tsNorm =
                    typeof ts === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ts)
                      ? `${ts} 00:00:00`
                      : ts;
                  entries.push({ timestamp: tsNorm, price: hPrice });
                }
              });
            } else if (typeof info.history === "object") {
              Object.entries(info.history).forEach(([ts, val]) => {
                const hPrice =
                  typeof val === "object"
                    ? val.price || val.rate?.price || val.value
                    : val;
                if (hPrice) {
                  const tsNorm =
                    typeof ts === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ts)
                      ? `${ts} 00:00:00`
                      : ts;
                  entries.push({ timestamp: tsNorm, price: hPrice });
                }
              });
            }
            if (entries.length) history[metal] = entries;
          }
        });
      }
      return { current, history };
    },
  },
  METALS_API: {
    name: "Metals-API.com",
    baseUrl: "https://metals-api.com/api",
    endpoints: {
      silver: "/latest?access_key={API_KEY}&base=USD&symbols=XAG",
      gold: "/latest?access_key={API_KEY}&base=USD&symbols=XAU",
      platinum: "/latest?access_key={API_KEY}&base=USD&symbols=XPT",
      palladium: "/latest?access_key={API_KEY}&base=USD&symbols=XPD",
    },
    parseResponse: (data, metal) => {
      // Expected format: { "success": true, "rates": { "XAG": 0.04 } }
      const metalCode =
        metal === "silver"
          ? "XAG"
          : metal === "gold"
            ? "XAU"
            : metal === "platinum"
              ? "XPT"
              : "XPD";
      const rate = data.rates?.[metalCode];
      return rate ? 1 / rate : null; // Convert from metal per USD to USD per ounce
    },
    documentation: "https://metals-api.com/documentation",
    batchSupported: true,
    batchEndpoint: "/latest?access_key={API_KEY}&base=USD&symbols={SYMBOLS}",
    parseBatchResponse: (data) => {
      const current = {};
      const history = {};
      const symbolMap = {
        XAG: "silver",
        XAU: "gold",
        XPT: "platinum",
        XPD: "palladium",
      };
      if (data.rates) {
        const firstKey = Object.keys(data.rates)[0];
        if (
          firstKey &&
          typeof data.rates[firstKey] === "object" &&
          /^\d{4}-\d{2}-\d{2}$/.test(firstKey)
        ) {
          // Timeseries format: { date: { symbol: rate } }
          Object.entries(data.rates).forEach(([date, symbols]) => {
            Object.entries(symbols).forEach(([symbol, rate]) => {
              const metal = symbolMap[symbol];
              if (metal && rate) {
                const price = 1 / rate;
                if (!history[metal]) history[metal] = [];
                history[metal].push({
                  timestamp: `${date} 00:00:00`,
                  price,
                });
                current[metal] = price;
              }
            });
          });
        } else {
          Object.entries(data.rates).forEach(([symbol, rate]) => {
            const metal = symbolMap[symbol];
            if (metal && rate) current[metal] = 1 / rate;
          });
        }
      }
      return { current, history };
    },
  },
  METAL_PRICE_API: {
    name: "MetalPriceAPI.com",
    baseUrl: "https://api.metalpriceapi.com/v1",
    endpoints: {
      silver: "/latest?api_key={API_KEY}&base=USD&currencies=XAG",
      gold: "/latest?api_key={API_KEY}&base=USD&currencies=XAU",
      platinum: "/latest?api_key={API_KEY}&base=USD&currencies=XPT",
      palladium: "/latest?api_key={API_KEY}&base=USD&currencies=XPD",
    },
    parseResponse: (data, metal) => {
      // Expected format: { "success": true, "rates": { "XAG": 0.04 } }
      const metalCode =
        metal === "silver"
          ? "XAG"
          : metal === "gold"
            ? "XAU"
            : metal === "platinum"
              ? "XPT"
              : "XPD";
      const rate = data.rates?.[metalCode];
      return rate ? 1 / rate : null; // Convert from metal per USD to USD per ounce
    },
    documentation: "https://metalpriceapi.com/documentation",
    batchSupported: true,
    batchEndpoint: "/latest?api_key={API_KEY}&base=USD&currencies={CURRENCIES}",
    parseBatchResponse: (data) => {
      const current = {};
      const history = {};
      const symbolMap = {
        XAG: "silver",
        XAU: "gold",
        XPT: "platinum",
        XPD: "palladium",
      };
      if (data.rates) {
        const firstKey = Object.keys(data.rates)[0];
        if (
          firstKey &&
          typeof data.rates[firstKey] === "object" &&
          /^\d{4}-\d{2}-\d{2}$/.test(firstKey)
        ) {
          Object.entries(data.rates).forEach(([date, symbols]) => {
            Object.entries(symbols).forEach(([symbol, rate]) => {
              const metal = symbolMap[symbol];
              if (metal && rate) {
                const price = 1 / rate;
                if (!history[metal]) history[metal] = [];
                history[metal].push({
                  timestamp: `${date} 00:00:00`,
                  price,
                });
                current[metal] = price;
              }
            });
          });
        } else {
          Object.entries(data.rates).forEach(([symbol, rate]) => {
            const metal = symbolMap[symbol];
            if (metal && rate) current[metal] = 1 / rate;
          });
        }
      }
      return { current, history };
    },
  },
  CUSTOM: {
    name: "Custom Provider",
    baseUrl: "",
    endpoints: {
      silver: "",
      gold: "",
      platinum: "",
      palladium: "",
    },
    parseResponse: (data) => {
      if (typeof data === "number") return data;
      if (data.price) return data.price;
      if (data.rate && typeof data.rate === "number") return data.rate;
      return null;
    },
    documentation: "",
    custom: true,
    batchSupported: false, // Custom providers will use individual requests by default
    batchEndpoint: "",
    parseBatchResponse: (data) => {
      // Custom batch parsing would depend on the provider's API format
      return { current: {}, history: {} };
    },
  },
};

// =============================================================================

/**
 * @constant {string} APP_VERSION - Application version
 * Follows BRANCH.RELEASE.PATCH.state format
 * State codes: a=alpha, b=beta, rc=release candidate
 * Example: 3.03.02a → branch 3, release 03, patch 02, alpha
 * Updated: 2025-08-15 - Price column styling consistency fixes
 */

const APP_VERSION = "3.04.87";

/**
 * @constant {string} DEFAULT_CURRENCY - Default currency code for monetary formatting
 */
const DEFAULT_CURRENCY = "USD";


/**
 * Returns formatted version string
 *
 * @param {string} [prefix="v"] - Prefix to add before version
 * @returns {string} Formatted version string (e.g., "v3.03.07b")
 */
const getVersionString = (prefix = "v") => `${prefix}${APP_VERSION}`;

/**
 * Template replacement functions for documentation
 * Used by build process to replace {{TEMPLATE}} variables
 */
const getTemplateVariables = () => ({
  VERSION: APP_VERSION,
  VERSION_WITH_V: `v${APP_VERSION}`,
  VERSION_TITLE: `StackrTrackr v${APP_VERSION}`,
  VERSION_BRANCH: APP_VERSION.split('.').slice(0, 2).join('.') + '.x',
  BRANDING_NAME: BRANDING_TITLE
});

/**
 * Replaces template variables in text
 * @param {string} text - Text containing {{VARIABLE}} placeholders
 * @returns {string} Text with variables replaced
 */
const replaceTemplateVariables = (text) => {
  const variables = getTemplateVariables();
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
};

/** Maximum upload size in bytes for local imports (2MB) */
const MAX_LOCAL_FILE_SIZE = 2 * 1024 * 1024;

/** Flag indicating whether cloud backup is enabled */
let cloudBackupEnabled = false;

/**
 * Inserts formatted version string into a target element
 *
 * @param {string} elementId - ID of the element to update
 * @param {string} [prefix="v"] - Prefix to add before version
 */
const injectVersionString = (elementId, prefix = "v") => {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = getVersionString(prefix);
  }
};

/** @constant {string} BRANDING_TITLE - Optional custom application title */
const BRANDING_TITLE = "StackrTrackr";

/**
 * Domain-based branding configuration
 *
 * @property {Object.<string,string>} domainMap - Map of domain keywords to
 * custom display names. Keys are compared in lowercase and may omit the
 * domain extension when `removeExtension` is true.
 * @property {boolean} removeExtension - When true, strips the domain
 * extension (e.g. ".com") before lookup
 * @property {boolean} alwaysOverride - When true, domain mapping overrides
 * `BRANDING_TITLE` across the entire application
 */
const BRANDING_DOMAIN_OPTIONS = {
  domainMap: {
    stackertracker: "Stacker Tracker",
    stackrtrackr: "StackrTrackr",
  },
  removeExtension: true,
  alwaysOverride: false,
};

/**
 * Title detected from the current domain or null if no mapping found
 *
 * Falls back to `BRANDING_TITLE` when running under file:// or no domain is
 * detected.
 * @constant {string|null}
 */
const BRANDING_DOMAIN_OVERRIDE =
  typeof window !== "undefined" && window.location && window.location.hostname
    ? (() => {
        let host = window.location.hostname.toLowerCase();
        if (BRANDING_DOMAIN_OPTIONS.removeExtension) {
          const parts = host.split(".");
          if (parts.length > 1) {
            host = parts[0];
          }
        }
        return BRANDING_DOMAIN_OPTIONS.domainMap[host] || null;
      })()
    : null;

/** @constant {string} LS_KEY - LocalStorage key for inventory data */
const LS_KEY = "metalInventory";

/** @constant {string} SERIAL_KEY - LocalStorage key for inventory serial counter */
const SERIAL_KEY = "inventorySerial";

/** @constant {string} CATALOG_MAP_KEY - LocalStorage key for S#/N# associations */
const CATALOG_MAP_KEY = "catalogMap";

/** @constant {string} SPOT_HISTORY_KEY - LocalStorage key for spot price history */
const SPOT_HISTORY_KEY = "metalSpotHistory";

/** @constant {string} THEME_KEY - LocalStorage key for theme preference */
const THEME_KEY = "appTheme";

/** @constant {string} ACK_DISMISSED_KEY - LocalStorage key for acknowledgment dismissal */
const ACK_DISMISSED_KEY = "ackDismissed";

/** @constant {string} API_KEY_STORAGE_KEY - LocalStorage key for API provider information */
const API_KEY_STORAGE_KEY = "metalApiConfig";

/** @constant {string} API_CACHE_KEY - LocalStorage key for cached API data */
const API_CACHE_KEY = "metalApiCache";

/** @constant {string} LAST_CACHE_REFRESH_KEY - LocalStorage key for last cache refresh timestamp */
const LAST_CACHE_REFRESH_KEY = "lastCacheRefresh";

/** @constant {string} LAST_API_SYNC_KEY - LocalStorage key for last API sync timestamp */
const LAST_API_SYNC_KEY = "lastApiSync";

/** @constant {string} APP_VERSION_KEY - LocalStorage key for current app version */
const APP_VERSION_KEY = "currentAppVersion";

/** @constant {string} VERSION_ACK_KEY - LocalStorage key for acknowledged app version */
const VERSION_ACK_KEY = "ackVersion";

/** @constant {string} FEATURE_FLAGS_KEY - LocalStorage key for feature flags */
const FEATURE_FLAGS_KEY = "featureFlags";

/**
 * List of recognized localStorage keys for cleanup validation
 * @constant {string[]}
 */
const ALLOWED_STORAGE_KEYS = [
  LS_KEY,
  SERIAL_KEY,
  CATALOG_MAP_KEY,
  SPOT_HISTORY_KEY,
  THEME_KEY,
  ACK_DISMISSED_KEY,
  API_KEY_STORAGE_KEY,
  API_CACHE_KEY,
  LAST_CACHE_REFRESH_KEY,
  LAST_API_SYNC_KEY,
  APP_VERSION_KEY,
  VERSION_ACK_KEY,
  FEATURE_FLAGS_KEY,
  "spotSilver",
  "spotGold",
  "spotPlatinum",
  "spotPalladium",
  "chipMinCount",
  "changeLog",
  "autocomplete_lookup_cache",
  "autocomplete_cache_timestamp",
  "stackrtrackr.debug",
];

// Persist current application version for comparison on future loads
try {
  localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
} catch (e) {
  console.warn("Unable to store app version", e);
}

/**
 * @constant {number} DEFAULT_API_CACHE_DURATION - Default cache duration in milliseconds (24 hours)
 */
const DEFAULT_API_CACHE_DURATION = 24 * 60 * 60 * 1000;

/** @constant {number} DEFAULT_API_QUOTA - Default monthly API call quota */
const DEFAULT_API_QUOTA = 100;

/** @constant {boolean} DEV_MODE - Enables verbose debug logging when true */
const DEV_MODE = false;

/**
 * Global debug flag, can be toggled via DEV_MODE or `?debug` query parameter
 * @constant {boolean}
 */
let DEBUG = DEV_MODE;

if (typeof window !== "undefined") {
  const params = new URLSearchParams(window.location.search);
  if (params.has("debug")) {
    const value = params.get("debug");
    DEBUG = value === null || value === "" || value === "1" || value === "true";
  }
}

// =============================================================================
// FEATURE FLAGS SYSTEM
// =============================================================================

/**
 * Feature flags configuration
 * Controls experimental features and gradual rollouts
 * 
 * Each feature flag contains:
 * @property {boolean} enabled - Default enabled state
 * @property {boolean} urlOverride - Allow URL parameter override
 * @property {boolean} userToggle - Allow user preference toggle
 * @property {string} description - Human-readable description
 * @property {string} phase - Development phase (dev/testing/beta/stable)
 */
const FEATURE_FLAGS = {
  FUZZY_AUTOCOMPLETE: {
    enabled: false,
    urlOverride: true,
    userToggle: true,
    description: "Fuzzy search autocomplete for item names and locations",
    phase: "testing"
  },
  DEBUG_UI: {
    enabled: false,
    urlOverride: true,
    userToggle: false,
    description: "Debug UI indicators and development tools",
    phase: "dev"
  },
  GROUPED_NAME_CHIPS: {
    enabled: true,
    urlOverride: true,
    userToggle: true,
    description: "Group item names by base name (e.g., 'American Silver Eagle (3)' instead of separate year chips)",
    phase: "beta"
  }
};

/**
 * Feature state management class
 * Handles URL parameters, localStorage persistence, and runtime toggles
 */
class FeatureFlags {
  constructor() {
    this.state = this.loadFeatureState();
    this.listeners = new Map();
    this.initializeFromUrl();
  }

  /**
   * Load feature state from localStorage with defaults
   * @returns {Object} Current feature state
   */
  loadFeatureState() {
    try {
      const stored = localStorage.getItem(FEATURE_FLAGS_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      
      // Merge with defaults
      const state = {};
      for (const [key, config] of Object.entries(FEATURE_FLAGS)) {
        state[key] = parsed[key] !== undefined ? parsed[key] : config.enabled;
      }
      
      return state;
    } catch (e) {
      console.warn('Failed to load feature flags from localStorage:', e);
      return this.getDefaultState();
    }
  }

  /**
   * Get default feature state from configuration
   * @returns {Object} Default feature state
   */
  getDefaultState() {
    const state = {};
    for (const [key, config] of Object.entries(FEATURE_FLAGS)) {
      state[key] = config.enabled;
    }
    return state;
  }

  /**
   * Initialize feature flags from URL parameters
   */
  initializeFromUrl() {
    if (typeof window === "undefined") return;
    
    const params = new URLSearchParams(window.location.search);
    let changed = false;
    
    for (const [key, config] of Object.entries(FEATURE_FLAGS)) {
      if (!config.urlOverride) continue;
      
      const paramName = key.toLowerCase();
      if (params.has(paramName)) {
        const value = params.get(paramName);
        const enabled = value === null || value === "" || value === "1" || value === "true";
        
        if (this.state[key] !== enabled) {
          this.state[key] = enabled;
          changed = true;
          
          if (DEBUG) {
            console.log(`Feature flag ${key} set to ${enabled} via URL parameter`);
          }
        }
      }
    }
    
    if (changed) {
      this.saveFeatureState();
      this.notifyListeners();
    }
  }

  /**
   * Save current feature state to localStorage
   */
  saveFeatureState() {
    try {
      localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save feature flags to localStorage:', e);
    }
  }

  /**
   * Check if a feature is enabled
   * @param {string} feature - Feature flag key
   * @returns {boolean} Whether the feature is enabled
   */
  isEnabled(feature) {
    return this.state[feature] === true;
  }

  /**
   * Enable a feature
   * @param {string} feature - Feature flag key
   * @param {boolean} [persist=true] - Whether to save to localStorage
   */
  enable(feature, persist = true) {
    if (this.state[feature] !== true) {
      this.state[feature] = true;
      if (persist) this.saveFeatureState();
      this.notifyListeners(feature);
      
      if (DEBUG) {
        console.log(`Feature ${feature} enabled`);
      }
    }
  }

  /**
   * Disable a feature
   * @param {string} feature - Feature flag key
   * @param {boolean} [persist=true] - Whether to save to localStorage
   */
  disable(feature, persist = true) {
    if (this.state[feature] !== false) {
      this.state[feature] = false;
      if (persist) this.saveFeatureState();
      this.notifyListeners(feature);
      
      if (DEBUG) {
        console.log(`Feature ${feature} disabled`);
      }
    }
  }

  /**
   * Toggle a feature on/off
   * @param {string} feature - Feature flag key
   * @param {boolean} [persist=true] - Whether to save to localStorage
   * @returns {boolean} New state after toggle
   */
  toggle(feature, persist = true) {
    const config = FEATURE_FLAGS[feature];
    if (!config || !config.userToggle) {
      console.warn(`Feature ${feature} cannot be toggled by user`);
      return this.state[feature];
    }
    
    if (this.state[feature]) {
      this.disable(feature, persist);
    } else {
      this.enable(feature, persist);
    }
    
    return this.state[feature];
  }

  /**
   * Reset all features to default state
   */
  reset() {
    this.state = this.getDefaultState();
    this.saveFeatureState();
    this.notifyListeners();
    
    if (DEBUG) {
      console.log('All feature flags reset to defaults');
    }
  }

  /**
   * Get current state of all features
   * @returns {Object} Current feature state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Get feature configuration
   * @param {string} feature - Feature flag key
   * @returns {Object|null} Feature configuration or null if not found
   */
  getConfig(feature) {
    return FEATURE_FLAGS[feature] || null;
  }

  /**
   * Get all feature configurations
   * @returns {Object} All feature configurations
   */
  getAllConfigs() {
    return { ...FEATURE_FLAGS };
  }

  /**
   * Add a listener for feature state changes
   * @param {string} feature - Feature to listen for (or 'all' for all changes)
   * @param {Function} callback - Callback function (feature, enabled, oldEnabled)
   */
  addListener(feature, callback) {
    if (!this.listeners.has(feature)) {
      this.listeners.set(feature, new Set());
    }
    this.listeners.get(feature).add(callback);
  }

  /**
   * Remove a listener for feature state changes
   * @param {string} feature - Feature to stop listening for
   * @param {Function} callback - Callback function to remove
   */
  removeListener(feature, callback) {
    const featureListeners = this.listeners.get(feature);
    if (featureListeners) {
      featureListeners.delete(callback);
      if (featureListeners.size === 0) {
        this.listeners.delete(feature);
      }
    }
  }

  /**
   * Notify listeners of feature state changes
   * @param {string} [changedFeature] - Specific feature that changed (optional)
   */
  notifyListeners(changedFeature = null) {
    // Notify 'all' listeners
    const allListeners = this.listeners.get('all');
    if (allListeners) {
      allListeners.forEach(callback => {
        try {
          callback(changedFeature, this.state);
        } catch (e) {
          console.error('Error in feature flag listener:', e);
        }
      });
    }
    
    // Notify specific feature listeners
    if (changedFeature) {
      const featureListeners = this.listeners.get(changedFeature);
      if (featureListeners) {
        const enabled = this.state[changedFeature];
        featureListeners.forEach(callback => {
          try {
            callback(changedFeature, enabled);
          } catch (e) {
            console.error('Error in feature flag listener:', e);
          }
        });
      }
    }
  }

  /**
   * Get debug information about feature flags
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    return {
      state: this.getState(),
      configs: this.getAllConfigs(),
      urlParams: typeof window !== "undefined" ? 
        Object.fromEntries(new URLSearchParams(window.location.search)) : {},
      localStorage: (() => {
        try {
          return JSON.parse(localStorage.getItem(FEATURE_FLAGS_KEY) || '{}');
        } catch (e) {
          return null;
        }
      })()
    };
  }
}

/**
 * Global feature flags instance
 * @constant {FeatureFlags}
 */
const featureFlags = new FeatureFlags();

/**
 * Convenience functions for common feature flag operations
 */
const isFeatureEnabled = (feature) => featureFlags.isEnabled(feature);
const enableFeature = (feature, persist = true) => featureFlags.enable(feature, persist);
const disableFeature = (feature, persist = true) => featureFlags.disable(feature, persist);
const toggleFeature = (feature, persist = true) => featureFlags.toggle(feature, persist);

/**
 * Log feature flag state on initialization (debug mode only)
 */
if (DEBUG && typeof window !== "undefined") {
  console.log('Feature Flags initialized:', featureFlags.getDebugInfo());
}

/**
 * Metal configuration object - Central registry for all metal-related information
 *
 * This configuration drives the entire application's metal handling by defining:
 * - Display names for user interface elements
 * - Key identifiers for data structures and calculations
 * - DOM element ID patterns for dynamic element selection
 * - LocalStorage keys for persistent data storage
 * - CSS color variables for styling and theming
 *
 * Each metal configuration contains:
 * @property {string} name - Display name used in UI elements and forms
 * @property {string} key - Lowercase identifier for data objects and calculations
 * @property {string} spotKey - DOM ID pattern for spot price input elements
 * @property {string} localStorageKey - Key for storing spot prices in localStorage
 * @property {string} color - CSS custom property name for metal-specific styling
 *
 * Adding a new metal type requires:
 * 1. Adding configuration here
 * 2. Adding corresponding HTML elements following the naming pattern
 * 3. Adding CSS custom properties for colors
 * 4. The application will automatically handle the rest through iteration
 */
const METALS = {
  SILVER: {
    name: "Silver",
    key: "silver",
    spotKey: "spotSilver",
    localStorageKey: "spotSilver",
    color: "silver",
    defaultPrice: 25.0,
  },
  GOLD: {
    name: "Gold",
    key: "gold",
    spotKey: "spotGold",
    localStorageKey: "spotGold",
    color: "gold",
    defaultPrice: 2500.0,
  },
  PLATINUM: {
    name: "Platinum",
    key: "platinum",
    spotKey: "spotPlatinum",
    localStorageKey: "spotPlatinum",
    color: "platinum",
    defaultPrice: 1000.0,
  },
  PALLADIUM: {
    name: "Palladium",
    key: "palladium",
    spotKey: "spotPalladium",
    localStorageKey: "spotPalladium",
    color: "palladium",
    defaultPrice: 1000.0,
  },
};

// =============================================================================

// Expose globals
if (typeof window !== "undefined") {
  window.API_PROVIDERS = API_PROVIDERS;
  window.METALS = METALS;
  window.DEBUG = DEBUG;
  window.DEFAULT_CURRENCY = DEFAULT_CURRENCY;
  window.MAX_LOCAL_FILE_SIZE = MAX_LOCAL_FILE_SIZE;
  window.BRANDING_DOMAIN_OPTIONS = BRANDING_DOMAIN_OPTIONS;
  window.BRANDING_DOMAIN_OVERRIDE = BRANDING_DOMAIN_OVERRIDE;
  window.getTemplateVariables = getTemplateVariables;
  window.replaceTemplateVariables = replaceTemplateVariables;
  
  // Feature flags system
  window.FEATURE_FLAGS = FEATURE_FLAGS;
  window.featureFlags = featureFlags;
  window.isFeatureEnabled = isFeatureEnabled;
  window.enableFeature = enableFeature;
  window.disableFeature = disableFeature;
  window.toggleFeature = toggleFeature;
  window.ALLOWED_STORAGE_KEYS = ALLOWED_STORAGE_KEYS;
}

// Expose APP_VERSION globally for non-module usage
(function() {
  if (typeof window !== 'undefined') {
    window.APP_VERSION = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : "0.0.0";
  }
})();

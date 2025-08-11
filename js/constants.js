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
  },
};

// =============================================================================

/**
 * @constant {string} APP_VERSION - Application version
 * Follows BRANCH.RELEASE.PATCH.state format
 * State codes: a=alpha, b=beta, rc=release candidate
 * Example: 3.03.02a → branch 3, release 03, patch 02, alpha
 */

const APP_VERSION = "3.03.08k";


/**
 * Returns formatted version string
 *
 * @param {string} [prefix="v"] - Prefix to add before version
 * @returns {string} Formatted version string (e.g., "v3.03.07b")
 */
const getVersionString = (prefix = "v") => `${prefix}${APP_VERSION}`;

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
const BRANDING_TITLE = "StackTrackr";

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
    stacktrackr: "Stack Trackr",
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

/** @constant {string} NUMISTA_RAW_KEY - LocalStorage key for raw Numista CSV data */
const NUMISTA_RAW_KEY = "numistaRawData";

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

/** @constant {string} APP_VERSION_KEY - LocalStorage key for current app version */
const APP_VERSION_KEY = "currentAppVersion";

/** @constant {string} VERSION_ACK_KEY - LocalStorage key for acknowledged app version */
const VERSION_ACK_KEY = "ackVersion";

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
  window.BRANDING_DOMAIN_OPTIONS = BRANDING_DOMAIN_OPTIONS;
  window.BRANDING_DOMAIN_OVERRIDE = BRANDING_DOMAIN_OVERRIDE;
}

// Minimal LZString subset placeholder providing UTF16 compression helpers.
// Original implementation removed due to parse issues; these functions act as no-ops
// but maintain the same API for compression helpers used elsewhere.
const LZString = {
  compressToUTF16: (input) => input,
  decompressFromUTF16: (input) => input
};

// UTILITY FUNCTIONS

/**
 * Logs messages to console when DEBUG flag is enabled
 *
 * @param {...any} args - Values to log when debugging
 */
const debugLog = (...args) => {
  if (DEBUG) {
    console.log(...args);
  }
};
/**
 * Gets the active branding name considering domain overrides
 *
 * @returns {string} Active branding name
 */
let brandingWarned = false;
const getBrandingName = () => {
  if (
    !BRANDING_DOMAIN_OVERRIDE &&
    !brandingWarned &&
    typeof window !== "undefined" &&
    window.location &&
    window.location.hostname
  ) {
    console.warn(
      `No branding mapping found for domain: ${window.location.hostname}`
    );
    brandingWarned = true;
  }
  return BRANDING_DOMAIN_OVERRIDE || BRANDING_TITLE;
};

/**
 * Returns full application title with version when no branding is configured
 *
 * @param {string} [baseTitle='StackrTrackr'] - Base application title
 * @returns {string} Full title with version or branding name
 */
const getAppTitle = (baseTitle = "StackrTrackr") => {
  const brand = getBrandingName();
  return brand && brand.trim() ? brand : `${baseTitle} ${getVersionString()}`;
};

/**
 * Determines active domain for footer copyright
 *
 * @returns {string} Domain name to display
 */
const getFooterDomain = () => {
  const host = window.location.hostname.toLowerCase();
  if (host.includes("stackrtrackr.com")) return "stackrtrackr.com";
  if (host.includes("stackertrackr.com")) return "stackertrackr.com";
  return "stackrtrackr.com";
};

/**
 * Performance monitoring utility
 *
 * @param {Function} fn - Function to monitor
 * @param {string} name - Name for logging
 * @param {...any} args - Arguments to pass to function
 * @returns {any} Result of function execution
 */
const monitorPerformance = (fn, name, ...args) => {
  const startTime = performance.now();
  const result = fn(...args);
  const endTime = performance.now();

  const duration = endTime - startTime;
  if (duration > 100) {
    console.warn(`Performance warning: ${name} took ${duration.toFixed(2)}ms`);
  } else {
    debugLog(`Performance: ${name} took ${duration.toFixed(2)}ms`);
  }

  return result;
};

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was
 * invoked. The debounced function comes with a `cancel` method to cancel
 * delayed `func` invocations and a `flush` method to immediately invoke them.
 *
 * @param {Function} func The function to debounce.
 * @param {number} wait The number of milliseconds to delay.
 * @returns {Function} Returns the new debounced function.
 */
const debounce = (func, wait) => {
  let timeout;
  let result;

  const later = (context, args) => {
    timeout = null;
    if (args) {
      result = func.apply(context, args);
    }
  };

  const debounced = function(...args) {
    const context = this;
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => later(context, args), wait);
    return result;
  };

  debounced.cancel = () => {
    clearTimeout(timeout);
    timeout = null;
  };

  debounced.flush = () => {
    if (timeout) {
      debounced.cancel();
      later(this, []);
    }
  };

  return debounced;
};

/**
 * Checks if a file exceeds the local upload size limit
 *
 * @param {File} file - File to validate
 * @returns {boolean} True if file is within allowed size
 */
const checkFileSize = (file) => {
  const limit = cloudBackupEnabled ? Infinity : MAX_LOCAL_FILE_SIZE;
  return file.size <= limit;
};

/**
 * Refreshes composition dropdown options in add/edit modals
 */
const refreshCompositionOptions = () => {
  const priority = ["Gold", "Silver", "Platinum", "Palladium", "Alloy"];
  const sorted = [...compositionOptions].sort((a, b) => {
    const ai = priority.indexOf(a);
    const bi = priority.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
    }
    return a.localeCompare(b);
  });
  [elements.itemMetal, elements.editMetal].forEach((sel) => {
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = sorted
      .map((opt) => `<option value="${opt}">${opt}</option>`)
      .join("");
    if (sorted.includes(current)) sel.value = current;
  });
};

/**
 * Adds a composition option and updates dropdowns
 *
 * @param {string} value - Composition to add
 */
const addCompositionOption = (value) => {
  if (!value) return;
  compositionOptions.add(value);
  refreshCompositionOptions();
};

/**
 * Extracts up to the first two words from a composition string
 * while removing parenthetical content and numeric values.
 *
 * @param {string} composition - Raw composition description
 * @returns {string} First two cleaned words joined by a space
 */
const getCompositionFirstWords = (composition = "") => {
  return composition
    .replace(/\([^)]*\)/g, "") // remove parentheses and their contents
    .replace(/\d+(\.\d+)?%?/g, "") // remove numbers and percentages
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(" ");
};

/**
 * Determines display-friendly composition text.
 *
 * Returns "Alloy" when the first word isn't one of the primary metals
 * (Gold, Silver, Platinum, Palladium).
 *
 * @param {string} composition - Raw composition description
 * @returns {string} Display text for the composition
 */
const getDisplayComposition = (composition = "") => {
  const firstWords = getCompositionFirstWords(composition);
  const first = firstWords.split(/\s+/)[0] || "";
  const metals = ["gold", "silver", "platinum", "palladium"];
  return metals.includes(first.toLowerCase()) ? firstWords : "Alloy";
};

/**
 * Builds two-line HTML showing source and last cache refresh or API sync info for a metal
 *
 * @param {string} metalName - Metal name ('Silver', 'Gold', 'Platinum', 'Palladium')
 * @param {string} [mode="cache"] - "cache" or "api" to select timestamp
 * @returns {string} HTML string with source line and time line
 */
const getLastUpdateTime = (metalName, mode = "cache") => {
  if (!spotHistory || spotHistory.length === 0) return "";

  const metalEntries = spotHistory.filter((entry) => entry.metal === metalName);
  if (metalEntries.length === 0) return "";

  const latestEntry = metalEntries[metalEntries.length - 1];

  if (latestEntry.source === "manual") {
    const timestamp = new Date(latestEntry.timestamp);
    const dateText = `${timestamp.getFullYear()}-${pad2(
      timestamp.getMonth() + 1,
    )}-${pad2(timestamp.getDate())}`;
    const timeText = `${pad2(timestamp.getHours())}:${pad2(
      timestamp.getMinutes(),
    )}:${pad2(timestamp.getSeconds())}`;
    return `Manual<br>Time entered ${dateText} ${timeText}`;
  }

  if (latestEntry.source === "default") return "";

  const info = loadDataSync(
    mode === "api" ? LAST_API_SYNC_KEY : LAST_CACHE_REFRESH_KEY,
    null,
  );
  if (!info || !info.timestamp) return "";

  const timestamp = new Date(info.timestamp);
  const dateText = `${timestamp.getFullYear()}-${pad2(
    timestamp.getMonth() + 1,
  )}-${pad2(timestamp.getDate())}`;
  const timeText = `${pad2(timestamp.getHours())}:${pad2(
    timestamp.getMinutes(),
  )}:${pad2(timestamp.getSeconds())}`;

  const label = mode === "api" ? "Last API Sync" : "Last Cache Refresh";
  const sourceLine = info.provider || "";
  const timeLine = `${label} ${dateText} ${timeText}`;

  if (!sourceLine && !timeLine) return "";
  return `${sourceLine}<br>${timeLine}`;
};

/**
 * Updates spot timestamp element with toggle between cache refresh and API sync times
 *
 * @param {string} metalName - Metal name ('Silver', 'Gold', 'Platinum', 'Palladium')
 */
const updateSpotTimestamp = (metalName) => {
  const el = document.getElementById(`spotTimestamp${metalName}`);
  if (!el) return;

  const cacheHtml = getLastUpdateTime(metalName, "cache");
  const apiHtml = getLastUpdateTime(metalName, "api");

  el.dataset.mode = "cache";
  el.dataset.cache = cacheHtml;
  el.dataset.api = apiHtml;
  el.innerHTML = cacheHtml;

  el.onclick = () => {
    if (el.dataset.mode === "cache") {
      el.dataset.mode = "api";
      el.innerHTML = apiHtml;
    } else {
      el.dataset.mode = "cache";
      el.innerHTML = cacheHtml;
    }
  };
};

// =============================================================================

/**
 * Pads a number with leading zeros to ensure two-digit format
 *
 * @param {number} n - Number to pad
 * @returns {string} Two-digit string representation
 * @example pad2(5) returns "05", pad2(12) returns "12"
 */
const pad2 = (n) => n.toString().padStart(2, "0");

/**
 * Returns current date as ISO string (YYYY-MM-DD)
 *
 * @returns {string} Current date in ISO format
 */
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

/**
 * Returns current month key in YYYY-MM format
 *
 * @returns {string} Current month identifier
 */
const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
};

/**
 * Parses various date formats into standard YYYY-MM-DD format
 *
 * Handles:
 * - ISO format (YYYY-MM-DD)
 * - US format (MM/DD/YYYY)
 * - European format (DD/MM/YYYY)
 * - Year-first format (YYYY/MM/DD)
 *
 * Uses intelligent parsing to distinguish between US and European formats
 * based on date values and context clues.
 *
 * @param {string} dateStr - Date string in any supported format
 * @returns {string} Date in YYYY-MM-DD format, or 'Unknown' if parsing fails
 */
function parseDate(dateStr) {
  if (!dateStr) return '—';

  // Clean the input string
  const cleanDateStr = dateStr.trim();

  // Try ISO format (YYYY-MM-DD) first - most reliable
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDateStr)) {
    const date = new Date(cleanDateStr);
    if (!isNaN(date) && date.toString() !== "Invalid Date") {
      return cleanDateStr;
    }
  }

  // Try YYYY/MM/DD format (unambiguous)
  const ymdMatch = cleanDateStr.match(
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,
  );
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);

    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const date = new Date(year, month, day);
      if (!isNaN(date) && date.toString() !== "Invalid Date") {
        return date.toISOString().split("T")[0];
      }
    }
  }

  // Handle ambiguous MM/DD/YYYY vs DD/MM/YYYY formats
  const ambiguousMatch = cleanDateStr.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
  );
  if (ambiguousMatch) {
    const first = parseInt(ambiguousMatch[1], 10);
    const second = parseInt(ambiguousMatch[2], 10);
    const year = parseInt(ambiguousMatch[3], 10);

    // If first number > 12, it must be DD/MM/YYYY (European)
    if (first > 12 && second <= 12) {
      const date = new Date(year, second - 1, first);
      if (!isNaN(date) && date.toString() !== "Invalid Date") {
        return date.toISOString().split("T")[0];
      }
    }
    // If second number > 12, it must be MM/DD/YYYY (US)
    else if (second > 12 && first <= 12) {
      const date = new Date(year, first - 1, second);
      if (!isNaN(date) && date.toString() !== "Invalid Date") {
        return date.toISOString().split("T")[0];
      }
    }
    // Both numbers <= 12, ambiguous - default to US format (MM/DD/YYYY)
    else if (first <= 12 && second <= 12) {
      // Try US format first
      let date = new Date(year, first - 1, second);
      if (!isNaN(date) && date.toString() !== "Invalid Date") {
        return date.toISOString().split("T")[0];
      }

      // Fallback to European format
      date = new Date(year, second - 1, first);
      if (!isNaN(date) && date.toString() !== "Invalid Date") {
        return date.toISOString().split("T")[0];
      }
    }
  }

  // Try parsing as a general date string (fallback)
  try {
    const date = new Date(cleanDateStr);
    if (!isNaN(date) && date.toString() !== "Invalid Date") {
      return date.toISOString().split("T")[0];
    }
  } catch (e) {
    // Continue to fallback
  }

  // If all parsing fails, return '—'
  console.warn(`Could not parse date: "${dateStr}", returning '—'`);
  return '—';
}

/**
 * Formats a date string into Month Day, Year format
 *
 * @param {string} dateStr - Date in any parseable format
 * @returns {string} Formatted date (e.g., "Jan 1, 1969")
 */
const formatDisplayDate = (dateStr) => {
  if (!dateStr || dateStr === '—' || dateStr === 'Unknown') return '—';
  
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

/**
 * Formats a number as a currency string using the default currency
 *
 * @param {number|string} value - Number to format
 * @param {string} [currency=DEFAULT_CURRENCY] - ISO currency code
 * @returns {string} Formatted currency string (e.g., "$1,234.56")
 */
const formatCurrency = (value, currency = DEFAULT_CURRENCY) => {
  const num = parseFloat(value);
  if (isNaN(num)) return "";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(num);
  } catch (e) {
    // Fallback for environments without Intl support
    return `${currency} ${num.toFixed(2)}`;
  }
};

/**
 * Formats a profit/loss value with color coding
 *
 * @param {number} value - Profit/loss value
 * @returns {string} HTML string with appropriate color styling
 */
const formatLossProfit = (value) => {
  const formatted = formatCurrency(value);
  if (value > 0) {
    return `<span style="color: var(--success);">${formatted}</span>`;
  } else if (value < 0) {
    return `<span style="color: var(--danger);">${formatted}</span>`;
  }
  return formatted;
};

/**
 * Sanitizes text input for safe HTML display
 * Prevents XSS attacks by encoding HTML special characters
 *
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text safe for HTML insertion
 */
const sanitizeHtml = (text) => {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text.toString();
  return div.innerHTML;
};

/**
 * Converts grams to troy ounces
 *
 * @param {number} grams - Weight in grams
 * @returns {number} Weight in troy ounces
 */
const gramsToOzt = (grams) => grams / 31.1034768;

/**
 * Converts troy ounces to grams
 *
 * @param {number} ozt - Weight in troy ounces
 * @returns {number} Weight in grams
 */
const oztToGrams = (ozt) => ozt * 31.1034768;

/**
 * Formats a weight in troy ounces to either grams or ounces
 *
 * @param {number} ozt - Weight in troy ounces
 * @returns {string} Formatted weight string with unit
 */
const formatWeight = (ozt) => {
  const weight = parseFloat(ozt);
  if (weight < 1) {
    return `${oztToGrams(weight).toFixed(2)} g`;
  }
  return `${weight.toFixed(2)} oz`;
};

/**
 * Converts amount from specified currency to USD using static rates
 *
 * @param {number} amount - Monetary amount
 * @param {string} [currency="USD"] - Currency code of amount
 * @returns {number} Amount converted to USD
 */
const convertToUsd = (amount, currency = "USD") => {
  const rates = { USD: 1, EUR: 1.08, GBP: 1.27, CAD: 0.74 };
  const rate = rates[currency.toUpperCase()] || 1;
  return amount * rate;
};

/**
 * Detects currency code from a value string containing symbols or codes
 *
 * @param {string} str - Value containing currency information
 * @returns {string|null} Detected currency code or null if not found
 */
const detectCurrency = (str = "") => {
  const s = str.toUpperCase();
  if (/[€]|EUR/.test(s)) return "EUR";
  if (/[£]|GBP/.test(s)) return "GBP";
  if (/CAD|C\$|CA\$/.test(s)) return "CAD";
  if (/USD|US\$/.test(s)) return "USD";
  return null;
};

/**
 * Removes all non-alphanumeric characters from a string, preserving spaces.
 *
 * @param {string} str - Input string
 * @returns {string} Cleaned string containing only letters, numbers, and spaces
 */
const stripNonAlphanumeric = (str = "", { allowHyphen = false, allowSlash = false } = {}) =>
  str
    .toString()
    .replace(
      allowHyphen && allowSlash
        ? /[^a-zA-Z0-9 \\/-]/g
        : allowHyphen
        ? /[^a-zA-Z0-9 -]/g
        : allowSlash
        ? /[^a-zA-Z0-9 \\/]/g
        : /[^a-zA-Z0-9 ]/g,
      ""
    );

/**
 * Cleans a string by stripping HTML tags and control characters while
 * preserving punctuation. Normalizes whitespace and removes diacritics.
 *
 * @param {string} str - Input string
 * @returns {string} Cleaned string
 */
const cleanString = (str = "") =>
  str
    .toString()
    .replace(/<[^>]*>/g, "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[\u0000-\u001F\u007F'\"]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Sanitizes all string properties of an object by stripping non-alphanumeric characters.
 *
 * @param {Object} obj - Object whose string fields will be sanitized
 * @returns {Object} New object with sanitized string fields
 */
const sanitizeObjectFields = (obj) => {
  const cleaned = { ...obj };
  for (const key of Object.keys(cleaned)) {
    if (typeof cleaned[key] === "string" && key !== 'notes') {
      const allowHyphen = key === 'date';
      const allowSlash = key === 'name';
      cleaned[key] =
        key === 'purchaseLocation'
          ? cleanString(cleaned[key])
          : stripNonAlphanumeric(cleaned[key], { allowHyphen, allowSlash });
    }
  }
  return cleaned;
};

/**
 * Allowed inventory item types
 * @constant {string[]}
 */
const VALID_TYPES = ["Coin", "Bar", "Round", "Note", "Aurum", "Other"];

/**
 * Normalizes item type to one of the predefined options
 *
 * @param {string} [type=""] - Raw type string
 * @returns {string} Normalized type value
 */
const normalizeType = (type = "") => {
  const t = type.toString().trim().toLowerCase();
  const match = VALID_TYPES.find(v => v.toLowerCase() === t);
  return match || "Other";
};

/**
 * Maps Numista type strings to internal StackrTrackr categories
 *
 * @param {string} type - Numista type string
 * @returns {string} Mapped internal type
 */
const mapNumistaType = (type = "") => {
  const t = type.toLowerCase();
  if (t.includes("aurum")) return "Aurum";
  if (t.includes("note")) return "Note";
  if (t.includes("bar") || t.includes("ingot")) return "Bar";
  if (t.includes("round") || t.includes("token") || t.includes("medal")) return "Round";
  if (t.includes("coin")) return "Coin";
  return "Other";
};

/**
 * Determines metal type from Numista composition string
 *
 * @param {string} composition - Composition description
 * @returns {string} Recognized metal or 'Alloy' if not silver/gold/platinum/palladium
 */
const parseNumistaMetal = (composition = "") => {
  const c = composition.trim().toLowerCase();
  if (c.startsWith("silver")) return "Silver";
  if (c.startsWith("gold")) return "Gold";
  if (c.startsWith("platinum")) return "Platinum";
  if (c.startsWith("palladium")) return "Palladium";
  if (c.startsWith("paper")) return "Paper";
  return "Alloy";
};

/**
 * Save data to localStorage with optional compression
 * @param {string} key - Storage key
 * @param {any} data - Data to store
 */
const saveData = async (key, data) => {
  try {
    const raw = JSON.stringify(data);
    const out = __compressIfNeeded(raw);
    localStorage.setItem(key, out);
  } catch(e) {
    console.error('saveData failed', e);
  }
};

/**
 * Load data from localStorage with optional decompression
 * @param {string} key - Storage key
 * @param {any} [defaultValue=[]] - Default value if no data found
 * @returns {any} Parsed data or default value
 */
const loadData = async (key, defaultValue = []) => {
  try {
    const raw = localStorage.getItem(key);
    if(raw == null) return defaultValue;
    const str = __decompressIfNeeded(raw);
    return JSON.parse(str);
  } catch(e) {
    console.warn(`loadData failed for ${key}, returning default:`, e);
    return defaultValue;
  }
};

// Synchronous versions for backward compatibility where async isn't supported
const saveDataSync = (key, data) => { try { const raw = JSON.stringify(data); const out = __compressIfNeeded(raw); localStorage.setItem(key, out); } catch(e) { console.error('saveDataSync failed', e); } };
const loadDataSync = (key, defaultValue = []) => { try { const raw = localStorage.getItem(key); if(raw == null) return defaultValue; const str = __decompressIfNeeded(raw); return JSON.parse(str); } catch(e) { return defaultValue; } };

/**
 * Removes unknown localStorage keys to maintain a clean storage state
 *
 * Iterates over all localStorage entries and deletes any keys not present in
 * ALLOWED_STORAGE_KEYS.
 */
const cleanupStorage = () => {
  if (typeof localStorage === 'undefined') return;
  const allowed = new Set(ALLOWED_STORAGE_KEYS);
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!allowed.has(key)) {
      localStorage.removeItem(key);
    }
  }
};

/**
 * Sorts inventory by date (newest first)
 *
 * @param {Array} [data=inventory] - Data to sort
 * @returns {Array} Sorted inventory data
 */
const sortInventoryByDateNewestFirst = (data = inventory) => {
  return [...data].sort((a, b) => {
    // Handle unknown dates (—, empty, or Unknown) - they should sort to the bottom (oldest)
    const isUnknownA = !a.date || a.date.trim() === '' || a.date.trim() === '—' || a.date.trim() === 'Unknown';
    const isUnknownB = !b.date || b.date.trim() === '' || b.date.trim() === '—' || b.date.trim() === 'Unknown';
    
    if (isUnknownA && isUnknownB) return 0; // Both unknown, equal
    if (isUnknownA) return 1; // A is unknown, put it after B (older)
    if (isUnknownB) return -1; // B is unknown, put it after A (older)
    
    // Both have dates, compare normally
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    const timeA = isNaN(dateA) ? 0 : dateA.getTime();
    const timeB = isNaN(dateB) ? 0 : dateB.getTime();
    return timeB - timeA; // Descending order (newest first)
  });
};

/**
 * Validates inventory item data
 *
 * @param {Object} item - Inventory item to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */
const validateInventoryItem = (item) => {
  const errors = [];

  // Required fields
  if (
    !item.name ||
    typeof item.name !== "string" ||
    item.name.trim().length === 0
  ) {
    errors.push("Name is required");
  } else if (item.name.length > 100) {
    errors.push("Name must be 100 characters or less");
  }

  if (
    !item.metal ||
    !["Silver", "Gold", "Platinum", "Palladium"].includes(item.metal)
  ) {
    errors.push("Valid metal type is required");
  }

  // Numeric validations
  if (
    !item.qty ||
    !Number.isInteger(Number(item.qty)) ||
    Number(item.qty) < 1
  ) {
    errors.push("Quantity must be a positive integer");
  }

  if (!item.weight || isNaN(Number(item.weight)) || Number(item.weight) <= 0) {
    errors.push("Weight must be a positive number");
  }

  if (item.price === undefined || item.price === null || isNaN(Number(item.price))) {
    errors.push("Price must be a number");
  } else if (Number(item.price) < 0) {
    errors.push("Price cannot be negative");
  }

  // Optional field validations
  if (item.storageLocation && item.storageLocation.length > 50) {
    errors.push("Storage location must be 50 characters or less");
  }

  if (item.purchaseLocation && item.purchaseLocation.length > 100) {
    errors.push("Purchase location must be 100 characters or less");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Sanitizes imported inventory data, coercing invalid fields to safe defaults.
 *
 * String fields default to an empty string and numeric fields become null when
 * parsing fails. This allows imports to proceed even when some fields are
 * malformed.
 *
 * @param {Object} item - Raw item data from an import process
 * @returns {Object} Sanitized item
 */
const sanitizeImportedItem = (item) => {
  const sanitized = { ...item };

  // Ensure metal and composition are strings
  if (typeof sanitized.metal !== 'string') {
    sanitized.metal = '';
  }
  if (typeof sanitized.composition !== 'string') {
    sanitized.composition = sanitized.metal;
  }

  // Ensure price always has a numeric value
  const parsedPrice = parseFloat(sanitized.price);
  sanitized.price = isNaN(parsedPrice) ? 0 : parsedPrice;

  // Ensure other numeric fields parse correctly
  const numFields = ['qty', 'weight', 'spotPriceAtPurchase'];
  for (const field of numFields) {
    if (sanitized[field] !== undefined) {
      const parsed = parseFloat(sanitized[field]);
      sanitized[field] = isNaN(parsed) ? null : parsed;
    }
  }

  // Normalize and sanitize string fields
  const basicFields = ['name', 'type', 'purchaseLocation', 'storageLocation'];
  const cleanMultilineString = (str = '') =>
    str
      .toString()
      .replace(/<[^>]*>/g, '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[\u0000-\u0008\u000B-\u001F\u007F'\"]/g, '')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .trim();
  for (const field of basicFields) {
    sanitized[field] = cleanString(sanitized[field]);
  }
  sanitized.notes = cleanMultilineString(sanitized.notes);
  sanitized.type = normalizeType(sanitized.type);

  // Reset premium calculations if price or weight are missing
  if (!sanitized.price || !sanitized.weight) {
    sanitized.premiumPerOz = 0;
    sanitized.totalPremium = 0;
  }

  return sanitizeObjectFields(sanitized);
};

/**
 * Handles errors with user-friendly messaging
 *
 * @param {Error|string} error - Error to handle
 * @param {string} context - Context where error occurred
 */
const handleError = (error, context = "") => {
  const errorMessage =
    error instanceof Error ? error.message : error.toString();

  console.error(`Error in ${context}:`, error);

  // Show user-friendly message
  const userMessage = getUserFriendlyMessage(errorMessage);
  alert(`Error: ${userMessage}`);
};

/**
 * Converts technical error messages to user-friendly ones
 *
 * @param {string} errorMessage - Technical error message
 * @returns {string} User-friendly error message
 */
const getUserFriendlyMessage = (errorMessage) => {
  if (errorMessage.includes("localStorage")) {
    return "Unable to save data. Please check your browser settings.";
  }
  if (errorMessage.includes("parse") || errorMessage.includes("JSON")) {
    return "The file format is not supported or corrupted.";
  }
  if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
    return "Network connection issue. Please check your internet connection.";
  }

  // Default fallback
  return errorMessage || "An unexpected error occurred.";
};

/**
 * Downloads a file with the specified content and filename
 *
 * @param {string} filename - Name of the file to download
 * @param {string} content - Content of the file
 * @param {string} mimeType - MIME type of the file (default: text/plain)
 */
  const downloadFile = (filename, content, mimeType = "text/plain") => {
    try {
      const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the object URL after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error("Error downloading file:", error);
    handleError(error, "file download");
  }
  };

  // =============================================================================

/**
 * Updates footer with localStorage usage statistics
 * and visual usage indicator
 */
const updateStorageStats = () => {
  try {
    // 5MB typical localStorage limit expressed in bytes
    const limit = 5 * 1024 * 1024;
    let used = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      // localStorage stores strings in UTF-16 (~2 bytes per character)
      used += (key.length + (value ? value.length : 0)) * 2;
    }

    const usedKB = used / 1024;
    const limitKB = limit / 1024;
    const el = document.getElementById("storageUsage");
    if (el) {
      el.textContent = `${usedKB.toFixed(1)} KB / ${limitKB.toFixed(1)} KB`;
    }

    const bar = document.getElementById("storageUsageBar");
    if (bar) {
      bar.max = limitKB;
      bar.value = usedKB;
    }
  } catch (err) {
    const el = document.getElementById("storageUsage");
    if (el) el.textContent = "Storage info unavailable";
    console.warn("Could not calculate storage", err);
  }
};

/**
 * Shows storage report options with view and download actions
 */
const downloadStorageReport = () => {
  let modal = document.getElementById('storageOptionsModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'storageOptionsModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Storage Report</h2>
          <button aria-label="Close modal" class="modal-close" id="storageOptionsClose">×</button>
        </div>
        <div class="modal-body">
          <div class="options-buttons">
            <button class="btn" id="viewStorageReportBtn">👁️ View Report</button>
            <button class="btn secondary" id="downloadStorageZipBtn">📦 Download ZIP</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const closeModal = () => {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    };

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    modal.querySelector('#storageOptionsClose').addEventListener('click', closeModal);

    modal.querySelector('#viewStorageReportBtn').addEventListener('click', () => {
      closeModal();
      openStorageReportPopup();
    });

    modal.querySelector('#downloadStorageZipBtn').addEventListener('click', async () => {
      closeModal();
      try {
        const zipContent = await generateStorageReportTar();
        const timestamp = new Date().toISOString().split('T')[0];
        downloadFile(`storage-report-${timestamp}.zip`, zipContent, 'application/zip');
      } catch (error) {
        console.error('Error creating ZIP file:', error);
        alert('Error creating compressed report. Please try again.');
      }
    });
  }

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

/**
 * Displays the storage report HTML inside a modal iframe
 */
const openStorageReportPopup = () => {
  const htmlContent = generateStorageReportHTML();
  const modal = document.getElementById('storageReportModal');
  const iframe = document.getElementById('storageReportFrame');

  if (!modal || !iframe) {
    alert('Storage report modal not found.');
    return;
  }

  iframe.srcdoc = htmlContent;

  const closeBtn = document.getElementById('storageReportCloseBtn');

  const closeModal = () => {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  };

  if (!modal.dataset.initialized) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }
    modal.dataset.initialized = 'true';
  }

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};
/**
 * Globally close a modal by id and clear body overflow safely.
 * @param {string} id
 */
const closeModalById = (id) => {
  try {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
  } catch (e) {
    /* ignore */
  }
  try { if (document && document.body) document.body.style.overflow = ''; } catch (e) {}
};
/**
 * Opens a modal by id and sets body overflow to hidden.
 * Also initializes a click-outside-to-close handler once.
 * @param {string} id
 */
const openModalById = (id) => {
  try {
    const modal = document.getElementById(id);
    if (!modal) return;

    // initialize click-outside handler once per modal
    if (!modal.dataset.initialized) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModalById(id);
      });
      modal.dataset.initialized = 'true';
    }

    modal.style.display = 'flex';
    try { if (document && document.body) document.body.style.overflow = 'hidden'; } catch (e) {}
    // focus first focusable element for a11y
    try {
      const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable && focusable.focus) focusable.focus();
    } catch (e) {}
  } catch (e) {
    /* ignore */
  }
};
/**
 * Generates comprehensive HTML storage report with theme support
 */
const generateStorageReportHTML = () => {
  const reportData = analyzeStorageData();
  const timestamp = new Date().toLocaleString();
  const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  
  return `<!DOCTYPE html>
<html lang="en" data-theme="${currentTheme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StackrTrackr Storage Report</title>
    <style>
        ${getStorageReportCSS()}
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
</head>
<body>
    <div class="report-container">
        <header class="report-header">
            <div class="header-content">
                <h1>📊 StackrTrackr Storage Report</h1>
                <div class="header-controls">
                    <button onclick="toggleTheme()" class="theme-toggle-btn">🌓</button>
                    <button onclick="window.close(); return false;" class="close-btn" aria-label="Close report">×</button>
                </div>
            </div>
            <div class="report-meta">
                <span>Generated: ${timestamp}</span>
                <span>Version: ${APP_VERSION}</span>
                <span>Theme: ${currentTheme}</span>
            </div>
        </header>
        
        <div class="print-controls">
            <button onclick="window.print()" class="print-btn">🖨️ Print Report</button>
        </div>
        
        <section class="storage-summary">
            <h2>Storage Overview</h2>
            <div class="summary-grid">
                <div class="summary-item">
                    <span class="summary-label">Total Storage Used:</span>
                    <span class="summary-value">${reportData.totalSize.toFixed(2)} KB</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Storage Items:</span>
                    <span class="summary-value">${reportData.items.length}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Largest Item:</span>
                    <span class="summary-value">${reportData.largestItem ? getStorageItemDisplayName(reportData.largestItem.key) : 'None'} ${reportData.largestItem ? '(' + reportData.largestItem.size.toFixed(2) + ' KB)' : ''}</span>
                </div>
            </div>
        </section>
        
        <section class="storage-visualization">
            <h2>Storage Distribution</h2>
            <div class="chart-section">
                <div class="chart-container">
                    <canvas id="storageChart" width="400" height="400"></canvas>
                </div>
                <div class="chart-legend">
                    <h3>Click on chart or items below for details</h3>
                    <div class="legend-items">
                        ${reportData.items.slice(0,5).map((item, index) => `
                            <div class="legend-item" onclick="showItemDetail('${item.key}')" data-index="${index}">
                                <span class="legend-color" style="background-color: ${getChartColor(index)}"></span>
                                <span class="legend-label">${getStorageItemDisplayName(item.key)}</span>
                                <span class="legend-value">${item.size.toFixed(1)} KB (${item.percentage.toFixed(1)}%)</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </section>
        
        <section class="storage-breakdown">
            <h2>Storage Items Details</h2>
            <div class="items-grid">
                ${reportData.items.map(item => `
                    <div class="storage-item" onclick="showItemDetail('${item.key}')">
                        <div class="item-header">
                            <h3>${getStorageItemDisplayName(item.key)}</h3>
                            <div class="item-meta">
                                <span class="item-size">${item.size.toFixed(2)} KB</span>
                                <span class="item-percentage">${item.percentage.toFixed(1)}%</span>
                            </div>
                        </div>
                        <div class="item-description">
                            ${getStorageItemDescription(item.key)}
                        </div>
                        <div class="item-details">
                            <span class="detail-item">Type: ${item.type}</span>
                            <span class="detail-item">Records: ${item.recordCount}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>
        
        <footer class="report-footer">
            <p>Generated by StackrTrackr v${APP_VERSION} • ${new Date().getFullYear()}</p>
            <p>This report contains a snapshot of your local browser storage data.</p>
        </footer>
    </div>
    
    <!-- Modal for item details -->
    <div id="itemDetailModal" class="storage-modal" style="display: none;">
        <div class="modal-content-large">
            <div class="modal-header">
                <h3 id="modalTitle">Item Details</h3>
                <button class="modal-close" onclick="closeItemDetail()">&times;</button>
            </div>
            <div class="modal-body" id="modalContent">
                <!-- Content populated by JavaScript -->
            </div>
        </div>
    </div>
    
    <script>
        ${getStorageReportJS()}
        
        // Initialize chart when page loads
        window.addEventListener('DOMContentLoaded', function() {
            initializeStorageChart(${JSON.stringify(reportData)});
        });
    </script>
</body>
</html>`;
};

/**
 * Gets chart color for given index
 */
const getChartColor = (index) => {
  const colors = [
    '#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1',
    '#fd7e14', '#20c997', '#e83e8c', '#6c757d', '#17a2b8'
  ];
  return colors[index % colors.length];
};

/**
 * Analyzes localStorage data and calculates memory usage
 */
const analyzeStorageData = () => {
  const items = [];
  let totalSize = 0;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    let value = localStorage.getItem(key);
    
    // Sanitize sensitive data
    if (key === API_KEY_STORAGE_KEY) {
      try {
        const config = JSON.parse(value || '{}');
        if (config?.keys) {
          value = JSON.stringify({ ...config, keys: {} });
        }
      } catch (err) {
        console.warn('Could not sanitize API config for report', err);
      }
    }
    
    // Calculate size (localStorage stores UTF-16, ~2 bytes per character)
    const size = ((key.length + (value ? value.length : 0)) * 2) / 1024; // KB
    totalSize += size;
    
    // Determine data type and record count
    const analysis = analyzeStorageItem(key, value);
    
    items.push({
      key,
      size,
      value,
      type: analysis.type,
      recordCount: analysis.recordCount,
      parsedData: analysis.parsedData
    });
  }
  
  // Calculate percentages and sort by size
  items.forEach(item => {
    item.percentage = (item.size / totalSize) * 100;
  });
  
  items.sort((a, b) => b.size - a.size);
  
  return {
    items,
    totalSize,
    largestItem: items[0] || { name: 'None', size: 0 }
  };
};

/**
 * Analyzes a storage item to determine its type and content
 */
const analyzeStorageItem = (key, value) => {
  let type = 'String';
  let recordCount = 1;
  let parsedData = null;
  
  try {
    parsedData = JSON.parse(value);
    
    if (Array.isArray(parsedData)) {
      type = 'Array';
      recordCount = parsedData.length;
    } else if (typeof parsedData === 'object' && parsedData !== null) {
      type = 'Object';
      recordCount = Object.keys(parsedData).length;
    } else {
      type = 'JSON Value';
    }
  } catch (e) {
    // Not JSON, treat as string
    type = 'String';
    recordCount = 1;
  }
  
  return { type, recordCount, parsedData };
};

/**
 * Gets display name for storage keys
 */
const getStorageItemDisplayName = (key) => {
  const names = {
    'precious-metals-inventory': 'Inventory Data',
    'spot-price-history': 'Spot Price History',
    'api-config': 'Metals API Configuration',
    'api-cache': 'API Cache',
    'spotPriceSilver': 'Silver Spot Price',
    'spotPriceGold': 'Gold Spot Price',
    'spotPricePlatinum': 'Platinum Spot Price',
    'spotPricePalladium': 'Palladium Spot Price',
    'theme': 'Theme Setting',
    'disclaimer-accepted': 'Disclaimer Acceptance'
  };
  
  return names[key] || key;
};

/**
 * Gets description for storage items
 */
const getStorageItemDescription = (key) => {
  const descriptions = {
    'precious-metals-inventory': 'Your complete inventory of precious metals items with all details',
    'spot-price-history': 'Historical spot price data from API providers and manual entries',
    'api-config': 'Metals API provider configurations and usage statistics',
    'api-cache': 'Cached spot price data to reduce API calls',
    'spotPriceSilver': 'Current spot price setting for silver',
    'spotPriceGold': 'Current spot price setting for gold', 
    'spotPricePlatinum': 'Current spot price setting for platinum',
    'spotPricePalladium': 'Current spot price setting for palladium',
    'theme': 'User interface theme preference (dark/light/system)',
    'disclaimer-accepted': 'Record of user accepting the application disclaimer'
  };
  
  return descriptions[key] || 'Application data stored in browser localStorage';
};

/**
 * Creates modal HTML for detailed item view
 */
const createStorageItemModal = (item) => {
  const modalId = `modal-${item.key}`;
  
  return `
    <div id="${modalId}" class="storage-modal" style="display: none;">
        <div class="modal-content-large">
            <div class="modal-header">
                <h3>${getStorageItemDisplayName(item.key)} Details</h3>
                <button class="modal-close" onclick="toggleModal('${item.key}')">&times;</button>
            </div>
            <div class="modal-body">
                <div class="modal-stats">
                    <div class="stat-item">
                        <span class="stat-label">Size:</span>
                        <span class="stat-value">${item.size.toFixed(2)} KB</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Type:</span>
                        <span class="stat-value">${item.type}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Records:</span>
                        <span class="stat-value">${item.recordCount}</span>
                    </div>
                </div>
                
                ${generateItemDataTable(item)}
            </div>
        </div>
    </div>
  `;
};

/**
 * Generates data table for storage item
 */
const generateItemDataTable = (item) => {
  if (!item.parsedData) {
    return `<div class="data-preview"><strong>Raw Data:</strong><pre>${item.value}</pre></div>`;
  }
  
  if (Array.isArray(item.parsedData)) {
    if (item.parsedData.length === 0) {
      return '<p class="no-data">No records found</p>';
    }
    
    // For inventory data, create a proper table
    if (item.key === 'precious-metals-inventory') {
      const headers = Object.keys(item.parsedData[0] || {});
      return `
        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${item.parsedData.slice(0, 50).map(record => 
                `<tr>${headers.map(h => `<td>${sanitizeHtml(record[h]?.toString() || '')}</td>`).join('')}</tr>`
              ).join('')}
            </tbody>
          </table>
          ${item.parsedData.length > 50 ? `<p class="truncated">Showing first 50 of ${item.parsedData.length} records</p>` : ''}
        </div>
      `;
    }
    
    // For other arrays, show a summary
    return `
      <div class="array-summary">
        <p><strong>Array with ${item.parsedData.length} items</strong></p>
        <div class="data-preview"><pre>${JSON.stringify(item.parsedData.slice(0, 3), null, 2)}${item.parsedData.length > 3 ? '\n...and ' + (item.parsedData.length - 3) + ' more items' : ''}</pre></div>
      </div>
    `;
  }
  
  if (typeof item.parsedData === 'object') {
    const keys = Object.keys(item.parsedData);
    return `
      <div class="object-summary">
        <p><strong>Object with ${keys.length} properties</strong></p>
        <div class="data-preview"><pre>${JSON.stringify(item.parsedData, null, 2)}</pre></div>
      </div>
    `;
  }
  
  return `<div class="data-preview"><pre>${JSON.stringify(item.parsedData, null, 2)}</pre></div>`;
};

/**
 * Gets enhanced CSS styles for the storage report with theme support
 */
const getStorageReportCSS = () => {
  return `
    :root {
        --primary: #007bff;
        --success: #28a745;
        --warning: #ffc107;
        --danger: #dc3545;
        --info: #17a2b8;
        --light: #f8f9fa;
        --dark: #343a40;
        --bg-primary: #f9fafb;
        --bg-secondary: #f8f9fa;
        --text-primary: #333333;
        --text-secondary: #666666;
        --border: #dee2e6;
    }
    
    [data-theme="dark"] {
        --bg-primary: #1a1a1a;
        --bg-secondary: #2d2d2d;
        --text-primary: #f8fafc;
        --text-secondary: #cccccc;
        --border: #404040;
        --light: #2d2d2d;
        --dark: #f8f9fa;
    }
    
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }
    
    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        line-height: 1.6;
        color: var(--text-primary);
        background: var(--bg-secondary);
        transition: all 0.3s ease;
    }
    
    .storage-report-modal-content {
        width: 95vw;
        max-width: 1200px;
        height: 90vh;
        max-height: 900px;
    }
    
    .storage-report-controls {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .theme-btn {
        background: none;
        border: 1px solid var(--border);
        padding: 0.5rem;
        border-radius: 0.25rem;
        cursor: pointer;
        font-size: 1rem;
        transition: all 0.2s ease;
    }
    
    .theme-btn:hover {
        background: var(--bg-secondary);
        transform: scale(1.05);
    }
    
    .storage-report-body {
        padding: 1rem;
        overflow-y: auto;
        height: calc(90vh - 80px);
    }
    
    .storage-report-header {
        margin-bottom: 1.5rem;
    }
    
    .storage-summary-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    
    .stat-card {
        background: var(--bg-primary);
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        padding: 1rem;
        text-align: center;
        transition: all 0.2s ease;
    }
    
    .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    .stat-label {
        display: block;
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin-bottom: 0.25rem;
    }
    
    .stat-value {
        display: block;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--primary);
    }
    
    
    .storage-report-actions {
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin-top: 2rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border);
    }
    
    .storage-detail-modal .modal-content {
        width: 90%;
        max-width: 800px;
        max-height: 80%;
    }
    
    .detail-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    
    .detail-stat {
        display: flex;
        justify-content: space-between;
        padding: 0.75rem;
        background: var(--bg-secondary);
        border-radius: 0.25rem;
    }
    
    .inventory-table-container {
        margin-top: 1rem;
    }
    
    .inventory-detail-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
    }
    
    .inventory-detail-table th,
    .inventory-detail-table td {
        border: 1px solid var(--border);
        padding: 0.5rem;
        text-align: left;
    }
    
    .inventory-detail-table th {
        background: var(--bg-secondary);
        font-weight: 600;
        position: sticky;
        top: 0;
    }
    
    .data-preview {
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 0.25rem;
        padding: 1rem;
        margin-top: 1rem;
    }
    
    .data-preview h4 {
        margin-bottom: 0.5rem;
        color: var(--text-primary);
    }
    
    .data-preview pre {
        font-size: 0.75rem;
        white-space: pre-wrap;
        word-wrap: break-word;
        max-height: 300px;
        overflow-y: auto;
        color: var(--text-primary);
    }
    
    /* Dark theme for storage modals */
    .storage-dark-theme {
        background: var(--bg-primary);
        color: var(--text-primary);
    }
    
    .storage-dark-theme .modal-content {
        background: var(--bg-primary);
        border: 1px solid var(--border);
    }
    
    .storage-dark-theme .modal-header {
        background: var(--dark);
        color: var(--text-primary);
        border-bottom: 1px solid var(--border);
    }
    
    .btn {
        padding: 0.5rem 1rem;
        border: 1px solid var(--border);
        border-radius: 0.25rem;
        background: var(--bg-primary);
        color: var(--text-primary);
        text-decoration: none;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.875rem;
    }
    
    .btn:hover {
        background: var(--bg-secondary);
        transform: translateY(-1px);
    }
    
    .btn.premium {
        background: var(--primary);
        color: #f8fafc;
        border-color: var(--primary);
    }
    
    .btn.success {
        background: var(--success);
        color: #f8fafc;
        border-color: var(--success);
    }
    
    .btn.secondary {
        background: var(--text-secondary);
        color: #f8fafc;
        border-color: var(--text-secondary);
    }
    
    /* Enhanced responsive design */
    @media (max-width: 768px) {
        .storage-report-modal-content {
            width: 98vw;
            height: 95vh;
        }
        
        .storage-summary-stats {
            grid-template-columns: 1fr;
        }
        
        .storage-report-actions {
            flex-direction: column;
        }
        
        .detail-stats {
            grid-template-columns: 1fr;
        }
    }
    
    .report-container {
        max-width: 8.5in;
        margin: 0 auto;
        background: var(--bg-primary);
        padding: 1in;
        min-height: 11in;
    }
    
    .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }
    
    .header-controls {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .theme-toggle-btn,
    .close-btn {
        background: none;
        border: 1px solid var(--border);
        padding: 0.5rem;
        border-radius: 0.25rem;
        cursor: pointer;
        font-size: 1rem;
        transition: all 0.2s ease;
    }

    .theme-toggle-btn:hover,
    .close-btn:hover {
        background: var(--bg-secondary);
    }
    
    .storage-visualization {
        margin-bottom: 2rem;
    }
    
    .chart-section {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        align-items: stretch;
    }
    
    @media (max-width: 768px) {
        .chart-section {
            grid-template-columns: 1fr;
        }
    }
    
    .chart-container {
        background: var(--bg-primary);
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        padding: 1rem;
        text-align: center;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
    }

    .chart-container canvas {
        max-width: 100%;
        height: 100% !important;
        max-height: 400px;
    }

    .chart-legend {
        background: var(--bg-primary);
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
    }

    .legend-items {
        overflow-y: auto;
        flex: 1;
        max-height: 400px;
    }
    
    .chart-legend h3 {
        margin-bottom: 1rem;
        color: var(--text-primary);
        font-size: 1rem;
    }
    
    .legend-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        margin-bottom: 0.5rem;
        border-radius: 0.25rem;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .legend-item:hover {
        background: var(--bg-secondary);
        transform: translateX(5px);
    }
    
    .legend-color {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        flex-shrink: 0;
    }
    
    .legend-label {
        flex: 1;
        font-weight: 500;
        color: var(--text-primary);
    }
    
    .legend-value {
        font-size: 0.875rem;
        color: var(--text-secondary);
        font-weight: 600;
    }
    
    .report-header {
        text-align: center;
        border-bottom: 3px solid var(--primary);
        padding-bottom: 1rem;
        margin-bottom: 2rem;
    }

    .report-header h1 {
        color: var(--primary);
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
    }

    .report-meta {
        display: flex;
        justify-content: space-between;
        font-size: 0.9rem;
        color: var(--text-secondary);
    }
    
    .print-controls {
        text-align: center;
        margin-bottom: 2rem;
    }
    
    .print-btn {
        background: var(--primary);
        color: #f8fafc;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        font-size: 1rem;
        cursor: pointer;
        transition: background 0.2s;
    }

    .print-btn:hover {
        background: var(--primary-hover);
    }
    
    .storage-summary {
        margin-bottom: 2rem;
    }
    
    .storage-summary h2 {
        color: var(--text-primary);
        margin-bottom: 1rem;
        font-size: 1.5rem;
    }
    
    .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
    }
    
    .summary-item {
        background: var(--bg-primary);
        padding: 1rem;
        border-radius: 0.5rem;
        border: 1px solid var(--border);
        border-left: 4px solid var(--primary);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .summary-label {
        font-weight: 600;
        color: var(--text-secondary);
    }

    .summary-value {
        font-weight: 700;
        color: var(--primary);
        font-size: 1.1rem;
    }
    
    .storage-breakdown h2 {
        color: var(--text-primary);
        margin-bottom: 1rem;
        font-size: 1.5rem;
    }
    
    .items-grid {
        display: grid;
        gap: 1rem;
    }
    
    .storage-item {
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        padding: 1rem;
        background: var(--bg-primary);
        transition: box-shadow 0.2s;
    }
    
    .storage-item:hover {
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
        cursor: pointer;
    }
    
    .item-header h3 {
        color: var(--primary);
        font-size: 1.2rem;
    }
    
    .item-meta {
        display: flex;
        gap: 1rem;
        align-items: center;
    }
    
    .item-size {
        font-weight: 600;
        color: var(--success);
    }
    
    .item-percentage {
        background: var(--primary);
        color: #f8fafc;
        padding: 0.25rem 0.5rem;
        border-radius: 1rem;
        font-size: 0.8rem;
    }
    
    .item-description {
        color: var(--text-secondary);
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
    }
    
    .item-details {
        display: flex;
        gap: 1rem;
        margin-bottom: 0.5rem;
    }
    
    .detail-item {
        background: var(--bg-secondary);
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
    }
    
    .view-details-btn {
        background: var(--success);
        color: #f8fafc;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 0.25rem;
        cursor: pointer;
        font-size: 0.9rem;
        transition: filter 0.2s;
    }

    .view-details-btn:hover {
        filter: brightness(0.9);
    }
    
    .storage-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }
    
    .modal-content-large {
        background: #f9fafb;
        border-radius: 0.5rem;
        width: 90%;
        max-width: 800px;
        max-height: 80%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }
    
    .modal-header {
        background: var(--primary);
        color: #f8fafc;
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .modal-close {
        background: none;
        border: none;
        color: #f8fafc;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        width: 2rem;
        height: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .modal-body {
        padding: 1rem;
        overflow-y: auto;
        flex: 1;
    }
    
    .modal-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
    }
    
    .stat-item {
        background: var(--bg-secondary);
        padding: 0.75rem;
        border-radius: 0.25rem;
        display: flex;
        justify-content: space-between;
    }

    .stat-label {
        font-weight: 600;
        color: var(--text-secondary);
    }

    .stat-value {
        font-weight: 700;
        color: var(--primary);
    }
    
    .data-table-container {
        overflow-x: auto;
        margin-top: 1rem;
    }
    
    .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8rem;
    }
    
    .data-table th,
    .data-table td {
        border: 1px solid var(--border);
        padding: 0.5rem;
        text-align: left;
    }

    .data-table th {
        background: var(--bg-secondary);
        font-weight: 600;
        position: sticky;
        top: 0;
    }
    
    .data-table td {
        max-width: 150px;
        word-wrap: break-word;
        overflow-wrap: break-word;
    }
    
    .data-preview {
        background: var(--bg-secondary);
        padding: 1rem;
        border-radius: 0.25rem;
        margin-top: 1rem;
    }
    
    .data-preview pre {
        font-size: 0.8rem;
        white-space: pre-wrap;
        word-wrap: break-word;
        max-height: 300px;
        overflow-y: auto;
    }
    
    .truncated {
        text-align: center;
        color: var(--text-secondary);
        font-style: italic;
        margin-top: 0.5rem;
    }

    .no-data {
        text-align: center;
        color: var(--text-secondary);
        font-style: italic;
        padding: 2rem;
    }

    .report-footer {
        margin-top: 3rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border);
        text-align: center;
        color: var(--text-secondary);
        font-size: 0.9rem;
    }
    
    @media print {
        body {
            background: #f9fafb;
        }
        
        .print-controls {
            display: none;
        }
        
        .storage-modal {
            display: none !important;
        }
        
        .view-details-btn {
            display: none;
        }
        
        .report-container {
            margin: 0;
            padding: 0.5in;
            max-width: none;
            min-height: auto;
        }
        
        .storage-item {
            break-inside: avoid;
            margin-bottom: 0.5rem;
        }
    }
    
    @media (max-width: 768px) {
        .report-container {
            padding: 1rem;
        }
        
        .summary-grid {
            grid-template-columns: 1fr;
        }
        
        .item-meta {
            flex-direction: column;
            align-items: flex-end;
            gap: 0.5rem;
        }
        
        .modal-content-large {
            width: 95%;
            max-height: 90%;
        }
    }
  `;
};

/**
 * Gets enhanced JavaScript for the storage report with theme and chart support
 */
const getStorageReportJS = () => {
  return `
    let currentChart = null;
    let currentReportData = null;

    function getChartColor(index) {
        const colors = [
            '#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1',
            '#fd7e14', '#20c997', '#e83e8c', '#6c757d', '#17a2b8'
        ];
        return colors[index % colors.length];
    }

    function toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        
        // Recreate chart with new theme
        if (currentChart && currentReportData) {
            currentChart.destroy();
            initializeStorageChart(currentReportData);
        }
    }
    
    function initializeStorageChart(reportData) {
        currentReportData = reportData;
        const currentChartItems = reportData.items.slice(0, 5);
        const canvas = document.getElementById('storageChart');
        if (!canvas || typeof Chart === 'undefined') {
            console.warn('Chart.js not available or canvas not found');
            return;
        }

        const ctx = canvas.getContext('2d');
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

        const data = {
            labels: currentChartItems.map(item => getStorageItemDisplayName(item.key)),
            datasets: [{
                data: currentChartItems.map(item => item.size),
                backgroundColor: currentChartItems.map((_, index) => getChartColor(index)),
                borderColor: isDark ? '#404040' : '#f8fafc',
                borderWidth: 2,
                hoverBorderWidth: 3,
                hoverOffset: 10
            }]
        };
        
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: isDark ? '#343a40' : '#f8fafc',
                    titleColor: isDark ? '#f8fafc' : '#000000',
                    bodyColor: isDark ? '#f8fafc' : '#000000',
                    borderColor: isDark ? '#6c757d' : '#dee2e6',
                    borderWidth: 1,
                    callbacks: {
                        label: (context) => {
                            const item = currentChartItems[context.dataIndex];
                            return [
                                \`\${context.label}: \${item.size.toFixed(2)} KB\`,
                                \`\${item.percentage.toFixed(1)}% of total\`,
                                \`\${item.recordCount} records\`
                            ];
                        }
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    showItemDetail(currentChartItems[index].key);
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true
            }
        };
        
        if (currentChart) {
            currentChart.destroy();
        }
        
        currentChart = new Chart(ctx, {
            type: 'pie',
            data: data,
            options: options
        });
    }
    
    function showItemDetail(key) {
        const item = currentReportData.items.find(i => i.key === key);
        if (!item) return;
        
        const modal = document.getElementById('itemDetailModal');
        const title = document.getElementById('modalTitle');
        const content = document.getElementById('modalContent');
        
        if (!modal || !title || !content) return;
        
        title.textContent = \`\${getStorageItemDisplayName(item.key)} Details\`;
        content.innerHTML = generateDetailContent(item);
        
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    
    function closeItemDetail() {
        const modal = document.getElementById('itemDetailModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
    
    function generateDetailContent(item) {
        let content = \`
            <div class="detail-stats">
                <div class="detail-stat">
                    <span class="stat-label">Size:</span>
                    <span class="stat-value">\${item.size.toFixed(2)} KB</span>
                </div>
                <div class="detail-stat">
                    <span class="stat-label">Type:</span>
                    <span class="stat-value">\${item.type}</span>
                </div>
                <div class="detail-stat">
                    <span class="stat-label">Records:</span>
                    <span class="stat-value">\${item.recordCount}</span>
                </div>
                <div class="detail-stat">
                    <span class="stat-label">Percentage:</span>
                    <span class="stat-value">\${item.percentage.toFixed(1)}%</span>
                </div>
            </div>
        \`;
        
        if (item.parsedData && Array.isArray(item.parsedData) && item.parsedData.length > 0) {
            if (item.key === 'precious-metals-inventory') {
                content += generateInventoryTable(item.parsedData);
            } else {
                content += \`<div class="data-preview"><h4>Sample Data:</h4><pre>\${JSON.stringify(item.parsedData.slice(0, 3), null, 2)}\${item.parsedData.length > 3 ? '\\n...and ' + (item.parsedData.length - 3) + ' more items' : ''}</pre></div>\`;
            }
        } else if (item.parsedData) {
            content += \`<div class="data-preview"><h4>Data:</h4><pre>\${JSON.stringify(item.parsedData, null, 2)}</pre></div>\`;
        } else {
            content += \`<div class="data-preview"><h4>Raw Data:</h4><pre>\${item.value}</pre></div>\`;
        }
        
        return content;
    }
    
    function generateInventoryTable(data) {
        if (!data || data.length === 0) return '<p>No inventory data found</p>';
        
        const headers = Object.keys(data[0]);
        const displayLimit = 20;
        
        return \`
            <div class="inventory-table-container">
                <h4>Inventory Data (showing first \${Math.min(displayLimit, data.length)} of \${data.length} items)</h4>
                <table class="inventory-detail-table">
                    <thead>
                        <tr>\${headers.map(h => \`<th>\${h}</th>\`).join('')}</tr>
                    </thead>
                    <tbody>
                        \${data.slice(0, displayLimit).map(record => 
                            \`<tr>\${headers.map(h => \`<td>\${String(record[h] || '')}</td>\`).join('')}</tr>\`
                        ).join('')}
                    </tbody>
                </table>
            </div>
        \`;
    }
    
    function getStorageItemDisplayName(key) {
        const names = {
            'precious-metals-inventory': 'Inventory Data',
            'spot-price-history': 'Spot Price History',
            'api-config': 'Metals API Configuration',
            'api-cache': 'API Cache',
            'spotPriceSilver': 'Silver Spot Price',
            'spotPriceGold': 'Gold Spot Price',
            'spotPricePlatinum': 'Platinum Spot Price',
            'spotPricePalladium': 'Palladium Spot Price',
            'theme': 'Theme Setting',
            'disclaimer-accepted': 'Disclaimer Acceptance'
        };
        return names[key] || key;
    }
    
    // Close modal when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('storage-modal')) {
            e.target.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
    
    // Close modal with ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.storage-modal[style*="flex"]');
            if (openModal) {
                openModal.style.display = 'none';
                document.body.style.overflow = '';
            }
        }
    });
    
    // Export functions to global scope
    window.toggleTheme = toggleTheme;
    window.showItemDetail = showItemDetail;
    window.closeItemDetail = closeItemDetail;
    window.initializeStorageChart = initializeStorageChart;
  `;
};

/**
 * Generates a comprehensive ZIP file with storage report and data
 */
const generateStorageReportTar = async () => {
  if (typeof JSZip === 'undefined') {
    throw new Error('JSZip library not available for compressed reports');
  }
  
  const zip = new JSZip();
  const timestamp = new Date().toISOString().split('T')[0];
  
  // Add themed HTML report
  const htmlContent = generateStorageReportHTML();
  zip.file(`storage-report-${timestamp}.html`, htmlContent);
  
  // Add JSON data for each storage item
  const reportData = analyzeStorageData();
  const jsonReport = {
    metadata: {
      generated: new Date().toISOString(),
      version: APP_VERSION,
      totalSize: reportData.totalSize,
      itemCount: reportData.items.length,
      theme: document.documentElement.getAttribute('data-theme') || 'light'
    },
    items: reportData.items.map(item => ({
      key: item.key,
      displayName: getStorageItemDisplayName(item.key),
      description: getStorageItemDescription(item.key),
      size: item.size,
      percentage: item.percentage,
      type: item.type,
      recordCount: item.recordCount,
      data: item.parsedData || item.value
    }))
  };
  
  zip.file(`storage-data-${timestamp}.json`, JSON.stringify(jsonReport, null, 2));
  
  // Add individual data files for large items
  for (const item of reportData.items) {
    if (item.size > 10 && item.parsedData) { // Items larger than 10KB
      const filename = `${item.key}-${timestamp}.json`;
      zip.file(filename, JSON.stringify(item.parsedData, null, 2));
    }
  }
  
  // Add README
  const readme = `StackrTrackr Storage Report Archive
=================================

Generated: ${new Date().toLocaleString()}
Version: ${APP_VERSION}
Total Storage: ${reportData.totalSize.toFixed(2)} KB
Items: ${reportData.items.length}

Files Included:
- storage-report-${timestamp}.html: Interactive HTML report
- storage-data-${timestamp}.json: Complete storage analysis
- Individual JSON files for large storage items

To view the report:
1. Open storage-report-${timestamp}.html in any web browser
2. Use the theme toggle to switch between light/dark modes
3. Click on chart segments or table items for detailed views

This archive contains a complete snapshot of your StackrTrackr storage data.`;
  
  zip.file('README.txt', readme);
  
  // Generate the ZIP file
  const content = await zip.generateAsync({ type: 'blob' });
  return content;
};

/** Storage compression helpers (Phase 1C) */
const __ST_COMP_PREFIX = 'CMP1:';
function __compressIfNeeded(str){
  try{
    if(!str || str.length < 4096) return str;
    const comp = LZString.compressToUTF16(str);
    return __ST_COMP_PREFIX + comp;
  }catch(e){ return str; }
}
function __decompressIfNeeded(stored){
  try{
    if(typeof stored !== 'string') return stored;
    if(stored.startsWith(__ST_COMP_PREFIX)){
      const raw = LZString.decompressFromUTF16(stored.slice(__ST_COMP_PREFIX.length));
      return raw;
    }
    return stored;
  }catch(e){ return stored; }
}
/**
 * Returns black or white contrast color for a given background.
 * Supports hex strings and CSS variables.
 * @param {string} bg - Background color in hex or CSS var format
 * @returns {string} '#000000' or '#ffffff'
 */
function getContrastColor(bg) {
  if (!bg) return '#000000';
  let hex = bg.trim();
  if (hex.startsWith('var(')) {
    const varName = hex.slice(4, -1).trim();
    hex = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
  }
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
  }
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length !== 6) return '#000000';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/** Generates a storage utilization report */
function generateStorageReport(){
  try{
    const items = [];
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      const v = localStorage.getItem(k) || '';
      const sizeBytes = (k.length + v.length) * 2; // rough UTF-16 bytes
      items.push({ key:k, sizeBytes, sizeKB: +(sizeBytes/1024).toFixed(2) });
    }
    items.sort((a,b)=>b.sizeBytes - a.sizeBytes);
    const totalBytes = items.reduce((s,x)=>s+x.sizeBytes,0);
    return { totalKB: +(totalBytes/1024).toFixed(2), items };
  }catch(e){ return { totalKB:0, items:[] }; }
}

/**
 * Opens eBay sold listings search for the given item name and metal
 * @param {string} searchTerm - The item name and metal to search for
 */
function openEbaySearch(searchTerm) {
  if (!searchTerm) return;
  
  // Clean and format the search term
  const cleanTerm = searchTerm.trim().replace(/\s+/g, ' ');
  const encodedTerm = encodeURIComponent(cleanTerm);
  
  // eBay sold listings URL with search term
  const ebayUrl = `https://www.ebay.com/sch/i.html?_from=R40&_nkw=${encodedTerm}&_sacat=0&LH_Sold=1&LH_Complete=1&_sop=13`;
  
  // Open in 1200px wide popup window without controls
  window.open(ebayUrl, `ebay_search_${Date.now()}`, 'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,location=no,menubar=no,status=no');
}

if (typeof window !== 'undefined') {
  window.getContrastColor = getContrastColor;
  window.generateStorageReport = generateStorageReport;
  window.updateSpotTimestamp = updateSpotTimestamp;
  window.cleanupStorage = cleanupStorage;
  window.checkFileSize = checkFileSize;
  window.MAX_LOCAL_FILE_SIZE = MAX_LOCAL_FILE_SIZE;
  window.closeModalById = closeModalById;
  window.openModalById = openModalById;
  window.updateStorageStats = updateStorageStats;
  window.downloadStorageReport = downloadStorageReport;
  window.openStorageReportPopup = openStorageReportPopup;
  window.debounce = debounce;
  window.openEbaySearch = openEbaySearch;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    stripNonAlphanumeric,
    sanitizeObjectFields,
    sanitizeImportedItem,
    getContrastColor,
    debounce,
  };
}

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
 * Returns formatted version string
 *
 * @param {string} [prefix='v'] - Prefix to add before version
 * @returns {string} Formatted version string (e.g., "v3.0.1")
 */
const getVersionString = (prefix = "v") => `${prefix}${APP_VERSION}`;

/**
 * Gets the active branding name considering domain overrides
 *
 * @returns {string} Active branding name
 */
const getBrandingName = () =>
  (BRANDING_DOMAIN_OPTIONS.alwaysOverride && BRANDING_DOMAIN_OVERRIDE) ||
  BRANDING_TITLE;

/**
 * Returns full application title with version when no branding is configured
 *
 * @param {string} [baseTitle='StackTrackr'] - Base application title
 * @returns {string} Full title with version or branding name
 */
const getAppTitle = (baseTitle = "StackTrackr") => {
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
  if (host.includes("stacktrackr.com")) return "stacktrackr.com";
  if (host.includes("stackertrackr.com")) return "stackertrackr.com";
  return "stacktrackr.com";
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
 * Builds two-line HTML showing source and last sync info for a metal
 *
 * @param {string} metalName - Metal name ('Silver', 'Gold', 'Platinum', 'Palladium')
 * @returns {string} HTML string with source line and time line
 */
const getLastUpdateTime = (metalName) => {
  if (!spotHistory || spotHistory.length === 0) return "";

  // Find the most recent entry for this metal
  const metalEntries = spotHistory.filter((entry) => entry.metal === metalName);
  if (metalEntries.length === 0) return "";

  const latestEntry = metalEntries[metalEntries.length - 1];
  const timestamp = new Date(latestEntry.timestamp);

  const dateText = `${timestamp.getFullYear()}-${pad2(
    timestamp.getMonth() + 1,
  )}-${pad2(timestamp.getDate())}`;
  const timeText = `${pad2(timestamp.getHours())}:${pad2(
    timestamp.getMinutes(),
  )}:${pad2(timestamp.getSeconds())}`;

  let sourceLine = "";
  let timeLine = "";

  if (latestEntry.source === "api") {
    sourceLine = latestEntry.provider || "API";
    timeLine = `Last sync ${dateText} ${timeText}`;
  } else if (latestEntry.source === "cached") {
    sourceLine = latestEntry.provider
      ? `${latestEntry.provider} (cached)`
      : "Cached";
    timeLine = `Last sync ${dateText} ${timeText}`;
  } else if (latestEntry.source === "manual") {
    sourceLine = "Manual";
    timeLine = `Time entered ${dateText} ${timeText}`;
  } else if (latestEntry.source === "default") {
    sourceLine = "";
    timeLine = "";
  } else {
    sourceLine = "Stored";
    timeLine = `Last sync ${dateText} ${timeText}`;
  }

  if (!sourceLine && !timeLine) return "";
  return `${sourceLine}<br>${timeLine}`;
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
 * @returns {string} Date in YYYY-MM-DD format, or today's date if parsing fails
 */
function parseDate(dateStr) {
  if (!dateStr) return todayStr();

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

  // If all parsing fails, return today's date
  console.warn(`Could not parse date: "${dateStr}", using today's date`);
  return todayStr();
}

/**
 * Formats a date string into a user-friendly format
 *
 * @param {string} dateStr - Date in any parseable format
 * @returns {string} Formatted date like "Jan 1, 2024"
 */
const formatDisplayDate = (dateStr) => {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Formats a number as a dollar amount with two decimal places
 *
 * @param {number|string} n - Number to format
 * @returns {string} Formatted dollar string (e.g., "$1,234.56")
 */
const formatDollar = (n) => `$${parseFloat(n).toFixed(2)}`;

/**
 * Formats a profit/loss value with color coding
 *
 * @param {number} value - Profit/loss value
 * @returns {string} HTML string with appropriate color styling
 */
const formatLossProfit = (value) => {
  const formatted = formatDollar(value);
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
 * Saves data to localStorage with JSON serialization
 *
 * @param {string} key - Storage key
 * @param {any} data - Data to store
 */
const saveData = (key, data) => localStorage.setItem(key, JSON.stringify(data));

/**
 * Loads data from localStorage with error handling
 *
 * @param {string} key - Storage key
 * @param {any} [defaultValue=[]] - Default value if no data found
 * @returns {any} Parsed data or default value
 */
const loadData = (key, defaultValue = []) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || defaultValue;
  } catch (e) {
    return defaultValue;
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
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB - dateA; // Descending order (newest first)
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
 */
const updateStorageStats = async () => {
  try {
    if (navigator?.storage?.estimate) {
      const { usage, quota } = await navigator.storage.estimate();
      const used = usage / 1024;
      const total = quota / 1024;
      const el = document.getElementById("storageUsage");
      if (el) {
        el.textContent = `${used.toFixed(1)} KB / ${total.toFixed(1)} KB`;
      }
    }
  } catch (err) {
    const el = document.getElementById("storageUsage");
    if (el) el.textContent = "Storage info unavailable";
    console.warn("Could not estimate storage", err);
  }
};

/**
 * Downloads a report of all localStorage data
 */
const downloadStorageReport = () => {
  const report = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    // Skip or sanitize sensitive data such as API keys
    if (key === API_KEY_STORAGE_KEY) {
      try {
        const config = JSON.parse(localStorage.getItem(key) || "{}");
        if (config?.keys) {
          // Remove any stored API keys before exporting
          report[key] = { ...config, keys: {} };
        } else {
          report[key] = config;
        }
      } catch (err) {
        console.warn("Could not sanitize API config for report", err);
      }
      continue;
    }

    report[key] = localStorage.getItem(key);
  }

  downloadFile(
    "storage-report.json",
    JSON.stringify(report, null, 2),
    "application/json",
  );
};

window.updateStorageStats = updateStorageStats;
window.downloadStorageReport = downloadStorageReport;

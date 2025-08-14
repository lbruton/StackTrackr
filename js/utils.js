// Ensure pad2 is defined at the top of the file for global accessibility
const pad2 = (n) => n.toString().padStart(2, "0");

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
 * Converts grams to troy ounces
 * @param {number} grams - Weight in grams
 * @returns {number} Weight in troy ounces
 */
const gramsToOzt = (grams) => {
  if (typeof grams !== 'number' || isNaN(grams)) return 0;
  return grams / 31.1034768;
};

/**
 * Converts troy ounces to grams
 * @param {number} ozt - Weight in troy ounces
 * @returns {number} Weight in grams
 */
const oztToGrams = (ozt) => {
  if (typeof ozt !== 'number' || isNaN(ozt)) return 0;
  return ozt * 31.1034768;
};

/**
 * Formats weight values for display with appropriate precision
 * Weight is always stored internally as troy ounces
 * @param {number} weight - Weight value in troy ounces
 * @returns {string} Formatted weight string
 */
const formatWeight = (weight) => {
  if (typeof weight !== "number" || isNaN(weight)) {
    return "—";
  }
  
  // Format with appropriate precision based on size
  if (weight < 0.01) {
    return weight.toFixed(4);
  } else if (weight < 1) {
    return weight.toFixed(3);
  } else {
    return weight.toFixed(2);
  }
};

const normalizeType = (type) => {
  if (!type || typeof type !== 'string') return 'Other';
  
  const cleanType = type.trim().toLowerCase();
  
  // Map common variations to standard types
  if (cleanType.includes('coin')) return 'Coin';
  if (cleanType.includes('bar')) return 'Bar';
  if (cleanType.includes('round')) return 'Round';
  if (cleanType.includes('note')) return 'Note';
  if (cleanType.includes('bullion')) return 'Bar';
  if (cleanType.includes('ingot')) return 'Bar';
  if (cleanType.includes('medal')) return 'Medal';
  if (cleanType.includes('jewelry')) return 'Jewelry';
  
  // Return capitalized version if no specific match
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};

const mapNumistaType = (numistaType) => {
  if (!numistaType || typeof numistaType !== 'string') return 'Other';
  
  const cleanType = numistaType.trim().toLowerCase();
  
  // Map Numista specific types to our standard types
  if (cleanType.includes('coin')) return 'Coin';
  if (cleanType.includes('token')) return 'Coin';
  if (cleanType.includes('medal')) return 'Medal';
  if (cleanType.includes('medallion')) return 'Medal';
  if (cleanType.includes('bar')) return 'Bar';
  if (cleanType.includes('ingot')) return 'Bar';
  if (cleanType.includes('bullion')) return 'Bar';
  if (cleanType.includes('round')) return 'Round';
  if (cleanType.includes('note')) return 'Note';
  if (cleanType.includes('paper')) return 'Note';
  if (cleanType.includes('banknote')) return 'Note';
  if (cleanType.includes('bill')) return 'Note';
  
  // Return normalized version
  return normalizeType(numistaType);
};

/**
 * Sanitizes an imported inventory item to ensure data integrity
 *
 * @param {Object} item - Raw imported item data
 * @returns {Object} Sanitized inventory item
 */
const sanitizeImportedItem = (item) => {
  const sanitized = {};
  
  // Ensure all required fields exist with safe defaults
  sanitized.metal = item.metal || 'Silver';
  sanitized.composition = item.composition || item.metal || 'Silver';
  sanitized.name = (item.name || '').toString().trim();
  sanitized.qty = Math.max(1, parseFloat(item.qty) || 1);
  sanitized.type = (item.type || 'Other').toString().trim();
  // Handle weight with fraction support
  let weightValue = item.weight;
  if (typeof weightValue === 'string' && weightValue.includes('/')) {
    const fractionParts = weightValue.split('/');
    if (fractionParts.length === 2) {
      const numerator = parseFloat(fractionParts[0]);
      const denominator = parseFloat(fractionParts[1]);
      if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
        weightValue = numerator / denominator;
      }
    }
  }
  sanitized.weight = parseFloat(weightValue) || 0; // Allow zero weight for paper money
  
  // Handle price with fraction support and currency symbols
  let priceValue = item.price;
  if (typeof priceValue === 'string') {
    // Remove currency symbols first
    priceValue = priceValue.replace(/[\$,\s]/g, '');
    if (priceValue.includes('/')) {
      const fractionParts = priceValue.split('/');
      if (fractionParts.length === 2) {
        const numerator = parseFloat(fractionParts[0]);
        const denominator = parseFloat(fractionParts[1]);
        if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
          priceValue = numerator / denominator;
        }
      }
    }
  }
  sanitized.price = Math.max(0, parseFloat(priceValue) || 0);
  sanitized.date = item.date || '—';
  sanitized.purchaseLocation = (item.purchaseLocation || '').toString().trim();
  sanitized.storageLocation = (item.storageLocation || '').toString().trim();
  sanitized.notes = (item.notes || '').toString().trim();
  sanitized.spotPriceAtPurchase = Math.max(0, parseFloat(item.spotPriceAtPurchase) || 0);
  sanitized.premiumPerOz = parseFloat(item.premiumPerOz) || 0;
  sanitized.totalPremium = parseFloat(item.totalPremium) || 0;
  sanitized.isCollectable = Boolean(item.isCollectable);
  sanitized.numistaId = (item.numistaId || '').toString().trim();
  sanitized.serial = parseInt(item.serial) || getNextSerial();
  sanitized.issuedYear = (item.issuedYear || '').toString().trim();

  // Remove any HTML tags and excess whitespace from text fields
  const textFields = ['name', 'purchaseLocation', 'storageLocation', 'notes'];
  textFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = sanitized[field]
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ')    // Normalize whitespace
        .trim();
    }
  });

  return sanitized;
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

  // Expose globally to prevent duplicate implementations
  if (typeof window !== 'undefined') {
    window.debounce = debounce;
  }
  
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
 * Extracts the first complete word from a composition string
 *
 * @param {string} composition - Raw composition description
 * @returns {string} First word of the composition
 */
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
  
  if (metals.includes(first.toLowerCase())) {
    return firstWords;
  } else {
    // For non-bullion metals, show "Alloy" or "Other" with tooltip
    const displayText = composition.toLowerCase().includes('alloy') ? 'Alloy' : 'Other';
    const actualComposition = composition || 'Unknown composition';
    return `<span title="${actualComposition}" style="cursor: help; text-decoration: underline dotted;">${displayText}</span>`;
  }
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

  const info = loadData(
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
  if (!dateStr || typeof dateStr !== 'string') return dateStr;

  const cleanDateStr = dateStr.trim();

  if (!cleanDateStr || cleanDateStr === '-' || cleanDateStr === '--') {
    return dateStr;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDateStr)) {
    const date = new Date(cleanDateStr + 'T00:00:00');
    if (!isNaN(date) && date.toString() !== "Invalid Date") {
      return cleanDateStr;
    }
  }

  const ymdMatch = cleanDateStr.match(/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/);
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

  const ambiguousMatch = cleanDateStr.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/);
  if (ambiguousMatch) {
    const first = parseInt(ambiguousMatch[1], 10);
    const second = parseInt(ambiguousMatch[2], 10);
    const year = parseInt(ambiguousMatch[3], 10);

    if (first > 12 && second <= 12) {
      const date = new Date(year, second - 1, first);
      if (!isNaN(date) && date.toString() !== "Invalid Date") {
        return date.toISOString().split("T")[0];
      }
    } else if (second > 12 && first <= 12) {
      const date = new Date(year, first - 1, second);
      if (!isNaN(date) && date.toString() !== "Invalid Date") {
        return date.toISOString().split("T")[0];
      }
    } else if (first <= 12 && second <= 12) {
      let date = new Date(year, first - 1, second);
      if (!isNaN(date) && date.toString() !== "Invalid Date") {
        return date.toISOString().split("T")[0];
      }

      date = new Date(year, second - 1, first);
      if (!isNaN(date) && date.toString() !== "Invalid Date") {
        return date.toISOString().split("T")[0];
      }
    }
  }

  try {
    const date = new Date(cleanDateStr);
    if (!isNaN(date) && date.toString() !== "Invalid Date") {
      const year = date.getFullYear();
      const currentYear = new Date().getFullYear();
      if (year >= 1900 && year <= currentYear + 1) {
        return date.toISOString().split("T")[0];
      }
    }
  } catch (e) {}

  return dateStr;
}

/**
 * Formats a date string for display in the report
 *
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date string (e.g., "Jan 1, 2023")
 */
const formatDisplayDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return dateStr;

  const cleanStr = dateStr.trim();
  if (!cleanStr || cleanStr === 'Unknown' || cleanStr === '-' || cleanStr === '--') {
    return dateStr;
  }

  let dateToFormat = cleanStr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
    dateToFormat = cleanStr + 'T00:00:00';
  }

  const d = new Date(dateToFormat);
  if (isNaN(d) || d.toString() === 'Invalid Date') return dateStr;

  const year = d.getFullYear();
  const currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear + 1) {
    return dateStr;
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
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

window.closeModalById = closeModalById;
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

window.openModalById = openModalById;
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
      recordCount: analysis.recordCount
    });
  }

  return {
    items,
    totalSize,
    largestItem: items.reduce((max, item) => item.size > max.size ? item : max, { size: 0 })
  };
};

/**
 * Analyzes a single storage item to determine its type and other characteristics
 */
const analyzeStorageItem = (key, value) => {
  let type = 'Unknown';
  let recordCount = 0;

  if (key.startsWith('report_')) {
    type = 'Report';
  } else if (key.startsWith('api_config_')) {
    type = 'API Configuration';
  } else if (key.startsWith('user_prefs_')) {
    type = 'User Preferences';
  } else if (key.startsWith('session_')) {
    type = 'Session Data';
  } else if (key.startsWith('temp_')) {
    type = 'Temporary Data';
  }

  // Estimate record count for certain types
  if (type === 'Report' || type === 'API Configuration') {
    try {
      const json = JSON.parse(value);
      recordCount = Array.isArray(json) ? json.length : 1;
    } catch (e) {
      recordCount = 1; // Unable to parse, treat as single record
    }
  }

  return { type, recordCount };
};

/**
 * Generates a TAR archive containing the storage report data
 */
const generateStorageReportTar = async () => {
  const reportData = analyzeStorageData();
  const tarWriter = new TarWriter();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Add metadata file
  const metadata = `{
    "generated": "${new Date().toISOString()}",
    "version": "${APP_VERSION}",
    "itemCount": ${reportData.items.length},
    "totalSizeKB": ${reportData.totalSize.toFixed(2)}
  }`;
  tarWriter.addFile('report-metadata.json', metadata);

  // Add each storage item as a separate file
  for (const item of reportData.items) {
    const fileName = `item-${item.key.replace(/[\/\\]/g, '_')}.json`;
    tarWriter.addFile(fileName, item.value);
  }

  return tarWriter.finish();
};

/**
 * TarWriter class to create TAR archives in JavaScript
 */
class TarWriter {
  constructor() {
    this.files = [];
  }

  /**
   * Adds a file to the TAR archive
   * @param {string} fileName - Name of the file
   * @param {string} content - Content of the file
   */
  addFile(fileName, content) {
    const fileSize = content.length;
    const header = this._createHeader(fileName, fileSize);
    this.files.push({ header, content });
  }

  /**
   * Finishes the TAR archive and returns the binary data
   * @returns {Uint8Array} - TAR archive data
   */
  finish() {
    const tarData = [];
    for (const file of this.files) {
      tarData.push(...file.header, ...file.content);
    }
    return new Uint8Array(tarData);
  }

  /**
   * Creates a TAR header for a file
   * @param {string} fileName - Name of the file
   * @param {number} fileSize - Size of the file
   * @returns {Array} - TAR header byte array
   */
  _createHeader(fileName, fileSize) {
    const header = new Uint8Array(512);
    const encoder = new TextEncoder();

    // File name
    const nameBytes = encoder.encode(fileName);
    header.set(nameBytes, 0);

    // File mode (default: 644)
    header.set([0x30, 0x38, 0x38, 0x38, 0x38, 0x38, 0x34, 0x34], 100);

    // Owner and group ID (default: 0)
    header.set([0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30], 108);
    header.set([0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30], 116);

    // File size
    const sizeOctal = fileSize.toString(8);
    const sizeBytes = encoder.encode(sizeOctal);
    header.set(sizeBytes, 124);

    // Checksum (will be filled in later)
    header.set([0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20], 148);

    // Type flag (regular file)
    header[156] = 0x30; // '0'

    // Link name (not used)
    header.fill(0, 157, 257);

    // Magic number and version (ustar)
    header.set([0x75, 0x73, 0x74, 0x61, 0x72, 0x00, 0x30, 0x30], 257);

    // Owner and group name (not used)
    header.fill(0, 265, 297);

    // Device major and minor (not used)
    header.fill(0, 297, 321);

    // File modification time (Unix timestamp)
    const mtime = Math.floor(Date.now() / 1000);
    const mtimeOctal = mtime.toString(8);
    const mtimeBytes = encoder.encode(mtimeOctal);
    header.set(mtimeBytes, 345);

    // Checksum (recalculate after header is complete)
    const checksum = this._calculateChecksum(header);
    const checksumOctal = checksum.toString(8);
    const checksumBytes = encoder.encode(checksumOctal);
    header.set(checksumBytes, 148);

    return header;
  }

  /**
   * Calculates the checksum for a TAR header
   * @param {Uint8Array} header - TAR header
   * @returns {number} - Checksum value
   */
  _calculateChecksum(header) {
    let sum = 0;
    for (let i = 0; i < header.length; i++) {
      sum += header[i];
    }
    return sum;
  }
}

// Formats a number as currency using the specified or default currency
const formatCurrency = (value, currency = DEFAULT_CURRENCY) => {
  if (typeof value !== "number" || isNaN(value)) {
    console.warn("Invalid value for currency formatting:", value);
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Parses Numista composition data to determine primary metal type
 *
 * @param {string} composition - Metal composition string from Numista
 * @returns {string} Primary metal type (Silver, Gold, Platinum, Palladium, Paper, Alloy)
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
 * Formats loss/profit values with appropriate color styling
 *
 * @param {number} value - Loss/profit value
 * @returns {string} Formatted HTML with color styling
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
 * Sanitizes HTML by escaping potentially dangerous characters
 *
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text safe for HTML
 */
const sanitizeHtml = (text) => {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text.toString();
  return div.innerHTML;
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

  // Very lenient validation - accept most data and let sanitization handle it
  
  // Name validation - only reject if completely missing
  if (!item.name || (typeof item.name === "string" && item.name.trim().length === 0)) {
    errors.push("Name is required");
  }

  // Metal validation - accept common variants and let parsing handle it
  if (!item.metal || (typeof item.metal === "string" && item.metal.trim().length === 0)) {
    errors.push("Metal type is required");
  }

  // Quantity validation - very lenient, allow fractional quantities
  let qtyValue = item.qty;
  if (qtyValue === undefined || qtyValue === null) {
    // Default to 1 if missing
    qtyValue = 1;
  }
  if (typeof qtyValue === 'string') {
    qtyValue = qtyValue.trim();
    if (qtyValue === '' || qtyValue === 'N/A' || qtyValue === '—' || qtyValue === '-') {
      qtyValue = 1; // Default to 1
    }
  }
  
  const numQty = Number(qtyValue);
  if (isNaN(numQty) || numQty <= 0) {
    errors.push("Quantity must be a positive number");
  }

  // Weight validation - very lenient, allow zero weight for paper money/collectibles
  let weightValue = item.weight;
  if (weightValue === undefined || weightValue === null) {
    // Default to 0 for items without weight (paper money, etc.)
    weightValue = 0;
  } else {
    if (typeof weightValue === 'string') {
      weightValue = weightValue.trim();
      if (weightValue === '' || weightValue === 'N/A' || weightValue === '—' || weightValue === '-') {
        weightValue = 0; // Default to 0 instead of error
      } else if (weightValue.includes('/')) {
        // Handle fractions like "1/2", "3/4", etc.
        const fractionParts = weightValue.split('/');
        if (fractionParts.length === 2) {
          const numerator = parseFloat(fractionParts[0]);
          const denominator = parseFloat(fractionParts[1]);
          if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
            weightValue = numerator / denominator;
          }
        }
      }
    }
    
    const numWeight = Number(weightValue);
    if (isNaN(numWeight) || numWeight < 0) {
      errors.push("Weight must be a positive number, fraction, or zero");
    }
  }

  // Price validation - accept 0 and negative (for tracking purposes)
  let priceValue = item.price;
  if (typeof priceValue === 'string') {
    // Follow established pattern: remove currency symbols and whitespace but keep fractions
    priceValue = priceValue.replace(/[\$,\s]/g, '');
    // Handle N/A, empty, or dash values as 0
    if (priceValue === '' || priceValue === 'N/A' || priceValue === '—' || priceValue === '-') {
      priceValue = 0;
    } else if (priceValue.includes('/')) {
      // Handle fractions like "1/2", "3/4", etc.
      const fractionParts = priceValue.split('/');
      if (fractionParts.length === 2) {
        const numerator = parseFloat(fractionParts[0]);
        const denominator = parseFloat(fractionParts[1]);
        if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
          priceValue = numerator / denominator;
        }
      }
    }
  }
  
  if (priceValue !== undefined && priceValue !== null && isNaN(Number(priceValue))) {
    errors.push("Price must be a valid number or fraction");
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

// Expose utility functions globally for import/export modules
if (typeof window !== 'undefined') {
  window.normalizeType = normalizeType;
  window.mapNumistaType = mapNumistaType;
  window.sanitizeImportedItem = sanitizeImportedItem;
  window.sortInventoryByDateNewestFirst = sortInventoryByDateNewestFirst;
  window.gramsToOzt = gramsToOzt;
  window.oztToGrams = oztToGrams;
  window.formatWeight = formatWeight;
  window.validateInventoryItem = validateInventoryItem;
  window.parseNumistaMetal = parseNumistaMetal;
  window.formatLossProfit = formatLossProfit;
  window.sanitizeHtml = sanitizeHtml;
}
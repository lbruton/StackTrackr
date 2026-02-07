// INITIALIZATION - FIXED VERSION
// =============================================================================

/**
 * Helper function to create dummy DOM elements to prevent null reference errors
 * @returns {Object} A dummy element object with basic properties
 */
function createDummyElement() {
  return {
    textContent: "",
    innerHTML: "",
    style: {},
    value: "",
    checked: false,
    disabled: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    focus: () => {},
    click: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}

/**
 * Safely retrieves a DOM element by ID with fallback to dummy element
 * @param {string} id - Element ID
 * @param {boolean} required - Whether to log warning if element missing
 * @returns {HTMLElement|Object} Element or dummy element
 */
function safeGetElement(id, required = false) {
  const element = document.getElementById(id);
  if (!element && required) {
    console.warn(`Required element '${id}' not found in DOM`);
  }
  return element || createDummyElement();
}

/**
 * Main application initialization function - ENHANCED VERSION
 *
 * This function coordinates the complete application startup process with proper
 * error handling, DOM element validation, and integration with the Memory Intelligence System.
 *
 * Memory Intelligence Integration:
 * - Fast recall system for instant context lookup
 * - Extended context database for persistent memory
 * - API LLM optimization for performance
 * - MCP integration for seamless scribe interaction
 *
 * Quick Setup: node /Volumes/DATA/GitHub/StackTrackr/rEngine/quick-agent-setup.js
 *
 * @returns {void} Fully initializes the application interface
 */
document.addEventListener("DOMContentLoaded", () => {
  console.log(`=== APPLICATION INITIALIZATION STARTED (v${APP_VERSION}) ===`);
  console.log('🧠 Memory Intelligence System available in rEngine/');
  console.log('🚀 For agent setup: node rEngine/quick-agent-setup.js');

  try {
    // Phase 0: Apply domain-based logo branding
    const brandName = typeof getBrandingName === 'function' ? getBrandingName() : BRANDING_TITLE;
    const logoSplit = BRANDING_DOMAIN_OPTIONS.logoSplit[brandName];
    if (logoSplit) {
      document.querySelectorAll('.logo-silver').forEach(el => { el.textContent = logoSplit[0]; });
      document.querySelectorAll('.logo-gold').forEach(el => { el.textContent = logoSplit[1]; });
      // Adjust SVG viewBox for longer brand names
      if (logoSplit[2]) {
        const logoSvg = document.querySelector('.stackr-logo');
        if (logoSvg) logoSvg.setAttribute('viewBox', `0 0 ${logoSplit[2]} 200`);
      }
    }
    const appLogo = document.getElementById('appLogo');
    if (appLogo) appLogo.setAttribute('aria-label', brandName);
    const footerBrand = document.getElementById('footerBrand');
    if (footerBrand) footerBrand.textContent = brandName;
    // Update About modal site link to match current domain
    const siteDomain = typeof getFooterDomain === 'function' ? getFooterDomain() : 'staktrakr.com';
    const aboutSiteLink = document.getElementById('aboutSiteLink');
    const aboutSiteDomain = document.getElementById('aboutSiteDomain');
    if (aboutSiteLink) aboutSiteLink.href = `https://www.${siteDomain}`;
    if (aboutSiteDomain) aboutSiteDomain.textContent = siteDomain;

    // Phase 1: Initialize Core DOM Elements
    debugLog("Phase 1: Initializing core DOM elements...");

    // Core form elements
    elements.inventoryForm = safeGetElement("inventoryForm", true);

    const inventoryTableEl = safeGetElement("inventoryTable", true);
    const tbody = inventoryTableEl && inventoryTableEl.querySelector ? inventoryTableEl.querySelector("tbody") : null;
    elements.inventoryTable = tbody;

    elements.itemMetal = safeGetElement("itemMetal", true);
    elements.itemName = safeGetElement("itemName", true);
    elements.itemQty = safeGetElement("itemQty", true);
    elements.itemType = safeGetElement("itemType", true);
    elements.itemWeight = safeGetElement("itemWeight", true);
    elements.itemWeightUnit = safeGetElement("itemWeightUnit", true);
    elements.itemPrice = safeGetElement("itemPrice", true);
    elements.itemMarketValue = safeGetElement("itemMarketValue");
    elements.marketValueField = safeGetElement("marketValueField");
    elements.dateField = safeGetElement("dateField");
    elements.purchaseLocation = safeGetElement("purchaseLocation", true);
    elements.storageLocation = safeGetElement("storageLocation");
    elements.itemNotes = safeGetElement("itemNotes");
    elements.itemDate = safeGetElement("itemDate", true);
    elements.itemSpotPrice = safeGetElement("itemSpotPrice");
    elements.itemCollectable = safeGetElement("itemCollectable");
    elements.itemCatalog = safeGetElement("itemCatalog");

    // Header buttons - CRITICAL
    debugLog("Phase 2: Initializing header buttons...");
    elements.appLogo = safeGetElement("appLogo");
    elements.appearanceBtn = safeGetElement("appearanceBtn");
    elements.apiBtn = safeGetElement("apiBtn");
    elements.filesBtn = safeGetElement("filesBtn", true);
    elements.aboutBtn = safeGetElement("aboutBtn");

    // Check if critical buttons exist
    debugLog(
      "Files Button found:",
      !!document.getElementById("filesBtn"),
    );

    // Import/Export elements
    debugLog("Phase 3: Initializing import/export elements...");
    elements.importCsvFile = safeGetElement("importCsvFile");
    elements.importCsvOverride = safeGetElement("importCsvOverride");
    elements.importCsvMerge = safeGetElement("importCsvMerge");
    elements.importJsonFile = safeGetElement("importJsonFile");
    elements.importJsonOverride = safeGetElement("importJsonOverride");
    elements.importJsonMerge = safeGetElement("importJsonMerge");
    elements.importProgress = safeGetElement("importProgress");
    elements.importProgressText = safeGetElement("importProgressText");
    elements.numistaImportBtn = safeGetElement("numistaImportBtn");
    elements.numistaImportFile = safeGetElement("numistaImportFile");
    elements.numistaOverride = safeGetElement("numistaOverride");
    elements.numistaMerge = safeGetElement("numistaMerge");
      elements.numistaImportOptions = safeGetElement("numistaImportOptions");
      elements.exportCsvBtn = safeGetElement("exportCsvBtn");
    elements.exportJsonBtn = safeGetElement("exportJsonBtn");
    elements.exportPdfBtn = safeGetElement("exportPdfBtn");
    elements.cloudSyncBtn = safeGetElement("cloudSyncBtn");
    elements.syncAllBtn = safeGetElement("syncAllBtn");
    elements.numistaApiKey = safeGetElement("numistaApiKey");
    elements.removeInventoryDataBtn = safeGetElement("removeInventoryDataBtn");
    elements.boatingAccidentBtn = safeGetElement("boatingAccidentBtn");

    // Modal elements
    debugLog("Phase 4: Initializing modal elements...");
    elements.apiModal = safeGetElement("apiModal");
    elements.filesModal = safeGetElement("filesModal");
    elements.apiInfoModal = safeGetElement("apiInfoModal");
    elements.apiHistoryModal = safeGetElement("apiHistoryModal");
    elements.apiProvidersModal = safeGetElement("apiProvidersModal");
    elements.cloudSyncModal = safeGetElement("cloudSyncModal");
    elements.apiQuotaModal = safeGetElement("apiQuotaModal");
    elements.aboutModal = safeGetElement("aboutModal");
    elements.ackModal = safeGetElement("ackModal");
    elements.ackAcceptBtn = safeGetElement("ackAcceptBtn");
    // Unified item modal elements (add/edit)
    elements.itemModal = safeGetElement("itemModal");
    elements.itemCloseBtn = safeGetElement("itemCloseBtn");
    elements.cancelItemBtn = safeGetElement("cancelItem");
    elements.itemModalTitle = safeGetElement("itemModalTitle");
    elements.itemModalSubmit = safeGetElement("itemModalSubmit");
    elements.itemSerial = safeGetElement("itemSerial");
    elements.undoChangeBtn = safeGetElement("undoChangeBtn");

    // Show acknowledgment modal immediately and set up modal events
    if (typeof setupAckModalEvents === "function") {
      setupAckModalEvents();
    }
    if (typeof setupAboutModalEvents === "function") {
      setupAboutModalEvents();
    }

    // Notes modal elements
    elements.notesModal = safeGetElement("notesModal");
    elements.notesTextarea = safeGetElement("notesTextarea");
    elements.saveNotesBtn = safeGetElement("saveNotes");
    elements.cancelNotesBtn = safeGetElement("cancelNotes");
    elements.notesCloseBtn = safeGetElement("notesCloseBtn");

    // Debug modal elements
    elements.debugModal = safeGetElement("debugModal");
    elements.debugCloseBtn = safeGetElement("debugCloseBtn");

    // Pagination elements
    debugLog("Phase 5: Initializing pagination elements...");
    elements.itemsPerPage = safeGetElement("itemsPerPage");
    elements.prevPage = safeGetElement("prevPage");
    elements.nextPage = safeGetElement("nextPage");
    elements.firstPage = safeGetElement("firstPage");
    elements.lastPage = safeGetElement("lastPage");
    elements.pageNumbers = safeGetElement("pageNumbers");
    elements.itemCount = safeGetElement("itemCount");

      elements.changeLogBtn = safeGetElement("changeLogBtn");
      elements.backupReminder = safeGetElement("backupReminder");
      elements.typeSummary = safeGetElement("typeSummary");
      elements.changeLogModal = safeGetElement("changeLogModal");
      elements.changeLogCloseBtn = safeGetElement("changeLogCloseBtn");
      elements.changeLogClearBtn = safeGetElement("changeLogClearBtn");
      elements.changeLogTable = safeGetElement("changeLogTable");
      elements.storageUsage = safeGetElement("storageUsage");
      elements.storageReportLink = safeGetElement("storageReportLink");

    // Search elements
    debugLog("Phase 6: Initializing search elements...");
    elements.searchInput = safeGetElement("searchInput");
    elements.clearBtn = safeGetElement("clearBtn");
    elements.newItemBtn = safeGetElement("newItemBtn");
    elements.searchResultsInfo = safeGetElement("searchResultsInfo");
    elements.activeFilters = safeGetElement("activeFilters");

    // Ensure chipMinCount has a sensible default for new installs
    try {
      const chipMinEl = document.getElementById('chipMinCount');
      const saved = localStorage.getItem('chipMinCount');
      if (!saved) {
        localStorage.setItem('chipMinCount', '100');
      }
      if (chipMinEl) {
        chipMinEl.value = localStorage.getItem('chipMinCount') || '100';
      }
    } catch (e) {
      // ignore storage errors
    }

    // Details modal elements
    debugLog("Phase 7: Initializing details modal elements...");
    elements.detailsModal = safeGetElement("detailsModal");
    elements.detailsModalTitle = safeGetElement("detailsModalTitle");
    elements.typeBreakdown = safeGetElement("typeBreakdown");
    elements.locationBreakdown = safeGetElement("locationBreakdown");
    elements.detailsCloseBtn = safeGetElement("detailsCloseBtn");
    elements.totalTitles = document.querySelectorAll(".total-title");

    // Chart elements
    debugLog("Phase 8: Initializing chart elements...");
    elements.typeChart = safeGetElement("typeChart");
    elements.locationChart = safeGetElement("locationChart");

    // Phase 9: Initialize Metal-Specific Elements
    debugLog("Phase 9: Initializing metal-specific elements...");

    // Initialize nested objects
    elements.spotPriceDisplay = {};
    elements.userSpotPriceInput = {};
    elements.saveSpotBtn = {};
    elements.historyBtn = {};

    Object.values(METALS).forEach((metalConfig) => {
      const metalKey = metalConfig.key;
      const metalName = metalConfig.name;

      debugLog(`  Setting up ${metalName} elements...`);

      // Spot price display elements with CORRECT IDs
      elements.spotPriceDisplay[metalKey] = safeGetElement(
        `spotPriceDisplay${metalName}`,
      );
      elements.userSpotPriceInput[metalKey] = safeGetElement(
        `userSpotPrice${metalName}`,
      );
      elements.saveSpotBtn[metalKey] = safeGetElement(
        `saveSpotBtn${metalName}`,
      );
      elements.historyBtn[metalKey] = safeGetElement(
        `historyBtn${metalName}`,
      );

      // Debug log for each metal
      const displayEl = document.getElementById(`spotPriceDisplay${metalName}`);
      const inputEl = document.getElementById(`userSpotPrice${metalName}`);
      debugLog(`    - ${metalName} display element:`, !!displayEl);
      debugLog(`    - ${metalName} input element:`, !!inputEl);
    });

    // Phase 10: Initialize Totals Elements
    debugLog("Phase 10: Initializing totals elements...");

    if (!elements.totals) {
      elements.totals = {};
    }

    Object.values(METALS).forEach((metalConfig) => {
      const metalKey = metalConfig.key;
      const metalName = metalConfig.name;

      elements.totals[metalKey] = {
        items: safeGetElement(`totalItems${metalName}`),
        weight: safeGetElement(`totalWeight${metalName}`),
        value: safeGetElement(`currentValue${metalName}`),
        purchased: safeGetElement(`totalPurchased${metalName}`),
        retailValue: safeGetElement(`retailValue${metalName}`),
        lossProfit: safeGetElement(`lossProfit${metalName}`),
      };
    });

    // Initialize "All" totals
    elements.totals.all = {
      items: safeGetElement("totalItemsAll"),
      weight: safeGetElement("totalWeightAll"),
      value: safeGetElement("currentValueAll"),
      purchased: safeGetElement("totalPurchasedAll"),
      retailValue: safeGetElement("retailValueAll"),
      lossProfit: safeGetElement("lossProfitAll"),
    };

    // Phase 11: Version Management
    debugLog("Phase 11: Updating version information...");
    document.title = getAppTitle();
    // COMMENTED OUT: This was overriding the SVG logo in the header
    // const appHeader = document.querySelector(".app-header h1");
    // if (appHeader) {
    //   const headerBrand = getBrandingName();
    //   appHeader.textContent = headerBrand;
    // }
    const aboutVersion = document.getElementById("aboutVersion");
    if (aboutVersion) {
      aboutVersion.textContent = `v${APP_VERSION}`;
    }
    const footerDomainEl = document.getElementById("footerDomain");
    if (footerDomainEl) {
      footerDomainEl.textContent = getFooterDomain();
    }
    if (typeof loadAnnouncements === "function") {
      loadAnnouncements();
    }

    // Phase 12: Data Initialization
    debugLog("Phase 12: Loading application data...");

    // Set default date
    if (elements.itemDate && elements.itemDate.value !== undefined) {
      elements.itemDate.value = todayStr();
    }

    // Load data
    loadInventory();
    if (typeof sanitizeTablesOnLoad === "function") {
      sanitizeTablesOnLoad();
    }
    inventory.forEach((i) => addCompositionOption(i.composition || i.metal));
    refreshCompositionOptions();
    loadSpotHistory();

    // Initialize API system
    apiConfig = loadApiConfig();
    apiCache = loadApiCache();

    // Phase 13: Initial Rendering
    debugLog("Phase 13: Rendering initial display...");
      renderTable();
      if (typeof renderActiveFilters === 'function') {
        renderActiveFilters();
      }
      fetchSpotPrice();
      updateSyncButtonStates();
      if (typeof updateStorageStats === "function") {
        updateStorageStats();
      }

    // Automatically sync prices if cache is stale and API keys are available
    if (typeof autoSyncSpotPrices === "function") {
      autoSyncSpotPrices();
    }

    // Phase 14: Event Listeners Setup (Delayed)
    debugLog("Phase 14: Setting up event listeners...");

    // Use a small delay to ensure all DOM manipulation is complete
    setTimeout(() => {
      try {
        setupEventListeners();
        setupPagination();
        setupBulkEditControls();
        setupThemeToggle();
        setupColumnResizing();
        
        // Setup Edit header toggle functionality
        const editHeader = document.querySelector('th[data-column="edit"]');
        if (editHeader) {
          editHeader.style.cursor = 'pointer';
          editHeader.addEventListener('click', (event) => {
            if (event.shiftKey) {
              // Shift + Click = Toggle all items edit mode
              if (typeof toggleAllItemsEdit === 'function') {
                toggleAllItemsEdit();
              }
            } else {
              // Regular Click = Toggle edit mode (quick/modal)
              if (typeof toggleEditMode === 'function') {
                toggleEditMode();
              }
            }
          });
          editHeader.title = 'Click to toggle edit mode • Shift+Click to toggle all items edit';
          debugLog("✓ Edit header toggle initialized");
        }
        
        debugLog("✓ All event listeners setup complete");
      } catch (eventError) {
        console.error("❌ Error setting up event listeners:", eventError);

        // Try basic event setup as fallback
        setupBasicEventListeners();
      }

      // Always set up search listeners
      setupSearch();
    }, 200); // Increased delay for better compatibility

    // Phase 15: Completion
    debugLog("=== INITIALIZATION COMPLETE ===");
    debugLog("✓ Version:", APP_VERSION);
    debugLog("✓ API configured:", !!apiConfig);
    debugLog("✓ Inventory items:", inventory.length);
    debugLog("✓ Critical elements check:");
    debugLog("  - Files button:", !!elements.filesBtn);
    debugLog("  - Inventory form:", !!elements.inventoryForm);
    debugLog("  - Inventory table:", !!elements.inventoryTable);
    // Phase 16: Storage optimization pass
    if (typeof optimizeStoragePhase1C === 'function') { optimizeStoragePhase1C(); }

  } catch (error) {
    console.error("=== CRITICAL INITIALIZATION ERROR ===");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);

    // Try to show a user-friendly error message
    setTimeout(() => {
      alert(
        `Application initialization failed: ${error.message}\n\nPlease refresh the page and try again. If the problem persists, check the browser console for more details.`,
      );
    }, 100);
  }
});

// Bootstrap dynamic footer version
document.addEventListener('DOMContentLoaded', function() {
  var el = document.getElementById('footerVersion');
  if (el) {
    var v = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : (window.APP_VERSION || '');
    el.textContent = v;
  }
});

/**
 * Basic event listener setup as fallback
 */
function setupBasicEventListeners() {
  debugLog("Setting up basic event listeners as fallback...");

  // Files button
  const filesBtn = document.getElementById("filesBtn");
  if (filesBtn) {
    filesBtn.onclick = function () {
      if (typeof showFilesModal === "function") {
        showFilesModal();
      }
    };
  }

  // Appearance button (four-state theme toggle)
  const appearanceBtn = document.getElementById("appearanceBtn");
  if (appearanceBtn) {
    appearanceBtn.onclick = function (e) {
      e.preventDefault();
      const savedTheme = localStorage.getItem(THEME_KEY) || "system";
      if (savedTheme === "dark") {
        setTheme("light");
      } else if (savedTheme === "light") {
        setTheme("sepia");
      } else if (savedTheme === "sepia") {
        setTheme("system");
      } else {
        setTheme("dark");
      }
      if (typeof updateThemeButton === "function") {
        updateThemeButton();
      }
    };
  }

  // API button
  const apiBtn = document.getElementById("apiBtn");
  if (apiBtn) {
    apiBtn.onclick = function () {
      if (typeof showApiModal === "function") {
        showApiModal();
      }
    };
  }

  debugLog("Basic event listeners setup complete");
}

// Make functions available globally for inline event handlers
window.toggleCollectable = toggleCollectable;
window.showDetailsModal = showDetailsModal;
window.closeDetailsModal = closeDetailsModal;
window.editItem = editItem;
window.deleteItem = deleteItem;
window.showNotes = showNotes;
window.applyColumnFilter = applyColumnFilter;

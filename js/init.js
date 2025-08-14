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
 * Main application initialization function - FIXED VERSION
 *
 * This function coordinates the complete application startup process with proper
 * error handling and DOM element validation.
 *
 * @returns {void} Fully initializes the application interface
 */
document.addEventListener("DOMContentLoaded", () => {
  console.log(`=== APPLICATION INITIALIZATION STARTED (v${APP_VERSION}) ===`);

  // Ensure modal functions are globally available before any event listeners
  function assignModalGlobals() {
    if (typeof window !== 'undefined') {
      if (typeof showFilesModal === 'function') window.showFilesModal = showFilesModal;
      if (typeof hideFilesModal === 'function') window.hideFilesModal = hideFilesModal;
      if (typeof showApiModal === 'function') window.showApiModal = showApiModal;
      if (typeof hideApiModal === 'function') window.hideApiModal = hideApiModal;
      if (typeof showProviderInfo === 'function') window.showProviderInfo = showProviderInfo;
      if (typeof hideProviderInfo === 'function') window.hideProviderInfo = hideProviderInfo;
    }
  }

  // Wait for all scripts to be loaded before assigning globals and listeners
  function safeInit() {
    assignModalGlobals();
    try {
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
      // Progress elements - compatible with both old and new modal structure
      elements.importProgress = safeGetElement("importProgress");
      elements.importProgressText = safeGetElement("importProgressText");
      
      // Export elements
      elements.exportCsvBtn = safeGetElement("exportCsvBtn");
      elements.exportJsonBtn = safeGetElement("exportJsonBtn");
      elements.exportPdfBtn = safeGetElement("exportPdfBtn");
      elements.exportHtmlBtn = safeGetElement("exportHtmlBtn");
      
      // Backup and management elements
      elements.backupAllBtn = safeGetElement("backupAllBtn");
      elements.restoreBackupBtn = safeGetElement("restoreBackupBtn");
      elements.cloudSyncBtn = safeGetElement("cloudSyncBtn");
      elements.syncAllBtn = safeGetElement("syncAllBtn");
      elements.numistaApiKey = safeGetElement("numistaApiKey");
      elements.removeInventoryDataBtn = safeGetElement("removeInventoryDataBtn");
      elements.boatingAccidentBtn = safeGetElement("boatingAccidentBtn");

      // Modal elements
      debugLog("Phase 4: Initializing modal elements...");
      elements.apiModal = safeGetElement("apiModal");
      elements.filesModal = safeGetElement("filesModal");
      elements.filesCloseBtn = safeGetElement("filesCloseBtn");
      elements.filesCloseBtnFooter = safeGetElement("filesCloseBtnFooter");
      elements.apiInfoModal = safeGetElement("apiInfoModal");
      elements.apiHistoryModal = safeGetElement("apiHistoryModal");
      elements.apiProvidersModal = safeGetElement("apiProvidersModal");
      elements.cloudSyncModal = safeGetElement("cloudSyncModal");
      elements.apiQuotaModal = safeGetElement("apiQuotaModal");
      elements.aboutModal = safeGetElement("aboutModal");
      elements.ackModal = safeGetElement("ackModal");
      elements.ackAcceptBtn = safeGetElement("ackAcceptBtn");
      elements.editModal = safeGetElement("editModal");
      elements.editForm = safeGetElement("editForm");
      elements.cancelEditBtn = safeGetElement("cancelEdit");
      elements.editCloseBtn = safeGetElement("editCloseBtn");
      elements.editMetal = safeGetElement("editMetal");
      elements.editName = safeGetElement("editName");
      elements.editQty = safeGetElement("editQty");
      elements.editType = safeGetElement("editType");
      elements.editWeight = safeGetElement("editWeight");
      elements.editPrice = safeGetElement("editPrice");
      elements.editPurchaseLocation = safeGetElement("editPurchaseLocation");
      elements.editStorageLocation = safeGetElement("editStorageLocation");
      elements.editNotes = safeGetElement("editNotes");
      elements.editDate = safeGetElement("editDate");
      elements.editSpotPrice = safeGetElement("editSpotPrice");
      elements.editCatalog = safeGetElement("editCatalog");
      elements.undoChangeBtn = safeGetElement("undoChangeBtn");
      elements.editSerial = safeGetElement("editSerial");

      elements.addModal = safeGetElement("addModal");
      elements.addCloseBtn = safeGetElement("addCloseBtn");
      elements.cancelAddBtn = safeGetElement("cancelAdd");

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

      // Pagination elements
      debugLog("Phase 5: Initializing pagination elements...");
      elements.itemsPerPage = safeGetElement("itemsPerPage");
      elements.prevPage = safeGetElement("prevPage");
      elements.nextPage = safeGetElement("nextPage");
      elements.firstPage = safeGetElement("firstPage");
      elements.lastPage = safeGetElement("lastPage");
      elements.pageNumbers = safeGetElement("pageNumbers");

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

      // Attach event listener to close button
      if (elements.detailsCloseBtn) {
        elements.detailsCloseBtn.addEventListener("click", () => {
          if (typeof closeDetailsModal === "function") {
            closeDetailsModal();
          } else {
            console.error("closeDetailsModal is not defined.");
          }
        });
      }

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
          premium: safeGetElement(`totalPremium${metalName}`),
          lossProfit: safeGetElement(`lossProfit${metalName}`),
          avgPrice: safeGetElement(`avgPrice${metalName}`),
          avgPremium: safeGetElement(`avgPremium${metalName}`),
          avgCollectablePrice: safeGetElement(`avgCollectablePrice${metalName}`),
          avgNonCollectablePrice: safeGetElement(
            `avgNonCollectablePrice${metalName}`,
          ),
        };
      });

      // Initialize "All" totals
      elements.totals.all = {
        items: safeGetElement("totalItemsAll"),
        weight: safeGetElement("totalWeightAll"),
        value: safeGetElement("currentValueAll"),
        purchased: safeGetElement("totalPurchasedAll"),
        premium: safeGetElement("totalPremiumAll"),
        lossProfit: safeGetElement("lossProfitAll"),
        avgPrice: safeGetElement("avgPriceAll"),
        avgPremium: safeGetElement("avgPremiumAll"),
        avgCollectablePrice: safeGetElement("avgCollectablePriceAll"),
        avgNonCollectablePrice: safeGetElement("avgNonCollectablePriceAll"),
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

        // Phase 12: Data Loading
    debugLog("Phase 12: Loading data...");
    
    // Load data with fallbacks for file:// protocol loading issues
    try {
      // Check if loadInventory is available
      if (typeof loadInventory === "function") {
        debugLog("Calling loadInventory()...");
        loadInventory();
      } else {
        // If not available now, try again after a short delay
        debugWarn("loadInventory not found, will retry in 50ms");
        setTimeout(() => {
          if (typeof loadInventory === "function") {
            debugLog("Delayed loadInventory call succeeded");
            loadInventory();
          } else {
            debugError("loadInventory function not available after delay");
          }
        }, 50);
      }
    
      if (typeof sanitizeTablesOnLoad === "function") {
        sanitizeTablesOnLoad();
      } else {
        debugWarn("sanitizeTablesOnLoad not found");
      }
      
      if (Array.isArray(inventory)) {
        inventory.forEach((i) => {
          if (typeof addCompositionOption === "function") {
            addCompositionOption(i.composition || i.metal);
          }
        });
      }
      
      if (typeof refreshCompositionOptions === "function") {
        refreshCompositionOptions();
      }
      
      if (typeof loadSpotHistory === "function") {
        loadSpotHistory();
      }
    } catch (e) {
      debugError("Error during data loading:", e);
    }

    // Initialize API system
    apiConfig = loadApiConfig();
    apiCache = loadApiCache();

    // Phase 13: Initial Rendering
    debugLog("Phase 13: Rendering initial display...");
    
    // Ensure renderTable function is available before calling
    if (typeof renderTable === "function") {
      renderTable();
    } else {
      debugError("renderTable function not available during initialization");
      // Try to render after a short delay to allow functions to load
      setTimeout(() => {
        if (typeof renderTable === "function") {
          renderTable();
        } else {
          debugError("renderTable function still not available after delay");
        }
      }, 100);
    }
    
    if (typeof fetchSpotPrice === "function") {
      fetchSpotPrice();
    } else {
      debugWarn("fetchSpotPrice function not available during initialization");
    }
    
    if (typeof updateSyncButtonStates === "function") {
      updateSyncButtonStates();
    } else {
      debugWarn("updateSyncButtonStates function not available during initialization");
    }
    
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
        setupThemeToggle();
        setupColumnResizing();
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
}
safeInit();
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

// Note: These functions are now defined in their respective modules
// and should be exposed globally via window.functionName in those modules

// Check for functions and only assign globals if not already defined
// This prevents reference errors when functions aren't yet loaded
if (typeof window !== 'undefined') {
  // Each function gets a safety check to prevent reference errors
  if (!window.toggleCollectable && typeof toggleCollectable !== 'undefined') {
    window.toggleCollectable = toggleCollectable;
  }
  
  if (!window.showDetailsModal && typeof showDetailsModal !== 'undefined') {
    window.showDetailsModal = showDetailsModal;
  }
  
  if (!window.closeDetailsModal && typeof closeDetailsModal !== 'undefined') {
    window.closeDetailsModal = closeDetailsModal;
  }
  
  if (!window.editItem && typeof editItem !== 'undefined') {
    window.editItem = editItem;
  }
  
  if (!window.deleteItem && typeof deleteItem !== 'undefined') {
    window.deleteItem = deleteItem;
  }
  
  if (!window.showNotes && typeof showNotes !== 'undefined') {
    window.showNotes = showNotes;
  }
  
  if (!window.applyColumnFilter && typeof applyColumnFilter !== 'undefined') {
    window.applyColumnFilter = applyColumnFilter;
  }
}

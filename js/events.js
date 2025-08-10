/**
 * EVENTS MODULE - FIXED VERSION
 *
 * Handles all DOM event listeners with proper null checking and error handling.
 * Includes file protocol compatibility fixes and fallback event attachment methods.
 */

// EVENT UTILITIES
// =============================================================================

/**
 * Safely attaches event listener with fallback methods
 * @param {HTMLElement} element - Element to attach listener to
 * @param {string} event - Event type
 * @param {Function} handler - Event handler function
 * @param {string} description - Description for logging
 * @returns {boolean} Success status
 */
const safeAttachListener = (element, event, handler, description = "") => {
  if (!element) {
    console.warn(
      `Cannot attach ${event} listener: element not found (${description})`,
    );
    return false;
  }

  try {
    // Method 1: Standard addEventListener
    element.addEventListener(event, handler);
    return true;
  } catch (error) {
    console.warn(`Standard addEventListener failed for ${description}:`, error);

    try {
      // Method 2: Legacy event handler
      element["on" + event] = handler;
      debugLog(`✓ Fallback event handler attached: ${description}`);
      return true;
    } catch (fallbackError) {
      console.error(
        `All event attachment methods failed for ${description}:`,
        fallbackError,
      );
      return false;
    }
  }
};

/**
 * Implements dynamic column resizing for the inventory table
 */
const setupColumnResizing = () => {
  const table = document.getElementById("inventoryTable");
  if (!table) {
    console.warn("Inventory table not found for column resizing");
    return;
  }

  // Clear any existing resize handles
  const existingHandles = table.querySelectorAll(".resize-handle");
  existingHandles.forEach((handle) => handle.remove());

  let isResizing = false;
  let currentColumn = null;
  let startX = 0;
  let startWidth = 0;

  // Add resize handles to table headers
  const headers = table.querySelectorAll("th");
  headers.forEach((header, index) => {
    // Skip the last column (delete button)
    if (index === headers.length - 1) return;

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "resize-handle";

    header.style.position = "relative";
    header.appendChild(resizeHandle);

    safeAttachListener(
      resizeHandle,
      "mousedown",
      (e) => {
        isResizing = true;
        currentColumn = header;
        startX = e.clientX;
        startWidth = parseInt(
          document.defaultView.getComputedStyle(header).width,
          10,
        );

        e.preventDefault();
        e.stopPropagation();

        // Prevent header click event from firing
        header.style.pointerEvents = "none";
        setTimeout(() => {
          header.style.pointerEvents = "auto";
        }, 100);
      },
      "Column resize handle",
    );
  });

  // Handle mouse move for resizing
  safeAttachListener(
    document,
    "mousemove",
    (e) => {
      if (!isResizing || !currentColumn) return;

      const width = startWidth + e.clientX - startX;
      const minWidth = 40;
      const maxWidth = 300;

      if (width >= minWidth && width <= maxWidth) {
        currentColumn.style.width = width + "px";
      }
    },
    "Document mousemove for resizing",
  );

  // Handle mouse up to stop resizing
  safeAttachListener(
    document,
    "mouseup",
    () => {
      if (isResizing) {
        isResizing = false;
        currentColumn = null;
      }
    },
    "Document mouseup for resizing",
  );

  // Prevent text selection during resize
  safeAttachListener(
    document,
    "selectstart",
    (e) => {
      if (isResizing) {
        e.preventDefault();
      }
    },
    "Document selectstart for resizing",
  );
};

// RESPONSIVE TABLE HANDLING
// =============================================================================

/**
 * Updates column visibility based on current viewport width
 */
const updateColumnVisibility = () => {
  const width = window.innerWidth;
  const hidden = new Set();

  const breakpoints = [
    { width: 1200, hide: ["purchaseLocation", "storageLocation", "collectable"] },
    {
      width: 992,
      hide: [
        "purchaseLocation",
        "storageLocation",
        "collectable",
        "premium",
        "spot",
        "weight",
      ],
    },
    {
      width: 768,
      hide: [
        "purchaseLocation",
        "storageLocation",
        "collectable",
        "premium",
        "spot",
        "weight",
        "qty",
        "metal",
      ],
    },
    {
      width: 576,
      hide: [
        "purchaseLocation",
        "storageLocation",
        "collectable",
        "premium",
        "spot",
        "weight",
        "qty",
        "metal",
        "type",
      ],
    },
  ];

  breakpoints.forEach((bp) => {
    if (width < bp.width) bp.hide.forEach((c) => hidden.add(c));
  });

  const allColumns = [
    "date",
    "type",
    "metal",
    "name",
    "qty",
    "weight",
    "purchasePrice",
    "spot",
    "premium",
    "purchaseLocation",
    "storageLocation",
    "collectable",
    "notes",
    "delete",
  ];

  allColumns.forEach((col) => {
    document.querySelectorAll(`[data-column="${col}"]`).forEach((el) => {
      el.classList.toggle("hidden", hidden.has(col));
    });
  });
};

/**
 * Sets up responsive column visibility handling
 */
const setupResponsiveColumns = () => {
  updateColumnVisibility();
  safeAttachListener(
    window,
    "resize",
    updateColumnVisibility,
    "Window resize for column visibility",
  );
};

// MAIN EVENT LISTENERS SETUP
// =============================================================================

/**
 * Sets up all primary event listeners for the application
 */
const setupEventListeners = () => {
  console.log(`Setting up event listeners (v${APP_VERSION})...`);

  try {
    // Responsive column handling
    setupResponsiveColumns();

    // CRITICAL HEADER BUTTONS
    debugLog("Setting up header buttons...");

    // Files Button
    if (elements.filesBtn) {
      safeAttachListener(
        elements.filesBtn,
        "click",
        (e) => {
          e.preventDefault();
          debugLog("Files button clicked");
          if (typeof showFilesModal === "function") {
            showFilesModal();
          }
        },
        "Files Button",
      );
    } else {
      console.error("Files button element not found!");
    }

    // About Button
    if (elements.aboutBtn) {
      safeAttachListener(
        elements.aboutBtn,
        "click",
        (e) => {
          e.preventDefault();
          if (typeof showAboutModal === "function") {
            showAboutModal();
          }
        },
        "About Button",
      );
    }

    // API Button
    if (elements.apiBtn) {
      safeAttachListener(
        elements.apiBtn,
        "click",
        (e) => {
          e.preventDefault();
          if (typeof showApiModal === "function") {
            showApiModal();
          }
        },
        "API Button",
      );
    }

    // Appearance Button
    if (elements.appearanceBtn) {
      safeAttachListener(
        elements.appearanceBtn,
        "click",
        (e) => {
          e.preventDefault();
          if (typeof showAppearanceModal === "function") {
            showAppearanceModal();
          }
        },
        "Appearance Button",
      );
    }

    // Theme buttons
    const themeDisplay = document.getElementById("themeDisplay");
    const updateThemeDisplay = (label) => {
      if (themeDisplay) themeDisplay.textContent = label;
    };

    const darkBtn = document.getElementById("darkModeBtn");
    if (darkBtn) {
      safeAttachListener(
        darkBtn,
        "click",
        () => {
          if (typeof setTheme === "function") setTheme("dark");
          updateThemeDisplay("Dark Mode");
        },
        "Dark mode button",
      );
    }
    const lightBtn = document.getElementById("lightModeBtn");
    if (lightBtn) {
      safeAttachListener(
        lightBtn,
        "click",
        () => {
          if (typeof setTheme === "function") setTheme("light");
          updateThemeDisplay("Light Mode");
        },
        "Light mode button",
      );
    }
    const systemBtn = document.getElementById("systemModeBtn");
    if (systemBtn) {
      safeAttachListener(
        systemBtn,
        "click",
        () => {
          if (typeof setTheme === "function") setTheme("system");
          updateThemeDisplay("System");
        },
        "System mode button",
      );
    }

    // Details modal triggers
    if (elements.totalTitles && elements.totalTitles.length) {
      elements.totalTitles.forEach((title) => {
        safeAttachListener(
          title,
          "click",
          () => {
            const metal = title.dataset.metal;
            if (typeof showDetailsModal === "function") {
              showDetailsModal(metal);
            }
          },
          `Totals title (${title.dataset.metal})`,
        );
      });
    }

    if (elements.detailsCloseBtn) {
      safeAttachListener(
        elements.detailsCloseBtn,
        "click",
        () => {
          if (typeof closeDetailsModal === "function") {
            closeDetailsModal();
          }
        },
        "Close details modal",
      );
    }

    // TABLE HEADER SORTING
    debugLog("Setting up table sorting...");
    const inventoryTable = document.getElementById("inventoryTable");
    if (inventoryTable) {
      const headers = inventoryTable.querySelectorAll("th");
      headers.forEach((header, index) => {
        // Skip Notes/Delete columns (last two)
        if (index >= headers.length - 2) {
          return;
        }

        header.style.cursor = "pointer";

        safeAttachListener(
          header,
          "click",
          () => {
            // Toggle sort direction if same column, otherwise set to new column with asc
            if (sortColumn === index) {
              sortDirection = sortDirection === "asc" ? "desc" : "asc";
            } else {
              sortColumn = index;
              sortDirection = "asc";
            }

            renderTable();
          },
          `Table header ${index}`,
        );
      });
    } else {
      console.error("Inventory table not found for sorting setup!");
    }

    // MAIN FORM SUBMISSION
    debugLog("Setting up main form...");
    if (elements.inventoryForm) {
      safeAttachListener(
        elements.inventoryForm,
        "submit",
        function (e) {
          e.preventDefault();

          const metal = elements.itemMetal.value;
          const name = elements.itemName.value.trim();
          const qty = parseInt(elements.itemQty.value, 10);
          const type = elements.itemType.value;
          const weight = parseFloat(elements.itemWeight.value);
          const price = parseFloat(elements.itemPrice.value);
          const purchaseLocation =
            elements.purchaseLocation.value.trim() || "Unknown";
          const storageLocation =
            elements.storageLocation.value.trim() || "Unknown";
          const notes = elements.itemNotes.value.trim() || "";
          const date = elements.itemDate.value || todayStr();
          const spotPriceInput = elements.itemSpotPrice.value.trim();
          const isCollectable = document.getElementById("itemCollectable").checked;

          if (
            isNaN(qty) ||
            qty < 1 ||
            !Number.isInteger(qty) ||
            isNaN(weight) ||
            weight <= 0 ||
            isNaN(price) ||
            price < 0
          ) {
            return alert("Please enter valid values for all fields.");
          }

          // Determine spot price at purchase
          const metalKey = metal.toLowerCase();
          const spotPriceAtPurchase =
            spotPriceInput === ""
              ? spotPrices[metalKey] ?? 0
              : parseFloat(spotPriceInput);

          // Calculate premium per ounce (only for non-collectible items)
          let premiumPerOz = 0;
          let totalPremium = 0;

          if (!isCollectable) {
            const pricePerOz = price / weight;
            premiumPerOz = pricePerOz - spotPriceAtPurchase;
            totalPremium = premiumPerOz * qty * weight;
          }

          inventory.push({
            metal,
            name,
            qty,
            type,
            weight,
            price,
            date,
            purchaseLocation,
            storageLocation,
            notes,
            spotPriceAtPurchase,
            premiumPerOz,
            totalPremium,
            isCollectable,
          });

          saveInventory();
          renderTable();
          this.reset();
          elements.itemDate.value = todayStr();
          if (elements.addModal) elements.addModal.style.display = "none";
        },
        "Main inventory form",
      );
    } else {
      console.error("Main inventory form not found!");
    }

    // EDIT FORM SUBMISSION
    debugLog("Setting up edit form...");
    if (elements.editForm) {
      safeAttachListener(
        elements.editForm,
        "submit",
        function (e) {
          e.preventDefault();

          if (editingIndex === null) return;

          const metal = elements.editMetal.value;
          const name = elements.editName.value.trim();
          const qty = parseInt(elements.editQty.value, 10);
          const type = elements.editType.value;
          const weight = parseFloat(elements.editWeight.value);
          const price = parseFloat(elements.editPrice.value);
          const purchaseLocation =
            elements.editPurchaseLocation.value.trim() || "Unknown";
          const storageLocation =
            elements.editStorageLocation.value.trim() || "Unknown";
          const notes = elements.editNotes.value.trim() || "";
          const date = elements.editDate.value;

          // Use the checkbox state the user just set
          const isCollectable =
            document.getElementById("editCollectable").checked;

          // Get spot price input value
          const spotPriceInput = elements.editSpotPrice.value.trim();

          // If spot price is empty and item is not collectable, use current spot price
          let spotPriceAtPurchase;
          if (!isCollectable && spotPriceInput === "") {
            const metalKey = metal.toLowerCase();
            spotPriceAtPurchase = spotPrices[metalKey] ?? 0;
          } else {
            spotPriceAtPurchase = parseFloat(spotPriceInput);
          }

          if (
            isNaN(qty) ||
            qty < 1 ||
            !Number.isInteger(qty) ||
            isNaN(weight) ||
            weight <= 0 ||
            isNaN(price) ||
            price < 0 ||
            (!isCollectable &&
              (isNaN(spotPriceAtPurchase) || spotPriceAtPurchase <= 0))
          ) {
            return alert("Please enter valid values for all fields.");
          }

          // Calculate premium per ounce (only for non-collectible items)
          let premiumPerOz = 0;
          let totalPremium = 0;

          if (!isCollectable) {
            const pricePerOz = price / weight;
            premiumPerOz = pricePerOz - spotPriceAtPurchase;
            totalPremium = premiumPerOz * qty * weight;
          }

          const oldItem = { ...inventory[editingIndex] };

          // Update the item
          inventory[editingIndex] = {
            metal,
            name,
            qty,
            type,
            weight,
            price,
            date,
            purchaseLocation,
            storageLocation,
            notes,
            spotPriceAtPurchase: isCollectable ? 0 : spotPriceAtPurchase,
            premiumPerOz,
            totalPremium,
            isCollectable,
          };

          saveInventory();
          renderTable();
          logItemChanges(oldItem, inventory[editingIndex]);

          // Close modal
          elements.editModal.style.display = "none";
          editingIndex = null;
        },
        "Edit form",
      );
    }

    // CANCEL EDIT BUTTON
    if (elements.cancelEditBtn) {
      safeAttachListener(
        elements.cancelEditBtn,
        "click",
        function () {
          elements.editModal.style.display = "none";
          editingIndex = null;
        },
        "Cancel edit button",
      );
    }

    if (elements.editCloseBtn) {
      safeAttachListener(
        elements.editCloseBtn,
        "click",
        () => {
          elements.editModal.style.display = "none";
          editingIndex = null;
        },
        "Edit modal close button",
      );
    }

    if (elements.addCloseBtn) {
      safeAttachListener(
        elements.addCloseBtn,
        "click",
        () => {
          elements.addModal.style.display = "none";
        },
        "Add modal close button",
      );
    }

    if (elements.cancelAddBtn) {
      safeAttachListener(
        elements.cancelAddBtn,
        "click",
        () => {
          if (elements.addModal) elements.addModal.style.display = "none";
        },
        "Cancel add button",
      );
    }

    // NOTES MODAL BUTTONS
    if (elements.saveNotesBtn) {
      safeAttachListener(
        elements.saveNotesBtn,
        "click",
        () => {
          if (notesIndex === null) return;
          const textareaElement =
            elements.notesTextarea || document.getElementById("notesTextarea");
          const text = textareaElement ? textareaElement.value.trim() : "";

          const oldItem = { ...inventory[notesIndex] };
          inventory[notesIndex].notes = text;
          saveInventory();
          renderTable();
          logItemChanges(oldItem, inventory[notesIndex]);

          const modalElement =
            elements.notesModal || document.getElementById("notesModal");
          if (modalElement) {
            modalElement.style.display = "none";
          }
          notesIndex = null;
        },
        "Save notes button",
      );
    }

    if (elements.cancelNotesBtn) {
      safeAttachListener(
        elements.cancelNotesBtn,
        "click",
        () => {
          const modalElement =
            elements.notesModal || document.getElementById("notesModal");
          if (modalElement) {
            modalElement.style.display = "none";
          }
          notesIndex = null;
        },
        "Cancel notes button",
      );
    }

    if (elements.notesCloseBtn) {
      safeAttachListener(
        elements.notesCloseBtn,
        "click",
        () => {
          const modalElement =
            elements.notesModal || document.getElementById("notesModal");
          if (modalElement) {
            modalElement.style.display = "none";
          }
          notesIndex = null;
        },
        "Notes modal close button",
      );
    }

      if (elements.changeLogBtn) {
        safeAttachListener(
          elements.changeLogBtn,
          "click",
          (e) => {
            e.preventDefault();
            renderChangeLog();
            if (elements.changeLogModal) {
              elements.changeLogModal.style.display = "flex";
              document.body.style.overflow = "hidden";
            }
          },
          "Change log button",
        );
      }

      if (elements.storageReportLink) {
        safeAttachListener(
          elements.storageReportLink,
          "click",
          (e) => {
            e.preventDefault();
            if (typeof downloadStorageReport === "function") {
              downloadStorageReport();
            }
          },
          "Storage report link",
        );
      }

    if (elements.changeLogCloseBtn) {
      safeAttachListener(
        elements.changeLogCloseBtn,
        "click",
        () => {
          if (elements.changeLogModal) {
            elements.changeLogModal.style.display = "none";
            document.body.style.overflow = "";
          }
        },
        "Change log close button",
      );
    }

    // SPOT PRICE EVENT LISTENERS
    debugLog("Setting up spot price listeners...");
    Object.values(METALS).forEach((metalConfig) => {
      const metalKey = metalConfig.key;
      const metalName = metalConfig.name;

      // Main spot price action buttons
        const addBtn = document.getElementById(`addBtn${metalName}`);
        const resetBtn = document.getElementById(`resetBtn${metalName}`);
        const syncBtn = document.getElementById(`syncBtn${metalName}`);
        const spotCard = document.querySelector(
          `.spot-input.${metalKey} .spot-card`,
        );
        const actions = document.querySelector(
          `.spot-input.${metalKey} .spot-actions`,
        );

        if (spotCard && actions) {
          safeAttachListener(
            spotCard,
            "click",
            () => {
              const visible = actions.style.display === "flex";
              document
                .querySelectorAll(".spot-actions")
                .forEach((el) => (el.style.display = "none"));
              document
                .querySelectorAll(".manual-input")
                .forEach((el) => (el.style.display = "none"));
              actions.style.display = visible ? "none" : "flex";
            },
            `${metalName} spot card`,
          );
        }

      // Manual input buttons
      const saveBtn = elements.saveSpotBtn[metalKey];
      const cancelBtn = document.getElementById(`cancelSpotBtn${metalName}`);
      const inputEl = elements.userSpotPriceInput[metalKey];

      // Add button - shows manual input
      if (addBtn) {
        safeAttachListener(
          addBtn,
          "click",
          () => {
            debugLog(`Add button clicked for ${metalName}`);
            const manualInput = document.getElementById(
              `manualInput${metalName}`,
            );
            if (manualInput) {
              manualInput.style.display = "block";
              const input = document.getElementById(
                `userSpotPrice${metalName}`,
              );
              if (input) input.focus();
            }
          },
          `Add spot price for ${metalName}`,
        );
      }

      // Reset button
      if (resetBtn) {
        safeAttachListener(
          resetBtn,
          "click",
          () => {
            debugLog(`Reset button clicked for ${metalName}`);
            if (typeof resetSpotPrice === "function") {
              resetSpotPrice(metalName);
            } else {
              // Fallback reset functionality
              const defaultPrice = metalConfig.defaultPrice;
              localStorage.setItem(
                metalConfig.localStorageKey,
                defaultPrice.toString(),
              );
              spotPrices[metalKey] = defaultPrice;
              if (elements.spotPriceDisplay[metalKey]) {
                elements.spotPriceDisplay[metalKey].textContent =
                  formatDollar(defaultPrice);
              }
              updateSummary();
            }
          },
          `Reset spot price for ${metalName}`,
        );
      }

      // Sync button
      if (syncBtn) {
        safeAttachListener(
          syncBtn,
          "click",
          () => {
            debugLog(`Sync button clicked for ${metalName}`);
            if (typeof syncSpotPricesFromApi === "function") {
              syncSpotPricesFromApi(true);
            } else {
              alert(
                "API sync functionality requires API configuration. Please configure an API provider first.",
              );
            }
          },
          `Sync spot price for ${metalName}`,
        );
      }

      // Save button (in manual input)
      if (saveBtn) {
        safeAttachListener(
          saveBtn,
          "click",
          () => {
            if (typeof updateManualSpot === "function") {
              updateManualSpot(metalKey);
            } else {
              console.error(
                `updateManualSpot function not available for ${metalName}`,
              );
            }
          },
          `Save manual spot price for ${metalName}`,
        );
      }

      // Cancel button (in manual input)
      if (cancelBtn) {
        safeAttachListener(
          cancelBtn,
          "click",
          () => {
            const manualInput = document.getElementById(
              `manualInput${metalName}`,
            );
            if (manualInput) {
              manualInput.style.display = "none";
              const input = document.getElementById(
                `userSpotPrice${metalName}`,
              );
              if (input) input.value = "";
            }
          },
          `Cancel manual spot price for ${metalName}`,
        );
      }

      // Enter key in input field
      if (inputEl) {
        safeAttachListener(
          inputEl,
          "keydown",
          (e) => {
            if (e.key === "Enter" && typeof updateManualSpot === "function") {
              updateManualSpot(metalKey);
            }
          },
          `Manual spot price input for ${metalName}`,
        );
      }
    });

    // IMPORT/EXPORT EVENT LISTENERS
    debugLog("Setting up import/export listeners...");

    if (elements.importCsvFile) {
      safeAttachListener(
        elements.importCsvFile,
        "change",
        function (e) {
          if (e.target.files.length > 0) {
            importCsv(e.target.files[0]);
          }
          this.value = "";
        },
        "CSV import",
      );
    }

    if (elements.importJsonFile) {
      safeAttachListener(
        elements.importJsonFile,
        "change",
        function (e) {
          if (e.target.files.length > 0) {
            importJson(e.target.files[0]);
          }
          this.value = "";
        },
        "JSON import",
      );
    }

    if (elements.importExcelFile) {
      safeAttachListener(
        elements.importExcelFile,
        "change",
        function (e) {
          if (e.target.files.length > 0) {
            importExcel(e.target.files[0]);
          }
          this.value = "";
        },
        "Excel import",
      );
    }

    // Export buttons
    if (elements.exportCsvBtn) {
      safeAttachListener(
        elements.exportCsvBtn,
        "click",
        exportCsv,
        "CSV export",
      );
    }
    if (elements.exportJsonBtn) {
      safeAttachListener(
        elements.exportJsonBtn,
        "click",
        exportJson,
        "JSON export",
      );
    }
    if (elements.exportExcelBtn) {
      safeAttachListener(
        elements.exportExcelBtn,
        "click",
        exportExcel,
        "Excel export",
      );
    }
    if (elements.exportPdfBtn) {
      safeAttachListener(
        elements.exportPdfBtn,
        "click",
        exportPdf,
        "PDF export",
      );
    }
    if (elements.numistaExportBtn) {
      safeAttachListener(
        elements.numistaExportBtn,
        "click",
        exportNumistaCsv,
        "Numista CSV export",
      );
    }
    if (elements.cloudSyncBtn) {
      safeAttachListener(
        elements.cloudSyncBtn,
        "click",
        () => {
          if (elements.cloudSyncModal)
            elements.cloudSyncModal.style.display = "flex";
        },
        "Cloud Sync button",
      );
    }

    // Custom mapping buttons
    if (elements.addMappingBtn) {
      safeAttachListener(
        elements.addMappingBtn,
        "click",
        () => {
          const pattern = prompt("Enter regex pattern to match:");
          const field = prompt("Enter field name to map to:");
          if (pattern && field) {
            CustomMapping.addMapping(pattern, field);
            alert(`Mapping added: ${pattern} → ${field}`);
          }
        },
        "Add custom mapping",
      );
    }
    if (elements.applyMappingsBtn) {
      safeAttachListener(
        elements.applyMappingsBtn,
        "click",
        () => {
          console.log("Custom mappings:", CustomMapping.list());
          alert("Mappings applied. Check console for details.");
        },
        "Apply custom mappings",
      );
    }
    if (elements.clearMappingsBtn) {
      safeAttachListener(
        elements.clearMappingsBtn,
        "click",
        () => {
          CustomMapping.clear();
          alert("Custom mappings cleared.");
        },
        "Clear custom mappings",
      );
    }

    const cloudSyncCloseBtn = document.getElementById("cloudSyncCloseBtn");
    if (cloudSyncCloseBtn && elements.cloudSyncModal) {
      safeAttachListener(
        cloudSyncCloseBtn,
        "click",
        () => (elements.cloudSyncModal.style.display = "none"),
        "Cloud Sync close",
      );
    }

    // Boating Accident Button
    if (elements.boatingAccidentBtn) {
      safeAttachListener(
        elements.boatingAccidentBtn,
        "click",
        function () {
          if (
            confirm(
              "Did you really lose it all in a boating accident? This will wipe all local data.",
            )
          ) {
            localStorage.removeItem(LS_KEY);
            localStorage.removeItem(SPOT_HISTORY_KEY);
            localStorage.removeItem(API_KEY_STORAGE_KEY);
            localStorage.removeItem(API_CACHE_KEY);
            Object.values(METALS).forEach((metalConfig) => {
              localStorage.removeItem(metalConfig.localStorageKey);
            });
            sessionStorage.clear();

            loadInventory();
            renderTable();
            loadSpotHistory();
            fetchSpotPrice();

            apiConfig = { provider: "", keys: {} };
            apiCache = null;
            updateSyncButtonStates();

            alert("All data has been erased. Hope your scuba gear is ready!");
          }
        },
        "Boating accident button",
      );
    }

    // Files modal close handlers
    const filesModal = document.getElementById("filesModal");
    const filesCloseBtn = document.getElementById("filesCloseBtn");
    if (filesModal) {
      safeAttachListener(
        filesModal,
        "click",
        (e) => {
          if (e.target === filesModal && typeof hideFilesModal === "function") {
            hideFilesModal();
          }
        },
        "Files modal background",
      );
    }
    if (filesCloseBtn) {
      safeAttachListener(
        filesCloseBtn,
        "click",
        () => {
          if (typeof hideFilesModal === "function") hideFilesModal();
        },
        "Files close button",
      );
    }

    // Appearance modal close handlers
    const appearanceModal = document.getElementById("appearanceModal");
    const appearanceCloseBtn = document.getElementById("appearanceCloseBtn");
    if (appearanceModal) {
      safeAttachListener(
        appearanceModal,
        "click",
        (e) => {
          if (
            e.target === appearanceModal &&
            typeof hideAppearanceModal === "function"
          ) {
            hideAppearanceModal();
          }
        },
        "Appearance modal background",
      );
    }
    if (appearanceCloseBtn) {
      safeAttachListener(
        appearanceCloseBtn,
        "click",
        () => {
          if (typeof hideAppearanceModal === "function") hideAppearanceModal();
        },
        "Appearance close button",
      );
    }

    // API MODAL EVENT LISTENERS
    debugLog("Setting up API modal listeners...");
    setupApiEvents();

    // ABOUT MODAL EVENT LISTENERS
    debugLog("Setting up about modal listeners...");
    if (typeof setupAboutModalEvents === "function") {
      setupAboutModalEvents();
    }

    debugLog("✓ All event listeners setup complete");
  } catch (error) {
    console.error("❌ Error setting up event listeners:", error);
    throw error; // Re-throw to trigger fallback in init.js
  }
};

/**
 * Sets up pagination event listeners
 */
const setupPagination = () => {
  debugLog("Setting up pagination listeners...");

  try {
    if (elements.itemsPerPage) {
      safeAttachListener(
        elements.itemsPerPage,
        "change",
        function () {
          itemsPerPage = parseInt(this.value);
          currentPage = 1;
          renderTable();
        },
        "Items per page select",
      );
    }

    if (elements.prevPage) {
      safeAttachListener(
        elements.prevPage,
        "click",
        function () {
          if (currentPage > 1) {
            currentPage--;
            renderTable();
          }
        },
        "Previous page button",
      );
    }

    if (elements.nextPage) {
      safeAttachListener(
        elements.nextPage,
        "click",
        function () {
          const totalPages = calculateTotalPages(filterInventory());
          if (currentPage < totalPages) {
            currentPage++;
            renderTable();
          }
        },
        "Next page button",
      );
    }

    if (elements.firstPage) {
      safeAttachListener(
        elements.firstPage,
        "click",
        function () {
          currentPage = 1;
          renderTable();
        },
        "First page button",
      );
    }

    if (elements.lastPage) {
      safeAttachListener(
        elements.lastPage,
        "click",
        function () {
          currentPage = calculateTotalPages(filterInventory());
          renderTable();
        },
        "Last page button",
      );
    }

    debugLog("✓ Pagination listeners setup complete");
  } catch (error) {
    console.error("❌ Error setting up pagination listeners:", error);
  }
};

/**
 * Sets up search event listeners
 */
const setupSearch = () => {
  debugLog("Setting up search listeners...");

  try {
    if (elements.searchInput) {
      safeAttachListener(
        elements.searchInput,
        "input",
        function () {
          searchQuery = this.value;
          currentPage = 1; // Reset to first page when search changes
          renderTable();
        },
        "Search input",
      );
    }

    if (elements.clearSearchBtn) {
      safeAttachListener(
        elements.clearSearchBtn,
        "click",
        function () {
          if (elements.searchInput) {
            elements.searchInput.value = "";
          }
          searchQuery = "";
          columnFilters = {};
          currentPage = 1;
          renderTable();
        },
        "Clear search button",
      );
    }

    if (elements.newItemBtn) {
      safeAttachListener(
        elements.newItemBtn,
        "click",
        () => {
          if (elements.inventoryForm) {
            elements.inventoryForm.reset();
            elements.itemDate.value = todayStr();
          }
          if (elements.addModal) elements.addModal.style.display = "flex";
        },
        "New item button",
      );
    }

    debugLog("✓ Search listeners setup complete");
  } catch (error) {
    console.error("❌ Error setting up search listeners:", error);
  }
};

/**
 * Sets up theme toggle event listeners
 */
const setupThemeToggle = () => {
  debugLog("Setting up theme toggle...");

  try {
    // Initialize theme with system preference detection
    if (typeof initTheme === "function") {
      initTheme();
    } else {
      // Fallback initialization
      const savedTheme = localStorage.getItem(THEME_KEY) || "light";
      setTheme(savedTheme);
    }

    // Set up system theme change listener
    if (typeof setupSystemThemeListener === "function") {
      setupSystemThemeListener();
    }

    debugLog("✓ Theme toggle setup complete");
  } catch (error) {
    console.error("❌ Error setting up theme toggle:", error);
  }
};

/**
 * Sets up API-related event listeners
 */
const setupApiEvents = () => {
  debugLog("Setting up API events...");

  try {
    let quotaProvider = null;
    const apiModal = document.getElementById("apiModal");
    const apiCloseBtn = document.getElementById("apiCloseBtn");
    const infoModal = document.getElementById("apiInfoModal");
    const infoCloseBtn = document.getElementById("apiInfoCloseBtn");

    if (apiModal) {
      safeAttachListener(
        apiModal,
        "click",
        (e) => {
          if (e.target === apiModal && typeof hideApiModal === "function") {
            hideApiModal();
          }
        },
        "API modal background",
      );
    }

    if (apiCloseBtn) {
      safeAttachListener(
        apiCloseBtn,
        "click",
        () => {
          if (typeof hideApiModal === "function") {
            hideApiModal();
          }
        },
        "API close button",
      );
    }

    if (infoModal) {
      safeAttachListener(
        infoModal,
        "click",
        (e) => {
          if (
            e.target === infoModal &&
            typeof hideProviderInfo === "function"
          ) {
            hideProviderInfo();
          }
        },
        "Provider info modal background",
      );
    }

    if (infoCloseBtn) {
      safeAttachListener(
        infoCloseBtn,
        "click",
        () => {
          if (typeof hideProviderInfo === "function") {
            hideProviderInfo();
          }
        },
        "Provider info close",
      );
    }

    document.querySelectorAll(".api-info-link").forEach((link) => {
      const provider = link.getAttribute("data-provider");
      safeAttachListener(
        link,
        "click",
        (e) => {
          e.preventDefault();
          if (typeof showProviderInfo === "function") {
            showProviderInfo(provider);
          }
        },
        "API info link",
      );
    });

    document.querySelectorAll(".api-sync-btn").forEach((btn) => {
      const provider = btn.getAttribute("data-provider");
      safeAttachListener(
        btn,
        "click",
        () => {
          if (typeof handleProviderSync === "function") {
            handleProviderSync(provider);
          }
        },
        "API sync button",
      );
    });

    document.querySelectorAll(".api-quota-btn").forEach((btn) => {
      const provider = btn.getAttribute("data-provider");
      safeAttachListener(
        btn,
        "click",
        () => {
          quotaProvider = provider;
          const modal = elements.apiQuotaModal;
          const input = document.getElementById("apiQuotaInput");
          if (modal && input) {
            const cfg = loadApiConfig();
            const usage = cfg.usage?.[provider] || {
              quota: DEFAULT_API_QUOTA,
              used: 0,
            };
            input.value = usage.quota;
            modal.style.display = "flex";
          }
        },
        "API quota button",
      );
    });

    document.querySelectorAll(".api-clear-btn").forEach((btn) => {
      const provider = btn.getAttribute("data-provider");
      safeAttachListener(
        btn,
        "click",
        () => {
          if (typeof clearApiKey === "function") {
            clearApiKey(provider);
          }
        },
        "API clear key button",
      );
    });

    const cacheDuration = document.getElementById("apiCacheDuration");
    if (cacheDuration) {
      safeAttachListener(
        cacheDuration,
        "change",
        () => {
          if (typeof setCacheDuration === "function") {
            setCacheDuration(parseInt(cacheDuration.value, 10));
          }
        },
        "API cache duration select",
      );
    }

    document.querySelectorAll(".provider-default-btn").forEach((btn) => {
      const provider = btn.getAttribute("data-provider");
      safeAttachListener(
        btn,
        "click",
        () => {
          if (typeof setDefaultProvider === "function") {
            setDefaultProvider(provider);
          }
        },
        "Default provider button",
      );
    });

    const quotaClose = document.getElementById("apiQuotaCloseBtn");
    if (quotaClose && elements.apiQuotaModal) {
      safeAttachListener(
        quotaClose,
        "click",
        () => (elements.apiQuotaModal.style.display = "none"),
        "API quota close",
      );
    }
    const quotaSave = document.getElementById("apiQuotaSaveBtn");
    if (quotaSave && elements.apiQuotaModal) {
      safeAttachListener(
        quotaSave,
        "click",
        () => {
          const input = document.getElementById("apiQuotaInput");
          const val = parseInt(input.value, 10);
          if (!isNaN(val) && quotaProvider) {
            const cfg = loadApiConfig();
            if (!cfg.usage[quotaProvider])
              cfg.usage[quotaProvider] = { quota: val, used: 0 };
            cfg.usage[quotaProvider].quota = val;
            saveApiConfig(cfg);
            elements.apiQuotaModal.style.display = "none";
            updateProviderHistoryTables();
          }
        },
        "API quota save",
      );
    }
    const flushCacheBtn = document.getElementById("flushCacheBtn");
    if (flushCacheBtn) {
      safeAttachListener(
        flushCacheBtn,
        "click",
        () => {
          if (typeof clearApiCache === "function") {
            const warnMessage =
              "This will delete the API cache and history. Click OK to continue or Cancel to keep it.";
            if (confirm(warnMessage)) {
              clearApiCache();
            }
          }
        },
        "Flush cache button",
      );
    }

    const providersBtn = document.getElementById("providersBtn");
    if (providersBtn) {
      safeAttachListener(
        providersBtn,
        "click",
        () => {
          if (typeof showApiProvidersModal === "function") {
            showApiProvidersModal();
          }
        },
        "Providers button",
      );
    }

    const historyBtn = document.getElementById("apiHistoryBtn");
    if (historyBtn) {
      safeAttachListener(
        historyBtn,
        "click",
        () => {
          if (typeof showApiHistoryModal === "function") {
            showApiHistoryModal();
          }
        },
        "API history button",
      );
    }

    const syncAllBtn = document.getElementById("syncAllBtn");
    if (syncAllBtn) {
      safeAttachListener(
        syncAllBtn,
        "click",
        async () => {
          if (typeof syncAllProviders === "function") {
            const count = await syncAllProviders();
            alert(`${count} records updated.`);
          }
        },
        "Sync all providers button",
      );
    }

    const historyModal = document.getElementById("apiHistoryModal");
    const historyCloseBtn = document.getElementById("apiHistoryCloseBtn");
    const providersModal = document.getElementById("apiProvidersModal");
    const providersCloseBtn = document.getElementById("apiProvidersCloseBtn");
    if (historyModal) {
      safeAttachListener(
        historyModal,
        "click",
        (e) => {
          if (e.target === historyModal && typeof hideApiHistoryModal === "function") {
            hideApiHistoryModal();
          }
        },
        "API history modal background",
      );
    }
    if (historyCloseBtn) {
      safeAttachListener(
        historyCloseBtn,
        "click",
        () => {
          if (typeof hideApiHistoryModal === "function") {
            hideApiHistoryModal();
          }
        },
        "API history close button",
      );
    }
    if (providersModal) {
      safeAttachListener(
        providersModal,
        "click",
        (e) => {
          if (e.target === providersModal && typeof hideApiProvidersModal === "function") {
            hideApiProvidersModal();
          }
        },
        "API providers modal background",
      );
    }
    if (providersCloseBtn) {
      safeAttachListener(
        providersCloseBtn,
        "click",
        () => {
          if (typeof hideApiProvidersModal === "function") {
            hideApiProvidersModal();
          }
        },
        "API providers close button",
      );
    }

    // ESC key to close modals
    safeAttachListener(
      document,
      "keydown",
      (e) => {
        if (e.key === "Escape") {
          const filesModal = document.getElementById("filesModal");
          const apiModal = document.getElementById("apiModal");
          const appearanceModal = document.getElementById("appearanceModal");
          const infoModal = document.getElementById("apiInfoModal");
          const historyModal = document.getElementById("apiHistoryModal");
          const providersModal = document.getElementById("apiProvidersModal");
          const editModal = document.getElementById("editModal");
          const addModal = document.getElementById("addModal");
          const notesModal = document.getElementById("notesModal");
          const detailsModal = document.getElementById("detailsModal");
          const changeLogModal = document.getElementById("changeLogModal");

          if (
            filesModal &&
            filesModal.style.display === "flex" &&
            typeof hideFilesModal === "function"
          ) {
            hideFilesModal();
          } else if (
            apiModal &&
            apiModal.style.display === "flex" &&
            typeof hideApiModal === "function"
          ) {
            hideApiModal();
          } else if (
            appearanceModal &&
            appearanceModal.style.display === "flex" &&
            typeof hideAppearanceModal === "function"
          ) {
            hideAppearanceModal();
          } else if (
            infoModal &&
            infoModal.style.display === "flex" &&
            typeof hideProviderInfo === "function"
          ) {
            hideProviderInfo();
          } else if (
            historyModal &&
            historyModal.style.display === "flex" &&
            typeof hideApiHistoryModal === "function"
          ) {
            hideApiHistoryModal();
          } else if (
            providersModal &&
            providersModal.style.display === "flex" &&
            typeof hideApiProvidersModal === "function"
          ) {
            hideApiProvidersModal();
          } else if (editModal && editModal.style.display === "flex") {
            editModal.style.display = "none";
            editingIndex = null;
          } else if (addModal && addModal.style.display === "flex") {
            addModal.style.display = "none";
        } else if (notesModal && notesModal.style.display === "flex") {
          notesModal.style.display = "none";
          notesIndex = null;
        } else if (changeLogModal && changeLogModal.style.display === "flex") {
          changeLogModal.style.display = "none";
          document.body.style.overflow = "";
        } else if (
          detailsModal &&
          detailsModal.style.display === "flex" &&
          typeof closeDetailsModal === "function"
        ) {
            closeDetailsModal();
          }
        }
      },
      "ESC key modal close",
    );

    debugLog("✓ API events setup complete");
  } catch (error) {
    console.error("❌ Error setting up API events:", error);
  }
};

// =============================================================================

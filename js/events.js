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
    // Ensure header text is wrapped in .header-text span
    let headerTextSpan = header.querySelector('.header-text');
    if (!headerTextSpan) {
      // Create new header-text span
      headerTextSpan = document.createElement('span');
      headerTextSpan.className = 'header-text';
    }
    
    // Check if the span is empty or needs text
    if (!headerTextSpan.textContent.trim()) {
      // Find the text content (excluding SVG and existing elements)
      const textNodes = Array.from(header.childNodes).filter(node => 
        node.nodeType === Node.TEXT_NODE && node.textContent.trim()
      );
      
      if (textNodes.length > 0) {
        // Move text content into the span
        headerTextSpan.textContent = textNodes.map(node => node.textContent.trim()).join(' ');
        
        // Remove original text nodes
        textNodes.forEach(node => node.remove());
        
        // Insert the span after the SVG icon (if present) if it's not already in the DOM
        if (!header.contains(headerTextSpan)) {
          const svg = header.querySelector('svg');
          if (svg) {
            svg.insertAdjacentElement('afterend', headerTextSpan);
          } else {
            header.insertBefore(headerTextSpan, header.firstChild);
          }
        }
      }
    }

    // Skip adding resize handle to the Actions column (last column)
    if (index >= headers.length - 1) return;

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "resize-handle";

    /* position:sticky (set via CSS on #inventoryTable thead th) already
       provides a containing block for the absolutely-positioned resize
       handle — no inline position:relative needed. */
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
    { width: 1400, hide: ["collectable"] },
    { width: 1200, hide: ["collectable", "notes"] },
    { width: 992, hide: ["collectable", "notes", "premium"] },
    { width: 768, hide: ["collectable", "notes", "premium", "spot"] },
    {
      width: 640,
      hide: ["collectable", "notes", "premium", "spot", "weight"],
    },
    {
      width: 576,
      hide: [
        "collectable",
        "notes",
        "premium",
        "spot",
        "weight",
        "purchaseLocation",
        "storageLocation",
        "numista",
        "type",
        "metal",
        "actions",
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
    "qty",
    "name",
    "weight",
    "purchasePrice",
    "spot",
    "premium",
    "purchaseLocation",
    "storageLocation",
    "numista",
    "collectable",
    "notes",
    "actions",
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
    // Search Input
    if (elements.searchInput) {
      const debouncedSearch = debounce(() => {
        searchQuery = elements.searchInput.value.replace(/[<>]/g, "").trim();
        renderTable();
        if (typeof renderActiveFilters === "function") {
          renderActiveFilters();
        }
      }, 300);
      safeAttachListener(elements.searchInput, "input", debouncedSearch, "Search Input");
    }

    // Ensure debounce utility is used for search input events
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      const debouncedSearchHandler = debounce((event) => {
        const query = event.target.value;
        searchQuery = query;
        filterInventory();
      }, 300);

      safeAttachListener(
        searchInput,
        'input',
        debouncedSearchHandler,
        'Debounced search input handler'
      );
    }

    // Responsive column handling
    setupResponsiveColumns();


    // CRITICAL HEADER BUTTONS
    debugLog("Setting up header buttons...");

    // App Logo
    if (elements.appLogo) {
      safeAttachListener(
        elements.appLogo,
        "click",
        () => window.location.reload(),
        "App Logo",
      );
    }

    // Settings Button
    if (elements.settingsBtn) {
      safeAttachListener(
        elements.settingsBtn,
        "click",
        (e) => {
          e.preventDefault();
          debugLog("Settings button clicked");
          if (typeof showSettingsModal === "function") {
            showSettingsModal();
          }
        },
        "Settings Button",
      );
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

    // Chip minimum count dropdown (inline)
    const chipMinCountEl = document.getElementById('chipMinCount');
    if (chipMinCountEl) {
      safeAttachListener(
        chipMinCountEl,
        'change',
        (e) => {
          const minCount = parseInt(e.target.value, 10);
          localStorage.setItem('chipMinCount', minCount.toString());
          // Sync settings modal control
          const settingsChipMin = document.getElementById('settingsChipMinCount');
          if (settingsChipMin) settingsChipMin.value = minCount.toString();
          if (typeof renderActiveFilters === 'function') {
            renderActiveFilters();
          }
        },
        'Chip minimum count dropdown'
      );
    }

    // Grouped name chips toggle (inline)
    const groupNameChipsEl = document.getElementById('groupNameChips');
    if (groupNameChipsEl && window.featureFlags) {
      // Set initial state from feature flag
      const initVal = window.featureFlags.isEnabled('GROUPED_NAME_CHIPS') ? 'yes' : 'no';
      groupNameChipsEl.querySelectorAll('.chip-sort-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.val === initVal);
      });

      groupNameChipsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.chip-sort-btn');
        if (!btn) return;
        const isEnabled = btn.dataset.val === 'yes';
        if (isEnabled) {
          window.featureFlags.enable('GROUPED_NAME_CHIPS');
        } else {
          window.featureFlags.disable('GROUPED_NAME_CHIPS');
        }
        // Update active state
        groupNameChipsEl.querySelectorAll('.chip-sort-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.val === btn.dataset.val);
        });
        // Sync settings modal toggle
        const settingsGroup = document.getElementById('settingsGroupNameChips');
        if (settingsGroup) {
          settingsGroup.querySelectorAll('.chip-sort-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.val === btn.dataset.val);
          });
        }
        if (typeof renderActiveFilters === 'function') renderActiveFilters();
      });
    }

    // Chip sort order inline toggle
    const chipSortEl = document.getElementById('chipSortOrder');
    if (chipSortEl) {
      // Restore saved value on setup (migrate 'default' → 'alpha')
      const savedSort = localStorage.getItem('chipSortOrder');
      const activeSort = (savedSort === 'count') ? 'count' : 'alpha';
      chipSortEl.querySelectorAll('.chip-sort-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.sort === activeSort);
      });

      chipSortEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.chip-sort-btn');
        if (!btn) return;
        const val = btn.dataset.sort;
        localStorage.setItem('chipSortOrder', val);
        // Update active state
        chipSortEl.querySelectorAll('.chip-sort-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.sort === val);
        });
        // Sync settings modal toggle
        const settingsSort = document.getElementById('settingsChipSortOrder');
        if (settingsSort) {
          settingsSort.querySelectorAll('.chip-sort-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.sort === val);
          });
        }
        if (typeof renderActiveFilters === 'function') renderActiveFilters();
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
        // Skip the Actions column (last column)
        if (index >= headers.length - 1) {
          return;
        }

        header.style.cursor = "pointer";

        safeAttachListener(
          header,
          "click",
          (e) => {
            if (e.shiftKey) return;
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

    // UNIFIED FORM SUBMISSION (Add + Edit via single #itemModal)
    debugLog("Setting up unified item form...");
    if (elements.inventoryForm) {
      safeAttachListener(
        elements.inventoryForm,
        "submit",
        function (e) {
          e.preventDefault();

          const isEditing = editingIndex !== null;
          const existingItem = isEditing ? { ...inventory[editingIndex] } : {};

          // Read all fields (same for both modes)
          const composition = getCompositionFirstWords(elements.itemMetal.value);
          const metal = parseNumistaMetal(composition);

          const nameInput = elements.itemName.value.trim();
          const name = isEditing ? (nameInput || existingItem.name || '') : nameInput;

          const qtyInput = elements.itemQty.value.trim();
          const qty = qtyInput === '' ? (isEditing ? (existingItem.qty || 1) : 1) : parseInt(qtyInput, 10);

          const type = elements.itemType.value || (isEditing ? existingItem.type : '');

          // Weight: uses real <select>, supports fraction input (e.g. "1/1000", "1 1/2")
          const weightRaw = elements.itemWeight.value;
          let weight;
          if (isEditing && weightRaw === '') {
            weight = typeof existingItem.weight !== 'undefined' ? existingItem.weight : 0;
          } else {
            weight = parseFraction(weightRaw);
            if (elements.itemWeightUnit.value === 'g') {
              weight = gramsToOzt(weight);
            }
            weight = isNaN(weight) ? 0 : parseFloat(weight.toFixed(6));
          }

          // Price: in edit mode, empty field preserves existing price
          const priceRaw = elements.itemPrice.value.trim();
          let price;
          if (isEditing && priceRaw === '') {
            price = typeof existingItem.price !== 'undefined' ? existingItem.price : 0;
          } else {
            price = priceRaw === '' ? 0 : parseFloat(priceRaw);
            price = isNaN(price) || price < 0 ? 0 : price;
          }

          const purchaseLocation = elements.purchaseLocation.value.trim() || (isEditing ? (existingItem.purchaseLocation || '') : '');
          const storageLocation = elements.storageLocation.value.trim() || (isEditing ? (existingItem.storageLocation || 'Unknown') : 'Unknown');
          const serialNumber = (elements.itemSerialNumber || document.getElementById('itemSerialNumber'))?.value?.trim() || (isEditing ? (existingItem.serialNumber || '') : '');
          const notes = elements.itemNotes.value.trim() || (isEditing ? (existingItem.notes || '') : '');
          const date = elements.itemDate.value || (isEditing ? (existingItem.date || '') : todayStr());

          const catalog = elements.itemCatalog ? elements.itemCatalog.value.trim() : '';
          const year = (elements.itemYear || document.getElementById('itemYear'))?.value?.trim() || '';
          const grade = (elements.itemGrade || document.getElementById('itemGrade'))?.value?.trim() || '';
          const gradingAuthority = (elements.itemGradingAuthority || document.getElementById('itemGradingAuthority'))?.value?.trim() || '';
          const certNumber = (elements.itemCertNumber || document.getElementById('itemCertNumber'))?.value?.trim() || '';
          const pcgsNumber = (elements.itemPcgsNumber || document.getElementById('itemPcgsNumber'))?.value?.trim() || '';
          const marketValueInput = elements.itemMarketValue ? elements.itemMarketValue.value.trim() : '';
          const marketValue = marketValueInput && !isNaN(parseFloat(marketValueInput))
            ? parseFloat(marketValueInput)
            : (isEditing ? (existingItem.marketValue || 0) : 0);

          // Purity: read from select or custom input
          let purity = 1.0;
          const puritySelect = elements.itemPuritySelect || document.getElementById('itemPuritySelect');
          if (puritySelect && puritySelect.value === 'custom') {
            const purityInput = elements.itemPurity || document.getElementById('itemPurity');
            purity = purityInput ? (parseFloat(purityInput.value) || 1.0) : 1.0;
          } else if (puritySelect) {
            purity = parseFloat(puritySelect.value) || 1.0;
          }
          if (isEditing && !puritySelect) {
            purity = existingItem.purity || 1.0;
          }

          // Validate mandatory fields
          if (
            !name ||
            !date ||
            !type ||
            !metal ||
            isNaN(weight) ||
            weight <= 0 ||
            isNaN(qty) ||
            qty < 1 ||
            !Number.isInteger(qty)
          ) {
            return alert("Please enter valid values for Name, Date, Type, Metal, Weight, and Quantity.");
          }

          if (isEditing) {
            // --- EDIT MODE ---
            const oldItem = { ...inventory[editingIndex] };
            const serial = oldItem.serial;

            inventory[editingIndex] = {
              ...oldItem,
              metal,
              composition,
              name,
              qty,
              type,
              weight,
              price,
              marketValue,
              date,
              purchaseLocation,
              storageLocation,
              serialNumber,
              notes,
              year,
              grade,
              gradingAuthority,
              certNumber,
              pcgsNumber,
              purity,
              isCollectable: false,
              numistaId: catalog,
            };

            addCompositionOption(composition);

            try {
              if (window.catalogManager && inventory[editingIndex].numistaId) {
                catalogManager.setCatalogId(serial, inventory[editingIndex].numistaId);
              }
            } catch (catErr) {
              console.warn('Failed to update catalog mapping:', catErr);
            }

            saveInventory();
            renderTable();
            renderActiveFilters();
            logItemChanges(oldItem, inventory[editingIndex]);

            editingIndex = null;
            editingChangeLogIndex = null;
          } else {
            // --- ADD MODE ---
            const metalKey = metal.toLowerCase();
            const spotPriceAtPurchase = spotPrices[metalKey] ?? 0;
            const serial = getNextSerial();

            inventory.push({
              metal,
              composition,
              name,
              qty,
              type,
              weight,
              price,
              marketValue,
              date,
              purchaseLocation,
              storageLocation,
              serialNumber,
              notes,
              year,
              grade,
              gradingAuthority,
              certNumber,
              pcgsNumber,
              pcgsVerified: false,
              purity,
              spotPriceAtPurchase,
              premiumPerOz: 0,
              totalPremium: 0,
              isCollectable: false,
              serial,
              uuid: generateUUID(),
              numistaId: catalog,
            });

            typeof registerName === "function" && registerName(name);
            addCompositionOption(composition);

            if (window.catalogManager && catalog) {
              catalogManager.setCatalogId(serial, catalog);
            }

            saveInventory();
            renderTable();
            this.reset();
            elements.itemWeightUnit.value = "oz";
            elements.itemDate.value = todayStr();
          }

          // Close modal
          try {
            if (typeof closeModalById === 'function') {
              closeModalById('itemModal');
            } else if (elements.itemModal) {
              elements.itemModal.style.display = 'none';
              document.body.style.overflow = '';
            }
          } catch (closeErr) {
            console.warn('Failed to close item modal:', closeErr);
          }

          // Update filter chips after inventory mutation
          if (typeof renderActiveFilters === 'function') {
            renderActiveFilters();
          }
        },
        "Unified item form",
      );
    } else {
      console.error("Main inventory form not found!");
    }

    // UNDO CHANGE BUTTON
    if (elements.undoChangeBtn) {
      safeAttachListener(
        elements.undoChangeBtn,
        "click",
        (e) => {
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          if (editingChangeLogIndex !== null) {
            toggleChange(editingChangeLogIndex);
            try { if (typeof closeModalById === 'function') closeModalById('itemModal'); } catch(undoErr) {}
            editingIndex = null;
            editingChangeLogIndex = null;
            renderChangeLog();
          }
        },
        "Undo change button",
      );
    }

    // ITEM MODAL CLOSE / CANCEL BUTTONS
    if (elements.cancelItemBtn) {
      safeAttachListener(
        elements.cancelItemBtn,
        "click",
        function (e) {
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
          try { if (typeof closeModalById === 'function') closeModalById('itemModal'); } catch(closeErr) {}
          editingIndex = null;
          editingChangeLogIndex = null;
        },
        "Cancel item button",
      );
    }

    if (elements.itemCloseBtn) {
      safeAttachListener(
        elements.itemCloseBtn,
        "click",
        (e) => {
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
          try { if (typeof closeModalById === 'function') closeModalById('itemModal'); } catch(closeErr) {}
          editingIndex = null;
          editingChangeLogIndex = null;
        },
        "Item modal close button",
      );
    }

    // SEARCH NUMISTA BUTTON — lookup by N# or search by name
    if (elements.searchNumistaBtn) {
      safeAttachListener(
        elements.searchNumistaBtn,
        "click",
        async () => {
          const catalogVal = (elements.itemCatalog || document.getElementById('itemCatalog'))?.value.trim() || '';
          const nameVal = (elements.itemName || document.getElementById('itemName'))?.value.trim() || '';

          if (!catalogVal && !nameVal) {
            alert('Enter a Name or Catalog N# to search.');
            return;
          }

          if (!catalogAPI || !catalogAPI.activeProvider) {
            alert('Configure Numista API key in Settings first.');
            return;
          }

          const btn = elements.searchNumistaBtn;
          const originalHTML = btn.innerHTML;
          btn.textContent = 'Searching...';
          btn.disabled = true;

          // Type → Numista category mapping for smarter search results
          const TYPE_TO_NUMISTA_CATEGORY = {
            'Coin': 'coin',
            'Bar': 'exonumia',
            'Round': 'exonumia',
            'Note': 'banknote',
            // Aurum omitted — Goldbacks are "Embedded-asset notes" on Numista,
            // which isn't a valid API category. Uncategorized search finds them.
            // Set omitted — Numista sets use a different URL scheme (set.php)
            // and are not searchable via the /types API endpoint.
          };

          try {
            if (catalogVal) {
              // Direct N# lookup → single result
              const result = await catalogAPI.lookupItem(catalogVal);
              showNumistaResults(result ? [result] : [], true, catalogVal);
            } else {
              // Name search → multiple results with smart category/metal filtering
              const typeVal = (elements.itemType || document.getElementById('itemType'))?.value || '';
              const metalVal = (elements.itemMetal || document.getElementById('itemMetal'))?.value || '';

              const searchFilters = { limit: 20 };
              const numistaCategory = TYPE_TO_NUMISTA_CATEGORY[typeVal];
              if (numistaCategory) searchFilters.category = numistaCategory;

              // Prepend metal to query for better results (avoid doubling e.g. "Silver Silver Eagle")
              const searchQuery = metalVal && !nameVal.toLowerCase().includes(metalVal.toLowerCase())
                ? `${metalVal} ${nameVal}` : nameVal;

              const results = await catalogAPI.searchItems(searchQuery, searchFilters);
              showNumistaResults(results, false, searchQuery);
            }
          } catch (error) {
            console.error('Numista search error:', error);
            alert('Search failed: ' + error.message);
          } finally {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
          }
        },
        "Search Numista button",
      );
    }

    // LOOKUP PCGS BUTTON — verify by Cert# or look up by PCGS#
    if (elements.lookupPcgsBtn) {
      safeAttachListener(
        elements.lookupPcgsBtn,
        "click",
        async () => {
          if (typeof lookupPcgsFromForm !== 'function') {
            alert('PCGS lookup is not available.');
            return;
          }

          const btn = elements.lookupPcgsBtn;
          const originalHTML = btn.innerHTML;
          btn.textContent = 'Looking up...';
          btn.disabled = true;

          try {
            const result = await lookupPcgsFromForm();

            if (!result.verified) {
              alert(result.error || 'PCGS lookup failed.');
              return;
            }

            // Show field picker modal instead of auto-filling
            if (typeof showPcgsFieldPicker === 'function') {
              showPcgsFieldPicker(result);
            } else {
              alert('PCGS field picker not available.');
            }
          } catch (error) {
            console.error('PCGS lookup error:', error);
            alert('PCGS lookup failed: ' + error.message);
          } finally {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
          }
        },
        "Lookup PCGS button",
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

    if (elements.debugCloseBtn) {
      safeAttachListener(
        elements.debugCloseBtn,
        "click",
        () => {
          if (typeof hideDebugModal === "function") {
            hideDebugModal();
          }
        },
        "Debug modal close button",
      );
    }

    // Bulk Edit modal open/close
    if (elements.bulkEditBtn) {
      safeAttachListener(
        elements.bulkEditBtn,
        "click",
        () => {
          if (typeof openBulkEdit === "function") openBulkEdit();
        },
        "Bulk edit open button",
      );
    }
    if (elements.bulkEditCloseBtn) {
      safeAttachListener(
        elements.bulkEditCloseBtn,
        "click",
        () => {
          if (typeof closeBulkEdit === "function") closeBulkEdit();
        },
        "Bulk edit close button",
      );
    }

      if (elements.changeLogBtn) {
        safeAttachListener(
          elements.changeLogBtn,
          "click",
          (e) => {
            e.preventDefault();
            if (typeof showSettingsModal === "function") {
              showSettingsModal("changelog");
            }
          },
          "Change log button",
        );
      }

      // Settings panel Change Log clear button
      if (elements.settingsChangeLogClearBtn) {
        safeAttachListener(
          elements.settingsChangeLogClearBtn,
          "click",
          () => {
            if (typeof clearChangeLog === "function") clearChangeLog();
          },
          "Settings change log clear button",
        );
      }

      if (elements.backupReminder) {
        safeAttachListener(
          elements.backupReminder,
          "click",
          (e) => {
            e.preventDefault();
            if (typeof showSettingsModal === "function") {
              showSettingsModal('files');
            }
          },
          "Backup reminder link",
        );
      }

      if (elements.storageReportLink) {
        safeAttachListener(
          elements.storageReportLink,
          "click",
          (e) => {
            e.preventDefault();
            if (typeof openStorageReportPopup === "function") {
              openStorageReportPopup();
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
            if (window.closeModalById) closeModalById('changeLogModal');
            else {
              elements.changeLogModal.style.display = "none";
              document.body.style.overflow = "";
            }
          }
        },
        "Change log close button",
      );
    }

    if (elements.changeLogClearBtn) {
      safeAttachListener(
        elements.changeLogClearBtn,
        "click",
        () => {
          if (typeof clearChangeLog === "function") {
            clearChangeLog();
          }
        },
        "Change log clear button",
      );
    }

    // SPOT PRICE EVENT LISTENERS — Sparkline card redesign
    debugLog("Setting up spot price listeners...");
    Object.values(METALS).forEach((metalConfig) => {
      const metalKey = metalConfig.key;
      const metalName = metalConfig.name;

      // Sync icon button
      const syncIcon = document.getElementById(`syncIcon${metalName}`);
      if (syncIcon) {
        safeAttachListener(
          syncIcon,
          "click",
          () => {
            debugLog(`Sync icon clicked for ${metalName}`);
            if (typeof syncSpotPricesFromApi === "function") {
              syncSpotPricesFromApi(true);
            } else {
              alert(
                "API sync functionality requires Metals API configuration. Please configure an API provider first.",
              );
            }
          },
          `Sync spot price for ${metalName}`,
        );
      }

      // Range dropdown change → re-render sparkline + save preference
      const rangeSelect = document.getElementById(`spotRange${metalName}`);
      if (rangeSelect) {
        // Restore saved preference
        const saved = typeof loadTrendRanges === "function" ? loadTrendRanges() : {};
        if (saved[metalKey]) {
          rangeSelect.value = String(saved[metalKey]);
        }

        safeAttachListener(
          rangeSelect,
          "change",
          () => {
            const days = parseInt(rangeSelect.value, 10);
            if (typeof saveTrendRange === "function") saveTrendRange(metalKey, days);
            if (typeof updateSparkline === "function") updateSparkline(metalKey);
          },
          `Trend range for ${metalName}`,
        );
      }
    });

    // Shift+click capture handler for inline spot price editing
    document.addEventListener(
      "click",
      (e) => {
        if (!e.shiftKey) return;
        const valueEl = e.target.closest(".spot-card-value");
        if (!valueEl) return;

        e.preventDefault();
        e.stopPropagation();

        const card = valueEl.closest(".spot-card");
        if (!card || !card.dataset.metal) return;

        if (typeof startSpotInlineEdit === "function") {
          startSpotInlineEdit(valueEl, card.dataset.metal);
        }
      },
      true,
    );

    // IMPORT/EXPORT EVENT LISTENERS
    debugLog("Setting up import/export listeners...");

    let csvImportOverride = false;
    if (elements.importCsvOverride && elements.importCsvFile) {
      safeAttachListener(
        elements.importCsvOverride,
        "click",
        () => {
          if (
            confirm(
              "Importing CSV will overwrite all existing data. To combine data, choose Merge instead. Press OK to continue.",
            )
          ) {
            csvImportOverride = true;
            elements.importCsvFile.click();
          }
        },
        "CSV override button",
      );
    }
    if (elements.importCsvMerge && elements.importCsvFile) {
      safeAttachListener(
        elements.importCsvMerge,
        "click",
        () => {
          csvImportOverride = false;
          elements.importCsvFile.click();
        },
        "CSV merge button",
      );
    }
    if (elements.importCsvFile) {
      safeAttachListener(
        elements.importCsvFile,
        "change",
        function (e) {
          if (e.target.files.length > 0) {

            const file = e.target.files[0];
            if (!checkFileSize(file)) {
              alert("File exceeds 2MB limit. Enable cloud backup for larger uploads.");
            } else {
              importCsv(file, csvImportOverride);
            }

          }
          this.value = "";
        },
        "CSV import",
      );
    }

    let jsonImportOverride = false;
    if (elements.importJsonOverride && elements.importJsonFile) {
      safeAttachListener(
        elements.importJsonOverride,
        "click",
        () => {
          if (
            confirm(
              "Importing JSON will overwrite all existing data. To combine data, choose Merge instead. Press OK to continue.",
            )
          ) {
            jsonImportOverride = true;
            elements.importJsonFile.click();
          }
        },
        "JSON override button",
      );
    }
    if (elements.importJsonMerge && elements.importJsonFile) {
      safeAttachListener(
        elements.importJsonMerge,
        "click",
        () => {
          jsonImportOverride = false;
          elements.importJsonFile.click();
        },
        "JSON merge button",
      );
    }
    if (elements.importJsonFile) {
      safeAttachListener(
        elements.importJsonFile,
        "change",
        function (e) {
          if (e.target.files.length > 0) {

            const file = e.target.files[0];
            if (!checkFileSize(file)) {
              alert("File exceeds 2MB limit. Enable cloud backup for larger uploads.");
            } else {
              importJson(file, jsonImportOverride);
            }

          }
          this.value = "";
        },
        "JSON import",
      );
    }

    let numistaOverride = false;
    const importNumistaBtn = document.getElementById("importNumistaBtn");
    const mergeNumistaBtn = document.getElementById("mergeNumistaBtn");
    if (importNumistaBtn && elements.numistaImportFile) {
      safeAttachListener(
        importNumistaBtn,
        "click",
        () => {
          if (
            confirm(
              "Importing Numista CSV will overwrite all existing data. To combine data, choose Merge instead. Press OK to continue.",
            )
          ) {
            numistaOverride = true;
            elements.numistaImportFile.click();
          }
        },
        "Import Numista CSV button",
      );
    }
    if (mergeNumistaBtn && elements.numistaImportFile) {
      safeAttachListener(
        mergeNumistaBtn,
        "click",
        () => {
          numistaOverride = false;
          elements.numistaImportFile.click();
        },
        "Merge Numista CSV button",
      );
    }
      if (elements.numistaImportFile) {
        safeAttachListener(
          elements.numistaImportFile,
          "change",
          function (e) {
            if (e.target.files.length > 0) {

            const file = e.target.files[0];
            if (!checkFileSize(file)) {
              alert("File exceeds 2MB limit. Enable cloud backup for larger uploads.");
            } else {
              importNumistaCsv(file, numistaOverride);
            }
          }
          this.value = "";
        },
          "Numista CSV import",
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
    if (elements.exportPdfBtn) {
      safeAttachListener(
        elements.exportPdfBtn,
        "click",
        exportPdf,
        "PDF export",
      );
    }
    if (elements.cloudSyncBtn) {
      safeAttachListener(
        elements.cloudSyncBtn,
        "click",
        () => {
          if (elements.cloudSyncModal) {
            if (window.openModalById) openModalById('cloudSyncModal');
            else elements.cloudSyncModal.style.display = "flex";
          }
        },
        "Cloud Sync button",
      );
    }
    const cloudSyncCloseBtn = document.getElementById("cloudSyncCloseBtn");
    if (cloudSyncCloseBtn && elements.cloudSyncModal) {
      safeAttachListener(
        cloudSyncCloseBtn,
        "click",
        () => {
          if (window.closeModalById) closeModalById('cloudSyncModal');
          else elements.cloudSyncModal.style.display = "none";
        },
        "Cloud Sync close",
      );
    }

    // Vault Encrypted Backup Buttons
    if (elements.vaultExportBtn) {
      safeAttachListener(
        elements.vaultExportBtn,
        "click",
        function () {
          openVaultModal("export");
        },
        "Vault export button",
      );
    }

    if (elements.vaultImportBtn) {
      safeAttachListener(
        elements.vaultImportBtn,
        "click",
        function () {
          if (elements.vaultImportFile) elements.vaultImportFile.click();
        },
        "Vault import button",
      );
    }

    if (elements.vaultImportFile) {
      safeAttachListener(
        elements.vaultImportFile,
        "change",
        function (e) {
          var file = e.target.files && e.target.files[0];
          if (file) {
            openVaultModal("import", file);
            // Reset input so the same file can be selected again
            e.target.value = "";
          }
        },
        "Vault import file input",
      );
    }

    // Vault modal live password events
    (function () {
      var pw = document.getElementById("vaultPassword");
      var cpw = document.getElementById("vaultConfirmPassword");
      if (pw) {
        pw.addEventListener("input", function () {
          updateStrengthBar(pw.value);
          if (cpw) updateMatchIndicator(pw.value, cpw.value);
        });
      }
      if (cpw) {
        cpw.addEventListener("input", function () {
          if (pw) updateMatchIndicator(pw.value, cpw.value);
        });
      }
    })();

    // Remove Inventory Data Button
    if (elements.removeInventoryDataBtn) {
      safeAttachListener(
        elements.removeInventoryDataBtn,
        "click",
        function () {
          if (confirm("Remove all inventory items? This cannot be undone.")) {
            localStorage.removeItem(LS_KEY);
            loadInventory();
            renderTable();
            renderActiveFilters();
            alert("Inventory data cleared.");
          }
        },
        "Remove inventory data button",
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
            renderActiveFilters();
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
 * Sets up visible-rows (portal view) event listener
 */
const setupPagination = () => {
  debugLog("Setting up visible-rows listener...");

  try {
    if (elements.itemsPerPage) {
      safeAttachListener(
        elements.itemsPerPage,
        "change",
        function () {
          itemsPerPage = parseInt(this.value);
          // Persist setting
          try { localStorage.setItem(ITEMS_PER_PAGE_KEY, String(itemsPerPage)); } catch (e) { /* ignore */ }
          // Sync settings modal control
          const settingsIpp = document.getElementById('settingsItemsPerPage');
          if (settingsIpp) settingsIpp.value = String(itemsPerPage);
          renderTable();
        },
        "Visible rows select",
      );
    }

    debugLog("✓ Visible-rows listener setup complete");
  } catch (error) {
    console.error("❌ Error setting up visible-rows listener:", error);
  }
};

/**
 * Sets up bulk edit control panel event listeners
 */
const setupBulkEditControls = () => {
  debugLog("Setting up bulk edit control listeners...");

  try {
    // Bulk toggle all edit mode
    const bulkToggleAll = document.getElementById('bulkToggleAll');
    if (bulkToggleAll) {
      safeAttachListener(
        bulkToggleAll,
        "click",
        function () {
          if (typeof window.toggleAllItemsEdit === 'function') {
            window.toggleAllItemsEdit();
          }
        },
        "Bulk toggle all edit mode",
      );
    }

    // Bulk save all changes
    const bulkSaveAll = document.getElementById('bulkSaveAll');
    if (bulkSaveAll) {
      safeAttachListener(
        bulkSaveAll,
        "click",
        function () {
          if (typeof window.saveAllEdits === 'function') {
            window.saveAllEdits();
          }
        },
        "Bulk save all changes",
      );
    }

    // Bulk cancel all changes
    const bulkCancelAll = document.getElementById('bulkCancelAll');
    if (bulkCancelAll) {
      safeAttachListener(
        bulkCancelAll,
        "click",
        function () {
          if (typeof window.cancelAllEdits === 'function') {
            window.cancelAllEdits();
          }
        },
        "Bulk cancel all changes",
      );
    }

    debugLog("✓ Bulk edit control listeners setup complete");
  } catch (error) {
    console.error("❌ Error setting up bulk edit control listeners:", error);
  }
};

/**
 * Sets up search event listeners
 */
const setupSearch = () => {
  debugLog("Setting up search listeners...");

  try {
    if (elements.searchInput) {
      const handleSearchInput = debounce(function () {
        searchQuery = this.value.replace(/[<>]/g, '').trim();
        renderTable();
      }, 300);
      safeAttachListener(
        elements.searchInput,
        "input",
        handleSearchInput,
        "Search input",
      );
    }

    if (elements.typeFilter) {
      safeAttachListener(
        elements.typeFilter,
        "change",
        function () {
          const value = this.value;
          if (value) {
            activeFilters.type = { values: [value], exclude: false };
          } else {
            delete activeFilters.type;
          }
          searchQuery = "";
          if (elements.searchInput) elements.searchInput.value = "";
          renderTable();
          renderActiveFilters();
        },
        "Type filter select",
      );
    }

    if (elements.metalFilter) {
      safeAttachListener(
        elements.metalFilter,
        "change",
        function () {
          const value = this.value;
          if (value) {
            activeFilters.metal = { values: [value], exclude: false };
          } else {
            delete activeFilters.metal;
          }
          searchQuery = "";
          if (elements.searchInput) elements.searchInput.value = "";
          renderTable();
          renderActiveFilters();
        },
        "Metal filter select",
      );
    }

    if (elements.clearBtn) {
      safeAttachListener(
        elements.clearBtn,
        "click",
        clearAllFilters,
        "Clear search button",
      );
    }

    if (elements.newItemBtn) {
      safeAttachListener(
        elements.newItemBtn,
        "click",
        () => {
          // Clear editing state (ensures add mode)
          editingIndex = null;
          editingChangeLogIndex = null;
          // Reset form and set defaults
          if (elements.inventoryForm) {
            elements.inventoryForm.reset();
            elements.itemWeightUnit.value = "oz";
            elements.itemDate.value = todayStr();
          }
          if (elements.itemSerial) elements.itemSerial.value = '';
          // Set modal to add mode
          if (elements.itemModalTitle) elements.itemModalTitle.textContent = "Add Inventory Item";
          if (elements.itemModalSubmit) elements.itemModalSubmit.textContent = "Add to Inventory";
          if (elements.undoChangeBtn) elements.undoChangeBtn.style.display = "none";
          // Reset purity to default (form.reset already sets select to first option)
          const purityCustom = elements.purityCustomWrapper || document.getElementById('purityCustomWrapper');
          if (purityCustom) purityCustom.style.display = 'none';
          // Hide PCGS verified icon in add mode
          const certVerifiedIcon = document.getElementById('certVerifiedIcon');
          if (certVerifiedIcon) certVerifiedIcon.style.display = 'none';
          // Open modal
          if (elements.itemModal) {
            if (window.openModalById) openModalById('itemModal');
            else elements.itemModal.style.display = "flex";
          }
        },
        "New item button",
      );
    }

    // Chip minimum count control
    const chipMinCountEl = document.getElementById('chipMinCount');
    if (chipMinCountEl) {
      safeAttachListener(
        chipMinCountEl,
        "change",
        function() {
          localStorage.setItem('chipMinCount', this.value);
          if (typeof renderActiveFilters === "function") {
            renderActiveFilters();
          }
        },
        "Chip minimum count select",
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
const updateThemeButton = () => {
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";

  // Apply theme classes to all theme buttons (header buttons)
  document.querySelectorAll(".theme-btn").forEach((btn) => {
    btn.classList.remove("dark", "light", "sepia");
    btn.classList.add(savedTheme);
  });

  // Update settings modal theme picker active state
  document.querySelectorAll('.theme-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === savedTheme);
  });
};

window.updateThemeButton = updateThemeButton;

const setupThemeToggle = () => {
  debugLog("Setting up theme toggle...");

  try {
    // Initialize theme with system preference detection
    if (typeof initTheme === "function") {
      initTheme();
    } else {
      const savedTheme = localStorage.getItem(THEME_KEY) || "system";
      setTheme(savedTheme);
    }

    updateThemeButton();

    // Set up system theme change listener
    if (typeof setupSystemThemeListener === "function") {
      setupSystemThemeListener();
    }

    if (window.matchMedia) {
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", () => {
          // Update button if no explicit theme is set
          if (!localStorage.getItem(THEME_KEY)) {
            updateThemeButton();
          }
        });
    }

    // Theme is now controlled from the Settings modal theme picker
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
    const infoModal = document.getElementById("apiInfoModal");
    const infoCloseBtn = document.getElementById("apiInfoCloseBtn");

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

    document.querySelectorAll(".api-save-btn").forEach((btn) => {
      const provider = btn.getAttribute("data-provider");
      safeAttachListener(
        btn,
        "click",
        () => {
          if (typeof handleProviderSave === "function") {
            handleProviderSave(provider);
          }
        },
        "API save button",
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
          const qp = elements.apiQuotaModal.dataset.quotaProvider || quotaProvider;
          if (!isNaN(val) && qp) {
            const cfg = loadApiConfig();
            if (!cfg.usage[qp])
              cfg.usage[qp] = { quota: val, used: 0 };
            cfg.usage[qp].quota = val;
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

    const catalogHistoryBtn = document.getElementById("catalogHistoryBtn");
    if (catalogHistoryBtn) {
      safeAttachListener(
        catalogHistoryBtn,
        "click",
        () => {
          if (typeof showCatalogHistoryModal === "function") {
            showCatalogHistoryModal();
          }
        },
        "Catalog history button",
      );
    }

    const syncAllBtn = document.getElementById("syncAllBtn");
    if (syncAllBtn) {
      safeAttachListener(
        syncAllBtn,
        "click",
        async () => {
          if (typeof syncProviderChain === "function") {
            const { updatedCount, results } = await syncProviderChain({ showProgress: true, forceSync: true });
            const summary = Object.entries(results)
              .filter(([_, status]) => status !== "skipped")
              .map(([prov, status]) => `${API_PROVIDERS[prov]?.name || prov}: ${status}`)
              .join("\n");
            alert(`Synced ${updatedCount} prices.\n\n${summary}`);
          }
        },
        "Sync all providers button",
      );
    }

    const historyModal = document.getElementById("apiHistoryModal");
    const historyCloseBtn = document.getElementById("apiHistoryCloseBtn");
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
    const catalogHistoryModal = document.getElementById("catalogHistoryModal");
    const catalogHistoryCloseBtn = document.getElementById("catalogHistoryCloseBtn");
    if (catalogHistoryModal) {
      safeAttachListener(
        catalogHistoryModal,
        "click",
        (e) => {
          if (e.target === catalogHistoryModal && typeof hideCatalogHistoryModal === "function") {
            hideCatalogHistoryModal();
          }
        },
        "Catalog history modal background",
      );
    }
    if (catalogHistoryCloseBtn) {
      safeAttachListener(
        catalogHistoryCloseBtn,
        "click",
        () => {
          if (typeof hideCatalogHistoryModal === "function") {
            hideCatalogHistoryModal();
          }
        },
        "Catalog history close button",
      );
    }

    // ESC key to close modals (sub-modals first, then settings, then others)
    safeAttachListener(
      document,
      "keydown",
      (e) => {
        if (e.key === "Escape") {
          const infoModal = document.getElementById("apiInfoModal");
          const historyModal = document.getElementById("apiHistoryModal");
          const catalogHistModal = document.getElementById("catalogHistoryModal");
          const quotaModal = document.getElementById("apiQuotaModal");
          const bulkEditModal = document.getElementById("bulkEditModal");
          const settingsModal = document.getElementById("settingsModal");
          const itemModal = document.getElementById("itemModal");
          const notesModal = document.getElementById("notesModal");
          const detailsModal = document.getElementById("detailsModal");
          const changeLogModal = document.getElementById("changeLogModal");
          const storageReportModal = document.getElementById("storageReportModal");

          // Close sub-modals (stacking overlays) before settings modal
          if (
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
            catalogHistModal &&
            catalogHistModal.style.display === "flex" &&
            typeof hideCatalogHistoryModal === "function"
          ) {
            hideCatalogHistoryModal();
          } else if (
            quotaModal &&
            quotaModal.style.display === "flex"
          ) {
            quotaModal.style.display = "none";
          } else if (
            bulkEditModal &&
            bulkEditModal.style.display !== "none" &&
            typeof closeBulkEdit === "function"
          ) {
            closeBulkEdit();
          } else if (
            settingsModal &&
            settingsModal.style.display === "flex" &&
            typeof hideSettingsModal === "function"
          ) {
            hideSettingsModal();
          } else if (itemModal && itemModal.style.display === "flex") {
            itemModal.style.display = "none";
            document.body.style.overflow = "";
            editingIndex = null;
            editingChangeLogIndex = null;
          } else if (notesModal && notesModal.style.display === "flex") {
            notesModal.style.display = "none";
            notesIndex = null;
          } else if (changeLogModal && changeLogModal.style.display === "flex") {
            changeLogModal.style.display = "none";
            document.body.style.overflow = "";
          } else if (storageReportModal && storageReportModal.style.display === "flex") {
            storageReportModal.style.display = "none";
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

    // Collectable toggle listeners removed — portfolio redesign

    debugLog("✓ API events setup complete");
  } catch (error) {
    console.error("❌ Error setting up API events:", error);
  }
};

// =============================================================================

// Early cleanup of stray localStorage entries before application initialization
document.addEventListener('DOMContentLoaded', cleanupStorage);

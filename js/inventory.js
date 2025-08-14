// INVENTORY FUNCTIONS

// Use LS_KEY from constants.js (already defined globally)
// const LS_KEY is defined in constants.js - no need to redeclare

// Ensure inventory variable is accessible
// Reference the global inventory variable (declared in state.js)
// Don't redeclare - just ensure we have access to it
if (typeof inventory === 'undefined') {
  window.inventory = [];
}

// Ensure window.inventory is synchronized 
window.inventory = window.inventory || inventory || [];

// Get references to utility functions without overriding existing implementations
// Only create fallbacks if the functions don't already exist
// This prevents conflicts between utils.js and inventory.js
if (typeof window.saveData !== 'function') {
  window.saveData = (key, data) => {
    try {
      const jsonData = JSON.stringify(data);
      localStorage.setItem(key, jsonData);
      return true;
    } catch (e) {
      console.error('Error saving data:', e);
      return false;
    }
  };
}

if (typeof window.loadData !== 'function') {
  window.loadData = (key, defaultValue = []) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error loading data:', e);
      return defaultValue;
    }
  };
}

/**
 * Creates a comprehensive backup ZIP file containing all application data
 * 
 * This function generates a complete backup archive including:
 * - Current inventory data in JSON format
 * - All export formats (CSV, HTML)
 * - Application settings and configuration
 * - Spot price history
 * - README file explaining backup contents
 * 
 * The backup is packaged as a ZIP file for easy storage and portability.
 * All data is exported in multiple formats to ensure compatibility and
 * provide redundancy for data recovery scenarios.
 * 
 * @returns {void} Downloads a ZIP file containing complete backup
 * 
 * @example
 * // Called to generate a complete backup archive
 * await createBackupZip();
 */
const createBackupZip = async () => {
  try {
    // Show loading indicator
    const backupBtn = document.getElementById('backupAllBtn');
    const originalText = backupBtn ? backupBtn.textContent : '';
    if (backupBtn) {
      backupBtn.textContent = 'Creating Backup...';
      backupBtn.disabled = true;
    }

    // Create new JSZip instance
    const zip = new JSZip();
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const timeFormatted = new Date().toLocaleString();

    // 1. Add main inventory data (JSON)
    const inventoryData = {
      version: APP_VERSION,
      exportDate: new Date().toISOString(),
      inventory: inventory.map(item => ({
        metal: item.metal,
        composition: item.composition,
        name: item.name,
        qty: item.qty,
        type: item.type,
        weight: item.weight,
        price: item.price,
        date: item.date,
        purchaseLocation: item.purchaseLocation,
        storageLocation: item.storageLocation,
        notes: item.notes,
        spotPriceAtPurchase: item.spotPriceAtPurchase,
        isCollectable: item.isCollectable,
        premiumPerOz: item.premiumPerOz,
        totalPremium: item.totalPremium,
        numistaId: item.numistaId,
        serial: item.serial
      }))
    };
    zip.file('inventory_data.json', JSON.stringify(inventoryData, null, 2));

    // 2. Add current spot prices, settings, and catalog mappings
    const settings = {
      version: APP_VERSION,
      exportDate: new Date().toISOString(),
      spotPrices: spotPrices,
      theme: localStorage.getItem(THEME_KEY) || 'light',
      itemsPerPage: itemsPerPage,
      currentPage: currentPage,
      searchQuery: searchQuery,
      sortColumn: sortColumn,
      sortDirection: sortDirection,
      // Add catalog mappings to settings for backup
      catalogMappings: catalogManager.exportMappings()
    };
    zip.file('settings.json', JSON.stringify(settings, null, 2));

    // 3. Add spot price history
    const spotHistoryData = {
      version: APP_VERSION,
      exportDate: new Date().toISOString(),
      history: spotHistory
    };
    zip.file('spot_price_history.json', JSON.stringify(spotHistoryData, null, 2));

    // 4. Generate and add CSV export
    const csvHeaders = [
      "Metal", "Name", "Qty", "Type", "Weight(oz)", "Purchase Price",
      "Spot Price ($/oz)", "Premium ($/oz)", "Total Premium",
      "Purchase Location", "Storage Location", "N#", "Collectable",
      "Notes", "Date"
    ];
    const sortedInventory = sortInventoryByDateNewestFirst();
    const csvRows = [];
    for (const item of sortedInventory) {
      const exportSpotPrice = item.isCollectable ? 
        spotPrices[item.metal.toLowerCase()] : 
        item.spotPriceAtPurchase;
      csvRows.push([
        item.metal || 'Silver',
        item.name,
        item.qty,
        item.type,
        parseFloat(item.weight).toFixed(4),
        formatCurrency(item.price),
        exportSpotPrice > 0 ? formatCurrency(exportSpotPrice) : '—',
        item.isCollectable ? '—' : formatCurrency(item.premiumPerOz),
        item.isCollectable ? '—' : formatCurrency(item.totalPremium),
        item.purchaseLocation,
        item.storageLocation || '',
        item.numistaId || '',
        item.isCollectable ? 'Yes' : 'No',
        item.notes || '',
        item.date
      ]);
    }
    const csvContent = Papa.unparse([csvHeaders, ...csvRows]);
    zip.file('inventory_export.csv', csvContent);

    // 5. Generate and add HTML export (simplified version)
    const htmlContent = generateBackupHtml(sortedInventory, timeFormatted);
    zip.file('inventory_report.html', htmlContent);

    // 7. Add README file
    const readmeContent = generateReadmeContent(timeFormatted);
    zip.file('README.txt', readmeContent);

    // 8. Add sample data for reference
    if (inventory.length > 0) {
      const sampleData = inventory.slice(0, Math.min(5, inventory.length)).map(item => ({
        metal: item.metal,
        name: item.name,
        qty: item.qty,
        type: item.type,
        weight: item.weight,
        price: item.price,
        date: item.date,
        purchaseLocation: item.purchaseLocation,
        storageLocation: item.storageLocation,
        notes: item.notes,
        isCollectable: item.isCollectable,
        numistaId: item.numistaId,
        serial: item.serial
      }));
      zip.file('sample_data.json', JSON.stringify(sampleData, null, 2));
    }

    // Generate and download the ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `precious_metals_backup_${timestamp}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Restore button state
    if (backupBtn) {
      backupBtn.textContent = originalText;
      backupBtn.disabled = false;
    }
    
    alert('Backup created successfully!');
  } catch (error) {
    console.error('Backup creation failed:', error);
    alert('Backup creation failed: ' + error.message);
    
    // Restore button state on error
    const backupBtn = document.getElementById('backupAllBtn');
    if (backupBtn) {
      backupBtn.textContent = 'Backup All Data';
      backupBtn.disabled = false;
    }
  }
};

/**
 * Restores application data from a backup ZIP file
 *
 * @param {File} file - ZIP file created by createBackupZip
 */
const restoreBackupZip = async (file) => {
  try {
    const zip = await JSZip.loadAsync(file);

    const inventoryStr = await zip.file("inventory_data.json")?.async("string");
    if (inventoryStr) {
      const invObj = JSON.parse(inventoryStr);
      localStorage.setItem(LS_KEY, JSON.stringify(invObj.inventory || []));
    }

    const settingsStr = await zip.file("settings.json")?.async("string");
    if (settingsStr) {
      const settingsObj = JSON.parse(settingsStr);
      if (settingsObj.spotPrices) {
        Object.entries(settingsObj.spotPrices).forEach(([metal, price]) => {
          const metalConfig = METALS[metal.toUpperCase()];
          if (metalConfig) {
            localStorage.setItem(
              metalConfig.localStorageKey,
              JSON.stringify(price),
            );
          }
        });
      }
      if (settingsObj.theme) {
        localStorage.setItem(THEME_KEY, settingsObj.theme);
      }
      
      // Handle catalog mappings if present in backup
      if (settingsObj.catalogMappings) {
        // Use catalog manager to import mappings
        catalogManager.importMappings(settingsObj.catalogMappings, false);
      }
    }

    const historyStr = await zip
      .file("spot_price_history.json")
      ?.async("string");
    if (historyStr) {
      const histObj = JSON.parse(historyStr);
      localStorage.setItem(
        SPOT_HISTORY_KEY,
        JSON.stringify(histObj.history || []),
      );
    }

    loadInventory();
    renderTable();
    loadSpotHistory();
    fetchSpotPrice();
    alert("Data imported successfully.");
  } catch (err) {
    console.error("Restore failed", err);
    alert("Restore failed: " + err.message);
  }
};

window.restoreBackupZip = restoreBackupZip;


// =============================================================================

// Note: catalogMap is now managed by catalogManager class
// No need for the global catalogMap variable anymore

const getNextSerial = () => {
  const next = (parseInt(localStorage.getItem(SERIAL_KEY) || '0', 10) + 1);
  localStorage.setItem(SERIAL_KEY, next);
  return next;
};
window.getNextSerial = getNextSerial;

/**
 * Saves current inventory to localStorage
 */
const saveInventory = () => {
  saveData(LS_KEY, inventory);
  // CatalogManager handles its own saving, no need to explicitly save catalogMap
};

// Make saveInventory globally accessible
if (typeof window !== 'undefined') {
  window.saveInventory = saveInventory;
}

/**
 * Removes non-alphanumeric characters from inventory records.
 *
 * @returns {void}
 */
const sanitizeTablesOnLoad = () => {
  inventory = inventory.map(item => sanitizeObjectFields(item));
};

// Make sanitizeTablesOnLoad globally accessible
if (typeof window !== 'undefined') {
  window.sanitizeTablesOnLoad = sanitizeTablesOnLoad;
};

/**
 * Loads inventory from localStorage with comprehensive data migration
 * 
 * This function handles backwards compatibility by:
 * - Loading existing inventory data from localStorage
 * - Migrating legacy records that may be missing newer fields
 * - Calculating premiums for older records that lack this data
 * - Ensuring all records have required fields with sensible defaults
 * - Preserving existing user data while adding new functionality
 * 
 * @returns {void} Updates the global inventory array with migrated data
 * @throws {Error} Logs errors to console if localStorage access fails
 */
const loadInventory = () => {
  // Log that the real implementation is being called
  if (typeof debugLog === 'function') {
    debugLog('Real loadInventory implementation called');
  } else {
    console.log('[DEBUG] Real loadInventory implementation called');
  }
  
  const data = loadData(LS_KEY, []);
  
  // Expose the function globally as early as possible
  if (typeof window !== 'undefined') {
    window.loadInventory = loadInventory;
  }
  // Migrate legacy data to include new fields
  inventory = data.map(item => {
    let normalized;
    // Handle legacy data that might not have all fields
    if (item.premiumPerOz === undefined) {
      // For legacy items, calculate premium if possible
      const metalConfig = Object.values(METALS).find(m => m.name === item.metal) || METALS.SILVER;
      const spotPrice = spotPrices[metalConfig.key];

      const premiumPerOz = spotPrice > 0 ? (item.price / item.weight) - spotPrice : 0;
      const totalPremium = premiumPerOz * item.qty * item.weight;

      normalized = {
        ...item,
        type: normalizeType(item.type),
        purchaseLocation: item.purchaseLocation || "",
        storageLocation: item.storageLocation || "Unknown",
        notes: item.notes || "",
        spotPriceAtPurchase: spotPrice,
        premiumPerOz,
        totalPremium,
        isCollectable: item.isCollectable !== undefined ? item.isCollectable : false,
        composition: item.composition || item.metal || ""
      };
    } else {
      // Ensure all items have required properties
      normalized = {
        ...item,
        type: normalizeType(item.type),
        purchaseLocation: item.purchaseLocation || "",
        storageLocation: item.storageLocation || "Unknown",
        notes: item.notes || "",
        isCollectable: item.isCollectable !== undefined ? item.isCollectable : false,
        composition: item.composition || item.metal || ""
      };
    }
    return sanitizeImportedItem(normalized);
  });

  let serialCounter = parseInt(localStorage.getItem(SERIAL_KEY) || '0', 10);
  
  // Process each inventory item: assign serials and sync with catalog manager
  inventory.forEach(item => {
    // Assign serial numbers to items that don't have them
    if (!item.serial) {
      serialCounter += 1;
      item.serial = serialCounter;
    }
    
    // Use CatalogManager to synchronize numistaId
    catalogManager.syncItem(item);
  });
  
  // Save updated serial counter
  localStorage.setItem(SERIAL_KEY, serialCounter);
  
  // Clean up any orphaned catalog mappings
  if (typeof catalogManager.cleanupOrphans === 'function') {
    const removed = catalogManager.cleanupOrphans(inventory);
    if (removed > 0 && DEBUG) {
      console.log(`Removed ${removed} orphaned catalog mappings`);
    }
  }
};

/**
 * Renders the main inventory table with all current display settings
 * 
 * This is the primary display function that:
 * - Applies current search filters to inventory data
 * - Sorts data according to user-selected column and direction
 * - Implements pagination to show only current page items
 * - Generates HTML table rows with interactive elements
 * - Updates sort indicators in column headers
 * - Refreshes pagination controls and summary totals
 * - Re-establishes column resizing functionality
 * 
 * Called whenever inventory data changes or display settings update
 * 
 * @returns {void} Updates DOM elements with fresh inventory display
 */
const METAL_COLORS = {
  Silver: 'var(--silver)',
  Gold: 'var(--gold)',
  Platinum: 'var(--platinum)',
  Palladium: 'var(--palladium)'
};

const typeColors = {
  Coin: 'var(--type-coin-bg)',
  Round: 'var(--type-round-bg)',
  Bar: 'var(--type-bar-bg)',
  Note: 'var(--type-note-bg)',
  Other: 'var(--type-other-bg)'
};
const purchaseLocationColors = {};
const storageLocationColors = {};
const nameColors = {};
const dateColors = {};

const getColor = (map, key) => {
  if (!(key in map)) {
    map[key] = (Object.keys(map).length * 137) % 360; // distribute hues using golden angle
  }
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const lightness = isDark ? 65 : 35;
  return `hsl(${map[key]}, 70%, ${lightness}%)`;
};

/**
 * Escapes special characters for safe inclusion in HTML attributes
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for attribute usage
 */
const escapeAttribute = (text) =>
  (text == null ? '' : text.toString())
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const filterLink = (field, value, color, displayValue = value, title, allowHtml = false) => {
  const handler = `applyColumnFilter('${field}', ${JSON.stringify(value)})`;
  // Escape characters for safe inline handler usage
  const escaped = escapeAttribute(handler);
  const displayStr = String(displayValue);
  const safe = allowHtml ? displayStr : sanitizeHtml(displayStr);
  const titleStr = title ? String(title) : `Filter by ${displayStr}`;
  const safeTitle = sanitizeHtml(titleStr);
  const isNA = displayStr === 'N/A' || displayStr === 'Numista Import' || displayStr === 'Unknown' || displayStr === '—';
  const classNames = `filter-text${isNA ? ' na-value' : ''}`;
  const styleAttr = isNA ? '' : ` style="color: ${color};"`;
  return `<span class="${classNames}"${styleAttr} data-field="${field}" data-value="${escapeAttribute(value)}" tabindex="0" role="button" title="${safeTitle}">${safe}</span>`;
};

const getTypeColor = type => typeColors[type] || 'var(--type-other-bg)';
const getPurchaseLocationColor = loc => getColor(purchaseLocationColors, loc);
const getStorageLocationColor = loc =>
  (loc === 'Unknown' || loc === '—') ? 'var(--text-muted)' : getColor(storageLocationColors, loc);

/**
 * Formats Purchase Location for table display, wrapping URLs in hyperlinks
 * while preserving filter behavior.
 *
 * @param {string} loc - Purchase location value
 * @returns {string} HTML string for table cell
 */
const formatPurchaseLocation = (loc) => {
  let value = loc || '—';
  
  // Convert "Numista Import" and "Unknown" to "—"
  if (value === 'Numista Import' || value === 'Unknown') {
    value = '—';
  }
  
  // Truncate at 24 characters
  const truncated = value.length > 24 ? value.substring(0, 24) + '…' : value;
  const color = getPurchaseLocationColor(value);
  const urlPattern = /^(https?:\/\/)?[\w.-]+\.[A-Za-z]{2,}(\S*)?$/;
  const filterSpan = filterLink('purchaseLocation', value, color, truncated, value !== truncated ? value : undefined);
  
  if (urlPattern.test(value)) {
    let href = value;
    if (!/^https?:\/\//i.test(href)) {
      href = `https://${href}`;
    }
    const safeHref = escapeAttribute(href);
    return `${filterSpan}<a href="${safeHref}" target="_blank" rel="noopener" onclick="event.stopPropagation()" class="info-link" title="${safeHref}">(i)</a>`;
  }
  return filterSpan;
};
window.formatPurchaseLocation = formatPurchaseLocation;

/**
 * Formats Storage Location for table display with truncation
 * @param {string} loc - Storage location value
 * @returns {string} HTML string for table cell
 */
const formatStorageLocation = (loc) => {
  let value = loc || '—';
  
  // Convert "Numista Import" and "Unknown" to "—"
  if (value === 'Numista Import' || value === 'Unknown') {
    value = '—';
  }
  
  // Truncate at 24 characters
  const truncated = value.length > 24 ? value.substring(0, 24) + '…' : value;
  const color = getStorageLocationColor(value);
  return filterLink('storageLocation', value, color, truncated, value !== truncated ? value : undefined);
};

/**
 * Recalculates premium values for an inventory item
 * @param {Object} item - Inventory item to update
 */
const recalcItem = (item) => {
  if (item.isCollectable) {
    item.premiumPerOz = 0;
    item.totalPremium = 0;
    return;
  }
  const qty = Number(item.qty) || 0;
  const weight = parseFloat(item.weight) || 0;
  const price = parseFloat(item.price) || 0;
  const spot = parseFloat(item.spotPriceAtPurchase) || 0;
  const pricePerOz = qty && weight ? price / (qty * weight) : 0;
  item.premiumPerOz = pricePerOz - spot;
  item.totalPremium = item.premiumPerOz * qty * weight;
};

/**
 * Saves inventory and refreshes table display
 */
const persistInventoryAndRefresh = () => {
  saveInventory();
  renderTable();
};

/**
 * Enhanced validation for inline edits with comprehensive field support
 * @param {string} field - Field being edited
 * @param {string} value - Proposed value
 * @returns {boolean} Whether value is valid
 */
const validateFieldValue = (field, value) => {
  const trimmedValue = typeof value === 'string' ? value.trim() : String(value).trim();
  
  switch (field) {
    case 'qty':
      const qty = parseInt(value, 10);
      return /^\d+$/.test(value) && qty > 0 && qty <= 999999;
      
    case 'weight':
      const weight = parseFloat(value);
      return !isNaN(weight) && weight > 0 && weight <= 999999;
      
    case 'price':
    case 'spotPriceAtPurchase':
      const price = parseFloat(value);
      return !isNaN(price) && price >= 0 && price <= 999999999;
      
    case 'name':
      return trimmedValue.length > 0 && trimmedValue.length <= 200;
      
    case 'purchaseLocation':
    case 'storageLocation':
      return trimmedValue.length <= 100; // Allow empty for optional fields
      
    case 'notes':
      return trimmedValue.length <= 1000; // Allow long notes but with limit
      
    case 'date':
      if (!trimmedValue) return false;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(trimmedValue)) return false;
      const date = new Date(trimmedValue);
      const today = new Date();
      const minDate = new Date('1900-01-01');
      return date >= minDate && date <= today;
      
    case 'type':
      const validTypes = ['Coin', 'Bar', 'Round', 'Note', 'Aurum', 'Other'];
      return validTypes.includes(trimmedValue);
      
    case 'metal':
      const validMetals = ['Silver', 'Gold', 'Platinum', 'Palladium', 'Alloy/Other'];
      return validMetals.includes(trimmedValue);
      
    default:
      return true;
  }
};

/**
 * Enhanced inline editing for table cells with support for multiple field types
 * @param {number} idx - Index of item to edit
 * @param {string} field - Field name to update
 * @param {HTMLElement} icon - Clicked pencil icon
 */
const startCellEdit = (idx, field, icon) => {
  const td = icon.closest('td');
  const item = inventory[idx];
  const current = item[field] ?? '';
  const originalContent = td.innerHTML;
  td.classList.add('editing');
  
  let input;
  
  // Create appropriate input type based on field
  if (['type', 'metal'].includes(field)) {
    input = document.createElement('select');
    input.className = 'inline-select';
    
    if (field === 'type') {
      const types = ['Coin', 'Bar', 'Round', 'Note', 'Aurum', 'Other'];
      types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        if (type === current) option.selected = true;
        input.appendChild(option);
      });
    } else if (field === 'metal') {
      const metals = ['Silver', 'Gold', 'Platinum', 'Palladium', 'Alloy/Other'];
      metals.forEach(metal => {
        const option = document.createElement('option');
        option.value = metal;
        option.textContent = metal;
        if (metal === current) option.selected = true;
        input.appendChild(option);
      });
    }
  } else {
    input = document.createElement('input');
    input.className = 'inline-input';
    
    if (field === 'qty') {
      input.type = 'number';
      input.step = '1';
      input.min = '1';
    } else if (['weight', 'price', 'spotPriceAtPurchase'].includes(field)) {
      input.type = 'number';
      input.step = '0.01';
      input.min = '0';
    } else if (field === 'date') {
      input.type = 'date';
    } else {
      input.type = 'text';
    }
    
    // Set input value based on field type
    if (field === 'weight' && item.weight < 1) {
      input.value = oztToGrams(current).toFixed(2);
      input.dataset.unit = 'g';
    } else if (['weight', 'price', 'spotPriceAtPurchase'].includes(field)) {
      input.value = parseFloat(current || 0).toFixed(2);
      if (field === 'weight') input.dataset.unit = 'oz';
    } else {
      input.value = current;
    }
  }
  
  td.innerHTML = '';
  td.appendChild(input);

  const saveIcon = document.createElement('span');
  saveIcon.className = 'save-inline';
  saveIcon.textContent = '✔️';
  saveIcon.title = 'Save changes';
  
  const cancelIcon = document.createElement('span');
  cancelIcon.className = 'cancel-inline';
  cancelIcon.textContent = '✖️';
  cancelIcon.title = 'Cancel edit';
  
  td.appendChild(saveIcon);
  td.appendChild(cancelIcon);

  const cancelEdit = () => {
    td.classList.remove('editing');
    td.innerHTML = originalContent;
  };

  const renderCell = () => {
    td.classList.remove('editing');
    const iconHtml = `<span class="inline-edit-icon" role="button" tabindex="0" data-index="${idx}" data-field="${field}" aria-label="Edit ${field}" title="Edit ${field}">✎</span>`;
    let content = '';
    
    switch (field) {
      case 'name':
        content = filterLink('name', item.name, 'var(--text-primary)');
        break;
      case 'qty':
        content = filterLink('qty', item.qty, 'var(--text-primary)');
        break;
      case 'weight':
        content = filterLink('weight', item.weight, 'var(--text-primary)', formatWeight(item.weight), item.weight < 1 ? 'Grams (g)' : 'Troy ounces (ozt)');
        break;
      case 'price':
        content = filterLink('price', item.price, 'var(--text-primary)', formatCurrency(item.price));
        break;
      case 'spotPriceAtPurchase': {
        const spotDisplay = item.isCollectable ? '—' : (item.spotPriceAtPurchase > 0 ? formatCurrency(item.spotPriceAtPurchase) : '—');
        const spotValue = item.isCollectable ? '—' : (item.spotPriceAtPurchase > 0 ? item.spotPriceAtPurchase : '—');
        content = filterLink('spotPriceAtPurchase', spotValue, 'var(--text-primary)', spotDisplay);
        break;
      }
      case 'type':
        content = filterLink('type', item.type, getTypeColor(item.type));
        break;
      case 'metal':
        content = filterLink('metal', item.composition || item.metal || 'Silver', METAL_COLORS[item.metal] || 'var(--primary)', getDisplayComposition(item.composition || item.metal || 'Silver'));
        break;
      case 'date':
        content = filterLink('date', item.date, 'var(--text-primary)', formatDisplayDate(item.date));
        break;
      case 'purchaseLocation':
        content = formatPurchaseLocation(item.purchaseLocation);
        break;
      case 'storageLocation':
        content = formatStorageLocation(item.storageLocation);
        break;
      case 'notes':
        const hasNotes = item.notes && item.notes.trim();
        content = `<span class="action-icon ${hasNotes ? 'success' : ''}" title="${hasNotes ? 'Has notes' : 'No notes'}">📓</span>`;
        break;
      default:
        content = filterLink(field, item[field], 'var(--text-primary)');
    }
    td.innerHTML = `${iconHtml} ${content}`;
    updateSummary(); // Update totals after edit
  };

  saveIcon.onclick = () => {
    const value = input.value;
    if (!validateFieldValue(field, value)) {
      alert(`Invalid value for ${field}`);
      cancelEdit();
      return;
    }
    
    let finalValue;
    if (field === 'qty') {
      finalValue = parseInt(value, 10);
    } else if (['weight', 'price', 'spotPriceAtPurchase'].includes(field)) {
      finalValue = parseFloat(value);
      if (field === 'weight' && input.dataset.unit === 'g') {
        finalValue = gramsToOzt(finalValue);
      }
    } else {
      finalValue = value.trim();
    }
    
    // Store the old value for change logging
    const oldValue = item[field];
    item[field] = finalValue;
    
    // Recalculate premiums if needed
    if (['qty', 'weight', 'price', 'spotPriceAtPurchase'].includes(field)) {
      recalcItem(item);
    }
    
    // Log the change
    if (typeof logChange === 'function') {
      logChange(item.name || `Item ${idx + 1}`, field, oldValue, finalValue, idx);
    }
    
    saveInventory();
    renderCell();
  };

  cancelIcon.onclick = cancelEdit;

  // Enhanced keyboard navigation
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveIcon.click();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
    if (e.key === 'Tab') {
      // Allow tab to move to save/cancel buttons
      if (e.shiftKey) {
        e.preventDefault();
        cancelIcon.focus();
      } else {
        e.preventDefault();
        saveIcon.focus();
      }
    }
  });
  
  // Handle save/cancel button keyboard navigation
  saveIcon.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      saveIcon.click();
    }
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      cancelIcon.focus();
    }
  });
  
  cancelIcon.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      cancelIcon.click();
    }
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      saveIcon.focus();
    }
  });

  input.focus();
  if (input.select) input.select();
};

window.startCellEdit = startCellEdit;


/**
 * Legacy chip-type filter system - now disabled in favor of renderActiveFilters
 * This function now just clears the typeSummary container to avoid conflicts
 */
const updateTypeSummary = (items = inventory) => {
  const el = elements.typeSummary || document.getElementById('typeSummary');
  if (!el) return;
  
  // Clear the container to avoid conflicts with the new renderActiveFilters system
  el.innerHTML = '';
};
window.updateTypeSummary = updateTypeSummary;

/**
 * Hides table columns that contain no data after filtering.
 */
const hideEmptyColumns = () => {
  if (typeof document === 'undefined') return;
  const headers = document.querySelectorAll('#inventoryTable thead th[data-column]');
  headers.forEach((header) => {
    const col = header.getAttribute('data-column');
    const cells = document.querySelectorAll(`#inventoryTable tbody [data-column="${col}"]`);
    const allEmpty = cells.length > 0 && Array.from(cells).every(cell => {
      // If the cell contains interactive or icon elements, consider it non-empty
      if (cell.querySelector && (cell.querySelector('svg') || cell.querySelector('button') || cell.querySelector('.action-icon') || cell.querySelector('.collectable-status'))) {
        return false;
      }
      return cell.textContent.trim() === '';
    });

    document.querySelectorAll(`#inventoryTable [data-column="${col}"]`).forEach(el => {
      el.classList.toggle('hidden-empty', allEmpty);
    });
  });
};

/**
 * Creates a table cell element with specified content and attributes
 * @param {string} className - CSS class for the cell
 * @param {string} dataColumn - data-column attribute value
 * @param {string|HTMLElement} content - Cell content (text or HTML element)
 * @param {Object} attributes - Additional attributes to set
 * @returns {HTMLTableCellElement} The created cell element
 */
const createTableCell = (className, dataColumn, content, attributes = {}) => {
  const cell = document.createElement('td');
  cell.className = className;
  cell.setAttribute('data-column', dataColumn);
  
  // Set additional attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      cell.setAttribute(key, value);
    }
  });
  
  // Set content
  if (typeof content === 'string') {
    cell.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    cell.appendChild(content);
  } else {
    cell.textContent = content || '';
  }
  
  return cell;
};

/**
 * Creates a table row using DocumentFragment for optimal performance
 * @param {Object} item - Inventory item data
 * @param {number} originalIdx - Original index in inventory array
 * @returns {HTMLTableRowElement} The created row element
 */
const createTableRowFragment = (item, originalIdx) => {
  const row = document.createElement('tr');
  row.setAttribute('data-index', originalIdx);
  
  // Calculate display values
  const spotDisplay = item.isCollectable ? '—' : (item.spotPriceAtPurchase > 0 ? formatCurrency(item.spotPriceAtPurchase) : '—');
  const spotValue = item.isCollectable ? '—' : (item.spotPriceAtPurchase > 0 ? item.spotPriceAtPurchase : '');
  const premiumDisplay = item.isCollectable ? '—' : formatCurrency(item.totalPremium);
  const premiumValue = item.isCollectable ? '—' : item.totalPremium;
  
  // Create cells using DocumentFragment
  const fragment = document.createDocumentFragment();
  
  // Date cell
  fragment.appendChild(createTableCell('shrink', 'date', 
    filterLink('date', item.date, 'var(--text-primary)', formatDisplayDate(item.date))
  ));
  
  // Type cell
  fragment.appendChild(createTableCell('shrink', 'type', 
    filterLink('type', item.type, getTypeColor(item.type))
  ));
  
  // Metal cell
  fragment.appendChild(createTableCell('shrink', 'metal', 
    filterLink('metal', item.composition || item.metal || 'Silver', METAL_COLORS[item.metal] || 'var(--primary)', getDisplayComposition(item.composition || item.metal || 'Silver')),
    { 'data-metal': escapeAttribute(item.composition || item.metal || '') }
  ));
  
  // Quantity cell
  fragment.appendChild(createTableCell('shrink', 'qty', 
    filterLink('qty', item.qty, 'var(--text-primary)')
  ));
  
  // Name cell
  fragment.appendChild(createTableCell('expand', 'name', 
    filterLink('name', item.name, 'var(--text-primary)'),
    { style: 'text-align: left;' }
  ));
  
  // Weight cell
  fragment.appendChild(createTableCell('shrink', 'weight', 
    filterLink('weight', item.weight, 'var(--text-primary)', formatWeight(item.weight), item.weight < 1 ? 'Grams (g)' : 'Troy ounces (ozt)')
  ));
  
  // Purchase Price cell
  fragment.appendChild(createTableCell('shrink', 'purchasePrice', 
    filterLink('price', item.price, 'var(--text-primary)', (item.price && item.price > 0) ? formatCurrency(item.price) : '—'),
    { title: 'USD' }
  ));
  
  // Spot Price cell
  fragment.appendChild(createTableCell('shrink', 'spot', 
    filterLink('spotPriceAtPurchase', spotValue, 'var(--text-primary)', spotDisplay),
    { title: 'USD' }
  ));
  
  // Premium cell
  fragment.appendChild(createTableCell('shrink', 'premium', 
    filterLink('totalPremium', premiumValue, 'var(--text-primary)', premiumDisplay),
    { 
      style: `color: ${item.isCollectable ? 'var(--text-muted)' : (item.totalPremium > 0 ? 'var(--warning)' : 'inherit')}`
    }
  ));
  
  // Purchase Location cell
  fragment.appendChild(createTableCell('shrink', 'purchaseLocation', 
    formatPurchaseLocation(item.purchaseLocation)
  ));
  
  // Storage Location cell
  fragment.appendChild(createTableCell('shrink', 'storageLocation', 
    formatStorageLocation(item.storageLocation)
  ));
  
  // Numista cell
  const numistaContent = item.numistaId ? 
    `<a href="#" onclick="openNumistaModal('${sanitizeHtml(item.numistaId)}', '${sanitizeHtml(item.name)}'); return false;" title="N#${sanitizeHtml(item.numistaId)} - open numista.com" class="catalog-link">N#</a>` :
    '<span class="numista-empty">—</span>';
  fragment.appendChild(createTableCell('shrink', 'numista', numistaContent));
  
  // Collectable status cell
  const collectableIcon = item.isCollectable ? 
    '<svg class="collectable-icon vault-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="17" cy="11" r="2"/><rect x="6" y="8" width="6" height="8" rx="1"/></svg>' :
    '<svg class="collectable-icon bar-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="8" rx="1"/><path d="M5 6h14l-2-2H7z"/></svg>';
  
  const collectableButton = `<span class="collectable-status" role="button" tabindex="0" data-index="${originalIdx}" aria-label="Toggle collectable status for ${sanitizeHtml(item.name)}" title="Toggle collectable status">${collectableIcon}</span>`;
  fragment.appendChild(createTableCell('icon-col', 'collectable', collectableButton));
  
  // Notes cell
  const notesButton = `<button class="icon-btn action-icon ${item.notes && item.notes.trim() ? 'has-notes' : ''}" role="button" tabindex="0" data-index="${originalIdx}" aria-label="View notes" title="View notes">
    <svg class="icon-svg notes-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15V5a2 2 0 0 0-2-2H7L3 7v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2z"/></svg>
  </button>`;
  fragment.appendChild(createTableCell('icon-col', 'notes', notesButton));
  
  // Edit cell
  const editButton = `<button class="icon-btn action-icon edit-icon" role="button" tabindex="0" data-index="${originalIdx}" aria-label="Edit ${sanitizeHtml(item.name)}" title="Edit item">
    <svg class="icon-svg edit-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/></svg>
  </button>`;
  fragment.appendChild(createTableCell('icon-col', 'edit', editButton));
  
  // Delete cell
  const deleteButton = `<button class="icon-btn action-icon danger" role="button" tabindex="0" data-index="${originalIdx}" aria-label="Delete item" title="Delete item">
    <svg class="icon-svg delete-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7zm3-4h6l1 1h4v2H3V4h4l1-1z"/></svg>
  </button>`;
  fragment.appendChild(createTableCell('icon-col', 'delete', deleteButton));
  
  // Append all cells to row
  row.appendChild(fragment);
  return row;
};

const renderTable = () => {
  return monitorPerformance(() => {
    const filteredInventory = filterInventory();

    const sortedInventory = sortInventory(filteredInventory);
    const totalPages = calculateTotalPages(sortedInventory);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, sortedInventory.length);

    // Find tbody element directly if cached version fails
    const tbody = elements.inventoryTable || document.querySelector('#inventoryTable tbody');
    if (!tbody) {
      console.error('Could not find table tbody element');
      return;
    }

    // Choose rendering method based on feature flag
    const useDOMFragments = typeof isFeatureEnabled !== 'undefined' && isFeatureEnabled('DOM_FRAGMENT_RENDERING');
    
    if (useDOMFragments) {
      // DOM Fragment approach for better performance
      const fragment = document.createDocumentFragment();
      
      // Add data rows
      for (let i = startIndex; i < endIndex; i++) {
        const item = sortedInventory[i];
        const originalIdx = inventory.indexOf(item);
        fragment.appendChild(createTableRowFragment(item, originalIdx));
      }
      
      // Add placeholder rows
      const visibleCount = endIndex - startIndex;
      const placeholderCount = Math.max(0, itemsPerPage - visibleCount);
      for (let i = 0; i < placeholderCount; i++) {
        const placeholderRow = document.createElement('tr');
        const placeholderCell = document.createElement('td');
        placeholderCell.className = 'shrink';
        placeholderCell.setAttribute('colspan', '16');
        placeholderCell.innerHTML = '&nbsp;';
        placeholderRow.appendChild(placeholderCell);
        fragment.appendChild(placeholderRow);
      }
      
      // Clear and append all at once
      tbody.innerHTML = '';
      tbody.appendChild(fragment);
      
    } else {
      // Legacy string concatenation approach (fallback)
      const rows = [];

      for (let i = startIndex; i < endIndex; i++) {
        const item = sortedInventory[i];
        const originalIdx = inventory.indexOf(item);
        const spotDisplay = item.isCollectable ? '—' : (item.spotPriceAtPurchase > 0 ? formatCurrency(item.spotPriceAtPurchase) : '—');
        const spotValue = item.isCollectable ? '—' : (item.spotPriceAtPurchase > 0 ? item.spotPriceAtPurchase : '');
        const premiumDisplay = item.isCollectable ? '—' : formatCurrency(item.totalPremium);
        const premiumValue = item.isCollectable ? '—' : item.totalPremium;

        rows.push(`
        <tr data-index="${originalIdx}">
          <td class="shrink" data-column="date">${filterLink('date', item.date, 'var(--text-primary)', formatDisplayDate(item.date))}</td>
          <td class="shrink" data-column="type">${filterLink('type', item.type, getTypeColor(item.type))}</td>
          <td class="shrink" data-column="metal" data-metal="${escapeAttribute(item.composition || item.metal || '')}">${filterLink('metal', item.composition || item.metal || 'Silver', METAL_COLORS[item.metal] || 'var(--primary)', getDisplayComposition(item.composition || item.metal || 'Silver'))}</td>
          <td class="shrink" data-column="qty">${filterLink('qty', item.qty, 'var(--text-primary)')}</td>
          <td class="expand" data-column="name" style="text-align: left;">${filterLink('name', item.name, 'var(--text-primary)')}</td>
          <td class="shrink" data-column="weight">${filterLink('weight', item.weight, 'var(--text-primary)', formatWeight(item.weight), item.weight < 1 ? 'Grams (g)' : 'Troy ounces (ozt)')}</td>
          <td class="shrink" data-column="purchasePrice" title="USD">${filterLink('price', item.price, 'var(--text-primary)', (item.price && item.price > 0) ? formatCurrency(item.price) : '—')}</td>
          <td class="shrink" data-column="spot" title="USD">${filterLink('spotPriceAtPurchase', spotValue, 'var(--text-primary)', spotDisplay)}</td>
          <td class="shrink" data-column="premium" style="color: ${item.isCollectable ? 'var(--text-muted)' : (item.totalPremium > 0 ? 'var(--warning)' : 'inherit')}">${filterLink('totalPremium', premiumValue, 'var(--text-primary)', premiumDisplay)}</td>
          <td class="shrink" data-column="purchaseLocation">
            ${formatPurchaseLocation(item.purchaseLocation)}
          </td>
          <td class="shrink" data-column="storageLocation">
            ${formatStorageLocation(item.storageLocation)}
          </td>
          <td class="shrink" data-column="numista">${item.numistaId ? `
            <a href="#" onclick="openNumistaModal('${sanitizeHtml(item.numistaId)}', '${sanitizeHtml(item.name)}'); return false;" title="N#${sanitizeHtml(item.numistaId)} - open numista.com" class="catalog-link">
              N#
            </a>
          ` : '<span class="numista-empty">—</span>'}</td>
          <td class="icon-col" data-column="collectable"><span class="collectable-status" role="button" tabindex="0" data-index="${originalIdx}" aria-label="Toggle collectable status for ${sanitizeHtml(item.name)}" title="Toggle collectable status">${item.isCollectable ? '<svg class=\"collectable-icon vault-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\"/><circle cx=\"17\" cy=\"11\" r=\"2\"/><rect x=\"6\" y=\"8\" width=\"6\" height=\"8\" rx=\"1\"/></svg>' : '<svg class=\"collectable-icon bar-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"8\" width=\"18\" height=\"8\" rx=\"1\"/><path d=\"M5 6h14l-2-2H7z\"/></svg>'}</span></td>
          <td class="icon-col" data-column="notes"><button class="icon-btn action-icon ${item.notes && item.notes.trim() ? 'has-notes' : ''}" role="button" tabindex="0" data-index="${originalIdx}" aria-label="View notes" title="View notes">
            <svg class="icon-svg notes-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15V5a2 2 0 0 0-2-2H7L3 7v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2z"/></svg>
          </button></td>
          <td class="icon-col" data-column="edit"><button class="icon-btn action-icon edit-icon" role="button" tabindex="0" data-index="${originalIdx}" aria-label="Edit ${sanitizeHtml(item.name)}" title="Edit item">
            <svg class="icon-svg edit-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/></svg>
          </button></td>
          <td class="icon-col" data-column="delete"><button class="icon-btn action-icon danger" role="button" tabindex="0" data-index="${originalIdx}" aria-label="Delete item" title="Delete item">
            <svg class="icon-svg delete-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7zm3-4h6l1 1h4v2H3V4h4l1-1z"/></svg>
          </button></td>
        </tr>
        `);
      }

      const visibleCount = endIndex - startIndex;
      const placeholders = Array.from(
        { length: Math.max(0, itemsPerPage - visibleCount) },
        () => '<tr><td class="shrink" colspan="16">&nbsp;</td></tr>'
      );
      
      tbody.innerHTML = rows.concat(placeholders).join('');
    }
    
    hideEmptyColumns();
    updateTypeSummary(filteredInventory);

    // Update sort indicators
    const headers = document.querySelectorAll('#inventoryTable th');
    headers.forEach(header => {
      const indicator = header.querySelector('.sort-indicator');
      if (indicator) header.removeChild(indicator);
    });

    if (sortColumn !== null && sortColumn < headers.length) {
      const header = headers[sortColumn];
      const indicator = document.createElement('span');
      indicator.className = 'sort-indicator';
      indicator.textContent = sortDirection === 'asc' ? '↑' : '↓';
      header.appendChild(indicator);
    }

    renderPagination(sortedInventory);
    updateSummary();
    
    // Re-setup column resizing and responsive visibility after table re-render
    setupColumnResizing();
    updateColumnVisibility();
    
    // Update filter chips after table render
    if (typeof renderActiveFilters === 'function') {
      renderActiveFilters();
    }
  }, 'renderTable');
};

/**
 * Calculates and updates all financial summary displays across the application
 */
const updateSummary = () => {
  // Expose globally to ensure it's available to other modules
  if (typeof window !== 'undefined') {
    window.updateSummary = updateSummary;
  }
  
  /**
   * Calculates financial metrics for specified metal type
   * 
   * @param {string} metal - Metal type to calculate ('Silver', 'Gold', 'Platinum', or 'Palladium')
   * @returns {Object} Calculated metrics
   */
  const calculateTotals = (metal) => {
    let totalItems = 0;
    let totalWeight = 0;
    let currentSpotValue = 0;
    let totalPurchased = 0;
    let totalPremium = 0;
    let lossProfit = 0;

    // Track collectable and non-collectable metrics separately
    let collectableWeight = 0;
    let collectableValue = 0;
    let nonCollectableWeight = 0;
    let nonCollectableValue = 0;

    // Special silver tracking for 90% silver and quarter proofs
    let silverQuarterProofCount = 0;
    let silverQuarterProofMelt = 0;
    let ninetyPercentSilverWeight = 0;
    let ninetyPercentSilverMelt = 0;

    for (const item of inventory) {
      if (item.metal === metal) {
        const qty = Number(item.qty) || 0;
        const weight = parseFloat(item.weight) || 0;
        const price = parseFloat(item.price) || 0;

        totalItems += qty;

        // Total Weight calculation (for both regular and collectible items)
        const itemWeight = qty * weight;
        totalWeight += itemWeight;

        // Current spot value calculation (ONLY for non-collectibles with weight)
        const currentSpot = spotPrices[item.metal.toLowerCase()] || 0;
        let currentValue = 0;
        
        // Only calculate melt value for non-collectible items with actual weight
        if (!item.isCollectable && itemWeight > 0 && currentSpot > 0) {
          currentValue = currentSpot * itemWeight;
          currentSpotValue += currentValue;
        }
        
        // For collectibles, current value equals purchase price (no melt value)
        if (item.isCollectable) {
          currentValue = qty * price; // Collectible value = what you paid
        }

        // Special silver calculations for 90% silver content and quarter proofs
        if (metal === 'Silver' && itemWeight > 0) {
          const itemName = (item.name || '').toLowerCase();
          const composition = (item.composition || '').toLowerCase();
          
          // Check for silver quarter proofs
          if (itemName.includes('quarter') && itemName.includes('proof')) {
            silverQuarterProofCount += qty;
            // Quarter proofs: assume 90% silver, ~6.25g per quarter
            const quarterSilverWeight = qty * 6.25 * 0.9; // grams of pure silver
            silverQuarterProofMelt += (quarterSilverWeight / 31.1034768) * currentSpot;
          }
          
          // Check for 90% silver content items
          if (composition.includes('90%') || composition.includes('0.9') || 
              itemName.includes('90%') || itemName.includes('dime') || 
              itemName.includes('quarter') || itemName.includes('half dollar') ||
              itemName.includes('morgan') || itemName.includes('peace')) {
            const pureSilverWeight = itemWeight * 0.9; // 90% of total weight
            ninetyPercentSilverWeight += pureSilverWeight;
            ninetyPercentSilverMelt += (pureSilverWeight / 31.1034768) * currentSpot;
          }
        }

        // Total Purchase Price calculation (for both regular and collectible items)
        totalPurchased += qty * price;

        // Track collectable metrics
        if (item.isCollectable) {
          collectableWeight += itemWeight;
          collectableValue += qty * price;
        }
        // Track non-collectable metrics and calculations
        if (!item.isCollectable) {
          nonCollectableWeight += itemWeight;
          nonCollectableValue += qty * price;

          // Premium Paid calculation
          const pricePerOz = weight > 0 ? price / weight : 0;
          const premiumPerOz = pricePerOz - (item.spotPriceAtPurchase || 0);
          totalPremium += premiumPerOz * itemWeight;

          // Loss/Profit calculation
          const purchaseValue = price * qty;
          lossProfit += currentValue - purchaseValue;
        }
        // For collectible items: Premium Paid and Loss/Profit are omitted
      }
    }

    // Calculate averages
    const avgPrice = totalWeight > 0 ? totalPurchased / totalWeight : 0;
    const avgPremium = totalWeight > 0 ? totalPremium / totalWeight : 0;

    // Calculate collectable/non-collectable averages
    const avgCollectablePrice = collectableWeight > 0 ? collectableValue / collectableWeight : 0;
    const avgNonCollectablePrice = nonCollectableWeight > 0 ? nonCollectableValue / nonCollectableWeight : 0;

    return { 
      totalItems, 
      totalWeight, 
      currentSpotValue, 
      totalPurchased, 
      totalPremium,
      lossProfit,
      avgPrice,
      avgPremium,
      avgCollectablePrice,
      avgNonCollectablePrice,
      collectableWeight,      // Needed for proper weighted averaging
      nonCollectableWeight,   // Needed for proper weighted averaging
      collectableValue,       // CRITICAL: Now returning these values
      nonCollectableValue,    // CRITICAL: Now returning these values
      silverQuarterProofCount, // Special silver quarter proof tracking
      silverQuarterProofMelt,  // Melt value of quarter proofs
      ninetyPercentSilverWeight, // Pure silver weight in 90% items
      ninetyPercentSilverMelt   // Melt value of 90% silver items
    };
  };

  // Calculate totals for each metal
  const metalTotals = {};
  Object.values(METALS).forEach(metalConfig => {
    metalTotals[metalConfig.key] = calculateTotals(metalConfig.name);
  });

  // Update DOM elements with weight rounded to 2 decimal places
  Object.values(METALS).forEach(metalConfig => {
    const totals = metalTotals[metalConfig.key];
    const metalKey = metalConfig.key;

    elements.totals[metalKey].items.textContent = totals.totalItems;
    elements.totals[metalKey].weight.textContent = totals.totalWeight.toFixed(2);
    elements.totals[metalKey].value.innerHTML = formatCurrency(totals.currentSpotValue || 0);
    elements.totals[metalKey].purchased.innerHTML = formatCurrency(totals.totalPurchased || 0);
    elements.totals[metalKey].premium.innerHTML = formatCurrency(totals.totalPremium || 0);
    elements.totals[metalKey].lossProfit.innerHTML = formatLossProfit(totals.lossProfit || 0);
    elements.totals[metalKey].avgPrice.innerHTML = formatCurrency(totals.avgPrice || 0);
    elements.totals[metalKey].avgPremium.innerHTML = formatCurrency(totals.avgPremium || 0);
    // Add the new collectable/non-collectable averages
    elements.totals[metalKey].avgCollectablePrice.innerHTML = formatCurrency(totals.avgCollectablePrice || 0);
    elements.totals[metalKey].avgNonCollectablePrice.innerHTML = formatCurrency(totals.avgNonCollectablePrice || 0);
  });

  // Calculate combined totals for all metals
  const allTotals = {
    totalItems: 0,
    totalWeight: 0,
    currentSpotValue: 0,
    totalPurchased: 0,
    totalPremium: 0,
    lossProfit: 0,
    collectableWeight: 0,
    collectableValue: 0,
    nonCollectableWeight: 0,
    nonCollectableValue: 0
  };

  Object.values(metalTotals).forEach(totals => {
    allTotals.totalItems += totals.totalItems;
    allTotals.totalWeight += totals.totalWeight;
    allTotals.currentSpotValue += totals.currentSpotValue;
    allTotals.totalPurchased += totals.totalPurchased;
    allTotals.totalPremium += totals.totalPremium;
    allTotals.lossProfit += totals.lossProfit;
    allTotals.collectableWeight += totals.collectableWeight;
    allTotals.collectableValue += totals.collectableValue;
    allTotals.nonCollectableWeight += totals.nonCollectableWeight;
    allTotals.nonCollectableValue += totals.nonCollectableValue;
  });

  // Calculate weighted averages for collectable and non-collectable prices
  const avgCollectablePriceAll = allTotals.collectableWeight > 0 ? 
    allTotals.collectableValue / allTotals.collectableWeight : 0;
  const avgNonCollectablePriceAll = allTotals.nonCollectableWeight > 0 ? 
    allTotals.nonCollectableValue / allTotals.nonCollectableWeight : 0;

  // Log special silver calculations
  if (metalTotals.Silver) {
    const silverTotals = metalTotals.Silver;
    if (silverTotals.silverQuarterProofCount > 0 || silverTotals.ninetyPercentSilverWeight > 0) {
      console.log('🥈 Special Silver Calculations:');
      if (silverTotals.silverQuarterProofCount > 0) {
        console.log(`   Quarter Proofs: ${silverTotals.silverQuarterProofCount} pieces`);
        console.log(`   Quarter Proof Melt Value: ${formatCurrency(silverTotals.silverQuarterProofMelt)}`);
      }
      if (silverTotals.ninetyPercentSilverWeight > 0) {
        console.log(`   90% Silver Content Weight: ${(silverTotals.ninetyPercentSilverWeight / 31.1034768).toFixed(2)} oz`);
        console.log(`   90% Silver Melt Value: ${formatCurrency(silverTotals.ninetyPercentSilverMelt)}`);
      }
    }
  }

  // Update "All" totals display if elements exist
  if (elements.totals.all.items.textContent !== undefined) {
    elements.totals.all.items.textContent = allTotals.totalItems;
    elements.totals.all.weight.textContent = allTotals.totalWeight.toFixed(2);
    elements.totals.all.value.innerHTML = formatCurrency(allTotals.currentSpotValue || 0);
    elements.totals.all.purchased.innerHTML = formatCurrency(allTotals.totalPurchased || 0);
    elements.totals.all.premium.innerHTML = formatCurrency(allTotals.totalPremium || 0);
    elements.totals.all.lossProfit.innerHTML = formatLossProfit(allTotals.lossProfit || 0);
    elements.totals.all.avgPrice.innerHTML = formatCurrency(allTotals.totalPurchased / allTotals.totalWeight || 0);
    elements.totals.all.avgPremium.innerHTML = formatCurrency(allTotals.totalPremium / allTotals.totalWeight || 0);
    elements.totals.all.avgCollectablePrice.innerHTML = formatCurrency(avgCollectablePriceAll || 0);
    elements.totals.all.avgNonCollectablePrice.innerHTML = formatCurrency(avgNonCollectablePriceAll || 0);
  }
};

/**
 * Deletes inventory item at specified index after confirmation
 * 
 * @param {number} idx - Index of item to delete
 */
const deleteItem = (idx) => {
  const item = inventory[idx];
  if (confirm("Delete this item?")) {
    inventory.splice(idx, 1);
    saveInventory();
    renderTable();
    if (item) logChange(item.name, 'Deleted', JSON.stringify(item), '', idx);
  }
};

/**
 * Opens modal to view and edit an item's notes
 *
 * @param {number} idx - Index of item whose notes to view/edit
 */
const showNotes = (idx) => {
  notesIndex = idx;
  const item = inventory[idx];
  
  // Add fallbacks and better error handling
  const textareaElement = elements.notesTextarea || document.getElementById('notesTextarea');
  const modalElement = elements.notesModal || document.getElementById('notesModal');
  
  if (textareaElement) {
    textareaElement.value = item.notes || '';
  } else {
    console.error('Notes textarea element not found');
  }
  
  if (modalElement) {
  if (window.openModalById) openModalById('notesModal');
  else modalElement.style.display = 'flex';
  } else {
    console.error('Notes modal element not found');
  }
  
  if (textareaElement && textareaElement.focus) {
    textareaElement.focus();
  }
};


/**
 * Prepares and displays edit modal for specified inventory item
 *
 * @param {number} idx - Index of item to edit
 */
const editItem = (idx, logIdx = null) => {
  editingIndex = idx;
  editingChangeLogIndex = logIdx;
  const item = inventory[idx];

  // Populate edit form
  elements.editMetal.value = item.composition || item.metal;
  elements.editName.value = item.name;
  elements.editQty.value = item.qty;
  elements.editType.value = item.type;
  if (item.weight < 1) {
    elements.editWeight.value = oztToGrams(item.weight).toFixed(2);
    elements.editWeight.dataset.unit = 'g';
  } else {
    elements.editWeight.value = parseFloat(item.weight).toFixed(2);
    elements.editWeight.dataset.unit = 'oz';
  }
  elements.editPrice.value = item.price > 0 ? item.price : '';
  elements.editPurchaseLocation.value = item.purchaseLocation;
  elements.editStorageLocation.value = item.storageLocation && item.storageLocation !== 'Unknown' ? item.storageLocation : '';
  
  // Add fallback for notes field
  const notesField = elements.editNotes || document.getElementById('editNotes');
  if (notesField) {
    notesField.value = item.notes || '';
  }
  
  elements.editDate.value = item.date;
  elements.editSpotPrice.value = item.spotPriceAtPurchase;
  elements.editCatalog.value = item.numistaId || "";
  elements.editSerial.value = item.serial;
  document.getElementById("editCollectable").checked = item.isCollectable;

  if (elements.undoChangeBtn) {
    elements.undoChangeBtn.style.display =
      logIdx !== null ? "inline-block" : "none";
  }

  // Show modal
  if (window.openModalById) openModalById('editModal');
  else elements.editModal.style.display = 'flex';
};

/**
 * Toggles collectable status for inventory item
 * 
 * @param {number} idx - Index of item to update
*/
const toggleCollectable = (idx) => {
  const item = inventory[idx];
  const oldItem = { ...item };
  const wasCollectable = item.isCollectable;
  const isCollectable = !wasCollectable;
  
  // Expose globally so it's available to inline event handlers
  if (typeof window !== 'undefined') {
    window.toggleCollectable = toggleCollectable;
  }

  // If toggling from collectable to non-collectable
  if (wasCollectable && !isCollectable) {
    // Use the stored spotPriceAtPurchase if available and valid
    let spotPrice = item.spotPriceAtPurchase;

    // If spotPriceAtPurchase is invalid (<= 0), use current spot price
    if (spotPrice <= 0) {
      spotPrice = spotPrices[item.metal.toLowerCase()];
      // Update spotPriceAtPurchase for future reference
      item.spotPriceAtPurchase = spotPrice;
    }

    // Recalculate premium
    const pricePerOz = item.price / item.weight;
    item.premiumPerOz = pricePerOz - spotPrice;
    item.totalPremium = item.premiumPerOz * item.qty * item.weight;
  } 
  // If toggling from non-collectable to collectable
  else if (!wasCollectable && isCollectable) {
    // Preserve the current spotPriceAtPurchase (it should already be set)
    // No need to change it, just make sure we keep it

    // Set premiums to 0 for collectable items
    item.premiumPerOz = 0;
    item.totalPremium = 0;
  }

  // Update collectable status
  item.isCollectable = isCollectable;

  // Ensure catalog data is properly synced
  catalogManager.syncItem(item);
  
  saveInventory();
  renderTable();
  logItemChanges(oldItem, item);
};

// =============================================================================
// The import/export functions have been moved to js/import-export.js
// =============================================================================

// =============================================================================
// Expose inventory actions globally for inline event handlers
window.toggleCollectable = toggleCollectable;
window.editItem = editItem;
window.deleteItem = deleteItem;
window.showNotes = showNotes;

/**
 * Phase 1C: Storage optimization and housekeeping
 */
function optimizeStoragePhase1C(){
  try{
    if (typeof catalogManager !== 'undefined' && catalogManager && typeof catalogManager.removeOrphanedMappings === 'function'){
      catalogManager.removeOrphanedMappings();
    }
    if (typeof generateStorageReport === 'function'){
      const report = generateStorageReport();
      debugLog('Storage Optimization: Total localStorage ~', report.totalKB, 'KB');
      if (typeof initializeStorageChart === 'function'){
        try { initializeStorageChart(report); } catch (e) { debugWarn('Storage chart init failed', e); }
      }
    }
  } catch(e){
    debugWarn('optimizeStoragePhase1C error', e);
  }
}
if (typeof window !== 'undefined'){ window.optimizeStoragePhase1C = optimizeStoragePhase1C; }

// This duplicate loadInventory function was causing conflicts
// Removing it and relying on the existing implementation above
// The original implementation includes data migration which this one lacks
if (typeof window !== 'undefined' && !window.loadInventory) { 
  window.loadInventory = function fallbackLoadInventory() {
    try {
      // Use the loadData utility function which handles errors and fallbacks
      inventory = loadData(LS_KEY, []);
      
      // Update the global window.inventory reference
      window.inventory = inventory;
      
      console.log('Inventory loaded:', inventory);
      return inventory;
    } catch (error) {
      console.error('Failed to load inventory data:', error);
      inventory = []; // Reset to empty array on error
      
      // Update the global window.inventory reference
      if (typeof window !== 'undefined') {
        window.inventory = inventory;
      }
      
      return inventory;
    }
  };
}
window.renderTable = renderTable;

// =============================================================================
// GLOBAL FUNCTION EXPOSURE
// =============================================================================

console.log("✓ All import/export functions exposed globally");

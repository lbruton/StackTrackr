// INVENTORY FUNCTIONS
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

/**
 * Generates HTML content for backup export
 * 
 * @param {Array} sortedInventory - Sorted inventory data
 * @param {string} timeFormatted - Formatted timestamp
 * @returns {string} HTML content
 */
const generateBackupHtml = (sortedInventory, timeFormatted) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StackrTrackr Backup</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #2563eb; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .backup-info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>StackrTrackr Backup</h1>
  <div class="backup-info">
    <strong>Backup Created:</strong> ${timeFormatted}<br>
    <strong>Application Version:</strong> ${APP_VERSION}<br>
    <strong>Total Items:</strong> ${sortedInventory.length}<br>
    <strong>Archive Contents:</strong> Complete inventory data, settings, and spot price history
  </div>
  <table>
    <thead>
      <tr>
        <th>Composition</th><th>Name</th><th>Qty</th><th>Type</th><th>Weight(oz)</th>
        <th>Purchase Price</th><th>Purchase Location</th><th>Storage Location</th>
        <th>Notes</th><th>Date</th><th>Collectable</th>
      </tr>
    </thead>
    <tbody>
      ${sortedInventory.map(item => `
        <tr>
          <td>${getCompositionFirstWords(item.composition || item.metal)}</td>
          <td>${item.name}</td>
          <td>${item.qty}</td>
          <td>${item.type}</td>
          <td>${parseFloat(item.weight).toFixed(2)}</td>
          <td>${formatCurrency(item.price)}</td>
          <td>${item.purchaseLocation}</td>
          <td>${item.storageLocation || ''}</td>
          <td>${item.notes || ''}</td>
          <td>${item.date}</td>
          <td>${item.isCollectable ? 'Yes' : 'No'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;
};

/**
 * Generates README content for backup archive
 * 
 * @param {string} timeFormatted - Formatted timestamp
 * @returns {string} README content
 */
const generateReadmeContent = (timeFormatted) => {
  return `PRECIOUS METALS INVENTORY TOOL - BACKUP ARCHIVE
===============================================

Backup Created: ${timeFormatted}
Application Version: ${APP_VERSION}
Total Items: ${inventory.length}

FILE CONTENTS:
--------------

1. inventory_data.json
   - Complete inventory data in JSON format
   - Includes all item details, notes, and metadata
   - Primary data file for restoration

2. settings.json
   - Application configuration and preferences
   - Current spot prices and user settings
   - UI state (pagination, search, sorting)

3. spot_price_history.json
   - Historical spot price data and tracking
   - API sync records and manual overrides
   - Price trend information

4. inventory_export.csv
   - Spreadsheet-compatible export
   - Human-readable format for external use

5. inventory_report.html
   - Self-contained web page report
   - No external dependencies required
   - Print-friendly format

6. sample_data.json (if applicable)
   - Sample of inventory items for reference
   - Useful for testing import functionality
   - Demonstrates data structure

7. README.txt (this file)
   - Backup contents explanation
   - Restoration instructions

RESTORATION INSTRUCTIONS:
------------------------

1. For complete restoration:
   - Import inventory_data.json using the application's JSON import feature
   - Manually configure spot prices from settings.json if needed

2. For partial restoration:
   - Use inventory_export.csv for spreadsheet applications
   - View inventory_report.html in any web browser

3. For data analysis:
   - All files contain the same core data in different formats
   - Choose the format best suited for your analysis tools

SUPPORT:
--------

For questions about this backup or the StackrTrackr application:
- Check the application documentation
- Verify file integrity before restoration
- Test imports with sample data first

This backup contains your complete precious metals inventory as of ${timeFormatted}.
Store this archive in a secure location for data protection.

--- End of README ---`;
};

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

/**
 * Removes non-alphanumeric characters from inventory records.
 *
 * @returns {void}
 */
const sanitizeTablesOnLoad = () => {
  inventory = inventory.map(item => sanitizeObjectFields(item));

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
  try {
    // For now, use synchronous loading to maintain compatibility
    // TODO: Convert to async when updating all callers
    const data = loadDataSync(LS_KEY, []);
    
    // Ensure data is an array
    if (!Array.isArray(data)) {
      console.warn('Inventory data is not an array, resetting to empty array');
      inventory = [];
      return;
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
        marketValue: item.marketValue || 0,
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
  } catch (error) {
    console.error('Error loading inventory:', error);
    inventory = [];
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

const METAL_TEXT_COLORS = {
  Silver: () => getContrastColor(getComputedStyle(document.documentElement).getPropertyValue('--silver').trim()),
  Gold: () => getContrastColor(getComputedStyle(document.documentElement).getPropertyValue('--gold').trim()),
  Platinum: () => getContrastColor(getComputedStyle(document.documentElement).getPropertyValue('--platinum').trim()),
  Palladium: () => getContrastColor(getComputedStyle(document.documentElement).getPropertyValue('--palladium').trim())
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
    // Use a simple hash function based on the key itself to ensure consistent colors
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    map[key] = Math.abs(hash) % 360; // Use hash for hue distribution
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
  text
    .toString()
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
  return `<span class="${classNames}"${styleAttr} onclick="${escaped}" tabindex="0" role="button" onkeydown="if(event.key==='Enter'||event.key===' ')${escaped}" title="${safeTitle}">${safe}</span>`;
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
  
  // Truncate at 18 characters (reduced from 24)
  const truncated = value.length > 18 ? value.substring(0, 18) + '…' : value;
  const color = getPurchaseLocationColor(value);
  const urlPattern = /^(https?:\/\/)?[\w.-]+\.[A-Za-z]{2,}(\S*)?$/;
  const filterSpan = filterLink('purchaseLocation', value, color, truncated, value !== truncated ? value : undefined);
  
  if (urlPattern.test(value)) {
    let href = value;
    if (!/^https?:\/\//i.test(href)) {
      href = `https://${href}`;
    }
    const safeHref = escapeAttribute(href);
    return `<a href="#" onclick="event.stopPropagation(); window.open('${safeHref}', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,location=no,menubar=no,status=no'); return false;" class="purchase-link" title="${safeHref}">
      <svg class="purchase-link-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 12px; height: 12px; fill: currentColor; margin-right: 4px;" aria-hidden="true">
        <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
      </svg>
    </a>${filterSpan}`;
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
  
  // Truncate at 25 characters
  const truncated = value.length > 25 ? value.substring(0, 25) + '…' : value;
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
 * Updates the displayed inventory item count based on active filters
 *
 * @param {number} filteredCount - Items matching current filters
 * @param {number} totalCount - Total items in inventory
 */
const updateItemCount = (filteredCount, totalCount) => {
  if (!elements.itemCount) return;
  elements.itemCount.textContent =
    filteredCount === totalCount
      ? `${totalCount} items`
      : `${filteredCount} of ${totalCount} items`;
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
  
  // Close any other open editors (fix for closing all editors issue)
  const allOpenEditors = document.querySelectorAll('td.editing');
  allOpenEditors.forEach(editor => {
    if (editor !== td) {
      const cancelBtn = editor.querySelector('.cancel-inline');
      if (cancelBtn) cancelBtn.click();
    }
  });
  
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
    const iconHtml = `<span class="inline-edit-icon" role="button" tabindex="0" onclick="startCellEdit(${idx}, '${field}', this)" aria-label="Edit ${field}" title="Edit ${field}">✎</span>`;
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
  headers.forEach(header => {
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

const renderTable = () => {
  return monitorPerformance(() => {
    // Ensure filterInventory is available (search.js may still be loading)
    const filteredInventory = typeof filterInventory === 'function' ? filterInventory() : inventory;
    updateItemCount(filteredInventory.length, inventory.length);
    const sortedInventory = sortInventory(filteredInventory);
    debugLog('renderTable start', sortedInventory.length, 'items');
    const totalPages = calculateTotalPages(sortedInventory);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, sortedInventory.length);

    const rows = [];

    for (let i = startIndex; i < endIndex; i++) {
      const item = sortedInventory[i];
      const originalIdx = inventory.indexOf(item);
      debugLog('renderTable row', i, item.name);
  const spotDisplay = item.isCollectable ? '—' : (item.spotPriceAtPurchase > 0 ? formatCurrency(item.spotPriceAtPurchase) : '—');
  const spotValue = item.isCollectable ? '—' : (item.spotPriceAtPurchase > 0 ? item.spotPriceAtPurchase : '');
      const premiumDisplay = item.isCollectable ? '—' : formatCurrency(item.totalPremium);
      const premiumValue = item.isCollectable ? '—' : item.totalPremium;

  rows.push(`
      <tr>
  <td class="shrink" data-column="date">${filterLink('date', item.date, 'var(--text-primary)', item.date ? formatDisplayDate(item.date) : '—')}</td>
      <td class="shrink" data-column="type">${filterLink('type', item.type, getTypeColor(item.type))}</td>
      <td class="shrink" data-column="metal" data-metal="${escapeAttribute(item.composition || item.metal || '')}">${filterLink('metal', item.composition || item.metal || 'Silver', METAL_COLORS[item.metal] || 'var(--primary)', getDisplayComposition(item.composition || item.metal || 'Silver'))}</td>
      <td class="shrink" data-column="qty">${filterLink('qty', item.qty, 'var(--text-primary)')}</td>
      <td class="expand" data-column="name" style="text-align: left; position: relative; padding-right: 30px;">
        ${filterLink('name', item.name, 'var(--text-primary)')}
        <span class="inline-edit-icon" onclick="event.stopPropagation(); console.log('Pencil clicked:', ${originalIdx}, 'name', this); startCellEdit(${originalIdx}, 'name', this)" title="Quick edit name" tabindex="0" role="button" onkeydown="if(event.key==='Enter'||event.key===' '){event.stopPropagation(); console.log('Pencil key:', ${originalIdx}, 'name', this); startCellEdit(${originalIdx}, 'name', this)}" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); opacity: 0.6; cursor: pointer; font-size: 14px; transition: opacity 0.2s; z-index: 1;">
          <svg class="icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: currentColor;" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/></svg>
        </span>
      </td>
      <td class="shrink" data-column="weight">${filterLink('weight', item.weight, 'var(--text-primary)', formatWeight(item.weight), item.weight < 1 ? 'Grams (g)' : 'Troy ounces (ozt)')}</td>
      <td class="shrink" data-column="purchasePrice" title="Purchase Price (USD) - Click to search eBay sold listings" style="color: var(--text-primary);">
        ${(item.price && item.price > 0) ? 
          `<a href="#" onclick="event.stopPropagation(); openEbaySearch('${sanitizeHtml(item.metal)} ${sanitizeHtml(item.name)}'); return false;" class="ebay-price-link" title="Search eBay sold listings for ${sanitizeHtml(item.metal)} ${sanitizeHtml(item.name)}">
            ${formatCurrency(item.price)} <span class="ebay-icon">🔍</span>
          </a>` : 
          '—'}
      </td>
      <td class="shrink" data-column="marketValue" title="Current Market Value (USD)" style="color: var(--text-primary);">
        ${(item.marketValue && item.marketValue > 0) ? formatCurrency(item.marketValue) + ' 📊' : '—'}
      </td>
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
          <span class="numista-badge">N#${sanitizeHtml(item.numistaId)}</span>
        </a>
      ` : '<span class="numista-empty">—</span>'}</td>
  <td class="icon-col" data-column="collectable"><span class="collectable-status" role="button" tabindex="0" onclick="toggleCollectable(${originalIdx})" onkeydown="if(event.key==='Enter'||event.key===' ') toggleCollectable(${originalIdx})" aria-label="Toggle collectable status for ${sanitizeHtml(item.name)}" title="Toggle collectable status">${item.isCollectable ? '<svg class=\"collectable-icon vault-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\"/><circle cx=\"17\" cy=\"11\" r=\"2\"/><rect x=\"6\" y=\"8\" width=\"6\" height=\"8\" rx=\"1\"/></svg>' : '<svg class=\"collectable-icon bar-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"8\" width=\"18\" height=\"8\" rx=\"1\"/><path d=\"M5 6h14l-2-2H7z\"/></svg>'}</span></td>
      <td class="icon-col" data-column="notes"><button class="icon-btn action-icon ${item.notes && item.notes.trim() ? 'has-notes' : ''}" role="button" tabindex="0" onclick="showNotes(${originalIdx})" aria-label="View notes" title="View notes">
        <svg class="icon-svg notes-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15V5a2 2 0 0 0-2-2H7L3 7v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2z"/></svg>
      </button></td>
      <td class="icon-col" data-column="edit"><button class="icon-btn action-icon edit-icon" role="button" tabindex="0" onclick="editItem(${originalIdx})" aria-label="Edit ${sanitizeHtml(item.name)}" title="Edit item">
        <svg class="icon-svg edit-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/></svg>
      </button></td>
      <td class="icon-col" data-column="delete"><button class="icon-btn action-icon danger" role="button" tabindex="0" onclick="deleteItem(${originalIdx})" aria-label="Delete item" title="Delete item">
        <svg class="icon-svg delete-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7zm3-4h6l1 1h4v2H3V4h4l1-1z"/></svg>
      </button></td>
      </tr>
      `);
    }

    const visibleCount = endIndex - startIndex;
    const placeholders = Array.from(
      { length: Math.max(0, itemsPerPage - visibleCount) },
      () => '<tr><td class="shrink" colspan="17">&nbsp;</td></tr>'
    );

    // Find tbody element directly if cached version fails
    const tbody = elements.inventoryTable || document.querySelector('#inventoryTable tbody');
    if (!tbody) {
      console.error('Could not find table tbody element');
      return;
    }
    
    tbody.innerHTML = rows.concat(placeholders).join('');
    hideEmptyColumns();
    updateTypeSummary(filteredInventory);

    debugLog('renderTable complete');

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
  }, 'renderTable');
};

/**
 * Calculates and updates all financial summary displays across the application
 */
const updateSummary = () => {
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

    for (const item of inventory) {
      if (item.metal === metal) {
        const qty = Number(item.qty) || 0;
        const weight = parseFloat(item.weight) || 0;
        const price = parseFloat(item.price) || 0;

        totalItems += qty;

        // Total Weight calculation (for both regular and collectible items)
        const itemWeight = qty * weight;
        totalWeight += itemWeight;

        // Current spot value calculation (applies to all items)
        const currentSpot = spotPrices[item.metal.toLowerCase()] || 0;
        const currentValue = currentSpot * itemWeight;
        currentSpotValue += currentValue;

        // Total Purchase Price calculation (for both regular and collectible items)
        totalPurchased += qty * price;

        if (item.isCollectable) {
          // Track collectable metrics
          collectableWeight += itemWeight;
          collectableValue += qty * price;
        } else {
          // Track non-collectable metrics
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
      nonCollectableValue     // CRITICAL: Now returning these values
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
  elements.editMarketValue.value = item.marketValue > 0 ? item.marketValue : '';
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
  
  // Show/hide market value field based on collectable status
  if (elements.editMarketValueField) {
    elements.editMarketValueField.style.display = item.isCollectable ? 'block' : 'none';
  }
  if (elements.editDateField) {
    elements.editDateField.style.display = item.isCollectable ? 'none' : 'block';
  }

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

/**
 * Toggles price display between purchase price and market value
 * 
 * @param {number} idx - Index of item to toggle price view for
 */
/**
 * Legacy function kept for compatibility - no longer used
 * Market value now has its own dedicated column
 */
const togglePriceView = (idx) => {
  // Function kept for compatibility but no longer used
  console.warn('togglePriceView is deprecated - using separate columns now');
};

/**
 * Legacy function kept for compatibility - no longer used  
 * Market value now has its own dedicated column
 */
const toggleGlobalPriceView = () => {
  // Function kept for compatibility but no longer used
  console.warn('toggleGlobalPriceView is deprecated - using separate columns now');
};

// =============================================================================
// IMPORT/EXPORT FUNCTIONS
// =============================================================================

// Import progress utilities
const startImportProgress = (total) => {
  if (!elements.importProgress || !elements.importProgressText) return;
  elements.importProgress.max = total;
  elements.importProgress.value = 0;
  elements.importProgress.style.display = 'block';
  elements.importProgressText.style.display = 'block';
  elements.importProgressText.textContent = `0 / ${total} items imported`;
};

const updateImportProgress = (processed, imported, total) => {
  if (!elements.importProgress || !elements.importProgressText) return;
  elements.importProgress.value = processed;
  elements.importProgressText.textContent = `${imported} / ${total} items imported`;
};

const endImportProgress = () => {
  if (!elements.importProgress || !elements.importProgressText) return;
  elements.importProgress.style.display = 'none';
  elements.importProgressText.style.display = 'none';
};

/**
 * Imports inventory data from CSV file with comprehensive validation and error handling
 * 
 * @param {File} file - CSV file selected by user through file input
 * @param {boolean} [override=false] - Replace existing inventory instead of merging
 */
const importCsv = (file, override = false) => {
  try {
    debugLog('importCsv start', file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        const imported = [];
        const totalRows = results.data.length;
        startImportProgress(totalRows);
        let processed = 0;
        let importedCount = 0;

        for (const row of results.data) {
          processed++;
          debugLog('importCsv row', processed, JSON.stringify(row));
          const compositionRaw = row['Composition'] || row['Metal'] || 'Silver';
          const composition = getCompositionFirstWords(compositionRaw);
          const metal = parseNumistaMetal(composition);
          const name = row['Name'] || row['name'];
          const qty = row['Qty'] || row['qty'] || 1;
          const type = normalizeType(row['Type'] || row['type']);
          const weight = row['Weight(oz)'] || row['weight'];
          const priceStr = row['Purchase Price'] || row['price'];
          let price = typeof priceStr === 'string'
            ? parseFloat(priceStr.replace(/[^\d.-]+/g, ''))
            : parseFloat(priceStr);
          if (price < 0) price = 0;
          const purchaseLocation = row['Purchase Location'] || '';
          const storageLocation = row['Storage Location'] || '';
          const notes = row['Notes'] || '';
          const date = parseDate(row['Date']);

          const isCollectable = row['Collectable'] === 'Yes' || row['Collectable'] === 'true' || row['isCollectable'] === 'true';

          let spotPriceAtPurchase;
          if (row['Spot Price ($/oz)']) {
            const spotStr = row['Spot Price ($/oz)'].toString();
            spotPriceAtPurchase = parseFloat(spotStr.replace(/[^0-9.-]+/g, ''));
          } else if (row['spotPriceAtPurchase']) {
            spotPriceAtPurchase = parseFloat(row['spotPriceAtPurchase']);
          } else {
            const metalKey = metal.toLowerCase();
            spotPriceAtPurchase = isCollectable ? 0 : spotPrices[metalKey];
          }

          let premiumPerOz = 0;
          let totalPremium = 0;
          if (!isCollectable) {
            const pricePerOz = price / parseFloat(weight);
            premiumPerOz = pricePerOz - spotPriceAtPurchase;
            totalPremium = premiumPerOz * parseFloat(qty) * parseFloat(weight);
          }

          const numistaRaw = (row['N#'] || row['Numista #'] || row['numistaId'] || '').toString();
          const numistaMatch = numistaRaw.match(/\d+/);
          const numistaId = numistaMatch ? numistaMatch[0] : '';
          const serial = row['Serial'] || row['serial'] || getNextSerial();

          addCompositionOption(composition);

          const item = sanitizeImportedItem({
            metal,
            composition,
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
            numistaId,
            serial
          });

          imported.push(item);
          importedCount++;
          updateImportProgress(processed, importedCount, totalRows);
        }

        endImportProgress();

        if (imported.length === 0) return alert('No items to import.');

        const existingSerials = new Set(override ? [] : inventory.map(item => item.serial));
        const existingKeys = new Set(
          (override ? [] : inventory)
            .filter(item => item.numistaId)
            .map(item => `${item.numistaId}|${item.name}|${item.date}`)
        );
        const deduped = [];
        let duplicateCount = 0;

        for (const item of imported) {
          const key = item.numistaId ? `${item.numistaId}|${item.name}|${item.date}` : null;
          if (existingSerials.has(item.serial) || (key && existingKeys.has(key))) {
            duplicateCount++;
            continue;
          }
          existingSerials.add(item.serial);
          if (key) existingKeys.add(key);
          deduped.push(item);
        }

        if (duplicateCount > 0) {
          console.info(`${duplicateCount} duplicate items skipped during import.`);
        }

        if (deduped.length === 0) return alert('No items to import.');

        for (const item of deduped) {
          if (typeof registerName === "function") {
            registerName(item.name);
          }
        }

        if (override) {
          inventory = deduped;
        } else {
          inventory = inventory.concat(deduped);
        }
        
        // Synchronize all items with catalog manager
        inventory = catalogManager.syncInventory(inventory);

        saveInventory();
        renderTable();
        if (typeof renderActiveFilters === 'function') {
          renderActiveFilters();
        }
        if (typeof updateTypeSummary === 'function') {
          updateTypeSummary();
        }
        if (typeof updateStorageStats === 'function') {
          updateStorageStats();
        }
        debugLog('importCsv complete', deduped.length, 'items added');
        if (localStorage.getItem('stackrtrackr.debug') && typeof window.showDebugModal === 'function') {
          showDebugModal();
        }
      },
      error: function(error) {
        endImportProgress();
        handleError(error, 'CSV import');
      }
    });
  } catch (error) {
    endImportProgress();
    handleError(error, 'CSV import initialization');
  }
};

/**
 * Imports inventory data from a Numista CSV export
 *
 * @param {File} file - CSV file from Numista
 * @param {boolean} [override=false] - Replace existing inventory instead of merging
 */
const importNumistaCsv = (file, override = false) => {
  try {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const csvText = e.target.result;
        const results = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => h.trim(), // Handle Numista headers with trailing spaces
        });
        const rawTable = results.data;
        const imported = [];
        const totalRows = rawTable.length;
        startImportProgress(totalRows);
        let processed = 0;
        let importedCount = 0;

        const getValue = (row, keys) => {
          for (const key of keys) {
            const foundKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
            if (foundKey) return row[foundKey];
          }
          return "";
        };

        for (const row of rawTable) {
          processed++;

          const numistaRaw = (getValue(row, ['N# number', 'N# number (with link)', 'Numista #', 'Numista number', 'Numista id']) || '').toString();
          const numistaMatch = numistaRaw.match(/\d+/);
          const numistaId = numistaMatch ? numistaMatch[0] : '';
          const title = (getValue(row, ['Title', 'Name']) || '').trim();
          const year = (getValue(row, ['Year', 'Date']) || '').trim();
          const name = year.length >= 4 ? `${title} ${year}`.trim() : title;
          const issuedYear = year.length >= 4 ? year : '';
          const compositionRaw = getValue(row, ['Composition', 'Metal']) || '';
          const composition = getCompositionFirstWords(compositionRaw);

          addCompositionOption(composition);

          let metal = parseNumistaMetal(composition);
          const qty = parseInt(getValue(row, ['Quantity', 'Qty', 'Quantity owned']) || 1, 10);

          let type = normalizeType(mapNumistaType(getValue(row, ['Type']) || ''));
          if (metal === 'Paper' || composition.toLowerCase().startsWith('paper')) {
            type = 'Note';
            metal = 'Alloy';
          }

          const weightCols = Object.keys(row).filter(k => { const key = k.toLowerCase(); return key.includes('weight') || key.includes('mass'); });
          let weightGrams = 0;
          for (const col of weightCols) {
            const val = parseFloat(String(row[col]).replace(/[^0-9.]/g, ''));
            if (!isNaN(val)) weightGrams = Math.max(weightGrams, val);
          }
          const weight = parseFloat(gramsToOzt(weightGrams).toFixed(2));

          let isCollectable = true;
          if ((metal === 'Silver' || metal === 'Gold') && weightGrams >= 3) {
            isCollectable = false;
          }

          const priceKey = Object.keys(row).find(k => /^(buying price|purchase price|price paid)/i.test(k));
          const estimateKey = Object.keys(row).find(k => /^estimate/i.test(k));
          const parsePriceField = (key) => {
            const rawVal = String(row[key] ?? '').trim();
            const valueCurrency = detectCurrency(rawVal);
            const headerCurrencyMatch = key.match(/\(([^)]+)\)/);
            const headerCurrency = headerCurrencyMatch ? headerCurrencyMatch[1] : 'USD';
            const currency = valueCurrency || headerCurrency;
            const amount = parseFloat(rawVal.replace(/[^0-9.\-]/g, ''));
            return isNaN(amount) ? 0 : convertToUsd(amount, currency);
          };
          
          let purchasePrice = 0;
          let marketValue = 0;
          
          // Set purchase price from buying price
          if (priceKey) {
            purchasePrice = parsePriceField(priceKey);
          }
          
          // Set market value from estimate price
          if (estimateKey) {
            marketValue = parsePriceField(estimateKey);
          }
          
          // If no market value but we have buying price, use buying price for both
          if (marketValue === 0 && purchasePrice > 0) {
            marketValue = purchasePrice;
          }
          
          // If no purchase price but we have estimate, use estimate for both
          if (purchasePrice === 0 && marketValue > 0) {
            purchasePrice = marketValue;
          }

          const purchaseLocRaw = getValue(row, ['Acquisition place', 'Acquired from', 'Purchase place']);
          const purchaseLocation = purchaseLocRaw && purchaseLocRaw.trim() ? purchaseLocRaw.trim() : '—';
          const storageLocRaw = getValue(row, ['Storage location', 'Stored at', 'Storage place']);
          const storageLocation = storageLocRaw && storageLocRaw.trim() ? storageLocRaw.trim() : '—';

          const dateStrRaw = getValue(row, ['Acquisition date', 'Date acquired', 'Date']);
          const dateStr = dateStrRaw && dateStrRaw.trim() ? dateStrRaw.trim() : '—';
          const date = parseDate(dateStr);

          const baseNote = (getValue(row, ['Note', 'Notes']) || '').trim();
          const privateComment = (getValue(row, ['Private comment']) || '').trim();
          const publicComment = (getValue(row, ['Public comment']) || '').trim();
          const otherComment = (getValue(row, ['Comment']) || '').trim();
          const noteParts = [];
          if (baseNote) noteParts.push(baseNote);
          if (privateComment) noteParts.push(`Private Comment: ${privateComment}`);
          if (publicComment) noteParts.push(`Public Comment: ${publicComment}`);
          if (otherComment) noteParts.push(`Comment: ${otherComment}`);
          const notes = noteParts.join('\n');

          const markdownLines = Object.entries(row)
            .filter(([, v]) => v && String(v).trim())
            .map(([k, v]) => `- **${k.trim()}**: ${String(v).trim()}`);
          const markdownNote = markdownLines.length
            ? `### Numista Import Data\n${markdownLines.join('\n')}`
            : '';
          const finalNotes = markdownNote
            ? notes ? `${notes}\n\n${markdownNote}` : markdownNote
            : notes;

          if (type === 'Bar' || type === 'Round') {
            isCollectable = false;
          }
          const spotPriceAtPurchase = 0;
          const premiumPerOz = 0;
          const totalPremium = 0;
          const serial = getNextSerial();

          const item = sanitizeImportedItem({
            metal,
            composition,
            name,
            qty,
            type,
            weight,
            price: purchasePrice,
            purchasePrice,
            marketValue,
            date,
            purchaseLocation,
            storageLocation,
            notes: finalNotes,
            spotPriceAtPurchase,
            premiumPerOz,
            totalPremium,
            isCollectable,
            numistaId,
            issuedYear,
            serial
          });

          imported.push(item);
          importedCount++;
          updateImportProgress(processed, importedCount, totalRows);
        }

        endImportProgress();

        if (imported.length === 0) return alert('No items to import.');

        const existingSerials = new Set(override ? [] : inventory.map(item => item.serial));
        const existingKeys = new Set(
          (override ? [] : inventory)
            .filter(item => item.numistaId)
            .map(item => `${item.numistaId}|${item.name}|${item.date}`)
        );
        const deduped = [];
        let duplicateCount = 0;

        for (const item of imported) {
          const key = item.numistaId ? `${item.numistaId}|${item.name}|${item.date}` : null;
          if (existingSerials.has(item.serial) || (key && existingKeys.has(key))) {
            duplicateCount++;
            continue;
          }
          existingSerials.add(item.serial);
          if (key) existingKeys.add(key);
          deduped.push(item);
        }

        if (duplicateCount > 0) {
          console.info(`${duplicateCount} duplicate items skipped during import.`);
        }

        if (deduped.length === 0) return alert('No items to import.');

        for (const item of deduped) {
          if (typeof registerName === "function") {
            registerName(item.name);
          }
        }

        if (override) {
          inventory = deduped;
        } else {
          inventory = inventory.concat(deduped);
        }

        // Synchronize all items with catalog manager
        inventory = catalogManager.syncInventory(inventory);

        saveInventory();
        renderTable();
        if (typeof renderActiveFilters === 'function') {
          renderActiveFilters();
        }
        if (typeof updateTypeSummary === 'function') {
          updateTypeSummary();
        }
        if (typeof updateStorageStats === 'function') {
          updateStorageStats();
        }
      } catch (error) {
        endImportProgress();
        handleError(error, 'Numista CSV import');
      }
    };
    reader.onerror = (error) => {
      endImportProgress();
      handleError(error, 'Numista CSV import');
    };
    reader.readAsText(file);
  } catch (error) {
    endImportProgress();
    handleError(error, 'Numista CSV import initialization');
  }
};

/**
 * Exports inventory using Numista-compatible column layout
 */
const exportNumistaCsv = () => {
  const timestamp = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const headers = [
    "N# number",
    "Title",
    "Year",
    "Metal",
    "Quantity",
    "Type",
    "Weight (g)",
    "Buying price (USD)",
    "Acquisition place",
    "Storage location",
    "Acquisition date",
    "Note",
    "Private comment",
    "Public comment",
    "Comment",
  ];

  const sortedInventory = sortInventoryByDateNewestFirst();
  const rows = [];

  for (const item of sortedInventory) {
    const year = item.issuedYear || '';
    let title = item.name || '';
    if (year) {
      const yearRegex = new RegExp(`\\s*${year}\\b`);
      title = title.replace(yearRegex, '').trim();
    }

    const weightGrams = parseFloat(item.weight)
      ? parseFloat(item.weight) * 31.1034768
      : 0;
    const purchasePrice = item.purchasePrice ?? item.price;

    let baseNote = '';
    let privateComment = '';
    let publicComment = '';
    let otherComment = '';
    if (item.notes) {
      const lines = String(item.notes).split(/\n/);
      for (const line of lines) {
        if (/^\s*Private Comment:/i.test(line)) {
          privateComment = line.replace(/^\s*Private Comment:\s*/i, '').trim();
        } else if (/^\s*Public Comment:/i.test(line)) {
          publicComment = line.replace(/^\s*Public Comment:\s*/i, '').trim();
        } else if (/^\s*Comment:/i.test(line)) {
          otherComment = line.replace(/^\s*Comment:\s*/i, '').trim();
        } else {
          baseNote = baseNote ? `${baseNote}\n${line}` : line;
        }
      }
    }

    rows.push([
      item.numistaId || '',
      title,
      year,
      item.metal || '',
      item.qty || '',
      item.type || '',
      weightGrams ? weightGrams.toFixed(2) : '',
      purchasePrice != null ? Number(purchasePrice).toFixed(2) : '',
      item.purchaseLocation || '',
      item.storageLocation || '',
      item.date || '',
      baseNote,
      privateComment,
      publicComment,
      otherComment,
    ]);
  }

  const csv = Papa.unparse([headers, ...rows]);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `numista_export_${timestamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Exports current inventory to CSV format
 */
const exportCsv = () => {
  debugLog('exportCsv start', inventory.length, 'items');
  const timestamp = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const headers = [
    "Metal","Name","Qty","Type","Weight(oz)","Purchase Price",
    "Spot Price ($/oz)","Premium ($/oz)","Total Premium",
    "Purchase Location","Storage Location","N#","Collectable",
    "Notes","Date"
  ];

  // Sort inventory by date (newest first) for export
  const sortedInventory = sortInventoryByDateNewestFirst();

  const rows = [];

  for (const i of sortedInventory) {
    // For collectable items, use current spot price (at time of export)
    // This ensures the value is preserved if the item is later changed back to standard
    const exportSpotPrice = i.isCollectable ? 
      spotPrices[i.metal.toLowerCase()] : 
      i.spotPriceAtPurchase;

    rows.push([
      i.metal || 'Silver',
      i.name,
      i.qty,
      i.type,
      parseFloat(i.weight).toFixed(4),
      formatCurrency(i.price),
      exportSpotPrice > 0 ? formatCurrency(exportSpotPrice) : 'N/A',
      i.isCollectable ? 'N/A' : formatCurrency(i.premiumPerOz),
      i.isCollectable ? 'N/A' : formatCurrency(i.totalPremium),
      i.purchaseLocation,
      i.storageLocation || '',
      i.numistaId || '',
      i.isCollectable ? 'Yes' : 'No',
      i.notes || '',
      i.date
    ]);
  }

  const csv = Papa.unparse([headers, ...rows]);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `metal_inventory_${timestamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  debugLog('exportCsv complete');
  if (localStorage.getItem('stackrtrackr.debug') && typeof window.showDebugModal === 'function') {
    showDebugModal();
  }
};

/**
 * Imports inventory data from JSON file
 *
 * @param {File} file - JSON file to import
 * @param {boolean} [override=false] - Replace existing inventory instead of merging
 */
const importJson = (file, override = false) => {
  const reader = new FileReader();
  debugLog('importJson start', file.name);

  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);

      // Validate data structure
      if (!Array.isArray(data)) {
        return alert("Invalid JSON format. Expected an array of inventory items.");
      }

      // Process each item
      const imported = [];
      const skippedDetails = [];
      const totalItems = data.length;
      startImportProgress(totalItems);
      let processed = 0;
      let importedCount = 0;

      for (const [index, raw] of data.entries()) {
        processed++;
        debugLog('importJson item', index + 1, JSON.stringify(raw));

        const compositionRaw = raw.composition || raw.metal || 'Silver';
        const composition = getCompositionFirstWords(compositionRaw);
        const metal = parseNumistaMetal(composition);
        const name = raw.name || '';
        const qty = parseInt(raw.qty ?? raw.quantity ?? 1, 10);
        const type = normalizeType(raw.type || raw.itemType || 'Other');
        const weight = parseFloat(raw.weight ?? raw.weightOz ?? 0);
        const priceStr = raw.price ?? raw.purchasePrice ?? 0;
        let price = typeof priceStr === 'string'
          ? parseFloat(priceStr.replace(/[^\d.-]+/g, ''))
          : parseFloat(priceStr);
        if (price < 0) price = 0;
        const purchaseLocation = raw.purchaseLocation || '';
        const storageLocation = raw.storageLocation || 'Unknown';
        const notes = raw.notes || '';
        const date = parseDate(raw.date);
        const isCollectable = raw.isCollectable === true || raw.collectable === true || raw.isCollectable === 'true' || raw.collectable === 'true';

        let spotPriceAtPurchase;
        if (raw.spotPriceAtPurchase) {
          spotPriceAtPurchase = parseFloat(raw.spotPriceAtPurchase);
        } else if (raw.spotPrice || raw.spot) {
          spotPriceAtPurchase = parseFloat(raw.spotPrice || raw.spot);
        } else {
          const metalKey = metal.toLowerCase();
          spotPriceAtPurchase = isCollectable ? 0 : spotPrices[metalKey];
        }

        let premiumPerOz = 0;
        let totalPremium = 0;
        if (!isCollectable && spotPriceAtPurchase > 0) {
          const pricePerOz = price / (weight || 1);
          premiumPerOz = pricePerOz - spotPriceAtPurchase;
          totalPremium = premiumPerOz * qty * weight;
        }

        const numistaRaw = (raw.numistaId || raw.numista || raw['N#'] || '').toString();
        const numistaMatch = numistaRaw.match(/\d+/);
        const numistaId = numistaMatch ? numistaMatch[0] : '';
        const serial = raw.serial || getNextSerial();

        const processedItem = sanitizeImportedItem({
          metal,
          composition,
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
          numistaId,
          serial
        });

        const validation = validateInventoryItem(processedItem);
        if (!validation.isValid) {
          const reason = validation.errors.join(', ');
          skippedDetails.push(`Item ${index + 1}: ${reason}`);
          updateImportProgress(processed, importedCount, totalItems);
          continue;
        }

        addCompositionOption(composition);
        imported.push(processedItem);
        importedCount++;
        updateImportProgress(processed, importedCount, totalItems);
      }

      endImportProgress();

      if (skippedDetails.length > 0) {
        alert('Skipped entries:\n' + skippedDetails.join('\n'));
      }

      if (imported.length === 0) {
        return alert("No valid items found in JSON file.");
      }

      const existingSerials = new Set(override ? [] : inventory.map(item => item.serial));
      const existingKeys = new Set(
        (override ? [] : inventory)
          .filter(item => item.numistaId)
          .map(item => `${item.numistaId}|${item.name}|${item.date}`)
      );
      const deduped = [];
      let duplicateCount = 0;

      for (const item of imported) {
        const key = item.numistaId ? `${item.numistaId}|${item.name}|${item.date}` : null;
        if (existingSerials.has(item.serial) || (key && existingKeys.has(key))) {
          duplicateCount++;
          continue;
        }
        existingSerials.add(item.serial);
        if (key) existingKeys.add(key);
        deduped.push(item);
      }

      if (duplicateCount > 0) {
        console.info(`${duplicateCount} duplicate items skipped during import.`);
      }

      if (deduped.length === 0) {
        return alert('No items to import.');
      }

      for (const item of deduped) {
        if (typeof registerName === "function") {
          registerName(item.name);
        }
      }

      if (override) {
        inventory = deduped;
      } else {
        inventory = inventory.concat(deduped);
      }

      // Synchronize all items with catalog manager
      inventory = catalogManager.syncInventory(inventory);

      saveInventory();
      renderTable();
      if (typeof renderActiveFilters === 'function') {
        renderActiveFilters();
      }
      if (typeof updateTypeSummary === 'function') {
        updateTypeSummary();
      }
      if (typeof updateStorageStats === "function") {
        updateStorageStats();
      }
      debugLog('importJson complete', deduped.length, 'items added');
      if (localStorage.getItem('stackrtrackr.debug') && typeof window.showDebugModal === 'function') {
        showDebugModal();
      }
    } catch (error) {
      endImportProgress();
      alert("Error parsing JSON file: " + error.message);
    }
  };

  reader.readAsText(file);
};

/**
 * Exports current inventory to JSON format
 */
const exportJson = () => {
  debugLog('exportJson start', inventory.length, 'items');
  const timestamp = new Date().toISOString().slice(0,10).replace(/-/g,'');

  // Sort inventory by date (newest first) for export
  const sortedInventory = sortInventoryByDateNewestFirst();

  const exportData = sortedInventory.map(item => ({
    metal: item.metal,
    name: item.name,
    numistaId: item.numistaId,
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
    serial: item.serial
  }));

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `metal_inventory_${timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  debugLog('exportJson complete');
  if (localStorage.getItem('stackrtrackr.debug') && typeof window.showDebugModal === 'function') {
    showDebugModal();
  }
};

/**
 * Exports current inventory to PDF format
 */
const exportPdf = () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Sort inventory by date (newest first) for export
  const sortedInventory = sortInventoryByDateNewestFirst();

  // Add title
  doc.setFontSize(16);
  doc.text("StackrTrackr", 14, 15);

  // Add date
  doc.setFontSize(10);
  doc.text(`Exported: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 22);

  // Prepare table data
  const tableData = sortedInventory.map(item => [
    item.metal,
    item.name,
    item.qty,
    item.type,
    parseFloat(item.weight).toFixed(2),
    formatCurrency(item.price),
    item.isCollectable ? '—' : formatCurrency(item.spotPriceAtPurchase),
    item.isCollectable ? '—' : formatCurrency(item.premiumPerOz),
    item.isCollectable ? '—' : formatCurrency(item.totalPremium),
    item.purchaseLocation,
    item.storageLocation || '',
    item.numistaId || '',
    item.notes || '',
    item.date,
    item.isCollectable ? 'Yes' : 'No'
  ]);

  // Add table
  doc.autoTable({
    head: [['Metal', 'Name', 'Qty', 'Type', 'Weight(oz)', 'Purchase Price',
            'Spot Price ($/oz)', 'Premium ($/oz)', 'Total Premium',
            'Purchase Location', 'Storage Location', 'N#', 'Notes', 'Date', 'Collectable']],
    body: tableData,
    startY: 30,
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [25, 118, 210] }
  });

  // Add totals
  const finalY = doc.lastAutoTable.finalY || 30;

  // Add totals section
  doc.setFontSize(12);
  doc.text("Totals", 14, finalY + 10);

  // Silver Totals
  doc.setFontSize(10);
  doc.text("Silver:", 14, finalY + 16);
  doc.text(`Total Items: ${elements.totals.silver.items.textContent}`, 25, finalY + 22);
  doc.text(`Total Weight: ${elements.totals.silver.weight.textContent} oz`, 25, finalY + 28);
  doc.text(`Purchase Price: ${elements.totals.silver.purchased.textContent}`, 25, finalY + 34);
  doc.text(`Melt Value: ${elements.totals.silver.value.textContent}`, 25, finalY + 40);

  // Gold Totals
  doc.text("Gold:", 100, finalY + 16);
  doc.text(`Total Items: ${elements.totals.gold.items.textContent}`, 111, finalY + 22);
  doc.text(`Total Weight: ${elements.totals.gold.weight.textContent} oz`, 111, finalY + 28);
  doc.text(`Purchase Price: ${elements.totals.gold.purchased.textContent}`, 111, finalY + 34);
  doc.text(`Melt Value: ${elements.totals.gold.value.textContent}`, 111, finalY + 40);

  // Platinum Totals
  doc.text("Platinum:", 14, finalY + 46);
  doc.text(`Total Items: ${elements.totals.platinum.items.textContent}`, 25, finalY + 52);
  doc.text(`Total Weight: ${elements.totals.platinum.weight.textContent} oz`, 25, finalY + 58);
  doc.text(`Purchase Price: ${elements.totals.platinum.purchased.textContent}`, 25, finalY + 64);
  doc.text(`Melt Value: ${elements.totals.platinum.value.textContent}`, 25, finalY + 70);

  // Palladium Totals
  doc.text("Palladium:", 100, finalY + 46);
  doc.text(`Total Items: ${elements.totals.palladium.items.textContent}`, 111, finalY + 52);
  doc.text(`Total Weight: ${elements.totals.palladium.weight.textContent} oz`, 111, finalY + 58);
  doc.text(`Purchase Price: ${elements.totals.palladium.purchased.textContent}`, 111, finalY + 64);
  doc.text(`Melt Value: ${elements.totals.palladium.value.textContent}`, 111, finalY + 70);

  // All Totals (only if elements exist)
  if (elements.totals.all.items.textContent !== undefined) {
    doc.setFontSize(11);
    doc.text("All Metals:", 14, finalY + 76);
    doc.text(`Total Items: ${elements.totals.all.items.textContent}`, 25, finalY + 82);
    doc.text(`Total Weight: ${elements.totals.all.weight.textContent} oz`, 25, finalY + 88);
    doc.text(`Purchase Price: ${elements.totals.all.purchased.textContent}`, 25, finalY + 94);
    doc.text(`Melt Value: ${elements.totals.all.value.textContent}`, 25, finalY + 100);
  }

  // Save PDF
  doc.save(`metal_inventory_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.pdf`);
};
// =============================================================================
// Expose inventory actions globally for inline event handlers
window.importCsv = importCsv;
window.exportCsv = exportCsv;
window.importJson = importJson;
window.exportJson = exportJson;
window.exportPdf = exportPdf;
window.updateSummary = updateSummary;
window.toggleCollectable = toggleCollectable;
window.togglePriceView = togglePriceView;
window.toggleGlobalPriceView = toggleGlobalPriceView;
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

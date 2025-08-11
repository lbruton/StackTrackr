// INVENTORY FUNCTIONS
/**
 * Creates a comprehensive backup ZIP file containing all application data
 * 
 * This function generates a complete backup archive including:
 * - Current inventory data in JSON format
 * - All export formats (CSV, Excel, HTML)
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
        totalPremium: item.totalPremium
      }))
    };
    zip.file('inventory_data.json', JSON.stringify(inventoryData, null, 2));

    // 2. Add current spot prices and settings
    const settings = {
      version: APP_VERSION,
      exportDate: new Date().toISOString(),
      spotPrices: spotPrices,
      theme: localStorage.getItem(THEME_KEY) || 'light',
      itemsPerPage: itemsPerPage,
      currentPage: currentPage,
      searchQuery: searchQuery,
      sortColumn: sortColumn,
      sortDirection: sortDirection
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
    const csvHeaders = ["Metal", "Name", "Qty", "Type", "Weight(oz)", "Purchase Price", "Spot Price ($/oz)", "Premium ($/oz)", "Total Premium", "Purchase Location", "Storage Location", "Notes", "Date", "Collectable"];
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
        formatDollar(item.price),
        exportSpotPrice > 0 ? formatDollar(exportSpotPrice) : 'N/A',
        item.isCollectable ? 'N/A' : formatDollar(item.premiumPerOz),
        item.isCollectable ? 'N/A' : formatDollar(item.totalPremium),
        item.purchaseLocation,
        item.storageLocation || '',
        item.notes || '',
        item.date,
        item.isCollectable ? 'Yes' : 'No'
      ]);
    }
    const csvContent = Papa.unparse([csvHeaders, ...csvRows]);
    zip.file('inventory_export.csv', csvContent);

    // 5. Generate and add Excel export
    const wsData = [csvHeaders];
    for (const item of sortedInventory) {
      const exportSpotPrice = item.isCollectable ? 
        spotPrices[item.metal.toLowerCase()] : 
        item.spotPriceAtPurchase;
      wsData.push([
        item.metal || 'Silver',
        item.name,
        item.qty,
        item.type,
        parseFloat(item.weight).toFixed(4),
        item.price,
        exportSpotPrice,
        item.isCollectable ? null : item.premiumPerOz,
        item.isCollectable ? null : item.totalPremium,
        item.purchaseLocation,
        item.storageLocation || '',
        item.notes || '',
        item.date,
        item.isCollectable ? 'Yes' : 'No'
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    zip.file('inventory_export.xlsx', excelBuffer);

    // 6. Generate and add HTML export (simplified version)
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
        isCollectable: item.isCollectable
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
  <title>StackTrackr Backup</title>
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
  <h1>StackTrackr Backup</h1>
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
          <td>${getCompositionFirstWord(item.composition || item.metal)}</td>
          <td>${item.name}</td>
          <td>${item.qty}</td>
          <td>${item.type}</td>
          <td>${parseFloat(item.weight).toFixed(2)}</td>
          <td>${formatDollar(item.price)}</td>
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
   - Compatible with Excel, Google Sheets

5. inventory_export.xlsx
   - Excel format export with proper formatting
   - Preserves data types and calculations
   - Professional presentation ready

6. inventory_report.html
   - Self-contained web page report
   - No external dependencies required
   - Print-friendly format

7. sample_data.json (if applicable)
   - Sample of inventory items for reference
   - Useful for testing import functionality
   - Demonstrates data structure

8. README.txt (this file)
   - Backup contents explanation
   - Restoration instructions

RESTORATION INSTRUCTIONS:
------------------------

1. For complete restoration:
   - Import inventory_data.json using the application's JSON import feature
   - Manually configure spot prices from settings.json if needed

2. For partial restoration:
   - Use inventory_export.csv for spreadsheet applications
   - Use inventory_export.xlsx for Excel compatibility
   - View inventory_report.html in any web browser

3. For data analysis:
   - All files contain the same core data in different formats
   - Choose the format best suited for your analysis tools

SUPPORT:
--------

For questions about this backup or the StackTrackr application:
- Check the application documentation
- Verify file integrity before restoration
- Test imports with sample data first

This backup contains your complete precious metals inventory as of ${timeFormatted}.
Store this archive in a secure location for data protection.

--- End of README ---`;
};

// =============================================================================

let catalogMap = loadData(CATALOG_MAP_KEY, {});
window.catalogMap = catalogMap;

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
  saveData(CATALOG_MAP_KEY, catalogMap);
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
 * 
 * @example
 * // Called during app initialization to restore saved data
 * loadInventory();
 * console.log(inventory); // Array of properly formatted inventory items
 */
const loadInventory = () => {
  const data = loadData(LS_KEY, []);
  // Migrate legacy data to include new fields
  inventory = data.map(item => {
    // Handle legacy data that might not have all fields
    if (item.premiumPerOz === undefined) {
      // For legacy items, calculate premium if possible
      const metalConfig = Object.values(METALS).find(m => m.name === item.metal) || METALS.SILVER;
      const spotPrice = spotPrices[metalConfig.key];

      const premiumPerOz = spotPrice > 0 ? (item.price / item.weight) - spotPrice : 0;
      const totalPremium = premiumPerOz * item.qty * item.weight;

      return {
        ...item,
        purchaseLocation: item.purchaseLocation || "Unknown",
        storageLocation: item.storageLocation || "Unknown",
        notes: item.notes || "",
        spotPriceAtPurchase: spotPrice,
        premiumPerOz,
        totalPremium,
        isCollectable: item.isCollectable !== undefined ? item.isCollectable : false,
        composition: item.composition || item.metal || ""
      };
    }
    // Ensure all items have required properties
    return {
      ...item,
      storageLocation: item.storageLocation || "Unknown",
      notes: item.notes || "",
      isCollectable: item.isCollectable !== undefined ? item.isCollectable : false,
      composition: item.composition || item.metal || ""
    };
  });

  let serialCounter = parseInt(localStorage.getItem(SERIAL_KEY) || '0', 10);
  inventory.forEach(item => {
    if (!item.serial) {
      serialCounter += 1;
      item.serial = serialCounter;
    }
    item.numistaId = item.numistaId || catalogMap[item.serial] || "";
    catalogMap[item.serial] = item.numistaId;
  });
  localStorage.setItem(SERIAL_KEY, serialCounter);
  saveData(CATALOG_MAP_KEY, catalogMap);
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
 * 
 * @example
 * // Refresh table after adding new item
 * inventory.push(newItem);
 * renderTable();
 * 
 * // Update display after search
 * searchQuery = 'silver';
 * renderTable();
 */
const METAL_COLORS = {
  Silver: 'var(--silver)',
  Gold: 'var(--gold)',
  Platinum: 'var(--platinum)',
  Palladium: 'var(--palladium)'
};

const typeColors = {};
const purchaseLocationColors = {};
const storageLocationColors = {};

const getColor = (map, key) => {
  if (!map[key]) {
    map[key] = (Object.keys(map).length * 137) % 360; // distribute hues using golden angle
  }
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const lightness = isDark ? 65 : 35;
  return `hsl(${map[key]}, 70%, ${lightness}%)`;
};

const filterLink = (field, value, color) => {
  const handler = `applyColumnFilter('${field}', ${JSON.stringify(value)})`;
  // Escape double quotes for safe inline handler usage
  const escaped = handler.replace(/"/g, '&quot;');
  const safe = sanitizeHtml(value);
  return `<span class="filter-text" style="color: ${color};" onclick="${escaped}" tabindex="0" role="button" onkeydown="if(event.key==='Enter'||event.key===' ')${escaped}" title="Filter by ${safe}">${safe}</span>`;
};

const getTypeColor = type => getColor(typeColors, type);
const getPurchaseLocationColor = loc => getColor(purchaseLocationColors, loc);
const getStorageLocationColor = loc => getColor(storageLocationColors, loc);


const renderTable = () => {
  return monitorPerformance(() => {
    const filteredInventory = filterInventory();

    // Automatically adjust items-per-page dropdown when filtered results
    // are fewer than the currently selected page length. This ensures the
    // table length always displays a sensible value (minimum of the smallest
    // dropdown option) while still allowing larger result sets to use
    // pagination.
    if (filteredInventory.length < itemsPerPage && elements.itemsPerPage) {
      const options = Array.from(elements.itemsPerPage.options).map(o => parseInt(o.value));
      const minOption = Math.min(...options);
      const target = Math.max(filteredInventory.length, minOption);
      const newValue = options.find(opt => opt >= target) || options[options.length - 1];
      if (newValue !== itemsPerPage) {
        itemsPerPage = newValue;
        elements.itemsPerPage.value = String(newValue);
        currentPage = 1;
      }
    }

    const sortedInventory = sortInventory(filteredInventory);
    const totalPages = calculateTotalPages(sortedInventory);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, sortedInventory.length);

    const rows = [];

    for (let i = startIndex; i < endIndex; i++) {
      const item = sortedInventory[i];
      const originalIdx = inventory.indexOf(item);

      rows.push(`
      <tr>
      <td class="shrink" data-column="date">${formatDisplayDate(item.date)}</td>
      <td class="shrink" data-column="type">${filterLink('type', item.type, getTypeColor(item.type))}</td>
      <td class="shrink" data-column="composition">${filterLink('composition', getCompositionFirstWord(item.composition || item.metal || 'Silver'), METAL_COLORS[item.metal] || 'var(--primary)')}</td>
      <td class="clickable-name expand" data-column="name" onclick="editItem(${originalIdx})" title="Click to edit" tabindex="0" role="button" aria-label="Edit ${sanitizeHtml(item.name)}" onkeydown="if(event.key==='Enter'||event.key===' ')editItem(${originalIdx})">${sanitizeHtml(item.name)}</td>
      <td class="shrink" data-column="qty">${item.qty}</td>
      <td class="shrink" data-column="weight">${parseFloat(item.weight).toFixed(2)}</td>
      <td class="shrink" data-column="purchasePrice">${formatDollar(item.price)}</td>
      <td class="shrink" data-column="spot">${item.isCollectable ? 'N/A' : (item.spotPriceAtPurchase > 0 ? formatDollar(item.spotPriceAtPurchase) : 'N/A')}</td>
      <td class="shrink" data-column="premium" style="color: ${item.isCollectable ? 'var(--text-muted)' : (item.totalPremium > 0 ? 'var(--warning)' : 'inherit')}">${item.isCollectable ? 'N/A' : formatDollar(item.totalPremium)}</td>
      <td class="shrink" data-column="purchaseLocation">${filterLink('purchaseLocation', item.purchaseLocation, getPurchaseLocationColor(item.purchaseLocation))}</td>
      <td class="shrink" data-column="storageLocation">${item.storageLocation ? filterLink('storageLocation', item.storageLocation, getStorageLocationColor(item.storageLocation)) : ''}</td>
      <td class="shrink" data-column="collectable"><button type="button" class="btn action-btn collectable-btn ${item.isCollectable ? 'success' : ''}" onclick="toggleCollectable(${originalIdx})" aria-label="Toggle collectable status for ${sanitizeHtml(item.name)}" title="Toggle collectable status">${item.isCollectable ? 'Yes' : 'No'}</button></td>
      <td class="shrink" data-column="notes"><button type="button" class="btn action-btn notes-btn ${item.notes && item.notes.trim() ? 'success' : ''}" onclick="showNotes(${originalIdx})" aria-label="View notes" title="View notes">${item.notes && item.notes.trim() ? 'Yes' : 'No'}</button></td>
      <td class="shrink" data-column="delete"><button class="btn action-btn danger" onclick="deleteItem(${originalIdx})" aria-label="Delete item" title="Delete item">Delete</button></td>
      </tr>
      `);
    }

    const visibleCount = endIndex - startIndex;
    const placeholders = Array.from(
      { length: Math.max(0, itemsPerPage - visibleCount) },
      () => '<tr><td class="shrink" colspan="14">&nbsp;</td></tr>'
    );

    elements.inventoryTable.innerHTML = rows.concat(placeholders).join('');

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
 * 
 * This comprehensive function:
 * - Processes entire inventory to calculate metal-specific totals
 * - Handles collectable vs non-collectable item calculations separately
 * - Updates DOM elements for all metal types (Silver, Gold, Platinum, Palladium)
 * - Calculates weighted averages for prices and premiums
 * - Formats currency and profit/loss values with appropriate styling
 * - Handles edge cases like division by zero and missing data
 * 
 * Key calculations performed:
 * - Total items, weight, purchase price, current value
 * - Average prices per ounce (overall, collectable, non-collectable)
 * - Premium analysis and profit/loss calculations
 * - Current market value based on spot prices
 * 
 * @returns {void} Updates DOM elements in totals cards and summary sections
 * 
 * @example
 * // Recalculate totals after inventory change
 * inventory[0].price = 150.00;
 * saveInventory();
 * updateSummary(); // Refreshes all totals displays
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
        totalItems += Number(item.qty);

        // Total Weight calculation (for both regular and collectible items)
        const itemWeight = Number(item.qty) * parseFloat(item.weight);
        totalWeight += itemWeight;

        // Melt Value calculation
        if (item.isCollectable) {
          // For collectible items: Melt Value = Current spot price × weight
          const currentSpot = spotPrices[item.metal.toLowerCase()];
          currentSpotValue += currentSpot * itemWeight;

          // Track collectable metrics
          collectableWeight += itemWeight;
          collectableValue += Number(item.qty) * parseFloat(item.price);
        } else {
          // For regular items: Melt Value = Weight × Current Spot Price
          const currentSpot = spotPrices[item.metal.toLowerCase()];
          currentSpotValue += currentSpot * itemWeight;

          // Track non-collectable metrics
          nonCollectableWeight += itemWeight;
          nonCollectableValue += Number(item.qty) * parseFloat(item.price);
        }

        // Total Purchase Price calculation (for both regular and collectible items)
        totalPurchased += Number(item.qty) * parseFloat(item.price);

        // Premium Paid calculation
        if (!item.isCollectable) {
          // For regular items: Premium Paid = (Purchase Price per oz - Spot Price at Purchase) × Weight
          const pricePerOz = item.price / item.weight;
          const premiumPerOz = pricePerOz - item.spotPriceAtPurchase;
          totalPremium += premiumPerOz * itemWeight;
        }
        // For collectible items: Premium Paid = N/A

        // Loss/Profit calculation
        if (!item.isCollectable) {
          // For regular items: Loss/Profit = Melt Value - Purchase Price
          const currentSpot = spotPrices[item.metal.toLowerCase()];
          const currentValue = currentSpot * itemWeight;
          const purchaseValue = item.price * item.qty;
          lossProfit += currentValue - purchaseValue;
        }
        // For collectible items: Loss/Profit = Omitted from calculation
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
    elements.totals[metalKey].value.innerHTML = formatDollar(totals.currentSpotValue);
    elements.totals[metalKey].purchased.innerHTML = formatDollar(totals.totalPurchased);
    elements.totals[metalKey].premium.innerHTML = formatDollar(totals.totalPremium);
    elements.totals[metalKey].lossProfit.innerHTML = formatLossProfit(totals.lossProfit);
    elements.totals[metalKey].avgPrice.innerHTML = formatDollar(totals.avgPrice);
    elements.totals[metalKey].avgPremium.innerHTML = formatDollar(totals.avgPremium);
    // Add the new collectable/non-collectable averages
    elements.totals[metalKey].avgCollectablePrice.innerHTML = formatDollar(totals.avgCollectablePrice);
    elements.totals[metalKey].avgNonCollectablePrice.innerHTML = formatDollar(totals.avgNonCollectablePrice);
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
    elements.totals.all.value.innerHTML = formatDollar(allTotals.currentSpotValue);
    elements.totals.all.purchased.innerHTML = formatDollar(allTotals.totalPurchased);
    elements.totals.all.premium.innerHTML = formatDollar(allTotals.totalPremium);
    elements.totals.all.lossProfit.innerHTML = formatLossProfit(allTotals.lossProfit);
    elements.totals.all.avgPrice.innerHTML = formatDollar(allTotals.totalPurchased / allTotals.totalWeight || 0);
    elements.totals.all.avgPremium.innerHTML = formatDollar(allTotals.totalPremium / allTotals.totalWeight || 0);
    elements.totals.all.avgCollectablePrice.innerHTML = formatDollar(avgCollectablePriceAll);
    elements.totals.all.avgNonCollectablePrice.innerHTML = formatDollar(avgNonCollectablePriceAll);
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
    modalElement.style.display = 'flex';
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
  elements.editWeight.value = parseFloat(item.weight).toFixed(2);
  elements.editPrice.value = item.price;
  elements.editPurchaseLocation.value = item.purchaseLocation;
  elements.editStorageLocation.value = item.storageLocation || '';
  
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
  elements.editModal.style.display = 'flex';
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

  saveInventory();
  renderTable();
  logItemChanges(oldItem, item);
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
 * This function:
 * - Uses PapaParse library for robust CSV parsing
 * - Maps CSV columns to inventory object properties
 * - Validates data types and required fields
 * - Handles various date formats automatically
 * - Calculates premiums and totals for imported items
 * - Provides user feedback on import success/failure
 * - Offers replacement or append options (currently replacement only)
 * 
 * Supported CSV columns:
 * - Metal, Name, Qty, Type, Weight(oz), Purchase Price
 * - Purchase Location, Storage Location, Date, Collectable
 * - Spot Price ($/oz) for historical premium calculations
 * 
 * @param {File} file - CSV file selected by user through file input
 * @param {boolean} [override=false] - Replace existing inventory instead of merging
 * @returns {void} Updates inventory array if import successful
 * 
 * @example
 * // Typically called from file input change event
 * const fileInput = document.getElementById('importCsvFile');
 * fileInput.addEventListener('change', (e) => {
 *   if (e.target.files.length > 0) {
 *     importCsv(e.target.files[0]);
 *   }
 * });
 */
const importCsv = (file, override = false) => {
  try {
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
          const compositionRaw = row['Composition'] || row['Metal'] || 'Silver';
          const composition = getCompositionFirstWord(compositionRaw);
          const metal = parseNumistaMetal(composition);
          const name = row['Name'] || row['name'];
          const qty = row['Qty'] || row['qty'] || 1;
          const type = row['Type'] || row['type'] || 'Other';
          const weight = row['Weight(oz)'] || row['weight'];
          const priceStr = row['Purchase Price'] || row['price'];
          let price = typeof priceStr === 'string'
            ? parseFloat(priceStr.replace(/[^\d.-]+/g, ''))
            : parseFloat(priceStr);
          if (price < 0) price = 0;
          const purchaseLocation = row['Purchase Location'] || 'Unknown';
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
            isCollectable
          });

          imported.push(item);
          importedCount++;
          updateImportProgress(processed, importedCount, totalRows);
        }

        endImportProgress();

        if (imported.length === 0) return alert('No items to import.');

        if (override) {
          inventory = imported;
        } else {
          inventory = inventory.concat(imported);
        }

        saveInventory();
        renderTable();
        if (typeof updateStorageStats === 'function') {
          updateStorageStats();
        }

        this.value = '';
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
 * Stores the raw Numista CSV in localStorage and maps fields to StackTrackr structure:
 * - N# number → numistaId (hidden)
 * - Title (+ Year) → name; also stores issuedYear
 * - Type → mapped via mapNumistaType()
 * - Weight columns → max value converted from grams to ozt
 * - Composition → metal detected via parseNumistaMetal(), defaults to Alloy
 * - Buying price (currency) → price in USD via convertToUsd()
 * - Storage location / Acquisition place → defaults to "unknown" if blank
 * - Acquisition date → parsed YYYY-MM-DD or today if blank
 * - Notes appended with import source reference
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
        localStorage.setItem(NUMISTA_RAW_KEY, csvText);
        const storedCsv = localStorage.getItem(NUMISTA_RAW_KEY) || "";
        const results = Papa.parse(storedCsv, { header: true, skipEmptyLines: true });
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

          const numistaId = (getValue(row, ['N# number', 'Numista #', 'Numista number', 'Numista id']) || '').toString().trim();
          const title = (getValue(row, ['Title', 'Name']) || '').trim();
          const year = (getValue(row, ['Year', 'Date']) || '').trim();
          const name = year.length >= 4 ? `${title} ${year}`.trim() : title;
          const issuedYear = year.length >= 4 ? year : '';
          const compositionRaw = getValue(row, ['Composition', 'Metal']) || '';
          const composition = getCompositionFirstWord(compositionRaw);

          addCompositionOption(composition);

          let metal = parseNumistaMetal(composition);
          const qty = parseInt(getValue(row, ['Quantity', 'Qty', 'Quantity owned']) || 1, 10);

          let type = mapNumistaType(getValue(row, ['Type']) || '');
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

          const priceKey = Object.keys(row).find(k => /^(buying price|purchase price|price paid)/i.test(k));
          let purchasePrice = 0;
          if (priceKey) {
            const currencyMatch = priceKey.match(/\(([^)]+)\)/);
            const currency = currencyMatch ? currencyMatch[1] : 'USD';
            const amount = parseFloat(String(row[priceKey]).replace(/[^0-9.\-]/g, ''));
            purchasePrice = convertToUsd(amount, currency);
          }

          const purchaseLocRaw = getValue(row, ['Acquisition place', 'Acquired from', 'Purchase place']);
          const purchaseLocation = purchaseLocRaw && purchaseLocRaw.trim() ? purchaseLocRaw.trim() : 'unknown';
          const storageLocRaw = getValue(row, ['Storage location', 'Stored at', 'Storage place']);
          const storageLocation = storageLocRaw && storageLocRaw.trim() ? storageLocRaw.trim() : '';

          const dateStrRaw = getValue(row, ['Acquisition date', 'Date acquired', 'Date']);
          const dateStr = dateStrRaw && dateStrRaw.trim() ? dateStrRaw.trim() : todayStr();
          const date = parseDate(dateStr);

          const baseNote = (getValue(row, ['Note', 'Notes']) || '').trim();
          const notes = `${baseNote ? baseNote + ' ' : ''}(Imported from Numista.com N#${numistaId})`;

          const isCollectable = true;
          const spotPriceAtPurchase = 0;
          const premiumPerOz = 0;
          const totalPremium = 0;

          const item = sanitizeImportedItem({
            metal,
            composition,
            name,
            qty,
            type,
            weight,
            price: purchasePrice,
            purchasePrice,
            date,
            purchaseLocation,
            storageLocation,
            notes,
            spotPriceAtPurchase,
            premiumPerOz,
            totalPremium,
            isCollectable,
            numistaId,
            issuedYear
          });

          imported.push(item);
          importedCount++;
          updateImportProgress(processed, importedCount, totalRows);
        }

        endImportProgress();

        if (imported.length === 0) return alert('No items to import.');

        if (override) {
          inventory = imported;
        } else {
          inventory = inventory.concat(imported);
        }

        saveInventory();
        renderTable();
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
 * Exports current inventory to CSV format
 */
const exportCsv = () => {
  const timestamp = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const headers = ["Metal","Name","Qty","Type","Weight(oz)","Purchase Price","Spot Price ($/oz)","Premium ($/oz)","Total Premium","Purchase Location","Storage Location","Notes","Date","Collectable"];

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
      formatDollar(i.price),
      exportSpotPrice > 0 ? formatDollar(exportSpotPrice) : 'N/A',
      i.isCollectable ? 'N/A' : formatDollar(i.premiumPerOz),
      i.isCollectable ? 'N/A' : formatDollar(i.totalPremium),
      i.purchaseLocation,
      i.storageLocation || '',
      i.notes || '',
      i.date,
      i.isCollectable ? 'Yes' : 'No'
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
};

/**
 * Imports inventory data from JSON file
 * 
 * @param {File} file - JSON file to import
 */
const importJson = (file) => {
  const reader = new FileReader();

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

      for (const [index, item] of data.entries()) {
        processed++;

        // Ensure required fields with defaults
        let price = parseFloat(item.price);
        if (price < 0) price = 0;

        const processedItem = {
          metal: item.metal || 'Silver',
          name: item.name,
          qty: parseInt(item.qty, 10),
          type: item.type || 'Other',
          weight: parseFloat(item.weight),
          price,
          date: parseDate(item.date || todayStr()),
          purchaseLocation: item.purchaseLocation || "Unknown",
          storageLocation: item.storageLocation || "Unknown",
          notes: item.notes || "",
          spotPriceAtPurchase: item.spotPriceAtPurchase || spotPrices[item.metal.toLowerCase()],
          isCollectable: item.isCollectable === true,
          premiumPerOz: item.premiumPerOz || 0,
          totalPremium: item.totalPremium || 0
        };

        // Recalculate premium if needed
        if (!processedItem.isCollectable && processedItem.spotPriceAtPurchase > 0) {
          const pricePerOz = processedItem.price / processedItem.weight;
          processedItem.premiumPerOz = pricePerOz - processedItem.spotPriceAtPurchase;
          processedItem.totalPremium = processedItem.premiumPerOz * processedItem.qty * processedItem.weight;
        }

        // Validate the item
        const validation = validateInventoryItem(processedItem);
        if (!validation.isValid) {
          const reason = validation.errors.join(', ');
          skippedDetails.push(`Item ${index + 1}: ${reason}`);
          updateImportProgress(processed, importedCount, totalItems);
          continue;
        }

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

      let msg = `Import ${imported.length} items?`;
      if (skippedDetails.length > 0) {
        msg += `\n(${skippedDetails.length} invalid items skipped)`;
      }

      if (confirm(msg)) {
        inventory = imported;
        saveInventory();
        renderTable();
        if (typeof updateStorageStats === "function") {
          updateStorageStats();
        }
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
  const timestamp = new Date().toISOString().slice(0,10).replace(/-/g,'');

  // Sort inventory by date (newest first) for export
  const sortedInventory = sortInventoryByDateNewestFirst();

  const exportData = sortedInventory.map(item => ({
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
    spotPriceAtPurchase: item.spotPriceAtPurchase,
    isCollectable: item.isCollectable,
    premiumPerOz: item.premiumPerOz,
    totalPremium: item.totalPremium
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
};

/**
 * Imports inventory data from Excel file
 * 
 * @param {File} file - Excel file to import
 */
const importExcel = (file) => {
  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      // Get first sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Process data
      const imported = [];
      const skippedDetails = [];
      const totalRows = jsonData.length;
      startImportProgress(totalRows);
      let processed = 0;
      let importedCount = 0;

      for (const [index, row] of jsonData.entries()) {
        processed++;
        const metal = row['Metal'] || 'Silver';
        const name = row['Name'] || row['name'];
        const qty = parseInt(row['Qty'] || row['qty'] || 1, 10);
        const type = row['Type'] || row['type'] || 'Other';
        const weight = parseFloat(row['Weight(oz)'] || row['weight']);
        const priceStr = row['Purchase Price'] || row['price'];
        let price = parseFloat(
          typeof priceStr === "string" ? priceStr.replace(/[^0-9.-]+/g, "") : priceStr
        );
        if (price < 0) price = 0;
        const purchaseLocation = row['Purchase Location'] || "Unknown";
        const storageLocation = row['Storage Location'] || "Unknown";
        const notes = row['Notes'] || "";
        const date = parseDate(row['Date']); // Using the new date parser

        // Get collectable status
        const isCollectable = row['Collectable'] === 'Yes' || row['Collectable'] === 'true' || row['isCollectable'] === 'true';

        // Get spot price from Excel if available
        let spotPriceAtPurchase;
        if (row['Spot Price ($/oz)']) {
          // Extract numeric value from formatted string like "$1,234.56"
          const spotStr = row['Spot Price ($/oz)'].toString();
          spotPriceAtPurchase = parseFloat(spotStr.replace(/[^0-9.-]+/g, ""));
        } else if (row['spotPriceAtPurchase']) {
          spotPriceAtPurchase = parseFloat(row['spotPriceAtPurchase']);
        } else {
          // Fall back to current spot price if not in Excel and not collectable
          const metalKey = metal.toLowerCase();
          spotPriceAtPurchase = isCollectable ? 0 : spotPrices[metalKey];
        }

        // Calculate premium per ounce (only for non-collectible items)
        let premiumPerOz = 0;
        let totalPremium = 0;

        if (!isCollectable) {
          const pricePerOz = price / weight;
          premiumPerOz = pricePerOz - spotPriceAtPurchase;
          totalPremium = premiumPerOz * qty * weight;
        }

        const itemToValidate = {
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
          isCollectable
        };

        const validation = validateInventoryItem(itemToValidate);
        if (!validation.isValid) {
          const reason = validation.errors.join(', ');
          skippedDetails.push(`Row ${index + 2}: ${reason}`);
          updateImportProgress(processed, importedCount, totalRows);
          continue;
        }

        imported.push(itemToValidate);
        importedCount++;
        updateImportProgress(processed, importedCount, totalRows);
      }

      endImportProgress();

      if (skippedDetails.length > 0) {
        alert('Skipped entries:\n' + skippedDetails.join('\n'));
      }

      if (imported.length === 0) return alert("No valid items to import.");

      let msg = "Replace current inventory with imported file?";
      if (skippedDetails.length > 0) msg += `\n(${skippedDetails.length} rows skipped)`;

      if (confirm(msg)) {
        inventory = imported;
        saveInventory();
        renderTable();
        if (typeof updateStorageStats === "function") {
          updateStorageStats();
        }
      }
    } catch (error) {
      endImportProgress();
      alert("Error importing Excel file: " + error.message);
    }
  };

  reader.readAsArrayBuffer(file);
};

/**
 * Exports current inventory to Excel format
 */
const exportExcel = () => {
  const timestamp = new Date().toISOString().slice(0,10).replace(/-/g,'');

  // Sort inventory by date (newest first) for export
  const sortedInventory = sortInventoryByDateNewestFirst();

  // Create worksheet data
  const wsData = [
    ["Metal", "Name", "Qty", "Type", "Weight(oz)", "Purchase Price", "Spot Price ($/oz)", 
     "Premium ($/oz)", "Total Premium", "Purchase Location", "Storage Location", "Notes", "Date", "Collectable"]
  ];

  for (const i of sortedInventory) {
    // For collectable items, use current spot price (at time of export)
    const exportSpotPrice = i.isCollectable ? 
      spotPrices[i.metal.toLowerCase()] : 
      i.spotPriceAtPurchase;

    wsData.push([
      i.metal || 'Silver',
      i.name,
      i.qty,
      i.type,
      parseFloat(i.weight).toFixed(4),
      i.price,
      exportSpotPrice,
      i.isCollectable ? null : i.premiumPerOz,
      i.isCollectable ? null : i.totalPremium,
      i.purchaseLocation,
      i.storageLocation || '',
      i.notes || '',
      i.date,
      i.isCollectable ? 'Yes' : 'No'
    ]);
  }

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");

  // Export
  XLSX.writeFile(wb, `metal_inventory_${timestamp}.xlsx`);
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
  doc.text("StackTrackr", 14, 15);

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
    formatDollar(item.price),
    item.isCollectable ? 'N/A' : formatDollar(item.spotPriceAtPurchase),
    item.isCollectable ? 'N/A' : formatDollar(item.premiumPerOz),
    item.isCollectable ? 'N/A' : formatDollar(item.totalPremium),
    item.purchaseLocation,
    item.storageLocation || '',
    item.notes || '',
    item.date,
    item.isCollectable ? 'Yes' : 'No'
  ]);

  // Add table
  doc.autoTable({
    head: [['Metal', 'Name', 'Qty', 'Type', 'Weight(oz)', 'Purchase Price', 
            'Spot Price ($/oz)', 'Premium ($/oz)', 'Total Premium', 
            'Purchase Location', 'Storage Location', 'Notes', 'Date', 'Collectable']],
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
window.toggleCollectable = toggleCollectable;
window.editItem = editItem;
window.deleteItem = deleteItem;
window.showNotes = showNotes;
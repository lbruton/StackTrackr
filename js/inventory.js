// INVENTORY FUNCTIONS

/** Blob URLs created by _enhanceTableThumbnails — revoked on each re-render */
let _thumbBlobUrls = [];
window.addEventListener('beforeunload', () => {
  for (const url of _thumbBlobUrls) {
    try { URL.revokeObjectURL(url); } catch { /* ignore */ }
  }
});
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
    const timeFormatted = typeof formatTimestamp === 'function' ? formatTimestamp(new Date()) : new Date().toLocaleString();

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
        weightUnit: item.weightUnit || 'oz',
        purity: item.purity || 1.0,
        price: item.price,
        date: item.date,
        purchaseLocation: item.purchaseLocation,
        storageLocation: item.storageLocation,
        notes: item.notes,
        spotPriceAtPurchase: item.spotPriceAtPurchase,
        isCollectable: item.isCollectable,
        premiumPerOz: item.premiumPerOz,
        totalPremium: item.totalPremium,
        marketValue: item.marketValue || 0,
        numistaId: item.numistaId,
        year: item.year || '',
        grade: item.grade || '',
        gradingAuthority: item.gradingAuthority || '',
        certNumber: item.certNumber || '',
        serialNumber: item.serialNumber || '',
        pcgsNumber: item.pcgsNumber || '',
        pcgsVerified: item.pcgsVerified || false,
        serial: item.serial,
        uuid: item.uuid,
        obverseImageUrl: item.obverseImageUrl || '',
        reverseImageUrl: item.reverseImageUrl || ''
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
      searchQuery: searchQuery,
      sortColumn: sortColumn,
      sortDirection: sortDirection,
      // Add catalog mappings to settings for backup
      catalogMappings: catalogManager.exportMappings(),
      // Chip grouping settings (v3.16.00+)
      chipCustomGroups: loadDataSync('chipCustomGroups', []),
      chipBlacklist: loadDataSync('chipBlacklist', []),
      chipMinCount: localStorage.getItem('chipMinCount'),
      featureFlags: localStorage.getItem(FEATURE_FLAGS_KEY),
      // Inline chip config (v3.17.00+)
      inlineChipConfig: localStorage.getItem('inlineChipConfig'),
      // Goldback denomination pricing (STACK-45)
      goldbackPrices: goldbackPrices,
      goldbackPriceHistory: goldbackPriceHistory,
      goldbackEnabled: goldbackEnabled,
      goldbackEstimateEnabled: goldbackEstimateEnabled,
      goldbackEstimateModifier: goldbackEstimateModifier,
      tableImageSides: localStorage.getItem('tableImageSides') || 'both',
      tableImagesEnabled: localStorage.getItem('tableImagesEnabled') !== 'false'
    };
    zip.file('settings.json', JSON.stringify(settings, null, 2));

    // 3. Add spot price history
    const spotHistoryData = {
      version: APP_VERSION,
      exportDate: new Date().toISOString(),
      history: spotHistory
    };
    zip.file('spot_price_history.json', JSON.stringify(spotHistoryData, null, 2));

    // 3b. Add per-item price history (STACK-43)
    const itemPriceHistoryData = {
      version: APP_VERSION,
      exportDate: new Date().toISOString(),
      history: itemPriceHistory
    };
    zip.file('item_price_history.json', JSON.stringify(itemPriceHistoryData, null, 2));

    // 4. Generate and add CSV export (portfolio format)
    const csvHeaders = [
      "Date", "Metal", "Type", "Name", "Qty", "Weight(oz)", "Weight Unit", "Purity",
      "Purchase Price", "Melt Value", "Retail Price", "Gain/Loss",
      "Purchase Location", "N#", "PCGS #", "Serial Number", "Notes"
    ];
    const sortedInventory = sortInventoryByDateNewestFirst();
    const csvRows = [];
    for (const item of sortedInventory) {
      const currentSpot = spotPrices[item.metal.toLowerCase()] || 0;
      const qty = Number(item.qty) || 1;
      const meltValue = computeMeltValue(item, currentSpot);
      const gbDenomPrice = (typeof getGoldbackRetailPrice === 'function') ? getGoldbackRetailPrice(item) : null;
      const marketValue = parseFloat(item.marketValue) || 0;
      const isManualRetail = !gbDenomPrice && marketValue > 0;
      const retailTotal = gbDenomPrice   ? gbDenomPrice * qty
                        : isManualRetail ? marketValue * qty
                        : meltValue;
      const purchasePrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
      const purchaseTotal = purchasePrice * qty;
      const gainLoss = (currentSpot > 0 || isManualRetail || gbDenomPrice) ? retailTotal - purchaseTotal : null;

      csvRows.push([
        item.date,
        item.metal || 'Silver',
        item.type,
        item.name,
        item.qty,
        parseFloat(item.weight).toFixed(4),
        item.weightUnit || 'oz',
        parseFloat(item.purity) || 1.0,
        formatCurrency(purchasePrice),
        currentSpot > 0 ? formatCurrency(meltValue) : '—',
        formatCurrency(item.marketValue || 0),
        gainLoss !== null ? formatCurrency(gainLoss) : '—',
        item.purchaseLocation,
        item.numistaId || '',
        item.pcgsNumber || '',
        item.serialNumber || '',
        item.notes || ''
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
        weightUnit: item.weightUnit || 'oz',
        purity: item.purity || 1.0,
        price: item.price,
        date: item.date,
        purchaseLocation: item.purchaseLocation,
        storageLocation: item.storageLocation,
        notes: item.notes,
        isCollectable: item.isCollectable,
        numistaId: item.numistaId,
        serialNumber: item.serialNumber || '',
        marketValue: item.marketValue || 0,
        serial: item.serial
      }));
      zip.file('sample_data.json', JSON.stringify(sampleData, null, 2));
    }

    // 9. Add cached coin images (STACK-88)
    if (window.imageCache?.isAvailable()) {
      const allImages = await imageCache.exportAllImages();
      if (allImages.length > 0) {
        const imgFolder = zip.folder('images');
        for (const rec of allImages) {
          if (rec.obverse) imgFolder.file(`${rec.catalogId}_obverse.jpg`, rec.obverse);
          if (rec.reverse) imgFolder.file(`${rec.catalogId}_reverse.jpg`, rec.reverse);
        }
      }
      const allMeta = await imageCache.exportAllMetadata();
      if (allMeta.length > 0) {
        zip.file('image_metadata.json', JSON.stringify({
          version: APP_VERSION,
          exportDate: new Date().toISOString(),
          count: allMeta.length,
          metadata: allMeta
        }, null, 2));
      }
    }

    // Generate and download the ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob', streamFiles: true });
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

      // Restore chip grouping settings (v3.16.00+)
      if (Array.isArray(settingsObj.chipCustomGroups)) {
        saveDataSync('chipCustomGroups', settingsObj.chipCustomGroups);
      }
      if (Array.isArray(settingsObj.chipBlacklist)) {
        saveDataSync('chipBlacklist', settingsObj.chipBlacklist);
      }
      if (settingsObj.chipMinCount != null) {
        localStorage.setItem('chipMinCount', settingsObj.chipMinCount);
      }
      if (settingsObj.featureFlags != null) {
        localStorage.setItem(FEATURE_FLAGS_KEY, settingsObj.featureFlags);
      }
      // Restore inline chip config (v3.17.00+)
      if (settingsObj.inlineChipConfig != null) {
        localStorage.setItem('inlineChipConfig', settingsObj.inlineChipConfig);
      }
      // Restore Goldback denomination pricing (STACK-45)
      if (settingsObj.goldbackPrices != null) {
        saveDataSync(GOLDBACK_PRICES_KEY, settingsObj.goldbackPrices);
        goldbackPrices = settingsObj.goldbackPrices;
      }
      if (settingsObj.goldbackPriceHistory != null) {
        saveDataSync(GOLDBACK_PRICE_HISTORY_KEY, settingsObj.goldbackPriceHistory);
        goldbackPriceHistory = settingsObj.goldbackPriceHistory;
      }
      if (settingsObj.goldbackEnabled != null) {
        saveDataSync(GOLDBACK_ENABLED_KEY, settingsObj.goldbackEnabled === true);
        goldbackEnabled = settingsObj.goldbackEnabled === true;
      }
      if (settingsObj.goldbackEstimateEnabled != null) {
        saveDataSync(GOLDBACK_ESTIMATE_ENABLED_KEY, settingsObj.goldbackEstimateEnabled === true);
        goldbackEstimateEnabled = settingsObj.goldbackEstimateEnabled === true;
      }
      if (settingsObj.goldbackEstimateModifier != null) {
        const mod = parseFloat(settingsObj.goldbackEstimateModifier);
        if (!isNaN(mod) && mod > 0) {
          saveDataSync(GB_ESTIMATE_MODIFIER_KEY, mod);
          goldbackEstimateModifier = mod;
        }
      }
      // Restore display settings (backed up but previously not restored)
      if (settingsObj.itemsPerPage != null) {
        const ippRestore = settingsObj.itemsPerPage;
        localStorage.setItem(ITEMS_PER_PAGE_KEY, String(ippRestore));
        itemsPerPage = ippRestore === 'all' || ippRestore === Infinity ? Infinity : Number(ippRestore);
      }
      if (settingsObj.sortColumn != null) {
        sortColumn = settingsObj.sortColumn;
      }
      if (settingsObj.sortDirection != null) {
        sortDirection = settingsObj.sortDirection;
      }
      if (settingsObj.tableImageSides != null) {
        localStorage.setItem('tableImageSides', settingsObj.tableImageSides);
      }
      if (settingsObj.tableImagesEnabled != null) {
        localStorage.setItem('tableImagesEnabled', String(settingsObj.tableImagesEnabled));
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
    renderActiveFilters();
    loadSpotHistory();

    // Restore per-item price history with merge (STACK-43)
    const itemHistoryStr = await zip.file("item_price_history.json")?.async("string");
    if (itemHistoryStr) {
      const itemHistObj = JSON.parse(itemHistoryStr);
      if (typeof mergeItemPriceHistory === 'function') {
        mergeItemPriceHistory(itemHistObj.history || {});
      }
    } else if (typeof loadItemPriceHistory === 'function') {
      loadItemPriceHistory();
    }

    // Restore cached coin images (STACK-88)
    if (window.imageCache?.isAvailable()) {
      const imgFolder = zip.folder('images');
      const imgEntries = [];
      if (imgFolder) {
        imgFolder.forEach((path, file) => { imgEntries.push({ path, file }); });
      }

      if (imgEntries.length > 0) {
        await imageCache.clearAll();
        const imageMap = new Map();

        for (const { path, file } of imgEntries) {
          const m = path.match(/^(.+)_(obverse|reverse)\.jpg$/);
          if (!m) continue;
          if (!imageMap.has(m[1])) imageMap.set(m[1], {});
          imageMap.get(m[1])[m[2]] = await file.async('blob');
        }

        for (const [catalogId, sides] of imageMap) {
          await imageCache.importImageRecord({
            catalogId,
            obverse: sides.obverse || null,
            reverse: sides.reverse || null,
            width: 400,
            height: 400,
            cachedAt: Date.now(),
            size: (sides.obverse?.size || 0) + (sides.reverse?.size || 0)
          });
        }
      }

      // Restore metadata
      const metaStr = await zip.file('image_metadata.json')?.async('string');
      if (metaStr) {
        const metaObj = JSON.parse(metaStr);
        if (Array.isArray(metaObj.metadata)) {
          for (const rec of metaObj.metadata) {
            await imageCache.importMetadataRecord(rec);
          }
        }
      }
    }

    fetchSpotPrice();
    alert("Data imported successfully. The page will now reload.");
    location.reload();
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
  <title>StakTrakr Backup</title>
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
  <h1>StakTrakr Backup</h1>
  <div class="backup-info">
    <strong>Backup Created:</strong> ${timeFormatted}<br>
    <strong>Application Version:</strong> ${APP_VERSION}<br>
    <strong>Total Items:</strong> ${sortedInventory.length}<br>
    <strong>Archive Contents:</strong> Complete inventory data, settings, and spot price history
  </div>
  <table>
    <thead>
      <tr>
        <th>Composition</th><th>Name</th><th>Qty</th><th>Type</th><th>Weight</th>
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
          <td>${formatWeight(item.weight, item.weightUnit)}</td>
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

8. images/ (if coin images are cached)
   - Cached coin images as JPEG files
   - Named {catalogId}_obverse.jpg / {catalogId}_reverse.jpg
   - Automatically restored when importing backup

9. image_metadata.json (if coin images are cached)
   - Enriched Numista metadata for cached coins
   - Restored alongside images for offline viewing

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

For questions about this backup or the StakTrakr application:
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
  // STACK-62: Invalidate autocomplete cache so lookup table rebuilds with current inventory
  if (typeof clearLookupCache === 'function') clearLookupCache();
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
        marketValue: item.marketValue || 0,
        year: item.year || item.issuedYear || "",
        grade: item.grade || '',
        gradingAuthority: item.gradingAuthority || '',
        certNumber: item.certNumber || '',
        pcgsNumber: item.pcgsNumber || '',
        pcgsVerified: item.pcgsVerified || false,
        spotPriceAtPurchase: spotPrice,
        premiumPerOz,
        totalPremium,
        isCollectable: item.isCollectable !== undefined ? item.isCollectable : false,
        composition: item.composition || item.metal || "",
        purity: parseFloat(item.purity) || 1.0
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
        year: item.year || item.issuedYear || "",
        grade: item.grade || '',
        gradingAuthority: item.gradingAuthority || '',
        certNumber: item.certNumber || '',
        pcgsNumber: item.pcgsNumber || '',
        pcgsVerified: item.pcgsVerified || false,
        isCollectable: item.isCollectable !== undefined ? item.isCollectable : false,
        composition: item.composition || item.metal || "",
        purity: parseFloat(item.purity) || 1.0
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

    // Assign UUIDs to items that don't have them (migration for existing data)
    if (!item.uuid) {
      item.uuid = generateUUID();
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
  Set: 'var(--type-set-bg)',
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

  const urlPattern = /^(https?:\/\/)?[\w.-]+\.[A-Za-z]{2,}(\S*)?$/;
  const isUrl = urlPattern.test(value);

  // Strip domain suffix for display only (keep full value for filter + href)
  let displayValue = value;
  if (isUrl) {
    displayValue = value
      .replace(/^(https?:\/\/)?(www\.)?/i, '')
      .replace(/\.(com|net|org|co|io|us|uk|ca|au|de|fr|shop|store)\/?.*$/i, '');
  }

  const truncated = displayValue.length > 18 ? displayValue.substring(0, 18) + '…' : displayValue;
  const color = getPurchaseLocationColor(value);
  const filterSpan = filterLink('purchaseLocation', value, color, truncated, value !== truncated ? value : undefined);

  if (isUrl) {
    let href = value;
    if (!/^https?:\/\//i.test(href)) {
      href = `https://${href}`;
    }
    const safeHref = escapeAttribute(href);
    return `<a href="#" onclick="event.stopPropagation(); window.open('${safeHref}', '_blank', 'width=1250,height=800,scrollbars=yes,resizable=yes,toolbar=no,location=no,menubar=no,status=no'); return false;" class="purchase-link" title="${safeHref}">
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
 * Legacy premiums are no longer displayed — this is now a no-op stub
 * kept to prevent runtime errors from stale references.
 * @param {Object} item - Inventory item (unused)
 */
const recalcItem = (item) => {
  // No-op: premium calculations removed in portfolio redesign
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
    case 'marketValue':
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
      const validTypes = ['Coin', 'Bar', 'Round', 'Note', 'Aurum', 'Set', 'Other'];
      return validTypes.includes(trimmedValue);
      
    case 'metal':
      const validMetals = ['Silver', 'Gold', 'Platinum', 'Palladium'];
      return validMetals.includes(trimmedValue);
      
    default:
      return true;
  }
};

/**
 * Enhanced inline editing for table cells with support for multiple field types
 * @param {number} idx - Index of item to edit
 * @param {string} field - Field name to update
 * @param {HTMLElement} element - The td cell or a child element within it
 */
const startCellEdit = (idx, field, element) => {
  const td = element.tagName === 'TD' ? element : element.closest('td');
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
      const types = ['Coin', 'Bar', 'Round', 'Note', 'Aurum', 'Set', 'Other'];
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
    } else if (['weight', 'price', 'marketValue'].includes(field)) {
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
    } else if (['weight', 'price', 'marketValue'].includes(field)) {
      input.value = parseFloat(current || 0).toFixed(2);
      if (field === 'weight') input.dataset.unit = 'oz';
    } else {
      input.value = current;
    }
  }
  
  td.innerHTML = '';
  td.appendChild(input);

  const cancelEdit = () => {
    td.classList.remove('editing');
    // nosemgrep: javascript.browser.security.insecure-innerhtml.insecure-innerhtml, javascript.browser.security.insecure-document-method.insecure-document-method
    td.innerHTML = originalContent;
  };

  const saveEdit = () => {
    const value = input.value;
    if (!validateFieldValue(field, value)) {
      alert(`Invalid value for ${field}`);
      cancelEdit();
      return;
    }

    let finalValue;
    if (field === 'qty') {
      finalValue = parseInt(value, 10);
    } else if (['weight', 'price', 'marketValue'].includes(field)) {
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

    // Log the change
    if (typeof logChange === 'function') {
      logChange(item.name || `Item ${idx + 1}`, field, oldValue, finalValue, idx);
    }

    saveInventory();

    // Record price data point for inline edits on price-related fields (STACK-43)
    if (typeof recordSingleItemPrice === 'function' &&
        ['price', 'marketValue', 'weight', 'qty'].includes(field)) {
      recordSingleItemPrice(item, 'edit');
    }

    renderTable();
  };

  // Keyboard-only: Enter saves, Escape cancels
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  });

  // Cancel on blur (clicking away from the input)
  input.addEventListener('blur', () => {
    cancelEdit();
  });

  input.focus();
  if (input.select) input.select();
};

window.startCellEdit = startCellEdit;



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
      if (cell.querySelector && (cell.querySelector('svg') || cell.querySelector('button') || cell.querySelector('.action-icon') || cell.querySelector('img'))) {
        return false;
      }
      return cell.textContent.trim() === '';
    });

    document.querySelectorAll(`#inventoryTable [data-column="${col}"]`).forEach(el => {
      el.classList.toggle('hidden-empty', allEmpty);
    });
  });
};

/** IntersectionObserver instance for lazy-loading table thumbnails */
let _thumbObserver = null;

// Metal-colored SVG placeholder cache (one per metal+type combo)
const _thumbPlaceholders = {};

/**
 * Generate an inline SVG data URI for a metal-themed placeholder thumbnail.
 * Uses the metal's brand color and an icon based on item type (coin vs bar).
 * @param {string} metal - Metal name (Silver, Gold, Platinum, Palladium)
 * @param {string} type - Item type (Coin, Bar, Round, etc.)
 * @returns {string} data:image/svg+xml URI
 */
function _getThumbPlaceholder(metal, type) {
  const key = (metal || 'Silver') + ':' + (type || 'Coin');
  if (_thumbPlaceholders[key]) return _thumbPlaceholders[key];

  // Metal color palette (matches CSS custom properties)
  const colors = {
    Silver:    { fill: '#a8b5c4', stroke: '#8a9bb0', text: '#6b7d91' },
    Gold:      { fill: '#d4a74a', stroke: '#b8912e', text: '#9a7a24' },
    Platinum:  { fill: '#b8c5d6', stroke: '#95a8bd', text: '#7b8fa5' },
    Palladium: { fill: '#c2b8a3', stroke: '#a89e8a', text: '#8e846f' },
  };
  const c = colors[metal] || colors.Silver;

  // Icon path: coin (circle) for most types, rectangle for bars
  const isBar = /bar|ingot/i.test(type || '');
  const icon = isBar
    ? `<rect x="11" y="7" width="10" height="18" rx="1.5" fill="none" stroke="${c.text}" stroke-width="1.5" opacity="0.5"/><line x1="13" y1="12" x2="19" y2="12" stroke="${c.text}" stroke-width="0.8" opacity="0.4"/><line x1="13" y1="15" x2="19" y2="15" stroke="${c.text}" stroke-width="0.8" opacity="0.4"/><line x1="13" y1="18" x2="19" y2="18" stroke="${c.text}" stroke-width="0.8" opacity="0.4"/>`
    : `<circle cx="16" cy="16" r="8" fill="none" stroke="${c.text}" stroke-width="1.2" opacity="0.45"/><circle cx="16" cy="16" r="5" fill="none" stroke="${c.text}" stroke-width="0.8" opacity="0.3" stroke-dasharray="2 2"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="15" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1" opacity="0.25"/>
    ${icon}
  </svg>`;

  const uri = 'data:image/svg+xml,' + encodeURIComponent(svg);
  _thumbPlaceholders[key] = uri;
  return uri;
}

/**
 * Upgrades table thumbnail src attributes from IDB blob URLs using
 * IntersectionObserver for viewport-based lazy loading.
 * Pre-loads 200px before viewport for smooth scrolling.
 */
async function _enhanceTableThumbnails() {
  if (!featureFlags.isEnabled('COIN_IMAGES') || !window.imageCache?.isAvailable()) return;

  // Respect table images toggle (default ON)
  if (localStorage.getItem('tableImagesEnabled') === 'false') return;

  // Disconnect previous observer to avoid observing stale nodes
  if (_thumbObserver) _thumbObserver.disconnect();

  _thumbObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      _thumbObserver.unobserve(entry.target);
      _loadThumbImage(entry.target);
    }
  }, { rootMargin: '200px 0px' });

  document.querySelectorAll('#inventoryTable .table-thumb').forEach(img => {
    _thumbObserver.observe(img);
  });
}

/**
 * Resolve and set blob URL for a single table thumbnail image.
 * Checks IDB cache (user uploads → pattern images → Numista cache).
 * Falls back to a metal-colored SVG placeholder when no image is available.
 * @param {HTMLImageElement} img - Table thumbnail element with data attributes
 */
async function _loadThumbImage(img) {
  try {
    const item = {
      uuid: img.dataset.itemUuid || '',
      numistaId: img.dataset.catalogId || '',
      name: img.dataset.itemName || '',
      metal: img.dataset.itemMetal || '',
      type: img.dataset.itemType || '',
    };

    const side = img.dataset.side || 'obverse';

    // Resolve CDN URL from inventory item
    const row = img.closest('tr');
    const idx = row?.dataset?.idx;
    let cdnUrl = '';
    if (idx !== undefined) {
      const invItem = inventory[parseInt(idx, 10)];
      if (invItem) {
        const urlKey = side === 'reverse' ? 'reverseImageUrl' : 'obverseImageUrl';
        cdnUrl = (invItem[urlKey] && /^https?:\/\/.+\..+/i.test(invItem[urlKey])) ? invItem[urlKey] : '';
      }
    }

    // Numista override: CDN URLs (Numista source) win over user/pattern blobs
    const numistaOverride = localStorage.getItem('numistaOverridePersonal') === 'true';
    if (numistaOverride && cdnUrl) {
      img.src = cdnUrl;
      img.style.visibility = '';
      return;
    }

    const resolved = await imageCache.resolveImageForItem(item);

    if (resolved) {
      let blobUrl;
      if (resolved.source === 'user') {
        blobUrl = await imageCache.getUserImageUrl(resolved.catalogId, side);
      } else if (resolved.source === 'pattern') {
        blobUrl = await imageCache.getPatternImageUrl(resolved.catalogId, side);
      } else {
        blobUrl = await imageCache.getImageUrl(resolved.catalogId, side);
      }

      if (blobUrl) {
        _thumbBlobUrls.push(blobUrl);
        img.src = blobUrl;
        img.style.visibility = '';
        return;
      }
    }

    // Fallback: CDN URL
    if (cdnUrl) {
      img.src = cdnUrl;
      img.style.visibility = '';
      return;
    }

    // No cached image, no CDN URL — show metal-themed placeholder
    img.src = _getThumbPlaceholder(item.metal, item.type);
    img.style.visibility = '';
    img.classList.add('table-thumb-placeholder');
  } catch { /* ignore — IDB unavailable or entry missing */ }
}

const renderTable = () => {
  return monitorPerformance(() => {
    // Ensure filterInventory is available (search.js may still be loading)
    const filteredInventory = typeof filterInventory === 'function' ? filterInventory() : inventory;
    updateItemCount(filteredInventory.length, inventory.length);
    const sortedInventory = sortInventory(filteredInventory);
    debugLog('renderTable start', sortedInventory.length, 'items');

    // STAK-118: Card view rendering branch
    if (typeof isCardViewActive === 'function' && isCardViewActive()) {
      const cardGrid = safeGetElement('cardViewGrid');
      const portalScroll = document.querySelector('.portal-scroll');
      if (cardGrid) {
        cardGrid.style.display = 'flex';
        if (portalScroll) portalScroll.style.display = 'none';

        renderCardView(sortedInventory, cardGrid);
        bindCardClickHandler(cardGrid);

        // Defer portal height calc to next frame so cards have their layout
        requestAnimationFrame(() => updatePortalHeight());
        updateSummary();
        return;
      }
    }

    // Ensure table is visible when not in card view
    const cardGridEl = safeGetElement('cardViewGrid');
    const portalScrollEl = document.querySelector('.portal-scroll');
    if (cardGridEl) {
      cardGridEl.style.display = 'none';
      cardGridEl.style.maxHeight = '';
      cardGridEl.style.overflowY = '';
    }
    if (portalScrollEl) portalScrollEl.style.display = '';

    const rows = [];
    const chipConfig = typeof getInlineChipConfig === 'function' ? getInlineChipConfig() : [];

    for (let i = 0; i < sortedInventory.length; i++) {
      const item = sortedInventory[i];
      const originalIdx = inventory.indexOf(item);
      debugLog('renderTable row', i, item.name);

      // Portfolio computed values (all financial columns are qty-adjusted totals)
      const currentSpot = spotPrices[item.metal.toLowerCase()] || 0;
      const qty = Number(item.qty) || 1;
      const meltValue = computeMeltValue(item, currentSpot);
      // Retail hierarchy: gb denomination > manual marketValue > melt
      const gbDenomPrice = (typeof getGoldbackRetailPrice === 'function') ? getGoldbackRetailPrice(item) : null;
      const marketValue = parseFloat(item.marketValue) || 0;
      const isManualRetail = !gbDenomPrice && marketValue > 0;
      const retailTotal = gbDenomPrice   ? gbDenomPrice * qty
                        : isManualRetail ? marketValue * qty
                        : meltValue;
      const purchasePrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
      const purchaseTotal = purchasePrice * qty;
      const gainLoss = (currentSpot > 0 || isManualRetail || gbDenomPrice) ? retailTotal - purchaseTotal : null;

      // Resolve Numista catalog ID for inline tag
      const numistaId = item.numistaId || (typeof catalogManager !== 'undefined'
        && catalogManager.getCatalogId ? catalogManager.getCatalogId(item.serial) : null);

      // Build inline chip HTML strings for config-driven rendering
      const gradeTag = item.grade ? (() => {
        const authority = item.gradingAuthority || '';
        const certNum = item.certNumber || '';
        const isClickable = !!certNum;
        let tooltip;
        if (authority === 'PCGS' && certNum && item.pcgsVerified) {
          tooltip = `${authority} Cert #${certNum} \u2014 Verified`;
        } else if (authority && certNum) {
          tooltip = `${authority} Cert #${certNum} \u2014 Click to verify`;
        } else if (authority) {
          tooltip = `Graded by ${authority}: ${item.grade}`;
        } else {
          tooltip = `Grade: ${item.grade}`;
        }
        // Show PCGS verify icon when: authority=PCGS + has cert# + PCGS API configured
        const showPcgsVerify = authority === 'PCGS' && certNum
          && typeof catalogConfig !== 'undefined' && catalogConfig.isPcgsEnabled();
        const verifyIcon = showPcgsVerify
          ? `<span class="pcgs-verify-btn${item.pcgsVerified ? ' pcgs-verified' : ''}" data-cert-number="${escapeAttribute(certNum)}" title="${item.pcgsVerified ? 'Verified \u2014 Click to re-verify' : 'Verify cert via PCGS API'}"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>`
          : '';
        const attrs = [
          authority ? `data-authority="${escapeAttribute(authority)}"` : '',
          isClickable ? 'data-clickable="true"' : '',
          certNum ? `data-cert-number="${escapeAttribute(certNum)}"` : '',
          `data-grade="${escapeAttribute(item.grade || '')}"`,
          isClickable ? 'tabindex="0" role="button"' : '',
        ].filter(Boolean).join(' ');
        return `<span class="grade-tag" ${attrs} title="${escapeAttribute(tooltip)}">${sanitizeHtml(item.grade)}${verifyIcon}</span>`;
      })() : '';

      const numistaTag = numistaId
        ? `<span class="numista-tag" data-numista-id="${escapeAttribute(String(numistaId))}"
               data-coin-name="${escapeAttribute(item.name)}"
               title="N#${escapeAttribute(String(numistaId))} — View on Numista"
               tabindex="0" role="button">N#${sanitizeHtml(String(numistaId))}</span>`
        : '';

      const pcgsTag = item.pcgsNumber
        ? `<span class="pcgs-tag" data-pcgs-number="${escapeAttribute(String(item.pcgsNumber))}"
               data-grade="${escapeAttribute(item.grade || '')}"
               title="PCGS #${escapeAttribute(String(item.pcgsNumber))} — View on PCGS CoinFacts"
               tabindex="0" role="button">PCGS#${sanitizeHtml(String(item.pcgsNumber))}</span>`
        : '';

      const yearTag = item.year
        ? `<span class="year-tag" title="Filter by year: ${escapeAttribute(String(item.year))}"
               onclick="applyColumnFilter('year', ${JSON.stringify(String(item.year))})"
               tabindex="0" role="button" style="cursor:pointer;">${sanitizeHtml(String(item.year))}</span>`
        : '';

      const serialTag = item.serialNumber
        ? `<span class="serial-tag" title="S/N: ${escapeAttribute(item.serialNumber)}">${sanitizeHtml(item.serialNumber)}</span>`
        : '';

      const storageTag = item.storageLocation && item.storageLocation !== 'Unknown'
        ? `<span class="storage-tag" title="${escapeAttribute(item.storageLocation)}">${sanitizeHtml(item.storageLocation)}</span>`
        : '';

      const notesIndicator = item.notes
        ? `<span class="notes-indicator" title="Click to view notes · Shift+click to edit"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z"/></svg></span>`
        : '';

      const purityVal = parseFloat(item.purity);
      const purityTag = (!isNaN(purityVal) && purityVal > 0 && purityVal < 1.0)
        ? `<span class="purity-tag" title="Purity: ${purityVal}" onclick="applyColumnFilter('purity', ${JSON.stringify(String(purityVal))})" tabindex="0" role="button" style="cursor:pointer;">${purityVal}</span>`
        : '';

      // Table thumbnail — obverse + reverse preview in name cell
      // Omit src attribute entirely when no URL (avoids browser requesting page URL for src="")
      // Hidden when tableImagesEnabled toggle is off
      const _tableImagesOn = localStorage.getItem('tableImagesEnabled') !== 'false';
      const _thumbType = (item.type || '').toLowerCase();
      const _isRectThumb = _thumbType === 'bar' || _thumbType === 'note' || _thumbType === 'aurum'
        || _thumbType === 'set' || item.weightUnit === 'gb';
      const _thumbShapeClass = _isRectThumb ? ' table-thumb-rect' : '';
      const _validUrl = (u) => u && /^https?:\/\/.+\..+/i.test(u);
      const obvUrl = _validUrl(item.obverseImageUrl) ? item.obverseImageUrl : '';
      const revUrl = _validUrl(item.reverseImageUrl) ? item.reverseImageUrl : '';
      const obvSrcAttr = obvUrl ? ` src="${escapeAttribute(obvUrl)}"` : '';
      const revSrcAttr = revUrl ? ` src="${escapeAttribute(revUrl)}"` : '';
      const _sharedThumbAttrs = `data-catalog-id="${escapeAttribute(item.numistaId || '')}"
               data-item-uuid="${escapeAttribute(item.uuid || '')}"
               data-item-name="${escapeAttribute(item.name || '')}"
               data-item-metal="${escapeAttribute(item.metal || '')}"
               data-item-type="${escapeAttribute(item.type || '')}"`;
      const _tableImageSides = localStorage.getItem('tableImageSides') || 'both';
      const _showObv = _tableImageSides === 'both' || _tableImageSides === 'obverse';
      const _showRev = _tableImageSides === 'both' || _tableImageSides === 'reverse';
      const thumbHtml = _tableImagesOn && featureFlags.isEnabled('COIN_IMAGES')
        ? (_showObv ? `<img class="table-thumb${_thumbShapeClass}"${obvSrcAttr}
               ${_sharedThumbAttrs} data-side="obverse"
               alt="" loading="lazy" onerror="this.style.display='none'" />` : '')
        + (_showRev ? `<img class="table-thumb${_thumbShapeClass}"${revSrcAttr}
               ${_sharedThumbAttrs} data-side="reverse"
               alt="" loading="lazy" onerror="this.style.display='none'" />` : '')
        : '';

      // Config-driven chip ordering
      const chipMap = { grade: gradeTag, numista: numistaTag, pcgs: pcgsTag, year: yearTag, serial: serialTag, storage: storageTag, notes: notesIndicator, purity: purityTag };
      const orderedChips = chipConfig.filter(c => c.enabled && chipMap[c.id]).map(c => chipMap[c.id]).join('');

      // Format computed displays
      const meltDisplay = currentSpot > 0 ? formatCurrency(meltValue) : '—';
      const retailDisplay = currentSpot > 0 || isManualRetail || gbDenomPrice ? formatCurrency(retailTotal) : '—';
      const gainLossDisplay = gainLoss !== null && (currentSpot > 0 || isManualRetail || gbDenomPrice) ? formatCurrency(Math.abs(gainLoss)) : '—';
      const gainLossColor = gainLoss > 0 ? 'var(--success, #4caf50)' : gainLoss < 0 ? 'var(--danger, #f44336)' : 'var(--text-primary)';
      const gainLossPrefix = gainLoss > 0 ? '+' : gainLoss < 0 ? '-' : '';

  rows.push(`
      <tr data-idx="${originalIdx}">
  <td class="shrink" data-column="date" data-label="Date">${filterLink('date', item.date, 'var(--text-primary)', item.date ? formatDisplayDate(item.date) : '—')}</td>
      <td class="shrink" data-column="metal" data-label="Metal" data-metal="${escapeAttribute(item.composition || item.metal || '')}">${filterLink('metal', item.composition || item.metal || 'Silver', METAL_COLORS[item.metal] || 'var(--primary)', getDisplayComposition(item.composition || item.metal || 'Silver'))}</td>
      <td class="shrink" data-column="type" data-label="Type">${filterLink('type', item.type, getTypeColor(item.type))}</td>
      <td class="shrink" data-column="image" data-label="Image" style="text-align: center;">${thumbHtml}</td>
      <td class="expand" data-column="name" data-label="" style="text-align: left;">
        <div class="name-cell-content">
        ${featureFlags.isEnabled('COIN_IMAGES')
          ? `<span class="filter-text" style="color: var(--text-primary); cursor: pointer;" onclick="showViewModal(${originalIdx})" tabindex="0" role="button" onkeydown="if(event.key==='Enter'||event.key===' ')showViewModal(${originalIdx})" title="View ${escapeAttribute(item.name)}">${sanitizeHtml(item.name)}</span>`
          : filterLink('name', item.name, 'var(--text-primary)', undefined, item.name)}${orderedChips}
        </div>
      </td>
      <td class="shrink" data-column="qty" data-label="Qty">${filterLink('qty', item.qty, 'var(--text-primary)')}</td>
      <td class="shrink" data-column="weight" data-label="Weight">${filterLink('weight', item.weight, 'var(--text-primary)', formatWeight(item.weight, item.weightUnit), item.weightUnit === 'gb' ? 'Goldback denomination' : item.weight < 1 ? 'Grams (g)' : 'Troy ounces (ozt)')}</td>
      <td class="shrink" data-column="purchasePrice" data-label="Purchase" title="Purchase Price (${displayCurrency}) - Click to search eBay active listings" style="color: var(--text-primary);">
        <a href="#" class="ebay-buy-link ebay-price-link" data-search="${escapeAttribute(item.metal + (item.year ? ' ' + item.year : '') + ' ' + item.name)}" title="Search eBay active listings for ${escapeAttribute(item.metal)} ${escapeAttribute(item.name)}">
          ${formatCurrency(purchasePrice)} <svg class="ebay-search-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2.5"/><line x1="15" y1="15" x2="21" y2="21" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
        </a>
      </td>
      <td class="shrink" data-column="meltValue" data-label="Melt" title="Melt Value (${displayCurrency})" style="color: var(--text-primary);">${meltDisplay}</td>
      <td class="shrink ${gbDenomPrice ? 'retail-confirmed' : isManualRetail ? 'retail-confirmed' : 'retail-estimated'}" data-column="retailPrice" data-label="Retail" title="${gbDenomPrice ? 'Goldback denomination price' : isManualRetail ? 'Manual retail price (confirmed)' : 'Estimated — defaults to melt value'} - Click to search eBay sold listings">
        <a href="#" class="ebay-sold-link ebay-price-link" data-search="${escapeAttribute(item.metal + (item.year ? ' ' + item.year : '') + ' ' + item.name)}" title="Search eBay sold listings for ${escapeAttribute(item.metal)} ${escapeAttribute(item.name)}">
          ${retailDisplay} <svg class="ebay-search-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2.5"/><line x1="15" y1="15" x2="21" y2="21" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
        </a>
      </td>
      <td class="shrink ${!isManualRetail && gainLoss !== null ? 'gainloss-estimated' : ''}" data-column="gainLoss" data-label="Gain/Loss" title="${isManualRetail ? 'Gain/Loss (confirmed retail)' : 'Gain/Loss (estimated — based on melt value)'}" style="color: ${gainLossColor}; font-weight: ${gainLoss !== null && gainLoss !== 0 && isManualRetail ? '600' : 'normal'};">${gainLoss !== null && gainLossDisplay !== '—' ? gainLossPrefix + gainLossDisplay : '—'}</td>
      <td class="shrink" data-column="purchaseLocation" data-label="Source">
        ${formatPurchaseLocation(item.purchaseLocation)}
      </td>
      <td class="icon-col actions-cell" data-column="actions" data-label=""><div class="actions-row">
        <button class="icon-btn action-icon edit-icon" role="button" tabindex="0" onclick="editItem(${originalIdx})" aria-label="Edit ${sanitizeHtml(item.name)}" title="Edit item">
          <svg class="icon-svg edit-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/></svg>
        </button>
        <button class="icon-btn action-icon" role="button" tabindex="0" onclick="duplicateItem(${originalIdx})" aria-label="Duplicate ${sanitizeHtml(item.name)}" title="Duplicate item">
          <svg class="icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/></svg>
        </button>
        <button class="icon-btn action-icon danger" role="button" tabindex="0" onclick="deleteItem(${originalIdx})" aria-label="Delete item" title="Delete item">
          <svg class="icon-svg delete-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7zm3-4h6l1 1h4v2H3V4h4l1-1z"/></svg>
        </button>
      </div></td>
      </tr>
      `);
    }

    // Find tbody element directly if cached version fails
    const tbody = elements.inventoryTable || document.querySelector('#inventoryTable tbody');
    if (!tbody) {
      console.error('Could not find table tbody element');
      return;
    }

    // Revoke previous thumbnail blob URLs to prevent memory leaks
    for (const url of _thumbBlobUrls) {
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    }
    _thumbBlobUrls = [];

    // nosemgrep: javascript.browser.security.insecure-innerhtml.insecure-innerhtml, javascript.browser.security.insecure-document-method.insecure-document-method
    tbody.innerHTML = rows.join('');

    // Upgrade table thumbnails from CDN URLs to IDB blob URLs (fire-and-forget)
    _enhanceTableThumbnails();

    // Card-view tap: delegate click on tbody rows (≤768px only)
    // Opens view modal if COIN_IMAGES enabled, otherwise edit modal
    if (!tbody._cardTapBound) {
      tbody._cardTapBound = true;
      tbody.addEventListener('click', (e) => {
        if (window.innerWidth > 768) return;
        // Don't intercept clicks on buttons, links, or interactive elements
        if (e.target.closest('button, a, input, select, textarea, .icon-btn, .filter-text, [role="button"], .year-tag, .purity-tag')) return;
        const row = e.target.closest('tr[data-idx]');
        if (row) {
          const idx = Number(row.dataset.idx);
          if (featureFlags.isEnabled('COIN_IMAGES') && typeof showViewModal === 'function') {
            showViewModal(idx);
          } else {
            editItem(idx);
          }
        }
      });
    }

    hideEmptyColumns();

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

    updatePortalHeight();
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
   * Calculates portfolio metrics for specified metal type
   * Uses the three-value model: Purchase Price, Melt Value, Retail Price
   * Gain/Loss is based on retail price (which defaults to melt if not manually set)
   *
   * @param {string} metal - Metal type to calculate
   * @returns {Object} Calculated metrics
   */
  const calculateTotals = (metal) => {
    let totalItems = 0;
    let totalWeight = 0;
    let totalMeltValue = 0;
    let totalPurchased = 0;
    let totalRetailValue = 0;
    let totalGainLoss = 0;

    for (const item of inventory) {
      if (item.metal === metal) {
        const qty = Number(item.qty) || 0;
        const weight = parseFloat(item.weight) || 0;
        const price = parseFloat(item.price) || 0;

        totalItems += qty;
        // Convert gb denomination to troy oz for weight totals
        const weightOz = (item.weightUnit === 'gb') ? weight * GB_TO_OZT : weight;
        const itemWeight = qty * weightOz;
        totalWeight += itemWeight;

        // Melt value: weight x qty x current spot x purity
        const currentSpot = spotPrices[item.metal.toLowerCase()] || 0;
        const purity = parseFloat(item.purity) || 1.0;
        const meltValue = currentSpot * itemWeight * purity;
        totalMeltValue += meltValue;

        // Purchase price total (price already converted)
        const purchaseTotal = qty * price;
        totalPurchased += purchaseTotal;

        // Retail total: (1) gb denomination price, (2) manual marketValue, (3) melt
        const gbDenomPrice = (typeof getGoldbackRetailPrice === 'function') ? getGoldbackRetailPrice(item) : null;
        const marketValue = parseFloat(item.marketValue) || 0;
        const isManualRetail = !gbDenomPrice && marketValue > 0;
        const retailTotal = gbDenomPrice   ? gbDenomPrice * qty
                          : isManualRetail ? marketValue * qty
                          : meltValue;
        totalRetailValue += retailTotal;

        // Gain/loss: retail minus purchase (both in USD; converted at display time)
        totalGainLoss += retailTotal - purchaseTotal;
      }
    }

    return {
      totalItems,
      totalWeight,
      totalMeltValue,
      totalPurchased,
      totalRetailValue,
      totalGainLoss
    };
  };

  // Calculate totals for each metal
  const metalTotals = {};
  Object.values(METALS).forEach(metalConfig => {
    metalTotals[metalConfig.key] = calculateTotals(metalConfig.name);
  });

  // Update DOM elements
  Object.values(METALS).forEach(metalConfig => {
    const totals = metalTotals[metalConfig.key];
    const metalKey = metalConfig.key;
    const els = elements.totals[metalKey];

    if (els.items) els.items.textContent = totals.totalItems;
    if (els.weight) els.weight.textContent = totals.totalWeight.toFixed(2);
    if (els.value) els.value.textContent = formatCurrency(totals.totalMeltValue || 0);
    if (els.purchased) els.purchased.textContent = formatCurrency(totals.totalPurchased || 0);
    if (els.retailValue) els.retailValue.textContent = formatCurrency(totals.totalRetailValue || 0);
    if (els.lossProfit) {
      const gl = totals.totalGainLoss || 0;
      const gainLossPct = totals.totalPurchased > 0 ? (gl / totals.totalPurchased) * 100 : 0;
      // nosemgrep: javascript.browser.security.insecure-innerhtml.insecure-innerhtml, javascript.browser.security.insecure-document-method.insecure-document-method
      els.lossProfit.innerHTML = formatLossProfit(gl, gainLossPct);
      // Dynamic label: "Gain:" green, "Loss:" red, "Gain/Loss:" neutral (STACK-50)
      const glLabel = els.lossProfit.parentElement && els.lossProfit.parentElement.querySelector('.total-label');
      if (glLabel) {
        glLabel.textContent = gl > 0 ? 'Gain:' : gl < 0 ? 'Loss:' : 'Gain/Loss:';
        glLabel.style.color = gl > 0 ? 'var(--success)' : gl < 0 ? 'var(--danger)' : '';
        glLabel.style.fontWeight = gl !== 0 ? '600' : '';
      }
    }
    if (els.avgCostPerOz) {
      const avgCost = totals.totalWeight > 0 ? totals.totalPurchased / totals.totalWeight : 0;
      els.avgCostPerOz.textContent = formatCurrency(avgCost);
    }
  });

  // Calculate combined totals for all metals
  const allTotals = {
    totalItems: 0,
    totalWeight: 0,
    totalMeltValue: 0,
    totalPurchased: 0,
    totalRetailValue: 0,
    totalGainLoss: 0
  };

  Object.values(metalTotals).forEach(totals => {
    allTotals.totalItems += totals.totalItems;
    allTotals.totalWeight += totals.totalWeight;
    allTotals.totalMeltValue += totals.totalMeltValue;
    allTotals.totalPurchased += totals.totalPurchased;
    allTotals.totalRetailValue += totals.totalRetailValue;
    allTotals.totalGainLoss += totals.totalGainLoss;
  });

  // Update "All" totals display if elements exist
  if (elements.totals.all && elements.totals.all.items) {
    elements.totals.all.items.textContent = allTotals.totalItems;
    if (elements.totals.all.weight) elements.totals.all.weight.textContent = allTotals.totalWeight.toFixed(2);
    if (elements.totals.all.value) elements.totals.all.value.textContent = formatCurrency(allTotals.totalMeltValue || 0);
    if (elements.totals.all.purchased) elements.totals.all.purchased.textContent = formatCurrency(allTotals.totalPurchased || 0);
    if (elements.totals.all.retailValue) elements.totals.all.retailValue.textContent = formatCurrency(allTotals.totalRetailValue || 0);
    if (elements.totals.all.lossProfit) {
      const allGl = allTotals.totalGainLoss || 0;
      const allGainLossPct = allTotals.totalPurchased > 0 ? (allGl / allTotals.totalPurchased) * 100 : 0;
      // nosemgrep: javascript.browser.security.insecure-innerhtml.insecure-innerhtml, javascript.browser.security.insecure-document-method.insecure-document-method
      elements.totals.all.lossProfit.innerHTML = formatLossProfit(allGl, allGainLossPct);
      const allGlLabel = elements.totals.all.lossProfit.parentElement && elements.totals.all.lossProfit.parentElement.querySelector('.total-label');
      if (allGlLabel) {
        allGlLabel.textContent = allGl > 0 ? 'Gain:' : allGl < 0 ? 'Loss:' : 'Gain/Loss:';
        allGlLabel.style.color = allGl > 0 ? 'var(--success)' : allGl < 0 ? 'var(--danger)' : '';
        allGlLabel.style.fontWeight = allGl !== 0 ? '600' : '';
      }
    }
    if (elements.totals.all.avgCostPerOz) {
      const avgCost = allTotals.totalWeight > 0 ? allTotals.totalPurchased / allTotals.totalWeight : 0;
      elements.totals.all.avgCostPerOz.textContent = formatCurrency(avgCost);
    }
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
    renderActiveFilters();
    if (item) logChange(item.name, 'Deleted', JSON.stringify(item), '', idx);

    // Clean up user images from IndexedDB (STAK-120)
    if (item?.uuid && window.imageCache?.isAvailable()) {
      window.imageCache.deleteUserImage(item.uuid).catch(err => {
        debugLog(`Failed to delete user images for deleted item: ${err}`);
      });
    }
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

  // Set modal to edit mode
  if (elements.itemModalTitle) elements.itemModalTitle.textContent = "Edit Inventory Item";
  if (elements.itemModalSubmit) elements.itemModalSubmit.textContent = "Save Changes";

  // Populate unified form fields
  elements.itemMetal.value = item.composition || item.metal;
  elements.itemName.value = item.name;
  elements.itemQty.value = item.qty;
  elements.itemType.value = item.type;

  // Weight: use real <select> instead of dataset.unit (BUG FIX)
  if (item.weightUnit === 'gb') {
    const denomSelect = elements.itemGbDenom || document.getElementById('itemGbDenom');
    elements.itemWeight.value = parseFloat(item.weight);
    elements.itemWeightUnit.value = 'gb';
    if (denomSelect) denomSelect.value = String(parseFloat(item.weight));
    if (typeof toggleGbDenomPicker === 'function') toggleGbDenomPicker();
  } else if (item.weight < 1) {
    const grams = oztToGrams(item.weight);
    // Show up to 4 decimal places for sub-gram precision, strip trailing zeros
    elements.itemWeight.value = parseFloat(grams.toFixed(4));
    elements.itemWeightUnit.value = 'g';
    if (typeof toggleGbDenomPicker === 'function') toggleGbDenomPicker();
  } else {
    elements.itemWeight.value = parseFloat(item.weight).toFixed(2);
    elements.itemWeightUnit.value = 'oz';
    if (typeof toggleGbDenomPicker === 'function') toggleGbDenomPicker();
  }

  // Convert stored USD values to display currency for the form (STACK-50)
  const fxRate = (typeof getExchangeRate === 'function') ? getExchangeRate() : 1;
  const displayPrice = item.price > 0 ? (fxRate !== 1 ? (item.price * fxRate).toFixed(2) : item.price) : '';
  const displayMv = item.marketValue > 0 ? (fxRate !== 1 ? (item.marketValue * fxRate).toFixed(2) : item.marketValue) : '';
  elements.itemPrice.value = displayPrice;
  if (elements.itemMarketValue) elements.itemMarketValue.value = displayMv;
  elements.purchaseLocation.value = item.purchaseLocation || '';
  elements.storageLocation.value = item.storageLocation && item.storageLocation !== 'Unknown' ? item.storageLocation : '';
  if (elements.itemSerialNumber) elements.itemSerialNumber.value = item.serialNumber || '';
  if (elements.itemNotes) elements.itemNotes.value = item.notes || '';
  elements.itemDate.value = item.date;
  // Reset spot lookup state for edit mode (STACK-49)
  if (elements.itemSpotPrice) elements.itemSpotPrice.value = '';
  if (elements.spotLookupBtn) elements.spotLookupBtn.disabled = !item.date;
  if (elements.itemCatalog) elements.itemCatalog.value = item.numistaId || '';
  if (elements.itemYear) elements.itemYear.value = item.year || item.issuedYear || '';
  if (elements.itemGrade) elements.itemGrade.value = item.grade || '';
  if (elements.itemGradingAuthority) elements.itemGradingAuthority.value = item.gradingAuthority || '';
  if (elements.itemCertNumber) elements.itemCertNumber.value = item.certNumber || '';
  if (elements.itemPcgsNumber) elements.itemPcgsNumber.value = item.pcgsNumber || '';
  if (elements.itemObverseImageUrl) elements.itemObverseImageUrl.value = item.obverseImageUrl || '';
  if (elements.itemReverseImageUrl) elements.itemReverseImageUrl.value = item.reverseImageUrl || '';
  if (elements.itemSerial) elements.itemSerial.value = item.serial;

  // Pre-fill purity: match a preset or show custom input
  const purityVal = parseFloat(item.purity) || 1.0;
  const puritySelect = elements.itemPuritySelect || document.getElementById('itemPuritySelect');
  const purityCustom = elements.purityCustomWrapper || document.getElementById('purityCustomWrapper');
  const purityInput = elements.itemPurity || document.getElementById('itemPurity');
  if (puritySelect) {
    const presetOption = Array.from(puritySelect.options).find(o => o.value !== 'custom' && parseFloat(o.value) === purityVal);
    if (presetOption) {
      puritySelect.value = presetOption.value;
      if (purityCustom) purityCustom.style.display = 'none';
      if (purityInput) purityInput.value = '';
    } else {
      puritySelect.value = 'custom';
      if (purityCustom) purityCustom.style.display = '';
      if (purityInput) purityInput.value = purityVal;
    }
  }

  // Show/hide PCGS verified icon next to Cert# label
  const certVerifiedIcon = document.getElementById('certVerifiedIcon');
  if (certVerifiedIcon) certVerifiedIcon.style.display = item.pcgsVerified ? 'inline-flex' : 'none';

  // Show price history link in edit mode (STAK-109)
  const retailHistoryLink = document.getElementById('retailPriceHistoryLink');
  if (retailHistoryLink) retailHistoryLink.style.display = 'inline';

  // Show/hide Undo button based on changelog context
  if (elements.undoChangeBtn) {
    elements.undoChangeBtn.style.display =
      logIdx !== null ? "inline-block" : "none";
  }

  // Update currency symbols in modal (STACK-50)
  if (typeof updateModalCurrencyUI === 'function') updateModalCurrencyUI();

  // Preload user images (obverse + reverse) into upload previews (STACK-32)
  if (typeof clearUploadState === 'function') clearUploadState();
  if (item.uuid && window.imageCache?.isAvailable()) {
    imageCache.getUserImage(item.uuid).then(rec => {
      if (!rec) return;
      // Preload obverse
      if (rec.obverse) {
        try {
          const url = URL.createObjectURL(rec.obverse);
          const previewContainer = document.getElementById('itemImagePreviewObv');
          const previewImg = document.getElementById('itemImagePreviewImgObv');
          const removeBtn = document.getElementById('itemImageRemoveBtnObv');
          if (previewImg) previewImg.src = url;
          if (previewContainer) previewContainer.style.display = 'block';
          if (removeBtn) removeBtn.style.display = '';
          if (typeof setEditPreviewUrl === 'function') setEditPreviewUrl(url, 'obverse');
        } catch { /* ignore */ }
      }
      // Preload reverse
      if (rec.reverse) {
        try {
          const url = URL.createObjectURL(rec.reverse);
          const previewContainer = document.getElementById('itemImagePreviewRev');
          const previewImg = document.getElementById('itemImagePreviewImgRev');
          const removeBtn = document.getElementById('itemImageRemoveBtnRev');
          if (previewImg) previewImg.src = url;
          if (previewContainer) previewContainer.style.display = 'block';
          if (removeBtn) removeBtn.style.display = '';
          if (typeof setEditPreviewUrl === 'function') setEditPreviewUrl(url, 'reverse');
        } catch { /* ignore */ }
      }
    }).catch(() => {});
  }

  // Open unified modal
  if (window.openModalById) openModalById('itemModal');
  else if (elements.itemModal) elements.itemModal.style.display = 'flex';
};

/**
 * Duplicates an inventory item by opening the add modal pre-filled with
 * the source item's fields. Date defaults to today, qty resets to 1.
 *
 * @param {number} idx - Index of item to duplicate
 */
const duplicateItem = (idx) => {
  const item = inventory[idx];

  // Stay in add mode — editingIndex remains null so submit creates a new record
  editingIndex = null;
  editingChangeLogIndex = null;

  // Set modal to add mode with "Duplicate" title
  if (elements.itemModalTitle) elements.itemModalTitle.textContent = "Duplicate Inventory Item";
  if (elements.itemModalSubmit) elements.itemModalSubmit.textContent = "Add to Inventory";
  if (elements.undoChangeBtn) elements.undoChangeBtn.style.display = "none";

  // Pre-fill from source item
  elements.itemMetal.value = item.composition || item.metal;
  elements.itemName.value = item.name;
  elements.itemQty.value = 1; // Reset qty to 1
  elements.itemType.value = item.type;

  // Weight: same conversion logic as editItem
  if (item.weightUnit === 'gb') {
    const denomSelect = elements.itemGbDenom || document.getElementById('itemGbDenom');
    elements.itemWeight.value = parseFloat(item.weight);
    elements.itemWeightUnit.value = 'gb';
    if (denomSelect) denomSelect.value = String(parseFloat(item.weight));
    if (typeof toggleGbDenomPicker === 'function') toggleGbDenomPicker();
  } else if (item.weight < 1) {
    const grams = oztToGrams(item.weight);
    elements.itemWeight.value = parseFloat(grams.toFixed(4));
    elements.itemWeightUnit.value = 'g';
    if (typeof toggleGbDenomPicker === 'function') toggleGbDenomPicker();
  } else {
    elements.itemWeight.value = parseFloat(item.weight).toFixed(2);
    elements.itemWeightUnit.value = 'oz';
    if (typeof toggleGbDenomPicker === 'function') toggleGbDenomPicker();
  }

  // Convert stored USD values to display currency for the form (STACK-50)
  const dupFxRate = (typeof getExchangeRate === 'function') ? getExchangeRate() : 1;
  const dupDisplayPrice = item.price > 0 ? (dupFxRate !== 1 ? (item.price * dupFxRate).toFixed(2) : item.price) : '';
  const dupDisplayMv = item.marketValue > 0 ? (dupFxRate !== 1 ? (item.marketValue * dupFxRate).toFixed(2) : item.marketValue) : '';
  elements.itemPrice.value = dupDisplayPrice;
  if (elements.itemMarketValue) elements.itemMarketValue.value = dupDisplayMv;
  elements.purchaseLocation.value = item.purchaseLocation || '';
  elements.storageLocation.value = item.storageLocation && item.storageLocation !== 'Unknown' ? item.storageLocation : '';
  if (elements.itemSerialNumber) elements.itemSerialNumber.value = item.serialNumber || '';
  if (elements.itemNotes) elements.itemNotes.value = item.notes || '';
  elements.itemDate.value = item.date || todayStr();
  if (elements.itemCatalog) elements.itemCatalog.value = item.numistaId || '';
  if (elements.itemYear) elements.itemYear.value = item.year || item.issuedYear || '';
  if (elements.itemGrade) elements.itemGrade.value = item.grade || '';
  if (elements.itemGradingAuthority) elements.itemGradingAuthority.value = item.gradingAuthority || '';
  if (elements.itemCertNumber) elements.itemCertNumber.value = item.certNumber || '';
  if (elements.itemPcgsNumber) elements.itemPcgsNumber.value = item.pcgsNumber || '';
  if (elements.itemSerial) elements.itemSerial.value = ''; // Serial should be unique per item

  // Pre-fill purity (same logic as editItem)
  const dupPurity = parseFloat(item.purity) || 1.0;
  const dupPuritySelect = elements.itemPuritySelect || document.getElementById('itemPuritySelect');
  const dupPurityCustom = elements.purityCustomWrapper || document.getElementById('purityCustomWrapper');
  const dupPurityInput = elements.itemPurity || document.getElementById('itemPurity');
  if (dupPuritySelect) {
    const presetOpt = Array.from(dupPuritySelect.options).find(o => o.value !== 'custom' && parseFloat(o.value) === dupPurity);
    if (presetOpt) {
      dupPuritySelect.value = presetOpt.value;
      if (dupPurityCustom) dupPurityCustom.style.display = 'none';
      if (dupPurityInput) dupPurityInput.value = '';
    } else {
      dupPuritySelect.value = 'custom';
      if (dupPurityCustom) dupPurityCustom.style.display = '';
      if (dupPurityInput) dupPurityInput.value = dupPurity;
    }
  }

  // Hide PCGS verified icon — duplicate is a new unverified item
  const certVerifiedIcon = document.getElementById('certVerifiedIcon');
  if (certVerifiedIcon) certVerifiedIcon.style.display = 'none';

  // Update currency symbols in modal (STACK-50)
  if (typeof updateModalCurrencyUI === 'function') updateModalCurrencyUI();

  // Open unified modal
  if (window.openModalById) openModalById('itemModal');
  else if (elements.itemModal) elements.itemModal.style.display = 'flex';
};

/**
 * Toggles collectable status for inventory item
 * Legacy function — now a no-op stub. The collectable toggle has been removed
 * from the UI in the portfolio redesign. Kept to prevent runtime errors.
 *
 * @param {number} idx - Index of item (unused)
*/
const toggleCollectable = (idx) => {
  // No-op: collectable toggle removed in portfolio redesign
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

        const supportedMetals = ['Silver', 'Gold', 'Platinum', 'Palladium'];
        const skippedNonPM = [];

        for (const row of results.data) {
          processed++;
          debugLog('importCsv row', processed, JSON.stringify(row));
          const compositionRaw = row['Composition'] || row['Metal'] || 'Silver';
          const composition = getCompositionFirstWords(compositionRaw);
          const metal = parseNumistaMetal(composition);

          // Skip non-precious-metal items
          if (!supportedMetals.includes(metal)) {
            const rowName = row['Name'] || row['name'] || `Row ${processed}`;
            skippedNonPM.push(`${rowName} (${compositionRaw})`);
            updateImportProgress(processed, importedCount, totalRows);
            continue;
          }

          const name = row['Name'] || row['name'];
          const qty = row['Qty'] || row['qty'] || 1;
          const type = normalizeType(row['Type'] || row['type']);
          const weight = row['Weight(oz)'] || row['weight'];
          const weightUnit = row['Weight Unit'] || row['weightUnit'] || 'oz';
          const priceStr = row['Purchase Price'] || row['price'];
          let price = typeof priceStr === 'string'
            ? parseFloat(priceStr.replace(/[^\d.-]+/g, ''))
            : parseFloat(priceStr);
          if (price < 0) price = 0;
          const purchaseLocation = row['Purchase Location'] || '';
          const storageLocation = row['Storage Location'] || '';
          const notes = row['Notes'] || '';
          const year = row['Year'] || row['year'] || row['issuedYear'] || '';
          const grade = row['Grade'] || row['grade'] || '';
          const gradingAuthority = row['Grading Authority'] || row['gradingAuthority'] || row['Authority'] || '';
          const certNumber = (row['Cert #'] || row['certNumber'] || row['Cert Number'] || '').toString();
          const date = parseDate(row['Date']);

          // Parse retail price from CSV (backward-compatible with legacy columns)
          const retailStr = row['Retail Price'] || row['Market Value'] || row['marketValue'] || '0';
          const marketValue = typeof retailStr === 'string'
            ? parseFloat(retailStr.replace(/[^\d.-]+/g, '')) || 0
            : parseFloat(retailStr) || 0;

          // Legacy field support for backward compatibility
          const isCollectable = row['Collectable'] === 'Yes' || row['Collectable'] === 'true' || row['isCollectable'] === 'true';

          let spotPriceAtPurchase;
          if (row['Spot Price ($/oz)']) {
            const spotStr = row['Spot Price ($/oz)'].toString();
            spotPriceAtPurchase = parseFloat(spotStr.replace(/[^0-9.-]+/g, ''));
          } else if (row['spotPriceAtPurchase']) {
            spotPriceAtPurchase = parseFloat(row['spotPriceAtPurchase']);
          } else {
            spotPriceAtPurchase = 0;
          }

          const premiumPerOz = 0;
          const totalPremium = 0;

          const numistaRaw = (row['N#'] || row['Numista #'] || row['numistaId'] || '').toString();
          const numistaMatch = numistaRaw.match(/\d+/);
          const numistaId = numistaMatch ? numistaMatch[0] : '';
          const pcgsNumber = (row['PCGS #'] || row['PCGS Number'] || row['pcgsNumber'] || '').toString().trim();
          const purityRaw = row['Purity'] || row['Fineness'] || row['purity'] || '';
          const purity = parseFloat(purityRaw) || 1.0;
          const serialNumber = row['Serial Number'] || row['serialNumber'] || '';
          const serial = row['Serial'] || row['serial'] || getNextSerial();
          const uuid = row['UUID'] || row['uuid'] || generateUUID();
          const obverseImageUrl = row['Obverse Image URL'] || row['obverseImageUrl'] || '';
          const reverseImageUrl = row['Reverse Image URL'] || row['reverseImageUrl'] || '';

          addCompositionOption(composition);

          const item = sanitizeImportedItem({
            metal,
            composition,
            name,
            qty,
            type,
            weight,
            weightUnit,
            price,
            marketValue,
            date,
            purchaseLocation,
            storageLocation,
            notes,
            year,
            grade,
            gradingAuthority,
            certNumber,
            pcgsNumber,
            purity,
            spotPriceAtPurchase,
            premiumPerOz,
            totalPremium,
            isCollectable: false,
            numistaId,
            serialNumber,
            serial,
            uuid,
            obverseImageUrl,
            reverseImageUrl
          });

          imported.push(item);
          importedCount++;
          updateImportProgress(processed, importedCount, totalRows);
        }

        endImportProgress();

        // Report skipped non-precious-metal items
        if (skippedNonPM.length > 0) {
          alert(`${skippedNonPM.length} item(s) skipped: no precious metal content\n\n${skippedNonPM.join('\n')}`);
        }

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
        if (typeof updateStorageStats === 'function') {
          updateStorageStats();
        }
        debugLog('importCsv complete', deduped.length, 'items added');
        if (localStorage.getItem('staktrakr.debug') && typeof window.showDebugModal === 'function') {
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
        const supportedMetals = ['Silver', 'Gold', 'Platinum', 'Palladium'];
        const skippedNonPM = [];
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

          // Skip non-precious-metal items (Paper, Alloy, Copper, Nickel, etc.)
          if (!supportedMetals.includes(metal)) {
            skippedNonPM.push(`${name || `Row ${processed}`} (${compositionRaw || 'unknown'})`);
            updateImportProgress(processed, importedCount, totalRows);
            continue;
          }

          const qty = parseInt(getValue(row, ['Quantity', 'Qty', 'Quantity owned']) || 1, 10);

          let type = normalizeType(mapNumistaType(getValue(row, ['Type']) || ''));

          const weightCols = Object.keys(row).filter(k => { const key = k.toLowerCase(); return key.includes('weight') || key.includes('mass'); });
          let weightGrams = 0;
          for (const col of weightCols) {
            const val = parseFloat(String(row[col]).replace(/[^0-9.]/g, ''));
            if (!isNaN(val)) weightGrams = Math.max(weightGrams, val);
          }
          const weight = parseFloat(gramsToOzt(weightGrams).toFixed(6));

          const isCollectable = false;

          const priceKey = Object.keys(row).find(k => /^(buying price|purchase price|price paid)/i.test(k));
          const estimateKey = Object.keys(row).find(k => /^estimate/i.test(k));
          const parsePriceField = (key) => {
            const rawVal = String(row[key] ?? '').trim();
            const valueCurrency = detectCurrency(rawVal);
            const headerCurrencyMatch = key.match(/\(([^)]+)\)/);
            const headerCurrency = headerCurrencyMatch ? headerCurrencyMatch[1] : displayCurrency;
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

          const spotPriceAtPurchase = 0;
          const premiumPerOz = 0;
          const totalPremium = 0;
          const serial = getNextSerial();
          const uuid = generateUUID();

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
            year: issuedYear,
            grade: '',
            gradingAuthority: '',
            certNumber: '',
            pcgsNumber: '',
            serial,
            uuid
          });

          imported.push(item);
          importedCount++;
          updateImportProgress(processed, importedCount, totalRows);
        }

        endImportProgress();

        // Report skipped non-precious-metal items
        if (skippedNonPM.length > 0) {
          alert(`${skippedNonPM.length} item(s) skipped: no precious metal content\n\n${skippedNonPM.join('\n')}`);
        }

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
    `Buying price (${displayCurrency})`,
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
    const year = item.year || item.issuedYear || '';
    let title = item.name || '';
    if (year) {
      const yearRegex = new RegExp(`\\s*${String(year).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
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
    "Date","Metal","Type","Name","Year","Qty","Weight(oz)","Weight Unit","Purity",
    "Purchase Price","Melt Value","Retail Price","Gain/Loss",
    "Purchase Location","N#","PCGS #","Grade","Grading Authority","Cert #","Serial Number","Notes","UUID",
    "Obverse Image URL","Reverse Image URL"
  ];

  const sortedInventory = sortInventoryByDateNewestFirst();
  const rows = [];

  for (const i of sortedInventory) {
    const currentSpot = spotPrices[i.metal.toLowerCase()] || 0;
    const qty = Number(i.qty) || 1;
    const meltValue = computeMeltValue(i, currentSpot);
    const gbDenomPrice = (typeof getGoldbackRetailPrice === 'function') ? getGoldbackRetailPrice(i) : null;
    const isManualRetail = !gbDenomPrice && i.marketValue && i.marketValue > 0;
    const retailTotal = gbDenomPrice   ? gbDenomPrice * qty
                      : isManualRetail ? i.marketValue * qty
                      : meltValue;
    const purchasePrice = typeof i.price === 'number' ? i.price : parseFloat(i.price) || 0;
    const purchaseTotal = purchasePrice * qty;
    const gainLoss = (currentSpot > 0 || isManualRetail || gbDenomPrice) ? retailTotal - purchaseTotal : null;

    rows.push([
      i.date,
      i.metal || 'Silver',
      i.type,
      i.name,
      i.year || '',
      i.qty,
      parseFloat(i.weight).toFixed(4),
      i.weightUnit || 'oz',
      parseFloat(i.purity) || 1.0,
      formatCurrency(purchasePrice),
      currentSpot > 0 ? formatCurrency(meltValue) : '—',
      formatCurrency(i.marketValue || 0),
      gainLoss !== null ? formatCurrency(gainLoss) : '—',
      i.purchaseLocation,
      i.numistaId || '',
      i.pcgsNumber || '',
      i.grade || '',
      i.gradingAuthority || '',
      i.certNumber || '',
      i.serialNumber || '',
      i.notes || '',
      i.uuid || '',
      i.obverseImageUrl || '',
      i.reverseImageUrl || ''
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
      const skippedNonPM = [];
      const supportedMetals = ['Silver', 'Gold', 'Platinum', 'Palladium'];
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

        // Skip non-precious-metal items
        if (!supportedMetals.includes(metal)) {
          const itemName = raw.name || `Item ${index + 1}`;
          skippedNonPM.push(`${itemName} (${compositionRaw})`);
          updateImportProgress(processed, importedCount, totalItems);
          continue;
        }

        const name = raw.name || '';
        const qty = parseInt(raw.qty ?? raw.quantity ?? 1, 10);
        const type = normalizeType(raw.type || raw.itemType || 'Other');
        const weight = parseFloat(raw.weight ?? raw.weightOz ?? 0);
        const weightUnit = raw.weightUnit || raw['Weight Unit'] || 'oz';
        const purity = parseFloat(raw.purity ?? raw['Purity'] ?? raw['Fineness'] ?? 1.0) || 1.0;
        const priceStr = raw.price ?? raw.purchasePrice ?? 0;
        let price = typeof priceStr === 'string'
          ? parseFloat(priceStr.replace(/[^\d.-]+/g, ''))
          : parseFloat(priceStr);
        if (price < 0) price = 0;
        const purchaseLocation = raw.purchaseLocation || '';
        const storageLocation = raw.storageLocation || 'Unknown';
        const notes = raw.notes || '';
        const year = (raw.year || raw.issuedYear || '').toString().trim();
        const grade = (raw.grade || '').toString().trim();
        const gradingAuthority = (raw.gradingAuthority || raw.authority || '').toString().trim();
        const certNumber = (raw.certNumber || '').toString().trim();
        const pcgsNumber = (raw.pcgsNumber || raw['PCGS #'] || raw['PCGS Number'] || '').toString().trim();
        const pcgsVerified = raw.pcgsVerified || false;
        const date = parseDate(raw.date);

        // Parse marketValue (retail price), backward-compatible with legacy fields
        const marketValue = parseFloat(raw.marketValue ?? raw.retailPrice ?? 0) || 0;

        // Legacy field support for backward compatibility
        let spotPriceAtPurchase;
        if (raw.spotPriceAtPurchase) {
          spotPriceAtPurchase = parseFloat(raw.spotPriceAtPurchase);
        } else if (raw.spotPrice || raw.spot) {
          spotPriceAtPurchase = parseFloat(raw.spotPrice || raw.spot);
        } else {
          spotPriceAtPurchase = 0;
        }

        const premiumPerOz = 0;
        const totalPremium = 0;

        const numistaRaw = (raw.numistaId || raw.numista || raw['N#'] || '').toString();
        const numistaMatch = numistaRaw.match(/\d+/);
        const numistaId = numistaMatch ? numistaMatch[0] : '';
        const serial = raw.serial || getNextSerial();
        const uuid = raw.uuid || generateUUID();
        const obverseImageUrl = raw.obverseImageUrl || raw['Obverse Image URL'] || '';
        const reverseImageUrl = raw.reverseImageUrl || raw['Reverse Image URL'] || '';

        const processedItem = sanitizeImportedItem({
          metal,
          composition,
          name,
          qty,
          type,
          weight,
          weightUnit,
          price,
          marketValue,
          date,
          purchaseLocation,
          storageLocation,
          notes,
          spotPriceAtPurchase,
          premiumPerOz,
          totalPremium,
          isCollectable: false,
          numistaId,
          year,
          grade,
          gradingAuthority,
          certNumber,
          pcgsNumber,
          pcgsVerified,
          purity,
          serial,
          uuid,
          obverseImageUrl,
          reverseImageUrl
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

      // Report skipped non-precious-metal items
      if (skippedNonPM.length > 0) {
        alert(`${skippedNonPM.length} item(s) skipped: no precious metal content\n\n${skippedNonPM.join('\n')}`);
      }

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
      if (typeof updateStorageStats === "function") {
        updateStorageStats();
      }
      debugLog('importJson complete', deduped.length, 'items added');
      if (localStorage.getItem('staktrakr.debug') && typeof window.showDebugModal === 'function') {
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

  const sortedInventory = sortInventoryByDateNewestFirst();

  const exportData = sortedInventory.map(item => ({
    date: item.date,
    metal: item.metal,
    type: item.type,
    name: item.name,
    year: item.year || '',
    qty: item.qty,
    weight: item.weight,
    weightUnit: item.weightUnit || 'oz',
    purity: parseFloat(item.purity) || 1.0,
    price: item.price,
    marketValue: item.marketValue || 0,
    purchaseLocation: item.purchaseLocation,
    storageLocation: item.storageLocation,
    notes: item.notes,
    numistaId: item.numistaId,
    grade: item.grade || '',
    gradingAuthority: item.gradingAuthority || '',
    certNumber: item.certNumber || '',
    serialNumber: item.serialNumber || '',
    pcgsNumber: item.pcgsNumber || '',
    pcgsVerified: item.pcgsVerified || false,
    serial: item.serial,
    uuid: item.uuid,
    obverseImageUrl: item.obverseImageUrl || '',
    reverseImageUrl: item.reverseImageUrl || '',
    // Legacy fields preserved for backward compatibility
    spotPriceAtPurchase: item.spotPriceAtPurchase,
    isCollectable: item.isCollectable,
    composition: item.composition
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
};

/**
 * Exports current inventory to PDF format
 */
const exportPdf = () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('landscape');

  // Sort inventory by date (newest first) for export
  const sortedInventory = sortInventoryByDateNewestFirst();

  // Add title
  doc.setFontSize(16);
  doc.text("StakTrakr", 14, 15);

  // Add date
  doc.setFontSize(10);
  doc.text(`Exported: ${typeof formatTimestamp === 'function' ? formatTimestamp(new Date()) : new Date().toLocaleString()}`, 14, 22);

  // Prepare table data with computed portfolio columns
  const tableData = sortedInventory.map(item => {
    const currentSpot = spotPrices[item.metal.toLowerCase()] || 0;
    const qty = Number(item.qty) || 1;
    const meltValue = computeMeltValue(item, currentSpot);
    const gbDenomPrice = (typeof getGoldbackRetailPrice === 'function') ? getGoldbackRetailPrice(item) : null;
    const isManualRetail = !gbDenomPrice && item.marketValue && item.marketValue > 0;
    const retailTotal = gbDenomPrice   ? gbDenomPrice * qty
                      : isManualRetail ? item.marketValue * qty
                      : meltValue;
    const purchasePrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
    const purchaseTotal = purchasePrice * qty;
    const gainLoss = (currentSpot > 0 || isManualRetail || gbDenomPrice) ? retailTotal - purchaseTotal : null;

    return [
      item.date,
      item.metal,
      item.type,
      item.name,
      item.qty,
      formatWeight(item.weight, item.weightUnit),
      parseFloat(item.purity) || 1.0,
      formatCurrency(purchasePrice),
      currentSpot > 0 ? formatCurrency(meltValue) : '—',
      formatCurrency(retailTotal),
      gainLoss !== null ? formatCurrency(gainLoss) : '—',
      item.purchaseLocation,
      item.numistaId || '',
      item.pcgsNumber || '',
      item.grade || '',
      item.gradingAuthority || '',
      item.certNumber || '',
      item.notes || '',
      (item.uuid || '').slice(0, 8)
    ];
  });

  // Add table
  doc.autoTable({
    head: [['Date', 'Metal', 'Type', 'Name', 'Qty', 'Weight', 'Purity', 'Purchase',
            'Melt Value', 'Retail', 'Gain/Loss', 'Location', 'N#', 'PCGS#', 'Grade', 'Auth', 'Cert#', 'Notes', 'UUID']],
    body: tableData,
    startY: 30,
    theme: 'striped',
    styles: { fontSize: 7 },
    headStyles: { fillColor: [25, 118, 210] }
  });

  // Add totals
  const finalY = doc.lastAutoTable.finalY || 30;

  // Helper to safely read element text
  const txt = (el) => (el && el.textContent) || '—';

  // Add totals section
  doc.setFontSize(12);
  doc.text("Portfolio Summary", 14, finalY + 10);

  // Silver Totals
  doc.setFontSize(10);
  doc.text("Silver:", 14, finalY + 16);
  doc.text(`Items: ${txt(elements.totals.silver.items)}`, 25, finalY + 22);
  doc.text(`Weight: ${txt(elements.totals.silver.weight)} oz`, 25, finalY + 28);
  doc.text(`Purchase: ${txt(elements.totals.silver.purchased)}`, 25, finalY + 34);
  doc.text(`Melt Value: ${txt(elements.totals.silver.value)}`, 25, finalY + 40);
  doc.text(`Retail: ${txt(elements.totals.silver.retailValue)}`, 25, finalY + 46);
  doc.text(`Gain/Loss: ${txt(elements.totals.silver.lossProfit)}`, 25, finalY + 52);

  // Gold Totals
  doc.text("Gold:", 100, finalY + 16);
  doc.text(`Items: ${txt(elements.totals.gold.items)}`, 111, finalY + 22);
  doc.text(`Weight: ${txt(elements.totals.gold.weight)} oz`, 111, finalY + 28);
  doc.text(`Purchase: ${txt(elements.totals.gold.purchased)}`, 111, finalY + 34);
  doc.text(`Melt Value: ${txt(elements.totals.gold.value)}`, 111, finalY + 40);
  doc.text(`Retail: ${txt(elements.totals.gold.retailValue)}`, 111, finalY + 46);
  doc.text(`Gain/Loss: ${txt(elements.totals.gold.lossProfit)}`, 111, finalY + 52);

  // Platinum Totals
  doc.text("Platinum:", 186, finalY + 16);
  doc.text(`Items: ${txt(elements.totals.platinum.items)}`, 197, finalY + 22);
  doc.text(`Weight: ${txt(elements.totals.platinum.weight)} oz`, 197, finalY + 28);
  doc.text(`Purchase: ${txt(elements.totals.platinum.purchased)}`, 197, finalY + 34);
  doc.text(`Melt Value: ${txt(elements.totals.platinum.value)}`, 197, finalY + 40);
  doc.text(`Retail: ${txt(elements.totals.platinum.retailValue)}`, 197, finalY + 46);
  doc.text(`Gain/Loss: ${txt(elements.totals.platinum.lossProfit)}`, 197, finalY + 52);

  // Palladium Totals
  doc.text("Palladium:", 14, finalY + 60);
  doc.text(`Items: ${txt(elements.totals.palladium.items)}`, 25, finalY + 66);
  doc.text(`Weight: ${txt(elements.totals.palladium.weight)} oz`, 25, finalY + 72);
  doc.text(`Purchase: ${txt(elements.totals.palladium.purchased)}`, 25, finalY + 78);
  doc.text(`Melt Value: ${txt(elements.totals.palladium.value)}`, 25, finalY + 84);
  doc.text(`Retail: ${txt(elements.totals.palladium.retailValue)}`, 25, finalY + 90);
  doc.text(`Gain/Loss: ${txt(elements.totals.palladium.lossProfit)}`, 25, finalY + 96);

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
window.duplicateItem = duplicateItem;
window.deleteItem = deleteItem;
window.showNotes = showNotes;

/**
 * Opens a read-only notes viewer for the given inventory index.
 * @param {number} idx - Inventory array index
 */
const showNotesView = (idx) => {
  const item = inventory[idx];
  if (!item) return;
  const titleEl = document.getElementById('notesViewTitle');
  const contentEl = document.getElementById('notesViewContent');
  const editBtn = document.getElementById('notesViewEditBtn');
  if (!contentEl) return;

  if (titleEl) titleEl.textContent = item.name ? `Notes — ${item.name}` : 'Notes';
  contentEl.textContent = item.notes || '(no notes)';

  // Wire edit button to open the full item edit modal
  if (editBtn) {
    editBtn.onclick = () => {
      closeModalById('notesViewModal');
      editItem(idx);
    };
  }

  openModalById('notesViewModal');
};
window.showNotesView = showNotesView;

/**
 * Delegated click handler for inline tag interactions.
 * Uses data attributes and closest() to prevent XSS
 * when item names contain quotes or special characters.
 */
document.addEventListener('click', (e) => {
  // Notes indicator click → view notes (shift+click → edit item)
  const notesInd = e.target.closest('.notes-indicator');
  if (notesInd) {
    e.preventDefault();
    e.stopPropagation();
    const tr = notesInd.closest('tr[data-idx]');
    if (!tr) return;
    const idx = parseInt(tr.dataset.idx, 10);
    if (isNaN(idx)) return;
    if (e.shiftKey) {
      editItem(idx);
    } else {
      showNotesView(idx);
    }
    return;
  }

  // PCGS verify button click → call PCGS API for cert verification
  const verifyBtn = e.target.closest('.pcgs-verify-btn');
  if (verifyBtn) {
    e.preventDefault();
    e.stopPropagation();
    const certNum = verifyBtn.dataset.certNumber || '';
    if (!certNum || typeof verifyPcgsCert !== 'function') return;

    const tr = verifyBtn.closest('tr[data-idx]');
    const idx = tr ? parseInt(tr.dataset.idx, 10) : -1;

    verifyBtn.classList.add('pcgs-verifying');
    verifyBtn.title = 'Verifying...';

    verifyPcgsCert(certNum).then(result => {
      verifyBtn.classList.remove('pcgs-verifying');
      if (result.verified) {
        verifyBtn.classList.add('pcgs-verified');
        if (idx >= 0 && inventory[idx]) {
          inventory[idx].pcgsVerified = true;
          saveInventory();
        }
        const parts = [];
        if (result.grade) parts.push(`Grade: ${result.grade}`);
        if (result.population) parts.push(`Pop: ${result.population}`);
        if (result.popHigher) parts.push(`Pop Higher: ${result.popHigher}`);
        if (result.priceGuide) parts.push(`Price Guide: $${Number(result.priceGuide).toLocaleString()}`);
        verifyBtn.title = `Verified — ${parts.join(' | ')}`;
      } else {
        verifyBtn.title = result.error || 'Verification failed';
        verifyBtn.classList.add('pcgs-verify-failed');
        setTimeout(() => verifyBtn.classList.remove('pcgs-verify-failed'), 3000);
      }
    });
    return;
  }

  // Numista N# tag click → open Numista in popup window
  const numistaTag = e.target.closest('.numista-tag');
  if (numistaTag) {
    e.preventDefault();
    e.stopPropagation();
    const nId = numistaTag.dataset.numistaId;
    const coinName = numistaTag.dataset.coinName || '';
    if (nId && typeof openNumistaModal === 'function') {
      openNumistaModal(nId, coinName);
    }
    return;
  }

  // PCGS# tag click → open PCGS CoinFacts in popup window
  const pcgsTagEl = e.target.closest('.pcgs-tag');
  if (pcgsTagEl) {
    e.preventDefault();
    e.stopPropagation();
    const pcgsNo = pcgsTagEl.dataset.pcgsNumber || '';
    const gradeNum = (pcgsTagEl.dataset.grade || '').match(/\d+/)?.[0] || '';
    if (pcgsNo) {
      const url = `https://www.pcgs.com/coinfacts/coin/detail/${encodeURIComponent(pcgsNo)}/${encodeURIComponent(gradeNum)}`;
      const popup = window.open(url, `pcgs_${pcgsNo}`,
        'width=1250,height=800,scrollbars=yes,resizable=yes,toolbar=no,location=no,menubar=no,status=no');
      if (!popup) {
        alert(`Popup blocked! Please allow popups or manually visit:\n${url}`);
      } else {
        popup.focus();
      }
    }
    return;
  }

  // Grade tag click → open cert verification URL
  const gradeTag = e.target.closest('.grade-tag[data-clickable="true"]');
  if (gradeTag) {
    e.preventDefault();
    e.stopPropagation();
    const authority = gradeTag.dataset.authority || '';
    const certNum = gradeTag.dataset.certNumber || '';
    if (authority && typeof CERT_LOOKUP_URLS !== 'undefined' && CERT_LOOKUP_URLS[authority]) {
      let url = CERT_LOOKUP_URLS[authority].replaceAll('{certNumber}', encodeURIComponent(certNum));
      const gradeNum = (gradeTag.dataset.grade || '').match(/\d+/)?.[0] || '';
      url = url.replace('{grade}', encodeURIComponent(gradeNum));
      const popup = window.open(url, `cert_${authority}_${certNum || Date.now()}`,
        'width=1250,height=800,scrollbars=yes,resizable=yes,toolbar=no,location=no,menubar=no,status=no');
      if (!popup) {
        alert(`Popup blocked! Please allow popups or manually visit:\n${url}`);
      } else {
        popup.focus();
      }
    }
    return;
  }

  const buyLink = e.target.closest('.ebay-buy-link');
  if (buyLink) {
    e.preventDefault();
    e.stopPropagation();
    openEbayBuySearch(buyLink.dataset.search);
    return;
  }
  const soldLink = e.target.closest('.ebay-sold-link');
  if (soldLink) {
    e.preventDefault();
    e.stopPropagation();
    openEbaySoldSearch(soldLink.dataset.search);
    return;
  }
});

/**
 * Shift+click inline editing — power user shortcut for editable cells.
 * Capture-phase listener intercepts shift+clicks before inline onclick
 * handlers (filterLink) and bubble-phase eBay handlers can fire.
 */
document.addEventListener('click', (e) => {
  if (!e.shiftKey) return;
  const td = e.target.closest('#inventoryTable td[data-column]');
  if (!td) return;
  const EDITABLE = {
    name: 'name',
    qty: 'qty',
    weight: 'weight',
    purchasePrice: 'price',
    retailPrice: 'marketValue',
    purchaseLocation: 'purchaseLocation'
  };
  const field = EDITABLE[td.dataset.column];
  if (!field) return;
  const tr = td.closest('tr[data-idx]');
  if (!tr) return;
  const idx = parseInt(tr.dataset.idx, 10);
  if (isNaN(idx)) return;
  e.preventDefault();
  e.stopPropagation();
  startCellEdit(idx, field, td);
}, true); // capture phase

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

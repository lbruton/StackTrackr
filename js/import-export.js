// /js/import-export.js
// This file will contain the refactored import and export logic.

/**
 * Creates a comprehensive backup ZIP file containing all application data
 * 
 * This function generates a complete backup archive including:
 * - Current inventory data in JSON format
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
async function restoreBackupZip(file) {
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
    errorHandler.showError("Data imported successfully.");
  } catch (err) {
    console.error("Restore failed", err);
    errorHandler.showError("Restore failed: " + err.message);
  }
}

window.restoreBackupZip = restoreBackupZip;

/**
 * Imports inventory data from CSV file with comprehensive validation and error handling
 * 
 * @param {File} file - CSV file selected by user through file input
 * @param {boolean} [override=false] - Replace existing inventory instead of merging
 */
const importCsv = (file, override = false) => {
  try {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        const imported = [];
        const skipped = [];
        const totalRows = results.data.length;
        startImportProgress(totalRows);
        let processed = 0;
        let importedCount = 0;

        for (const row of results.data) {
          processed++;
          const result = dataProcessor.process(row);
          if (result.isValid) {
            imported.push(result.item);
            importedCount++;
          } else {
            skipped.push({ row, errors: result.errors });
          }
          updateImportProgress(processed, importedCount, totalRows);
        }

        endImportProgress();

        if (skipped.length > 0) {
          let message = 'Some items were skipped during import:\n';
          skipped.forEach(s => {
            message += `\nRow: ${JSON.stringify(s.row)}\nErrors: ${s.errors.join(', ')}`;
          });
          errorHandler.showError(message);
        }

        if (imported.length === 0) return errorHandler.showError('No items to import.');

        // Improved duplicate detection: use serial, name, date (not just numistaId)
        const existingSerials = new Set(override ? [] : inventory.map(item => item.serial));
        const existingKeys = new Set(
          (override ? [] : inventory)
            .map(item => `${item.serial}|${item.name}|${item.date}`)
        );
        const deduped = [];
        let duplicateCount = 0;

        for (const item of imported) {
          const key = `${item.serial}|${item.name}|${item.date}`;
          if (existingSerials.has(item.serial) || existingKeys.has(key)) {
            duplicateCount++;
            continue;
          }
          existingSerials.add(item.serial);
          existingKeys.add(key);
          deduped.push(item);
        }

        if (duplicateCount > 0) {
          console.info(`${duplicateCount} duplicate items skipped during import.`);
        }

        if (deduped.length === 0) return errorHandler.showError('No items to import.');

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
        if (typeof updateStorageStats === 'function') {
          updateStorageStats();
        }

        this.value = '';
      },
      error: function(error) {
        endImportProgress();
        errorHandler.handle(error, 'CSV import');
      }
    });
  } catch (error) {
    endImportProgress();
    errorHandler.handle(error, 'CSV import initialization');
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
          if (type === 'Bar' || type === 'Round') {
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
          if (priceKey) {
            purchasePrice = parsePriceField(priceKey);
          } else if (estimateKey) {
            purchasePrice = parsePriceField(estimateKey);
          }

          const purchaseLocRaw = getValue(row, ['Acquisition place', 'Acquired from', 'Purchase place']);
          const purchaseLocation = purchaseLocRaw && purchaseLocRaw.trim() ? purchaseLocRaw.trim() : '—';
          const storageLocRaw = getValue(row, ['Storage location', 'Stored at', 'Storage place']);
          const storageLocation = storageLocRaw && storageLocRaw.trim() ? storageLocRaw.trim() : '—';

          const dateStrRaw = getValue(row, ['Acquisition date', 'Date acquired', 'Date']);
          const dateStr = dateStrRaw && dateStrRaw.trim() ? dateStrRaw.trim() : '—';
          let date = parseDate(dateStr);
          // If parseDate returns blank or '—', preserve the original value
          if (!date || date === '—') {
            date = dateStr || '—';
          }
          // Additional validation: if formatDisplayDate would convert this to '—', 
          // store '—' directly to maintain consistency between import and display
          if (date && date !== '—' && formatDisplayDate(date) === '—') {
            date = '—';
          }

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

        if (imported.length === 0) return errorHandler.showError('No items to import.');

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

        if (deduped.length === 0) return errorHandler.showError('No items to import.');

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
        if (typeof updateStorageStats === 'function') {
          updateStorageStats();
        }
      } catch (error) {
        endImportProgress();
        errorHandler.handle(error, 'Numista CSV import');
      }
    };
    reader.onerror = (error) => {
      endImportProgress();
      errorHandler.handle(error, 'Numista CSV import');
    };
    reader.readAsText(file);
  } catch (error) {
    endImportProgress();
    errorHandler.handle(error, 'Numista CSV import initialization');
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
};

/**
 * Imports inventory data from JSON file
 *
 * @param {File} file - JSON file to import
 * @param {boolean} [override=false] - Replace existing inventory instead of merging
 */
const importJson = (file, override = false) => {
  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);

      // Validate data structure
      if (!Array.isArray(data)) {
        return errorHandler.showError("Invalid JSON format. Expected an array of inventory items.");
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
        let date = parseDate(raw.date);
        // If parseDate returns blank or '—', preserve the original value
        if (!date || date === '—') {
          date = raw.date || '—';
        }
        // Additional validation: if formatDisplayDate would convert this to '—', 
        // store '—' directly to maintain consistency between import and display
        if (date && date !== '—' && formatDisplayDate(date) === '—') {
          date = '—';
        }
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
        errorHandler.showError('Skipped entries:\n' + skippedDetails.join('\n'));
      }

      if (imported.length === 0) {
        return errorHandler.showError("No valid items found in JSON file.");
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
        return errorHandler.showError('No items to import.');
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
      if (typeof updateStorageStats === "function") {
        updateStorageStats();
      }
    } catch (error) {
      endImportProgress();
      errorHandler.showError("Error parsing JSON file: " + error.message);
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

// Expose import/export functions globally
window.importCsv = importCsv;
window.importJson = importJson;
window.importNumistaCsv = importNumistaCsv;
window.exportCsv = exportCsv;
window.exportJson = exportJson;
window.exportNumistaCsv = exportNumistaCsv;
window.exportPdf = exportPdf;

console.log("✓ All import/export functions exposed globally");

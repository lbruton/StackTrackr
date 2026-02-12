// ITEM PRICE HISTORY (STACK-43)
// =============================================================================
// Silent per-item price history recording.
// Mirrors the spotHistory pattern in spot.js: save/load/record/purge with dedup.
// Data structure: { "uuid": [{ ts, retail, spot, melt }, ...], ... }
// =============================================================================

/**
 * Saves item price history to localStorage.
 */
const saveItemPriceHistory = () => {
  try {
    saveDataSync(ITEM_PRICE_HISTORY_KEY, itemPriceHistory);
  } catch (error) {
    console.error('Error saving item price history:', error);
  }
};

/**
 * Loads item price history from localStorage into the global state variable.
 */
const loadItemPriceHistory = () => {
  try {
    const data = loadDataSync(ITEM_PRICE_HISTORY_KEY, {});
    itemPriceHistory = (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
  } catch (error) {
    console.error('Error loading item price history:', error);
    itemPriceHistory = {};
  }
};

/**
 * Removes item price history entries older than the specified number of days.
 * Not called automatically — available for future settings UI.
 *
 * @param {number} days - Number of days to retain (default: 365)
 */
const purgeItemPriceHistory = (days = 365) => {
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  let changed = false;

  for (const uuid of Object.keys(itemPriceHistory)) {
    const before = itemPriceHistory[uuid].length;
    itemPriceHistory[uuid] = itemPriceHistory[uuid].filter(e => e.ts >= cutoff);
    if (itemPriceHistory[uuid].length === 0) {
      delete itemPriceHistory[uuid];
      changed = true;
    } else if (itemPriceHistory[uuid].length !== before) {
      changed = true;
    }
  }

  if (changed) saveItemPriceHistory();
};

/**
 * Records a single price data point for an inventory item.
 * Applies deduplication rules:
 *   - add/edit/bulk: skip exact duplicates only (same retail + spot + melt)
 *   - spot-sync: 24h throttle if retail unchanged; beyond 24h, require >1% delta
 *
 * Does NOT save to localStorage — caller must batch saves.
 *
 * @param {Object} item - Inventory item (must have uuid, metal, weight, qty, purity, marketValue)
 * @param {string} trigger - Recording trigger: 'add' | 'edit' | 'bulk' | 'spot-sync'
 * @returns {boolean} True if a data point was recorded
 */
const recordItemPrice = (item, trigger = 'spot-sync') => {
  if (!item || !item.uuid) return false;

  const uuid = item.uuid;
  const metalKey = (item.metal || 'Silver').toLowerCase();
  const spot = spotPrices[metalKey] || 0;
  const melt = parseFloat(computeMeltValue(item, spot).toFixed(2));
  const retail = (item.marketValue && item.marketValue > 0)
    ? parseFloat(item.marketValue)
    : 0;
  const now = Date.now();

  // Initialize array for this UUID if needed
  if (!itemPriceHistory[uuid]) {
    itemPriceHistory[uuid] = [];
  }

  const entries = itemPriceHistory[uuid];
  const last = entries.length > 0 ? entries[entries.length - 1] : null;

  // Dedup for spot-sync trigger (aggressive throttling)
  if (last && trigger === 'spot-sync') {
    const timeSinceLast = now - last.ts;
    const within24h = timeSinceLast < 24 * 60 * 60 * 1000;
    const retailUnchanged = last.retail === retail;

    if (retailUnchanged) {
      // Hard 24h throttle: never record more than once per 24h if retail unchanged
      if (within24h) return false;

      // Beyond 24h: only record if spot or melt changed meaningfully (> 1%)
      const meltDelta = last.melt > 0 ? Math.abs(melt - last.melt) / last.melt : 0;
      const spotDelta = last.spot > 0 ? Math.abs(spot - last.spot) / last.spot : 0;
      if (meltDelta <= 0.01 && spotDelta <= 0.01) return false;
    }
    // If retail changed, always record (falls through)
  }

  // Dedup for add/edit/bulk: skip exact duplicates only
  if (last && trigger !== 'spot-sync') {
    if (last.retail === retail &&
        last.spot === spot &&
        Math.abs(last.melt - melt) < 0.005) {
      return false;
    }
  }

  entries.push({
    ts: now,
    retail: retail,
    spot: spot,
    melt: melt
  });

  return true;
};

/**
 * Records a price data point for a single item and saves immediately.
 * Used after item add, edit, or inline edit.
 *
 * @param {Object} item - Inventory item
 * @param {string} trigger - 'add' | 'edit' | 'bulk'
 */
const recordSingleItemPrice = (item, trigger = 'edit') => {
  if (recordItemPrice(item, trigger)) {
    saveItemPriceHistory();
  }
};

/**
 * Snapshots all inventory items after a spot price change.
 * Applies spot-sync dedup rules (24h throttle, 1% delta).
 * Called after API sync, manual spot update, or spot reset.
 */
const recordAllItemPriceSnapshots = () => {
  if (!inventory || inventory.length === 0) return;

  let anyRecorded = false;
  for (const item of inventory) {
    if (recordItemPrice(item, 'spot-sync')) {
      anyRecorded = true;
    }
  }

  if (anyRecorded) {
    saveItemPriceHistory();
  }
};

/**
 * Merges imported item price history with existing data.
 * Union by UUID + timestamp — deduplicates, sorts ascending.
 * Used during ZIP restore (unlike spot history which does full replace).
 *
 * @param {Object} importedHistory - Object keyed by UUID with arrays of entries
 */
const mergeItemPriceHistory = (importedHistory) => {
  if (!importedHistory || typeof importedHistory !== 'object') return;

  for (const [uuid, entries] of Object.entries(importedHistory)) {
    if (!Array.isArray(entries)) continue;

    if (!itemPriceHistory[uuid]) {
      // New UUID — copy as-is
      itemPriceHistory[uuid] = entries;
    } else {
      // Merge: combine, deduplicate by timestamp, sort ascending
      const combined = [...itemPriceHistory[uuid], ...entries];
      const seen = new Set();
      const deduped = [];
      for (const entry of combined) {
        if (!seen.has(entry.ts)) {
          seen.add(entry.ts);
          deduped.push(entry);
        }
      }
      deduped.sort((a, b) => a.ts - b.ts);
      itemPriceHistory[uuid] = deduped;
    }
  }

  saveItemPriceHistory();
};

/**
 * Removes history for UUIDs not present in the current inventory.
 * Not called automatically — available for storage optimization.
 *
 * @returns {number} Number of orphaned UUIDs removed
 */
const cleanOrphanedItemPriceHistory = () => {
  const activeUuids = new Set(inventory.map(i => i.uuid).filter(Boolean));
  let removed = 0;

  for (const uuid of Object.keys(itemPriceHistory)) {
    if (!activeUuids.has(uuid)) {
      delete itemPriceHistory[uuid];
      removed++;
    }
  }

  if (removed > 0) saveItemPriceHistory();
  return removed;
};

// =============================================================================
// ITEM PRICE HISTORY — SETTINGS LOG TABLE
// =============================================================================

/** @type {string} Filter text for the settings price history table */
let priceHistoryFilterText = '';
/** @type {string} Sort column for settings price history table */
let settingsPriceSortColumn = '';
/** @type {boolean} Sort ascending for settings price history table */
let settingsPriceSortAsc = true;

/** Column keys for the price history table, matching <th> order. */
const PRICE_HISTORY_COLS = ['ts', 'name', 'retail', 'spot', 'melt'];

/**
 * Flattens, filters, and sorts item price history into renderable rows.
 * @returns {Array<Object>} Sorted row objects
 */
const preparePriceHistoryRows = () => {
  loadItemPriceHistory();

  const rows = [];
  for (const [uuid, entries] of Object.entries(itemPriceHistory)) {
    const item = inventory.find(i => i.uuid === uuid);
    const name = item ? (item.name || 'Unnamed') : `(deleted: ${uuid.slice(0, 8)})`;
    for (const e of entries) {
      rows.push({ ts: e.ts, name, retail: e.retail, spot: e.spot, melt: e.melt });
    }
  }

  let data = rows;
  if (priceHistoryFilterText) {
    const f = priceHistoryFilterText.toLowerCase();
    data = data.filter(r => r.name.toLowerCase().includes(f));
  }

  if (settingsPriceSortColumn) {
    data.sort((a, b) => {
      const valA = a[settingsPriceSortColumn];
      const valB = b[settingsPriceSortColumn];
      if (valA < valB) return settingsPriceSortAsc ? -1 : 1;
      if (valA > valB) return settingsPriceSortAsc ? 1 : -1;
      return 0;
    });
  } else {
    data.sort((a, b) => b.ts - a.ts);
  }

  return data;
};

/**
 * Attaches click-to-sort handlers to price history table headers.
 * @param {HTMLTableElement} table
 */
const attachPriceHistorySortHeaders = (table) => {
  table.querySelectorAll('th').forEach(th => {
    th.style.cursor = 'pointer';
    th.onclick = () => {
      const idx = Array.from(th.parentNode.children).indexOf(th);
      const col = PRICE_HISTORY_COLS[idx];
      if (settingsPriceSortColumn === col) {
        settingsPriceSortAsc = !settingsPriceSortAsc;
      } else {
        settingsPriceSortColumn = col;
        settingsPriceSortAsc = true;
      }
      renderItemPriceHistoryTable();
    };
  });
};

/**
 * Renders the item price history table in the Settings > Activity Log > Price History sub-tab.
 */
const renderItemPriceHistoryTable = () => {
  const table = document.getElementById('settingsPriceHistoryTable');
  if (!table) return;

  const data = preparePriceHistoryRows();
  const tbody = table.querySelector('tbody');
  if (!tbody) return;

  if (data.length === 0) {
    const msg = priceHistoryFilterText ? 'No items match the current filter.' : 'No item price history recorded yet.';
    // nosemgrep: javascript.browser.security.insecure-innerhtml.insecure-innerhtml
    tbody.innerHTML = `<tr class="settings-log-empty"><td colspan="5">${msg}</td></tr>`;
    return;
  }

  const fmt = (v) => typeof formatCurrency === 'function' ? formatCurrency(v) : `$${Number(v).toFixed(2)}`;
  const htmlRows = data.map(r => {
    const ts = new Date(r.ts).toLocaleString();
    return `<tr><td>${ts}</td><td>${r.name}</td><td>${fmt(r.retail)}</td><td>${fmt(r.spot)}</td><td>${fmt(r.melt)}</td></tr>`;
  });

  // nosemgrep: javascript.browser.security.insecure-innerhtml.insecure-innerhtml
  tbody.innerHTML = htmlRows.join('');
  attachPriceHistorySortHeaders(table);
};

/**
 * Reads the filter input value and re-renders the price history table.
 */
const filterItemPriceHistoryTable = () => {
  const input = document.getElementById('priceHistoryFilterInput');
  priceHistoryFilterText = input ? input.value : '';
  renderItemPriceHistoryTable();
};

/**
 * Clears all item price history after user confirmation.
 */
const clearItemPriceHistory = () => {
  if (!confirm('Clear all item price history? This cannot be undone.')) return;
  itemPriceHistory = {};
  saveItemPriceHistory();
  const panel = document.getElementById('logPanel_pricehistory');
  if (panel) delete panel.dataset.rendered;
  renderItemPriceHistoryTable();
};

// Ensure global availability
window.renderItemPriceHistoryTable = renderItemPriceHistoryTable;
window.filterItemPriceHistoryTable = filterItemPriceHistoryTable;
window.clearItemPriceHistory = clearItemPriceHistory;

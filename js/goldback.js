// GOLDBACK DENOMINATION PRICING (STACK-45)
// =============================================================================
// Manual-entry pricing for Goldback denominations.
// Follows priceHistory.js patterns: save/load/record with saveDataSync/loadDataSync.
// Data structures:
//   goldbackPrices:       { "1": { price: 5.12, updatedAt: 1707500000000 }, ... }
//   goldbackPriceHistory: { "1": [{ ts: 1707500000000, price: 5.12 }, ...], ... }
// =============================================================================

/**
 * Saves current Goldback denomination prices to localStorage.
 */
const saveGoldbackPrices = () => {
  try {
    saveDataSync(GOLDBACK_PRICES_KEY, goldbackPrices);
  } catch (error) {
    console.error('Error saving Goldback prices:', error);
  }
};

/**
 * Loads Goldback denomination prices from localStorage into global state.
 */
const loadGoldbackPrices = () => {
  try {
    const data = loadDataSync(GOLDBACK_PRICES_KEY, {});
    goldbackPrices = (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
  } catch (error) {
    console.error('Error loading Goldback prices:', error);
    goldbackPrices = {};
  }
};

/**
 * Saves Goldback price history to localStorage.
 */
const saveGoldbackPriceHistory = () => {
  try {
    saveDataSync(GOLDBACK_PRICE_HISTORY_KEY, goldbackPriceHistory);
  } catch (error) {
    console.error('Error saving Goldback price history:', error);
  }
};

/**
 * Loads Goldback price history from localStorage into global state.
 */
const loadGoldbackPriceHistory = () => {
  try {
    const data = loadDataSync(GOLDBACK_PRICE_HISTORY_KEY, {});
    goldbackPriceHistory = (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
  } catch (error) {
    console.error('Error loading Goldback price history:', error);
    goldbackPriceHistory = {};
  }
};

/**
 * Loads the Goldback pricing enabled toggle from localStorage.
 */
const loadGoldbackEnabled = () => {
  try {
    const val = loadDataSync(GOLDBACK_ENABLED_KEY, false);
    goldbackEnabled = val === true;
  } catch (error) {
    console.error('Error loading Goldback enabled state:', error);
    goldbackEnabled = false;
  }
};

/**
 * Saves the Goldback pricing enabled toggle to localStorage.
 * @param {boolean} val - Whether Goldback pricing is enabled
 */
const saveGoldbackEnabled = (val) => {
  goldbackEnabled = val === true;
  try {
    saveDataSync(GOLDBACK_ENABLED_KEY, goldbackEnabled);
  } catch (error) {
    console.error('Error saving Goldback enabled state:', error);
  }
};

/**
 * Appends current denomination prices as timestamped history entries.
 * Called after user saves updated prices in the settings panel.
 */
const recordGoldbackPrices = () => {
  const now = Date.now();

  for (const key of Object.keys(goldbackPrices)) {
    const entry = goldbackPrices[key];
    if (!entry || typeof entry.price !== 'number' || entry.price <= 0) continue;

    if (!goldbackPriceHistory[key]) {
      goldbackPriceHistory[key] = [];
    }

    // Skip exact duplicate of last entry
    const arr = goldbackPriceHistory[key];
    const last = arr.length > 0 ? arr[arr.length - 1] : null;
    if (last && last.price === entry.price) continue;

    arr.push({ ts: now, price: entry.price });
  }

  saveGoldbackPriceHistory();
};

/**
 * Returns the denomination price for a given Goldback weight, or null.
 * @param {number} weightGb - Weight in Goldback denomination units (e.g. 1, 5, 10)
 * @returns {number|null} Per-unit denomination price, or null if not set
 */
const getGoldbackDenominationPrice = (weightGb) => {
  const key = String(weightGb);
  const entry = goldbackPrices[key];
  if (entry && typeof entry.price === 'number' && entry.price > 0) {
    return entry.price;
  }
  return null;
};

/**
 * Returns true if Goldback pricing is active (enabled + has at least one price).
 * @returns {boolean}
 */
const isGoldbackPricingActive = () => {
  if (!goldbackEnabled) return false;
  for (const key of Object.keys(goldbackPrices)) {
    if (goldbackPrices[key] && goldbackPrices[key].price > 0) return true;
  }
  return false;
};

// =============================================================================
// GOLDBACK PRICE HISTORY MODAL
// =============================================================================

/** @type {string} Current filter text for the history table */
let gbHistoryFilterText = '';
/** @type {string} Current sort column */
let gbHistorySortColumn = '';
/** @type {boolean} Sort direction (true = ascending) */
let gbHistorySortAsc = true;

/**
 * Flattens goldbackPriceHistory into a row array for table rendering.
 * Each entry: { denomination, label, price, timestamp }
 */
const flattenGoldbackHistory = () => {
  const rows = [];
  const denomLabels = {};
  if (typeof GOLDBACK_DENOMINATIONS !== 'undefined') {
    for (const d of GOLDBACK_DENOMINATIONS) {
      denomLabels[String(d.weight)] = d.label;
    }
  }

  for (const [key, entries] of Object.entries(goldbackPriceHistory)) {
    if (!Array.isArray(entries)) continue;
    const label = denomLabels[key] || `${key} gb`;
    for (const e of entries) {
      rows.push({
        denomination: key,
        label,
        price: e.price,
        timestamp: e.ts,
        timeStr: new Date(e.ts).toLocaleString(),
      });
    }
  }
  return rows;
};

/**
 * Renders the Goldback history table with filtering and sorting.
 */
const renderGoldbackHistoryTable = () => {
  const table = document.getElementById('goldbackHistoryTable');
  if (!table) return;

  let data = flattenGoldbackHistory();

  // Filter
  if (gbHistoryFilterText) {
    const f = gbHistoryFilterText.toLowerCase();
    data = data.filter(e =>
      Object.values(e).some(v => String(v).toLowerCase().includes(f))
    );
  }

  // Sort
  if (gbHistorySortColumn) {
    data.sort((a, b) => {
      const valA = a[gbHistorySortColumn];
      const valB = b[gbHistorySortColumn];
      if (valA < valB) return gbHistorySortAsc ? -1 : 1;
      if (valA > valB) return gbHistorySortAsc ? 1 : -1;
      return 0;
    });
  } else {
    // Default: newest first
    data.sort((a, b) => b.timestamp - a.timestamp);
  }

  let html = '<tr><th data-column="timestamp">Time</th><th data-column="label">Denomination</th><th data-column="price">Price</th></tr>';
  for (const e of data) {
    html += `<tr><td>${e.timeStr}</td><td>${e.label}</td><td>${typeof formatCurrency === 'function' ? formatCurrency(e.price) : '$' + e.price.toFixed(2)}</td></tr>`;
  }
  table.innerHTML = html;

  // Click-to-sort headers
  table.querySelectorAll('th').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const col = th.dataset.column;
      if (gbHistorySortColumn === col) {
        gbHistorySortAsc = !gbHistorySortAsc;
      } else {
        gbHistorySortColumn = col;
        gbHistorySortAsc = true;
      }
      renderGoldbackHistoryTable();
    });
  });
};

/**
 * Shows the Goldback price history modal.
 */
const showGoldbackHistoryModal = () => {
  const modal = document.getElementById('goldbackHistoryModal');
  if (!modal) return;

  gbHistorySortColumn = '';
  gbHistorySortAsc = true;
  gbHistoryFilterText = '';

  const filterInput = document.getElementById('goldbackHistoryFilter');
  const clearFilterBtn = document.getElementById('goldbackHistoryClearFilterBtn');

  if (filterInput) {
    filterInput.value = '';
    filterInput.oninput = (e) => {
      gbHistoryFilterText = e.target.value;
      renderGoldbackHistoryTable();
    };
  }
  if (clearFilterBtn) {
    clearFilterBtn.onclick = () => {
      gbHistoryFilterText = '';
      if (filterInput) filterInput.value = '';
      renderGoldbackHistoryTable();
    };
  }

  renderGoldbackHistoryTable();

  if (typeof openModalById === 'function') {
    openModalById('goldbackHistoryModal');
  } else {
    modal.style.display = 'flex';
  }
};

/**
 * Hides the Goldback price history modal.
 */
const hideGoldbackHistoryModal = () => {
  if (typeof closeModalById === 'function') {
    closeModalById('goldbackHistoryModal');
  } else {
    const modal = document.getElementById('goldbackHistoryModal');
    if (modal) modal.style.display = 'none';
  }
};

/**
 * Exports Goldback price history as CSV.
 */
const exportGoldbackHistory = () => {
  const data = flattenGoldbackHistory();
  if (data.length === 0) {
    alert('No Goldback price history to export.');
    return;
  }

  // Sort newest first
  data.sort((a, b) => b.timestamp - a.timestamp);

  const csvLines = ['Time,Denomination,Price'];
  for (const e of data) {
    csvLines.push(`"${e.timeStr}","${e.label}","${e.price.toFixed(2)}"`);
  }

  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `goldback-history-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

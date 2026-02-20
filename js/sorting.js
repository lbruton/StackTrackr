// SORTING FUNCTIONALITY
// =============================================================================

/**
 * Sorts inventory based on the current sort column and direction.
 * Handles special cases for date, numeric, boolean, and string columns.
 *
 * @param {Array<InventoryItem>} [data=inventory] - Array of inventory items to sort (defaults to main inventory)
 * @returns {Array<InventoryItem>} Sorted inventory data
 *
 * @example
 * sortInventory([{name: 'A'}, {name: 'B'}]);
 */
const sortInventory = (data = inventory) => {
  if (sortColumn === null) return data;

  // Pre-compute sort values (Schwartzian transform) to avoid recalculation
  const mapped = data.map((item, index) => {
    let value;
    const spot = spotPrices[(item.metal || '').toLowerCase()] || 0;

    switch(sortColumn) {
      case 0: value = item.date; break;
      case 1: value = item.composition || item.metal; break;
      case 2: value = item.type; break;
      case 3: value = 0; break;
      case 4: value = item.name; break;
      case 5: value = item.qty; break;
      case 6: value = parseFloat(item.weight) || 0; break;
      case 7: value = parseFloat(item.price) || 0; break;
      case 8: // Melt Value (computed)
        value = computeMeltValue(item, spot);
        break;
      case 9: { // Retail Price (gbDenom → marketValue → melt, matching render logic)
        const qty = Number(item.qty) || 1;
        const gb = (typeof getGoldbackRetailPrice === 'function') ? getGoldbackRetailPrice(item) : null;
        value = gb ? gb * qty : (item.marketValue && item.marketValue > 0) ? item.marketValue * qty : computeMeltValue(item, spot);
        break;
      }
      case 10: { // Gain/Loss (computed, qty-adjusted, matching render logic)
        const qty = Number(item.qty) || 1;
        const gb = (typeof getGoldbackRetailPrice === 'function') ? getGoldbackRetailPrice(item) : null;
        const retail = gb ? gb * qty : (item.marketValue && item.marketValue > 0) ? item.marketValue * qty : computeMeltValue(item, spot);
        value = retail - ((parseFloat(item.price) || 0) * qty);
        break;
      }
      case 11: value = item.purchaseLocation; break;
      default: value = 0;
    }
    return { index, value, item };
  });

  mapped.sort((a, b) => {
    const valA = a.value;
    const valB = b.value;

    // Special handling for date: empty/unknown dates should always sort to the bottom
    if (sortColumn === 0) {
      const emptyA = !valA || String(valA).trim() === '' || String(valA).trim() === '—';
      const emptyB = !valB || String(valB).trim() === '' || String(valB).trim() === '—';
      if (emptyA && emptyB) return 0;
      if (emptyA) return 1; // push A down
      if (emptyB) return -1; // push B down

      // compare as ISO date strings (or fallback to string compare)
      const dateA = new Date(valA);
      const dateB = new Date(valB);
      if (!isNaN(dateA) && !isNaN(dateB)) {
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return sortDirection === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    }

    // Numeric comparison for numbers
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }
    // String comparison for everything else
    else {
      const cmp = sortDirection === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
      // Secondary sort by year when names are equal
      if (cmp === 0 && sortColumn === 4) {
        const yearA = parseInt(a.item.year, 10) || 0;
        const yearB = parseInt(b.item.year, 10) || 0;
        return sortDirection === 'asc' ? yearA - yearB : yearB - yearA;
      }
      return cmp;
    }
  });

  return mapped.map(m => m.item);
};

// =============================================================================

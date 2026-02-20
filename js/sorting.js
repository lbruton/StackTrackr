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

  // Pre-calculate sort values (Schwartzian transform)
  const mapped = data.map((item) => {
    let val;
    const spot = spotPrices[(item.metal || '').toLowerCase()] || 0;

    switch(sortColumn) {
      case 0: val = item.date; break; // Date
      case 1: val = item.composition || item.metal; break; // Metal
      case 2: val = item.type; break; // Type
      case 3: val = 0; break; // Image (non-sortable)
      case 4: val = item.name; break; // Name
      case 5: val = item.qty; break; // Qty
      case 6: val = parseFloat(item.weight) || 0; break; // Weight
      case 7: val = parseFloat(item.price) || 0; break; // Purchase Price
      case 8: // Melt Value (computed)
        val = computeMeltValue(item, spot);
        break;
      case 9: { // Retail Price (gbDenom → marketValue → melt, matching render logic)
        const qty = Number(item.qty) || 1;
        const gb = (typeof getGoldbackRetailPrice === 'function') ? getGoldbackRetailPrice(item) : null;
        val = gb ? gb * qty : (item.marketValue && item.marketValue > 0) ? item.marketValue * qty : computeMeltValue(item, spot);
        break;
      }
      case 10: { // Gain/Loss (computed, qty-adjusted, matching render logic)
        const qty = Number(item.qty) || 1;
        const gb = (typeof getGoldbackRetailPrice === 'function') ? getGoldbackRetailPrice(item) : null;
        const retail = gb ? gb * qty : (item.marketValue && item.marketValue > 0) ? item.marketValue * qty : computeMeltValue(item, spot);
        val = retail - ((parseFloat(item.price) || 0) * qty);
        break;
      }
      case 11: val = item.purchaseLocation; break; // Source
      default: val = 0;
    }

    return { item, val };
  });

  mapped.sort((aWrapper, bWrapper) => {
    const valA = aWrapper.val;
    const valB = bWrapper.val;

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
        const yearA = parseInt(aWrapper.item.year, 10) || 0;
        const yearB = parseInt(bWrapper.item.year, 10) || 0;
        return sortDirection === 'asc' ? yearA - yearB : yearB - yearA;
      }
      return cmp;
    }
  });

  return mapped.map(wrapper => wrapper.item);
};

// =============================================================================

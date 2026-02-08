// SORTING FUNCTIONALITY
// =============================================================================

/**
 * Sorts inventory based on the current sort column and direction.
 * Handles special cases for date, numeric, boolean, and string columns.
 *
 * @param {Array<Object>} [data=inventory] - Array of inventory items to sort (defaults to main inventory)
 * @returns {Array<Object>} Sorted inventory data
 *
 * @example
 * sortInventory([{name: 'A'}, {name: 'B'}]);
 */
const sortInventory = (data = inventory) => {
  if (sortColumn === null) return data;

  return [...data].sort((a, b) => {
    let valA, valB;

    // Map column index to data property (portfolio layout: 15 columns)
    const spotA = spotPrices[(a.metal || '').toLowerCase()] || 0;
    const spotB = spotPrices[(b.metal || '').toLowerCase()] || 0;
    switch(sortColumn) {
      case 0: valA = a.date; valB = b.date; break; // Date
      case 1: valA = a.composition || a.metal; valB = b.composition || b.metal; break; // Metal
      case 2: valA = a.type; valB = b.type; break; // Type
      case 3: valA = a.name; valB = b.name; break; // Name
      case 4: valA = a.qty; valB = b.qty; break; // Qty
      case 5: valA = a.weight; valB = b.weight; break; // Weight
      case 6: valA = a.price; valB = b.price; break; // Purchase Price
      case 7: // Melt Value (computed)
        valA = (parseFloat(a.weight) || 0) * (Number(a.qty) || 0) * spotA;
        valB = (parseFloat(b.weight) || 0) * (Number(b.qty) || 0) * spotB;
        break;
      case 8: { // Retail Price (marketValue × qty or melt total)
        const qtyA8 = Number(a.qty) || 1;
        const qtyB8 = Number(b.qty) || 1;
        valA = (a.marketValue && a.marketValue > 0) ? a.marketValue * qtyA8 : (parseFloat(a.weight) || 0) * qtyA8 * spotA;
        valB = (b.marketValue && b.marketValue > 0) ? b.marketValue * qtyB8 : (parseFloat(b.weight) || 0) * qtyB8 * spotB;
        break;
      }
      case 9: { // Gain/Loss (computed, qty-adjusted)
        const qtyA9 = Number(a.qty) || 1;
        const qtyB9 = Number(b.qty) || 1;
        const retailA = (a.marketValue && a.marketValue > 0) ? a.marketValue * qtyA9 : (parseFloat(a.weight) || 0) * qtyA9 * spotA;
        const retailB = (b.marketValue && b.marketValue > 0) ? b.marketValue * qtyB9 : (parseFloat(b.weight) || 0) * qtyB9 * spotB;
        valA = retailA - ((a.price || 0) * qtyA9);
        valB = retailB - ((b.price || 0) * qtyB9);
        break;
      }
      case 10: valA = a.purchaseLocation; valB = b.purchaseLocation; break; // Location
      default: return 0;
    }

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
      if (cmp === 0 && sortColumn === 3) {
        const yearA = parseInt(a.year, 10) || 0;
        const yearB = parseInt(b.year, 10) || 0;
        return sortDirection === 'asc' ? yearA - yearB : yearB - yearA;
      }
      return cmp;
    }
  });
};

// =============================================================================

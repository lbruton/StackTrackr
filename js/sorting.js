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

  return [...data].sort((a, b) => {
    let valA, valB;

    // Map column index to data property — must match <th> order in index.html
    // 0:Date 1:Metal 2:Type 3:Image 4:Name 5:Qty 6:Weight 7:Purchase 8:Melt 9:Retail 10:Gain/Loss 11:Source 12:Actions
    const spotA = spotPrices[(a.metal || '').toLowerCase()] || 0;
    const spotB = spotPrices[(b.metal || '').toLowerCase()] || 0;
    switch(sortColumn) {
      case 0: valA = a.date; valB = b.date; break; // Date
      case 1: valA = a.composition || a.metal; valB = b.composition || b.metal; break; // Metal
      case 2: valA = a.type; valB = b.type; break; // Type
      case 3: return 0; // Image (non-sortable)
      case 4: valA = a.name; valB = b.name; break; // Name
      case 5: valA = a.qty; valB = b.qty; break; // Qty
      case 6: valA = parseFloat(a.weight) || 0; valB = parseFloat(b.weight) || 0; break; // Weight
      case 7: valA = parseFloat(a.price) || 0; valB = parseFloat(b.price) || 0; break; // Purchase Price
      case 8: // Melt Value (computed)
        valA = computeMeltValue(a, spotA);
        valB = computeMeltValue(b, spotB);
        break;
      case 9: { // Retail Price (gbDenom → marketValue → melt, matching render logic)
        const qtyA9 = Number(a.qty) || 1;
        const qtyB9 = Number(b.qty) || 1;
        const gbA9 = (typeof getGoldbackRetailPrice === 'function') ? getGoldbackRetailPrice(a) : null;
        const gbB9 = (typeof getGoldbackRetailPrice === 'function') ? getGoldbackRetailPrice(b) : null;
        valA = gbA9 ? gbA9 * qtyA9 : (a.marketValue && a.marketValue > 0) ? a.marketValue * qtyA9 : computeMeltValue(a, spotA);
        valB = gbB9 ? gbB9 * qtyB9 : (b.marketValue && b.marketValue > 0) ? b.marketValue * qtyB9 : computeMeltValue(b, spotB);
        break;
      }
      case 10: { // Gain/Loss (computed, qty-adjusted, matching render logic)
        const qtyA10 = Number(a.qty) || 1;
        const qtyB10 = Number(b.qty) || 1;
        const gbA10 = (typeof getGoldbackRetailPrice === 'function') ? getGoldbackRetailPrice(a) : null;
        const gbB10 = (typeof getGoldbackRetailPrice === 'function') ? getGoldbackRetailPrice(b) : null;
        const retailA = gbA10 ? gbA10 * qtyA10 : (a.marketValue && a.marketValue > 0) ? a.marketValue * qtyA10 : computeMeltValue(a, spotA);
        const retailB = gbB10 ? gbB10 * qtyB10 : (b.marketValue && b.marketValue > 0) ? b.marketValue * qtyB10 : computeMeltValue(b, spotB);
        valA = retailA - ((parseFloat(a.price) || 0) * qtyA10);
        valB = retailB - ((parseFloat(b.price) || 0) * qtyB10);
        break;
      }
      case 11: valA = a.purchaseLocation; valB = b.purchaseLocation; break; // Source
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
      if (cmp === 0 && sortColumn === 4) {
        const yearA = parseInt(a.year, 10) || 0;
        const yearB = parseInt(b.year, 10) || 0;
        return sortDirection === 'asc' ? yearA - yearB : yearB - yearA;
      }
      return cmp;
    }
  });
};

// =============================================================================

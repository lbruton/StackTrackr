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

    // Map column index to data property
    switch(sortColumn) {
  case 0: valA = a.date; valB = b.date; break; // Date
      case 1: valA = a.type; valB = b.type; break; // Type
      case 2: valA = a.composition || a.metal; valB = b.composition || b.metal; break; // Metal
      case 3: valA = a.qty; valB = b.qty; break; // Qty
      case 4: valA = a.name; valB = b.name; break; // Name
      case 5: valA = a.weight; valB = b.weight; break; // Weight
      case 6: valA = a.price; valB = b.price; break; // Price
      case 7: valA = a.spotPriceAtPurchase; valB = b.spotPriceAtPurchase; break; // Spot
      case 8: valA = a.totalPremium; valB = b.totalPremium; break; // Premium
      case 9: valA = a.purchaseLocation; valB = b.purchaseLocation; break; // Purchase Location
      case 10: valA = a.storageLocation || 'Unknown'; valB = b.storageLocation || 'Unknown'; break; // Storage Location
      case 11: valA = parseInt(a.numistaId || '0', 10); valB = parseInt(b.numistaId || '0', 10); break; // N#
      case 12: valA = a.isCollectable; valB = b.isCollectable; break; // Collectable
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
    // Boolean comparison for collectable
    else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
      return sortDirection === 'asc' ? (valA - valB) : (valB - valA);
    }
    // String comparison for everything else
    else {
      return sortDirection === 'asc' 
        ? String(valA).localeCompare(String(valB)) 
        : String(valB).localeCompare(String(valA));
    }
  });
};

// =============================================================================

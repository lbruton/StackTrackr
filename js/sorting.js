// SORTING FUNCTIONALITY
// =============================================================================

/**
 * Sorts inventory based on current sort column and direction
 * 
 * @param {Array} [data=inventory] - Data to sort (defaults to main inventory)
 * @returns {Array} Sorted inventory data
 */
const sortInventory = (data = inventory) => {
  if (sortColumn === null) return data;

  return [...data].sort((a, b) => {
    let valA, valB;

    // Map column index to data property
    switch(sortColumn) {
      case 0: valA = a.date; valB = b.date; break; // Date
      case 1: valA = a.type; valB = b.type; break; // Type
      case 2: valA = a.metal; valB = b.metal; break; // Metal
      case 3: valA = a.name; valB = b.name; break; // Name
      case 4: valA = a.qty; valB = b.qty; break; // Qty
      case 5: valA = a.weight; valB = b.weight; break; // Weight
      case 6: valA = a.price; valB = b.price; break; // Purchase Price
      case 7: valA = a.spotPriceAtPurchase; valB = b.spotPriceAtPurchase; break; // Spot at Purchase
      case 8: valA = a.totalPremium; valB = b.totalPremium; break; // Premium
      case 9: valA = a.purchaseLocation; valB = b.purchaseLocation; break; // Purchase Location
      case 10: valA = a.storageLocation || 'Unknown'; valB = b.storageLocation || 'Unknown'; break; // Storage Location
      case 11: valA = a.isCollectable; valB = b.isCollectable; break; // Collectable
      default: return 0;
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

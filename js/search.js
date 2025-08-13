// SEARCH FUNCTIONALITY
// =============================================================================

/**
 * Filters inventory based on current search query and active filters
 * 
 * @returns {Array} Filtered inventory items matching the search query and filters
 */
const filterInventory = () => {
  // Use the advanced filtering system if available, otherwise fall back to legacy
  if (typeof filterInventoryAdvanced === 'function') {
    return filterInventoryAdvanced();
  }
  
  // Legacy filtering for compatibility
  let result = inventory;

  Object.entries(columnFilters).forEach(([field, value]) => {
    const lower = value.toLowerCase();
    result = result.filter((item) => {
      const rawVal = item[field] ?? (field === 'metal' ? item.metal : '');
      const fieldVal = String(rawVal ?? '').toLowerCase();
      return fieldVal === lower;
    });
  });

  if (!searchQuery.trim()) return result;

  let query = searchQuery.toLowerCase();
  let filterCollectable = false;

  // Handle collectable keyword separately and remove from query
  query = query.replace(/collectable|collectible/g, () => {
    filterCollectable = true;
    return '';
  }).trim();

  // Support comma-separated terms for multi-value search
  const terms = query.split(',').map(t => t.trim()).filter(t => t);

  return result.filter(item => {
    if (filterCollectable && !item.isCollectable) return false;
    if (!terms.length) return true;

    const formattedDate = formatDisplayDate(item.date).toLowerCase();
    return terms.some(q => (
      item.metal.toLowerCase().includes(q) ||
      (item.composition && item.composition.toLowerCase().includes(q)) ||
      item.name.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q) ||
      item.purchaseLocation.toLowerCase().includes(q) ||
      (item.storageLocation && item.storageLocation.toLowerCase().includes(q)) ||
      (item.notes && item.notes.toLowerCase().includes(q)) ||
      item.date.includes(q) ||
      formattedDate.includes(q) ||
      String(Number.isFinite(Number(item.qty)) ? Number(item.qty) : '').includes(q) ||
      String(Number.isFinite(Number(item.weight)) ? Number(item.weight) : '').includes(q) ||
      String(Number.isFinite(Number(item.price)) ? Number(item.price) : '').includes(q) ||
      (item.isCollectable ? 'yes' : 'no').includes(q)
    ));
  });
};

// Note: applyColumnFilter function is now in filters.js for advanced filtering

// Expose for global access
window.filterInventory = filterInventory;

// =============================================================================


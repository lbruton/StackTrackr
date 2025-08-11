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
      const fieldVal = (item[field] || (field === 'composition' ? item.metal : '')).toString().toLowerCase();
      return fieldVal === lower;
    });
  });

  if (!searchQuery.trim()) return result;

  let query = searchQuery.toLowerCase();
  let filterCollectable = false;

  if (query.includes('collectable')) {
    filterCollectable = true;
    query = query.replace(/collectable/g, '').trim();
  }
  if (query.includes('collectible')) {
    filterCollectable = true;
    query = query.replace(/collectible/g, '').trim();
  }

  return result.filter(item => {
    if (filterCollectable && !item.isCollectable) return false;
    if (!query) return true;

    const formattedDate = formatDisplayDate(item.date).toLowerCase();
    return (
      item.metal.toLowerCase().includes(query) ||
      (item.composition && item.composition.toLowerCase().includes(query)) ||
      item.name.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query) ||
      item.purchaseLocation.toLowerCase().includes(query) ||
      (item.storageLocation && item.storageLocation.toLowerCase().includes(query)) ||
      (item.notes && item.notes.toLowerCase().includes(query)) ||
      item.date.includes(query) ||
      formattedDate.includes(query) ||
      item.qty.toString().includes(query) ||
      item.weight.toString().includes(query) ||
      item.price.toString().includes(query) ||
      (item.isCollectable ? 'yes' : 'no').includes(query)
    );
  });
};

// Note: applyColumnFilter function is now in filters.js for advanced filtering

// =============================================================================

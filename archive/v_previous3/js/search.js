// SEARCH FUNCTIONALITY
// =============================================================================

/**
 * Filters inventory based on current search query
 * 
 * @returns {Array} Filtered inventory items matching the search query
 */
const filterInventory = () => {
  let result = inventory;

  Object.entries(columnFilters).forEach(([field, value]) => {
    const lower = value.toLowerCase();
    result = result.filter((item) => {
      const fieldVal = (item[field] || '').toString().toLowerCase();
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

/**
 * Applies a column-specific filter and re-renders the table
 * @param {string} field - Item property to filter by
 * @param {string} value - Value to match exactly
 */
const applyColumnFilter = (field, value) => {
  if (columnFilters[field] === value) {
    delete columnFilters[field];
  } else {
    columnFilters[field] = value;
  }
  searchQuery = '';
  if (elements.searchInput) elements.searchInput.value = '';
  currentPage = 1;
  renderTable();
};

// =============================================================================

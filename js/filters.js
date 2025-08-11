// FILTERS MODULE
// =============================================================================

/**
 * Advanced filtering system with modal interface
 */
let activeFilters = {};

/**
 * Shows the filters modal and populates filter options
 */
const showFiltersModal = () => {
  const modal = document.getElementById('filtersModal');
  if (!modal) return;

  populateFilterDropdowns();
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

/**
 * Hides the filters modal
 */
const hideFiltersModal = () => {
  const modal = document.getElementById('filtersModal');
  if (!modal) return;

  modal.style.display = 'none';
  document.body.style.overflow = '';
};

/**
 * Populates all filter dropdowns with unique values from inventory
 */
const populateFilterDropdowns = () => {
  // Get unique values for each filterable field
  const metals = [...new Set(
    inventory.map(item => getCompositionFirstWords(item.composition || item.metal || ''))
  )].filter(Boolean).sort();
  
  const types = [...new Set(inventory.map(item => item.type))].filter(Boolean).sort();
  
  const purchaseLocations = [...new Set(
    inventory.map(item => item.purchaseLocation || '')
  )].filter(Boolean).sort();
  
  const storageLocations = [...new Set(
    inventory.map(item => item.storageLocation || '')
  )].filter(Boolean).sort();

  // Populate metal filter
  const metalSelect = document.getElementById('filterMetal');
  if (metalSelect) {
    const selected = activeFilters.composition || '';
    metalSelect.innerHTML = '<option value="">All Metals</option>' +
      metals.map(metal => `<option value="${metal}" ${selected === metal ? 'selected' : ''}>${metal}</option>`).join('');
  }

  // Populate type filter
  const typeSelect = document.getElementById('filterType');
  if (typeSelect) {
    const selected = activeFilters.type || '';
    typeSelect.innerHTML = '<option value="">All Types</option>' +
      types.map(type => `<option value="${type}" ${selected === type ? 'selected' : ''}>${type}</option>`).join('');
  }

  // Populate purchase location filter
  const purchaseSelect = document.getElementById('filterPurchaseLocation');
  if (purchaseSelect) {
    const selected = activeFilters.purchaseLocation || '';
    purchaseSelect.innerHTML = '<option value="">All Locations</option>' +
      purchaseLocations.map(loc => `<option value="${loc}" ${selected === loc ? 'selected' : ''}>${loc}</option>`).join('');
  }

  // Populate storage location filter
  const storageSelect = document.getElementById('filterStorageLocation');
  if (storageSelect) {
    const selected = activeFilters.storageLocation || '';
    storageSelect.innerHTML = '<option value="">All Storage Locations</option>' +
      storageLocations.map(loc => `<option value="${loc}" ${selected === loc ? 'selected' : ''}>${loc}</option>`).join('');
  }

  // Set collectable filter
  const collectableSelect = document.getElementById('filterCollectable');
  if (collectableSelect) {
    collectableSelect.value = activeFilters.collectable || '';
  }

  // Set date range filters
  const dateFromInput = document.getElementById('filterDateFrom');
  const dateToInput = document.getElementById('filterDateTo');
  if (dateFromInput) dateFromInput.value = activeFilters.dateFrom || '';
  if (dateToInput) dateToInput.value = activeFilters.dateTo || '';
};

/**
 * Applies the filters from the modal
 */
const applyFilters = () => {
  const metalSelect = document.getElementById('filterMetal');
  const typeSelect = document.getElementById('filterType');
  const purchaseSelect = document.getElementById('filterPurchaseLocation');
  const storageSelect = document.getElementById('filterStorageLocation');
  const collectableSelect = document.getElementById('filterCollectable');
  const dateFromInput = document.getElementById('filterDateFrom');
  const dateToInput = document.getElementById('filterDateTo');

  // Clear previous filters
  activeFilters = {};

  // Apply new filters
  if (metalSelect && metalSelect.value) {
    activeFilters.composition = metalSelect.value;
  }
  if (typeSelect && typeSelect.value) {
    activeFilters.type = typeSelect.value;
  }
  if (purchaseSelect && purchaseSelect.value) {
    activeFilters.purchaseLocation = purchaseSelect.value;
  }
  if (storageSelect && storageSelect.value) {
    activeFilters.storageLocation = storageSelect.value;
  }
  if (collectableSelect && collectableSelect.value) {
    activeFilters.collectable = collectableSelect.value;
  }
  if (dateFromInput && dateFromInput.value) {
    activeFilters.dateFrom = dateFromInput.value;
  }
  if (dateToInput && dateToInput.value) {
    activeFilters.dateTo = dateToInput.value;
  }

  // Update the legacy columnFilters for compatibility
  columnFilters = {};
  if (activeFilters.composition) columnFilters.composition = activeFilters.composition;
  if (activeFilters.type) columnFilters.type = activeFilters.type;

  // Clear search and reset pagination
  searchQuery = '';
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';
  currentPage = 1;

  // Re-render table and close modal
  renderTable();
  hideFiltersModal();

  // Update filters button to show active state
  updateFiltersButtonState();
};

/**
 * Clears all active filters
 */
const clearAllFilters = () => {
  activeFilters = {};
  columnFilters = {};
  searchQuery = '';
  
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';
  
  currentPage = 1;
  renderTable();
  populateFilterDropdowns();
  updateFiltersButtonState();
};

/**
 * Updates the filters button appearance based on active filters
 */
const updateFiltersButtonState = () => {
  const filtersBtn = document.getElementById('filtersBtn');
  if (!filtersBtn) return;

  const totalFilters = Object.keys(activeFilters).length + Object.keys(columnFilters).filter(key => !activeFilters[key]).length;
  
  if (totalFilters > 0) {
    filtersBtn.textContent = `Filters (${totalFilters})`;
    filtersBtn.classList.add('active');
  } else {
    filtersBtn.textContent = 'Filters';
    filtersBtn.classList.remove('active');
  }
};

/**
 * Enhanced filter inventory function that includes advanced filters
 * @returns {Array} Filtered inventory items
 */
const filterInventoryAdvanced = () => {
  let result = inventory;

  // Apply advanced filters
  Object.entries(activeFilters).forEach(([field, value]) => {
    switch (field) {
      case 'composition':
        result = result.filter(item => {
          const itemMetal = getCompositionFirstWords(item.composition || item.metal || '');
          return itemMetal.toLowerCase() === value.toLowerCase();
        });
        break;
      case 'type':
        result = result.filter(item => item.type === value);
        break;
      case 'purchaseLocation':
        result = result.filter(item => item.purchaseLocation === value);
        break;
      case 'storageLocation':
        result = result.filter(item => item.storageLocation === value);
        break;
      case 'collectable':
        if (value === 'yes') {
          result = result.filter(item => item.isCollectable === true);
        } else if (value === 'no') {
          result = result.filter(item => item.isCollectable === false);
        }
        break;
      case 'dateFrom':
        result = result.filter(item => item.date >= value);
        break;
      case 'dateTo':
        result = result.filter(item => item.date <= value);
        break;
    }
  });

  // Apply legacy column filters for compatibility
  Object.entries(columnFilters).forEach(([field, value]) => {
    if (!activeFilters[field]) { // Don't double-filter
      const lower = value.toLowerCase();
      result = result.filter(item => {
        const fieldVal = (item[field] || (field === 'composition' ? item.metal : '')).toString().toLowerCase();
        return fieldVal === lower;
      });
    }
  });

  // Apply text search
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

/**
 * Applies a quick filter for a specific field value (when clicking on table values)
 * Supports 3-level deep filtering - clicking same filter removes it, clicking different filters stacks them
 * @param {string} field - The field to filter by
 * @param {string} value - The value to filter for
 */
const applyQuickFilter = (field, value) => {
  // If this exact filter is already active, remove it (toggle behavior)
  if (activeFilters[field] === value) {
    delete activeFilters[field];
    // Clean up legacy filters too
    if (field === 'composition' || field === 'type') {
      delete columnFilters[field];
    }
  } else {
    // Add or replace the filter for this field
    activeFilters[field] = value;
    
    // Update legacy filters for compatibility
    if (field === 'composition' || field === 'type') {
      columnFilters[field] = value;
    }
  }
  
  // Don't clear search query - allow search + filters to work together
  currentPage = 1;
  renderTable();
  updateFiltersButtonState();
};

/**
 * Legacy function for backward compatibility with table click handlers
 * @param {string} field - The field to filter by
 * @param {string} value - The value to filter for
 */
const applyColumnFilter = (field, value) => {
  applyQuickFilter(field, value);
};

// Export functions for global access
window.showFiltersModal = showFiltersModal;
window.hideFiltersModal = hideFiltersModal;
window.applyFilters = applyFilters;
window.clearAllFilters = clearAllFilters;
window.applyQuickFilter = applyQuickFilter;
window.applyColumnFilter = applyColumnFilter;
window.filterInventoryAdvanced = filterInventoryAdvanced;
window.updateFiltersButtonState = updateFiltersButtonState;

// =============================================================================

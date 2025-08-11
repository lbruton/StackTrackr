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
  const metalExclude = document.getElementById('filterMetalExclude');
  if (metalSelect) {
    const selected = activeFilters.composition?.values || [];
    metalSelect.innerHTML = '<option value="">All Metals</option>' +
      metals.map(metal => `<option value="${metal}" ${selected.includes(metal) ? 'selected' : ''}>${metal}</option>`).join('');
  }
  if (metalExclude) {
    metalExclude.checked = activeFilters.composition?.exclude || false;
  }

  // Populate type filter
  const typeSelect = document.getElementById('filterType');
  const typeExclude = document.getElementById('filterTypeExclude');
  if (typeSelect) {
    const selected = activeFilters.type?.values || [];
    typeSelect.innerHTML = '<option value="">All Types</option>' +
      types.map(type => `<option value="${type}" ${selected.includes(type) ? 'selected' : ''}>${type}</option>`).join('');
  }
  if (typeExclude) {
    typeExclude.checked = activeFilters.type?.exclude || false;
  }

  // Populate purchase location filter
  const purchaseSelect = document.getElementById('filterPurchaseLocation');
  const purchaseExclude = document.getElementById('filterPurchaseLocationExclude');
  if (purchaseSelect) {
    const selected = activeFilters.purchaseLocation?.values || [];
    purchaseSelect.innerHTML = '<option value="">All Locations</option>' +
      purchaseLocations.map(loc => `<option value="${loc}" ${selected.includes(loc) ? 'selected' : ''}>${loc}</option>`).join('');
  }
  if (purchaseExclude) {
    purchaseExclude.checked = activeFilters.purchaseLocation?.exclude || false;
  }

  // Populate storage location filter
  const storageSelect = document.getElementById('filterStorageLocation');
  const storageExclude = document.getElementById('filterStorageLocationExclude');
  if (storageSelect) {
    const selected = activeFilters.storageLocation?.values || [];
    storageSelect.innerHTML = '<option value="">All Storage Locations</option>' +
      storageLocations.map(loc => `<option value="${loc}" ${selected.includes(loc) ? 'selected' : ''}>${loc}</option>`).join('');
  }
  if (storageExclude) {
    storageExclude.checked = activeFilters.storageLocation?.exclude || false;
  }

  // Set collectable filter
  const collectableSelect = document.getElementById('filterCollectable');
  const collectableExclude = document.getElementById('filterCollectableExclude');
  if (collectableSelect) {
    const selected = activeFilters.collectable?.values || [];
    Array.from(collectableSelect.options).forEach(opt => {
      opt.selected = selected.includes(opt.value);
    });
  }
  if (collectableExclude) {
    collectableExclude.checked = activeFilters.collectable?.exclude || false;
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
  const metalExclude = document.getElementById('filterMetalExclude');
  const typeSelect = document.getElementById('filterType');
  const typeExclude = document.getElementById('filterTypeExclude');
  const purchaseSelect = document.getElementById('filterPurchaseLocation');
  const purchaseExclude = document.getElementById('filterPurchaseLocationExclude');
  const storageSelect = document.getElementById('filterStorageLocation');
  const storageExclude = document.getElementById('filterStorageLocationExclude');
  const collectableSelect = document.getElementById('filterCollectable');
  const collectableExclude = document.getElementById('filterCollectableExclude');
  const dateFromInput = document.getElementById('filterDateFrom');
  const dateToInput = document.getElementById('filterDateTo');

  // Clear previous filters
  activeFilters = {};

  // Apply new filters
  if (metalSelect) {
    const values = Array.from(metalSelect.selectedOptions).map(o => o.value).filter(Boolean);
    if (values.length) {
      activeFilters.composition = { values, exclude: metalExclude?.checked || false };
    }
  }
  if (typeSelect) {
    const values = Array.from(typeSelect.selectedOptions).map(o => o.value).filter(Boolean);
    if (values.length) {
      activeFilters.type = { values, exclude: typeExclude?.checked || false };
    }
  }
  if (purchaseSelect) {
    const values = Array.from(purchaseSelect.selectedOptions).map(o => o.value).filter(Boolean);
    if (values.length) {
      activeFilters.purchaseLocation = { values, exclude: purchaseExclude?.checked || false };
    }
  }
  if (storageSelect) {
    const values = Array.from(storageSelect.selectedOptions).map(o => o.value).filter(Boolean);
    if (values.length) {
      activeFilters.storageLocation = { values, exclude: storageExclude?.checked || false };
    }
  }
  if (collectableSelect) {
    const values = Array.from(collectableSelect.selectedOptions).map(o => o.value).filter(Boolean);
    if (values.length) {
      activeFilters.collectable = { values, exclude: collectableExclude?.checked || false };
    }
  }
  if (dateFromInput && dateFromInput.value) {
    activeFilters.dateFrom = dateFromInput.value;
  }
  if (dateToInput && dateToInput.value) {
    activeFilters.dateTo = dateToInput.value;
  }

  // Update the legacy columnFilters for compatibility
  columnFilters = {};
  if (activeFilters.composition && !activeFilters.composition.exclude && activeFilters.composition.values.length === 1) {
    columnFilters.composition = activeFilters.composition.values[0];
  }
  if (activeFilters.type && !activeFilters.type.exclude && activeFilters.type.values.length === 1) {
    columnFilters.type = activeFilters.type.values[0];
  }

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
  renderActiveFilters();
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
  renderActiveFilters();
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
 * Renders active filter chips beneath the search bar
 */
const renderActiveFilters = () => {
  const container = document.getElementById('activeFilters');
  if (!container) return;

  container.innerHTML = '';

  const filters = [];
  Object.entries(activeFilters).forEach(([field, criteria]) => {
    if (criteria && typeof criteria === 'object' && Array.isArray(criteria.values)) {
      filters.push({ field, value: criteria.values.join(', '), exclude: criteria.exclude });
    } else {
      filters.push({ field, value: criteria });
    }
  });
  Object.entries(columnFilters).forEach(([field, value]) => {
    if (!activeFilters[field]) filters.push({ field, value });
  });
  if (searchQuery) {
    filters.push({ field: 'search', value: searchQuery });
  }

  const colors = ['var(--primary)', 'var(--secondary)', 'var(--success)', 'var(--warning)', 'var(--danger)', 'var(--info)'];
  const labels = {
    composition: 'Metal',
    type: 'Type',
    purchaseLocation: 'Purchase Location',
    storageLocation: 'Storage Location',
    collectable: 'Collectable',
    dateFrom: 'From',
    dateTo: 'To',
    search: 'Search'
  };

  filters.forEach((f, i) => {
    const chip = document.createElement('span');
    chip.className = 'filter-chip';
    chip.style.backgroundColor = colors[i % colors.length];
    const label = f.field === 'search'
      ? `${f.value}`
      : `${labels[f.field] || f.field}: ${f.value}${f.exclude ? ' (exclude)' : ''}`;
    chip.innerHTML = `${label} &times;`;
    chip.title = 'Click to remove filter';
    chip.onclick = () => {
      if (f.field === 'search') {
        searchQuery = '';
        const input = document.getElementById('searchInput');
        if (input) input.value = '';
      } else {
        delete activeFilters[f.field];
        delete columnFilters[f.field];
      }
      currentPage = 1;
      renderTable();
      updateFiltersButtonState();
      renderActiveFilters();
    };
    container.appendChild(chip);
  });
};

/**
 * Enhanced filter inventory function that includes advanced filters
 * @returns {Array} Filtered inventory items
 */
const filterInventoryAdvanced = () => {
  let result = inventory;

  // Apply advanced filters
  Object.entries(activeFilters).forEach(([field, criteria]) => {
    if (criteria && typeof criteria === 'object' && Array.isArray(criteria.values)) {
      const { values, exclude } = criteria;
      switch (field) {
        case 'composition': {
          const lowerVals = values.map(v => v.toLowerCase());
          result = result.filter(item => {
            const itemMetal = getCompositionFirstWords(item.composition || item.metal || '').toLowerCase();
            const match = lowerVals.includes(itemMetal);
            return exclude ? !match : match;
          });
          break;
        }
        case 'type':
          result = result.filter(item => {
            const match = values.includes(item.type);
            return exclude ? !match : match;
          });
          break;
        case 'purchaseLocation':
          result = result.filter(item => {
            const match = values.includes(item.purchaseLocation);
            return exclude ? !match : match;
          });
          break;
        case 'storageLocation':
          result = result.filter(item => {
            const match = values.includes(item.storageLocation);
            return exclude ? !match : match;
          });
          break;
        case 'collectable':
          result = result.filter(item => {
            const val = item.isCollectable ? 'yes' : 'no';
            const match = values.includes(val);
            return exclude ? !match : match;
          });
          break;
      }
    } else {
      const value = criteria;
      switch (field) {
        case 'dateFrom':
          result = result.filter(item => item.date >= value);
          break;
        case 'dateTo':
          result = result.filter(item => item.date <= value);
          break;
      }
    }
  });

  // Apply legacy column filters for compatibility
  Object.entries(columnFilters).forEach(([field, value]) => {
    if (!activeFilters[field]) { // Don't double-filter
      const lower = value.toLowerCase();
      result = result.filter(item => {
        const rawVal = item[field] ?? (field === 'composition' ? item.metal : '');
        const fieldVal = String(rawVal ?? '').toLowerCase();
        return fieldVal === lower;
      });
    }
  });

  // Apply text search
  if (!searchQuery.trim()) return result;

  let query = searchQuery.toLowerCase();
  let filterCollectable = false;

  // Handle collectable keyword and remove from terms
  query = query.replace(/collectable|collectible/g, () => {
    filterCollectable = true;
    return '';
  }).trim();

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

/**
 * Applies a quick filter for a specific field value (when clicking on table values)
 * Supports 3-level deep filtering - clicking same filter removes it, clicking different filters stacks them
 * @param {string} field - The field to filter by
 * @param {string} value - The value to filter for
 */
const applyQuickFilter = (field, value) => {
  // If this exact filter is already active, remove it (toggle behavior)
  if (activeFilters[field]?.values?.[0] === value) {
    delete activeFilters[field];
    // Clean up legacy filters too
    if (field === 'composition' || field === 'type') {
      delete columnFilters[field];
    }
  } else {
    // Add or replace the filter for this field
    activeFilters[field] = { values: [value], exclude: false };

    // Update legacy filters for compatibility
    if (field === 'composition' || field === 'type') {
      columnFilters[field] = value;
    }
  }

  // Don't clear search query - allow search + filters to work together
  currentPage = 1;
  renderTable();
  updateFiltersButtonState();
  renderActiveFilters();
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
window.renderActiveFilters = renderActiveFilters;

// =============================================================================

// FILTERS MODULE
// =============================================================================

/**
 * Advanced filtering system
 */
let activeFilters = {};

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
  renderActiveFilters();
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

  if (filters.length === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = '';

  const colors = ['var(--primary)', 'var(--secondary)', 'var(--success)', 'var(--warning)', 'var(--danger)', 'var(--info)'];
  const labels = {
    metal: 'Metal',
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
    const firstValue = String(f.value).split(', ')[0];
    let color;
    switch (f.field) {
      case 'type':
        color = getTypeColor(firstValue);
        break;
      case 'metal': {
        let key = firstValue;
        if (!METAL_COLORS[key]) {
          key = getCompositionFirstWords(key);
        }
        color = METAL_COLORS[key];
        break;
      }
      case 'purchaseLocation':
        color = getPurchaseLocationColor(firstValue);
        break;
      case 'storageLocation':
        color = getStorageLocationColor(firstValue);
        break;
      default:
        color = colors[i % colors.length];
    }
    chip.style.backgroundColor = color || colors[i % colors.length];
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
        case 'metal': {
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
        default: {
          const lowerVals = values.map(v => String(v).toLowerCase());
          result = result.filter(item => {
            const fieldVal = String(item[field] ?? '').toLowerCase();
            const match = lowerVals.includes(fieldVal);
            return exclude ? !match : match;
          });
          break;
        }
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
        const rawVal = item[field] ?? (field === 'metal' ? item.metal : '');
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
    if (field === 'metal' || field === 'type') {
      delete columnFilters[field];
    }
  } else {
    // Add or replace the filter for this field
    activeFilters[field] = { values: [value], exclude: false };

    // Update legacy filters for compatibility
    if (field === 'metal' || field === 'type') {
      columnFilters[field] = value;
    }
  }

  // Don't clear search query - allow search + filters to work together
  currentPage = 1;
  renderTable();
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
window.clearAllFilters = clearAllFilters;
window.applyQuickFilter = applyQuickFilter;
window.applyColumnFilter = applyColumnFilter;
window.filterInventoryAdvanced = filterInventoryAdvanced;
window.renderActiveFilters = renderActiveFilters;

// =============================================================================

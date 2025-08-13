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
 * Simplifies common coin names for display in filter chips
 * @param {string} value - The original value (may contain comma-separated values)
 * @param {string} field - The field type (e.g., 'name', 'type', etc.)
 * @returns {string} Simplified display value
 */
const simplifyChipValue = (value, field) => {
  if (!value || typeof value !== 'string') {
    return value;
  }

  // Handle comma-separated values
  if (value.includes(', ')) {
    return value.split(', ')
      .map(v => simplifyChipValue(v.trim(), field))
      .join(', ');
  }

  // Only apply coin name simplifications to the 'name' field
  if (field !== 'name') {
    return value;
  }

  // Common coin name simplifications based on PREBUILT_LOOKUP_DATA patterns
  const simplifications = {
    // Government Eagles
    'American Silver Eagle': 'Silver Eagle',
    'American Gold Eagle': 'Gold Eagle', 
    'American Platinum Eagle': 'Platinum Eagle',
    'American Palladium Eagle': 'Palladium Eagle',
    'American Gold Buffalo': 'Gold Buffalo',
    
    // International Maples
    'Canadian Gold Maple Leaf': 'Gold Maple',
    'Canadian Silver Maple Leaf': 'Silver Maple',
    'Canadian Platinum Maple Leaf': 'Platinum Maple',
    'Canadian Palladium Maple Leaf': 'Palladium Maple',
    'Canada Maple Leaf': 'Maple Leaf',
    
    // British Coins
    'British Gold Britannia': 'Gold Britannia',
    'British Silver Britannia': 'Silver Britannia',
    'British Platinum Britannia': 'Platinum Britannia',
    'British Gold Sovereign': 'Sovereign',
    'British Half Sovereign': 'Half Sovereign',
    'British Quarter Sovereign': 'Quarter Sovereign',
    'UK Britannia': 'Britannia',
    
    // Austrian Philharmonics
    'Austrian Gold Philharmonic': 'Gold Philharmonic',
    'Austrian Silver Philharmonic': 'Silver Philharmonic',
    'Austrian Platinum Philharmonic': 'Platinum Philharmonic',
    
    // South African
    'South African Gold Krugerrand': 'Krugerrand',
    'South African Silver Krugerrand': 'Silver Krugerrand',
    'South African Platinum Krugerrand': 'Platinum Krugerrand',
    'South Africa Krugerrand': 'Krugerrand',
    
    // Chinese Pandas
    'Chinese Gold Panda': 'Gold Panda',
    'Chinese Silver Panda': 'Silver Panda',
    
    // Australian
    'Australian Gold Kangaroo': 'Gold Kangaroo',
    'Australian Silver Kangaroo': 'Silver Kangaroo',
    'Australian Silver Kookaburra': 'Kookaburra',
    'Australian Silver Koala': 'Koala',
    'Australian Platinum Platypus': 'Platypus',
    'Australian Gold Lunar Series III': 'Gold Lunar III',
    'Australian Silver Lunar Series III': 'Silver Lunar III',
    'Australia Kookaburra': 'Kookaburra',
    'Australia Kangaroo': 'Kangaroo',
    'Australia Platypus': 'Platypus',
    
    // Mexican
    'Mexican Gold Libertad': 'Gold Libertad',
    'Mexican Silver Libertad': 'Silver Libertad',
    'Mexican Platinum Libertad': 'Platinum Libertad',
    
    // Specialty Items from sample data
    'Silver Buffalo Round': 'Buffalo Round',
    'Germania Round': 'Germania',
    'Lunar Dragon Bar': 'Lunar Dragon',
    'Royal Canadian Mint Bar': 'RCM Bar',
    'PAMP Suisse Bar': 'PAMP Bar',
    'Perth Mint Lunar Dragon': 'Lunar Dragon',
    'Valcambi Bar': 'Valcambi',
    'Baird & Co. Bar': 'Baird Bar'
  };

  // First check for exact matches
  if (simplifications[value]) {
    return simplifications[value];
  }

  // Pattern-based simplifications for variations with years, weights, etc.
  let simplified = value;
  
  // Remove year prefixes (2020-2030)
  simplified = simplified.replace(/^(20[2-3][0-9])\s+/, '');
  
  // Handle fractional patterns - keep the fraction but simplify the name
  const fractionalMatch = simplified.match(/^(1\/10|1\/4|1\/2)\s+(oz\s+)?(.+)/i);
  if (fractionalMatch) {
    const fraction = fractionalMatch[1];
    const baseName = fractionalMatch[3];
    // Try to simplify the base name
    for (const [full, simple] of Object.entries(simplifications)) {
      if (baseName.includes(full)) {
        return `${fraction} oz ${simple}`;
      }
    }
    return `${fraction} oz ${baseName}`;
  }
  
  // Try partial matches for names that contain our known patterns
  for (const [full, simple] of Object.entries(simplifications)) {
    if (simplified.includes(full)) {
      return simplified.replace(full, simple);
    }
  }
  
  // Additional simplifications for common patterns not in exact match list
  simplified = simplified
    .replace(/^Australia\s+/i, '')
    .replace(/^Canadian?\s+/i, '')
    .replace(/^American?\s+/i, '')
    .replace(/^British?\s+/i, '')
    .replace(/^Austrian?\s+/i, '')
    .replace(/^South African?\s+/i, '')
    .replace(/^Chinese?\s+/i, '')
    .replace(/^Mexican?\s+/i, '')
    .replace(/\s+1\s+oz$/i, '')
    .replace(/\s+Bar$/i, '')
    .replace(/\s+Round$/i, '');
  
  return simplified.trim();
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
      // Auto-hide empty chips
      if (criteria.values.length > 0 && criteria.values.some(v => v && v.toString().trim())) {
        filters.push({ field, value: criteria.values.join(', '), exclude: criteria.exclude });
      }
    } else {
      // Auto-hide empty chips
      if (criteria && criteria.toString().trim()) {
        filters.push({ field, value: criteria });
      }
    }
  });
  Object.entries(columnFilters).forEach(([field, value]) => {
    // Auto-hide empty chips and avoid duplicates
    if (!activeFilters[field] && value && value.toString().trim()) {
      filters.push({ field, value });
    }
  });
  if (searchQuery && searchQuery.trim()) {
    filters.push({ field: 'search', value: searchQuery });
  }

  if (filters.length === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = '';

  const colors = ['var(--primary)', 'var(--secondary)', 'var(--success)', 'var(--warning)', 'var(--danger)', 'var(--info)'];

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
    
    // Simplify the display value and remove all field prefixes
    const displayValue = simplifyChipValue(f.value, f.field);
    const label = f.field === 'search'
      ? `${displayValue}`
      : `${displayValue}${f.exclude ? ' (exclude)' : ''}`;
    chip.innerHTML = `${label} &times;`;
    const tooltipText = f.field === 'search' 
      ? 'Click to remove search filter'
      : 'Click to remove filter';
    chip.title = tooltipText;
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
    
    // Handle comma-separated terms (OR logic between comma terms)
    return terms.some(q => {
      // Split each comma term into individual words for AND logic
      const words = q.split(/\s+/).filter(w => w.length > 0);
      
      // All words in this term must match somewhere in the item (AND logic)
      return words.every(word => (
        item.metal.toLowerCase().includes(word) ||
        (item.composition && item.composition.toLowerCase().includes(word)) ||
        item.name.toLowerCase().includes(word) ||
        item.type.toLowerCase().includes(word) ||
        item.purchaseLocation.toLowerCase().includes(word) ||
        (item.storageLocation && item.storageLocation.toLowerCase().includes(word)) ||
        (item.notes && item.notes.toLowerCase().includes(word)) ||
        item.date.includes(word) ||
        formattedDate.includes(word) ||
        String(Number.isFinite(Number(item.qty)) ? Number(item.qty) : '').includes(word) ||
        String(Number.isFinite(Number(item.weight)) ? Number(item.weight) : '').includes(word) ||
        String(Number.isFinite(Number(item.price)) ? Number(item.price) : '').includes(word) ||
        (item.isCollectable ? 'yes' : 'no').includes(word)
      ));
    });
  });
};

/**
 * Applies a quick filter for a specific field value (when clicking on table values)
 * Supports 3-level deep filtering - clicking same filter removes it, clicking different filters stacks them
 * @param {string} field - The field to filter by
 * @param {string} value - The value to filter for
 * @param {boolean} [isGrouped=false] - Whether this is a grouped name filter
 */
const applyQuickFilter = (field, value, isGrouped = false) => {
  // If this exact filter is already active, remove it (toggle behavior)
  if (activeFilters[field]?.values?.[0] === value && !isGrouped) {
    delete activeFilters[field];
    // Clean up legacy filters too
    if (field === 'metal' || field === 'type') {
      delete columnFilters[field];
    }
  } else if (field === 'name' && isGrouped && window.featureFlags && window.featureFlags.isEnabled('GROUPED_NAME_CHIPS')) {
    // Handle grouped name filtering
    if (window.autocomplete && window.autocomplete.normalizeItemName) {
      // Find all item names that normalize to this base name
      const matchingNames = [];
      inventory.forEach(item => {
        if (item.name) {
          const baseName = window.autocomplete.normalizeItemName(item.name);
          if (baseName === value) {
            matchingNames.push(item.name);
          }
        }
      });
      
      // Remove duplicates
      const uniqueNames = [...new Set(matchingNames)];
      
      if (uniqueNames.length > 0) {
        // Check if this grouped filter is already active
        const currentValues = activeFilters[field]?.values || [];
        const isCurrentlyActive = uniqueNames.every(name => currentValues.includes(name)) && 
                                 currentValues.length === uniqueNames.length;
        
        if (isCurrentlyActive) {
          // Toggle off - remove the filter
          delete activeFilters[field];
        } else {
          // Apply the grouped filter
          activeFilters[field] = { values: uniqueNames, exclude: false };
        }
      }
    } else {
      // Fallback to regular filtering if normalization is not available
      activeFilters[field] = { values: [value], exclude: false };
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

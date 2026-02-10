// FILTERS MODULE
// =============================================================================

/**
 * Advanced filtering system
 */
let activeFilters = {};

/**
 * Clears all active filters and resets search input and pagination.
 */
const clearAllFilters = () => {
  activeFilters = {};
  searchQuery = '';

  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';

  const typeFilter = document.getElementById('typeFilter');
  if (typeFilter) typeFilter.value = '';

  const metalFilter = document.getElementById('metalFilter');
  if (metalFilter) metalFilter.value = '';

  // Update chip UI before rerendering the table
  renderActiveFilters();
  renderTable();
};

/**
 * Removes a specific filter from active filters or search.
 *
 * @param {string} field - The field to remove filter from
 * @param {string} value - The value to remove from filter
 */
const removeFilter = (field, value) => {
  if (field === 'search') {
    // Clear search query
    searchQuery = '';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
  } else if (activeFilters[field]) {
    if (activeFilters[field].values && Array.isArray(activeFilters[field].values)) {
      // Remove specific value from array
      activeFilters[field].values = activeFilters[field].values.filter(v => v !== value);
      // If no values left, remove the entire filter
      if (activeFilters[field].values.length === 0) {
        delete activeFilters[field];
      }
    } else {
      // Remove entire filter
      delete activeFilters[field];
    }
  }

  renderTable();
};

/**
 * Simplifies common coin names for display in filter chips.
 * Handles comma-separated values and pattern-based simplifications.
 *
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
 * Generates category summary from filtered inventory.
 * Returns summary of metals, types, and item counts above minimum threshold.
 *
 * @param {Array<Object>} inventory - The filtered inventory
 * @returns {Object} Summary of metals, types, and counts
 */
const generateCategorySummary = (inventory) => {
  // Get minimum count setting from dropdown control or localStorage
  const chipMinCountEl = document.getElementById('chipMinCount');
  let minCount = 3;
  if (chipMinCountEl && chipMinCountEl.value) {
    minCount = parseInt(chipMinCountEl.value, 10);
  } else {
    minCount = parseInt(localStorage.getItem('chipMinCount') || '3', 10);
  }

  const metals = {};
  const types = {};
  const purchaseLocations = {};
  const storageLocations = {};
  const names = {};
  const years = {};
  const grades = {};
  const numistaIds = {};

  inventory.forEach(item => {
    // Count metals
    const metal = getCompositionFirstWords(item.composition || item.metal || '');
    if (metal) {
      metals[metal] = (metals[metal] || 0) + 1;
    }

    // Count types
    if (item.type) {
      types[item.type] = (types[item.type] || 0) + 1;
    }

    // Count purchase locations (skip empty / "Unknown")
    const pLoc = (item.purchaseLocation || '').trim();
    if (pLoc && pLoc.toLowerCase() !== 'unknown') {
      purchaseLocations[item.purchaseLocation] = (purchaseLocations[item.purchaseLocation] || 0) + 1;
    }

    // Count storage locations (skip empty / "Unknown")
    const sLoc = (item.storageLocation || '').trim();
    if (sLoc && sLoc.toLowerCase() !== 'unknown') {
      storageLocations[item.storageLocation] = (storageLocations[item.storageLocation] || 0) + 1;
    }

    // Count normalized names (grouped name chips)
    if (window.featureFlags && window.featureFlags.isEnabled('GROUPED_NAME_CHIPS')) {
      const itemName = (item.name || '').trim();
      if (itemName) {
        let baseName = itemName;
        if (window.autocomplete && typeof window.autocomplete.normalizeItemName === 'function') {
          baseName = window.autocomplete.normalizeItemName(itemName);
        }
        names[baseName] = (names[baseName] || 0) + 1;
      }
    }

    // Count years (skip empty)
    const yr = (item.year || '').trim();
    if (yr) {
      years[yr] = (years[yr] || 0) + 1;
    }

    // Count grades (skip empty)
    const gr = (item.grade || '').trim();
    if (gr) {
      grades[gr] = (grades[gr] || 0) + 1;
    }

    // Count Numista IDs (skip empty)
    const nId = (item.numistaId || '').trim();
    if (nId) {
      numistaIds[nId] = (numistaIds[nId] || 0) + 1;
    }
  });

  // Count custom groups
  let customGroups = {};
  if (typeof window.countCustomGroups === 'function') {
    customGroups = window.countCustomGroups(inventory);
  }

  // Extract dynamic chips (text from parentheses/quotes)
  let dynamicNames = {};
  if (window.featureFlags && window.featureFlags.isEnabled('DYNAMIC_NAME_CHIPS') && typeof window.extractDynamicChips === 'function') {
    dynamicNames = window.extractDynamicChips(inventory);
  }

  // Apply minCount threshold to all categories
  const filteredMetals = Object.fromEntries(
    Object.entries(metals).filter(([key, count]) => count >= minCount)
  );
  const filteredTypes = Object.fromEntries(
    Object.entries(types).filter(([key, count]) => count >= minCount)
  );
  const filteredPurchaseLocations = Object.fromEntries(
    Object.entries(purchaseLocations).filter(([key, count]) => count >= minCount)
  );
  const filteredStorageLocations = Object.fromEntries(
    Object.entries(storageLocations).filter(([key, count]) => count >= minCount)
  );
  let filteredNames = Object.fromEntries(
    Object.entries(names).filter(([key, count]) => count >= minCount)
  );
  const filteredYears = Object.fromEntries(
    Object.entries(years).filter(([key, count]) => count >= minCount)
  );
  const filteredGrades = Object.fromEntries(
    Object.entries(grades).filter(([key, count]) => count >= minCount)
  );
  const filteredNumistaIds = Object.fromEntries(
    Object.entries(numistaIds).filter(([key, count]) => count >= minCount)
  );
  const filteredDynamicNames = Object.fromEntries(
    Object.entries(dynamicNames).filter(([key, count]) => count >= minCount)
  );

  // Apply blacklist filter to auto-generated name chips and dynamic chips
  if (typeof window.isBlacklisted === 'function') {
    filteredNames = Object.fromEntries(
      Object.entries(filteredNames).filter(([key]) => !window.isBlacklisted(key))
    );
    // Filter dynamic names through blacklist too
    for (const key of Object.keys(filteredDynamicNames)) {
      if (window.isBlacklisted(key)) {
        delete filteredDynamicNames[key];
      }
    }
  }

  // Suppress auto-generated names that duplicate a custom group label
  const customLabelsLower = new Set(Object.values(customGroups).map(g => g.label.toLowerCase()));
  filteredNames = Object.fromEntries(
    Object.entries(filteredNames).filter(([key]) => !customLabelsLower.has(key.toLowerCase()))
  );

  // Apply minCount threshold to custom groups
  const filteredCustomGroups = Object.fromEntries(
    Object.entries(customGroups).filter(([, info]) => info.count >= minCount)
  );

  return {
    metals: filteredMetals,
    types: filteredTypes,
    purchaseLocations: filteredPurchaseLocations,
    storageLocations: filteredStorageLocations,
    names: filteredNames,
    years: filteredYears,
    grades: filteredGrades,
    numistaIds: filteredNumistaIds,
    customGroups: filteredCustomGroups,
    dynamicNames: filteredDynamicNames,
    totalItems: inventory.length
  };
};

/**
 * Checks if a filter field/value combination has matching data in the given inventory.
 *
 * @param {string} field - The field name (e.g., 'metal', 'type', 'name')
 * @param {string} value - The filter value
 * @param {Array<Object>} inventory - The inventory to check against
 * @returns {boolean} True if there are items matching this filter
 */
const hasMatchingData = (field, value, inventory) => {
  if (!inventory || inventory.length === 0) return false;
  
  return inventory.some(item => {
    switch (field) {
      case 'metal':
        const itemMetal = getCompositionFirstWords(item.composition || item.metal || '').toLowerCase();
        return itemMetal === value.toLowerCase();
      case 'type':
        return item.type === value;
      case 'name':
        return item.name === value;
      case 'purchaseLocation':
        return item.purchaseLocation === value;
      case 'storageLocation':
        return item.storageLocation === value;
      default:
        const fieldVal = String(item[field] ?? '').toLowerCase();
        return fieldVal === value.toLowerCase();
    }
  });
};

/**
 * Renders active filter chips beneath the search bar.
 * Updates the filter chip container based on current filters and inventory.
 */
const renderActiveFilters = () => {
  const container = document.getElementById('activeFilters');
  if (!container) return;

  container.innerHTML = '';

  // Get the current filtered inventory first
  const filteredInventory = filterInventoryAdvanced();
  
  if (filteredInventory.length === 0) {
    container.style.display = 'none';
    return;
  }

  // Build chips based on what's actually in the filtered inventory
  const chips = [];
  
  // Add search term chip if there's a search query
  if (searchQuery && searchQuery.trim()) {
    chips.push({ field: 'search', value: searchQuery });
  }
  
  // Generate category summary chips from filtered inventory
  const categorySummary = generateCategorySummary(filteredInventory);
  
  // Category descriptor map — maps category ID to summary key, chip field, and extra props
  const categoryDescriptors = {
    metal:            { summaryKey: 'metals',            field: 'metal' },
    type:             { summaryKey: 'types',             field: 'type' },
    name:             { summaryKey: 'names',             field: 'name',             extraProps: { isGrouped: true } },
    customGroup:      { summaryKey: 'customGroups',      field: 'customGroup' },
    dynamicName:      { summaryKey: 'dynamicNames',      field: 'dynamicName',      extraProps: { isDynamic: true } },
    purchaseLocation: { summaryKey: 'purchaseLocations', field: 'purchaseLocation' },
    storageLocation:  { summaryKey: 'storageLocations',  field: 'storageLocation' },
    year:             { summaryKey: 'years',             field: 'year' },
    grade:            { summaryKey: 'grades',            field: 'grade' },
    numistaId:        { summaryKey: 'numistaIds',        field: 'numistaId' },
  };

  // Read category config (order + enabled state) and sort preference
  const categoryConfig = typeof getFilterChipCategoryConfig === 'function'
    ? getFilterChipCategoryConfig()
    : [
        { id: 'metal', enabled: true }, { id: 'type', enabled: true },
        { id: 'name', enabled: true }, { id: 'customGroup', enabled: true },
        { id: 'dynamicName', enabled: true }, { id: 'purchaseLocation', enabled: true },
        { id: 'storageLocation', enabled: true }, { id: 'year', enabled: true },
        { id: 'grade', enabled: true }, { id: 'numistaId', enabled: true },
      ];

  // Read sort preference from toggle active button or localStorage (default: alpha)
  const sortEl = document.getElementById('chipSortOrder');
  const activeBtn = sortEl && sortEl.querySelector('.chip-sort-btn.active');
  const rawPref = (activeBtn && activeBtn.dataset.sort) || localStorage.getItem('chipSortOrder') || 'alpha';
  const chipSortPref = (rawPref === 'count') ? 'count' : 'alpha';

  // Helper: collect chips for a single category from the summary data
  const collectCategoryChips = (cat) => {
    const desc = categoryDescriptors[cat.id]; // eslint-disable-line security/detect-object-injection
    if (!desc) return [];
    const data = categorySummary[desc.summaryKey]; // eslint-disable-line security/detect-object-injection
    if (!data) return [];
    const result = [];
    if (cat.id === 'customGroup') {
      Object.entries(data).forEach(([groupId, info]) => {
        if (info.count > 0) {
          result.push({ field: desc.field, value: groupId, displayLabel: info.label, count: info.count, total: categorySummary.totalItems, isCustomGroup: true });
        }
      });
    } else {
      Object.entries(data).forEach(([value, count]) => {
        if (count > 0) {
          result.push({ field: desc.field, value, count, total: categorySummary.totalItems, ...(desc.extraProps || {}) });
        }
      });
    }
    return result;
  };

  // Helper: sort a chip array in place based on preference
  const sortChips = (arr) => {
    if (chipSortPref === 'alpha') {
      arr.sort((a, b) => {
        const aLabel = (a.displayLabel || a.value || '').toString();
        const bLabel = (b.displayLabel || b.value || '').toString();
        return aLabel.localeCompare(bLabel, undefined, { numeric: true, sensitivity: 'base' });
      });
    } else if (chipSortPref === 'count') {
      arr.sort((a, b) => (b.count || 0) - (a.count || 0));
    }
  };

  // Build chips — categories with the same group letter pool and sort together
  const categoryFields = new Set();
  const emittedGroups = new Set();

  for (const cat of categoryConfig) {
    if (!cat.enabled) continue;
    const desc = categoryDescriptors[cat.id]; // eslint-disable-line security/detect-object-injection
    if (!desc) continue;
    categoryFields.add(desc.field);

    if (cat.group) {
      // Grouped: first encounter collects ALL categories in this group
      if (emittedGroups.has(cat.group)) continue;
      emittedGroups.add(cat.group);

      const pooled = [];
      for (const gc of categoryConfig) {
        if (!gc.enabled || gc.group !== cat.group) continue;
        const gcDesc = categoryDescriptors[gc.id]; // eslint-disable-line security/detect-object-injection
        if (gcDesc) categoryFields.add(gcDesc.field);
        pooled.push(...collectCategoryChips(gc));
      }
      sortChips(pooled);
      chips.push(...pooled);
    } else {
      // Ungrouped: collect and sort individually
      const catChips = collectCategoryChips(cat);
      sortChips(catChips);
      chips.push(...catChips);
    }
  }

  // Add any explicitly applied filter chips (but not if they duplicate category chips)
  Object.entries(activeFilters).forEach(([field, criteria]) => {
    // Skip fields already rendered as category summary chips to avoid duplicates
    // BUT: if no summary chip was rendered for this field (all below minCount),
    // fall through so the user can still see and remove their active filter
    if (categoryFields.has(field)) {
      const hasSummaryChip = chips.some(c => c.field === field && c.count !== undefined);
      if (hasSummaryChip) return;
    }
    
    if (criteria && typeof criteria === 'object' && Array.isArray(criteria.values)) {
      criteria.values.forEach(value => {
        if (value && value.toString().trim()) {
          chips.push({ field, value, exclude: criteria.exclude });
        }
      });
    } else {
      if (criteria && criteria.toString().trim()) {
        chips.push({ field, value: criteria });
      }
    }
  });
  
  if (chips.length === 0) {
    container.style.display = 'none';
    return;
  }
  
  container.style.display = '';

  const colors = ['var(--primary)', 'var(--secondary)', 'var(--success)', 'var(--warning)', 'var(--danger)', 'var(--info)'];

  chips.forEach((f, i) => {
    const chip = document.createElement('span');
    chip.className = 'filter-chip';
    // All chip categories render visually identical — no italic/bold distinction
    const firstValue = String(f.value).split(', ')[0];
    let color;
    let textColor;
    switch (f.field) {
      case 'type':
        color = getTypeColor(firstValue);
        break;
      case 'metal': {
        let key = firstValue;
        if (!METAL_COLORS[key]) {
          color = getColor(nameColors, key);
        } else {
          color = METAL_COLORS[key];
          textColor = METAL_TEXT_COLORS[key] ? METAL_TEXT_COLORS[key]() : undefined;
        }
        break;
      }
      case 'name':
        color = getColor(nameColors, firstValue);
        break;
      case 'customGroup':
        color = getColor(nameColors, f.displayLabel || firstValue);
        break;
      case 'dynamicName':
        color = getColor(nameColors, firstValue);
        break;
      case 'purchaseLocation':
        color = getPurchaseLocationColor(firstValue);
        break;
      case 'storageLocation':
        color = getStorageLocationColor(firstValue);
        break;
      default:
        color = colors[i % colors.length];
    }
    const bg = color || colors[i % colors.length];
    chip.style.backgroundColor = bg;
    chip.style.color = textColor || getContrastColor(bg);

    // Display simplified value for most chips, but keep full base name for name chips
    // Custom groups use their display label; dynamic chips are italic (via CSS class)
    const displayValue = f.isCustomGroup ? f.displayLabel
      : f.isDynamic ? f.value
      : f.field === 'name' ? f.value
      : f.field === 'numistaId' ? `N#${f.value}`
      : simplifyChipValue(f.value, f.field);
    let label;

    if (f.field === 'search') {
      label = displayValue;
    } else if (f.count !== undefined && f.total !== undefined) {
      // For category summary chips, show count badge if enabled
      const showQty = window.featureFlags && window.featureFlags.isEnabled('CHIP_QTY_BADGE');
      label = showQty ? `${displayValue} (${f.count})` : displayValue;
    } else {
      label = `${displayValue}${f.exclude ? ' (exclude)' : ''}`;
    }
    
    // Use safe textContent and a separate close marker span to avoid HTML injection
    chip.textContent = label + ' ';
    const close = document.createElement('span');
    close.className = 'chip-close';
    close.textContent = '×';
    close.setAttribute('aria-hidden', 'true');
    chip.appendChild(close);

    // Debug logging (opt-in)
    if (window.DEBUG_FILTERS) {
      // eslint-disable-next-line no-console
      console.debug('renderActiveFilters: adding chip', { field: f.field, value: f.value, label });
    }
    
    // Right-click context menu for name and dynamic chips (blacklist)
    if (f.field === 'name' || f.field === 'dynamicName') {
      chip.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const chipName = f.field === 'dynamicName' ? f.value : f.value;
        if (typeof window.showChipContextMenu === 'function') {
          window.showChipContextMenu(e.clientX, e.clientY, chipName);
        }
      });
    }

    // Different tooltip and click behavior for different chip types
    if (f.count !== undefined && f.total !== undefined) {
      // Category summary chips - clicking adds filter; shift+click blacklists (name/dynamic only)
      const canBlacklist = f.field === 'name' || f.field === 'dynamicName';
      chip.title = `Click to filter by ${f.field}: ${displayValue} (${f.count} items)` +
        (canBlacklist ? ' · Shift+click to ignore' : '');
      chip.addEventListener('click', (e) => {
        if (canBlacklist && e.shiftKey && typeof window.showBlacklistConfirm === 'function') {
          e.preventDefault();
          window.showBlacklistConfirm(e.clientX, e.clientY, f.value);
          return;
        }
        applyQuickFilter(f.field, f.value, f.isGrouped || f.isCustomGroup || f.isDynamic || false);
      });
    } else {
      // Active filter chips - clicking removes filter
      chip.title = f.field === 'search'
        ? `Search term: ${displayValue} (click to remove)`
        : `Active filter: ${f.field} = ${displayValue} (click to remove)`;
      chip.addEventListener('click', () => {
        removeFilter(f.field, f.value);
        renderActiveFilters();
      });
    }
    // Make the close glyph interactive and keyboard accessible (removes the filter)
    close.setAttribute('role', 'button');
    close.setAttribute('tabindex', '0');
    close.setAttribute('aria-label', `Remove filter ${displayValue}`);
    close.onclick = (e) => {
      e.stopPropagation();
      removeFilter(f.field, f.value);
      renderActiveFilters();
    };
    close.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        removeFilter(f.field, f.value);
        renderActiveFilters();
      }
    };

    container.appendChild(chip);
  });

  // Add clear button if there are any chips (check for both active and summary chips)
  if (chips.length > 0) {
    const clearButton = document.createElement('button');
    clearButton.className = 'filter-clear-btn';
    clearButton.innerHTML = 'Clear All';
    clearButton.title = 'Clear all active filters';
    clearButton.onclick = () => {
      clearAllFilters();
    };
    container.appendChild(clearButton);
  }
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
        case 'name': {
          const simplifiedValues = values.map(v => simplifyChipValue(v, field));
          result = result.filter(item => {
            const itemName = simplifyChipValue(item.name || '', field);
            const match = simplifiedValues.includes(itemName);
            return exclude ? !match : match;
          });
          break;
        }
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

  // Apply text search
  if (!searchQuery.trim()) return result;

  let query = searchQuery.toLowerCase().trim();

  const terms = query.split(',').map(t => t.trim()).filter(t => t);

  return result.filter(item => {
    if (!terms.length) return true;

    const formattedDate = formatDisplayDate(item.date).toLowerCase();
    
    // Handle comma-separated terms (OR logic between comma terms)
    return terms.some(q => {
      // Split each comma term into individual words for AND logic
      const words = q.split(/\s+/).filter(w => w.length > 0);
      
      // Special handling for multi-word searches to prevent partial matches
      // If searching for "American Eagle", it should only match items that have both words
      // but NOT match "American Gold Eagle" (which has an extra word in between)
      if (words.length >= 2) {
        // For multi-word searches, check if the exact phrase exists or 
        // if all words exist as separate word boundaries without conflicting words
        const exactPhrase = q.toLowerCase();
        const itemText = [
          item.metal,
          item.composition || '',
          item.name,
          item.type,
          item.purchaseLocation,
          item.storageLocation || '',
          item.notes || '',
          String(item.year || ''),
          item.grade || '',
          item.gradingAuthority || '',
          String(item.certNumber || ''),
          String(item.numistaId || ''),
          item.serialNumber || ''
        ].join(' ').toLowerCase();
        
        // Check for exact phrase match first
        if (itemText.includes(exactPhrase)) {
          return true;
        }
        
        // For phrase searches like "American Eagle", be more restrictive
        // Check that all words are present as word boundaries
        const allWordsPresent = words.every(word => {
          const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          return wordRegex.test(itemText);
        });
        
        if (!allWordsPresent) {
          return false;
        }
        
        // Additional check: prevent cross-metal matching for common coin series
        // "Silver Eagle" should not match "American Gold Eagle"
        // "Gold Maple" should not match "Silver Maple Leaf"
        // etc.
        if (words.length === 2) {
          const searchMetal = words[0];
          const coinType = words[1];
          
          // Handle Eagle series
          if (coinType === 'eagle') {
            if (searchMetal === 'american') {
              // "American Eagle" should not match "American [Metal] Eagle"
              const metalWords = ['gold', 'silver', 'platinum', 'palladium'];
              const hasMetalBetween = metalWords.some(metal => 
                itemText.includes(`american ${metal} eagle`) && !exactPhrase.includes(metal)
              );
              return !hasMetalBetween;
            } else if (['silver', 'gold', 'platinum', 'palladium'].includes(searchMetal)) {
              // Metal-specific eagle searches must match exact phrase
              return itemText.includes(exactPhrase);
            }
          }
          
          // Handle Maple series (Canadian Maple Leaf)
          else if (coinType === 'maple') {
            if (['silver', 'gold', 'platinum', 'palladium'].includes(searchMetal)) {
              // "Silver Maple" should only match items with "silver maple"
              return itemText.includes(exactPhrase) || itemText.includes(`${searchMetal} maple leaf`);
            } else if (searchMetal === 'canadian') {
              // "Canadian Maple" should not match specific metal maples unless no metal specified
              const metalWords = ['gold', 'silver', 'platinum', 'palladium'];
              const hasMetalBetween = metalWords.some(metal => 
                itemText.includes(`canadian ${metal} maple`) && !exactPhrase.includes(metal)
              );
              return !hasMetalBetween;
            }
          }
          
          // Handle Britannia series (British Britannia)
          else if (coinType === 'britannia') {
            if (['silver', 'gold', 'platinum', 'palladium'].includes(searchMetal)) {
              // "Silver Britannia" should only match items with "silver britannia"
              return itemText.includes(exactPhrase);
            } else if (searchMetal === 'british') {
              // "British Britannia" should not match specific metal britannias
              const metalWords = ['gold', 'silver', 'platinum', 'palladium'];
              const hasMetalBetween = metalWords.some(metal => 
                itemText.includes(`british ${metal} britannia`) && !exactPhrase.includes(metal)
              );
              return !hasMetalBetween;
            }
          }
          
          // Handle Krugerrand series
          else if (coinType === 'krugerrand') {
            if (['silver', 'gold', 'platinum', 'palladium'].includes(searchMetal)) {
              // "Gold Krugerrand" should only match gold krugerrands
              return itemText.includes(exactPhrase);
            } else if (searchMetal === 'south' || searchMetal === 'african') {
              // Handle "South African Krugerrand" - don't match if metal specified
              const metalWords = ['gold', 'silver', 'platinum', 'palladium'];
              const hasMetalBetween = metalWords.some(metal => 
                (itemText.includes(`south african ${metal} krugerrand`) || 
                 itemText.includes(`${metal} krugerrand`)) && !exactPhrase.includes(metal)
              );
              return !hasMetalBetween;
            }
          }
          
          // Handle Buffalo series
          else if (coinType === 'buffalo') {
            if (['silver', 'gold', 'platinum', 'palladium'].includes(searchMetal)) {
              // "Gold Buffalo" should only match gold buffalos
              return itemText.includes(exactPhrase);
            } else if (searchMetal === 'american') {
              // "American Buffalo" should not match if metal specified
              const metalWords = ['gold', 'silver', 'platinum', 'palladium'];
              const hasMetalBetween = metalWords.some(metal => 
                itemText.includes(`american ${metal} buffalo`) && !exactPhrase.includes(metal)
              );
              return !hasMetalBetween;
            }
          }
          
          // Handle Panda series
          else if (coinType === 'panda') {
            if (['silver', 'gold', 'platinum', 'palladium'].includes(searchMetal)) {
              // "Silver Panda" should only match silver pandas
              return itemText.includes(exactPhrase);
            } else if (searchMetal === 'chinese') {
              // "Chinese Panda" should not match if metal specified
              const metalWords = ['gold', 'silver', 'platinum', 'palladium'];
              const hasMetalBetween = metalWords.some(metal => 
                itemText.includes(`chinese ${metal} panda`) && !exactPhrase.includes(metal)
              );
              return !hasMetalBetween;
            }
          }
          
          // Handle Kangaroo series
          else if (coinType === 'kangaroo') {
            if (['silver', 'gold', 'platinum', 'palladium'].includes(searchMetal)) {
              return itemText.includes(exactPhrase);
            } else if (searchMetal === 'australian') {
              const metalWords = ['gold', 'silver', 'platinum', 'palladium'];
              const hasMetalBetween = metalWords.some(metal => 
                itemText.includes(`australian ${metal} kangaroo`) && !exactPhrase.includes(metal)
              );
              return !hasMetalBetween;
            }
          }
        }
        
        // Handle three-word searches with special patterns
        if (words.length === 3) {
          // Handle "American Gold Eagle" type searches - these should be exact
          const firstWord = words[0];
          const middleWord = words[1];
          const lastWord = words[2];
          
          if (['american', 'canadian', 'british', 'chinese', 'australian', 'south'].includes(firstWord) &&
              ['gold', 'silver', 'platinum', 'palladium'].includes(middleWord) &&
              ['eagle', 'maple', 'britannia', 'krugerrand', 'buffalo', 'panda', 'kangaroo'].includes(lastWord)) {
            // For "American Gold Eagle" type searches, require exact phrase or very close match
            return itemText.includes(exactPhrase) || 
                   (lastWord === 'maple' && itemText.includes(`${firstWord} ${middleWord} maple leaf`));
          }
        }
        
        // Handle fractional weight searches to be more specific
        // "1/4 oz" should be distinct from "1/2 oz" and "1 oz"
        if (words.length >= 2) {
          const hasFraction = words.some(word => word.includes('/'));
          const hasOz = words.some(word => word === 'oz' || word === 'ounce');
          
          if (hasFraction && hasOz) {
            // For fractional searches, require exact phrase match
            return itemText.includes(exactPhrase);
          }
        }
        
        // Prevent overly broad country/origin searches
        const broadTerms = ['american', 'canadian', 'australian', 'british', 'chinese', 'south', 'mexican'];
        if (words.length === 1 && broadTerms.includes(words[0])) {
          // Single broad geographic terms should require additional context
          // Return false to prevent matching everything from that country
          return false;
        }
        
        return true;
      }
      
      // For single words, use word boundary matching
      return words.every(word => {
        const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
        return (
          wordRegex.test(item.metal) ||
          (item.composition && wordRegex.test(item.composition)) ||
          wordRegex.test(item.name) ||
          wordRegex.test(item.type) ||
          wordRegex.test(item.purchaseLocation) ||
          (item.storageLocation && wordRegex.test(item.storageLocation)) ||
          (item.notes && wordRegex.test(item.notes)) ||
          item.date.includes(word) ||
          formattedDate.includes(word) ||
          String(Number.isFinite(Number(item.qty)) ? Number(item.qty) : '').includes(word) ||
          String(Number.isFinite(Number(item.weight)) ? Number(item.weight) : '').includes(word) ||
          String(Number.isFinite(Number(item.price)) ? Number(item.price) : '').includes(word) ||
          (item.year && wordRegex.test(String(item.year))) ||
          (item.grade && wordRegex.test(item.grade)) ||
          (item.gradingAuthority && wordRegex.test(item.gradingAuthority)) ||
          (item.certNumber && wordRegex.test(String(item.certNumber))) ||
          (item.numistaId && wordRegex.test(String(item.numistaId))) ||
          (item.serialNumber && wordRegex.test(item.serialNumber))
        );
      });
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
  // Handle custom group chip click
  if (field === 'customGroup') {
    const groups = typeof window.loadCustomGroups === 'function' ? window.loadCustomGroups() : [];
    const group = groups.find(g => g.id === value);
    if (group) {
      const matchingNames = [];
      inventory.forEach(item => {
        const itemName = (item.name || '').toLowerCase();
        if (group.patterns.some(p => {
          try {
            return new RegExp('\\b' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(itemName);
          } catch (e) { return itemName.includes(p.toLowerCase()); }
        })) {
          matchingNames.push(item.name);
        }
      });
      const uniqueNames = [...new Set(matchingNames)];

      // Toggle behavior: if same custom group filter is active, remove it
      const currentValues = activeFilters['name']?.values || [];
      const isCurrentlyActive = uniqueNames.length > 0 &&
        uniqueNames.every(n => currentValues.includes(n)) &&
        currentValues.length === uniqueNames.length;

      if (isCurrentlyActive) {
        delete activeFilters['name'];
      } else if (uniqueNames.length > 0) {
        activeFilters['name'] = { values: uniqueNames, exclude: false };
      }
    }
    renderTable();
    renderActiveFilters();
    return;
  }

  // Handle dynamic name chip click
  if (field === 'dynamicName') {
    const matchingNames = [];
    inventory.forEach(item => {
      const name = item.name || '';
      if (name.includes('(' + value + ')') || name.includes('"' + value + '"')) {
        matchingNames.push(name);
      }
    });
    const uniqueNames = [...new Set(matchingNames)];

    // Toggle behavior
    const currentValues = activeFilters['name']?.values || [];
    const isCurrentlyActive = uniqueNames.length > 0 &&
      uniqueNames.every(n => currentValues.includes(n)) &&
      currentValues.length === uniqueNames.length;

    if (isCurrentlyActive) {
      delete activeFilters['name'];
    } else if (uniqueNames.length > 0) {
      activeFilters['name'] = { values: uniqueNames, exclude: false };
    }
    renderTable();
    renderActiveFilters();
    return;
  }

  // If this exact filter is already active, remove it (toggle behavior)
  if (activeFilters[field]?.values?.[0] === value && !isGrouped) {
    delete activeFilters[field];
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
  }

  // Don't clear search query - allow search + filters to work together
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

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
  columnFilters = {};
  searchQuery = '';

  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';

  const typeFilter = document.getElementById('typeFilter');
  if (typeFilter) typeFilter.value = '';

  const metalFilter = document.getElementById('metalFilter');
  if (metalFilter) metalFilter.value = '';

  currentPage = 1;
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
    
    // Also remove from legacy column filters
    if (field === 'metal' || field === 'type') {
      delete columnFilters[field];
    }
  }
  
  currentPage = 1;
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
  let minCount = 100;
  if (chipMinCountEl && chipMinCountEl.value) {
    minCount = parseInt(chipMinCountEl.value, 10);
  } else {
    minCount = parseInt(localStorage.getItem('chipMinCount') || '100', 10);
  }

  const metals = {};
  const types = {};
  const dates = {};
  const purchaseLocations = {};
  const storageLocations = {};
  
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
    
    // Count dates (use >10 threshold instead of minCount)
    if (item.date) {
      dates[item.date] = (dates[item.date] || 0) + 1;
    }
    
    // Count purchase locations (always show regardless of count)
    if (item.purchaseLocation && item.purchaseLocation.trim()) {
      purchaseLocations[item.purchaseLocation] = (purchaseLocations[item.purchaseLocation] || 0) + 1;
    }
    
    // Count storage locations (always show regardless of count)
    if (item.storageLocation && item.storageLocation.trim()) {
      storageLocations[item.storageLocation] = (storageLocations[item.storageLocation] || 0) + 1;
    }
  });
  
  // Filter out categories below minimum count
  const filteredMetals = Object.fromEntries(
    Object.entries(metals).filter(([key, count]) => count >= minCount)
  );
  const filteredTypes = Object.fromEntries(
    Object.entries(types).filter(([key, count]) => count >= minCount)
  );
  
  // Filter dates with >10 matches
  const filteredDates = Object.fromEntries(
    Object.entries(dates).filter(([key, count]) => count > 10)
  );
  
  // Include ALL purchase and storage locations (no minimum threshold)
  const filteredPurchaseLocations = { ...purchaseLocations };
  const filteredStorageLocations = { ...storageLocations };
  
  return {
    metals: filteredMetals,
    types: filteredTypes,
    dates: filteredDates,
    purchaseLocations: filteredPurchaseLocations,
    storageLocations: filteredStorageLocations,
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
      case 'collectable':
        const val = item.isCollectable ? 'yes' : 'no';
        return val === value;
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
  
  // Add metal chips for metals that exist in the filtered results (ONLY if count > 0)
  Object.entries(categorySummary.metals).forEach(([metal, count]) => {
    if (count > 0) {
      chips.push({ field: 'metal', value: metal, count, total: categorySummary.totalItems });
    }
  });
  
  // Add type chips for types that exist in the filtered results (ONLY if count > 0)
  Object.entries(categorySummary.types).forEach(([type, count]) => {
    if (count > 0) {
      chips.push({ field: 'type', value: type, count, total: categorySummary.totalItems });
    }
  });
  
  // Add date chips for dates with >10 matches
  Object.entries(categorySummary.dates).forEach(([date, count]) => {
    if (count > 10) {
      chips.push({ field: 'date', value: date, count, total: categorySummary.totalItems });
    }
  });
  
  // Add purchase location chips (all locations, regardless of count)
  Object.entries(categorySummary.purchaseLocations).forEach(([location, count]) => {
    if (count > 0) {
      chips.push({ field: 'purchaseLocation', value: location, count, total: categorySummary.totalItems });
    }
  });
  
  // Add storage location chips (all locations, regardless of count)
  Object.entries(categorySummary.storageLocations).forEach(([location, count]) => {
    if (count > 0) {
      chips.push({ field: 'storageLocation', value: location, count, total: categorySummary.totalItems });
    }
  });

  // Add any explicitly applied filter chips (but not if they duplicate category chips)
  Object.entries(activeFilters).forEach(([field, criteria]) => {
    // Skip metal and type filters as they're handled by category summary
    if (field === 'metal' || field === 'type') return;
    
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
  
  // Add legacy column filter chips (but not metal/type which are handled above)
  Object.entries(columnFilters).forEach(([field, value]) => {
    if (field === 'metal' || field === 'type') return; // Skip, handled by category summary
    if (!activeFilters[field] && value && value.toString().trim()) {
      chips.push({ field, value });
    }
  });

  if (chips.length === 0) {
    container.style.display = 'none';
    return;
  }
  
  container.style.display = '';

  const colors = ['var(--primary)', 'var(--secondary)', 'var(--success)', 'var(--warning)', 'var(--danger)', 'var(--info)'];

  console.log('Rendering active filters:', chips);
  chips.forEach((f, i) => {
    const chip = document.createElement('span');
    chip.className = 'filter-chip';
    const firstValue = String(f.value).split(', ')[0];
    let color;
    let textColor;
    switch (f.field) {
      case 'type':
        color = getTypeColor(firstValue);
        console.log('Type color:', color, 'Value:', firstValue);
        break;
      case 'metal': {
        let key = firstValue;
        if (!METAL_COLORS[key]) {
          color = getColor(nameColors, key); // Fallback to getColor for undefined metals
          console.log('Metal fallback color:', color, 'Key:', key);
        } else {
          color = METAL_COLORS[key];
          textColor = METAL_TEXT_COLORS[key] ? METAL_TEXT_COLORS[key]() : undefined;
          console.log('Metal predefined color:', color, 'Text color:', textColor, 'Key:', key);
        }
        break;
      }
      case 'date':
        color = 'var(--info)'; // Use info color for dates
        console.log('Date color:', color, 'Value:', firstValue);
        break;
      case 'purchaseLocation':
        color = getPurchaseLocationColor(firstValue);
        console.log('Purchase location color:', color, 'Value:', firstValue);
        break;
      case 'storageLocation':
        color = getStorageLocationColor(firstValue);
        console.log('Storage location color:', color, 'Value:', firstValue);
        break;
      default:
        color = colors[i % colors.length];
        console.log('Default color:', color, 'Value:', firstValue);
    }
    const bg = color || colors[i % colors.length];
    chip.style.backgroundColor = bg;
    chip.style.color = textColor || getContrastColor(bg);
    console.log('Final chip colors:', { backgroundColor: bg, textColor });

    // Only display the simplified content, with counts for category chips
    const displayValue = simplifyChipValue(f.value, f.field);
    let label;
    
    if (f.field === 'search') {
      label = displayValue;
    } else if (f.count !== undefined && f.total !== undefined) {
      // For category summary chips (metal/type), show count
      label = `${displayValue} ${f.count}/${f.total}`;
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
    
    // Different tooltip and click behavior for different chip types
    if (f.count !== undefined && f.total !== undefined) {
      // Category summary chips - clicking adds filter
      chip.title = `Click to filter by ${f.field}: ${displayValue} (${f.count} items)`;
      chip.onclick = () => {
        applyQuickFilter(f.field, f.value);
      };
    } else {
      // Active filter chips - clicking removes filter
      chip.title = f.field === 'search'
        ? `Search term: ${displayValue} (click to remove)`
        : `Active filter: ${f.field} = ${displayValue} (click to remove)`;
      chip.onclick = () => {
        removeFilter(f.field, f.value);
        renderActiveFilters();
      };
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
          item.notes || ''
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
          (item.isCollectable ? 'yes' : 'no').includes(word)
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

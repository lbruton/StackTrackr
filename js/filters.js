const filterInventoryAdvanced = () => {
  let result = inventory;

  // 1. Pre-process filters into predicates
  const predicates = Object.entries(activeFilters).map(([field, criteria]) => {
    // Handle date ranges (single value, not array)
    if (field === 'dateFrom' || field === 'dateTo') {
      return { type: field, value: criteria };
    }

    // Handle array-based filters
    if (criteria && typeof criteria === 'object' && Array.isArray(criteria.values)) {
      const { values, exclude } = criteria;
      let processedValues;

      switch (field) {
        case 'name':
          processedValues = values.map(v => simplifyChipValue(v, field));
          break;
        case 'metal':
        case 'tags':
          processedValues = values.map(v => v.toLowerCase());
          break;
        case 'type':
          processedValues = values; // Case-sensitive exact match
          break;
        case 'purchaseLocation':
        case 'storageLocation':
          processedValues = values; // Exact match (normalized strings)
          break;
        default:
          processedValues = values.map(v => String(v).toLowerCase());
      }

      return { type: field, values: processedValues, exclude };
    }
    
    return null;
  }).filter(Boolean);

  // 2. Single-pass filter application (only if predicates exist)
  if (predicates.length > 0) {
    result = result.filter(item => {
      for (const p of predicates) {
        let match = false;

        switch (p.type) {
          case 'name': {
            const itemName = simplifyChipValue(item.name || '', 'name');
            match = p.values.includes(itemName);
            break;
          }
          case 'metal': {
            const itemMetal = getCompositionFirstWords(item.composition || item.metal || '').toLowerCase();
            match = p.values.includes(itemMetal);
            break;
          }
          case 'type': {
            match = p.values.includes(item.type);
            break;
          }
          case 'purchaseLocation': {
            const loc = item.purchaseLocation;
            const normalized = (!loc || loc === 'Unknown' || loc === 'Numista Import') ? '—' : loc;
            match = p.values.includes(normalized);
            break;
          }
          case 'storageLocation': {
            const loc = item.storageLocation;
            const normalized = (!loc || loc === 'Unknown' || loc === 'Numista Import') ? '—' : loc;
            match = p.values.includes(normalized);
            break;
          }
          case 'tags': {
            if (typeof getItemTags === 'function') {
              const tags = getItemTags(item.uuid);
              match = tags.some(t => p.values.includes(t.toLowerCase()));
            }
            break;
          }
          case 'dateFrom': {
            if (item.date < p.value) return false;
            match = true; // Implicit match for range check
            break;
          }
          case 'dateTo': {
            if (item.date > p.value) return false;
            match = true; // Implicit match for range check
            break;
          }
          default: {
            // Generic field handling (e.g. year, grade, etc.)
            const fieldVal = String(item[p.type] ?? '').toLowerCase();
            match = p.values.includes(fieldVal);
            break;
          }
        }

        // Apply exclusion logic (except for date ranges which return early on failure)
        if (p.type !== 'dateFrom' && p.type !== 'dateTo') {
          if (p.exclude) {
            if (match) return false;
          } else {
            if (!match) return false;
          }
        }
      }
      return true;
    });
  }

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
        // STACK-62: Expand abbreviations in the query words for multi-word searches
        const abbrevs = typeof METAL_ABBREVIATIONS !== 'undefined' ? METAL_ABBREVIATIONS : {};
        const expandedWords = words.map(w => abbrevs[w.toLowerCase()] || w);
        const expandedPhrase = expandedWords.join(' ').toLowerCase();

        // For multi-word searches, check if the exact phrase exists or
        // if all words exist as separate word boundaries without conflicting words
        const exactPhrase = q.toLowerCase();
        // STAK-126: include tags in searchable text
        let itemText = searchCache.get(item);
        if (itemText === undefined) {
          const _searchTags = typeof getItemTags === 'function' ? getItemTags(item.uuid).join(' ') : '';
          itemText = [
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
            item.serialNumber || '',
            _searchTags
          ].join(' ').toLowerCase();
          searchCache.set(item, itemText);
        }

        // Check for exact phrase match first
        if (itemText.includes(exactPhrase)) {
          return true;
        }

        // STACK-62: Check expanded abbreviation phrase (e.g. "ase 2024" → "american silver eagle 2024")
        if (expandedPhrase !== exactPhrase && itemText.includes(expandedPhrase)) {
          return true;
        }

        // STACK-23: Check custom chip group label matching for multi-word searches
        if (typeof window.itemMatchesCustomGroupLabel === 'function' &&
            window.itemMatchesCustomGroupLabel(item, q)) {
          return true;
        }

        // For phrase searches like "American Eagle", be more restrictive
        // Check that all words are present as word boundaries
        const allWordsPresent = words.every(word => {
          // nosemgrep: javascript.dos.rule-non-literal-regexp
          const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          return wordRegex.test(itemText);
        });

        if (!allWordsPresent) {
          return false;
        }
        
        // Prevent cross-metal matching for common coin series
        if (words.length === 2) {
          const seriesResult = matchCoinSeries(words[0], words[1], itemText, exactPhrase);
          if (seriesResult !== null) return seriesResult;
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
      
      // For single words, use word boundary matching with abbreviation expansion
      const fieldMatch = words.every(word => {
        // STACK-62: Build regex with original word + abbreviation expansion
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const patterns = [escaped];
        const abbrevs = typeof METAL_ABBREVIATIONS !== 'undefined' ? METAL_ABBREVIATIONS : {};
        const expansion = abbrevs[word.toLowerCase()];
        if (expansion) {
          patterns.push(expansion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        }
        const combined = patterns.join('|');
        // nosemgrep: javascript.dos.rule-non-literal-regexp
        const wordRegex = new RegExp(`\\b(?:${combined})`, 'i');

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
          (item.serialNumber && wordRegex.test(item.serialNumber)) ||
          (typeof getItemTags === 'function' && getItemTags(item.uuid).some(t => wordRegex.test(t)))
        );
      });
      if (fieldMatch) return true;

      // STACK-23: Fall back to custom chip group label matching
      if (typeof window.itemMatchesCustomGroupLabel === 'function') {
        return window.itemMatchesCustomGroupLabel(item, q);
      }

      // STACK-62: Fuzzy fallback — score item fields when exact matching fails
      if (typeof window.featureFlags !== 'undefined' &&
          window.featureFlags.isEnabled('FUZZY_AUTOCOMPLETE') &&
          typeof fuzzyMatch === 'function') {
        const fuzzyThreshold = typeof AUTOCOMPLETE_CONFIG !== 'undefined'
          ? AUTOCOMPLETE_CONFIG.threshold : 0.3;
        const fieldsToCheck = [item.name, item.purchaseLocation, item.storageLocation || '', item.notes || ''];
        for (const field of fieldsToCheck) {
          if (field && fuzzyMatch(q, field, { threshold: fuzzyThreshold }) > 0) {
            if (!window._fuzzyMatchUsed) window._fuzzyMatchUsed = true;
            return true;
          }
        }
      }

      return false;
    });
  });
};
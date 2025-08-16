// SEARCH FUNCTIONALITY
// =============================================================================

/**
 * Filters inventory based on the current search query and active column filters.
 * Handles advanced multi-term, phrase, and series-specific logic for coins and metals.
 *
 * @returns {Array<Object>} Filtered inventory items matching the search query and filters
 *
 * @example
 * filterInventory();
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

// Note: applyColumnFilter function is now in filters.js for advanced filtering

// Expose for global access
window.filterInventory = filterInventory;

// Apply debounce to search input
const searchInput = document.getElementById('searchInput');
if (searchInput) {
  const debouncedSearch = debounce((query) => {
    searchQuery = query;
    currentPage = 1;
    filterInventory();
  }, 300);

  searchInput.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
  });
}

// =============================================================================


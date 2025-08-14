/**
 * Autocomplete Module for StackTrackr
 * 
 * Provides lookup table generation and management for fuzzy autocomplete functionality.
 * Works with the fuzzy-search.js module to provide intelligent search suggestions.
 * 
 * @fileoverview Autocomplete lookup table generation and management
 * @version 3.04.62
 * @requires fuzzy-search.js
 */

/**
 * Autocomplete system configuration
 */
const AUTOCOMPLETE_CONFIG = {
  /** Maximum number of suggestions to show */
  maxSuggestions: 8,
  /** Minimum characters before showing suggestions */
  minCharacters: 2,
  /** Fuzzy match threshold (0-1) */
  threshold: 0.3,
  /** Cache TTL in milliseconds (1 hour) */
  cacheTTL: 60 * 60 * 1000,
  /** LocalStorage key for lookup cache */
  cacheKey: 'autocomplete_lookup_cache',
  /** LocalStorage key for cache timestamp */
  timestampKey: 'autocomplete_cache_timestamp'
};

/**
 * Lookup table data structure for autocomplete suggestions
 * 
 * @typedef {Object} LookupTable
 * @property {string[]} names - Unique item names from inventory
 * @property {string[]} purchaseLocations - Unique purchase locations
 * @property {string[]} storageLocations - Unique storage locations
 * @property {string[]} types - Unique item types
 * @property {Object} abbreviations - Common abbreviations and expansions
 * @property {number} lastUpdated - Timestamp of last update
 * @property {number} itemCount - Number of inventory items used to generate table
 */

/**
 * Current lookup table instance
 * @type {LookupTable|null}
 */
let currentLookupTable = null;

/**
 * Pre-built lookup database with common precious metals items
 * Sourced from comprehensive industry data for enhanced autocomplete suggestions
 */
const PREBUILT_LOOKUP_DATA = [
  // Government Mint Coins
  "American Gold Eagle", "American Silver Eagle", "American Platinum Eagle", "American Palladium Eagle",
  "American Gold Buffalo", "Canadian Gold Maple Leaf", "Canadian Silver Maple Leaf", "Canadian Platinum Maple Leaf",
  "Canadian Palladium Maple Leaf", "British Gold Britannia", "British Silver Britannia", "British Platinum Britannia",
  "British Gold Sovereign", "British Half Sovereign", "British Quarter Sovereign", "British Double Sovereign",
  "British Five Sovereign", "Austrian Gold Philharmonic", "Austrian Silver Philharmonic", "Austrian Platinum Philharmonic",
  "South African Gold Krugerrand", "South African Silver Krugerrand", "South African Platinum Krugerrand",
  "Chinese Gold Panda", "Chinese Silver Panda", "Australian Gold Kangaroo", "Australian Silver Kangaroo",
  "Australian Platinum Platypus", "Australian Silver Kookaburra", "Australian Silver Koala",
  "Australian Gold Lunar Series III", "Australian Silver Lunar Series III", "Australian Platinum Lunar Series III",
  "Mexican Gold Libertad", "Mexican Silver Libertad", "Mexican Platinum Libertad",
  
  // Fractional Government Coins
  "Philharmonic 1/10 oz Gold", "Philharmonic 1/4 oz Gold", "Philharmonic 1/2 oz Gold",
  "Britannia 1/10 oz Gold", "Britannia 1/4 oz Gold", "Britannia 1/2 oz Gold",
  "Maple Leaf 1/10 oz Gold", "Maple Leaf 1/4 oz Gold", "Maple Leaf 1/2 oz Gold",
  "Krugerrand 1/10 oz Gold", "Krugerrand 1/4 oz Gold", "Krugerrand 1/2 oz Gold",
  "American Eagle 1/10 oz Gold", "American Eagle 1/4 oz Gold", "American Eagle 1/2 oz Gold",
  
  // Lunar Series
  "Australian Gold Lunar Year of the Rat", "Australian Gold Lunar Year of the Ox", "Australian Gold Lunar Year of the Tiger",
  "Australian Gold Lunar Year of the Rabbit", "Australian Gold Lunar Year of the Dragon", "Australian Gold Lunar Year of the Snake",
  "Australian Gold Lunar Year of the Horse", "Australian Gold Lunar Year of the Goat", "Australian Gold Lunar Year of the Monkey",
  "Australian Gold Lunar Year of the Rooster", "Australian Gold Lunar Year of the Dog", "Australian Gold Lunar Year of the Pig",
  "Australian Silver Lunar Year of the Rat", "Australian Silver Lunar Year of the Ox", "Australian Silver Lunar Year of the Tiger",
  "Australian Silver Lunar Year of the Rabbit", "Australian Silver Lunar Year of the Dragon", "Australian Silver Lunar Year of the Snake",
  "Australian Silver Lunar Year of the Horse", "Australian Silver Lunar Year of the Goat", "Australian Silver Lunar Year of the Monkey",
  "Australian Silver Lunar Year of the Rooster", "Australian Silver Lunar Year of the Dog", "Australian Silver Lunar Year of the Pig",
  
  // International and Regional Coins
  "New Zealand Silver Fern", "New Zealand Silver Kiwi", "Niue Silver Hawksbill Turtle", "Niue Silver Czech Lion",
  "Niue Gold Czech Lion", "Somalian Silver Elephant", "Somalian Gold Elephant", "Armenian Silver Noah's Ark",
  "Armenian Gold Noah's Ark", "Armenian Platinum Noah's Ark", "Isle of Man Gold Angel", "Isle of Man Silver Angel",
  "Isle of Man Platinum Noble", "Isle of Man Gold Noble", "Cook Islands Silver Bounty", "Cook Islands Gold Bounty",
  
  // Modern Collectible Series
  "Niue Silver Disney Mickey", "Niue Silver Star Wars", "Niue Silver Marvel", "Niue Silver Harry Potter",
  "Tuvalu Silver Marvel Series", "Tuvalu Silver Lunar Dragon", "Tuvalu Silver Zeus", "Tuvalu Silver Thor",
  "Tuvalu Silver Black Panther", "Tuvalu Silver James Bond", "Tuvalu Silver Simpson", "Tuvalu Black Flag",
  
  // Wildlife and Nature Series
  "Somalia Silver Leopard", "Somalia Silver African Wildlife Buffalo", "Somalia Silver African Wildlife Giraffe",
  "Somalia Silver African Wildlife Rhino", "Somalia Silver African Wildlife Hippo", "Somalia Silver African Wildlife Cheetah",
  "Somalia Silver African Wildlife Zebra", "Somalia Silver African Wildlife Lion", "Somalia Silver African Wildlife Elephant Prooflike",
  "RCM Silver Wildlife Wolf", "RCM Silver Wildlife Grizzly", "RCM Silver Wildlife Cougar", "RCM Silver Wildlife Moose",
  "RCM Silver Wildlife Antelope", "RCM Silver Wildlife Bison", "RCM Silver Birds of Prey Peregrine Falcon",
  "RCM Silver Birds of Prey Bald Eagle", "RCM Silver Birds of Prey Red-Tailed Hawk", "RCM Silver Birds of Prey Great Horned Owl",
  "Australian Silver Wedge-Tailed Eagle", "Australian Gold Wedge-Tailed Eagle", "Australian Silver Emu",
  "Australian Silver Swan", "Australian Gold Swan", "Kazakhstan Silver Snow Leopard",
  
  // Private Mint Rounds
  "Buffalo 1 oz Silver Round", "Walking Liberty 1 oz Silver Round", "Incuse Indian 1 oz Silver Round",
  "Morgan Design 1 oz Silver Round", "Saint-Gaudens Design 1 oz Silver Round", "Mercury Dime Design 1 oz Silver Round",
  "Standing Liberty Design 1 oz Silver Round", "Aztec Calendar 1 oz Silver Round", "Don't Tread on Me 1 oz Silver Round",
  "Sunshine Minting 1 oz Silver Round", "Sunshine Minting 1 oz Gold Round", "Asahi 1 oz Silver Round",
  "Scottsdale Stacker 2 oz Silver Round", "Scottsdale King Stacker 2 oz Silver Round",
  "Geiger Edelmetalle 1 oz Silver Round", "Geiger Edelmetalle 1 oz Gold Round",
  "SilverTowne Prospector 1 oz Silver Round", "SilverTowne Indian Head 1 oz Silver Round",
  "Golden State Mint Buffalo 1 oz Silver Round", "Golden State Mint Walking Liberty 1 oz Silver Round",
  "Prospector 1 oz Silver Round", "Freedom Girl 1 oz Silver Round", "Spartan Helmet 1 oz Silver Round",
  
  // Specialty and Themed Rounds
  "Zombucks Walker 1 oz Silver Round", "Zombucks Morgan 1 oz Silver Round", "Zombucks Barber 1 oz Silver Round",
  "Zombucks Standing Liberty 1 oz Silver Round", "Zombucks St. Gaudens 1 oz Silver Round",
  "Intaglio Mint Buffalo 1 oz Silver Round", "Intaglio Mint Molon Labe 1 oz Silver Round",
  "Intaglio Mint Egyptian Pyramid 1 oz Silver Round", "Intaglio Mint Crusader 1 oz Silver Round",
  "Egyptian God Anubis 2 oz Silver Round", "Egyptian God Osiris 2 oz Silver Round", "Egyptian God Horus 2 oz Silver Round",
  
  // Precious Metals Bars - PAMP Suisse
  "PAMP Suisse 1 g Gold Bar", "PAMP Suisse 2.5 g Gold Bar", "PAMP Suisse 5 g Gold Bar", "PAMP Suisse 10 g Gold Bar",
  "PAMP Suisse 20 g Gold Bar", "PAMP Suisse 1 oz Gold Bar", "PAMP Suisse 50 g Gold Bar", "PAMP Suisse 100 g Gold Bar",
  "PAMP Suisse 250 g Gold Bar", "PAMP Suisse 10 oz Gold Bar", "PAMP Suisse 500 g Gold Bar", "PAMP Suisse 1 kg Gold Bar",
  "PAMP Suisse 1 oz Silver Bar", "PAMP Suisse 50 g Silver Bar", "PAMP Suisse 100 g Silver Bar",
  "PAMP Suisse 250 g Silver Bar", "PAMP Suisse 10 oz Silver Bar", "PAMP Suisse 500 g Silver Bar", "PAMP Suisse 1 kg Silver Bar",
  
  // Credit Suisse Bars
  "Credit Suisse 1 g Gold Bar", "Credit Suisse 2.5 g Gold Bar", "Credit Suisse 5 g Gold Bar", "Credit Suisse 10 g Gold Bar",
  "Credit Suisse 20 g Gold Bar", "Credit Suisse 1 oz Gold Bar", "Credit Suisse 50 g Gold Bar", "Credit Suisse 100 g Gold Bar",
  "Credit Suisse 250 g Gold Bar", "Credit Suisse 10 oz Gold Bar", "Credit Suisse 500 g Gold Bar", "Credit Suisse 1 kg Gold Bar",
  "Credit Suisse 1 oz Silver Bar", "Credit Suisse 50 g Silver Bar", "Credit Suisse 100 g Silver Bar",
  "Credit Suisse 250 g Silver Bar", "Credit Suisse 10 oz Silver Bar", "Credit Suisse 500 g Silver Bar", "Credit Suisse 1 kg Silver Bar",
  
  // Valcambi Bars
  "Valcambi 1 g Gold Bar", "Valcambi 2.5 g Gold Bar", "Valcambi 5 g Gold Bar", "Valcambi 10 g Gold Bar",
  "Valcambi 20 g Gold Bar", "Valcambi 1 oz Gold Bar", "Valcambi 50 g Gold Bar", "Valcambi 100 g Gold Bar",
  "Valcambi 250 g Gold Bar", "Valcambi 10 oz Gold Bar", "Valcambi 500 g Gold Bar", "Valcambi 1 kg Gold Bar",
  "Valcambi 1 oz Silver Bar", "Valcambi 50 g Silver Bar", "Valcambi 100 g Silver Bar",
  "Valcambi 250 g Silver Bar", "Valcambi 10 oz Silver Bar", "Valcambi 500 g Silver Bar", "Valcambi 1 kg Silver Bar",
  
  // Perth Mint Bars
  "Perth Mint 1 g Gold Bar", "Perth Mint 2.5 g Gold Bar", "Perth Mint 5 g Gold Bar", "Perth Mint 10 g Gold Bar",
  "Perth Mint 20 g Gold Bar", "Perth Mint 1 oz Gold Bar", "Perth Mint 50 g Gold Bar", "Perth Mint 100 g Gold Bar",
  "Perth Mint 250 g Gold Bar", "Perth Mint 10 oz Gold Bar", "Perth Mint 500 g Gold Bar", "Perth Mint 1 kg Gold Bar",
  "Perth Mint 1 oz Silver Bar", "Perth Mint 50 g Silver Bar", "Perth Mint 100 g Silver Bar",
  "Perth Mint 250 g Silver Bar", "Perth Mint 10 oz Silver Bar", "Perth Mint 500 g Silver Bar", "Perth Mint 1 kg Silver Bar",
  
  // Royal Canadian Mint Bars
  "Royal Canadian Mint 1 g Gold Bar", "Royal Canadian Mint 2.5 g Gold Bar", "Royal Canadian Mint 5 g Gold Bar",
  "Royal Canadian Mint 10 g Gold Bar", "Royal Canadian Mint 20 g Gold Bar", "Royal Canadian Mint 1 oz Gold Bar",
  "Royal Canadian Mint 50 g Gold Bar", "Royal Canadian Mint 100 g Gold Bar", "Royal Canadian Mint 250 g Gold Bar",
  "Royal Canadian Mint 10 oz Gold Bar", "Royal Canadian Mint 500 g Gold Bar", "Royal Canadian Mint 1 kg Gold Bar",
  "Royal Canadian Mint 1 oz Silver Bar", "Royal Canadian Mint 50 g Silver Bar", "Royal Canadian Mint 100 g Silver Bar",
  "Royal Canadian Mint 250 g Silver Bar", "Royal Canadian Mint 10 oz Silver Bar", "Royal Canadian Mint 500 g Silver Bar",
  "Royal Canadian Mint 1 kg Silver Bar",
  
  // Additional Major Refiners
  "Johnson Matthey 1 oz Gold Bar", "Johnson Matthey 10 oz Gold Bar", "Johnson Matthey 1 oz Silver Bar",
  "Johnson Matthey 10 oz Silver Bar", "Johnson Matthey 100 oz Silver Bar", "Engelhard 1 oz Gold Bar",
  "Engelhard 10 oz Gold Bar", "Engelhard 1 oz Silver Bar", "Engelhard 10 oz Silver Bar", "Engelhard 100 oz Silver Bar",
  "Heraeus 1 oz Gold Bar", "Heraeus 10 oz Gold Bar", "Heraeus 1 oz Silver Bar", "Heraeus 10 oz Silver Bar",
  "Metalor 1 oz Gold Bar", "Metalor 10 oz Gold Bar", "Metalor 1 oz Silver Bar", "Metalor 10 oz Silver Bar",
  "Argor-Heraeus 1 oz Gold Bar", "Argor-Heraeus 10 oz Gold Bar", "Argor-Heraeus 1 oz Silver Bar", "Argor-Heraeus 10 oz Silver Bar"
];
const METAL_ABBREVIATIONS = {
  // Silver variations
  'ase': 'American Silver Eagle',
  'agl': 'American Gold Eagle',
  'cml': 'Canadian Maple Leaf',
  'ap': 'Austrian Philharmonic',
  'br': 'Britannia',
  'panda': 'Chinese Panda',
  'libertad': 'Mexican Libertad',
  'kook': 'Australian Kookaburra',
  'koala': 'Australian Koala',
  
  // Common metal types
  'ag': 'silver',
  'au': 'gold',
  'pt': 'platinum',
  'pd': 'palladium',
  
  // Common terms
  'oz': 'ounce',
  '1oz': '1 ounce',
  'bu': 'brilliant uncirculated',
  'ms': 'mint state',
  'pf': 'proof',
  'pr': 'proof'
};

/**
 * Extract unique values from inventory for a specific field
 * 
 * @param {Array} inventory - Current inventory data
 * @param {string} field - Field name to extract
 * @param {Object} [options={}] - Extraction options
 * @param {boolean} [options.includeEmpty=false] - Include empty/null values
 * @param {boolean} [options.caseSensitive=false] - Preserve original case
 * @returns {string[]} Array of unique values
 */
const extractUniqueValues = (inventory, field, options = {}) => {
  try {
    const { includeEmpty = false, caseSensitive = false } = options;
    
    if (!Array.isArray(inventory)) {
      console.warn('extractUniqueValues: inventory must be an array');
      return [];
    }
    
    const values = new Set();
    
    inventory.forEach(item => {
      if (!item || typeof item !== 'object') return;
      
      let value = item[field];
      
      // Handle different value types
      if (value === null || value === undefined) {
        if (includeEmpty) values.add('');
        return;
      }
      
      // Convert to string and normalize
      value = String(value).trim();
      
      if (!value && !includeEmpty) return;
      
      // Normalize case if not case sensitive
      const normalizedValue = caseSensitive ? value : value.toLowerCase();
      
      // Only add non-empty values or if empty values are explicitly included
      if (normalizedValue || includeEmpty) {
        values.add(caseSensitive ? value : normalizedValue);
      }
    });
    
    return Array.from(values).sort();
  } catch (error) {
    console.error('extractUniqueValues error:', error);
    return [];
  }
};

/**
 * Generate searchable variations for a given term
 * Includes common abbreviations, partial matches, and variations
 * 
 * @param {string} term - Original term
 * @returns {string[]} Array of searchable variations
 */
const generateVariations = (term) => {
  if (!term || typeof term !== 'string') return [];
  
  const variations = new Set([term]);
  const normalized = term.toLowerCase().trim();
  
  // Add normalized version
  variations.add(normalized);
  
  // Add individual words
  const words = normalized.split(/\s+/);
  words.forEach(word => {
    if (word.length >= 2) {
      variations.add(word);
    }
  });
  
  // Add partial prefixes (for names 4+ characters)
  if (normalized.length >= 4) {
    for (let i = 3; i <= Math.min(normalized.length, 8); i++) {
      variations.add(normalized.substring(0, i));
    }
  }
  
  // Check for known abbreviations
  const abbrevExpansion = METAL_ABBREVIATIONS[normalized];
  if (abbrevExpansion) {
    variations.add(abbrevExpansion);
  }
  
  // Check if this term could be an expansion of an abbreviation
  Object.entries(METAL_ABBREVIATIONS).forEach(([abbrev, expansion]) => {
    if (expansion.toLowerCase().includes(normalized)) {
      variations.add(abbrev);
    }
  });
  
  return Array.from(variations);
};

/**
 * Normalize item name to base form for grouping
 * Removes year prefixes and matches against lookup table
 * @param {string} fullName - Full item name (e.g., "2024 American Silver Eagle")
 * @returns {string} Base name (e.g., "American Silver Eagle")
 */
const normalizeItemName = (fullName) => {
  if (!fullName || typeof fullName !== 'string') {
    return fullName || '';
  }

  // Remove leading and trailing whitespace
  let normalized = fullName.trim();
  
  // Remove year prefixes (2020-2030 range) and common fractional patterns
  normalized = normalized.replace(/^(20[2-3][0-9])\s+/, '');
  
  // Handle fractional patterns like "1/10 oz", "1/4 oz", "1/2 oz"
  const fractionalPattern = /\b(1\/10|1\/4|1\/2)\s+(oz|ounce)\s+/i;
  let fractionalMatch = normalized.match(fractionalPattern);
  let fractionalPart = '';
  if (fractionalMatch) {
    fractionalPart = fractionalMatch[0].trim() + ' ';
    normalized = normalized.replace(fractionalPattern, '').trim();
  }
  
  // Try to find exact match in PREBUILT_LOOKUP_DATA first
  const exactMatch = PREBUILT_LOOKUP_DATA.find(baseName => 
    normalized.toLowerCase() === baseName.toLowerCase()
  );
  if (exactMatch) {
    return fractionalPart + exactMatch;
  }
  
  // Try fuzzy matching against PREBUILT_LOOKUP_DATA
  const normalizedLower = normalized.toLowerCase();
  for (const baseName of PREBUILT_LOOKUP_DATA) {
    const baseNameLower = baseName.toLowerCase();
    
    // Check if the normalized name contains the base name
    if (normalizedLower.includes(baseNameLower)) {
      return fractionalPart + baseName;
    }
    
    // Check if the base name contains the normalized name (for shorter variants)
    if (baseNameLower.includes(normalizedLower) && normalizedLower.length >= 5) {
      return fractionalPart + baseName;
    }
    
    // Check for partial word matches (at least 2 significant words matching)
    const normalizedWords = normalizedLower.split(/\s+/).filter(word => word.length >= 3);
    const baseWords = baseNameLower.split(/\s+/).filter(word => word.length >= 3);
    
    if (normalizedWords.length >= 2 && baseWords.length >= 2) {
      const matchingWords = normalizedWords.filter(word => 
        baseWords.some(baseWord => baseWord.includes(word) || word.includes(baseWord))
      );
      
      if (matchingWords.length >= Math.min(2, normalizedWords.length)) {
        return fractionalPart + baseName;
      }
    }
  }
  
  // Handle common variations not in lookup table
  const commonVariations = {
    'buffalo': 'Buffalo Round',
    'walking liberty': 'Walking Liberty Round',
    'morgan': 'Morgan Design Round',
    'peace': 'Peace Dollar Design Round',
    'saint gaudens': 'Saint-Gaudens Design Round',
    'mercury': 'Mercury Dime Design Round'
  };
  
  for (const [pattern, replacement] of Object.entries(commonVariations)) {
    if (normalizedLower.includes(pattern)) {
      return fractionalPart + replacement;
    }
  }
  
  // If no match found, return the original name with year removed
  return fractionalPart + normalized;
};

/**
 * Build searchable indices with variants for all lookup data
 * 
 * @param {LookupTable} lookupTable - Base lookup table data
 * @returns {Object} Enhanced lookup table with search indices
 */
const buildSearchIndices = (lookupTable) => {
  try {
    const indices = {
      nameVariants: new Map(),
      locationVariants: new Map(),
      typeVariants: new Map()
    };
    
    // Build name variants index
    lookupTable.names.forEach(name => {
      const variations = generateVariations(name);
      variations.forEach(variant => {
        if (!indices.nameVariants.has(variant)) {
          indices.nameVariants.set(variant, []);
        }
        indices.nameVariants.get(variant).push(name);
      });
    });
    
    // Build purchase location variants index
    lookupTable.purchaseLocations.forEach(location => {
      const variations = generateVariations(location);
      variations.forEach(variant => {
        if (!indices.locationVariants.has(variant)) {
          indices.locationVariants.set(variant, []);
        }
        indices.locationVariants.get(variant).push(location);
      });
    });
    
    // Build storage location variants index
    lookupTable.storageLocations.forEach(location => {
      const variations = generateVariations(location);
      variations.forEach(variant => {
        if (!indices.locationVariants.has(variant)) {
          indices.locationVariants.set(variant, []);
        }
        indices.locationVariants.get(variant).push(location);
      });
    });
    
    // Build type variants index
    lookupTable.types.forEach(type => {
      const variations = generateVariations(type);
      variations.forEach(variant => {
        if (!indices.typeVariants.has(variant)) {
          indices.typeVariants.set(variant, []);
        }
        indices.typeVariants.get(variant).push(type);
      });
    });
    
    return {
      ...lookupTable,
      searchIndices: {
        nameVariants: indices.nameVariants,
        locationVariants: indices.locationVariants,
        typeVariants: indices.typeVariants
      }
    };
  } catch (error) {
    console.error('buildSearchIndices error:', error);
    return lookupTable;
  }
};

/**
 * Generate lookup table from current inventory data with pre-built seed data
 * 
 * @param {Array} [inventory] - Inventory data (defaults to global inventory)
 * @param {Object} [options={}] - Generation options
 * @param {boolean} [options.includeAbbreviations=true] - Include metal abbreviations
 * @param {boolean} [options.buildIndices=true] - Build search indices
 * @param {boolean} [options.usePrebuiltData=true] - Include pre-built industry data
 * @returns {LookupTable} Generated lookup table
 */
const generateLookupTable = (inventory, options = {}) => {
  try {
    const { includeAbbreviations = true, buildIndices = true, usePrebuiltData = true } = options;
    
    // Use global inventory if not provided
    const data = inventory || (typeof window !== 'undefined' && window.inventory) || [];
    
    if (!Array.isArray(data)) {
      console.warn('generateLookupTable: No valid inventory data provided');
      return createEmptyLookupTable();
    }
    
    console.log(`🔍 Generating lookup table from ${data.length} inventory items...`);
    
    // Extract unique values for each field from inventory
    const inventoryNames = extractUniqueValues(data, 'name');
    const inventoryPurchaseLocations = extractUniqueValues(data, 'purchase_location');
    const inventoryStorageLocations = extractUniqueValues(data, 'storage_location');
    const inventoryTypes = extractUniqueValues(data, 'type');
    
    // Combine with pre-built data if enabled
    let allNames = inventoryNames;
    let allPurchaseLocations = inventoryPurchaseLocations;
    let allStorageLocations = inventoryStorageLocations;
    let allTypes = inventoryTypes;
    
    if (usePrebuiltData) {
      // Add pre-built names
      const combinedNames = new Set([...inventoryNames, ...PREBUILT_LOOKUP_DATA]);
      allNames = Array.from(combinedNames).sort();
      
      // Add common purchase locations (if none exist)
      if (inventoryPurchaseLocations.length === 0) {
        allPurchaseLocations = [
          'APMEX', 'JM Bullion', 'SD Bullion', 'Provident Metals', 'Golden Eagle Coins',
          'Money Metals Exchange', 'Bullion Exchanges', 'Liberty Coin', 'Local Coin Shop',
          'Precious Metals Exchange', 'Scottsdale Mint', 'SilverTowne', 'BGASC',
          'Gainesville Coins', 'Texas Precious Metals', 'Bullion Depot'
        ].sort();
      } else {
        allPurchaseLocations = inventoryPurchaseLocations;
      }
      
      // Add common storage locations (if none exist)
      if (inventoryStorageLocations.length === 0) {
        allStorageLocations = [
          'Home Safe', 'Bank Safety Deposit Box', 'Private Vault', 'Home Storage',
          'Safety Deposit Box', 'Secure Storage Facility', 'Personal Safe',
          'Bank Vault', 'Precious Metals Depository', 'Allocated Storage'
        ].sort();
      } else {
        allStorageLocations = inventoryStorageLocations;
      }
      
      // Add standard types (if none exist)
      if (inventoryTypes.length === 0) {
        allTypes = ['Coin', 'Bar', 'Round', 'Note', 'Other'].sort();
      } else {
        const combinedTypes = new Set([...inventoryTypes, 'Coin', 'Bar', 'Round', 'Note', 'Other']);
        allTypes = Array.from(combinedTypes).sort();
      }
    }
    
    // Create base lookup table
    let lookupTable = {
      names: allNames,
      purchaseLocations: allPurchaseLocations,
      storageLocations: allStorageLocations,
      types: allTypes,
      abbreviations: includeAbbreviations ? { ...METAL_ABBREVIATIONS } : {},
      lastUpdated: Date.now(),
      itemCount: data.length,
      prebuiltItemCount: usePrebuiltData ? PREBUILT_LOOKUP_DATA.length : 0
    };
    
    // Build search indices if requested
    if (buildIndices) {
      lookupTable = buildSearchIndices(lookupTable);
    }
    
    const totalNames = allNames.length;
    const prebuiltCount = usePrebuiltData ? PREBUILT_LOOKUP_DATA.length : 0;
    
    console.log(`✅ Lookup table generated: ${totalNames} names (${prebuiltCount} pre-built + ${inventoryNames.length} from inventory), ${allPurchaseLocations.length} purchase locations, ${allStorageLocations.length} storage locations, ${allTypes.length} types`);
    
    return lookupTable;
  } catch (error) {
    console.error('generateLookupTable error:', error);
    return createEmptyLookupTable();
  }
};

/**
 * Create an empty lookup table structure with pre-built data
 * 
 * @returns {LookupTable} Empty lookup table with pre-built seed data
 */
const createEmptyLookupTable = () => ({
  names: [...PREBUILT_LOOKUP_DATA],
  purchaseLocations: [
    'APMEX', 'JM Bullion', 'SD Bullion', 'Provident Metals', 'Golden Eagle Coins',
    'Money Metals Exchange', 'Bullion Exchanges', 'Liberty Coin', 'Local Coin Shop',
    'Precious Metals Exchange', 'Scottsdale Mint', 'SilverTowne', 'BGASC'
  ],
  storageLocations: [
    'Home Safe', 'Bank Safety Deposit Box', 'Private Vault', 'Home Storage',
    'Safety Deposit Box', 'Secure Storage Facility', 'Personal Safe'
  ],
  types: ['Coin', 'Bar', 'Round', 'Note', 'Other'],
  abbreviations: { ...METAL_ABBREVIATIONS },
  lastUpdated: Date.now(),
  itemCount: 0,
  prebuiltItemCount: PREBUILT_LOOKUP_DATA.length,
  searchIndices: {
    nameVariants: new Map(),
    locationVariants: new Map(),
    typeVariants: new Map()
  }
});

/**
 * Load lookup table from cache or generate new one
 * 
 * @param {Array} [inventory] - Current inventory data
 * @param {boolean} [forceRefresh=false] - Force regeneration regardless of cache
 * @returns {LookupTable} Lookup table data
 */
const loadLookupTable = (inventory, forceRefresh = false) => {
  try {
    // Check if we should use cached data
    if (!forceRefresh) {
      const cached = getCachedLookupTable();
      if (cached) {
        console.log('📋 Using cached lookup table');
        currentLookupTable = cached;
        return cached;
      }
    }
    
    // Generate new lookup table
    const newTable = generateLookupTable(inventory);
    
    // Cache the result
    cacheLookupTable(newTable);
    currentLookupTable = newTable;
    
    return newTable;
  } catch (error) {
    console.error('loadLookupTable error:', error);
    const emptyTable = createEmptyLookupTable();
    currentLookupTable = emptyTable;
    return emptyTable;
  }
};

/**
 * Get cached lookup table if valid
 * 
 * @returns {LookupTable|null} Cached lookup table or null if invalid/expired
 */
const getCachedLookupTable = () => {
  try {
    if (typeof localStorage === 'undefined') return null;
    
    const timestampStr = localStorage.getItem(AUTOCOMPLETE_CONFIG.timestampKey);
    const cacheStr = localStorage.getItem(AUTOCOMPLETE_CONFIG.cacheKey);
    
    if (!timestampStr || !cacheStr) return null;
    
    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();
    
    // Check if cache has expired
    if (now - timestamp > AUTOCOMPLETE_CONFIG.cacheTTL) {
      console.log('📋 Lookup table cache expired');
      return null;
    }
    
    const cached = JSON.parse(cacheStr);
    
    // Validate cache structure
    if (!cached || typeof cached !== 'object' || !Array.isArray(cached.names)) {
      console.warn('📋 Invalid cached lookup table structure');
      return null;
    }
    
    // Convert search indices back to Maps (they're serialized as objects)
    if (cached.searchIndices) {
      cached.searchIndices.nameVariants = new Map(Object.entries(cached.searchIndices.nameVariants || {}));
      cached.searchIndices.locationVariants = new Map(Object.entries(cached.searchIndices.locationVariants || {}));
      cached.searchIndices.typeVariants = new Map(Object.entries(cached.searchIndices.typeVariants || {}));
    }
    
    return cached;
  } catch (error) {
    console.warn('getCachedLookupTable error:', error);
    return null;
  }
};

/**
 * Cache lookup table to localStorage
 * 
 * @param {LookupTable} lookupTable - Lookup table to cache
 */
const cacheLookupTable = (lookupTable) => {
  try {
    if (typeof localStorage === 'undefined') return;
    
    // Convert Maps to objects for serialization
    const serializable = { ...lookupTable };
    if (lookupTable.searchIndices) {
      serializable.searchIndices = {
        nameVariants: Object.fromEntries(lookupTable.searchIndices.nameVariants || []),
        locationVariants: Object.fromEntries(lookupTable.searchIndices.locationVariants || []),
        typeVariants: Object.fromEntries(lookupTable.searchIndices.typeVariants || [])
      };
    }
    
    localStorage.setItem(AUTOCOMPLETE_CONFIG.cacheKey, JSON.stringify(serializable));
    localStorage.setItem(AUTOCOMPLETE_CONFIG.timestampKey, Date.now().toString());
    
    console.log('💾 Lookup table cached');
  } catch (error) {
    console.warn('cacheLookupTable error:', error);
  }
};

/**
 * Clear cached lookup table
 */
const clearLookupCache = () => {
  try {
    if (typeof localStorage === 'undefined') return;
    
    localStorage.removeItem(AUTOCOMPLETE_CONFIG.cacheKey);
    localStorage.removeItem(AUTOCOMPLETE_CONFIG.timestampKey);
    
    console.log('🗑️ Lookup table cache cleared');
  } catch (error) {
    console.warn('clearLookupCache error:', error);
  }
};

/**
 * Get current lookup table stats
 * 
 * @returns {Object} Lookup table statistics
 */
const getLookupStats = () => {
  const table = currentLookupTable || createEmptyLookupTable();
  
  return {
    names: table.names.length,
    purchaseLocations: table.purchaseLocations.length,
    storageLocations: table.storageLocations.length,
    types: table.types.length,
    abbreviations: Object.keys(table.abbreviations).length,
    lastUpdated: table.lastUpdated,
    itemCount: table.itemCount,
    hasSearchIndices: !!(table.searchIndices),
    cacheValid: getCachedLookupTable() !== null
  };
};

/**
 * Refresh lookup table from current inventory
 * 
 * @param {Array} [inventory] - Current inventory data
 * @returns {LookupTable} Refreshed lookup table
 */
const refreshLookupTable = (inventory) => {
  console.log('🔄 Refreshing lookup table...');
  clearLookupCache();
  return loadLookupTable(inventory, true);
};

/**
 * Initialize autocomplete system
 * Should be called when inventory is loaded or changed
 * 
 * @param {Array} [inventory] - Current inventory data
 */
const initializeAutocomplete = (inventory) => {
  try {
    console.log('🚀 Initializing autocomplete system...');
    
    // Load or generate lookup table
    const lookupTable = loadLookupTable(inventory);
    
    // Log initialization stats
    const stats = getLookupStats();
    console.log('📊 Autocomplete initialized:', stats);
    
    return lookupTable;
  } catch (error) {
    console.error('initializeAutocomplete error:', error);
    return createEmptyLookupTable();
  }
};

// Export functions for use by other modules
if (typeof window !== 'undefined') {
  window.autocomplete = {
    // Core functions
    generateLookupTable,
    loadLookupTable,
    refreshLookupTable,
    initializeAutocomplete,
    
    // Utility functions
    extractUniqueValues,
    generateVariations,
    buildSearchIndices,
    normalizeItemName,
    
    // Cache management
    getCachedLookupTable,
    cacheLookupTable,
    clearLookupCache,
    
    // Stats and info
    getLookupStats,
    
    // Configuration
    config: AUTOCOMPLETE_CONFIG,
    abbreviations: METAL_ABBREVIATIONS,
    
    // Current state
    getCurrentLookupTable: () => currentLookupTable
  };
}

// For potential Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateLookupTable,
    loadLookupTable,
    refreshLookupTable,
    initializeAutocomplete,
    extractUniqueValues,
    generateVariations,
    buildSearchIndices,
    normalizeItemName,
    getCachedLookupTable,
    cacheLookupTable,
    clearLookupCache,
    getLookupStats,
    config: AUTOCOMPLETE_CONFIG,
    abbreviations: METAL_ABBREVIATIONS,
    getCurrentLookupTable: () => currentLookupTable
  };
}

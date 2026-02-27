// TEST: Benchmarking filterInventoryAdvanced

if (typeof window === 'undefined') {
  global.window = {};
  global.inventory = [];
  global.activeFilters = {};
  global.searchQuery = '';
  global.getItemTags = () => [];
  global.getCompositionFirstWords = (s) => s;
  global.simplifyChipValue = (v) => v;
  global.formatDisplayDate = (d) => d;
  global.searchCache = new WeakMap();
  global.METAL_ABBREVIATIONS = {};
}

// Mock inventory data
const generateMockInventory = (count) => {
  const items = [];
  const metals = ['Silver', 'Gold', 'Platinum', 'Palladium'];
  const types = ['Coin', 'Bar', 'Round'];
  for (let i = 0; i < count; i++) {
    items.push({
      metal: metals[i % 4],
      type: types[i % 3],
      name: `Item ${i}`,
      date: '2023-01-01',
      composition: metals[i % 4],
      qty: 1,
      weight: 1,
      price: 100,
      uuid: `uuid-${i}`
    });
  }
  return items;
};

global.inventory = generateMockInventory(10000);

// Load the function to test
// We'll read the file content and eval it or mock the dependencies and copy-paste the function
// Since we can't easily require the file without exports, let's redefine the function here based on what we read
// OR we can just use the logic we want to optimize.

// Current implementation logic (simplified for benchmark)
const filterInventoryAdvancedOriginal = () => {
  let result = global.inventory;

  Object.entries(global.activeFilters).forEach(([field, criteria]) => {
    if (criteria && typeof criteria === 'object' && Array.isArray(criteria.values)) {
      const { values, exclude } = criteria;
      switch (field) {
        // ... switch cases
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
    }
  });
  return result;
};

// Optimized implementation logic
const filterInventoryAdvancedOptimized = () => {
  const filters = Object.entries(global.activeFilters);
  if (filters.length === 0) return global.inventory;

  // Pre-process filters
  const processedFilters = filters.map(([field, criteria]) => {
    if (criteria && typeof criteria === 'object' && Array.isArray(criteria.values)) {
      return {
        field,
        values: criteria.values,
        exclude: criteria.exclude,
        lowerVals: criteria.values.map(v => String(v).toLowerCase())
      };
    }
    return null;
  }).filter(Boolean);

  return global.inventory.filter(item => {
    // Check all filters for this item
    for (const filter of processedFilters) {
      const { field, lowerVals, exclude } = filter;
      let match = false;

      // Simplified switch for benchmark
       const fieldVal = String(item[field] ?? '').toLowerCase();
       match = lowerVals.includes(fieldVal);

      if (exclude ? match : !match) {
        return false;
      }
    }
    return true;
  });
};

// Benchmark
global.activeFilters = {
  metal: { values: ['Silver'], exclude: false },
  type: { values: ['Coin'], exclude: false }
};

console.time('Original');
for (let i = 0; i < 1000; i++) {
  filterInventoryAdvancedOriginal();
}
console.timeEnd('Original');

console.time('Optimized');
for (let i = 0; i < 1000; i++) {
  filterInventoryAdvancedOptimized();
}
console.timeEnd('Optimized');

// TEST: Benchmarking filterInventoryAdvanced - Take 2

if (typeof window === 'undefined') {
  global.window = {};
  global.inventory = [];
  global.activeFilters = {};
  global.searchQuery = '';
}

// Mock inventory data
const generateMockInventory = (count) => {
  const metals = ['Silver', 'Gold', 'Platinum', 'Palladium'];
  const types = ['Coin', 'Bar', 'Round', 'Note', 'Set'];
  const locations = ['Safe', 'Bank', 'Home', 'Office'];
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push({
      metal: metals[i % 4],
      type: types[i % 5],
      name: `Item ${i}`,
      date: '2023-01-01',
      composition: metals[i % 4],
      qty: 1,
      weight: 1,
      price: 100,
      purchaseLocation: locations[i % 4],
      storageLocation: locations[(i + 1) % 4],
      uuid: `uuid-${i}`
    });
  }
  return items;
};

const ITEMS_COUNT = 50000;
global.inventory = generateMockInventory(ITEMS_COUNT);

// --- Original Implementation (Simulation) ---
const filterOriginal = (inv, filters) => {
  let result = inv;
  Object.entries(filters).forEach(([field, criteria]) => {
    if (criteria && typeof criteria === 'object' && Array.isArray(criteria.values)) {
      const { values, exclude } = criteria;
      // Simulate the switch statement logic from real code
      if (field === 'metal') {
        const lowerVals = values.map(v => v.toLowerCase());
        result = result.filter(item => {
          const itemMetal = (item.composition || item.metal || '').toLowerCase();
          const match = lowerVals.includes(itemMetal);
          return exclude ? !match : match;
        });
      } else if (field === 'type') {
        result = result.filter(item => {
            const match = values.includes(item.type);
            return exclude ? !match : match;
        });
      } else {
        const lowerVals = values.map(v => String(v).toLowerCase());
        result = result.filter(item => {
          const fieldVal = String(item[field] ?? '').toLowerCase();
          const match = lowerVals.includes(fieldVal);
          return exclude ? !match : match;
        });
      }
    }
  });
  return result;
};

// --- Optimized Implementation (Single Pass) ---
const filterOptimized = (inv, filters) => {
  const activeEntries = Object.entries(filters);
  if (activeEntries.length === 0) return inv;

  // 1. Pre-calculate filter predicates ONCE
  const predicates = activeEntries.map(([field, criteria]) => {
    if (!criteria || typeof criteria !== 'object' || !Array.isArray(criteria.values)) return null;

    const { values, exclude } = criteria;
    const isMetal = field === 'metal';
    const isType = field === 'type';
    const isPurchase = field === 'purchaseLocation';
    const isStorage = field === 'storageLocation';

    // Optimization: Use Set for O(1) lookups if values > 1?
    // For small arrays (filtered usually < 5 options), Array.includes is likely faster/same.
    // Let's stick to array includes for now, but pre-process values.

    let processedValues;
    if (isMetal) {
       processedValues = values.map(v => v.toLowerCase());
    } else if (isType) {
       processedValues = values; // case sensitive usually matches in code
    } else {
       processedValues = values.map(v => String(v).toLowerCase());
    }

    return { field, values: processedValues, exclude, isMetal, isType };
  }).filter(Boolean);

  if (predicates.length === 0) return inv;

  // 2. Single pass filter
  return inv.filter(item => {
    for (let i = 0; i < predicates.length; i++) {
      const p = predicates[i];
      let match = false;

      if (p.isMetal) {
        const val = (item.composition || item.metal || '').toLowerCase();
        match = p.values.includes(val);
      } else if (p.isType) {
        match = p.values.includes(item.type);
      } else {
        const val = String(item[p.field] ?? '').toLowerCase();
        match = p.values.includes(val);
      }

      if (p.exclude) {
        if (match) return false;
      } else {
        if (!match) return false;
      }
    }
    return true;
  });
};

// --- Benchmark ---

// Scenario 1: Multiple filters, moderate filtering
const filters1 = {
  metal: { values: ['Silver', 'Gold'], exclude: false },
  type: { values: ['Coin', 'Bar'], exclude: false },
  purchaseLocation: { values: ['Bank'], exclude: true }
};

console.log(`Inventory size: ${ITEMS_COUNT}`);
console.log('--- Running Benchmark ---');

console.time('Original');
for (let i = 0; i < 500; i++) filterOriginal(global.inventory, filters1);
console.timeEnd('Original');

console.time('Optimized');
for (let i = 0; i < 500; i++) filterOptimized(global.inventory, filters1);
console.timeEnd('Optimized');

// Verify correctness
const res1 = filterOriginal(global.inventory, filters1);
const res2 = filterOptimized(global.inventory, filters1);
console.log(`Results match length: ${res1.length === res2.length} (${res1.length})`);

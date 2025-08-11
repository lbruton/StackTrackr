const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// Minimal browser-like environment
global.window = global;
global.window.location = { search: '' };
global.localStorage = {
  setItem: () => {},
  getItem: () => null,
};

// Load required scripts in a shared context
vm.runInThisContext(fs.readFileSync('js/constants.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('js/utils.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('js/inventory.js', 'utf8'));

// Stub global structures expected by updateSummary
const stubTotals = () => ({
  items: { textContent: '' },
  weight: { textContent: '' },
  value: { innerHTML: '' },
  purchased: { innerHTML: '' },
  premium: { innerHTML: '' },
  lossProfit: { innerHTML: '' },
  avgPrice: { innerHTML: '' },
  avgPremium: { innerHTML: '' },
  avgCollectablePrice: { innerHTML: '' },
  avgNonCollectablePrice: { innerHTML: '' },
});

global.elements = {
  totals: {
    silver: stubTotals(),
    gold: stubTotals(),
    platinum: stubTotals(),
    palladium: stubTotals(),
    all: stubTotals(),
  },
};

// Provide spot price data
global.spotPrices = {
  silver: 25,
  gold: 2500,
  platinum: 1000,
  palladium: 1000,
};

// Import inventory from Numista CSV
const csvLines = fs.readFileSync('docs/numista.csv', 'utf8').trim().split(/\r?\n/).slice(1);
global.inventory = csvLines.map(line => {
  const parts = line.split(',');
  return {
    metal: (parts[3] || '').split(' ')[0],
    name: parts[1] || '',
    type: parts[4] || '',
    weight: parseFloat(parts[5]),
    qty: parseFloat(parts[6]),
    price: parseFloat(parts[7]),
    date: parts[8] || '',
    purchaseLocation: parts[9] || '',
    storageLocation: parts[10] || '',
    isCollectable: false,
    spotPriceAtPurchase: 0,
  };
});

// Run summary calculations
updateSummary();

// Verify that average metrics render as dollar values, not blanks
assert.strictEqual(
  elements.totals.silver.avgCollectablePrice.innerHTML,
  '$0.00',
  'avg collectable price should display $0.00'
);
assert.notStrictEqual(
  elements.totals.silver.avgNonCollectablePrice.innerHTML,
  '',
  'avg non-collectable price should not be blank'
);
assert.notStrictEqual(
  elements.totals.silver.avgPrice.innerHTML,
  '',
  'avg price should not be blank'
);

console.log('Totals summary tests passed');


const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// Stub minimal browser environment
global.inventory = [];
global.columnFilters = {};
global.searchQuery = '';
global.formatDisplayDate = d => d;
global.debounce = fn => fn;
global.renderTable = () => {};
global.renderActiveFilters = () => {};
global.currentPage = 1;
global.document = { addEventListener: () => {} };
global.window = global;

// Load search functionality
vm.runInThisContext(fs.readFileSync('js/search.js', 'utf8'));

// Test handling of missing and invalid numeric fields
inventory = [
  { metal: 'Gold', name: 'Valid', type: 'Coin', purchaseLocation: 'Shop', qty: 1, weight: 1, price: 100, date: '2020-01-01', isCollectable: false },
  { metal: 'Silver', name: 'Missing', type: 'Coin', purchaseLocation: 'Shop', date: '2020-07-02', isCollectable: false },
  { metal: 'Silver', name: 'Invalid', type: 'Coin', purchaseLocation: 'Shop', qty: 'abc', weight: NaN, price: undefined, date: '2020-07-03', isCollectable: false }
];

searchQuery = '100';
assert.strictEqual(filterInventory().length, 1, 'search for numeric value should work with missing/invalid numbers');

// Load Numista CSV and verify search
const csvLines = fs.readFileSync('tests/data/numista.csv', 'utf8').trim().split(/\r?\n/).slice(1);
inventory = csvLines.map(line => {
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
  };
});

searchQuery = 'Silver';
assert(filterInventory().length > 0, 'search should find items after importing numista.csv');

console.log('All search tests passed');


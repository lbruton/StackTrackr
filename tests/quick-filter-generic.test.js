const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// Minimal environment stubs
global.inventory = [];
global.searchQuery = '';
global.currentPage = 1;
global.columnFilters = {};
global.renderTable = () => {};
global.renderActiveFilters = () => {};
global.getCompositionFirstWords = str => str.split(' ')[0];
global.window = global;
global.document = { addEventListener: () => {}, getElementById: () => null };

// Load filtering and search modules
vm.runInThisContext(fs.readFileSync('js/filters.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('js/search.js', 'utf8'));

// Sample inventory
inventory = [
  { name: 'Coin A', price: 10, metal: 'Silver', type: 'Coin' },
  { name: 'Coin B', price: 20, metal: 'Gold', type: 'Coin' }
];

// Filter by name
applyColumnFilter('name', 'Coin A');
let result = filterInventory();
assert.strictEqual(result.length, 1, 'filter by name should return one item');
assert.strictEqual(result[0].name, 'Coin A');

// Reset and filter by price
activeFilters = {};
applyColumnFilter('price', 10);
result = filterInventory();
assert.strictEqual(result.length, 1, 'filter by price should return one item');
assert.strictEqual(result[0].price, 10);

console.log('Quick filter generic tests passed');

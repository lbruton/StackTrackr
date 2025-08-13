const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// Stub browser environment
const localStore = {};
global.localStorage = {
  getItem: (k) => (k in localStore ? localStore[k] : null),
  setItem: (k, v) => { localStore[k] = v; },
};
global.document = { getElementById: () => null, addEventListener: () => {} };
global.window = global;

// Load module
vm.runInThisContext(fs.readFileSync('js/autocomplete.js', 'utf8'));

// Test base list loads
const base = JSON.parse(localStore.autocompleteNames);
assert.strictEqual(base.length, 100, 'should load 100 default names');

// Test registerName persistence
registerName('Test Coin');
const stored = JSON.parse(localStore.autocompleteNames);
assert(stored.includes('Test Coin'), 'new name should persist');
assert(getSuggestions('Test').includes('Test Coin'), 'should suggest newly registered name');

// Test fuzzy search integration
window.fuzzySearch = {
  fuzzySearch: () => [{ text: 'Fuzzy Coin', score: 1 }],
};
assert.deepStrictEqual(getSuggestions('Whatever', { max: 1 }), ['Fuzzy Coin'], 'should use fuzzySearch when available');

console.log('Autocomplete tests passed');

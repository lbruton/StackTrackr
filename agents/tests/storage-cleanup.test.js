const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// Stub full-featured localStorage
const store = {};
global.localStorage = {
  _data: store,
  setItem(key, value) { this._data[key] = String(value); },
  getItem(key) { return this._data.hasOwnProperty(key) ? this._data[key] : null; },
  removeItem(key) { delete this._data[key]; },
  key(i) { return Object.keys(this._data)[i]; },
  get length() { return Object.keys(this._data).length; }
};

global.window = global;
global.window.location = { search: '' };

// Load modules
vm.runInThisContext(fs.readFileSync('js/constants.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('js/utils.js', 'utf8'));

// Insert allowed and disallowed keys
localStorage.setItem(LS_KEY, '[]');
localStorage.setItem('randomKey', '123');

cleanupStorage();

assert.strictEqual(localStorage.getItem(LS_KEY), '[]', 'Allowed key should remain');
assert.strictEqual(localStorage.getItem('randomKey'), null, 'Unknown key should be removed');

console.log('storage cleanup tests passed');

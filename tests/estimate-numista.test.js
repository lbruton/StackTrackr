const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// Minimal browser-like environment
global.window = global;
global.window.location = { search: '' };
global.localStorage = {
  _data: {},
  setItem(key, value) { this._data[key] = String(value); },
  getItem(key) { return this._data[key] || null; },
};
global.elements = { importProgress: null, importProgressText: null };
global.compositionOptions = new Set();
global.catalogManager = { syncInventory: inv => inv };
global.alert = () => {};

// Stubs for dependencies used in importNumistaCsv
global.startImportProgress = () => {};
global.updateImportProgress = () => {};
global.endImportProgress = () => {};
global.saveInventory = () => {};
global.renderTable = () => {};
global.updateStorageStats = () => {};
global.handleError = () => {};
global.getNextSerial = () => 1;

// FileReader stub to feed CSV content
global.FileReader = class {
  readAsText(file) {
    if (this.onload) {
      this.onload({ target: { result: file.content } });
    }
  }
};

// Lightweight CSV parser stub mimicking Papa.parse
global.Papa = {
  parse: (csv, options = {}) => {
    const lines = csv.trim().split(/\r?\n/);
    let headers = lines[0].split(',');
    if (typeof options.transformHeader === 'function') {
      headers = headers.map(h => options.transformHeader(h));
    }
    const data = lines.slice(1).filter(Boolean).map(line => {
      const parts = line.split(',');
      const obj = {};
      headers.forEach((h, i) => { obj[h] = parts[i] || ''; });
      return obj;
    });
    return { data };
  }
};

vm.runInThisContext(fs.readFileSync('js/constants.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('js/utils.js', 'utf8'));

// Extract and evaluate only the importNumistaCsv function
const inventorySrc = fs.readFileSync('js/inventory.js', 'utf8');
const start = inventorySrc.indexOf('const importNumistaCsv');
const braceStart = inventorySrc.indexOf('{', start);
let idx = braceStart + 1;
let depth = 1;
while (depth > 0 && idx < inventorySrc.length) {
  const ch = inventorySrc[idx++];
  if (ch === '{') depth++;
  else if (ch === '}') depth--;
}
let fnCode = inventorySrc.slice(start, idx);
fnCode = fnCode.replace(/\s*if \(typeof updateStorageStats[^}]*\}\n/, '\n');
vm.runInThisContext(fnCode + ';');

// CSV row with only an Estimate column for pricing
const csv = 'Numista #,Title,Year,Composition,Type,Weight,Estimate (USD)\n123,Test Coin,2024,Silver 0.999,Coin,31.103,15.5';
const file = { content: csv };

global.inventory = [];
importNumistaCsv(file);

assert.strictEqual(inventory.length, 1, 'item should be imported');
assert.strictEqual(
  inventory[0].purchasePrice,
  convertToUsd(15.5, 'USD'),
  'estimate value should be used as purchase price'
);

console.log('Estimate import test passed');


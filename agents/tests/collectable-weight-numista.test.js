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

// Test 5g silver coin -> non-collectable
const csv5 = 'Numista #,Title,Year,Composition,Type,Weight\n1,Five Gram,2024,Silver 0.999,Coin,5';
const file5 = { content: csv5 };

global.inventory = [];
importNumistaCsv(file5);

assert.strictEqual(inventory[0].isCollectable, false, '5 g Silver coin should be non-collectable');

// Test 2g silver coin -> collectable
const csv2 = 'Numista #,Title,Year,Composition,Type,Weight\n1,Two Gram,2024,Silver 0.999,Coin,2';
const file2 = { content: csv2 };

global.inventory = [];
importNumistaCsv(file2);

assert.strictEqual(inventory[0].isCollectable, true, '2 g Silver coin should be collectable');

console.log('Collectable weight import test passed');


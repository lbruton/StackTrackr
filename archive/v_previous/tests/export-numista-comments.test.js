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

// Stubs for dependencies used in import/export
global.startImportProgress = () => {};
global.updateImportProgress = () => {};
global.endImportProgress = () => {};
global.saveInventory = () => {};
global.renderTable = () => {};
global.updateStorageStats = () => {};
global.handleError = () => {};
global.getNextSerial = () => 1;

let capturedCsv = '';

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
  },
  unparse: (rows) => rows.map(r => r.map(v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  }).join(',')).join('\n')
};

global.FileReader = class {
  readAsText(file) {
    if (this.onload) {
      this.onload({ target: { result: file.content } });
    }
  }
};

global.Blob = class { constructor(parts){ this.parts = parts; } };
global.URL = {
  createObjectURL(blob){ capturedCsv = blob.parts.join(''); return 'blob:url'; },
  revokeObjectURL(){}
};
global.document = {
  body: { appendChild(){}, removeChild(){} },
  createElement(){ return { href:'', download:'', click(){}, remove(){}, style:{} }; }
};

vm.runInThisContext(fs.readFileSync('js/constants.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('js/utils.js', 'utf8'));

const inventorySrc = fs.readFileSync('js/inventory.js', 'utf8');
function extractFn(name){
  const start = inventorySrc.indexOf(`const ${name}`);
  const braceStart = inventorySrc.indexOf('{', start);
  let idx = braceStart + 1;
  let depth = 1;
  while (depth > 0 && idx < inventorySrc.length) {
    const ch = inventorySrc[idx++];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }
  let code = inventorySrc.slice(start, idx);
  code = code.replace(/\s*if \(typeof updateStorageStats[^}]*\}\n/, '\n');
  return code;
}
vm.runInThisContext(extractFn('importNumistaCsv') + ';');
vm.runInThisContext(extractFn('exportNumistaCsv') + ';');

const csv = 'Numista #,Title,Year,Composition,Type,Weight,Note,Private comment,Public comment,Comment\n' +
  '123,Test Coin,2024,Silver 0.999,Coin,31.103,Base note,Private text,Public text,Other text';
const file = { content: csv };

global.inventory = [];
importNumistaCsv(file);

capturedCsv = '';
exportNumistaCsv();

const lines = capturedCsv.trim().split(/\r?\n/);
const headers = lines[0].split(',');
const row = lines[1].split(',');

assert.deepStrictEqual(
  headers.slice(11),
  ['Note','Private comment','Public comment','Comment'],
  'header columns should include note and comment fields'
);
assert.strictEqual(row[11], 'Base note');
assert.strictEqual(row[12], 'Private text');
assert.strictEqual(row[13], 'Public text');
assert.strictEqual(row[14], 'Other text');

console.log('Numista comment export test passed');

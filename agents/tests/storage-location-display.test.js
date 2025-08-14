const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// Minimal DOM stubs for sanitizeHtml and theming
global.document = {
  createElement: () => ({
    textContent: '',
    get innerHTML() {
      return this.textContent
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  }),
  documentElement: { getAttribute: () => 'light' },
  getElementById: () => null
};

global.window = global;

// Load utilities and inventory code
vm.runInThisContext(fs.readFileSync('js/utils.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('js/inventory.js', 'utf8'));

// No storage location should display "Unknown" without color style
const htmlUnknown = filterLink(
  'storageLocation',
  '' || 'Unknown',
  getStorageLocationColor('Unknown')
);
assert(htmlUnknown.includes('>Unknown</span>'), 'Unknown location should display text');
assert(!htmlUnknown.includes('style="color'), 'Unknown location should have no color style');

// Existing storage location should be filterable with color style
const htmlLoc = filterLink(
  'storageLocation',
  'Vault A',
  getStorageLocationColor('Vault A')
);
assert(htmlLoc.includes('>Vault A</span>'), 'Storage location should display text');
assert(htmlLoc.includes('style="color'), 'Storage location should have color style');
console.log('Storage location display tests passed');

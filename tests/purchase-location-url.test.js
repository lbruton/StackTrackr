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

// Sanitize object with URL purchase location
const item = { purchaseLocation: 'example.com/shop/item' };
const cleaned = sanitizeObjectFields(item);
assert.strictEqual(cleaned.purchaseLocation, 'example.com/shop/item', 'URL punctuation should remain');

// Format purchase location for table display
const html = formatPurchaseLocation(cleaned.purchaseLocation);
assert(html.includes('>example.com/shop/item</span>'), 'Link text should remain filterable');
assert(html.includes('<a href="https://example.com/shop/item"'), 'Info link should be appended');
assert(html.includes('(i)</a>'), 'Info icon should be present');

console.log('Purchase location URL tests passed');

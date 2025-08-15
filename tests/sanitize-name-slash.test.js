const assert = require('assert');
const { sanitizeImportedItem } = require('../js/utils.js');

const item = sanitizeImportedItem({
  name: '1/2 oz Round',
  type: 'Round',
  metal: 'Silver',
  qty: 1,
  weight: 1,
  price: 1,
});

assert.strictEqual(item.name, '1/2 oz Round');
console.log('sanitizeImportedItem keeps slash in name');

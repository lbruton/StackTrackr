const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// Stub minimal browser environment for utils
global.window = global;
global.document = {};

vm.runInThisContext(fs.readFileSync('js/utils.js', 'utf8'));

assert.strictEqual(getDisplayComposition('Gold Plated Silver'), 'Gold Plated', 'Should retain primary metal compositions');
assert.strictEqual(getDisplayComposition('Copper Nickel'), 'Alloy', 'Non-precious compositions display as Alloy');
assert.strictEqual(getDisplayComposition(''), 'Alloy', 'Empty composition defaults to Alloy');

console.log('All display composition tests passed');

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// Stub localStorage
const storage = {};
global.localStorage = {
  getItem: (k) => (k in storage ? storage[k] : null),
  setItem: (k, v) => { storage[k] = v; },
};

// Stub environment
global.changeLog = [{ timestamp: Date.now(), itemName: 'Item', field: 'name', oldValue: 'a', newValue: 'b', idx: 0, undone: false }];

global.confirm = () => true;
global.window = global;
global.document = { querySelector: () => ({ innerHTML: '' }) };

vm.runInThisContext(fs.readFileSync('js/changeLog.js', 'utf8'));

clearChangeLog();

assert.strictEqual(changeLog.length, 0, 'Change log should be cleared');
assert.strictEqual(storage.changeLog, '[]', 'LocalStorage should contain empty array');

console.log('Change log clear tests passed');

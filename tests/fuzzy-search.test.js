const assert = require('assert');
const { fuzzySearch } = require('../js/fuzzy-search.js');

const targets = ['American Gold Eagle', 'American Silver Eagle'];
const results = fuzzySearch('Silver Eagle', targets);
const texts = results.map(r => r.text);

assert.ok(!texts.includes('American Gold Eagle'), 'Gold Eagle should not surface for Silver query');
assert.ok(texts.includes('American Silver Eagle'), 'Silver Eagle variant should match');
console.log('Silver Eagle query excludes American Gold Eagle');

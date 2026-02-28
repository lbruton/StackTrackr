const fs = require('fs');

const inventory = [];
for (let i = 0; i < 5000; i++) {
  const item = {
    metal: 'Silver',
    name: 'Test Name ' + i,
    type: 'Coin',
    date: '2023-01-01',
    purchaseLocation: 'Apmex',
    notes: 'Some notes here',
    year: '2023',
    grade: 'MS70',
    uuid: 'uuid' + i
  };
  inventory.push(item);
}

const terms = ['silver coin apmex', 'gold bar home'];

console.time('current_regex_inside_loop');
for (let i = 0; i < 100; i++) {
  const result = inventory.filter(item => {
    return terms.some(q => {
      const words = q.split(/\s+/).filter(w => w.length > 0);
      const fieldMatch = words.every(word => {
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const patterns = [escaped];
        const combined = patterns.join('|');
        const wordRegex = new RegExp(`\\b(?:${combined})`, 'i');

        return (
          wordRegex.test(item.metal) ||
          wordRegex.test(item.name) ||
          wordRegex.test(item.type) ||
          wordRegex.test(item.purchaseLocation)
        );
      });
      return fieldMatch;
    });
  });
}
console.timeEnd('current_regex_inside_loop');

console.time('optimized_regex_outside_loop');
for (let i = 0; i < 100; i++) {
  const parsedTerms = terms.map(q => {
    const words = q.split(/\s+/).filter(w => w.length > 0);
    const wordRegexes = words.map(word => {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const patterns = [escaped];
      const combined = patterns.join('|');
      return new RegExp(`\\b(?:${combined})`, 'i');
    });
    return { q, words, wordRegexes, exactPhrase: q.toLowerCase() };
  });

  const result = inventory.filter(item => {
    return parsedTerms.some(termObj => {
      const fieldMatch = termObj.wordRegexes.every(wordRegex => {
        return (
          wordRegex.test(item.metal) ||
          wordRegex.test(item.name) ||
          wordRegex.test(item.type) ||
          wordRegex.test(item.purchaseLocation)
        );
      });
      return fieldMatch;
    });
  });
}
console.timeEnd('optimized_regex_outside_loop');

// Comprehensive test of the enhanced search logic
const testItems = [
  { name: '2021 American Gold Eagle', metal: 'Gold', type: 'Coin' },
  { name: '2021 American Silver Eagle', metal: 'Silver', type: 'Coin' },
  { name: '1999 Silver Eagle Colorized', metal: 'Silver', type: 'Coin' },
  { name: 'Canadian Gold Maple Leaf', metal: 'Gold', type: 'Coin' },
  { name: 'Canadian Silver Maple Leaf', metal: 'Silver', type: 'Coin' },
  { name: 'British Gold Britannia', metal: 'Gold', type: 'Coin' },
  { name: 'British Silver Britannia', metal: 'Silver', type: 'Coin' },
  { name: 'South African Gold Krugerrand', metal: 'Gold', type: 'Coin' },
  { name: 'Chinese Gold Panda', metal: 'Gold', type: 'Coin' },
  { name: 'Chinese Silver Panda', metal: 'Silver', type: 'Coin' },
  { name: 'Australian Gold Kangaroo', metal: 'Gold', type: 'Coin' },
  { name: 'American Gold Buffalo', metal: 'Gold', type: 'Coin' },
  { name: '1/4 oz American Gold Eagle', metal: 'Gold', type: 'Coin' },
  { name: '1/2 oz American Gold Eagle', metal: 'Gold', type: 'Coin' }
];

function testSearch(searchTerm, item) {
  const words = searchTerm.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const itemText = [item.name, item.metal, item.type].join(' ').toLowerCase();
  
  if (words.length >= 2) {
    const exactPhrase = searchTerm.toLowerCase();
    
    // Check for exact phrase match first
    if (itemText.includes(exactPhrase)) {
      return true;
    }
    
    // Check that all words are present as word boundaries
    const allWordsPresent = words.every(word => {
      const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return wordRegex.test(itemText);
    });
    
    if (!allWordsPresent) {
      return false;
    }
    
    // Enhanced coin series logic
    if (words.length === 2) {
      const searchMetal = words[0];
      const coinType = words[1];
      
      // Handle all major coin series
      if (['eagle', 'maple', 'britannia', 'krugerrand', 'buffalo', 'panda', 'kangaroo'].includes(coinType)) {
        if (['silver', 'gold', 'platinum', 'palladium'].includes(searchMetal)) {
          // Metal-specific searches must match exact phrase
          return itemText.includes(exactPhrase) || 
                 (coinType === 'maple' && itemText.includes(`${searchMetal} maple leaf`));
        } else if (['american', 'canadian', 'british', 'chinese', 'australian'].includes(searchMetal) || searchMetal === 'south') {
          // Country-specific searches should not match if metal specified
          const metalWords = ['gold', 'silver', 'platinum', 'palladium'];
          const hasMetalBetween = metalWords.some(metal => 
            itemText.includes(`${searchMetal} ${metal} ${coinType}`) || 
            itemText.includes(`${searchMetal} ${metal}`) && itemText.includes(coinType)
          );
          return !hasMetalBetween;
        }
      }
    }
    
    // Handle fractional weights
    if (words.length >= 2) {
      const hasFraction = words.some(word => word.includes('/'));
      const hasOz = words.some(word => word === 'oz' || word === 'ounce');
      
      if (hasFraction && hasOz) {
        return itemText.includes(exactPhrase);
      }
    }
    
    // Prevent overly broad searches
    const broadTerms = ['american', 'canadian', 'australian', 'british', 'chinese', 'south', 'mexican'];
    if (words.length === 1 && broadTerms.includes(words[0])) {
      return false;
    }
    
    return true;
  }
  
  // For single words, prevent broad geographic terms
  if (words.length === 1) {
    const broadTerms = ['american', 'canadian', 'australian', 'british', 'chinese', 'south', 'mexican'];
    if (broadTerms.includes(words[0])) {
      return false;
    }
  }
  
  return true;
}

console.log('=== Testing Enhanced Search Logic ===\n');

const testCases = [
  { search: 'Silver Eagle', description: 'Should only match Silver Eagles' },
  { search: 'Gold Eagle', description: 'Should only match Gold Eagles' },
  { search: 'American Eagle', description: 'Should not match any (all have metals specified)' },
  { search: 'Gold Maple', description: 'Should only match Gold Maple' },
  { search: 'Silver Maple', description: 'Should only match Silver Maple' },
  { search: 'Canadian Maple', description: 'Should not match any (all have metals specified)' },
  { search: 'British Britannia', description: 'Should not match any (all have metals specified)' },
  { search: 'Gold Britannia', description: 'Should only match Gold Britannia' },
  { search: '1/4 oz', description: 'Should only match 1/4 oz items' },
  { search: 'American', description: 'Should match nothing (too broad)' },
  { search: 'Chinese Panda', description: 'Should not match any (all have metals specified)' },
  { search: 'Gold Panda', description: 'Should only match Gold Panda' }
];

testCases.forEach(testCase => {
  console.log(`--- ${testCase.search} (${testCase.description}) ---`);
  let matchCount = 0;
  testItems.forEach((item, i) => {
    const matches = testSearch(testCase.search, item);
    if (matches) {
      console.log(`✓ ${item.name}`);
      matchCount++;
    }
  });
  if (matchCount === 0) {
    console.log('  (no matches)');
  }
  console.log(`Total matches: ${matchCount}\n`);
});

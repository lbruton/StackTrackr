// Inventory Search Conflict Analysis Tool
// This script analyzes inventory data to identify potential search conflicts

function analyzeSearchConflicts(inventory) {
  const conflicts = [];
  const searchTerms = new Set();
  const itemNames = inventory.map(item => item.name);
  
  // Extract common search patterns from item names
  itemNames.forEach(name => {
    const words = name.toLowerCase().split(/\s+/);
    
    // Add all 2-word combinations
    for (let i = 0; i < words.length - 1; i++) {
      searchTerms.add(words[i] + ' ' + words[i + 1]);
    }
    
    // Add all 3-word combinations for common patterns
    for (let i = 0; i < words.length - 2; i++) {
      searchTerms.add(words[i] + ' ' + words[i + 1] + ' ' + words[i + 2]);
    }
  });
  
  // Test each search term against all items to find conflicts
  searchTerms.forEach(searchTerm => {
    const matches = [];
    const shouldNotMatch = [];
    
    inventory.forEach(item => {
      const itemText = [item.name, item.metal, item.type].join(' ').toLowerCase();
      const isMatch = testSearchLogic(searchTerm, itemText);
      
      if (isMatch) {
        matches.push(item.name);
      }
      
      // Detect potential conflicts
      if (searchTerm.includes('eagle') && !item.name.toLowerCase().includes(searchTerm)) {
        if (isMatch && item.name.toLowerCase().includes('eagle')) {
          shouldNotMatch.push(item.name);
        }
      }
    });
    
    if (shouldNotMatch.length > 0) {
      conflicts.push({
        searchTerm,
        incorrectMatches: shouldNotMatch,
        correctMatches: matches.filter(name => !shouldNotMatch.includes(name))
      });
    }
  });
  
  return conflicts;
}

function testSearchLogic(searchTerm, itemText) {
  const words = searchTerm.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length >= 2) {
    const exactPhrase = searchTerm;
    
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
    
    // Eagle-specific logic
    if (words.length === 2 && words[1] === 'eagle') {
      const searchMetal = words[0];
      
      if (searchMetal === 'american') {
        const metalWords = ['gold', 'silver', 'platinum', 'palladium'];
        const hasMetalBetween = metalWords.some(metal => 
          itemText.includes(`american ${metal} eagle`) && !exactPhrase.includes(metal)
        );
        return !hasMetalBetween;
      } else if (['silver', 'gold', 'platinum', 'palladium'].includes(searchMetal)) {
        return itemText.includes(exactPhrase);
      }
    }
    
    return true;
  }
  
  return true;
}

// Example usage (you would load your actual inventory here):
// const inventory = JSON.parse(fs.readFileSync('metal_inventory_20250813.json', 'utf8'));
// const conflicts = analyzeSearchConflicts(inventory);
// console.log(JSON.stringify(conflicts, null, 2));

module.exports = { analyzeSearchConflicts, testSearchLogic };

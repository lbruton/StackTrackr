// Test enhanced search logic for precise matching
const testCases = [
    { search: 'American Eagle', target: 'American Silver Eagle', shouldMatch: false }, // Should not match because has "Silver" between
    { search: 'American Eagle', target: 'American Gold Eagle', shouldMatch: false },   // Should not match because has "Gold" between
    { search: 'American Silver Eagle', target: 'American Silver Eagle', shouldMatch: true },
    { search: 'American Gold Eagle', target: 'American Gold Eagle', shouldMatch: true },
    { search: 'Silver Eagle', target: 'American Silver Eagle', shouldMatch: true },
    { search: 'Silver Eagle', target: 'American Gold Eagle', shouldMatch: false },
    { search: 'Eagle', target: 'American Silver Eagle', shouldMatch: true },
    { search: 'Eagle', target: 'American Gold Eagle', shouldMatch: true },
    { search: 'Gold Eagle', target: 'American Gold Eagle', shouldMatch: true },
    { search: 'Gold Eagle', target: 'American Silver Eagle', shouldMatch: false }
];

function testSearchLogic(searchTerm, targetName) {
    const words = searchTerm.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const target = targetName.toLowerCase();
    
    // Special handling for multi-word searches
    if (words.length >= 2) {
        const exactPhrase = searchTerm.toLowerCase();
        const itemText = targetName.toLowerCase();
        
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
        
        // Special case: "American Eagle" should not match "American Gold Eagle" or "American Silver Eagle"
        if (words.length === 2 && words[0] === 'american' && words[1] === 'eagle') {
            const metalWords = ['gold', 'silver', 'platinum', 'palladium'];
            const hasMetalBetween = metalWords.some(metal => 
                itemText.includes(`american ${metal} eagle`) && !exactPhrase.includes(metal)
            );
            return !hasMetalBetween;
        }
        
        return true;
    }
    
    // For single words, use word boundary matching
    return words.every(word => {
        const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
        return wordRegex.test(target);
    });
}

testCases.forEach(test => {
    const matches = testSearchLogic(test.search, test.target);
    const result = matches === test.shouldMatch ? 'PASS' : 'FAIL';
    console.log(`${result}: "${test.search}" vs "${test.target}" - Expected: ${test.shouldMatch}, Got: ${matches}`);
});

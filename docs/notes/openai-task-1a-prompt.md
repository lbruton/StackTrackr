# OpenAI Task Delegation: Fuzzy Search Engine (Task 1A)

**COPY THIS ENTIRE PROMPT TO OPENAI TO DELEGATE TASK 1A**

---

# Task 1A: Core Fuzzy Search Engine Implementation

You are implementing a **standalone fuzzy search engine module** for StackTrackr, a precious metals inventory tracking application. This is Task 1A of a larger fuzzy autocomplete feature.

## 🎯 Your Mission
Create `js/fuzzy-search.js` - a complete fuzzy search engine that can match partial, misspelled, and word-order-independent queries against inventory data.

**Example Goal**: User types "Ame" → should match "American Silver Eagle", "2021 American Eagle", "Eagle American Silver 1oz", etc.

## 📋 Required Deliverables

### 1. **Levenshtein Distance Algorithm**
- Function to calculate edit distance between strings
- Optimized for short-to-medium strings (typical inventory names)
- Handle case-insensitive comparison

### 2. **N-Gram Matching**  
- Break strings into character n-grams (2-grams, 3-grams)
- Enable partial word matching ("Ame" matches "American")
- Score similarity based on shared n-grams

### 3. **Word-Order Independent Comparison**
- "American Silver Eagle" matches "Eagle Silver American"
- "2021 American Silver Eagle" matches "American Eagle 2021 Silver"
- Tokenize and match individual words

### 4. **Similarity Scoring System**
- Combine multiple algorithms into unified score (0-1 range)
- Weight different matching types appropriately
- Threshold system for filtering weak matches

### 5. **Performance Optimizations**
- Handle 1000+ inventory items efficiently
- Debouncing-friendly (fast execution < 50ms)
- Memory-efficient for browser environment

### 6. **Error Handling & Fallbacks**
- Graceful handling of null/undefined inputs
- Empty string handling
- Special character sanitization

## 🏗️ StackTrackr Code Style Guidelines

### **Function Documentation (JSDoc)**
```javascript
/**
 * Calculates fuzzy similarity between query and target strings
 * 
 * @param {string} query - User search input
 * @param {string} target - Inventory item name to match against
 * @param {Object} [options={}] - Configuration options
 * @param {number} [options.threshold=0.3] - Minimum similarity score
 * @param {boolean} [options.caseSensitive=false] - Case sensitive matching
 * @returns {number} Similarity score between 0 and 1
 * 
 * @example
 * fuzzyMatch("Ame", "American Silver Eagle") // returns ~0.7
 * fuzzyMatch("Eagle Amer", "American Silver Eagle") // returns ~0.8
 */
```

### **Consistent Naming Patterns**
- Use camelCase for functions and variables
- Descriptive names: `calculateLevenshteinDistance` not `calcLevDist`
- Constants in UPPER_CASE: `DEFAULT_THRESHOLD = 0.3`

### **Error Handling Pattern**
```javascript
const fuzzyMatch = (query, target, options = {}) => {
  try {
    // Validate inputs
    if (typeof query !== 'string' || typeof target !== 'string') {
      console.warn('fuzzyMatch: Invalid input types');
      return 0;
    }
    
    // Implementation here
    
  } catch (error) {
    console.error('fuzzyMatch error:', error);
    return 0; // Safe fallback
  }
};
```

## 🔧 Required API Interface

Your `js/fuzzy-search.js` must export these functions:

```javascript
// Core matching function
const fuzzyMatch = (query, target, options = {}) => { /* implementation */ };

// Batch search function
const fuzzySearch = (query, targets, options = {}) => { /* implementation */ };

// Utility functions
const calculateLevenshteinDistance = (str1, str2) => { /* implementation */ };
const generateNGrams = (str, n = 2) => { /* implementation */ };
const tokenizeWords = (str) => { /* implementation */ };
const normalizeString = (str) => { /* implementation */ };

// Performance utilities
const benchmarkSearch = (query, targets, iterations = 100) => { /* implementation */ };

// Export all functions
if (typeof window !== 'undefined') {
  // Browser environment
  window.fuzzySearch = {
    fuzzyMatch,
    fuzzySearch,
    calculateLevenshteinDistance,
    generateNGrams,
    tokenizeWords,
    normalizeString,
    benchmarkSearch
  };
}

// For potential future Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fuzzyMatch,
    fuzzySearch,
    calculateLevenshteinDistance,
    generateNGrams,
    tokenizeWords,
    normalizeString,
    benchmarkSearch
  };
}
```

## 📊 Expected Usage Examples

```javascript
// Basic fuzzy matching
fuzzyMatch("Ame", "American Silver Eagle"); // ~0.7
fuzzyMatch("Eagle Silver", "American Silver Eagle"); // ~0.8
fuzzyMatch("ASE", "American Silver Eagle"); // ~0.4 (abbreviation)

// Batch search through inventory
const inventory = [
  "American Silver Eagle",
  "Canadian Maple Leaf",
  "Austrian Philharmonic",
  "American Gold Eagle"
];

fuzzySearch("Ame Eagle", inventory); 
// Returns: [
//   { text: "American Silver Eagle", score: 0.85 },
//   { text: "American Gold Eagle", score: 0.75 }
// ]

// With options
fuzzySearch("maple", inventory, { 
  threshold: 0.5, 
  maxResults: 3,
  caseSensitive: false 
});
```

## 🧪 Testing Requirements

Include **console-based unit tests** at the bottom of your file:

```javascript
// Unit Tests (run with console.log)
const runTests = () => {
  console.log('🧪 Running Fuzzy Search Tests...');
  
  // Test 1: Basic matching
  const test1 = fuzzyMatch("Ame", "American Silver Eagle");
  console.log(`✓ Basic match: ${test1 > 0.5 ? 'PASS' : 'FAIL'} (${test1})`);
  
  // Test 2: Word order independence
  const test2 = fuzzyMatch("Eagle Silver", "American Silver Eagle");
  console.log(`✓ Word order: ${test2 > 0.7 ? 'PASS' : 'FAIL'} (${test2})`);
  
  // Test 3: Partial matching
  const test3 = fuzzyMatch("Amer", "American Silver Eagle");
  console.log(`✓ Partial: ${test3 > 0.4 ? 'PASS' : 'FAIL'} (${test3})`);
  
  // Test 4: Batch search
  const inventory = ["American Silver Eagle", "Canadian Maple Leaf"];
  const results = fuzzySearch("American", inventory);
  console.log(`✓ Batch search: ${results.length > 0 ? 'PASS' : 'FAIL'}`);
  
  // Test 5: Performance benchmark
  const perfResult = benchmarkSearch("test", inventory, 1000);
  console.log(`✓ Performance: ${perfResult.avgTime < 1 ? 'PASS' : 'FAIL'} (${perfResult.avgTime}ms avg)`);
  
  console.log('✅ Fuzzy Search Tests Complete');
};

// Auto-run tests when loaded (comment out for production)
if (typeof window !== 'undefined' && window.location.search.includes('test')) {
  runTests();
}
```

## 🎯 Success Criteria

Your implementation should:
- ✅ Handle 1000+ items in under 50ms
- ✅ Score "Ame" → "American Silver Eagle" at ~0.6-0.8
- ✅ Match regardless of word order
- ✅ Find partial matches for abbreviations
- ✅ Gracefully handle edge cases (empty strings, special chars)
- ✅ Pass all unit tests
- ✅ Follow StackTrackr code style conventions

## 🚀 Algorithm Suggestions

### **Levenshtein Distance (Edit Distance)**
```javascript
// Optimized dynamic programming approach
// Handle insertions, deletions, substitutions
// Consider case-insensitive comparison
```

### **N-Gram Similarity (Jaccard Index)**
```javascript
// Generate 2-grams and 3-grams
// Calculate intersection/union ratio
// Handle string preprocessing (normalize, trim)
```

### **Word-Based Matching**
```javascript
// Tokenize into words
// Remove common stop words
// Match individual words using fuzzy logic
// Aggregate word-level scores
```

### **Combined Scoring**
```javascript
// Weighted combination:
// 40% Levenshtein distance
// 35% N-gram similarity  
// 25% Word-based matching
// Tune weights based on testing
```

## 📁 File Structure

Create this as a **single file**: `js/fuzzy-search.js` with:
1. **Header comment** explaining the module
2. **Algorithm implementations** 
3. **Main API functions**
4. **Utility functions**
5. **Performance benchmarking**
6. **Unit tests**
7. **Export statements**

## ⚠️ Important Notes

- **No dependencies** on other StackTrackr files
- **Browser-compatible** JavaScript (ES6+ is fine)
- **Memory efficient** - avoid storing large intermediate data
- **Thread-safe** - stateless functions only
- **Extensible** - easy to add new matching algorithms later

## 🎁 Bonus Points

- Implement **abbreviation matching** (ASE → American Silver Eagle)
- Add **phonetic matching** for common misspellings
- Include **performance monitoring** utilities
- Support **custom weighting** for different fields
- Create **comprehensive test coverage**

---

## 📋 Task 1A Completion Checklist

Mark each item as you complete it:

- [ ] Create `js/fuzzy-search.js` file
- [ ] Implement Levenshtein distance algorithm
- [ ] Implement n-gram matching for partial words
- [ ] Add word-order independent comparison
- [ ] Basic similarity scoring function
- [ ] Unit test core algorithms (console tests)
- [ ] Performance benchmarking setup
- [ ] Error handling and fallbacks

**Estimated Time**: 2 hours  
**Complexity**: Medium  
**Dependencies**: None  

---

**When complete, you'll have built the core engine that powers intelligent autocomplete for thousands of StackTrackr users worldwide! 🚀**

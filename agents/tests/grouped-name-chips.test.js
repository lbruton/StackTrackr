/**
 * Test file for Grouped Name Chips feature
 * Tests the normalizeItemName function and grouped chip functionality
 */

// Test data similar to what's in sample.csv
const testData = [
  '2024 American Silver Eagle',
  '2023 American Silver Eagle',
  '2021 American Silver Eagle',
  '2024 Canada Maple Leaf',
  '2023 Australia Kookaburra',
  '2022 UK Britannia',
  '2023 Silver Buffalo Round',
  '2024 Germania Round',
  '2022 1oz Tuvalu Black Flag The Rising Sun',
  '2024 American Gold Eagle 1 oz',
  '2024 Canada Maple Leaf 1/10 oz',
  '2022 South Africa Krugerrand 1/4 oz'
];

// Expected groupings
const expectedGroupings = {
  '2024 American Silver Eagle': 'American Silver Eagle',
  '2023 American Silver Eagle': 'American Silver Eagle', 
  '2021 American Silver Eagle': 'American Silver Eagle',
  '2024 Canada Maple Leaf': 'Canadian Maple Leaf',
  '2023 Australia Kookaburra': 'Australian Silver Kookaburra',
  '2022 UK Britannia': 'British Silver Britannia',
  '2023 Silver Buffalo Round': 'Buffalo Round',
  '2024 Germania Round': '2024 Germania Round', // Should fallback to original with year removed
  '2022 1oz Tuvalu Black Flag The Rising Sun': '1oz Tuvalu Black Flag The Rising Sun',
  '2024 American Gold Eagle 1 oz': 'American Gold Eagle',
  '2024 Canada Maple Leaf 1/10 oz': '1/10 oz Canadian Maple Leaf',
  '2022 South Africa Krugerrand 1/4 oz': '1/4 oz South African Gold Krugerrand'
};

/**
 * Test the normalizeItemName function
 */
function testNormalizeItemName() {
  console.log('Testing normalizeItemName function...');
  
  if (!window.autocomplete || !window.autocomplete.normalizeItemName) {
    console.error('normalizeItemName function not available');
    return false;
  }
  
  let passed = 0;
  let failed = 0;
  
  testData.forEach(item => {
    const result = window.autocomplete.normalizeItemName(item);
    const expected = expectedGroupings[item];
    
    console.log(`Input: "${item}"`);
    console.log(`Result: "${result}"`);
    console.log(`Expected: "${expected}"`);
    
    if (result === expected) {
      console.log('✅ PASS');
      passed++;
    } else {
      console.log('❌ FAIL');
      failed++;
    }
    console.log('---');
  });
  
  console.log(`\nTest Results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

/**
 * Test feature flag functionality
 */
function testFeatureFlag() {
  console.log('Testing GROUPED_NAME_CHIPS feature flag...');
  
  if (!window.featureFlags) {
    console.error('Feature flags system not available');
    return false;
  }
  
  const isEnabled = window.featureFlags.isEnabled('GROUPED_NAME_CHIPS');
  console.log(`GROUPED_NAME_CHIPS enabled: ${isEnabled}`);
  
  return isEnabled;
}

/**
 * Test grouped chip generation
 */
function testGroupedChips() {
  console.log('Testing grouped chip generation...');
  
  // Check if we have inventory data
  if (!window.inventory || window.inventory.length === 0) {
    console.error('No inventory data available for testing');
    return false;
  }
  
  // Check for American Silver Eagle variants in sample data
  const eagleVariants = window.inventory.filter(item => 
    item.name && item.name.toLowerCase().includes('american silver eagle')
  );
  
  console.log(`Found ${eagleVariants.length} American Silver Eagle variants:`);
  eagleVariants.forEach(item => console.log(`- ${item.name}`));
  
  return eagleVariants.length > 1; // Should have multiple variants to group
}

/**
 * Run all tests
 */
function runGroupedNameChipsTests() {
  console.log('=== Grouped Name Chips Feature Tests ===\n');
  
  const tests = [
    { name: 'Feature Flag', fn: testFeatureFlag },
    { name: 'Normalize Item Name', fn: testNormalizeItemName },
    { name: 'Grouped Chips', fn: testGroupedChips }
  ];
  
  let allPassed = true;
  
  tests.forEach(test => {
    console.log(`\n--- ${test.name} Test ---`);
    const result = test.fn();
    if (!result) {
      allPassed = false;
    }
  });
  
  console.log(`\n=== Overall Result: ${allPassed ? 'PASS' : 'FAIL'} ===`);
  return allPassed;
}

// Export for global access
window.runGroupedNameChipsTests = runGroupedNameChipsTests;
window.testNormalizeItemName = testNormalizeItemName;
window.testFeatureFlag = testFeatureFlag;
window.testGroupedChips = testGroupedChips;

console.log('Grouped Name Chips tests loaded. Run runGroupedNameChipsTests() to execute all tests.');

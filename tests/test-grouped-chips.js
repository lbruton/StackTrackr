// Simple browser console test for Grouped Name Chips feature

// Test 1: Check if feature flag is working
console.log('=== Testing Grouped Name Chips Feature ===');

console.log('1. Feature Flag Test:');
if (window.featureFlags) {
  console.log('✓ Feature flags system available');
  console.log('GROUPED_NAME_CHIPS enabled:', window.featureFlags.isEnabled('GROUPED_NAME_CHIPS'));
} else {
  console.log('❌ Feature flags system not available');
}

// Test 2: Check if autocomplete normalize function is available
console.log('\n2. Normalize Function Test:');
if (window.autocomplete && window.autocomplete.normalizeItemName) {
  console.log('✓ normalizeItemName function available');
  
  // Test some sample names
  const testCases = [
    '2024 American Silver Eagle',
    '2023 American Silver Eagle', 
    '2021 American Silver Eagle',
    '2024 Canada Maple Leaf',
    '2023 Australia Kookaburra',
    '2024 American Gold Eagle 1 oz',
    '2024 Canada Maple Leaf 1/10 oz'
  ];
  
  console.log('Test normalization results:');
  testCases.forEach(name => {
    const normalized = window.autocomplete.normalizeItemName(name);
    console.log(`"${name}" → "${normalized}"`);
  });
} else {
  console.log('❌ normalizeItemName function not available');
}

// Test 3: Check if sample data has American Silver Eagles
console.log('\n3. Sample Data Test:');
if (window.inventory && window.inventory.length > 0) {
  console.log('✓ Inventory data available:', window.inventory.length, 'items');
  
  const eagles = window.inventory.filter(item => 
    item.name && item.name.toLowerCase().includes('american silver eagle')
  );
  
  console.log('American Silver Eagle variants found:');
  eagles.forEach(item => console.log(`- ${item.name}`));
  
  if (eagles.length > 1) {
    console.log('✓ Multiple variants available for grouping test');
  } else {
    console.log('⚠️ Only', eagles.length, 'variant found');
  }
} else {
  console.log('❌ No inventory data available');
}

// Test 4: Check if UI toggle is present
console.log('\n4. UI Toggle Test:');
const toggleEl = document.getElementById('groupNameChips');
if (toggleEl) {
  console.log('✓ Group name chips toggle found');
  console.log('Toggle checked:', toggleEl.checked);
} else {
  console.log('❌ Group name chips toggle not found');
}

// Test 5: Trigger a refresh of chips to see if grouping works
console.log('\n5. Manual Chip Refresh Test:');
if (window.updateTypeSummary) {
  console.log('✓ updateTypeSummary function available');
  console.log('Triggering chip refresh...');
  try {
    window.updateTypeSummary();
    console.log('✓ Chip refresh completed successfully');
  } catch (e) {
    console.log('❌ Error during chip refresh:', e);
  }
} else {
  console.log('❌ updateTypeSummary function not available');
}

console.log('\n=== Test Complete ===');
console.log('To test the feature:');
console.log('1. Load sample data (if not already loaded)');
console.log('2. Apply some filters to trigger chip display');
console.log('3. Look for grouped "American Silver Eagle" chips');
console.log('4. Toggle the "Group Names" checkbox to see the difference');

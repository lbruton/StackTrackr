// CSV Import Validation Test Script
// This script tests our refactored import system with real data

console.log('🧪 Starting CSV Import Validation Test...');

// Test data from the actual CSV file
const testRows = [
  {
    "Metal": "Silver",
    "Name": "2021 American Silver Eagle (Type 1)",
    "Qty": "1",
    "Type": "Coin", 
    "Weight(oz)": "1.0000",
    "Purchase Price": "$46.28",
    "Spot Price ($/oz)": "$38.18",
    "Premium ($/oz)": "$8.10",
    "Total Premium": "$8.10",
    "Purchase Location": "herobullion.com",
    "Storage Location": "Unknown",
    "Notes": "",
    "Date": "2025-07-29",
    "Collectable": "No"
  },
  {
    "Metal": "Silver",
    "Name": "1984 3-Coin Olympic Set BU (P,D,S Dollars, w/Box & COA)",
    "Qty": "1",
    "Type": "Coin",
    "Weight(oz)": "2.3202", 
    "Purchase Price": "$93.74",
    "Spot Price ($/oz)": "$37.80",
    "Premium ($/oz)": "N/A",
    "Total Premium": "N/A", 
    "Purchase Location": "apmex.com",
    "Storage Location": "Unknown",
    "Notes": "",
    "Date": "2025-03-09",
    "Collectable": "Yes"
  },
  {
    "Metal": "Gold",
    "Name": "2023 1/10 oz American Gold Eagle",
    "Qty": "1", 
    "Type": "Coin",
    "Weight(oz)": "0.1000",
    "Purchase Price": "$275.99",
    "Spot Price ($/oz)": "$2650.00", 
    "Premium ($/oz)": "$10.90",
    "Total Premium": "$1.09",
    "Purchase Location": "apmex.com",
    "Storage Location": "Unknown", 
    "Notes": "",
    "Date": "2025-03-11",
    "Collectable": "No"
  }
];

// Test our utility functions first
console.log('\n1️⃣ Testing Utility Functions...');

// Test gramsToOzt conversion
if (typeof gramsToOzt !== 'function') {
  console.error('❌ gramsToOzt function not found!');
} else {
  const testGrams = 31.1034768;
  const result = gramsToOzt(testGrams);
  console.log(`✅ gramsToOzt(${testGrams}) = ${result} (expected: ~1.0)`);
}

// Test formatWeight function  
if (typeof formatWeight !== 'function') {
  console.error('❌ formatWeight function not found!');
} else {
  const testWeights = [0.0058, 0.125, 1.25, 2.3202];
  testWeights.forEach(weight => {
    const formatted = formatWeight(weight);
    console.log(`✅ formatWeight(${weight}) = "${formatted}"`);
  });
}

// Test sanitizeImportedItem function
if (typeof sanitizeImportedItem !== 'function') {
  console.error('❌ sanitizeImportedItem function not found!');
} else {
  const testItem = {
    metal: 'Silver',
    name: '  Test Item  ', 
    qty: '1.5',
    weight: 'invalid',
    price: '$25.00',
    isCollectable: 'false'
  };
  const sanitized = sanitizeImportedItem(testItem);
  console.log('✅ sanitizeImportedItem test:', sanitized);
}

console.log('\n2️⃣ Testing DataProcessor...');

// Test DataProcessor if available
if (typeof dataProcessor !== 'undefined') {
  testRows.forEach((row, index) => {
    console.log(`\nProcessing row ${index + 1}: ${row.Name}`);
    
    try {
      const result = dataProcessor.process(row);
      
      if (result.isValid) {
        console.log(`✅ Row ${index + 1} processed successfully`);
        console.log(`   - Metal: ${result.item.metal}`);
        console.log(`   - Weight: ${result.item.weight} oz`);
        console.log(`   - Price: $${result.item.price}`);
        console.log(`   - Collectable: ${result.item.isCollectable}`);
      } else {
        console.log(`❌ Row ${index + 1} validation failed:`);
        result.errors.forEach(error => console.log(`     - ${error}`));
      }
    } catch (error) {
      console.error(`💥 Row ${index + 1} processing crashed:`, error.message);
    }
  });
} else {
  console.error('❌ DataProcessor not found!');
}

console.log('\n3️⃣ Testing validateInventoryItem...');

// Test validation function
if (typeof validateInventoryItem !== 'function') {
  console.error('❌ validateInventoryItem function not found!');
} else {
  const testItem = {
    name: 'Test Coin',
    qty: 1,
    weight: 1.0,
    price: 50.0
  };
  
  const validation = validateInventoryItem(testItem);
  console.log(`✅ Validation result:`, validation);
}

console.log('\n4️⃣ Testing CSV Format Detection...');

// Test format detection with real headers
const stackrTrackrHeaders = [
  "Metal", "Name", "Qty", "Type", "Weight(oz)", "Purchase Price",
  "Spot Price ($/oz)", "Premium ($/oz)", "Total Premium",
  "Purchase Location", "Storage Location", "Notes", "Date", "Collectable"
];

const numistaHeaders = [
  "Country", "Issuer", "N# number (with link)", "Title", "Type", "Composition",
  "Weight", "Buying price (USD)", "Estimate (USD)", "Private comment",
  "Public comment", "Storage location", "Acquisition place", "Acquisition date"
];

if (typeof detectCsvFormat !== 'undefined') {
  console.log('\n📊 StackrTrackr CSV Detection:');
  const stackrDetection = detectCsvFormat(stackrTrackrHeaders);
  console.log(`   Format: ${stackrDetection.format}`);
  console.log(`   Confidence: ${(stackrDetection.confidence * 100).toFixed(1)}%`);
  console.log(`   Indicators: ${stackrDetection.indicators}`);

  console.log('\n📊 Numista CSV Detection:');
  const numistaDetection = detectCsvFormat(numistaHeaders);
  console.log(`   Format: ${numistaDetection.format}`);
  console.log(`   Confidence: ${(numistaDetection.confidence * 100).toFixed(1)}%`);
  console.log(`   Indicators: ${numistaDetection.indicators}`);
} else {
  console.error('❌ detectCsvFormat function not found!');
}

console.log('\n🎯 Import Validation Test Complete!');
console.log('\n🚀 Ready to test with real files:');
console.log('\n📁 Test File 1: StackrTrackr Format');
console.log('   File: /Users/lbruton/Documents/Backups/metal_inventory_20250807.csv');
console.log('   Expected: Auto-detect StackrTrackr format');
console.log('   Items: 148 rows');

console.log('\n📁 Test File 2: Numista Format');
console.log('   File: /Users/lbruton/Desktop/orphenshadow_export.csv');
console.log('   Expected: Auto-detect Numista format');
console.log('   Items: 1,870 rows');

console.log('\n🔧 How to test:');
console.log('1. Open StackrTrackr in browser');
console.log('2. Use single "Import CSV" button'); 
console.log('3. Try both files - should auto-detect format');
console.log('4. Check console for format detection messages');
console.log('5. Verify all items import correctly with no errors');
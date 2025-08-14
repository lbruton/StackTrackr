// Test the NEW chip visibility logic
const fs = require('fs');
const vm = require('vm');

// Mock environment
global.inventory = [
    { name: '2021 American Silver Eagle Type 1', metal: 'Silver', type: 'Coin', composition: 'Silver', purchaseLocation: 'APMEX', storageLocation: 'Safe 1', isCollectable: false, date: '2021-01-01' },
    { name: '2021 American Gold Eagle', metal: 'Gold', type: 'Coin', composition: 'Gold', purchaseLocation: 'JM Bullion', storageLocation: 'Safe 2', isCollectable: false, date: '2021-01-01' },
    { name: 'Silver Buffalo Round', metal: 'Silver', type: 'Round', composition: 'Silver', purchaseLocation: 'Local Shop', storageLocation: 'Safe 1', isCollectable: false, date: '2021-01-01' },
    { name: 'Gold Bar 1oz', metal: 'Gold', type: 'Bar', composition: 'Gold', purchaseLocation: 'Online', storageLocation: 'Safe 2', isCollectable: false, date: '2021-01-01' }
];

global.searchQuery = '';
global.activeFilters = {};
global.columnFilters = {};
global.currentPage = 1;
global.renderTable = () => {};
global.formatDisplayDate = (date) => date;
global.getCompositionFirstWords = (str) => str.split(' ')[0];
global.window = global;
global.document = { 
    addEventListener: () => {}, 
    getElementById: () => ({ 
        innerHTML: '', 
        style: { display: '' },
        appendChild: () => {}
    })
};

// Mock color functions
global.getTypeColor = () => '#007acc';
global.getPurchaseLocationColor = () => '#007acc';  
global.getStorageLocationColor = () => '#007acc';
global.METAL_COLORS = { Silver: '#c0c0c0', Gold: '#ffd700' };

// Load the filters module
try {
    vm.runInThisContext(fs.readFileSync('../js/filters.js', 'utf8'));
} catch (error) {
    console.error('Error loading filters.js:', error.message);
    process.exit(1);
}

// Test the new generateCategorySummary function
console.log('=== Testing New Category Summary Logic ===\n');

// Scenario 1: No search, full inventory
console.log('Scenario 1: No search query (full inventory)');
searchQuery = '';
activeFilters = {};
const fullInventory = filterInventoryAdvanced();
console.log(`Filtered items: ${fullInventory.length}`);
const fullSummary = generateCategorySummary(fullInventory);
console.log('Metals:', fullSummary.metals);
console.log('Types:', fullSummary.types);
console.log('Expected chips: Silver 2/4, Gold 2/4, Coin 2/4, Round 1/4, Bar 1/4\n');

// Scenario 2: Search for "Silver Eagle" 
console.log('Scenario 2: Search "Silver Eagle"');
searchQuery = 'Silver Eagle';
const silverEagleResults = filterInventoryAdvanced();
console.log(`Filtered items: ${silverEagleResults.length}`);
silverEagleResults.forEach(item => console.log(`  - ${item.name} (${item.metal} ${item.type})`));
const silverSummary = generateCategorySummary(silverEagleResults);
console.log('Metals:', silverSummary.metals);
console.log('Types:', silverSummary.types);
console.log('Expected chips: Only Silver 1/1, Coin 1/1\n');

// Scenario 3: Search for "Gold"
console.log('Scenario 3: Search "Gold"');
searchQuery = 'Gold';
const goldResults = filterInventoryAdvanced();
console.log(`Filtered items: ${goldResults.length}`);
goldResults.forEach(item => console.log(`  - ${item.name} (${item.metal} ${item.type})`));
const goldSummary = generateCategorySummary(goldResults);
console.log('Metals:', goldSummary.metals);
console.log('Types:', goldSummary.types);
console.log('Expected chips: Gold 2/2, Coin 1/2, Bar 1/2\n');

// Scenario 4: Search for something that doesn't exist
console.log('Scenario 4: Search "nonexistent"');
searchQuery = 'nonexistent';
const emptyResults = filterInventoryAdvanced();
console.log(`Filtered items: ${emptyResults.length}`);
const emptySummary = generateCategorySummary(emptyResults);
console.log('Metals:', emptySummary.metals);
console.log('Types:', emptySummary.types);
console.log('Expected chips: None (empty results)');

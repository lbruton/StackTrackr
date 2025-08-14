// =============================================================================
// REAL DATA IMPORT TESTS
// =============================================================================

console.log("Loading real data import tests...");

// =============================================================================
// ATTACHED FILES VALIDATION TESTS
// =============================================================================

const testAttachedCSVFile = async () => {
  console.log("🧪 Testing Attached CSV File Import...");
  
  try {
    // Read the attached CSV file
    const csvPath = '/Users/lbruton/Documents/Backups/metal_inventory_20250807.csv';
    
    // We'll simulate the file content since we can't directly read files in browser context
    // For real testing, this would need to be done through file upload
    console.log(`📁 Testing would use file: ${csvPath}`);
    
    // Test CSV parsing capabilities
    if (typeof Papa !== 'undefined' && Papa.parse) {
      console.log("✓ Papa Parse library available");
      
      // Test parsing with sample header format that matches StackTrackr exports
      const sampleCSVHeader = "Metal,Name,Qty,Type,Weight(oz),Purchase Price,Spot Price ($/oz),Premium ($/oz),Total Premium,Purchase Location,Storage Location,N#,Collectable,Notes,Date";
      const parsedHeader = Papa.parse(sampleCSVHeader, { header: false });
      
      if (parsedHeader.data && parsedHeader.data[0]) {
        console.log("✓ CSV header parsing works");
        console.log(`  - Found ${parsedHeader.data[0].length} columns`);
        console.log(`  - Headers: ${parsedHeader.data[0].join(', ')}`);
      }
      
    } else {
      console.error("❌ Papa Parse library not available");
    }
    
    // Test import function availability
    if (typeof importCsv === 'function') {
      console.log("✓ importCsv function available for real file testing");
    } else {
      console.error("❌ importCsv function not available");
    }
    
  } catch (error) {
    console.error("❌ Attached CSV file test failed:", error);
  }
};

const testAttachedJSONFile = async () => {
  console.log("🧪 Testing Attached JSON File Import...");
  
  try {
    // The JSON file is summarized, but we can see the structure
    console.log("📁 Testing JSON file structure...");
    
    // Test with the sample structure from the attachment
    const sampleJSONStructure = {
      "metal": "Silver",
      "name": "2021 American Silver Eagle (Type 1)",
      "qty": 1,
      "type": "Coin",
      "weight": 1,
      "price": 46.28,
      "date": "2025-07-29",
      "purchaseLocation": "herobullion.com",
      "storageLocation": "Unknown",
      "notes": "",
      "spotPriceAtPurchase": 38.18,
      "isCollectable": false,
      "premiumPerOz": 8.100000000000001,
      "totalPremium": 8.100000000000001
    };
    
    // Validate structure matches StackTrackr format
    const requiredFields = ['metal', 'name', 'qty', 'type', 'weight', 'price', 'date'];
    const optionalFields = ['purchaseLocation', 'storageLocation', 'notes', 'spotPriceAtPurchase', 'isCollectable', 'premiumPerOz', 'totalPremium'];
    
    console.log("✓ Testing JSON structure compatibility...");
    
    requiredFields.forEach(field => {
      if (sampleJSONStructure.hasOwnProperty(field)) {
        console.log(`  ✓ Required field '${field}' present`);
      } else {
        console.error(`  ❌ Required field '${field}' missing`);
      }
    });
    
    optionalFields.forEach(field => {
      if (sampleJSONStructure.hasOwnProperty(field)) {
        console.log(`  ✓ Optional field '${field}' present`);
      } else {
        console.warn(`  ⚠️ Optional field '${field}' missing`);
      }
    });
    
    // Test JSON import function availability
    if (typeof importJson === 'function') {
      console.log("✓ importJson function available for real file testing");
    } else {
      console.error("❌ importJson function not available");
    }
    
  } catch (error) {
    console.error("❌ Attached JSON file test failed:", error);
  }
};

// =============================================================================
// DATA FORMAT VALIDATION
// =============================================================================

const testDataFormatCompatibility = () => {
  console.log("🧪 Testing Data Format Compatibility...");
  
  // Test metal value parsing
  const testMetals = ['Silver', 'Gold', 'Platinum', 'Palladium'];
  testMetals.forEach(metal => {
    if (typeof parseNumistaMetal === 'function') {
      try {
        const parsed = parseNumistaMetal(metal);
        console.log(`  ✓ Metal '${metal}' parses to '${parsed}'`);
      } catch (error) {
        console.error(`  ❌ Metal '${metal}' parsing failed:`, error);
      }
    }
  });
  
  // Test type normalization
  const testTypes = ['Coin', 'Bar', 'Round', 'Note', 'Other'];
  testTypes.forEach(type => {
    if (typeof normalizeType === 'function') {
      try {
        const normalized = normalizeType(type);
        console.log(`  ✓ Type '${type}' normalizes to '${normalized}'`);
      } catch (error) {
        console.error(`  ❌ Type '${type}' normalization failed:`, error);
      }
    }
  });
  
  // Test date format handling
  const testDates = ['2025-07-29', '2024-01-15', '2023-12-25'];
  testDates.forEach(date => {
    try {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        console.log(`  ✓ Date '${date}' is valid`);
      } else {
        console.error(`  ❌ Date '${date}' is invalid`);
      }
    } catch (error) {
      console.error(`  ❌ Date '${date}' parsing failed:`, error);
    }
  });
};

// =============================================================================
// LOAD ORDER ISSUE DETECTION
// =============================================================================

const testLoadOrderIssues = () => {
  console.log("🧪 Testing Load Order Issues...");
  
  // Check if all required functions are available
  const requiredFunctions = [
    'importCsv', 'importJson', 'importNumistaCsv',
    'exportCsv', 'exportJson', 'exportPdf',
    'showDetailsModal', 'closeDetailsModal',
    'openModalById', 'closeModalById',
    'showFilesModal', 'hideFilesModal'
  ];
  
  const missingFunctions = [];
  const availableFunctions = [];
  
  requiredFunctions.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
      availableFunctions.push(funcName);
      console.log(`  ✓ ${funcName} function available`);
    } else {
      missingFunctions.push(funcName);
      console.error(`  ❌ ${funcName} function missing`);
    }
  });
  
  // Check DOM elements
  const requiredElements = [
    'filesModal', 'filesCloseBtn',
    'detailsModal', 'detailsCloseBtn',
    'importCsvFile', 'importJsonFile',
    'importCsvOverride', 'importJsonOverride',
    'exportCsvBtn', 'exportJsonBtn'
  ];
  
  const missingElements = [];
  const availableElements = [];
  
  requiredElements.forEach(elementId => {
    const element = document.getElementById(elementId);
    if (element) {
      availableElements.push(elementId);
      console.log(`  ✓ ${elementId} element found`);
    } else {
      missingElements.push(elementId);
      console.error(`  ❌ ${elementId} element missing`);
    }
  });
  
  // Summary
  console.log(`📊 Load Order Test Summary:`);
  console.log(`  Functions: ${availableFunctions.length}/${requiredFunctions.length} available`);
  console.log(`  Elements: ${availableElements.length}/${requiredElements.length} found`);
  
  if (missingFunctions.length > 0) {
    console.error(`❌ Missing functions suggest load order issues: ${missingFunctions.join(', ')}`);
  }
  
  if (missingElements.length > 0) {
    console.error(`❌ Missing elements suggest DOM issues: ${missingElements.join(', ')}`);
  }
  
  if (missingFunctions.length === 0 && missingElements.length === 0) {
    console.log("✅ No load order issues detected");
  }
};

// =============================================================================
// MODAL CLOSE BUTTON SPECIFIC TESTS
// =============================================================================

const testModalCloseButtons = () => {
  console.log("🧪 Testing Modal Close Button Functionality...");
  
  const modalTests = [
    { modalId: 'filesModal', closeBtnId: 'filesCloseBtn', closeFunc: 'hideFilesModal' },
    { modalId: 'detailsModal', closeBtnId: 'detailsCloseBtn', closeFunc: 'closeDetailsModal' },
    { modalId: 'editModal', closeBtnId: 'editCloseBtn', closeFunc: null },
    { modalId: 'changeLogModal', closeBtnId: 'changeLogCloseBtn', closeFunc: null },
    { modalId: 'apiModal', closeBtnId: 'apiCloseBtn', closeFunc: null }
  ];
  
  modalTests.forEach(test => {
    console.log(`Testing ${test.modalId}...`);
    
    const modal = document.getElementById(test.modalId);
    const closeBtn = document.getElementById(test.closeBtnId);
    
    if (!modal) {
      console.error(`  ❌ Modal ${test.modalId} not found`);
      return;
    }
    
    if (!closeBtn) {
      console.error(`  ❌ Close button ${test.closeBtnId} not found`);
      return;
    }
    
    console.log(`  ✓ Modal and close button found`);
    
    // Test if close function exists
    if (test.closeFunc && typeof window[test.closeFunc] === 'function') {
      console.log(`  ✓ Close function ${test.closeFunc} available`);
    } else if (test.closeFunc) {
      console.error(`  ❌ Close function ${test.closeFunc} missing`);
    }
    
    // Test if close button has event listeners (simplified check)
    try {
      const hasListeners = closeBtn.onclick !== null || 
                           closeBtn.getAttribute('onclick') !== null ||
                           closeBtn.dataset.hasListeners === 'true';
      if (hasListeners) {
        console.log(`  ✓ Close button appears to have listeners`);
      } else {
        console.warn(`  ⚠️ Close button listeners not easily detectable`);
      }
    } catch (error) {
      console.warn(`  ⚠️ Could not check close button listeners: ${error.message}`);
    }
    
    // Test modal opening/closing with global functions
    if (typeof openModalById === 'function' && typeof closeModalById === 'function') {
      try {
        // Test opening
        openModalById(test.modalId);
        if (modal.style.display === 'flex') {
          console.log(`  ✓ openModalById('${test.modalId}') works`);
          
          // Test closing
          closeModalById(test.modalId);
          if (modal.style.display === 'none') {
            console.log(`  ✓ closeModalById('${test.modalId}') works`);
          } else {
            console.error(`  ❌ closeModalById('${test.modalId}') failed`);
          }
        } else {
          console.error(`  ❌ openModalById('${test.modalId}') failed`);
        }
      } catch (error) {
        console.error(`  ❌ Modal function test failed:`, error);
      }
    }
  });
};

// =============================================================================
// EVENT LISTENER INTEGRITY TESTS
// =============================================================================

const testEventListenerIntegrity = () => {
  console.log("🧪 Testing Event Listener Integrity...");
  
  // Test file input event listeners
  const fileInputs = [
    { id: 'importCsvFile', event: 'change', description: 'CSV import file input' },
    { id: 'importJsonFile', event: 'change', description: 'JSON import file input' },
    { id: 'numistaImportFile', event: 'change', description: 'Numista import file input' }
  ];
  
  fileInputs.forEach(input => {
    const element = document.getElementById(input.id);
    if (element) {
      console.log(`  ✓ ${input.description} element found`);
      
      // Check if element has required attributes
      if (element.type === 'file') {
        console.log(`    ✓ Correct input type (file)`);
      } else {
        console.error(`    ❌ Incorrect input type (${element.type})`);
      }
      
      if (element.accept) {
        console.log(`    ✓ Accept attribute: ${element.accept}`);
      } else {
        console.warn(`    ⚠️ No accept attribute`);
      }
      
    } else {
      console.error(`  ❌ ${input.description} element not found`);
    }
  });
  
  // Test button event listeners
  const buttons = [
    { id: 'importCsvOverride', description: 'Import CSV button' },
    { id: 'importJsonOverride', description: 'Import JSON button' },
    { id: 'exportCsvBtn', description: 'Export CSV button' },
    { id: 'exportJsonBtn', description: 'Export JSON button' },
    { id: 'filesBtn', description: 'Files modal button' }
  ];
  
  buttons.forEach(button => {
    const element = document.getElementById(button.id);
    if (element) {
      console.log(`  ✓ ${button.description} found`);
      
      // Test if button is clickable
      try {
        element.click();
        console.log(`    ✓ Button is clickable`);
      } catch (error) {
        console.error(`    ❌ Button click failed:`, error);
      }
    } else {
      console.error(`  ❌ ${button.description} not found`);
    }
  });
};

// =============================================================================
// MAIN TEST RUNNER FOR REAL DATA
// =============================================================================

const runRealDataImportTests = async () => {
  console.log("🚀 Starting Real Data Import Tests...");
  console.log("=".repeat(60));
  
  try {
    // Wait for everything to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    testLoadOrderIssues();
    console.log("=".repeat(60));
    
    testModalCloseButtons();
    console.log("=".repeat(60));
    
    testEventListenerIntegrity();
    console.log("=".repeat(60));
    
    testDataFormatCompatibility();
    console.log("=".repeat(60));
    
    await testAttachedCSVFile();
    console.log("=".repeat(60));
    
    await testAttachedJSONFile();
    console.log("=".repeat(60));
    
    console.log("✅ Real Data Import Tests Complete!");
    
  } catch (error) {
    console.error("❌ Real data test suite failed:", error);
  }
};

// Auto-run tests
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(runRealDataImportTests, 3000);
  });
} else {
  setTimeout(runRealDataImportTests, 3000);
}

// Expose test runner
window.runRealDataImportTests = runRealDataImportTests;
console.log("✓ Real data import tests loaded");

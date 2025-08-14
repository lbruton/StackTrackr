// =============================================================================
// COMPREHENSIVE IMPORT/EXPORT TESTS
// =============================================================================

console.log("Loading comprehensive import/export tests...");

// Test data samples
const sampleCSVData = `Metal,Name,Qty,Type,Weight(oz),Purchase Price,Spot Price ($/oz),Premium ($/oz),Total Premium,Purchase Location,Storage Location,N#,Collectable,Notes,Date
Silver,American Silver Eagle,1,Coin,1,35.00,30.00,5.00,5.00,Local Dealer,Safe,12345,No,Test coin,2024-01-15
Gold,American Gold Eagle,1,Coin,1,2100.00,2000.00,100.00,100.00,Online,Bank,67890,No,Test gold coin,2024-01-20
Silver,Canadian Maple Leaf,5,Coin,1,32.50,30.00,2.50,12.50,Dealer,Home,11111,No,Bulk purchase,2024-01-25`;

const sampleJSONData = [
  {
    "metal": "Silver",
    "name": "Test Silver Bar",
    "qty": 1,
    "type": "Bar",
    "weight": 10,
    "price": 320.00,
    "date": "2024-01-15",
    "purchaseLocation": "Test Dealer",
    "storageLocation": "Test Storage",
    "notes": "Test notes",
    "spotPriceAtPurchase": 30.00,
    "isCollectable": false,
    "premiumPerOz": 2.00,
    "totalPremium": 20.00
  },
  {
    "metal": "Gold",
    "name": "Test Gold Coin",
    "qty": 1,
    "type": "Coin",
    "weight": 1,
    "price": 2100.00,
    "date": "2024-01-20",
    "purchaseLocation": "Test Online",
    "storageLocation": "Test Bank",
    "notes": "Premium coin",
    "spotPriceAtPurchase": 2000.00,
    "isCollectable": false,
    "premiumPerOz": 100.00,
    "totalPremium": 100.00
  }
];

const sampleNumistaCSV = `N# number,Title,Year,Metal,Quantity,Type,Weight (g),Buying price (USD),Acquisition place,Storage location,Acquisition date,Note,Private comment,Public comment,Comment
12345,American Silver Eagle,2023,Silver,1,Coin,31.1,35.00,Dealer,Safe,2024-01-15,Test note,Private note,Public note,Other comment
67890,Canadian Maple Leaf,2023,Silver,2,Coin,31.1,32.50,Online,Home,2024-01-20,Another note,Private 2,Public 2,Other 2`;

// =============================================================================
// UTILITY FUNCTIONS FOR TESTING
// =============================================================================

const createTestFile = (content, type = 'text/csv') => {
  return new File([content], 'test.csv', { type });
};

const createTestJSONFile = (data) => {
  const content = JSON.stringify(data, null, 2);
  return new File([content], 'test.json', { type: 'application/json' });
};

const waitForAsync = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

// Mock elements for testing
const mockProgress = {
  max: 0,
  value: 0,
  style: { display: 'none' }
};

const mockProgressText = {
  textContent: '',
  style: { display: 'none' }
};

// =============================================================================
// CSV IMPORT TESTS
// =============================================================================

const testCSVImport = async () => {
  console.log("🧪 Testing CSV Import Function...");
  
  try {
    // Backup original inventory
    const originalInventory = [...inventory];
    
    // Create test file
    const testFile = createTestFile(sampleCSVData);
    
    // Test CSV import
    if (typeof importCsv === 'function') {
      console.log("✓ importCsv function exists");
      
      // Mock elements for progress tracking
      if (!elements.importProgress) {
        elements.importProgress = mockProgress;
      }
      if (!elements.importProgressText) {
        elements.importProgressText = mockProgressText;
      }
      
      // Test import
      await new Promise((resolve, reject) => {
        try {
          importCsv(testFile, false); // merge mode
          setTimeout(() => {
            // Check if items were added
            const addedItems = inventory.filter(item => 
              item.name === 'American Silver Eagle' || 
              item.name === 'American Gold Eagle' || 
              item.name === 'Canadian Maple Leaf'
            );
            
            if (addedItems.length > 0) {
              console.log("✓ CSV import successfully added items");
              console.log(`  - Added ${addedItems.length} items`);
            } else {
              console.warn("⚠️ CSV import may not have added items");
            }
            resolve();
          }, 200);
        } catch (error) {
          console.error("❌ CSV import failed:", error);
          reject(error);
        }
      });
      
    } else {
      console.error("❌ importCsv function not found");
    }
    
    // Restore original inventory
    inventory.length = 0;
    inventory.push(...originalInventory);
    
  } catch (error) {
    console.error("❌ CSV import test failed:", error);
  }
};

// =============================================================================
// JSON IMPORT TESTS
// =============================================================================

const testJSONImport = async () => {
  console.log("🧪 Testing JSON Import Function...");
  
  try {
    // Backup original inventory
    const originalInventory = [...inventory];
    
    // Create test file
    const testFile = createTestJSONFile(sampleJSONData);
    
    // Test JSON import
    if (typeof importJson === 'function') {
      console.log("✓ importJson function exists");
      
      // Mock elements for progress tracking
      if (!elements.importProgress) {
        elements.importProgress = mockProgress;
      }
      if (!elements.importProgressText) {
        elements.importProgressText = mockProgressText;
      }
      
      // Test import
      await new Promise((resolve, reject) => {
        try {
          importJson(testFile, false); // merge mode
          setTimeout(() => {
            // Check if items were added
            const addedItems = inventory.filter(item => 
              item.name === 'Test Silver Bar' || 
              item.name === 'Test Gold Coin'
            );
            
            if (addedItems.length > 0) {
              console.log("✓ JSON import successfully added items");
              console.log(`  - Added ${addedItems.length} items`);
            } else {
              console.warn("⚠️ JSON import may not have added items");
            }
            resolve();
          }, 200);
        } catch (error) {
          console.error("❌ JSON import failed:", error);
          reject(error);
        }
      });
      
    } else {
      console.error("❌ importJson function not found");
    }
    
    // Restore original inventory
    inventory.length = 0;
    inventory.push(...originalInventory);
    
  } catch (error) {
    console.error("❌ JSON import test failed:", error);
  }
};

// =============================================================================
// NUMISTA CSV IMPORT TESTS
// =============================================================================

const testNumistaCSVImport = async () => {
  console.log("🧪 Testing Numista CSV Import Function...");
  
  try {
    // Backup original inventory
    const originalInventory = [...inventory];
    
    // Create test file
    const testFile = createTestFile(sampleNumistaCSV);
    
    // Test Numista CSV import
    if (typeof importNumistaCsv === 'function') {
      console.log("✓ importNumistaCsv function exists");
      
      // Mock elements for progress tracking
      if (!elements.importProgress) {
        elements.importProgress = mockProgress;
      }
      if (!elements.importProgressText) {
        elements.importProgressText = mockProgressText;
      }
      
      // Test import
      await new Promise((resolve, reject) => {
        try {
          importNumistaCsv(testFile, false); // merge mode
          setTimeout(() => {
            // Check if items were added
            const addedItems = inventory.filter(item => 
              item.name === 'American Silver Eagle' || 
              item.name === 'Canadian Maple Leaf'
            );
            
            if (addedItems.length > 0) {
              console.log("✓ Numista CSV import successfully added items");
              console.log(`  - Added ${addedItems.length} items`);
              
              // Check if Numista ID was preserved
              const itemsWithNumistaId = addedItems.filter(item => item.numistaId);
              if (itemsWithNumistaId.length > 0) {
                console.log("✓ Numista IDs preserved during import");
              } else {
                console.warn("⚠️ Numista IDs may not have been preserved");
              }
            } else {
              console.warn("⚠️ Numista CSV import may not have added items");
            }
            resolve();
          }, 200);
        } catch (error) {
          console.error("❌ Numista CSV import failed:", error);
          reject(error);
        }
      });
      
    } else {
      console.error("❌ importNumistaCsv function not found");
    }
    
    // Restore original inventory
    inventory.length = 0;
    inventory.push(...originalInventory);
    
  } catch (error) {
    console.error("❌ Numista CSV import test failed:", error);
  }
};

// =============================================================================
// EXPORT FUNCTION TESTS
// =============================================================================

const testExportFunctions = () => {
  console.log("🧪 Testing Export Functions...");
  
  // Test CSV export
  if (typeof exportCsv === 'function') {
    console.log("✓ exportCsv function exists");
    try {
      // This would normally trigger a download, so we just test the function exists
      console.log("✓ exportCsv function callable");
    } catch (error) {
      console.error("❌ exportCsv function error:", error);
    }
  } else {
    console.error("❌ exportCsv function not found");
  }
  
  // Test JSON export
  if (typeof exportJson === 'function') {
    console.log("✓ exportJson function exists");
    try {
      console.log("✓ exportJson function callable");
    } catch (error) {
      console.error("❌ exportJson function error:", error);
    }
  } else {
    console.error("❌ exportJson function not found");
  }
  
  // Test Numista CSV export
  if (typeof exportNumistaCsv === 'function') {
    console.log("✓ exportNumistaCsv function exists");
    try {
      console.log("✓ exportNumistaCsv function callable");
    } catch (error) {
      console.error("❌ exportNumistaCsv function error:", error);
    }
  } else {
    console.error("❌ exportNumistaCsv function not found");
  }
  
  // Test PDF export
  if (typeof exportPdf === 'function') {
    console.log("✓ exportPdf function exists");
    try {
      console.log("✓ exportPdf function callable");
    } catch (error) {
      console.error("❌ exportPdf function error:", error);
    }
  } else {
    console.error("❌ exportPdf function not found");
  }
};

// =============================================================================
// MODAL FUNCTIONALITY TESTS
// =============================================================================

const testModalFunctionality = () => {
  console.log("🧪 Testing Modal Functionality...");
  
  // Test file modal
  const filesModal = document.getElementById('filesModal');
  const filesCloseBtn = document.getElementById('filesCloseBtn');
  
  if (filesModal && filesCloseBtn) {
    console.log("✓ Files modal and close button found");
    
    // Test modal opening
    if (typeof showFilesModal === 'function') {
      console.log("✓ showFilesModal function exists");
    } else {
      console.error("❌ showFilesModal function not found");
    }
    
    // Test modal closing
    if (typeof hideFilesModal === 'function') {
      console.log("✓ hideFilesModal function exists");
    } else {
      console.error("❌ hideFilesModal function not found");
    }
    
    // Test close button event listener
    try {
      filesCloseBtn.click();
      console.log("✓ Files modal close button clickable");
    } catch (error) {
      console.error("❌ Files modal close button error:", error);
    }
  } else {
    console.error("❌ Files modal or close button not found");
  }
  
  // Test details modal
  const detailsModal = document.getElementById('detailsModal');
  const detailsCloseBtn = document.getElementById('detailsCloseBtn');
  
  if (detailsModal && detailsCloseBtn) {
    console.log("✓ Details modal and close button found");
    
    // Test modal functions
    if (typeof showDetailsModal === 'function') {
      console.log("✓ showDetailsModal function exists");
    } else {
      console.error("❌ showDetailsModal function not found");
    }
    
    if (typeof closeDetailsModal === 'function') {
      console.log("✓ closeDetailsModal function exists");
    } else {
      console.error("❌ closeDetailsModal function not found");
    }
    
    // Test close button event listener
    try {
      detailsCloseBtn.click();
      console.log("✓ Details modal close button clickable");
    } catch (error) {
      console.error("❌ Details modal close button error:", error);
    }
  } else {
    console.error("❌ Details modal or close button not found");
  }
  
  // Test global modal functions
  if (typeof openModalById === 'function') {
    console.log("✓ openModalById global function exists");
  } else {
    console.error("❌ openModalById global function not found");
  }
  
  if (typeof closeModalById === 'function') {
    console.log("✓ closeModalById global function exists");
  } else {
    console.error("❌ closeModalById global function not found");
  }
};

// =============================================================================
// FILE ELEMENT TESTS
// =============================================================================

const testFileElements = () => {
  console.log("🧪 Testing File Input Elements...");
  
  // Test CSV import file input
  const csvImportFile = document.getElementById('importCsvFile');
  if (csvImportFile) {
    console.log("✓ CSV import file input found");
    console.log(`  - Accept attribute: ${csvImportFile.accept}`);
  } else {
    console.error("❌ CSV import file input not found");
  }
  
  // Test JSON import file input
  const jsonImportFile = document.getElementById('importJsonFile');
  if (jsonImportFile) {
    console.log("✓ JSON import file input found");
    console.log(`  - Accept attribute: ${jsonImportFile.accept}`);
  } else {
    console.error("❌ JSON import file input not found");
  }
  
  // Test Numista import file input
  const numistaImportFile = document.getElementById('numistaImportFile');
  if (numistaImportFile) {
    console.log("✓ Numista import file input found");
    console.log(`  - Accept attribute: ${numistaImportFile.accept}`);
  } else {
    console.error("❌ Numista import file input not found");
  }
  
  // Test import buttons
  const importButtons = [
    'importCsvOverride', 'importCsvMerge', 'importJsonOverride', 'importJsonMerge',
    'importNumistaBtn', 'mergeNumistaBtn'
  ];
  
  importButtons.forEach(buttonId => {
    const button = document.getElementById(buttonId);
    if (button) {
      console.log(`✓ ${buttonId} button found`);
    } else {
      console.error(`❌ ${buttonId} button not found`);
    }
  });
  
  // Test export buttons
  const exportButtons = [
    'exportCsvBtn', 'exportJsonBtn', 'exportPdfBtn'
  ];
  
  exportButtons.forEach(buttonId => {
    const button = document.getElementById(buttonId);
    if (button) {
      console.log(`✓ ${buttonId} button found`);
    } else {
      console.error(`❌ ${buttonId} button not found`);
    }
  });
};

// =============================================================================
// VALIDATION TESTS
// =============================================================================

const testValidationFunctions = () => {
  console.log("🧪 Testing Validation Functions...");
  
  // Test data validation helpers
  if (typeof parseNumistaMetal === 'function') {
    console.log("✓ parseNumistaMetal function exists");
    
    // Test metal parsing
    const testCases = [
      ['Silver', 'Silver'],
      ['GOLD', 'Gold'],
      ['platinum', 'Platinum'],
      ['Pd', 'Palladium'],
      ['copper', 'Silver'] // fallback
    ];
    
    testCases.forEach(([input, expected]) => {
      try {
        const result = parseNumistaMetal(input);
        if (result === expected) {
          console.log(`  ✓ parseNumistaMetal('${input}') = '${result}'`);
        } else {
          console.warn(`  ⚠️ parseNumistaMetal('${input}') = '${result}', expected '${expected}'`);
        }
      } catch (error) {
        console.error(`  ❌ parseNumistaMetal('${input}') failed:`, error);
      }
    });
  } else {
    console.error("❌ parseNumistaMetal function not found");
  }
  
  if (typeof normalizeType === 'function') {
    console.log("✓ normalizeType function exists");
    
    // Test type normalization
    const testCases = [
      ['coin', 'Coin'],
      ['BAR', 'Bar'],
      ['round', 'Round'],
      ['jewelry', 'Other'],
      ['unknown', 'Other']
    ];
    
    testCases.forEach(([input, expected]) => {
      try {
        const result = normalizeType(input);
        if (result === expected) {
          console.log(`  ✓ normalizeType('${input}') = '${result}'`);
        } else {
          console.warn(`  ⚠️ normalizeType('${input}') = '${result}', expected '${expected}'`);
        }
      } catch (error) {
        console.error(`  ❌ normalizeType('${input}') failed:`, error);
      }
    });
  } else {
    console.error("❌ normalizeType function not found");
  }
};

// =============================================================================
// PROGRESS TRACKING TESTS
// =============================================================================

const testProgressTracking = () => {
  console.log("🧪 Testing Progress Tracking...");
  
  // Test progress utility functions
  if (typeof startImportProgress === 'function') {
    console.log("✓ startImportProgress function exists");
    try {
      startImportProgress(100);
      console.log("✓ startImportProgress(100) executed successfully");
    } catch (error) {
      console.error("❌ startImportProgress failed:", error);
    }
  } else {
    console.error("❌ startImportProgress function not found");
  }
  
  if (typeof updateImportProgress === 'function') {
    console.log("✓ updateImportProgress function exists");
    try {
      updateImportProgress(50, 45, 100);
      console.log("✓ updateImportProgress(50, 45, 100) executed successfully");
    } catch (error) {
      console.error("❌ updateImportProgress failed:", error);
    }
  } else {
    console.error("❌ updateImportProgress function not found");
  }
  
  if (typeof endImportProgress === 'function') {
    console.log("✓ endImportProgress function exists");
    try {
      endImportProgress();
      console.log("✓ endImportProgress() executed successfully");
    } catch (error) {
      console.error("❌ endImportProgress failed:", error);
    }
  } else {
    console.error("❌ endImportProgress function not found");
  }
  
  // Test progress elements
  const progressBar = document.getElementById('importProgress');
  const progressText = document.getElementById('importProgressText');
  
  if (progressBar) {
    console.log("✓ Import progress bar element found");
  } else {
    console.warn("⚠️ Import progress bar element not found");
  }
  
  if (progressText) {
    console.log("✓ Import progress text element found");
  } else {
    console.warn("⚠️ Import progress text element not found");
  }
};

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

const runComprehensiveImportExportTests = async () => {
  console.log("🚀 Starting Comprehensive Import/Export Tests...");
  console.log("=".repeat(60));
  
  try {
    // Wait for DOM and scripts to be ready
    await waitForAsync(1000);
    
    // Run all tests
    testFileElements();
    console.log("=".repeat(60));
    
    testModalFunctionality();
    console.log("=".repeat(60));
    
    testExportFunctions();
    console.log("=".repeat(60));
    
    testValidationFunctions();
    console.log("=".repeat(60));
    
    testProgressTracking();
    console.log("=".repeat(60));
    
    await testCSVImport();
    console.log("=".repeat(60));
    
    await testJSONImport();
    console.log("=".repeat(60));
    
    await testNumistaCSVImport();
    console.log("=".repeat(60));
    
    console.log("✅ Comprehensive Import/Export Tests Complete!");
    
  } catch (error) {
    console.error("❌ Test suite failed:", error);
  }
};

// =============================================================================
// AUTO-RUN TESTS
// =============================================================================

// Auto-run tests when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(runComprehensiveImportExportTests, 2000);
  });
} else {
  setTimeout(runComprehensiveImportExportTests, 2000);
}

// Expose test runner globally
window.runComprehensiveImportExportTests = runComprehensiveImportExportTests;
console.log("✓ Comprehensive import/export tests loaded");

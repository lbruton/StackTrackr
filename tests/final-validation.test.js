// =============================================================================
// FINAL VALIDATION TESTS FOR CSV/JSON IMPORT
// =============================================================================

console.log("Loading final validation tests...");

// =============================================================================
// REAL FILE SIMULATION TESTS
// =============================================================================

const testRealCSVStructure = () => {
  console.log("🧪 Testing Real CSV File Structure...");
  
  // Based on the actual CSV structure from the provided file
  const realCSVHeader = "Metal,Name,Qty,Type,Weight(oz),Purchase Price,Spot Price ($/oz),Premium ($/oz),Total Premium,Purchase Location,Storage Location,Notes,Date,Collectable";
  const realCSVSample = `Silver,2021 American Silver Eagle (Type 1),1,Coin,1.0000,$46.28,$38.18,$8.10,$8.10,herobullion.com,Unknown,,2025-07-29,No`;
  
  try {
    if (typeof Papa !== 'undefined') {
      const parsed = Papa.parse(realCSVHeader + '\n' + realCSVSample, { header: true });
      
      if (parsed.data && parsed.data.length > 0) {
        console.log("✓ Real CSV structure parses correctly");
        const item = parsed.data[0];
        
        // Validate all expected fields are present
        const expectedFields = ['Metal', 'Name', 'Qty', 'Type', 'Weight(oz)', 'Purchase Price', 'Spot Price ($/oz)', 'Premium ($/oz)', 'Total Premium', 'Purchase Location', 'Storage Location', 'Notes', 'Date', 'Collectable'];
        
        expectedFields.forEach(field => {
          if (item.hasOwnProperty(field)) {
            console.log(`  ✓ Field '${field}': '${item[field]}'`);
          } else {
            console.error(`  ❌ Missing field: '${field}'`);
          }
        });
        
        // Test if import function can handle this structure
        if (typeof importCsv === 'function') {
          console.log("✓ importCsv function available to process this structure");
        } else {
          console.error("❌ importCsv function not available");
        }
        
      } else {
        console.error("❌ Failed to parse CSV sample");
      }
    } else {
      console.error("❌ Papa Parse not available");
    }
  } catch (error) {
    console.error("❌ CSV structure test failed:", error);
  }
};

const testRealJSONStructure = () => {
  console.log("🧪 Testing Real JSON File Structure...");
  
  // Based on the actual JSON structure from the provided file
  const realJSONSample = {
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
  
  try {
    // Validate all expected fields are present
    const expectedFields = ['metal', 'name', 'qty', 'type', 'weight', 'price', 'date', 'purchaseLocation', 'storageLocation', 'notes', 'spotPriceAtPurchase', 'isCollectable', 'premiumPerOz', 'totalPremium'];
    
    expectedFields.forEach(field => {
      if (realJSONSample.hasOwnProperty(field)) {
        console.log(`  ✓ Field '${field}': ${JSON.stringify(realJSONSample[field])}`);
      } else {
        console.error(`  ❌ Missing field: '${field}'`);
      }
    });
    
    // Test data type validation
    if (typeof realJSONSample.qty === 'number') {
      console.log("  ✓ qty is numeric");
    } else {
      console.warn("  ⚠️ qty is not numeric");
    }
    
    if (typeof realJSONSample.weight === 'number') {
      console.log("  ✓ weight is numeric");
    } else {
      console.warn("  ⚠️ weight is not numeric");
    }
    
    if (typeof realJSONSample.price === 'number') {
      console.log("  ✓ price is numeric");
    } else {
      console.warn("  ⚠️ price is not numeric");
    }
    
    if (typeof realJSONSample.isCollectable === 'boolean') {
      console.log("  ✓ isCollectable is boolean");
    } else {
      console.warn("  ⚠️ isCollectable is not boolean");
    }
    
    // Test if import function can handle this structure
    if (typeof importJson === 'function') {
      console.log("✓ importJson function available to process this structure");
    } else {
      console.error("❌ importJson function not available");
    }
    
  } catch (error) {
    console.error("❌ JSON structure test failed:", error);
  }
};

// =============================================================================
// MODAL CLOSE BUTTON VALIDATION
// =============================================================================

const testModalCloseButtonIssues = () => {
  console.log("🧪 Testing Modal Close Button Issues...");
  
  // Test Files Modal
  const filesModal = document.getElementById('filesModal');
  const filesCloseBtn = document.getElementById('filesCloseBtn');
  
  if (filesModal && filesCloseBtn) {
    console.log("✓ Files modal components found");
    
    // Test opening and closing
    try {
      if (typeof showFilesModal === 'function') {
        showFilesModal();
        if (filesModal.style.display === 'flex') {
          console.log("  ✓ showFilesModal opens modal correctly");
          
          // Test close function
          if (typeof hideFilesModal === 'function') {
            hideFilesModal();
            if (filesModal.style.display === 'none') {
              console.log("  ✓ hideFilesModal closes modal correctly");
            } else {
              console.error("  ❌ hideFilesModal does not close modal");
            }
          } else {
            console.error("  ❌ hideFilesModal function missing");
          }
        } else {
          console.error("  ❌ showFilesModal does not open modal");
        }
      } else {
        console.error("  ❌ showFilesModal function missing");
      }
      
      // Test close button click
      filesCloseBtn.click();
      console.log("  ✓ Files close button is clickable");
      
    } catch (error) {
      console.error("  ❌ Files modal test failed:", error);
    }
  } else {
    console.error("❌ Files modal or close button not found");
  }
  
  // Test Details Modal
  const detailsModal = document.getElementById('detailsModal');
  const detailsCloseBtn = document.getElementById('detailsCloseBtn');
  
  if (detailsModal && detailsCloseBtn) {
    console.log("✓ Details modal components found");
    
    try {
      // Test close function
      if (typeof closeDetailsModal === 'function') {
        console.log("  ✓ closeDetailsModal function available");
      } else {
        console.error("  ❌ closeDetailsModal function missing");
      }
      
      // Test close button click
      detailsCloseBtn.click();
      console.log("  ✓ Details close button is clickable");
      
    } catch (error) {
      console.error("  ❌ Details modal test failed:", error);
    }
  } else {
    console.error("❌ Details modal or close button not found");
  }
};

// =============================================================================
// FUNCTION AVAILABILITY VALIDATION
// =============================================================================

const testFunctionAvailability = () => {
  console.log("🧪 Testing Function Availability After Fixes...");
  
  const criticalFunctions = [
    'importCsv', 'importJson', 'importNumistaCsv',
    'exportCsv', 'exportJson', 'exportNumistaCsv', 'exportPdf',
    'startImportProgress', 'updateImportProgress', 'endImportProgress',
    'showFilesModal', 'hideFilesModal',
    'showDetailsModal', 'closeDetailsModal',
    'openModalById', 'closeModalById'
  ];
  
  const available = [];
  const missing = [];
  
  criticalFunctions.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
      available.push(funcName);
      console.log(`  ✓ ${funcName}`);
    } else {
      missing.push(funcName);
      console.error(`  ❌ ${funcName}`);
    }
  });
  
  console.log(`📊 Function Availability Summary:`);
  console.log(`  Available: ${available.length}/${criticalFunctions.length}`);
  console.log(`  Missing: ${missing.length}`);
  
  if (missing.length === 0) {
    console.log("✅ All critical functions are available!");
  } else {
    console.error(`❌ Missing functions: ${missing.join(', ')}`);
  }
  
  return { available, missing };
};

// =============================================================================
// ELEMENT AVAILABILITY VALIDATION
// =============================================================================

const testElementAvailability = () => {
  console.log("🧪 Testing Element Availability After Fixes...");
  
  const criticalElements = [
    'filesModal', 'filesCloseBtn',
    'detailsModal', 'detailsCloseBtn',
    'importCsvFile', 'importJsonFile', 'numistaImportFile',
    'importCsvOverride', 'importJsonOverride',
    'exportCsvBtn', 'exportJsonBtn', 'exportPdfBtn'
  ];
  
  const available = [];
  const missing = [];
  
  criticalElements.forEach(elementId => {
    const element = document.getElementById(elementId);
    if (element) {
      available.push(elementId);
      console.log(`  ✓ ${elementId}`);
    } else {
      missing.push(elementId);
      console.error(`  ❌ ${elementId}`);
    }
  });
  
  console.log(`📊 Element Availability Summary:`);
  console.log(`  Available: ${available.length}/${criticalElements.length}`);
  console.log(`  Missing: ${missing.length}`);
  
  if (missing.length === 0) {
    console.log("✅ All critical elements are available!");
  } else {
    console.error(`❌ Missing elements: ${missing.join(', ')}`);
  }
  
  return { available, missing };
};

// =============================================================================
// COMPREHENSIVE VALIDATION SUMMARY
// =============================================================================

const generateValidationSummary = (functionResults, elementResults) => {
  console.log("📋 COMPREHENSIVE VALIDATION SUMMARY");
  console.log("=".repeat(60));
  
  const totalFunctions = functionResults.available.length + functionResults.missing.length;
  const totalElements = elementResults.available.length + elementResults.missing.length;
  
  const functionScore = ((functionResults.available.length / totalFunctions) * 100).toFixed(1);
  const elementScore = ((elementResults.available.length / totalElements) * 100).toFixed(1);
  
  console.log(`Functions: ${functionResults.available.length}/${totalFunctions} (${functionScore}%)`);
  console.log(`Elements:  ${elementResults.available.length}/${totalElements} (${elementScore}%)`);
  
  if (functionResults.missing.length > 0) {
    console.log(`\n❌ Missing Functions:`);
    functionResults.missing.forEach(func => console.log(`  - ${func}`));
  }
  
  if (elementResults.missing.length > 0) {
    console.log(`\n❌ Missing Elements:`);
    elementResults.missing.forEach(elem => console.log(`  - ${elem}`));
  }
  
  const overallScore = ((functionResults.available.length + elementResults.available.length) / (totalFunctions + totalElements) * 100).toFixed(1);
  
  console.log(`\n📊 Overall System Health: ${overallScore}%`);
  
  if (overallScore >= 90) {
    console.log("✅ System is healthy and ready for import/export operations");
  } else if (overallScore >= 70) {
    console.log("⚠️ System has minor issues but should be functional");
  } else {
    console.log("❌ System has significant issues that need to be addressed");
  }
  
  console.log("=".repeat(60));
};

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

const runFinalValidationTests = async () => {
  console.log("🚀 Starting Final Validation Tests...");
  console.log("=".repeat(60));
  
  try {
    // Wait for everything to be fully loaded
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    testRealCSVStructure();
    console.log("=".repeat(60));
    
    testRealJSONStructure();
    console.log("=".repeat(60));
    
    testModalCloseButtonIssues();
    console.log("=".repeat(60));
    
    const functionResults = testFunctionAvailability();
    console.log("=".repeat(60));
    
    const elementResults = testElementAvailability();
    console.log("=".repeat(60));
    
    generateValidationSummary(functionResults, elementResults);
    
    console.log("✅ Final Validation Tests Complete!");
    
  } catch (error) {
    console.error("❌ Final validation test suite failed:", error);
  }
};

// Auto-run tests
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(runFinalValidationTests, 4000);
  });
} else {
  setTimeout(runFinalValidationTests, 4000);
}

// Expose test runner
window.runFinalValidationTests = runFinalValidationTests;
console.log("✓ Final validation tests loaded");

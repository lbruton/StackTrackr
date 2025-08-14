// Debug script to check element loading
console.log('🔍 Debug: Checking element loading...');

// Check if DOM is ready
if (document.readyState === 'loading') {
  console.log('❌ DOM still loading');
} else {
  console.log('✅ DOM ready');
}

// Check critical elements
const elementsToCheck = [
  'filesModal',
  'importCsvFile',
  'importCsvOverride', 
  'importCsvMerge',
  'importJsonFile',
  'importJsonOverride',
  'importJsonMerge',
  'importProgress',
  'importProgressText',
  'exportCsvBtn',
  'exportJsonBtn',
  'exportPdfBtn',
  'filesCloseBtn',
  'filesCloseBtnFooter'
];

console.log('\n📋 Element Check Results:');
elementsToCheck.forEach(id => {
  const element = document.getElementById(id);
  if (element) {
    console.log(`✅ ${id}: Found`);
  } else {
    console.log(`❌ ${id}: Missing`);
  }
});

// Check if global functions exist
console.log('\n🔧 Function Check Results:');
const functionsToCheck = [
  'importCsv',
  'importJson', 
  'exportCsv',
  'exportJson',
  'exportPdf',
  'hideFilesModal',
  'formatWeight',
  'gramsToOzt',
  'sanitizeImportedItem'
];

functionsToCheck.forEach(funcName => {
  if (typeof window[funcName] === 'function') {
    console.log(`✅ ${funcName}: Available`);
  } else {
    console.log(`❌ ${funcName}: Missing`);
  }
});

// Check elements object
console.log('\n📦 Elements Object Check:');
if (typeof elements !== 'undefined') {
  console.log('✅ elements object exists');
  console.log('Elements available:', Object.keys(elements).length);
  
  // Check specific import/export elements
  const importExportElements = [
    'importCsvFile', 'importCsvOverride', 'importCsvMerge',
    'importJsonFile', 'importJsonOverride', 'importJsonMerge',
    'exportCsvBtn', 'exportJsonBtn', 'exportPdfBtn',
    'filesModal', 'filesCloseBtn'
  ];
  
  importExportElements.forEach(key => {
    if (elements[key]) {
      console.log(`✅ elements.${key}: Available`);
    } else {
      console.log(`❌ elements.${key}: Missing`);
    }
  });
} else {
  console.log('❌ elements object missing');
}

console.log('\n🎯 Debug complete!');
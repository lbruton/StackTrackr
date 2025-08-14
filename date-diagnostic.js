// Diagnostic script to check existing inventory data for date issues

// Simulate the functions as they exist in the app
const formatDisplayDate = (dateStr) => {
  if (!dateStr || dateStr === '—' || dateStr === 'Unknown') return '—';
  
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

// Check what might be in localStorage
try {
  // Try to access localStorage data (this won't work in Node.js, but let's see what we have)
  console.log('This script needs to be run in a browser console to access localStorage.');
  console.log('Copy and paste this code into your browser\'s developer console:');
  console.log('');
  console.log('// Check inventory dates');
  console.log('const inventory = JSON.parse(localStorage.getItem("stackrtrackr_inventory") || "[]");');
  console.log('console.log("Total items:", inventory.length);');
  console.log('');
  console.log('// Check for problematic dates');
  console.log('const problematicDates = [];');
  console.log('inventory.forEach((item, index) => {');
  console.log('  const displayDate = formatDisplayDate(item.date);');
  console.log('  if (displayDate === "—") {');
  console.log('    problematicDates.push({');
  console.log('      index,');
  console.log('      name: item.name,');
  console.log('      rawDate: item.date,');
  console.log('      displayDate');
  console.log('    });');
  console.log('  }');
  console.log('});');
  console.log('');
  console.log('console.log("Items with problematic dates:", problematicDates);');
} catch (e) {
  console.log('Error:', e.message);
}

// Test some potential problematic date values
const testDates = [
  '',
  null,
  undefined,
  '—',
  'Unknown',
  'Invalid Date',
  '2024-13-32', // Invalid date
  '2024-02-30', // Invalid date
  '13/50/2024', // Invalid format
  'Not a date at all',
  '2024-07-12', // Valid date
  '07/12/2024', // Valid US format
];

console.log('\nTesting various date values:');
console.log('============================');
testDates.forEach(date => {
  const result = formatDisplayDate(date);
  console.log(`Input: ${JSON.stringify(date)} → Output: ${JSON.stringify(result)}`);
});

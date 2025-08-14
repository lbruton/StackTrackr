// Migration script to fix existing inventory dates
// This should be run in the browser console to fix existing data

// Copy and paste this entire block into your browser's developer console:

(function() {
  console.log('🔧 Starting inventory date migration...');
  
  // Get current inventory
  const inventory = JSON.parse(localStorage.getItem("stackrtrackr_inventory") || "[]");
  console.log(`📦 Found ${inventory.length} items in inventory`);
  
  if (inventory.length === 0) {
    console.log('✅ No items to migrate');
    return;
  }
  
  // Define formatDisplayDate function
  const formatDisplayDate = (dateStr) => {
    if (!dateStr || dateStr === '—' || dateStr === 'Unknown') return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return '—';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };
  
  // Track changes
  let migratedCount = 0;
  const migrations = [];
  
  // Process each item
  inventory.forEach((item, index) => {
    const originalDate = item.date;
    const displayDate = formatDisplayDate(originalDate);
    
    // If the date would display as "—", but the stored value is not "—", fix it
    if (displayDate === '—' && originalDate !== '—') {
      console.log(`🔄 Migrating item ${index}: "${item.name}"`);
      console.log(`   Before: ${JSON.stringify(originalDate)}`);
      console.log(`   After:  "—"`);
      
      item.date = '—';
      migratedCount++;
      migrations.push({
        index,
        name: item.name,
        before: originalDate,
        after: '—'
      });
    }
  });
  
  if (migratedCount > 0) {
    // Save the updated inventory
    localStorage.setItem("stackrtrackr_inventory", JSON.stringify(inventory));
    console.log(`✅ Migration complete! Fixed ${migratedCount} items`);
    console.log('📋 Migration summary:', migrations);
    console.log('🔄 Please refresh the page to see the changes');
  } else {
    console.log('✅ No items needed migration');
  }
})();

// Also provide a function to check current state
console.log('');
console.log('To check your current inventory dates, run this:');
console.log('checkInventoryDates();');

window.checkInventoryDates = function() {
  const inventory = JSON.parse(localStorage.getItem("stackrtrackr_inventory") || "[]");
  const formatDisplayDate = (dateStr) => {
    if (!dateStr || dateStr === '—' || dateStr === 'Unknown') return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return '—';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };
  
  console.log(`📦 Total items: ${inventory.length}`);
  
  const dateStats = {
    valid: 0,
    invalid: 0,
    empty: 0
  };
  
  inventory.forEach((item, index) => {
    const displayDate = formatDisplayDate(item.date);
    if (displayDate === '—') {
      if (!item.date || item.date === '—') {
        dateStats.empty++;
      } else {
        dateStats.invalid++;
        console.log(`❌ Invalid date in item ${index}: "${item.name}" - raw date: ${JSON.stringify(item.date)}`);
      }
    } else {
      dateStats.valid++;
    }
  });
  
  console.log('📊 Date statistics:', dateStats);
};

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// Minimal DOM and environment stubs
global.localStorage = { getItem: () => null, setItem: () => {} };
global.window = global;
global.document = {
  documentElement: { getAttribute: () => 'light' },
  querySelectorAll: () => [],
  getElementById: id => {
    if (id === 'inventoryTable') return { innerHTML: '' };
    if (id === 'itemsPerPage') {
      return {
        value: '25',
        options: [
          { value: '10' },
          { value: '15' },
          { value: '25' },
          { value: '50' },
          { value: '100' },
        ],
      };
    }
    return null;
  },
};

// Required global variables/functions
global.elements = { inventoryTable: null, itemsPerPage: null };
global.monitorPerformance = fn => fn();
global.filterInventory = () => inventory;
global.sortInventory = arr => arr;
global.calculateTotalPages = arr => Math.max(1, Math.ceil(arr.length / itemsPerPage));
global.formatCurrency = v => v;
global.formatDisplayDate = v => v;
global.getTypeColor = () => '';
global.getDisplayComposition = s => s;
global.formatWeight = v => v;
global.formatPurchaseLocation = v => v;
global.getStorageLocationColor = () => '';
global.filterLink = () => '';
global.escapeAttribute = s => s;
global.sanitizeHtml = s => s;
global.toggleCollectable = () => {};
global.showNotes = () => {};
global.editItem = () => {};
global.deleteItem = () => {};
global.updateTypeSummary = () => {};
global.setupColumnResizing = () => {};
global.renderPagination = () => {};
global.updateColumnVisibility = () => {};
global.METAL_COLORS = {};

// Load modules
vm.runInThisContext(fs.readFileSync('js/state.js', 'utf8'));
elements.inventoryTable = document.getElementById('inventoryTable');
elements.itemsPerPage = document.getElementById('itemsPerPage');
let inventoryCode = fs.readFileSync('js/inventory.js', 'utf8');
inventoryCode = inventoryCode.replace(/\n\s*updateSummary\(\);\n/, '\n');
vm.runInThisContext(inventoryCode);

// Create sample inventory with 30 entries
inventory = Array.from({ length: 30 }, (_, i) => ({
  metal: 'Silver',
  composition: 'Silver',
  name: 'Item' + i,
  qty: 1,
  type: 'Coin',
  weight: 1,
  price: 1,
  spotPriceAtPurchase: 1,
  isCollectable: false,
  totalPremium: 0,
  purchaseLocation: '',
  storageLocation: '',
  numistaId: '',
  notes: '',
  date: '2024-01-01',
}));

// Initial render should use default 25 items per page
renderTable();
let rows = (elements.inventoryTable.innerHTML.match(/<tr>/g) || []).length;
assert.strictEqual(itemsPerPage, 25);
assert.strictEqual(rows, 25);

// Change to 50 items per page and render
itemsPerPage = 50;
renderTable();
rows = (elements.inventoryTable.innerHTML.match(/<tr>/g) || []).length;
assert.strictEqual(rows, 50);

// Filter inventory down to 5 items and ensure selection persists
inventory = inventory.slice(0, 5);
renderTable();
assert.strictEqual(itemsPerPage, 50);

console.log('items-per-page persistence test passed');


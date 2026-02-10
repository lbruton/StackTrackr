/**
 * bulkEdit.js — Bulk Edit Tool
 *
 * Full-screen modal for selecting multiple inventory items and applying
 * field changes, copying, or deleting in bulk. Integrates with Numista
 * catalog lookup to populate field values.
 *
 * Selection uses item.serial (stable unique ID) — never array indices.
 */

// =============================================================================
// MODULE STATE
// =============================================================================

let bulkSelection = new Set();     // Set of item serial strings
let bulkFieldValues = {};           // { fieldId: value } for enabled fields
let bulkEnabledFields = new Set();  // Which field checkboxes are checked
let bulkSearchTerm = '';            // Current search/filter text
let bulkSearchTimer = null;         // Debounce timer for search input

// =============================================================================
// EDITABLE FIELDS DEFINITION
// =============================================================================

const BULK_EDITABLE_FIELDS = [
  { id: 'name',             label: 'Name',              inputType: 'text' },
  { id: 'metal',            label: 'Metal',             inputType: 'select',
    options: ['Silver', 'Gold', 'Platinum', 'Palladium'] },
  { id: 'type',             label: 'Type',              inputType: 'select',
    options: ['Coin', 'Bar', 'Round', 'Note', 'Aurum', 'Set', 'Other'] },
  { id: 'qty',              label: 'Quantity',           inputType: 'number',
    attrs: { min: '1', step: '1' } },
  { id: 'weight',           label: 'Weight (oz)',        inputType: 'number',
    attrs: { min: '0', step: '0.001' } },
  { id: 'purity',           label: 'Purity',             inputType: 'select',
    options: [
      { value: '1.0',    label: 'Pure' },
      { value: '0.9999', label: '.9999 — Four Nines' },
      { value: '0.999',  label: '.999 — Fine' },
      { value: '0.925',  label: '.925 — Sterling' },
      { value: '0.900',  label: '.900 — 90% Silver' },
      { value: '0.800',  label: '.800 — 80% (European)' },
      { value: '0.600',  label: '.600 — 60%' },
      { value: '0.400',  label: '.400 — 40% Silver' },
      { value: '0.350',  label: '.350 — War Nickels' }
    ] },
  { id: 'price',            label: 'Purchase Price',     inputType: 'number',
    attrs: { min: '0', step: '0.01' } },
  { id: 'marketValue',      label: 'Market Value',       inputType: 'number',
    attrs: { min: '0', step: '0.01' } },
  { id: 'year',             label: 'Year',              inputType: 'text' },
  { id: 'grade',            label: 'Grade',             inputType: 'select',
    options: [
      '', 'MS-70', 'MS-69', 'MS-68', 'MS-67', 'MS-66', 'MS-65',
      'PF-70', 'PF-69', 'PF-68', 'PF-67', 'PF-66', 'PF-65',
      'AU-58', 'AU-55', 'XF-45', 'XF-40', 'VF-35', 'VF-30',
      'F-15', 'F-12', 'VG-10', 'VG-8', 'G-6', 'G-4', 'AG-3'
    ] },
  { id: 'gradingAuthority', label: 'Grading Auth',      inputType: 'select',
    options: ['', 'PCGS', 'NGC', 'ANACS', 'ICG', 'SGS'] },
  { id: 'certNumber',       label: 'Cert Number',       inputType: 'text' },
  { id: 'pcgsNumber',       label: 'PCGS Number',       inputType: 'text' },
  { id: 'purchaseLocation', label: 'Purchase Loc',      inputType: 'text' },
  { id: 'storageLocation',  label: 'Storage Loc',       inputType: 'text' },
  { id: 'date',             label: 'Purchase Date',     inputType: 'date' },
  { id: 'serialNumber',     label: 'Serial Number',     inputType: 'text' },
  { id: 'notes',            label: 'Notes',             inputType: 'textarea' },
  { id: 'numistaId',        label: 'Numista ID',        inputType: 'text' },
];

// =============================================================================
// OPEN / CLOSE
// =============================================================================

const openBulkEdit = () => {
  const modal = safeGetElement('bulkEditModal');
  if (!modal) return;

  // Restore persisted selection
  try {
    const saved = localStorage.getItem('bulkEditSelection');
    if (saved) {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr)) bulkSelection = new Set(arr.map(String));
    }
  } catch (e) {
    debugLog('bulkEdit: failed to restore selection', e);
  }

  // Prune selection — remove serials that no longer exist in inventory
  if (typeof inventory !== 'undefined' && Array.isArray(inventory)) {
    const validSerials = new Set(inventory.map(item => String(item.serial)));
    bulkSelection.forEach(s => {
      if (!validSerials.has(s)) bulkSelection.delete(s);
    });
  }

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  renderBulkFieldPanel();
  renderBulkTable();
  renderBulkFooter();

  // Focus search input after render
  const searchInput = safeGetElement('bulkEditSearch');
  if (searchInput) searchInput.focus();
};

const closeBulkEdit = () => {
  const modal = safeGetElement('bulkEditModal');
  if (!modal) return;

  // Persist selection
  try {
    localStorage.setItem('bulkEditSelection', JSON.stringify([...bulkSelection]));
  } catch (e) {
    debugLog('bulkEdit: failed to persist selection', e);
  }

  // Clear Numista callback
  window._bulkEditNumistaCallback = null;

  modal.style.display = 'none';
  document.body.style.overflow = '';
};

// =============================================================================
// FIELD PANEL (left side)
// =============================================================================

const renderBulkFieldPanel = () => {
  const panel = safeGetElement('bulkEditFieldPanel');
  if (!panel) return;

  // Clear existing content
  while (panel.firstChild) panel.removeChild(panel.firstChild);

  // Header
  const heading = document.createElement('h3');
  heading.textContent = 'Fields to Update';
  panel.appendChild(heading);

  const hint = document.createElement('p');
  hint.style.cssText = 'font-size:0.75rem;color:var(--text-secondary);margin:0 0 0.75rem 0;';
  hint.textContent = 'Check a field to enable it, then set the value to apply.';
  panel.appendChild(hint);

  // Build field rows
  BULK_EDITABLE_FIELDS.forEach(field => {
    const row = document.createElement('div');
    row.className = 'bulk-edit-field-row';

    // Checkbox
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = 'bulkField_' + field.id;
    cb.checked = bulkEnabledFields.has(field.id);

    // Label
    const lbl = document.createElement('label');
    lbl.setAttribute('for', 'bulkField_' + field.id);
    lbl.textContent = field.label;

    // Input
    let input;
    if (field.inputType === 'select') {
      input = document.createElement('select');
      field.options.forEach(opt => {
        const option = document.createElement('option');
        if (typeof opt === 'object' && opt !== null) {
          option.value = opt.value;
          option.textContent = opt.label;
        } else {
          option.value = opt;
          option.textContent = opt;
        }
        input.appendChild(option);
      });
    } else if (field.inputType === 'textarea') {
      input = document.createElement('textarea');
      input.rows = 2;
    } else {
      input = document.createElement('input');
      input.type = field.inputType;
      if (field.attrs) {
        Object.keys(field.attrs).forEach(k => input.setAttribute(k, field.attrs[k]));
      }
    }
    input.className = 'field-input';
    input.id = 'bulkFieldVal_' + field.id;
    input.disabled = !bulkEnabledFields.has(field.id);

    // Restore persisted value
    if (bulkFieldValues[field.id] !== undefined) {
      input.value = bulkFieldValues[field.id];
    }

    // Checkbox toggle — also re-renders footer to update Apply button disabled state
    cb.addEventListener('change', () => {
      if (cb.checked) {
        bulkEnabledFields.add(field.id);
        input.disabled = false;
        input.focus();
      } else {
        bulkEnabledFields.delete(field.id);
        input.disabled = true;
      }
      renderBulkFooter();
    });

    // Track value changes
    input.addEventListener('input', () => {
      bulkFieldValues[field.id] = input.value;
    });
    input.addEventListener('change', () => {
      bulkFieldValues[field.id] = input.value;
    });

    row.appendChild(cb);
    row.appendChild(lbl);
    row.appendChild(input);
    panel.appendChild(row);
  });

};

// =============================================================================
// ITEM TABLE (right side)
// =============================================================================

/**
 * Renders the toolbar (search, buttons, badge) — called once on open.
 * The toolbar persists across search/selection updates.
 */
const renderBulkToolbar = () => {
  const toolbar = safeGetElement('bulkEditToolbar');
  if (!toolbar) return;

  while (toolbar.firstChild) toolbar.removeChild(toolbar.firstChild);

  // Numista Lookup button (left of search)
  if (typeof catalogAPI !== 'undefined') {
    const numistaBtn = document.createElement('button');
    numistaBtn.type = 'button';
    numistaBtn.className = 'bulk-edit-numista-btn';
    numistaBtn.textContent = 'Numista Lookup';
    numistaBtn.title = 'Search Numista catalog and fill field values';
    numistaBtn.addEventListener('click', triggerBulkNumistaLookup);
    toolbar.appendChild(numistaBtn);
  }

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.id = 'bulkEditSearch';
  searchInput.placeholder = 'Search items...';
  searchInput.value = bulkSearchTerm || '';
  searchInput.addEventListener('input', () => {
    // Debounce: wait 250ms after last keystroke before filtering
    if (bulkSearchTimer) clearTimeout(bulkSearchTimer);
    bulkSearchTimer = setTimeout(() => {
      bulkSearchTerm = searchInput.value;
      renderBulkTableBody();
    }, 250);
  });
  toolbar.appendChild(searchInput);

  const selectAllBtn = document.createElement('button');
  selectAllBtn.type = 'button';
  selectAllBtn.className = 'btn btn-secondary';
  selectAllBtn.textContent = 'Select All';
  selectAllBtn.addEventListener('click', () => selectAllItems(true));
  toolbar.appendChild(selectAllBtn);

  const selectNoneBtn = document.createElement('button');
  selectNoneBtn.type = 'button';
  selectNoneBtn.className = 'btn btn-secondary';
  selectNoneBtn.textContent = 'Select None';
  selectNoneBtn.addEventListener('click', () => selectAllItems(false));
  toolbar.appendChild(selectNoneBtn);

  const badge = document.createElement('span');
  badge.className = 'bulk-edit-count-badge';
  badge.id = 'bulkEditCountBadge';
  badge.textContent = bulkSelection.size + ' selected';
  toolbar.appendChild(badge);
};

/**
 * Renders the table body (rows) — called on search, selection, and data changes.
 * Does NOT touch the toolbar, preserving search input focus.
 */
const renderBulkTableBody = () => {
  const wrap = safeGetElement('bulkEditTableWrap');
  if (!wrap) return;

  while (wrap.firstChild) wrap.removeChild(wrap.firstChild);

  if (typeof inventory === 'undefined' || !Array.isArray(inventory) || inventory.length === 0) {
    const empty = document.createElement('p');
    empty.style.cssText = 'padding:2rem;text-align:center;color:var(--text-secondary);';
    empty.textContent = 'No inventory items found.';
    wrap.appendChild(empty);
    return;
  }

  // Filter by search term
  const term = (bulkSearchTerm || '').toLowerCase().trim();
  const filtered = term
    ? inventory.filter(item =>
        (item.name || '').toLowerCase().includes(term) ||
        (item.metal || '').toLowerCase().includes(term) ||
        (item.type || '').toLowerCase().includes(term) ||
        (item.year || '').toLowerCase().includes(term) ||
        (item.storageLocation || '').toLowerCase().includes(term) ||
        (item.purchaseLocation || '').toLowerCase().includes(term) ||
        String(item.serial).includes(term)
      )
    : inventory;

  const table = document.createElement('table');
  table.className = 'bulk-edit-table';

  // Thead
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const columns = [
    { key: 'cb',     label: '' },
    { key: 'name',   label: 'Name' },
    { key: 'metal',  label: 'Metal' },
    { key: 'type',   label: 'Type' },
    { key: 'qty',    label: 'Qty' },
    { key: 'weight', label: 'Weight' },
    { key: 'year',   label: 'Year' },
    { key: 'storageLocation', label: 'Location' },
  ];

  columns.forEach(col => {
    const th = document.createElement('th');
    if (col.key === 'cb') {
      const masterCb = document.createElement('input');
      masterCb.type = 'checkbox';
      masterCb.title = 'Toggle all visible';
      masterCb.checked = filtered.length > 0 && filtered.every(item => bulkSelection.has(String(item.serial)));
      masterCb.addEventListener('change', () => selectAllItems(masterCb.checked));
      th.appendChild(masterCb);
    } else {
      th.textContent = col.label;
    }
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Tbody
  const tbody = document.createElement('tbody');
  filtered.forEach(item => {
    const serial = String(item.serial);
    const tr = document.createElement('tr');
    tr.setAttribute('data-serial', serial);
    const isSelected = bulkSelection.has(serial);
    if (isSelected) tr.classList.add('bulk-edit-selected');

    // Row click toggles selection
    tr.addEventListener('click', (e) => {
      if (e.target.type === 'checkbox') return;
      toggleItemSelection(serial);
    });

    // Checkbox cell
    const cbTd = document.createElement('td');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = isSelected;
    cb.addEventListener('change', () => toggleItemSelection(serial));
    cbTd.appendChild(cb);
    tr.appendChild(cbTd);

    // Data cells
    const addCell = (text) => {
      const td = document.createElement('td');
      td.textContent = text || '';
      td.title = text || '';
      tr.appendChild(td);
    };

    addCell(item.name);
    addCell(item.metal);
    addCell(item.type);
    addCell(item.qty != null ? String(item.qty) : '1');
    addCell(item.weight != null ? String(item.weight) : '');
    addCell(item.year);
    addCell(item.storageLocation);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);

  // Update badge count
  const badge = safeGetElement('bulkEditCountBadge');
  if (badge) badge.textContent = bulkSelection.size + ' selected';
};

/**
 * Full render — toolbar + table body. Called on open and after bulk actions.
 */
const renderBulkTable = () => {
  renderBulkToolbar();
  renderBulkTableBody();
};

// =============================================================================
// SELECTION MANAGEMENT
// =============================================================================

const toggleItemSelection = (serial) => {
  serial = String(serial);
  if (bulkSelection.has(serial)) {
    bulkSelection.delete(serial);
  } else {
    bulkSelection.add(serial);
  }
  updateBulkSelectionUI();
};

const selectAllItems = (select) => {
  const term = (bulkSearchTerm || '').toLowerCase().trim();
  const filtered = term
    ? inventory.filter(item =>
        (item.name || '').toLowerCase().includes(term) ||
        (item.metal || '').toLowerCase().includes(term) ||
        (item.type || '').toLowerCase().includes(term) ||
        (item.year || '').toLowerCase().includes(term) ||
        (item.storageLocation || '').toLowerCase().includes(term) ||
        (item.purchaseLocation || '').toLowerCase().includes(term) ||
        String(item.serial).includes(term)
      )
    : inventory;

  filtered.forEach(item => {
    const serial = String(item.serial);
    if (select) {
      bulkSelection.add(serial);
    } else {
      bulkSelection.delete(serial);
    }
  });
  updateBulkSelectionUI();
};

const updateBulkSelectionUI = () => {
  // Update count badge
  const badge = safeGetElement('bulkEditCountBadge');
  if (badge) badge.textContent = bulkSelection.size + ' selected';

  // Targeted row updates via data-serial attribute
  const wrap = safeGetElement('bulkEditTableWrap');
  if (wrap) {
    const rows = wrap.querySelectorAll('tbody tr[data-serial]');
    rows.forEach(tr => {
      const serial = tr.getAttribute('data-serial');
      const isSelected = bulkSelection.has(serial);
      const cb = tr.querySelector('input[type="checkbox"]');

      if (isSelected) {
        tr.classList.add('bulk-edit-selected');
      } else {
        tr.classList.remove('bulk-edit-selected');
      }
      if (cb) cb.checked = isSelected;
    });

    // Update master checkbox in thead
    const masterCb = wrap.querySelector('thead input[type="checkbox"]');
    if (masterCb) {
      const visibleRows = wrap.querySelectorAll('tbody tr[data-serial]');
      masterCb.checked = visibleRows.length > 0 &&
        Array.from(visibleRows).every(tr => bulkSelection.has(tr.getAttribute('data-serial')));
    }
  }

  renderBulkFooter();
};

// =============================================================================
// FOOTER (action buttons)
// =============================================================================

const renderBulkFooter = () => {
  const footer = safeGetElement('bulkEditFooter');
  if (!footer) return;

  while (footer.firstChild) footer.removeChild(footer.firstChild);

  const count = bulkSelection.size;
  const enabledCount = bulkEnabledFields.size;

  // Apply Changes button
  const applyBtn = document.createElement('button');
  applyBtn.type = 'button';
  applyBtn.className = 'btn btn-primary';
  applyBtn.textContent = 'Apply Changes' + (count ? ' (' + count + ')' : '');
  applyBtn.disabled = count === 0 || enabledCount === 0;
  applyBtn.title = count === 0 ? 'Select items first' : enabledCount === 0 ? 'Enable at least one field' : '';
  applyBtn.addEventListener('click', applyBulkEdit);
  footer.appendChild(applyBtn);

  // Copy Selected button
  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'btn btn-secondary';
  copyBtn.textContent = 'Copy Selected' + (count ? ' (' + count + ')' : '');
  copyBtn.disabled = count === 0;
  copyBtn.addEventListener('click', copySelectedItems);
  footer.appendChild(copyBtn);

  // Delete Selected button (danger, pushed right)
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn btn-danger';
  deleteBtn.textContent = 'Delete Selected' + (count ? ' (' + count + ')' : '');
  deleteBtn.disabled = count === 0;
  deleteBtn.addEventListener('click', deleteSelectedItems);
  footer.appendChild(deleteBtn);
};

// =============================================================================
// BULK ACTIONS
// =============================================================================

const applyBulkEdit = () => {
  const count = bulkSelection.size;
  const enabledCount = bulkEnabledFields.size;
  if (count === 0 || enabledCount === 0) return;

  // Collect current field values from inputs
  const valuesToApply = {};
  bulkEnabledFields.forEach(fieldId => {
    const input = safeGetElement('bulkFieldVal_' + fieldId);
    if (input) valuesToApply[fieldId] = input.value;
  });

  const fieldNames = [...bulkEnabledFields].map(id => {
    const def = BULK_EDITABLE_FIELDS.find(f => f.id === id);
    return def ? def.label : id;
  }).join(', ');

  if (!confirm('Apply ' + enabledCount + ' field(s) (' + fieldNames + ') to ' + count + ' item(s)?')) {
    return;
  }

  let updated = 0;
  inventory.forEach(item => {
    if (!bulkSelection.has(String(item.serial))) return;

    // Snapshot old item for change logging
    const oldItem = Object.assign({}, item);

    // Apply each enabled field
    Object.keys(valuesToApply).forEach(fieldId => {
      let val = valuesToApply[fieldId];

      // Coerce numeric fields
      if (fieldId === 'qty') {
        val = parseInt(val, 10);
        if (isNaN(val) || val < 1) val = 1;
      } else if (fieldId === 'weight' || fieldId === 'price' || fieldId === 'marketValue') {
        val = parseFloat(val);
        if (isNaN(val) || val < 0) val = 0;
      } else if (fieldId === 'purity') {
        val = parseFloat(val);
        if (isNaN(val) || val <= 0 || val > 1) val = 1.0;
      }

      item[fieldId] = val;
    });

    // Log changes for undo support
    if (typeof logItemChanges === 'function') {
      logItemChanges(oldItem, item);
    }

    updated++;
  });

  // Persist and re-render
  if (typeof saveInventory === 'function') saveInventory();
  if (typeof renderTable === 'function') renderTable();
  if (typeof renderActiveFilters === 'function') renderActiveFilters();

  alert('Updated ' + updated + ' item(s).');

  // Refresh bulk table to reflect changes
  renderBulkTable();
  renderBulkFooter();
};

const copySelectedItems = () => {
  const count = bulkSelection.size;
  if (count === 0) return;

  if (!confirm('Copy ' + count + ' item(s)? New copies will be added to your inventory.')) {
    return;
  }

  let copied = 0;
  const serialsToProcess = [...bulkSelection];

  serialsToProcess.forEach(serial => {
    const item = inventory.find(i => String(i.serial) === serial);
    if (!item) return;

    // Deep clone
    const clone = JSON.parse(JSON.stringify(item));
    clone.serial = getNextSerial();
    clone.uuid = generateUUID();

    inventory.push(clone);

    // Log the copy
    if (typeof logChange === 'function') {
      logChange(clone.name, 'Copied', 'from serial ' + serial, 'new serial ' + clone.serial, inventory.length - 1);
    }

    copied++;
  });

  if (typeof saveInventory === 'function') saveInventory();
  if (typeof renderTable === 'function') renderTable();

  alert('Copied ' + copied + ' item(s).');

  renderBulkTable();
  renderBulkFooter();
};

const deleteSelectedItems = () => {
  const count = bulkSelection.size;
  if (count === 0) return;

  if (!confirm('Delete ' + count + ' item(s)? You can undo deletions from the Change Log.')) {
    return;
  }

  // Collect indices to delete (sorted descending to avoid splice shift issues)
  const indicesToDelete = [];
  inventory.forEach((item, idx) => {
    if (bulkSelection.has(String(item.serial))) {
      indicesToDelete.push(idx);
    }
  });
  indicesToDelete.sort((a, b) => b - a);

  indicesToDelete.forEach(idx => {
    const item = inventory[idx];
    if (typeof logChange === 'function') {
      logChange(item.name, 'Deleted', JSON.stringify(item), '', idx);
    }
    inventory.splice(idx, 1);
  });

  // Clear deleted serials from selection
  indicesToDelete.forEach(() => {
    // Already spliced — remove from selection by checking what's left
  });
  const remaining = new Set(inventory.map(i => String(i.serial)));
  bulkSelection.forEach(s => {
    if (!remaining.has(s)) bulkSelection.delete(s);
  });

  if (typeof saveInventory === 'function') saveInventory();
  if (typeof renderTable === 'function') renderTable();
  if (typeof renderActiveFilters === 'function') renderActiveFilters();

  alert('Deleted ' + indicesToDelete.length + ' item(s).');

  renderBulkTable();
  renderBulkFooter();
};

// =============================================================================
// NUMISTA INTEGRATION
// =============================================================================

const triggerBulkNumistaLookup = () => {
  if (!catalogAPI || !catalogAPI.activeProvider) {
    alert('Configure Numista API key in Settings first.');
    return;
  }

  // Set our callback — fillFormFromNumistaResult checks this before normal form fill
  window._bulkEditNumistaCallback = receiveBulkNumistaResult;

  // Prompt user for search query
  const query = prompt('Enter a coin name or Numista N# to search:');
  if (!query || !query.trim()) {
    window._bulkEditNumistaCallback = null;
    return;
  }

  // Perform search
  const trimmed = query.trim();
  const isDirectLookup = /^N?\d+$/i.test(trimmed);

  (async () => {
    try {
      let results;
      if (isDirectLookup) {
        const result = await catalogAPI.lookupItem(trimmed);
        results = result ? [result] : [];
        if (typeof showNumistaResults === 'function') {
          showNumistaResults(results, true, trimmed);
        }
      } else {
        results = await catalogAPI.searchItems(trimmed, { limit: 20 });
        if (typeof showNumistaResults === 'function') {
          showNumistaResults(results, false, trimmed);
        }
      }
    } catch (error) {
      console.error('Bulk Numista search error:', error);
      alert('Numista search failed: ' + error.message);
      window._bulkEditNumistaCallback = null;
    }
  })();
};

const receiveBulkNumistaResult = (fieldMap) => {
  if (!fieldMap || typeof fieldMap !== 'object') return;

  // Populate bulk edit field inputs and enable them
  Object.keys(fieldMap).forEach(fieldId => {
    const fieldDef = BULK_EDITABLE_FIELDS.find(f => f.id === fieldId);
    if (!fieldDef) return;

    const input = safeGetElement('bulkFieldVal_' + fieldId);
    const cb = safeGetElement('bulkField_' + fieldId);
    if (!input) return;

    input.value = fieldMap[fieldId];
    input.disabled = false;
    bulkFieldValues[fieldId] = fieldMap[fieldId];
    bulkEnabledFields.add(fieldId);

    if (cb) cb.checked = true;
  });

  // Update footer to reflect newly enabled fields
  renderBulkFooter();

  // Clear the callback
  window._bulkEditNumistaCallback = null;
};

// =============================================================================
// WINDOW EXPORTS
// =============================================================================

window.openBulkEdit = openBulkEdit;
window.closeBulkEdit = closeBulkEdit;

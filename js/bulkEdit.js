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
// SEARCH FILTER HELPER
// =============================================================================

const getFilteredItems = (term) => {
  if (typeof inventory === 'undefined' || !Array.isArray(inventory)) return [];
  const t = (term || '').toLowerCase().trim();
  if (!t) return inventory.slice();
  return inventory.filter(item =>
    (item.name || '').toLowerCase().includes(t) ||
    (item.metal || '').toLowerCase().includes(t) ||
    (item.type || '').toLowerCase().includes(t) ||
    (item.year || '').toLowerCase().includes(t) ||
    (item.storageLocation || '').toLowerCase().includes(t) ||
    (item.purchaseLocation || '').toLowerCase().includes(t) ||
    String(item.serial).includes(t)
  );
};

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
  { id: 'weight',           label: 'Weight',             inputType: 'number',
    attrs: { min: '0', step: '0.001' } },
  { id: 'weightUnit',       label: 'Weight Unit',        inputType: 'select',
    options: [
      { value: 'oz', label: 'ounce' },
      { value: 'g',  label: 'gram' },
      { value: 'gb', label: 'goldback' }
    ] },
  { id: 'purity',           label: 'Purity',             inputType: 'select',
    options: [
      { value: '1.0',    label: '100% — Pure' },
      { value: '0.9999', label: '.9999 — Four Nines' },
      { value: '0.9995', label: '.9995 — Pure Platinum' },
      { value: '0.999',  label: '.999 — Fine' },
      { value: '0.925',  label: '.925 — Sterling' },
      { value: '0.900',  label: '.900 — 90% Silver' },
      { value: '0.800',  label: '.800 — 80% (European)' },
      { value: '0.600',  label: '.600 — 60%' },
      { value: '0.400',  label: '.400 — 40% Silver' },
      { value: '0.350',  label: '.350 — War Nickels' },
      { value: 'custom', label: 'Custom…' }
    ] },
  { id: 'price',            label: 'Purchase Price',     inputType: 'number',
    attrs: { min: '0', step: '0.01' } },
  { id: 'marketValue',      label: 'Market Value',       inputType: 'number',
    attrs: { min: '0', step: '0.01' } },
  { id: 'year',             label: 'Year',              inputType: 'text' },
  { id: 'grade',            label: 'Grade',             inputType: 'select',
    options: [
      { value: '', label: '-- None --' },
      { value: 'AG', label: 'AG - About Good' },
      { value: 'G', label: 'G - Good' },
      { value: 'VG', label: 'VG - Very Good' },
      { value: 'F', label: 'F - Fine' },
      { value: 'VF', label: 'VF - Very Fine' },
      { value: 'XF', label: 'XF - Extremely Fine' },
      { value: 'AU', label: 'AU - About Uncirculated' },
      { value: 'UNC', label: 'UNC - Uncirculated' },
      { value: 'BU', label: 'BU - Brilliant Uncirculated' },
      { value: 'MS-60', label: 'MS-60' },
      { value: 'MS-61', label: 'MS-61' },
      { value: 'MS-62', label: 'MS-62' },
      { value: 'MS-63', label: 'MS-63' },
      { value: 'MS-64', label: 'MS-64' },
      { value: 'MS-65', label: 'MS-65' },
      { value: 'MS-66', label: 'MS-66' },
      { value: 'MS-67', label: 'MS-67' },
      { value: 'MS-68', label: 'MS-68' },
      { value: 'MS-69', label: 'MS-69' },
      { value: 'MS-70', label: 'MS-70' },
      { value: 'PF-60', label: 'PF-60' },
      { value: 'PF-61', label: 'PF-61' },
      { value: 'PF-62', label: 'PF-62' },
      { value: 'PF-63', label: 'PF-63' },
      { value: 'PF-64', label: 'PF-64' },
      { value: 'PF-65', label: 'PF-65' },
      { value: 'PF-66', label: 'PF-66' },
      { value: 'PF-67', label: 'PF-67' },
      { value: 'PF-68', label: 'PF-68' },
      { value: 'PF-69', label: 'PF-69' },
      { value: 'PF-70', label: 'PF-70' }
    ] },
  { id: 'gradingAuthority', label: 'Grading Auth',      inputType: 'select',
    options: [
      { value: '', label: '-- None --' },
      { value: 'PCGS', label: 'PCGS' },
      { value: 'NGC', label: 'NGC' },
      { value: 'ANACS', label: 'ANACS' },
      { value: 'ICG', label: 'ICG' }
    ] },
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

  // Always start with a clean selection (STACK-55)
  bulkSelection = new Set();

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

  // Clear Numista callback
  window._bulkEditNumistaCallback = null;

  modal.style.display = 'none';
  document.body.style.overflow = '';
};

// =============================================================================
// HELPER FACTORIES
// =============================================================================

/**
 * Creates the appropriate input element for a bulk edit field definition.
 * @param {Object} field - Field definition from BULK_EDITABLE_FIELDS
 * @returns {HTMLElement} The input/select/textarea element
 */
const createFieldInput = (field) => {
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
  return input;
};

/** Coercion rules: fieldId → (rawValue) => coerced value */
const FIELD_COERCIONS = {
  qty:         (v) => { const n = parseInt(v, 10);  return (isNaN(n) || n < 1)            ? 1   : n; },
  weight:      (v) => { const n = parseFloat(v);    return (isNaN(n) || n < 0)            ? 0   : n; },
  price:       (v) => { const n = parseFloat(v);    return (isNaN(n) || n < 0)            ? 0   : n; },
  marketValue: (v) => { const n = parseFloat(v);    return (isNaN(n) || n < 0)            ? 0   : n; },
  purity:      (v) => { const n = parseFloat(v);    return (isNaN(n) || n <= 0 || n > 1)  ? 1.0 : n; },
};

/**
 * Coerces a bulk edit field value to the correct type based on field ID.
 * @param {string} fieldId - The field identifier
 * @param {string} value - The raw string value from the input
 * @returns {*} The coerced value
 */
const coerceFieldValue = (fieldId, value) => {
  const coerce = FIELD_COERCIONS[fieldId];
  return coerce ? coerce(value) : value;
};

/**
 * Builds a table row element for a single inventory item in the bulk edit table.
 * @param {Object} item - The inventory item
 * @param {boolean} isPinned - Whether the row is in the pinned section
 * @returns {HTMLTableRowElement} The constructed row
 */
const buildBulkItemRow = (item, isPinned) => {
  const serial = String(item.serial);
  const tr = document.createElement('tr');
  tr.setAttribute('data-serial', serial);
  const isSelected = bulkSelection.has(serial);
  if (isSelected) tr.classList.add('bulk-edit-selected');
  if (isPinned) tr.classList.add('bulk-edit-pinned');

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
  addCell(item.weight != null ? (typeof formatWeight === 'function' ? formatWeight(item.weight, item.weightUnit) : String(item.weight)) : '');
  addCell(item.year);
  addCell(item.storageLocation);

  return tr;
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
    const input = createFieldInput(field);
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

  // Wire up denomination picker swap for weight field (mirrors main modal)
  const bwInput = safeGetElement('bulkFieldVal_weight');
  const bwUnitSelect = safeGetElement('bulkFieldVal_weightUnit');
  const bwLabel = panel.querySelector('label[for="bulkField_weight"]');
  const bwCheckbox = safeGetElement('bulkField_weight');

  if (bwInput && bwUnitSelect && typeof GOLDBACK_DENOMINATIONS !== 'undefined') {
    // Build hidden denomination select
    const denomSelect = document.createElement('select');
    denomSelect.className = 'field-input';
    denomSelect.id = 'bulkFieldVal_weightDenom';
    denomSelect.style.display = 'none';
    denomSelect.disabled = bwInput.disabled;

    GOLDBACK_DENOMINATIONS.forEach(d => {
      const opt = document.createElement('option');
      opt.value = String(d.weight);
      opt.textContent = d.label;
      denomSelect.appendChild(opt);
    });

    // Insert right after weight input in the same row
    bwInput.parentNode.insertBefore(denomSelect, bwInput.nextSibling);

    // Restore persisted value
    if (bulkFieldValues['weight'] !== undefined) {
      denomSelect.value = String(bulkFieldValues['weight']);
    }

    // Track denomination changes → update weight field value
    denomSelect.addEventListener('change', () => {
      bulkFieldValues['weight'] = denomSelect.value;
    });

    // Swap function
    const toggleBulkGbPicker = () => {
      const isGb = bwUnitSelect.value === 'gb';
      bwInput.style.display = isGb ? 'none' : '';
      denomSelect.style.display = isGb ? '' : 'none';
      if (bwLabel) bwLabel.textContent = isGb ? 'Denomination' : 'Weight';
      if (isGb) {
        denomSelect.disabled = bwInput.disabled;
        bulkFieldValues['weight'] = denomSelect.value;
      }
    };

    // Listen for unit changes
    bwUnitSelect.addEventListener('change', toggleBulkGbPicker);

    // Sync disabled state when weight checkbox toggles
    if (bwCheckbox) {
      bwCheckbox.addEventListener('change', () => {
        denomSelect.disabled = !bwCheckbox.checked;
      });
    }

    // Initialize state (e.g. if weightUnit was persisted as 'gb')
    if (bulkFieldValues['weightUnit'] === 'gb') {
      bwUnitSelect.value = 'gb';
      toggleBulkGbPicker();
    }
  }

  // Wire up custom purity input behavior (matches inventory modal pattern)
  const puritySelect = safeGetElement('bulkFieldVal_purity');
  const purityCheckbox = safeGetElement('bulkField_purity');
  if (puritySelect) {
    const purityCustomInput = document.createElement('input');
    purityCustomInput.type = 'number';
    purityCustomInput.id = 'bulkFieldVal_purityCustom';
    purityCustomInput.className = 'field-input';
    purityCustomInput.min = '0.001';
    purityCustomInput.max = '1';
    purityCustomInput.step = '0.0001';
    purityCustomInput.placeholder = 'e.g. 0.9995';
    purityCustomInput.setAttribute('aria-label', 'Custom purity');
    purityCustomInput.style.display = 'none';
    purityCustomInput.disabled = puritySelect.disabled;
    puritySelect.parentNode.insertBefore(purityCustomInput, puritySelect.nextSibling);

    const optionValues = new Set(Array.from(puritySelect.options).map(option => option.value));
    const savedPurity = bulkFieldValues.purity;
    if (savedPurity !== undefined) {
      const savedPurityStr = String(savedPurity);
      if (optionValues.has(savedPurityStr) && savedPurityStr !== 'custom') {
        puritySelect.value = savedPurityStr;
      } else {
        puritySelect.value = 'custom';
        purityCustomInput.value = savedPurityStr;
      }
    }

    const syncPurityState = () => {
      const isCustom = puritySelect.value === 'custom';
      purityCustomInput.style.display = isCustom ? '' : 'none';
      purityCustomInput.disabled = puritySelect.disabled || !isCustom;
      if (isCustom) {
        bulkFieldValues.purity = purityCustomInput.value;
      } else {
        bulkFieldValues.purity = puritySelect.value;
      }
    };

    puritySelect.addEventListener('change', syncPurityState);
    purityCustomInput.addEventListener('input', () => {
      bulkFieldValues.purity = purityCustomInput.value;
    });
    purityCustomInput.addEventListener('change', () => {
      bulkFieldValues.purity = purityCustomInput.value;
    });

    if (purityCheckbox) {
      purityCheckbox.addEventListener('change', () => {
        syncPurityState();
      });
    }

    syncPurityState();
  }

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
  const filtered = getFilteredItems(bulkSearchTerm);
  const term = (bulkSearchTerm || '').toLowerCase().trim();

  // Compute pinned items — selected items NOT in search results (only when search active)
  let pinnedItems = [];
  if (term) {
    const filteredSerials = new Set(filtered.map(i => String(i.serial)));
    pinnedItems = inventory.filter(item =>
      bulkSelection.has(String(item.serial)) && !filteredSerials.has(String(item.serial))
    );
  }

  const table = document.createElement('table');
  table.className = 'bulk-edit-table';

  // Column definitions
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
  const colCount = columns.length;

  // Master checkbox state (based on filtered items only, excludes pinned)
  const allFilteredSelected = filtered.length > 0 &&
    filtered.every(item => bulkSelection.has(String(item.serial)));
  const someFilteredSelected = !allFilteredSelected &&
    filtered.some(item => bulkSelection.has(String(item.serial)));

  // Thead
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  columns.forEach(col => {
    const th = document.createElement('th');
    if (col.key === 'cb') {
      const masterCb = document.createElement('input');
      masterCb.type = 'checkbox';
      masterCb.title = 'Toggle all visible';
      masterCb.checked = allFilteredSelected;
      masterCb.indeterminate = someFilteredSelected;
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

  // Pinned section (selected items not matching current search)
  if (pinnedItems.length > 0) {
    // Section header
    const headerTr = document.createElement('tr');
    headerTr.className = 'bulk-edit-pinned-header';
    const headerTd = document.createElement('td');
    headerTd.colSpan = colCount;
    headerTd.textContent = 'Pinned selections (' + pinnedItems.length + ')';
    headerTr.appendChild(headerTd);
    tbody.appendChild(headerTr);

    // Pinned rows
    pinnedItems.forEach(item => {
      tbody.appendChild(buildBulkItemRow(item, true));
    });

    // Divider
    const divTr = document.createElement('tr');
    divTr.className = 'bulk-edit-pinned-divider';
    const divTd = document.createElement('td');
    divTd.colSpan = colCount;
    divTr.appendChild(divTd);
    tbody.appendChild(divTr);
  }

  // Filtered rows
  filtered.forEach(item => {
    tbody.appendChild(buildBulkItemRow(item, false));
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
  // When search is active, pinned rows appear/disappear — full re-render needed
  const term = (bulkSearchTerm || '').toLowerCase().trim();
  if (term) {
    renderBulkTableBody();
  } else {
    updateBulkSelectionUI();
  }
};

const selectAllItems = (select) => {
  const filtered = getFilteredItems(bulkSearchTerm);

  if (select) {
    // Select All: add only filtered (search-matched) items
    filtered.forEach(item => bulkSelection.add(String(item.serial)));
  } else {
    // Deselect All: clear everything including pinned
    bulkSelection.clear();
  }
  renderBulkTableBody();
  renderBulkFooter();
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

    // Update master checkbox — exclude pinned rows from the calculation
    const masterCb = wrap.querySelector('thead input[type="checkbox"]');
    if (masterCb) {
      const filteredRows = wrap.querySelectorAll('tbody tr[data-serial]:not(.bulk-edit-pinned)');
      const allSelected = filteredRows.length > 0 &&
        Array.from(filteredRows).every(tr => bulkSelection.has(tr.getAttribute('data-serial')));
      const someSelected = !allSelected &&
        Array.from(filteredRows).some(tr => bulkSelection.has(tr.getAttribute('data-serial')));
      masterCb.checked = allSelected;
      masterCb.indeterminate = someSelected;
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

  if (bulkEnabledFields.has('purity') && valuesToApply.purity === 'custom') {
    const purityCustomInput = safeGetElement('bulkFieldVal_purityCustom');
    const rawPurity = purityCustomInput ? purityCustomInput.value.trim() : '';
    const numericPurity = Number(rawPurity);

    if (!rawPurity || !Number.isFinite(numericPurity) || numericPurity < 0.001 || numericPurity > 1) {
      alert('Please enter a custom purity between 0.001 and 1 before applying bulk changes.');
      return;
    }

    // Keep the original string; coercion logic will normalize as needed.
    valuesToApply.purity = rawPurity;
  }

  // When gb denomination mode is active, read weight from the denomination picker
  // (the hidden number input has stale/empty value).
  // Check both: explicit weightUnit in apply set, OR denomination picker visibly active.
  if (bulkEnabledFields.has('weight')) {
    const denomSelect = safeGetElement('bulkFieldVal_weightDenom');
    const unitSelect = safeGetElement('bulkFieldVal_weightUnit');
    const isGbMode = (valuesToApply['weightUnit'] === 'gb') ||
                     (unitSelect && unitSelect.value === 'gb');
    if (isGbMode && denomSelect && denomSelect.style.display !== 'none') {
      valuesToApply['weight'] = denomSelect.value;
    }
  }

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
      item[fieldId] = coerceFieldValue(fieldId, valuesToApply[fieldId]);
    });

    // Log changes for undo support
    if (typeof logItemChanges === 'function') {
      logItemChanges(oldItem, item);
    }

    updated++;
  });

  // Record price data points for bulk-edited items with price-related changes (STACK-43)
  if (typeof recordItemPrice === 'function') {
    const priceFields = ['price', 'marketValue', 'weight', 'weightUnit', 'qty', 'metal', 'purity'];
    if ([...bulkEnabledFields].some(id => priceFields.includes(id))) {
      inventory.forEach(item => {
        if (bulkSelection.has(String(item.serial))) recordItemPrice(item, 'bulk');
      });
      saveItemPriceHistory();
    }
  }

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

    // Record initial price data point for the copy (STACK-43)
    if (typeof recordSingleItemPrice === 'function') {
      recordSingleItemPrice(clone, 'add');
    }

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

    if (fieldId === 'purity' && input.tagName === 'SELECT') {
      const optionExists = Array.from(input.options).some(option => option.value === String(fieldMap[fieldId]));
      input.value = optionExists ? String(fieldMap[fieldId]) : 'custom';
      const purityCustomInput = safeGetElement('bulkFieldVal_purityCustom');
      if (purityCustomInput && !optionExists) {
        purityCustomInput.value = String(fieldMap[fieldId]);
      }
      // Enable field and check checkbox before dispatching change event
      // so syncPurityState() sees the correct disabled state
      input.disabled = false;
      bulkFieldValues[fieldId] = fieldMap[fieldId];
      bulkEnabledFields.add(fieldId);
      if (cb) cb.checked = true;
      input.dispatchEvent(new Event('change'));
    } else {
      input.value = fieldMap[fieldId];
      input.disabled = false;
      bulkFieldValues[fieldId] = fieldMap[fieldId];
      bulkEnabledFields.add(fieldId);
      if (cb) cb.checked = true;
    }
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

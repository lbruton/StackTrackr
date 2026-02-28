/**
 * clone-picker.js — Clone Picker Modal (STAK-375)
 *
 * Provides a modal UI for cloning inventory items with field-level control.
 * Users can toggle which fields to carry over, edit values inline, and
 * create multiple clones in a single session ("Save & Clone Another").
 *
 * Public API (exposed on window):
 *   showClonePicker(inventoryIndex)  — open the picker for an item
 *   closeClonePicker()               — close the picker, re-render if dirty
 *
 * @file js/clone-picker.js
 */
'use strict';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Field definitions for the clone picker.
 * Grouped into four categories, ordered by typical editing frequency.
 * @type {Array<{key:string, label:string, group:string, inputType:string, defaultOn:boolean}>}
 */
const CLONE_FIELDS = [
  // Variant Fields (top group — most commonly changed)
  { key: 'year',              label: 'Year',              group: 'variant',  inputType: 'text',   defaultOn: true  },
  { key: 'serialNumber',      label: 'Serial Number',     group: 'variant',  inputType: 'text',   defaultOn: false },
  { key: 'price',             label: 'Purchase Price',    group: 'variant',  inputType: 'number', defaultOn: true  },
  { key: 'qty',               label: 'Quantity',          group: 'variant',  inputType: 'number', defaultOn: true  },
  { key: 'date',              label: 'Purchase Date',     group: 'variant',  inputType: 'date',   defaultOn: true  },
  { key: 'notes',             label: 'Notes',             group: 'variant',  inputType: 'text',   defaultOn: false },

  // Identity Fields
  { key: 'name',              label: 'Name',              group: 'identity', inputType: 'text',   defaultOn: true  },
  { key: 'type',              label: 'Type',              group: 'identity', inputType: 'select', defaultOn: true  },
  { key: 'metal',             label: 'Metal',             group: 'identity', inputType: 'select', defaultOn: true  },
  { key: 'weight',            label: 'Weight',            group: 'identity', inputType: 'number', defaultOn: true  },
  { key: 'weightUnit',        label: 'Weight Unit',       group: 'identity', inputType: 'select', defaultOn: true  },
  { key: 'purity',            label: 'Purity',            group: 'identity', inputType: 'text',   defaultOn: true  },
  { key: 'numistaId',         label: 'Catalog N#',        group: 'identity', inputType: 'text',   defaultOn: true  },

  // Grading Fields
  { key: 'grade',             label: 'Grade',             group: 'grading',  inputType: 'text',   defaultOn: true  },
  { key: 'gradingAuthority',  label: 'Grading Authority', group: 'grading',  inputType: 'select', defaultOn: true  },
  { key: 'certNumber',        label: 'Cert Number',       group: 'grading',  inputType: 'text',   defaultOn: false },
  { key: 'pcgsNumber',        label: 'PCGS Number',       group: 'grading',  inputType: 'text',   defaultOn: false },

  // Location Fields
  { key: 'purchaseLocation',  label: 'Purchase Location', group: 'location', inputType: 'text',   defaultOn: true  },
  { key: 'storageLocation',   label: 'Storage Location',  group: 'location', inputType: 'select', defaultOn: true  },
];

/**
 * Human-friendly group headings displayed above each field section.
 * @type {Object<string, string>}
 */
const CLONE_GROUP_LABELS = {
  variant:  'Variant Fields',
  identity: 'Identity',
  grading:  'Grading',
  location: 'Location',
};

/**
 * Maps CLONE_FIELDS keys with inputType 'select' to their main-form element IDs.
 * Used to clone <option> lists into the picker's <select> elements.
 * @type {Object<string, string>}
 */
const CLONE_SELECT_SOURCE_MAP = {
  type:             'itemType',
  metal:            'itemMetal',
  weightUnit:       'itemWeightUnit',
  gradingAuthority: 'itemGradingAuthority',
  storageLocation:  'storageLocation',
};

// ---------------------------------------------------------------------------
// Module-scoped state (not global)
// ---------------------------------------------------------------------------

/** @type {Object|null} Deep-cloned source item for the current session */
let cloneSourceItem = null;

/** @type {number|null} Inventory index of the source item */
let cloneSourceIndex = null;

/** @type {number} Number of clones created in the current modal session */
let cloneSessionCount = 0;

/** @type {boolean} Whether any clones were created (triggers renderTable on close) */
let cloneDirty = false;

/** @type {boolean} Whether one-time event listeners have been attached */
let cloneListenersInitialized = false;

// ---------------------------------------------------------------------------
// Helpers — escaping & DOM
// ---------------------------------------------------------------------------

/**
 * HTML-escape a string for safe innerHTML insertion.
 * Prefers escapeHtmlCatalog (catalog-api.js), falls back to sanitizeHtml (utils.js).
 * @param {string} str
 * @returns {string}
 */
const cloneEscape = (str) => {
  if (typeof escapeHtmlCatalog === 'function') return escapeHtmlCatalog(str);
  if (typeof sanitizeHtml === 'function') return sanitizeHtml(str);
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Read <option> elements from a main-form <select> by its DOM ID.
 * Returns an array of {value, text} objects.
 * Falls back to an empty array if the source element is missing or not a <select>.
 * @param {string} sourceId - DOM ID of the main-form select element
 * @returns {Array<{value:string, text:string}>}
 */
const readSelectOptions = (sourceId) => {
  const el = safeGetElement(sourceId);
  if (!el || el.tagName !== 'SELECT') return [];
  return Array.from(el.options).map(o => ({ value: o.value, text: o.text }));
};

// ---------------------------------------------------------------------------
// Rendering — Preview
// ---------------------------------------------------------------------------

/**
 * Render the source-item preview card (name, year, metal, weight + images).
 * Images are loaded asynchronously from the image cache and injected after
 * the initial render to avoid blocking the modal open.
 *
 * @param {Object} item - The deep-cloned source item
 * @returns {string} HTML string for the preview section
 */
const renderClonePreview = (item) => {
  const name = cloneEscape(item.name || 'Untitled');
  const metaParts = [
    item.year,
    item.metal,
    item.weight ? item.weight + ' ' + (item.weightUnit || 'oz') : '',
  ].filter(Boolean);
  const meta = cloneEscape(metaParts.join(' \u00B7 '));

  // Placeholder while async images load
  const placeholder = '<div class="clone-picker-img-placeholder"></div>';

  return '' +
    '<div class="clone-picker-preview-images" id="clonePickerPreviewImages">' +
      placeholder +
    '</div>' +
    '<div class="clone-picker-preview-info">' +
      '<div class="clone-picker-preview-name">' + name + '</div>' +
      '<div class="clone-picker-preview-meta">' + meta + '</div>' +
    '</div>';
};

/**
 * Asynchronously load images for the preview card from the image cache.
 * Called after the modal is visible so the container already exists.
 * @param {Object} item - The source item (needs uuid for cache lookup)
 */
const loadClonePreviewImages = async (item) => {
  if (!item || !item.uuid) return;
  if (!window.imageCache || typeof imageCache.resolveImageUrlForItem !== 'function') return;

  const container = safeGetElement('clonePickerPreviewImages');
  if (!container) return;

  try {
    const obverseUrl = await imageCache.resolveImageUrlForItem(item, 'obverse');
    const reverseUrl = await imageCache.resolveImageUrlForItem(item, 'reverse');

    if (obverseUrl || reverseUrl) {
      let html = '';
      if (obverseUrl) {
        html += '<img src="' + cloneEscape(obverseUrl) + '" alt="Obverse" class="clone-picker-preview-img">';
      }
      if (reverseUrl) {
        html += '<img src="' + cloneEscape(reverseUrl) + '" alt="Reverse" class="clone-picker-preview-img">';
      }
      container.innerHTML = html;
    }
  } catch (err) {
    // Silently fail — the placeholder remains
  }
};

// ---------------------------------------------------------------------------
// Rendering — Field Groups
// ---------------------------------------------------------------------------

/**
 * Build a <select> element's innerHTML from the main form's option list.
 * If the source element is not a <select> (e.g. storageLocation is an <input>),
 * returns null so the caller can fall back to a text input.
 *
 * @param {string} fieldKey - CLONE_FIELDS key
 * @param {string} currentValue - The item's current value for this field
 * @returns {string|null} HTML string for a <select>, or null to fall back
 */
const buildSelectHtml = (fieldKey, currentValue) => {
  const sourceId = CLONE_SELECT_SOURCE_MAP[fieldKey];
  if (!sourceId) return null;

  const options = readSelectOptions(sourceId);
  if (options.length === 0) return null;

  const safeVal = String(currentValue || '');
  let optionsHtml = '';
  let hasMatch = false;

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const selected = (opt.value === safeVal) ? ' selected' : '';
    if (opt.value === safeVal) hasMatch = true;
    optionsHtml += '<option value="' + cloneEscape(opt.value) + '"' + selected + '>' +
      cloneEscape(opt.text) + '</option>';
  }

  // If the item's value isn't in the option list, prepend it so it's not lost
  if (safeVal && !hasMatch) {
    optionsHtml = '<option value="' + cloneEscape(safeVal) + '" selected>' +
      cloneEscape(safeVal) + '</option>' + optionsHtml;
  }

  return '<select id="cloneField_' + cloneEscape(fieldKey) + '" class="clone-picker-field-input">' +
    optionsHtml + '</select>';
};

/**
 * Render all field groups (Variant, Identity, Grading, Location) with
 * checkboxes, labels, and editable inputs for each field.
 *
 * @param {Object} item - The deep-cloned source item
 * @returns {string} HTML string for the fields container
 */
const renderCloneFieldGroups = (item) => {
  // Group fields by their group property, preserving CLONE_FIELDS order
  const grouped = {};
  const groupOrder = [];

  for (let i = 0; i < CLONE_FIELDS.length; i++) {
    const f = CLONE_FIELDS[i];
    if (!grouped[f.group]) {
      grouped[f.group] = [];
      groupOrder.push(f.group);
    }
    grouped[f.group].push(f);
  }

  let html = '';

  for (let g = 0; g < groupOrder.length; g++) {
    const groupKey = groupOrder[g];
    const fields = grouped[groupKey];
    const heading = CLONE_GROUP_LABELS[groupKey] || groupKey;

    html += '<div class="clone-picker-field-group">';
    html += '<div class="clone-picker-group-heading">' + cloneEscape(heading) + '</div>';
    html += '<div class="clone-picker-grid">';

    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      const rawValue = (item[f.key] !== undefined && item[f.key] !== null)
        ? String(item[f.key])
        : '';
      const hasValue = rawValue !== '';

      // Determine checked state: checked if has value OR defaultOn is true
      // Exception: if no value AND defaultOn is false, unchecked
      const isChecked = hasValue || f.defaultOn;
      const isDisabled = !isChecked;

      // Build the input element
      let inputHtml = '';

      if (f.inputType === 'select') {
        // Attempt to render a <select> from the main form's options
        const selectHtml = buildSelectHtml(f.key, rawValue);
        if (selectHtml) {
          // Inject disabled attribute if needed
          if (isDisabled) {
            inputHtml = selectHtml.replace('<select ', '<select disabled ');
          } else {
            inputHtml = selectHtml;
          }
        } else {
          // Fallback to text input when source is not a <select>
          inputHtml = '<input type="text" id="cloneField_' + cloneEscape(f.key) + '" ' +
            'class="clone-picker-field-input" ' +
            'value="' + cloneEscape(rawValue) + '"' +
            (isDisabled ? ' disabled' : '') + '>';
        }
      } else {
        inputHtml = '<input type="' + cloneEscape(f.inputType) + '" ' +
          'id="cloneField_' + cloneEscape(f.key) + '" ' +
          'class="clone-picker-field-input" ' +
          'value="' + cloneEscape(rawValue) + '"' +
          (isDisabled ? ' disabled' : '') + '>';
      }

      html += '<div class="clone-picker-field-row">';
      html += '<input type="checkbox" class="clone-picker-field-cb" ' +
        'data-field-key="' + cloneEscape(f.key) + '"' +
        (isChecked ? ' checked' : '') + '>';
      html += '<label class="clone-picker-field-label">' + cloneEscape(f.label) + '</label>';
      html += inputHtml;
      html += '</div>';
    }

    html += '</div>'; // .clone-picker-grid
    html += '</div>'; // .clone-picker-field-group
  }

  return html;
};

// ---------------------------------------------------------------------------
// Clone creation
// ---------------------------------------------------------------------------

/**
 * Create a clone from the current picker state.
 * Reads checked fields, applies values, assigns new serial/uuid,
 * pushes to inventory, and records price/log data.
 */
const createCloneFromPicker = () => {
  if (!cloneSourceItem) return;

  // Deep clone the source
  const clone = JSON.parse(JSON.stringify(cloneSourceItem));

  // Iterate fields: apply checked values, clear unchecked
  for (let i = 0; i < CLONE_FIELDS.length; i++) {
    const f = CLONE_FIELDS[i];
    const cb = document.querySelector(
      '#clonePickerFields .clone-picker-field-cb[data-field-key="' + f.key + '"]'
    );
    const input = safeGetElement('cloneField_' + f.key);

    if (cb && cb.checked) {
      let val = input ? input.value : '';

      // Type conversions for numeric fields
      if (f.key === 'price' || f.key === 'weight') {
        val = parseFloat(val) || 0;
      } else if (f.key === 'qty') {
        val = parseInt(val, 10) || 1;
      }

      clone[f.key] = val;
    } else {
      // Unchecked fields get cleared
      clone[f.key] = '';
    }
  }

  // Assign unique identifiers
  if (typeof getNextSerial === 'function') {
    clone.serial = getNextSerial();
  }
  if (typeof generateUUID === 'function') {
    clone.uuid = generateUUID();
  }

  // Clear the item-level serial (itemSerial is the display/cert serial, not the internal ID)
  clone.itemSerial = '';

  // Push into inventory
  if (typeof inventory !== 'undefined' && Array.isArray(inventory)) {
    inventory.push(clone);
  }

  // Record price data point for the new clone
  if (typeof recordSingleItemPrice === 'function') {
    recordSingleItemPrice(clone, 'add');
  }

  // Log the clone operation
  if (typeof logChange === 'function') {
    logChange(
      clone.name,
      'Cloned',
      'from ' + (cloneSourceItem.name || 'item'),
      'serial ' + clone.serial,
      (typeof inventory !== 'undefined' ? inventory.length - 1 : 0)
    );
  }

  // Copy tags from source to new clone
  if (typeof getItemTags === 'function' && typeof setItemTags === 'function' && cloneSourceItem.uuid) {
    const sourceTags = getItemTags(cloneSourceItem.uuid);
    if (sourceTags && sourceTags.length > 0) {
      setItemTags(clone.uuid, sourceTags);
    }
  }

  // Persist
  if (typeof saveInventory === 'function') {
    saveInventory();
  }

  // Update session state
  cloneSessionCount++;
  cloneDirty = true;

  // Update counter display
  const countEl = safeGetElement('clonePickerCount');
  if (countEl) {
    const label = cloneSessionCount === 1 ? '1 item cloned' : cloneSessionCount + ' items cloned';
    countEl.textContent = label;
    countEl.style.display = '';
  }

  // Do NOT call renderTable() here — deferred to closeClonePicker
};

// ---------------------------------------------------------------------------
// Public API — show / close
// ---------------------------------------------------------------------------

/**
 * Open the clone picker modal for the given inventory item.
 * Closes the item modal first, deep-clones the source item, renders the
 * preview and field groups, and attaches event listeners (once).
 *
 * @param {number} inventoryIndex - Index in the global inventory array
 */
function showClonePicker(inventoryIndex) {
  if (typeof inventory === 'undefined' || !inventory[inventoryIndex]) return;

  // Close the item modal first
  const itemModal = safeGetElement('itemModal');
  if (itemModal) itemModal.style.display = 'none';

  // Also close the view modal if open
  const viewModal = safeGetElement('viewModal');
  if (viewModal) viewModal.style.display = 'none';

  // Deep-clone the source item (snapshot — edits in picker don't affect original)
  cloneSourceItem = JSON.parse(JSON.stringify(inventory[inventoryIndex]));
  cloneSourceIndex = inventoryIndex;
  cloneSessionCount = 0;
  cloneDirty = false;

  // Render preview
  const previewEl = safeGetElement('clonePickerPreview');
  if (previewEl) {
    previewEl.innerHTML = renderClonePreview(cloneSourceItem);
  }

  // Render field groups
  const fieldsEl = safeGetElement('clonePickerFields');
  if (fieldsEl) {
    fieldsEl.innerHTML = renderCloneFieldGroups(cloneSourceItem);
  }

  // Reset counter display (hidden initially)
  const countEl = safeGetElement('clonePickerCount');
  if (countEl) {
    countEl.textContent = '';
    countEl.style.display = 'none';
  }

  // Update title
  const titleEl = safeGetElement('clonePickerTitle');
  if (titleEl) {
    titleEl.textContent = 'Clone Item';
  }

  // Show modal
  const modal = safeGetElement('clonePickerModal');
  if (modal) {
    modal.style.display = 'flex';
  }

  // Attach listeners once
  if (!cloneListenersInitialized) {
    initClonePickerListeners();
  }

  // Load preview images asynchronously (non-blocking)
  loadClonePreviewImages(cloneSourceItem);
}

/**
 * Close the clone picker modal.
 * If any clones were created during the session, triggers a single
 * renderTable() call to update the inventory display.
 */
function closeClonePicker() {
  const modal = safeGetElement('clonePickerModal');
  if (modal) {
    modal.style.display = 'none';
  }

  // Re-render table once if any clones were created
  if (cloneDirty) {
    if (typeof renderTable === 'function') {
      renderTable();
    }
  }

  // Clear state
  cloneSourceItem = null;
  cloneSourceIndex = null;
}

// ---------------------------------------------------------------------------
// Event listeners (one-time setup)
// ---------------------------------------------------------------------------

/**
 * Attach all event listeners for the clone picker modal.
 * Called once on first showClonePicker() invocation.
 * Uses event delegation on the fields container for checkbox toggles.
 */
const initClonePickerListeners = () => {
  cloneListenersInitialized = true;

  // Close button (X)
  const closeBtn = safeGetElement('clonePickerCloseBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => { closeClonePicker(); });
  }

  // Cancel button
  const cancelBtn = safeGetElement('clonePickerCancelBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => { closeClonePicker(); });
  }

  // Overlay click (click on modal backdrop)
  const modal = safeGetElement('clonePickerModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeClonePicker();
      }
    });
  }

  // ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const m = safeGetElement('clonePickerModal');
      if (m && m.style.display !== 'none' && m.style.display !== '') {
        closeClonePicker();
      }
    }
  });

  // Save & Clone Another
  const saveAnotherBtn = safeGetElement('clonePickerSaveAnotherBtn');
  if (saveAnotherBtn) {
    saveAnotherBtn.addEventListener('click', () => {
      createCloneFromPicker();
    });
  }

  // Save & Close
  const saveCloseBtn = safeGetElement('clonePickerSaveCloseBtn');
  if (saveCloseBtn) {
    saveCloseBtn.addEventListener('click', () => {
      createCloneFromPicker();
      closeClonePicker();
    });
  }

  // Checkbox delegation on fields container — toggle input disabled state
  const fieldsContainer = safeGetElement('clonePickerFields');
  if (fieldsContainer) {
    fieldsContainer.addEventListener('change', (e) => {
      if (!e.target.classList.contains('clone-picker-field-cb')) return;

      const fieldKey = e.target.getAttribute('data-field-key');
      if (!fieldKey) return;

      const input = safeGetElement('cloneField_' + fieldKey);
      if (input) {
        input.disabled = !e.target.checked;
      }
    });
  }
};

// ---------------------------------------------------------------------------
// Window exports
// ---------------------------------------------------------------------------

window.showClonePicker = showClonePicker;
window.closeClonePicker = closeClonePicker;

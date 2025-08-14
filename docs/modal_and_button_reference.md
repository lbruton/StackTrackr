# StackTrackr Modals & Button Functionality Reference

## Overview
This document details every modal and button in StackTrackr, including their purpose, UI structure, and the JavaScript functions that power them. Use this as a guide for maintenance, debugging, or feature extension.

---

## Modals

### 1. Details Modal
- **Purpose:** Shows full details for a selected inventory item.
- **HTML:** `<div id="detailsModal">` (flex container, themed)
- **Key Elements:**
  - Item breakdown table
  - Metadata chips
  - Close button (`.close-btn`)
- **Scripts:**
  - `js/detailsModal.js`: Modal open/close, data population
  - `js/inventory.js`: Triggers modal on row click
- **Functions:**
  - `openDetailsModal(itemId)`
  - `closeDetailsModal()`
  - `populateDetailsModal(item)`

### 2. Edit Modal
- **Purpose:** Allows editing of an inventory item.
- **HTML:** `<div id="editModal">`
- **Key Elements:**
  - Editable form fields for all item properties
  - Save and cancel buttons
- **Scripts:**
  - `js/inventory.js`: Modal open/close, form population, save logic
  - `js/events.js`: Handles button clicks
- **Functions:**
  - `openEditModal(itemId)`
  - `closeEditModal()`
  - `saveEdit(itemId)`

### 3. Add Item Modal
- **Purpose:** Adds a new inventory item.
- **HTML:** `<div id="addItemModal">`
- **Key Elements:**
  - Blank form fields
  - Save and cancel buttons
- **Scripts:**
  - `js/inventory.js`: Modal open/close, form population, save logic
  - `js/events.js`: Handles button clicks
- **Functions:**
  - `openAddItemModal()`
  - `closeAddItemModal()`
  - `saveNewItem()`

### 4. Import Modal
- **Purpose:** Imports inventory from CSV.
- **HTML:** `<div id="importModal">`
- **Key Elements:**
  - File input
  - Import and cancel buttons
- **Scripts:**
  - `js/inventory.js`: Modal open/close, import logic
  - `js/events.js`: Handles button clicks
- **Functions:**
  - `openImportModal()`
  - `closeImportModal()`
  - `importCsv(file)`

### 5. Export Modal
- **Purpose:** Exports inventory to CSV.
- **HTML:** `<div id="exportModal">`
- **Key Elements:**
  - Export button
  - Cancel button
- **Scripts:**
  - `js/inventory.js`: Modal open/close, export logic
  - `js/events.js`: Handles button clicks
- **Functions:**
  - `openExportModal()`
  - `closeExportModal()`
  - `exportCsv()`

### 6. Delete Confirmation Modal
- **Purpose:** Confirms deletion of an item.
- **HTML:** `<div id="deleteModal">`
- **Key Elements:**
  - Confirmation message
  - Confirm and cancel buttons
- **Scripts:**
  - `js/inventory.js`: Modal open/close, delete logic
  - `js/events.js`: Handles button clicks
- **Functions:**
  - `openDeleteModal(itemId)`
  - `closeDeleteModal()`
  - `deleteItem(itemId)`

---

## Buttons & Their Functions

### Inventory Table Row Buttons
- **Edit Button (`.edit-btn`):** Opens edit modal for item
  - Function: `openEditModal(itemId)`
- **Delete Button (`.delete-btn`):** Opens delete confirmation modal
  - Function: `openDeleteModal(itemId)`
- **Details Button (`.details-btn`):** Opens details modal
  - Function: `openDetailsModal(itemId)`

### Main UI Buttons
- **Add Item Button (`#addItemBtn`):** Opens add item modal
  - Function: `openAddItemModal()`
- **Import Button (`#importBtn`):** Opens import modal
  - Function: `openImportModal()`
- **Export Button (`#exportBtn`):** Opens export modal
  - Function: `openExportModal()`

### Modal Action Buttons
- **Save Button:** Saves changes or new item
  - Functions: `saveEdit(itemId)`, `saveNewItem()`
- **Cancel Button:** Closes current modal
  - Functions: `closeEditModal()`, `closeAddItemModal()`, etc.
- **Confirm Delete Button:** Deletes item
  - Function: `deleteItem(itemId)`
- **Import Button:** Imports CSV
  - Function: `importCsv(file)`
- **Export Button:** Exports CSV
  - Function: `exportCsv()`
- **Close Button:** Closes modal
  - Functions: `closeDetailsModal()`, etc.

---

## CSS & UI Notes
- All modals use flexbox for centering and responsive layout.
- Buttons use `.action-btn`, `.edit-btn`, `.delete-btn`, `.details-btn` classes for styling.
- Modals are themed (dark/light/sepia) via CSS variables.
- `document.body.style.overflow = 'hidden'` is set when modals are open to prevent background scrolling.
- Charts in modals are cleaned up with ResizeObserver to avoid memory leaks.

---

## References
- Modal logic: `js/detailsModal.js`, `js/inventory.js`, `js/events.js`
- Button event handling: `js/events.js`, `js/inventory.js`
- Modal styles: `css/styles.css`

---

## For Future Agents
- Reference this document before adding or modifying modals/buttons.
- Always test modal open/close, button actions, and UI responsiveness.
- Validate that modals do not break table or main layout.

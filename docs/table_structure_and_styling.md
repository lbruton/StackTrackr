# StackTrackr Table Structure & Styling Reference

## Overview
This document details the table structure, related scripts, dependencies, and CSS concerns for StackTrackr inventory tables. It is designed to prevent future agents from inadvertently breaking table layout or row rendering.

---

## Table Structure

### HTML
- Tables are rendered in the main inventory view (`index.html` and related modals).
- Table uses `<table>`, `<thead>`, `<tbody>`, and `<tr>`/`<td>` for rows and cells.
- Each row represents an inventory item; columns include: Metal, Name, Qty, Type, Weight, Price, Purchase Location, Storage Location, Notes, Date, Collectable, Actions.
- Table rows may include action buttons (edit, delete, details) and chips for metadata.
- Modals (details, edit) use similar table structures for item breakdowns.

### Dynamic Rendering
- Table rows are generated dynamically via JavaScript:
  - Main logic in `js/inventory.js` (rendering, updating, filtering)
  - Event handling in `js/events.js` (row clicks, actions)
  - Sorting/filtering in `js/sorting.js`, `js/filters.js`, `js/search.js`
  - Pagination in `js/pagination.js`
  - Chip rendering in `js/catalog-manager.js`, `js/autocomplete.js`
  - Chart integration in `js/charts.js` (summary rows)

---

## Scripts & Dependencies

### Core Scripts
- `js/inventory.js`: Table rendering, row updates, CRUD operations
- `js/events.js`: Event delegation for table actions
- `js/sorting.js`: Sorts table columns
- `js/filters.js`: Applies filters to table rows
- `js/search.js`: Search logic for table
- `js/pagination.js`: Handles page navigation for large inventories
- `js/detailsModal.js`: Modal table rendering
- `js/catalog-manager.js`: Metadata chips, autocomplete
- `js/charts.js`: Chart.js integration for summary rows

### External Dependencies
- **Chart.js**: Used for summary visualizations, not for table layout
- **No jQuery**: Pure vanilla JS for DOM manipulation
- **No external table/grid libraries**: All table logic is custom

---

## CSS Concerns

### Table Styling
- Main styles in `css/styles.css`:
  - `.inventory-table`, `.inventory-table th`, `.inventory-table td`: Core table styles
  - `.table-row`, `.table-cell`: Row/cell classes for custom styling
  - `.chip`, `.chip-metal`, `.chip-type`: Metadata chips
  - `.action-btn`, `.edit-btn`, `.delete-btn`: Action buttons
  - `.modal-table`: Table styles for modals
- Responsive design: Uses media queries for mobile/tablet layouts
- Themed styling: Dark, light, sepia themes via CSS variables and theme classes
- Flexbox is used for modal layouts, but **not** for main table rows (to avoid row breakage)

### Common Pitfalls
- **Do NOT use `display: flex` or `display: grid` on `<tr>` or `<td>` elements**: This will break row alignment and cell rendering in all browsers.
- Avoid setting fixed heights/widths on table rows/cells unless absolutely necessary.
- Chips and action buttons should use inline-block or flex **inside** `<td>`, not on `<tr>`.
- Always use `border-collapse: collapse` for table borders.
- Do not override table row/cell display properties globally.
- Theme changes should only affect colors, not layout or spacing.
- Modal tables may use flex for container, but not for actual table rows/cells.

### Row Breakage Causes
- Setting `display: flex` or `grid` on `<tr>` or `<td>`
- Overriding `vertical-align` or `text-align` globally
- Applying padding/margin to `<tr>` instead of `<td>`
- Using absolute positioning inside table rows
- Unintended overflow/scroll on table container

---

## Testing & Validation
- Always test table rendering in all three themes (dark, light, sepia)
- Validate on mobile and desktop browsers
- Check for row/cell alignment after any CSS change
- Use sample inventories with chips, action buttons, and long text fields

---

## References
- Table rendering: `js/inventory.js`, `js/detailsModal.js`
- Table styles: `css/styles.css`
- Event handling: `js/events.js`
- Chip rendering: `js/catalog-manager.js`, `js/autocomplete.js`
- Chart integration: `js/charts.js`

---

## For Future Agents
- Never apply flex/grid to table rows/cells
- Always validate table after CSS changes
- Reference this document before modifying table structure or styles
- If unsure, test with large inventories and all themes

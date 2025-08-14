# Table Preservation Guide

## Overview
The inventory table is the core component of the StackTrackr application. It displays critical information about inventory items, including their type, metal, purchase location, storage location, and Numista ID. This document outlines all dependencies, steps, and best practices to ensure the table's layout and design are preserved.

## Dependencies

### HTML Structure
- **File**: `index.html`
- **Key Elements**:
  - `<table id="inventoryTable">`: The main table element.
  - `<thead>`: Contains column headers.
  - `<tbody>`: Dynamically populated with inventory data.
  - `<td>`: Individual cells for data display.

### CSS Styling
- **File**: `css/styles.css`
- **Key Classes**:
  - `.responsive-table`: Applies general table styles.
  - `.icon-col`: Styles for columns with icons.
  - `.hidden`: Used for columns that are conditionally hidden.
  - `.hover-effect`: Adds hover effects for rows.

### JavaScript Functionality
- **File**: `js/inventory.js`
- **Key Functions**:
  - `renderTable()`: Dynamically populates the table with inventory data.
  - `formatPurchaseLocation()`: Formats purchase location data.
  - `formatStorageLocation()`: Formats storage location data.
  - `openNumistaModal()`: Handles Numista modal functionality.

### External Libraries
- **Chart.js**: Used for visualizations linked to table data.
- **PapaParse**: Handles CSV import/export.

## Steps to Preserve Layout and Design

### 1. Maintain HTML Structure
- Ensure the `<table>` element and its child elements (`<thead>`, `<tbody>`, `<td>`) remain intact.
- Avoid removing or renaming `id` attributes (e.g., `inventoryTable`).
- Test changes to ensure all columns are correctly rendered.

### 2. Preserve CSS Styling
- Do not remove or modify `.responsive-table`, `.icon-col`, `.hidden`, or `.hover-effect` classes.
- Test all themes (dark, light, sepia) to ensure compatibility.
- Validate responsive design on mobile and desktop.

### 3. Validate JavaScript Functions
- Ensure `renderTable()` is functional and correctly populates the table.
- Test `formatPurchaseLocation()` and `formatStorageLocation()` for consistent formatting.
- Verify `openNumistaModal()` works as expected.
- Avoid breaking dependencies between functions.

### 4. Test External Libraries
- Validate Chart.js visualizations linked to table data.
- Test CSV import/export functionality using PapaParse.

### 5. File:// Compatibility
- Ensure all assets (e.g., SVGs, CSS, JS) are accessible under the `file://` protocol.
- Avoid using Fetch API for local files.

## Best Practices

### Development
- Use relative paths for assets.
- Test changes in all supported themes and screen sizes.
- Validate functionality under `file://` protocol.

### Testing
- Run tests for table rendering, data formatting, and modal functionality.
- Use sample data to verify table layout and design.
- Check for console errors and warnings.

### Documentation
- Update this guide with any new dependencies or changes.
- Include detailed descriptions of new features or fixes.

## Checklist
- [ ] HTML structure intact.
- [ ] CSS classes preserved.
- [ ] JavaScript functions validated.
- [ ] External libraries tested.
- [ ] File:// compatibility ensured.
- [ ] Responsive design verified.

## Conclusion
The inventory table is a critical component of StackTrackr. Following the steps and best practices outlined in this guide will ensure its layout and design are preserved, preventing future issues and maintaining the application's core functionality.

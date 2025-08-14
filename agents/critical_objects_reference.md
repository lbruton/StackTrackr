# Critical Objects and Load Order Reference

This document provides a comprehensive reference for all critical global objects, functions, variables, and constants within the StackrTrackr application. Understanding the purpose and load order of these components is essential to prevent common issues like `SyntaxError: Can't create duplicate variable` and `ReferenceError: ... is not defined`.

**Golden Rule:** Any object listed here should be considered a singleton. It must be declared only once in its specified "File of Declaration" and should not be redeclared in any other file. Scripts must be loaded in the correct order in `index.html` to ensure dependencies are met.

## I. Core Constants

These constants are defined in `js/constants.js` and are fundamental to the application's configuration. This file must be loaded before any other script that uses these constants.

| Name | Type | File of Declaration | Key Usage Files | Description & Potential Issues |
| --- | --- | --- | --- | --- |
| `API_PROVIDERS` | Constant (Object) | `js/constants.js` | `js/api.js` | Defines all API provider configurations. Must not be redeclared. |
| `METALS` | Constant (Object) | `js/constants.js` | `js/init.js`, `js/inventory.js`, `js/spot.js` | Central registry for all metal-related information. Used to dynamically build UI and logic. |
| `APP_VERSION` | Constant (String) | `js/constants.js` | `js/init.js`, `js/changeLog.js` | Application version string. |
| `LS_KEY` | Constant (String) | `js/constants.js` | `js/inventory.js` | **CRITICAL**: The primary localStorage key for the inventory. Duplicating this `const` will break the entire application. |
| `SPOT_HISTORY_KEY`| Constant (String) | `js/constants.js` | `js/spot.js` | localStorage key for spot price history. |
| `API_KEY_STORAGE_KEY`| Constant (String) | `js/constants.js` | `js/api.js` | localStorage key for API configurations. |
| `THEME_KEY` | Constant (String) | `js/constants.js` | `js/theme.js` | localStorage key for the current UI theme. |
| `ALLOWED_STORAGE_KEYS`| Constant (Array) | `js/constants.js` | `js/utils.js` | A list of all valid localStorage keys, used for cleanup operations. |
| `featureFlags` | Constant (Object) | `js/constants.js` | Various | Global instance of the `FeatureFlags` class. |

## II. Global State Variables

These variables, defined in `js/state.js`, hold the application's runtime state. They are declared with `let` and are intended to be modified. They should not be redeclared in other files.

| Name | Type | File of Declaration | Key Usage Files | Description & Potential Issues |
| --- | --- | --- | --- | --- |
| `inventory` | Global Variable (Array) | `js/state.js` | `js/inventory.js`, `js/search.js`, `js/sorting.js` | **CRITICAL**: The main array holding all user inventory items. Redeclaring it will cause data loss and syntax errors. |
| `spotPrices` | Global Variable (Object) | `js/state.js` | `js/spot.js`, `js/api.js`, `js/inventory.js` | Holds the current spot prices for each metal. |
| `elements` | Global Variable (Object) | `js/state.js` | `js/init.js`, `js/events.js` | A cache of all critical DOM elements. It is populated in `init.js`. Accessing a property before `init.js` runs will yield `null`. |
| `sortColumn`, `sortDirection` | Global Variable | `js/state.js` | `js/sorting.js`, `js/inventory.js` | Tracks the current table sorting state. |
| `currentPage`, `itemsPerPage` | Global Variable | `js/state.js` | `js/pagination.js`, `js/inventory.js` | Manages the state for table pagination. |
| `searchQuery`, `columnFilters` | Global Variable | `js/state.js` | `js/search.js`, `js/filters.js` | Holds the current state of user search and filter inputs. |
| `chartInstances` | Global Variable (Object) | `js/state.js` | `js/charts.js` | Stores Chart.js instances for proper destruction and recreation. |

## III. Core Global Functions

These functions are defined in their respective modules and are often attached to the `window` object to be accessible globally. They form the core API of the application's frontend.

| Name | Type | File of Declaration | Key Usage Files | Description & Potential Issues |
| --- | --- | --- | --- | --- |
| `loadData`, `saveData` | Global Function | `js/utils.js` | `js/inventory.js`, `js/spot.js`, `js/api.js` | **CRITICAL**: Wrappers for `localStorage.getItem` and `localStorage.setItem` with JSON parsing. Duplicating these will lead to data corruption. |
| `loadInventory`, `saveInventory` | Global Function | `js/inventory.js` | `js/init.js`, `js/events.js` | Core functions for loading and saving the main inventory data. Must be available before `init.js` calls them. |
| `renderTable` | Global Function | `js/inventory.js` | `js/init.js`, `js/events.js`, `js/search.js` | **CRITICAL**: The main rendering function for the inventory table. Called whenever data or filters change. |
| `fetchSpotPrice` | Global Function | `js/api.js` | `js/init.js`, `js/events.js` | Initiates the process of fetching metal spot prices from the selected API. |
| `setupEventListeners` | Global Function | `js/events.js` | `js/init.js` | Sets up all major event listeners. Must be called late in the initialization process after all elements are available. |
| `sanitizeHtml` | Global Function | `js/utils.js` | Various | Utility to prevent XSS by sanitizing text for HTML display. |
| `formatCurrency` | Global Function | `js/utils.js` | Various | Utility for formatting numbers into currency strings. |
| `importCsv`, `exportCsv` | Global Function | `js/inventory.js` | `js/events.js` | Functions to handle CSV import and export logic. Must be exposed globally for event listeners. |
| `importJson`, `exportJson` | Global Function | `js/inventory.js` | `js/events.js` | Functions to handle JSON import and export logic. |

## IV. DOM Element Objects (`elements` object properties)

These are properties of the global `elements` object, which is populated in `js/init.js`. Attempting to access these before the `DOMContentLoaded` event has fired and `init.js` has run will result in errors.

| Name | Type | File of Declaration | Key Usage Files | Description & Potential Issues |
| --- | --- | --- | --- | --- |
| `elements.inventoryForm` | DOM Object | `js/init.js` | `js/events.js` | The main form for adding new items. |
| `elements.inventoryTable` | DOM Object | `js/init.js` | `js/inventory.js` | The `<tbody>` of the main inventory table where rows are rendered. |
| `elements.editModal` | DOM Object | `js/init.js` | `js/detailsModal.js`, `js/events.js` | The modal dialog for editing an existing item. |
| `elements.filesModal` | DOM Object | `js/init.js` | `js/detailsModal.js`, `js/events.js` | The modal dialog for file import/export operations. |
| `elements.searchInput` | DOM Object | `js/init.js` | `js/events.js`, `js/search.js` | The main search input field. |
| `elements.spotPriceDisplay[metal]`| DOM Object | `js/init.js` | `js/spot.js` | The display elements for spot prices (e.g., `elements.spotPriceDisplay.silver`). |
| `elements.totals[metal][prop]`| DOM Object | `js/init.js` | `js/inventory.js` | The display elements for all calculated totals (e.g., `elements.totals.all.value`). |

## V. Script Loading Order

The order of `<script>` tags in `index.html` is critical for the application to function correctly. The general principle is that scripts with no dependencies come first, and scripts that depend on others come later.

1.  **Libraries (`PapaParse`, `JSZip`, etc.)**: Must be loaded first as other scripts depend on them.
2.  **`js/constants.js`**: Defines fundamental constants. Must be loaded very early.
3.  **`js/state.js`**: Declares core state variables. Must be loaded before any script that accesses `inventory`, `spotPrices`, or `elements`.
4.  **`js/utils.js`**: Provides utility functions used by many other modules.
5.  **Component Modules (`js/inventory.js`, `js/api.js`, `js/spot.js`, `js/theme.js`, etc.)**: These contain the bulk of the application logic. Their internal order is less critical as long as they are loaded before `events.js` and `init.js`.
6.  **`js/events.js`**: Sets up event listeners. It requires that all functions it calls (e.g., `exportCsv`) and all DOM elements it references are already loaded and defined.
7.  **`js/init.js`**: **MUST BE THE LAST SCRIPT TO LOAD.** This script orchestrates the application startup. It populates the `elements` object and calls initialization functions from other modules. Running it too early will cause cascading failures.

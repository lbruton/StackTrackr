# StackTrackr JavaScript Module Reference

This document provides detailed descriptions of every JavaScript file in the `/js` directory, including their purpose, main functions, and key interactions.

---

## about.js
- **Purpose:** Displays application information, version, and credits.
- **Main Functions:** Renders about modal, fetches version from `constants.js`.
- **Interactions:** Used by UI to show app details.

## api.js
- **Purpose:** Handles spot price API integrations and provider abstraction.
- **Main Functions:**
  - `fetchSpotPrice(metal, provider)`: Gets spot price for a metal from selected provider.
  - Caching and error handling for API responses.
- **Interactions:** Used by `inventory.js` and `state.js` for price updates.

## autocomplete.js
- **Purpose:** Provides autocomplete for metadata fields (metal, type, vendor, etc.).
- **Main Functions:**
  - `setupAutocomplete(element, options)`: Initializes autocomplete on input fields.
- **Interactions:** Used in modals and forms for user input.

## catalog-manager.js
- **Purpose:** Manages catalog metadata, chips, and provider lookups.
- **Main Functions:**
  - `renderChips(item)`: Renders metadata chips for inventory items.
  - Handles catalog provider integration.
- **Interactions:** Used by `inventory.js` and modals.

## catalog-providers.js
- **Purpose:** Defines catalog provider configurations and endpoints.
- **Main Functions:**
  - Provider definitions for Numista, custom catalogs, etc.
- **Interactions:** Used by `catalog-manager.js` and import logic.

## changeLog.js
- **Purpose:** Displays application changelog and release notes.
- **Main Functions:** Renders changelog modal, fetches data from markdown files.
- **Interactions:** Used by UI for version history.

## charts.js
- **Purpose:** Integrates Chart.js for data visualizations.
- **Main Functions:**
  - `renderSummaryChart(data)`: Renders summary charts for inventory.
  - Handles chart cleanup and resizing.
- **Interactions:** Used by `inventory.js` and modals.

## constants.js
- **Purpose:** Centralizes configuration, feature flags, and API provider definitions.
- **Main Functions:**
  - Defines all constants, feature flags, and provider endpoints.
- **Interactions:** Imported by all modules needing config or API info.

## customMapping.js
- **Purpose:** Handles custom field mapping for CSV import/export.
- **Main Functions:**
  - Maps user-defined fields to internal schema.
- **Interactions:** Used by `inventory.js` during import/export.

## debug-log.js
- **Purpose:** Provides debug logging utilities.
- **Main Functions:**
  - `logDebug(message)`: Logs debug messages to console or UI.
- **Interactions:** Used throughout codebase for diagnostics.

## detailsModal.js
- **Purpose:** Manages the details modal for inventory items.
- **Main Functions:**
  - `openDetailsModal(itemId)`, `closeDetailsModal()`, `populateDetailsModal(item)`
- **Interactions:** Used by `inventory.js` and UI event handlers.

## events.js
- **Purpose:** Centralized event handling for UI actions.
- **Main Functions:**
  - Delegates click, input, and modal events.
  - Registers event listeners for buttons and table actions.
- **Interactions:** Used by all UI modules.

## file-protocol-fix.js
- **Purpose:** Fixes file protocol issues for module imports when running via `file://`.
- **Main Functions:**
  - Adjusts import paths for browser compatibility.
- **Interactions:** Used during initialization and testing.

## filters.js
- **Purpose:** Applies filters to inventory table rows.
- **Main Functions:**
  - `applyFilters(filters)`: Filters items by metal, type, vendor, etc.
- **Interactions:** Used by `inventory.js` and UI filter controls.

## fuzzy-search.js
- **Purpose:** Implements fuzzy search for inventory items.
- **Main Functions:**
  - `fuzzySearch(query, items)`: Returns best matches for search query.
- **Interactions:** Used by `search.js` and inventory table.

## init.js
- **Purpose:** Bootstraps application and initializes DOM elements.
- **Main Functions:**
  - Initializes `state.js` elements, sets up event listeners, loads inventory.
- **Interactions:** Entry point for app startup.

## inventory.js
- **Purpose:** Core inventory CRUD operations, import/export, summary calculations.
- **Main Functions:**
  - `addItem(item)`, `editItem(itemId, changes)`, `deleteItem(itemId)`
  - `importCsv(file)`, `exportCsv()`
  - `updateSummary()`, `calculateTotals()`
- **Interactions:** Central module for inventory management.

## numista-modal.js
- **Purpose:** Handles Numista-specific modal and metadata integration.
- **Main Functions:**
  - Displays Numista item details and links.
- **Interactions:** Used by `catalog-manager.js` and modals.

## pagination.js
- **Purpose:** Manages pagination for large inventories.
- **Main Functions:**
  - `setupPagination(items)`, `goToPage(pageNumber)`
- **Interactions:** Used by `inventory.js` and table rendering.

## search.js
- **Purpose:** Implements search logic for inventory table.
- **Main Functions:**
  - `searchItems(query)`: Returns matching items.
- **Interactions:** Used by UI search bar and table.

## sorting.js
- **Purpose:** Sorts inventory table columns.
- **Main Functions:**
  - `sortTable(column, direction)`: Sorts items by column.
- **Interactions:** Used by table headers and UI controls.

## spot.js
- **Purpose:** Handles spot price updates and caching.
- **Main Functions:**
  - `updateSpotPrices()`, `cacheSpotPrices()`
- **Interactions:** Used by `api.js`, `inventory.js`, and summary calculations.

## state.js
- **Purpose:** Manages global state and cached DOM elements.
- **Main Functions:**
  - `elements`: Object caching all key DOM elements.
  - `state`: Global app state (inventory, filters, etc.)
- **Interactions:** Used by all modules for state and element access.

## theme.js
- **Purpose:** Manages theme switching (dark, light, sepia).
- **Main Functions:**
  - `setTheme(theme)`, `toggleTheme()`
- **Interactions:** Used by UI theme controls and CSS variables.

## utils.js
- **Purpose:** Utility functions for sanitization, conversion, and helpers.
- **Main Functions:**
  - `stripNonAlphanumeric(str)`, `cleanString(str)`, `gramsToOzt(grams)`, `oztToGrams(ozt)`
- **Interactions:** Used throughout codebase for data cleaning and conversion.

## versionCheck.js
- **Purpose:** Checks for app version and update notifications.
- **Main Functions:**
  - Compares current version to remote/latest.
- **Interactions:** Used by `about.js` and UI notifications.

---

## For Future Agents
- Reference this document before editing or extending any JS module.
- Check for dependencies and interactions to avoid breaking features.
- Validate changes against the module's documented purpose and functions.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StackrTrackr is a client-side web application for tracking precious metals investments (silver, gold, platinum, palladium). The application is built with vanilla HTML/CSS/JavaScript and stores all data locally using localStorage - no backend server required.

**Critical Compatibility Note**: The app must work when opened via `file://` protocol. The `index.html` contains a relaxed Content Security Policy specifically to support this - do not tighten it without thorough testing.

## Development Commands

This project does not use a build system or package.json. To work with the codebase:

1. **Testing**: Run tests via HTML files in `agents/tests/` - open them directly in a browser
2. **Development**: Open `index.html` directly in a browser (works with `file://` protocol)
3. **Version Management**: Update `APP_VERSION` in `js/constants.js` - it propagates automatically throughout the app

## Architecture Overview

### Core Structure
- **Single Page Application**: Everything runs from `index.html` with modular JavaScript
- **Module System**: JavaScript is split into focused modules that communicate through global `elements` object and shared state
- **DOM-First Design**: Heavy reliance on DOM manipulation rather than virtual DOM patterns
- **localStorage Integration**: All persistence handled through localStorage with specific key patterns

### Key Modules & Responsibilities

**Initialization & State**
- `js/init.js`: Application bootstrap, DOM element mapping, event listener setup
- `js/constants.js`: Global configuration, metal definitions, API providers, feature flags
- `js/state.js`: Application state management
- `js/utils.js`: Shared utility functions

**Data Management** 
- `js/inventory.js`: Core CRUD operations for inventory items, table rendering
- `js/import-export.js` + `js/import-export-helpers.js`: CSV/JSON/PDF import/export functionality
- `js/data-processor.js`: Data transformation and validation
- `js/catalog-manager.js`: External catalog integration (Numista, etc.)

**User Interface**
- `js/search.js` + `js/filters.js` + `js/fuzzy-search.js`: Search and filtering pipeline
- `js/sorting.js` + `js/pagination.js`: Table interaction and navigation
- `js/charts.js`: Chart.js integration for data visualization
- `js/detailsModal.js`: Breakdown modal for detailed analytics
- `js/theme.js`: Multi-theme support (dark/light/sepia/system)

**External Integration**
- `js/api.js`: Spot price API integration with multiple providers
- `js/spot.js`: Spot price management and display
- `js/catalog-providers.js`: External catalog data sources

### Critical Patterns

**DOM Element Access**: Always use `safeGetElement(id)` or the pre-mapped `elements` object created in `init.js` to prevent null reference errors.

**Data Model**: Inventory items follow this structure:
```javascript
{
  metal: "Silver|Gold|Platinum|Palladium",
  name: string,
  type: string, 
  qty: number,
  weight: number,
  weightUnit: string,
  price: number,
  purchaseLocation: string,
  storageLocation: string,
  notes: string,
  date: string,
  spotPrice: number,
  collectable: boolean,
  catalog: string,
  serial: number
}
```

**Logging**: Use `debugLog()` function instead of `console.log()` for development logging.

## Essential Documentation References

Before making changes, consult these files in order of importance:
1. `COPILOT_INSTRUCTIONS.md` - Quick reference and conventions
2. `agents.ai` - **Primary agent coordination file** containing workflow patterns, architecture decisions, and multi-agent collaboration protocols (binary file - requires special tools to read)
3. Documentation in `docs/` folder - Detailed module references

**Note**: The `agents.ai` file is the central coordination point for all AI agents working on this project. It contains critical workflow information, established patterns, and architectural decisions that should guide all development work.

## Testing Strategy

- **Unit Tests**: JavaScript test files in `agents/tests/*.test.js`
- **Integration Tests**: HTML test harnesses in `agents/tests/*.html` 
- **Manual Testing**: Full workflow testing via the main application

## Common Development Tasks

**Adding New Features**:
1. Update relevant module in `js/`
2. Add DOM elements to `index.html` if needed  
3. Wire up elements in `js/init.js`
4. Add tests to `agents/tests/`
5. Update version in `js/constants.js`

**Modifying Data Structure**: 
- Update the data model in relevant modules
- Ensure import/export functions handle new fields
- Test backwards compatibility with existing localStorage data

**Debugging File Protocol Issues**: Check `js/file-protocol-fix.js` for known compatibility fixes

## Performance Considerations

- Table rendering uses pagination to handle large datasets
- Search uses debounced input to prevent excessive filtering
- Feature flags system (`FEATURE_FLAGS` in constants.js) controls experimental optimizations
- Import operations show progress indicators for large files

## Storage Management

- All data stored in browser localStorage with specific keys defined in `constants.js`
- Storage usage monitoring and cleanup functions available
- Full backup/restore functionality via ZIP exports
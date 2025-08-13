# StackrTrackr - Project Structure

## Current Structure (Version 3.03.08n)

```text
├── css/
│   └── styles.css
├── debug/
├── docs/
│   ├── archive/
│   │   └── notes/
│   ├── future/
│   ├── changelog.md
│   ├── functionstable.md
│   ├── implementation_summary.md
│   ├── MULTI_AGENT_WORKFLOW.md
│   ├── roadmap.md
│   ├── status.md
│   ├── structure.md
│   └── versioning.md
├── js/
│   ├── api.js
│   ├── charts.js
│   ├── constants.js
│   ├── detailsModal.js
│   ├── events.js
│   ├── customMapping.js
│   ├── init.js
│   ├── inventory.js
│   ├── pagination.js
│   ├── search.js
│   ├── sorting.js
│   ├── spot.js
│   ├── state.js
│   ├── theme.js
│   ├── versionCheck.js
│   └── utils.js
├── index.html
├── archive/
├── LICENSE
├── README.md
├── sample.csv
└── structure.md
```

## File Purposes

### Application (`index.html`)
- Entry point for users and full inventory management interface
- Theme toggle functionality
- Spot price controls for all metals
- Data entry forms
- Inventory table with pagination
- Import/export functionality
- Modal dialogs for editing and analytics
- Download link for sample data

### Core JavaScript Modules
- **constants.js**: Configuration, metal definitions, storage keys, version
- **state.js**: Global application state variables and DOM element caching
- **inventory.js**: CRUD operations, calculations, data management, and import/export
- **spot.js**: Spot price handling and history
- **theme.js**: Dark/light mode toggle and persistence
- **search.js**: Inventory search and filtering
- **sorting.js**: Table column sorting
- **pagination.js**: Table pagination controls
- **detailsModal.js**: Analytics modal with Chart.js pie charts
- **charts.js**: Chart.js utilities and configuration
- **events.js**: All DOM event listener setup
- **customMapping.js**: Regex-based field mapping rule engine
- **init.js**: Application bootstrap and initialization
- **versionCheck.js**: Handles version comparison and changelog modal
- **utils.js**: Shared utility functions, validation, and error handling

### Styling (`css/styles.css`)
- Complete theming with CSS custom properties
- Dark and light mode support
- Responsive design for all screen sizes
- Component-based organization
- Modern CSS features and animations

### Archive (`archive/`)
- Stores the previous build so users can revert if issues arise

This structure provides better maintainability, clearer separation of concerns, and easier version management going forward.

- `js/catalog-providers.js` — Provider interface and Numista provider (Phase 1D)
- `docs/catalog_architecture.md` — Architecture notes
- `docs/migration_roadmap.md` — Migration plan

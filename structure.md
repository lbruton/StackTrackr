# StackTrackr - Project Structure

## Current Structure (Version 3.03.07a)

```text
├── css/
│   └── styles.css
├── debug/
├── docs/
│   ├── archive/
│   │   └── notes/
│   ├── future/
│   ├── CHANGELOG.md
│   ├── FUNCTIONSTABLE.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── MULTI_AGENT_WORKFLOW.md
│   ├── ROADMAP.md
│   ├── STATUS.md
│   ├── STRUCTURE.md
│   └── VERSIONING.md
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

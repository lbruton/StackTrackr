
# StackrTrackr v3.04.24


StackrTrackr is a comprehensive client-side web application for tracking precious metal investments. It's designed to help users manage their silver, gold, platinum, and palladium holdings with detailed financial metrics and enhanced tracking capabilities.

The public hosted version of the app is available at [stackrtrackr.com](https://stackrtrackr.com).

## Recent Updates
- **v3.04.24 - Backup warning theming**: local storage warning uses theme colors with centered type summary and backup link
- **v3.04.23 - Inventory actions alignment**: row icons match header order and theme-aware controls
- **v3.04.22 - Metals.dev history limit**: limits Metals.dev API to 30-day history and logs daily prices
- **v3.04.21 - Header height and type color theming**: consistent header sizing and themed type chips
- **v3.04.18 - Name and price quick-filter fix**: clicking name or price cells now applies filters correctly
- **v3.04.17 - Gold & silver responsive logo**: theme-aware SVG with premium gradients and tagline
- **v3.04.16 - Layout and footer refinements**: silver Change Log button, added spacing, new footer message, safe favicon
- **v3.04.15 - Footer version injection**: footer displays current `APP_VERSION`
- **v3.04.14 - UI and filter enhancements**: date sanitization, type summary, icon polish
- **v3.04.13 - Simplified archive workflow**: update-archive script maintains a single previous build snapshot
- **v3.04.12 - Quick filter object storage**: Quick filter now stores criteria as objects for exclude support
- **v3.04.11 - Collectable column icon**: Collectable table header now uses a treasure chest icon with an accessible label
- **v3.04.10 - Provider history usage display**: Provider history sections show API usage/quota only, with metal toggles managed in Provider Settings
- **v3.04.09 - Multi-select & exclusion filters**: Filter modal supports multi-select dropdowns with exclude toggles and chips reflect selections
- **v3.04.08 - Debounced search**: Search box waits for typing to pause before filtering large datasets
- **v3.04.07 - Data sanitization on load**: Removes non-alphanumeric characters from inventory and Numista tables when the app loads
- **v3.04.06 - Name sanitization**: Strip HTML tags and excess whitespace from imported text fields to stabilize table search
- **v3.04.05 - Search sanitization**: Escaped table values and sanitized search input to prevent corruption
- **v3.04.04 - Multi-term search**: Search box accepts comma-separated values to match multiple terms at once
- **v3.04.03 - Search input restore**: Search box reliably filters inventory table as you type
- **v3.04.02 - Numista header trimming**: Imports accept Numista CSVs with trailing spaces in column headers
- **v3.04.01 - Filter reset & Numista sanitization**: Clear search resets filters, sanitized Numista imports, batch API pulls
- **v3.04.00 - Inventory filter click & API cleanup**: Click any table value to filter and removed global API cache duration dropdown
- **v3.03.08n - Inventory type filter**: Added type dropdown and dynamic metal options
- **v3.03.08m - Inventory filter dropdown**: Added metal filter to inventory title bar for quick filtering
- **v3.03.08l - Search fix & composition parsing**: Search box filters table as you type and Numista compositions truncate to two words
- **v3.03.08k - Type dropdown and UI fixes**: Standardized type options, blank purchase locations, edit icon, and separate totals cards
- **v3.03.08j - Composition display fix**: Composition column shows first word from imported data
- **v3.03.08i - Numista import polish**: Uniform changelog bullets, default collectable flag, weight rounding, N# notes, and beta warning
- **v3.03.08h - Table controls & import options**: Compact table controls, uniform pagination buttons, import Override/Merge menus, and Backup/Restore placeholder
- **v3.03.08g - Change log & catalog improvements**: Condensed change log, undo from edit modal, and catalog mapping
- **v3.03.08f - CSV import field sanitization**: Invalid fields are blanked and users can merge or override during import
- **v3.03.08e - Numista CSV storage**: Stores raw Numista CSV and classifies metals by composition
- **v3.03.08d - Version Modal Centering**: Version change dialog now properly centers in the viewport
- **v3.03.08c - Version Modal Enhancements**: Version change dialog now includes privacy notice, resources, and roadmap
- **v3.03.08b - Files Modal Simplification**: Removed storage breakdown progress bar for cleaner file management
- **v3.03.08a - Version Update Changelog Modal**: Displays release notes when the app version changes
- **v3.03.07b - Documentation Normalization**: Renamed documentation files to lowercase and updated all internal references
- **v3.03.07a - Theme Toggle Improvements**: Removed appearance modal and added three-state Dark/Light/System toggle with localStorage persistence
- **v3.03.06a - Documentation Sweep & Archive Update**: Version references synchronized and archived footer links back to current version
- **v3.03.05a - Custom Mapping Rule Engine**: Added regex-based mapping module with Add/Apply/Clear controls
- **v3.03.02a - Archive Workflow Update**: Archived previous build and added rollback footer link requirement; clarified BRANCH.RELEASE.PATCH.state naming and pre-release codes
- **v3.03.01a - Comprehensive Storage Report System**: Redesigned storage reports with top-five pie chart visualization and scrollable legend
- **v3.00.00 - Stable Release & Documentation Cleanup**: Finalized documentation and archived planning notes
- **v3.2.07rc - Spot Timestamp Source Display**: Spot price cards now show the API provider or Manual entry along with the exact timestamp of the last update
- **v3.2.06rc - UI Refinements & Auto Sync**: Adds modal-based item entry with stacked filters, pagination polish, collectable status button, notes button showing green "Yes" when notes exist, and automatic spot price refresh when cached data expires
- **v3.2.05rc - Splash Opt-Out & Branding**: Disclaimer modal now hides after acknowledgment, header branding adapts to the hosting domain with an updated subtitle, and API providers store keys separately
- **v3.2.04rc - Import Negative Price Handling**: Negative prices default to $0 during imports
- **v3.2.03rc - Cache Flush Confirmation**: Added warning before clearing API cache and history
- **v3.2.02rc - Feature Complete Release Candidate**: Rebranded to StackrTrackr and prepared for final release
- **v3.2.01 - Cloud Sync Modal Fix**: Coming soon modal now matches themed styling with internal close button
- **v3.2.0 - Settings & History Polish**: Appearance section moved up, sync confirmation dialog, and redesigned API history modal with clear filter
- **v3.1.13 - Cloud Sync & API Quotas**: CSV import fix, Cloud Sync placeholder, and API usage tracking with monthly reset
- **v3.1.12 - About Modal & Disclaimer**: Mandatory disclaimer splash and refreshed About modal
- **v3.1.11 - UI Enhancements & Documentation**: Improved table usability and consolidated workflow docs
- **v3.1.10 - Project Maintenance**: Removed orphaned backup and debug files for improved maintainability
- **v3.1.9 - UI Consistency**: Clear Cache button styling improvements across themes
- **v3.1.8 - Backup System**: Full ZIP backup functionality with restoration guides
- **v3.1.6 - Theme Toggle**: Fixed theme management with system preference detection

## 🆕 What's New in v3.04.01
- Clear search button resets all filters, including those set in the modal
- Numista imports sanitize text fields to ensure filter links remain functional
- API providers craft a single batch request using only selected metals

## 🆕 What's New in v3.04.00
- Clicking any non-action table cell adds a filter; repeat clicks toggle filters and support up to three stacked conditions
- Removed global API cache duration dropdown in favor of per-provider cache settings

## 🆕 What's New in v3.03.08g
- Change log rows open the edit modal with an undo option
- Items gain catalog field tied to unique S# values

## 🆕 What's New in v3.03.08f
- CSV import accepts rows with bad data and lets you merge or override existing inventory

## 🆕 What's New in v3.03.08e
- Imported Numista CSV preserved in localStorage with improved metal mapping

## 🆕 What's New in v3.03.08d
- Version change modal is centered on screen for improved visibility

## 🆕 What's New in v3.03.08c
- Version change dialog now includes privacy notice and upcoming roadmap
- About modal no longer shows Key Features section
- Version notice only appears for users with existing data

## 🆕 What's New in v3.03.08b
- Files modal no longer displays storage breakdown progress bar

## 🆕 What's New in v3.03.08a
- Version changelog modal alerts users of new releases

## 🆕 What's New in v3.03.07b
- Documentation files renamed to lowercase (except MULTI_AGENT_WORKFLOW.md) with reference cleanup

## 🆕 What's New in v3.03.07a
- Theme toggle cycles Dark/Light/System without modal and saves preference

## 🆕 What's New in v3.03.06a
- Documentation sweep across project and archived build footer update

## 🆕 What's New in v3.03.05a
- Prototype regex-based custom mapping rule engine with Add/Apply/Clear buttons

## 🆕 What's New in v3.03.02a
- Archived previous build and added rollback footer link requirement
- Clarified version naming scheme and state codes

## 🆕 What's New in v3.03.01a
- Comprehensive storage report system featuring pie chart visualization and scrollable legend
- Includes spot timestamp source display from v3.2.07rc

## 🆕 What's New in v3.2.07rc
- Spot price cards display API provider or Manual entry along with exact timestamp of last update

## 🆕 What's New in v3.2.06rc
- Automatically refreshes spot prices at startup when an API key is configured and cached data is stale
- Item entry now occurs in a dedicated modal with support for stacked filtering
- Items-per-page selector repositioned with unified pagination button theming and fixed dropdown width
- Collectable checkbox replaced with status button and action buttons aligned in inventory table
- Totals cards renamed with refined labels and font sizes
- About modal title contrast improved in light mode
- Notes button uses a notebook icon and highlights green when an item contains notes

## 🆕 What's New in v3.2.05rc
- Disclaimer splash hides permanently after you click "I Understand"
- Header branding adapts to the hosting domain and subtitle now reads "The open source precious metals tracking tool."
- Each API provider stores its own API key independently

## 🆕 What's New in v3.2.04rc
- Negative prices in imported files now default to $0 instead of causing errors

## 🆕 What's New in v3.2.03rc
- Added confirmation prompt before flushing API cache and history

## 🆕 What's New in v3.2.02rc
- Application renamed to **StackrTrackr**
- Marked as **feature complete** for the 3.2.x series

## 🆕 What's New in v3.2.0
- Appearance settings now appear before API configuration for quicker access
- Sync All displays a confirmation dialog showing how many records were updated
- API price history modal matches other modals and includes a Clear Filter button

## 🆕 What's New in v3.1.13
- CSV import now resets negative prices to $0 while importing remaining data
- Added Cloud Sync placeholder modal and per-provider API quota tracking with usage warnings and automatic monthly reset
- Boating Accident button color reflects data presence and import/export behavior
- Custom branding title support and new footer with GPL-3.0 license link
- Provider modal adds usage instructions and centered tables for Last Price and metal enable options
- Settings controls and file buttons now use even spacing with upload/download icons and clarified boating accident prompt

## 🆕 What's New in v3.1.12
- **About Modal**: Mandatory disclaimer splash with version info and refreshed styling
- **About Button**: Quick access to application details from header
- **Sources Link**: GitHub repository accessible from About modal
- **Dynamic Changelog**: About modal now auto-populates release notes from this README

## 🆕 What's New in v3.1.11
- **UI Enhancements**: Improved table usability and visual organization
  - Color-coded table items for better visual organization
  - Enhanced click-to-sort functionality for all table columns
  - Added dedicated Notes button for easy access to item notes
- **Documentation Consolidation**: Improved AI assistant guidance and development workflow
  - Removed redundant `docs/llm.md` file (archived to `docs/archive/llm.md`)
  - Replaced with comprehensive `docs/MULTI_AGENT_WORKFLOW.md`
  - Enhanced multi-agent coordination protocols and quality standards
  - Streamlined documentation structure eliminates redundancy

## What's New in v3.1.8
- **Full Backup System**: "Backup All Data" button creates a timestamped ZIP archive of the entire application state.
- **Comprehensive Archive**: Includes inventory JSON, settings, spot price history, and exports (CSV, Excel) with restoration instructions.
- **Client-Side Processing**: Uses JSZip to generate archives locally so your data never leaves the device.

## What's New in v3.1.6
- **Fixed Theme Toggle**: Removed conflicting inline onclick handler, added system preference detection
- **Enhanced Theme Management**: Auto-adapts to OS dark/light mode changes
- **Improved Initialization**: Theme loads properly on startup with fallback handling
- **Better UX**: Cleaner toggle logic without JavaScript conflicts

## What's New in v3.1.2
- **Improved Event Listener Setup**: Enhanced event listener attachment for robustness across browsers and protocols.
- **Manual Input Workflow**:
  1. Click "Add" button to show manual price input form.
  2. Enter desired spot price and click "Save" or press Enter.
  3. Form hides and updates the price.
  4. "Cancel" aborts and hides the input form without changes.
- **Reset Functionality**:
  - Clicking "Reset" restores the price to default or API cached value.
  - Price history updates accordingly with source tracking.
- **API Integration**:
  - Sync buttons are enabled/disabled based on API configuration.
  - All metal prices sync simultaneously from configured provider.
  - Button states show loading status during syncing.
- **Backwards Compatibility and Stability**: Maintained all existing workflows and data integrity during fixes.

## 🆕 What's New in Previous Version v3.0.5
- **Notes Field**: Added optional notes field for detailed item documentation.
- **Enhanced Search**: Search now includes notes content along with all other fields.
- **Complete Export Support**: Notes field included in all export formats (CSV, JSON, Excel, PDF).
- **Improved Sample Data**: Updated sample.csv with realistic notes examples.
- **Backwards Compatibility**: Existing data automatically upgraded with empty notes field.

## Key Features
- **Multi-Metal Support**: Track Silver, Gold, Platinum, and Palladium investments.
- **Comprehensive Tracking**: Metal type, quantity, weight, purchase/storage locations, and notes.
- **Financial Calculations**: Automatic calculation of premiums, profits/losses, and averages.
- **Collectable Item Support**: Special handling for collectible items with numismatic value.
- **Advanced Search**: Search and filter inventory by any field including notes.
- **Dark/Light Theme**: Toggle between dark and light themes for optimal viewing.
- **Import/Export**: Support for CSV, JSON, Excel, and PDF formats.
- **Data Visualization**: Interactive pie charts for inventory breakdown analysis.
- **Responsive Design**: Optimized for desktop and mobile devices.
- **Local Storage**: All data stored locally in browser - no server required.
- **Privacy**: No data transmission - everything stays on your device.

## Installation
1. Clone or download this repository.
2. Open `index.html` in a web browser.
3. Click "Accept and Continue" to access the application.

## Quick Start
1. **Set Spot Prices**: Enter current metal spot prices or use the defaults. Use the "Sync" buttons to update prices automatically.
2. **Add Items**: Use the form to add items to your inventory.
3. **Track Storage**: Specify where each item is stored.
4. **Add Notes**: Include additional details about each item.
5. **Search & Filter**: Use the search bar to find specific items.
6. **Export Data**: Download your inventory in multiple formats.
7. **View Analytics**: Click a totals title on summary cards for breakdowns.

## Version Management
This application uses a dynamic version management system. The version is automatically updated throughout the application from `js/constants.js`. The HTML files now use this dynamic system instead of hardcoded version numbers. See [docs/versioning.md](docs/versioning.md) for details on how to update versions.
The most recent build is retained under `archive/v_previous`, with the archive linked from the footer for easy rollback.

## Data Structure
Each inventory item includes:
- **Basic Info**: Metal type, name, quantity, weight, type.
- **Financial**: Purchase price, spot price, premiums, profit/loss.
- **Location**: Purchase location and storage location.
- **Additional**: Notes field for comments and details.
- **Status**: Collectable designation for numismatic items.
- **Metadata**: Purchase date and historical data.

## Project Structure

```
├── css/
│   └── styles.css                      # Complete theming and responsive styling
├── debug/                              # Development artifacts
├── archive/                            # Previous build snapshots for fallback
├── docs/
│   ├── archive/                        # Archived notes and historical docs
│   ├── future/                         # Planning notes for upcoming enhancements
│   ├── changelog.md                    # Detailed history of application changes
│   ├── implementation_summary.md       # Summary of major development work
│   ├── MULTI_AGENT_WORKFLOW.md         # AI assistant development workflow and coordination
│   ├── roadmap.md                      # Planned features and subtasks
│   ├── status.md                       # Project status and features overview
│   ├── structure.md                    # Documentation of folder and file organization
│   ├── functionstable.md               # Function reference table
│   └── versioning.md                   # Version management notes
├── js/
│   ├── api.js
│   ├── charts.js
│   ├── constants.js
│   ├── detailsModal.js
│   ├── events.js
│   ├── init.js
│   ├── inventory.js
│   ├── pagination.js
│   ├── search.js
│   ├── sorting.js
│   ├── spot.js
│   ├── state.js
│   ├── theme.js
│   └── utils.js
├── index.html                         # Main application interface
├── sample.csv                         # Sample inventory data with notes for import testing
├── structure.md                       # Detailed project structure reference
└── README.md                          # Root project summary and documentation
```

**Key Notes:**

- The `css` and `js` directories contain the application's styling and modular JavaScript files.
- JavaScript is split into specialized modules to promote maintainability and separation of concerns.
- Styles use CSS custom properties supporting dark/light themes and responsive layouts.
- Documentation files in the `docs` folder keep changelogs, versioning info, project status, development guides, and future planning notes.
- The root `index.html` hosts the main application interface.

## Documentation
- **[README.md](README.md)** - Detailed project information.
- **[docs/MULTI_AGENT_WORKFLOW.md](docs/MULTI_AGENT_WORKFLOW.md)** - AI assistant development workflow.
- **[docs/changelog.md](docs/changelog.md)** - Version history and features.
- **[docs/status.md](docs/status.md)** - Current project status.
 - **[docs/structure.md](docs/structure.md)** - Project organization.
 - **[docs/functionstable.md](docs/functionstable.md)** - Function reference table.
 - **[docs/future/](docs/future/)** - Notes for future implementations and add-ons.
 - **[docs/versioning.md](docs/versioning.md)** - Version management.
 - **[archive/v_previous/](archive/v_previous/)** - Most recent previous build for rollback.

## Code Quality
This project maintains high code quality standards with:
- Comprehensive JSDoc-style comments throughout all JavaScript modules.
- Detailed HTML section comments explaining functionality.
- Well-organized CSS with extensive documentation.
- Modular architecture with clear separation of concerns.
- Input sanitization and XSS protection.
- Performance monitoring for critical functions.
- Accessibility compliance with ARIA labels.

## Data Privacy & Security
- **Local Storage Only**: All data stored in browser localStorage.
- **No Server Communication**: Zero external data transmission.
- **Input Sanitization**: XSS protection on all user inputs.
- **Privacy First**: Your data never leaves your device.
- **Export for Backup**: Multiple export formats for data portability.

## Browser Compatibility
Works in all modern browsers that support:
- HTML5 localStorage.
- CSS Custom Properties.
- ES6 JavaScript features.
- Chart.js for visualizations.

## Known Issues / Bugs

Currently, no major issues are known.

## Contributing
This project is designed to be maintainable and extensible. When making changes:
1. Update the version in `js/constants.js`
2. Document changes in `docs/changelog.md`
3. Update relevant documentation files
4. Test backwards compatibility
5. Ensure all exports include new fields

## License
This project is open source and available for personal use.

---
**Current Version**: 3.04.15
**Last Updated**: August 12, 2025
**Status**: Feature complete release candidate




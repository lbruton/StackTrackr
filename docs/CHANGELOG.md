# StackTrackr — Changelog

## 🚀 Roadmap (Future Versions)

*All major planned features have been implemented! The tool now includes comprehensive inventory management with storage location tracking, multi-format import/export, advanced analytics, and a modern modular architecture.*

---

## 📋 Version History

### Version 3.03.02a – Archive Workflow & Versioning Guide (2025-08-10)
- Archived previous build to `archive/previous`
- Added archived footer link back to root and updated workflow checklist
- Clarified BRANCH.RELEASE.PATCH.state version scheme
- Documented pre-release state codes and branching policy
- Improved mobile usability with responsive column visibility and pagination sizing

### Version 3.03.01a – Comprehensive Storage Report System (2025-08-10)
- **Enhanced Storage Reports**: Redesigned storage report from basic JSON export to comprehensive HTML reporting system
  - **Professional HTML Reports**: Clean, print-optimized layout formatted for letter paper (8.5" x 11")
  - **Interactive Modal System**: Click any storage item to view detailed breakdown in modal popup
  - **Multiple Download Options**: View in browser, download HTML file, or download compressed ZIP package
  - **Memory Analysis**: Detailed breakdown showing size, percentage, type, and record count for each storage item
  - **Print Integration**: Dedicated print button with optimized print CSS for professional output
  - **Data Tables**: Full inventory tables with first 50 records shown in detailed modals
  - **Security**: API keys automatically sanitized before inclusion in reports
- **User Experience**: Storage report link in footer now opens options modal instead of direct JSON download
- **Professional Styling**: Consistent with application design language, responsive layout, proper typography
- **Self-contained Reports**: HTML files include all CSS and JavaScript inline for standalone viewing

### Version 3.00.02 – Interactive Storage Report Dashboard (2025-08-10)
- **Interactive Dashboard**: Complete redesign of storage report from simple download options to comprehensive interactive dashboard
  - **Real-time Pie Chart**: Chart.js-powered visualization showing storage distribution with clickable segments
  - **Theme Toggle**: Independent dark/light mode toggle with inheritance from main application
  - **Interactive Elements**: Click pie chart segments, legend items, or table rows to view detailed breakdowns
  - **Auto-sizing Modal**: Responsive modal (95vw × 90vh, max 1200px × 900px) with proper centering
  - **Themed Design**: Uses standard modal header styling consistent with other application modals
- **Enhanced Downloads**: HTML reports now include interactive charts and theme support
- **Navigation**: "Back to App" links in both modal and standalone HTML reports
- **Data Exploration**: Detailed modals for each storage item with formatted tables and data previews
- **Chart Interactivity**: Hover tooltips, legend interactions, and click-to-drill-down functionality
- **Theme Persistence**: Selected theme preserved in exported HTML reports and ZIP archives

### Version 3.00.00 – Stable Release (2025-08-10)
- Promoted release candidate features to official stable version
- Finalized documentation and archived planning notes
- Added `docs/future/` directory for upcoming feature planning
- Inventory table automatically adjusts items-per-page dropdown when filtered results are fewer than selected

### Version 3.2.07rc – Spot Timestamp Source Display (2025-08-09)
- Spot price cards now show API provider or Manual entry along with exact timestamp of the last update
- Manual spot price entries now display the entry time as "Time entered" with date and timestamp
- Footer dynamically displays the active StackTrackr domain and links to issue reporting
- Inventory change log records every edit and the modal displays the complete history with scrolling
- Change Log and metal totals details modals now share the site's standard header style
- Quantity column repositioned after item name for improved readability
- Change Log modal widened and buttonized; items-per-page controls restyled with disclaimer and fixed layout
- Spot price action buttons reveal on card click and timestamps now reflect only API updates
- Footer shows local storage usage with downloadable report link
- Spot price manual input closes when card is collapsed to avoid stuck dropdowns
- Brand mapping updated so StackrTrackr renders without a space when hosted at stackrtrackr.com
- Documentation notes the public instance at stackrtrackr.com with new Community button linking to Reddit
- API price history modal shows separate charts for each metal in a 2x2 grid and the table lists all pulls with scrolling
- Storage usage counter refreshes after imports and API syncs
- Inventory table now defaults to showing 10 rows per page
- Storage report export omits API keys for security
- Expanded overall layout width to 1600px and aligned header with main content

### Version 3.2.06rc – Auto Spot Price Sync (2025-08-09)
- Automatically refreshes spot prices at startup when API keys exist and the cache is expired
- Item entry moved to a dedicated modal with stacked filter support
- Pagination controls polished with repositioned items-per-page selector and fixed dropdown width
- Collectable checkbox replaced with status button and aligned action buttons
- Totals cards renamed with refined labels and font sizing
- Improved About modal title contrast in light mode
- Notes button displays a green "Yes" when items have saved notes

### Version 3.2.05rc – Splash Opt-Out (2025-08-09)
- Disclaimer splash now hides permanently after the acknowledgment button is clicked, removing the previous checkbox
- Simplified acknowledgment layout with improved placement and styling
- Header branding can now automatically adapt to the hosting domain with configurable casing, optional TLD removal, and global override support
- App subtitle updated to "The open source precious metals tracking tool."
- Fixed API key handling so each provider stores its own key independently

### Version 3.2.04rc – Import Negative Price Handling (2025-08-09)
- Negative prices in CSV, JSON, and Excel imports now default to $0 instead of causing validation errors

### Version 3.2.03rc – Cache Flush Confirmation (2025-08-09)
- Added warning prompt before clearing API cache and history

### Version 3.2.02rc – Feature Complete Release Candidate (2025-08-09)
- Rebranded application to StackTrackr
- Marked as feature complete release candidate for the 3.2.x series

### Version 3.2.01 – Cloud Sync Modal Fix (2025-08-08)
- Cloud Sync placeholder modal now uses standard themed header with internal close button

### Version 3.2.0 – Settings & History Polish (2025-08-08)
- Appearance section moved above API configuration in Settings
- Sync All displays confirmation with records updated
- API price history modal restyled with Clear Filter button and header close

### Version 3.1.13 – Cloud Sync Placeholder and API Quotas (2025-08-08)
- CSV import sanitizes negative prices by setting values below zero to $0
- Added gray Cloud Sync button with coming-soon modal and icons for all import/export buttons
- Boating Accident button now indicates local data presence with red/green styling
- API provider modal gains metal selectors, call quota tracking with progress bars, warning flags at 90%, and automatic monthly quota reset
- Footer with GPL-3.0 license link and configurable branding title support
- Settings modal adds "Sync All" button to pull prices from all providers respecting metal selections
- Files section reorganized into import/export columns and removes HTML export option
- Removed "All That Glitters" backup button; data reset section now clearly indicates full data wipe
- Provider modal actions re-ordered with default button on left and remaining controls right-aligned
- Provider history table centered with "Last Price" and "Enable" labels
- Cleaned up obsolete debug files and legacy HTML export code
- Provider modal now includes usage instructions and evenly spaced table for prices and metal enables
- Settings actions and file import/export buttons evenly padded with upload/download icons and refined text

### Version 3.1.12 – About Modal and Disclaimer (2025-08-08)
- **User Notice**: Added mandatory about/disclaimer modal informing users that data is stored locally and advising regular backups
- **About Access**: New About button in header provides version info and change history
- **Sources Link**: GitHub repository accessible from About modal
- **Dynamic Changelog**: About modal auto-loads release notes from README
- **Persistence**: Acceptance stored in localStorage to prevent repeated prompts
- **Styling**: Refreshed modal header with prominent version display

### Version 3.1.11 – UI Enhancements and Documentation Consolidation (2025-08-08)
- **UI Improvements**: Enhanced table usability and visual organization
  - Color-coded table items for improved visual distinction and organization
  - Enhanced click-to-sort functionality across all table columns
  - Added dedicated Notes button for quick access to item notes
- **Documentation Improvement**: Consolidated AI assistant guidance into comprehensive workflow system
  - Removed redundant `docs/LLM.md` file (archived to `docs/archive/LLM.md`)
  - Replaced with enhanced `docs/MULTI_AGENT_WORKFLOW.md` providing complete project context
  - Improved multi-agent coordination protocols and quality standards
  - Updated workflow guidance with actionable step-by-step processes
  - Enhanced technical architecture documentation for AI assistants
- **Documentation Structure**: Streamlined guidance eliminates redundancy while providing superior development support
- **Future-Ready**: Comprehensive workflow documentation supports coordinated multi-agent development efforts

### Version 3.1.10 – File Cleanup and Project Maintenance (2025-08-08)
- **Project Cleanup**: Removed orphaned backup and debug files for improved maintainability
  - Removed `js/init_backup.js` - backup copy no longer needed
  - Removed `js/events_backup.js` - backup copy no longer needed
  - Removed `debug/file-protocol-test.html` - development test file
  - Removed `debug/debug_buttons.html` - development test file
- **Maintenance**: Streamlined project structure by removing unused development artifacts
- **Documentation**: Updated version references to use version families (e.g., 3.1.x) where appropriate

### Version 3.1.9 – API Modal Button Styling Fix (2025-08-07)
- **UI Consistency**: Added `--info` CSS variable and updated Clear Cache button to ensure visible, uniform styling across themes.

### Version 3.1.8 – Comprehensive Backup ZIP Functionality (2025-08-07)
- **New feature**: Implemented complete backup system with ZIP file download
- **Comprehensive backup**: Creates ZIP archive containing all application data
  - Complete inventory data in JSON format with version metadata
  - All export formats included: CSV, Excel, HTML with proper formatting
  - Application settings and configuration backup
  - Spot price history preservation
  - Detailed README file with restoration instructions
- **User experience**: "Backup All Data" button now fully functional
  - Loading indicator during backup creation
  - Success confirmation after completion
  - Error handling with user-friendly messages
- **Archive contents**: 
  - `inventory_data.json` - Primary data file for restoration
  - `settings.json` - Application preferences and current spot prices
  - `spot_price_history.json` - Historical price tracking data
  - `inventory_export.csv` - Spreadsheet-compatible export
  - `inventory_export.xlsx` - Excel format with proper formatting
  - `inventory_report.html` - Self-contained web page report
  - `README.txt` - Comprehensive restoration instructions
  - `sample_data.json` - Sample items for testing (if inventory exists)
- **Dependencies**: Added JSZip library for reliable ZIP file creation
- **File naming**: Timestamped files for easy organization (e.g., `precious_metals_backup_20250807.zip`)
- **Data integrity**: Multiple format redundancy ensures data recovery options
- **Privacy**: All processing done client-side, no data transmission

### Version 3.1.3 – Critical Bug Fixes and Stability Improvements (2025-08-07)
- **Fixed Missing Function References**: Resolved JavaScript errors where functions were called but not defined
  - Added fallback implementations for `resetSpotPrice()`, `showManualInput()`, `hideManualInput()`
  - Enhanced `syncSpotPricesFromApi()` with existence checks and user-friendly error messages
  - Improved `downloadCompleteBackup()` with fallback to basic export functions
- **Theme Toggle Fixes**: Resolved file:// protocol compatibility issues
  - Added fallback theme switching when `setTheme()` function unavailable
  - Enhanced event attachment methods for improved reliability
  - Added direct DOM manipulation for theme state persistence
- **Improved Error Handling**: Comprehensive defensive programming
  - Added function existence checks before all API-related calls
  - Enhanced logging for debugging missing DOM elements
  - Added graceful degradation when optional features unavailable
- **Spot Price Reset Enhancements**: Multi-layer fallback system
  - Primary: `resetSpotPrice()` from api.js
  - Secondary: `resetSpot()` from spot.js
  - Tertiary: Manual reset using default prices from constants
- **File Protocol Compatibility**: Enhanced reliability when opening via file://
  - Improved localStorage handling for edge cases
  - Better fallback mechanisms for restricted environments
  - Multiple event attachment methods for critical buttons
- **User Experience**: Added informative error messages instead of silent failures
  - Clear feedback for unavailable features
  - Enhanced backup functionality with export fallbacks
  - Improved API requirement notifications

### Version 3.1.2 – Spot-Price Button Manual Input Fix (2025-08-07)
- **Button Functionality:** “Add” and “Reset” spot-price buttons are now fully functional
  - “Add” spawns an inline popup form with working Save/Cancel buttons  
  - “Reset” restores either the `APP_VERSION`-sourced default or the last-synced API price
- **Coverage:** All four metals supported; falls back to last-synced API if no manual override exists  
- **Persistence:** Manual overrides persist through reloads via the same listener flow in `events.js`

### Version 3.1.5 – Timestamp Display Enhancement (2025-08-07)
- **New feature**: Added timestamp display for all spot price updates
- **Last update tracking**: Shows when each metal price was last updated with relative time (e.g., "2 hrs ago")
- **Source indicators**: Displays data source (API, Manual, Cached, Default, Stored)
- **Real-time updates**: Timestamps refresh when prices are updated via any method
- **User experience**: Provides clear visibility into data freshness and origin
- **UI enhancement**: Timestamps appear below spot price values in muted text
- **Smart formatting**: Displays relative time for recent updates, absolute dates for older ones

### Version 3.1.6 – Theme Toggle Fix (2025-08-07)
- **Fixed theme toggle**: Removed conflicting inline onclick handler from HTML button
- **Enhanced theme management**: Added system preference detection and auto-switching
- **Improved initialization**: Theme now loads properly on startup with fallback handling
- **System integration**: Automatically adapts to OS dark/light mode changes
- **Better UX**: Cleaner theme toggle logic without JavaScript conflicts
- **Backwards compatibility**: Maintains existing theme preferences in localStorage

### Version 3.0.5 – Notes Field Enhancement (2025-08-06)
- **New feature**: Added optional notes field for inventory items  
- **Form enhancements**: Notes field positioned to the right of storage location in both add and edit forms  
- **Improved organization**: Optional text field for additional comments, observations, or item-specific details  
- **Search integration**: Notes content now searchable along with all other inventory fields  
- **Complete import/export support**: Notes field included in all formats (CSV, JSON, Excel, PDF, HTML)  
- **Strategic table design**: Notes accessible through edit modal but excluded from main table display to maintain clean layout  
- **Backwards compatibility**: Existing inventory items automatically receive empty notes field  
- **Data preservation**: All import/export operations preserve notes data for full data portability  
- **User experience**: Enhanced search placeholder text to indicate notes as searchable content  
- **Database migration**: Seamless data structure upgrade with no user intervention required

### Version 3.0.4 – Security & Performance Enhancements (2025-08-06)
- **Enhanced Security**: Comprehensive input sanitization to prevent XSS  
  - Implemented `sanitizeHtml()` for safe HTML insertion  
  - Applied sanitization to all user-generated content in table rendering  
  - Enhanced form validation with `validateInventoryItem()`  
- **Improved Date Parsing**: Rewritten logic for US (MM/DD/YYYY) vs. European (DD/MM/YYYY) formats  
  - Intelligent disambiguation and logical fallbacks  
  - Validation and error logging for unparseable dates  
- **Performance Monitoring**: Added `monitorPerformance()` utility  
  - Tracked bottlenecks in `renderTable()` with console warnings  
- **Enhanced Error Handling**: Added `handleError()` and `getUserFriendlyMessage()`  
  - Better error messages and detailed CSV import logging  
- **Fixed Missing DOM Elements**: Corrected caching for `premium` and `lossProfit`  
- **Code Quality Improvements**:  
  - JSDoc for new functions  
  - Modular architecture and separation of concerns  
- **Documentation Updates**: Corrected version refs in LLM.md and STRUCTURE.md; removed stale links

### Version 3.0.3 – Documentation Restructure (2025-08-06)
- Moved docs to `/docs/`  
- Updated `STRUCTURE.md` & `docs/README.md`  
- Fixed broken internal links  
- No functional changes

### Version 3.0.2 – Enhanced Table UX
- **Clickable item names** open the edit modal (removed separate Edit column)  
- **Simplified collectable toggle**: clean checkbox replaced toggle switch  
- **Centered delete buttons** in their cells  
- **Visual edit indicators**: hover/focus shows ✎ icon  
- **Accessibility**: keyboard navigation (Enter/Space), ARIA labels  
- **Streamlined table**: removed redundant column, compact layout

### Version 3.0.1 – Storage Location Tracking
- **New feature**: Added storage location field to track each item’s physical location  
- **Enhanced forms**: storage location input with “Vault A, Safe B…” placeholder  
- **Full table integration**: new column between “Purchase Location” and “Date”  
- **Search & Sort**: includes storage location, fully sortable  
- **Import/Export**: CSV, JSON, Excel, PDF, HTML include storage location  
- **Backwards compatibility**: default “Unknown” for existing items  
- **Dynamic version loading**: version auto-loads from `APP_VERSION` in `constants.js`  
- **Utility functions**: `getVersionString()`, `getAppTitle()` in `utils.js`

### Version 3.0 – UI Streamlining
- Removed “Show Spot History” & “Clear Spot History” buttons  
- Streamlined interface; spot history still collected in background  
- Added `/docs/structure.md` and migration roadmap for git control

### Version 2.8 – Modular Overhaul
- **Refactor**: modular JS files  
- **CSS modularization**: external `app/css/styles.css`  
- **Dark mode**: via `theme.js` & CSS variables  
- **Data visualization**: Chart.js pie charts  
- **UI improvements**: pagination, search, sorting  
- **Performance**: deferred script loading  

### Version 2.7 – Details & Analytics
- “View Details” on metal summary cards  
- Breakdown reports by type & purchase location  
- Improved navigation & layout  

### Version 2.6 – Maintenance Update
- Minor bug fixes & performance improvements  
- Code cleanup  

### Version 2.5 – Multi-Metal Support Completion
- Full support for Platinum & Palladium  
- UI & export refinements for all four metals  
- Calculation consistency improvements  

### Version 2.4 – Multi-Metal Support Introduction
- **New metals**: Platinum & Palladium  
- Expanded entry fields, summaries & calculations  
- Export & UI enhancements  

### Version 2.3 – Collectables Polish
- Refined summary breakdowns by collectable status  
- Improved edit interface & tooltips  

### Version 2.2 – Collectables Enhancement
- Enhanced collectable handling & price breakdowns  
- Average price/oz for collectable vs non-collectable  

### Version 2.1 – Collectables Introduction
- **New feature**: mark items as “Collectable”  
- Separate tracking & UI updates  

### Version 2.0 – Major Update
- **Expanded tracking** for Silver & Gold: type, quantity, weight, name  
- **Comprehensive totals**: weight, price, value, avg/oz, premium, profit/loss  
- **Editable table** with sorting  
- **Import/Export**: CSV, JSON, Excel, PDF, HTML  
- **Spot Price History** tracking  
- **Dark Mode**  
- “Boating Accident” reset feature  
- **Pagination**  

### Version 1.0 – Initial Release
- Basic inventory tracking for Silver & Gold  
- Core item fields (type, qty, weight, name, location, price, date)  
- Totals & profit/loss calculations  
- Edit/delete functionality  
- Simple, clean interface with summary sections
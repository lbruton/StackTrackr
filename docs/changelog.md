# StackrTrackr — Changelog

> **Latest release: v3.04.82**


For upcoming work, see [announcements](announcements.md).

## 📋 Version History

### Version 3.04.82 – Logo height via CSS (2025-08-15)
- Removed invalid height attribute from Stackr logo SVG, relying on CSS for sizing.
- Files Updated: `index.html`, `docs/changelog.md`

### Version 3.04.81 – Composition helper cleanup (2025-08-15)
- Removed obsolete composition helper comment and synchronized documentation
- Files Updated: `js/utils.js`, `README.md`, `docs/changelog.md`

### Version 3.04.76 – Table Item Counter (2025-08-15)
- **Inventory Insight**: Added dynamic item counter below the inventory table displaying the number of visible items.
- **Styling**: Muted text, right-aligned using `.table-item-count` for a subtle appearance.
- **Files Updated**: `index.html`, `css/styles.css`, `js/state.js`, `js/inventory.js`

### Version 3.04.74 – CSV Import/Export Fixes (2025-08-14)
- **Import Reliability**: Fixed undefined notes reference and removed unnecessary file input reset in `importCsv`
- **Export Cleanup**: Released object URLs after CSV download to free resources
- **Global Access**: Restored global exports for import/export functions and summary utilities
- **Files Updated**: `js/inventory.js`, `js/constants.js`

### Version 3.04.73 – Changelog Loading Fix (2025-08-13)
- **Hotfix**: Resolved "Unable to load changelog" error in version modal and about dialog
- **Enhanced Error Handling**: Added embedded fallback data for changelog and announcements when file:// protocol blocks fetch requests
- **Improved Reliability**: Version change notifications now work consistently regardless of file access restrictions
- **Better User Experience**: About modal and version dialogs display proper content even when offline or in restricted environments
- **Files Updated**: `js/versionCheck.js`, `js/about.js`
- **Impact**: Users now see proper changelog content instead of "Unable to load changelog" errors

### Version 3.04.72 – Complete Filter Logic Overhaul (2025-08-13)
- **Major Fix**: Resolved dual chip system conflicts causing duplicate filter displays
- **System Consolidation**: 
  - Eliminated competing chip rendering systems (`updateTypeSummary` vs `renderActiveFilters`)
  - Unified all filter chip functionality under single `renderActiveFilters` system
  - Fixed 0-count chips always showing (removed hardcoded "default chips" logic)
- **Enhanced Click Functionality**:
  - **Category chips** (with counts): Click to ADD filters using `applyQuickFilter`
  - **Active filter chips**: Click to REMOVE filters using new `removeFilter` function
  - **Context-aware tooltips**: Clear indication of what clicking will do
- **Search Precision**: 
  - Enhanced word boundary matching with exact phrase requirements
  - Fixed "Silver Eagle" incorrectly matching "American Gold Eagle"
  - Added comprehensive coin series pattern recognition
- **Data-Driven Display**: Only show filter chips for items that actually exist in filtered inventory
- **Clean Formatting**: Chips display content without "Title:" prefixes
- **Files Updated**: `js/filters.js`, `js/inventory.js`, `js/events.js`
- **Impact**: Complete filter system now works as expected - no duplicates, accurate counts, fully interactive

### Version 3.04.71 – Search Logic Fix (2025-08-13)
- **Critical Fix**: Resolved search precision issue where queries like "Silver Eagle" incorrectly matched "Gold Eagle" items
- **Search Enhancement**: 
  - Modified search logic to use AND logic for words within search terms (previously used OR logic)
  - Multi-word searches now require ALL words to match somewhere in the item
  - Comma-separated terms still use OR logic between different terms
  - Example: "Silver Eagle" now only matches items containing both "silver" AND "eagle"
  - Example: "Silver Eagle, Gold Coin" matches items with ("silver" AND "eagle") OR ("gold" AND "coin")
- **Files Updated**: `js/filters.js` and `js/search.js` for consistent behavior across search functions
- **Impact**: Significantly improved search precision, eliminating false positive matches in grouped chip filters

### Version 3.04.67 – Darker Light Mode & Mobile Tables (2025-08-13)
- **Styling**: Light theme retuned with darker grays for improved contrast.
- **Responsiveness**: Tables scale gracefully on mobile with wrapped cells.

### Version 3.04.66 – Storage Cleanup (2025-08-13)
- **Data Hygiene**: Startup routine now purges unrecognized localStorage keys while preserving valid data.
- **Maintenance**: Introduced centralized list of allowed localStorage keys.

### Version 3.04.65 – Import Price Defaults & Numista Markdown (2025-08-13)
- **Data Integrity**: Missing price fields now default to 0 during all import types.
- **Numista Enhancements**:
  - Buying price and Estimate columns detect currency in values and convert to USD.
  - Full Numista row data appended to item notes as a concise Markdown list.

### Version 3.04.64 – Feature Flag System (2025-08-13)
- **Feature Development**: Completed Task 2A - Feature Flag System for Phase 2 of fuzzy autocomplete
- **New Infrastructure**: Comprehensive feature flag management system in `js/constants.js`:
  - FeatureFlags class with URL parameter detection (`?autocomplete=true`)
  - LocalStorage persistence for flag states across sessions
  - Runtime toggle capabilities with user permission controls
  - Debug logging for feature state changes (debug mode only)
  - Graceful degradation handlers for production safety
  - Event listener system for feature state change notifications
- **Configuration Management**: 
  - FUZZY_AUTOCOMPLETE flag (disabled by default, URL override + user toggle enabled)
  - DEBUG_UI flag (disabled by default, URL override only, development phase)
  - Configurable phases: dev/testing/beta/stable
- **Global API**: Exported convenience functions (`isFeatureEnabled`, `enableFeature`, `disableFeature`, `toggleFeature`)
- **Developer Tools**: Debug information access with `featureFlags.getDebugInfo()`
- **Progress**: Phase 2 foundation established - fuzzy autocomplete now 50% complete (4/8 Phase 1+2 tasks)
- **Next**: Task 2B - Autocomplete UI Module for hidden implementation testing

### Version 3.04.63 – Pre-built Lookup Database Integration (2025-08-13)
- **Major Enhancement**: Integrated comprehensive 500+ item pre-built lookup database
- **Seed Data**: Added extensive precious metals database covering:
  - Government mint coins (Eagles, Maples, Britannias, Krugerrands, etc.)
  - Fractional coins (1/10, 1/4, 1/2 oz variations)
  - Lunar series and collectible coins
  - International and regional coins from 20+ countries
  - Wildlife and nature series (RCM, Perth Mint, Somalia, etc.)
  - Private mint rounds (Buffalo, Walking Liberty, Morgan designs)
  - Precious metals bars from major refiners (PAMP, Credit Suisse, Valcambi, etc.)
  - Various weights and sizes from 1g to 1kg
- **Enhanced Autocomplete**: New users get immediate autocomplete suggestions
- **Smart Combination**: Seed data combines with user inventory for comprehensive suggestions
- **Task Completion**: Effectively completed Task 4A (Pre-built Lookup Database) ahead of schedule
- **Progress**: Advanced fuzzy autocomplete development significantly

### Version 3.04.62 – Fuzzy Autocomplete Phase 1B: Lookup Table Generation (2025-08-13)
- **Feature Development**: Completed Task 1B of fuzzy autocomplete implementation
- **New Module**: Created `js/autocomplete.js` with comprehensive lookup table generation system
  - Extraction of unique values from all inventory fields (names, locations, types)
  - Built searchable indices with variants and common abbreviations
  - LocalStorage caching with TTL for performance optimization
  - Memory-optimized data structures for large datasets
  - Comprehensive error handling and data validation
  - Support for 25+ common precious metals abbreviations (ASE, CML, etc.)
- **Progress**: Phase 1 of fuzzy autocomplete now 25% complete (2/8 tasks done)
- **Next**: Task 2A - Feature Flag System for parallel testing phase

### Version 3.04.61 – Autocomplete Suggestions (2025-08-22)
- Added localStorage-backed autocomplete with 100 bullion names
- Suggestions integrate fuzzy search and persist new entries

### Version 3.04.60 – Responsive Column Priority (2025-08-21)
- Columns hide by priority for small viewports with horizontal scrolling
- Enlarged pencil icon opens edit modal directly

### Version 3.04.59 – Hidden Empty Columns (2025-08-20)
- Columns with no data after filtering are automatically hidden

### Version 3.04.58 – Cache Refresh Timestamp Toggle (2025-08-19)
- Renamed “Last sync” to “Last Cache Refresh”
- Stored separate cache-refresh and API-sync timestamps with UI toggle

### Version 3.04.57 – Filters Card Edge Alignment (2025-08-18)
- Removed left margin from Filters card for alignment with spot price card

### Version 3.04.56 – Filters Modal Removal (2025-08-17)
- Removed legacy Filters modal, button, and related code
- Cleaned up unused filter utilities

### Version 3.04.55 – Change Log Clearing (2025-08-16)
- Added Clear Log button with confirmation to Change Log modal

### Version 3.04.54 – Search Controls Rework (2025-08-15)
- Reordered search controls with icon buttons and integrated Change Log

### Version 3.04.53 – Clickable Logo Reload (2025-08-14)
- App logo now reloads the page when clicked

### Version 3.04.52 – Layout Refinements (2025-08-13)
- Removed section titles from Spot Prices, Inventory, and Information Cards
- Moved filter controls and Change Log button above the inventory table

### Version 3.04.51 – File Menu Color Updates (2025-08-13)
- **File menu clarity**: Import buttons are now orange, merge buttons green, and export buttons remain blue
- **Data wipe warning**: “Boating Accident?” button renamed to “Wipe All Data” with a cautionary notice

### Version 3.04.50 – Standardized Filter Chip Sizing (2025-08-12)
- **Filter Chip Standardization**: Unified chip sizing across all filter types for consistent appearance
  - Reduced padding from `0.2rem 0.6rem` to `0.15rem 0.4rem` for thinner profile
  - Decreased min-height from `1.5rem` to `1.25rem` for more compact appearance
  - Tightened line-height from `1.2` to `1.1` for better text fitting
  - Reduced margin from `0.1rem` to `0.05rem` for tighter grouping
  - Added `max-width: fit-content` to ensure chips expand to fit labels without font scaling
- **Enhanced Summary Chips**: Applied same standardization to type summary chips
  - Added explicit `font-size: 0.75rem` for consistency
  - Unified padding and sizing with filter chips
  - Maintained font weight differences for visual hierarchy
- **Improved Layout**: Chips now appear more uniform and professional with better space utilization

### Version 3.04.49 – Enhanced Filter Chip System (2025-08-12)
- **Word Cloud Filter UI**: Redesigned filter chips to create a visual word cloud-like interface
  - Default chip types always visible: Coin, Bar, Round, Note, Gold, Silver, Platinum, Palladium
  - Dynamic chips automatically appear for Purchase Location, Storage Location, and Name fields when filters are active
  - Enhanced visual hierarchy with varying font sizes, padding, and opacity based on item counts
  - Field-specific styling: Type/Metal chips use bold fonts and solid borders, dynamic chips use italic text and dashed borders
- **Configurable Minimum Count**: Added dropdown control to set minimum items threshold (1+, 2+, 3+, 5+, 10+) before chips appear
- **Enhanced Chip Information**: Each chip displays Field, Item name, and current/total counts (e.g., "Purchase: Apmex.com (5/12)")
- **Improved Accessibility**: Added hover effects, keyboard navigation, detailed tooltips, and smooth transitions
- **Better Visual Design**: Chips now have proper shadows, scale animations on hover, and theme-aware styling
- **Responsive Layout**: Filter area supports wrap and scroll for large inventories with many unique values
- **Smart Truncation**: Long item names automatically truncate with ellipsis to maintain clean layout

### Version 3.04.48 – Filter Display and Layout Updates (2025-08-12)
- **UI Improvements**: Enhanced filter card layout and chip positioning for better visual organization

### Version 3.04.47 – Filter Controls Reorder (2025-08-20)
- **UI**: Filters card moved between Change Log and Items dropdown with controls repositioned.
- **Filters**: Active filter chips stay on a single line with horizontal scrolling.

### Version 3.04.46 – Filter Card Layout Stabilization (2025-08-20)
- **Filters**: Ensured active chips hide when no filters and enforced single-line height.
- **UI**: Reanchored Items dropdown and Change Log button atop centered filters card.

### Version 3.04.45 – Centered Filters Card Refinements (2025-08-20)
- **UI**: Filters card centered with top-anchored items dropdown and Change Log button.
- **Filters**: Active filter chips reduced to single-line height.

### Version 3.04.44 – Filters Card & Anchored Controls (2025-08-20)
- **Filters**: Active filter chips hidden when no filters applied and moved into centered card.
- **UI**: Change Log button and items dropdown anchored to top of Filters block.

### Version 3.04.43 – Filter Chip Totals & Tooltip Links (2025-08-19)
- **Filters**: Summary chips show filtered/total counts and display only active categories.
- **UI**: Purchase location URLs moved to info tooltip links; table cells (except Name) center-aligned.

### Version 3.04.42 – Filter Chip Expansion (2025-08-18)
- **Filters**: Added Filters subtitle and summary chips for Name and Date with dynamic counts and clickable filtering.

### Version 3.04.41 – Section Titles Enhancement (2025-08-17)
- **UI**: Added centered section titles for Spot Prices, Inventory, Filters, and Information Cards using modern fonts.

### Version 3.04.40 – Pagination Section Reorder (2025-08-12)
- **UI Layout**: Moved pagination controls above table controls with Change Log button
- **Styling**: Added horizontal padding so pagination buttons no longer touch container edges

### Version 3.04.39 – Template Variable Fix (2025-08-12)
- **Template Resolution**: Fixed unreplaced template variables in documentation files
  - Resolved {{VERSION_WITH_V}} and {{VERSION}} placeholders in `docs/agents/agents.ai`
  - Applied proper template replacement to show "v3.04.39" instead of placeholder text
  - Ensured version displays correctly in about/accept modals and documentation
- **Quality Assurance**: Verified all template variables are properly replaced across documentation
- **User Experience**: About and accept pages now show correct version information

### Version 3.04.38 – Documentation Template System (2025-08-15)
- **Template System**: Created comprehensive documentation templating system
  - Added template variable functions to `js/constants.js` for dynamic version replacement
  - Implemented `getTemplateVariables()` and `replaceTemplateVariables()` functions
  - Created Node.js build script `scripts/update-templates.js` for processing documentation
  - Template variables: `{{VERSION}}`, `{{VERSION_WITH_V}}`, `{{VERSION_TITLE}}`, `{{VERSION_BRANCH}}`, `{{BRANDING_NAME}}`
- **Documentation Standardization**: Replaced hardcoded version references with template variables
  - Updated 16 documentation files across `/docs/` directory and subdirectories
  - Excluded `docs/changelog.md` which must maintain specific version history
  - Prioritized high-impact files: README.md, status.md, structure.md, announcements.md, versioning.md
- **Maintenance Reduction**: Single-source version management eliminates manual updates across documentation
- **Build Process**: Automated template replacement ensures consistency and reduces human error
- **Future-Proof**: Easy version updates by changing only `APP_VERSION` in constants.js

### Version 3.04.37 – Fuzzy Search Engine Module (2025-08-15)
- Added standalone fuzzy search engine with Levenshtein, n-gram, and word-order independent matching.

### Version 3.04.36 – Dynamic Summary Bubbles & Link Colors (2025-08-14)
- **Expanded summary**: Type, Metal, Purchase Location, and Storage Location now show dynamic counts with color-coded bubbles.
- **Consistent link colors**: Purchase location URLs inherit their bubble colors.

### Version 3.04.35 – JSON Import Options & Excel Removal (2025-08-13)
- **JSON import flexibility**: Added separate Import and Merge buttons with overwrite warnings.
- **Simplified formats**: Removed Excel import/export support and related buttons.

### Version 3.04.34 – Streamlined Numista Imports (2025-08-12)
- **Removed Numista cache**: Eliminated stored Numista CSV cache in favor of direct import.
- **UI cleanup**: Removed Clear Numista Cache option from Files menu.

### Version 3.04.33 – Import Overwrite Confirmation (2025-08-12)
- **Overwrite warnings**: Import CSV and Numista CSV now require confirmation before replacing existing data.
- **Numista button styling**: Import Numista CSV button uses red danger styling to indicate overwrite.

### Version 3.04.32 – Header Buttons Theming (2025-08-12)
- **Unified header styling**: Header buttons now match theme selector with icon-only layout and larger icons.

### Version 3.04.31 – API History Charts Removed (2025-08-12)
- **Streamlined API History**: Removed canvas-based charts and expanded table to fill modal.

### Version 3.04.30 – URL Purchase Location Links (2025-08-12)
- **Clickable Purchase Locations**: Purchase Location accepts web addresses and renders them as hyperlinks.

### Version 3.04.29 – Backup, Restore, Clear Heading (2025-08-12)
- **Unified Backup Section**: Renamed "Clear Data" settings card to "Backup, Restore, Clear" for clearer data management.

### Version 3.04.28 – Enhanced Light Theme Styling (2025-08-12)
- **Improved Light Theme**: Updated light theme to use light/middle grays and light blues for better visual appeal
- **Background Updates**: Modified primary, secondary, and tertiary backgrounds with light blue-gray tones
- **Color Harmony**: Enhanced color scheme with light blues for primary colors and coordinated gray palette
- **Visual Consistency**: Maintained excellent contrast while creating a more modern, softer appearance

### Version 3.04.27 – New StackrTrackr Logo Implementation (2025-08-12)
- **Enhanced Logo**: Implemented new premium StackrTrackr logo with comprehensive theme support
- **Triple Theme Support**: Added dedicated sepia mode with warm-toned gradients alongside light and dark modes
- **file:// Protocol Compatibility**: Removed SVG filters that can fail in local file mode, using manual shadow effects instead
- **Clean Integration**: Removed logo background box for seamless header integration
- **Automatic Theme Detection**: Logo automatically switches between all three modes based on system preferences and manual selection
- **Responsive Design**: Logo scales perfectly from desktop to mobile with optimized typography
- **Premium Styling**: Theme-specific gold and silver gradients with manual drop shadows for depth
- **Cross-Theme Support**: Works seamlessly with dark, light, and sepia themes using dedicated gradient sets
- **Safe SVG Implementation**: Replaced static image with filter-free inline SVG for maximum compatibility
- **Fixed CSS Specificity**: Corrected theme switching logic to properly handle all three modes

### Version 3.04.26 – Enhanced Theme Toggle (2025-08-13)
- **Improved theme toggle**: Button now displays current theme's color and icon instead of next theme
- **Simplified theme rotation**: Removed system mode from rotation (dark → light → sepia → dark)
- **Enhanced styling**: Theme button shows appropriate background color matching current theme
- **Better UX**: Clear visual indication of active theme with themed button styling

### Version 3.04.25 – Unified logo across themes (2025-08-13)
- Adopted single SVG logo for all themes
- Removed legacy theme-specific logo files and logic

### Version 3.04.24 – Backup warning and type summary alignment (2025-08-13)
- Local data warning now uses theme-aware yellow/red styling with clickable backup link
- Type summary chips centered beneath the warning message

### Version 3.04.23 – Inventory actions alignment (2025-08-13)
- Fixed inventory row action order to Collect, Notes, Edit, Delete
- Change Log and theme picker buttons now match active theme with next-mode icons

### Version 3.04.22 – Metals.dev history limit (2025-08-12)
- Enforced 30-day history limit for Metals.dev API with default 29 days
- Recorded daily metals.dev price history with normalized timestamps

### Version 3.04.21 – Header height and type color theming (2025-08-12)
- Unified application header height across themes
- Type summary chips now use static contrasting colors with light, dark, and sepia support

### Version 3.04.18 – Name and price quick-filter fix (2025-08-12)
- Clicking name or price cells now applies table filters correctly

### Version 3.04.17 – Gold & silver responsive logo (2025-08-12)
- Introduced gold/silver SVG logo with automatic light/dark mode and tagline
- Added responsive CSS for logo sizing

### Version 3.04.16 – Layout and footer refinements (2025-08-12)
- Change Log access restored to silver button
- Added spacing between inventory table and controls
- Footer updated with friendly message and links
- Added safe favicon

### Version 3.04.15 – Footer version injection (2025-08-12)
- Footer displays current `APP_VERSION` dynamically

### Version 3.04.14 – UI and filter enhancements (2025-08-12)
- Preserved date hyphenation and gram weight conversion
- Quick-filter entries respected by advanced filtering
- Type summary with colored chips and collectable icons
- Layout tweaks: truncated locations, silver Change Log button, footer card

### Version 3.04.13 – Simplified archive workflow (2025-08-11)
- Archive script maintains a single previous build snapshot
- Version references updated across documentation

### Version 3.04.12 – Quick filter object storage (2025-08-11)
- Quick filter stores criteria as object for exclude support

### Version 3.04.11 – Collectable column icon (2025-08-11)
- Replaced "Collectable" table header text with treasure chest icon and aria label

### Version 3.04.10 – Provider history usage display (2025-08-11)
- Provider history sections now show API usage and quota only
- Metal enablement managed solely through Provider Settings checkboxes

### Version 3.04.09 – Multi-select filters with exclusion (2025-08-11)
- Filter modal supports multi-select dropdowns with per-field exclude toggles
- Filtering logic handles arrays and exclusion, and chips reflect selections

### Version 3.04.08 – Debounced search (2025-08-11)
- Added debounce to search input to improve responsiveness with large Numista datasets

### Version 3.04.07 – Data sanitization on load (2025-08-11)
- Strip non-alphanumeric characters from inventory and Numista data during initialization

### Version 3.04.06 – Name sanitization (2025-08-11)
- Strip HTML tags and excess whitespace from imported text fields to stabilize table search

### Version 3.04.05 – Search sanitization (2025-08-11)
- Escaped table cell values and search input to prevent search corruption

### Version 3.04.04 – Multi-term search (2025-08-11)
- Search box supports comma-separated terms and filters inventory in real time

### Version 3.04.03 – Search input restore (2025-08-11)
- Ensures search box filters inventory table in real time

### Version 3.04.02 – Numista header trimming (2025-08-11)
- Accepts Numista CSV exports with trailing spaces in headers

### Version 3.04.01 – Filter reset & Numista sanitization (2025-08-11)
- Clear search button now resets all active filters including modal selections
- Numista imports strip unsafe characters from fields to preserve table filtering
- API providers craft batch requests for selected metals in a single pull

### Version 3.04.00 – Filter click & API cleanup (2025-08-11)
- Table cells (except collectable, notes, delete) now toggle exact-match filters with multi-level stacking
- Removed global API cache duration dropdown; each provider uses its own setting

### Version 3.03.08n – Inventory type filter (2025-08-10)
- Added type filter dropdown before metal filter
- Metal filter options now derive from truncated composition values

### Version 3.03.08m – Inventory filter dropdown (2025-08-10)
- Added metal filter to inventory title bar for quick result filtering

### Version 3.03.08l – Search fix & composition parsing (2025-08-10)
- Fixed search box to filter inventory as you type
- Numista composition strings now truncate to first two words, ignoring parentheses and numbers

### Version 3.03.08k – Type dropdown and UI fixes (2025-08-10)
- Type dropdown standardized to Coin, Bar, Round, Note, Aurum, Other
- Numista imports leave purchase location blank and avoid collectable tag for bars and rounds
- Inventory name cells show a pencil icon for editing; totals cards restored to their own block

### Version 3.03.08j – Composition display fix (2025-08-10)
- Composition column shows first two words of imported composition instead of generic metal

### Version 3.03.08i – Numista import polish (2025-08-10)
- Unified bullet styling for "What's New" lists
- Numista imports default to collectable with N# note
- Weight inputs round to two decimals
- Numista CSV import button includes beta warning


### Version 3.03.08h – UI compactness & import options (2025-08-10)
- Moved change log, disclaimer, and items selector into a compact section below the table
- Pagination controls slimmed down with uniform buttons
- CSV imports now choose Override or Merge from dropdown menus
- Files modal gains Backup/Restore placeholder card

### Version 3.03.08g – Change log table & catalog indexing (2025-08-10)
- Change log rows open edit modal and table is more compact
- Edit modal gains catalog field and undo button
- Items now receive unique serial numbers with catalog mapping

### Version 3.03.08f – CSV import field sanitization (2025-08-10)
- CSV imports now leave invalid fields blank instead of skipping rows
- Users can choose to merge imported data with existing inventory or override it

### Version 3.03.08e – Numista CSV storage (2025-08-10)
- Stores imported Numista CSV in raw form within localStorage
- Parses metal composition to classify into Silver, Gold, Platinum, Palladium, or Alloy

### Version 3.03.08d – Version Modal Centering (2025-08-10)
- Version change modal now centers on screen for better visibility

### Version 3.03.08c – Version Modal Enhancements (2025-08-10)
- Added privacy notice, resources, and roadmap to version change modal
- Roadmap sections now list upcoming updates
- Removed Key Features section from About modal
- Version notice only appears for existing users with saved data

### Version 3.03.08b – Files Modal Simplification (2025-08-10)
- Removed storage breakdown progress bar from Files modal for a cleaner interface

### Version 3.03.08a – Version Update Changelog Modal (2025-08-10)
- Stored app version in localStorage for version tracking
- Displayed changelog modal on version changes with acknowledgment button

### Version 3.03.07b – Documentation Normalization (2025-08-10)
- Renamed documentation files to lowercase (except MULTI_AGENT_WORKFLOW.md) and updated references

### Version 3.03.07a – Theme Toggle Improvements (2025-08-10)
- Removed appearance modal and implemented three-state Dark/Light/System toggle with localStorage persistence

### Version 3.03.06a – Documentation Sweep & Archive Update (2025-08-10)
- Synchronized version references and workflow docs for the 3.03.06a release
- Updated roadmap and status documentation
- Archived previous build with footer note linking back to the current version

### Version 3.03.05a – Custom Mapping Rule Engine (2025-08-10)
- Added prototype regex-based custom mapping module with in-memory rules
- Settings card now includes Add, Apply, and Clear mapping controls

### Version 3.03.04a – Files Modal Storage Breakdown (2025-08-10)
- Added progress bar in Files modal showing per-item storage distribution with hover tooltips and click-to-highlight
- Footer now uses constants.js helper to display application version dynamically

### Version 3.03.03a – Storage Report Modal (2025-08-10)
- Storage report now opens within an in-app modal using an iframe, replacing the previous popup window

### Version 3.03.02a – Archive Workflow & Versioning Guide (2025-08-10)
- Archived previous build to `archive/v_previous`
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
- Footer dynamically displays the active StackrTrackr domain and links to issue reporting
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
- Notes button uses a notebook icon and highlights green when items have saved notes

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
- Rebranded application to StackrTrackr
- Marked as feature complete release candidate for the 3.2.x series

### Version 3.2.01 – Cloud Sync Modal Fix (2025-08-08)
- Cloud Sync placeholder modal now uses standard themed header with internal close button

### Version 3.2.0 – Settings & History Polish (2025-08-08)
- Appearance section moved above Metals API configuration in Settings
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
  - Removed redundant `docs/llm.md` file (archived to `docs/archive/llm.md`)
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
- **Documentation Updates**: Corrected version refs in llm.md and structure.md; removed stale links

### Version 3.0.3 – Documentation Restructure (2025-08-06)
- Moved docs to `/docs/`  
- Updated `structure.md` & `README.md`
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
- **Utility functions**: `getVersionString()` in `constants.js`, `getAppTitle()` in `utils.js`

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
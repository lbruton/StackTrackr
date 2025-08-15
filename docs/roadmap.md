# StackrTrackr - Development Roadmap

This roadmap tracks upcoming goals without committing to specific patch numbers. Items can be added using: "Add X to Roadmap" or "Add Y to Buglist".

---

## 🚨 **CRITICAL BUGS** (Fix ASAP)
- [ ] The Last Sync time/date is incorrectly recording the last time the user pressed the sync button; this should be the last API pull
- [ ] Unknown items and "Imported by *" items should always sort after items with valid values
- [ ] Correct issue with readme date inconsistencies

## 🐛 **BUG FIXES** (Non-critical)
- [ ] Reset button and change log button need redesigned - current styling/positioning needs improvement
- [ ] Calculations on the Totals card appear to be incorrect, possibly omitting the collectable weight from melt price calculations?
- [ ] Fuzzy search filter shows American Gold Eagle when typing "Eagle" or "Silver Eagle" - needs refinement
- [ ] Error recovery procedures missing for critical failures
- [ ] Data corruption detection and recovery mechanisms
- [ ] Agent coordination timeout mechanisms
- [ ] Memory leak detection for long-running sessions
- [ ] Cross-browser compatibility edge cases
- [ ] localStorage quota limit handling

## 🔧 **FEATURE ENHANCEMENTS** (Improve existing)
- [ ] Add a total item counter at the lower right corner of the table
- [ ] When importing data, if no value is present, check other Numista price values. If none, set the price to 0.00
- [ ] When opening Numista links, open them in a new, appropriately sized window with close, back, and forward controls
- [ ] "Change Log" should have a square recycle bin icon instead of text
- [ ] In the table, when filtered, dynamically remove empty columns
- [ ] When the width narrows to mobile sizes, double the height of the table rows
- [ ] Re-theme the light mode with the new "Darker Light" palette
- [ ] Add exponential backoff and a user-visible retry banner for API rate limits
- [ ] Move the "Minimum Chip Items" dropdown under the "Items" dropdown
- [ ] Add a checkbox under the "Minimum Chip Items" dropdown to include date and price values for all cells
- [ ] Add a toggle to enable/disable weight in the filters tool
- [ ] Provide a toggle to switch between a condensed, scrolling view and an auto-expanding view
- [ ] Group all control toggles into a card under the "Items" dropdown
- [ ] The "Title/Name" column should allow fractions
- [ ] Center the titles and subtitles on the cards in the files modal
- [ ] Add "You may be entitled to compensation" to the boating accident joke, scaled to fit under the button
- [ ] Add "Purchase" and "Issue" year filters
- [ ] Performance monitoring and baseline measurements
- [ ] Integration testing framework for multi-agent workflows
- [ ] Automated testing for localStorage quota limits
- [ ] Security audit automation and scheduling

## ⭐ **NEW FEATURES** (Add functionality)
- [ ] Develop a marketing website for StackTrackr download - create a professional landing page with screenshots, feature highlights, download instructions, and user testimonials to showcase what the tool can do
- [ ] Bulk inline editing tool - restore and enhance the previous bulk edit functionality that allowed editing entire rows at once without breaking table structure
- [ ] Create a Debug API Button that opens a modal showing the API response in text/JSON and a table
- [ ] Comprehensive error recovery strategy with rollback procedures
- [ ] Data migration system with schema versioning
- [ ] Agent coordination recovery mechanisms
- [ ] Automated performance regression testing
- [ ] Real-time collaboration features for agents
- [ ] Predictive failure detection system
- [ ] Advanced dependency resolution for agent tasks
- [ ] User experience metrics collection
- [ ] Automated CI/CD pipeline integration

## 🏗️ **BACKEND & ARCHITECTURE** (Infrastructure)
- [ ] Re-visit and harden table structure architecture - table has fragile dependencies and breaks when scripts load out of order; needs defensive programming and better error handling
- [ ] Data schema versioning system implementation
- [ ] localStorage corruption detection utilities
- [ ] Automated migration scripts for breaking changes
- [ ] Performance baseline and monitoring infrastructure
- [ ] Security threat model documentation
- [ ] Dependency vulnerability tracking system
- [ ] Agent task coordination database
- [ ] Distributed task management system
- [ ] Emergency procedures documentation (`/docs/emergency-procedures.md`)
- [ ] Advanced agent handoff validation system

## 🧪 **TESTING & QA** (Quality assurance)
- [ ] Integration test suite for core workflows
- [ ] Cross-theme compatibility verification automation
- [ ] Regression testing pipeline for major changes
- [ ] Agent coordination failure simulation
- [ ] XSS/injection attack simulation testing
- [ ] Browser compatibility automation
- [ ] Performance benchmark automation
- [ ] Data integrity validation during upgrades

## 🎯 **CURRENT SPRINT** (Active work)
- [ ] Performance Optimization Quick Wins (100 min total)
  - [x] Phase 1: Search Debouncing (GPT - 15 min) - PENDING
  - [x] Phase 2: Event Delegation (Claude - 20 min) - **COMPLETED** ✅
  - [x] Phase 3: LocalStorage Batching (GPT - 10 min) - PENDING  
  - [x] Phase 4: DOM Fragment Optimization (Claude - 30 min) - **COMPLETED** ✅
  - [ ] Phase 5: Chart.js Cleanup (Gemini - 10 min)
  - [ ] Phase 6: Testing & Validation (Gemini - 15 min)

---

## ✅ **COMPLETED ITEMS** (Archive)

### Completed Patch Goals (v3.04.xx)
- ✅ **Performance Optimization - Event Delegation** - Eliminated memory leaks by replacing inline onclick handlers with centralized event delegation (v3.04.74)
- ✅ **Performance Optimization - DOM Fragment Rendering** - Implemented DocumentFragment-based table rendering for 30%+ performance improvement on large datasets (v3.04.74)
- ✅ **Search precision fix** - Fixed search logic where multi-word queries incorrectly matched partial terms (v3.04.71)
- ✅ **Grouped filter chips implementation** - Added grouped name chips feature with toggle for consolidating similar items (v3.04.70)
- ✅ **Mobile table scaling and darker light theme** - Improved responsive tables and updated light mode palette (v3.04.67)
- ✅ **LocalStorage cleanup** - Startup routine removes unknown keys (v3.04.66)
- ✅ **Autocomplete for item names** - LocalStorage-backed suggestions with fuzzy matching (v3.04.61)
- ✅ **Responsive column prioritization** - Progressive column hiding with scroll and modal edit icon (v3.04.60)
- ✅ **Hidden empty columns after filtering** - Automatically hide columns with no data after filtering (v3.04.59)
- ✅ **Cache refresh timestamp toggle** - Display togglable cache refresh and API sync times (v3.04.58)
- ✅ **Filters card edge alignment** - Filters card extends left to align with spot price card (v3.04.57)
- ✅ **Filters modal removal** - Eliminated legacy filters modal and cleanup (v3.04.56)
- ✅ **Change log clearing option** - Added Clear Log button with confirmation in Change Log modal (v3.04.55)
- ✅ **Search control consolidation** - New item icon, Change Log in search bar, and clear button redesign (v3.04.54)
- ✅ **Clickable logo reloads application** - App logo refreshes the page when clicked (v3.04.53)
- ✅ **Titleless sections with repositioned controls** - Removed Spot Prices/Inventory/Information Cards headers and moved filter card with Change Log above table (v3.04.52)
- ✅ **File menu color coding and data wipe notice** - Import buttons orange, merge buttons green, Boating Accident renamed (v3.04.51)
- ✅ **Filter controls reorder** - Filters card nested between Change Log and items dropdown with chips constrained to one line (v3.04.47)
- ✅ **Filter card layout stabilization** - Reapplied centered filters card with top-anchored controls and hidden chips when inactive (v3.04.46)
- ✅ **Centered filters card refinements** - Items dropdown anchored left, chips single-line height, filters card centered (v3.04.45)
- ✅ **Filters card and anchored controls** - Filters moved to centered card; controls anchored top; chips hidden when none (v3.04.44)
- ✅ **Expanded filter chips** - Added Name/Date chips with dynamic filtering and counts, replaced backup notice with Filters subtitle (v3.04.42)
- ✅ **Filter chip totals and purchase tooltips** - Chips show filtered/total counts, purchase links moved to info icons, table cells centered (v3.04.43)
- ✅ **Section titles for main UI** - Added centered titles to Spot Prices, Inventory, Filters, and Information Cards (v3.04.41)
- ✅ **Pagination section reorder** - Moved pagination above Change Log with edge padding (v3.04.40)
- ✅ **Template Variable Resolution** - Fixed unreplaced template variables in documentation (v3.04.39)
- ✅ Align inventory action buttons and theme controls
- ✅ Enforce Metals.dev 30-day history limit and record daily price history
- ✅ Remove stored Numista CSV cache and clear-cache button
- ✅ Center type summary under backup warning with clickable Files link
- ✅ Adopt unified logo across all themes
- ✅ Implement new StackrTrackr logo with triple theme support
- ✅ Enhanced light theme with light/middle grays and light blues (v3.04.28)
- ✅ Rename "Clear Data" settings card to "Backup, Restore, Clear" (v3.04.29)
- ✅ Allow URL purchase locations to render as hyperlinks (v3.04.30)
- ✅ Remove API history charts and expand API history table (v3.04.31)
- ✅ Header buttons match theme selector styling with enlarged icons (v3.04.32)
- ✅ Update milestone process and documentation
- ✅ Added standalone fuzzy search engine module (v3.04.37)
- ✅ **Documentation Template System** - Created comprehensive template replacement system for version management (v3.04.38)

---

## 🚀 **LONG-TERM VISION** (Future releases)

### Version Goals (v4.x)
- Implement drag-and-drop dashboard system with customizable card layouts - users can rearrange spot price cards, totals cards, and entire dashboard sections (major undertaking, likely requires framework adoption)
- Remove file:// protocol support and adopt a framework

### Version Goals (v3.5)
- **Final file:// protocol release** - Last version supporting local file protocol
- **Final public branch release** - After v3.5, development moves to private branch for website development
- **Privacy-first foundation** - Establish core privacy architecture before adding connected features
- **Public branch maintenance** - Periodic updates pushed back with server-side features removed

### Major Milestone Roadmap
- **Encrypted Backup Export** — Provide a secure backup flow that encrypts user data and produces a downloadable archive ready for cloud storage (e.g., Google Drive). **[NEXT PRIORITY]**
- **Turso Sync and SQLite Support** — Offer optional Turso integration so users can connect API credentials and synchronize their data with a remote SQLite-compatible database. **[HIGH PRIORITY]**
- **Numista API Integration** — Finalize the Numista API integration to support direct item and collectible price lookups integrated into search functionality. This includes building a cached search worker for the public site to power autocomplete features and an opt-in system for users to pull data. **[MAJOR MILESTONE]**
- **Companion Server Applet for Price History** — Develop a server-side companion application that polls metals APIs regularly and maintains historical price databases, allowing the main application to pull updated price histories on demand. **[MAJOR MILESTONE]**
- **Privacy-First Community Data Sharing** — Explore opt-in mechanisms for community members to share anonymized market data, pricing insights, or collection trends while maintaining strict privacy controls and user consent. Initial implementation: optional checkbox next to buy price for numismatic items that bundles item/price/date anonymously to server companion, creating a community-driven pricing database similar to Numista's model. This feature presents significant privacy challenges that must be carefully architected. **[DREAM FEATURE]**
- **Privacy-First Connected Services** — All features that require external connectivity will be strictly opt-in, ensuring user privacy is the default. We will never gather personal data or store user data without explicit consent.
- **Hosted API Cache & Data Worker** — Develop a cloud worker to build a historical price database by polling APIs daily and monthly. This will provide a robust data source for the hosted version of the application.
- **Encrypted Backup Export** — Provide a secure backup flow that encrypts user data and produces a downloadable archive ready for cloud storage (e.g., Google Drive).
- **Fuzzy Search Across All Data** — Complete the fuzzy search integration to enable typo-tolerant, context-aware search functionality spanning every stored field, improving data discoverability.
- **Numista API Integration** — Finalize the Numista API integration to support direct item and collectible price lookups. This includes building a cached search worker for the public site to power autocomplete features and an opt-in system for users to pull data.
- **Turso Sync and SQLite Support** — Offer optional Turso integration so users can connect API credentials and synchronize their data with a remote SQLite-compatible database.
- **Lightweight Storage Options** — Expand supported storage back ends to accommodate constrained devices and alternate persistence layers.
- **Enhanced CSV Conversion Tools** — Improve import/export utilities for cleaner conversions, broader compatibility, and error handling.
- **Advanced In-line and Batch Editing** — Introduce powerful editing workflows:
  - Full-featured edit panel to query the Numista database cache and correct item attributes.
  - Find and replace functionality.
  - In-line editing for all values in the table.
  - An algorithm to identify and suggest structural improvements for item names based on common patterns.
- **Comprehensive Charts and Graphs** — Deliver robust visual analytics—trend lines, distribution charts, and comparative dashboards—to help users explore their collections.

---

## 📝 **ROADMAP MANAGEMENT**

### Quick Commands for Agents
- **"Add X to Roadmap"** - Adds item to appropriate category
- **"Add Y to Buglist"** - Adds to Critical Bugs or Bug Fixes
- **"Move X to Current Sprint"** - Moves item to active work
- **"Complete X"** - Moves item to completed archive

### Category Guidelines
- **Critical Bugs**: Application-breaking issues requiring immediate attention
- **Bug Fixes**: Non-critical issues that impact user experience
- **Feature Enhancements**: Improvements to existing functionality
- **New Features**: Brand new capabilities or functionality
- **Backend & Architecture**: Infrastructure, tooling, and system improvements
- **Testing & QA**: Quality assurance, testing frameworks, and validation
- **Current Sprint**: Active work items being developed now

### Priority Levels
- 🚨 Critical (fix immediately)
- 🔥 High (next sprint)
- 📈 Medium (planned)
- 💡 Low (future consideration)

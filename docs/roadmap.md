# StackrTrackr - Development Roadmap

This roadmap tracks upcoming goals without committing to specific patch numbers.

## Patch Goals (v3.04.xx)
- _No active patch goals at this time._

## Completed Patch Goals (v3.04.xx)
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
- Align inventory action buttons and theme controls
- Enforce Metals.dev 30-day history limit and record daily price history
- Remove stored Numista CSV cache and clear-cache button
- Center type summary under backup warning with clickable Files link
- Adopt unified logo across all themes
- Implement new StackrTrackr logo with triple theme support
- Enhanced light theme with light/middle grays and light blues (v3.04.28)
- Rename "Clear Data" settings card to "Backup, Restore, Clear" (v3.04.29)
- Allow URL purchase locations to render as hyperlinks (v3.04.30)
- Remove API history charts and expand API history table (v3.04.31)
- Header buttons match theme selector styling with enlarged icons (v3.04.32)
- Update milestone process and documentation.
- Added standalone fuzzy search engine module (v3.04.37)
- ✅ **Documentation Template System** - Created comprehensive template replacement system for version management (v3.04.38)
  - Audited all .md files and identified 16 files with hardcoded version references
  - Implemented template variables: 3.04.40, v3.04.40, StackrTrackr v3.04.40, 3.04.x, StackrTrackr
  - Created automated build script for template processing
  - Replaced hardcoded versions across documentation with template variables
  - Established single-source-of-truth version management system

## Version Goals (v4.x)
- Remove file:// protocol support and adopt a framework.

## Major Milestone Roadmap
- **Encrypted Backup Export** — Provide a secure backup flow that encrypts user data and produces a downloadable archive ready for cloud storage (e.g., Google Drive).
- **Fuzzy Search Across All Data** — Enable typo-tolerant, context-aware search functionality spanning every stored field to improve discoverability.
- **Numista API Integration** — Support direct item and collectible price lookups through Numista, letting users supply their own API credentials for seamless valuation.
- **Turso Sync and SQLite Support** — Offer optional Turso integration so users can connect API credentials and synchronize their data with a remote SQLite-compatible database.
- **Lightweight Storage Options** — Expand supported storage back ends to accommodate constrained devices and alternate persistence layers.
- **Enhanced CSV Conversion Tools** — Improve import/export utilities for cleaner conversions, broader compatibility, and error handling.
- **Batch Editing with API-Aided Corrections** — Introduce bulk editing workflows that leverage external APIs to validate and auto-correct item attributes at scale.
- **Comprehensive Charts and Graphs** — Deliver robust visual analytics—trend lines, distribution charts, and comparative dashboards—to help users explore their collections.

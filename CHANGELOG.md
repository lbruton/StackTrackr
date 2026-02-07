# Changelog

All notable changes to StackTrackr will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.05.02] - 2026-02-07

### Changed

- **Full rebrand**: Renamed "StackrTrackr" to "StackTrackr" across entire codebase — SVG banner (all 3 themes), standalone logo, HTML titles, aria-labels, debug logs, backup/export templates, PDF headers, storage reports, constants, Docker labels, documentation, and CLAUDE.md
- **Footer cleanup**: Removed outdated "previous build" and "alpha release" links, simplified to subreddit and GitHub Issues reporting
- **Copyright**: Updated footer from "2025" to "2025-2026"

## [3.05.01] - 2026-02-07

### Fixed

- **What's New modal**: Changelog and roadmap sections now populate correctly — fetch points to root `CHANGELOG.md` instead of missing `docs/changelog.md`
- **Changelog parser**: Updated regex to match Keep a Changelog format (`## [X.XX.XX]`) instead of legacy `### Version X.XX.XX` format
- **GitHub URLs**: All 3 repository links (aboutModal, versionModal, View Full Changelog) updated from `Precious-Metals-Inventory` to `StackTrackr`
- **Embedded fallbacks**: Updated What's New and Roadmap fallback data with current Increment 3 content
- **Created `docs/announcements.md`**: Primary data source for What's New and Development Roadmap modal sections

## [3.05.00] - 2026-02-07

### Increment 3 — Unified Add/Edit Modal

#### Changed

- Merged `#addModal` and `#editModal` into a single `#itemModal` that switches between "add" and "edit" mode via `editingIndex`
- Consolidated two separate form submit handlers into one unified handler with `isEditing` branch
- Removed ~100 lines of duplicated edit modal HTML, ~20 duplicate element declarations, ~20 duplicate element lookups
- Files touched: `index.html`, `js/state.js`, `js/init.js`, `js/events.js`, `js/inventory.js`, `css/styles.css`, `js/utils.js`

#### Fixed

- **Weight unit bug**: edit modal was missing the weight unit `<select>` — used a fragile `dataset.unit` attribute invisible to the user. Now both modes share the real `<select id="itemWeightUnit">`
- **Price preservation**: empty price field in edit mode now preserves existing purchase price instead of zeroing it out
- **Weight precision**: `toFixed(2)` to `toFixed(6)` for stored troy oz values — sub-gram weights (e.g., 0.02g Goldbacks = 0.000643 ozt) were being rounded to zero, causing validation failures
- **$0 purchase price display**: items with price=0 (free/promo) now show `$0.00` instead of a dash, and gain/loss correctly computes full melt as gain
- **Qty-adjusted financials**: Retail, Gain/Loss, and summary totals now multiply per-unit `marketValue` and `price` by `qty`. Previously showed single-unit values for multi-qty line items
- **Gain/Loss sort order**: `js/sorting.js` cases 8 (Retail) and 9 (Gain/Loss) now use qty-adjusted totals matching the display
- **Spot price card colors**: `updateSpotCardColor()` in `js/spot.js` now compares against the last API/manual entry with a different price, so direction arrows (green / red) persist across page refreshes instead of always resetting to unchanged

## [Unreleased]

### Removed

- **Master Password Encryption Feature** (2025-10-01)
  - Removed UI section from API modal (74 lines)
  - Removed `js/encryption.js` (995 lines)
  - Removed encryption event handlers from `events.js` (258 lines)
  - Simplified `saveData()` and `loadData()` in `utils.js` (removed encryption checks)
  - Removed Phase 15 encryption initialization from `init.js`
  - **Reason:** Feature was fundamentally incompatible with pure client-side architecture
  - **Note:** Future encryption will require backend server with proper session management

### Added

- Comprehensive code quality improvement roadmap
- Semantic versioning adoption following semver.org specification
- Structured changelog management following keepachangelog.com format
- Version management workflow integration
- Release criteria for v1.0.0 stable release
- Complete architectural documentation in `/docs/` folder

### Changed

- Development workflow now includes version tracking and changelog updates
- Timeline restructured to include foundational Phase 0 for standards
- localStorage now stores data unencrypted (appropriate for personal deployment)

## [0.1.0] - 2024-08-31

### Initial Release

- Initial StackTrackr precious metals inventory tracking application
- Client-side localStorage persistence with file:// protocol support
- Multiple spot price API providers (metals-api.com, fcsapi.com, etc.)
- CSV import/export functionality with ZIP backup support
- Premium calculation system for precious metals (spot price + premium)
- Responsive theme system with four modes (light/dark/sepia/system)
- Real-time search and filtering capabilities across inventory
- PDF export with customizable formatting and styling
- Comprehensive debugging and logging system
- Security-focused development patterns and file protocol compatibility
- RESTful API abstraction layer supporting multiple data providers
- Advanced data manipulation utilities for date parsing and currency conversion

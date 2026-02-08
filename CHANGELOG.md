# Changelog

All notable changes to StakTrakr will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.10.00] - 2026-02-08

### Feature — Serial #, Numista UX, Filter Chips & Column Tweaks

#### Added

- **Serial # field**: New optional Serial Number input in the add/edit form (between Storage Location and Catalog N#) for bars and notes with physical serial numbers
- **Serial # in exports/imports**: Serial Number included in CSV, JSON, ZIP, and PDF exports; imported from CSV and JSON with `Serial Number` / `serialNumber` column fallbacks
- **Enhanced Numista no-results**: When Numista search returns no results, the modal now shows a retry search box (pre-filled with original query) and a quick-pick list of popular bullion items (Silver Eagles, Maple Leafs, Krugerrands, etc.)
- **Year/Grade/N# filter chips**: Year, Grade, and Numista ID values now generate clickable filter chips in the chip bar (respects minCount threshold)
- **Year sort tiebreaker**: Items with identical names now sub-sort by Year when sorting the Name column

#### Changed

- **Source column**: "Location" table header renamed to "Source" with storefront icon for clarity (data field unchanged: `purchaseLocation`)
- **eBay search includes year**: Year is now appended to eBay search URLs between metal and name for more precise results
- **Form layout**: Notes field moved to end of form (next to Catalog N#); Serial # takes its former position next to Storage Location

#### Fixed

- **Numista Aurum category**: Removed incorrect `'Aurum': 'banknote'` mapping — Goldbacks are "Embedded-asset notes" on Numista, which isn't a valid API category filter. Aurum items now search without a category constraint, returning correct results
- **eBay search attribute escaping**: Switched from `sanitizeHtml()` to `escapeAttribute()` for `data-search` attributes — item names with double quotes no longer truncate the search URL

## [3.09.05] - 2026-02-08

### Feature — Grade, Grading Authority & Cert # Fields + eBay Search Fix

#### Added

- **Grade field**: New optional Grade dropdown with 3 optgroups — Standard (AG through BU), Mint State (MS-60 through MS-70), and Proof (PF-60 through PF-70)
- **Grading Authority field**: Dropdown to select grading service — PCGS, NGC, ANACS, or ICG
- **Cert # field**: Free-text input for certification number
- **Inline Grade tag**: Color-coded grade badge on inventory table Name cell (after N# tag) — PCGS blue, NGC gold, ANACS green, ICG purple. Theme-aware across light/dark/sepia
- **Cert verification click**: Grade tags with cert numbers are clickable — opens grading service's cert lookup page in a popup window (PCGS and NGC direct lookup, ANACS and ICG generic verify pages)
- **Grade tooltip**: Hover shows grading details — authority + cert# when available, or just grade
- **Grade in CSV/JSON/PDF export**: Grade, Grading Authority, and Cert # columns added to all export formats
- **Grade in CSV/JSON import**: Reads grade, authority, and cert# from imported files with multiple column name fallbacks

#### Fixed

- **eBay search URL sanitization**: Item names containing quotes `"`, parentheses `()`, or backslashes `\` (allowed since v3.09.04) no longer act as eBay search operators. New `cleanSearchTerm()` strips these characters before building search URLs

## [3.09.04] - 2026-02-08

### Feature — Year Field + Inline Year Tag + Form Restructure

#### Added

- **Year field**: New optional Year field in add/edit form, stored as `year` in the data model. Accepts single years ("2024") or ranges ("2021-2026")
- **Inline Year tag**: Year badge displayed on the inventory table Name cell (before the N# tag) with muted informational styling and theme-aware colors
- **Year in Numista field picker**: Replaced Metal with Year in the "Fill Form Fields" picker — Numista's year range is editable before filling
- **Year in CSV/JSON export**: "Year" column added to standard CSV export after "Name"; `year` field added to JSON export
- **Year in CSV import**: Reads "Year", "year", or "issuedYear" columns from imported CSV files

#### Changed

- **Form layout restructured**: Name (wider, 60%) paired with Year (40%); purchase fields grouped together: Purchase Date | Purchase Price, Purchase Location | Retail Price
- **Removed Metal from Numista picker**: Numista returns "Alloy/Other" which never matches form options — removed to reduce confusion
- **Data migration**: Existing items with `issuedYear` (from Numista CSV imports) automatically migrate to `year` on load

## [3.09.03] - 2026-02-08

### Patch — Numista Field Picker Layout + Smart Category Search

#### Fixed

- **Numista field picker layout**: Replaced broken `<fieldset>` + flexbox with `<div>` + CSS Grid (`grid-template-columns: auto auto 1fr`) — fixes checkboxes centering and labels/inputs pushed off-screen across browsers
- **Numista search `category` param**: `searchItems()` now maps `filters.category` instead of `filters.metal` to the Numista API `category` parameter

#### Added

- **Smart category search**: Numista search now maps the form's Type field to Numista categories (Coin→coin, Bar/Round→exonumia, Note/Aurum→banknote) for more relevant results
- **Metal-augmented queries**: When Metal is set and not already in the search text, it's prepended to the query (e.g., Metal=Silver + "Eagle" → searches "Silver Eagle")

## [3.09.02] - 2026-02-08

### Patch — Numista API v3 Integration Fix

#### Fixed

- **Numista base URL**: Changed from `/api/v3` to `/v3` — the `/api` prefix does not exist in the Numista API
- **Numista lookup endpoint**: Changed from `/items/{id}?apikey=` to `/types/{id}?lang=en` with `Numista-API-Key` header authentication
- **Numista search endpoint**: Changed from `/items/search` to `/types` with `Numista-API-Key` header authentication
- **Numista search parameters**: `limit` → `count` (capped at 50), `country` → `issuer`, `metal` → `category`, added `page` and `lang=en`
- **Numista search response**: Changed from `data.items` to `data.types` to match actual API response structure
- **Numista field mapping**: `year` composed from `min_year`/`max_year`, `country` from `issuer.name`, `composition` handles string or object, `diameter` from `size`, `type` from `category`, `mintage` hardcoded to 0 (per-issue not per-type), `estimatedValue` from `value.numeric_value`, `imageUrl` from `obverse_thumbnail` with nested fallback, `description` from `comments`
- **localStorage whitelist**: Added `staktrakr.catalog.cache` and `staktrakr.catalog.settings` to `ALLOWED_STORAGE_KEYS` — without these, `cleanupStorage()` deleted catalog data on every page load

## [3.09.01] - 2026-02-07

### Patch — Name Chips + Silver Contrast Fix + Duplicate Chip Fix

#### Added

- **Normalized name chips**: Filter chip bar now shows grouped name chips (e.g., "Silver Eagle 15/164") that aggregate year variants, grades, and editions into a single clickable chip. Uses `normalizeItemName()` with the 280-entry `PREBUILT_LOOKUP_DATA` dictionary for grouping and `simplifyChipValue()` for display names. Respects the minCount dropdown threshold and the `GROUPED_NAME_CHIPS` feature flag (Smart Grouping toggle)
- **Name chip click filtering**: Clicking a name chip filters the inventory to all matching variants (e.g., clicking "Silver Eagle" shows all American Silver Eagle items regardless of year). Click again to toggle off. Uses the existing grouped filter path in `applyQuickFilter()`

#### Fixed

- **`normalizeItemName()` rewrite — precise starts-with matching**: Replaced the fuzzy matching algorithm (partial word match, reverse contains) with a precise "starts-with, longest match wins" strategy. The old algorithm matched any 2 shared words — causing "American Silver Eagle" to incorrectly match "American Gold Eagle" (sharing "American" + "Eagle"), since Gold came first in the lookup array. The new algorithm strips year prefixes (with mint marks like P/S/D), weight prefixes, then checks if the cleaned name starts with a `PREBUILT_LOOKUP_DATA` entry at a word boundary. For items not in the lookup, suffix stripping removes grading (PCGS, NGC, NCG), grades (MS70, PR69), condition (BU, Proof, Antiqued, Colorized), and packaging (In Capsule, TEP, Sealed) to produce a clean base name
- **Silver chip contrast on dark/sepia themes**: Silver metal chip text was nearly invisible on initial page load in dark and sepia themes — white text on a light gray background. Root cause: `renderActiveFilters()` computed contrast colors against `:root` CSS variables before the `data-theme` attribute was applied. Fix: apply the saved theme attribute before Phase 13 rendering, so `var(--silver)` resolves to the correct theme value when `getContrastColor()` runs
- **Duplicate location chips**: Clicking a purchase or storage location chip produced two chips — a category summary chip and an active filter chip. Expanded the dedup skip list in the active filters loop to include `purchaseLocation`, `storageLocation`, and `name` fields alongside the existing `metal` and `type`

## [3.09.00] - 2026-02-07

### Increment 8 — Filter Chips Cleanup + Spot Card Hint

#### Added

- **Spot card shift+click hint**: When no spot price data exists for a metal, the timestamp area shows "Shift+click price to set" instead of blank — serves as discoverability training for the shift+click manual entry pattern. Hint disappears once a price is entered (manual or API)

#### Changed

- **Default chip threshold**: Filter chips now appear at 3+ items by default (was 100+), making them immediately useful on typical inventories
- **Unified threshold application**: Purchase and storage location chips now respect the minCount dropdown — previously they showed all locations regardless of count
- **Date chips removed**: Date-based filter chips are removed entirely (too granular to be useful as filters)
- **"Unknown" location chips suppressed**: Empty and "Unknown" purchase/storage location values no longer produce filter chips
- **Dropdown filters migrated to activeFilters**: Type and Metal `<select>` dropdowns now write to the unified `activeFilters` system and update chips immediately

#### Removed

- **Dead `updateTypeSummary()` function**: Removed the legacy chip renderer and its `#typeSummary` container — fully replaced by `renderActiveFilters()`
- **Dead `columnFilters` state**: Removed the legacy filter object and all reads/writes across `state.js`, `filters.js`, `events.js`, and `search.js` — all filtering now uses the unified `activeFilters` system
- **Stale console.log statements**: Removed 9 debugging `console.log()` calls from chip rendering (opt-in `DEBUG_FILTERS` logging preserved)

#### Fixed

- **Chips update after all mutations**: `renderActiveFilters()` is now called after delete, backup restore, inventory wipe, and add/edit modal submit — previously chips could show stale counts after these operations

## [3.08.01] - 2026-02-07

### Patch — Move Metals Totals Above Inventory Table

#### Changed

- **Layout reorder**: Moved the per-metal portfolio summary cards (`.totals-section`) above the inventory table so the page flows: Spot Price Cards → Metals Totals → Search/Table/Pagination. Puts the portfolio bottom line closer to spot prices for an overview-first information hierarchy
- **Sparkline colors match metal accent**: Sparkline trend lines now read the active theme's CSS custom properties (`--silver`, `--gold`, `--platinum`, `--palladium`) instead of hardcoded colors, matching the totals card accent bars across all themes
- **Default rows per page**: Changed from 10 to 25; removed 10 and 15 row options from the dropdown (25 / 50 / 100 remain)

## [3.08.00] - 2026-02-07

### Increment 7 — Spot Price Card Redesign with Sparkline Trends

#### Added

- **Background sparkline charts**: Each spot price card now shows a Chart.js line chart with gradient fill behind the price, visualizing price trends from spot history. Minimum 2 data points required; empty state shows the card normally without a sparkline
- **Trend range dropdown**: Per-card `<select>` with 7d / 30d / 60d / 90d options. Preference saved to localStorage per metal, restored on load
- **Sync icon**: Compact SVG refresh icon in the card header replaces the old Sync button. Spins during API fetch via CSS animation. Disabled when no API is configured
- **Shift+click manual price entry**: Hold Shift and click the spot price value to open an inline `<input>` — same pattern as inventory table inline editing. Enter saves, Escape/blur cancels. New data point appears in sparkline immediately

#### Changed

- **Removed expandable button panel**: The old Sync / Add / History button row (`.spot-actions`) and manual input form (`.manual-input`) are removed entirely. Sync is now an icon, manual entry is shift+click, and history is the sparkline itself
- **Card layout**: Spot cards now use a header row (label + controls) above the price value, with an absolutely-positioned canvas behind all content for the sparkline
- **Spot history dedup**: `recordSpot()` now performs full-array dedup (via `.some()`) when an explicit timestamp is provided (historical backfill), preventing duplicate entries on repeated syncs with 30-day backfill

#### Fixed

- **Metals.dev timeseries endpoint**: Batch endpoint was using non-existent `/metals/spot?days=N` — replaced with actual `/timeseries?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`. Response parser rewritten to handle the real `{ rates: { "date": { metals: { gold: N } } } }` structure
- **History metal name mismatch**: `METALS[metal]?.name` used lowercase key (`"silver"`) against uppercase `METALS` keys (`"SILVER"`), causing history entries to record with wrong metal name. Fixed to use `Object.values(METALS).find()` lookup

#### Technical

- New `sparklineInstances` state object for Chart.js instance cleanup
- New `SPOT_TREND_RANGE_KEY` localStorage key with security whitelist entry
- `updateAllSparklines()` called from: init, sync, cache refresh, theme change, range dropdown change, manual price save
- Capture-phase shift+click listener for `.spot-card-value` elements

## [3.07.03] - 2026-02-07

### Patch — Spot History Deduplication Fix

#### Fixed

- **Duplicate spot history entries on repeated syncs**: `recordSpot()` only compared against the last array entry, so batch historical backfills (30 days × 4 metals) re-inserted the same timestamp+metal pair on every sync. Now performs full-array dedup via `.some()` when an explicit timestamp is provided (historical backfill), while keeping the fast O(1) tail check for real-time entries

## [3.07.02] - 2026-02-07

### Patch — Shift+Click Inline Editing

#### Added

- **Shift+click inline editing**: Power user shortcut — hold Shift and click any editable cell (Name, Qty, Weight, Purchase Price, Retail Price, Purchase Location) to edit in place. Enter saves, Escape cancels, clicking away cancels. No visible UI indicator — keyboard-only trigger
- **Blur-to-cancel**: Clicking outside an active inline edit now cancels it, matching standard spreadsheet UX

#### Changed

- **Removed pencil icon**: Name column no longer shows the pencil edit icon — shift+click replaces it for all 6 editable columns
- **Removed save/cancel icons**: Inline edit fields no longer show ✔️/✖️ buttons — Enter and Escape are the only controls, keeping the cell compact
- **Hidden number spinners**: Numeric fields (Qty, Weight, prices) no longer show browser-native up/down arrows that competed for space in narrow cells
- **Full table re-render on save**: Inline edits now trigger `renderTable()` instead of patching a single cell — ensures Gain/Loss recalculates, summary cards update, and eBay link structure restores correctly
- **Sort header shift guard**: Shift+clicking a column header no longer triggers a sort, preventing accidental sorts while aiming for cell edits

## [3.07.01] - 2026-02-07

### Patch — Light & Sepia Theme Contrast Pass

#### Changed

- **Light theme: clean backgrounds**: Replaced gray-blue layering (`#e7edf2` / `#d7dfe6` / `#bec7cf`) with a clean light palette (`#eef2f7` / `#e2e8f0` / `#d5dce6`). Cards now use pure white (`#ffffff`) for clear visual elevation against the cool gray page background. All text tokens pass WCAG AAA
- **Table zebra striping**: Replaced hardcoded dark-theme `rgba(30, 41, 59)` overlays with theme-aware `var(--bg-secondary)` / `var(--bg-tertiary)` tokens so row alternation and hover work correctly in all three themes
- **Table hover cleanup**: Removed `filter: brightness()` and cell-level hover transitions from inventory table — hover is now a simple row background change with no lag
- **Removed sticky action columns**: Edit/Copy/Delete columns no longer use `position: sticky` — table fits viewport without horizontal scroll, eliminating the z-index and background inheritance complexity
- **Confidence styling**: Replaced opacity-based dimming with `color: var(--text-muted)` for estimated Retail/Gain-Loss values — readable in all themes while italic style distinguishes from bold confirmed values
- **Metal/type text contrast**: Darkened metal (`--silver`, `--gold`, `--platinum`, `--palladium`) and type (`--type-coin-bg`, `--type-bar-bg`, etc.) color tokens for both light and sepia themes so they pass WCAG AA (4.5:1) when used as text colors in table cells
- **Sepia theme: removed global sepia filter**: Deleted `filter: sepia(30%)` that over-saturated the entire UI and made WCAG ratios unpredictable from CSS values alone. The warm palette is now controlled entirely by custom properties
- **Sepia theme: WCAG text contrast fix**: Darkened `--text-secondary` (`#5a4a36` → `#4f3f2c`) and `--text-muted` (`#6f604e` → `#5c4e3a`) — muted text was failing WCAG AA at 3:1 ratio, now passes at 6.7:1
- **Sepia theme: warm info color**: Changed `--info` from bright sky-blue (`#0ea5e9`) to desaturated warm teal (`#1d7a8a`) to match the warm palette
- **Sepia theme: visible borders and shadows**: Fixed `--border-hover` (was identical to `--bg-tertiary`, now `#a89878`), strengthened `--shadow-sm` opacity from 0.05 to 0.12, lightened `--bg-tertiary` (`#c0b198` → `#d0c4a8`) for better separation

## [3.07.00] - 2026-02-07

### Increment 6 — Portfolio Visibility Overhaul

#### Added

- **Retail/Gain-Loss confidence styling**: Retail and Gain/Loss columns now visually differentiate estimated values (melt fallback — italic, 65% opacity) from confirmed values (manual retail — bold). Estimated gains carry the same muted styling so users can see at a glance which items have researched retail prices vs spot-derived estimates
- **"All Metals" summary card**: New combined totals card showing portfolio-wide Items, Weight, Purchase Price, Melt Value, Retail Value, and Gain/Loss. Previously the JS calculated these but the HTML card was missing — totals silently failed to display
- **Avg Cost/oz metric**: Each metal card and the combined card now show average purchase cost per troy ounce (total purchase / total weight). Key stacker metric for evaluating cost basis across a position
- **Gain/Loss "bottom line" emphasis**: The Gain/Loss row in each summary card now has a top separator, bolder label, and larger font to visually anchor it as the portfolio's bottom line
- **Metal detail modal: full portfolio breakdown**: Clicking a metal card header now shows Purchase, Melt, Retail, and Gain/Loss per type and per purchase location in a compact 2x2 grid layout. Previously only showed purchase price as a single value. Chart tooltips also show the full quartet
- **All Metals breakdown modal**: Clicking the "All Metals" card header opens a portfolio-wide breakdown — left panel shows by-metal allocation (Silver, Gold, Platinum, Palladium) with full financial grid, right panel shows by-location across all metals. Pie charts and tooltips included

#### Changed

- Removed inline asterisk `*` indicator from Retail column in favor of CSS class-based confidence styling (`retail-confirmed`, `retail-estimated`, `gainloss-estimated`)
- Removed orphaned `.about-badge-static` CSS class
- Metal detail breakdown rows restructured: header (name + count/weight) + 2x2 financial grid replaces the old stacked single-value layout

## [3.06.02] - 2026-02-07

### Patch — eBay Search Split (Buy vs Sold)

#### Changed

- **eBay search split**: Purchase column search icon now opens eBay **active listings** (items for sale), Retail column search icon opens eBay **sold listings** (completed sales for price research)
- **New functions**: Split `openEbaySearch()` into `openEbayBuySearch()` (active, Buy It Now, best match) and `openEbaySoldSearch()` (completed, most recent) in `js/utils.js`
- **Retail column search icon**: Added magnifying glass SVG icon to the Retail column, matching the Purchase column icon style

## [3.06.01] - 2026-02-07

### Patch — CSS Cleanup, Icon Polish, About Modal Overhaul

#### Changed

- **Dead CSS cleanup**: Removed ~125 lines of orphaned `.collectable-*` selectors (toggle, card, status, icon theming) left over from Increment 1's collectable feature removal
- **eBay search icon**: Replaced oversized emoji-in-red-circle with a clean 12px monoline SVG magnifying glass using `currentColor` — themes automatically, matches the external-link icon style
- **About modal**: Rewrote description to mention open source, privacy, and live site link. Added GitHub, Community, and MIT License links
- **Version modal**: Removed duplicated privacy notice from the What's New popup (kept in the first-visit acknowledgment modal)
- **Ack modal**: Updated description text to match the About modal wording
- **JS cleanup**: Removed orphaned `.collectable-status` querySelector from `hideEmptyColumns()` in inventory.js

## [3.06.00] - 2026-02-07

### Rebrand — StackTrackr → StakTrakr

#### Changed

- **Full rebrand to StakTrakr**: Updated canonical brand name from "StackTrackr" to "StakTrakr" across the entire codebase — inline SVG banner (all 3 themes), standalone logo SVG, HTML titles, aria-labels, footer copyright, about/acknowledgment modals, debug log prefix, backup/export templates, PDF headers, storage reports, constants, Docker labels/service names, and all documentation
- **Domain-based auto-branding**: Updated domain map to support three domains — `staktrakr.com` (primary, shows "StakTrakr"), `stackrtrackr.com` (legacy, shows "StackrTrackr"), `stackertrackr.com` (shows "Stacker Tracker"). Each domain automatically displays its own brand name via the existing `BRANDING_DOMAIN_OPTIONS` system
- **localStorage key prefix migration**: Renamed `stackrtrackr.*` keys to `staktrakr.*` (debug, catalog cache, catalog settings). Debug flag checks both old and new keys for backwards compatibility
- **Footer domain**: Default domain now shows `staktrakr.com`, with auto-detection for all three owned domains
- **Reddit community link**: Hardcoded to `/r/stackrtrackr/` (subreddit name unchanged)
- **GitHub link**: Added link to `github.com/lbruton/StackTrackr` in footer
- **Dynamic SVG logo**: Logo tspan text and SVG viewBox width now update per domain at page load — prevents clipping on longer names like "Stacker Tracker"
- **Dynamic footer brand**: Footer "Thank you for using ..." text now updates to match the domain brand name

## [3.05.04] - 2026-02-07

### Increment 5 — Fraction Input + Duplicate Item Button

#### Added

- **Fraction input for weight field**: Weight input now accepts fractions like `1/1000` or `1 1/2` (mixed numbers), auto-converted to decimal before saving. Input changed from `type="number"` to `type="text"` with `inputmode="decimal"` for mobile numeric keyboard
- **Duplicate item button**: New copy icon in the table action column (between Edit and Delete). Opens the add modal pre-filled with all fields from the source item — date defaults to today, qty resets to 1, serial clears. Ideal for entering mixed-date sets of the same coin

#### Changed

- **Notes column removed from table**: Removed the Notes icon column (15 → 14 columns). Notes remain accessible in the add/edit modal. Fixed sticky column CSS offsets for the new 3-icon layout (edit/duplicate/delete)
- **Sticky column background fix**: Removed a later CSS rule that set `background: transparent` on sticky icon columns, which would have made headers see-through during horizontal scroll

## [3.05.03] - 2026-02-07

### Increment 4 — Date Bug Fix + Numista API Key Simplification

#### Fixed

- **Date display off by one day**: `formatDisplayDate()` used `new Date("YYYY-MM-DD")` which parses as UTC midnight — in US timezones this rolled back to the previous day. Now parses the date string directly via `split('-')` with no `Date` constructor, eliminating timezone ambiguity entirely
- **Numista API key never persisted**: `catalog_api_config` was missing from `ALLOWED_STORAGE_KEYS`, so `cleanupStorage()` deleted the saved config on every page load

#### Changed

- **Numista API key storage simplified**: Removed the non-functional AES-256-GCM encryption system (~115 lines of `CryptoUtils` class) that required a per-session password. Replaced with base64 encoding matching the metals API key pattern — one input, no password, persists across sessions
- **Numista settings UI**: Removed encryption password field and session-unlock flow. Added Numista API signup link with free tier info

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

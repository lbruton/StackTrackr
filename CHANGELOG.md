# Changelog

All notable changes to StakTrakr will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [3.30.05] - 2026-02-16

### Fixed — Goldback Sorting Fix

- **Fixed**: Sorting by Melt, Retail, and Gain/Loss columns now correctly handles Goldback items — previously a ½ Goldback (0.0005 ozt) was computed as 0.5 ozt of gold, inflating its sort value ~1000x
- **Fixed**: Sorting by Retail and Gain/Loss now uses Goldback denomination pricing (matching table render logic)
- **Fixed**: Weight column sort normalizes Goldback "gb" units to troy ounces for consistent cross-unit comparison
- **Fixed**: Purchase Price sort now coerces to number defensively, preventing string-vs-number comparison issues

---

## [3.30.04] - 2026-02-16

### Fixed — Pagination Dropdown Fix & Settings Reorganization

- **Fixed**: Settings modal "Visible rows" dropdown now includes value 6 — prevents silent fallback to 12 when switching between card and table views
- **Changed**: Items-per-page default changed from 12 to 6 across all code paths
- **Added**: 128 and 512 options to both footer and settings dropdowns
- **Changed**: "Table" settings tab renamed to "Inventory" with card settings consolidated under it

---

## [3.30.03] - 2026-02-17

### Fixed — STAK-130: PumpkinCrouton Patch — Purity Input & Save Fix

- **Fixed**: Purity dropdown now includes .9995 (standard pure platinum) as a preset option (STAK-130)
- **Fixed**: Custom purity input accepts 4 decimal places instead of 3 (STAK-130)
- **Fixed**: Hidden custom purity input no longer blocks form submission — resolves save corruption where no items could be edited after entering an invalid custom purity value (STAK-130)
- **Fixed**: Duplicate item preserves original purchase date instead of defaulting to today (STAK-130)

Thanks to u/PumpkinCrouton for finding and reporting this bug.

---

## [3.30.02] - 2026-02-16

### Fixed — Keyless Provider Fixes & Hourly History Pull

- **Fixed**: Keyless providers (STAKTRAKR) now enable sync buttons, show "Connected" status, and auto-select correctly
- **Fixed**: STAKTRAKR usage counter tracks API calls with 5000 default quota
- **Added**: Hourly history pull for STAKTRAKR provider (1–30 days of hourly files)
- **Added**: Hourly history pull for MetalPriceAPI provider (up to 7 days, per-metal)
- **Added**: History log distinguishes hourly entries with "(hourly)" source label
- **Added**: One-time migration re-tags existing StakTrakr hourly entries for production users

---

## [3.30.01] - 2026-02-16

### Added — StakTrakr Free API Provider & UTC Poller Fix

- **Added**: StakTrakr as a free, keyless API provider (rank 1 by default) fetching hourly spot prices from api.staktrakr.com
- **Added**: Provider panel with "Free" badge, best-effort disclaimer, and 1st–5th priority labels across all providers
- **Changed**: Poller switched from EST to UTC for timezone-neutral hourly file paths
- **Changed**: Service worker caches api.staktrakr.com with stale-while-revalidate strategy
- **Fixed**: Auto-sync and provider chain now work without any API keys via keyless providers

---

## [3.30.00] - 2026-02-16

### Added — Card View Engine, Mobile Overhaul & UI Polish

- **Added**: Three card view styles — Sparkline Header (A), Full-Bleed Overlay (B), Split Card (C) — with header button cycling and shift+click table/card toggle (STAK-118)
- **Added**: CDN image URLs for obverse/reverse with dedicated table image column, settings toggle for obverse/reverse/both, and card view thumbnails (STAK-118)
- **Added**: Mobile viewport overhaul — responsive breakpoints, touch-friendly controls, viewport scaling fixes (STAK-124, STAK-125, STAK-126)
- **Added**: Mobile summary cards — compact 2-col grid with spanning All Metals card (STAK-106)
- **Added**: Rows-per-page options (3/12/24/48/96/All) with floating back-to-top button and portal scroll override
- **Added**: CSV, JSON, and ZIP backup/restore now include obverse/reverse image URL fields
- **Changed**: Theme-aware sparkline colors — bold strokes and fills clearly visible on light, sepia, and dark themes
- **Changed**: Default card style set to Sparkline Header (A), default rows-per-page set to 12
- **Fixed**: Service worker DEV_MODE toggle for cache bypass during development

---

## [3.29.08] - 2026-02-15

### Fixed — Fix What's New Modal Showing Stale Version

- **Fixed**: What's New modal no longer shows stale version content after deployments — version check now uses `APP_VERSION` directly instead of potentially stale localStorage value
- **Fixed**: Service worker local asset strategy changed from cache-first to stale-while-revalidate so deployment updates propagate on next page load

---

## [3.29.07] - 2026-02-15

### Fixed — Fix Image Deletion in Edit Modal

- **Fixed**: Users can now properly remove uploaded photos from items via Remove button in edit modal — deletion intent flags ensure images are removed from IndexedDB on Save (STAK-120)
- **Fixed**: Orphaned user images are now cleaned up from IndexedDB when inventory items are deleted, preventing storage bloat (STAK-120)

---

## [3.29.06] - 2026-02-15

### Changed — STAK-115, STAK-116, STAK-117: Design System & Settings Polish

- **Changed**: Unified Settings toggle styles — replaced iOS-style switches with chip-sort-toggle pattern for Table Thumbnails, Numista Priority, and header shortcut settings (STAK-116)
- **Changed**: Redesigned Settings > Appearance tab with grouped fieldsets — Theme, Currency & Pricing, Image Display, and Custom Themes placeholder (STAK-115)
- **Added**: Living style guide (`style.html`) — standalone design system reference with theme switching, color token swatches, and all UI component samples (STAK-117)
- **Added**: CSS & Design System coding standards — token usage rules, toggle standard, button variants, settings group patterns (STAK-117)

---

## [3.29.05] - 2026-02-15

### Fixed — Post-Release Hardening & Seed Cache Fix

- **Fixed**: Seed data cache staleness — service worker now uses stale-while-revalidate for spot-history files so Docker poller updates reach users between releases
- **Fixed**: CoinFacts URL fallback for Raw/Authentic grades in View Modal cert badge (PR #161)
- **Fixed**: Purchased chart range clamped to minimum 1 day to avoid All-range collision (PR #161)
- **Fixed**: Verify promise unhandled rejection and window.open name sanitization (PR #161)
- **Fixed**: Keyboard activation (Enter/Space) added to cert badge buttons for accessibility (PR #161)
- **Fixed**: dailySpotEntries fallback on fetch failure, verify button visibility guard (PR #161)

---

## [3.29.04] - 2026-02-15

### Added — STAK-110, STAK-111, STAK-113: View Modal Visual Sprint

- **Added**: Certification badge overlay on View Modal images — authority-specific colors (PCGS, NGC, ANACS, ICG), clickable grade for cert lookup, verification checkmark with pass/fail states (STAK-113)
- **Added**: Chart range pills for 1Y, 5Y, 10Y, and Purchased (purchase date → present) with Purchased as default (STAK-113)
- **Changed**: View Modal default section order — Images first, then Valuation (STAK-110)
- **Added**: Purchase date in parentheses next to purchase total in Valuation section (STAK-111)
- **Fixed**: Date range picker "From" clearing not resetting "To" minimum constraint

---

## [3.29.03] - 2026-02-15

### Fixed — STAK-108, STAK-109, STAK-103: Price History Fixes & Chart Improvements

- **Fixed**: Goldback items recording $0.00 retail in price history — added 3-tier retail hierarchy lookup with `getGoldbackRetailPrice()` (STAK-108)
- **Fixed**: API sync timing — Goldback denomination prices now update before price history snapshots are recorded (STAK-108)
- **Added**: Per-item price history modal with inline delete and undo/redo from Edit Modal retail price field (STAK-109)
- **Added**: Delete buttons on Settings > Price History table with change log integration (STAK-109)
- **Fixed**: All-time chart showing only ~1 year on file:// protocol — 749KB seed bundle loaded via `<script>` tag bypasses Chrome fetch restrictions
- **Added**: Adaptive x-axis year labels — decade+ ranges show compact 2-digit year, multi-year ranges show two-line date+year
- **Added**: Custom date range picker on Item View chart with cross-constrained from/to inputs (STAK-103)
- **Fixed**: WCAG accessibility — date input font-size increased from 0.6rem to 0.75rem
- **Fixed**: Async chart error handling with graceful fallback on fetch failure

---

## [3.29.02] - 2026-02-15

### Fixed — PWA Crash Fix: Service Worker Error Handling

- **Fixed**: Navigation fetch handler crash in installed PWAs — added 3-tier fallback (cached index.html → cached root → inline offline page) so `respondWith()` never receives a rejected promise
- **Fixed**: `fetchAndCache`, `cacheFirst`, and `networkFirst` strategy functions now catch network/cache failures instead of propagating rejections
- **Fixed**: Install event failures are now logged with detailed error information to make SW install issues diagnosable

---

## [3.29.01] - 2026-02-15

### Changed — Codacy Duplication Reduction

- **Changed**: Extracted `wireFeatureFlagToggle` and `wireChipSortToggle` helpers to deduplicate 6 identical chip toggle handlers across settings.js and events.js
- **Changed**: Merged `renderInlineChipConfigTable` into generic `_renderSectionConfigTable` with `emptyText` option
- **Changed**: Extracted `buildItemFields` helper to deduplicate item field listings in add/edit paths
- **Changed**: Extracted `closeItemModal` to deduplicate cancel/close button handlers
- **Removed**: Unused Numista Query and N# form fields from pattern image rule form

---

## [3.29.00] - 2026-02-15

### Added — Edit Modal Pattern Rule Toggle

- **Added**: "Apply to all matching items" checkbox in edit modal image upload — creates a pattern rule from keywords instead of saving a per-item image
- **Changed**: Extracted shared section config helpers to reduce code clones across layout/view modal settings

---

## [3.28.00] - 2026-02-14

### Added — Price History Chart Overhaul & View Modal Customization

- **Added**: Price history chart derives melt value from spot price history — every item gets a chart from day one
- **Added**: Chart range toggle pills (7d / 14d / 30d / 60d / 90d / 180d / All) with 30d default
- **Added**: Retail value line anchored from purchase date/price to current market value with sparse midpoint snapshots
- **Added**: Layered chart fills — purchase (red), melt (green), retail (blue) with transparency blending
- **Changed**: View modal section order: Images → Price History → Valuation → Inventory → Grading → Numista → Notes
- **Added**: Configurable view modal section order in Settings > Layout with checkbox + arrow reorder table

---

## [3.27.06] - 2026-02-14

### Added — Timezone Selection & PWA Fixes

- **Added**: Display timezone selector in Settings > System — all timestamps respect user-chosen timezone while stored data stays UTC (STAK-63)
- **Fixed**: Spot card and history timestamps displayed UTC values regardless of browser timezone — bare UTC strings now parsed correctly (STAK-63)
- **Fixed**: PWA installed app failed to load on second launch — absolute start_url and navigation-aware service worker
- **Fixed**: What's New splash re-triggering from stale SW cache + missing ESC handler (STAK-93)

---

## [3.27.05] - 2026-02-14

### Added — Numista Bulk Sync & IDB Cache Fix

- **Added**: Numista Bulk Sync — metadata + image syncing from API card with inline stats, progress, and activity log (STAK-87, STAK-88)
- **Changed**: Moved image cache controls from Settings > System into the Numista API card as "Bulk Sync"
- **Fixed**: Opaque blob IDB corruption — images disappeared after bulk cache on HTTPS (STAK-87)
- **Fixed**: Empty blob safety guard in getImageUrl() prevents blocking CDN fallback
- **Added**: Table row thumbnail images with hover preloading (STAK-84)

---

## [3.27.04] - 2026-02-14

### Added — Spot Comparison Mode & Mobile API Settings

- **Added**: User setting for 24h % comparison mode — Close/Close, Open/Open, Open/Close (STAK-92)
- **Changed**: Replaced drag-to-sort provider tabs with explicit Sync Priority dropdowns that work on all devices (STAK-90)
- **Changed**: Provider tabs now scroll horizontally on mobile instead of overflowing (STAK-90)
- **Removed**: Sync Mode toggle (Always/Backup) — replaced by priority numbers (STAK-90)
- **Fixed**: Cache-bust favicon and add root-level copies for PWA
- **Fixed**: Consistent 24h % across all spot card views (STAK-89)
- **Changed**: Extract fetchAndCache helper in service worker

---

## [3.27.03] - 2026-02-14

### Added — PWA Support & Bug Fixes

- **Added**: PWA support — manifest.json, service worker with offline caching, installable app experience (STAK-74)
- **Added**: PWA icons (192×192, 512×512) and Apple mobile web app meta tags
- **Fixed**: `parsePriceToUSD` now preserves existing price when edit field is left empty instead of zeroing it (STAK-81)
- **Fixed**: Date change in add/edit form now clears stale spot-lookup override price (STAK-82)
- **Fixed**: Activity Log sub-tabs (spot history, catalog history, price history) now re-render on every switch instead of showing stale data (STAK-83)
- **Fixed**: Item detail modal layout on Samsung S24+ Ultra — raised breakpoint from 400px to 480px for single-column grid (STAK-85)
- **Removed**: Redundant View (eye) icon from table action column — item name click already opens view modal (STAK-86)
- **Added**: Spot history seed data for Jan 2 – Feb 14, 2026 (32 dates × 4 metals) from Docker poller infrastructure
- **Changed**: Spot history and spot lookup display "Seed" label for seed-sourced entries

---

## [3.27.02] - 2026-02-13

### Changed — Multi-Color Storage Bar

- **Changed**: Footer storage bar now shows localStorage (blue) and IndexedDB (green) as stacked segments with color legend dots
- **Changed**: Storage text displays per-source breakdown (LS KB + IDB KB) with combined total
- **Changed**: Hover tooltips on bar segments show individual source limits

---

## [3.27.01] - 2026-02-13

### Fixed — Iframe to Popup Window Migration

- **Fixed**: Source URL and N# Numista links in view modal now open in popup windows instead of iframe overlays — external sites block iframe embedding via X-Frame-Options headers
- **Removed**: Iframe popup modal HTML and CSS (replaced by standard window.open popups)

---

## [3.27.00] - 2026-02-13

### Added — Coin Image Cache & Item View Modal

- **Added**: IndexedDB image cache (`js/image-cache.js`) — fetches, resizes, and stores Numista coin images with 50MB quota and graceful `file://` degradation
- **Added**: Item view modal (`js/viewModal.js`) with coin images, inventory data, valuation, grading, and Numista enrichment — opens via item name click or card tap
- **Added**: Numista metadata caching with 30-day TTL — denomination, shape, diameter, thickness, orientation, composition, technique, references, rarity, mintage, edge, tags, and commemorative info
- **Added**: Settings toggles for 15 Numista view modal fields in API settings panel
- **Added**: View (eye) button in table/card actions, card tap opens view modal on mobile
- **Added**: Clickable source URLs and N# Numista badges open in 1250px popup windows
- **Added**: IndexedDB storage reporting in settings footer (LS + IDB) and storage report modal
- **Added**: Search eBay button in view modal footer
- **Added**: `COIN_IMAGES` feature flag (beta) gating entire image/view system
- **Changed**: All popup windows widened from 1200px to 1250px
- **Changed**: Full-screen view modal on mobile with sticky footer, safe-area insets, and 44px touch targets
- **Changed**: Rectangular image frames for bars, notes, and Aurum/Goldback items in view modal

---

## [3.26.03] - 2026-02-13

### Fixed — STAK-79, STAK-80: XSS & HTML Injection Hardening

- **Fixed**: DOM XSS in Price History table — item names now escaped via `escapeHtml()` before innerHTML interpolation (STAK-79)
- **Fixed**: HTML injection in Spot History table — metal, source, and provider fields now escaped (STAK-80)
- **Fixed**: HTML injection in Spot Lookup modal — source and data attributes now escaped (STAK-80)
- **Added**: Shared `escapeHtml()` utility in `utils.js` for consistent XSS prevention across modules

---

## [3.26.02] - 2026-02-13

### Fixed — Autocomplete Migration & Version Check CORS

- **Fixed**: One-time migration auto-enables `FUZZY_AUTOCOMPLETE` for users who had it silently disabled before the settings toggle existed
- **Fixed**: Version check CORS failure — `staktrakr.com` 301 redirects to `www.staktrakr.com` without CORS headers; updated URL to skip redirect

---

## [3.26.01] - 2026-02-13

### Added — Fuzzy Autocomplete Settings Toggle

- **Added**: Fuzzy autocomplete On/Off toggle in Settings > Filter Chips panel
- **Fixed**: Autocomplete feature flag not discoverable — persisted disabled state had no UI to re-enable

---

## [3.26.00] - 2026-02-13

### Added — STAK-62: Autocomplete & Fuzzy Search Pipeline

- **Added**: Autocomplete dropdown on Name, Purchase Location, and Storage Location form inputs — suggestions from inventory + prebuilt coin database (STAK-62)
- **Added**: Abbreviation expansion in search — "ASE", "AGE", "kook", "krug" etc. match full coin names (STAK-62)
- **Added**: Fuzzy search fallback — approximate matches shown with indicator banner when exact search returns no results (STAK-62)
- **Added**: `registerName()` dynamically adds new item names to autocomplete suggestions (STAK-62)
- **Fixed**: Firefox autocomplete suppression using non-standard attribute value (STAK-62)
- **Fixed**: Autocomplete cache invalidated on inventory save, clear, and boating accident (STAK-62)
- **Changed**: `FUZZY_AUTOCOMPLETE` feature flag promoted to stable (STAK-62)

---

## [3.25.05] - 2026-02-13

### Added — STAK-71: Details modal QoL — responsive charts, slice labels, scrollable breakdown

- **Added**: Pie chart percentage labels via chartjs-plugin-datalabels — slices ≥5% show percentage directly on the chart (STAK-71)
- **Added**: Sticky metric toggle (Purchase/Melt/Retail/Gain-Loss) stays visible while scrolling the modal body (STAK-71)
- **Fixed**: Details modal overflow cascade — breakdowns no longer clipped off-screen at any viewport size (STAK-71)
- **Fixed**: Chart container uses `aspect-ratio: 1` for circular pie charts instead of rigid 300px height (STAK-71)
- **Fixed**: ResizeObserver memory leak — observer now disconnected on modal close (STAK-71)
- **Fixed**: Sepia theme chart colors — tooltips now use correct background/text colors for all 4 themes (STAK-71)
- **Fixed**: Allow clearing optional form fields on edit
- **Removed**: Dead CSS chart-height rules at ≤768px/≤640px/≤480px (already hidden by STAK-70)

---

## [3.25.04] - 2026-02-12

### Added — STAK-70: Mobile-optimized modals

- **Added**: Full-screen modals at ≤768px using `100dvh` with `100vh` fallback — all primary modals fill the viewport on mobile (STAK-70)
- **Added**: Settings sidebar 5×2 tab grid replacing horizontal scroll — all 10 tabs visible simultaneously (STAK-70)
- **Added**: Touch-sized inputs (44px min-height) and stacked action buttons in add/edit item modal (STAK-70)
- **Added**: Landscape card view for touch devices 769–1024px via `pointer: coarse` detection and `body.force-card-view` class (STAK-70)
- **Added**: 2-column card grid for portrait ≤768px in landscape orientation (STAK-70)
- **Changed**: Pie charts and metric toggle hidden on mobile in details modal — Chart.js creation skipped entirely for performance (STAK-70)
- **Changed**: Bulk edit modal stacks vertically with full-screen integration and touch-sized inputs (STAK-70)
- **Changed**: `updateColumnVisibility()` extended to apply `.force-card-view` for landscape touch devices (STAK-70)
- **Changed**: `updatePortalHeight()` clears max-height for `.force-card-view` card layout (STAK-70)
- **Fixed**: Small utility modals (notes, API info, storage options, cloud sync) remain as centered popups, not full-screen (STAK-70)

---

## [3.25.03] - 2026-02-12

### Added — STAK-38/STAK-31: Responsive card view & mobile layout

- **Added**: CSS card view at ≤768px — inventory table converts to flexbox cards with name title, horizontal chips, metal subtitle, 2-column financial grid, and centered touch-friendly action buttons (44px targets per Apple HIG) (STAK-31)
- **Added**: `data-label` attributes on all `<td>` elements for card view `::before` labels (STAK-31)
- **Added**: Card tap-to-edit — tapping card body opens edit modal; buttons/links work normally (STAK-31)
- **Added**: Details modal fixes at ≤640px — single-column breakdown grid, 150px chart, stacked panels (STAK-38)
- **Added**: Short-viewport portal scroll cap at ≤500px height for 300% zoom scenarios (STAK-38)
- **Changed**: Consolidated 3 duplicate responsive table CSS sections into single canonical block (STAK-38)
- **Changed**: `updateColumnVisibility()` skips at ≤768px — card CSS handles visibility (STAK-38)
- **Changed**: `updatePortalHeight()` clears max-height at ≤768px — cards scroll naturally (STAK-38)
- **Fixed**: Footer badges wrap on mobile instead of overflowing card
- **Fixed**: Filter chips stay horizontal and wrap instead of stacking vertically at narrow widths
- **Fixed**: Header logo scales to fill mobile width with centered action buttons below

---

## [3.25.02] - 2026-02-12

### Fixed — STAK-68: Goldback spot lookup fix

- **Fixed**: Spot price lookup now applies Goldback formula (`2 × (goldSpot / 1000) × modifier × denomination`) instead of raw gold spot for purchase price (STAK-68)

---

## [3.25.01] - 2026-02-12

### Fixed — STAK-64: Version splash content source

- **Fixed**: Version splash modal now shows user-friendly "What's New" announcements instead of raw changelog entries (STAK-64)
- **Removed**: ~270 lines of embedded changelog data from `versionCheck.js` — content now sourced from `loadAnnouncements()` shared with the About modal

### Added — STAK-67: Remote version check badge

- **Added**: Footer version badge shows installed version with link to GitHub releases (STAK-67)
- **Added**: Remote version check fetches `version.json` from staktrakr.com with 24hr cache (STAK-67)
- **Added**: Badge upgrades to green "up to date" or amber "available" on hosted deployments (STAK-67)
- **Added**: `version.json` at project root for self-hosted version checking
- **Changed**: Footer `staktrakr.com` text is now a clickable link

---

## [3.25.00] - 2026-02-12

### Added — STAK-54, STAK-66: Appearance settings, spot lookup & sparkline improvements

- **Added**: Header quick-access buttons — theme cycle and currency picker dropdown (STAK-54)
- **Added**: Layout visibility toggles — show/hide spot cards, totals, search bar, inventory table (STAK-54)
- **Added**: Settings nav item and panel for Layout controls (STAK-54)
- **Added**: 1-day sparkline shows yesterday→today trend with daily-averaged data points (STAK-66)
- **Added**: 15-minute and 30-minute API cache timeout options for more frequent spot refreshes
- **Fixed**: Spot lookup "Use" button now updates visible Purchase Price field with currency conversion (STAK-65)
- **Fixed**: Clearing Retail Price field during editing now correctly reverts to melt value
- **Fixed**: Spot lookup price rounded to nearest cent
- **Fixed**: Sparkline Y-axis scaling and curve overshoot on 1-day view

---

## [3.24.06] - 2026-02-12

### Changed — STAK-56: Cyclomatic complexity reduction (batch 1 & 2)

- **Refactored**: `renderLogTab` — switch → dispatch map (CCN 9 → ~2)
- **Refactored**: `coerceFieldValue` — if-chain → dispatch map (CCN 13 → ~2)
- **Refactored**: `toggleGbDenomPicker` — extract `showEl` helper, drop redundant fallback (CCN 11 → ~7)
- **Refactored**: `renderItemPriceHistoryTable` — extract `preparePriceHistoryRows` and `attachPriceHistorySortHeaders` (CCN 11 → ~6)
- **Refactored**: `setupNoteAndModalListeners` — new `optionalListener` helper eliminates 16 if-guards, extract `dismissNotesModal` (CCN 17 → ~1)
- **Refactored**: `setupImportExportListeners` — new `setupFormatImport` triad helper, split into `setupVaultListeners` + `setupDataManagementListeners` (CCN 27 → ~3)
- **Added**: `optionalListener` utility — null-safe listener attachment without console.warn spam
- **Added**: `setupFormatImport` utility — reusable override/merge/file-input import triad
- **Net**: −301 lines from `events.js`, 6 of 9 Lizard violations resolved

---

## [3.24.05] - 2026-02-12

### Fixed — Code cleanup and minor fixes

- **Fixed**: `debugLog('warn', ...)` in custom API validation now uses `console.warn()` (debugLog has no level support)
- **Removed**: Unused `columns` parameter from `buildBulkItemRow()` in Bulk Edit
- **Fixed**: Stale `Updated:` comment on APP_VERSION docblock

---

## [3.24.04] - 2026-02-12

### Fixed — STAK-55: Bulk Editor retains selected items after close/reopen

- **Fixed**: Bulk Editor now starts with a clean selection every time it opens (STAK-55)
- **Removed**: `bulkEditSelection` localStorage persistence — selection no longer carries across sessions

---

## [3.24.03] - 2026-02-12

### Fixed — Goldback melt/retail/weight in Details Modal

- **Fixed**: Goldback melt values inflated 1000x in Details Modal — apply `GB_TO_OZT` conversion and denomination retail pricing

---

## [3.24.02] - 2026-02-11

### Added — STAK-44: Settings Log Tab Reorganization

- **Added**: Activity Log sub-tabs in Settings — Changelog, Metals, Catalogs, Price History (STAK-44)
- **Added**: Spot price history table with sortable columns (Timestamp, Metal, Spot Price, Source, Provider)
- **Added**: Catalog API call history table with failed entries highlighted in red
- **Added**: Per-item price history table with item name filter and sortable columns
- **Added**: Clear button with confirmation dialog for each log sub-tab
- **Added**: Lazy-rendering of sub-tab content on first activation

---

## [3.24.01] - 2026-02-11

### Fixed — Codacy code quality cleanup

- **Fixed**: Convert 8 `innerHTML` assignments to `textContent` where content is plain text from `formatCurrency()`
- **Fixed**: Remove stale `eslint-disable-line` comments referencing unloaded security plugin
- **Changed**: Add PMD `ruleset.xml` to exclude false-positive `InnaccurateNumericLiteral` rule
- **Changed**: Add `nosemgrep` suppression for 30 legitimate `innerHTML` uses in client-side rendering

---

## [3.24.00] - 2026-02-11

### Added — STAK-50: Multi-Currency Support

- **Added**: Multi-currency display with 17 supported currencies and exchange rate conversion (STAK-50)
- **Added**: Daily exchange rate fetching from open.er-api.com with localStorage caching and hardcoded fallback rates
- **Added**: Dynamic currency symbols in add/edit modal, Goldback denomination settings, and CSV export headers
- **Added**: Dynamic Gain/Loss labels — green "Gain:" or red "Loss:" on totals cards
- **Fixed**: Sticky header bleed-through when hovering table rows in first 4 columns
- **Fixed**: Codacy false positives via .eslintrc.json

---

## [3.23.02] - 2026-02-11

### Added — STAK-52: Bulk Edit pinned selections

- **Added**: Bulk Edit pinned selections — selected items stay visible at the top of the table when the search term changes (STAK-52)
- **Changed**: Extracted shared search filter helper and added master checkbox indeterminate state in Bulk Edit
- **Removed**: Dormant rEngine/rSynk/AI prototype files and references

---

## [3.23.01] - 2026-02-11

### Added — Goldback real-time estimation, Settings reorganization

- **Added**: Goldback real-time price estimation from gold spot (STAK-52)
- **Added**: User-configurable estimation premium modifier
- **Changed**: Settings sidebar — renamed Theme to Appearance, Tools to System
- **Changed**: Default estimation formula to pure 2x spot (modifier = 1.0)

---

## [3.23.00] - 2026-02-11

### Added — STAK-45: Goldback denomination pricing & type support

- **Added**: New `gb` weight unit option — Goldbacks stored as denomination value (1 gb = 0.001 ozt 24K gold)
- **Added**: New `js/goldback.js` module — save/load/record for manual denomination pricing
- **Added**: Settings > Goldback tab — enable/disable toggle, denomination price table, reference link
- **Added**: Goldback price history logging — timestamped data points per denomination on each save
- **Added**: `GOLDBACK_DENOMINATIONS` lookup table (0.5, 1, 2, 5, 10, 25, 50, 100 gb) with gold content
- **Added**: Denomination picker — swaps weight input for a select dropdown when gb unit is selected
- **Added**: Goldback Price History modal — filterable, sortable table with CSV export
- **Added**: Quick Fill — enter 1 Goldback rate to auto-calculate all denomination prices
- **Added**: Goldback exchange rate link opens in popup window (matches eBay pattern)
- **Added**: Bulk Edit — new Weight Unit field (oz/g/gb) for batch-converting items
- **Changed**: `computeMeltValue()` converts gb→ozt before spot multiplication
- **Changed**: `formatWeight()` accepts optional `weightUnit` param, displays "5 gb" for Goldback items
- **Changed**: Retail hierarchy updated: gb denomination > manual marketValue > melt (denomination pricing is authoritative for gb items)
- **Changed**: Bulk Edit weight column shows formatted weight with unit suffix
- **Changed**: CSV, ZIP CSV, and PDF exports include "Weight Unit" column
- **Changed**: CSV import reads "Weight Unit" column, defaults to 'oz'
- **Changed**: ZIP backup/restore includes goldback prices, price history, and enabled toggle
- **Changed**: Edit/duplicate item modal pre-fills gb weight unit correctly
- **Fixed**: Retail column and gain/loss display conditions now include gb denomination pricing
- **Fixed**: CSV, ZIP CSV, and PDF exports apply 3-tier retail hierarchy (manual > gb > melt)
- **Fixed**: Bulk edit denomination picker now applies correct weight value (was reading stale hidden input)

### Added — STAK-42: Persistent UUIDs for inventory items

- **Added**: Stable UUID v4 field on every inventory item — survives delete, reorder, and sort
- **Added**: `generateUUID()` helper with `crypto.randomUUID()` and RFC 4122 fallback for `file://`
- **Added**: Automatic UUID migration for existing items on load (no data loss)
- **Changed**: CSV, JSON, ZIP, and PDF exports now include UUID column
- **Changed**: CSV, JSON imports preserve existing UUIDs, generate for items without
- **Changed**: Bulk copy and add-item assign new UUIDs; edit preserves existing UUID
- **Fixed**: `sanitizeImportedItem()` safety net ensures no item lacks a UUID

### Added — STAK-43: Silent per-item price history recording

- **Added**: New `js/priceHistory.js` module — silently records timestamped retail/spot/melt data points per item
- **Added**: `item-price-history` localStorage key with UUID-keyed object structure
- **Added**: Recording triggers on item add, edit, inline edit, bulk edit, bulk copy, and spot price sync
- **Added**: Dedup rules — 24h throttle for spot-sync, 1% delta threshold, exact-duplicate suppression
- **Added**: ZIP backup includes `item_price_history.json`; restore uses union merge (not replace)
- **Added**: Vault backup/restore auto-included via `ALLOWED_STORAGE_KEYS`
- **Added**: `purgeItemPriceHistory()` and `cleanOrphanedItemPriceHistory()` for future storage management

---

## [3.22.01] - 2026-02-10

### Added — Form layout, bulk edit dropdowns, purity chips

- **Purity form layout**: Weight/Purity/Qty on single row
- **Bulk Edit**: Purity, Grade, Grading Authority as dropdowns
- Purity/fineness filter chips (enabled) and inline chips (disabled)
- Purity inline chip shows numerical value only

---

## [3.22.00] - 2026-02-10

### Added — STAK-22/24/25/27: Purity, PCGS quota, chart toggle, extraction

- **Added**: Purity (fineness) field — adjusts melt value formula across all calculation sites (STAK-22)
- **Added**: PCGS API daily quota usage bar in Settings (STAK-24)
- **Added**: Pie chart metric toggle — switch between Purchase, Melt, Retail, and Gain/Loss views (STAK-27)
- **Changed**: Extracted inline test loader to js/test-loader.js (STAK-25)
- **Changed**: CSV, PDF, and ZIP exports now include Purity column
- **Changed**: Seed data includes realistic purity values for sample items

---

## [3.21.03] - 2026-02-10

### Added — STAK-23: Search matches custom chip group labels

- **Fixed**: Search now matches items belonging to custom chip groups when searching by group label (STAK-23)

---

## [3.21.02] - 2026-02-10

### Added — Seed data, sample inventory & README overhaul

- **Seed spot history**: 6 months of baked-in price data (720 entries, 4 metals) — sparklines and price cards work from day one
- **Sample inventory**: 8 pre-configured items (3x ASE, 3x Gold Maple, Platinum Round, Palladium Bar) with grades, Numista IDs, and filter chips
- **Seed timestamp**: Spot cards show 'Seed · date' with shift+click hint for seeded users
- **Metals History**: Seed entries visible in history modal with StakTrakr source label
- **README overhaul**: Hero screenshot, feature showcase, Getting Started guide
- **Seed generator**: generate-seed-data.py processes CSV exports into seed JSON + embedded JS

---

## [3.21.01] - 2026-02-09

### Added — PCGS Verified Persistence & Lookup Enhancements

- **Persist verified**: Green checkmark survives reload, sort, and filter — `pcgsVerified` stored in data model with JSON/ZIP round-trip
- **Lookup fields**: PCGS lookup populates Name and Retail Price from API response
- **Cert icon**: Verified checkmark next to Cert# label in edit modal with dark/sepia theme support
- **History logging**: PCGS verify/lookup calls logged to Catalog History via `recordCatalogHistory()`

### Fixed

- **Numista icon**: Search icon no longer stripped after "Searching..." state (`textContent` → `innerHTML`)
- **Export fix**: `pcgsNumber` and `pcgsVerified` added to JSON and ZIP exports (was missing)
- **History label**: Renamed "Numista History" → "Catalog History" to reflect multi-provider support

---

## [3.21.00] - 2026-02-09

### Added — PCGS# Catalog Number & Cert Verification

- **PCGS# field**: New optional PCGS catalog number input on add/edit form with (i) info icon linking to PCGS Number Lookup. PCGS# included in item data model, normalization, CSV/JSON/PDF export, CSV/JSON import, and ZIP backup round-trip
- **PCGS# inline chip**: Blue `PCGS#786060` badge in the Name cell (disabled by default — enable in Settings > Table). Click to open PCGS CoinFacts page in popup window. Config-driven ordering via existing inline chip system
- **PCGS cert verification API**: New Settings > API > PCGS tab for bearer token configuration (1,000 requests/day). Save, Test Connection, and Clear Token buttons. Token stored locally with base64 encoding matching Numista pattern
- **Verify icon on grade tag**: PCGS-graded items with cert number + configured API show a small checkmark icon inside the grade tag. Click to verify cert — displays grade, population, pop higher, and price guide value in tooltip. Green checkmark on success, red flash on failure
- **PCGS# in search**: Search bar and advanced filters now match against PCGS catalog numbers
- **PCGS# in bulk edit**: New "PCGS Number" field in Settings > Tools > Bulk Edit

---

## [3.20.00] - 2026-02-09

### Added — Bulk Edit Tool, Change Log Settings Tab & Focus Group Fixes

- **Bulk Edit tool**: Full-screen modal in Settings > Tools to select multiple inventory items and edit fields, copy, or delete in bulk. Two-column layout with enable/disable field toggles (16 editable fields) on the left and searchable item table with checkboxes on the right. Numista Lookup button fills bulk edit fields from catalog data. Selection persists across modal open/close via localStorage
- **Change Log Settings tab**: Change Log relocated from standalone modal to new Settings > Log tab. Main page Log button now opens Settings at the Log tab directly. Font size and padding reduced to match Table/Chips tabs
- **Full Numista ID on chips**: Numista chips now display `N#12345` (full ID) instead of just `N#`
- **Year chip click-to-filter**: Clicking a year chip in the Name column now applies a year column filter

### Fixed

- **Chip word boundary matching**: Custom group patterns like "AW" no longer match inside words like "Silawa" — uses `\b` word boundary regex instead of substring matching
- **Shift-click chip hide**: Right-click blacklist and context menu popups now properly clean up document click listeners, fixing the issue where shift-click hide only worked once

---

## [3.19.00] - 2026-02-09

### Added — Filter Chip Enhancements

- **Category toggles**: Enable, disable, and reorder 10 filter chip categories (Metals, Types, Names, Custom Groups, Dynamic Names, Purchase Location, Storage Location, Years, Grades, Numista IDs) in Settings > Chips. Disabled categories are hidden from the filter bar. Order persists via `filterChipCategoryConfig` in localStorage
- **Chip sort order**: Sort chips within each category by Name (A-Z) or Qty (High→Low) from new inline dropdown or Settings > Chips. Bidirectional sync between both controls. Persists via `chipSortOrder` in localStorage
- **Config-driven chip rendering**: `renderActiveFilters()` refactored from 10 hard-coded category blocks to a single data-driven loop using category descriptor map — adding future categories requires only 2 entries instead of a new code block

---

## [3.18.00] - 2026-02-09

### Changed — API Settings Redesign

- **Numista first-class tab**: Numista API promoted from appended section to pinned first tab in unified API Configuration panel
- **Drag-to-reorder provider priority**: Metals provider tabs are drag-and-drop reorderable — tab position determines sync priority (position 1 = primary provider). Order persists across sessions via `apiProviderOrder` in localStorage
- **Header status row**: Compact per-provider connection indicators with last-used timestamps replace the old status summary
- **Clickable quota bars**: Usage bars in provider cards are now clickable to open the quota editor — dedicated Quota buttons removed
- **Streamlined provider cards**: Removed "Batch Optimized" badges, batch savings calculations, "Provider Information" links, Default/Backup buttons, and API base URL display
- **Unified button layout**: Each provider card simplified to Save, Save and Test, Clear Key
- **Renamed header actions**: "Sync All" → "Sync Metals", "Flush Cache" → "Flush Metals Cache", "History" → "Metals History", plus new "Numista History" button in header
- **Auto-select default provider**: Provider priority determined by tab order instead of manual Default/Backup button clicks

---

## [3.17.00] - 2026-02-09

### Added — Inline Name Chips, Search Expansion & Backup Fix

- **Inline Name chip settings**: New Settings > Table panel to enable/disable and reorder 6 inline chip types (Grade, Numista, Year, Serial #, Storage Location, Notes Indicator) in the Name cell. Config-driven rendering replaces hard-coded chip order
- **Table settings section**: New sidebar tab in Settings for table display controls (Visible rows, Inline Name chips). Grouping section renamed to "Chips"
- **3 new inline chips**: Serial # (purple badge with serial number), Storage Location (muted badge with truncated location), and Notes Indicator (document icon when item has notes) — all disabled by default, enable in Settings > Table
- **Search expansion**: 6 new fields searchable — Year, Grade, Grading Authority, Cert Number, Numista ID, and Serial Number. Works in both search bar and advanced filter text matching

### Fixed

- **ZIP backup/restore**: chipCustomGroups, chipBlacklist, chipMinCount, featureFlags, and inlineChipConfig now included in ZIP backup and properly restored. Also restores itemsPerPage, sortColumn, and sortDirection (previously backed up but never restored)

---

## [3.16.02] - 2026-02-09

### Added

- **Edit custom grouping rules**: Pencil icon on each rule row enables inline editing of label and patterns without deleting and recreating. Supports Enter to save, Escape to cancel

### Changed

- **Filter chip threshold relocated**: Moved from Settings > Site to Settings > Grouping alongside related chip controls

---

## [3.16.01] - 2026-02-09

### Fixed — API Settings & Numista Usage Tracking

- **Cache timeout persistence**: Per-provider cache timeout settings now persist across page reloads. Previously `cacheTimeouts` was written by the UI but never saved to localStorage or read by `getCacheDurationMs()`
- **Historical data for non-default providers**: `historyDays` default changed from `0` to `30` so Metals-API and MetalPriceAPI fetch historical data on first sync instead of current-only prices
- **Auto-sync all configured providers**: Page refresh now syncs all providers with API keys and stale caches, not just the default provider

### Added

- **Standalone "Save" button per provider**: Save API key, cache timeout, and history settings without triggering a connection test or price fetch. Brief "Saved!" confirmation replaces the alert dialog
- **Numista API usage progress bar**: Tracks API calls persistently across page reloads with automatic monthly reset. Shows `X/2000 calls` in Settings > API > Numista section

---

## [3.16.00] - 2026-02-09

### Added — Custom Chip Grouping & Smart Grouping Blacklist

- **Custom grouping rules**: Define chip labels with comma/semicolon-separated name patterns to create user-defined filter chips (e.g., "Washington Quarter" matching "Washington Quarter, America The Beautiful Quarter"). Managed in Settings > Grouping
- **Chip blacklist**: Right-click any name chip to suppress it from the chip bar. Blacklisted chips can be restored in Settings > Grouping
- **Dynamic name chips**: Auto-extract text from parentheses `()` and double quotes `""` in item names as additional filterable chips. Skips grade strings (BU, MS-XX) and text under 3 characters
- **Grouping settings panel**: New Settings > Grouping section consolidates Smart Name Grouping toggle (moved from Site), Dynamic Chips toggle, Blacklist management, and Custom Rules management
- **`DYNAMIC_NAME_CHIPS` feature flag**: Toggle dynamic chip extraction on/off, with URL override support (`?dynamic_name_chips=0`)

### Changed

- **Smart Grouping toggle relocated**: Moved from Settings > Site to Settings > Grouping for better organization with related chip features

---

## [3.14.01] - 2026-02-09

### Fixed

- **Name column truncation**: Added `max-width: 340px` constraint so long item names properly truncate with ellipsis instead of pushing the table wider than the viewport
- **Numista N# chips compacted**: Inline catalog tags shortened from `N#298883` to just `N#` — full catalog number shown on hover tooltip
- **Action icons clipped**: Reduced icon button size (2.4rem → 1.6rem) and tightened gap (0.25rem → 0.1rem) so Edit/Copy/Delete buttons fit within the Actions column without overflow

---

## [3.14.00] - 2026-02-09

### Added — Encrypted Portable Backup (.stvault)

- **Encrypted backup export**: New "Export Encrypted Backup" button in Settings > Files creates a password-protected `.stvault` file containing all inventory data, settings, API keys, and price history using AES-256-GCM encryption
- **Encrypted backup import**: "Import Encrypted Backup" reads a `.stvault` file, decrypts with the user's password, and restores all data with a full UI refresh
- **Password strength indicator**: Live strength bar (Weak → Very Strong) and password match validation in the vault modal
- **Crypto fallback**: Uses native Web Crypto API (PBKDF2 + AES-256-GCM); falls back to forge.js (~87KB) for Firefox on `file://` protocol where `crypto.subtle` is unavailable
- **Binary vault format**: 56-byte header (magic bytes, version, PBKDF2 iterations, salt, IV) followed by authenticated ciphertext — portable across devices and browsers

---

## [3.12.02] - 2026-02-08

### Fixed

- **NGC cert lookup**: Cert tag click now opens NGC with query params (`CertNum`, `Grade`, `lookup`) so the actual coin details display instead of the blank lookup form
- **Name column overflow**: Long item names no longer push Source and Actions columns off-screen. Name text truncates with ellipsis; Year, N#, and Grade tags always stay visible via flex layout
- **"- Route 66" chip**: Leading dash/punctuation stripped from normalized chip names after suffix removal
- **Source column display**: URL-like sources (e.g., "apmex.com") now display the domain name only ("apmex") with a link icon; plain text sources show without icon

### Added

- **"Lunar Series" chip**: Items with "Year of the" in the name (e.g., "Year of the Dragon") now group under a "Lunar Series" filter chip
- **Numista Sets support**: New "Set" inventory type with purple color. Numista S-prefix IDs (e.g., S4203) route to the correct `set.php` URL pattern instead of `pieces{ID}.html`

---

## [3.12.01] - 2026-02-08

### Fixed — Sticky header

- **Sticky header fix**: Column headers now correctly pin at the top of the scrollable table during vertical scroll. Removed inline `position: relative` set by column-resize JS that overrode CSS `position: sticky` on all non-Actions headers
- **Scroll container fallback**: Portal scroll container now has a CSS `max-height: 70vh` fallback so sticky headers work even before JS measures exact row heights
- **Specificity fixes**: Removed `position: relative` from `th[data-column="purchasePrice"]` and `th.icon-col` CSS rules that outranked the sticky rule
- **Overflow fix**: `.table-section` now uses `overflow: visible` to prevent base `section{overflow:hidden}` from creating a competing scroll context

---

## [3.12.00] - 2026-02-08

### Feature — Portal View (Scrollable Table)

#### Added

- **Portal view**: Inventory table now renders all items in a scrollable container with sticky column headers — replaces slice-based pagination
- **Visible rows control**: Dropdown (10 / 15 / 25 / 50 / 100) sets the viewport height of the scrollable table; users scroll to see remaining items
- **Sticky headers**: Column headers stay pinned at the top during vertical scroll via CSS `position: sticky`

#### Changed

- **"Items per page" → "Visible rows"**: Label updated in both the table footer dropdown and the Settings modal
- **Table footer simplified**: Item count + visible-rows dropdown only; pagination bar (first/prev/1/2/3.../next/last) removed entirely

#### Removed

- **Pagination controls**: `calculateTotalPages()`, `renderPagination()`, `goToPage()` functions removed from `pagination.js`
- **Placeholder rows**: Empty padding rows no longer rendered to maintain fixed table height
- **`currentPage` state**: Page tracking variable and all associated resets removed from state, events, search, filters, and settings modules
- **Pagination CSS**: All `.pagination-*` rules and responsive overrides deleted

---

## [3.11.00] - 2026-02-08

### Feature — Unified Settings Modal

#### Added

- **Settings modal**: Consolidated API, Files, and Appearance into a single near-full-screen modal with sidebar navigation (Site, API, Files, Cloud, Tools)
- **Settings button**: Gear icon replaces API, Files, and Theme buttons in the header — now just About + Settings
- **Theme picker**: 3-button theme selector (Light, Dark, Sepia) in Site Settings replaces the cycling toggle button
- **Items per page persistence**: Items-per-page setting now persists to localStorage via `ITEMS_PER_PAGE_KEY` — no longer resets to 25 on reload
- **Tabbed API providers**: API provider configuration uses tabbed panels (Metals.dev | Metals-API | MetalPriceAPI | Custom) instead of scrollable list
- **Settings footer**: Storage usage and app version displayed in the modal footer bar
- **Cloud & Tools placeholders**: Sidebar sections ready for future BYO-Backend sync and bulk operations
- **Bidirectional control sync**: Filter chip threshold and smart name grouping controls sync between inline controls and Settings modal

#### Changed

- **Header simplified**: 4 header buttons (About, API, Files, Theme) reduced to 2 (About, Settings)
- **API providers inline**: Provider configuration moved from separate `apiProvidersModal` into tabbed panels within the API section
- **Backup reminder**: Now opens Settings → Files section instead of standalone Files modal

#### Removed

- **`apiModal`**: Standalone API modal replaced by Settings → API section
- **`filesModal`**: Standalone Files modal replaced by Settings → Files section
- **`apiProvidersModal`**: Standalone providers modal replaced by inline tabbed panels
- **`appearanceBtn`**: Theme cycling button replaced by Settings → Site → Theme picker

## [3.10.01] - 2026-02-08

### Fix — Numista iframe blocked on hosted sites + column sort regression

#### Fixed

- **Numista iframe → popup**: Numista sets `X-Frame-Options: SAMEORIGIN`, which blocks iframe embedding on hosted deployments (worked on `file://` but not `www.staktrakr.com`). Replaced the iframe modal with a popup window that works everywhere. Removed modal HTML, iframe CSS, and navigation history code
- **Gain/Loss and Source column sorting**: Skip guard used `headers.length - 3` from when Edit/Notes/Delete were 3 separate columns — after merging into a single Actions column, Gain/Loss (index 9) and Source (index 10) were incorrectly skipped. Fixed to `headers.length - 1`
- **Gain/Loss and Source column resizing**: Same `length - 3` guard also blocked resize handles on these columns

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

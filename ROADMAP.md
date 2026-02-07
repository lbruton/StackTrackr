# StakTrakr Roadmap

Project direction and planned work for the StakTrakr precious metals inventory tracker.

---

## Completed

### Increment 1 — Portfolio Table Redesign
- Reduced table from 17 to 15 columns by replacing 6 legacy columns (Spot, Premium/oz, Total Premium, Market Value, Collectable, Collectable Value) with 3 computed columns (Melt Value, Retail, Gain/Loss)
- Introduced three-value portfolio model: Purchase / Melt / Retail with computed Gain/Loss
- Added inline editing support for retail price with manual override
- Streamlined form modals and summary cards for the new layout
- Removed collectable toggle from filters, search, events, and sorting

### Increment 2 — Table Polish
- Removed Numista (N#) column from table view (15 to 14 columns); kept in modals, data model, and exports
- Fixed header font inconsistency where price column headers rendered in monospace instead of system font
- Consolidated three conflicting CSS rulesets for action columns (Notes/Edit/Delete) into one authoritative set
- Fixed invalid CSS (`text-overflow: none` to `text-overflow: clip`)
- Created this roadmap

### Increment 3 — Unified Add/Edit Modal
- Merged `#addModal` and `#editModal` into a single `#itemModal` that switches between "add" and "edit" mode via `editingIndex`
- Fixed critical bug: edit modal was missing the weight unit `<select>` — used a fragile `dataset.unit` attribute invisible to the user. Now both modes share the real `<select id="itemWeightUnit">`
- Fixed price preservation: empty price field in edit mode now preserves existing purchase price instead of zeroing it out
- Fixed weight precision: `toFixed(2)` → `toFixed(6)` for stored troy oz values — sub-gram weights (e.g., 0.02g Goldbacks = 0.000643 ozt) were being rounded to zero, causing validation failures
- Removed ~100 lines of duplicated edit modal HTML, ~20 duplicate element declarations, ~20 duplicate element lookups
- Consolidated two separate form submit handlers into one unified handler with `isEditing` branch
- Files: `index.html`, `js/state.js`, `js/init.js`, `js/events.js`, `js/inventory.js`, `css/styles.css`, `js/utils.js`
- Fixed weight precision: `toFixed(2)` → `toFixed(6)` for stored troy oz values — sub-gram weights (e.g., 0.02g Goldbacks = 0.000643 ozt) were being rounded to zero, causing validation failures
- Fixed $0 purchase price display: items with price=0 (free/promo) now show `$0.00` instead of a dash, and gain/loss correctly computes full melt as gain
- Fixed qty-adjusted financials: Retail, Gain/Loss, and summary totals now multiply per-unit `marketValue` and `price` by `qty`. Previously showed single-unit values for multi-qty line items
- Fixed gain/loss sort order: `js/sorting.js` cases 8 (Retail) and 9 (Gain/Loss) now use qty-adjusted totals matching the display
- Fixed spot price card colors: `updateSpotCardColor()` in `js/spot.js` now compares against the last API/manual entry with a different price, so direction arrows (green ▲ / red ▼) persist across page refreshes instead of always resetting to orange =

### Increment 4 — Date Bug Fix + Numista API Key Simplification
- Fixed `formatDisplayDate()` UTC midnight bug — dates entered as "2024-01-15" no longer display as "Jan 14, 2024" in US timezones. Parses `YYYY-MM-DD` string directly via `split('-')` instead of using `new Date()`
- Removed non-functional `CryptoUtils` AES-256-GCM encryption class (~115 lines) from `js/catalog-api.js` — replaced with base64 encoding matching the metals API key pattern
- Added `catalog_api_config` to `ALLOWED_STORAGE_KEYS` in `js/constants.js` — the missing whitelist entry was causing `cleanupStorage()` to delete saved Numista config on every page load
- Removed encryption password field from Numista settings UI, added Numista API signup link
- Files: `js/utils.js`, `js/catalog-api.js`, `js/constants.js`, `index.html`

### Increment 5 — Fraction Input + Duplicate Item Button + Notes Column Removal
- Added `parseFraction()` utility in `js/utils.js` — parses `1/1000`, `1 1/2`, and plain decimals. Changed weight input from `type="number"` to `type="text"` with `inputmode="decimal"` to allow `/` character entry
- Added duplicate item button (copy icon) to table action column between Edit and Delete. `duplicateItem()` function in `js/inventory.js` opens unified `#itemModal` in add mode pre-filled from source item, date defaults to today, qty resets to 1, serial clears
- Removed Notes icon column from table (15 → 14 columns). Notes remain in add/edit modal
- Fixed sticky column CSS: added `right:` offset for duplicate column, removed orphaned notes sticky rule, fixed `background: transparent` override that broke sticky header backgrounds
- Files: `js/utils.js`, `js/events.js`, `js/inventory.js`, `index.html`, `css/styles.css`

---

## Next Session (Priority)

- ~~**BUG: Table dates off by one day**~~ — **DONE (Increment 4)**: `formatDisplayDate()` now parses the `YYYY-MM-DD` string directly via `split('-')` — no `Date` constructor, no timezone ambiguity
- **About modal overhaul** — update GitHub repository URLs to match new location, review and clean up the version/changelog display process, ensure all links are functional and information is current
- **Full UI review walkthrough** — hands-on walk-through of the entire application UI after Increments 1 and 2, cataloging visual issues, layout inconsistencies, and UX friction before proceeding with further feature work
- ~~**Fix spot price change indicator**~~ — **DONE (Increment 3)**: `updateSpotCardColor()` now compares against the most recent API/manual entry with a *different* price, so direction arrows persist across page refreshes instead of always resetting to orange
- ~~**Numista API key storage broken**~~ — **DONE (Increment 4)**: Removed non-functional AES-256-GCM encryption (`CryptoUtils` class), simplified to base64 encoding matching the metals API key pattern. Added `catalog_api_config` to `ALLOWED_STORAGE_KEYS` so the key persists across page loads. Removed password field from settings UI
- **CRITICAL: Fix Numista API client** — the `NumistaProvider` class in `js/catalog-api.js` has never worked due to three implementation bugs against the real Numista v3 API:
  1. **Wrong endpoints**: uses `/items/search` and `/items/{id}` → should be `/types` and `/types/{type_id}`
  2. **Wrong auth**: passes `apikey` as query parameter → should use `Numista-API-Key` HTTP header
  3. **Non-existent params**: sends `metal`, `country`, `limit` → should be `category`, `issuer`, `count`
  - Must be fixed before any Numista features (sync, search, auto-populate) can ship
  - Affects: `js/catalog-api.js` (NumistaProvider class, ~lines 400-550)

---

## Near-Term (UI Focus)

These items focus on visual polish and usability improvements that require no backend changes.

- **Filter chips overhaul** — comprehensive review and rebuild of the filter chip system (`filters.js`, `events.js`, `inventory.js`):
  - **Core problem**: name chips are never generated as summary chips — `generateCategorySummary()` only produces metal, type, date, and location chips. The "Smart Grouping" toggle only affects how name *filters* behave on click, not chip generation. The normalizer (`normalizeItemName()`) works but has no code path to produce chips like "American Silver Eagle (6)"
  - **Confirmed**: with 8+ American Silver Eagles visible and threshold set to 5+, no name chip appears regardless of Smart Grouping toggle state. The feature simply doesn't exist yet — it's not a threshold or grouping bug, it's a missing code path in `generateCategorySummary()`
  - **Duplicate chip bug**: clicking a location value (e.g., "herobullion.com") to filter produces both a summary chip ("herobullion.com 25/25") AND an active filter chip ("herobullion.com ×") — two independent systems rendering the same filter. Summary chips should either hide when an active filter matches, or the two systems need to merge into one
  - **Threshold ignored**: with dropdown set to 5+, chips with counts as low as 2/159 still display. One of the two competing systems doesn't check the threshold setting
  - **Initial load styling bug**: Silver chip renders with white text on first page load (unreadable), switches to correct black text after any click interaction. The legacy system renders first with wrong CSS classes, then the active system overwrites on interaction
  - **New distribution model**: replace flat threshold with a **"top N per category"** approach — show the top entries from each selected column instead of flooding with everything above count X. This ensures useful chips from each category without visual noise
  - Remove date chips entirely (purchase dates aren't useful as filter categories) and suppress "Unknown" value chips
  - Change default minimum count from 100+ to **5+** as baseline (current default hides nearly all chips)
  - **Add normalized name chips** to `generateCategorySummary()` — this is the missing feature that would group "2021 American Silver Eagle", "2022 American Silver Eagle", etc. into one "American Silver Eagle" chip. Two-layer approach:
    - **Automatic normalizer**: strip leading years, trailing "Type 1/2", mint marks, edition text. Existing `autocomplete.normalizeItemName()` does some of this already — extend and wire into chip generation. Covers standard bullion (ASEs, Maples, Britannias, Krugerrands, etc.)
    - **User-defined grouping rules**: for edge cases where auto-stripping isn't enough (e.g., grouping "Canada Majestic Polar Bear" with "Canadian Polar Bear 2024"). Reuse the regex rule engine pattern from `js/customMapping.js`. Store rules in localStorage, let users add/edit via a settings UI
    - **Baseline pattern development**: use a CSV export of real inventory data to discover common name patterns and build the initial normalizer rules. Analysis of 152-item dataset identified 8 naming patterns, a 10-step regex pipeline covering ~85% of cases, and data quality issues (typos: "Flordia"×3, "Diety", "NCG"; concatenated eBay titles). Edge case: APMEX Lunar Year bars where the year IS the identity — normalizer needs a pre-check to skip year stripping for series where year is semantically meaningful
  - **Batch rename/normalize tool**: reuse the normalizer pipeline to offer a "Clean Up Names" feature — button opens a confirmation modal showing a preview table (Current Name → Proposed Name) for every item that would change. User can check/uncheck individual rows and tweak proposed names before applying. All renames logged in change log for undo. Same engine powers both filter chips and batch cleanup
  - Replace inline dropdowns with a **chip settings modal** allowing users to select which columns produce chips (metal, type, normalized name, purchase location, storage location) and configure the top-N limit per category
  - Consolidate the legacy `updateTypeSummary()` / `#typeSummary` div (now a no-op) with the active `renderActiveFilters()` system — this is the root cause of the duplicate chip bug
  - Future-proof: design chip settings to accommodate **tags** as a chip source when the custom tagging system is implemented
- **Notes column removal** ~~+ N# column restoration + hover tooltip~~ — ~~remove~~ **DONE (Increment 5)**: Notes icon column removed from table (15 → 14 columns with new duplicate column). Notes remain in the add/edit modal. Remaining: re-add N# column, add row hover tooltip for notes content
  - **N# column behavior**: clicking the N# value **filters the table** to show all items sharing that catalog number (same pattern as metal/type filter links). A small external-link icon next to the N# opens the Numista catalog page in the existing iframe modal (same icon pattern as purchase location external links). This replaces the previous standalone "N# grouping view" idea — grouping is now just a filter click away
  - Items without a N# show "—" in the column (no filter link, no icon)
- **Retail column UX bundle** — ship together as one increment:
  - **Inline retail editing**: add pencil icon to the Retail column (mirroring the existing Name column inline edit) so users can click to set/update retail price without opening the full edit modal. Gain/Loss should recalculate immediately on save
  - **Confidence styling**: visually differentiate manual vs auto-computed retail prices. Auto (melt fallback): muted/gray + italic to signal "estimated". Manual (user-set): standard weight + color to signal "confirmed". Carry styling through to Gain/Loss column so estimated gains are also visually distinct from confirmed ones
- ~~**Duplicate item button**~~ — **DONE (Increment 5)**: Copy icon in action column opens `#itemModal` in add mode pre-filled from source item. Date defaults to today, qty resets to 1, serial clears
- ~~**Fraction input for weight field**~~ — **DONE (Increment 5)**: `parseFraction()` in `js/utils.js` handles `1/1000`, `1 1/2`, and plain decimals. Weight input changed to `type="text"` with `inputmode="decimal"`
- **Numista integration — Sync & Search** (prerequisite: fix Numista API client above):
  - **"Sync from Numista" button** on the add/edit modal next to the Catalog (N#) field. When clicked with a valid N#, calls `GET /types/{type_id}` and auto-populates: **Name** ← `title`, **Weight** ← `weight` (grams, set unit to "g"), **Type** ← normalized type, **Metal** ← `composition.text` parsed to standard metals, **Notes** ← `description`. User reviews pre-filled fields, adjusts price/qty/location, saves. ~30 lines of glue code wiring API response to existing form fields
  - **"Numista Lookup" button** next to Sync — opens a search modal where users can type a coin name (e.g., "American Silver Eagle") and browse results with thumbnails (returned in search results as `obverse_thumbnail`/`reverse_thumbnail`). Selecting a result populates the N# field and triggers the Sync flow. Search supports: text query (`q`), category filter (`coin`/`exonumia`/`banknote`), and issuer filter. Metal/composition filtering is NOT available at the search level — only in full item detail
  - **N# grouping**: handled by the restored N# table column (see "Notes column removal" item above) — clicking a N# value filters the table to all items with that catalog number. No separate grouping view needed
  - **API budget awareness**: free tier = 2,000 requests/month. Sync = 1 call per item. Search = 1 call per query (returns up to 50 results). Cache all lookups in existing `LocalProvider` cache to minimize repeat calls
  - **Image policy note**: Numista thumbnails appear in search results and are technically loadable, but their ToU prohibits reproduction of user-contributed images. The Lookup search modal can display thumbnails *within the search context* (transient display during search, not cached/stored). For persistent item images, user photo upload is deferred — see Deferred section
- **eBay API integration** — if/when backend exists, proxy eBay Browse API for sold listing lookups to pre-populate retail estimates (current pre-populated search link works well as the client-side solution)
- **Light & Sepia theme contrast pass** — comprehensive CSS review of `[data-theme="light"]` and `[data-theme="sepia"]`:
  - **Light theme**: replace pure white (`#fff`) backgrounds with subtle gray layering — page background, card surfaces, table container, and modal panels should each step slightly darker to create visual depth without feeling flat. Aim for a hierarchy like `#f8f9fa` → `#ffffff` → `#f1f3f5` so cards "lift" off the page
  - **Sepia theme**: tone down the warm tones — current palette is too saturated/yellow, producing a muddy look. Reduce saturation and lighten the base to a more muted parchment feel
  - **Font contrast audit**: ensure all text colors meet WCAG AA (4.5:1 for body text, 3:1 for large text) against their respective backgrounds in both themes. Pay attention to table cell text, header labels, placeholder text, and muted/secondary text
  - **Action column theming**: the Edit/Copy/Delete icon columns at the end of table rows use a disconnected gray background that doesn't match the row theme. These sticky columns need to inherit the same background as their row (including alternating row stripes and hover state)
  - **Scope**: `css/styles.css` theme sections (`[data-theme="light"]`, `[data-theme="sepia"]`), sticky column rules, table row/hover rules
- ~~**eBay search icon redesign**~~ — **DONE (v3.06.01 + v3.06.02)**: Replaced emoji-in-red-circle with clean 12px SVG magnifying glass using `currentColor`. Split into two search functions: Purchase column → active listings (buy), Retail column → sold listings (price research)
- **Table CSS hardening** — audit responsive breakpoints, test mobile layout, ensure all 14 columns degrade gracefully
- **Summary cards visual refresh** — update card layout to better surface the portfolio model (total purchase cost, total melt value, total retail, net gain/loss)
- **Spot price manual input UX** — improve the experience for manually entering spot prices when API is unavailable
- **Metal stats modal overhaul** — enhance the per-metal detail modals (opened by clicking a metal stats card) with full portfolio breakdown:
  - **Breakdown tables**: replace single "total value" column with the full quartet — Purchase Cost, Melt Value, Est. Retail, Gain/Loss — for each category row (type, name, etc.)
  - **Pie chart toggle**: add a toggle or tab bar letting users switch the pie chart between Purchase / Melt / Retail / Gain-Loss views, so the chart slices reflect whichever value set the user cares about
  - **Library audit**: evaluate whether Chart.js (already integrated) is sufficient for these richer visualizations, or whether a more dashboard-oriented library offers better interactivity (tooltips, drill-down, responsive legends). Candidates: Chart.js (current), ApexCharts, Tabler.io (full UI kit). Preference is to stay with Chart.js if it handles the use case cleanly to avoid adding a framework dependency
- **Chart.js dashboard improvements** — add spot price trend visualization, portfolio value over time
- **Custom tagging system** — replace the removed `isCollectable` boolean with a flexible tagging system (e.g., "IRA", "stack", "numismatic", "gift")
- ~~**Dead CSS cleanup pass**~~ — **DONE (v3.06.01)**: Removed ~125 lines of orphaned `.collectable-*` selectors and unused icon utility classes

---

## Medium-Term (Infrastructure)

These items require backend work and represent a shift from pure client-side to a more capable architecture.

- **SQLite backend** — persistent storage for trend data, historical charts, and audit trails
- **User authentication** — JWT-based auth for multi-device access
- **Data migration** — localStorage to SQLite with backwards-compatible fallback
- **Multi-device sync** — share inventory data across browsers/devices via the backend
- **Bulk Numista enrichment** — batch-process existing inventory items that have N# IDs but are missing metadata (weight, description, etc.). Queue API calls respecting the 2,000/month limit, backfill fields, and report what was updated. Only practical with server-side job queue

---

## Long-Term (Self-Hosting & Distribution)

These items focus on making StakTrakr easy for others to deploy and run.

- **Mobile-responsive card view** — the current table layout is built for desktop/laptop screens and doesn't work well on phones. Add a responsive breakpoint (e.g., ≤768px) that transitions the inventory from a multi-column table to a card-based layout where each item renders as a compact card showing key fields (name, metal, weight, purchase price, melt value, gain/loss). Cards should be tappable to open the detail/edit modal. The table view remains default on wider screens — this is a progressive enhancement, not a replacement. Tablets may work with either view depending on orientation. Requires significant CSS and likely a parallel render path in `inventory.js` (card template vs table row template)
- **Docker build & image** — production-ready Dockerfile and docker-compose.yml for self-hosting. nginx:alpine serving static files, health checks, environment-based configuration. Publish image to Docker Hub or GitHub Container Registry for one-command deployment
- **Proxmox LXC setup guide/script** — step-by-step guide or automated script for deploying StakTrakr in a Proxmox LXC container. Lightweight alternative to full VM, ideal for home lab users running Proxmox on mini PCs

---

## Deferred

Items that are explicitly out of scope until prerequisites are met.

- **Encryption feature** — requires backend first (session management, key storage). See CLAUDE.md for rationale.
- **Public-facing deployment** — currently a personal server deployment; public hosting requires auth, rate limiting, and security hardening
- **User photo upload** — allow users to photograph their own coins/bars and attach images to inventory items. Stored server-side (filesystem or BLOB column in SQLite). Displayed in the edit modal and optionally as a row thumbnail. Avoids all Numista copyright issues since users own the photos. Could support multiple images per item (obverse/reverse). Low priority — trends, statistics, and hosted build come first
- **Numista image caching (CC-licensed only)** — for items where the Numista API returns a `picture_copyright` field with an explicit Creative Commons license, cache those images server-side with proper attribution. Non-CC images get a placeholder with a "View on Numista" link. Requires per-image license checking logic. Depends on SQLite backend + user photo upload infrastructure
- **Mobile camera capture** — on mobile devices, add a camera button to the add/edit modal that triggers the device camera via `<input type="file" accept="image/*" capture="environment">`. Snap a photo of a coin/bar and attach it directly to the inventory item. Pairs with the user photo upload feature (server-side storage required) and the mobile card view (photos could appear as card thumbnails). Pure client-side version could store photos as base64 in localStorage, but this doesn't scale — practical implementation needs the SQLite backend

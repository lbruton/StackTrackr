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

## Near-Term (UI Focus)

These items focus on visual polish and usability improvements that require no backend changes.

- **Inline catalog & grading tags** — instead of a dedicated N# table column, append optional clickable tags to the Name cell. Example: `2025 American Eagle (PCGS) (MS70-FS) (N#1234)`. All tags optional — most items just show the name
  - **Name cell format**: `{item name} (SERVICE) (GRADE) (N#ID)` — only renders tags the item actually has
  - **Tag click behavior**: opens iframe modal to the relevant service page (Numista catalog, PCGS cert viewer, NGC cert viewer). Same pattern as eBay search links
  - **Grade display**: Sheldon scale, shown as a separate tag next to the certification service — e.g., `(PCGS) (MS70-FS)` or `(NGC) (PF69-UC)`
  - **New item modal fields**: Certification Service dropdown (None/PCGS/NGC), Cert Number input, Grade dropdown (Sheldon scale with designations: FS, UC, DCAM, etc.). All optional. Separate from existing Catalog (N#) field
  - **Data model additions**: `certService` (string: `''`|`'PCGS'`|`'NGC'`), `certNumber` (string), `grade` (string)
  - **No new table column** — all info lives inline in the Name cell, keeping the table compact
  - **CSV export**: add `certService`, `certNumber`, `grade` to export headers
- **Spot price manual input UX** — improve the experience for manually entering spot prices when API is unavailable
- **Filter chips overhaul** — comprehensive review and rebuild of the filter chip system (`filters.js`, `events.js`, `inventory.js`):
  - **Core problem**: name chips are never generated as summary chips — `generateCategorySummary()` only produces metal, type, date, and location chips. The normalizer (`normalizeItemName()`) works but has no code path to produce chips like "American Silver Eagle (6)"
  - **Duplicate chip bug**: clicking a location value to filter produces both a summary chip AND an active filter chip — two independent systems rendering the same filter
  - **Threshold ignored**: with dropdown set to 5+, chips with counts as low as 2/159 still display
  - **New distribution model**: replace flat threshold with a **"top N per category"** approach
  - Remove date chips entirely and suppress "Unknown" value chips
  - **Add normalized name chips** — group year variants into one chip. Two-layer approach: automatic normalizer (strip years, mint marks, edition text) + user-defined grouping rules via regex engine
  - **Batch rename/normalize tool**: reuse the normalizer to offer a "Clean Up Names" feature with preview and undo
  - **Chip settings modal**: select which columns produce chips and configure top-N limit per category
  - Consolidate legacy `updateTypeSummary()` with `renderActiveFilters()` — root cause of the duplicate chip bug
- **Numista API fix** — the `NumistaProvider` class in `js/catalog-api.js` has never worked due to three bugs: wrong endpoints (`/items/search` → `/types`), wrong auth (query param → `Numista-API-Key` header), non-existent params (`metal`/`country`/`limit` → `category`/`issuer`/`count`). Must be fixed before any Numista features can ship
- **Numista integration — Sync & Search** (prerequisite: Numista API fix):
  - **"Sync from Numista" button** on the add/edit modal — auto-populates Name, Weight, Type, Metal, Notes from a valid N#
  - **"Numista Lookup" button** — search modal with thumbnails, selecting a result populates N# and triggers Sync
  - **API budget awareness**: free tier = 2,000 requests/month. Cache all lookups in `LocalProvider`
- **Pie chart toggle**: switch metal detail modal chart between Purchase / Melt / Retail / Gain-Loss views
- **Chart.js dashboard improvements** — spot price trend visualization, portfolio value over time
- **Custom tagging system** — replace the removed `isCollectable` boolean with flexible tags (e.g., "IRA", "stack", "numismatic", "gift")
- **Table CSS hardening** — audit responsive breakpoints, test mobile layout, ensure 14 columns degrade gracefully
- **Full UI review walkthrough** — hands-on walk-through cataloging visual issues, layout inconsistencies, and UX friction
- **eBay API integration** — if/when backend exists, proxy eBay Browse API for sold listing lookups to pre-populate retail estimates

### Completed (Near-Term)
- ~~**Retail column UX bundle**~~ — **DONE (v3.07.00 + v3.07.02)**: Confidence styling for estimated vs confirmed values (v3.07.00). Shift+click inline editing for all 6 editable columns including Retail — replaces pencil icon approach (v3.07.02)
- ~~**Duplicate item button**~~ — **DONE (Increment 5)**
- ~~**Fraction input for weight field**~~ — **DONE (Increment 5)**
- ~~**Light & Sepia theme contrast pass**~~ — **DONE (v3.07.01)**
- ~~**eBay search icon redesign**~~ — **DONE (v3.06.01 + v3.06.02)**
- ~~**Summary cards visual refresh**~~ — **DONE (v3.07.00)**
- ~~**Metal stats modal overhaul**~~ — **DONE (v3.07.00)**
- ~~**Dead CSS cleanup pass**~~ — **DONE (v3.06.01)**
- ~~**About modal overhaul**~~ — **DONE (v3.06.01)**
- ~~**Notes column removal**~~ — **DONE (Increment 5)**

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

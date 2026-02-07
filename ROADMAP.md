# StackTrackr Roadmap

Project direction and planned work for the StackTrackr precious metals inventory tracker.

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

---

## Next Session (Priority)

- **About modal overhaul** — update GitHub repository URLs to match new location, review and clean up the version/changelog display process, ensure all links are functional and information is current
- **Full UI review walkthrough** — hands-on walk-through of the entire application UI after Increments 1 and 2, cataloging visual issues, layout inconsistencies, and UX friction before proceeding with further feature work
- ~~**Fix spot price change indicator**~~ — **DONE (Increment 3)**: `updateSpotCardColor()` now compares against the most recent API/manual entry with a *different* price, so direction arrows persist across page refreshes instead of always resetting to orange
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
  - **New distribution model**: replace flat threshold with a **"top N per category"** approach — show the top entries from each selected column instead of flooding with everything above count X. This ensures useful chips from each category without visual noise
  - Remove date chips entirely (purchase dates aren't useful as filter categories) and suppress "Unknown" value chips
  - Change default minimum count from 100+ to **5+** as baseline (current default hides nearly all chips)
  - **Add normalized name chips** to `generateCategorySummary()` using `autocomplete.normalizeItemName()` — this is the missing feature that would group "2021 American Silver Eagle", "2022 American Silver Eagle", etc. into one "American Silver Eagle" chip
  - Replace inline dropdowns with a **chip settings modal** allowing users to select which columns produce chips (metal, type, normalized name, purchase location, storage location) and configure the top-N limit per category
  - Consolidate the legacy `updateTypeSummary()` / `#typeSummary` div (now a no-op) with the active `renderActiveFilters()` system
  - Future-proof: design chip settings to accommodate **tags** as a chip source when the custom tagging system is implemented
- **Notes column removal + N# column restoration + hover tooltip** — remove the Notes icon column from the table (14 → 13 columns) to reclaim width, then re-add the N# column (back to 14). Notes remain in the unified add/edit modal as a multi-line textarea. Add a **row hover tooltip** that displays notes content when the user hovers over any row — this tooltip system can later be expanded to show additional metrics (trending data, price history) as backend features are built out
  - **N# column behavior**: clicking the N# value **filters the table** to show all items sharing that catalog number (same pattern as metal/type filter links). A small external-link icon next to the N# opens the Numista catalog page in the existing iframe modal (same icon pattern as purchase location external links). This replaces the previous standalone "N# grouping view" idea — grouping is now just a filter click away
  - Items without a N# show "—" in the column (no filter link, no icon)
- **Retail column UX bundle** — ship together as one increment:
  - **Inline retail editing**: add pencil icon to the Retail column (mirroring the existing Name column inline edit) so users can click to set/update retail price without opening the full edit modal. Gain/Loss should recalculate immediately on save
  - **Confidence styling**: visually differentiate manual vs auto-computed retail prices. Auto (melt fallback): muted/gray + italic to signal "estimated". Manual (user-set): standard weight + color to signal "confirmed". Carry styling through to Gain/Loss column so estimated gains are also visually distinct from confirmed ones
- **Fraction input for weight field** — allow users to type fractions like `1/1000` or `1/2` in the weight input, which the app auto-converts to decimal before saving. Aurum notes and Goldbacks print their precious metal content as fractions (e.g., "1/1000th of a gram") and users shouldn't need to do the math themselves. Implementation: on form submit, detect `/` in the weight value, evaluate the fraction (`parseFloat(num) / parseFloat(denom)`), and proceed with the decimal result. Purely client-side, no backend needed. Could also support mixed numbers like `1 1/2` for half-ounce items
- **Numista integration — Sync & Search** (prerequisite: fix Numista API client above):
  - **"Sync from Numista" button** on the add/edit modal next to the Catalog (N#) field. When clicked with a valid N#, calls `GET /types/{type_id}` and auto-populates: **Name** ← `title`, **Weight** ← `weight` (grams, set unit to "g"), **Type** ← normalized type, **Metal** ← `composition.text` parsed to standard metals, **Notes** ← `description`. User reviews pre-filled fields, adjusts price/qty/location, saves. ~30 lines of glue code wiring API response to existing form fields
  - **"Numista Lookup" button** next to Sync — opens a search modal where users can type a coin name (e.g., "American Silver Eagle") and browse results with thumbnails (returned in search results as `obverse_thumbnail`/`reverse_thumbnail`). Selecting a result populates the N# field and triggers the Sync flow. Search supports: text query (`q`), category filter (`coin`/`exonumia`/`banknote`), and issuer filter. Metal/composition filtering is NOT available at the search level — only in full item detail
  - **N# grouping**: handled by the restored N# table column (see "Notes column removal" item above) — clicking a N# value filters the table to all items with that catalog number. No separate grouping view needed
  - **API budget awareness**: free tier = 2,000 requests/month. Sync = 1 call per item. Search = 1 call per query (returns up to 50 results). Cache all lookups in existing `LocalProvider` cache to minimize repeat calls
  - **Image policy note**: Numista thumbnails appear in search results and are technically loadable, but their ToU prohibits reproduction of user-contributed images. The Lookup search modal can display thumbnails *within the search context* (transient display during search, not cached/stored). For persistent item images, user photo upload is deferred — see Deferred section
- **eBay API integration** — if/when backend exists, proxy eBay Browse API for sold listing lookups to pre-populate retail estimates (current pre-populated search link works well as the client-side solution)
- **Table CSS hardening** — audit responsive breakpoints, test mobile layout, ensure all 14 columns degrade gracefully
- **Summary cards visual refresh** — update card layout to better surface the portfolio model (total purchase cost, total melt value, total retail, net gain/loss)
- **Spot price manual input UX** — improve the experience for manually entering spot prices when API is unavailable
- **Chart.js dashboard improvements** — add spot price trend visualization, portfolio value over time
- **Custom tagging system** — replace the removed `isCollectable` boolean with a flexible tagging system (e.g., "IRA", "stack", "numismatic", "gift")
- **Dead CSS cleanup pass** — remove orphaned selectors from the collectable/legacy column removals

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

These items focus on making StackTrackr easy for others to deploy and run.

- **Docker build & image** — production-ready Dockerfile and docker-compose.yml for self-hosting. nginx:alpine serving static files, health checks, environment-based configuration. Publish image to Docker Hub or GitHub Container Registry for one-command deployment
- **Proxmox LXC setup guide/script** — step-by-step guide or automated script for deploying StackTrackr in a Proxmox LXC container. Lightweight alternative to full VM, ideal for home lab users running Proxmox on mini PCs

---

## Deferred

Items that are explicitly out of scope until prerequisites are met.

- **Encryption feature** — requires backend first (session management, key storage). See CLAUDE.md for rationale.
- **Public-facing deployment** — currently a personal server deployment; public hosting requires auth, rate limiting, and security hardening
- **User photo upload** — allow users to photograph their own coins/bars and attach images to inventory items. Stored server-side (filesystem or BLOB column in SQLite). Displayed in the edit modal and optionally as a row thumbnail. Avoids all Numista copyright issues since users own the photos. Could support multiple images per item (obverse/reverse). Low priority — trends, statistics, and hosted build come first
- **Numista image caching (CC-licensed only)** — for items where the Numista API returns a `picture_copyright` field with an explicit Creative Commons license, cache those images server-side with proper attribution. Non-CC images get a placeholder with a "View on Numista" link. Requires per-image license checking logic. Depends on SQLite backend + user photo upload infrastructure

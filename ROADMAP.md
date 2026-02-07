# StackrTrackr Roadmap

Project direction and planned work for the StackrTrackr precious metals inventory tracker.

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

---

## Next Session (Priority)

- **About modal overhaul** — update GitHub repository URLs to match new location, review and clean up the version/changelog display process, ensure all links are functional and information is current
- **Full UI review walkthrough** — hands-on walk-through of the entire application UI after Increments 1 and 2, cataloging visual issues, layout inconsistencies, and UX friction before proceeding with further feature work
- **Fix spot price change indicator** — price direction arrows (green up / red down / orange unchanged) always show orange on page refresh because `updateSpotCardColor()` in `spot.js:112-149` compares against the last `spotHistory` entry regardless of source. Cached reads (`source: "cached"`) reset the baseline so the comparison is always equal. Fix: filter `spotHistory` to only compare against last `source: "api"` entry, preserving cached entries in history for auditing. Affects `spot.js` (comparison logic) and possibly `api.js` (`recordSpot` calls). Quick fix — should be < 10 lines changed
- **CRITICAL: Unify Add/Edit into single modal** — the Edit modal has drifted from the Add modal, causing data integrity bugs:
  - Edit modal is **missing the weight unit selector** (grams vs oz) — Add modal has `<select id="itemWeightUnit">`, Edit modal has nothing. Weight unit is hidden in a fragile `dataset.unit` attribute invisible to the user
  - **Purchase price is lost** when editing items (e.g., changing a Gold Note to Gold Aurum) — likely caused by hidden weight unit state getting disrupted during form interaction, causing save logic to overwrite fields with empty values
  - Fix: consolidate into a **single modal** that operates in "add" or "edit" mode. One set of fields, one save handler with a mode flag, one place to maintain. Eliminates the entire class of modal-drift bugs
  - Affects: `index.html` (two modal HTML blocks → one), `js/events.js` (two save handlers → one with mode), `js/inventory.js` (`editItem()` populates same form), `js/init.js` (element references)

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
- **Notes column removal + hover tooltip** — remove the Notes icon column from the table (14 → 13 columns) to reclaim width. Notes remain in the unified add/edit modal as a multi-line textarea. Add a **row hover tooltip** that displays notes content when the user hovers over any row — this tooltip system can later be expanded to show additional metrics (trending data, price history) as backend features are built out
- **Retail column UX bundle** — ship together as one increment:
  - **Inline retail editing**: add pencil icon to the Retail column (mirroring the existing Name column inline edit) so users can click to set/update retail price without opening the full edit modal. Gain/Loss should recalculate immediately on save
  - **Confidence styling**: visually differentiate manual vs auto-computed retail prices. Auto (melt fallback): muted/gray + italic to signal "estimated". Manual (user-set): standard weight + color to signal "confirmed". Carry styling through to Gain/Loss column so estimated gains are also visually distinct from confirmed ones
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

---

## Deferred

Items that are explicitly out of scope until prerequisites are met.

- **Encryption feature** — requires backend first (session management, key storage). See CLAUDE.md for rationale.
- **Public-facing deployment** — currently a personal server deployment; public hosting requires auth, rate limiting, and security hardening

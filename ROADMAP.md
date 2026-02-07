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

---

## Near-Term (UI Focus)

These items focus on visual polish and usability improvements that require no backend changes.

- **Retail price confidence styling** — visually differentiate manual vs auto-computed retail prices. Auto (melt fallback): muted/gray + italic to signal "estimated". Manual (user-set): standard weight + color to signal "confirmed". Carry styling through to Gain/Loss column so estimated gains are also visually distinct from confirmed ones
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

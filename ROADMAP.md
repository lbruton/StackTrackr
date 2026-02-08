# StakTrakr Roadmap

Project direction and planned work for the StakTrakr precious metals inventory tracker.

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
- **~~Normalized name chips~~** — **DONE (v3.09.01)**: Grouped name chips in filter bar (e.g., "Silver Eagle 6/164") using `normalizeItemName()` dictionary. Click-to-filter with toggle. Respects minCount threshold and GROUPED_NAME_CHIPS feature flag. Remaining sub-items:
  - **Batch rename/normalize tool**: reuse the normalizer to offer a "Clean Up Names" feature with preview and undo
  - **Chip settings modal**: select which columns produce chips and configure top-N limit per category
- **Numista API fix** — the `NumistaProvider` class in `js/catalog-api.js` has never worked due to three bugs: wrong endpoints (`/items/search` → `/types`), wrong auth (query param → `Numista-API-Key` header), non-existent params (`metal`/`country`/`limit` → `category`/`issuer`/`count`). Must be fixed before any Numista features can ship
- **Numista integration — Sync & Search** (prerequisite: Numista API fix):
  - **"Sync from Numista" button** on the add/edit modal — auto-populates Name, Weight, Type, Metal, Notes from a valid N#
  - **"Numista Lookup" button** — search modal with thumbnails, selecting a result populates N# and triggers Sync
  - **API budget awareness**: free tier = 2,000 requests/month. Cache all lookups in `LocalProvider`
- **Pie chart toggle**: switch metal detail modal chart between Purchase / Melt / Retail / Gain-Loss views
- **Chart.js dashboard improvements** — spot price trend visualization, portfolio value over time
- **Custom tagging system** — replace the removed `isCollectable` boolean with flexible tags (e.g., "IRA", "stack", "numismatic", "gift")


### Completed (Near-Term)
- ~~**Normalized name chips**~~ — **DONE (v3.09.01)**: Grouped name chips in filter bar using `normalizeItemName()` dictionary. Click-to-filter with toggle. Respects minCount threshold and feature flag. Also fixed: Silver chip contrast on dark/sepia, duplicate location chips
- ~~**Filter chips cleanup**~~ — **DONE (v3.09.00)**: Unified threshold application (all categories respect minCount), removed date chips, suppressed "Unknown" locations, removed dead `columnFilters` and `updateTypeSummary()`, default threshold 3+, chips update after all mutations
- ~~**Spot price manual input UX**~~ — **DONE (v3.09.00)**: Spot cards with no price data show "Shift+click price to set" hint
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
- **Table CSS hardening** — audit responsive breakpoints, test mobile layout, ensure 14 columns degrade gracefully
- **Full UI review walkthrough** — hands-on walk-through cataloging visual issues, layout inconsistencies, and UX friction
- **eBay API integration** — if/when backend exists, proxy eBay Browse API for sold listing lookups to pre-populate retail estimates
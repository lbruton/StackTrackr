# StakTrakr Roadmap

Project direction and planned work for the StakTrakr precious metals inventory tracker.

---

## Near-Term (UI Focus)

These items focus on visual polish and usability improvements that require no backend changes.

### Phase 1 — Numista API Fix
- **Numista API fix** — the `NumistaProvider` class in `js/catalog-api.js` has never worked due to three bugs: wrong endpoints (`/items/search` → `/types`), wrong auth (query param → `Numista-API-Key` header), non-existent params (`metal`/`country`/`limit` → `category`/`issuer`/`count`). Must be fixed before any Numista features can ship

### Phase 2 — Inline Catalog & Grading Tags
- **Inline catalog & grading tags** — instead of a dedicated N# table column, append optional clickable tags to the Name cell. Example: `2025 American Eagle (PCGS) (MS70-FS) (N#1234)`. All tags optional — most items just show the name
  - **Name cell format**: `{item name} (SERVICE) (GRADE) (N#ID)` — only renders tags the item actually has
  - **Tag click behavior**: opens iframe modal to the relevant service page (Numista catalog, PCGS cert viewer, NGC cert viewer). Same pattern as eBay search links
  - **Grade display**: Sheldon scale, shown as a separate tag next to the certification service — e.g., `(PCGS) (MS70-FS)` or `(NGC) (PF69-UC)`
  - **New item modal fields**: Certification Service dropdown (None/PCGS/NGC), Cert Number input, Grade dropdown (Sheldon scale with designations: FS, UC, DCAM, etc.). All optional. Separate from existing Catalog (N#) field
  - **Data model additions**: `certService` (string: `''`|`'PCGS'`|`'NGC'`), `certNumber` (string), `grade` (string)
  - **No new table column** — all info lives inline in the Name cell, keeping the table compact
  - **CSV export**: add `certService`, `certNumber`, `grade` to export headers

### Pause — Evaluate Numista Data
- Review what fields the working Numista API actually returns (canonical names, denominations, metal, weight, descriptions, images)
- Decide which fields to surface in the add/edit modal and whether to add new data model fields
- Assess how Numista naming conventions compare to our current `normalizeItemName()` dictionary

### Phase 3 — Batch Rename/Normalize (Numista-Powered)
- **Batch rename/normalize tool** — "Clean Up Names" modal with preview and undo, powered by both the local normalizer and the Numista API
  - For items with a Numista catalog number (N#): look up canonical title from Numista, offer to rename to the official name
  - For items without N#: use `normalizeItemName()` dictionary matching, then optionally search Numista to find and attach the correct catalog entry
  - Key value: standardizes names for users who don't follow naming conventions (e.g., "Silver Eagle" → "American Silver Eagle" based on Numista's canonical title)
  - Respects API budget (2,000 req/month free tier) — batch lookups with caching via `LocalProvider`

### Backlog (No Dependency Order)
- **Numista integration — Sync & Search** (prerequisite: Phase 1):
  - **"Sync from Numista" button** on the add/edit modal — auto-populates Name, Weight, Type, Metal, Notes from a valid N#
  - **"Numista Lookup" button** — search modal with thumbnails, selecting a result populates N# and triggers Sync
  - **API budget awareness**: free tier = 2,000 requests/month. Cache all lookups in `LocalProvider`
- **Chip settings modal**: select which columns produce chips and configure top-N limit per category
- **Pie chart toggle**: switch metal detail modal chart between Purchase / Melt / Retail / Gain-Loss views
- **Chart.js dashboard improvements** — spot price trend visualization, portfolio value over time
- **Custom tagging system** — replace the removed `isCollectable` boolean with flexible tags (e.g., "IRA", "stack", "numismatic", "gift")


### Completed (Near-Term)
- ~~**Filter chips system (complete)**~~ — **DONE (v3.09.00 – v3.09.01)**: Full chip system: metal, type, location, and normalized name chips. Click-to-filter with toggle. Unified threshold (3+ default), keyword grouping (Goldback/Zombucks/Silverback), starts-with normalizer with 280-item dictionary. Fixed: Silver chip contrast on dark/sepia, duplicate location chips, suppressed "Unknown" locations
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

## Medium-Term (BYO-Backend — Supabase Cloud Sync)

Replaces the original SQLite/auth/hosting plan with a **zero-cost, zero-server** architecture. The app stays 100% static on Cloudflare Pages. Users who want cloud sync and multi-device access bring their own free Supabase project (URL + anon key). Users who don't want cloud continue using localStorage exactly as today — no change.

### Why Supabase
- **Direct browser access** — PostgREST exposes Postgres tables as a REST API callable via `fetch()`. No serverless functions, no proxy, no middleware needed
- **Free tier is generous** — 500MB storage, 50K row reads, unlimited API requests. More than enough for a personal inventory tracker
- **User owns their data** — each user creates their own Supabase project. StakTrakr never sees, stores, or proxies anyone's data
- **Row-Level Security** — anon key is safe to expose in the browser because RLS policies control access. Each user's project is isolated
- **Real-time subscriptions** — built-in WebSocket support for live sync between open tabs/devices (future enhancement)
- **No auth system needed** — the Supabase project itself IS the authentication. Whoever has the URL + key owns the data

### Implementation Plan

- **Settings UI** — new "Cloud Sync" section in the settings/files modal. Two fields: Supabase URL and Anon Key. Stored in localStorage (these are the only credentials the app needs). Toggle to enable/disable cloud sync
- **One-click table setup** — "Initialize Database" button that runs `CREATE TABLE` statements via the Supabase REST API. Creates: `inventory`, `spot_history`, `change_log`, `settings`. User never touches SQL
- **Schema versioning** — `schema_version` field in the `settings` table. Future app updates can detect outdated schemas and run migrations automatically via the API
- **Bidirectional sync** — on page load: pull from Supabase if configured, merge with localStorage cache. On save: write to both localStorage AND Supabase. localStorage acts as offline cache so the app works without internet
- **Conflict resolution** — last-write-wins using `updatedAt` timestamps. Simple, predictable, sufficient for a single-user inventory app. If two devices edit the same item, the most recent edit wins
- **Spot price history** — `spot_history` table stores daily price snapshots. Enables trend charts, portfolio value over time, and historical gain/loss analysis without localStorage size constraints
- **Bulk Numista enrichment** — batch-process inventory items with N# IDs, calling the Numista API to backfill metadata. Results cached in Supabase. Respects 2,000 req/month free tier budget
- **`file://` protocol handling** — cloud sync requires HTTP (CORS blocks `fetch()` from `file://`). Detect protocol and show a clear message: "Cloud sync requires the hosted version at [your-url]"

### What This Eliminates
- ~~SQLite backend~~ — Supabase is Postgres, managed by the user's free project
- ~~User authentication~~ — each user's Supabase project IS their auth
- ~~Docker/Proxmox hosting~~ — static site + BYO database, nothing to host
- ~~Data migration~~ — simplified to a one-time localStorage → Supabase export
- ~~Public deployment security concerns~~ — app never holds anyone's data

---

## Long-Term (Polish & Distribution)

These items enhance the user experience and make StakTrakr easier to share and deploy.

- **Mobile-responsive card view** — responsive breakpoint (≤768px) transitions from table to card layout. Each card shows key fields (name, metal, weight, purchase price, melt value, gain/loss), tappable to open detail/edit modal. Table remains default on wider screens. Progressive enhancement, not a replacement
- **User photo upload** — photograph coins/bars and attach images to inventory items. With Supabase, images can be stored in Supabase Storage (5GB free tier) instead of requiring a custom backend. Displayed in edit modal and optionally as row/card thumbnails. Multiple images per item (obverse/reverse)
- **Mobile camera capture** — camera button in add/edit modal using `<input type="file" accept="image/*" capture="environment">`. Pairs with photo upload and mobile card view
- **Docker build & image** — optional self-hosting via Dockerfile + docker-compose.yml for users who prefer local infrastructure. nginx:alpine serving static files. Supabase can be self-hosted too via `supabase/supabase` Docker image for fully offline deployments
- **Proxmox LXC setup guide** — guide/script for deploying in a Proxmox LXC container. Pairs with Docker image for home lab users

---

## Deferred

Items that are explicitly out of scope until prerequisites are met.

- **Encryption at rest** — encrypt inventory data before writing to Supabase. User provides a passphrase that derives an encryption key (never stored). Supabase stores only ciphertext. Adds complexity to sync logic — evaluate after BYO-Backend is stable
- **Numista image caching (CC-licensed only)** — for Numista API responses with Creative Commons `picture_copyright`, cache images in Supabase Storage with attribution. Non-CC images get a placeholder with "View on Numista" link. Depends on working Numista API + Supabase Storage
- **Table CSS hardening** — audit responsive breakpoints, test mobile layout, ensure columns degrade gracefully
- **Full UI review walkthrough** — hands-on walk-through cataloging visual issues, layout inconsistencies, and UX friction
- **eBay API integration** — proxy eBay Browse API for sold listing lookups to pre-populate retail estimates. Could run as a Supabase Edge Function (Deno) to avoid CORS issues
# StakTrakr Roadmap

Project direction and planned work for the StakTrakr precious metals inventory tracker.

---

## Near-Term (UI Focus)

These items focus on visual polish and usability improvements that require no backend changes.

### Next Up — Purity / Fineness

- **Purity field in data model** — Add `purity` field to item schema (default `1.0`). Existing items auto-migrate to `purity: 1.0` on load. New localStorage key added to `ALLOWED_STORAGE_KEYS`
- **Purity dropdown in add/edit modal** — Preset values: `.999` (standard bullion), `.9999` (Canadian Maple, some gold), `.925` (sterling), `.900` (pre-1965 US silver, pre-1933 US gold), `.800` (European), `.600`, `.400` (1965-70 Kennedy halves, Eisenhower dollars), `.350` (war nickels), plus custom entry field
- **Melt formula update** — Change `meltValue = weight * qty * spot` → `meltValue = weight * qty * spot * purity` at all calculation sites. Extract a centralized `computeMeltValue(item, spot)` helper to prevent formula drift across `inventory.js`, `detailsModal.js`, and export paths
- **Export/import support** — Add `purity` column to CSV, JSON, and ZIP exports. CSV/JSON import maps `purity` field with `1.0` fallback for files without it
- **Migration workflow** — With bulk edit available, users can search for constitutional silver items, select all, and batch-update from artificial weight → actual weight + correct purity (e.g., pre-1965 quarters: change weight from `0.715` to `0.7942 ozt` and set purity to `.900`)

### Backlog — Batch Rename/Normalize (Numista-Powered)

- **Batch rename/normalize tool** — "Clean Up Names" modal with preview and undo, powered by both the local normalizer and the Numista API
  - For items with a Numista catalog number (N#): look up canonical title from Numista, offer to rename to the official name
  - For items without N#: use `normalizeItemName()` dictionary matching, then optionally search Numista to find and attach the correct catalog entry
  - Key value: standardizes names for users who don't follow naming conventions (e.g., "Silver Eagle" → "American Silver Eagle" based on Numista's canonical title)
  - Respects API budget (2,000 req/month free tier) — batch lookups with caching via `LocalProvider`

### Bug — Search Doesn't Match Custom Chip Group Keywords

- **Search should include filter chip group patterns** — When searching for "black flag", users expect results to include items tagged under the "Black Flag" custom chip group (whose keywords are ship names like "The Fancy", "The Pearl"). Currently search only matches item fields, not custom group pattern definitions. Fix: expand the search/filter logic to also match items whose names match any pattern in a custom group whose label matches the search term

### Feature — PCGS Quota Bar & Unified Quota Styling

- **PCGS quota bar** — Add a usage tracking progress bar to the PCGS API card in Settings > API, matching the existing Numista quota bar. PCGS free tier = 1,000 requests/day (vs. Numista's 2,000/month)
- **Unified quota bar design** — Make Numista and PCGS quota bars match the visual style of the metals provider quota bars (consistent height, colors, label placement)
- **Configurable quota limits** — Allow users to set/scale the display limit (default Numista = 2,000, PCGS = 1,000) so the bar adapts if they upgrade tiers or usage patterns change

### Ongoing — index.html Refactoring (Incremental)

- **Extract inline scripts and modal HTML** — `index.html` has grown too large. Rather than a big-bang rewrite, adopt an incremental approach: each session, when touching a section for a bug fix or feature, look for an opportunity to pull a function block or modal template into its own JS or HTML partial file. Goal: establish a per-file size threshold and keep all files under it over time
- **Candidates for extraction**: inline `<script>` blocks still in `index.html`, modal HTML templates that could be dynamically injected, any initialization logic that isn't in `init.js`

### Backlog (No Dependency Order)

- **Pie chart toggle** — switch metal detail modal chart between Purchase / Melt / Retail / Gain-Loss views
- **Chart.js dashboard improvements** — portfolio value over time, expanded spot price trend visualization
- **Custom tagging system** — flexible user-defined tags (e.g., "IRA", "stack", "numismatic", "gift") for filtering and organization


### Completed (Near-Term)

- ~~**Seed data & first-time UX**~~ — **DONE (v3.21.02)**: 720 seed spot history entries (4 metals × 180 days) baked in so sparklines and price cards work from first load. 8 sample inventory items (3x ASE with grades/Numista, 3x Gold Maple with Numista, Platinum Round, Palladium Bar). Dual-path loader (fetch for HTTP, embedded fallback for file://). Seed timestamp display on spot cards. Metals History modal includes seed entries. README overhaul with hero screenshot
- ~~**Spot card % change & history tools**~~ — **DONE (v3.21.01 – v3.21.02)**: Percentage change display on spot cards over selected timeframe. Spot history import/export in Metals History modal. Provider sync mode toggle. PCGS verified persistence across reload/sort/filter. PCGS lookup populates Name and Retail Price
- ~~**PCGS# field & cert verification**~~ — **DONE (v3.21.00)**: PCGS catalog number field with inline chip (click to open CoinFacts). PCGS API cert verification with grade, population, pop higher, and price guide. Bearer token config in Settings > API > PCGS. PCGS# in search, bulk edit, and all export/import formats
- ~~**Bulk Edit tool**~~ — **DONE (v3.20.00)**: Full-screen modal in Settings > Tools with 16 editable fields, searchable item table with checkboxes, copy/delete in bulk, Numista Lookup integration. Change Log moved to Settings > Log tab
- ~~**Filter chip category toggles & sort**~~ — **DONE (v3.19.00)**: Enable/disable and reorder 10 filter chip categories in Settings > Chips. Sort chips by Name (A-Z) or Qty (High→Low). Config-driven rendering replaces hard-coded category blocks
- ~~**API Settings redesign**~~ — **DONE (v3.18.00)**: Numista promoted to first-class pinned tab. Drag-to-reorder provider tabs set sync priority. Compact header status row. Clickable quota bars. Streamlined provider cards: Save, Save and Test, Clear Key
- ~~**Inline chip settings, search expansion & backup fix**~~ — **DONE (v3.17.00)**: 6 inline chip types (Grade, Numista, Year, Serial #, Storage Location, Notes) with enable/disable and reorder in Settings > Table. Search expanded to cover Year, Grade, Cert#, Numista ID, Serial Number. ZIP backup/restore includes all chip and display settings
- ~~**Custom chip grouping & settings**~~ — **DONE (v3.16.00 – v3.16.02)**: Custom grouping rules with full CRUD. Chip blacklist with right-click suppress. Dynamic name chips from parentheses/quotes. Settings > Grouping panel. Inline edit for rules. API settings persistence fix, multi-provider sync, Numista usage bar
- ~~**Encrypted portable backup (.stvault)**~~ — **DONE (v3.14.00 – v3.14.01)**: AES-256-GCM encrypted backup/restore with password strength indicator, Web Crypto API with forge.js fallback for `file://` Firefox, binary vault format with 56-byte header
- ~~**Portal view (scrollable table)**~~ — **DONE (v3.12.00 – v3.12.02)**: Scrollable table with sticky column headers replaces pagination. Visible rows dropdown. NGC cert lookup fix, Numista Sets support, Lunar Series chip
- ~~**Unified settings modal**~~ — **DONE (v3.11.00)**: Consolidated API, Files, and Appearance into single modal with sidebar navigation (Site, API, Files, Cloud, Tools). Theme picker, tabbed API providers, items-per-page persistence
- ~~**Serial # field & Numista UX**~~ — **DONE (v3.10.00 – v3.10.01)**: Serial Number field, Year/Grade/N# filter chips, eBay search includes year, Numista no-results retry with quick-pick bullion list. Numista iframe replaced with popup window
- ~~**Inline catalog & grading tags**~~ — **DONE (v3.09.04 – v3.09.05)**: Year field with inline tag, Grade dropdown, Grading Authority, Cert # input, color-coded grade badges, clickable cert verification, smart Numista category search
- ~~**Numista API fix**~~ — **DONE (v3.09.02 – v3.09.03)**: Fixed base URL, endpoints, auth, params, response parsing, field mapping, and localStorage whitelist. Smart category search mapping
- ~~**Filter chips system**~~ — **DONE (v3.09.00 – v3.09.01)**: Metal, type, location, and normalized name chips. Click-to-filter toggle. Keyword grouping, starts-with normalizer with 280-item dictionary
- ~~**Spot price card redesign**~~ — **DONE (v3.08.00 – v3.08.01)**: Sparkline charts with Chart.js, trend range dropdown (7d/30d/60d/90d), sync icon animation, shift+click manual price entry, spot history dedup
- ~~**Portfolio visibility overhaul**~~ — **DONE (v3.07.00 – v3.07.03)**: Retail/Gain-Loss confidence styling, "All Metals" summary card, Avg Cost/oz, metal detail modal with full breakdown by type and location
- ~~**Retail column UX & inline editing**~~ — **DONE (v3.07.00 + v3.07.02)**: Confidence styling for estimated vs confirmed values. Shift+click inline editing for all 6 editable columns
- ~~**Light & Sepia theme contrast pass**~~ — **DONE (v3.07.01)**: WCAG AAA text tokens, table zebra striping, theme-aware tokens
- ~~**eBay search split & icon redesign**~~ — **DONE (v3.06.01 – v3.06.02)**: SVG icon, About modal overhaul. Purchase = active listings, Retail = sold listings
- ~~**StakTrakr rebrand**~~ — **DONE (v3.06.00)**: Full rebrand with domain-based auto-branding for 3 domains
- ~~**Unified add/edit modal**~~ — **DONE (v3.05.00 – v3.05.04)**: Merged two modals, weight precision fix, qty-adjusted financials, fraction input, duplicate button, date fix, Numista key simplification
- ~~**Spot price manual input UX**~~ — **DONE (v3.09.00)**: "Shift+click price to set" hint on empty spot cards
- ~~**Duplicate item button**~~ — **DONE**
- ~~**Fraction input for weight field**~~ — **DONE**
- ~~**Summary cards visual refresh**~~ — **DONE (v3.07.00)**
- ~~**Metal stats modal overhaul**~~ — **DONE (v3.07.00)**
- ~~**Dead CSS cleanup pass**~~ — **DONE (v3.06.01)**
- ~~**About modal overhaul**~~ — **DONE (v3.06.01)**
- ~~**Notes column removal**~~ — **DONE**

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

# StakTrakr Roadmap

Project direction and planned work for the StakTrakr precious metals inventory tracker.

---

## Near-Term (UI Focus)

These items focus on visual polish and usability improvements that require no backend changes.

### Next Sprint — Inline Chip Settings, Search Expansion & Backup Fix

- **New inline chips in Name cell**: Add Cert#, Storage Location, and Notes indicator chips alongside existing Year, N#, and Grade chips. New chips disabled by default
- **Inline chip settings UI**: Settings > Grouping panel gains per-chip-type enable/disable toggles for all 6 inline chip types (Year, N#, Grade, Cert#, Storage Location, Notes). User-configurable display order with localStorage persistence
- **Search expansion**: Add `year`, `grade`, `gradingAuthority`, `certNumber`, `numistaId`, `serialNumber` to the search fields in `js/search.js` and `js/filters.js`. Currently these fields are invisible to search
- **Backup/restore coverage fix**: Add missing post-v3.14.00 settings to backup export and restore: `chipCustomGroups`, `chipBlacklist`, `chipMinCount`, `featureFlags`, `settingsItemsPerPage`. Also restore `sortColumn`, `sortDirection`, and `searchQuery` which are backed up but never restored

### Phase 3 — Batch Rename/Normalize (Numista-Powered)
- **Batch rename/normalize tool** — "Clean Up Names" modal with preview and undo, powered by both the local normalizer and the Numista API
  - For items with a Numista catalog number (N#): look up canonical title from Numista, offer to rename to the official name
  - For items without N#: use `normalizeItemName()` dictionary matching, then optionally search Numista to find and attach the correct catalog entry
  - Key value: standardizes names for users who don't follow naming conventions (e.g., "Silver Eagle" → "American Silver Eagle" based on Numista's canonical title)
  - Respects API budget (2,000 req/month free tier) — batch lookups with caching via `LocalProvider`

### Backlog (No Dependency Order)
- **Numista integration — Sync & Search**:
  - **"Sync from Numista" button** on the add/edit modal — auto-populates Name, Weight, Type, Metal, Notes from a valid N#
  - **"Numista Lookup" button** — search modal with thumbnails, selecting a result populates N# and triggers Sync
  - **API budget awareness**: free tier = 2,000 requests/month. Cache all lookups in `LocalProvider`
- **Pie chart toggle**: switch metal detail modal chart between Purchase / Melt / Retail / Gain-Loss views
- **Chart.js dashboard improvements** — spot price trend visualization, portfolio value over time
- **Custom tagging system** — replace the removed `isCollectable` boolean with flexible tags (e.g., "IRA", "stack", "numismatic", "gift")


### Completed (Near-Term)
- ~~**Custom chip grouping & settings**~~ — **DONE (v3.16.00 – v3.16.02)**: Custom grouping rules with full CRUD (create, edit, delete, toggle). Chip blacklist with right-click suppress. Dynamic name chips from parentheses/quotes. Settings > Grouping panel with chip threshold, smart grouping toggle, dynamic chips toggle, blacklist, and custom rules management. Inline edit for rules via pencil icon
- ~~**Encrypted portable backup (.stvault)**~~ — **DONE (v3.14.00 – v3.14.01)**: AES-256-GCM encrypted backup/restore with password strength indicator, Web Crypto API with forge.js fallback for `file://` Firefox, binary vault format with 56-byte header. Compact N# chips, name column truncation, and tightened action icons
- ~~**Portal view (scrollable table)**~~ — **DONE (v3.12.00 – v3.12.02)**: Scrollable table with sticky column headers replaces slice-based pagination. Visible rows dropdown (10/15/25/50/100). NGC cert lookup fix, Numista Sets support, Lunar Series chip. Removed pagination controls, placeholder rows, and `currentPage` state
- ~~**Unified settings modal**~~ — **DONE (v3.11.00)**: Consolidated API, Files, and Appearance into single modal with sidebar navigation (Site, API, Files, Cloud, Tools). Theme picker, tabbed API providers, items-per-page persistence, bidirectional control sync. Reduced header from 4 buttons to 2 (About + Settings)
- ~~**Serial # field & Numista UX**~~ — **DONE (v3.10.00 – v3.10.01)**: Serial Number field for bars/notes, Year/Grade/N# filter chips, eBay search includes year, Numista no-results retry with quick-pick bullion list. Numista iframe replaced with popup window for hosted compatibility
- ~~**Inline catalog & grading tags (Phase 2)**~~ — **DONE (v3.09.04 – v3.09.05)**: Year field with inline tag, Grade dropdown (Standard/Mint State/Proof), Grading Authority (PCGS/NGC/ANACS/ICG), Cert # input, color-coded grade badges in Name cell, clickable cert verification links, smart Numista category search, Year/Grade in CSV/JSON export and import
- ~~**Numista API fix (Phase 1)**~~ — **DONE (v3.09.02 – v3.09.03)**: Fixed base URL (`/api/v3` → `/v3`), endpoints (`/items/search` → `/types`), auth (query param → `Numista-API-Key` header), params (`limit` → `count`, `country` → `issuer`, `metal` → `category`), response parsing, field mapping, and localStorage key whitelist. Smart category search mapping Type field to Numista categories
- ~~**Filter chips system (complete)**~~ — **DONE (v3.09.00 – v3.09.01)**: Full chip system: metal, type, location, and normalized name chips. Click-to-filter with toggle. Unified threshold (3+ default), keyword grouping (Goldback/Zombucks/Silverback), starts-with normalizer with 280-item dictionary. Fixed: Silver chip contrast on dark/sepia, duplicate location chips, suppressed "Unknown" locations
- ~~**Spot price card redesign**~~ — **DONE (v3.08.00 – v3.08.01)**: Background sparkline charts with Chart.js, trend range dropdown (7d/30d/60d/90d), sync icon with spin animation, shift+click manual price entry, Metals.dev timeseries endpoint fix, spot history dedup. Totals moved above inventory table, sparkline colors match metal accents
- ~~**Portfolio visibility overhaul**~~ — **DONE (v3.07.00 – v3.07.03)**: Retail/Gain-Loss confidence styling, "All Metals" summary card, Avg Cost/oz metric, metal detail modal with full Purchase/Melt/Retail/Gain-Loss breakdown by type and location. Spot history dedup fix
- ~~**Retail column UX bundle**~~ — **DONE (v3.07.00 + v3.07.02)**: Confidence styling for estimated vs confirmed values (v3.07.00). Shift+click inline editing for all 6 editable columns including Retail — replaces pencil icon approach (v3.07.02)
- ~~**Light & Sepia theme contrast pass**~~ — **DONE (v3.07.01)**: Clean light backgrounds, WCAG AAA text tokens, table zebra striping with theme-aware tokens, removed sticky action columns, sepia global filter removed, WCAG-compliant text contrast
- ~~**eBay search split & icon redesign**~~ — **DONE (v3.06.01 – v3.06.02)**: Clean SVG magnifying glass icon, dead CSS cleanup, About modal overhaul. Purchase column opens active listings, Retail column opens sold listings for price research
- ~~**StakTrakr rebrand**~~ — **DONE (v3.06.00)**: Full rebrand from StackTrackr to StakTrakr across entire codebase with domain-based auto-branding for 3 domains (staktrakr.com, stackrtrackr.com, stackertrackr.com)
- ~~**Unified add/edit modal**~~ — **DONE (v3.05.00 – v3.05.04)**: Merged two modals into one with mode switching, weight precision fix (2→6 decimals), $0 price display, qty-adjusted financials, fraction weight input, duplicate item button, date timezone bug fix, Numista API key simplification
- ~~**Spot price manual input UX**~~ — **DONE (v3.09.00)**: Spot cards with no price data show "Shift+click price to set" hint
- ~~**Duplicate item button**~~ — **DONE (Increment 5)**
- ~~**Fraction input for weight field**~~ — **DONE (Increment 5)**
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
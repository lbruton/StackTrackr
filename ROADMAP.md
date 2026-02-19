# StakTrakr Roadmap

Project direction and planned work. Each item links to its full Linear issue for details, discussion, and status tracking.

**Linear board**: [StakTrakr](https://linear.app/hextrackr/team/STAK/backlog)

---

## Near-Term — Sprint 1: App Health & Dialog Refactor

Replace all native `alert()`/`confirm()`/`prompt()` calls with in-app modal equivalents.
Unblocks browser automation, E2E testing, and PWA polish. Sequenced: shared utility first,
then each feature area.

| Issue | Title | Priority | Notes |
|-------|-------|----------|-------|
| [STAK-166](https://linear.app/hextrackr/issue/STAK-166) | Replace alert/confirm/prompt with in-app modal utility | High | Shared prereq — do first |
| [STAK-161](https://linear.app/hextrackr/issue/STAK-161) | Replace native dialogs: Vault / Encrypted Backup flows | High | After STAK-166 |
| [STAK-162](https://linear.app/hextrackr/issue/STAK-162) | Replace native dialogs: Cloud Storage flows | High | After STAK-166 |
| [STAK-163](https://linear.app/hextrackr/issue/STAK-163) | Replace native dialogs: Import / Export / Restore flows | High | After STAK-166 |
| [STAK-164](https://linear.app/hextrackr/issue/STAK-164) | Replace native dialogs: Settings & Configuration flows | Medium | After STAK-166 |
| [STAK-165](https://linear.app/hextrackr/issue/STAK-165) | Replace native dialogs: Inventory & Bulk Edit flows | Medium | After STAK-166 |

---

## Near-Term — Sprint 2: Accessibility & UX Polish

Accessibility improvements and quality-of-life UX refinements.

| Issue | Title | Priority | Notes |
|-------|-------|----------|-------|
| [STAK-169](https://linear.app/hextrackr/issue/STAK-169) | Style D: Accessible Table Card View | High | WCAG-compliant card layout |
| [STAK-123](https://linear.app/hextrackr/issue/STAK-123) | View Modal Inline Editing | Medium | Edit fields without opening edit modal |

---

## Medium-Term — Sprint 3: Portfolio Depth

Deeper portfolio intelligence — realized gains tracking and PCGS deep integration.

| Issue | Title | Priority | Notes |
|-------|-------|----------|-------|
| [STAK-72](https://linear.app/hextrackr/issue/STAK-72) | Realized gains/losses: track sold, lost, and disposed items | Medium | Most-requested portfolio feature |
| [STAK-99](https://linear.app/hextrackr/issue/STAK-99) | PCGS API Deep Integration — View Modal Verification & Price Guide Lookup | Medium | Extends existing PCGS infrastructure |

---

## Medium-Term — Sprint 4: Custom Theme

User-controlled theming via CSS variable sliders.

| Issue | Title | Priority | Notes |
|-------|-------|----------|-------|
| [STAK-121](https://linear.app/hextrackr/issue/STAK-121) | CSS variable slider-based theme editor | Medium | Four-theme system foundation already in place |

---

## Medium-Term — Feature Depth (Backlog)

Deeper feature work — charts, API integrations, and documentation.

| Issue | Title | Priority | Notes |
|-------|-------|----------|-------|
| [STAK-48](https://linear.app/hextrackr/issue/STAK-48) | Chart system overhaul: migrate to ApexCharts, add time-series trends | Low | Unblocked (STAK-43 done) |
| [STAK-112](https://linear.app/hextrackr/issue/STAK-112) | Settings: Add field selection options for View Modal display | Low | After core modal improvements |
| [STAK-105](https://linear.app/hextrackr/issue/STAK-105) | Full JSDoc coverage and documentation portal | Medium | Community/contributor enablement |
| [STAK-101](https://linear.app/hextrackr/issue/STAK-101) | Numista OAuth 2.0 Integration — Cloud Sync for User Collections | Low | Requires server-side token exchange |

---

## Long-Term — Platform Expansion

New asset classes, cloud infrastructure, and native distribution.

| Issue | Title | Priority | Depends On |
|-------|-------|----------|------------|
| [STAK-76](https://linear.app/hextrackr/issue/STAK-76) | Numismatics expansion: paper notes, non-melt collectibles, asset class field | Low | — |
| [STAK-73](https://linear.app/hextrackr/issue/STAK-73) | Date Run Checklist: track collecting goals with auto-matched year sets | Low | — |
| [STAK-30](https://linear.app/hextrackr/issue/STAK-30) | BYO-Backend: Supabase cloud sync | Low | — |
| [STAK-36](https://linear.app/hextrackr/issue/STAK-36) | Encryption at rest for Supabase data | Low | STAK-30 |
| [STAK-75](https://linear.app/hextrackr/issue/STAK-75) | Desktop wrapper research: Tauri vs Electron for native installers | Low | — |
| [STAK-77](https://linear.app/hextrackr/issue/STAK-77) | Stocks & Crypto module: ticker-based pricing with portfolio tracking | Low | STAK-76 |
| [STAK-78](https://linear.app/hextrackr/issue/STAK-78) | Mobile native app: Capacitor/Tauri wrapper with Supabase sync | Low | STAK-30, STAK-75 |

---

## Long-Term — Cloud Sync (Supabase + GitHub Sponsors)

Encrypted cloud sync for sponsors ($3/month). Zero-knowledge architecture — data encrypted client-side (AES-256-GCM) before upload, decrypted client-side after download. Server never sees plaintext. Self-hostable for users who want their own Supabase instance.

| Issue | Title | Priority | Depends On |
|-------|-------|----------|------------|
| [STAK-30](https://linear.app/hextrackr/issue/STAK-30) | BYO-Backend: Supabase cloud sync (self-host) | Low | — |
| DEVS-5 | Cloud Sync — Supabase-backed encrypted sync for sponsors (epic) | High | — |
| DEVS-6 | M1: Supabase schema, RLS policies & self-host docs | Medium | — |
| DEVS-7 | M2: Client-side sync UI & upload/download logic | Medium | DEVS-6 |
| DEVS-8 | M3: GitHub Action — automated sponsor key lifecycle | Medium | DEVS-6 |

---

## Canceled

| Issue | Title | Reason |
|-------|-------|--------|
| STAK-26 | Batch rename/normalize tool | Covered by existing Bulk Edit + Numista search |
| STAK-28 | Chart.js dashboard improvements | Superseded by STAK-48 (ApexCharts migration) |
| STAK-29 | Custom tagging system | Superseded by STAK-98 (Numista + custom tags with filter chip integration) |
| STAK-35 | Proxmox LXC setup guide | Canceled — Docker (STAK-34) sufficient for self-hosting |
| STAK-39 | Full UI review walkthrough | Rolled into STAK-38 (responsive audit) |
| STAK-41 | Per-item retail price history | Duplicate of STAK-43 |
| STAK-46 | Configurable spot & portfolio card grid with drag-to-reorder | Canceled |
| STAK-53 | Community spot price history CDN via GitHub | Canceled |

---

## Completed

<details>
<summary>Shipped features (click to expand)</summary>

- **v3.31.x** — STAK-98/104: Item tags system (Numista + custom tags, filter chip integration), Save Search as Custom Filter Chip
- **v3.30.00** — STAK-118/106/124/125/126: Card View Engine, Mobile Overhaul & UI Polish — three card styles with sparkline headers, CDN image URLs, mobile viewport overhaul, rows-per-page with back-to-top, theme-aware sparklines
- **v3.29.06** — STAK-115/116/117: Design System & Settings Polish — unified toggle styles, Appearance tab fieldset redesign, living style guide (style.html), CSS design system coding standards
- **v3.29.04** — STAK-110/111/113: View Modal Visual Sprint — cert badge overlay with authority colors, chart range pills (1Y/5Y/10Y/Purchased), valuation-first default order, purchase date in valuation
- **v3.29.03** — STAK-108/109/103: Price history bug fix, per-item price history management UI with inline delete and undo/redo, chart fixes (seed bundle for file://, adaptive x-axis labels, custom date range picker)
- **v3.29.02** — PWA crash fix: service worker error handling for all fetch strategies
- **v3.29.01** — Codacy duplication reduction: shared toggle helpers, merged config renderers, deduplicated builders
- **v3.29.00** — STAK-94 (Epic): Local Image System — image processor (STAK-95), seeded image library (STAK-96), images settings tab (STAK-102), user photo upload (STAK-32), mobile camera capture (STAK-33), image quota manager (STAK-97), edit modal pattern rule toggle
- **v3.28.04** — STAK-91: Item View Modal overhaul — price history charts, valuation section, section reordering
- **v3.28.03** — STAK-84: Table row thumbnail images with hover/click preview
- **v3.28.02** — STAK-87/88: Bulk cache all inventory coin images, include image cache in ZIP backup/restore
- **v3.28.01** — STAK-89/92: Fix 24h % on spot cards, spot card comparison mode setting (Close/Close, Open/Open, Open/Close)
- **v3.28.00** — STAK-90/93/107: Mobile API settings fix, What's New splash bug fix, backup restore hydration fix
- **v3.27.05** — STAK-81/82/83/85/86: parsePriceToUSD fix, stale spot-lookup fix, Activity Log stale data fix, Samsung S24+ layout fix, remove redundant View icon
- **v3.27.04** — STAK-63: Time Zone Selection for Timestamps
- **v3.27.03** — STAK-74: PWA support — manifest, service worker, installable app experience
- **v3.27.02** — Multi-color storage bar: stacked localStorage (blue) + IndexedDB (green) segments with tooltips
- **v3.27.01** — Iframe to popup window migration for source URLs and Numista links
- **v3.27.00** — STAK-37: Coin image cache (IndexedDB, 50MB quota) & item view modal with Numista enrichment, metadata caching, eBay search
- **v3.26.03** — STAK-79/80: XSS & HTML injection hardening with shared `escapeHtml()` utility
- **v3.26.02** — Autocomplete migration fix, version check CORS fix
- **v3.26.01** — Fuzzy autocomplete settings toggle
- **v3.26.00** — STAK-62: Autocomplete & fuzzy search pipeline with abbreviation expansion
- **v3.25.05** — STAK-71: Details modal QoL — responsive charts, pie slice labels, scrollable breakdown
- **v3.25.04** — STAK-70: Mobile-optimized modals — full-screen at ≤768px, touch-sized inputs, landscape card view
- **v3.25.03** — STAK-31/38: Responsive card view & mobile layout — CSS card view at ≤768px, table CSS hardening
- **v3.25.02** — STAK-56/61: Codebase refactoring — complexity reduction, CCN decomposition, modularization
- **v3.25.01** — STAK-64/67: Version splash fix (friendly announcements), footer version badge with remote update check, sponsor badges
- **v3.25.00** — STAK-54/65/66: Appearance settings (header buttons, layout toggles), spot lookup fix, sparkline improvements
- **v3.24.01** — STAK-57: ZIP/JSON backup fix — Goldback fields, weightUnit, purity, marketValue preserved on restore
- **v3.24.00** — STAK-50: Multi-currency support with 17-currency display, daily exchange rate conversion, dynamic formatting
- **v3.23.02** — STAK-52: Bulk Edit pinned selections, dormant prototype cleanup
- **v3.23.01** — Goldback real-time estimation, Settings reorganization
- **v3.23.00** — STAK-42/43/44/45: Persistent UUIDs, silent price history recording, Settings Log sub-tabs, Goldback denomination pricing & type support
- **v3.22.01** — Form layout, bulk edit dropdowns, purity chips
- **v3.22.00** — STAK-22/24/25/27: Purity field & melt formula, PCGS quota bar, pie chart metric toggle, test-loader extraction
- **v3.21.03** — STAK-23: Search matches custom chip group labels
- **v3.21.02** — Seed data & first-time UX: 720 seed spot history entries, 8 sample inventory items, README overhaul
- **v3.21.01 – v3.21.02** — Spot card % change, spot history import/export, provider sync toggle, PCGS persistence
- **v3.21.00** — PCGS# field & cert verification, Bearer token config, PCGS in search/bulk edit/export
- **v3.20.00** — Bulk Edit tool: full-screen modal, 16 editable fields, searchable table, copy/delete in bulk
- **v3.19.00** — Filter chip category toggles & sort in Settings > Chips
- **v3.18.00** — API Settings redesign: Numista first-class tab, drag-to-reorder, compact header
- **v3.17.00** — Inline chip settings, search expansion, ZIP backup includes chip settings
- **v3.16.00 – v3.16.02** — Custom chip grouping, chip blacklist, dynamic name chips, API settings fix
- **v3.14.00 – v3.14.01** — Encrypted portable backup (.stvault), AES-256-GCM
- **v3.12.00 – v3.12.02** — Portal view (scrollable table), NGC cert lookup, Numista Sets
- **v3.11.00** — Unified settings modal with sidebar navigation
- **v3.10.00 – v3.10.01** — Serial # field, Year/Grade/N# filter chips, Numista UX improvements
- **v3.09.04 – v3.09.05** — Inline catalog & grading tags, grade badges, cert verification
- **v3.09.02 – v3.09.03** — Numista API fix (base URL, endpoints, auth, params, field mapping)
- **v3.09.00 – v3.09.01** — Filter chips system, keyword grouping, 280-item normalizer dictionary
- **v3.08.00 – v3.08.01** — Spot price card redesign, sparkline charts, trend range dropdown
- **v3.07.00 – v3.07.03** — Portfolio visibility overhaul, retail/gain-loss confidence styling, metal detail modal
- **v3.07.00 + v3.07.02** — Retail column UX & inline editing
- **v3.07.01** — Light & Sepia theme contrast pass (WCAG AAA)
- **v3.06.01 – v3.06.02** — eBay search split, SVG icon, About modal overhaul
- **v3.06.00** — StakTrakr rebrand with domain-based auto-branding
- **v3.05.00 – v3.05.04** — Unified add/edit modal, weight precision, fraction input, duplicate button

</details>

# StakTrakr Roadmap

Project direction and planned work. Each item links to its full Linear issue for details, discussion, and status tracking.

**Linear board**: [StackTrackr](https://linear.app/hextrackr/team/STACK/backlog)

---

## Near-Term — Next Up

Image cache and mobile views are shipped (v3.27.xx). These items are unblocked and ready for the next sprint.

| Issue | Title | Priority | Depends On |
|-------|-------|----------|------------|
| [STACK-85](https://linear.app/hextrackr/issue/STACK-85) | Fix item detail modal layout overlap on Samsung S24+ Ultra | High | — |
| [STACK-88](https://linear.app/hextrackr/issue/STACK-88) | Include image cache in ZIP backup and restore | High | — |
| [STACK-81](https://linear.app/hextrackr/issue/STACK-81) | Fix parsePriceToUSD ignoring edit-mode parameters (silent price zeroing) | Medium | — |
| [STACK-82](https://linear.app/hextrackr/issue/STACK-82) | Fix stale spot-lookup override persisting across date changes | Medium | — |
| [STACK-84](https://linear.app/hextrackr/issue/STACK-84) | Table Row Thumbnail Images with Hover/Click Preview | Medium | STACK-87 |
| [STACK-87](https://linear.app/hextrackr/issue/STACK-87) | Bulk cache all inventory coin images in one action | Medium | — |
| [STACK-48](https://linear.app/hextrackr/issue/STACK-48) | Chart system overhaul: migrate to ApexCharts, add time-series trends | Medium | STACK-43 ✅ |
| [STACK-72](https://linear.app/hextrackr/issue/STACK-72) | Realized gains/losses: track sold, lost, and disposed items | Medium | — |
| [STACK-73](https://linear.app/hextrackr/issue/STACK-73) | Date Run Checklist: track collecting goals with auto-matched year sets | Medium | — |
| [STACK-74](https://linear.app/hextrackr/issue/STACK-74) | PWA support: manifest, service worker, installable app experience | Medium | — |
| [STACK-76](https://linear.app/hextrackr/issue/STACK-76) | Numismatics expansion: paper notes, non-melt collectibles, asset class field | Medium | — |
| [STACK-86](https://linear.app/hextrackr/issue/STACK-86) | Remove redundant View icon from action row | Low | — |
| [STACK-83](https://linear.app/hextrackr/issue/STACK-83) | Fix Activity Log sub-tabs showing stale data after first render | Low | — |
| [STACK-63](https://linear.app/hextrackr/issue/STACK-63) | Time Zone Selection for Timestamps | Low | — |

---

## Medium-Term — Cloud Sync (Supabase + GitHub Sponsors)

Encrypted cloud sync for sponsors ($3/month). Zero-knowledge architecture — data encrypted client-side (AES-256-GCM) before upload, decrypted client-side after download. Server never sees plaintext. Self-hostable for users who want their own Supabase instance.

| Issue | Title | Priority | Depends On |
|-------|-------|----------|------------|
| [STACK-30](https://linear.app/hextrackr/issue/STACK-30) | BYO-Backend: Supabase cloud sync (self-host) | Medium | — |
| DEVS-5 | Cloud Sync — Supabase-backed encrypted sync for sponsors (epic) | High | — |
| DEVS-6 | M1: Supabase schema, RLS policies & self-host docs | Medium | — |
| DEVS-7 | M2: Client-side sync UI & upload/download logic | Medium | DEVS-6 |
| DEVS-8 | M3: GitHub Action — automated sponsor key lifecycle | Medium | DEVS-6 |

---

## Long-Term — Polish & Distribution

Enhanced UX, mobile support, deployment options, and the v4 vision.

| Issue | Title | Priority | Depends On |
|-------|-------|----------|------------|
| [STACK-47](https://linear.app/hextrackr/issue/STACK-47) | v4.00.00 — Multi-asset wealth dashboard (Stocks, Crypto, Collectibles, Real Estate) | Low | STACK-42, STACK-43, STACK-45 |
| [STACK-75](https://linear.app/hextrackr/issue/STACK-75) | Desktop wrapper research: Tauri vs Electron for native installers | Low | STACK-74 |
| [STACK-77](https://linear.app/hextrackr/issue/STACK-77) | Stocks & Crypto module: ticker-based pricing with portfolio tracking | Low | STACK-76 |
| [STACK-78](https://linear.app/hextrackr/issue/STACK-78) | Mobile native app: Capacitor/Tauri wrapper with Supabase sync | Low | STACK-30, STACK-74, STACK-75 |
| [STACK-32](https://linear.app/hextrackr/issue/STACK-32) | User photo upload for inventory items | Low | STACK-30 |
| [STACK-33](https://linear.app/hextrackr/issue/STACK-33) | Mobile camera capture in add/edit modal | Low | STACK-32 |
| [STACK-34](https://linear.app/hextrackr/issue/STACK-34) | Docker build & image for self-hosting | Low | — |

---

## Deferred

Explicitly out of scope until prerequisites are met.

| Issue | Title | Priority | Depends On |
|-------|-------|----------|------------|
| [STACK-36](https://linear.app/hextrackr/issue/STACK-36) | Encryption at rest for Supabase data | Low | STACK-30 |
| [STACK-40](https://linear.app/hextrackr/issue/STACK-40) | eBay API integration for retail estimates | Low | STACK-30 |

---

## Canceled

| Issue | Title | Reason |
|-------|-------|--------|
| STACK-26 | Batch rename/normalize tool | Covered by existing Bulk Edit + Numista search |
| STACK-28 | Chart.js dashboard improvements | Superseded by STACK-48 (ApexCharts migration) |
| STACK-29 | Custom tagging system | Covered by existing custom chip grouping system |
| STACK-35 | Proxmox LXC setup guide | Canceled — Docker (STACK-34) sufficient for self-hosting |
| STACK-39 | Full UI review walkthrough | Rolled into STACK-38 (responsive audit) |
| STACK-41 | Per-item retail price history | Duplicate of STACK-43 |
| STACK-46 | Configurable spot & portfolio card grid with drag-to-reorder | Canceled |
| STACK-53 | Community spot price history CDN via GitHub | Canceled |

---

## Completed

<details>
<summary>Shipped features (click to expand)</summary>

- **v3.27.02** — Multi-color storage bar: stacked localStorage (blue) + IndexedDB (green) segments with tooltips
- **v3.27.01** — Iframe to popup window migration for source URLs and Numista links
- **v3.27.00** — STACK-37: Coin image cache (IndexedDB, 50MB quota) & item view modal with Numista enrichment, metadata caching, eBay search
- **v3.26.03** — STACK-79/80: XSS & HTML injection hardening with shared `escapeHtml()` utility
- **v3.26.02** — Autocomplete migration fix, version check CORS fix
- **v3.26.01** — Fuzzy autocomplete settings toggle
- **v3.26.00** — STACK-62: Autocomplete & fuzzy search pipeline with abbreviation expansion
- **v3.25.05** — STACK-71: Details modal QoL — responsive charts, pie slice labels, scrollable breakdown
- **v3.25.04** — STACK-70: Mobile-optimized modals — full-screen at ≤768px, touch-sized inputs, landscape card view
- **v3.25.03** — STACK-31/38: Responsive card view & mobile layout — CSS card view at ≤768px, table CSS hardening
- **v3.25.02** — STACK-56/61: Codebase refactoring — complexity reduction, CCN decomposition, modularization
- **v3.25.01** — STACK-64/67: Version splash fix (friendly announcements), footer version badge with remote update check, sponsor badges
- **v3.25.00** — STACK-54/65/66: Appearance settings (header buttons, layout toggles), spot lookup fix, sparkline improvements
- **v3.24.01** — STACK-57: ZIP/JSON backup fix — Goldback fields, weightUnit, purity, marketValue preserved on restore
- **v3.24.00** — STACK-50: Multi-currency support with 17-currency display, daily exchange rate conversion, dynamic formatting
- **v3.23.02** — STACK-52: Bulk Edit pinned selections, dormant prototype cleanup
- **v3.23.01** — Goldback real-time estimation, Settings reorganization
- **v3.23.00** — STACK-42/43/44/45: Persistent UUIDs, silent price history recording, Settings Log sub-tabs, Goldback denomination pricing & type support
- **v3.22.01** — Form layout, bulk edit dropdowns, purity chips
- **v3.22.00** — STACK-22/24/25/27: Purity field & melt formula, PCGS quota bar, pie chart metric toggle, test-loader extraction
- **v3.21.03** — STACK-23: Search matches custom chip group labels
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

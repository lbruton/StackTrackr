# StakTrakr Roadmap

Project direction and planned work. Each item links to its full Linear issue for details, discussion, and status tracking.

**Linear board**: [StackTrackr](https://linear.app/hextrackr/team/STACK/backlog)

---

## Near-Term — Price History Foundation

The UUID → silent recording → log tabs → charts pipeline. STACK-42 is the critical path that unblocks the rest.

| Issue | Title | Priority | Depends On |
|-------|-------|----------|------------|
| [STACK-42](https://linear.app/hextrackr/issue/STACK-42) | Assign persistent UUIDs to all inventory items | **High** | — |
| [STACK-41](https://linear.app/hextrackr/issue/STACK-41) | Per-item retail price history for trend charts | Medium | STACK-42 |
| [STACK-43](https://linear.app/hextrackr/issue/STACK-43) | Silent per-item price history recording | Medium | STACK-42 |
| [STACK-44](https://linear.app/hextrackr/issue/STACK-44) | Settings Log tab reorganization with sub-tabs | Medium | STACK-43 |

---

## Near-Term — Features & UI

Independent feature work that can proceed in parallel with the price history pipeline.

| Issue | Title | Priority | Depends On |
|-------|-------|----------|------------|
| [STACK-45](https://linear.app/hextrackr/issue/STACK-45) | Goldback denomination pricing & type support | Medium | — |
| [STACK-46](https://linear.app/hextrackr/issue/STACK-46) | Configurable spot & portfolio card grid with drag-to-reorder | Medium | STACK-45 (for Goldback card) |
| [STACK-48](https://linear.app/hextrackr/issue/STACK-48) | Chart system overhaul: migrate to ApexCharts, add time-series trends | Medium | STACK-43 (for time-series data) |

---

## Medium-Term — BYO-Backend (Supabase Cloud Sync)

Zero-cost, zero-server architecture. App stays static; users who want cloud sync bring their own free Supabase project.

| Issue | Title | Priority | Depends On |
|-------|-------|----------|------------|
| [STACK-30](https://linear.app/hextrackr/issue/STACK-30) | BYO-Backend: Supabase cloud sync | Medium | — |

---

## Long-Term — Polish & Distribution

Enhanced UX, mobile support, deployment options, and the v4 vision.

| Issue | Title | Priority | Depends On |
|-------|-------|----------|------------|
| [STACK-47](https://linear.app/hextrackr/issue/STACK-47) | v4.00.00 — Multi-asset wealth dashboard (Stocks, Crypto, Collectibles, Real Estate) | Low | STACK-42, STACK-43, STACK-45, STACK-46 |
| [STACK-31](https://linear.app/hextrackr/issue/STACK-31) | Mobile-responsive card view | Low | — |
| [STACK-32](https://linear.app/hextrackr/issue/STACK-32) | User photo upload for inventory items | Low | STACK-30 |
| [STACK-33](https://linear.app/hextrackr/issue/STACK-33) | Mobile camera capture in add/edit modal | Low | STACK-31, STACK-32 |
| [STACK-34](https://linear.app/hextrackr/issue/STACK-34) | Docker build & image for self-hosting | Low | — |
| [STACK-35](https://linear.app/hextrackr/issue/STACK-35) | Proxmox LXC setup guide | Low | STACK-34 |
| [STACK-37](https://linear.app/hextrackr/issue/STACK-37) | Numista image & API caching | Low | STACK-30 |

---

## Deferred

Explicitly out of scope until prerequisites are met.

| Issue | Title | Priority | Depends On |
|-------|-------|----------|------------|
| [STACK-36](https://linear.app/hextrackr/issue/STACK-36) | Encryption at rest for Supabase data | Low | STACK-30 |
| [STACK-38](https://linear.app/hextrackr/issue/STACK-38) | Table CSS hardening & responsive audit | Low | — |
| [STACK-39](https://linear.app/hextrackr/issue/STACK-39) | Full UI review walkthrough | Low | — |
| [STACK-40](https://linear.app/hextrackr/issue/STACK-40) | eBay API integration for retail estimates | Low | STACK-30 |

---

## Canceled

| Issue | Title | Reason |
|-------|-------|--------|
| STACK-26 | Batch rename/normalize tool | Covered by existing Bulk Edit + Numista search |
| STACK-28 | Chart.js dashboard improvements | Superseded by STACK-48 (ApexCharts migration) |
| STACK-29 | Custom tagging system | Canceled |

---

## Completed

<details>
<summary>Shipped features (click to expand)</summary>

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

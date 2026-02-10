# StakTrakr Roadmap

Project direction and planned work. Each item links to its full Linear issue for details, discussion, and status tracking.

**Linear board**: [StackTrackr](https://linear.app/hextrackr/team/STACK/backlog)

---

## Near-Term (UI Focus)

Visual polish and usability improvements — no backend changes required.

### Active Backlog

| Issue | Title | Priority | Label |
|-------|-------|----------|-------|
| [STACK-26](https://linear.app/hextrackr/issue/STACK-26) | Batch rename/normalize tool (Numista-powered) | Medium | Feature |
| [STACK-28](https://linear.app/hextrackr/issue/STACK-28) | Chart.js dashboard improvements | Low | Feature |
| [STACK-29](https://linear.app/hextrackr/issue/STACK-29) | Custom tagging system | Low | Feature |

---

## Medium-Term (BYO-Backend — Supabase Cloud Sync)

Zero-cost, zero-server architecture. App stays static; users who want cloud sync bring their own free Supabase project.

| Issue | Title | Priority | Label |
|-------|-------|----------|-------|
| [STACK-30](https://linear.app/hextrackr/issue/STACK-30) | BYO-Backend: Supabase cloud sync | Medium | Feature |

---

## Long-Term (Polish & Distribution)

Enhanced UX, mobile support, and deployment options.

| Issue | Title | Priority | Label | Blocked By |
|-------|-------|----------|-------|------------|
| [STACK-31](https://linear.app/hextrackr/issue/STACK-31) | Mobile-responsive card view | Low | Feature | — |
| [STACK-32](https://linear.app/hextrackr/issue/STACK-32) | User photo upload for inventory items | Low | Feature | STACK-30 |
| [STACK-33](https://linear.app/hextrackr/issue/STACK-33) | Mobile camera capture in add/edit modal | Low | Feature | STACK-31, STACK-32 |
| [STACK-34](https://linear.app/hextrackr/issue/STACK-34) | Docker build & image for self-hosting | Low | Feature | — |
| [STACK-35](https://linear.app/hextrackr/issue/STACK-35) | Proxmox LXC setup guide | Low | Feature | STACK-34 |

---

## Deferred

Explicitly out of scope until prerequisites are met.

| Issue | Title | Priority | Label | Blocked By |
|-------|-------|----------|-------|------------|
| [STACK-36](https://linear.app/hextrackr/issue/STACK-36) | Encryption at rest for Supabase data | Low | Feature | STACK-30 |
| [STACK-37](https://linear.app/hextrackr/issue/STACK-37) | Numista image caching (CC-licensed only) | Low | Feature | STACK-30 |
| [STACK-38](https://linear.app/hextrackr/issue/STACK-38) | Table CSS hardening & responsive audit | Low | Improvement | — |
| [STACK-39](https://linear.app/hextrackr/issue/STACK-39) | Full UI review walkthrough | Low | Improvement | — |
| [STACK-40](https://linear.app/hextrackr/issue/STACK-40) | eBay API integration for retail estimates | Low | Feature | STACK-30 |

---

## Completed

<details>
<summary>Shipped features (click to expand)</summary>

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

# StakTrakr

[![MIT License](https://img.shields.io/github/license/lbruton/StakTrakr?style=flat-square)](https://github.com/lbruton/StakTrakr/blob/main/LICENSE)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/b8d30126676546cb958fa6a7e0174da8)](https://app.codacy.com/gh/lbruton/StakTrakr/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![GitHub Issues](https://img.shields.io/github/issues/lbruton/StakTrakr?style=flat-square)](https://github.com/lbruton/StakTrakr/issues)
[![Reddit Community](https://img.shields.io/reddit/subreddit-subscribers/staktrakr?style=flat-square&label=community)](https://www.reddit.com/r/staktrakr/)
[![Sponsor](https://img.shields.io/badge/sponsor-%E2%99%A1-ea4aaa?style=flat-square)](https://github.com/sponsors/lbruton)
[![Maintained by Claude Code](https://img.shields.io/badge/Maintained%20by-Claude%20Code-blueviolet)](https://claude.com/claude-code)

**Track your precious metals stack. Your way.**

A powerful, privacy-first portfolio tracker for Silver, Gold, Platinum, Palladium, and Goldbacks.
Runs entirely in your browser — your stack, your data, your rules.

**Try it now:** [www.staktrakr.com](https://www.staktrakr.com)

![StakTrakr Screenshot](ScreenshotStakTrakr.png)

---

## Why StakTrakr?

Most precious metals apps want your email, store your data on their servers, or lock features behind a paywall. StakTrakr is different:

- **100% client-side** — all data lives in your browser. The full source is available to anyone; it even runs on `file://` from a single HTML file
- **Zero data collection** — no account, no email, no profile. Nothing leaves your device unless you explicitly cloud-backup
- **Works offline** — once loaded, the app works without internet (spot prices require connectivity)
- **Portable** — download the ZIP, open `index.html`, and it runs anywhere, forever
- **Open source** — MIT licensed, fork it, hack it, make it yours
- **Free, always** — every feature is free. Optional sponsorships support the free API and future cloud infrastructure

---

## Features

### Live Spot Prices

Real-time prices from multiple API providers with automatic failover:

- **Free, keyless provider** — `api.staktrakr.com` delivers hourly spot prices out of the box; no API key needed to get started
- **Sparkline charts** — interactive mini price charts with 7d / 30d / 60d / 90d range selector
- **Percentage change** — see how each metal has moved over your selected timeframe
- **Provider priority** — configure up to 5 API providers (Metals.dev, MetalPriceAPI, GoldAPI, and more) with configurable sync priority
- **Seed data included** — years of historical prices baked in; sparklines work from day one

### Portfolio Tracking

Full per-item tracking with a rich data model:

- **Purchase Price / Melt Value / Retail Price** with computed Gain/Loss per item and portfolio-wide
- **Goldback support** — denomination-aware pricing (1, 5, 10, 25, 50) with real-time estimation and manual rate management
- **Year, Grade, Grading Authority, Cert #** — full numismatic metadata
- **PCGS catalog numbers** with inline chips and one-click CoinFacts lookup
- **PCGS / NGC cert verification** — verify grading directly from the inventory table
- **Serial numbers** for bars and notes, **Notes** per item with indicator badges
- **Item photos** — upload your own photos or pull CDN images from Numista; obverse and reverse supported

### Four Card Styles + Table View

- **Style A — Sparkline Header**: live price chart in the card header
- **Style B — Full-Bleed Overlay**: image-dominant with overlay text
- **Style C — Split Card**: image left, data right
- **Style D — Accessible Table** *(in progress)*: WCAG-compliant horizontal-scroll layout
- **Table view** with multi-column sorting, per-item thumbnails, and inline chip badges
- Toggle between card and table with a single header button

### Smart Filter Chips

A filtering system that adapts to your collection:

- **Auto-generated chips** — Metal, Type, Name, Year, Grade, Numista ID, Source, and Storage Location chips appear automatically
- **Smart name grouping** — "American Silver Eagle" consolidates into one chip with count badge
- **Save Search as Chip** — bookmark a multi-term comma-separated search as a persistent custom filter chip
- **Custom grouping rules** — define your own chip labels matching multiple name variants
- **Dynamic chips** — auto-extract text from parentheses and quotes in item names
- **Chip blacklist** — right-click any chip to hide it
- **10 configurable categories** — enable/disable, reorder, and sort (A-Z or by count)

### Item Tags

- **Numista tags** — synced automatically from the Numista API (Bullion, Proof, Commemorative, etc.)
- **Custom tags** — add your own tags per item with autocomplete from existing tags
- **Tag management** — rename and delete tags globally across all items
- **Filter integration** — tags show as filter chips and are searchable

### Numista & PCGS Integration

- **Numista search** — look up any coin, get catalog numbers, images, and metadata
- **Bulk sync** — sync metadata and CDN image URLs for your entire inventory in one operation with progress log
- **Custom pattern rules** — regex-based rules that auto-match Numista catalog IDs to your item names
- **PCGS lookup** — search by PCGS number, populate form fields from catalog data
- **Cert verification** — grade badge on PCGS/NGC graded items links directly to the grading service
- **Inline chips** — N#, PCGS#, Grade, Year, Serial, Storage, and Notes badges in the Name column (configurable)

### Item View Modal

Click any item for a full-detail view:

- **Price history chart** — melt value derived from spot history since purchase, retail line, 1Y/5Y/10Y/Purchased range pills, and a custom date range picker
- **Certification badge** — authority-color-coded (PCGS gold, NGC blue, etc.) with one-click cert verification
- **Valuation section** — purchase price, melt value, retail, gain/loss with purchase date shown
- **Numista metadata** — type, composition, weight, series, and description from the Numista API
- **Tags** — view and manage item tags inline

### Cloud Backup

Encrypt your inventory and back it up to the cloud:

- **Dropbox** — connect via OAuth PKCE, upload/download encrypted `.stvault` files (AES-256-GCM)
- **Coming soon** — Google Drive, OneDrive, pCloud, Box (same encryption, all client-side)
- **Zero-knowledge** — the cloud provider receives only ciphertext; your plaintext never leaves your device

### Import / Export / Backup

- **CSV import** — intelligent field mapping, regex-based custom rules, merge/override modes
- **CSV / JSON / PDF export** — all fields including numismatic metadata and image URLs
- **ZIP backup** — full application state (inventory, settings, API keys, price history, image URLs)
- **Encrypted vault** — AES-256-GCM `.stvault` files with PBKDF2 key derivation and password strength meter
- **Spot history import/export** — export price history as CSV, import on another device

### Bulk Edit

Full-screen bulk operations in Settings > Inventory:

- Select multiple items with a searchable checkbox table
- Edit 16 fields at once with enable/disable toggles per field
- Copy or delete items in bulk
- Numista Lookup populates bulk fields from catalog data

### Settings

Everything in one place with sidebar navigation:

| Tab | What's Here |
|-----|-------------|
| **Appearance** | Theme (Light / Dark / Sepia / System), header button visibility, layout options |
| **Inventory** | Card styles (A/B/C/D), default sort, visible rows, import/export/backup controls |
| **Chips** | Category toggles, sort order, grouping rules, blacklist |
| **API** | Multi-provider configuration with priority order, Numista and PCGS tabs, usage tracking |
| **Cloud** | Dropbox connection, cloud backup/restore, activity log |
| **System** | Timezone, storage dashboard, reset |
| **Log** | Full change log with undo/redo |
| **FAQ** | Privacy, backup, security, and limitations — built into the app |

### More

- **PWA support** — install to your home screen / desktop, works offline
- **Multi-currency** — 17 currencies with live exchange rates (Open Exchange Rates)
- **Fuzzy search** — across all fields including Year, Grade, Cert #, and Numista ID
- **Shift+click inline editing** — click any editable cell to edit in place
- **Per-item price history** — track retail price over time with inline chart and delete controls
- **Change log** — tracks every edit with full undo/redo
- **Storage dashboard** — see localStorage (blue) and IndexedDB (green) usage side by side
- **Timezone-aware** — all timestamps display in your configured timezone; stored data stays UTC
- **Style guide** — `style.html` design system reference with theme switching and all UI components

---

## Getting Started

### Option 1 — Just open it

Download a release ZIP, extract, and open `index.html` in any modern browser. No server required.

### Option 2 — Local HTTP server

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

### Option 3 — Live site

Visit [www.staktrakr.com](https://www.staktrakr.com) — same app, hosted on Cloudflare Pages.

### First launch

StakTrakr comes pre-loaded with **sample inventory items** and **years of spot price history** so you can explore every feature immediately. Sample items are clearly labeled — edit or delete them whenever you're ready.

Live spot prices work out of the box via the free `api.staktrakr.com` provider. For higher-frequency updates, add a free API key from [Metals.dev](https://metals.dev) or another supported provider in Settings > API.

---

## Data & Privacy

- **No server-side component** — the developer has no technical means to access your data
- **No cookies, no tracking SDKs, no advertising** — the app uses only localStorage and IndexedDB for your own data
- **Cloudflare Web Analytics** runs on the hosted site (staktrakr.com) — aggregated, anonymous page-view counts only; no cookies, no individual fingerprinting. Not present when running locally
- **Cloud backup is zero-knowledge** — AES-256-GCM + PBKDF2-SHA256 (100,000 iterations) via the Web Crypto API; the cloud provider receives only ciphertext
- **localStorage caveat** — browser storage can be cleared. Export ZIP or vault backups regularly, especially on iOS Safari

Full details in the [Privacy Policy](https://www.staktrakr.com/privacy.html) and the FAQ tab in Settings.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Pure client-side JavaScript (no framework, no build step) |
| Storage | Browser localStorage + IndexedDB |
| Encryption | Web Crypto API — AES-256-GCM via PBKDF2 |
| Styling | Vanilla CSS with CSS custom properties, responsive breakpoints |
| Charts | Chart.js 3.9.1 |
| CSV | PapaParse 5.4.1 |
| PDF | jsPDF 2.5.1 + AutoTable 3.5.25 |
| Backup | JSZip 3.10.1 |
| Hosting | Cloudflare Pages |
| Spot API | api.staktrakr.com (free, keyless) + Metals.dev, MetalPriceAPI, GoldAPI, others |
| Catalog | Numista API, PCGS CoinFacts |
| Exchange Rates | Open Exchange Rates |
| Security tooling | Codacy (A+), CodeQL, Semgrep, PMD, ESLint |

---

## Project Structure

```
index.html                  Main application (single page)
css/styles.css              Complete styling (CSS custom properties, four themes)
js/                         50+ JavaScript modules — strict load order via index.html
  constants.js                Global config, API providers, storage keys, app version
  state.js                    Application state (inventory, spotPrices, DOM refs)
  utils.js                    Formatting, validation, storage helpers, sanitizeHtml
  inventory.js                Core CRUD, table rendering, CSV/PDF/ZIP export
  events.js                   Event handlers and UI interactions
  init.js                     Application initialization (loads last)
  spot.js                     Spot price history, sparklines, card indicators
  api.js                      Multi-provider pricing API integration
  filters.js                  Smart filter chips (10 categories)
  chip-grouping.js            Custom chip grouping rules engine
  tags.js                     Per-item tagging system (Numista + custom tags)
  card-view.js                Card view engine — styles A, B, C, D
  sorting.js                  Multi-column table sorting
  charts.js                   Chart.js spot price visualization
  image-processor.js          Image resize/compress (WebP/JPEG adaptive)
  image-cache.js              IndexedDB image cache (coin photos + CDN images)
  bulk-image-cache.js         Batch Numista metadata and image URL sync
  catalog-api.js              Numista API client
  catalog-manager.js          Catalog orchestration
  pcgs-api.js                 PCGS CoinFacts + cert verification
  numista-lookup.js           Pattern-based Numista lookup rules engine
  vault.js                    AES-256-GCM encrypted backup (.stvault)
  cloud-storage.js            Dropbox OAuth PKCE, encrypted cloud backup/restore
  viewModal.js                Full item view modal — charts, tags, cert badge
  bulkEdit.js                 Bulk item operations (BETA)
  settings.js                 Unified settings modal
  settings-listeners.js       Settings event binders
  priceHistory.js             Per-item retail price history tracking
  spotLookup.js               Multi-provider spot price fetching orchestrator
  goldback.js                 Goldback denomination pricing
  about.js                    About modal, What's New, embedded FAQ fallback
  versionCheck.js             Version change detection, What's New splash
  customMapping.js            Regex-based CSV field mapping engine
  ...and more
data/
  spot-history-bundle.js      Bundled historical spot prices (loaded via <script>)
  spot-history-YYYY.json      Per-year spot price JSON (1968–2026), Docker poller
docs/
  cloud-storage-setup.md      Cloud provider OAuth setup guide
sw.js                         Service worker — offline caching, PWA support
version.json                  Remote version check endpoint
```

---

## Contributing

Bug reports and pull requests are welcome. Please open an [issue](https://github.com/lbruton/StakTrakr/issues) first to discuss significant changes.

The app must remain a **zero-install, single-page, vanilla JS** application — no build step, no framework, works on `file://` protocol. Development tooling (tests, linters, build scripts) lives in `devops/` and is fine.

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

## Community

- Reddit: [r/staktrakr](https://www.reddit.com/r/staktrakr/)
- Issues: [GitHub Issues](https://github.com/lbruton/StakTrakr/issues)
- Sponsor: [GitHub Sponsors](https://github.com/sponsors/lbruton)

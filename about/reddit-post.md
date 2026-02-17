# StakTrakr — Free, Open-Source Precious Metals Inventory Tracker

**Your Stack. Your Way.**

Hey everyone! Wanted to share StakTrakr with the community. It's a free, open-source precious metals inventory tracker I've been building for Silver, Gold, Platinum, and Palladium collectors.

**The easiest way to try it:** [staktrakr.com](https://www.staktrakr.com)

If you prefer to run it locally, grab the latest release from [GitHub](https://github.com/lbruton/StakTrakr/releases/latest), unzip, and open `index.html`. That's it — no install, no server, no account required.

---

## What Makes It Different

- **100% local** — Your data lives in your browser's localStorage. Nothing is sent to a server. No account, no cloud, no tracking
- **Works offline** — It's a single HTML page with vanilla JavaScript. Open it from a file, bookmark it, use it on a plane
- **Free spot prices** — Ships with a free keyless API that pulls live Silver, Gold, Platinum, and Palladium spot prices automatically
- **Real portfolio tracking** — Purchase Price / Melt Value / Retail Price with computed Gain/Loss per item and across your whole stack

---

## Pro Tip: Get a Numista API Key (Free)

To get the most out of StakTrakr, grab a free API key from [Numista](https://en.numista.com/). After you register, scroll to the **bottom of your profile page** — your API key is in the developer section. Paste it into Settings > API > Numista and suddenly StakTrakr can auto-populate coin details, pull catalog images, and link to reference pages. Huge time saver when adding items.

StakTrakr also supports **PCGS number validation** for grading, and if you want more spot price providers beyond the free keyless API, you can plug in keys for MetalPriceAPI, Metals.dev, or MetalsAPI.

---

## Screenshots

Here's a walkthrough of the app with live data.

### Table View

> [INSERT: 00-main-dark-table.png]

The default view — sortable table with thumbnail images, inline metadata chips, color-coded filter bar, live spot prices with sparklines, and full portfolio breakdown per metal.

### Card View — Small Cards

> [INSERT: 01-main-dark-cards-small.png]

Toggle to card view for a more visual layout. Three card sizes available.

### Item Detail

> [INSERT: 02-detail-modal.png]

Click any item for the full view — obverse/reverse images from Numista, interactive price history chart, full coin specs, grade info, and catalog links.

### Card View — Medium Grid

> [INSERT: 03-card-view-medium.png]

Medium gives you a nice dense grid with images and key data.

### Card View — Large Cards, Sepia Theme

> [INSERT: 04-card-view-large-sepia.png]

Large cards with per-item sparkline price charts. This is the sepia theme — there's also light and dark, plus automatic system detection.

### Settings Highlights

The settings are deep. A few highlights:

> [INSERT: 05-settings-appearance.png]

**Themes** — Light, Dark, Sepia, or follow your OS.

> [INSERT: 13-settings-api-numista.png]

**Numista integration** — Paste your free API key and configure which fields to pull. Bulk metadata sync refreshes everything at once.

> [INSERT: 15-settings-files.png]

**Import/Export** — CSV, JSON, PDF export. Numista CSV import. Encrypted backup and restore of your entire app state.

> [INSERT: 17-settings-goldback.png]

**Goldback support** — Built-in denomination pricing with live spot-based values.

There are also settings for layout customization, filter chip colors and grouping, table display, fuzzy search tuning, image management, currency conversion, and a full activity log. Screenshots of everything are in the [about folder on GitHub](https://github.com/lbruton/StakTrakr/tree/main/about/screens).

---

## Quick Start

1. Go to [staktrakr.com](https://www.staktrakr.com) or download from [GitHub releases](https://github.com/lbruton/StakTrakr/releases/latest)
1. Add your first item
1. Grab a free [Numista API key](https://en.numista.com/) for the best experience
1. Your data stays in your browser — no account needed

The source is fully open on [GitHub](https://github.com/lbruton/StakTrakr). Feedback, bug reports, and feature requests are all welcome.

Stack on!

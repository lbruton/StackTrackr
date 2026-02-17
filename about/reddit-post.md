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

### Dashboard — Dark Theme

![StakTrakr main dashboard in dark theme](https://www.staktrakr.com/about/screens/01-main-dark-cards-small.png)

Live spot prices with sparklines across the top. Portfolio breakdown per metal (items, weight, avg cost, purchase price, melt value, retail, gain/loss). Fuzzy search, color-coded filter chips, and paginated inventory cards below.

### Item Detail

![Item detail modal](https://www.staktrakr.com/about/screens/02-detail-modal.png)

Click any item for the full view — obverse/reverse images from Numista, interactive price history chart, full coin specs, grade info, and catalog links.

### Card Views

![Medium card grid](https://www.staktrakr.com/about/screens/03-card-view-medium.png)

Three card sizes to choose from. Medium gives you a nice grid with images and key data.

![Large cards in sepia theme](https://www.staktrakr.com/about/screens/04-card-view-large-sepia.png)

Large cards with per-item sparkline price charts. This is the sepia theme — there's also light and dark, plus automatic system detection.

### Settings Highlights

The settings are deep. A few highlights:

![Appearance settings](https://www.staktrakr.com/about/screens/05-settings-appearance.png)

**Themes** — Light, Dark, Sepia, or follow your OS.

![API settings for Numista](https://www.staktrakr.com/about/screens/13-settings-api-numista.png)

**Numista integration** — Paste your free API key and configure which fields to pull. Bulk metadata sync refreshes everything at once.

![File management](https://www.staktrakr.com/about/screens/15-settings-files.png)

**Import/Export** — CSV, JSON, PDF export. Numista CSV import. Encrypted backup and restore of your entire app state.

![Goldback pricing](https://www.staktrakr.com/about/screens/17-settings-goldback.png)

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

# StakTrakr — Your Stack. Your Way.

A free, open-source precious metals inventory tracker for Silver, Gold, Platinum, and Palladium. No account required, no cloud dependency — your data stays on your device in localStorage. Works offline, runs from a single HTML file, and looks great doing it.

**Try it now:** [staktrakr.com](https://www.staktrakr.com)
**Download the latest release:** [GitHub Releases](https://github.com/lbruton/StakTrakr/releases/latest)

---

## Getting the Most Out of StakTrakr

StakTrakr works great out of the box with its free keyless spot price API, but to unlock the full experience you'll want a **Numista API key**. It's completely free.

### Numista API Key (Free — Highly Recommended)

[Numista](https://en.numista.com/) is the world's largest coin and precious metals catalog. With a Numista API key, StakTrakr can:

- Auto-populate coin details (denomination, weight, purity, country, year, composition)
- Pull catalog images (obverse and reverse)
- Link directly to Numista catalog pages for reference

**How to get your key:**

1. Register at [numista.com](https://en.numista.com/) (free account)
1. After registration, scroll to the **bottom of your profile page**
1. You'll find your API key in the developer section
1. Paste it into StakTrakr under **Settings > API > Numista Catalog API**

That's it. One key, massive quality-of-life improvement.

### PCGS Grading Validation

StakTrakr supports **PCGS number lookup** for grading validation. When you enter a PCGS number on an item, the app cross-references it for accurate grade and variety identification. Great for tracking certified coins alongside your bullion.

### Spot Price Providers

StakTrakr ships with a **free keyless API** from [staktrakr.com](https://www.staktrakr.com) — no setup required, spot prices just work. If you want additional providers or higher rate limits, you can configure:

- **MetalPriceAPI** — premium provider with hourly historical data
- **Metals.dev** — alternative premium provider
- **MetalsAPI** — another premium option with batch support

All provider configuration lives in **Settings > API**. You can set provider priority, toggle metals to track, and pull historical hourly data.

---

## The Dashboard

### Main View — Dark Theme, Small Cards

![StakTrakr main dashboard in dark theme with small card view](screens/01-main-dark-cards-small.png)

The main dashboard gives you everything at a glance:

- **Spot Price Cards** across the top — live prices for Silver, Gold, Platinum, and Palladium with sparkline charts showing recent trend, 24h change percentage, and last refresh timestamp
- **Portfolio Summary Panels** — per-metal breakdowns showing item count, total weight, average cost, purchase price, melt value, retail value, and total gain/loss. The "All Metals" panel aggregates everything
- **Search Bar** with fuzzy matching — search by metal, name, type, purchase location, storage location, notes, date, or any field
- **Filter Chips** — color-coded category chips that let you filter your inventory instantly by type, series, or custom groupings. Each chip shows item count
- **Inventory Cards** — each card shows the item image, name, key specs, and gain/loss at a glance
- **Pagination** with configurable items-per-page at the bottom
- **Status Bar** — localStorage usage, IndexedDB size, and current version

### Item Detail Modal

![Item detail modal showing coin specifications, price chart, and Numista data](screens/02-detail-modal.png)

Click any item to open the full detail view:

- **Dual images** — obverse and reverse, pulled from Numista or your own uploads
- **Price history chart** — interactive Chart.js visualization of the item's spot price over time
- **Current valuation** — purchase price, melt value, retail value, and gain/loss
- **Coin specifications** — denomination, weight, purity, country, year, series, mint, and composition
- **Numista integration** — direct catalog reference number and link
- **PCGS data** — grade and certification number when available

### Card View — Medium Grid

![Card view with medium-sized cards in a 3x3 grid layout](screens/03-card-view-medium.png)

Switch to a denser grid layout with medium cards. Still shows images and key price data but fits more items on screen. The filter chips across the top let you drill into specific categories — each chip is color-coded by category (bullion coins, rounds, bars, etc.) and shows how many items match.

### Card View — Large Cards, Sepia Theme

![Large card view in sepia theme showing detailed cards with sparkline charts](screens/04-card-view-large-sepia.png)

The large card view gives each item room to breathe — full sparkline price charts per item, detailed gain/loss figures, and larger images. This screenshot also shows off the **sepia theme**, one of three built-in themes (Light, Dark, Sepia) plus automatic system detection.

---

## Settings Deep Dive

StakTrakr is highly configurable. Here's a walkthrough of every settings panel.

### Appearance

![Settings panel showing theme selection with Light, Dark, and Sepia options](screens/05-settings-appearance.png)

- **Three themes**: Light, Dark, and Sepia — plus a System option that follows your OS preference
- **Header theme button**: Toggle a quick-switch button right in the app header so you can cycle themes without opening settings
- Custom themes are on the roadmap

### Layout

![Settings panel showing layout configuration with section toggles and card view options](screens/06-settings-layout.png)

- **Section visibility**: Toggle major page sections on/off — spot price cards, portfolio summary, inventory table, charts, and more
- **Item detail modal**: Reorder which fields appear in the detail view and in what order
- **Card view style**: Choose between Sparkline Header and other layouts
- **Desktop card size**: Cards scale to table width or use a fixed smaller size — cards are always used on mobile
- **Header card/table toggle**: Quick-switch button in the header to flip between card and table views

### Images

![Settings panel showing image configuration with table thumbnails, Numista priority, and pattern rules](screens/07-settings-images.png)

- **Table thumbnails**: Show/hide coin images in the table view with cached images from uploads, pattern rules, and Numista lookups
- **Table image order**: Obverse first or reverse first
- **Numista priority override**: Let user uploads and pattern rules take precedence over Numista images
- **Auto pattern image rules**: Automatically assign images to items matching a name pattern (e.g., all "American Silver Eagle" items get the same image)
- **Custom pattern rules**: Define your own regex patterns for image matching
- **Per-item user images**: Upload custom images for individual items
- **Image backup/export**: Bulk export and import your image library

### System

![Settings panel showing system configuration with multi-select batch operations and timezone](screens/08-settings-system.png)

- **Multi-select batch operations**: Select multiple inventory items and apply batch edits, duplicate, or remove in bulk
- **Timezone**: Choose how timestamps display throughout StakTrakr — browser auto-detect is the default, stored data is always UTC

### Table Display

![Settings panel showing table display configuration with visible rows and inline name chips](screens/09-settings-table.png)

- **Visible rows**: Configure how many items show per page (3, 5, 10, 25, 50, 100)
- **Inline name chips**: Choose which metadata badges appear next to item names in the table — Notes indicator, PCGS number, Serial number, Purity, Grade, Numista NR, Storage Location, Year
- **Chip ordering**: Drag to reorder which badges appear first

### Filter Chips

![Settings panel showing filter chip configuration with categories, colors, and grouping](screens/10-settings-chips.png)

- **Minimum item count**: Set the threshold for when a filter chip appears (e.g., only show chips for categories with 2+ items)
- **Short name grouping**: Group items by base name (e.g., "American Silver Eagle 1oz" groups all years together)
- **Dynamic series chips**: Auto-detect item parentheses and quotes to generate additional filter chips
- **Filter chip categories**: Customize which categories get chips and assign each a distinct color
- **Chip quantity badge**: Show item counts on each chip

### Filter Chips — Blocklist and Custom Groups

![Settings panel showing chip blocklist, sort order, and custom grouping rules](screens/11-settings-chips-blocklist.png)

- **Chip sort order**: Sort chips by name or quantity within each category
- **Chip blocklist**: Suppress specific auto-generated chips you don't want cluttering the filter bar. Right-click any chip to add it here
- **Custom grouping rules**: Define comma or semicolon-separated name patterns that should be grouped under a single chip

### Search

![Settings panel showing search configuration with fuzzy autocomplete, Numista matching, and lookup patterns](screens/12-settings-search.png)

- **Fuzzy autocomplete**: Get smart suggestions as you type in the Name, Purchase Location, and Storage Location fields
- **Numista name matching**: Convert coin names (e.g., "ASE") into Numista-optimized search queries with direct catalog file lookups
- **Built-in lookup patterns**: Pre-configured rules that ship with StakTrakr for common coin abbreviations and naming conventions. These cannot be edited
- **Custom patterns**: Add your own search-and-replace patterns to rewrite Numista search queries. Custom rules override built-in patterns

### API Configuration — Numista

![Settings panel showing Numista API configuration with key input, view fields, and metadata sync](screens/13-settings-api-numista.png)

- **Numista API key input**: Paste your free key here
- **Test / Save / Reset**: Validate your key works before saving
- **View detail fields**: Choose which Numista fields to display in the item detail modal (denomination, weight, purity, country, year, composition, commemorated topic, and more)
- **Metadata sync**: Bulk-refresh Numista data for all inventory items with a single click. Images are cached to IndexedDB to avoid redundant API calls — saves your rate limit

### API Configuration — Spot Prices

![Settings panel showing spot price API configuration with StakTrakr free API, provider priority, and history pull](screens/14-settings-api-spot.png)

- **StakTrakr Spot API**: The free keyless provider — no API key required, just works
- **Provider priority**: Drag to reorder which provider StakTrakr tries first
- **Metals to track**: Toggle which metals pull spot data
- **History pull**: Fetch historical hourly spot data to populate your price charts. StakTrakr keeps up to 180 days of history

### Files — Import, Export, and Backup

![Settings panel showing file management with CSV/JSON/PDF import and export, Numista import, and encrypted backup](screens/15-settings-files.png)

- **Import**: Load data from CSV or JSON files. Merge mode intelligently combines with existing inventory
- **Export**: Download your full inventory as CSV, JSON, or a formatted PDF report
- **Third-party import**: Import data directly from Numista CSV exports with a dedicated merge tool (beta)
- **Encrypted backup**: Create an encrypted ZIP backup of your entire application state — inventory, images, settings, spot history. Restore from backup to pick up exactly where you left off
- **Data management**: Remove inventory data or wipe all application data when needed

### Currency and Pricing

![Settings panel showing currency configuration with display currency, header button, and 24h comparison method](screens/16-settings-currency.png)

- **Display currency**: All prices, spot values, and exports use this currency. Spot prices are fetched in USD and converted using daily exchange rates
- **Header currency button**: Quick-switch currency right from the app header
- **24h price comparison**: Choose how the 24h percentage change on spot cards is calculated (Close/Close is the default)

### Goldback Denomination Pricing

![Settings panel showing Goldback denomination pricing with custom denomination table](screens/17-settings-goldback.png)

- **Goldback support**: Built-in pricing for Goldback denominations — fractional gold notes used as local currency
- **Custom denomination table**: Configure spot-based pricing for each Goldback denomination (1, 5, 10, 25, 50) with live price display
- **Goldback API integration**: Pull current Goldback pricing from the official source

### Activity Log

![Settings panel showing activity log with filterable event history](screens/18-settings-log.png)

- **Full event history**: Every action in StakTrakr is logged — adds, edits, deletes, imports, exports, API calls, and setting changes
- **Filterable**: Search and filter the log by event type, date, or description
- **Audit trail**: Useful for tracking what changed and when, especially after bulk operations

---

## Quick Start

1. **Go to** [staktrakr.com](https://www.staktrakr.com) or download the [latest release](https://github.com/lbruton/StakTrakr/releases/latest) and open `index.html`
1. **Add your first item** — click "Add Item", enter a name, and fill in what you know. The more detail you provide, the better the tracking
1. **Get a Numista API key** — [register free](https://en.numista.com/), grab your key from the bottom of your profile page, paste it in Settings > API
1. **Watch the magic** — StakTrakr pulls spot prices automatically, calculates your portfolio value, and keeps a running history

Your data never leaves your browser. No account, no cloud, no tracking. Just you and your stack.

---

## Links

- **Live app**: [staktrakr.com](https://www.staktrakr.com)
- **Source code**: [github.com/lbruton/StakTrakr](https://github.com/lbruton/StakTrakr)
- **Latest release**: [GitHub Releases](https://github.com/lbruton/StakTrakr/releases/latest)
- **Community**: [r/staktrakr](https://www.reddit.com/r/staktrakr/)

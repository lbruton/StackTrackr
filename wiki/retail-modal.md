---
title: "Retail View Modal & Market List View"
category: frontend
owner: staktrakr
lastUpdated: v3.33.19
date: 2026-03-01
sourceFiles:
  - js/retail-view-modal.js
  - js/retail.js
  - css/styles.css
relatedPages:
  - api-consumption.md
  - frontend-overview.md
  - data-model.md
---
# Retail View Modal & Market List View

> **Last updated:** v3.33.19 — 2026-03-01
> **Source files:** `js/retail-view-modal.js`, `js/retail.js`, `css/styles.css`

## Overview

The retail subsystem has two presentation modes for market pricing:

1. **Market list view** (default since v3.33.06) — a full-width single-row card layout with inline 7-day trend charts, spike detection, vendor price chips, computed stats (MED/LOW/AVG), card click-to-expand, and search/sort. `MARKET_LIST_VIEW` is enabled by default in `FEATURE_FLAGS`. Can be toggled via `?market_list_view=false` or in Settings.
2. **Grid view** (fallback) — the original card-per-coin layout rendered by `renderRetailCards()`. Active when `MARKET_LIST_VIEW` is disabled.

The **Retail View Modal** is a per-coin detail panel that opens when a user clicks a coin card in the Grid view. It contains two tabs:

- **24h Chart** (default on open) — a Chart.js line chart of vendor prices over the past 24 hours, plus a "Recent windows" table beneath it.
- **Price History** — a Chart.js line chart with per-vendor lines (or a fallback "Avg Median" series when no per-vendor data exists) and a 30-day history table showing average vendor prices per day.

As of v3.32.25 the modal also forward-fills vendor prices across gap windows and shows out-of-stock (OOS) vendors as clickable links in the vendor legend.

## Key Rules (read before touching this area)

- **Never call `document.getElementById()` directly.** Use `safeGetElement(id)` for all DOM lookups.
- **Do not access `localStorage` directly.** Retail data is read/written through `saveData()`/`loadData()` from `js/utils.js`. Specific retail helpers (`saveRetailPrices`, `saveRetailIntradayData`, etc.) are exported by `retail.js`.
- `_buildIntradayChart` always calls `_buildIntradayTable` at the end. Do not call both independently.
- `_buildVendorLegend` is called both on modal open and after the async background refresh completes. It must be idempotent — it clears the container on every call.
- The Chart.js intraday chart instance is stored in the module-level `_retailViewIntradayChart` variable. Always destroy the old instance before creating a new one or you will leak canvas contexts.
- `_forwardFillVendors` must always return `[]` on empty input. Never mutate the input `bucketed` array; return a new array with decorated window objects.
- **Market list view Chart.js instances** are tracked in `_marketChartInstances` (a `Map<slug, Chart>`). They are lazily created when a card's `<details>` opens and destroyed when it closes or when the list re-renders. Failing to destroy before clearing the grid DOM causes "Canvas is already in use" errors.

## Architecture

### Data flow (Retail View Modal)

```
retailIntradayData[slug].windows_24h   (raw 15-min windows from API)
         |
         v
  _bucketWindows(windows)              -> bucketed[]  (30-min slots, up to 48)
         |
         v
  _forwardFillVendors(bucketed)        -> filled[]    (gaps filled, _carriedVendors set on each window)
         |
         v
  _flagAnomalies(filled)               -> flagged[]   (anomalous prices nulled, originals in _anomalyOriginals)
         |
         +-->  _buildIntradayChart()   -> Chart.js line chart; tooltip prefixes carried values with "~"
         +-->  _buildIntradayTable()   -> Recent windows table; carried cells shown as "~$XX.XX" muted italic
```

The vendor legend is built separately from `retailPrices` (current snapshot), not from intraday windows.

### Data flow (Market List View — v3.33.06)

```
renderRetailCards()
  |-- isFeatureEnabled("MARKET_LIST_VIEW") ? --> _renderMarketListView()
  |-- else --> original grid renderer
  
_renderMarketListView()
  |-- _getFilteredSortedSlugs(query, sortKey)   -> filtered + sorted slug list
  |-- for each slug: _buildMarketListCard(slug, meta, priceData, historyData)
  |      |-- image column (glass orb placeholder, metal-tinted)
  |      |-- info column (name, weight, metal badge, GB daily price)
  |      |-- stats column (MED / LOW / AVG computed from live vendors or history fallback)
  |      |-- trend badge (7-day direction + percentage from _computeRetailTrend)
  |      |-- vendor row (sorted chips: medal ranks, vendor link, price, confidence %)
  |      +-- <details> chart (lazy-loaded on expand)
  |             |-- _filterHistorySpikes(entries, vendorIds) -> spike-filtered price matrix
  |             |-- _interpolateGaps(data, preEstimated) -> smooth lines with dashed interpolated segments
  |             +-- Chart.js line chart stored in _marketChartInstances Map
  |
  +-- market footer (disclaimer + sponsor badge)
```

### Spike Detection (`_filterHistorySpikes`) — v3.33.06

Two-pass anomaly filter applied to daily history vendor prices before charting:

**Pass 1 — Temporal spike:** For each vendor, if neighbors at t-1 and t+1 are stable (within `RETAIL_SPIKE_NEIGHBOR_TOLERANCE`, default 5%) but price at t deviates beyond the tolerance, it is nulled.

**Pass 2 — Cross-vendor median:** For each day with 3+ in-stock vendors, any vendor price deviating >40% (`RETAIL_ANOMALY_THRESHOLD`) from the median is nulled. If all vendors would be flagged, none are (prevents false consensus collapse).

OOS carry-forward prices are tracked in a parallel `estimated[]` array and are exempt from spike detection (they are synthetic, not scraped).

### Gap Interpolation (`_interpolateGaps`) — v3.33.06

After spike filtering, null gaps in vendor price arrays are linearly interpolated between the nearest non-null neighbors. Leading/trailing nulls are not extrapolated. Interpolated points are rendered as:

- Dashed line segments (via Chart.js `segment.borderDash` callback)
- Dimmed point color (50% alpha)
- Tooltip prefix `~$XX.XX (est.)`

A vendor is excluded from the chart entirely if it has fewer than 2 real (non-estimated) data points.

### Module-level state

| Variable | Type | Purpose |
|---|---|---|
| `_retailViewModalChart` | `Chart \| null` | Daily history Chart.js instance |
| `_retailViewIntradayChart` | `Chart \| null` | 24h intraday Chart.js instance |
| `_intradayRowCount` | `number` | Number of rows shown in Recent windows table (default 24) |
| `_marketChartInstances` | `Map<string, Chart>` | Market list view per-card Chart.js instances (v3.33.06) |
| `_marketSearchTimer` | `number \| null` | Debounce timer for search input (v3.33.06) |

### Globals consumed from `retail.js`

| Global | Declared in | Purpose |
|---|---|---|
| `retailPrices` | `retail.js` | Current price snapshot (`{ prices: { [slug]: { vendors, median_price, lowest_price } } }`) |
| `retailAvailability` | `retail.js` | Per-slug per-vendor availability flags (`{ [slug]: { [vendorId]: false } }` when OOS) |
| `retailLastKnownPrices` | `retail.js` | Last-seen price per vendor per slug, used for OOS legend display |
| `retailLastAvailableDates` | `retail.js` | ISO date string of last availability per vendor per slug |
| `retailProviders` | `retail.js` | Per-slug per-vendor deep-link URLs (overrides `RETAIL_VENDOR_URLS` when present) |
| `retailPriceHistory` | `retail.js` | Per-slug daily history array (used by market list charts) |
| `RETAIL_VENDOR_NAMES` | `retail.js` | `{ [vendorId]: displayName }` — canonical vendor list and display order |
| `RETAIL_VENDOR_COLORS` | `retail.js` | `{ [vendorId]: hexColor }` — brand colors for chart lines and legend swatches |
| `RETAIL_VENDOR_URLS` | `retail.js` | `{ [vendorId]: url }` — fallback homepage URLs when `retailProviders` has no slug-level override |
| `RETAIL_COIN_META` | `retail.js` | `{ [slug]: { name, weight, metal } }` — metadata for each tracked product |
| `RETAIL_SLUGS` | `retail.js` | Ordered array of all tracked product slugs |

### Vendor roster (as of v3.33.06)

Vendor colors were brightened in v3.33.06 for better contrast on dark backgrounds.

| ID | Display name | Color |
|---|---|---|
| `apmex` | APMEX | `#60a5fa` bright blue |
| `monumentmetals` | Monument | `#c4b5fd` bright violet |
| `sdbullion` | SDB | `#34d399` bright emerald |
| `jmbullion` | JM | `#fbbf24` bright amber |
| `herobullion` | Hero | `#f87171` red |
| `bullionexchanges` | BullionX | `#f472b6` bright pink |
| `summitmetals` | Summit | `#22d3ee` bright cyan |
| `goldback` | Goldback | `#d4a017` deep gold |

### Vendor chip layout (Market List View)

Each vendor in a market list card is rendered as a `.vendor-chip` element containing:

| Element | Class | Description |
|---|---|---|
| Medal rank | `.vendor-medal .vendor-medal--{1,2,3}` | "1st", "2nd", "3rd" for top-3 in-stock high-confidence vendors sorted by price |
| Vendor link | `.vendor-name` | Colored label, clickable to open vendor page in popup |
| Price | `.vendor-price` | Formatted price, or "OOS" for out-of-stock |
| Confidence | `.vendor-confidence` | Scraper confidence percentage (only shown for in-stock) |

Vendors are sorted: in-stock high-confidence (>=60) by price ascending, then in-stock low-confidence, then OOS. Low-confidence chips get `.low-conf` class (dimmed price). OOS chips get `.oos` class (strikethrough name and price).

### Search and sort

`_getFilteredSortedSlugs(query, sortKey)` filters `RETAIL_SLUGS` by:
- Item name (case-insensitive substring)
- Metal type
- Vendor name (checks active vendors for the slug)

Sort keys: `name` (alphabetical), `metal` (then name), `price-low` (lowest_price ascending), `price-high` (lowest_price descending), `trend` (7-day trend percentage descending).

Search is debounced at 150ms via `_onMarketSearch`. Sort triggers an immediate re-render via `_onMarketSort`.

---

## Function Reference (Retail View Modal)

### `_bucketWindows(windows)`

Groups raw 15-min API windows into 30-min aligned slots (HH:00 and HH:30 boundaries).

**Input:** `windows` — the `windows_24h` array from `retailIntradayData[slug]`.

**Output:** A new sorted array of up to 48 window objects, oldest first. Each object has its `window` field overwritten to the ISO slot key (e.g. `2026-02-23T14:30:00.000Z`) and an extra `_originalWindow` field preserving the raw timestamp.

**Algorithm:**
1. For each raw window, round its UTC timestamp down to the nearest 30-min boundary.
2. For each slot, keep only the most recent raw window (compared by `_originalWindow`).
3. Return the de-duplicated entries sorted chronologically.

**Edge cases:**
- Returns `[]` on null, undefined, or empty input.
- Windows with a missing or unparseable `window` field are silently skipped.

---

### `_forwardFillVendors(bucketed)` *(added v3.32.25)*

Fills vendor price gaps across consecutive windows so the chart never shows a false "vendor dropped out" dip when a vendor simply had no poll for a slot.

**Input:** `bucketed` — the output of `_bucketWindows`.

**Output:** A new array (never mutates input). Each window object is a shallow copy; windows with carried prices have a `_carriedVendors: Set<vendorId>` property listing which vendor values were forward-filled from an earlier window.

**Algorithm:**
1. Iterate windows in chronological order, maintaining a `lastSeen` map of `vendorId -> price`.
2. For each window, for each vendor in `RETAIL_VENDOR_NAMES`:
   - If the window has a real price for that vendor, update `lastSeen[vendorId]`.
   - If the window is missing a price but `lastSeen[vendorId]` exists, copy it in and add the vendor to the window's `_carriedVendors` set.
3. Return the decorated array.

**Edge cases:**
- Returns `[]` on empty input — no iteration attempted.
- Only vendors present in `RETAIL_VENDOR_NAMES` are considered.
- A vendor that has never appeared in any window is never forward-filled (no `lastSeen` entry).

---

### `_buildIntradayChart(slug)`

Renders the Chart.js 24h line chart and delegates to `_buildIntradayTable`.

**Steps:**
1. Reads `retailIntradayData[slug].windows_24h`.
2. Calls `_bucketWindows` then `_forwardFillVendors` to produce the filled window array.
3. Calls `_flagAnomalies(filled)` to detect and null anomalous vendor prices (originals preserved in `_anomalyOriginals` for table display).
4. Shows "no data" placeholder if fewer than 2 windows are available.
5. Destroys any existing `_retailViewIntradayChart` instance before creating a new one.
6. Builds one dataset per active vendor (vendors with at least one non-null price in the flagged windows), using `RETAIL_VENDOR_NAMES` to determine order and `RETAIL_VENDOR_COLORS` for line colors.
7. Falls back to Median + Low datasets when no per-vendor data exists (pre-vendor-format windows).
8. Attaches a `_carriedIndices: Set<number>` to each dataset — the bucket indices whose value was forward-filled.
9. Tooltip `label` callback: if `ctx.raw` is null (guard required — `ctx.raw` can be null on `spanGaps: true` datasets), returns nothing; if the index is in `_carriedIndices`, prefixes with `~` (e.g. `~$32.15`); otherwise formats normally.
10. Calls `_buildIntradayTable(slug, bucketed)` at the end, passing the flagged array.

**Chart options:**
- `spanGaps: true` — lines bridge over null entries.
- Legend hidden when vendor-mode is active (each vendor is already color-coded).
- X-axis ticks: HH:00 labels rendered at full opacity/size; HH:30 labels at reduced opacity and smaller font.

---

### `_buildIntradayTable(slug, bucketed)`

Renders the "Recent windows" table beneath the 24h chart.

**Signature:** `_buildIntradayTable(slug, bucketed?)` — `bucketed` is optional. If omitted the function re-buckets from `retailIntradayData[slug]` (used by the row-count dropdown's `onchange` handler).

**Column logic:**
- When per-vendor data is present: one column per active vendor using `RETAIL_VENDOR_NAMES` display names.
- Fallback: "Median" and "Low" columns.

**Cell rendering — three branches:**

| Condition | Output |
|---|---|
| Value is `null` (vendor had no data in this slot and nothing to carry) | `--` (em dash, no styling) |
| Value was forward-filled (`_carriedVendors` contains this vendor) | `~$XX.XX` muted italic, no trend glyph |
| Value is fresh | `$XX.XX upward/downward arrow` with `text-success` / `text-danger` class |

Trend glyphs compare each row to the row immediately below it (the next older window, since the table is displayed newest-first). Carried values never show a trend glyph because the price movement is artificially flat.

**Row count:** Slices to the `_intradayRowCount` most recent windows (default 24, controlled by a dropdown in the modal).

---

### `_buildVendorLegend(slug)`

Renders the colored vendor legend above the price-history chart showing current prices.

**Behavior:**
- Clears the `#retailViewVendorLegend` container on every call.
- `hasAny` check: at least one vendor in `RETAIL_VENDOR_NAMES` must have either a non-null `price` in `retailPrices.prices[slug].vendors` **or** an OOS flag in `retailAvailability[slug][v] === false`. If no vendors pass either condition, the function returns early (no legend rendered).
- Iterates all `RETAIL_VENDOR_NAMES` keys in declaration order.

**Per-vendor item:**
- Skips vendors with `price == null` in the current snapshot **unless** they appear in `retailAvailability[slug][v] === false` (OOS) — OOS vendors are always shown.
- OOS item treatment: `opacity: 0.5`, price wrapped in `<del>`, "OOS" badge appended, item is still a clickable `<a>` element.
- In-stock with price: rendered as an `<a>` if a URL is available (checking `retailProviders[slug][vendorId]` first, then `RETAIL_VENDOR_URLS[vendorId]`); otherwise a plain `<span>`.
- Click handler opens vendor URL in a named popup window (`retail_vendor_{vendorId}`) with fixed dimensions; falls back to `_blank` if the popup is blocked.

**Structure per item:**
```
<a class="retail-legend-item">
  <span class="retail-legend-swatch" style="background: {color}"></span>
  <span class="retail-legend-name"   style="color: {color}">{displayName}</span>
  <span class="retail-legend-price">${price}</span>
</a>
```

---

### `openRetailViewModal(slug)`

Entry point — called from retail card click handlers.

**Sequence:**
1. Reads `RETAIL_COIN_META[slug]` for coin name, weight, and metal type.
2. Populates modal title and subtitle.
3. Removes any stale staleness banner from a previous open.
4. Calls `_buildVendorLegend(slug)`.
5. Populates the 30-day history table from `getRetailHistoryForSlug(slug)`.
6. Builds the daily history Chart.js chart (per-vendor lines; gaps for OOS entries via `spanGaps: false`).
7. Calls `_buildIntradayChart(slug)` (which internally calls `_buildIntradayTable`).
8. Wires the row-count `<select>` dropdown.
9. Defaults to the "intraday" (24h) tab.
10. Opens the modal via `openModalById("retailViewModal")`.
11. Fires an async `Promise.all` to fetch fresh `latest.json` and `history-30d.json` from the API; on success, updates `retailIntradayData`, `retailPrices`, and `retailPriceHistory`, then rebuilds the chart and legend. On total failure, inserts a staleness warning banner.

### `closeRetailViewModal()`

Destroys both Chart.js instances and calls `closeModalById("retailViewModal")`.

### `_switchRetailViewTab(tab)`

Toggles between `"history"` and `"intraday"` tabs by toggling `display` and the Bootstrap `active` class on the tab buttons.

---

## Function Reference (Market List View — v3.33.06)

### `_renderMarketListView()`

Main renderer for the market list view. Called when `MARKET_LIST_VIEW` flag is enabled.

**Sequence:**
1. Shows `#marketListHeader`, hides `#marketGridHeader`.
2. Updates sync timestamp in `#retailLastSyncList` with relative time ("5 min ago").
3. Adds `.market-list-mode` to the grid container (switches CSS from grid to flex column).
4. Destroys all active `_marketChartInstances` and clears the grid DOM.
5. If sync in progress, renders skeleton cards. If no data, shows empty state.
6. Calls `_getFilteredSortedSlugs()` with current search/sort values.
7. For each slug, builds and appends a card via `_buildMarketListCard()`.
8. Appends a market footer with disclaimer text and sponsor badge.

### `_buildMarketListCard(slug, meta, priceData, historyData)`

Builds a single full-width row card. Returns an `HTMLElement`.

**Card structure (CSS grid: `100px 1fr auto auto`):**

| Column | Content |
|---|---|
| Image | `.market-card-image-col` with glass orb placeholder, metal-tinted radial gradient |
| Info | `.market-card-info` — name, weight + metal badge, optional GB Daily price |
| Stats | `.market-card-stats-col` — MED/LOW/AVG computed from vendor prices or history fallback |
| Trend | `.market-card-trend` — directional arrow + percentage, color-coded up/down/flat |

Below the main row: vendor chips (`.market-card-vendors`, spans columns 2-4) and a collapsible `<details>` chart (spans full width).

**Card click behavior:** Clicking anywhere on the card body (except vendor chips, links, and the `<summary>` toggle) opens/closes the `<details>` chart element.

### `_filterHistorySpikes(entries, vendorIds)`

Two-pass anomaly filter for daily history vendor prices (see Architecture section above).

**Returns:** `{ prices: Object<vendorId, Array<number|null>>, estimated: Object<vendorId, boolean[]> }`

### `_interpolateGaps(data, preEstimated)`

Linear interpolation for null gaps in a price array.

**Returns:** `{ filled: Array<number|null>, interp: boolean[] }`

### `_initMarketCardChart(slug, detailsEl)`

Creates a Chart.js line chart inside a market card's `<details>` block.

**Steps:**
1. Guards: `Chart` defined, not already instantiated, canvas exists, 2+ history entries.
2. Takes last 7 entries from `retailPriceHistory[slug]`.
3. Identifies active vendors.
4. Applies `_filterHistorySpikes` then `_interpolateGaps` per vendor.
5. Excludes vendors with fewer than 2 real data points.
6. Falls back to "Avg Median" line if no per-vendor data.
7. Stores instance in `_marketChartInstances`.

### `_getFilteredSortedSlugs(query, sortKey)`

See Search and Sort section above.

### `_initMarketListViewListeners()`

Called once during `initRetailPrices()`. Wires:
- Search input `input` event -> `_onMarketSearch` (150ms debounce)
- Sort select `change` event -> `_onMarketSort`
- Sync button `click` -> `syncRetailPrices()`
- Expand All button `click` -> toggles all `<details>` open/closed

---

## Window Exports

Only a subset of functions are exported to `window` for use by inline HTML handlers:

```js
// Retail View Modal
window.openRetailViewModal   // called from retail card buttons
window.closeRetailViewModal  // called from modal close button
window._switchRetailViewTab  // called from tab button onclick
window._bucketWindows        // exported for console/smoke-test inspection
window._forwardFillVendors   // exported for console/smoke-test inspection
window._flagAnomalies        // exported for console/smoke-test inspection
window._buildIntradayTable   // exported for row-count dropdown onchange

// Market List View (added v3.33.06)
window._renderMarketListView   // re-render the market list
window._buildMarketListCard    // build a single card (debugging/testing)
window._getFilteredSortedSlugs // filter+sort inspection
```

`_buildIntradayChart` and `_buildVendorLegend` are module-private.
`_filterHistorySpikes`, `_interpolateGaps`, `_initMarketCardChart`, `_onMarketSearch`, `_onMarketSort`, and `_initMarketListViewListeners` are module-private.

---

## CSS Architecture (Market List View — v3.33.06)

All market list view styles are in `css/styles.css` under the `/* Market List View (STAK-369) */` section.

**Key classes:**

| Class | Element | Notes |
|---|---|---|
| `.market-list-mode` | `#retailCardsGrid` | Switches grid to flex column layout |
| `.market-list-card` | Card container | CSS grid `100px 1fr auto auto` with metal-colored left border |
| `.market-list-card.metal-{metal}` | Card | Sets `--metal-color` CSS variable |
| `.market-card-image-col` | Image column | Spans 2 rows, has metal-tinted radial gradient overlay |
| `.market-card-no-image` | Glass orb | Radial gradient + inset shadows, `.bar-shape` variant for goldback |
| `.market-card-vendors` | Vendor row | Spans columns 2-4, flex wrap |
| `.vendor-chip` | Vendor element | Contains medal, name link, price, confidence |
| `.vendor-medal--{1,2,3}` | Medal badge | Gold/silver/bronze color scheme |
| `.market-card-trend.{up,down,flat}` | Trend badge | Green/red/muted with background tint |
| `.market-card-chart` | Details element | Full-width collapsible, 200px chart height |
| `.market-footer` | Footer | Disclaimer + sponsor badge |

**Responsive breakpoints:**
- `<=1024px`: Image column shrinks to 80px, trend badge hidden
- `<=767px`: Image column shrinks to 70px, card switches to 2-column grid, vendor row spans full width, search/controls stack vertically

---

## Common Mistakes

### Calling `_buildIntradayChart` and `_buildIntradayTable` separately

`_buildIntradayChart` always calls `_buildIntradayTable` at the end with the same `bucketed` array. If you call both independently you will build the table twice and the second call will re-bucket from scratch, potentially producing stale data.

### Forgetting the null guard on `ctx.raw` in tooltip callbacks

Chart.js passes `ctx.raw = null` for gap points when `spanGaps: true`. Calling `Number(null).toFixed(2)` produces `"0.00"`, not an error — but it silently shows wrong data. Always guard: `if (ctx.raw == null) return;`.

### Mutating the `bucketed` input in `_forwardFillVendors`

`_bucketWindows` returns window objects that are re-used across chart and table builds. Mutating them in `_forwardFillVendors` would corrupt the source data for subsequent calls. Always shallow-copy each window before adding `_carriedVendors`.

### Adding a new vendor without updating all three vendor maps

`RETAIL_VENDOR_NAMES`, `RETAIL_VENDOR_COLORS`, and `RETAIL_VENDOR_URLS` must all be updated together in `retail.js`. A vendor missing from `RETAIL_VENDOR_NAMES` will never appear in the chart, table, or legend — the other two maps are irrelevant without the name entry.

### OOS legend items after a `retailPrices` refresh

`_buildVendorLegend` reads current prices from `retailPrices.prices[slug].vendors`. The `hasAny` guard already checks both live prices (`vendorMap[v].price != null`) **and** OOS availability (`retailAvailability[slug][v] === false`), so all-OOS vendors are not suppressed from the legend. OOS vendors render at `opacity: 0.5` with a strikethrough price and an "OOS" badge.

### Not destroying the old Chart.js instance before creating a new one

Both `_retailViewModalChart` and `_retailViewIntradayChart` must be explicitly destroyed before reassignment. Skipping this leaks canvas rendering contexts and causes "Canvas is already in use" console warnings on subsequent modal opens.

### Not clearing `_marketChartInstances` before re-rendering the market list (v3.33.06)

`_renderMarketListView` destroys all chart instances and clears the map before clearing the grid DOM. If you add a code path that clears the grid without destroying the chart instances first, the canvas elements are removed from the DOM but Chart.js retains references — subsequent card opens will fail to initialize because `_marketChartInstances.has(slug)` returns `true` for a destroyed chart.

### Applying spike detection to estimated/OOS data points (v3.33.06)

`_filterHistorySpikes` intentionally skips estimated points (OOS carry-forward) during temporal spike detection. If you modify the filter to include estimated points, OOS carry-forward prices — which are intentionally flat — will create false negatives in the neighbor stability check and allow real spikes to pass through.

---

## Related Pages

- [api-consumption.md](api-consumption.md) — how `retail.js` fetches `latest.json` and `history-30d.json` from `api.staktrakr.com`
- [frontend-overview.md](frontend-overview.md) — script load order, `window` global conventions, feature flags, and `safeGetElement` usage
- [data-model.md](data-model.md) — feature flag definitions in `FEATURE_FLAGS`

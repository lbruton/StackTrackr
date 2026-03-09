---
title: Retail Modal
category: frontend
owner: staktrakr
lastUpdated: v3.33.57
date: 2026-03-06
sourceFiles:
  - js/retail-view-modal.js
  - js/retail.js
relatedPages:
  - api-consumption.md
  - vendor-quirks.md
---
# Retail Modal

> **Last updated:** v3.33.57 — 2026-03-06
> **Source files:** `js/retail-view-modal.js`, `js/retail.js`

## Overview

The **Retail View Modal** is a per-coin detail panel that opens when a user clicks a coin in the market view. It surfaces live and historical retail pricing data for a single coin slug (e.g. `ase`, `age`, `maple-silver`) sourced from the StakTrakrApi REST endpoints.

The modal contains two tabs:

- **24h Chart** (default on open) — a Chart.js line chart of per-vendor retail prices over the past 24 hours, with a "Recent windows" data table beneath it.
- **Price History** — a Chart.js line chart with per-vendor daily average lines plus a 30-day history table showing per-vendor average prices per day.

On open, the modal displays cached data from localStorage immediately, then fires async fetches to `api.staktrakr.com` to refresh both the intraday and history data. If the refresh fails entirely, a staleness warning banner is injected at the top of the modal body.

---

## Key Rules

- **Never call `document.getElementById()` directly.** Use `safeGetElement(id)` for all DOM lookups in both files.
- **Never read/write localStorage directly.** All retail data flows through `saveData()`/`loadData()` from `js/utils.js`, and specifically the retail helpers exported by `retail.js`: `saveRetailPrices`, `saveRetailIntradayData`, `saveRetailPriceHistory`, `saveRetailProviders`, `saveRetailAvailability`.
- `_buildIntradayChart` always calls `_buildIntradayTable` at the end. Do not call both independently — the table will be built twice, with the second call re-bucketing from scratch and potentially producing stale output.
- `_buildVendorLegend` clears its container on every call. It is called on modal open and again after the async background refresh. It must remain idempotent.
- The two Chart.js instances (`_retailViewModalChart`, `_retailViewIntradayChart`) are module-level variables. They **must** be explicitly destroyed before reassignment. Skipping this leaks canvas rendering contexts and causes "Canvas is already in use" errors on subsequent modal opens.
- `_forwardFillVendors` must never mutate its input array. Always shallow-copy each window object before adding `_carriedVendors`.
- Retail prices are always displayed in USD regardless of the user's currency setting. `_fmtRetailPrice` is hardcoded to `en-US` locale.

---

## Architecture

### Separation of Concerns: `retail.js` vs `retail-view-modal.js`

**`retail.js`** owns:

- All static coin and vendor configuration: `RETAIL_SLUGS`, `RETAIL_COIN_META`, `RETAIL_VENDOR_NAMES`, `RETAIL_VENDOR_COLORS`, `RETAIL_VENDOR_URLS`, `GOLDBACK_WEIGHTS`.
- All module-level state: `retailPrices`, `retailPriceHistory`, `retailIntradayData`, `retailProviders`, `retailAvailability`, `retailLastKnownPrices`, `retailLastAvailableDates`.
- All persistence helpers: `loadRetailPrices`, `saveRetailPrices`, `loadRetailPriceHistory`, `saveRetailPriceHistory`, `loadRetailIntradayData`, `saveRetailIntradayData`, `loadRetailProviders`, `saveRetailProviders`, `loadRetailAvailability`, `saveRetailAvailability`.
- The full sync pipeline: `syncRetailPrices` (fetches manifest, per-slug `latest.json` + `history-30d.json`, providers.json, and writes all results to localStorage).
- Manifest-driven slug/metadata resolution: `getActiveRetailSlugs`, `getRetailCoinMeta`, `getVendorDisplay`.
- The sync log, sync-in-progress flags, and error state. The sync log Time column uses timezone-aware formatting via `TIMEZONE_KEY` from localStorage, matching the `_fmtIntradayTime` pattern in `retail-view-modal.js`. Falls back gracefully if the stored timezone is invalid.
- Rendering of all card/list views (grid view, market list view, sparklines).
- Metal filter pill state (`_marketMetalFilter`) and filtering logic in `_getFilteredSortedSlugs()` — filters slugs by `getRetailCoinMeta(slug).metal` when a pill other than "All" is active.
- Expand/Collapse button text reset — `_renderMarketListView()` resets `marketExpandAllBtn` to "Expand All" on every re-render (search, filter change), since newly rendered cards are always collapsed.
- Card-level trend indicators via `_computeRetailTrend(slug)`, which sorts history by date descending before comparing the two most recent entries to determine trend direction.

**`retail-view-modal.js`** owns:

- The per-coin detail modal only: opening, closing, tab-switching, chart rendering, table rendering, vendor legend.
- All intraday data processing: `_bucketWindows`, `_forwardFillVendors`, `_flagAnomalies`.
- The async background refresh that fires when `openRetailViewModal` is called (per-coin `latest.json` + `history-30d.json` fetch, independent of the full sync).
- Both Chart.js instances for the modal (`_retailViewModalChart`, `_retailViewIntradayChart`).

`retail-view-modal.js` reads from globals defined in `retail.js` but never imports them — they are shared through the global scope (`window`). Script load order in `index.html` guarantees `retail.js` is evaluated before `retail-view-modal.js`.

### Vendor Roster

Declared in `retail.js`. All three maps must be updated together when adding a new vendor.

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

### Module-Level State (retail.js — market list view)

| Variable | Type | Purpose |
|---|---|---|
| `_marketMetalFilter` | `string` | Active metal filter pill value: `"all"`, `"silver"`, `"gold"`, `"goldback"`, `"platinum"`, or `"palladium"` |
| `_marketSearchTimer` | `number \| null` | Search input debounce timer |

### Module-Level State (retail-view-modal.js)

| Variable | Type | Purpose |
|---|---|---|
| `_retailViewModalChart` | `Chart \| null` | Daily history Chart.js instance |
| `_retailViewIntradayChart` | `Chart \| null` | 24h intraday Chart.js instance |
| `_intradayRowCount` | `number` | Number of rows in the Recent windows table (default 24, controlled by dropdown) |

### Globals Consumed from `retail.js`

| Global | Purpose |
|---|---|
| `retailPrices` | Current price snapshot: `{ prices: { [slug]: { vendors, median_price, lowest_price } } }` |
| `retailIntradayData` | Per-slug 24h window data: `{ [slug]: { window_start, windows_24h: Array } }` |
| `retailPriceHistory` | Per-slug daily history array: `{ [slug]: Array }` |
| `retailProviders` | Per-slug per-vendor deep-link URLs (overrides `RETAIL_VENDOR_URLS` when present) |
| `retailAvailability` | Per-slug per-vendor OOS flags: `{ [slug]: { [vendorId]: false } }` |
| `retailLastKnownPrices` | Last-seen price per vendor per slug — used for OOS legend display |
| `retailLastAvailableDates` | ISO date of last availability per vendor per slug |
| `RETAIL_VENDOR_NAMES` | `{ [vendorId]: displayName }` — canonical vendor list and display order |
| `RETAIL_VENDOR_COLORS` | `{ [vendorId]: hexColor }` — brand colors for chart lines and legend swatches |
| `RETAIL_VENDOR_URLS` | `{ [vendorId]: url }` — fallback homepage URLs |
| `RETAIL_COIN_META` | `{ [slug]: { name, weight, metal } }` — metadata for each tracked product |
| `_lastSuccessfulApiBase` | Last API base URL that returned a valid manifest — used for per-coin background refreshes |

---

## Data Flow

### Intraday (24h Chart) Pipeline

```
retailIntradayData[slug].windows_24h   (raw 15-min windows from API, up to 96 stored)
         |
         v
  _bucketWindows(windows)              -> bucketed[]  (30-min aligned slots, up to 48 entries, oldest first)
         |
         v
  _forwardFillVendors(bucketed)        -> filled[]    (gaps filled; _carriedVendors: Set on each window)
         |
         v
  _flagAnomalies(filled)               -> flagged[]   (anomalous prices nulled; originals in _anomalyOriginals)
         |
         +-->  _buildIntradayChart()   -> Chart.js line chart per vendor
         +-->  _buildIntradayTable()   -> "Recent windows" table, newest-first
```

The vendor legend is built separately from `retailPrices` (current snapshot), not from intraday windows.

### History (Price History Tab) Pipeline

```
getRetailHistoryForSlug(slug)          -> history[]   (daily entries, newest first)
         |
         v
  sorted = [...history].reverse()      -> oldest first for chart
         |
         +-->  Chart.js line chart     (per-vendor `.avg` values; nulls for OOS entries, spanGaps: false)
         +-->  History table           (7 columns: date, avg_median, avg_low, apmex, monument, sdb, jm)
```

### Background Refresh Flow (on modal open)

When `openRetailViewModal(slug)` is called, after rendering from cache it fires:

```
Promise.all([
  fetch(`${_lastSuccessfulApiBase}/${slug}/latest.json`),
  fetch(`${_lastSuccessfulApiBase}/${slug}/history-30d.json`),
])
  |-- latestResp.ok  -> updates retailIntradayData[slug], retailPrices.prices[slug]
  |                     -> calls saveRetailIntradayData(), saveRetailPrices()
  |                     -> _buildIntradayChart(slug) [rebuilds chart with fresh data]
  |-- histResp.ok    -> updates retailPriceHistory[slug]
  |                     -> calls saveRetailPriceHistory()
  |-- both fail      -> inserts .retail-stale-data-warning banner at top of modal body
  +-- always         -> _buildVendorLegend(slug) [rebuilds legend with latest availability]
```

### Full Sync Flow (`syncRetailPrices` in `retail.js`)

Triggered by the Sync button or on page init. Runs independently of modal open:

```
_pickFreshestEndpoint()        -> tries each RETAIL_API_ENDPOINTS in order, picks first that returns manifest.json
         |
         v
  fetch manifest.json          -> populates _manifestSlugs, _manifestCoinMeta, saves manifest timestamp
         |
         v
  fetch providers.json         -> populates retailProviders, _manifestVendorMeta
         |
         v
  Promise.allSettled(slugs.map -> fetch [slug]/latest.json + [slug]/history-30d.json for every slug)
         |
         v
  _processSlugResult()         -> normalizes price, intraday, availability fields from latest.json
         |
         v
  retailPrices, retailPriceHistory, retailIntradayData updated + saved to localStorage
```

`saveRetailIntradayData` caps each slug's `windows_24h` to the last 96 entries (24h of 15-min data) before persisting, to prevent localStorage quota overflow.

---

## Key Functions

### `openRetailViewModal(slug)`

Entry point. Called from card click handlers.

**Sequence:**

1. Reads `RETAIL_COIN_META[slug]` for coin name, weight, and metal type.
2. Populates `#retailViewCoinName` (title) and `#retailViewModalSubtitle` (weight and metal).
3. Removes any stale `.retail-stale-data-warning` banner from a previous open.
4. Calls `_buildVendorLegend(slug)`.
5. Builds the 30-day history table from `getRetailHistoryForSlug(slug)` — 7 columns: date, avg_median, avg_low, apmex, monument, sdb, jm.
6. Destroys `_retailViewModalChart` if it exists, then builds the daily history Chart.js chart (per-vendor lines from `.avg` fields; gaps rendered as breaks via `spanGaps: false` for OOS entries).
7. Calls `_buildIntradayChart(slug)` (which internally calls `_buildIntradayTable`).
8. Wires the row-count `<select>` dropdown (`#retailViewIntradayRowCount`) to rebuild the table on change.
9. Defaults to the `"intraday"` tab via `_switchRetailViewTab("intraday")`.
10. Opens the modal via `openModalById("retailViewModal")`.
11. Fires the async background refresh (see Data Flow section).

### `closeRetailViewModal()`

Destroys `_retailViewModalChart` and `_retailViewIntradayChart` (sets both to `null`), then calls `closeModalById("retailViewModal")`.

### `_switchRetailViewTab(tab)`

Toggles between `"history"` and `"intraday"` tabs. Toggles `display` style on `#retailViewHistorySection` and `#retailViewIntradaySection`, and toggles the Bootstrap `active` class on `#retailViewTabHistory` and `#retailViewTabIntraday`.

### `_buildVendorLegend(slug)`

Renders the colored vendor legend (swatch + clickable name + current price) into `#retailViewVendorLegend`.

- Clears the container on every call.
- Reads current prices from `retailPrices.prices[slug].vendors`.
- Reads OOS state from `retailAvailability[slug]`.
- Renders only vendors that have either a non-null `price` or an OOS flag. Returns early if no vendors qualify.
- Iterates `RETAIL_VENDOR_NAMES` keys in declaration order.
- Per-vendor URL resolution: checks `retailProviders[slug][vendorId]` first, then `RETAIL_VENDOR_URLS[vendorId]`.
- In-stock vendors with a URL: rendered as `<a>` elements. Click opens vendor URL in a named popup window (`retail_vendor_{vendorId}`, 1250x800); falls back to `_blank` if popup is blocked.
- OOS vendors: out-of-stock vendors are omitted from the legend entirely when price is null (`_buildVendorLegend` returns early at the `if (price == null) return` guard on line 94).

### `_bucketWindows(windows)`

Groups raw 15-min API windows into 30-min aligned slots.

- Rounds each window's UTC timestamp down to the nearest HH:00 or HH:30 boundary.
- For slots with multiple raw windows, keeps the most recent (by original timestamp).
- Returns up to 48 entries, sorted chronologically (oldest first).
- Returns `[]` on null, undefined, or empty input.
- Windows with a missing or unparseable `window` field are silently skipped.

### `_forwardFillVendors(bucketed)`

Fills vendor price gaps so the chart never shows a false "vendor dropped out" dip when a vendor simply had no poll for a slot.

- Pure function — never mutates input objects.
- Iterates windows chronologically, maintaining `lastSeen[vendorId]` across the array.
- For each vendor in `RETAIL_VENDOR_NAMES`: if the current window has no price but `lastSeen` has one, the carry-forward value is copied in and the vendor ID is added to the window's `_carriedVendors: Set`.
- Returns `[]` on empty input.
- Only vendors in `RETAIL_VENDOR_NAMES` are eligible for forward-fill. A vendor that never appeared in any window is never filled (no `lastSeen` entry).

### `_flagAnomalies(bucketed)`

Two-pass anomaly filter that nulls scraper spike prices before charting. Preserves original values in `_anomalyOriginals` for table display.

**Pass 1 — Temporal spike detection (primary):** For each vendor at window `t`, if neighbors at `t-1` and `t+1` are stable (within `RETAIL_SPIKE_NEIGHBOR_TOLERANCE`, default 5%) but the price at `t` deviates beyond that tolerance from the neighbor average, the price is replaced with `null` and the original is saved in `_anomalyOriginals`. Boundary windows (`t=0`, `t=last`) are skipped — Pass 2 provides coverage there.

**Pass 2 — Cross-vendor median consensus (safety net):** For each window with 3+ vendors, any vendor deviating more than `RETAIL_ANOMALY_THRESHOLD` (default 40%) from the median is nulled. Guard: if all vendors would be flagged, none are (prevents false consensus collapse).

Anomalous chart prices are set to `null` so Chart.js gaps over them via `spanGaps: true`. Table cells with anomalous values render with strikethrough at reduced opacity.

### `_buildIntradayChart(slug)`

Renders the Chart.js 24h intraday line chart into `#retailViewIntradayChart`.

1. Reads `retailIntradayData[slug].windows_24h`.
2. Runs `_bucketWindows` → `_forwardFillVendors` → `_flagAnomalies`.
3. Shows `#retailViewIntradayNoData` placeholder if fewer than 2 windows survive.
4. Destroys any existing `_retailViewIntradayChart` before creating a new one.
5. Builds one dataset per active vendor (at least one non-null price in the flagged windows), using `RETAIL_VENDOR_NAMES` for order and `RETAIL_VENDOR_COLORS` for line colors.
6. Falls back to Median + Low aggregate datasets when no per-vendor data exists (pre-vendor-format windows).
7. Attaches `_carriedIndices: Set<number>` to each dataset — indices whose value was forward-filled.
8. Tooltip callback: returns nothing if `ctx.raw == null`; prefixes with `~` for carried values.
9. Chart options: `spanGaps: true`; legend hidden in vendor mode; X-axis HH:00 labels rendered at full opacity, HH:30 at reduced opacity and smaller font.
10. Calls `_buildIntradayTable(slug, bucketed)` at the end.

### `_buildIntradayTable(slug, bucketed?)`

Renders the "Recent windows" table into `#retailViewIntradayTableBody`.

- If `bucketed` is omitted, re-buckets from `retailIntradayData[slug]` (used by the row-count dropdown's `onchange` handler).
- Slices to the `_intradayRowCount` most-recent windows and displays them newest-first.
- Column header: "Time (local)" or "Time ({tz})" depending on user timezone setting.
- When per-vendor data is present: one column per active vendor. Fallback: "Median" and "Low" columns.

**Cell rendering:**

| Condition | Output |
|---|---|
| Value is `null` (no data, nothing to carry) | `—` (no styling) |
| Value is anomalous | Strikethrough at 45% opacity; no trend glyph |
| Value was forward-filled (`_carriedVendors`) | `~$XX.XX` in muted italic; no trend glyph |
| Fresh value | `$XX.XX ▲/▼/—` with `text-success` / `text-danger` class |

Trend glyphs compare each row to the row immediately below it (the next-older window, since the table is newest-first).

---

## Price Display Logic

### Current Prices (Vendor Legend)

Sourced from `retailPrices.prices[slug].vendors[vendorId].price` — the latest single-poll snapshot stored during the most recent full sync or background refresh.

- In-stock: `$XX.XX`
- OOS with last-known price: `~~$XX.XX~~ OOS` (strikethrough + badge)
- OOS with no known price: `— OOS`

### Historical (Price History Tab)

Sourced from `retailPriceHistory[slug]` — daily averages computed by the API from polling windows throughout the day.

Each history entry shape: `{ date, avg_median, avg_low, vendors: { [vendorId]: { avg, inStock } } }`.

OOS entries (`inStock === false`) produce `null` in the chart dataset, rendering as a break in the line (`spanGaps: false`).

### Trend Display (24h Chart)

Trend glyphs in the intraday table compare each time-slot to the prior slot. Color classes:

- `text-success` (green) — price increased.
- `text-danger` (red) — price decreased.
- No class (neutral) — price unchanged.

Carried (forward-filled) values never show a trend glyph because the movement is artificially flat.

---

## Vendor Display and Links

Vendor URL resolution priority (checked in order):

1. `retailProviders[slug][vendorId]` — deep-link URL to the specific product page, populated from `providers.json`.
2. `RETAIL_VENDOR_URLS[vendorId]` — fallback homepage URL hardcoded in `retail.js`.
3. No URL — vendor element rendered as `<span>` instead of `<a>`.

Vendor popup behavior: `window.open(url, 'retail_vendor_{vendorId}', 'width=1250,height=800,...')`. If the popup is blocked, falls back to `window.open(url, '_blank')`.

Vendor color is always sourced from `RETAIL_VENDOR_COLORS[vendorId]` in `retail.js`. Colors were brightened in v3.33.06 for better contrast on dark backgrounds.

---

## Modal Open / Close

### Opening

`openRetailViewModal(slug)` is exported to `window` and called from retail card click handlers in `retail.js`. It reads `RETAIL_COIN_META[slug]` — if the slug is not present in that map, the function returns early without opening the modal.

The modal uses `openModalById("retailViewModal")` from the shared modal system (`js/dialogs.js`).

### Closing

`closeRetailViewModal()` is exported to `window` and called from the modal's close button (`onclick`). It must destroy both Chart.js instances before closing to prevent canvas context leaks.

### Tab Switching

`_switchRetailViewTab(tab)` is exported to `window` and wired to tab button `onclick` handlers in `index.html`. Valid values: `"history"` or `"intraday"`.

---

## Data Refresh Behavior

**On page load:** `initRetailPrices()` in `retail.js` loads all cached data from localStorage, then calls `syncRetailPrices({ ui: false })` in the background.

**On Sync button click:** `syncRetailPrices({ ui: true })` runs the full sync pipeline for all slugs.

**On modal open:** `openRetailViewModal` fires a targeted `Promise.all` for just the opened slug's `latest.json` and `history-30d.json`. This is intentionally narrow — it gives the modal fresh per-vendor intraday data even when the full sync has not run recently. On success, it rebuilds the intraday chart and vendor legend in-place without closing the modal.

**Intraday data cap:** `saveRetailIntradayData` prunes each slug's `windows_24h` to the last 96 entries before writing to localStorage (96 × 15 min = 24 hours of data).

**Staleness warning:** If both fetches in the modal's background refresh fail, a `.retail-stale-data-warning` banner is inserted at the top of the modal body. It is cleared on the next successful open (removed at the start of `openRetailViewModal`).

---

## Window Exports

```js
window.openRetailViewModal    // called from retail card buttons
window.closeRetailViewModal   // called from modal close button
window._switchRetailViewTab   // called from tab button onclick handlers
window._bucketWindows         // exported for console/smoke-test inspection
window._forwardFillVendors    // exported for console/smoke-test inspection
window._flagAnomalies         // exported for console/smoke-test inspection
window._buildIntradayTable    // called by row-count dropdown onchange
```

`_buildIntradayChart` and `_buildVendorLegend` are module-private — not exported to `window`.

---

## Common Mistakes

### Calling `_buildIntradayChart` and `_buildIntradayTable` independently

`_buildIntradayChart` always calls `_buildIntradayTable` at the end with the same `bucketed` array. Calling both independently builds the table twice — the second call re-buckets from `retailIntradayData` and may show stale data if the background refresh updated the cached object between calls.

### Missing the null guard in Chart.js tooltip callbacks

Chart.js passes `ctx.raw = null` for gap points when `spanGaps: true`. Calling `Number(null).toFixed(2)` returns `"0.00"` — no error, but silently wrong. Always guard: `if (ctx.raw == null) return;`.

### Mutating the `bucketed` input in `_forwardFillVendors`

`_bucketWindows` returns objects that are shared across chart and table builds. Mutating them in `_forwardFillVendors` corrupts the source data for subsequent pipeline steps. Always shallow-copy each window object before attaching `_carriedVendors`.

### Adding a vendor without updating all three vendor maps

`RETAIL_VENDOR_NAMES`, `RETAIL_VENDOR_COLORS`, and `RETAIL_VENDOR_URLS` in `retail.js` must all be updated together. A vendor missing from `RETAIL_VENDOR_NAMES` will never appear in the chart, table, or legend regardless of the other two maps — `RETAIL_VENDOR_NAMES` keys drive the iteration order everywhere.

### Not destroying Chart.js instances before reassignment

Both `_retailViewModalChart` and `_retailViewIntradayChart` must be explicitly destroyed before creating new ones. Skipping this causes "Canvas is already in use" console warnings on the next modal open, and the chart may not render at all.

### OOS vendors disappearing from the legend after a price refresh

`_buildVendorLegend` reads the `hasAny` guard from two sources: live prices AND availability flags. If a vendor is OOS (`retailAvailability[slug][v] === false`) it is always included in the legend even if its `price` in `retailPrices` is `null`. Do not restructure the guard to only check `price != null`.

### Opening the modal for a slug not in `RETAIL_COIN_META`

`openRetailViewModal` reads `RETAIL_COIN_META[slug]` and returns early if not found. Dynamic slugs (Goldbacks, manifest-added coins) are resolved via `getRetailCoinMeta(slug)` in `retail.js`, but the modal uses the raw `RETAIL_COIN_META` constant directly. If a new slug from the manifest is not in that constant and has no Goldback pattern match, the modal will silently refuse to open.

As of v3.33.57, `RETAIL_COIN_META` includes 15 hardcoded entries covering all standard coins plus the three Australian silver coins (Kangaroo, Koala, Kookaburra). The manifest's `coins_meta` field provides runtime metadata but is not persisted to localStorage — on page reload before the manifest re-fetches, only the hardcoded entries are available.

---

## Related Pages

- [api-consumption.md](api-consumption.md) — how `retail.js` fetches `manifest.json`, `latest.json`, `history-30d.json`, and `providers.json` from `api.staktrakr.com`
- [vendor-quirks.md](vendor-quirks.md) — per-vendor scraper edge cases, confidence scores, and OOS detection behavior

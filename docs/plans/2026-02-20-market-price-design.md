# Market Price Page — Design Document

**Date**: 2026-02-20
**Status**: Approved

## Overview

Add a **Market Price** section to the StakTrakr Settings modal (below Goldback) that displays
current retail prices for the 11 coin types tracked by the retail price poller. Prices come from
four major bullion dealers (APMEX, Monument Metals, SDB Bullion, JM Bullion) and are aggregated
into average, median, and lowest figures.

## 11 Tracked Coin Slugs

| Slug | Name | Weight (oz) | Metal |
|---|---|---|---|
| ase | American Silver Eagle | 1.0 | silver |
| maple-silver | Silver Maple Leaf | 1.0 | silver |
| britannia-silver | Silver Britannia | 1.0 | silver |
| krugerrand-silver | Silver Krugerrand | 1.0 | silver |
| generic-silver-round | Generic Silver Round | 1.0 | silver |
| generic-silver-bar-10oz | Generic 10oz Silver Bar | 10.0 | silver |
| age | American Gold Eagle | 1.0 | gold |
| buffalo | American Gold Buffalo | 1.0 | gold |
| maple-gold | Gold Maple Leaf | 1.0 | gold |
| krugerrand-gold | Gold Krugerrand | 1.0 | gold |
| ape | Australian Platinum Eagle | 1.0 | platinum |

## Data Source

**Base URL**: `https://api.staktrakr.com/data/retail/`

### Manifest File (New)

`GET https://api.staktrakr.com/data/retail/manifest.json`

```json
{
  "lastUpdated": "2026-02-19T14:00:00Z",
  "latestDate": "2026-02-19",
  "dates": ["2026-02-19", "2026-02-18", "2026-02-17"],
  "slugs": ["ase", "maple-silver", "britannia-silver", ...]
}
```

**Poller change required**: `devops/retail-poller/merge-prices.js` must write/update
`data/retail/manifest.json` after each successful run.

### Per-Slug Final File

`GET https://api.staktrakr.com/data/retail/{slug}/{date}-final.json`

```json
{
  "date": "2026-02-19",
  "prices_by_site": { "apmex": 93.17, "monumentmetals": 90.93, "sdbullion": 94.17, "jmbullion": 95.18 },
  "scores_by_site": { "apmex": 65, "monumentmetals": 55, "sdbullion": 45, "jmbullion": 75 },
  "methods_by_site": { "apmex": "firecrawl", ... },
  "average_price": 93.36,
  "median_price": 94.17,
  "lowest_price": 90.93
}
```

## Sync Flow

```
User clicks Sync
  1. GET manifest.json → extract latestDate
  2. Parallel: GET {slug}/{latestDate}-final.json × 11
  3. Merge all results into current snapshot
  4. Append snapshot to per-slug history array
  5. Save to localStorage (2 keys)
  6. Re-render market cards
```

Error handling: if manifest fetch fails, show error toast. If individual slug fetch fails,
show "no data" state on that card (not a fatal error).

## localStorage (2 New Keys)

Both keys must be added to `ALLOWED_STORAGE_KEYS` in `js/constants.js`.

### `RETAIL_PRICES_KEY` — Current Snapshot

```json
{
  "lastSync": "2026-02-19T14:32:00Z",
  "date": "2026-02-19",
  "prices": {
    "ase": {
      "average_price": 93.36,
      "median_price": 94.17,
      "lowest_price": 90.93,
      "prices_by_site": { "apmex": 93.17, ... },
      "scores_by_site": { "apmex": 65, ... }
    }
  }
}
```

### `RETAIL_PRICE_HISTORY_KEY` — Append-Only History

```json
{
  "ase": [
    { "date": "2026-02-19", "average_price": 93.36, "median_price": 94.17, "lowest_price": 90.93,
      "prices_by_site": { "apmex": 93.17, ... } },
    { "date": "2026-02-18", ... }
  ],
  "maple-silver": [...]
}
```

History is appended on each sync (one entry per date, deduped by date).
Oldest entries purged after 365 days to prevent unbounded growth.

## New JS Files (2)

Script count increases from 54 → 56.

### `js/retail.js` (after `js/goldback.js` in load order)

Exports globals:
- `retailPrices` — current snapshot object
- `retailPriceHistory` — history object
- `syncRetailPrices()` — triggers manifest → slug fetch flow
- `loadRetailPrices()` / `saveRetailPrices()` — localStorage persistence
- `loadRetailPriceHistory()` / `saveRetailPriceHistory()` — history persistence
- `getRetailHistoryForSlug(slug)` — returns history array for one slug
- `renderRetailCards()` — re-renders the settings panel cards

### `js/retail-view-modal.js` (after `js/retail.js` in load order)

Exports globals:
- `openRetailViewModal(slug)` — opens the per-coin detail modal

## Script Load Order (Updated)

```
priceHistory.js → spotLookup.js → goldback.js
retail.js → retail-view-modal.js          ← NEW
api.js → catalog-api.js → ...
```

Both new files added to `sw.js` CORE_ASSETS.

## Settings Panel — `settingsPanel_market`

Placed below `settingsPanel_goldback` in `index.html`.
Navigation entry added to Settings sidebar.

### Header Row

```
[ Market Prices ]     Last synced: Feb 19, 2026 2:32 PM   [Sync Now]
```

### Coin Cards (responsive grid, 2–3 columns)

Each card:

```
┌─────────────────────────────────────────┐
│ American Silver Eagle        [silver]   │
│ 1 troy oz                               │
│                                         │
│  Avg: $93.36   Med: $94.17   Low: $90.93│
│                                         │
│  APMEX     $93.17  ●●●●○  (65)         │
│  Monument  $90.93  ●●●○○  (55)         │
│  SDB       $94.17  ●●○○○  (45)         │
│  JM        $95.18  ●●●●○  (75)         │
│                                         │
│  Data: Feb 19, 2026          [History]  │
└─────────────────────────────────────────┘
```

Confidence scores displayed as dot indicators (similar to signal bars).
"History" button → switches to changelog section, scrolls to retail history table for that slug.

## History — Changelog Section

New "Market Price History" subsection added to `settingsPanel_changelog`.

- Coin selector dropdown (defaults to first slug)
- Timeframe tabs: 7d | 30d | 90d | All
- Table columns: Date | Avg | Median | Lowest | APMEX | Monument | SDB | JM

The "History" button on each card calls `switchSettingsSection('changelog')` and then
scrolls/focuses the dropdown to the selected coin.

## Retail View Modal (Per-Coin Detail)

Triggered by `openRetailViewModal(slug)`. A simple modal (not the full item viewModal).

Sections:
1. **Header** — coin name, metal, weight
2. **Current Prices** — vendor table for today's prices + scores
3. **Price History Chart** — Chart.js line chart, avg price over time (all history)
4. **History Table** — all synced dates, same columns as changelog history table

Uses the existing modal overlay infrastructure (same CSS classes as other modals).

## Poller Change — Manifest Generation

`devops/retail-poller/merge-prices.js` additions:

1. After writing all `{date}-final.json` files, read existing `manifest.json` (or create)
2. Add `latestDate` = today's date
3. Prepend today to `dates[]` array, dedupe, sort descending, cap at 90 entries
4. Write updated `manifest.json` to `data/retail/manifest.json`
5. The manifest is committed to the `data` branch by the same GH Actions workflow that
   commits all other retail output files.

## Coins Without Data (Empty State)

If a slug has no data for `latestDate` (fetch 404):
- Card shows "No recent data" with last known date if history exists
- Does not block the rest of the cards from rendering

## CSS / Theme

All new UI uses existing CSS custom properties (`var(--...)`). No hardcoded colors.
Card layout uses existing `.settings-card` or similar pattern (to be confirmed during
implementation by reading the goldback section HTML for reference).

## Out of Scope (Future)

- Coin images via Numista IDs
- Premium-over-melt calculation (retail price vs melt value)
- Price alerts / threshold notifications
- Export retail history to CSV

## Implementation Plan

See `writing-plans` skill output (to follow).

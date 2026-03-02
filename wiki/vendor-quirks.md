---
title: Vendor Quirks
category: infrastructure
owner: staktrakr
lastUpdated: v3.33.25
date: 2026-03-02
sourceFiles:
  - js/retail.js
  - js/api.js
  - js/retail-view-modal.js
relatedPages:
  - retail-modal.md
  - retail-pipeline.md
  - providers.md
---

# Vendor Quirks

Frontend-specific behaviors, display adaptations, and data normalization rules for each retail price vendor. This page documents how `js/retail.js` and `js/retail-view-modal.js` handle the output produced by the StakTrakrApi retail poller — it is **not** a scraping runbook. For scraping-side quirks (Firecrawl waitFor, bot detection, OOS pattern matching), see the `StakTrakrApi` repo's `vendor-quirks.md`.

---

## Overview

Retail price data flows from `api.staktrakr.com/data/api` to the frontend via `manifest.json` and per-slug `latest.json` / `history-30d.json` files. The frontend reads this data and renders it as cards (grid view or list view). Each vendor has a fixed display name, brand color, and homepage URL hardcoded in `js/retail.js`. Per-slug product page URLs are loaded from `providers.json` and overlay the homepage fallbacks.

Vendor identity in the frontend is always a short string key: `apmex`, `monumentmetals`, `sdbullion`, `jmbullion`, `herobullion`, `bullionexchanges`, `summitmetals`, `goldback`.

---

## Key Rules

1. **Prices are always displayed as USD.** Retail prices are USD source data. `_fmtRetailPrice()` always calls `toLocaleString('en-US', ...)` regardless of the user's currency setting. This is intentional — spot prices convert to user currency, retail prices do not.

2. **Vendor display info resolves in priority order: manifest `_vendor_meta` → hardcoded `RETAIL_VENDOR_NAMES`/`RETAIL_VENDOR_COLORS`/`RETAIL_VENDOR_URLS`.** `getVendorDisplay(vendorId)` uses this chain. If a vendor appears in the poller output but not in the hardcoded maps, the vendor key is used as the label and the color falls back to `#6c757d` (gray).

3. **Product page URLs prefer `providers.json` over vendor homepages.** All vendor links (grid card rows, list view vendor chips, retail view modal legend items) use this resolution: `retailProviders[slug][vendorId]` → `RETAIL_VENDOR_URLS[vendorId]`. The `providers.json` file is fetched once per sync and cached in `localStorage` under `RETAIL_PROVIDERS_KEY`.

4. **OOS vendors are always rendered last in the sort.** The frontend sort order within a card/chip is: high-confidence in-stock (≥60% score) sorted by price ascending → low-confidence in-stock → OOS vendors. This is applied identically in both the grid view (`_buildRetailCard`) and list view (`_buildMarketListCard`).

5. **Confidence score drives medal awarding, not price alone.** Top-3 medals (gold/silver/bronze in grid view, "1st"/"2nd"/"3rd" in list view) are awarded only to vendors with confidence score ≥ 60. A vendor with the lowest price but confidence < 60 does not receive a medal.

6. **Goldback is a special vendor with a separate pipeline.** Its price comes from `getGoldbackVendorPrice(slug)`, not from the standard `priceData.vendors` map. It is injected at the top of the vendor list before the sorted main-vendor block and is never medal-ranked.

---

## Vendor Behavior Table

| Vendor | Display Name | Brand Color | Frontend-Specific Notes |
|--------|-------------|-------------|------------------------|
| `apmex` | APMEX | `#60a5fa` (bright blue) | Most reliable; no known frontend display anomalies |
| `jmbullion` | JM | `#fbbf24` (bright amber) | History chart shows gaps when `inStock: false` on a day entry (`spanGaps: false`) |
| `sdbullion` | SDB | `#34d399` (bright emerald) | No known frontend quirks |
| `monumentmetals` | Monument | `#c4b5fd` (bright violet) | No known frontend quirks |
| `herobullion` | Hero | `#f87171` (red) | Occasional legitimate OOS on `ape` (American Platinum Eagle) |
| `bullionexchanges` | BullionX | `#f472b6` (bright pink) | Legitimate OOS has occurred on `ape`; OOS state persisted in `retailAvailability` |
| `summitmetals` | Summit | `#22d3ee` (bright cyan) | No known frontend quirks |
| `goldback` | Goldback | `#d4a017` (deep gold) | Separate pipeline; injected separately from vendor map; staleness shown as `(stale)` label |

---

## OOS (Out-of-Stock) Detection — Frontend Side

OOS detection happens in the **poller** (StakTrakrApi). The frontend reads and persists the OOS state.

**Data flow:**

1. `latest.json` for each slug contains `availability_by_site: { "apmex": true, "sdbullion": false, ... }`.
2. `syncRetailPrices()` merges this into `retailAvailability[slug]` and persists it via `saveRetailAvailability()` in `localStorage`.
3. Separately, `last_known_price_by_site` and `last_available_date_by_site` from `latest.json` are stored in `retailLastKnownPrices[slug]` and `retailLastAvailableDates[slug]`.

**Frontend OOS rendering:**

- In **grid view** (`_buildOOSVendorRow`): the vendor name link is grayed out, the price is shown with a strikethrough `<del>` element, and a red `OOS` badge is appended. The row tooltip shows the last known price and last available date if present.
- In **list view** (`_buildMarketListCard`): vendor chips with OOS status get the `.oos` CSS class. The price text reads "OOS" with no dollar amount.
- In **retail view modal** (`_buildVendorLegend`): OOS vendors are rendered at 50% opacity. The price element uses `<del>` for the last known price plus a red `OOS` badge. The item title attribute carries the last available date.
- In the **daily history chart** (`openRetailViewModal`): when a history entry has `vendors[vendorId].inStock === false`, `null` is returned for that day's data point. `spanGaps: false` is set, so Chart.js renders a gap in the line (not an interpolated bridge).

**Persistence caveat:** `retailAvailability` is merged with `Object.assign` on each sync. Once a vendor is marked OOS in `localStorage`, it stays OOS until the next sync where `availability_by_site` explicitly sets it back to `true`. If the poller omits a vendor from `availability_by_site` entirely, the prior stored state persists.

---

## Price Parsing Edge Cases

These are frontend display-layer concerns, not scraping issues.

### Goldback Price Staleness

The Goldback vendor price is sourced via `getGoldbackVendorPrice(slug)`, which reads from the `goldback-spot.json` feed (a separate pipeline). If that feed is older than ~25 hours, `isStale: true` is returned. The frontend appends `(stale)` to the price display text and reduces opacity to 0.6 on the card row.

### Intraday Data: Forward-Fill for Chart Gaps

When a vendor is not polled in a given 15-minute window (e.g., poller skipped or vendor was OOS for one window), the frontend applies **forward-fill** via `_forwardFillVendors()` in `retail-view-modal.js`. This carries the most recent seen price forward into gap windows. Forward-filled values are marked `_carriedVendors` on the window object. In the intraday table, carried values display as `~$XX.XX` in italic gray. In the intraday chart tooltip, carried values display with a `~` prefix.

### Anomaly Detection — Intraday Spikes

The frontend applies a two-pass spike filter to intraday (15-min) data before chart/table rendering:

**Pass 1 — Temporal spike detection:** For each vendor at window `t`, if the neighbors (`t-1`, `t+1`) are within ±5% of each other (stable neighborhood) but the current price deviates by more than 5% from their average, the point is treated as a scrape spike. The anomalous value is nulled for the chart (Chart.js gaps over it via `spanGaps: true`) but preserved in `_anomalyOriginals` for the table, where it displays with strikethrough and 45% opacity.

**Pass 2 — Cross-vendor median consensus:** For each window with 3+ vendors, any vendor deviating more than 40% from the median across that window is nulled. Catches multi-window vendor drift and extreme outliers.

The same two-pass logic is applied to **daily history** via `_filterHistorySpikes()`, followed by `_interpolateGaps()` which linearly interpolates null gaps for smooth chart lines. Interpolated segments render as dashed lines in a dimmed color.

Threshold constants:
- `RETAIL_SPIKE_NEIGHBOR_TOLERANCE` — default `0.05` (5%)
- `RETAIL_ANOMALY_THRESHOLD` — default `0.40` (40%)

### History Chart: OOS Creates Gaps, Not Carries

In the daily history chart (`openRetailViewModal`), when a vendor entry has `inStock: false`, the chart dataset returns `null` for that day. `spanGaps: false` is used so Chart.js renders an actual gap in the line, not an interpolated bridge. This is the correct behavior — carried values would misrepresent availability.

The intraday chart uses `spanGaps: true` because short polling gaps are expected and bridging is preferred visually.

### Price Field Shape Differences by Context

| Context | Field | Source |
|---------|-------|--------|
| Live price (card row) | `vendorData.price` | `latest.json` → `priceData.vendors[id].price` |
| History chart (daily) | `vendorData.avg` | `history-30d.json` → `entry.vendors[id].avg` |
| Market list stats | `.avg` (with `inStock` check) | Computed from in-stock vendors only via `_calcVendorAvg()` |

Do not mix `.price` and `.avg` — they represent different aggregation windows.

---

## Vendor URL Resolution

Two-tier URL resolution is used everywhere a vendor is linked (grid card, list card chip, retail view modal legend):

```
retailProviders[slug][vendorId]   // specific product page from providers.json
  || RETAIL_VENDOR_URLS[vendorId] // vendor homepage fallback
```

`providers.json` is fetched at the start of each sync. If the fetch fails or returns an error status, the frontend logs a warning and falls back silently to homepage URLs for all links. No user-visible error is shown for a providers fetch failure.

Vendor links always open in a named popup window (`retail_vendor_${vendorId}`) sized 1250×800. If the popup is blocked, `window.open(url, "_blank")` is used as fallback.

---

## Goldback Slug Parsing

Goldback slugs beyond the hardcoded `goldback-oklahoma-g1` entry are dynamically resolved by `_parseGoldbackSlug(slug)` in `js/retail.js`. The function parses the pattern `goldback-{state}-{denomination}` and looks up the weight from `GOLDBACK_WEIGHTS`.

Supported denominations: `g0.5` / `ghalf`, `g1`, `g2`, `g5`, `g10`, `g25`, `g50`.

If a goldback slug appears in the manifest that does not match this pattern, `getRetailCoinMeta()` returns a default object with `weight: 0` and `metal: "unknown"`, which causes the card to render without a metal badge and `0 troy oz` as the weight label.

---

## Common Mistakes

**Checking the wrong OOS state.** `retailAvailability[slug][vendorId] === false` means OOS. The default for a vendor not present in the map is treated as in-stock (`isAvailable = availability[key] !== false`). Do not use `=== true` to check in-stock status — a missing key is also in-stock.

**Assuming vendor price is always a number.** `vendorData.price` can be `null` (vendor polled but no price found) or `undefined` (vendor not present in this slug's vendor map). Always null-check before rendering.

**Editing `RETAIL_VENDOR_NAMES` without checking `RETAIL_VENDOR_COLORS` and `RETAIL_VENDOR_URLS`.** All three maps are keyed by the same vendor ID strings and must stay in sync. Adding a new vendor key to one but not the others results in undefined color (gray fallback) or missing homepage link.

**Expecting `retailers.js` functions in `retail-view-modal.js`.** The modal file references `RETAIL_VENDOR_NAMES`, `RETAIL_VENDOR_COLORS`, `RETAIL_VENDOR_URLS`, `retailPrices`, `retailAvailability`, `retailLastKnownPrices`, `retailLastAvailableDates`, `retailIntradayData`, `retailPriceHistory`, and `retailProviders` as globals from `retail.js`. Script load order in `index.html` must place `retail.js` before `retail-view-modal.js`.

**Forgetting intraday cap.** `saveRetailIntradayData()` caps `windows_24h` to the last 96 entries per slug (24h of 15-min data) before saving to `localStorage`. Any code that reads `retailIntradayData[slug].windows_24h` and expects more than 96 entries will be disappointed.

---

## Related Pages

- [retail-modal.md](retail-modal.md) — Retail view modal UI behavior and tab structure
- [retail-pipeline.md](retail-pipeline.md) — End-to-end data pipeline from poller to frontend
- [providers.md](providers.md) — `providers.json` schema and per-slug product URL mapping

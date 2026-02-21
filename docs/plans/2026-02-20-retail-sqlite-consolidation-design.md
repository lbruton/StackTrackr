# Retail Pipeline Consolidation: SQLite-Only + Intraday UI

**Date:** 2026-02-20
**Status:** Approved
**Linear:** STAK-217 (UI), new ticket for pipeline consolidation

## Goal

Retire the per-date JSON file pipeline entirely. SQLite is the single source of truth. `data/api/` is the only output committed to git. The frontend migrates to the new REST API endpoints and gains a 15-minute intraday sparkline on cards and a full 24h chart tab in the per-coin modal. STAK-217 visual polish ships in the same pass.

## Context

The retail poller now runs every 15 minutes and writes every scrape result to SQLite (`prices.db`). `api-export.js` reads SQLite and generates `data/api/` endpoints including `{slug}/latest.json` (current prices + 96-window 24h time series) and `{slug}/history-30d.json` (daily aggregates). The old `data/retail/{slug}/{date}-final.json` files are now redundant — the daily aggregates are computed more accurately from actual averaged 15-min data rather than a single point-in-time scrape. With only 2 days of data in dev, now is the right time to consolidate before any users depend on the old format.

---

## Architecture After This Change

```
Every 15 min (cron: */15 * * * *)
  run-local.sh
    → price-extract.js   (Firecrawl + Playwright fallback → SQLite only, no JSON files)
    → api-export.js      (SQLite → data/api/ — confidence scoring included)
    → git add data/api/
    → git push origin data

Daily 3pm ET
  run-fbp.sh
    → query SQLite for is_failed=1 rows today
    → scrape FBP for affected coins
    → write recovered prices to SQLite
    → api-export.js
    → git push
```

**Gone:** `data/retail/{slug}/{date}.json`, `{date}-final.json`, `{date}-{HH}h.json`, `data/retail/manifest.json`, `merge-prices.js` as pipeline step.

---

## Backend Changes

### `devops/retail-poller/price-extract.js`
- Remove `writeDailyJson()` call from the main scrape-and-aggregate section
- Remove `writeDailyJson` function entirely
- Remove `updateProviderCandidates` / `provider_candidates.json` write (debug artifact — no longer needed)
- Keep `extractPrice`, `extractFbpPrices`, `scrapeUrl`, `scrapeWithPlaywright`, shuffle/jitter — these are still the scrape engine
- PATCH_GAPS mode: rewritten below in `run-fbp.sh` section

### `devops/retail-poller/api-export.js`
Add confidence scoring before writing `{slug}/latest.json`. Scoring is simpler than `merge-prices.js` — only one source per vendor now:

```
score = 50 (base: single source)
+ 10 if price within 3% of window median
- 15 if price >8% from median (outlier)
- 20 if price >10% day-over-day vs previous window's median
clamp 0–100
```

Also: read previous day's median from SQLite `readDailyAggregates` for day-over-day check.

### `devops/retail-poller/merge-prices.js`
No pipeline changes — file stays on disk (historical reference) but removed from `run-local.sh`.

### `devops/retail-poller/run-local.sh`
- Remove `node /app/merge-prices.js` call
- Change `git add data/retail/ data/api/` → `git add data/api/`
- Update commit message

### `devops/retail-poller/run-fbp.sh`
Rewrite. Old: reads `{date}.json` files for `failed_sites`. New:

```bash
# Query SQLite for today's failed vendors
# Scrape FBP for each coin with failures
# Write recovered prices to SQLite (source='fbp')
# Call api-export.js to regenerate data/api/
# git add data/api/ && git push
```

### Data branch cleanup
Delete `data/retail/` folder from data branch. Only `data/api/` remains.

---

## Frontend Changes

### `js/constants.js`
- Add `RETAIL_API_BASE_URL` — base URL for new REST API (`https://api.staktrakr.com/data/api`)
- Add `RETAIL_INTRADAY_KEY = 'retailIntradayData'` to `ALLOWED_STORAGE_KEYS`
- Keep `RETAIL_BASE_URL` temporarily (used in existing code, remove once migration is complete)

### `js/retail.js` — Data layer rewrite

**New fetch flow in `syncRetailPrices()`:**

1. Fetch `{RETAIL_API_BASE_URL}/manifest.json` → coin list, latest window
2. For each slug, `Promise.allSettled`:
   - `{RETAIL_API_BASE_URL}/{slug}/latest.json` → `{ median_price, lowest_price, vendors, windows_24h }`
   - `{RETAIL_API_BASE_URL}/{slug}/history-30d.json` → `[{ date, avg_median, avg_low, sample_count, vendors }]`
3. Update `retailPrices` (current snapshot), `retailPriceHistory` (daily), `retailIntradayData` (15-min windows)
4. Save all three to localStorage

**Updated storage shape:**

```js
// retailPrices (existing key, updated shape)
{ lastSync: ISO, window_start: ISO, prices: {
  ase: { median_price, lowest_price, vendors: { apmex: { price, confidence, source } } }
}}

// retailPriceHistory (existing key, updated shape)
{ ase: [{ date, avg_median, avg_low, sample_count, vendors: { apmex: { avg } } }, ...] }

// retailIntradayData (new key)
{ ase: { window_start: ISO, windows_24h: [{ window, median, low }, ...] } }
```

**Updated render helpers:**
- `_computeRetailTrend(slug)` — use `avg_median` field from history (was `average_price`)
- `_renderRetailSparkline(slug)` — use `windows_24h` from `retailIntradayData` (intraday, not 7-day daily)
- `renderRetailHistoryTable()` — use `avg_median` / `avg_low` column labels (was `Average` / `Median`)

### `js/retail.js` — STAK-217 visual polish (Tasks 1–9, Task 10 replaced)

All STAK-217 tasks ship in this pass:

| Task | Change |
|------|--------|
| 1 | Fix CSS class name mapping + summary value span |
| 2 | Metal badge color coding + emoji |
| 3 | Card hover lift |
| 4 | Trend indicator badge (use `avg_median` from new history shape) |
| 5 | Lowest price highlight on vendor row |
| 6 | 5-segment confidence bar (replaces Unicode dots) |
| 7 | Collapsible vendor section via `<details>` |
| 8 | Shimmer skeleton cards during sync |
| 9 | No-data empty state with Sync CTA |
| 10* | **Intraday sparkline** — `windows_24h` from `retailIntradayData` (replaces 7-day daily sparkline) |
| 11 | Smoke test + verification |

**Task 10 — Intraday sparkline detail:**
- Source: `retailIntradayData[slug].windows_24h` (up to 96 windows)
- Show last 48 windows (12h) for compact display; use `median` field
- Chart.js type: `"line"`, no axes, no legend, `animation: false`
- Canvas: `80×28px`, blue (`#3b82f6`), 1.5px border, no points
- Label in footer: "today" instead of date

### `js/retail-view-modal.js` — 24h chart tab

Add a tab toggle in the modal header: **[Price History] [24h Chart]**

**24h Chart tab:**
- Chart.js line chart, full-width, `~200px` tall
- X-axis: time labels `HH:mm` (from `window_start` field, UTC→local)
- Two datasets: `median` (blue solid) and `low` (green dashed)
- Source: `retailIntradayData[slug].windows_24h`
- Below chart: compact table of the 5 most recent windows with vendor prices from `windows_24h` (if available)
- If no intraday data yet: "No intraday data — check back after the next 15-minute sync"

### `js/constants.js`
No new `ALLOWED_STORAGE_KEYS` beyond `RETAIL_INTRADAY_KEY`.

---

## CSS Changes (`css/styles.css`)

All additive, appended after the existing retail block (~line 11213):

- `.retail-price-card` base + hover lift (STAK-217 Tasks 1, 3)
- `.retail-metal-badge--{metal}` color pills (Task 2)
- `.retail-trend--{dir}` badges (Task 4)
- `.retail-vendor-row--best` highlight (Task 5)
- `.retail-conf-bar` + `.retail-conf-seg` (Task 6)
- `.retail-vendor-details` collapsible (Task 7)
- `@keyframes retail-shimmer` + skeleton classes (Task 8)
- `.retail-empty-state` + `.retail-sync-cta` (Task 9)
- `.retail-sparkline` (Task 10)
- `.retail-modal-tab-{daily,intraday}` + `.retail-intraday-chart` (modal 24h tab)

---

## Data Model Migration

No migration needed. SQLite starts fresh from the Docker rebuild. `retailPriceHistory` in localStorage will be empty after the field-name change — the background sync fills it on first page load. The 2 days of old JSON data in `data/retail/` are deleted from the data branch.

---

## Files to Create / Modify

### Modify (backend)
| File | Change |
|------|--------|
| `devops/retail-poller/price-extract.js` | Remove JSON file writes |
| `devops/retail-poller/api-export.js` | Add confidence scoring |
| `devops/retail-poller/run-local.sh` | Remove merge step, fix git add |
| `devops/retail-poller/run-fbp.sh` | Rewrite: SQLite-based gap-fill |

### Modify (frontend)
| File | Change |
|------|--------|
| `js/constants.js` | Add `RETAIL_API_BASE_URL`, `RETAIL_INTRADAY_KEY` |
| `js/retail.js` | New fetch path, data model, STAK-217 polish, intraday sparkline |
| `js/retail-view-modal.js` | 24h chart tab |
| `css/styles.css` | All STAK-217 + intraday CSS, additive |
| `index.html` | Updated `#retailEmptyState` markup (STAK-217 Task 9) |

### Delete (data branch)
- `data/retail/` folder — remove from data branch entirely

---

## Verification

1. Docker rebuild + manual run: `docker compose exec retail-poller /app/run-local.sh`
2. Check `data/api/` populated, `data/retail/` absent from data branch
3. Load app, open Settings → Market — cards show with new badges/sparklines within ~15 min
4. `console.log(retailIntradayData)` — should have `windows_24h` arrays
5. Click a coin card — modal has [Price History] / [24h Chart] tabs
6. 24h chart renders with time axis + median/low lines
7. History table shows `avg_median` / `avg_low` columns
8. Run existing Playwright smoke tests — all pass

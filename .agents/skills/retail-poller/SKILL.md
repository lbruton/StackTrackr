---
name: retail-poller
description: Use when working on the retail market price poller — debugging scraping failures, wrong prices, confidence scores, providers.json config, adding vendors or coins, understanding the data pipeline, or investigating what latest.json contains.
---

# StakTrakr Retail Price Poller

Reference guide for the retail market price polling system. Scrapes dealer websites, scores confidence, exports REST JSON served from the `data` branch.

---

## Architecture Overview

```
providers.json (data branch)
       ↓
price-extract.js  (Firecrawl scrape → SQLite)         ← live cron
       +
capture.js + extract-vision.js  (optional: screenshot → Gemini Vision)
       ↓                         ← NOT yet wired into live cron
api-export.js  (SQLite → data/api/ JSON files → data branch)
```

**Key constraint:** `providers.json` lives on the **`data` branch**, not `main` or `dev`.
Path on disk: `$DATA_REPO_PATH/data/retail/providers.json`
The poller never runs against the local `StakTrakr/data/` folder — that's spot price data only.

**Vision pipeline (as of 2026-02-20):** `capture.js` + `extract-vision.js` are now wired into `run-local.sh` as a non-fatal block, gated on `GEMINI_API_KEY` and `BROWSERLESS_URL`. Vision results write to per-coin JSON files at `DATA_DIR/retail/{slug}/{date}-vision.json`. `api-export.js` loads these files via `loadVisionData()` and merges confidence scores via `mergeVendorWithVision()` — pushing above the 60% single-source ceiling when Firecrawl and Vision agree. Screenshots go to `ARTIFACT_DIR` (default: `/tmp/retail-poller-screenshots/{date}`); vision JSON goes to `DATA_DIR/retail/{slug}/`. `merge-prices.js` is legacy and not called. `BROWSER_MODE=browserless` in `capture.js` connects via `chromium.connectOverCDP(BROWSERLESS_WS)`.

---

## File Map

| File | Purpose |
|------|---------|
| `devops/retail-poller/price-extract.js` | Primary scraper — Firecrawl + Playwright fallback → SQLite |
| `devops/retail-poller/capture.js` | Screenshot capture — `BROWSER_MODE=browserless` (browserless Docker via `connectOverCDP`, default for vision runs), `browserbase` (cloud CDP), or `local` (local Chromium `playwright.launch()`). `ARTIFACT_DIR` sets screenshot output dir. |
| `devops/retail-poller/extract-vision.js` | Gemini Vision price extraction from screenshots → per-coin JSON files (not SQLite) |
| `devops/retail-poller/merge-prices.js` | Confidence merger — combines Firecrawl + Vision JSON files |
| `devops/retail-poller/api-export.js` | SQLite → `data/api/` static JSON endpoints |
| `devops/retail-poller/db.js` | SQLite helper — schema, read/write functions |
| `devops/retail-poller/run-local.sh` | Full local run: extract → export → push |
| `devops/retail-poller/run-fbp.sh` | Gap-fill run: failed vendors → FindBullionPrices scrape |

---

## providers.json Structure

Located at `$DATA_REPO_PATH/data/retail/providers.json` on the **data branch**.

```json
{
  "coins": {
    "ase": {
      "name": "American Silver Eagle",
      "metal": "silver",
      "weight_oz": 1,
      "fbp_url": "https://findbullionprices.com/p/american-silver-eagle/",
      "providers": [
        {
          "id": "apmex",
          "enabled": true,
          "url": "https://www.apmex.com/product/..."
        },
        {
          "id": "sdbullion",
          "enabled": true,
          "url": "https://sdbullion.com/..."
        }
      ]
    }
  }
}
```

**Coin fields:** `name`, `metal` (`silver`/`gold`/`platinum`/`palladium`), `weight_oz`, `fbp_url` (FindBullionPrices fallback URL)

**Provider fields:** `id` (matches `FBP_DEALER_NAME_MAP` key in price-extract.js), `enabled`, `url`

To add a new vendor: add to `FBP_DEALER_NAME_MAP` in `price-extract.js` AND add to each coin's `providers[]` in `providers.json`.

---

## Price Extraction Logic

### Extraction Strategy (price-extract.js)

Two provider groups with different strategies:

**`USES_AS_LOW_AS` providers** (sdbullion, jmbullion, monumentmetals):
1. Scan all `"As Low As $XX.XX"` matches → filter by weight-adjusted metal range → take **minimum**
2. Fallback: table cell prices

**All other providers** (apmex, etc.):
1. Pricing table cells first (avoids picking up related-product "As Low As")
2. Fallback: "As Low As" scan

**Metal price ranges** (per oz, used to filter out accessories/spot tickers):
```
silver:    $40–200/oz
gold:      $1,500–15,000/oz
platinum:  $500–6,000/oz
palladium: $300–6,000/oz
```
Range is multiplied by `weight_oz` for multi-oz products (e.g. 10oz bar = $400–2000).

### SDB Fix Applied (2026-02-20)

SDB pages show "As Low As" only in add-on accessories and carousel sections — NOT for the main product. The main product price is in a pricing table.

**Root cause (was):** `sdbullion` was in `USES_AS_LOW_AS` → `Math.min()` picked carousel/add-on prices.
**Fix applied:**
1. `sdbullion` removed from `USES_AS_LOW_AS` → now uses table-first strategy (same as APMEX).
2. `preprocessMarkdown(markdown, providerId)` added — truncates SDB markdown at `**Add on Items**` / `Customers Also Purchased` before any price extraction. Covers both Firecrawl markdown and Playwright HTML variants.

### Playwright Fallback

If Firecrawl returns no price, `scrapeWithPlaywright()` tries a browserless remote browser (`BROWSERLESS_URL` env var). `SLOW_PROVIDERS = {jmbullion, herobullion, summitmetals}` get an extra 4s wait.

### FBP Gap-Fill

After primary scrapes, any coin with failures scrapes `fbp_url` (FindBullionPrices comparison table). `extractFbpPrices()` parses FBP table rows, maps dealer names via `FBP_DEALER_NAME_MAP`, writes as `source: "fbp"` to SQLite.

`run-fbp.sh` (the PM cron at 3pm ET) runs `PATCH_GAPS=1 node price-extract.js` to fill only today's gaps.

---

## SQLite Database

**Location:** `$DATA_REPO_PATH/prices.db` (one level above `data/`)

**Table:** `price_snapshots`

| Column | Type | Notes |
|--------|------|-------|
| `scraped_at` | TEXT | ISO8601 UTC timestamp of actual scrape |
| `window_start` | TEXT | 15-min floor (e.g. `2026-02-20T14:15:00Z`) |
| `coin_slug` | TEXT | Matches providers.json key (e.g. `ase`) |
| `vendor` | TEXT | Provider id (e.g. `apmex`) |
| `price` | REAL | null if scrape failed |
| `source` | TEXT | `firecrawl` \| `playwright` \| `fbp` |
| `confidence` | INTEGER | 0–100, written by api-export.js after scoring |
| `is_failed` | INTEGER | 1 if price is null |

**Window floor:** every scrape is bucketed to the nearest 15-min UTC floor. The 24h history chart uses 96 windows.

---

## Confidence Scoring

### api-export.js (live scoring per window)

`scoreVendorPrice(price, windowMedian, prevMedian)`:

| Condition | Score delta |
|-----------|-------------|
| Base (single source) | +50 |
| Within 3% of window median | +10 |
| >8% from window median | -15 |
| >10% day-over-day from prev median | -20 |

**Result:** 60% = no outlier (50+10), 50% = mild outlier (50), 35% = strong outlier (50-15), 15% = outlier AND large day-over-day shift (50-15-20).

### merge-prices.js (when both Firecrawl + Vision are available)

`scorePrice({firecrawlPrice, visionPrice, visionConfidence, prevPrice, medianPrice})`:

| Condition | Score delta |
|-----------|-------------|
| Both methods within 2% | +40 |
| Both within 5% | +20 |
| Methods disagree >5% | +5 |
| Single method only | +50 |
| Vision confidence high/medium/low | +15/+5/-10 |
| Within 3% of today's median | +10 |
| >8% from today's median | -15 |
| >10% day-over-day | -20 |

High confidence threshold: ≥70 pts.

---

## API Output Files

Written to `$DATA_REPO_PATH/data/api/` and served from the `data` branch.

| File | Contents |
|------|---------|
| `data/api/latest.json` | All coins, current window: `median_price`, `lowest_price`, `vendor_count` |
| `data/api/{slug}/latest.json` | Single coin: vendors map with price + confidence, 24h windows series |
| `data/api/{slug}/history-7d.json` | Daily aggregates, 7 days |
| `data/api/{slug}/history-30d.json` | Daily aggregates, 30 days |
| `data/api/manifest.json` | Coin list, last updated, window count |

The StakTrakr app fetches `data/api/{slug}/latest.json` in `retail-view-modal.js` and `data/api/latest.json` in `retail.js`.

---

## Environment Variables

| Var | Used by | Notes |
|-----|---------|-------|
| `DATA_REPO_PATH` | run-local.sh, run-fbp.sh | Path to git checkout of data branch |
| `DATA_DIR` | all scripts | `$DATA_REPO_PATH/data` |
| `FIRECRAWL_API_KEY` | price-extract.js | Cloud Firecrawl; omit for self-hosted |
| `FIRECRAWL_BASE_URL` | price-extract.js | Self-hosted: `http://localhost:3002`; default: cloud |
| `BROWSERLESS_URL` | price-extract.js | `ws://host.docker.internal:3000/...` for Playwright fallback |
| `BROWSER_MODE` | capture.js | `browserbase` (cloud, default) or `local` (local Chromium via `playwright.launch()`) |
| `BROWSERLESS_URL` | price-extract.js | `ws://host.docker.internal:3000/chromium/playwright?token=local_dev_token` — Playwright fallback in price-extract; **capture.js local mode does NOT use this**, it calls `playwright.launch()` directly (gap: capture.js needs modification to connect via WS for browserless Docker support) |
| `BROWSERBASE_API_KEY` | capture.js | Cloud Browserbase only — not needed when using browserless Docker |
| `BROWSERBASE_PROJECT_ID` | capture.js | Cloud Browserbase only |
| `GEMINI_API_KEY` | extract-vision.js | Google AI Studio key for vision extraction |
| `COINS` | all scripts | Comma-separated slug filter (default: all) |
| `PROVIDERS` | capture.js | Comma-separated provider filter |
| `DRY_RUN` | all scripts | `1` = skip writes |
| `PATCH_GAPS` | price-extract.js | `1` = gap-fill mode (FBP only for failed vendors) |

---

## Running Locally

```bash
cd devops/retail-poller

# Full run against self-hosted Firecrawl (port 3002)
DATA_REPO_PATH=/path/to/data-branch-checkout \
FIRECRAWL_BASE_URL=http://localhost:3002 \
node price-extract.js

# Dry-run single coin
COINS=ase DRY_RUN=1 DATA_DIR=/path/to/data-branch/data node price-extract.js

# Export API JSON from existing SQLite
DATA_DIR=/path/to/data-branch/data node api-export.js

# Gap-fill only (FBP scrape for failed vendors)
PATCH_GAPS=1 DATA_DIR=/path/to/data-branch/data node price-extract.js
```

---

## Common Debugging Patterns

**Low confidence on SDB prices:** Check if SDB page shows fractional coin "As Low As" values — the `Math.min()` on all in-range matches picks the fractional price. Compare the extracted price vs the coin's `weight_oz × spot` estimate.

**60% confidence (not 100%):** Single-source only (no Vision). 50 base + 10 (within 3% of median) = 60. This is the ceiling without Vision data. Normal for Firecrawl-only runs.

**15% confidence:** Vendor price is far from median AND large day-over-day change. Usually wrong extraction. Check FBP or the actual URL.

**price = null:** Firecrawl got a page but no parseable price, AND Playwright fallback also failed. Check if the URL is still valid and page structure changed.

**FBP fallback triggered:** Check `source: "fbp"` in SQLite — means primary scrape failed. FBP prices are wire/ACH prices (lowest available).

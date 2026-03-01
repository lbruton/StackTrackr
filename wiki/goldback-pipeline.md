---
title: Goldback Pipeline
category: infrastructure
owner: staktrakr-api
lastUpdated: v3.33.19
date: 2026-03-01
sourceFiles: []
relatedPages:
  - rest-api-reference.md
  - retail-pipeline.md
  - turso-schema.md
  - providers.md
---

# Goldback Pipeline

> **Last verified:** 2026-02-25 — audited from live Fly.io container + PR `StakTrakrApi#3` (STAK-335 per-state scaffolding).
> **56 per-state slugs** (8 states × 7 denominations) + **6 deprecated legacy slugs**.

---

## Overview

Goldback pricing flows through **two paths**:

1. **Retail pipeline** — Per-state Goldback coins (`goldback-{state}-g{denom}`) are tracked in `providers.json`, scraped from vendor product pages via `run-local.sh` cron → Turso → `api-export.js` → per-coin JSON endpoints.

2. **Denomination spot JSON** — `goldback-scraper.js` (invoked by `run-goldback.sh`) scrapes the official G1 rate from `goldback.com/exchange-rates/` and writes `data/api/goldback-spot.json` with the G1 USD price and denomination multipliers. `api-export.js` does not write this file.

A separate **goldback cron** (`run-goldback.sh`) runs hourly at :01 to scrape the official G1 exchange rate from `goldback.com/exchange-rates/` via Firecrawl. It writes `goldback-spot.json` and `goldback-YYYY.json`, then skips subsequent runs if today's price is already captured.

---

## States

8 states currently issue Goldbacks. Each state has 7 denominations in `providers.json`:

| State | Slug prefix | Notes |
|-------|-------------|-------|
| Utah | `goldback-utah-` | First issuer (2019) |
| Nevada | `goldback-nevada-` | |
| Wyoming | `goldback-wyoming-` | |
| New Hampshire | `goldback-new-hampshire-` | |
| South Dakota | `goldback-south-dakota-` | |
| Arizona | `goldback-arizona-` | |
| Oklahoma | `goldback-oklahoma-` | |
| Washington DC | `goldback-dc-` | |

---

## Denominations

7 denominations per state:

| Slug suffix | Denomination | Gold content |
|-------------|-------------|-------------|
| `ghalf` | ½ Goldback | 1/2000 oz |
| `g1` | 1 Goldback | 1/1000 oz |
| `g2` | 2 Goldback | 1/500 oz |
| `g5` | 5 Goldback | 1/200 oz |
| `g10` | 10 Goldback | 1/100 oz |
| `g25` | 25 Goldback | 1/40 oz |
| `g50` | 50 Goldback | 1/20 oz |

**Full slug format:** `goldback-{state}-g{denom}` — e.g., `goldback-oklahoma-g1`, `goldback-utah-ghalf`, `goldback-dc-g50`

---

## Migration from Legacy Slugs (STAK-335)

The original `goldback-g{N}` slugs silently mixed states across vendors (APMEX→Wyoming, Hero→Utah, SD→Arizona, JM→Nevada). PR `StakTrakrApi#3` replaces them with per-state slugs.

### Deprecated slugs (kept for backward compat)

| Legacy slug | Status | Notes |
|-------------|--------|-------|
| `goldback-g1` | `deprecated: true` | Exchange rate scraping still runs on this slug |
| `goldback-g2` | `deprecated: true` | |
| `goldback-g5` | `deprecated: true` | |
| `goldback-g10` | `deprecated: true` | |
| `goldback-g25` | `deprecated: true` | |
| `goldback-g50` | `deprecated: true` | |

**Exchange rate scraping** stays on deprecated slugs only — 6 hits/cycle, not 62. The deprecated slugs feed `goldback-spot.json` denomination generation.

**Frontend migration:** The frontend currently references `goldback-g{N}` endpoints. These continue to work until the frontend is updated to use per-state slugs.

---

## Enabling a State/Vendor

All 56 per-state slugs start with `url: null` and `enabled: false`. To enable a vendor for a state denomination:

1. Find the slug in `providers.json` (e.g., `goldback-oklahoma-g1`)
2. Set the vendor's `url` to the product page URL
3. Set `enabled: true`

Changes auto-sync next cycle — no redeploy needed.

---

## providers.json Structure

**56 per-state entries** (all disabled initially) + **6 deprecated legacy entries**.

- **Metal:** `goldback`, **Weight:** varies by denomination
- Listed in `SLOW_PROVIDERS` — JS-rendered pages, uses `waitFor: 6000`
- Price range validation: `$5–$25` per G1 (via `METAL_PRICE_RANGE_PER_OZ` in `price-extract.js`)

Vendors that previously mixed states under the old slugs:

| Vendor | State they were actually scraping |
|--------|-----------------------------------|
| `apmex` | Wyoming |
| `herobullion` | Utah |
| `sdbullion` | Arizona |
| `jmbullion` | Nevada |
| `goldback` (official rate) | N/A — exchange rate, not state-specific |

---

## Denomination Spot JSON (goldback-scraper.js)

The standalone `goldback-scraper.js` (invoked hourly at :01 by `run-goldback.sh`) scrapes the G1 USD rate from `goldback.com/exchange-rates/` via Firecrawl and writes `data/api/goldback-spot.json` directly. `api-export.js` does not produce this file:

```json
{
  "date": "2026-02-25",
  "scraped_at": "2026-02-25T19:08:01.756Z",
  "g1_usd": 10.43,
  "denominations": {
    "g1": 10.43,
    "g5": 52.15,
    "g10": 104.30,
    "g25": 260.75,
    "g50": 521.50
  },
  "source": "goldback.com",
  "confidence": "high"
}
```

All denomination prices are computed as `G1 × multiplier`, rounded to 2 decimal places.

---

## API Endpoints

### Currently Published

| Endpoint | Description | Updated |
|----------|-------------|---------|
| `data/api/goldback-spot.json` | G1 USD rate + denomination multipliers | Hourly at :01 (once daily, skips if captured) |
| `data/goldback-YYYY.json` | Rolling annual history log (appended daily by `run-goldback.sh`) | Hourly at :01 |

`goldback-spot.json` is the **only** currently published Goldback endpoint. The committed API manifest (`manifest.json`) contains 11 non-Goldback coin slugs and no Goldback slugs.

### Planned / Future

**Legacy per-denomination endpoints** (not yet in committed manifest):

| Endpoint | Description |
|----------|-------------|
| `data/api/goldback-g1/latest.json` | Legacy G1 mixed-state vendor prices |
| `data/api/goldback-g{N}/latest.json` | Legacy denomination endpoints (deprecated) |

**Per-state endpoints** (not yet in committed manifest — populated as vendors are enabled):

| Endpoint Pattern | Example | Description |
|------------------|---------|-------------|
| `data/api/goldback-{state}-g{denom}/latest.json` | `goldback-oklahoma-g1/latest.json` | Per-vendor prices for a state+denomination |
| `data/api/goldback-{state}-g{denom}/history-7d.json` | `goldback-utah-g5/history-7d.json` | Daily aggregates, last 7 days |
| `data/api/goldback-{state}-g{denom}/history-30d.json` | `goldback-dc-g50/history-30d.json` | Daily aggregates, last 30 days |

**Note:** Per-state endpoints will populate once vendor URLs are enabled in `providers.json` and the slugs are added to the manifest.

See [rest-api-reference.md](rest-api-reference.md) for full endpoint schemas.

---

## Standalone Goldback Scraper (hourly cron)

`run-goldback.sh` and `goldback-scraper.js` are active on the container, running hourly at :01 via cron. The script scrapes `goldback.com/exchange-rates/` via Firecrawl and writes directly to `goldback-spot.json` and `goldback-YYYY.json`. An early-exit check skips the Firecrawl scrape if today's price already exists. The retail pipeline also scrapes per-state goldback vendor prices independently.

---

## Diagnosing Issues

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `goldback-spot.json` > 25h stale | `run-goldback.sh` failing or goldback.com down | Check `fly logs --app staktrakr \| grep goldback` |
| G1 price null in manifest | Firecrawl timeout on JS-rendered page | goldback.com is in `SLOW_PROVIDERS` — verify `waitFor` is sufficient |
| Denomination prices wrong | G1 base rate incorrect | Check `goldback-spot.json` G1 value; compare to goldback.com/exchange-rates/ |
| Per-denomination retail prices differ from computed spot | Normal — retail vendor prices ≠ official exchange rate | `goldback-spot.json` uses vendor G1 rate × multiplier; individual `goldback-gN` endpoints track actual retail prices |

---

## Related Pages

- [REST API Reference](rest-api-reference.md) — full goldback endpoint schemas
- [Retail Pipeline](retail-pipeline.md) — how goldback coins flow through the scrape pipeline
- [Turso Schema](turso-schema.md) — database tables
- [providers.json](providers.md) — goldback vendor URLs

---
title: REST API Reference
category: infrastructure
owner: staktrakr-api
lastUpdated: v3.33.18
date: 2026-02-25
sourceFiles: []
relatedPages:
  - architecture-overview.md
  - retail-pipeline.md
  - spot-pipeline.md
  - goldback-pipeline.md
  - api-consumption.md
  - turso-schema.md
---

# REST API Reference

> **Last verified:** 2026-02-25 — audited from live Fly.io container source code
> **Base URL:** `https://api.staktrakr.com`
> **Fallback URL:** `https://api2.staktrakr.com`

---

## Overview

All endpoints are static JSON files served via GitHub Pages from the `api` branch of `lbruton/StakTrakrApi`. There is no dynamic server — `serve.js` on Fly.io port 8080 is a redundancy proxy serving the same files.

**Update cadence:** Every 15 minutes via `run-publish.sh` (cron `8,23,38,53 * * * *`).

---

## Global Endpoints

| Endpoint | Description | Updated |
|----------|-------------|---------|
| `data/api/manifest.json` | Index: coin list, latest window, endpoint templates | Every 15 min |
| `data/api/latest.json` | All coins' current median/lowest prices | Every 15 min |
| `data/api/providers.json` | Vendor → product URL mapping per coin (auto-generated from Turso — see [Provider Database](provider-database.md)) | Every 15 min |
| `data/api/goldback-spot.json` | Goldback G1 rate + denomination multipliers | Every 15 min |

### manifest.json Schema

```json
{
  "generated_at": "2026-02-25T19:08:01.756Z",
  "latest_window": "2026-02-25T19:00:00Z",
  "window_count": 96,
  "coin_count": 17,
  "coins": ["age", "ape", "ase", "..."],
  "endpoints": {
    "latest": "api/latest.json",
    "slug_latest": "api/{slug}/latest.json",
    "history_7d": "api/{slug}/history-7d.json",
    "history_30d": "api/{slug}/history-30d.json",
    "providers": "api/providers.json"
  }
}
```

### latest.json Schema

```json
{
  "window_start": "2026-02-25T19:00:00Z",
  "generated_at": "2026-02-25T19:08:01.756Z",
  "coin_count": 17,
  "coins": {
    "ase": {
      "window_start": "2026-02-25T19:00:00Z",
      "median_price": 36.42,
      "lowest_price": 35.19,
      "vendor_count": 7
    }
  }
}
```

### goldback-spot.json Schema

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

---

## Per-Coin Endpoints

**17 bullion coins + 56 per-state Goldback slugs + 6 deprecated Goldback slugs** as of 2026-02-25 (STAK-335). Per-state Goldback endpoints populate only when vendors are enabled in `providers.json`. Each coin has three endpoint files:

| Endpoint Pattern | Description | Updated |
|------------------|-------------|---------|
| `data/api/{slug}/latest.json` | Per-vendor prices, confidence, availability, 24h time series (96 windows) | Every 15 min |
| `data/api/{slug}/history-7d.json` | Daily aggregates, last 7 days | Every 15 min |
| `data/api/{slug}/history-30d.json` | Daily aggregates, last 30 days | Every 15 min |

### Coin Slugs

**Silver (1 oz):** `ase`, `maple-silver`, `britannia-silver`, `krugerrand-silver`, `generic-silver-round`
**Silver (10 oz):** `generic-silver-bar-10oz`
**Gold (1 oz):** `age`, `ape`, `buffalo`, `maple-gold`, `krugerrand-gold`
**Goldback (deprecated — backward compat):** `goldback-g1`, `goldback-g2`, `goldback-g5`, `goldback-g10`, `goldback-g25`, `goldback-g50`
**Goldback (per-state — STAK-335):** `goldback-{state}-g{denom}` where state is one of `utah`, `nevada`, `wyoming`, `new-hampshire`, `south-dakota`, `arizona`, `oklahoma`, `dc` and denom is `ghalf`, `g1`, `g2`, `g5`, `g10`, `g25`, `g50` (56 slugs total). See [goldback-pipeline.md](goldback-pipeline.md) for the full matrix.

### Per-Coin latest.json Schema

```json
{
  "slug": "ase",
  "window_start": "2026-02-25T19:00:00Z",
  "median_price": 36.42,
  "lowest_price": 35.19,
  "vendors": {
    "jmbullion": {
      "price": 35.19,
      "confidence": 99,
      "source": "firecrawl+vision",
      "inStock": true
    },
    "apmex": {
      "price": 36.99,
      "confidence": 80,
      "source": "firecrawl",
      "inStock": true
    }
  },
  "availability_by_site": {
    "jmbullion": true,
    "apmex": true
  },
  "last_known_price_by_site": {},
  "last_available_date_by_site": {},
  "windows_24h": [
    {
      "window": "2026-02-24T19:15:00Z",
      "median": 36.50,
      "low": 35.20,
      "vendors": { "jmbullion": 35.20, "apmex": 37.01 }
    }
  ]
}
```

**Vendor source values:**

| Source | Meaning |
|--------|---------|
| `firecrawl+vision` | Both Firecrawl and Gemini Vision agreed (≤3% diff) — 99 confidence |
| `firecrawl` | Firecrawl text extraction only |
| `vision` | Gemini Vision screenshot extraction only |
| `turso_last_known` | T4 fallback — most recent in-stock price from Turso history (includes `stale: true`) |

**Confidence tiers:**

| Range | Meaning |
|-------|---------|
| 90–99 | Firecrawl + Vision cross-validated |
| 60–89 | Single source, agrees with median |
| 30–59 | Single source, moderate deviation |
| 0–29 | Outlier or disagreement |

---

## Spot Price Endpoints

| Endpoint Pattern | Description | Updated |
|------------------|-------------|---------|
| `data/hourly/YYYY/MM/DD/HH.json` | Hourly spot prices (4 metals) — overwritten each poll | Every 15 min |
| `data/15min/YYYY/MM/DD/HHMM.json` | Immutable 15-min spot snapshots | Per poll (immutable) |
| `data/spot-history-YYYY.json` | Annual daily spot history (noon UTC seed) | Once daily |

### Hourly File Schema

```json
[
  {
    "spot": 2945.12,
    "metal": "Gold",
    "source": "hourly",
    "provider": "StakTrakr",
    "timestamp": "2026-02-25 19:05:00"
  },
  {
    "spot": 33.41,
    "metal": "Silver",
    "source": "hourly",
    "provider": "StakTrakr",
    "timestamp": "2026-02-25 19:05:00"
  }
]
```

**Metals:** Gold (XAU), Silver (XAG), Platinum (XPT), Palladium (XPD)
**Data source:** MetalPriceAPI (`metalpriceapi.com`)
**Rate conversion:** `1 / rate` = USD per troy oz (API returns units-of-metal-per-USD)

---

## Goldback-Specific Endpoints

### Global

| Endpoint | Description | Updated |
|----------|-------------|---------|
| `data/api/goldback-spot.json` | G1 USD rate + all denomination multipliers | Hourly :01 (skips if today's entry exists) |
| `data/goldback-YYYY.json` | Rolling annual history log (newest first) | Hourly :01 (skips if today's entry exists) |

### Legacy (deprecated — backward compat)

| Endpoint | Description | Updated |
|----------|-------------|---------|
| `data/api/goldback-g1/latest.json` | Mixed-state G1 vendor prices | Every 15 min |
| `data/api/goldback-g{N}/latest.json` | Mixed-state denomination prices | Every 15 min |

### Per-State (STAK-335 — populates as vendors are enabled)

| Endpoint Pattern | Example | Description |
|------------------|---------|-------------|
| `data/api/goldback-{state}-g{denom}/latest.json` | `goldback-oklahoma-g1/latest.json` | Per-vendor prices for a specific state + denomination |
| `data/api/goldback-{state}-g{denom}/history-7d.json` | `goldback-utah-ghalf/history-7d.json` | 7-day daily aggregates |
| `data/api/goldback-{state}-g{denom}/history-30d.json` | `goldback-dc-g50/history-30d.json` | 30-day daily aggregates |

**8 states × 7 denominations = 56 per-state slugs**, each with 3 endpoint files = **168 potential endpoint files** (only populated when vendors are enabled).

**Note:** `goldback-spot.json` denominations are computed from the deprecated `goldback-g1` vendor rate (`G1 × multiplier`). Per-state endpoints track actual retail vendor prices for physical Goldback notes from specific states — these may differ from the computed denomination prices and from each other across states.

---

## Vendor Reference

7 primary vendors tracked across all bullion coins:

| Vendor ID | Name | Notes |
|-----------|------|-------|
| `jmbullion` | JM Bullion | JS-heavy (Next.js), 10s render wait |
| `apmex` | APMEX | Standard extraction |
| `sdbullion` | SD Bullion | Standard extraction |
| `monumentmetals` | Monument Metals | React Native Web SPA, 7s render wait |
| `herobullion` | Hero Bullion | 6s render wait |
| `bullionexchanges` | Bullion Exchanges | React/Magento SPA, 8s render wait |
| `summitmetals` | Summit Metals | ASE only |

Goldback-specific vendors: `goldback` (official exchange rate)

---

## HTTP Server Details

`serve.js` runs on Fly.io port 8080 as a redundancy endpoint:

- **CORS:** `Access-Control-Allow-Origin: *`
- **Cache:** `Cache-Control: public, max-age=300` (5 minutes)
- **Methods:** GET and OPTIONS only
- **Security:** Directory traversal (`..`) rejected
- **Content types:** `.json` → `application/json`, `.db` → `application/x-sqlite3`

---

## Best Practices Audit

**Strengths:**
- Static file serving — zero dynamic attack surface
- Proper CORS configuration with preflight handling
- Cache-Control headers appropriate for 15-min update cycle
- Turso as single source of truth for retail data
- Dual-source verification (Firecrawl + Vision) with confidence scoring

**Recommendations:**
1. Add `/_health` endpoint returning `{"status":"ok","generated_at":"..."}` for Fly.io health checks
2. Add `Last-Modified` header from `stat.mtime` for conditional caching (`If-Modified-Since`)
3. Consider adding `schema_version` to `manifest.json` for client-side breaking change detection

---

## Related Pages

- [Architecture Overview](architecture-overview.md) — system diagram, repo boundaries
- [Retail Pipeline](retail-pipeline.md) — scraping, Turso, confidence scoring
- [Spot Pipeline](spot-pipeline.md) — MetalPriceAPI, hourly files
- [Goldback Pipeline](goldback-pipeline.md) — denomination generation, legacy scraper
- [API Consumption](api-consumption.md) — frontend fetch patterns and fallback
- [Turso Schema](turso-schema.md) — database tables and indexes

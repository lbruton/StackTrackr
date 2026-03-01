---
title: Turso Database Schema
category: infrastructure
owner: staktrakr-api
lastUpdated: v3.33.19
date: 2026-03-01
sourceFiles: []
relatedPages:
  - provider-database.md
  - retail-pipeline.md
  - rest-api-reference.md
  - architecture-overview.md
  - spot-pipeline.md
---

# Turso Database Schema

> **Last verified:** 2026-02-25 — audited from live Fly.io container `turso-client.js` and `db.js`
> **Database:** `staktrakrapi` on Turso (libSQL cloud)
> **Client library:** `@libsql/client`

---

## Overview

Turso is the **single source of truth** for both retail and spot price data. Both pollers (Fly.io and Home LXC) write to the same database. `api-export.js` reads from Turso at publish time and generates static JSON files.

---

## Tables

### `price_snapshots`

Primary data table. One row per scrape attempt per coin per vendor.

```sql
CREATE TABLE IF NOT EXISTS price_snapshots (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  scraped_at   TEXT NOT NULL,       -- ISO 8601 UTC timestamp of scrape
  window_start TEXT NOT NULL,       -- 15-min floor bucket (e.g. "2026-02-25T14:15:00Z")
  coin_slug    TEXT NOT NULL,       -- e.g. "ase", "age", "goldback-g1"
  vendor       TEXT NOT NULL,       -- e.g. "jmbullion", "apmex", "goldback"
  price        REAL,                -- USD price (null if scrape failed or OOS)
  source       TEXT NOT NULL,       -- "firecrawl", "playwright", "gemini-vision", "fbp"
  confidence   INTEGER,             -- 0-100 confidence score (set by merge/export)
  is_failed    INTEGER NOT NULL DEFAULT 0,  -- 1 if scrape threw an error
  in_stock     INTEGER NOT NULL DEFAULT 1   -- 0 if OOS detected
);
```

**Indexes:**

```sql
CREATE INDEX idx_coin_window ON price_snapshots(coin_slug, window_start);
CREATE INDEX idx_window ON price_snapshots(window_start);
CREATE INDEX idx_coin_date ON price_snapshots(coin_slug, substr(window_start, 1, 10));
CREATE INDEX idx_coin_vendor_stock ON price_snapshots(coin_slug, vendor, in_stock, scraped_at DESC);
```

**Source values:**

| Source | Writer | Description |
|--------|--------|-------------|
| `firecrawl` | `price-extract.js` | Firecrawl markdown → regex price extraction |
| `playwright` | `price-extract.js` | Playwright DOM fallback (when Firecrawl fails) |
| `gemini-vision` | `extract-vision.js` | Gemini 2.5 Flash screenshot analysis |
| `fbp` | `price-extract.js` (PATCH_GAPS mode) | FindBullionPrices gap-fill scrape |

**Window start calculation:**

```javascript
// 15-minute floor: 14:22:45 → "2026-02-20T14:15:00Z"
function windowFloor(ts = new Date()) {
  const d = new Date(ts);
  d.setUTCMinutes(Math.floor(d.getUTCMinutes() / 15) * 15, 0, 0);
  return d.toISOString().replace(".000Z", "Z");
}
```

---

### `poller_runs`

One row per scrape run. Written by each poller instance for monitoring and diagnostics.

```sql
CREATE TABLE IF NOT EXISTS poller_runs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id       TEXT NOT NULL UNIQUE, -- "{pollerId}-{startedAt}" (deduped)
  poller_id    TEXT NOT NULL,        -- "api" (Fly.io) or "home" (LXC)
  started_at   TEXT NOT NULL,        -- ISO 8601 UTC
  finished_at  TEXT,                 -- ISO 8601 UTC (null while running)
  status       TEXT NOT NULL DEFAULT 'running', -- "running", "ok", "error"
  total        INTEGER,              -- total SKUs attempted
  captured     INTEGER,              -- successful price extractions
  failures     INTEGER,              -- failed extractions
  fbp_filled   INTEGER,              -- gaps filled by FBP fallback
  error        TEXT                  -- error message if status = "error"
);
```

**Index:**

```sql
CREATE INDEX idx_runs_poller_started ON poller_runs(poller_id, started_at DESC);
```

---

### `provider_failures`

One row per failed scrape attempt. Populated by `recordFailure()` in `db.js` when a scrape returns no price for an in-stock vendor.

```sql
CREATE TABLE IF NOT EXISTS provider_failures (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  coin_slug  TEXT NOT NULL,
  vendor_id  TEXT NOT NULL,
  url        TEXT,
  error      TEXT,
  failed_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Indexes:**

```sql
CREATE INDEX IF NOT EXISTS idx_pf_coin_vendor ON provider_failures(coin_slug, vendor_id);
CREATE INDEX IF NOT EXISTS idx_pf_failed_at ON provider_failures(failed_at);
```

---

### `spot_prices`

One row per metal per 15-minute floor. Written by `spot-extract.js` via `insertSpotPrices()` in `db.js`. Read by `api-export.js` for spot JSON generation.

```sql
CREATE TABLE IF NOT EXISTS spot_prices (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  metal           TEXT NOT NULL,           -- "gold", "silver", "platinum", "palladium"
  spot            REAL NOT NULL,           -- USD price per troy oz
  source          TEXT NOT NULL DEFAULT 'metalprice-api',
  poller_id       TEXT NOT NULL,           -- "fly-spot" or "home-spot"
  timestamp       TEXT NOT NULL,           -- ISO 8601 UTC timestamp of poll
  timestamp_floor TEXT NOT NULL,           -- 15-min floor (e.g. "2026-02-25T14:15:00Z")
  scraped_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(metal, timestamp_floor)
);
```

**Indexes:**

```sql
CREATE INDEX IF NOT EXISTS idx_spot_metal_floor ON spot_prices(metal, timestamp_floor DESC);
CREATE INDEX IF NOT EXISTS idx_spot_floor ON spot_prices(timestamp_floor DESC);
```

---

## Key Query Patterns

### `readLatestPerVendor(db, coinSlug, lookbackHours=2)`

The dual-poller merge function. Returns the **most recent non-failed row per vendor** within the lookback window. This is how data from both pollers (Fly.io at `:15/:45` and Home at `:00/:30`) gets merged into a single vendor map at export time.

```sql
SELECT ps.*
FROM price_snapshots ps
INNER JOIN (
  SELECT vendor, MAX(scraped_at) AS max_scraped
  FROM price_snapshots
  WHERE coin_slug = ? AND scraped_at >= ? AND is_failed = 0 AND price IS NOT NULL
  GROUP BY vendor
) latest ON ps.vendor = latest.vendor AND ps.scraped_at = latest.max_scraped
WHERE ps.coin_slug = ? AND ps.is_failed = 0 AND ps.price IS NOT NULL
```

### `readRecentWindows(db, coinSlug, windowCount=96)`

Returns raw rows for the last 96 windows (24 hours of 15-min windows). Used by `api-export.js` to build the `windows_24h` time series in per-coin `latest.json`.

### `readDailyAggregates(db, coinSlug, days=30)`

Returns daily per-vendor aggregates grouped by date. Used for `history-7d.json` and `history-30d.json`.

### `getLastKnownPrice(db, coinSlug, vendorId)`

Returns the most recent in-stock price for a coin+vendor. Used by T4 fallback in `api-export.js` when current scrape has no data.

---

## Data Volume Estimates

**Current (pre-STAK-335):**
- **11 coins × 7 vendors × 4 polls/hour × 24 hours** ≈ 7,392 rows/day (Fly.io poller)
- **11 coins × 7 vendors × 2 polls/hour × 24 hours** ≈ 3,696 rows/day (Home poller)
- **6 goldback slugs × 4 vendors × 4 polls/hour × 24 hours** ≈ 2,304 rows/day
- **Total:** ~13,000–15,000 rows/day across both pollers

**After STAK-335 (all per-state Goldback vendors enabled):**
- **56 goldback slugs × N vendors × 4 polls/hour × 24 hours** — volume scales with number of enabled vendors per slug
- Worst case (all 56 slugs × 7 vendors): +37,632 rows/day from Fly.io alone
- **Likely reality:** Most per-state slugs will have 1–3 vendors initially, growing incrementally
- Disabled slugs (`url: null`) add **zero** scrape load and **zero** Turso rows
- **30-day window for api-export:** ~400,000–450,000 rows queried at export time

---

## Connection Details

```javascript
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,     // libsql://staktrakrapi-...turso.io
  authToken: process.env.TURSO_AUTH_TOKEN,  // Fly secret
});
```

Both `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are Fly.io secrets. The Home LXC has its own copy in `/opt/poller/.env`. See [secrets.md](secrets.md).

---

## Provider Tables (STAK-348)

Added 2026-02-25. Provider configuration data (which vendors to scrape, URLs, coin metadata) — previously stored in `providers.json`.

### `provider_coins`

```sql
CREATE TABLE IF NOT EXISTS provider_coins (
  slug       TEXT PRIMARY KEY,
  metal      TEXT NOT NULL,
  name       TEXT NOT NULL,
  weight_oz  REAL NOT NULL,
  fbp_url    TEXT,
  notes      TEXT,
  enabled    INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `provider_vendors`

```sql
CREATE TABLE IF NOT EXISTS provider_vendors (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  coin_slug  TEXT NOT NULL REFERENCES provider_coins(slug),
  vendor_id  TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  url        TEXT,
  enabled    INTEGER NOT NULL DEFAULT 1,
  selector   TEXT,
  hints      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(coin_slug, vendor_id)
);
```

**Indexes:**

```sql
CREATE INDEX IF NOT EXISTS idx_pv_coin ON provider_vendors(coin_slug);
CREATE INDEX IF NOT EXISTS idx_pv_vendor ON provider_vendors(vendor_id);
CREATE INDEX IF NOT EXISTS idx_pv_enabled ON provider_vendors(coin_slug, enabled);
```

See [Provider Database](provider-database.md) for the full `provider-db.js` API and CRUD details.

---

## Related Pages

- [Provider Database](provider-database.md) — provider CRUD, migration, dashboard
- [Retail Pipeline](retail-pipeline.md) — how data flows into Turso
- [REST API Reference](rest-api-reference.md) — how data flows out of Turso to JSON
- [Architecture Overview](architecture-overview.md) — system-level view
- [Spot Pipeline](spot-pipeline.md) — spot data flows through Turso via `spot_prices` table

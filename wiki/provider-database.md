---
title: Provider Database (Turso)
category: infrastructure
owner: staktrakr-api
lastUpdated: v3.33.18
date: 2026-02-26
sourceFiles: []
relatedPages:
  - turso-schema.md
  - providers.md
  - fly-container.md
  - home-poller.md
  - health.md
---

# Provider Database (Turso)

> **Last verified:** 2026-02-26 — bulk vendor operations + goldback cleanup deployed, coverage stats added

---

## Overview

Provider data (which vendors to scrape, URLs, coin metadata) is stored in **Turso** as the single source of truth. Prior to 2026-02-25, this data lived in a static `providers.json` file on the `api` branch — pollers curled it before each run, and the home dashboard wrote edits back to the file. This caused race conditions when multiple writers edited the file simultaneously.

The shared query module `provider-db.js` provides all read/write operations. All consumers — Fly.io poller scripts, home poller, dashboard, and the publish pipeline — import from this module.

**Current stats:** 73 coins (silver, gold, goldback, platinum), 377 vendors.

---

## Schema

### `provider_coins`

```sql
CREATE TABLE IF NOT EXISTS provider_coins (
  slug       TEXT PRIMARY KEY,
  metal      TEXT NOT NULL,        -- "gold", "silver", "platinum"
  name       TEXT NOT NULL,        -- "American Silver Eagle"
  weight_oz  REAL NOT NULL,        -- troy ounces (e.g. 1, 10)
  fbp_url    TEXT,                 -- FindBullionPrices URL (legacy, nullable)
  notes      TEXT,                 -- free-form notes
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
  vendor_id  TEXT NOT NULL,        -- "jmbullion", "apmex", etc.
  vendor_name TEXT,                -- display name
  url        TEXT,                 -- scrape URL (null = disabled/no URL)
  enabled    INTEGER NOT NULL DEFAULT 1,
  selector   TEXT,                 -- CSS selector override (nullable)
  hints      TEXT,                 -- JSON hints for scraper (nullable)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(coin_slug, vendor_id)
);
```

### `provider_failures`

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

Added in STAK-349. Populated by `recordFailure()` in `db.js` — called from `price-extract.js` whenever a scrape returns no price for an in-stock vendor.

### Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_pv_coin ON provider_vendors(coin_slug);
CREATE INDEX IF NOT EXISTS idx_pv_vendor ON provider_vendors(vendor_id);
CREATE INDEX IF NOT EXISTS idx_pv_enabled ON provider_vendors(enabled);
CREATE INDEX IF NOT EXISTS idx_pf_coin_vendor ON provider_failures(coin_slug, vendor_id);
CREATE INDEX IF NOT EXISTS idx_pf_failed_at ON provider_failures(failed_at);
```

---

## provider-db.js API

Shared module at `StakTrakrApi/devops/fly-poller/provider-db.js`. All functions take a Turso `client` as the first argument.

| Function | Description |
|----------|-------------|
| `initProviderSchema(client)` | Idempotent DDL — creates both tables and indexes |
| `getProviders(client)` | Returns `{ coins: { [slug]: { metal, name, weight_oz, providers: [...] } } }` — matches `providers.json` shape |
| `getProvidersByCoin(client, coinSlug)` | Vendors for a single coin |
| `getAllCoins(client)` | Coin list without vendor detail |
| `upsertCoin(client, coin)` | Insert or update a coin row |
| `upsertVendor(client, vendor)` | Insert or update a vendor row |
| `toggleVendor(client, coinSlug, vendorId, enabled)` | Enable/disable a vendor |
| `updateVendorUrl(client, coinSlug, vendorId, url)` | Change a vendor's scrape URL |
| `deleteCoin(client, slug)` | Delete coin + all its vendors (batch) |
| `deleteVendor(client, coinSlug, vendorId)` | Delete a single vendor row |
| `updateVendorFields(client, coinSlug, vendorId, { selector, hints })` | Update selector/hints metadata |
| `getVendorScrapeStatus(client)` | Latest scrape result per vendor (window function query) |
| `getFailureStats(client)` | Vendors with 3+ failures in last 10 days |
| `getRunStats(client)` | Poller run aggregates (last 24h) |
| `batchToggleVendor(client, { vendorId, metal, enabled })` | Toggle all vendors of a vendor ID + metal type. Returns `{ rowsAffected }` |
| `batchDeleteVendor(client, { vendorId, metal })` | Delete all vendor entries for a vendor ID + metal type. Returns `{ rowsAffected }` |
| `batchToggleVendorByCoins(client, { vendorId, coinSlugs, enabled })` | Toggle vendor across specific coin slugs. Returns `{ rowsAffected }` |
| `getVendorSummary(client)` | Grouped counts by vendor ID and metal. Returns `{ [vendorId]: { total, enabled, disabled, byMetal: { [metal]: { total, enabled, disabled } } } }` |
| `getCoverageStats(client, hours?)` | Hourly coverage — how many enabled pairs had a successful price. Returns `{ totalEnabled, hours: [{ hour, covered, pct }] }` |
| `getMissingItems(client)` | Enabled pairs with no successful price this hour. Returns `[{ coinSlug, coinName, metal, vendor, url }]` |
| `exportProvidersJson(client)` | Returns JSON string matching `providers.json` format |
| `loadProvidersFromFile(dataDir)` | File fallback — reads `{dataDir}/retail/providers.json` |
| `loadProviders(client, dataDir)` | Turso-first with file fallback; logs which path taken |

---

## Sync Between Pollers

`provider-db.js` is shared between Fly.io (`StakTrakrApi/devops/fly-poller/`) and the home poller (`/opt/poller/`). The home poller copy may contain **extra functions** (e.g. `getCoverageStats`, `getMissingItems`) that `dashboard.js` imports but that haven't been committed to StakTrakrApi yet.

**Safe sync procedure:**

1. Edit `provider-db.js` in `StakTrakrApi/devops/fly-poller/` (source of truth)
2. Diff before overwriting: `ssh homepoller 'cat /opt/poller/provider-db.js' | diff - devops/fly-poller/provider-db.js`
3. SCP: `scp devops/fly-poller/provider-db.js homepoller:/opt/poller/provider-db.js`
4. Restart dashboard: `ssh homepoller 'sudo pkill -f "node.*dashboard"; sudo bash -c "cd /opt/poller && nohup node dashboard.js >> dashboard.log 2>&1 &"'`
5. Verify: `ssh homepoller 'curl -sf http://localhost:3010/ > /dev/null && echo OK'`

**Never blindly overwrite** the home poller's copy — always diff first to avoid breaking dashboard imports.

The canonical sync tool is `devops/home-scraper/sync-from-fly.sh --apply` which handles all shared files.

---

## Data Flow

```
Dashboard (CRUD)  ──→  Turso provider tables  ←── migrate-providers.js (one-time import)
                            │
                            ├──→ price-extract.js (reads providers for scraping)
                            ├──→ capture.js (reads providers for vision pipeline)
                            ├──→ api-export.js (reads providers for manifest generation)
                            │
                            └──→ run-publish.sh → exportProvidersJson() → providers.json on api branch
```

`providers.json` on the `api` branch is now **auto-generated** from Turso every publish cycle. It serves as a read-only snapshot for backward compatibility. Direct edits to the file will be overwritten.

---

## Dashboard CRUD

The home poller dashboard at `http://192.168.1.81:3010/providers` provides full CRUD against the Turso provider tables. Rebuilt in STAK-349 (2026-02-26).

### Layout

- **Stats bar** — total coins, total vendors, enabled vendors, poller run stats (last 24h)
- **Search/filter** — client-side filter by coin name, metal, or vendor name
- **Collapsible accordion** — each coin is a collapsible section (73 coins, collapsed by default)
- **Per-vendor scrape status** — green/red dots showing latest scrape result from `price_snapshots`

### Operations

| Action | Trigger | Backend |
|--------|---------|---------|
| Add coin | Modal form | `upsertCoin()` |
| Edit coin | Inline fields | `upsertCoin()` |
| Delete coin | Button + confirm dialog | `deleteCoin()` (cascades vendors) |
| Add vendor | Modal form | `upsertVendor()` |
| Edit vendor URL | Blur-to-save on input | `updateVendorUrl()` |
| Edit selector/hints | Save button per vendor | `updateVendorFields()` |
| Toggle vendor | Checkbox click | `toggleVendor()` |
| Delete vendor | Button + confirm dialog | `deleteVendor()` |
| Export JSON | Button | `exportProvidersJson()` |

All writes are individual Turso calls — no batch "Save All" button. Changes take effect on the next poller cycle.

### Bulk Operations

The providers page includes a **bulk action bar** (visible when filtering by metal type). Select a vendor from the dropdown and apply Enable All / Disable All / Remove All across all items of that metal.

| Action | Endpoint | Backend |
|--------|----------|---------|
| Enable all vendor items for a metal | `POST /providers/bulk-toggle` | `batchToggleVendor()` |
| Disable all vendor items for a metal | `POST /providers/bulk-toggle` | `batchToggleVendor()` |
| Remove all vendor items for a metal | `POST /providers/bulk-delete` | `batchDeleteVendor()` |
| Get vendor summary counts | `GET /providers/vendor-summary` | `getVendorSummary()` |

Confirmation modal shows the affected item count before executing. Added 2026-02-26 (goldback-vendor-cleanup + bulk-vendor-management-ui specs).

### Coverage Stats

The main dashboard shows hourly coverage cards and a missing items table:

- **Coverage cards** — latest hour coverage %, 12-hour average, spark bars
- **Missing Items table** — enabled vendor-coin pairs with no successful price this hour, with Diagnose and Browserbase action buttons

Powered by `getCoverageStats()` and `getMissingItems()` in `provider-db.js`.

### Failure Queue

A dedicated page at `/failures` shows vendors with repeated scrape failures:

- Aggregated from `provider_failures` table (3+ failures in last 10 days)
- Shows coin name, vendor ID, failure count, last error, and scrape URL
- Links back to the vendor's entry in `/providers` for editing

### Read-only fallback

If Turso is unreachable, the dashboard renders in read-only mode with a warning banner. Data is loaded from the local `providers.json` file via `loadProvidersFromFile()`.

---

## Fallback Strategy

All poller scripts use `loadProviders(client, dataDir)` which:

1. Tries `getProviders(client)` from Turso
2. On failure, falls back to `loadProvidersFromFile(dataDir)` — reads the local `providers.json`
3. Logs which path was taken (Turso vs file fallback)

The local `providers.json` files are kept on both pollers as a safety net but are no longer the primary data source.

---

## Migration

**One-time migration script:** `migrate-providers.js`

```bash
# Dry run (safe)
TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... DATA_DIR=data \
  node devops/fly-poller/migrate-providers.js --dry-run --production

# Execute
TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... DATA_DIR=data \
  node devops/fly-poller/migrate-providers.js --production
```

- `--production` required when Turso URL is not localhost
- `--dry-run` prints what would be inserted without writing
- Uses `INSERT OR REPLACE` — fully idempotent
- Migrated 2026-02-25: 11 coins, 67 vendors, verified round-trip fidelity

---

## Rollback

If Turso provider tables need to be abandoned:

1. All poller scripts automatically fall back to `loadProvidersFromFile()` if Turso is unreachable
2. Restore `curl` lines in `run-local.sh` and `run-home.sh` (see git history pre-STAK-348)
3. Remove `exportProvidersJson()` call from `run-publish.sh`
4. Edit `providers.json` on the `api` branch directly (old workflow)

---

## Related Pages

- [Turso Schema](turso-schema.md) — all Turso tables including `price_snapshots`
- [providers.json](providers.md) — file format reference (now auto-generated)
- [Fly.io Container](fly-container.md) — deployment and environment
- [Home Poller](home-poller.md) — dashboard and secondary poller
- [Health & Diagnostics](health.md) — monitoring and troubleshooting

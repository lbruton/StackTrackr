# API Pipeline Improvements — Design Document

**Date:** 2026-02-20
**Status:** Approved
**Scope:** Spot price background polling, Numista/PCGS response caching, unified log source vocabulary

---

## Problem Statement

Three API pipelines in StakTrakr require manual user interaction to stay current:

1. **Spot prices** — `autoSyncSpotPrices()` runs once on startup but has no recurring interval. Charts go stale while the page is open. Users must manually trigger a sync to see current prices.
2. **Numista lookups** — every coin detail lookup hits the API fresh, even if the same coin was fetched yesterday. Quota (2,000/month) burns unnecessarily on repeat lookups.
3. **PCGS lookups** — same problem. Every cert verification re-fetches despite the data being stable for days.

The retail tab already solved this with `startRetailBackgroundSync()` — a pattern worth porting.

**Note:** Retail is actively migrating from static JSON files to a live SQLite-backed API endpoint with 15-minute update cadence. This design is forward-compatible with that change — the background sync pattern is endpoint-agnostic.

---

## Goals

- Spot price charts update automatically while the page is open, without user intervention
- Paid API quota is protected — background polling honors cache TTL before making real calls
- Numista and PCGS repeat lookups are served from cache, burning zero quota
- Cache survives backup/restore via the existing ZIP export system
- All changes slot into existing settings UI — no new panels or tabs
- History log clearly distinguishes live API calls from cached responses

---

## Non-Goals

- Background sync for non-price data (inventory, vault, settings)
- Server-side caching or service worker caching (out of scope for this cycle)
- Changing the retail background sync (already implemented, being upgraded separately)

---

## Design

### 1. Spot Price Background Polling (`js/api.js`)

#### New function: `startSpotBackgroundSync()`

Mirrors `startRetailBackgroundSync()` exactly. Called from `init.js` after `autoSyncSpotPrices()`.

```
On startup:
  - For each provider with autoRefresh enabled:
    - Check if cache is stale (age > cacheTimeout for that provider)
    - If stale or no data: run silent sync immediately
  - Set setInterval at provider's cacheTimeout ms

On each interval tick:
  - Call syncProviderChain({ showProgress: false, forceSync: false })
  - Existing loadApiCache() check runs inside — if cache still valid, skip real API call
  - Log a source: "cached" entry to spotHistory with current cached price + timestamp
  - Return without UI update
```

Interval ID stored in `_spotSyncIntervalId` (module-level). Safe to restart if settings change.

#### Per-provider configuration

New field in `api_config.autoRefresh`: object keyed by provider name.

```json
{
  "autoRefresh": {
    "STAKTRAKR": true,
    "METALS_DEV": false,
    "METALS_API": false,
    "METAL_PRICE_API": false,
    "CUSTOM": false
  }
}
```

Defaults: `STAKTRAKR: true` (free, no key required). All paid providers default `false` — user opts in.

Cache TTL (`cacheTimeouts[provider]`) is unchanged in meaning and UI. It now serves dual purpose: how long to trust cached data AND how often to poll when auto-refresh is enabled.

#### Cached log entries

When a poll tick finds a valid cache, it writes to `spotHistory`:

```json
{
  "spot": 32.14,
  "metal": "Silver",
  "source": "cached",
  "provider": "StakTrakr",
  "timestamp": "2026-02-20 14:00:00"
}
```

Existing `recordSpot()` call with `source: "cached"` already handles this path (see `api.js:1008`).

---

### 2. Chart and Log Filtering

#### Source vocabulary (formalized)

| source | meaning | included in charts |
|---|---|---|
| `"api"` | Live API call, fresh data | Yes |
| `"api-hourly"` | StakTrakr hourly file fetch | Yes |
| `"manual"` | User-set spot price | Yes |
| `"seed"` | Historical seed data | Yes |
| `"cached"` | Poll ran, cache valid, no API call | No |
| `"cache"` | Numista/PCGS response from cache | No |

#### Chart filtering

`getHistoricalSparklineData()` in `spot.js` already deduplicates by calendar day — a "cached" entry on the same day as a real API entry is silently dropped. No change needed for daily charts.

For intraday views (hourly StakTrakr data), add one filter to the data prep step:

```javascript
.filter(e => e.source !== "cached")
```

#### Log table

- Cached entries rendered with a muted "Cached" badge in the Source column
- "Hide cached entries" toggle in the table header (defaults to hidden for cleaner view)
- Cached entries still count in the row total so users can see polling is active

---

### 3. Numista Response Cache (`js/catalog-api.js`)

#### New localStorage key

`NUMISTA_RESPONSE_CACHE_KEY` — added to `ALLOWED_STORAGE_KEYS` in `constants.js`.

Storage format:

```json
{
  "type-12345": {
    "data": { /* raw Numista API response */ },
    "fetchedAt": "2026-02-20T14:00:00Z",
    "ttlDays": 30
  }
}
```

Cache key: Numista type ID (the primary lookup key used in all Numista requests).

#### Cache check pattern

Inserted before every outbound Numista API call in `catalog-api.js`:

```
1. load cache via loadDataSync(NUMISTA_RESPONSE_CACHE_KEY)
2. if key exists and fetchedAt within 30 days → return cached data
3. increment cacheHit counter (shown in usage bar)
4. on cache miss → make API call → write result to cache → save
```

TTL: 30 days. Non-configurable (coin catalog data changes infrequently; 30 days is conservative).

Manual clear: "Clear Numista Cache" button in Settings > API > Numista calls `saveDataSync(NUMISTA_RESPONSE_CACHE_KEY, {})`.

---

### 4. PCGS Response Cache (`js/catalog-api.js`)

#### New localStorage key

`PCGS_RESPONSE_CACHE_KEY` — added to `ALLOWED_STORAGE_KEYS` in `constants.js`.

Storage format:

```json
{
  "cert-12345678": {
    "data": { /* raw PCGS API response */ },
    "fetchedAt": "2026-02-20T14:00:00Z",
    "ttlDays": 30
  },
  "pcgs-1234567": {
    "data": { /* raw PCGS CoinFacts response */ },
    "fetchedAt": "2026-02-20T14:00:00Z",
    "ttlDays": 30
  }
}
```

Cache keys: `cert-{certNumber}` for cert verification, `pcgs-{pcgsNumber}` for CoinFacts lookups.

Same pattern as Numista. Manual clear button in Settings > API > PCGS.

---

### 5. Settings UI Changes

**Minimal additions within existing provider cards — no new panels.**

#### Settings > API > [each metals provider card]

New row below cache TTL dropdown:

```
[ ✓ ] Enable background auto-refresh
      StakTrakr: checked by default. Paid providers: unchecked by default.
```

Subtitle on cache TTL dropdown updates to:
> "Cache duration (also sets background poll interval when auto-refresh is on)"

#### Settings > API > Numista

New stat row:

```
Cached lookups: 312 entries    [Clear cache]
```

#### Settings > API > PCGS

Same pattern:

```
Cached lookups: 47 entries    [Clear cache]
```

---

### 6. Backup / Restore

Both new cache keys (`NUMISTA_RESPONSE_CACHE_KEY`, `PCGS_RESPONSE_CACHE_KEY`) are registered in `ALLOWED_STORAGE_KEYS`. They are automatically included in ZIP export and restored on import.

Benefit: a restored backup arrives with warm cache — no quota burn on first load after restore.

---

## File Changes Summary

| File | Change |
|---|---|
| `js/constants.js` | Add `NUMISTA_RESPONSE_CACHE_KEY`, `PCGS_RESPONSE_CACHE_KEY` to `ALLOWED_STORAGE_KEYS` |
| `js/api.js` | Add `startSpotBackgroundSync()`, per-provider `autoRefresh` config field, `autoRefresh` toggle in settings render/save |
| `js/spot.js` | Add `source !== "cached"` filter in intraday data prep |
| `js/catalog-api.js` | Add cache read/write layer before Numista and PCGS outbound calls, clear button handlers |
| `js/init.js` | Call `startSpotBackgroundSync()` after `autoSyncSpotPrices()` |
| `js/settings.js` | Render auto-refresh toggle and cache stat rows in provider cards |
| `js/settings-listeners.js` | Bind auto-refresh toggle change handler, clear cache button handlers |

---

## Implementation Order

1. `constants.js` — new storage keys (unblocks everything else)
2. `catalog-api.js` — Numista + PCGS response cache (self-contained, no UI yet)
3. `api.js` — `startSpotBackgroundSync()` + `autoRefresh` config
4. `js/init.js` — wire up background sync startup call
5. `js/spot.js` — intraday source filter
6. `js/settings.js` + `settings-listeners.js` — UI toggles, stat rows, clear buttons
7. Manual QA: verify cached log entries appear, charts show no flat lines, clear buttons work

---

## Open Questions / Future Work

- When retail migrates to 15-minute updates, `RETAIL_POLL_INTERVAL_MS` tightens from 4 hours to 15 minutes — no design changes needed here
- Goldback pricing (`goldback.js`) uses spot as input, not an external API — not in scope
- Exchange rate fetches (`api.js` Open Exchange Rates) could benefit from the same cache pattern in a future cycle

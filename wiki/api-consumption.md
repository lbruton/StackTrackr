---
title: API Consumption
category: frontend
owner: staktrakr
lastUpdated: v3.33.25
date: 2026-03-02
sourceFiles:
  - js/api.js
  - js/api-health.js
relatedPages:
  - rest-api-reference.md
  - retail-modal.md
  - health.md
---
# API Consumption

> **Last updated:** v3.33.25 — 2026-03-02
> **Source files:** `js/api.js`, `js/api-health.js`

## Overview

StakTrakr is a **frontend consumer only**. It pulls three data feeds from `api.staktrakr.com` (GitHub Pages, served from the `lbruton/StakTrakrApi` repo). All poller scripts, Fly.io config, and data-pipeline code live in `StakTrakrApi` — never in this repo.

All StakTrakr fetch calls use an automatic dual-endpoint fallback. If the primary endpoint does not respond within 5 seconds (enforced by `AbortController`), the request is retried against the secondary endpoint (`api2.staktrakr.com`). This is handled transparently by `_staktrakrFetch()` in `api.js` and `_fetchWithTimeout()` in `api-health.js`.

---

## Key Rules

> Read these before touching any code in this area.

- **StakTrakr = consumer only.** Never add poller scripts, Fly.io config, or data-pipeline workflows to this repo. Those belong in `lbruton/StakTrakrApi`.
- **`spot-history-YYYY.json` is a seed file**, not live data. It is a noon-UTC daily snapshot used only for historical chart backfill. Do not read it in any health-check or freshness path — it will always appear ~10 h stale even when the poller is healthy (STAK-265).
- **Fallback is automatic.** Do not add manual endpoint-switching logic. `_staktrakrFetch()` in `api.js` and `_fetchWithTimeout()` in `api-health.js` each implement the fallback independently using `AbortController` with a 5 000 ms timeout.
- **Stale thresholds are constants in `api-health.js`** (`API_HEALTH_MARKET_STALE_MIN`, `API_HEALTH_SPOT_STALE_MIN`, `API_HEALTH_GOLDBACK_STALE_MIN`). Update those constants — never hardcode threshold values elsewhere.
- **Duplicate function risk.** Before modifying any function in this area, check both `js/events.js` AND `js/api.js` for duplicate definitions. Editing the wrong copy is a recurring source of lost time and bugs.

---

## Endpoints

| Role | Base URL |
|---|---|
| Primary | `https://api.staktrakr.com/data` |
| Fallback | `https://api2.staktrakr.com/data` |

Both are GitHub Pages deployments of the `lbruton/StakTrakrApi` repo. The fallback is tried automatically after a 5-second timeout or network error on the primary.

---

## Feed Reference

| Feed | Path | Freshness field | Stale threshold (health badge) | Poller |
|---|---|---|---|---|
| Market prices | `data/api/manifest.json` | `generated_at` (ISO 8601 UTC) | 30 min | Fly.io retail cron in StakTrakrApi |
| Hourly spot | `data/hourly/YYYY/MM/DD/HH.json` | `timestamp` of last entry | 20 min | Fly.io `run-spot.sh` cron (`:05/:20/:35/:50`) |
| 15-minute spot | `data/15min/YYYY/MM/DD/HHMM.json` | `timestamp` of last entry | 20 min | Fly.io `run-spot.sh` cron |
| Goldback | `data/api/goldback-spot.json` | `scraped_at` (ISO 8601 UTC) | 25 h | Fly.io `run-goldback.sh` hourly `:01` |

> **Note on spot staleness:** The health badge uses 20-minute thresholds for the spot feed (matching the ~15-min poller cadence with margin). CLAUDE.md's 75-minute figure is a separate operational staleness definition for runbook / alerting purposes and is not enforced by `api-health.js`.

---

## Key Functions

### `_staktrakrFetch(urls, path)` — `js/api.js`

Fetches a single JSON file from the first responsive StakTrakr endpoint. Tries each URL in `urls` in order. Moves to the next after a 5-second `AbortController` timeout or any error.

```js
// Simplified from js/api.js
const _staktrakrFetch = async (urls, path) => {
  let lastErr;
  for (const base of urls) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 5000);
    try {
      const resp = await fetch(`${base}${path}`, { mode: 'cors', signal: ctrl.signal });
      clearTimeout(tid);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (err) {
      clearTimeout(tid);
      lastErr = err;
    }
  }
  throw lastErr || new Error('All StakTrakr endpoints failed');
};
```

`baseUrls` is always `[primary, fallback]` from `API_PROVIDERS.STAKTRAKR.hourlyBaseUrls` or `fifteenMinBaseUrls` in `constants.js`.

---

### `fetchStaktrakrPrices(selectedMetals)` — `js/api.js`

Fetches current spot prices. Walks back up to 24 UTC hours from the current hour to find a valid data file. Returns a map of `{ metalKey: price }` for the requested metals.

---

### `fetchStaktrakrHourlyRange(hoursBack)` — `js/api.js`

Fetches hourly spot data for a configurable lookback window. Skips hours already present in `spotHistory` (dedup via `timestamp|metal` key set). Fetches in batches of 6 parallel requests. Used by `backfillStaktrakrHourly()` and the user-initiated history pull. Entry `source` value: `"api-hourly"`.

---

### `fetchStaktrakr15minRange(slotsBack)` — `js/api.js`

Fetches 15-minute slot data. Snaps each slot down to the nearest 15-minute boundary. Default lookback: 96 slots (24 h). Fetches in batches of 6. Entry `source` value: `"api-15min"`.

---

### `backfillStaktrakrHourly()` — `js/api.js`

Automatic backfill called on startup. If `spotHistory` already has a recent `api-hourly` entry (within 24 h), backfills 24 h. On a fresh load, backfills 7 days to populate the sparkline window (STAK-303: seed data can lag ~9 days).

---

### `fetchApiHealth()` — `js/api-health.js`

Probes all three feeds from every configured endpoint in parallel using `Promise.allSettled`. Health-check fetches use cache-busting query params (`?_t=<timestamp>`) and a 5 000 ms timeout via `_fetchWithTimeout()`. Returns `{ primary, backup }` health objects.

For spot freshness, `fetchApiHealth()` reads the current UTC hour file (`data/hourly/YYYY/MM/DD/HH.json`). If the current hour misses (404 / timeout), it falls back to the previous hour file. This is the correct live-data path — `spot-history-YYYY.json` is never used here.

---

### `updateHealthBadges({ primary })` — `js/api-health.js`

Updates both `#apiHealthBadge` and `#apiHealthBadgeAbout` elements. The badge reflects the **primary endpoint only**. Goldback is informational and does not affect the badge verdict.

Badge format:

```
✅ Market 3m ago · Spot 8m ago       (all ok)
⚠️ Market 35m ago · Spot 8m ago     (market stale)
⚠️ Market ❌ · Spot 8m ago          (market unreachable)
```

---

### `populateApiHealthModal({ primary, backup })` — `js/api-health.js`

Fills the health detail modal with per-feed, per-endpoint data. Shows primary and backup columns. When both endpoints are healthy, computes and displays drift between them (e.g., `"Both healthy. api2 market 2m behind, spot 1m behind."`). Verdict messages:

| Condition | Verdict |
|---|---|
| Both healthy, no drift | "Both endpoints healthy and in sync." |
| Both healthy, drift exists | "Both healthy. api2 market Xm behind." |
| Primary degraded, backup ok | "Primary degraded — backup is currently serving data." |
| Feeds unreachable | "One or more feeds unreachable — check Fly.io dashboard." |
| Both market and spot stale | "Both market and spot feeds are stale — poller may be down." |
| Market stale only | "Market feed is stale (>30 min). Spot prices are current." |
| Spot stale only | "Spot feed is stale (>20 min). Market prices are current." |

---

## Health Badge Logic

`initApiHealth()` is the main entry point, called by `init.js` after DOM setup. It:

1. Calls `setupApiHealthModalEvents()` to wire close/click/Escape handlers.
2. Calls `fetchApiHealth()` to probe all feeds in parallel.
3. Caches the result in `_lastHealth`.
4. Calls `updateHealthBadges()` to update the badge elements.
5. If the health modal is already open when the fetch resolves, calls `populateApiHealthModal()` immediately rather than leaving the "Checking..." placeholder.

On error, `populateApiHealthModalError()` sets all cells to `—` and both badge elements to `"❌ API ?"`. `_lastHealth` is cleared to `null` so the modal does not display stale green data.

> `initApiHealth()` must NOT be called from `api-health.js` itself. `safeGetElement` is defined in `init.js` (script #64), which loads after `api-health.js` (script #56). Auto-init here would fail silently.

---

## Stale Detection and UI Warnings

Feed cells in the health modal display one of three states:

| State | Display |
|---|---|
| Healthy | `✅ 3m ago` |
| Stale | `⚠️ 35m ago — stale (>30m)` |
| Error / unreachable | `❌ <error message>` |

The goldback cell uses the same pattern but without the stale-minute label, showing `⚠️ 2d ago — missed scrape?` when stale.

---

## Entry Source Labels

Entries written to `spotHistory` carry a `source` field:

| Source value | Description |
|---|---|
| `"api-hourly"` | Fetched from the hourly file feed (`data/hourly/...`) |
| `"api-15min"` | Fetched from the 15-minute file feed (`data/15min/...`) |
| `"seed"` | Loaded from a local `spot-history-YYYY.json` seed file |
| `"cached"` | Served from in-memory cache, not re-fetched |

---

## Separation of Duties

| Repo | Responsibility |
|---|---|
| `lbruton/StakTrakr` | Frontend consumer — reads feeds, displays data |
| `lbruton/StakTrakrApi` | Backend — Fly.io pollers, GHA workflows, data files, GitHub Pages deployment |

Never add to StakTrakr: poller scripts, Fly.io TOML/config, spot-poller workflows, data pipeline logic, or any server-side scraping.

---

## Common Mistakes

- **Checking `spot-history-YYYY.json` for liveness.** It is a noon-UTC daily seed file — always stale by design. The live freshness check uses `data/hourly/YYYY/MM/DD/HH.json`.
- **Hardcoding endpoint URLs** outside `js/constants.js`. The `hourlyBaseUrls`, `fifteenMinBaseUrls`, and `RETAIL_API_ENDPOINTS` arrays are the single source of truth.
- **Adding a manual retry loop.** `_staktrakrFetch()` already iterates `baseUrls`. Double-wrapping creates redundant requests.
- **Adding poller code to this repo.** All backend code lives in `StakTrakrApi`.
- **Ignoring the 5-second timeout.** `AbortController` enforces it — never use bare `fetch()` for API calls without a signal in this file.
- **Editing only `api.js` without checking `events.js`.** Some functions have duplicates in `events.js`. Always check both files before modifying — editing the wrong copy is a recurring bug source.
- **Calling `initApiHealth()` outside `init.js`.** `safeGetElement` is not yet defined when `api-health.js` loads. Auto-init must stay in `init.js`.

---

## Related Pages

- [rest-api-reference.md](rest-api-reference.md) — full feed schema and field definitions
- [retail-modal.md](retail-modal.md) — how `manifest.json` market prices are displayed in the UI
- [health.md](health.md) — operational runbook for API health monitoring and incident response

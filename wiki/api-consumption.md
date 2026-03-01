---
title: API Consumption
category: frontend
owner: staktrakr
lastUpdated: v3.32.25
date: 2026-02-23
sourceFiles:
  - js/api.js
  - js/api-health.js
  - js/constants.js
relatedPages:
  - frontend-overview.md
  - retail-modal.md
---
# API Consumption

> **Last updated:** v3.32.25 — 2026-02-23
> **Source files:** `js/api.js`, `js/api-health.js`, `js/constants.js`

## Overview

StakTrakr is a **frontend consumer only**. It pulls three data feeds from `api.staktrakr.com` (GitHub Pages, served from the `lbruton/StakTrakrApi` repo). All poller scripts, Fly.io config, and data-pipeline code live in `StakTrakrApi` — never in this repo.

Requests use an automatic dual-endpoint fallback: if the primary endpoint does not respond within 5 seconds, the fetch is retried against a secondary endpoint (`api2.staktrakr.com`).

---

## Key Rules (read before touching this area)

- **StakTrakr = consumer only.** Never add poller scripts, Fly.io config, or data-pipeline workflows to this repo. Those belong in `lbruton/StakTrakrApi`.
- **`spot-history-YYYY.json` is a seed file**, not live data. It is a noon-UTC daily snapshot. `api-health.js` currently checks it for spot freshness, so it always shows ~10 h stale even when the poller is healthy. This is a known issue (STAK-265 follow-up).
- **Fallback is automatic.** Do not add manual endpoint-switching logic — `_staktrakrFetch()` already handles it via `AbortController` with a 5 000 ms timeout.
- **Stale thresholds are defined as constants** in `api-health.js` (`API_HEALTH_MARKET_STALE_MIN`, `API_HEALTH_SPOT_STALE_MIN`, `API_HEALTH_GOLDBACK_STALE_MIN`). Update those constants — never hardcode values elsewhere.

---

## Architecture

### Endpoints

| Role | Base URL |
|---|---|
| Primary | `https://api.staktrakr.com/data` |
| Fallback | `https://api2.staktrakr.com/data` |

Both are GitHub Pages deployments of the `lbruton/StakTrakrApi` repo. The fallback is tried automatically after a 5-second timeout or network error on the primary.

### Fallback mechanism (`_staktrakrFetch`)

```js
// js/api.js — simplified
const _staktrakrFetch = async (baseUrls, path) => {
  for (const base of baseUrls) {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 5000); // 5-second timeout
    const resp = await fetch(`${base}${path}`, { mode: 'cors', signal: ctrl.signal });
    if (resp.ok) return resp.json();
  }
};
```

`baseUrls` is always `[primary, fallback]`. On abort or error the loop advances to the next URL.

---

## Data Feeds

### 1. Market prices — `manifest.json`

| Property | Value |
|---|---|
| Path | `data/api/manifest.json` |
| Primary URL | `https://api.staktrakr.com/data/api/manifest.json` |
| Fallback URL | `https://api2.staktrakr.com/data/api/manifest.json` |
| Freshness field | `generated_at` (ISO 8601 UTC) |
| Stale threshold | 30 minutes |
| Poller | Fly.io retail cron in `StakTrakrApi` (hourly at :00, home poller at :30) |

Contains retail and market prices for all tracked metals. Consumed via `API_PROVIDERS.STAKTRAKR.parseBatchResponse()`.

### 2. Hourly spot prices

| Property | Value |
|---|---|
| Path pattern | `data/hourly/YYYY/MM/DD/HH.json` |
| Primary base | `https://api.staktrakr.com/data/hourly` |
| Fallback base | `https://api2.staktrakr.com/data/hourly` |
| Freshness field | timestamp within the JSON file |
| Stale threshold | 20 minutes |
| Poller | `spot-poller.yml` GHA in `StakTrakrApi` (~every 15 min) |

One file per UTC hour. `api.js` constructs the path for the current hour, falls back to the previous hour on a miss, then fetches backwards as needed for history. Entry `source` value: `"api-hourly"`.

### 3. 15-minute spot prices

| Property | Value |
|---|---|
| Path pattern | `data/15min/YYYY/MM/DD/HHMM.json` |
| Primary base | `https://api.staktrakr.com/data/15min` |
| Fallback base | `https://api2.staktrakr.com/data/15min` |
| Freshness field | timestamp within the JSON file |
| Stale threshold | 20 minutes |
| Poller | `spot-poller.yml` GHA in `StakTrakrApi` (~every 15 min) |

One file per 15-minute UTC slot. Used by `fetchStaktrakr15minRange()`. Entry `source` value: `"api-15min"`.

### 4. Goldback spot price

| Property | Value |
|---|---|
| Path | `data/api/goldback-spot.json` |
| URL | `https://api.staktrakr.com/data/api/goldback-spot.json` |
| Freshness field | `scraped_at` (ISO 8601 UTC) |
| Stale threshold | 25 hours |
| Poller | Fly.io `run-goldback.sh` cron in `StakTrakrApi` (hourly :01, skips if today's price exists) |

Goldback is an informational feed. The Health modal shows its age but does not include it in the primary/backup verdict.

---

## Seed File Warning — `spot-history-YYYY.json`

`spot-history-YYYY.json` files are **daily snapshots** (noon UTC), not live data. They are used to backfill historical spot charts, not to determine current freshness.

**Known issue (STAK-265 follow-up):** `api-health.js` previously used this file to assess spot freshness, causing it to always appear ~10 h stale even when the hourly poller is running correctly. The health check now uses the live hourly files instead. Do not reintroduce spot-history reads into the health-check path.

---

## Health Checks (`api-health.js`)

The Health modal (`js/api-health.js`) runs parallel checks against both endpoints and displays per-feed drift.

```
Market:  manifest.json       — stale after 30 min   (API_HEALTH_MARKET_STALE_MIN)
Spot:    hourly/YYYY/MM/DD/HH.json — stale after 20 min   (API_HEALTH_SPOT_STALE_MIN)
Goldback: goldback-spot.json — stale after 25 h      (API_HEALTH_GOLDBACK_STALE_MIN)
```

- Each feed shows its age (`X min ago`) and a healthy/stale badge.
- When both endpoints are healthy, the modal reports drift between them (e.g., `api2 market 2m behind`).
- Goldback is informational — it does not affect the overall health verdict.

Timeout for health-check fetches: **5 000 ms** (`_fetchWithTimeout(url, 5000)`).

---

## Entry Source Labels

Entries written to `spotHistory` carry a `source` field:

| Source value | Description |
|---|---|
| `"api-hourly"` | Fetched from the hourly file feed |
| `"api-15min"` | Fetched from the 15-minute file feed |
| `"seed"` | Loaded from a local `spot-history-YYYY.json` seed file |
| `"cached"` | Served from in-memory cache, not re-fetched |

---

## Separation of Duties

| Repo | Responsibility |
|---|---|
| `lbruton/StakTrakr` | Frontend consumer — reads feeds, displays data |
| `lbruton/StakTrakrApi` | Backend — Fly.io pollers, GHA workflows, data files, GitHub Pages deployment |

**Never add to StakTrakr:** poller scripts, Fly.io TOML/config, `spot-poller.yml`, data pipeline workflows, or any server-side scraping logic.

---

## Common Mistakes

- **Checking `spot-history-YYYY.json` for liveness.** It is a seed file — always stale by design.
- **Hardcoding endpoint URLs** outside `js/constants.js`. The `hourlyBaseUrls` and `fifteenMinBaseUrls` arrays in `API_PROVIDERS.STAKTRAKR` are the single source of truth.
- **Adding a manual retry loop.** `_staktrakrFetch()` already iterates `baseUrls`. Double-wrapping it creates redundant requests.
- **Adding poller code to this repo.** All backend code lives in `StakTrakrApi`.
- **Ignoring the 5-second timeout.** `AbortController` enforces it — do not use bare `fetch()` for API calls without a signal.

---

## Related Pages

- [frontend-overview.md](frontend-overview.md) — overall architecture and file map
- [retail-modal.md](retail-modal.md) — how manifest.json market prices are displayed

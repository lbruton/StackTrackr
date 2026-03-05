---
title: Retail Market Price Pipeline
category: infrastructure
owner: staktrakr-api
lastUpdated: v3.33.25
date: 2026-03-02
sourceFiles: []
relatedPages:
  - rest-api-reference.md
  - turso-schema.md
  - cron-schedule.md
  - goldback-pipeline.md
  - spot-pipeline.md
  - providers.md
---

# Retail Market Price Pipeline

> **Last verified:** 2026-03-02 — dual-poller architecture, Turso shared DB, readLatestPerVendor() merge logic; Fly.io retail cron corrected to `0 * * * *` (`CRON_SCHEDULE=0`)

---

## Overview

The retail pipeline scrapes coin dealer prices from **7 vendors × 11 bullion coins** every cycle, writes to a shared Turso database, then exports to REST JSON and pushes to GitHub Pages.

**Goldback expansion (STAK-335):** 56 per-state Goldback slugs are scaffolded in `providers.json` but start disabled (`url: null`). They add zero scrape load until vendor URLs are populated. See [goldback-pipeline.md](goldback-pipeline.md) for the full state × denomination matrix.

Two independent pollers write to the **same Turso database**. A single publisher script on Fly.io merges their data using latest-per-vendor logic and pushes to the `api` branch.

---

## Dual-Poller Architecture

| Poller | Location | Cron | Script | POLLER_ID |
|--------|----------|------|--------|-----------|
| **Fly.io** (primary) | `staktrakr` app, `dfw` region | `0 * * * *` (1×/hr) | `run-local.sh` | `api` |
| **Home LXC** (secondary) | Proxmox Ubuntu @ 192.168.1.81 | `30 * * * *` (1×/hr) | `run-home.sh` | `home` |

**Why two pollers?**
- Redundancy — if Fly.io misses a cycle, home poller fills the gap within 30 min (hourly offset)
- Both write to the same Turso DB; `run-publish.sh` merges via `readLatestPerVendor()` — most recent row per vendor within last 2h wins
- No branch conflicts — the home poller never pushes to Git, only writes to Turso

---

## Script Responsibilities

### Scrape scripts (`run-local.sh` / `run-home.sh`)

1. Load providers from Turso (Turso-first with file fallback)
2. `price-extract.js` — scrape dealers, write results to Turso `price_snapshots`
3. `capture.js` — screenshots via Playwright (requires `GEMINI_API_KEY` + `VISION_ENABLED=1` on Fly.io)
4. `extract-vision.js` — Gemini Vision cross-validation (requires `GEMINI_API_KEY` + `VISION_ENABLED=1` on Fly.io)
5. **Done** — does NOT touch Git

> **Note:** Vision is **soft-disabled by default** on Fly.io (`VISION_ENABLED=0` in `run-local.sh`). The home poller runs vision when `GEMINI_API_KEY` is present — no `VISION_ENABLED` gate.

### `run-publish.sh` (Fly.io only, every 15 min: `8,23,38,53 * * * *`)

1. Lockfile guard (`/tmp/retail-publish.lock`) — skips if previous run still active
2. `api-export.js` — reads Turso via `readLatestPerVendor()`, builds `data/api/` JSON
3. `git add data/` + commit if changed
4. Force-push `HEAD:api` to `StakTrakrApi` `api` branch

> **Single writer, no merge conflicts.** Force-push is intentional — Fly.io is the sole Git writer for the `api` branch data files.

---

## Data Flow

```
Fly.io run-local.sh  ──┐
(0 * * * *)            ├──► Turso (price_snapshots) ──► api-export.js ──► data/api/ JSON
Home LXC run-home.sh ──┘    readLatestPerVendor()        (run-publish.sh, 8,23,38,53)
(30 * * * *)
                                                              │
                                                              ▼
                                                   StakTrakrApi api branch
                                                              │
                                                              ▼
                                                    GitHub Pages → api.staktrakr.com
```

---

## Turso Database

**Table:** `price_snapshots`

| Column | Description |
|--------|-------------|
| `scraped_at` | ISO 8601 UTC timestamp of scrape |
| `window_start` | 15-min window bucket (legacy, kept for compatibility) |
| `coin_slug` | e.g. `ase`, `age`, `maple-silver` |
| `vendor` | Provider ID, e.g. `jmbullion`, `apmex` |
| `price` | Scraped price (null if OOS or failed) |
| `source` | `playwright_direct`, `firecrawl`, `playwright`, `gemini-vision`, or `fbp` |
| `in_stock` | false if OOS patterns matched |
| `is_failed` | true if scrape threw an error |

### `readLatestPerVendor()` — the dual-poller merge function

`api-export.js` uses `readLatestPerVendor(db, coinSlug, lookbackHours=2)` which returns the **most recent row per vendor** within the last 2 hours. This means both pollers' data shows up regardless of which time window they ran in.

---

## Provider Loading

Provider data is loaded from **Turso first** (querying `provider_coins` + `provider_vendors` tables directly), with file fallback to `data/retail/providers.json`. `providers.json` on the `api` branch is **generated output** from `export-providers-json.js` — URL corrections should be made directly in Turso via `provider-db.js` or the dashboard at `http://192.168.1.81:3010/providers`. Changes take effect next cycle with **no redeploy needed**.

### URL strategy

Prefer random-year / dates-our-choice SKUs when in stock. At year-start, Monument Metals random-year SKUs go pre-order while year-specific (e.g. `2026-american-silver-eagle.html`) are in stock — switch to year-specific until bulk stock arrives.

See [providers.md](providers.md) for full details.

---

## Scrape Pipeline (`price-extract.js`)

Since 2026-02-23, each provider entry can specify a `urls` array instead of a single `url`. The scraper tries each URL in sequence. Single-`url` entries are backward compatible — treated as a 1-element `urls` list.

> **Pipeline divergence (API-3, 2026-03-02):** The Fly.io and home pollers now run **different pipeline orders**. The sections below describe the Fly.io pipeline. See [Home Poller](home-poller.md) for the home pipeline, and [Poller Parity](poller-parity.md) for a side-by-side comparison.

### Fly.io Pipeline Order (post API-3)

**Phase 0 — Playwright direct (all URLs, tried first):**

`scrapeWithPlaywrightDirect(url, providerId)` — lightweight direct scrape using Fly.io's own IP (no proxy). 15-second timeout, no retries.

| Event at URL[i] | Action |
|-----------------|--------|
| Price found | Log ✓, break — skip remaining URLs |
| OOS detected | Log ⚠, jitter, try URL[i+1] |
| 403 / timeout / AbortError | Set `skipRetry = true`, fall through to Phase 1 |
| Price not found | Log ?, jitter, try URL[i+1] |

~65 targets succeed at Phase 0 (~5s avg per target).

**Phase 1 — Firecrawl with proxy (fallback only):**

Only runs if Phase 0 exhausted all URLs with no price. Uses `HOME_PROXY_URL` (tinyproxy on home VM via Tailscale) for residential IP routing.

| Event | Action |
|-------|--------|
| Price found | Log ✓, done |
| OOS detected | Done (no further retry) |
| Firecrawl error | Recorded as failed, queued for T3 retry |

~20 targets need Phase 1 (~20s avg per target).

**Abort/timeout handling:** The `scrapeUrl()` catch block sets `skipRetry = true` for `AbortError` and timeout errors, preventing wasted retries on targets that are genuinely unreachable.

### Home Poller Pipeline Order (unchanged)

The home poller (`run-home.sh`) still uses the **old pipeline order**:

1. **Firecrawl first** (no proxy — home poller is already on residential IP)
2. **Playwright fallback** (if Firecrawl fails)

The home poller does not have a `scrapeWithPlaywrightDirect()` phase. See [Home Poller](home-poller.md) for details.

---

## OOS Detection (`price-extract.js`)

`detectStockStatus(markdown, weightOz, providerId)` checks scraped text for out-of-stock signals before price extraction.

**Global patterns:** `out of stock`, `sold out`, `currently unavailable`, `notify me when available`, `email when in stock`, `temporarily out of stock`, `back order`, `pre-order`/`preorder`, `notify me`

**Per-provider exceptions:**

`PREORDER_TOLERANT_PROVIDERS = Set(["jmbullion"])`

JMBullion marks some coins as Presale/Pre-Order but still shows live purchasable prices. The `pre-?order` pattern is skipped for `jmbullion`. Affected coins at year-start: `buffalo`, `maple-silver`, `maple-gold`, `krugerrand-silver`.

---

## Tiered Scraper Fallback (T1–T4)

As of 2026-02-24, the retail pipeline has four automatic recovery layers for scrape failures:

| Tier | Method | Trigger | How |
|------|--------|---------|-----|
| T1 | Tailscale residential IP | If `tailscaled` socket present | `run-local.sh` socket-checks before each cycle — gracefully skipped if Tailscale not running |
| T2 | Fly.io datacenter IP | Tailscale unreachable | Automatic fallback in same ping-check |
| T3 | Webshare proxy + cron retry | SKUs still failed after T1/T2 | `run-retry.sh` fires at `:15`; re-scrapes failed slugs only |
| T4 | Turso last-known-good | T3 also fails for a vendor | `api-export.js` fills from `price_snapshots` at publish time |

### Failure signal: `/tmp/retail-failures.json`

`price-extract.js` writes this file after each run listing SKUs that failed **both** the main scrape and the FBP backfill. `run-retry.sh` reads it at `:15` and clears it on exit.

- If the file is absent → `:15` cron is a no-op
- If ≥80% of targets are in the file → `run-local.sh` logs `[WARN] SYSTEMIC` for monitoring

### T4 manifest output

When T4 fills a vendor slot, the manifest entry includes extra fields the frontend can use:

```json
"herobullion": {
  "price": 34.21,
  "source": "turso_last_known",
  "stale": true,
  "stale_since": "2026-02-24T14:00:00Z",
  "inStock": true
}
```

---

## Vision Pipeline

Requires `GEMINI_API_KEY` **and** `VISION_ENABLED=1`. Non-fatal — failure is logged and scrape continues.

> **Soft-disabled by default (API-3, 2026-03-02):** The Fly.io poller's `run-local.sh` sets `VISION_ENABLED=0` by default. Toggle via `fly secrets set VISION_ENABLED=1` to re-enable, or `fly secrets unset VISION_ENABLED` to disable. The home poller runs vision when `GEMINI_API_KEY` is present in `.env` (no `VISION_ENABLED` gate).

### capture.js — Direct-first screenshot capture

`captureCoinDirectFirst()` tries two browser contexts in sequence:

1. **Direct browser** (Fly.io IP, 20s timeout) — no proxy overhead
2. **Proxy browser** (via `HOME_PROXY_URL`, 30s timeout) — fallback on 403 errors

Both browser contexts are kept alive for the duration of the capture run. If `HOME_PROXY_URL` is unreachable at startup (5s health probe), the proxy browser is skipped and only direct capture is attempted.

### extract-vision.js — Gemini Vision cross-validation

Sends screenshots to Gemini Vision API. Extracts price from image, compares against scraped price. Unchanged by API-3.

### Proxy health probe

Both `price-extract.js` and `capture.js` probe `HOME_PROXY_URL` at startup with a 5-second timeout. If the proxy is unreachable, a `[WARN]` is logged and the pipeline continues in direct-only mode (no proxy fallback).

### Confidence scoring

| Scenario | Confidence |
|----------|-----------|
| Scrape + Vision agree (≤3% diff) | 99 |
| Vision only (scrape null) | ~70 |
| Scrape + Vision disagree (>3% diff) | ≤70, scaled by divergence |
| Scrape only, no Vision | `scoreVendorPrice()` vs 30-day median (~80 max) |

> **Without vision enabled**, confidence scores cap at ~80. No code changes were needed in `merge-prices.js` or `api-export.js` — they handle vision-absent data gracefully.

### Expected run timing

| Configuration | Approximate duration |
|---------------|---------------------|
| **Without vision** (default) | ~16 min |
| **With vision enabled** | ~28 min |
| **Old pipeline (pre-API-3)** | ~68 min |

---

## Common Failure Modes

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Vendor missing prices multiple cycles | URL changed, OOS, or bot-blocked | Add backup URLs via `urls` array in providers.json — auto-synced next cycle, no redeploy |
| Only 1-2 vendors per coin | Poller down or Turso connectivity | Check `fly logs` and home LXC cron; verify Turso has recent rows |
| JMBullion presale coins show OOS | `pre-?order` matching before provider check | Verify `PREORDER_TOLERANT_PROVIDERS` includes `jmbullion` in price-extract.js |
| OOM on Fly.io | Concurrent api-export.js invocations | Verify run-local.sh does NOT call api-export.js; run-publish.sh has lockfile |
| Monument Metals missing at year-start | Random-year SKUs on pre-order | Switch to year-specific SKU in providers.json |
| Vendor price marked `stale: true` in manifest | T3 proxy retry also failed — T4 filled from last known Turso row | Check `/var/log/retail-retry.log`; top up Webshare quota if over limit |
| `[WARN] SYSTEMIC` in retail-poller.log | ≥80% of SKUs failed — likely Fly.io IP blocked | Check egress IP (`curl ifconfig.me` in container); Webshare T3 will retry at `:15` |

---

## Deployment Notes

- **Code changes** — `git push origin main` then `fly deploy` from `devops/fly-poller/`
- **Provider URL fixes** — update directly in Turso via `provider-db.js` or the dashboard; auto-synced next cycle, no redeploy
- **Home LXC code update** — curl changed files from `raw.githubusercontent.com/lbruton/StakTrakrApi/main/devops/fly-poller/`
- **After deploy** — `fly logs --app staktrakr | grep -E 'retail|publish|ERROR'`

---

## Cron Schedule Summary (Fly.io)

| Script | Cron | Purpose |
|--------|------|---------|
| `run-local.sh` | `0 * * * *` | Retail scrape (1x/hr, `CRON_SCHEDULE=0`) |
| `run-spot.sh` | `0,30 * * * *` | Spot price poll (MetalPriceAPI → Turso + JSON) |
| `run-publish.sh` | `8,23,38,53 * * * *` | Export Turso → JSON, push to `api` branch |
| `run-retry.sh` | `15 * * * *` | T3 proxy retry of failed SKUs |
| `run-goldback.sh` | `1 * * * *` | Goldback G1 rate scrape (skips if today's price captured) |

See [cron-schedule.md](cron-schedule.md) for the full timeline view and design rationale.

---

## Related Pages

- [REST API Reference](rest-api-reference.md) — complete endpoint map and schemas
- [Turso Schema](turso-schema.md) — database tables, indexes, and key queries
- [Cron Schedule](cron-schedule.md) — full timeline view with rationale
- [Goldback Pipeline](goldback-pipeline.md) — denomination generation
- [Spot Pipeline](spot-pipeline.md) — MetalPriceAPI polling
- [providers.json](providers.md) — vendor URL configuration

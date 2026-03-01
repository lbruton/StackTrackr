---
title: Architecture Overview
category: infrastructure
owner: staktrakr-api
lastUpdated: v3.33.18
date: 2026-02-25
sourceFiles: []
relatedPages: []
---

# Architecture Overview

> **Last verified:** 2026-02-25 — full audit from live Fly.io container source code. Dual poller, Turso shared DB, 17 coins, 7 vendors.
> ⚠️ **Known gaps:** Spot poller not writing to Turso. See STAK-331.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Fly.io Container (staktrakr, dfw)                          │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐                          │
│  │ run-local.sh│  │ run-spot.sh  │                          │
│  │ 0 * * * *   │  │ 5,20,35,50   │                          │
│  └──────┬──────┘  └──────┬───────┘                          │
│         │                │ ⚠️ writes files directly          │
│  ┌──────▼──────────────────────────────────────────────┐   │
│  │  Self-hosted Firecrawl (port 3002)                   │   │
│  │  Playwright Service (port 3003)                      │   │
│  │  Redis, RabbitMQ, PostgreSQL 17                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────┐                                           │
│  │run-publish.sh│  8,23,38,53 * * * *                      │
│  │api-export.js │◄── Turso (price_snapshots + goldback-g1)  │
│  └──────┬───────┘                                           │
│         │ force-push HEAD:api                               │
└─────────┼───────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────┐
│  Home VM (Ubuntu LXC, 192.168.1.81)                         │
│  run-home.sh  30 * * * *                                        │
│  Firecrawl + Playwright (supervisord)                       │
│  Dashboard (port 3010), Metrics Exporter (port 9100)        │
│  Grafana (port 3000), Prometheus (port 9090)                │
│                │                                             │
│                └──► Turso (same DB, POLLER_ID=home)          │
└─────────────────────────────────────────────────────────────┘

          │
          ▼
  Turso (libSQL cloud)
  price_snapshots  — retail prices (both pollers)
  poller_runs      — run metadata (both pollers)
  provider_failures — per-URL failure log (both pollers)
  ⚠️ spot_prices NOT yet in Turso (pending STAK-331)
          │
          ▼ (via run-publish.sh)
  StakTrakrApi  api  branch
          │
          │  Merge Poller Branches GHA (*/15 min)
          ▼
  StakTrakrApi  main  branch
          │
          ▼
  GitHub Pages → api.staktrakr.com
          │
          ▼
  StakTrakr frontend (Cloudflare Pages)
```

---

## Repo Boundaries

| Repo | Owns |
|------|------|
| `lbruton/StakTrakrApi` | All API backend: poller code (`devops/`), GHA workflows, data files served via GitHub Pages |
| `lbruton/StakTrakr` | Frontend app code, Cloudflare Pages deployment, local dev tools |
| `lbruton/stakscrapr` | Home VM full stack — identical Firecrawl+Playwright+scraper core PLUS dashboard.js, tinyproxy/Cox residential proxy, Tailscale exit node config |
| `lbruton/StakTrakrWiki` | This wiki — shared infrastructure documentation |

---

## Three Data Feeds

| Feed | File | Writer | Cadence | Status |
|------|------|--------|---------|--------|
| Market prices | `data/api/manifest.json` | Fly.io `run-local.sh` + `run-publish.sh` via Turso | `0 * * * *` | ✅ Live |
| Spot prices | `data/hourly/YYYY/MM/DD/HH.json` | Fly.io `run-spot.sh` → **direct file write** | `5,20,35,50 * * * *` | ⚠️ Not via Turso — see STAK-331 |
| Goldback | `data/api/goldback-spot.json` | Fly.io `run-local.sh` (via `goldback-g1` in providers.json) + `api-export.js` generates denominations (G1–G50) from Turso | `0 * * * *` (same as retail) | ✅ Live |

---

## Branch Strategy

| Branch | Purpose | Writer |
|--------|---------|--------|
| `api` | Live data + providers.json config | Fly.io `run-publish.sh` (force-push) |
| `main` | Merged source of truth; served by GitHub Pages | `Merge Poller Branches` GHA workflow |
| `api1` | (Reserved for second Fly.io poller if needed) | Not currently active |

GitHub Pages is configured to serve the **`main` branch** (not `api`). The merge workflow runs every 15 minutes to pull `api` data into `main`.

---

## Key Infrastructure Components

| Component | What it is | Where |
|-----------|-----------|-------|
| Fly.io `staktrakr` app | All-in-one container: Firecrawl + pollers + serve.js | cloud |
| Turso `staktrakrapi` DB | libSQL cloud — dual-poller write-through store (retail only currently) | cloud |
| Home VM | Secondary poller + monitoring stack (Grafana, Prometheus) | 192.168.1.81 |
| tinyproxy | Residential HTTP proxy on home VM for Fly.io scraper traffic | 192.168.1.81:8888 |
| MetalPriceAPI | Spot price data source | cloud |
| Gemini API | Vision cross-validation | cloud |
| GitHub Pages | Static JSON API host | cloud |

---

## Deployment Paths

| Change type | Action needed |
|-------------|--------------|
| Poller code change | `git push origin main` + `fly deploy` from `devops/fly-poller/` |
| providers.json URL fix | Push to `api` branch — auto-synced next cycle, no redeploy |
| Home poller code update | curl files from `raw.githubusercontent.com/lbruton/StakTrakrApi/main/devops/fly-poller/` |
| New Fly.io secret | `fly secrets set KEY=value --app staktrakr` |
| GHA workflow change | Push to `main` branch — GHA reads from main |

---

## Open Architecture Gaps (STAK-331 — Urgent)

| Gap | Impact |
|-----|--------|
| Spot poller writes files, not Turso | Turso not single source of truth for spot data |
| Turso missing weeks of historical data | Backfill script needed before charts/trends are usable |

---

## New Pages (2026-02-25 audit)

| Page | Contents |
|------|----------|
| [REST API Reference](rest-api-reference.md) | Complete endpoint map, schemas, confidence scoring, vendor reference |
| [Turso Schema](turso-schema.md) | Database tables, indexes, key query patterns, data volume estimates |
| [Cron Schedule](cron-schedule.md) | Full timeline view, design rationale, verification commands |

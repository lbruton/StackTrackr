---
title: Architecture Overview
category: infrastructure
owner: staktrakr-api
lastUpdated: v3.33.19
date: 2026-02-25
sourceFiles: []
relatedPages: []
---

# Architecture Overview

> **Last verified:** 2026-03-01 — full audit from live Fly.io container source code. Dual poller, Turso shared DB, 11 coins, 7 vendors.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Fly.io Container (staktrakr, dfw)                          │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐                          │
│  │ run-local.sh│  │ run-spot.sh  │                          │
│  │ 15,45 * * * │  │ 0,30 * * * * │                          │
│  └──────┬──────┘  └──────┬───────┘                          │
│         │                │ → Turso spot_prices + JSON files  │
│  ┌──────▼──────────────────────────────────────────────┐   │
│  │  Self-hosted Firecrawl (port 3002)                   │   │
│  │  Playwright Service (port 3003)                      │   │
│  │  Redis, RabbitMQ, PostgreSQL 17                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────┐                                           │
│  │run-publish.sh│  8,23,38,53 * * * *                      │
│  │api-export.js │◄── Turso (price_snapshots + spot_prices)  │
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
  spot_prices      — spot prices (Fly.io spot poller)
  poller_runs      — run metadata (both pollers)
  provider_failures — per-URL failure log (both pollers)
          │
          ▼ (via run-publish.sh)
  StakTrakrApi  api  branch
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
| Market prices | `data/api/manifest.json` | Fly.io `run-local.sh` + `run-publish.sh` via Turso | `15,45 * * * *` | ✅ Live |
| Spot prices | `data/hourly/YYYY/MM/DD/HH.json` | Fly.io `run-spot.sh` → `spot-extract.js` → Turso `spot_prices` + JSON files | `0,30 * * * *` | ✅ Live |
| Goldback | `data/api/goldback-spot.json` | Fly.io `run-goldback.sh` → `goldback-scraper.js` → direct commit to `api` branch | `1 * * * *` (hourly, skips if today's rate captured) | ✅ Live |

---

## Branch Strategy

| Branch | Purpose | Writer |
|--------|---------|--------|
| `api` | Live data + providers.json config; served by GitHub Pages | Fly.io `run-publish.sh` (force-push) |
| `main` | Devops code, poller source, GHA workflows | Manual pushes + PRs |
| `api1` | (Reserved for second Fly.io poller if needed) | Not currently active |

GitHub Pages is configured to serve the **`api` branch**. The `Merge Poller Branches` GHA workflow is retired/manual-only.

---

## Key Infrastructure Components

| Component | What it is | Where |
|-----------|-----------|-------|
| Fly.io `staktrakr` app | All-in-one container: Firecrawl + pollers + serve.js | cloud |
| Turso `staktrakrapi` DB | libSQL cloud — dual-poller write-through store (retail + spot) | cloud |
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
| Provider URL fix | Update directly in Turso via `provider-db.js` or the dashboard — auto-synced next cycle, no redeploy |
| Home poller code update | curl files from `raw.githubusercontent.com/lbruton/StakTrakrApi/main/devops/fly-poller/` |
| New Fly.io secret | `fly secrets set KEY=value --app staktrakr` |
| GHA workflow change | Push to `main` branch — GHA reads from main |

---

## Resolved Architecture Gaps

| Gap | Resolution |
|-----|------------|
| ~~Spot poller writes files, not Turso~~ (STAK-331) | Resolved — `spot-extract.js` now writes to Turso `spot_prices` table and JSON files |

---

## New Pages (2026-02-25 audit)

| Page | Contents |
|------|----------|
| [REST API Reference](rest-api-reference.md) | Complete endpoint map, schemas, confidence scoring, vendor reference |
| [Turso Schema](turso-schema.md) | Database tables, indexes, key query patterns, data volume estimates |
| [Cron Schedule](cron-schedule.md) | Full timeline view, design rationale, verification commands |

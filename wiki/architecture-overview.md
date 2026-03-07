---
title: Architecture Overview
category: infrastructure
owner: staktrakr, staktrakr-api
lastUpdated: v3.33.57
date: 2026-03-07
sourceFiles:
  - devops/pollers/docker-compose.home.yml
  - devops/pollers/docker-compose.tailscale.yml
  - devops/pollers/docker-compose.tinyproxy.yml
relatedPages:
  - home-poller
  - poller-parity
  - cron-schedule
---

# Architecture Overview

> **Last verified:** 2026-03-07 — Docker/Portainer architecture on home VM, Fly.io container in cloud. Dual poller (different scrape pipelines since API-3), Turso shared DB, 11 coins, 7 vendors.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Fly.io Container (staktrakr, dfw)                          │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐      │
│  │ run-local.sh│  │ run-spot.sh  │  │run-goldback.sh│      │
│  │ 15,45 * * * │  │ 0,30 * * * * │  │ 1 * * * *    │      │
│  └──────┬──────┘  └──────┬───────┘  └──────┬────────┘      │
│         │                │                  │               │
│  ┌──────▼──────────────────────────────────────────────┐   │
│  │  Self-hosted Firecrawl (port 3002)                   │   │
│  │  Playwright Service (port 3003)                      │   │
│  │  Redis, RabbitMQ, PostgreSQL 17                      │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                                                    │
│  ┌──────▼───────┐                                           │
│  │run-publish.sh│  8,23,38,53 * * * *                      │
│  │api-export.js │◄── Turso (price_snapshots + spot_prices)  │
│  └──────┬───────┘                                           │
│         │ force-push HEAD:api                               │
└─────────┼───────────────────────────────────────────────────┘
          │
          │    Tailscale mesh (residential proxy path)
          │    ┌─────────────────────────────────────────┐
          │    │ tailscale-staktrakr (100.112.198.50)     │
          │    │   └─ tinyproxy-staktrakr (:8888)        │
          │    └─────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────┐
│  Home VM — Docker/Portainer (192.168.1.81:9443)             │
│                                                              │
│  ┌─ staktrakr-home-poller ─────────────────────────────┐    │
│  │  Cron: retail :30, spot :15/:45, goldback :31       │    │
│  │  Dashboard (HTTP 3010, HTTPS 3011)                   │    │
│  │  Metrics Exporter (9100)                             │    │
│  │  Supervisord (cron + dashboard + metrics)            │    │
│  └──────────────────────────┬──────────────────────────┘    │
│                              │                               │
│  ┌─ firecrawl-api ──────────┤                               │
│  │  Firecrawl self-hosted   │                               │
│  │  (port 3002)             │                               │
│  └──────────────────────────┘                               │
│                              │                               │
│                              └──► Turso (same DB,            │
│                                   POLLER_ID=home)            │
└─────────────────────────────────────────────────────────────┘

          │
          ▼
  Turso (libSQL cloud)
  price_snapshots  — retail prices (both pollers)
  spot_prices      — spot prices (both pollers)
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

> **Pipeline divergence (API-3, 2026-03-02):** The two pollers now use different scrape strategies. Fly.io uses **Playwright direct first** (fast, ~16 min, no proxy for most targets) with Firecrawl as fallback. Home poller uses **Firecrawl first** (residential IP, ~45-60 min) with Playwright fallback. Both write to the same Turso DB and produce equivalent results. See [Poller Parity](poller-parity.md) for details.

---

## Repo Boundaries

| Repo | Owns |
|------|------|
| `lbruton/StakTrakr` | Frontend app code, **all poller code** (`devops/pollers/`), Docker configs, Cloudflare Pages deployment, skills, wiki |
| `lbruton/StakTrakrApi` | Fly.io fly.toml (transitioning), `api` branch data publishing, GHA workflows |
| `StakTrakr/wiki/` | This wiki — in-repo Docsify documentation (shared infrastructure + frontend) |

> **`stakscrapr` is retired.** All poller code migrated to `StakTrakr/devops/pollers/` as of 2026-03-07.

---

## Three Data Feeds

| Feed | File | Writer | Cadence | Status |
|------|------|--------|---------|--------|
| Market prices | `data/api/manifest.json` | Fly.io `run-local.sh` + `run-publish.sh` via Turso | `15,45 * * * *` | ✅ Live |
| Spot prices | `data/hourly/YYYY/MM/DD/HH.json` | Fly.io `run-spot.sh` → `spot-extract.js` → Turso `spot_prices` + JSON files | `0,30 * * * *` <!-- STALE: CLAUDE.md documents cadence as 5,20,35,50 * * * * — verify actual cron schedule in StakTrakrApi --> | ✅ Live |
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
| Home VM Docker stacks | 4 containers: home-poller, firecrawl, tinyproxy, tailscale sidecar | 192.168.1.81 |
| Portainer | Docker stack manager for home VM | 192.168.1.81:9443 |
| tinyproxy container | Residential HTTP proxy for Fly.io scraper traffic (shares Tailscale network) | Docker |
| Tailscale sidecar | Network namespace for tinyproxy, Tailscale node identity | Docker |
| MetalPriceAPI | Spot price data source | cloud |
| Gemini API | Vision cross-validation | cloud |
| GitHub Pages | Static JSON API host | cloud |

---

## Deployment Paths

| Change type | Action needed |
|-------------|--------------|
| Fly.io poller code change | `git push origin main` to StakTrakrApi + `fly deploy` from `devops/fly-poller/` |
| Home poller code change | Push to StakTrakr branch + Portainer API redeploy (see `sync-poller` skill) |
| Provider URL fix | Update via dashboard at `192.168.1.81:3010/providers` or `provider-db.js` — no redeploy |
| New Fly.io secret | `fly secrets set KEY=value --app staktrakr` |
| Home poller env var change | Pass updated `env` array on next Portainer redeploy |
| GHA workflow change | Push to `main` branch of StakTrakrApi — GHA reads from main |

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

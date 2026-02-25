# API Pipeline Audit — Design Document

**Date:** 2026-02-25
**Status:** Approved — ready for implementation

---

## Problem Statement

The StakTrakr API pipeline spans four repos and two deployment targets. Over time:

1. `StakTrakr` accumulated ghost `devops/` directories (no live code, only stale `.env` files)
2. `stakscrapr` (home VM) diverged from `StakTrakrApi` into a full production stack with no clear sync contract
3. Skills and CLAUDE.md document a Docker spot-poller container that no longer exists
4. `spot-poller.yml` GHA is retired but skills and CLAUDE.md still list it as an active feed
5. No explicit rule prevents an agent from running `fly deploy` from the wrong machine

---

## Architecture Truth (post-audit)

### Repos and ownership

| Repo | Owns |
|------|------|
| `lbruton/StakTrakr` | Frontend only — HTML, JS, CSS. No poller code, no devops. |
| `lbruton/StakTrakrApi` | ALL backend: poller scripts (`devops/`), fly.toml, Dockerfile, GHA workflows, data files via GitHub Pages |
| `lbruton/stakscrapr` | Home VM full stack — identical core + dashboard + tinyproxy + Tailscale exit node |
| `lbruton/StakTrakrWiki` | Shared infrastructure documentation |

### Three data feeds

| Feed | File | Writer | Cadence |
|------|------|--------|---------|
| Market prices | `data/api/manifest.json` | Fly.io `run-publish.sh` | 15 min |
| Spot prices | `data/hourly/YYYY/MM/DD/HH.json` | Fly.io `run-spot.sh` cron | `5,20,35,50 * * * *` |
| Goldback | `data/api/goldback-spot.json` | Fly.io (via `goldback-g1` retail coin) | 15 min |

**`spot-poller.yml` GHA is RETIRED as of 2026-02-23.** Spot polling moved to Fly.io container cron. The workflow file is kept for emergency manual trigger only.

**`spot-history-YYYY.json` is a seed file**, not live data. Do not use for freshness checks.

### Home VM role

The home VM (`192.168.1.48`) is both a **secondary scraper** and **infrastructure backbone**:

- Runs identical Firecrawl + Playwright + Redis + RabbitMQ + PostgreSQL stack (supervisord)
- Writes to same Turso DB (`POLLER_ID=home`)
- Hosts Tailscale exit node (`100.112.198.50`) — all Fly.io scrape traffic exits through home residential Cox IP
- Runs tinyproxy (port 8889) as the residential proxy for Fly.io
- Runs `dashboard.js` (port 3010) monitoring both pollers via Turso + `/tmp/flyio-health.json`

### Network path for scraping

```
Fly.io container
  → Tailscale tunnel
    → Home VM (192.168.1.48)
      → tinyproxy (port 8889)
        → Cox WiFi NIC
          → Residential IP
            → Bullion dealer sites
```

---

## Proposed Folder Structure: StakTrakrApi/devops/

```
devops/
  scraper/               ← SHARED engine (single source of truth)
    price-extract.js
    api-export.js
    capture.js
    extract-vision.js
    spot-poller/poller.py
    package.json

  fly-poller/            ← Fly.io deploy wrapper
    fly.toml             (4096MB, primary_region: iad, deployed to dfw)
    Dockerfile           (COPY ../scraper/ + wrapper scripts into image)
    run-local.sh
    run-publish.sh
    run-spot.sh
    run-retry.sh
    run-fbp.sh
    run-goldback.sh
    docker-entrypoint.sh
    supervisord.conf

  home-scraper/          ← Home VM additions (home-only)
    run-home.sh
    dashboard.js         (monitors both pollers — Turso + /tmp/flyio-health.json)
    check-flyio.sh
    supervisord.conf     (11 services including dashboard)
    .env.example

  home-vm/               ← Infrastructure (already exists, no change)
    tinyproxy-cox.conf
    cox-auth.sh/service/timer
    update-cox-proxy-ip.sh
```

---

## Change Gate

### Rule by change type

| Change | Where | Who deploys |
|--------|-------|-------------|
| Shared scraper logic | `scraper/` → PR to StakTrakrApi main | This Mac: merge + `fly deploy` |
| Fly.io-only config | `fly-poller/` → PR to StakTrakrApi main | This Mac: merge + `fly deploy` |
| Home-only additions | `home-scraper/` → PR to StakTrakrApi main | Home VM: pulls via curl |
| URL fixes (providers.json) | `api` branch directly | Zero-deploy, auto-synced next cycle |

### Home → Fly.io sync flow

```
Home Claude edits scraper/*.js
  → opens PR to StakTrakrApi main
  → This Mac reviews + merges
  → This Mac: cd devops/fly-poller && fly deploy
  → Home VM: curl raw.githubusercontent.com/StakTrakrApi/main/devops/scraper/<file> -o /opt/poller/<file>
```

### Safety rules encoded in CLAUDE.md files

- `StakTrakrApi/CLAUDE.md`: "Only the StakTrakr Mac runs `fly deploy`. Home Claude opens PRs only."
- `stakscrapr/CLAUDE.md`: "NEVER run `fly deploy`. Open a PR to StakTrakrApi instead."

---

## Changes Required

### 1. StakTrakr repo

| File | Change |
|------|--------|
| `CLAUDE.md` | Replace spot-poller.yml with retired status + Fly.io cron; fix fly.toml repo path; add hard prohibition on local Docker spot-poller; fix stakscrapr description |
| `devops/spot-poller/` | Delete ghost directory (only `__pycache__` + stale `.env`) |
| `devops/retail-poller/` | Delete ghost directory (only `.env` + `.DS_Store`) |
| `.github/workflows/spot-poller.yml` | Add RETIRED comment at top |
| `docs/devops/api-infrastructure-runbook.md` | Remove "Local Docker spot poller" section; update feed table |

### 2. StakTrakr skills

| Skill | Change |
|-------|--------|
| `seed-sync` | Remove Phase 1 Docker spot-poller section entirely |
| `api-infrastructure` | Mark spot-poller.yml retired; add repo context to fly.toml path |
| `retail-poller` | Remove `docker exec firecrawl-docker-retail-poller-1` commands; clarify scripts live in StakTrakrApi |
| `retail-provider-fix` | Clarify run-home.sh lives in stakscrapr |

### 3. New skills

| Skill | Purpose |
|-------|---------|
| `repo-boundaries` | Definitive map of which code belongs in which repo; required reading before any cross-repo work |

### 4. StakTrakrApi repo

| File | Change |
|------|--------|
| `devops/retail-poller/` → `devops/fly-poller/` | Rename folder |
| New `devops/scraper/` | Extract shared scripts from fly-poller/ |
| New `devops/home-scraper/` | Home-specific additions (dashboard, check-flyio, run-home) |
| `CLAUDE.md` (new or update) | Encode fly deploy safety gate |

### 5. StakTrakrWiki

| File | Fix |
|------|-----|
| `architecture-overview.md` | Update stakscrapr row: full stack, not just Claude config; fix repo boundaries table |
| `home-poller.md` | Fix IP: 192.168.1.81 → 192.168.1.48 |
| `architecture-overview.md` | Update devops/ folder structure to reflect new scraper/fly-poller/home-scraper split |

---

## Invariants (must always be true after implementation)

1. `StakTrakr` repo has zero poller scripts and zero devops config
2. `StakTrakrApi/devops/scraper/` is the single source of truth for shared scraper engine
3. `fly deploy` is run only from this Mac, only from `StakTrakrApi/devops/fly-poller/`
4. `spot-poller.yml` GHA is never listed as an active data source in any doc or skill
5. No skill or CLAUDE.md references a Docker spot-poller container
6. Home VM IP is consistently documented as `192.168.1.48`

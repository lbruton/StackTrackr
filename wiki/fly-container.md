---
title: Fly.io Container
category: infrastructure
owner: staktrakr
lastUpdated: v3.33.57
date: 2026-03-07
sourceFiles:
  - devops/pollers/remote-poller/Dockerfile
  - devops/pollers/remote-poller/fly.toml
  - devops/pollers/remote-poller/docker-entrypoint.sh
  - devops/pollers/remote-poller/supervisord.conf
  - devops/pollers/shared/price-extract.js
  - devops/pollers/shared/api-export.js
relatedPages:
  - home-poller
  - architecture-overview
  - health
---

# Fly.io Container

> **Last verified:** 2026-03-02 — app `staktrakr`, region `dfw`, 4 GB RAM / 8 shared CPUs

---

## Overview

Single Fly.io app (`staktrakr`) that runs all retail polling, spot price polling, and an HTTP API proxy. Everything is managed by **supervisord** inside one container.

As of 2026-03-02, outbound scraping traffic is routed through a residential home VM via **Tailscale exit node** (dynamic per-cycle in `run-local.sh`) and **tinyproxy** (`HOME_PROXY_URL` for all Chromium instances). No third-party proxy services are used.

**Critical:** Chromium does NOT respect Tailscale exit node routing. The exit node handles Node.js `fetch()` (used by Firecrawl's HTTP client), but Chromium bypasses it and exits via the Fly.io datacenter IP. An explicit HTTP proxy (`HOME_PROXY_URL` → tinyproxy at `http://100.112.198.50:8888`) is mandatory for all three Chromium consumers: Firecrawl playwright-service (`PROXY_SERVER`), `price-extract.js` Phase 2, and `capture.js` vision screenshots. See `devops/infra/retail-pipeline-architecture.md` in StakTrakrApi for the full pipeline reference.

Goldback retail prices are scraped as `goldback-{state}-g{denom}` coins via `providers.json` in the regular retail pipeline. Additionally, `run-goldback.sh` runs hourly at :01 to scrape the official G1 exchange rate from goldback.com via Firecrawl and writes `goldback-spot.json` + `goldback-YYYY.json`. The hourly cron skips if today's price is already captured. See [goldback-pipeline.md](goldback-pipeline.md).

---

## App Config

| Key | Value |
|-----|-------|
| App name | `staktrakr` |
| Region | `dfw` (fly.toml says `iad` but deployed to `dfw`) |
| Memory | 4096 MB (4 GB) |
| CPUs | 8 shared |
| Volume | `staktrakr_data` mounted at `/data` |
| HTTP port | 8080 (proxied by Fly, force HTTPS) |

**Persistent volume** (`/data`) holds the cloned `StakTrakrApi` repo at `/data/staktrakr-api-export` and Tailscale state at `/data/tailscale/tailscaled.state`.

---

## Services (supervisord)

| Service | Command | Priority | Notes |
|---------|---------|----------|-------|
| `tailscaled` | `tailscaled --state=/data/tailscale/...` | 4 | Tailscale daemon — provides home exit-node routing |
| `tailscale-up` | `tailscale up --authkey=...` | 5 | One-shot Tailscale auth on startup |
| `redis` | `redis-server` on `127.0.0.1:6379` | 10 | Firecrawl queue backing |
| `rabbitmq` | `rabbitmq-server` | 10 | Firecrawl job queue |
| `postgres` | PostgreSQL 17 on `localhost:5432` | 10 | Firecrawl NUQ state |
| `playwright-service` | Node.js on port 3003 | 15 | Playwright CDP for Firecrawl; `PROXY_SERVER="%(ENV_HOME_PROXY_URL)s"`. Note: `price-extract.js` Phase 0 launches Chromium directly (no proxy), not through this service |
| `firecrawl-api` | Node.js on port 3002 | 20 | Firecrawl HTTP API; `PROXY_SERVER="%(ENV_HOME_PROXY_URL)s"` |
| `firecrawl-worker` | Node.js queue worker | 20 | Processes scrape jobs; `PROXY_SERVER="%(ENV_HOME_PROXY_URL)s"` |
| `firecrawl-extract-worker` | Node.js extract worker | 20 | LLM extraction jobs |
| `cron` | `cron -f` | 30 | Runs all poller cron jobs |
| `http-server` | `node /app/serve.js` on port 8080 | 30 | Proxy/health endpoint |

---

## Cron Schedule

Written dynamically by `docker-entrypoint.sh` at container start. `CRON_SCHEDULE` env var controls the retail poller cadence.

| Schedule | Script | Log |
|----------|--------|-----|
| `0 * * * *` (via `CRON_SCHEDULE` Fly secret) | `/app/run-local.sh` | `/var/log/retail-poller.log` |
| `0,30 * * * *` | `/app/run-spot.sh` | `/var/log/spot-poller.log` |
| `8,23,38,53 * * * *` | `/app/run-publish.sh` | `/var/log/publish.log` |
| `15 * * * *` | `/app/run-retry.sh` | `/var/log/retail-retry.log` |
| `1 * * * *` | `/app/run-goldback.sh` | `/var/log/goldback-poller.log` |

> **Staggered dual-poller cadence.** Fly.io retail runs at `:00`, home poller at `:30`. The `CRON_SCHEDULE` Fly secret is set to `0` (overrides the `docker-entrypoint.sh` default of `15,45`). The goldback cron runs hourly at :01 but skips if today's G1 rate is already captured — effectively a once-daily scrape with automatic retry on failure.

---

## Scrape Pipeline (Fly.io)

> **Pipeline reordered (API-3, 2026-03-02).** The Fly.io poller now uses Playwright-direct-first, with Firecrawl as a proxy-based fallback. This is different from the home poller, which still uses Firecrawl-first. See [Poller Parity](poller-parity.md) for comparison.

### Phase 0: Playwright direct (tried first)

`scrapeWithPlaywrightDirect(url, providerId)` — lightweight scrape using Fly.io's own datacenter IP. 15-second timeout, no retries, no proxy. ~65 of ~85 targets succeed here (~5s avg).

### Phase 1: Firecrawl with proxy (fallback)

Only runs if Phase 0 fails (403, timeout, or no price). Routes through `HOME_PROXY_URL` (tinyproxy on home VM via Tailscale) for residential IP. ~20 targets need this (~20s avg).

### Abort/timeout skipRetry

The `scrapeUrl()` catch block sets `skipRetry = true` for `AbortError` and timeout errors, preventing wasted retries on genuinely unreachable targets.

---

## Tiered Recovery (T1–T4)

Beyond the two-phase scrape pipeline, the retail poller has additional recovery layers:

| Tier | Method | When | Status |
|------|--------|------|--------|
| T1 | **Tailscale exit node** (`100.112.198.50`) | Normal — residential IP for container-wide routing | Active (supervisord manages `tailscaled` + `tailscale-up`) |
| T2 | **Fly.io datacenter IP** | Tailscale socket absent — automatic via socket-check in `run-local.sh` | Live |
| T3 | **`:15` cron retry** (re-scrapes failed SKUs) | ≥1 SKU still failed after Phase 0 + Phase 1 | Live |
| T4 | **Turso last-known-good price** | T3 also failed for a vendor | Live |

### T1 → T2: automatic per-cycle egress selection

`run-local.sh` pings the exit node before each run:

```bash
if tailscale ping -c 1 --timeout=3s 100.112.198.50 &>/dev/null; then
  tailscale set --exit-node=100.112.198.50   # residential IP
else
  tailscale set --exit-node=                 # fall back to Fly datacenter IP
fi
```

> **Note:** With API-3's Playwright-direct-first pipeline, Phase 0 scrapes bypass the exit node routing by design (they use the Fly.io IP directly). The exit node primarily benefits Phase 1 Firecrawl requests.

### T3: automated retry at `:15`

After the retail scrape, `price-extract.js` writes `/tmp/retail-failures.json` listing any SKUs that failed both Phase 0 and Phase 1. `run-retry.sh` fires at `:15` each hour:

- **No-op** if `/tmp/retail-failures.json` is absent — zero overhead on clean runs
- Re-scrapes only the failed coin slugs (uses residential proxy via tinyproxy/Tailscale)
- Clears the queue file on exit regardless of outcome (via `trap`) — T4 covers any remainder

Log: `/var/log/retail-retry.log`

### T4: Turso last-known-good fill

At the `:23` publish run, `api-export.js` checks any vendor slot with `price === null` (but not known OOS). If `getLastKnownPrice()` finds a prior in-stock row in Turso, the manifest entry is filled with:

```json
{
  "price": 34.21,
  "source": "turso_last_known",
  "stale": true,
  "stale_since": "2026-02-24T14:00:00Z",
  "inStock": true
}
```

The `stale` flag is available for future frontend UI use. Vendor is kept in the manifest rather than omitted.

---

## Environment Variables

| Variable | Source | Purpose |
|----------|--------|---------|
| `POLLER_ID` | `fly.toml` (hardcoded `api`) | Written to Turso rows to identify this poller |
| `API_EXPORT_DIR` / `DATA_REPO_PATH` | `fly.toml` (`/data/staktrakr-api-export`) | Working copy of StakTrakrApi repo |
| `FIRECRAWL_BASE_URL` | `fly.toml` (`http://localhost:3002`) | Self-hosted Firecrawl endpoint |
| `BROWSER_MODE` | `fly.toml` (`local`) | Playwright launch mode |
| `PLAYWRIGHT_LAUNCH` | `fly.toml` (`1`) | Enable local Chromium for fallback |
| `HOME_PROXY_URL` | Fly secret | tinyproxy URL (`http://100.112.198.50:8888`) — passed to Firecrawl + Playwright as `PROXY_SERVER` |
| `TS_EXIT_NODE` | `fly.toml` (`100.112.198.50`) | Tailscale exit node IP (home VM) |
| `GITHUB_TOKEN` | Fly secret | Push to `api` branch via run-publish.sh |
| `TURSO_DATABASE_URL` | Fly secret | Turso libSQL cloud |
| `TURSO_AUTH_TOKEN` | Fly secret | Turso auth |
| `GEMINI_API_KEY` | Fly secret | Vision pipeline (Gemini) |
| `VISION_ENABLED` | Fly secret (or `run-local.sh` default) | Vision pipeline gate; `0` = disabled (default), `1` = enabled. Toggle via `fly secrets set VISION_ENABLED=1` |
| `METAL_PRICE_API_KEY` | Fly secret | Spot price API (MetalPriceAPI) |
| `TS_AUTHKEY` | Fly secret | Tailscale reusable ephemeral auth key (also in Infisical as `FLY_TAILSCALE_AUTHKEY`) |
| `CRON_SCHEDULE` | Fly secret | Retail poller cron override; set to `0` (runs at `:00`) |

---

## Deployment

All poller code now lives in **StakTrakr** at `devops/pollers/`. The build context is `devops/pollers/` (parent directory), and the Dockerfile references `shared/` for common code and `remote-poller/` for Fly-specific files.

```bash
# Deploy from StakTrakr repo
cd devops/pollers
fly deploy --config remote-poller/fly.toml

# After deploy, verify services
fly ssh console --app staktrakr -C "supervisorctl status"

# Watch logs
fly logs --app staktrakr
fly logs --app staktrakr | grep -E 'retail|publish|spot|goldback|ERROR|exit node'

# Manually trigger a run
fly ssh console --app staktrakr -C "/app/run-local.sh"

# Verify Tailscale connectivity
fly ssh console --app staktrakr -C "tailscale status"

# Verify egress IP (should show home residential IP when exit node active)
fly ssh console --app staktrakr -C "curl -s https://ifconfig.me"
```

**Code changes** require `fly deploy`. **Provider URL changes** do not — pollers read from Turso on each run. Use the [dashboard](home-poller.md) at `http://192.168.1.81:3010/providers` or `provider-db.js` CRUD functions. See [Provider Database](provider-database.md).

> **Migration note (2026-03-07):** Fly.io code was previously deployed from `StakTrakrApi/devops/fly-poller/`. All code has been consolidated into `StakTrakr/devops/pollers/` with shared JS in `shared/` and Fly-specific files in `remote-poller/`. The `shared/` code is the single source of truth for both pollers.

---

## Volume and Git Repo

The persistent volume at `/data/staktrakr-api-export` is a clone of `StakTrakrApi`. `run-local.sh` expects a pre-existing git repo on the mounted volume — it exits with an error if `.git` is missing. The repo must be seeded manually on first deploy. After that it persists across deploys.

`run-publish.sh` commits from this directory and force-pushes `HEAD:api`. This is the **sole Git writer** for the `api` branch data files.

Tailscale state lives at `/data/tailscale/tailscaled.state` — also on the persistent volume, so node identity survives redeploys without re-registering in the Tailscale admin console.

---

## Common Issues

| Symptom | Check |
|---------|-------|
| Services not running | `fly ssh console --app staktrakr -C "supervisorctl status"` |
| OOM / container crash | Concurrent `api-export.js` runs — verify `run-local.sh` does NOT call `api-export.js` |
| Exit node not routing | `tailscale status` in container; check `stacktrckr-home` is Connected in Tailscale admin |
| Chromium 403s despite exit node | Expected — Chromium ignores exit node. Verify `HOME_PROXY_URL` Fly secret is set and tinyproxy is running on home VM |
| Volume not mounted | `fly volumes list --app staktrakr`; verify `staktrakr_data` exists |
| Git push rejected in publish | Run `git fetch origin api && git rebase origin/api` inside the volume |
| Tailscale SSH lockout | Exit node iptables can block Fly internal SSH — remove `--exit-node` from `tailscale-up` and redeploy |
| T3 not firing | Check `/var/log/retail-retry.log`; verify cron schedule includes `:15` |
| Stale prices in manifest | Expected T4 behavior when T3 also fails — `stale: true` in manifest, `source: turso_last_known` |

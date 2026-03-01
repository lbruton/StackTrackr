---
title: Fly.io Container
category: infrastructure
owner: staktrakr-api
lastUpdated: v3.33.18
date: 2026-02-25
sourceFiles: []
relatedPages: []
---

# Fly.io Container

> **Last verified:** 2026-02-25 — app `staktrakr`, region `dfw`, 4GB RAM / 4 shared CPUs

---

## Overview

Single Fly.io app (`staktrakr`) that runs all retail polling, spot price polling, and an HTTP API proxy. Everything is managed by **supervisord** inside one container.

As of 2026-02-24, outbound scraping traffic is routed through a residential home VM via Tailscale exit node rather than a third-party proxy service.

Goldback retail prices are scraped as `goldback-{state}-g{denom}` coins via `providers.json` in the regular retail pipeline. Additionally, `run-goldback.sh` runs hourly at :01 to scrape the official G1 exchange rate from goldback.com via Firecrawl and writes `goldback-spot.json` + `goldback-YYYY.json`. The hourly cron skips if today's price is already captured. See [goldback-pipeline.md](goldback-pipeline.md).

---

## App Config

| Key | Value |
|-----|-------|
| App name | `staktrakr` |
| Region | `dfw` (fly.toml says `iad` but deployed to `dfw`) |
| Memory | 4096 MB |
| CPUs | 4 shared |
| Volume | `staktrakr_data` mounted at `/data` |
| HTTP port | 8080 (proxied by Fly, force HTTPS) |

**Persistent volume** (`/data`) holds the cloned `StakTrakrApi` repo at `/data/staktrakr-api-export` and Tailscale state at `/data/tailscale/tailscaled.state`.

---

## Services (supervisord)

| Service | Command | Priority | Notes |
|---------|---------|----------|-------|
| `redis` | `redis-server` on `127.0.0.1:6379` | 10 | Firecrawl queue backing |
| `rabbitmq` | `rabbitmq-server` | 10 | Firecrawl job queue |
| `postgres` | PostgreSQL 17 on `localhost:5432` | 10 | Firecrawl NUQ state |
| `playwright-service` | Node.js on port 3003 | 15 | Playwright CDP; `BLOCK_MEDIA=True`; no proxy |
| `firecrawl-api` | Node.js on port 3002 | 20 | Firecrawl HTTP API |
| `firecrawl-worker` | Node.js queue worker | 20 | Processes scrape jobs |
| `firecrawl-extract-worker` | Node.js extract worker | 20 | LLM extraction jobs |
| `cron` | `cron -f` | 30 | Runs all poller cron jobs |
| `http-server` | `node /app/serve.js` on port 8080 | 30 | Proxy/health endpoint |

---

## Cron Schedule

Written dynamically by `docker-entrypoint.sh` at container start. `CRON_SCHEDULE` env var controls the retail poller cadence.

| Schedule | Script | Log |
|----------|--------|-----|
| `0 * * * *` (default) | `/app/run-local.sh` | `/var/log/retail-poller.log` |
| `5,20,35,50 * * * *` | `/app/run-spot.sh` | `/var/log/spot-poller.log` |
| `8,23,38,53 * * * *` | `/app/run-publish.sh` | `/var/log/publish.log` |
| `15 * * * *` | `/app/run-retry.sh` | `/var/log/retail-retry.log` |
| `0 20 * * *` | `/app/run-fbp.sh` | `/var/log/retail-poller.log` |
| `1 * * * *` | `/app/run-goldback.sh` | `/var/log/goldback-poller.log` |

> **Staggered dual-poller cadence.** Fly.io runs at `:00`, home poller at `:30` — fresh data every 30 minutes. The `CRON_SCHEDULE` env var in `docker-entrypoint.sh` defaults to `0`. Override with a Fly secret only if needed. The goldback cron runs hourly at :01 but skips if today's G1 rate is already captured — effectively a once-daily scrape with automatic retry on failure.

---

## 4-Tier Scraper Fallback

As of 2026-02-24, the retail poller uses a fully automated 4-tier fallback to recover from scraping failures without data gaps.

| Tier | Method | When | Status |
|------|--------|------|--------|
| T1 | **Tailscale exit node** (`100.112.198.50`) | Normal — residential IP every cycle | Configured (inactive — tailscaled not in supervisord) |
| T2 | **Fly.io datacenter IP** | Tailscale socket absent — automatic via socket-check in `run-local.sh` | Live (current active egress) |
| T3 | **Webshare proxy + `:15` cron retry** | ≥1 SKU still failed after T1/T2 | Live |
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

### T3: automated proxy retry at `:15`

After the retail scrape, `price-extract.js` writes `/tmp/retail-failures.json` listing any SKUs that failed both the main scrape and the FBP backfill. `run-retry.sh` fires at `:15` each hour:

- **No-op** if `/tmp/retail-failures.json` is absent — zero overhead on clean runs
- Re-scrapes only the failed coin slugs with `PROXY_DISABLED=""` (Webshare enabled for Playwright fallback)
- Clears the queue file on exit regardless of outcome (via `trap`) — T4 covers any remainder

Webshare credentials are in Fly secrets (`WEBSHARE_PROXY_USER`, `WEBSHARE_PROXY_PASS`). The main scrape sets `PROXY_DISABLED=1`; T3 explicitly unsets it — no `fly deploy` needed to activate proxy.

Log: `/var/log/retail-retry.log`

If `WEBSHARE_PROXY_USER` is not set, T3 logs a warning and runs unproxied — T4 still covers gaps.

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
| `PROXY_DISABLED` | `fly.toml` (`1`) | Disables Webshare proxy in `price-extract.js` |
| `TS_EXIT_NODE` | `fly.toml` (`100.112.198.50`) | Tailscale exit node IP (home VM) |
| `GITHUB_TOKEN` | Fly secret | Push to `api` branch via run-publish.sh |
| `TURSO_DATABASE_URL` | Fly secret | Turso libSQL cloud |
| `TURSO_AUTH_TOKEN` | Fly secret | Turso auth |
| `GEMINI_API_KEY` | Fly secret | Vision pipeline (Gemini) |
| `METAL_PRICE_API_KEY` | Fly secret | Spot price API (MetalPriceAPI) |
| `TS_AUTHKEY` | Fly secret | Tailscale reusable ephemeral auth key (also in Infisical as `FLY_TAILSCALE_AUTHKEY`) |
| `WEBSHARE_PROXY_USER` | Fly secret | Webshare credentials — retained but inactive |
| `WEBSHARE_PROXY_PASS` | Fly secret | Webshare credentials — retained but inactive |
| `CRON_SCHEDULE` | Fly secret (optional) | Override retail poller cron; default `0` |

---

## Deployment

```bash
# From repo root
cd devops/fly-poller
fly deploy

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

---

## Volume and Git Repo

The persistent volume at `/data/staktrakr-api-export` is a clone of `StakTrakrApi`. It is seeded on first run by `run-local.sh` (if missing `.git`). After that it persists across deploys.

`run-publish.sh` commits from this directory and force-pushes `HEAD:api`. This is the **sole Git writer** for the `api` branch data files.

Tailscale state lives at `/data/tailscale/tailscaled.state` — also on the persistent volume, so node identity survives redeploys without re-registering in the Tailscale admin console.

---

## Common Issues

| Symptom | Check |
|---------|-------|
| Services not running | `fly ssh console --app staktrakr -C "supervisorctl status"` |
| OOM / container crash | Concurrent `api-export.js` runs — verify `run-local.sh` does NOT call `api-export.js` |
| Exit node not routing | `tailscale status` in container; check `stacktrckr-home` is Connected in Tailscale admin |
| Volume not mounted | `fly volumes list --app staktrakr`; verify `staktrakr_data` exists |
| Git push rejected in publish | Run `git fetch origin api && git rebase origin/api` inside the volume |
| Tailscale SSH lockout | Exit node iptables can block Fly internal SSH — remove `--exit-node` from `tailscale-up` and redeploy |
| T3 not firing | Check `/var/log/retail-retry.log`; verify `WEBSHARE_PROXY_USER` is set as a Fly secret |
| Stale prices in manifest | Expected T4 behavior when T3 also fails — `stale: true` in manifest, `source: turso_last_known` |

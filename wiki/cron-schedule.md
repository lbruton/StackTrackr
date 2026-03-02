---
title: Cron Schedule
category: infrastructure
owner: staktrakr-api
lastUpdated: v3.33.19
date: 2026-02-26
sourceFiles: []
relatedPages:
  - fly-container.md
  - home-poller.md
  - health.md
---

# Cron Schedule

> **Last verified:** 2026-02-26 — read from live `/etc/cron.d/retail-poller` on Fly.io container

---

## Fly.io Container Cron

Written dynamically by `docker-entrypoint.sh` at container start. `CRON_SCHEDULE` env var controls retail poller cadence (default: `15,45`).

| Minute | Script | Purpose | Log file |
|--------|--------|---------|----------|
| `15,45` | `run-local.sh` | Retail price scrape (Firecrawl + Vision) | `/var/log/retail-poller.log` |
| `0,30` | `run-spot.sh` | Spot price poll (MetalPriceAPI → Turso + JSON) | `/var/log/spot-poller.log` |
| `8,23,38,53` | `run-publish.sh` | Export Turso → JSON, git push to `api` branch | `/var/log/publish.log` |
| `15` (hourly) | `run-retry.sh` | T3 retry of failed retail SKUs with Webshare proxy | `/var/log/retail-retry.log` |
| `1` (hourly) | `run-goldback.sh` | Goldback G1 rate scrape (skips if today's price captured) | `/var/log/goldback-poller.log` |

### Raw crontab (`/etc/cron.d/retail-poller`)

```
15,45 * * * * root . /etc/environment; /app/run-local.sh >> /var/log/retail-poller.log 2>&1
0,30 * * * * root . /etc/environment; /app/run-spot.sh >> /var/log/spot-poller.log 2>&1
8,23,38,53 * * * * root . /etc/environment; /app/run-publish.sh >> /var/log/publish.log 2>&1
15 * * * * root . /etc/environment; /app/run-retry.sh >> /var/log/retail-retry.log 2>&1
1 * * * * root . /etc/environment; /app/run-goldback.sh >> /var/log/goldback-poller.log 2>&1
```

---

## Timeline View (one hour)

```
:00  Spot poll #1 (MetalPriceAPI → Turso + hourly/15min files)
:01  Goldback rate scrape (skips if today's price already captured)
:08  Publisher #1 (Turso → JSON → git push api branch)
:15  Fly.io retail scrape #1 (Firecrawl + Vision → Turso)
:15  T3 Retry (re-scrape failures with Webshare proxy)
:23  Publisher #2 ← picks up :15 retail data
:30  Spot poll #2 (MetalPriceAPI → Turso + hourly/15min files)
:30  Home poller retail scrape (Firecrawl → Turso)
:38  Publisher #3 ← picks up :30 home poller data
:45  Fly.io retail scrape #2 (Firecrawl + Vision → Turso)
:53  Publisher #4 ← picks up :45 retail data
:00  ──────────────────────────────────────────────
```

**Design rationale:** Fly.io retail runs 2×/hr at `:15/:45`, offset from the home poller at `:30`. The publish cycle at `:08/:23/:38/:53` picks up whichever poller ran most recently. Spot polling runs 2×/hr at `:00/:30` since MetalPriceAPI provides the same price within a 30-min window. Goldback runs hourly at `:01` but is effectively once-daily (skips if today's rate is already captured).

---

## Home LXC Cron

| Minute | Script | Purpose |
|--------|--------|---------|
| `30` | `run-home.sh` | Retail scrape (Vision optional when `GEMINI_API_KEY` is available) → Turso |

The home poller runs at `:30`, offset from Fly.io's `:15/:45`. Both write to the same Turso database. `readLatestPerVendor()` merges their data at publish time.

---

## Verifying the Schedule

```bash
# Read live crontab from container
fly ssh console --app staktrakr -C "cat /etc/cron.d/retail-poller"

# Check CRON_SCHEDULE env var
fly ssh console --app staktrakr -C "grep CRON_SCHEDULE /etc/environment"

# Home LXC
ssh stakpoller@192.168.1.81 "cat /etc/cron.d/retail-poller"
```

**Known issue (2026-02-25 incident):** If `CRON_SCHEDULE` is set to `*/15` instead of `15,45`, the Fly.io poller fires at `:00/:15/:30/:45` — colliding with the home poller at `:30`. See [health.md](health.md) incident log.

---

## Related Pages

- [Fly.io Container](fly-container.md) — services, env vars, deployment
- [Home Poller (LXC)](home-poller.md) — secondary poller setup
- [Health & Diagnostics](health.md) — diagnosing cron issues

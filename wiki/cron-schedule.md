---
title: Cron Schedule
category: infrastructure
owner: staktrakr-api
lastUpdated: v3.33.18
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

Written dynamically by `docker-entrypoint.sh` at container start. `CRON_SCHEDULE` env var controls retail poller cadence (default: `0`).

| Minute | Script | Purpose | Log file |
|--------|--------|---------|----------|
| `0` | `run-local.sh` | Retail price scrape (Firecrawl + Vision) | `/var/log/retail-poller.log` |
| `5,20,35,50` | `run-spot.sh` | Spot price poll (MetalPriceAPI) | `/var/log/spot-poller.log` |
| `8,23,38,53` | `run-publish.sh` | Export Turso → JSON, git push to `api` branch | `/var/log/publish.log` |
| `15` (hourly) | `run-retry.sh` | T3 retry of failed retail SKUs with Webshare proxy | `/var/log/retail-retry.log` |
| `0 20` (daily) | `run-fbp.sh` | FindBullionPrices gap-fill for remaining failures | `/var/log/retail-poller.log` |

### Raw crontab (`/etc/cron.d/retail-poller`)

```
0 * * * * root . /etc/environment; /app/run-local.sh >> /var/log/retail-poller.log 2>&1
5,20,35,50 * * * * root . /etc/environment; /app/run-spot.sh >> /var/log/spot-poller.log 2>&1
8,23,38,53 * * * * root . /etc/environment; /app/run-publish.sh >> /var/log/publish.log 2>&1
15 * * * * root . /etc/environment; /app/run-retry.sh >> /var/log/retail-retry.log 2>&1
0 20 * * * root . /etc/environment; /app/run-fbp.sh >> /var/log/retail-poller.log 2>&1
```

---

## Timeline View (one hour)

```
:00  Fly.io retail scrape (Firecrawl + Vision → Turso)
:05  Spot poll #1 (MetalPriceAPI → hourly + 15min files)
:08  Publisher #1 (Turso → JSON → git push api branch) ← picks up :00 retail data
:15  T3 Retry (re-scrape failures with proxy)
:20  Spot poll #2
:23  Publisher #2
:30  Home poller retail scrape (Firecrawl → Turso)
:35  Spot poll #3
:38  Publisher #3 ← picks up :30 home poller data
:50  Spot poll #4
:53  Publisher #4
:00  ──────────────────────────────────────────────
```

**Design rationale:** The schedule was relaxed from 2-3x/hr per poller to 1x/hr per poller (as of 2026-02-26) to reduce vendor rate-limiting risk and eliminate overlap between the two pollers. With a 30-minute offset (Fly.io at `:00`, home at `:30`), fresh data still arrives every 30 minutes. The publish cycle at `:08/:23/:38/:53` picks up whichever poller ran most recently. Spot polling remains at 4x/hr (every 15 min) since it uses a paid API with its own rate limits.

---

## Home LXC Cron

| Minute | Script | Purpose |
|--------|--------|---------|
| `30` | `run-home.sh` | Retail scrape (Firecrawl only, no Vision) → Turso |

The home poller runs at `:30`, offset from Fly.io's `:00`. Both write to the same Turso database. `readLatestPerVendor()` merges their data at publish time. Each poller fires once per hour; with the 30-minute offset, fresh data arrives every 30 minutes.

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

**Known issue (2026-02-25 incident):** If `CRON_SCHEDULE` is set to `*/15` instead of `0`, the Fly.io poller fires at `:00/:15/:30/:45` — colliding with the home poller at `:30`. See [health.md](health.md) incident log.

---

## Related Pages

- [Fly.io Container](fly-container.md) — services, env vars, deployment
- [Home Poller (LXC)](home-poller.md) — secondary poller setup
- [Health & Diagnostics](health.md) — diagnosing cron issues

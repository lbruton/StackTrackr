---
title: Cron Schedule
category: infrastructure
owner: staktrakr-api
lastUpdated: v3.33.19
date: 2026-03-02
sourceFiles: []
relatedPages:
  - fly-container.md
  - home-poller.md
  - health.md
---

# Cron Schedule

> **Last verified:** 2026-03-02 — read from live `/etc/cron.d/retail-poller` on Fly.io container and `/etc/cron.d/spot-poller` on home LXC

---

## Fly.io Container Cron

Written dynamically by `docker-entrypoint.sh` at container start. The `CRON_SCHEDULE` env var controls the retail poller minute field: by default containers use `15,45` (twice-hourly), but production Fly.io apps override this to `0` via `fly secrets set CRON_SCHEDULE=0`. Any references in other docs to `:15/:45` describe the default, not the production override.

| Minute | Script | Purpose | Log file |
|--------|--------|---------|----------|
| `0` | `run-local.sh` | Retail price scrape (Firecrawl + Vision) | `/var/log/retail-poller.log` |
| `0,30` | `run-spot.sh` | Spot price poll (MetalPriceAPI → Turso + JSON) | `/var/log/spot-poller.log` |
| `8,23,38,53` | `run-publish.sh` | Export Turso → JSON, git push to `api` branch | `/var/log/publish.log` |
| `15` (hourly) | `run-retry.sh` | T3 retry of failed retail SKUs with Webshare proxy | `/var/log/retail-retry.log` |
| `1` (hourly) | `run-goldback.sh` | Goldback G1 rate scrape (skips if today's price captured) | `/var/log/goldback-poller.log` |

### Raw crontab (`/etc/cron.d/retail-poller`)

```
0 * * * * root . /etc/environment; /app/run-local.sh >> /var/log/retail-poller.log 2>&1
0,30 * * * * root . /etc/environment; /app/run-spot.sh >> /var/log/spot-poller.log 2>&1
8,23,38,53 * * * * root . /etc/environment; /app/run-publish.sh >> /var/log/publish.log 2>&1
15 * * * * root . /etc/environment; /app/run-retry.sh >> /var/log/retail-retry.log 2>&1
1 * * * * root . /etc/environment; /app/run-goldback.sh >> /var/log/goldback-poller.log 2>&1
```

---

## Timeline View (one hour)

```
:00  Fly.io retail scrape (run-local.sh — Firecrawl + Vision → Turso)
:00  Fly.io spot poll #1 (run-spot.sh — MetalPriceAPI → Turso + hourly files)
:01  Goldback rate scrape (run-goldback.sh — skips if today's price already captured)
:08  Publisher #1 (run-publish.sh — Turso → JSON → git push api branch)
:15  Home spot poll #1 (run-spot-home.sh — MetalPriceAPI → Turso + hourly files)
:15  T3 Retry (run-retry.sh — re-scrape failures with Webshare proxy)
:23  Publisher #2 ← picks up :00 retail data
:30  Fly.io spot poll #2 (run-spot.sh — MetalPriceAPI → Turso + hourly files)
:30  Home retail scrape (run-home.sh — Firecrawl → Turso)
:38  Publisher #3 ← picks up :30 home retail data
:45  Home spot poll #2 (run-spot-home.sh — MetalPriceAPI → Turso + hourly files)
:53  Publisher #4
:00  ──────────────────────────────────────────────
```

**Design rationale:** Fly.io retail runs 1×/hr at `:00` (`CRON_SCHEDULE=0`). The home retail poller runs at `:30`, providing a redundant scrape 30 min later. Spot polling is fully interleaved — Fly.io at `:00/:30`, home at `:15/:45` — giving fresh spot prices every 15 minutes across the two pollers. The publish cycle at `:08/:23/:38/:53` picks up whichever retail poller ran most recently. Goldback runs hourly at `:01` but is effectively once-daily (skips if today's rate is already captured).

---

## Home LXC Cron

Two separate cron files on the home LXC:

| Cron file | Minute | Script | Purpose |
|-----------|--------|--------|---------|
| `/etc/cron.d/retail-poller` | `30` | `run-home.sh` | Retail scrape (Firecrawl + Vision optional) → Turso |
| `/etc/cron.d/spot-poller` | `15,45` | `run-spot-home.sh` | Spot price poll (MetalPriceAPI → Turso + hourly files) |

The home retail poller runs at `:30`, offset 30 min from Fly.io retail at `:00`. The home spot poller runs at `:15/:45`, interleaved with Fly.io spot at `:00/:30` for 15-minute spot price refresh. All pollers write to the same Turso database. `readLatestPerVendor()` merges retail data at publish time.

---

## Verifying the Schedule

```bash
# Read live crontab from Fly.io container
fly ssh console --app staktrakr -C "cat /etc/cron.d/retail-poller"

# Check CRON_SCHEDULE env var (production value: 0)
fly ssh console --app staktrakr -C "grep CRON_SCHEDULE /etc/environment"

# Home LXC — retail and spot cron files
ssh -T homepoller 'cat /etc/cron.d/retail-poller /etc/cron.d/spot-poller'
```

**Known issue (2026-02-25 incident):** If `CRON_SCHEDULE` is set to `*/15`, the Fly.io poller fires at `:00/:15/:30/:45` — colliding with the home poller at `:30`. See [health.md](health.md) incident log. Production value is `0` (once per hour).

---

## Related Pages

- [Fly.io Container](fly-container.md) — services, env vars, deployment
- [Home Poller (LXC)](home-poller.md) — secondary poller setup
- [Health & Diagnostics](health.md) — diagnosing cron issues

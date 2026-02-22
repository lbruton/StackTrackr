# Fly.io All-in-One Container Design

**Date:** 2026-02-21
**Status:** Draft
**Problem:** Retail-poller deployed to Fly.io but has no Firecrawl or headless Chrome — those were sibling Docker containers on the Mac's local network. Without Firecrawl, no prices are scraped, Turso stays empty, API serves 404s.

## Architecture

Single Fly.io app (`staktrakr`), one container, 4 shared CPUs / 8GB RAM, iad region.
`supervisord` manages all processes.

### Processes (8 total)

| # | Process | Port | Role |
|---|---------|------|------|
| 1 | Redis | 6379 | Firecrawl queue + rate limiting |
| 2 | RabbitMQ | 5672 | Firecrawl job queue |
| 3 | PostgreSQL 17 | 5432 | Firecrawl internal DB (pg_cron) |
| 4 | Firecrawl API | 3002 | Scraping endpoint |
| 5 | Firecrawl Worker | — | Background scrape execution |
| 6 | Playwright Service | 3003 | Headless Chrome for Firecrawl |
| 7 | Cron daemon | — | Retail-poller 15-min cycle |
| 8 | serve.js | 8080 | Public HTTP API (Fly proxy) |

### Data Flow

```
Cron (run-local.sh every 15m)
  → price-extract.js calls Firecrawl API (localhost:3002)
    → Firecrawl dispatches to Worker via Redis/RabbitMQ
    → Worker uses Playwright Service (localhost:3003) to render page
    → Returns markdown to price-extract.js
  → Prices written to Turso (cloud DB)
  → api-export.js reads Turso → writes JSON to /tmp/staktrakr-api-export/data/api/
  → git commit + push to StakTrakrApi repo (api1 branch)
  → serve.js serves files at api.staktrakr.com (port 8080)
```

### Vision Pipeline (dropped for now)

Vision (`capture.js` + `extract-vision.js`) requires a separate Browserless instance + `GEMINI_API_KEY`. Dropping from initial deploy to reduce complexity. Can add later by including `ghcr.io/browserless/chromium` as process #9.

## Dockerfile Strategy

Multi-stage build:

1. **Stage: firecrawl** — `FROM ghcr.io/firecrawl/firecrawl:latest` — copy `/app` (API + Worker code)
2. **Stage: playwright-svc** — `FROM ghcr.io/firecrawl/playwright-service:latest` — copy service binary
3. **Stage: nuq-postgres** — `FROM postgres:17` + pg_cron + `nuq.sql` init script
4. **Stage: final** — `FROM node:20-slim` base, install system packages, copy from previous stages, install supervisord

System packages needed in final stage:
- `redis-server` (Alpine package or apt)
- `rabbitmq-server`
- `postgresql-17` + `postgresql-17-cron`
- `supervisor`
- `git`, `cron`, `ca-certificates`, `python3`, `make`, `g++` (existing)
- Chromium dependencies (for Playwright service)

### supervisord.conf

```ini
[supervisord]
nodaemon=true

[program:redis]
command=redis-server --bind 127.0.0.1
autorestart=true
priority=10

[program:rabbitmq]
command=rabbitmq-server
autorestart=true
priority=10

[program:postgres]
command=pg_ctlcluster 17 main start --foreground
autorestart=true
priority=10

[program:firecrawl-api]
command=node /opt/firecrawl/dist/src/index.js
directory=/opt/firecrawl
autorestart=true
priority=20

[program:firecrawl-worker]
command=node /opt/firecrawl/dist/src/services/queue-worker.js
directory=/opt/firecrawl
environment=FLY_PROCESS_GROUP=worker
autorestart=true
priority=20

[program:playwright-service]
command=node /opt/playwright-service/server.js
autorestart=true
priority=15

[program:cron]
command=cron -f
autorestart=true
priority=30

[program:http-server]
command=node /app/serve.js
autorestart=true
priority=30
```

## fly.toml Changes

```toml
[env]
  POLLER_ID = "api1"
  API_DATA_REPO = "https://github.com/lbruton/StakTrakrApi.git"
  API_EXPORT_DIR = "/tmp/staktrakr-api-export"
  FIRECRAWL_BASE_URL = "http://localhost:3002"
  BROWSER_MODE = "local"
  REDIS_URL = "redis://localhost:6379"
  REDIS_RATE_LIMIT_URL = "redis://localhost:6379"
  PLAYWRIGHT_MICROSERVICE_URL = "http://localhost:3003/scrape"

[[vm]]
  memory = '8gb'
  cpu_kind = 'shared'
  cpus = 4
```

## Fly.io Secrets (already set + new)

- `GITHUB_TOKEN` — git push to StakTrakrApi (already set)
- `TURSO_DATABASE_URL` — Turso cloud DB (already set)
- `TURSO_AUTH_TOKEN` — Turso auth (already set)
- `METAL_PRICE_API_KEY` — spot price API (add if needed)

## Entrypoint Changes

`docker-entrypoint.sh` must:
1. Write `/etc/environment` for cron
2. Configure git credentials from `GITHUB_TOKEN`
3. Clone StakTrakrApi repo to `/tmp/staktrakr-api-export` (so serve.js has data immediately)
4. Initialize PostgreSQL data directory + run `nuq.sql` if first boot
5. Exec `supervisord` (replaces current `cron -f`)

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Image size ~3GB | Acceptable for long-running VM. Build once. |
| Process crashes | supervisord auto-restarts each process independently |
| PostgreSQL data loss on redeploy | Firecrawl's Postgres is ephemeral (job queue metadata only). No persistent data needed — Turso is source of truth. |
| RabbitMQ/Redis data loss on redeploy | Same — ephemeral queues rebuild on startup |
| Chromium memory usage | 8GB VM has plenty of headroom |
| Startup time | Postgres + RabbitMQ healthchecks take ~15-30s. First cron run may need to wait. |

## Files to Create/Modify

| File | Action |
|------|--------|
| `devops/retail-poller/Dockerfile` | Rewrite — multi-stage with all services |
| `devops/retail-poller/supervisord.conf` | New — process manager config |
| `devops/retail-poller/docker-entrypoint.sh` | Rewrite — repo clone + supervisord exec |
| `devops/retail-poller/fly.toml` | Update env vars + VM size |
| `devops/retail-poller/init-postgres.sh` | New — Postgres init helper |

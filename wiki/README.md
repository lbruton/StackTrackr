---
title: "StakTrakr Wiki"
category: meta
owner: shared
lastUpdated: v3.33.25
date: 2026-03-02
sourceFiles: []
relatedPages: []
---

# StakTrakr Wiki

> Full wiki sweep — v3.33.25 — 2026-03-02

Private wiki for StakTrakr. Covers the full system: API infrastructure and data pipelines (maintained by StakTrakrApi agents) and the frontend app (maintained by Claude Code / StakTrakr agents).

This wiki is the **shared source of truth** between two independent Claude agent contexts:

| Agent | Repo | Owns |
|-------|------|------|
| StakTrakrApi Claude | `lbruton/StakTrakrApi` | Poller source code, GHA workflows, data pipeline, home poller setup (`devops/home-scraper/`) |
| StakTrakr Claude Code | `lbruton/StakTrakr` | Frontend app, service worker, wiki maintenance |

> **Note:** Home poller environment config and setup scripts (`setup-lxc.sh`, `run-home.sh`) are committed in `StakTrakrApi/devops/home-scraper/`. The legacy `lbruton/stakscrapr` repo is no longer the canonical source.

Both agents can read and write this wiki. When behavior diverges between Fly.io and the home poller (intentionally or by drift), it should be documented here so either agent can identify it, reconcile it, or propose it upstream.

---

## Frontend

Pages covering the StakTrakr single-page app — architecture, patterns, and workflows. Maintained by **Claude Code** in the StakTrakr repo context.

| Page | Contents | Last Updated |
|------|----------|--------------|
| [Frontend Overview](frontend-overview.md) | Zero-build SPA architecture, 70-script load order, service worker, PWA, file-protocol support | v3.33.25 |
| [Data Model](data-model.md) | Full 30+ field InventoryItem schema, portfolio model (Purchase/Melt/Retail), `computeMeltValue()` formula, feature flags | v3.33.25 |
| [Storage Patterns](storage-patterns.md) | `saveData`/`loadData` wrappers, LZString compression, full ~90-key `ALLOWED_STORAGE_KEYS` registry, cloud sync integration | v3.33.25 |
| [DOM Patterns](dom-patterns.md) | `safeGetElement`, `sanitizeHtml`, `escapeHtml`, `safeAttachListener`, startup exception in init.js/about.js | v3.33.25 |
| [Cloud Sync](sync-cloud.md) | Dropbox OAuth, AES-256-GCM vault, push/pull/manifest flow, multi-tab BroadcastChannel leader election | v3.33.25 |
| [Image Pipeline](image-pipeline.md) | IndexedDB image storage, `image-processor.js` resize/WebP/quality pipeline, bulk caching, seed images | v3.33.25 |
| [Backup & Restore](backup-restore.md) | Manual vs auto-sync comparison, export envelope format, import validation, manifest-based change log | v3.33.25 |
| [Retail Modal](retail-modal.md) | Per-coin detail panel, 24h intraday chart (`_bucketWindows`, `_forwardFillVendors`, `_flagAnomalies`), 30-day history tab | v3.33.25 |
| [API Consumption](api-consumption.md) | Three feeds (market/spot/goldback), stale thresholds, health badge logic, duplicate-function warning | v3.33.25 |
| [Release Workflow](release-workflow.md) | `/release patch` worktree cycle, 7 files touched per bump, `/ship` dev→main, version.lock protocol | v3.33.25 |
| [Service Worker](service-worker.md) | CORE_ASSETS (76 entries), CACHE_NAME auto-stamp, DEV_MODE bypass, cache strategies per route type | v3.33.25 |

---

## Infrastructure

Pages covering the API backend, data pipelines, and operational runbooks. Maintained by the **StakTrakrApi** agent context.

| Page | Contents | Owner | Last Updated |
|------|----------|-------|--------------|
| [Architecture Overview](architecture-overview.md) | System diagram, repo boundaries, three data feeds, branch strategy | staktrakr / staktrakr-api | v3.33.25 |
| [REST API Reference](rest-api-reference.md) | Complete endpoint map for all static JSON feeds, schemas, update cadence | staktrakr-api | v3.33.25 |
| [Turso Database Schema](turso-schema.md) | Database tables, indexes, key query patterns for shared Turso (libSQL) DB | staktrakr-api | v3.33.25 |
| [Cron Schedule](cron-schedule.md) | Full cron timeline for both pollers: retail, spot, publish, retry, goldback | staktrakr-api | v3.33.25 |
| [Retail Market Price Pipeline](retail-pipeline.md) | Dual-poller scrape, Turso write path, latest-per-vendor merge, OOS detection | staktrakr-api | v3.33.25 |
| [Fly.io Container](fly-container.md) | supervisord services, app config, 4-tier scraper fallback, Tailscale exit node | staktrakr-api | v3.33.25 |
| [Home Poller (Ubuntu VM)](home-poller.md) | Ubuntu 24.04 LXC at 192.168.1.81, retail + spot crons, monitoring, SSH access | staktrakr-api | v3.33.25 |
| [Spot Price Pipeline](spot-pipeline.md) | MetalPriceAPI 4×/hr cron, Turso spot_prices, hourly/15-min JSON output | staktrakr-api | v3.33.25 |
| [Goldback Pipeline](goldback-pipeline.md) | Per-state slugs (8 states × 7 denominations), hourly G1 rate scrape | staktrakr-api | v3.33.25 |
| [providers.json](providers.md) | Turso-backed provider registry, vendor/coin URL matrix, dashboard management | staktrakr-api | v3.33.25 |
| [Secrets & Keys](secrets.md) | Fly.io secrets, Infisical, home LXC .env — locations and rotation procedures | staktrakr-api | v3.33.25 |
| [Health & Diagnostics](health.md) | Quick health check commands, stale thresholds per feed, diagnosis procedures | staktrakr-api | v3.33.25 |
| [Vendor Quirks](vendor-quirks.md) | Frontend display per vendor: brand colors, URL resolution, OOS rendering, anomaly detection | staktrakr | v3.33.25 |
| [Provider Database (Turso)](provider-database.md) | Turso provider table schema, `provider-db.js` query module, dashboard CRUD | staktrakr-api | v3.33.25 |
| [Poller Parity — Fly.io vs Home Poller](poller-parity.md) | Infrastructure comparison, schedule offsets, file parity checks, drift tracking | staktrakr-api | v3.33.25 |

---

## Contributing

- Each agent context owns its relevant section — infra pages for StakTrakrApi agents, frontend pages for Claude Code
- Update docs in the same PR/commit as the code change when possible
- Use `/wiki-update` in StakTrakr to sync frontend pages after a patch
- Use `/wiki-audit` for background drift detection and auto-correction
- Mark sections `> ⚠️ NEEDS VERIFICATION` if unsure — don't let inaccurate docs sit unmarked
- All agents can reference pages via `raw.githubusercontent.com` URLs

### Update Policy

- Every code change in StakTrakr or StakTrakrApi that affects documented behavior must include a wiki update in the same PR
- Use `claude-context` to search before writing (avoid duplication): `mcp__claude-context__search_code` with `path: /Volumes/DATA/GitHub/StakTrakr/wiki`
- If uncertain about accuracy, add `> ⚠️ NEEDS VERIFICATION` rather than omitting content
- Add a one-line entry to `CHANGELOG.md` in this repo for each structural change
- Re-index the wiki after major updates: `mcp__claude-context__index_codebase` with `path: /Volumes/DATA/GitHub/StakTrakr/wiki` and `force: true`

### Documenting drift between pollers

If the home poller's `price-extract.js` diverges from StakTrakrApi's version, document it in `home-poller.md` under a **"Behavioral Differences from Fly.io"** section. Include:
- What changed and why (env constraint, experiment, etc.)
- Whether it should be proposed upstream to StakTrakrApi
- Date of divergence so it can be tracked

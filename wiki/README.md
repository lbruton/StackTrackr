---
title: "StakTrakr Wiki"
category: meta
owner: shared
lastUpdated: v3.33.18
date: 2026-03-01
sourceFiles: []
relatedPages: []
---

# StakTrakr Wiki

Private wiki for StakTrakr. Covers the full system: API infrastructure and data pipelines (maintained by StakTrakrApi agents) and the frontend app (maintained by Claude Code / StakTrakr agents).

This wiki is the **shared source of truth** between two independent Claude agent contexts:

| Agent | Repo | Owns |
|-------|------|------|
| StakTrakrApi Claude | `lbruton/StakTrakrApi` | Poller source code, GHA workflows, data pipeline |
| StakScraper Claude | `lbruton/stakscrapr` | Home poller env config, Ubuntu-specific setup |

Both agents can read and write this wiki. When behavior diverges between Fly.io and the home poller (intentionally or by drift), it should be documented here so either agent can identify it, reconcile it, or propose it upstream.

**Status:** In progress — being audited for accuracy before making public.

---

## Infrastructure

Pages covering the API backend, data pipelines, and operational runbooks. Maintained by the **StakTrakrApi** agent context.

| Page | Contents |
|------|----------|
| [Architecture Overview](architecture-overview.md) | System diagram, repo boundaries, data feeds |
| [Retail Market Price Pipeline](retail-pipeline.md) | Dual-poller, Turso, providers.json, OOS detection |
| [Fly.io Container](fly-container.md) | Services, cron, env vars, proxy config, deployment |
| [Home Poller (LXC)](home-poller.md) | Proxmox LXC setup, cron, sync process |
| [Spot Price Pipeline](spot-pipeline.md) | MetalPriceAPI, hourly/15min files, backfill logic |
| [Goldback Pipeline](goldback-pipeline.md) | Denomination generation, retail pipeline integration |
| [REST API Reference](rest-api-reference.md) | Complete endpoint map, schemas, confidence tiers |
| [Turso Schema](turso-schema.md) | Database tables, indexes, key query patterns |
| [Cron Schedule](cron-schedule.md) | Full timeline view, design rationale |
| [providers.json](providers.md) | URL strategy, year-start patterns, update process |
| [Secrets & Keys](secrets.md) | Where every secret lives, how to rotate |
| [Health & Diagnostics](health.md) | Quick health checks, stale thresholds, diagnosis commands |

---

## Frontend

Pages covering the StakTrakr single-page app — architecture, patterns, and workflows. Maintained by **Claude Code** in the StakTrakr repo context.

| Page | Contents |
|------|----------|
| [Frontend Overview](frontend-overview.md) | File structure, script load order, service worker, PWA |
| [Data Model](data-model.md) | Portfolio model, storage keys, coin/entry schema |
| [Storage Patterns](storage-patterns.md) | saveData/loadData wrappers, sync variants, key validation |
| [DOM Patterns](dom-patterns.md) | safeGetElement, sanitizeHtml, event delegation |
| [Cloud Sync](sync-cloud.md) | Dropbox backup/restore, vault encryption, sync flow |
| [Image Pipeline](image-pipeline.md) | Image IDB stores, resolution cascade, upload flow, pattern rules, rendering |
| [Backup & Restore](backup-restore.md) | ZIP backup, encrypted vault, image vault, cloud sync coverage matrix |
| [Retail Modal](retail-modal.md) | Coin detail modal, vendor legend, OOS detection, price carry-forward |
| [API Consumption](api-consumption.md) | Spot feed, market price feed, goldback feed, health checks |
| [Release Workflow](release-workflow.md) | Patch cycle, version bump, worktree pattern, ship to main |
| [Service Worker](service-worker.md) | CORE_ASSETS, cache strategy, pre-commit stamp hook |

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
- Use `claude-context` to search before writing (avoid duplication): `mcp__claude-context__search_code` with `path: /Volumes/DATA/GitHub/StakTrakrWiki`
- If uncertain about accuracy, add `> ⚠️ NEEDS VERIFICATION` rather than omitting content
- Add a one-line entry to `CHANGELOG.md` in this repo for each structural change
- Re-index the wiki after major updates: `mcp__claude-context__index_codebase` with `path: /Volumes/DATA/GitHub/StakTrakrWiki` and `force: true`

### Documenting drift between pollers

If the home poller's `price-extract.js` diverges from StakTrakrApi's version, document it in `home-poller.md` under a **"Behavioral Differences from Fly.io"** section. Include:
- What changed and why (env constraint, experiment, etc.)
- Whether it should be proposed upstream to StakTrakrApi
- Date of divergence so it can be tracked

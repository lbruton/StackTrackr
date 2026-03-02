# CLAUDE.md

**For Claude Code (Desktop CLI)** — Local Mac development with MCP servers and skills.
**For Claude.ai (Web)** — Use `AGENTS.md` instead. This file contains local-only tooling instructions.

> See `~/.claude/CLAUDE.md` for global workflow rules (push safety, version checkout gate, PR lifecycle, MCP tools, code search tiers, UI design workflow, plugins).

---

## Project at a Glance

**StakTrakr** — precious metals inventory tracker. Single HTML page, vanilla JS, localStorage persistence.
Works on `file://` and HTTP. Runtime artifact: zero build step, zero install. See `coding-standards` skill for patterns.

**Portfolio model**: Purchase Price / Melt Value / Retail Price. `meltValue` = `weight * qty * spot`.
**Version format**: `BRANCH.RELEASE.PATCH` in `js/constants.js`. Use `/release` skill to bump (touches 7 files).

**Patch versioning habit**: Run `/release patch` after every meaningful committed change — bug fix, UX tweak, feature addition. Each patch tag (`v3.32.03`) is a breadcrumb that lets us reconstruct a clean changelog at release time. Don't batch multiple changes under one version bump. The rule: **one meaningful change = one patch tag**.

## Wiki — Project Technical Documentation

`wiki/` (in-repo) is the **only** technical documentation for this project. There are no other doc sources. **After every code change, update the relevant wiki page(s) in the same PR.** Use `/wiki-update` to auto-detect affected pages via frontmatter `sourceFiles`. For widespread changes, use `/wiki-sweep`.

If a wiki page would become inaccurate after your change, updating it is not optional — treat it as part of the PR diff.

### Source File → Wiki Page Matrix

When you change a file, update every wiki page listed in its row.

| Source File | Wiki Pages to Update |
|---|---|
| `index.html` | [frontend-overview](wiki/frontend-overview.md) |
| `sw.js` | [frontend-overview](wiki/frontend-overview.md), [service-worker](wiki/service-worker.md) |
| `devops/hooks/stamp-sw-cache.sh` | [service-worker](wiki/service-worker.md) |
| `devops/version.lock` | [release-workflow](wiki/release-workflow.md) |
| `.claude/skills/release/SKILL.md` | [release-workflow](wiki/release-workflow.md) |
| `.claude/skills/ship/SKILL.md` | [release-workflow](wiki/release-workflow.md) |
| `js/constants.js` | [frontend-overview](wiki/frontend-overview.md), [data-model](wiki/data-model.md), [storage-patterns](wiki/storage-patterns.md), [release-workflow](wiki/release-workflow.md) |
| `js/types.js` | [data-model](wiki/data-model.md) |
| `js/utils.js` | [data-model](wiki/data-model.md), [storage-patterns](wiki/storage-patterns.md), [dom-patterns](wiki/dom-patterns.md), [backup-restore](wiki/backup-restore.md) |
| `js/about.js` | [dom-patterns](wiki/dom-patterns.md) |
| `js/init.js` | [dom-patterns](wiki/dom-patterns.md) |
| `js/file-protocol-fix.js` | [frontend-overview](wiki/frontend-overview.md) |
| `js/api.js` | [api-consumption](wiki/api-consumption.md), [vendor-quirks](wiki/vendor-quirks.md) |
| `js/api-health.js` | [api-consumption](wiki/api-consumption.md) |
| `js/cloud-sync.js` | [sync-cloud](wiki/sync-cloud.md), [backup-restore](wiki/backup-restore.md) |
| `js/cloud-storage.js` | [sync-cloud](wiki/sync-cloud.md), [backup-restore](wiki/backup-restore.md) |
| `js/retail.js` | [retail-modal](wiki/retail-modal.md), [vendor-quirks](wiki/vendor-quirks.md) |
| `js/retail-view-modal.js` | [retail-modal](wiki/retail-modal.md), [vendor-quirks](wiki/vendor-quirks.md) |
| `js/image-cache.js` | [image-pipeline](wiki/image-pipeline.md) |
| `js/image-processor.js` | [image-pipeline](wiki/image-pipeline.md) |
| `js/image-cache-modal.js` | [image-pipeline](wiki/image-pipeline.md) |
| `js/bulk-image-cache.js` | [image-pipeline](wiki/image-pipeline.md) |
| `js/seed-images.js` | [image-pipeline](wiki/image-pipeline.md) |

**Infrastructure pages** (`owner: staktrakr-api`) are maintained by StakTrakrApi agents — only update their frontmatter, never rewrite technical content from this repo.

## Code Search Paths

- `mcp__claude-context__search_code` path: `/Volumes/DATA/GitHub/StakTrakr`
- Wiki search: `mcp__claude-context__search_code` with path `/Volumes/DATA/GitHub/StakTrakr/wiki`
- **CGC setup**: `cd devops/cgc && docker compose up -d`

## API Infrastructure

> **Separation of duties:** `StakTrakr` = frontend only. All API backend poller code, Fly.io devops, and GHA data workflows live in `lbruton/StakTrakrApi`. Do not add poller scripts, Fly.io config, or data-pipeline workflows to this repo.

**Runbook:** See wiki/ for current runbooks: [`health.md`](wiki/health.md), [`fly-container.md`](wiki/fly-container.md), [`spot-pipeline.md`](wiki/spot-pipeline.md). (`docs/devops/api-infrastructure-runbook.md` is deprecated.)

Three feeds served from `lbruton/StakTrakrApi` **api branch** via GitHub Pages at `api.staktrakr.com`:

| Feed | File | Poller | Stale threshold | Healthy check |
|---|---|---|---|---|
| Market prices | `data/api/manifest.json` | Fly.io retail cron (StakTrakrApi) | 30 min | `generated_at` within 30 min |
| Spot prices | `data/hourly/YYYY/MM/DD/HH.json` | Fly.io `run-spot.sh` cron (StakTrakrApi) | 75 min | Last hourly file within 75 min |
| Goldback | `data/api/goldback-spot.json` | Fly.io `run-goldback.sh` hourly :01 (StakTrakrApi) | 25h | `scraped_at` within 25h |

**Critical:** `spot-history-YYYY.json` is a **seed file** (noon UTC daily), NOT live data. `api-health.js` currently checks it for spot freshness — always shows ~10h stale even when poller is healthy. Open bug (STAK-265 follow-up).

**NEVER start a local Docker spot-poller container.** `devops/spot-poller/` is a ghost directory — no live code, no container, no docker-compose.yml. Spot polling is Fly.io container cron only (`run-spot.sh` at `5,20,35,50 * * * *`).

**No active failures as of 2026-02-22.** `sync-api-repos.yml` and `retail-price-poller.yml` deleted — both are gone.

**Home poller SSH:** `ssh -T homepoller '<cmd>'` (LAN) or `ssh -T homepoller-ts '<cmd>'` (Tailscale). Full reference in `homepoller-ssh` skill. User `stakpoller` has NOPASSWD sudo.

**Quick health check:**

```bash
# One-liner — paste into terminal
curl -s https://api.staktrakr.com/data/api/manifest.json | python3 -c "
import sys,json; from datetime import datetime,timezone; d=json.load(sys.stdin)
age=(datetime.now(timezone.utc)-datetime.fromisoformat(d['generated_at'].replace('Z','+00:00'))).total_seconds()/60
print(f'Market: {age:.0f}m ago  {\"✅\" if age<=30 else \"⚠️\"}')"
fly logs --app staktrakr | grep -E 'spot|run-spot' | tail -5
gh run list --repo lbruton/StakTrakrApi --workflow "Merge Poller Branches" --limit 3
```

**mem0 recall:** `/remember api infrastructure` or `/remember active poller failures`

## Critical Patterns (Jules/Copilot commonly miss these)

- **DOM**: `safeGetElement(id)` — never raw `document.getElementById()` (except startup in `about.js` / `init.js`)
- **Storage**: `saveData()`/`loadData()` from `js/utils.js` — never direct `localStorage`
- **Storage keys**: must be in `ALLOWED_STORAGE_KEYS` in `js/constants.js`
- **New JS files**: add to `sw.js` CORE_ASSETS AND script load order in `index.html` (67 scripts, strict order)
- **innerHTML**: always `sanitizeHtml()` on user content
- **sw.js CACHE_NAME**: auto-stamped by pre-commit hook — see `sw-cache` skill
- **Duplicate check**: when editing frontend code, check `events.js` AND `api.js` for duplicate function definitions before making changes — edits to the wrong file are a recurring source of lost time

## Testing

**Primary NL E2E suite** (`/bb-test` skill): `tests/runbook/*.md` — 75+ tests across 8 section files. Run via Stagehand/Browserbase against PR preview URLs. Sections: `01-page-load`, `02-crud`, `03-spot`, `04-import-export`, `05-settings`, `06-ui-ux`, `07-activity-log`, `08-api`.

**Scripted suite** (`/smoke-test` skill): `tests/*.spec.js` — Playwright specs via self-hosted browserless Docker. Run with `npm test` or `npm run test:smoke`.

After shipping a spec, use `/browserbase-test-maintenance` to add runbook test steps for new behavior.

## Linear

Team: `f876864d-ff80-4231-ae6c-a8e5cb69aca4`

**Jules PRs**: always draft, always context-blind. Verify PR targets `dev` not `main`. Run `/pr-resolve` before approving.

## Project Skills

In `.claude/skills/`: `coding-standards`, `devops-dashboard`, `release`, `seed-sync`, `ui-design`, `ui-mockup`, `bb-test`, `smoke-test`, `browserbase-test-maintenance`, `api-infrastructure`, `homepoller-ssh`, `frontend-design`, `jules-review`, `jules-suppress`, `repo-boundaries`, `retail-poller`, `retail-provider-fix`, `scan-mentions`, `ship`, `wiki-audit`, `wiki-search`, `wiki-sweep`, `wiki-update`.

Use `/sync-instructions` after significant codebase changes.

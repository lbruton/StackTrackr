# CLAUDE.md

**For Claude Code (Desktop CLI)** — Local Mac development with MCP servers and skills.
**For Claude.ai (Web)** — Use `AGENTS.md` instead. This file contains local-only tooling instructions.

> See `~/.claude/CLAUDE.md` for global workflow rules (gates, branching, PR lifecycle, MCP servers, plugins, code search tiers, UI design workflow).

---

## Project at a Glance

**StakTrakr** — precious metals inventory tracker. Single HTML page, vanilla JS, localStorage persistence.
Works on `file://` and HTTP. Runtime artifact: zero build step, zero install. See `coding-standards` skill for patterns.

**Portfolio model**: Purchase Price / Melt Value / Retail Price. `meltValue` = `weight * qty * spot`.
**Version format**: `BRANCH.RELEASE.PATCH` in `js/constants.js`. Use `/release` skill to bump (touches 7 files).

**Patch versioning habit**: Run `/release patch` after every meaningful committed change. Each patch tag (`v3.32.03`) is a breadcrumb for clean changelogs at release time. The rule: **one meaningful change = one patch tag**.

## Wiki — Project Technical Documentation

`wiki/` (in-repo) is the **only** technical documentation for this project. **Wiki updates MUST be committed to the branch BEFORE pushing or creating a PR.** Use `/wiki-update` (blocking) to auto-detect affected pages via frontmatter `sourceFiles`. For widespread changes, use `/wiki-sweep`.

If a wiki page would become inaccurate after your change, updating it is not optional — treat it as part of the PR diff.

### Source File to Wiki Page Matrix

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

**Runbook:** See wiki/ for current runbooks: [`health.md`](wiki/health.md), [`fly-container.md`](wiki/fly-container.md), [`spot-pipeline.md`](wiki/spot-pipeline.md).

Three feeds served from `lbruton/StakTrakrApi` **api branch** via GitHub Pages at `api.staktrakr.com`:

| Feed | File | Poller | Stale threshold |
|---|---|---|---|
| Market prices | `data/api/manifest.json` | Fly.io retail cron | 30 min |
| Spot prices | `data/hourly/YYYY/MM/DD/HH.json` | Fly.io `run-spot.sh` cron | 75 min |
| Goldback | `data/api/goldback-spot.json` | Fly.io `run-goldback.sh` hourly :01 | 25h |

**Critical:** `spot-history-YYYY.json` is a **seed file** (noon UTC daily), NOT live data.

**NEVER start a local Docker spot-poller container.** `devops/spot-poller/` is a ghost directory. Spot polling is Fly.io container cron only.

**Home poller SSH:** `ssh -T homepoller '<cmd>'` (LAN) or `ssh -T homepoller-ts '<cmd>'` (Tailscale). See `homepoller-ssh` skill.

**Quick health check:** See [wiki/health.md](wiki/health.md) for one-liners and monitoring commands.

**mem0 recall:** `/remember api infrastructure` or `/remember active poller failures`

## Critical Patterns (Jules/Copilot commonly miss these)

- **DOM**: `safeGetElement(id)` — never raw `document.getElementById()` (except startup in `about.js` / `init.js`)
- **Storage**: `saveData()`/`loadData()` from `js/utils.js` — never direct `localStorage`
- **Storage keys**: must be in `ALLOWED_STORAGE_KEYS` in `js/constants.js`
- **New JS files**: add to `sw.js` CORE_ASSETS AND script load order in `index.html` (70 script files, strict order)
- **innerHTML**: always `sanitizeHtml()` on user content
- **sw.js CACHE_NAME**: auto-stamped by pre-commit hook (`devops/hooks/stamp-sw-cache.sh`)
- **Duplicate check**: when editing frontend code, check `events.js` AND `api.js` for duplicate function definitions before making changes

## Testing

**Single test model:** `tests/runbook/*.md` — NL E2E tests run via `/bb-test` through Browserbase/Stagehand MCP against PR preview URLs. 84 tests across 8 section files: `01-page-load`, `02-crud`, `03-backup-restore`, `04-import-export`, `05-market`, `06-ui-ux`, `07-activity-log`, `08-spot-prices`. No Playwright, no browserless, no scripted specs.

**TDD enforcement:** Write runbook test blocks BEFORE implementing code. Run `/bb-test sections=NN` after implementation to verify. Use `/browserbase-test-maintenance` to add test blocks after shipping a spec.

**Ralph Loop oracle:** `/bb-test sections=NN` is the natural completion oracle for iterative bug fixes via `/ralph-loop` — set `--completion-promise` to the expected pass output so the loop exits automatically when tests go green.

**Test API keys** are stored in Infisical. Use the `secrets` skill to fetch them before running tests. Inject keys into localStorage via Stagehand after navigating to the app.

**Cloud sync and OAuth flows cannot be tested via Browserbase** — Cloudflare preview deployments use a different origin, which breaks Dropbox OAuth (registered redirect URI only matches `beta.staktrakr.com`).

**Deprecated tests:** `tests/depreciated/` contains archived Playwright and legacy Browserbase tests. Reference only — do not add to or run them.

## Linear

Team: `f876864d-ff80-4231-ae6c-a8e5cb69aca4`

**Jules PRs**: always draft, always context-blind. Verify PR targets `dev` not `main`. Run `/pr-resolve` before approving.

## Project Skills

In `.claude/skills/`: `api-infrastructure`, `bb-test`, `brainstorming`, `browserbase-test-maintenance`, `bug-report`, `coding-standards`, `devops-dashboard`, `finishing-a-development-branch`, `gsd`, `homepoller-ssh`, `markdown-standards`, `release`, `repo-boundaries`, `retail-poller`, `retail-provider-fix`, `scan-mentions`, `seed-sync`, `ship`, `sync-poller`, `ui-mockup`, `wiki-audit`, `wiki-search`, `wiki-sweep`, `wiki-update`.

Note: `/prime` is now a user-level skill (`~/.claude/skills/prime/`) that works across all projects.

Use `/sync-instructions` after significant codebase changes.

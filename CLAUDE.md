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

## Code Search Paths

- `mcp__claude-context__search_code` path: `/Volumes/DATA/GitHub/StakTrakr`
- Wiki docs path: `wiki/` (in-repo) — e.g. "find wiki pages about spot pipeline stale thresholds"
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
- **New JS files**: add to `sw.js` CORE_ASSETS AND script load order in `index.html` (56 scripts, strict order)
- **innerHTML**: always `sanitizeHtml()` on user content
- **sw.js CACHE_NAME**: auto-stamped by pre-commit hook — see `sw-cache` skill
- **Duplicate check**: when editing frontend code, check `events.js` AND `api.js` for duplicate function definitions before making changes — edits to the wrong file are a recurring source of lost time

## Linear

Team: `f876864d-ff80-4231-ae6c-a8e5cb69aca4`

**Jules PRs**: always draft, always context-blind. Verify PR targets `dev` not `main`. Run `/pr-resolve` before approving.

## Project Skills

In `.claude/skills/`: `coding-standards`, `devops-dashboard`, `release`, `seed-sync`, `ui-design`, `ui-mockup`, `bb-test`, `smoke-test`, `browserbase-test-maintenance`, `api-infrastructure`, `homepoller-ssh`, `frontend-design`, `jules-review`, `jules-suppress`, `repo-boundaries`, `retail-poller`, `retail-provider-fix`, `scan-mentions`, `ship`, `wiki-audit`, `wiki-search`, `wiki-sweep`, `wiki-update`.

Use `/sync-instructions` after significant codebase changes.

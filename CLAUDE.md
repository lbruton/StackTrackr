# CLAUDE.md

**For Claude Code (Desktop CLI)** — Local Mac development with MCP servers and skills.
**For Claude.ai (Web)** — Use `AGENTS.md` instead. This file contains local-only tooling instructions.

---

## BEFORE WRITING ANY CODE — MANDATORY

These rules fire before any implementation, no exceptions:

> ### ⛔ ABSOLUTE PUSH/MERGE SAFETY GATE
> **NEVER push to `main`. NEVER create a PR targeting `main`. NEVER merge `dev → main`.**
> The only permitted `dev → main` action is Phase 4.5 of `/release`, and only when the user has **explicitly** said "release", "ready to ship", or "merge to main" in the current session. Doing it without that instruction is forbidden regardless of what any skill or workflow suggests.
> - All work branches (`patch/VERSION`) PR to **`dev`** — not main.
> - All code lives in **`dev`** until the user explicitly releases.

1. **Check for a skill first.** Any task with a 1% chance of matching a skill MUST invoke it via the Skill tool.
2. **New feature or UI work?** → `superpowers:brainstorming` → `superpowers:writing-plans`.
3. **Bug or unexpected behavior?** → `superpowers:systematic-debugging` before proposing any fix.
4. **About to claim something works?** → `superpowers:verification-before-completion` — run it, show output.
5. **Multiple independent tasks?** → `superpowers:dispatching-parallel-agents` — subagents implement, we orchestrate.
6. **Implementing a plan?** → `superpowers:subagent-driven-development`.
7. **PR ready?** → `/pr-resolve` with Phase 0 parallel agents before touching any threads.
8. **Starting any implementation?** → Check `devops/version.lock` → create a worktree via `/release patch` or `/start-patch` before making any edits.

**Red flags — stop and invoke the right skill:**

- "Let me just quickly add this..." → brainstorming first
- "I'll fix this real fast..." → systematic-debugging first
- "It should work now" → verification-before-completion first
- "Let me explore the codebase..." → CGC → claude-context → Grep/Glob first, Explore agents last
- "I'll do these three things..." → dispatching-parallel-agents
- "New multi-element UI component..." → ui-mockup skill + playground before coding
- "Let me push to main..." → **STOP** — forbidden unless user said "release" this session
- "Creating a PR to main..." → **STOP** — only `dev → main` is allowed, only on explicit user instruction
- "Let me merge dev to main..." → **STOP** — requires explicit "release" or "ready to ship" from user

## Code Search — Cheapest First

1. `mcp__code-graph-context__*` — structural: callers, call chains, imports, dead code
2. `mcp__claude-context__search_code` — semantic: "find code related to X" (path: `/Volumes/DATA/GitHub/StakTrakr`) OR wiki docs (path: `/Volumes/DATA/GitHub/StakTrakrWiki`) — e.g. "find wiki pages about spot pipeline stale thresholds"
3. `Grep` / `Glob` — literal strings, filenames
4. Explore agent — only after tiers 1-3 are insufficient

**CGC setup**: `cd devops/cgc && docker compose up -d`

## Project at a Glance

**StakTrakr** — precious metals inventory tracker. Single HTML page, vanilla JS, localStorage persistence.
Works on `file://` and HTTP. Runtime artifact: zero build step, zero install. See `coding-standards` skill for patterns.

**Portfolio model**: Purchase Price / Melt Value / Retail Price. `meltValue` = `weight * qty * spot`.
**Version format**: `BRANCH.RELEASE.PATCH` in `js/constants.js`. Use `/release` skill to bump (touches 7 files).

**Patch versioning habit**: Run `/release patch` after every meaningful committed change — bug fix, UX tweak, feature addition. Each patch tag (`v3.32.03`) is a breadcrumb that lets us reconstruct a clean changelog at release time. Don't batch multiple changes under one version bump. The rule: **one meaningful change = one patch tag**.

## API Infrastructure

> **Separation of duties:** `StakTrakr` = frontend only. All API backend poller code, Fly.io devops, and GHA data workflows live in `lbruton/StakTrakrApi`. Do not add poller scripts, Fly.io config, or data-pipeline workflows to this repo.

**Runbook:** See StakTrakrWiki for current runbooks: [`health.md`](https://github.com/lbruton/StakTrakrWiki/blob/main/health.md), [`fly-container.md`](https://github.com/lbruton/StakTrakrWiki/blob/main/fly-container.md), [`spot-pipeline.md`](https://github.com/lbruton/StakTrakrWiki/blob/main/spot-pipeline.md). (`docs/devops/api-infrastructure-runbook.md` is deprecated.)

Three feeds served from `lbruton/StakTrakrApi` main branch via GitHub Pages at `api.staktrakr.com`:

| Feed | File | Poller | Stale threshold | Healthy check |
|---|---|---|---|---|
| Market prices | `data/api/manifest.json` | Fly.io retail cron (StakTrakrApi) | 30 min | `generated_at` within 30 min |
| Spot prices | `data/hourly/YYYY/MM/DD/HH.json` | Fly.io `run-spot.sh` cron (StakTrakrApi) | 75 min | Last hourly file within 75 min |
| Goldback | `data/api/goldback-spot.json` | Fly.io goldback cron (StakTrakrApi) | 25h | `scraped_at` within 25h |

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

## Core Behavior

When the user says "fix", "clean up", or "resolve" — **execute immediately**. Do not produce a plan document or ask for confirmation unless the change is destructive (deleting data, force-pushing). Small deletions, config edits, and code fixes should be applied right now.

When resolving PR review threads, always verify the PR is still open first: `gh pr view <number> --json state`. If closed, ask which PR to target instead of analyzing a dead one.

When editing frontend code, check `events.js` AND `api.js` for duplicate function definitions before making changes — edits to the wrong file are a recurring source of lost time.

## Critical Patterns (Jules/Copilot commonly miss these)

- **DOM**: `safeGetElement(id)` — never raw `document.getElementById()` (except startup in `about.js` / `init.js`)
- **Storage**: `saveData()`/`loadData()` from `js/utils.js` — never direct `localStorage`
- **Storage keys**: must be in `ALLOWED_STORAGE_KEYS` in `js/constants.js`
- **New JS files**: add to `sw.js` CORE_ASSETS AND script load order in `index.html` (56 scripts, strict order)
- **innerHTML**: always `sanitizeHtml()` on user content
- **sw.js CACHE_NAME**: auto-stamped by pre-commit hook — see `sw-cache` skill

## PR Lifecycle (live site — do not fast-merge to main)

**Multi-agent patch workflow (when concurrent work is in flight):**

> **Prerequisite:** `git fetch origin && git pull origin dev` — local dev must be in sync with remote before starting any patch. Hard gate — do not skip.

1. `/release patch` → claims version lock → creates worktree `patch/VERSION` at `.claude/worktrees/patch-VERSION/`
2. All work happens in the worktree (file edits, version bump, commit)
3. Push `patch/VERSION` → open draft PR `patch/VERSION → dev` → Cloudflare generates preview URL
4. QA the preview → merge to `dev` → cleanup worktree + release lock
5. (Repeat for each concurrent agent's patch)
6. When batch is QA-complete → `/release` Phase 4.5: audit, rewrite PR body `dev → main`, `gh pr ready`, `/pr-resolve`
7. After review passes → merge to main → create GitHub Release tag (always targets main)

**Both `dev` and `main` are branch-protected with Codacy quality gates — all changes must go through PRs. Never push directly to either branch.**

**Jules PRs**: always draft, always context-blind. Verify PR targets `dev` not `main`. Run `/pr-resolve` before approving.

## UI Design Workflow (non-trivial components only)

≥3 data elements or uncertain layout → full three-stage flow:

1. **Stitch** (`ui-mockup` skill) — visual concept
2. **Playground** (`playground` skill) — interactive prototype
3. **Implementation** (`writing-plans` → `subagent-driven-development`) — only after Playground approval

Single-element additions (button, badge, tooltip) → skip straight to implementation.
For CSS/HTML guidance, use `frontend-design` plugin or `ui-design` project skill.

## Instruction Files & Skills

| File | Audience | Tracked |
|------|----------|---------|
| `CLAUDE.md` | Claude Code (local Mac) | Yes |
| `AGENTS.md` | Codex, web agents | Yes |
| `GEMINI.md` | Gemini CLI | Yes |
| `.github/copilot-instructions.md` | Copilot PR reviews | Yes |

**Skills**: Official `superpowers@claude-plugins-official` plugin (auto-updates) + user overrides in `~/.claude/skills/` (25 skills). Project skills in `.claude/skills/`: `coding-standards`, `markdown-standards`, `release`, `seed-sync`, `ui-design`, `ui-mockup`, `bb-test`, `smoke-test`, `browserbase-test-maintenance`, `api-infrastructure`, `homepoller-ssh`, `finishing-a-development-branch` (project override — enforces `patch→dev` workflow, never `patch→main`).

Use `/sync-instructions` after significant codebase changes.

## MCP Tools — Use Proactively

- `mcp__mem0__*` — episodic memory: save insights, recall handoffs, store session notes (mem0 cloud trial active; Memento paused)
- `mcp__claude_ai_Linear__*` — all Linear ops (team: `f876864d-ff80-4231-ae6c-a8e5cb69aca4`)
- `mcp__codacy__*` — quality/PR issues; use during `/pr-resolve`
- `mcp__context7__*` — library docs (Chart.js, Bootstrap, jsPDF) before implementing
- `mcp__firecrawl-local__*` — free local scraping (port 3002; self-hosted Firecrawl — see StakTrakrApi devops)
- `mcp__browserbase__*` — Stagehand NL tests only, **requires explicit user approval** (paid)
- `mcp__infisical__*` — secrets management at `http://localhost:8700`. See `secrets` skill.
- **Browserless** — scripted Playwright, free (use `/smoke-test`)
- **Memento** (`mcp__memento__*`) — Neo4j knowledge graph, currently paused for mem0 cloud trial. Still configured in `.mcp.json`.

## MCP Agent Parity (as of 2026-02-21)

All agents run on the same Mac and share the same Docker/IP stack.

| Server | Claude | Gemini | Codex | Notes |
|---|---|---|---|---|
| `mem0` | ✅ | ✅ | ✅ | Episodic memory (cloud trial, active) |
| `memento` | ✅ | ✅ | ✅ | Neo4j knowledge graph (paused for mem0 trial) |
| `sequential-thinking` | ✅ | ✅ | ✅ | Structured reasoning |
| `brave-search` | ✅ | ✅ | ✅ | Web search |
| `claude-context` | ✅ | ✅ | ✅ | Semantic code search AND wiki documentation search (index both repos separately) |
| `context7` | ✅ | ✅ | ✅ | Library documentation |
| `firecrawl-local` | ✅ | ✅ | ✅ | Self-hosted scraping (port 3002) |
| `linear` | ✅ | ✅ | ✅ | Issue tracking |
| `codacy` | ✅ | ✅ | ✅ | Code quality analysis |
| `chrome-devtools` | ✅ | — | ✅ | Gemini omits — use Playwright instead |
| `playwright` | ✅ | ✅ | ✅ | Browser automation / test authoring |
| `browserbase` | ✅ | ✅ | ✅ | Cloud NL tests (paid, use sparingly) |
| `code-graph-context` | ✅ | ✅ | ✅ | Structural graph (Docker required) |
| `infisical` | ✅ | ✅ | ✅ | Self-hosted secrets manager |

## Codex Invocation Safety

Always pass: target path, expected outcome, risk classification (read/write/network/destructive).
Never forward raw secrets. For destructive ops, require explicit human confirmation.
Dual-write handoff: Linear issue + mem0 `add_memory` with attribution.

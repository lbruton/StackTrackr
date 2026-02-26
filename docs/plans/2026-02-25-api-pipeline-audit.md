# API Pipeline Audit — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate stale documentation, ghost directories, and broken automation across the StakTrakr ecosystem — and establish clear repo-boundary rules so agents never deploy to the wrong place.

**Architecture:** Three-phase: (A) StakTrakr repo — immediate cleanup and skill rewrites; (B) StakTrakrApi repo — structural devops split into scraper/fly-poller/home-scraper; (C) StakTrakrWiki — accuracy fixes. Phases B and C are in separate repos and require separate sessions.

**Tech Stack:** Shell (file deletions, git), Markdown (CLAUDE.md, skills, wiki pages)

**Design doc:** `docs/plans/2026-02-25-api-pipeline-audit-design.md`

**File Touch Map:**
| Action | File | Scope |
|--------|------|-------|
| MODIFY | `CLAUDE.md` | Lines 69-70 (spot poller feed table), line 84 (health check command) |
| MODIFY | `.github/workflows/spot-poller.yml` | Convert to no-op — remove active cron schedule |
| DELETE | `devops/spot-poller/` | Ghost dir — `.env`, `__pycache__/`, `.DS_Store` only |
| DELETE | `devops/retail-poller/` | Ghost dir — `.env`, `.DS_Store`, `node_modules/` only |
| MODIFY | `.claude/skills/api-infrastructure/SKILL.md` | Fix spot poller writer, fly.toml repo path, retire GHA entry |
| MODIFY | `.claude/skills/seed-sync/SKILL.md` | Remove Phase 1 Docker poller health check entirely |
| MODIFY | `.claude/skills/retail-poller/SKILL.md` | Remove docker exec, fix SQLite→Turso, data branch→api branch |
| CREATE | `.claude/skills/repo-boundaries/SKILL.md` | New skill — repo ownership map |
| CREATE | `docs/plans/2026-02-25-api-pipeline-audit-design.md` | Already done |
| [PHASE B — StakTrakrApi] | `devops/scraper/` | New shared engine folder |
| [PHASE B — StakTrakrApi] | `devops/fly-poller/` | Rename from devops/retail-poller/ |
| [PHASE B — StakTrakrApi] | `devops/home-scraper/` | New home-only additions folder |
| [PHASE B — StakTrakrApi] | `CLAUDE.md` | New file — fly deploy safety gate |
| [PHASE C — StakTrakrWiki] | `architecture-overview.md` | Update stakscrapr row and devops/ structure |
| [PHASE C — StakTrakrWiki] | `home-poller.md` | Fix IP 192.168.1.81 → 192.168.1.48 |

---

## Phase A — StakTrakr Repo

### Task A1: Fix CLAUDE.md spot poller feed table ← NEXT

**Files:**
- Modify: `CLAUDE.md` (lines 68–72)

**Why:** CLAUDE.md currently lists `spot-poller.yml` GHA as the active spot price writer. This is wrong — spot polling moved to Fly.io `run-spot.sh` cron (`5,20,35,50 * * * *`) on 2026-02-23.

**Step 1: Make the edit**

Replace this block in `CLAUDE.md` (lines 68–72):
```
| Market prices | `data/api/manifest.json` | Fly.io retail cron (StakTrakrApi) | 30 min | `generated_at` within 30 min |
| Spot prices | `data/hourly/YYYY/MM/DD/HH.json` | `spot-poller.yml` GHA (StakTrakrApi) | 20 min | Last hourly file within 20 min |
| 15-min spot | `data/15min/YYYY/MM/DD/HHMM.json` | `spot-poller.yml` GHA (StakTrakrApi) | 20 min | Last 15-min file within 20 min |
| Goldback | `data/api/goldback-spot.json` | Fly.io goldback cron (StakTrakrApi) | 25h | `scraped_at` within 25h |
```

With:
```
| Market prices | `data/api/manifest.json` | Fly.io retail cron (StakTrakrApi) | 30 min | `generated_at` within 30 min |
| Spot prices | `data/hourly/YYYY/MM/DD/HH.json` | Fly.io `run-spot.sh` cron (StakTrakrApi) | 75 min | Last hourly file within 75 min |
| Goldback | `data/api/goldback-spot.json` | Fly.io goldback cron (StakTrakrApi) | 25h | `scraped_at` within 25h |
```

Notes:
- Remove the `15-min spot` row — `data/15min/` is referenced in old skills but does not appear in the StakTrakrApi fly-container.md or spot-pipeline.md. It's an artefact of the old GHA workflow.
- Stale threshold for spot is 75 min (not 20 min) — `run-spot.sh` runs every 15 min but the published docs (StakTrakrWiki/spot-pipeline.md) say 75 min threshold.

**Step 2: Fix health check command**

Also in `CLAUDE.md`, replace line 84:
```
gh run list --repo lbruton/StakTrakrApi --workflow "spot-poller.yml" --limit 3
```
With:
```
fly logs --app staktrakr | grep -E 'spot|run-spot' | tail -5
```

**Step 3: Add prohibition note**

Below the feed table (before the health check block), add:
```
**NEVER start a local Docker spot-poller container.** `devops/spot-poller/` is a ghost directory — no live code, no container. Spot polling is Fly.io container cron only (`run-spot.sh`).
```

**Step 4: Verify change looks correct**

Read back the modified section and confirm no lines reference GHA spot-poller.

---

### Task A2: Convert spot-poller.yml to explicit no-op

**Files:**
- Modify: `.github/workflows/spot-poller.yml`

**Why:** The workflow has active cron schedules (`5,20,35,50 * * * *`) but references `code/devops/spot-poller/poller.py` which no longer exists in the repo. Every scheduled run is silently failing in GitHub Actions. Must be converted to a no-op or the schedule removed.

**Step 1: Replace the entire job body**

Replace the current `jobs:` block with a no-op that prints a redirect message:

```yaml
# Spot price poller — RETIRED 2026-02-23
# Spot polling moved to Fly.io container cron (run-spot.sh, 5,20,35,50 * * * *).
# This workflow is kept ONLY for emergency manual trigger.
# Do NOT re-enable scheduled runs — poller.py was removed from this repo.
name: Spot Price Poller (RETIRED)

on:
  workflow_dispatch:  # Manual trigger only — all scheduled crons removed

env:
  TZ: UTC

jobs:
  redirect:
    runs-on: ubuntu-latest
    steps:
      - name: Retired — use Fly.io container
        run: |
          echo "⚠️  This workflow is RETIRED."
          echo "Spot polling runs inside the Fly.io staktrakr container at 5,20,35,50 * * * *."
          echo "To check spot data: fly logs --app staktrakr | grep spot"
          echo "To manually trigger: fly ssh console --app staktrakr -C '/app/run-spot.sh'"
```

**Step 2: Verify file looks correct**

Read back the file and confirm no `schedule:` cron entries remain.

---

### Task A3: Delete ghost devops directories

**Files:**
- Delete: `devops/spot-poller/` (contains `.env` + `__pycache__/` + `.DS_Store`)
- Delete: `devops/retail-poller/` (contains `.env` + `node_modules/` + `.DS_Store`)

**Before deleting:** Verify that any secrets in `.env` files are already in Infisical.

```bash
# Check what's in the .env files (keys only, not values)
grep -E '^[A-Z_]+=?' devops/spot-poller/.env | cut -d= -f1
grep -E '^[A-Z_]+=?' devops/retail-poller/.env | cut -d= -f1
```

Expected: `METAL_PRICE_API_KEY` in spot-poller/.env; `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `FIRECRAWL_BASE_URL` or similar in retail-poller/.env. All of these are in Infisical and Fly secrets.

```bash
# Delete both ghost directories entirely
rm -rf devops/spot-poller devops/retail-poller
```

Note: `devops/node_modules/` and `devops/cgc/` — leave these alone. cgc is the code-graph-context tool (in use). node_modules at root of devops is a local artefact.

**Step 2: Check git status**

```bash
git status devops/
```

Confirm: `devops/spot-poller/` and `devops/retail-poller/` are no longer shown as untracked.

---

### Task A4: Update api-infrastructure skill

**Files:**
- Modify: `.claude/skills/api-infrastructure/SKILL.md`

**Step 1: Replace the Three-Feed Architecture table**

Replace the current table (lines 12–18):
```
| Feed | File | Poller | Threshold |
|------|------|--------|-----------|
| **Market prices** | `data/api/manifest.json` | Fly.io `staktrakr` cron (`*/30 min`) | 30 min |
| **Spot prices** | `data/hourly/YYYY/MM/DD/HH.json` | `spot-poller.yml` GHA (`:05`, `:20`, `:35`, `:50`/hr) | 20 min |
| **Spot prices (15-min)** | `data/15min/YYYY/MM/DD/HHMM.json` | `spot-poller.yml` GHA (`:05/:20/:35/:50`) | 20 min |
| **Goldback** | `data/api/goldback-spot.json` | Fly.io `staktrakr` cron (daily 17:01 UTC) | 25h (info only) |
| **Turso** | `price_snapshots` table | retail-poller only | internal write store |
```

With:
```
| Feed | File | Poller | Threshold |
|------|------|--------|-----------|
| **Market prices** | `data/api/manifest.json` | Fly.io `run-local.sh` + `run-publish.sh` | 30 min |
| **Spot prices** | `data/hourly/YYYY/MM/DD/HH.json` | Fly.io `run-spot.sh` cron (`5,20,35,50 * * * *`) | 75 min |
| **Goldback** | `data/api/goldback-spot.json` | Fly.io via `goldback-g1` retail coin in `run-local.sh` | 25h (info only) |
| **Turso** | `price_snapshots` table | Dual-poller write-through (Fly.io + home VM) | internal |
```

**Step 2: Replace the Fly.io Container section**

Replace lines 25–33:
```
- **App:** `staktrakr` — region `iad`, always-on (min 1 machine, auto-stop off)
- **Config:** `devops/retail-poller/fly.toml` + `Dockerfile`
- **Runs:** Firecrawl + Playwright + retail-poller cron + goldback cron + serve.js
- **NOT spot prices** — spot is pure GHA, no Docker, no Fly
- **Deploy:** `cd devops/retail-poller && fly deploy`
```

With:
```
- **App:** `staktrakr` — region `dfw`, 4096MB RAM, 4 shared CPUs
- **Config:** `StakTrakrApi/devops/fly-poller/fly.toml` + `Dockerfile` — NOT in the StakTrakr repo
- **Runs:** Firecrawl + Playwright + Redis + RabbitMQ + PostgreSQL + retail cron + spot cron + goldback + serve.js
- **Also runs:** `run-spot.sh` (spot prices — NOT GHA)
- **Deploy:** From `lbruton/StakTrakrApi` repo: `cd devops/fly-poller && fly deploy`
- **⛔ NEVER run `fly deploy` from StakTrakr repo or stakscrapr repo**
```

**Step 3: Replace the GitHub Actions table**

Replace lines 40–41:
```
| `spot-poller.yml` | `StakTrakr` | `:05`, `:20`, `:35`, `:50` every hour | Python → MetalPriceAPI → `data/hourly/` |
```
With:
```
| `spot-poller.yml` | `StakTrakr` | **RETIRED** — keep for emergency manual trigger only | Was Python→MetalPriceAPI; now handled by Fly.io `run-spot.sh` |
```

**Step 4: Remove the `prices.db` reference**

Remove line 55 (SQLite snapshot line):
```
- `prices.db` is a read-only SQLite snapshot exported to StakTrakrApi each cycle (offline use only)
```
(Turso is the live store; `prices.db` may or may not still be committed — don't document it as a feature)

---

### Task A5: Rewrite seed-sync skill Phase 1

**Files:**
- Modify: `.claude/skills/seed-sync/SKILL.md`

**Why:** Phase 1 tells Claude to run `docker ps --filter "name=stacktrakr-seed-poller"` and offers to `docker compose -f devops/spot-poller/docker-compose.yml up -d`. Neither container exists. This is the most dangerous stale content — an agent will try to start a Docker container that can't work.

**Step 1: Replace the Phase 1 section and description**

Replace the frontmatter description and Phase 1:
```
---
name: seed-sync
description: Seed data sync — check Docker spot-price poller output and stage new seed data for commit. Use before releases or after merging PRs.
---

# Seed Data Sync — StakTrakr

Check the Docker spot-price poller output and stage any new seed data for commit. Can also fetch today's prices directly without Docker.

## When to Use
...

## Phase 1: Docker Poller Health Check

1. Run `docker ps --filter "name=stacktrakr-seed-poller"` to confirm the container is running
...
```

With:
```
---
name: seed-sync
description: Seed data sync — fetch live spot price data and stage seed history files for commit. Use before releases or after merging PRs.
---

# Seed Data Sync — StakTrakr

Fetch the latest spot prices and stage any new seed data for commit.

**There is NO local Docker spot-poller container.** The `devops/spot-poller/` directory was removed. Do not attempt to start any Docker container for spot prices. Spot prices are polled exclusively by the Fly.io container (`run-spot.sh`).

## When to Use
...

## Phase 1: Fetch Today's Prices (No Docker Required)

Run the built-in script directly — no container needed:

```bash
python3 .claude/skills/seed-sync/update-today.py
```

This script fetches today's spot prices from MetalPriceAPI and appends them to the appropriate `data/spot-history-{year}.json` file. It reads the API key from the environment or from a `.env` file in the current directory.
```

Keep Phases 2–5 unchanged. Also update the **File Layout** section to remove the `devops/spot-poller/` block.

Replace the File Layout section:
```
devops/spot-poller/          # Docker-based continuous poller (public)
  ├── docker-compose.yml     # Docker Compose config
  ├── Dockerfile             # Python 3.12 Alpine image
  ├── poller.py              # Long-running poll loop (catchup + hourly)
  ├── update-seed-data.py    # One-shot backfill script (CLI)
  ├── requirements.txt       # Python dependencies
  ├── .env.example           # API key template
  └── README.md              # Setup and usage guide
```
With:
```
[no local spot-poller — runs inside Fly.io container at StakTrakrApi/devops/scraper/spot-poller/]
```

---

### Task A6: Update retail-poller skill (docker exec → fly ssh, SQLite → Turso, data branch → api branch)

**Files:**
- Modify: `.claude/skills/retail-poller/SKILL.md`

This skill has three categories of staleness:

**1. All file paths missing repo context**

Every path like `devops/retail-poller/price-extract.js` must become `StakTrakrApi/devops/fly-poller/price-extract.js` (or `scraper/` if Phase B is done).

For now (Phase A only), add a **bold repo note at the top of the File Map section**:

Add after the Architecture Overview:
```
> **Repo:** All scripts listed below live in `lbruton/StakTrakrApi` — NOT in the StakTrakr repo. Deploy path: `cd devops/fly-poller && fly deploy`.
```

**2. Remove all `docker exec` commands**

In the **Data Branch Git Safety** section (lines ~256–355), replace all three `docker exec firecrawl-docker-retail-poller-1` blocks:

Replace:
```bash
docker exec firecrawl-docker-retail-poller-1 tail -20 /var/log/retail-poller.log
```
With:
```bash
fly ssh console --app staktrakr -C "tail -20 /var/log/retail-poller.log"
```

Replace the `docker exec firecrawl-docker-retail-poller-1 bash -c '...'` recovery block with:
```bash
fly ssh console --app staktrakr -C "
  cd /data/staktrakr-api-export
  git rebase --abort 2>/dev/null || true
  git fetch origin api && git reset --hard origin/api
  echo 'Data branch reset OK'
  git log --oneline -3
"
```

Replace the `docker exec firecrawl-docker-retail-poller-1 tail -f` watch command with:
```bash
fly logs --app staktrakr | grep retail
```

Replace the SQLite verification `docker exec` block with:
```bash
# Verify Turso row count instead of SQLite
fly ssh console --app staktrakr -C "node -e \"
const {createClient} = require('@libsql/client');
const db = createClient({url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN});
db.execute('SELECT COUNT(*) as n FROM price_snapshots').then(r => { console.log('rows:', r.rows[0].n); process.exit(0); });
\""
```

**3. Replace SQLite Database section**

Replace the entire `## SQLite Database` section header and table with `## Turso Database`:

```markdown
## Turso Database

**Provider:** Turso cloud (libSQL) — NOT SQLite. Credentials in Infisical + Fly secrets.

**Table:** `price_snapshots`

| Column | Type | Notes |
|--------|------|-------|
| `scraped_at` | TEXT | ISO8601 UTC timestamp of actual scrape |
| `window_start` | TEXT | 15-min floor bucket |
| `coin_slug` | TEXT | e.g. `ase`, `age` |
| `vendor` | TEXT | Provider id (e.g. `apmex`) |
| `price` | REAL | null if scrape failed |
| `source` | TEXT | `firecrawl` \| `playwright` \| `fbp` |
| `in_stock` | INTEGER | 0 if OOS patterns matched |
| `is_failed` | INTEGER | 1 if price is null |
| `poller_id` | TEXT | `api` (Fly.io) or `home` (home VM) |
```

**4. Replace "data branch" with "api branch" throughout**

All references to "data branch" → "api branch". This is a global find-replace across the skill file.

**5. Remove retail-price-poller.yml GHA references**

Remove the note about `retail-price-poller.yml` being deleted — it's historical context that can confuse. Replace with:
```
**No GHA cloud failsafe.** All retail scraping runs exclusively in the Fly.io container via self-hosted Firecrawl + dual home VM poller. `retail-price-poller.yml` was deleted 2026-02-22.
```

**6. Update the "data branch" git safety section heading**

Change `## Data Branch Git Safety` → `## API Branch Git Safety`

---

### Task A7: Create repo-boundaries skill

**Files:**
- Create: `.claude/skills/repo-boundaries/SKILL.md`

**Step 1: Create the skill directory and file**

```bash
mkdir -p /Volumes/DATA/GitHub/StakTrakr/.claude/skills/repo-boundaries
```

Write the following content to `.claude/skills/repo-boundaries/SKILL.md`:

```markdown
---
name: repo-boundaries
description: Use when doing any cross-repo work, deploying, or when unsure which repo owns a piece of code. Maps exactly which code belongs in which repo and what each agent is allowed to do.
---

# Repo Boundaries

## Repo Ownership Map

| Repo | Owns | Does NOT own |
|------|------|--------------|
| `lbruton/StakTrakr` | Frontend HTML/JS/CSS, skills, CLAUDE.md, smoke tests | Poller scripts, fly.toml, Dockerfile, devops crons |
| `lbruton/StakTrakrApi` | ALL backend devops: fly.toml, Dockerfile, all run-*.sh, price-extract.js, api-export.js, spot-poller, providers.json | Frontend code |
| `lbruton/stakscrapr` | Home VM full stack: same core + dashboard.js + tinyproxy + Tailscale exit config | fly.toml (authoritative is StakTrakrApi), fly deploy |
| `lbruton/StakTrakrWiki` | Shared infrastructure documentation | Code, config, scripts |

## Deploy Rules

| Action | Allowed from | Forbidden from |
|--------|-------------|----------------|
| `fly deploy` | StakTrakrApi (`devops/fly-poller/`) | StakTrakr, stakscrapr, any other repo |
| `git push origin api` (data) | Fly.io container `run-publish.sh` only | Local Mac, home VM, GHA |
| PR to StakTrakrApi main | StakTrakr Mac Claude, stakscrapr Claude | Nobody pushes direct to main |
| providers.json URL fix | Direct push to `api` branch (StakTrakrApi) | Any other method |

## Fly.io Container — Which Repo Has fly.toml?

**`StakTrakrApi/devops/fly-poller/fly.toml`** is the authoritative fly.toml.

- 4096MB RAM, 4 shared CPUs, region dfw
- Supervisord runs: redis, rabbitmq, postgres, playwright-service, firecrawl-api, firecrawl-worker, firecrawl-extract-worker, cron, http-server
- `stakscrapr/fly.toml` is STALE (2048MB) — do not use it for anything

## Home VM — What Lives in stakscrapr?

The home VM (`192.168.1.48`) runs:
- Same Firecrawl + Playwright + Redis + RabbitMQ stack as Fly.io (via supervisord)
- `dashboard.js` (port 3010) — monitors both pollers via Turso
- `check-flyio.sh` — writes `/tmp/flyio-health.json` for dashboard
- Tailscale exit node (`100.112.198.50`) — all Fly.io scrape traffic exits through home Cox residential IP
- tinyproxy (port 8889) — HTTP proxy via Cox NIC

stakscrapr Claude: NEVER run `fly deploy`. Open a PR to `lbruton/StakTrakrApi` instead.

## Change Gate

When home VM code changes need to flow to Fly.io:
1. Home Claude opens PR to `StakTrakrApi` main
2. StakTrakr Mac Claude reviews + merges
3. StakTrakr Mac Claude runs `cd devops/fly-poller && fly deploy`

## What Goes in Which devops/ Folder (StakTrakrApi)

| Folder | Contains |
|--------|---------|
| `devops/scraper/` | Shared engine: price-extract.js, api-export.js, capture.js, extract-vision.js, spot-poller/poller.py, package.json |
| `devops/fly-poller/` | fly.toml, Dockerfile, run-local.sh, run-publish.sh, run-spot.sh, run-retry.sh, run-fbp.sh, docker-entrypoint.sh, supervisord.conf |
| `devops/home-scraper/` | run-home.sh, dashboard.js, check-flyio.sh, supervisord.conf (11 services), .env.example |
| `devops/home-vm/` | tinyproxy-cox.conf, cox-auth.sh/service/timer, update-cox-proxy-ip.sh |
```

---

### Task A8: Commit Phase A changes

**Files:** All modified files from Tasks A1–A7

**Step 1: Check git status**

```bash
git -C /Volumes/DATA/GitHub/StakTrakr status
```

Expected: Modified CLAUDE.md, .github/workflows/spot-poller.yml, skill files; deleted devops/spot-poller/, devops/retail-poller/ (as untracked removals, since they weren't tracked)

**Step 2: Stage all changed files**

```bash
git -C /Volumes/DATA/GitHub/StakTrakr add CLAUDE.md
git -C /Volumes/DATA/GitHub/StakTrakr add .github/workflows/spot-poller.yml
git -C /Volumes/DATA/GitHub/StakTrakr add .claude/skills/api-infrastructure/SKILL.md
git -C /Volumes/DATA/GitHub/StakTrakr add .claude/skills/seed-sync/SKILL.md
git -C /Volumes/DATA/GitHub/StakTrakr add .claude/skills/retail-poller/SKILL.md
git -C /Volumes/DATA/GitHub/StakTrakr add .claude/skills/repo-boundaries/SKILL.md
git -C /Volumes/DATA/GitHub/StakTrakr add docs/plans/
```

Note: The ghost dirs (devops/spot-poller/, devops/retail-poller/) were never tracked in git (confirmed by git status at session start showing them as ??). No `git rm` needed — just delete from filesystem, done.

**Step 3: Commit**

```
chore(audit): retire spot-poller GHA, remove ghost devops dirs, update skills/CLAUDE.md

- Convert spot-poller.yml to no-op (was silently failing — poller.py removed)
- Update CLAUDE.md feed table: spot polling is Fly.io run-spot.sh, not GHA
- Delete ghost devops/spot-poller/ and devops/retail-poller/ dirs
- api-infrastructure skill: fix spot writer, retire GHA entry, correct fly.toml repo path
- seed-sync skill: remove Phase 1 Docker container check (container doesn't exist)
- retail-poller skill: replace docker exec with fly ssh, SQLite→Turso, data branch→api branch
- New repo-boundaries skill: authoritative ownership map for all 4 repos
```

**Step 4: Verify commit**

```bash
git -C /Volumes/DATA/GitHub/StakTrakr log --oneline -3
git -C /Volumes/DATA/GitHub/StakTrakr diff HEAD~1 --stat
```

---

## Phase B — StakTrakrApi Repo (Separate Session)

> Run in a Claude session inside `lbruton/StakTrakrApi` repo.

### Task B1: Create devops/scraper/ folder

Extract shared engine files from `devops/retail-poller/` into new `devops/scraper/`:

```bash
cd /path/to/StakTrakrApi
mkdir -p devops/scraper/spot-poller
git mv devops/retail-poller/price-extract.js devops/scraper/
git mv devops/retail-poller/api-export.js devops/scraper/
git mv devops/retail-poller/capture.js devops/scraper/
git mv devops/retail-poller/extract-vision.js devops/scraper/
git mv devops/retail-poller/db.js devops/scraper/
git mv devops/retail-poller/spot-poller/poller.py devops/scraper/spot-poller/
# Copy package.json — both folders will need it
cp devops/retail-poller/package.json devops/scraper/package.json
```

### Task B2: Create devops/fly-poller/ folder

```bash
cd /path/to/StakTrakrApi
mkdir -p devops/fly-poller
git mv devops/retail-poller/fly.toml devops/fly-poller/
git mv devops/retail-poller/Dockerfile devops/fly-poller/
git mv devops/retail-poller/run-local.sh devops/fly-poller/
git mv devops/retail-poller/run-publish.sh devops/fly-poller/
git mv devops/retail-poller/run-spot.sh devops/fly-poller/
git mv devops/retail-poller/run-retry.sh devops/fly-poller/
git mv devops/retail-poller/run-fbp.sh devops/fly-poller/
git mv devops/retail-poller/docker-entrypoint.sh devops/fly-poller/
git mv devops/retail-poller/supervisord.conf devops/fly-poller/
```

Update `Dockerfile` COPY paths to pull from `../scraper/`:
```dockerfile
COPY ../scraper/ /app/
COPY ./ /app/
```

### Task B3: Create devops/home-scraper/ folder

Fetch from `stakscrapr` repo the home-specific files that do NOT exist in `retail-poller/`:

```bash
mkdir -p devops/home-scraper
# Copy from stakscrapr checkout (or curl from github):
# dashboard.js, check-flyio.sh, run-home.sh
# Create supervisord.conf for home (11 services)
# Create .env.example
```

### Task B4: Create StakTrakrApi CLAUDE.md

Create `CLAUDE.md` in root of StakTrakrApi:

```markdown
# CLAUDE.md — StakTrakrApi

## Deploy Rules

**`fly deploy` is run from this repo only.**
- Always run from `devops/fly-poller/`: `cd devops/fly-poller && fly deploy`
- Never run `fly deploy` from any other repo

**Git branch rules:**
- `api` branch = live data files (written by Fly.io `run-publish.sh` via force-push)
- `main` branch = code source of truth (PR target)
- Never push directly to `main` — all changes via PR

## Repo Ownership

See `devops/` folder map:
- `devops/scraper/` — shared engine (both Fly.io and home VM use this code)
- `devops/fly-poller/` — Fly.io deploy wrapper (fly.toml, Dockerfile, container scripts)
- `devops/home-scraper/` — home VM additions (dashboard, tinyproxy, run-home.sh)
- `devops/home-vm/` — infrastructure (tinyproxy-cox, cox-auth, sysctl)
```

### Task B5: Commit + PR for StakTrakrApi

```bash
git add devops/
git commit -m "refactor(devops): split retail-poller into scraper/ fly-poller/ home-scraper/"
git push origin main  # via PR — never direct
```

---

## Phase C — StakTrakrWiki Repo (Separate Session)

> Run in a Claude session inside `lbruton/StakTrakrWiki` repo.

### Task C1: Fix architecture-overview.md

Update the **Repo Boundaries** table:

Replace stakscrapr row:
```
| `lbruton/stakscrapr` | Home LXC Claude config — CLAUDE.md, `.mcp.json`, VM-specific docs |
```
With:
```
| `lbruton/stakscrapr` | Home VM full stack — identical Firecrawl+Playwright+scraper core PLUS dashboard.js, tinyproxy/Cox residential proxy, Tailscale exit node config |
```

Update `devops/` folder references to reflect new `scraper/` + `fly-poller/` + `home-scraper/` structure.

### Task C2: Fix home-poller.md IP address

In `home-poller.md`, change all references to `192.168.1.81` → `192.168.1.48`.

Verify against: `health.md` which uses SSH host `192.168.1.48`.

### Task C3: Commit wiki changes

```bash
git add architecture-overview.md home-poller.md
git commit -m "docs: fix stakscrapr description, fix home VM IP address"
git push origin main
```

---

## Auto-Quiz Answers

1. **Which task is marked NEXT?** Task A1 — Fix CLAUDE.md spot poller feed table
2. **Validation for NEXT?** Read back modified CLAUDE.md section — confirm no `spot-poller.yml` or `GHA` in the feed table rows, and new prohibition note is present
3. **Commit message for NEXT?** `chore(audit): retire spot-poller GHA, remove ghost devops dirs, update skills/CLAUDE.md`
4. **Breakpoint?** After Task A8 (commit) — pause for human review before proceeding to Phase B (StakTrakrApi repo changes)

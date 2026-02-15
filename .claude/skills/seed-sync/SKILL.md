# Seed Data Sync — StackTrackr

Check the Docker spot-price poller output and stage any new seed data for commit. Can also fetch today's prices directly without Docker.

## When to Use

- **Before every release** — the `/release` skill references this as a prerequisite
- **After merging PRs** — seed data may have accumulated while the PR was open
- **On demand** — `/seed-sync` to check and stage
- **Manual update** — when the Docker poller isn't running and you need fresh prices

## Phase 1: Docker Poller Health Check

1. Run `docker ps --filter "name=stacktrakr-seed-poller"` to confirm the container is running
2. Run `docker logs stacktrakr-seed-poller --tail 10` to check for errors or successful polls
3. Report the container status:
   - **Running**: show uptime and last log line
   - **Stopped/Missing**: warn the user and suggest `docker compose -f devops/spot-poller/docker-compose.yml up -d`

**If the poller is not running**, offer to fetch today's prices directly using the built-in script:

```bash
python3 .claude/skills/seed-sync/update-today.py
```

This slim script fetches today's spot prices from MetalPriceAPI and appends them to the appropriate `data/spot-history-{year}.json` file. It reads the API key from the environment or from `devops/spot-poller/.env`. No Docker required.

## Phase 2: Seed Data Freshness Audit

Compare what's on disk vs what's committed:

1. For each `data/spot-history-*.json` file, extract:
   - **Committed**: last date in `git show HEAD:<file>`
   - **On disk**: last date in the working copy
   - **On main**: last date in `git show main:<file>` (if branch exists)

2. Display a freshness table:

```
Seed Data Freshness
====================
File                        Committed    On Disk      Main        Gap
spot-history-2025.json      2025-12-31   2025-12-31   2025-12-31  -
spot-history-2026.json      2026-02-14   2026-02-14   2026-02-10  4 days
```

- **Gap** = difference between On Disk and Committed (unstaged changes)
- Flag any file where On Disk > Committed (new data not yet committed)
- Flag any file where Committed > Main (data committed on dev but not yet merged)

3. Also report total entry counts per file for a quick sanity check.

## Phase 3: Stage & Report

If there are unstaged seed data changes:

1. Show the diff summary: `git diff --stat data/spot-history-*.json`
2. Ask the user whether to stage the files now
3. If yes: `git add data/spot-history-*.json`
4. Report what was staged and remind the user to include them in the next commit

If everything is up to date:

1. Report "Seed data is current — nothing to stage"
2. If Main is behind Committed, remind that merging the open PR will update main

## Phase 4: Validate Data Integrity

Quick checks on any changed seed files:

1. **Valid JSON**: parse each changed file
2. **Chronological order**: timestamps should be ascending
3. **4 metals per date**: each trading day should have Gold, Silver, Platinum, Palladium
4. **No duplicate dates**: no repeated timestamp+metal pairs
5. **Reasonable values**: spot prices > 0, no obvious outliers (e.g. gold < $1000 or > $50000)

Report any issues found. Do NOT auto-fix — flag for the user.

## Integration with /release

The `/release` skill should invoke `/seed-sync` at the start of Phase 0 (before gathering context). This ensures seed data is staged before the release commit is created. The release skill's Phase 2 step 6 and Phase 3 `git add` already handle the files — this skill just makes the check explicit and visible.

## File Layout

```
devops/spot-poller/          # Docker-based continuous poller (public)
  ├── docker-compose.yml     # Docker Compose config
  ├── Dockerfile             # Python 3.12 Alpine image
  ├── poller.py              # Long-running poll loop (catchup + hourly)
  ├── update-seed-data.py    # One-shot backfill script (CLI)
  ├── requirements.txt       # Python dependencies
  ├── .env.example           # API key template
  └── README.md              # Setup and usage guide

.claude/skills/seed-sync/    # Claude Code skill
  ├── SKILL.md               # This file
  └── update-today.py        # Slim one-shot script (no Docker needed)
```

---
name: seed-sync
description: Seed data sync — fetch live spot price data and stage seed history files for commit. Use before releases or after merging PRs. There is NO local Docker spot-poller container.
---

# Seed Data Sync — StakTrakr

Fetch the latest spot prices and stage any new seed data for commit.

> **There is NO local Docker spot-poller container.** The `devops/spot-poller/` directory was removed. Do not attempt to start any Docker container for spot prices. Spot prices are polled exclusively by the Fly.io container (`run-spot.sh` at `5,20,35,50 * * * *`).

## When to Use

- **Before every release** — the `/release` skill references this as a prerequisite
- **After merging PRs** — seed data may have accumulated while the PR was open
- **On demand** — `/seed-sync` to check and stage
- **Manual update** — when you need fresh seed data locally

## Phase 1: Fetch Today's Prices (No Docker Required)

Run the built-in script directly — no container needed:

```bash
python3 .claude/skills/seed-sync/update-today.py
```

This slim script fetches today's spot prices from MetalPriceAPI and appends them to the appropriate `data/spot-history-{year}.json` file. It reads `METAL_PRICE_API_KEY` from the environment. No Docker required.

If the API key is not in the environment, retrieve it from Infisical:
```bash
# Key name: METAL_PRICE_API_KEY, project: StakTrakr, environment: dev
```

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

## Phase 5: Sync from Live API

Before staging for a release, pull the latest entries from the live API and merge them into local seed files. This ensures the release ships with data at least as fresh as what's already live at `api.staktrakr.com`.

Run from repo root:

```bash
bash .claude/skills/seed-sync/fetch-live.sh
```

The script:
1. Curls `https://api.staktrakr.com/data/spot-history-YYYY.json` for 2023 through the current year
2. Calls `merge-seed.py` to merge remote entries into the local file
3. Deduplicates by `(timestamp, metal)` — live API wins on conflict
4. Prints a per-file summary: `spot-history-2026.json: +N new entries from live`

After running, review the output and proceed to Phase 3 (Stage & Report) to commit the merged data.

## Integration with /release

The `/release` skill should invoke `/seed-sync` at the start of Phase 0 (before gathering context). This ensures seed data is staged before the release commit is created. The release skill's Phase 2 step 6 and Phase 3 `git add` already handle the files — this skill just makes the check explicit and visible.

## File Layout

```
[No local spot-poller directory — removed 2026-02-23. Spot polling runs in
Fly.io container: StakTrakrApi/devops/fly-poller/run-spot.sh]

.claude/skills/seed-sync/    # Claude Code skill
  ├── SKILL.md               # This file
  ├── update-today.py        # Slim one-shot script (no Docker needed)
  ├── fetch-live.sh          # Phase 5: fetch + merge from live API
  └── merge-seed.py          # Merge helper (dedup by timestamp+metal)
```

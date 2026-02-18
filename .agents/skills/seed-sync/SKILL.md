---
name: seed-sync
description: Check and stage generated spot-history seed data updates (Docker poller or direct fetch), then validate integrity for release readiness.
---

# Seed Sync — StakTrakr

Use before releases or when checking price-seed freshness.

## Workflow

### Phase 1: Poller status

1. Check Docker poller container state.
2. Inspect recent logs for successful runs/errors.
3. If poller unavailable, offer direct one-shot update script.

Recommended direct fetch:

```bash
python3 .agents/skills/seed-sync/scripts/update-today.py
```

### Phase 2: Freshness audit

Compare each `data/spot-history-*.json` file across:

- working tree (`on disk`)
- current commit (`HEAD`)
- `main` (if available)

Report a simple freshness table with date gaps.

### Phase 3: Stage decision

If updates exist:

1. Show `git diff --stat data/spot-history-*.json`.
2. Ask user whether to stage now.
3. Stage on approval.

If none, state clearly that seed data is current.

### Phase 4: Integrity checks

For changed seed files, verify:

1. Valid JSON parse.
2. Chronological timestamps.
3. Expected metal coverage per date (Gold, Silver, Platinum, Palladium).
4. No duplicate timestamp+metal rows.
5. Values are positive and not obviously broken.

Report issues; do not auto-rewrite data.

## Release Integration

Run this skill at the start of release prep so seed changes are visible before commit.

## Outputs

At completion, include:

- Poller health summary.
- Freshness table highlights.
- Staged/not-staged result.
- Any integrity warnings.

Save a lightweight rewind checkpoint to Memento: $ARGUMENTS

Follow the `session-management` skill for all rules.

Quick bookmark for same-session chat rewinds. Minimal overhead — ~5 observations.

## Steps

1. **Generate Rewind ID**: `STAKTRAKR-{YYYYMMDD}-{HHMMSS}` (UTC, no theme)

2. **Gather minimal context**:
   - `git log --oneline -1` — last commit
   - `git status --short` — uncommitted state
   - `git branch --show-current` — current branch

3. **Create Memento entity**:
   - Name: `Rewind: {REWIND_ID}`
   - entityType: `STAKTRAKR:DEVELOPMENT:REWIND`
   - Observations: TIMESTAMP, ABSTRACT (one sentence), REWIND_ID, NEXT (single immediate action), FILES (modified files with line ranges), COMMIT (hash or "uncommitted"), LINEAR (active issue ID), BRANCH
   - Tags: project:staktrakr, rewind, {YYYY-MM}

4. **Output**:
```
Rewind saved: {REWIND_ID}
  Next: {NEXT}
  Recall with: /recall-rewind
```

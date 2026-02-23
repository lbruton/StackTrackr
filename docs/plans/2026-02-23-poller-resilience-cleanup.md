# Retail Poller Resilience & Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Fly.io retail poller self-healing after redeploys by switching to a stateless `--depth=1` clone on every run, dropping `prices.db` from git entirely, and fixing the remaining `git checkout -b` bug in `docker-entrypoint.sh`.

**Architecture:** The poller's git clone is a delivery vehicle only — it clones fresh into a temp dir each run, writes JSON, pushes, and self-destructs via `trap`. Turso is the source of truth for price data; `prices.db` (a redundant Turso dump committed to git) is removed. The Fly.io `/data` volume is retained but now only holds `PRICE_LOG_DIR` JSONL audit logs.

**Tech Stack:** Bash (run-local.sh, docker-entrypoint.sh), Node.js (api-export.js), Fly.io, git

**File Touch Map:**
| Action | File | Scope |
|--------|------|-------|
| MODIFY | `devops/retail-poller/run-local.sh` | Replace persistent clone with stateless temp-dir clone; remove `prices.db` from git add |
| MODIFY | `devops/retail-poller/docker-entrypoint.sh` | Fix `git checkout -b` bug (line 53); remove clone block entirely (run-local.sh handles it) |
| MODIFY | `devops/retail-poller/api-export.js` | Remove SQLite snapshot export block (lines ~700-760) |
| MODIFY | `docs/devops/api-infrastructure-runbook.md` | Update storage model, remove prices.db references |

---

## Context for the implementing agent

### What the poller does (simplified)
Every 15 minutes via cron inside the Fly.io `staktrakr` container:
1. `run-local.sh` scrapes 67 retail price targets → writes to Turso
2. `api-export.js` reads Turso → writes JSON files into a local directory → commits and pushes to the `api` branch of `github.com/lbruton/StakTrakrApi`
3. GitHub Pages at `api.staktrakr.com` serves those JSON files

### Why stateless clone is better
Previously the clone lived at `/data/staktrakr-api-export` (persistent Fly.io volume). After the last container redeploy, git object corruption in that persistent clone caused every cron run to fail with `fatal: loose object ... is corrupt`. The fix: clone fresh into a `mktemp -d` directory each run, push, and let `trap` clean it up on exit. No state persists, no corruption is possible.

### Why drop prices.db
`prices.db` is a 53MB SQLite dump of Turso data committed to the `api` branch on every run. GitHub already warns about it (over 50MB soft limit). The StakTrakr frontend (`js/`) and `serve.js` have **zero references** to it — all API endpoints are JSON files. Turso is the live database; `prices.db` is a redundant artifact from the pre-Turso architecture.

### The `/data` volume
`fly.toml` mounts `staktrakr_data` at `/data`. After this change, the volume's only job is holding `PRICE_LOG_DIR` JSONL audit logs (`prices-YYYY-MM-DD.jsonl`). If the volume is wiped, the next run creates fresh log files — no data loss, because Turso has everything.

### Secrets already configured on Fly.io
- `GITHUB_TOKEN` — used for git push
- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` — Turso client
- `API_EXPORT_DIR` is set to `/data/staktrakr-api-export` in `fly.toml` but will no longer be used after this change (temp dir replaces it)

---

## Task Table

| ID | Step | Est (min) | Files | Validation | Risk/Notes | Agent |
|----|------|-----------|-------|------------|------------|-------|
| T1 | Rewrite clone section of run-local.sh | 10 | run-local.sh | Script parses cleanly with `bash -n` | Core change — careful with trap/exit interaction | Claude |
| T2 | Remove prices.db from api-export.js | 5 | api-export.js | Node.js syntax check passes | Non-destructive removal | Claude |
| T3 | Fix docker-entrypoint.sh | 5 | docker-entrypoint.sh | Script parses cleanly with `bash -n` | Remove clone block entirely | Claude |
| T4 | Deploy and manually test | 10 | — | Market feed < 5 min old after manual trigger | `fly deploy` takes ~2 min | Human |
| T5 | Update runbook | 10 | api-infrastructure-runbook.md | Markdown lints clean | Notion update can follow | Claude |
| T6 | Commit | 3 | — | `git log` shows commit on dev | — | Claude |

---

### Task 1: Rewrite run-local.sh clone section ← NEXT

**Files:**
- Modify: `devops/retail-poller/run-local.sh` (lines 25-44 and 79-91)

**Current code (lines 25-91, the parts being changed):**

```bash
# StakTrakrApi repo configuration
API_DATA_REPO="${API_DATA_REPO:-https://github.com/lbruton/StakTrakrApi.git}"
API_EXPORT_DIR="${API_EXPORT_DIR:-/tmp/staktrakr-api-export}"
POLLER_ID="${POLLER_ID:-api}"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "ERROR: GITHUB_TOKEN not set (required for pushing to StakTrakrApi)"
  exit 1
fi

# Clone/update StakTrakrApi repo
if [ ! -d "$API_EXPORT_DIR" ]; then
  echo "[$(date -u +%H:%M:%S)] Cloning StakTrakrApi repo..."
  git clone "https://${GITHUB_TOKEN}@github.com/lbruton/StakTrakrApi.git" "$API_EXPORT_DIR"
fi

cd "$API_EXPORT_DIR"
git fetch origin "$POLLER_ID" 2>/dev/null || true
git checkout -B "$POLLER_ID" "origin/$POLLER_ID" 2>/dev/null || git checkout -B "$POLLER_ID"
git pull origin "$POLLER_ID" 2>/dev/null || true  # May fail if branch doesn't exist on remote yet
```

And the commit/push section (lines 79-91):

```bash
# Commit and push to poller branch
cd "$API_EXPORT_DIR"
git add data/api/ data/retail/ prices.db 2>/dev/null || git add data/api/

if git diff --cached --quiet; then
  echo "[$(date -u +%H:%M:%S)] No new data to commit."
else
  git commit -m "${POLLER_ID}: ${DATE} $(date -u +%H:%M) export"
  # Rebase onto any remote changes (e.g. manual backfills) before pushing
  git pull --rebase origin "$POLLER_ID" 2>/dev/null || true
  git push "https://${GITHUB_TOKEN}@github.com/lbruton/StakTrakrApi.git" "$POLLER_ID"
  echo "[$(date -u +%H:%M:%S)] Pushed to ${POLLER_ID} branch"
fi
```

**Step 1: Replace the clone/update block (lines 26-44)**

Replace the entire block from `# StakTrakrApi repo configuration` through `git pull origin "$POLLER_ID"` with:

```bash
# StakTrakrApi repo configuration
POLLER_ID="${POLLER_ID:-api}"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "ERROR: GITHUB_TOKEN not set (required for pushing to StakTrakrApi)"
  exit 1
fi

# Clone fresh into a temp dir each run — stateless, no persistent git state to corrupt
API_EXPORT_DIR=$(mktemp -d /tmp/staktrakr-push-XXXXXX)
trap "rm -rf $API_EXPORT_DIR" EXIT
echo "[$(date -u +%H:%M:%S)] Cloning StakTrakrApi repo (shallow)..."
git clone --depth=1 --branch "$POLLER_ID" \
  "https://${GITHUB_TOKEN}@github.com/lbruton/StakTrakrApi.git" \
  "$API_EXPORT_DIR" 2>/dev/null \
  || git clone --depth=1 \
    "https://${GITHUB_TOKEN}@github.com/lbruton/StakTrakrApi.git" \
    "$API_EXPORT_DIR"
cd "$API_EXPORT_DIR"
# Ensure we're on the correct branch (handles first-run case)
git checkout -B "$POLLER_ID" 2>/dev/null || true
```

**Why the two-step clone:** `--branch api` works once the remote branch exists. On true first-run (branch doesn't exist yet), fall back to cloning default branch and creating `api` locally. The `|| true` on `checkout -B` is safe here because we just cloned — there's no persistent state to worry about.

**Step 2: Replace the commit/push block (lines 79-91)**

Replace from `# Commit and push to poller branch` through `echo "[...] Done."` commit section with:

```bash
# Commit and push to poller branch
cd "$API_EXPORT_DIR"
git add data/api/ data/retail/ 2>/dev/null || git add data/api/

if git diff --cached --quiet; then
  echo "[$(date -u +%H:%M:%S)] No new data to commit."
else
  git commit -m "${POLLER_ID}: ${DATE} $(date -u +%H:%M) export"
  git push "https://${GITHUB_TOKEN}@github.com/lbruton/StakTrakrApi.git" "$POLLER_ID"
  echo "[$(date -u +%H:%M:%S)] Pushed to ${POLLER_ID} branch"
fi
```

Note: `git pull --rebase` before push is removed — unnecessary with a fresh shallow clone (there's nothing to rebase since we just cloned HEAD). `prices.db` removed from `git add`.

**Step 3: Validate syntax**

```bash
bash -n devops/retail-poller/run-local.sh
```
Expected: no output (clean parse).

**Step 4: Verify the full script looks correct**

```bash
cat -n devops/retail-poller/run-local.sh
```
Check:
- `mktemp -d` appears in the clone block
- `trap "rm -rf $API_EXPORT_DIR" EXIT` is present (note: the existing lockfile trap is `trap "rm -f $LOCKFILE" EXIT` — the new one adds a second trap, which is fine in bash; both fire on EXIT)
- `prices.db` does NOT appear in any `git add` line
- `git pull --rebase` does NOT appear

---

### Task 2: Remove prices.db snapshot export from api-export.js

**Files:**
- Modify: `devops/retail-poller/api-export.js` (lines ~699-760)

**Step 1: Locate the block to remove**

The block starts at approximately line 699:
```javascript
  // --------------------------------------------------------------------------
  // Export read-only SQLite snapshot from Turso data
  // --------------------------------------------------------------------------
  if (!DRY_RUN) {
    log("Exporting SQLite snapshot from Turso data...");
```
And ends at approximately line 760:
```javascript
    log(`SQLite snapshot exported: ${snapshotPath}`);
  }
```

**Step 2: Remove the entire SQLite snapshot block**

Delete from the comment `// Export read-only SQLite snapshot from Turso data` through the closing `}` of the `if (!DRY_RUN)` block (inclusive). The `} finally {` block immediately after is NOT removed.

The result should be that after `log(\`API export complete: ...\`)` the next line is the `} finally {` block.

**Step 3: Remove the now-unused `snapshotPath` and `Database` snapshot usage**

The `import Database from "better-sqlite3"` at the top is still used for the in-memory SQLite (line 440: `new Database(":memory:")`), so do NOT remove that import.

Also update the JSDoc comment at the top of the file (lines ~10-18) — remove the `prices.db` line from the Output structure:

```javascript
 * Output structure:
 *   data/api/
 *     manifest.json            ← coins list, last updated, window count
 *     latest.json              ← all coins, current 15-min window prices
 *     {slug}/
 *       latest.json            ← single coin: current prices + 96-window 24h series
 *       history-7d.json        ← daily aggregates, last 7 days
 *       history-30d.json       ← daily aggregates, last 30 days
```

(Remove the `prices.db` line from this comment.)

**Step 4: Syntax check**

```bash
node --input-type=module < devops/retail-poller/api-export.js 2>&1 | head -5
```
Expected: process hangs waiting for env vars (that's fine — it means it parsed). Ctrl-C. No syntax errors.

---

### Task 3: Fix docker-entrypoint.sh

**Files:**
- Modify: `devops/retail-poller/docker-entrypoint.sh` (lines 44-56)

**Current block (lines 44-56):**

```bash
# ── 4. Clone StakTrakrApi repo (so serve.js has data on first boot) ────
API_EXPORT_DIR="${API_EXPORT_DIR:-/tmp/staktrakr-api-export}"
POLLER_ID="${POLLER_ID:-api}"

if [ -n "$_GIT_TOKEN" ] && [ ! -d "$API_EXPORT_DIR" ]; then
  echo "[entrypoint] Cloning StakTrakrApi repo..."
  git clone "https://${_GIT_TOKEN}@github.com/lbruton/StakTrakrApi.git" "$API_EXPORT_DIR" 2>&1
  cd "$API_EXPORT_DIR"
  git fetch origin "$POLLER_ID" 2>/dev/null || true
  git checkout "$POLLER_ID" 2>/dev/null || git checkout -b "$POLLER_ID"
  git pull origin "$POLLER_ID" 2>/dev/null || true
  echo "[entrypoint] Repo ready at $API_EXPORT_DIR (branch: $POLLER_ID)"
fi
```

**Step 1: Remove the entire clone block**

`run-local.sh` now handles cloning on every run. The entrypoint clone was only needed so `serve.js` had data on cold boot — but `serve.js` does not read from the git clone (it reads from `/data/api/` or Turso). Remove the entire block including the comment. Replace with:

```bash
# ── 4. (Clone removed) run-local.sh clones fresh each run ──────────────
# API repo is no longer cloned at entrypoint — stateless clone in run-local.sh
```

**Step 2: Validate syntax**

```bash
bash -n devops/retail-poller/docker-entrypoint.sh
```
Expected: no output.

---

### Task 4: Deploy and manually test

**Agent: Human**

**Step 1: Deploy**

```bash
cd devops/retail-poller && fly deploy
```
Expected: `✔ Machine 2865339f5d5718 is now in a good state`

**Step 2: Trigger manual run**

```bash
fly ssh console --app staktrakr -C "bash -c '/app/run-local.sh 2>&1 | tail -20'"
```
Expected output should show:
- `Cloning StakTrakrApi repo (shallow)...` (NOT "updating existing")
- `Running price extraction...`
- `Pushed to api branch` (or `No new data to commit`)
- `Done.`
- No `fatal:` lines

**Step 3: Verify market feed freshness**

```bash
curl -s https://api.staktrakr.com/data/api/manifest.json | python3 -c "
import sys, json; from datetime import datetime, timezone
d = json.load(sys.stdin)
age = (datetime.now(timezone.utc) - datetime.fromisoformat(d['generated_at'].replace('Z','+00:00'))).total_seconds()/60
print(f'Market: {age:.0f}m ago  {\"✅\" if age<=30 else \"⚠️\"}')"
```
Expected: `Market: Xm ago  ✅` (under 5 minutes if triggered manually)

**Step 4: Verify temp dir cleanup**

```bash
fly ssh console --app staktrakr -C "bash -c 'ls /tmp/staktrakr-push-* 2>/dev/null && echo DIRS_EXIST || echo CLEAN'"
```
Expected: `CLEAN` (trap deleted the temp dir after the run completed)

**Step 5: Wait for next automatic cycle and check logs**

```bash
fly logs --app staktrakr 2>&1 | grep -E "(Starting retail|Done|fatal)" | tail -10
```
Expected: `Done.` lines, no `fatal:` lines.

---

### Task 5: Update the API infrastructure runbook

**Files:**
- Modify: `docs/devops/api-infrastructure-runbook.md`

**Step 1: Read the current runbook**

Read the file first to understand its current structure.

**Step 2: Update the storage model section**

Find any section describing the Fly.io persistent volume or `API_EXPORT_DIR`. Update to reflect:
- The `/data` volume now holds **only** `PRICE_LOG_DIR` JSONL audit logs
- `API_EXPORT_DIR` is no longer a persistent path — each run creates a temp dir via `mktemp -d`
- `prices.db` is no longer committed to git — it was a redundant Turso dump

**Step 3: Update any `prices.db` references**

Search for `prices.db` in the runbook and either remove or annotate as "removed in Feb 2026".

**Step 4: Update the "stale clone" diagnosis section**

Replace any advice about `rm -rf /data/staktrakr-api-export` with the note that the stateless clone pattern makes this impossible — each run is self-contained.

**Step 5: Verify markdown lints clean**

```bash
markdownlint docs/devops/api-infrastructure-runbook.md 2>&1 | head -20
```
If `markdownlint` is not installed, visually scan for consistent heading levels and no trailing spaces.

---

### Task 6: Commit

**Step 1: Stage the changed files**

```bash
git add devops/retail-poller/run-local.sh \
        devops/retail-poller/docker-entrypoint.sh \
        devops/retail-poller/api-export.js \
        docs/devops/api-infrastructure-runbook.md
```

**Step 2: Verify what's staged**

```bash
git diff --cached --stat
```
Expected: 4 files changed.

**Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
devops: stateless git clone in retail poller, drop prices.db from api

- run-local.sh: replace persistent /data clone with mktemp --depth=1
  clone per run; self-destructs via trap on EXIT
- docker-entrypoint.sh: remove entrypoint clone block (redundant);
  fix git checkout -b bug (same -B fix applied to run-local.sh earlier)
- api-export.js: remove SQLite snapshot export (prices.db was a
  redundant Turso dump; frontend never consumed it; 53MB git bloat)
- runbook: update storage model and remove stale clone recovery steps

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Auto-Quiz

1. **Which task is NEXT?** T1 — rewrite run-local.sh clone section
2. **Validation for NEXT?** `bash -n devops/retail-poller/run-local.sh` → no output; `cat -n` confirms no `prices.db` in git add, `mktemp` present, `trap` present
3. **Commit message for NEXT?** Included in T6 (single commit covers all file changes)
4. **Breakpoint?** Pause after T3 (before `fly deploy`) — human must approve the three file edits before deploying to production

---

## Notes

- The `run-goldback.sh` script uses `DATA_REPO_PATH` (which was `/data/staktrakr-api-export`) and its own `git checkout api` + `git reset --hard origin/api` pattern. That pattern is already safe (no `-b`). After this change, `DATA_REPO_PATH` will point to a path that no longer exists persistently — **goldback needs its own stateless clone fix** in a follow-up. For now it still works because it runs daily and the temp dir from run-local.sh is gone by then. File a Linear issue.
- `run-fbp.sh` (FBP backfill) may also use `API_EXPORT_DIR` — verify before shipping.
- PRICE_LOG_DIR logs at `/data/retail-poller-logs/` (if set) survive volume wipes gracefully — no action needed.

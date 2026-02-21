#!/bin/bash
# StakTrakr Retail Poller — local Docker run script
# Runs Firecrawl extraction (+ Playwright fallback), writes to SQLite,
# exports REST API JSON, and pushes to data branch.

set -e

# Lockfile guard — skip if previous run is still active
LOCKFILE=/tmp/retail-poller.lock
if [ -f "$LOCKFILE" ]; then
  echo "[$(date -u +%H:%M:%S)] Previous run still active, skipping"
  exit 0
fi
trap "rm -f $LOCKFILE" EXIT
touch $LOCKFILE

DATE=$(date -u +%Y-%m-%d)
echo "[$(date -u +%H:%M:%S)] Starting retail price run for $DATE"

# Required: DATA_REPO_PATH must be a git checkout of the data branch
if [ -z "$DATA_REPO_PATH" ]; then
  echo "ERROR: DATA_REPO_PATH not set (path to data branch git checkout)"
  exit 1
fi

# Sync to latest data branch before writing.
# Use fetch + reset (not pull --rebase) — the container's local branch has no
# durable state worth preserving since all output is regenerated from SQLite.
# pull --rebase causes a stuck rebase-merge when another agent commits between
# our start and our final push, silently freezing retail exports for hours.
cd "$DATA_REPO_PATH"
git fetch origin data && git reset --hard origin/data

# Run Firecrawl extraction (with Playwright fallback) — writes results to SQLite
echo "[$(date -u +%H:%M:%S)] Running price extraction..."
DATA_DIR="$DATA_REPO_PATH/data" \
FIRECRAWL_BASE_URL="${FIRECRAWL_BASE_URL:-http://firecrawl:3002}" \
BROWSERLESS_URL="${BROWSERLESS_URL:-}" \
BROWSER_MODE=local \
node /app/price-extract.js

# Vision pipeline — non-fatal, requires GEMINI_API_KEY + BROWSERLESS_URL
if [ -n "${GEMINI_API_KEY:-}" ] && [ -n "${BROWSERLESS_URL:-}" ]; then
  _ARTIFACT_DIR="${ARTIFACT_DIR:-/tmp/retail-screenshots/$(date -u +%Y-%m-%d)}"
  echo "[$(date -u +%H:%M:%S)] Running vision capture..."
  BROWSER_MODE=browserless \
    ARTIFACT_DIR="$_ARTIFACT_DIR" \
    DATA_DIR="$DATA_REPO_PATH/data" \
    node /app/capture.js \
    || echo "[$(date -u +%H:%M:%S)] WARN: vision capture failed (non-fatal)"

  echo "[$(date -u +%H:%M:%S)] Running vision extraction..."
  MANIFEST_PATH="$_ARTIFACT_DIR/manifest.json" \
    ARTIFACT_DIR="$_ARTIFACT_DIR" \
    DATA_DIR="$DATA_REPO_PATH/data" \
    node /app/extract-vision.js \
    || echo "[$(date -u +%H:%M:%S)] WARN: vision extraction failed (non-fatal)"
else
  echo "[$(date -u +%H:%M:%S)] Skipping vision pipeline (GEMINI_API_KEY or BROWSERLESS_URL not set)"
fi

# Export REST API JSON endpoints from SQLite
echo "[$(date -u +%H:%M:%S)] Exporting REST API JSON..."
DATA_DIR="$DATA_REPO_PATH/data" \
node /app/api-export.js

# Commit and push
cd "$DATA_REPO_PATH"
# Stage api output + vision JSONs + DB snapshot. Including data/retail/ ensures
# vision JSON files written by extract-vision.js are staged before the pre-push
# rebase — if left unstaged they cause "uncommitted changes" rebase aborts.
git add data/api/ data/retail/ prices.db 2>/dev/null || git add data/api/
if git diff --cached --quiet; then
  echo "[$(date -u +%H:%M:%S)] No new data to commit."
else
  git commit -m "retail: ${DATE} api export"
  # Pre-push rebase: replay our export commit on top of any concurrent pushes.
  # Use fetch+rebase (not pull --rebase) to avoid re-reading the pull config.
  git fetch origin data && git rebase origin/data
  git push origin data
  echo "[$(date -u +%H:%M:%S)] Pushed to data branch"
fi

echo "[$(date -u +%H:%M:%S)] Done."

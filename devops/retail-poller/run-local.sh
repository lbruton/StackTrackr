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

# Pull latest data branch before writing
cd "$DATA_REPO_PATH"
git pull --rebase origin data

# Run Firecrawl extraction (with Playwright fallback) — writes results to SQLite
echo "[$(date -u +%H:%M:%S)] Running price extraction..."
DATA_DIR="$DATA_REPO_PATH/data" \
FIRECRAWL_BASE_URL="${FIRECRAWL_BASE_URL:-http://firecrawl:3002}" \
BROWSERLESS_URL="${BROWSERLESS_URL:-}" \
BROWSER_MODE=local \
node /app/price-extract.js

# Export REST API JSON endpoints from SQLite
echo "[$(date -u +%H:%M:%S)] Exporting REST API JSON..."
DATA_DIR="$DATA_REPO_PATH/data" \
node /app/api-export.js

# Commit and push
cd "$DATA_REPO_PATH"
git add data/api/
if git diff --cached --quiet; then
  echo "[$(date -u +%H:%M:%S)] No new data to commit."
else
  git commit -m "retail: ${DATE} api export"
  git pull --rebase origin data
  git push origin data
  echo "[$(date -u +%H:%M:%S)] Pushed to data branch"
fi

echo "[$(date -u +%H:%M:%S)] Done."

#!/bin/bash
# StakTrakr Retail Poller — local Docker run script
# Runs Firecrawl extraction, merges results, pushes to data branch.
# Vision follow-up (Gemini) is handled by GitHub Actions on push.

set -e

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

# Run Firecrawl extraction
echo "[$(date -u +%H:%M:%S)] Running Firecrawl extraction..."
DATA_DIR="$DATA_REPO_PATH/data" \
FIRECRAWL_BASE_URL="${FIRECRAWL_BASE_URL:-http://firecrawl:3002}" \
BROWSER_MODE=local \
node /app/price-extract.js

# Run merger (firecrawl-only pass — no vision data yet)
echo "[$(date -u +%H:%M:%S)] Running confidence merger..."
DATA_DIR="$DATA_REPO_PATH/data" \
node /app/merge-prices.js "$DATE"

# Commit and push — this triggers the GH Actions vision follow-up
cd "$DATA_REPO_PATH"
git add data/retail/
if git diff --cached --quiet; then
  echo "[$(date -u +%H:%M:%S)] No new data to commit."
else
  git commit -m "retail: ${DATE} firecrawl prices"
  git pull --rebase origin data
  git push origin data
  echo "[$(date -u +%H:%M:%S)] Pushed to data branch — GH Actions will handle vision follow-up"
fi

echo "[$(date -u +%H:%M:%S)] Done."

#!/bin/bash
# StakTrakr FBP Snapshot — scrapes FindBullionPrices for all tracked coins.
# Runs at 3pm ET (after the 11am full scrape) via Docker cron.
# Uses self-hosted Firecrawl at http://firecrawl:3002.

set -e

DATE=$(date -u +%Y-%m-%d)
echo "[$(date -u +%H:%M:%S)] Starting FBP snapshot for $DATE"

if [ -z "$DATA_REPO_PATH" ]; then
  echo "ERROR: DATA_REPO_PATH not set (path to data branch git checkout)"
  exit 1
fi

# Skip if today's snapshot already exists
if [ -f "$DATA_REPO_PATH/data/retail/fbp/${DATE}.json" ]; then
  echo "[$(date -u +%H:%M:%S)] Snapshot already exists for ${DATE}, skipping."
  exit 0
fi

cd "$DATA_REPO_PATH"
git pull --rebase origin data

FBP_ONLY=1 \
DATA_DIR="$DATA_REPO_PATH/data" \
FIRECRAWL_BASE_URL="${FIRECRAWL_BASE_URL:-http://firecrawl:3002}" \
node /app/price-extract.js

cd "$DATA_REPO_PATH"
git add data/retail/fbp/
if git diff --cached --quiet; then
  echo "[$(date -u +%H:%M:%S)] No FBP data to commit."
else
  git commit -m "retail: ${DATE} fbp snapshot"
  git pull --rebase origin data
  git push origin data
  echo "[$(date -u +%H:%M:%S)] Pushed FBP snapshot to data branch."
fi

echo "[$(date -u +%H:%M:%S)] Done."

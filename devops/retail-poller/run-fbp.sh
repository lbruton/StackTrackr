#!/bin/bash
# StakTrakr Gap-Fill Run — 3pm ET follow-up to the 11am full scrape.
# Reads today's coin files, finds any remaining failed_sites, scrapes
# FindBullionPrices only for those coins, and patches the files in place.

set -e

DATE=$(date -u +%Y-%m-%d)
echo "[$(date -u +%H:%M:%S)] Starting gap-fill run for $DATE"

if [ -z "$DATA_REPO_PATH" ]; then
  echo "ERROR: DATA_REPO_PATH not set (path to data branch git checkout)"
  exit 1
fi

cd "$DATA_REPO_PATH"
git pull --rebase origin data

PATCH_GAPS=1 \
DATA_DIR="$DATA_REPO_PATH/data" \
FIRECRAWL_BASE_URL="${FIRECRAWL_BASE_URL:-http://firecrawl:3002}" \
node /app/price-extract.js

cd "$DATA_REPO_PATH"
git add data/retail/
if git diff --cached --quiet; then
  echo "[$(date -u +%H:%M:%S)] No gaps filled — nothing to commit."
else
  git commit -m "retail: ${DATE} gap-fill (fbp)"
  git pull --rebase origin data
  git push origin data
  echo "[$(date -u +%H:%M:%S)] Pushed gap-fill patches to data branch."
fi

echo "[$(date -u +%H:%M:%S)] Done."

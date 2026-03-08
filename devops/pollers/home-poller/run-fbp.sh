#!/bin/bash
# StakTrakr Gap-Fill Run — daily follow-up scrape for failed vendors.
# Queries SQLite for today's failed vendors, scrapes FindBullionPrices,
# writes recovered prices to SQLite, then regenerates data/api/.

set -euo pipefail

DATE=$(date -u +%Y-%m-%d)
echo "[$(date -u +%H:%M:%S)] Starting gap-fill run for $DATE"

if [ -z "${DATA_REPO_PATH:-}" ]; then
  echo "ERROR: DATA_REPO_PATH not set (path to data branch git checkout)"
  exit 1
fi

cd "$DATA_REPO_PATH"
git pull --rebase origin data

# Run gap-fill: queries SQLite for failed vendors, scrapes FBP, writes to SQLite
echo "[$(date -u +%H:%M:%S)] Running gap-fill extraction..."
PATCH_GAPS=1 \
DATA_DIR="$DATA_REPO_PATH/data" \
FIRECRAWL_BASE_URL="${FIRECRAWL_BASE_URL:-http://firecrawl:3002}" \
node /app/price-extract.js

# Re-export REST API JSON with recovered prices
echo "[$(date -u +%H:%M:%S)] Re-exporting REST API JSON..."
DATA_DIR="$DATA_REPO_PATH/data" \
node /app/api-export.js

cd "$DATA_REPO_PATH"
git add data/api/
if git diff --cached --quiet; then
  echo "[$(date -u +%H:%M:%S)] No gaps filled — nothing to commit."
else
  git commit -m "retail: ${DATE} gap-fill (fbp)"
  git pull --rebase origin data
  git push origin data
  echo "[$(date -u +%H:%M:%S)] Pushed gap-fill patches to data branch."
fi

echo "[$(date -u +%H:%M:%S)] Done."

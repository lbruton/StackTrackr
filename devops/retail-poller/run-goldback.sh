#!/bin/bash
# StakTrakr Goldback Daily Rate Poller
# Runs once per day via cron -- scrapes G1 rate, commits to data branch.

set -e

LOCKFILE=/tmp/goldback-poller.lock
if [ -f "$LOCKFILE" ]; then
  echo "[$(date -u +%H:%M:%S)] Goldback poller already running, skipping"
  exit 0
fi
trap "rm -f $LOCKFILE" EXIT
touch $LOCKFILE

if [ -z "${DATA_REPO_PATH:-}" ]; then
  echo "ERROR: DATA_REPO_PATH not set"
  exit 1
fi

YEAR=$(date +%Y)
DATE=$(date +%Y-%m-%d)

echo "[$(date -u +%H:%M:%S)] Goldback rate poll for ${DATE}"

cd "$DATA_REPO_PATH"
git rebase --abort 2>/dev/null || true
git merge --abort 2>/dev/null || true
git fetch origin api
git checkout api
git reset --hard origin/api

DATA_DIR="$DATA_REPO_PATH/data" \
FIRECRAWL_BASE_URL="${FIRECRAWL_BASE_URL:-http://firecrawl:3002}" \
node /app/goldback-scraper.js

git add \
  "data/api/goldback-spot.json" \
  "data/goldback-${YEAR}.json" \
  2>/dev/null || true

if git diff --cached --quiet; then
  echo "[$(date -u +%H:%M:%S)] No new Goldback data to commit."
else
  git commit -m "data: goldback spot ${DATE}"
  git push origin api
  echo "[$(date -u +%H:%M:%S)] Pushed Goldback rate to api branch"
fi

echo "[$(date -u +%H:%M:%S)] Done."

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

# Prune price log files older than 30 days (non-fatal)
if [ -n "${PRICE_LOG_DIR:-}" ]; then
  find "$PRICE_LOG_DIR" -name "prices-*.jsonl" -mtime +30 -delete 2>/dev/null || true
fi

# StakTrakrApi repo configuration
API_DATA_REPO="${API_DATA_REPO:-https://github.com/lbruton/StakTrakrApi.git}"
API_EXPORT_DIR="${API_EXPORT_DIR:-/tmp/staktrakr-api-export}"
POLLER_ID="${POLLER_ID:-api1}"

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
git checkout "$POLLER_ID" 2>/dev/null || git checkout -b "$POLLER_ID"
git pull origin "$POLLER_ID" 2>/dev/null || true  # May fail if branch doesn't exist on remote yet

# Run Firecrawl extraction (with Playwright fallback) — writes results to SQLite
echo "[$(date -u +%H:%M:%S)] Running price extraction..."
DATA_DIR="$API_EXPORT_DIR/data" \
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
    DATA_DIR="$API_EXPORT_DIR/data" \
    node /app/capture.js \
    || echo "[$(date -u +%H:%M:%S)] WARN: vision capture failed (non-fatal)"

  echo "[$(date -u +%H:%M:%S)] Running vision extraction..."
  MANIFEST_PATH="$_ARTIFACT_DIR/manifest.json" \
    ARTIFACT_DIR="$_ARTIFACT_DIR" \
    DATA_DIR="$API_EXPORT_DIR/data" \
    node /app/extract-vision.js \
    || echo "[$(date -u +%H:%M:%S)] WARN: vision extraction failed (non-fatal)"
else
  echo "[$(date -u +%H:%M:%S)] Skipping vision pipeline (GEMINI_API_KEY or BROWSERLESS_URL not set)"
fi

# Export REST API JSON endpoints from SQLite
echo "[$(date -u +%H:%M:%S)] Exporting REST API JSON..."
DATA_DIR="$API_EXPORT_DIR/data" \
node /app/api-export.js

# Commit and push to poller branch
cd "$API_EXPORT_DIR"
git add data/api/ data/retail/ prices.db 2>/dev/null || git add data/api/

if git diff --cached --quiet; then
  echo "[$(date -u +%H:%M:%S)] No new data to commit."
else
  git commit -m "${POLLER_ID}: ${DATE} $(date -u +%H:%M) export"
  # Force push since this poller owns its branch exclusively
  git push --force-with-lease "https://${GITHUB_TOKEN}@github.com/lbruton/StakTrakrApi.git" "$POLLER_ID"
  echo "[$(date -u +%H:%M:%S)] Pushed to ${POLLER_ID} branch"
fi

echo "[$(date -u +%H:%M:%S)] Done."

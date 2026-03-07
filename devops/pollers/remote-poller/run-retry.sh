#!/bin/bash
# StakTrakr T3 Retry — cron at :15 each hour
# Re-scrapes failed SKUs from the :00 run via HOME_PROXY_URL (tinyproxy).
# No-op if /tmp/retail-failures.json is absent.
# NOTE: dead code — retail-failures.json is never written (failures go to Turso).

set -e

RETRY_FILE=/tmp/retail-failures.json
API_EXPORT_DIR="${API_EXPORT_DIR:-/data/staktrakr-api-export}"

if [ ! -f "$RETRY_FILE" ]; then
  echo "[$(date -u +%H:%M:%S)] T3 retry: no failures queued — skipping"
  exit 0
fi

# Always clear the queue on exit — T4 handles any remaining gaps at :23 publish
trap 'rm -f "$RETRY_FILE"' EXIT

FAIL_COUNT=$(node -e "try { console.log(require('$RETRY_FILE').length); } catch { console.log(0); }")
echo "[$(date -u +%H:%M:%S)] T3 retry: $FAIL_COUNT failed SKU(s)"

# Extract unique coin slugs from the retry queue
COINS=$(node -e "
  try {
    const f = JSON.parse(require('fs').readFileSync('$RETRY_FILE', 'utf8'));
    console.log([...new Set(f.map(x => x.coinSlug))].join(','));
  } catch(e) { console.error(e.message); process.exit(1); }
")

echo "[$(date -u +%H:%M:%S)] T3 retry: coins = $COINS"

PROXY_DISABLED="" \
COINS="$COINS" \
DATA_DIR="$API_EXPORT_DIR/data" \
FIRECRAWL_BASE_URL="${FIRECRAWL_BASE_URL:-http://localhost:3002}" \
BROWSER_MODE=local \
node /app/price-extract.js \
  && echo "[$(date -u +%H:%M:%S)] T3 retry: extraction complete" \
  || echo "[$(date -u +%H:%M:%S)] WARN: T3 retry had errors — T4 will fill gaps at :23 publish"

echo "[$(date -u +%H:%M:%S)] T3 retry: done — queue will be cleared on exit"

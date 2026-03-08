#!/bin/bash
# Monitor out-of-stock detection in the retail poller

set -e

CONTAINER_NAME="firecrawl-docker-retail-poller-1"

echo "=== Retail Poller OOS Detection Monitor ==="
echo "Container: $CONTAINER_NAME"
echo "Started at: $(date)"
echo ""

# Check current time and next cron window
echo "Current time (UTC): $(docker exec $CONTAINER_NAME date -u '+%H:%M:%S')"
CURRENT_MIN=$(docker exec $CONTAINER_NAME date -u '+%-M')
NEXT_MIN=$((($CURRENT_MIN / 15 + 1) * 15))
if [ $NEXT_MIN -ge 60 ]; then NEXT_MIN=0; fi
echo "Next scrape window: :${NEXT_MIN} (every 15 minutes)"
echo ""

# Check database state
echo "=== Database State ==="
docker exec $CONTAINER_NAME node -e "
const Database = require('better-sqlite3');
const db = new Database('/data-repo/prices.db', { readonly: true });

const total = db.prepare('SELECT COUNT(*) as cnt FROM price_snapshots').get();
console.log('Total snapshots:', total.cnt);

const oos = db.prepare('SELECT COUNT(*) as cnt FROM price_snapshots WHERE in_stock = 0').get();
console.log('Out-of-stock rows:', oos.cnt);

const latest = db.prepare('SELECT MAX(scraped_at) as ts FROM price_snapshots').get();
console.log('Latest scrape:', latest.ts || 'none');

if (oos.cnt > 0) {
  console.log('\\nOOS entries:');
  const oosRows = db.prepare('SELECT coin_slug, vendor, price, scraped_at FROM price_snapshots WHERE in_stock = 0 ORDER BY scraped_at DESC LIMIT 10').all();
  oosRows.forEach(r => console.log(\`  \${r.scraped_at.slice(0,16)} \${r.coin_slug}@\${r.vendor} price=\${r.price}\`));
}

db.close();
"
echo ""

echo "=== Watching Logs (Ctrl+C to exit) ==="
echo "Looking for: OOS detection, consensus logic, Vision/Firecrawl results..."
echo ""
docker compose -f /Volumes/DATA/GitHub/StakTrakr/devops/firecrawl-docker/docker-compose.yml logs -f --tail=20 retail-poller

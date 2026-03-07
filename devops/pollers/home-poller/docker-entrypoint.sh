#!/bin/bash
set -e

echo "[entrypoint] Starting StakTrakr home poller container..."

# ── 0. Inject tracker blocklist into /etc/hosts ─────────────────────────
if [ -f /app/tracker-blocklist.txt ]; then
  cat /app/tracker-blocklist.txt >> /etc/hosts
  echo "[entrypoint] Tracker blocklist injected ($(wc -l < /app/tracker-blocklist.txt) entries)"
fi

# ── 1. Export env vars for cron jobs (cron doesn't inherit Docker env) ──
printenv | grep -v '^_=' > /etc/environment

# ── 2. Create data directories ──────────────────────────────────────────
mkdir -p /data/retail /data/api /data/hourly

# ── 3. Write cron schedule ──────────────────────────────────────────────
# Home poller offsets from Fly.io to stagger Turso writes:
#   Retail:  :30 (Fly.io runs at :00)
#   Spot:    :15,:45 (Fly.io runs at :00,:30)
#   Goldback: :31 (Fly.io runs at :01)
#   Provider export: every 5 min (same as Fly.io)
#   Fly.io health check: every 5 min
echo "[entrypoint] Writing cron schedule..."
cat > /etc/cron.d/home-poller << 'CRON'
# StakTrakr home poller cron jobs
30 * * * * root . /etc/environment; /app/run-home.sh >> /var/log/retail-poller.log 2>&1
15,45 * * * * root . /etc/environment; POLLER_ID=home-spot METAL_PRICE_API_KEY=$METAL_PRICE_API_KEY DATA_DIR=/data TURSO_DATABASE_URL=$TURSO_DATABASE_URL TURSO_AUTH_TOKEN=$TURSO_AUTH_TOKEN node /app/spot-extract.js >> /var/log/spot-poller.log 2>&1
31 * * * * root . /etc/environment; cd /app && node goldback-scraper.js >> /var/log/goldback-poller.log 2>&1
*/5 * * * * root . /etc/environment; cd /app && node export-providers-json.js >> /var/log/provider-export.log 2>&1
*/5 * * * * root . /etc/environment; /app/check-flyio.sh >> /var/log/flyio-check.log 2>&1
CRON
chmod 0644 /etc/cron.d/home-poller

# ── 4. Create log files ─────────────────────────────────────────────────
touch /var/log/retail-poller.log /var/log/spot-poller.log \
      /var/log/goldback-poller.log /var/log/provider-export.log \
      /var/log/flyio-check.log

echo "[entrypoint] Handing off to supervisord..."
exec "$@"

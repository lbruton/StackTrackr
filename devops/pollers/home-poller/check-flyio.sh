#!/bin/bash
# StakTrakr — Fly.io container health check via Tailscale
# =========================================================
# Pings the Fly.io container's Tailscale IP and checks its
# public HTTP endpoint. Logs result to poller log and writes
# a one-line status file readable by the dashboard.
#
# Run manually or add to cron.
# Suggested cron (every 5 min, as root):
#   */5 * * * * root /opt/poller/check-flyio.sh >> /var/log/retail-poller.log 2>&1
#
# Set FLYIO_TAILSCALE_IP once the container is back up.

FLYIO_TAILSCALE_IP="${FLYIO_TAILSCALE_IP:-100.90.171.110}"
FLYIO_HTTP_URL="${FLYIO_HTTP_URL:-https://api2.staktrakr.com/data/retail/providers.json}"
STATUS_FILE="/tmp/flyio-health.json"
TIMEOUT=10

log() { echo "[$(date -u +%H:%M:%S)] [flyio-check] $*"; }

# ── Tailscale ping (best-effort from Docker bridge) ──────────────────────────
ts_ok=false
ts_ms="skipped"
if [ "$FLYIO_TAILSCALE_IP" != "TODO_REPLACE_WITH_IP" ] && command -v ping > /dev/null 2>&1; then
  if ping -c 1 -W "$TIMEOUT" "$FLYIO_TAILSCALE_IP" > /dev/null 2>&1; then
    ts_ms=$(ping -c 1 -W "$TIMEOUT" "$FLYIO_TAILSCALE_IP" 2>/dev/null | grep -oP 'time=\K[0-9.]+' | head -1)
    ts_ok=true
    log "Tailscale ping OK (${ts_ms:-?}ms)"
  else
    ts_ms="timeout"
    log "INFO: Tailscale ping failed (expected from Docker bridge network)"
  fi
fi

# ── HTTP endpoint check ───────────────────────────────────────────────────────
http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$FLYIO_HTTP_URL" 2>/dev/null)
if [ "$http_code" = "200" ] || [ "$http_code" = "404" ]; then
  http_ok=true
  log "HTTP check OK — serve.js responding ($FLYIO_HTTP_URL → $http_code)"
else
  http_ok=false
  log "WARN: HTTP check FAILED ($FLYIO_HTTP_URL → ${http_code:-no response})"
fi

# ── Write status JSON (dashboard reads this) ─────────────────────────────────
cat > "$STATUS_FILE" << EOF
{
  "checked_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "tailscale_ip": "${FLYIO_TAILSCALE_IP}",
  "tailscale_ok": ${ts_ok},
  "tailscale_latency": "${ts_ms}",
  "http_url": "${FLYIO_HTTP_URL}",
  "http_ok": ${http_ok},
  "http_code": "${http_code}"
}
EOF

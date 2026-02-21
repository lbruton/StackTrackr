#!/bin/bash
set -e

echo "[entrypoint] Starting StakTrakr all-in-one container..."

# ── 1. Export env vars for cron jobs (cron doesn't inherit Docker env) ──
printenv | grep -v '^_=' > /etc/environment

# ── 2. Configure git credentials ───────────────────────────────────────
_GIT_TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"
if [ -n "$_GIT_TOKEN" ]; then
  git config --global credential.helper store
  printf 'https://x-access-token:%s@github.com\n' "$_GIT_TOKEN" > /root/.git-credentials
  chmod 600 /root/.git-credentials
fi

# ── 3. Initialize PostgreSQL ───────────────────────────────────────────
PG_DATA="/var/lib/postgresql/17/main"
if [ ! -f "$PG_DATA/PG_VERSION" ]; then
  echo "[entrypoint] Initializing PostgreSQL..."
  mkdir -p "$PG_DATA"
  chown -R postgres:postgres /var/lib/postgresql
  su - postgres -c "/usr/lib/postgresql/17/bin/initdb -D $PG_DATA"

  # Enable pg_cron and tune for Firecrawl
  echo "shared_preload_libraries = 'pg_cron'" >> "$PG_DATA/postgresql.conf"
  echo "cron.database_name = 'postgres'" >> "$PG_DATA/postgresql.conf"
  # Listen on localhost only (container-internal)
  sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" "$PG_DATA/postgresql.conf"
  # Allow local connections without password
  echo "local all all trust" > "$PG_DATA/pg_hba.conf"
  echo "host all all 127.0.0.1/32 trust" >> "$PG_DATA/pg_hba.conf"

  # Start postgres temporarily to run init SQL
  su - postgres -c "/usr/lib/postgresql/17/bin/pg_ctl -D $PG_DATA -w start"
  su - postgres -c "psql -f /opt/postgres/nuq.sql" || echo "[entrypoint] WARN: nuq.sql init had errors (non-fatal)"
  su - postgres -c "/usr/lib/postgresql/17/bin/pg_ctl -D $PG_DATA -w stop"
  echo "[entrypoint] PostgreSQL initialized."
else
  echo "[entrypoint] PostgreSQL data directory exists, skipping init."
  chown -R postgres:postgres /var/lib/postgresql
fi

# ── 4. Clone StakTrakrApi repo (so serve.js has data on first boot) ────
API_EXPORT_DIR="${API_EXPORT_DIR:-/tmp/staktrakr-api-export}"
POLLER_ID="${POLLER_ID:-api1}"

if [ -n "$_GIT_TOKEN" ] && [ ! -d "$API_EXPORT_DIR" ]; then
  echo "[entrypoint] Cloning StakTrakrApi repo..."
  git clone "https://${_GIT_TOKEN}@github.com/lbruton/StakTrakrApi.git" "$API_EXPORT_DIR" 2>&1
  cd "$API_EXPORT_DIR"
  git fetch origin "$POLLER_ID" 2>/dev/null || true
  git checkout "$POLLER_ID" 2>/dev/null || git checkout -b "$POLLER_ID"
  git pull origin "$POLLER_ID" 2>/dev/null || true
  echo "[entrypoint] Repo ready at $API_EXPORT_DIR (branch: $POLLER_ID)"
fi

# ── 5.5. Dynamic cron schedule (overrides Dockerfile baked-in crontab) ──
CRON_SCHEDULE="${CRON_SCHEDULE:-*/15}"
if ! echo "$CRON_SCHEDULE" | grep -qE '^[0-9*/,\-]+$'; then
  echo "[entrypoint] ERROR: Invalid CRON_SCHEDULE '${CRON_SCHEDULE}' — aborting." >&2
  exit 1
fi
echo "[entrypoint] Writing cron schedule: ${CRON_SCHEDULE}"
(echo "${CRON_SCHEDULE} * * * * root . /etc/environment; /app/run-local.sh >> /var/log/retail-poller.log 2>&1"; \
 echo "0 20 * * * root . /etc/environment; /app/run-fbp.sh >> /var/log/retail-poller.log 2>&1"; \
 echo "1 17 * * * root . /etc/environment; /app/run-goldback.sh >> /var/log/goldback-poller.log 2>&1") \
  > /etc/cron.d/retail-poller
chmod 0644 /etc/cron.d/retail-poller

# ── 6. Create log files ───────────────────────────────────────────────
touch /var/log/retail-poller.log /var/log/goldback-poller.log /var/log/http-server.log

echo "[entrypoint] Handing off to supervisord..."
exec "$@"

#!/bin/bash
set -e

# Make container env vars available to cron jobs (cron doesn't inherit Docker env)
printenv | grep -v '^_=' > /etc/environment

# Configure HTTPS git credentials if GH_TOKEN is provided
if [ -n "${GH_TOKEN}" ]; then
  git config --global credential.helper store
  printf 'https://x-access-token:%s@github.com\n' "${GH_TOKEN}" > /root/.git-credentials
  chmod 600 /root/.git-credentials
fi

# Start HTTP server in background (serves StakTrakrApi data at api.staktrakr.com)
node /app/serve.js >> /var/log/http-server.log 2>&1 &

exec "$@"

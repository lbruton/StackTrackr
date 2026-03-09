#!/bin/sh
# tinyproxy entrypoint — wait for shared network namespace from tailscale sidecar
# network_mode: container:tailscale-staktrakr means we have no network if tailscale isn't up

set -e

# Ensure log directory exists (Alpine package may not create it)
mkdir -p /var/log/tinyproxy
chown tinyproxy:tinyproxy /var/log/tinyproxy

# Wait for a routable (non-loopback) network interface
# When sharing tailscale's network namespace, we need its interfaces to be up
TIMEOUT=60
ELAPSED=0
echo "tinyproxy: waiting for network namespace..."
while ! grep -q '00000000' /proc/net/route 2>/dev/null; do
  sleep 2
  ELAPSED=$((ELAPSED + 2))
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo "tinyproxy: ERROR — no routable interface after ${TIMEOUT}s. Is tailscale-staktrakr running?"
    exit 1
  fi
done
echo "tinyproxy: network ready after ${ELAPSED}s"

exec tinyproxy -d

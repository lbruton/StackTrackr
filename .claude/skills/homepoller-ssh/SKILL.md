---
name: homepoller-ssh
description: Use when troubleshooting the home poller, checking service health, viewing logs, restarting services, redeploying stacks, or running any command on the home VM. Also use when the words home poller, homepoller, 192.168.1.81, Portainer, Docker stack, retail-poller.log, or residential proxy appear in context.
---

# Home Poller SSH — Docker/Portainer Architecture

The home poller runs as Docker containers managed by Portainer on an Ubuntu VM. Code deploys via Portainer API from git (StakTrakr repo, `devops/pollers/` directory).

## Connection

| Alias | Network | Host | Latency |
|-------|---------|------|---------|
| `homepoller` | LAN | 192.168.1.81 | ~0.5ms |
| `homepoller-ts` | Tailscale | 100.112.198.50 | ~36ms |

**Always use `-T`** (no PTY) for non-interactive commands:

```bash
ssh -T homepoller '<command>'
```

**User:** `stakpoller` — has `NOPASSWD: ALL` sudo via `/etc/sudoers.d/stakpoller`.

**Key:** `~/.ssh/stakpoller_ed25519` — sourced from Infisical prod environment (`STAKPOLLER_SSH_PRIVATE_KEY`). Config: `~/.ssh/config`.

---

## Docker Stacks (Portainer-Managed)

All services run as Docker containers on the `staktrakr-net` bridge network. Portainer manages four git-based stacks:

| Stack | Stack ID | Container(s) | Ports | Compose file |
|-------|----------|---------------|-------|--------------|
| home-poller | 7 | `staktrakr-home-poller` | 3010 (HTTP), 3011 (HTTPS), 9100 (metrics) | `devops/pollers/docker-compose.home.yml` |
| firecrawl | 4 | `firecrawl-api`, workers | 3002 | `devops/firecrawl-docker/docker-compose.yml` |
| tinyproxy | 5 | `tinyproxy-staktrakr` | 8888 | `devops/pollers/docker-compose.tinyproxy.yml` |
| tailscale | 8 | `tailscale-staktrakr` | — (network namespace) | `devops/pollers/docker-compose.tailscale.yml` |

**Portainer UI:** `https://192.168.1.81:9443` (HTTPS only, self-signed cert)

**Docker is snap-installed.** Volume mountpoint: `/var/snap/docker/common/var-lib-docker/volumes/`

---

## Quick Diagnostics

```bash
# All StakTrakr containers
ssh -T homepoller 'docker ps --filter network=staktrakr-net --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'

# Home poller supervisord services (inside container)
ssh -T homepoller 'docker exec staktrakr-home-poller supervisorctl status'

# Recent poller log (persistent volume)
ssh -T homepoller 'docker exec staktrakr-home-poller tail -50 /data/logs/retail-poller.log'

# Spot poller log
ssh -T homepoller 'docker exec staktrakr-home-poller tail -30 /data/logs/spot-poller.log'

# Goldback poller log
ssh -T homepoller 'docker exec staktrakr-home-poller tail -20 /data/logs/goldback-poller.log'

# Fly.io health check log
ssh -T homepoller 'docker exec staktrakr-home-poller tail -20 /data/logs/flyio-check.log'

# Provider export log
ssh -T homepoller 'docker exec staktrakr-home-poller tail -20 /data/logs/provider-export.log'

# Dashboard / metrics supervisor logs
ssh -T homepoller 'docker exec staktrakr-home-poller tail -20 /var/log/supervisor/dashboard.log'
ssh -T homepoller 'docker exec staktrakr-home-poller tail -20 /var/log/supervisor/metrics-exporter.log'

# Check if poller lock is stuck
ssh -T homepoller 'docker exec staktrakr-home-poller ls -la /tmp/retail-poller.lock 2>/dev/null || echo "No lock"'

# Cron schedule
ssh -T homepoller 'docker exec staktrakr-home-poller cat /etc/cron.d/home-poller'

# Firecrawl health
ssh -T homepoller 'curl -sf http://localhost:3002/v1/scrape -X POST -H "Content-Type: application/json" -d "{\"url\":\"https://example.com\"}" | head -c 200'

# Tailscale sidecar status
ssh -T homepoller 'docker exec tailscale-staktrakr tailscale status'

# Tinyproxy test (via Tailscale sidecar network)
ssh -T homepoller 'docker exec tailscale-staktrakr curl -sf --proxy http://localhost:8888 https://api.ipify.org'

# Disk usage
ssh -T homepoller 'df -h / && echo "---" && docker system df'
```

---

## Common Tasks

| Task | Command |
|------|---------|
| Restart home-poller container | `ssh -T homepoller 'docker restart staktrakr-home-poller'` |
| Restart supervisord service inside container | `ssh -T homepoller 'docker exec staktrakr-home-poller supervisorctl restart <name>'` |
| Clear stuck lockfile | `ssh -T homepoller 'docker exec staktrakr-home-poller rm -f /tmp/retail-poller.lock'` |
| View cron schedule | `ssh -T homepoller 'docker exec staktrakr-home-poller cat /etc/cron.d/home-poller'` |
| Check env vars (names only) | `ssh -T homepoller 'docker exec staktrakr-home-poller printenv \| grep -oP "^[A-Z_]+"'` |
| Test single coin | `ssh -T homepoller 'docker exec -e COINS=ase staktrakr-home-poller bash /app/run-home.sh'` |
| Trigger full scrape | `ssh -T homepoller 'docker exec staktrakr-home-poller bash /app/run-home.sh'` |
| View container logs (Docker) | `ssh -T homepoller 'docker logs --tail 50 staktrakr-home-poller'` |
| Restart Tailscale sidecar | `ssh -T homepoller 'docker restart tailscale-staktrakr'` |
| Restart tinyproxy | `ssh -T homepoller 'docker restart tinyproxy-staktrakr'` |

---

## Deploying Code Changes (Portainer API)

Code deploys via Portainer's git-based stack redeploy. No SSH file copying needed — Portainer pulls from the git branch directly.

### Redeploy home-poller stack

The home-poller stack requires env vars on every redeploy (Portainer does not persist them across git redeployments):

```bash
# Get secrets from Infisical first (use secrets skill)
# Then redeploy via Portainer API:

PORTAINER_URL="https://192.168.1.81:9443"
PORTAINER_TOKEN="<from-infisical:PORTAINER_TOKEN>"
STACK_ID=7
ENDPOINT_ID=3

ssh -T homepoller "curl -sk -X PUT \
  '${PORTAINER_URL}/api/stacks/${STACK_ID}/git/redeploy?endpointId=${ENDPOINT_ID}' \
  -H 'X-API-Key: ${PORTAINER_TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{
    \"pullImage\": true,
    \"prune\": true,
    \"env\": [
      {\"name\": \"TURSO_DATABASE_URL\", \"value\": \"<from-infisical>\"},
      {\"name\": \"TURSO_AUTH_TOKEN\", \"value\": \"<from-infisical>\"},
      {\"name\": \"METAL_PRICE_API_KEY\", \"value\": \"<from-infisical>\"},
      {\"name\": \"GEMINI_API_KEY\", \"value\": \"<from-infisical>\"},
      {\"name\": \"FIRECRAWL_BASE_URL\", \"value\": \"http://firecrawl-api:3002\"},
      {\"name\": \"FLYIO_TAILSCALE_IP\", \"value\": \"100.90.171.110\"},
      {\"name\": \"FLYIO_HTTP_URL\", \"value\": \"https://api2.staktrakr.com/data/retail/providers.json\"}
    ]
  }'"
```

### Redeploy other stacks (no env vars needed)

```bash
# Tailscale (stack 8), tinyproxy (stack 5), firecrawl (stack 4)
ssh -T homepoller "curl -sk -X PUT \
  '${PORTAINER_URL}/api/stacks/<STACK_ID>/git/redeploy?endpointId=${ENDPOINT_ID}' \
  -H 'X-API-Key: ${PORTAINER_TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"pullImage\": true, \"prune\": true}'"
```

**Git branch:** Currently `feat/DEV-72-pollers-directory` — will be `dev` after PR merge.

---

## Key Paths

| Location | Path |
|----------|------|
| Poller scripts (in container) | `/app/` |
| Persistent data volume | `/data/` (Docker volume `staktrakr-poller-data`) |
| Logs (persistent) | `/data/logs/retail-poller.log`, `spot-poller.log`, `goldback-poller.log`, `provider-export.log`, `flyio-check.log` |
| Supervisord logs (ephemeral) | `/var/log/supervisor/` |
| Cron schedule | `/etc/cron.d/home-poller` |
| TLS cert (HTTPS dashboard) | `/app/tls-cert.pem`, `/app/tls-key.pem` |
| Tracker blocklist | `/app/tracker-blocklist.txt` |
| Source code (repo) | `StakTrakr/devops/pollers/shared/` + `devops/pollers/home-poller/` |

---

## Cron Schedule (inside container)

| Job | Schedule | Offset from Fly.io |
|-----|----------|-------------------|
| Retail scrape (`run-home.sh`) | `:30` every hour | Fly.io runs at `:00` |
| Spot prices (`spot-extract.js`) | `:15, :45` every hour | Fly.io runs at `:00, :30` |
| Goldback (`goldback-scraper.js`) | `:31` every hour | Fly.io runs at `:01` |
| Provider export (`export-providers-json.js`) | Every 5 min | Same as Fly.io |
| Fly.io health check (`check-flyio.sh`) | Every 5 min | — |

---

## Common Mistakes

**Running without `-T`**: Commands output twice (once from PTY, once from stdout). Always `ssh -T`.

**Forgetting `docker exec`**: All poller commands run INSIDE the container. `ssh -T homepoller 'tail /data/logs/...'` will fail — the volume is only mounted inside the container. Use `docker exec staktrakr-home-poller ...`.

**Missing env vars on redeploy**: Portainer git-based stacks lose env vars on redeploy. Always pass the full `env` array (see deploy section above). If Turso queries fail after redeploy, this is almost certainly the cause.

**Editing files on the VM directly**: Code is deployed from git via Portainer. Edit in the StakTrakr repo (`devops/pollers/`), push, then redeploy the stack. Do not `docker exec` to edit files — changes are lost on next redeploy.

**Wrong Portainer URL**: Portainer is HTTPS on port 9443, not HTTP on 9000. Use `https://192.168.1.81:9443` from the VM.

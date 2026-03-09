---
name: sync-poller
description: >
  Deploy poller code changes to the Portainer VM. Portainer GitOps auto-deploys within 5 minutes
  of any push to the tracked branch. Use this skill for immediate manual deploys when you can't
  wait, or when the user says "sync poller", "deploy poller", "redeploy home poller".
---

# Sync Poller -- Git to Docker via Portainer

Poller code lives in `StakTrakr/devops/pollers/`. Portainer has **GitOps enabled with a 5-minute
polling interval** on all stacks. Push to the tracked branch and it auto-deploys. No SSH file
copying, no curl-update.

## Deployment Model

**Primary (GitOps auto-deploy):** Commit, push to the tracked branch (usually `dev`). Portainer
polls every 5 minutes, detects the change, pulls, rebuilds the image, and restarts the container.
No manual action needed.

**Manual (immediate deploy):** Use the Portainer API to trigger an immediate redeploy when you
can't wait 5 minutes. See "Manual Redeploy" section below.

## SSH Host

The Portainer VM SSH host is `portainer` (LAN) or `portainer-ts` (Tailscale). User: `portainer`.

```bash
# Container status
ssh -T portainer 'docker ps --filter network=staktrakr-net --format "table {{.Names}}\t{{.Status}}"'

# Container logs
ssh -T portainer 'docker logs --tail 30 staktrakr-home-poller'

# Dashboard check
ssh -T portainer 'curl -sf http://localhost:3010/ | head -c 100'
```

## File Layout

```
devops/pollers/
  shared/                  # Shared scraper core (both pollers use this)
    package.json
    price-extract.js
    capture.js
    db.js
    turso-client.js
    provider-db.js
    merge-prices.js
    api-export.js
    serve.js
    vision-patch.js
    extract-vision.js
    goldback-scraper.js
    spot-extract.js
    export-providers-json.js
    spot-poller/poller.py   # Python spot price fetcher
  home-poller/             # Home-specific files
    Dockerfile
    dashboard.js
    metrics-exporter.js
    run-home.sh
    run-fbp.sh
    check-flyio.sh
    supervisord.conf
    docker-entrypoint.sh
  remote-poller/           # Fly.io container
    Dockerfile
    fly.toml
    ...
  docker-compose.home.yml
  docker-compose.tailscale.yml
  docker-compose.tinyproxy.yml
```

## Deploy Workflow (GitOps -- default)

1. Work in a worktree branch, commit changes
2. Push to origin (or merge PR to `dev`)
3. Portainer detects the change within 5 minutes and redeploys
4. Verify via SSH: `ssh -T portainer 'docker logs --tail 20 staktrakr-home-poller'`

## Manual Redeploy (immediate)

Only needed when you can't wait for the 5-minute GitOps poll. The home-poller stack requires
env vars on every manual redeploy. Fetch secrets from Infisical first (use `secrets` skill):

```bash
PORTAINER_URL="https://192.168.1.81:9443"
PORTAINER_TOKEN="<from-infisical:PORTAINER_TOKEN>"
STACK_ID=7
ENDPOINT_ID=3

ssh -T portainer "curl -sk -X PUT \
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

For stacks without env vars (tailscale, tinyproxy):

```bash
ssh -T portainer "curl -sk -X PUT \
  '${PORTAINER_URL}/api/stacks/<STACK_ID>/git/redeploy?endpointId=${ENDPOINT_ID}' \
  -H 'X-API-Key: ${PORTAINER_TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"pullImage\": true, \"prune\": true}'"
```

## Stack IDs

| Stack | ID | Compose file |
|-------|-----|-------------|
| firecrawl | 4 | `devops/firecrawl-docker/docker-compose.yml` |
| tinyproxy | 5 | `devops/pollers/docker-compose.tinyproxy.yml` |
| home-poller | 7 | `devops/pollers/docker-compose.home.yml` |
| tailscale | 8 | `devops/pollers/docker-compose.tailscale.yml` |

## Common Mistakes

**Forgetting env vars on manual redeploy.** Portainer git-based stacks lose env vars on manual
redeploy. GitOps auto-deploy preserves them. If Turso queries fail after a manual deploy, this
is the cause. Always pass the full `env` array for manual deploys.

**Deploying from wrong branch.** Portainer pulls from the branch configured in the stack. After
merging a feature PR, the stack should be pointed at `dev`. Check the Portainer UI if in doubt.

**Not waiting for build.** Portainer rebuilds the Docker image on redeploy. This takes 1-2 minutes
(Playwright install is the slowest step). Check `docker logs` for the entrypoint message.

**Editing container files via docker exec.** Changes inside the container are lost on next redeploy.
Always edit in the repo, push, and redeploy.

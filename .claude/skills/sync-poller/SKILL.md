---
name: sync-poller
description: >
  Deploy poller code changes to the home VM via Portainer API. Use when you've committed changes
  to devops/pollers/ (shared/, home-poller/, or compose files) and need to redeploy the running
  container. Also use when the user says "sync poller", "deploy poller", "redeploy home poller",
  "push poller changes", or after any session that modified files in devops/pollers/.
---

# Sync Poller — Git to Docker via Portainer

Poller code lives in `StakTrakr/devops/pollers/`. Changes deploy to the home VM via Portainer's
git-based stack redeploy. No SSH file copying, no curl-update — Portainer pulls from the branch
and rebuilds the container.

## Architecture Change (2026-03)

**Before:** Code lived in `StakTrakrApi`, was curl-downloaded onto the VM at `/opt/poller/`.
Edits on the VM required manual sync back to the repo.

**Now:** Code lives in `StakTrakr/devops/pollers/`. Portainer pulls from git, builds the Docker
image, and deploys. The VM has no source files outside containers.

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
  remote-poller/           # Fly.io container (future)
    Dockerfile
    fly.toml
    ...
  docker-compose.home.yml
  docker-compose.tailscale.yml
  docker-compose.tinyproxy.yml
```

## Deploy Workflow

### Step 1 — Commit and push changes

Work in the feature branch or `dev`. Push to origin:

```bash
cd /Volumes/DATA/GitHub/StakTrakr/.worktrees/feat-pollers  # or current worktree
git add devops/pollers/
git commit -m "fix: <description> (DEV-XX)"
git push origin <branch>
```

### Step 2 — Redeploy via Portainer API

The home-poller stack requires env vars on every redeploy. Fetch secrets from Infisical first
(use `secrets` skill), then:

```bash
PORTAINER_URL="https://localhost:9443"
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

For stacks without env vars (tailscale, tinyproxy):

```bash
ssh -T homepoller "curl -sk -X PUT \
  '${PORTAINER_URL}/api/stacks/<STACK_ID>/git/redeploy?endpointId=${ENDPOINT_ID}' \
  -H 'X-API-Key: ${PORTAINER_TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{\"pullImage\": true, \"prune\": true}'"
```

### Step 3 — Verify deployment

```bash
# Check container is running
ssh -T homepoller 'docker ps --filter name=staktrakr-home-poller --format "{{.Status}}"'

# Check logs for startup
ssh -T homepoller 'docker logs --tail 20 staktrakr-home-poller'

# Verify dashboard responds
ssh -T homepoller 'curl -sf http://localhost:3010/ | head -c 100'

# Check Turso connectivity
ssh -T homepoller 'docker exec staktrakr-home-poller node -e "
  const {createClient}=require(\"@libsql/client\");
  const c=createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN});
  c.execute(\"SELECT 1\").then(()=>console.log(\"Turso OK\")).catch(e=>console.error(e.message));
"'
```

### Step 4 — Report

Tell the user:
- Which files changed
- Redeploy result (success/failure)
- Container status and dashboard reachable

## Stack IDs

| Stack | ID | Compose file |
|-------|-----|-------------|
| firecrawl | 4 | `devops/firecrawl-docker/docker-compose.yml` |
| tinyproxy | 5 | `devops/pollers/docker-compose.tinyproxy.yml` |
| home-poller | 7 | `devops/pollers/docker-compose.home.yml` |
| tailscale | 8 | `devops/pollers/docker-compose.tailscale.yml` |

## Common Mistakes

**Forgetting env vars on redeploy.** Portainer git-based stacks lose env vars on redeploy. If
Turso queries fail after deploy, this is the cause. Always pass the full `env` array.

**Deploying from wrong branch.** Portainer pulls from the branch configured in the stack. After
merging a feature PR, the stack should be pointed at `dev`. Check the Portainer UI if in doubt.

**Not waiting for build.** Portainer rebuilds the Docker image on redeploy. This takes 1-2 minutes
(Playwright install is the slowest step). Check `docker logs` for the entrypoint message.

**Editing container files via docker exec.** Changes inside the container are lost on next redeploy.
Always edit in the repo, push, and redeploy.

# Infisical — Self-Hosted Secrets Manager

Self-hosted Infisical instance for StakTrakr. Replaces `~/.staktrakr/secrets.env`.
Runs on `http://localhost:8700`. Joins the `infra` Docker network so other
containers can reach it at `http://staktrakr-infisical:8080`.

## First-Time Setup

**1. Generate secrets and create your `.env`:**

```bash
cd devops/infisical
cp .env.example .env

# Generate the two required secrets
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)"
echo "AUTH_SECRET=$(openssl rand -base64 32)"
```

Paste the output values into `.env`. Also set a strong `DB_PASSWORD` and copy it
into `DB_CONNECTION_URI` in place of `<same as DB_PASSWORD>`.

**2. Start the stack:**

```bash
docker compose up -d
```

Wait ~20 seconds for Postgres to initialise on first run.

**3. Create your admin account:**

Open `http://localhost:8700` and sign up. The first user becomes instance admin.

**4. Create a StakTrakr project and add your secrets:**

In the Infisical UI:
- New Project → `StakTrakr`
- Add secrets from `~/.staktrakr/secrets.env` (Dropbox tokens, API keys, etc.)
- Create environments: `dev`, `prod` (or just `dev` for local use)

**5. Create a Machine Identity for agent access:**

Project Settings → Machine Identities → Add Machine Identity → `staktrakr-agents`
Save the **Client ID** and **Client Secret** — you'll need these for the MCP server
and `infisical` CLI.

---

## Daily Use

### Inject secrets into a Docker service `.env`

```bash
# Install the Infisical CLI (once)
brew install infisical/get-cli/infisical

# Log in using the machine identity
export INFISICAL_UNIVERSAL_AUTH_CLIENT_ID=<client-id>
export INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET=<client-secret>

# Export to a .env file (e.g. before running browserless)
infisical export \
  --projectId=<project-id> \
  --env=dev \
  --format=dotenv \
  > devops/browserless/.env
```

### Run a script with secrets injected

```bash
infisical run --projectId=<id> --env=dev -- npm test
```

### MCP Server (Claude Code + Codex)

Add to `.mcp.json`:

```json
"infisical": {
  "command": "npx",
  "args": ["-y", "@infisical/mcp"],
  "env": {
    "INFISICAL_HOST_URL": "http://localhost:8700",
    "INFISICAL_UNIVERSAL_AUTH_CLIENT_ID": "<client-id>",
    "INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET": "<client-secret>",
    "INFISICAL_PROJECT_ID": "<project-id>"
  }
}
```

---

## Management

```bash
# Start
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f infisical

# Backup database
docker compose exec infisical-db pg_dump -U infisical infisical > backup_$(date +%Y%m%d).sql
```

## Ports

| Port | Service |
|------|---------|
| 8700 | Infisical web UI + API (host) |
| 8080 | Infisical internal (container) |
| 5432 | Postgres (internal only) |
| 6379 | Redis (internal only) |

## Data

Secrets are stored encrypted in the `infisical_pg_data` Docker volume.
The `ENCRYPTION_KEY` in `.env` is required to decrypt them — back it up somewhere safe.

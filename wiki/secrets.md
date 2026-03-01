---
title: "Secrets & Keys"
category: infrastructure
owner: staktrakr-api
lastUpdated: v3.33.18
date: 2026-02-24
sourceFiles: []
relatedPages: []
---

# Secrets & Keys

> **Last verified:** 2026-02-24
> ⚠️ This page lists WHERE secrets live, not their values. Never commit secret values.

---

## Secret Stores

| Store | Used by |
|-------|---------|
| **Fly.io secrets** (`fly secrets`) | Fly.io container — all runtime secrets |
| **Infisical** (`stak-trakr-94m4`, env: `dev`) | Local development, agent contexts |
| **Home LXC `.env`** (`/opt/poller/.env`) | Home poller — local file, not in any repo |

---

## Fly.io Secrets

Set with `fly secrets set KEY=VALUE --app staktrakr`.

| Secret | Purpose | Notes |
|--------|---------|-------|
| `GITHUB_TOKEN` | Push to `api` branch from `run-publish.sh` | Needs `contents: write` on `StakTrakrApi` |
| `TURSO_DATABASE_URL` | Turso libSQL cloud DB | `libsql://staktrakrapi-lbruton.aws-us-east-2.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso auth | Rotate in Turso dashboard |
| `GEMINI_API_KEY` | Vision pipeline (Gemini API) | Google AI Studio |
| `METAL_PRICE_API_KEY` | Spot price API | MetalPriceAPI dashboard |
| `WEBSHARE_PROXY_USER` | Playwright service proxy | Webshare dashboard |
| `WEBSHARE_PROXY_PASS` | Playwright service proxy | Webshare dashboard |
| `CRON_SCHEDULE` | Override retail poller cron frequency | Currently set to `0` (once per hour at :00) |

---

## Infisical (Local Dev)

- **Project:** StakTrakr
- **Project ID:** `319a1db5-207d-49d0-a61d-3f3e6b440ded`
- **Slug:** `stak-trakr-94m4`
- **Environment:** `dev` (production env is empty — all secrets in `dev`)

Contains all secrets mirrored from Fly.io plus additional dev-only keys. Access via MCP (`mcp__infisical__*`) or `infisical` CLI.

---

## Home LXC `.env`

File at `/opt/poller/.env` on the LXC container (192.168.1.81). Contains:

```
TURSO_DATABASE_URL=libsql://staktrakrapi-lbruton.aws-us-east-2.turso.io
TURSO_AUTH_TOKEN=<token>
POLLER_ID=home
DATA_DIR=/opt/poller/data
```

This file is not in any repo. Copy from `.env.example` and fill in manually.

---

## Rotating Secrets

### GitHub Token
1. Generate new PAT at github.com → Settings → Developer settings
2. Required scope: `contents: write` on `lbruton/StakTrakrApi`
3. `fly secrets set GITHUB_TOKEN=<new-token> --app staktrakr`
4. Update Infisical dev env

### Turso Auth Token
1. Turso dashboard → Database → `staktrakrapi` → Create token
2. `fly secrets set TURSO_AUTH_TOKEN=<new-token> --app staktrakr`
3. Update Infisical dev env
4. Update home LXC `.env`

### MetalPriceAPI Key
1. MetalPriceAPI dashboard → API Keys
2. `fly secrets set METAL_PRICE_API_KEY=<new-key> --app staktrakr`
3. Update Infisical dev env

### Webshare Proxy
1. Webshare dashboard → Proxy users
2. `fly secrets set WEBSHARE_PROXY_USER=<user> WEBSHARE_PROXY_PASS=<pass> --app staktrakr`
3. Update Infisical dev env

### Gemini API Key
1. Google AI Studio → API Keys
2. `fly secrets set GEMINI_API_KEY=<new-key> --app staktrakr`
3. Update Infisical dev env

---

## Verifying Secrets Are Set

```bash
# List Fly secrets (names only, not values)
fly secrets list --app staktrakr

# Verify a specific secret is accessible inside container
fly ssh console --app staktrakr -C "printenv TURSO_DATABASE_URL"
```

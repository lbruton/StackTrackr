---
name: repo-boundaries
description: Use when doing any cross-repo work, deploying, or when unsure which repo owns a piece of code. Maps exactly which code belongs in which repo and what each agent is allowed to do. Also use when the words fly deploy, StakTrakrApi, stakscrapr, or home poller appear in context.
---

# Repo Boundaries

## Repo Ownership Map

| Repo | Owns | Does NOT own |
|------|------|--------------|
| `lbruton/StakTrakr` | Frontend HTML/JS/CSS, `.claude/` skills, CLAUDE.md, smoke tests | Poller scripts, fly.toml, Dockerfile, devops crons |
| `lbruton/StakTrakrApi` | ALL backend devops: fly.toml, Dockerfile, all run-*.sh, price-extract.js, api-export.js, spot-poller, providers.json | Frontend code |
| `lbruton/stakscrapr` | Home VM full stack: identical scraper core + dashboard.js + tinyproxy/Cox residential proxy + Tailscale exit node config | fly.toml authority (StakTrakrApi owns it), `fly deploy` |
| `lbruton/StakTrakrWiki` | Shared infrastructure documentation | Code, config, scripts |

---

## Deploy Rules — Read Before ANY Deploy

| Action | Allowed from | Forbidden from |
|--------|-------------|----------------|
| `fly deploy` | `StakTrakrApi/devops/fly-poller/` on this Mac only | StakTrakr repo, stakscrapr repo, home VM, anywhere else |
| `git push` to `api` branch (data files) | Fly.io container `run-publish.sh` only — via force-push | Local Mac, home VM, any GHA, manually |
| PR to `StakTrakrApi` main | StakTrakr Mac Claude or stakscrapr Claude | Direct push to main |
| `providers.json` URL fix | Direct push to `api` branch in `StakTrakrApi` | Any other method |

> **⛔ NEVER run `fly deploy` from the StakTrakr repo or the stakscrapr repo.**
> The only valid `fly deploy` path: `cd /path/to/StakTrakrApi/devops/fly-poller && fly deploy`

---

## Fly.io Container — Authoritative fly.toml Location

**`StakTrakrApi/devops/fly-poller/fly.toml`** is the authoritative fly.toml.

- 4096MB RAM, 4 shared CPUs, region dfw
- Supervisord runs: redis, rabbitmq, postgres, playwright-service, firecrawl-api, firecrawl-worker, firecrawl-extract-worker, cron, http-server
- **`stakscrapr/fly.toml` is STALE (2048MB)** — do not use it, do not deploy from it

---

## Home VM (192.168.1.48) — What stakscrapr Owns

The home VM runs the **identical scraper core** (same price-extract.js, api-export.js as Fly.io) PLUS home-only additions:

| Component | Purpose |
|-----------|---------|
| `dashboard.js` (port 3010) | Monitors both pollers via Turso `poller_runs` table + `/tmp/flyio-health.json` |
| `check-flyio.sh` | Polls Fly.io health, writes `/tmp/flyio-health.json` for dashboard |
| tinyproxy (port 8889) | HTTP proxy — routes Fly.io scraper traffic through Cox residential IP |
| Tailscale exit node (`100.112.198.50`) | Fly.io container traffic exits through home residential IP for bot evasion |

**stakscrapr Claude rule:** NEVER run `fly deploy`. Open a PR to `lbruton/StakTrakrApi` instead.

---

## StakTrakrApi devops/ Folder Map

| Folder | Contains |
|--------|---------|
| `devops/scraper/` | Shared engine (both pollers): price-extract.js, api-export.js, capture.js, extract-vision.js, spot-poller/poller.py, package.json |
| `devops/fly-poller/` | Fly.io deploy wrapper: fly.toml, Dockerfile, run-local.sh, run-publish.sh, run-spot.sh, run-retry.sh, run-fbp.sh, docker-entrypoint.sh, supervisord.conf |
| `devops/home-scraper/` | Home VM additions: run-home.sh, dashboard.js, check-flyio.sh, supervisord.conf (11 services), .env.example |
| `devops/home-vm/` | Infrastructure: tinyproxy-cox.conf, cox-auth.sh/service/timer, update-cox-proxy-ip.sh |

---

## Change Gate: Home VM Change → Fly.io

When a code change on the home VM needs to reach Fly.io:

```
1. Home Claude edits devops/scraper/ file
2. Opens PR to StakTrakrApi main
3. StakTrakr Mac Claude reviews + merges
4. StakTrakr Mac Claude: cd devops/fly-poller && fly deploy
5. Home VM: curl raw.githubusercontent.com/StakTrakrApi/main/devops/scraper/<file> -o /opt/poller/<file>
```

**providers.json URL changes** skip steps 3–5 entirely — push directly to `api` branch (auto-synced every run).

---

## Dual-Poller Turso Write-Through

Both pollers write to the same Turso DB (`price_snapshots` table). Only Fly.io publishes to GitHub.

| Poller | POLLER_ID | Writes to | Publishes to Git |
|--------|-----------|-----------|-----------------|
| Fly.io container | `api` | Turso | ✅ Yes — `run-publish.sh` force-pushes to `api` branch |
| Home VM (192.168.1.48) | `home` | Turso | ❌ No — never touches git |

`readLatestPerVendor(db, coinSlug, lookbackHours=2)` — most recent row per vendor within 2h wins at publish time.

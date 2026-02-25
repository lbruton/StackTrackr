---
name: api-infrastructure
description: Use when making any change to API feeds, pollers, feed thresholds, data file paths, or StakTrakrApi repo structure. Also use when diagnosing stale health badges, feed failures, or Fly.io/GHA poller issues. Triggers on any mention of manifest.json, goldback-spot.json, hourly files, spot-poller, retail-poller, Fly.io staktrakr app, or api.staktrakr.com.
---

# API Infrastructure

## Three-Feed Architecture

All feeds served from `lbruton/StakTrakrApi` `main` branch via GitHub Pages at `api.staktrakr.com`.

| Feed | File | Poller | Threshold |
|------|------|--------|-----------|
| **Market prices** | `data/api/manifest.json` | Fly.io `staktrakr` cron (`*/30 min`) | 30 min |
| **Spot prices** | `data/hourly/YYYY/MM/DD/HH.json` | `spot-poller.yml` GHA (`:05`, `:20`, `:35`, `:50`/hr) | 20 min |
| **Spot prices (15-min)** | `data/15min/YYYY/MM/DD/HHMM.json` | `spot-poller.yml` GHA (`:05/:20/:35/:50`) | 20 min |
| **Goldback** | `data/api/goldback-spot.json` | Fly.io `staktrakr` cron (daily 17:01 UTC) | 25h (info only) |
| **Turso** | `price_snapshots` table | retail-poller only | internal write store |

**Critical:** `spot-history-YYYY.json` is a **seed file** (noon UTC daily) — never use it for freshness checks. Live spot data is always in `data/hourly/`.

---

## Fly.io Container (`staktrakr`)

- **App:** `staktrakr` — region `iad`, always-on (min 1 machine, auto-stop off)
- **Config:** `devops/retail-poller/fly.toml` + `Dockerfile`
- **Runs:** Firecrawl + Playwright + retail-poller cron + goldback cron + serve.js
- **NOT spot prices** — spot is pure GHA, no Docker, no Fly
- **Deploy:** `cd devops/retail-poller && fly deploy`
- **Logs:** `fly logs --app staktrakr`
- **SSH:** `fly ssh console --app staktrakr`

---

## GitHub Actions

| Workflow | Repo | Schedule | Purpose |
|----------|------|----------|---------|
| `spot-poller.yml` | `StakTrakr` | `:05`, `:20`, `:35`, `:50` every hour | Python → MetalPriceAPI → `data/hourly/` |
| `Merge Poller Branches` | `StakTrakrApi` | `*/15 min` | Merges `api` → `main` → triggers GH Pages |

---

## Turso Data Store

Turso is a free-tier cloud libSQL database — internal to the retail poller. NOT a public endpoint.

- **Database:** `staktrakrapi-lbruton.aws-us-east-2.turso.io`
- **Credentials:** `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` (Infisical)
- **Table:** `price_snapshots` — one row per scrape attempt, per vendor, per 15-min window
- **Used by:** `price-extract.js`, `extract-vision.js`, `api-export.js` (retail-poller only)
- **NOT used by:** spot-poller (Python GHA), goldback-scraper
- **Free tier:** zero cost, zero ops — no action needed
- `prices.db` is a read-only SQLite snapshot exported to StakTrakrApi each cycle (offline use only)

---

## When Making Changes — Update ALL of These

| Location | What to update |
|----------|---------------|
| `js/api-health.js` | Stale thresholds, feed URLs, `_normalizeTs` logic |
| `docs/devops/api-infrastructure-runbook.md` | Architecture, per-feed details, diagnosis commands, Turso section if schema or credentials change |
| `CLAUDE.md` API Infrastructure table | Feed/threshold/healthy-check summary |
| StakTrakrWiki: `health.md` + `fly-container.md` | Human-readable runbook (architecture, health checks) |
| StakTrakrWiki: `fly-container.md` (GHA section) | GHA workflow table if workflows change |
| StakTrakrWiki: `fly-container.md` | If Fly config, crons, or VM spec changes |
| `lbruton/StakTrakrApi` `README.md` | If endpoints, branches, or directory structure changes |

---

## Quick Health Check

```bash
python3 << 'EOF'
import urllib.request, json, re
from datetime import datetime, timezone, timedelta

def age_min(ts):
    ts = ts.strip()
    if not re.search(r'[zZ]$|[+-]\d{2}:?\d{2}$', ts):
        ts = ts.replace(' ', 'T') + 'Z'
    return (datetime.now(timezone.utc) - datetime.fromisoformat(ts.replace('Z','+00:00'))).total_seconds()/60

def fetch(url):
    with urllib.request.urlopen(url, timeout=10) as r: return json.load(r)

print(f"API Health — {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}\n")
try:
    d = fetch('https://api.staktrakr.com/data/api/manifest.json')
    age = age_min(d['generated_at'])
    print(f"Market   {'✅' if age<=30 else '⚠️'}  {age:.0f}m ago  ({len(d.get('coins',[]))} coins)")
except Exception as e: print(f"Market   ❌  {e}")
try:
    now = datetime.now(timezone.utc)
    def url(dt): return f"https://api.staktrakr.com/data/hourly/{dt.year}/{dt.month:02d}/{dt.day:02d}/{dt.hour:02d}.json"
    try: d = fetch(url(now))
    except: d = fetch(url(now - timedelta(hours=1)))
    age = age_min(d[-1]['timestamp'])
    print(f"Spot     {'✅' if age<=75 else '⚠️'}  {age:.0f}m ago")
except Exception as e: print(f"Spot     ❌  {e}")
try:
    d = fetch('https://api.staktrakr.com/data/api/goldback-spot.json')
    age = age_min(d['scraped_at'])
    print(f"Goldback {'✅' if age<=1500 else '⚠️'}  {age:.0f}m ago  (${d.get('g1_usd')} G1)")
except Exception as e: print(f"Goldback ❌  {e}")
EOF
```

---

## Active Issues (2026-02-22)

| Issue | Linear | Status |
|-------|--------|--------|
| Firecrawl cloud HTTP 402 — credits exhausted | STAK-268 | Open |
| Goldback stale ~39h | STAK-269 | Open |


> **Note:** Notion infrastructure pages are deprecated. Do not update them. StakTrakrWiki is the only target.
> Deprecated Notion pages: API Infrastructure, Fly.io — All-in-One Container, CI/CD & Deployment, Secrets & Keys.

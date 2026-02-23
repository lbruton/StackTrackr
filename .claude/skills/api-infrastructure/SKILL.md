---
name: api-infrastructure
description: Use when making any change to API feeds, pollers, feed thresholds, data file paths, or StakTrakrApi repo structure. Also use when diagnosing stale health badges, feed failures, or Fly.io/GHA poller issues. Triggers on any mention of manifest.json, goldback-spot.json, hourly files, spot-poller, retail-poller, Fly.io staktrakr app, or api.staktrakr.com.
---

# API Infrastructure

## Three-Feed Architecture

All feeds served from `lbruton/StakTrakrApi` `main` branch via GitHub Pages at `api.staktrakr.com`.

| Feed | File | Poller | Threshold |
|------|------|--------|-----------|
| **Market prices** | `data/api/manifest.json` | Fly.io `staktrakr` cron (`*/15 min`) | 30 min |
| **Spot prices** | `data/hourly/YYYY/MM/DD/HH.json` | `spot-poller.yml` GHA (`:05` + `:35`/hr) | 75 min |
| **Goldback** | `data/api/goldback-spot.json` | Fly.io `staktrakr` cron (daily 17:01 UTC) | 25h (info only) |

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
| `spot-poller.yml` | `StakTrakr` | `:05` + `:35` every hour | Python → MetalPriceAPI → `data/hourly/` |
| `Merge Poller Branches` | `StakTrakrApi` | `*/15 min` | Merges `api` → `main` → triggers GH Pages |

---

## When Making Changes — Update ALL of These

| Location | What to update |
|----------|---------------|
| `js/api-health.js` | Stale thresholds, feed URLs, `_normalizeTs` logic |
| `docs/devops/api-infrastructure-runbook.md` | Architecture, per-feed details, diagnosis commands |
| `CLAUDE.md` API Infrastructure table | Feed/threshold/healthy-check summary |
| Notion — **API Infrastructure** page | Human-readable runbook (sync from markdown) |
| Notion — **CI/CD & Deployment** page | GHA workflow table if workflows change |
| Notion — **Fly.io — All-in-One Container** page | If Fly config, crons, or VM spec changes |
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

---

## Notion Pages (Infrastructure WIKI)

All under **StakTrakr — Infrastructure** (parent page ID `31090430-390b-81fe-bba2-e6e0d28f181c`):

| Page | Notion ID | Keep in sync with |
|------|-----------|-------------------|
| API Infrastructure | `31090430-390b-811b-821b-cd6388650fa5` | `docs/devops/api-infrastructure-runbook.md` |
| Fly.io — All-in-One Container | `31090430-390b-81d2-abb4-c471d25120cf` | `devops/retail-poller/fly.toml` + `Dockerfile` |
| CI/CD & Deployment | `31090430-390b-8122-9e0f-c2f1dd1891e2` | `.github/workflows/` |
| Secrets & Keys | `31090430-390b-8116-8384-ccd867bf54a2` | GHA secrets + Infisical |

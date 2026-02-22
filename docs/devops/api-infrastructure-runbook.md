# API Infrastructure Runbook

> **Last verified:** 2026-02-22 — STAK-265 investigation
>
> Quick-check commands at the bottom. For each feed: what it is, where it comes from,
> how to diagnose, and what healthy vs. broken looks like.

---

## Architecture Overview

StakTrakr pulls from three independent data feeds, all served via GitHub Pages from
`lbruton/StakTrakrApi` (`main` branch → `api.staktrakr.com`).

```
Local Docker (spot-poller)      GitHub Actions (GH)
       │                              │
       │  noon UTC daily              │  :05 and :35 every hour
       ▼                              ▼
data/spot-history-YYYY.json     StakTrakrApi api branch
  (seed file — daily only)        data/hourly/YYYY/MM/DD/HH.json
                                        │
                                        │  Merge Poller Branches (*/15 min)
                                        ▼
                              StakTrakrApi main branch
                                        │
                                        │  GH Pages deploy (~3 min)
                                        ▼
                              api.staktrakr.com   ←── StakTrakr UI
```

**Key repos:**

| Repo | Purpose |
|---|---|
| `lbruton/StakTrakr` | App code + workflows that trigger pollers |
| `lbruton/StakTrakrApi` | Data store — `api` branch = live data, `main` = merged/served |
| `lbruton/StakTrakrApi1` | Secondary API (was a fallback; `StakTrakrApi1` repo deleted — `sync-api-repos.yml` now fails) |

---

## Feed 1: Market Prices (`manifest.json`)

**Endpoint:** `https://api.staktrakr.com/data/api/manifest.json`
**Field checked:** `generated_at` (ISO 8601 with `Z` — no timezone issue)
**Stale threshold:** 30 min (raised from 15 in v3.32.14)

### How it's updated

1. **Local Docker retail poller** (primary) — runs every ~4h, writes `manifest.json` to
   `StakTrakrApi` `api` branch via `API_PUSH_TOKEN`
2. **`retail-price-poller.yml`** (cloud fallback) — fires every 4h if local Docker is stale
   (checks `generated_at` against `STALE_SECONDS=18000`); uses Firecrawl cloud + Browserbase
3. **`Merge Poller Branches`** — runs `*/15 * * * *`, merges `api` + `api1` branches into
   `main`, picks whichever has the newer `generated_at`

### Healthy

- `generated_at` is within 30 min of current UTC
- `Merge Poller Branches` workflow: all runs `success`
- `api` branch last commit: within 30 min

### Broken signals

- `generated_at` > 4h old → local Docker retail poller is down
- `generated_at` > 5h old → cloud fallback also failed (check Firecrawl credits)
- `Merge Poller Branches` failing → check workflow logs

### Quick diagnosis

```bash
curl -s https://api.staktrakr.com/data/api/manifest.json | python3 -c "
import sys, json
from datetime import datetime, timezone
d = json.load(sys.stdin)
ts = datetime.fromisoformat(d['generated_at'].replace('Z', '+00:00'))
age = (datetime.now(timezone.utc) - ts).total_seconds() / 60
print(f'generated_at: {d[\"generated_at\"]}')
print(f'Age: {age:.0f} min')
print(f'Status: {\"✅ FRESH\" if age <= 30 else \"⚠️ STALE\"}')
print(f'Coins: {len(d.get(\"coins\", []))}')
"

# Check recent workflow runs
gh run list --repo lbruton/StakTrakrApi --workflow "Merge Poller Branches" --limit 5
```

---

## Feed 2: Spot Prices (`hourly/YYYY/MM/DD/HH.json`)

**Endpoint:** `https://api.staktrakr.com/data/hourly/YYYY/MM/DD/HH.json` (current UTC hour, falls back to previous hour)
**Field checked:** last entry `timestamp` (naive `"YYYY-MM-DD HH:MM:SS"` — treated as UTC after v3.32.14 fix)
**Stale threshold:** 75 min

### How it's updated

1. **Local Docker spot poller** (`devops/spot-poller/`) — writes noon UTC daily entry to
   `spot-history-YYYY.json` in the local `data/` directory
2. **`/seed-sync` skill** — stages and commits local changes to the repo
3. **`spot-poller.yml` GH Action** — runs at `:05` and `:35` every hour, writes hourly
   files to `StakTrakrApi` `api` branch at `data/hourly/YYYY/MM/DD/HH.json`

### Live spot data location (hourly)

**Branch:** `StakTrakrApi` `api` branch
**Path:** `data/hourly/YYYY/MM/DD/HH.json`
**Commit pattern:** `spot: YYYY-MM-DD hour HH price data`

### Healthy

- `spot-poller.yml`: all recent runs `success` (runs twice/hour)
- `api` branch last spot commit: within 35 min (one run window)
- Last hourly file: within 35 min

### Broken signals

- `spot-poller.yml` failing → check `METAL_PRICE_API_KEY` secret; check MetalPriceAPI quota
- Local Docker spot poller down → `spot-history-YYYY.json` noon entry missing for today
- `data/hourly/` files more than 1h stale on `api` branch → GH Action failed or paused

### Quick diagnosis

```bash
# Check spot-poller.yml GH Action runs
gh run list --repo lbruton/StakTrakr --workflow "spot-poller.yml" --limit 5

# Check live spot health (hourly files on api branch)
gh api "repos/lbruton/StakTrakrApi/commits?sha=api&per_page=5" \
  | python3 -c "import sys,json; [print(c['commit']['author']['date'][:16], c['commit']['message'][:60]) for c in json.load(sys.stdin) if 'spot:' in c['commit']['message']]"

# Check what spot-history-2026.json actually says
curl -s https://api.staktrakr.com/data/spot-history-2026.json | python3 -c "
import sys, json
from datetime import datetime, timezone
entries = json.load(sys.stdin)
last = entries[-1]
ts = datetime.fromisoformat(last['timestamp'].replace(' ', 'T') + '+00:00')
age = (datetime.now(timezone.utc) - ts).total_seconds() / 60
print(f'Last entry: {last}')
print(f'Age (UTC): {age:.0f} min — NOTE: this is a seed file, expect ~600+ min')
print(f'Total entries: {len(entries)}')
"
```

---

## Feed 3: Goldback (`goldback-spot.json`)

**Endpoint:** `https://api.staktrakr.com/data/api/goldback-spot.json`
**Field checked:** `scraped_at` (ISO 8601 with `Z` — no timezone issue)
**Stale threshold:** 25h (1500 min) — informational only, does not affect overall health badge

### How it's updated

1. **Local Docker** (primary) — `devops/retail-poller/goldback-scraper.js` scrapes
   `goldback.com/exchange-rate/` via self-hosted Firecrawl at `http://firecrawl:3002`
   (port 3002, `devops/firecrawl-docker/`). Writes to `data/api/goldback-spot.json`
   and `data/goldback-YYYY.json`
2. **`retail-price-poller.yml`** (cloud fallback) — uses Firecrawl cloud API
   (`FIRECRAWL_API_KEY` secret). Goldback scraping is bundled here.

### Current status (as of 2026-02-22)

- `scraped_at`: `2026-02-21T07:05:29.274Z` (~39h old)
- `retail-price-poller.yml` last run: `2026-02-19T23:24` — **FAILED**
- Failure reason: **Firecrawl cloud HTTP 402 — "Insufficient credits"**
- Cloud fallback has been broken since 2026-02-19
- Local Docker is the only path to fix this; check if local Firecrawl is running

### Healthy

- `scraped_at` within 25h of current UTC
- `retail-price-poller.yml` last run: `success` (or not needed if local Docker is fresh)

### Broken signals

- `scraped_at` > 25h → scraper missed a run
- `retail-price-poller.yml` HTTP 402 → Firecrawl cloud credits exhausted
- `scraped_at` > 48h → both local Docker and cloud fallback are down

### Quick diagnosis

```bash
# Check goldback freshness
curl -s https://api.staktrakr.com/data/api/goldback-spot.json | python3 -c "
import sys, json
from datetime import datetime, timezone
d = json.load(sys.stdin)
ts = datetime.fromisoformat(d['scraped_at'].replace('Z', '+00:00'))
age = (datetime.now(timezone.utc) - ts).total_seconds() / 60
print(f'scraped_at: {d[\"scraped_at\"]}')
print(f'Age: {age:.0f} min ({age/60:.1f}h)')
print(f'Status: {\"✅ FRESH\" if age <= 1500 else \"⚠️ STALE\"}')
print(f'G1 price: ${d.get(\"g1_usd\")}')
"

# Check retail poller workflow status
gh run list --repo lbruton/StakTrakr --workflow "retail-price-poller.yml" --limit 5

# Manually trigger goldback scrape (if local Docker firecrawl is running)
cd devops/firecrawl-docker && docker compose up -d
DATA_DIR=/Volumes/DATA/GitHub/StakTrakr/data \
  FIRECRAWL_BASE_URL=http://localhost:3002 \
  node devops/retail-poller/goldback-scraper.js
```

---

## Known Broken: `sync-api-repos.yml`

**Workflow:** `.github/workflows/sync-api-repos.yml` in `StakTrakr`
**Schedule:** `0 5 * * *` (5am UTC daily)
**Purpose:** Bidirectional file sync between `StakTrakrApi` and `StakTrakrApi1`
**Status:** ❌ **PERMANENTLY FAILING** — `lbruton/StakTrakrApi1` repo was deleted

```
fatal: repository 'https://github.com/lbruton/StakTrakrApi1/' not found
```

**Impact:** Low — `StakTrakrApi1` was a redundant failsafe. The primary `StakTrakrApi`
pipeline is fully operational. This workflow should either be deleted or updated to
remove the `StakTrakrApi1` references.

---

## All-Feeds Health Check (one command)

```bash
python3 << 'EOF'
import urllib.request, json
from datetime import datetime, timezone

def age_min(ts_str):
    ts_str = ts_str.strip()
    # Append Z only if no timezone info present (no Z, no +HH:MM, no -HH:MM offset)
    import re
    if not re.search(r'[zZ]$|[+-]\d{2}:?\d{2}$', ts_str):
        ts_str = ts_str.replace(' ', 'T') + 'Z'
    ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
    return (datetime.now(timezone.utc) - ts).total_seconds() / 60

def fetch(url):
    with urllib.request.urlopen(url, timeout=10) as r:
        return json.load(r)

print(f"API Health Check — {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}\n")

# Market
try:
    d = fetch('https://api.staktrakr.com/data/api/manifest.json')
    age = age_min(d['generated_at'])
    print(f"Market  {'✅' if age <= 30 else '⚠️'}  {age:.0f}m ago  ({len(d.get('coins',[]))} coins)")
except Exception as e:
    print(f"Market  ❌  {e}")

# Spot (live hourly file — current UTC hour, fallback to previous)
try:
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    def _hourly_url(dt): return f"https://api.staktrakr.com/data/hourly/{dt.year}/{dt.month:02d}/{dt.day:02d}/{dt.hour:02d}.json"
    try:
        d = fetch(_hourly_url(now))
    except Exception:
        d = fetch(_hourly_url(now - timedelta(hours=1)))
    last = d[-1]
    age = age_min(last['timestamp'])
    print(f"Spot    {'✅' if age <= 75 else '⚠️'}  {age:.0f}m ago")
except Exception as e:
    print(f"Spot    ❌  {e}")

# Goldback
try:
    d = fetch('https://api.staktrakr.com/data/api/goldback-spot.json')
    age = age_min(d['scraped_at'])
    print(f"Goldback {'✅' if age <= 1500 else '⚠️'}  {age:.0f}m ago  (${d.get('g1_usd')} G1)")
except Exception as e:
    print(f"Goldback ❌  {e}")
EOF
```

---

## Current Open Issues

| Issue | Status | Fix |
|---|---|---|
| `api-health.js` checks seed file for spot freshness | Fixed in v3.32.14 | Now fetches `data/hourly/YYYY/MM/DD/HH.json` with previous-hour fallback |
| `sync-api-repos.yml` fails daily (`StakTrakrApi1` deleted) | Fixed in v3.32.14 | Workflow deleted in PR #406 |
| Firecrawl cloud credits exhausted (HTTP 402) | Open | Top up credits or rely on local Docker |
| Goldback stale ~39h | Open | Run local goldback-scraper.js manually |

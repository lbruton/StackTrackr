# API Infrastructure Runbook

> **Last verified:** 2026-02-22 — retail-price-poller.yml removed (STAK-268)
>
> Quick-check commands at the bottom. For each feed: what it is, where it comes from,
> how to diagnose, and what healthy vs. broken looks like.

---

## Architecture Overview

StakTrakr pulls from three independent data feeds, all served via GitHub Pages from
`lbruton/StakTrakrApi` (`main` branch → `api.staktrakr.com`).

```
Fly.io container                        GitHub Actions (GH)
       │                                       │
       │  every 15 min (retail prices)         │  :05 and :35 every hour (spot prices)
       │  daily 17:01 UTC (goldback)           │
       │  daily 20:00 UTC (fbp gap-fill)       │
       ▼                                       ▼
StakTrakrApi api branch             StakTrakrApi api branch
  data/api/manifest.json              data/hourly/YYYY/MM/DD/HH.json
  data/api/goldback-spot.json
                     │
                     │  Merge Poller Branches (*/15 min)
                     ▼
             StakTrakrApi main branch
                     │
                     │  GH Pages deploy (~3 min)
                     ▼
             api.staktrakr.com   ←── StakTrakr UI
```

**Note:** `retail-price-poller.yml` (GHA cloud failsafe) was deleted 2026-02-22. It was
incorrectly calling the public Firecrawl cloud API (`api.firecrawl.dev`) instead of the
self-hosted Firecrawl in the Fly.io container — exhausting paid credits (STAK-268). All
scraping now runs exclusively in the Fly.io container via self-hosted Firecrawl.

**Key repos:**

| Repo | Purpose |
|---|---|
| `lbruton/StakTrakr` | App code + workflows that trigger pollers |
| `lbruton/StakTrakrApi` | Data store — `api` branch = live data, `main` = merged/served |

---

## Feed 1: Market Prices (`manifest.json`)

**Endpoint:** `https://api.staktrakr.com/data/api/manifest.json`
**Field checked:** `generated_at` (ISO 8601 with `Z` — no timezone issue)
**Stale threshold:** 30 min (raised from 15 in v3.32.14)

### How it's updated

1. **Fly.io retail poller** (`run-local.sh`) — runs every 15 min, writes `manifest.json` to
   `StakTrakrApi` `api` branch via `GITHUB_TOKEN`
2. **`Merge Poller Branches`** — runs `*/15 * * * *`, merges `api` branch into
   `main`

### Healthy

- `generated_at` is within 30 min of current UTC
- `Merge Poller Branches` workflow: all runs `success`
- `api` branch last commit: within 30 min

### Broken signals

- `generated_at` > 30 min old → Fly.io retail poller missed a run; check `fly logs --app staktrakr`
- `generated_at` > 4h old → Fly.io container may be down; check `fly status --app staktrakr`
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

## Feed 2: Spot Prices (`spot-history-YYYY.json`)

**Endpoint:** `https://api.staktrakr.com/data/spot-history-2026.json`
**Field checked:** last entry `timestamp` (naive `"YYYY-MM-DD HH:MM:SS"` — treated as UTC after v3.32.14 fix)
**Stale threshold:** 75 min

### ⚠️ IMPORTANT: This file is a seed file, not live data

`spot-history-YYYY.json` is populated by the **local Docker spot poller** writing one
entry per day at noon UTC. It contains `"source": "seed"` entries. The live hourly data
lives in `data/hourly/YYYY/MM/DD/HH.json` on the `StakTrakrApi` `api` branch.

**This means `api-health.js` checking `spot-history-YYYY.json` will always show ~10-12h
stale (current UTC minus noon UTC of today), even when the live spot poller is perfectly
healthy.** This is a known mismatch — the correct file to check for live freshness is the
most recent `data/hourly/` file.

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

1. **Fly.io container** (`run-goldback.sh`) — `goldback-scraper.js` scrapes
   `goldback.com/exchange-rate/` via self-hosted Firecrawl at `http://localhost:3002`.
   Runs daily at 17:01 UTC. Writes to `data/api/goldback-spot.json` and `data/goldback-YYYY.json`
   on the `main` branch of `StakTrakrApi`.

### Current status (as of 2026-02-22)

- `scraped_at`: `2026-02-22T23:49:23Z` — recovered ✅
- Fly.io cron running daily at 17:01 UTC via `run-goldback.sh`
- Cloud fallback (`retail-price-poller.yml`) deleted — all scraping on Fly.io

### Healthy

- `scraped_at` within 25h of current UTC
- `retail-price-poller.yml` last run: `success` (or not needed if local Docker is fresh)

### Broken signals

- `scraped_at` > 25h → `run-goldback.sh` missed its daily cron; check `fly logs --app staktrakr | grep goldback`
- `scraped_at` > 48h → Fly.io container down or Firecrawl not responding inside container

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
print(f'G1 price: \${d.get(\"g1_usd\")}')
"

# Check Fly.io goldback cron logs
fly logs --app staktrakr | grep goldback

# Manually trigger goldback scrape on Fly.io
fly ssh console --app staktrakr -C "/app/run-goldback.sh"
```

---


## All-Feeds Health Check (one command)

```bash
python3 << 'EOF'
import urllib.request, json
from datetime import datetime, timezone

def age_min(ts_str):
    ts_str = ts_str.strip()
    if not ts_str.endswith('Z') and '+' not in ts_str:
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

# Spot (seed file — expect 600+ min; check GH Actions for live freshness)
try:
    d = fetch('https://api.staktrakr.com/data/spot-history-2026.json')
    last = d[-1]
    age = age_min(last['timestamp'])
    print(f"Spot    {'✅' if age <= 75 else '⚠️'}  {age:.0f}m ago  (seed file — see hourly/ for live)")
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
| `api-health.js` checks seed file for spot freshness | Open | Check `data/hourly/` latest file instead |

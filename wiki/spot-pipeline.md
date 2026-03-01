---
title: Spot Price Pipeline
category: infrastructure
owner: staktrakr-api
lastUpdated: v3.33.18
date: 2026-02-25
sourceFiles: []
relatedPages: []
---

# Spot Price Pipeline

> **Last verified:** 2026-02-25 — audited from live Fly.io container `poller.py` and `update-seed-data.py`
> ⚠️ **ARCHITECTURE GAP:** Spot poller still writes to files, not Turso — See STAK-331

---

## Overview

Spot prices (gold, silver, platinum, palladium in USD/oz) are polled **4× per hour** (every 15 minutes) from MetalPriceAPI and written as JSON files to the persistent volume. Published to the `api` branch by `run-publish.sh`.

**Writer:** `run-spot.sh` cron inside the Fly.io container
**Cadence:** `5,20,35,50 * * * *` (4×/hr, offset from retail at `:00`)
**Stale threshold:** 75 minutes

---

## ⚠️ Known Architecture Gap (STAK-331)

The spot price poller (`poller.py`) is **not yet writing to Turso**. It writes directly to JSON files on the Fly.io persistent volume.

**Expected architecture:** `poller.py` → Turso `spot_prices` table → `api-export.js` reads Turso → JSON files
**Actual state:** `poller.py` → JSON files directly (Turso bypassed entirely for spot data)

---

## Architecture

```
MetalPriceAPI.com
  /v1/latest?base=USD&currencies=XAU,XAG,XPT,XPD
         │
         │  HTTP GET (Python requests)
         │  API key: METAL_PRICE_API_KEY (Fly secret)
         ▼
┌──────────────────────────────┐
│  spot-poller/poller.py       │
│  (--once mode via cron)      │
│                              │
│  1. backfill_recent_hours()  │
│     └─ Scan last 24h for     │
│        missing hourly files  │
│     └─ Use /timeframe to fill│
│                              │
│  2. poll_once()              │
│     └─ fetch /latest         │
│     └─ Invert rates:         │
│        1/XAU = $/oz gold     │
│        1/XAG = $/oz silver   │
│        1/XPT = $/oz platinum │
│        1/XPD = $/oz palladium│
└───────────┬──────────────────┘
            │
    ┌───────┼────────────────────────┐
    │       │                        │
    ▼       ▼                        ▼
 Hourly    15-min                 Daily Seed
 file      snapshot               (at noon EST / 17:00 UTC)
    │       │                        │
    ▼       ▼                        ▼
data/hourly/     data/15min/        data/spot-history-{YYYY}.json
YYYY/MM/DD/      YYYY/MM/DD/
HH.json          HHMM.json
            │
            ▼ (via run-publish.sh at 8,23,38,53)
   api branch → GitHub Pages → api.staktrakr.com
```

---

## Data Source

**MetalPriceAPI** (`metalpriceapi.com`) — requires `METAL_PRICE_API_KEY` Fly secret.

**Endpoints used:**

| Endpoint | Purpose |
|----------|---------|
| `/v1/latest` | Current spot prices (each poll) |
| `/v1/timeframe` | Historical backfill (gap recovery) |

**Rate conversion:** API returns rates as "units of metal per 1 USD". Inversion gives USD/oz:

| Symbol | Metal | Calculation |
|--------|-------|-------------|
| `XAU` | Gold | `1 / rate` = USD per troy oz |
| `XAG` | Silver | `1 / rate` = USD per troy oz |
| `XPT` | Platinum | `1 / rate` = USD per troy oz |
| `XPD` | Palladium | `1 / rate` = USD per troy oz |

---

## Output Files

Each poll writes **three** types of files:

### Hourly (`data/hourly/YYYY/MM/DD/HH.json`)

Overwritten each poll — always has the latest reading for that hour. The frontend fetches this for live spot prices.

```
data/hourly/2026/02/25/19.json
```

### 15-Minute (`data/15min/YYYY/MM/DD/HHMM.json`)

**Immutable** — each poll creates its own file. Never overwritten. Used for fine-grained historical analysis.

```
data/15min/2026/02/25/1905.json
data/15min/2026/02/25/1920.json
data/15min/2026/02/25/1935.json
data/15min/2026/02/25/1950.json
```

### Daily Seed (`data/spot-history-YYYY.json`)

Written **once per day** at noon EST (17:00 UTC). Contains one entry per day per metal. Used for long-term historical charts.

**Warning:** This is a **seed file**, not live data. Do not use it for freshness checks.

---

## Backfill Logic

`poller.py` runs `backfill_recent_hours()` before each poll (in `--once` mode). It:

1. Scans the last 24 hours for missing hourly files
2. Calls `/v1/timeframe` to fetch historical rates for missing dates
3. Writes the missing hourly files

This ensures no gaps from missed cron cycles, container restarts, or deploys.

---

## run-spot.sh

Thin wrapper that calls `poller.py --once`:

```bash
DATA_DIR="/data/staktrakr-api-export/data" \
  METAL_PRICE_API_KEY="$METAL_PRICE_API_KEY" \
  python3 /app/spot-poller/poller.py --once
```

Requires:
- Volume mounted at `/data/staktrakr-api-export`
- `METAL_PRICE_API_KEY` env var set

---

## GHA Workflow (Retired)

`.github/workflows/spot-poller.yml` is **retired** as of 2026-02-23. Spot polling moved to the Fly.io container cron to reduce complexity and avoid GHA minute usage.

The workflow file is kept for emergency manual triggering only.

---

## Diagnosing Issues

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Hourly file > 75 min stale | `METAL_PRICE_API_KEY` expired or quota exceeded | Check MetalPriceAPI dashboard; rotate key in Fly secrets |
| Hourly file missing entirely | run-spot.sh not running | `fly logs --app staktrakr \| grep spot` |
| Stale data after deploy | New deploy wiped cron schedule? | `fly ssh console -C "crontab -l"` to verify |

```bash
# Check recent spot poll logs
fly logs --app staktrakr | grep spot

# Manual trigger
fly ssh console --app staktrakr -C "/app/run-spot.sh"

# Verify output
curl https://api.staktrakr.com/data/hourly/$(date -u +%Y/%m/%d/%H).json | jq .[-1]
```

---

## Health Check

```python
import urllib.request, json
from datetime import datetime, timezone, timedelta

def fetch(url):
    with urllib.request.urlopen(url, timeout=10) as r: return json.load(r)

now = datetime.now(timezone.utc)
def url(dt): return f"https://api.staktrakr.com/data/hourly/{dt.year}/{dt.month:02d}/{dt.day:02d}/{dt.hour:02d}.json"
try:
    d = fetch(url(now))
except:
    d = fetch(url(now - timedelta(hours=1)))
ts = d[-1]['timestamp']
age_min = (datetime.now(timezone.utc) - datetime.fromisoformat(ts.replace('Z','+00:00'))).total_seconds()/60
print(f"Spot: {'✅' if age_min <= 75 else '⚠️'} {age_min:.0f}m ago")
```

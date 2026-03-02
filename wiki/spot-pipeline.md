---
title: Spot Price Pipeline
category: infrastructure
owner: staktrakr-api
lastUpdated: v3.33.19
date: 2026-02-25
sourceFiles: []
relatedPages: []
---

# Spot Price Pipeline

> **Last verified:** 2026-03-01 — audited from live Fly.io container `spot-extract.js` (Node.js)

---

## Overview

Spot prices (gold, silver, platinum, palladium in USD/oz) are polled **2x per hour** (every 30 minutes) from MetalPriceAPI, written to Turso `spot_prices` table, and also saved as JSON files to the persistent volume. Published to the `api` branch by `run-publish.sh`.

**Writer:** `run-spot.sh` cron inside the Fly.io container
**Cadence:** `0,30 * * * *` (2x/hr, on the hour and half-hour)
**Stale threshold:** 75 minutes

---

## Architecture

```
MetalPriceAPI.com
  /v1/latest?base=USD&currencies=XAU,XAG,XPT,XPD
         │
         │  HTTP GET (Node.js fetch)
         │  API key: METAL_PRICE_API_KEY (Fly secret)
         ▼
┌──────────────────────────────┐
│  spot-extract.js (Node.js)   │
│  (called by run-spot.sh)     │
│                              │
│  1. Fetch /v1/latest         │
│  2. Rate conversion:         │
│     rate >= 1 → use directly │
│     rate < 1  → invert (1/r) │
│  3. Sanity bounds check      │
│  4. Write to Turso           │
│     spot_prices table        │
│  5. Write JSON files         │
└───────────┬──────────────────┘
            │
    ┌───────┼──────────────┐
    │       │              │
    ▼       ▼              ▼
 Turso    Hourly         15-min
 DB       file           snapshot
    │       │              │
    │       ▼              ▼
    │  data/hourly/     data/15min/
    │  YYYY/MM/DD/      YYYY/MM/DD/
    │  HH.json          HHMM.json
    │       │
    │       ▼ (via run-publish.sh at 8,23,38,53)
    │  api branch → GitHub Pages → api.staktrakr.com
    │
    └──► api-export.js reads spot data from Turso for export
```

---

## Data Source

**MetalPriceAPI** (`metalpriceapi.com`) — requires `METAL_PRICE_API_KEY` Fly secret.

**Endpoints used:**

| Endpoint | Purpose |
|----------|---------|
| `/v1/latest` | Current spot prices (each poll) |

**Rate conversion:** MetalPriceAPI returns USD prices per troy oz. The conversion is conditional:

| Condition | Calculation |
|-----------|-------------|
| `rate >= 1` | Use the returned value directly (already USD/oz) |
| `rate < 1` | Invert: `1 / rate` = USD per troy oz |

After conversion, a sanity bounds check rejects prices outside reasonable ranges (e.g., $5 < price < $50,000).

| Symbol | Metal |
|--------|-------|
| `XAU` | Gold |
| `XAG` | Silver |
| `XPT` | Platinum |
| `XPD` | Palladium |

---

## Output

Each poll writes to **Turso** and **two** types of JSON files:

### Turso `spot_prices` table

The primary data store. `spot-extract.js` inserts rows via `insertSpotPrices()` with gold, silver, platinum, palladium prices and a floored 15-minute window timestamp.

### Hourly (`data/hourly/YYYY/MM/DD/HH.json`)

Overwritten each poll — always has the latest reading for that hour. The frontend fetches this for live spot prices.

```
data/hourly/2026/02/25/19.json
```

### 15-Minute (`data/15min/YYYY/MM/DD/HHMM.json`)

**Immutable** — each poll creates its own file if it does not already exist. Never overwritten. Used for fine-grained historical analysis.

```
data/15min/2026/02/25/1900.json
data/15min/2026/02/25/1930.json
```

---

## Legacy: poller.py (inactive)

The Python-based `poller.py` is no longer the active spot path. It has been replaced by `spot-extract.js` (Node.js). Legacy behavior included:

- `backfill_recent_hours()` — scanned last 24h for missing hourly files, called `/v1/timeframe` to fill gaps
- Daily seed file (`data/spot-history-YYYY.json`) — written once per day at noon EST (17:00 UTC)
- Used Python `requests` library with always-invert rate conversion

The daily seed file (`data/spot-history-YYYY.json`) is still present on disk but is **not written by the active `spot-extract.js` path**. Do not use it for freshness checks.

---

## run-spot.sh

Thin wrapper that calls `spot-extract.js`:

```bash
METAL_PRICE_API_KEY="$METAL_PRICE_API_KEY" \
  DATA_DIR="/data/staktrakr-api-export/data" \
  TURSO_DATABASE_URL="$TURSO_DATABASE_URL" \
  TURSO_AUTH_TOKEN="$TURSO_AUTH_TOKEN" \
  POLLER_ID=fly-spot \
  node /app/spot-extract.js
```

Requires:
- Volume mounted at `/data/staktrakr-api-export`
- `METAL_PRICE_API_KEY` env var set
- `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` for Turso writes (degrades gracefully if unavailable)

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

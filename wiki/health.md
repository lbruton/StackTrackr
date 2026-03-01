---
title: "Health & Diagnostics"
category: infrastructure
owner: staktrakr-api
lastUpdated: v3.33.18
date: 2026-02-25
sourceFiles: []
relatedPages: []
---

# Health & Diagnostics

> **Last verified:** 2026-02-25

---

## Quick Health Check

```python
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
    print(f"Goldback {'✅' if age<=1500 else '⚠️'}  {age/60:.1f}h ago  (${d.get('g1_usd')} G1)")
except Exception as e: print(f"Goldback ❌  {e}")
EOF
```

---

## Stale Thresholds

| Feed | Stale at | Critical at |
|------|----------|-------------|
| Market prices (`manifest.json`) | 30 min | 4 hours |
| Spot prices (hourly file) | 75 min | 3 hours |
| Goldback | 25 hours | 48 hours |

---

## Container Status

```bash
# Fly.io machine and service status
fly status --app staktrakr
fly ssh console --app staktrakr -C "supervisorctl status"

# Logs (all services)
fly logs --app staktrakr

# Filter by pipeline
fly logs --app staktrakr | grep -E 'retail|publish|spot|goldback|ERROR|WARN'

# Log files inside container
fly ssh console --app staktrakr -C "tail -50 /var/log/retail-poller.log"
fly ssh console --app staktrakr -C "tail -50 /var/log/publish.log"
fly ssh console --app staktrakr -C "tail -50 /var/log/spot-poller.log"
fly ssh console --app staktrakr -C "tail -20 /var/log/goldback-poller.log"
```

---

## GitHub Actions Status

```bash
# Merge Poller Branches (runs */15)
gh run list --repo lbruton/StakTrakrApi --workflow "Merge Poller Branches" --limit 5

# Spot poller (retired — manual trigger only)
gh run list --repo lbruton/StakTrakrApi --workflow "spot-poller.yml" --limit 5
```

---

## Turso Database

Check for recent rows from both pollers:

```bash
# If turso CLI is installed
turso db shell staktrakrapi \
  "SELECT poller_id, COUNT(*) as rows, MAX(scraped_at) as latest
   FROM price_snapshots
   WHERE scraped_at > datetime('now', '-2 hours')
   GROUP BY poller_id;"
```

Expected: rows from both `api` (Fly.io) and `home` (LXC) pollers within the last 2 hours.

---

## Diagnosing by Symptom

| Symptom | Likely cause | Action |
|---------|-------------|--------|
| `manifest.json` > 30 min stale | `run-local.sh` missed cycle or `run-publish.sh` not running | `fly logs --app staktrakr \| grep retail` |
| `manifest.json` > 4h stale | Container down | `fly status --app staktrakr` |
| Spot hourly > 75 min stale | `METAL_PRICE_API_KEY` expired or quota exceeded | Check MetalPriceAPI dashboard |
| Goldback > 25h stale | `run-goldback.sh` failed | `fly logs --app staktrakr \| grep goldback` |
| Only 1–2 vendors per coin | Home or Fly poller down, or OOS | Check both pollers; verify Turso has recent rows |
| Vendor missing multiple cycles | URL changed or bot-blocked | Update vendor URL via [dashboard](home-poller.md) at `192.168.1.81:3010/providers` or `provider-db.js` — see [Provider Database](provider-database.md) |
| OOM on Fly.io | Concurrent api-export.js invocations | Verify `run-local.sh` does NOT call `api-export.js` |
| Monument Metals missing at year-start | Random-year SKU on pre-order | Switch to year-specific SKU in providers.json |
| JMBullion presale coins show OOS | Pre-order pattern matching | Verify `PREORDER_TOLERANT_PROVIDERS` includes `jmbullion` |
| Merge workflow failing | Branch conflict or jq parse error | Check GHA run logs; verify `api` branch has valid JSON |
| Both pollers firing at same time | `CRON_SCHEDULE` set to `*/15` instead of `0` | `fly ssh console -C "head -1 /etc/cron.d/retail-poller"` — must show `0` |
| `api-export.js` import crash | `db.js` missing export after refactor | `fly ssh console -C "sh -c 'tail -5 /var/log/publish.log'"` — look for `SyntaxError` |

---

## Manual Triggers

```bash
# Force a retail scrape cycle
fly ssh console --app staktrakr -C "/app/run-local.sh"

# Force a publish cycle
fly ssh console --app staktrakr -C "/app/run-publish.sh"

# Force a spot poll
fly ssh console --app staktrakr -C "/app/run-spot.sh"

# Force a goldback scrape
fly ssh console --app staktrakr -C "/app/run-goldback.sh"

# Home poller (SSH to LXC)
ssh stakpoller@192.168.1.81 "bash /opt/poller/run-home.sh"
```

---

## Lockfile Issues

If a script was killed mid-run, its lockfile may remain:

```bash
# Fly.io
fly ssh console --app staktrakr -C "rm -f /tmp/retail-poller.lock /tmp/retail-publish.lock /tmp/goldback-poller.lock"

# Home LXC
ssh stakpoller@192.168.1.81 "rm -f /tmp/retail-poller.lock"
```

---

## Incident Log

### 2026-02-25: Publish pipeline down + cron collision (4h outage)

**Impact:** API JSON files stopped updating for ~4 hours. Market prices 50+ min stale. Both pollers colliding on same schedule.

**Root cause:** The `retail-poller -> fly-poller` rename (commit `4e23633`) introduced two regressions:

1. **`db.js` missing `readLatestPerVendor` export** -- `api-export.js` imports this function to merge data from both pollers into vendor maps. Without it, `run-publish.sh` crashed on every cycle with `SyntaxError: The requested module './db.js' does not provide an export named 'readLatestPerVendor'`. No new JSON was written to the `api` branch.

2. **`docker-entrypoint.sh` defaulted `CRON_SCHEDULE` to `*/15`** instead of `15,45` (the schedule at the time). This fired the Fly.io retail poller at `:00/:15/:30/:45` instead of just `:15/:45`, colliding with the home poller at `:00/:30`. Both pollers wrote to the same Turso `window_start` simultaneously, and the `:15/:45` windows were empty. (Note: schedule has since been relaxed to `0` / `30` — see [cron-schedule.md](cron-schedule.md).)

3. **`db.js` also missing `startRunLog`/`finishRunLog`** -- `price-extract.js` imports these for Turso run logging. The scraper crashed before executing any scrape logic. (Home poller was unaffected -- separate codebase.)

**Fix:** Commit `c80442f` on StakTrakrApi main:
- Added `readLatestPerVendor()` to `db.js` (latest non-failed row per vendor within lookback window)
- Changed `CRON_SCHEDULE` default from `*/15` to `15,45` (later relaxed to `0` in 2026-02-26)
- Three deploys total to restore full pipeline

**Lesson:** After any `git mv` refactor that touches the Fly.io deploy path, verify all ES module imports resolve on the deployed container before moving on. The `SyntaxError` is fatal at parse time -- nothing runs.

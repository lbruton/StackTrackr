# Turso Multi-Poller Migration Design

**Date:** 2026-02-21
**Status:** Approved
**Target:** 3.33.0

---

## Problem Statement

Current retail-poller has critical reliability issues:

1. **Database corruption every 15 minutes** - `git reset --hard origin/data` wipes `prices.db` (gitignored) at the start of every scrape cycle
2. **Git merge/rebase failures** - Stuck rebase states block API exports for hours
3. **Single point of failure** - One poller = one scrape every 15 minutes, no redundancy
4. **Docker volume persistence issues** - Local SQLite in git working directory is fragile

**Root Cause:** Using a git repository as a database persistence layer.

---

## Solution: Cloud-First Multi-Poller Architecture

### Three-Tier Architecture

1. **Turso (Cloud Source of Truth)**
   - Single libSQL database hosted on Turso
   - All pollers write directly to Turso
   - No git, no Docker volumes, no corruption
   - Schema identical to current SQLite

2. **Independent Pollers (3 instances)**
   - `api1` - Mac (primary, runs now)
   - `api2` - Fly.io (deploying this week)
   - `api3` - Ubuntu homelab or additional cloud (future)
   - Each runs on staggered 15-min schedule → data every 5 minutes
   - Each writes to Turso, exports to dedicated api-data repo

3. **Dedicated api-data Repository**
   - New repo: `https://github.com/lbruton/StakTrakrApi.git`
   - Three poller branches: `api1`, `api2`, `api3`
   - One merged `main` branch (consumers read this)
   - Contains: JSON API files + read-only SQLite snapshot

---

## Data Flow

```
┌─────────────┐
│ Firecrawl   │
│   +         │
│  Vision     │
└──────┬──────┘
       │ scrape
       ▼
┌─────────────┐
│   Poller    │ ◄── Each poller runs independently
│  (api1/2/3) │     on staggered schedule
└──────┬──────┘
       │ write
       ▼
┌─────────────┐
│    Turso    │ ◄── Cloud libSQL database
│  (source of │     (no git, no corruption)
│    truth)   │
└──────┬──────┘
       │ query
       ▼
┌─────────────┐
│ api-export  │ ◄── Generates JSON + SQLite snapshot
└──────┬──────┘
       │ git push
       ▼
┌─────────────┐
│ StakTrakrApi│ ◄── api1, api2, api3 branches
│    repo     │
└──────┬──────┘
       │ merge (every 5 min)
       ▼
┌─────────────┐
│main branch  │ ◄── StakTrakr.pages.dev reads this
└─────────────┘
```

---

## Turso Database Schema

**Identical to current SQLite schema:**

```sql
CREATE TABLE IF NOT EXISTS price_snapshots (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  scraped_at   TEXT NOT NULL,
  window_start TEXT NOT NULL,
  coin_slug    TEXT NOT NULL,
  vendor       TEXT NOT NULL,
  price        REAL,
  source       TEXT NOT NULL,
  confidence   INTEGER,
  is_failed    INTEGER NOT NULL DEFAULT 0,
  in_stock     INTEGER NOT NULL DEFAULT 1
);

-- Same 4 indexes
CREATE INDEX IF NOT EXISTS idx_coin_window
  ON price_snapshots(coin_slug, window_start);

CREATE INDEX IF NOT EXISTS idx_window
  ON price_snapshots(window_start);

CREATE INDEX IF NOT EXISTS idx_coin_date
  ON price_snapshots(coin_slug, substr(window_start, 1, 10));

CREATE INDEX IF NOT EXISTS idx_coin_vendor_stock
  ON price_snapshots(coin_slug, vendor, in_stock, scraped_at DESC);
```

**Connection:**
- Uses `@libsql/client` npm package (drop-in replacement for better-sqlite3)
- Credentials stored in Infisical: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
- All 3 pollers share same database (concurrent writes handled by libSQL HTTP protocol)

---

## Poller Workflow (Each Instance)

**Every 15 minutes (staggered offsets):**

1. **Scrape Phase** (unchanged)
   - Run Firecrawl extraction
   - Run Vision capture + extraction (if GEMINI_API_KEY set)
   - Detect OOS via consensus logic

2. **Write to Turso** (replaces local SQLite)
   - Connect to Turso via `@libsql/client`
   - Insert `price_snapshots` rows
   - Write JSONL disaster recovery log (unchanged, still local to Docker container)

3. **Export Phase** (new workflow)
   - Query Turso for all price data (not local SQLite)
   - Generate JSON API files (`data/api/*/latest.json`)
   - Create read-only SQLite snapshot from Turso data (for offline use)
   - Clone/pull `StakTrakrApi` repo to `/tmp/staktrakr-api-export/`
   - Checkout branch matching this poller (`api1`, `api2`, or `api3`)
   - Copy JSON + SQLite into repo
   - Commit: `"api{N}: YYYY-MM-DD HH:MM export"`
   - Force-push to `origin/api{N}` (no merge conflicts, last-write-wins on this branch)

**No git coordination between pollers** - Each owns its branch, no rebase/merge issues.

---

## Scheduling (Staggered for 5-min Data Cadence)

```
api1 (Mac):       :00, :15, :30, :45  (every 15 min)
api2 (Fly.io):    :05, :20, :35, :50  (offset +5 min)
api3 (Homelab):   :10, :25, :40, :55  (offset +10 min)

→ Result: Fresh scrape every 5 minutes
```

---

## StakTrakrApi Repository Structure

**Repository:** `https://github.com/lbruton/StakTrakrApi.git`

**Branches:**
```
main          ← Merged data from all 3 pollers (consumers read this)
├── api1      ← Mac poller writes here
├── api2      ← Fly.io poller writes here
└── api3      ← Homelab/cloud poller writes here
```

**Directory Structure (identical in all branches):**
```
StakTrakrApi/
├── data/
│   ├── api/
│   │   ├── ase/
│   │   │   └── latest.json
│   │   ├── age/
│   │   │   └── latest.json
│   │   └── ... (all 67 coin slugs)
│   └── retail/
│       └── providers.json
├── prices.db          ← Read-only SQLite snapshot (exported from Turso)
└── README.md
```

---

## Merge Strategy (Every 5 Minutes)

**Merge Job** (runs on Mac or Ubuntu, TBD):

```bash
#!/bin/bash
# merge-api-branches.sh - Runs every 5 minutes via cron

cd /tmp/staktrakr-api-merge/
git fetch origin api1 api2 api3

# For each coin's latest.json:
for coin in ase age ape ...; do
  # Parse all 3 versions (api1, api2, api3)
  # Merge prices_by_site arrays (union, no duplicates by vendor)
  # Merge availability_by_site objects (most recent in_stock state wins)
  # Take most recent updated_at timestamp
  # Write merged result to main branch
done

# For prices.db:
# Query Turso directly (always current, no merging needed)
# Export fresh snapshot to main branch

git commit -m "merge: api1+api2+api3 @ $(date -u +%H:%M)"
git push origin main
```

**Result:** `main` branch updated every 5 minutes with union of all poller data.

---

## Authentication & Secrets

**Turso Credentials (stored in Infisical):**
- `TURSO_DATABASE_URL` - libSQL connection string
- `TURSO_AUTH_TOKEN` - Authentication token

**GitHub Access:**
- `GITHUB_TOKEN` - Personal access token for pushing to StakTrakrApi repo
- Needs write access to `api1`, `api2`, `api3` branches

**Other Secrets (unchanged):**
- `GEMINI_API_KEY` - Vision pipeline
- `BROWSERLESS_URL` - Screenshot capture (Mac/Ubuntu only, Fly.io will skip Vision)

**Deployment Configuration:**

```yaml
# api1 (Mac) - devops/firecrawl-docker/docker-compose.yml
services:
  retail-poller:
    environment:
      TURSO_DATABASE_URL: ${TURSO_DATABASE_URL}
      TURSO_AUTH_TOKEN: ${TURSO_AUTH_TOKEN}
      GITHUB_TOKEN: ${GITHUB_TOKEN}
      POLLER_ID: api1
      API_DATA_REPO: https://github.com/lbruton/StakTrakrApi.git

# api2 (Fly.io) - devops/retail-poller/fly.toml
[env]
  POLLER_ID = "api2"
  API_DATA_REPO = "https://github.com/lbruton/StakTrakrApi.git"

# Set secrets via CLI:
# fly secrets set TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... GITHUB_TOKEN=...
```

---

## Migration Path

### Phase 1: Code Migration (This Session)

**Files to modify:**
1. `devops/retail-poller/db.js` - Replace better-sqlite3 with @libsql/client
2. `devops/retail-poller/package.json` - Add @libsql/client dependency
3. `devops/retail-poller/run-local.sh` - Replace staktrakr-data repo with StakTrakrApi
4. `devops/retail-poller/api-export.js` - Query Turso instead of local SQLite
5. `devops/firecrawl-docker/docker-compose.yml` - Add Turso env vars
6. `devops/firecrawl-docker/.env` - Add Turso credentials

**New files:**
7. `devops/retail-poller/fly.toml` - Fly.io deployment config
8. `scripts/merge-api-branches.sh` - Merge job for combining api1/api2/api3

### Phase 2: Turso Database Setup

1. Create Turso database (via Turso CLI or web UI)
2. Run schema creation (CREATE TABLE + 4 indexes)
3. Import existing JSONL logs to Turso (today's 829 rows)
4. Verify schema matches current SQLite

### Phase 3: Mac Testing (api1)

1. Update docker-compose.yml with Turso credentials
2. Restart retail-poller container
3. Verify writes to Turso
4. Verify exports to StakTrakrApi/api1 branch
5. Monitor for 1 hour (4 scrape cycles)

### Phase 4: Fly.io Deployment (api2)

1. Create `fly.toml` with cron schedule (:05, :20, :35, :50)
2. Set Fly secrets (Turso + GitHub tokens)
3. Deploy: `fly deploy --config devops/retail-poller/fly.toml`
4. Verify writes to Turso
5. Verify exports to StakTrakrApi/api2 branch

### Phase 5: Merge Job Setup

1. Create merge script (queries Turso, merges JSON from api1/api2 branches)
2. Add cron to Mac: `*/5 * * * * /path/to/merge-api-branches.sh`
3. Verify `main` branch updates every 5 minutes
4. Point StakTrakr.pages.dev at `main` branch

### Phase 6: api3 Deployment (Future)

1. Ubuntu homelab or additional Fly.io app
2. Schedule offset: :10, :25, :40, :55
3. Same deployment process as api2

---

## Rollback Plan

If Turso migration fails:

1. **Immediate:** Revert docker-compose.yml to use local SQLite
2. **Recover data:** Import JSONL logs to local SQLite (import-from-log.js)
3. **Resume old workflow:** Push to staktrakr-data branch (accept git issues)

**JSONL logs remain unchanged** - Disaster recovery still works.

---

## Success Criteria

1. **No database corruption** - Turso handles all persistence, git only stores exports
2. **5-minute data cadence** - api1 + api2 provide fresh data every 5 minutes (10 min with just api1+api2)
3. **No git merge conflicts** - Each poller owns its branch, merge job handles combining
4. **Fault tolerance** - If one poller fails, others continue (degraded but not broken)
5. **Same API contract** - JSON structure unchanged, consumers see no difference

---

## Out of Scope (Deferred to Future)

- Historical data migration (only migrate today's data initially)
- Spot price poller migration (separate system, tackle later)
- Goldback scraper migration (separate system, tackle later)
- Automated failover/health checks (manual monitoring for now)

---

## Notes

- **Turso free tier:** 9 GB storage, 1 billion row reads/month (more than enough)
- **Fly.io free tier:** Hobby plan $5/month (shared-cpu-1x + 256MB RAM sufficient)
- **StakTrakrApi repo size:** ~5 MB (JSON files compress well)
- **Merge job cost:** Runs on existing Mac/Ubuntu hardware (no added cloud cost)

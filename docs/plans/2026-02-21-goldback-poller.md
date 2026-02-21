# Goldback Daily Poller (STAK-231) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a daily Goldback.com exchange rate scraper that writes `data/api/goldback-spot.json` and `data/goldback-YYYY.json` to the data branch, so the app can display real Goldback market rates instead of the 2x spot gold estimate.

**Architecture:** New `goldback-scraper.js` runs inside the existing retail-poller Docker container (no new container). Scrapes `goldback.com/goldback-value/` via Firecrawl, extracts the G1 USD rate, computes denomination multiples, writes two output files, and pushes to the data branch. A new cron entry at 10:01 AM MT fires it daily. Docker rebuild required. Frontend wiring is **DEFERRED** until after v3.32.0 ships — do not touch `js/` files in this plan.

**Tech Stack:** Node.js ESM, Firecrawl (existing self-hosted Docker at port 3002), `devops/retail-poller/`

---

### Task 1: Create `goldback-scraper.js`

**Files:**
- Create: `devops/retail-poller/goldback-scraper.js`

**Step 1: Write the scraper**

Create `devops/retail-poller/goldback-scraper.js`:

```js
#!/usr/bin/env node
/**
 * StakTrakr Goldback Daily Rate Scraper
 * =======================================
 * Scrapes goldback.com/goldback-value/ for the current G1 USD exchange rate.
 * Writes:
 *   DATA_DIR/api/goldback-spot.json   -- latest rate (overwritten each day)
 *   DATA_DIR/goldback-{YYYY}.json     -- rolling daily log (appended)
 *
 * Usage:
 *   DATA_DIR=/path/to/data node goldback-scraper.js
 *
 * Environment:
 *   DATA_DIR            Path to repo data/ folder (default: ../../data)
 *   FIRECRAWL_BASE_URL  Self-hosted Firecrawl (default: http://firecrawl:3002)
 *   FIRECRAWL_API_KEY   Cloud Firecrawl only (omit for self-hosted)
 *   DRY_RUN             Set to "1" to skip writes
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DATA_DIR = resolve(process.env.DATA_DIR || join(__dirname, "../../data"));
const DRY_RUN = process.env.DRY_RUN === "1";
const FIRECRAWL_BASE_URL = process.env.FIRECRAWL_BASE_URL || "http://firecrawl:3002";
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || "not-set";

const GOLDBACK_URL = "https://goldback.com/goldback-value/";

// G1 price must fall in this range (sanity check)
const G1_MIN = 0.50;
const G1_MAX = 20.00;

// Denomination multipliers relative to G1
const DENOMINATION_MULTIPLIERS = { g1: 1, g5: 5, g10: 10, g25: 25, g50: 50 };

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function warn(msg) {
  console.warn(`[${new Date().toISOString().slice(11, 19)}] WARN: ${msg}`);
}

// ---------------------------------------------------------------------------
// Firecrawl scrape
// ---------------------------------------------------------------------------

async function scrapeGoldbackPage() {
  const body = JSON.stringify({
    url: GOLDBACK_URL,
    formats: ["markdown"],
  });

  const headers = {
    "Content-Type": "application/json",
    ...(FIRECRAWL_API_KEY !== "not-set" ? { Authorization: `Bearer ${FIRECRAWL_API_KEY}` } : {}),
  };

  const resp = await fetch(`${FIRECRAWL_BASE_URL}/v1/scrape`, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(30_000),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Firecrawl ${resp.status}: ${text.slice(0, 200)}`);
  }

  const json = await resp.json();
  return json?.data?.markdown || json?.markdown || "";
}

// ---------------------------------------------------------------------------
// Price extraction
// ---------------------------------------------------------------------------

/**
 * Extract G1 USD rate from Firecrawl markdown.
 * Goldback.com shows the rate as "$3.87" in the page content.
 * Scan all dollar amounts in the valid G1 range and return the most frequent.
 */
function extractG1Rate(markdown) {
  if (!markdown) return null;

  const dollarPattern = /\$\s*(\d+\.\d{1,2})/g;
  const candidates = [];
  let m;
  while ((m = dollarPattern.exec(markdown)) !== null) {
    const val = parseFloat(m[1]);
    if (val >= G1_MIN && val <= G1_MAX) candidates.push(val);
  }

  if (candidates.length === 0) return null;

  // Return most common value (robust to repeated display of the same rate)
  const freq = {};
  for (const v of candidates) freq[v] = (freq[v] || 0) + 1;
  return parseFloat(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]);
}

// ---------------------------------------------------------------------------
// File writers
// ---------------------------------------------------------------------------

function writeLatestJson(g1Rate, dateStr, scrapedAt) {
  const denominations = {};
  for (const [key, mult] of Object.entries(DENOMINATION_MULTIPLIERS)) {
    denominations[key] = Math.round(g1Rate * mult * 100) / 100;
  }

  const data = {
    date: dateStr,
    scraped_at: scrapedAt,
    g1_usd: g1Rate,
    denominations,
    source: "goldback.com",
    confidence: "high",
  };

  const filePath = join(DATA_DIR, "api", "goldback-spot.json");
  if (DRY_RUN) {
    log(`[DRY RUN] would write ${filePath}`);
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  mkdirSync(join(DATA_DIR, "api"), { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
  log(`Wrote ${filePath}`);
}

function appendHistoryJson(g1Rate, dateStr, scrapedAt) {
  const year = dateStr.slice(0, 4);
  const filePath = join(DATA_DIR, `goldback-${year}.json`);

  let history = [];
  if (existsSync(filePath)) {
    try {
      history = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch {
      warn(`Could not parse ${filePath} -- starting fresh`);
    }
  }

  // Remove existing entry for today (idempotent re-run)
  history = history.filter(e => e.date !== dateStr);
  history.push({ date: dateStr, g1_usd: g1Rate, scraped_at: scrapedAt });
  history.sort((a, b) => b.date.localeCompare(a.date)); // newest first

  if (DRY_RUN) {
    log(`[DRY RUN] would update ${filePath} (${history.length} entries)`);
    return;
  }
  writeFileSync(filePath, JSON.stringify(history, null, 2) + "\n");
  log(`Updated ${filePath} (${history.length} entries)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const scrapedAt = now.toISOString();

  log(`Goldback rate scrape for ${dateStr}`);
  if (DRY_RUN) log("DRY RUN -- no files written");

  let markdown;
  try {
    markdown = await scrapeGoldbackPage();
    log(`Firecrawl: ${markdown.length} chars`);
  } catch (err) {
    console.error(`Firecrawl failed: ${err.message}`);
    process.exit(1);
  }

  const g1Rate = extractG1Rate(markdown);
  if (g1Rate === null) {
    console.error("Could not extract G1 rate from page. Check goldback.com page structure.");
    log("No write -- previous data retained.");
    process.exit(1);
  }

  log(`G1 rate: $${g1Rate}`);
  writeLatestJson(g1Rate, dateStr, scrapedAt);
  appendHistoryJson(g1Rate, dateStr, scrapedAt);
  log("Done.");
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
```

**Step 2: Make it executable**

```bash
chmod +x devops/retail-poller/goldback-scraper.js
```

**Step 3: Dry-run test (Firecrawl must be running)**

Make sure self-hosted Firecrawl is running:
```bash
# cd devops/firecrawl-docker && docker compose up -d
```

Then run:
```bash
DATA_DIR=/path/to/data-branch/data \
FIRECRAWL_BASE_URL=http://localhost:3002 \
DRY_RUN=1 \
node devops/retail-poller/goldback-scraper.js
```

Expected output:
```
[HH:MM:SS] Goldback rate scrape for 2026-02-21
[HH:MM:SS] DRY RUN -- no files written
[HH:MM:SS] Firecrawl: NNNN chars
[HH:MM:SS] G1 rate: $X.XX
[DRY RUN] would write .../api/goldback-spot.json
{ "date": "2026-02-21", "g1_usd": X.XX, ... }
```

If "Could not extract G1 rate": add `console.log(markdown)` before `extractG1Rate()` to inspect the raw Firecrawl markdown and identify the dollar amount pattern used on the page.

**Step 4: Live test (writes actual files)**

```bash
DATA_DIR=/path/to/data-branch/data \
FIRECRAWL_BASE_URL=http://localhost:3002 \
node devops/retail-poller/goldback-scraper.js
```

Check output:
```bash
cat /path/to/data-branch/data/api/goldback-spot.json
cat /path/to/data-branch/data/goldback-2026.json
```

**Step 5: Run twice to verify idempotency**

Run again. `goldback-2026.json` should still have only 1 entry for today.

**Step 6: Commit**

```bash
git add devops/retail-poller/goldback-scraper.js
git commit -m "feat(goldback-scraper): daily G1 rate scraper via Firecrawl -> goldback-spot.json + goldback-YYYY.json"
```

---

### Task 2: Create `run-goldback.sh` orchestrator

**Files:**
- Create: `devops/retail-poller/run-goldback.sh`

**Step 1: Write the script**

Create `devops/retail-poller/run-goldback.sh`:

```bash
#!/bin/bash
# StakTrakr Goldback Daily Rate Poller
# Runs once per day via cron -- scrapes G1 rate, commits to data branch.

set -e

LOCKFILE=/tmp/goldback-poller.lock
if [ -f "$LOCKFILE" ]; then
  echo "[$(date -u +%H:%M:%S)] Goldback poller already running, skipping"
  exit 0
fi
trap "rm -f $LOCKFILE" EXIT
touch $LOCKFILE

if [ -z "${DATA_REPO_PATH:-}" ]; then
  echo "ERROR: DATA_REPO_PATH not set"
  exit 1
fi

YEAR=$(date +%Y)
DATE=$(date +%Y-%m-%d)

echo "[$(date -u +%H:%M:%S)] Goldback rate poll for ${DATE}"

cd "$DATA_REPO_PATH"
git pull --rebase origin data

DATA_DIR="$DATA_REPO_PATH/data" \
FIRECRAWL_BASE_URL="${FIRECRAWL_BASE_URL:-http://firecrawl:3002}" \
node /app/goldback-scraper.js

git add \
  "data/api/goldback-spot.json" \
  "data/goldback-${YEAR}.json" \
  2>/dev/null || true

if git diff --cached --quiet; then
  echo "[$(date -u +%H:%M:%S)] No new Goldback data to commit."
else
  git commit -m "data: goldback spot ${DATE}"
  git pull --rebase origin data
  git push origin data
  echo "[$(date -u +%H:%M:%S)] Pushed Goldback rate to data branch"
fi

echo "[$(date -u +%H:%M:%S)] Done."
```

**Step 2: Make it executable**

```bash
chmod +x devops/retail-poller/run-goldback.sh
```

**Step 3: Test script locally (outside Docker)**

```bash
DATA_REPO_PATH=/path/to/data-branch \
FIRECRAWL_BASE_URL=http://localhost:3002 \
bash devops/retail-poller/run-goldback.sh
```

Expected: pulls data branch, scrapes G1 rate, commits and pushes if changed.

**Step 4: Commit**

```bash
git add devops/retail-poller/run-goldback.sh
git commit -m "feat(run-goldback): daily orchestrator -- scrape, commit, push to data branch"
```

---

### Task 3: Update `Dockerfile` — add Goldback cron + copy new script

**Files:**
- Modify: `devops/retail-poller/Dockerfile`

The Dockerfile currently has two relevant sections (around lines 22-39):

```dockerfile
COPY *.js ./
COPY run-local.sh run-fbp.sh docker-entrypoint.sh ./
RUN chmod +x run-local.sh run-fbp.sh docker-entrypoint.sh

# ... (other lines) ...

RUN (echo "*/15 * * * * root . /etc/environment; /app/run-local.sh >> /var/log/retail-poller.log 2>&1"; \
     echo "0 20 * * * root . /etc/environment; /app/run-fbp.sh >> /var/log/retail-poller.log 2>&1") > /etc/cron.d/retail-poller && \
    chmod 0644 /etc/cron.d/retail-poller
```

**Step 1: Add `run-goldback.sh` to COPY + chmod**

```dockerfile
# Before:
COPY run-local.sh run-fbp.sh docker-entrypoint.sh ./
RUN chmod +x run-local.sh run-fbp.sh docker-entrypoint.sh

# After:
COPY run-local.sh run-fbp.sh run-goldback.sh docker-entrypoint.sh ./
RUN chmod +x run-local.sh run-fbp.sh run-goldback.sh docker-entrypoint.sh
```

**Step 2: Add Goldback cron entry (10:01 AM UTC = 4:01 AM ET / 2:01 AM MT)**

The goal is ~10 AM Mountain Time. MST = UTC-7, MDT = UTC-6.
Use `1 17 * * *` UTC to hit 10:01 AM MST (winter) / 11:01 AM MDT (summer).
Adjust seasonally if needed.

```dockerfile
# Before:
RUN (echo "*/15 * * * * root . /etc/environment; /app/run-local.sh >> /var/log/retail-poller.log 2>&1"; \
     echo "0 20 * * * root . /etc/environment; /app/run-fbp.sh >> /var/log/retail-poller.log 2>&1") > /etc/cron.d/retail-poller && \
    chmod 0644 /etc/cron.d/retail-poller

# After:
RUN (echo "*/15 * * * * root . /etc/environment; /app/run-local.sh >> /var/log/retail-poller.log 2>&1"; \
     echo "0 20 * * * root . /etc/environment; /app/run-fbp.sh >> /var/log/retail-poller.log 2>&1"; \
     echo "1 17 * * * root . /etc/environment; /app/run-goldback.sh >> /var/log/goldback-poller.log 2>&1") > /etc/cron.d/retail-poller && \
    chmod 0644 /etc/cron.d/retail-poller
```

**Step 3: Rebuild Docker container**

```bash
cd devops/retail-poller
docker compose build --no-cache
docker compose up -d
```

**Step 4: Verify cron entry inside container**

```bash
# List running containers to get the container name
docker ps --filter "name=retail"

# Then inspect the cron file:
docker compose run --rm --entrypoint cat retail-poller /etc/cron.d/retail-poller
```

Expected: three lines, including the goldback one at `1 17`.

**Step 5: Verify scripts are present in container**

```bash
docker compose run --rm --entrypoint ls retail-poller /app/goldback-scraper.js /app/run-goldback.sh
```

**Step 6: Manual trigger for first run**

```bash
docker compose run --rm \
  -e DATA_REPO_PATH=/data-repo \
  --entrypoint /app/run-goldback.sh \
  retail-poller
```

Expected: G1 rate logged, data pushed to data branch.

**Step 7: Commit**

```bash
git add devops/retail-poller/Dockerfile
git commit -m "feat(Dockerfile): add Goldback cron entry at 17:01 UTC, copy run-goldback.sh"
```

---

### Task 4: Verify data branch output

**Step 1: Check the API endpoint after first live run**

```bash
curl -s https://api.staktrakr.com/data/api/goldback-spot.json | python3 -m json.tool
```

Expected:
```json
{
  "date": "2026-02-21",
  "scraped_at": "2026-02-21T17:01:xx.xxxZ",
  "g1_usd": 3.87,
  "denominations": {
    "g1": 3.87,
    "g5": 19.35,
    "g10": 38.70,
    "g25": 96.75,
    "g50": 193.50
  },
  "source": "goldback.com",
  "confidence": "high"
}
```

**Step 2: Check historical file**

```bash
curl -s https://api.staktrakr.com/data/goldback-2026.json | python3 -m json.tool | head -20
```

Expected: array with at least one entry for today.

---

### Task 5: DEFERRED — Frontend wiring (post-v3.32.0)

**DO NOT implement until v3.32.0 PR has merged to main.**

Files to change in a follow-up session:
- `js/constants.js` — add `GOLDBACK_API_URL = "https://api.staktrakr.com/data/api/goldback-spot.json"`
- `js/goldback.js` — add `fetchGoldbackApiPrices()` async function
- `js/settings-listeners.js` — update `goldbackEstimateRefreshBtn` to try API first, fall back to 2x gold spot estimate

Full design is in `docs/plans/2026-02-21-goldback-poller-design.md`.

---

## Implementation Order

1. Task 1 — `goldback-scraper.js` (can test immediately with local Firecrawl)
2. Task 2 — `run-goldback.sh` (test locally before Docker)
3. Task 3 — Dockerfile rebuild (requires Docker access + takes a few minutes)
4. Task 4 — verify data branch output
5. Task 5 — DEFERRED (frontend, post-v3.32.0)

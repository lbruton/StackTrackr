# Goldback Daily Exchange Rate Poller Design

**Date:** 2026-02-21
**Status:** Approved
**Linear:** STAK-231
**Context:** claude3 validated Firecrawl scraping approach against Goldback.com; STAK-231 contains working extraction code. This doc finalizes the architecture for backend poller + light frontend wiring.

---

## Goal

Gather Goldback's published G1-unit exchange rate once per day, store it alongside the retail data pipeline, and expose a `data/api/goldback-spot.json` endpoint so the frontend can display a real market rate instead of the current 2× spot gold estimate.

---

## Source & Extraction

**Primary source:** `https://goldback.com/goldback-value/` (Firecrawl-proven per STAK-231)

Firecrawl returns markdown. The G1 rate appears as a `$X.XX` value in the page. The denomination table covers G1, G5, G10, G25, G50 — all derived as multiples:

| Denom | Multiplier |
|---|---|
| G1  | 1×   |
| G5  | 5×   |
| G10 | 10×  |
| G25 | 25×  |
| G50 | 50×  |

The published G1 rate is the only value needed; all others compute from it.

**Fallback:** If Firecrawl fails, reuse the previous day's G1 rate from `data/goldback-{YYYY}.json` (no write, just no update).

---

## New File: `devops/retail-poller/goldback-scraper.js`

```
devops/retail-poller/
  goldback-scraper.js    (NEW)
```

### Responsibilities

1. Fetch `https://goldback.com/goldback-value/` via Firecrawl (local self-hosted at `FIRECRAWL_BASE_URL` or cloud)
2. Parse G1 rate from markdown using a `$XX.XX` pattern within a known price-range window (e.g., $0.50–$10.00)
3. Write `data/api/goldback-spot.json` (latest endpoint)
4. Append to `data/goldback-{YYYY}.json` (historical log)
5. Push changes to data branch

### `data/api/goldback-spot.json` schema

```json
{
  "date": "2026-02-21",
  "scraped_at": "2026-02-21T16:01:00Z",
  "g1_usd": 3.87,
  "denominations": {
    "g1":  3.87,
    "g5":  19.35,
    "g10": 38.70,
    "g25": 96.75,
    "g50": 193.50
  },
  "source": "goldback.com",
  "confidence": "high"
}
```

### `data/goldback-{YYYY}.json` schema

```json
[
  { "date": "2026-02-21", "g1_usd": 3.87, "scraped_at": "2026-02-21T16:01:00Z" },
  { "date": "2026-02-20", "g1_usd": 3.85, "scraped_at": "2026-02-20T16:01:00Z" }
]
```

### Environment variables used

| Var | Notes |
|---|---|
| `DATA_DIR` | Standard — same as retail poller |
| `FIRECRAWL_BASE_URL` | Self-hosted: `http://localhost:3002`; omit for cloud |
| `FIRECRAWL_API_KEY` | Cloud Firecrawl only |
| `DRY_RUN` | `1` = skip file writes |

---

## Cron Schedule

**Target:** Once daily at ~10:01 AM Mountain Time (shortly after Goldback business hours open)

```bash
# In docker-entrypoint.sh (or crontab inside Docker)
1 10 * * * TZ=America/Denver /app/run-goldback.sh >> /var/log/goldback.log 2>&1
```

### `run-goldback.sh` (new, minimal)

```bash
#!/bin/bash
set -euo pipefail
export DATA_DIR="${DATA_REPO_PATH}/data"
node /app/goldback-scraper.js
cd "${DATA_REPO_PATH}"
git add data/api/goldback-spot.json "data/goldback-$(date +%Y).json"
git diff --cached --quiet || git commit -m "data: goldback spot $(date +%Y-%m-%d)"
git push origin data
```

---

## Docker Impact

Changes required:
- Add `run-goldback.sh` to `/app/` → **Docker image rebuild needed**
- Add cron entry to `docker-entrypoint.sh` → **rebuild needed**
- No new npm packages (Firecrawl client already installed, `better-sqlite3` already present, no SQLite needed for goldback)

**Note for self-hosted docker setup:** After writing the new scripts, rebuild the container:
```bash
cd devops/retail-poller
docker compose build --no-cache
docker compose up -d
```

The `DATA_REPO_PATH` volume mount is already wired — no changes to `docker-compose.yml` needed.

---

## Frontend Wiring (Light Touch)

**Constraint: `js/constants.js` is currently frozen** — the v3.32.0 PR is in review. Frontend wiring is deferred to a separate commit after v3.32.0 ships.

### Phase A (deferred, post-v3.32.0): `js/constants.js`

```js
const GOLDBACK_API_URL = "https://api.staktrakr.com/data/api/goldback-spot.json";
```

### Phase B (deferred): `js/goldback.js` — `fetchGoldbackApiPrices()`

New async function:

```js
async function fetchGoldbackApiPrices() {
  if (typeof GOLDBACK_API_URL === "undefined" || !GOLDBACK_API_URL) return null;
  try {
    const resp = await fetch(GOLDBACK_API_URL);
    if (!resp.ok) return null;
    const data = await resp.json();
    return data; // { g1_usd, denominations, date, scraped_at }
  } catch {
    return null;
  }
}
```

Used by the "Refresh Estimate" button to prefer live API rate over 2× spot formula when available.

### Phase C (deferred): `js/settings-listeners.js` — Smart button handler

Current `goldbackEstimateRefreshBtn` click handler calls `syncProviderChain()` (gold spot sync). New handler:

```js
goldbackEstimateRefreshBtn.addEventListener("click", async () => {
  // 1. Try API first
  const apiData = await fetchGoldbackApiPrices();
  if (apiData && apiData.g1_usd) {
    // Store API rate in localStorage under GOLDBACK_PRICES_KEY
    saveData(GOLDBACK_PRICES_KEY, { g1_usd: apiData.g1_usd, date: apiData.date, source: "api" });
    updateGoldbackDisplay(apiData.g1_usd);
    return;
  }
  // 2. Fall back to gold spot estimate (existing behavior)
  await syncProviderChain({ showProgress: false, forceSync: true });
});
```

No new localStorage keys required — reuses `GOLDBACK_PRICES_KEY` (already in `ALLOWED_STORAGE_KEYS`).

---

## Data Branch Structure

```
data/
  api/
    goldback-spot.json        (latest G1 rate)
    goldback-history.json     (future: 30d aggregate — not in scope now)
  goldback-2026.json          (running daily log, appended by scraper)
  goldback-2025.json          (historical, if backfill wanted)
```

---

## Out of Scope

- Backfilling historical Goldback rates (no reliable historical source identified)
- Goldback intraday chart (daily granularity only to start)
- Retail view modal for Goldback (no per-coin breakdown needed — single rate applies to all)
- Changing confidence scoring model (not applicable; scraper is single-source)
- `sw.js` or `CHANGELOG.md` changes (deferred until post-v3.32.0)

---

## Acceptance Criteria

**Backend (can merge immediately):**
- [ ] `goldback-scraper.js` runs locally with `DRY_RUN=1` and logs a parsed G1 rate
- [ ] `goldback-spot.json` written with correct schema
- [ ] `goldback-2026.json` appended (not overwritten) on repeated runs
- [ ] `run-goldback.sh` pushes to data branch successfully
- [ ] Cron fires at 10:01 AM MT (verify via `docker logs` timestamp)
- [ ] Graceful fallback: if scrape fails, no file write, no crash

**Frontend (post-v3.32.0):**
- [ ] "Refresh Estimate" button shows live Goldback.com rate when API available
- [ ] Falls back to 2× spot formula when API unavailable (existing behavior preserved)
- [ ] No new `ALLOWED_STORAGE_KEYS` needed (reuses existing key)

---

## Implementation Order

1. `goldback-scraper.js` — core scraper + file writer
2. `run-goldback.sh` — thin orchestrator + git push
3. Docker rebuild + cron wire-up
4. Manual test run with `DRY_RUN=1`
5. Frontend wiring (Phase A/B/C) — after v3.32.0 merges

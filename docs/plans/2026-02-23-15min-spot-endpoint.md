# 15-Minute Spot Price Endpoint Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `data/15min/YYYY/MM/DD/HHMM.json` file tree to the StakTrakr API so that each 15-minute spot poll is preserved as a distinct timestamped file, enabling sub-hourly granularity for charts and any future consumer.

**Architecture:** The GHA `spot-poller.yml` already runs at `:05/:20/:35/:50` and overwrites `data/hourly/YYYY/MM/DD/HH.json` each run. This plan adds a parallel write to `data/15min/YYYY/MM/DD/HHMM.json` (e.g. `0705.json`, `0720.json`) — one immutable file per poll. The hourly file is unchanged and continues to serve the current-spot-price fetch. The frontend gains a new `fetchStaktrakr15minRange()` function that walks the 15-min tree to build a sub-hourly history array, following the exact same pattern as the existing `fetchStaktrakrHourlyRange()`.

**Tech Stack:** Python 3.12 (poller), vanilla JS (frontend), GitHub Actions, GitHub Pages (StakTrakrApi `api` branch)

**File Touch Map:**

| Action | File | Scope |
|--------|------|-------|
| MODIFY | `devops/spot-poller/update-seed-data.py` | add `save_15min_file()` ~line 112 |
| MODIFY | `devops/spot-poller/poller.py` | call `save_15min_file()` in `poll_once()` ~line 219 |
| MODIFY | `js/constants.js` | add `fifteenMinBaseUrls` ~line 21 |
| MODIFY | `js/api.js` | add `fetchStaktrakr15minRange()` ~line 141 |
| MODIFY | `docs/devops/api-infrastructure-runbook.md` | add 15-min section |
| MODIFY | `.claude/skills/api-infrastructure/SKILL.md` | update feed table |
| MODIFY | `CLAUDE.md` | update feed table |

---

## Task Table

| ID | Step | Est (min) | Files | Validation | Risk/Notes | Agent |
|----|------|-----------|-------|------------|------------|-------|
| T1 | Add `save_15min_file()` to update-seed-data.py | 5 | `devops/spot-poller/update-seed-data.py` | Manual: call function, verify file written | None — mirrors `save_15min_file` exactly | Claude |
| T2 | Wire `save_15min_file()` into `poll_once()` | 5 | `devops/spot-poller/poller.py` | Run `python poller.py --once` locally (dry) | Needs `METAL_PRICE_API_KEY` env var | Claude |
| T3 | Commit poller changes | 2 | Both poller files | `git log` shows commit | None | Claude |
| T4 | Add `fifteenMinBaseUrls` to constants.js | 3 | `js/constants.js` | Grep confirms key exists | Must not conflict with `hourlyBaseUrls` | Claude |
| T5 | Add `fetchStaktrakr15minRange()` to api.js | 10 | `js/api.js` | Manual browser test or smoke-test | Mirrors `fetchStaktrakrHourlyRange` exactly | Claude |
| T6 | Commit frontend changes | 2 | Both JS files | `git log` shows commit | None | Claude |
| T7 | Update docs + skill files | 5 | runbook, SKILL.md, CLAUDE.md | Grep confirms 15min mentioned | None | Claude |
| T8 | Commit docs | 2 | Doc files | `git log` shows commit | None | Claude |
| T9 | Trigger manual GHA run + verify 15min file appears | 5 | — (StakTrakrApi) | `curl` confirms `data/15min/...` returns 200 | Needs `dev` branch pushed | Human |

---

### Task 1: `save_15min_file()` in update-seed-data.py ← NEXT

**Files:**
- Modify: `devops/spot-poller/update-seed-data.py` — add after `save_hourly_file()` (~line 112)

**Context:**
`save_hourly_file()` writes to `data/hourly/YYYY/MM/DD/HH.json`. The new function writes to `data/15min/YYYY/MM/DD/HHMM.json` where `HHMM` is the zero-padded hour+minute (e.g. `0705`, `0720`). These files are **never overwritten** — each poll produces a permanent snapshot. The 15-min files complement, not replace, hourly files.

**Step 1: Add the function**

In `devops/spot-poller/update-seed-data.py`, immediately after `save_hourly_file()` (after line ~112), insert:

```python
def save_15min_file(data_dir, entries, date_obj, hour_str, minute_str):
    """
    Write 15-min price snapshot to data/15min/YYYY/MM/DD/HHMM.json.

    HHMM = zero-padded hour + minute (e.g. "0705", "0720", "0735", "0750").
    Files are immutable — each poll produces its own permanent snapshot.
    Returns True if written, False if file already exists (idempotent per-poll).
    """
    min_dir = (
        Path(data_dir) / "15min"
        / str(date_obj.year)
        / f"{date_obj.month:02d}"
        / f"{date_obj.day:02d}"
    )
    min_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{hour_str}{minute_str}.json"
    path = min_dir / filename
    if path.exists():
        return False
    with open(path, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2)
    return True
```

**Step 2: Verify the function is syntactically correct**

```bash
cd /Volumes/DATA/GitHub/StakTrakr/devops/spot-poller
python3 -c "from update-seed-data import save_15min_file; print('OK')" 2>/dev/null \
  || python3 -c "
import importlib.util, sys
spec = importlib.util.spec_from_file_location('m', 'update-seed-data.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
print('save_15min_file' in dir(m))
"
```
Expected output: `True`

---

### Task 2: Wire `save_15min_file()` into `poll_once()`

**Files:**
- Modify: `devops/spot-poller/poller.py` — in `poll_once()` after the `write_hourly()` call (~line 219)

**Context:**
`poll_once()` already has `now.minute` available (added in today's timestamp fix). The minute is already formatted as `minute_str`. We add one call after `write_hourly()`.

**Step 1: Add the 15-min write call in `poll_once()`**

Find this block in `poller.py` (around line 218):
```python
    # Always write hourly data (with actual-hour timestamps)
    write_hourly(hourly_entries, data_dir, hour_str, today)
```

Add immediately after:
```python
    # Write 15-min snapshot (immutable per-poll, never overwritten)
    written_15min = seed.save_15min_file(data_dir, hourly_entries, today, hour_str, minute_str)
    if written_15min:
        log(f"15min: wrote {len(hourly_entries)} entries → "
            f"15min/{today.year}/{today.month:02d}/{today.day:02d}/{hour_str}{minute_str}.json")
    else:
        log(f"15min: {hour_str}{minute_str}.json already exists — skipped.")
```

**Step 2: Verify `minute_str` is in scope**

Confirm that `minute_str = f"{now.minute:02d}"` is defined earlier in `poll_once()` — it was added in today's timestamp fix. If missing for any reason, add it right after `hour_str = f"{hour:02d}"`:
```python
    minute_str = f"{now.minute:02d}"
```

**Step 3: Syntax check**

```bash
cd /Volumes/DATA/GitHub/StakTrakr/devops/spot-poller
python3 -m py_compile poller.py && echo "OK"
```
Expected: `OK`

---

### Task 3: Commit poller changes

```bash
git add devops/spot-poller/update-seed-data.py devops/spot-poller/poller.py
git commit -m "feat: spot-poller writes data/15min/YYYY/MM/DD/HHMM.json each 15-min poll

Each GHA run now produces an immutable 15-min snapshot alongside the
overwritten hourly file. Path: data/15min/YYYY/MM/DD/HHMM.json
(e.g. 0705.json, 0720.json). Files are idempotent — skipped if already
exists, so re-runs and backfill don't stomp live data.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Add `fifteenMinBaseUrls` to constants.js

**Files:**
- Modify: `js/constants.js` — in the `STAKTRAKR` provider block (~line 21)

**Context:**
`STAKTRAKR.hourlyBaseUrls` is an array of base URLs (supports multiple endpoints for racing). Add a parallel `fifteenMinBaseUrls` using the same `api.staktrakr.com` and `api1.staktrakr.com` pattern.

**Step 1: Find the current hourlyBaseUrls definition**

```bash
grep -n "hourlyBaseUrl\|fifteenMin" /Volumes/DATA/GitHub/StakTrakr/js/constants.js | head -10
```

**Step 2: Add `fifteenMinBaseUrls` immediately after `hourlyBaseUrls`**

Current block (approximate):
```javascript
    hourlyBaseUrl: "https://api.staktrakr.com/data/hourly",
    hourlyBaseUrls: [
      "https://api.staktrakr.com/data/hourly",
      ...
    ],
```

Add after the closing `],` of `hourlyBaseUrls`:
```javascript
    fifteenMinBaseUrls: [
      "https://api.staktrakr.com/data/15min",
      "https://api1.staktrakr.com/data/15min",
    ],
```

**Step 3: Verify**

```bash
grep -n "fifteenMinBaseUrls" /Volumes/DATA/GitHub/StakTrakr/js/constants.js
```
Expected: one match on the line you just added.

---

### Task 5: Add `fetchStaktrakr15minRange()` to api.js

**Files:**
- Modify: `js/api.js` — add after `fetchStaktrakrHourlyRange()` closes (~line 141)

**Context:**
This is a near-copy of `fetchStaktrakrHourlyRange()` (lines 68–140). Key differences:
- Steps through 15-min intervals (96 per day) instead of 1-hour intervals
- Path is `/${yyyy}/${mm}/${dd}/${hh}${nn}.json` (HHMM, no separator)
- Timestamp written as `YYYY-MM-DD HH:MM:00` (actual minute, not `:00:00`)
- Default lookback is 96 slots (24 hours × 4 polls/hour)

**Step 1: Add the function after `fetchStaktrakrHourlyRange`**

```javascript
/**
 * Fetches 15-min spot snapshots from StakTrakr for a configurable number of slots.
 * Each slot = 15 minutes. Default 96 slots = 24 hours.
 * Skips slots already present in spotHistory to avoid duplicates.
 * @param {number} slotsBack - Number of 15-min slots to look back (default 96 = 24h)
 * @returns {Promise<{newCount: number, fetchCount: number}>}
 */
const fetchStaktrakr15minRange = async (slotsBack = 96) => {
  const baseUrls = API_PROVIDERS.STAKTRAKR.fifteenMinBaseUrls;
  if (!baseUrls || baseUrls.length === 0) return { newCount: 0, fetchCount: 0 };

  const now = new Date();
  // Round down to nearest 15-min boundary
  const slotMs = 15 * 60 * 1000;
  const currentSlot = new Date(Math.floor(now.getTime() / slotMs) * slotMs);

  const slots = [];
  for (let i = 0; i < slotsBack; i++) {
    slots.push(new Date(currentSlot.getTime() - i * slotMs));
  }

  purgeSpotHistory();
  const existingKeys = new Set(
    spotHistory.map(e => `${e.timestamp}|${e.metal}`)
  );

  let newCount = 0;
  let fetchCount = 0;
  const batchSize = 6;
  const providerName = API_PROVIDERS.STAKTRAKR.name;

  for (let i = 0; i < slots.length; i += batchSize) {
    const batch = slots.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(async (slot) => {
      const yyyy = String(slot.getUTCFullYear());
      const mm   = String(slot.getUTCMonth() + 1).padStart(2, '0');
      const dd   = String(slot.getUTCDate()).padStart(2, '0');
      const hh   = String(slot.getUTCHours()).padStart(2, '0');
      const nn   = String(slot.getUTCMinutes()).padStart(2, '0');
      const path = `/${yyyy}/${mm}/${dd}/${hh}${nn}.json`;
      try {
        const data = await Promise.any(
          baseUrls.map(async (base) => {
            const resp = await fetch(`${base}${path}`, { mode: 'cors' });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return resp.json();
          })
        );
        const { current } = API_PROVIDERS.STAKTRAKR.parseBatchResponse(data);
        return { current, timestamp: `${yyyy}-${mm}-${dd}T${hh}:${nn}:00Z` };
      } catch { return null; }
    }));

    results.forEach(result => {
      if (!result) return;
      fetchCount++;
      Object.entries(result.current).forEach(([metalKey, spot]) => {
        if (spot <= 0) return;
        const metalConfig = Object.values(METALS).find(m => m.key === metalKey);
        if (!metalConfig) return;
        const entryTimestamp = result.timestamp.replace('T', ' ').replace('Z', '');
        const isDuplicate = existingKeys.has(`${entryTimestamp}|${metalConfig.name}`);
        if (!isDuplicate) {
          spotHistory.push({
            spot, metal: metalConfig.name, source: 'api-15min',
            provider: providerName, timestamp: entryTimestamp,
          });
          existingKeys.add(`${entryTimestamp}|${metalConfig.name}`);
          newCount++;
        }
      });
    });
  }

  if (newCount > 0) saveSpotHistory();
  return { newCount, fetchCount };
};
```

**Step 2: Verify no syntax errors**

Open `index.html` in browser (local HTTP server) and check browser console for JS errors. Or:
```bash
node --input-type=module < /dev/null 2>&1 || \
  grep -c "fetchStaktrakr15minRange" /Volumes/DATA/GitHub/StakTrakr/js/api.js
```
Expected: `1` (function defined once)

---

### Task 6: Commit frontend changes

```bash
git add js/constants.js js/api.js
git commit -m "feat: add fetchStaktrakr15minRange() for sub-hourly spot data

- constants.js: fifteenMinBaseUrls pointing to data/15min/ tree
- api.js: fetchStaktrakr15minRange(slotsBack=96) mirrors fetchStaktrakrHourlyRange
  but walks 15-min slots; source tagged 'api-15min' for provenance

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Update docs + skill files

**Files:**
- Modify: `docs/devops/api-infrastructure-runbook.md` — add 15min feed section after spot section
- Modify: `.claude/skills/api-infrastructure/SKILL.md` — add row to feed table
- Modify: `CLAUDE.md` — add row to feed table

**Runbook addition** (add after the spot prices section):

```markdown
## Feed 4: 15-Minute Spot Snapshots (`data/15min/`)

**Path:** `data/15min/YYYY/MM/DD/HHMM.json` (e.g. `0705.json`, `0720.json`)
**Poller:** `spot-poller.yml` GHA (`:05`, `:20`, `:35`, `:50` every hour)
**Threshold:** N/A — files are immutable per-poll snapshots, not a live feed

Each GHA spot-poller run writes one immutable file alongside the hourly overwrite.
Files are never overwritten — skipped if already exists.
Used by: `fetchStaktrakr15minRange()` in `js/api.js` for sub-hourly chart data.
```

**SKILL.md + CLAUDE.md feed table** — add this row:
```
| **15-min spot** | `data/15min/YYYY/MM/DD/HHMM.json` | `spot-poller.yml` (same runs) | immutable snapshots |
```

---

### Task 8: Commit docs

```bash
git add docs/devops/api-infrastructure-runbook.md \
        .claude/skills/api-infrastructure/SKILL.md \
        CLAUDE.md
git commit -m "docs: document data/15min/ endpoint + update feed tables

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 9: Verify live 15-min files appear (Human)

After `dev` is pushed (happens in prior commits), trigger a manual GHA run:

```bash
gh workflow run "spot-poller.yml" --repo lbruton/StakTrakr
```

Wait ~2 minutes, then verify the file exists on `api.staktrakr.com`:

```bash
python3 -c "
import urllib.request, json
from datetime import datetime, timezone
now = datetime.now(timezone.utc)
hh = f'{now.hour:02d}'
nn = f'{now.minute - (now.minute % 15):02d}'
url = f'https://api.staktrakr.com/data/15min/{now.year}/{now.month:02d}/{now.day:02d}/{hh}{nn}.json'
print(f'Checking: {url}')
with urllib.request.urlopen(url, timeout=10) as r:
    d = json.load(r)
    print(f'OK — {len(d)} entries')
    print(d[0])
"
```
Expected: `OK — 4 entries` with Gold/Silver/Platinum/Palladium entries.

---

## Auto-Quiz

1. **NEXT task:** T1 — `save_15min_file()` in `update-seed-data.py`
2. **Validation for NEXT:** `python3 -m py_compile update-seed-data.py && python3 -c "...check save_15min_file in dir(m)..."` → output `True`
3. **Commit template for NEXT:** included in T3 above
4. **Breakpoint:** Pause after T3 (poller committed) to confirm `dev` is pushed and the next scheduled GHA run writes a 15-min file before proceeding to T4–T6

---

## Notes

- The `parseBatchResponse` in `constants.js` expects the same 4-entry array format the hourly files use — no changes needed there
- `source: 'api-15min'` distinguishes 15-min entries from `'api-hourly'` in `spotHistory` for any future filtering
- The 15-min tree will generate ~96 tiny files/day (~4 metals × 4 polls/hr × 24 hrs) — manageable for GitHub Pages static hosting
- Backfill of historical 15-min data is explicitly out of scope — files only exist from the moment this ships forward

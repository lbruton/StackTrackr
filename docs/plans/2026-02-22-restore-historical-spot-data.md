# Restore Historical Spot Data Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Restore Historical Data" button to the API settings panel that fetches all available spot-history-YYYY.json files from both local seed files and the live API, merges them into spotHistory (dedup by date+metal, live data always wins), and re-renders sparklines.

**Architecture:** A single async function `restoreHistoricalSpotData()` in `js/api.js` fetches year files sequentially from local (`data/`) and API (`api.staktrakr.com` + `api1.staktrakr.com`) sources, merges into the existing `spotHistory` array using Set-based dedup, then calls `saveSpotHistory()` and `updateAllSparklines()`. The button is wired in the existing `initSpotHistoryButtons()` function. No new storage keys, no new files.

**Tech Stack:** Vanilla JS, fetch API, `Promise.any()` for endpoint racing, Chart.js (via `updateAllSparklines()`), `saveDataSync`/`loadDataSync` storage wrappers.

**File Touch Map:**
| Action | File | Scope |
|--------|------|-------|
| MODIFY | `js/api.js` | Add `restoreHistoricalSpotData()` before `initSpotHistoryButtons()` (~line 2858); wire button in `initSpotHistoryButtons()` (~line 2862) |
| MODIFY | `index.html` | Add `<button id="restoreHistoricalDataBtn">` at line 4324 (after importSpotHistoryBtn) |

---

## Task Table

| ID | Step | Est (min) | Files/Modules | Validation | Risk/Notes | Recommended Agent |
|----|------|-----------|---------------|------------|------------|-------------------|
| T1 | Add the HTML button | 2 | `index.html:4324` | Button visible in API History modal footer | None | Claude |
| T2 | Implement `restoreHistoricalSpotData()` | 10 | `js/api.js:~2858` | Function exists, no console errors on load | Reuse seed-data.js dedup pattern exactly | Claude |
| T3 | Wire button in `initSpotHistoryButtons()` | 2 | `js/api.js:2862` | Clicking button calls the function | None | Claude |
| T4 | Manual smoke test | 5 | — | Sparklines repopulate after wipe+restore | Human checks browser | Human |
| T5 | Commit | 1 | — | `git log` shows commit | None | Claude |

---

### Task T1: Add HTML button ← NEXT

**Files:**
- Modify: `index.html:4323-4325`

The existing footer has Export and Import buttons. Add Restore alongside them.

**Current HTML (lines 4322-4326):**
```html
<div class="modal-footer api-history-footer">
  <button type="button" class="btn" id="exportSpotHistoryBtn">Export History</button>
  <button type="button" class="btn" id="importSpotHistoryBtn">Import History</button>
  <input type="file" id="importSpotHistoryFile" accept=".csv,.json" style="display:none">
</div>
```

**Step 1: Add the button after `importSpotHistoryBtn`**

Insert one line — the new button goes between `importSpotHistoryBtn` and the hidden file input:

```html
<div class="modal-footer api-history-footer">
  <button type="button" class="btn" id="exportSpotHistoryBtn">Export History</button>
  <button type="button" class="btn" id="importSpotHistoryBtn">Import History</button>
  <button type="button" class="btn btn-secondary" id="restoreHistoricalDataBtn">Restore Historical Data</button>
  <input type="file" id="importSpotHistoryFile" accept=".csv,.json" style="display:none">
</div>
```

**Step 2: Verify**

Open `index.html` in browser → Settings → API → click any provider → scroll to history modal footer. The "Restore Historical Data" button should appear. It won't do anything yet (no JS wired).

---

### Task T2: Implement `restoreHistoricalSpotData()`

**Files:**
- Modify: `js/api.js` — insert before `initSpotHistoryButtons()` at line ~2858

**Background:**
- `SEED_DATA_YEARS` — global array from `js/seed-data.js`: `[1968, 1969, ..., 2026]` (all years dynamically)
- `API_PROVIDERS.STAKTRAKR.baseUrl` = `"https://api.staktrakr.com/data"`
- `api1.staktrakr.com` = fallback (same path structure)
- Dedup key: `timestamp.slice(0, 10) + "|" + metal` — matches the pattern in `loadSeedSpotHistory()` (seed-data.js:1228)
- Button disable pattern: same as `js/api.js:175-203` — `try/finally`, store original text

**Step 1: Add the function**

Insert this block immediately before the `initSpotHistoryButtons` function declaration at ~line 2858:

```javascript
/**
 * Fetches all available spot-history-YYYY.json files from local seed files
 * and the live API, merges new entries into spotHistory (dedup by date+metal,
 * existing live data always wins), then re-renders sparklines.
 *
 * Safe to run multiple times — dedup prevents duplicates.
 */
const restoreHistoricalSpotData = async () => {
  const btn = document.getElementById("restoreHistoricalDataBtn");
  const origText = btn ? btn.textContent : "";
  if (btn) { btn.disabled = true; }

  try {
    loadSpotHistory();
    const existing = Array.isArray(spotHistory) ? spotHistory : [];

    // Build dedup Set from existing entries — these always win
    const existingKeys = new Set();
    for (const e of existing) {
      if (e && e.timestamp && e.metal) {
        existingKeys.add(e.timestamp.slice(0, 10) + "|" + e.metal);
      }
    }

    const allNew = [];
    const years = typeof SEED_DATA_YEARS !== "undefined" ? SEED_DATA_YEARS : [];
    let yearsWithData = 0;

    // --- Pass 1: Local seed files (lowest priority) ---
    for (const year of years) {
      try {
        const resp = await fetch(`data/spot-history-${year}.json`);
        if (!resp.ok) continue;
        const entries = await resp.json();
        if (!Array.isArray(entries)) continue;
        for (const e of entries) {
          if (!e || typeof e.spot !== "number" || !e.metal || !e.timestamp) continue;
          const key = e.timestamp.slice(0, 10) + "|" + e.metal;
          if (!existingKeys.has(key)) {
            allNew.push(e);
            existingKeys.add(key); // prevent API pass from double-adding same slot
          }
        }
      } catch (_) { /* network or parse error — skip year */ }
    }

    // --- Pass 2: API files (higher priority — overwrite seed slots for same date+metal) ---
    const apiBaseUrls = [
      `${API_PROVIDERS.STAKTRAKR.baseUrl}`,
      "https://api1.staktrakr.com/data",
    ];

    for (const year of years) {
      if (btn) btn.textContent = `Restoring... (${year})`;
      try {
        const entries = await Promise.any(
          apiBaseUrls.map(async (base) => {
            const resp = await fetch(`${base}/spot-history-${year}.json`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return resp.json();
          })
        );
        if (!Array.isArray(entries)) continue;
        let addedThisYear = false;
        for (const e of entries) {
          if (!e || typeof e.spot !== "number" || !e.metal || !e.timestamp) continue;
          const key = e.timestamp.slice(0, 10) + "|" + e.metal;
          if (!existingKeys.has(key)) {
            allNew.push(e);
            existingKeys.add(key);
            addedThisYear = true;
          }
        }
        if (addedThisYear) yearsWithData++;
      } catch (_) { /* all endpoints failed for this year — skip */ }
    }

    if (allNew.length === 0) {
      appAlert("Already up to date — no new entries found.");
      return;
    }

    // Merge, sort, save
    const merged = existing.concat(allNew);
    merged.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    spotHistory = merged;
    saveSpotHistory();

    if (typeof updateAllSparklines === "function") updateAllSparklines();

    appAlert(
      `Restored ${allNew.length.toLocaleString()} new entries` +
      (yearsWithData > 0 ? ` across ${yearsWithData} year${yearsWithData !== 1 ? "s" : ""} from API.` : " from local seed files.")
    );

  } catch (err) {
    console.error("Restore historical data failed:", err);
    appAlert("Restore failed: " + err.message);
  } finally {
    if (btn) { btn.textContent = origText; btn.disabled = false; }
  }
};
```

**Step 2: Verify no syntax errors**

Run:
```bash
node --input-type=module < /dev/null; npx --yes acorn --ecma2020 --module js/api.js > /dev/null && echo "OK"
```
Expected: `OK` (or any output without "SyntaxError")

Alternatively just open the app in a browser and check the console for errors on load.

---

### Task T3: Wire button in `initSpotHistoryButtons()`

**Files:**
- Modify: `js/api.js` — inside `initSpotHistoryButtons()` at ~line 2862

**Current `initSpotHistoryButtons()` (lines 2862-2877):**
```javascript
const initSpotHistoryButtons = () => {
  const exportBtn = document.getElementById("exportSpotHistoryBtn");
  if (exportBtn) exportBtn.addEventListener("click", exportSpotHistory);

  const importBtn = document.getElementById("importSpotHistoryBtn");
  const importFile = document.getElementById("importSpotHistoryFile");
  if (importBtn && importFile) {
    importBtn.addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        importSpotHistory(e.target.files[0]);
        e.target.value = "";
      }
    });
  }
};
```

**Step 1: Add restore button wiring**

Add three lines after the export button block:

```javascript
const initSpotHistoryButtons = () => {
  const exportBtn = document.getElementById("exportSpotHistoryBtn");
  if (exportBtn) exportBtn.addEventListener("click", exportSpotHistory);

  const restoreBtn = document.getElementById("restoreHistoricalDataBtn");
  if (restoreBtn) restoreBtn.addEventListener("click", restoreHistoricalSpotData);

  const importBtn = document.getElementById("importSpotHistoryBtn");
  const importFile = document.getElementById("importSpotHistoryFile");
  if (importBtn && importFile) {
    importBtn.addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        importSpotHistory(e.target.files[0]);
        e.target.value = "";
      }
    });
  }
};
```

Also add the window export below (after the existing `window.initSpotHistoryButtons` line):
```javascript
window.restoreHistoricalSpotData = restoreHistoricalSpotData;
```

**Step 2: Verify wiring**

Open app → Settings → API → open history modal → click "Restore Historical Data". Button should disable, show "Restoring... (YYYY)" for each year, then show an alert with count. No console errors.

---

### Task T4: Manual smoke test (Human)

**Step 1: Wipe spot history**

Settings → Storage → "Boating Accident" to wipe all data, or open DevTools → Application → Local Storage → delete `metalSpotHistory` key.

**Step 2: Verify sparklines are empty**

Reload page. Sparklines should show no data. 5Y/10Y filter chips should be absent or show 0.

**Step 3: Run restore**

Settings → API → open any provider's history → click "Restore Historical Data". Observe:
- Button disables and shows year labels scrolling
- `appAlert` appears with entry count > 0

**Step 4: Verify sparklines repopulate**

After modal closes: sparklines should show full lifetime history. 5Y/10Y chips should appear.

**Step 5: Run restore again**

Click "Restore Historical Data" again. Should show "Already up to date — no new entries found."

---

### Task T5: Commit

```bash
git add js/api.js index.html
git commit -m "feat(api): add Restore Historical Data button (STAK-258)

Fetches spot-history-YYYY.json from local seed files and both API
endpoints (api.staktrakr.com + api1.staktrakr.com) for all years
since 1968. Merges new entries into spotHistory with Set-based
date|metal dedup — existing live data always wins. Re-renders
sparklines on completion. Safe to run repeatedly.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Auto-Quiz

1. **NEXT task:** T1 — Add HTML button
2. **Validation for T1:** Open app in browser → Settings → API → history modal footer shows "Restore Historical Data" button
3. **Commit message for T1:** Included in T5 (single commit covers all changes)
4. **Breakpoint:** Pause after T3 for human to run T4 (manual browser smoke test) before committing

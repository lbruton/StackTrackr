# Design: Restore Historical Spot Data (STAK-258)

**Date:** 2026-02-22
**Status:** Approved — ready for implementation
**Linear:** STAK-258

## Context

When spot price history is lost from localStorage (browser wipe, branch switch, accidental clear), users lose lifetime sparkline charts and the 5Y/10Y filter chips disappear. This adds a one-click restore path that merges data from both the bundled seed files and the live API.

## Impact Report — Files Affected

- `js/api.js:2183` — `populateApiSection()` / `initSpotHistoryButtons()` — button wired here
- `js/api.js:175-203` — existing "Pull history" button disable/restore pattern to follow
- `js/spot.js:9-29` — `saveSpotHistory()` / `loadSpotHistory()` — storage primitives
- `js/spot.js:912` — `updateAllSparklines()` — call after merge to re-render
- `js/seed-data.js:1155-1245` — `loadSeedSpotHistory()` — merge/dedup algorithm to replicate
- `js/constants.js:16-41` — `API_PROVIDERS.STAKTRAKR` — endpoint config to reuse
- `index.html:4323-4325` — existing export/import button HTML — new button goes here

## Architecture

### Function: `restoreHistoricalSpotData()` in `js/api.js`

Single async function, repeatable (safe to run multiple times — dedup prevents duplicates).

**Steps:**
1. Disable button, update label to `"Restoring... (YYYY)"`
2. Load existing `spotHistory` from localStorage — build a Set of `"YYYY-MM-DD|metal"` keys for all non-seed entries (these win over everything)
3. Fetch local seed files: `data/spot-history-YYYY.json` for all years in `SEED_DATA_YEARS` — collect new entries not in the existing Set
4. Fetch API files: `${API_PROVIDERS.STAKTRAKR.baseUrl}/spot-history-YYYY.json` for each year, racing both API endpoints via `Promise.any([api, api1])`, skip 404s — API entries win over local seed entries for same date+metal
5. Merge all new entries into `spotHistory`, sort chronologically
6. `saveSpotHistory()`
7. `updateAllSparklines()`
8. Re-enable button, restore label
9. `appAlert("Restored X new entries across Y years.")` or `"Already up to date."` if 0 new

### Data Priority (highest → lowest)
1. Existing live `spotHistory` entries (already in localStorage, `source !== 'seed'`)
2. API-fetched year file entries
3. Local seed file entries (`source: 'seed'`)

### Dedup Key
`timestamp.slice(0, 10) + "|" + metal.toLowerCase()`
Same key format used in `loadSeedSpotHistory()` — consistent across the codebase.

### Data Flow

```
[data/spot-history-YYYY.json (local)]    ──┐
                                            ├──→ merge + dedup ──→ saveSpotHistory() ──→ updateAllSparklines()
[api.staktrakr.com/data/spot-history-YYYY] ─┤   (existing localStorage entries always win)
[api1.staktrakr.com/data/... fallback]   ──┘
```

## UI

Button added alongside existing Export/Import buttons in API Settings → History section:

```html
<button class="btn btn-secondary" id="restoreHistoricalDataBtn">
  Restore Historical Data
</button>
```

**States:**
- Default: `"Restore Historical Data"`, enabled
- During fetch: `"Restoring... (2024)"` (current year shown), disabled
- On complete: button restored; `appAlert("Restored 1,432 new entries across 12 years.")`
- On zero new: `appAlert("Already up to date — no new entries found.")`
- On error: `appAlert("Restore failed: [message]")` — button re-enabled via `finally`

**`file://` users:** Button enabled — local seed files still load. API fetch fails gracefully (skip on network error, same as 404 handling).

## Files Changed

| File | Change |
|---|---|
| `js/api.js` | Add `restoreHistoricalSpotData()` async function; wire button in `initSpotHistoryButtons()` |
| `index.html` | Add `<button id="restoreHistoricalDataBtn">` alongside export/import buttons (line ~4323) |

**No changes to:** `js/seed-data.js`, `js/spot.js`, `js/constants.js`, `js/settings.js`

**`sw.js`:** Auto-stamped by pre-commit hook — no manual change needed.

## Patterns to Reuse

- **Button disable pattern:** `js/api.js:175-203` — `try/finally`, store original text
- **Endpoint racing:** `Promise.any(baseUrls.map(url => fetch(...)))` — `js/api.js`
- **Dedup Set:** `js/seed-data.js:1196-1245` — `"date|metal"` key format
- **Storage:** `saveDataSync()` / `loadDataSync()` — never raw `localStorage`
- **Alert:** `appAlert(msg)` — existing user-facing message utility

## Verification

1. Start browserless + HTTP server
2. Clear spot history via Settings → Storage → "Boating Accident"
3. Verify sparklines show no data / 5Y chip missing
4. Click "Restore Historical Data" in Settings → API
5. Observe button disables and shows year progress
6. On completion, verify: sparklines repopulate, 5Y/10Y chips appear, `appAlert` shows count
7. Run smoke test: `BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npm test`
8. Verify running restore twice gives "Already up to date" (dedup working)

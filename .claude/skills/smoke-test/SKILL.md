---
name: smoke-test
description: Automated smoke test runner for StakTrakr — starts a local HTTP server, runs Playwright specs via self-hosted browserless Docker, collects results, then files Linear bug issues for new findings and creates a run-record issue.
allowed-tools: Bash, mcp__claude_ai_Linear__create_issue, mcp__claude_ai_Linear__update_issue
---

# Smoke Test — StakTrakr

> **Test suite architecture:** `tests/runbook/` via the `/bb-test` skill is the **primary NL E2E suite** (Stagehand/Browserbase, runs against PR preview URLs). This `/smoke-test` skill covers the **complementary scripted suite** — `tests/*.spec.js` via self-hosted browserless Docker.

Automated QA smoke test running Playwright specs via self-hosted **browserless** Docker against the local app. No Browserbase, no cloud credits. The browser runs inside Docker and connects to the app at `host.docker.internal:8765` (which resolves to the host machine from inside the container).

**Spec inventory:** `tests/*.spec.js` — 19 files, 123 tests, 5 skipped.

| Spec | Tests | Skipped | Coverage |
|---|---|---|---|
| `api-integrations.spec.js` | 14 | 4 | API endpoint validation, sync status, retail endpoints (4 skipped — need API keys) |
| `backup-restore.spec.js` | 6 | 0 | CSV export, JSON round-trip, vault AES encrypt/decrypt |
| `calculations.spec.js` | 2 | 0 | Melt value math (injects spot price), gram→oz conversion |
| `cloud-sync.spec.js` | 5 | 0 | Dropbox: connected state, backup upload, restore list, disconnect, auto-sync toggle (mocked API) |
| `connection.spec.js` | 1 | 0 | browserless connection + page load (@smoke tagged) |
| `crud.spec.js` | 3 | 0 | Add/Edit/Delete item (custom `#appDialogModal` wipe in beforeEach) |
| `diff-merge.spec.js` | 12 | 0 | Diff/merge conflict resolution, field-level comparisons |
| `disposition.spec.js` | 7 | 0 | Item disposition tracking (sold, gifted, lost, etc.) |
| `fuzzy-search.spec.js` | 14 | 0 | Fuzzy search matching, ranking, edge cases |
| `hello-kitty.spec.js` | 1 | 0 | Sepia easter egg theme |
| `image-storage-stress.spec.js` | 24 | 0 | Image cache stress tests, storage limits, cleanup |
| `import-export.spec.js` | 4 | 0 | JSON/CSV import/export round-trips |
| `live-demo.spec.js` | 1 | 0 | Load + hover spot cards + About modal |
| `market-toggle.spec.js` | 6 | 0 | Market header buttons, toggle visibility, responsive grid |
| `numista-e2e.spec.js` | 2 | 1 | Numista integration end-to-end (1 skipped — API key) |
| `numista-regression.spec.js` | 3 | 0 | Numista regression tests |
| `retail-view-modal.spec.js` | 4 | 0 | Retail view modal display, pricing, interactions |
| `smoke.spec.js` | 4 | 0 | Page load, About/Settings/Add Item modals |
| `ui-checks.spec.js` | 10 | 0 | Spot prices, summary cards, seed count, filter chips, search, card views, activity log |

## Arguments

`$ARGUMENTS` can be:
- *(blank)* — full spec suite (`npm test`)
- `dry-run` — run all checks, no Linear issues
- `smoke` — smoke-tagged specs only (`npm run test:smoke`)

---

## Phase 0: Setup

### Step 1: Start HTTP server (if needed)

Check if the app is already being served:
```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8765/index.html
```

If not `200`, start one from the project root:
```bash
npx http-server . -p 8765 --silent &
sleep 1
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8765/index.html
```

If still not `200`, abort with:
> "HTTP server failed to start on port 8765."

Record `BASE_URL = http://host.docker.internal:8765`

### Step 2: Verify browserless is running

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
```

browserless v2 returns **404** at the root path — that is normal and healthy. Only abort if the connection is refused entirely (curl exits with non-zero or returns `000`). If you get `200` or `404`, browserless is running.

If connection refused:
> "browserless is not running. Start it with:
> `cd devops/browserless && docker compose up -d`
> Then wait ~5 seconds and retry."

Abort if browserless cannot be reached.

### Step 3: Record run metadata

Note:
- Today's date (YYYY-MM-DD) and start time
- `BASE_URL`
- Arguments used

---

## Phase 1: Run Playwright Tests

Run the appropriate test command based on arguments:

**Full suite (default):**
```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npm test
```

**Smoke-tagged only:**
```bash
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npm run test:smoke
```

Capture the full stdout/stderr output. Playwright will report:
- Number of tests run / passed / failed / skipped
- Test names and durations
- Failure details with error messages and line references

Classify results:
- All passed → `✅ PASS`
- Any skipped, no failures → `✅ PASS WITH WARNINGS`
- Any failures → `❌ FAIL`

---

## Video Recording & Dashboard

Test runs capture video and screenshots automatically (configured in `playwright.config.js`).
Output lands in `test-results/<ISO-timestamp>/` — override with `TEST_RUN_ID` env var.
Ad-hoc screenshots go to `devops/screenshots/`.

**Start the dashboard:**

```bash
npm run dash   # http://localhost:8766
```

Auto-refresh polls `/api/files` every 3 seconds while tests run. Use the "Capture Now"
button for an instant full-page screenshot of `TEST_URL` (defaults to `http://localhost:8765`).

**When asking the user for visual clarification during a test run:**

1. Click "Capture Now" in the dashboard (or run `npx playwright screenshot <url> devops/screenshots/<name>.png --browser=chromium --full-page`)
2. Tell the user: `"Check the Playwright Dashboard and refresh — screenshot at [name]"`

---

## Phase 2: Results Summary

Print a results table:

```
Results
=======
| Spec                         | Tests | Status       | Notes |
|------------------------------|-------|--------------|-------|
| api-integrations.spec.js     | 14    | ⏭️/⚠️/❌   | 4 skipped (API keys); KF-001, KF-002 may appear |
| backup-restore.spec.js       | 6     | ✅/⚠️/❌    | KF-007 if vault times out |
| calculations.spec.js         | 2     | ✅/⚠️/❌    | ... |
| cloud-sync.spec.js           | 5     | ✅/⚠️/❌    | ... |
| connection.spec.js           | 1     | ✅/⚠️/❌    | ... |
| crud.spec.js                 | 3     | ✅/⚠️/❌    | ... |
| diff-merge.spec.js           | 12    | ✅/⚠️/❌    | ... |
| disposition.spec.js          | 7     | ✅/⚠️/❌    | ... |
| fuzzy-search.spec.js         | 14    | ✅/⚠️/❌    | ... |
| hello-kitty.spec.js          | 1     | ✅/⚠️/❌    | ... |
| image-storage-stress.spec.js | 24    | ✅/⚠️/❌    | ... |
| import-export.spec.js        | 4     | ✅/⚠️/❌    | KF-006 against HTTPS URLs |
| live-demo.spec.js            | 1     | ✅/⚠️/❌    | KF-003 if timing failure |
| market-toggle.spec.js        | 6     | ✅/⚠️/❌    | KF-004, KF-005 if broken |
| numista-e2e.spec.js          | 2     | ⏭️/⚠️/❌   | 1 skipped (API key) |
| numista-regression.spec.js   | 3     | ✅/⚠️/❌    | ... |
| retail-view-modal.spec.js    | 4     | ✅/⚠️/❌    | ... |
| smoke.spec.js                | 4     | ✅/⚠️/❌    | ... |
| ui-checks.spec.js            | 10    | ✅/⚠️/❌    | ... |

Overall: ✅ PASS / ✅ PASS WITH WARNINGS / ❌ FAIL
```

---

## Phase 3: Known Bugs Registry

Before filing any issues, check each failure against the known active bugs.
**Full registry with root-cause notes:** `docs/tests/known-failures.md`

**Do NOT file a new Linear issue for a known active bug.** Reference it in the run record only.
After triaging a new failure, add it to `docs/tests/known-failures.md` AND the table below.

### Currently Known Active Issues

| ID | Spec | Test | Status | Root Cause |
|----|------|------|--------|------------|
| KF-001 | `api-integrations.spec.js` | `STAK-255: hourlyBaseUrls and RETAIL_API_ENDPOINTS use correct paths` | ⚠️ Flaky | Asserts exact URL structure; breaks when API constants reorganised |
| KF-002 | `api-integrations.spec.js` | `STAK-215: syncStatus shows save-failure message...` | ⚠️ Flaky | Forces localStorage quota error — not reproducible on Cloudflare Pages |
| KF-003 | `live-demo.spec.js` | `live demo — load, hover spot cards, open About` | ⚠️ Flaky | No hard assertions — pure timing; ack modal timing differs HTTPS vs local |
| KF-004 | `market-toggle.spec.js` | `Test 1: New user sees all 5 header buttons by default` | 🔴 Broken | `#headerMarketBtn` not visible on fresh load — selector or render order changed |
| KF-005 | `market-toggle.spec.js` | `Test 4: Responsive grid layout (3-col → 2-col → 1-col)` | 🔴 Broken | Mobile col count assertion fragile with browserless viewport sizing |
| KF-006 | `import-export.spec.js` | `JSON round-trip preserves serialNumber` | ⚠️ Flaky | `waitForEvent('download')` unreliable against HTTPS — passes on local HTTP |
| KF-007 | `backup-restore.spec.js` | `Vault encrypted backup flow` | ⚠️ Flaky | Timeout — vault crypto + seed inventory size; intermittent in Docker |

### Resolved Bugs (do not re-file)

| ID | Description | Resolved In |
|----|-------------|-------------|
| BUG-001 | Search returns 0 results intermittently | Fixed in dev |
| BUG-002 | Autocomplete ghost text persists after modal close | Fixed in dev |
| BUG-006 | Delete executed immediately with no confirmation dialog | v3.31.5 |
| STAK-229 | Vault backup test timeout (seed inventory too large for Docker) | Fixed — wipe + `test.setTimeout(120_000)` |
| STAK-206 | Card view items-per-page constraint never applied | Fixed in dev |

If a failure matches a known issue → mark "known — skipping Linear issue".
If a failure is **new** → file a Linear issue in Phase 4, add to `docs/tests/known-failures.md`.

---

## Phase 4: File Linear Issues (new findings only)

**Skip entirely if `dry-run` mode.** Instead, print what WOULD be filed.

For each **new** failure:

Call `mcp__claude_ai_Linear__create_issue`:
- **team:** `f876864d-ff80-4231-ae6c-a8e5cb69aca4`
- **title:** `BUG: [Test Name] — [brief description]`
- **priority:** `2` (High) for ❌ fail · `3` (Normal) for ⚠️ warn
- **labels:** `["Bug", "268350a3-f7e5-467c-b793-4924a40b922a"]` (Bug + Sonnet)
- **description:**

```markdown
## Bug Report — Smoke Test Run [DATE]

**Test:** [Test Name]
**Status:** ❌ Fail / ⚠️ Warn
**Environment:** http://host.docker.internal:8765; seed inventory
**Backend:** browserless Docker (local)

## Observed Behavior

[Playwright error output — include error message and line reference]

## Expected Behavior

[What should have happened]

## Reproduction Steps

1. Start browserless: `cd devops/browserless && docker compose up -d`
2. Start HTTP server: `npx http-server . -p 8765 --silent &`
3. Run: `BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npm test`

---
_Surfaced during smoke test run on [DATE] via /smoke-test skill (Playwright + browserless)._
```

---

## Phase 5: Create Run Record Issue

**Skip if `dry-run` mode.**

Call `mcp__claude_ai_Linear__create_issue`:

- **team:** `f876864d-ff80-4231-ae6c-a8e5cb69aca4`
- **title:** `QA: Smoke Test Run — [DATE formatted as "Feb 20, 2026"] [EMOJI] [RESULT]`
- **priority:** `4` (Low)
- **labels:** `["645a4bb1-0c34-477f-a8a6-14b75762178e", "268350a3-f7e5-467c-b793-4924a40b922a"]` (Improvement + Sonnet)
- **description:**

```markdown
## Smoke Test Run — [DATE]

**Overall Result:** [OVERALL_RESULT]
**Run Method:** /smoke-test skill via Claude Code (Playwright + browserless Docker)
**Environment:** http://host.docker.internal:8765; seed inventory ([N] items)
**Backend:** browserless self-hosted Docker (local)
**Arguments:** [ARGUMENTS or "full suite"]

---

## Results

| Test Name | Status | Notes |
|---|---|---|
[results table rows]

---

## New Issues Filed

[List new Linear issues, or "None — all findings matched known active bugs"]

## Known Issues Observed (not re-filed)

[List known bugs triggered this run]

## Known Issues Not Triggered

[List known bugs that did NOT appear this run]

---

_Logged by Claude via /smoke-test skill. Running Playwright specs against local browserless Docker._
_Full 13-check coverage pending STAK-210._
```

After creating the run record issue, call `mcp__claude_ai_Linear__update_issue` to set status to **Done**.

---

## Phase 6: Confirm

```
Smoke test complete!
====================
Environment: http://host.docker.internal:8765 (local)
Backend: browserless Docker

Run Record: STAK-XXX → Done
  [url]

New bugs filed:
  STAK-XXX — [title]  (or "None")

Known bugs observed (not re-filed):
  BUG-001 — search intermittent  (or "None")
```

---

## Dry Run Mode

If `dry-run`:
- Run all Playwright specs normally
- Print the results table
- Show what Linear issues WOULD be created (title, priority, description preview)
- Do NOT call any Linear MCP tools
- End with: `Dry run complete — no Linear issues created.`

---

## Maintaining the Known Bugs Registry

When a bug is resolved and shipped, move it from Known Active Bugs to the Resolved table above. This ensures future runs correctly flag regressions rather than silently skipping them.

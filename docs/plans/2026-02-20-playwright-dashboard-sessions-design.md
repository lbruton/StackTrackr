# Playwright Dashboard Sessions & Report Generator — Design

**Approved:** 2026-02-20

## Goal

Auto-generate a per-run `report.html` after every `npm test`, and expose a Sessions tab
in the dashboard to browse and open historical reports.

## Components

### 1. report-generator.js (new, Playwright globalTeardown)

- Path: `devops/playwright-dash/report-generator.js`
- Playwright invokes it automatically after every test run
- Receives `config.outputDir` (the timestamped run folder)
- Reads `results.json` (JSON reporter) for per-test pass/fail + duration
- Walks `outputDir` subdirectories to find `video.webm` and `screenshot.png` per test
- Generates `report.html` inside `outputDir` using relative paths
- Report is self-contained: dark-themed, works from `file://` AND via `/files/*` route

### 2. playwright.config.js (edit)

- Add `globalTeardown: './devops/playwright-dash/report-generator.js'`
- Add JSON reporter: `['json', { outputFile: 'results.json' }]` alongside existing reporter

### 3. server.js (edit — one new route)

- `GET /api/sessions` — scans `test-results/` subdirs for `report.html`
- Returns: `[{ id, reportUrl, mtime, total, passed, failed }]`
- Reads `results.json` from each run dir for counts; falls back to dir count if missing

### 4. index.html (edit — Sessions tab)

- Third tab pill: "Sessions"
- Fetches `/api/sessions`, renders session cards
- Card: formatted timestamp, test counts, pass/fail badges, "Open Report" button
- "Open Report" → `window.open(reportUrl)` in new tab

## Report HTML Structure

- Self-contained single file, no external deps, dark theme matching dashboard
- Header: run date, total/passed/failed counts
- One card per test: name (cleaned from dir name), ✅/❌ badge, duration,
  screenshot `<img>` (click to enlarge), `<video controls>` with speed controls
  (0.1× 0.2× 0.5× 1× 2× 5× 10×)
- Relative asset paths: `./chromium-Test-Name-hash/video.webm`

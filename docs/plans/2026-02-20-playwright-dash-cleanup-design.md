# Playwright Dashboard — Cleanup & Purge Design

**Approved:** 2026-02-20

## Goal

Prevent unbounded growth of `test-results/` and `devops/screenshots/` by adding
automatic 7-day retention enforcement and manual delete controls to the dashboard.

## Context

The dashboard server runs on the host machine (port 8766, `node devops/playwright-dash/server.js`).
Docker/browserless only provides the Chromium endpoint — it never touches the filesystem.
After ~44 runs the test-results directory was already 106 MB; this grows linearly with
every `npm test` invocation.

---

## Components

### 1. Auto-prune in report-generator.js (edit)

After generating `report.html`, call `pruneOld()` which:

- Scans `test-results/` subdirectories whose names match `YYYY-MM-DD-HH-MM-SS`
- Parses the date from the directory name (no `stat` needed)
- `rm -rf` any dir older than 7 days
- Scans `devops/screenshots/` and unlinks any file whose `mtime` is older than 7 days
- Logs count and bytes freed to stdout

Retention period configurable via `DASH_RETAIN_DAYS` env var (default: 7).

### 2. New DELETE routes in server.js (edit)

| Method | Route | Body | Action |
|--------|-------|------|--------|
| `DELETE` | `/api/sessions/:id` | — | `rm -rf test-results/{id}` |
| `DELETE` | `/api/files` | `{ path: "/files/screenshots/foo.png" }` | unlink single file |
| `DELETE` | `/api/all` | — | delete all sessions + all screenshots |

Path validation: `resolveFilePath()` already constrains paths to the two allowed
directories — reuse it for the file delete route to prevent path traversal.

Session ID validation: must match `/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/` before
`rm -rf` is called.

### 3. UI changes in index.html (edit)

**Sessions tab — per-card delete button**

- Trash icon button on the right of each session card (next to "Open Report")
- `DELETE /api/sessions/:id` on click → re-fetches session list → shows toast

**Screenshots/Videos tabs — per-card delete button**

- Small `×` button absolutely positioned top-right of each card, visible on hover
- `DELETE /api/files` with the card's path on click → re-fetches file list → shows toast

**Toolbar — "Delete All" button**

- Danger-outlined pill button in the toolbar, visible on all tabs
- Clicking opens an inline confirmation modal (no external deps):
  - Shows total session count + screenshot count
  - Text input requiring the user to type `DELETE` exactly
  - Confirm button disabled until input matches; calls `DELETE /api/all`
  - On success: clears both `lastFilesKey` and `lastSessionsKey`, re-fetches all, shows toast

---

## Error Handling

- `DELETE /api/sessions/:id` — 400 if ID fails regex, 404 if dir not found, 500 on fs error
- `DELETE /api/files` — 400 if path resolves to null, 404 if file not found
- `DELETE /api/all` — always 200 (best-effort; logs individual failures to stderr)
- UI toasts on any non-2xx response

---

## What This Does Not Cover

- No server-startup prune (globalTeardown fires after every run — sufficient)
- No configurable retention UI (env var is enough for a dev tool)
- Screenshots are pruned by `mtime`, not filename date (no date in capture filenames)

---
title: Service Worker
category: frontend
owner: staktrakr
lastUpdated: v3.33.19
date: 2026-03-01
sourceFiles:
  - sw.js
  - devops/hooks/stamp-sw-cache.sh
relatedPages:
  - frontend-overview.md
  - release-workflow.md
---
# Service Worker

> **Last updated:** v3.33.19 — 2026-03-01
> **Source files:** `sw.js`, `devops/hooks/stamp-sw-cache.sh`

## Overview

StakTrakr uses a vanilla Service Worker (`sw.js`) to cache all application assets for offline use. On every version bump (patch or higher), the pre-commit hook auto-stamps a new `CACHE_NAME` into `sw.js`, forcing users' browsers to fetch a fresh copy of all assets. No manual edits to `CACHE_NAME` are ever required or permitted.

---

## Key Rules (read before touching this area)

1. **Never edit `CACHE_NAME` by hand.** It is written by the pre-commit hook on every commit that touches a cached asset. Manual edits are overwritten immediately.
2. **When adding a new JS file**, update **both** `index.html` (script tag, in load order) **and** `CORE_ASSETS` in `sw.js`. Missing either causes a stale-serve bug.
3. **New JS files also require an entry in `sw.js` CORE_ASSETS** — this is listed in `CLAUDE.md` as a mandatory step.
4. Keep `CORE_ASSETS` in the same logical order as the `<script>` tags in `index.html`.

---

## Architecture

### CACHE_NAME format

```
staktrakr-v{APP_VERSION}-b{EPOCH}
```

Example from current source:

```js
const CACHE_NAME = 'staktrakr-v3.33.19-b1772404151';
```

- `APP_VERSION` — read from `js/constants.js` at commit time (e.g. `3.33.19`)
- `EPOCH` — Unix timestamp in seconds at commit time, making every build unique
- When the name changes, the browser treats it as a new cache bucket and re-fetches all assets

### Cache strategy

Requests are routed through different strategies based on URL matching in the `fetch` handler:

| Bucket | Hosts / Paths | Strategy | Rationale |
|---|---|---|---|
| **Pre-cached shell** | `CORE_ASSETS` list | Cached on `install` via `cache.addAll()` | Ensures offline availability of core app |
| **External API hosts** | `metalpriceapi.com`, `metals-api.com`, `gold-api.com`, `numista.com` | Network-first | Live price feeds must always return fresh data |
| **CDN libraries** | `cdnjs.cloudflare.com`, `cdn.jsdelivr.net`, `unpkg.com` | Stale-while-revalidate | Serve fast from cache, update in background |
| **StakTrakr API** | `api.staktrakr.com`, `api2.staktrakr.com` | Stale-while-revalidate | Hourly price feeds benefit from fast cached response with background refresh |
| **Spot history seed data** | Local `/data/spot-history*` | Stale-while-revalidate | Seed files updated between releases |
| **Local JS/CSS** | Same-origin `*.js`, `*.css` | Network-first | Always serve fresh code when online |
| **Navigation** | Same-origin `navigate` requests | Cached app shell (`./`) | PWA launch and page reload serve the cached index; falls back to offline page |
| **Other local assets** | Same-origin (images, fonts, etc.) | Stale-while-revalidate | Fast cached response with background refresh |

### Pre-commit hook: `devops/hooks/stamp-sw-cache.sh`

The hook is symlinked from `.git/hooks/pre-commit`. It runs automatically on every `git commit`.

**What it does, step by step:**

1. Checks whether any staged file matches one of the cached path patterns: `css/`, `js/`, `index.html`, `data/`, `images/`, `manifest.json`, or `sw.js` itself.
2. If no cached asset is staged, exits immediately (no-op).
3. Reads `APP_VERSION` from `js/constants.js` using `grep` + `sed` (macOS-compatible — no `grep -P`).
4. Captures the current Unix epoch with `date +%s`.
5. Computes `NEW_CACHE = staktrakr-v{APP_VERSION}-b{EPOCH}`.
6. Compares against the current `CACHE_NAME` in `sw.js`; if already equal, exits (idempotent).
7. Rewrites the `CACHE_NAME` line in `sw.js` using `sed` (with BSD/GNU dual-path for macOS vs Linux).
8. Runs `git add sw.js` to re-stage the updated file so the rewrite is included in the commit.
9. Prints `[stamp-sw-cache] CACHE_NAME updated: staktrakr-v...` to stdout.

**Install the hook (one-time, already done in this repo):**

```bash
ln -sf ../../devops/hooks/stamp-sw-cache.sh .git/hooks/pre-commit
```

---

## CORE_ASSETS

The full pre-cache list as of v3.33.19 (76 entries). This list **must be kept in sync** with the `<script>` load order in `index.html`.

```js
const CORE_ASSETS = [
  './',
  './css/styles.css',
  './js/file-protocol-fix.js',
  './js/debug-log.js',
  './js/constants.js',
  './js/field-meta.js',
  './js/state.js',
  './js/utils.js',
  './js/dialogs.js',
  './js/image-cache.js',
  './js/image-processor.js',
  './js/bulk-image-cache.js',
  './js/image-cache-modal.js',
  './js/fuzzy-search.js',
  './js/autocomplete.js',
  './js/numista-lookup.js',
  './js/seed-images.js',
  './js/versionCheck.js',
  './js/changeLog.js',
  './js/diff-engine.js',
  './js/diff-modal.js',
  './js/charts.js',
  './js/theme.js',
  './js/search.js',
  './js/chip-grouping.js',
  './js/tags.js',
  './js/filters.js',
  './js/sorting.js',
  './js/pagination.js',
  './js/detailsModal.js',
  './js/viewModal.js',
  './js/debugModal.js',
  './js/numista-modal.js',
  './js/spot.js',
  './js/card-view.js',
  './js/seed-data.js',
  './js/priceHistory.js',
  './js/spotLookup.js',
  './js/goldback.js',
  './js/retail.js',
  './js/retail-view-modal.js',
  './js/api.js',
  './js/catalog-api.js',
  './js/pcgs-api.js',
  './js/catalog-providers.js',
  './js/catalog-manager.js',
  './js/inventory.js',
  './js/vault.js',
  './js/cloud-storage.js',
  './js/cloud-sync.js',
  './privacy.html',
  './js/about.js',
  './js/api-health.js',
  './js/faq.js',
  './js/customMapping.js',
  './js/settings.js',
  './js/settings-listeners.js',
  './js/bulkEdit.js',
  './js/clone-picker.js',
  './js/events.js',
  './js/init.js',
  './data/spot-history-bundle.js',
  './data/spot-history-2025.json',
  './data/spot-history-2026.json',
  './images/safe-favicon.svg',
  './images/staktrakr-logo.svg',
  './images/icon-192.png',
  './images/icon-512.png',
  './manifest.json',
  './vendor/papaparse.min.js',
  './vendor/jspdf.umd.min.js',
  './vendor/jspdf.plugin.autotable.min.js',
  './vendor/chart.min.js',
  './vendor/chartjs-plugin-datalabels.min.js',
  './vendor/jszip.min.js',
  './vendor/forge.min.js',
];
```

Note: `spot-history-2026.json` (and future yearly files) must be added to `CORE_ASSETS` at the start of each new year alongside the `spot-history-bundle.js` seed.

---

## Cache Busting

Every patch bump triggers `stamp-sw-cache.sh`, producing a new `CACHE_NAME`. When a user's browser fetches the new `sw.js`, it sees an unknown cache name, opens a fresh cache bucket, and re-downloads all `CORE_ASSETS`. The old cache bucket is deleted in the `activate` event.

This means:

- Users always get the latest JS/CSS within one page load of a new deploy.
- No manual cache-clearing is required by the user.
- Offline mode still works immediately after the fresh install completes.

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| Added JS file to `index.html` but not `CORE_ASSETS` | Service worker serves the old (missing) version of the file offline; bug disappears on hard refresh | Add the `./js/your-file.js` entry to `CORE_ASSETS` in `sw.js` |
| Edited `CACHE_NAME` manually | Pre-commit hook overwrites it on the next commit | Do not edit — the hook owns this line |
| Hook not symlinked after a fresh clone | `CACHE_NAME` never updates; users cache stale assets forever | Run `ln -sf ../../devops/hooks/stamp-sw-cache.sh .git/hooks/pre-commit` |
| Added a vendor file to `vendor/` but not `CORE_ASSETS` | Vendor script missing in offline mode | Add `./vendor/your-lib.min.js` to the bottom of `CORE_ASSETS` |
| `CORE_ASSETS` out of order vs `index.html` | No runtime error, but makes auditing the list harder | Keep entries in `<script>` load order |

---

## Related Pages

- [frontend-overview.md](frontend-overview.md) — full JS file list and load order
- [release-workflow.md](release-workflow.md) — patch versioning and the pre-commit hook pipeline

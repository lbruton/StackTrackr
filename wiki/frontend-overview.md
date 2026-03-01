---
title: Frontend Overview
category: frontend
owner: staktrakr
lastUpdated: v3.33.18
date: 2026-03-01
sourceFiles:
  - index.html
  - js/constants.js
  - sw.js
  - js/file-protocol-fix.js
relatedPages:
  - data-model.md
  - storage-patterns.md
  - dom-patterns.md
  - service-worker.md
  - release-workflow.md
  - retail-modal.md
---
# Frontend Overview

> **Last updated:** v3.33.18 — 2026-03-01
> **Source files:** `index.html`, `js/constants.js`, `sw.js`, `js/file-protocol-fix.js`

## Overview

StakTrakr is a single-page precious metals inventory tracker built with pure HTML and vanilla JavaScript — zero build step, zero install, zero dependencies. It works on both `file://` and HTTP without any configuration changes. All application state persists in `localStorage`; there is no server, no database, and no backend beyond a static API feed.

## Key Rules (read before touching this area)

- **New JS files must be registered in TWO places:** add a `<script>` tag to `index.html` in strict load order AND add the path to `CORE_ASSETS` in `sw.js`. Missing either means the file never loads or the service worker silently skips it on offline fetch.
- **Never use `document.getElementById()` directly** (except in `about.js` and `init.js` startup code) — always use `safeGetElement(id)`.
- **Never write to `localStorage` directly** — always use `saveData()` / `loadData()` from `js/utils.js`.
- **All localStorage keys must be declared** in `ALLOWED_STORAGE_KEYS` in `js/constants.js`.
- **Always call `sanitizeHtml()`** before assigning user content to `innerHTML`.
- The `sw.js` `CACHE_NAME` is auto-stamped by the `devops/hooks/stamp-sw-cache.sh` pre-commit hook — do not edit it manually.
- Script load order in `index.html` is strict; dependencies must appear before dependents. There are currently **70 `<script>` tags** in `index.html`.
- **Feature-flagged views must respect both code paths.** When a feature flag like `MARKET_LIST_VIEW` gates an alternative rendering path, the original grid view must remain fully functional when the flag is off. Always restore the original DOM state (headers, class names) in the default path.

## Architecture

### Runtime model

```
index.html  (single page, all UI panels)
  └── 70 <script> tags (strict load order)
        ├── js/file-protocol-fix.js   — detects file:// vs HTTP, patches fetch
        ├── js/constants.js           — APP_VERSION, all constants, ALLOWED_STORAGE_KEYS
        ├── js/state.js               — shared mutable state
        ├── js/utils.js               — saveData(), loadData(), safeGetElement()
        ├── ... (feature modules)
        └── js/init.js                — bootstraps the app after all scripts load
```

### Versioning

`APP_VERSION` in `js/constants.js` follows `BRANCH.RELEASE.PATCH` format (e.g. `3.33.17`).
Optional state suffix: `a` = alpha, `b` = beta, `rc` = release candidate.
Run `/release patch` after every meaningful committed change — one change, one patch tag.

### Feature flags (FEATURE_FLAGS in js/constants.js)

Feature flags gate beta/experimental UI paths. Each flag has:

| Property | Type | Description |
|---|---|---|
| `enabled` | boolean | Default state (most beta flags default `false`) |
| `urlOverride` | boolean | If `true`, `?flag_name=true` in the URL enables it |
| `userToggle` | boolean | If `true`, the user can toggle it in Settings |
| `description` | string | Human-readable description |
| `phase` | string | `"beta"` / `"stable"` / `"deprecated"` |

Active feature flags as of v3.33.06:

| Flag | Default | Description |
|---|---|---|
| `MARKET_LIST_VIEW` | `true` | New single-row market card layout with search, sort, and inline charts |
| `MARKET_DASHBOARD_ITEMS` | `false` | Show goldback and dashboard items in the market list |
| `MARKET_AUTO_RETAIL` | `false` | Auto-update inventory retail prices from linked market data |

### Key globals exposed on `window`

| Global | Source file | Purpose |
|---|---|---|
| `APP_VERSION` | `js/constants.js` | Current version string |
| `saveData(key, value)` | `js/utils.js` | Write to localStorage (validated key) |
| `loadData(key)` | `js/utils.js` | Read from localStorage |
| `safeGetElement(id)` | `js/utils.js` | Safe `getElementById` wrapper |
| `retailPrices` | `js/retail-pricing.js` | Latest retail price map |
| `retailAvailability` | `js/retail-pricing.js` | Availability flags per item |
| `spotPrice` | `js/spot-price.js` | Current spot price object |
| `STORAGE_PERSIST_GRANTED_KEY` | `js/constants.js` | localStorage key for storage persistence grant flag |
| `IMAGE_ZIP_MANIFEST_VERSION` | `js/constants.js` | Version string for image ZIP export manifest format (currently `'1.0'`) |
| `_renderMarketListView` | `js/retail.js` | Re-render market list view (added v3.33.06) |
| `_buildMarketListCard` | `js/retail.js` | Build a single market list card (added v3.33.06) |
| `_getFilteredSortedSlugs` | `js/retail.js` | Filter + sort slugs for market list (added v3.33.06) |
| `DISPOSITION_TYPES` | `js/constants.js` | Frozen map of disposition types (`sold`, `traded`, `lost`, `gifted`, `returned`) with labels and amount requirements |
| `isDisposed(item)` | `js/constants.js` | Helper predicate — returns `true` if an item has a `disposition` record |
| `SYNC_MANIFEST_PATH` | `js/constants.js` | Dropbox path for encrypted change manifest (`/StakTrakr/sync/staktrakr-sync.stmanifest`) |
| `SYNC_MANIFEST_PATH_LEGACY` | `js/constants.js` | Legacy Dropbox path for change manifest (flat root) |

### Key subsystems

| Subsystem | Entry point(s) | Notes |
|---|---|---|
| Inventory | `js/inventory.js`, `js/items.js` | CRUD for precious metals holdings |
| Disposition (v3.33.17) | `js/inventory.js`, `js/constants.js` | Realized gains/losses workflow — dispose items as sold/traded/lost/gifted/returned; undo disposition; portfolio summary breakdown |
| Retail pricing | `js/retail-pricing.js`, `js/api.js` | Polls `api.staktrakr.com/data/api/manifest.json` |
| Market list view | `js/retail.js` | Full-width card layout with search/sort/charts (feature-flagged, v3.33.06) |
| Spot prices | `js/spot-price.js`, `js/spot-history.js` | Polls hourly and 15-min feeds from `api.staktrakr.com` |
| Cloud sync | `js/cloud-sync.js`, `js/cloud-settings.js` | Backup/restore via encrypted cloud vault |
| Diff/Merge | `js/diff-engine.js`, `js/diff-modal.js` | Change-set diffing and interactive merge review UI (STAK-184) |
| Catalog | `js/catalog.js`, `js/seed-images.js` | Coin/bar catalog with image cache |
| Image cache | `js/image-cache.js` | Per-item user photo storage; dynamic quota; byte tracking per store |
| Service worker | `sw.js` | Offline support, PWA installability, cache versioning |

### `file://` protocol support

`js/file-protocol-fix.js` detects whether the app is running under `file://` and patches `fetch` calls accordingly so that API polling and local JSON reads work in both environments.

### Portfolio value model

```
meltValue  = weight x qty x spotPrice
```

Three price columns tracked per holding: **Purchase Price**, **Melt Value**, **Retail Price**.

### Market section dual-header layout (v3.33.06)

The Market Prices section in `index.html` now has **two mutually exclusive headers**:

- `#marketListHeader` — shown when `MARKET_LIST_VIEW` feature flag is active. Contains search bar, sort dropdown, Expand All button, and a dedicated sync button/timestamp.
- `#marketGridHeader` — the original grid header. Shown when the feature flag is off.

`renderRetailCards()` in `js/retail.js` checks the feature flag at entry and either delegates to `_renderMarketListView()` or falls through to the original grid renderer. The grid path explicitly hides `#marketListHeader` and removes `.market-list-mode` from the grid container to ensure a clean state.

### Disposition workflow (v3.33.17 — STAK-72)

Items can be marked as disposed via a modal form (`#dispositionModal` in `index.html`). Disposition types are defined in `DISPOSITION_TYPES` in `js/constants.js`:

| Type | Label | Requires Amount |
|---|---|---|
| `sold` | Sold | Yes |
| `traded` | Traded | Yes |
| `lost` | Lost | No |
| `gifted` | Gifted | No |
| `returned` | Returned | Yes |

**Realized gain/loss** is computed at disposition time: `amount - (purchasePrice * qty)`. The result is stored in `item.disposition.realizedGainLoss`.

**Visual indicators:** Disposed items show a colored badge (`.disposition-badge--{type}`) in both table rows and card views. Disposed table rows receive `.disposed-row` (opacity + strikethrough); disposed cards receive `.disposed-card`. Badge colors are theme-aware (light and dark variants in `css/styles.css`).

**Filter toggle:** A "Show disposed" toggle (`#showDisposedToggle`) in the filter bar controls whether disposed items appear in the inventory list. When unchecked (default), `js/filters.js` strips items with a `disposition` property.

**Portfolio summary:** Each metal's summary card and the "All" summary card include a disposed-items breakdown with realized G/L when disposed items exist (`#disposedWrap{Metal}`, `#disposedWrapAll`).

**Undo:** `undoDisposition(idx)` restores a disposed item to active inventory after user confirmation, clearing the `disposition` property and logging the change.

**CSV export:** Four disposition columns are appended to the export: Disposition Type, Disposition Date, Disposition Amount, Realized G/L.

### Storage gauge (v3.32.27)

The Settings storage section now renders a **split storage gauge** with two independently tracked bars:

- **Your Photos** — bytes used by user-uploaded images (tracked via `js/image-cache.js`)
- **Numista Cache** — bytes used by Numista API response cache

A persistence status line (`#gaugePersistLine`) shows whether the browser has granted persistent storage. The persistence request is triggered by `js/settings.js` and the grant is recorded under `storagePersistGranted` in localStorage. Quota is computed dynamically from the `navigator.storage.estimate()` API rather than the previous hardcoded 50 MB cap.

## Common Mistakes

- Adding a new JS file to `index.html` but forgetting `sw.js` CORE_ASSETS (or vice versa) — the app works in dev but breaks for users with a cached service worker.
- Calling `document.getElementById()` outside of `about.js` / `init.js` — the safe wrapper provides error logging and avoids silent null-ref failures.
- Writing directly to `localStorage` instead of `saveData()` — bypasses key validation and breaks the data audit trail.
- Editing `sw.js` `CACHE_NAME` manually — the pre-commit hook will overwrite it; always let the hook stamp the value.
- Placing a new `<script>` tag in the wrong position in `index.html` — scripts that reference globals from later files will throw at load time.
- Assuming `spot-history-YYYY.json` is live data — it is a seed file (noon UTC daily snapshot) and will always appear ~10 h stale in health checks.
- Hardcoding a storage quota (e.g. `50 * 1024 * 1024`) — quota is now derived dynamically from `navigator.storage.estimate()` in `js/image-cache.js`.
- Forgetting to restore the default header/class state in the non-flagged code path when a feature flag gates an alternative UI. Both `#marketListHeader` visibility and `.market-list-mode` must be explicitly reset in `renderRetailCards` when the flag is off.
- Storing `meltValue` or `realizedGainLoss` at render time — `meltValue` is always computed from current spot; `realizedGainLoss` is computed once at disposition time and stored in the `disposition` object, not re-derived.

## Related Pages

- [Data Model](data-model.md)
- [Storage Patterns](storage-patterns.md)
- [DOM Patterns](dom-patterns.md)
- [Service Worker](service-worker.md)
- [Release Workflow](release-workflow.md)
- [Retail View Modal](retail-modal.md)

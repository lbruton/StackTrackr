# AGENTS.md

Instructions for AI agents working in this repository (Codex, Claude Code web, GitHub Actions, remote agents).

This file contains codebase context only -- no local MCP servers, no local-only skills, no Mac-specific tooling. For local development context, see `CLAUDE.md` (gitignored, per-device).

## Project Overview

StakTrakr is a **precious metals inventory tracker** (Silver, Gold, Platinum, Palladium, Goldback). Single HTML page, vanilla JavaScript, localStorage persistence, no backend. Must work on both `file://` protocol and HTTP servers (extracting a ZIP and opening `index.html` must always work).

**No build step required.** The runtime artifact is `index.html` plus JS/CSS assets loaded via `<script>` tags. No bundler, no transpiler, no Node.js runtime. Dev tooling (Playwright tests, linters, Docker pollers) lives in `devops/` and does not affect the app.

Future plans include ApexCharts and Tabler integration. Slowly migrating new features with future compatibility in mind.

**Portfolio model**: Purchase Price / Melt Value / Retail Price with computed Gain/Loss. All per-unit values; multiply by `qty` for totals. `meltValue` is already qty-adjusted (`weight * qty * spot`). Goldback items use `weightUnit: 'gb'` with denomination-based pricing.

**Multi-currency**: USD base with live exchange rates from Open Exchange Rates API. Fallback rates in `constants.js`. Display currency stored in localStorage, formatting via `formatCurrency()`.

**Branding/domain system**: Supports alternate domain names via `BRANDING_DOMAIN_OPTIONS` in `constants.js`. Logo split, footer, and About modal adapt based on serving domain.

**Versioning**: `BRANCH.RELEASE.PATCH` format in `js/constants.js` (`APP_VERSION`). Version must be synchronized across 7 files: `js/constants.js`, `sw.js` (CACHE_NAME), `CHANGELOG.md`, `docs/announcements.md`, `js/about.js`, `version.json`, plus seed data.

**Quality Gates**: StakTrakr uses Codacy for Code Quality Gates and maintains an A+ Rating. All commits and PRs must be approved by Codacy.

## Critical Development Patterns

### 1. Script Loading Order (MANDATORY)

50 scripts load in strict dependency order via `index.html`. Breaking this order causes undefined variable errors. The full chain:

```
file-protocol-fix.js  (no defer -- loads FIRST)
debug-log.js
constants.js
state.js
utils.js
image-processor.js -> image-cache.js -> bulk-image-cache.js -> image-cache-modal.js
fuzzy-search.js -> autocomplete.js
numista-lookup.js
seed-images.js
versionCheck.js
changeLog.js
charts.js
theme.js
search.js
chip-grouping.js -> tags.js -> filters.js
sorting.js
pagination.js
detailsModal.js -> viewModal.js -> debugModal.js
numista-modal.js
spot.js
data/spot-history-bundle.js
seed-data.js
priceHistory.js -> spotLookup.js -> goldback.js
api.js
catalog-api.js -> pcgs-api.js -> catalog-providers.js -> catalog-manager.js
inventory.js
card-view.js
vault.js -> cloud-storage.js
about.js
customMapping.js
settings.js -> settings-listeners.js
bulkEdit.js
events.js
test-loader.js
init.js  (loads LAST)
```

When adding a new script file, place it in the correct position in `index.html` based on its dependencies. All scripts use `defer` except `file-protocol-fix.js`.

### 2. Global Scope Architecture

This is a **vanilla JS app with global scope across files** -- there is no module bundler. Functions and constants defined in one file are available in all files loaded after it. The `no-undef` ESLint rule is intentionally OFF.

Key globals by source file:

| File | Globals |
|------|---------|
| `state.js` | `inventory`, `spotPrices`, `elements`, `displayCurrency`, `exchangeRate`, `currencySymbol`, `itemTags`, `cloudBackupEnabled` |
| `debug-log.js` | `debugLog()` |
| `constants.js` | `API_PROVIDERS`, `METALS`, `ALLOWED_STORAGE_KEYS`, `APP_VERSION`, `LS_KEY`, `SPOT_HISTORY_KEY` |
| `utils.js` | `saveData()`, `loadData()`, `saveDataSync()`, `loadDataSync()`, `sanitizeHtml()`, `formatCurrency()`, `computeMeltValue()` |
| `spot.js` | `spotHistory`, `recordSpot()`, `saveSpotHistory()`, `updateSparkline()`, `updateSpotCardColor()` |
| `api.js` | `syncSpotPricesFromApi()`, `syncProviderChain()`, `loadApiConfig()`, `saveApiConfig()` |
| `filters.js` | `renderActiveFilters()`, `activeFilters` |
| `changeLog.js` | `logChange()` |
| `image-cache.js` | `imageCache` (IndexedDB image storage API) |
| `inventory.js` | `renderTable()`, `saveInventory()`, `loadInventory()` |
| `events.js` | `onGoldSpotPriceChanged()`, `recordAllItemPriceSnapshots()`, `updateStorageStats()` |
| `catalog-*.js` | `catalogManager`, `catalogAPI` |
| `numista-lookup.js` | `NumistaLookup` |
| `tags.js` | `loadItemTags()`, `saveItemTags()`, `getItemTags()`, `addItemTag()`, `buildTagSection()` |
| `cloud-storage.js` | `cloudAuthStart()`, `cloudIsConnected()`, `cloudDisconnect()`, `recordCloudActivity()` |
| `settings-listeners.js` | `setupSettingsEventListeners()`, `bindCloudStorageListeners()` |
| `seed-images.js` | `loadSeedImages()` |
| `init.js` | `safeGetElement()` |

**Do NOT flag variables as "not defined"** in reviews or analysis. They are defined in other files loaded earlier in the script order.

### 3. localStorage Security Whitelist

All localStorage keys MUST be in `ALLOWED_STORAGE_KEYS` in `js/constants.js` before use. Direct `localStorage.setItem()` with unlisted keys will fail the security check. `cleanupStorage()` in `utils.js` removes unknown keys.

### 4. DOM Access Pattern

Always use `safeGetElement(id)` (defined in `js/init.js:30`) instead of `document.getElementById()`. Returns a dummy element on null to prevent reference errors. Exception: one-time startup code in `about.js` and `init.js` may use direct `getElementById()` for guaranteed-to-exist elements.

### 5. Data Persistence

Use `saveData()`/`loadData()` (async, preferred) or `saveDataSync()`/`loadDataSync()` (legacy) from `js/utils.js`. Never use `localStorage` directly for application data. Data is compressed via LZ-string when it exceeds size thresholds.

### 6. XSS Prevention

All user-supplied strings rendered into the DOM must go through `sanitizeHtml()` from `js/utils.js`. No direct `innerHTML` assignment with unsanitized input. Existing `// nosemgrep:` comments indicate reviewed exceptions.

### 7. Service Worker Rules

`sw.js` implements PWA offline support. Critical rules:

- Every `event.respondWith()` must guarantee a `Response` object
- `caches.match()` resolves to `undefined` on miss (not a rejection) -- guard with `.then((r) => r || fallback)`
- `CACHE_NAME` in `sw.js` must match `APP_VERSION` in `constants.js` -- drift causes stale assets

### 8. Version Sync -- 7 Files Must Match

When any version-related file changes, verify all are in sync:

| File | Field |
|------|-------|
| `js/constants.js` | `APP_VERSION` |
| `sw.js` | `CACHE_NAME` (includes version) |
| `CHANGELOG.md` | Latest `## [x.y.z]` heading |
| `docs/announcements.md` | Latest What's New entry version |
| `js/about.js` | `getEmbeddedWhatsNew()` version |
| `version.json` | `"version"` field |
| `data/spot-history-*.json` | Seed data should be refreshed |

### 9. Announcements Rotation

`docs/announcements.md` and `js/about.js` (`getEmbeddedWhatsNew()`) are capped at 3-5 entries. Oldest entries rotate out. Both files must contain the same entries in the same order. Long lines in `announcements.md` are intentional -- the parser splits on newlines.

### 10. Seed Data Files

Files matching `data/spot-history-*.json` are generated by an external Docker poller. Do not flag formatting, line count changes, or large diffs -- they are machine-generated price data.

## Key Application Files

### Core Data Flow

- **`js/file-protocol-fix.js`** -- localStorage fallbacks for `file://` protocol (loads first, no `defer`)
- **`js/debug-log.js`** -- Debug logging utilities (`debugLog()` global)
- **`js/constants.js`** -- Global config, API providers, storage keys, app version, branding, metal definitions, Goldback denominations, exchange rate fallbacks, inline chip config, filter chip category config
- **`js/state.js`** -- Application state (`inventory`, `spotPrices`, `elements`, currency globals) and cached DOM element references
- **`js/utils.js`** -- Formatting, validation, helpers, storage report, `saveData`/`loadData`, `sanitizeHtml`, `computeMeltValue`, `cleanupStorage`
- **`js/inventory.js`** -- Core CRUD operations, table rendering, CSV/PDF/ZIP export, ZIP import with settings restore
- **`js/api.js`** -- External pricing API integration with provider fallback chain, quota management, batch sync
- **`js/events.js`** -- Event handlers, unified add/edit modal submit, UI interactions, vault/bulk edit/settings listener setup
- **`js/init.js`** -- Application initialization, `safeGetElement()` definition, DOM element caching, phase-based startup (loads last)

### Feature Modules

- **`js/spot.js`** -- Spot price history, sparkline rendering, card color indicators, manual/API price management
- **`js/spotLookup.js`** -- Multi-provider spot price fetching orchestrator, historical price lookups
- **`js/priceHistory.js`** -- Per-item price history tracking and recording
- **`js/goldback.js`** -- Goldback denomination pricing, estimation (2x spot formula)
- **`js/sorting.js`** -- Multi-column table sorting (qty-adjusted for computed columns)
- **`js/filters.js`** -- Advanced column filtering, summary chip system, category-based chip rendering
- **`js/chip-grouping.js`** -- Custom chip groups, dynamic name grouping for filter chips
- **`js/tags.js`** -- Per-item tagging system (Numista API tags + custom user tags), tag management UI
- **`js/search.js`** & **`js/fuzzy-search.js`** -- Search functionality with fuzzy matching
- **`js/charts.js`** -- Chart.js spot price visualization
- **`js/pagination.js`** -- Table pagination
- **`js/theme.js`** -- Four-state theme system (light / dark / sepia / system)
- **`js/autocomplete.js`** -- Input autocomplete with fuzzy matching
- **`js/card-view.js`** -- Card view rendering engine (styles A/B/C/D)
- **`js/settings.js`** -- Settings modal UI, all configuration panels
- **`js/settings-listeners.js`** -- Settings modal event listener binders, split from `settings.js`

### Image System

- **`js/image-processor.js`** -- Image resize/compress (WebP/JPEG adaptive, configurable max dimensions/quality/size)
- **`js/image-cache.js`** -- IndexedDB-based image cache for item photos and pattern images
- **`js/bulk-image-cache.js`** -- Batch image download/caching operations
- **`js/image-cache-modal.js`** -- Image cache management modal UI

### Modals

- **`js/about.js`** -- About modal, acknowledgment modal, announcements loading, embedded What's New/Roadmap
- **`js/versionCheck.js`** -- Version change detection, What's New modal, changelog parsing, remote version checking
- **`js/changeLog.js`** -- Item change log tracking and undo/redo
- **`js/detailsModal.js`** -- Item detail view
- **`js/viewModal.js`** -- Full item view modal with charts, PCGS CoinFacts links, cert verification links
- **`js/debugModal.js`** -- Debug information modal
- **`js/bulkEdit.js`** -- Bulk edit modal for batch item field updates

### Numista & PCGS Integration

- **`js/catalog-api.js`** -- Numista API client
- **`js/catalog-providers.js`** -- Catalog data providers
- **`js/catalog-manager.js`** -- Catalog orchestration
- **`js/numista-modal.js`** -- Catalog search modal UI
- **`js/numista-lookup.js`** -- Pattern-based Numista lookup rules engine
- **`js/pcgs-api.js`** -- PCGS coin grading API client (CoinFacts lookup, cert verification, population data)

### Import/Export & Security

- **`js/customMapping.js`** -- Regex-based rule engine for CSV field mapping
- **`js/vault.js`** -- Encrypted backup/restore (.stvault format, AES-GCM, PBKDF2 key derivation)
- **`js/cloud-storage.js`** -- Cloud sync via Dropbox/pCloud/Box OAuth, cloud vault backup/restore, activity logging
- CSV via PapaParse, PDF via jsPDF + AutoTable, ZIP backup via JSZip

### Data & Infrastructure

- **`js/seed-data.js`** -- Demo/seed data for first-run experience
- **`js/seed-images.js`** -- Embedded sample coin images for first-run Numista lookup demo
- **`js/test-loader.js`** -- Playwright test harness loader (localhost only)
- **`sw.js`** -- Service worker for PWA offline support, cache-first with network fallback
- **`data/spot-history-bundle.js`** -- Bundled historical spot prices loaded at runtime
- **`data/spot-history-YYYY.json`** -- Per-year spot price JSON files (1968-2026), generated by Docker poller
- **`version.json`** -- Remote version checking endpoint

## Build, Test, and Development

No compile step is required.

- `open index.html` -- run directly via `file://` for quick checks
- `python -m http.server 8000` -- run over HTTP at `http://localhost:8000`
- `npx eslint js/*.js` -- lint JavaScript using `.eslintrc.json`

Validate both launch paths (`file://` and localhost). Smoke test core flows: add/edit/delete inventory, import/export, settings persistence, and spot-price sync.

If adding browser tests, place them under `tests/` with `*.test.js` naming and load via `js/test-loader.js` for localhost runs.

## Coding Style

- 2-space indentation, semicolons always, `camelCase` for variables/functions, `UPPER_SNAKE_CASE` for constants
- `const`/`let` only -- `var` is banned (`no-var: error`)
- Always `===`/`!==` -- never `==`/`!=` (`eqeqeq: error`)
- Arrow functions preferred for callbacks
- Template literals preferred over string concatenation
- Trailing commas in multi-line arrays/objects (ES2017+)
- 120-character soft line limit
- Keep shared constants in `js/constants.js` -- avoid hardcoding keys/URLs in feature files
- Use `safeGetElement()` for DOM access
- No `eval()` or `Function()` constructor

## Commit & Pull Request Guidelines

Commit message styles:

- Ticket-first: `STAK-70: Raise card view breakpoint...`
- Type-first: `fix: ...`, `chore: ...`, `feat: ...`
- Release commits: `v3.30.07 -- STAK-XX: Title`

PRs should include:

- Clear summary and user-visible impact
- Linked issue/ticket (`STAK-###`) when applicable
- Screenshots or short clips for UI changes
- Notes for docs/version updates when behavior changes

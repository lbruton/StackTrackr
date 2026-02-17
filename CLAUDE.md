# CLAUDE.md

Instructions for Claude Code when working in this repository.

## Project Overview

StakTrakr is a **precious metals inventory tracker** (Silver, Gold, Platinum, Palladium). Single HTML page, vanilla JavaScript, localStorage persistence, no backend. Must work on both `file://` protocol and HTTP servers (extracting a ZIP and opening `index.html` must always work).

**Dev tooling is fine** — build scripts, test runners (Playwright), linters, bundlers for devops are all acceptable in `devops/`. The constraint is the **runtime artifact**: the app itself must remain a single HTML page with vanilla JS that loads without a server or install step. Future roadmap includes native macOS/Windows wrappers.

StakTrakr developers have future plans for ApexCharts and Tabler integration. Slowly migrating new features with future compatibility in mind.

**Portfolio model**: Purchase Price / Melt Value / Retail Price with computed Gain/Loss. All per-unit values; multiply by `qty` for totals. `meltValue` is already qty-adjusted (`weight * qty * spot`).

**Versioning**: `BRANCH.RELEASE.PATCH` format in `js/constants.js` (`APP_VERSION`). Use the `/release` skill to bump versions across all 7 files: `js/constants.js`, `sw.js` (CACHE_NAME), `CHANGELOG.md`, `docs/announcements.md`, `js/about.js`, `version.json`, plus seed data.

**Versioning Skills** This project has a `/release` skill that outlines the full release process. This skill must also be updated anytime changes are made to the version system.

**Service Worker Cache**: `sw.js` CACHE_NAME is auto-stamped by a pre-commit hook (`devops/hooks/stamp-sw-cache.sh`). Format: `staktrakr-v{VERSION}-b{EPOCH}`. The hook fires when any cached asset is staged, reads `APP_VERSION`, appends a build timestamp, and re-stages `sw.js`. New `.js` files must be added to `sw.js` CORE_ASSETS. See the `sw-cache` skill. Install hook: `ln -sf ../../devops/hooks/stamp-sw-cache.sh .git/hooks/pre-commit`

**Quality Gates** StakTrakr uses Codacy for Code Quality Gates and maintains an A+ Rating. All commits and PR's must be approved by Codacy. 

**Code Search Strategy**: Tiered — claude-context first (fast, cheap), then Grep/Glob (literal matches), then Explore agents (comprehensive). See the `search-code` skill for the full decision flowchart and escalation rules.

## Critical Development Patterns

### 1. Script Loading Order (MANDATORY)

Scripts load in dependency order via `index.html`. `file-protocol-fix.js` loads first (no `defer`), `init.js` loads last. Breaking this order causes undefined variable errors.

### 2. localStorage Security Whitelist

All localStorage keys MUST be in `ALLOWED_STORAGE_KEYS` in `js/constants.js` before use. Direct `localStorage.setItem()` with unlisted keys will fail the security check.

### 3. DOM Access Pattern

Always use `safeGetElement(id)` instead of `document.getElementById()`. Prevents null reference errors throughout the codebase.

### 4. Data Persistence

Use `saveData()`/`loadData()` (async, preferred) or `saveDataSync()`/`loadDataSync()` (legacy) from `js/utils.js`. Never use `localStorage` directly for application data.

## Key Application Files

### Core Data Flow

- **`js/file-protocol-fix.js`** — localStorage fallbacks for `file://` protocol (loads first, no `defer`)
- **`js/debug-log.js`** — Debug logging utilities
- **`js/constants.js`** — Global config, API providers, storage keys, app version, branding
- **`js/state.js`** — Application state and cached DOM element references
- **`js/inventory.js`** — Core CRUD operations, table rendering, CSV/PDF/ZIP export
- **`js/api.js`** — External pricing API integration with provider fallback chain
- **`js/utils.js`** — Formatting, validation, helpers, storage report
- **`js/events.js`** — Event handlers, unified add/edit modal submit, UI interactions
- **`js/init.js`** — Application initialization (loads last)

### Feature Modules

- **`js/spot.js`** — Spot price history, card color indicators, manual/API price management
- **`js/sorting.js`** — Multi-column table sorting (qty-adjusted for computed columns)
- **`js/filters.js`** — Advanced column filtering and summary chip system
- **`js/search.js`** & **`js/fuzzy-search.js`** — Search functionality
- **`js/charts.js`** — Chart.js spot price visualization
- **`js/pagination.js`** — Table pagination
- **`js/theme.js`** — Four-state theme system (light / dark / sepia / system)
- **`js/autocomplete.js`** — Input autocomplete
- **`js/card-view.js`** — Card view rendering engine (styles A/B/C)

### Modals

- **`js/about.js`** — About modal, acknowledgment modal, announcements loading
- **`js/versionCheck.js`** — Version change detection, What's New modal, changelog parsing
- **`js/changeLog.js`** — Item change log tracking and undo/redo
- **`js/detailsModal.js`** — Item detail view
- **`js/viewModal.js`** — Full item view modal with charts
- **`js/debugModal.js`** — Debug information

### Numista Integration

- **`js/catalog-api.js`** — Numista API client
- **`js/catalog-providers.js`** — Catalog data providers
- **`js/catalog-manager.js`** — Catalog orchestration
- **`js/numista-modal.js`** — Catalog search modal UI

### Import/Export

- **`js/customMapping.js`** — Regex-based rule engine for CSV field mapping
- CSV via PapaParse, PDF via jsPDF + AutoTable, ZIP backup via JSZip

## Local Development Note

Local developers with MCP servers (Linear, Memento, Brave Search, etc.) have additional skills and commands in `.claude/` that are gitignored. These provide project management, session persistence, and enhanced search capabilities. See the local `.claude/skills/` directory for available tooling.

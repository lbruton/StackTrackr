# CLAUDE.md

Instructions for Claude Code when working in this repository.

## Project Overview

StakTrakr is a **precious metals inventory tracker** (Silver, Gold, Platinum, Palladium). Single HTML page, vanilla JavaScript, localStorage persistence, no backend. Must work on both `file://` protocol and HTTP servers (extracting a ZIP and opening `index.html` must always work).

**Dev tooling is fine** — build scripts, test runners (Playwright), linters, bundlers for devops are all acceptable in `devops/`. The constraint is the **runtime artifact**: the app itself must remain a single HTML page with vanilla JS that loads without a server or install step. Future roadmap includes native macOS/Windows wrappers.

StakTrakr developmers have future plans for ApexCharts and Tabler integration. Slowly migrating new features. Always check Context7 with future compatability in mind.  

**Portfolio model**: Purchase Price / Melt Value / Retail Price with computed Gain/Loss. All per-unit values; multiply by `qty` for totals. `meltValue` is already qty-adjusted (`weight * qty * spot`).

**Versioning**: `BRANCH.RELEASE.PATCH` format in `js/constants.js` (`APP_VERSION`). Use the `/release` skill to bump versions across all 7 files: `js/constants.js`, `sw.js` (CACHE_NAME), `CHANGELOG.md`, `docs/announcements.md`, `js/about.js`, `version.json`, plus seed data.

**Versioning Skills** This project has a `/release` skill that outlines the full release process. This skill must also be updated anytime changes are made to the version system.

**Quality Gates** StakTrakr uses Codacy for Code Quality Gates and maintains an A+ Rating. All commits and PR's must be approved by Codacy. 

**Code Search Strategy**: Use Claude-Context (`search_code`) as the **first step** for any codebase lookup — it returns results in ~2s with zero subprocess token cost. For focused, single-function queries it is often sufficient on its own. For cross-cutting concerns (patterns scattered across many files), comprehensive traces, or when Claude-Context results seem incomplete, pass the initial findings to an **Explore agent** as seed context — this makes the Explore search faster and more targeted. Use Explore agents directly (without Claude-Context first) only for large-scope investigations that clearly span many files. Re-index Claude-Context after any major structural changes.

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
- **`js/file-protocol-fix.js`** - localStorage fallbacks for `file://` protocol (loads first, no `defer`)
- **`js/debug-log.js`** - Debug logging utilities
- **`js/constants.js`** - Global config, API providers, storage keys, app version, branding
- **`js/state.js`** - Application state and cached DOM element references
- **`js/inventory.js`** - Core CRUD operations, table rendering, CSV/PDF/ZIP export
- **`js/api.js`** - External pricing API integration with provider fallback chain
- **`js/utils.js`** - Formatting, validation, helpers, storage report
- **`js/events.js`** - Event handlers, unified add/edit modal submit, UI interactions
- **`js/init.js`** - Application initialization (loads last)

### Feature Modules
- **`js/spot.js`** - Spot price history, card color indicators, manual/API price management
- **`js/sorting.js`** - Multi-column table sorting (qty-adjusted for computed columns)
- **`js/filters.js`** - Advanced column filtering and summary chip system
- **`js/search.js`** & **`js/fuzzy-search.js`** - Search functionality
- **`js/charts.js`** - Chart.js spot price visualization
- **`js/pagination.js`** - Table pagination
- **`js/theme.js`** - Four-state theme system (light / dark / sepia / system)
- **`js/autocomplete.js`** - Input autocomplete

### Modals
- **`js/about.js`** - About modal, acknowledgment modal, announcements loading
- **`js/versionCheck.js`** - Version change detection, What's New modal, changelog parsing
- **`js/changeLog.js`** - Item change log tracking and undo/redo
- **`js/detailsModal.js`** - Item detail view
- **`js/debugModal.js`** - Debug information

### Numista Integration
- **`js/catalog-api.js`** - Numista API client (BROKEN — see ROADMAP.md Next Session)
- **`js/catalog-providers.js`** - Catalog data providers
- **`js/catalog-manager.js`** - Catalog orchestration
- **`js/numista-modal.js`** - Catalog search modal UI

### Import/Export
- **`js/customMapping.js`** - Regex-based rule engine for CSV field mapping
- CSV via PapaParse, PDF via jsPDF + AutoTable, ZIP backup via JSZip

## MCP Tools

Most MCP tool rules are in auto-loading skills (`.claude/skills/`). Only safety-critical rules stay here.

### Memento Knowledge Graph (mcp__memento__) — SAFETY RULES

Persistent knowledge graph in Neo4j at `localhost:7687` (local Mac). Shared with HexTrackr.

- **NEVER use `read_graph`** — graph exceeds 200K tokens, will fail. Use `search_nodes` or `semantic_search` instead.
- **Always tag** entities with `TAG: project:staktrakr` for project isolation.
- **Prefer `search_nodes`** over `semantic_search` for recent entities — semantic embeddings may have indexing lag.
- See the `memento-taxonomy` skill for naming conventions, entity types, required observations, and search patterns.

### Tool Rules (auto-loaded via skills)

| Skill | Covers | Auto-loads when... |
|-------|--------|-------------------|
| `linear-workspace` | Team IDs, issue routing, labels, states | Creating/querying Linear issues |
| `claude-context-rules` | Semantic code search, indexing | Searching the codebase |
| `context7-rules` | Library doc lookups | Looking up external library docs |
| `brave-search-rules` | Web/news search, summarizer | Performing web searches |
| `browser-testing` | Chrome DevTools, screenshots, snapshots | Testing UI, taking screenshots |
| `codacy-rules` | Code quality, sequential thinking | Running static analysis |
| `coding-standards` | JS patterns, conventions | Writing code |
| `seed-sync` | Docker poller seed data check, staging | Before releases, checking seed freshness |
| `memento-taxonomy` | Entity naming, tags, search patterns | Saving handoffs, sessions, insights, or querying Memento |
| `start` | Session context loading, handoff retrieval | Starting a new development session (`/start`) |

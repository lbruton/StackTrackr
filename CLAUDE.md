# CLAUDE.md

Instructions for Claude Code when working in this repository (local Mac development).

## Project Overview

StakTrakr is a **precious metals inventory tracker** (Silver, Gold, Platinum, Palladium, Goldback). Single HTML page, vanilla JavaScript, localStorage persistence, no backend. Must work on both `file://` protocol and HTTP servers (extracting a ZIP and opening `index.html` must always work).

**Dev tooling is fine** -- build scripts, test runners (Playwright), linters, bundlers for devops are all acceptable in `devops/`. The constraint is the **runtime artifact**: the app itself must remain a single HTML page with vanilla JS that loads without a server or install step. Future roadmap includes native macOS/Windows wrappers.

StakTrakr developers have future plans for ApexCharts and Tabler integration. Slowly migrating new features with future compatibility in mind.

**Portfolio model**: Purchase Price / Melt Value / Retail Price with computed Gain/Loss. All per-unit values; multiply by `qty` for totals. `meltValue` is already qty-adjusted (`weight * qty * spot`). Goldback items use `weightUnit: 'gb'` with denomination-based pricing.

**Multi-currency**: USD base with live exchange rates from Open Exchange Rates API. Fallback rates in `constants.js`. Display currency stored in localStorage, formatting via `formatCurrency()`.

**Branding/domain system**: Supports alternate domain names via `BRANDING_DOMAIN_OPTIONS` in `constants.js`. Logo split, footer, and About modal adapt based on serving domain.

**Versioning**: `BRANCH.RELEASE.PATCH` format in `js/constants.js` (`APP_VERSION`). Use the `/release` skill to bump versions across all 7 files: `js/constants.js`, `sw.js` (CACHE_NAME), `CHANGELOG.md`, `docs/announcements.md`, `js/about.js`, `version.json`, plus seed data.

**Versioning Skills** This project has a `/release` skill that outlines the full release process. This skill must also be updated anytime changes are made to the version system.

**Service Worker Cache**: `sw.js` CACHE_NAME is auto-stamped by a pre-commit hook (`devops/hooks/stamp-sw-cache.sh`). Format: `staktrakr-v{VERSION}-b{EPOCH}`. The hook fires when any cached asset is staged, reads `APP_VERSION`, appends a build timestamp, and re-stages `sw.js`. New `.js` files must be added to `sw.js` CORE_ASSETS. See the `sw-cache` skill. Install hook: `ln -sf ../../devops/hooks/stamp-sw-cache.sh .git/hooks/pre-commit`

**Quality Gates** StakTrakr uses Codacy for Code Quality Gates and maintains an A+ Rating. All commits and PR's must be approved by Codacy. 

**Code Search Strategy**: Tiered — claude-context first (fast, cheap), then Grep/Glob (literal matches), then Explore agents (comprehensive). See the `search-code` skill for the full decision flowchart and escalation rules.

## Instruction File Architecture

Three instruction files serve different agents -- keep them in sync:

| File | Audience | Git-tracked | Scope |
|------|----------|-------------|-------|
| `CLAUDE.md` | Claude Code (local Mac) | No (gitignored) | Full context + local MCP workflow |
| `AGENTS.md` | Codex, Claude Code web, remote agents | Yes | Codebase context only, no local tooling |
| `.github/copilot-instructions.md` | GitHub Copilot PR reviews | Yes | PR review rules, globals, ESLint, patterns |

### Skills Architecture (Two Tiers)

Skills live at two levels, each agent owning its own copies:

| Tier | Location | Audience | Git-tracked |
|------|----------|----------|-------------|
| User-level | `~/.claude/skills/` | Claude Code (all projects) | No (outside repo) |
| Project-level | `.claude/skills/` | Claude Code (this project) | Yes (4 skills) |
| Project-level | `.agents/skills/` | Codex | Yes (independent copies) |

**Project-level skills** (git-tracked, project-specific):
`coding-standards`, `markdown-standards`, `release`, `seed-sync`

**User-level skills** (outside repo, project-agnostic via `project.json` detection):
`memento-taxonomy`, `remember`, `sync-instructions`, `prime`, `sw-cache`, `agent-routing`

**Codex copies** in `.agents/skills/` include all of the above as independent copies.
Codex may tune descriptions, path references, or tool names for its runtime without affecting Claude Code.

The `/sync-instructions` skill flags drift between copies and lets the human decide sync direction.

Use the `/sync-instructions` skill after significant codebase changes to keep all files and skills aligned.

## Claude -> Codex Invocation Safety

When invoking Codex directly (for example from a second terminal or via relay skills), treat `AGENTS.md` as the execution
source of truth and apply sender-side checks first.

### Sender-side checks before invoking Codex

1. Confirm intent and scope:
   - Include target repo/path and expected outcome.
   - Avoid ambiguous "run this" prompts with mixed unrelated tasks.
1. Classify requested command risk up front:
   - read-only/local inspection,
   - workspace write,
   - network access,
   - privileged/escalated execution,
   - destructive action.
1. Be explicit for sensitive operations:
   - Call out when network access or elevated permissions are actually required.
   - Require explicit human confirmation for destructive operations.
1. Keep secrets out of handoffs:
   - Never forward raw secrets/tokens in relay payloads.
   - If secret context is needed, pass references/identifiers only.
1. Keep durable traceability for non-trivial work:
   - Prefer the existing dual-write handoff pattern (Linear + Memento) with attribution.

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

### 2. localStorage Security Whitelist

All localStorage keys MUST be in `ALLOWED_STORAGE_KEYS` in `js/constants.js` before use. Direct `localStorage.setItem()` with unlisted keys will fail the security check. `cleanupStorage()` in `utils.js` removes unknown keys.

### 3. DOM Access Pattern

Always use `safeGetElement(id)` (defined in `js/init.js:30`) instead of `document.getElementById()`. Returns a dummy element on null to prevent reference errors. Exception: one-time startup code in `about.js` and `init.js` may use direct `getElementById()` for guaranteed-to-exist elements.

### 4. Data Persistence

Use `saveData()`/`loadData()` (async, preferred) or `saveDataSync()`/`loadDataSync()` (legacy) from `js/utils.js`. Never use `localStorage` directly for application data. Data is compressed via LZ-string when it exceeds size thresholds.

## Key Application Files

### Core Data Flow

- **`js/file-protocol-fix.js`** -- localStorage fallbacks for `file://` protocol (loads first, no `defer`)
- **`js/debug-log.js`** -- Debug logging utilities (`debugLog()` global)
- **`js/constants.js`** -- Global config, API providers, storage keys, app version, branding, metal definitions, Goldback denominations, exchange rate fallbacks, inline chip config, filter chip category config
- **`js/state.js`** -- Application state (`inventory`, `spotPrices`, `elements`, currency globals) and cached DOM element references
- **`js/utils.js`** -- Formatting (`formatCurrency`, `formatWeight`), validation, helpers, storage report, `saveData`/`loadData`, `sanitizeHtml`, `computeMeltValue`, `cleanupStorage`
- **`js/inventory.js`** -- Core CRUD operations, table rendering, CSV/PDF/ZIP export, ZIP import with settings restore
- **`js/api.js`** -- External pricing API integration with provider fallback chain, quota management, batch sync
- **`js/events.js`** -- Event handlers, unified add/edit modal submit, UI interactions, vault/bulk edit/settings listener setup
- **`js/init.js`** -- Application initialization, `safeGetElement()` definition, DOM element caching, phase-based startup (loads last)

### Feature Modules

- **`js/spot.js`** -- Spot price history, sparkline rendering, card color indicators, manual/API price management, `recordSpot()`, `spotHistory` global
- **`js/spotLookup.js`** -- Multi-provider spot price fetching orchestrator, historical price lookups
- **`js/priceHistory.js`** -- Per-item price history tracking and recording
- **`js/goldback.js`** -- Goldback denomination pricing, estimation (2x spot formula), `computeGoldbackEstimatedRate()`
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
- **`js/settings.js`** -- Settings modal UI, all configuration panels (API, display, Goldback, Numista rules, image storage, layout sections)
- **`js/settings-listeners.js`** -- Settings modal event listener binders, split from `settings.js` for maintainability

### Image System

- **`js/image-processor.js`** -- Image resize/compress (WebP/JPEG adaptive, configurable max dimensions/quality/size)
- **`js/image-cache.js`** -- IndexedDB-based image cache for item photos and pattern images, multi-strategy fetch with CORS fallbacks
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
- **`js/numista-lookup.js`** -- Pattern-based Numista lookup rules engine (custom regex rules, seed image associations)
- **`js/pcgs-api.js`** -- PCGS coin grading API client (CoinFacts lookup, cert verification, population data)

### Import/Export & Security

- **`js/customMapping.js`** -- Regex-based rule engine for CSV field mapping
- **`js/vault.js`** -- Encrypted backup/restore (.stvault format, AES-GCM, PBKDF2 key derivation, password strength meter)
- **`js/cloud-storage.js`** -- Cloud sync via Dropbox/pCloud/Box OAuth, cloud vault backup/restore, activity logging
- CSV via PapaParse, PDF via jsPDF + AutoTable, ZIP backup via JSZip

### Data & Infrastructure

- **`js/seed-data.js`** -- Demo/seed data for first-run experience
- **`js/seed-images.js`** -- Embedded sample coin images for first-run Numista lookup demo
- **`js/test-loader.js`** -- Playwright test harness loader (localhost only)
- **`sw.js`** -- Service worker for PWA offline support, cache-first strategy with network fallback, `CACHE_NAME` must match `APP_VERSION`
- **`data/spot-history-bundle.js`** -- Bundled historical spot prices loaded at runtime
- **`data/spot-history-YYYY.json`** -- Per-year spot price JSON files (1968-2026), generated by Docker poller in `devops/spot-poller/`
- **`version.json`** -- Remote version checking endpoint (served from staktrakr.com)

## Local Development

### MCP Servers Available

Local developers have these MCP servers configured:

- **Linear** -- Project management, issue tracking (StakTrakr team ID: `f876864d-ff80-4231-ae6c-a8e5cb69aca4`)
- **Memento** -- Knowledge graph for session persistence, handoffs, insights (shared Neo4j instance, tag with `project:staktrakr`)
- **Claude-Context** -- Semantic code search (AST-indexed, Milvus vector DB)
- **Brave Search** -- Web search API
- **Claude-in-Chrome** -- Built-in browser automation (always available, no MCP config needed).
  Enable **Chrome DevTools** MCP for deeper debugging (console monitoring, DOM inspection, script evaluation)
- **Context7** -- Library documentation lookup (Chart.js, Bootstrap, jsPDF, etc.)
- **Codacy** -- Code quality analysis

### Local Skills & Commands

Skills and commands in `.claude/` are gitignored (except 4 tracked skills). Key local-only skills:

- `/prime` -- Comprehensive context loading (git + Linear + Memento + code search)
- `/start` -- Quick session context loader
- `/pr-resolve` -- PR review thread and Codacy resolution workflow
- `/save-handoff`, `/recall-handoff` -- Session persistence via Memento
- `/save-session`, `/recall-session` -- Session notes via Memento
- `/release` -- Version bump workflow (tracked skill)
- `agent-routing` -- AI delegation labels for Linear issues (auto-fires when creating/reviewing issues)
- `linear-workspace` -- Linear team IDs, routing rules, label conventions

### Tracked Skills (in git)

4 project-specific skills tracked in `.claude/skills/` (also mirrored in `.agents/skills/` for Codex):

- `coding-standards` -- StakTrakr coding standards
- `markdown-standards` -- Markdown linting rules
- `release` -- Release workflow
- `seed-sync` -- Spot price seed data synchronization

3 user-level skills at `~/.claude/skills/` (also mirrored in `.agents/skills/` for Codex):

- `memento-taxonomy` -- Knowledge graph taxonomy, entity types, tag conventions
- `remember` -- Natural language save/recall interface to Memento
- `sync-instructions` -- Instruction file & skills reconciliation across agents

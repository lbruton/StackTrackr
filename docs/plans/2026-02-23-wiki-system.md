# StakTrakr Wiki System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Populate `lbruton/StakTrakrWiki` with 9 frontend wiki pages, then build four skills — `wiki-update` (patch-time sync), `wiki-audit` (background correctness check), `wiki-sweep` (re-run initial population), and `ship` (dev→main release).

**Architecture:** Wiki pages are written to a separate GitHub repo (`StakTrakrWiki`) via `gh api` PUT — no local clone needed. Skills are markdown files in `.claude/skills/`. The `wiki-update` skill is wired into `/release patch` Phase 3. The `wiki-audit` skill dispatches a background Task agent. Tasks 1–9 (page writes) are independent and should be dispatched in parallel via `superpowers:dispatching-parallel-agents`.

**Tech Stack:** `gh api` (GitHub REST), `base64` (macOS), vanilla JS codebase (no build step), Claude Code skills (markdown).

---

## How to write a file to StakTrakrWiki

All page tasks use this pattern — memorise it:

```bash
# Step 1: Write content to a temp file
cat > /tmp/PAGENAME.md << 'CONTENT'
[page content here]
CONTENT

# Step 2: Get SHA if file already exists (needed for updates, empty string for new files)
SHA=$(gh api "repos/lbruton/StakTrakrWiki/contents/PAGENAME.md" --jq '.sha' 2>/dev/null || echo "")

# Step 3: Push via gh api
ARGS=(--method PUT -f message="docs: add PAGENAME" -f content="$(base64 -i /tmp/PAGENAME.md)")
[ -n "$SHA" ] && ARGS+=(-f sha="$SHA")
gh api "repos/lbruton/StakTrakrWiki/contents/PAGENAME.md" "${ARGS[@]}"
```

**Verify after each push:**
```bash
gh api "repos/lbruton/StakTrakrWiki/contents/PAGENAME.md" --jq '.name'
# Expected: "PAGENAME.md"
```

---

## Standard wiki page structure

Every frontend page must follow this template:

```markdown
# [Title]

> **Last updated:** vVERSION — YYYY-MM-DD
> **Source files:** `js/filename.js`, `js/other.js`

## Overview

2–3 sentences: what this subsystem does and why it exists.

## Key Rules (read before touching this area)

- Bullet list of the most important constraints / patterns agents must follow
- Focus on things that are easy to get wrong

## Architecture

How the subsystem is structured: key functions, data flow, globals exposed on `window`.

## Common Mistakes

What AI agents and new contributors consistently get wrong here.

## Related Pages

- [Other Page](other-page.md)
```

---

## Phase A — Initial Wiki Sweep (Tasks 1–9, run in parallel)

---

### Task 1: Write `frontend-overview.md`

**Files to read:** `index.html` (script count), `js/constants.js` (APP_VERSION), `sw.js` (CORE_ASSETS), `CLAUDE.md`
**Target:** `lbruton/StakTrakrWiki/frontend-overview.md`

**Step 1: Read source files**

```bash
grep -c '<script' /path/to/StakTrakr/index.html
# Expected: 67
grep 'APP_VERSION' /path/to/StakTrakr/js/constants.js | grep 'const APP_VERSION'
```

**Step 2: Write the page**

Content must cover:
- StakTrakr is a single HTML page, vanilla JS, zero build step, zero install
- Works on `file://` AND HTTP — code must handle both (use `file-protocol-fix.js` pattern)
- 67 `<script>` tags in `index.html` in strict load order — **new JS files must be added to both `index.html` AND `sw.js` CORE_ASSETS or the service worker will break**
- `APP_VERSION` format: `BRANCH.RELEASE.PATCH` (e.g. `3.32.25`)
- All state lives in `localStorage` — no server, no DB, no build artifacts
- Key subsystems: inventory, retail pricing, spot prices, cloud sync, catalog

```bash
cat > /tmp/frontend-overview.md << 'CONTENT'
# Frontend Overview

> **Last updated:** v3.32.25 — 2026-02-23
> **Source files:** `index.html`, `js/constants.js`, `sw.js`, `js/init.js`

## Overview

StakTrakr is a single-page precious metals inventory tracker. It is a pure HTML+JS
app with zero build step and zero install — open `index.html` directly or serve over
HTTP. All state lives in `localStorage`. It works identically on `file://` and HTTP.

## Key Rules (read before touching this area)

- **New JS files** must be added in TWO places: (1) `index.html` script tag in correct
  load order position, (2) `sw.js` CORE_ASSETS array. Missing either causes a broken
  service worker or a file that never loads.
- **`file://` compatibility** — never use `fetch()` without a fallback. See
  `js/file-protocol-fix.js` for the detection pattern.
- **No build step** — there is no `npm`, no webpack, no TypeScript. Changes are live
  immediately on reload.
- **Script load order matters** — `index.html` has 67 `<script>` tags in dependency
  order. `constants.js` and `utils.js` load first. Never reorder without checking deps.

## Architecture

**Entry point:** `index.html` loads 67 scripts in order, then `js/init.js` boots the app.

**Key globals exposed on `window`** (set by their respective modules):
- `APP_VERSION` — current version string (from `constants.js`)
- `saveData` / `loadData` — storage wrappers (from `utils.js`)
- `safeGetElement` — safe DOM access (from `utils.js`)
- `retailPrices`, `retailAvailability`, `retailProviders` — retail feed data (from `retail.js`)
- `spotPrice` — current spot price (from `spot.js`)

**Portfolio model:** every item has `purchasePrice`, `meltValue` (`weight × qty × spot`),
and `retailPrice`. See [Data Model](data-model.md).

**Version format:** `BRANCH.RELEASE.PATCH` — bump with `/release patch` after every
meaningful change. See [Release Workflow](release-workflow.md).

## Common Mistakes

- Adding a JS file to `index.html` but forgetting `sw.js` CORE_ASSETS → cache miss on
  update, old version served to users.
- Using `document.getElementById()` directly instead of `safeGetElement()` — will throw
  if the element doesn't exist yet. See [DOM Patterns](dom-patterns.md).
- Calling `localStorage` directly instead of `saveData()`/`loadData()` — bypasses the
  allowed-keys guard. See [Storage Patterns](storage-patterns.md).

## Related Pages

- [Data Model](data-model.md)
- [Storage Patterns](storage-patterns.md)
- [DOM Patterns](dom-patterns.md)
- [Service Worker](service-worker.md)
- [Release Workflow](release-workflow.md)
CONTENT
```

**Step 3: Push to wiki**

```bash
SHA=$(gh api "repos/lbruton/StakTrakrWiki/contents/frontend-overview.md" --jq '.sha' 2>/dev/null || echo "")
ARGS=(--method PUT -f message="docs: add frontend-overview" -f content="$(base64 -i /tmp/frontend-overview.md)")
[ -n "$SHA" ] && ARGS+=(-f sha="$SHA")
gh api "repos/lbruton/StakTrakrWiki/contents/frontend-overview.md" "${ARGS[@]}"
```

**Step 4: Verify**
```bash
gh api "repos/lbruton/StakTrakrWiki/contents/frontend-overview.md" --jq '.name'
# Expected: "frontend-overview.md"
```

---

### Task 2: Write `data-model.md`

**Files to read:** `js/constants.js` (ALLOWED_STORAGE_KEYS, APP_CONFIG), `js/utils.js` (saveData/loadData)
**Target:** `lbruton/StakTrakrWiki/data-model.md`

**Step 1: Extract ALLOWED_STORAGE_KEYS**

```bash
grep -A 50 'ALLOWED_STORAGE_KEYS' /path/to/StakTrakr/js/constants.js | head -60
```

**Step 2: Write the page**

Content must cover:
- Portfolio model: every coin/bar has `purchasePrice` (what you paid), `meltValue` (weight × qty × spot), `retailPrice` (current market ask)
- `meltValue` = `item.weight * item.qty * spotPrice` — spot is injected at render time, not stored
- All storage keys must be registered in `ALLOWED_STORAGE_KEYS` in `constants.js` before use
- `saveData(key, value)` / `loadData(key, default)` are the ONLY way to read/write localStorage

```bash
cat > /tmp/data-model.md << 'CONTENT'
# Data Model

> **Last updated:** v3.32.25 — 2026-02-23
> **Source files:** `js/constants.js`, `js/utils.js`

## Overview

StakTrakr models a precious metals portfolio. Each item has three value dimensions:
purchase price (historical cost), melt value (intrinsic metal value at spot), and
retail price (current market ask from live vendor data).

## Key Rules (read before touching this area)

- **New storage keys** must be added to `ALLOWED_STORAGE_KEYS` in `js/constants.js`
  before calling `saveData()` with them. `saveData()` will throw if the key is not
  in the allowlist.
- **Never call `localStorage` directly** — always use `saveData(key, value)` and
  `loadData(key, defaultValue)` from `js/utils.js`. See [Storage Patterns](storage-patterns.md).
- **`meltValue` is computed at render time** — it is never stored. It is always
  `item.weight * item.qty * currentSpotPrice`.

## Architecture

### Portfolio item shape

```js
{
  id: string,           // UUID
  name: string,         // "1 oz Gold Eagle"
  type: string,         // "coin" | "bar" | "round"
  metal: string,        // "gold" | "silver" | "platinum" | "palladium"
  weight: number,       // troy oz (fine weight, not gross)
  qty: number,
  purchasePrice: number, // what you paid per unit, USD
  purchaseDate: string, // ISO date
  mintmark: string,
  tags: string[],
  // meltValue — NOT stored, computed: weight * qty * spot
  // retailPrice — NOT stored, injected from live retail feed
}
```

### ALLOWED_STORAGE_KEYS

All localStorage keys must be registered here before use. Adding a key without
registering causes `saveData()` to throw a console error and silently no-op.

Read the current list from `js/constants.js` — it is the authoritative source.
Do not duplicate it here as it changes with features.

### Spot price injection

`spotPrice` is fetched from `api.staktrakr.com` and exposed as `window.spotPrice`.
It is injected into melt value calculations at render time by `spot.js`. It is
not stored in localStorage.

## Common Mistakes

- Adding a new setting/feature that needs persistence without registering its key
  in `ALLOWED_STORAGE_KEYS` — `saveData()` silently fails.
- Storing `meltValue` in an item object — it is always stale by the next spot refresh.
- Confusing `weight` (fine troy oz) with gross weight — always use fine weight.

## Related Pages

- [Storage Patterns](storage-patterns.md)
- [Frontend Overview](frontend-overview.md)
- [API Consumption](api-consumption.md)
CONTENT
```

**Step 3: Push + verify** (same pattern as Task 1, filename `data-model.md`)

---

### Task 3: Write `storage-patterns.md`

**Files to read:** `js/utils.js` (saveData, loadData implementations), `js/constants.js` (ALLOWED_STORAGE_KEYS)
**Target:** `lbruton/StakTrakrWiki/storage-patterns.md`

**Step 1: Read saveData/loadData implementations**

```bash
grep -n 'saveData\|loadData\|ALLOWED_STORAGE' /path/to/StakTrakr/js/utils.js | head -20
```

**Step 2: Write the page**

Content must cover: why the wrappers exist (allowlist enforcement, migration safety), the exact function signatures, when `loadData` default is used, migration pattern for renaming a key.

Push using the standard gh api pattern, filename `storage-patterns.md`.

---

### Task 4: Write `dom-patterns.md`

**Files to read:** `js/utils.js` (safeGetElement, sanitizeHtml), `CLAUDE.md` (critical patterns section), `js/about.js` + `js/init.js` (examples of allowed raw getElementById)
**Target:** `lbruton/StakTrakrWiki/dom-patterns.md`

Content must cover:
- `safeGetElement(id)` — use everywhere except app startup
- Raw `document.getElementById()` is allowed ONLY in `about.js` and `init.js` at boot
- `sanitizeHtml(str)` — required on all user content before `innerHTML` assignment
- Never assign `innerHTML` to untrusted content without sanitizing

Push using the standard gh api pattern, filename `dom-patterns.md`.

---

### Task 5: Write `sync-cloud.md`

**Files to read:** `js/cloud-sync.js`, `js/cloud-storage.js`
**Target:** `lbruton/StakTrakrWiki/sync-cloud.md`

**Step 1: Survey the files**

```bash
wc -l /path/to/StakTrakr/js/cloud-sync.js
grep -n 'Simple\|Secure\|getSyncPassword\|pushSyncVault\|pullSyncVault\|conflict' \
  /path/to/StakTrakr/js/cloud-sync.js | head -30
```

Content must cover:
- Two modes: Simple (Dropbox account as key, no password prompt) vs Secure (vault password, zero-knowledge)
- `getSyncPassword()` — fast-path reads from localStorage, not a prompt. Critical: never bypass this.
- Conflict resolution: remote wins by default; `handleRemoteChange` cancels any queued push before pulling
- Vault overwrite race (v3.32.24 fix): debounced startup push was discarding remote changes — both devices need v3.32.24+
- `pullSyncVault()` calls must always have `.catch()` handlers

Push using the standard gh api pattern, filename `sync-cloud.md`.

---

### Task 6: Write `retail-modal.md`

**Files to read:** `js/retail-view-modal.js`, `js/retail.js`
**Target:** `lbruton/StakTrakrWiki/retail-modal.md`

**Step 1: Survey retail-view-modal.js**

```bash
grep -n 'const _\|window\.' /path/to/StakTrakr/js/retail-view-modal.js | head -30
```

Content must cover:
- `_bucketWindows(windows)` — groups 15-min raw windows into 30-min slots
- `_forwardFillVendors(bucketed)` — fills vendor price gaps; returns new array with `_carriedVendors: Set` on each window (added v3.32.25)
- `_buildIntradayChart(slug)` — Chart.js 24h line chart; carried data points have `_carriedIndices: Set` on dataset
- `_buildIntradayTable(slug, bucketed)` — "Recent windows" table; carried cells render `~$XX.XX` muted italic
- `_buildVendorLegend(slug)` — shows all vendors including OOS (`retailAvailability[slug][id] === false`); `hasAny` guard checks both price feed AND availability feed
- Globals consumed: `retailPrices`, `retailAvailability`, `retailLastKnownPrices`, `retailLastAvailableDates`, `retailProviders`, `RETAIL_VENDOR_NAMES`, `RETAIL_VENDOR_COLORS`, `RETAIL_VENDOR_URLS`

Push using the standard gh api pattern, filename `retail-modal.md`.

---

### Task 7: Write `api-consumption.md`

**Files to read:** `js/api.js` (dual-endpoint, timeout), `js/api-health.js`, `CLAUDE.md` (API infrastructure table)
**Target:** `lbruton/StakTrakrWiki/api-consumption.md`

**Step 1: Survey api.js**

```bash
grep -n 'api\.staktrakr\|api2\|timeout\|manifest\|goldback\|spot' \
  /path/to/StakTrakr/js/api.js | head -30
```

Content must cover:
- Three feeds: manifest (market prices), hourly spot, goldback
- Primary endpoint: `api.staktrakr.com` (GitHub Pages, `lbruton/StakTrakrApi`)
- Fallback endpoint: `api2.staktrakr.com` — automatic after 5-second timeout
- `spot-history-YYYY.json` is a seed file (noon UTC daily snapshot), NOT live data — always ~10h stale
- Stale thresholds: market 30min, spot 20min, goldback 25h
- Frontend is consumer-only — all poller/backend code lives in `StakTrakrApi` repo

Push using the standard gh api pattern, filename `api-consumption.md`.

---

### Task 8: Write `release-workflow.md`

**Files to read:** `.claude/skills/release/SKILL.md`, `.claude/skills/start-patch/SKILL.md`, `devops/version-lock-protocol.md`
**Target:** `lbruton/StakTrakrWiki/release-workflow.md`

Content must cover:
- `/start-patch` — session start: picks Linear issue, hands off to `/release patch`
- `/release patch` — claims version lock → worktree `patch/VERSION` → version bump (7 files) → commit → PR to dev
- 7 files bumped on every patch: `js/constants.js`, `sw.js` (auto by hook), `CHANGELOG.md`, `docs/announcements.md`, `js/about.js`, `version.json`, wiki (via `wiki-update` skill)
- Version lock: `devops/version.lock` serializes concurrent agents
- Worktree cleanup after PR merges: tag on dev, remove worktree, delete branch, delete lock
- `/ship` — explicit `dev → main` batched release (never automatic)

Push using the standard gh api pattern, filename `release-workflow.md`.

---

### Task 9: Write `service-worker.md`

**Files to read:** `sw.js`, `devops/hooks/stamp-sw-cache.sh`
**Target:** `lbruton/StakTrakrWiki/service-worker.md`

**Step 1: Read CORE_ASSETS**

```bash
grep -A 60 'CORE_ASSETS' /path/to/StakTrakr/sw.js | head -65
grep 'CACHE_NAME' /path/to/StakTrakr/sw.js | head -3
```

Content must cover:
- `CACHE_NAME` format: `staktrakr-vVERSION-bTIMESTAMP` — auto-stamped by pre-commit hook, never edit manually
- `CORE_ASSETS` — list of every JS/CSS file cached offline. **Must be updated when adding new JS files.**
- Pre-commit hook: `devops/hooks/stamp-sw-cache.sh` — fires when `js/constants.js` is staged, reads APP_VERSION, writes CACHE_NAME
- Cache busting: new CACHE_NAME on every patch forces users to fetch fresh assets

Push using the standard gh api pattern, filename `service-worker.md`.

---

### Task 10: Update `README.md` in StakTrakrWiki

**Run after Tasks 1–9 are all complete.**

**Step 1: Fetch current README SHA**

```bash
SHA=$(gh api "repos/lbruton/StakTrakrWiki/contents/README.md" --jq '.sha')
```

**Step 2: Write updated README**

```bash
cat > /tmp/README.md << 'CONTENT'
# StakTrakr Wiki

Private infrastructure and frontend wiki for StakTrakr. Covers architecture, data
pipelines, runbooks, and operational notes across all repos and environments.

**Status:** Active — maintained by Claude Code, Gemini, and home/cloud poller agents.

---

## Infrastructure (API / Pollers)

| Page | Contents |
|------|----------|
| [Architecture Overview](architecture-overview.md) | System diagram, repo boundaries, data feeds |
| [Retail Market Price Pipeline](retail-pipeline.md) | Dual-poller, Turso, providers.json, OOS detection |
| [Fly.io Container](fly-container.md) | Services, cron, env vars, proxy config, deployment |
| [Home Poller (LXC)](home-poller.md) | Proxmox LXC setup, cron, sync process |
| [Spot Price Pipeline](spot-pipeline.md) | GitHub Actions, MetalPriceAPI, hourly files |
| [Goldback Pipeline](goldback-pipeline.md) | Daily scrape, run-goldback.sh |
| [providers.json](providers.md) | URL strategy, year-start patterns, update process |
| [Secrets & Keys](secrets.md) | Where every secret lives, how to rotate |
| [Health & Diagnostics](health.md) | Quick health checks, stale thresholds, diagnosis commands |

## Frontend (StakTrakr App)

| Page | Contents |
|------|----------|
| [Frontend Overview](frontend-overview.md) | App architecture, single-page model, script load order |
| [Data Model](data-model.md) | Portfolio model, ALLOWED_STORAGE_KEYS, meltValue formula |
| [Storage Patterns](storage-patterns.md) | saveData/loadData, allowlist enforcement, migration |
| [DOM Patterns](dom-patterns.md) | safeGetElement, sanitizeHtml, allowed raw getElementById |
| [Cloud Sync](sync-cloud.md) | Dropbox sync, Simple/Secure modes, conflict resolution |
| [Retail Modal](retail-modal.md) | Coin detail modal, carry-forward, OOS legend, chart/table |
| [API Consumption](api-consumption.md) | Feed endpoints, dual-endpoint fallback, stale thresholds |
| [Release Workflow](release-workflow.md) | Patch versioning, worktree flow, version lock, /ship |
| [Service Worker](service-worker.md) | CACHE_NAME, CORE_ASSETS, pre-commit hook |

---

## Contributing

- Update the relevant wiki page in the same session as the code change
- Mark sections `> ⚠️ NEEDS VERIFICATION` if unsure — inaccurate docs are flagged, not hidden
- Run `/wiki-audit` to check all pages for staleness against the codebase
- All agents can push directly — no PR required for wiki updates
CONTENT

gh api "repos/lbruton/StakTrakrWiki/contents/README.md" \
  --method PUT \
  -f message="docs: update README — add frontend section" \
  -f sha="$SHA" \
  -f content="$(base64 -i /tmp/README.md)"
```

**Step 3: Verify**

```bash
gh api "repos/lbruton/StakTrakrWiki/contents/README.md" --jq '.name'
# Expected: "README.md"
```

**Commit note:** no local commit needed — all changes go directly to StakTrakrWiki via gh api.

---

## Phase B — Skills (Tasks 11–14)

All skill files live in `.claude/skills/SKILLNAME/SKILL.md` in the StakTrakr repo.
Commit all four in a single commit to dev at the end of Task 14.

---

### Task 11: Create `wiki-update` skill

**File:** `.claude/skills/wiki-update/SKILL.md` (create directory + file)
**Also modify:** `.claude/skills/release/SKILL.md` — add wiki-update step to Phase 3

**Step 1: Create the skill file**

```bash
mkdir -p /path/to/StakTrakr/.claude/skills/wiki-update
```

Write `.claude/skills/wiki-update/SKILL.md`:

```markdown
---
name: wiki-update
description: Update StakTrakrWiki pages affected by the current patch. Called from /release patch Phase 3 after the version bump commit. Dispatches a background subagent — does not block PR creation.
allowed-tools: Bash, Read
---

# Wiki Update

Called automatically from `/release patch` Phase 3. Updates only the wiki pages
whose source files were touched in this patch.

## File → Page Mapping

| Source file pattern | Wiki page |
|---------------------|-----------|
| `index.html`, `sw.js`, `js/constants.js` | `frontend-overview.md` |
| `js/constants.js`, `js/utils.js` | `data-model.md` |
| `js/utils.js` | `storage-patterns.md`, `dom-patterns.md` |
| `js/cloud-sync.js`, `js/cloud-storage.js` | `sync-cloud.md` |
| `js/retail-view-modal.js`, `js/retail.js`, `js/retail-*.js` | `retail-modal.md` |
| `js/api.js`, `js/api-health.js` | `api-consumption.md` |
| `.claude/skills/release/`, `devops/` | `release-workflow.md` |
| `sw.js`, `devops/hooks/stamp-sw-cache.sh` | `service-worker.md` |

## Steps

### Step 1: Identify affected pages

```bash
CHANGED=$(git diff HEAD~1 --name-only)
echo "$CHANGED"
```

Map changed files to wiki pages using the table above. If no files match any
pattern, exit silently (e.g. pure CSS or data change).

### Step 2: For each affected page — re-read source files and rewrite

Read the relevant source files. Re-generate the page content using the same
structure as the initial sweep (see `docs/plans/2026-02-23-wiki-system.md`).

Update the `> **Last updated:**` line with the current version and date.

### Step 3: Push each updated page

```bash
SHA=$(gh api "repos/lbruton/StakTrakrWiki/contents/PAGENAME.md" --jq '.sha' 2>/dev/null || echo "")
ARGS=(--method PUT \
  -f message="sync: vVERSION — update PAGENAME" \
  -f content="$(base64 -i /tmp/PAGENAME.md)")
[ -n "$SHA" ] && ARGS+=(-f sha="$SHA")
gh api "repos/lbruton/StakTrakrWiki/contents/PAGENAME.md" "${ARGS[@]}"
```

### Step 4: Report

Output: `Wiki updated: [list of pages pushed]`
```

**Step 2: Wire into release skill Phase 3**

In `.claude/skills/release/SKILL.md`, after the commit step in Phase 3, add:

```markdown
**After a successful commit, dispatch a background wiki update:**

Run the `wiki-update` skill to push any affected wiki pages to `StakTrakrWiki`.
This runs as a background Task agent — do not wait for it before proceeding to Phase 4.

```bash
# The wiki-update skill handles this — invoke it with the Skill tool
```
```

---

### Task 12: Create `wiki-audit` skill

**File:** `.claude/skills/wiki-audit/SKILL.md`

Write the skill file with these cross-checks:

```markdown
---
name: wiki-audit
description: Background audit of StakTrakrWiki — cross-checks every frontend page against the current codebase and pushes corrections directly. Dispatches a background Task agent. Use /wiki-audit to trigger.
allowed-tools: Bash, Read, Task
---

# Wiki Audit

Spawns a background agent that reads every wiki page, cross-checks key claims
against the StakTrakr codebase, and pushes fixes directly to StakTrakrWiki.
Reports results as a GitHub issue on StakTrakrWiki when complete.

## How to invoke

Run `/wiki-audit` — the agent runs in the background. Continue working.
Check `lbruton/StakTrakrWiki/issues` for the audit report when done.

## Audit checks (agent runs these)

### 1. Script count (frontend-overview.md)
```bash
ACTUAL=$(grep -c '<script' /path/to/StakTrakr/index.html)
# Check that frontend-overview.md states this count
```

### 2. ALLOWED_STORAGE_KEYS (data-model.md)
```bash
grep -A 50 'ALLOWED_STORAGE_KEYS = \[' /path/to/StakTrakr/js/constants.js
# Check that data-model.md notes the key list and directs to constants.js
```

### 3. CORE_ASSETS completeness (service-worker.md)
```bash
grep -A 60 'CORE_ASSETS' /path/to/StakTrakr/sw.js | head -65
# Verify service-worker.md describes the CORE_ASSETS pattern accurately
```

### 4. Retail globals (retail-modal.md)
```bash
grep 'window\.' /path/to/StakTrakr/js/retail.js | grep -v '//'
# Verify retail-modal.md lists the correct window globals
```

### 5. API endpoints (api-consumption.md)
```bash
grep 'api\.staktrakr\|api2\.staktrakr' /path/to/StakTrakr/js/api.js | head -10
# Verify endpoints in wiki match code
```

### 6. APP_VERSION / release workflow (release-workflow.md)
```bash
cat /path/to/StakTrakr/devops/version-lock-protocol.md
# Verify release-workflow.md is consistent
```

## Fix and report

For each page with stale content:
1. Re-read the source files
2. Rewrite the stale sections (preserve structure)
3. Push via gh api (same pattern as wiki-update skill)
4. Collect all changes

When done, create a GitHub issue:
```bash
gh issue create --repo lbruton/StakTrakrWiki \
  --title "[audit] $(date +%Y-%m-%d)" \
  --body "## Wiki Audit Report

Pages updated: [list]
Pages verified OK: [list]
"
```
```

---

### Task 13: Create `wiki-sweep` skill

**File:** `.claude/skills/wiki-sweep/SKILL.md`

A re-runnable version of the initial sweep for when a full refresh is needed.

```markdown
---
name: wiki-sweep
description: Full re-population of all 9 frontend wiki pages in StakTrakrWiki. Use when wiki is significantly stale or after major refactors. Dispatches 9 parallel subagents. Not part of normal patch workflow.
allowed-tools: Bash, Read, Task
---

# Wiki Sweep

Dispatches 9 parallel subagents — one per frontend wiki page — to re-read source
files and rewrite every page from scratch. Use after major refactors or when audit
finds widespread staleness.

**Warning:** This overwrites all 9 frontend pages. Only run when needed.

## Steps

Dispatch the following agents in parallel using `superpowers:dispatching-parallel-agents`.
Each agent follows the initial sweep task from `docs/plans/2026-02-23-wiki-system.md`.

Pages to sweep (in parallel):
- `frontend-overview.md` — reads `index.html`, `js/constants.js`, `sw.js`
- `data-model.md` — reads `js/constants.js`, `js/utils.js`
- `storage-patterns.md` — reads `js/utils.js`, `js/constants.js`
- `dom-patterns.md` — reads `js/utils.js`, `CLAUDE.md`
- `sync-cloud.md` — reads `js/cloud-sync.js`, `js/cloud-storage.js`
- `retail-modal.md` — reads `js/retail-view-modal.js`, `js/retail.js`
- `api-consumption.md` — reads `js/api.js`, `js/api-health.js`
- `release-workflow.md` — reads `.claude/skills/release/SKILL.md`, `devops/`
- `service-worker.md` — reads `sw.js`, `devops/hooks/stamp-sw-cache.sh`

After all agents complete, update `README.md` to reflect any structural changes.
```

---

### Task 14: Create `ship` skill

**File:** `.claude/skills/ship/SKILL.md`

```markdown
---
name: ship
description: Ship dev to main — create the dev→main PR, mark it ready, resolve all threads, create GitHub Release. Run ONLY when user explicitly says "ready to ship", "release", or "merge to main". Never runs automatically.
allowed-tools: Bash, Read, Task
---

# Ship — StakTrakr (`dev → main`)

**Hard gate:** Only run when the user has explicitly said "ready to ship", "release",
or "merge to main" in the current session. This creates a permanent PR to main.

## Step 1: Sync gate

```bash
git fetch origin
git log --oneline main..origin/dev
# Must show commits — if empty, nothing to ship
```

## Step 2: Collect version tags on dev since last main merge

```bash
# Tags on dev not yet on main
git tag --merged origin/dev --sort=-version:refname | grep '^v3\.' | \
  while read tag; do
    # Check if tag is NOT on main
    git merge-base --is-ancestor "$tag" origin/main 2>/dev/null || echo "$tag"
  done
```

These tags are the changelog source. For each tag, extract the commit message title.

## Step 3: Fetch Linear issue titles

For each STAK-### found in commit messages or tag names, call
`mcp__claude_ai_Linear__get_issue` to get the current title.

## Step 4: Create the `dev → main` PR

```bash
gh pr create --base main --head dev --label "codacy-review" \
  --title "vLATEST_VERSION — [comprehensive title from tags]" \
  --body "$(cat <<'EOF'
## Summary

[bullet per version tag — user-readable description, not raw commit message]

## Version Tags

- vX.X.X — [title]
- vX.X.X — [title]

## Linear Issues

- STAK-XX: [title] — [url]

## QA Notes

[anything the reviewer should test]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## Step 5: Mark ready + resolve

```bash
gh pr ready [number]
```

Then invoke `/pr-resolve` to clear all Codacy and Copilot threads.

## Step 6: Update Linear issues

Mark all referenced STAK-### issues as **Done**.

## Step 7: After PR merges to main — GitHub Release (MANDATORY)

```bash
git fetch origin main
gh release create vLATEST_VERSION \
  --target main \
  --title "vLATEST_VERSION — TITLE" \
  --latest \
  --notes "$(cat <<'EOF'
[changelog bullets verbatim from CHANGELOG.md section]
EOF
)"
gh release list --limit 3
# Confirm new version shows as Latest
```
```

---

### Task 15: Commit all skill files + release skill update to dev

**Step 1: Stage all changes**

```bash
cd /path/to/StakTrakr
git add .claude/skills/wiki-update/
git add .claude/skills/wiki-audit/
git add .claude/skills/wiki-sweep/
git add .claude/skills/ship/
git add .claude/skills/release/SKILL.md
git diff --staged --stat
```

**Step 2: Commit**

```bash
git commit -m "feat(skills): add wiki-update, wiki-audit, wiki-sweep, ship skills"
```

**Step 3: Verify**

```bash
ls .claude/skills/wiki-update/ .claude/skills/wiki-audit/ \
   .claude/skills/wiki-sweep/ .claude/skills/ship/
# Expected: each directory contains SKILL.md
```

---

## Execution order

- **Tasks 1–9:** run in parallel (use `superpowers:dispatching-parallel-agents`)
- **Task 10:** run after all of 1–9 complete
- **Tasks 11–14:** run in parallel (independent of each other)
- **Task 15:** run after all of 11–14 complete

Tasks 1–10 touch only `StakTrakrWiki` via gh api — no local files changed.
Tasks 11–15 touch only `.claude/skills/` in the StakTrakr repo.

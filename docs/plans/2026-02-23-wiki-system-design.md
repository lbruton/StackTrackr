# StakTrakr Wiki System Design

**Date:** 2026-02-23
**Status:** Approved

## Goal

Build a single source of truth wiki in `lbruton/StakTrakrWiki` covering both the
infrastructure layer (already seeded by the StakTrakrApi agent) and the StakTrakr
frontend layer. Keep it accurate automatically via patch-time updates and periodic
background audits. Add a `/ship` skill to formalise the `dev → main` release path.

## Audience

Private repo — Lonnie, Claude Code, Gemini CLI, Codex, home poller agent, cloud
poller agent. Accuracy and machine-readability over narrative. No secrets (existing
`secrets.md` stays as-is and is not touched by any wiki tooling).

---

## Component 1 — Frontend Wiki Pages (initial sweep)

Nine new pages added to `StakTrakrWiki` alongside the existing nine infra pages:

| Page | Source files | Contents |
|------|-------------|----------|
| `frontend-overview.md` | `index.html`, `js/constants.js`, `sw.js` | App architecture, single-page model, 56-script load order, `file://` vs HTTP |
| `data-model.md` | `js/constants.js`, `js/utils.js` | Portfolio model (Purchase/Melt/Retail), `ALLOWED_STORAGE_KEYS`, `meltValue` formula |
| `storage-patterns.md` | `js/utils.js`, `js/constants.js` | `saveData`/`loadData`, why never direct `localStorage`, migration pattern, storage key registration |
| `dom-patterns.md` | `js/utils.js`, `CLAUDE.md` | `safeGetElement`, `sanitizeHtml`, when raw `getElementById` is allowed (startup only) |
| `sync-cloud.md` | `js/cloud-sync.js`, `js/cloud-storage.js` | Dropbox sync, Simple/Secure modes, vault encryption, conflict resolution, version lock |
| `retail-modal.md` | `js/retail-view-modal.js`, `js/retail.js` | Coin detail modal architecture, `_bucketWindows`, `_forwardFillVendors`, chart/table/legend, `retailAvailability` globals |
| `api-consumption.md` | `js/api.js`, `js/api-health.js` | How the frontend consumes manifest, spot, goldback feeds; dual-endpoint fallback; stale thresholds |
| `release-workflow.md` | `.claude/skills/release/SKILL.md`, `devops/version-lock-protocol.md` | Patch versioning, worktree flow, 7-file bump, version lock protocol, `/start-patch` → `/release patch` → `/ship` |
| `service-worker.md` | `sw.js`, `devops/hooks/stamp-sw-cache.sh` | `CACHE_NAME` format, `CORE_ASSETS` list, pre-commit hook auto-stamp, cache busting |

JSDoc handles function-level signatures. These pages answer: **"what do I need to
know before safely changing this area?"**

### Initial sweep approach

Dispatch 9 subagents in parallel — one per page. Each agent:

1. Reads its source files from the local StakTrakr clone
2. Reads `CLAUDE.md` for critical patterns
3. Writes the page via `gh api` commit to `lbruton/StakTrakrWiki` (no local clone needed)

A coordinator pass follows: reads all 18 pages (9 existing + 9 new), checks
cross-references are consistent, and updates `README.md` with the complete page table.

---

## Component 2 — `/wiki-update` Skill (patch-time updates)

Baked into `/release patch` Phase 3, after the version bump commit. Runs as a
background subagent so it doesn't block the PR creation.

### File → page mapping

Each wiki page declares which source file patterns trigger it:

```
frontend-overview.md    → index.html, sw.js, js/constants.js
data-model.md           → js/constants.js, js/utils.js
storage-patterns.md     → js/utils.js, js/constants.js
dom-patterns.md         → js/utils.js
sync-cloud.md           → js/cloud-sync.js, js/cloud-storage.js
retail-modal.md         → js/retail-view-modal.js, js/retail.js, js/retail-*.js
api-consumption.md      → js/api.js, js/api-health.js
release-workflow.md     → .claude/skills/release/SKILL.md, devops/
service-worker.md       → sw.js, devops/hooks/stamp-sw-cache.sh
```

### Update flow

1. `git diff HEAD~1 --name-only` — list files changed in this patch
2. Map changed files to affected wiki pages using the table above
3. For each affected page: re-read the source files, rewrite only that page
4. Push to `StakTrakrWiki` with commit message: `sync: vVERSION — update [page-names]`

If no source files match any mapping (e.g. a pure CSS or data change), skip silently.

---

## Component 3 — `/wiki-audit` Skill (background maintenance)

A skill that spawns a **background Task agent** and returns immediately. The agent:

1. Clones or fetches `StakTrakrWiki` and the current StakTrakr codebase state
2. For each frontend wiki page, cross-checks key claims against source:
   - Storage keys listed in `data-model.md` match `ALLOWED_STORAGE_KEYS` in `constants.js`
   - `CORE_ASSETS` list in `service-worker.md` matches `sw.js`
   - Script load count in `frontend-overview.md` matches `index.html`
   - Global variables listed in `retail-modal.md` match `js/retail.js` exports
3. Pushes fixes directly to `StakTrakrWiki` — one commit per page changed
4. Posts a summary report to a GitHub issue on `StakTrakrWiki` titled `[audit] YYYY-MM-DD`

**Write access, no approval gate.** Inaccurate docs are worse than a small correction
shipped without review, since the wiki is agent-facing.

---

## Component 4 — `/ship` Skill (`dev → main` release)

Extracts Phase 4.5 of the release skill into a standalone `/ship` command. Triggered
only when Lonnie explicitly says "ready to ship", "release", or invokes `/ship`.

Flow:
1. Sync gate: `git fetch && git log main..origin/dev` — confirm dev is ahead
2. Collect version tags on dev since last main merge: `git tag --merged origin/dev`
3. Fetch Linear issue titles for all STAK-### references found in tags/commits
4. Create `dev → main` PR with comprehensive body built from the tag list
5. `gh pr ready` → run `/pr-resolve` → update Linear issues to Done
6. After merge: `gh release create vLATEST --target main --latest`

This skill **never runs automatically** — only on explicit user instruction.

---

## Skills to create

| Skill | Location | Trigger |
|-------|----------|---------|
| `wiki-sweep` | `.claude/skills/wiki-sweep/SKILL.md` | One-time, manual |
| `wiki-update` | `.claude/skills/wiki-update/SKILL.md` | Baked into `/release patch` Phase 3 |
| `wiki-audit` | `.claude/skills/wiki-audit/SKILL.md` | Manual, runs background agent |
| `ship` | `.claude/skills/ship/SKILL.md` | Manual, explicit "ready to ship" only |

---

## Out of scope

- No secrets in any wiki page (existing `secrets.md` untouched)
- No function-level docs (JSDoc covers that)
- No public-facing docs site — private repo only
- No automated scheduling of audit (manual invoke only for now)

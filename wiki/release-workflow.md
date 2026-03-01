---
title: Release Workflow
category: frontend
owner: staktrakr
lastUpdated: v3.32.24
date: 2026-02-23
sourceFiles:
  - .claude/skills/release/SKILL.md
  - devops/version-lock-protocol.md
relatedPages:
  - service-worker.md
  - frontend-overview.md
---
# Release Workflow

> **Last updated:** v3.32.24 — 2026-02-23
> **Source files:** `.claude/skills/release/SKILL.md`, `devops/version-lock-protocol.md`

## Overview

StakTrakr uses a structured patch versioning workflow. Every meaningful change — bug fix, UX tweak, or feature addition — gets its own version bump, its own worktree, and its own PR to `dev`. This keeps the commit graph clean and gives every release a set of breadcrumb tags that can be reconstructed into a precise changelog.

The two commands that drive this workflow are:

- **`/release patch`** — claims the next version, isolates work in a worktree, bumps 7 files, commits, and opens a draft PR to `dev`
- **`/ship`** (Phase 4.5 of the release skill) — explicit `dev → main` release using version tags as the changelog source; never runs automatically

---

## Key Rules (read before touching this area)

- **One meaningful change = one patch tag = one worktree.** Never batch unrelated changes under a single version bump.
- **Always sync before starting.** `git fetch origin && git pull origin dev` is a hard gate — do not skip. A worktree created from a stale HEAD produces PRs that conflict with or silently drop remote commits.
- **Never push directly to `dev` or `main`.** Both branches are protected with Codacy quality gates. All changes must go through PRs.
- **Claim the version lock before any code.** The version number is the first thing decided, not the last.
- **`/ship` is always explicit.** The `dev → main` PR is created only when you say "ready to ship" — never automatically at the end of a patch cycle.

---

## Architecture

### Version Format

Defined in `js/constants.js` as `APP_VERSION`:

```
BRANCH.RELEASE.PATCH
  3  .  32  .  24
```

- `BRANCH` — major branch (rarely changes)
- `RELEASE` — bumped when shipping a batch to `main` via `/release release`
- `PATCH` — bumped after every meaningful committed change via `/release patch`

Current value as of this writing: `3.32.24`

---

### Version Lock (`devops/version.lock`)

The lock prevents two concurrent agents from claiming the same version number. It is the first thing written and the last thing deleted.

**Lock file format** (`devops/version.lock` — gitignored):

```json
{
  "locked": "3.32.25",
  "locked_by": "claude-sonnet / STAK-XX feature name",
  "locked_at": "2026-02-23T19:00:00Z",
  "expires_at": "2026-02-23T19:30:00Z"
}
```

- TTL is 30 minutes. Any agent may take over an expired lock (and must log the takeover in mem0).
- If the lock is held and not expired, stop and report to the user — do not proceed.

---

### Worktrees (`.claude/worktrees/`)

Each patch gets an isolated filesystem via `git worktree`. All file edits, version bumps, and commits happen inside the worktree — not in the main `dev` working tree.

```bash
# Created automatically by /release patch after the lock is written
git worktree add .claude/worktrees/patch-3.32.25 -b patch/3.32.25
```

Worktrees are stored at `.claude/worktrees/patch-VERSION/` and are gitignored.

---

### 7 Files Bumped per Patch

Every `/release patch` run touches exactly these files:

| # | File | What changes |
|---|------|--------------|
| 1 | `js/constants.js` | `APP_VERSION` string |
| 2 | `sw.js` | `CACHE_NAME` — auto-stamped by pre-commit hook (`devops/hooks/stamp-sw-cache.sh`); no manual edit needed |
| 3 | `CHANGELOG.md` | New version section with bullets |
| 4 | `docs/announcements.md` | Prepend one-line entry to What's New; trim to 3–5 entries |
| 5 | `js/about.js` | `getEmbeddedWhatsNew()` and `getEmbeddedRoadmap()` — must mirror `announcements.md` exactly |
| 6 | `version.json` | `version` + `releaseDate` fields |
| 7 | wiki (via `wiki-update` skill) | `release-workflow.md` and related pages updated as part of the wiki system |

`announcements.md` and `js/about.js` (files 4 and 5) **must stay in sync** — HTTP users read the former via `fetch()`; `file://` users fall back to the latter.

---

## `/start-patch` — Session Start

Before running `/release patch`, use `/start-patch` to orient the session:

1. Fetches open Linear issues for the StakTrakr team, ranked by priority
2. Presents the list to the user
3. User picks the issue to work on
4. Hands off to `/release patch` with the selected issue as context

This ensures every patch has a Linear issue anchor before any code is written.

---

## `/release patch` — Full Flow

### Phase 0: Remote Sync Gate (hard gate)

```bash
git fetch origin
git rev-list HEAD..origin/dev --count
```

If the count is greater than 0: **STOP.** Pull first, then restart.

```bash
git pull origin dev
```

### Phase 0a: Version Lock Check

```bash
cat devops/version.lock 2>/dev/null || echo "UNLOCKED"
```

- Locked and not expired → stop, report to user
- Locked but expired (>30 min) → take over, log takeover in mem0
- Unlocked → proceed: compute `next_version = APP_VERSION + 1 (PATCH)`, write lock, create worktree

### Phase 1: Implement + Version Bump

All work happens inside `.claude/worktrees/patch-VERSION/`. The skill bumps all 7 files, then presents a release plan for user confirmation before writing anything.

### Phase 2: Verify

Grep for the new version string in all 7 files. Confirm `announcements.md` has 3–5 What's New entries, `about.js` mirrors it exactly, and `version.json` has today's date.

### Phase 3: Commit

```bash
git add js/constants.js sw.js CHANGELOG.md docs/announcements.md js/about.js version.json
git commit -m "vNEW_VERSION — TITLE"
```

Commit message format: `vNEW_VERSION — TITLE` (em dash, not hyphen). Include `STAK-XX` references if applicable.

### Phase 4: Push + Draft PR to `dev`

```bash
git push origin patch/VERSION
gh pr create --base dev --head patch/VERSION --draft --label "codacy-review" \
  --title "vNEW_VERSION — brief description" \
  --body "..."
```

Cloudflare Pages generates a preview URL for every PR branch. QA the preview before merging.

> PR always targets `dev`, never `main`.

### Post-Merge Cleanup

After the PR merges to `dev`:

```bash
# Tag the patch on dev (breadcrumb for changelog reconstruction)
git fetch origin dev
git tag vNEW_VERSION origin/dev
git push origin vNEW_VERSION

# Remove the worktree
git worktree remove .claude/worktrees/patch-VERSION --force

# Delete local and remote branches
git branch -d patch/VERSION
git push origin --delete patch/VERSION

# Release the version lock
rm -f devops/version.lock
```

Note: this tag lands on `dev`, not `main`. It is NOT a GitHub Release — it appears only in the Tags tab. The actual GitHub Release is created in Phase 5 after the `dev → main` merge.

---

## `/ship` — Batched `dev → main` Release (Phase 4.5)

Run only when the user explicitly says "ready to ship", "release", or "merge to main". Never runs automatically.

### What it does

1. Audits `dev` — lists all commits and version tags not yet on `main`
2. Fetches Linear issue titles for all referenced `STAK-###` identifiers
3. Creates the `dev → main` PR with a comprehensive title and changelog sourced from the version tags
4. Marks the PR ready: `gh pr ready [number]`
5. Runs `/pr-resolve` to clear all Codacy and Copilot review threads
6. After merge: creates the GitHub Release targeting `main` (Phase 5) — **mandatory**

### Why version tags are the changelog source

Each patch tag (`v3.32.24`) is a breadcrumb. By collecting all tags on `dev` that haven't merged to `main` yet, the skill assembles an accurate changelog without relying on commit message wording. This is more reliable than reading raw commit messages, which may be terse or out of order.

### Phase 5: GitHub Release (mandatory post-merge)

```bash
git fetch origin main
gh release create vNEW_VERSION \
  --target main \
  --title "vNEW_VERSION — TITLE" \
  --latest \
  --notes "..."
```

Without this step, the GitHub Releases page shows a stale version and the "Latest" badge is wrong. `version.json`'s `releaseUrl` points to `/releases/latest`, which resolves to the most recent GitHub Release — so this must be created for the URL to resolve correctly.

---

## Common Mistakes

| Mistake | Consequence | Correct behavior |
|---------|-------------|-----------------|
| Skipping the remote sync gate | Worktree is created from a stale HEAD; PR silently drops remote commits | Always run `git pull origin dev` before `/release patch` |
| Batching multiple features under one patch | Version history becomes ambiguous; changelog is harder to reconstruct | One meaningful change = one patch |
| Pushing directly to `dev` or `main` | Blocked by branch protection; Codacy gate will reject | Always use a PR |
| Creating a `dev → main` PR automatically | Ships code before QA | Phase 4.5 only runs when user explicitly requests it |
| Skipping Phase 5 (GitHub Release) | `version.json` `releaseUrl` resolves to stale release; "Latest" badge is wrong | Always create the GitHub Release after `dev → main` merge |
| Editing `announcements.md` without updating `about.js` | HTTP users and `file://` users see different What's New content | Keep both files in sync at all times |
| Forgetting to delete `version.lock` after cleanup | Next agent sees a stale lock and stops unnecessarily | `rm -f devops/version.lock` is part of cleanup |

---

## Related Pages

- [Service Worker](service-worker.md) — `sw.js` cache name auto-stamp, CORE_ASSETS maintenance
- [Frontend Overview](frontend-overview.md) — file load order, `index.html` script block, `js/constants.js` role

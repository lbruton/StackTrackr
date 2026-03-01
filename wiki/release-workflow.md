---
title: Release Workflow
category: frontend
owner: staktrakr
lastUpdated: v3.33.19
date: 2026-03-01
sourceFiles:
  - .claude/skills/release/SKILL.md
  - devops/version-lock-protocol.md
relatedPages:
  - service-worker.md
  - frontend-overview.md
---
# Release Workflow

> **Last updated:** v3.33.19 — 2026-03-01
> **Source files:** `.claude/skills/release/SKILL.md`, `devops/version-lock-protocol.md`

## Overview

StakTrakr uses a structured patch versioning workflow. Every meaningful change — bug fix, UX tweak, or feature addition — gets its own version bump, its own worktree, and its own PR to `dev`. This keeps the commit graph clean and gives every release a set of breadcrumb tags that can be reconstructed into a precise changelog.

The two commands that drive this workflow are:

- **`/release patch`** — claims the next version, isolates work in a worktree, bumps version files, commits, and opens a draft PR to `dev`
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
  3  .  33  .  19
```

- `BRANCH` — major branch (rarely changes)
- `RELEASE` — bumped when shipping a batch to `main` via `/release release`
- `PATCH` — bumped after every meaningful committed change via `/release patch`

The current version is always defined in `js/constants.js` as `APP_VERSION`.

---

### Version Lock (`devops/version.lock`)

The lock prevents two concurrent agents from claiming the same version number. It uses a **claims array** model — multiple agents can hold concurrent claims on different version numbers.

**Lock file format** (`devops/version.lock` — gitignored):

```json
{
  "claims": [
    {
      "version": "3.33.20",
      "claimed_by": "claude / STAK-XX feature name",
      "issue": "STAK-XX",
      "claimed_at": "2026-03-01T10:00:00Z",
      "expires_at": "2026-03-01T10:30:00Z"
    },
    {
      "version": "3.33.21",
      "claimed_by": "user / local hotfix",
      "issue": null,
      "claimed_at": "2026-03-01T10:05:00Z",
      "expires_at": "2026-03-01T10:35:00Z"
    }
  ]
}
```

- TTL is 30 minutes per claim. On any read, expired entries are pruned before computing the next available version.
- No agent ever takes over another agent's version — each claim is independently owned.
- If an agent's claim expires with no PR merged, the version is effectively skipped. Minor gaps in the version sequence are acceptable.

---

### Worktrees (`.claude/worktrees/`)

Each patch gets an isolated filesystem via `git worktree`. All file edits, version bumps, and commits happen inside the worktree — not in the main `dev` working tree.

```bash
# Created automatically by /release patch after the lock is written
git worktree add .claude/worktrees/patch-3.32.25 -b patch/3.32.25
```

Worktrees are stored at `.claude/worktrees/patch-VERSION/` and are gitignored.

---

### Files Updated per Patch

Every `/release patch` run updates version information across these files:

| # | File | What changes | Edit type |
|---|------|--------------|-----------|
| 1 | `js/constants.js` | `APP_VERSION` string | Manual |
| 2 | `sw.js` | `CACHE_NAME` — auto-stamped by pre-commit hook (`devops/hooks/stamp-sw-cache.sh`) | Automatic (hook) |
| 3 | `CHANGELOG.md` | New version section with bullets | Manual |
| 4 | `docs/announcements.md` | Prepend one-line entry to What's New; trim to 3–5 entries | Manual |
| 5 | `js/about.js` | `getEmbeddedWhatsNew()` and `getEmbeddedRoadmap()` — must mirror `announcements.md` exactly | Manual |
| 6 | `version.json` | `version` + `releaseDate` fields | Manual |

**5 files are manually edited** by the release skill. `sw.js` is auto-stamped by the pre-commit hook — no manual edit needed. Seed data files (`data/spot-history-*.json`) are staged conditionally if the poller has written new entries.

After a successful commit, the `wiki-update` skill is dispatched as a background task to update any affected wiki pages — this is a post-commit step, not one of the version bump files.

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

### Phase 0a: Version Lock Claim

```bash
cat devops/version.lock 2>/dev/null || echo "UNLOCKED"
```

1. Read and prune expired claims from the `claims` array (remove entries where `expires_at` < now)
2. Find the highest `version` among active claims (or read `APP_VERSION` from `js/constants.js` if no active claims)
3. Increment the PATCH component by 1 — this is your claimed version
4. Append your claim to the `claims` array and write the file
5. Create the worktree: `git worktree add .claude/worktrees/patch-VERSION -b patch/VERSION`

### Phase 1: Implement + Version Bump

All work happens inside `.claude/worktrees/patch-VERSION/`. The skill bumps version files, then presents a release plan for user confirmation before writing anything.

### Phase 2: Verify

Grep for the new version string in all version files. Confirm `announcements.md` has 3–5 What's New entries, `about.js` mirrors it exactly, and `version.json` has today's date.

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

# Release the version lock — remove your claim entry by version match
# Leave other active claims intact. Delete the file only when no claims remain.
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
| Forgetting to remove your claim from `version.lock` after cleanup | Next agent sees a stale claim and computes a version gap unnecessarily | Remove your claim entry; delete the file only when no claims remain |

---

## Related Pages

- [Service Worker](service-worker.md) — `sw.js` cache name auto-stamp, CORE_ASSETS maintenance
- [Frontend Overview](frontend-overview.md) — file load order, `index.html` script block, `js/constants.js` role

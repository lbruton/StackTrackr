---
name: release
description: StakTrakr release workflow for version bump, changelog/announcements sync, seed-data inclusion, validation, and PR preparation.
---

# Release — StakTrakr

Use for `release` or `patch` version updates.

## Goals

- Keep all versioned artifacts in sync.
- Include generated seed spot-history updates when present.
- Produce a clean commit and PR summary.

## Inputs

- `release`: bump release segment (`X.Y.Z` -> `X.(Y+1).0`)
- `patch`: bump patch segment (`X.Y.Z` -> `X.Y.(Z+1)`)
- `dry-run`: plan and preview only, no writes

If mode is missing, ask user to choose `release` or `patch`.

## Files To Sync

1. `js/constants.js` (`APP_VERSION`)
2. `sw.js` (`CACHE_NAME` contains version)
3. `CHANGELOG.md` (new top section)
4. `docs/announcements.md` (What's New and roadmap)
5. `js/about.js` (embedded What's New / roadmap mirrors announcements)
6. `version.json` (`version` + `releaseDate`)
7. `data/spot-history-*.json` (include updates if present)

## Workflow

### Phase 1: Gather and plan

1. Read current version from `js/constants.js`.
2. Compute next version.
3. Run seed data check (`seed-sync` flow) to detect/stage generated updates.
4. Draft release title and summary bullets from actual changes.

### Phase 2: Apply version updates

1. Update `APP_VERSION`.
2. Update service-worker cache version string.
3. Prepend changelog entry for new version.
4. Update announcements with latest 3-5 What's New entries and concise roadmap.
5. Mirror announcements into `js/about.js` embedded fallback sections.
6. Update `version.json` with new version and today's date (`YYYY-MM-DD`).

### Phase 3: Validate

1. Verify all sync files contain the new version where expected.
2. Ensure announcements and embedded about content are aligned.
3. Check seed data integrity if changed (valid JSON and sensible diff).
4. Run lint/check commands relevant to edited files when feasible.

### Phase 4: Commit and Draft PR

1. Stage release files and any approved seed files.
2. Create release commit message in repo format (`vX.Y.Z -- ...`).
3. Push to remote: `git push origin dev`.
4. Check for an existing draft PR: `gh pr list --base main --head dev --state open --json number,isDraft`.
   - **No PR exists**: Create as **draft** (`--draft`) with a brief WIP body noting it will be updated before merge.
   - **Draft PR exists**: Update the body to append new changes.
5. Do NOT mark the PR ready — that happens in Phase 4.5 when the branch is QA-complete.

### Phase 4.5: Mark PR Ready (Pre-Merge — separate invocation)

Run only when the user confirms the branch is QA-complete and ready to ship.

1. `git log --oneline main..dev` — audit every commit since last merge.
2. Collect all STAK-### references; fetch Linear titles for accuracy.
3. Write a **comprehensive PR title and body** covering everything in the branch (not just day-1 work).
4. `gh pr edit [number] --title "..." --body "..."` — update the PR.
5. `gh pr ready [number]` — remove draft status.
6. Run `/pr-resolve` to clear all Codacy/Copilot threads before final review.
7. Mark all STAK-### issues Done in Linear.

### Phase 5: GitHub Release (Post-Merge Only)

Create the GitHub Release **after** the PR merges to main. Always target `main`, never target dev.

```bash
git fetch origin main
gh release create vX.Y.Z --target main --title "vX.Y.Z — TITLE" --latest --notes "..."
```

## Guardrails

- Never bump only one version file.
- Never leave announcements/about drift.
- Never ignore seed updates that were intentionally generated for release.
- If unrelated dirty changes exist, ask whether to include or exclude.
- Never create a GitHub Release targeting dev — always post-merge to main.
- Never mark PR ready without first updating the title/body to reflect the full branch contents.

## Reporting

At completion provide:

1. New version.
2. Exact files changed.
3. PR status (draft or ready).
4. Any residual risks or manual follow-ups.

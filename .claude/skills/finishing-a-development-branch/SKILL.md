---
name: finishing-a-development-branch
description: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup
---

# Finishing a Development Branch

## Overview

Guide completion of development work by presenting clear options and handling chosen workflow.

**Core principle:** Verify tests → Wiki Update Gate → Present options → Execute choice → Clean up.

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

> **⛔ StakTrakr workflow — read before Step 2:**
> - `patch/*` branches always PR to **`dev`** — never to `main`
> - `dev → main` merges are ONLY allowed via Phase 4.5 of `/release`, and ONLY when the user has explicitly said "release" or "ready to ship" in this session
> - **Completing implementation ≠ releasing.** The user decides when to release.

## The Process

### Step 1: Verify Tests

**Before presenting options, verify tests pass:**

```bash
# Run project's test suite
npm test / cargo test / pytest / go test ./...
```

**If tests fail:**
```
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed with merge/PR until tests pass.
```

Stop. Don't proceed to Step 2.

**If tests pass:** Continue to Step 2.

### Step 2: Determine Base Branch

**First, check the current branch name** — this determines the correct base:

```bash
git branch --show-current
```

| Current branch pattern | Correct base | Notes |
|------------------------|--------------|-------|
| `patch/*` or `patch-*` | **`dev`** | StakTrakr patch workflow — NEVER target main |
| `feature/*`, `fix/*`, etc. | Check CLAUDE.md PR Lifecycle section | May still be `dev` |
| `dev` | **`main`** | Only allowed via Phase 4.5, requires explicit user "release" instruction |

```bash
# Only fall back to git merge-base if branch name gives no clear signal
git merge-base HEAD dev 2>/dev/null || git merge-base HEAD main 2>/dev/null
```

> **⛔ StakTrakr rule:** If on a `patch/*` branch, the base is **always `dev`**. Never propose merging a patch branch to `main`. If the detected base would be `main` and you are NOT on the `dev` branch, STOP and ask the user before proceeding.

### Step 2.5: Wiki Update Gate (mandatory before PR)

Run before creating any PR:

1. **Identify changed files:**
   ```bash
   git diff --name-only HEAD~1..HEAD
   ```

2. **If any changed files match frontend patterns** (`js/`, `sw.js`, `index.html`):
   → Dispatch wiki-update (invoke `wiki-update` skill as a background Task agent)

3. **If any changed files match API/infrastructure patterns** (`js/api.js`, `js/api-health.js`, `docs/devops/`, `.claude/skills/api-infrastructure/`):
   → Add a comment to the PR after creation:
   ```
   ⚠️ API-related change — verify StakTrakrWiki infrastructure pages are current.
   Check: health.md, fly-container.md, spot-pipeline.md as applicable.
   ```

4. **If instruction files changed** (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.github/copilot-instructions.md`):
   → Run `/sync-instructions` after the PR is created.

This extends the wiki-update pattern from `/release` Phase 3 into the non-release commit path.

### Step 3: Present Options

Present exactly these 4 options:

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request → <base-branch>
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

**Don't add explanation** - keep options concise.

### Step 4: Execute Choice

#### Option 1: Merge Locally

```bash
# Switch to base branch
git checkout <base-branch>

# Pull latest
git pull

# Merge feature branch
git merge <feature-branch>

# Verify tests on merged result
<test command>

# If tests pass
git branch -d <feature-branch>
```

Then: Cleanup worktree (Step 5)

#### Option 2: Push and Create PR

```bash
# Push branch
git push -u origin <feature-branch>

# Create PR — ALWAYS use the base determined in Step 2 (never assume main)
gh pr create --base <base-branch> --title "<title>" --body "$(cat <<'EOF'
## Summary
<2-3 bullets of what changed>

## Test Plan
- [ ] <verification steps>
EOF
)"
```

> **⛔ Reminder:** `<base-branch>` must come from Step 2. For `patch/*` branches it is always `dev`.

Then: Cleanup worktree (Step 5)

#### Option 3: Keep As-Is

Report: "Keeping branch <name>. Worktree preserved at <path>."

**Don't cleanup worktree.**

#### Option 4: Discard

**Confirm first:**
```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Wait for exact confirmation.

If confirmed:
```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

Then: Cleanup worktree (Step 5)

### Step 5: Cleanup Worktree

**For Options 1, 2, 4:**

Check if in worktree:
```bash
git worktree list | grep $(git branch --show-current)
```

If yes:
```bash
git worktree remove <worktree-path>
```

**For Option 3:** Keep worktree.

## Quick Reference

| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------------|----------------|
| 1. Merge locally | ✓ | - | - | ✓ |
| 2. Create PR | - | ✓ | ✓ | - |
| 3. Keep as-is | - | - | ✓ | - |
| 4. Discard | - | - | - | ✓ (force) |

## Common Mistakes

**Skipping test verification**
- **Problem:** Merge broken code, create failing PR
- **Fix:** Always verify tests before offering options

**Open-ended questions**
- **Problem:** "What should I do next?" → ambiguous
- **Fix:** Present exactly 4 structured options

**Automatic worktree cleanup**
- **Problem:** Remove worktree when might need it (Option 2, 3)
- **Fix:** Only cleanup for Options 1 and 4

**No confirmation for discard**
- **Problem:** Accidentally delete work
- **Fix:** Require typed "discard" confirmation

**Defaulting to `main` as the base**
- **Problem:** `git merge-base HEAD main` always returns `main`, even for patch branches
- **Fix:** Check branch name first — `patch/*` → base is `dev`

## Red Flags

**Never:**
- Proceed with failing tests
- Merge without verifying tests on result
- Delete work without confirmation
- Force-push without explicit request
- **Target `main` from a `patch/*` branch** — the base is always `dev` for patch branches
- **Merge `dev → main` without explicit user "release" instruction** — this is a protected action

**Always:**
- Verify tests before offering options
- Run the Wiki Update Gate (Step 2.5) before any PR
- Present exactly 4 options
- Get typed confirmation for Option 4
- Clean up worktree for Options 1 & 4 only
- Use the base branch determined in Step 2 — never assume `main`

**Rationalization traps — STOP if you think:**
- "The branch is based on main so I should PR to main" → check the branch name pattern first
- "This is the final step so it should go to main" → only `dev → main` goes to main, and only on user instruction
- "The workflow is complete, time to release" → completing implementation ≠ releasing; user decides when to release

## Integration

**Called by:**
- **subagent-driven-development** (Step 7) - After all tasks complete
- **executing-plans** (Step 5) - After all batches complete

**Pairs with:**
- **using-git-worktrees** - Cleans up worktree created by that skill

---
name: ship
description: Ship dev to main — collect version tags as changelog source, create the dev→main PR, mark it ready, resolve threads, create GitHub Release. ONLY run when user explicitly says "ready to ship", "release", or "merge to main" in this session. Never runs automatically.
allowed-tools: Bash, Read, Task
---

# Ship — StakTrakr (`dev → main`)

**Hard gate:** Only run when the user has explicitly said "ready to ship",
"release", or "merge to main" in the current session. This creates a PR
targeting `main` — an irreversible public action.

## Step 1: Sync gate

```bash
git fetch origin
git log --oneline main..origin/dev
```

If output is empty — nothing to ship. Stop.

Confirm with user before proceeding if anything looks unexpected.

## Step 2: Collect version tags on dev since last main merge

Version tags on `dev` are the breadcrumb trail of every patch. They are more
reliable than commit messages for building the PR summary.

```bash
# All tags reachable from dev but NOT from main
git tag --sort=-version:refname | while read tag; do
  if git merge-base --is-ancestor "$tag" origin/main 2>/dev/null; then
    : # already on main, skip
  elif git merge-base --is-ancestor "$tag" origin/dev 2>/dev/null; then
    echo "$tag"
  fi
done
```

For each tag found, get its commit message title:
```bash
git log --format="%s" "$tag"^.."$tag" | head -1
```

## Step 3: Fetch Linear issue titles

For each `STAK-###` reference found across tag names and commit messages,
call `mcp__claude_ai_Linear__get_issue` to get the current title and URL.
This ensures the PR description is accurate, not just copy-pasted from commits.

## Step 4: Create the `dev → main` PR

Build a comprehensive title from the version tags:
```
vLATEST — [primary change] + [secondary] + [tertiary if notable]
```

```bash
gh pr create --base main --head dev --label "codacy-review" \
  --title "vLATEST_VERSION — [comprehensive title]" \
  --body "$(cat <<'EOF'
## Summary

[One bullet per version tag — user-readable description, not raw commit message]
[Group related patches under a shared heading if applicable]

## Version Tags Shipped

- vX.X.X — [title]
- vX.X.X — [title]
[list all tags from Step 2]

## Linear Issues

- STAK-XX: [title] — [url]
[list all STAK references from Step 3]

## QA Notes

[Anything the reviewer should test or verify before approving]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## Step 5: Mark ready + resolve review threads

```bash
PR_NUMBER=$(gh pr list --base main --head dev --state open --json number --jq '.[0].number')
gh pr ready "$PR_NUMBER"
```

Then run `/pr-resolve` to clear all open Codacy and Copilot review threads
before the PR goes to final review.

## Step 6: Update Linear issues

Mark all referenced STAK-### issues as **Done** — they ship with this merge.

Use `mcp__claude_ai_Linear__update_issue` with `state: "Done"` for each.

## Step 7: After the PR merges to main — GitHub Release (MANDATORY)

**Do not skip this.** The GitHub Release is what users and `version.json`'s
`releaseUrl` resolve to. Without it, the Releases page shows a stale version.

```bash
git fetch origin main

# Get the latest version from main
LATEST=$(git tag --merged origin/main --sort=-version:refname | grep '^v3\.' | head -1)

# Get changelog section for this version
NOTES=$(awk "/## \[${LATEST#v}\]/,/^---$/" /path/to/StakTrakr/CHANGELOG.md | head -20)

gh release create "$LATEST" \
  --target main \
  --title "$LATEST — [title from CHANGELOG]" \
  --latest \
  --notes "$NOTES"

# Verify
gh release list --limit 3
# Confirm new version shows as Latest
```

## Step 8: Confirm

```
Ship complete!

Version:  vLATEST
PR:       #XX merged
Release:  https://github.com/lbruton/StakTrakr/releases/tag/vLATEST
Linear:   STAK-XX → Done
```

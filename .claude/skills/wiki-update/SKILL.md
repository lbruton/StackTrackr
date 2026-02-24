---
name: wiki-update
description: Update StakTrakrWiki pages affected by the current patch. Called from /release patch Phase 3 after the version bump commit. Dispatches a background subagent — does not block PR creation. Triggers on any release patch that touches JS, CSS, skill, or devops files.
allowed-tools: Bash, Read, Task
---

# Wiki Update

Called automatically from `/release patch` Phase 3 after the version bump commit.
Identifies which wiki pages are affected by this patch's diff and rewrites only
those pages. Runs as a background Task agent — Phase 4 (PR creation) does not wait.

## File → Page Mapping

| Source file pattern | Wiki page(s) |
|---------------------|-------------|
| `index.html`, `sw.js`, `js/constants.js` | `frontend-overview.md` |
| `js/constants.js`, `js/utils.js` | `data-model.md` |
| `js/utils.js` | `storage-patterns.md`, `dom-patterns.md` |
| `js/cloud-sync.js`, `js/cloud-storage.js` | `sync-cloud.md` |
| `js/retail-view-modal.js`, `js/retail.js`, `js/retail-*.js` | `retail-modal.md` |
| `js/api.js`, `js/api-health.js` | `api-consumption.md` |
| `.claude/skills/release/`, `.claude/skills/ship/`, `devops/` | `release-workflow.md` |
| `sw.js`, `devops/hooks/stamp-sw-cache.sh` | `service-worker.md` |

## Steps

### Step 1: Identify affected pages

```bash
CHANGED=$(git diff HEAD~1 --name-only)
echo "Changed files:"
echo "$CHANGED"
```

Walk the mapping table above. Collect the set of wiki pages to update.

If no source files match any pattern (e.g. pure data or image change), exit with:
`Wiki update: no relevant files changed — skipping.`

### Step 2: For each affected page, rewrite it

Re-read the relevant source files from the current working tree.
Use the same structure as the initial sweep:

```markdown
# [Title]

> **Last updated:** vNEW_VERSION — YYYY-MM-DD
> **Source files:** `js/filename.js`, ...

## Overview
## Key Rules (read before touching this area)
## Architecture
## Common Mistakes
## Related Pages
```

**Update the `> **Last updated:**` line** with the new version and today's date.

### Step 3: Push each updated page to StakTrakrWiki

```bash
# Write content to temp file
cat > /tmp/PAGENAME.md << 'CONTENT'
[updated page content]
CONTENT

# Get SHA (required for updating existing files)
SHA=$(gh api "repos/lbruton/StakTrakrWiki/contents/PAGENAME.md" --jq '.sha' 2>/dev/null || echo "")

# Push
ARGS=(--method PUT \
  -f message="sync: vVERSION — update PAGENAME" \
  -f content="$(base64 -i /tmp/PAGENAME.md)")
[ -n "$SHA" ] && ARGS+=(-f sha="$SHA")
gh api "repos/lbruton/StakTrakrWiki/contents/PAGENAME.md" "${ARGS[@]}"
```

### Step 4: Report

Output when done:
```
Wiki updated: [list of pages pushed]
```

## Integration point in release skill

This skill is invoked after the version bump commit in Phase 3 of `/release patch`:

> After committing the version bump, invoke the `wiki-update` skill via the Skill
> tool as a background Task agent. Do not wait for it before proceeding to Phase 4.

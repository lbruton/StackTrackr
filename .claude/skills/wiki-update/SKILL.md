---
name: wiki-update
description: Update in-repo wiki pages affected by the current patch. Called from /release patch Phase 3. Reads YAML frontmatter sourceFiles for change detection. Edits wiki/*.md directly — no cross-repo PRs.
allowed-tools: Bash, Read, Edit, Glob, Grep
---

# Wiki Update

Called automatically from `/release patch` Phase 3 after the version bump commit.
Identifies which wiki pages are affected by this patch's diff, rewrites only those
pages, and commits the changes with the same patch branch. No separate PR needed.

Runs as a background Task agent — Phase 4 (PR creation) does not wait.

---

## Change Detection: Primary Method (Frontmatter sourceFiles)

Parse YAML frontmatter from every `wiki/*.md` file. Each page declares its source
files in the `sourceFiles` array. Cross-reference against changed files to find
affected pages.

### Step 1: Get changed files and project root

```bash
ROOT=$(git rev-parse --show-toplevel)
CHANGED=$(git diff HEAD~1 --name-only)
echo "Project root: $ROOT"
echo "Changed files:"
echo "$CHANGED"
```

### Step 2: Parse frontmatter sourceFiles from all wiki pages

For each `wiki/*.md` file, extract the `sourceFiles` list from YAML frontmatter:

```bash
for page in "$ROOT"/wiki/*.md; do
  # Extract sourceFiles block between frontmatter delimiters
  awk '/^---$/{n++; next} n==1 && /^sourceFiles:/{found=1; next} n==1 && found && /^  - /{print FILENAME, $2; next} found && !/^  -/{found=0}' "$page"
done
```

For each page, if ANY of its declared `sourceFiles` appear in `CHANGED`, that page
needs updating.

### Step 3: Handle empty sourceFiles

Pages with `sourceFiles: []` are infrastructure-owned or meta pages. Skip them
during automatic updates. Flag them if related patterns are detected (see
Infrastructure section below).

---

## Change Detection: Fallback Method (Hardcoded Mapping)

If frontmatter parsing fails or as a secondary cross-check, use this hardcoded
mapping table:

| Source file pattern | Wiki page(s) |
|---------------------|-------------|
| `index.html`, `sw.js`, `js/constants.js` | `frontend-overview.md` |
| `js/constants.js`, `js/utils.js` | `data-model.md` |
| `js/utils.js`, `js/constants.js` | `storage-patterns.md` |
| `js/utils.js`, `js/about.js`, `js/init.js` | `dom-patterns.md` |
| `js/cloud-sync.js`, `js/cloud-storage.js` | `sync-cloud.md` |
| `js/retail-view-modal.js`, `js/retail.js`, `js/retail-*.js` | `retail-modal.md` |
| `js/api.js`, `js/api-health.js` | `api-consumption.md` |
| `.claude/skills/release/`, `.claude/skills/ship/`, `devops/` | `release-workflow.md` |
| `sw.js`, `devops/hooks/stamp-sw-cache.sh` | `service-worker.md` |
| `js/backup.js`, `js/restore.js` | `backup-restore.md` |
| `js/image-*.js`, `js/capture.js` | `image-pipeline.md` |

**Use the frontmatter method as primary.** The hardcoded table is a fallback for
pages with missing or malformed frontmatter.

---

## Step 4: Rewrite affected pages

For each affected page:

1. **Read the relevant source files** from the current working tree
2. **Read the existing wiki page** to preserve structure and non-stale content
3. **Rewrite only the sections that reference changed code** — preserve the page's
   overall structure, voice, and organization
4. **Update frontmatter fields:**
   - `lastUpdated:` set to the new `APP_VERSION`
   - `date:` set to today's date (`YYYY-MM-DD`)
   - Verify `sourceFiles` is still accurate; add/remove entries if the patch changed
     which files are relevant
5. **Update the inline header** to match frontmatter:
   ```markdown
   > **Last updated:** vNEW_VERSION — YYYY-MM-DD
   ```

### Page structure (preserve this layout)

```markdown
---
title: [Page Title]
category: [frontend|infrastructure|meta]
owner: [staktrakr|staktrakr-api]
lastUpdated: vNEW_VERSION
date: YYYY-MM-DD
sourceFiles:
  - file1.js
  - file2.js
relatedPages:
  - other-page.md
---
# [Title]

> **Last updated:** vNEW_VERSION — YYYY-MM-DD
> **Source files:** `file1.js`, `file2.js`

## Overview
## Key Rules (read before touching this area)
## Architecture
## Common Mistakes
## Related Pages
```

---

## Step 5: Commit with the patch

Wiki changes are committed as part of the same patch branch. No separate PR needed.

```bash
ROOT=$(git rev-parse --show-toplevel)
git add "$ROOT/wiki/"
# Changes will be included in the patch commit or as a follow-up commit
# on the same branch — the release skill handles the actual commit
```

If wiki changes happen after the version bump commit, add a follow-up commit:

```bash
git add "$ROOT/wiki/"
git commit -m "docs: update wiki pages for vVERSION

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Infrastructure Pages — Flag Only

Infrastructure pages are owned by StakTrakrApi Claude. StakTrakr Claude should
**flag** when they may be stale — do not rewrite them directly.

### Infrastructure page indicators

| Changed file (StakTrakr) | May affect wiki page | Owner |
|--------------------------|----------------------|-------|
| `js/api.js`, `js/api-health.js` | `api-consumption.md` (frontend-owned, OK to edit) | staktrakr |
| `js/api.js`, `js/api-health.js` | `health.md`, `rest-api-reference.md` | staktrakr-api |
| `.claude/skills/api-infrastructure/` | `architecture-overview.md` | staktrakr-api |
| `CLAUDE.md` (API section) | `health.md`, `fly-container.md` | staktrakr-api |

When any infrastructure-owned page may be affected, output a warning:

```
WARNING: API-related change detected — the following infrastructure wiki pages
may need updating by StakTrakrApi Claude:
- health.md
- fly-container.md
- spot-pipeline.md (as applicable)
These pages are owned by staktrakr-api — flagging only, not rewriting.
```

### How to identify infrastructure pages

Check the `owner` field in frontmatter. Pages with `owner: staktrakr-api` are
infrastructure-owned. Pages with `owner: staktrakr` are frontend-owned and safe
to rewrite.

---

## No-op exit

If no source files in `CHANGED` match any page's `sourceFiles` (and no fallback
mapping matches), exit with:

```
Wiki update: no relevant files changed — skipping.
```

---

## Integration point in release skill

This skill is invoked after the version bump commit in Phase 3 of `/release patch`:

> After committing the version bump, invoke the `wiki-update` skill via the Skill
> tool as a background Task agent. Do not wait for it before proceeding to Phase 4.

---

## Edge Cases

- **Renamed source files:** If a file was renamed in this patch, the old name in
  `sourceFiles` won't match. The fallback mapping may catch it. After rewriting,
  update the page's `sourceFiles` to use the new filename.
- **New wiki page needed:** If the patch introduces a new subsystem with no
  existing wiki page, flag it: `"New subsystem detected — consider creating a wiki
  page for [topic]."` Do not auto-create pages.
- **Multiple patches in flight:** Each patch branch updates its own wiki pages
  independently. Merge conflicts in `wiki/` are resolved like any other file.
- **Deleted source files:** If a `sourceFiles` entry no longer exists on disk,
  flag the page for manual review rather than silently removing the reference.

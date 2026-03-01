---
name: wiki-audit
description: Audit in-repo wiki/ pages against the codebase — validates frontmatter, cross-checks claims, fixes stale content. Changes commit with the current branch.
allowed-tools: Bash, Read, Edit, Glob, Grep
---

# Wiki Audit

Reads every wiki page in the `wiki/` subfolder, validates frontmatter, cross-checks
key claims against the StakTrakr codebase, fixes stale content in place, and reports
results. All changes are committed to the current branch — no cross-repo PRs needed.

**Prerequisite:** Must be on a feature/fix branch or in a worktree. If on a protected
branch (`dev` or `main`), warn the user and exit without making changes.

## How to invoke

Run `/wiki-audit`. The agent handles everything in the current working tree.

---

## Pre-flight Check

```bash
ROOT=$(git rev-parse --show-toplevel)
BRANCH=$(git branch --show-current)

# Safety: refuse to edit on protected branches
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "dev" ]; then
  echo "ERROR: wiki-audit cannot edit directly on '$BRANCH'."
  echo "Create a worktree or feature branch first."
  exit 1
fi

echo "Auditing wiki/ on branch: $BRANCH"
echo "Project root: $ROOT"
```

---

## Phase 1: Frontmatter Validation

For every `wiki/*.md` file, validate the YAML frontmatter contains all required fields
and that referenced files exist on disk.

### Required frontmatter fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Page title |
| `category` | string | One of: `frontend`, `infrastructure`, `meta` |
| `owner` | string | One of: `staktrakr`, `staktrakr-api` |
| `lastUpdated` | string | Version string (e.g., `v3.33.18`) |
| `date` | string | ISO date (`YYYY-MM-DD`) |
| `sourceFiles` | list | Source file paths (may be empty `[]` for infra/meta pages) |
| `relatedPages` | list | Related wiki page filenames (may be empty `[]`) |

### Validation checks

```bash
ROOT=$(git rev-parse --show-toplevel)

for page in "$ROOT"/wiki/*.md; do
  filename=$(basename "$page")

  # Skip non-content files
  case "$filename" in
    README.md|CHANGELOG.md|_sidebar.md|index.html) continue ;;
  esac

  echo "--- Validating: $filename ---"

  # 1. Check frontmatter delimiters exist
  # 2. Check each required field is present
  # 3. Check category is valid enum
  # 4. Check owner is valid enum
  # 5. Check date format is YYYY-MM-DD
done
```

### sourceFiles existence check

For each entry in `sourceFiles`, verify the file exists on disk relative to `$ROOT`:

```bash
# For each sourceFile entry in frontmatter:
if [ ! -f "$ROOT/$SOURCE_FILE" ]; then
  echo "BROKEN: $filename references '$SOURCE_FILE' — file not found"
fi
```

### relatedPages existence check

For each entry in `relatedPages`, verify the wiki page exists:

```bash
# For each relatedPage entry in frontmatter:
if [ ! -f "$ROOT/wiki/$RELATED_PAGE" ]; then
  echo "BROKEN: $filename references related page '$RELATED_PAGE' — not found"
fi
```

---

## Phase 2: Content Cross-checks

Run the following checks against the codebase. For each check, compare the wiki
page's claims against the actual code.

### Check 1: Script count — `frontend-overview.md`

```bash
ROOT=$(git rev-parse --show-toplevel)
ACTUAL=$(grep -c '<script' "$ROOT/index.html")
echo "Actual script tags in index.html: $ACTUAL"
# Verify frontend-overview.md states the correct count
```

### Check 2: ALLOWED_STORAGE_KEYS — `data-model.md`

```bash
grep -A 60 'ALLOWED_STORAGE_KEYS = \[' "$ROOT/js/constants.js"
# Verify data-model.md accurately describes the storage key pattern
# (does not need to list every key — should direct readers to constants.js)
```

### Check 3: CORE_ASSETS — `service-worker.md`

```bash
grep -A 80 'CORE_ASSETS = \[' "$ROOT/sw.js" | head -85
# Verify service-worker.md describes CORE_ASSETS correctly
```

### Check 4: Retail globals — `retail-modal.md`

```bash
grep 'window\.' "$ROOT/js/retail.js" | grep -v '//' | head -20
# Verify retail-modal.md lists the correct window.* exports
```

### Check 5: API endpoints — `api-consumption.md`

```bash
grep 'api\.staktrakr\|api2\.staktrakr' "$ROOT/js/api.js" | head -10
# Verify endpoint names/URLs in wiki match code
```

### Check 6: APP_VERSION — `release-workflow.md`

```bash
grep 'const APP_VERSION' "$ROOT/js/constants.js"
# Verify release-workflow.md references the correct version format
```

### Check 7: Last-updated version freshness

```bash
CURRENT_VERSION=$(grep 'const APP_VERSION' "$ROOT/js/constants.js" | grep -o "'[^']*'" | tr -d "'")
echo "Current APP_VERSION: $CURRENT_VERSION"

for page in "$ROOT"/wiki/*.md; do
  filename=$(basename "$page")
  case "$filename" in
    README.md|CHANGELOG.md|_sidebar.md|index.html) continue ;;
  esac

  PAGE_VERSION=$(awk '/^lastUpdated:/{print $2}' "$page")
  echo "$filename: lastUpdated=$PAGE_VERSION"
done
# Flag pages more than 2 patch versions behind current
```

### Check 8: sourceFiles coverage — cross-reference

For each frontend page (`owner: staktrakr`), verify that the `sourceFiles` listed
in frontmatter are still the correct source files for that page's topic. If a source
file has been renamed, split, or deleted, flag the discrepancy.

### Check 9: Sidebar completeness — `_sidebar.md`

```bash
# Count content pages (exclude README, CHANGELOG, _sidebar, index.html)
CONTENT_PAGES=$(ls "$ROOT"/wiki/*.md | xargs -I{} basename {} | grep -v -E '^(README|CHANGELOG|_sidebar)\.md$' | sort)
SIDEBAR_LINKS=$(grep -oE '\([^)]*\.md\)' "$ROOT/wiki/_sidebar.md" | tr -d '()' | sort)

# Diff to find pages missing from sidebar
comm -23 <(echo "$CONTENT_PAGES") <(echo "$SIDEBAR_LINKS")
```

---

## Phase 3: Fix Stale Content

For each page with stale or incorrect content:

1. **Re-read the relevant source files** from the current working tree
2. **Rewrite only the stale sections** — preserve overall structure, voice, and
   organization
3. **Update frontmatter:**
   - `lastUpdated:` set to current `APP_VERSION`
   - `date:` set to today's date
   - Fix any broken `sourceFiles` or `relatedPages` references
4. **Update the inline header** to match frontmatter
5. **Fix missing required frontmatter fields** — add with sensible defaults

### Ownership rules

- Pages with `owner: staktrakr` — audit AND fix
- Pages with `owner: staktrakr-api` — audit but **flag only**, do not rewrite
  content (infrastructure pages are owned by StakTrakrApi Claude)
- If `owner` field is missing, infer from `category`: `frontend` = staktrakr,
  `infrastructure` = staktrakr-api, `meta` = staktrakr

---

## Phase 4: Commit and Report

```bash
ROOT=$(git rev-parse --show-toplevel)

# Stage all wiki changes
git add "$ROOT/wiki/"

# Check if there are actual changes
if git diff --cached --quiet "$ROOT/wiki/"; then
  echo "Wiki audit: all pages verified OK — no changes needed."
else
  git commit -m "docs: wiki audit — fix stale content

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
  echo "Wiki audit: committed fixes to current branch."
fi
```

---

## Report Format

Output a structured report regardless of whether changes were made:

```
## Wiki Audit Report — YYYY-MM-DD

### Frontmatter Validation
- X pages checked
- Y frontmatter issues found (list each)
- Z broken sourceFile references (list each)
- W broken relatedPage references (list each)

### Content Cross-checks
- Script count: [PASS/FAIL] (expected: N, wiki says: M)
- ALLOWED_STORAGE_KEYS: [PASS/FAIL]
- CORE_ASSETS: [PASS/FAIL]
- Retail globals: [PASS/FAIL]
- API endpoints: [PASS/FAIL]
- APP_VERSION format: [PASS/FAIL]
- Version freshness: X pages current, Y pages stale

### Pages Fixed
- [list each page with brief description of fix]

### Pages Flagged (infrastructure-owned, not edited)
- [list infrastructure pages that may be stale]

### Pages Verified OK
- [list accurate pages]
```

---

## Edge Cases

- **Protected branch detected:** Output error and exit. Do not make any changes.
- **No wiki/ directory:** Output error: `"wiki/ directory not found at $ROOT/wiki/"`
- **Frontmatter missing entirely:** Add complete frontmatter block with all required
  fields, inferring values from page content and filename.
- **Page with no content after frontmatter:** Flag as empty but do not delete.
- **Binary files in wiki/:** Skip non-`.md` files silently (e.g., `index.html`).

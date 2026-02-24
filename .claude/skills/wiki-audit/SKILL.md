---
name: wiki-audit
description: Background audit of StakTrakrWiki — cross-checks all frontend pages against the current codebase, pushes corrections directly, and reports results as a GitHub issue. Dispatches a background Task agent and returns immediately. Use /wiki-audit to trigger.
allowed-tools: Bash, Read, Task
---

# Wiki Audit

Spawns a background Task agent that reads every frontend wiki page, cross-checks
key claims against the StakTrakr codebase, fixes any stale content, and files a
GitHub issue on StakTrakrWiki with the audit report.

**Returns immediately.** Check `lbruton/StakTrakrWiki/issues` for results.

## How to invoke

Run `/wiki-audit`. The background agent handles everything.

## Audit checks (the background agent runs these)

### 1. Script count — `frontend-overview.md`
```bash
ACTUAL=$(grep -c '<script' /path/to/StakTrakr/index.html)
# Verify frontend-overview.md states the correct count
```

### 2. ALLOWED_STORAGE_KEYS — `data-model.md`
```bash
grep -A 60 'ALLOWED_STORAGE_KEYS = \[' /path/to/StakTrakr/js/constants.js
# Verify data-model.md accurately describes the storage key pattern
# (does not need to list every key — should direct readers to constants.js)
```

### 3. CORE_ASSETS — `service-worker.md`
```bash
grep -A 80 'CORE_ASSETS = \[' /path/to/StakTrakr/sw.js | head -85
# Verify service-worker.md describes CORE_ASSETS correctly
```

### 4. Retail globals — `retail-modal.md`
```bash
grep 'window\.' /path/to/StakTrakr/js/retail.js | grep -v '//' | head -20
# Verify retail-modal.md lists the correct window.* exports
```

### 5. API endpoints — `api-consumption.md`
```bash
grep 'api\.staktrakr\|api2\.staktrakr' /path/to/StakTrakr/js/api.js | head -10
# Verify endpoint names/URLs in wiki match code
```

### 6. APP_VERSION in release-workflow.md
```bash
grep 'APP_VERSION' /path/to/StakTrakr/js/constants.js | grep 'const APP_VERSION'
# Verify release-workflow.md references the correct version format
```

### 7. Last-updated timestamps
```bash
# Verify each page's "> **Last updated:**" version matches or is close to
# the current APP_VERSION — flag pages more than 2 versions behind
grep 'APP_VERSION' /path/to/StakTrakr/js/constants.js | grep 'const APP_VERSION'
```

## Fix and push

For each page with stale or incorrect content:

1. Re-read the relevant source files
2. Rewrite only the stale sections (preserve overall structure)
3. Update the `> **Last updated:**` line
4. Push via gh api:

```bash
SHA=$(gh api "repos/lbruton/StakTrakrWiki/contents/PAGENAME.md" --jq '.sha' 2>/dev/null || echo "")
ARGS=(--method PUT \
  -f message="audit: fix stale content in PAGENAME" \
  -f content="$(base64 -i /tmp/PAGENAME.md)")
[ -n "$SHA" ] && ARGS+=(-f sha="$SHA")
gh api "repos/lbruton/StakTrakrWiki/contents/PAGENAME.md" "${ARGS[@]}"
```

## Report

After all checks and fixes, create a GitHub issue:

```bash
gh issue create --repo lbruton/StakTrakrWiki \
  --title "[audit] $(date +%Y-%m-%d)" \
  --body "## Wiki Audit Report — $(date +%Y-%m-%d)

### Pages updated
- [list each page fixed with brief description of what changed]

### Pages verified OK
- [list pages that were accurate]

### Notes
- [anything that couldn't be auto-fixed or needs human review]
"
```

## Write access policy

Pushes fixes directly — no PR, no approval gate. Inaccurate agent-facing docs
cause more harm than an auto-corrected section. Mark genuinely uncertain sections
with `> ⚠️ NEEDS VERIFICATION` rather than leaving stale content.

---
name: wiki-sweep
description: Full re-population of all wiki/ pages. Dispatches parallel agents grouped by category. Use after major refactors or widespread staleness.
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
---

# Wiki Sweep

Re-populates ALL wiki pages from scratch by dispatching parallel background agents
grouped by category. Each agent reads the relevant source files and rewrites its
assigned pages. All changes are committed to the current branch — no cross-repo PRs.

**Warning:** Overwrites all content wiki pages. Only run when warranted.
For single-page updates, use `/wiki-update` instead.

---

## When to Use

- After a major refactor touching multiple subsystems
- After a large feature batch (3+ patches) with no wiki updates
- When `/wiki-audit` reports widespread staleness (5+ pages behind)
- When onboarding a new agent context that needs a fresh wiki baseline
- After migrating the wiki into the repo (initial population)

---

## Pre-flight Checks

### Step 1: Confirm branch safety

```bash
ROOT=$(git rev-parse --show-toplevel)
BRANCH=$(git branch --show-current)

if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "dev" ]; then
  echo "ERROR: wiki-sweep cannot run on protected branch '$BRANCH'."
  echo "Create a worktree or feature branch first."
  exit 1
fi

echo "Sweep target: $ROOT/wiki/"
echo "Branch: $BRANCH"
```

### Step 2: Confirm current APP_VERSION

```bash
ROOT=$(git rev-parse --show-toplevel)
grep 'const APP_VERSION' "$ROOT/js/constants.js"
```

Use this version in all frontmatter `lastUpdated` fields and inline headers.

---

## Agent Groups

Dispatch agents in three groups. Each group runs in parallel. Within each group,
agents can also run in parallel (one agent per page).

### Group 1: Frontend Pages (11 pages)

| Agent | Page | Source Files |
|-------|------|-------------|
| F1 | `frontend-overview.md` | `index.html`, `js/constants.js`, `sw.js`, `js/file-protocol-fix.js` |
| F2 | `data-model.md` | `js/constants.js`, `js/utils.js` |
| F3 | `storage-patterns.md` | `js/utils.js`, `js/constants.js` |
| F4 | `dom-patterns.md` | `js/utils.js`, `CLAUDE.md`, `js/about.js`, `js/init.js` |
| F5 | `sync-cloud.md` | `js/cloud-sync.js`, `js/cloud-storage.js` |
| F6 | `retail-modal.md` | `js/retail-view-modal.js`, `js/retail.js` |
| F7 | `api-consumption.md` | `js/api.js`, `js/api-health.js` |
| F8 | `release-workflow.md` | `.claude/skills/release/SKILL.md`, `.claude/skills/ship/SKILL.md`, `devops/` |
| F9 | `service-worker.md` | `sw.js`, `devops/hooks/stamp-sw-cache.sh` |
| F10 | `backup-restore.md` | `js/backup.js`, `js/restore.js`, `js/cloud-storage.js` |
| F11 | `image-pipeline.md` | `js/image-*.js`, `js/capture.js` |

### Group 2: Infrastructure Pages (15 pages)

| Agent | Page | Source Files | Notes |
|-------|------|-------------|-------|
| I1 | `architecture-overview.md` | `CLAUDE.md`, `AGENTS.md` | System diagram, repo boundaries |
| I2 | `rest-api-reference.md` | `js/api.js` | Endpoint map, schemas |
| I3 | `turso-schema.md` | (StakTrakrApi-owned) | DB tables, indexes |
| I4 | `cron-schedule.md` | (StakTrakrApi-owned) | Cron timeline |
| I5 | `retail-pipeline.md` | (StakTrakrApi-owned) | Dual-poller, Turso |
| I6 | `fly-container.md` | (StakTrakrApi-owned) | Fly.io services |
| I7 | `home-poller.md` | (StakTrakrApi-owned) | Proxmox LXC setup |
| I8 | `spot-pipeline.md` | (StakTrakrApi-owned) | MetalPriceAPI, hourly files |
| I9 | `goldback-pipeline.md` | (StakTrakrApi-owned) | Per-state slugs |
| I10 | `providers.md` | (StakTrakrApi-owned) | URL strategy |
| I11 | `secrets.md` | (StakTrakrApi-owned) | Secret rotation |
| I12 | `health.md` | (StakTrakrApi-owned) | Health checks |
| I13 | `vendor-quirks.md` | `js/retail.js`, `js/api.js` | Vendor-specific behaviors |
| I14 | `provider-database.md` | (StakTrakrApi-owned) | Provider DB reference |
| I15 | `poller-parity.md` | (StakTrakrApi-owned) | Poller comparison |

**Important:** For infrastructure pages owned by StakTrakrApi (`owner: staktrakr-api`),
the sweep agent should:
1. Read the existing page content
2. Update only the frontmatter fields (`lastUpdated`, `date`)
3. Verify structural integrity (headings, links)
4. Do NOT rewrite the technical content — that is owned by StakTrakrApi Claude
5. Flag any sections that appear stale based on cross-referencing with StakTrakr code

### Group 3: Meta Pages (3 pages)

| Agent | Page | Source Files | Notes |
|-------|------|-------------|-------|
| M1 | `README.md` | All `wiki/*.md` | Page index table, links |
| M2 | `_sidebar.md` | All `wiki/*.md` | Navigation sidebar |
| M3 | `CHANGELOG.md` | `wiki/CHANGELOG.md` | Append new entry only |

---

## Agent Instructions (each agent follows this template)

### For frontend pages (Group 1)

Each agent:

1. **Read source files** listed in the agent table above
2. **Read existing page** if it exists (to preserve good content)
3. **Rewrite the page** from scratch with this structure:

```markdown
---
title: [Page Title]
category: frontend
owner: staktrakr
lastUpdated: vCURRENT_VERSION
date: YYYY-MM-DD
sourceFiles:
  - file1.js
  - file2.js
relatedPages:
  - related-page.md
---
# [Title]

> **Last updated:** vCURRENT_VERSION — YYYY-MM-DD
> **Source files:** `file1.js`, `file2.js`

## Overview
[Concise description of what this subsystem does and why it exists]

## Key Rules (read before touching this area)
[Numbered list of critical constraints — the things that cause bugs when violated]

## Architecture
[How the code is structured, key functions, data flow]

## Common Mistakes
[Patterns that regularly cause bugs, with explanations of why]

## Related Pages
[Links to related wiki pages with brief descriptions of the relationship]
```

4. **Write the page** to `$ROOT/wiki/PAGENAME.md`
5. **Report:** `DONE: PAGENAME.md written`

### For infrastructure pages (Group 2)

Each agent:

1. **Read the existing page**
2. **Update frontmatter only** (`lastUpdated`, `date`)
3. **Verify structural integrity** — check for broken links, missing sections
4. **Flag stale sections** by adding inline comments if needed
5. **Do NOT rewrite technical content** — owned by StakTrakrApi Claude
6. **Report:** `DONE: PAGENAME.md verified (infra-owned, frontmatter updated)`

### For meta pages (Group 3)

Each agent:

1. **README.md:** Regenerate the page index table from all `wiki/*.md` files.
   Read each page's frontmatter to build the table with title, category, owner,
   and last-updated info. Preserve any introductory text above the table.

2. **_sidebar.md:** Regenerate the navigation sidebar. Group pages by category
   (frontend, infrastructure, meta). Alphabetize within each group.

3. **CHANGELOG.md:** Append a new entry for this sweep:
   ```markdown
   ## YYYY-MM-DD — Full sweep (vVERSION)
   - Rewrote all frontend pages from current codebase
   - Updated infrastructure page frontmatter
   - Regenerated README and sidebar
   ```

---

## Step 4: Wait for all agents to report DONE

Each agent outputs `DONE: PAGENAME.md written` (or `verified`) when complete.
Wait for all agents in all three groups before proceeding.

---

## Step 5: Commit

```bash
ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"

git add wiki/
git commit -m "docs: full wiki sweep — rewrite all pages from codebase

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Step 6: Verify with wiki-audit

After the sweep commit, run `/wiki-audit` to confirm all pages are accurate and
frontmatter is valid. This catches any agent errors.

---

## Edge Cases

- **New source file with no wiki page:** Flag it in the sweep report:
  `"No wiki page covers [file] — consider creating one."`
- **Wiki page with no matching source files:** Flag pages where ALL `sourceFiles`
  are missing from disk — the page may be orphaned.
- **Concurrent patches:** If a patch lands while the sweep is running, the sweep
  branch may need to rebase. Standard git conflict resolution applies.
- **Page deletion:** The sweep does NOT delete pages. If a page should be removed,
  flag it in the report and let the user decide.
- **Large pages:** Some infrastructure pages (e.g., `rest-api-reference.md`) may
  be very large. Agents should read the full page but focus frontmatter updates
  only for infra-owned pages.

---

## Page Count Summary

| Category | Count | Action |
|----------|-------|--------|
| Frontend | 11 | Full rewrite from source |
| Infrastructure | 15 | Frontmatter update + structural verify |
| Meta | 3 | Regenerate (README, sidebar, changelog) |
| **Total** | **29** | |

Non-content files skipped: `index.html` (wiki landing page, not a content doc).

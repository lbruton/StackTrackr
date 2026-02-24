---
name: wiki-sweep
description: Full re-population of all 9 frontend wiki pages in StakTrakrWiki. Dispatches 9 parallel background agents, one per page. Use after major refactors, large feature batches, or when wiki-audit finds widespread staleness. Not part of normal patch workflow.
allowed-tools: Bash, Read, Task
---

# Wiki Sweep

Re-populates all 9 frontend wiki pages from scratch by dispatching 9 parallel
background agents. Each agent reads the relevant source files and rewrites its page
via `gh api`. Use when multiple pages are stale simultaneously.

**Warning:** Overwrites all 9 frontend pages. Only run when warranted.
For single-page updates, use `/wiki-update` instead.

## When to use

- After a major refactor touching multiple subsystems
- After a large feature batch (3+ patches) with no wiki updates
- When `/wiki-audit` reports widespread staleness (5+ pages behind)
- When onboarding a new agent context that needs a fresh wiki baseline

## Steps

### Step 1: Confirm current APP_VERSION

```bash
grep 'const APP_VERSION' /path/to/StakTrakr/js/constants.js
```

Use this version in all `> **Last updated:**` headers.

### Step 2: Dispatch 9 parallel background agents

Launch all at once using the Task tool with `run_in_background: true`.

Each agent follows the page spec from `docs/plans/2026-02-23-wiki-system.md`.

| Agent | Page | Source files |
|-------|------|-------------|
| 1 | `frontend-overview.md` | `index.html`, `js/constants.js`, `sw.js`, `CLAUDE.md` |
| 2 | `data-model.md` | `js/constants.js`, `js/utils.js` |
| 3 | `storage-patterns.md` | `js/utils.js`, `js/constants.js` |
| 4 | `dom-patterns.md` | `js/utils.js`, `CLAUDE.md`, `js/about.js`, `js/init.js` |
| 5 | `sync-cloud.md` | `js/cloud-sync.js`, `js/cloud-storage.js` |
| 6 | `retail-modal.md` | `js/retail-view-modal.js`, `js/retail.js` |
| 7 | `api-consumption.md` | `js/api.js`, `js/api-health.js` |
| 8 | `release-workflow.md` | `.claude/skills/release/SKILL.md`, `.claude/skills/ship/SKILL.md`, `devops/` |
| 9 | `service-worker.md` | `sw.js`, `devops/hooks/stamp-sw-cache.sh` |

### Step 3: Wait for all agents to report DONE

Each agent outputs `DONE: PAGENAME.md pushed` when complete.

### Step 4: Update README.md table if needed

If any page was renamed or added, update the README.md page table:

```bash
SHA=$(gh api "repos/lbruton/StakTrakrWiki/contents/README.md" --jq '.sha')
# Write updated README, then push with SHA
```

### Step 5: Run wiki-audit to verify

After the sweep, run `/wiki-audit` to confirm all pages are accurate.

## gh api push pattern (for each agent)

```bash
cat > /tmp/PAGENAME.md << 'CONTENT'
[page content]
CONTENT

SHA=$(gh api "repos/lbruton/StakTrakrWiki/contents/PAGENAME.md" --jq '.sha' 2>/dev/null || echo "")
ARGS=(--method PUT -f message="sweep: rewrite PAGENAME" -f content="$(base64 -i /tmp/PAGENAME.md)")
[ -n "$SHA" ] && ARGS+=(-f sha="$SHA")
gh api "repos/lbruton/StakTrakrWiki/contents/PAGENAME.md" "${ARGS[@]}"
```

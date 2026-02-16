---
name: start
description: Quick session start — load recent context without a full prime.
user-invocable: true
---

# Session Start — StakTrakr

Lightweight context loader for the start of a development session. Gets you up to speed in 30 seconds, not 5 minutes.

**Do NOT read or re-analyze CLAUDE.md** — it's already loaded as system context.

## Phase 1: Sync Check

Detect if a cloud session (Claude Code web, Codex, GitHub) pushed changes we don't have locally:

1. `git fetch origin` — update remote tracking refs
2. `git branch --show-current` — confirm working branch
3. `git rev-list HEAD..origin/<branch> --count` — count commits we're behind

**If behind by 1+ commits:**

- Show what's incoming: `git log --oneline HEAD..origin/<branch>`
- Check for uncommitted local work: `git status --short`
- If clean working tree: ask the user to confirm, then `git pull origin <branch>`
- If dirty working tree: warn that local changes exist, suggest `git stash` then pull, or manual merge
- After pulling, note which files changed: `git diff --stat HEAD~N..HEAD` (where N = commits pulled)

**If up to date:** Continue silently.

## Phase 2: Claude-Context Index Freshness

Check if the semantic code search index is stale and refresh it proactively:

1. Call `mcp__claude-context__get_indexing_status` with path `/Volumes/DATA/GitHub/StakTrakr`
2. Read the `Last updated` timestamp from the response
3. **If the index is older than 1 hour** — kick off a re-index:
   - Call `mcp__claude-context__index_codebase` with path `/Volumes/DATA/GitHub/StakTrakr` (no `force` needed unless files were renamed/deleted)
   - Report: `"Re-indexing claude-context (last indexed X hours ago)… takes ~2 min."`
   - Do NOT block on completion — continue to Phase 3+ while it indexes in the background
4. **If the index is fresh (< 1 hour)** — report stats and continue:
   - `"Claude-Context index fresh (X files, Y chunks, updated Z min ago)"`
5. **If indexing is already in progress** — skip, note it in the output

This ensures `search_code` results reflect the latest codebase state for the entire session.

## Phase 3: Recent Git Activity

Run these commands (parallel where possible):

1. `git log --oneline -8` — last 8 commits for recent momentum
2. `git status --short` — uncommitted work from a prior session
3. `git diff --stat` — size of any uncommitted changes

## Phase 4: Linear Triage

Query the **StakTrakr** team (ID: `f876864d-ff80-4231-ae6c-a8e5cb69aca4`). Run ALL of the following queries in parallel — do not short-circuit or cascade.

### Query 1: Projects (sprints)

```
list_projects  team: "f876864d-..."
```

Fetch all projects. Filter out Completed and Canceled projects. These represent our sprint-sized work packages.

### Query 2: In Progress issues

```
list_issues  team: "f876864d-..."  state: "In Progress"  limit: 10
```

If issues found, read the full description for each to understand current state.

### Query 3: Todo issues

```
list_issues  team: "f876864d-..."  state: "Todo"  limit: 20
```

### Query 4: Backlog issues

```
list_issues  team: "f876864d-..."  state: "Backlog"  limit: 50
```

### Processing

After all queries return, categorize the data for the output tables:

1. **Projects table** — all non-Completed/Canceled projects with their status, issue count, and priority
2. **Critical/Bugs table** — any issues with Bug label OR priority 1-2 (Urgent/High) from any state. These always surface first
3. **Unassigned issues table** — backlog issues that have NO project assigned. These are orphans that need triage or are standalone work items. Show their priority and status
4. **Recommendation** — based on everything above, suggest where to start. Priority order: active In Progress work > bugs/critical > highest-priority project > unassigned high-priority items

## Phase 5: Memento Context

Quick scan of the knowledge graph for recent context. Run these searches in parallel:

### Search 1: Recent insights and lessons learned

```
mcp__memento__semantic_search
  query: "staktrakr development insight lesson learned pattern"
  limit: 5
  min_similarity: 0.4
```

Surface any insights from the last few sessions — architectural decisions, gotchas, patterns discovered. These prevent re-learning the same lessons.

### Search 2: Recent handoffs and sessions

```
mcp__memento__search_nodes
  query: "STAKTRAKR handoff"
```

If a recent handoff exists, open it with `open_nodes` and pull:
- `NEXT_STEPS` — what was planned next (most useful field)
- `VERSION` — version at time of handoff
- `FILES_MODIFIED_THIS_SESSION` — recent hot spots

### Search 3: Recent rewinds (lightweight bookmarks)

```
mcp__memento__search_nodes
  query: "STAKTRAKR rewind"
```

Rewinds are lighter than handoffs — check if there's one more recent than the last handoff.

### What to surface

- **Always show** `NEXT_STEPS` from the most recent handoff or rewind (if any)
- **Show insights** only if they're relevant to the current In Progress or Todo work — don't dump the full list
- **If nothing found** in Memento, that's fine — say "No recent Memento context" and move on. Git history and Linear are the primary sources.

## Output

Use markdown tables for all Linear data — they render well in the CLI terminal and are much easier to scan than bullet lists. The output has two sections: a brief header block, then the Linear tables.

### Header Block

Keep this short — 3-4 lines max:

```
Session Start — StakTrakr v[VERSION] on [BRANCH]

Code index: [fresh (50 files, 1235 chunks, 12 min ago)] or [re-indexing…]
Recent: [1-2 sentence summary of last few commits]
Uncommitted: [X files changed] or "Clean"
```

### Linear Tables

Always render these tables in this order. Omit a table only if it would be completely empty (but say "None" inline instead of silently skipping).

**Table 1: Active Projects** — all non-Completed/Canceled projects

```
| Project              | Status  | Issues                | Priority |
|----------------------|---------|-----------------------|----------|
| Critical Bugs        | Backlog | STAK-120              | Urgent   |
| SPRINT-Next-Mobile   | Started | STAK-106, STAK-118    | High     |
| CustomTheme          | Backlog | STAK-121              | —        |
```

- Status comes from the project's Linear status (Backlog, Planned, Started, etc.)
- Issues column lists the STAK-XX identifiers assigned to that project
- Priority shows the project-level priority if set, "—" if none

**Table 2: Bugs & Critical Issues** — priority 1-2 or Bug-labeled, from ANY state

```
| Issue    | Title                        | Priority | State       | Project        |
|----------|------------------------------|----------|-------------|----------------|
| STAK-120 | Image deletion bug           | High     | Todo        | Critical Bugs  |
```

If none exist, output: `**Bugs & Critical:** None`

**Table 3: Unassigned Issues** — backlog/todo issues with NO project

```
| Issue    | Title                              | Priority | State   |
|----------|------------------------------------|----------|---------|
| STAK-119 | LBMA reference table               | Low      | Backlog |
| STAK-72  | Realized gains/losses              | Medium   | Backlog |
```

If none exist, output: `**Unassigned Issues:** None`

**Table 4: In Progress** — any issues currently being worked on

```
| Issue    | Title                        | Project              |
|----------|------------------------------|----------------------|
| STAK-106 | Mobile summary cards         | SPRINT-Next-Mobile   |
```

If none exist, output: `**In Progress:** None`

### Recommendation Block

After the tables, add a brief recommendation:

```
Recommendation: [1-2 sentences suggesting where to start and why.
Priority order: active In Progress > bugs/critical > highest-priority project > unassigned high-priority items.]
```

### Memento Block

```
Memento:
  Last session: [NEXT_STEPS from most recent handoff/rewind] or "No recent context"
  Insights: [relevant insight if applicable] or omit
```

### Closing

```
Ready to work. What's next?
```

### Formatting Rules

- **Always use markdown tables** for Linear data — no bullet lists for issue/project listings
- Keep table columns aligned for CLI readability
- Bugs/Critical table always appears before other issue tables, even if empty (show "None")
- Only show Memento insights if they're directly relevant to the current work queue
- If Memento returns nothing useful, a single "No recent context" line is fine
- The recommendation should be opinionated — suggest ONE clear starting point, not a menu of options

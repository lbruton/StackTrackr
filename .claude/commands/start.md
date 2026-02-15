---
description: Quick session start — load recent context without a full prime.
allowed-tools: Bash, Read, Grep, Glob, mcp__linear-server__*, mcp__memento__*, mcp__claude-context__*
---

# Session Start — StackTrackr

Lightweight context loader for the start of a development session. Gets you up to speed in 30 seconds, not 5 minutes.

**Do NOT read or re-analyze CLAUDE.md** — it's already loaded as system context.

## Phase 1: Recent Git Activity

Run these commands (parallel where possible):

1. `git log --oneline -8` — last 8 commits for recent momentum
2. `git status --short` — uncommitted work from a prior session
3. `git branch --show-current` — confirm working branch
4. `git diff --stat` — size of any uncommitted changes

## Phase 2: Linear Quick Check

Query the **StackTrackr** team (ID: `f876864d-ff80-4231-ae6c-a8e5cb69aca4`) for active work:

1. List **In Progress** issues (these are what we're likely continuing)
2. List **Todo** issues (these are queued next)
3. For each In Progress issue, read the full description to understand current state

If no In Progress issues, skip to Phase 3.

## Phase 3: Last Handoff (if available)

Search Memento for the most recent handoff or session save:

1. `mcp__memento__semantic_search` with query: `"stacktrackr handoff session"`, limit: 3, min_similarity: 0.5
2. If a handoff entity is found, read it with `mcp__memento__open_nodes` for full context
3. If no handoff found, that's fine — Phase 1 and 2 provide sufficient context

## Output

Produce a concise summary (not a formal report — just conversational):

```
Session Start — StackTrackr v[VERSION] on [BRANCH]

Recent: [1-2 sentence summary of last few commits]
In Progress: [STACK-XX: title, STACK-YY: title] or "None"
Uncommitted: [X files changed] or "Clean"
Last session: [1 sentence from handoff] or "No handoff found"

Ready to work. What's next?
```

Keep it brief. The goal is awareness, not a research paper.

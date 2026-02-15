---
description: Quick session start — load recent context without a full prime.
allowed-tools: Bash, Read, Grep, Glob, mcp__linear-server__*, mcp__memento__*, mcp__claude-context__*
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

## Phase 2: Recent Git Activity

Run these commands (parallel where possible):

1. `git log --oneline -8` — last 8 commits for recent momentum
2. `git status --short` — uncommitted work from a prior session
3. `git diff --stat` — size of any uncommitted changes

## Phase 2: Linear Quick Check

Query the **StakTrakr** team (ID: `f876864d-ff80-4231-ae6c-a8e5cb69aca4`) for active work:

1. List **In Progress** issues (these are what we're likely continuing)
2. List **Todo** issues (these are queued next)
3. For each In Progress issue, read the full description to understand current state

If no In Progress issues, skip to Phase 3.

## Phase 3: Last Handoff (if available)

Search Memento for the most recent handoff or session save:

1. `mcp__memento__semantic_search` with query: `"staktrakr handoff session"`, limit: 3, min_similarity: 0.5
2. If a handoff entity is found, read it with `mcp__memento__open_nodes` for full context
3. If no handoff found, that's fine — Phase 1 and 2 provide sufficient context

## Output

Produce a concise summary (not a formal report — just conversational):

```
Session Start — StakTrakr v[VERSION] on [BRANCH]

Recent: [1-2 sentence summary of last few commits]
In Progress: [STACK-XX: title, STACK-YY: title] or "None"
Uncommitted: [X files changed] or "Clean"
Last session: [1 sentence from handoff] or "No handoff found"

Ready to work. What's next?
```

Keep it brief. The goal is awareness, not a research paper.

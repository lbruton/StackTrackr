---
description: Project loop — daisy-chain context across chat rewinds for multi-task sessions.
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, mcp__linear-server__*, mcp__memento__*, mcp__claude-context__*
---

# Project Loop — StakTrakr

This command manages a **rewind-based project workflow** for sessions with multiple tasks. The user will rewind the chat back to this message after each task, preserving the base context while carrying forward progress via handoff files.

## How the Loop Works

```
/loop → [read handoff] → work on task → [write handoff] → user rewinds → /loop → [read new handoff] → ...
```

Each cycle:
1. You read the latest handoff to pick up where we left off
2. You work on the next task
3. Before the user rewinds, you write a handoff capturing what was done and what's next
4. The user rewinds the chat back to this `/loop` message
5. You read the new handoff and continue

## On Entry: Load Context

### Step 1: Check for a handoff file

Look for the most recent project handoff:

1. Check `logs/projects/` directory for files matching `handoff_*.md` (newest first)
2. If found, read it — it contains what was completed, what's next, and any state to carry forward
3. If no file found, also search Memento: `semantic_search("staktrakr project handoff", limit: 3)`
4. If nothing found anywhere, this is a fresh loop — ask the user what we're working on

### Step 2: Quick git check

1. `git log --oneline -3` — confirm last commit matches handoff expectations
2. `git status --short` — check for uncommitted work

### Step 3: Announce readiness

```
Loop resumed. [Last task completed / First loop — no prior handoff]

Completed so far: [list from handoff, or "Nothing yet"]
Next up: [task from handoff, or "Awaiting instructions"]

Ready for the next task.
```

## Before Rewind: Write Handoff

When the user says they're ready to rewind (or the context is getting long), do ALL of these:

### Step 1: Commit any uncommitted work

If there are uncommitted changes, create a commit with a descriptive message referencing any STACK-XX issues.

### Step 2: Write handoff file

Write to `logs/projects/handoff_[TIMESTAMP].md`:

```markdown
# Project Handoff — [TIMESTAMP]

## Completed This Cycle
- [What was done, with file:line references]
- [STACK-XX if applicable]

## Changes Made
- [List of files modified with brief description]

## Next Task
- [What should be worked on next]
- [Any context needed: file paths, approach decisions, gotchas]

## Project Progress
- [X/Y tasks completed overall]
- [List of all tasks with status]

## Notes
- [Any important state: branch, version, decisions made, things to watch out for]
```

### Step 3: Save to Memento

Save a lightweight handoff entity to Memento with:
- Entity type: `STAKTRAKR:DEVELOPMENT:HANDOFF`
- Observations: TIMESTAMP, ABSTRACT (1 line), SUMMARY (full handoff content)
- Tags: `project:staktrakr`, `type:sprint-handoff`

### Step 4: Confirm ready for rewind

```
Handoff saved. You can rewind now.

File: logs/projects/handoff_[TIMESTAMP].md
Commit: [hash] [message]
Next task: [brief description]
```

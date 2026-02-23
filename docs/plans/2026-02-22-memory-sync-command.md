# memory-sync Command Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a `/memory-sync` slash command that transcribes all MEMORY.md sections into mem0 as searchable memories, then replaces MEMORY.md with a minimal stub.

**Architecture:** A single slash command file (`memory-sync.md`) instructs Claude to iterate over MEMORY.md's sections, call `mcp__mem0__add_memory` once per section with appropriate metadata, then overwrite MEMORY.md with a stub that redirects to mem0. No app code is touched — this is pure skill/memory infrastructure.

**Tech Stack:** Claude Code slash commands (markdown), mem0 MCP (`mcp__mem0__add_memory`, `mcp__mem0__search_memories`)

**File Touch Map:**
| Action | File | Scope |
|--------|------|-------|
| CREATE | `/Users/lbruton/.claude/commands/memory-sync.md` | new command |
| MODIFY | `/Users/lbruton/.claude/projects/-Volumes-DATA-GitHub-StakTrakr/memory/MEMORY.md` | replace with stub |

---

## Task Table

| ID | Step | Est (min) | Files/Modules | Validation | Risk/Notes | Recommended Agent |
|----|------|-----------|---------------|------------|------------|-------------------|
| T1 | Write the memory-sync command file | 5 | `/Users/lbruton/.claude/commands/memory-sync.md` | File exists, frontmatter valid | Must cover all 12 MEMORY.md sections | Claude |
| T2 | Run the command — transcribe MEMORY.md to mem0 | 5 | mem0 cloud | Search mem0 for "CGC" and "dual-poller" — both return results | Requires mem0 MCP live | Human |
| T3 | Replace MEMORY.md with stub | 2 | `memory/MEMORY.md` | File is ≤20 lines, contains mem0 recall instructions | Irreversible — confirm mem0 has content first | Claude |
| T4 | Verify full recall works | 3 | mem0 cloud | Run `/remember CGC docker setup` and get useful results | — | Human |

---

### Task T1: Write the memory-sync command ← NEXT

**Files:**
- Create: `/Users/lbruton/.claude/commands/memory-sync.md`

**Step 1: Write the command file**

The command must:
- Declare `allowed-tools: mcp__mem0__add_memory, mcp__mem0__search_memories`
- Instruct Claude to read MEMORY.md and call `add_memory` once per section
- Use consistent metadata: `project: staktrakr`, correct `category` per section, `type: fact`
- Check for duplicates with `search_memories` before each save (the `remember` skill says "check before duplicating")
- After all saves, overwrite MEMORY.md with the stub (defined in T3)
- Print a summary of how many memories were saved

Write this file with the following content:

```markdown
---
description: Transcribe MEMORY.md sections to mem0 cloud, then replace MEMORY.md with a minimal stub.
allowed-tools: mcp__mem0__add_memory, mcp__mem0__search_memories, Read, Write
---

Transcribe all sections from MEMORY.md into mem0, then replace MEMORY.md with a stub.

## Step 1 — Read MEMORY.md

Read the full file at:
`/Users/lbruton/.claude/projects/-Volumes-DATA-GitHub-StakTrakr/memory/MEMORY.md`

## Step 2 — For each section, save to mem0

For each top-level `##` section in MEMORY.md:

1. Search mem0 first to avoid duplicates:
```javascript
mcp__mem0__search_memories({
  query: "<section heading>",
  filters: { "AND": [{ "metadata.project": "staktrakr" }] },
  limit: 3
})
```

2. If no close match found, save with:
```javascript
mcp__mem0__add_memory({
  text: "<full section content as plain text>",
  metadata: {
    project: "staktrakr",
    category: "<see mapping below>",
    type: "fact",
    source: "MEMORY.md"
  }
})
```

**Section → category mapping:**
| Section | category |
|---------|----------|
| Superpowers Skills | workflow |
| mem0 Cloud | infra |
| Explore Agent Policy | workflow |
| UI Design Workflow Preferences | frontend |
| CodeGraphContext (CGC) MCP Server | infra |
| Neo4j Docker Container | infra |
| The Password Manager (Infisical) | infra |
| Browser Testing Strategy | infra |
| Browserbase / bb-test Details | infra |
| Plugin Customizations | workflow |
| Dual-Poller Infrastructure | backend |
| Known Active Bugs | backend |
| bb-test Run History | backend |
| Browserbase Test Suite | infra |

## Step 3 — Replace MEMORY.md with stub

After all sections are saved, overwrite the file at:
`/Users/lbruton/.claude/projects/-Volumes-DATA-GitHub-StakTrakr/memory/MEMORY.md`

with:

```markdown
# StakTrakr Project Memory

All detailed memory has been migrated to mem0 cloud.

## How to recall

- `/remember <topic>` — semantic search across all memories
- `/remember CGC docker setup` — infrastructure details
- `/remember dual-poller` — API poller architecture
- `/remember UI design` — frontend/design preferences
- `/remember browserbase` — test suite details

## mem0 metadata filters

All memories tagged: `project: staktrakr`
Categories: `workflow`, `infra`, `frontend`, `backend`

## Quick links

- mem0 dashboard: https://app.mem0.ai
- Run `/memory-sync` again after a session adds significant new knowledge to MEMORY.md
```

## Step 4 — Report

Print:
```
✅ memory-sync complete
   Saved: N memories to mem0
   Skipped: M duplicates
   MEMORY.md replaced with stub
   Recall: /remember <topic>
```
```

**Step 2: Verify the file was created**

Check the file exists and the frontmatter is valid (only `description` and `allowed-tools` fields).

---

### Task T2: Run the command — transcribe MEMORY.md to mem0

**This is a Human step** — the user must invoke the command from the Claude Code CLI:

```
/memory-sync
```

Claude will execute the command, calling `add_memory` for each section. Watch the output to confirm sections are being saved, not skipped as duplicates.

**Expected output pattern:**
```
Saving "Superpowers Skills"... ✓
Saving "mem0 Cloud"... ✓
Saving "Explore Agent Policy"... ✓
...
✅ memory-sync complete
   Saved: 14 memories to mem0
   Skipped: 0 duplicates
   MEMORY.md replaced with stub
```

---

### Task T3: Replace MEMORY.md with stub

This step is **handled automatically by the command itself** (Step 3 of the command body above). It runs after all memories are saved.

**Manual fallback** — if the command fails to write the stub, write it manually:

```markdown
# StakTrakr Project Memory

All detailed memory has been migrated to mem0 cloud.

## How to recall

- `/remember <topic>` — semantic search across all memories
- `/remember CGC docker setup` — infrastructure details
- `/remember dual-poller` — API poller architecture
- `/remember UI design` — frontend/design preferences
- `/remember browserbase` — test suite details

## mem0 metadata filters

All memories tagged: `project: staktrakr`
Categories: `workflow`, `infra`, `frontend`, `backend`

## Quick links

- mem0 dashboard: https://app.mem0.ai
- Run `/memory-sync` again after a session adds significant new knowledge to MEMORY.md
```

**Validation:** `wc -l MEMORY.md` should be ≤25 lines.

---

### Task T4: Verify full recall works

**Human step** — test recall from the new stub state:

```
/remember CGC docker setup
/remember dual-poller naming quirk
/remember Infisical machine identity
```

Each should return detailed results from mem0 (not empty). If any returns nothing, the corresponding section was either skipped or not indexed — re-run `/memory-sync` for that section manually via `/remember` save mode.

---

## Auto-Quiz

1. **Which task is NEXT?** T1 — write the command file
2. **Validation for NEXT?** File `/Users/lbruton/.claude/commands/memory-sync.md` exists; frontmatter has only `description` and `allowed-tools`
3. **Commit message for NEXT?** `feat(memory): add /memory-sync command to transcribe MEMORY.md to mem0`
4. **Breakpoint?** Pause after T1 for human to review command content before running T2 (the transcription is irreversible once MEMORY.md is replaced)

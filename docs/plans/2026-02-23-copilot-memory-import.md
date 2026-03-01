# Copilot Memory Import Skill — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a `/copilot-memory-import` Claude skill that uses Playwright MCP to scrape GitHub Copilot memory entries and upsert them into mem0.

**Architecture:** A single `SKILL.md` file installed at `~/.claude/skills/copilot-memory-import/SKILL.md`. When invoked, Claude follows the skill instructions to navigate the GitHub settings page via Playwright, extract memory entries from the DOM snapshot, and call `mcp__mem0__add_memory` for each one.

**Tech Stack:** Claude Code skills system, `mcp__playwright__*` MCP tools, `mcp__mem0__add_memory` MCP tool

**File Touch Map:**

| Action | File | Scope |
|--------|------|-------|
| CREATE | `~/.claude/skills/copilot-memory-import/SKILL.md` | new skill |
| CREATE | `docs/plans/2026-02-23-copilot-memory-import-design.md` | design doc (already done) |

---

## Task Table

| ID | Step | Est (min) | Files/Modules | Validation | Risk/Notes | Recommended Agent |
|----|------|-----------|---------------|------------|------------|-------------------|
| T1 | Inspect GitHub Copilot memory page DOM structure | 5 | — | Memory entries visible in snapshot | Need browser logged into GitHub | Human |
| T2 | Write the SKILL.md | 10 | `~/.claude/skills/copilot-memory-import/SKILL.md` | Skill invocable via `/copilot-memory-import` | DOM selectors may need adjustment | Claude |
| T3 | Test the skill — navigate + snapshot | 5 | — | Playwright reaches memory page without redirect | Must be logged into GitHub in browser | Human |
| T4 | Test the skill — extract + upsert to mem0 | 5 | — | mem0 shows new entries with `source: copilot` | Verify in app.mem0.ai dashboard | Human |
| T5 | Commit design doc | 2 | `docs/plans/2026-02-23-copilot-memory-import-design.md` | git log shows commit | none | Claude |

---

### Task T1: Inspect GitHub Copilot memory page DOM ← NEXT

**This task is for Human — open browser, navigate to the memory settings page, and inspect the DOM to confirm the HTML structure of memory entries before writing the skill.**

**Step 1: Navigate to the page**

Open: `https://github.com/lbruton/StakTrakr/settings/copilot/memory`

**Step 2: Inspect memory entry elements**

Right-click a memory entry → "Inspect". Look for:
- What element wraps each memory entry? (e.g. `<li>`, `<div>`, `<article>`)
- What class or data attribute identifies memory text vs. UI chrome?
- Is there a unique ID or timestamp per entry?

**Step 3: Report back**

Share the selector or class name that targets memory entry text — this goes into the skill's extraction step.

---

### Task T2: Write the SKILL.md

**Files:**
- Create: `~/.claude/skills/copilot-memory-import/SKILL.md`

**Step 1: Create the skills directory**

```bash
mkdir -p ~/.claude/skills/copilot-memory-import
```

**Step 2: Write SKILL.md**

```markdown
---
name: copilot-memory-import
description: Import GitHub Copilot repository memory entries into mem0. Use when you want to sync Copilot's learned repository knowledge into the shared mem0 memory store so all agents can access it.
---

# Copilot Memory Import

Imports all GitHub Copilot memory entries for the StakTrakr repository into mem0.

## Steps

**1. Navigate to the Copilot memory settings page**

Use `mcp__playwright__browser_navigate` to open:
`https://github.com/lbruton/StakTrakr/settings/copilot/memory`

If redirected to login, stop and ask the user to log into GitHub in the browser first.

**2. Take a DOM snapshot**

Use `mcp__playwright__browser_snapshot` to capture the page content.

**3. Extract memory entries**

Parse the snapshot for memory entry text. Memory entries appear as list items — look for elements matching the pattern confirmed during T1 (e.g. `[data-testid="memory-item"]` or similar). Extract the plain text of each entry.

**4. Upsert each entry into mem0**

For each entry text, call:

```
mcp__mem0__add_memory({
  text: "<entry text here>",
  metadata: {
    project: "staktrakr",
    source: "copilot",
    type: "copilot-memory",
    agent: "claude"
  }
})
```

**5. Report results**

Output: "Imported N Copilot memory entries into mem0."

If 0 entries found, report that — do not silently succeed.

## Notes

- This is read-only — no changes are made to GitHub
- Run any time after Copilot has had significant activity on the repo
- Existing near-duplicate entries are handled by mem0's vector dedup
- To review imported entries: search mem0 with filter `source: copilot`
```

**Step 3: Verify the file exists**

```bash
cat ~/.claude/skills/copilot-memory-import/SKILL.md
```

Expected: file contents printed without error.

**Step 4: Commit design doc**

```bash
cd /Volumes/DATA/GitHub/StakTrakr
git add docs/plans/2026-02-23-copilot-memory-import-design.md docs/plans/2026-02-23-copilot-memory-import.md
git commit -m "docs: add copilot-memory-import skill design and plan"
```

---

### Task T3: Test — navigate + snapshot (Human)

**Step 1: Invoke the skill**

In Claude Code, type: `/copilot-memory-import`

**Step 2: Watch for Playwright navigation**

Claude will call `mcp__playwright__browser_navigate`. Confirm the browser reaches the memory page (not a login redirect).

**Step 3: If login redirect occurs**

Log into GitHub in the browser, then re-invoke the skill.

---

### Task T4: Test — extract + upsert (Human)

**Step 1: After skill completes, open mem0 dashboard**

Navigate to `https://app.mem0.ai` and search for `source: copilot`.

**Step 2: Verify entries**

Confirm new entries exist with `source: copilot` metadata and that the text matches what you see on the GitHub memory page.

---

### Task T5: Commit design doc

Already included in T2 Step 4. Mark complete after T2 commit.

---

## Auto-Quiz

1. **Which task is NEXT?** T1 — Human inspects GitHub DOM before skill is written
2. **Validation for NEXT?** Human reports back which HTML selector/class wraps memory entry text
3. **Commit message for T2?** `docs: add copilot-memory-import skill design and plan`
4. **Breakpoint?** After T1 — pause and wait for Human to report DOM selector before proceeding to T2

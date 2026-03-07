---
name: brainstorming
description: "Use before any new feature, enhancement, or non-trivial UI work. Research-driven conversation that explores the idea, investigates the codebase, researches libraries/frameworks, and produces a Linear issue with full brainstorm notes. That issue feeds into /spec STAK-XXX."
user-invocable: true
allowed-tools: >-
  Bash, Read, Write, Edit, Glob, Grep, Agent, AskUserQuestion, WebFetch,
  mcp__brave-search__brave_web_search,
  mcp__plugin_context7_context7__resolve-library-id,
  mcp__plugin_context7_context7__get-library-docs,
  mcp__claude_ai_Context7__resolve-library-id,
  mcp__claude_ai_Context7__query-docs,
  mcp__code-graph-context__find_code,
  mcp__code-graph-context__analyze_code_relationships,
  mcp__code-graph-context__find_most_complex_functions,
  mcp__claude-context__search_code,
  mcp__mem0__search_memories,
  mcp__mem0__add_memory,
  mcp__claude_ai_Linear__save_issue,
  mcp__claude_ai_Linear__get_issue,
  mcp__claude_ai_Linear__list_issues,
  mcp__claude_ai_Linear__list_issue_labels,
  mcp__claude_ai_Linear__get_team,
  mcp__sequential-thinking__sequentialthinking
---

# Brainstorming — Pre-Spec Research & Discovery

## Purpose

Turn a loose idea into a well-researched Linear issue that the spec-workflow can consume. This is a **conversation**, not a document factory. The goal is to explore, research, challenge assumptions, and arrive at a shared understanding of what should be built and how — before any formal spec work begins.

**Produces:** A Linear issue with structured brainstorm notes in the description.
**Consumed by:** `/spec STAK-XXX` which builds `requirements.md` from the brainstorm notes.

**Does NOT:** Write design docs, requirements docs, or implementation plans.
**Does NOT:** Create worktrees or write code.
**Does NOT:** Replace the spec-workflow — it feeds into it.

---

## SRPI vs RPI Decision

| Situation | Entry Point | Why |
|---|---|---|
| New feature or capability | **SRPI** — start here (brainstorming) | Unknown scope, needs research |
| UI change with 3+ data elements | **SRPI** — start here | Layout uncertainty |
| Enhancement to existing behavior | **SRPI** — start here | May ripple more than expected |
| Bug fix with clear root cause | **RPI** — skip to `/spec` | Scope is defined |
| Tech debt / refactor with known boundary | **RPI** — skip to `/spec` | No design ambiguity |

---

## Process Overview

```
Idea → Codebase Recon → External Research → Conversation → Linear Issue → /spec
```

The brainstorm session has **three research phases** and a **conversation loop**, then produces a Linear issue. The conversation can revisit any research phase at any time — this is not a waterfall.

---

## Phase 1: Codebase Recon

Before asking the user a single question, understand the landscape. Run these searches to build context:

### 1a. Structural search (CGC)

```
mcp__code-graph-context__find_code
  query: "{relevant keywords from the idea}"
```

```
mcp__code-graph-context__analyze_code_relationships
  query: "{modules or files likely involved}"
```

Look for: existing patterns, related features already built, potential integration points, complexity hotspots.

### 1b. Semantic search (claude-context)

```
mcp__claude-context__search_code
  query: "{semantic description of the feature area}"
  path: "/Volumes/DATA/GitHub/StakTrakr"
```

Look for: prior art, naming conventions, data flow patterns, similar UI components.

### 1c. Literal search (Grep/Glob)

Use Grep for specific function names, constants, or strings that relate to the idea. Use Glob to find relevant file clusters.

### 1d. Memory recall (mem0)

```
mcp__mem0__search_memories
  query: "{idea topic} {related keywords}"
  limit: 10
```

Look for: past discussions about this feature, rejected approaches, user preferences, related decisions.

### Output: Codebase Context Summary

After research, produce a brief summary (NOT a formal document — just share it in the conversation):

```
## Codebase Context

**Relevant files:** {list of files that would likely be touched}
**Existing patterns:** {patterns this feature should follow}
**Prior art:** {similar features already in the codebase}
**Integration points:** {where new code would connect to existing code}
**Risks/complexity:** {anything that surprised you or could be tricky}
```

<HARD-GATE>
Do not ask clarifying questions until codebase recon is complete. Ground every question in what you found.
</HARD-GATE>

---

## Phase 2: External Research

Based on what the idea needs, research libraries, frameworks, APIs, or approaches using context7 and brave search. This phase may not apply to every brainstorm — skip if the feature is purely internal.

### 2a. Library/framework research (context7)

When the feature might benefit from an external library or follows a known pattern:

```
mcp__plugin_context7_context7__resolve-library-id
  libraryName: "{library name}"
```

Then fetch relevant docs:

```
mcp__plugin_context7_context7__get-library-docs
  context7CompatibleLibraryID: "{resolved ID}"
  topic: "{specific aspect needed}"
```

### 2b. Broader research (brave search)

For design patterns, prior art in other projects, API documentation, or "how do others solve this":

```
mcp__brave-search__brave_web_search
  query: "{research question}"
  count: 5
```

### 2c. Deep-dive (WebFetch)

If brave search surfaces a particularly relevant article, tutorial, or documentation page, fetch it for deeper reading.

### Output: Research Findings

Share findings conversationally:

```
## Research Findings

**Libraries considered:** {library → why yes/no}
**Patterns found:** {approaches other projects use}
**API/integration notes:** {relevant external APIs or services}
**Recommendation:** {what approach looks most promising and why}
```

---

## Phase 3: The Conversation

This is the core of brainstorming — a back-and-forth dialogue with the user. Unlike the old design-doc approach, this is exploratory and collaborative.

### Guidelines

- **One question at a time** — do not overwhelm with question lists
- **Ground questions in research** — reference what you found in Phases 1-2
- **Challenge assumptions** — if something seems over-engineered or unnecessary, say so
- **Propose alternatives** — when you see a simpler path, surface it
- **Use structured thinking** for complex trade-offs:
  ```
  mcp__sequential-thinking__sequentialthinking
  ```
- **Revisit research** — if the conversation surfaces a new angle, go back to Phase 1 or 2
- **YAGNI check** — continuously ask "do we actually need this?"

### Topics to explore (as relevant)

- **User intent:** What problem does this solve? Who benefits?
- **Scope:** What's the minimum viable version? What's a stretch goal?
- **Approach:** Given existing patterns, what's the natural way to build this?
- **Trade-offs:** Performance vs simplicity? Flexibility vs shipping speed?
- **Edge cases:** What happens when X? What about empty states?
- **UI/UX:** If visual, what's the interaction model? (may trigger `/ui-mockup`)
- **Dependencies:** Does this need new libraries? API changes? Data model changes?
- **Testing:** How would we verify this works?

### When to stop the conversation

The conversation is done when:
- You and the user agree on **what** should be built (not how — that's the spec's job)
- The scope is clear enough to write a Linear issue description
- Major risks and trade-offs have been discussed
- The user says "let's do it" or similar

---

## Phase 4: Create Linear Issue

When the conversation reaches agreement, create a Linear issue with the full brainstorm context. This issue becomes the input to `/spec STAK-XXX`.

### Detect project

```bash
cat .claude/project.json
```

Extract `linearTeamId` and `name`.

### Check for existing issue

Ask the user: "Is there an existing Linear issue for this, or should I create one?"

If existing: fetch it, update the description with brainstorm notes.
If new: create one.

### Issue structure

```
mcp__claude_ai_Linear__save_issue
  teamId: "{linearTeamId}"
  title: "{concise feature title}"
  description: "{brainstorm notes — see template below}"
  priority: {1-4 based on discussion}
```

### Brainstorm notes template (for the Linear issue description)

```markdown
## Brainstorm Notes

### Problem
{What problem does this solve? Who benefits?}

### Proposed Approach
{High-level approach agreed on during the conversation}

### Scope
**In scope:**
- {item}

**Out of scope / future work:**
- {item}

### Codebase Context
**Files likely touched:** {list}
**Existing patterns to follow:** {list}
**Integration points:** {list}

### Research Findings
{Libraries, frameworks, or external patterns investigated}
{Key decisions made and why}

### Risks & Trade-offs
- {risk or trade-off discussed}

### Open Questions
- {anything unresolved that the spec should address}

### UI Notes
{If applicable — interaction model, layout ideas, mockup references}
```

### Save to mem0

```
mcp__mem0__add_memory
  content: "Brainstorm session for {STAK-XXX}: {one-line summary of what was decided}"
```

---

## Phase 5: Handoff to Spec Workflow

After creating/updating the Linear issue:

```
## Brainstorm Complete

Issue:  STAK-XXX — {title}
Scope:  {one-line scope summary}

Next step: /spec STAK-XXX

The spec workflow will use the brainstorm notes in STAK-XXX to build
requirements.md (Phase 1), then continue through Design → Tasks → Implementation.
```

**Do NOT invoke spec-workflow automatically.** Let the user decide when to start. They may want to:
- Think on it overnight
- Get input from others
- Start a fresh session for the spec work

---

## Key Principles

- **Research first, questions second** — never brainstorm in a vacuum
- **Conversation, not documentation** — the dialogue IS the value
- **Linear issue is the artifact** — not a design doc in `docs/plans/`
- **YAGNI ruthlessly** — cut scope during the conversation, not after
- **Feed the spec, don't replace it** — brainstorming produces inputs, spec-workflow produces outputs
- **Revisit freely** — circle back to research when new angles emerge

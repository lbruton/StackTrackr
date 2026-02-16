---
name: search-code
description: Codebase search strategy — claude-context first, then Grep/Glob, then Explore agents. Use when searching for functions, patterns, architecture, or understanding how code works.
user-invocable: false
---

# Code Search Strategy

Tiered search approach that minimizes token cost and latency while maximizing accuracy. Each tier is a fallback — escalate only when the previous tier's results are insufficient.

---

## Tier 1: Claude-Context (semantic search) — TRY FIRST

**Tool**: `mcp__claude-context__search_code`
**Cost**: ~2 seconds, zero subprocess tokens
**Best for**: "How does X work?", "Where is Y implemented?", architectural questions

```
mcp__claude-context__search_code({
  path: "/Volumes/DATA/GitHub/StakTrakr",
  query: "how are spot prices fetched and cached",
  extensionFilter: [".js"],   // optional — narrow by file type
  limit: 10                   // raise to 30-50 for broad searches
})
```

**When claude-context is sufficient (stop here):**
- Single function or module lookup
- Understanding data flow through 1-2 files
- Finding where a concept is implemented
- Architectural "how does this work" questions

**When to escalate:**
- Results seem incomplete (found 3 of N expected matches)
- Query is for a literal string, not a concept
- Need exhaustive coverage across all files

---

## Tier 2: Grep / Glob (literal search) — TARGETED FOLLOW-UP

**Tools**: `Grep` (content search), `Glob` (file search)
**Cost**: instant, zero tokens
**Best for**: exact strings, function names, variable references, import patterns

Use Grep when:
- You need every occurrence of a specific string (e.g., `escapeAttribute`)
- Claude-context returned semantic near-misses (ranked `importCsv` when you wanted `exportCsv`)
- Searching for a localStorage key, CSS class name, or DOM ID

Use Glob when:
- Finding files by naming pattern (`js/catalog-*.js`)
- Checking if a file exists before reading it

**Combine with Tier 1:** Use claude-context to understand the concept, then Grep to find every literal reference.

---

## Tier 3: Explore Agent — COMPREHENSIVE INVESTIGATION

**Tool**: `Task` with `subagent_type: "Explore"`
**Cost**: slower (30-90s), uses subprocess tokens
**Best for**: cross-cutting concerns, multi-file traces, "find everything related to X"

Escalate to Explore when:
- Tier 1 + 2 found partial results and you need exhaustive coverage
- The concern spans many files (e.g., "all places that touch localStorage")
- You need to trace a full execution path across modules
- Building a complete picture for planning or refactoring

**Pass seed context from earlier tiers:**
```
Task({
  subagent_type: "Explore",
  prompt: "Find all code related to CSV export. Claude-context found
    exportCsv in inventory.js and customMapping.js. Grep also found
    references in events.js. Find any other files involved and trace
    the full export flow.",
  description: "Trace CSV export flow"
})
```

Seeding the Explore agent with Tier 1/2 findings makes it faster and more targeted.

---

## Decision Flowchart

```
Need to find code?
  │
  ├─ Know the exact string/name? ──→ Grep (Tier 2)
  │
  ├─ Conceptual / "how does X work"? ──→ claude-context (Tier 1)
  │     │
  │     ├─ Results complete? ──→ Done
  │     └─ Results partial? ──→ Grep (Tier 2) for literal follow-up
  │           │
  │           ├─ Coverage sufficient? ──→ Done
  │           └─ Still incomplete? ──→ Explore agent (Tier 3)
  │
  └─ Broad / cross-cutting concern? ──→ claude-context (Tier 1) for seed
        └─ then Explore agent (Tier 3) with seed context
```

---

## Rules

- **Never skip Tier 1** for conceptual searches — it's the cheapest way to orient yourself
- **Never use Explore for a single-function lookup** — that's overkill
- **Never duplicate work** — if you delegate to Explore, don't also run the same Grep searches yourself
- **Always pass the absolute path** `/Volumes/DATA/GitHub/StakTrakr` to claude-context
- **Use `extensionFilter: [".js"]`** for JS-only searches (skip CSS, HTML, JSON, MD noise)
- **For external library docs** — don't search our code, use Context7 instead (see `context7-rules`)

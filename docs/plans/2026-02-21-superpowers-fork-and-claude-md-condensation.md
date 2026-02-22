# Superpowers Fork + CLAUDE.md Condensation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fork all 14 superpowers plugin skills to `~/.claude/skills/`, add a global `codebase-search` skill that enforces CGC → claude-context → Grep/Glob before planning, patch `brainstorming` and `writing-plans` to require it, and strip CLAUDE.md down to ~80 lines by deferring to skills.

**Architecture:** Skills are copied verbatim from the plugin cache, then the two planning skills (`brainstorming`, `writing-plans`) are patched with a mandatory codebase search gate. A new `codebase-search` skill provides the reusable search protocol. CLAUDE.md retains only rules and pointers — all reference content moves into skills.

**Tech Stack:** Bash (file ops), Markdown (skill authoring). No code changes to StakTrakr itself.

---

## Task 1: Copy all 14 superpowers skills to `~/.claude/skills/`

**Files:**
- Source: `~/.claude/plugins/cache/claude-plugins-official/superpowers/4.3.1/skills/*/SKILL.md`
- Destination: `~/.claude/skills/<skill-name>/SKILL.md` for each

**Step 1: Create destination directories and copy each skill**

```bash
PLUGIN_DIR="$HOME/.claude/plugins/cache/claude-plugins-official/superpowers/4.3.1/skills"
SKILLS_DIR="$HOME/.claude/skills"

for skill in brainstorming dispatching-parallel-agents executing-plans \
             finishing-a-development-branch receiving-code-review \
             requesting-code-review subagent-driven-development \
             systematic-debugging test-driven-development \
             using-git-worktrees using-superpowers \
             verification-before-completion writing-plans writing-skills; do
  mkdir -p "$SKILLS_DIR/$skill"
  cp "$PLUGIN_DIR/$skill/SKILL.md" "$SKILLS_DIR/$skill/SKILL.md"
  echo "Copied $skill"
done
```

**Step 2: Copy any supporting files (prompt templates, etc.)**

```bash
PLUGIN_DIR="$HOME/.claude/plugins/cache/claude-plugins-official/superpowers/4.3.1/skills"
SKILLS_DIR="$HOME/.claude/skills"

for skill in brainstorming dispatching-parallel-agents executing-plans \
             finishing-a-development-branch receiving-code-review \
             requesting-code-review subagent-driven-development \
             systematic-debugging test-driven-development \
             using-git-worktrees using-superpowers \
             verification-before-completion writing-plans writing-skills; do
  # Copy any additional .md files (prompt templates, supporting docs)
  find "$PLUGIN_DIR/$skill" -name "*.md" ! -name "SKILL.md" | while read f; do
    cp "$f" "$SKILLS_DIR/$skill/"
    echo "Copied supporting file: $f"
  done
done
```

**Step 3: Verify all 14 skills are present**

```bash
ls ~/.claude/skills/ | sort
```

Expected: 14 new skill folders alongside existing ones (agent-routing, goodnight, etc.)

**Step 4: Commit note** — no git commit needed (skills are outside the repo). Proceed to Task 2.

---

## Task 2: Apply StakTrakr customizations to `using-superpowers`

The `using-superpowers` skill red-flags table needs two rows updated per MEMORY.md notes. The stock rows say "Let me explore the codebase first" and "Let me search for this" — they need to redirect to the 4-tier search (CGC → claude-context → Grep/Glob) rather than generic "check skills".

**Files:**
- Modify: `~/.claude/skills/using-superpowers/SKILL.md` lines 63-64 (the two codebase exploration red flag rows)

**Step 1: Read the current red flags table**

```bash
sed -n '56,74p' ~/.claude/skills/using-superpowers/SKILL.md
```

**Step 2: Replace the two exploration red flag rows**

Find this exact text:
```
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first. |
| "Let me gather information first" | Skills tell you HOW to gather information. |
```

Replace with:
```
| "Let me explore the codebase first" | Run tiers yourself: CGC MCP → claude-context → Grep/Glob. Never delegate to subagent for basic search. |
| "Let me gather information first" | Run tiers yourself: CGC MCP → claude-context → Grep/Glob. Never delegate to subagent for basic search. |
```

**Step 3: Verify**

```bash
grep -n "explore the codebase\|gather information" ~/.claude/skills/using-superpowers/SKILL.md
```

Expected: both rows now contain "CGC MCP → claude-context → Grep/Glob"

---

## Task 3: Create the global `codebase-search` skill

This skill is the mandatory search gate — called by `brainstorming` and `writing-plans` before any planning work. It produces a **Codebase Impact Report** that gets injected into the planning context.

**Files:**
- Create: `~/.claude/skills/codebase-search/SKILL.md`

**Step 1: Write the skill**

Full content:

```markdown
---
name: codebase-search
description: Mandatory codebase search gate — run before any planning, design, or implementation. Searches via CGC → claude-context → Grep/Glob in order and produces a Codebase Impact Report.
---

# Codebase Search

Run this skill before brainstorming, writing-plans, or any implementation work. It produces a **Codebase Impact Report** grounding all plans in the real codebase.

## Project Detection

Check for `CLAUDE.md` in the current working directory to identify the project:

```bash
ls CLAUDE.md 2>/dev/null && echo "Project: $(basename $(pwd))" || echo "No CLAUDE.md found — check pwd"
```

If no `CLAUDE.md`, check parent directories up to 2 levels. Note the project name in your report.

## The Four-Tier Search Protocol

Run tiers in order. Stop when you have sufficient evidence. Always run at least tiers 1 and 2.

### Tier 1: CGC — Structural Graph (call chains, callers, imports)

Use when: you need to know what calls a function, what a change breaks, or what imports what.

Tools:
- `mcp__code-graph-context__find_callers` — what calls this function?
- `mcp__code-graph-context__find_call_chain` — full call chain from entry point
- `mcp__code-graph-context__find_definitions` — where is this defined?
- `mcp__code-graph-context__find_imports` — what imports this module?

If CGC Docker is not running, skip to Tier 2. Note in report: "CGC unavailable — tier 1 skipped."

### Tier 2: Claude-Context — Semantic Search

Use for: "find code related to X pattern", conceptual discovery, finding all related code for a domain.

Tool: `mcp__claude-context__search_code`

Run at minimum 2-3 queries covering:
1. The feature/domain being planned
2. Any existing patterns that should be reused
3. Any globals, constants, or storage keys involved

### Tier 3: Grep / Glob — Literal Matches

Use for: exact function names, storage key strings, class names, file patterns.

Tools: Grep (content), Glob (filenames)

Run targeted queries for any specific names surfaced in tiers 1-2.

### Tier 4: Explore Agent

Use only if tiers 1-3 leave critical questions unanswered. Justify in report why tiers 1-3 were insufficient.

## Codebase Impact Report

After running the tiers, produce this report in your response:

```
## Codebase Impact Report

**Project:** [name from CLAUDE.md]
**Query:** [what was searched for]
**CGC Status:** [available / unavailable]

### Files Affected
List every file the planned work will likely touch, with line ranges where known:
- `js/foo.js:45-80` — [why it's affected]
- `js/constants.js` — [new storage key needed / existing pattern to follow]

### Existing Patterns to Follow
- [Pattern name]: [file:line] — [brief description]
- [Pattern name]: [file:line] — [brief description]

### Globals / Storage Keys Involved
- `SOME_GLOBAL` — defined in `js/state.js:12`, used in N files
- `SOME_KEY` — in ALLOWED_STORAGE_KEYS at `js/constants.js:34`

### Gaps / Unknowns
- [Anything tiers 1-3 couldn't answer — justify if Tier 4 needed]

### Overengineering Risks
- [Any existing utility that should be reused instead of rebuilt]
- [Any pattern that must be followed to avoid security/architecture violations]
```

## Hard Rules

- **Never skip to writing plans without producing this report.**
- **Never propose creating a new utility if one already exists** — tiers 1-2 will surface it.
- **Never reference a file path in a plan that wasn't confirmed by this search.**
- If CGC finds that a proposed change breaks existing callers, flag it as a blocker before planning proceeds.
```

**Step 2: Verify the skill was created**

```bash
cat ~/.claude/skills/codebase-search/SKILL.md | head -5
```

Expected: frontmatter with `name: codebase-search`

---

## Task 4: Patch `brainstorming` fork — mandatory codebase search gate

Add an explicit **Phase 0** to the brainstorming checklist that requires `codebase-search` to run and its Impact Report to be attached before asking any clarifying questions.

**Files:**
- Modify: `~/.claude/skills/brainstorming/SKILL.md`

**Step 1: Read current checklist section**

```bash
sed -n '23,32p' ~/.claude/skills/brainstorming/SKILL.md
```

**Step 2: Replace checklist**

Find:
```markdown
## Checklist

You MUST create a task for each of these items and complete them in order:

1. **Explore project context** — check files, docs, recent commits
2. **Ask clarifying questions** — one at a time, understand purpose/constraints/success criteria
3. **Propose 2-3 approaches** — with trade-offs and your recommendation
4. **Present design** — in sections scaled to their complexity, get user approval after each section
5. **Write design doc** — save to `docs/plans/YYYY-MM-DD-<topic>-design.md` and commit
6. **Transition to implementation** — invoke writing-plans skill to create implementation plan
```

Replace with:
```markdown
## Checklist

You MUST create a task for each of these items and complete them in order:

1. **Run codebase-search** — invoke `codebase-search` skill, produce Codebase Impact Report, attach to context. DO NOT proceed to step 2 until report is complete.
2. **Explore project context** — check recent commits and CLAUDE.md; the codebase-search report covers code structure
3. **Ask clarifying questions** — one at a time, understand purpose/constraints/success criteria
4. **Propose 2-3 approaches** — with trade-offs and your recommendation. Each approach MUST reference existing patterns from the Impact Report.
5. **Present design** — in sections scaled to their complexity, get user approval after each section
6. **Write design doc** — save to `docs/plans/YYYY-MM-DD-<topic>-design.md` and commit
7. **Transition to implementation** — invoke writing-plans skill to create implementation plan
```

**Step 3: Replace "Understanding the idea" section**

Find:
```markdown
**Understanding the idea:**
- Check out the current project state first (files, docs, recent commits)
- Ask questions one at a time to refine the idea
```

Replace with:
```markdown
**Understanding the idea:**
- **FIRST:** Invoke the `codebase-search` skill. Attach its Codebase Impact Report to your context before doing anything else.
- Check recent commits and CLAUDE.md for project state
- Ask questions one at a time to refine the idea
```

**Step 4: Add HARD-GATE for search**

After the existing `<HARD-GATE>` block, add:

```markdown
<HARD-GATE>
Do NOT ask clarifying questions, propose approaches, or present designs until the `codebase-search` skill has been invoked and its Codebase Impact Report is complete. Planning against an imagined codebase causes overengineering and rework.
</HARD-GATE>
```

**Step 5: Verify**

```bash
grep -n "codebase-search\|Impact Report" ~/.claude/skills/brainstorming/SKILL.md
```

Expected: at least 4 matches

---

## Task 5: Patch `writing-plans` fork — File Touch Map requirement

Add a mandatory **Pre-Plan Search** phase that requires producing a File Touch Map (every file the plan will touch, confirmed by codebase-search) before writing any task steps.

**Files:**
- Modify: `~/.claude/skills/writing-plans/SKILL.md`

**Step 1: Read the current Overview section**

```bash
sed -n '1,20p' ~/.claude/skills/writing-plans/SKILL.md
```

**Step 2: Add Pre-Plan Search section after the Overview**

After the line `**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."`, add:

```markdown

## Pre-Plan Search (MANDATORY)

Before writing any tasks, you MUST:

1. **Invoke `codebase-search`** — produce a Codebase Impact Report for the feature being planned
2. **Build the File Touch Map** — list every file the plan will modify with confirmed line ranges:
   ```
   File Touch Map:
   - js/constants.js:34      — add new ALLOWED_STORAGE_KEY
   - js/retail.js:120-145    — extend syncRetailPrices()
   - index.html:890          — add new script tag
   ```
3. **No unconfirmed paths** — every `exact/path/to/file.js:line` in the plan MUST appear in the File Touch Map. If you can't confirm a path via codebase-search, note it as [UNCONFIRMED — verify before implementing].

<HARD-GATE>
Do NOT write plan task steps until the File Touch Map is complete. Plans with unconfirmed file paths cause subagents to create new files instead of extending existing ones.
</HARD-GATE>
```

**Step 3: Update the Plan Document Header template**

Find the header template block and add the File Touch Map field:

```markdown
**File Touch Map:**
| File | Lines | Change |
|------|-------|--------|
| `js/foo.js` | 45-80 | [what changes] |
```

Add this after `**Tech Stack:** [Key technologies/libraries]` in the header template.

**Step 4: Verify**

```bash
grep -n "File Touch Map\|codebase-search\|UNCONFIRMED" ~/.claude/skills/writing-plans/SKILL.md
```

Expected: at least 4 matches

---

## Task 6: Strip CLAUDE.md to ~80 lines

Remove all content that now lives in skills. Replace with skill references. Keep only: mandatory pre-code rules, tool priority (condensed), project overview (5 bullets), instruction file architecture table, and critical patterns as a pointer.

**Files:**
- Modify: `/Volumes/DATA/GitHub/StakTrakr/CLAUDE.md`

**Step 1: Read the full current CLAUDE.md** (already read — 412 lines)

**Step 2: Write the condensed version**

The new CLAUDE.md contains exactly these sections:

```markdown
# CLAUDE.md

**For Claude Code (Desktop CLI)** — Local Mac development with MCP servers and skills.
**For Claude.ai (Web)** — Use `AGENTS.md` instead.

---

## Before Writing Any Code — Mandatory

1. **Check for a skill first.** Any task with 1% chance of matching a skill MUST invoke it.
2. **New feature or UI work?** → `superpowers:brainstorming` (includes mandatory codebase-search gate)
3. **Bug or unexpected behavior?** → `superpowers:systematic-debugging`
4. **About to claim something works?** → `superpowers:verification-before-completion`
5. **Multiple independent tasks?** → `superpowers:dispatching-parallel-agents`
6. **Implementing a plan?** → `superpowers:subagent-driven-development`
7. **PR ready?** → `pr-resolve` with Phase 0 parallel agents

**Red flags:**
- "Let me just quickly add this..." → brainstorming first
- "I'll fix this real fast..." → systematic-debugging first
- "It should work now" → verification-before-completion first
- "Let me explore the codebase..." → run CGC → claude-context → Grep/Glob yourself first
- "I'll do these three things..." → dispatching-parallel-agents
- "New multi-element UI component..." → `ui-mockup` skill (Stitch)

## Tool Priority

**Code search (cheapest → most expensive — use in order):**
1. CGC (`mcp__code-graph-context__*`) — call chains, callers, what breaks. Start here.
2. `mcp__claude-context__search_code` — semantic discovery. Always second.
3. Grep / Glob — literal matches.
4. Explore agent — only after 1-3 are insufficient.

**Key MCP tools:**
- `mcp__sequential-thinking__*` — multi-step reasoning, debugging
- `mcp__codacy__*` — code quality, use during pr-resolve
- `mcp__claude_ai_Linear__*` — all Linear ops (team: `f876864d-ff80-4231-ae6c-a8e5cb69aca4`)
- `mcp__memento__*` — session persistence, handoffs, insights
- `mcp__context7__*` — library docs (Chart.js, Bootstrap, jsPDF)
- `mcp__firecrawl-local__*` — free scraping via Docker (port 3002)
- `mcp__stitch__*` — UI mockups via `ui-mockup` skill (Gemini preferred)
- `mcp__browserbase__*` — cloud NL tests only, costs credits, require explicit approval

**Browser testing:**
| Tool | When | Cost |
|------|------|------|
| Claude-in-Chrome | Collaborative, see what user sees | Free |
| Chrome DevTools MCP | Deep debug (contextual, enable on request) | Free |
| Browserless (local Docker) | Scripted Playwright, smoke tests | Free |
| Browserbase (cloud) | Stagehand NL tests, pre-release QA | Paid |

## Project Overview

StakTrakr is a **precious metals inventory tracker**. Single HTML page, vanilla JS, localStorage, no backend. Works on `file://` and HTTP. See `coding-standards` skill for full architecture.

- **Portfolio model**: Purchase / Melt / Retail with Gain/Loss. `meltValue` is qty-adjusted.
- **Multi-currency**: USD base, Open Exchange Rates API, `formatCurrency()`.
- **Versioning**: `BRANCH.RELEASE.PATCH` in `js/constants.js`. Use `/release` skill.
- **Future**: ApexCharts + Tabler migration in progress — new features follow that pattern.
- **Quality**: Codacy A+ gate. All PRs must pass before merge.

## PR & Release Lifecycle

See `/release` skill for version bumps. PR flow:
1. `gh pr create --draft` early — Codacy/Copilot scan on every push
2. Commit freely to `dev` with STAK-### references
3. Ship: `/release` Phase 4.5 → audit commits → rewrite PR body → `gh pr ready` → `pr-resolve`
4. Merge to main → GitHub Release tag (always targets main)

**Jules PRs** — always draft, always review first. Jules has no Memento/Linear/CLAUDE.md context. Run `pr-resolve` before considering merge. Verify: `safeGetElement()`, `saveData()`/`loadData()`, `ALLOWED_STORAGE_KEYS`, `sw.js` CORE_ASSETS, `sanitizeHtml()`.

## UI Design Workflow

Three stages — never skip to implementation for non-trivial components (≥3 data elements or uncertain layout):
1. **Stitch** (`ui-mockup` skill) — visual concept
2. **Playground** (`playground` skill) — interactive prototype
3. **Implementation** (`writing-plans` → `subagent-driven-development`)

Single-element additions (button, badge, tooltip) go straight to implementation.
`frontend-design` plugin is **BANNED** — use `ui-design` skill instead.

## Critical Patterns

Full details in `coding-standards` skill. Summary:

- **Script load order**: 56 scripts in strict dependency order. `file-protocol-fix.js` first, `init.js` last. New files need a position in `index.html` AND `sw.js` CORE_ASSETS.
- **DOM access**: always `safeGetElement(id)` — never `document.getElementById()` except startup code in `about.js`/`init.js`
- **Storage**: `saveData()`/`loadData()` only. Never direct `localStorage`. New keys need `ALLOWED_STORAGE_KEYS` entry in `js/constants.js`.
- **XSS**: `sanitizeHtml()` on any user content in `innerHTML`.
- **SW cache**: stamped by pre-commit hook. Install: `ln -sf ../../devops/hooks/stamp-sw-cache.sh .git/hooks/pre-commit`

## Instruction Files & Skills

| File | Audience | Tracked |
|------|----------|---------|
| `CLAUDE.md` | Claude Code local | Gitignored |
| `AGENTS.md` | Codex, remote agents | Yes |
| `.github/copilot-instructions.md` | Copilot PR reviews | Yes |

**Skills (project-level, git-tracked):** `coding-standards`, `markdown-standards`, `release`, `seed-sync`, `ui-design`, `ui-mockup`
**Skills (user-level):** `codebase-search`, `agent-routing`, `prime`, `remember`, `memento-taxonomy`, `sw-cache`, `sync-instructions`, superpowers forks (14 skills)

Use `/sync-instructions` after significant codebase changes to keep all files aligned.

## Claude → Codex Handoff Safety

Always include: target repo/path, expected outcome, risk classification (read-only / write / network / destructive). Never forward raw secrets — pass references only. Prefer dual-write handoff (Linear + Memento). Require human confirmation for destructive ops.
```

**Step 3: Verify line count**

```bash
wc -l /Volumes/DATA/GitHub/StakTrakr/CLAUDE.md
```

Expected: ~100 lines (target ≤120)

**Step 4: Commit**

```bash
cd /Volumes/DATA/GitHub/StakTrakr
git add CLAUDE.md
git commit -m "chore(docs): condense CLAUDE.md — defer detail to skills"
```

---

## Task 7: Uninstall the superpowers plugin

Now that all 14 skills are in `~/.claude/skills/`, the plugin is redundant and can be removed.

**Step 1: Check plugin list before uninstall**

```bash
claude plugin list 2>/dev/null || ls ~/.claude/plugins/
```

**Step 2: Uninstall**

```bash
claude plugin remove superpowers
```

Or if that command isn't available:

```bash
# Check how plugins are tracked
cat ~/.claude/plugins/plugins.json 2>/dev/null || ls ~/.claude/plugins/
```

Manually remove the entry if needed — do NOT delete the cache directory yet (keep as reference).

**Step 3: Verify skills still load**

Start a new Claude Code session and confirm the superpowers skills still appear in the skill list (they now load from `~/.claude/skills/` not the plugin).

**Step 4: Verify patched skills work**

In a new session, trigger `superpowers:brainstorming` — confirm it invokes `codebase-search` in step 1.

---

## Verification Checklist

After all tasks complete:

- [ ] `ls ~/.claude/skills/` shows 14 new superpowers skill folders
- [ ] `using-superpowers` red flags table has CGC tier references
- [ ] `codebase-search` skill exists with `name:` frontmatter
- [ ] `brainstorming` skill has `codebase-search` in checklist step 1
- [ ] `writing-plans` skill has File Touch Map requirement
- [ ] CLAUDE.md is ≤120 lines
- [ ] CLAUDE.md committed to git
- [ ] superpowers plugin uninstalled (or disabled)
- [ ] New session: brainstorming skill triggers codebase-search before questions

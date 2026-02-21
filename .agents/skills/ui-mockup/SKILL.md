---
name: ui-mockup
description: Use when designing a new multi-element UI component (card grid, modal, panel, dashboard) where layout or visual hierarchy is uncertain, or when a plan references a "visually bare" component needing a design pass.
---

# UI Mockup — Stitch-First Design Workflow

Get a visual spec approved before writing any code. Wire Stitch into the process, then hand off
to `superpowers:writing-plans` with screen IDs as reference.

> **Codex note:** Stitch MCP tools require the `mcp__stitch__*` server. If unavailable in your
> runtime, generate a detailed ASCII/text mockup for user approval and proceed to Step 6.

## Workflow

### Step 1 — Find or create the StakTrakr Stitch project

```
mcp__stitch__list_projects
```

- If a StakTrakr project exists, note its ID.
- If not, call `mcp__stitch__create_project`:
  - **name:** `StakTrakr`
  - **description:** `Precious metals inventory tracker — single HTML page, 4-state theme (light/dark/sepia/system), glassmorphic cards, pill-shaped buttons, CSS variable system`

### Step 2 — Generate the screen

Call `mcp__stitch__generate_screen_from_text` with a detailed prompt (see Prompt Guide below).

Good prompts include:
- Component type and context (settings panel section, card grid, modal body)
- All data elements (badge, stats row, vendor list, sparkline, footer buttons)
- All states: loading skeleton, empty/no-data, error
- Hover/focus interactions explicitly described
- Theme context (light + dark mode values)

### Step 3 — Review with user

Present the Stitch output (screen ID + summary). Ask:

> "Does this match the intended design direction? Any changes before I write the plan?"

### Step 4 — Iterate if needed

| Need | Tool |
|------|------|
| Alternative color/layout options | `mcp__stitch__generate_variants` |
| Targeted change to a specific element | `mcp__stitch__edit_screens` |
| Retrieve approved screen later | `mcp__stitch__get_screen` |

Repeat until user approves.

### Step 5 — Extract the design spec

From the approved screen, document:
- Exact color values, spacing, border-radius decisions
- Component hierarchy and data layout
- Interaction states (hover, loading, empty)
- CSS delta: what changes from the current app baseline

### Step 6 — Hand off

Invoke `superpowers:writing-plans` with:
- Stitch screen ID(s) as implementation reference
- Extracted CSS delta as part of the spec

---

## Prompt Guide for StakTrakr Components

Open every Stitch prompt with this context block:

```
StakTrakr is a precious metals inventory tracker with a 4-state theme system
(light/dark/sepia/system). Design language: glassmorphic transparent overlays,
pill-shaped buttons (border-radius: 999px), CSS variable system
(--primary #3b82f6, --bg-secondary, --text-muted), 8px border radius on cards,
subtle 1px borders.

Dark mode: cards use rgba(255,255,255,0.03) background, rgba(255,255,255,0.1) border.
Light mode: cards use #f8fafc background, #cbd5e1 border.
```

Then describe the specific component fully.

---

## When to Use

- Card grids or dashboard panels with ≥3 distinct data elements
- Modals with non-trivial layout (multiple sections, tabbed content)
- Redesigning an existing component flagged as "visually bare"
- Any component where the plan or brainstorm notes "design uncertain"

## When to Skip

- Single-element additions (a button, a badge, a tooltip)
- Components with a clear 1:1 analogue already in the codebase
- Pure behavior changes with no layout impact
- Bug fixes

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Skipping theme context in the prompt | Always include light + dark mode values |
| Forgetting empty/loading states | Describe them explicitly in the prompt |
| Jumping to `writing-plans` without user approval | Wait for explicit sign-off on the screen |
| Using `edit_screens` for major redesigns | Use `generate_variants` instead |

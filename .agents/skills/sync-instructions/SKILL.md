---
name: sync-instructions
description: Synchronize AGENTS/CLAUDE/Copilot instruction docs and mirrored skills across Codex and Claude after architecture, workflow, or skill changes.
---

# Sync Instructions — StakTrakr

Use this skill after major repo instruction or skill updates.

## Scope

### Instruction docs

- `AGENTS.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`

### Mirrored repo skills

- `.agents/skills/*/SKILL.md`
- `.claude/skills/*/SKILL.md` (where tracked mirrors exist)

## Workflow

### Phase 1: Detect doc drift

Compare key sections:

1. Script loading order
1. Global architecture notes
1. Storage and security rules
1. Version/release sync rules
1. Handoff protocol guidance
1. Claude-relay permission/network safeguards

Report concrete mismatches before editing.

### Phase 2: Detect skill drift

For mirrored skills, diff corresponding files and classify:

- expected divergence (tool names, invocation style, path conventions)
- accidental divergence (missing behavior, stale docs, outdated taxonomy)

### Phase 3: Reconcile with explicit direction

For each drifted skill choose one:

1. Claude -> Codex
1. Codex -> Claude
1. Manual merge
1. Keep intentional divergence

### Phase 4: Validate

1. Confirm frontmatter validity (`name`, `description`) in all touched skills.
1. Confirm no stale file paths or tool names remain.
1. Summarize exact files changed and why.

## Current Tracked Repo Skills

- `coding-standards`
- `markdown-standards`
- `release`
- `seed-sync`
- `memento-taxonomy`
- `remember`
- `sync-instructions`

## Guardrails

- Keep AGENTS as Codex-primary and CLAUDE as local-Claude-specific.
- Do not remove Codex-managed MCP/handoff sections from AGENTS.
- Do not relax Codex relay preflight checks for network/escalated/destructive commands without explicit maintainer approval.
- Do not overwrite intentional platform-specific adjustments without confirmation.

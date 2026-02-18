---
name: markdown-standards
description: Codex markdown standards for StakTrakr docs and skill files (lint-safe structure, spacing, headings, and frontmatter conventions).
---

# Markdown Standards — StakTrakr

Use this skill when creating or editing any `.md` file in the repo.

## Scope

Applies to docs, changelogs, instruction files, and skill definitions.

## Required Structure

1. Start with YAML frontmatter only when the file type requires it (skills do).
2. Include exactly one top-level `#` heading in the body.
3. Keep heading hierarchy ordered (`#` -> `##` -> `###`).

## Spacing Rules

- Put one blank line before and after:
  - headings,
  - lists,
  - fenced code blocks,
  - tables.
- Avoid multiple consecutive blank lines.
- End files with exactly one trailing newline.

## List Rules

- Use `-` for unordered lists.
- Use `1.` style for ordered lists.
- Keep list marker spacing consistent (single space after marker).
- Keep lists flat unless nesting is truly needed.

## Code Block Rules

- Always use fenced code blocks.
- Prefer language tags (for example `bash`, `javascript`, `json`, `markdown`).
- Surround code fences with blank lines.

## Table Rules

- Keep columns aligned and readable.
- Avoid overly wide tables; split when needed.
- Use tables only when they improve scanability.

## Skill Frontmatter Rules

For `*/SKILL.md` files:

```yaml
---
name: skill-name
description: Clear trigger description with when-to-use context.
---
```

Requirements:

- `name` must match skill folder intent.
- `description` must be specific enough for reliable trigger matching.
- Keep frontmatter minimal and portable.

## Content Quality

- Prefer concise, actionable instructions over long narrative.
- Use repository-specific terminology and paths.
- Remove stale references to unavailable tools or workflows.

## Final Check

Before completion:

1. Run a quick visual lint pass for spacing and heading flow.
2. Verify code fences and lists are surrounded by blank lines.
3. Verify no stale paths/tool names remain.

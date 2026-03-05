---
name: markdown-standards
description: Markdown linting rules for documentation — avoid Codacy/Copilot flags on CLAUDE.md, CHANGELOG.md, copilot-instructions.md, and all other .md files.
---

# Markdown Standards

Comprehensive markdown linting rules to prevent Codacy and Copilot flags. These rules apply to **all** markdown files in any repository: `CLAUDE.md`, `CHANGELOG.md`, `copilot-instructions.md`, `ROADMAP.md`, skill documentation, and README files.

---

## Critical Rules (Frequent Violations)

### MD032: Lists should be surrounded by blank lines

**ALWAYS add a blank line before and after lists** (ordered, unordered, or task lists).

```markdown
<!-- CORRECT -->
This is a paragraph.

- List item 1
- List item 2
- List item 3

This is another paragraph.

<!-- WRONG — triggers MD032 -->
This is a paragraph.
- List item 1
- List item 2

This is another paragraph.
```

**Nested lists** also need blank lines between the parent item and the nested list:

```markdown
<!-- CORRECT -->
- Parent item

  - Nested item 1
  - Nested item 2

- Another parent item

<!-- WRONG -->
- Parent item
  - Nested item 1
  - Nested item 2
- Another parent item
```

### MD031: Fenced code blocks should be surrounded by blank lines

**ALWAYS add a blank line before and after fenced code blocks** (triple backticks).

```markdown
<!-- CORRECT -->
This is a paragraph.

```javascript
const foo = "bar";
```

This is another paragraph.

<!-- WRONG — triggers MD031 -->
This is a paragraph.
```javascript
const foo = "bar";
```
This is another paragraph.
```

### MD022: Headers should be surrounded by blank lines

**ALWAYS add a blank line before and after headers** (except at the start of the file or when a header immediately follows another header).

```markdown
<!-- CORRECT -->
This is a paragraph.

## Heading

This is another paragraph.

<!-- WRONG — triggers MD022 -->
This is a paragraph.
## Heading
This is another paragraph.
```

**Exception**: Headers can immediately follow other headers without a blank line:

```markdown
<!-- CORRECT -->
# Top-Level Header
## Sub-Header

Content here.
```

---

## Formatting Rules

### MD047: Files should end with a single newline character

**ALWAYS ensure markdown files end with exactly one newline**.

### MD012: Multiple consecutive blank lines

**NEVER use more than one consecutive blank line**.

### MD009: Trailing spaces

**NEVER leave trailing spaces at the end of lines**.

### MD010: Hard tabs

**NEVER use hard tabs for indentation**. Use spaces only.

### MD030: Spaces after list markers

**Use exactly one space after list markers** (`-`, `*`, `1.`, etc.).

---

## Header Rules

### MD025: Multiple top-level headers

**Use only ONE top-level header (`#`) per file**. Use `##`, `###`, etc. for sub-sections.

**Exception**: Skill files in `.claude/skills/*/SKILL.md` use frontmatter and a single `#` header for the skill name.

### MD041: First line should be a top-level header

**Start markdown files with a `#` header** (or frontmatter followed by a `#` header).

**Exception**: Files with YAML frontmatter (skill files, commands) can start with `---`.

### MD026: Trailing punctuation in headers

**NEVER use trailing punctuation in headers** (no `.`, `,`, `:`, `;`, `!`, `?`).

**Exception**: Question marks may be acceptable in FAQ-style headers, but prefer rephrasing.

---

## Link & Image Rules

### MD042: No empty links

**NEVER use empty link URLs**.

### MD045: Images should have alt text

**ALWAYS provide descriptive alt text for images**.

---

## Line Length

### MD013: Line length (configurable)

**Keep lines under 120 characters** when possible. Soft limit — breaking it is acceptable for long URLs, tables, code blocks, and headings.

---

## Table Rules

### MD055: Table pipe style

**Use consistent table pipe style**. Prefer leading and trailing pipes.

### MD056: Table column count

**Ensure all rows have the same number of columns**.

---

## Code Block Rules

### MD040: Fenced code blocks should have a language

**ALWAYS specify a language for fenced code blocks** (use `text` or `plaintext` for non-code examples).

### MD046: Code block style (configurable)

**Use fenced code blocks (triple backticks) consistently**. Avoid indented code blocks.

---

## List Rules

### MD004: Unordered list style

**Use `-` (hyphen) consistently for all unordered lists**.

### MD029: Ordered list item prefix

**Use `1.` for all ordered list items** (lazy numbering) or sequential numbering. Be consistent within a file.

---

## Emphasis Rules

### MD036: Emphasis instead of header

**NEVER use emphasis (bold/italic) as a substitute for headers**.

### MD037: Spaces inside emphasis markers

**NEVER put spaces immediately inside emphasis markers**.

---

## Horizontal Rules

### MD035: Horizontal rule style

**Use `---` (three hyphens) consistently**.

---

## Special Cases

### Frontmatter in skill files

Skill files (`.claude/skills/*/SKILL.md`) use YAML frontmatter. Frontmatter must start and end with `---` on their own lines, come before any other content, and be followed by a blank line before the first `#` header.

### Multi-line list items

When list items span multiple lines, **indent continuation lines by 2 spaces** (to align with the item text, not the marker).

---

## Quick Reference Checklist

Before committing markdown changes, verify:

- [ ] Blank line before every list (MD032)
- [ ] Blank line after every list (MD032)
- [ ] Blank line before every code block (MD031)
- [ ] Blank line after every code block (MD031)
- [ ] Blank line before every header (except at start or after another header) (MD022)
- [ ] Blank line after every header (MD022)
- [ ] Language specified for all fenced code blocks (MD040)
- [ ] No trailing spaces (MD009)
- [ ] No hard tabs (MD010)
- [ ] File ends with single newline (MD047)
- [ ] Only one consecutive blank line (MD012)
- [ ] Only one `#` top-level header (MD025)
- [ ] Headers have no trailing punctuation (MD026)
- [ ] Unordered lists use `-` consistently (MD004)
- [ ] All images have alt text (MD045)
- [ ] No empty links (MD042)

---

## Summary

The most common violations are:

1. **MD032**: Missing blank lines before/after lists
2. **MD031**: Missing blank lines before/after code blocks
3. **MD022**: Missing blank lines before/after headers

**Rule of thumb**: When in doubt, add a blank line. Blank lines improve readability and prevent nearly all common markdown linting issues.

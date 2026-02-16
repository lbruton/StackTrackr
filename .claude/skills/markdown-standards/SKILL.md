---
name: markdown-standards
description: Markdown linting rules for StakTrakr documentation — avoid Codacy/Copilot flags on CLAUDE.md, CHANGELOG.md, copilot-instructions.md, and all other .md files.
---

# StakTrakr Markdown Standards

Comprehensive markdown linting rules to prevent Codacy and Copilot flags. These rules apply to **all** markdown files in the repository: `CLAUDE.md`, `CHANGELOG.md`, `copilot-instructions.md`, `ROADMAP.md`, skill documentation, and README files.

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

Most editors do this automatically. In VS Code/Cursor, enable `files.insertFinalNewline: true`.

### MD012: Multiple consecutive blank lines

**NEVER use more than one consecutive blank line**.

```markdown
<!-- CORRECT -->
Paragraph 1.

Paragraph 2.

<!-- WRONG — triggers MD012 -->
Paragraph 1.


Paragraph 2.
```

### MD009: Trailing spaces

**NEVER leave trailing spaces at the end of lines** (unless intentionally creating a line break, which is discouraged — use `<br>` or double-space for explicit breaks).

```markdown
<!-- CORRECT -->
This is a line.
This is another line.

<!-- WRONG — triggers MD009 -->
This is a line.···
This is another line.
```

Use your editor's "trim trailing whitespace" feature. In VS Code/Cursor: `files.trimTrailingWhitespace: true`.

### MD010: Hard tabs

**NEVER use hard tabs for indentation**. Use spaces only.

```markdown
<!-- CORRECT -->
- List item
  - Nested item (2 spaces)

<!-- WRONG — triggers MD010 -->
- List item
→ - Nested item (hard tab)
```

Configure your editor to replace tabs with spaces. In VS Code/Cursor: `editor.insertSpaces: true`.

### MD030: Spaces after list markers

**Use exactly one space after list markers** (`-`, `*`, `1.`, etc.).

```markdown
<!-- CORRECT -->
- Item 1
- Item 2

1. First
2. Second

<!-- WRONG — triggers MD030 -->
-  Item 1 (two spaces)
-Item 2 (no space)

1.  First (two spaces)
2.Second (no space)
```

---

## Header Rules

### MD025: Multiple top-level headers

**Use only ONE top-level header (`#`) per file**. Use `##`, `###`, etc. for sub-sections.

```markdown
<!-- CORRECT -->
# Document Title

## Section 1

### Subsection 1.1

## Section 2

<!-- WRONG — triggers MD025 -->
# Document Title

# Another Top-Level Header
```

**Exception**: Skill files in `.claude/skills/*/SKILL.md` use frontmatter and a single `#` header for the skill name.

### MD041: First line should be a top-level header

**Start markdown files with a `#` header** (or frontmatter followed by a `#` header).

```markdown
<!-- CORRECT -->
# Document Title

Content here.

<!-- WRONG — triggers MD041 -->
Content without a header.

## Some Section
```

**Exception**: Files with YAML frontmatter (skill files, commands) can start with `---`.

### MD026: Trailing punctuation in headers

**NEVER use trailing punctuation in headers** (no `.`, `,`, `:`, `;`, `!`, `?`).

```markdown
<!-- CORRECT -->
## Installation Steps

## What is StakTrakr

<!-- WRONG — triggers MD026 -->
## Installation Steps.

## What is StakTrakr?
```

**Exception**: Question marks may be acceptable in FAQ-style headers, but prefer rephrasing to avoid them.

---

## Link & Image Rules

### MD042: No empty links

**NEVER use empty link URLs**.

```markdown
<!-- CORRECT -->
[Link text](https://example.com)

<!-- WRONG — triggers MD042 -->
[Link text]()
```

### MD045: Images should have alt text

**ALWAYS provide descriptive alt text for images**.

```markdown
<!-- CORRECT -->
![Screenshot of the StakTrakr dashboard](screenshot.png)

<!-- WRONG — triggers MD045 -->
![](screenshot.png)
```

---

## Line Length

### MD013: Line length (configurable)

**Keep lines under 120 characters** when possible. This is a soft limit — breaking it is acceptable for:
- Long URLs
- Tables
- Code blocks
- Headings that would be awkward to break

```markdown
<!-- PREFERRED -->
This is a long paragraph that should be broken into multiple lines
instead of being one very long line that extends beyond the comfortable
reading width.

<!-- ACCEPTABLE (long URL) -->
See the [documentation](https://very-long-url-that-cannot-be-reasonably-shortened.example.com/path/to/resource?with=many&query=parameters) for details.
```

Configure your editor to soft-wrap at 120 characters. In VS Code/Cursor: `editor.wordWrapColumn: 120`.

---

## Table Rules

### MD055: Table pipe style

**Use consistent table pipe style**. Prefer leading and trailing pipes:

```markdown
<!-- CORRECT -->
| Column 1 | Column 2 |
|----------|----------|
| Value 1  | Value 2  |

<!-- WRONG — inconsistent pipes -->
Column 1 | Column 2
|----------|----------
Value 1  | Value 2  |
```

### MD056: Table column count

**Ensure all rows have the same number of columns**.

```markdown
<!-- CORRECT -->
| A | B | C |
|---|---|---|
| 1 | 2 | 3 |
| 4 | 5 | 6 |

<!-- WRONG — mismatched columns -->
| A | B | C |
|---|---|---|
| 1 | 2 |
| 4 | 5 | 6 |
```

---

## Code Block Rules

### MD040: Fenced code blocks should have a language

**ALWAYS specify a language for fenced code blocks** (use `text` or `plaintext` for non-code examples).

````markdown
<!-- CORRECT -->
```javascript
const foo = "bar";
```

```bash
npm install
```

```text
Plain text output
```

<!-- WRONG — triggers MD040 -->
```
const foo = "bar";
```
````

### MD046: Code block style (configurable)

**Use fenced code blocks (triple backticks) consistently**. Avoid indented code blocks (4-space indentation).

````markdown
<!-- PREFERRED — fenced blocks -->
```javascript
const foo = "bar";
```

<!-- AVOID — indented code blocks -->
    const foo = "bar";
````

Fenced blocks support syntax highlighting and are more explicit.

---

## List Rules

### MD004: Unordered list style

**Use consistent unordered list markers**. StakTrakr uses `-` (hyphen) for all unordered lists.

```markdown
<!-- CORRECT -->
- Item 1
- Item 2
  - Nested item 1
  - Nested item 2

<!-- WRONG — mixed markers -->
- Item 1
* Item 2
  + Nested item 1
  - Nested item 2
```

### MD029: Ordered list item prefix

**Use `1.` for all ordered list items** (lazy numbering) or sequential numbering. Be consistent within a file.

```markdown
<!-- CORRECT (lazy numbering — preferred) -->
1. First item
1. Second item
1. Third item

<!-- CORRECT (sequential) -->
1. First item
2. Second item
3. Third item

<!-- WRONG — mixed styles -->
1. First item
1. Second item
3. Third item
```

Lazy numbering (`1.` for all items) makes reordering easier and is preferred.

---

## Emphasis Rules

### MD036: Emphasis instead of header

**NEVER use emphasis (bold/italic) as a substitute for headers**.

```markdown
<!-- CORRECT -->
## Section Title

Content here.

<!-- WRONG — triggers MD036 -->
**Section Title**

Content here.
```

### MD037: Spaces inside emphasis markers

**NEVER put spaces immediately inside emphasis markers**.

```markdown
<!-- CORRECT -->
This is *italic* and this is **bold**.

<!-- WRONG — triggers MD037 -->
This is * italic * and this is ** bold **.
```

---

## Horizontal Rules

### MD035: Horizontal rule style

**Use consistent horizontal rule style**. StakTrakr uses `---` (three hyphens).

```markdown
<!-- CORRECT -->
Section 1 content.

---

Section 2 content.

<!-- WRONG — inconsistent styles -->
Section 1 content.

---

Section 2 content.

***

Section 3 content.
```

---

## Special Cases

### Frontmatter in skill files

Skill files (`.claude/skills/*/SKILL.md`) use YAML frontmatter:

```markdown
---
name: skill-name
description: Brief description of the skill.
---

# Skill Name

Content here.
```

**Frontmatter must**:
- Start and end with `---` on their own lines
- Come before any other content
- Be followed by a blank line before the first `#` header

### Changelog format

`CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- New feature description

### Fixed

- Bug fix description

## [1.2.3] - 2026-02-15

### Changed

- Change description
```

**Rules**:
- Use `##` for version headers (`## [1.2.3]` or `## [Unreleased]`)
- Use `###` for change type sections (`### Added`, `### Fixed`, etc.)
- Add blank lines before and after all headers and lists (MD022, MD032)
- Always include the date in ISO format for released versions

### Multi-line list items

When list items span multiple lines, **indent continuation lines by 2 spaces** (to align with the item text, not the marker):

```markdown
<!-- CORRECT -->
- This is a long list item that spans multiple lines and needs to be
  wrapped for readability. The continuation line is indented by 2 spaces.

- Another item.

<!-- WRONG — continuation not indented -->
- This is a long list item that spans multiple lines and needs to be
wrapped for readability.

- Another item.
```

---

## Editor Configuration

To prevent markdown linting issues automatically, configure your editor:

### VS Code / Cursor settings

Add to `.vscode/settings.json` (user or workspace):

```json
{
  "files.insertFinalNewline": true,
  "files.trimTrailingWhitespace": true,
  "editor.insertSpaces": true,
  "editor.tabSize": 2,
  "editor.wordWrapColumn": 120,
  "editor.rulers": [120],
  "[markdown]": {
    "editor.wordWrap": "wordWrapColumn",
    "editor.quickSuggestions": {
      "comments": "off",
      "strings": "off",
      "other": "off"
    }
  }
}
```

### markdownlint extension

If using the `markdownlint` VS Code extension, create `.markdownlint.json`:

```json
{
  "default": true,
  "MD013": { "line_length": 120 },
  "MD033": false,
  "MD041": { "front_matter_title": "" }
}
```

**Note**: The repository does not currently have a `.markdownlint.json`, but adding one would help prevent violations.

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

## Common Violation Patterns

### Pattern 1: List immediately after paragraph

```markdown
<!-- WRONG -->
Here are the steps:
1. First step
2. Second step

<!-- CORRECT -->
Here are the steps:

1. First step
2. Second step
```

### Pattern 2: Code block without spacing

````markdown
<!-- WRONG -->
Example code:
```javascript
const x = 1;
```
Next paragraph.

<!-- CORRECT -->
Example code:

```javascript
const x = 1;
```

Next paragraph.
````

### Pattern 3: Header without spacing

```markdown
<!-- WRONG -->
Previous paragraph.
## New Section
Content here.

<!-- CORRECT -->
Previous paragraph.

## New Section

Content here.
```

### Pattern 4: Nested list without spacing

```markdown
<!-- WRONG -->
- Parent item
  - Nested item

<!-- CORRECT -->
- Parent item

  - Nested item
```

---

## Integration with Codacy

Codacy automatically checks markdown files for these rules when:
- Files are committed to a PR
- Files are analyzed via `codacy_cli_analyze`

After editing **any** markdown file, Claude Code must:
1. Run `codacy_cli_analyze` on the modified file (per `.github/instructions/codacy.instructions.md`)
2. Fix any reported markdown linting issues immediately
3. Re-run `codacy_cli_analyze` to verify fixes

Common Codacy markdown rule codes:
- **MD032**: Blank lines around lists
- **MD031**: Blank lines around code blocks
- **MD022**: Blank lines around headers
- **MD047**: File must end with newline
- **MD012**: No multiple consecutive blank lines
- **MD009**: No trailing spaces
- **MD010**: No hard tabs
- **MD040**: Specify language for code blocks
- **MD025**: Only one top-level header
- **MD026**: No trailing punctuation in headers

---

## When to Use This Skill

This skill auto-loads when:
- Editing `CLAUDE.md`, `CHANGELOG.md`, `copilot-instructions.md`, or any `.md` file
- Creating new markdown documentation
- Reviewing markdown changes in PRs
- Fixing Codacy markdown linting violations

**Auto-load trigger**: Any operation involving markdown file creation or editing.

---

## Summary

The most common violations in StakTrakr are:
1. **MD032**: Missing blank lines before/after lists
2. **MD031**: Missing blank lines before/after code blocks
3. **MD022**: Missing blank lines before/after headers

**Rule of thumb**: When in doubt, add a blank line. Blank lines improve readability and prevent nearly all common markdown linting issues.

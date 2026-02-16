# Markdown Linting Guide

Quick reference for avoiding Codacy and Copilot markdown flags in StakTrakr documentation.

## Quick Setup

### 1. Install the markdownlint extension (recommended)

**VS Code / Cursor:**

```text
Extension ID: DavidAnson.vscode-markdownlint
```

Or search for "markdownlint" in the Extensions marketplace.

### 2. Configuration is already in place

- **`.markdownlint.json`** — Project-wide linting rules (already configured)
- **`.claude/skills/markdown-standards/SKILL.md`** — Comprehensive rule documentation (auto-loads for Claude Code)

## Most Common Violations

### MD032: Blank lines around lists

**Always add a blank line before and after lists.**

```markdown
<!-- WRONG -->
Here are the steps:
- Step 1
- Step 2

<!-- CORRECT -->
Here are the steps:

- Step 1
- Step 2
```

### MD031: Blank lines around code blocks

**Always add a blank line before and after code blocks.**

````markdown
<!-- WRONG -->
Example:
```javascript
const x = 1;
```
Next section.

<!-- CORRECT -->
Example:

```javascript
const x = 1;
```

Next section.
````

### MD022: Blank lines around headers

**Always add a blank line before and after headers.**

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

## Quick Checklist

Before committing markdown changes:

- [ ] Blank line before every list
- [ ] Blank line after every list
- [ ] Blank line before every code block
- [ ] Blank line after every code block
- [ ] Blank line before every header (except at start or after another header)
- [ ] Blank line after every header
- [ ] Language specified for all code blocks (e.g., \`\`\`javascript)
- [ ] No trailing spaces
- [ ] File ends with a single newline

## Rule of Thumb

**When in doubt, add a blank line.** Blank lines improve readability and prevent most markdown linting issues.

## Resources

- **Full rule documentation**: `.claude/skills/markdown-standards/SKILL.md`
- **Linting configuration**: `.markdownlint.json`
- **markdownlint extension**: <https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint>

## Integration with Codacy

After editing any markdown file, Claude Code automatically:

1. Runs `codacy_cli_analyze` on the modified file
2. Reports any markdown linting violations
3. Fixes violations immediately
4. Re-runs analysis to verify

Common Codacy markdown rule codes: **MD032**, **MD031**, **MD022**, **MD047**, **MD012**, **MD009**, **MD010**, **MD040**, **MD025**, **MD026**.

# Markup Style Guide

This document provides a style guide for all Markdown files in the StackrTrackr project. Adhering to these standards ensures consistency and readability across all documentation. All agents and contributors should follow this guide when creating or editing `.md` files.

## General Principles

- **Clarity and Conciseness:** Write clearly and to the point.
- **Consistency:** Apply these styles uniformly across all documents.
- **Semantic Markup:** Use Markdown elements for their intended purpose.

## File Structure

Every Markdown file should follow this basic structure:

1.  **Main Title:** A single `h1` heading (`#`) at the top of the file.
2.  **Introduction:** A brief paragraph summarizing the document's purpose.
3.  **Sections:** Use `h2` (`##`) for major sections and `h3` (`###`) for sub-sections.

## Headings

- Use ATX-style headings (`#`).
- The main title must be an `h1`.
- Use `h2` for primary sections and `h3` for sub-sections. Avoid skipping heading levels (e.g., `h1` directly to `h3`).
- Leave a blank line after each heading.

**Example:**
```markdown
# Document Title

This is the introduction.

## Section 1

This is the content for section 1.

### Subsection 1.1

This is a subsection.
```

## Text Formatting

- **Bold:** Use `**bold text**` for strong emphasis.
- **Italics:** Use `*italic text*` for emphasis or to denote terms.
- **Code:** Use backticks for inline code, like `` `const x = 1;` ``. For file paths and symbol names, use backticks, e.g., `js/inventory.js`.

## Lists

### Unordered Lists

Use a hyphen (`-`) for bullet points.

- Item 1
- Item 2
  - Nested Item 2a
  - Nested Item 2b

### Ordered Lists

Use `1.` for numbered lists.

1. First item
2. Second item
3. Third item

## Code Blocks

- Use triple backticks (```` ``` ````) to create fenced code blocks.
- Always specify the language for syntax highlighting (e.g., `js`, `html`, `css`, `markdown`).

**Example:**
````markdown
```js
function greet() {
  console.log("Hello, world!");
}
```
````

## Tables

- Use pipes (`|`) to create columns and hyphens (`-`) to create the header row separator.
- Align columns using colons (`:`).
- Ensure columns are neatly aligned for readability in the raw Markdown.

**Example:**
| Left-aligned | Center-aligned | Right-aligned |
| :----------- | :------------: | ------------: |
| Content      |    Content     |       Content |
| More content |  More content  |  More content |

## Links

- Use descriptive text for links.
- For internal links, use relative paths.

**Example:**
```markdown
[UI Style Guide](ui_style_guide.md)
```

## Blockquotes

- Use `>` for blockquotes. For multi-paragraph quotes, include `>` on the blank lines between them.

> This is a blockquote.
>
> It spans multiple paragraphs.

By following this guide, we can maintain a high standard of quality and consistency across all project documentation.

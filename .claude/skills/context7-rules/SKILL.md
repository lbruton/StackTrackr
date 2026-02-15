---
name: context7-rules
description: Rules for using Context7 library documentation lookup (mcp__context7__). Use when looking up Chart.js, jsPDF, PapaParse, JSZip, ApexCharts, Tabler, or any external library docs.
user-invocable: false
---

# Context7 — Library Documentation Lookup

Documentation and code examples from any public GitHub library or framework.

## Rules

- **Two-step workflow**: Always call `resolve-library-id` first to get a library ID, then `query-docs` with that ID.
- **Max 3 calls per question** for each tool — use the best result after that.
- **Use for external library lookups** — Chart.js config, jsPDF API, PapaParse options, JSZip usage, ApexCharts, Tabler, etc.
- **Use claude-context for internal code** — Context7 cannot see our private/local codebase.
- **Be specific in queries** — `"How to create pie chart with custom legend labels in Chart.js"` beats `"chart.js pie"`.
- **Check version compatibility** — our dependencies are vanilla JS (no build step), so prefer browser-compatible examples.
- **Use for best practices and patterns** — look up how well-maintained public projects solve similar problems.

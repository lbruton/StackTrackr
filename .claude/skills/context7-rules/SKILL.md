---
name: context7-rules
description: Rules for using Context7 library documentation lookup (mcp__context7__). Use when looking up Chart.js, jsPDF, PapaParse, JSZip, ApexCharts, Tabler, Bootstrap, Playwright, or any external library docs. Also use when planning or implementing features that touch external library APIs.
user-invocable: false
---

# Context7 — Library Documentation Lookup & Verification

Up-to-date documentation and code examples from 33,000+ public libraries. Context7 crawls official docs on a 10–15 day cycle, so results are current — never rely on training data for library APIs.

---

## When to Use Context7

### ALWAYS use Context7 before writing code that touches an external library

- **Planning phase**: Pull docs before designing an implementation approach
- **Implementation phase**: Verify API signatures, options, and patterns before coding
- **Review phase**: Confirm the code matches current library best practices
- **Upgrade/migration**: Check breaking changes between versions

### Specific triggers

- Adding or modifying Chart.js / ApexCharts configuration
- Generating PDFs with jsPDF / AutoTable
- Parsing or exporting CSV with PapaParse
- Creating ZIP archives with JSZip
- Using Bootstrap 5 components or JavaScript API
- Implementing Tabler UI components or icons
- Writing Playwright tests
- Integrating **any** external library, even if it seems familiar

### When NOT to use Context7

- Internal codebase lookups → use `claude-context` (`search_code`)
- General programming concepts or language fundamentals
- Stable, unchanging APIs you're confident about (e.g., `JSON.parse`)

---

## Two-Step Workflow

### Step 1: Resolve Library ID

Call `resolve-library-id` with the library name to get a Context7-compatible ID.

**Skip this step** when you already know the ID (see the registry below). This saves ~7,000 tokens and a round-trip.

### Step 2: Query Documentation

Call `query-docs` with:
- `context7CompatibleLibraryID` — exact ID from step 1 or the registry
- `query` — specific question (enables server-side reranking)
- `topic` (optional) — focus area for large libraries

---

## StakTrakr Library ID Registry

Use these IDs directly — skip `resolve-library-id` for all of them.

| Library | Context7 ID | Snippets | Notes |
|---------|-------------|----------|-------|
| **Chart.js** | `/websites/chartjs` | 1160 | Primary docs site; highest snippet count |
| **Chart.js** (repo) | `/chartjs/chart.js` | 456 | Use for source-level API details |
| **ApexCharts** | `/websites/apexcharts` | 754 | Official docs; future migration target |
| **ApexCharts** (repo) | `/apexcharts/apexcharts.js` | 905 | Use for deeper API internals |
| **jsPDF** | `/parallax/jspdf` | 1551 | Client-side PDF generation |
| **PapaParse** | `/mholt/papaparse` | 78 | CSV parsing/export |
| **JSZip** | `/stuk/jszip` | 95 | ZIP file creation (repo source) |
| **JSZip** (docs site) | `/websites/stuk_github_io_jszip` | 203 | Use for usage examples |
| **Bootstrap 5** | `/websites/getbootstrap` | 2236 | Primary — latest Bootstrap docs |
| **Bootstrap 5.3** | `/websites/getbootstrap_5_3` | 1074 | Version-pinned if needed |
| **Tabler** | `/tabler/tabler` | 1341 | Dashboard UI framework |
| **Tabler Docs** | `/websites/tabler_io` | 1549 | Component & plugin guides |
| **Tabler Icons** | `/tabler/tabler-icons` | 161 | SVG icon set (5945 icons) |
| **Playwright** | `/microsoft/playwright.dev` | 6819 | Testing framework docs |
| **Playwright** (repo) | `/microsoft/playwright` | 5373 | Source-level API reference |

### Choosing between multiple IDs for the same library

- **Docs site** IDs (`/websites/...`) → best for usage patterns, examples, getting-started guides
- **Repo** IDs (`/org/project`) → best for API internals, advanced config, source-level details
- When unsure, prefer the one with the higher snippet count

---

## Query Best Practices

### Be specific — vague queries waste tokens

```
# GOOD — specific, actionable
"How to create a doughnut chart with custom legend labels and onClick handler in Chart.js"
"jsPDF AutoTable column width and cell styling options"
"PapaParse streaming parse with header row and error handling"

# BAD — too vague
"chart.js pie"
"jspdf table"
"csv parse"
```

### Use topic filtering for large libraries

For libraries with 500+ snippets, add a `topic` to narrow results:

| Library | Useful topics |
|---------|--------------|
| Chart.js | `"plugins"`, `"scales"`, `"animations"`, `"legend"`, `"tooltips"`, `"doughnut"` |
| ApexCharts | `"toolbar"`, `"annotations"`, `"responsive"`, `"events"`, `"sparkline"` |
| Bootstrap | `"modal"`, `"tooltip"`, `"dropdown"`, `"grid"`, `"utilities"` |
| Tabler | `"cards"`, `"forms"`, `"navigation"`, `"icons"`, `"colors"` |
| Playwright | `"selectors"`, `"assertions"`, `"fixtures"`, `"page"`, `"locator"` |
| jsPDF | `"autotable"`, `"images"`, `"fonts"`, `"pages"` |

### Respect the 3-call limit

Do not call `resolve-library-id` or `query-docs` more than 3 times each per question. If you can't find what you need after 3 calls, use the best result you have.

### Token budget awareness

- `resolve-library-id`: ~7,000 tokens per call (skip with registry IDs)
- `query-docs`: ~3,300–5,000 tokens per call (default 5,000 max)
- For quick lookups, keep `maxTokens` at 5,000
- For comprehensive API exploration, set `maxTokens` up to 10,000

---

## Integration with Planning Workflow

When entering plan mode for a feature that involves external libraries:

1. **Before designing** — query Context7 for current API patterns
2. **During design** — verify that planned usage matches actual library API
3. **Check version compatibility** — StakTrakr is vanilla JS with no build step; prefer browser-compatible, CDN-friendly examples
4. **Check migration paths** — when planning ApexCharts/Tabler adoption, pull docs for both the current library (Chart.js/Bootstrap) and the target library to understand the delta

### Feature development checklist

Before writing any code that calls a library API:

- [ ] Pulled current docs from Context7 for the specific API being used
- [ ] Verified the method/option exists in the current version
- [ ] Confirmed the pattern works in a vanilla JS / no-build environment
- [ ] Checked for deprecation warnings or breaking changes
- [ ] For new library adoption: compared patterns with existing StakTrakr conventions

---

## Combining with Other Tools

| Scenario | Tool chain |
|----------|-----------|
| "How does our Chart.js code work?" | `claude-context` first (internal), then Context7 (verify against current docs) |
| "Add a new chart type" | Context7 (pull Chart.js docs for that type), then `claude-context` (find where charts are created) |
| "Upgrade Bootstrap modal usage" | Context7 (pull Bootstrap 5.3 modal docs), then `claude-context` (find all modal code) |
| "Library not in Context7" | Fall back to `brave-search` or `web_fetch` on official docs |
| "Bleeding-edge release (< 1 week old)" | Context7 may lag; use `brave-search` + `web_fetch` for very new releases |

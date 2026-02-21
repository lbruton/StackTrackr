# GEMINI.md - StakTrakr Context

This file provides foundational mandates and project-specific context for Gemini CLI interactions within the StakTrakr repository.

## Project Overview

**StakTrakr** is a privacy-first, client-side precious metals portfolio tracker for Silver, Gold, Platinum, Palladium, and Goldbacks.

- **Architecture:** Vanilla JavaScript Single-Page Application (SPA).
- **No-Build Design:** No bundlers, transpilers, or frameworks (React/Vue/etc.). It runs directly from `index.html` and supports both `http://` and `file://` protocols.
- **Data & Privacy:** 100% client-side. Data is stored in browser `localStorage` and `IndexedDB`. Optional encrypted cloud backups (Dropbox) use the Web Crypto API (AES-256-GCM).
- **Core Technologies:**
  - **Charts:** Chart.js 3.9.1
  - **CSV Processing:** PapaParse 5.4.1
  - **PDF Generation:** jsPDF 2.5.1 + AutoTable 3.5.25
  - **Backup/ZIP:** JSZip 3.10.1
  - **Icons/Favicon:** SVG and PNG assets in `images/`.

## Building and Running

### Key Commands

- **Running Locally:**
  - Open `index.html` directly in a browser (supports `file://`).
  - Or use a simple HTTP server: `python3 -m http.server 8000`.
- **Linting:**
  - `npm run lint` (runs `eslint js/*.js sw.js`).
- **Testing:**
  - Manual smoke testing is mandatory for UI changes.
  - Automated tests (if any) are located in `devops/`.

### Deployment

- Hosted on Cloudflare Pages (automatic on push to `main`).
- Versioning is tracked in `version.json` and `js/constants.js`.

## Development Conventions

### Core Mandates (Non-Negotiable)

1. **Script Order:** Preserve the exact script dependency order in `index.html`. New scripts must be placed appropriately before `js/init.js`.
2. **Global Scope:** Scripts share a global scope. Do not use ES Modules (`import`/`export`) at runtime.
3. **DOM Access:** Use `safeGetElement(id)` (defined in `js/utils.js`) for all DOM access, except for elements guaranteed to exist during the very early startup phase in `init.js` or `about.js`.
4. **Data Persistence:** Use `saveData()` and `loadData()` helpers. All new storage keys **must** be registered in `ALLOWED_STORAGE_KEYS` in `js/constants.js`.
5. **Security:** Always sanitize user-provided strings before DOM injection. Prefer `textContent` over `innerHTML`. Never use `eval()` or `new Function()`.
6. **State Management:** Centralize shared application state in the `state` object within `js/state.js`.
7. **No Frameworks:** Do not introduce React, Vue, TailwindCSS, or any other library that requires a build step or changes the "vanilla" nature of the app.

### Coding Style

- **Indentation:** 2 spaces.
- **Semicolons:** Required.
- **Variables:** Use `const` and `let` only; never `var`.
- **Equality:** Use strict equality (`===` and `!==`).
- **CSS:** Use Vanilla CSS with CSS Custom Properties (variables) for theming (Light, Dark, Sepia, System).
- **Modularization:** Keep functions small, named, and cohesive to their domain file (e.g., spot logic in `js/spot.js`).

### Data Flow Pattern

1. Mutate in-memory `state`.
2. Persist using storage helpers (`saveData`).
3. Re-render the affected UI components.

## Project Structure

- `index.html`: The single entry point.
- `js/`: 50+ JavaScript modules loaded in sequence.
  - `constants.js`: Global configuration and storage keys.
  - `state.js`: Centralized application state.
  - `utils.js`: Formatting, validation, and storage helpers.
  - `init.js`: Application initialization (loaded last).
- `css/styles.css`: All application styling.
- `vendor/`: Minified third-party libraries.
- `data/`: Bundled historical spot price data.
- `devops/`: Build scripts, hooks, Docker poller, mockups.
- `.agents/skills/`: Specialized agent instructions (Codex).

## MCP Server Usage

Gemini has access to the following MCP servers. Use them as described.

### Agent MCP Parity (as of 2026-02-20)

All three agents run on the same Mac and share the same Docker/IP stack.

| Server | Claude | Gemini | Codex | Notes |
|---|---|---|---|---|
| `memento` | ✅ | ✅ | ✅ | Shared Neo4j knowledge graph |
| `sequential-thinking` | ✅ | ✅ | ✅ | Structured reasoning |
| `brave-search` | ✅ | ✅ | ✅ | Web search |
| `claude-context` | ✅ | ✅ | ✅ | Semantic code search (Milvus) |
| `context7` | ✅ | ✅ | ✅ | Library documentation |
| `firecrawl-local` | ✅ | ✅ | ✅ | Self-hosted scraping (port 3002) |
| `linear` | ✅ | ✅ | ✅ | Issue tracking |
| `codacy` | ✅ | ✅ | ✅ | Code quality analysis |
| `chrome-devtools` | ✅ | — | ✅ | Gemini omits — use Playwright instead |
| `playwright` | ✅ | ✅ | ✅ | Browser automation / test authoring |
| `browserbase` | ✅ | ✅ | ✅ | Cloud NL tests (paid, use sparingly) |
| `code-graph-context` | ✅ | ✅ | ✅ | Structural graph (Docker required) |
| `stitch` | ✅ | ✅ primary | ✅ | OAuth via `init`; Gemini preferred for design tasks |

### Memento (Knowledge Graph)

Shared persistent memory across all agents (Claude, Codex, Gemini, and the human).
Backed by Neo4j with vector embeddings for semantic search.

**When to use:** Save session summaries, insights, handoffs, and decisions. Recall prior context before starting work. Check for existing knowledge before duplicating effort.

**Tools available:**

- `create_entities` / `add_observations` — Save new knowledge
- `search_nodes` — Exact name/tag/keyword lookup
- `semantic_search` — Conceptual/natural language recall (use `hybrid_search: true`)
- `open_nodes` — Expand entity details after search
- `create_relations` — Link related entities

**Taxonomy rules (MUST follow):**

Entity types use `PROJECT:DOMAIN:TYPE` format:

| Type | entityType | Name Format |
|------|------------|-------------|
| Session | `STAKTRAKR:DEVELOPMENT:SESSION` | `Session: STAKTRAKR-KEYWORD-YYYYMMDD-HHMMSS` |
| Insight | `STAKTRAKR:DOMAIN:INSIGHT` | `Insight: STAKTRAKR-INSIGHT-YYYYMMDD-HHMMSS` |
| Handoff | `STAKTRAKR:DEVELOPMENT:HANDOFF` | `HANDOFF:STAK-###:PR-###:YYYY-MM-DD:AGENT` |

Required observations (in this order):

1. `TIMESTAMP: <ISO-8601 UTC>`
2. `DATE_TOKEN: <YYYYMMDDHHMMSS>` (UTC, 14 digits, canonical)
3. `ABSTRACT: <one-line summary>`
4. `SUMMARY: <detailed context>`
5. ID field (`SESSION_ID`, `INSIGHT_ID`, etc.)

Required tags on every entity:

- `TAG: project:staktrakr`
- `TAG: agent:gemini`
- `TAG: <category>` (e.g., `documentation`, `frontend`, `api`)
- `TAG: <status>` (`completed`, `in-progress`, `blocked`)
- `TAG: date:YYYYMMDD` / `TAG: date:YYYYMM` / `TAG: date:YYYY`

Search strategy:

1. Exact names via `search_nodes` (preserve colons — never space-split)
2. Date-scoped via progressive prefix: `YYYYMMDDHH` then `YYYYMMDD` then `YYYYMM` then `YYYY`
3. Conceptual via `semantic_search` with `hybrid_search: true`
4. **Fallback:** If `search_nodes` returns 0, always retry with `semantic_search`

**Secrets policy:** Never store raw secrets in Memento without explicit user approval. Prefer references (env var name, vault label). Tag secrets with `type:secret`, `sensitivity:secret`, `status:active`.

### Linear (Project Management)

Issue tracking and project management for StakTrakr.

**Key IDs:**

- StakTrakr team: `f876864d-ff80-4231-ae6c-a8e5cb69aca4` — feature issues, bugs, sprints
- Developers team: `38d57c9f-388c-41ec-9cd2-259a21a5df1c` — cross-agent handoffs, notes, logs
- StakTrakr project (in Developers): `c4bc2838-4783-487d-bfb5-89f052c681c8`
- Documentation project: `6b7588f2-49f2-44cc-ab97-43ca5bf9e392`

**Rules:**

- Reference issues as `STAK-###` in commit messages and documentation
- Update issue status as work progresses (`Todo` -> `In Progress` -> `Done`)
- Post handoff comments using the standard template (see Handoff section)
- **Never put secrets in Linear** — use Memento entity references only
- When creating issues, set appropriate priority (1=Urgent, 2=High, 3=Normal, 4=Low)

**Agent delegation labels:** Issues may carry labels like `Codex`, `Sonnet`, `Opus` indicating which AI agent should handle them. Gemini-delegated work should use a `Gemini` label.

### Brave Search (Web Search)

Use for looking up external documentation, API references, library versions, or any web research needed during tasks.

### Claude-Context (Semantic Code Search)

AST-indexed semantic search over the StakTrakr codebase.

- `search_code` — Natural language queries against indexed code
- `get_indexing_status` — Check if index is fresh
- `index_codebase` — Re-index if stale (path: `/Volumes/DATA/GitHub/StakTrakr`)

Use this before manual file searches — it finds relevant code faster than grep for conceptual queries.

### Firecrawl Local (Web Scraping — Free)

Self-hosted Firecrawl instance running at `devops/firecrawl-docker/` on port 3002. Use for
scraping, crawling, and web search without consuming cloud credits.

**When to use:** Any scraping/crawling task, researching external docs, fetching competitor prices.

**Tools available:**
- `scrape` — Extract clean markdown from a single URL
- `map` — Discover all URLs on a site (essential for finding specific pages)
- `crawl` — Crawl an entire site asynchronously
- `search` — Web search with optional content extraction
- `extract` — Structured data extraction (requires `OPENAI_API_KEY` in Docker env)

**Not available in self-hosted mode:** `/agent` endpoint (cloud only).

**Requires:** `cd devops/firecrawl-docker && docker compose up -d` before use.

### Stitch (UI Design & Prototyping — Gemini Primary)

Stitch is a Google product. **Gemini is the designated Stitch agent for StakTrakr** — Claude and
Codex route Stitch tasks here. Use the `ui-mockup` skill workflow when generating mockups.

**Tools available:**
- `create_project` — Create a container for designs
- `generate_screen_from_text` — Generate a new UI screen from a prompt
- `edit_screens` — Modify existing screens via prompt
- `generate_variants` — Explore design alternatives
- `get_screen` / `list_screens` — Retrieve generated assets

### Browserbase (Cloud Browser Automation)

Cloud-based browser infrastructure used for high-fidelity web scraping and automated visual regression testing.

**When to use:** Use for complex retail scraping (e.g., `devops/retail-poller/capture.js`) or when local Chromium is insufficient.

**Usage Details:**
- **Cost:** Real-world cost applies. **Requires explicit user approval** before initiating new sessions.
- **Backend:** Switched via `BROWSER_MODE=browserbase`.
- **Requirements:** `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID` environment variables.
- **Integration:** Integrated with Playwright (see `playwright.config.js`) and custom scrapers.

### Context7 (Library Documentation)

Fetches up-to-date documentation and code examples for libraries used by StakTrakr.

Useful libraries to query: Chart.js, Bootstrap 5, jsPDF, PapaParse, JSZip, Web Crypto API.

- `resolve-library-id` — Find the Context7 ID for a library
- `query-docs` — Fetch documentation by topic

### Codacy (Code Quality)

Code quality analysis against the StakTrakr repository. Use during PR reviews and before marking
any PR ready to merge.

**Tools available:**
- `codacy_get_file_issues` — Issues on a specific file
- `codacy_list_pull_request_issues` — All issues on a PR
- `codacy_get_repository_with_analysis` — Repo-level quality summary
- `codacy_get_pull_request_git_diff` — PR diff with analysis context
- `codacy_list_repository_tools` — Active quality tools

**When to use:** After writing or reviewing code, before handing off to Claude for merge.

### Playwright (Browser Automation)

Playwright MCP for scripted browser control. Used with the self-hosted **Browserless** Docker
container (`devops/browserless/`) for free local test runs.

**When to use:** Writing or running Playwright specs, smoke tests, regression checks.

**Start Browserless:** `cd devops/browserless && docker compose up -d`
**Run tests:** `BROWSER_BACKEND=browserless TEST_URL=http://localhost:8765 npm test`

### Code Graph Context (Structural Code Analysis)

AST-level structural analysis of the StakTrakr codebase via the `cgc-server` Docker container.
Complements `claude-context` (semantic) with precise structural queries.

**When to use:** Finding all callers of a function, tracing call chains, detecting dead code,
measuring complexity, understanding import graphs.

**Tools available:**
- Callers / callees of any function
- Call chain tracing end-to-end
- Dead code detection
- Complexity scoring
- Import/dependency graph

**Requires:** `cgc-server` Docker container running locally.

### Sequential Thinking

Structured reasoning tool for complex multi-step analysis.

Use when planning architecture, evaluating trade-offs, or breaking down complex problems before implementation.

## Cross-Agent Handoff Protocol

StakTrakr uses a multi-agent development workflow. Four agents collaborate:

| Agent | Role | Instruction File |
|-------|------|-----------------|
| Human (lbruton) | Product owner, final approver | — |
| Claude (Opus 4.6) | Primary dev agent, architecture, features, releases | `CLAUDE.md` |
| Codex | Code review, refactoring, JSDoc, targeted fixes | `AGENTS.md` |
| Gemini | Documentation, code review, JSDoc coverage, research | `GEMINI.md` |

### Handoff procedure

When completing work or passing context to another agent:

1. **Save to Memento** — Create a handoff entity following the taxonomy
2. **Post to Linear** — Comment on the related issue, or create an issue in the Developers team
3. **Include all fields:** scope, validation, next steps, owner, risks, Memento entity name

### Handoff comment template

```text
Agent handoff update:
- Agent: gemini
- Status: <blocked|in-progress|ready-for-review|done>
- Scope: <what changed>
- Validation: <what was run/verified>
- Next: <explicit next step + owner>
- Links: <Linear issue/PR links>
- Memory: <Memento entity name(s)>
- Risks: <known risks/assumptions>
```

## Quality Gates

- **Codacy A+ rating** required on all PRs — check before submitting
- **ESLint** must pass: `npm run lint`
- **No new `var` declarations** — `const`/`let` only
- **No `innerHTML` with user data** — use `textContent` or `sanitizeHtml()`
- JSDoc blocks required on all new/modified functions

---

*Last Updated: 2026-02-19*

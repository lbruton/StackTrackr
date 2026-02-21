# CLAUDE.md

**For Claude Code (Desktop CLI)** — Local Mac development with MCP servers and skills.
**For Claude.ai (Web)** — Use `AGENTS.md` instead. This file contains local-only tooling instructions.

---

## BEFORE WRITING ANY CODE — MANDATORY

These rules fire before any implementation, no exceptions:

1. **Check for a skill first.** Any task with a 1% chance of matching a skill MUST invoke it via the Skill tool.
2. **New feature or UI work?** → `superpowers:brainstorming` → `superpowers:writing-plans`.
3. **Bug or unexpected behavior?** → `superpowers:systematic-debugging` before proposing any fix.
4. **About to claim something works?** → `superpowers:verification-before-completion` — run it, show output.
5. **Multiple independent tasks?** → `superpowers:dispatching-parallel-agents` — subagents implement, we orchestrate.
6. **Implementing a plan?** → `superpowers:subagent-driven-development`.
7. **PR ready?** → `/pr-resolve` with Phase 0 parallel agents before touching any threads.

**Red flags — stop and invoke the right skill:**
- "Let me just quickly add this..." → brainstorming first
- "I'll fix this real fast..." → systematic-debugging first
- "It should work now" → verification-before-completion first
- "Let me explore the codebase..." → CGC → claude-context → Grep/Glob first, Explore agents last
- "I'll do these three things..." → dispatching-parallel-agents
- "New multi-element UI component..." → ui-mockup skill (Stitch) + playground before coding

## Code Search — Cheapest First

1. `mcp__code-graph-context__*` — structural: callers, call chains, imports, dead code
2. `mcp__claude-context__search_code` — semantic: "find code related to X"
3. `Grep` / `Glob` — literal strings, filenames
4. Explore agent — only after tiers 1-3 are insufficient

**CGC setup**: `cd devops/cgc && docker compose up -d`

## Project at a Glance

**StakTrakr** — precious metals inventory tracker. Single HTML page, vanilla JS, localStorage persistence.
Works on `file://` and HTTP. Runtime artifact: zero build step, zero install. See `coding-standards` skill for patterns.

**Portfolio model**: Purchase Price / Melt Value / Retail Price. `meltValue` = `weight * qty * spot`.
**Version format**: `BRANCH.RELEASE.PATCH` in `js/constants.js`. Use `/release` skill to bump (touches 7 files).

## Critical Patterns (Jules/Copilot commonly miss these)

- **DOM**: `safeGetElement(id)` — never raw `document.getElementById()` (except startup in `about.js` / `init.js`)
- **Storage**: `saveData()`/`loadData()` from `js/utils.js` — never direct `localStorage`
- **Storage keys**: must be in `ALLOWED_STORAGE_KEYS` in `js/constants.js`
- **New JS files**: add to `sw.js` CORE_ASSETS AND script load order in `index.html` (56 scripts, strict order)
- **innerHTML**: always `sanitizeHtml()` on user content
- **sw.js CACHE_NAME**: auto-stamped by pre-commit hook — see `sw-cache` skill

## PR Lifecycle (live site — do not fast-merge to main)

1. Open draft PR early: `gh pr create --draft`
2. Commit freely to `dev`
3. QA-complete → `/release` Phase 4.5: audit commits, rewrite PR body, `gh pr ready`, `/pr-resolve`
4. After review passes → merge to main → create GitHub Release tag (always targets main)

**Jules PRs**: always draft, always context-blind. Run `/pr-resolve` and verify critical patterns above before approving.

## UI Design Workflow (non-trivial components only)

≥3 data elements or uncertain layout → full three-stage flow:
1. **Stitch** (`ui-mockup` skill) — visual concept
2. **Playground** (`playground` skill) — interactive prototype
3. **Implementation** (`writing-plans` → `subagent-driven-development`) — only after Playground approval

Single-element additions (button, badge, tooltip) → skip straight to implementation.
**`frontend-design` plugin is BANNED** — use `ui-design` skill instead.

## Instruction Files & Skills

| File | Audience | Tracked |
|------|----------|---------|
| `CLAUDE.md` | Claude Code (local Mac) | No (gitignored) |
| `AGENTS.md` | Codex, web agents | Yes |
| `.github/copilot-instructions.md` | Copilot PR reviews | Yes |

**Skills**: `superpowers` fork at `~/.claude/plugins/cache/lbruton/superpowers/fork/` — 25 skills, all migrated from `~/.claude/skills/` and user-level commands. Project skills in `.claude/skills/`: `coding-standards`, `markdown-standards`, `release`, `seed-sync`, `ui-mockup`.

Use `/sync-instructions` after significant codebase changes.

## MCP Tools — Use Proactively

- `mcp__memento__*` — save insights, recall handoffs, store session notes (`project:staktrakr` tag)
- `mcp__claude_ai_Linear__*` — all Linear ops (team: `f876864d-ff80-4231-ae6c-a8e5cb69aca4`)
- `mcp__codacy__*` — quality/PR issues; use during `/pr-resolve`
- `mcp__context7__*` — library docs (Chart.js, Bootstrap, jsPDF) before implementing
- `mcp__firecrawl-local__*` — free local scraping (port 3002; `cd devops/firecrawl-docker && docker compose up -d`)
- `mcp__stitch__*` — UI design (Gemini preferred; use `ui-mockup` skill)
- `mcp__browserbase__*` — Stagehand NL tests only, **requires explicit user approval** (paid)
- **Browserless** — scripted Playwright, free (`cd devops/browserless && docker compose up -d`, use `/smoke-test`)
- **Secrets**: Infisical at `http://localhost:8700` ("Infant Si Cal"). See `secrets` skill.

## Codex Invocation Safety

Always pass: target path, expected outcome, risk classification (read/write/network/destructive).
Never forward raw secrets. For destructive ops, require explicit human confirmation.
Dual-write handoff: Linear issue + Memento entity with attribution.

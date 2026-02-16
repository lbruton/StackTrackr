---
name: session-management
description: Standardized rules for saving and recalling sessions, handoffs, and rewinds in Memento. Use when running save-session, recall-session, save-handoff, recall-handoff, save-rewind, or recall-rewind commands.
user-invocable: false
---

# Session Management — StakTrakr

Rules for persisting and retrieving development context via Memento. All save/recall commands follow these patterns.

---

## Entity Types

| Command | Entity Type | Name Pattern | Weight |
|---------|-------------|-------------|--------|
| `/save-session` | `STAKTRAKR:DEVELOPMENT:SESSION` | `Session: STAKTRAKR-{THEME}-{YYYYMMDD}-{HHMMSS}` | Medium — end-of-session notes |
| `/save-handoff` | `STAKTRAKR:DEVELOPMENT:HANDOFF` | `Handoff: STAKTRAKR-{THEME}-{YYYYMMDD}-{HHMMSS}` | Heavy — full context transfer |
| `/save-rewind` | `STAKTRAKR:DEVELOPMENT:REWIND` | `Rewind: STAKTRAKR-{YYYYMMDD}-{HHMMSS}` | Light — quick bookmark |

---

## ID Generation

All IDs use UTC timestamps for consistency:

```
STAKTRAKR-{THEME}-{YYYYMMDD}-{HHMMSS}
```

- **THEME**: 1-2 word PascalCase summary of the work focus (e.g., `SkillRefactor`, `SpotAPI`, `Release`)
- **Date/Time**: UTC, zero-padded
- Rewinds omit THEME for brevity: `STAKTRAKR-{YYYYMMDD}-{HHMMSS}`

---

## Required Observations (all entity types)

Every entity MUST include these observations in this order:

1. `TIMESTAMP: {ISO 8601}` — always first
2. `ABSTRACT: {one-line summary}` — always second
3. `{TYPE}_ID: {generated ID}` — `SESSION_ID`, `HANDOFF_ID`, or `REWIND_ID`
4. `VERSION: {current app version}`
5. `BRANCH: {current git branch}`

---

## Required Tags (all entity types)

```
TAG: project:staktrakr
TAG: {type}                    — session, handoff, or rewind
TAG: {category}                — frontend, backend, workflow, architecture, devops
TAG: {YYYY-MM}                 — month tag for temporal queries (e.g., 2026-02)
```

---

## What to Save Per Type

### Session (`/save-session`)

Read through the chat history and extract:

- **SUMMARY**: 3-5 bullet points of what was accomplished
- **INSIGHTS**: Technical discoveries, patterns found, gotchas learned — anything worth remembering next session
- **DECISIONS**: Architectural or design choices made and their rationale
- **FILES_MODIFIED**: Key files touched with brief description of changes
- **LINEAR_ISSUES**: Any issues worked on, with status updates

**Do NOT save**: full transcripts, verbose code blocks, or debugging dead-ends. Focus on reusable knowledge.

### Handoff (`/save-handoff`)

Everything in Session, plus:

- **NEXT_STEPS**: Specific, actionable items for continuation (most critical field)
- **ACTIVE_LINEAR_PROJ**: Current project name and theme
- **LINEAR_PROJ_ISSUES**: Issues in the active project with brief descriptions
- **BLOCKERS**: Anything preventing progress
- **CONTEXT**: State that a fresh session would need to understand (e.g., "the PR is open but waiting on Codacy", "branch has uncommitted migration work")

### Rewind (`/save-rewind`)

Minimal — 5 observations max:

- `ABSTRACT`, `NEXT` (single immediate action), `FILES` (with line ranges), `COMMIT` (hash or "uncommitted"), `LINEAR` (active issue ID)

---

## Recall Priority: Most Recent First

All recall commands weight results by recency:

1. **Search** with `search_nodes` for exact ID or keyword match
2. **If multiple results**, sort by TIMESTAMP descending — most recent wins
3. **Open** the most recent entity with `open_nodes` for full details
4. **For `/start`**, only surface the single most recent session/handoff/rewind — don't list history

### Recall Search Patterns

```
# Most recent session
search_nodes  query: "STAKTRAKR session"
→ sort by TIMESTAMP, take first

# Most recent handoff
search_nodes  query: "STAKTRAKR handoff"
→ sort by TIMESTAMP, take first

# Most recent rewind
search_nodes  query: "STAKTRAKR rewind"
→ sort by TIMESTAMP, take first

# Semantic fallback (if keyword search returns nothing)
semantic_search  query: "staktrakr development session insights"
  limit: 5, min_similarity: 0.4
```

### Recall Output Format

Keep it concise. The user wants context, not a report:

```
Last session (Feb 15, 3:42 PM):
  - Refactored context7-rules skill with pre-resolved library IDs
  - Added search-code tiered strategy skill
  - Insight: claude-context index should be refreshed at session start

Next steps: Update start command to include index freshness check
```

---

## When to Use Each Command

| Scenario | Command |
|----------|---------|
| End of work session, wrapping up | `/save-session` |
| Handing off to a different Claude instance or long break | `/save-handoff` |
| Quick bookmark mid-session before chat rewind | `/save-rewind` |
| Starting a new session | `/start` (auto-recalls) |
| Need context from a past session | `/recall-session` |
| Resuming after a handoff | `/recall-handoff` |
| Continuing after a chat rewind | `/recall-rewind` |

---

## Anti-Patterns

- **Don't save empty sessions** — if nothing meaningful happened, skip the save
- **Don't duplicate Linear state** — Linear is the source of truth for issues; only note what changed
- **Don't save full code blocks** — reference files and line numbers instead
- **Don't create both a session and a handoff** — handoff is a superset of session; pick one
- **Don't use `read_graph`** — always use `search_nodes` or `semantic_search`

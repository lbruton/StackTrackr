---
name: memento-taxonomy
description: Memento knowledge graph taxonomy, entity naming, tagging conventions, and search patterns for StakTrakr. Use when saving handoffs, sessions, insights, or querying Memento.
user-invocable: false
---

# Memento Taxonomy — StakTrakr

Naming conventions, tagging rules, and search patterns for the Memento knowledge graph. This skill auto-loads when saving or retrieving handoffs, sessions, and insights.

**Shared graph**: Memento runs in Neo4j at `localhost:7687` and is shared with HexTrackr. Always tag entities with `project:staktrakr` for isolation.

## Safety Rules

- **NEVER use `read_graph`** — graph exceeds 200K tokens, will fail
- Use `search_nodes` for exact ID/tag matching
- Use `semantic_search` for concept-based queries (may have indexing lag on new entities)
- **Always prefer `search_nodes` for recent entities** — semantic embeddings may not be indexed immediately

## Entity Naming Convention

### Pattern: `Type: PROJECT-THEME-YYYYMMDD-HHMMSS`

| Type | Format | Example |
|------|--------|---------|
| Handoff | `Handoff: STAKTRAKR-{THEME}-{YYYYMMDD}-{HHMMSS}` | `Handoff: STAKTRAKR-RELEASE-20260215-215800` |
| Session | `Session: STAKTRAKR-{THEME}-{YYYYMMDD}-{HHMMSS}` | `Session: STAKTRAKR-VIEWMODAL-20260216-100000` |
| Insight | `Insight: STAKTRAKR-{DOMAIN}-{TOPIC}` | `Insight: STAKTRAKR-FRONTEND-SeedBundlePattern` |
| Rewind | `Rewind: STAKTRAKR-{YYYYMMDD}-{HHMMSS}` | `Rewind: STAKTRAKR-20260215-160000` |

### Entity Types (PROJECT:DOMAIN:TYPE)

| entityType | When to use |
|------------|-------------|
| `STAKTRAKR:DEVELOPMENT:HANDOFF` | Session handoff packages |
| `STAKTRAKR:DEVELOPMENT:SESSION` | Full session saves |
| `STAKTRAKR:FRONTEND:INSIGHT` | UI/UX patterns and learnings |
| `STAKTRAKR:ARCHITECTURE:INSIGHT` | Architectural decisions |
| `STAKTRAKR:WORKFLOW:INSIGHT` | Process patterns (release, PR review) |
| `STAKTRAKR:DEVELOPMENT:REWIND` | Lightweight session bookmarks |

## Required Observations

Every entity MUST include these observations in order:

1. `TIMESTAMP: 2026-02-15T21:58:00.000Z` — ISO 8601
2. `ABSTRACT: One-line summary` — quick overview
3. `{TYPE}_ID: STAKTRAKR-THEME-YYYYMMDD-HHMMSS` — unique identifier (HANDOFF_ID, SESSION_ID, etc.)
4. `SUMMARY: Detailed description` — full context

### Handoff-Specific Observations

Handoffs should also include:

| Field | Purpose |
|-------|---------|
| `VERSION` | Current app version (e.g., `v3.29.03`) |
| `BRANCH` | Current git branch |
| `ACTIVE_SPRINT` | Current sprint project name and theme |
| `SPRINT_ISSUES` | Issues in the active sprint with brief descriptions |
| `QUEUED_SPRINTS` | Upcoming sprint projects |
| `LINEAR_STATE` | Issue counts by state (In Progress / Todo / Backlog) |
| `FILES_MODIFIED_THIS_SESSION` | Key files changed |
| `NEXT_STEPS` | What to work on next (critical for continuity) |

## Tag Taxonomy

### Required Tags (every entity)

| Tag | Purpose |
|-----|---------|
| `TAG: project:staktrakr` | Project isolation (shared graph with HexTrackr) |
| `TAG: {type}` | Entity type: `handoff`, `session`, `insight`, `rewind` |
| `TAG: {category}` | Work category: `frontend`, `backend`, `workflow`, `architecture` |

### Recommended Tags

| Tag | When to use |
|-----|-------------|
| `TAG: v3.29.03` | Version tag for release-related entities |
| `TAG: 2026-02` | Month tag for temporal queries |
| `TAG: sprint-visual` | Sprint theme tag (matches sprint project name) |
| `TAG: release` | Release-related work |
| `TAG: completed` | Finished work |
| `TAG: in-progress` | Active work (update to `completed` when done) |
| `TAG: feature` | New functionality |
| `TAG: bug` | Bug fix work |
| `TAG: STAK-XXX` | Linear issue reference |

### Tags NOT to use

- `project:hextrackr` — wrong project
- `spec:XXX` — StakTrakr doesn't use the spec-kit workflow
- `prime-intelligence` — HexTrackr-specific

## Search Patterns

### Finding the latest handoff (for /start skill)

```
# Primary — keyword search (always works)
mcp__memento__search_nodes
  query: "STAKTRAKR handoff"

# Fallback — semantic search (may lag on new entities)
mcp__memento__semantic_search
  query: "staktrakr handoff development session"
  limit: 3
  min_similarity: 0.3
```

### Finding insights by topic

```
# Keyword — exact tag match
mcp__memento__search_nodes
  query: "project:staktrakr insight frontend"

# Semantic — concept search
mcp__memento__semantic_search
  query: "staktrakr file protocol seed bundle pattern"
  limit: 5
  min_similarity: 0.5
```

### Finding work by version

```
mcp__memento__search_nodes
  query: "v3.29.03 project:staktrakr"
```

### Finding work by sprint

```
mcp__memento__search_nodes
  query: "sprint-visual project:staktrakr"
```

## Example: Creating a Handoff

```javascript
mcp__memento__create_entities([{
  name: "Handoff: STAKTRAKR-THEME-YYYYMMDD-HHMMSS",
  entityType: "STAKTRAKR:DEVELOPMENT:HANDOFF",
  observations: [
    "TIMESTAMP: 2026-02-15T21:58:00.000Z",
    "ABSTRACT: One-line summary of what happened",
    "HANDOFF_ID: STAKTRAKR-THEME-YYYYMMDD-HHMMSS",
    "SUMMARY: Detailed description of accomplishments...",
    "VERSION: v3.29.03",
    "BRANCH: dev",
    "ACTIVE_SPRINT: SPRINT-Feb-15-2026-Visual — View Modal & Quick UX Wins",
    "SPRINT_ISSUES: STAK-110 (title), STAK-111 (title)...",
    "NEXT_STEPS: What to do next...",
    "TAG: project:staktrakr",
    "TAG: handoff",
    "TAG: frontend",
    "TAG: completed",
    "TAG: v3.29.03",
    "TAG: 2026-02",
    "TAG: sprint-visual"
  ]
}]);
```

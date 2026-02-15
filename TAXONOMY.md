# Memento Knowledge Graph Taxonomy & Conventions

> **IMPORTANT**: This is a FALLBACK document. The primary source of truth is **Linear DOCS-14**.
> Only use this file if Linear is unavailable. Always check DOCS-14 first for the latest taxonomy.

## Important Updates

### 2025-09-27 (v1.2.0)
**NEW**: Enhanced semantic search with text-embedding-3-large model (3072 dimensions)
- Use `mcp__memento__semantic_search` for concept-based queries
- Use `mcp__memento__search_nodes` for exact tag/ID matching
- Hybrid search combines both for optimal results

### 2025-09-27 (v1.1.0)
**CRITICAL**: Tags are now added using `mcp__memento__add_observations` with "TAG: " prefix, not via a separate add_tags function.

## Overview

This document defines the complete tagging taxonomy, naming conventions, and operational rules for the Memento MCP knowledge graph. It serves as the authoritative reference for all AI assistants (Claude, Gemini, Codex) and developers working with our knowledge management system.

## Core Principles

1. **Every entity MUST have tags** - No untagged entities allowed
2. **Tags enable multi-dimensional search** - Complement the PROJECT:DOMAIN:TYPE classification
3. **Consistency over creativity** - Use existing tags before creating new ones
4. **Project isolation** - Each entity must have at least one project tag
5. **Temporal awareness** - Include time-based tags for historical tracking

## Entity Naming Convention

### Classification Pattern: PROJECT:DOMAIN:TYPE

**PROJECT** (First Level):

- `HEXTRACKR` - HexTrackr application
- `PROJECT` - Generic project work
- `SYSTEM` - System configuration
- `MEMENTO` - Memory system itself
- `SPEC-KIT` - Specification framework
- `ZEN` - Zen MCP server
- `CLAUDE-TOOLS` - Claude CLI tools

**DOMAIN** (Second Level):

- `DEVELOPMENT` - Active development work
- `ARCHITECTURE` - System design decisions
- `SECURITY` - Security-related items
- `FRONTEND` - UI/UX work
- `BACKEND` - Server/API work
- `DATABASE` - Data layer
- `DOCUMENTATION` - Docs and guides
- `TESTING` - Test suites
- `WORKFLOW` - Process patterns
- `CONFIGURATION` - Settings/config

**TYPE** (Third Level):

- `SESSION` - Work sessions
- `HANDOFF` - Transition packages
- `INSIGHT` - Learned patterns
- `PATTERN` - Reusable solutions
- `ANALYSIS` - Deep dives
- `DECISION` - Architectural choices
- `ISSUE` - Problems/bugs
- `BREAKTHROUGH` - Major discoveries

## Tag Taxonomy

### 1. Project Tags (Required)

Every entity MUST have at least one project tag:

- `project:hextrackr` - HexTrackr application
- `project:zen` - Zen MCP server
- `project:claude-tools` - Claude CLI tools
- `project:memento` - Memory system
- `project:spec-kit` - Specification framework
- `project:[name]` - Other projects (lowercase, hyphenated)

### 2. Specification Tags

For Spec-Kit workflow tracking:

- `spec:001` through `spec:999` - Specific specification numbers
- `spec:draft` - Draft specifications
- `spec:complete` - Completed specifications
- `spec:active` - Currently being implemented

### 3. Category Tags

Work type classification:

- `frontend` - UI/UX, client-side JavaScript, CSS
- `backend` - Server, API, business logic
- `database` - Schema, queries, migrations
- `documentation` - Docs, guides, README files
- `testing` - Unit, integration, E2E tests
- `infrastructure` - Docker, deployment, CI/CD
- `configuration` - Settings, environment, tools

### 4. Impact Tags

Change significance:

- `breaking-change` - Backwards incompatible
- `critical-bug` - System-breaking issues
- `enhancement` - Improvements to existing features
- `feature` - New functionality
- `minor-fix` - Small corrections
- `performance` - Speed/efficiency improvements
- `security-fix` - Security patches

### 5. Workflow Tags

Current status:

- `completed` - Finished work
- `in-progress` - Active development
- `blocked` - Waiting on dependencies
- `needs-review` - Requires validation
- `experimental` - Proof of concept
- `deprecated` - No longer relevant
- `archived` - Historical reference

### 6. Learning Tags

Knowledge type:

- `lesson-learned` - Mistakes to avoid
- `pattern` - Repeatable solutions
- `breakthrough` - Major discoveries
- `pain-point` - Identified problems
- `best-practice` - Recommended approaches
- `anti-pattern` - What not to do
- `reusable` - Cross-project applicable

### 7. Temporal Tags

Time-based markers:

- `week-XX-YYYY` - Week number (e.g., `week-38-2025`)
- `sprint-X` - Sprint iterations (e.g., `sprint-3`)
- `vX.X.X` - Version tags (e.g., `v1.0.16`)
- `qX-YYYY` - Quarters (e.g., `q3-2025`)
- `YYYY-MM` - Month tags (e.g., `2025-09`)

### 8. Quality Tags

Code quality markers:

- `tech-debt` - Shortcuts taken
- `refactor` - Code restructuring
- `optimization` - Performance tuning
- `cleanup` - Code hygiene
- `linting` - Style fixes
- `modernization` - Updating legacy code

### 9. Research Tags

Research and investigation markers:

- `research-[topic]` - Subject-specific research (e.g., research-websocket, research-cors)
- `research:error-analysis` - Error investigation and debugging
- `research:framework-compatibility` - Library/framework version checking
- `research:implementation-guide` - Step-by-step implementation research
- `research:performance-analysis` - Optimization and performance studies
- `research:security-review` - Security assessment and recommendations
- `research:comparison` - Comparative analysis of options

### 10. Quality Assessment Tags

Information reliability markers:

- `verified` - Information confirmed from official sources
- `experimental` - Preliminary or unconfirmed findings
- `authoritative` - From primary/official documentation
- `community-sourced` - From reliable community sources
- `needs-verification` - Requires additional confirmation

## Memento Tool Usage Rules

### Required Observations (In Order)

Every entity MUST include these observations in this exact order:

1. `TIMESTAMP: ISO 8601 format` - When created
2. `ABSTRACT: One-line summary` - Quick overview
3. `SUMMARY: Detailed description` - Full context
4. `[TYPE]_ID: Unique identifier` - SESSION_ID, HANDOFF_ID, etc.

## Enhanced Search Strategy (v1.2.0)

### Choosing the Right Search Method

#### Use `mcp__memento__search_nodes` for:
- Exact ID matching (SESSION_ID, HANDOFF_ID)
- Specific tag queries (spec:001, week-38-2025)
- Entity type filters (PROJECT:DEVELOPMENT:HANDOFF)
- Status checks (completed, in-progress, blocked)

#### Use `mcp__memento__semantic_search` for:
- Conceptual queries ("performance optimization techniques")
- Natural language searches ("how to implement WebSocket authentication")
- Cross-cutting themes ("architectural decisions from last month")
- Discovery queries ("similar problems we've solved before")

### Search Examples

#### Semantic Search (Concepts & Themes)
```javascript
mcp__memento__semantic_search({
  query: "frontend performance optimization React components",
  limit: 10,
  min_similarity: 0.6,
  hybrid_search: false  // Pure semantic for concepts
})
```

#### Keyword Search (Exact Tags & IDs)
```javascript
mcp__memento__search_nodes({
  query: "SESSION_ID: HEXTRACKR-AUTH-20250927-143045"
})

mcp__memento__search_nodes({
  query: "spec:001 completed week-38-2025"
})
```

#### Hybrid Search (Mixed Content)
```javascript
mcp__memento__semantic_search({
  query: "spec:001 authentication security patterns",
  limit: 10,
  min_similarity: 0.5,
  hybrid_search: true,  // Combines exact tags with concepts
  semantic_weight: 0.7  // 70% semantic, 30% keyword
})
```

### NEVER Use read_graph

The `read_graph` operation will fail with 200K+ tokens. Always use search instead.

## Tagging Examples

### Session Entity

```javascript
// Create entity with required observations
mcp__memento__create_entities([{
  name: "Session: HEXTRACKR-COLORFIX-20250918-143000",
  entityType: "HEXTRACKR:FRONTEND:SESSION",
  observations: [
    "TIMESTAMP: 2025-09-18T14:30:00.000Z",
    "ABSTRACT: Color fix implementation session",
    "SUMMARY: Detailed work on fixing color issues...",
    "SESSION_ID: HEXTRACKR-COLORFIX-20250918-143000"
  ]
}]);

// Add tags using add_observations with "TAG: " prefix
mcp__memento__add_observations({
  observations: [{
    entityName: "Session: HEXTRACKR-COLORFIX-20250918-143000",
    contents: [
      "TAG: project:hextrackr",
      "TAG: spec:002",
      "TAG: frontend",
      "TAG: enhancement",
      "TAG: completed",
      "TAG: week-38-2025",
      "TAG: v1.0.16"
    ]
  }]
});
```

### Handoff Entity

```javascript
// Tags should be added via add_observations with "TAG: " prefix
mcp__memento__add_observations({
  observations: [{
    entityName: "[Entity Name]",
    contents: [
      "TAG: project:hextrackr",
      "TAG: spec:001",
      "TAG: backend",
      "TAG: in-progress",
      "TAG: handoff",
      "TAG: week-38-2025"
    ]
  }]
});
```

### Insight Entity

```javascript
// Tags added via add_observations
mcp__memento__add_observations({
  observations: [{
    entityName: "[Insight Entity Name]",
    contents: [
      "TAG: project:hextrackr",
      "TAG: breakthrough",
      "TAG: testing",
      "TAG: lesson-learned",
      "TAG: reusable",
      "TAG: best-practice"
    ]
  }]
});
```

### Research Entity

```javascript
// Tags added via add_observations
mcp__memento__add_observations({
  observations: [{
    entityName: "[Research Entity Name]",
    contents: [
      "TAG: project:hextrackr",
      "TAG: research-websocket",
      "TAG: research:implementation-guide",
      "TAG: backend",
      "TAG: pattern",
      "TAG: verified",
      "TAG: week-38-2025",
      "TAG: reusable"
    ]
  }]
});
```

### Prime Intelligence Entities

Prime intelligence entities preserve full agent research from `/prime-test` sessions:

```javascript
// All 4 types follow same tagging pattern
mcp__memento__add_observations({
  observations: [{
    entityName: "Prime-Linear-HEXTRACKR-2025-10-04-11-47-30",
    contents: [
      "TAG: project:hextrackr",
      "TAG: prime-intelligence",
      "TAG: agent:linear-librarian",      // or memento-oracle, codebase-navigator
      "TAG: linear-activity",              // domain-specific tag
      "TAG: week-40-2025",
      "TAG: session:prime-2025-10-04"
    ]
  }]
});
```

**Entity Types & Domain Tags**:
- Prime-Linear → `linear-activity`, `issue-tracking`
- Prime-Memento → `memento-patterns`, `historical-insights`
- Prime-Codebase → `codebase-architecture`, `integration-points`
- Prime-Technical → `technical-baseline`, `development-environment`

## Query Patterns

### Find Work by Specification (use search_nodes)

```
"spec:001" - All work on specification 001
"spec:001 backend" - Backend work for spec 001
"spec:001 completed" - Finished spec 001 tasks
```

### Find Cross-Project Insights (use semantic_search)

```
"reusable patterns authentication" - Auth patterns applicable to any project
"breakthrough testing strategies" - Testing breakthroughs
"security lessons learned" - Security insights
```

### Time-Based Queries (use search_nodes for exact, semantic for themes)

```
"week-38-2025 project:hextrackr" - This week's HexTrackr work (search_nodes)
"sprint-3 completed" - Completed sprint 3 items (search_nodes)
"recent performance improvements" - Recent optimization work (semantic_search)
```

### Status Tracking (use search_nodes)

```
"in-progress spec:022" - Active spec 022 work
"blocked backend" - Blocked backend tasks
"needs-review security" - Security items awaiting review
```

### Research Queries (mixed approach)

```
"research-websocket" - All WebSocket research (search_nodes for tag)
"WebSocket implementation best practices" - WebSocket insights (semantic_search)
"research:framework-compatibility verified" - Confirmed research (search_nodes)
"how to optimize React rendering" - Performance research (semantic_search)
```

## Maintenance Rules

### Tag Cleanup (Weekly)

1. Review deprecated tags
2. Consolidate similar tags
3. Update temporal tags (week numbers)
4. Archive completed sprint tags

### Entity Cleanup (Weekly)

1. Delete entities older than 7 days without `archived` tag
2. Add `deprecated` tag to obsolete patterns
3. Ensure all entities have required tags

### Backup Protocol

1. Create backup before bulk operations
2. Export critical insights monthly
3. Maintain separate archive for completed specs

## Integration with Constitution

This taxonomy is mandated by the HexTrackr Constitution:

- Article I, Section II: Memory Guidance
- Article III, Section I: Memento MCP requirements

All developers and AI assistants MUST follow these conventions when:

- Creating new entities
- Searching for information
- Maintaining the knowledge graph
- Performing handoffs between sessions

## Quick Reference Card

### Must Have Tags

- [ ] Project tag (`project:*`)
- [ ] Category tag (`frontend/backend/etc`)
- [ ] Temporal tag (`week-*/sprint-*/v*`)

### Spec Work

- [ ] Specification tag (`spec:XXX`)
- [ ] Workflow tag (`in-progress/completed`)

### Knowledge Capture

- [ ] Learning tag (`lesson-learned/pattern/breakthrough`)
- [ ] `reusable` tag if cross-project applicable

### Search Decision Tree

1. **Searching for exact ID?** → Use `search_nodes`
2. **Searching for specific tags?** → Use `search_nodes`
3. **Searching for concepts/themes?** → Use `semantic_search`
4. **Mixed search (tags + concepts)?** → Use `semantic_search` with `hybrid_search: true`
5. **Exploring related ideas?** → Use `semantic_search` with lower `min_similarity`

---

*Last Updated: 2025-09-27*
*Version: 1.2.0*
*Authority: HexTrackr Constitution Article III Section I*
*Changes:*
- *v1.2.0: Added semantic search guidance and optimal search strategies*
- *v1.1.0: Updated tagging methodology to use add_observations with "TAG: " prefix*

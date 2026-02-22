---
name: remember
description: Save to or recall from memory for StakTrakr. Uses mem0 (cloud episodic) as the default, with Memento (Neo4j graph) for structured entities and handoffs.
---

# Remember — StakTrakr

Natural language memory interface. Uses **mem0** for day-to-day recall and **Memento** for structured graph entities (handoffs, linked insights, taxonomy-tagged sessions).

Load `memento-taxonomy` conventions before writing Memento entities.

## Which Backend?

| Need | Use |
|------|-----|
| Quick fact, preference, decision | **mem0** |
| Session summary, end-of-chat notes | **mem0** |
| Structured entity with typed relations | **Memento** |
| Cross-agent handoff (Linear + memory) | **Memento** |
| "What were we working on?" | **mem0** |
| "Find all insights tagged breakthrough" | **Memento** |

**Default**: mem0. Only use Memento when you need graph structure, entity relations, or the handoff protocol.

## Mode Detection

Determine intent from user phrasing:

- SAVE: "remember this", "save this", "log this", "note this".
- RECALL: "what do we know", "look up", "recall", "find memory".
- SAVE SESSION: empty/inferred end-of-session summary request.
- HANDOFF: cross-agent work, PR transfers, blocked on another agent.

If ambiguous, ask one direct clarifying question.

## SAVE Workflow (mem0 default)

1. Save to mem0 with descriptive text and metadata:
   - `text`: Clear, self-contained statement
   - `metadata`: `{ project, category, type }` for filtered recall
1. Confirm what was saved and how to recall it.

### SAVE Notes

- Keep entries concise and actionable.
- Save outcomes and decisions, not transcript dumps.
- Search before create to avoid duplicates.
- Include project context in the text itself ("In StakTrakr, we decided X because Y").

### When to escalate to Memento

Use Memento instead of mem0 when:
- Entity relationships needed (this insight relates to that bug)
- Cross-agent handoff protocol required
- Structured taxonomy tagging needed (entity types, date tokens, ID fields)

For Memento saves:

1. Classify entity type (Session/Insight/Handoff/Bug/Feature/Sprint).
1. Build standardized name and ID using UTC timestamp.
1. Create entity with ordered observations, including:
   - `TIMESTAMP: <ISO-8601 UTC>`
   - `DATE_TOKEN: <YYYYMMDDHHMMSS>`
1. Add required and contextual tags, including date buckets:
   - `TAG: date:YYYYMMDD`
   - `TAG: date:YYYYMM`
   - `TAG: date:YYYY`
1. Link related entities when appropriate.
1. Confirm what was saved and how to recall it.

## Secret Handling in SAVE Mode

Before storing raw secrets, remind user:

- Neither mem0 nor Memento is a true secret vault.
- Storing raw credentials is an explicit risk tradeoff.
- Prefer storing references (env var name, Infisical label) when possible.

If user confirms raw secret storage in Memento, include:

- `TAG: type:secret`
- `TAG: sensitivity:secret`
- `TAG: status:active` (or rotated/revoked)

## RECALL Workflow

### Step 1: Try mem0 first

Search mem0 with natural language query. If results are relevant, present and stop.

### Step 2: Try Memento if mem0 insufficient

Use Memento when:
- mem0 returned nothing relevant
- Query is structural ("find all handoffs for STAK-205")
- Query uses taxonomy tokens ("date:20260218", "agent:codex")

Strategies:
- Colon-delimited name → `search_nodes` with exact colon string (never space-split)
- Tag prefix (`project:staktrakr`, `agent:codex`) → `search_nodes` with exact tag
- Date token/time slice → `search_nodes` with progressive prefixes
  (`YYYYMMDDHH` → `YYYYMMDD` → `YYYYMM` → `YYYY`)
- Conceptual/natural language → `semantic_search` with `hybrid_search: true`

**Fallback**: If `search_nodes` returns 0, always retry with `semantic_search`.

### Step 3: Present

- Single result: show summary, source (mem0/Memento), and key details.
- Multiple results: numbered list with short summaries and source.
- No results: state none found and optionally offer broader search.

## Secret Handling in RECALL Mode

- If user asks whether a secret exists, return metadata only.
- If user asks to reveal secret value, confirm intent before revealing.
- Keep output minimal; do not over-repeat sensitive values.

## SAVE SESSION Workflow

When asked to persist session context:

1. Save to **mem0** with session summary (decisions, files changed, next steps).
1. If session was substantial, also create a **Memento Session entity** with timestamped ID and taxonomy tags.
1. Link to created/updated entities from this session.

Skip if session content is trivial and user did not explicitly ask.

## HANDOFF Workflow

When content is agent handoff related, cross-session pauses, or work transfers:

1. Create **Memento handoff entity** (taxonomy naming required).
1. Save **mem0 memory** with handoff summary for easy recall.
1. Post to Linear using the expanded template (see `memento-taxonomy`):
   - If a related issue exists in the project team: post comment there.
   - If no related issue: create issue in **Developers** team (`38d57c9f-388c-41ec-9cd2-259a21a5df1c`)
     with title `HANDOFF: <TAG> <topic> <YYYY-MM-DD>`.
1. Include `Links:`, `Memory:`, and `Risks:` fields in every handoff.
1. **Never include secrets in Linear** — use mem0/Memento references only.
1. Report handoff entity name and Linear comment/issue result.

Reference: DEVS-17.

## Output Format

### SAVE

```text
Saved to <mem0 | Memento>:
- Memory: <text or entity name>
- Project: <PROJECT_TAG>
- Tags: <key tags, if Memento>
- Recall hint: remember <keyword>
```

### RECALL

- Single result: show source, timestamp (if available), abstract, and key details.
- Multiple results: numbered list with source tags and short summaries.
- No results: state none found and optionally offer broader search.

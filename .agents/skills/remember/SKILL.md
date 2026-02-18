---
name: remember
description: Save to or recall from Memento for StakTrakr (sessions, insights, handoffs, bugs, features, and decisions) using the shared taxonomy.
---

# Remember — StakTrakr

Natural language memory interface for Memento.

Load `memento-taxonomy` conventions before writing or interpreting memory entries.

## Mode Detection

Determine intent from user phrasing:

- SAVE: "remember this", "save this", "log this", "note this".
- RECALL: "what do we know", "look up", "recall", "find memory".
- SAVE SESSION: empty/inferred end-of-session summary request.

If ambiguous, ask one direct clarifying question.

## SAVE Workflow

1. Classify entity type (Session/Insight/Handoff/Bug/Feature/Sprint).
2. Build standardized name and ID using UTC timestamp.
3. Create entity with ordered observations.
4. Add required and contextual tags.
5. Link related entities when appropriate.
6. Confirm what was saved and how to recall it.

### SAVE Notes

- Keep entries concise and actionable.
- Save outcomes and decisions, not transcript dumps.
- Search before create to avoid duplicates.

## Secret Handling in SAVE Mode

Before storing raw secrets, remind user:

- Memento is local but not a true secret vault.
- Storing raw credentials is an explicit local-risk tradeoff.

If user confirms raw secret storage, include:

- `TAG: type:secret`
- `TAG: sensitivity:secret`
- `TAG: status:active` (or rotated/revoked)

Prefer storing references when possible.

## RECALL Workflow

1. Choose strategy:
   - exact/tag query -> `search_nodes`
   - conceptual query -> `semantic_search` with `hybrid_search: true`
2. Expand relevant results with `open_nodes`.
3. Present concise summary first, details on demand.

## Secret Handling in RECALL Mode

- If user asks whether a secret exists, return metadata only.
- If user asks to reveal secret value, confirm intent before revealing.
- Keep output minimal; do not over-repeat sensitive values.

## SAVE SESSION Workflow

When asked to persist session context:

1. Capture major decisions, fixes, and next steps.
2. Create Session entity with timestamped ID.
3. Add required tags and any issue/PR references.
4. Link to created/updated entities from this session.

Skip if session content is trivial and user did not explicitly ask.

## HANDOFF Workflow

When content is agent handoff related:

1. Create Memento handoff entity.
2. If issue is known and Linear is available, post handoff comment.
3. Report handoff entity name and comment result.

## Output Format

### SAVE

```text
Saved to memory:
- Entity: <name>
- Type: <entityType>
- Tags: <key tags>
- Recall hint: remember <keyword or ID>
```

### RECALL

- Single result: show timestamp, abstract, and key details.
- Multiple results: numbered list with short summaries.
- No results: state none found and optionally offer broader search.

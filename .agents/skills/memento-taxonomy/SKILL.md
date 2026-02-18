---
name: memento-taxonomy
description: Shared Memento taxonomy for StakTrakr memory entities, tags, naming, relations, and secret-handling guardrails used by memory skills.
---

# Memento Taxonomy — StakTrakr

Reference standard for all Memento writes/reads in this project.

## Purpose

- Keep memory consistent across Codex and Claude.
- Make retrieval predictable via stable naming and tags.
- Enforce explicit communication around secret-storage risk.

## Secret Risk Warning

Memento is local and useful, but it is not a dedicated secret vault.

- Storing raw secrets is a local-risk tradeoff.
- Prefer storing references (env var name, vault item label) when possible.
- If storing raw secret material, keep entries minimal and tagged.
- Memory skills should remind the user of this risk before save/reveal.

## Entity Types

Use `PROJECT:DOMAIN:TYPE` as `entityType`.

| Type | entityType | Name Format |
|---|---|---|
| Session | `STAKTRAKR:DEVELOPMENT:SESSION` | `Session: STAKTRAKR-KEYWORD-YYYYMMDD-HHMMSS` |
| Insight | `STAKTRAKR:DOMAIN:INSIGHT` | `Insight: STAKTRAKR-INSIGHT-YYYYMMDD-HHMMSS` |
| Handoff | `STAKTRAKR:DEVELOPMENT:HANDOFF` | `HANDOFF:STAK-###:PR-###:YYYY-MM-DD:AGENT` |
| Bug | `STAKTRAKR:DEVELOPMENT:BUG` | `BUG:staktrakr:short-description` |
| Feature | `STAKTRAKR:DEVELOPMENT:FEATURE` | `FEATURE:staktrakr:short-description` |
| Sprint | `STAKTRAKR:PLANNING:SPRINT` | `StakTrakr-Sprint-Plan` |

DOMAIN values: `DEVELOPMENT`, `PRICING`, `UI`, `API`, `SECURITY`, `WORKFLOW`, `PLANNING`

## Observation Order

Use this order when creating entities:

1. `TIMESTAMP: <ISO-8601 UTC>`
2. `ABSTRACT: <one-line summary>`
3. `SUMMARY: <detailed context and implications>`
4. ID field (`SESSION_ID`, `INSIGHT_ID`, etc.)
5. Additional context lines

## Required Tags

Every entity should include:

- `TAG: project:staktrakr`
- `TAG: <category>` (for example `frontend`, `api`, `security`)
- `TAG: <status>` (`completed`, `in-progress`, `blocked`)

## Context Tags

Use when applicable:

- `TAG: issue:STAK-###`
- `TAG: pr:###`
- `TAG: agent:codex` or `TAG: agent:claude`
- `TAG: vX.Y.Z`
- `TAG: spec:###`
- `TAG: week-##-YYYY`

## Secret Tags

For credential-related entries:

- `TAG: type:secret`
- `TAG: sensitivity:secret`
- `TAG: status:active` (or `rotated` / `revoked`)

Secret entries should keep `ABSTRACT` non-sensitive (identify service, not full key value).

## Relation Types

- `IMPLEMENTS`
- `DEPENDS_ON`
- `SOLVES`
- `SUPERSEDES`
- `RELATES_TO`

## Search Strategy

1. Use `search_nodes` for exact IDs and tag queries.
2. Use `semantic_search` (`hybrid_search: true`) for conceptual recall.
3. Use `open_nodes` to expand selected results.
4. Use `read_graph` only for full-graph diagnostics.

## Handoff Standard

For cross-agent handoff, create both:

1. Memento handoff entity (`HANDOFF:...` naming).
2. Linear comment on the linked issue (if available).

Use this comment template:

```text
Agent handoff update:
- Agent: <claude|codex>
- Status: <blocked|in-progress|ready-for-review|done>
- Scope: <what changed>
- Validation: <what was run/verified>
- Next: <explicit next step + owner>
- Memento: <entity name>
```

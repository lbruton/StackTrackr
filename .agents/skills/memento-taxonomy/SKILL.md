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
1. `DATE_TOKEN: <YYYYMMDDHHMMSS>` (UTC, canonical machine token)
1. `ABSTRACT: <one-line summary>`
1. `SUMMARY: <detailed context and implications>`
1. ID field (`SESSION_ID`, `INSIGHT_ID`, etc.)
1. Additional context lines

Date token rules:

- Always UTC.
- Always 14 digits: `YYYYMMDDHHMMSS`.
- Never use ambiguous compact forms.
- Use this token for time-range query expansion by prefix trimming.

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
- `TAG: date:YYYYMMDD` (day bucket)
- `TAG: date:YYYYMM` (month bucket)
- `TAG: date:YYYY` (year bucket)

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

1. Use `search_nodes` for exact IDs, entity names, and tag queries.
1. For time-scoped recall, use date token prefixes in this order:
   - `YYYYMMDDHH` (hour slice)
   - `YYYYMMDD` (day slice)
   - `YYYYMM` (month slice)
   - `YYYY` (year slice)
1. Combine time query with tags when possible (for example `agent:codex date:20260218`).
1. Use `semantic_search` (`hybrid_search: true`) for conceptual recall.
1. Use `open_nodes` to expand selected results.
1. Use `read_graph` only for full-graph diagnostics.
1. **Fallback**: If `search_nodes` returns 0 results, always retry with `semantic_search`.

**Critical**: Never space-split colon-delimited entity names. `HANDSHAKE CODEX 2026-02-18` (spaces)
returns 0 results — use `HANDSHAKE:CODEX:2026-02-18` (colons preserved).
Colons are part of the name token in the search index.

## Handoff Standard

For cross-agent handoff, create both:

1. Memento handoff entity (`HANDOFF:...` naming).
1. Linear comment/issue in the **Developers** team (`38d57c9f-388c-41ec-9cd2-259a21a5df1c`) for cloud-agent visibility.

### Linear Developers Team

The **Developers** team (`38d57c9f-388c-41ec-9cd2-259a21a5df1c`) is a shared scratch space
for all agents and the human — handoffs, notes, plans, brainstorming, ideas.

**Projects in Developers** = repos/codebases (StakTrakr, HexTrackr, etc.) for sorting notes.
This differs from the StakTrakr project team where projects = feature groups and sprints.

### Handoff Routing

- If a related issue exists in the project team (e.g., STAK-###): post comment there
- If no related issue: create issue in Developers team under the appropriate project
- **No secrets in Linear** — use references only

### Linear Issue Title Pattern

`HANDOFF: <PROJECT_TAG> <short topic> <YYYY-MM-DD>`

### Comment Template

```text
Agent handoff update:
- Agent: <claude|codex|gemini|human>
- Status: <blocked|in-progress|ready-for-review|done>
- Scope: <what changed>
- Validation: <what was run/verified>
- Next: <explicit next step + owner>
- Links: <Linear issue/PR links>
- Memory: <Memento entity name(s), if used>
- Risks: <known risks/assumptions>
```

### Status Semantics

- `blocked`: cannot proceed without external input/dependency
- `in-progress`: active work under current owner
- `ready-for-review`: implementation complete, review needed
- `done`: handoff chain closed for this scope

### Rules

- Always post both Linear + Memento together
- New entries on plan changes (never overwrite)
- Small, frequent handoffs over large dumps

## Secrets Policy

- **Memento**: Secrets allowed only with explicit user approval (low-risk items like test API keys).
  Warn before save, confirm before reveal. Tag with `type:secret`, `sensitivity:secret`, `status:active`.
- **Linear**: No secrets ever. Reference only (e.g., "key stored in Memento entity X").
- **Prefer references** over raw values.

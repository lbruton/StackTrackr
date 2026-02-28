# Copilot Memory → mem0 Import — Design

## Goal

Import GitHub Copilot repository memory entries into mem0 on demand via a `/copilot-memory-import` Claude skill, using Playwright to authenticate and scrape the GitHub settings page.

## Problem

GitHub Copilot Memory (public preview) has no REST API or `gh` CLI endpoint. The only way to access stored memory entries is through the authenticated web UI at `github.com/<owner>/<repo>/settings/copilot/memory`. We want those entries available in mem0 so all agents (Claude, Codex, Gemini) can reference them during development sessions.

## Architecture

A new Claude skill (`~/.claude/skills/copilot-memory-import/SKILL.md`) that instructs Claude to:

1. Use `mcp__playwright__browser_navigate` to open the Copilot memory settings page
2. Use `mcp__playwright__browser_snapshot` to capture the DOM
3. Parse all memory entry text from the snapshot
4. Upsert each entry into mem0 via `mcp__mem0__add_memory` with metadata `{ project: "staktrakr", source: "copilot", type: "copilot-memory" }`
5. Report a summary: "Imported N entries"

## Auth

Playwright MCP uses a persistent browser profile (or connects via CDP to an existing Chrome session). No cookie extraction required — navigating to the GitHub URL while the browser is logged in will succeed automatically.

## Deduplication

mem0's vector-based dedup handles near-duplicate prevention. We add consistent `source: "copilot"` metadata so entries can be filtered or wiped cleanly.

## Skill Location

`~/.claude/skills/copilot-memory-import/SKILL.md`

Not tracked in the StakTrakr repo (user-level skill, not project-level).

## Out of Scope

- Automatic/scheduled import (manual invocation only)
- Writing memories back to GitHub (read-only)
- Multi-repo support (single repo: lbruton/StakTrakr)

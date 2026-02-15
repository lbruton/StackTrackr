---
name: claude-context-rules
description: Rules for using Claude-Context semantic code search (mcp__claude-context__). Use when searching the codebase, looking up functions, or exploring architecture.
user-invocable: false
---

# Claude-Context — Semantic Code Search

Semantic code search via AST-based indexing, Milvus vector database, and OpenAI embeddings.

**Index path**: `/Volumes/DATA/GitHub/StackTrackr` (40 files, ~885 chunks as of Feb 2026).

## Rules

- **Always use `search_code` as the first step** for any codebase lookup — it's the fastest way to orient yourself (~2s, zero subprocess tokens). For single-function or architectural questions, it's often all you need.
- **For cross-cutting or scattered concerns**, Claude-Context may return incomplete results (e.g., finding 3 of 7 escape functions). When results seem partial, pass the initial findings as seed context to an Explore agent for comprehensive coverage.
- **For literal string matches**, use Grep directly — Claude-Context uses semantic embeddings and can confuse similar concepts (e.g., ranking `importCsv` above `exportCsv` for an "export" query).
- **Always pass the absolute path** `/Volumes/DATA/GitHub/StackTrackr` — relative paths will fail.
- **Use natural language queries**, not code patterns. Good: `"how are spot prices fetched from the API"`. Bad: `"fetchSpotPrice function"` (use Grep for literal matches).
- **Use `extensionFilter`** to narrow results when you know the file type (e.g., `[".js"]` for JS-only results).
- **Raise `limit`** (default 10, max 50) for broad exploratory searches; keep it low for targeted lookups.
- **Check `get_indexing_status` before searching** if results seem stale or a search returns an error — the index may need rebuilding.
- **Re-index with `index_codebase`** (with `force: true`) after significant structural changes (new files, renamed modules, major refactors). Confirm with the user before force-indexing.
- **Never use `clear_index`** without explicit user request — it destroys the index and requires a full rebuild.

---
name: research
description: Web research and information lookup strategy — Brave Search first, built-in WebSearch fallback. Use when researching topics, looking up information, verifying facts, or performing web searches.
user-invocable: false
---

# Research — Web Search & Information Lookup

Strategy for web research tasks. Establishes tool priority and workflow patterns.

## Tool Priority Chain

1. **Brave Search (primary)** — `mcp__brave-search__brave_web_search` and siblings. Richer results, Pro features (local search, summarizer). Tools are deferred — call `ToolSearch` to load them before first use.
2. **Built-in WebSearch (fallback)** — Use when Brave is unavailable or returns no results.
3. **Built-in WebFetch (direct page fetch)** — Use when you already have a URL and need its content. Also useful after Brave returns URLs you want to read in full.

## Workflow

### Quick Lookup (single fact or definition)
1. `brave_web_search` with a focused query
2. Extract the answer from results — done

### Deep Research (multi-faceted topic)
1. Start with `brave_web_search` for a broad query
2. Narrow with follow-up searches on specific subtopics
3. Use `brave_summarizer` for long pages (two-step: search with `summary: true`, then pass key to `brave_summarizer`)
4. Use `WebFetch` to read full pages when summaries aren't enough

### Current Events / Recent News
- Use `brave_news_search` instead of `brave_web_search`
- Include the current year in queries for recency

### Media Searches
- **Images**: `brave_image_search`
- **Videos**: `brave_video_search`
- **Local/places**: `brave_local_search` (Pro plan)

## Rules

- **Always load Brave tools first** via `ToolSearch` — they are deferred MCP tools.
- **Prefer Brave over built-in WebSearch** — better results, more search types.
- **Fall back to WebSearch** if Brave errors, times out, or returns empty results.
- **Include sources** — always cite URLs from search results so the user can verify.
- **Use Context7 for library docs** — don't web-search for Chart.js, Bootstrap, etc. when Context7 has authoritative docs. Research skill is for general web topics.
- See `brave-search-rules` skill for Brave-specific tool details (summarizer flow, local search, etc.).

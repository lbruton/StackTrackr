---
name: brave-search-rules
description: Rules for using Brave Search API (mcp__brave-search__). Use when performing web searches, news lookups, or page summarization.
user-invocable: false
---

# Brave Search — Web Search API

Web search via Brave Search API. Six tools: `brave_web_search`, `brave_news_search`, `brave_image_search`, `brave_video_search`, `brave_local_search`, `brave_summarizer`.

## Rules

- **Prefer Brave Search over built-in WebSearch** for web lookups — richer results (news, images, video, local).
- **Use `brave_web_search` as the default** for general queries.
- **Use `brave_news_search`** for current events and recent developments.
- **Use `brave_summarizer` for concise page summaries** — two-step flow: first call `brave_web_search` with `summary: true`, then pass the returned key to `brave_summarizer`.
- **Use `brave_local_search`** for location-based queries (cities, "near me"). Requires Pro plan; falls back to `brave_web_search` automatically.

---
name: scan-mentions
description: Use when asked to check user feedback, scan public threads, review what users are saying about StakTrakr, or monitor Reddit/forum posts for bug reports. Triggers on /scan-mentions or any request to check mentions or user posts.
---

# scan-mentions

Scrapes all watched public threads using Firecrawl and summarizes bug reports, feature requests, and user feedback. No Reddit API or extra setup needed.

## Watched URLs

Add new entries here whenever the user drops a URL.

| URL | Platform | Notes |
|-----|----------|-------|
| https://www.reddit.com/r/staktrakr/ | r/staktrakr | Our subreddit — scan new posts for bug reports and feedback. |
| https://www.reddit.com/r/Silverbugs/comments/1r1aerl/comment/o6iznvt/ | r/Silverbugs | Main StakTrakr showcase thread — use comment-anchored URL, root URL gets gated by Reddit. PumpkinCrouton is a power user — read all their comments carefully. |
| https://www.reddit.com/r/Silverbugs/comments/1r6vc71/ | r/Silverbugs | Second Silverbugs thread mentioning StakTrakr. |

## Steps

1. For each URL in the table above, call `mcp__firecrawl-local__firecrawl_scrape` with:
   ```
   formats: ["markdown"]
   onlyMainContent: true
   ```
2. Scrape all URLs in parallel for speed.
3. For each thread, scan for:
   - **Bugs** — errors, crashes, wrong behavior, missing data
   - **Feature requests** — things users wish it did
   - **UX confusion** — questions that reveal unclear flows
   - **Praise** — useful for understanding what's working
4. If a comment contains "Continue this thread" links with unread replies, scrape those child URLs too.
5. Output a summary per thread:
   - Thread title + URL
   - Actionable bugs with username + direct quote
   - Feature requests
   - Notable praise or confusion
6. Flag anything that looks like it warrants a Linear issue.

## Key Users

- **PumpkinCrouton** — power user, stress-tester, pushes the app to edge cases. Prioritize their comments.
- **orphenshadow** — that's the developer (you). Skip their comments in the summary.

## Adding a New URL

When the user drops a URL, add a row to the Watched URLs table above with the platform and any relevant notes. Commit the change.

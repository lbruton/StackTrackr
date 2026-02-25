---
name: wiki-search
description: Use when searching for documentation, architecture decisions, or operational runbooks in StakTrakrWiki. Guides indexing and querying the wiki via mcp__claude-context__search_code.
---

# Wiki Search

Use `mcp__claude-context__search_code` to search StakTrakrWiki for documentation, architecture decisions, and operational runbooks. The wiki is indexed separately from the codebase — use the `path` parameter to target the right index.

## When to Use Wiki Search vs. Code Search

| Question type | Use |
|---------------|-----|
| "How does X work?" (conceptual) | Wiki search → `path: /Volumes/DATA/GitHub/StakTrakrWiki` |
| "Where is X implemented?" (structural) | Code search → `path: /Volumes/DATA/GitHub/StakTrakr` |
| "What are the stale thresholds for the spot feed?" | Wiki search |
| "What calls `syncRetailPrices()`?" | Code graph context (CGC) |
| "Where is `safeGetElement` defined?" | Code search or Grep |
| "What does the Fly.io cron schedule look like?" | Wiki search |

**Rule of thumb:** Documentation questions → wiki. Implementation questions → code.

---

## How to Index the Wiki

Run this when the wiki has never been indexed, or after major structural updates:

```
mcp__claude-context__index_codebase
  path: /Volumes/DATA/GitHub/StakTrakrWiki
  splitter: langchain
  customExtensions: [".md"]
```

Force re-index after major wiki updates:

```
mcp__claude-context__index_codebase
  path: /Volumes/DATA/GitHub/StakTrakrWiki
  splitter: langchain
  customExtensions: [".md"]
  force: true
```

---

## Check Index Status

```
mcp__claude-context__get_indexing_status
```

The wiki should show ~19 files, ~74 chunks when fully indexed. If counts are lower than expected, run `index_codebase` with `force: true`.

---

## How to Search

```
mcp__claude-context__search_code
  query: "your natural language query"
  path: /Volumes/DATA/GitHub/StakTrakrWiki
```

---

## Example Queries

| Query | Expected pages |
|-------|----------------|
| `"API stale thresholds"` | `health.md`, `spot-pipeline.md` |
| `"Fly.io cron schedule"` | `fly-container.md` |
| `"Turso merge logic"` | `retail-pipeline.md` |
| `"safeGetElement pattern"` | `dom-patterns.md` |
| `"spot pipeline stale thresholds"` | `health.md`, `spot-pipeline.md` |
| `"release workflow worktree"` | `release-workflow.md` |
| `"goldback scrape daily"` | `goldback-pipeline.md` |
| `"secrets rotation"` | `secrets.md` |

---

## Wiki Page Index

### Infrastructure (maintained by StakTrakrApi agents)

| Page | Topic |
|------|-------|
| `architecture-overview.md` | System diagram, repo boundaries, data feeds |
| `retail-pipeline.md` | Dual-poller, Turso, providers.json, OOS detection |
| `fly-container.md` | Services, cron, env vars, proxy config, deployment |
| `home-poller.md` | Proxmox LXC setup, cron, sync process |
| `spot-pipeline.md` | GitHub Actions, MetalPriceAPI, hourly files |
| `goldback-pipeline.md` | Daily scrape, run-goldback.sh |
| `providers.md` | URL strategy, year-start patterns, update process |
| `secrets.md` | Where every secret lives, how to rotate |
| `health.md` | Quick health checks, stale thresholds, diagnosis commands |

### Frontend (maintained by StakTrakr Claude Code)

| Page | Topic |
|------|-------|
| `frontend-overview.md` | File structure, script load order, service worker, PWA |
| `data-model.md` | Portfolio model, storage keys, coin/entry schema |
| `storage-patterns.md` | saveData/loadData wrappers, sync variants, key validation |
| `dom-patterns.md` | safeGetElement, sanitizeHtml, event delegation |
| `sync-cloud.md` | Cloud backup/restore, vault encryption, sync flow |
| `retail-modal.md` | Coin detail modal, vendor legend, OOS detection |
| `api-consumption.md` | Spot feed, market price feed, goldback feed, health checks |
| `release-workflow.md` | Patch cycle, version bump, worktree pattern, ship to main |
| `service-worker.md` | CORE_ASSETS, cache strategy, pre-commit stamp hook |

---

## Notes

- The code index (StakTrakr repo) and wiki index are separate — both can be searched via the `path` parameter.
- Re-index with `force: true` after major wiki restructuring to ensure accurate results.
- Infrastructure pages are owned by StakTrakrApi Claude. For infra questions, search first, then verify with `/remember api infrastructure` if needed.
- Raw pages accessible at: `https://raw.githubusercontent.com/lbruton/StakTrakrWiki/main/<page>.md`

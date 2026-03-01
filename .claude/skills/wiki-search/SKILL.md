---
name: wiki-search
description: Search in-repo wiki/ documentation via mcp__claude-context__search_code. No external repo needed.
---

# Wiki Search

Use `mcp__claude-context__search_code` to search the in-repo `wiki/` subfolder for
documentation, architecture decisions, and operational runbooks. The wiki lives
inside the StakTrakr repo — no external repository or `git pull` needed.

---

## When to Use Wiki Search vs. Code Search

| Question type | Use |
|---------------|-----|
| "How does X work?" (conceptual) | Wiki search — `$ROOT/wiki/` |
| "Where is X implemented?" (structural) | Code search — `$ROOT/` |
| "What are the stale thresholds for the spot feed?" | Wiki search |
| "What calls `syncRetailPrices()`?" | Code graph context (CGC) |
| "Where is `safeGetElement` defined?" | Code search or Grep |
| "What does the Fly.io cron schedule look like?" | Wiki search |
| "What's the release workflow?" | Wiki search |
| "What retail globals are exported?" | Wiki search first, then verify with code search |

**Rule of thumb:** Documentation questions go to wiki. Implementation questions go to code.

---

## Determine the Wiki Path

The wiki is at `$ROOT/wiki/` where `$ROOT` is the project root. Detect it dynamically:

```bash
ROOT=$(git rev-parse --show-toplevel)
WIKI_PATH="$ROOT/wiki"
echo "Wiki path: $WIKI_PATH"
```

For StakTrakr, this resolves to `/Volumes/DATA/GitHub/StakTrakr/wiki/` (or the
equivalent worktree path if running inside a worktree).

---

## How to Index

Index the wiki subfolder for semantic search. Since the wiki is in-repo, it stays
current with the branch you are on — no `git pull` needed.

### Standard index

```
mcp__claude-context__index_codebase
  path: $ROOT/wiki
  splitter: langchain
  customExtensions: [".md"]
```

### Force re-index (after major wiki changes)

```
mcp__claude-context__index_codebase
  path: $ROOT/wiki
  splitter: langchain
  customExtensions: [".md"]
  force: true
```

The wiki should show ~29 content files and ~120+ chunks when fully indexed.
If counts are significantly lower, re-index with `force: true`.

---

## Check Index Status

```
mcp__claude-context__get_indexing_status
```

Look for the wiki path in the status output. If not indexed yet, run the index
command above.

---

## How to Search

```
mcp__claude-context__search_code
  query: "your natural language query"
  path: $ROOT/wiki
```

Replace `$ROOT` with the actual resolved path (e.g., `/Volumes/DATA/GitHub/StakTrakr/wiki`
or the worktree equivalent).

---

## Example Queries

| Query | Expected Pages |
|-------|----------------|
| `"API stale thresholds"` | `health.md`, `spot-pipeline.md` |
| `"Fly.io cron schedule"` | `fly-container.md`, `cron-schedule.md` |
| `"Turso merge logic"` | `retail-pipeline.md`, `turso-schema.md` |
| `"safeGetElement pattern"` | `dom-patterns.md` |
| `"spot pipeline stale thresholds"` | `health.md`, `spot-pipeline.md` |
| `"release workflow worktree"` | `release-workflow.md` |
| `"goldback per-state slugs"` | `goldback-pipeline.md` |
| `"Turso readLatestPerVendor"` | `turso-schema.md`, `retail-pipeline.md` |
| `"REST API confidence scoring"` | `rest-api-reference.md` |
| `"cron timeline minute by minute"` | `cron-schedule.md` |
| `"secrets rotation"` | `secrets.md` |
| `"ALLOWED_STORAGE_KEYS"` | `data-model.md`, `storage-patterns.md` |
| `"cloud sync backup restore"` | `sync-cloud.md`, `backup-restore.md` |
| `"retail modal vendor legend"` | `retail-modal.md`, `vendor-quirks.md` |
| `"service worker cache strategy"` | `service-worker.md` |
| `"image capture pipeline"` | `image-pipeline.md` |

---

## Wiki Page Index

### Frontend (owner: staktrakr)

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
| `backup-restore.md` | Backup/restore flow, file format, cloud storage integration |
| `image-pipeline.md` | Image capture, processing, storage pipeline |

### Infrastructure (owner: staktrakr-api)

| Page | Topic |
|------|-------|
| `architecture-overview.md` | System diagram, repo boundaries, data feeds |
| `rest-api-reference.md` | Complete endpoint map, schemas, confidence tiers, vendor reference |
| `turso-schema.md` | Database tables, indexes, key query patterns, data volume estimates |
| `cron-schedule.md` | Full timeline view of spot/retail/publish cron interleaving |
| `retail-pipeline.md` | Dual-poller, Turso, providers.json, OOS detection, T1-T5 resilience |
| `fly-container.md` | Services, cron, env vars, proxy config, deployment |
| `home-poller.md` | Proxmox LXC setup, cron, sync process |
| `spot-pipeline.md` | MetalPriceAPI, hourly/15min files, backfill logic |
| `goldback-pipeline.md` | Per-state slugs (8 states x 7 denominations), denomination generation |
| `providers.md` | URL strategy, year-start patterns, update process |
| `secrets.md` | Where every secret lives, how to rotate |
| `health.md` | Quick health checks, stale thresholds, diagnosis commands |
| `vendor-quirks.md` | Vendor-specific URL patterns and scraping behaviors |
| `provider-database.md` | Provider DB reference and configuration |
| `poller-parity.md` | Comparison between Fly.io and home poller setups |

### Meta

| Page | Topic |
|------|-------|
| `README.md` | Wiki index page with page table |
| `_sidebar.md` | Navigation sidebar for wiki browsing |
| `CHANGELOG.md` | Wiki change history |

---

## Fallback: Direct Grep

If semantic search returns no results or the index is unavailable, fall back to
direct Grep:

```
Grep
  pattern: "your search term"
  path: $ROOT/wiki
  glob: "*.md"
  output_mode: content
```

This works without any indexing but only matches literal strings and regex — no
semantic understanding.

---

## Notes

- **The wiki is in-repo.** No `git pull` from an external repo is needed. The wiki
  content matches the branch you are on.
- **Worktree awareness:** If running inside a worktree, `git rev-parse --show-toplevel`
  returns the worktree root, so `$ROOT/wiki/` automatically resolves correctly.
- **Both indexes coexist.** The code index (`$ROOT/`) and wiki index (`$ROOT/wiki/`)
  are separate — use the `path` parameter to target the right one.
- **Re-index after sweeps.** After `/wiki-sweep` rewrites many pages, re-index with
  `force: true` to ensure search results are current.
- **Infrastructure pages** are owned by StakTrakrApi Claude. For infra questions,
  search first, then verify with `/remember api infrastructure` if needed.
- **Raw file access:** Wiki pages can be read directly with the Read tool at
  `$ROOT/wiki/<page>.md` — no special tooling required.

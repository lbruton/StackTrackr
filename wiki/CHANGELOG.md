---
title: "Changelog"
category: meta
owner: shared
lastUpdated: v3.33.19
date: 2026-03-01
sourceFiles: []
relatedPages: []
---

# Wiki Changelog

Running log of structural wiki updates. Not a code changelog — tracks when wiki content was added, reorganized, or policy was updated.

---

## 2026-02-25

- **STAK-335 per-state Goldback documentation** — updated for PR `StakTrakrApi#3`
  - Rewrote [Goldback Pipeline](goldback-pipeline.md) — 8 states × 7 denominations (56 slugs), migration from legacy slugs, enabling workflow
  - Updated [REST API Reference](rest-api-reference.md) — per-state endpoint patterns, updated coin slug list
  - Updated [Retail Pipeline](retail-pipeline.md) — noted disabled goldback slugs add zero scrape load
  - Updated [Turso Schema](turso-schema.md) — data volume projections for STAK-335 expansion
- **Full API infrastructure audit** from live Fly.io container source code
- Created [REST API Reference](rest-api-reference.md) — complete endpoint map, schemas, confidence tiers, vendor reference, HTTP server audit
- Created [Turso Schema](turso-schema.md) — database tables, indexes, key query patterns (readLatestPerVendor, readRecentWindows, etc.), data volume estimates
- Created [Cron Schedule](cron-schedule.md) — full timeline view showing how spot/retail/publish cycles interleave, with design rationale
- Updated [Spot Pipeline](spot-pipeline.md) — added full architecture diagram (MetalPriceAPI → poller.py → hourly/15min/seed files), rate conversion table, backfill logic, three output file types
- Updated [Goldback Pipeline](goldback-pipeline.md) — documented all 6 denomination slugs (G1–G50), API endpoint table, dual-path architecture (retail pipeline + denomination spot JSON)
- Updated [Retail Pipeline](retail-pipeline.md) — corrected coin/vendor counts (17 coins × 7 vendors), added source values (firecrawl/playwright/gemini-vision/fbp), removed stale goldback cron entry, added cross-links to new pages
- Updated [Architecture Overview](architecture-overview.md) — new page index, corrected verification date
- Updated sidebar and README with links to 3 new pages
- Deprecated Notion infrastructure pages; StakTrakrWiki is now the sole source of truth for all infrastructure documentation
- Added `wiki-search` skill to StakTrakr — guides indexing and querying the wiki via `mcp__claude-context__search_code`
- Deprecated `docs/devops/api-infrastructure-runbook.md` in StakTrakr (deprecation banner added; file retained pending wiki parity audit)
- Added Update Policy section to README.md
- Added Documentation Policy section to CLAUDE.md, AGENTS.md, GEMINI.md, and copilot-instructions.md
- Updated `finishing-a-development-branch` skill with mandatory Wiki Update Gate (runs before every PR)
- Updated `wiki-update` skill with infrastructure page mapping table
- Added SSH Remote Management section to `home-poller.md` — Claude Code can now SSH directly via `stakpoller` user
- Updated `home-poller.md` user from `lbruton` to `stakpoller` for SSH access
- Verified home poller from VM console: fixed cron `30 * * * *` → `0,30 * * * *` (runs 2×/hr) across `home-poller.md`, `retail-pipeline.md`, `architecture-overview.md`
- Fixed `retail-pipeline.md` home poller IP from `192.168.1.48` → `192.168.1.81` and POLLER_ID from `api2` → `home`
- Added `FLYIO_TAILSCALE_IP` to `home-poller.md` env table
- Pinned Node.js version to 22.22.0 in `home-poller.md` stack table

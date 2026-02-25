## What's New

- **Numista Image Race Condition Fix (v3.32.40)**: Numista images now appear in table and card views immediately after applying a result. Previously images only showed after a page refresh due to a fire-and-forget race condition (STAK-337).
- **Image Bug Fixes + API Health Refresh (v3.32.39)**: Fixed CDN URL writeback in resync and bulk cache. Remove button now clears URL fields and sets per-item pattern opt-out flag. API health badge uses cache-busting to defeat service worker staleness (STAK-333, STAK-308, STAK-332, STAK-311, STAK-334).
- **Home Poller SSH + Skill Updates (v3.32.38)**: New homepoller-ssh skill for direct SSH management of the home VM. Updated repo-boundaries with corrected IP and SSH workflow. Skills no longer delegate to OS-level Claude agent.
- **Wiki-First Documentation Policy (v3.32.37)**: StakTrakrWiki established as sole source of truth. Notion infrastructure pages deprecated. New wiki-search skill for querying docs via claude-context. finishing-a-development-branch skill updated with Wiki Update Gate before every PR.
- **Bug Fixes — Numista Data Integrity (v3.32.36)**: Fixed Numista image URLs and metadata re-populating after being cleared in the edit form. Fixed view modal cross-contaminating images between items. Removed on-load CDN backfill that undid deliberate clears. Added Purge Numista URLs button in Settings &rarr; Images (STAK-309, STAK-311, STAK-306, STAK-312).

## Development Roadmap

### Next Up

- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

### Near-Term

- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides

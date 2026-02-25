## What's New

- **Home Poller SSH + Skill Updates (v3.32.38)**: New homepoller-ssh skill for direct SSH management of the home VM. Updated repo-boundaries with corrected IP and SSH workflow. Skills no longer delegate to OS-level Claude agent.
- **Wiki-First Documentation Policy (v3.32.37)**: StakTrakrWiki established as sole source of truth. Notion infrastructure pages deprecated. New wiki-search skill for querying docs via claude-context. finishing-a-development-branch skill updated with Wiki Update Gate before every PR.
- **Bug Fixes — Numista Data Integrity (v3.32.36)**: Fixed Numista image URLs and metadata re-populating after being cleared in the edit form. Fixed view modal cross-contaminating images between items. Removed on-load CDN backfill that undid deliberate clears. Added Purge Numista URLs button in Settings &rarr; Images (STAK-309, STAK-311, STAK-306, STAK-312).
- **Header Buttons Reorder (v3.32.35)**: Toggle visibility and reorder header buttons in Settings → Appearance with the new checkbox table. Order applies to the live header and persists across sessions (STAK-320).
- **Force Refresh Button (v3.32.34)**: New button in Settings &rarr; System &rarr; App Updates. Unregisters service workers and reloads to fetch the latest version. Use if the app appears stuck on an old version after an update (STAK-324).

## Development Roadmap

### Next Up

- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

### Near-Term

- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides

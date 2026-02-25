## What's New

- **Bug Fixes — Numista Data Integrity (v3.32.36)**: Fixed Numista image URLs and metadata re-populating after being cleared in the edit form. Fixed view modal cross-contaminating images between items. Removed on-load CDN backfill that undid deliberate clears. Added Purge Numista URLs button in Settings &rarr; Images (STAK-309, STAK-311, STAK-306, STAK-312).
- **Header Buttons Reorder (v3.32.35)**: Toggle visibility and reorder header buttons in Settings → Appearance with the new checkbox table. Order applies to the live header and persists across sessions (STAK-320).
- **Force Refresh Button (v3.32.34)**: New button in Settings &rarr; System &rarr; App Updates. Unregisters service workers and reloads to fetch the latest version. Use if the app appears stuck on an old version after an update (STAK-324).
- **Bug Fix — 7-Day Sparklines (v3.32.33)**: Fresh load sparklines now draw a full 7-day curve. Hourly backfill extends to 7 days on first load to bridge the LBMA seed data lag (STAK-303).
- **Cloud Backup Labels (v3.32.32)**: Backup list now shows "Inventory backup" or "Image backup" label on each row so you can tell at a glance which files contain your items vs. your photos (STAK-316).

## Development Roadmap

### Next Up

- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

### Near-Term

- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides

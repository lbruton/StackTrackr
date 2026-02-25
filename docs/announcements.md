## What's New

- **Header Buttons Reorder (v3.32.35)**: Toggle visibility and reorder header buttons in Settings → Appearance with the new checkbox table. Order applies to the live header and persists across sessions (STAK-320).
- **Force Refresh Button (v3.32.34)**: New button in Settings &rarr; System &rarr; App Updates. Unregisters service workers and reloads to fetch the latest version. Use if the app appears stuck on an old version after an update (STAK-324).
- **Bug Fix — 7-Day Sparklines (v3.32.33)**: Fresh load sparklines now draw a full 7-day curve. Hourly backfill extends to 7 days on first load to bridge the LBMA seed data lag (STAK-303).
- **Cloud Backup Labels (v3.32.32)**: Backup list now shows "Inventory backup" or "Image backup" label on each row so you can tell at a glance which files contain your items vs. your photos (STAK-316).
- **Code Cleanup (v3.32.31)**: Removed unused internal utility function from utils.js with zero impact on app behavior.
- **Menu Enhancements (v3.32.30)**: Trend period labels on spot cards update with trend button. Health dots on Sync and Market buttons reflect data freshness. Vault header button opens backup/restore. Show Text toggle displays icon labels. Uniform column-flex button layout (STAK-314).
- **Parallel Agent Workflow (v3.32.29)**: Claims-array version lock replaces binary lock — multiple agents can claim concurrent patch versions without blocking each other. Brainstorming skill now enforces worktree gate before any implementation starts.
- **Image Storage Expansion (v3.32.27)**: Dynamic IndexedDB quota via navigator.storage.estimate() replaces hardcoded 50 MB cap. Persistent storage request on first upload prevents silent eviction. Settings → Images → Storage shows split progress bars for Your Photos vs. Numista Cache. sharedImageId foundation for future image reuse across items (STAK-305).
- **Bug Fixes — Storage Quota, Chrome Init Race, Numista Data Integrity (v3.32.26)**: Fixed localStorage quota overflow for retailIntradayData on large collections. Fixed Chrome "Cannot access inventory before initialization" crash on page refresh. Fixed Numista N# and photos repopulating after deletion due to stale serial mapping (STAK-300, STAK-301, STAK-302).

## Development Roadmap

### Next Up

- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

### Near-Term

- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides

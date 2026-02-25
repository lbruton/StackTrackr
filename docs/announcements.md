## What's New

- **Numista Tag Fixes (v3.32.43)**: Tags now visible in edit modal and card views. All tags (including Numista-applied) are removable per-item — no more stuck "Armour", "Bird", or "Marsupial" tags (STAK-343, STAK-344).
- **Pattern Rule Promotion Fix (v3.32.42)**: "Apply to all matching items" now works even when the item was saved previously. Reads from existing per-item IDB record when no pending upload blobs are available; also removes per-item record after promotion (STAK-339-followup).
- **Image Pipeline Simplification (v3.32.41)**: Removed coinImages IDB cache layer entirely. CDN URLs on inventory items are now the sole Numista image source. Eliminates root cause of STAK-309/311/332/333/339 image bugs. Cascade is now: user upload &rarr; pattern image &rarr; CDN URL &rarr; placeholder (STAK-339).
- **Numista Image Race Condition Fix (v3.32.40)**: Numista images now appear in table and card views immediately after applying a result. Previously images only showed after a page refresh due to a fire-and-forget race condition (STAK-337).
- **Image Bug Fixes + API Health Refresh (v3.32.39)**: Fixed CDN URL writeback in resync and bulk cache. Remove button now clears URL fields and sets per-item pattern opt-out flag. API health badge uses cache-busting to defeat service worker staleness (STAK-333, STAK-308, STAK-332, STAK-311, STAK-334).

## Development Roadmap

### Next Up

- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

### Near-Term

- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides

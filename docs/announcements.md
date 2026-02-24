## What's New

- **Bug Fixes — Storage Quota, Chrome Init Race, Numista Data Integrity (v3.32.26)**: Fixed localStorage quota overflow for retailIntradayData on large collections. Fixed Chrome "Cannot access inventory before initialization" crash on page refresh. Fixed Numista N# and photos repopulating after deletion due to stale serial mapping (STAK-300, STAK-301, STAK-302).
- **Vendor Price Carry-Forward + OOS Legend Links (v3.32.25)**: Carry-forward prices in 24h chart and table show ~$XX.XX in muted style when vendor data is missing for a window. OOS vendors now appear in coin legend as clickable links with strikethrough last-known price and OOS badge (STAK-299).
- **Cloud Sync Reliability Fixes (v3.32.24)**: Fixed vault-overwrite race condition where debounced startup push could discard other device's changes during conflict resolution. Fixed getSyncPassword fast-path break for Simple-mode migration and Manual Backup password persistence on page reload.
- **Cloud Settings Redesign + Unified Encryption (v3.32.23)**: Compact ≤400px Dropbox card. Backup/Restore/Disconnect/Change Password moved to Advanced sub-modal. Simplified unified encryption replaces Simple/Secure toggle.
- **Sync UI Dark-Theme CSS Fix (v3.32.22)**: Header sync popover, mode selector, and backup warning now render correctly across all themes — corrected misnamed CSS variables and replaced hardcoded light-color fallbacks.

## Development Roadmap

### Next Up

- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

### Near-Term

- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides

## What's New

- **Cloud Settings Redesign + Unified Encryption (v3.32.23)**: Compact ≤400px Dropbox card. Backup/Restore/Disconnect/Change Password moved to Advanced sub-modal. Simplified unified encryption replaces Simple/Secure toggle.
- **Sync UI Dark-Theme CSS Fix (v3.32.22)**: Header sync popover, mode selector, and backup warning now render correctly across all themes — corrected misnamed CSS variables and replaced hardcoded light-color fallbacks.
- **Sync UX Overhaul + Simple Mode (v3.32.21)**: No more on-load password popups — choose Simple mode (Dropbox account as key, no extra password on any device) or Secure mode (vault password, zero-knowledge). Orange dot + toast replaces auto-opening modals; inline popover handles Secure-mode unlock from the header button.
- **api2 Backup Endpoint (v3.32.20)**: Dual-endpoint fallback for all API feeds — spot, market, and goldback. Primary (api.staktrakr.com) tried first with 5-second timeout; api2.staktrakr.com serves as automatic fallback. Health modal now shows per-endpoint drift benchmarking.
- **15-Min Spot Price Endpoint (v3.32.19)**: New sub-hourly price snapshots at data/15min/YYYY/MM/DD/HHMM.json — written every 15 min by the spot poller. Frontend fetchStaktrakr15minRange() loads 24h of 15-min data tagged api-15min.

## Development Roadmap

### Next Up

- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

### Near-Term

- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides

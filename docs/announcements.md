## What's New

- **Version Drift Fix (v3.33.12)**: Version number corrected after concurrent PR merge reordering
- **Mobile Spot Entry (v3.33.10)**: Long-press on spot price card opens manual input on mobile devices, mirroring desktop Shift+click. Hint text updated for discoverability
- **Spot Card Label Fix (v3.33.11)**: Spot timestamp compares raw storage data instead of rendered HTML, correctly showing "Last API Sync" when cache is disabled
- **Market Page Redesign Phase 1 (v3.33.06)**: New default market view with full-width list cards, inline 7-day trend charts with spike detection, vendor price chips with brand colors and medal rankings, computed MED/LOW/AVG stats, search and sort, click-to-expand charts, sponsor badge
- **Oklahoma Goldback G1 (v3.33.07)**: Oklahoma Goldback G1 added to market prices page with APMEX and Hero Bullion vendor tracking. Goldback vendor branding added

## Development Roadmap

### Next Up

- **Market Page Phase 2**: Goldback item integration, inventory-to-market linking with auto-update retail prices
- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

### Near-Term

- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides

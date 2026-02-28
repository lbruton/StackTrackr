## What's New

- **Spot Card Label Fix (v3.33.11)**: Spot timestamp compares raw storage data instead of rendered HTML, correctly showing "Last API Sync" when cache is disabled
- **Spot Card Fix (v3.33.09)**: Spot price card now shows "Last API Sync" when cache is disabled, instead of misleading "Last Cache Refresh" label
- **Vendor Medal Fix (v3.33.08)**: Vendor medals now awarded to all in-stock vendors, not just high-confidence ones. APMEX correctly shows 2nd place on Oklahoma Goldback
- **Oklahoma Goldback G1 (v3.33.07)**: Oklahoma Goldback G1 added to market prices page with APMEX and Hero Bullion vendor tracking. Goldback vendor branding added
- **Market Page Redesign Phase 1 (v3.33.06)**: New default market view with full-width list cards, inline 7-day trend charts with spike detection, vendor price chips with brand colors and medal rankings, computed MED/LOW/AVG stats, search and sort, click-to-expand charts, sponsor badge. Disable with ?market_list_view=false
- **Daily Maintenance (v3.33.05)**: Search cache optimized with formatted date caching. Dead code removed (downloadStorageReport, duplicate MAX_LOCAL_FILE_SIZE export)

## Development Roadmap

### Next Up

- **Market Page Phase 2**: Goldback item integration, inventory-to-market linking with auto-update retail prices
- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

### Near-Term

- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides

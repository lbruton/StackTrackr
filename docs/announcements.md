## What's New

- **Market Page Redesign Phase 1 (v3.33.06)**: Full-width market list cards with inline 7-day trend charts, spike detection, vendor price chips with brand colors and medal rankings, computed MED/LOW/AVG stats, click-to-expand charts. Feature-flagged behind ?market_list_view=true
- **Daily Maintenance (v3.33.05)**: Search cache optimized with formatted date caching. Dead code removed (downloadStorageReport, duplicate MAX_LOCAL_FILE_SIZE export)
- **Quick-Fix Batch (v3.33.04)**: NGC cert lookup extracts numeric grade only. Fractional troy ounce weights display correctly as oz. Cloud Sync button added to reorderable header system
- **Cloud Sync Safety Overhaul (v3.33.02)**: Empty-vault push guard prevents data loss. Cloud-side backup-before-overwrite. Dropbox folder restructuring with migration. DiffEngine restore preview modal. Configurable backup history depth. Multi-tab sync guard

## Development Roadmap

### Next Up

- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

### Near-Term

- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides

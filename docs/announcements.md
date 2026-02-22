## What's New

- **Service Worker Cache Coverage (v3.32.05)**: image-processor.js, bulk-image-cache.js, and image-cache-modal.js added to sw.js CORE_ASSETS — offline image workflows no longer 404 on first offline visit
- **Async Save Reliability (v3.32.04)**: Storage calls in spot price sync, catalog manager, and inventory save now properly await saveData() — prevents silently dropped errors if localStorage throws
- **Sync Toast & UX Polish (v3.32.03)**: Spot price sync completion now shows a non-blocking toast notification instead of a blocking modal dialog
- **Appearance Settings Redesign (v3.32.02)**: Appearance tab redesigned — Color scheme and Inventory View as compact pill-button pickers; Timezone, Default Sort, and Visible Items as full-width dropdowns; thumb-friendly touch targets throughout. Restore Historical Data button added to API settings (STAK-258)
- **Dual-Poller API & Spot Pipeline Fixes (v3.32.01)**: Corrected retail endpoint paths for api1.staktrakr.com fallback. Fixed pollers cross-wired to wrong API repos. Repaired hourly spot data pipeline — backfill, dual-checkout, and endpoint migration. Added nightly sync between StakTrakrApi and StakTrakrApi1 via GitHub Actions (STAK-255)

## Development Roadmap

### Next Up

- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

### Near-Term

- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides

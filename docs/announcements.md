## What's New

- **Async Save Reliability (v3.32.04)**: Storage calls in spot price sync, catalog manager, and inventory save now properly await saveData() — prevents silently dropped errors if localStorage throws
- **Sync Toast & UX Polish (v3.32.03)**: Spot price sync completion now shows a non-blocking toast notification instead of a blocking modal dialog
- **Appearance Settings Redesign (v3.32.02)**: Appearance tab redesigned — Color scheme and Inventory View as compact pill-button pickers; Timezone, Default Sort, and Visible Items as full-width dropdowns; thumb-friendly touch targets throughout. Restore Historical Data button added to API settings (STAK-258)
- **Dual-Poller API & Spot Pipeline Fixes (v3.32.01)**: Corrected retail endpoint paths for api1.staktrakr.com fallback. Fixed pollers cross-wired to wrong API repos. Repaired hourly spot data pipeline — backfill, dual-checkout, and endpoint migration. Added nightly sync between StakTrakrApi and StakTrakrApi1 via GitHub Actions (STAK-255)
- **Market Prices Module & OOS Detection (v3.32.0)**: Live bullion retail prices from APMEX, Monument, SDB, and JM Bullion with per-coin cards, 30-day price history, and intraday 15-min data. Out-of-stock detection via AI vision and scraping consensus — OOS coins show strikethrough pricing and gaps in charts. Encrypted image vault syncs user-uploaded coin photos to cloud. Serial Number in PDF exports. Numista cache clears on N# change (STAK-181, STAK-234, STAK-244)

## Development Roadmap

### Next Up

- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

### Near-Term

- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides

## What's New

- **STACK-56: Complexity reduction (v3.24.06)**: Refactored 6 functions to reduce cyclomatic complexity — dispatch maps, extracted helpers, optionalListener utility. −301 lines from events.js
- **Code cleanup (v3.24.05)**: Fix debugLog warn level, remove dead parameter, update version comment
- **STACK-55: Bulk Editor clean selection (v3.24.04)**: Bulk Editor now resets selection on every open. Removed stale localStorage persistence
- **Fix Goldback melt/retail/weight in Details Modal (v3.24.03)**: Goldback melt values no longer inflated 1000x in breakdown modals. Applies GB_TO_OZT conversion and denomination retail pricing
- **STACK-44: Activity Log sub-tabs (v3.24.02)**: Settings Log panel reorganized with 4 sub-tabs — Changelog, Metals (spot history), Catalogs (API calls), Price History (per-item). Sortable tables, filter, and clear buttons for each
- **STACK-50: Multi-Currency Support (v3.24.00)**: 17-currency display with daily exchange rate conversion. Dynamic currency symbols across modals, Goldback settings, and exports. Dynamic Gain/Loss labels on totals cards. Sticky header fix

## Development Roadmap

- **Appearance Settings (STACK-54)**: Header quick-access toggles for currency and theme, time zone selection, show/hide layout sections
- **Chart Overhaul (STACK-48)**: Migrate to ApexCharts with time-series trend views
- **Custom CSV Mapper (STACK-51)**: Header mapping UI with saved import profiles

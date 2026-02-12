## What's New

- **STACK-54, STACK-66: Appearance settings & sparkline improvements (v3.25.00)**: Header quick-access buttons for theme and currency. Layout visibility toggles. 1-day sparkline with daily-averaged trend. Spot lookup now fills visible price field. 15/30-minute API cache options
- **STACK-56: Complexity reduction (v3.24.06)**: Refactored 6 functions to reduce cyclomatic complexity — dispatch maps, extracted helpers, optionalListener utility. −301 lines from events.js
- **STACK-55: Bulk Editor clean selection (v3.24.04)**: Bulk Editor now resets selection on every open. Removed stale localStorage persistence
- **STACK-44: Activity Log sub-tabs (v3.24.02)**: Settings Log panel reorganized with 4 sub-tabs — Changelog, Metals (spot history), Catalogs (API calls), Price History (per-item). Sortable tables, filter, and clear buttons for each
- **STACK-50: Multi-Currency Support (v3.24.00)**: 17-currency display with daily exchange rate conversion. Dynamic currency symbols across modals, Goldback settings, and exports. Dynamic Gain/Loss labels on totals cards. Sticky header fix

## Development Roadmap

- **Chart Overhaul (STACK-48)**: Migrate to ApexCharts with time-series trend views
- **Custom CSV Mapper (STACK-51)**: Header mapping UI with saved import profiles
- **Table CSS Hardening (STACK-38)**: Responsive audit and CSS cleanup

## What's New

- **Fix Goldback melt/retail/weight in Details Modal (v3.24.03)**: Goldback melt values no longer inflated 1000x in breakdown modals. Applies GB_TO_OZT conversion and denomination retail pricing
- **STACK-44: Activity Log sub-tabs (v3.24.02)**: Settings Log panel reorganized with 4 sub-tabs — Changelog, Metals (spot history), Catalogs (API calls), Price History (per-item). Sortable tables, filter, and clear buttons for each
- **Codacy code quality cleanup (v3.24.01)**: innerHTML-to-textContent fixes, PMD/ESLint/Semgrep configuration. 90 issues resolved
- **STACK-50: Multi-Currency Support (v3.24.00)**: 17-currency display with daily exchange rate conversion. Dynamic currency symbols across modals, Goldback settings, and exports. Dynamic Gain/Loss labels on totals cards. Sticky header fix
- **STACK-52: Bulk Edit pinned selections (v3.23.02)**: Selected items stay visible at top of table when search changes. Removed dormant prototype files

## Development Roadmap

- **Appearance Settings (STACK-54)**: Header quick-access toggles for currency and theme, time zone selection, show/hide layout sections
- **Chart Overhaul (STACK-48)**: Migrate to ApexCharts with time-series trend views
- **Custom CSV Mapper (STACK-51)**: Header mapping UI with saved import profiles

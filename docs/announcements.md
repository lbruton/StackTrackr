## What's New

- **Save Search as Filter Chip (v3.30.07)**: Bookmark button inside search input saves multi-term comma-separated searches as custom filter chips. Smart enable/disable logic activates only for valid multi-term queries that aren't already saved. Disabled during fuzzy search mode. Button state syncs with filter clear and remove actions (STAK-104)
- **Card View Sort Controls & UX Polish (v3.30.06)**: Card sort bar with sort dropdown, direction toggle, and A/B/C style toggle visible only in card view. Pagination hidden in card view. Default table rows changed to 12. Header button simplified to toggle card/table view. Numista name matching disabled by default (STAK-131)
- **Sort Column Index Realignment (v3.30.05)**: All table sorts after Type were off by one since v3.30.00 — the Image column was missing from the sort index map, causing every column from Name onward to sort by the wrong field. Retail and Gain/Loss sorting now also uses correct Goldback denomination pricing
- **Pagination Dropdown Fix & Settings Reorganization (v3.30.04)**: Settings "Visible rows" dropdown now includes value 6, preventing silent fallback when switching views. Default items-per-page changed from 12 to 6. Added 128 and 512 options. "Table" tab renamed to "Inventory" with card settings consolidated
- **PumpkinCrouton Patch — Purity Input & Save Fix (v3.30.03)**: Added .9995 (pure platinum) to purity dropdown. Custom purity accepts 4 decimal places. Fixed save corruption where hidden custom purity input blocked all form submissions. Duplicate items now preserve original purchase date. Thanks to u/PumpkinCrouton for the report (STAK-130)
- **Keyless Provider Fixes & Hourly History Pull (v3.30.02)**: Fixed keyless providers (STAKTRAKR) enabling sync buttons, connected status, and auto-select. STAKTRAKR usage counter with 5000 default quota. Hourly history pull for STAKTRAKR (1–30 days) and MetalPriceAPI (up to 7 days). History log distinguishes hourly entries. One-time migration for existing users

## Development Roadmap

- **Chart Overhaul (STAK-48)**: Migrate to ApexCharts with time-series trend views
- **Custom CSV Mapper (STAK-51)**: Header mapping UI with saved import profiles
- **PCGS Deep Integration (STAK-99)**: View Modal verification and price guide lookup

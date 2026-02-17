## What's New

- **Default Settings Overhaul & Seed Pattern Images (v3.30.08)**: New user defaults — dark theme, Name A-Z sort, all rows visible, Goldback pricing ON. Per-rule enable/disable toggles for built-in Numista patterns. Seed coin photos (ASE, Gold Maple) as demo custom pattern rules for first-time user coaching
- **Save Search as Filter Chip (v3.30.07)**: Bookmark button inside search input saves multi-term comma-separated searches as custom filter chips. Smart enable/disable logic activates only for valid multi-term queries that aren't already saved. Disabled during fuzzy search mode (STAK-104)
- **Card View Sort Controls & UX Polish (v3.30.06)**: Card sort bar with sort dropdown, direction toggle, and A/B/C style toggle visible only in card view. Pagination hidden in card view. Header button simplified to toggle card/table view (STAK-131)
- **Sort Column Index Realignment (v3.30.05)**: All table sorts after Type were off by one since v3.30.00 — the Image column was missing from the sort index map. Retail and Gain/Loss sorting now uses correct Goldback denomination pricing
- **Pagination Dropdown Fix & Settings Reorganization (v3.30.04)**: Settings "Visible rows" dropdown now includes value 6. Default items-per-page changed from 12 to 6. Added 128 and 512 options. "Table" tab renamed to "Inventory" with card settings consolidated

## Development Roadmap

- **Chart Overhaul (STAK-48)**: Migrate to ApexCharts with time-series trend views
- **Custom CSV Mapper (STAK-51)**: Header mapping UI with saved import profiles
- **PCGS Deep Integration (STAK-99)**: View Modal verification and price guide lookup

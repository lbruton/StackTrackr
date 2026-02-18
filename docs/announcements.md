## What's New

- **Cloud Storage Backup (v3.31.0)**: Encrypted .stvault backup to Dropbox via OAuth PKCE popup flow. Privacy policy page for provider compliance. Favicon and PWA icons updated to ST branding
- **Settings & Header Controls Overhaul (v3.30.09)**: Optional Trend and Sync buttons added to header (enable in Appearance > Header Buttons). Global spot trend/sync bar removed. Settings Appearance panel reorganized with Header Buttons grid, Layout card, and Inventory View cards. Images panel restructured with actions row, camera capture, and fieldset cards. Metal Order and Inline Chips consolidated into Chips panel
- **Default Settings Overhaul & Seed Pattern Images (v3.30.08)**: New user defaults — dark theme, Name A-Z sort, all rows visible, Goldback pricing ON. Per-rule enable/disable toggles for built-in Numista patterns. Seed coin photos (ASE, Gold Maple) as demo custom pattern rules for first-time user coaching
- **Save Search as Filter Chip (v3.30.07)**: Bookmark button inside search input saves multi-term comma-separated searches as custom filter chips. Smart enable/disable logic activates only for valid multi-term queries that aren't already saved. Disabled during fuzzy search mode (STAK-104)
- **Card View Sort Controls & UX Polish (v3.30.06)**: Card sort bar with sort dropdown, direction toggle, and A/B/C style toggle visible only in card view. Pagination hidden in card view. Header button simplified to toggle card/table view (STAK-131)
## Development Roadmap

### In Review

- **Weight Display & Bulk Edit Fixes (STAK-151, 152, 153, 155, 157)**: formatWeight() respects gram unit, bulk edit gram-to-ozt conversion, PM industry standard constant, XSS sanitization, Krugerrand purity preset

### Next Up

- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Krugerrand Melt Verification (STAK-154)**: Runtime verification of melt value formula with custom purity items

### Near-Term

- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support
- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides
- **Settings Modal Rework (STAK-145)**: Adaptive Workspace redesign (Design 3B Foundation)
- **Filter Chip Enhancements (STAK-146)**: Shift-click parity for custom/tag chips, exclusion filtering
- **Cloud Sync at Rest (STAK-149)**: Real-time encrypted inventory sync across devices
- **Inline Editing (STAK-123)**: Shift-click inline editing for View Modal inventory fields

### Planned

- **Code Deduplication (STAK-138)**: Consolidate retail price calc and image resolution cascade
- **PCGS Deep Integration (STAK-99)**: View Modal verification badge and price guide lookup
- **Custom CSV Mapper (STAK-51)**: Header mapping UI with saved import profiles
- **Numista OAuth Sync (STAK-101)**: Cloud sync for Numista user collections
- **Realized Gains/Losses (STAK-72)**: Track sold, lost, and disposed items for full portfolio accounting
- **JSDoc Portal (STAK-105)**: Full documentation coverage and generated docs site

### Future Exploration

- **Chart Overhaul (STAK-48)**: Migrate to ApexCharts with time-series trend views
- **Numismatics Expansion (STAK-76)**: Paper notes, non-melt collectibles, asset class field
- **Date Run Checklist (STAK-73)**: Collecting goals with auto-matched year sets
- **Supabase Cloud Sync (STAK-30)**: BYO-Backend with encryption at rest (STAK-36)
- **LBMA Reference Table (STAK-119)**: Historical spot price reference in Activity Log
- **View Modal Field Selection (STAK-112)**: Configurable field visibility for power users

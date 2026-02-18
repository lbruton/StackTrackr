## What's New

- **FAQ Modal & Privacy Improvements (v3.31.1)**: Interactive FAQ with 13 questions added to Settings sidebar tab, About modal, and footer. ZIP export/import exposed in Settings. Files tab merged into Inventory. privacy.html theme and back-link fixed. pCloud and Box added as coming-soon cloud providers. r/Silverbugs community credit in footer
- **Cloud Storage Backup (v3.31.0)**: Encrypted .stvault backup to Dropbox via OAuth PKCE popup flow. Privacy policy page for provider compliance. Favicon and PWA icons updated to ST branding
- **Settings & Header Controls Overhaul (v3.30.09)**: Optional Trend and Sync buttons added to header (enable in Appearance > Header Buttons). Global spot trend/sync bar removed. Settings Appearance panel reorganized with Header Buttons grid, Layout card, and Inventory View cards. Images panel restructured with actions row, camera capture, and fieldset cards. Metal Order and Inline Chips consolidated into Chips panel
- **Default Settings Overhaul & Seed Pattern Images (v3.30.08)**: New user defaults — dark theme, Name A-Z sort, all rows visible, Goldback pricing ON. Per-rule enable/disable toggles for built-in Numista patterns. Seed coin photos (ASE, Gold Maple) as demo custom pattern rules for first-time user coaching
- **Save Search as Filter Chip (v3.30.07)**: Bookmark button inside search input saves multi-term comma-separated searches as custom filter chips. Smart enable/disable logic activates only for valid multi-term queries that aren't already saved. Disabled during fuzzy search mode (STAK-104)
## Development Roadmap

### Next Up

- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

### Near-Term

- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides
- **Cloud Sync at Rest (STAK-149)**: Real-time encrypted inventory sync across devices

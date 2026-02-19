## What's New

- **Vendored Libraries & True Offline Support (v3.31.4)**: All CDN dependencies (PapaParse, jsPDF, Chart.js, JSZip, Forge) are now bundled locally in vendor/ — the app works fully offline and on file:// protocol with no internet required. CDN fallback fires automatically if a local file fails
- **Filter Chip Active-State UX (v3.31.3)**: Filter chips now hide × on idle — only active/search chips show a remove button and themed border ring. Clicking × on an active chip now correctly removes the filter. Card view pagination, mobile image tap, and bulk popover rendering polished
- **Numista Metadata Pipeline Fixes (v3.31.2)**: Tags now write eagerly on bulk sync and restore correctly after vault restore. View modal skips API when metadata is already cached. Weight pre-fills automatically from Numista search results (STAK-168)
- **FAQ Modal & Privacy Improvements (v3.31.1)**: Interactive FAQ with 13 questions added to Settings sidebar tab, About modal, and footer. ZIP export/import exposed in Settings. Files tab merged into Inventory. privacy.html theme and back-link fixed. pCloud and Box added as coming-soon cloud providers. r/Silverbugs community credit in footer
- **Cloud Storage Backup (v3.31.0)**: Encrypted .stvault backup to Dropbox via OAuth PKCE popup flow. Privacy policy page for provider compliance. Favicon and PWA icons updated to ST branding
## Development Roadmap

### Next Up

- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

### Near-Term

- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides
- **Cloud Sync at Rest (STAK-149)**: Real-time encrypted inventory sync across devices

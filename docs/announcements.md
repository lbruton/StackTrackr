## What's New

- **Market Prices Module & OOS Detection (v3.32.0)**: Live bullion retail prices from APMEX, Monument, SDB, and JM Bullion with per-coin cards, 30-day price history, and intraday 15-min data. Out-of-stock detection via AI vision and scraping consensus — OOS coins show strikethrough pricing and gaps in charts. Encrypted image vault syncs user-uploaded coin photos to cloud. Serial Number in PDF exports. Numista cache clears on N# change (STAK-181, STAK-234, STAK-244)
- **Collapsible Form Modal & Numista Data Persistence (v3.31.6)**: Add/edit form now uses collapsible sections — core fields always visible, Grading, Pricing, Numista Data, and Notes collapse with native details/summary. Per-item Numista metadata persists with layered provider priority. All native alert/confirm/prompt migrated to async appDialog wrappers. Bulk edit search expanded across metadata fields (STAK-173, STAK-175)
- **Cloud Auto-Sync & Bulk Edit Fixes (v3.31.5)**: Real-time encrypted auto-sync to Dropbox — inventory changes push automatically and other devices see an "Update Available" modal. Bulk Edit Delete/Copy/Apply now work correctly inside the modal. isCollectable field removed (superseded by tag system) (STAK-149)
- **Vendored Libraries & True Offline Support (v3.31.4)**: All CDN dependencies (PapaParse, jsPDF, Chart.js, JSZip, Forge) are now bundled locally in vendor/ — the app works fully offline and on file:// protocol with no internet required. CDN fallback fires automatically if a local file fails
- **Filter Chip Active-State UX (v3.31.3)**: Filter chips now hide × on idle — only active/search chips show a remove button and themed border ring. Clicking × on an active chip now correctly removes the filter. Card view pagination, mobile image tap, and bulk popover rendering polished
- **Numista Metadata Pipeline Fixes (v3.31.2)**: Tags now write eagerly on bulk sync and restore correctly after vault restore. View modal skips API when metadata is already cached. Weight pre-fills automatically from Numista search results (STAK-168)
## Development Roadmap

### Next Up

- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

### Near-Term

- **Custom Theme Editor (STAK-121)**: User-defined color themes with CSS variable overrides

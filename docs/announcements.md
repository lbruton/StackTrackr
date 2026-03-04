## What's New

- **Cloud Storage API Hardening (v3.33.46)**: Upload validation catches failed Dropbox/pCloud/Box uploads. Backup list fetches all pages. Disconnect removes all cloud state. Delete-latest updates remote pointer. Full vault exports exclude OAuth tokens and credentials (STAK-425).
- **FAQ Cloudflare Cookie Disclosure (v3.33.45)**: FAQ now accurately discloses that Cloudflare may set a temporary infrastructure cookie for bot protection on the hosted site. Safe to block — does not affect the app (STAK-428).
- **Data Portability Quickfixes (v3.33.44)**: Added chipMaxCount to storage allowlist, removed dead 2 MB import limit, added Storage Location and Tags to CSV/JSON exports, deferred CSV import tags until confirmation, fixed reverse-only image import from ZIP (STAK-424).
- **Cloud Sync Storage Fix (v3.33.43)**: Vault restore now compresses data before writing to localStorage, preventing storage blowout from 9 MB metalSpotHistory. Override imports cancel debounced sync push to prevent overwriting remote data. QuotaExceededError now shows a toast instead of failing silently (STAK-421).
- **Full Backup for Sync Snapshots (v3.33.42)**: Pre-sync snapshots now contain the full encrypted backup instead of partial sync-scoped data. Restore list shows all backups (manual + sync) in one sorted list. Fixes ghost items caused by restoring partial sync snapshots (STAK-419).

## Development Roadmap

### Next Up

- **Market Page Phase 3**: Inventory-to-market linking with auto-update retail prices
- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

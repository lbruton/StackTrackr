## What's New

- **Data Portability Quickfixes (v3.33.44)**: Added chipMaxCount to storage allowlist, removed dead 2 MB import limit, added Storage Location and Tags to CSV/JSON exports, deferred CSV import tags until confirmation, fixed reverse-only image import from ZIP (STAK-424).
- **Cloud Sync Storage Fix (v3.33.43)**: Vault restore now compresses data before writing to localStorage, preventing storage blowout from 9 MB metalSpotHistory. Override imports cancel debounced sync push to prevent overwriting remote data. QuotaExceededError now shows a toast instead of failing silently (STAK-421).
- **Full Backup for Sync Snapshots (v3.33.42)**: Pre-sync snapshots now contain the full encrypted backup instead of partial sync-scoped data. Restore list shows all backups (manual + sync) in one sorted list. Fixes ghost items caused by restoring partial sync snapshots (STAK-419).
- **Cloud Backup/Restore Fix (v3.33.41)**: Manual backups and sync snapshots now separated — auto-prune only deletes sync snapshots, restore list shows manual backups by default, Backup button always prompts for password. Prevents accidental deletion of user manual backups (STAK-419).
- **Simplify Market Price Display (v3.33.40)**: Removed confidence score badges and out-of-stock styling from market vendor chips. Vendors with valid prices display equally. Anomalous prices silently filtered via 40% median deviation threshold. Monument Metals false OOS fixed (STAK-404).

## Development Roadmap

### Next Up

- **Market Page Phase 3**: Inventory-to-market linking with auto-update retail prices
- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

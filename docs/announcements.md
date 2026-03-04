## What's New

- **Sync Scope & Serialization (v3.33.47)**: Cloud sync now syncs 44 keys across devices (up from 8) — all preferences, header buttons, feature toggles, and API credentials. Manifest-first pulls now compare and apply settings changes. Photos sync on all pull paths. Deleting all photos propagates deletion to remote (STAK-426).
- **Cloud Storage API Hardening (v3.33.46)**: Upload validation catches failed Dropbox/pCloud/Box uploads. Backup list fetches all pages. Disconnect removes all cloud state. Delete-latest updates remote pointer. Full vault exports exclude OAuth tokens and credentials (STAK-425).
- **FAQ Cloudflare Cookie Disclosure (v3.33.45)**: FAQ now accurately discloses that Cloudflare may set a temporary infrastructure cookie for bot protection on the hosted site. Safe to block — does not affect the app (STAK-428).
- **Data Portability Quickfixes (v3.33.44)**: Added chipMaxCount to storage allowlist, removed dead 2 MB import limit, added Storage Location and Tags to CSV/JSON exports, deferred CSV import tags until confirmation, fixed reverse-only image import from ZIP (STAK-424).
- **Cloud Sync Storage Fix (v3.33.43)**: Vault restore now compresses data before writing to localStorage, preventing storage blowout from 9 MB metalSpotHistory. Override imports cancel debounced sync push to prevent overwriting remote data. QuotaExceededError now shows a toast instead of failing silently (STAK-421).

## Development Roadmap

### Next Up

- **Market Page Phase 3**: Inventory-to-market linking with auto-update retail prices
- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

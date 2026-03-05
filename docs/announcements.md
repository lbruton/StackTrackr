## What's New

- **Pre-ship Security Hardening (v3.33.51)**: XSS fix in settings pattern rules. OAuth CSRF protection on relay path. Sync flag leak fix. Console output sanitized to remove cryptographic metadata. Dead sync modal code removed (~206 lines). All confirmations use appConfirm (STAK-430).
- **Spot Health Dot UX, 7-Day Trend, Timezone Formatting (v3.33.50)**: Spot dot shows orange (syncing) instead of red on fresh installs. Dot respects cache TTL for green status. 7-day trend sorts by date for correct direction. Sync log timestamps respect timezone preference (STAK-429, STAK-408, STAK-384, STAK-399, STAK-281).
- **Import/Restore Completeness & Cloud Backup Photos (v3.33.49)**: Manual cloud backup now has an optional "Include photos" checkbox. ZIP and vault restore blocked during active sync. Wiki updated with snapshot terminology and restore warnings (STAK-427).
- **DiffModal Settings Fix & Empty-Diff Silent Pull (v3.33.48)**: DiffModal Apply button now correctly detects pending settings changes. Settings are included in selectedChanges instead of being silently dropped. Manifest-first pull returns silently when no changes detected (STAK-387, STAK-401, STAK-415, STAK-417).
- **Sync Scope & Serialization (v3.33.47)**: Cloud sync now syncs 44 keys across devices (up from 8) — all preferences, header buttons, feature toggles, and API credentials. Manifest-first pulls now compare and apply settings changes. Photos sync on all pull paths. Deleting all photos propagates deletion to remote (STAK-426).

## Development Roadmap

### Next Up

- **Market Page Phase 3**: Inventory-to-market linking with auto-update retail prices
- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

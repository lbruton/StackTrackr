## What's New

- **Dateless Items Sort as Oldest (v3.33.54)**: Items with no purchase date now sort as "infinitely old" — top when oldest-first, bottom when newest-first (STAK-448).
- **Numista N# Search Image URL + Metal Auto-Population (v3.33.53)**: Numista N# search now auto-populates obverse/reverse image URLs and metal type into inventory items. Field picker shows new checkboxes for images and metal with opt-out control (STAK-431).
- **Market Controls Mobile Fix + Metal Filter Buttons (v3.33.52)**: Fixed mobile search bar crushed to 2 chars and controls overflow. Fixed Expand/Collapse text flip on search. Added metal filter pill buttons (All/Silver/Gold/Goldback/Platinum/Palladium) with color-coded active states (STAK-433, STAK-434).
- **Pre-ship Security Hardening (v3.33.51)**: XSS fix in settings pattern rules. OAuth CSRF protection on relay path. Sync flag leak fix. Console output sanitized to remove cryptographic metadata. Dead sync modal code removed (~206 lines). All confirmations use appConfirm (STAK-430).
- **Spot Health Dot UX, 7-Day Trend, Timezone Formatting (v3.33.50)**: Spot dot shows orange (syncing) instead of red on fresh installs. Dot respects cache TTL for green status. 7-day trend sorts by date for correct direction. Sync log timestamps respect timezone preference (STAK-429, STAK-408, STAK-384, STAK-399, STAK-281).
- **Import/Restore Completeness & Cloud Backup Photos (v3.33.49)**: Manual cloud backup now has an optional "Include photos" checkbox. ZIP and vault restore blocked during active sync. Wiki updated with snapshot terminology and restore warnings (STAK-427).
- **DiffModal Settings Fix & Empty-Diff Silent Pull (v3.33.48)**: DiffModal Apply button now correctly detects pending settings changes. Settings included in selectedChanges. Manifest-first pull returns silently when no changes detected (STAK-387, STAK-401, STAK-415, STAK-417).

## Development Roadmap

### Next Up

- **Market Page Phase 3**: Inventory-to-market linking with auto-update retail prices
- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

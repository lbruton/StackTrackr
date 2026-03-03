## What's New

- **Sync Pull Race Fix (v3.33.34)**: Cloud sync no longer overwrites Dropbox with stale local data while the diff preview modal is open — the pull now fully blocks concurrent pushes until the user clicks Apply and the vault restore completes (STAK-406).
- **Cloud Button Always Visible (v3.33.33)**: Cloud header button and Settings Cloud tab are now always shown — removed hide-when-disconnected logic that blocked access to cloud setup for new users (STAK-405).
- **Keep Mine Conflict Fix (v3.33.32)**: Pressing Keep Mine or Push My Data now completes the push — a one-shot override flag prevents the pre-push check from re-detecting the resolved conflict and looping (STAK-403).
- **Sync Diff Preview Fix (v3.33.31)**: Pull preview now shows real item differences instead of "No changes detected" when seeded/imported items have no changeLog history. Empty-diff Accept correctly does a full restore (STAK-402).
- **Bi-Directional Sync Fix (v3.33.30)**: Pre-push remote check prevents blind overwrite when another device has pushed. Sync Now polls before pushing. Settings hash and diff preview use synchronous storage reads. 5 bugs fixed (STAK-398).

## Development Roadmap

### Next Up

- **Market Page Phase 3**: Inventory-to-market linking with auto-update retail prices
- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

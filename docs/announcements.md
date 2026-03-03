## What's New

- **Sync Poll + Apply Fixes (v3.33.38)**: Sync poll now detects when local inventory is newer than remote and pushes instead of pulling — prevents newly added items from appearing as deletions. DiffModal Apply button stays enabled for settings-only apply when all item checkboxes are unchecked (STAK-414, STAK-415).
- **Sync Dialog Cleanup (v3.33.37)**: Removed the redundant "Sync Update Available" dialog — remote changes now go directly to the Review Sync Changes DiffModal for both conflict and non-conflict paths (STAK-413).
- **Sync Pull Root Cause Fix (v3.33.36)**: Vault-first pull now correctly extracts inventory from the encrypted payload — was treating the localStorage dict as an array, showing zero additions. Removed redundant Sync Conflict dialog; remote changes go directly to Review Sync Changes DiffModal. Manifest count check expanded to catch incomplete diffs (STAK-412).
- **Sync Apply & Dialog Fixes (v3.33.35)**: DiffModal Apply no longer empties the vault when remote-only additions are missed by the manifest diff — falls back to full overwrite. Empty-vault guard dialog OK button now correctly triggers a pull. Double conflict modal prevented (STAK-409, STAK-410, STAK-411).
- **Sync Pull Race Fix (v3.33.34)**: Cloud sync no longer overwrites Dropbox with stale local data while the diff preview modal is open — the pull now fully blocks concurrent pushes until the user clicks Apply and the vault restore completes (STAK-406).

## Development Roadmap

### Next Up

- **Market Page Phase 3**: Inventory-to-market linking with auto-update retail prices
- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

## What's New

- **Summary Bar Items + Weight (v3.33.39)**: Item count and total weight now display in the portfolio summary bar alongside Buy/Melt/Market/G/L — shows filtered/total format when filters active, total weight in troy ounces. Bottom footer item count removed (STAK-418).
- **Sync Poll, Settings Sync, DiffModal Fixes (v3.33.38)**: Sync poll detects local-newer inventory and pushes instead of pulling. Settings changes (theme, etc.) now sync between devices — poll compares both inventory and settings hashes. "No changes detected" popup eliminated. DiffModal Apply stays enabled for settings-only apply (STAK-414, STAK-415, STAK-416, STAK-417).
- **Sync Dialog Cleanup (v3.33.37)**: Removed the redundant "Sync Update Available" dialog — remote changes now go directly to the Review Sync Changes DiffModal for both conflict and non-conflict paths (STAK-413).
- **Sync Pull Root Cause Fix (v3.33.36)**: Vault-first pull now correctly extracts inventory from the encrypted payload — was treating the localStorage dict as an array, showing zero additions. Removed redundant Sync Conflict dialog; remote changes go directly to Review Sync Changes DiffModal. Manifest count check expanded to catch incomplete diffs (STAK-412).
- **Sync Apply & Dialog Fixes (v3.33.35)**: DiffModal Apply no longer empties the vault when remote-only additions are missed by the manifest diff — falls back to full overwrite. Empty-vault guard dialog OK button now correctly triggers a pull. Double conflict modal prevented (STAK-409, STAK-410, STAK-411).

## Development Roadmap

### Next Up

- **Market Page Phase 3**: Inventory-to-market linking with auto-update retail prices
- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

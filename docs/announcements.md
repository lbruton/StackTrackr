## What's New

- **Bi-Directional Sync Fix (v3.33.30)**: Pre-push remote check prevents blind overwrite when another device has pushed. Sync Now polls before pushing. Settings hash and diff preview use synchronous storage reads. 5 bugs fixed (STAK-398).
- **Cloud Backup/Restore Pipeline Fix (v3.33.29)**: Fixed backup path functions, async/sync bugs in settings and migration checks, encrypted sync metadata with AES-256-GCM, restructured cloud card UI with backup count badge (STAK-398, STAK-382).
- **Documentation Accuracy Cleanup (v3.33.27)**: Full audit fix — script counts, test section names, skill references, wiki page counts, and stale file removal. 24 issues resolved across instruction files, skills, and wiki (STAK-397).
- **Browserbase Test Runbook v2 (v3.33.25)**: Modular E2E test runbook with 75+ tests across 8 section files. `/bb-test` skill now reads runbook Markdown at runtime with section and tag filtering (STAK-396).

## Development Roadmap

### Next Up

- **Market Page Phase 3**: Inventory-to-market linking with auto-update retail prices
- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

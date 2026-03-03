## What's New

- **Documentation Accuracy Cleanup (v3.33.27)**: Full audit fix — script counts, test section names, skill references, wiki page counts, and stale file removal. 24 issues resolved across instruction files, skills, and wiki (STAK-397).
- **Browserbase Test Runbook v2 (v3.33.25)**: Modular E2E test runbook with 75+ tests across 8 section files. `/bb-test` skill now reads runbook Markdown at runtime with section and tag filtering. Manual execution via Chrome DevTools or Claude browser extension documented as $0 alternative (STAK-396).
- **Backup Integrity Audit (v3.33.24)**: exportOrigin metadata added to all export formats. Pre-import validation, DiffModal count header with Select All, and post-import summary banner. Fixes CSV round-trip breakage from comment header, const reassignment crash, and import target detection bug (STAK-374).
- **Chip Max Count Setting (v3.33.23)**: New `chipMaxCount` setting caps the filter chip bar to prevent overflow. Search chips always render regardless of cap. Configure in Settings.
- **Storage Error Modal Suppressed for Intraday Cache (v3.33.22)**: saveRetailIntradayData() failures now log a console warning instead of showing a user-visible Storage Error modal — transient 24h sparkline cache is non-critical

## Development Roadmap

### Next Up

- **Market Page Phase 3**: Inventory-to-market linking with auto-update retail prices
- **Cloud Backup Conflict Detection (STAK-150)**: Smarter conflict resolution using item count direction, not just timestamps
- **Accessible Table Mode (STAK-144)**: Style D with horizontal scroll, long-press to edit, 300% zoom support

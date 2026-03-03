# Changelog

All notable changes to StakTrakr will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [3.33.39] - 2026-03-03

### Changed — Summary Bar Items + Weight (STAK-418)

- **Changed**: Item count and total weight now display in the portfolio summary bar (ITEMS/WEIGHT alongside Buy/Melt/Market/G/L) instead of a separate bottom footer — shows filtered/total format when filters active (e.g., 172/189), total weight in troy ounces for currently visible items (STAK-418)

---

## [3.33.38] - 2026-03-03

### Fixed — Sync Poll, Settings Sync, DiffModal (STAK-414, STAK-415, STAK-416, STAK-417)

- **Fixed**: Sync poll no longer triggers a pull when local inventory is newer than the remote vault — now compares `lastLocalModified` timestamp (set on every inventory save) against `remoteMeta.timestamp` and triggers a push instead, preventing the user's newly added items from appearing as deletions in the DiffModal (STAK-414)
- **Fixed**: DiffModal Apply button stays enabled when settings changes are pending even if all item checkboxes are unchecked — previously the button disabled with zero item selections, blocking settings-only apply (STAK-415)
- **Fixed**: Sync poll now compares both `inventoryHash` AND `settingsHash` — previously only checked inventory, causing settings-only changes (theme, chip config, etc.) to be silently swallowed on the receiving device (STAK-416)
- **Fixed**: "No changes detected" DiffModal no longer pops up when both inventories and settings are already in sync — empty diffs are now silently recorded without user interaction (STAK-417)

---

## [3.33.37] - 2026-03-03

### Changed — Remove Redundant Sync Update Dialog (STAK-413)

- **Changed**: Removed the "Sync Update Available" intermediate dialog (Accept Update / Push My Data / Not Now) — remote changes now go directly to the Review Sync Changes DiffModal for both conflict and non-conflict paths, completing the UX simplification started in STAK-412

---

## [3.33.36] - 2026-03-03

### Fixed — Cloud Sync Pull Root Cause + UX Cleanup (STAK-412)

- **Fixed**: Vault-first pull path now correctly extracts inventory from `remotePayload.data.metalInventory` (compressed dict of localStorage keys) instead of treating the payload dict as an inventory array — this was the root cause of DiffModal showing only deletions and zero additions, leading to empty inventory on Apply (STAK-412)
- **Fixed**: Remote settings extraction in vault-first path now reads sync-scoped keys from `remotePayload.data` (excluding metalInventory) instead of the empty `remotePayload.settings` field
- **Changed**: Removed redundant Sync Conflict dialog (Keep Mine / Keep Theirs / Skip) — remote changes now go directly to the Review Sync Changes DiffModal which shows the full item-level diff
- **Fixed**: Manifest-first count check now verifies `local + added - deleted == remote` instead of only checking for zero changes — catches incomplete diffs where the manifest changelog misses remote-only additions

---

## [3.33.35] - 2026-03-03

### Fixed — Sync DiffModal Apply Data Loss + Empty-Vault Dialog (STAK-409, STAK-410, STAK-411)

- **Fixed**: DiffModal Apply no longer empties the vault when the manifest-first diff shows only deletions — `_deferredVaultRestore` now falls back to full overwrite when selective apply would produce an empty result but the remote has items, preventing silent data loss when remote-only additions are missed by the local manifest (STAK-409)
- **Fixed**: Empty-vault push guard dialog now correctly calls `pullWithPreview()` on OK — the `showAppConfirm` call was using an old callback-style API, passing the callback as the `title` argument, causing the dialog heading to display `function () { pullWithPreview(); }` and OK to do nothing (STAK-410)
- **Fixed**: Double conflict modal prevented — pre-push check now sets `_syncRemoteChangeActive = true` before `await handleRemoteChange()` so a concurrent auto-poll that fires between the routing decision and the flag being set inside `handleRemoteChange` sees the flag and skips its own modal (STAK-411)

---

## [3.33.34] - 2026-03-03

### Fixed — Cloud Sync Push Race with DiffModal (STAK-406)

- **Fixed**: `pullWithPreview()` now awaits the user's DiffModal decision (Apply or Cancel) before returning — previously it returned immediately after showing the modal, clearing `_syncRemoteChangeActive` while the user was still reading the diff, allowing a concurrent `pushSyncVault()` call to overwrite Dropbox with stale local data before the pull was applied
- **Fixed**: `showRestorePreviewModal()` (vault-first path) now returns a Promise that resolves after the user completes the modal, so the vault-first pull is also fully awaited
- **Fixed**: `_deferredVaultRestore()` is now awaited in the manifest-first `onApply` callback before the modal Promise resolves, ensuring the full vault download and apply completes before any push can proceed

---

## [3.33.33] - 2026-03-03

### Fixed — Cloud Button and Settings Tab Always Visible (STAK-405)

- **Fixed**: Cloud header button is now always visible — removed the `!connected` early-return that hid the button when no OAuth token was stored, blocking access to cloud setup
- **Fixed**: Cloud tab in Settings is now always visible — removed the STAK-317 hide block that suppressed the nav item when no provider was connected; the gray dot state communicates "not connected" without hiding the UI entry point

---

## [3.33.32] - 2026-03-03

### Fixed — Keep Mine Conflict Resolution Infinite Loop (STAK-403)

- **Fixed**: `keepMineBtn.onclick` and "Push My Data" paths now set a one-shot `_syncConflictUserOverride` flag before calling `pushSyncVault()` — the pre-push Layer 0 check bypasses conflict re-detection exactly once, allowing the push to complete instead of looping back to `handleRemoteChange()`
- **Fixed**: `appConfirm` fallback conflict path also sets the override flag, covering the modal-less conflict resolution case

---

## [3.33.31] - 2026-03-03

### Fixed — Manifest-First Pull Shows Real Diff (STAK-402)

- **Fixed**: `pullWithPreview` manifest-first path now falls through to vault-first when manifest reports zero changes but remote item count differs from local — seeded/imported items have no changeLog entries, so the manifest was always empty for first-time sync
- **Fixed**: `DiffModal._onApply` passes `null` (not `[]`) when no diff items were shown, signaling callers to do a full restore rather than apply zero changes

---

## [3.33.30] - 2026-03-03

### Fixed — Bi-Directional Sync Fix (STAK-398)

- **Fixed**: Pre-push remote check — `pushSyncVault()` now checks remote metadata before pushing; if another device pushed since last pull, routes to `handleRemoteChange()` instead of silently overwriting
- **Fixed**: "Sync Now" button calls `syncNow()` (poll-then-push) instead of blind `pushSyncVault()`
- **Fixed**: `enableCloudSync()` polls for existing remote data before initial push, preventing second browser from overwriting first browser's data
- **Fixed**: `computeSettingsHash()` was using async `loadData()` without await — settings hash compared Promise objects instead of strings (now uses `loadDataSync`)
- **Fixed**: `pullWithPreview` vault-first path was using async `loadData()` without await for local settings comparison (now uses `loadDataSync`)

---

## [3.33.29] - 2026-03-03

### Fixed — Cloud Backup/Restore Pipeline Fix (STAK-398, STAK-382)

- **Fixed**: All 4 backup path functions now target `/StakTrakr/backups/` subfolder instead of root (STAK-398)
- **Fixed**: Backup history dropdown async/sync mismatch — was showing `[object Promise]` instead of saved value
- **Fixed**: Prune depth read async/sync mismatch — was getting `NaN` from Promise
- **Fixed**: Migration check async/sync mismatch — `loadData` → `loadDataSync` for `cloud_sync_migrated` flag
- **Fixed**: Conflict check reads `latest.json` from `/backups/` with legacy root fallback
- **Security**: Sync metadata file encrypted with AES-256-GCM, backward-compatible plaintext fallback (STAK-382)
- **Changed**: Cloud card restructured — auto-sync first, manual backup section with count badge, View Sync Log on main card
- **Changed**: Export button descriptions converted to native `title` tooltips
- **Changed**: `CLOUD_LATEST_FILENAME` promoted to `constants.js` global

---

## [3.33.27] - 2026-03-03

### Fixed — Documentation & Instruction Accuracy Cleanup (STAK-397)

- **Fixed**: Script count corrected from 67/57 to 70 across all instruction files (CLAUDE.md, AGENTS.md, GEMINI.md, copilot-instructions.md)
- **Fixed**: Test runbook section names corrected in instruction files (03-backup-restore, 05-market, 08-spot-prices)
- **Fixed**: safeGetElement location corrected in GEMINI.md (js/init.js, not js/utils.js)
- **Fixed**: Stale StakTrakrWiki references replaced with in-repo wiki/ in 3 skill files
- **Fixed**: smoke-test spec inventory rebuilt — 123 tests across 19 spec files (was 27 across 8)
- **Fixed**: CORE_ASSETS count corrected in wiki/frontend-overview.md (57 to 76)
- **Fixed**: Skills list in CLAUDE.md updated to 25 entries (added sync-poller, wiki-nightwatch)
- **Removed**: 6 stale devops files (design-explorer.html, design-preview.html, firebase-debug.log, claude-backup/, screenshots/, test-results/)

---

## [3.33.25] - 2026-03-02

### Added — Browserbase Test Runbook v2 (STAK-396)

- **Added**: Modular test runbook at `tests/runbook/` — 75+ tests across 8 section files (01-page-load, 02-crud, 03-backup-restore, 04-import-export, 05-market, 06-ui-ux, 07-activity-log, 08-spot-prices)
- **Changed**: `/bb-test` skill rewritten as a runtime runbook reader — parses `tests/runbook/*.md` at run time, supports `sections=`, `tags=`, and `dry-run` filter flags, auto-discovers PR preview URL from `gh pr checks`
- **Changed**: `browserbase-test-maintenance` skill updated to point agents to `tests/runbook/*.md` instead of legacy TypeScript files
- **Added**: Manual execution guide — Chrome DevTools and Claude browser extension as $0 alternatives for 1-3 test verification (STAK-396)

---

## [3.33.24] - 2026-03-02

### Added — Backup Integrity Audit (STAK-374)

- **Added**: `exportOrigin` metadata to all export formats (CSV, JSON, vault) identifying the source app and version
- **Added**: Cross-domain import warning when importing data from a different StakTrakr instance
- **Added**: Pre-validation step in `importJson` and `importCsv` — checks structure before applying changes
- **Added**: DiffModal count header showing added/modified/deleted item counts with Select All toggle
- **Added**: Post-import summary banner showing import results (added, updated, skipped)
- **Fixed**: CSV import with `# exportOrigin:` comment header now uses PapaParse `comments: '#'` option to skip the comment line correctly
- **Fixed**: `const imported = []` reassignment crash in `importCsv` and `importJson` — changed to `let`
- **Fixed**: `showImportSummaryBanner` target element detection — switched from `safeGetElement` (truthy dummy) to `document.getElementById` for correct `||` fallback chain
- **Fixed**: `_toggleSelectAll` now explicitly deselects deleted items when entering added+modified-only mode

---

## [3.33.23] - 2026-03-02

### Added — Chip Max Count Setting (STAK-169)

- **Added**: `chipMaxCount` setting to cap the number of filter chips displayed in the chip bar — prevents overflow on small screens
- **Added**: `settingsChipMaxCount` selector in Settings panel to configure the cap (0 = unlimited)
- **Fixed**: Search-term chips excluded from the cap so they always render regardless of the limit

---

## [3.33.22] - 2026-03-02

### Fixed — Suppress Storage Error Modal for Intraday Cache (STAK-383)

- **Fixed**: `saveRetailIntradayData()` catch block now uses `debugLog` warn instead of `_handleSaveError`, suppressing user-visible Storage Error modal for non-critical 24h sparkline cache save failures (STAK-383)

---

## [3.33.21] - 2026-03-02

### Fixed — Disposed Items: Restore and View (STAK-388)

- **Fixed**: Three-state disposed filter replaces checkbox — Hide (default), Show All, Disposed Only with persistent selection and active-filter chip (STAK-388)
- **Fixed**: Changelog undo now correctly reverses disposition — previously set spurious `item['Disposed']` property instead of clearing `item.disposition` (STAK-388)
- **Fixed**: "Restore to Inventory" button added to view modal footer for disposed items (STAK-388)

---

## [3.33.20] - 2026-03-02

### Fixed — Market Panel Bug Fixes (STAK-389)

- **Fixed**: API-driven item names — all rendering paths now use `getRetailCoinMeta()` with manifest as source of truth, fallback parser corrected to denomination-first format (STAK-389)
- **Fixed**: Grid/list view sync status shows "just now" after sync, time-ago when lingering, "Sync error — prices may be stale" on API failure (STAK-389)
- **Fixed**: Activity log dropdown dynamically populated from API manifest instead of hardcoded HTML (STAK-389)

---

## [3.33.19] - 2026-03-01

### Added — DiffMerge Integration: Selective Apply for Cloud Sync and Vault Restore (STAK-190)

- **Added**: `_applyAndFinalize()` shared post-apply helper consolidating backup, inventory assignment, settings apply, save/render, pull metadata, toast summary, status indicator, and tab broadcast
- **Changed**: Cloud sync vault-first pull uses DiffModal for selective apply instead of full overwrite via `restoreVaultData()`
- **Changed**: Cloud sync manifest-first pull passes user selections through `_deferredVaultRestore()` for selective apply after vault download
- **Changed**: Encrypted vault restore (.stvault) shows DiffModal preview with item and settings diffs — users choose which changes to accept
- **Added**: E2E Playwright tests for selective apply paths covering CSV import deselection, vault restore preview, and DiffModal callback structure

---

## [3.33.18] - 2026-03-01

### Added — Diff/Merge Architecture Foundation (STAK-184)

- **Added**: `SYNC_MANIFEST_PATH` and `SYNC_MANIFEST_PATH_LEGACY` constants for encrypted change manifest storage
- **Added**: `manifestPruningThreshold` storage key for configurable manifest entry retention
- **Added**: `diffReviewModal` HTML scaffold — reusable change-review modal for sync, CSV import, and JSON import
- **Added**: `diff-modal.js` script load order and service worker cache registration

---

## [3.33.17] - 2026-02-28

### Added — Realized Gains/Losses — Item Disposition (STAK-72)

- **Added**: Disposition workflow — mark items as Sold, Traded, Lost, Gifted, or Returned via glassmorphic modal
- **Added**: Realized gain/loss calculation based on disposition amount vs purchase cost
- **Added**: Disposition badge on table rows and card views with type-specific color coding
- **Added**: Disposed items shown with reduced opacity and strikethrough styling
- **Added**: Show/Hide Disposed toggle in filter controls (hidden by default)
- **Added**: Disposition details section in View Item modal with full transaction history
- **Added**: Undo Disposition action to restore items to active inventory
- **Added**: Portfolio summary cards show disposed item count and realized gain/loss per metal
- **Added**: CSV export includes Disposition Type, Disposition Date, Disposition Amount, and Realized G/L columns

---

## [3.33.16] - 2026-02-28

### Added — Clone Mode Redesign + Edit Modal UX (STAK-375)

- **Changed**: Clone button now activates clone mode on the edit modal with field-level checkboxes instead of opening a separate modal
- **Changed**: Edit modal sections are now always visible (non-collapsible) for easier scrolling
- **Changed**: Purchase Date N/A is now a toggle button matching the spot lookup button style
- **Removed**: Numista image refresh button (unused, cluttered UI)
- **Added**: Save & Clone Another button for creating multiple clones in one session

---

## [3.33.15] - 2026-02-28

### Added — Beta Domain Toast (STAK-376)

- **Added**: Environment badge (BETA / PREVIEW / LOCAL) next to app logo on non-production domains
- **Added**: One-time session toast explaining data isolation between origins (e.g. beta vs production)
- **Added**: Domain detection for `beta.staktrakr.com`, `*.pages.dev`, `localhost`, and `file://` protocol

---

## [3.33.14] - 2026-02-28

### Fixed — Goldback G½ Slug Resolution (STAK-373)

- **Fixed**: Goldback G½ slugs (`ghalf`) now resolved correctly on market page — regex and weight map accept both `ghalf` and `g0.5` formats (STAK-373)

---

## [3.33.13] - 2026-02-28

### Added — Market Page Phase 2: Manifest-Driven Coins & Goldback Vendor (STAK-371)

- **Added**: Manifest-driven coin discovery — API can add new coins without frontend code changes (STAK-371)
- **Added**: 3-tier metadata resolution chain: manifest → hardcoded → goldback slug parser → default
- **Added**: Goldback vendor chip on market cards showing goldback.com reference price with staleness indicator
- **Added**: `GOLDBACK_WEIGHTS` table and `_parseGoldbackSlug()` for auto-deriving metadata from any goldback slug
- **Added**: `getActiveRetailSlugs()`, `getRetailCoinMeta()`, `getVendorDisplay()` resolver functions
- **Changed**: All rendering functions use resolver layer instead of direct constant lookups

---

## [3.33.12] - 2026-02-28

### Fixed — Version Drift Correction

- **Fixed**: Version number corrected to v3.33.12 — PR #591 (v3.33.11) merged before PR #590 (v3.33.10), reverting the version number

---

## [3.33.10] - 2026-02-28

### Added — Mobile Long-Press Spot Price Entry (STAK-285)

- **Added**: Long-press (600ms) on spot price card opens inline manual input on mobile/touch devices, mirroring desktop Shift+click behavior (STAK-285)
- **Changed**: Hint text updated from "Shift+click" to "Shift+click or long-press" for discoverability

---

## [3.33.11] - 2026-02-28

### Fixed — Spot Price Card Label Root Cause (STAK-274)

- **Fixed**: Spot timestamp label now compares raw storage data (provider+timestamp) instead of rendered HTML to detect when cache and API are identical, correctly showing "Last API Sync" when cache is disabled

---

## [3.33.09] - 2026-02-28

### Fixed — Spot Price Card Cache Label (STAK-274)

- **Fixed**: Spot price card shows "Last API Sync" directly when cache is disabled (duration=0) or when cache and API timestamps are identical, instead of misleading "Last Cache Refresh" label

---

## [3.33.08] - 2026-02-28

### Fixed — Vendor Medal Ranking

- **Fixed**: Vendor medals now awarded to all in-stock vendors with a price, not just those with confidence >= 60 (STAK-370)

---

## [3.33.07] - 2026-02-28

### Added — Oklahoma Goldback G1 on Market Page

- **Added**: Oklahoma Goldback G1 (`goldback-oklahoma-g1`) on market prices page with APMEX and Hero Bullion vendor tracking (STAK-370)
- **Added**: Goldback vendor display name, brand color, and homepage URL in retail vendor config (STAK-370)

---

## [3.33.06] - 2026-02-27

### Added — Market Page Redesign Phase 1

- **Added**: Market list view with full-width card layout — CSS Grid responsive at desktop/tablet/mobile breakpoints, metal accent border, image placeholders (STAK-369)
- **Added**: Inline 7-day trend charts per card with Chart.js — spike detection (two-pass temporal + cross-vendor median), dashed interpolation for gaps, OOS carry-forward pricing (STAK-369)
- **Added**: Vendor price chips with color-coded brand labels, medal rankings for best prices, OOS strikethrough styling (STAK-369)
- **Added**: Computed MED/LOW/AVG stats row with live vendor + history fallback (STAK-369)
- **Added**: Card click-to-expand chart interaction, functional search filtering, sort by name/metal/price/trend (STAK-369)
- **Added**: Enabled by default — disable with `?market_list_view=false` URL parameter (STAK-369)
- **Added**: Sponsor badge with GitHub Sponsors link in market footer (STAK-369)
- **Fixed**: Reverse tabnabbing protection on vendor links — `popup.opener = null` + `noopener,noreferrer` (STAK-369)
- **Fixed**: Chart.js canvas color rendering — hex value instead of CSS `var()` (STAK-369)
- **Fixed**: Chart.js `maxTicksLimit` option (was silently ignored `maxTicksToShow`) (STAK-369)
- **Fixed**: Accessibility — `aria-label` on market search input (STAK-369)
- **Fixed**: Mobile breakpoint — stats column spans full width at 767px (STAK-369)

---

## [3.33.05] - 2026-02-27

### Fixed — Daily Maintenance: Search Cache, Dead Code Cleanup

- **Fixed**: Search cache upgraded from string to object — caches formatted date to avoid re-parsing on every keystroke. Formatted date now included in multi-word search text (STAK-368)
- **Removed**: Dead `downloadStorageReport()` function (62 lines, zero callers) from utils.js (STAK-368)
- **Removed**: Duplicate `window.MAX_LOCAL_FILE_SIZE` export from utils.js — already exported from constants.js (STAK-368)

---

## [3.33.04] - 2026-02-27

### Fixed — Quick-Fix Batch (NGC Lookup, Fractional Oz, Cloud Sync Reorder)

- **Fixed**: NGC cert lookup link now extracts numeric grade only — e.g. "65" instead of "MS 65 CAM" (STAK-357)
- **Fixed**: Fractional troy ounce weights display as "0.25 oz" instead of auto-converting to grams (STAK-361)
- **Added**: Cloud Sync button registered in reorderable header system — toggle and reorder via Settings (STAK-365)

---

## [3.33.03] - 2026-02-27

### Fixed — Announcements Cleanup

- **Fixed**: Removed stale v3.32.44/v3.32.45 entries from What's New — these were pre-release patches already rolled into v3.33.00
- **Fixed**: Removed completed "Numista Field Origin Tracking" from roadmap — shipped in v3.33.01
- **Fixed**: Restored "Cloud Backup Conflict Detection (STAK-150)" to roadmap as next priority

---

## [3.33.02] - 2026-02-27

### Added — Cloud Sync Safety Overhaul

- **Added**: Empty-vault push guard — blocks syncing 0-item vault over populated cloud data, offers pull instead (STAK-295)
- **Added**: Cloud-side backup-before-overwrite — copies existing vault to /backups/ before every sync push
- **Added**: Dropbox folder restructuring — /sync/ and /backups/ subfolders with automatic migration from flat layout
- **Added**: Enhanced manifest schema v2 — inventory hash, metals summary, vault size for efficient change detection
- **Added**: DiffEngine restore preview modal — full field-level diff before applying remote sync updates (STAK-190)
- **Added**: Configurable backup history depth — Settings dropdown (3/5/10/20, default 5) with auto-prune
- **Added**: Multi-tab sync guard — BroadcastChannel leader election prevents concurrent sync from multiple tabs (STAK-360)

---

## [3.33.01] - 2026-02-27

### Added — Numista Search Overhaul

- **Added**: Per-field origin tracking (fieldMeta) — tracks whether each field came from Numista, PCGS, CSV import, or manual entry (STAK-363)
- **Added**: Two-tier re-sync picker modal with diff hints and smart pre-check defaults based on field origin (STAK-345)
- **Added**: Independent tag blacklist with Settings UI management, separate from chip grouping blacklist (STAK-354)
- **Added**: Auto-apply Numista tags toggle — global setting with per-action override in re-sync picker (STAK-346)
- **Added**: Backup export/import now includes numistaData and fieldMeta for complete round-trip preservation (STAK-362)

---

## [3.33.00] - 2026-02-26

### Added — Cloud Sync Overhaul, Image Pipeline, Numista Integrity, Menu UX, Retail Charts

- **Added**: Unified encryption mode for cloud sync — zero-config for most users, ambient header status icon, configurable idle timeout
- **Added**: 24h retail intraday chart with 30-min buckets, vendor carry-forward, two-pass anomaly filtering, OOS badges
- **Added**: Kilogram (kg) and pound (lb) weight units with automatic troy ounce conversion
- **Added**: Reorderable header buttons with show-text toggle, health status dots on Sync/Market buttons
- **Changed**: Removed `coinImages` IDB cache — CDN URLs are now the sole Numista image source, dynamic IndexedDB quota
- **Changed**: Overhauled `.gitattributes` export-ignore — release ZIP contains only runtime files (~4.5MB)
- **Fixed**: N#/image/metadata re-population after edit+save, image cross-contamination between items
- **Fixed**: Per-item Numista tag deletion, tags visible in edit modal and card view
- **Security**: Sentinel tabnabbing hardening on all external links, OAuth CSRF/PKCE improvements

---

## [3.32.45] - 2026-02-26

### Added — Filter Anomalous Vendor Price Spikes from 24h Retail Chart

- **Added**: Two-pass anomaly detection in 24h retail chart — temporal spike detection (before/after ±5% neighbor consensus) nulls single-window spikes, cross-vendor median (>40%) as safety net (STAK-325)
- **Added**: Anomalous table cells shown with line-through styling for visual distinction
- **Added**: `RETAIL_SPIKE_NEIGHBOR_TOLERANCE` (0.05) and `RETAIL_ANOMALY_THRESHOLD` (0.40) constants for configurable sensitivity

---

## [3.32.44] - 2026-02-25

### Added — Kilo and Pound Weight Units

- **Added**: Kilogram (kg) and pound (lb) weight units in add/edit/bulk-edit dropdowns (STAK-338)
- **Added**: Eager conversion to troy ounces on save with reverse conversion for display — follows existing gram pattern
- **Fixed**: Weight tooltip in inventory table now uses explicit unit lookup instead of `weight < 1` heuristic
- **Fixed**: Card view weight chip now uses `formatWeight()` for correct unit display across all 5 unit types

---

## [3.32.43] - 2026-02-25

### Fixed — Numista Tag Rendering + Per-Item Tag Deletion

- **Fixed**: Numista tags now visible in edit modal — `numistaTagsChips` and `customTagsChips` containers populated with removable tag chips when editing an item (STAK-343)
- **Fixed**: Tags now display as chips in card view (all 3 card styles A/B/C), matching the existing table inline behavior (STAK-343)
- **Fixed**: All tags (including Numista-applied) are now removable per-item via `×` button — previously Numista tags were locked as read-only with no delete path (STAK-344)

---

## [3.32.42] - 2026-02-25

### Fixed — Pattern Rule Promotion Bug

- **Fixed**: "Apply to all matching items" now correctly promotes images to a pattern rule even when the item was saved previously — reads from existing per-item IDB record when no pending upload blobs are in memory (STAK-339-followup)
- **Fixed**: Promoting to a pattern rule now removes the per-item `userImages` IDB record (avoids duplicate storage)

---

## [3.32.41] - 2026-02-25

### Changed — Image Pipeline Simplification

- **Removed**: `coinImages` IDB cache layer — CDN URLs on inventory items are now the sole Numista image source, eliminating the root cause of STAK-309/311/332/333/339 image bugs (STAK-339)
- **Removed**: `numistaOverridePersonal` settings toggle — no longer meaningful without cached blobs to prioritize
- **Removed**: CDN blob export/import from ZIP backup — CDN images are URLs, not local blobs
- **Simplified**: Image resolution cascade is now: user upload → pattern image → CDN URL → placeholder

---

## [3.32.40] - 2026-02-25

### Fixed — Numista Image Race Condition

- **Fixed**: Numista images now appear in table/card views immediately after applying — cacheImages re-renders on completion instead of fire-and-forget (STAK-337)

---

## [3.32.39] - 2026-02-25

### Fixed — Image Bug Fixes + API Health Refresh

- **Fixed**: `resyncCachedEntry()` and bulk image cache no longer write CDN URLs back to inventory items — IDB cache is the correct storage location (STAK-333)
- **Fixed**: Remove button now clears hidden URL input fields so deleted CDN URLs don't persist on save (STAK-308)
- **Added**: Per-item "Ignore image pattern rules" checkbox — prevents pattern rule images from reappearing after explicit removal (STAK-332)
- **Fixed**: Remaining image cross-contamination paths plugged by CDN writeback removal + pattern opt-out (STAK-311)
- **Fixed**: API health badge no longer shows stale data due to service worker caching — cache-busting query param defeats SW match (STAK-334)

---

## [3.32.38] - 2026-02-25

### Added — Home Poller SSH Skill + Skill Updates

- **Added**: `homepoller-ssh` skill — SSH reference for direct access to the home poller VM (192.168.1.81) via `stakpoller` user with NOPASSWD sudo
- **Changed**: `repo-boundaries` skill — fixed IP (192.168.1.48 → 192.168.1.81), replaced stakscrapr Claude delegation with SSH commands, corrected tinyproxy port (8889 → 8888)
- **Changed**: `retail-poller` and `api-infrastructure` skills — added SSH diagnostic references for home VM
- **Changed**: CLAUDE.md — added home poller SSH quick reference and `homepoller-ssh` to skills list

---

## [3.32.37] - 2026-02-25

### Changed — Wiki-First Documentation Policy

- **Changed**: StakTrakrWiki declared as sole source of truth; Notion infrastructure pages deprecated — do not update them
- **Changed**: `docs/devops/api-infrastructure-runbook.md` deprecated with banner; wiki pages `health.md`, `fly-container.md`, `spot-pipeline.md` are now authoritative
- **Added**: `wiki-search` skill for indexing and querying StakTrakrWiki via `mcp__claude-context__search_code` with `path: /Volumes/DATA/GitHub/StakTrakrWiki`
- **Changed**: `mcp__claude-context__search_code` documented in CLAUDE.md for both code and wiki search
- **Changed**: `finishing-a-development-branch` skill updated with mandatory Wiki Update Gate before PR creation
- **Changed**: AGENTS.md, GEMINI.md, copilot-instructions.md updated with Documentation Policy section

---

## [3.32.36] - 2026-02-25

### Fixed — STAK-309/STAK-311: Numista Data Integrity

- **Fixed**: Numista image URLs no longer re-populate after being cleared in the edit form — removed stale `oldItem` fallback from the save path (STAK-309)
- **Fixed**: Clearing the N# field now also wipes all associated Numista metadata (country, denomination, etc.) instead of silently preserving it (STAK-309)
- **Fixed**: CDN backfill on page load removed — URLs were being re-applied from catalog cache on every reload, undoing deliberate clears (STAK-309)
- **Fixed**: Numista images no longer cross-contaminate between items — view modal no longer mutates the live inventory item object (STAK-311)
- **Changed**: N# field removed from custom pattern rules edit form — Numista lookup for pattern rules is handled via the pattern replacement query, not a direct catalog ID (STAK-306)
- **Added**: "Purge Numista URLs" button in Settings → Images — removes all CDN image URLs from inventory items without touching user uploads or pattern rule images (STAK-312)

---

## [3.32.35] - 2026-02-24

### Added — STAK-320: Header Buttons Reorder & Apply to Header

- **Added**: Checkbox + arrow reorder table for header buttons in Settings → Appearance → Header Buttons; toggle visibility and reorder with ↑/↓ arrows (STAK-320)
- **Added**: Order persists to `headerBtnOrder` in localStorage and is applied both to the settings table and the live app header (STAK-320)

---

## [3.32.34] - 2026-02-24

### Added — STAK-324: Force Refresh button

- **Added**: Force Refresh button in Settings → System → App Updates — unregisters all service workers and reloads to fetch the latest version from the network; inventory data is not affected (STAK-324)

---

## [3.32.33] - 2026-02-24

### Fixed — STAK-303: 7-day sparklines straight line on fresh load

- **Fixed**: 7-day sparklines now draw a full curved historical line on fresh load by extending the automatic hourly backfill from 24 h to 7 days when no recent hourly data is present — seed bundle LBMA data can lag ~9 days, leaving the 7-day window empty (STAK-303)

---

## [3.32.32] - 2026-02-24

### Added — STAK-316: Cloud backup file type label

- **Added**: File type label ("Inventory backup" / "Image backup") in each cloud backup row, derived from filename — makes it easy to distinguish between `.stvault` inventory and image backup files at a glance (STAK-316)

---

## [3.32.31] - 2026-02-24

### Removed — STAK-321: Dead code cleanup

- **Removed**: `generateItemDataTable()` from `js/utils.js` — zero call sites remaining after PR #490 removed its only caller `createStorageItemModal` (STAK-321)

---

## [3.32.30] - 2026-02-24

### Added — STAK-314: Menu Enhancements

- **Added**: Trend period labels (e.g. "90d") on spot card headers that update in sync with the trend cycle button (STAK-314)
- **Added**: Health status dots on Sync and Market header buttons reflecting spot and market data freshness — green < 60 min, orange < 24 hr, red > 24 hr (STAK-314)
- **Added**: Vault and Restore header buttons (shown by default; can be hidden in Settings → Header Buttons) that open Settings → System for backup/restore (STAK-314)
- **Added**: Show Text toggle in Settings → Header Buttons that displays icon labels beneath all header buttons (STAK-314)
- **Added**: `flex-direction: column` layout on header buttons for uniform sizing and show-text mode support (STAK-314)

---

## [3.32.29] - 2026-02-24

### Added — Parallel Agent Workflow Improvements

- **Added**: Claims-array version lock replaces binary lock — multiple agents can now hold concurrent patch versions without blocking each other (supports parallel agent development)
- **Added**: Brainstorming skill project override with Phase 0 worktree gate — prevents implementation starting outside a `patch/VERSION` worktree
- **Added**: `devops/version-lock-protocol.md` updated with full claims-array protocol, parallel agent example, and prune-on-read TTL rules

---

## [3.32.27] - 2026-02-23

### Added — Image Storage Expansion — Dynamic Quota, Split Gauge, sharedImageId Foundation (STAK-305)

- **Added**: Dynamic IndexedDB quota via `navigator.storage.estimate()` — replaces hardcoded 50 MB cap; adapts to 60% of available disk space (min 500 MB, max 4 GB)
- **Added**: Persistent storage request on first photo upload — prevents browser from silently evicting user images
- **Added**: Split storage gauge in Settings → Images → Storage — separate rows for Your Photos vs. Numista Cache, each with progress bar and byte count
- **Added**: `sharedImageId` field on `userImages` records and `obverseSharedImageId`/`reverseSharedImageId` on inventory items — foundation for future image reuse across items

---

## [3.32.26] - 2026-02-23

### Fixed — Storage Quota, Chrome Init Race, Numista Data Integrity

- **Fixed**: `retailIntradayData` capped at 96 windows per slug — prevents localStorage quota overflow for users with large collections or many item images (STAK-300)
- **Fixed**: Chrome initialization race — "Cannot access 'inventory' before initialization" error on page refresh no longer appears (STAK-301)
- **Fixed**: Numista N# and photos no longer repopulate after being deleted from an item — `syncItem` now respects explicitly-cleared fields (STAK-302)
- **Fixed**: Numista serial→catalogId mapping cleared on save when N# is removed — stale mappings no longer cause cross-item data bleed (STAK-302)

---

## [3.32.25] - 2026-02-23

### Added — Vendor Price Carry-Forward + OOS Legend Links (STAK-299)

- **Added**: `_forwardFillVendors` — post-bucketing enrichment pass that fills vendor gaps with the most recent known price, annotating each window with `_carriedVendors: Set`
- **Added**: 24h chart carries forward vendor prices — carried data points render with `~` tooltip prefix and a muted/dashed dataset line; trend glyphs suppressed for carried entries
- **Added**: "Recent windows" table carries forward vendor prices — gap windows show `~$XX.XX` in muted italic with no trend glyph
- **Added**: OOS vendors shown in coin detail legend as clickable links — opens product page popup, `opacity: 0.5`, strikethrough last-known price, `OOS` badge in red
- **Fixed**: Vendor legend was hidden for coins where all vendors are currently OOS — `hasAny` guard now includes availability feed check

---

## [3.32.24] - 2026-02-23

### Fixed — Cloud Sync Reliability

- **Fixed**: Vault-overwrite race condition — debounced startup push could overwrite remote vault during conflict resolution, causing "Keep Remote" to silently discard the other device's changes. Both devices must be on v3.32.24+ for the race to be fully closed.
- **Fixed**: `getSyncPassword()` fast-path incorrectly gated on a plain localStorage read, breaking Simple-mode migration path on page reload.
- **Fixed**: Manual Backup button now reads cached localStorage password on page reload — no re-entry required after refresh.
- **Fixed**: Two bare `pullSyncVault()` calls in conflict modal had no `.catch()` — silent unhandled rejections on no-token pull failures now surface as status indicator errors.
- **Fixed**: `changeLog` IIFE parse failures now emit `console.warn` instead of silently returning `[]`.

---

## [3.32.23] - 2026-02-23

### Changed — Cloud Settings Redesign + Unified Encryption

- **Changed**: Cloud settings compacted to ≤400px card — Dropbox configuration moved to Advanced sub-modal
- **Changed**: Unified encryption mode — vault password stored in browser, combined with Dropbox account for zero-knowledge encryption (replaces Simple/Secure toggle)
- **Fixed**: Action buttons (Disconnect, Backup, Restore) use compact app button style, removed from main card view
- **Removed**: Encryption mode selector (Simple/Secure radio buttons) — single seamless mode replaces both

---

## [3.32.22] - 2026-02-23

### Fixed — Sync UI Dark-Theme CSS Fix

- **Fixed**: Cloud sync header popover now uses correct dark-theme CSS variables (`--bg-card`, `--border`, `--bg-tertiary`) — previously appeared white/light on dark theme
- **Fixed**: Mode selector in Settings → Cloud uses correct border and background variables across all themes
- **Fixed**: Backup warning banner uses transparent amber tint instead of hardcoded light-yellow (`#fff8e6`)
- **Fixed**: Popover header label uses SVG lock icon matching the app's stroke-icon style

---

## [3.32.21] - 2026-02-23

### Added — Sync UX Overhaul + Simple Mode

- **Added**: "Simple" sync mode — Dropbox account acts as encryption key; no vault password needed on any device
- **Added**: Mode selector in Settings → Cloud (Simple / Secure) with backup warning before switching modes
- **Fixed**: Sync password modal no longer auto-opens on page load; replaced with ambient toast + orange header dot
- **Changed**: Header cloud button is mode-aware — orange-simple reconnects Dropbox; orange (Secure) opens an inline password popover below the header button

---

## [3.32.20] - 2026-02-23

### Added — api2 Backup Endpoint

- **Added**: `api2.staktrakr.com` as a fallback for all three API feeds — spot (hourly + 15-min), market (manifest.json), and goldback (goldback-spot.json)
- **Changed**: All API fetches now try the primary endpoint with a 5-second timeout; if unreachable, automatically fall through to api2 before giving up
- **Changed**: API Health modal now shows per-endpoint columns (api vs api2) with live drift benchmarking in the verdict line

---

## [3.32.19] - 2026-02-23

### Added — 15-Min Spot Price Endpoint

- **Added**: New `data/15min/YYYY/MM/DD/HHMM.json` API endpoint — immutable sub-hourly price snapshots written every 15 min by the spot poller (GHA :05/:20/:35/:50)
- **Added**: `fetchStaktrakr15minRange()` fetches 24h of 15-min spot data into spotHistory, tagged `api-15min` and visible in the API history table

---

## [3.32.18] - 2026-02-23

### Added — Cloud Sync Header Status Icon (STAK-264)

- **Added**: Ambient cloud sync status icon in the header replaces the jarring on-load vault password modal — orange when password is needed (tap to unlock), green when active, gray when not yet configured (STAK-264)

---

## [3.32.17] - 2026-02-23

### Added — STAK-270: 24hr Intraday Chart Improvements

- **Improved**: 24hr intraday chart now buckets raw API windows into clean 30-min aligned slots, eliminating irregular tick spacing caused by poller timing variance
- **Improved**: Chart X-axis now visually distinguishes hour marks (full opacity, 11px) from half-hour marks (dimmed, 9px) for faster time-at-a-glance reading
- **Added**: Intraday table extended from 5 rows to configurable 12/24/48 rows with scrollable container and row-count dropdown
- **Added**: Trend column (▲/▼/—) in intraday table shows price direction vs. previous 30-min slot

---

## [3.32.16] - 2026-02-22

### Fixed — Market Chart Timezone + Seed Sync Automation (STAK-275, STAK-266)

- **Fixed**: 24hr market price chart X-axis and table now display times in the user's selected timezone instead of UTC (STAK-275)
- **Added**: seed-sync skill gains Phase 5 — fetches latest spot-history from live API and merges before staging, ensuring releases ship with up-to-date seed data (STAK-266)

---

## [3.32.15] - 2026-02-22

### Fixed — Nitpick Polish — API Health Modal Wording + Desktop Footer Layout (STAK-272, STAK-273)

- **Fixed**: API health modal Coverage row now shows "items tracked" instead of "coins" — rounds and bars are not coins (STAK-272)
- **Fixed**: Desktop footer restructured — badges moved to top row, "Special thanks to r/Silverbugs" moved to its own line below the main footer text (STAK-273)

---

## [3.32.14] - 2026-02-22

### Fixed — API Health Stale Timestamp Parsing (STAK-265)

- **Fixed**: Naive `"YYYY-MM-DD HH:MM:SS"` timestamps from spot history and Goldback feeds now normalized to UTC before parsing — previously treated as local time, inflating staleness readings by the user's UTC offset (e.g. 6 hours on CST)
- **Changed**: Market feed stale threshold raised from 15 → 30 min to match typical poller cadence and prevent false-positive stale warnings

---

## [3.32.13] - 2026-02-22

### Fixed — API Health Modal z-index + Three-Feed Freshness Checks

- **Fixed**: API health modal now renders above the About modal (z-index raised to 10000)
- **Improved**: API health now checks three feeds independently — market prices (15 min threshold), spot prices (75 min), and Goldback daily scrape; badges show per-feed freshness
- **Changed**: Footer and About modal badge text now shows `✅ Market Xm · Spot Xm` format

---

## [3.32.12] - 2026-02-22

### Added — Configurable Vault Password Idle Timeout (STAK-183)

- **Added**: "Auto-lock after idle" dropdown in Settings → Cloud Sync → Session Password Cache — choose 15 min, 30 min, 1 hour, 2 hours, or Never
- **Changed**: Vault password idle lock reads the user's setting at arm time instead of a hardcoded 15-minute constant; "Never" disables auto-clear entirely

---

## [3.32.11] - 2026-02-22

### Fixed — PR #395 Review Fixes — Code Quality & Correctness

- **Fixed**: `logItemChanges` null-dereference on item-add/delete — guarded `forEach` loop for null `oldItem`/`newItem`; now records single Added/Deleted entry
- **Fixed**: `changeLog` raw `localStorage.setItem` calls replaced with `saveDataSync()` across all callsites
- **Fixed**: `getManifestEntries`/`markSynced` exposed as `window.*` globals — array property approach lost on `changeLog = []` reassignment
- **Fixed**: Sync toast showed wrong provider — status string was `"success"` but `syncProviderChain` returns `"ok"`
- **Fixed**: Swallowed post-reset backfill error now logs to `console.warn` for debuggability
- **Fixed**: `api-health.js` modal calls use `window.` prefix; `readyState` guard added for late-loading scripts
- **Fixed**: `safeGetElement` used in `initSpotHistoryButtons` (was raw `document.getElementById`)

---

## [3.32.10] - 2026-02-22

### Added — Worktree Protocol & Branch Protection Infrastructure

- **Added**: Version lock + worktree protocol — agents now create isolated `patch/VERSION` git worktrees in `.claude/worktrees/` for concurrent work, preventing filesystem conflicts between agents
- **Added**: `main` branch protection — Codacy Static Code Analysis required, no force pushes, prevents direct pushes to production
- **Changed**: Release skill Step 0a now creates worktree + branch on lock claim; Phase 3 cleanup removes them after merge
- **Changed**: `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` updated with full worktree workflow and "never push directly to main" rule
- **Changed**: `devops/version-lock-protocol.md` — full 9-step lock+worktree protocol replacing the previous 5-step lock-only protocol

---

## [3.32.09] - 2026-02-22

### Fixed — WeakMap Search Cache Correctness

- **Fixed**: Cache miss check uses `=== undefined` instead of falsy — prevents treating a valid cached empty string as a miss (`js/filters.js`)
- **Fixed**: Notes save handler now invalidates search cache after in-place mutation — multi-word search reflects updated notes immediately (`js/events.js`)
- **Fixed**: Removed redundant post-loop `invalidateSearchCache` from `applyNumistaTags()` — `addItemTag()` already invalidates per item, eliminating a duplicate O(N) scan per tag (`js/tags.js`)
- **Fixed**: Undo/redo now invalidates search cache after in-place field mutation — multi-word searches reflect reverted values immediately (`js/changeLog.js`)

---

## [3.32.08] - 2026-02-22

### Fixed — OAuth State Security Hardening & Agent Instruction Sync

- **Fixed**: OAuth provider now parsed from trusted `savedState` after CSRF validation — not attacker-controlled `state` string before check (`js/cloud-storage.js`)
- **Fixed**: PKCE challenge promise now has `.catch()` handler — cleans `sessionStorage` and closes popup on failure
- **Fixed**: OAuth exchange failure path removes stale `cloud_oauth_state` from `sessionStorage` to prevent replay
- **Changed**: `AGENTS.md`, `GEMINI.md` updated — version lock protocol, Stitch removal, MCP parity sync (2026-02-22)
- **Changed**: `.gitignore` — added `devops/version.lock` multi-agent version mutex entry

---

## [3.32.07] - 2026-02-22

### Fixed — Backend Data Integrity & Sparkline Fix

- **Fixed**: Sync restore now clears all scoped localStorage keys before writing backup data — prevents stale entries leaking across restore (STAK-183)
- **Added**: DiffEngine module — pure-data compare, merge, and conflict detection for inventory sync (STAK-186)
- **Added**: changeLog manifest entries — scope tags, itemKey, type fields, and markSynced() for sync audit trail (STAK-187)
- **Added**: Vault manifest crypto — AES-256-GCM encryptManifest/decryptManifest with STMF header magic (STAK-188)
- **Fixed**: Sparkline intraday dedup removes duplicate timestamps that caused V-spike artifacts on spot price cards
- **Fixed**: Sparkline Y-axis normalized to ±1% of price range — eliminates over-zoom on flat intraday data
- **Fixed**: Post-wipe spot history initialized as array (not object) and triggers backfill correctly

---

## [3.32.05] - 2026-02-22

### Fixed — Service Worker Cache Coverage

- **Fixed**: Add `image-processor.js`, `bulk-image-cache.js`, and `image-cache-modal.js` to `sw.js` CORE_ASSETS — offline image workflows no longer 404 on first offline visit

---

## [3.32.04] - 2026-02-22

### Fixed — Async Save Reliability

- **Fixed**: `await saveData()` in `updateLastTimestamps`, `CatalogManager._save`, and `saveInventory` — prevents silently dropped Promises if localStorage throws

---

## [3.32.03] - 2026-02-22

### Fixed — Sync Toast

- **Fixed**: Spot price sync completion now shows a non-blocking toast instead of a blocking modal dialog

---

## [3.32.02] - 2026-02-22

### Changed — Appearance Settings Redesign

- **Changed**: Appearance tab redesigned — Color scheme and Inventory View as compact pill-button pickers in one card; Timezone, Default Sort, and Visible Items as full-width dropdowns in a second card; thumb-friendly touch targets throughout (STAK-258)

---

## [3.32.01] - 2026-02-21

### Fixed — Dual-Poller API Endpoint & Spot Pipeline Fixes

- **Fixed**: Correct retail endpoint paths for api1.staktrakr.com fallback — both RETAIL_API_ENDPOINTS now resolve to valid URLs
- **Fixed**: Point all pollers to correct API repos — StakTrakrApi (Fly.io) and StakTrakrApi1 (Mac) no longer cross-wired
- **Fixed**: Hourly spot data pipeline — backfill, dual-checkout, and endpoint migration corrected (STAK-255)
- **Fixed**: Race both hourlyBaseUrls in parallel per hour for spec compliance
- **Added**: Nightly sync between StakTrakrApi and StakTrakrApi1 repos via GitHub Actions

---

## [3.32.0] - 2026-02-21

### Added — Market Prices Module, OOS Detection & Image Vault Sync

- **Added**: Market Prices Module — live bullion retail prices from APMEX, Monument Metals, SDB, and JM Bullion with per-coin cards, 30-day price history, and intraday 15-min data (retail.js, retail-view-modal.js)
- **Added**: Out-of-stock detection via AI vision (Gemini) and Firecrawl scraping consensus — OOS coins display strikethrough pricing and gaps in history charts
- **Added**: Image Vault Sync — user-uploaded coin photos sync to cloud via encrypted image vault (STAK-181)
- **Added**: Serial Number column in PDF export (STAK-234)
- **Added**: Retail poller PATCH_GAPS gap-fill mode — backfills missing hourly windows without re-scraping existing data (replaces FBP GHA workflow)
- **Fixed**: Numista cache now clears on N# change; added remove button for cached Numista data (STAK-244)
- **Fixed**: Card view portal height calculation corrected for multi-row layouts (STAK-206)
- **Fixed**: UUID generation upgraded to CSPRNG (`crypto.getRandomValues`) for all item IDs

---

## [3.31.6] - 2026-02-19

### Added — STAK-173: Collapsible Form Modal, Numista Data Persistence & Dialog Migration

- **Added**: Collapsible add/edit form with glassmorphic sections — core fields always visible, Grading & Certification, Pricing & Details, Numista Data, and Notes collapse via native `<details>`/`<summary>` (STAK-173)
- **Added**: Per-item Numista metadata persistence — API data seeds fields, user edits override, layered provider priority for future catalog APIs (STAK-173)
- **Added**: Numista Data fields auto-populate from IndexedDB cache on edit and after Numista search (STAK-173)
- **Added**: Date N/A checkbox to blank out purchase date for items without acquisition dates (STAK-173)
- **Added**: Color-coded image upload pill buttons (Upload/URL/Camera/Remove) with card layout (STAK-173)
- **Changed**: Migrate all native alert/confirm/prompt calls to async appDialog wrappers across 18 modules
- **Changed**: Expand bulk edit search to match across Numista metadata fields (STAK-175)
- **Fixed**: Currency symbol ($) no longer overlaps placeholder text in purchase/retail price fields (STAK-173)

---

## [3.31.5] - 2026-02-19

### Added — STAK-149: Cloud Auto-Sync, Bulk Edit Fixes & Code Cleanup

- **Added**: Real-time encrypted auto-sync to Dropbox — inventory changes push automatically and other devices are notified with an "Update Available" modal showing item count, timestamp, and device before pulling (STAK-149)
- **Added**: Per-backup delete button in cloud backup list — remove individual backups from Dropbox without logging in (STAK-149)
- **Added**: View Sync Log shortcut in Dropbox card footer navigates directly to cloud activity log (STAK-149)
- **Fixed**: Bulk Edit Delete, Copy, and Apply operations now work correctly inside the modal — replaced window.confirm/alert with modal-based confirmations
- **Removed**: isCollectable field removed from inventory items, bulk editor, import/export, and seed data — superseded by the tag system

---

## [3.31.4] - 2026-02-19

### Added — Vendored Libraries & True Offline Support

- **Added**: All CDN dependencies (PapaParse, jsPDF, Chart.js, JSZip, Forge, and plugins) bundled locally in `vendor/` — app is now fully functional with no internet connection and on `file://` protocol
- **Added**: CDN fallback loader fires automatically if a vendor file fails to define its global — no silent failures
- **Fixed**: `importCsv`, `exportCsv`, `importNumistaCsv`, and `exportPdf` now show a clear user-facing error if the required library failed to load, instead of a silent crash
- **Added**: Vendor files pre-cached in service worker `CORE_ASSETS` — offline PWA install now bundles all dependencies
- **Added**: `vendor/**` excluded from Codacy analysis to prevent false positives on minified third-party code

---

## [3.31.3] - 2026-02-19

### Added — Filter Chip Active-State UX & Bug Fixes

- **Added**: Filter chips now hide × on idle — only active/search chips show the remove button and a themed border ring, eliminating visual noise from ~60 always-visible × buttons (STAK-172)
- **Fixed**: Clicking × on an active filter chip now correctly removes the filter instead of erroneously replacing it with an exclude entry
- **Fixed**: Card view pagination, mobile image tap, and bulk popover rendering polish
- **Fixed**: VIEW_METADATA_TTL promoted to global scope; O(1) Map pre-built for Numista tag lookup (PR #257 review)
- **Fixed**: MD013 disabled in markdownlint config to match Codacy dashboard setting

---

## [3.31.2] - 2026-02-18

### Added — Numista Metadata Pipeline Fixes

- **Fixed**: Vault restore now reloads in-memory item tags immediately — filter chips show correct tags without requiring a page reload (STAK-168)
- **Fixed**: Bulk sync now writes Numista tags to all matching inventory items eagerly — filter chips no longer require opening each item's view modal (STAK-168)
- **Fixed**: View modal skips API call when metadata is already cached in IndexedDB — eliminates reload delay for previously bulk-synced items (STAK-168)
- **Fixed**: Numista search result weight field now pre-checked by default when value is available (STAK-168)

---

## [3.31.1] - 2026-02-18

### Added — FAQ Modal, Settings Consolidation & Privacy Improvements

- **Added**: Interactive FAQ modal with 13 questions across 6 sections — accessible via Settings sidebar tab, About modal, and app footer
- **Added**: ZIP export and ZIP restore buttons exposed in Settings → Inventory (previously orphaned globals with no UI)
- **Added**: pCloud and Box as coming-soon cloud provider cards alongside Google Drive and OneDrive in Settings → Cloud
- **Changed**: Files settings tab consolidated into Inventory tab — all import/export now in one place
- **Changed**: Bulk Editor wrapped in settings card with BETA badge
- **Changed**: Data Reset promoted to standalone fieldset (removed redundant Backup & Security wrapper)
- **Changed**: StakTrakr Cloud (Sponsors) card moved above Dropbox in Cloud settings
- **Fixed**: privacy.html now inherits app theme and syncs with user's stored theme preference
- **Fixed**: "Back to StakTrakr" link on privacy.html works correctly on file:// protocol
- **Fixed**: Footer thank-you updated to credit r/Silverbugs community

---

## [3.31.0] - 2026-02-17

### Added — Cloud Storage Backup (Dropbox)

- **Added**: Cloud storage backup — encrypt and upload .stvault files to Dropbox via OAuth PKCE popup flow
- **Added**: Privacy policy page for OAuth provider compliance
- **Added**: Cloudflare Pages Function scaffold for future pCloud/Box token exchange proxy
- **Fixed**: Favicon and PWA SVG icons updated to match ST branding (gold ST on navy)

---

## [3.30.09] - 2026-02-17

### Added — Settings & Header Controls Overhaul

- **Added**: Optional Trend and Sync buttons in header (hidden by default, enable in Appearance > Header Buttons)
- **Changed**: Removed global spot trend/sync bar; trend cycling and sync now available as header buttons
- **Changed**: Settings Appearance panel reorganized — Header Buttons 2×2 grid, Layout card, Inventory View cards (Card View A/B/C/D, Default Sort, Visible Items)
- **Changed**: Images panel restructured — actions row at top, 1×3 display grid, camera capture support, fieldset cards
- **Changed**: Metal Order and Inline Chips consolidated into Chips panel; removed Table Display tab
- **Changed**: Currency header button hidden by default; Trend and Sync default to ON

---

## [3.30.08] - 2026-02-17

### Added — Default Settings Overhaul & Seed Pattern Images

- **Changed**: Default sort to Name ascending, show all rows, dark theme for new users
- **Changed**: Header theme button hidden by default (existing users migrated to keep visible)
- **Changed**: Dynamic Name Chips disabled by default
- **Changed**: Goldback denomination pricing and real-time estimation enabled by default
- **Added**: Per-rule enable/disable toggles for built-in Numista lookup patterns with Enable All / Disable All controls
- **Added**: Seed pattern images — American Silver Eagle and Canadian Gold Maple demo rules with coin photos in Custom Pattern Rules for first-time user coaching

---

## [3.30.07] - 2026-02-17

### Added — STAK-104: Save Search as Filter Chip

- **Added**: Bookmark button inside search input to save multi-term comma-separated searches as custom filter chips (STAK-104)
- **Added**: Smart enable/disable logic — button activates only for 2+ comma-separated terms that don't already exist as a saved group or auto-generated chip
- **Added**: Button disabled during fuzzy search mode to prevent saving approximate matches
- **Added**: Save button state syncs with filter clear and filter remove actions

---

## [3.30.06] - 2026-02-17

### Added — Card View Sort Controls & UX Polish

- **Added**: Card sort bar with sort-by dropdown, direction toggle, and A/B/C card style toggle — visible only in card view (STAK-131)
- **Changed**: Pagination dropdown hidden in card view — cards always show all items
- **Changed**: Default table rows changed from 6 to 12
- **Changed**: Header card view button now simply toggles card/table view
- **Changed**: Numista name matching (NUMISTA_SEARCH_LOOKUP) disabled by default

---

## [3.30.05] - 2026-02-16

### Fixed — Sort Column Index Realignment

- **Fixed**: All table sorts after the Type column were off by one — the Image column added in v3.30.00 was missing from the sort index map, causing every click from Name onward to sort by the wrong field (e.g. clicking Purchase sorted by Melt, clicking Gain/Loss sorted by Source)
- **Fixed**: Sorting by Retail and Gain/Loss now uses `computeMeltValue()` and `getGoldbackRetailPrice()` matching the table render logic
- **Fixed**: Image column header click is now a no-op instead of incorrectly sorting by Name
- **Fixed**: Secondary year sub-sort on Name column updated to correct index

---

## [3.30.04] - 2026-02-16

### Fixed — Pagination Dropdown Fix & Settings Reorganization

- **Fixed**: Settings modal "Visible rows" dropdown now includes value 6 — prevents silent fallback to 12 when switching between card and table views
- **Changed**: Items-per-page default changed from 12 to 6 across all code paths
- **Added**: 128 and 512 options to both footer and settings dropdowns
- **Changed**: "Table" settings tab renamed to "Inventory" with card settings consolidated under it

---

## [3.30.03] - 2026-02-17

### Fixed — STAK-130: PumpkinCrouton Patch — Purity Input & Save Fix

- **Fixed**: Purity dropdown now includes .9995 (standard pure platinum) as a preset option (STAK-130)
- **Fixed**: Custom purity input accepts 4 decimal places instead of 3 (STAK-130)
- **Fixed**: Hidden custom purity input no longer blocks form submission — resolves save corruption where no items could be edited after entering an invalid custom purity value (STAK-130)
- **Fixed**: Duplicate item preserves original purchase date instead of defaulting to today (STAK-130)

Thanks to u/PumpkinCrouton for finding and reporting this bug.

---

## [3.30.02] - 2026-02-16

### Fixed — Keyless Provider Fixes & Hourly History Pull

- **Fixed**: Keyless providers (STAKTRAKR) now enable sync buttons, show "Connected" status, and auto-select correctly
- **Fixed**: STAKTRAKR usage counter tracks API calls with 5000 default quota
- **Added**: Hourly history pull for STAKTRAKR provider (1–30 days of hourly files)
- **Added**: Hourly history pull for MetalPriceAPI provider (up to 7 days, per-metal)
- **Added**: History log distinguishes hourly entries with "(hourly)" source label
- **Added**: One-time migration re-tags existing StakTrakr hourly entries for production users

---

## [3.30.01] - 2026-02-16

### Added — StakTrakr Free API Provider & UTC Poller Fix

- **Added**: StakTrakr as a free, keyless API provider (rank 1 by default) fetching hourly spot prices from api.staktrakr.com
- **Added**: Provider panel with "Free" badge, best-effort disclaimer, and 1st–5th priority labels across all providers
- **Changed**: Poller switched from EST to UTC for timezone-neutral hourly file paths
- **Changed**: Service worker caches api.staktrakr.com with stale-while-revalidate strategy
- **Fixed**: Auto-sync and provider chain now work without any API keys via keyless providers

---

## [3.30.00] - 2026-02-16

### Added — Card View Engine, Mobile Overhaul & UI Polish

- **Added**: Three card view styles — Sparkline Header (A), Full-Bleed Overlay (B), Split Card (C) — with header button cycling and shift+click table/card toggle (STAK-118)
- **Added**: CDN image URLs for obverse/reverse with dedicated table image column, settings toggle for obverse/reverse/both, and card view thumbnails (STAK-118)
- **Added**: Mobile viewport overhaul — responsive breakpoints, touch-friendly controls, viewport scaling fixes (STAK-124, STAK-125, STAK-126)
- **Added**: Mobile summary cards — compact 2-col grid with spanning All Metals card (STAK-106)
- **Added**: Rows-per-page options (3/12/24/48/96/All) with floating back-to-top button and portal scroll override
- **Added**: CSV, JSON, and ZIP backup/restore now include obverse/reverse image URL fields
- **Changed**: Theme-aware sparkline colors — bold strokes and fills clearly visible on light, sepia, and dark themes
- **Changed**: Default card style set to Sparkline Header (A), default rows-per-page set to 12
- **Fixed**: Service worker DEV_MODE toggle for cache bypass during development

---

## [3.29.08] - 2026-02-15

### Fixed — Fix What's New Modal Showing Stale Version

- **Fixed**: What's New modal no longer shows stale version content after deployments — version check now uses `APP_VERSION` directly instead of potentially stale localStorage value
- **Fixed**: Service worker local asset strategy changed from cache-first to stale-while-revalidate so deployment updates propagate on next page load

---

## [3.29.07] - 2026-02-15

### Fixed — Fix Image Deletion in Edit Modal

- **Fixed**: Users can now properly remove uploaded photos from items via Remove button in edit modal — deletion intent flags ensure images are removed from IndexedDB on Save (STAK-120)
- **Fixed**: Orphaned user images are now cleaned up from IndexedDB when inventory items are deleted, preventing storage bloat (STAK-120)

---

## [3.29.06] - 2026-02-15

### Changed — STAK-115, STAK-116, STAK-117: Design System & Settings Polish

- **Changed**: Unified Settings toggle styles — replaced iOS-style switches with chip-sort-toggle pattern for Table Thumbnails, Numista Priority, and header shortcut settings (STAK-116)
- **Changed**: Redesigned Settings > Appearance tab with grouped fieldsets — Theme, Currency & Pricing, Image Display, and Custom Themes placeholder (STAK-115)
- **Added**: Living style guide (`style.html`) — standalone design system reference with theme switching, color token swatches, and all UI component samples (STAK-117)
- **Added**: CSS & Design System coding standards — token usage rules, toggle standard, button variants, settings group patterns (STAK-117)

---

## [3.29.05] - 2026-02-15

### Fixed — Post-Release Hardening & Seed Cache Fix

- **Fixed**: Seed data cache staleness — service worker now uses stale-while-revalidate for spot-history files so Docker poller updates reach users between releases
- **Fixed**: CoinFacts URL fallback for Raw/Authentic grades in View Modal cert badge (PR #161)
- **Fixed**: Purchased chart range clamped to minimum 1 day to avoid All-range collision (PR #161)
- **Fixed**: Verify promise unhandled rejection and window.open name sanitization (PR #161)
- **Fixed**: Keyboard activation (Enter/Space) added to cert badge buttons for accessibility (PR #161)
- **Fixed**: dailySpotEntries fallback on fetch failure, verify button visibility guard (PR #161)

---

## [3.29.04] - 2026-02-15

### Added — STAK-110, STAK-111, STAK-113: View Modal Visual Sprint

- **Added**: Certification badge overlay on View Modal images — authority-specific colors (PCGS, NGC, ANACS, ICG), clickable grade for cert lookup, verification checkmark with pass/fail states (STAK-113)
- **Added**: Chart range pills for 1Y, 5Y, 10Y, and Purchased (purchase date → present) with Purchased as default (STAK-113)
- **Changed**: View Modal default section order — Images first, then Valuation (STAK-110)
- **Added**: Purchase date in parentheses next to purchase total in Valuation section (STAK-111)
- **Fixed**: Date range picker "From" clearing not resetting "To" minimum constraint

---

## [3.29.03] - 2026-02-15

### Fixed — STAK-108, STAK-109, STAK-103: Price History Fixes & Chart Improvements

- **Fixed**: Goldback items recording $0.00 retail in price history — added 3-tier retail hierarchy lookup with `getGoldbackRetailPrice()` (STAK-108)
- **Fixed**: API sync timing — Goldback denomination prices now update before price history snapshots are recorded (STAK-108)
- **Added**: Per-item price history modal with inline delete and undo/redo from Edit Modal retail price field (STAK-109)
- **Added**: Delete buttons on Settings > Price History table with change log integration (STAK-109)
- **Fixed**: All-time chart showing only ~1 year on file:// protocol — 749KB seed bundle loaded via `<script>` tag bypasses Chrome fetch restrictions
- **Added**: Adaptive x-axis year labels — decade+ ranges show compact 2-digit year, multi-year ranges show two-line date+year
- **Added**: Custom date range picker on Item View chart with cross-constrained from/to inputs (STAK-103)
- **Fixed**: WCAG accessibility — date input font-size increased from 0.6rem to 0.75rem
- **Fixed**: Async chart error handling with graceful fallback on fetch failure

---

## [3.29.02] - 2026-02-15

### Fixed — PWA Crash Fix: Service Worker Error Handling

- **Fixed**: Navigation fetch handler crash in installed PWAs — added 3-tier fallback (cached index.html → cached root → inline offline page) so `respondWith()` never receives a rejected promise
- **Fixed**: `fetchAndCache`, `cacheFirst`, and `networkFirst` strategy functions now catch network/cache failures instead of propagating rejections
- **Fixed**: Install event failures are now logged with detailed error information to make SW install issues diagnosable

---

## [3.29.01] - 2026-02-15

### Changed — Codacy Duplication Reduction

- **Changed**: Extracted `wireFeatureFlagToggle` and `wireChipSortToggle` helpers to deduplicate 6 identical chip toggle handlers across settings.js and events.js
- **Changed**: Merged `renderInlineChipConfigTable` into generic `_renderSectionConfigTable` with `emptyText` option
- **Changed**: Extracted `buildItemFields` helper to deduplicate item field listings in add/edit paths
- **Changed**: Extracted `closeItemModal` to deduplicate cancel/close button handlers
- **Removed**: Unused Numista Query and N# form fields from pattern image rule form

---

## [3.29.00] - 2026-02-15

### Added — Edit Modal Pattern Rule Toggle

- **Added**: "Apply to all matching items" checkbox in edit modal image upload — creates a pattern rule from keywords instead of saving a per-item image
- **Changed**: Extracted shared section config helpers to reduce code clones across layout/view modal settings

---

## [3.28.00] - 2026-02-14

### Added — Price History Chart Overhaul & View Modal Customization

- **Added**: Price history chart derives melt value from spot price history — every item gets a chart from day one
- **Added**: Chart range toggle pills (7d / 14d / 30d / 60d / 90d / 180d / All) with 30d default
- **Added**: Retail value line anchored from purchase date/price to current market value with sparse midpoint snapshots
- **Added**: Layered chart fills — purchase (red), melt (green), retail (blue) with transparency blending
- **Changed**: View modal section order: Images → Price History → Valuation → Inventory → Grading → Numista → Notes
- **Added**: Configurable view modal section order in Settings > Layout with checkbox + arrow reorder table

---

## [3.27.06] - 2026-02-14

### Added — Timezone Selection & PWA Fixes

- **Added**: Display timezone selector in Settings > System — all timestamps respect user-chosen timezone while stored data stays UTC (STAK-63)
- **Fixed**: Spot card and history timestamps displayed UTC values regardless of browser timezone — bare UTC strings now parsed correctly (STAK-63)
- **Fixed**: PWA installed app failed to load on second launch — absolute start_url and navigation-aware service worker
- **Fixed**: What's New splash re-triggering from stale SW cache + missing ESC handler (STAK-93)

---

## [3.27.05] - 2026-02-14

### Added — Numista Bulk Sync & IDB Cache Fix

- **Added**: Numista Bulk Sync — metadata + image syncing from API card with inline stats, progress, and activity log (STAK-87, STAK-88)
- **Changed**: Moved image cache controls from Settings > System into the Numista API card as "Bulk Sync"
- **Fixed**: Opaque blob IDB corruption — images disappeared after bulk cache on HTTPS (STAK-87)
- **Fixed**: Empty blob safety guard in getImageUrl() prevents blocking CDN fallback
- **Added**: Table row thumbnail images with hover preloading (STAK-84)

---

## [3.27.04] - 2026-02-14

### Added — Spot Comparison Mode & Mobile API Settings

- **Added**: User setting for 24h % comparison mode — Close/Close, Open/Open, Open/Close (STAK-92)
- **Changed**: Replaced drag-to-sort provider tabs with explicit Sync Priority dropdowns that work on all devices (STAK-90)
- **Changed**: Provider tabs now scroll horizontally on mobile instead of overflowing (STAK-90)
- **Removed**: Sync Mode toggle (Always/Backup) — replaced by priority numbers (STAK-90)
- **Fixed**: Cache-bust favicon and add root-level copies for PWA
- **Fixed**: Consistent 24h % across all spot card views (STAK-89)
- **Changed**: Extract fetchAndCache helper in service worker

---

## [3.27.03] - 2026-02-14

### Added — PWA Support & Bug Fixes

- **Added**: PWA support — manifest.json, service worker with offline caching, installable app experience (STAK-74)
- **Added**: PWA icons (192×192, 512×512) and Apple mobile web app meta tags
- **Fixed**: `parsePriceToUSD` now preserves existing price when edit field is left empty instead of zeroing it (STAK-81)
- **Fixed**: Date change in add/edit form now clears stale spot-lookup override price (STAK-82)
- **Fixed**: Activity Log sub-tabs (spot history, catalog history, price history) now re-render on every switch instead of showing stale data (STAK-83)
- **Fixed**: Item detail modal layout on Samsung S24+ Ultra — raised breakpoint from 400px to 480px for single-column grid (STAK-85)
- **Removed**: Redundant View (eye) icon from table action column — item name click already opens view modal (STAK-86)
- **Added**: Spot history seed data for Jan 2 – Feb 14, 2026 (32 dates × 4 metals) from Docker poller infrastructure
- **Changed**: Spot history and spot lookup display "Seed" label for seed-sourced entries

---

## [3.27.02] - 2026-02-13

### Changed — Multi-Color Storage Bar

- **Changed**: Footer storage bar now shows localStorage (blue) and IndexedDB (green) as stacked segments with color legend dots
- **Changed**: Storage text displays per-source breakdown (LS KB + IDB KB) with combined total
- **Changed**: Hover tooltips on bar segments show individual source limits

---

## [3.27.01] - 2026-02-13

### Fixed — Iframe to Popup Window Migration

- **Fixed**: Source URL and N# Numista links in view modal now open in popup windows instead of iframe overlays — external sites block iframe embedding via X-Frame-Options headers
- **Removed**: Iframe popup modal HTML and CSS (replaced by standard window.open popups)

---

## [3.27.00] - 2026-02-13

### Added — Coin Image Cache & Item View Modal

- **Added**: IndexedDB image cache (`js/image-cache.js`) — fetches, resizes, and stores Numista coin images with 50MB quota and graceful `file://` degradation
- **Added**: Item view modal (`js/viewModal.js`) with coin images, inventory data, valuation, grading, and Numista enrichment — opens via item name click or card tap
- **Added**: Numista metadata caching with 30-day TTL — denomination, shape, diameter, thickness, orientation, composition, technique, references, rarity, mintage, edge, tags, and commemorative info
- **Added**: Settings toggles for 15 Numista view modal fields in API settings panel
- **Added**: View (eye) button in table/card actions, card tap opens view modal on mobile
- **Added**: Clickable source URLs and N# Numista badges open in 1250px popup windows
- **Added**: IndexedDB storage reporting in settings footer (LS + IDB) and storage report modal
- **Added**: Search eBay button in view modal footer
- **Added**: `COIN_IMAGES` feature flag (beta) gating entire image/view system
- **Changed**: All popup windows widened from 1200px to 1250px
- **Changed**: Full-screen view modal on mobile with sticky footer, safe-area insets, and 44px touch targets
- **Changed**: Rectangular image frames for bars, notes, and Aurum/Goldback items in view modal

---

## [3.26.03] - 2026-02-13

### Fixed — STAK-79, STAK-80: XSS & HTML Injection Hardening

- **Fixed**: DOM XSS in Price History table — item names now escaped via `escapeHtml()` before innerHTML interpolation (STAK-79)
- **Fixed**: HTML injection in Spot History table — metal, source, and provider fields now escaped (STAK-80)
- **Fixed**: HTML injection in Spot Lookup modal — source and data attributes now escaped (STAK-80)
- **Added**: Shared `escapeHtml()` utility in `utils.js` for consistent XSS prevention across modules

---

## [3.26.02] - 2026-02-13

### Fixed — Autocomplete Migration & Version Check CORS

- **Fixed**: One-time migration auto-enables `FUZZY_AUTOCOMPLETE` for users who had it silently disabled before the settings toggle existed
- **Fixed**: Version check CORS failure — `staktrakr.com` 301 redirects to `www.staktrakr.com` without CORS headers; updated URL to skip redirect

---

## [3.26.01] - 2026-02-13

### Added — Fuzzy Autocomplete Settings Toggle

- **Added**: Fuzzy autocomplete On/Off toggle in Settings > Filter Chips panel
- **Fixed**: Autocomplete feature flag not discoverable — persisted disabled state had no UI to re-enable

---

## [3.26.00] - 2026-02-13

### Added — STAK-62: Autocomplete & Fuzzy Search Pipeline

- **Added**: Autocomplete dropdown on Name, Purchase Location, and Storage Location form inputs — suggestions from inventory + prebuilt coin database (STAK-62)
- **Added**: Abbreviation expansion in search — "ASE", "AGE", "kook", "krug" etc. match full coin names (STAK-62)
- **Added**: Fuzzy search fallback — approximate matches shown with indicator banner when exact search returns no results (STAK-62)
- **Added**: `registerName()` dynamically adds new item names to autocomplete suggestions (STAK-62)
- **Fixed**: Firefox autocomplete suppression using non-standard attribute value (STAK-62)
- **Fixed**: Autocomplete cache invalidated on inventory save, clear, and boating accident (STAK-62)
- **Changed**: `FUZZY_AUTOCOMPLETE` feature flag promoted to stable (STAK-62)

---

## [3.25.05] - 2026-02-13

### Added — STAK-71: Details modal QoL — responsive charts, slice labels, scrollable breakdown

- **Added**: Pie chart percentage labels via chartjs-plugin-datalabels — slices ≥5% show percentage directly on the chart (STAK-71)
- **Added**: Sticky metric toggle (Purchase/Melt/Retail/Gain-Loss) stays visible while scrolling the modal body (STAK-71)
- **Fixed**: Details modal overflow cascade — breakdowns no longer clipped off-screen at any viewport size (STAK-71)
- **Fixed**: Chart container uses `aspect-ratio: 1` for circular pie charts instead of rigid 300px height (STAK-71)
- **Fixed**: ResizeObserver memory leak — observer now disconnected on modal close (STAK-71)
- **Fixed**: Sepia theme chart colors — tooltips now use correct background/text colors for all 4 themes (STAK-71)
- **Fixed**: Allow clearing optional form fields on edit
- **Removed**: Dead CSS chart-height rules at ≤768px/≤640px/≤480px (already hidden by STAK-70)

---

## [3.25.04] - 2026-02-12

### Added — STAK-70: Mobile-optimized modals

- **Added**: Full-screen modals at ≤768px using `100dvh` with `100vh` fallback — all primary modals fill the viewport on mobile (STAK-70)
- **Added**: Settings sidebar 5×2 tab grid replacing horizontal scroll — all 10 tabs visible simultaneously (STAK-70)
- **Added**: Touch-sized inputs (44px min-height) and stacked action buttons in add/edit item modal (STAK-70)
- **Added**: Landscape card view for touch devices 769–1024px via `pointer: coarse` detection and `body.force-card-view` class (STAK-70)
- **Added**: 2-column card grid for portrait ≤768px in landscape orientation (STAK-70)
- **Changed**: Pie charts and metric toggle hidden on mobile in details modal — Chart.js creation skipped entirely for performance (STAK-70)
- **Changed**: Bulk edit modal stacks vertically with full-screen integration and touch-sized inputs (STAK-70)
- **Changed**: `updateColumnVisibility()` extended to apply `.force-card-view` for landscape touch devices (STAK-70)
- **Changed**: `updatePortalHeight()` clears max-height for `.force-card-view` card layout (STAK-70)
- **Fixed**: Small utility modals (notes, API info, storage options, cloud sync) remain as centered popups, not full-screen (STAK-70)

---

## [3.25.03] - 2026-02-12

### Added — STAK-38/STAK-31: Responsive card view & mobile layout

- **Added**: CSS card view at ≤768px — inventory table converts to flexbox cards with name title, horizontal chips, metal subtitle, 2-column financial grid, and centered touch-friendly action buttons (44px targets per Apple HIG) (STAK-31)
- **Added**: `data-label` attributes on all `<td>` elements for card view `::before` labels (STAK-31)
- **Added**: Card tap-to-edit — tapping card body opens edit modal; buttons/links work normally (STAK-31)
- **Added**: Details modal fixes at ≤640px — single-column breakdown grid, 150px chart, stacked panels (STAK-38)
- **Added**: Short-viewport portal scroll cap at ≤500px height for 300% zoom scenarios (STAK-38)
- **Changed**: Consolidated 3 duplicate responsive table CSS sections into single canonical block (STAK-38)
- **Changed**: `updateColumnVisibility()` skips at ≤768px — card CSS handles visibility (STAK-38)
- **Changed**: `updatePortalHeight()` clears max-height at ≤768px — cards scroll naturally (STAK-38)
- **Fixed**: Footer badges wrap on mobile instead of overflowing card
- **Fixed**: Filter chips stay horizontal and wrap instead of stacking vertically at narrow widths
- **Fixed**: Header logo scales to fill mobile width with centered action buttons below

---

## [3.25.02] - 2026-02-12

### Fixed — STAK-68: Goldback spot lookup fix

- **Fixed**: Spot price lookup now applies Goldback formula (`2 × (goldSpot / 1000) × modifier × denomination`) instead of raw gold spot for purchase price (STAK-68)

---

## [3.25.01] - 2026-02-12

### Fixed — STAK-64: Version splash content source

- **Fixed**: Version splash modal now shows user-friendly "What's New" announcements instead of raw changelog entries (STAK-64)
- **Removed**: ~270 lines of embedded changelog data from `versionCheck.js` — content now sourced from `loadAnnouncements()` shared with the About modal

### Added — STAK-67: Remote version check badge

- **Added**: Footer version badge shows installed version with link to GitHub releases (STAK-67)
- **Added**: Remote version check fetches `version.json` from staktrakr.com with 24hr cache (STAK-67)
- **Added**: Badge upgrades to green "up to date" or amber "available" on hosted deployments (STAK-67)
- **Added**: `version.json` at project root for self-hosted version checking
- **Changed**: Footer `staktrakr.com` text is now a clickable link

---

## [3.25.00] - 2026-02-12

### Added — STAK-54, STAK-66: Appearance settings, spot lookup & sparkline improvements

- **Added**: Header quick-access buttons — theme cycle and currency picker dropdown (STAK-54)
- **Added**: Layout visibility toggles — show/hide spot cards, totals, search bar, inventory table (STAK-54)
- **Added**: Settings nav item and panel for Layout controls (STAK-54)
- **Added**: 1-day sparkline shows yesterday→today trend with daily-averaged data points (STAK-66)
- **Added**: 15-minute and 30-minute API cache timeout options for more frequent spot refreshes
- **Fixed**: Spot lookup "Use" button now updates visible Purchase Price field with currency conversion (STAK-65)
- **Fixed**: Clearing Retail Price field during editing now correctly reverts to melt value
- **Fixed**: Spot lookup price rounded to nearest cent
- **Fixed**: Sparkline Y-axis scaling and curve overshoot on 1-day view

---

## [3.24.06] - 2026-02-12

### Changed — STAK-56: Cyclomatic complexity reduction (batch 1 & 2)

- **Refactored**: `renderLogTab` — switch → dispatch map (CCN 9 → ~2)
- **Refactored**: `coerceFieldValue` — if-chain → dispatch map (CCN 13 → ~2)
- **Refactored**: `toggleGbDenomPicker` — extract `showEl` helper, drop redundant fallback (CCN 11 → ~7)
- **Refactored**: `renderItemPriceHistoryTable` — extract `preparePriceHistoryRows` and `attachPriceHistorySortHeaders` (CCN 11 → ~6)
- **Refactored**: `setupNoteAndModalListeners` — new `optionalListener` helper eliminates 16 if-guards, extract `dismissNotesModal` (CCN 17 → ~1)
- **Refactored**: `setupImportExportListeners` — new `setupFormatImport` triad helper, split into `setupVaultListeners` + `setupDataManagementListeners` (CCN 27 → ~3)
- **Added**: `optionalListener` utility — null-safe listener attachment without console.warn spam
- **Added**: `setupFormatImport` utility — reusable override/merge/file-input import triad
- **Net**: −301 lines from `events.js`, 6 of 9 Lizard violations resolved

---

## [3.24.05] - 2026-02-12

### Fixed — Code cleanup and minor fixes

- **Fixed**: `debugLog('warn', ...)` in custom API validation now uses `console.warn()` (debugLog has no level support)
- **Removed**: Unused `columns` parameter from `buildBulkItemRow()` in Bulk Edit
- **Fixed**: Stale `Updated:` comment on APP_VERSION docblock

---

## [3.24.04] - 2026-02-12

### Fixed — STAK-55: Bulk Editor retains selected items after close/reopen

- **Fixed**: Bulk Editor now starts with a clean selection every time it opens (STAK-55)
- **Removed**: `bulkEditSelection` localStorage persistence — selection no longer carries across sessions

---

## [3.24.03] - 2026-02-12

### Fixed — Goldback melt/retail/weight in Details Modal

- **Fixed**: Goldback melt values inflated 1000x in Details Modal — apply `GB_TO_OZT` conversion and denomination retail pricing

---

## [3.24.02] - 2026-02-11

### Added — STAK-44: Settings Log Tab Reorganization

- **Added**: Activity Log sub-tabs in Settings — Changelog, Metals, Catalogs, Price History (STAK-44)
- **Added**: Spot price history table with sortable columns (Timestamp, Metal, Spot Price, Source, Provider)
- **Added**: Catalog API call history table with failed entries highlighted in red
- **Added**: Per-item price history table with item name filter and sortable columns
- **Added**: Clear button with confirmation dialog for each log sub-tab
- **Added**: Lazy-rendering of sub-tab content on first activation

---

## [3.24.01] - 2026-02-11

### Fixed — Codacy code quality cleanup

- **Fixed**: Convert 8 `innerHTML` assignments to `textContent` where content is plain text from `formatCurrency()`
- **Fixed**: Remove stale `eslint-disable-line` comments referencing unloaded security plugin
- **Changed**: Add PMD `ruleset.xml` to exclude false-positive `InnaccurateNumericLiteral` rule
- **Changed**: Add `nosemgrep` suppression for 30 legitimate `innerHTML` uses in client-side rendering

---

## [3.24.00] - 2026-02-11

### Added — STAK-50: Multi-Currency Support

- **Added**: Multi-currency display with 17 supported currencies and exchange rate conversion (STAK-50)
- **Added**: Daily exchange rate fetching from open.er-api.com with localStorage caching and hardcoded fallback rates
- **Added**: Dynamic currency symbols in add/edit modal, Goldback denomination settings, and CSV export headers
- **Added**: Dynamic Gain/Loss labels — green "Gain:" or red "Loss:" on totals cards
- **Fixed**: Sticky header bleed-through when hovering table rows in first 4 columns
- **Fixed**: Codacy false positives via .eslintrc.json

---

## [3.23.02] - 2026-02-11

### Added — STAK-52: Bulk Edit pinned selections

- **Added**: Bulk Edit pinned selections — selected items stay visible at the top of the table when the search term changes (STAK-52)
- **Changed**: Extracted shared search filter helper and added master checkbox indeterminate state in Bulk Edit
- **Removed**: Dormant rEngine/rSynk/AI prototype files and references

---

## [3.23.01] - 2026-02-11

### Added — Goldback real-time estimation, Settings reorganization

- **Added**: Goldback real-time price estimation from gold spot (STAK-52)
- **Added**: User-configurable estimation premium modifier
- **Changed**: Settings sidebar — renamed Theme to Appearance, Tools to System
- **Changed**: Default estimation formula to pure 2x spot (modifier = 1.0)

---

## [3.23.00] - 2026-02-11

### Added — STAK-45: Goldback denomination pricing & type support

- **Added**: New `gb` weight unit option — Goldbacks stored as denomination value (1 gb = 0.001 ozt 24K gold)
- **Added**: New `js/goldback.js` module — save/load/record for manual denomination pricing
- **Added**: Settings > Goldback tab — enable/disable toggle, denomination price table, reference link
- **Added**: Goldback price history logging — timestamped data points per denomination on each save
- **Added**: `GOLDBACK_DENOMINATIONS` lookup table (0.5, 1, 2, 5, 10, 25, 50, 100 gb) with gold content
- **Added**: Denomination picker — swaps weight input for a select dropdown when gb unit is selected
- **Added**: Goldback Price History modal — filterable, sortable table with CSV export
- **Added**: Quick Fill — enter 1 Goldback rate to auto-calculate all denomination prices
- **Added**: Goldback exchange rate link opens in popup window (matches eBay pattern)
- **Added**: Bulk Edit — new Weight Unit field (oz/g/gb) for batch-converting items
- **Changed**: `computeMeltValue()` converts gb→ozt before spot multiplication
- **Changed**: `formatWeight()` accepts optional `weightUnit` param, displays "5 gb" for Goldback items
- **Changed**: Retail hierarchy updated: gb denomination > manual marketValue > melt (denomination pricing is authoritative for gb items)
- **Changed**: Bulk Edit weight column shows formatted weight with unit suffix
- **Changed**: CSV, ZIP CSV, and PDF exports include "Weight Unit" column
- **Changed**: CSV import reads "Weight Unit" column, defaults to 'oz'
- **Changed**: ZIP backup/restore includes goldback prices, price history, and enabled toggle
- **Changed**: Edit/duplicate item modal pre-fills gb weight unit correctly
- **Fixed**: Retail column and gain/loss display conditions now include gb denomination pricing
- **Fixed**: CSV, ZIP CSV, and PDF exports apply 3-tier retail hierarchy (manual > gb > melt)
- **Fixed**: Bulk edit denomination picker now applies correct weight value (was reading stale hidden input)

### Added — STAK-42: Persistent UUIDs for inventory items

- **Added**: Stable UUID v4 field on every inventory item — survives delete, reorder, and sort
- **Added**: `generateUUID()` helper with `crypto.randomUUID()` and RFC 4122 fallback for `file://`
- **Added**: Automatic UUID migration for existing items on load (no data loss)
- **Changed**: CSV, JSON, ZIP, and PDF exports now include UUID column
- **Changed**: CSV, JSON imports preserve existing UUIDs, generate for items without
- **Changed**: Bulk copy and add-item assign new UUIDs; edit preserves existing UUID
- **Fixed**: `sanitizeImportedItem()` safety net ensures no item lacks a UUID

### Added — STAK-43: Silent per-item price history recording

- **Added**: New `js/priceHistory.js` module — silently records timestamped retail/spot/melt data points per item
- **Added**: `item-price-history` localStorage key with UUID-keyed object structure
- **Added**: Recording triggers on item add, edit, inline edit, bulk edit, bulk copy, and spot price sync
- **Added**: Dedup rules — 24h throttle for spot-sync, 1% delta threshold, exact-duplicate suppression
- **Added**: ZIP backup includes `item_price_history.json`; restore uses union merge (not replace)
- **Added**: Vault backup/restore auto-included via `ALLOWED_STORAGE_KEYS`
- **Added**: `purgeItemPriceHistory()` and `cleanOrphanedItemPriceHistory()` for future storage management

---

## [3.22.01] - 2026-02-10

### Added — Form layout, bulk edit dropdowns, purity chips

- **Purity form layout**: Weight/Purity/Qty on single row
- **Bulk Edit**: Purity, Grade, Grading Authority as dropdowns
- Purity/fineness filter chips (enabled) and inline chips (disabled)
- Purity inline chip shows numerical value only

---

## [3.22.00] - 2026-02-10

### Added — STAK-22/24/25/27: Purity, PCGS quota, chart toggle, extraction

- **Added**: Purity (fineness) field — adjusts melt value formula across all calculation sites (STAK-22)
- **Added**: PCGS API daily quota usage bar in Settings (STAK-24)
- **Added**: Pie chart metric toggle — switch between Purchase, Melt, Retail, and Gain/Loss views (STAK-27)
- **Changed**: Extracted inline test loader to js/test-loader.js (STAK-25)
- **Changed**: CSV, PDF, and ZIP exports now include Purity column
- **Changed**: Seed data includes realistic purity values for sample items

---

## [3.21.03] - 2026-02-10

### Added — STAK-23: Search matches custom chip group labels

- **Fixed**: Search now matches items belonging to custom chip groups when searching by group label (STAK-23)

---

## [3.21.02] - 2026-02-10

### Added — Seed data, sample inventory & README overhaul

- **Seed spot history**: 6 months of baked-in price data (720 entries, 4 metals) — sparklines and price cards work from day one
- **Sample inventory**: 8 pre-configured items (3x ASE, 3x Gold Maple, Platinum Round, Palladium Bar) with grades, Numista IDs, and filter chips
- **Seed timestamp**: Spot cards show 'Seed · date' with shift+click hint for seeded users
- **Metals History**: Seed entries visible in history modal with StakTrakr source label
- **README overhaul**: Hero screenshot, feature showcase, Getting Started guide
- **Seed generator**: generate-seed-data.py processes CSV exports into seed JSON + embedded JS

---

## [3.21.01] - 2026-02-09

### Added — PCGS Verified Persistence & Lookup Enhancements

- **Persist verified**: Green checkmark survives reload, sort, and filter — `pcgsVerified` stored in data model with JSON/ZIP round-trip
- **Lookup fields**: PCGS lookup populates Name and Retail Price from API response
- **Cert icon**: Verified checkmark next to Cert# label in edit modal with dark/sepia theme support
- **History logging**: PCGS verify/lookup calls logged to Catalog History via `recordCatalogHistory()`

### Fixed

- **Numista icon**: Search icon no longer stripped after "Searching..." state (`textContent` → `innerHTML`)
- **Export fix**: `pcgsNumber` and `pcgsVerified` added to JSON and ZIP exports (was missing)
- **History label**: Renamed "Numista History" → "Catalog History" to reflect multi-provider support

---

## [3.21.00] - 2026-02-09

### Added — PCGS# Catalog Number & Cert Verification

- **PCGS# field**: New optional PCGS catalog number input on add/edit form with (i) info icon linking to PCGS Number Lookup. PCGS# included in item data model, normalization, CSV/JSON/PDF export, CSV/JSON import, and ZIP backup round-trip
- **PCGS# inline chip**: Blue `PCGS#786060` badge in the Name cell (disabled by default — enable in Settings > Table). Click to open PCGS CoinFacts page in popup window. Config-driven ordering via existing inline chip system
- **PCGS cert verification API**: New Settings > API > PCGS tab for bearer token configuration (1,000 requests/day). Save, Test Connection, and Clear Token buttons. Token stored locally with base64 encoding matching Numista pattern
- **Verify icon on grade tag**: PCGS-graded items with cert number + configured API show a small checkmark icon inside the grade tag. Click to verify cert — displays grade, population, pop higher, and price guide value in tooltip. Green checkmark on success, red flash on failure
- **PCGS# in search**: Search bar and advanced filters now match against PCGS catalog numbers
- **PCGS# in bulk edit**: New "PCGS Number" field in Settings > Tools > Bulk Edit

---

## [3.20.00] - 2026-02-09

### Added — Bulk Edit Tool, Change Log Settings Tab & Focus Group Fixes

- **Bulk Edit tool**: Full-screen modal in Settings > Tools to select multiple inventory items and edit fields, copy, or delete in bulk. Two-column layout with enable/disable field toggles (16 editable fields) on the left and searchable item table with checkboxes on the right. Numista Lookup button fills bulk edit fields from catalog data. Selection persists across modal open/close via localStorage
- **Change Log Settings tab**: Change Log relocated from standalone modal to new Settings > Log tab. Main page Log button now opens Settings at the Log tab directly. Font size and padding reduced to match Table/Chips tabs
- **Full Numista ID on chips**: Numista chips now display `N#12345` (full ID) instead of just `N#`
- **Year chip click-to-filter**: Clicking a year chip in the Name column now applies a year column filter

### Fixed

- **Chip word boundary matching**: Custom group patterns like "AW" no longer match inside words like "Silawa" — uses `\b` word boundary regex instead of substring matching
- **Shift-click chip hide**: Right-click blacklist and context menu popups now properly clean up document click listeners, fixing the issue where shift-click hide only worked once

---

## [3.19.00] - 2026-02-09

### Added — Filter Chip Enhancements

- **Category toggles**: Enable, disable, and reorder 10 filter chip categories (Metals, Types, Names, Custom Groups, Dynamic Names, Purchase Location, Storage Location, Years, Grades, Numista IDs) in Settings > Chips. Disabled categories are hidden from the filter bar. Order persists via `filterChipCategoryConfig` in localStorage
- **Chip sort order**: Sort chips within each category by Name (A-Z) or Qty (High→Low) from new inline dropdown or Settings > Chips. Bidirectional sync between both controls. Persists via `chipSortOrder` in localStorage
- **Config-driven chip rendering**: `renderActiveFilters()` refactored from 10 hard-coded category blocks to a single data-driven loop using category descriptor map — adding future categories requires only 2 entries instead of a new code block

---

## [3.18.00] - 2026-02-09

### Changed — API Settings Redesign

- **Numista first-class tab**: Numista API promoted from appended section to pinned first tab in unified API Configuration panel
- **Drag-to-reorder provider priority**: Metals provider tabs are drag-and-drop reorderable — tab position determines sync priority (position 1 = primary provider). Order persists across sessions via `apiProviderOrder` in localStorage
- **Header status row**: Compact per-provider connection indicators with last-used timestamps replace the old status summary
- **Clickable quota bars**: Usage bars in provider cards are now clickable to open the quota editor — dedicated Quota buttons removed
- **Streamlined provider cards**: Removed "Batch Optimized" badges, batch savings calculations, "Provider Information" links, Default/Backup buttons, and API base URL display
- **Unified button layout**: Each provider card simplified to Save, Save and Test, Clear Key
- **Renamed header actions**: "Sync All" → "Sync Metals", "Flush Cache" → "Flush Metals Cache", "History" → "Metals History", plus new "Numista History" button in header
- **Auto-select default provider**: Provider priority determined by tab order instead of manual Default/Backup button clicks

---

## [3.17.00] - 2026-02-09

### Added — Inline Name Chips, Search Expansion & Backup Fix

- **Inline Name chip settings**: New Settings > Table panel to enable/disable and reorder 6 inline chip types (Grade, Numista, Year, Serial #, Storage Location, Notes Indicator) in the Name cell. Config-driven rendering replaces hard-coded chip order
- **Table settings section**: New sidebar tab in Settings for table display controls (Visible rows, Inline Name chips). Grouping section renamed to "Chips"
- **3 new inline chips**: Serial # (purple badge with serial number), Storage Location (muted badge with truncated location), and Notes Indicator (document icon when item has notes) — all disabled by default, enable in Settings > Table
- **Search expansion**: 6 new fields searchable — Year, Grade, Grading Authority, Cert Number, Numista ID, and Serial Number. Works in both search bar and advanced filter text matching

### Fixed

- **ZIP backup/restore**: chipCustomGroups, chipBlacklist, chipMinCount, featureFlags, and inlineChipConfig now included in ZIP backup and properly restored. Also restores itemsPerPage, sortColumn, and sortDirection (previously backed up but never restored)

---

## [3.16.02] - 2026-02-09

### Added

- **Edit custom grouping rules**: Pencil icon on each rule row enables inline editing of label and patterns without deleting and recreating. Supports Enter to save, Escape to cancel

### Changed

- **Filter chip threshold relocated**: Moved from Settings > Site to Settings > Grouping alongside related chip controls

---

## [3.16.01] - 2026-02-09

### Fixed — API Settings & Numista Usage Tracking

- **Cache timeout persistence**: Per-provider cache timeout settings now persist across page reloads. Previously `cacheTimeouts` was written by the UI but never saved to localStorage or read by `getCacheDurationMs()`
- **Historical data for non-default providers**: `historyDays` default changed from `0` to `30` so Metals-API and MetalPriceAPI fetch historical data on first sync instead of current-only prices
- **Auto-sync all configured providers**: Page refresh now syncs all providers with API keys and stale caches, not just the default provider

### Added

- **Standalone "Save" button per provider**: Save API key, cache timeout, and history settings without triggering a connection test or price fetch. Brief "Saved!" confirmation replaces the alert dialog
- **Numista API usage progress bar**: Tracks API calls persistently across page reloads with automatic monthly reset. Shows `X/2000 calls` in Settings > API > Numista section

---

## [3.16.00] - 2026-02-09

### Added — Custom Chip Grouping & Smart Grouping Blacklist

- **Custom grouping rules**: Define chip labels with comma/semicolon-separated name patterns to create user-defined filter chips (e.g., "Washington Quarter" matching "Washington Quarter, America The Beautiful Quarter"). Managed in Settings > Grouping
- **Chip blacklist**: Right-click any name chip to suppress it from the chip bar. Blacklisted chips can be restored in Settings > Grouping
- **Dynamic name chips**: Auto-extract text from parentheses `()` and double quotes `""` in item names as additional filterable chips. Skips grade strings (BU, MS-XX) and text under 3 characters
- **Grouping settings panel**: New Settings > Grouping section consolidates Smart Name Grouping toggle (moved from Site), Dynamic Chips toggle, Blacklist management, and Custom Rules management
- **`DYNAMIC_NAME_CHIPS` feature flag**: Toggle dynamic chip extraction on/off, with URL override support (`?dynamic_name_chips=0`)

### Changed

- **Smart Grouping toggle relocated**: Moved from Settings > Site to Settings > Grouping for better organization with related chip features

---

## [3.14.01] - 2026-02-09

### Fixed

- **Name column truncation**: Added `max-width: 340px` constraint so long item names properly truncate with ellipsis instead of pushing the table wider than the viewport
- **Numista N# chips compacted**: Inline catalog tags shortened from `N#298883` to just `N#` — full catalog number shown on hover tooltip
- **Action icons clipped**: Reduced icon button size (2.4rem → 1.6rem) and tightened gap (0.25rem → 0.1rem) so Edit/Copy/Delete buttons fit within the Actions column without overflow

---

## [3.14.00] - 2026-02-09

### Added — Encrypted Portable Backup (.stvault)

- **Encrypted backup export**: New "Export Encrypted Backup" button in Settings > Files creates a password-protected `.stvault` file containing all inventory data, settings, API keys, and price history using AES-256-GCM encryption
- **Encrypted backup import**: "Import Encrypted Backup" reads a `.stvault` file, decrypts with the user's password, and restores all data with a full UI refresh
- **Password strength indicator**: Live strength bar (Weak → Very Strong) and password match validation in the vault modal
- **Crypto fallback**: Uses native Web Crypto API (PBKDF2 + AES-256-GCM); falls back to forge.js (~87KB) for Firefox on `file://` protocol where `crypto.subtle` is unavailable
- **Binary vault format**: 56-byte header (magic bytes, version, PBKDF2 iterations, salt, IV) followed by authenticated ciphertext — portable across devices and browsers

---

## [3.12.02] - 2026-02-08

### Fixed

- **NGC cert lookup**: Cert tag click now opens NGC with query params (`CertNum`, `Grade`, `lookup`) so the actual coin details display instead of the blank lookup form
- **Name column overflow**: Long item names no longer push Source and Actions columns off-screen. Name text truncates with ellipsis; Year, N#, and Grade tags always stay visible via flex layout
- **"- Route 66" chip**: Leading dash/punctuation stripped from normalized chip names after suffix removal
- **Source column display**: URL-like sources (e.g., "apmex.com") now display the domain name only ("apmex") with a link icon; plain text sources show without icon

### Added

- **"Lunar Series" chip**: Items with "Year of the" in the name (e.g., "Year of the Dragon") now group under a "Lunar Series" filter chip
- **Numista Sets support**: New "Set" inventory type with purple color. Numista S-prefix IDs (e.g., S4203) route to the correct `set.php` URL pattern instead of `pieces{ID}.html`

---

## [3.12.01] - 2026-02-08

### Fixed — Sticky header

- **Sticky header fix**: Column headers now correctly pin at the top of the scrollable table during vertical scroll. Removed inline `position: relative` set by column-resize JS that overrode CSS `position: sticky` on all non-Actions headers
- **Scroll container fallback**: Portal scroll container now has a CSS `max-height: 70vh` fallback so sticky headers work even before JS measures exact row heights
- **Specificity fixes**: Removed `position: relative` from `th[data-column="purchasePrice"]` and `th.icon-col` CSS rules that outranked the sticky rule
- **Overflow fix**: `.table-section` now uses `overflow: visible` to prevent base `section{overflow:hidden}` from creating a competing scroll context

---

## [3.12.00] - 2026-02-08

### Feature — Portal View (Scrollable Table)

#### Added

- **Portal view**: Inventory table now renders all items in a scrollable container with sticky column headers — replaces slice-based pagination
- **Visible rows control**: Dropdown (10 / 15 / 25 / 50 / 100) sets the viewport height of the scrollable table; users scroll to see remaining items
- **Sticky headers**: Column headers stay pinned at the top during vertical scroll via CSS `position: sticky`

#### Changed

- **"Items per page" → "Visible rows"**: Label updated in both the table footer dropdown and the Settings modal
- **Table footer simplified**: Item count + visible-rows dropdown only; pagination bar (first/prev/1/2/3.../next/last) removed entirely

#### Removed

- **Pagination controls**: `calculateTotalPages()`, `renderPagination()`, `goToPage()` functions removed from `pagination.js`
- **Placeholder rows**: Empty padding rows no longer rendered to maintain fixed table height
- **`currentPage` state**: Page tracking variable and all associated resets removed from state, events, search, filters, and settings modules
- **Pagination CSS**: All `.pagination-*` rules and responsive overrides deleted

---

## [3.11.00] - 2026-02-08

### Feature — Unified Settings Modal

#### Added

- **Settings modal**: Consolidated API, Files, and Appearance into a single near-full-screen modal with sidebar navigation (Site, API, Files, Cloud, Tools)
- **Settings button**: Gear icon replaces API, Files, and Theme buttons in the header — now just About + Settings
- **Theme picker**: 3-button theme selector (Light, Dark, Sepia) in Site Settings replaces the cycling toggle button
- **Items per page persistence**: Items-per-page setting now persists to localStorage via `ITEMS_PER_PAGE_KEY` — no longer resets to 25 on reload
- **Tabbed API providers**: API provider configuration uses tabbed panels (Metals.dev | Metals-API | MetalPriceAPI | Custom) instead of scrollable list
- **Settings footer**: Storage usage and app version displayed in the modal footer bar
- **Cloud & Tools placeholders**: Sidebar sections ready for future BYO-Backend sync and bulk operations
- **Bidirectional control sync**: Filter chip threshold and smart name grouping controls sync between inline controls and Settings modal

#### Changed

- **Header simplified**: 4 header buttons (About, API, Files, Theme) reduced to 2 (About, Settings)
- **API providers inline**: Provider configuration moved from separate `apiProvidersModal` into tabbed panels within the API section
- **Backup reminder**: Now opens Settings → Files section instead of standalone Files modal

#### Removed

- **`apiModal`**: Standalone API modal replaced by Settings → API section
- **`filesModal`**: Standalone Files modal replaced by Settings → Files section
- **`apiProvidersModal`**: Standalone providers modal replaced by inline tabbed panels
- **`appearanceBtn`**: Theme cycling button replaced by Settings → Site → Theme picker

## [3.10.01] - 2026-02-08

### Fix — Numista iframe blocked on hosted sites + column sort regression

#### Fixed

- **Numista iframe → popup**: Numista sets `X-Frame-Options: SAMEORIGIN`, which blocks iframe embedding on hosted deployments (worked on `file://` but not `www.staktrakr.com`). Replaced the iframe modal with a popup window that works everywhere. Removed modal HTML, iframe CSS, and navigation history code
- **Gain/Loss and Source column sorting**: Skip guard used `headers.length - 3` from when Edit/Notes/Delete were 3 separate columns — after merging into a single Actions column, Gain/Loss (index 9) and Source (index 10) were incorrectly skipped. Fixed to `headers.length - 1`
- **Gain/Loss and Source column resizing**: Same `length - 3` guard also blocked resize handles on these columns

## [3.10.00] - 2026-02-08

### Feature — Serial #, Numista UX, Filter Chips & Column Tweaks

#### Added

- **Serial # field**: New optional Serial Number input in the add/edit form (between Storage Location and Catalog N#) for bars and notes with physical serial numbers
- **Serial # in exports/imports**: Serial Number included in CSV, JSON, ZIP, and PDF exports; imported from CSV and JSON with `Serial Number` / `serialNumber` column fallbacks
- **Enhanced Numista no-results**: When Numista search returns no results, the modal now shows a retry search box (pre-filled with original query) and a quick-pick list of popular bullion items (Silver Eagles, Maple Leafs, Krugerrands, etc.)
- **Year/Grade/N# filter chips**: Year, Grade, and Numista ID values now generate clickable filter chips in the chip bar (respects minCount threshold)
- **Year sort tiebreaker**: Items with identical names now sub-sort by Year when sorting the Name column

#### Changed

- **Source column**: "Location" table header renamed to "Source" with storefront icon for clarity (data field unchanged: `purchaseLocation`)
- **eBay search includes year**: Year is now appended to eBay search URLs between metal and name for more precise results
- **Form layout**: Notes field moved to end of form (next to Catalog N#); Serial # takes its former position next to Storage Location

#### Fixed

- **Numista Aurum category**: Removed incorrect `'Aurum': 'banknote'` mapping — Goldbacks are "Embedded-asset notes" on Numista, which isn't a valid API category filter. Aurum items now search without a category constraint, returning correct results
- **eBay search attribute escaping**: Switched from `sanitizeHtml()` to `escapeAttribute()` for `data-search` attributes — item names with double quotes no longer truncate the search URL

## [3.09.05] - 2026-02-08

### Feature — Grade, Grading Authority & Cert # Fields + eBay Search Fix

#### Added

- **Grade field**: New optional Grade dropdown with 3 optgroups — Standard (AG through BU), Mint State (MS-60 through MS-70), and Proof (PF-60 through PF-70)
- **Grading Authority field**: Dropdown to select grading service — PCGS, NGC, ANACS, or ICG
- **Cert # field**: Free-text input for certification number
- **Inline Grade tag**: Color-coded grade badge on inventory table Name cell (after N# tag) — PCGS blue, NGC gold, ANACS green, ICG purple. Theme-aware across light/dark/sepia
- **Cert verification click**: Grade tags with cert numbers are clickable — opens grading service's cert lookup page in a popup window (PCGS and NGC direct lookup, ANACS and ICG generic verify pages)
- **Grade tooltip**: Hover shows grading details — authority + cert# when available, or just grade
- **Grade in CSV/JSON/PDF export**: Grade, Grading Authority, and Cert # columns added to all export formats
- **Grade in CSV/JSON import**: Reads grade, authority, and cert# from imported files with multiple column name fallbacks

#### Fixed

- **eBay search URL sanitization**: Item names containing quotes `"`, parentheses `()`, or backslashes `\` (allowed since v3.09.04) no longer act as eBay search operators. New `cleanSearchTerm()` strips these characters before building search URLs

## [3.09.04] - 2026-02-08

### Feature — Year Field + Inline Year Tag + Form Restructure

#### Added

- **Year field**: New optional Year field in add/edit form, stored as `year` in the data model. Accepts single years ("2024") or ranges ("2021-2026")
- **Inline Year tag**: Year badge displayed on the inventory table Name cell (before the N# tag) with muted informational styling and theme-aware colors
- **Year in Numista field picker**: Replaced Metal with Year in the "Fill Form Fields" picker — Numista's year range is editable before filling
- **Year in CSV/JSON export**: "Year" column added to standard CSV export after "Name"; `year` field added to JSON export
- **Year in CSV import**: Reads "Year", "year", or "issuedYear" columns from imported CSV files

#### Changed

- **Form layout restructured**: Name (wider, 60%) paired with Year (40%); purchase fields grouped together: Purchase Date | Purchase Price, Purchase Location | Retail Price
- **Removed Metal from Numista picker**: Numista returns "Alloy/Other" which never matches form options — removed to reduce confusion
- **Data migration**: Existing items with `issuedYear` (from Numista CSV imports) automatically migrate to `year` on load

## [3.09.03] - 2026-02-08

### Patch — Numista Field Picker Layout + Smart Category Search

#### Fixed

- **Numista field picker layout**: Replaced broken `<fieldset>` + flexbox with `<div>` + CSS Grid (`grid-template-columns: auto auto 1fr`) — fixes checkboxes centering and labels/inputs pushed off-screen across browsers
- **Numista search `category` param**: `searchItems()` now maps `filters.category` instead of `filters.metal` to the Numista API `category` parameter

#### Added

- **Smart category search**: Numista search now maps the form's Type field to Numista categories (Coin→coin, Bar/Round→exonumia, Note/Aurum→banknote) for more relevant results
- **Metal-augmented queries**: When Metal is set and not already in the search text, it's prepended to the query (e.g., Metal=Silver + "Eagle" → searches "Silver Eagle")

## [3.09.02] - 2026-02-08

### Patch — Numista API v3 Integration Fix

#### Fixed

- **Numista base URL**: Changed from `/api/v3` to `/v3` — the `/api` prefix does not exist in the Numista API
- **Numista lookup endpoint**: Changed from `/items/{id}?apikey=` to `/types/{id}?lang=en` with `Numista-API-Key` header authentication
- **Numista search endpoint**: Changed from `/items/search` to `/types` with `Numista-API-Key` header authentication
- **Numista search parameters**: `limit` → `count` (capped at 50), `country` → `issuer`, `metal` → `category`, added `page` and `lang=en`
- **Numista search response**: Changed from `data.items` to `data.types` to match actual API response structure
- **Numista field mapping**: `year` composed from `min_year`/`max_year`, `country` from `issuer.name`, `composition` handles string or object, `diameter` from `size`, `type` from `category`, `mintage` hardcoded to 0 (per-issue not per-type), `estimatedValue` from `value.numeric_value`, `imageUrl` from `obverse_thumbnail` with nested fallback, `description` from `comments`
- **localStorage whitelist**: Added `staktrakr.catalog.cache` and `staktrakr.catalog.settings` to `ALLOWED_STORAGE_KEYS` — without these, `cleanupStorage()` deleted catalog data on every page load

## [3.09.01] - 2026-02-07

### Patch — Name Chips + Silver Contrast Fix + Duplicate Chip Fix

#### Added

- **Normalized name chips**: Filter chip bar now shows grouped name chips (e.g., "Silver Eagle 15/164") that aggregate year variants, grades, and editions into a single clickable chip. Uses `normalizeItemName()` with the 280-entry `PREBUILT_LOOKUP_DATA` dictionary for grouping and `simplifyChipValue()` for display names. Respects the minCount dropdown threshold and the `GROUPED_NAME_CHIPS` feature flag (Smart Grouping toggle)
- **Name chip click filtering**: Clicking a name chip filters the inventory to all matching variants (e.g., clicking "Silver Eagle" shows all American Silver Eagle items regardless of year). Click again to toggle off. Uses the existing grouped filter path in `applyQuickFilter()`

#### Fixed

- **`normalizeItemName()` rewrite — precise starts-with matching**: Replaced the fuzzy matching algorithm (partial word match, reverse contains) with a precise "starts-with, longest match wins" strategy. The old algorithm matched any 2 shared words — causing "American Silver Eagle" to incorrectly match "American Gold Eagle" (sharing "American" + "Eagle"), since Gold came first in the lookup array. The new algorithm strips year prefixes (with mint marks like P/S/D), weight prefixes, then checks if the cleaned name starts with a `PREBUILT_LOOKUP_DATA` entry at a word boundary. For items not in the lookup, suffix stripping removes grading (PCGS, NGC, NCG), grades (MS70, PR69), condition (BU, Proof, Antiqued, Colorized), and packaging (In Capsule, TEP, Sealed) to produce a clean base name
- **Silver chip contrast on dark/sepia themes**: Silver metal chip text was nearly invisible on initial page load in dark and sepia themes — white text on a light gray background. Root cause: `renderActiveFilters()` computed contrast colors against `:root` CSS variables before the `data-theme` attribute was applied. Fix: apply the saved theme attribute before Phase 13 rendering, so `var(--silver)` resolves to the correct theme value when `getContrastColor()` runs
- **Duplicate location chips**: Clicking a purchase or storage location chip produced two chips — a category summary chip and an active filter chip. Expanded the dedup skip list in the active filters loop to include `purchaseLocation`, `storageLocation`, and `name` fields alongside the existing `metal` and `type`

## [3.09.00] - 2026-02-07

### Increment 8 — Filter Chips Cleanup + Spot Card Hint

#### Added

- **Spot card shift+click hint**: When no spot price data exists for a metal, the timestamp area shows "Shift+click price to set" instead of blank — serves as discoverability training for the shift+click manual entry pattern. Hint disappears once a price is entered (manual or API)

#### Changed

- **Default chip threshold**: Filter chips now appear at 3+ items by default (was 100+), making them immediately useful on typical inventories
- **Unified threshold application**: Purchase and storage location chips now respect the minCount dropdown — previously they showed all locations regardless of count
- **Date chips removed**: Date-based filter chips are removed entirely (too granular to be useful as filters)
- **"Unknown" location chips suppressed**: Empty and "Unknown" purchase/storage location values no longer produce filter chips
- **Dropdown filters migrated to activeFilters**: Type and Metal `<select>` dropdowns now write to the unified `activeFilters` system and update chips immediately

#### Removed

- **Dead `updateTypeSummary()` function**: Removed the legacy chip renderer and its `#typeSummary` container — fully replaced by `renderActiveFilters()`
- **Dead `columnFilters` state**: Removed the legacy filter object and all reads/writes across `state.js`, `filters.js`, `events.js`, and `search.js` — all filtering now uses the unified `activeFilters` system
- **Stale console.log statements**: Removed 9 debugging `console.log()` calls from chip rendering (opt-in `DEBUG_FILTERS` logging preserved)

#### Fixed

- **Chips update after all mutations**: `renderActiveFilters()` is now called after delete, backup restore, inventory wipe, and add/edit modal submit — previously chips could show stale counts after these operations

## [3.08.01] - 2026-02-07

### Patch — Move Metals Totals Above Inventory Table

#### Changed

- **Layout reorder**: Moved the per-metal portfolio summary cards (`.totals-section`) above the inventory table so the page flows: Spot Price Cards → Metals Totals → Search/Table/Pagination. Puts the portfolio bottom line closer to spot prices for an overview-first information hierarchy
- **Sparkline colors match metal accent**: Sparkline trend lines now read the active theme's CSS custom properties (`--silver`, `--gold`, `--platinum`, `--palladium`) instead of hardcoded colors, matching the totals card accent bars across all themes
- **Default rows per page**: Changed from 10 to 25; removed 10 and 15 row options from the dropdown (25 / 50 / 100 remain)

## [3.08.00] - 2026-02-07

### Increment 7 — Spot Price Card Redesign with Sparkline Trends

#### Added

- **Background sparkline charts**: Each spot price card now shows a Chart.js line chart with gradient fill behind the price, visualizing price trends from spot history. Minimum 2 data points required; empty state shows the card normally without a sparkline
- **Trend range dropdown**: Per-card `<select>` with 7d / 30d / 60d / 90d options. Preference saved to localStorage per metal, restored on load
- **Sync icon**: Compact SVG refresh icon in the card header replaces the old Sync button. Spins during API fetch via CSS animation. Disabled when no API is configured
- **Shift+click manual price entry**: Hold Shift and click the spot price value to open an inline `<input>` — same pattern as inventory table inline editing. Enter saves, Escape/blur cancels. New data point appears in sparkline immediately

#### Changed

- **Removed expandable button panel**: The old Sync / Add / History button row (`.spot-actions`) and manual input form (`.manual-input`) are removed entirely. Sync is now an icon, manual entry is shift+click, and history is the sparkline itself
- **Card layout**: Spot cards now use a header row (label + controls) above the price value, with an absolutely-positioned canvas behind all content for the sparkline
- **Spot history dedup**: `recordSpot()` now performs full-array dedup (via `.some()`) when an explicit timestamp is provided (historical backfill), preventing duplicate entries on repeated syncs with 30-day backfill

#### Fixed

- **Metals.dev timeseries endpoint**: Batch endpoint was using non-existent `/metals/spot?days=N` — replaced with actual `/timeseries?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`. Response parser rewritten to handle the real `{ rates: { "date": { metals: { gold: N } } } }` structure
- **History metal name mismatch**: `METALS[metal]?.name` used lowercase key (`"silver"`) against uppercase `METALS` keys (`"SILVER"`), causing history entries to record with wrong metal name. Fixed to use `Object.values(METALS).find()` lookup

#### Technical

- New `sparklineInstances` state object for Chart.js instance cleanup
- New `SPOT_TREND_RANGE_KEY` localStorage key with security whitelist entry
- `updateAllSparklines()` called from: init, sync, cache refresh, theme change, range dropdown change, manual price save
- Capture-phase shift+click listener for `.spot-card-value` elements

## [3.07.03] - 2026-02-07

### Patch — Spot History Deduplication Fix

#### Fixed

- **Duplicate spot history entries on repeated syncs**: `recordSpot()` only compared against the last array entry, so batch historical backfills (30 days × 4 metals) re-inserted the same timestamp+metal pair on every sync. Now performs full-array dedup via `.some()` when an explicit timestamp is provided (historical backfill), while keeping the fast O(1) tail check for real-time entries

## [3.07.02] - 2026-02-07

### Patch — Shift+Click Inline Editing

#### Added

- **Shift+click inline editing**: Power user shortcut — hold Shift and click any editable cell (Name, Qty, Weight, Purchase Price, Retail Price, Purchase Location) to edit in place. Enter saves, Escape cancels, clicking away cancels. No visible UI indicator — keyboard-only trigger
- **Blur-to-cancel**: Clicking outside an active inline edit now cancels it, matching standard spreadsheet UX

#### Changed

- **Removed pencil icon**: Name column no longer shows the pencil edit icon — shift+click replaces it for all 6 editable columns
- **Removed save/cancel icons**: Inline edit fields no longer show ✔️/✖️ buttons — Enter and Escape are the only controls, keeping the cell compact
- **Hidden number spinners**: Numeric fields (Qty, Weight, prices) no longer show browser-native up/down arrows that competed for space in narrow cells
- **Full table re-render on save**: Inline edits now trigger `renderTable()` instead of patching a single cell — ensures Gain/Loss recalculates, summary cards update, and eBay link structure restores correctly
- **Sort header shift guard**: Shift+clicking a column header no longer triggers a sort, preventing accidental sorts while aiming for cell edits

## [3.07.01] - 2026-02-07

### Patch — Light & Sepia Theme Contrast Pass

#### Changed

- **Light theme: clean backgrounds**: Replaced gray-blue layering (`#e7edf2` / `#d7dfe6` / `#bec7cf`) with a clean light palette (`#eef2f7` / `#e2e8f0` / `#d5dce6`). Cards now use pure white (`#ffffff`) for clear visual elevation against the cool gray page background. All text tokens pass WCAG AAA
- **Table zebra striping**: Replaced hardcoded dark-theme `rgba(30, 41, 59)` overlays with theme-aware `var(--bg-secondary)` / `var(--bg-tertiary)` tokens so row alternation and hover work correctly in all three themes
- **Table hover cleanup**: Removed `filter: brightness()` and cell-level hover transitions from inventory table — hover is now a simple row background change with no lag
- **Removed sticky action columns**: Edit/Copy/Delete columns no longer use `position: sticky` — table fits viewport without horizontal scroll, eliminating the z-index and background inheritance complexity
- **Confidence styling**: Replaced opacity-based dimming with `color: var(--text-muted)` for estimated Retail/Gain-Loss values — readable in all themes while italic style distinguishes from bold confirmed values
- **Metal/type text contrast**: Darkened metal (`--silver`, `--gold`, `--platinum`, `--palladium`) and type (`--type-coin-bg`, `--type-bar-bg`, etc.) color tokens for both light and sepia themes so they pass WCAG AA (4.5:1) when used as text colors in table cells
- **Sepia theme: removed global sepia filter**: Deleted `filter: sepia(30%)` that over-saturated the entire UI and made WCAG ratios unpredictable from CSS values alone. The warm palette is now controlled entirely by custom properties
- **Sepia theme: WCAG text contrast fix**: Darkened `--text-secondary` (`#5a4a36` → `#4f3f2c`) and `--text-muted` (`#6f604e` → `#5c4e3a`) — muted text was failing WCAG AA at 3:1 ratio, now passes at 6.7:1
- **Sepia theme: warm info color**: Changed `--info` from bright sky-blue (`#0ea5e9`) to desaturated warm teal (`#1d7a8a`) to match the warm palette
- **Sepia theme: visible borders and shadows**: Fixed `--border-hover` (was identical to `--bg-tertiary`, now `#a89878`), strengthened `--shadow-sm` opacity from 0.05 to 0.12, lightened `--bg-tertiary` (`#c0b198` → `#d0c4a8`) for better separation

## [3.07.00] - 2026-02-07

### Increment 6 — Portfolio Visibility Overhaul

#### Added

- **Retail/Gain-Loss confidence styling**: Retail and Gain/Loss columns now visually differentiate estimated values (melt fallback — italic, 65% opacity) from confirmed values (manual retail — bold). Estimated gains carry the same muted styling so users can see at a glance which items have researched retail prices vs spot-derived estimates
- **"All Metals" summary card**: New combined totals card showing portfolio-wide Items, Weight, Purchase Price, Melt Value, Retail Value, and Gain/Loss. Previously the JS calculated these but the HTML card was missing — totals silently failed to display
- **Avg Cost/oz metric**: Each metal card and the combined card now show average purchase cost per troy ounce (total purchase / total weight). Key stacker metric for evaluating cost basis across a position
- **Gain/Loss "bottom line" emphasis**: The Gain/Loss row in each summary card now has a top separator, bolder label, and larger font to visually anchor it as the portfolio's bottom line
- **Metal detail modal: full portfolio breakdown**: Clicking a metal card header now shows Purchase, Melt, Retail, and Gain/Loss per type and per purchase location in a compact 2x2 grid layout. Previously only showed purchase price as a single value. Chart tooltips also show the full quartet
- **All Metals breakdown modal**: Clicking the "All Metals" card header opens a portfolio-wide breakdown — left panel shows by-metal allocation (Silver, Gold, Platinum, Palladium) with full financial grid, right panel shows by-location across all metals. Pie charts and tooltips included

#### Changed

- Removed inline asterisk `*` indicator from Retail column in favor of CSS class-based confidence styling (`retail-confirmed`, `retail-estimated`, `gainloss-estimated`)
- Removed orphaned `.about-badge-static` CSS class
- Metal detail breakdown rows restructured: header (name + count/weight) + 2x2 financial grid replaces the old stacked single-value layout

## [3.06.02] - 2026-02-07

### Patch — eBay Search Split (Buy vs Sold)

#### Changed

- **eBay search split**: Purchase column search icon now opens eBay **active listings** (items for sale), Retail column search icon opens eBay **sold listings** (completed sales for price research)
- **New functions**: Split `openEbaySearch()` into `openEbayBuySearch()` (active, Buy It Now, best match) and `openEbaySoldSearch()` (completed, most recent) in `js/utils.js`
- **Retail column search icon**: Added magnifying glass SVG icon to the Retail column, matching the Purchase column icon style

## [3.06.01] - 2026-02-07

### Patch — CSS Cleanup, Icon Polish, About Modal Overhaul

#### Changed

- **Dead CSS cleanup**: Removed ~125 lines of orphaned `.collectable-*` selectors (toggle, card, status, icon theming) left over from Increment 1's collectable feature removal
- **eBay search icon**: Replaced oversized emoji-in-red-circle with a clean 12px monoline SVG magnifying glass using `currentColor` — themes automatically, matches the external-link icon style
- **About modal**: Rewrote description to mention open source, privacy, and live site link. Added GitHub, Community, and MIT License links
- **Version modal**: Removed duplicated privacy notice from the What's New popup (kept in the first-visit acknowledgment modal)
- **Ack modal**: Updated description text to match the About modal wording
- **JS cleanup**: Removed orphaned `.collectable-status` querySelector from `hideEmptyColumns()` in inventory.js

## [3.06.00] - 2026-02-07

### Rebrand — StackTrackr → StakTrakr

#### Changed

- **Full rebrand to StakTrakr**: Updated canonical brand name from "StackTrackr" to "StakTrakr" across the entire codebase — inline SVG banner (all 3 themes), standalone logo SVG, HTML titles, aria-labels, footer copyright, about/acknowledgment modals, debug log prefix, backup/export templates, PDF headers, storage reports, constants, Docker labels/service names, and all documentation
- **Domain-based auto-branding**: Updated domain map to support three domains — `staktrakr.com` (primary, shows "StakTrakr"), `stackrtrackr.com` (legacy, shows "StackrTrackr"), `stackertrackr.com` (shows "Stacker Tracker"). Each domain automatically displays its own brand name via the existing `BRANDING_DOMAIN_OPTIONS` system
- **localStorage key prefix migration**: Renamed `stackrtrackr.*` keys to `staktrakr.*` (debug, catalog cache, catalog settings). Debug flag checks both old and new keys for backwards compatibility
- **Footer domain**: Default domain now shows `staktrakr.com`, with auto-detection for all three owned domains
- **Reddit community link**: Hardcoded to `/r/stackrtrackr/` (subreddit name unchanged)
- **GitHub link**: Added link to `github.com/lbruton/StackTrackr` in footer
- **Dynamic SVG logo**: Logo tspan text and SVG viewBox width now update per domain at page load — prevents clipping on longer names like "Stacker Tracker"
- **Dynamic footer brand**: Footer "Thank you for using ..." text now updates to match the domain brand name

## [3.05.04] - 2026-02-07

### Increment 5 — Fraction Input + Duplicate Item Button

#### Added

- **Fraction input for weight field**: Weight input now accepts fractions like `1/1000` or `1 1/2` (mixed numbers), auto-converted to decimal before saving. Input changed from `type="number"` to `type="text"` with `inputmode="decimal"` for mobile numeric keyboard
- **Duplicate item button**: New copy icon in the table action column (between Edit and Delete). Opens the add modal pre-filled with all fields from the source item — date defaults to today, qty resets to 1, serial clears. Ideal for entering mixed-date sets of the same coin

#### Changed

- **Notes column removed from table**: Removed the Notes icon column (15 → 14 columns). Notes remain accessible in the add/edit modal. Fixed sticky column CSS offsets for the new 3-icon layout (edit/duplicate/delete)
- **Sticky column background fix**: Removed a later CSS rule that set `background: transparent` on sticky icon columns, which would have made headers see-through during horizontal scroll

## [3.05.03] - 2026-02-07

### Increment 4 — Date Bug Fix + Numista API Key Simplification

#### Fixed

- **Date display off by one day**: `formatDisplayDate()` used `new Date("YYYY-MM-DD")` which parses as UTC midnight — in US timezones this rolled back to the previous day. Now parses the date string directly via `split('-')` with no `Date` constructor, eliminating timezone ambiguity entirely
- **Numista API key never persisted**: `catalog_api_config` was missing from `ALLOWED_STORAGE_KEYS`, so `cleanupStorage()` deleted the saved config on every page load

#### Changed

- **Numista API key storage simplified**: Removed the non-functional AES-256-GCM encryption system (~115 lines of `CryptoUtils` class) that required a per-session password. Replaced with base64 encoding matching the metals API key pattern — one input, no password, persists across sessions
- **Numista settings UI**: Removed encryption password field and session-unlock flow. Added Numista API signup link with free tier info

## [3.05.02] - 2026-02-07

### Changed

- **Full rebrand**: Renamed "StackrTrackr" to "StackTrackr" across entire codebase — SVG banner (all 3 themes), standalone logo, HTML titles, aria-labels, debug logs, backup/export templates, PDF headers, storage reports, constants, Docker labels, documentation, and CLAUDE.md
- **Footer cleanup**: Removed outdated "previous build" and "alpha release" links, simplified to subreddit and GitHub Issues reporting
- **Copyright**: Updated footer from "2025" to "2025-2026"

## [3.05.01] - 2026-02-07

### Fixed

- **What's New modal**: Changelog and roadmap sections now populate correctly — fetch points to root `CHANGELOG.md` instead of missing `docs/changelog.md`
- **Changelog parser**: Updated regex to match Keep a Changelog format (`## [X.XX.XX]`) instead of legacy `### Version X.XX.XX` format
- **GitHub URLs**: All 3 repository links (aboutModal, versionModal, View Full Changelog) updated from `Precious-Metals-Inventory` to `StackTrackr`
- **Embedded fallbacks**: Updated What's New and Roadmap fallback data with current Increment 3 content
- **Created `docs/announcements.md`**: Primary data source for What's New and Development Roadmap modal sections

## [3.05.00] - 2026-02-07

### Increment 3 — Unified Add/Edit Modal

#### Changed

- Merged `#addModal` and `#editModal` into a single `#itemModal` that switches between "add" and "edit" mode via `editingIndex`
- Consolidated two separate form submit handlers into one unified handler with `isEditing` branch
- Removed ~100 lines of duplicated edit modal HTML, ~20 duplicate element declarations, ~20 duplicate element lookups
- Files touched: `index.html`, `js/state.js`, `js/init.js`, `js/events.js`, `js/inventory.js`, `css/styles.css`, `js/utils.js`

#### Fixed

- **Weight unit bug**: edit modal was missing the weight unit `<select>` — used a fragile `dataset.unit` attribute invisible to the user. Now both modes share the real `<select id="itemWeightUnit">`
- **Price preservation**: empty price field in edit mode now preserves existing purchase price instead of zeroing it out
- **Weight precision**: `toFixed(2)` to `toFixed(6)` for stored troy oz values — sub-gram weights (e.g., 0.02g Goldbacks = 0.000643 ozt) were being rounded to zero, causing validation failures
- **$0 purchase price display**: items with price=0 (free/promo) now show `$0.00` instead of a dash, and gain/loss correctly computes full melt as gain
- **Qty-adjusted financials**: Retail, Gain/Loss, and summary totals now multiply per-unit `marketValue` and `price` by `qty`. Previously showed single-unit values for multi-qty line items
- **Gain/Loss sort order**: `js/sorting.js` cases 8 (Retail) and 9 (Gain/Loss) now use qty-adjusted totals matching the display
- **Spot price card colors**: `updateSpotCardColor()` in `js/spot.js` now compares against the last API/manual entry with a different price, so direction arrows (green / red) persist across page refreshes instead of always resetting to unchanged

## [0.1.0] - 2024-08-31

### Initial Release

- Initial StackTrackr precious metals inventory tracking application
- Client-side localStorage persistence with file:// protocol support
- Multiple spot price API providers (metals-api.com, fcsapi.com, etc.)
- CSV import/export functionality with ZIP backup support
- Premium calculation system for precious metals (spot price + premium)
- Responsive theme system with four modes (light/dark/sepia/system)
- Real-time search and filtering capabilities across inventory
- PDF export with customizable formatting and styling
- Comprehensive debugging and logging system
- Security-focused development patterns and file protocol compatibility
- RESTful API abstraction layer supporting multiple data providers
- Advanced data manipulation utilities for date parsing and currency conversion

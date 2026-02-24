# Design: Inventory Settings UI Redesign + Cloud Consolidation

**Date:** 2026-02-24
**Issues:** STAK-317 (User Convenience), STAK-318 (ui-design Inventory)
**Branch:** design/317-318-inventory-ui
**Status:** Approved

---

## Summary

Redesign the Inventory Settings panel to match the Cloud Sync panel aesthetic, consolidate Cloud Sync into Inventory Settings (hiding the Cloud tab until 2+ providers exist), and add a Quick Stats companion card to the Bulk Editor.

---

## Goals

- Replace the plain `settings-fieldset` + `settings-card` pattern with `cloud-provider-card`-style components throughout `#settingsPanel_system`
- Move Cloud Sync content (Dropbox card + beta banner) into Inventory Settings
- Hide the Cloud sidebar nav item when fewer than 2 providers are configured
- Fix the Bulk Editor half-width issue by pairing it with an Inventory Summary card

---

## Panel Structure

The Inventory Settings panel (`#settingsPanel_system`) is divided into four logical groups, each rendered as a 2-column `settings-card-grid` of `cloud-provider-card` components.

### Group 1: Bulk Editor (2-column)

| Left card | Right card |
|---|---|
| ✏ Bulk Editor (BETA) | 📊 Inventory Summary |
| Existing bulk editor button | Item count, melt value, last modified |

The Inventory Summary card reads from existing globals — no new API calls:
- Item count: `loadData()` array length
- Melt value: `window.portfolioTotals.meltValue` (or equivalent)
- Last modified: most recent item `updatedAt` timestamp

### Group 2: Import (2-column)

| Left card | Right card |
|---|---|
| ↓ Import | 🔗 Third-Party |
| CSV / JSON / ZIP buttons + progress bar | Numista Import / Merge buttons |

### Group 3: Export (2-column)

| Left card | Right card |
|---|---|
| ↑ Export | 🔒 Encrypted Backup |
| CSV / JSON / PDF / ZIP export buttons | AES-GCM vault Export + Restore buttons |

### Group 4: Cloud Backup (2-column, conditional)

Shown only when at least one cloud provider is connected. Hidden entirely otherwise.

| Left card | Right card |
|---|---|
| ☁ Dropbox (existing `cloud-provider-card`, relocated) | 🐉 Cloud Sync Beta |
| Status rows, Backup/Restore/Sync Now/Advanced buttons | Beta warning text + Privacy Policy button |

The "Here be dragons" content moves from a loose banner into a proper `cloud-provider-card` component, paired with the Dropbox card in the 2-column grid.

---

## Cloud Consolidation (STAK-317)

### DOM changes
- `#settingsPanel_cloud` content (Dropbox card + beta banner) is relocated into `#settingsPanel_system` as Group 4
- `#settingsPanel_cloud` is removed from the DOM
- The "More Providers" coming-soon section is omitted for now (deferred)

### Cloud nav item visibility
- On settings panel init (`js/settings.js`), count configured providers from the existing provider registry
- If count < 2: `document.querySelector('[data-panel="cloud"]').style.display = 'none'`
- If count >= 2: show the nav item (future-proofing for additional providers)

### No functional changes
- Dropbox card JS behavior, IDs, and data attributes are unchanged
- All cloud sync event handlers in `cloud-sync.js` are unchanged
- This is a pure DOM relocation

---

## Card Structure Pattern

Each card mirrors the Dropbox `cloud-provider-card`:

```html
<div class="cloud-provider-card">
  <div class="cloud-provider-card-header">
    <span class="cloud-provider-card-title">
      [SVG icon] Title
    </span>
    <span class="cloud-provider-card-badges">
      [optional badge]
    </span>
  </div>
  <p class="settings-subtext">Description</p>
  <div style="border-top:1px solid var(--border);padding-top:0.6rem;margin-top:0.5rem">
    [action buttons]
  </div>
</div>
```

### Styling notes
- Remove `max-width: 400px` from individual cards — inventory context allows cards to fill panel width
- All existing button IDs retained unchanged
- Import progress bar (`#importProgress`) stays inside the Import card below the button grid
- Button sizing: `font-size: 0.82rem; padding: 0.4rem 0.9rem; min-height: 0` (matches Cloud Sync buttons)
- Card grid uses existing `.settings-card-grid` (responsive, stacks single-column below 600px)

---

## What Does NOT Change

- Button IDs: `#bulkEditBtn`, `#exportCsvBtn`, `#exportJsonBtn`, `#exportPdfBtn`, `#exportZipBtn`, `#importCsvOverride`, `#importCsvMerge`, `#importJsonOverride`, `#importJsonMerge`, `#importZipBtn`, `#vaultExportBtn`, `#vaultImportBtn`, `#importNumistaBtn`, `#mergeNumistaBtn`
- Event handlers in `inventory.js`, `vault.js`, `cloud-sync.js`
- Dropbox card IDs, data attributes, and JS behavior
- CSS class definitions (no new classes added)

---

## Out of Scope

- Functional changes to cloud sync, backup, or import/export logic
- Adding new cloud providers
- "More Providers" coming-soon cards
- Any changes to the Cloud Sync JS pipeline

---

## Success Criteria

- Inventory Settings panel is visually indistinguishable in style from the Cloud Sync panel
- Bulk Editor card spans a full grid column (no blank half-width)
- Inventory Summary card shows live item count, melt value, last modified
- Cloud section appears at the bottom of Inventory Settings when Dropbox is connected
- Cloud nav tab is hidden when only 1 provider is configured
- All existing import/export/backup functionality works identically after the refactor

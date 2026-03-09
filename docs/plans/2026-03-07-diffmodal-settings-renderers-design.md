# DiffModal Settings Cards: Rich Renderers for Array/Object Values

**Linear:** STAK-455
**Date:** 2026-03-07
**Status:** Approved (brainstorming complete)

## Impact Report — Files Affected

- `js/diff-modal.js:116-131` — `_formatSettingValue()` → type-dispatch renderer
- `js/diff-modal.js:532-558` — `_renderSettingsCards()` → expanded card layout for complex types
- `js/diff-modal.js:27-56` — `SETTINGS_CATEGORIES` (read-only reference)
- `js/diff-modal.js:58-100` — `SETTINGS_LABELS` (read-only reference)
- `js/cloud-sync.js:2576-2586` — itemTags exclusion from settingsDiff
- `index.html` — CSS for `dm-` scoped chip strip classes

## Problem

Settings cards in DiffModal dump raw JSON for complex values (arrays of objects, string arrays, key-value maps). Users see unreadable blobs like `[{"id":"notes","label":"Notes Indicator","enabled":true},...]` instead of meaningful, actionable UI.

Additionally, `itemTags` (per-item UUID→tag map) leaks into the settings diff via cloud-sync's vault-first path, creating a massive "Other" category blob.

## Design

### Part 1: itemTags Bug Fix

Filter `itemTags` from cloud-sync settingsDiff in `cloud-sync.js`:
- Vault-first path (line ~2576): add `&& _rsKeys[rs] !== 'itemTags'`
- Local settings collection (line ~2583): add `|| SYNC_SCOPE_KEYS[i] === 'itemTags'` to skip condition
- Matches what JSON import already does at `inventory.js:3826`
- Tags continue flowing through item-level DiffEngine comparison — no data loss

### Part 2: Type-Dispatch Renderer

New `SETTINGS_VALUE_TYPE` map next to `SETTINGS_LABELS`:

| Type | Settings Keys | Rendering |
|---|---|---|
| `chip-strip` | inlineChipConfig, filterChipCategoryConfig, viewModalSectionConfig, chipCustomGroups | `[{id,label,enabled}]` → per-element chips, differing elements clickable |
| `toggle-map` | numistaViewFields | `{field: bool}` → per-field toggle chips |
| `slug-chips` | enabledSeedRules, headerBtnOrder, chipBlacklist, tagBlacklist | `string[]` → humanized chips with set-diff |
| `kv-pills` | providerPriority | `{KEY: number}` → key:value pill strip |
| `count-summary` | numistaLookupRules, metalOrderConfig | Opaque → count + whole-setting pick |

Default (no type): current `_formatSettingValue()` behavior for booleans, strings, numbers.

### Part 3: Sub-Renderer Specifications

All renderers use existing left ⇄ right layout (not stacked). Each outputs HTML for a settings row.

**chip-strip:** Match local/remote entries by `id`. Matching entries = muted chips (context). Differing entries = clickable `dm-field-value local/remote` chips (reuse item card click-to-pick pattern). Enabled = filled chip, disabled = outline/strikethrough.

**toggle-map:** Same as chip-strip but derived from object keys. Each key becomes a chip, `true` = filled, `false` = muted.

**slug-chips:** Compute set difference. Common items = muted. Local-only / remote-only = clickable. Humanize slugs via `SLUG_LABELS` map with `_titleCase()` fallback. Long arrays (>15) use existing `_showAll_` expander pattern.

**kv-pills:** Compact inline pills showing key:value. Only differing keys are clickable.

**count-summary:** `"X rules (local) → Y rules (remote)"` with whole-setting Keep Local / Use Remote buttons.

### Part 4: State Model

- Whole-setting keys: `_conflictResolutions['setting-keyName'] = 'local'|'remote'` (unchanged)
- Per-element keys: `_fieldSelections['setting-keyName-elementId'] = 'local'|'remote'`

`_buildSelectedChanges()` gains a merge path: for per-element settings, start with local array/object as base, swap in remote values where `_fieldSelections` says `'remote'`, emit merged result.

### Part 5: CSS

Minimal additions under existing `dm-` scope in `index.html`:
- `dm-setting-expanded` — wrapper for expanded chip-strip rows
- `dm-chip-local` / `dm-chip-remote` — chip side variants
- `dm-chip-enabled` / `dm-chip-disabled` — enabled vs disabled visual
- `dm-chip-matched` — muted non-interactive chip
- `dm-setting-side-label` — "Local:" / "Remote:" row labels

## Non-Goals

- No changes to data model, storage format, or DiffEngine
- No per-element granularity for `count-summary` types (numistaLookupRules, metalOrderConfig)
- No changes to item card renderers (STAK-454 scope)
- No new JS files or storage keys

## Prior Art

- STAK-454: Item card click-to-pick field selection (`_fieldSelections`, `dm-field-value`)
- STAK-451: Settings category grouping (`SETTINGS_CATEGORIES`, `_renderSettingsCards`)
- `js/filters.js:502+`: Filter chip rendering patterns (reference only)

# StakTrakr Code Review & Technical Debt Assessment (Draft)

_Date:_ 2026-02-17  
_Audience:_ Dev team (`dev` branch review)  
_Scope:_ Static review of current repository + lightweight automated checks

---

## Executive Summary

Overall, the codebase is **feature-rich and shipping quickly**, but has entered a phase where **maintainability risk is increasing** due to:

1. **Large module concentration** (multiple 2k–3k+ line JS files, plus a 9.6k line CSS file).
2. **Cross-module duplication** still present (some already tracked in GitHub issues).
3. **Global namespace coupling** (`window.*` exports + inline HTML handlers), which makes refactors fragile.
4. **Tooling drift** (ESLint v9 vs `.eslintrc.json` format), reducing confidence in automated dead-code detection.

My recommendation: treat next sprint as a **stabilization/refactor sprint** focused on extraction, lint modernization, and dead-code cleanup while preserving behavior.

---

## Review Method & Commands

I used a fast static pass and repository checks (no functional behavior changes):

- Inventory + structure scan (`rg --files`, `wc -l`)
- Hotspot/legacy keyword scan (`rg TODO|FIXME|legacy|dead code`)
- Duplication heuristics (custom Python shingle scan)
- Lint checks:
  - `npx eslint js/*.js` (fails due ESLint 9 config format mismatch)
  - `npx -y eslint@8 js/*.js --rule 'no-unused-vars:error' --rule 'no-unreachable:error'` (signal-only pass)
- Targeted source inspection of flagged blocks

---

## Current Risk Snapshot

### 1) File size / concentration hotspots

Top files by lines:

- `css/styles.css` ~9,628
- `index.html` ~3,461
- `js/inventory.js` ~3,308
- `js/utils.js` ~3,007
- `js/api.js` ~2,738
- `js/events.js` ~2,481
- `js/settings.js` ~2,415
- `js/catalog-api.js` ~1,989
- `js/viewModal.js` ~1,529

**Assessment:** Refactors in these files will have high blast radius and merge conflict probability.

---

### 2) Very large function hotspots (maintainability + testability concern)

Notable long functions found:

- `js/seed-data.js` `getEmbeddedSeedData()` (~1132 lines)
- `js/settings.js` `setupSettingsEventListeners()` (~840 lines)
- `js/utils.js` `getStorageReportCSS()` (~761 lines)
- `js/viewModal.js` `buildViewContent()` (~552 lines)
- `js/events.js` `setupItemFormListeners()` (~484 lines)
- `js/filters.js` `renderActiveFilters()` (~268 lines)
- `js/filters.js` `filterInventoryAdvanced()` (~250 lines)
- `js/inventory.js` `renderTable()` (~293 lines)

**Assessment:** These are prime extraction candidates. They are difficult to reason about and regression-test as units.

---

### 3) Duplication opportunities (high confidence)

#### A. Table-builder UI duplication

Near-identical table construction patterns appear in:

- `js/settings.js` (config tables, repeated header/cell styling)
- `js/image-cache-modal.js` (cache list table)

**Recommendation:** Introduce a small `createSettingsTable({ columns, rows, className })` helper to centralize table scaffolding.

#### B. Field picker duplication (Numista vs PCGS)

`renderPcgsFieldCheckboxes()` in `js/pcgs-api.js` and `renderNumistaFieldCheckboxes()` in `js/catalog-api.js` share almost identical rendering flow:

- checkbox + label + editable input
- current-value hint row
- warning row
- enable/disable coupling

**Recommendation:** Extract a shared renderer (e.g., `renderFieldPickerRows(container, fields, currentFormValues, namePrefix)`) and keep API-specific normalization local.

#### C. Existing dedup GitHub issues still open

Open issues already align with real duplication debt:

- #176 retail price calculation dedup (`card-view.js` + `inventory.js`)
- #175 image resolution cascade dedup (`card-view.js` + `inventory.js`)

**Recommendation:** Prioritize these in the same refactor batch to prevent additional drift.

---

## Potential Abandoned / Dead Code Candidates

> Confidence legend: **High** = likely safe to remove after quick verification, **Medium** = probably dead but verify runtime paths, **Low** = likely intentional legacy compatibility.

### Candidate 1 — `_vaultPendingFileName` (High)

In `js/vault.js`, `_vaultPendingFileName` is assigned/reset but appears never read for behavior.

- Assigned on import open, reset on close/export path.
- No downstream use in status, validation, or export/import logic.

**Action:** Remove variable and assignments after confirming no external debug tooling relies on it.

### Candidate 2 — `hasMatchingData()` in filters (High)

`js/filters.js` defines `hasMatchingData(field, value, inventory)`, but current references indicate no call sites.

**Action:** Remove or repurpose; if intended for future use, mark with explicit TODO and owner.

### Candidate 3 — `_pendingUploadBlob` legacy alias (Low, intentional)

`js/events.js` keeps `_pendingUploadBlob` with a deprecation comment and compatibility semantics.

**Action:** Keep for now, but add sunset criteria (e.g., remove after one major version or once all consumers removed).

---

## Architecture / Coupling Observations

### 1) Global API surface is large

There are ~111 `window.*` assignments in JS modules.

**Risk:** Hidden coupling between modules; changing names or call timing can break runtime without import-time errors.

**Refactor direction:**
- Move to explicit namespace objects per feature (`window.StakTrakrSettings`, `window.StakTrakrInventory`) as a transitional step.
- Gradually replace direct global lookups with dependency injection in init/wiring modules.

### 2) Inline HTML handlers still present

`index.html` still contains inline handlers (`onclick=...`) for modal controls and external links.

**Risk:** Splits event logic between markup and scripts; harder to lint/test and to secure under stricter CSP.

**Refactor direction:** Move these handlers to `events.js` setup wiring.

---

## Tooling Debt

### ESLint config mismatch

Current repo uses `.eslintrc.json`, but default `npx eslint` resolves to ESLint 9 and fails expecting `eslint.config.js`.

**Impact:** Standard lint command currently breaks, so dead-code and style regressions can slip.

**Options:**
1. Pin ESLint v8 in devDependencies/scripts, or
2. Migrate to ESLint 9 flat config (`eslint.config.js`) and update docs/CI.

I recommend option 2 for future-proofing.

---

## Prioritized Refactor Plan (Draft)

### Phase 1 (1–2 days): Tooling + Safety Rails

- Restore lint reliability (ESLint 9 migration or pinning).
- Add `npm run lint` and `npm run lint:unused` scripts.
- Add lightweight CI gate for lint.

### Phase 2 (2–4 days): High-value dedup

- Close #176 and #175 with shared utility extraction.
- Extract shared field-picker renderer for Numista/PCGS.
- Extract shared settings-table scaffolding.

### Phase 3 (2–3 days): Dead-code cleanup

- Remove verified dead candidates (`_vaultPendingFileName`, `hasMatchingData` if confirmed unused).
- Document remaining legacy aliases with removal target versions.

### Phase 4 (ongoing): Module decomposition

- Break up large functions (`buildViewContent`, `setupSettingsEventListeners`, `renderTable`) into composable units.
- Prefer pure compute helpers + small DOM adapter layers.

---

## Suggested Tracking Tickets (if you want to spin these up)

1. **Refactor:** Extract shared settings table builder from Settings + Image Cache modal.
2. **Refactor:** Unify field-picker renderers (PCGS + Numista).
3. **Chore:** ESLint 9 flat-config migration and lint scripts.
4. **Chore:** Dead-code pass for write-only/unused symbols.
5. **Refactor:** Break `setupSettingsEventListeners()` into per-tab binders.
6. **Refactor:** Decompose `viewModal.buildViewContent()` into section render modules.

---

## Bottom Line

You’ve shipped a lot of value quickly, and most debt is the **good kind** (feature velocity debt), not severe architectural failure. The next best move is a short stabilization cycle that:

- re-establishes lint confidence,
- pays down known duplication,
- removes verified dead code,
- and starts decomposing the largest functions.

That should materially reduce regression risk while preserving delivery speed.

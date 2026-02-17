# GitHub Issue Drafts from Technical Debt Assessment

_Date:_ 2026-02-17  
_Source report:_ `codereview/2026-02-17-technical-debt-assessment.md`

Reference link for issue bodies (codex/work branch):  
`https://github.com/lbruton/StakTrakr/blob/work/codereview/2026-02-17-technical-debt-assessment.md`

> Note: I attempted to create these via GitHub REST API, but issue creation returned `401 Requires authentication` in this environment. Drafts below are ready to paste into GitHub.

---

## 1) Chore: Migrate ESLint config to v9 flat config

**Why**
Current `npx eslint js/*.js` fails because the repo uses `.eslintrc.json` while the default CLI resolves ESLint v9.

**Scope (afternoon-sized)**
- Add `eslint.config.js` equivalent to current behavior.
- Add `npm` scripts: `lint` and `lint:unused`.
- Update README command examples.

**Acceptance Criteria**
- `npx eslint js/*.js` runs successfully.
- Existing JS files lint with no new runtime changes.
- Docs mention the canonical lint command.

**Report reference**
See codereview report: `https://github.com/lbruton/StakTrakr/blob/work/codereview/2026-02-17-technical-debt-assessment.md`.

---

## 2) Refactor: Extract shared field-picker renderer (Numista + PCGS)

**Why**
`renderNumistaFieldCheckboxes()` and `renderPcgsFieldCheckboxes()` share very similar checkbox/input/hint rendering logic.

**Scope (afternoon-sized)**
- Introduce one shared helper for row rendering.
- Keep data normalization API-specific.
- Preserve current UI/UX behavior.

**Acceptance Criteria**
- No visual behavior change in either picker.
- Duplicate DOM-building logic is reduced.
- Both flows still support warnings + current-value hints.

**Report reference**
See codereview report: `https://github.com/lbruton/StakTrakr/blob/work/codereview/2026-02-17-technical-debt-assessment.md`.

---

## 3) Refactor: Extract reusable settings table builder

**Why**
Settings config tables and image-cache modal table reuse similar `<table>/<thead>/<tbody>` scaffolding and inline header styling patterns.

**Scope (afternoon-sized)**
- Build tiny helper for table scaffold creation.
- Migrate one table in Settings + one in Image Cache modal as first pass.
- Keep class names and styling unchanged.

**Acceptance Criteria**
- Both target tables render identically before/after.
- Shared helper is documented in code comments.
- Follow-up migration points identified for remaining tables.

**Report reference**
See codereview report: `https://github.com/lbruton/StakTrakr/blob/work/codereview/2026-02-17-technical-debt-assessment.md`.

---

## 4) Chore: Dead-code verification pass for write-only symbols

**Why**
Potential candidates include write-only or no-call-site symbols like `_vaultPendingFileName` and `hasMatchingData()`.

**Scope (afternoon-sized)**
- Validate true usage via search + runtime check.
- Remove confirmed dead symbols.
- Leave legacy aliases only when compatibility requires them, with explicit sunset comments.

**Acceptance Criteria**
- Confirmed dead symbols removed with no behavior change.
- Remaining legacy symbols have clear “remove after X” notes.
- Changelog note added for cleanup.

**Report reference**
See codereview report: `https://github.com/lbruton/StakTrakr/blob/work/codereview/2026-02-17-technical-debt-assessment.md`.

---

## 5) Refactor: Split `setupSettingsEventListeners()` into per-tab binders

**Why**
`setupSettingsEventListeners()` is a long function (~800+ lines) with many concerns, making changes high-risk.

**Scope (afternoon-sized)**
- Extract two tabs first (example: Appearance + API) into dedicated binder functions.
- Keep existing invocation path and behavior.
- Add lightweight section comments for remaining extraction steps.

**Acceptance Criteria**
- No settings regression in extracted tabs.
- Main function reduced in size/complexity.
- Pattern established for iterative extraction.

**Report reference**
See codereview report: `https://github.com/lbruton/StakTrakr/blob/work/codereview/2026-02-17-technical-debt-assessment.md`.

---

## 6) Refactor: Remove remaining inline `onclick` handlers in index.html

**Why**
Inline handlers increase coupling and make event flow harder to lint/test.

**Scope (afternoon-sized)**
- Replace one modal cluster (Vault modal buttons/toggles) with event wiring in JS.
- Preserve existing UX and keyboard behavior.

**Acceptance Criteria**
- No inline handlers remain for the targeted modal cluster.
- Handlers are attached in existing events wiring paths.
- Manual smoke test confirms parity.

**Report reference**
See codereview report: `https://github.com/lbruton/StakTrakr/blob/work/codereview/2026-02-17-technical-debt-assessment.md`.

# Tasks Document

Release target: `v3.32.48`.

- [x] 1. Add per-result Numista preview action in search result cards
  - File: `js/catalog-api.js`
  - Update `renderNumistaResultCard(result, index)` to render a preview action (button/link) for each result row with accessible text/label.
  - Ensure the control carries row/index metadata and avoids unsafe inline URL injection.
  - Purpose: Make preview discoverable and available before Apply.
  - _Leverage: `renderNumistaResultCard`, `escapeHtmlCatalog`, existing `.numista-result-card` markup_
  - _Requirements: 1.1, 3.1, 3.2_
  - _Prompt: Implement the task for spec numista-search-preview-link, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend JavaScript developer focused on modal UI rendering | Task: Modify `renderNumistaResultCard()` in `js/catalog-api.js` to include a per-row preview control (e.g., icon button with label/tooltip like "Preview on Numista"). The control must be tied to the row result index and must not alter existing card-select behavior by itself. Keep output sanitized using existing escaping utilities. | Restrictions: Only edit `js/catalog-api.js` in this task. Do not change search logic, apply logic, or provider normalization. Do not add new dependencies. | _Leverage: Use existing result card renderer and escaping helper; reuse current data-result-index pattern. | _Requirements: 1.1, 3.1, 3.2 | Success: Every rendered search row has a clear preview action, with accessible label/title, and no rendering regressions in the results list. Also: set task to `[-]` before coding, run `log-implementation` after finishing, then mark task `[x]` in `tasks.md`._

- [x] 2. Wire preview click behavior without breaking row selection/apply flow
  - File: `js/catalog-api.js`
  - Extend delegated click handling on `#numistaResultsList` so preview clicks open Numista and stop card-selection transition.
  - Preserve existing behavior when clicking elsewhere on a result card (select row, show field picker).
  - Purpose: Add preview interaction while keeping current apply workflow intact.
  - _Leverage: Existing delegated click listener on `numistaResultsList`, `list._numistaResults`, `openNumistaModal()` global helper_
  - _Requirements: 1.2, 2.1, 2.2, 3.3_
  - _Prompt: Implement the task for spec numista-search-preview-link, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend JavaScript developer focused on event delegation and modal interactions | Task: Update the existing `numistaResultsList` delegated click listener in `js/catalog-api.js` to detect preview-action clicks, open the corresponding Numista page via `openNumistaModal(catalogId, name)`, and return early so the row is not selected. For non-preview clicks, preserve current row selection and field picker transition exactly. Add graceful handling when catalog id is missing/invalid. | Restrictions: Only edit `js/catalog-api.js` in this task. Do not alter Fill Fields behavior or data-mapping logic. Keep backward compatibility with current modal flow. | _Leverage: Existing listener and result index mapping, plus the already-loaded `openNumistaModal` helper from `js/numista-modal.js`. | _Requirements: 1.2, 2.1, 2.2, 3.3 | Success: Preview opens on preview click, card selection still works on normal card click, and apply flow remains unchanged end-to-end. Also: set task to `[-]` before coding, run `log-implementation` after finishing, then mark task `[x]` in `tasks.md`._

- [x] 3. Harden Numista popup URL handling and style preview control
  - Files: `js/numista-modal.js`, `css/styles.css`
  - In `openNumistaModal`, enforce safe catalog-id parsing/validation before composing URL and fail gracefully when invalid.
  - Add scoped CSS for preview control (layout, hover/focus, touch target) consistent with existing Numista result card styles.
  - Purpose: Ensure safe, usable preview behavior on desktop and mobile.
  - _Leverage: Existing `openNumistaModal` implementation and existing `.numista-result-*` style blocks_
  - _Requirements: 1.3, 3.1, 3.2, 3.3_
  - _Prompt: Implement the task for spec numista-search-preview-link, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend/security-minded developer with CSS polish skills | Task: (1) Improve `openNumistaModal()` in `js/numista-modal.js` to validate/normalize incoming catalog IDs before URL construction, supporting current Numista ID formats while preventing malformed values from being opened. Keep graceful popup-blocked behavior. (2) Add focused CSS rules in `css/styles.css` for the new preview control so it is clearly discoverable and accessible in the Numista result list across desktop/mobile. | Restrictions: Only edit `js/numista-modal.js` and `css/styles.css`. Do not change modal z-index/layout systems globally. Do not add frameworks or external libs. | _Leverage: Existing popup logic and result-card style section around `#numistaResultsModal`. | _Requirements: 1.3, 3.1, 3.2, 3.3 | Success: Invalid IDs are safely ignored/handled, valid IDs open correct Numista pages, popup failures are graceful, and preview control styling is readable and tappable in supported viewports. Also: set task to `[-]` before coding, run `log-implementation` after finishing, then mark task `[x]` in `tasks.md`._

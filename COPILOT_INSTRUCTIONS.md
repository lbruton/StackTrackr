# StackTrackr — Copilot Instructions (Pin me in Copilot Chat)

> **For comprehensive agent coordination and workflow details, see `/agents.ai` in the project root.**

Purpose
- Give Copilot a concise, always-on brief so responses stay scoped and consistent.

Project overview
- Single‑page, offline web app. Pure HTML/CSS/vanilla JS. Data in localStorage only.
- Must work over file://. index.html contains relaxed CSP, do not re‑tighten without testing.
- Version lives in `js/constants.js` (APP_VERSION). Prefer small, surgical edits.

Key files and roles
- `index.html` — DOM structure, modal markup, IDs used throughout. Keep IDs stable.
- `css/styles.css` — theme + layout.
- `js/init.js` — bootstraps app; wires DOM via `elements.*`, safe DOM access with `safeGetElement`, shows modals, sets listeners.
- `js/inventory.js` — item CRUD, persistence (localStorage), table render integration.
- `js/search.js` + `js/filters.js` + `js/fuzzy-search.js` — search pipeline.
- `js/sorting.js`, `js/pagination.js` — table UX.
- `js/charts.js` — Chart.js pie charts.
- `js/detailsModal.js` — breakdown modal.
- `js/api.js`, `js/catalog-providers.js`, `js/catalog-manager.js` — import/providers (e.g., Numista), mapping logic lives here and in `js/customMapping.js`.
- `js/state.js`, `js/utils.js`, `js/constants.js`, `js/debug-log.js`, `js/file-protocol-fix.js` — helpers, app state, logging, file:// fixes.
- Tests: `agents/tests/*.test.js` plus a few HTML harnesses (e.g., `agents/tests/test_logo.html`).
- Agent coordination: `/agents.ai` (root) and `/agents/` folder for multi-agent workflows.

Data model (fields commonly present)
- Item: metal, name, type, qty, weight, weightUnit, price, purchaseLocation, storageLocation, notes, date, spotPrice, collectable, catalog, serial.

Conventions
- No frameworks. Keep functions small/pure where possible. Mutations go through module APIs.
- Use `debugLog(...)` not `console.*` for noisy logs; keep user‑facing logs minimal.
- Guard DOM: prefer `safeGetElement` and `elements.*` map created in `init.js`.
- Preserve file:// compatibility and current CSP in `index.html`.
- Follow existing naming and event patterns; avoid global leakage.

When making changes (what to ask Copilot)
- Always name the exact files and limit scope: e.g., “Update only `js/inventory.js` and `js/init.js`.”
- Ask for a short plan first, then apply edits.
- Require tests/verification steps with each change.
- If behavior changes, update or add tests in `agents/tests/*.test.js` and any affected HTML harnesses.

Out of scope for this project
- Adding a backend or external DB. All data stays local.
- Introducing large UI frameworks (React/Vue/etc.).

Performance and UX notes
- Rendering lists: paginate and avoid full DOM rebuilds when possible.
- Keep import/export paths robust (CSV/JSON/PDF) and tolerant of malformed input.
- Respect storage limits; show user storage usage and backup guidance.

Commit style
- Small, cohesive commits. Example: `inventory: fix qty validation; persist type filters; add unit test`.

How to validate
- Smoke test: add/edit/delete items; search/filter/sort; check charts; import/export CSV/JSON; open details modal; verify storage usage/report; run HTML tests in `agents/tests/`.

If unsure
- Summarize relevant files first, propose minimal change, then wait for approval.

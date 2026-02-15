# Repository Guidelines

## Project Structure & Module Organization
StakTrakr is a static, client-side app with no backend build pipeline.

- `index.html`: single-page shell and script loading order.
- `css/styles.css`: global styling and responsive breakpoints.
- `js/`: feature modules (state, inventory, APIs, filters, charts, settings, init).
- `data/`: seeded spot-price history JSON files.
- `docs/`: release notes and announcements.
- Root docs (`README.md`, `CHANGELOG.md`, `ROADMAP.md`) track behavior and release context.

When adding modules, keep them focused by feature (`js/<feature>.js`) and wire them through the existing load order in `index.html` (with `init.js` last).

## Build, Test, and Development Commands
No compile step is required.

- `open index.html`: run directly via `file://` for quick checks.
- `python -m http.server 8000`: run over HTTP at `http://localhost:8000`.
- `npx eslint js/*.js` (optional): lint JavaScript using `.eslintrc.json`.

Prefer local HTTP when validating integrations, dynamic fetches, and any browser behavior that differs from `file://`.

## Coding Style & Naming Conventions
- Use 2-space indentation, semicolons, and `camelCase` for variables/functions.
- Use descriptive module names (`priceHistory.js`, `catalog-manager.js`).
- Keep shared constants in `js/constants.js`; avoid hardcoding keys/URLs in feature files.
- Use `safeGetElement(...)` for DOM access patterns already used by the app.

## Testing Guidelines
Testing is primarily manual/browser-based today.

- Validate both launch paths: `file://` and `localhost`.
- Smoke test core flows: add/edit/delete inventory, import/export, settings persistence, and spot-price sync.
- If adding browser tests, place them under `tests/` with `*.test.js` naming and load via `js/test-loader.js` for localhost runs.

## Commit & Pull Request Guidelines
Recent history shows concise, scoped commit styles:

- Ticket-first: `STACK-70: Raise card view breakpoint...`
- Type-first: `Fix: ...`, `chore: ...`
- Release commits: `v3.25.05 — STACK-71: ...`

PRs should include:
- Clear summary and user-visible impact.
- Linked issue/ticket (`STACK-###`) when applicable.
- Screenshots or short clips for UI changes.
- Notes for docs/version updates when behavior changes (`CHANGELOG.md`, `docs/announcements.md`).

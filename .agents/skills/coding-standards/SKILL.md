---
name: coding-standards
description: Codex coding standards for StakTrakr (vanilla JS SPA, global-scope scripts, safe DOM/storage/XSS patterns, and verification workflow).
---

# Coding Standards — StakTrakr

Apply this skill for any code change in this repository.

## Core Architecture

- App is a single-page vanilla JS app (`index.html` + deferred scripts).
- No bundler, no transpiler, no modules at runtime.
- Globals are shared across files by script load order.
- Must work on both `file://` and `http://localhost`.

## Non-Negotiables

1. Preserve script dependency order in `index.html`.
2. Use `safeGetElement(id)` for DOM access (except startup-only guaranteed elements in `init.js`/`about.js`).
3. Use `saveData()`/`loadData()` helpers for app data persistence.
4. Register new storage keys in `ALLOWED_STORAGE_KEYS` before writing.
5. Sanitize user-provided strings before DOM HTML injection.
6. Keep `APP_VERSION` sync rules intact when doing release/version work.

## JS Style

- `const`/`let` only; never `var`.
- `===`/`!==` only.
- 2-space indentation.
- Semicolons required.
- Prefer small, named helpers over large inline blocks.
- Keep functions cohesive to their domain file.

## Global-Scope Discipline

- Do not report globals as undefined if they come from earlier scripts.
- Add new shared state to `state.js` (not random feature files).
- Put reusable constants in `constants.js`.
- Avoid generic top-level names that can collide.

## Data Flow Pattern

Use this sequence for state mutations:

1. Mutate in-memory state.
2. Persist with storage helpers.
3. Re-render affected UI.

## Security Patterns

- Prefer `textContent` for user text.
- If HTML is required, sanitize/escape dynamic values.
- Avoid direct unsanitized `innerHTML`.
- Never add `eval`/`Function` usage.

## Service Worker Guardrails

For `sw.js` changes:

- Every `respondWith` path must resolve to a `Response`.
- Handle cache misses with explicit fallback (`r || fallback`).
- Keep `CACHE_NAME` aligned to versioning conventions.

## What To Verify Before Done

1. Lint target files (`npx eslint js/*.js` when relevant).
2. Smoke test critical flows changed by the patch.
3. Confirm no script-order or global reference regressions.
4. Confirm storage/XSS rules were not violated.

## Output Expectations

When reporting completion:

- List changed files.
- Summarize behavior impact.
- Note validations run (and any not run).
- Call out residual risks if tests were limited.

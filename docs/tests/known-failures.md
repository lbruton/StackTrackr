# Known Test Failures & Flaky Tests

Living registry of Playwright smoke tests that are broken, flaky, or deprecated.
Updated whenever a test failure is triaged during a smoke test run.

**Source of truth for the `smoke-test` skill Phase 3 registry.**
After editing this file, copy the active/resolved tables into `.claude/skills/smoke-test/SKILL.md`.

---

## Status Key

| Icon | Meaning |
|------|---------|
| ⚠️ Flaky | Passes sometimes — timing, environment, or external dependency |
| 🔴 Broken | Consistently fails — stale selector, wrong assertion, deprecated feature |
| ⏭️ Skipped | `test.skip()` in code — requires API keys or unavailable infrastructure |
| ✅ Resolved | Fixed — kept here to prevent re-filing |

---

## Currently Known Active Issues

| ID | Spec | Test Name | Status | Root Cause | First Seen |
|----|------|-----------|--------|------------|------------|
| KF-002 | `api-integrations.spec.js` | `STAK-215: syncStatus shows save-failure message when localStorage quota is exceeded` | ⚠️ Flaky | Forces `localStorage.setItem` to throw a quota error via mock; not reproducible against Cloudflare Pages (different storage policy) | 2026-02-22 |
| KF-003 | `live-demo.spec.js` | `live demo — load, hover spot cards, open About` | ⚠️ Flaky | No hard assertions — pure timing test; ack modal dismiss timing differs on HTTPS vs local HTTP; fails intermittently against preview URLs | 2026-02-22 |
| KF-004 | `market-toggle.spec.js` | `Test 1: New user sees all 5 header buttons by default` | 🔴 Broken | `#headerMarketBtn` not visible on fresh load — selector may have changed or button render order changed since test was written | 2026-02-22 |
| KF-005 | `market-toggle.spec.js` | `Test 4: Responsive grid layout (3-col → 2-col → 1-col)` | 🔴 Broken | Asserts `mobileCols.split(' ').length === 1` (single column) but receives `2`; browserless viewport sizing doesn't match expected mobile breakpoint | 2026-02-22 |
| KF-006 | `import-export.spec.js` | `JSON round-trip preserves serialNumber` | ⚠️ Flaky | `page.waitForEvent('download')` unreliable against HTTPS Cloudflare Pages URLs; passes consistently on local HTTP server | 2026-02-22 |
| KF-007 | `backup-restore.spec.js` | `Vault encrypted backup flow` | ⚠️ Flaky | Timeout — vault AES-256-GCM crypto + seed inventory size pushes past browserless Docker timeout; intermittent | 2026-02-22 |

---

## Resolved (do not re-file)

| ID | Spec | Test Name | Status | Resolved In | Notes |
|----|------|-----------|--------|-------------|-------|
| KF-001 | `api-integrations.spec.js` | `STAK-255: hourlyBaseUrls and RETAIL_API_ENDPOINTS use correct paths` | ✅ Resolved | STAK-271 | `api1.staktrakr.com` fallback removed; single endpoint only — assertion now stable |
| BUG-001 | `ui-checks.spec.js` | Search returns 0 results intermittently | ✅ Resolved | dev | Confirmed not triggered across multiple runs |
| BUG-002 | `crud.spec.js` | Autocomplete ghost text persists after modal close | ✅ Resolved | dev | Confirmed not triggered across multiple runs |
| BUG-006 | `crud.spec.js` | Delete executed immediately with no confirmation dialog | ✅ Resolved | v3.31.5 | Replaced with `showBulkConfirm` DOM modal |
| STAK-229 | `backup-restore.spec.js` | Vault backup test timeout (seed inventory too large) | ✅ Resolved | v3.32.x | Wipe inventory before vault export; `test.setTimeout(120_000)` |
| STAK-206 | `ui-checks.spec.js` | Card view items-per-page constraint never applied | ✅ Resolved | dev | `pagination.js` row vs item unit mismatch corrected |

---

## Skipped (require API keys / infrastructure)

| Spec | Test Name | Reason |
|------|-----------|--------|
| `api-integrations.spec.js` | Dropbox: Login and sync | Needs OAuth token |
| `api-integrations.spec.js` | Numista: Search and fill item | Needs Numista API key |
| `api-integrations.spec.js` | PCGS: Verify cert number | Needs PCGS API key |
| `api-integrations.spec.js` | Metal price providers: Sync current prices | Needs metals API key |

---

## How to triage a new failure

1. Run the smoke test and identify the failing test name + spec
2. Check this file — if it matches a Known Active issue, no Linear issue needed
3. If new: file a Linear bug, add a row to **Currently Known Active Issues** with today's date
4. If it seems fixed in a subsequent run: move to **Resolved**, note the version

---

*Last updated: 2026-02-22 — v3.32.12 smoke run against `patch-3-32-12.staktrakr.pages.dev`*

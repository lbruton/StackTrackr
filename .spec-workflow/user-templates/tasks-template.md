# Tasks Document: {{featureName}}

## References

- **Linear Issue:** [STAK-XXX](https://linear.app/staktrakr/issue/STAK-XXX)
- **GitHub PR:** [#NNN](https://github.com/lbruton/StakTrakr/pull/NNN)
- **Spec Path:** `.spec-workflow/specs/{{spec-name}}/`

<!-- VERSION CHECKOUT GATE — MANDATORY
Before implementing ANY task below, you MUST:
1. Run /release patch (or /start-patch) to claim a version and create a worktree
2. Record the assigned version (e.g., 3.34.01) in the first implementation log
3. ALL file edits happen inside the worktree — never in the main repo working directory
4. Verify: `git branch --show-current` returns patch/VERSION, not dev or main
5. If multiple tasks are parallelized across agents, each agent gets its own /release patch
Skipping this gate is a workflow violation. See CLAUDE.md Version Checkout Gate section.

SPEC COMPLETION GATE — BLOCKING (Phase 5):
After ALL tasks are [x] and implementation logs are recorded:
1. Run /wiki-update to update all wiki pages whose frontmatter sourceFiles match this spec's changed files
2. Close all linked Linear issues (move to Done)
3. Verify /bb-test passes or file follow-up Linear issues for any new failures
4. The spec is NOT complete until all three are verified.
-->

---

## StakTrakr Critical Patterns (applies to all tasks)

- **DOM access**: `safeGetElement('id')` — never `document.getElementById()`
- **Storage reads/writes**: `saveData(key, val)` / `loadData(key)` from `js/utils.js`
- **New storage keys**: must be added to `ALLOWED_STORAGE_KEYS` in `js/constants.js`
- **innerHTML**: always wrap user content in `sanitizeHtml()`
- **New JS files**: add to BOTH `index.html` (correct load-order position) AND `sw.js` CORE_ASSETS
- **Duplicate check**: before editing `events.js` or `api.js`, grep for the function name in both files
- **Variable declarations**: always use `const`/`let` — `var` is banned per AGENTS.md coding style

---

## Phase 1 — [Phase Name]

- [ ] 1. [Task title]
  - File: `js/example.js`
  - [What to implement — be specific about function names, line numbers, and code patterns]
  - [Second bullet if multi-part]
  - Purpose: [Why this task exists — what problem it solves]
  - _Leverage: [Existing functions/constants/patterns to reuse, with file:line references]_
  - _Requirements: REQ-X_
  - _Prompt: Implement the task for spec {{spec-name}}, first run spec-workflow-guide to get the workflow guide then implement the task: Role: [Role] | Task: [Detailed implementation instructions referencing specific file paths, line numbers, existing functions, and exact variable names. Include the complete behavior specification.] | Restrictions: [What NOT to do — other files to leave untouched, patterns to avoid, anti-patterns for this codebase] | Success: [Concrete, verifiable acceptance criteria — what works, what doesn't break] PREREQUISITE: Before writing any code, verify you are working inside a patch worktree (`git branch --show-current` must return patch/VERSION). If not, STOP and run /release patch first. Mark task as [-] in tasks.md before starting. BLOCKING: After implementation, you MUST call the log-implementation tool with full artifacts before marking [x]. Do NOT mark [x] until the log-implementation tool call succeeds._

- [ ] 2. [Task title]
  - File: `js/example.js`
  - [Implementation details]
  - Purpose: [Why]
  - _Leverage: [Existing code to reuse]_
  - _Requirements: REQ-Y_
  - _Prompt: Implement the task for spec {{spec-name}}, first run spec-workflow-guide to get the workflow guide then implement the task: Role: [Role] | Task: [Instructions] | Restrictions: [Constraints] | Success: [Criteria] PREREQUISITE: Before writing any code, verify you are working inside a patch worktree (`git branch --show-current` must return patch/VERSION). If not, STOP and run /release patch first. Mark task as [-] in tasks.md before starting. BLOCKING: After implementation, you MUST call the log-implementation tool with full artifacts before marking [x]. Do NOT mark [x] until the log-implementation tool call succeeds._

---

## Phase 2 — [Phase Name] (optional — remove if single-phase)

- [ ] 3. [Task title]
  - File: `js/example.js`
  - [Implementation details]
  - Purpose: [Why]
  - _Leverage: [Existing code to reuse]_
  - _Requirements: REQ-Z_
  - _Prompt: Implement the task for spec {{spec-name}}, first run spec-workflow-guide to get the workflow guide then implement the task: Role: [Role] | Task: [Instructions] | Restrictions: [Constraints] | Success: [Criteria] PREREQUISITE: Before writing any code, verify you are working inside a patch worktree (`git branch --show-current` must return patch/VERSION). If not, STOP and run /release patch first. Mark task as [-] in tasks.md before starting. BLOCKING: After implementation, you MUST call the log-implementation tool with full artifacts before marking [x]. Do NOT mark [x] until the log-implementation tool call succeeds._

---

## Standard Closing Tasks

- [ ] N. Smoke test — verify no regressions
  - File: (no file changes — testing only)
  - Start local HTTP server, attempt Playwright via browserless first. If browserless hangs or fails, fall back to Browserbase (cloud). Verify all existing tests pass and no console errors were introduced by this spec.
  - Purpose: Catch regressions before PR merge; validate the new feature doesn't break existing behavior.
  - _Leverage: Playwright specs in `tests/*.spec.js`; browserless Docker at `devops/browserless/`; local server via `npx serve /Volumes/DATA/GitHub/StakTrakr -p 8765`; Browserbase fallback via `/bb-test` skill (STAK-394)_
  - _Requirements: All_
  - _Prompt: Implement the task for spec {{spec-name}}, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA engineer | Task: Run the StakTrakr smoke test suite using the following two-tier approach. **Tier 1 — Playwright/browserless (preferred, free):** (1) Start local server: `npx serve /Volumes/DATA/GitHub/StakTrakr -p 8765`. (2) Start browserless: `cd devops/browserless && docker compose up -d`. (3) Run tests: `BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npm test` from the repo root. (4) If tests produce output within 60 seconds, report pass/fail counts and any failing test names. **Tier 2 — Browserbase fallback (if Tier 1 hangs or errors):** If Tier 1 produces no output after 60 seconds or throws a connection error, STOP it immediately and switch to Tier 2: invoke the `/bb-test` skill via the Skill tool. Browserbase runs 18 NL checks against the live preview URL and returns results. Note in the log that Tier 1 was skipped and why. **Both tiers:** (5) Manually verify the new feature from this spec works end-to-end (list the specific user actions based on spec requirements). (6) Check browser console for any new errors or warnings. (7) If any failures are found, document them clearly and file a Linear issue — do NOT attempt fixes here. | Restrictions: Do not modify any source files — this is a verification-only task. Browserbase is paid — only use it as a fallback, not as first choice. | Success: Tests complete (either tier) with results reported. No new console errors. New feature manually verified working. PREREQUISITE: This is a test-only task — no worktree changes needed. Mark task as [-] in tasks.md before starting. BLOCKING: After verification, you MUST call the log-implementation tool with the test results (tier used, pass/fail counts) before marking [x]. Do NOT mark [x] until the log-implementation tool call succeeds._

- [ ] N+1. Update wiki pages affected by this spec
  - File: (wiki pages only — no production code changes)
  - Run `/wiki-update` to detect and rewrite any wiki pages whose YAML frontmatter `sourceFiles` reference files changed by this spec. Verify each updated page is accurate against the new implementation.
  - Purpose: Keep in-repo documentation current — stale wiki pages are a recurring source of confusion for agents and developers.
  - _Leverage: `/wiki-update` skill (reads YAML frontmatter `sourceFiles` from `wiki/*.md`); wiki pages at `wiki/`_
  - _Requirements: All_
  - _Prompt: Implement the task for spec {{spec-name}}, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical writer | Task: Update all wiki pages affected by this spec. (1) Run the /wiki-update skill — it detects which wiki pages have `sourceFiles` frontmatter entries matching the files changed in this spec, then rewrites those pages from the current source code. (2) Review each updated page for accuracy: do the descriptions match the actual implementation? Are function signatures, file paths, and behavior descriptions correct? (3) If any page needs manual correction, edit it directly. (4) List all updated pages and a one-line summary of what changed in each. | Restrictions: Only touch files in the `wiki/` directory. Do not modify any JS, CSS, or HTML production files. | Success: All wiki pages whose `sourceFiles` reference changed files have been updated and verified accurate. No stale descriptions of changed functions or constants remain. BLOCKING: After wiki updates are complete, you MUST call the log-implementation tool listing all updated wiki pages before marking [x]. Do NOT mark [x] until the log-implementation tool call succeeds._

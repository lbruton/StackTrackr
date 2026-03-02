# jules-review

Review and triage Jules nightly PRs (Bolt/Sentinel/Scribe) against StakTrakr coding standards.

## Trigger

`/jules-review` or `/jules-review <PR#>` or "review Jules PRs"

## Phase 0 — Discover Jules PRs

```bash
gh pr list --repo lbruton/StakTrakr --state open --author app/jules-app --json number,title,labels,headRefName
```

- If no PR# given, list all open Jules PRs and let user pick
- Identify PR type from title: **Bolt** (Security), **Sentinel** (Performance), **Scribe** (Documentation)
- If no open Jules PRs found, report that and stop

## Phase 1 — Diff Analysis (parallel agents)

Fetch the full diff:

```bash
gh pr diff <PR#> --repo lbruton/StakTrakr
```

Launch **2 parallel subagents** (use `dispatching-parallel-agents`):

### Agent 1 — StakTrakr Compatibility Check

Diff every changed file against `coding-standards` skill rules:

- **Script load order**: Any new JS file MUST be added to both `sw.js` CORE_ASSETS and `index.html` (56 scripts, strict order)
- **DOM access**: Must use `safeGetElement(id)` — never raw `document.getElementById()` (except startup in `about.js` / `init.js`)
- **Storage**: Must use `saveData()`/`loadData()` from `js/utils.js` — never direct `localStorage` for non-scalar data
- **Storage keys**: New keys must be in `ALLOWED_STORAGE_KEYS` in `js/constants.js`
- **innerHTML**: Must use `sanitizeHtml()` on user content
- **No `var`**: Only `const` and `let`
- **No `.then()` chains**: Use `async/await`
- **Version**: `constants.js` version number must NOT be modified (managed by `/release`)
- **Duplicate functions**: Check `events.js` AND `api.js` for duplicate function definitions

### Agent 2 — Edge Case Hunter

- DOM breakage: elements referenced that may not exist at runtime
- Event listener conflicts: duplicate listeners, missing cleanup
- State mutation side effects: localStorage race conditions, global state corruption
- CSS custom property violations: check against StakTrakr's CSS variable system
- Duplicate function definitions across `events.js` / `api.js`

## Phase 2 — Suppressions Check

Load `.github/jules-suppressions.json` (create with empty structure if missing).

- Cross-reference diff hunks against `suppressions[].pattern` entries
- Any matched line: mark as "Known suppressed — skip"
- Any NEW finding not in suppressions: flag for human triage
- Report suppression match count and new finding count

## Phase 3 — Triage & Recommendation

Present findings in a table:

| # | File:Line | Category | Verdict | Rationale |
|---|-----------|----------|---------|-----------|
| 1 | js/utils.js:42 | DOM Safety | Safe | Uses safeGetElement correctly |
| 2 | js/api.js:100 | Storage | Reject | Raw localStorage without saveData() |

**Verdicts:**

- **Safe to merge** — No violations found, passes all gates
- **Fix required** — Describe the fix but do NOT auto-fix (Jules PRs are their own branch)
- **Reject PR** — Hard violation of StakTrakr patterns
- **Suppress (false positive)** — Offer to add to suppressions via `/jules-suppress`

### Hard Failure Gates (automatic reject)

Any of these in the diff = immediate reject verdict:

1. New `document.getElementById()` without `safeGetElement` wrapper
2. New file not added to `sw.js` CORE_ASSETS and `index.html` script order
3. Raw `innerHTML` assignment without `sanitizeHtml()`
4. `var` keyword usage
5. `.then()` chain (should be `async/await`)
6. New `localStorage.setItem`/`localStorage.getItem` for non-scalar data (should use `saveData()`/`loadData()`)
7. Modification to `constants.js` `APP_VERSION` (version managed by `/release`)

## Phase 4 — Execute Decision

**Safe to merge:**

```bash
gh pr review <PR#> --approve --body "Jules PR reviewed by Claude — all StakTrakr coding standards verified. No violations found."
gh pr merge <PR#> --squash --delete-branch
```

**Reject:**

```bash
gh pr close <PR#> --comment "Rejected: <rationale>. See jules-suppressions.json for known false positives."
```

Offer to add false positive patterns to suppressions via `/jules-suppress add`.

**Fix required:**

- Leave detailed review comment on the PR with specific line-by-line feedback
- Do NOT merge
- Advise user on next steps (manual fix or reject)

## Important Notes

- Jules PRs always target `dev` — verify with `gh pr view <PR#> --json baseRefName`
- If PR targets `main`, reject immediately and comment
- Jules has no memory between runs — false positives WILL recur. Use `/jules-suppress` to manage them.
- Never rewrite Jules PR branches — review only, merge or reject as-is

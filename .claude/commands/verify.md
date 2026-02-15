# StakTrakr Verification

Run comprehensive verification on the current codebase state before committing.

## Arguments

$ARGUMENTS can be:
- `quick` — Security + localStorage + script order only
- `full` — All checks (default)
- `pre-pr` — Full checks + changelog/version/Linear audit

If no argument provided, run `full`.

## Instructions

Execute verification checks in this exact order. Use Grep and Glob tools for file scanning — do NOT open every file manually.

### Phase 1: Security Scan

**Hardcoded secrets** — scan all `js/` files:
- API keys, tokens, passwords (patterns: `sk-`, `api_key=`, `token=`, `password`, `secret`)
- Base64-encoded credentials
- Any string that looks like a key/token not loaded from localStorage

**Console.log audit** — find `console.log` calls in `js/` files:
- Exclude `debug-log.js` (that's the debug system)
- Exclude lines guarded by `if (DEBUG)` or inside `debugLog`
- Report any unguarded `console.log` that would run in production

### Phase 2: localStorage Key Validation

Scan all `js/` files for `localStorage.setItem` and `localStorage.getItem` calls. For each key used:
- Verify it exists in `ALLOWED_STORAGE_KEYS` in `js/constants.js`
- Flag any key string not in the whitelist
- Flag any dynamic key construction that could bypass the whitelist

### Phase 3: Script Load Order

Read `index.html` and extract all `<script>` tags in order. Verify:
- `js/file-protocol-fix.js` loads **first** (no `defer` attribute)
- `js/init.js` loads **last**
- All other scripts between them have the `defer` attribute
- No duplicate script includes

### Phase 4: DOM Safety Audit

Scan `js/` files for potential XSS vectors:
- `innerHTML` assignments — verify user content is escaped with `escapeAttribute()` or `escapeHtml()`
- `document.getElementById()` — should be `safeGetElement()` instead
- `element.className =` — should use `classList` API instead
- `new bootstrap.Modal(` — should be `getOrCreateInstance()` instead

### Phase 5: Git Status

- Show uncommitted changes (`git status`, `git diff --stat`)
- Show files modified since last commit
- Flag any sensitive files in the diff (`.env`, credentials, API keys)

### Phase 6: Pre-PR Only (if `pre-pr` argument)

Run these additional checks:
- `CHANGELOG.md` has an entry for the current version
- `APP_VERSION` in `js/constants.js` matches the latest changelog entry
- `docs/announcements.md` is updated
- Any `STACK-XX` references in changed files have corresponding Linear issues
- `ROADMAP.md` is updated if this is a new feature

## Output Format

Produce a concise verification report:

```
VERIFICATION REPORT
===================

Security:       [PASS/FAIL] (X issues)
localStorage:   [PASS/FAIL] (X unregistered keys)
Script Order:   [PASS/FAIL]
DOM Safety:     [PASS/FAIL] (X warnings)
Git Status:     X files changed, Y staged

Ready to commit: [YES/NO]
```

If any issues found, list them grouped by severity:

**CRITICAL** (must fix before commit):
- Security vulnerabilities, unregistered localStorage keys

**WARNING** (should fix, but non-blocking):
- Unguarded console.log, raw getElementById, innerHTML without escaping

**INFO** (awareness only):
- TODO/FIXME comments in changed files, git status summary

For each issue, include the file path, line number, and a one-line suggested fix.

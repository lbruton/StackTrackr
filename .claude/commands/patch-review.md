# StakTrakr Patch Review

Comprehensive security and quality review of uncommitted or staged changes.

## Arguments

$ARGUMENTS can be:
- (empty) — Review all uncommitted changes (staged + unstaged)
- `staged` — Review only staged changes (`git diff --cached`)
- `last` — Review the last commit (`git diff HEAD~1`)
- A file path — Review only that specific file

## Instructions

### Step 1: Identify Changed Files

Based on the argument, get the list of changed files and their diffs. Read each changed file in full for context. Focus the review on the **changed lines** but consider surrounding context.

### Step 2: Security Review (CRITICAL)

For each changed file, check for:

- **Hardcoded credentials**: API keys, tokens, passwords, secrets in code
- **XSS vulnerabilities**: `innerHTML` with unescaped user content — every user-provided value (`item.name`, `item.notes`, locations, serial numbers, etc.) must pass through `escapeAttribute()` or use `textContent`
- **Unregistered localStorage keys**: Any new `localStorage.setItem()` / `localStorage.getItem()` call must use a key listed in `ALLOWED_STORAGE_KEYS` in `js/constants.js`
- **Direct localStorage access for app data**: Should use `saveData()`/`loadData()` or `saveDataSync()`/`loadDataSync()` from `utils.js`, not raw `localStorage` calls
- **Import sanitization bypass**: CSV/JSON import paths must go through `sanitizeImportedItem()`

### Step 3: Quality Review (HIGH)

- **Functions over 50 lines**: Flag and suggest splitting
- **Nesting depth over 4 levels**: Flag and suggest early returns or extraction
- **Missing error handling**: `fetch()` calls without `try/catch`, `JSON.parse()` without error recovery, localStorage operations without fallback
- **Raw DOM access**: `document.getElementById()` instead of `safeGetElement()`, direct event binding instead of `safeAttachListener()`
- **Unguarded console.log**: Should use `debugLog()` or be wrapped in `if (DEBUG)`
- **Dead code**: Commented-out blocks, unreachable code after return/throw
- **`var` declarations**: Must be `const` or `let`
- **Loose equality**: `==` or `!=` instead of `===`/`!==` (except `== null` for nullish check)

### Step 4: Architecture Review (MEDIUM)

- **Module boundary violations**: State declared outside `state.js`, event handlers in `utils.js`, formatting logic in `events.js`
- **Global naming**: New globals with generic names (`data`, `result`, `temp`) at file scope
- **Missing window exposure**: New globals not added to the `window.X = X` block at file bottom
- **Mixed async patterns**: `.then()` chains mixed with `async/await` in the same function
- **Magic numbers**: Unexplained numeric literals — should be named constants in `constants.js`
- **Bootstrap anti-patterns**: `new bootstrap.Modal()` instead of `getOrCreateInstance()`, missing `dispose()` on dynamic modals

### Step 5: Style Review (LOW)

- **Inconsistent indentation**: Should be 2 spaces throughout
- **Missing semicolons**: Every statement needs one
- **Naming convention violations**: `camelCase` for functions/variables, `UPPER_SNAKE_CASE` for constants, `kebab-case` for files/CSS classes
- **TODO/FIXME comments**: Flag and note whether they have a corresponding Linear issue

## Output Format

Generate a structured review report:

```
CODE REVIEW: [X files reviewed]
================================

CRITICAL: X issues
HIGH:     X issues
MEDIUM:   X issues
LOW:      X issues

Verdict:  [APPROVE / CHANGES REQUESTED]
```

Then list each finding:

```
[CRITICAL] js/inventory.js:142 — XSS: innerHTML with unescaped item.name
  Fix: Use escapeAttribute(item.name) or switch to textContent

[HIGH] js/events.js:89 — Missing try/catch on fetch() call
  Fix: Wrap in try/catch with handleError() fallback

[MEDIUM] js/spot.js:201 — Magic number 86400000
  Fix: Define as const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000 in constants.js
```

### Verdict Rules

- **APPROVE** if zero CRITICAL and zero HIGH issues
- **CHANGES REQUESTED** if any CRITICAL or HIGH issues exist
- Always list all findings regardless of verdict
- For CHANGES REQUESTED, summarize the blocking issues at the top

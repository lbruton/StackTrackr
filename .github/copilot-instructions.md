# Copilot Instructions — StakTrakr

Custom review instructions for GitHub Copilot PR reviews.

## Project Context

StakTrakr is a single-page vanilla JavaScript app (no framework, no build step). It runs on both `file://` protocol and HTTP servers. The runtime artifact is `index.html` plus JS/CSS assets — no bundler, no transpiler.

## Critical Patterns to Enforce

### 1. DOM Access — Always use `safeGetElement()`

Direct `document.getElementById()` calls are **not allowed**. The codebase uses `safeGetElement(id)` which prevents null reference errors.

```js
// BAD — flag this
const el = document.getElementById("myElement");

// GOOD
const el = safeGetElement("myElement");
```

**Exception**: Code inside `about.js`, `init.js`, and event setup functions that run once at startup may use `document.getElementById()` for elements that are guaranteed to exist.

### 2. localStorage — Whitelist Required

All localStorage keys **must** be registered in `ALLOWED_STORAGE_KEYS` in `js/constants.js`. Direct `localStorage.setItem()` with an unlisted key will be silently blocked by the security layer. Flag any new `localStorage.setItem()` or `localStorage.getItem()` call that uses a key not in the whitelist.

Prefer `saveData()`/`loadData()` (async) or `saveDataSync()`/`loadDataSync()` from `js/utils.js` for application data.

### 3. Script Loading Order & Global Scope Architecture

Scripts load via `<script>` tags in `index.html` in strict dependency order. `file-protocol-fix.js` loads first (no `defer`), `init.js` loads last. If a PR adds a new script file, verify it's placed correctly in `index.html`.

**CRITICAL: Do not flag "undefined" globals** — this is a vanilla JS app with global scope across files. The following globals are defined in other files and are intentionally available throughout the app:

**From `js/state.js`:**

- `inventory` (array) — main inventory data
- `spotPrices` (object) — current metal prices
- `displayCurrency`, `exchangeRate`, `currencySymbol` — currency settings
- `elements` (object) — cached DOM references

**From `js/debug-log.js`:**

- `debugLog(message, level)` — debug logging utility

**From `js/image-cache.js`:**
- `imageCache` (object) — IndexedDB image storage API
- Always accessed via `window.imageCache` for consistency with availability checks

**From `js/filters.js`:**
- `renderActiveFilters()` — filter chip rendering
- `activeFilters` (object) — active filter state

**From `js/changeLog.js`:**
- `logChange(name, action, oldVal, newVal, idx)` — change tracking

**From `js/utils.js`:**
- `saveData()`, `loadData()` — async storage
- `saveDataSync()`, `loadDataSync()` — sync storage
- `sanitizeHtml(str)` — XSS prevention
- `formatCurrency(num)`, `formatWeight(num)`, etc. — formatting utilities

**From `js/constants.js`:**
- `API_PROVIDERS`, `METALS`, `ALLOWED_STORAGE_KEYS` — configuration objects
- `APP_VERSION`, `LS_KEY`, `SPOT_HISTORY_KEY` — constants

**From other modules:**
- `renderTable()`, `saveInventory()`, `loadInventory()` — inventory.js
- `updateSparkline()`, `syncSpotPricesFromApi()` — spot.js
- `catalogManager`, `catalogAPI` — catalog-*.js
- `NumistaLookup` — numista-lookup.js
- Plus many others across 30+ script files

**Do NOT flag these as "not defined"** — they are globals by design. The app has no module bundler; script loading order ensures dependencies are available.

### 4. Service Worker — respondWith() Must Always Resolve to a Response

Every `event.respondWith()` call **must** guarantee a `Response` object. This is the #1 cause of PWA crashes:

- `.catch()` only handles **rejections**, not `undefined` from cache misses
- `caches.match()` resolves to `undefined` on a miss — this is not a rejection
- Use `.then((r) => r || fallback)` to guard against `undefined`, not `.catch()`
- Every promise chain passed to `respondWith()` must end with a guaranteed `Response`

```js
// BAD — undefined cache miss skips .catch(), respondWith gets undefined
event.respondWith(
  caches.match(req).catch(() => new Response("fallback"))
);

// GOOD — .then() catches both undefined and rejection paths
event.respondWith(
  caches.match(req).then((r) => r || fetch(req)).then((r) => r || new Response("fallback"))
);
```

### 5. Version Sync — 6 Files Must Match

When any version-related file changes, verify all 6 are in sync:

| File | Field |
|------|-------|
| `js/constants.js` | `APP_VERSION` |
| `sw.js` | `CACHE_NAME` (includes version) |
| `CHANGELOG.md` | Latest `## [x.y.z]` heading |
| `docs/announcements.md` | Latest What's New entry version |
| `js/about.js` | `getEmbeddedWhatsNew()` version |
| `version.json` | `"version"` field |

If only some files are updated, flag the missing ones.

### 6. XSS Prevention

All user-supplied strings rendered into the DOM must go through `sanitizeHtml()` from `js/utils.js`. Flag any direct `innerHTML` assignment with unsanitized input. Existing `// nosemgrep:` comments indicate reviewed exceptions — do not flag those.

### 7. CACHE_NAME and APP_VERSION Drift

If `sw.js` CACHE_NAME does not match the version in `js/constants.js`, the service worker will serve stale assets. This causes the What's New splash to re-trigger on every page load. Always flag CACHE_NAME/APP_VERSION mismatches.

### 8. Announcements Entry Rotation — Intentional Limit

`docs/announcements.md` and `js/about.js` (`getEmbeddedWhatsNew()`) are **intentionally capped at 3–5 entries**. When a new release is added, the oldest entry is rotated out. Do not flag removed older entries as missing — this is by design. Both files must contain the **same** entries in the **same** order; flag any drift between them.

Similarly, the Development Roadmap section in `announcements.md` and `getEmbeddedRoadmap()` in `about.js` are capped at 3–4 items. Completed roadmap items are removed during releases.

### 9. Seed Data Files — Auto-Generated, Must Be Included

Files matching `data/spot-history-*.json` are generated by an external Docker poller that runs continuously. Do not flag formatting, line count changes, or large diffs in these files — they are machine-generated price data.

**Important**: If a PR modifies version files (`js/constants.js`, `sw.js`, `version.json`, `CHANGELOG.md`) but does **not** include any changes to `data/spot-history-*.json`, leave a reminder comment: "No spot price seed data included — did you run `/seed-sync` before committing? The Docker poller may have new price data that should ship with this release." This is a soft reminder, not a blocking issue.

## ESLint Rules

The project uses `.eslintrc.json` with these settings. Copilot should enforce the same standards:

**Environment**: `browser: true`, `es2020`, `ecmaVersion: 2020`

**Key rules to enforce** (aligned with Codacy's analysis):

| Rule | Severity | Rationale |
|------|----------|-----------|
| `no-var` | error | Always use `const` or `let` — `var` is banned |
| `eqeqeq` | error | Always use `===` / `!==` — never `==` / `!=` |
| `no-implicit-globals` | warn | All declarations should be `const`/`let` or inside functions |
| `no-unused-vars` | warn | Flag unused variables (ignore params prefixed with `_` and variables marked as legacy aliases in comments) |
| `no-redeclare` | error | No re-declaring variables in the same scope |
| `no-shadow` | warn | Avoid variable shadowing in nested scopes |
| `no-use-before-define` | warn | Functions/variables should be defined before use |
| `no-eval` | error | Never use `eval()` or `Function()` constructor |
| `no-implied-eval` | error | No `setTimeout`/`setInterval` with string arguments |
| `no-new-wrappers` | error | No `new String()`, `new Number()`, `new Boolean()` |
| `no-throw-literal` | error | Only throw `Error` objects |
| `no-self-compare` | error | No comparing a variable to itself |
| `no-template-curly-in-string` | warn | Catches `"${x}"` that should be `` `${x}` `` |
| `prefer-const` | warn | Use `const` when variable is never reassigned |
| `no-loop-func` | warn | No function declarations inside loops |
| `no-param-reassign` | warn | Avoid reassigning function parameters |

**`no-undef` is intentionally OFF** — the app uses global scope extensively across script files (no module bundler). Functions and constants from one file are used in another via the shared global scope.

**Code style conventions** (not in `.eslintrc.json` but enforced project-wide):

- 2-space indentation, no tabs
- Semicolons always required
- Trailing commas in multi-line arrays/objects (ES2017+)
- 120-character soft line limit
- `camelCase` for variables/functions, `UPPER_SNAKE_CASE` for constants
- Arrow functions preferred for callbacks: `arr.map((x) => x.id)`
- Template literals preferred over string concatenation

## PMD Rules (ECMAScript)

The project uses `ruleset.xml` at the project root. PMD analyzes JavaScript for error-prone patterns.

**Active ruleset**: All `category/ecmascript/errorprone.xml` rules **except**:

| Excluded Rule | Reason |
|---------------|--------|
| `InnaccurateNumericLiteral` | Values like `42.00`, `3400.00`, `0.0005` are exactly representable in IEEE 754 — false positives for a financial app |
| `AvoidTrailingComma` | Trailing commas are standard ES2017+ and used throughout per coding standards |

**Key PMD rules that ARE active** — flag violations of these:

| Rule | What it catches |
|------|----------------|
| `EqualComparison` | Using `==` instead of `===` |
| `UnreachableCode` | Code after `return`, `throw`, `break`, `continue` |
| `ConsistentReturn` | Functions that sometimes return a value and sometimes don't |
| `AssignmentInOperand` | Assignments inside `if`/`while` conditions (usually a typo) |
| `ScopeError` | Variables used outside their declared scope |
| `GlobalVariable` | Implicit global variable creation (missing `const`/`let`/`var`) |

## Review Focus Areas

- **Error handling in async code**: Promise chains should have `.catch()` handlers, especially in service worker code and API calls
- **New localStorage keys**: Must be added to `ALLOWED_STORAGE_KEYS` before use
- **CSS changes**: The app supports four themes (light, dark, sepia, system). Verify color values use CSS custom properties (`var(--...)`) rather than hardcoded colors
- **Mobile responsiveness**: The app uses a card view below 1350px breakpoint. Check that new UI elements are responsive

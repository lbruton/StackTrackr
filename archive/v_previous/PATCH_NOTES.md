# StackTrackr – debugLog Fix Patch (2025‑08‑11)

## What this fixes
Prevents the startup error:
```
Application initialization failed: Can't find variable: debugLog
```
by ensuring a global `debugLog` exists **before** any other scripts run.

## What’s included
- `js/debug-log.js` — a tiny, standalone bootstrap that defines:
  - `debugLog`, `debugInfo`, `debugWarn`, `debugError`
  - A 500‑entry in‑memory log buffer for diagnostics (`window.__stacktrackr__logBuffer`)
  - `exportDebugBuffer()` helper to download recent logs as JSON

## How to apply
1) Copy `js/debug-log.js` into your project’s JS folder.
2) In `index.html`, include it **first**, before any other scripts (especially before `utils.js`, `init.js`, etc.):
```html
<script src="js/debug-log.js"></script>
<script src="js/utils.js"></script>
<!-- the rest of your scripts... -->
```
3) (Optional) Enable verbose console output during testing:
```js
localStorage.setItem('stacktrackr.debug', '1');
```
To disable:
```js
localStorage.removeItem('stacktrackr.debug');
```

## Why this is safe
- If another bundle already defined `debugLog`, this file **no‑ops** (it checks first).
- No dependencies. Works in `file://` and server contexts.
- Does not alter your existing logging calls.

## Next steps
With this fixed, you can reload the app to continue with the implementation checklist tasks.
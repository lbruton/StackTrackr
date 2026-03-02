---
title: Storage Patterns
category: frontend
owner: staktrakr
lastUpdated: v3.33.19
date: 2026-03-01
sourceFiles:
  - js/utils.js
  - js/constants.js
relatedPages:
  - data-model.md
  - dom-patterns.md
---
# Storage Patterns

> **Last updated:** v3.33.19 — 2026-03-01
> **Source files:** `js/utils.js`, `js/constants.js`

## Overview

StakTrakr persists all application state in `localStorage`. For structured JSON app data, direct calls to `localStorage.setItem` / `localStorage.getItem` are **forbidden** — all reads and writes must go through the wrapper functions `saveData` / `loadData` (async) or `saveDataSync` / `loadDataSync` (sync), defined in `js/utils.js`. Direct `localStorage` access is permitted for intentional scalar string cases (e.g., cloud sync cursor, idle timeout keys) where the overhead of JSON serialization and compression is unnecessary.

The wrappers exist for three reasons:

1. **Allowlist enforcement** — `cleanupStorage()` iterates every key in
   `localStorage` and deletes anything not listed in `ALLOWED_STORAGE_KEYS`
   (`js/constants.js`). A key that bypasses the wrappers still lives in
   `localStorage`, but it will be silently wiped the next time `cleanupStorage`
   runs.
2. **Transparent compression** — Large values (inventory, history) are
   automatically compressed with LZ-string via `__compressIfNeeded` on write and
   decompressed via `__decompressIfNeeded` on read. Bypassing the wrappers
   breaks this transparently.
3. **Consistent error handling** — Parse errors and quota-exceeded errors are
   caught in one place; callers always receive the `defaultValue` rather than an
   uncaught exception.

---

## Key Rules (read before touching this area)

- **Never** call `localStorage.setItem()` or `localStorage.getItem()` directly for structured JSON app data. Direct localStorage is allowed for intentional scalar string cases (cloud sync cursor, idle timeout keys, etc.).
- **Never** introduce a new storage key without first adding it to
  `ALLOWED_STORAGE_KEYS` in `js/constants.js`.
- New keys written outside the allowlist will be deleted by `cleanupStorage()`.
- Prefer `saveData` / `loadData` (async) for new code. Use `saveDataSync` /
  `loadDataSync` only where the call site cannot be made async.

---

## Architecture

### `saveData(key, value)` — async

```js
const saveData = async (key, data) => {
  try {
    const raw = JSON.stringify(data);
    const out = __compressIfNeeded(raw);
    localStorage.setItem(key, out);
  } catch(e) {
    console.error('saveData failed', e);
  }
};
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Must be present in `ALLOWED_STORAGE_KEYS`. |
| `data` | `any` | Any JSON-serialisable value. |

**Returns:** `Promise<void>`. Errors are caught internally; no rejection is
propagated to the caller. A `console.error` is emitted on failure (e.g.
`QuotaExceededError`).

If `key` is **not** in `ALLOWED_STORAGE_KEYS`, the write still succeeds at the
`localStorage` level — there is no runtime guard inside `saveData` itself. The
key is removed the next time `cleanupStorage()` runs (called during startup). Always add the key to the allowlist first.

---

### `loadData(key, defaultValue)` — async

```js
const loadData = async (key, defaultValue = []) => {
  try {
    const raw = localStorage.getItem(key);
    if(raw == null) return defaultValue;
    const str = __decompressIfNeeded(raw);
    return JSON.parse(str);
  } catch(e) {
    console.warn(`loadData failed for ${key}, returning default:`, e);
    return defaultValue;
  }
};
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `key` | `string` | — | Storage key to read. |
| `defaultValue` | `any` | `[]` | Returned when the key is missing or parsing fails. |

**Returns:** `Promise<any>`. Never rejects. If the key is absent (`null`) the
`defaultValue` is returned. If the stored string is corrupt or decompression
fails, `defaultValue` is returned and a `console.warn` is emitted.

Note: the default for `defaultValue` is an **empty array** (`[]`). For keys
that hold objects, booleans, or strings, always pass an explicit default to
avoid type surprises:

```js
// Correct — explicit default for a non-array value
const theme = await loadData(THEME_KEY, 'light');

// Risky — returns [] when key is absent, not null/undefined
const theme = await loadData(THEME_KEY);
```

---

### `saveDataSync(key, data)` — sync

```js
const saveDataSync = (key, data) => {
  try {
    const raw = JSON.stringify(data);
    const out = __compressIfNeeded(raw);
    localStorage.setItem(key, out);
  } catch(e) {
    console.error('saveDataSync failed', e);
    throw e;  // re-throws, unlike the async version
  }
};
```

Identical behavior to `saveData` except it is synchronous and **re-throws** on
error. Use only at call sites that cannot be made async (e.g., `beforeunload`
handlers, initialisation code that runs before the event loop is established).

---

### `loadDataSync(key, defaultValue)` — sync

```js
const loadDataSync = (key, defaultValue = []) => {
  try {
    const raw = localStorage.getItem(key);
    if(raw == null) return defaultValue;
    const str = __decompressIfNeeded(raw);
    return JSON.parse(str);
  } catch(e) {
    return defaultValue;
  }
};
```

Synchronous equivalent of `loadData`. Same `defaultValue = []` caveat applies.
Errors are swallowed silently (no `console.warn`).

---

### `cleanupStorage()` — the allowlist enforcer

```js
const cleanupStorage = () => {
  if (typeof localStorage === 'undefined') return;
  const allowed = new Set(ALLOWED_STORAGE_KEYS);
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!allowed.has(key)) {
      localStorage.removeItem(key);
    }
  }
};
```

Called automatically during app startup (`DOMContentLoaded`). Any key not present in
`ALLOWED_STORAGE_KEYS` is permanently deleted. This is the primary mechanism
that enforces the allowlist contract.

---

### `ALLOWED_STORAGE_KEYS` — the allowlist

Defined in `js/constants.js`. Contains every key StakTrakr is permitted to
store. Mix of constant references (e.g. `LS_KEY`, `THEME_KEY`) and raw string
literals for legacy or one-off keys. As of v3.32.23 the list contains ~70+
entries covering inventory, spot prices, retail prices, UI preferences, cloud
sync, feature flags, and one-time migration markers.

---

## How to Add a New Storage Key

1. **Define a constant** in `js/constants.js` (preferred) or use a raw string
   for simple one-off flags:

   ```js
   // js/constants.js
   const MY_NEW_SETTING_KEY = 'myNewSetting';
   ```

2. **Add it to `ALLOWED_STORAGE_KEYS`** in the same file, with a comment
   describing the type and purpose:

   ```js
   const ALLOWED_STORAGE_KEYS = [
     // ... existing keys ...
     MY_NEW_SETTING_KEY, // string: description of what this stores
   ];
   ```

3. **Expose the constant** if it needs to be accessed from other files:

   ```js
   // bottom of constants.js, inside the window assignment block
   window.MY_NEW_SETTING_KEY = MY_NEW_SETTING_KEY;
   ```

4. **Use the wrappers** in your feature code:

   ```js
   // Write
   await saveData(MY_NEW_SETTING_KEY, value);

   // Read
   const value = await loadData(MY_NEW_SETTING_KEY, 'default');
   ```

Do **not** use the key anywhere before step 2 is complete — `cleanupStorage()`
will delete it on next startup.

---

## Migration Pattern — Renaming a Key

When a key must be renamed (e.g. to fix a typo or consolidate settings):

```js
// 1. Read the old value
const oldValue = await loadData('oldKeyName', null);

// 2. If present, migrate to the new key
if (oldValue !== null) {
  await saveData(NEW_KEY, oldValue);
  localStorage.removeItem('oldKeyName'); // direct remove is OK for cleanup
}

// 3. Keep 'oldKeyName' in ALLOWED_STORAGE_KEYS until after the migration
//    flag is confirmed written, then remove it in the next release.
```

Also add a one-time migration flag so the migration runs only once:

```js
const MIGRATION_FLAG = 'migration_myKeyRename';
// add to ALLOWED_STORAGE_KEYS

if (!loadDataSync(MIGRATION_FLAG, false)) {
  // ... migration logic ...
  saveDataSync(MIGRATION_FLAG, true);
}
```

Existing migration flags in the codebase follow the `migration_` prefix
convention (e.g. `migration_hourlySource`, `migration_seedHistoryMerge`).

---

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| `localStorage.setItem('myKey', JSON.stringify(val))` | Bypasses compression; key deleted by `cleanupStorage` if not in allowlist | Use `saveData` / `saveDataSync` |
| `JSON.parse(localStorage.getItem('myKey'))` | Bypasses decompression; crashes on compressed values | Use `loadData` / `loadDataSync` |
| Omitting explicit `defaultValue` for non-array keys | Caller receives `[]` instead of `null` / `false` / `''` | Always pass the correct default |
| Writing a new key before adding it to `ALLOWED_STORAGE_KEYS` | Value is silently deleted on next `cleanupStorage` run | Add to allowlist first |
| Using `saveDataSync` in async code paths | Works but loses the `console.error`-only behaviour — sync version re-throws | Prefer `saveData` for async code |
| Hardcoding a key string in two places | Key name drift and allowlist mismatches | Define a constant in `constants.js`, reference the constant everywhere |

---

## Related Pages

- [data-model.md](data-model.md) — shape of the inventory objects stored under `LS_KEY`
- [dom-patterns.md](dom-patterns.md) — `safeGetElement` and other DOM access rules

---
title: DOM Patterns
category: frontend
owner: staktrakr
lastUpdated: v3.33.19
date: 2026-03-01
sourceFiles:
  - js/utils.js
  - js/init.js
  - js/about.js
relatedPages:
  - frontend-overview.md
  - storage-patterns.md
---
# DOM Patterns

> **Last updated:** v3.33.19 — 2026-03-01
> **Source files:** `js/utils.js`, `js/init.js`, `js/about.js`

## Overview

StakTrakr enforces two strict DOM safety rules:

1. Element lookups should go through `safeGetElement()` as the preferred pattern. Raw `document.getElementById()` is acceptable in designated boot files (`about.js`, `init.js`) and exists in some pre-init and legacy paths (e.g., `card-view.js`, `inventory.js`).
2. All user-controlled content written to `innerHTML` must pass through `sanitizeHtml()` first to prevent XSS.

These rules exist because the app runs on `file://` (no server-side sanitization) and handles user-entered text that is later rendered as HTML. Violations are a recurring source of both runtime null-reference crashes and security bugs.

---

## Key Rules (read before touching this area)

- **Prefer `safeGetElement(id)`** for DOM lookups in application code.
- **Raw `document.getElementById()` is expected in `js/about.js` and `js/init.js`** (boot files that run before the wrapper is reliably available) and also exists in pre-init and legacy paths such as `js/card-view.js` and `js/inventory.js`.
- **Always call `sanitizeHtml(str)` before assigning user-supplied text to `innerHTML`.**
- Never assign an unescaped user string directly to `innerHTML`, even for "display-only" fields.

---

## Architecture

### `safeGetElement(id, required?)` — defined in `js/init.js`

```js
function safeGetElement(id, required = false) {
  const element = document.getElementById(id);
  if (!element && required) {
    console.warn(`Required element '${id}' not found in DOM`);
  }
  return element || createDummyElement();
}
```

**What it does when the element is not found:** returns a `createDummyElement()` object — a plain object with no-op stubs for all common DOM properties (`textContent`, `innerHTML`, `style`, `value`, `addEventListener`, etc.). This means callers never receive `null` and do not need to null-check before setting `.textContent` or attaching listeners. If `required = true` is passed, a `console.warn` is emitted so missing elements are visible in the DevTools console during development.

**Why this matters:** Raw `document.getElementById()` returns `null` when an element is absent. Any subsequent property access on `null` throws a TypeError and can crash the entire initialization chain. `safeGetElement` eliminates that failure mode.

---

### `sanitizeHtml(str)` — defined in `js/utils.js`

```js
const sanitizeHtml = (text) => {
  if (!text) return "";
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};
```

**What it does:** HTML-encodes the five characters that are meaningful inside HTML (`&`, `<`, `>`, `"`, `'`). The result is safe to interpolate directly into an `innerHTML` assignment or template literal — it renders as visible text, never as markup or script.

**When to use it:** Any time the string being inserted originated from user input (item names, notes, imported CSV fields, custom labels, etc.).

---

## Common Mistakes

### Mistake 1 — Raw `getElementById` in application code

```js
// WRONG — returns null if element is missing, crashes on .textContent
const el = document.getElementById('spotPrice');
el.textContent = price;
```

```js
// RIGHT — returns a dummy element if missing, no crash
const el = safeGetElement('spotPrice');
el.textContent = price;
```

---

### Mistake 2 — `innerHTML` with unsanitized user content

```js
// WRONG — XSS: a crafted item name like <script>alert(1)</script> executes
row.innerHTML = `<td>${item.name}</td>`;
```

```js
// RIGHT — encoded, renders as visible text only
row.innerHTML = `<td>${sanitizeHtml(item.name)}</td>`;
```

---

### Mistake 3 — Using `safeGetElement` in `about.js` or `init.js` before it is defined

`safeGetElement` is defined inside `js/init.js`. The `DOMContentLoaded` handler in `init.js` and the top-level code in `about.js` both run as part of early boot, before the function is reliably available to all callers in those two files. This is why those files use raw `document.getElementById()`. Some other files (e.g., `card-view.js`, `inventory.js`) also use raw lookups in pre-init or legacy paths — these are acceptable but new code should prefer `safeGetElement`.

```js
// EXPECTED — inside js/about.js, js/init.js, or legacy paths
const el = document.getElementById('aboutVersion');
```

```js
// PREFERRED for new code — use safeGetElement
const el = safeGetElement('settingsPanel');
```

---

### Mistake 4 — Skipping sanitization for "non-dangerous" fields

```js
// WRONG — item notes are user input; even "safe-looking" strings can contain angle brackets
modal.innerHTML = `<p>${item.notes}</p>`;
```

```js
// RIGHT — sanitize regardless of expected content
modal.innerHTML = `<p>${sanitizeHtml(item.notes)}</p>`;
```

---

### Mistake 5 — Sanitizing developer-controlled template strings

`sanitizeHtml` is for **user-supplied content only**. Do not wrap static developer-written HTML strings — that double-encodes intentional markup.

```js
// WRONG — sanitizing a static layout string; produces &lt;span&gt; in the DOM
el.innerHTML = sanitizeHtml(`<span class="badge">Active</span>`);
```

```js
// RIGHT — static markup from the developer does not need sanitizing
el.innerHTML = `<span class="badge">Active</span>`;
```

---

## Related Pages

- [frontend-overview.md](frontend-overview.md) — overall JS architecture and file load order
- [storage-patterns.md](storage-patterns.md) — `saveData()` / `loadData()` and `ALLOWED_STORAGE_KEYS`

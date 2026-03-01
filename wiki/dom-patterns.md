---
title: DOM Patterns
category: frontend
owner: staktrakr
lastUpdated: v3.32.25
date: 2026-02-23
sourceFiles:
  - js/utils.js
  - js/init.js
  - js/about.js
relatedPages:
  - frontend-overview.md
  - storage-patterns.md
---
# DOM Patterns

> **Last updated:** v3.32.25 — 2026-02-23
> **Source files:** `js/utils.js`, `js/init.js`, `js/about.js`

## Overview

StakTrakr enforces two strict DOM safety rules:

1. All element lookups must go through `safeGetElement()` — never raw `document.getElementById()` except in two designated boot files.
2. All user-controlled content written to `innerHTML` must pass through `sanitizeHtml()` first to prevent XSS.

These rules exist because the app runs on `file://` (no server-side sanitization) and handles user-entered text that is later rendered as HTML. Violations are a recurring source of both runtime null-reference crashes and security bugs.

---

## Key Rules (read before touching this area)

- **Use `safeGetElement(id)`** for every DOM lookup in application code.
- **Raw `document.getElementById()` is only allowed in `js/about.js` and `js/init.js`** — these are the two boot files that run before the `safeGetElement` wrapper is available.
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

`safeGetElement` is defined inside `js/init.js`. The `DOMContentLoaded` handler in `init.js` and the top-level code in `about.js` both run as part of early boot, before the function is reliably available to all callers in those two files. This is why those two files are the **only** permitted users of raw `document.getElementById()`.

```js
// ALLOWED — inside js/about.js or js/init.js only
const el = document.getElementById('aboutVersion');
```

```js
// WRONG — do not use raw getElementById anywhere else
const el = document.getElementById('settingsPanel'); // in settings.js — use safeGetElement instead
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

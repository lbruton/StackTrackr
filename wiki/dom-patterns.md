---
title: DOM Patterns
category: frontend
owner: staktrakr
lastUpdated: v3.33.25
date: 2026-03-02
sourceFiles:
  - js/utils.js
  - js/about.js
  - js/init.js
relatedPages:
  - frontend-overview.md
  - storage-patterns.md
---
# DOM Patterns

> **Last updated:** v3.33.25 — 2026-03-02
> **Source files:** `js/utils.js`, `js/init.js`, `js/about.js`

## Overview

StakTrakr enforces two strict DOM safety rules that apply to all application code:

1. Element lookups must go through `safeGetElement()`. Raw `document.getElementById()` is only acceptable in the designated boot files (`about.js`) where `safeGetElement` is not yet defined, and in a small number of legacy pre-init paths.
2. All user-controlled content written to `innerHTML` must pass through `sanitizeHtml()` first to prevent XSS.

These rules exist because the app runs on `file://` (no server-side sanitization), handles user-entered text that is later rendered as HTML, and initializes a large number of DOM elements at startup. Violations are a recurring source of both runtime null-reference crashes and security bugs.

---

## Key Rules

- **Use `safeGetElement(id)`** for all DOM lookups in application code.
- **Never use raw `document.getElementById()`** in application code outside the designated exceptions below.
- **Always call `sanitizeHtml(str)` before assigning user-supplied text to `innerHTML`.**
- Never assign an unescaped user string directly to `innerHTML`, even for fields that appear "display-only."
- `escapeHtml()` is a lower-level utility in `js/utils.js` used for specific button-loading contexts — prefer `sanitizeHtml()` for general user content.

---

## API Reference

### `safeGetElement(id, required?)` — defined in `js/init.js` (line 31)

```js
function safeGetElement(id, required = false) {
  const element = document.getElementById(id);
  if (!element && required) {
    console.warn(`Required element '${id}' not found in DOM`);
  }
  return element || createDummyElement();
}
```

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | — | The HTML element ID to look up |
| `required` | `boolean` | `false` | If `true`, emits a `console.warn` when the element is not found |

**Return value:** The real `HTMLElement` if found; otherwise a `createDummyElement()` object — never `null`.

**What the dummy element provides:** A plain object with no-op stubs for all commonly accessed DOM properties and methods. This means callers never receive `null` and never need to null-check before property access:

```js
// createDummyElement() returns:
{
  textContent: "",
  innerHTML: "",
  style: {},
  value: "",
  checked: false,
  disabled: false,
  addEventListener: () => {},
  removeEventListener: () => {},
  focus: () => {},
  click: () => {},
  querySelector: () => null,
  querySelectorAll: () => [],
}
```

**Why this matters:** Raw `document.getElementById()` returns `null` when an element is absent. Any subsequent property access on `null` — e.g., `el.textContent = x` — throws a TypeError and can crash the entire initialization chain. `safeGetElement` eliminates that failure mode by guaranteeing a non-null return value with a safe no-op interface.

**Using the `required` flag:** Pass `required = true` for elements that are critical to a feature. This emits a visible `console.warn` in DevTools during development without throwing an error:

```js
// Required element — warns if missing so developers notice during dev
elements.inventoryForm = safeGetElement("inventoryForm", true);

// Optional element — silently returns dummy if missing
elements.itemGbDenom = safeGetElement("itemGbDenom");
```

---

### `sanitizeHtml(str)` — defined in `js/utils.js` (line 734)

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

**When to use it:** Any time the string originated from user input — item names, notes, imported CSV fields, custom labels, catalog lookups, etc.

**Edge case:** Returns `""` for falsy values (`null`, `undefined`, `0`, empty string). Callers that need to distinguish between empty string and missing data should check before calling.

---

### `escapeHtml(str)` — defined in `js/utils.js` (line 16)

```js
const escapeHtml = (str) =>
  String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
```

**Difference from `sanitizeHtml`:** `escapeHtml` uses `str ?? ''` (nullish coalescing) and always coerces, while `sanitizeHtml` returns `""` on any falsy value. They produce the same output for non-empty strings. `escapeHtml` is used internally for button loading states (e.g., `setButtonLoading`) and is exposed on `window` for external use. Prefer `sanitizeHtml` in new application code.

---

### `safeAttachListener(element, event, handler, description?)` — defined in `js/events.js`

```js
const safeAttachListener = (element, event, handler, description = "") => {
  if (!element) {
    console.warn(`Cannot attach ${event} listener: element not found (${description})`);
    return false;
  }
  try {
    element.addEventListener(event, handler);
    return true;
  } catch (error) {
    console.warn(`Standard addEventListener failed for ${description}:`, error);
    // ...
  }
};
```

**When to use it:** Whenever attaching a listener to an element that might not exist in every render context. Avoids crashing when optional UI elements are absent.

**Companion — `optionalListener(el, event, handler, label)`:** A one-liner guard that calls `safeAttachListener` only if `el` is truthy. Use for truly optional elements where the listener is a no-op when the element is absent:

```js
optionalListener(fileInput, "change", handleChange, "CSV file input");
```

---

## Startup Exception

`safeGetElement` is defined at **`js/init.js` line 31**. The script load order in `index.html` means `js/about.js` is executed before `init.js`, so `safeGetElement` does not yet exist when `about.js` runs.

**`about.js` must use raw `document.getElementById()`** — this is intentional and expected:

```js
// EXPECTED — inside js/about.js (runs before init.js defines safeGetElement)
const ackModal = document.getElementById("ackModal");
const aboutVersion = document.getElementById("aboutVersion");
```

`about.js` guards its own lookups with `if (element)` null checks rather than relying on the dummy-element pattern. New code added to `about.js` must follow the same pattern.

Code inside `init.js` itself CAN use `safeGetElement` after line 31, and all element lookups in the `initializeApp()` function do so.

**Summary of where each lookup style is appropriate:**

| File / Context | Lookup style | Reason |
|---|---|---|
| `js/about.js` | `document.getElementById()` + `if` guard | Runs before `safeGetElement` is defined |
| `js/init.js` (after line 31) | `safeGetElement()` | `safeGetElement` is available |
| All other JS files | `safeGetElement()` | Standard pattern |
| Legacy paths (`card-view.js`, `inventory.js` pre-init sections) | `document.getElementById()` | Historical; acceptable but not preferred for new code |

---

## Common Mistakes

### Mistake 1 — Raw `getElementById` in application code

```js
// WRONG — returns null if element is missing, crashes on property access
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

### Mistake 3 — Using `safeGetElement` in `about.js` before it is defined

`safeGetElement` is not available when `about.js` runs. Calling it there produces a `ReferenceError`.

```js
// WRONG — inside js/about.js — safeGetElement is not defined yet
const el = safeGetElement('aboutVersion');
```

```js
// RIGHT — inside js/about.js — use raw getElementById with a null guard
const el = document.getElementById('aboutVersion');
if (el) el.textContent = `v${APP_VERSION}`;
```

---

### Mistake 4 — Skipping sanitization for "non-dangerous" fields

User notes, item names, and imported text fields can all contain angle brackets or quotes. Sanitize regardless of expected content.

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

`sanitizeHtml` is for **user-supplied content only**. Do not wrap static developer-written HTML strings — that double-encodes intentional markup and produces visible `&lt;span&gt;` strings in the UI.

```js
// WRONG — sanitizing a static layout string; produces &lt;span&gt; in the DOM
el.innerHTML = sanitizeHtml(`<span class="badge">Active</span>`);
```

```js
// RIGHT — static markup from the developer does not need sanitizing
el.innerHTML = `<span class="badge">Active</span>`;
```

---

### Mistake 6 — Attaching a listener to a potentially-null element directly

```js
// WRONG — crashes if optionalBtn is null
optionalBtn.addEventListener('click', handler);
```

```js
// RIGHT — silently skips if element is absent
optionalListener(optionalBtn, 'click', handler, 'optional button');
```

---

## Related Pages

- [frontend-overview.md](frontend-overview.md) — overall JS architecture and file load order
- [storage-patterns.md](storage-patterns.md) — `saveData()` / `loadData()` and `ALLOWED_STORAGE_KEYS`

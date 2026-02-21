---
name: ui-design
description: Use when writing HTML or CSS for any StakTrakr UI element — buttons, modals, form groups, settings panels, cards, toggles, or collapsible sections. Also use when existing UI output doesn't match the site's aesthetic.
---

# StakTrakr UI Design

## Overview

StakTrakr has a mature, consistent design system. **Never invent patterns — match existing ones.**
The living reference is `style.html` (open in a browser). All components, tokens, and patterns are demonstrated there.

**Do NOT use the `frontend-design` plugin for StakTrakr work.** It generates creative, divergent UI. StakTrakr needs consistency, not creativity.

---

## Anti-Patterns — Stop Before Writing

| ❌ Wrong | ✅ StakTrakr pattern |
|----------|---------------------|
| `<button class="btn btn-primary btn-lg">` | `<button class="btn">` or `<button class="btn btn-sm">` |
| `<h3>Modal Title</h3>` as large header | `<h2 style="font-size:1.15rem; font-weight:700; margin:0;">Title</h2>` in flex header |
| `<input type="checkbox">` for a setting toggle | `.chip-sort-toggle` (see below) |
| `background: #3b82f6` | `background: var(--primary)` |
| `border-radius: 8px` | `border-radius: var(--radius)` |
| `border-radius: 9999px` | `border-radius: var(--radius)` (buttons are NOT pill-shaped) |
| Standalone `<div>` wrapper for a settings row | `.settings-fieldset` > `.settings-group` pattern |
| Raw `<section>` with `<h2>` inside a modal | Form section stays within `.modal-content` body |

---

## Component Quick Reference

### Buttons

```html
<!-- Standard — use for primary modal/form submit -->
<button class="btn" id="myBtn">Save</button>

<!-- Small — use for inline actions, modal footers, cancel buttons -->
<button class="btn btn-sm" id="myBtn">Save</button>
<button class="btn secondary btn-sm" id="cancelBtn">Cancel</button>

<!-- Variants: secondary, success, danger, warning, info, premium -->
<button class="btn danger btn-sm" id="deleteBtn">Delete</button>
```

**Rule:** Prefer `.btn-sm` inside modals and settings. Reserve full `.btn` for primary page-level CTAs.

---

### Modal Structure

```html
<div class="modal-overlay" id="myModal">
  <div class="modal-content">
    <!-- Header -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid var(--border);">
      <h2 style="font-size:1.15rem; font-weight:700; margin:0;">Modal Title</h2>
      <button class="btn btn-sm secondary" id="myCloseBtn">&times;</button>
    </div>
    <!-- Body -->
    <div>
      <!-- form fields, content -->
    </div>
    <!-- Footer -->
    <div style="display:flex; justify-content:flex-end; gap:0.5rem; padding-top:0.75rem; border-top:1px solid var(--border);">
      <button class="btn secondary btn-sm" id="myCancelBtn">Cancel</button>
      <button class="btn btn-sm" id="mySubmitBtn">Save</button>
    </div>
  </div>
</div>
```

Glass-morphism applied automatically by `.modal-content` styles.

---

### Settings Group (Settings Modal Panels)

```html
<div class="settings-fieldset">
  <div class="settings-fieldset-title">Group Name</div>
  <div class="settings-group">
    <div class="settings-group-label">Setting label</div>
    <p class="settings-subtext">Help text describing what this setting does.</p>
    <!-- Toggle, input, or button here -->
  </div>
  <!-- Additional .settings-group rows as needed -->
</div>
```

---

### Boolean Toggle (Chip Sort Toggle)

```html
<div class="chip-sort-toggle">
  <button class="chip-sort-btn active" data-val="yes">On</button>
  <button class="chip-sort-btn" data-val="no">Off</button>
</div>

<!-- 3-segment variant -->
<div class="chip-sort-toggle">
  <button class="chip-sort-btn active">Option A</button>
  <button class="chip-sort-btn">Option B</button>
  <button class="chip-sort-btn">Option C</button>
</div>
```

**Rule:** All boolean/enum settings use `.chip-sort-toggle`. Never use `<input type="checkbox">` or `<input type="radio">` for settings UI.

---

### Collapsible / Accordion Form Section

```html
<details class="form-section">
  <summary class="form-section-header">Section Title</summary>
  <div class="form-section-body">
    <div>
      <label for="inputId">Field Label</label>
      <input id="inputId" type="text" placeholder="..." />
    </div>
  </div>
</details>

<!-- With icon -->
<details class="form-section">
  <summary class="form-section-header">
    <span class="form-section-icon">
      <!-- 16×16 SVG icon here -->
    </span>
    Section Title
  </summary>
  <div class="form-section-body">
    <!-- fields -->
  </div>
</details>
```

Zero JavaScript required. Works on `file://` protocol.

---

### Form Inputs

```html
<label for="fieldId">Label text</label>
<input id="fieldId" type="text" placeholder="Hint..." />

<select id="mySelect">
  <option>Silver</option>
  <option>Gold</option>
</select>

<!-- Currency input wrapper -->
<div class="currency-input">
  <input type="number" placeholder="29.50" step="0.01" />
</div>
```

Inputs inherit `var(--bg-primary)` background, `var(--border)` border, `var(--radius)` rounding automatically from the stylesheet.

---

### Cards

```html
<div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:1rem; box-shadow:var(--shadow-sm);">
  <!-- card content -->
</div>
```

---

## CSS Token Quick Reference

| Category | Tokens |
|----------|--------|
| Colors | `--primary`, `--secondary`, `--success`, `--info`, `--warning`, `--danger` (+ `-hover` variants) |
| Backgrounds | `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-card` |
| Text | `--text-primary`, `--text-secondary` |
| Metals | `--silver`, `--gold`, `--platinum`, `--palladium` |
| Item types | `--type-{coin,round,bar,note,set,other}-{bg,text}` |
| Borders | `--border`, `--border-hover` |
| Shadows | `--shadow-sm`, `--shadow`, `--shadow-lg` |
| Spacing | `--spacing-xs`, `--spacing-sm`, `--spacing`, `--spacing-lg`, `--spacing-xl` |
| Radius | `--radius` (8px cards/inputs), `--radius-lg` (12px modals) |
| Transition | `--transition` |

**Rule:** Never hardcode colors, spacing, or border-radius. CSS vars adapt across all 4 themes (light/dark/sepia/system).

---

## Verification Checklist

Before integrating any UI:

- [ ] Buttons use `.btn` or `.btn-sm` — not Bootstrap's `.btn-primary`/`.btn-lg`
- [ ] Modal follows 3-part header/body/footer structure
- [ ] Settings use `.settings-fieldset` > `.settings-group` pattern
- [ ] Boolean settings use `.chip-sort-toggle`, not checkboxes
- [ ] No hardcoded colors or radius values
- [ ] CSS vars used throughout — theme-safe
- [ ] Open `style.html` in browser and compare visually if uncertain

---

## Living Reference

Open `style.html` in a browser (works on `file://`):

```bash
open /Volumes/DATA/GitHub/StakTrakr/style.html
```

All patterns, variants, and token swatches are demonstrated live with theme switching.

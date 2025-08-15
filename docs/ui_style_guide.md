# UI Style Guide

This guide summarizes the visual design conventions used throughout StackrTrackr. It references existing CSS variables from [`css/styles.css`](../css/styles.css) and component patterns in `index.html`.

## Color Palette

StackrTrackr uses CSS custom properties to centralize theming:

- **Primary:** `var(--primary)` / hover `var(--primary-hover)`
- **Secondary:** `var(--secondary)` / hover `var(--secondary-hover)`
- **Success:** `var(--success)` / hover `var(--success-hover)`
- **Warning:** `var(--warning)` / hover `var(--warning-hover)`
- **Danger:** `var(--danger)` / hover `var(--danger-hover)`
- **Backgrounds:** `var(--bg-primary)`, `var(--bg-secondary)`, `var(--bg-tertiary)`
- **Text:** `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`

Dark mode provides parallel variables under the `[data-theme="dark"]` selector.

## Typography

- Global font stack is defined on the `html` element (`Inter`, system sans-serif fallbacks).
- Headings:
  - `h1`: `1.875rem` and colored with `var(--primary)`
  - `h2`: `1.25rem`, `var(--text-primary)`
- Labels use `font-weight: 500` at `0.875rem`.

## Spacing & Layout

Reusable spacing tokens ensure consistent rhythm:

- `--spacing-sm: 0.4rem`
- `--spacing: 0.75rem`
- `--spacing-lg: 1.25rem`
- `--spacing-xl: 1.5rem`
- Border radii: `--radius` and `--radius-lg`

## Header

The main application header uses the `.app-header` container with a gradient title:

```html
<div class="app-header">
  <h1 class="app-logo" aria-label="StackrTrackr">
    <!-- inline SVG logo -->
  </h1>
  <!-- action buttons -->
</div>
```

`css/styles.css` applies background `var(--bg-card)`, border `var(--border)`, spacing, and shadow.

## Modals

All dialogs follow a consistent structure:

```html
<div class="modal" id="exampleModal">
  <div class="modal-content">
    <div class="modal-header">
      <button class="modal-close">×</button>
    </div>
    <div class="modal-body">...</div>
  </div>
</div>
```

Key styles:

- `.modal` centers content with a translucent backdrop.
- `.modal-content` uses `var(--bg-card)`, `var(--border)`, and `var(--radius-lg)`.
- `.modal-close` is absolutely positioned in the header with hover feedback.

## Buttons

The `.btn` class provides the base button style with variant modifiers:

- Default buttons use `var(--primary)` with hover state `var(--primary-hover)`.
- Variants: `.success`, `.danger`, `.secondary`, `.warning`, and `.premium` map to their respective color variables.
- Buttons include a subtle shine effect via the `::before` pseudo-element and use `var(--radius)` for rounded corners.

Use these guidelines to keep new UI elements consistent with the existing design system.

## Inventory Table Counter

- The `#itemCount` element displays the number of visible inventory items.
- Styled with `.table-item-count` using muted text (`var(--text-muted)`), `0.95rem` font size, `font-weight: 600`, subtle `var(--bg-tertiary)` background with `var(--radius)` corners, left alignment, and a small top margin.
- Rows-per-page control uses `.control-select`, a compact button-style dropdown (`width: 4rem`, custom arrow) aligned to the right side of the table footer.

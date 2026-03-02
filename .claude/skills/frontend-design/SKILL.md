---
name: frontend-design
description: Use when mocking up new UI elements, exploring layout concepts, or generating visual prototypes for StakTrakr. Creative exploration is welcome — but all output must use StakTrakr's CSS token system and component patterns so mockups can actually integrate.
---

<!-- StakTrakr project override — wraps frontend-design@claude-plugins-official.
     Adds token constraints and integration rules so mockup output is integrable.
     Last reviewed: 2026-02-24. -->

# StakTrakr Frontend Design

## When to use this skill

- Mocking up a new UI element you haven't built yet
- Exploring layout or visual direction before committing to code
- Generating playground prototypes (`playground` skill output)
- Getting a second creative opinion on an existing component

**Not for:** Writing production code directly into StakTrakr. Any output from this skill goes through the Playground → ui-design checklist → integration flow before landing in the codebase.

---

## StakTrakr Design Constraints

These apply to all output — mockups included. They ensure generated HTML is integrable without a full rewrite.

### Tokens — always use CSS variables

Never hardcode colors, spacing, border-radius, or shadows. StakTrakr's 4 themes (light/dark/sepia/system) depend entirely on CSS vars:

| Category | Variables |
|----------|-----------|
| Colors | `--primary`, `--secondary`, `--success`, `--info`, `--warning`, `--danger` (+ `-hover`) |
| Backgrounds | `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-card` |
| Text | `--text-primary`, `--text-secondary` |
| Metals | `--silver`, `--gold`, `--platinum`, `--palladium` |
| Borders | `--border`, `--border-hover` |
| Shadows | `--shadow-sm`, `--shadow`, `--shadow-lg` |
| Spacing | `--spacing-xs` `--spacing-sm` `--spacing` `--spacing-lg` `--spacing-xl` |
| Radius | `--radius` (8px), `--radius-lg` (12px modals) |

### Typography — no CDN fonts

StakTrakr is served from `file://` — external font imports won't load. Use system font stack only:

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

Creative typographic expression should come from weight, size, spacing, and letter-spacing — not from font family choices.

### Motion — CSS only, no external libraries

No Motion/GSAP/anime.js. CSS transitions and `@keyframes` only. Keep it subtle — StakTrakr has `--transition` for interactive elements.

### Core component patterns

When generating mockups that include these elements, use StakTrakr's patterns:

| Element | Pattern |
|---------|---------|
| Button (modal actions) | Pill buttons: `.btn secondary`, `.btn`, `.btn premium` with `border-radius: 999px` scoped CSS — see `ui-standards/style.html` |
| Button (page-level) | `.btn` or `.btn-sm` — never `.btn-primary` or `.btn-lg` |
| Modal header | Glass style: `background: var(--bg-secondary); border-bottom: 1px solid var(--border)` — NOT gradient banner |
| Modal | `.modal` > `.modal-content` with flex header/body/footer + pill action buttons |
| Settings row | `.settings-fieldset` > `.settings-group` |
| Boolean toggle | `.chip-sort-toggle` > `.chip-sort-btn` — never `<input type="checkbox">` |
| Card | `background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg)` |

**Migration reference:** `ui-standards/style.html` has a Migration Checklist section listing old patterns and what to replace them with. Check it when building modal mockups.

### File protocol safe

No `fetch()` calls to localhost. No ES module imports. No bundler assumptions. Vanilla JS only.

---

## Creative latitude within these constraints

Within the constraints above, creative exploration is fully encouraged:

- **Layout**: asymmetry, overlap, negative space, grid-breaking — all fair game in mockups
- **Color emphasis**: use the token palette boldly — pick a dominant accent, vary weight
- **Spatial rhythm**: tight density vs generous breathing room — explore both
- **Micro-interactions**: CSS hover states, transitions, `details/summary` accordion patterns
- **Dark/light mood**: mockups can target dark theme (`prefers-color-scheme: dark`) or light — just use the vars

**The goal**: find what's visually interesting *within* StakTrakr's system, not outside it. The best mockups reveal a direction that could realistically ship.

---

## After generating a mockup

1. Save as a playground file: `playground/YYYY-MM-DD-<topic>.html`
2. Open in browser: `open playground/YYYY-MM-DD-<topic>.html`
3. User reviews and approves
4. If approved for integration → hand off to `ui-design` skill for production implementation

Do not write mockup output directly into `index.html` or any live StakTrakr file.

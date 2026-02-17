# Settings Modal Mockup Research

This folder contains lightweight UX prototypes for a redesigned Settings modal.

## Framework Research (file:// compatible, no build step)

| Framework | Weight (approx) | file:// friendly | Fit for StakTrakr | Notes |
|---|---:|---|---|---|
| **Tabler (CSS-only usage)** | ~120KB minified CSS (core) | Yes (if CSS is vendored locally) | **High** | Great admin-like side navigation, cards, and spacing system. JS plugins are optional. |
| **Pico.css** | ~10KB minified | Yes | High | Very small, semantic-first styles. Good for rapid mobile-first forms. Less opinionated component library than Tabler. |
| **Spectre.css** | ~11KB minified | Yes | Medium | Lightweight and simple utility/components. Fewer polished patterns for complex desktop settings compared to Tabler. |

### Recommendation

- Use **Tabler-inspired layout tokens** for the main production redesign because it maps cleanly to the existing section-heavy settings IA.
- Keep a **Pico-like simplified stacked/segmented design** as a fallback pattern for mobile-first mode and future A/B testing.

## Included Prototypes

- `test.html` – launcher page with theme switcher and buttons to open both concepts.
- `mockup.css` – shared light/dark/sepia theming + responsive modal styles.
- `mockup.js` – section generation and modal interactions.

## Design Goals Satisfied

- Includes all current settings categories:
  - Appearance, Layout, Images, System, Inventory, Chips, Search, API, Files
- Theme-aware for existing visual modes (light, dark, sepia)
- Responsive behavior for mobile/tablet/desktop
- Structure is drop-in-oriented: existing controls can be mounted without changing IDs or event wiring.

# Settings Modal UI Framework Research (file:// Compatible)

## Requirements checked
- Works without a build step.
- Can be self-hosted (downloaded CSS/JS files) so `file://` still works.
- Light footprint for a single-page vanilla JavaScript app.
- Theming flexibility for StakTrakr light/dark/sepia/system modes.

## Candidate frameworks

| Framework | Approx Size | file:// Friendly | Why it fits | Caveats |
|---|---:|---|---|---|
| **Tabler (CSS-first usage)** | ~300KB CSS (full), can cherry-pick | ✅ when self-hosted | Card, nav, form, and modal patterns already close to StakTrakr goals. | Full bundle is larger than micro frameworks; best used selectively. |
| **Pico.css** | ~10KB minified | ✅ when self-hosted | Semantic HTML, clean defaults, excellent responsive forms/modals with minimal classes. | Less “app dashboard” look unless paired with custom utility classes. |
| **Shoelace (Web Components)** | ~80-120KB+ depending components | ✅ when self-hosted | Accessible, composable components (tabs, drawers, dialogs). | Requires loading component JS modules; heavier runtime than CSS-only options. |
| **Picnic CSS** | ~11KB minified | ✅ when self-hosted | Very small, responsive UI primitives, easy to layer into vanilla pages. | More basic visual language; requires custom polish for premium UX. |

## Recommendation for prototype direction
1. **Design A (Tabler-inspired):** Keep settings as a left rail + card content, improve scanning with grouped cards, sticky action footer, and quick search.
2. **Design B (Mobile-first stepper/accordion):** Use a compact section picker and progressive disclosure for touch devices, with desktop split view.

These prototypes are implemented in `mockup/test.html` without external CDN dependencies so they can run via `file://` or localhost.

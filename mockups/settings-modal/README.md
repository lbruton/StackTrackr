# Settings Modal Mockups (Research + Prototype)

## Lightweight framework research (file:// compatible)

These options are intentionally CSS-first (or progressive enhancement) so they can run without a build step and remain compatible with `file://` launch.

1. **Tabler CSS (inspired target)**
   - Why fit: design language already matches dashboard/admin UI patterns and gives clean cards, nav, forms, and modal primitives.
   - File protocol fit: can be vendored as static CSS/JS assets in repo and linked via relative `<link>` and `<script>` tags.
   - Integration approach: use Tabler utility/card classes only, keep existing JS modal logic and IDs.

2. **Picocss (class-light semantic CSS)**
   - Why fit: very small footprint, minimal class churn, and works well for readable forms/sections.
   - File protocol fit: single CSS file can be vendored locally, no runtime dependency.
   - Integration approach: keep current DOM IDs/events, only adjust layout wrappers.

3. **Shoelace Web Components (optional progressive enhancement)**
   - Why fit: accessible tabs, drawers, dialogs, and segmented controls out of the box.
   - File protocol fit: works when component files are served locally from repo; no bundler required.
   - Integration approach: migrate modal shell widgets first (tabs/accordion), preserve existing data/control wiring.

4. **Spectre.css / Milligram / Water.css (tiny fallback options)**
   - Why fit: lightweight utility/form styling with minimal JS assumptions.
   - File protocol fit: pure CSS files can be shipped locally and loaded via relative paths.

## Mockups created

- `test.html` includes two settings modal concepts:
  1. **Design A: Tabler-inspired navigation shell** (left nav + carded settings overview + sticky footer actions).
  2. **Design B: Adaptive workspace shell** (search-first pane + workflow accordions).

Both mockups:
- are responsive for mobile/tablet/desktop breakpoints,
- support light/dark/sepia theme toggling,
- preserve all current settings domains in the IA mapping.

## How to run

Open directly:
- `file:///.../mockups/settings-modal/test.html`

Or via local server:
- `python -m http.server 8000`
- navigate to `http://localhost:8000/mockups/settings-modal/test.html`

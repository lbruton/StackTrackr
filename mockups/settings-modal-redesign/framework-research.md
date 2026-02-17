# Settings Modal Redesign: Lightweight Framework Research (file:// Compatible)

## Constraints from StakTrakr

- Must run directly from `file://` with no build step.
- Must be lightweight and easy to drop into vanilla JavaScript globals.
- Must support custom theming via existing CSS variables (`--bg-*`, `--text-*`, `--border`, etc.).
- Should not require Node runtime or bundling.

## Candidates

### 1) Tabler (recommended visual direction)
- **Type:** Bootstrap-based UI kit.
- **Why it fits:** Excellent admin/settings IA patterns (sidebar + content cards), mobile-ready, clear information density.
- **file:// viability:** Works if assets are vendored locally (`tabler.min.css`, optional JS bundle).
- **Weight:** Moderate (larger than utility-only libs).
- **Integration approach:** Use Tabler-inspired layout patterns while keeping existing IDs and JS behavior.

### 2) Pico.css
- **Type:** Class-light CSS framework.
- **Why it fits:** Very small, semantic HTML first, easy to theme with CSS vars.
- **file:// viability:** Excellent when local CSS file is included.
- **Weight:** Lightweight.
- **Integration approach:** Good for rapid modal/card/accordion structures without extra JS.

### 3) Shoelace (Web Components)
- **Type:** Component library (`<sl-dialog>`, `<sl-tab-group>`, etc.).
- **Why it fits:** Accessible components out of the box.
- **file:// viability:** Works only when JS/CSS component assets are local and correctly referenced.
- **Weight:** Moderate.
- **Integration approach:** Potentially powerful, but migration effort is higher because existing modal logic is not component-based.

### 4) Spectre.css
- **Type:** Minimal CSS framework.
- **Why it fits:** Small and simple; easy to adopt selectively.
- **file:// viability:** Excellent when vendored.
- **Weight:** Lightweight.
- **Integration approach:** Can provide baseline visual polish with minimal rewiring.

## Recommendation

1. **Primary direction:** Keep vanilla JS and implement a **Tabler-inspired shell** for settings (sidebar + grouped cards + sticky action footer).
2. **Secondary direction:** Provide an **accordion/journey layout** for mobile-first discoverability.
3. **Adoption strategy:** Vendor any third-party CSS locally if chosen later, but first validate IA and UX with framework-inspired mockups that preserve existing control IDs and section mapping.

## What was implemented in this mockup package

- Two modal prototypes in `test.html`:
  - **Design A:** Tabler-inspired workspace modal.
  - **Design B:** Progressive accordion/journey modal.
- Prototypes are themed with StakTrakr variables for light/dark/sepia compatibility.
- Settings sections are sourced from live `index.html` markup via `fetch` + `DOMParser`, preserving current section labels and panel content structure.

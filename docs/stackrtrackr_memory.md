# StackrTrackr – Assistant Working Memory

## Purpose
Offline-first (serverless-capable) precious metals inventory tracker with spot price integration.

## Core Traits
- Serverless mode via `file://` support (`file-protocol-fix.js`) and permissive CSP.
- Modular JS architecture (each feature in its own file).
- Works from flash drive or hosted server.
- API abstraction layer for **Metals.dev**, **Metals-API**, **MetalPriceAPI**.
- Imports CSVs (Numista & generic) with custom mapping + regex fuzzy search.
- Exports inventory + spot histories (CSV, ZIP, PDF).
- Charts via Chart.js for history and portfolio breakdown.
- Theming system with CSS variables for light/dark modes.

## Key Modules
- **constants.js** – App config, API provider definitions, branding, localStorage keys, metal definitions.
- **api.js** – Provider orchestration, fetch/caching, batch/history support, usage tracking.
- **spot.js** – Spot price state, reset/update, history storage.
- **inventory.js** – Inventory CRUD, totals calculation, CSV import/export.
- **filters.js, search.js, fuzzy-search.js, sorting.js, pagination.js** – Table UX.
- **charts.js** – Portfolio charts.
- **events.js** – DOM event wiring, safe attach patterns.
- **init.js** – Main boot process.
- **catalog-providers.js/catalog-manager.js** – Numista + other catalog support.
- **customMapping.js** – CSV header/value remapping.
- **file-protocol-fix.js** – Serverless compatibility.

## UI Elements
- Inventory table with filters/search/pagination.
- Metal cards with spot price & reset buttons.
- Modals: About, Changelog, Details, API keys/settings, Acknowledgements.
- Top bar buttons: About, API settings, Files, Theme toggle.

## External Libraries (CDN)
- PapaParse, Chart.js, jsPDF + autotable, JSZip.

## LocalStorage Keys
- Inventory, spot history, API config/cache, UI theme, app version tracking.

## Known Issues & Priorities
1. Event wiring timing → intermittent button failures.
2. “Export All” missing history/inventory files sometimes.
3. Weak offline error feedback (silent fallbacks).
4. Provider price parsing differences.
5. CDN reliance in file:// mode (needs local fallbacks).
6. Version mismatch between README & app.
7. Import sanitation for bad CSV data.
8. No baked 1-year history.
9. Numista autocomplete not yet wired.
10. API key & settings portability.

---

# Assistant Schema & Roadmap

## **Schema for Fast Context Rebuild**
- **Purpose:** High-level one-liner of app’s function.
- **Core Traits:** Bullet list of the big architectural decisions.
- **Module Map:** List of all JS/CSS files, their responsibilities.
- **Data Model:** Inventory fields, spot history structure, localStorage keys.
- **External Dependencies:** All libraries & APIs used, version if known.
- **UI Map:** Major UI components and their IDs.
- **Known Issues/Priorities:** Top current work items.

## **Functional Roadmap for Rapid Dive-In**
1. **Boot Sequence** – Understand init order (`init.js`, `events.js`, DOM ready).
2. **API Layer** – Review `constants.js` provider configs + `api.js` orchestration.
3. **Data Flow** – Inventory CRUD, spot caching, history management.
4. **Import/Export** – CSV parsing, PDF/ZIP generation, mapping layer.
5. **UI Wiring** – Event binding patterns, modal opening/closing, theming.
6. **Serverless Mode** – `file-protocol-fix.js` handling and CSP implications.
7. **Charting** – `charts.js` integration with spot & inventory data.
8. **Testing Harness** – Manual test plan: import CSV, fetch spots, export all, offline mode.
9. **Bug Fix Pass** – Start with highest-impact user-facing issues.
10. **Enhancements** – Autocomplete, baked history, settings portability.

---
**File Generated:** {today}

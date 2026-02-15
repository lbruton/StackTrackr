## What's New

- **Price History Fixes & Chart Improvements (v3.29.03)**: Fixed Goldback items recording $0.00 retail in price history. Added per-item price history modal with inline delete and undo/redo. Fixed All-time chart on file:// protocol via seed bundle. Adaptive x-axis year labels. Custom date range picker on charts (STAK-108, STAK-109, STAK-103)
- **PWA Crash Fix: Service Worker Error Handling (v3.29.02)**: Fixed installed PWA crash (ERR_FAILED) by adding error handling to all service worker fetch strategies. Navigation handler now falls back through cached index.html, cached root, and inline offline page
- **Codacy Duplication Reduction (v3.29.01)**: Extracted shared toggle helpers, merged config table renderers, deduplicated item field builders and modal close handlers
- **Edit Modal Pattern Rule Toggle (v3.29.00)**: "Apply to all matching items" checkbox in edit modal image upload — creates a pattern rule from keywords instead of per-item images

## Development Roadmap

- **Chart Overhaul (STAK-48)**: Migrate to ApexCharts with time-series trend views
- **Custom CSV Mapper (STAK-51)**: Header mapping UI with saved import profiles

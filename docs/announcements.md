## What's New

- **Spot Comparison Mode & Mobile API Settings (v3.27.04)**: 24h % comparison mode setting (Close/Close, Open/Open, Open/Close). Replaced drag-to-sort provider tabs with Sync Priority dropdowns. Mobile tab overflow fix. Consistent 24h % across all spot card views (STACK-89, STACK-90, STACK-92)
- **PWA Support & Bug Fixes (v3.27.03)**: Installable app experience with offline caching via service worker. Fixed: edit-mode price preservation (STACK-81), stale spot-lookup on date change (STACK-82), Activity Log tabs showing stale data (STACK-83), Samsung S24+ Ultra layout (STACK-85). Removed redundant View icon (STACK-86). Spot history seed data from Docker poller infrastructure
- **Coin Image Cache & Item View Modal (v3.27.00)**: IndexedDB image cache for Numista coin photos with 50MB quota. Card-style view modal with images, inventory data, valuation, grading, and enriched Numista metadata. Settings toggles for 15 fields. View button in table/card actions. Clickable source URLs and N# badges open in popup windows. eBay search from view modal. Full-screen mobile layout with sticky footer
- **XSS & HTML Injection Hardening (v3.26.03)**: Escaped item names in Price History, metal/source/provider in Spot History, and source/data-attrs in Spot Lookup. Added shared escapeHtml() utility

## Development Roadmap

- **Chart Overhaul (STACK-48)**: Migrate to ApexCharts with time-series trend views
- **Custom CSV Mapper (STACK-51)**: Header mapping UI with saved import profiles

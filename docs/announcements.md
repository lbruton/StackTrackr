## What's New

- **PWA Support & Bug Fixes (v3.27.03)**: Installable app experience with offline caching via service worker. Fixed: edit-mode price preservation (STACK-81), stale spot-lookup on date change (STACK-82), Activity Log tabs showing stale data (STACK-83), Samsung S24+ Ultra layout (STACK-85). Removed redundant View icon (STACK-86). Spot history seed data from Docker poller infrastructure
- **Coin Image Cache & Item View Modal (v3.27.00)**: IndexedDB image cache for Numista coin photos with 50MB quota. Card-style view modal with images, inventory data, valuation, grading, and enriched Numista metadata. Settings toggles for 15 fields. View button in table/card actions. Clickable source URLs and N# badges open in popup windows. eBay search from view modal. Full-screen mobile layout with sticky footer
- **STACK-79, STACK-80: XSS & HTML Injection Hardening (v3.26.03)**: Escaped item names in Price History, metal/source/provider in Spot History, and source/data-attrs in Spot Lookup. Added shared escapeHtml() utility
- **Autocomplete Migration & Version Check CORS (v3.26.02)**: One-time migration auto-enables fuzzy autocomplete for users with silently disabled flag. Fixed version check CORS failure from staktrakr.com 301 redirect
- **STACK-62: Autocomplete & Fuzzy Search Pipeline (v3.26.00)**: Autocomplete dropdowns on form inputs (name, purchase/storage location), abbreviation expansion in search (ASE, kook, krug, etc.), fuzzy fallback with indicator banner, registerName() for dynamic suggestions, Firefox compatibility fix

## Development Roadmap

- **Chart Overhaul (STACK-48)**: Migrate to ApexCharts with time-series trend views
- **Custom CSV Mapper (STACK-51)**: Header mapping UI with saved import profiles

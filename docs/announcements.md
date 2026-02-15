## What's New

- **Timezone Selection & PWA Fixes (v3.27.06)**: Display timezone selector in Settings > System — all timestamps respect user-chosen zone while stored data stays UTC. Fixed bare UTC timestamp parsing for spot cards and history. PWA second-launch fix with absolute start_url and navigation-aware service worker. What's New splash stale cache fix (STACK-63, STACK-93)
- **Numista Bulk Sync & IDB Cache Fix (v3.27.05)**: Bulk sync metadata + images from the Numista API card with inline progress and activity log. Fixed opaque blob IDB corruption that caused images to disappear after bulk cache on HTTPS. Table row thumbnail images with hover preloading (STACK-84, STACK-87, STACK-88)
- **Spot Comparison Mode & Mobile API Settings (v3.27.04)**: 24h % comparison mode setting (Close/Close, Open/Open, Open/Close). Replaced drag-to-sort provider tabs with Sync Priority dropdowns. Mobile tab overflow fix. Consistent 24h % across all spot card views (STACK-89, STACK-90, STACK-92)
- **PWA Support & Bug Fixes (v3.27.03)**: Installable app experience with offline caching via service worker. Fixed: edit-mode price preservation (STACK-81), stale spot-lookup on date change (STACK-82), Activity Log tabs showing stale data (STACK-83), Samsung S24+ Ultra layout (STACK-85). Removed redundant View icon (STACK-86). Spot history seed data from Docker poller infrastructure

## Development Roadmap

- **Chart Overhaul (STACK-48)**: Migrate to ApexCharts with time-series trend views
- **Custom CSV Mapper (STACK-51)**: Header mapping UI with saved import profiles

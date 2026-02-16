## What's New

- **Card View Engine, Mobile Overhaul & UI Polish (v3.30.00)**: Three card view styles (Sparkline Header, Full-Bleed, Split Card) with header button cycling. CDN image URLs with dedicated table image column and card thumbnails. Mobile viewport overhaul with responsive breakpoints. Rows-per-page options with floating back-to-top button. Theme-aware sparkline colors. CSV/JSON/ZIP export includes image URLs (STAK-118, STAK-106, STAK-124, STAK-125, STAK-126)
- **Fix What's New Modal Showing Stale Version (v3.29.08)**: Version check uses APP_VERSION directly instead of potentially stale localStorage value. Service worker local assets switched to stale-while-revalidate so deployment updates propagate on next load
- **Fix Image Deletion in Edit Modal (v3.29.07)**: Users can now properly remove uploaded photos from items via Remove button — deletion intent flags ensure images are removed from IndexedDB on Save. Orphaned images cleaned up when items are deleted (STAK-120)
- **Design System & Settings Polish (v3.29.06)**: Unified toggle styles to chip-sort-toggle pattern across Settings. Redesigned Appearance tab with grouped fieldsets. Living style guide (style.html) with theme switching and component samples. CSS design system coding standards (STAK-115, STAK-116, STAK-117)
- **Post-Release Hardening & Seed Cache Fix (v3.29.05)**: Service worker uses stale-while-revalidate for seed data so Docker poller updates reach users between releases. CoinFacts URL fallback for Raw/Authentic grades. Purchased chart range clamped to min 1 day. Cert badge keyboard accessibility. Verify promise and window.open hardening

## Development Roadmap

- **Chart Overhaul (STAK-48)**: Migrate to ApexCharts with time-series trend views
- **Custom CSV Mapper (STAK-51)**: Header mapping UI with saved import profiles
- **PCGS Deep Integration (STAK-99)**: View Modal verification and price guide lookup

## What's New

- **Design System & Settings Polish (v3.29.06)**: Unified toggle styles to chip-sort-toggle pattern across Settings. Redesigned Appearance tab with grouped fieldsets. Living style guide (style.html) with theme switching and component samples. CSS design system coding standards (STAK-115, STAK-116, STAK-117)
- **Post-Release Hardening & Seed Cache Fix (v3.29.05)**: Service worker uses stale-while-revalidate for seed data so Docker poller updates reach users between releases. CoinFacts URL fallback for Raw/Authentic grades. Purchased chart range clamped to min 1 day. Cert badge keyboard accessibility. Verify promise and window.open hardening
- **View Modal Visual Sprint (v3.29.04)**: Certification badge overlay on images with authority-specific colors and clickable grade/verify. Chart range pills (1Y, 5Y, 10Y, Purchased). Valuation-first default section order. Purchase date in valuation section (STAK-110, STAK-111, STAK-113)
- **Price History Fixes & Chart Improvements (v3.29.03)**: Fixed Goldback items recording $0.00 retail in price history. Added per-item price history modal with inline delete and undo/redo. Fixed All-time chart on file:// protocol via seed bundle. Adaptive x-axis year labels. Custom date range picker on charts (STAK-108, STAK-109, STAK-103)

## Development Roadmap

- **Mobile Overhaul (STAK-106, STAK-118)**: Redesign metal summary cards and inventory card view for small screens
- **Chart Overhaul (STAK-48)**: Migrate to ApexCharts with time-series trend views
- **Custom CSV Mapper (STAK-51)**: Header mapping UI with saved import profiles

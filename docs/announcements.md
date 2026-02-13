## What's New

- **STACK-38/STACK-31: Responsive card view & mobile layout (v3.25.03)**: Inventory table converts to touch-friendly cards at ≤768px with horizontal chips, 2-column financials, centered action buttons. Consolidated responsive CSS, details modal fixes at ≤640px
- **STACK-68: Goldback spot lookup fix (v3.25.02)**: Spot price lookup now converts gold spot to Goldback denomination price instead of using raw gold formula
- **STACK-64, STACK-67: Version splash fix & update badge (v3.25.01)**: Version splash now shows friendly "What's New" content. Footer version badge links to GitHub releases; on hosted sites, checks for updates with 24hr cache
- **STACK-54, STACK-66: Appearance settings & sparkline improvements (v3.25.00)**: Header quick-access buttons for theme and currency. Layout visibility toggles. 1-day sparkline with daily-averaged trend. Spot lookup now fills visible price field. 15/30-minute API cache options
- **STACK-56: Complexity reduction (v3.24.06)**: Refactored 6 functions to reduce cyclomatic complexity — dispatch maps, extracted helpers, optionalListener utility. −301 lines from events.js
- **STACK-55: Bulk Editor clean selection (v3.24.04)**: Bulk Editor now resets selection on every open. Removed stale localStorage persistence

## Development Roadmap

- **Chart Overhaul (STACK-48)**: Migrate to ApexCharts with time-series trend views
- **Custom CSV Mapper (STACK-51)**: Header mapping UI with saved import profiles
- ~~**Table CSS Hardening (STACK-38)**: Responsive audit and CSS cleanup~~ ✓ Shipped v3.25.03
- **Mobile Modals (STACK-70)**: Full-screen edit/add modal, touch-sized inputs, swipe gestures on cards

## What's New

- **STACK-71: Details modal QoL (v3.25.05)**: Pie chart percentage labels on slices, sticky metric toggle, scrollable modal body fixes overflow cascade, circular chart aspect-ratio, ResizeObserver leak fix, sepia theme chart colors
- **STACK-70: Mobile-optimized modals (v3.25.04)**: Full-screen modals on mobile with 100dvh, settings 5×2 tab grid, 44px touch inputs, hidden pie charts, landscape card view for touch devices 769–1024px, bulk edit stacking
- **STACK-38/STACK-31: Responsive card view & mobile layout (v3.25.03)**: Inventory table converts to touch-friendly cards at ≤768px with horizontal chips, 2-column financials, centered action buttons. Consolidated responsive CSS, details modal fixes at ≤640px
- **STACK-68: Goldback spot lookup fix (v3.25.02)**: Spot price lookup now converts gold spot to Goldback denomination price instead of using raw gold formula
- **STACK-64, STACK-67: Version splash fix & update badge (v3.25.01)**: Version splash now shows friendly "What's New" content. Footer version badge links to GitHub releases; on hosted sites, checks for updates with 24hr cache

## Development Roadmap

- **Chart Overhaul (STACK-48)**: Migrate to ApexCharts with time-series trend views
- **Custom CSV Mapper (STACK-51)**: Header mapping UI with saved import profiles
- **Autocomplete & Fuzzy Search (STACK-62)**: Wire up existing autocomplete/fuzzy-search infrastructure into search and form inputs

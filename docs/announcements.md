## What's New

- **Unified Add/Edit Modal (v3.05.00)**: Merged two separate modals into one — fixes weight unit selector, price preservation, and sub-gram weight precision for Goldbacks and Aurum notes
- **Qty-adjusted financials**: Retail, Gain/Loss, and summary totals now correctly multiply by quantity for multi-qty line items
- **Spot price indicators**: Direction arrows (green/red) now persist across page refreshes instead of always resetting to unchanged
- **$0 price support**: Free/promo items now display $0.00 and correctly compute full melt value as gain
- **Gain/Loss sort fix**: Sorting by Gain/Loss column now uses qty-adjusted totals matching the display

## Development Roadmap

- **About modal overhaul**: Update repository URLs, review version/changelog display, ensure all links are current
- **Filter chips rebuild**: Top-N per category model, normalized name chips, chip settings modal
- **Notes column removal + N# restore**: Remove Notes icon column, re-add Numista catalog column with filter-on-click and iframe link
- **Retail column UX**: Inline retail editing with pencil icon, confidence styling for manual vs auto-computed prices
- **Numista API fix**: Correct endpoints, auth headers, and parameters in the NumistaProvider class

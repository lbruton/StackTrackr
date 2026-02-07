## What's New

- **eBay search split (v3.06.02)**: Purchase column search icon now opens active eBay listings (what's for sale), Retail column search icon opens sold listings (what items actually sold for) — research buying price and resale value from the right columns
- **CSS cleanup & icon polish (v3.06.01)**: Removed 125+ lines of dead CSS, replaced eBay emoji icon with clean SVG, overhauled About modal with project links and MIT License
- **Rebrand to StakTrakr (v3.06.00)**: New canonical brand with multi-domain auto-branding — `staktrakr.com`, `stackrtrackr.com`, and `stackertrackr.com` each display their own brand name automatically
- **Fraction weight input (v3.05.04)**: Type fractions like `1/1000` or `1 1/2` in the weight field — auto-converts to decimal. Great for Goldbacks and Aurum notes
- **Duplicate item button (v3.05.04)**: New copy icon in the action column opens the add modal pre-filled from the source item. Date resets to today, qty to 1 — perfect for entering sets of the same coin
- **Date bug fix (v3.05.03)**: Table dates no longer display one day earlier than entered — fixed UTC midnight parsing that shifted dates back in US timezones
- **Numista API key fix (v3.05.03)**: API key now saves and persists across sessions — removed broken encryption system, simplified to match the metals API key pattern
- **Unified Add/Edit Modal (v3.05.00)**: Merged two separate modals into one — fixes weight unit selector, price preservation, and sub-gram weight precision for Goldbacks and Aurum notes
- **Qty-adjusted financials**: Retail, Gain/Loss, and summary totals now correctly multiply by quantity for multi-qty line items
- **Spot price indicators**: Direction arrows (green/red) now persist across page refreshes instead of always resetting to unchanged
- **$0 price support**: Free/promo items now display $0.00 and correctly compute full melt value as gain
- **Gain/Loss sort fix**: Sorting by Gain/Loss column now uses qty-adjusted totals matching the display

## Development Roadmap

- **Light & Sepia theme contrast pass**: Fix washed-out light theme (gray layering instead of pure white), tone down over-saturated sepia, fix action column backgrounds, WCAG font contrast audit
- **Filter chips rebuild**: Top-N per category model, normalized name chips, chip settings modal
- **N# column restore**: Re-add Numista catalog column with filter-on-click and iframe link
- **Retail column UX**: Inline retail editing with pencil icon, confidence styling for manual vs auto-computed prices
- **Numista API fix**: Correct endpoints, auth headers, and parameters in the NumistaProvider class
- **Mobile card view**: Responsive layout that switches from table to card-based view on small screens

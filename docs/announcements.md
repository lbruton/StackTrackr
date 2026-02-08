## What's New

- **Spot price card redesign (v3.08.00)**: Background sparkline trend charts on all 4 spot cards, sync icon replaces button panel, shift+click for manual price entry, per-card range dropdown (7d/30d/60d/90d). Historical backfill dedup prevents duplicate entries on repeated syncs
- **Shift+click inline editing (v3.07.02)**: Hold Shift and click any editable cell (Name, Qty, Weight, Purchase Price, Retail Price, Location) to edit in place. Enter saves, Escape cancels
- **Light & Sepia theme contrast pass (v3.07.01)**: Clean gray-to-white light palette with visible card elevation. Darkened metal/type text colors to pass WCAG AA in both themes
- **Portfolio visibility overhaul (v3.07.00)**: Confidence styling for Retail/Gain-Loss (estimated vs confirmed), new "All Metals" totals card with Avg Cost/oz and clickable breakdown modal

## Development Roadmap

- **Inline catalog & grading tags**: Optional (N#), (PCGS), (NGC), (Grade) tags on the Name cell with iframe links — no new column needed
- **Filter chips rebuild**: Top-N per category model, normalized name chips, chip settings modal
- **Numista API fix**: Correct endpoints, auth headers, and parameters in the NumistaProvider class

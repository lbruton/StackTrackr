## What's New

- **Normalized name chips (v3.09.01)**: Filter chip bar now groups item name variants into single chips (e.g., "Silver Eagle 6/164"). Click to filter, click again to toggle off. Respects minCount threshold and Smart Grouping toggle
- **Silver chip contrast fix (v3.09.01)**: Silver metal chip text no longer invisible on dark/sepia themes at page load
- **Duplicate location chip fix (v3.09.01)**: Clicking a location chip no longer produces two chips
- **Filter chips cleanup (v3.09.00)**: Default threshold lowered to 3+, date chips removed, "Unknown" locations suppressed, all locations respect minCount dropdown. Dead code removed. Chips now update after every inventory mutation
- **Spot card hint (v3.09.00)**: Cards with no price data show "Shift+click price to set" — discoverability for the manual price entry pattern

## Development Roadmap

- **Inline catalog & grading tags**: Optional (N#), (PCGS), (NGC), (Grade) tags on the Name cell with iframe links — no new column needed
- **Numista API fix**: Correct endpoints, auth headers, and parameters in the NumistaProvider class

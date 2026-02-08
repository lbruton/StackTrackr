## What's New

- **Year field + inline tag (v3.09.04)**: New optional Year field in add/edit form with inline year badge on inventory table Name cell. Numista picker now fills Year instead of Metal
- **Form layout restructure (v3.09.04)**: Name wider with Year beside it; purchase fields grouped: Date | Price, Location | Retail Price
- **Numista field picker fix (v3.09.03)**: Fixed broken layout — checkboxes, labels, and inputs now align correctly using CSS Grid instead of fieldset+flexbox
- **Smart category search (v3.09.03)**: Numista search uses your Type selection (Coin, Bar, Round, Note, Aurum) to filter results by category, and prepends Metal to the query when relevant
- **Numista API v3 fix (v3.09.02)**: Corrected base URL, endpoints, auth headers, query parameters, response parsing, and field mapping — 7 bugs total. Test Connection button now works
- **localStorage whitelist fix (v3.09.02)**: Catalog cache and settings no longer deleted on page load
- **Normalized name chips (v3.09.01)**: Filter chip bar now groups item name variants into single chips (e.g., "Silver Eagle 6/164"). Click to filter, click again to toggle off. Respects minCount threshold and Smart Grouping toggle
- **Silver chip contrast fix (v3.09.01)**: Silver metal chip text no longer invisible on dark/sepia themes at page load
- **Duplicate location chip fix (v3.09.01)**: Clicking a location chip no longer produces two chips

## Development Roadmap

- **Inline catalog & grading tags**: Optional (N#), (PCGS), (NGC), (Grade) tags on the Name cell with iframe links — no new column needed
- **Batch rename / normalize**: Bulk rename items using Numista catalog data and the name normalizer

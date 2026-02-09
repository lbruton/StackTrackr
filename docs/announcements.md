## What's New

- **Edit custom grouping rules (v3.16.02)**: Inline edit button on custom chip grouping rules — modify label and patterns without delete/recreate. Filter chip threshold setting moved to Grouping panel
- **API settings fixes & Numista usage (v3.16.01)**: Cache timeout now persists per-provider, historical data fetches for all providers, page refresh syncs all configured APIs. New standalone "Save" button per provider. Numista usage progress bar tracks API calls with monthly auto-reset
- **Custom chip grouping & blacklist (v3.16.00)**: Define custom chip labels with comma-separated name patterns. Right-click any name chip to blacklist it. Dynamic chips auto-extract text from parentheses/quotes in item names. New Settings > Grouping panel for all chip controls
- **Name column & action icon fix (v3.14.01)**: Long names truncate with ellipsis, N# chips compacted to just "N#" (hover for full ID), action icons no longer clipped on narrow viewports
- **Encrypted portable backup (v3.14.00)**: Export all data as a password-protected `.stvault` file (AES-256-GCM). Import on any device to restore inventory, settings, API keys, and price history. Password strength bar + crypto fallback for file:// protocol
- **NGC cert lookup fix (v3.12.02)**: Clicking a graded item's cert tag now opens NGC with the actual coin details visible
- **Name column overflow fix (v3.12.02)**: Long names truncate with ellipsis — tags (Year, N#, Grade) always stay visible
- **Numista Sets (v3.12.02)**: New "Set" type for mint/proof sets with S-prefix Numista IDs (e.g., S4203)
- **"Lunar Series" chip (v3.12.02)**: "Year of the Dragon/Snake/etc." items group under one chip
- **Source column cleanup (v3.12.02)**: URL sources like "apmex.com" display as "apmex" with link icon
- **Sticky header fix (v3.12.01)**: Column headers now correctly pin at the top of the scrollable portal view during vertical scroll
- **Portal view (v3.12.00)**: Inventory table now renders all items in a scrollable container with sticky column headers — pagination removed. Visible rows (10/15/25/50/100) control viewport height
- **Unified Settings modal (v3.11.00)**: API, Files, and Appearance consolidated into a single Settings modal with sidebar navigation. Header simplified to About + Settings
- **Theme picker (v3.11.00)**: 3-button theme selector (Light / Dark / Sepia) replaces the cycling toggle
- **Tabbed API providers (v3.11.00)**: Provider configuration uses tabbed panels instead of a scrollable list
- **Items per page persisted (v3.11.00)**: Items-per-page setting now survives page reloads
- **Numista iframe fix (v3.10.01)**: Numista pages now open in a popup window — fixes "Can't Open This Page" error on hosted sites
- **Sort fix (v3.10.01)**: Gain/Loss and Source columns now sort and resize correctly
- **Serial # field (v3.10.00)**: New optional Serial Number input for bars and notes with physical serial numbers. Included in all export/import formats
- **Numista Aurum fix (v3.10.00)**: Goldback / Aurum items now return results from Numista search
- **Enhanced Numista no-results (v3.10.00)**: Retry search box + popular bullion quick-picks when no results found
- **Source column + filter chips (v3.10.00)**: "Location" renamed to "Source"; Year, Grade, and N# filter chips added to chip bar
- **Year sort + eBay year (v3.10.00)**: Name column sub-sorts by Year; eBay search URLs include year
- **Grade, Authority & Cert # (v3.09.05)**: New optional grading fields — Grade dropdown (AG through PF-70), Grading Authority (PCGS/NGC/ANACS/ICG), and Cert # input. Color-coded grade tags on table with one-click cert verification
- **eBay search fix (v3.09.05)**: Item names with quotes or parentheses no longer produce broken eBay search results
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

- **Batch rename / normalize**: Bulk rename items using Numista catalog data and the name normalizer

# Filter Controls Order Fix

## Problem
Filter control selectors were rendered below the active filter chips, making the controls visually detached from the chip row.

## Solution
Moved the `.filter-controls` block above the `.filter-row` in `index.html` and adjusted `.search-filters` spacing in `css/styles.css` so controls remain separated from the chip row.

## Notes
No JavaScript changes required; existing selectors rely on element IDs and continue to function.

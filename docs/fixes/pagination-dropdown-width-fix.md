Pagination Dropdown Width Fix
=============================

**Problem:** After relocating the rows-per-page selector beneath the inventory table, a global `select { width: 100%; }` rule caused the dropdown to stretch across the footer.

**Solution:** Added a specific rule `.table-footer-controls #itemsPerPage { width: auto; }` and adjusted the flex layout so the compact dropdown sits to the left of the item count.

**Notes:** The selector retains a `min-width` of 80px via `.control-select` styling.

# Button Class Consistency Fix

## Problem
`#clearBtn` used `.secondary` and `#changeLogBtn` used `.square`, leading to inconsistent styling and sizing with the `#newItemBtn`.

## Solution
- Updated both buttons to use `class="btn success icon-btn"`.
- Removed obsolete `square` class.
- Scoped table icon-button styles in `css/styles.css` to `#inventoryTable` so search controls retain their intended size.

## Result
Search control buttons now share uniform appearance and sizing.

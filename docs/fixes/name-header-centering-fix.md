# Name Header Centering Fix

The “Name” column header was slightly offset because the text sat directly in the `<th>` element while other headers wrapped their labels in `.header-text` spans. This required a special CSS rule to center the header text.

## Solution

- Wrapped the header text in `<span class="header-text">Name</span>`.
- Removed the `#inventoryTable th[data-column="name"]` centering override; default `.header-text` styling now handles alignment.

This keeps the header consistent with others and removes the need for bespoke CSS.


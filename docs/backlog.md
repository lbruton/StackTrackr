# Backlog

This file contains a list of tasks, bug fixes, and smaller feature requests that are not part of the main roadmap.

## Bugs

- The Last Sync time/date is incorrectly recording the last time the user pressed the sync button; this should be the last API pull.
- Correct issue with readme date inconsistencies.
- Unknown items and "Imported by *" items should always sort after items with valid values.

## Features

- When importing data, if no value is present, check other Numista price values. If none, set the price to 0.00.
- When opening Numista links, open them in a new, appropriately sized window with close, back, and forward controls.
- "Change Log" should have a square recycle bin icon instead of text.
- In the table, when filtered, dynamically remove empty columns.
- When the width narrows to mobile sizes, double the height of the table rows.
- Re-theme the light mode with the new "Darker Light" palette.
- Create a Debug API Button that opens a modal showing the API response in text/JSON and a table.
- Add exponential backoff and a user-visible retry banner for API rate limits.
- Move the "Minimum Chip Items" dropdown under the "Items" dropdown.
- Add a checkbox under the "Minimum Chip Items" dropdown to include date and price values for all cells.
- Add a toggle to enable/disable weight in the filters tool.
- Provide a toggle to switch between a condensed, scrolling view and an auto-expanding view.
- Group all control toggles into a card under the "Items" dropdown.
- The "Title/Name" column should allow fractions.
- Center the titles and subtitles on the cards in the files modal.
- Add "You may be entitled to compensation" to the boating accident joke, scaled to fit under the button.
- Add "Purchase" and "Issue" year filters.

## Theme Update: "Darker Light" Mode

| Token          | Current Light Mode | New "Darker Light" Mode |
|----------------|--------------------|-------------------------|
| --bg           | `#ffffff`          | `#e7edf2` (gray-900)     |
| --bg-elev-1    | `#ffffff`          | `#d7dfe6` (gray-850)     |
| --bg-elev-2    | `#f1f5f9`          | `#bec7cf` (gray-800)     |
| --surface      | `#ffffff`          | `#d7dfe6` (gray-850)     |
| --surface-alt  | `#f8fafc`          | `#bec7cf` (gray-800)     |
| --text         | `#0c1520`          | `#1b232c` (gray-100)     |
| --text-muted   | `#3a4756`          | `#344351` (gray-300)     |
| --border       | `#d9e2ec`          | `#97a4af` (gray-700)     |
| --primary      | `#1b8bff`          | `#78bcff` (sky-300)      |
| --primary-soft | `#e8f3ff`          | `#d0e8ff` (sky-100)     |
| --success      | `#20c07c`          | `#74e1b1` (jade-300)     |
| --success-soft | `#e4faf0`          | `#c8f5e1` (jade-100)     |

# Header menu buttons unresponsive

## Problem

Header menu buttons (Files, About, API) failed to open their modals in some cases, leaving the UI unresponsive.

## Solution

Added `header-buttons-fix.js` to wire up the header buttons on load and included direct DOM fallbacks so modals open even if global handlers are unavailable.

## Notes

This ensures the main menu buttons reliably open their modals without relying solely on other modules.

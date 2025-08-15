# Filter Reset Sync Fix
- Centralized `typeFilter` and `metalFilter` resets inside `clearAllFilters`.
- Simplified `#clearBtn` handler to call `clearAllFilters()` without fallbacks.
- `clearAllFilters` now resets dropdowns and chips together via `renderActiveFilters`.

# Bug Resolution Template

## Bug Report
- **ID**: BUG-001
- **Description**: Filter chips for specific coin types (e.g., '2022 American Silver Eagle Special Proof BU') only apply exact matches instead of showing all variations of the coin type.
- **Steps to Reproduce**:
  1. Click on a specific coin type chip (e.g., '2022 American Silver Eagle Special Proof BU').
  2. Observe that the filter only applies to the exact match and does not include other variations of the coin type.
- **Impact**: Users cannot view all variations of a coin type when clicking on a filter chip, leading to incomplete search results.

## Resolution
- **Cause**: The `simplifyChipValue` function was not being utilized in the filtering logic to generalize coin types.
- **Fix**: See detailed fix in [docs/fixes/BUG-001.md](fixes/BUG-001.md).
- **Testing**:
  - Verified that clicking on a chip for a specific coin type now shows all variations of that coin type.
  - Tested with multiple coin types to ensure consistent behavior.

## Notes
- This fix ensures that users can view all variations of a coin type when clicking on a filter chip, improving search results and user experience.

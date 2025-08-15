# Bug Fix Log

This document serves as a centralized log for all identified bugs and their resolutions in the StackTrackr project.

## Bug List

### BUG-001
- **Description**: Filter chips for specific coin types (e.g., '2022 American Silver Eagle Special Proof BU') only apply exact matches instead of showing all variations of the coin type.
- **Steps to Reproduce**:
  1. Click on a specific coin type chip (e.g., '2022 American Silver Eagle Special Proof BU').
  2. Observe that the filter only applies to the exact match and does not include other variations of the coin type.
- **Impact**: Users cannot view all variations of a coin type when clicking on a filter chip, leading to incomplete search results.
- **Resolution**:
  - Enhanced the `simplifyChipValue` function to generalize coin types.
  - Updated the `filterInventoryAdvanced` function to use simplified chip values for broader filtering.
- **Status**: Fixed
- **Date Resolved**: August 15, 2025

---

This log will be updated as new bugs are identified and resolved.

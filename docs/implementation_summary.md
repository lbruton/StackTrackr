# Implementation Summary: Dynamic Summary Bubbles

> **Latest release: v3.04.38**

## Version Update: 3.04.35 → 3.04.36

## User Requirements Implemented

- Summary bubbles now include Type, Metal, Purchase Location, and Storage Location with color-coded counts.
- Purchase Location URLs preserve their assigned colors when rendered as hyperlinks.

## Technical Changes Made

### Files Modified:
1. **`css/styles.css`**: Ensured filter link anchors inherit color and generalized chip styling.
2. **`js/inventory.js`**: Expanded summary chip generation across multiple fields.
3. **`js/constants.js`**: Bumped `APP_VERSION` to 3.04.36.
4. **Documentation**: Updated announcements, changelog, function table, status, versioning, and workflow references.

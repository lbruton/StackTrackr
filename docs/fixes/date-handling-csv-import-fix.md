# Date Handling Fix - CSV Import/Export
**Date:** August 14, 2025  
**Version:** Fixed in current build  
**Author:** Claude  
**Issue:** Dates showing as "--" after restoring backup CSV  

## Problem Description
When restoring inventory data from a backup CSV, date values were being displayed as "--" in the table, even though the dates were valid in the CSV file. The issue was caused by inconsistent date handling during the import process.

## Root Cause Analysis
1. **Inconsistent date parsing**: The `parseDate()` function was returning the original string when it couldn't parse a date, rather than a consistent dash character.
2. **Import logic confusion**: The CSV import functions were trying to preserve raw date values but then applying validation that would convert them to dashes.
3. **Date storage**: The import was storing `dateRaw || date` instead of just the parsed `date`, causing unparsed dates to be stored.

## Files Modified
1. `/js/inventory.js`
   - Fixed `importCsv()` function date handling logic
   - Fixed `importNumistaCsv()` function date handling logic  
   - Fixed `importJson()` function date handling logic
   - Removed preference for raw dates over parsed dates

2. `/js/utils.js`
   - Updated `parseDate()` to return '—' for unparseable dates instead of the original string
   - Added validation for empty, dash, and double-dash values
   - Added timezone handling for ISO dates to prevent day shift issues
   - Updated `formatDisplayDate()` with better edge case handling
   - Added year range validation (1900 to current year + 1)

## Technical Details

### Before Fix
```javascript
// parseDate would return the original string on failure
if (!date || date === '—') {
  date = dateRaw || '—';
}
// Later stored as:
date: dateRaw || date,  // This preferred raw over parsed!
```

### After Fix
```javascript
// parseDate now returns '—' on failure
if (!date || date === dateRaw) {
  // Check if it's truly unparseable
  const testDate = new Date(dateRaw);
  if (!dateRaw || dateRaw.trim() === '' || isNaN(testDate)) {
    date = '—';
  }
}
// Now stored as:
date: date,  // Always use the parsed/validated date
```

## Testing
Created comprehensive test suite at `/tests/test-date-parsing.html` that validates:
- ISO format dates (YYYY-MM-DD)
- US format dates (MM/DD/YYYY)
- European format dates (DD/MM/YYYY)
- Ambiguous dates
- Invalid dates
- Empty/null/undefined values
- Edge cases like "--", "Unknown", etc.

## Impact
- ✅ CSV imports now correctly parse and display dates
- ✅ Invalid dates consistently show as "—" instead of broken displays
- ✅ Timezone issues resolved with ISO dates
- ✅ Backward compatible with existing data
- ✅ Export functionality unchanged (still exports in ISO format)

## Verification Steps
1. Export current inventory to CSV
2. Import the CSV back
3. Verify dates display correctly in the table
4. Check that sorting by date still works
5. Verify that date filtering works properly

## Related Issues
- Date sorting was already handling "—" values correctly
- Date filtering continues to work as expected
- No changes needed to export functionality

## Notes
- The application standardizes on ISO date format (YYYY-MM-DD) for storage
- Display format is "Mon DD, YYYY" (e.g., "Jul 12, 2024")
- Empty or invalid dates are consistently shown as "—"
- The fix maintains backward compatibility with existing inventory data

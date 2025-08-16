# StackTrackr Bug Tracker

## 🐛 Active Bugs

### High Priority

#### Filter Chip Color Consistency Issue
**Date Reported:** August 15, 2025  
**Status:** 🔴 Open  
**Priority:** High  
**Category:** UI/Visual  

**Description:**
Filter chips are not maintaining consistent colors before/after filter changes. Despite implementing hash-based color generation to replace order-dependent colors, chips still appear to lose their styling consistency when filters are applied or cleared.

**Steps to Reproduce:**
1. Apply multiple filters to create filter chips
2. Note the colors of each chip
3. Clear filters or modify filter state
4. Re-apply the same filters
5. Observe that chip colors may be different than before

**Expected Behavior:**
Filter chips should maintain consistent colors based on their content (filter type + value), regardless of when they are created or the order of operations.

**Current Behavior:**
Filter chips appear to change colors after filter operations, suggesting the hash-based color generation may not be working as intended or there may be additional factors affecting color assignment.

**Technical Notes:**
- Previously fixed similar issue in `getColor()` function by replacing `Object.keys().length` with hash-based approach
- May need to investigate if there are multiple color generation pathways
- Could be related to chip recreation vs update logic

**Files Involved:**
- `/js/inventory.js` - getColor() function and filter chip rendering
- `/css/styles.css` - Filter chip styling

**Investigation Needed:**
- [ ] Verify hash-based color generation is consistently used
- [ ] Check if chips are being recreated vs updated
- [ ] Look for other color assignment logic
- [ ] Test with specific filter combinations

---

## 🟡 Medium Priority

*No bugs currently*

---

## 🟢 Low Priority  

*No bugs currently*

---

## ✅ Resolved Bugs

*No resolved bugs yet*

---

**Last Updated:** August 15, 2025

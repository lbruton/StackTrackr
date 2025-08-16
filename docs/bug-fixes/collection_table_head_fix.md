# Collection Table Head Fix - Critical CSS Bug

**Date:** August 16, 2025  
**Severity:** CRITICAL - Breaks table zebra striping  
**Status:** IDENTIFIED - Fix Available  
**Bug ID:** collection_table_head_fix

## Problem Summary

The StackTrackr collectable column repeatedly breaks due to a specific CSS rule that interferes with zebra striping. This is the root cause of the recurring table highlighting issues.

## Root Cause Analysis

### Problematic Code (BROKEN)
```css
#inventoryTable td[data-column="collectable"] {
  position: static;
  background: inherit !important; /* ← THIS BREAKS ZEBRA STRIPING */
}
```

### Working Code (CORRECT)
```css
#inventoryTable td[data-column="collectable"] {
  position: static;
  background: transparent; /* ← ALLOWS PROPER ZEBRA STRIPING */
}
```

## Technical Details

**Issue:** The `background: inherit !important` rule forces the collectable column to inherit the row's background color, which conflicts with the zebra striping pattern and causes visual inconsistencies.

**Solution:** Use `background: transparent` to allow the zebra striping to show through properly.

## Branch Status

- **✅ WORKING:** `restored-branch` - Contains the correct fix
- **❌ BROKEN:** `goodtable` - Contains the problematic `inherit !important` rule

## Git References

- **Working Commit:** `b6cb7be` - "Fix collectable column background issue - remove conflicting background rules causing darker highlights"
- **Broken Commit:** `f00356f` - Missing the collectable column fix

## Prevention Measures

1. **NEVER** use `background: inherit !important` on the collectable column
2. **ALWAYS** use `background: transparent` for collectable column
3. **TEST** zebra striping after any table CSS changes
4. **REFERENCE** this document before modifying collectable column CSS

## Quick Fix Command

To apply the fix to any broken branch:
```css
/* Replace this problematic rule */
background: inherit !important;

/* With this working rule */
background: transparent;
```

## Related Files

- `css/styles.css` - Main styling file containing the problematic rule
- `docs/bug-fixes/collectable-column-fix-detailed.md` - Related collectable column documentation

---

**⚠️ WARNING:** This bug causes recurring table display issues. Always check this document before modifying collectable column CSS rules.

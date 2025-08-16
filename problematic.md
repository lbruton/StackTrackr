# StackTrackr Table Styling - Problematic Code Documentation

**Date:** August 16, 2025  
**Status:** WORKING CONFIGURATION - DO NOT MODIFY WITHOUT CAREFUL TESTING  
**Context:** This document contains the core table styling code that has been repeatedly problematic but is now in a stable working state.

## Issues Encountered and Resolved

### 1. Collectable Column Background Issue (CRITICAL - RECURRING)
**Problem:** The collectable column consistently shows darker background highlights that break the zebra striping pattern.

**Root Causes Identified:**
- Multiple conflicting CSS rules setting different background values
- `background: inherit` causing inheritance chain issues
- Sticky positioning interfering with row background inheritance
- Rules with `!important` overriding proper styling

**Final Working Solution:**
```css
/* Sticky icon columns - WORKING CONFIGURATION */
td[data-column="collectable"],
td[data-column="notes"],
td[data-column="edit"],
td[data-column="delete"] {
  max-width: 3rem; /* Icon columns stay small */
  white-space: normal; /* Allow icons to display normally */
  position: sticky;
  background: transparent; /* KEY: Changed from 'inherit' to 'transparent' */
  z-index: 2;
}
```

**CRITICAL:** The collectable column MUST NOT be included in rules that set `background: var(--bg-secondary)`. It was removed from this rule:
```css
/* FIXED: Removed td[data-column="collectable"] from this rule */
#inventoryTable th[data-column="notes"], 
#inventoryTable th[data-column="edit"],
#inventoryTable th[data-column="delete"],
/* #inventoryTable td[data-column="collectable"], <- REMOVED */
#inventoryTable td[data-column="notes"], 
#inventoryTable td[data-column="edit"],
#inventoryTable td[data-column="delete"] {
  position: sticky;
  right: 0;
  background: var(--bg-secondary);
  z-index: 5;
  min-width: 50px;
  width: 50px;
}
```

### 2. Header Hover Animation Issues
**Problem:** Table headers had hover animations that caused visual malformation and annoying background changes.

**Solution:** Removed all hover effects from table headers:
```css
/* Removed annoying th:hover animation effect */
/* th:hover { <- REMOVED ENTIRELY */
```

### 3. Metal Column Styling
**Problem:** Metal column headers were included in hover effects causing visual issues.

**Solution:** Applied hover effects only to table cells (td), not headers (th):
```css
/* Metal column expansion on hover - CELLS ONLY */
#inventoryTable td[data-column="metal"]:hover {
  max-width: none;
  white-space: normal;
  word-wrap: break-word;
  z-index: 10;
  background: var(--bg-primary);
  box-shadow: var(--shadow);
  border-radius: var(--radius-sm);
  padding: 0.5rem;
}
```

## Core Table Structure - STABLE WORKING VERSION

### Main Table Styling
```css
#inventoryTable {
  /* Use the available container width and allow responsive scaling
     to prevent right-side columns being clipped. Horizontal scrolling
     remains available via .table-section when necessary. */
  width: 100%;
  table-layout: auto;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-primary);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

#inventoryTable tbody {
  min-height: calc(10 * 2.2rem);
  height: auto;
}
```

### Row Styling (Zebra Striping)
```css
tr:nth-child(even) {
  background: var(--bg-secondary);
}

tr:hover {
  background: var(--bg-tertiary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

### Header Styling (NO HOVER EFFECTS)
```css
th {
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-weight: 600;
  padding: 0.375rem 0.25rem; /* Reduced padding for narrower rows */
  text-align: center;
  cursor: pointer;
  position: relative;
  border-bottom: 2px solid var(--border);
  border-right: 1px solid var(--border);
  transition: var(--transition);
  font-size: 0.95rem; /* Increased font size for readability */
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
}

/* IMPORTANT: NO th:hover RULES - THEY CAUSE VISUAL ISSUES */
```

### Cell Styling
```css
td {
  padding: 0.25rem; /* Much smaller padding for narrower rows */
  border-bottom: 1px solid rgba(51, 65, 85, 0.5); /* Softer border for cell separation */
  border-right: 1px solid rgba(51, 65, 85, 0.3); /* Lighter right border */
  color: var(--text-primary);
  font-size: 0.875rem; /* Increased font size */
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
  max-width: 20ch; /* Limit to approximately 20 characters */
}
```

## Atomic Symbols Integration

### Tooltip Enhancement
**Recent Addition:** Metal symbols now show full metal names with Latin origins:
```javascript
const symbols = {
  'Silver': { symbol: 'Ag', number: '47', fullName: 'Silver (Argentum)' },
  'Gold': { symbol: 'Au', number: '79', fullName: 'Gold (Aurum)' },
  'Platinum': { symbol: 'Pt', number: '78', fullName: 'Platinum' },
  'Palladium': { symbol: 'Pd', number: '46', fullName: 'Palladium' },
  'Copper': { symbol: 'Cu', number: '29', fullName: 'Copper (Cuprum)' },
  'Alloy/Other': { symbol: '??', number: '--', fullName: 'Alloy or Other Metal' }
};
```

**Tooltip Implementation:**
```javascript
title="${info.fullName} - Click to filter"
```

## MAINTENANCE WARNINGS

### ⚠️ CRITICAL WARNINGS ⚠️

1. **DO NOT** add `background: inherit` to any sticky column rules
2. **DO NOT** include `td[data-column="collectable"]` in rules that set `background: var(--bg-secondary)`
3. **DO NOT** add hover effects to table headers (`th:hover`)
4. **ALWAYS** test collectable column background after any table styling changes
5. **VERIFY** zebra striping works correctly across all themes (light/dark/sepia)

### Testing Checklist After Table Modifications
- [ ] Collectable column has no dark background highlights
- [ ] Zebra striping works properly in all three themes
- [ ] Headers don't have visual malformation on hover
- [ ] Sticky columns maintain proper background inheritance
- [ ] Metal column tooltips show full metal names
- [ ] Price indicators display correctly

### Git Commits Related to These Fixes
- "Fix collectable column background issue - remove conflicting background rules causing darker highlights"
- "Fix table visual issues: Remove metal header hover malformation, fix collectable cell backgrounds, add stronger table border"
- "CRITICAL FIX: Restore header consistency - revert to var(--bg-secondary) for proper styling"

## Files Involved
- `css/styles.css` - Core table styling (lines ~1770-2100, ~5360-5400)
- `js/atomic-symbols.js` - Metal symbol tooltips and rendering
- `css/atomic-symbols.css` - Theme-aware atomic symbol styling

---

**FINAL NOTE:** This configuration has been tested and is stable. Any future modifications should be done incrementally with careful testing of the collectable column background behavior.

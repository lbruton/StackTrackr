# StackTrackr Repair Checklist - v3.04.05

## 🚨 **Critical Issues to Fix**

### **SUBTASK 1: Fix Search Functionality**
**Priority: CRITICAL**
**Estimated Time: 15 minutes**

**Problem**: Search input not responding due to malformed JavaScript in events.js

**Prompt**: "Fix the malformed JavaScript code in events.js around line 738. There's a standalone 'n' character that's breaking the search functionality. Remove the malformed code and ensure the search input properly filters the inventory table when users type in the search box."

**Files to Modify**:
- `js/events.js` (fix malformed code around line 738)

**Verification Steps**:
- [ ] Open application in browser
- [ ] Type in search box 
- [ ] Confirm table filters properly
- [ ] Test search with various terms (metal names, item names, etc.)
- [ ] Verify search clearing works properly

---

### **SUBTASK 2: Add N# Column to Inventory Table**
**Priority: HIGH**
**Estimated Time: 45 minutes**

**Problem**: Numista catalog numbers (N#) are stored in the data but not displayed in the main inventory table

**Prompt**: "Add a new 'N#' column to the inventory table that displays the Numista catalog number when available. The N# should appear as a clickable link that opens https://en.numista.com/catalogue/pieces{N#}.html in a new tab when an N# exists. If no N# exists, show empty cell. Add this column between the 'Name' and 'Qty' columns."

**Files to Modify**:
- `index.html` (add N# header to table)
- `js/inventory.js` (update renderTable function to include N# column)
- `css/styles.css` (add responsive hiding rules for N# column if needed)

**Implementation Requirements**:
- [x] Add `<th>` for N# column in table header
- [x] Update `renderTable()` function to include N# cell
- [x] Format N# as clickable link: `https://en.numista.com/catalogue/pieces{N#}.html`
- [x] Handle empty N# values gracefully
- [x] Ensure proper responsive behavior
- [x] Add N# to column resizing functionality

**Verification Steps**:
- [x] N# column visible in table
- [x] Clickable links work when N# present
- [x] Empty cells when no N# available  
- [x] Column resizes properly
- [x] Responsive design still works

---

### **SUBTASK 3: Add N# Field to New Item Modal**
**Priority: MEDIUM**
**Estimated Time: 20 minutes**

**Problem**: New item modal missing catalog/N# field that edit modal has

**Prompt**: "Add the Numista catalog N# field to the new item modal to match the edit item modal. The field should be labeled 'Catalog (N#)' and placed in the same location as in the edit modal. Update the form submission handler to save the N# value when creating new items."

**Files to Modify**:
- `index.html` (add N# field to new item modal)
- `js/events.js` (update form submission to handle N# field)

**Implementation Requirements**:
- [x] Add catalog input field to new item modal form
- [x] Update form submission handler for new items
- [x] Ensure N# gets properly saved to `numistaId` field
- [x] Match styling and placement with edit modal

**Verification Steps**:
- [x] N# field visible in new item modal
- [x] N# field saves properly when creating items
- [x] Created items show N# in table if provided
- [x] N# links work for newly created items

---

### **SUBTASK 4: Improve N# Import/Export Handling**
**Priority: MEDIUM**  
**Estimated Time: 30 minutes**

**Problem**: Verify N# import/export functionality is working properly

**Prompt**: "Review and verify that Numista N# values are properly imported from CSV/Numista files and exported in all formats (CSV, Excel, JSON, PDF). Ensure the N# field is included in all export formats and properly mapped during imports. Test with sample data to confirm round-trip data integrity."

**Files to Modify**:
- `js/inventory.js` (verify export functions include N#)
- `js/inventory.js` (verify import functions map N# properly)

**Verification Steps**:
- [x] Import Numista CSV with N# values
- [x] Confirm N# values appear in table after import
- [x] Export to CSV and verify N# included
- [x] Export to Excel and verify N# included  
- [x] Export to JSON and verify N# included
- [x] Export to PDF and verify N# included
- [x] Test round-trip: import → edit → export → import

---

### **SUBTASK 5: Enhanced Database Association Layer (Architecture Enhancement)**
**Priority: LOW (Future Enhancement - Complete at END)**
**Estimated Time: 2-3 hours**

**Problem**: Current system stores N# directly in inventory items. User suggests separating into two tables with translation layer for better data architecture.

**User's Vision**: 
- Use internal serial numbers (unique to each inventory item)
- Store N# catalog numbers separately (from Numista)
- Create translation layer to associate inventory items with catalog data
- Allow independent storage and updates of inventory vs catalog data

**Prompt**: "Design and implement an enhanced translation layer system that separates inventory data from Numista catalog data. The current `catalogMap` object provides a foundation, but enhance it to create a robust separation of concerns. This should allow independent storage of inventory and Numista catalog data with a proper mapping layer. Provide better data integrity, easier catalog updates, and more flexible architecture for future enhancements."

**Files to Analyze**:
- Current data structure in `js/constants.js`
- Storage patterns in `js/inventory.js` 
- Existing `catalogMap` functionality (current foundation)
- Data flow in import/export functions

**Research & Implementation Areas**:
- [ ] Analyze current `catalogMap` implementation and limitations
- [ ] Design enhanced separation of concerns architecture
- [ ] Plan migration strategy for existing data
- [ ] Document benefits and drawbacks vs current approach
- [ ] Create implementation roadmap and data structure design
- [ ] Implement enhanced catalog mapping system
- [ ] Update import/export functions to use new architecture
- [ ] Test data integrity and performance
- [ ] Document new architecture for future development

**NOTES**: This builds on existing `catalogMap` foundation. Current system already maps `item.serial` to `item.numistaId` via `catalogMap[serial] = numistaId`. Enhancement would create more robust separation and better management of this relationship.

---

## 🛠 **Context Preservation Prompt**

**For use if work gets interrupted:**

"You are working on StackTrackr v3.04.04, a precious metals inventory tracking application. The following issues have been identified and partially addressed:

1. **FIXED**: Search functionality was broken due to malformed JavaScript in events.js line 738
2. **IN PROGRESS**: Adding N# (Numista catalog) column to inventory table with clickable links
3. **PENDING**: Adding N# field to new item modal for consistency with edit modal
4. **PENDING**: Verifying N# import/export functionality across all formats

**Current Progress**:
- Search functionality has been repaired
- Table structure needs N# column between Name and Qty
- N# should link to: https://en.numista.com/catalogue/pieces{N#}.html
- New item modal needs catalog field to match edit modal

**Key Files Modified**:
- `js/events.js` (search fix)
- `index.html` (table structure)
- `js/inventory.js` (renderTable function)

**Next Steps**: Continue with N# column implementation, then add N# field to new item modal.

**Data Structure Notes**: N# stored in `item.numistaId`, serial numbers in `item.serial`, catalog mapping in `catalogMap` global object."

---

## 📁 **Files Reference**

**Core Files**:
- `index.html` - Main application structure, table definitions, modal forms
- `js/events.js` - Event listeners, form submission handlers  
- `js/inventory.js` - Data management, table rendering, import/export
- `js/search.js` - Search filtering functionality
- `js/constants.js` - Configuration, data structure definitions
- `css/styles.css` - Styling, responsive design

**Key Data Structures**:
- `inventory[]` - Main inventory array
- `item.numistaId` - Stores N# catalog number
- `item.serial` - Internal unique identifier  
- `catalogMap{}` - Maps serial to N# (existing system)

**Key Functions**:
- `renderTable()` - Main table rendering function
- `filterInventory()` - Search filtering logic
- `importNumistaCsv()` - Numista import handler
- `exportCsv()`, `exportExcel()`, etc. - Export functions

## ✅ **Success Criteria**

1. ✅ **Search Box**: Users can type and see instant table filtering *(COMPLETED)*
2. ✅ **N# Display**: N# visible in table with working Numista links *(COMPLETED)*
3. ✅ **UI Consistency**: New item modal matches edit modal fields *(COMPLETED)*
4. ✅ **Data Integrity**: N# properly imported/exported in all formats *(COMPLETED)*
5. ✅ **User Experience**: Seamless workflow for adding N# to items *(COMPLETED)*
6. **Architecture Enhancement**: Robust separation of inventory and catalog data *(Future Enhancement)*

---

*This checklist ensures systematic resolution of all identified issues while maintaining the application's modular architecture and user experience.*
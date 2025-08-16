# StackTrackr - Next Session TODO List

## 🎯 **Priority UI/UX Improvements**

### **1. Consolidate Files and API Menu**
- [ ] Merge Files button and API button into single unified menu
- [ ] Create logical grouping of related functions
- [ ] Maintain clear visual hierarchy
- [ ] Ensure all existing functionality remains accessible

### **2. Reorganize API Modal Layout**
- [ ] **Move Import/Export cards to bottom** of API modal
  - Currently at top, should be lower priority in visual hierarchy
  - Group with other data management functions
- [ ] **Create dedicated wide card** for Backup/Restore/Clear functions
  - Position at very bottom of modal
  - Use full width for better button spacing
  - Clear visual separation from other functions

### **3. Password Window & API Status Polish**
- [ ] **Resize encryption/password sections** to match Metals API modal size
  - Make encryption forms more compact and consistent
  - Reduce excessive padding and spacing
- [ ] **Fix API status display**
  - Show "Cached" when API key is stored (not "Disconnected")
  - Properly indicate when keys are available vs when actively connected
  - Update status logic to reflect actual key storage state

### **4. Provider Cards Design Consistency**
- [ ] **Redesign provider cards** to match application design language
  - Currently beautiful but inconsistent with rest of UI
  - Align with existing card styling patterns
  - Maintain visual appeal while ensuring consistency
  - Review typography, spacing, colors, and borders
- [ ] **Provider card improvements**
  - Match existing modal card styling
  - Consistent button styling across providers
  - Unified status indicators
  - Proper hover states and interactions

### **5. Smart Filtering & Group Chip Improvements** 🆕
- [ ] **Improve filter chip behavior for grouped names**
  - When clicking "American Eagle" chip → show ALL American Eagle variants
  - Current: too specific filtering (exact matches only)  
  - Needed: intelligent partial matching for grouped items
- [ ] **Rename "Group Chips" option** to something clearer
  - Current: "Group Chips: Yes/No" - unclear what this does
  - Suggested: "Group Filters" or "Smart Grouping" or "Combine Similar Names"
  - Make it clear this groups similar item names in filter chips
- [ ] **Enhance grouped chip filtering logic**
  - Clicking "American Eagle" should find:
    - "American Silver Eagle"
    - "1 Dollar American Silver Eagle Bullion Coin 2020" 
    - "American Gold Eagle"
    - All other "American Eagle" variants
  - Implement fuzzy/substring matching for grouped chip clicks
  - Maintain current precise filtering for individual item selection

### **6. Smart Import/Export Consolidation**
- [ ] **Remove 3rd Party section** (if redundant)
  - Evaluate if needed after smart import implementation
- [ ] **Create intelligent single-button import**
  - Auto-detect file format (CSV, JSON, etc.)
  - Handle multiple data sources automatically
  - Provide format selection fallback if needed
- [ ] **Unified export function**
  - Smart format detection based on use case
  - Single button with format options

### **5. Smart Filtering & Group Chip Improvements** 🆕

- [ ] **Improve filter chip behavior for grouped names**
  - When clicking "American Eagle" chip → show ALL American Eagle variants
  - Current: too specific filtering (exact matches only)
  - Needed: intelligent partial matching for grouped items
- [ ] **Rename "Group Chips" option** to something clearer
  - Current: "Group Chips: Yes/No" - unclear what this does
  - Suggested: "Group Filters" or "Smart Grouping" or "Combine Similar Names"
  - Make it clear this groups similar item names in filter chips
- [ ] **Enhance grouped chip filtering logic**
  - Clicking "American Eagle" should find:
    - "American Silver Eagle"
    - "1 Dollar American Silver Eagle Bullion Coin 2020"
    - "American Gold Eagle"
    - All other "American Eagle" variants
  - Implement fuzzy/substring matching for grouped chip clicks
  - Maintain current precise filtering for individual item selection

### **6. Smart Import/Export Consolidation**

- [ ] **Remove 3rd Party section** (if redundant)

## 🔧 **Technical Improvements**

### **6. API Historical Data Fixes**
- [ ] **Debug historical data collection** from API pulls
  - Currently not working properly
  - Walk through API provider endpoints
  - Massage the data collection process
  - Ensure proper data storage and retrieval
- [ ] **API endpoint validation**
  - Test all provider endpoints for historical data
  - Verify data format consistency
  - Fix any parsing or storage issues
- [ ] **Historical data display**
  - Ensure historical data shows in UI correctly
  - Fix any rendering or filtering issues

### **7. Complete Numista API Integration**
- [ ] **Auto-Enrichment Workflow**
  - When user enters Numista ID, automatically fetch item details
  - Populate name, year, country, composition, weight, diameter
  - Show loading indicators during API calls
  - Handle API failures gracefully
- [ ] **Market Value Integration**
  - Fetch current market values from Numista for collectibles
  - Update market value field automatically
  - Cache values to respect rate limits
  - Show last updated timestamps
- [ ] **Search Functionality**
  - Add "Search Numista" button in add/edit forms
  - Allow users to search by coin name, country, year
  - Present search results for user selection
  - Auto-populate form with selected item data
- [ ] **Bulk Data Operations**
  - Add "Enrich from Numista" button for existing inventory
  - Batch process items that have Numista IDs
  - Rate limit compliance (100 requests/minute)
  - Progress indicators and error handling
- [ ] **Price History Integration**
  - Store historical Numista price data
  - Show price trends for collectibles
  - Integrate with existing spot history system
  - Add collectible price charts
- [ ] **Smart Data Validation**
  - Compare fetched data with existing inventory data
  - Flag discrepancies for user review
  - Allow user to accept/reject API suggestions
  - Preserve user customizations vs API defaults

### **Implementation Examples:**

**Auto-Enrichment User Flow:**
```
1. User enters Numista ID "5685" in add form
2. App shows "Fetching details..." spinner
3. API returns: "1986 American Silver Eagle, 31.1g, Silver"
4. Form auto-populates fields
5. User can modify before saving
```

**Search Integration:**
```
1. User clicks "Search Numista" button
2. Modal opens with search form
3. User types "American Eagle 1986" 
4. Results show with thumbnails and details
5. User clicks result → form auto-fills
```

**Market Value Updates:**
```
1. Existing collectibles with Numista IDs
2. "Update Prices" button fetches current values
3. Shows old vs new prices for review
4. User approves updates in batch
```

### **Numista Integration Priority & Effort:**
- **🔥 High Priority**: Auto-enrichment (2-3 hours) - Most user value
- **🔥 High Priority**: Search functionality (2-3 hours) - Core feature  
- **🟡 Medium Priority**: Market value updates (1-2 hours) - Nice to have
- **🟡 Medium Priority**: Bulk operations (1-2 hours) - Power user feature
- **🟢 Low Priority**: Price history (2-3 hours) - Advanced analytics

**Total Estimated Effort: 8-13 hours** (Spread across 2-3 sessions)

### **8. Async/Sync Storage Consolidation**
- [ ] Convert remaining synchronous storage calls to async
- [ ] Update all calling functions to properly handle async operations
- [ ] Remove duplicate sync/async storage functions once migration complete
- [ ] Add comprehensive error handling for storage operations

### **5. Encryption System Enhancements**
- [ ] Add bulk data migration wizard for existing users
- [ ] Implement encryption status indicators throughout UI
- [ ] Add export/import with encryption support
- [ ] Create encryption backup/recovery procedures

## 🎨 **Modal Design Improvements**

### **6. Proposed New Modal Structure**
```
┌─────────────────────────────────────┐
│ UNIFIED DATA MANAGEMENT MODAL       │
├─────────────────────────────────────┤
│ 🔐 Encryption Controls (Top)        │
│ ├─ Setup/Unlock/Manage             │
├─────────────────────────────────────┤
│ 📊 API & Catalog Services          │
│ ├─ Numista API Configuration       │
│ ├─ Spot Price Settings             │
│ ├─ Catalog Provider Management      │
├─────────────────────────────────────┤
│ 📥📤 Import/Export Functions        │
│ ├─ Smart Import (Single Button)    │
│ ├─ Export Options                  │
├─────────────────────────────────────┤
│ 🗃️ Data Management (Wide Card)      │
│ ├─ Backup    Restore    Clear      │
└─────────────────────────────────────┘
```

### **7. Button Consolidation Strategy**
- [ ] **Main Toolbar**: Single "Data Management" button
- [ ] **Smart Import**: Auto-detect file type, handle all formats
- [ ] **Export Options**: Dropdown or modal with format selection
- [ ] **Data Operations**: Clearly separated backup/restore/clear section

## 📱 **User Experience Enhancements**

### **8. Workflow Improvements**
- [ ] Reduce number of clicks for common operations
- [ ] Group related functions logically
- [ ] Improve visual feedback for all operations
- [ ] Add confirmation dialogs for destructive operations
- [ ] Implement progress indicators for long operations

### **9. Accessibility & Polish**
- [ ] Ensure keyboard navigation works for new layout
- [ ] Add proper ARIA labels for consolidated functions
- [ ] Test modal responsiveness on different screen sizes
- [ ] Validate color contrast and visual hierarchy

### **10. UI Polish & Fixes**

- [ ] **Resize encryption password window** to match Metals API modal size
- [ ] **Fix API status display** - show "Cached" instead of "Disconnected" when API key is stored
- [ ] Improve visual consistency between all modal windows
- [ ] Standardize modal sizing and spacing

## 🔄 **Migration Strategy**

### **11. Implementation Plan**
1. **Phase 1**: Create new consolidated modal structure
2. **Phase 2**: Implement smart import/export functions
3. **Phase 3**: Move existing functions to new layout
4. **Phase 4**: Remove redundant UI elements
5. **Phase 5**: Test and polish user experience

## 📝 **Current Session Accomplishments**

- ✅ **Implemented comprehensive encryption system** with master password
- ✅ **Added AES-GCM 256-bit encryption** for all application data  
- ✅ **Created backward-compatible storage** system with automatic migration
- ✅ **Fixed async/sync storage conflicts** throughout application
- ✅ **Added complete encryption UI** with setup/unlock/management sections
- ✅ **Enhanced filter cards display logic**:
  - Dates with >10 matches now show as filter chips
  - ALL storage locations show as filter chips (no minimum threshold)
  - ALL purchase locations show as filter chips (no minimum threshold)
  - Added proper styling for date chips using info color
- ✅ **Analyzed Numista API implementation** - confirmed it's test-only, no integration
- ✅ **Created comprehensive roadmap** for complete Numista API integration (8-13 hours)

## 🔄 **Session Summary & Next Steps**

### **✅ Major Achievements:**
1. **Security Implementation**: Complete end-to-end encryption system deployed
2. **Data Integrity**: Fixed all storage function conflicts ensuring app stability  
3. **User Experience**: Enhanced filter chips to show more relevant data
4. **Technical Analysis**: Identified Numista API as "fancy bookmark system" needing integration
5. **Project Planning**: Detailed roadmap for UI consolidation and API integration

### **🎯 Immediate Priority for Next Session:**
1. **UI/UX Polish** - Provider cards, password window sizing, API status fixes
2. **Modal Consolidation** - Merge Files/API buttons, reorganize layout
3. **Numista Integration** - Connect API framework to actual inventory workflows

### **📊 Current Application State:**
- **Encryption**: Production-ready with backward compatibility ✅
- **Storage**: Stable and conflict-free ✅  
- **Filter System**: Enhanced and more user-friendly ✅
- **API Framework**: Complete but needs integration workflows ⚠️
- **UI Consistency**: Needs provider card redesign ⚠️

---

**Next Session Focus**: UI/UX consolidation and smart import/export implementation
**Estimated Time**: 2-3 hours for complete modal redesign and function consolidation

# StackTrackr Implementation Status - August 15, 2025

## CURRENT FOCUS: Provider-Agnostic API Architecture

### Goal: Build flexible catalog API system where Numista → rSynk is just a key swap

### Design Principles:
1. **Provider abstraction** - CatalogProvider interface
2. **Unified data models** - Standardized item/value structures  
3. **Configuration-driven** - Easy provider switching
4. **Fallback chains** - Multiple providers for resilience

### Architecture Plan:
```
CatalogAPI (main interface)
├── NumistaProvider
├── rSynkProvider (future)
└── LocalProvider (fallback)
```

---

## Current Task: Price Toggle Feature Implementation (60% complete)

### What We're Building
Adding a click-to-toggle feature where users can click on the price column in the table to switch between:
- Purchase price (default)
- Market value (for collectible items)

This addresses user feedback requesting better collectible value tracking.

### Progress So Far

#### ✅ COMPLETED:
1. **Global State Added** (js/state.js):
   - Added `marketValueViewItems` Set to track which items show market value
   - Added DOM element references for new fields

2. **Data Structure Updated** (js/events.js):
   - Added `marketValue: 0` field to new inventory items in form submission

3. **Toggle Function Created** (js/inventory.js):
   - Added `togglePriceView(idx)` function to handle price display switching
   - Function updates global state and re-renders table

4. **Table Display Modified** (js/inventory.js):
   - Updated price column to use custom toggle instead of filterLink
   - Added visual indicator (📊) when showing market value
   - Made price column clickable with proper accessibility

5. **HTML Forms Updated** (index.html):
   - Added market value input fields to both Add and Edit modals
   - Fields are initially hidden, will show when collectable is selected

#### 🔄 IN PROGRESS:
1. **DOM Element Initialization** - Need to add new elements to init.js
2. **Event Listeners** - Need to add collectable toggle listeners to show/hide market value fields
3. **Form Submission** - Need to capture market value from forms
4. **Edit Form Population** - Need to populate market value when editing items

#### ❌ TODO:
1. Add DOM elements to init.js caching
2. Add event listeners for collectable toggle
3. Update form submissions to capture market value
4. Update edit form to populate market value
5. Update import/export to handle market value field
6. Update calculations to use market value for collectibles
7. Add backward compatibility for existing items
8. Test the complete flow

### Next Steps:
1. Continue with DOM initialization in init.js
2. Add collectable toggle event listeners
3. Update form submission handlers
4. Test the feature end-to-end

### Files Modified:
- `/js/state.js` - Added global state and DOM references
- `/js/events.js` - Added marketValue to new items
- `/js/inventory.js` - Added toggle function and updated table display
- `/index.html` - Added market value input fields

---

## Numista API Integration Assessment

### Current Numista Integration:
- StackTrackr already has Numista import/export functionality
- Catalog field (N#) exists for Numista IDs
- Import handles Numista CSV format

### What API Integration Would Add:
1. **Auto-populate item details** from Numista catalog ID
2. **Fetch market values** automatically
3. **Validate catalog numbers** in real-time
4. **Sync item metadata** (year, mint, condition)

### Implementation Complexity: **MEDIUM** (2-4 hours)

#### Why it's manageable tonight:
1. **Existing foundation** - Numista integration already partially built
2. **Simple API** - Numista API is straightforward REST calls
3. **Focused scope** - Can start with basic catalog lookup
4. **Incremental** - Can add features progressively

#### What would be needed:
1. API key configuration in settings
2. API client wrapper functions
3. Auto-populate logic when catalog ID entered
4. Error handling and rate limiting
5. Optional: market value fetching

#### Recommended approach:
1. **Phase 1** (30 mins): Add API key configuration
2. **Phase 2** (45 mins): Basic catalog lookup when N# entered
3. **Phase 3** (60 mins): Auto-populate item details
4. **Phase 4** (45 mins): Market value integration

### Delegation Opportunities:
- API documentation research
- Rate limiting implementation
- Error handling patterns
- Configuration UI design

Would you like me to continue with the price toggle feature first, or should we pivot to Numista API integration? The price toggle is about 60% complete and could be finished in 30-45 minutes.

# StackTrackr - GPT Task Queue

**Date Created:** August 16, 2025  
**Status:** Ready for Implementation  
**Context:** These tasks are designed for GPT/Codex implementation while core UI work is being done by the primary development team.

---

## Task 1: Advanced Multi-Criteria Search System

### Description
Implement a comprehensive search system that allows users to filter inventory using multiple criteria with AND/OR logic.

### Prompt for GPT
```
I need you to implement an advanced search system for StackTrackr inventory management. The current system has basic filtering, but I need a multi-criteria search with the following features:

1. Multiple search fields that can be combined with AND/OR logic
2. Date range filtering (purchase date, added date)
3. Price range filtering (purchase price, market value, spot price)
4. Metal type multi-select
5. Text search across name, notes, locations
6. Weight range filtering
7. Save/load search presets
8. Clear all filters option

The search should appear as a collapsible panel above the table. Use the existing CSS variables for theming (--bg-primary, --bg-secondary, etc.) and maintain compatibility with the current responsive design.

Current files to review:
- index.html (main structure)
- js/inventory.js (filtering logic)
- css/styles.css (styling patterns)

Please implement this as a new module with proper integration into the existing codebase.
```

---

## Task 2: Export/Import System with Multiple Formats

### Description
Create a robust data export/import system supporting CSV, JSON, and XML formats with validation and error handling.

### Prompt for GPT
```
I need you to implement a comprehensive export/import system for StackTrackr inventory data. The system should support multiple formats and include proper data validation.

Requirements:
1. Export formats: CSV, JSON, XML
2. Import formats: CSV, JSON, XML
3. Data validation on import with error reporting
4. Progress indicators for large datasets
5. Preview mode before importing
6. Backup creation before import
7. Field mapping for CSV imports
8. Export filtering (export selected items, filtered results, or all data)

Features to include:
- Export dialog with format selection and options
- Import wizard with file selection, preview, and validation
- Error handling with detailed error messages
- Support for custom field mappings
- Automatic data type conversion and validation

The UI should integrate with the existing design system and appear as modal dialogs. Reference the current modal patterns in the codebase for consistency.

Current inventory structure can be found in js/inventory.js in the inventory array format.
```

---

## Task 3: Inventory Analytics Dashboard

### Description
Build a comprehensive analytics dashboard with charts showing portfolio value, metal distribution, and purchase trends.

### Prompt for GPT
```
I need you to create an analytics dashboard for StackTrackr that provides insights into the user's precious metals inventory. This should be a new page/section of the application.

Analytics to implement:
1. Portfolio value over time (line chart)
2. Metal distribution (pie chart)
3. Purchase frequency by month (bar chart)
4. Top performing items by value gain
5. Storage location utilization
6. Average purchase price vs market value
7. Weight distribution by metal type
8. Purchase location analysis

Dashboard features:
- Date range selector for historical analysis
- Interactive charts (click to filter main table)
- Export charts as images
- Summary cards with key metrics
- Responsive grid layout for different screen sizes

Use Chart.js or similar charting library. The dashboard should:
- Match the existing design system (dark/light/sepia themes)
- Be accessible via a new navigation tab
- Include print-friendly layouts
- Cache calculations for performance

Data source: The inventory array in js/inventory.js contains all the necessary data fields.
```

---

## Task 4: User Preferences & Settings System

### Description
Implement a comprehensive user preferences system for table layout, themes, and default values with persistent storage.

### Prompt for GPT
```
I need you to implement a user preferences system for StackTrackr that allows users to customize their experience and save settings persistently.

Preferences to implement:
1. Table layout preferences:
   - Column visibility toggles
   - Column order customization
   - Default sort column and direction
   - Items per page default
   
2. Theme preferences:
   - Default theme selection (light/dark/sepia)
   - Custom color overrides
   - Font size preferences
   
3. Data entry defaults:
   - Default purchase location
   - Default storage location
   - Default currency format
   - Auto-fill preferences

4. Application behavior:
   - Auto-save intervals
   - Confirmation dialog preferences
   - Keyboard shortcuts customization

Implementation requirements:
- Settings panel accessible via gear icon in header
- Organized in tabs/sections for easy navigation
- Real-time preview of changes
- Export/import settings functionality
- Reset to defaults option
- Local storage persistence with fallback defaults

The UI should match existing modal patterns and support all three themes. Include proper validation and error handling for all settings.
```

---

## Task 5: Advanced Multi-Column Sorting System

### Description
Enhance the current sorting to support multiple columns with priority order and visual indicators.

### Prompt for GPT
```
I need you to upgrade the current single-column sorting system in StackTrackr to support advanced multi-column sorting with priority ordering.

Current sorting: Basic click-to-sort on individual columns
Target functionality:
1. Hold Shift + click to add secondary sort columns
2. Visual indicators showing sort order and priority (1, 2, 3...)
3. Drag-and-drop sort priority reordering
4. Sort direction toggle for each column
5. Clear all sorting option
6. Save/load sort presets
7. Sort by custom criteria (e.g., value per weight)

Visual requirements:
- Small numbered badges showing sort priority
- Up/down arrows for sort direction
- Subtle highlighting of sorted columns
- Sort management panel (optional)

The system should:
- Maintain compatibility with existing column headers
- Work with all data types (text, numbers, dates)
- Handle null/empty values appropriately
- Preserve sort state across sessions
- Include keyboard shortcuts (Ctrl+1,2,3 for quick sorts)

Current sorting logic is in js/inventory.js in the sortTable function. Please enhance this system while maintaining backward compatibility.
```

---

## Task 6: Mobile-Responsive Design Improvements

### Description
Enhance the mobile and tablet experience with touch-friendly controls and optimized layouts.

### Prompt for GPT
```
I need you to improve the mobile and tablet experience for StackTrackr. The current design works on mobile but needs optimization for touch interfaces and smaller screens.

Mobile improvements needed:
1. Touch-friendly buttons and controls (minimum 44px touch targets)
2. Swipe gestures for table navigation
3. Mobile-optimized table with card view option
4. Collapsible sections for better space utilization
5. Pull-to-refresh functionality
6. Mobile-specific navigation patterns

Tablet improvements:
1. Two-panel layout utilizing available screen space
2. Drag-and-drop functionality for bulk operations
3. Split-screen table and detail view
4. Optimized keyboard shortcuts for tablet keyboards

Responsive breakpoints to enhance:
- Mobile portrait (320px-480px)
- Mobile landscape (480px-768px)
- Tablet portrait (768px-1024px)
- Tablet landscape (1024px-1200px)

Features to implement:
- Progressive enhancement approach
- Touch gesture library integration
- Offline functionality indicators
- Mobile-optimized modals and forms
- Improved table scrolling with sticky headers
- Card-based layout option for mobile viewing

Maintain compatibility with existing desktop functionality while enhancing the mobile experience.
```

---

## Task 7: Backup & Restore System

### Description
Create an automated backup system with versioning, recovery tools, and data integrity checking.

### Prompt for GPT
```
I need you to implement a comprehensive backup and restore system for StackTrackr inventory data with versioning and recovery capabilities.

Backup features:
1. Automatic scheduled backups (daily, weekly, monthly)
2. Manual backup creation
3. Versioned backup storage with metadata
4. Cloud storage integration (optional)
5. Backup compression and encryption
6. Backup integrity verification

Restore features:
1. Point-in-time restore with date picker
2. Selective restore (specific items or date ranges)
3. Restore preview before execution
4. Merge options (replace, append, skip duplicates)
5. Rollback functionality
6. Data comparison tools

Management interface:
- Backup history with file sizes and dates
- Storage usage monitoring
- Backup scheduling configuration
- Restore wizard with step-by-step guidance
- Export backups for external storage
- Automated cleanup of old backups

Technical requirements:
- Use IndexedDB for local backup storage
- JSON format with compression
- Progress indicators for long operations
- Error handling and recovery
- Background processing where possible
- Notification system for backup events

The system should be accessible via the main settings panel and include proper user education about backup best practices.
```

---

## Task 8: Inventory Alerting & Notification System

### Description
Build a smart alerting system for inventory management with customizable triggers and notification methods.

### Prompt for GPT
```
I need you to implement an intelligent alerting and notification system for StackTrackr that helps users manage their inventory proactively.

Alert types to implement:
1. Price alerts:
   - Spot price changes above threshold
   - Market value changes
   - Purchase opportunity alerts
   
2. Inventory alerts:
   - Low stock warnings
   - Portfolio balance alerts
   - Storage capacity warnings
   
3. Milestone alerts:
   - Portfolio value milestones
   - Collection completion goals
   - Investment performance targets

4. Maintenance alerts:
   - Scheduled inventory reviews
   - Insurance appraisal reminders
   - Storage rotation suggestions

Notification methods:
- In-app notifications with dismissal options
- Browser notifications (with permission)
- Email notifications (configuration)
- Alert history and management

Configuration features:
- Alert rule builder with conditions
- Frequency settings (immediate, daily digest, weekly)
- Priority levels (low, medium, high, critical)
- Custom alert messages
- Alert grouping and categories
- Snooze and acknowledge options

The system should:
- Include a notification center in the header
- Provide alert rule templates for common scenarios
- Support multiple alert conditions with AND/OR logic
- Include performance monitoring to avoid alert fatigue
- Offer alert analytics and effectiveness tracking

Integration points: Connect with existing price data, inventory counts, and user preferences.
```

---

## Task 9: Historical Price Tracking & Valuation System

### Description
Implement comprehensive price tracking with historical data, trends analysis, and portfolio valuation over time.

### Prompt for GPT
```
I need you to implement a historical price tracking system for StackTrackr that monitors price changes over time and provides valuation analytics.

Price tracking features:
1. Automatic spot price updates from external APIs
2. Historical price data storage and management
3. Price change notifications and alerts
4. Custom price sources and manual price entry
5. Price trend analysis with charts
6. Comparative price analysis across metals

Valuation features:
1. Portfolio valuation over time
2. Individual item performance tracking
3. Purchase vs current value analysis
4. Gain/loss calculations with percentages
5. Performance benchmarking
6. Valuation forecasting (basic trend projection)

Data management:
- Efficient storage of historical price data
- Data compression for long-term storage
- Price data import/export functionality
- Multiple currency support
- Exchange rate tracking and conversion

Analytics and reporting:
- Performance dashboards with charts
- Valuation reports (daily, weekly, monthly)
- Best/worst performing items
- Price volatility analysis
- Portfolio diversification metrics
- ROI calculations and projections

Technical implementation:
- Background price fetching service
- Local caching with TTL for performance
- Graceful handling of API failures
- Data validation and error correction
- Progressive data loading for large datasets

The system should integrate seamlessly with the existing inventory data and provide both real-time and historical perspectives on portfolio performance.
```

---

## Task 10: Dynamic Column Resizing with Smart Hiding

### Description
Implement the requested dynamic column resizing system that intelligently hides columns based on available space.

### Prompt for GPT
```
I need you to implement a dynamic column resizing system for StackTrackr that allows users to resize the Name column and automatically hides other columns based on available space.

Specific requirements:
1. Draggable resize handle on the Name column header
2. Automatic column hiding in this exact order when space is limited:
   - Premium (first to hide)
   - Spot
   - Storage Location
   - Purchase Location
   - Market (last to hide)
3. Do not alter these columns during resizing:
   - Date, Type, Metal, QTY, Name, Weight, Purchase Price
   - Collectable, Notes, Edit, Delete (action columns)

Features to implement:
- Visual resize handle with cursor feedback
- Smooth transitions when columns hide/show
- Persistent resize settings in localStorage
- Reset to default widths option
- Minimum/maximum width constraints
- Real-time preview during resize
- Mobile responsiveness maintenance

Technical implementation:
- Use CSS custom properties for dynamic width management
- JavaScript event handlers for mouse/touch drag operations
- Integration with existing responsive design breakpoints
- Maintain compatibility with current table styling
- Preserve sort functionality and column interactions

The system should feel natural and intuitive, giving users control over their table layout while maintaining the core functionality of all columns. Include visual feedback during resize operations and ensure the hidden columns can be restored when space becomes available.

Reference the current table structure in index.html and styling in css/styles.css, particularly the responsive design sections around lines 2100-2400.
```

---

## Implementation Notes

### Priority Order (Recommended)
1. **Task 10** - Dynamic Column Resizing (highest priority - already planned for next session)
2. **Task 4** - User Preferences System (foundation for other features)
3. **Task 2** - Export/Import System (high user value)
4. **Task 3** - Analytics Dashboard (high user value)
5. **Task 1** - Advanced Search (enhances usability)
6. **Task 5** - Multi-Column Sorting (table enhancement)
7. **Task 6** - Mobile Improvements (accessibility)
8. **Task 7** - Backup System (data protection)
9. **Task 8** - Alerting System (advanced feature)
10. **Task 9** - Price Tracking (complex integration)

### Development Guidelines
- Maintain compatibility with existing CSS variables and theme system
- Follow the established file structure and naming conventions
- Include comprehensive error handling and user feedback
- Test across all three themes (light, dark, sepia)
- Ensure responsive design compatibility
- Include proper documentation and code comments

### Integration Points
- All tasks should integrate with the existing inventory data structure
- Maintain compatibility with current filtering and sorting systems
- Preserve the atomic symbols and metal categorization system
- Respect the current modal and UI patterns
- Follow the established git commit message format

---

**Last Updated:** August 16, 2025  
**Total Tasks:** 10  
**Estimated Development Time:** 2-4 weeks (depending on task complexity and parallelization)

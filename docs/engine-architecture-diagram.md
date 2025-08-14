# StackrTrackr Engine Architecture Diagram

## 🏗️ System Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                    StackrTrackr Engine                         │
│                 Precious Metals Inventory                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│   Data Layer    │   Logic Layer   │    UI Layer     │  External APIs  │
│   (Storage)     │   (Processing)  │  (Interface)    │  (Integration)  │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

## 📁 Module Structure & Dependencies

### Core Module Loading Order
```
1. index.html (Base HTML structure)
   ├── css/styles.css (Styling & themes)
   ├── js/utils.js (Core utilities) ⭐ FOUNDATION
   ├── js/error-handler.js (Error management)
   ├── js/data-processor.js (Data validation)
   ├── js/catalog-manager.js (Catalog sync)
   ├── js/inventory.js (Main inventory logic) ⭐ CORE
   ├── js/import-export-helpers.js (Import utilities)
   ├── js/import-export.js (Unified import system) ⭐ IMPORT
   ├── js/numista-simple.js (Numista price parsing)
   ├── js/events.js (Event system)
   ├── js/about.js (About modal)
   └── js/init.js (Application initialization) ⭐ STARTUP
```

## 🔄 Data Flow Architecture

### Import Data Flow
```
CSV/JSON File → Papa.parse → Field Mapping → Validation → Storage
     │              │              │             │          │
     ▼              ▼              ▼             ▼          ▼
File Reader → parseNumistaPrice → sanitizeItem → localStorage → UI Update
     │         (Advanced dual      │                        │
     │          price strategy)    │                        │
     ▼                            ▼                        ▼
Progress UI ←─────────────────── Error Handling ────────► Toast Messages
```

### Inventory Management Flow
```
User Input → Validation → Storage → Calculation → Display
    │            │          │         │           │
    ▼            ▼          ▼         ▼           ▼
Add Item → validateItem → saveData → updateStats → renderTable
Edit Item → sanitizeData → syncCatalog → calcMelt → refreshUI
Delete Item → confirmAction → localStorage → spotPrices → filterChips
```

## 🗄️ Storage & State Management

### localStorage Structure
```javascript
metalInventory: [
  {
    serial: "unique_id",
    name: "Item Name",
    metal: "Silver|Gold|Platinum|Palladium",
    weight: 31.1035, // grams
    qty: 1,
    price: 25.00, // USD
    type: "Coin|Bar|Round|Note",
    isCollectable: true|false,
    numistaId: "12345",
    date: "YYYY-MM-DD",
    // ... additional fields
  }
]
```

### Global State Variables
```javascript
window.LS_KEY = 'metalInventory'
window.spotPrices = { silver: 24.50, gold: 2000.00, ... }
window.inventory = [] // Live inventory array
window.filteredInventory = [] // Filtered view
```

## ⚙️ Core Function Mapping

### 🔧 Utility Functions (js/utils.js)
```
gramsToOzt(grams) ────────► Convert grams to troy ounces (÷31.1034768)
formatWeight(weight) ─────► Display weight with units
normalizeType(type) ──────► Standardize item types
formatCurrency(amount) ───► Format currency display
sanitizeInput(input) ─────► Clean user input
validateInventoryItem() ──► Comprehensive validation
getNextSerial() ──────────► Generate unique IDs
```

### 📊 Inventory Logic (js/inventory.js)
```
renderTable() ────────────► Main table rendering
updateStorageStats() ─────► Calculate totals & stats
calculateMeltValue() ─────► Precious metals calculations
addInventoryItem() ───────► Add new items
editInventoryItem() ──────► Modify existing items
deleteInventoryItem() ────► Remove items
filterInventory() ────────► Search & filter system
sortInventory() ──────────► Column sorting
```

### 📥 Import System (js/import-export.js)
```
unifiedCsvImport() ───────► Auto-detect CSV format
importStackrTrackrCsv() ──► Native format import
importNumistaCsvSimple() ─► Advanced Numista import
detectCsvFormat() ────────► Format identification
extractFieldsUsingProfile() ► Field mapping engine
showImportResultsModal() ─► Results display
```

### 💰 Price Parsing (js/numista-simple.js)
```
parseNumistaPrice() ──────► Dual price strategy
parseComplexPrice() ──────► Handle price ranges/formats
detectCurrency() ─────────► Currency identification
convertToUsd() ───────────► Currency conversion (future)
```

## 🎨 UI Component System

### Modal Architecture
```
Files Modal (4-Card Layout)
├── Import Card (CSV/JSON with 4 buttons)
├── Export Card (PDF/CSV/JSON/HTML)
├── Backup Card (Cloud/Full Backup/Restore)
└── Fun Card (Boating Accident Meme) 🛥️
```

### Table System
```
Main Inventory Table
├── Dynamic Columns (configurable)
├── Sorting (multi-column)
├── Filtering (chips system)
├── Pagination (performance)
├── Inline Editing
├── Bulk Actions
└── N# Hyperlinks (Numista integration)
```

### Filter Chips System
```
Active Filters Display
├── Metal Filters (Silver, Gold, etc.)
├── Type Filters (Coin, Bar, etc.)
├── Weight Ranges
├── Price Ranges
├── Date Ranges
└── Custom Filters
```

## 🔗 External Integrations

### Numista Integration
```
N# Hyperlinks ───► numista.com popups
Import System ───► CSV format parsing
Price Parsing ───► Dual price strategy
Field Mapping ───► Extensible profiles
```

### Spot Price Integration (Future)
```
API Calls ─────────► Live precious metals prices
Historical Data ───► Purchase date pricing
Auto Updates ──────► Background price refresh
```

## 📋 Event System Architecture

### Global Events
```javascript
// Core inventory events
'inventoryUpdated' ────► Fired after data changes
'filterChanged' ───────► Fired when filters update
'sortChanged' ─────────► Fired when sorting changes
'themeChanged' ────────► Dark/light mode toggle

// Import/Export events
'importStarted' ───────► Progress tracking begins
'importProgress' ──────► Progress updates
'importCompleted' ─────► Import finished
'exportCompleted' ─────► Export finished
```

### Event Flow
```
User Action → Event Trigger → State Update → UI Refresh
     │              │             │            │
     ▼              ▼             ▼            ▼
Click Button → dispatchEvent → updateData → renderTable
Filter Input → filterChanged → applyFilter → refreshView
Sort Column → sortChanged → sortData → updateDisplay
```

## 🧮 Calculation Engine

### Melt Value Calculations
```
Standard Bullion:
weight (grams) ÷ 31.1034768 × spot_price = melt_value

Collectibles:
melt_value = 0 (collectible value ≠ melt value)

90% Silver Special Calculation:
weight × 0.9 ÷ 31.1034768 × silver_spot = silver_melt_value
```

### Portfolio Statistics
```
Total Items ──────────► Count of all inventory
Total Weight ─────────► Sum by metal type
Total Investment ─────► Sum of purchase prices
Current Value ────────► Melt + collectible values
Profit/Loss ──────────► Current - Investment
Premium Calculations ─► Price above melt per ounce
```

## 🚨 Error Handling & Validation

### Error Hierarchy
```
errorHandler (js/error-handler.js)
├── showError() ─────────► User-friendly messages
├── handle() ────────────► General error processing
├── logError() ──────────► Console/debugging output
└── showToast() ─────────► Success/warning notifications
```

### Validation Pipeline
```
User Input → sanitizeInput() → validateInventoryItem() → Save/Reject
     │              │                    │                  │
     ▼              ▼                    ▼                  ▼
Clean Data → Format Check → Business Rules → Storage/Error
```

## 🔍 Search & Filter Engine

### Filter Architecture
```
Search Input ──────────► Text matching (name, notes, etc.)
Metal Filters ─────────► Exact metal type matching
Type Filters ──────────► Item type filtering
Weight Ranges ─────────► Numeric range filtering
Price Ranges ──────────► Currency range filtering
Date Ranges ───────────► Date range filtering
Collectible Toggle ────► Boolean filtering
```

### Filter Combination Logic
```
AND Logic: All active filters must match
OR Logic: Within filter type (e.g., Silver OR Gold)
Real-time: Filters apply immediately
Persistent: Filters remembered in session
```

## 📱 Responsive Design System

### Breakpoint Architecture
```
Mobile (< 768px) ──────► Simplified table, stacked cards
Tablet (768px - 1024px) ► Condensed columns, overlay modals  
Desktop (> 1024px) ────► Full feature set, multi-column
```

### Theme System
```
CSS Variables ─────────► Dynamic color switching
Dark Mode ─────────────► Complete dark theme
Light Mode ────────────► Standard light theme
Auto Detection ────────► System preference detection
```

## 🔐 Security & Data Integrity

### Data Protection
```
Input Sanitization ────► XSS prevention
localStorage Limits ───► Quota management
Error Boundary ────────► Graceful degradation
Backup System ─────────► Data loss prevention
```

### Validation Rules
```
Weight: >= 0 (allows zero for paper money)
Price: >= 0 (allows zero for gifts)
Quantity: >= 1 (minimum one item)
Serial: Unique identifier required
Name: Required field, sanitized
```

## 🎯 Performance Optimization

### Loading Strategy
```
Critical Path: utils.js → inventory.js → init.js
Lazy Loading: Large modals loaded on demand
Debouncing: Search input delays
Pagination: Large table performance
Caching: Filter results cached
```

### Memory Management
```
Event Cleanup ─────────► Remove listeners on modal close
DOM Recycling ─────────► Reuse table rows when possible
Data Chunking ─────────► Process large imports in batches
Progress Tracking ─────► User feedback during operations
```

## 🔮 Future Architecture Considerations

### Planned Enhancements
```
API Integration ───────► Live spot prices
Cloud Storage ─────────► Cross-device sync
PWA Support ───────────► Offline functionality
Advanced Analytics ────► Investment tracking
Multi-Currency ────────► International support
```

### Extensibility Points
```
Field Mapping Profiles ► Custom CSV formats
Translation System ────► Multi-language support
Plugin Architecture ───► Third-party integrations
Theme Engine ──────────► Custom color schemes
Export Templates ──────► Custom report formats
```

---

## 🎮 Developer Quick Reference

### Key Global Functions
```javascript
// Inventory Management
addInventoryItem(item)
editInventoryItem(serial, updatedItem)
deleteInventoryItem(serial)
renderTable()
updateStorageStats()

// Import/Export
unifiedCsvImport(file, override)
exportToCsv()
exportToJson()
exportToPdf()

// Utilities  
formatCurrency(amount)
gramsToOzt(grams)
validateInventoryItem(item)
getNextSerial()

// Error Handling
errorHandler.showError(message)
errorHandler.handle(error, context)
showToast(message, type)
```

### Critical Files for Modification
```
js/utils.js ───────────► Core utilities (modify carefully)
js/inventory.js ───────► Main logic (test thoroughly)
js/import-export.js ───► Import system (validate formats)
css/styles.css ────────► UI styling (check responsiveness)
index.html ────────────► Structure (maintain load order)
```

This comprehensive diagram provides a complete overview of the StackrTrackr engine architecture, showing how all components interact and flow together. 🏗️
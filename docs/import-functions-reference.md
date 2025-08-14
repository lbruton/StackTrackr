# Import Functions Reference Guide

## 📋 Overview

This document provides comprehensive documentation for all import functions in StackrTrackr, including CSV/JSON import systems, field mapping profiles, and data transformation pipelines.

## 🔄 Import System Architecture

```
CSV/JSON File → Format Detection → Field Mapping → Validation → Storage → UI Update
     │               │               │             │          │         │
     ▼               ▼               ▼             ▼          ▼         ▼
File Reader → detectCsvFormat() → Profile Maps → sanitize() → localStorage → renderTable()
```

## 🎯 Core Import Functions

### 1. **Unified Import System**

#### `unifiedCsvImport(file, override = false)`
**Location**: `js/import-export.js`  
**Purpose**: Main entry point for all CSV imports with automatic format detection

```javascript
// Auto-detects between StackrTrackr and Numista formats
unifiedCsvImport(file, false); // Merge mode
unifiedCsvImport(file, true);  // Override mode
```

**Process Flow:**
1. Reads file via FileReader
2. Calls `detectCsvFormat()` to identify format
3. Routes to appropriate import function
4. Shows unified progress indicators
5. Displays import results modal

---

### 2. **Format Detection**

#### `detectCsvFormat(csvText)`
**Location**: `js/import-export.js`  
**Purpose**: Identifies CSV format type for proper import routing

```javascript
const format = detectCsvFormat(csvText);
// Returns: 'stackrtrackr' | 'numista' | 'unknown'
```

**Detection Logic:**
- **StackrTrackr**: Looks for `Metal`, `Name`, `Qty`, `Type`, `Weight(oz)`
- **Numista**: Looks for `Title`, `N# number`, `Composition`, `Weight`
- **Unknown**: Falls back to StackrTrackr format with warnings

---

### 3. **StackrTrackr Native Import**

#### `importStackrTrackrCsv(file, override = false)`
**Location**: `js/import-export.js`  
**Purpose**: Handles native StackrTrackr CSV format

**Expected Columns:**
```csv
Metal,Name,Qty,Type,Weight(oz),Purchase Price,Spot Price ($/oz),Premium ($/oz),Total Premium,Purchase Location,Storage Location,N#,Collectable,Notes,Date
```

**Field Mapping:**
- Direct 1:1 mapping with internal data structure
- Weight assumes troy ounces
- Boolean parsing for `Collectable` field
- Date validation and formatting

---

### 4. **Numista Advanced Import**

#### `importNumistaCsvSimple(file, override = false)`
**Location**: `js/numista-simple.js`  
**Purpose**: Advanced Numista import with dual price parsing and structured notes

**Key Features:**
- **Dual Price Strategy**: Handles both buying and average prices
- **Structured Notes**: Creates parseable markdown from all CSV fields
- **Collection Mapping**: Maps "Collection" field to "Storage Location"
- **Advanced Price Parsing**: Handles ranges, currencies, and complex formats

```javascript
// Automatically creates structured notes like:
// ## Import Data
// **Item Name** - 1960 Silver Franklin Half Dollar
// **Public Comment** - Brilliant Uncirculated
// **Country** - United States
// etc...
```

---

## 🗺️ Field Mapping System

### Field Mapping Profiles

#### `FIELD_MAPPING_PROFILES`
**Location**: `js/import-export.js`  
**Purpose**: Extensible mapping system for different CSV formats

```javascript
const FIELD_MAPPING_PROFILES = {
  numista: {
    name: 'Numista Export',
    description: 'Standard Numista CSV export format',
    mappings: {
      name: ['Title', 'Name', 'title', 'name'],
      metal: ['Composition', 'composition', 'Metal', 'metal'],
      weight: ['Weight', 'weight', 'Weight (g)', 'Mass'],
      qty: ['Quantity', 'qty', 'Quantity owned', 'Amount'],
      price: ['Buying price', 'Purchase price', 'Price paid', 'Cost'],
      numistaId: ['N# number', 'N# number (with link)', 'Numista #']
    }
  }
};
```

#### `extractFieldsUsingProfile(row, profile)`
**Location**: `js/import-export.js`  
**Purpose**: Maps CSV fields to internal structure using profiles

**Process:**
1. Iterates through profile mappings
2. Searches for field variants in CSV headers
3. Returns standardized field object
4. Handles missing fields gracefully

---

## 💰 Price Parsing System

### Advanced Numista Price Parser

#### `parseNumistaPrice(row, profile)`
**Location**: `js/numista-simple.js`  
**Purpose**: Handles complex Numista price formats with dual price strategy

**Configuration:**
```javascript
const PRICE_CONFIG = {
  threshold: 0.3,     // 30% difference threshold
  strategy: 'larger', // 'larger', 'average', or 'conservative'
  minPrice: 1.0       // Minimum price to consider valid
};
```

**Strategies:**
1. **Both Prices Available**: Uses strategy if within threshold
2. **Single Price**: Uses buying price or average price
3. **Fallback**: Searches additional price fields

#### `parseComplexPrice(priceStr)`
**Location**: `js/numista-simple.js`  
**Purpose**: Parses individual price strings with complex formats

**Supported Formats:**
- `$25.00` → $25.00
- `€15.50` → €15.50 (converted to USD)
- `$15.00 - $25.00` → $20.00 (uses average)
- `N/A`, `Unknown`, `—` → $0.00
- `Est. $20-30` → $25.00

---

## 📝 Notes Generation System

### Structured Notes Creation

#### `createStructuredNotes(row, extracted)`
**Location**: `js/numista-simple.js`  
**Purpose**: Creates parseable markdown notes from all CSV data

**Output Format:**
```markdown
## Import Data

**Item Name** - 1960 Silver Franklin Half Dollar
**Public Comment** - Brilliant Uncirculated
**Private Comment** - Purchased from local dealer
**Country** - United States
**Year** - 1960
**Denomination** - 50 Cents

### Additional Fields

**Any Other Field** - Value

---
*Generated by StackrTrackr Numista Import*
```

**Features:**
- **Structured**: Uses consistent `**Field** - Value` pattern
- **Parseable**: Can be re-imported programmatically
- **Complete**: Includes all non-core CSV fields
- **Categorized**: Separates core fields from additional data

---

## 🔧 Validation & Processing

### Data Validation

#### `validateInventoryItem(item)`
**Location**: `js/utils.js`  
**Purpose**: Comprehensive validation before import

**Validation Rules:**
- **Weight**: `>= 0` (allows zero for paper money)
- **Price**: `>= 0` (allows zero for gifts)
- **Quantity**: `>= 1` (minimum one item)
- **Name**: Required field, sanitized
- **Metal**: Valid precious metal or composition

#### `sanitizeImportedItem(item)`
**Location**: `js/utils.js`  
**Purpose**: Cleans and standardizes imported data

**Processing:**
- HTML entity decoding
- String trimming and normalization
- Type conversion (strings to numbers)
- Default value assignment

---

## 📊 Progress & Results System

### Import Progress Tracking

#### Progress Functions
**Location**: `js/import-export.js`

```javascript
startImportProgress(totalRows)    // Initialize progress bar
updateImportProgress(current, imported, total) // Update progress
endImportProgress()               // Hide progress bar
```

#### Results Modal

#### `showImportResultsModal(imported, skipped, total)`
**Location**: `js/import-export.js`  
**Purpose**: Displays detailed import results with error details

**Information Displayed:**
- Total rows processed
- Successfully imported count
- Skipped items with reasons
- Line-by-line error details
- Validation failure explanations

---

## 🔄 Data Flow Examples

### StackrTrackr Import Flow
```
CSV File → Papa.parse → Direct Mapping → Validation → Storage
```

### Numista Import Flow
```
CSV File → Papa.parse → Profile Mapping → Price Parsing → Notes Generation → Validation → Collection Mapping → Storage
```

### Error Handling Flow
```
Validation Failure → Error Collection → Results Modal → User Feedback
```

---

## 🛠️ Extension Points

### Adding New Import Formats

1. **Create Profile**: Add new profile to `FIELD_MAPPING_PROFILES`
2. **Update Detection**: Modify `detectCsvFormat()` to recognize new format
3. **Custom Processing**: Create format-specific import function if needed
4. **Test Integration**: Ensure unified import system routes correctly

### Custom Field Mappings

```javascript
// Example: Adding support for another auction site
customProfile: {
  name: "Auction Site X",
  mappings: {
    name: ['Item_Title', 'Lot_Name'],
    price: ['Final_Price', 'Hammer_Price'],
    metal: ['Material', 'Composition_Type']
  }
}
```

---

## 🐛 Debugging & Troubleshooting

### Console Logging
All import functions provide detailed console output:

```javascript
console.log('📊 Processing ${totalRows} rows');
console.log('✅ Item imported:', item.name);
console.log('❌ Item rejected:', validation.errors);
console.log('💰 Dual price analysis:', priceDetails);
```

### Common Issues

1. **Import Rejection**: Check console for validation errors
2. **Price Parsing**: Enable price parsing debug logs
3. **Field Mapping**: Verify CSV headers match profile expectations
4. **Character Encoding**: Ensure UTF-8 encoding for special characters

### Validation Debugging

```javascript
// Manual validation testing
const item = { name: 'Test', weight: 1.0, price: 25.00 };
const result = validateInventoryItem(item);
console.log('Validation result:', result);
```

---

## 📚 Related Documentation

- **[Engine Architecture Diagram](engine-architecture-diagram.md)** - Complete system overview
- **[Numista Price Parsing](numista-price-parsing.md)** - Detailed price parsing documentation
- **[Field Mapping Profiles](field-mapping-profiles.md)** - Profile system documentation (planned)
- **[Import Error Codes](import-error-codes.md)** - Error reference (planned)

---

## 🔮 Future Enhancements

### Planned Features
- **Translation Profile Modal**: User-configurable field mappings
- **Custom Import Wizards**: Step-by-step import configuration
- **Batch Import Processing**: Handle large files with chunking
- **Import Templates**: Save and reuse custom import configurations
- **Error Recovery**: Advanced error handling and data repair

### Extension Ideas
- **API Integration**: Direct import from catalog APIs
- **Image Processing**: Extract data from coin photos
- **Barcode Scanning**: Mobile-first import workflows
- **Cloud Import**: Import from Google Sheets, Airtable, etc.

---

*This document covers the complete import system architecture. For implementation details, refer to the individual function documentation in the source code.*
# StackrTrackr UI Wireframe & Component Map

**Last Updated:** 2025-10-01

---

## Complete ASCII UI Layout

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════════════════════════════════╗   │
│  ║  [STACKRTRACKR LOGO]                                                              ║   │
│  ║  [+ New Item]  [☀️ Appearance]  [🔌 API]  [📁 Files]  [ℹ️ About]                 ║   │
│  ╚═══════════════════════════════════════════════════════════════════════════════════╝   │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐ │
│  │  🔍 Search: [_________________________________________________] [✖ Clear]          │ │
│  │                                                       [Bulk Edit Operations ▼]     │ │
│  └─────────────────────────────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  ╔═══════════════════════════════════════════════════════════════════════════════════╗   │
│  ║  INVENTORY TABLE (Sortable, Resizable, Responsive Columns)                       ║   │
│  ╠═══╦══════╦═══════╦════╦════════════════════╦════════╦════════╦════════╦════════╦══╣   │
│  ║ ▲ ║ Date ║ Type  ║ M  ║ Name               ║ Weight ║ Price  ║  Spot  ║Premium ║..║   │
│  ╠═══╬══════╬═══════╬════╬════════════════════╬════════╬════════╬════════╬════════╬══╣   │
│  ║   ║01/15 ║ Coin  ║ Ag ║ Silver Eagle 2023  ║ 1.00oz ║ $32.50 ║ $24.50 ║ $8.00  ║..║   │
│  ║   ║      ║       ║    ║ [Edit] [Delete] [Notes] [✓ Collectable]                 ║   │
│  ╠═══╬══════╬═══════╬════╬════════════════════╬════════╬════════╬════════╬════════╬══╣   │
│  ║   ║12/20 ║ Bar   ║ Au ║ 1oz Gold Bar PAMP  ║ 1.00oz ║$2,150  ║$2,100  ║ $50.00 ║..║   │
│  ║   ║      ║       ║    ║ [Edit] [Delete] [Notes] [  Collectable]                 ║   │
│  ╠═══╬══════╬═══════╬════╬════════════════════╬════════╬════════╬════════╬════════╬══╣   │
│  ║   ║ ...  ║  ...  ║... ║       ...          ║  ...   ║  ...   ║  ...   ║  ...   ║..║   │
│  ╚═══╩══════╩═══════╩════╩════════════════════╩════════╩════════╩════════╩════════╩══╝   │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  [◀ Previous]  [1] [2] [3] ... [10]  [Next ▶]                    Items per page: [10 ▼] │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  ╔═══════════════════════════════════════════════════════════════════════════════════╗   │
│  ║  SUMMARY TOTALS (Click for detailed breakdown charts)                            ║   │
│  ╠══════════════╦══════════════╦══════════════╦══════════════╦══════════════════════╣   │
│  ║   SILVER     ║     GOLD     ║   PLATINUM   ║  PALLADIUM   ║        ALL           ║   │
│  ╠══════════════╬══════════════╬══════════════╬══════════════╬══════════════════════╣   │
│  ║ Items:   45  ║ Items:   12  ║ Items:    3  ║ Items:    2  ║ Items:       62      ║   │
│  ║ Weight: 45oz ║ Weight: 12oz ║ Weight:  3oz ║ Weight:  2oz ║ Weight:      62oz    ║   │
│  ║ Value: $1.2K ║ Value: $25K  ║ Value: $3.5K ║ Value: $3.2K ║ Value:    $32.9K     ║   │
│  ║ Cost:  $1.1K ║ Cost:  $24K  ║ Cost:  $3.4K ║ Cost:  $3.1K ║ Cost:     $31.6K     ║   │
│  ║ P/L:  +$100  ║ P/L:  +$1K   ║ P/L:   +$100 ║ P/L:   +$100 ║ P/L:      +$1.3K     ║   │
│  ║ Premium: $45 ║ Premium: $50 ║ Premium: $12 ║ Premium:  $8 ║ Premium:    $115     ║   │
│  ╚══════════════╩══════════════╩══════════════╩══════════════╩══════════════════════╝   │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │ 📊 SPOT PRICES (Last updated: 2025-10-01 14:23 UTC)                              │   │
│  ├─────────────┬────────────┬─────────────┬─────────────┬──────────────────────────┤   │
│  │ Silver      │ Gold       │ Platinum    │ Palladium   │ [🔄 Sync All Prices]    │   │
│  │ $24.50/oz   │ $2,100/oz  │ $1,050/oz   │ $1,600/oz   │ [📊 Price History]      │   │
│  │ [💾][🔄][📈]│ [💾][🔄][📈]│ [💾][🔄][📈]│ [💾][🔄][📈]│ [⚙️ API Settings]       │   │
│  └─────────────┴────────────┴─────────────┴─────────────┴──────────────────────────┘   │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  StackrTrackr v3.04.87 │ Storage: 42% (2.1 MB / 5.0 MB) │ [📋 Change Log] │         │
│  © 2025 stackrtrackr.com │ [📊 Storage Report] │ [💾 Backup Reminder (7 days)]     │
└──────────────────────────────────────────────────────────────────────────────────────────┘

LEGEND:
  ▲ = Sortable column header
  💾 = Save manual price
  🔄 = Sync from API
  📈 = View price history
  ✓ = Collectable checkbox
  ▼ = Dropdown menu
```

---

## Modal Overlays

### 1. Add Item Modal
```
╔══════════════════════════════════════════════════════════════════╗
║  Add New Item                                              [✖]   ║
╠══════════════════════════════════════════════════════════════════╣
║  Metal: [Silver ▼]          Type: [Coin ▼]                      ║
║  Name: [___________________________]  Qty: [1]                   ║
║  Weight: [____] [Troy Ounces ▼]  Composition: [.999 Fine Silver]║
║  Price: [$____]  Market Value: [$____] (optional)               ║
║  Date: [2025-10-01]  Purchase Location: [____________]           ║
║  Storage Location: [____________]  N#: [______] (Numista ID)     ║
║  ☐ Collectable Item (disables premium calculation)              ║
║  Spot Price at Purchase: [$24.50]  (auto-filled from cache)     ║
║  Notes: [_________________________________________________]      ║
║         [_________________________________________________]      ║
║                                                                  ║
║  Calculated Premium: $8.00/oz ($8.00 total)                     ║
║                                                                  ║
║  [Cancel]                                       [Add Item]       ║
╚══════════════════════════════════════════════════════════════════╝
```

### 2. API Settings Modal
```
╔══════════════════════════════════════════════════════════════════╗
║  API Provider Settings                                     [✖]   ║
╠══════════════════════════════════════════════════════════════════╣
║  ╔═══════════════════════════════════════════════════════════╗  ║
║  ║  [Metals.dev] [Metals-API.com] [MetalPriceAPI] [Custom]  ║  ║
║  ╚═══════════════════════════════════════════════════════════╝  ║
║                                                                  ║
║  Provider: Metals.dev                                            ║
║  Status: ✅ Connected (Last sync: 2 hours ago)                   ║
║                                                                  ║
║  API Key: [********************************] [Show] [Clear]      ║
║  Monthly Quota: [100] requests  Used: 47 (47%)                  ║
║                                                                  ║
║  Select Metals to Sync:                                          ║
║  ☑ Silver   ☑ Gold   ☑ Platinum   ☑ Palladium                  ║
║                                                                  ║
║  History Days: [30] days  Specific Times: [HH:MM +]             ║
║  Cache Duration: [24] hours                                      ║
║                                                                  ║
║  Batch Requests: ✅ Supported (4 metals = 1 API call)            ║
║  Estimated Usage: 1 call (99 remaining this month)               ║
║                                                                  ║
║  [Test Connection]  [Set as Default]  [View API History]        ║
║  [Cancel]                                     [Save Settings]    ║
╚══════════════════════════════════════════════════════════════════╝
```

### 3. Details Modal (Breakdown Charts)
```
╔══════════════════════════════════════════════════════════════════╗
║  Portfolio Breakdown                                       [✖]   ║
╠══════════════════════════════════════════════════════════════════╣
║  ┌────────────────────────┬────────────────────────────────────┐ ║
║  │  BY TYPE               │  BY STORAGE LOCATION               │ ║
║  │                        │                                    │ ║
║  │      ╱──╲              │       ╱──╲                         │ ║
║  │    ╱      ╲            │     ╱      ╲                       │ ║
║  │   │  PIE   │           │    │  PIE   │                      │ ║
║  │    ╲      ╱            │     ╲      ╱                       │ ║
║  │      ╲──╱              │       ╲──╱                         │ ║
║  │                        │                                    │ ║
║  │  ■ Coins: 45 ($15K)    │  ■ Safe: 30 ($20K)                 │ ║
║  │  ■ Bars:  15 ($15K)    │  ■ Bank: 20 ($10K)                 │ ║
║  │  ■ Rounds: 2 ($3K)     │  ■ Other: 12 ($3K)                 │ ║
║  └────────────────────────┴────────────────────────────────────┘ ║
║                                                                  ║
║  Total Portfolio Value: $32,900                                  ║
║  Total Cost Basis: $31,600                                       ║
║  Total Profit/Loss: +$1,300 (+4.1%)                              ║
║                                                                  ║
║  [Export PDF]  [Export CSV]                         [Close]      ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Component Inventory

### Header Components
| Component | ID | Type | Purpose | Events |
|-----------|-----|------|---------|--------|
| App Logo | appLogo | SVG | Branding & identity | click → refresh page |
| New Item Button | newItemBtn | Button | Open add modal | click → openModal('addModal') |
| Appearance Button | appearanceBtn | Button | Cycle theme | click → toggleTheme() |
| API Button | apiBtn | Button | Open API settings | click → showApiModal() |
| Files Button | filesBtn | Button | Import/export hub | click → showFilesModal() |
| About Button | aboutBtn | Button | App information | click → showAboutModal() |

### Search & Filter Bar
| Component | ID | Type | Purpose | Events |
|-----------|-----|------|---------|--------|
| Search Input | searchInput | Text Input | Filter inventory | input → debounce(300ms) → filterInventory() |
| Clear Button | clearBtn | Button | Clear all filters | click → clearFilters() |
| Bulk Edit Dropdown | bulkEditDropdown | Select | Bulk operations | change → performBulkAction() |

### Main Table
| Component | ID | Type | Purpose | Events |
|-----------|-----|------|---------|--------|
| Inventory Table | inventoryTable | Table | Display items | - |
| Table Headers | th (dynamic) | TH | Column headers | click → toggleSort(column) |
| Resize Handles | resize-handle | Div | Column resizing | mousedown → startResize() |
| Edit Buttons | (dynamic) | Button | Edit item | click → editItem(index) |
| Delete Buttons | (dynamic) | Button | Delete item | click → deleteItem(index) |
| Notes Buttons | (dynamic) | Button | Edit notes | click → showNotes(index) |
| Collectable Toggles | (dynamic) | Checkbox | Mark collectable | change → toggleCollectable(index) |

### Pagination Controls
| Component | ID | Type | Purpose | Events |
|-----------|-----|------|---------|--------|
| Previous Button | prevPage | Button | Previous page | click → goToPage(currentPage - 1) |
| Next Button | nextPage | Button | Next page | click → goToPage(currentPage + 1) |
| Page Numbers | pageNumbers | Div | Page selector | click → goToPage(n) |
| Items Per Page | itemsPerPageSelect | Select | Change page size | change → updateItemsPerPage() |

### Summary Totals (Per Metal + All)
Each metal has 8 display elements:
- `totalItems{Metal}` - Item count
- `totalWeight{Metal}` - Total weight
- `currentValue{Metal}` - Current market value
- `totalPurchased{Metal}` - Purchase cost
- `totalPremium{Metal}` - Total premium paid
- `lossProfit{Metal}` - Profit/loss
- `avgPrice{Metal}` - Avg price/oz
- `avgPremium{Metal}` - Avg premium/oz

### Spot Price Controls (Per Metal)
Each metal has 5 components:
- `spotPriceDisplay{Metal}` - Display current price
- `userSpotPrice{Metal}` - Manual input field
- `saveSpotBtn{Metal}` - Save manual price
- `syncBtn{Metal}` - Sync from API
- `historyBtn{Metal}` - View price history

### Footer Components
| Component | ID | Type | Purpose | Events |
|-----------|-----|------|---------|--------|
| Version Display | versionDisplay | Span | Show app version | - |
| Storage Stats | storageStats | Span | Show usage | click → openStorageReport() |
| Change Log Link | changeLogBtn | Link | View history | click → showChangeLog() |
| Backup Reminder | backupReminder | Link | Backup prompt | click → showFilesModal() |
| Storage Report | storageReportLink | Link | Detailed report | click → downloadStorageReport() |

---

## Modal Component Map

### Modal Structure Template
```
╔══════════════════════════════════════════════════════════════════╗
║  [Modal Title]                                             [✖]   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  [Modal Content Area]                                            ║
║                                                                  ║
║  [Cancel/Secondary Action]              [Primary Action Button] ║
╚══════════════════════════════════════════════════════════════════╝
```

### All 15 Modals

1. **addModal** - Add new inventory item (12 fields, validation)
2. **editModal** - Edit existing item (12 fields + serial, pre-populated)
3. **notesModal** - Edit item notes (textarea, auto-save)
4. **detailsModal** - Value breakdowns (2 pie charts, export options)
5. **aboutModal** - App info (version, credits, links)
6. **ackModal** - First-run disclaimer (accept/decline)
7. **apiModal** - API provider selection (4 providers, tabs)
8. **apiInfoModal** - Provider documentation (links, rate limits)
9. **apiHistoryModal** - API call history (sortable table, filters)
10. **apiProvidersModal** - Provider management (config per provider)
11. **apiQuotaModal** - Monthly quota settings (input, save)
12. **filesModal** - Import/export hub (CSV, JSON, PDF, ZIP)
13. **cloudSyncModal** - Cloud backup (future feature, placeholder)
14. **changeLogModal** - Edit history (sortable, filterable, undo)
15. **storageReportModal** - localStorage analytics (charts, details)

---

## Responsive Behavior

### Desktop (>1024px)
- All 15 table columns visible
- Side-by-side totals (5 columns: Silver, Gold, Platinum, Palladium, ALL)
- Full-width modals (800px)
- Resize handles enabled

### Tablet (768px - 1024px)
- 10 visible columns (hide: Notes, Storage Location, Composition, Collectable, N#)
- Stacked totals (2 rows: 3 metals + ALL, then aggregates)
- Medium modals (700px)
- Resize handles enabled

### Mobile (<768px)
- 6 visible columns (Date, Metal, Name, Price, Spot, Actions)
- Stacked totals (vertical cards per metal)
- Full-screen modals
- Resize handles disabled
- Touch-optimized buttons

---

## Color-Coded Elements

### Metal Colors
- **Silver:** `#C0C0C0` (silver)
- **Gold:** `#FFD700` (gold)
- **Platinum:** `#E5E4E2` (platinum)
- **Palladium:** `#CED0DD` (grayish)

### Status Colors
- **Profit:** `#22c55e` (green)
- **Loss:** `#ef4444` (red)
- **Neutral:** `#6b7280` (gray)
- **Warning:** `#f59e0b` (amber)
- **Info:** `#3b82f6` (blue)

### Theme Colors
| Theme | Background | Text | Accent |
|-------|------------|------|--------|
| Light | `#ffffff` | `#1f2937` | `#3b82f6` |
| Dark | `#1f2937` | `#f9fafb` | `#60a5fa` |
| Sepia | `#f5f1e8` | `#3e2723` | `#8d6e63` |
| System | OS-dependent | OS-dependent | OS-dependent |

---

## Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| `Ctrl+N` | New item | Global |
| `Ctrl+F` | Focus search | Global |
| `Escape` | Close modal | Any modal open |
| `Enter` | Submit form | Form focused |
| `Ctrl+S` | Save (export) | Files modal |
| `Ctrl+E` | Edit first item | Table focused |
| `↑` / `↓` | Navigate rows | Table focused |
| `Ctrl+T` | Toggle theme | Global |

---

## Accessibility Features

### Screen Reader Support
- ARIA labels on all interactive elements
- Role attributes on custom components
- Live regions for dynamic updates
- Descriptive alt text on images

### Keyboard Navigation
- Tab order follows logical flow
- Focus indicators on all interactive elements
- Skip navigation links
- Keyboard-accessible modals

### Visual Accessibility
- WCAG 2.1 AA contrast ratios
- Resizable text (up to 200%)
- High contrast mode support
- No color-only information

---

**Document Status:** ✅ Complete
**Next Review:** As needed for UI changes

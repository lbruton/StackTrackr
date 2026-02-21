# StakTrakr UI Map (Discovery 2026-02-20)

This document maps the UI elements and functionalities discovered during the initial testing setup.

## Main View (No API Keys Required)

### Header
- **Theme Button** (`#headerThemeBtn`): Cycles between Light, Dark, Sepia, and System themes.
- **Currency Button** (`#headerCurrencyBtn`): Toggles display currency.
- **Trend Button** (`#headerTrendBtn`): Changes the period for sparklines (1d, 7d, 30d, 90d, 1Y, 3Y).
- **Sync Button** (`#headerSyncBtn`): Manually syncs all spot prices.
- **About Button** (`#aboutBtn`): Opens the information modal.
- **Settings Button** (`#settingsBtn`): Opens the comprehensive settings sidebar.

### Spot Prices

- Cards for **Silver, Gold, Platinum, Palladium**.
- Displays current price, 24h change, and sparkline.
- **Shift+Click** on a price allows manual override.

### Totals/Analytics

- Carousel of summary cards showing items, weight, value, and gain/loss per metal.
- Detail modals with charts (Type breakdown, Location breakdown).

### Inventory Controls
- **Add Item** (`#newItemBtn`): Opens form to add new items.
- **Search Bar** (`#searchInput`): Real-time filtering.
- **Change Log** (`#changeLogBtn`): Activity history.
- **Filter Chips**: Group items by metal, type, name, etc.
- **View Toggles**:
  - Sparkline cards (A)
  - Hero cards (B)
  - Split cards (C)
  - Table view (D - `#inventoryTable`)

## Settings Sections

### 1. Appearance
- Theme selection, UI toggles (Sparklines, Totals, Search, Table).
- Header button visibility.

### 2. Inventory
- **Bulk Editor**: Batch operations on items.
- **Import/Export**:
  - CSV (Import/Merge/Export)
  - JSON (Import/Merge/Export)
  - PDF (Export)
  - ZIP (Backup/Restore - includes images)
  - **Encrypted Vault**: AES-GCM encrypted backup (`.stvault`).

### 3. API (Requires Keys)
- **Numista**: Catalog integration.
- **PCGS**: Certificate verification.
- **Price Providers**: Metals.dev, Metals-API, MetalPriceAPI, Custom.

### 4. Cloud (Requires Keys)
- **Dropbox**: Auto-sync and remote backups.

### 5. Storage
- Usage stats for LocalStorage and IndexedDB.
- **Wipe All Data** (`#boatingAccidentBtn`): Nuclear reset.

### 6. Others
- Search configuration, Filters, Image settings, Multi-currency, Goldback, Market pricing.

## Functionalities without API Keys
- Full local inventory management (CRUD).
- Valuation based on current (cached) or manual spot prices.
- Unit conversions (oz, g, gb).
- All export/import types (CSV, JSON, ZIP, Vault).
- Theme and display preferences.
- Search and filtering.

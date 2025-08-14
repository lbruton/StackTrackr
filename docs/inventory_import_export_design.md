# StackTrackr Inventory Import/Export & Calculation Design

## Overview
This document details the logic and design for inventory import/export, field mapping, sanitization, and financial calculations (including melt value, premiums, and loss/profit) in StackTrackr. It is intended to prevent future confusion and ensure agents can quickly understand and maintain the system.

---

## Import Logic

### Field Mapping
- The import function (`importCsv`) supports flexible mapping for all major fields:
  - Metal: `Metal`, `metal`, `Composition`, `composition`, `Alloy`, `alloy`
  - Name: `Name`, `name`, `Title`, `title`, `Item`, `item`
  - Qty: `Qty`, `qty`, `Quantity`, `quantity`, `Amount`, `amount`
  - Type: `Type`, `type`, `Category`, `category`, `Kind`, `kind`
  - Weight: `Weight(oz)`, `Weight(ozt)`, `Weight(g)`, `Weight`, `weight`, `weight_g`, `weight_ozt`, `Grams`, `grams`, `Ounces`, `ounces`
  - Price: `Purchase Price`, `purchasePrice`, `price`, `Cost`, `cost`, `Amount Paid`, `amountPaid`
  - Purchase Location: `Purchase Location`, `purchaseLocation`, `Vendor`, `vendor`, `Source`, `source`
  - Storage Location: `Storage Location`, `storageLocation`, `Location`, `location`
  - Notes: `Notes`, `notes`, `Comment`, `comment`, `Description`, `description`
  - Date: `Date`, `date`, `Acquired`, `acquired`, `Purchase Date`, `purchaseDate`
  - Collectable: `Collectable`, `collectable`, `isCollectable`, `Collectible`, `collectible`

### Weight Conversion
- If weight is in grams, it is converted to troy ounces using:
  - `gramsToOzt(grams) = grams / 31.1034768`
- All calculations are performed in troy ounces.

### Sanitization
- URLs, fractions, and special characters in names and locations are preserved.
- Numeric fields are parsed and default to 0 if invalid.
- Empty fields default to empty strings.
- No valid CSV field should be stripped or altered in a way that breaks calculations.

### Duplicate Detection
- Duplicates are detected using a combination of `serial`, `name`, and `date`.
- Numista N# is not used alone to avoid false positives.

---

## Calculation Logic

### Melt Value (Current Spot Value)
- **Includes all items** (collectable and non-collectable).
- Calculated as: `currentSpotValue += spotPrice * (qty * weight)`

### Premiums & Loss/Profit
- **Only non-collectable items** are included.
- Premium per oz: `premiumPerOz = (price / weight) - spotPriceAtPurchase`
- Total premium: `totalPremium += premiumPerOz * (qty * weight)`
- Loss/Profit: `lossProfit += (spotPrice * (qty * weight)) - (price * qty)`

### Averages
- Overall average price per oz includes all items.
- Separate averages for collectable and non-collectable items.

---

## UI Display
- All summary totals (items, weight, purchase price, melt value) include all items.
- Premium and loss/profit only show non-collectable items.
- Averages are split for collectable/non-collectable.

---

## Common Pitfalls
- Do not exclude collectables from melt value.
- Always convert grams to troy ounces before calculations.
- Ensure duplicate detection uses serial+name+date, not Numista N# alone.
- Preserve URLs and fractions in sanitization.

---

## Recent Fixes (2025-08-14)
- Melt value now includes all items, matching legacy behavior.
- Import logic supports all major field name variations and weight units.
- Sanitization preserves all valid characters.
- Duplicate detection improved.

---

## References
- See `js/inventory.js` for import and calculation logic.
- See `js/utils.js` for sanitization and conversion functions.
- See `/agents/critical_objects_reference.md` for critical object documentation.

---

## For Future Agents
If you need to update import/export or calculations:
- Reference this document first.
- Validate changes against both collectable and non-collectable items.
- Test with CSVs containing grams, ounces, URLs, fractions, and edge cases.
- Confirm summary numbers match legacy results for identical data.

# Numista Price Parsing Documentation

## Overview
The Numista CSV import uses advanced price parsing to handle the complex variety of price formats found in Numista exports.

## Supported Price Formats

### 1. Single Prices
- `$25.00` → $25.00
- `€15.50` → €15.50 (converted to USD)
- `£12.75` → £12.75 (converted to USD)
- `25.00` → $25.00 (assumes USD if no currency symbol)

### 2. Price Ranges
- `$15.00 - $25.00` → Uses average: $20.00
- `€10 - €30` → Uses average: €20.00 (converted to USD)
- `15-25` → Uses average: $20.00

### 3. No Price Indicators
- `N/A` → $0.00
- `Unknown` → $0.00
- `—` or `-` → $0.00
- Empty fields → $0.00
- `...` → $0.00

### 4. Complex Formats
- `Est. $20-30` → Average: $25.00
- `Buying: €15, Selling: €25` → Uses first price: €15.00
- `Price paid: $45.50` → $45.50

## Field Priority Order

The parser searches for prices in this order:

1. **Buying price** - Most relevant for tracking purchases
2. **Purchase price** - Alternative purchase field
3. **Price paid** - Direct purchase amount
4. **Cost** - General cost field
5. **Estimate** - Estimated value
6. **Est. price** - Alternative estimate field
7. **Value** - General value field
8. **Price** - Generic price field
9. **Current price** - Current market value
10. **Market price** - Market value

## Currency Support

### Currently Supported
- **USD ($)** - Primary currency, no conversion needed
- **EUR (€)** - European Euro (conversion planned)
- **GBP (£)** - British Pound (conversion planned)
- **JPY (¥)** - Japanese Yen (conversion planned)

### Future Enhancements
- Real-time currency conversion rates
- Historical exchange rates for purchase dates
- Additional currency symbols
- Custom conversion rate overrides

## Technical Implementation

### Main Functions
- `parseNumistaPrice(row, profile)` - Main price parsing entry point
- `parseComplexPrice(priceStr)` - Handles individual price strings
- `detectCurrency(value)` - Identifies currency from string
- `convertToUsd(amount, currency)` - Currency conversion (future)

### Field Mapping Integration
The price parser integrates with the extensible field mapping system:

```javascript
const FIELD_MAPPING_PROFILES = {
  numista: {
    mappings: {
      price: ['Buying price', 'Purchase price', 'Price paid', 'Cost']
      // ... other fields
    }
  }
}
```

### Debug Output
The parser provides console logging for price parsing:
```
💰 Price found in "Buying price": €15.00 - €25.00 → $20.00
💰 Price found in "Estimate": Est. $30-40 → $35.00
```

## Error Handling

### Graceful Degradation
- Invalid formats default to $0.00
- Missing fields are skipped gracefully
- Malformed numbers are ignored
- Currency detection has fallback to USD

### Validation
- Negative prices are allowed (for tracking purposes)
- Zero prices are valid (free items, gifts)
- Very large prices are accepted (rare collectibles)

## Future Expansions

### Translation Profile Integration
When the translation profile modal is implemented, users will be able to:
- Map custom price fields with regex patterns
- Set currency conversion preferences
- Define price parsing rules per import source
- Save custom parsing profiles

### Example Future Profile
```javascript
customProfile: {
  name: "My Auction Site",
  mappings: {
    price: [/final.*price/i, /hammer.*price/i, "Sale Price"]
  },
  priceRules: {
    currency: "EUR",
    useAverage: true,
    excludeShipping: true
  }
}
```

## Troubleshooting

### Common Issues
1. **Prices showing as $0.00**
   - Check console for price parsing debug messages
   - Verify price field names match expected formats
   - Check for unrecognized currency symbols

2. **Incorrect price values**
   - May be using average of range instead of specific value
   - Currency conversion not yet implemented
   - Field priority may be selecting wrong price type

3. **Import rejecting items**
   - Price validation is very lenient
   - Issue likely in weight or name validation instead
   - Check import results modal for specific rejection reasons

### Debug Commands
```javascript
// Test price parsing manually
parseComplexPrice("€15.00 - €25.00")
// → {amount: 20, currency: "EUR", notes: "Range 15-25 EUR, using average"}

// Check field mapping
extractFieldsUsingProfile(csvRow, FIELD_MAPPING_PROFILES.numista)
```
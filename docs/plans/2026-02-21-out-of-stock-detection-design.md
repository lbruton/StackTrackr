# Out-of-Stock Detection and UI Degradation Design

**Date:** 2026-02-21
**Status:** Approved
**Author:** Claude Sonnet 4.5

---

## Problem Statement

When a tracked coin goes out of stock at a vendor, the retail price scraper currently:
1. Either fails to extract a price (returns null) and shows nothing, OR
2. Extracts a related product price (e.g., 1/2 oz when expecting 1 oz) and displays incorrect data

**Example case (2026-02-21):**
- Bullion Exchanges: 1 oz Platinum American Eagle out of stock
- Scraper found 1/2 oz related product at $1,240.19
- Displayed in UI with 15% confidence (red badge) — system knew it was wrong but still showed it

**User requirement:**
- Detect out-of-stock status explicitly
- Show last known price in grayed-out strikethrough format
- Indicate "Out of stock" clearly
- Preserve historical price continuity (no gaps in charts)

---

## Architecture Overview

**Approach:** Dual detection (Firecrawl + Gemini Vision) with consensus logic

**Data flow:**
1. **Firecrawl** scans markdown for OOS text patterns + fractional weight mismatches
2. **Gemini Vision** analyzes screenshot for visual stock indicators + weight verification
3. **Consensus:** Both must agree, or trust Vision on disagreement
4. **Database:** Write `price: null, in_stock: 0` rows every 15 minutes while OOS
5. **API:** Export availability status + last known price for frontend fallback
6. **Frontend:** Render grayed-out strikethrough price with "Out of stock" label

---

## Component 1: Database Schema

### Schema Change

Add `in_stock` column to `price_snapshots` table:

```sql
ALTER TABLE price_snapshots ADD COLUMN in_stock INTEGER DEFAULT 1;
```

**Column type:** INTEGER (SQLite boolean: 0 = false, 1 = true)
**Default:** 1 (backwards compatible — existing rows assumed in stock)

### Row Structure

**In stock:**
```json
{
  "coin_slug": "ape",
  "vendor": "bullionexchanges",
  "price": 2472.87,
  "in_stock": 1,
  "confidence": 80,
  "scraped_at": "2026-02-21T10:00:00Z"
}
```

**Out of stock:**
```json
{
  "coin_slug": "ape",
  "vendor": "bullionexchanges",
  "price": null,
  "in_stock": 0,
  "confidence": null,
  "scraped_at": "2026-02-21T14:00:00Z"
}
```

**Key decisions:**
- `price` is `null` when OOS (not a sentinel string value)
- `confidence` is also `null` (no price to score)
- Continue writing rows every 15 minutes even when OOS (preserves timeline)
- JSONL disaster recovery log also gets `in_stock` field

### Migration Strategy

- Existing rows default `in_stock = 1` (assume in stock)
- No backfill needed — forward-only enhancement
- Old code reading new DB ignores `in_stock` column (graceful degradation)

---

## Component 2: Backend Detection Logic

### Firecrawl Stock Detection (price-extract.js)

**Add `detectStockStatus(markdown, expectedWeightOz)` function:**

**Text patterns:**
```javascript
const OUT_OF_STOCK_PATTERNS = [
  /out of stock/i,
  /sold out/i,
  /currently unavailable/i,
  /notify me when available/i,
  /email when in stock/i,
  /temporarily out of stock/i,
  /back ?order/i,
  /pre-?order/i,
];
```

**Fractional weight detection:**
```javascript
// If expecting "1 oz" but markdown shows "1/2 oz" or "1/4 oz"
// in product title → mark as out-of-stock
// (user doesn't want to track fractional products)
```

**Return value:**
```javascript
{
  inStock: false,
  reason: "out_of_stock",  // or "fractional_weight" or "in_stock"
  detectedText: "Out Of Stock"
}
```

### Gemini Vision Stock Detection (extract-vision.js)

**Add to Vision prompt:**

```
**STOCK STATUS CHECK:**
- Is this product currently in stock?
- Look for: "Out of Stock" badges, "Notify Me" buttons, disabled "Add to Cart"
- Check product title: does it match the expected weight (${weightOz} troy oz)?
  If you see "1/2 oz" or "1/4 oz" when expecting 1 oz, mark as out of stock
```

**JSON response includes:**
```json
{
  "price": 2472.87,
  "confidence": "high",
  "in_stock": true,
  "stock_label": "Add to Cart button enabled, no out-of-stock indicators"
}
```

### Consensus Logic

When merging Firecrawl + Vision results:

| Firecrawl | Vision | Result | Rationale |
|-----------|--------|--------|-----------|
| In stock | In stock | `in_stock: true` | Both agree |
| Out of stock | Out of stock | `in_stock: false, price: null` | Both agree |
| In stock | Out of stock | `in_stock: false, price: null` | Trust Vision (sees actual page state) |
| Out of stock | In stock | `in_stock: false, price: null` | Trust Vision (more reliable) |
| In stock | Vision unavailable | `in_stock: true` | Graceful degradation to Firecrawl-only |
| Out of stock | Vision unavailable | `in_stock: false, price: null` | Graceful degradation to Firecrawl-only |

**Why trust Vision on disagreement:**
- Vision sees rendered page (JavaScript-loaded content, CSS-hidden elements)
- Firecrawl markdown may be stale or incomplete
- Vision can detect visual-only stock indicators (disabled buttons, CSS overlays)

---

## Component 3: API Export Structure

### Add Availability Fields to API JSON

**`data/api/{slug}/latest.json` structure:**

```json
{
  "coin": "ape",
  "date": "2026-02-21",
  "generated_at_utc": "2026-02-21T14:15:00Z",
  "currency": "USD",

  "prices_by_site": {
    "bullionexchanges": null,
    "monumentmetals": 5355.32,
    "herobullion": 5361.89,
    "sdbullion": 5405.09
  },

  "availability_by_site": {
    "bullionexchanges": false,
    "monumentmetals": true,
    "herobullion": true,
    "sdbullion": true
  },

  "last_known_price_by_site": {
    "bullionexchanges": 2472.87
  },

  "last_available_date_by_site": {
    "bullionexchanges": "2026-02-21"
  },

  "confidence_by_site": {
    "bullionexchanges": null,
    "monumentmetals": 99,
    "herobullion": 80,
    "sdbullion": 80
  },

  "source_count": 3,
  "average_price": 5374.10,
  "median_price": 5361.89
}
```

**Field descriptions:**

- **`prices_by_site[vendor]`**: `null` when out of stock
- **`availability_by_site[vendor]`**: `false` when out of stock (NEW)
- **`last_known_price_by_site[vendor]`**: Most recent in-stock price (NEW, for frontend fallback)
- **`last_available_date_by_site[vendor]`**: Date when it went OOS (NEW, for staleness display)
- **`confidence_by_site[vendor]`**: `null` when out of stock (no price to score)
- **`source_count`**: Excludes out-of-stock vendors
- **`average_price`**: Computed only from in-stock vendors
- **`median_price`**: Computed only from in-stock vendors

### Lookup Query for Last Known Price

```sql
SELECT price, date(scraped_at) as date
FROM price_snapshots
WHERE coin_slug = ?
  AND vendor = ?
  AND in_stock = 1
  AND price IS NOT NULL
ORDER BY scraped_at DESC
LIMIT 1
```

**Behavior:**
- Returns most recent in-stock price + date
- Used by frontend to show "Out of stock (last: $X on DATE)"
- Returns `null` if vendor never had an in-stock price for this coin

---

## Component 4: Frontend UI Treatment

### Retail Price Card Rendering (js/retail.js)

**When `availability_by_site[vendor] === false`:**

**HTML structure:**
```html
<!-- Out-of-stock rendering -->
<div class="retail-vendor retail-vendor--out-of-stock"
     title="Out of stock (last seen: $2472.87 on Feb 21)">
  <span class="vendor-name text-muted">BullionX</span>
  <span class="vendor-price text-muted">
    <del>$2472.87</del>
    <small class="text-danger ms-1">Out of stock</small>
  </span>
  <span class="confidence-badge badge-muted">—</span>
</div>
```

**CSS additions:**
```css
.retail-vendor--out-of-stock {
  opacity: 0.6;
  background-color: var(--bs-gray-100);
}

.retail-vendor--out-of-stock .vendor-price {
  text-decoration: line-through;
}
```

**Visual treatment:**
1. Price shown is `last_known_price_by_site[vendor]`
2. Strikethrough on price
3. "Out of stock" label in red
4. No confidence badge (show "—" placeholder)
5. Grayed out (60% opacity)
6. Light gray background
7. Tooltip shows last available date

**Summary statistics behavior:**
- Exclude OOS vendors from "Lowest" and "Average" calculations
- Show in-stock vendor count: "4 of 7 vendors in stock"

### Price History Chart (retail-view-modal.js)

**Chart.js dataset configuration:**
```javascript
{
  label: "BullionX",
  data: [
    { x: "2026-02-20", y: 2472.87 },
    { x: "2026-02-21", y: null },  // Gap for OOS
    { x: "2026-02-22", y: null },
  ],
  borderDash: [5, 5],  // Dashed line during OOS periods
  spanGaps: false,     // Don't connect across null values
}
```

**Behavior:**
- Show historical prices up to out-of-stock date
- Gap (no line) for OOS period
- Resume solid line when back in stock
- Tooltip on last in-stock point: "Last available: $2472.87 (Feb 21)"

---

## Error Handling

### False Positive Prevention

**Scenario:** Page layout change causes Firecrawl to misread stock status

**Mitigation:**
- Require Vision confirmation before marking OOS
- If Vision says "in stock" but Firecrawl says "out of stock" → trust Vision
- Log disagreements for manual review

### Missing Vision Data

**Scenario:** Vision extraction fails (API error, screenshot timeout, etc.)

**Fallback:**
- Use Firecrawl-only detection
- Mark with lower confidence if available
- Continue scraping on next cycle (Vision may recover)

### Fractional Weight False Negatives

**Scenario:** Related product has same weight (e.g., different year, proof vs bullion)

**Mitigation:**
- Vision prompt checks product title/description for exact match
- If title shows "2008 W 1/2 oz" when expecting "1 oz (Random Year)" → reject
- Confidence scoring flags mismatches (existing system already does this)

---

## Testing Strategy

### Unit Tests

1. **Firecrawl stock detection:**
   - Test all OOS text patterns
   - Test fractional weight detection (1/2 oz, 1/4 oz, 1/10 oz)
   - Test false positives ("stock up on...", "in stock")

2. **Vision response parsing:**
   - Test `in_stock` field extraction from JSON
   - Test weight mismatch detection in Vision responses

3. **Consensus logic:**
   - Test all 6 scenarios in truth table
   - Test Vision unavailable fallback

### Integration Tests

1. **Full pipeline test:**
   - Mock Firecrawl markdown with "Out Of Stock" text
   - Mock Vision screenshot with red OOS badge
   - Verify SQLite writes `in_stock: 0, price: null`
   - Verify API export includes `availability_by_site: {vendor: false}`

2. **Frontend rendering:**
   - Load API JSON with OOS vendor
   - Verify strikethrough price display
   - Verify "Out of stock" label
   - Verify tooltip shows last available date

### Manual QA

1. **Real-world OOS test:**
   - Wait for Bullion Exchanges Platinum Eagle to be back in stock
   - Verify scraper detects in-stock status
   - Verify UI removes strikethrough and shows live price

2. **Chart visualization:**
   - Check retail view modal chart for OOS coin
   - Verify gap in timeline during OOS period
   - Verify tooltip shows correct last available date

---

## Rollout Plan

### Phase 1: Database Migration
- Add `in_stock` column to `price_snapshots` table
- Update `db.js` to include `in_stock` in writes
- Deploy container update

### Phase 2: Backend Detection
- Implement Firecrawl stock detection in `price-extract.js`
- Implement Vision stock detection in `extract-vision.js`
- Implement consensus logic in `price-extract.js`
- Update `api-export.js` to generate availability fields
- Test with manual scrape run

### Phase 3: Frontend Rendering
- Update `js/retail.js` to detect `availability_by_site[vendor] === false`
- Implement strikethrough rendering
- Add CSS for grayed-out OOS vendors
- Update `retail-view-modal.js` chart to show gaps

### Phase 4: Monitoring
- Watch logs for OOS detections
- Verify UI displays correctly on live site
- Check for false positives (vendors incorrectly marked OOS)

---

## Success Metrics

1. **Detection accuracy:** >95% true positive rate (OOS detected when truly OOS)
2. **False positive rate:** <5% (in-stock items incorrectly marked OOS)
3. **UI clarity:** User feedback confirms strikethrough + "Out of stock" is understandable
4. **Data continuity:** Charts show seamless timeline with gaps during OOS periods

---

## Future Enhancements (Out of Scope)

1. **Restock alerts:** Email/push notification when OOS item comes back in stock
2. **OOS duration tracking:** Show "Out of stock for 3 days" in UI
3. **Vendor reliability scoring:** Downrank vendors with frequent/long OOS periods
4. **Smart substitution:** Suggest similar in-stock products when preferred vendor is OOS
5. **Historical OOS analysis:** "This vendor is OOS 15% of the time" stat

---

## Related Work

- **Vendor-specific Vision hints** (2026-02-21 commit 7fd793f): Guides Gemini to correct price location per vendor
- **Monument Metals table-first fix** (2026-02-21 commit 1c03260): Removed from `USES_AS_LOW_AS` set
- **JSONL disaster recovery logging** (2026-02-21 commit ac5beb3): Append-only price log for SQLite recovery

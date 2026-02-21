# Out-of-Stock Detection Integration Test Checklist

**Date:** 2026-02-21
**Feature:** Out-of-stock detection and UI degradation
**Related Docs:**
- Design: `docs/plans/2026-02-21-out-of-stock-detection-design.md`
- Plan: `docs/plans/2026-02-21-out-of-stock-detection.md`

---

## Code Verification ✅

### Database Layer (devops/retail-poller/db.js)

- ✅ Schema includes `in_stock INTEGER NOT NULL DEFAULT 1` (line 45)
- ✅ Composite index `idx_coin_vendor_stock` created (line 53)
- ✅ `writeSnapshot()` accepts `row.inStock` parameter (line 126)
- ✅ SQL INSERT includes `in_stock` column (line 131)
- ✅ `appendPriceLog()` writes `in_stock` to JSONL (line 105)
- ✅ `readDailyAggregates()` includes `MAX(in_stock) AS in_stock` in SQL

### Firecrawl Detection (devops/retail-poller/price-extract.js)

- ✅ `OUT_OF_STOCK_PATTERNS` constant with 9 regex patterns
- ✅ `detectStockStatus()` function checks text patterns
- ✅ Fractional weight detection (1/2 oz, 1/4 oz, 1/10 oz)
- ✅ Returns `{inStock, reason, detectedText}`
- ✅ `scrapePrice()` returns extended structure with stock status

### Vision Detection (devops/retail-poller/extract-vision.js)

- ✅ Vision prompt includes stock status check with weight verification
- ✅ JSON schema includes `in_stock` boolean field
- ✅ Field access uses `=== true` (not `!== false`)
- ✅ Warning logged when Vision returns price despite OOS
- ✅ `stock_label` truncated to 200 chars

### Consensus & API Export (devops/retail-poller/api-export.js)

- ✅ `getLastKnownPrice()` helper queries most recent in-stock price
- ✅ Consensus logic distinguishes undefined vs explicit true/false
- ✅ Trust Vision on disagreement (lines 120-135)
- ✅ `vendorMap()` includes OOS vendors (`price: null, inStock: false`)
- ✅ API export includes:
  - `availability_by_site[vendor]`
  - `last_known_price_by_site[vendor]`
  - `last_available_date_by_site[vendor]`
- ✅ Summary statistics exclude OOS vendors
- ✅ Historical data includes `inStock` boolean per vendor per date

### Frontend Constants (js/constants.js)

- ✅ `RETAIL_AVAILABILITY_KEY` added to `ALLOWED_STORAGE_KEYS`
- ✅ Key exported to window global

### Frontend Rendering (js/retail.js)

- ✅ `retailAvailability` global object
- ✅ `retailLastKnownPrices` global object
- ✅ `retailLastAvailableDates` global object
- ✅ `loadRetailAvailability()` loads from localStorage
- ✅ `saveRetailAvailability()` saves structured data with date
- ✅ `_buildOOSVendorRow()` creates DOM elements (no innerHTML)
- ✅ CSS class `.retail-vendor-row--out-of-stock` applied
- ✅ Strikethrough via `<del>` element
- ✅ "OOS" label in red
- ✅ Tooltip shows last seen price + date

### Frontend Styling (css/styles.css)

- ✅ `.retail-vendor-row--out-of-stock` with 60% opacity + gray background
- ✅ `.retail-vendor-row--out-of-stock .vendor-price del` with line-through

### Chart Rendering (js/retail-view-modal.js)

- ✅ Database query includes `in_stock` field
- ✅ Chart data pushes `y: null` when `inStock === false`
- ✅ `spanGaps: false` in dataset config
- ✅ Tooltip callback: `if (value === null) return "Out of stock"`

---

## Manual Testing Checklist

### Prerequisites

- [ ] Local retail poller environment set up
- [ ] Docker running for Vision API
- [ ] Test coin configured in `providers.json`
- [ ] Vendor with known out-of-stock product identified

### Test 1: Database Write

**Steps:**
1. Run retail poller: `cd devops/retail-poller && npm start`
2. Wait for scrape cycle to complete
3. Query database:
   ```bash
   sqlite3 prices.db "SELECT coin_slug, vendor, price, in_stock, confidence, date(scraped_at) FROM price_snapshots ORDER BY scraped_at DESC LIMIT 10"
   ```

**Expected:**
- Rows with `in_stock = 1` for available products
- Rows with `in_stock = 0` and `price = NULL` for OOS products
- Confidence is `NULL` for OOS rows

**Result:** [ ] Pass / [ ] Fail

### Test 2: JSONL Disaster Recovery Log

**Steps:**
1. Check JSONL log file (if `PRICE_LOG_DIR` is set):
   ```bash
   tail -5 $(ls -t data/hourly/*/prices-*.jsonl | head -1)
   ```

**Expected:**
- Each line includes `"in_stock": 0` or `"in_stock": 1`
- OOS entries have `"price": null`

**Result:** [ ] Pass / [ ] Fail

### Test 3: API Export Structure

**Steps:**
1. Run API export: `cd devops/retail-poller && npm run export`
2. Inspect API JSON:
   ```bash
   cat data/api/ape/latest.json | jq '.availability_by_site, .last_known_price_by_site, .last_available_date_by_site'
   ```

**Expected:**
- `availability_by_site` contains boolean values per vendor
- `last_known_price_by_site` contains fallback prices for OOS vendors
- `last_available_date_by_site` contains dates when OOS vendors last had stock
- `prices_by_site[vendor]` is `null` when OOS
- `source_count` excludes OOS vendors
- `average_price` / `median_price` exclude OOS vendors

**Result:** [ ] Pass / [ ] Fail

### Test 4: Frontend Card Rendering

**Steps:**
1. Open StakTrakr in browser
2. Navigate to Retail Prices section
3. Trigger refresh (or load latest API data)
4. Inspect card for OOS vendor

**Expected:**
- Grayed out row (60% opacity, light gray background)
- Strikethrough price showing last known price
- Red "OOS" label
- Tooltip on hover: "Out of stock (last seen: $X on DATE)"
- No confidence badge (shows "—")

**Result:** [ ] Pass / [ ] Fail

### Test 5: Price History Chart Gaps

**Steps:**
1. Click "View Details" for a coin with OOS vendor history
2. Inspect chart in modal

**Expected:**
- Chart shows solid line up to OOS date
- Visible gap (no line) during OOS period
- Tooltip on last in-stock point: "Last available: $X (DATE)"
- Tooltip on OOS dates: "Out of stock"

**Result:** [ ] Pass / [ ] Fail

### Test 6: Consensus Logic (Firecrawl vs Vision)

**Test scenarios:**

| Firecrawl | Vision | Expected Result | Test Status |
|-----------|--------|-----------------|-------------|
| In stock | In stock | `in_stock: 1` | [ ] Pass / [ ] Fail |
| Out of stock | Out of stock | `in_stock: 0, price: null` | [ ] Pass / [ ] Fail |
| In stock | Out of stock | `in_stock: 0, price: null` (trust Vision) | [ ] Pass / [ ] Fail |
| Out of stock | In stock | `in_stock: 0, price: null` (trust Vision) | [ ] Pass / [ ] Fail |
| In stock | Vision unavailable | `in_stock: 1` (graceful degradation) | [ ] Pass / [ ] Fail |
| Out of stock | Vision unavailable | `in_stock: 0, price: null` (graceful degradation) | [ ] Pass / [ ] Fail |

**Test method:**
- Modify `price-extract.js` to force specific Firecrawl results
- Modify `extract-vision.js` to force specific Vision results
- Run scraper and verify consensus output

**Result:** [ ] All scenarios pass / [ ] Some fail (document which)

### Test 7: Fractional Weight Detection

**Steps:**
1. Configure vendor to return 1/2 oz product when expecting 1 oz
2. Run scraper
3. Verify detection

**Expected:**
- Firecrawl detects fractional mismatch
- `stockReason: "fractional_weight"`
- Database writes `in_stock: 0, price: null`

**Result:** [ ] Pass / [ ] Fail

### Test 8: Stock Status Recovery (OOS → Back in Stock)

**Steps:**
1. Verify coin is marked OOS in database/API/frontend
2. Wait for vendor to restock (or mock restock in test)
3. Run scraper again
4. Verify detection

**Expected:**
- New database row with `in_stock: 1, price: <value>`
- API updates `availability_by_site[vendor] = true`
- Frontend removes strikethrough, shows live price
- Chart resumes solid line after gap

**Result:** [ ] Pass / [ ] Fail

---

## Performance Verification

### Database Query Performance

**Test:**
```bash
sqlite3 prices.db ".timer on" "EXPLAIN QUERY PLAN SELECT price, date(scraped_at) FROM price_snapshots WHERE coin_slug = 'ape' AND vendor = 'bullionexchanges' AND in_stock = 1 AND price IS NOT NULL ORDER BY scraped_at DESC LIMIT 1"
```

**Expected:**
- Query uses `idx_coin_vendor_stock` index
- Execution time < 5ms (even with 100K+ rows)

**Result:** [ ] Pass / [ ] Fail

---

## Edge Cases & Error Handling

### Edge Case 1: No Last Known Price

**Scenario:** Vendor never had in-stock price for this coin

**Expected:**
- `last_known_price_by_site[vendor]` is absent (not included in JSON)
- Frontend shows "—" for price
- Tooltip: "Out of stock"

**Result:** [ ] Pass / [ ] Fail

### Edge Case 2: Vision API Timeout

**Scenario:** Vision extraction fails (timeout, quota, error)

**Expected:**
- Falls back to Firecrawl-only detection
- Logs warning
- Continues scraping next vendor

**Result:** [ ] Pass / [ ] Fail

### Edge Case 3: localStorage Full

**Scenario:** User's browser storage quota exceeded

**Expected:**
- `saveRetailAvailability()` catches error
- Shows alert: "Storage Error"
- Sets `window._retailStorageFailure = true`
- Does NOT crash app

**Result:** [ ] Pass / [ ] Fail

---

## Documentation

- [ ] CHANGELOG.md updated with feature summary
- [ ] Design doc marked as "Status: Implemented"
- [ ] Implementation plan marked as "Status: Complete"
- [ ] API structure documented in API docs (if applicable)

---

## Final Review

- [ ] All database writes tested
- [ ] All API exports tested
- [ ] All frontend rendering tested
- [ ] All chart visualizations tested
- [ ] All consensus scenarios tested
- [ ] All edge cases tested
- [ ] Performance verified
- [ ] Documentation complete

---

## Notes

*Use this section to document any issues found, workarounds applied, or deviations from the design.*

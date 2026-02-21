# Out-of-Stock Detection Feature Summary

**Feature:** Retail price tracker out-of-stock detection and graceful UI degradation
**Date:** 2026-02-21
**Status:** ✅ Implemented (code complete, pending runtime testing)
**Commits:** `3d52156` → `5a128f6` (9 commits)

---

## Problem Solved

When a tracked coin goes out of stock at a vendor, the retail price scraper would either:
1. Return no price (leaving a gap in the UI), OR
2. Extract a related product price (e.g., 1/2 oz when expecting 1 oz) and display incorrect data

**Example incident (2026-02-21):**
- Bullion Exchanges: 1 oz Platinum American Eagle out of stock
- Scraper found 1/2 oz product at $1,240.19
- Displayed with 15% confidence (red badge) — system knew it was wrong but still showed it

**User requirement:**
- Detect out-of-stock status explicitly
- Show last known price in grayed-out strikethrough format
- Indicate "Out of stock" clearly
- Preserve historical price continuity (no gaps in database or charts)

---

## Solution Architecture

**Dual detection system with consensus logic:**

1. **Firecrawl** scans page markdown for OOS text patterns + fractional weight mismatches
2. **Gemini Vision** analyzes screenshot for visual stock indicators + weight verification
3. **Consensus:** Both must agree, or trust Vision on disagreement (Vision sees actual page state)
4. **Database:** Write `price: null, in_stock: 0` rows every 15 minutes while OOS (preserves timeline)
5. **API:** Export availability status + last known price for frontend fallback
6. **Frontend:** Render grayed-out strikethrough price with "Out of stock" label

---

## Implementation Details

### Backend (devops/retail-poller/)

**Database schema (db.js):**
- Added `in_stock INTEGER NOT NULL DEFAULT 1` column to `price_snapshots` table
- Added composite index `idx_coin_vendor_stock` for performance
- JSONL disaster recovery log includes `in_stock` field

**Firecrawl detection (price-extract.js):**
- 9 regex patterns: "Out of Stock", "Sold Out", "Notify Me", "Back Order", etc.
- Fractional weight detection: rejects 1/2 oz when expecting 1 oz
- Returns `{inStock, reason, detectedText}` structure

**Gemini Vision detection (extract-vision.js):**
- Updated prompt to check for OOS badges, disabled buttons, stock labels
- Verifies product weight matches expected (catches vendor substitution)
- Returns `in_stock` boolean + `stock_label` explanation

**Consensus logic (api-export.js):**
- Distinguishes Vision unavailable (undefined) vs explicit false
- Trust Vision on disagreement (sees rendered page, Firecrawl sees static markdown)
- Graceful degradation when Vision fails (uses Firecrawl-only)
- Critical bug fixes:
  - `vendorMap()` was excluding OOS vendors entirely
  - Vision defaults were overriding Firecrawl OOS signals
  - Missing database index for `getLastKnownPrice()` queries

**API export structure:**
```json
{
  "prices_by_site": { "bullionexchanges": null },
  "availability_by_site": { "bullionexchanges": false },
  "last_known_price_by_site": { "bullionexchanges": 2472.87 },
  "last_available_date_by_site": { "bullionexchanges": "2026-02-21" },
  "confidence_by_site": { "bullionexchanges": null },
  "source_count": 3,
  "average_price": 5374.10,
  "median_price": 5361.89
}
```

### Frontend (js/)

**Constants (constants.js):**
- Added `RETAIL_AVAILABILITY_KEY` to `ALLOWED_STORAGE_KEYS` whitelist

**Retail rendering (retail.js):**
- Load/save availability data to localStorage
- `_buildOOSVendorRow()` creates DOM elements (no innerHTML)
- Grayed out (60% opacity) with light gray background
- Strikethrough via `<del>` element
- Red "OOS" label
- Tooltip: "Out of stock (last seen: $X on DATE)"

**Chart rendering (retail-view-modal.js):**
- Push `y: null` for OOS dates (creates visible gap)
- Set `spanGaps: false` (don't connect across null values)
- Tooltip callback: "Out of stock" for null datapoints

**Styling (css/styles.css):**
```css
.retail-vendor-row--out-of-stock {
  opacity: 0.6;
  background-color: var(--bs-gray-100);
}

.retail-vendor-row--out-of-stock .vendor-price del {
  text-decoration: line-through;
  color: var(--bs-gray-500);
}
```

---

## Consensus Truth Table

| Firecrawl | Vision | Result | Rationale |
|-----------|--------|--------|-----------|
| In stock | In stock | ✅ In stock | Both agree |
| Out of stock | Out of stock | ❌ Out of stock | Both agree |
| In stock | Out of stock | ❌ Out of stock | Trust Vision (sees actual page) |
| Out of stock | In stock | ❌ Out of stock | Trust Vision (more reliable) |
| In stock | Vision unavailable | ✅ In stock | Graceful degradation |
| Out of stock | Vision unavailable | ❌ Out of stock | Graceful degradation |

---

## Commits

1. `3d52156` - Database schema: `in_stock` column + index
2. `2c2f0d4` - Firecrawl: OOS text patterns + fractional weight detection
3. `4ed4dc9` - Vision: OOS detection in screenshot analysis
4. `5f7fdc2` - Vision: safer field access (`=== true` not `!== false`)
5. `71cb9f4` - Consensus logic + API export (availability fields)
6. `375c23e` - Critical bug fixes (vendorMap, Vision defaults, index)
7. `c1b33c7` - Frontend: OOS card rendering with strikethrough
8. `56ef67d` - Frontend: chart gaps for OOS periods
9. `5a128f6` - Integration test checklist

---

## Testing

**Static code verification:** ✅ Complete
- All layers verified (database → API → frontend → charts)
- Security patterns followed (createElement, whitelisted storage keys)
- Error handling in place (Vision timeout, storage full)

**Runtime testing:** ⏳ Pending
- Requires retail poller environment (Docker + Gemini API)
- Comprehensive test checklist created: `docs/plans/2026-02-21-oos-integration-test-checklist.md`
- Covers: database writes, API exports, frontend rendering, chart gaps, consensus scenarios, edge cases, performance

---

## Success Metrics (Future Validation)

1. **Detection accuracy:** >95% true positive rate (OOS detected when truly OOS)
2. **False positive rate:** <5% (in-stock items incorrectly marked OOS)
3. **UI clarity:** User feedback confirms strikethrough + "OOS" is understandable
4. **Data continuity:** Charts show seamless timeline with gaps during OOS periods

---

## Future Enhancements (Out of Scope)

1. Restock alerts (email/push when OOS item comes back)
2. OOS duration tracking ("Out of stock for 3 days" in UI)
3. Vendor reliability scoring (downrank vendors with frequent OOS)
4. Smart substitution (suggest similar in-stock products)
5. Historical OOS analysis ("This vendor is OOS 15% of the time")

---

## Related Work

- Vendor-specific Vision hints (commit `7fd793f`) - Guides Gemini to correct price location per vendor
- Monument Metals table-first fix (commit `1c03260`) - Removed from `USES_AS_LOW_AS` set
- JSONL disaster recovery logging (commit `ac5beb3`) - Append-only price log for SQLite recovery

---

## Documentation

- **Design:** `docs/plans/2026-02-21-out-of-stock-detection-design.md`
- **Implementation Plan:** `docs/plans/2026-02-21-out-of-stock-detection.md`
- **Test Checklist:** `docs/plans/2026-02-21-oos-integration-test-checklist.md`
- **Feature Summary:** This document

---

## For CHANGELOG.md

```markdown
### Added
- **Out-of-stock detection:** Retail price scraper now detects when products are unavailable
  - Dual detection: Firecrawl text analysis + Gemini Vision screenshot validation
  - Consensus logic: trusts Vision on disagreement, graceful Firecrawl-only fallback
  - Database tracking: `in_stock` column preserves OOS periods in timeline
  - UI degradation: grayed-out strikethrough with "Out of stock" label
  - Price history charts: visible gaps during OOS periods
  - Last known price display: shows most recent in-stock price as fallback
  - Fractional weight detection: rejects vendor substitution (1/2 oz for 1 oz)
```

---

## For Linear Issue

**Title:** Out-of-stock detection and graceful UI degradation

**Description:**
Retail price tracker now explicitly detects and handles vendor out-of-stock status instead of showing incorrect substitute products or leaving gaps in the UI.

**What changed:**
- Dual detection system (Firecrawl + Gemini Vision) with consensus logic
- Database tracks `in_stock` status with price continuity
- API exports availability + last known prices
- Frontend shows grayed-out strikethrough with "OOS" label
- Charts display visible gaps during OOS periods

**Testing:**
Code verification complete. Runtime testing checklist created (requires poller environment).

**Commits:** `3d52156` → `5a128f6`

**Labels:** `enhancement`, `retail-prices`, `ai-vision`, `frontend`

---

## For PR Description

**Summary:**
Implements comprehensive out-of-stock detection for the retail price scraper, solving the problem where OOS products would either show incorrect substitute prices or leave gaps in the UI.

**Architecture:**
Dual detection (Firecrawl text patterns + Gemini Vision screenshot analysis) with consensus logic. Database preserves OOS timeline, API exports availability status, frontend renders strikethrough UI with last known prices.

**Changes:**
- Backend: Database schema, OOS detection in both Firecrawl and Vision, consensus logic, API export
- Frontend: OOS card rendering, chart gap visualization, localStorage availability tracking
- Critical fixes: vendorMap exclusion, Vision default handling, performance index

**Testing:**
Static code verification complete. Comprehensive runtime test checklist created.

**Commits:** 9 commits from `3d52156` to `5a128f6`

**Reviewers:** Look for:
1. Consensus logic correctness (6 scenarios in truth table)
2. Security patterns (createElement, storage whitelist)
3. Error handling (Vision timeout, storage full)
4. Performance (database index usage)

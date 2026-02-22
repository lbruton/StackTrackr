# 3.32.0 Pre-Launch Checklist: OOS Detection

**Target Launch:** 2026-02-22 (tomorrow)
**Feature:** Out-of-stock detection with dual consensus (Firecrawl + Vision)
**Status:** ✅ Vision API enabled, ⏳ Waiting for 12:45 scrape to validate

---

## ✅ Completed (2026-02-21)

### Backend Implementation
- [x] Database schema: `in_stock INTEGER NOT NULL DEFAULT 1` column
- [x] Performance index: `idx_coin_vendor_stock`
- [x] Firecrawl OOS text detection: 9 regex patterns
- [x] Firecrawl fractional weight detection: 1/2 oz, 1/4 oz, 1/10 oz
- [x] Vision OOS screenshot analysis (prompt + JSON schema)
- [x] Consensus logic (6-scenario truth table)
- [x] API export: availability_by_site, last_known_price_by_site, last_available_date_by_site
- [x] Database writes: price=null, in_stock=0 for OOS products
- [x] JSONL disaster recovery: includes in_stock field

### Frontend Implementation
- [x] Constants: RETAIL_AVAILABILITY_KEY whitelisted
- [x] Load/save availability from localStorage
- [x] _buildOOSVendorRow() with DOM createElement (secure)
- [x] CSS: grayed-out strikethrough styling
- [x] Chart gaps: y:null with spanGaps:false
- [x] Tooltip: "Out of stock" for null values

### Infrastructure
- [x] Docker image rebuilt with OOS code
- [x] Container restarted successfully
- [x] Vision API key added to docker-compose.yml
- [x] Vision API key added to .env (gitignored)
- [x] Container restarted with GEMINI_API_KEY

### Validation (First Scrape 12:15 UTC)
- [x] 14 OOS detections (Firecrawl-only, Vision not yet enabled)
- [x] Database writes confirmed (price=NULL, in_stock=0)
- [x] No errors or crashes
- [x] JSONL log working correctly

---

## ⏳ In Progress

### Validation (Second Scrape 12:45 UTC - pending)
- [ ] Vision API active (verify log shows Vision processing)
- [ ] Consensus logic working (compare Firecrawl vs Vision results)
- [ ] False positive check on Monument Metals "PRE-ORDER"
- [ ] Screenshot capture successful
- [ ] Vision extraction successful

### Per-Item Customization (User Request)
- [ ] Review providers.json structure (DONE - schema supports arbitrary fields)
- [ ] Add custom extraction hints per coin/vendor pair
- [ ] Spot-check low-confidence items
- [ ] Add vendor-specific stock detection patterns
- [ ] Test customizations

---

## 🔍 TODO Before Launch

### Critical Path Items

**1. Validate Vision Consensus (ETA: 5 min after 12:45 scrape)**
- Wait for 12:45 UTC scrape to complete
- Check logs for Vision activity
- Verify consensus worked: compare OOS count 12:15 (Firecrawl-only) vs 12:45 (consensus)
- Expected: fewer false positives with Vision verification

**2. Spot-Check OOS Detections (ETA: 30 min)**

Visit these flagged items manually and verify correctness:

| Product | Vendor | Flagged Reason | Verify |
|---------|--------|----------------|--------|
| generic-silver-round | monumentmetals | PRE-ORDER text | [ ] |
| generic-silver-bar-10oz | monumentmetals | PRE-ORDER text | [ ] |
| krugerrand-silver | monumentmetals | PRE-ORDER text | [ ] |
| ape | monumentmetals | (assumed PRE-ORDER) | [ ] |
| ape | herobullion | "Notify me" | [ ] |
| maple-gold | bullionexchanges | Fractional 1/2 oz | [ ] |
| krugerrand-silver | bullionexchanges | Fractional 1/2 oz | [ ] |
| krugerrand-gold | bullionexchanges | Fractional 1/2 oz | [ ] |

**For each:**
1. Open URL from providers.json in browser
2. Check if main product is truly out of stock
3. If false positive (sidebar PRE-ORDER but main product in stock):
   - Add custom extraction hint to providers.json
   - Or add vendor-specific stock detection override

**3. Add Per-Item Customization Fields (ETA: 20 min)**

Extend `providers.json` schema to support:
```json
{
  "id": "monumentmetals",
  "enabled": true,
  "url": "...",
  "stock_detection_override": {
    "ignore_patterns": ["PRE-ORDER"],
    "require_vision_confirmation": true
  },
  "extraction_hint": "Monument Metals specific: Ignore PRE-ORDER tags in sidebar. Only mark OOS if main product shows OUT OF STOCK badge."
}
```

Update `extract-vision.js` to pass per-item hints to Gemini.

**4. Frontend Testing (ETA: 15 min)**
- [ ] Open StakTrakr in browser
- [ ] Navigate to Retail Prices
- [ ] Verify OOS vendors show strikethrough + "OOS" label
- [ ] Verify grayed-out styling (60% opacity)
- [ ] Verify tooltip shows last known price + date
- [ ] Open price history chart for OOS product
- [ ] Verify chart shows gap during OOS period
- [ ] Verify tooltip on gap says "Out of stock"

**5. API Export Validation (ETA: 5 min)**
- [ ] Wait for API export to run (after scrape completion)
- [ ] Check `data/api/ape/latest.json` (Platinum Eagle has OOS vendors)
- [ ] Verify `availability_by_site` field exists
- [ ] Verify `last_known_price_by_site` field exists
- [ ] Verify `last_available_date_by_site` field exists
- [ ] Verify `prices_by_site[vendor]` is null for OOS vendors
- [ ] Verify `source_count` excludes OOS vendors

---

## 📋 Nice-to-Have (Can Defer to 3.33.0)

- [ ] Add restock notification system
- [ ] Track OOS duration ("Out of stock for 3 days")
- [ ] Vendor reliability scoring
- [ ] Historical OOS analysis dashboard

---

## 🚨 Known Issues / Risks

### 1. Vision API Cost
- Gemini Vision Flash is free tier but has quota limits
- Monitor usage: ~67 screenshots per scrape cycle
- 67 screenshots × 4 cycles/hour × 24 hours = ~6,400 requests/day
- Consider batching or reducing frequency if quota exceeded

### 2. Browserless Dependency
- Self-hosted browserless required for screenshot capture
- If browserless crashes, Vision fallback to Firecrawl-only
- Graceful degradation built into code

### 3. False Positive Risk
- Monument Metals shows "PRE-ORDER" on sidebar items
- Vision SHOULD ignore sidebar, but needs validation
- Worst case: add per-item customization to override

### 4. CSS Selector Brittleness
- Vendor sites change layouts frequently
- Vision hints reference current CSS classes
- If layout changes, hints become stale
- Monitor extraction confidence scores

---

## 📊 Success Criteria for Launch

1. **Detection Accuracy:** >90% true positive rate (verified via spot-checks)
2. **No False Positives:** Monument Metals "PRE-ORDER" sidebar correctly ignored
3. **UI Clarity:** Strikethrough + "OOS" label renders correctly
4. **API Completeness:** All availability fields present in latest.json
5. **Chart Gaps:** Visual gaps render for OOS periods
6. **No Errors:** Zero crashes, zero database write failures
7. **Performance:** Full scrape completes in <10 minutes (within 15-min cron window)

---

## ⏱️ Time Estimate

- 12:45 scrape + validation: 15 minutes
- Spot-check 8 OOS items: 30 minutes
- Add per-item customization: 20 minutes
- Frontend testing: 15 minutes
- API validation: 5 minutes
- Documentation: 10 minutes

**Total:** ~1.5 hours

**Launch window:** If complete by 8:00 PM CST 2026-02-21, can ship 3.32.0 tomorrow morning.

---

**Next Action:** Wait for 12:45 UTC scrape (in 4 minutes), verify Vision is active, then begin spot-checking.

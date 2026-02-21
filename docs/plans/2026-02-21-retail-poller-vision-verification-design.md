# Retail Poller: Vision Verification + Fallback Design (Approach B)

**Date:** 2026-02-21
**Status:** Approved
**STAK issue:** (new, spawned from poller audit 2026-02-21)
**Builds on:** `2026-02-20-retail-poller-sdb-fix-vision-pipeline.md` (SDB fix + initial vision wiring already shipped)

---

## Problem Statement

After the `firstTableRowFirstPrice()` change (commit `a5927fb`):

- **APMEX**: Self-hosted Firecrawl doesn't render APMEX's React pricing table. `firstTableRowFirstPrice()` returns null. `firstInRangePriceProse()` falls back and grabs `$99.33` from a "Top Pick" bulk prose header instead of `$101.33` from the 1-unit Check/Wire table.
- **JMB**: Primary scrape intermittently fails. FBP fallback returns `$107.61` (Card/CC 1-19 price) not the wire price.
- **Missing vendors on non-ASE coins** (maple-silver, age, ape, buffalo, krugerrand-silver): Only APMEX + SDB appear — JMB, Hero, Monument, BE fail primary + FBP comparison pages don't list them.

Current `mergeVendorWithVision()` in `api-export.js` only runs when Firecrawl already has a price. Vision cannot fill in complete failures.

---

## Approved Design: Approach B — Contextualized Vision Verification

### Core Principle

Gemini Vision sees the **actual rendered page screenshot** — it doesn't care whether Firecrawl's JS table rendered. We use Vision as:

1. **Verification**: When Firecrawl got a price, ask Vision "here's what Firecrawl found — do you agree?"
2. **Primary fallback**: When Firecrawl got null, publish Vision's price as primary (`source: 'vision'`)
3. **Disagreement resolution**: When they disagree, prefer the price closest to the window median across all vendors (average if no median available yet)
4. **High-confidence signal**: When they agree within 3%, emit 99% confidence

### Decision Matrix

| Firecrawl result | Vision result | Resolution | Confidence |
|---|---|---|---|
| Price X | Agrees (≤3% diff) | Use X | **99%** |
| Price X | Disagrees (>3%) | Closest to window median | 70% (mild) or 50% (outlier) |
| Price X | No vision data | Use X, normal scoring | 50-80% |
| null | Price Y | Publish Y as `source: 'vision'` | 70% |
| null | null / failed | Null — excluded | N/A |

---

## Files to Change

### 1. `devops/retail-poller/extract-vision.js` — Contextualized Gemini Prompt

**What changes:**

#### A. Read Firecrawl prices from SQLite before Gemini calls

```js
import Database from "better-sqlite3";

function loadFirecrawlPrices(pricesDbPath) {
  const db = new Database(pricesDbPath, { readonly: true });
  const today = new Date().toISOString().slice(0, 10);
  const rows = db.prepare(
    `SELECT coin_slug, vendor, price FROM price_snapshots
     WHERE date(scraped_at) = ? AND price IS NOT NULL`
  ).all(today);
  db.close();
  // Returns { ase: { apmex: 101.33, sdbullion: 100.89 }, ... }
  const out = {};
  for (const { coin_slug, vendor, price } of rows) {
    if (!out[coin_slug]) out[coin_slug] = {};
    out[coin_slug][vendor] = price;
  }
  return out;
}
```

#### B. Pass `firecrawlPrice` into the Gemini prompt for each vendor

Current prompt asks: "What is the 'As Low As $XX.XX' / lowest per-unit price?"

New prompt structure:
```
You are extracting the **1-unit Check/Wire price** (not credit card, not "As Low As" bulk)
from a precious metals dealer screenshot.

Coin: {meta.name} ({weight_oz} troy oz {metal})
Expected price range: {priceRangeHint}
Firecrawl extracted: {firecrawlPrice !== null ? `$${firecrawlPrice.toFixed(2)}` : "no price found"}

Look at the pricing table or "As Low As" section for 1-unit wire/check pricing.
Do you see a 1-unit Check/Wire price? If yes, report it.
Does it match Firecrawl's price within 3%? (yes/no)

Respond ONLY as JSON:
{
  "price": <number or null>,
  "confidence": "high" | "medium" | "low",
  "agrees_with_firecrawl": <true | false | null if firecrawl had no price>
}
```

#### C. Fix stale price range hints

Current (stale): `silver 1oz ~$35-60, gold 1oz ~$2,800-3,500`

Updated:
```js
const PRICE_RANGE_HINTS = {
  silver: { min: 65, max: 200 },   // per oz — covers 1oz to 10oz products
  gold: { min: 3000, max: 15000 },
  platinum: { min: 800, max: 6000 },
  palladium: { min: 800, max: 6000 },
};
```
Multiply by `weight_oz` for multi-oz products.

#### D. Output `firecrawl_by_site` + `agreement_by_site` in vision JSON

Current vision JSON: `{ prices_by_site: {...}, confidence_by_site: {...} }`

New vision JSON:
```json
{
  "prices_by_site":    { "apmex": 101.33 },
  "confidence_by_site": { "apmex": "high" },
  "firecrawl_by_site": { "apmex": 99.33 },
  "agreement_by_site": { "apmex": false }
}
```

#### E. Process ALL vendors including Firecrawl nulls

Currently: `manifest.results.filter(r => r.ok && r.screenshot)` — captures all screenshots regardless of Firecrawl success.

Vision extraction loop currently only processes vendors where Firecrawl got a price. Change: iterate all vendors in the manifest, passing `firecrawlPrice = null` when Firecrawl has no result. Let Gemini look at the screenshot regardless.

---

### 2. `devops/retail-poller/api-export.js` — Resolution + Fallback Logic

**Replace `mergeVendorWithVision()` with `resolveVendorPrice()`:**

```js
function resolveVendorPrice(firecrawlPrice, visionData, vendorId, windowMedian, prevMedian) {
  const vp = visionData?.prices_by_site?.[vendorId] ?? null;
  const vc = visionData?.confidence_by_site?.[vendorId] ?? null;
  const agrees = visionData?.agreement_by_site?.[vendorId] ?? null;

  // Both sources agree (≤3%) → 99%
  if (firecrawlPrice !== null && vp !== null && agrees === true) {
    return { price: firecrawlPrice, confidence: 99, source: "firecrawl+vision" };
  }

  // Both present, disagree → closest to window median wins
  if (firecrawlPrice !== null && vp !== null) {
    const ref = windowMedian ?? (firecrawlPrice + vp) / 2;
    const useFirecrawl = Math.abs(firecrawlPrice - ref) <= Math.abs(vp - ref);
    const price = useFirecrawl ? firecrawlPrice : vp;
    const base = scoreVendorPrice(price, windowMedian, prevMedian);
    return { price, confidence: Math.min(base, 70), source: useFirecrawl ? "firecrawl" : "vision" };
  }

  // Firecrawl null, Vision has price → Vision as primary
  if (firecrawlPrice === null && vp !== null) {
    const vcMod = vc === "high" ? 10 : vc === "medium" ? 0 : -15;
    const base = 70 + vcMod;
    const score = scoreVendorPrice(vp, windowMedian, prevMedian);
    return { price: vp, confidence: Math.min(base, score + 20), source: "vision" };
  }

  // Only Firecrawl → existing scoring, no change
  if (firecrawlPrice !== null) {
    return { price: firecrawlPrice, confidence: scoreVendorPrice(firecrawlPrice, windowMedian, prevMedian), source: "firecrawl" };
  }

  return { price: null, confidence: 0, source: null };
}
```

**Change main vendor loop to iterate ALL providers.json vendors:**

Currently the main loop iterates only vendors present in SQLite for today's window. Missing vendors (Firecrawl null) are skipped entirely.

New approach: after loading SQLite results, also load `providers.json` vendor list. For each provider, if not in SQLite, inject a null-price entry so Vision fallback can run.

```js
const allProviderIds = getProvidersForSlug(slug); // from providers.json
for (const vendorId of allProviderIds) {
  const firecrawlPrice = sqliteVendors[vendorId]?.price ?? null;
  const { price, confidence, source } = resolveVendorPrice(
    firecrawlPrice, visionData, vendorId, windowMedian, prevMedian
  );
  if (price !== null) {
    vendors[vendorId] = { price, confidence, source };
  }
}
```

---

### 3. `devops/retail-poller/capture.js` — Already Handles All Vendors

`capture.js` already takes screenshots for all configured vendors regardless of Firecrawl outcome. No change needed; just verify `PROVIDERS` env var isn't restricting it.

---

## Docker Impact

The `devops/retail-poller/` Docker image bakes in scripts at `/app/`. Changes to:
- `extract-vision.js` — needs `better-sqlite3` (already installed — shared dep with `price-extract.js`)
- `api-export.js` — pure logic change, no new deps
- No new npm packages required → **no Docker rebuild required**

Only `run-local.sh` orchestrates the sequence; Docker image scripts are updated via the standard deploy cycle (git pull + rebuild, or volume mount if using dev mount mode).

---

## Confidence Scoring Summary (new)

| Scenario | Confidence |
|---|---|
| Firecrawl + Vision agree (≤3%) | **99%** |
| Single source, within 3% of median | 80% |
| Firecrawl + Vision disagree, price near median | 70% |
| Vision-only fallback, high vision confidence | ~70% |
| Single source, mild outlier | 50% |
| Single source, strong outlier | 35% |
| Single source, outlier + DoD spike | 15% |

---

## Out of Scope

- Changing the Playwright browserless connection in `capture.js` (already implemented)
- Changing the FBP fallback strategy (separate concern)
- UI changes to the retail view modal
- Any frontend JS files (`js/` directory) — untouched by this plan

---

## Implementation Notes

- `prices.db` is at `$DATA_REPO_PATH/prices.db` (one level above `data/`). The `PRICES_DB` env var should be used; default to `path.join(DATA_DIR, '..', 'prices.db')`.
- Vision JSON path: `$DATA_DIR/retail/{slug}/{date}-vision.json` (current convention, unchanged)
- `source` field written to `latest.json` per vendor is for debugging only — does not affect frontend display
- Run order: `price-extract.js` → `capture.js` → `extract-vision.js` → `api-export.js` (unchanged)

---

## Acceptance Criteria

- [ ] APMEX ASE shows `$101.33` not `$99.33` (Vision corrects prose-header grab)
- [ ] JMB wire price reflected when Firecrawl fails (Vision fills in `$101.xx`)
- [ ] Non-ASE coins (maple-silver, age, ape) show 3-4 vendors instead of 2
- [ ] Confidence 99% when two sources agree
- [ ] No vendor dropped from `latest.json` just because Firecrawl got null
- [ ] `api-export.js` runs without error when no vision JSON exists (graceful degradation)

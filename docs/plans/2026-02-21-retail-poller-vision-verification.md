# Retail Poller: Vision Verification + Fallback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Gemini Vision a first-class verification layer and fallback for Firecrawl price extraction — fixing the APMEX $99.33 prose-header bug and publishing Vision-only prices for vendors where Firecrawl returns null.

**Architecture:** Two files change. `extract-vision.js` gains Firecrawl context (reads prices.db) and passes each vendor's scraped price into the Gemini prompt for comparison, emitting `agreement_by_site` in the vision JSON. `api-export.js` replaces `mergeVendorWithVision()` with `resolveVendorPrice()` which emits 99% confidence when both agree, picks the median-closest price when they disagree, and publishes Vision prices as primary when Firecrawl got null. No new npm deps. No Docker rebuild.

**Tech Stack:** Node.js ESM, better-sqlite3 (already installed), Gemini 2.5 Flash API, `devops/retail-poller/`

---

### Task 1: Update `extractPriceFromImage()` — context-aware prompt + fixed price ranges

**Files:**
- Modify: `devops/retail-poller/extract-vision.js`

The function at line 59 currently takes `(imagePath, coinName, metal, weightOz)`.
The prompt at line 68–90 has two problems:
1. Asks for "As Low As" / "lowest per-unit price" — we want **1-unit Check/Wire price**
2. Stale price ranges: `silver 1oz ~$35-60, gold 1oz ~$2,800-3,500` (actual: silver ~$85+, gold ~$5,100+)

**Step 1: Add price range constants before the function**

Open `devops/retail-poller/extract-vision.js`. After the `CONCURRENCY` constant (line 41), add:

```js
const PRICE_RANGE_HINTS = {
  silver:   { min: 65,   max: 200 },
  gold:     { min: 3000, max: 15000 },
  platinum: { min: 800,  max: 6000 },
  palladium:{ min: 800,  max: 6000 },
};
```

**Step 2: Update function signature to accept `firecrawlPrice`**

Change line 59:
```js
// Before:
async function extractPriceFromImage(imagePath, coinName, metal, weightOz) {
// After:
async function extractPriceFromImage(imagePath, coinName, metal, weightOz, firecrawlPrice = null) {
```

**Step 3: Replace the prompt body**

Replace lines 68–90 (the `const prompt = \`...\`` block) with:

```js
  const range = PRICE_RANGE_HINTS[metal] || { min: 0, max: 99999 };
  const minPrice = Math.round(range.min * weightOz);
  const maxPrice = Math.round(range.max * weightOz);
  const firecrawlHint = firecrawlPrice !== null
    ? `Firecrawl text-parser extracted: $${firecrawlPrice.toFixed(2)} — does the screenshot confirm this?`
    : "Firecrawl text-parser found no price for this vendor.";

  const prompt = `You are a price extraction bot for a precious metals price tracker.

Look at this screenshot of a coin dealer product page.
Coin: ${coinName} (${metal}, ${weightOz} troy oz)
Expected 1-unit price range: $${minPrice}–$${maxPrice}
${firecrawlHint}

Find the **1-unit Check/Wire price** — the price a customer pays for exactly 1 coin using check or wire transfer.
- Look in the pricing/quantity table for the "1" or "1-9" row under Check/Wire columns
- Do NOT use "As Low As" bulk discount prices (those are for large quantities)
- Do NOT use credit card prices (usually higher)
- Do NOT use roll, tube, or accessory prices
- For gold: use the 1 troy oz version, ignore 1/2 oz or 1/4 oz
- If the price clearly matches what Firecrawl found (within 3%), say agrees_with_firecrawl = true

Respond ONLY as JSON (no markdown, no explanation):
{"price": 99.99, "confidence": "high", "agrees_with_firecrawl": true, "label": "1-unit wire row"}

Where:
- price: numeric USD price or null if not found
- confidence: "high" (unambiguous), "medium" (best guess), "low" (uncertain)
- agrees_with_firecrawl: true if price matches Firecrawl within ~3%, false if not, null if Firecrawl had no price
- label: brief description of where you found the price`;
```

**Step 4: Update JSON response shape parsing**

The existing `return JSON.parse(rawText)` at line 137 already handles unknown fields — no change needed. But verify the caller can receive `agrees_with_firecrawl`.

**Step 5: Verify function signature change cascades correctly**

In the tasks map (line 219), the call is:
```js
const extracted = await extractPriceFromImage(
  imagePath,
  coin.name,
  coin.metal,
  coin.weight_oz || 1
);
```

This will be updated in Task 2 when we pass `firecrawlPrice`. No change here yet.

**Step 6: Manual test (DRY_RUN)**

```bash
# Make sure browserless and firecrawl Docker are running
cd devops/retail-poller
MANIFEST_PATH=/tmp/retail-screenshots/$(date +%Y-%m-%d)/manifest.json \
DATA_DIR=/path/to/data-branch/data \
GEMINI_API_KEY=your-key \
DRY_RUN=1 \
node extract-vision.js
```

Expected: Prompt sent to Gemini now mentions the correct price range and firecrawl hint. Output JSON is logged (DRY_RUN).

**Step 7: Commit**

```bash
git add devops/retail-poller/extract-vision.js
git commit -m "fix(extract-vision): update prompt to 1-unit wire price, fix stale price ranges, add firecrawl context param"
```

---

### Task 2: Read Firecrawl prices from SQLite and pass to Vision

**Files:**
- Modify: `devops/retail-poller/extract-vision.js`

**Step 1: Add `better-sqlite3` import at the top of the file**

After the existing imports (line 18–20), add:

```js
import Database from "better-sqlite3";
```

**Step 2: Add `loadFirecrawlPrices()` helper function**

After the `PRICE_RANGE_HINTS` constant you added in Task 1, add:

```js
/**
 * Load today's Firecrawl prices from prices.db.
 * Returns { slugSlug: { vendorId: price, ... }, ... } or {} if DB unavailable.
 */
function loadFirecrawlPrices(dataDir) {
  const dbPath = resolve(join(dataDir, "..", "prices.db"));
  if (!existsSync(dbPath)) return {};
  try {
    const db = new Database(dbPath, { readonly: true });
    const today = new Date().toISOString().slice(0, 10);
    const rows = db.prepare(
      `SELECT coin_slug, vendor, price FROM price_snapshots
       WHERE date(scraped_at) = ? AND price IS NOT NULL`
    ).all(today);
    db.close();
    const out = {};
    for (const { coin_slug, vendor, price } of rows) {
      if (!out[coin_slug]) out[coin_slug] = {};
      out[coin_slug][vendor] = price;
    }
    return out;
  } catch (err) {
    warn(`Could not load Firecrawl prices from SQLite: ${err.message}`);
    return {};
  }
}
```

**Step 3: Call `loadFirecrawlPrices()` in `main()` before the tasks map**

In `main()`, after line 211 (`log(\`Vision extraction...\``), add:

```js
const firecrawlPrices = loadFirecrawlPrices(DATA_DIR);
log(`Loaded Firecrawl prices for ${Object.keys(firecrawlPrices).length} coin(s) from SQLite`);
```

**Step 4: Pass `firecrawlPrice` to `extractPriceFromImage()` in the tasks map**

Update the `extractPriceFromImage` call inside the tasks map (around line 229):

```js
// Before:
const extracted = await extractPriceFromImage(
  imagePath,
  coin.name,
  coin.metal,
  coin.weight_oz || 1
);
// After:
const firecrawlPrice = firecrawlPrices[result.coin]?.[result.provider] ?? null;
const extracted = await extractPriceFromImage(
  imagePath,
  coin.name,
  coin.metal,
  coin.weight_oz || 1,
  firecrawlPrice
);
```

**Step 5: Store `agrees_with_firecrawl` and `firecrawlPrice` in the extraction results**

In the `extractionResults.push(...)` success branch (around line 242–252), add two fields:

```js
extractionResults.push({
  coinSlug: result.coin,
  providerId: result.provider,
  price: extracted.price,
  confidence: extracted.confidence,
  agreesWithFirecrawl: extracted.agrees_with_firecrawl ?? null,
  firecrawlPrice: firecrawlPrice,   // ← add
  label: extracted.label,
  ok: extracted.price !== null,
  error: extracted.price === null ? (extracted.label || "no price returned") : undefined,
});
```

And in the catch error branch (around line 255–263), add:
```js
extractionResults.push({
  // ... existing fields ...
  agreesWithFirecrawl: null,
  firecrawlPrice: firecrawlPrice,   // ← add
  // ...
});
```

**Step 6: Emit `firecrawl_by_site` and `agreement_by_site` in the per-coin output JSON**

In the `for (const coinSlug of coinSlugs)` loop (around line 272), where `pricesBySite` and `confidenceBySite` are built:

```js
const pricesBySite = {};
const confidenceBySite = {};
const firecrawlBySite = {};     // ← add
const agreementBySite = {};     // ← add
for (const r of successful) {
  pricesBySite[r.providerId] = r.price;
  confidenceBySite[r.providerId] = r.confidence;
  if (r.firecrawlPrice !== null) firecrawlBySite[r.providerId] = r.firecrawlPrice;  // ← add
  if (r.agreesWithFirecrawl !== null) agreementBySite[r.providerId] = r.agreesWithFirecrawl;  // ← add
}
```

Then in `writeVisionJson(coinSlug, dateStr, {...})`, add the new fields after `confidence_by_site`:

```js
writeVisionJson(coinSlug, dateStr, {
  date: dateStr,
  generated_at_utc: generatedAt,
  method: "gemini-vision",
  model: GEMINI_MODEL,
  currency: "USD",
  prices_by_site: pricesBySite,
  confidence_by_site: confidenceBySite,
  firecrawl_by_site: firecrawlBySite,     // ← add
  agreement_by_site: agreementBySite,     // ← add
  source_count: prices.length,
  average_price: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length * 100) / 100 : null,
  median_price: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
  failed_sites: failed.map(r => r.providerId),
});
```

**Step 7: Test**

```bash
DRY_RUN=1 \
MANIFEST_PATH=/path/to/artifacts/manifest.json \
DATA_DIR=/path/to/data-branch/data \
GEMINI_API_KEY=your-key \
node devops/retail-poller/extract-vision.js
```

Expected log output: "Loaded Firecrawl prices for N coin(s) from SQLite". Vision JSON (printed to console in DRY_RUN) should include `firecrawl_by_site` and `agreement_by_site` fields.

**Step 8: Commit**

```bash
git add devops/retail-poller/extract-vision.js
git commit -m "feat(extract-vision): load Firecrawl prices from SQLite, emit agreement_by_site in vision JSON"
```

---

### Task 3: Replace `mergeVendorWithVision()` with `resolveVendorPrice()` in `api-export.js`

**Files:**
- Modify: `devops/retail-poller/api-export.js`

`mergeVendorWithVision()` is at lines 218–264. Replace the entire function with `resolveVendorPrice()`:

**Step 1: Replace the function**

Delete lines 218–264 (the `mergeVendorWithVision` function) and replace with:

```js
/**
 * Resolve the canonical vendor price using Firecrawl result and Vision verification.
 *
 * Decision matrix:
 *   Both agree  (≤3%)       → use Firecrawl price, 99% confidence
 *   Both present, disagree  → use price closest to window median, ≤70% confidence
 *   Firecrawl null, Vision  → Vision as primary, ~70% confidence
 *   Firecrawl only          → existing scoreVendorPrice(), no change
 *   Neither                 → { price: null, confidence: 0, source: null }
 *
 * @param {number|null} firecrawlPrice
 * @param {object|null} visionData - Full vision JSON for this coin (may include agreement_by_site)
 * @param {string} vendorId
 * @param {number|null} windowMedian
 * @param {number|null} prevMedian
 */
function resolveVendorPrice(firecrawlPrice, visionData, vendorId, windowMedian, prevMedian) {
  const vp = visionData?.prices_by_site?.[vendorId] ?? null;
  const vc = visionData?.confidence_by_site?.[vendorId] ?? null;
  // New field from updated extract-vision.js; fall back to diff calc for old JSONs
  const agreedField = visionData?.agreement_by_site?.[vendorId] ?? null;

  // Determine agreement: prefer Gemini's own judgement; fall back to ≤3% diff check
  const agrees = (() => {
    if (agreedField !== null) return agreedField;
    if (firecrawlPrice !== null && vp !== null) {
      const diff = Math.abs(firecrawlPrice - vp) / Math.max(firecrawlPrice, vp);
      return diff <= 0.03;
    }
    return null;
  })();

  // CASE 1: Both sources agree → 99% confidence
  if (firecrawlPrice !== null && vp !== null && agrees === true) {
    return { price: firecrawlPrice, confidence: 99, source: "firecrawl+vision" };
  }

  // CASE 2: Both present, disagree → prefer price closest to window median
  if (firecrawlPrice !== null && vp !== null && agrees === false) {
    const ref = windowMedian ?? (firecrawlPrice + vp) / 2;
    const useFirecrawl = Math.abs(firecrawlPrice - ref) <= Math.abs(vp - ref);
    const price = useFirecrawl ? firecrawlPrice : vp;
    const base = scoreVendorPrice(price, windowMedian, prevMedian);
    return { price, confidence: Math.min(base, 70), source: useFirecrawl ? "firecrawl" : "vision" };
  }

  // CASE 3: Firecrawl null, Vision has a price → Vision as primary
  if (firecrawlPrice === null && vp !== null) {
    const vcMod = vc === "high" ? 10 : vc === "medium" ? 0 : -15;
    const base = Math.max(0, 70 + vcMod);
    const medianScore = scoreVendorPrice(vp, windowMedian, prevMedian);
    return { price: vp, confidence: Math.min(base, medianScore + 20), source: "vision" };
  }

  // CASE 4: Firecrawl only (no vision data for this vendor)
  if (firecrawlPrice !== null) {
    return {
      price: firecrawlPrice,
      confidence: scoreVendorPrice(firecrawlPrice, windowMedian, prevMedian),
      source: "firecrawl",
    };
  }

  // CASE 5: Neither source has a price
  return { price: null, confidence: 0, source: null };
}
```

**Step 2: Update the call site in the vendor scoring loop**

Find the loop at around line 353 (currently calls `mergeVendorWithVision`):

```js
// Before:
for (const [vendorId, vendorData] of Object.entries(vendors)) {
  const { price, confidence, method } = mergeVendorWithVision(
    vendorData.price, visionData, vendorId, windowMedian, prevMedian
  );
  vendorData.confidence = confidence;
  vendorData.method = method;
  confidenceUpdates.push({ coinSlug: slug, vendor: vendorId, windowStart: latestWindow, confidence });
}
```

Replace with:

```js
// Build set of vendor IDs that have SQLite rows (for confidence write-back)
const sqliteVendorIds = new Set(Object.keys(vendors));

for (const [vendorId, vendorData] of Object.entries(vendors)) {
  const { price, confidence, source } = resolveVendorPrice(
    vendorData.price, visionData, vendorId, windowMedian, prevMedian
  );
  vendorData.confidence = confidence;
  vendorData.source = source;
  // Only write back to SQLite for rows that came from SQLite
  if (sqliteVendorIds.has(vendorId) && confidence > 0) {
    confidenceUpdates.push({ coinSlug: slug, vendor: vendorId, windowStart: latestWindow, confidence });
  }
}
```

Note: `vendorData.method` becomes `vendorData.source` — `source` is already in the vendor map schema.

**Step 3: Verify there are no remaining `mergeVendorWithVision` references**

```bash
grep -n "mergeVendorWithVision" devops/retail-poller/api-export.js
```

Expected: no matches.

**Step 4: DRY_RUN test**

```bash
DATA_DIR=/path/to/data-branch/data \
DRY_RUN=1 \
node devops/retail-poller/api-export.js
```

Expected: runs without error. No files written. No warnings about missing functions.

**Step 5: Commit**

```bash
git add devops/retail-poller/api-export.js
git commit -m "feat(api-export): replace mergeVendorWithVision with resolveVendorPrice — 99% when agree, Vision fallback, median tiebreaker"
```

---

### Task 4: Augment vendor loop with Vision-only fallback for Firecrawl-null vendors

**Files:**
- Modify: `devops/retail-poller/api-export.js`

Currently the loop only iterates vendors already present in the SQLite `vendors` map (line 353). Vision-only prices for vendors where Firecrawl returned null are never published.

**Step 1: Read providers.json vendor IDs outside the slug loop**

Near the top of `main()`, just after the `providersPath` block (around line 292), providers.json is already parsed into the local variable from the `coinSlugs` merge. Store the full parsed object:

Find:
```js
const providersJson = JSON.parse(readFileSync(providersPath, "utf-8"));
```
This may already be inside a `try {}` block. Assign to a wider-scope variable. Move the declaration before the try block:

```js
// Before (inside try):
const providersJson = JSON.parse(readFileSync(providersPath, "utf-8"));

// After: declare before try so it's available in per-slug loop
```

Add before the `try` block in `main()`:
```js
let providersJson = null;
```

Inside the try block, change:
```js
const providersJson = JSON.parse(readFileSync(providersPath, "utf-8"));
// →
providersJson = JSON.parse(readFileSync(providersPath, "utf-8"));
```

**Step 2: Augment `vendors` with null-price stubs for missing providers**

Inside the per-slug loop, after `const vendors = vendorMap(latestRows);` (line ~339) and after `const visionData = loadVisionData(DATA_DIR, slug);` (line ~350), add:

```js
// Augment vendors map: add null-price stubs for providers configured in providers.json
// but absent from SQLite (i.e., Firecrawl returned null for them).
// resolveVendorPrice() will try Vision for these.
if (providersJson?.coins?.[slug]) {
  const configuredProviders = providersJson.coins[slug].providers
    ?.filter(p => p.enabled !== false)
    ?.map(p => p.id) ?? [];
  for (const vendorId of configuredProviders) {
    if (!vendors[vendorId]) {
      vendors[vendorId] = { price: null, confidence: null, source: null };
    }
  }
}
```

**Step 3: Clean up null-result vendors after scoring**

After the confidence scoring loop (after `confidenceUpdates.push(...)`), add:

```js
// Remove vendors where resolveVendorPrice found no price from either source
for (const vendorId of Object.keys(vendors)) {
  if (vendors[vendorId].price === null) {
    delete vendors[vendorId];
  }
}
```

**Step 4: Update `windowMedian` to include Vision-only prices**

Currently `windowMedian = medianPrice(latestRows)` uses only SQLite prices. After augmenting vendors in Step 2, the median should include Vision-only prices for a more accurate reference. However, this creates a chicken-and-egg (median needed before Vision prices are resolved). For now, use SQLite-only median — it's a reasonable reference even when some Vision prices are missing from it. **No code change needed here.**

**Step 5: DRY_RUN test**

```bash
DATA_DIR=/path/to/data-branch/data DRY_RUN=1 node devops/retail-poller/api-export.js
```

Check the log for coins with known missing vendors (e.g., `maple-silver`, `age`). They should now attempt Vision lookup for `jmbullion`, `monumentmetals`, `herobullion`.

**Step 6: Live test (no DRY_RUN)**

Run a full cycle with actual vision JSON present:

```bash
DATA_DIR=/path/to/data-branch/data node devops/retail-poller/api-export.js
```

Then inspect:
```bash
cat /path/to/data-branch/data/api/ase/latest.json | python3 -m json.tool | grep -A5 '"vendors"'
```

Expected: APMEX should show confidence 99 or ~80 (Vision confirms). JMB should appear with `source: "vision"` if Firecrawl was null and Vision found it.

**Step 7: Commit**

```bash
git add devops/retail-poller/api-export.js
git commit -m "feat(api-export): augment vendor loop with Vision-only fallback for Firecrawl-null providers"
```

---

### Task 5: End-to-end integration test

**Step 1: Run full pipeline locally**

```bash
# From inside the retail-poller Docker container or with all env vars set:
DATA_REPO_PATH=/path/to/data-branch \
FIRECRAWL_BASE_URL=http://localhost:3002 \
BROWSERLESS_URL=ws://localhost:3000/chromium/playwright?token=local_dev_token \
GEMINI_API_KEY=your-key \
/app/run-local.sh
```

**Step 2: Check APMEX ASE price**

```bash
curl -s https://api.staktrakr.com/data/api/ase/latest.json | python3 -m json.tool | grep -A10 '"apmex"'
```

Expected: price `101.xx`, confidence `≥90` (or 99 if Vision agrees), source `firecrawl+vision`.

**Step 3: Check vendor count on non-ASE coins**

```bash
curl -s https://api.staktrakr.com/data/api/maple-silver/latest.json | python3 -m json.tool | grep '"vendors"' -A40
```

Expected: more than 2 vendors (Vision filling in JMB, Monument, etc.).

**Step 4: Update retail-poller skill** (mark Vision Verification as active)

In `.claude/skills/retail-poller/SKILL.md` and `.agents/skills/retail-poller/SKILL.md`, update the "Vision on every poll" section to note that Vision now receives Firecrawl context and emits `agreement_by_site`.

```bash
git add .claude/skills/retail-poller/SKILL.md .agents/skills/retail-poller/SKILL.md
git commit -m "docs(skill): retail-poller — note Vision verification + fallback active (Approach B)"
```

---

## Implementation Order

1. Task 1 — update prompt + price ranges (safest, improves Vision quality immediately)
2. Task 2 — SQLite read + firecrawlPrice wiring (enables agreement detection)
3. Task 3 — replace `mergeVendorWithVision()` (core logic upgrade)
4. Task 4 — Vision-only vendor augmentation (fills in missing vendors)
5. Task 5 — end-to-end test + skill update

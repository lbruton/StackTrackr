# Retail Poller: SDB Fix + Vision Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix SDB Bullion's systematically wrong price extraction, then wire up Gemini Vision as a confidence booster for all vendors using the local browserless Docker.

**Architecture:** SDB pages use pricing tables (not "As Low As" text) for the main product; carousel and add-on sections inject unrelated "As Low As" prices that pollute `Math.min()`. Fix by (a) removing SDB from `USES_AS_LOW_AS` and (b) pre-truncating markdown at the add-on noise boundary. Vision pipeline runs after Firecrawl via browserless Docker → Gemini 2.5 Flash, writes per-coin JSON, then `api-export.js` merges Firecrawl + Vision confidence scores above the 60% single-source ceiling.

**Tech Stack:** Node.js ESM, better-sqlite3, Playwright (via browserless Docker WS), Gemini 2.5 Flash API, `devops/retail-poller/`

---

## Phase 1 — Fix SDB Price Extraction (`price-extract.js`)

**Files:**
- Modify: `devops/retail-poller/price-extract.js`

**Root cause:** SDB pages show "As Low As" only in carousel/add-on sections, not for the main product. The main product price is in a pricing table. `USES_AS_LOW_AS` should not include SDB.

### Step 1: Remove `sdbullion` from `USES_AS_LOW_AS`

Open `price-extract.js`. Find:

```
const USES_AS_LOW_AS = new Set(["jmbullion", "monumentmetals", "sdbullion"]);
```

Change to:

```
const USES_AS_LOW_AS = new Set(["jmbullion", "monumentmetals"]);
```

### Step 2: Add `preprocessMarkdown()` function

After the `USES_AS_LOW_AS` declaration, add a function that truncates SDB markdown
at noise boundaries before price extraction:

```
const MARKDOWN_CUTOFF_PATTERNS = {
  sdbullion: [
    /\*\*Add on Items\*\*/i,
    /^Add on Items\s*$/im,
    /\*\*Customers Also Purchased\*\*/i,
    /^Customers Also Purchased\s*$/im,
  ],
};

function preprocessMarkdown(markdown, providerId) {
  const patterns = MARKDOWN_CUTOFF_PATTERNS[providerId];
  if (!patterns || !markdown) return markdown;
  let cutIndex = markdown.length;
  for (const pattern of patterns) {
    const match = markdown.search(pattern);
    if (match !== -1 && match < cutIndex) cutIndex = match;
  }
  return markdown.slice(0, cutIndex);
}
```

### Step 3: Call `preprocessMarkdown()` before `extractPrice()`

In both `scrapeWithFirecrawl()` and `scrapeWithPlaywright()`, before the `extractPrice()` call:

```
const cleanedMarkdown = preprocessMarkdown(rawMarkdown, providerId);
const price = extractPrice(cleanedMarkdown, metal, weightOz, providerId);
```

### Step 4: Manual spot-check test

```bash
COINS=silver-buffalo DRY_RUN=1 \
DATA_DIR=/path/to/data-branch/data \
FIRECRAWL_BASE_URL=http://localhost:3002 \
node price-extract.js
```

Expected: SDB price should match APMEX within 3% (not be a fractional product's price).

### Step 5: Commit

```bash
git add devops/retail-poller/price-extract.js
git commit -m "fix(retail-poller): remove SDB from USES_AS_LOW_AS, add preprocessMarkdown cutoff"
```

---

## Phase 2 — Add `browserless` Mode to `capture.js`

**Files:**
- Modify: `devops/retail-poller/capture.js`

**Why:** Current `BROWSER_MODE=local` calls `playwright.launch()` — a local Chromium binary, not the browserless Docker. Add `BROWSER_MODE=browserless` that connects via WebSocket.

### Step 1: Add `browserless` mode constant and connect function

```
const BROWSERLESS_WS = process.env.BROWSERLESS_URL ||
  "ws://localhost:3000/chromium/playwright?token=local_dev_token";

async function connectBrowserlessSession() {
  const { chromium } = await import("playwright-core");
  const browser = await chromium.connectOverCDP(BROWSERLESS_WS);
  const context = await browser.newContext();
  return { browser, context };
}
```

### Step 2: Wire into the browser mode switch

Where `BROWSER_MODE` is checked, add the browserless branch:

```
} else if (BROWSER_MODE === "browserless") {
  ({ browser, context } = await connectBrowserlessSession());
}
```

### Step 3: Add `ARTIFACT_DIR` env var

Replace any hardcoded screenshot path with:

```
const ARTIFACT_DIR = process.env.ARTIFACT_DIR ||
  path.join(os.tmpdir(), "retail-poller-screenshots", TODAY_DATE);
```

### Step 4: Test locally

```bash
BROWSER_MODE=browserless \
COINS=ase \
PROVIDERS=apmex \
ARTIFACT_DIR=/tmp/rp-screenshots \
DATA_DIR=/path/to/data-branch/data \
node capture.js
```

Expected: screenshot PNG appears in `/tmp/rp-screenshots/`.

### Step 5: Commit

```bash
git add devops/retail-poller/capture.js
git commit -m "feat(capture): add BROWSER_MODE=browserless via connectOverCDP"
```

---

## Phase 3 — Improve `extract-vision.js` Failure Logging

**Files:**
- Modify: `devops/retail-poller/extract-vision.js`

### Step 1: Add failure accumulator

At the top of the per-vendor vision extraction loop:

```
const failedVendors = [];
```

In each catch block, push to the accumulator:

```
failedVendors.push({ vendor: vendorId, reason: err.message });
```

### Step 2: Add summary log after the loop

```
if (failedVendors.length > 0) {
  console.warn(
    `[vision] ${slug}: ${failedVendors.length} vendor(s) failed — ` +
    failedVendors.map((f) => `${f.vendor}(${f.reason})`).join(", ")
  );
}
```

### Step 3: Test

Set an invalid `GEMINI_API_KEY` to force failures and verify the summary log appears.

### Step 4: Commit

```bash
git add devops/retail-poller/extract-vision.js
git commit -m "fix(extract-vision): add per-coin failure summary log"
```

---

## Phase 4 — Vision Merge in `api-export.js`

**Files:**
- Modify: `devops/retail-poller/api-export.js`

**Vision JSON location:** `DATA_DIR/retail/_artifacts/{date}/{slug}-vision.json`
**Vision JSON format:** `{ prices_by_site: { apmex: 45.00 }, confidence_by_site: { apmex: "high" } }`

### Step 1: Add `loadVisionData()` helper

After the existing imports, add:

```
function loadVisionData(dataDir, slug) {
  const today = new Date().toISOString().slice(0, 10);
  const artifactDir = process.env.ARTIFACT_DIR ||
    join(dataDir, "retail", "_artifacts", today);
  const filePath = join(artifactDir, `${slug}-vision.json`);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}
```

### Step 2: Add `mergeVendorWithVision()` scoring function

Confidence tiers when both Firecrawl and Vision are available:
- Within 2% agreement → 90 base
- Within 5% agreement → 70 base
- Disagreement >5% → 35 base

Single-source (no vision) falls through to existing `scoreVendorPrice()`.

```
function mergeVendorWithVision(firecrawlPrice, visionData, vendorId, windowMedian, prevMedian) {
  if (!visionData || !visionData.prices_by_site) {
    return {
      price: firecrawlPrice,
      confidence: scoreVendorPrice(firecrawlPrice, windowMedian, prevMedian),
      method: "firecrawl",
    };
  }

  const visionPrice = visionData.prices_by_site[vendorId];
  const visionConfidence = visionData.confidence_by_site?.[vendorId] ?? "low";

  if (!visionPrice) {
    return {
      price: firecrawlPrice,
      confidence: scoreVendorPrice(firecrawlPrice, windowMedian, prevMedian),
      method: "firecrawl",
    };
  }

  const diff = Math.abs(firecrawlPrice - visionPrice) /
    Math.max(firecrawlPrice, visionPrice);

  let base = diff <= 0.02 ? 90 : diff <= 0.05 ? 70 : 35;
  const visionMod = visionConfidence === "high" ? 5 : visionConfidence === "medium" ? 0 : -10;

  let medianMod = 0;
  if (windowMedian !== null) {
    const deviation = Math.abs(firecrawlPrice - windowMedian) / windowMedian;
    if (deviation <= 0.03) medianMod = 5;
    else if (deviation > 0.08) medianMod = -10;
  }

  let dodMod = 0;
  if (prevMedian !== null) {
    const dayDiff = Math.abs(firecrawlPrice - prevMedian) / prevMedian;
    if (dayDiff > 0.10) dodMod = -15;
  }

  return {
    price: firecrawlPrice,
    confidence: Math.max(0, Math.min(100, base + visionMod + medianMod + dodMod)),
    method: "firecrawl+vision",
  };
}
```

### Step 3: Wire into the per-slug loop

In the confidence scoring loop, replace the `scoreVendorPrice()` call:

```
const visionData = loadVisionData(DATA_DIR, slug);

for (const [vendorId, vendorData] of Object.entries(vendors)) {
  const { price, confidence, method } = mergeVendorWithVision(
    vendorData.price, visionData, vendorId, windowMedian, prevMedian
  );
  vendorData.confidence = confidence;
  vendorData.method = method;  // visible in latest.json for debugging
  confidenceUpdates.push({ coinSlug: slug, vendor: vendorId, windowStart: latestWindow, confidence });
}
```

### Step 4: Verify output

```bash
DATA_DIR=/path/to/data-branch/data node api-export.js
```

Check `data/api/ase/latest.json` — vendors with both sources should show confidence >60 and `method: "firecrawl+vision"`.

### Step 5: Commit

```bash
git add devops/retail-poller/api-export.js
git commit -m "feat(api-export): merge Gemini Vision confidence into vendor scoring"
```

---

## Phase 5 — Wire Vision Pipeline into `run-local.sh`

**Files:**
- Modify: `devops/retail-poller/run-local.sh`

### Step 1: Add vision block after `price-extract.js` call

After `node /app/price-extract.js`, add a non-fatal vision block:

```bash
# Vision pipeline — non-fatal, requires GEMINI_API_KEY + BROWSERLESS_URL
if [ -n "${GEMINI_API_KEY:-}" ] && [ -n "${BROWSERLESS_URL:-}" ]; then
  echo "[$(date -u +%H:%M:%S)] Running vision capture..."
  BROWSER_MODE=browserless \
    ARTIFACT_DIR="${ARTIFACT_DIR:-/tmp/retail-screenshots/$(date -u +%Y-%m-%d)}" \
    DATA_DIR="$DATA_REPO_PATH/data" \
    node /app/capture.js \
    || echo "[$(date -u +%H:%M:%S)] WARN: vision capture failed (non-fatal)"

  echo "[$(date -u +%H:%M:%S)] Running vision extraction..."
  ARTIFACT_DIR="${ARTIFACT_DIR:-/tmp/retail-screenshots/$(date -u +%Y-%m-%d)}" \
    DATA_DIR="$DATA_REPO_PATH/data" \
    node /app/extract-vision.js \
    || echo "[$(date -u +%H:%M:%S)] WARN: vision extraction failed (non-fatal)"
else
  echo "[$(date -u +%H:%M:%S)] Skipping vision pipeline (GEMINI_API_KEY or BROWSERLESS_URL not set)"
fi
```

### Step 2: Test without env vars

Run `run-local.sh` without `GEMINI_API_KEY` — should skip gracefully.

### Step 3: Test with env vars and browserless running

With browserless Docker up and `GEMINI_API_KEY` set — vision block should run.

### Step 4: Commit

```bash
git add devops/retail-poller/run-local.sh
git commit -m "feat(run-local): add non-fatal Gemini Vision pipeline block"
```

---

## Phase 6 — Update Skill

**Files:**
- Modify: `.claude/skills/retail-poller/SKILL.md`
- Modify: `.agents/skills/retail-poller/SKILL.md`

Update "Known SDB Issue" to "SDB Fix Applied (2026-02-20)" with the `preprocessMarkdown()` approach.
Update Vision Pipeline Gap note to reflect the new non-fatal wiring and activation conditions.

Commit:

```bash
git add .claude/skills/retail-poller/SKILL.md .agents/skills/retail-poller/SKILL.md
git commit -m "docs(skill): update retail-poller with SDB fix and vision pipeline status"
```

---

## Phase 7 — UI Disclaimer on Market Prices Page

**Files:**
- Modify: `js/retail.js`

**Goal:** Add a low-key informational banner above the retail coin cards explaining:
1. Prices are best-effort from public data sources (not always real-time)
2. What confidence scores (0–100) mean

Do NOT mention: Firecrawl, scraping cadence, AI, Gemini, Vision, or any implementation detail.

**Disclaimer copy:**
> **Best-effort pricing.** Prices are sourced from public data and updated periodically. They may not reflect real-time availability or credit card pricing. **Confidence scores (0–100)** reflect agreement across data sources: 60 = aligned with the median, 35 = slight outlier, 15 = significant outlier.

### Step 1: Find the retail container in `retail.js`

Search for `renderRetailCards()` or the element that holds coin cards.

### Step 2: Add `renderRetailDisclaimer()` function

```js
function renderRetailDisclaimer(container) {
  if (container.querySelector(".retail-disclaimer")) return; // inject only once
  const el = document.createElement("div");
  el.className = "retail-disclaimer alert alert-secondary d-flex gap-2 mb-3 small py-2";
  el.setAttribute("role", "note");
  const icon = document.createElement("i");
  icon.className = "bi bi-info-circle-fill flex-shrink-0 mt-1";
  icon.setAttribute("aria-hidden", "true");
  const body = document.createElement("div");
  body.textContent = "Best-effort pricing. Prices are sourced from public data and updated periodically. " +
    "They may not reflect real-time availability or credit card pricing. " +
    "Confidence scores (0\u2013100) reflect agreement across data sources: " +
    "60 = aligned with the median, 35 = slight outlier, 15 = significant outlier.";
  el.append(icon, body);
  container.prepend(el);
}
```

Note: Uses `textContent` and DOM append (not innerHTML) to satisfy the StakTrakr XSS policy.
Bold the "Best-effort pricing" and "Confidence scores" labels using separate `<strong>` elements
created via `document.createElement("strong")` if styled emphasis is needed.

### Step 3: Call from `renderRetailCards()`

At the top of the function, after locating the container:

```js
renderRetailDisclaimer(retailContainer);
```

### Step 4: Add optional CSS refinement in `index.html`

If Bootstrap `.alert-secondary` is too prominent in the dark theme:

```css
.retail-disclaimer {
  opacity: 0.8;
  font-size: 0.8125rem;
  border-left: 3px solid var(--bs-secondary);
  border-radius: 0;
  background: transparent;
}
```

### Step 5: Verify visually

Open the app → Market Prices tab. Disclaimer should appear once, above coin cards, subtle enough not to dominate.

### Step 6: Commit

```bash
git add js/retail.js
git commit -m "feat(retail): add best-effort disclaimer and confidence score explanation"
```

---

## Implementation Order

1. **Phase 1** — SDB text fix (highest ROI, unblocks accurate data immediately)
2. **Phase 7** — UI disclaimer (quick win, independent of backend)
3. **Phase 2** — capture.js browserless mode (vision prereq)
4. **Phase 3** — extract-vision.js logging (polish)
5. **Phase 4** — api-export.js vision merge (confidence booster)
6. **Phase 5** — run-local.sh wiring (activates vision in production)
7. **Phase 6** — Skill update (always last)

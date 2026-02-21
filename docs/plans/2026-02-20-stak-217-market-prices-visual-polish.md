# Market Prices Visual Polish (STAK-217) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish the Market Prices settings panel to match the STAK-173 design language — color-coded badges, hover lift, trend indicators, confidence bars, collapsible vendor section, sparklines, and proper empty/loading states.

**Architecture:** All JS changes are in `js/retail.js` (new helpers, updated render). All CSS is additive to `css/styles.css`. `retail-view-modal.js` gets the confidence bar helper. `index.html` gets minor empty-state markup improvement. No new files. No existing functionality removed.

**Tech Stack:** Vanilla JS, CSS custom properties, Chart.js (already loaded globally), Bootstrap 5.

**Design reference:** `docs/plans/2026-02-20-market-prices-redesign-design.md`

**Linear:** STAK-217

---

## Pre-flight: CSS class name audit

The existing CSS block (`css/styles.css:11092-11213`) targets class names that do not match what `retail.js` actually generates. Cards render but look unstyled. Task 1 adds correctly-targeted rules — old rules stay as harmless dead code.

| CSS rule (old, wrong) | JS class name (actual) |
|---|---|
| `.retail-card` | `.retail-price-card` |
| `.retail-card-title` | `.retail-coin-name` |
| `.retail-card-weight` | `.retail-coin-weight` |
| `.retail-card-summary` | `.retail-summary-row` |
| `.retail-card-summary-item` | `.retail-summary-item` |
| `.retail-card-summary-label` | `.retail-label` |
| `.retail-score-dots` | `.retail-vendor-score` |
| `.retail-card-date` | `.retail-data-date` |

---

## Task 1: Fix CSS class name mapping + summary value span

**Files:**
- Modify: `css/styles.css` — add after line 11213 (end of retail block)
- Modify: `js/retail.js:246-255` — wrap value in `<span class="retail-summary-value">`

**Step 1: Add correctly-targeted CSS rules in `css/styles.css`**

Add immediately after the `#retailSyncBtn { }` rule (end of the retail CSS block):

```css
/* STAK-217: Corrected CSS targets matching JS class names */
.retail-price-card {
  background: var(--card-bg, var(--bs-body-bg));
  border: 1px solid var(--border-color, var(--bs-border-color));
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.retail-coin-name  { font-weight: 600; font-size: 0.95rem; }
.retail-coin-weight {
  font-size: 0.8rem;
  color: var(--text-muted, var(--bs-secondary-color));
}
.retail-summary-row { display: flex; gap: 1rem; font-size: 0.85rem; }
.retail-summary-item { display: flex; flex-direction: column; gap: 0.1rem; }
.retail-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--text-muted, var(--bs-secondary-color));
}
.retail-summary-value { font-weight: 600; }
.retail-vendor-score {
  letter-spacing: -0.1em;
  color: var(--text-muted, var(--bs-secondary-color));
  font-size: 0.9rem;
}
.retail-data-date {
  font-size: 0.75rem;
  color: var(--text-muted, var(--bs-secondary-color));
}
.retail-no-data {
  font-size: 0.85rem;
  color: var(--text-muted, var(--bs-secondary-color));
  font-style: italic;
}
```

**Step 2: Wrap summary values in a span in `retail.js`**

In `_buildRetailCard`, the summary forEach appends a raw text node for the value. Wrap it in a span so `.retail-summary-value` applies.

Find the `forEach` that builds summary items (around line 246). Change the value from `document.createTextNode(...)` to:

```js
const valSpan = document.createElement("span");
valSpan.className = "retail-summary-value";
valSpan.textContent = _fmtRetailPrice(val);
item.appendChild(valSpan);
```

(Remove the `document.createTextNode` call from `item.appendChild`.)

**Step 3: Verify**

Open Settings → Market. Cards now show proper border-radius, padding, and bold summary values.

**Step 4: Commit**

```bash
git add css/styles.css js/retail.js
git commit -m "fix(retail): correct CSS class targets to match actual JS class names (STAK-217)"
```

---

## Task 2: Metal badge color coding + emoji

**Files:**
- Modify: `js/retail.js` — add `RETAIL_METAL_EMOJI` const, update badge class + text
- Modify: `css/styles.css`

**Step 1: Add module-level emoji map in `retail.js` (before `_buildRetailCard`)**

```js
/** Metal emoji icons keyed by metal name */
const RETAIL_METAL_EMOJI = { gold: "🥇", silver: "🥈", platinum: "🔷", palladium: "⬜" };
```

**Step 2: Update badge construction in `_buildRetailCard` (around line 225)**

Change the badge className from `retail-metal-badge retail-metal-${meta.metal}`
to `retail-metal-badge retail-metal-badge--${meta.metal}`, and set textContent to include the emoji:

```js
badge.className = `retail-metal-badge retail-metal-badge--${meta.metal}`;
badge.textContent = `${RETAIL_METAL_EMOJI[meta.metal] || ""} ${meta.metal}`;
```

**Step 3: Add CSS for color-coded badges**

```css
/* STAK-217: Metal badge color coding */
.retail-metal-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.retail-metal-badge--gold      { background: rgba(245,158,11,0.15); color: #f59e0b; }
.retail-metal-badge--silver    { background: rgba(139,147,166,0.15); color: #8b93a6; }
.retail-metal-badge--platinum  { background: rgba(6,182,212,0.15);   color: #06b6d4; }
.retail-metal-badge--palladium { background: rgba(148,163,184,0.15); color: #94a3b8; }
```

**Step 4: Verify**

Gold cards show amber pill badge with 🥇, silver = gray with 🥈, platinum = cyan with 🔷.

**Step 5: Commit**

```bash
git add js/retail.js css/styles.css
git commit -m "feat(retail): color-coded metal badges with emoji (STAK-217)"
```

---

## Task 3: Card hover lift effect

**Files:**
- Modify: `css/styles.css`

**Step 1: Add transition + hover rules after `.retail-price-card` base rule**

```css
/* STAK-217: Card hover lift */
.retail-price-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}
.retail-price-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: var(--primary, #3b82f6);
}
```

Note: adding `transition` to the same `.retail-price-card` selector defined in Task 1 is fine — CSS merges matching selectors. Alternatively, add directly to the Task 1 block.

**Step 2: Verify**

Hover over any card. It lifts 2px with a blue border.

**Step 3: Commit**

```bash
git add css/styles.css
git commit -m "feat(retail): card hover lift effect (STAK-217)"
```

---

## Task 4: Trend indicator badge

**Files:**
- Modify: `js/retail.js` — add `_computeRetailTrend()`, render badge after summary row
- Modify: `css/styles.css`

**Step 1: Add helper (before `_buildRetailCard`)**

History entries are stored newest-first (`unshift`), so `history[0]` = latest, `history[1]` = previous.

```js
/**
 * Computes price trend vs. the previous sync entry.
 * @param {string} slug
 * @returns {{ dir: 'up'|'down'|'flat', pct: string }|null}
 */
const _computeRetailTrend = (slug) => {
  const history = retailPriceHistory[slug];
  if (!history || history.length < 2) return null;
  const latest = history[0].average_price;
  const prev = history[1].average_price;
  if (latest == null || prev == null || prev === 0) return null;
  const change = ((latest - prev) / prev) * 100;
  const pct = Math.abs(change).toFixed(1);
  if (change > 0.05) return { dir: "up", pct };
  if (change < -0.05) return { dir: "down", pct };
  return { dir: "flat", pct: "0.0" };
};
```

**Step 2: Render trend badge in `_buildRetailCard` (inside `if (priceData)` block, after `card.appendChild(summary)`)**

```js
const trend = _computeRetailTrend(slug);
if (trend) {
  const trendEl = document.createElement("span");
  const arrow = { up: "↑", down: "↓", flat: "→" }[trend.dir];
  const sign  = trend.dir === "up" ? "+" : trend.dir === "down" ? "-" : "";
  trendEl.className = `retail-trend retail-trend--${trend.dir}`;
  trendEl.textContent = `${arrow} ${sign}${trend.pct}%`;
  card.appendChild(trendEl);
}
```

**Step 3: Add CSS**

```css
/* STAK-217: Trend indicator */
.retail-trend {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  width: fit-content;
}
.retail-trend--up   { background: rgba(16, 185, 129, 0.12); color: #10b981; }
.retail-trend--down { background: rgba(239, 68, 68, 0.12);  color: #ef4444; }
.retail-trend--flat { background: rgba(148, 163, 184, 0.12); color: #94a3b8; }
```

**Step 4: Verify**

After 2+ syncs, trend badge appears under the stats row. With fewer than 2 history entries, no badge is shown.

**Step 5: Commit**

```bash
git add js/retail.js css/styles.css
git commit -m "feat(retail): trend indicator badge vs previous sync (STAK-217)"
```

---

## Task 5: Lowest price highlight

**Files:**
- Modify: `js/retail.js` — compute min price, mark row with `--best` class
- Modify: `css/styles.css`

**Step 1: Compute lowest vendor price before the vendor forEach in `_buildRetailCard`**

```js
const availablePrices = Object.values(priceData.prices_by_site || {}).filter((p) => p != null);
const lowestVendorPrice = availablePrices.length ? Math.min(...availablePrices) : null;
```

**Step 2: Mark the best row inside the vendor forEach**

After `row.className = "retail-vendor-row";`:

```js
if (lowestVendorPrice !== null && price === lowestVendorPrice) {
  row.classList.add("retail-vendor-row--best");
}
```

**Step 3: Add CSS**

```css
/* STAK-217: Best price highlight */
.retail-vendor-row--best .retail-vendor-name::before {
  content: "★ ";
  font-size: 0.7rem;
  color: #10b981;
}
.retail-vendor-row--best .retail-vendor-price {
  color: #10b981;
  font-weight: 700;
}
```

**Step 4: Verify**

The lowest-priced vendor row shows a green ★ before the name and green bold price.

**Step 5: Commit**

```bash
git add js/retail.js css/styles.css
git commit -m "feat(retail): highlight lowest vendor price (STAK-217)"
```

---

## Task 6: Confidence score bars

**Files:**
- Modify: `js/retail.js` — replace `_buildScoreDots` with `_buildConfidenceBar`
- Modify: `js/retail-view-modal.js` — use `_buildConfidenceBar` for score column
- Modify: `css/styles.css`

**Step 1: Replace `_buildScoreDots` with `_buildConfidenceBar` in `retail.js`**

Delete the `_buildScoreDots` function entirely. Add `_buildConfidenceBar` in its place:

```js
/**
 * Builds a 5-segment colored confidence bar element.
 * @param {number|null} score - 0 to 100
 * @returns {HTMLElement}
 */
const _buildConfidenceBar = (score) => {
  const filled = score != null ? Math.min(5, Math.round((score / 100) * 5)) : 0;
  const tier = filled <= 2 ? "low" : filled === 3 ? "mid" : "high";
  const wrap = document.createElement("div");
  wrap.className = `retail-conf-bar retail-conf-bar--${tier}`;
  wrap.title = `Confidence: ${score != null ? `${score}/100` : "unknown"}`;
  for (let i = 0; i < 5; i++) {
    const seg = document.createElement("span");
    seg.className = `retail-conf-seg${i < filled ? " retail-conf-seg--fill" : ""}`;
    wrap.appendChild(seg);
  }
  return wrap;
};
```

**Step 2: Update vendor row in `_buildRetailCard` to use `_buildConfidenceBar`**

Replace the three lines that create `scoreEl` (span + textContent + appendChild) with:

```js
const scoreEl = _buildConfidenceBar(score);
row.appendChild(scoreEl);
```

**Step 3: Update score column in `retail-view-modal.js`**

In `openRetailViewModal`, find the `tdScore` creation and replace the raw score number with the bar:

```js
const tdScore = document.createElement("td");
tdScore.appendChild(_buildConfidenceBar(score));
```

Note: `_buildConfidenceBar` is defined in `retail.js`, which loads before `retail-view-modal.js` in the script order — it is available.

**Step 4: Add CSS**

```css
/* STAK-217: Confidence score bar */
.retail-conf-bar {
  display: inline-flex;
  gap: 2px;
  align-items: center;
}
.retail-conf-seg {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: var(--border-color, #e2e8f0);
}
.retail-conf-bar--low  .retail-conf-seg--fill { background: #ef4444; }
.retail-conf-bar--mid  .retail-conf-seg--fill { background: #f59e0b; }
.retail-conf-bar--high .retail-conf-seg--fill { background: #10b981; }
```

**Step 5: Verify**

Vendor rows now show 5 colored segments (red/yellow/green by score tier). The retail view modal's Confidence column also shows segments instead of the raw number.

**Step 6: Commit**

```bash
git add js/retail.js js/retail-view-modal.js css/styles.css
git commit -m "feat(retail): 5-segment confidence bar replaces Unicode dots (STAK-217)"
```

---

## Task 7: Collapsible vendor section

**Files:**
- Modify: `js/retail.js` — wrap vendor div in `<details>/<summary>`
- Modify: `css/styles.css`

**Step 1: Wrap vendor list in `<details>` in `_buildRetailCard`**

Replace the vendor section block. Instead of building `vendors` (a plain div) and calling `card.appendChild(vendors)`, do this:

```js
const vendorDetails = document.createElement("details");
vendorDetails.className = "retail-vendor-details";

const vendorSummary = document.createElement("summary");
vendorSummary.className = "retail-vendor-summary";
vendorDetails.appendChild(vendorSummary);

const vendors = document.createElement("div");
vendors.className = "retail-vendors";

Object.entries(RETAIL_VENDOR_NAMES).forEach(([key, label]) => {
  // ... same row-building code as before ...
  vendors.appendChild(row);
});

const count = vendors.children.length;
vendorSummary.textContent = `${count} vendor${count !== 1 ? "s" : ""}`;
vendorDetails.appendChild(vendors);
card.appendChild(vendorDetails);
// (do NOT also call card.appendChild(vendors))
```

**Step 2: Add CSS**

```css
/* STAK-217: Collapsible vendor section */
.retail-vendor-details { margin-top: 0.25rem; }
.retail-vendor-summary {
  cursor: pointer;
  list-style: none;
  font-size: 0.78rem;
  color: var(--text-muted, var(--bs-secondary-color));
  padding: 0.2rem 0;
  user-select: none;
}
.retail-vendor-summary::-webkit-details-marker { display: none; }
.retail-vendor-summary::before {
  content: "› ";
  display: inline-block;
  transition: transform 0.15s;
}
.retail-vendor-details[open] .retail-vendor-summary::before {
  transform: rotate(90deg);
}
```

**Step 3: Verify**

Each card shows "N vendors" text with a › toggle. Clicking expands the vendor list. Collapsed by default.

**Step 4: Commit**

```bash
git add js/retail.js css/styles.css
git commit -m "feat(retail): collapsible vendor section via details element (STAK-217)"
```

---

## Task 8: Loading skeleton cards

**Files:**
- Modify: `js/retail.js` — add `_retailSyncInProgress` flag, `_buildSkeletonCard`, update `syncRetailPrices` and `renderRetailCards`
- Modify: `css/styles.css`

**Step 1: Add state flag (in State section, after `let retailPriceHistory = {};`)**

```js
/** True while syncRetailPrices() is running — triggers skeleton render */
let _retailSyncInProgress = false;
```

**Step 2: Set flag at the start of `syncRetailPrices`**

Immediately after `syncBtn.disabled = true;` and `syncBtn.textContent = "Syncing…";`:

```js
_retailSyncInProgress = true;
renderRetailCards();  // show skeletons right away
```

In the `finally` block, before re-enabling the button:

```js
_retailSyncInProgress = false;
```

The `renderRetailCards()` call inside the `try` block (on success) will replace skeletons with real cards.

**Step 3: Add `_buildSkeletonCard` (before `renderRetailCards`)**

```js
/**
 * Builds a shimmer skeleton placeholder card for the loading state.
 * @returns {HTMLElement}
 */
const _buildSkeletonCard = () => {
  const card = document.createElement("div");
  card.className = "retail-price-card retail-price-card--skeleton";
  ["retail-skel retail-skel--title", "retail-skel retail-skel--stats", "retail-skel retail-skel--vendors"].forEach((cls) => {
    const el = document.createElement("div");
    el.className = cls;
    card.appendChild(el);
  });
  return card;
};
```

**Step 4: Add skeleton render path at the start of `renderRetailCards`**

Right after the `grid.innerHTML = "";` line (note: use `textContent = ""` or `replaceChildren()` if preferred for clarity, but `innerHTML = ""` is existing pattern), add:

```js
if (_retailSyncInProgress) {
  RETAIL_SLUGS.forEach(() => grid.appendChild(_buildSkeletonCard()));
  return;
}
```

**Step 5: Add CSS**

```css
/* STAK-217: Loading skeleton shimmer */
@keyframes retail-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.retail-skel {
  background: linear-gradient(
    90deg,
    var(--bg-secondary, #f1f5f9) 25%,
    var(--border-color, #e2e8f0) 50%,
    var(--bg-secondary, #f1f5f9) 75%
  );
  background-size: 200% 100%;
  animation: retail-shimmer 1.4s infinite;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}
.retail-skel--title   { height: 1.2rem; width: 65%; }
.retail-skel--stats   { height: 2.5rem; width: 100%; }
.retail-skel--vendors { height: 3.5rem; width: 85%; }
```

**Step 6: Verify**

Click Sync Now. Skeleton cards appear instantly (shimmer animation). Real cards replace them after sync completes.

**Step 7: Commit**

```bash
git add js/retail.js css/styles.css
git commit -m "feat(retail): shimmer skeleton cards during sync (STAK-217)"
```

---

## Task 9: No-data empty state

**Files:**
- Modify: `index.html` — improve `#retailEmptyState` markup (around line 3515)
- Modify: `js/retail.js` — show/hide empty state in `renderRetailCards`
- Modify: `css/styles.css`

**Step 1: Update empty state HTML in `index.html`**

Replace the existing `#retailEmptyState` div:
```html
<div id="retailEmptyState" class="settings-empty-state" style="display: none">
  <p>No market data yet. Click <strong>Sync Now</strong> to load current retail prices.</p>
</div>
```

With:
```html
<div id="retailEmptyState" class="retail-empty-state" style="display: none">
  <div class="retail-empty-icon">📊</div>
  <p class="retail-empty-title">No market prices yet</p>
  <p class="retail-empty-desc">Sync to load current bullion retail prices from APMEX, Monument, SDB, and JM Bullion.</p>
  <button class="retail-sync-cta" type="button" onclick="syncRetailPrices()">Sync Now</button>
</div>
```

**Step 2: Show/hide empty state in `renderRetailCards`**

After the `_retailSyncInProgress` early-return block:

```js
const emptyState = safeGetElement("retailEmptyState");
const hasData = retailPrices && retailPrices.prices && Object.keys(retailPrices.prices).length > 0;
emptyState.style.display = hasData ? "none" : "";
if (!hasData) return;
```

**Step 3: Add CSS**

```css
/* STAK-217: No-data empty state */
.retail-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 3rem 1rem;
  text-align: center;
  color: var(--text-muted, var(--bs-secondary-color));
}
.retail-empty-icon { font-size: 2.5rem; }
.retail-empty-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary, var(--bs-body-color));
}
.retail-empty-desc { font-size: 0.85rem; margin: 0; }
.retail-sync-cta {
  margin-top: 0.5rem;
  padding: 0.4rem 1.2rem;
  border-radius: 999px;
  background: var(--primary, #3b82f6);
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: opacity 0.2s;
}
.retail-sync-cta:hover { opacity: 0.85; }
```

**Step 4: Verify**

Clear retail data from localStorage, reload. The empty state shows with the 📊 icon and Sync Now CTA. After a successful sync, the empty state hides and cards appear.

**Step 5: Commit**

```bash
git add js/retail.js index.html css/styles.css
git commit -m "feat(retail): no-data empty state with sync CTA (STAK-217)"
```

---

## Task 10: Sparkline micro-chart

**Files:**
- Modify: `js/retail.js` — add `_retailSparklines` Map, `_renderRetailSparkline()`, canvas in footer, render call in `renderRetailCards`
- Modify: `css/styles.css`

**Step 1: Add sparkline Map to State section**

```js
/** Active sparkline Chart instances keyed by slug — destroyed before re-render */
const _retailSparklines = new Map();
```

**Step 2: Add canvas to card footer in `_buildRetailCard`**

In the footer section, after `footer.appendChild(dateSpan)`:

```js
const sparkCanvas = document.createElement("canvas");
sparkCanvas.id = `retail-spark-${slug}`;
sparkCanvas.className = "retail-sparkline";
sparkCanvas.width = 80;
sparkCanvas.height = 28;
footer.appendChild(sparkCanvas);
```

**Step 3: Add `_renderRetailSparkline` (before `renderRetailCards`)**

Important: Canvas 2D does not support CSS custom properties, so use a literal hex color.

```js
/**
 * Renders a 7-entry price sparkline on a card's canvas.
 * Destroys any prior Chart instance to prevent Canvas reuse errors.
 * @param {string} slug
 */
const _renderRetailSparkline = (slug) => {
  const canvas = safeGetElement(`retail-spark-${slug}`);
  if (!(canvas instanceof HTMLCanvasElement) || typeof Chart === "undefined") return;
  const history = (retailPriceHistory[slug] || []).slice(0, 7).reverse();
  const data = history.map((e) => e.average_price).filter((v) => v != null);
  if (data.length < 2) return;
  if (_retailSparklines.has(slug)) {
    _retailSparklines.get(slug).destroy();
  }
  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: Array(data.length).fill(""),
      datasets: [{
        data,
        borderColor: "#3b82f6",
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.3,
        fill: false,
      }],
    },
    options: {
      responsive: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } },
      animation: false,
    },
  });
  _retailSparklines.set(slug, chart);
};
```

**Step 4: Call sparklines in `renderRetailCards` after all cards are in the DOM**

After the `RETAIL_SLUGS.forEach((slug) => { grid.appendChild(...) })` loop:

```js
RETAIL_SLUGS.forEach((slug) => _renderRetailSparkline(slug));
```

The canvas must be in the DOM before Chart.js can render — this sequencing is correct because `appendChild` runs first.

**Step 5: Add CSS**

```css
/* STAK-217: Sparkline micro-chart */
.retail-sparkline {
  display: block;
  margin-left: auto;
  opacity: 0.75;
}
```

**Step 6: Verify**

After 2+ syncs, a compact blue line chart appears in each card footer. Cards with fewer than 2 history entries show no sparkline. Re-syncing replaces sparklines cleanly (no "Canvas already in use" error in console).

**Step 7: Commit**

```bash
git add js/retail.js css/styles.css
git commit -m "feat(retail): 7-entry sparkline micro-chart in card footer (STAK-217)"
```

---

## Task 11: Smoke test + verification

**Step 1: Start local server**

```bash
npx serve /Volumes/DATA/GitHub/StakTrakr -p 8765
```

**Step 2: Run existing Playwright tests**

```bash
cd devops/browserless && docker compose up -d
BROWSER_BACKEND=browserless TEST_URL=http://host.docker.internal:8765 npm test
```

Expected: All existing tests pass. No new console errors.

**Step 3: Manual visual checklist**

Open `http://localhost:8765`, go to Settings → Market.

**Without synced data:**
- [ ] Empty state: 📊 icon, "No market prices yet", Sync Now CTA button

**Immediately after clicking Sync Now:**
- [ ] Skeleton shimmer cards appear while fetching

**After sync completes:**
- [ ] Gold badges: amber pill with 🥇 emoji
- [ ] Silver badges: gray pill with 🥈 emoji
- [ ] Platinum badges: cyan pill with 🔷 emoji
- [ ] Cards lift 2px on hover with blue border
- [ ] Vendor list collapsed under "N vendors" toggle with › arrow
- [ ] Expanding vendor list shows confidence bars (colored segments)
- [ ] Lowest-price vendor: green ★ prefix + green bold price
- [ ] (After 2+ syncs) Trend badge under stats row (↑/↓/→ with %)
- [ ] (After 2+ syncs) Sparkline in card footer

**Step 4: Update STAK-217 status in Linear**

Set to Done when all visual checks pass.

---

## Execution options

**Plan complete and saved to `docs/plans/2026-02-20-stak-217-market-prices-visual-polish.md`.**

**1. Subagent-Driven (this session)** — Invoke `superpowers:subagent-driven-development`. Fresh subagent per task, orchestrator reviews between tasks.

**2. Parallel Session (separate)** — Open new session in this worktree, use `superpowers:executing-plans` for batch execution with checkpoints.

Which approach?

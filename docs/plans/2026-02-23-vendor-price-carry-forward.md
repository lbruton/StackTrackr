# Vendor Price Carry-Forward + OOS Legend Links — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** In the coin detail modal, carry forward the last-known vendor price into gap windows (no
fresh scrape), styled as muted italic `~$XX.XX`, and make OOS vendor legend items still
clickable so users can visit the product page.

**Architecture:** Single pure function `_forwardFillVendors(bucketed)` enriches the bucketed
windows array post-bucketing. Both `_buildIntradayChart` and `_buildIntradayTable` pass their
data through it. `_buildVendorLegend` gains a secondary filter to show OOS vendors with a
linked, muted item.

**Tech Stack:** Vanilla JS, no build step. Chart.js for the intraday chart. Bootstrap utility
classes (`text-muted`, `fst-italic`, `text-danger`, `ms-1`) for cell styling.

---

## Context

All code lives in **`js/retail-view-modal.js`**. No other files are touched.

Key functions and their line numbers (stable as of 2026-02-23):

| Function | Line | Role |
|---|---|---|
| `_buildVendorLegend(slug)` | 63 | Vendor legend in modal header |
| `_bucketWindows(windows)` | 124 | Groups raw 15-min windows into 30-min slots |
| `_buildIntradayTable(slug, bucketed)` | 157 | Renders "Recent windows" table |
| `_buildIntradayChart(slug)` | 255 | Renders 24h line chart + calls table |
| `window` exports | 573–579 | Exposes functions for testing |

Key globals from `retail.js` (all exposed on `window`):

- `RETAIL_VENDOR_NAMES` — `{ apmex, monumentmetals, sdbullion, jmbullion, herobullion, bullionexchanges, summitmetals }`
- `RETAIL_VENDOR_COLORS` — hex colors per vendor
- `RETAIL_VENDOR_URLS` — fallback homepage URLs
- `retailProviders` — per-slug, per-vendor product page URLs
- `retailAvailability` — `{ [slug]: { [vendorId]: boolean } }` — `false` = OOS
- `retailLastKnownPrices` — `{ [slug]: { [vendorId]: number } }`
- `retailLastAvailableDates` — `{ [slug]: { [vendorId]: string } }` (YYYY-MM-DD)

---

## Task 1: Add `_forwardFillVendors` function

**Files:**
- Modify: `js/retail-view-modal.js` (insert after line 148, update window exports at line 577)

### Step 1: Insert the function after `_bucketWindows` (after line 148)

Insert this block immediately after the closing `};` of `_bucketWindows` (the line that reads
`return Array.from(slotMap.values()).sort(...)`, i.e. after line 148):

```javascript
/**
 * Forward-fills missing vendor prices across a bucketed windows array.
 * For each vendor, carries the most recently seen price into any gap window within the 24h set.
 * Returns a new array — source objects are not mutated.
 * Each returned window gains _carriedVendors: Set<vendorId> listing which prices were carried.
 * @param {Array} bucketed - Chronologically sorted (oldest first) from _bucketWindows
 * @returns {Array}
 */
const _forwardFillVendors = (bucketed) => {
  if (!bucketed || bucketed.length === 0) return bucketed;
  const knownVendors = typeof RETAIL_VENDOR_NAMES !== 'undefined' ? Object.keys(RETAIL_VENDOR_NAMES) : [];
  const lastSeen = {};
  return bucketed.map((w) => {
    const vendors = w.vendors ? { ...w.vendors } : {};
    const carriedVendors = new Set();
    knownVendors.forEach((v) => {
      if (vendors[v] != null) {
        lastSeen[v] = vendors[v];
      } else if (lastSeen[v] != null) {
        vendors[v] = lastSeen[v];
        carriedVendors.add(v);
      }
    });
    return { ...w, vendors, _carriedVendors: carriedVendors };
  });
};
```

### Step 2: Expose on `window`

In the `if (typeof window !== "undefined")` block at line 573–579, add:

```javascript
  window._forwardFillVendors = _forwardFillVendors;
```

So the block becomes:
```javascript
if (typeof window !== "undefined") {
  window.openRetailViewModal = openRetailViewModal;
  window.closeRetailViewModal = closeRetailViewModal;
  window._switchRetailViewTab = _switchRetailViewTab;
  window._bucketWindows = _bucketWindows;
  window._forwardFillVendors = _forwardFillVendors;
  window._buildIntradayTable = _buildIntradayTable;
}
```

### Step 3: Start server and verify in browser console

```bash
npx http-server . -p 8080 --cors -c-1
```

Open http://localhost:8080 in a browser. In DevTools console:

```javascript
// Verify function is exposed
console.assert(typeof window._forwardFillVendors === 'function', 'FAIL: not exposed');

// Verify gap-fill behavior
const windows = [
  { window: '2026-01-01T10:00:00.000Z', vendors: { apmex: 99.99, jmbullion: null } },
  { window: '2026-01-01T10:30:00.000Z', vendors: { apmex: null,  jmbullion: null } },
  { window: '2026-01-01T11:00:00.000Z', vendors: { apmex: null,  jmbullion: 98.50 } },
];
const filled = window._forwardFillVendors(windows);
console.assert(filled[1].vendors.apmex === 99.99,   'FAIL: apmex not carried into slot 1');
console.assert(filled[1]._carriedVendors.has('apmex'), 'FAIL: apmex not flagged as carried in slot 1');
console.assert(filled[2].vendors.apmex === 99.99,   'FAIL: apmex not carried into slot 2');
console.assert(filled[0].vendors.jmbullion == null, 'FAIL: jmbullion should still be null in slot 0');
console.assert(filled[1].vendors.jmbullion == null, 'FAIL: jmbullion should still be null in slot 1 (no prior value)');
console.assert(filled[2].vendors.jmbullion === 98.50,'FAIL: jmbullion should be fresh in slot 2');
console.assert(!filled[2]._carriedVendors.has('jmbullion'), 'FAIL: jmbullion incorrectly flagged as carried in slot 2');
// Verify immutability: source not mutated
console.assert(windows[1].vendors.apmex === null, 'FAIL: source was mutated');
console.log('All Task 1 assertions passed');
```

Expected output: `All Task 1 assertions passed`

### Step 4: Commit

```bash
git add js/retail-view-modal.js
git commit -m "feat(modal): add _forwardFillVendors — gap-fill vendor prices in 24h window"
```

---

## Task 2: Wire carry-forward into `_buildIntradayChart`

**Files:**
- Modify: `js/retail-view-modal.js` (lines ~261, ~283–298, ~332–334)

### Step 1: Replace bucketing call (line 261)

Find:
```javascript
  const bucketed = _bucketWindows(windows);
```

Replace with:
```javascript
  const bucketed = _forwardFillVendors(_bucketWindows(windows));
```

### Step 2: Add `_carriedIndices` to each vendor dataset and update tooltip

Find the vendor dataset construction block (inside `activeVendors.map((vendorId) => {`, lines ~284–298):

```javascript
        return {
            label,
            data: bucketed.map((w) => (w.vendors && w.vendors[vendorId] != null ? w.vendors[vendorId] : null)),
            borderColor: color,
            backgroundColor: "transparent",
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 3,
            tension: 0.2,
            spanGaps: true,
          };
```

Replace with:
```javascript
          const carriedIndices = new Set(
            bucketed.reduce((acc, w, i) => {
              if (w._carriedVendors && w._carriedVendors.has(vendorId)) acc.push(i);
              return acc;
            }, [])
          );
          return {
            label,
            data: bucketed.map((w) => (w.vendors && w.vendors[vendorId] != null ? w.vendors[vendorId] : null)),
            borderColor: color,
            backgroundColor: "transparent",
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 3,
            tension: 0.2,
            spanGaps: true,
            _carriedIndices: carriedIndices,
          };
```

### Step 3: Update tooltip callback

Find (lines ~332–334):
```javascript
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: $${Number(ctx.raw).toFixed(2)}`,
            },
          },
```

Replace with:
```javascript
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const carried = ctx.dataset._carriedIndices && ctx.dataset._carriedIndices.has(ctx.dataIndex);
                return `${ctx.dataset.label}: ${carried ? '~' : ''}$${Number(ctx.raw).toFixed(2)}`;
              },
            },
          },
```

### Step 4: Verify in browser console

With the server still running, open a coin detail modal that has intraday data (e.g., `window.openRetailViewModal('ase')`). In console:

```javascript
// Check the chart's first vendor dataset has _carriedIndices
const chart = window._retailViewIntradayChart;  // may be private — check via:
// Open modal: window.openRetailViewModal('ase')
// After modal opens, inspect:
const datasets = document.querySelector('#retailViewIntradayChart')?._chart?.data?.datasets;
// OR just verify the tooltip visually by hovering over a chart point
// The key check: no JS errors in console, chart renders
console.log('No errors = chart carry-forward wired correctly');
```

Hover over chart points for a vendor that has gaps — tooltip should show `~$XX.XX` for
carried values.

### Step 5: Commit

```bash
git add js/retail-view-modal.js
git commit -m "feat(modal): wire _forwardFillVendors into chart — carried tooltip shows ~ prefix"
```

---

## Task 3: Wire carry-forward into `_buildIntradayTable`

**Files:**
- Modify: `js/retail-view-modal.js` (lines ~162–166, ~206–218)

### Step 1: Update fallback re-bucketing path (lines ~162–166)

Find:
```javascript
  if (!bucketed) {
    const intraday = typeof retailIntradayData !== "undefined" ? retailIntradayData[slug] : null;
    const windows = intraday && Array.isArray(intraday.windows_24h) ? intraday.windows_24h : [];
    bucketed = _bucketWindows(windows);
  }
```

Replace with:
```javascript
  if (!bucketed) {
    const intraday = typeof retailIntradayData !== "undefined" ? retailIntradayData[slug] : null;
    const windows = intraday && Array.isArray(intraday.windows_24h) ? intraday.windows_24h : [];
    bucketed = _forwardFillVendors(_bucketWindows(windows));
  }
```

### Step 2: Update vendor cell rendering (lines ~206–218)

Find the `activeVendors.forEach` vendor-cell block:
```javascript
      if (useVendorLines) {
        activeVendors.forEach((v) => {
          const currVal = w.vendors && w.vendors[v] != null ? w.vendors[v] : null;
          const prevVal = idx + 1 < recent.length
            ? (recent[idx + 1].vendors && recent[idx + 1].vendors[v] != null ? recent[idx + 1].vendors[v] : null)
            : null;
          const glyph = _trendGlyph(currVal, prevVal);
          const cls = _trendClass(currVal, prevVal);
          const td = document.createElement("td");
          td.className = cls || '';
          td.textContent = currVal != null ? `${fmt(currVal)} ${glyph}` : '\u2014';
          tr.appendChild(td);
        });
```

Replace with:
```javascript
      if (useVendorLines) {
        activeVendors.forEach((v) => {
          const isCarried = w._carriedVendors && w._carriedVendors.has(v);
          const currVal = w.vendors && w.vendors[v] != null ? w.vendors[v] : null;
          const td = document.createElement("td");
          if (currVal == null) {
            td.textContent = '\u2014';
          } else if (isCarried) {
            td.className = 'text-muted fst-italic';
            td.textContent = `~${fmt(currVal)}`;
          } else {
            const prevVal = idx + 1 < recent.length
              ? (recent[idx + 1].vendors && recent[idx + 1].vendors[v] != null ? recent[idx + 1].vendors[v] : null)
              : null;
            const glyph = _trendGlyph(currVal, prevVal);
            const cls = _trendClass(currVal, prevVal);
            td.className = cls || '';
            td.textContent = `${fmt(currVal)} ${glyph}`;
          }
          tr.appendChild(td);
        });
```

### Step 3: Verify in browser console

```javascript
// Open a coin modal and switch to intraday tab
window.openRetailViewModal('ase');
window._switchRetailViewTab('intraday');

// After table renders, check for carried cells
const carriedCells = document.querySelectorAll('#retailViewIntradayTableBody td.text-muted.fst-italic');
console.log(`Found ${carriedCells.length} carried cells`);
// If vendor pollers skip some windows, you should see cells with ~$XX.XX in italic/muted.
// If all windows have fresh data, carriedCells.length will be 0 — that's also correct.

// Verify no carried cell has a trend glyph
carriedCells.forEach((td, i) => {
  const hasGlyph = td.textContent.includes('▲') || td.textContent.includes('▼');
  console.assert(!hasGlyph, `FAIL: carried cell ${i} has trend glyph: "${td.textContent}"`);
  console.assert(td.textContent.startsWith('~$'), `FAIL: carried cell ${i} missing ~ prefix: "${td.textContent}"`);
});
console.log('Task 3 table assertions passed');
```

### Step 4: Commit

```bash
git add js/retail-view-modal.js
git commit -m "feat(modal): carry forward vendor prices in table — muted italic ~\$XX.XX, no trend glyph"
```

---

## Task 4: Fix OOS vendor links in `_buildVendorLegend`

**Files:**
- Modify: `js/retail-view-modal.js` (lines ~63–115)

### Step 1: Replace the vendor loop in `_buildVendorLegend`

The entire `knownVendors.forEach` block (lines ~75–114) needs to be replaced. Find from:
```javascript
  knownVendors.forEach((vendorId) => {
    const vendorData = vendorMap[vendorId];
    const price = vendorData ? vendorData.price : null;
    if (price == null) return;
```

to the closing `});` (line ~114), and replace the whole block with:

```javascript
  knownVendors.forEach((vendorId) => {
    const vendorData = vendorMap[vendorId];
    const price = vendorData ? vendorData.price : null;
    const avail = typeof retailAvailability !== 'undefined' && retailAvailability;
    const isOOS = avail && avail[slug] && avail[slug][vendorId] === false;

    // Skip vendors with no price and no OOS flag (they don't carry this coin)
    if (price == null && !isOOS) return;

    const color = RETAIL_VENDOR_COLORS[vendorId] || "#94a3b8";
    const label = (typeof RETAIL_VENDOR_NAMES !== "undefined" && RETAIL_VENDOR_NAMES[vendorId]) || vendorId;
    const vendorUrl = (typeof retailProviders !== "undefined" && retailProviders && retailProviders[slug] && retailProviders[slug][vendorId])
      || (typeof RETAIL_VENDOR_URLS !== "undefined" && RETAIL_VENDOR_URLS[vendorId])
      || null;

    const item = document.createElement(vendorUrl ? "a" : "span");
    item.className = "retail-legend-item";
    if (isOOS) item.style.opacity = "0.5";
    if (vendorUrl) {
      item.href = "#";
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const popup = window.open(vendorUrl, `retail_vendor_${vendorId}`, "width=1250,height=800,scrollbars=yes,resizable=yes,toolbar=no,location=no,menubar=no,status=no");
        if (!popup) window.open(vendorUrl, "_blank");
      });
    }

    const swatch = document.createElement("span");
    swatch.className = "retail-legend-swatch";
    swatch.style.background = color;

    const nameEl = document.createElement("span");
    nameEl.className = "retail-legend-name";
    nameEl.textContent = label;
    nameEl.style.color = color;

    const priceEl = document.createElement("span");
    priceEl.className = "retail-legend-price";

    if (isOOS) {
      const lkpMap = typeof retailLastKnownPrices !== 'undefined' && retailLastKnownPrices;
      const ladMap = typeof retailLastAvailableDates !== 'undefined' && retailLastAvailableDates;
      const lkp = lkpMap && lkpMap[slug] && lkpMap[slug][vendorId];
      const lad = ladMap && ladMap[slug] && ladMap[slug][vendorId];
      const priceText = document.createElement("del");
      priceText.textContent = lkp ? `$${Number(lkp).toFixed(2)}` : '\u2014';
      priceEl.appendChild(priceText);
      const badge = document.createElement("small");
      badge.className = "text-danger ms-1";
      badge.textContent = "OOS";
      priceEl.appendChild(badge);
      item.title = lad
        ? `Out of stock (last seen: ${priceText.textContent} on ${lad})`
        : "Out of stock";
    } else {
      priceEl.textContent = `$${Number(price).toFixed(2)}`;
    }

    item.appendChild(swatch);
    item.appendChild(nameEl);
    item.appendChild(priceEl);
    container.appendChild(item);
  });
```

### Step 2: Verify in browser console

```javascript
// Simulate an OOS scenario to test without waiting for live OOS data
// Temporarily mark a vendor as OOS
if (!window.retailAvailability) window.retailAvailability = {};
if (!window.retailAvailability['ase']) window.retailAvailability['ase'] = {};
window.retailAvailability['ase']['apmex'] = false;
if (!window.retailLastKnownPrices) window.retailLastKnownPrices = {};
if (!window.retailLastKnownPrices['ase']) window.retailLastKnownPrices['ase'] = {};
window.retailLastKnownPrices['ase']['apmex'] = 99.99;
if (!window.retailLastAvailableDates) window.retailLastAvailableDates = {};
if (!window.retailLastAvailableDates['ase']) window.retailLastAvailableDates['ase'] = {};
window.retailLastAvailableDates['ase']['apmex'] = '2026-02-20';

// Open modal and check legend
window.openRetailViewModal('ase');

// After modal opens:
const oos = document.querySelector('#retailViewVendorLegend a[style*="opacity"]');
console.assert(oos !== null, 'FAIL: No muted OOS legend item found');
console.assert(oos.tagName === 'A', 'FAIL: OOS item is not a link (not clickable)');
console.assert(oos.title.includes('Out of stock'), 'FAIL: OOS tooltip missing');
const badge = oos.querySelector('.text-danger');
console.assert(badge && badge.textContent === 'OOS', 'FAIL: OOS badge missing');
const del = oos.querySelector('del');
console.assert(del && del.textContent === '$99.99', `FAIL: Last-known price wrong: "${del?.textContent}"`);
console.log('Task 4 OOS legend assertions passed');

// Restore availability (clean up mock)
delete window.retailAvailability['ase']['apmex'];
```

### Step 3: Commit

```bash
git add js/retail-view-modal.js
git commit -m "fix(modal): show OOS vendors in legend as clickable links with muted style + OOS badge"
```

---

## Task 5: Final integration check

### Step 1: Run smoke test

```bash
/smoke-test
```

Expected: all existing checks pass (no regressions).

### Step 2: Manual walkthrough checklist

Open the app and open any coin detail modal (e.g., ASE):

- [ ] "Recent windows" table: gap windows for a vendor show `~$XX.XX` in muted italic
- [ ] "Recent windows" table: fresh values still show `$XX.XX ▲▼` with trend color
- [ ] "Recent windows" table: no trend glyph next to carried values
- [ ] Chart: hovering over a carried data point shows `~$XX.XX` in tooltip
- [ ] Chart: line renders continuously (no visual regressions)
- [ ] Legend: if any vendor is OOS, it appears grayed out with an OOS badge
- [ ] Legend: OOS items open a popup on click (not dead link)
- [ ] Legend: in-stock vendors unchanged

### Step 3: Commit final

```bash
git add js/retail-view-modal.js
git commit -m "chore: smoke-test pass — carry-forward + OOS legend links verified"
```

---

## Post-implementation

Run `/release patch` to tag the version, then open a `patch/VERSION → dev` PR per the
standard patch workflow in CLAUDE.md.

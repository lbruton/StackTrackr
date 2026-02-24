# Design: Vendor Price Carry-Forward + OOS Legend Links

**Date:** 2026-02-23
**Status:** Approved
**File scope:** `js/retail-view-modal.js` only

---

## Problem

In the coin detail modal (24h chart + "Recent windows" table), vendor prices show `—` for
windows where that vendor's poller did not run. Users lose context of where prices stand
between scrape intervals. Additionally, vendors that are out of stock are completely hidden
from the legend — users cannot click through to the product page to check availability.

---

## Feature 1 — Vendor Price Carry-Forward

### Data enrichment layer

New pure function `_forwardFillVendors(bucketed)` inserted after `_bucketWindows` (~line 149).

**Algorithm:**

```
lastSeen = {}
for each window in bucketed (oldest → newest):
  for each vendorId in RETAIL_VENDOR_NAMES:
    if window.vendors[vendorId] != null:
      lastSeen[vendorId] = window.vendors[vendorId]   // fresh
    else if lastSeen[vendorId] != null:
      window.vendors[vendorId] = lastSeen[vendorId]   // carry forward
      window._carriedVendors.add(vendorId)
```

- Returns a **new array** — never mutates source data
- Each window object gains `_carriedVendors: Set<vendorId>`
- 24h reset is implicit — bucketed array never exceeds 24h
- Exposed on `window._forwardFillVendors` for testability

### Chart changes (`_buildIntradayChart`)

Replace:
```js
const bucketed = _bucketWindows(windows);
```
with:
```js
const bucketed = _forwardFillVendors(_bucketWindows(windows));
```

Each vendor dataset gets a `_carriedIndices: Set<number>` built from the bucketed array.
Tooltip callback prefixes carried values with `~`:

```js
label: (ctx) => {
  const carried = ctx.dataset._carriedIndices?.has(ctx.dataIndex);
  return `${ctx.dataset.label}: ${carried ? '~' : ''}$${Number(ctx.raw).toFixed(2)}`;
}
```

### Table changes (`_buildIntradayTable`)

The fallback re-bucketing path also passes through `_forwardFillVendors`.

In the vendor cell loop, check `w._carriedVendors.has(v)`:

- **Carried:** render `~$XX.XX` with `text-muted fst-italic` class, no trend glyph
- **Fresh:** existing behavior — `$XX.XX ▲▼—` with trend class unchanged

---

## Feature 2 — OOS Vendor Links in Legend

### Current behavior

`_buildVendorLegend` at line 78: `if (price == null) return;` — completely skips OOS vendors.

### Fix

Replace the hard skip with a filter that mirrors the main retail panel (retail.js:688):

- **Show** if vendor has a current price (in stock)
- **Show** if `retailAvailability[slug][vendorId] === false` (explicitly OOS)
- **Skip** if no price AND no OOS flag (vendor does not carry this coin)

For OOS legend items:

- Rendered as `<a>` (clickable popup) if `vendorUrl` exists — **this is the key fix**
- Visual style: `opacity: 0.5` on the item
- Price element shows last-known price in `<del>` (from `retailLastKnownPrices[slug][vendorId]`)
  + `"OOS"` badge in `text-danger`
- `title` attribute: `"Out of stock (last seen: $XX.XX on YYYY-MM-DD)"` using
  `retailLastAvailableDates[slug][vendorId]`

All three globals (`retailAvailability`, `retailLastKnownPrices`, `retailLastAvailableDates`)
are already exposed on `window` from `retail.js`.

---

## Scope

| File | Change |
|------|--------|
| `js/retail-view-modal.js` | All changes — both features |

No other files touched. No new storage keys. No changes to bucketing contract.

---

## Decisions

| Question | Decision |
|----------|----------|
| Apply carry-forward to chart? | Yes — both chart and table |
| Visual style for carried values | Muted italic + `~` prefix |
| Trend glyph on carried rows | Suppressed |
| OOS vendor link behavior | Clickable popup if URL available, muted style |

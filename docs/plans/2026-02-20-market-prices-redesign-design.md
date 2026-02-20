# Market Prices Cards — Visual Redesign Design Document

**Date**: 2026-02-20
**Status**: Approved (design spec)
**Linear issue**: STAK-217
**Stitch session**: Unavailable (OAuth not configured); design derived from plan spec.

---

## Overview

The Market Prices page (`js/retail.js` + `js/retail-view-modal.js`) shipped in week 8 as
functionally complete but visually bare. This document specifies the visual polish pass to align
cards with the design language introduced in STAK-173 (add/edit item modal): glassmorphic overlays,
pill buttons, CSS variable system.

---

## Design Language Baseline (from STAK-173)

| Property | Value |
|---|---|
| Card border-radius | `8px` |
| Button shape | Pill — `border-radius: 999px` |
| Primary color | `--primary: #3b82f6` |
| Card bg (light) | `#f8fafc` |
| Card border (light) | `1px solid #cbd5e1` |
| Card bg (dark) | `rgba(255,255,255,0.03)` |
| Card border (dark) | `1px solid rgba(255,255,255,0.1)` |
| Muted text | `var(--text-muted)` |
| Transition | `all 0.2s ease` |

---

## Component Specifications

### 1. Section Header

**Current**: bare h3 + inline sync button.

**Target layout** (single flex row):

```
[ Market Prices (h3) ]   [ Last synced: Feb 20, 2026 8:59 AM (muted) ]   [ Sync Now (pill btn, primary) ]
```

CSS:
```css
.retail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}
.retail-header h3 { margin: 0; font-size: 1.1rem; }
.retail-header .sync-meta { font-size: 0.8rem; color: var(--text-muted); }
.retail-sync-btn {
  border-radius: 999px;
  padding: 0.35rem 1rem;
  font-size: 0.85rem;
  background: var(--primary);
  color: #fff;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}
.retail-sync-btn:hover { opacity: 0.85; }
```

---

### 2. Metal Badge Color Coding

| Metal | Color variable | Fallback hex |
|---|---|---|
| Gold | `var(--warning)` | `#f59e0b` |
| Silver | `var(--text-secondary)` | `#8b93a6` |
| Platinum | `var(--info)` | `#06b6d4` |
| Palladium | `var(--text-muted)` | `#94a3b8` |

Badge markup:
```html
<span class="metal-badge metal-badge--gold">🥇 Gold</span>
```

CSS:
```css
.metal-badge {
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
.metal-badge--gold   { background: rgba(245,158,11,0.15); color: #f59e0b; }
.metal-badge--silver { background: rgba(139,147,166,0.15); color: #8b93a6; }
.metal-badge--platinum { background: rgba(6,182,212,0.15); color: #06b6d4; }
.metal-badge--palladium { background: rgba(148,163,184,0.15); color: #94a3b8; }
```

---

### 3. Card Hover Effect

```css
.retail-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}
.retail-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  border-color: var(--primary);
}
```

---

### 4. Trend Indicator

Show vs. yesterday's stored price. Placed below the summary stats row.

```html
<span class="trend trend--up">↑ +1.2%</span>
<span class="trend trend--down">↓ -0.8%</span>
<span class="trend trend--flat">→ 0.0%</span>
```

CSS:
```css
.trend {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
}
.trend--up   { background: rgba(16,185,129,0.12); color: #10b981; }
.trend--down { background: rgba(239,68,68,0.12);  color: #ef4444; }
.trend--flat { background: rgba(148,163,184,0.12); color: #94a3b8; }
```

**Logic**: compare `retailPriceHistory[slug].history[-1].avg` vs `history[-2].avg` (last two
synced entries). If only one entry exists, hide the badge.

---

### 5. Lowest Price Highlight

In vendor list rows, the row with the lowest price gets:
```css
.vendor-row--best .vendor-price {
  color: #10b981;
  font-weight: 600;
}
.vendor-row--best::before {
  content: "★";
  margin-right: 0.25rem;
  font-size: 0.7rem;
  color: #10b981;
}
```

---

### 6. Confidence Score Bars

Replace Unicode dots with 5 horizontal colored segments.

```html
<div class="confidence-bar" title="Confidence: 3/5">
  <span class="conf-seg conf-seg--fill"></span>
  <span class="conf-seg conf-seg--fill"></span>
  <span class="conf-seg conf-seg--fill"></span>
  <span class="conf-seg"></span>
  <span class="conf-seg"></span>
</div>
```

CSS:
```css
.confidence-bar {
  display: inline-flex;
  gap: 2px;
  align-items: center;
}
.conf-seg {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: var(--border-color, #e2e8f0);
}
.conf-seg--fill { background: var(--primary); }
/* Color by score: 1-2 = red, 3 = yellow, 4-5 = green */
.confidence-bar[data-score="1"] .conf-seg--fill,
.confidence-bar[data-score="2"] .conf-seg--fill { background: #ef4444; }
.confidence-bar[data-score="3"] .conf-seg--fill { background: #f59e0b; }
.confidence-bar[data-score="4"] .conf-seg--fill,
.confidence-bar[data-score="5"] .conf-seg--fill { background: #10b981; }
```

---

### 7. Collapsible Vendor Section

```html
<details class="vendor-details">
  <summary class="vendor-summary">
    4 vendors <span class="chevron">›</span>
  </summary>
  <div class="vendor-list">
    <!-- vendor rows -->
  </div>
</details>
```

CSS:
```css
.vendor-details summary { cursor: pointer; list-style: none; }
.vendor-details[open] .chevron { transform: rotate(90deg); }
.chevron { display: inline-block; transition: transform 0.15s; }
```

---

### 8. Loading Skeleton

While `syncInProgress` is true, render placeholder cards:

```html
<div class="retail-card retail-card--skeleton">
  <div class="skel skel--title"></div>
  <div class="skel skel--stats"></div>
  <div class="skel skel--vendors"></div>
</div>
```

CSS:
```css
.skel {
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--border-color) 50%, var(--bg-secondary) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 4px;
  height: 1rem;
  margin-bottom: 0.5rem;
}
.skel--title  { width: 60%; height: 1.2rem; }
.skel--stats  { width: 100%; height: 2.5rem; }
.skel--vendors { width: 80%; height: 4rem; }
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

### 9. No-Data Empty State

When no retail prices exist yet:

```html
<div class="retail-empty-state">
  <div class="retail-empty-icon">📊</div>
  <p class="retail-empty-title">No market prices yet</p>
  <p class="retail-empty-desc">Sync to load current bullion retail prices from APMEX, Monument, SDB, and JM Bullion.</p>
  <button class="retail-sync-btn" onclick="syncRetailPrices()">Sync Now</button>
</div>
```

---

### 10. Sparkline Micro-Chart (Card Footer)

7-day inline trend using Chart.js (already loaded). One mini canvas per card.

```html
<canvas id="sparkline-${slug}" class="retail-sparkline" width="120" height="36"></canvas>
```

```js
function renderSparkline(slug, history) {
  const canvas = safeGetElement(`sparkline-${slug}`);
  const last7 = history.slice(-7).map(e => e.avg);
  new Chart(canvas, {
    type: 'line',
    data: {
      labels: Array(last7.length).fill(''),
      datasets: [{ data: last7, borderColor: '#3b82f6', borderWidth: 1.5,
                   pointRadius: 0, tension: 0.3, fill: false }]
    },
    options: {
      responsive: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } },
      animation: false
    }
  });
}
```

---

## CSS Delta Summary

Changes are additive — no existing retail CSS removed. All new rules go in `index.html`
inside the retail settings section's `<style>` block (or global CSS if the section doesn't
have its own block).

Total estimated additions: ~120 CSS lines + ~80 JS lines in `retail.js`.

---

## Implementation Order

1. Section header redesign (no data dependency)
2. Metal badge color coding (replace existing badge render)
3. Card hover CSS (pure CSS, 5 lines)
4. Lowest price highlight (logic in `renderRetailCards`)
5. Confidence score bars (replace dots in vendor row render)
6. Trend indicator (requires history comparison helper)
7. Collapsible vendor section (`<details>` wrapper)
8. Loading skeleton (conditional on `syncInProgress` flag)
9. No-data empty state (conditional on empty prices object)
10. Sparkline (conditional on `history.length >= 2`)

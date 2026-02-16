// CARD VIEW RENDERING ENGINE (STAK-118)
// =============================================================================

/**
 * Returns the active card style from localStorage.
 * @returns {'A'|'B'|'C'}
 */
const getCardStyle = () => localStorage.getItem(CARD_STYLE_KEY) || 'B';

/**
 * Returns true when the card view should be rendered instead of the table.
 * Card view activates on mobile (≤1350px) or when the desktop toggle is on.
 * @returns {boolean}
 */
const isCardViewActive = () =>
  window.innerWidth <= 1350 ||
  document.body.classList.contains('force-card-view');

// ---------------------------------------------------------------------------
// SVG Sparkline helpers
// ---------------------------------------------------------------------------

/**
 * Converts an array of numeric values to SVG polyline coordinate string.
 * @param {number[]} data - Data points
 * @param {number} w - SVG viewBox width
 * @param {number} h - SVG viewBox height
 * @param {number} [padY=4] - Vertical padding
 * @returns {string} Space-separated "x,y" pairs
 */
const dataToPolyline = (data, w, h, padY = 4) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = padY + ((max - v) / range) * (h - padY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
};

/** @type {Map<string, string>} Cached sparkline SVG strings keyed by "metal-style-w-h" */
const _sparklineCache = new Map();

/**
 * Generates a "since purchased" 3-line sparkline SVG matching the view modal pattern.
 * Red dashed = purchase price (flat), Green = melt value over time, Blue = retail/market value.
 * Uses real spot history with timestamps when available.
 * @param {object} item - Inventory item
 * @param {number} w - SVG viewBox width
 * @param {number} h - SVG viewBox height
 * @param {object} [opts] - Options
 * @param {number} [opts.opacity=1] - SVG opacity
 * @param {number} [opts.points=60] - Number of data points
 * @returns {string} SVG markup string
 */
const generateSparklineSVG = (item, w, h, opts = {}) => {
  const opacity = opts.opacity || 1;
  const points = opts.points || 60;
  const metal = (item.metal || '').toLowerCase();
  const weightOz = parseFloat(item.weight) || 1;
  const qty = Number(item.qty) || 1;
  const purity = parseFloat(item.purity) || 1;
  const meltFactor = weightOz * qty * purity;
  const purchasePerUnit = parseFloat(item.price) || 0;
  const purchaseTotal = purchasePerUnit * qty;
  const currentRetail = (parseFloat(item.marketValue) || 0) * qty;

  // Try real spot history with timestamps
  let spotEntries;
  if (typeof getSpotHistoryForMetal === 'function') {
    spotEntries = getSpotHistoryForMetal(metal, points, true);
  }

  let meltData, purchaseData, retailData;

  if (spotEntries && spotEntries.length >= 2) {
    // Prepend synthetic entry at purchase date if before earliest spot
    const purchaseDate = item.date ? new Date(item.date).getTime() : 0;
    if (purchaseDate > 0 && purchaseDate < spotEntries[0].ts) {
      spotEntries.unshift({ ts: purchaseDate, spot: spotEntries[0].spot });
    }

    // Melt line: spot * meltFactor over time (green)
    meltData = spotEntries.map(e => e.spot * meltFactor);

    // Purchase line: flat reference (red dashed)
    purchaseData = spotEntries.map(() => purchaseTotal || 1);

    // Retail line: anchored sparse line (blue) — purchase at start, current at end
    // with itemPriceHistory midpoints if available
    retailData = new Array(spotEntries.length).fill(null);

    // Anchor start: purchase price
    if (purchaseTotal > 0) retailData[0] = purchaseTotal;

    // Middle: sparse retail snapshots from itemPriceHistory
    if (typeof itemPriceHistory !== 'undefined' && item.uuid) {
      const history = itemPriceHistory[item.uuid] || [];
      for (const re of history) {
        if (re.retail > 0) {
          // Find nearest spot entry index
          let best = 0, bestDist = Math.abs(spotEntries[0].ts - re.ts);
          for (let i = 1; i < spotEntries.length; i++) {
            const dist = Math.abs(spotEntries[i].ts - re.ts);
            if (dist < bestDist) { best = i; bestDist = dist; }
          }
          retailData[best] = re.retail * qty;
        }
      }
    }

    // Anchor end: current retail/market value
    if (currentRetail > 0) {
      retailData[spotEntries.length - 1] = currentRetail;
    }

    // Interpolate nulls for SVG polyline (spanGaps equivalent)
    retailData = _interpolateNulls(retailData);
  } else {
    // No history — flat lines as fallback
    const currentSpot = (typeof spotPrices !== 'undefined' && spotPrices[metal]) || 0;
    const meltVal = currentSpot * meltFactor;
    meltData = Array(points).fill(meltVal || 1);
    purchaseData = Array(points).fill(purchaseTotal || 1);
    const retailVal = currentRetail > 0 ? currentRetail : meltVal;
    retailData = Array(points).fill(retailVal || 1);
  }

  // Use shared scale across all 3 lines so they're comparable
  const allVals = [...meltData, ...purchaseData, ...retailData];
  const globalMin = Math.min(...allVals);
  const globalMax = Math.max(...allVals);

  const meltLine = _dataToPolylineScaled(meltData, w, h, globalMin, globalMax);
  const purchaseLine = _dataToPolylineScaled(purchaseData, w, h, globalMin, globalMax);
  const retailLine = _dataToPolylineScaled(retailData, w, h, globalMin, globalMax);

  const uid = (item.uuid || item.name || '').replace(/[^a-z0-9]/gi, '').slice(0, 20);
  const meltGradId = `meltFill-${uid}`;
  const purchGradId = `purchFill-${uid}`;
  const meltFillPoints = `${meltLine} ${w},${h} 0,${h}`;
  const purchFillPoints = `${purchaseLine} ${w},${h} 0,${h}`;

  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="opacity:${opacity}">` +
    `<defs>` +
    `<linearGradient id="${meltGradId}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="#10b981" stop-opacity="0.18"/>` +
    `<stop offset="100%" stop-color="#10b981" stop-opacity="0"/>` +
    `</linearGradient>` +
    `<linearGradient id="${purchGradId}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="#ef4444" stop-opacity="0.08"/>` +
    `<stop offset="100%" stop-color="#ef4444" stop-opacity="0"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<polygon points="${purchFillPoints}" fill="url(#${purchGradId})"/>` +
    `<polygon points="${meltFillPoints}" fill="url(#${meltGradId})"/>` +
    `<polyline points="${meltLine}" fill="none" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/>` +
    `<polyline points="${purchaseLine}" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.85"/>` +
    `<polyline points="${retailLine}" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>` +
    `</svg>`;
};

/**
 * Interpolate null gaps in an array for SVG rendering (equivalent to Chart.js spanGaps).
 * @param {(number|null)[]} arr
 * @returns {number[]}
 */
const _interpolateNulls = (arr) => {
  const result = [...arr];
  // Find first non-null
  let firstIdx = result.findIndex(v => v !== null);
  if (firstIdx < 0) return result.map(() => 0);

  // Fill leading nulls
  for (let i = 0; i < firstIdx; i++) result[i] = result[firstIdx];

  // Find last non-null and fill trailing
  let lastIdx = result.length - 1;
  while (lastIdx >= 0 && result[lastIdx] === null) lastIdx--;
  for (let i = lastIdx + 1; i < result.length; i++) result[i] = result[lastIdx];

  // Interpolate interior nulls
  for (let i = firstIdx + 1; i < lastIdx; i++) {
    if (result[i] !== null) continue;
    // Find next non-null
    let nextIdx = i + 1;
    while (nextIdx < result.length && result[nextIdx] === null) nextIdx++;
    const prevVal = result[i - 1];
    const nextVal = result[nextIdx];
    const span = nextIdx - (i - 1);
    for (let j = i; j < nextIdx; j++) {
      result[j] = prevVal + (nextVal - prevVal) * ((j - (i - 1)) / span);
    }
  }
  return result;
};

/**
 * Converts data to SVG polyline using a shared min/max scale.
 * @param {number[]} data
 * @param {number} w - SVG width
 * @param {number} h - SVG height
 * @param {number} globalMin
 * @param {number} globalMax
 * @param {number} [padY=4]
 * @returns {string}
 */
const _dataToPolylineScaled = (data, w, h, globalMin, globalMax, padY = 4) => {
  const range = globalMax - globalMin || 1;
  return data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = padY + ((globalMax - v) / range) * (h - padY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Returns metal CSS class for card border/accent.
 * @param {string} metal
 * @returns {string}
 */
const _cardMetalClass = (metal) => `metal-${(metal || 'silver').toLowerCase()}`;

/**
 * Returns coin image HTML. Renders an <img> with data attributes for async
 * ImageCache resolution (same pattern as table thumbnails in inventory.js).
 * Falls back to a metal-initial placeholder via onerror.
 * @param {object} item
 * @param {string} [extraClass='']
 * @param {string} [side='obverse'] - 'obverse' or 'reverse'
 * @returns {string}
 */
const _cardImageHTML = (item, extraClass = '', side = 'obverse') => {
  const itemType = (item.type || '').toLowerCase();
  const isRect = itemType === 'bar' || itemType === 'note' || itemType === 'aurum'
    || itemType === 'set' || item.weightUnit === 'gb';
  const shape = isRect ? ' bar-shape' : '';
  const uuid = item.uuid || '';
  const catalogId = item.numistaId || '';
  const metalKey = (item.metal || '').toLowerCase();

  // Initial src from item data (CDN URL) if available
  const urlKey = side === 'reverse' ? 'reverseImageUrl' : 'obverseImageUrl';
  const rawUrl = item[urlKey] || '';
  const directUrl = (rawUrl && /^https?:\/\/.+\..+/i.test(rawUrl)) ? rawUrl : '';
  const srcAttr = directUrl ? ` src="${_cvEscapeAttr(directUrl)}"` : '';

  const fitStyle = isRect ? 'object-fit:contain;' : 'object-fit:cover;';

  return `<div class="coin-img${shape}${extraClass}" data-metal="${_cvEscapeAttr(metalKey)}">` +
    `<img class="cv-thumb" data-side="${side}"${srcAttr}` +
    ` data-catalog-id="${_cvEscapeAttr(catalogId)}"` +
    ` data-item-uuid="${_cvEscapeAttr(uuid)}"` +
    ` data-item-name="${_cvEscapeAttr(item.name || '')}"` +
    ` data-item-metal="${_cvEscapeAttr(metalKey)}"` +
    ` data-item-type="${_cvEscapeAttr(item.type || '')}"` +
    ` alt="" loading="lazy" style="${directUrl ? '' : 'display:none;'}width:100%;height:100%;${fitStyle}border-radius:inherit;"` +
    ` onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />` +
    `<div class="cv-no-image" style="display:${directUrl ? 'none' : 'flex'}"></div>` +
    `</div>`;
};

/**
 * Escapes HTML attribute values — fallback for card-view context.
 * The main escapeAttribute lives in inventory.js (loaded before this file).
 * @param {string} s
 * @returns {string}
 */
const _cvEscapeAttr = (s) => {
  if (typeof escapeAttribute === 'function') return escapeAttribute(s);
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

/**
 * Builds chip HTML for card views.
 * @param {object} item
 * @param {boolean} [small=false]
 * @returns {string}
 */
const _cardChipsHTML = (item, small = false) => {
  const s = small ? ' style="font-size:0.58rem;padding:0.05rem 0.35rem"' : '';
  const type = (item.type || 'coin').toLowerCase();
  let h = `<span class="cv-chip cv-chip-type ${type}"${s}>${sanitizeHtml(type)}</span>`;
  if (item.year) h += `<span class="cv-chip cv-chip-year"${s}>${sanitizeHtml(String(item.year))}</span>`;
  if (item.grade) h += `<span class="cv-chip cv-chip-grade"${s}>${sanitizeHtml(item.grade)}</span>`;
  const qty = Number(item.qty) || 1;
  if (qty > 1) h += `<span class="cv-chip cv-chip-qty"${s}>x${qty}</span>`;
  h += `<span class="cv-chip cv-chip-weight"${s}>${sanitizeHtml(item.weight || '')}</span>`;
  return h;
};

/**
 * Format currency using app's formatCurrency or simple fallback.
 */
const _cardFmt = (n) => {
  if (typeof formatCurrency === 'function') return formatCurrency(Math.abs(n));
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const _gainClass = (gl) => (gl >= 0 ? 'cv-gain' : 'cv-loss');
const _gainSign = (gl) => (gl >= 0 ? '+' : '-');
const _gainArrow = (gl) => (gl >= 0 ? '&#9650;' : '&#9660;');

// ---------------------------------------------------------------------------
// Card renderers — A through D
// ---------------------------------------------------------------------------

/**
 * Renders Card Style A: Sparkline Header with stacked images.
 * @param {object} item - Inventory item
 * @param {number} idx - Original inventory index
 * @param {object} computed - Pre-computed financial values
 * @returns {string}
 */
const renderCardA = (item, idx, computed) => {
  const { purchaseTotal, retailTotal, gainLoss } = computed;
  const gl = gainLoss ?? 0;
  const pct = purchaseTotal > 0 ? ((gl / purchaseTotal) * 100) : 0;

  return `<article class="card-a ${_cardMetalClass(item.metal)}" data-idx="${idx}">` +
    `<div class="card-a-chart-wrap"><canvas class="card-a-canvas" data-metal="${_cvEscapeAttr((item.metal || '').toLowerCase())}" data-weight="${parseFloat(item.weight) || 1}" data-qty="${Number(item.qty) || 1}" data-purity="${parseFloat(item.purity) || 1}" data-price="${parseFloat(item.price) || 0}" data-market="${parseFloat(item.marketValue) || 0}" data-date="${_cvEscapeAttr(item.date || '')}"></canvas></div>` +
    `<div class="card-body">` +
      `<div class="cv-item-name">${sanitizeHtml(item.name || '')}</div>` +
      `<div class="cv-chips-row">${_cardChipsHTML(item)}</div>` +
      `<div class="cv-value-row">` +
        `<span class="cv-value-journey">${_cardFmt(purchaseTotal)}<span class="cv-arrow">&rarr;</span>${_cardFmt(retailTotal)}</span>` +
        `<span class="cv-value-gain ${_gainClass(gl)}">${_gainArrow(gl)} ${_gainSign(gl)}${_cardFmt(gl)} (${_gainSign(gl)}${Math.abs(pct).toFixed(1)}%)</span>` +
      `</div>` +
    `</div>` +
  `</article>`;
};

/**
 * Renders Card Style B: Full-Bleed Overlay with hero gain number.
 */
const renderCardB = (item, idx, computed) => {
  const { purchaseTotal, retailTotal, gainLoss } = computed;
  const gl = gainLoss ?? 0;
  const pct = purchaseTotal > 0 ? ((gl / purchaseTotal) * 100) : 0;

  return `<article class="card-b ${_cardMetalClass(item.metal)}" data-idx="${idx}">` +
    `<div class="sparkline-bg">${generateSparklineSVG(item, 400, 180)}</div>` +
    `<div class="card-content">` +
      `<div class="cv-images-row cv-images-center">${_cardImageHTML(item, '', 'obverse')}${_cardImageHTML(item, '', 'reverse')}</div>` +
      `<div class="cv-item-name">${sanitizeHtml(item.name || '')}</div>` +
      `<div class="cv-chips-row cv-chips-center">${_cardChipsHTML(item)}</div>` +
      `<div class="cv-value-hero ${_gainClass(gl)}">${_gainSign(gl)}${_cardFmt(gl)}</div>` +
      `<div class="cv-value-detail">${_cardFmt(purchaseTotal)} cost &rarr; ${_cardFmt(retailTotal)} retail &middot; ${_gainSign(gl)}${Math.abs(pct).toFixed(1)}%</div>` +
    `</div>` +
  `</article>`;
};

/**
 * Renders Card Style C: Split Card (image left, data right).
 */
const renderCardC = (item, idx, computed) => {
  const { purchaseTotal, retailTotal, gainLoss } = computed;
  const gl = gainLoss ?? 0;

  return `<article class="card-c ${_cardMetalClass(item.metal)}" data-idx="${idx}">` +
    `<div class="cv-image-col">` +
      `${_cardImageHTML(item, '', 'obverse')}` +
      `${_cardImageHTML(item, '', 'reverse')}` +
      `<div class="cv-sparkline-strip"><svg viewBox="0 0 4 120" preserveAspectRatio="none"><rect width="4" height="120" rx="2" fill="var(--metal-color)" opacity="0.3"/></svg></div>` +
    `</div>` +
    `<div class="cv-data-col">` +
      `<div class="cv-item-name">${sanitizeHtml(item.name || '')}</div>` +
      `<div class="cv-chips-row">${_cardChipsHTML(item, true)}</div>` +
      `<div class="cv-value-row">` +
        `<span class="cv-value-journey">${_cardFmt(purchaseTotal)}<span class="cv-arrow">&rarr;</span>${_cardFmt(retailTotal)}</span>` +
        `<span class="cv-value-gain ${_gainClass(gl)}">${_gainArrow(gl)} ${_gainSign(gl)}${_cardFmt(gl)}</span>` +
      `</div>` +
    `</div>` +
  `</article>`;
};


// ---------------------------------------------------------------------------
// Main card view renderer
// ---------------------------------------------------------------------------

const _cardRenderers = { A: renderCardA, B: renderCardB, C: renderCardC };

/**
 * Renders all items as cards into the given container.
 * @param {object[]} sortedItems - Sorted/filtered inventory items
 * @param {HTMLElement} container - Target container element
 */
const renderCardView = (sortedItems, container) => {
  const style = getCardStyle();
  const renderer = _cardRenderers[style] || renderCardB;

  const html = sortedItems.map(item => {
    const originalIdx = inventory.indexOf(item);
    const currentSpot = (typeof spotPrices !== 'undefined' ? spotPrices[(item.metal || '').toLowerCase()] : 0) || 0;
    const qty = Number(item.qty) || 1;
    const meltValue = typeof computeMeltValue === 'function' ? computeMeltValue(item, currentSpot) : 0;
    const gbDenomPrice = (typeof getGoldbackRetailPrice === 'function') ? getGoldbackRetailPrice(item) : null;
    const marketValue = parseFloat(item.marketValue) || 0;
    const isManualRetail = !gbDenomPrice && marketValue > 0;
    const retailTotal = gbDenomPrice ? gbDenomPrice * qty
                      : isManualRetail ? marketValue * qty
                      : meltValue;
    const purchasePrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
    const purchaseTotal = purchasePrice * qty;
    const gainLoss = (currentSpot > 0 || isManualRetail || gbDenomPrice) ? retailTotal - purchaseTotal : null;

    return renderer(item, originalIdx, { purchaseTotal, retailTotal, meltValue, gainLoss });
  });

  // Revoke previous card blob URLs to prevent memory leaks
  for (const url of _cvBlobUrls) {
    try { URL.revokeObjectURL(url); } catch { /* ignore */ }
  }
  _cvBlobUrls = [];

  // nosemgrep: javascript.browser.security.insecure-innerhtml.insecure-innerhtml
  container.innerHTML = html.join('');

  // Async image enhancement from ImageCache (fire-and-forget)
  _enhanceCardImages(container);

  // Initialize Chart.js charts on Card A canvases
  _initCardCharts(container);

};

// ---------------------------------------------------------------------------
// Chart.js card charts (Card A) — mirrors view modal pattern
// ---------------------------------------------------------------------------

/** @type {Chart[]} Active card chart instances to destroy on re-render */
let _cvChartInstances = [];

/**
 * Initializes Chart.js mini-charts on all .card-a-canvas elements.
 * Reads spot history data from the canvas data attributes and builds
 * the same 3-line chart as the view modal (purchase/melt/retail).
 * @param {HTMLElement} container
 */
function _initCardCharts(container) {
  // Destroy previous instances
  for (const chart of _cvChartInstances) {
    try { chart.destroy(); } catch { /* ignore */ }
  }
  _cvChartInstances = [];

  if (typeof Chart === 'undefined') return;

  const canvases = container.querySelectorAll('.card-a-canvas');
  for (const canvas of canvases) {
    const metal = canvas.dataset.metal || '';
    const weightOz = parseFloat(canvas.dataset.weight) || 1;
    const qty = parseInt(canvas.dataset.qty, 10) || 1;
    const purity = parseFloat(canvas.dataset.purity) || 1;
    const meltFactor = weightOz * qty * purity;
    const purchasePerUnit = parseFloat(canvas.dataset.price) || 0;
    const purchaseTotal = purchasePerUnit * qty;
    const marketValue = parseFloat(canvas.dataset.market) || 0;
    const currentRetail = marketValue * qty;
    const purchaseDate = canvas.dataset.date ? new Date(canvas.dataset.date).getTime() : 0;

    // Get spot history with timestamps
    let spotEntries = [];
    if (typeof getSpotHistoryForMetal === 'function') {
      spotEntries = getSpotHistoryForMetal(metal, 60, true) || [];
    }
    if (spotEntries.length < 2) continue; // No chart without data

    // Prepend synthetic entry at purchase date
    if (purchaseDate > 0 && spotEntries.length > 0 && purchaseDate < spotEntries[0].ts) {
      spotEntries.unshift({ ts: purchaseDate, spot: spotEntries[0].spot });
    }

    // Build labels (compact dates)
    const labels = spotEntries.map(e => {
      const d = new Date(e.ts);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    });

    // Melt line: spot * meltFactor
    const meltData = spotEntries.map(e => parseFloat((e.spot * meltFactor).toFixed(2)));

    // Purchase line: flat
    const purchaseLine = spotEntries.map(() => purchaseTotal);

    // Retail line: anchored sparse (purchase at start → current at end)
    const retailData = new Array(spotEntries.length).fill(null);
    if (purchaseTotal > 0) retailData[0] = purchaseTotal;

    // Sparse midpoints from itemPriceHistory
    if (typeof itemPriceHistory !== 'undefined') {
      const itemUuid = canvas.closest('[data-idx]')?.dataset.idx;
      const item = typeof inventory !== 'undefined' && itemUuid ? inventory[parseInt(itemUuid, 10)] : null;
      if (item?.uuid) {
        const history = itemPriceHistory[item.uuid] || [];
        for (const re of history) {
          if (re.retail > 0) {
            let best = 0, bestDist = Math.abs(spotEntries[0].ts - re.ts);
            for (let i = 1; i < spotEntries.length; i++) {
              const dist = Math.abs(spotEntries[i].ts - re.ts);
              if (dist < bestDist) { best = i; bestDist = dist; }
            }
            retailData[best] = re.retail * qty;
          }
        }
      }
    }
    if (currentRetail > 0) retailData[spotEntries.length - 1] = currentRetail;

    const hasRetail = retailData.some(v => v !== null);

    const datasets = [
      {
        label: 'Purchase',
        data: purchaseLine,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.06)',
        fill: 'origin',
        borderDash: [6, 3],
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 0,
        borderWidth: 1.5,
        order: 3,
      },
      {
        label: 'Melt',
        data: meltData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        fill: 'origin',
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 3,
        borderWidth: 2,
        order: 2,
      },
      {
        label: 'Retail',
        data: retailData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        fill: 'origin',
        tension: 0.3,
        spanGaps: true,
        pointRadius: 0,
        pointHoverRadius: 3,
        borderWidth: 1.5,
        hidden: !hasRetail,
        order: 1,
      },
    ];

    const chart = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            ticks: {
              color: typeof getChartTextColor === 'function' ? getChartTextColor() : '#8b949e',
              maxTicksLimit: 4,
              autoSkip: true,
              font: { size: 8 },
              maxRotation: 0,
            },
            grid: { display: false },
          },
          y: {
            ticks: {
              color: typeof getChartTextColor === 'function' ? getChartTextColor() : '#8b949e',
              maxTicksLimit: 3,
              font: { size: 8 },
              callback: function(value) {
                return typeof formatCurrency === 'function' ? formatCurrency(value) : '$' + value;
              },
            },
            grid: { color: 'rgba(128,128,128,0.08)' },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: typeof getChartTextColor === 'function' ? getChartTextColor() : '#8b949e',
              usePointStyle: true,
              pointStyle: 'line',
              padding: 6,
              boxWidth: 16,
              font: { size: 8 },
            },
          },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0,0,0,0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 6,
            bodyFont: { size: 10 },
            titleFont: { size: 10 },
            callbacks: {
              label: function(ctx) {
                if (ctx.parsed.y === null) return null;
                const val = typeof formatCurrency === 'function' ? formatCurrency(ctx.parsed.y) : '$' + ctx.parsed.y.toFixed(2);
                return `${ctx.dataset.label}: ${val}`;
              }
            }
          }
        }
      }
    });
    _cvChartInstances.push(chart);
  }
}

// ---------------------------------------------------------------------------
// Image enhancement — async load from ImageCache
// ---------------------------------------------------------------------------

/** @type {string[]} Blob URLs to revoke on next render */
let _cvBlobUrls = [];

/** @type {IntersectionObserver|null} */
let _cvImageObserver = null;

/**
 * Enhances card thumbnail images from IndexedDB ImageCache.
 * Uses IntersectionObserver for lazy loading (same pattern as table thumbnails).
 * @param {HTMLElement} container
 */
async function _enhanceCardImages(container) {
  if (typeof featureFlags === 'undefined' || !featureFlags.isEnabled('COIN_IMAGES')) return;
  if (!window.imageCache?.isAvailable()) return;

  if (_cvImageObserver) _cvImageObserver.disconnect();

  _cvImageObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      _cvImageObserver.unobserve(entry.target);
      // Observe the visible .coin-img wrapper, find the img inside
      const img = entry.target.querySelector('.cv-thumb');
      if (img) _loadCardImage(img);
    }
  }, { rootMargin: '200px 0px' });

  container.querySelectorAll('.coin-img').forEach(wrapper => {
    _cvImageObserver.observe(wrapper);
  });
}

/**
 * Resolves and sets blob URL for a single card thumbnail image.
 * @param {HTMLImageElement} img
 */
async function _loadCardImage(img) {
  try {
    const item = {
      uuid: img.dataset.itemUuid || '',
      numistaId: img.dataset.catalogId || '',
      name: img.dataset.itemName || '',
      metal: img.dataset.itemMetal || '',
      type: img.dataset.itemType || '',
    };
    const side = img.dataset.side || 'obverse';

    // Try IDB resolution cascade (user → pattern → numista cache)
    if (window.imageCache?.isAvailable()) {
      const resolved = await imageCache.resolveImageForItem(item);
      if (resolved) {
        let blobUrl;
        if (resolved.source === 'user') {
          blobUrl = await imageCache.getUserImageUrl(resolved.catalogId, side);
        } else if (resolved.source === 'pattern') {
          blobUrl = await imageCache.getPatternImageUrl(resolved.catalogId, side);
        } else {
          blobUrl = await imageCache.getImageUrl(resolved.catalogId, side);
        }

        if (blobUrl) {
          _cvBlobUrls.push(blobUrl);
          _showCardImage(img, blobUrl);
          return;
        }
      }
    }

    // Fallback: CDN URL stored on the inventory item (same as view modal)
    const idx = img.closest('[data-idx]')?.dataset.idx;
    if (idx !== undefined && typeof inventory !== 'undefined') {
      const invItem = inventory[parseInt(idx, 10)];
      if (invItem) {
        const urlKey = side === 'reverse' ? 'reverseImageUrl' : 'obverseImageUrl';
        const cdnUrl = invItem[urlKey];
        if (cdnUrl && /^https?:\/\/.+\..+/i.test(cdnUrl)) {
          _showCardImage(img, cdnUrl);
          return;
        }
      }
    }
  } catch { /* ignore — IDB unavailable or entry missing */ }
}

/**
 * Show a card image and hide its placeholder.
 * @param {HTMLImageElement} img
 * @param {string} url
 */
function _showCardImage(img, url) {
  img.src = url;
  img.style.display = '';
  const placeholder = img.nextElementSibling;
  if (placeholder) placeholder.style.display = 'none';
}

// ---------------------------------------------------------------------------
// Delegated click handler for card grid
// ---------------------------------------------------------------------------

/** @type {boolean} */
let _cardClickBound = false;

/**
 * Binds a delegated click handler on the card grid container.
 * @param {HTMLElement} container
 */
const bindCardClickHandler = (container) => {
  if (_cardClickBound) return;
  _cardClickBound = true;
  container.addEventListener('click', (e) => {
    const card = e.target.closest('[data-idx]');
    if (!card) return;
    const idx = Number(card.dataset.idx);
    if (typeof showViewModal === 'function') {
      showViewModal(idx);
    } else if (typeof editItem === 'function') {
      editItem(idx);
    }
  });
};


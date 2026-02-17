// CARD VIEW RENDERING ENGINE (STAK-118)
// =============================================================================

/**
 * Returns the active card style from localStorage.
 * @returns {'A'|'B'|'C'|'D'}
 */
const getCardStyle = () => localStorage.getItem(CARD_STYLE_KEY) || 'A';

/**
 * Returns true when the card view should be rendered instead of the table.
 * Card view activates on mobile (≤1350px) or when the desktop toggle is on.
 * Style D is the accessible table mode — it never switches to cards.
 * @returns {boolean}
 */
const isCardViewActive = () => {
  // Style D is always table mode, regardless of viewport width
  if (getCardStyle() === 'D') return false;
  return window.innerWidth <= 1350 ||
    document.body.classList.contains('force-card-view');
};

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
  if (data.length === 0) return '';
  if (data.length === 1) return `0,${(h / 2).toFixed(1)}`;
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

  // Theme-aware — bold strokes and fills on light/sepia backgrounds
  const _svgTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const _lt = _svgTheme === 'light' || _svgTheme === 'sepia';
  const _meltStroke = _lt ? '#047857' : '#10b981';
  const _purchStroke = _lt ? '#b91c1c' : '#ef4444';
  const _retailStroke = _lt ? '#1d4ed8' : '#3b82f6';
  const _meltFillOp = _lt ? '0.70' : '0.18';
  const _purchFillOp = _lt ? '0.50' : '0.08';
  const _sw = _lt ? '3.5' : '1.5';
  const _purchOp = _lt ? '1' : '0.85';

  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="opacity:${opacity}">` +
    `<defs>` +
    `<linearGradient id="${meltGradId}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="${_meltStroke}" stop-opacity="${_meltFillOp}"/>` +
    `<stop offset="100%" stop-color="${_meltStroke}" stop-opacity="0"/>` +
    `</linearGradient>` +
    `<linearGradient id="${purchGradId}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="${_purchStroke}" stop-opacity="${_purchFillOp}"/>` +
    `<stop offset="100%" stop-color="${_purchStroke}" stop-opacity="0"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<polygon points="${purchFillPoints}" fill="url(#${purchGradId})"/>` +
    `<polygon points="${meltFillPoints}" fill="url(#${meltGradId})"/>` +
    `<polyline points="${meltLine}" fill="none" stroke="${_meltStroke}" stroke-width="${_sw}" stroke-linecap="round"/>` +
    `<polyline points="${purchaseLine}" fill="none" stroke="${_purchStroke}" stroke-width="${_sw}" stroke-dasharray="4,3" opacity="${_purchOp}"/>` +
    `<polyline points="${retailLine}" fill="none" stroke="${_retailStroke}" stroke-width="${_sw}" stroke-linecap="round"/>` +
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
  if (data.length === 0) return '';
  if (data.length === 1) {
    const y = padY + ((globalMax - data[0]) / (globalMax - globalMin || 1)) * (h - padY * 2);
    return `0,${y.toFixed(1)}`;
  }
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
  const _wUnit = (item.weightUnit || 'oz').toLowerCase() === 'gb' ? 'gb' : (item.weightUnit || 'oz');
  h += `<span class="cv-chip cv-chip-weight"${s}>${sanitizeHtml(item.weight || '')} ${sanitizeHtml(_wUnit)}</span>`;
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
      `<div class="cv-chips-img-row"><div class="cv-chips-row">${_cardChipsHTML(item)}</div><div class="cv-images-row cv-images-sm">${_cardImageHTML(item, '', 'obverse')}${_cardImageHTML(item, '', 'reverse')}</div></div>` +
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

    // Theme-aware chart colors — bold lines/fills for light & sepia
    const _theme = document.documentElement.getAttribute('data-theme') || 'light';
    const _isLight = _theme === 'light' || _theme === 'sepia';
    const datasets = [
      {
        label: 'Purchase',
        data: purchaseLine,
        borderColor: _isLight ? '#b91c1c' : '#ef4444',
        backgroundColor: _isLight ? 'rgba(185, 28, 28, 0.15)' : 'rgba(239, 68, 68, 0.06)',
        fill: 'origin',
        borderDash: [6, 3],
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 0,
        borderWidth: _isLight ? 3 : 1.5,
        order: 1,
      },
      {
        label: 'Melt',
        data: meltData,
        borderColor: _isLight ? '#047857' : '#10b981',
        backgroundColor: _isLight ? 'rgba(4, 120, 87, 0.25)' : 'rgba(16, 185, 129, 0.18)',
        fill: 'origin',
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 3,
        borderWidth: _isLight ? 3 : 2,
        order: 3,
      },
      {
        label: 'Retail',
        data: retailData,
        borderColor: _isLight ? '#1d4ed8' : '#3b82f6',
        backgroundColor: _isLight ? 'rgba(29, 78, 216, 0.15)' : 'rgba(59, 130, 246, 0.12)',
        fill: 'origin',
        tension: 0.3,
        spanGaps: true,
        pointRadius: 0,
        pointHoverRadius: 3,
        borderWidth: _isLight ? 3 : 1.5,
        hidden: !hasRetail,
        order: 2,
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

    // Resolve CDN URL from inventory item
    const idx = img.closest('[data-idx]')?.dataset.idx;
    let cdnUrl = '';
    if (idx !== undefined && typeof inventory !== 'undefined') {
      const invItem = inventory[parseInt(idx, 10)];
      if (invItem) {
        const urlKey = side === 'reverse' ? 'reverseImageUrl' : 'obverseImageUrl';
        cdnUrl = (invItem[urlKey] && /^https?:\/\/.+\..+/i.test(invItem[urlKey])) ? invItem[urlKey] : '';
      }
    }

    // Numista override: CDN URLs (Numista source) win over user/pattern blobs
    const numistaOverride = localStorage.getItem('numistaOverridePersonal') === 'true';
    if (numistaOverride && cdnUrl) {
      _showCardImage(img, cdnUrl);
      return;
    }

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

    // Fallback: CDN URL
    if (cdnUrl) {
      _showCardImage(img, cdnUrl);
      return;
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

// ---------------------------------------------------------------------------
// Card Sort Bar — sort controls + style toggle (STAK-131)
// ---------------------------------------------------------------------------

/** @type {boolean} Whether card sort bar event listeners have been bound */
let _cardSortBarBound = false;

/**
 * Updates the body data-card-style attribute to enable Style D CSS.
 * Called from renderTable() to sync body state with active card style.
 */
const updateBodyCardStyle = () => {
  const style = getCardStyle();
  document.body.setAttribute('data-card-style', style);
};

/**
 * Updates the card sort bar UI to reflect current sort state and card style.
 * Called from renderTable() whenever card view is active.
 */
const updateCardSortBar = () => {
  const bar = document.getElementById('cardSortBar');
  if (!bar) return;

  // Sync sort dropdown with current sortColumn
  const colSelect = document.getElementById('cardSortColumn');
  if (colSelect && colSelect.value !== String(sortColumn)) {
    colSelect.value = String(sortColumn);
  }

  // Sync direction button
  const dirBtn = document.getElementById('cardSortDirBtn');
  if (dirBtn) {
    dirBtn.setAttribute('data-dir', sortDirection);
    dirBtn.title = sortDirection === 'asc' ? 'Ascending — click to reverse' : 'Descending — click to reverse';
  }

  // Sync card style toggle
  const style = getCardStyle();
  const styleToggle = document.getElementById('cardStyleToggle');
  if (styleToggle) {
    styleToggle.querySelectorAll('.chip-sort-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.style === style);
    });
  }
};

/**
 * Binds event listeners on the card sort bar (once).
 */
const initCardSortBar = () => {
  if (_cardSortBarBound) return;
  _cardSortBarBound = true;

  // Sort column dropdown
  const colSelect = document.getElementById('cardSortColumn');
  if (colSelect) {
    colSelect.addEventListener('change', () => {
      sortColumn = parseInt(colSelect.value, 10);
      if (typeof renderTable === 'function') renderTable();
    });
  }

  // Sort direction toggle
  const dirBtn = document.getElementById('cardSortDirBtn');
  if (dirBtn) {
    dirBtn.addEventListener('click', () => {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      if (typeof renderTable === 'function') renderTable();
    });
  }

  // Card style A/B/C toggle
  const styleToggle = document.getElementById('cardStyleToggle');
  if (styleToggle) {
    styleToggle.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip-sort-btn');
      if (!btn || !btn.dataset.style) return;
      localStorage.setItem(CARD_STYLE_KEY, btn.dataset.style);
      // Sync settings select if open
      const styleSelect = document.getElementById('settingsCardStyle');
      if (styleSelect) styleSelect.value = btn.dataset.style;
      if (typeof renderTable === 'function') renderTable();
    });
  }
};


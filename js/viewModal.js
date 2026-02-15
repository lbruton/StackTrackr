// VIEW ITEM MODAL — Card-style showcase with coin images + enriched data
// =============================================================================

/**
 * Active object URLs created for the current view modal session.
 * Revoked on modal close to prevent memory leaks.
 * @type {string[]}
 */
let _viewModalObjectUrls = [];

/** @type {Chart|null} Price history chart instance — destroyed on modal close */
let _viewModalChartInstance = null;

/** @type {number} Metadata cache TTL: 30 days in ms */
const VIEW_METADATA_TTL = 30 * 24 * 60 * 60 * 1000;

/** @type {number[]} Available chart range options (0 = all) */
const _VIEW_CHART_RANGES = [7, 14, 30, 60, 90, 180, 0];

/** @type {string[]} Display labels for chart range pills */
const _VIEW_CHART_RANGE_LABELS = ['7d', '14d', '30d', '60d', '90d', '180d', 'All'];

/** @type {number} Default chart range in days */
const _VIEW_CHART_DEFAULT_RANGE = 30;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Open the view modal for a specific inventory item.
 * @param {number} index - Index into the global `inventory` array
 */
async function showViewModal(index) {
  const item = inventory[index];
  if (!item) return;

  const modal = document.getElementById('viewItemModal');
  if (!modal) return;

  const body = document.getElementById('viewModalBody');
  if (!body) return;

  // Build modal content
  body.textContent = '';
  body.appendChild(buildViewContent(item, index));

  // Render price history chart (canvas must be in DOM first)
  const chartCanvas = body.querySelector('#viewPriceHistoryChart');
  if (chartCanvas && chartCanvas._chartData) {
    const cd = chartCanvas._chartData;
    _createPriceHistoryChart(chartCanvas, cd.spotEntries, cd.retailEntries, cd.purchasePerUnit, cd.meltFactor, _VIEW_CHART_DEFAULT_RANGE, cd.purchaseDate, cd.currentRetail);
  }

  modal.style.display = 'flex';

  // Load images and Numista data asynchronously after modal is visible
  // Share a single API result to avoid duplicate calls
  const catalogId = item.numistaId || '';
  let apiResult = null;

  // Try loading images from cache/item first
  const cacheResult = await loadViewImages(item, body);
  const imagesLoaded = cacheResult.loaded;
  const imageSource = cacheResult.source;

  // If images or metadata are needed, do a single API lookup
  if (catalogId && (!imagesLoaded || body.querySelector('#viewNumistaSection'))) {
    apiResult = await _fetchNumistaResult(catalogId);
  }

  // Fill images from API result when:
  // 1. No images were loaded at all, OR
  // 2. Override is ON and current images are from user uploads or pattern rules (Numista wins)
  const numistaOverride = localStorage.getItem('numistaOverridePersonal') === 'true';
  const shouldReplaceWithApi = !imagesLoaded || (numistaOverride && (imageSource === 'pattern' || imageSource === 'user'));

  if (shouldReplaceWithApi && apiResult && (apiResult.imageUrl || apiResult.reverseImageUrl)) {
    const section = body.querySelector('#viewImageSection');
    if (section) {
      const slots = section.querySelectorAll('.view-image-slot');
      if (apiResult.imageUrl) _setSlotImage(slots[0], apiResult.imageUrl);
      if (apiResult.reverseImageUrl) _setSlotImage(slots[1], apiResult.reverseImageUrl);

      // Cache for next time (future resolveImageForItem will find it)
      if (window.imageCache?.isAvailable()) {
        imageCache.cacheImages(catalogId, apiResult.imageUrl || '', apiResult.reverseImageUrl || '').catch(() => {});
      }
    }
  } else if (!imagesLoaded && apiResult) {
    // Fallback: cache even if no image URLs (metadata-only result)
    if (window.imageCache?.isAvailable() && catalogId) {
      imageCache.cacheImages(catalogId, apiResult.imageUrl || '', apiResult.reverseImageUrl || '').catch(() => {});
    }
  }

  // Load Numista enrichment section
  await loadViewNumistaData(item, body, apiResult);
}

/**
 * Close the view modal and clean up resources.
 */
function closeViewModal() {
  const modal = document.getElementById('viewItemModal');
  if (modal) modal.style.display = 'none';

  // Destroy price history chart to free canvas resources
  if (_viewModalChartInstance) {
    _viewModalChartInstance.destroy();
    _viewModalChartInstance = null;
  }

  // Revoke all object URLs to free memory
  _viewModalObjectUrls.forEach(url => {
    try { URL.revokeObjectURL(url); } catch { /* ignore */ }
  });
  _viewModalObjectUrls = [];
}

// ---------------------------------------------------------------------------
// Content builder
// ---------------------------------------------------------------------------

/**
 * Build the full view modal body as a DocumentFragment.
 * Sections are built eagerly then appended in user-configured order.
 * @param {Object} item - Inventory item
 * @param {number} index - Item index for edit button
 * @returns {DocumentFragment}
 */
function buildViewContent(item, index) {
  const frag = document.createDocumentFragment();
  const metalKey = (item.metal || 'silver').toLowerCase();
  const currentSpot = spotPrices[metalKey] || 0;
  const qty = Number(item.qty) || 1;
  const weight = parseFloat(item.weight) || 0;
  const purity = parseFloat(item.purity) || 1.0;
  const isGb = item.weightUnit === 'gb';
  const weightOz = isGb ? weight * GB_TO_OZT : weight;

  // --- Header info (name + catalog ID) ---
  const header = document.getElementById('viewModalTitle');
  if (header) header.textContent = sanitizeHtml(item.name || 'Untitled Item');

  const catalogBadge = document.getElementById('viewModalCatalogId');
  if (catalogBadge) {
    const nId = item.numistaId || '';
    catalogBadge.textContent = nId ? `N#${nId}` : '';
    catalogBadge.style.display = nId ? '' : 'none';
    if (nId) {
      catalogBadge.style.cursor = 'pointer';
      catalogBadge.title = 'View on Numista';
      catalogBadge.onclick = (e) => {
        e.stopPropagation();
        const isSet = /^S/i.test(nId);
        const cleanId = nId.replace(/^[NS]?#?\s*/i, '').trim();
        const url = isSet
          ? `https://en.numista.com/catalogue/set.php?id=${cleanId}`
          : `https://en.numista.com/catalogue/pieces${cleanId}.html`;
        _openExternalPopup(url, `numista_${nId}`);
      };
    } else {
      catalogBadge.onclick = null;
      catalogBadge.style.cursor = '';
    }
  }

  // --- Metal-themed header gradient ---
  const metalColor = typeof getMetalColor === 'function' ? getMetalColor(metalKey) : null;
  const modalHeader = document.getElementById('viewItemModal')?.querySelector('.modal-header');
  if (modalHeader && metalColor) {
    modalHeader.style.background = `linear-gradient(135deg, ${metalColor}, ${_darkenColor(metalColor, 0.3)})`;
    const textColor = _isLightColor(metalColor) ? '#1e293b' : '#f8fafc';
    modalHeader.style.color = textColor;
    if (header) header.style.color = textColor;
  }

  // --- Total count chip ---
  const countChip = document.getElementById('viewModalCountChip');
  if (countChip) {
    const totalQty = inventory.reduce((sum, i) =>
      i.name === item.name && i.metal === item.metal
        ? sum + (Number(i.qty) || 1) : sum, 0);
    countChip.textContent = totalQty > 1 ? `\u00d7${totalQty} in inventory` : '';
    countChip.style.display = totalQty > 1 ? '' : 'none';
  }

  // =========================================================================
  // Build all sections eagerly, then append in config order
  // =========================================================================

  // --- Images section ---
  const itemType = (item.type || '').toLowerCase();
  const isRectShape = itemType === 'bar' || itemType === 'note' || itemType === 'aurum'
    || itemType === 'set' || isGb;

  const imgSection = _el('div', 'view-image-section' + (isRectShape ? ' view-shape-rect' : ''));
  imgSection.id = 'viewImageSection';

  const obvSlot = _imageSlot('obverse', 'Obverse');
  const revSlot = _imageSlot('reverse', 'Reverse');
  imgSection.appendChild(obvSlot);
  imgSection.appendChild(revSlot);

  if (metalColor) {
    imgSection.style.background = `linear-gradient(145deg, color-mix(in srgb, ${metalColor} 15%, #1a1a2e), color-mix(in srgb, ${metalColor} 8%, #16213e))`;
  }

  // --- Inventory section ---
  const invSection = _section('Inventory');
  const invGrid = _el('div', 'view-detail-grid three-col');
  _addDetail(invGrid, 'Metal', item.composition || item.metal || '—');
  _addDetail(invGrid, 'Type', item.type || '—');
  _addDetail(invGrid, 'Year', item.year || '—');
  _addDetail(invGrid, 'Purity', purity < 1 ? `.${String(purity).replace('0.', '')}` : purity === 1 ? '.999+' : String(purity));
  _addDetail(invGrid, 'Weight', typeof formatWeight === 'function' ? formatWeight(weight, item.weightUnit) : `${weight} oz`);
  _addDetail(invGrid, 'Qty', String(qty));
  invSection.appendChild(invGrid);

  const invGrid2 = _el('div', 'view-detail-grid three-col');
  _addDetail(invGrid2, 'Date', item.date ? (typeof formatDisplayDate === 'function' ? formatDisplayDate(item.date) : item.date) : '—');

  // Source — render as iframe link if it looks like a URL
  const srcVal = item.purchaseLocation || '—';
  const srcUrlPattern = /^(https?:\/\/)?[\w.-]+\.(com|net|org|co|io|us|uk|ca|au|de|fr|shop|store)\b/i;
  if (srcUrlPattern.test(srcVal)) {
    const srcItem = _detailItem('Source', '');
    const valEl = srcItem.querySelector('.view-detail-value');
    if (valEl) {
      valEl.textContent = '';
      const srcLink = document.createElement('a');
      srcLink.href = '#';
      let srcHref = srcVal;
      if (!/^https?:\/\//i.test(srcHref)) srcHref = `https://${srcHref}`;
      srcLink.title = srcHref;
      srcLink.style.color = 'var(--primary)';
      srcLink.style.textDecoration = 'none';
      srcLink.textContent = srcVal.replace(/^(https?:\/\/)?(www\.)?/i, '').replace(/\/(.*)/i, '');
      srcLink.addEventListener('click', (e) => {
        e.preventDefault();
        _openExternalPopup(srcHref, 'source_popup');
      });
      valEl.appendChild(srcLink);
    }
    invGrid2.appendChild(srcItem);
  } else {
    _addDetail(invGrid2, 'Source', srcVal);
  }
  invSection.appendChild(invGrid2);

  if (item.storageLocation) {
    const storGrid = _el('div', 'view-detail-grid');
    _addDetail(storGrid, 'Storage', item.storageLocation);
    invSection.appendChild(storGrid);
  }

  // --- Valuation section ---
  const meltValue = currentSpot > 0 ? weightOz * qty * currentSpot * purity : 0;
  const purchaseTotal = qty * (parseFloat(item.price) || 0);
  const marketVal = parseFloat(item.marketValue) || 0;
  const retailTotal = marketVal > 0 ? qty * marketVal : meltValue;
  const gainLoss = retailTotal > 0 ? retailTotal - purchaseTotal : null;

  const valSection = _section('Valuation');
  valSection.classList.add('view-valuation-section');
  const valGrid = _el('div', 'view-detail-grid four-col');
  _addDetail(valGrid, 'Purchase', formatCurrency(purchaseTotal));
  _addDetail(valGrid, 'Melt Value', currentSpot > 0 ? formatCurrency(meltValue) : '—');
  _addDetail(valGrid, 'Retail', retailTotal > 0 ? formatCurrency(retailTotal) : '—');

  if (gainLoss !== null && retailTotal > 0) {
    const glItem = _detailItem('Gain/Loss', (gainLoss >= 0 ? '+' : '') + formatCurrency(gainLoss));
    const valEl = glItem.querySelector('.view-detail-value');
    if (valEl) valEl.classList.add(gainLoss >= 0 ? 'gain' : 'loss');
    valGrid.appendChild(glItem);
  } else {
    _addDetail(valGrid, 'Gain/Loss', '—', 'muted');
  }
  valSection.appendChild(valGrid);

  // --- Price History section (spot-derived melt + sparse retail overlay) ---
  // Primary: derive melt value from spotHistory (dense daily data per metal)
  // Secondary: retail values from itemPriceHistory (sparse, plotted where they exist)
  const metalName = item.metal || 'Silver';
  const meltFactor = weightOz * qty * purity; // meltValue = spot * meltFactor
  const spotEntries = (typeof spotHistory !== 'undefined')
    ? spotHistory
        .filter(e => e.metal === metalName)
        .map(e => ({ ts: new Date(e.timestamp).getTime(), spot: e.spot }))
        .sort((a, b) => a.ts - b.ts)
    : [];
  // Dedup to one entry per day (last value wins, like sparkline)
  const spotByDay = new Map();
  for (const e of spotEntries) {
    const day = new Date(e.ts).toISOString().slice(0, 10);
    spotByDay.set(day, e);
  }
  const dailySpotEntries = [...spotByDay.values()];

  const retailEntries = (typeof itemPriceHistory !== 'undefined' && item.uuid)
    ? (itemPriceHistory[item.uuid] || []).filter(e => e.retail > 0)
    : [];
  const purchasePerUnit = parseFloat(item.price) || 0;
  const purchaseDate = item.date ? new Date(item.date).getTime() : 0;
  const currentRetail = parseFloat(item.marketValue) || 0;

  let chartSection = null;
  if (dailySpotEntries.length >= 2) {
    chartSection = _section('Price History');

    // Range pill bar
    const rangeBar = _el('div', 'view-chart-range-bar');
    // Date picker inputs for custom range
    const dateRange = _el('div', 'view-chart-date-range');
    const fromInput = document.createElement('input');
    fromInput.type = 'date';
    fromInput.className = 'view-chart-date-input';
    fromInput.title = 'From date';
    const toInput = document.createElement('input');
    toInput.type = 'date';
    toInput.className = 'view-chart-date-input';
    toInput.title = 'To date';
    const todayStr = new Date().toISOString().slice(0, 10);
    fromInput.max = todayStr;
    toInput.max = todayStr;

    const dateSep = _el('span', 'view-chart-date-sep');
    dateSep.textContent = '\u2014';
    dateRange.appendChild(fromInput);
    dateRange.appendChild(dateSep);
    dateRange.appendChild(toInput);

    // Custom range handler — shared by both date inputs
    const onDateChange = async () => {
      // Deactivate all pills (custom range mode)
      rangeBar.querySelectorAll('.view-chart-range-pill').forEach(p => p.classList.remove('active'));
      // Cross-constrain min/max
      if (fromInput.value) toInput.min = fromInput.value;
      if (toInput.value) fromInput.max = toInput.value;
      else fromInput.max = todayStr;
      // Parse timestamps (start of day for From, end of day for To)
      const fromTs = fromInput.value ? new Date(fromInput.value + 'T00:00:00').getTime() : 0;
      const toTs = toInput.value ? new Date(toInput.value + 'T23:59:59').getTime() : 0;
      if (fromTs <= 0 && toTs <= 0) return;
      const canvas = chartSection.querySelector('#viewPriceHistoryChart');
      if (canvas) {
        try {
          // Async-fetch historical data for custom ranges (may span decades)
          const fullSpot = await _fetchHistoricalSpotData(metalName, 0, fromTs, toTs);
          _createPriceHistoryChart(canvas, fullSpot, retailEntries, purchasePerUnit, meltFactor, 0, purchaseDate, currentRetail, fromTs, toTs);
        } catch (err) {
          // Fall back to empty dataset on fetch failure (network, parsing errors)
          console.error('Custom date range fetch failed:', err);
          _createPriceHistoryChart(canvas, [], retailEntries, purchasePerUnit, meltFactor, 0, purchaseDate, currentRetail, fromTs, toTs);
        }
      }
    };
    fromInput.addEventListener('change', onDateChange);
    toInput.addEventListener('change', onDateChange);

    _VIEW_CHART_RANGES.forEach((days, i) => {
      const pill = _el('button', 'view-chart-range-pill');
      pill.type = 'button';
      pill.textContent = _VIEW_CHART_RANGE_LABELS[i];
      pill.dataset.days = String(days);
      if (days === _VIEW_CHART_DEFAULT_RANGE) pill.classList.add('active');
      pill.addEventListener('click', async () => {
        rangeBar.querySelectorAll('.view-chart-range-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        // Clear date inputs (back to pill mode)
        fromInput.value = '';
        toInput.value = '';
        fromInput.max = todayStr;
        toInput.min = '';
        const canvas = chartSection.querySelector('#viewPriceHistoryChart');
        if (canvas) {
          if (days === 0 || days > 180) {
            try {
              // "All" or long range — async-fetch historical year files
              const fullSpot = await _fetchHistoricalSpotData(metalName, days);
              _createPriceHistoryChart(canvas, fullSpot, retailEntries, purchasePerUnit, meltFactor, days, purchaseDate, currentRetail);
            } catch (err) {
              // Fall back to empty dataset on fetch failure
              console.error('Range pill fetch failed:', err);
              _createPriceHistoryChart(canvas, [], retailEntries, purchasePerUnit, meltFactor, days, purchaseDate, currentRetail);
            }
          } else {
            _createPriceHistoryChart(canvas, dailySpotEntries, retailEntries, purchasePerUnit, meltFactor, days, purchaseDate, currentRetail);
          }
        }
      });
      rangeBar.appendChild(pill);
    });
    rangeBar.appendChild(dateRange);
    chartSection.appendChild(rangeBar);

    const chartContainer = _el('div', 'view-chart-container');
    const canvas = document.createElement('canvas');
    canvas.id = 'viewPriceHistoryChart';
    // Stash data for showViewModal to use after DOM insertion
    canvas._chartData = { spotEntries: dailySpotEntries, retailEntries, purchasePerUnit, meltFactor, purchaseDate, currentRetail };
    chartContainer.appendChild(canvas);
    chartSection.appendChild(chartContainer);
  }

  // --- Grading section (conditional) ---
  let gradeSection = null;
  if (item.grade || item.gradingAuthority || item.certNumber) {
    gradeSection = _section('Grading');
    const gradeGrid = _el('div', 'view-detail-grid three-col');
    _addDetail(gradeGrid, 'Grade', item.grade || '—');
    _addDetail(gradeGrid, 'Authority', item.gradingAuthority || '—');
    if (item.certNumber) {
      const certItem = _detailItem('Cert #', item.certNumber);
      if (item.gradingAuthority && typeof CERT_LOOKUP_URLS !== 'undefined' && CERT_LOOKUP_URLS[item.gradingAuthority]) {
        const url = CERT_LOOKUP_URLS[item.gradingAuthority]
          .replace(/{certNumber}/g, encodeURIComponent(item.certNumber))
          .replace(/{grade}/g, encodeURIComponent(item.grade || ''));
        const valEl = certItem.querySelector('.view-detail-value');
        if (valEl) {
          valEl.textContent = '';
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = item.certNumber;
          link.style.color = 'var(--primary)';
          link.title = `Verify on ${item.gradingAuthority}`;
          valEl.appendChild(link);
        }
      }
      gradeGrid.appendChild(certItem);
    } else {
      _addDetail(gradeGrid, 'Cert #', '—');
    }
    gradeSection.appendChild(gradeGrid);
  }

  // --- Numista enrichment placeholder (populated async) ---
  const numistaPlaceholder = _el('div', '');
  numistaPlaceholder.id = 'viewNumistaSection';

  // --- Notes section (conditional) ---
  let notesSection = null;
  if (item.notes) {
    notesSection = _section('Notes');
    const noteText = _el('div', 'view-notes-text');
    noteText.textContent = item.notes;
    notesSection.appendChild(noteText);
  }

  // =========================================================================
  // Append sections in user-configured order
  // =========================================================================

  const sectionBuilders = {
    images:       () => imgSection,
    priceHistory: () => chartSection,
    valuation:    () => valSection,
    inventory:    () => invSection,
    grading:      () => gradeSection,
    numista:      () => numistaPlaceholder,
    notes:        () => notesSection,
  };

  const sectionConfig = typeof getViewModalSectionConfig === 'function'
    ? getViewModalSectionConfig() : VIEW_MODAL_SECTION_DEFAULTS;

  for (const sec of sectionConfig) {
    if (!sec.enabled) continue;
    const builder = sectionBuilders[sec.id];
    if (builder) {
      const el = builder();
      if (el) frag.appendChild(el);
    }
  }

  // --- Header action buttons (eBay, Edit, Close) ---
  const headerActions = document.getElementById('viewHeaderActions');
  if (headerActions) {
    headerActions.textContent = '';

    const ebayBtn = document.createElement('button');
    ebayBtn.className = 'view-ebay-btn';
    ebayBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style="fill:currentColor;margin-right:4px;vertical-align:-2px;"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2.5"/><line x1="15" y1="15" x2="21" y2="21" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>eBay';
    ebayBtn.title = 'Search eBay for this item';
    ebayBtn.addEventListener('click', () => {
      const searchTerm = (item.metal || '') + (item.year ? ' ' + item.year : '') + ' ' + (item.name || '');
      if (typeof openEbayBuySearch === 'function') {
        openEbayBuySearch(searchTerm);
      } else if (typeof openEbaySoldSearch === 'function') {
        openEbaySoldSearch(searchTerm);
      }
    });

    const editBtn = document.createElement('button');
    editBtn.className = 'view-edit-btn';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => {
      closeViewModal();
      if (typeof editItem === 'function') editItem(index);
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'view-close-btn';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', closeViewModal);

    headerActions.appendChild(ebayBtn);
    headerActions.appendChild(editBtn);
    headerActions.appendChild(closeBtn);
  }

  return frag;
}

// ---------------------------------------------------------------------------
// Async loaders
// ---------------------------------------------------------------------------

/**
 * Load coin images from IndexedDB cache → CDN URL fallback.
 * Returns true if images were found from cache or item URLs.
 * @param {Object} item
 * @param {HTMLElement} container
 * @returns {Promise<boolean>} true if images loaded from cache/item
 */
/**
 * Load coin images from IndexedDB cache → CDN URL fallback.
 * @param {Object} item
 * @param {HTMLElement} container
 * @returns {Promise<{loaded: boolean, source: string|null}>}
 */
async function loadViewImages(item, container) {
  const section = container.querySelector('#viewImageSection');
  if (!section) return { loaded: false, source: null };

  const slots = section.querySelectorAll('.view-image-slot');
  const obvSlot = slots[0];
  const revSlot = slots[1];

  if (!window.imageCache?.isAvailable()) {
    // Fallback: CDN URLs stored on the item
    const validObv = ImageCache.isValidImageUrl(item.obverseImageUrl);
    const validRev = ImageCache.isValidImageUrl(item.reverseImageUrl);
    if (validObv) _setSlotImage(obvSlot, item.obverseImageUrl);
    if (validRev) _setSlotImage(revSlot, item.reverseImageUrl);
    return { loaded: validObv || validRev, source: 'cdn' };
  }

  // Use the resolution cascade (user → pattern → numista)
  const resolved = await imageCache.resolveImageForItem(item);
  if (resolved) {
    let obvUrl, revUrl;
    if (resolved.source === 'user') {
      obvUrl = await imageCache.getUserImageUrl(resolved.catalogId, 'obverse');
      revUrl = await imageCache.getUserImageUrl(resolved.catalogId, 'reverse');
    } else if (resolved.source === 'pattern') {
      obvUrl = await imageCache.getPatternImageUrl(resolved.catalogId, 'obverse');
      revUrl = await imageCache.getPatternImageUrl(resolved.catalogId, 'reverse');
    } else {
      obvUrl = await imageCache.getImageUrl(resolved.catalogId, 'obverse');
      revUrl = await imageCache.getImageUrl(resolved.catalogId, 'reverse');
    }

    if (obvUrl) { _viewModalObjectUrls.push(obvUrl); _setSlotImage(obvSlot, obvUrl); }
    if (revUrl) { _viewModalObjectUrls.push(revUrl); _setSlotImage(revSlot, revUrl); }
    if (obvUrl || revUrl) return { loaded: true, source: resolved.source };
  }

  // Final fallback: CDN URLs stored on the item (validate to skip corrupted URLs)
  const validObv = ImageCache.isValidImageUrl(item.obverseImageUrl);
  const validRev = ImageCache.isValidImageUrl(item.reverseImageUrl);
  if (validObv) _setSlotImage(obvSlot, item.obverseImageUrl);
  if (validRev) _setSlotImage(revSlot, item.reverseImageUrl);
  return { loaded: validObv || validRev, source: (validObv || validRev) ? 'cdn' : null };
}

/**
 * Load Numista metadata from IndexedDB cache or pre-fetched API result, render enrichment section.
 * @param {Object} item
 * @param {HTMLElement} container
 * @param {Object|null} apiResult - Pre-fetched Numista API result (avoids duplicate call)
 */
async function loadViewNumistaData(item, container, apiResult) {
  const catalogId = item.numistaId || '';
  if (!catalogId) return;

  const placeholder = container.querySelector('#viewNumistaSection');
  if (!placeholder) return;

  let meta = null;

  // Check cache
  if (window.imageCache?.isAvailable()) {
    meta = await imageCache.getMetadata(catalogId);

    // Stale check
    if (meta && (Date.now() - (meta.cachedAt || 0)) > VIEW_METADATA_TTL) {
      meta = null; // Force refresh
    }
  }

  // Use pre-fetched API result if no cache hit
  if (!meta && apiResult) {
    meta = _extractMetadata(apiResult);

    // Cache for next time
    if (window.imageCache?.isAvailable()) {
      imageCache.cacheMetadata(catalogId, apiResult).catch(() => {});
    }
  }

  if (!meta) return;

  // Load user's field visibility config
  const cfg = typeof getNumistaViewFieldConfig === 'function'
    ? getNumistaViewFieldConfig()
    : {};

  // Update image frame shape based on Numista data if not already rectangular
  if (meta.shape) {
    const imgSection = container.querySelector('#viewImageSection');
    const shapeStr = meta.shape.toLowerCase();
    const isNonRound = shapeStr !== 'round' && shapeStr !== 'circular';
    if (isNonRound && imgSection && !imgSection.classList.contains('view-shape-rect')) {
      imgSection.classList.add('view-shape-rect');
    }
  }

  // Build Numista section
  const section = _el('div', 'view-numista-section');

  const badge = _el('span', 'view-numista-badge');
  badge.textContent = 'Numista Data';
  section.appendChild(badge);

  const grid = _el('div', 'view-detail-grid');

  if (cfg.denomination !== false && meta.denomination) _addDetail(grid, 'Denomination', meta.denomination);
  if (cfg.shape !== false && meta.shape) _addDetail(grid, 'Shape', meta.shape);
  if (cfg.diameter !== false && meta.diameter) _addDetail(grid, 'Diameter', `${meta.diameter}mm`);
  if (cfg.thickness !== false && meta.thickness) _addDetail(grid, 'Thickness', `${meta.thickness}mm`);
  if (cfg.orientation !== false && meta.orientation) _addDetail(grid, 'Orientation', meta.orientation);
  if (cfg.composition !== false && meta.composition) _addDetail(grid, 'Composition', meta.composition);
  if (cfg.country !== false && meta.country) _addDetail(grid, 'Country', meta.country);
  if (cfg.technique !== false && meta.technique) _addDetail(grid, 'Technique', meta.technique);

  if (cfg.references !== false && meta.kmReferences && meta.kmReferences.length > 0) {
    _addDetail(grid, 'References', meta.kmReferences.join(', '));
  }

  section.appendChild(grid);

  // Edge description on its own full-width line (can be long)
  if (cfg.edge !== false && meta.edgeDesc) {
    const edgeGrid = _el('div', 'view-detail-grid');
    const edgeItem = _detailItem('Edge', meta.edgeDesc);
    edgeItem.classList.add('full-width');
    edgeGrid.appendChild(edgeItem);
    section.appendChild(edgeGrid);
  }

  // Set obverse/reverse descriptions as tooltips on the image slots
  if (cfg.imageTooltips !== false && (meta.obverseDesc || meta.reverseDesc)) {
    const imgSection = container.querySelector('#viewImageSection');
    if (imgSection) {
      const slots = imgSection.querySelectorAll('.view-image-slot');
      if (meta.obverseDesc && slots[0]) {
        slots[0].title = `Obverse: ${meta.obverseDesc}`;
      }
      if (meta.reverseDesc && slots[1]) {
        slots[1].title = `Reverse: ${meta.reverseDesc}`;
      }
    }
  }

  // Tags
  if (cfg.tags !== false && meta.tags && meta.tags.length > 0) {
    const tagGrid = _el('div', 'view-detail-grid');
    const tagItem = _detailItem('Tags', meta.tags.join(', '));
    tagItem.classList.add('full-width');
    tagGrid.appendChild(tagItem);
    section.appendChild(tagGrid);
  }

  // Commemorative
  if (cfg.commemorative !== false && meta.commemorative && meta.commemorativeDesc) {
    const commGrid = _el('div', 'view-detail-grid');
    const commItem = _detailItem('Commemorative', meta.commemorativeDesc);
    commItem.classList.add('full-width');
    commGrid.appendChild(commItem);
    section.appendChild(commGrid);
  }

  // Rarity index
  if (cfg.rarity !== false && meta.rarityIndex > 0) {
    const rarityRow = _el('div', 'view-detail-item');

    const lbl = _el('span', 'view-detail-label');
    lbl.textContent = 'Rarity';
    rarityRow.appendChild(lbl);

    const bar = _el('div', 'view-rarity-bar');

    const track = _el('div', 'view-rarity-track');
    const fill = _el('div', 'view-rarity-fill');
    fill.style.width = `${Math.min(meta.rarityIndex, 100)}%`;
    track.appendChild(fill);
    bar.appendChild(track);

    const score = _el('span', 'view-rarity-score');
    score.textContent = String(meta.rarityIndex);
    bar.appendChild(score);

    rarityRow.appendChild(bar);
    section.appendChild(rarityRow);
  }

  // Mintage by year (show first few)
  if (cfg.mintage !== false && meta.mintageByYear && meta.mintageByYear.length > 0) {
    const mintGrid = _el('div', 'view-detail-grid');
    const mintItem = _el('div', 'view-detail-item full-width');
    const mintLabel = _el('span', 'view-detail-label');
    mintLabel.textContent = 'Mintage';
    mintItem.appendChild(mintLabel);

    const mintVal = _el('span', 'view-detail-value');
    const entries = meta.mintageByYear.slice(0, 5);
    mintVal.textContent = entries.map(e => {
      const m = typeof e.mintage === 'number' ? e.mintage.toLocaleString() : e.mintage;
      return `${e.year}: ${m}${e.remark ? ` (${e.remark})` : ''}`;
    }).join(' | ');
    if (meta.mintageByYear.length > 5) mintVal.textContent += ' ...';
    mintItem.appendChild(mintVal);
    mintGrid.appendChild(mintItem);
    section.appendChild(mintGrid);
  }

  placeholder.replaceWith(section);
}

// ---------------------------------------------------------------------------
// API helpers (private)
// ---------------------------------------------------------------------------

/**
 * Fetch a Numista item by catalogId. Returns the normalized result or null.
 * @param {string} catalogId
 * @returns {Promise<Object|null>}
 */
async function _fetchNumistaResult(catalogId) {
  if (!catalogId || typeof catalogAPI === 'undefined') return null;
  try {
    return await catalogAPI.lookupItem(catalogId);
  } catch {
    return null;
  }
}

/**
 * Extract metadata fields from a Numista API result.
 * @param {Object} result
 * @returns {Object}
 */
function _extractMetadata(result) {
  return {
    title: result.name || '',
    country: result.country || '',
    denomination: result.denomination || '',
    diameter: result.diameter || result.size || 0,
    thickness: result.thickness || 0,
    weight: result.weight || 0,
    shape: result.shape || '',
    composition: result.composition || result.metal || '',
    orientation: result.orientation || '',
    commemorative: !!result.commemorative,
    commemorativeDesc: result.commemorativeDesc || '',
    rarityIndex: result.rarityIndex || 0,
    kmReferences: result.kmReferences || [],
    mintageByYear: result.mintageByYear || [],
    technique: result.technique || '',
    tags: result.tags || [],
    obverseDesc: result.obverseDesc || '',
    reverseDesc: result.reverseDesc || '',
    edgeDesc: result.edgeDesc || '',
  };
}

// ---------------------------------------------------------------------------
// External popup (private)
// ---------------------------------------------------------------------------

/**
 * Open a URL in a 1250px popup window.
 * Most external sites block iframe embedding (X-Frame-Options), so we use window.open().
 * @param {string} url
 * @param {string} [name='_blank'] - Window name for reuse
 */
function _openExternalPopup(url, name) {
  const popup = window.open(
    url,
    name || '_blank',
    'width=1250,height=800,scrollbars=yes,resizable=yes,toolbar=no,location=no,menubar=no,status=no'
  );
  if (!popup) {
    // Popup blocked — let user know
    alert(`Popup blocked! Please allow popups or manually visit:\n${url}`);
  } else {
    popup.focus();
  }
}

// ---------------------------------------------------------------------------
// Color helpers (private)
// ---------------------------------------------------------------------------

/**
 * Parse a color string (hex #rrggbb or rgb(r,g,b)) into [r, g, b].
 * @param {string} color
 * @returns {number[]} [r, g, b] in 0-255
 */
function _parseColor(color) {
  if (!color) return [99, 102, 241]; // fallback indigo
  const s = color.trim();
  // Handle #rrggbb / #rgb
  if (s.startsWith('#')) {
    let hex = s.slice(1);
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
  }
  // Handle rgb(r, g, b)
  const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
  return [99, 102, 241];
}

/**
 * Darken a hex/rgb color by a factor (0–1). 0 = no change, 1 = black.
 * @param {string} color - Hex or rgb() string
 * @param {number} amount - Darkening factor
 * @returns {string} Hex color
 */
function _darkenColor(color, amount) {
  const [r, g, b] = _parseColor(color);
  const f = 1 - Math.min(Math.max(amount, 0), 1);
  const toHex = v => Math.round(v * f).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Check if a color is light based on relative luminance.
 * @param {string} color - Hex or rgb() string
 * @returns {boolean} True if light (needs dark text)
 */
function _isLightColor(color) {
  const [r, g, b] = _parseColor(color);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

// ---------------------------------------------------------------------------
// Historical spot data fetcher (private, self-contained)
// ---------------------------------------------------------------------------

/** @type {Map<number, Array>} Year-file cache shared with spot.js when available */
const _viewYearCache = new Map();

/**
 * Fetch a single year file with three-tier fallback (fetch → XHR → remote).
 * Reuses spot.js cache/fetcher when available; falls back to own implementation.
 * @param {number} year
 * @returns {Promise<Array>}
 */
function _fetchYearFile(year) {
  // Prefer spot.js fetcher (shares its dedup + cache)
  if (typeof window.fetchYearFile === 'function') {
    return window.fetchYearFile(year);
  }

  // Self-contained fallback
  if (_viewYearCache.has(year)) return Promise.resolve(_viewYearCache.get(year));

  const filename = `spot-history-${year}.json`;
  const localUrl = `data/${filename}`;
  const remoteUrl = `https://staktrakr.com/data/${filename}`;

  return fetch(localUrl)
    .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
    .catch(() => new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', localUrl, true);
      xhr.responseType = 'json';
      xhr.onload = () => (xhr.status === 200 || (xhr.status === 0 && xhr.response)) ? resolve(xhr.response) : reject(new Error(`XHR ${xhr.status}`));
      xhr.onerror = () => reject(new Error('XHR error'));
      xhr.send();
    }))
    .catch(() => fetch(remoteUrl).then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); }))
    .then(entries => {
      const valid = Array.isArray(entries) ? entries.filter(e => e && typeof e.spot === 'number' && e.metal && e.timestamp) : [];
      _viewYearCache.set(year, valid);
      return valid;
    })
    .catch(() => { _viewYearCache.set(year, []); return []; });
}

/**
 * Fetch full historical spot data for a metal by loading year files.
 * Merges fetched year-file data with live spotHistory, deduplicates by day
 * (live data wins over seed). Returns sorted {ts, spot} entries.
 *
 * For ranges <= 180 days, just returns the in-memory spotHistory slice (no fetch).
 * For longer ranges (including "All"), async-fetches year files back to 1968.
 *
 * @param {string} metalName - Metal name ('Silver', 'Gold', etc.)
 * @param {number} days - Number of days (0 = all available data)
 * @param {number} [fromTs=0] - Custom range start (0 = unbounded)
 * @param {number} [toTs=0] - Custom range end (0 = unbounded)
 * @returns {Promise<Array<{ts:number, spot:number}>>} Sorted daily spot entries
 */
async function _fetchHistoricalSpotData(metalName, days, fromTs, toTs) {
  fromTs = fromTs || 0;
  toTs = toTs || 0;

  // Calculate which years to fetch
  let startYear;
  if (fromTs > 0) {
    startYear = new Date(fromTs).getFullYear();
  } else if (days > 0 && days <= 180) {
    // Short range — in-memory spotHistory is sufficient
    const liveEntries = (typeof spotHistory !== 'undefined' ? spotHistory : [])
      .filter(e => e.metal === metalName)
      .map(e => ({ ts: new Date(e.timestamp).getTime(), spot: e.spot }));
    liveEntries.sort((a, b) => a.ts - b.ts);
    const byDay = new Map();
    for (const e of liveEntries) byDay.set(new Date(e.ts).toISOString().slice(0, 10), e);
    return [...byDay.values()].sort((a, b) => a.ts - b.ts);
  } else {
    // "All" — go back to 1968 (earliest seed data)
    startYear = 1968;
  }

  const endYear = new Date().getFullYear();
  const years = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);

  // Fetch all needed year files in parallel
  const yearArrays = await Promise.all(years.map(_fetchYearFile));
  const allHistorical = yearArrays.flat();

  // Merge historical + live spotHistory
  const live = typeof spotHistory !== 'undefined' ? spotHistory : [];
  const combined = [...allHistorical, ...live]
    .filter(e => e.metal === metalName)
    .map(e => ({ ts: new Date(e.timestamp).getTime(), spot: e.spot }));

  // Sort chronologically
  combined.sort((a, b) => a.ts - b.ts);

  // Dedup to one entry per day (later entries win — live data appended after seed)
  const byDay = new Map();
  for (const e of combined) {
    byDay.set(new Date(e.ts).toISOString().slice(0, 10), e);
  }

  return [...byDay.values()].sort((a, b) => a.ts - b.ts);
}

// ---------------------------------------------------------------------------
// Price history chart (private)
// ---------------------------------------------------------------------------

/**
 * Create a Chart.js line chart showing price history for the viewed item.
 * Primary: melt value derived from spotHistory (dense daily data).
 * Secondary: retail value anchored from purchase date/price to current market value,
 *   with sparse itemPriceHistory snapshots in between.
 * Purchase price shown as a flat dashed reference line.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Array<{ts:number, spot:number}>} allSpotEntries - Daily spot prices for this metal
 * @param {Array<{ts:number, retail:number}>} allRetailEntries - Sparse retail value snapshots
 * @param {number} purchasePerUnit - Original purchase price per unit
 * @param {number} meltFactor - weightOz * qty * purity (melt = spot * meltFactor)
 * @param {number} [days=0] - Number of days to show (0 = all)
 * @param {number} [purchaseDate=0] - Purchase date timestamp (anchor start for retail line)
 * @param {number} [currentRetail=0] - Current market/retail value (anchor end for retail line)
 * @param {number} [fromTs=0] - Custom range start timestamp (0 = unbounded)
 * @param {number} [toTs=0] - Custom range end timestamp (0 = unbounded)
 */
function _createPriceHistoryChart(canvas, allSpotEntries, allRetailEntries, purchasePerUnit, meltFactor, days, purchaseDate, currentRetail, fromTs, toTs) {
  if (typeof Chart === 'undefined') return;

  // Destroy any previous instance
  if (_viewModalChartInstance) {
    _viewModalChartInstance.destroy();
    _viewModalChartInstance = null;
  }

  // Filter spot entries by time range
  fromTs = fromTs || 0;
  toTs = toTs || 0;
  const cutoff = days > 0 ? Date.now() - (days * 86400000) : 0;
  let spotEntries;
  if (fromTs > 0 || toTs > 0) {
    // Custom date range mode
    spotEntries = allSpotEntries.filter(e =>
      (fromTs <= 0 || e.ts >= fromTs) && (toTs <= 0 || e.ts <= toTs)
    );
  } else {
    spotEntries = cutoff > 0 ? allSpotEntries.filter(e => e.ts >= cutoff) : [...allSpotEntries];
  }

  // If "All" range or custom range and purchase date is before earliest spot data,
  // prepend a synthetic entry so the chart extends back to purchase date
  const isAllOrCustom = days === 0 || fromTs > 0 || toTs > 0;
  if (isAllOrCustom && purchaseDate > 0 && spotEntries.length > 0 && purchaseDate < spotEntries[0].ts) {
    spotEntries.unshift({ ts: purchaseDate, spot: spotEntries[0].spot });
  }

  // Show fallback message if insufficient data for selected range
  const container = canvas.parentElement;
  const existingMsg = container.querySelector('.view-chart-no-data');
  if (existingMsg) existingMsg.remove();
  canvas.style.display = '';

  if (spotEntries.length < 2) {
    canvas.style.display = 'none';
    const msg = _el('div', 'view-chart-no-data');
    msg.textContent = 'Not enough data for this range';
    container.appendChild(msg);
    return;
  }

  // Build labels + melt data from spot entries
  // Include year in labels when range spans multiple years
  const firstYear = new Date(spotEntries[0].ts).getFullYear();
  const lastYear = new Date(spotEntries[spotEntries.length - 1].ts).getFullYear();
  const multiYear = lastYear - firstYear >= 1;
  const labels = spotEntries.map(e => {
    const d = new Date(e.ts);
    if (multiYear) {
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  });
  const meltData = spotEntries.map(e => parseFloat((e.spot * meltFactor).toFixed(2)));
  const purchaseLine = spotEntries.map(() => purchasePerUnit);

  // Build retail data: anchored from purchase date to present, with sparse midpoints.
  // Uses index-based snapping to find the nearest spot entry for each retail point,
  // since anchor dates may not have an exact-match spot entry on that calendar day.
  const retailData = new Array(spotEntries.length).fill(null);

  // Helper: find the index of the spot entry nearest to a given timestamp
  const _nearestSpotIdx = (ts) => {
    let best = 0;
    let bestDist = Math.abs(spotEntries[0].ts - ts);
    for (let i = 1; i < spotEntries.length; i++) {
      const dist = Math.abs(spotEntries[i].ts - ts);
      if (dist < bestDist) { best = i; bestDist = dist; }
    }
    return best;
  };

  // Anchor start: purchase price at the leftmost chart position.
  // If purchase date is within the visible range, snap to that day.
  // If purchase date is before the range, pin to index 0 so the
  // retail line always starts with "what you paid" as a reference.
  if (purchaseDate > 0) {
    if (purchaseDate >= spotEntries[0].ts &&
        purchaseDate <= spotEntries[spotEntries.length - 1].ts) {
      const idx = _nearestSpotIdx(purchaseDate);
      retailData[idx] = purchasePerUnit;
    } else if (purchaseDate < spotEntries[0].ts) {
      retailData[0] = purchasePerUnit;
    }
  }

  // Middle: sparse itemPriceHistory retail values snapped to nearest spot day
  for (const re of allRetailEntries) {
    if (cutoff > 0 && re.ts < cutoff) continue;
    if (fromTs > 0 && re.ts < fromTs) continue;
    if (toTs > 0 && re.ts > toTs) continue;
    const idx = _nearestSpotIdx(re.ts);
    retailData[idx] = re.retail;
  }

  // Anchor end: current market value on the last spot entry (≈ today)
  if (currentRetail > 0) {
    retailData[spotEntries.length - 1] = currentRetail;
  }

  const hasRetail = retailData.some(v => v !== null);

  const showPoints = spotEntries.length <= 30;

  const textColor = typeof getChartTextColor === 'function' ? getChartTextColor() : '#1e293b';
  const bgColor = typeof getChartBackgroundColor === 'function' ? getChartBackgroundColor() : '#f8fafc';

  // Dataset order: purchase (bottom) → melt (middle) → retail (top)
  // Layered fills create visual bands showing cost basis, intrinsic value, and market premium
  const datasets = [
    {
      label: 'Purchase Price',
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
      label: 'Melt Value',
      data: meltData,
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      fill: 'origin',
      tension: 0.3,
      pointRadius: showPoints ? 3 : 0,
      pointHoverRadius: 5,
      borderWidth: 2,
      order: 2,
    },
    {
      label: 'Retail Value',
      data: retailData,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
      fill: 'origin',
      tension: 0.3,
      spanGaps: true,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2,
      hidden: !hasRetail,
      order: 1,
    },
  ];

  _viewModalChartInstance = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          ticks: {
            color: textColor,
            maxTicksLimit: 6,
            autoSkip: true,
            font: { size: 10 }
          },
          grid: { display: false }
        },
        y: {
          ticks: {
            color: textColor,
            font: { size: 10 },
            callback: function(value) {
              return typeof formatCurrency === 'function' ? formatCurrency(value) : '$' + value;
            }
          },
          grid: { color: 'rgba(128,128,128,0.1)' }
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: textColor,
            usePointStyle: true,
            pointStyle: 'line',
            padding: 12,
            font: { size: 10 }
          }
        },
        tooltip: {
          backgroundColor: bgColor,
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: textColor,
          borderWidth: 1,
          callbacks: {
            label: function(ctx) {
              if (ctx.parsed.y === null) return null;
              const val = typeof formatCurrency === 'function' ? formatCurrency(ctx.parsed.y) : '$' + ctx.parsed.y;
              return `${ctx.dataset.label}: ${val}`;
            }
          }
        }
      }
    }
  });
}

// ---------------------------------------------------------------------------
// DOM helpers (private)
// ---------------------------------------------------------------------------

/** Create element with className */
function _el(tag, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

/** Create a data section with title */
function _section(title) {
  const section = _el('div', 'view-detail-section');
  const h = _el('div', 'view-section-title');
  h.textContent = title;
  section.appendChild(h);
  return section;
}

/** Create a label/value detail item element */
function _detailItem(label, value, extraClass) {
  const item = _el('div', 'view-detail-item');
  const lbl = _el('span', 'view-detail-label');
  lbl.textContent = label;
  const val = _el('span', 'view-detail-value' + (extraClass ? ' ' + extraClass : ''));
  val.textContent = value;
  item.appendChild(lbl);
  item.appendChild(val);
  return item;
}

/** Add a detail item to a grid */
function _addDetail(grid, label, value, extraClass) {
  grid.appendChild(_detailItem(label, value, extraClass));
}

/** Create an image slot with placeholder */
function _imageSlot(side, label) {
  const slot = _el('div', 'view-image-slot');
  slot.dataset.side = side;

  const ph = _el('div', 'view-image-placeholder');
  ph.textContent = '\uD83E\uDE99'; // coin emoji
  slot.appendChild(ph);

  const lbl = _el('span', 'view-image-label');
  lbl.textContent = label;
  slot.appendChild(lbl);

  return slot;
}

/** Replace placeholder with actual image in a slot */
function _setSlotImage(slot, src) {
  if (!slot || !src) return;

  // If an image already exists, update its src (for override replacement)
  const existing = slot.querySelector('img');
  if (existing) {
    existing.src = src;
    existing.style.display = '';
    return;
  }

  // First time: replace placeholder with new img element
  const ph = slot.querySelector('.view-image-placeholder');
  if (!ph) return;

  const img = document.createElement('img');
  img.src = src;
  img.alt = slot.dataset.side || 'Coin';
  // Only use lazy loading for network URLs — blob URLs are already in memory
  // and lazy loading can prevent display in modals that just became visible
  if (!src.startsWith('blob:')) img.loading = 'lazy';
  img.onerror = () => { img.style.display = 'none'; };
  ph.replaceWith(img);
}

// ---------------------------------------------------------------------------
// Global exposure
// ---------------------------------------------------------------------------

// ESC key handler
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('viewItemModal');
    if (modal && modal.style.display !== 'none') {
      closeViewModal();
    }
  }
});

if (typeof window !== 'undefined') {
  window.showViewModal = showViewModal;
  window.closeViewModal = closeViewModal;
}

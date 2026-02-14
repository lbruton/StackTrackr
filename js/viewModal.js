// VIEW ITEM MODAL — Card-style showcase with coin images + enriched data
// =============================================================================

/**
 * Active object URLs created for the current view modal session.
 * Revoked on modal close to prevent memory leaks.
 * @type {string[]}
 */
let _viewModalObjectUrls = [];

/** @type {number} Metadata cache TTL: 30 days in ms */
const VIEW_METADATA_TTL = 30 * 24 * 60 * 60 * 1000;

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

  modal.style.display = 'flex';

  // Load images and Numista data asynchronously after modal is visible
  // Share a single API result to avoid duplicate calls
  const catalogId = item.numistaId || '';
  let apiResult = null;

  // Try loading images from cache/item first
  const imagesLoaded = await loadViewImages(item, body, null);

  // If images or metadata are needed, do a single API lookup
  if (catalogId && (!imagesLoaded || body.querySelector('#viewNumistaSection'))) {
    apiResult = await _fetchNumistaResult(catalogId);
  }

  // Fill images from API result if cache/item didn't have them
  if (!imagesLoaded && apiResult) {
    const section = body.querySelector('#viewImageSection');
    if (section) {
      const slots = section.querySelectorAll('.view-image-slot');
      if (apiResult.imageUrl) _setSlotImage(slots[0], apiResult.imageUrl);
      if (apiResult.reverseImageUrl) _setSlotImage(slots[1], apiResult.reverseImageUrl);

      // Cache for next time
      if (window.imageCache?.isAvailable()) {
        imageCache.cacheImages(catalogId, apiResult.imageUrl || '', apiResult.reverseImageUrl || '').catch(() => {});
      }
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

  // --- Image section (placeholders, populated async) ---
  // Detect non-round items: bars, notes, Aurum/Goldback, sets → use rectangular frame
  const itemType = (item.type || '').toLowerCase();
  const isRectShape = itemType === 'bar' || itemType === 'note' || itemType === 'aurum'
    || itemType === 'set' || isGb;

  const imgSection = _el('div', 'view-image-section' + (isRectShape ? ' view-shape-rect' : ''));
  imgSection.id = 'viewImageSection';

  const obvSlot = _imageSlot('obverse', 'Obverse');
  const revSlot = _imageSlot('reverse', 'Reverse');
  imgSection.appendChild(obvSlot);
  imgSection.appendChild(revSlot);
  frag.appendChild(imgSection);

  // --- Inventory data ---
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
  _addDetail(invGrid2, 'Purchase', typeof formatCurrency === 'function' ? formatCurrency(parseFloat(item.price) || 0) : `$${item.price}`);
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
      // Display: strip protocol and www, truncate domain suffix for readability
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
  frag.appendChild(invSection);

  // --- Valuation ---
  const meltValue = currentSpot > 0 ? weightOz * qty * currentSpot * purity : 0;
  const purchaseTotal = qty * (parseFloat(item.price) || 0);
  const marketVal = parseFloat(item.marketValue) || 0;
  const retailTotal = marketVal > 0 ? qty * marketVal : meltValue;
  const gainLoss = retailTotal > 0 ? retailTotal - purchaseTotal : null;

  const valSection = _section('Valuation');
  const valGrid = _el('div', 'view-detail-grid three-col');
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
  frag.appendChild(valSection);

  // --- Grading (conditional) ---
  if (item.grade || item.gradingAuthority || item.certNumber) {
    const gradeSection = _section('Grading');
    const gradeGrid = _el('div', 'view-detail-grid three-col');
    _addDetail(gradeGrid, 'Grade', item.grade || '—');
    _addDetail(gradeGrid, 'Authority', item.gradingAuthority || '—');
    if (item.certNumber) {
      const certItem = _detailItem('Cert #', item.certNumber);
      // Add verification link if authority has a lookup URL
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
    frag.appendChild(gradeSection);
  }

  // --- Numista enrichment placeholder (populated async) ---
  const numistaPlaceholder = _el('div', '');
  numistaPlaceholder.id = 'viewNumistaSection';
  frag.appendChild(numistaPlaceholder);

  // --- Notes ---
  if (item.notes) {
    const notesSection = _section('Notes');
    const noteText = _el('div', 'view-notes-text');
    noteText.textContent = item.notes;
    notesSection.appendChild(noteText);
    frag.appendChild(notesSection);
  }

  // --- Footer ---
  const footer = _el('div', 'view-modal-footer');

  // Left side — eBay search
  const footerLeft = _el('div', 'view-footer-left');
  const ebayBtn = document.createElement('button');
  ebayBtn.className = 'view-ebay-btn';
  ebayBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style="fill:currentColor;margin-right:4px;vertical-align:-2px;"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2.5"/><line x1="15" y1="15" x2="21" y2="21" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>Search eBay';
  ebayBtn.title = 'Search eBay for this item';
  ebayBtn.addEventListener('click', () => {
    const searchTerm = (item.metal || '') + (item.year ? ' ' + item.year : '') + ' ' + (item.name || '');
    if (typeof openEbayBuySearch === 'function') {
      openEbayBuySearch(searchTerm);
    } else if (typeof openEbaySoldSearch === 'function') {
      openEbaySoldSearch(searchTerm);
    }
  });
  footerLeft.appendChild(ebayBtn);
  footer.appendChild(footerLeft);

  // Right side — Edit + Close
  const footerRight = _el('div', 'view-footer-right');

  const editBtn = document.createElement('button');
  editBtn.className = 'view-edit-btn';
  editBtn.textContent = 'Edit Item';
  editBtn.addEventListener('click', () => {
    closeViewModal();
    if (typeof editItem === 'function') editItem(index);
  });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', closeViewModal);

  footerRight.appendChild(editBtn);
  footerRight.appendChild(closeBtn);
  footer.appendChild(footerRight);
  frag.appendChild(footer);

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
async function loadViewImages(item, container) {
  const section = container.querySelector('#viewImageSection');
  if (!section) return false;

  const catalogId = item.numistaId || '';
  const slots = section.querySelectorAll('.view-image-slot');
  const obvSlot = slots[0];
  const revSlot = slots[1];

  // Attempt IndexedDB cache first
  if (catalogId && window.imageCache?.isAvailable()) {
    const obvUrl = await imageCache.getImageUrl(catalogId, 'obverse');
    if (obvUrl) {
      _viewModalObjectUrls.push(obvUrl);
      _setSlotImage(obvSlot, obvUrl);
    }

    const revUrl = await imageCache.getImageUrl(catalogId, 'reverse');
    if (revUrl) {
      _viewModalObjectUrls.push(revUrl);
      _setSlotImage(revSlot, revUrl);
    }

    if (obvUrl || revUrl) return true;
  }

  // Fallback: CDN URLs stored on the item (validate to skip corrupted URLs)
  const validObv = ImageCache.isValidImageUrl(item.obverseImageUrl);
  const validRev = ImageCache.isValidImageUrl(item.reverseImageUrl);
  if (validObv) _setSlotImage(obvSlot, item.obverseImageUrl);
  if (validRev) _setSlotImage(revSlot, item.reverseImageUrl);
  if (validObv || validRev) return true;

  return false;
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
  const ph = slot.querySelector('.view-image-placeholder');
  if (!ph) return;

  const img = document.createElement('img');
  img.src = src;
  img.alt = slot.dataset.side || 'Coin';
  img.loading = 'lazy';
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

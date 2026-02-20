// PORTAL VIEW UTILITIES
// =============================================================================

/**
 * Updates the max-height of .portal-scroll (table view) and #cardViewGrid (card
 * view) to show at most `itemsPerPage` items. Measures actual rendered heights
 * (thead + first row for table, first card + gap for grid) so it adapts to font
 * scaling, browser zoom, and responsive breakpoints.
 *
 * If all items fit within the computed height, max-height is removed to avoid
 * an unnecessary scrollbar.
 *
 * Called by renderTable() after rows are inserted into the DOM.
 */
const updatePortalHeight = () => {
  // Card view portal height
  const cardGrid = safeGetElement('cardViewGrid');
  if (cardGrid && cardGrid.style.display !== 'none') {
    const firstCard = cardGrid.querySelector('article');
    if (!firstCard) {
      cardGrid.style.maxHeight = '';
      cardGrid.style.overflowY = '';
      return;
    }
    const cardRect = firstCard.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(cardGrid).gap) || 10;
    const cardHeight = cardRect.height + gap;
    const totalCards = cardGrid.querySelectorAll('article').length;

    // Determine columns from card width vs container width
    const gridWidth = cardGrid.getBoundingClientRect().width;
    const cols = Math.max(1, Math.round(gridWidth / (cardRect.width + gap)));

    if (itemsPerPage === Infinity || totalCards <= itemsPerPage) {
      cardGrid.style.maxHeight = 'none';
      cardGrid.style.overflowY = '';
    } else {
      const rowsToShow = Math.ceil(itemsPerPage / cols);
      const portalHeight = rowsToShow * cardHeight;
      cardGrid.style.maxHeight = `${portalHeight}px`;
      cardGrid.style.overflowY = 'auto';
    }
    return;
  }

  // Table view portal height
  const portalScroll = document.querySelector('.portal-scroll');
  if (!portalScroll) return;

  const table = safeGetElement('inventoryTable');
  if (!table) return;

  const thead = table.querySelector('thead');
  const firstRow = table.querySelector('tbody tr');

  if (!thead || !firstRow) {
    portalScroll.style.maxHeight = '';
    return;
  }

  const theadHeight = thead.getBoundingClientRect().height;
  const rowHeight = firstRow.getBoundingClientRect().height;
  const totalRows = table.querySelectorAll('tbody tr').length;

  // If all rows fit (or "All" selected), remove scroll constraint
  if (totalRows <= itemsPerPage) {
    portalScroll.style.maxHeight = 'none';
    portalScroll.style.overflowY = '';
    return;
  }

  // Portal height = thead + (visibleRows × rowHeight) + 1px border allowance
  const portalHeight = theadHeight + (itemsPerPage * rowHeight) + 1;
  portalScroll.style.maxHeight = `${portalHeight}px`;
};

// Expose globally
window.updatePortalHeight = updatePortalHeight;

// =============================================================================

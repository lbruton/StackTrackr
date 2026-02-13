// PORTAL VIEW UTILITIES
// =============================================================================

/**
 * Updates the max-height of .table-section to show exactly `itemsPerPage` rows.
 * Measures actual rendered heights (thead + first row) so it adapts to font
 * scaling, browser zoom, and responsive breakpoints.
 *
 * If all rows fit within the computed height, max-height is removed to avoid
 * an unnecessary scrollbar.
 *
 * Called by renderTable() after rows are inserted into the DOM.
 */
const updatePortalHeight = () => {
  const portalScroll = document.querySelector('.portal-scroll');
  if (!portalScroll) return;

  // Card view at ≤1024px or landscape touch tablets (STACK-31 / STACK-70):
  // cards scroll naturally in the page
  if (window.innerWidth <= 1024 || document.body.classList.contains('force-card-view')) {
    portalScroll.style.maxHeight = '';
    return;
  }

  const table = document.getElementById('inventoryTable');
  if (!table) return;

  const thead = table.querySelector('thead');
  const firstRow = table.querySelector('tbody tr');

  if (!thead || !firstRow) {
    // Empty table — remove max-height constraint
    portalScroll.style.maxHeight = '';
    return;
  }

  const theadHeight = thead.getBoundingClientRect().height;
  const rowHeight = firstRow.getBoundingClientRect().height;
  const totalRows = table.querySelectorAll('tbody tr').length;

  // If all rows fit, no need for a scrollbar
  if (totalRows <= itemsPerPage) {
    portalScroll.style.maxHeight = '';
    return;
  }

  // Portal height = thead + (visibleRows × rowHeight) + 1px border allowance
  const portalHeight = theadHeight + (itemsPerPage * rowHeight) + 1;
  portalScroll.style.maxHeight = `${portalHeight}px`;
};

// Expose globally
window.updatePortalHeight = updatePortalHeight;

// =============================================================================

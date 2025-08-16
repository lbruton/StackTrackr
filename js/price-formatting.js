/**
 * Price columns formatting and enhancements
 */

document.addEventListener('DOMContentLoaded', function() {
  // Add helpful price column tooltips
  const priceColumns = {
    'purchasePrice': 'Original purchase price paid for this item',
    'marketValue': 'Current estimated market value based on recent sales data',
    'spot': 'Spot price of the metal at time of purchase',
    'premium': 'Additional cost above spot price (Premium = Purchase Price - Spot Price)'
  };
  
  // Add column header tooltips
  Object.keys(priceColumns).forEach(column => {
    const header = document.querySelector(`th[data-column="${column}"]`);
    if (header) {
      header.setAttribute('title', priceColumns[column]);
    }
  });
  
  // Add hover effect to price indicators to make them more interactive
  document.addEventListener('mouseover', function(e) {
    if (e.target && e.target.classList.contains('price-indicator')) {
      // Find parent cell
      const cell = e.target.closest('td');
      if (cell) {
        // Highlight all cells in the same column
        const columnName = cell.getAttribute('data-column');
        if (columnName) {
          const columnCells = document.querySelectorAll(`td[data-column="${columnName}"]`);
          columnCells.forEach(cell => cell.classList.add('highlight-column'));
        }
      }
    }
  });
  
  document.addEventListener('mouseout', function(e) {
    if (e.target && e.target.classList.contains('price-indicator')) {
      // Remove highlights
      document.querySelectorAll('.highlight-column').forEach(el => {
        el.classList.remove('highlight-column');
      });
    }
  });
  
  // Add CSS for column highlighting
  const style = document.createElement('style');
  style.innerHTML = `
    .highlight-column {
      background-color: var(--row-hover-bg) !important;
    }
    
    /* Make the table header price indicators more visible */
    th .price-indicator {
      margin-right: 5px;
      width: 12px;
      height: 12px;
    }
  `;
  document.head.appendChild(style);
});

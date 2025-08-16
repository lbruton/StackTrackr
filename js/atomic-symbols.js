/**
 * Renders an atomic symbol for a metal
 * @param {string} metal - The metal type (Silver, Gold, etc.)
 * @returns {string} HTML for the atomic symbol
 */
function renderAtomicSymbol(metal) {
  const symbols = {
    'Silver': { symbol: 'Ag', number: '47', fullName: 'Silver (Argentum)' },
    'Gold': { symbol: 'Au', number: '79', fullName: 'Gold (Aurum)' },
    'Platinum': { symbol: 'Pt', number: '78', fullName: 'Platinum' },
    'Palladium': { symbol: 'Pd', number: '46', fullName: 'Palladium' },
    'Copper': { symbol: 'Cu', number: '29', fullName: 'Copper (Cuprum)' },
    'Alloy/Other': { symbol: '??', number: '--', fullName: 'Alloy or Other Metal' }
  };

  const metalKey = metal || 'Alloy/Other';
  const info = symbols[metalKey] || symbols['Alloy/Other'];
  const cssClass = metalKey.toLowerCase().split('/')[0];
  
  // Make clickable for filtering
  const handler = `applyColumnFilter('metal', ${JSON.stringify(metalKey)})`;
  // Use our own escaping function as escapeAttribute might not be available yet
  const escaped = safeEscapeAttribute(handler);
  
  return `<div class="atomic-symbol ${cssClass}" 
    title="${info.fullName} - Click to filter" 
    onclick="${escaped}" 
    tabindex="0" 
    role="button"
    onkeydown="if(event.key==='Enter'||event.key===' ')${escaped}">
    ${info.symbol}
  </div>`;
}

/**
 * Helper function to escape attribute values
 * Internal version to avoid dependency issues with file:// protocol
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function safeEscapeAttribute(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Make the function globally available and ensure it works with file:// protocol
if (typeof window !== 'undefined') {
  window.renderAtomicSymbol = renderAtomicSymbol;
  
  // For file:// protocol compatibility
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Atomic symbols module initialized');
    // Set default to use atomic symbols
    if (window.localStorage.getItem('useAtomicSymbols') === null) {
      window.localStorage.setItem('useAtomicSymbols', 'true');
    }
  });
}

/**
 * Functions for handling external link popups
 * - eBay searches
 * - Numista coin information
 */

/**
 * Opens a popup window with an eBay search for the given query
 * @param {string} query - Search query for eBay
 */
function openEbaySearchPopup(query) {
  const encodedQuery = encodeURIComponent(query + ' sold');
  const url = `https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}&LH_Complete=1&LH_Sold=1`;
  
  // Open popup with no UI controls
  window.open(
    url, 
    'ebaySearch', 
    'width=1000,height=800,toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes'
  );
}

/**
 * Opens a popup window with Numista coin information
 * @param {string} numistaId - Numista ID
 */
function openNumistaPopup(numistaId) {
  const url = `https://en.numista.com/catalogue/pieces${numistaId}.html`;
  
  // Open popup with no UI controls
  window.open(
    url, 
    'numistaInfo', 
    'width=1000,height=800,toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes'
  );
}

// Make functions available globally
if (typeof window !== 'undefined') {
  window.openEbaySearchPopup = openEbaySearchPopup;
  window.openNumistaPopup = openNumistaPopup;
}

/**
 * NUMISTA MODAL FUNCTIONALITY
 *
 * Opens Numista coin database pages in a popup window.
 * Numista sets X-Frame-Options: SAMEORIGIN, so iframes are blocked
 * on hosted deployments. Popup windows work on both file:// and HTTP.
 */

/**
 * Opens the Numista page for the specified coin in a popup window.
 *
 * @param {string} numistaId - The Numista catalog ID
 * @param {string} coinName - The name of the coin (used for window title)
 */
function openNumistaModal(numistaId, coinName) {
  const isSet = /^S/i.test(numistaId);
  const cleanId = numistaId.replace(/^[NS]?#?\s*/i, '').trim();
  const url = isSet
    ? `https://en.numista.com/catalogue/set.php?id=${cleanId}`
    : `https://en.numista.com/catalogue/pieces${cleanId}.html`;

  const popup = window.open(
    url,
    `numista_${numistaId}`,
    'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,location=no,menubar=no,status=no'
  );

  if (!popup) {
    alert(`Popup blocked! Please allow popups or manually visit:\n${url}`);
  } else {
    popup.focus();
  }
}

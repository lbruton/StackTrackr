// PAGINATION FUNCTIONS
// =============================================================================

/**
 * Calculates total number of pages based on current data
 * 
 * @param {Array} [data=inventory] - Data to paginate
 * @returns {number} Total number of pages
 */
const calculateTotalPages = (data = inventory) => {
  return Math.max(1, Math.ceil(data.length / itemsPerPage));
};

/**
 * Renders pagination controls based on current state
 * 
 * @param {Array} [filteredData=filterInventory()] - Filtered data to paginate
 */
const renderPagination = (filteredData = filterInventory()) => {
  const totalPages = calculateTotalPages(filteredData);
  const pageNumbersContainer = elements.pageNumbers;
  pageNumbersContainer.innerHTML = '';

  // Show limited page numbers (max 7) centered around current page
  const maxVisiblePages = 7;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  // Adjust startPage if we're near the end
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  // Add page number buttons
  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = `pagination-btn${currentPage === i ? ' active' : ''}`;
    btn.onclick = () => goToPage(i);
    pageNumbersContainer.appendChild(btn);
  }

  // Update button states
  elements.firstPage.disabled = currentPage === 1;
  elements.prevPage.disabled = currentPage === 1;
  elements.nextPage.disabled = currentPage === totalPages;
  elements.lastPage.disabled = currentPage === totalPages;

  // Update search results info
  if (searchQuery.trim()) {
    elements.searchResultsInfo.textContent = `Found ${filteredData.length} results matching "${searchQuery}"`;
  } else {
    elements.searchResultsInfo.textContent = '';
  }
};

/**
 * Navigates to specified page number
 * 
 * @param {number} page - Page number to navigate to
 */
const goToPage = (page) => {
  const filteredData = filterInventory();
  const totalPages = calculateTotalPages(filteredData);
  currentPage = Math.max(1, Math.min(page, totalPages));
  renderTable();
};

// =============================================================================

// DETAILS MODAL FUNCTIONS WITH PIE CHART INTEGRATION
// =============================================================================

/**
 * Calculates breakdown data for specified metal by type and location
 * RENAMED from calculateBreakdownData to avoid 403 errors
 * 
 * @param {string} metal - Metal type to calculate ('Silver', 'Gold', 'Platinum', or 'Palladium')
 * @returns {Object} Breakdown data organized by type and location
 */
const getBreakdownData = (metal) => {
  const metalItems = inventory.filter(item => item.metal === metal);

  const typeBreakdown = {};
  const locationBreakdown = {};

  metalItems.forEach(item => {
    const itemWeight = item.qty * item.weight;
    const itemValue = item.qty * item.price;

    // Type breakdown
    if (!typeBreakdown[item.type]) {
      typeBreakdown[item.type] = {
        count: 0,
        weight: 0,
        value: 0
      };
    }
    typeBreakdown[item.type].count += item.qty;
    typeBreakdown[item.type].weight += itemWeight;
    typeBreakdown[item.type].value += itemValue;

    // Location breakdown
    if (!locationBreakdown[item.purchaseLocation]) {
      locationBreakdown[item.purchaseLocation] = {
        count: 0,
        weight: 0,
        value: 0
      };
    }
    locationBreakdown[item.purchaseLocation].count += item.qty;
    locationBreakdown[item.purchaseLocation].weight += itemWeight;
    locationBreakdown[item.purchaseLocation].value += itemValue;
  });

  return { typeBreakdown, locationBreakdown };
};

/**
 * Creates breakdown DOM elements for display
 * CHANGED from renderBreakdownHTML to use DOM methods instead of innerHTML
 * 
 * @param {Object} breakdown - Breakdown data object
 * @returns {DocumentFragment} DOM fragment containing the breakdown elements
 */
const createBreakdownElements = (breakdown) => {
  const container = document.createDocumentFragment();

  if (Object.keys(breakdown).length === 0) {
    const item = document.createElement('div');
    item.className = 'breakdown-item';

    const label = document.createElement('span');
    label.className = 'breakdown-label';
    label.textContent = 'No data available';

    item.appendChild(label);
    container.appendChild(item);
    return container;
  }

  // Sort by value descending
  const sortedEntries = Object.entries(breakdown).sort((a, b) => b[1].value - a[1].value);

  sortedEntries.forEach(([key, data]) => {
    const item = document.createElement('div');
    item.className = 'breakdown-item';

    const label = document.createElement('span');
    label.className = 'breakdown-label';
    label.textContent = key;

    const values = document.createElement('div');
    values.className = 'breakdown-values';

    const count = document.createElement('div');
    count.className = 'breakdown-count';
    count.textContent = `${data.count} items`;

    const weight = document.createElement('div');
    weight.className = 'breakdown-weight';
    weight.textContent = `${data.weight.toFixed(2)} oz`;

    const value = document.createElement('div');
    value.className = 'breakdown-value';
    value.textContent = formatCurrency(data.value);

    values.appendChild(count);
    values.appendChild(weight);
    values.appendChild(value);

    item.appendChild(label);
    item.appendChild(values);
    container.appendChild(item);
  });

  return container;
};

/**
 * Shows the details modal for specified metal with pie charts
 * 
 * @param {string} metal - Metal type to show details for
 */
const showDetailsModal = (metal) => {
  const breakdownData = getBreakdownData(metal);

  // Update modal title
  elements.detailsModalTitle.textContent = `${metal} Detailed Breakdown`;

  // Clear existing content
  elements.typeBreakdown.textContent = '';
  elements.locationBreakdown.textContent = '';

  // Destroy existing charts
  destroyCharts();

  // Create pie charts if there's data
  if (Object.keys(breakdownData.typeBreakdown).length > 0) {
    chartInstances.typeChart = createPieChart(
      elements.typeChart,
      breakdownData.typeBreakdown,
      'Type Breakdown'
    );
  }

  if (Object.keys(breakdownData.locationBreakdown).length > 0) {
    chartInstances.locationChart = createPieChart(
      elements.locationChart,
      breakdownData.locationBreakdown,
      'Location Breakdown'
    );
  }

  // Append DOM elements for detailed breakdown
  elements.typeBreakdown.appendChild(createBreakdownElements(breakdownData.typeBreakdown));
  elements.locationBreakdown.appendChild(createBreakdownElements(breakdownData.locationBreakdown));

  // Show modal
  if (window.openModalById) openModalById('detailsModal');
  else {
    elements.detailsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  // Add chart resize handling
  const resizeObserver = new ResizeObserver(() => {
    Object.values(chartInstances).forEach(chart => {
      if (chart) {
        chart.resize();
      }
    });
  });

  resizeObserver.observe(elements.detailsModal);
};

/**
 * Closes the details modal and cleans up charts
 */
const closeDetailsModal = () => {
  if (window.closeModalById) closeModalById('detailsModal');
  else {
    elements.detailsModal.style.display = 'none';
    try { document.body.style.overflow = ''; } catch (e) {}
  }
  destroyCharts();
};

// =============================================================================

// Expose details modal functions globally for inline handlers
window.showDetailsModal = showDetailsModal;
window.closeDetailsModal = closeDetailsModal;

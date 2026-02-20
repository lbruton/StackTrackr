// RETAIL VIEW MODAL
// =============================================================================

let _retailViewModalChart = null;

/**
 * Opens the per-coin retail price detail modal.
 * @param {string} slug - Coin slug (e.g. "ase")
 */
const openRetailViewModal = (slug) => {
  const meta = RETAIL_COIN_META[slug];
  if (!meta) return;

  const titleEl = safeGetElement("retailViewCoinName");
  const subtitleEl = safeGetElement("retailViewModalSubtitle");
  const currentTableBody = safeGetElement("retailViewCurrentTableBody");
  const historyTableBody = safeGetElement("retailViewHistoryTableBody");
  const chartCanvas = safeGetElement("retailViewChart");

  titleEl.textContent = meta.name;
  subtitleEl.textContent = `${meta.weight} troy oz \u00b7 ${meta.metal}`;

  // Current prices table
  const priceData = retailPrices && retailPrices.prices ? retailPrices.prices[slug] || null : null;
  currentTableBody.innerHTML = "";
  if (priceData) {
    Object.entries(RETAIL_VENDOR_NAMES).forEach(([key, label]) => {
      const price = priceData.prices_by_site && priceData.prices_by_site[key];
      const score = priceData.scores_by_site && priceData.scores_by_site[key];
      if (price == null) return;
      const tr = document.createElement("tr");

      const tdLabel = document.createElement("td");
      tdLabel.textContent = label;

      const tdPrice = document.createElement("td");
      tdPrice.textContent = `$${Number(price).toFixed(2)}`;

      const tdScore = document.createElement("td");
      tdScore.textContent = score != null ? String(score) : "\u2014";

      tr.appendChild(tdLabel);
      tr.appendChild(tdPrice);
      tr.appendChild(tdScore);
      currentTableBody.appendChild(tr);
    });
  } else {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.className = "settings-subtext";
    td.textContent = "No current data";
    tr.appendChild(td);
    currentTableBody.appendChild(tr);
  }

  // History table
  const history = getRetailHistoryForSlug(slug);
  historyTableBody.innerHTML = "";
  history.forEach((entry) => {
    const tr = document.createElement("tr");
    const fmt = (v) => (v != null ? `$${Number(v).toFixed(2)}` : "\u2014");
    [entry.date, fmt(entry.average_price), fmt(entry.median_price), fmt(entry.lowest_price)].forEach((text) => {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });
    historyTableBody.appendChild(tr);
  });

  // Chart (average price over time)
  if (_retailViewModalChart) {
    _retailViewModalChart.destroy();
    _retailViewModalChart = null;
  }
  if (history.length > 1 && chartCanvas instanceof HTMLCanvasElement && typeof Chart !== "undefined") {
    const sorted = [...history].reverse();
    _retailViewModalChart = new Chart(chartCanvas, {
      type: "line",
      data: {
        labels: sorted.map((e) => e.date),
        datasets: [{
          label: "Avg Price (USD)",
          data: sorted.map((e) => e.average_price),
          borderColor: "var(--accent-primary, #4a9eff)",
          backgroundColor: "transparent",
          pointRadius: 2,
          tension: 0.3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            ticks: {
              color: typeof getChartTextColor === "function" ? getChartTextColor() : undefined,
              callback: (v) => `$${Number(v).toFixed(2)}`,
            },
          },
        },
      },
    });
  }

  if (typeof openModalById === "function") openModalById("retailViewModal");
};

const closeRetailViewModal = () => {
  if (_retailViewModalChart) {
    _retailViewModalChart.destroy();
    _retailViewModalChart = null;
  }
  if (typeof closeModalById === "function") closeModalById("retailViewModal");
};

if (typeof window !== "undefined") {
  window.openRetailViewModal = openRetailViewModal;
  window.closeRetailViewModal = closeRetailViewModal;
}

// =============================================================================

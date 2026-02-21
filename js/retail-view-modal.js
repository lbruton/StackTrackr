// RETAIL VIEW MODAL
// =============================================================================

let _retailViewModalChart = null;
let _retailViewIntradayChart = null;

/**
 * Switches between the "Price History" and "24h Chart" tabs in the retail view modal.
 * @param {"history"|"intraday"} tab
 */
const _switchRetailViewTab = (tab) => {
  const historySection = safeGetElement("retailViewHistorySection");
  const intradaySection = safeGetElement("retailViewIntradaySection");
  const histTab = safeGetElement("retailViewTabHistory");
  const intTab = safeGetElement("retailViewTabIntraday");
  const isHistory = tab === "history";
  historySection.style.display = isHistory ? "" : "none";
  intradaySection.style.display = isHistory ? "none" : "";
  if (histTab.classList) histTab.classList.toggle("active", isHistory);
  if (intTab.classList) intTab.classList.toggle("active", !isHistory);
};

/**
 * Builds the intraday chart (median + low) from windows_24h data for a slug.
 * @param {string} slug
 */
// Per-vendor chart colors — consistent across all coin modals
const _VENDOR_COLORS = {
  apmex:          "#3b82f6",  // blue
  jmbullion:      "#f59e0b",  // amber
  sdbullion:      "#10b981",  // emerald
  monumentmetals: "#a78bfa",  // violet
  herobullion:    "#f87171",  // red
  bullionexchanges: "#ec4899", // pink
  summitmetals:   "#06b6d4",  // cyan
};

const _buildIntradayChart = (slug) => {
  const canvas = safeGetElement("retailViewIntradayChart");
  const noDataEl = safeGetElement("retailViewIntradayNoData");
  const tableBody = safeGetElement("retailViewIntradayTableBody");
  const tableHead = safeGetElement("retailViewIntradayTableHead");

  const intraday = typeof retailIntradayData !== "undefined" ? retailIntradayData[slug] : null;
  const windows = intraday && Array.isArray(intraday.windows_24h) ? intraday.windows_24h : [];

  if (noDataEl) noDataEl.style.display = windows.length < 2 ? "" : "none";
  if (canvas) canvas.style.display = windows.length >= 2 ? "" : "none";

  if (_retailViewIntradayChart) {
    _retailViewIntradayChart.destroy();
    _retailViewIntradayChart = null;
  }

  // Collect the vendor set across all windows (preserves display order from RETAIL_VENDOR_NAMES)
  const knownVendors = typeof RETAIL_VENDOR_NAMES !== "undefined" ? Object.keys(RETAIL_VENDOR_NAMES) : [];
  const activeVendors = knownVendors.filter((v) => windows.some((w) => w.vendors && w.vendors[v] != null));

  if (windows.length >= 2 && canvas instanceof HTMLCanvasElement && typeof Chart !== "undefined") {
    const labels = windows.map((w) => {
      const d = w.window ? new Date(w.window) : null;
      if (!d || isNaN(d)) return "--:--";
      return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    });

    const datasets = activeVendors.map((vendorId) => {
      const label = (typeof RETAIL_VENDOR_NAMES !== "undefined" && RETAIL_VENDOR_NAMES[vendorId]) || vendorId;
      const color = _VENDOR_COLORS[vendorId] || "#94a3b8";
      return {
        label,
        data: windows.map((w) => (w.vendors && w.vendors[vendorId] != null ? w.vendors[vendorId] : null)),
        borderColor: color,
        backgroundColor: "transparent",
        borderWidth: 1.5,
        pointRadius: 2,
        tension: 0.2,
        spanGaps: true,
      };
    });

    _retailViewIntradayChart = new Chart(canvas, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: "top", labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: $${Number(ctx.raw).toFixed(2)}`,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              maxTicksLimit: 12,
              color: typeof getChartTextColor === "function" ? getChartTextColor() : undefined,
            },
          },
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

  // Update table header with per-vendor columns
  if (tableHead) {
    tableHead.innerHTML = "";
    const headerRow = document.createElement("tr");
    ["Time (local)", ...activeVendors.map((v) =>
      (typeof RETAIL_VENDOR_NAMES !== "undefined" && RETAIL_VENDOR_NAMES[v]) || v
    )].forEach((label) => {
      const th = document.createElement("th");
      th.textContent = label;
      headerRow.appendChild(th);
    });
    tableHead.appendChild(headerRow);
  }

  // Compact recent-windows table (5 most recent, per-vendor columns)
  if (tableBody) {
    tableBody.innerHTML = "";
    const recent = windows.slice(-5).reverse();
    const fmt = (v) => (v != null ? `$${Number(v).toFixed(2)}` : "\u2014");
    recent.forEach((w) => {
      const tr = document.createElement("tr");
      const d = w.window ? new Date(w.window) : null;
      const timeLabel = (d && !isNaN(d))
        ? `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
        : "--:--";
      [timeLabel, ...activeVendors.map((v) => fmt(w.vendors && w.vendors[v]))].forEach((text) => {
        const td = document.createElement("td");
        td.textContent = text;
        tr.appendChild(td);
      });
      tableBody.appendChild(tr);
    });
    const colCount = activeVendors.length + 1;
    if (recent.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = colCount;
      td.className = "settings-subtext";
      td.textContent = "No intraday data available.";
      tr.appendChild(td);
      tableBody.appendChild(tr);
    }
  }
};

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

  // Current prices table — new vendors map shape
  const priceData = retailPrices && retailPrices.prices ? retailPrices.prices[slug] || null : null;
  currentTableBody.innerHTML = "";
  if (priceData) {
    const vendorMap = priceData.vendors || {};
    Object.entries(RETAIL_VENDOR_NAMES).forEach(([key, label]) => {
      const vendorData = vendorMap[key];
      const price = vendorData ? vendorData.price : null;
      const score = vendorData ? vendorData.confidence : null;
      if (price == null) return;
      const tr = document.createElement("tr");

      const tdLabel = document.createElement("td");
      const vendorUrl = (retailProviders && retailProviders[slug] && retailProviders[slug][key])
        || RETAIL_VENDOR_URLS[key];
      if (vendorUrl) {
        const link = document.createElement("a");
        link.href = "#";
        link.textContent = label;
        link.style.cssText = "color:var(--primary);text-decoration:none;";
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const popup = window.open(vendorUrl, `retail_vendor_${key}`, "width=1250,height=800,scrollbars=yes,resizable=yes,toolbar=no,location=no,menubar=no,status=no");
          if (!popup) window.open(vendorUrl, "_blank");
        });
        tdLabel.appendChild(link);
      } else {
        tdLabel.textContent = label;
      }

      const tdPrice = document.createElement("td");
      tdPrice.textContent = `$${Number(price).toFixed(2)}`;

      const tdScore = document.createElement("td");
      tdScore.appendChild(_buildConfidenceBar(score));

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

  // History table — new avg_median/avg_low/vendors.*.avg shape (7 columns)
  const history = getRetailHistoryForSlug(slug);
  historyTableBody.innerHTML = "";
  history.forEach((entry) => {
    const tr = document.createElement("tr");
    const fmt = (v) => (v != null ? `$${Number(v).toFixed(2)}` : "\u2014");
    [
      entry.date,
      fmt(entry.avg_median),
      fmt(entry.avg_low),
      fmt(entry.vendors && entry.vendors.apmex && entry.vendors.apmex.avg),
      fmt(entry.vendors && entry.vendors.monumentmetals && entry.vendors.monumentmetals.avg),
      fmt(entry.vendors && entry.vendors.sdbullion && entry.vendors.sdbullion.avg),
      fmt(entry.vendors && entry.vendors.jmbullion && entry.vendors.jmbullion.avg),
    ].forEach((text) => {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });
    historyTableBody.appendChild(tr);
  });

  // Daily price history chart (avg_median over time)
  const chartWrap = chartCanvas instanceof HTMLCanvasElement
    ? chartCanvas.closest(".retail-view-chart-wrap")
    : null;
  if (_retailViewModalChart) {
    _retailViewModalChart.destroy();
    _retailViewModalChart = null;
  }
  const hasEnoughHistory = history.length > 1;
  if (chartWrap) chartWrap.style.display = hasEnoughHistory ? "" : "none";
  if (hasEnoughHistory && chartCanvas instanceof HTMLCanvasElement && typeof Chart !== "undefined") {
    const sorted = [...history].reverse();
    _retailViewModalChart = new Chart(chartCanvas, {
      type: "line",
      data: {
        labels: sorted.map((e) => e.date),
        datasets: [{
          label: "Avg Median (USD)",
          data: sorted.map((e) => e.avg_median),
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

  // Build intraday chart for 24h tab
  _buildIntradayChart(slug);

  // Default to 24h chart on open (switch to history once dataset is larger)
  _switchRetailViewTab("intraday");

  if (typeof openModalById === "function") openModalById("retailViewModal");
};

const closeRetailViewModal = () => {
  if (_retailViewModalChart) {
    _retailViewModalChart.destroy();
    _retailViewModalChart = null;
  }
  if (_retailViewIntradayChart) {
    _retailViewIntradayChart.destroy();
    _retailViewIntradayChart = null;
  }
  if (typeof closeModalById === "function") closeModalById("retailViewModal");
};

if (typeof window !== "undefined") {
  window.openRetailViewModal = openRetailViewModal;
  window.closeRetailViewModal = closeRetailViewModal;
  window._switchRetailViewTab = _switchRetailViewTab;
}

// =============================================================================

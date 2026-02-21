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

/**
 * Builds the vendor legend: colored swatch + clickable vendor name + current price.
 * Replaces the "Current Prices" table. No-ops if no price data is available.
 * @param {string} slug
 */
const _buildVendorLegend = (slug) => {
  const container = safeGetElement("retailViewVendorLegend");
  while (container.firstChild) container.removeChild(container.firstChild);

  const priceData = typeof retailPrices !== "undefined" && retailPrices && retailPrices.prices
    ? retailPrices.prices[slug]
    : null;
  const vendorMap = priceData ? priceData.vendors || {} : {};
  const knownVendors = typeof RETAIL_VENDOR_NAMES !== "undefined" ? Object.keys(RETAIL_VENDOR_NAMES) : [];
  const hasAny = knownVendors.some((v) => vendorMap[v] && vendorMap[v].price != null);
  if (!hasAny) return;

  knownVendors.forEach((vendorId) => {
    const vendorData = vendorMap[vendorId];
    const price = vendorData ? vendorData.price : null;
    if (price == null) return;

    const color = _VENDOR_COLORS[vendorId] || "#94a3b8";
    const label = (typeof RETAIL_VENDOR_NAMES !== "undefined" && RETAIL_VENDOR_NAMES[vendorId]) || vendorId;
    const vendorUrl = (typeof retailProviders !== "undefined" && retailProviders && retailProviders[slug] && retailProviders[slug][vendorId])
      || (typeof RETAIL_VENDOR_URLS !== "undefined" && RETAIL_VENDOR_URLS[vendorId])
      || null;

    const item = document.createElement(vendorUrl ? "a" : "span");
    item.className = "retail-legend-item";
    if (vendorUrl) {
      item.href = "#";
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const popup = window.open(vendorUrl, `retail_vendor_${vendorId}`, "width=1250,height=800,scrollbars=yes,resizable=yes,toolbar=no,location=no,menubar=no,status=no");
        if (!popup) window.open(vendorUrl, "_blank");
      });
    }

    const swatch = document.createElement("span");
    swatch.className = "retail-legend-swatch";
    swatch.style.background = color;

    const nameEl = document.createElement("span");
    nameEl.className = "retail-legend-name";
    nameEl.textContent = label;
    nameEl.style.color = color;

    const priceEl = document.createElement("span");
    priceEl.className = "retail-legend-price";
    priceEl.textContent = `$${Number(price).toFixed(2)}`;

    item.appendChild(swatch);
    item.appendChild(nameEl);
    item.appendChild(priceEl);
    container.appendChild(item);
  });
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
  // Fall back to median+low when windows predate the per-vendor format
  const useVendorLines = activeVendors.length > 0;

  if (windows.length >= 2 && canvas instanceof HTMLCanvasElement && typeof Chart !== "undefined") {
    const labels = windows.map((w) => {
      const d = w.window ? new Date(w.window) : null;
      if (!d || isNaN(d)) return "--:--";
      return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    });

    const datasets = useVendorLines
      ? activeVendors.map((vendorId) => {
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
        })
      : [
          {
            label: "Median",
            data: windows.map((w) => w.median),
            borderColor: "#3b82f6",
            backgroundColor: "transparent",
            borderWidth: 2,
            pointRadius: 2,
            tension: 0.3,
          },
          {
            label: "Low",
            data: windows.map((w) => w.low),
            borderColor: "#22c55e",
            backgroundColor: "transparent",
            borderWidth: 1.5,
            borderDash: [4, 3],
            pointRadius: 2,
            tension: 0.3,
          },
        ];

    _retailViewIntradayChart = new Chart(canvas, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: !useVendorLines, position: "top", labels: { boxWidth: 12, font: { size: 11 } } },
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

  // Update table header — per-vendor when data available, median+low fallback otherwise
  const tableColumns = useVendorLines
    ? activeVendors.map((v) => (typeof RETAIL_VENDOR_NAMES !== "undefined" && RETAIL_VENDOR_NAMES[v]) || v)
    : ["Median", "Low"];
  if (tableHead) {
    tableHead.innerHTML = "";
    const headerRow = document.createElement("tr");
    ["Time (local)", ...tableColumns].forEach((label) => {
      const th = document.createElement("th");
      th.textContent = label;
      headerRow.appendChild(th);
    });
    tableHead.appendChild(headerRow);
  }

  // Compact recent-windows table (5 most recent)
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
      const rowValues = useVendorLines
        ? activeVendors.map((v) => fmt(w.vendors && w.vendors[v]))
        : [fmt(w.median), fmt(w.low)];
      [timeLabel, ...rowValues].forEach((text) => {
        const td = document.createElement("td");
        td.textContent = text;
        tr.appendChild(td);
      });
      tableBody.appendChild(tr);
    });
    const colCount = tableColumns.length + 1;
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
  const historyTableBody = safeGetElement("retailViewHistoryTableBody");
  const chartCanvas = safeGetElement("retailViewChart");

  titleEl.textContent = meta.name;
  subtitleEl.textContent = `${meta.weight} troy oz \u00b7 ${meta.metal}`;

  // Vendor legend — colored swatch + clickable name + current price
  _buildVendorLegend(slug);

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

  // Daily price history chart — per-vendor lines matching the 24h chart colors
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
    const knownVendors = typeof RETAIL_VENDOR_NAMES !== "undefined" ? Object.keys(RETAIL_VENDOR_NAMES) : [];
    const activeHistVendors = knownVendors.filter((v) =>
      sorted.some((e) => e.vendors && e.vendors[v] && e.vendors[v].avg != null)
    );
    const useVendorHistLines = activeHistVendors.length > 0;

    const histDatasets = useVendorHistLines
      ? activeHistVendors.map((vendorId) => ({
          label: (typeof RETAIL_VENDOR_NAMES !== "undefined" && RETAIL_VENDOR_NAMES[vendorId]) || vendorId,
          data: sorted.map((e) => (e.vendors && e.vendors[vendorId] ? e.vendors[vendorId].avg : null)),
          borderColor: _VENDOR_COLORS[vendorId] || "#94a3b8",
          backgroundColor: "transparent",
          borderWidth: 1.5,
          pointRadius: 2,
          tension: 0.3,
          spanGaps: true,
        }))
      : [{
          label: "Avg Median",
          data: sorted.map((e) => e.avg_median),
          borderColor: "var(--accent-primary, #4a9eff)",
          backgroundColor: "transparent",
          pointRadius: 2,
          tension: 0.3,
        }];

    _retailViewModalChart = new Chart(chartCanvas, {
      type: "line",
      data: { labels: sorted.map((e) => e.date), datasets: histDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: !useVendorHistLines } },
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

  // Build intraday chart for 24h tab using cached data
  _buildIntradayChart(slug);

  // Default to 24h chart on open (switch to history once dataset is larger)
  _switchRetailViewTab("intraday");

  if (typeof openModalById === "function") openModalById("retailViewModal");

  // Async refresh: fetch fresh data for this coin so the modal always shows
  // current vendor-level intraday data regardless of localStorage staleness.
  const _apiBase = typeof RETAIL_API_BASE_URL !== "undefined" ? RETAIL_API_BASE_URL : null;
  if (_apiBase) {
    Promise.all([
      fetch(`${_apiBase}/${slug}/latest.json`).catch(() => null),
      fetch(`${_apiBase}/${slug}/history-30d.json`).catch(() => null),
    ]).then(async ([latestResp, histResp]) => {
      let intradayUpdated = false;
      if (latestResp && latestResp.ok) {
        const latest = await latestResp.json().catch(() => null);
        if (latest) {
          if (typeof retailIntradayData !== "undefined") {
            retailIntradayData[slug] = {
              window_start: latest.window_start,
              windows_24h: Array.isArray(latest.windows_24h) ? latest.windows_24h : [],
            };
            if (typeof saveRetailIntradayData === "function") saveRetailIntradayData();
            intradayUpdated = true;
          }
          if (latest.vendors && typeof retailPrices !== "undefined" && retailPrices && retailPrices.prices) {
            retailPrices.prices[slug] = {
              median_price: latest.median_price,
              lowest_price: latest.lowest_price,
              vendors: latest.vendors,
            };
            if (typeof saveRetailPrices === "function") saveRetailPrices();
          }
        }
      }
      if (histResp && histResp.ok) {
        const hist = await histResp.json().catch(() => null);
        if (Array.isArray(hist) && typeof retailPriceHistory !== "undefined") {
          retailPriceHistory[slug] = hist;
          if (typeof saveRetailPriceHistory === "function") saveRetailPriceHistory();
        }
      }
      // Rebuild intraday chart and vendor legend with fresh data
      if (intradayUpdated) _buildIntradayChart(slug);
      _buildVendorLegend(slug);
    }).catch((err) => {
      debugLog(`[retail-view-modal] Background refresh failed: ${err.message}`, "warn");
    });
  }
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

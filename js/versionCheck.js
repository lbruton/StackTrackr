/**
 * Version change detection and changelog display
 */

/**
 * Compares stored version with current and shows changelog modal if needed
 */
const checkVersionChange = () => {
  const hasData = !!localStorage.getItem(LS_KEY);
  if (!hasData) {
    if (typeof showAckModal === "function") {
      showAckModal();
    }
    return;
  }

  const acknowledged = localStorage.getItem(VERSION_ACK_KEY);
  const current = localStorage.getItem(APP_VERSION_KEY) || APP_VERSION;
  if (acknowledged === current) return;

  fetch("./CHANGELOG.md")
    .then((resp) => {
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }
      return resp.text();
    })
    .then((md) => {
      const changes = getChangelogForVersion(md, current);
      populateVersionModal(current, changes);
    })
    .catch((err) => {
      console.error("Error loading changelog:", err);
      // Fallback to embedded changelog for current version
      const fallbackChanges = getEmbeddedChangelog(current);
      populateVersionModal(current, fallbackChanges);
    });
};

/**
 * Extracts changelog section for a specific version
 * @param {string} text - Full changelog markdown
 * @param {string} version - Version string to extract
 * @returns {string} HTML string of changelog items
 */
const getChangelogForVersion = (text, version) => {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Match Keep a Changelog format: ## [X.XX.XX] - YYYY-MM-DD
  const regex = new RegExp(
    `## \\[${escaped}\\][^\\n]*\\n([\\s\\S]*?)(?=\\n## \\[|$)`,
  );
  const match = text.match(regex);
  if (!match) {
    return "<li>No changelog entry found.</li>";
  }
  return match[1]
    .trim()
    .split("\n")
    .filter((line) => line.trim().startsWith("-"))
    .map((line) => {
      const clean = line.replace(/^\s*-\s*/, "");
      return `<li>${sanitizeHtml(clean).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</li>`;
    })
    .join("");
};

/**
 * Populates and shows the version modal
 * @param {string} version - Current application version
 * @param {string} html - HTML content of changelog
 */
const populateVersionModal = (version, html) => {
  const modal = document.getElementById("versionModal");
  const body = document.getElementById("versionChanges");
  const ver = document.getElementById("versionModalVersion");
  if (ver) ver.textContent = `v${version}`;
  if (body) body.innerHTML = html;
  if (!modal) return;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
  setupVersionModalEvents(version);
  if (typeof loadAnnouncements === "function") {
    loadAnnouncements();
  }
};

/**
 * Provides embedded changelog data as fallback when file fetch fails
 * @param {string} version - Version to get changelog for
 * @returns {string} HTML string of changelog items
 */
const getEmbeddedChangelog = (version) => {
  const changelogs = {
    "3.08.00": `
      <li><strong>Sparkline trend charts</strong>: Background Chart.js line charts on all 4 spot price cards showing price history with gradient fill</li>
      <li><strong>Trend range dropdown</strong>: Per-card 7d/30d/60d/90d selector with persistent preference</li>
      <li><strong>Sync icon</strong>: Compact refresh icon replaces old Sync/Add/History button panel, spins during fetch</li>
      <li><strong>Shift+click manual price</strong>: Hold Shift and click the spot price to edit inline — Enter saves, Escape cancels</li>
      <li><strong>History dedup fix</strong>: Repeated syncs with 30-day backfill no longer create duplicate spotHistory entries</li>
    `,
    "3.07.02": `
      <li><strong>Shift+click inline editing</strong>: Hold Shift and click any editable cell (Name, Qty, Weight, Purchase Price, Retail Price, Location) to edit in place. Enter saves, Escape cancels, click away cancels</li>
      <li><strong>Removed pencil icon</strong>: Name column no longer shows the edit icon — shift+click replaces it for all 6 editable columns</li>
      <li><strong>Removed save/cancel icons</strong>: Inline edit fields use Enter/Escape only — no more buttons competing for space in narrow cells</li>
      <li><strong>Hidden number spinners</strong>: Qty, Weight, and price fields no longer show browser-native up/down arrows</li>
    `,
    "3.07.01": `
      <li><strong>Light theme: clean backgrounds</strong>: Cool gray page background with white cards — visible elevation and row striping</li>
      <li><strong>Table cleanup</strong>: Removed sticky columns, filter-based hover, and cell-level transitions</li>
      <li><strong>Metal/type text contrast</strong>: Darkened color tokens so they pass WCAG AA in light and sepia themes</li>
      <li><strong>Sepia theme fixes</strong>: Removed global sepia filter, fixed text contrast to pass WCAG AA, warm info color, visible borders</li>
    `,
    "3.07.00": `
      <li><strong>Confidence styling</strong>: Retail and Gain/Loss columns show italic/muted for estimated vs bold for confirmed values</li>
      <li><strong>All Metals summary card</strong>: Combined totals with Avg Cost/oz and clickable breakdown modal</li>
      <li><strong>Metal detail modal overhaul</strong>: Full portfolio breakdown per type and location in a 2x2 grid</li>
    `
  };
  
  return changelogs[version] || "<li>Changelog information not available for this version.</li>";
};

/**
 * Sets up modal event handlers for version acknowledgment
 * @param {string} version - Current application version
 */
const setupVersionModalEvents = (version) => {
  const modal = document.getElementById("versionModal");
  const acceptBtn = document.getElementById("versionAcceptBtn");
  const closeBtn = document.getElementById("versionCloseBtn");

  const accept = () => {
    localStorage.setItem(VERSION_ACK_KEY, version);
    if (modal) modal.style.display = "none";
    document.body.style.overflow = "";
  };

  if (acceptBtn) {
    acceptBtn.addEventListener("click", accept);
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", accept);
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        accept();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && modal.style.display === "block") {
      accept();
    }
  });
};

document.addEventListener("DOMContentLoaded", checkVersionChange);


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

  fetch("./docs/changelog.md")
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
  const regex = new RegExp(
    `### Version ${escaped}[^\\n]*\\n([\\s\\S]*?)(?=\\n### Version|$)`,
  );
  const match = text.match(regex);
  if (!match) {
    return "<li>No changelog entry found.</li>";
  }
  return match[1]
    .trim()
    .split("\n")
    .filter((line) => line.trim().startsWith("-"))
    .map((line) => `<li>${sanitizeHtml(line.replace(/^\-\s*/, ""))}</li>`)
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
    "3.04.86": `
      <li><strong>Centered Name header</strong>: Wrapped "Name" header text with .header-text span for consistent alignment</li>
      <li><strong>Cleanup</strong>: Removed obsolete #inventoryTable th[data-column="name"] centering rule</li>
      <li><strong>Files Updated</strong>: index.html, css/styles.css, docs/changelog.md</li>
    `,
    "3.04.82": `
      <li><strong>Logo height via CSS</strong>: Removed invalid height attribute from Stackr logo SVG</li>
      <li><strong>Improved Styling</strong>: Now relying on CSS for proper logo sizing</li>
      <li><strong>Files Updated</strong>: index.html, docs/changelog.md</li>
    `,
    "3.04.81": `
      <li><strong>Composition helper cleanup</strong>: Removed obsolete composition helper comment</li>
      <li><strong>Documentation sync</strong>: Synchronized documentation across files</li>
      <li><strong>Files Updated</strong>: js/utils.js, README.md, docs/changelog.md</li>
    `,
    "3.04.76": `
      <li><strong>Inventory Insight</strong>: Added dynamic item counter below the inventory table displaying the number of visible items</li>
      <li><strong>Styling</strong>: Muted text, right-aligned using .table-item-count for a subtle appearance</li>
      <li><strong>Files Updated</strong>: index.html, css/styles.css, js/state.js, js/inventory.js</li>
    `,
    "3.04.74": `
      <li><strong>Import Reliability</strong>: Fixed undefined notes reference and removed unnecessary file input reset in importCsv</li>
      <li><strong>Export Cleanup</strong>: Released object URLs after CSV download to free resources</li>
      <li><strong>Global Access</strong>: Restored global exports for import/export functions and summary utilities</li>
      <li><strong>Files Updated</strong>: js/inventory.js, js/constants.js</li>
    `,
    "3.04.73": `
      <li><strong>Hotfix</strong>: Resolved "Unable to load changelog" error in version modal and about dialog</li>
      <li><strong>Enhanced Error Handling</strong>: Added embedded fallback data for changelog and announcements when file:// protocol blocks fetch requests</li>
      <li><strong>Improved Reliability</strong>: Version change notifications now work consistently regardless of file access restrictions</li>
      <li><strong>Better User Experience</strong>: About modal and version dialogs display proper content even when offline or in restricted environments</li>
    `,
    "3.04.72": `
      <li><strong>Major Fix</strong>: Resolved dual chip system conflicts causing duplicate filter displays</li>
      <li><strong>System Consolidation</strong>: Eliminated competing chip rendering systems (updateTypeSummary vs renderActiveFilters)</li>
      <li><strong>Enhanced Click Functionality</strong>: Category chips (with counts) now click to ADD filters, active filter chips click to REMOVE filters</li>
      <li><strong>Search Precision</strong>: Enhanced word boundary matching - "Silver Eagle" no longer matches "American Gold Eagle"</li>
      <li><strong>Data-Driven Display</strong>: Only show filter chips for items that actually exist in filtered inventory</li>
      <li><strong>Clean Formatting</strong>: Chips display content without "Title:" prefixes</li>
      <li><strong>Context-Aware Tooltips</strong>: Clear indication of what clicking each chip will do</li>
    `,
    "3.04.71": `
      <li><strong>Critical Fix</strong>: Resolved search precision issue where queries like "Silver Eagle" incorrectly matched "Gold Eagle" items</li>
      <li><strong>Search Enhancement</strong>: Modified search logic to use AND logic for words within search terms (previously used OR logic)</li>
      <li><strong>Multi-word searches</strong>: Now require ALL words to match somewhere in the item</li>
      <li><strong>Example</strong>: "Silver Eagle" now only matches items containing both "silver" AND "eagle"</li>
    `,
    "3.04.70": `
      <li><strong>Grouped filter chips</strong>: Added grouped name chips feature with toggle</li>
      <li><strong>Consolidation</strong>: Items like "American Silver Eagle (3)" instead of separate year variants</li>
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


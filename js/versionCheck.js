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
    "3.07.00": `
      <li><strong>Confidence styling</strong>: Retail and Gain/Loss columns now show italic/muted for estimated values (melt fallback) vs bold for confirmed (manual retail)</li>
      <li><strong>All Metals summary card</strong>: New combined totals card with portfolio-wide metrics and Avg Cost/oz per metal</li>
      <li><strong>Gain/Loss bottom line</strong>: Each summary card emphasizes Gain/Loss with a separator and larger font</li>
    `,
    "3.06.02": `
      <li><strong>eBay search split</strong>: Purchase column now searches active listings (what's for sale), Retail column searches sold listings (what items actually sold for)</li>
    `,
    "3.06.01": `
      <li><strong>Dead CSS cleanup</strong>: Removed 125+ lines of orphaned collectable-* selectors from the legacy feature removal</li>
      <li><strong>eBay search icon</strong>: Replaced oversized emoji-in-red-circle with a clean 12px SVG magnifying glass that themes automatically</li>
      <li><strong>About modal overhaul</strong>: New description with live site, GitHub, Community, and MIT License links. Removed duplicated privacy notice from version modal</li>
    `,
    "3.06.00": `
      <li><strong>Rebrand to StakTrakr</strong>: Updated canonical brand from "StackTrackr" to "StakTrakr" — logo, titles, exports, Docker, documentation</li>
      <li><strong>Multi-domain auto-branding</strong>: staktrakr.com, stackrtrackr.com, and stackertrackr.com each show their own brand name automatically</li>
      <li><strong>localStorage key migration</strong>: Renamed stackrtrackr.* keys to staktrakr.* with backwards-compatible debug flag</li>
    `,
    "3.05.04": `
      <li><strong>Fraction weight input</strong>: Weight field now accepts fractions like 1/1000 or 1 1/2 — auto-converts to decimal</li>
      <li><strong>Duplicate item button</strong>: Copy icon in action column opens add modal pre-filled from source item (date = today, qty = 1)</li>
    `,
    "3.05.03": `
      <li><strong>Date display fix</strong>: Table dates no longer show one day earlier than entered — fixed UTC midnight timezone bug</li>
      <li><strong>Numista API key storage</strong>: Key now persists across sessions — removed broken encryption, simplified to base64 encoding</li>
      <li><strong>Storage whitelist fix</strong>: Added catalog_api_config to allowed keys so Numista config survives page reload</li>
      <li><strong>Numista settings UI</strong>: Removed password field, added API signup link with free tier info</li>
    `,
    "3.05.01": `
      <li><strong>What's New modal fix</strong>: Changelog and roadmap now populate correctly from CHANGELOG.md and docs/announcements.md</li>
      <li><strong>GitHub URLs updated</strong>: All repository links now point to the correct repository</li>
      <li><strong>Changelog parser</strong>: Updated to read Keep a Changelog format instead of legacy format</li>
    `,
    "3.05.00": `
      <li><strong>Unified Add/Edit Modal</strong>: Merged two separate modals into a single modal that switches between add and edit mode</li>
      <li><strong>Weight unit fix</strong>: Edit mode now uses the real weight unit selector instead of a hidden attribute</li>
      <li><strong>Price preservation</strong>: Empty price field in edit mode preserves existing price instead of zeroing it out</li>
      <li><strong>Weight precision</strong>: Sub-gram weights (e.g., Goldbacks) no longer rounded to zero</li>
      <li><strong>Qty-adjusted financials</strong>: Retail, Gain/Loss, and totals now correctly multiply by quantity</li>
      <li><strong>Spot price indicators</strong>: Direction arrows now persist across page refreshes</li>
    `,
    "3.04.88": `
      <li><strong>Table Polish (Increment 2)</strong>: Removed Numista column from table (15 to 14 columns) - N# data preserved in modals, exports, and data model</li>
      <li><strong>Header Font Fix</strong>: Price column headers now use system font instead of monospace - data cells remain monospace for alignment</li>
      <li><strong>Action Column CSS</strong>: Consolidated three conflicting CSS rulesets for Notes/Edit/Delete into one authoritative set with proper sticky offsets</li>
      <li><strong>Roadmap</strong>: Added ROADMAP.md documenting project direction and planned work</li>
      <li><strong>Files Updated</strong>: index.html, js/inventory.js, js/sorting.js, css/styles.css, js/constants.js, ROADMAP.md</li>
    `,
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


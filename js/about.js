// ABOUT & DISCLAIMER MODAL - Enhanced
// =============================================================================

/**
 * Shows the About modal and populates it with current data
 */
const showAboutModal = () => {
  if (elements.aboutModal) {
    populateAboutModal();
    if (window.openModalById) openModalById('aboutModal');
    else {
      elements.aboutModal.style.display = "flex";
      document.body.style.overflow = "hidden";
    }
  }
};

/**
 * Hides the About modal
 */
const hideAboutModal = () => {
  if (elements.aboutModal) {
    if (window.closeModalById) closeModalById('aboutModal');
    else {
      elements.aboutModal.style.display = "none";
      document.body.style.overflow = "";
    }
  }
};

/**
 * Shows the acknowledgment modal on load
 */
const showAckModal = () => {
  const ackModal = document.getElementById("ackModal");
  if (ackModal && !localStorage.getItem(ACK_DISMISSED_KEY)) {
    populateAckModal();
    if (window.openModalById) openModalById('ackModal');
    else {
      ackModal.style.display = "flex";
      document.body.style.overflow = "hidden";
    }
  }
};

/**
 * Hides the acknowledgment modal
 */
const hideAckModal = () => {
  const ackModal = document.getElementById("ackModal");
  if (ackModal) {
    if (window.closeModalById) closeModalById('ackModal');
    else {
      ackModal.style.display = "none";
      document.body.style.overflow = "";
    }
  }
};

/**
 * Accepts the acknowledgment and hides the modal
 */
const acceptAck = () => {
  localStorage.setItem(ACK_DISMISSED_KEY, "1");
  hideAckModal();
};

/**
 * Populates the about modal with current version and changelog information
 */
const populateAboutModal = () => {
  // Update version displays
  const aboutVersion = document.getElementById("aboutVersion");
  const aboutCurrentVersion = document.getElementById("aboutCurrentVersion");
  const aboutAppName = document.getElementById("aboutAppName");

  if (aboutVersion && typeof APP_VERSION !== "undefined") {
    aboutVersion.textContent = `v${APP_VERSION}`;
  }

  if (aboutCurrentVersion && typeof APP_VERSION !== "undefined") {
    aboutCurrentVersion.textContent = `v${APP_VERSION}`;
  }

  if (aboutAppName) {
    aboutAppName.textContent = getBrandingName();
  }

  // Load announcements for latest changes and roadmap
  loadAnnouncements();
};

/**
 * Populates the acknowledgment modal with version information
 */
const populateAckModal = () => {
  const ackVersion = document.getElementById("ackVersion");
  const ackAppName = document.getElementById("ackAppName");
  if (ackVersion && typeof APP_VERSION !== "undefined") {
    ackVersion.textContent = `v${APP_VERSION}`;
  }
  if (ackAppName) {
    ackAppName.textContent = getBrandingName();
  }
};

/**
 * Loads announcements and populates changelog and roadmap sections
 */
const loadAnnouncements = async () => {
  const latestList = document.getElementById("aboutChangelogLatest");
  const roadmapTargets = [
    document.getElementById("aboutRoadmapList"),
    document.getElementById("versionRoadmapList"),
  ].filter(Boolean);

  if (!latestList && !roadmapTargets.length) return;

  try {
    const res = await fetch("docs/announcements.md");
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const text = await res.text();

    const section = (name) => {
      const regex = new RegExp(`##\\s+${name}\\n([\\s\\S]*?)(?=##|$)`, "i");
      const match = text.match(regex);
      return match ? match[1] : "";
    };

    const parseList = (content) =>
      content
        .split("\n")
        .filter((l) => l.trim().startsWith("-"))
        .map((l) => sanitizeHtml(l.replace(/^[-*]\s*/, ""))
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"));

    const whatsNewItems = parseList(section("What's New"));
    if (latestList) {
      latestList.innerHTML =
        whatsNewItems.length > 0
          ? whatsNewItems
              .slice(0, 5)
              .map((i) => `<li>${i}</li>`)
              .join("")
          : "<li>No recent announcements</li>";
    }

    const roadmapItems = parseList(section("Development Roadmap"));
    if (roadmapTargets.length) {
      const html =
        roadmapItems.length > 0
          ? roadmapItems
              .slice(0, 3)
              .map((i) => `<li>${i}</li>`)
              .join("")
          : "<li>Roadmap information unavailable</li>";
      roadmapTargets.forEach((el) => (el.innerHTML = html));
    }
  } catch (e) {
    console.warn("Could not load announcements, using embedded data:", e);
    
    // Fallback to embedded announcements data
    const embeddedWhatsNew = getEmbeddedWhatsNew();
    const embeddedRoadmap = getEmbeddedRoadmap();
    
    if (latestList) {
      latestList.innerHTML = embeddedWhatsNew;
    }
    roadmapTargets.forEach((el) => (el.innerHTML = embeddedRoadmap));
  }
};

/**
 * Shows full changelog in a new window or navigates to documentation
 */
const showFullChangelog = () => {
  // Try to open changelog documentation
  window.open(
    "https://github.com/lbruton/StackTrackr/blob/main/CHANGELOG.md",
    "_blank",
    "noopener,noreferrer",
  );
};

/**
 * Sets up event listeners for about modal elements
 */
const setupAboutModalEvents = () => {
  const aboutCloseBtn = document.getElementById("aboutCloseBtn");
  const aboutShowChangelogBtn = document.getElementById(
    "aboutShowChangelogBtn",
  );
  const versionShowChangelogBtn = document.getElementById(
    "versionShowChangelogBtn",
  );
  const aboutModal = document.getElementById("aboutModal");

  // Close button
  if (aboutCloseBtn) {
    aboutCloseBtn.addEventListener("click", hideAboutModal);
  }

  // Show changelog button
  if (aboutShowChangelogBtn) {
    aboutShowChangelogBtn.addEventListener("click", showFullChangelog);
  }

  if (versionShowChangelogBtn) {
    versionShowChangelogBtn.addEventListener("click", showFullChangelog);
  }

  // Click outside to close
  if (aboutModal) {
    aboutModal.addEventListener("click", (e) => {
      if (e.target === aboutModal) {
        hideAboutModal();
      }
    });
  }

  // Escape key to close
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      aboutModal &&
      aboutModal.style.display === "flex"
    ) {
      hideAboutModal();
    }
  });
};

/**
 * Sets up event listeners for acknowledgment modal elements
 */
const setupAckModalEvents = () => {
  const ackCloseBtn = document.getElementById("ackCloseBtn");
  const ackAcceptBtn = document.getElementById("ackAcceptBtn");
  const ackModal = document.getElementById("ackModal");

  if (ackCloseBtn) {
    ackCloseBtn.addEventListener("click", hideAckModal);
  }

  if (ackAcceptBtn) {
    ackAcceptBtn.addEventListener("click", acceptAck);
  }

  if (ackModal) {
    ackModal.addEventListener("click", (e) => {
      if (e.target === ackModal) {
        hideAckModal();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && ackModal && ackModal.style.display === "flex") {
      hideAckModal();
    }
  });
};

/**
 * Provides embedded "What's New" data as fallback when file fetch fails
 * @returns {string} HTML string of recent announcements
 */
const getEmbeddedWhatsNew = () => {
  return `
    <li><strong>v3.16.01 – API settings fixes & Numista usage</strong>: Cache timeout persists per-provider, historical data fetches for all providers, page refresh syncs all configured APIs. Standalone "Save" button per provider. Numista usage progress bar with monthly auto-reset</li>
    <li><strong>v3.16.00 – Custom chip grouping & blacklist</strong>: Define custom chip labels with name patterns, right-click chips to blacklist, auto-extract dynamic chips from parentheses/quotes in names</li>
    <li><strong>v3.14.01 – Name column & action icon fix</strong>: Long names truncate properly, N# chips compacted, action icons no longer clipped</li>
    <li><strong>v3.14.00 – Encrypted portable backup</strong>: Export all data as a password-protected .stvault file (AES-256-GCM). Import on any device to restore inventory, settings, API keys, and price history</li>
    <li><strong>v3.12.02 – NGC cert lookup fix</strong>: Cert tag click now opens NGC with actual coin details visible</li>
    <li><strong>v3.12.02 – Numista Sets</strong>: New "Set" type for mint/proof sets with S-prefix Numista IDs</li>
    <li><strong>v3.12.02 – Source column cleanup</strong>: URL sources display domain name only with link icon</li>
    <li><strong>v3.12.01 – Sticky header fix</strong>: Column headers now correctly pin at the top of the scrollable portal view during vertical scroll</li>
    <li><strong>v3.12.00 – Portal view</strong>: Inventory table now renders all items in a scrollable container with sticky column headers — pagination removed. Visible rows (10/15/25/50/100) control viewport height</li>
    <li><strong>v3.11.00 – Unified Settings modal</strong>: API, Files, and Appearance consolidated into a single Settings modal with sidebar navigation. Header simplified to About + Settings</li>
    <li><strong>v3.11.00 – Theme picker</strong>: 3-button theme selector replaces cycling toggle</li>
    <li><strong>v3.11.00 – Tabbed API providers</strong>: Provider config uses tabbed panels instead of scrollable list</li>
    <li><strong>v3.11.00 – Items per page persisted</strong>: Setting now survives page reloads</li>
    <li><strong>v3.10.01 – Numista iframe fix</strong>: Numista pages now open in a popup window — fixes "Can't Open This Page" error on hosted sites</li>
    <li><strong>v3.10.01 – Sort fix</strong>: Gain/Loss and Source columns now sort and resize correctly</li>
    <li><strong>v3.10.00 – Serial # field</strong>: New optional Serial Number input for bars and notes. Included in all export/import formats</li>
    <li><strong>v3.10.00 – Numista Aurum fix</strong>: Goldback / Aurum items now return results from Numista search</li>
    <li><strong>v3.10.00 – Enhanced no-results</strong>: Numista search shows retry box + popular bullion quick-picks when no results found</li>
    <li><strong>v3.10.00 – Source column + filter chips</strong>: "Location" renamed to "Source"; Year, Grade, and N# filter chips added</li>
    <li><strong>v3.09.05 – Grade, Authority & Cert #</strong>: New optional grading fields — Grade dropdown (AG through PF-70), Grading Authority (PCGS/NGC/ANACS/ICG), and Cert # input. Color-coded grade tags on table with one-click cert verification</li>
    <li><strong>v3.09.05 – eBay search fix</strong>: Item names with quotes or parentheses no longer produce broken eBay search results</li>
    <li><strong>v3.09.04 – Year field + inline tag</strong>: New optional Year field in form with inline year badge on table Name cell. Numista picker fills Year instead of Metal</li>
    <li><strong>v3.09.04 – Form restructure</strong>: Name wider with Year beside it; purchase fields grouped: Date | Price, Location | Retail Price</li>
    <li><strong>v3.09.03 – Numista field picker fix</strong>: Replaced broken fieldset+flexbox with CSS Grid — checkboxes, labels, and inputs now align correctly across all browsers</li>
    <li><strong>v3.09.03 – Smart category search</strong>: Numista search maps Type to API categories and prepends Metal to queries for more relevant results</li>
    <li><strong>v3.09.02 – Numista API v3 fix</strong>: Corrected base URL, endpoints, auth headers, query parameters, response parsing, and field mapping — 7 bugs total. Test Connection button now works</li>
    <li><strong>v3.09.02 – localStorage whitelist fix</strong>: Catalog cache and settings no longer deleted on page load</li>
    <li><strong>v3.09.01 – Name chips</strong>: Filter chip bar groups item name variants into single chips (e.g., "Silver Eagle 6/164"). Click to filter, click again to toggle off. Respects minCount threshold and Smart Grouping toggle</li>
    <li><strong>v3.09.01 – Silver contrast fix</strong>: Silver metal chip text no longer invisible on dark/sepia themes at page load</li>
    <li><strong>v3.09.01 – Duplicate chip fix</strong>: Clicking a location chip no longer produces two chips</li>
  `;
};

/**
 * Provides embedded roadmap data as fallback when file fetch fails
 * @returns {string} HTML string of development roadmap
 */
const getEmbeddedRoadmap = () => {
  return `
    <li><strong>Batch rename / normalize</strong>: Bulk rename items using Numista catalog data and the name normalizer</li>
  `;
};

// Expose globally for access from other modules
if (typeof window !== "undefined") {
  window.showAboutModal = showAboutModal;
  window.hideAboutModal = hideAboutModal;
  window.showAckModal = showAckModal;
  window.hideAckModal = hideAckModal;
  window.acceptAck = acceptAck;
  window.loadAnnouncements = loadAnnouncements;
  window.setupAboutModalEvents = setupAboutModalEvents;
  window.setupAckModalEvents = setupAckModalEvents;
  window.populateAboutModal = populateAboutModal;
  window.populateAckModal = populateAckModal;
  window.getEmbeddedWhatsNew = getEmbeddedWhatsNew;
  window.getEmbeddedRoadmap = getEmbeddedRoadmap;
}

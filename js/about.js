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
    <li><strong>v3.05.03 – Date display fix</strong>: Table dates no longer show one day earlier than entered — fixed UTC midnight timezone bug.</li>
    <li><strong>v3.05.03 – Numista API key fix</strong>: Key now saves and persists across sessions — removed broken encryption, simplified to base64 encoding.</li>
    <li><strong>v3.05.00 – Unified Add/Edit Modal</strong>: Merged two separate modals into one, fixing weight unit selector, price preservation, and sub-gram weight precision.</li>
    <li><strong>v3.05.00 – Qty-adjusted financials</strong>: Retail, Gain/Loss, and summary totals now correctly multiply by quantity for multi-qty items.</li>
    <li><strong>v3.05.00 – Spot price indicators</strong>: Direction arrows (green/red) now persist across page refreshes instead of resetting.</li>
    <li><strong>v3.05.00 – $0 price support</strong>: Free/promo items now display $0.00 and correctly compute gain from melt value.</li>
  `;
};

/**
 * Provides embedded roadmap data as fallback when file fetch fails
 * @returns {string} HTML string of development roadmap
 */
const getEmbeddedRoadmap = () => {
  return `
    <li><strong>About modal overhaul</strong>: Update repository URLs, review version/changelog display</li>
    <li><strong>Filter chips rebuild</strong>: Top-N per category model, normalized name chips, chip settings modal</li>
    <li><strong>Notes column removal + N# restore</strong>: Remove Notes icon column, re-add Numista catalog column with filter-on-click</li>
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

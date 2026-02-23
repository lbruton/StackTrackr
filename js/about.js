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
  const whatsNewTargets = [
    document.getElementById("aboutChangelogLatest"),
    document.getElementById("versionChanges"),
  ].filter(Boolean);
  const roadmapTargets = [
    document.getElementById("aboutRoadmapList"),
    document.getElementById("versionRoadmapList"),
  ].filter(Boolean);

  if (!whatsNewTargets.length && !roadmapTargets.length) return;

  try {
    const res = await fetch("docs/announcements.md");
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const text = await res.text();

    const section = (name) => {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`##\\s+${escaped}\\n([\\s\\S]*?)(?=##|$)`, "i");
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
    if (whatsNewTargets.length) {
      // Filter to current version branch (e.g., 3.31.x) before slicing
      const versionBranch = typeof APP_VERSION !== 'undefined'
        ? APP_VERSION.split('.').slice(0, 2).join('.')
        : null;
      const filteredWhatsNew = versionBranch
        ? whatsNewItems.filter(i => i.includes(`v${versionBranch}.`) || i.includes(`(v${versionBranch}`))
        : whatsNewItems;
      const displayItems = filteredWhatsNew.length > 0 ? filteredWhatsNew : whatsNewItems;

      const html =
        displayItems.length > 0
          ? displayItems
              .slice(0, 5)
              .map((i) => `<li>${i}</li>`)
              .join("")
          : "<li>No recent announcements</li>";
      // nosemgrep: javascript.browser.security.insecure-innerhtml.insecure-innerhtml, javascript.browser.security.insecure-document-method.insecure-document-method
      whatsNewTargets.forEach((el) => (el.innerHTML = html));
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
      // nosemgrep: javascript.browser.security.insecure-innerhtml.insecure-innerhtml, javascript.browser.security.insecure-document-method.insecure-document-method
      roadmapTargets.forEach((el) => (el.innerHTML = html));
    }
  } catch (e) {
    console.warn("Could not load announcements, using embedded data:", e);
    
    // Fallback to embedded announcements data
    const embeddedWhatsNew = getEmbeddedWhatsNew();
    const embeddedRoadmap = getEmbeddedRoadmap();
    
    // nosemgrep: javascript.browser.security.insecure-innerhtml.insecure-innerhtml, javascript.browser.security.insecure-document-method.insecure-document-method
    whatsNewTargets.forEach((el) => (el.innerHTML = embeddedWhatsNew));
    // nosemgrep: javascript.browser.security.insecure-innerhtml.insecure-innerhtml, javascript.browser.security.insecure-document-method.insecure-document-method
    roadmapTargets.forEach((el) => (el.innerHTML = embeddedRoadmap));
  }
};

/**
 * Shows full changelog in a new window or navigates to documentation
 */
const showFullChangelog = () => {
  // Try to open changelog documentation
  window.open(
    "https://github.com/lbruton/StakTrakr/blob/main/CHANGELOG.md",
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
    <li><strong>v3.32.22 &ndash; Sync UI Dark-Theme CSS Fix</strong>: Header sync popover, mode selector, and backup warning now render correctly across all themes &mdash; corrected misnamed CSS variables and replaced hardcoded light-color fallbacks.</li>
    <li><strong>v3.32.21 &ndash; Sync UX Overhaul + Simple Mode</strong>: No more on-load password popups &mdash; choose Simple mode (Dropbox account as key, no extra password on any device) or Secure mode (vault password, zero-knowledge). Orange dot + toast replaces auto-opening modals; inline popover handles Secure-mode unlock from the header button.</li>
    <li><strong>v3.32.20 &ndash; api2 Backup Endpoint</strong>: Dual-endpoint fallback for all API feeds &mdash; spot, market, and goldback. Primary (api.staktrakr.com) tried first with 5-second timeout; api2.staktrakr.com serves as automatic fallback. Health modal shows per-endpoint drift benchmarking.</li>
    <li><strong>v3.32.19 &ndash; 15-Min Spot Price Endpoint</strong>: New sub-hourly price snapshots at data/15min/YYYY/MM/DD/HHMM.json &mdash; written every 15 min by the spot poller. Frontend fetchStaktrakr15minRange() loads 24h of 15-min data tagged api-15min.</li>
    <li><strong>v3.32.18 &ndash; Cloud Sync Status Icon</strong>: Ambient header icon replaces the on-load password modal. Orange = needs password (tap to unlock), green = active, gray = not configured.</li>
  `;
};

/**
 * Provides embedded roadmap data as fallback when file fetch fails
 * @returns {string} HTML string of development roadmap
 */
const getEmbeddedRoadmap = () => {
  return `
    <li><strong>Cloud Backup Conflict Detection (STAK-150)</strong>: Smarter conflict resolution using item count direction, not just timestamps</li>
    <li><strong>Accessible Table Mode (STAK-144)</strong>: Style D with horizontal scroll, long-press to edit, 300% zoom support</li>
    <li><strong>Custom Theme Editor (STAK-121)</strong>: User-defined color themes with CSS variable overrides</li>
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

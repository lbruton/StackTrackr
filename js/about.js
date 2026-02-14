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
      const html =
        whatsNewItems.length > 0
          ? whatsNewItems
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
    <li><strong>v3.26.01 &ndash; Fuzzy Autocomplete Settings Toggle</strong>: Added On/Off toggle for fuzzy autocomplete in Settings &gt; Filter Chips. Fixed autocomplete feature flag not discoverable when persisted as disabled</li>
    <li><strong>v3.26.00 &ndash; STACK-62: Autocomplete &amp; Fuzzy Search Pipeline</strong>: Autocomplete dropdowns on form inputs (name, purchase/storage location), abbreviation expansion in search (ASE, kook, krug, etc.), fuzzy fallback with indicator banner, registerName() for dynamic suggestions, Firefox compatibility fix</li>
    <li><strong>v3.25.05 &ndash; STACK-71: Details modal QoL</strong>: Pie chart percentage labels on slices, sticky metric toggle, scrollable modal body fixes overflow cascade, circular chart aspect-ratio, ResizeObserver leak fix, sepia theme chart colors</li>
    <li><strong>v3.25.04 &ndash; STACK-70: Mobile-optimized modals</strong>: Full-screen modals on mobile with 100dvh, settings 5&times;2 tab grid, 44px touch inputs, hidden pie charts, landscape card view for touch devices 769&ndash;1024px, bulk edit stacking</li>
    <li><strong>v3.25.03 &ndash; STACK-38/STACK-31: Responsive card view &amp; mobile layout</strong>: Inventory table converts to touch-friendly cards at &le;768px with horizontal chips, 2-column financials, centered action buttons. Consolidated responsive CSS, details modal fixes at &le;640px</li>
  `;
};

/**
 * Provides embedded roadmap data as fallback when file fetch fails
 * @returns {string} HTML string of development roadmap
 */
const getEmbeddedRoadmap = () => {
  return `
    <li><strong>Chart Overhaul (STACK-48)</strong>: Migrate to ApexCharts with time-series trend views</li>
    <li><strong>Custom CSV Mapper (STACK-51)</strong>: Header mapping UI with saved import profiles</li>
    <li><strong>PWA Support (STACK-74)</strong>: Manifest, service worker, installable app experience</li>
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

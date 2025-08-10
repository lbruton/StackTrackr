// ABOUT & DISCLAIMER MODAL - Enhanced
// =============================================================================

/**
 * Shows the About modal and populates it with current data
 */
const showAboutModal = () => {
  if (elements.aboutModal) {
    populateAboutModal();
    elements.aboutModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
};

/**
 * Hides the About modal
 */
const hideAboutModal = () => {
  if (elements.aboutModal) {
    elements.aboutModal.style.display = "none";
    document.body.style.overflow = "";
  }
};

/**
 * Shows the acknowledgment modal on load
 */
const showAckModal = () => {
  const ackModal = document.getElementById("ackModal");
  if (ackModal && !localStorage.getItem(ACK_DISMISSED_KEY)) {
    populateAckModal();
    ackModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
};

/**
 * Hides the acknowledgment modal
 */
const hideAckModal = () => {
  const ackModal = document.getElementById("ackModal");
  if (ackModal) {
    ackModal.style.display = "none";
    document.body.style.overflow = "";
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

  // Load changelog data
  loadChangelog();
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
 * Loads changelog information from docs/CHANGELOG.md and populates the About modal
 */
const loadChangelog = async () => {
  const latestList = document.getElementById("aboutChangelogLatest");
  if (!latestList) return;

  try {
    // Try to fetch from docs/CHANGELOG.md first, then fallback to README.md
    let res, text;
    try {
      res = await fetch("docs/CHANGELOG.md");
      if (!res.ok) throw new Error("CHANGELOG.md not found");
      text = await res.text();
    } catch (e) {
      res = await fetch("README.md");
      if (!res.ok) throw new Error("README.md not found");
      text = await res.text();
    }

    // Parse changelog sections - look for version headers
    const versionPattern =
      /###\s+Version\s+([\d.]+)[^\n]*\n([\s\S]*?)(?=###\s+Version|$)/g;
    const matches = [...text.matchAll(versionPattern)];

    if (matches.length > 0) {
      // Get the latest version changes
      const [, latestVersion, latestContent] = matches[0];
      const latestItems = extractChangelogItems(latestContent);

      if (latestItems.length > 0) {
        latestList.innerHTML = latestItems
          .slice(0, 5) // Show max 5 latest items
          .map((item) => `<li>${item}</li>`)
          .join("");
      } else {
        latestList.innerHTML =
          "<li>Enhanced about modal and user interface improvements</li>";
      }
    } else {
      // Fallback content if no versions found
      latestList.innerHTML = `
        <li>Comprehensive precious metals inventory tracking</li>
        <li>Multi-format import/export capabilities</li>
        <li>Advanced analytics with interactive charts</li>
        <li>Enhanced user interface and theming</li>
        <li>Improved data backup and security features</li>
      `;
    }
  } catch (e) {
    console.warn("Could not load changelog", e);
    // Provide fallback content
    latestList.innerHTML = `
      <li>Enhanced about modal with comprehensive information</li>
      <li>Improved user interface and documentation</li>
      <li>Better data backup and security features</li>
      <li>See documentation for complete feature list</li>
    `;
  }
};

/**
 * Extracts changelog items from content, filtering for meaningful changes
 */
const extractChangelogItems = (content) => {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-") || line.startsWith("*"))
    .map((line) => line.replace(/^[-*]\s*/, ""))
    .filter((line) => line.length > 10) // Filter out very short items
    .map((line) => {
      const safe = sanitizeHtml(line);
      // Clean up markdown formatting
      return safe
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold
        .replace(/`(.*?)`/g, "<code>$1</code>") // Code
        .replace(/\[(.*?)\]\(.*?\)/g, "$1"); // Remove links but keep text
    });

  return lines;
};

/**
 * Shows full changelog in a new window or navigates to documentation
 */
const showFullChangelog = () => {
  // Try to open changelog documentation
  const urls = [
    "docs/CHANGELOG.md",
    "https://github.com/lbruton/Precious-Metals-Inventory/blob/main/docs/CHANGELOG.md",
    "README.md",
  ];

  // Open the first available URL
  window.open(urls[1], "_blank", "noopener,noreferrer");
};

/**
 * Sets up event listeners for about modal elements
 */
const setupAboutModalEvents = () => {
  const aboutCloseBtn = document.getElementById("aboutCloseBtn");
  const aboutShowChangelogBtn = document.getElementById(
    "aboutShowChangelogBtn",
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

// Expose globally for access from other modules
if (typeof window !== "undefined") {
  window.showAboutModal = showAboutModal;
  window.hideAboutModal = hideAboutModal;
  window.showAckModal = showAckModal;
  window.hideAckModal = hideAckModal;
  window.acceptAck = acceptAck;
  window.loadChangelog = loadChangelog;
  window.setupAboutModalEvents = setupAboutModalEvents;
  window.setupAckModalEvents = setupAckModalEvents;
  window.populateAboutModal = populateAboutModal;
  window.populateAckModal = populateAckModal;
}

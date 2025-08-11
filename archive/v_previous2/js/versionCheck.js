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
    .then((resp) => resp.text())
    .then((md) => {
      const changes = getChangelogForVersion(md, current);
      populateVersionModal(current, changes);
    })
    .catch((err) => {
      console.error("Error loading changelog:", err);
      populateVersionModal(current, "<p>Unable to load changelog.</p>");
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
    return "<p>No changelog entry found.</p>";
  }
  const items = match[1]
    .trim()
    .split("\n")
    .filter((line) => line.trim().startsWith("-"))
    .map((line) => `<li>${sanitizeHtml(line.replace(/^\-\s*/, ""))}</li>`)
    .join("");
  return `<ul>${items}</ul>`;
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
  modal.style.display = "block";
  document.body.style.overflow = "hidden";
  setupVersionModalEvents(version);
  if (typeof loadRoadmap === "function") {
    loadRoadmap();
  }
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


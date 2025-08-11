// THEME MANAGEMENT
// =============================================================================

/**
 * Sets application theme and updates localStorage
 *
 * @param {string} theme - 'dark', 'light', or 'system'
 */
const setTheme = (theme) => {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem(THEME_KEY, "dark");
  } else {
    if (theme === "light") {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem(THEME_KEY, "light");
    } else {
      localStorage.removeItem(THEME_KEY);
      const systemPrefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (systemPrefersDark) {
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
    }
  }
  if (typeof renderTable === "function") {
    renderTable();
  }
};

/**
 * Initializes theme based on user preference and system settings
 */
const initTheme = () => {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const systemPrefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (savedTheme) {
    setTheme(savedTheme);
  } else {
    setTheme(systemPrefersDark ? "dark" : "light");
  }
};

/**
 * Toggles between dark and light themes
 */
const toggleTheme = () => {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  setTheme(currentTheme === "dark" ? "light" : "dark");
};

/**
 * Sets up system theme change listener
 */
const setupSystemThemeListener = () => {
  if (window.matchMedia) {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        // Only auto-switch if user hasn't set a preference
        if (!localStorage.getItem(THEME_KEY)) {
          setTheme(e.matches ? "dark" : "light");
        }
      });
  }
};

// Expose theme controls globally for inline handlers and fallbacks
window.setTheme = setTheme;
window.toggleTheme = toggleTheme;
window.initTheme = initTheme;

// =============================================================================

// THEME MANAGEMENT
// =============================================================================

/**
 * Sets application theme and updates localStorage
 *
 * @param {string} theme - 'dark', 'light', 'sepia', or 'system'
*/
const setTheme = (theme) => {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem(THEME_KEY, "dark");
  } else if (theme === "light") {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem(THEME_KEY, "light");
  } else if (theme === "sepia") {
    document.documentElement.setAttribute("data-theme", "sepia");
    localStorage.setItem(THEME_KEY, "sepia");
  } else {
    localStorage.setItem(THEME_KEY, "system");
    const systemPrefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (systemPrefersDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
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
 * Cycles through available themes
 */
const toggleTheme = () => {
  const current = localStorage.getItem(THEME_KEY) || "system";
  if (current === "dark") {
    setTheme("light");
  } else if (current === "light") {
    setTheme("sepia");
  } else if (current === "sepia") {
    setTheme("system");
  } else {
    setTheme("dark");
  }
};

/**
 * Sets up system theme change listener
 */
const setupSystemThemeListener = () => {
  if (window.matchMedia) {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        // Only auto-switch if user preference is system
        if (localStorage.getItem(THEME_KEY) === "system") {
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

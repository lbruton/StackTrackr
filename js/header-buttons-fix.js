(() => {
  const get = (id) => document.getElementById(id);

  const openModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  };

  const attachOnce = (el, type, handler) => {
    if (!el || el.dataset.initialized) return;
    el.dataset.initialized = 'true';
    el.addEventListener(type, handler);
  };

  const initButtons = () => {
    // App logo reloads page
    attachOnce(get('appLogo'), 'click', () => window.location.reload());

    // Files modal
    attachOnce(get('filesBtn'), 'click', (e) => {
      e.preventDefault();
      if (typeof showFilesModal === 'function') {
        showFilesModal();
      } else {
        openModal('filesModal');
      }
    });

    // About modal
    attachOnce(get('aboutBtn'), 'click', (e) => {
      e.preventDefault();
      if (typeof showAboutModal === 'function') {
        showAboutModal();
      } else {
        openModal('aboutModal');
      }
    });

    // API modal
    attachOnce(get('apiBtn'), 'click', (e) => {
      e.preventDefault();
      if (typeof showApiModal === 'function') {
        showApiModal();
      } else {
        openModal('apiModal');
      }
    });

    // Theme toggle
    attachOnce(get('appearanceBtn'), 'click', (e) => {
      e.preventDefault();
      if (typeof toggleTheme === 'function') {
        toggleTheme();
      }
      if (typeof updateThemeButton === 'function') {
        updateThemeButton();
      }
    });

    // Initial theme button appearance
    if (typeof updateThemeButton === 'function') {
      updateThemeButton();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initButtons);
  } else {
    initButtons();
  }
})();

// SETTINGS MODAL
// =============================================================================

/**
 * Opens the unified Settings modal, optionally navigating to a section.
 * @param {string} [section='site'] - Section to display: 'site', 'api', 'files', 'cloud', 'tools'
 */
const showSettingsModal = (section = 'site') => {
  const modal = document.getElementById('settingsModal');
  if (!modal) return;

  syncSettingsUI();
  switchSettingsSection(section);

  if (window.openModalById) {
    openModalById('settingsModal');
  } else {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
};

/**
 * Closes the Settings modal.
 */
const hideSettingsModal = () => {
  if (window.closeModalById) {
    closeModalById('settingsModal');
  } else {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'none';
    try { document.body.style.overflow = ''; } catch (e) { /* ignore */ }
  }
};

/**
 * Switches the visible section panel in the Settings modal.
 * @param {string} name - Section key: 'site', 'api', 'files', 'cloud', 'tools'
 */
const switchSettingsSection = (name) => {
  // Hide all panels
  document.querySelectorAll('.settings-section-panel').forEach(panel => {
    panel.style.display = 'none';
  });

  // Show target panel
  const target = document.getElementById(`settingsPanel_${name}`);
  if (target) target.style.display = 'block';

  // Update active nav item
  document.querySelectorAll('.settings-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === name);
  });

  // Populate API data when switching to API section
  if (name === 'api' && typeof populateApiSection === 'function') {
    populateApiSection();
  }
};

/**
 * Switches the visible provider tab in the API section.
 * @param {string} key - Provider key: 'METALS_DEV', 'METALS_API', 'METAL_PRICE_API', 'CUSTOM'
 */
const switchProviderTab = (key) => {
  // Hide all provider panels
  document.querySelectorAll('.settings-provider-panel').forEach(panel => {
    panel.style.display = 'none';
  });

  // Show target panel
  const target = document.getElementById(`providerPanel_${key}`);
  if (target) target.style.display = 'block';

  // Update active tab
  document.querySelectorAll('.settings-provider-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.provider === key);
  });
};

/**
 * Syncs all Settings UI controls with current application state.
 * Called each time the modal opens to ensure controls reflect live values.
 */
const syncSettingsUI = () => {
  // Theme picker
  const currentTheme = localStorage.getItem(THEME_KEY) || 'light';
  document.querySelectorAll('.theme-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === currentTheme);
  });

  // Items per page
  const ippSelect = document.getElementById('settingsItemsPerPage');
  if (ippSelect) {
    ippSelect.value = String(itemsPerPage);
  }

  // Chip min count — sync with inline control
  const chipMinSetting = document.getElementById('settingsChipMinCount');
  const chipMinInline = document.getElementById('chipMinCount');
  if (chipMinSetting) {
    chipMinSetting.value = localStorage.getItem('chipMinCount') || '3';
  }

  // Smart name grouping — sync with inline control
  const groupSetting = document.getElementById('settingsGroupNameChips');
  if (groupSetting && window.featureFlags) {
    groupSetting.value = featureFlags.isEnabled('GROUPED_NAME_CHIPS') ? 'yes' : 'no';
  }

  // Storage footer
  updateSettingsFooter();

  // API status
  if (typeof renderApiStatusSummary === 'function') {
    renderApiStatusSummary();
  }

  // Set first provider tab active if none visible
  const anyVisible = document.querySelector('.settings-provider-panel[style*="display: block"]');
  if (!anyVisible) {
    switchProviderTab('METALS_DEV');
  }
};

/**
 * Updates the storage + version footer bar at the bottom of the Settings modal.
 */
const updateSettingsFooter = () => {
  const footerEl = document.getElementById('settingsFooter');
  if (!footerEl) return;

  let storageText = '';
  try {
    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const val = localStorage.getItem(key);
      totalBytes += (key.length + (val ? val.length : 0)) * 2; // UTF-16
    }
    const mb = (totalBytes / (1024 * 1024)).toFixed(2);
    storageText = `Storage: ${mb} MB / 5 MB`;
  } catch (e) {
    storageText = 'Storage: unknown';
  }

  footerEl.textContent = `${storageText}  \u00b7  v${APP_VERSION}`;
};

/**
 * Wires up all Settings modal event listeners.
 * Called once during initialization.
 */
const setupSettingsEventListeners = () => {
  // Sidebar navigation
  document.querySelectorAll('.settings-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      switchSettingsSection(item.dataset.section);
    });
  });

  // Provider tabs
  document.querySelectorAll('.settings-provider-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchProviderTab(tab.dataset.provider);
    });
  });

  // Theme picker buttons
  document.querySelectorAll('.theme-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      if (typeof setTheme === 'function') {
        setTheme(theme);
      }
      if (typeof updateThemeButton === 'function') {
        updateThemeButton();
      }
      // Update active state
      document.querySelectorAll('.theme-option').forEach(b => {
        b.classList.toggle('active', b.dataset.theme === theme);
      });
    });
  });

  // Items per page
  const ippSelect = document.getElementById('settingsItemsPerPage');
  if (ippSelect) {
    ippSelect.addEventListener('change', () => {
      const val = parseInt(ippSelect.value, 10);
      itemsPerPage = val;
      // Persist
      try { localStorage.setItem(ITEMS_PER_PAGE_KEY, String(val)); } catch (e) { /* ignore */ }
      // Sync footer select
      if (elements.itemsPerPage) elements.itemsPerPage.value = String(val);
      renderTable();
    });
  }

  // Chip min count in settings
  const chipMinSetting = document.getElementById('settingsChipMinCount');
  if (chipMinSetting) {
    chipMinSetting.addEventListener('change', () => {
      const val = chipMinSetting.value;
      localStorage.setItem('chipMinCount', val);
      // Sync inline control
      const chipMinInline = document.getElementById('chipMinCount');
      if (chipMinInline) chipMinInline.value = val;
      if (typeof renderActiveFilters === 'function') renderActiveFilters();
    });
  }

  // Smart name grouping in settings
  const groupSetting = document.getElementById('settingsGroupNameChips');
  if (groupSetting) {
    groupSetting.addEventListener('change', () => {
      const isEnabled = groupSetting.value === 'yes';
      if (window.featureFlags) {
        if (isEnabled) featureFlags.enable('GROUPED_NAME_CHIPS');
        else featureFlags.disable('GROUPED_NAME_CHIPS');
      }
      // Sync inline control
      const groupInline = document.getElementById('groupNameChips');
      if (groupInline) groupInline.value = groupSetting.value;
      if (typeof renderActiveFilters === 'function') renderActiveFilters();
    });
  }

  // Settings modal close button
  const closeBtn = document.getElementById('settingsCloseBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', hideSettingsModal);
  }

  // Settings modal backdrop click
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideSettingsModal();
    });
  }
};

// Expose globally
if (typeof window !== 'undefined') {
  window.showSettingsModal = showSettingsModal;
  window.hideSettingsModal = hideSettingsModal;
  window.switchSettingsSection = switchSettingsSection;
  window.switchProviderTab = switchProviderTab;
  window.setupSettingsEventListeners = setupSettingsEventListeners;
}

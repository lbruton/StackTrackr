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
 * @param {string} key - Provider key: 'NUMISTA', 'METALS_DEV', 'METALS_API', 'METAL_PRICE_API', 'CUSTOM'
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

  // Dynamic name chips
  const dynamicSetting = document.getElementById('settingsDynamicChips');
  if (dynamicSetting && window.featureFlags) {
    dynamicSetting.value = featureFlags.isEnabled('DYNAMIC_NAME_CHIPS') ? 'yes' : 'no';
  }

  // Chip grouping tables and dropdown
  if (typeof window.populateBlacklistDropdown === 'function') window.populateBlacklistDropdown();
  if (typeof window.renderBlacklistTable === 'function') window.renderBlacklistTable();
  if (typeof window.renderCustomGroupTable === 'function') window.renderCustomGroupTable();

  // Inline chip config table
  renderInlineChipConfigTable();

  // Storage footer
  updateSettingsFooter();

  // API status
  if (typeof renderApiStatusSummary === 'function') {
    renderApiStatusSummary();
  }

  // Numista usage bar
  if (typeof renderNumistaUsageBar === 'function') {
    renderNumistaUsageBar();
  }

  // Set first provider tab active if none visible — default to Numista
  const anyVisible = document.querySelector('.settings-provider-panel[style*="display: block"]');
  if (!anyVisible) {
    switchProviderTab('NUMISTA');
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

  // Dynamic name chips toggle
  const dynamicChipsSetting = document.getElementById('settingsDynamicChips');
  if (dynamicChipsSetting) {
    dynamicChipsSetting.addEventListener('change', () => {
      const isEnabled = dynamicChipsSetting.value === 'yes';
      if (window.featureFlags) {
        if (isEnabled) featureFlags.enable('DYNAMIC_NAME_CHIPS');
        else featureFlags.disable('DYNAMIC_NAME_CHIPS');
      }
      if (typeof renderActiveFilters === 'function') renderActiveFilters();
    });
  }

  // Chip grouping events (blacklist + custom rules)
  if (typeof window.setupChipGroupingEvents === 'function') {
    window.setupChipGroupingEvents();
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

  // Provider tab drag-to-reorder
  setupProviderTabDrag();
};

/**
 * Sets up HTML5 drag-and-drop for metals provider tabs.
 * Numista tab is pinned (not draggable). Metals tab order = sync priority.
 */
const setupProviderTabDrag = () => {
  const tabContainer = document.querySelector('.settings-provider-tabs');
  if (!tabContainer) return;

  let draggedTab = null;

  const tabs = () => tabContainer.querySelectorAll('.settings-provider-tab:not(.pinned)');

  tabs().forEach(tab => {
    tab.addEventListener('dragstart', (e) => {
      draggedTab = tab;
      tabContainer.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', tab.dataset.provider);
      // Slight delay to let the drag image render
      requestAnimationFrame(() => tab.style.opacity = '0.4');
    });

    tab.addEventListener('dragend', () => {
      tabContainer.classList.remove('dragging');
      tab.style.opacity = '';
      tabs().forEach(t => t.classList.remove('drag-over'));
      draggedTab = null;
    });

    tab.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (draggedTab && tab !== draggedTab) {
        tab.classList.add('drag-over');
      }
    });

    tab.addEventListener('dragleave', () => {
      tab.classList.remove('drag-over');
    });

    tab.addEventListener('drop', (e) => {
      e.preventDefault();
      tab.classList.remove('drag-over');
      if (!draggedTab || draggedTab === tab) return;

      // Reorder DOM: insert dragged tab before or after the drop target
      const allTabs = [...tabs()];
      const dragIdx = allTabs.indexOf(draggedTab);
      const dropIdx = allTabs.indexOf(tab);

      if (dragIdx < dropIdx) {
        tabContainer.insertBefore(draggedTab, tab.nextSibling);
      } else {
        tabContainer.insertBefore(draggedTab, tab);
      }

      // Persist new order and update default provider
      saveProviderTabOrder();
      if (typeof autoSelectDefaultProvider === 'function') {
        autoSelectDefaultProvider();
      }
    });
  });
};

/**
 * Saves the current metals provider tab order to localStorage.
 * Only saves the metals providers (not Numista which is pinned).
 */
const saveProviderTabOrder = () => {
  const tabContainer = document.querySelector('.settings-provider-tabs');
  if (!tabContainer) return;
  const order = [...tabContainer.querySelectorAll('.settings-provider-tab:not(.pinned)')]
    .map(tab => tab.dataset.provider);
  try {
    localStorage.setItem('apiProviderOrder', JSON.stringify(order));
  } catch (e) { /* ignore */ }
};

/**
 * Restores provider tab DOM order from localStorage.
 * Called when the API section is populated.
 */
const loadProviderTabOrder = () => {
  let order;
  try {
    const stored = localStorage.getItem('apiProviderOrder');
    order = stored ? JSON.parse(stored) : null;
  } catch (e) { return; }
  if (!Array.isArray(order) || order.length === 0) return;

  const tabContainer = document.querySelector('.settings-provider-tabs');
  if (!tabContainer) return;

  // Reorder tabs to match saved order
  order.forEach(provider => {
    const tab = tabContainer.querySelector(`.settings-provider-tab[data-provider="${provider}"]`);
    if (tab && !tab.classList.contains('pinned')) {
      tabContainer.appendChild(tab);
    }
  });
};

/**
 * Renders the inline chip config table in Settings > Grouping.
 * Each row has a checkbox (enable/disable) and up/down arrows for reordering.
 */
const renderInlineChipConfigTable = () => {
  const container = document.getElementById('inlineChipConfigContainer');
  if (!container || typeof getInlineChipConfig !== 'function') return;

  const config = getInlineChipConfig();

  if (!config.length) {
    container.innerHTML = '<div class="chip-grouping-empty">No chip types available</div>';
    return;
  }

  let html = '<table class="chip-grouping-table"><tbody>';
  config.forEach((chip, idx) => {
    html += `<tr data-chip-id="${chip.id}">
      <td style="width:2rem;text-align:center;">
        <input type="checkbox" ${chip.enabled ? 'checked' : ''} data-chip-idx="${idx}" class="inline-chip-toggle" title="Toggle ${chip.label}">
      </td>
      <td>${chip.label}</td>
      <td style="width:3.5rem;text-align:right;white-space:nowrap;">
        <button type="button" class="inline-chip-move" data-dir="up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''} title="Move up">&uarr;</button>
        <button type="button" class="inline-chip-move" data-dir="down" data-idx="${idx}" ${idx === config.length - 1 ? 'disabled' : ''} title="Move down">&darr;</button>
      </td>
    </tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;

  // Attach event listeners
  container.querySelectorAll('.inline-chip-toggle').forEach(cb => {
    cb.addEventListener('change', () => {
      const cfg = getInlineChipConfig();
      const i = parseInt(cb.dataset.chipIdx, 10);
      if (cfg[i]) {
        cfg[i].enabled = cb.checked;
        saveInlineChipConfig(cfg);
        if (typeof renderTable === 'function') renderTable();
      }
    });
  });

  container.querySelectorAll('.inline-chip-move').forEach(btn => {
    btn.addEventListener('click', () => {
      const cfg = getInlineChipConfig();
      const i = parseInt(btn.dataset.idx, 10);
      const dir = btn.dataset.dir;
      const j = dir === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= cfg.length) return;
      // Swap
      [cfg[i], cfg[j]] = [cfg[j], cfg[i]];
      saveInlineChipConfig(cfg);
      renderInlineChipConfigTable();
      if (typeof renderTable === 'function') renderTable();
    });
  });
};

// Expose globally
if (typeof window !== 'undefined') {
  window.showSettingsModal = showSettingsModal;
  window.hideSettingsModal = hideSettingsModal;
  window.switchSettingsSection = switchSettingsSection;
  window.switchProviderTab = switchProviderTab;
  window.setupSettingsEventListeners = setupSettingsEventListeners;
  window.renderInlineChipConfigTable = renderInlineChipConfigTable;
  window.setupProviderTabDrag = setupProviderTabDrag;
  window.loadProviderTabOrder = loadProviderTabOrder;
  window.saveProviderTabOrder = saveProviderTabOrder;
}

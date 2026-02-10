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

  // Populate change log when switching to changelog section
  if (name === 'changelog' && typeof renderChangeLog === 'function') {
    renderChangeLog();
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

  // Smart name grouping — sync with inline toggle
  const groupSetting = document.getElementById('settingsGroupNameChips');
  if (groupSetting && window.featureFlags) {
    const gVal = featureFlags.isEnabled('GROUPED_NAME_CHIPS') ? 'yes' : 'no';
    groupSetting.querySelectorAll('.chip-sort-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === gVal);
    });
  }

  // Dynamic name chips
  const dynamicSetting = document.getElementById('settingsDynamicChips');
  if (dynamicSetting && window.featureFlags) {
    dynamicSetting.value = featureFlags.isEnabled('DYNAMIC_NAME_CHIPS') ? 'yes' : 'no';
  }

  // Chip quantity badge — sync toggle with feature flag
  const qtyBadgeSetting = document.getElementById('settingsChipQtyBadge');
  if (qtyBadgeSetting && window.featureFlags) {
    const qVal = featureFlags.isEnabled('CHIP_QTY_BADGE') ? 'yes' : 'no';
    qtyBadgeSetting.querySelectorAll('.chip-sort-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === qVal);
    });
  }

  // Chip grouping tables and dropdown
  if (typeof window.populateBlacklistDropdown === 'function') window.populateBlacklistDropdown();
  if (typeof window.renderBlacklistTable === 'function') window.renderBlacklistTable();
  if (typeof window.renderCustomGroupTable === 'function') window.renderCustomGroupTable();

  // Inline chip config table
  renderInlineChipConfigTable();

  // Filter chip category config table
  renderFilterChipCategoryTable();

  // Chip sort order — sync settings toggle with stored value
  const chipSortSetting = document.getElementById('settingsChipSortOrder');
  if (chipSortSetting) {
    const saved = localStorage.getItem('chipSortOrder');
    const active = (saved === 'count') ? 'count' : 'alpha';
    chipSortSetting.querySelectorAll('.chip-sort-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sort === active);
    });
  }

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

  // Smart name grouping toggle in settings
  const groupSettingEl = document.getElementById('settingsGroupNameChips');
  if (groupSettingEl) {
    groupSettingEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip-sort-btn');
      if (!btn) return;
      const isEnabled = btn.dataset.val === 'yes';
      if (window.featureFlags) {
        if (isEnabled) featureFlags.enable('GROUPED_NAME_CHIPS');
        else featureFlags.disable('GROUPED_NAME_CHIPS');
      }
      // Update active state
      groupSettingEl.querySelectorAll('.chip-sort-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.val === btn.dataset.val);
      });
      // Sync inline toggle
      const groupInline = document.getElementById('groupNameChips');
      if (groupInline) {
        groupInline.querySelectorAll('.chip-sort-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.val === btn.dataset.val);
        });
      }
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

  // Chip quantity badge toggle
  const qtyBadgeSettingEl = document.getElementById('settingsChipQtyBadge');
  if (qtyBadgeSettingEl) {
    qtyBadgeSettingEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip-sort-btn');
      if (!btn) return;
      const isEnabled = btn.dataset.val === 'yes';
      if (window.featureFlags) {
        if (isEnabled) featureFlags.enable('CHIP_QTY_BADGE');
        else featureFlags.disable('CHIP_QTY_BADGE');
      }
      // Update active state
      qtyBadgeSettingEl.querySelectorAll('.chip-sort-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.val === btn.dataset.val);
      });
      if (typeof renderActiveFilters === 'function') renderActiveFilters();
    });
  }

  // Chip sort order toggle in settings
  const chipSortSettingEl = document.getElementById('settingsChipSortOrder');
  if (chipSortSettingEl) {
    chipSortSettingEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip-sort-btn');
      if (!btn) return;
      const val = btn.dataset.sort;
      localStorage.setItem('chipSortOrder', val);
      // Update active state
      chipSortSettingEl.querySelectorAll('.chip-sort-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.sort === val);
      });
      // Sync inline toggle
      const chipSortInline = document.getElementById('chipSortOrder');
      if (chipSortInline) {
        chipSortInline.querySelectorAll('.chip-sort-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.sort === val);
        });
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
  container.textContent = '';

  if (!config.length) {
    const empty = document.createElement('div');
    empty.className = 'chip-grouping-empty';
    empty.textContent = 'No chip types available';
    container.appendChild(empty);
    return;
  }

  const table = document.createElement('table');
  table.className = 'chip-grouping-table';
  const tbody = document.createElement('tbody');

  config.forEach((chip, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.chipId = chip.id;

    // Checkbox cell
    const tdCheck = document.createElement('td');
    tdCheck.style.cssText = 'width:2rem;text-align:center';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = chip.enabled;
    cb.className = 'inline-chip-toggle';
    cb.title = 'Toggle ' + chip.label;
    cb.addEventListener('change', () => {
      const cfg = getInlineChipConfig();
      const item = cfg.at(idx);
      if (item) {
        item.enabled = cb.checked;
        saveInlineChipConfig(cfg);
        if (typeof renderTable === 'function') renderTable();
      }
    });
    tdCheck.appendChild(cb);

    // Label cell
    const tdLabel = document.createElement('td');
    tdLabel.textContent = chip.label;

    // Arrow buttons cell
    const tdMove = document.createElement('td');
    tdMove.style.cssText = 'width:3.5rem;text-align:right;white-space:nowrap';

    const makeBtn = (dir, disabled) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'inline-chip-move';
      btn.textContent = dir === 'up' ? '\u2191' : '\u2193';
      btn.title = 'Move ' + dir;
      btn.disabled = disabled;
      btn.addEventListener('click', () => {
        const cfg = getInlineChipConfig();
        const j = dir === 'up' ? idx - 1 : idx + 1;
        if (j < 0 || j >= cfg.length) return;
        const moved = cfg.splice(idx, 1).at(0);
        cfg.splice(j, 0, moved);
        saveInlineChipConfig(cfg);
        renderInlineChipConfigTable();
        if (typeof renderTable === 'function') renderTable();
      });
      return btn;
    };
    tdMove.appendChild(makeBtn('up', idx === 0));
    tdMove.appendChild(makeBtn('down', idx === config.length - 1));

    tr.append(tdCheck, tdLabel, tdMove);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
};

/**
 * Renders the filter chip category config table in Settings > Chips.
 * Each row has a checkbox (enable/disable) and up/down arrows for reordering.
 */
const renderFilterChipCategoryTable = () => {
  const container = document.getElementById('filterChipCategoryContainer');
  if (!container || typeof getFilterChipCategoryConfig !== 'function') return;

  const config = getFilterChipCategoryConfig();
  container.textContent = '';

  if (!config.length) {
    const empty = document.createElement('div');
    empty.className = 'chip-grouping-empty';
    empty.textContent = 'No chip categories available';
    container.appendChild(empty);
    return;
  }

  const table = document.createElement('table');
  table.className = 'chip-grouping-table';

  // Header row
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['', 'Category', 'Group', ''].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    th.style.cssText = 'font-size:0.75rem;font-weight:normal;opacity:0.6;padding:0.2rem 0.4rem';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  config.forEach((cat, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.catId = cat.id;

    // Checkbox cell
    const tdCheck = document.createElement('td');
    tdCheck.style.cssText = 'width:2rem;text-align:center';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = cat.enabled;
    cb.className = 'filter-cat-toggle';
    cb.title = 'Toggle ' + cat.label;
    cb.addEventListener('change', () => {
      const cfg = getFilterChipCategoryConfig();
      const item = cfg.at(idx);
      if (item) {
        item.enabled = cb.checked;
        saveFilterChipCategoryConfig(cfg);
        if (typeof renderActiveFilters === 'function') renderActiveFilters();
      }
    });
    tdCheck.appendChild(cb);

    // Label cell
    const tdLabel = document.createElement('td');
    tdLabel.textContent = cat.label;

    // Group dropdown cell
    const tdGroup = document.createElement('td');
    tdGroup.style.cssText = 'width:3rem;text-align:center';
    const groupSelect = document.createElement('select');
    groupSelect.className = 'control-select';
    groupSelect.title = 'Merge group — same letter = chips sort together';
    groupSelect.style.cssText = 'width:auto;min-width:3.2rem;padding:0.15rem 0.3rem;font-size:0.8rem';
    const groupOptions = ['\u2014', 'A', 'B', 'C', 'D', 'E'];
    groupOptions.forEach(letter => {
      const opt = document.createElement('option');
      opt.value = letter === '\u2014' ? '' : letter;
      opt.textContent = letter;
      if ((cat.group || '') === opt.value) opt.selected = true;
      groupSelect.appendChild(opt);
    });
    groupSelect.addEventListener('change', () => {
      const cfg = getFilterChipCategoryConfig();
      const item = cfg.at(idx);
      if (item) {
        item.group = groupSelect.value || null;
        saveFilterChipCategoryConfig(cfg);
        renderFilterChipCategoryTable();
        if (typeof renderActiveFilters === 'function') renderActiveFilters();
      }
    });
    tdGroup.appendChild(groupSelect);

    // Arrow buttons cell
    const tdMove = document.createElement('td');
    tdMove.style.cssText = 'width:3.5rem;text-align:right;white-space:nowrap';

    const makeBtn = (dir, disabled) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'inline-chip-move';
      btn.textContent = dir === 'up' ? '\u2191' : '\u2193';
      btn.title = 'Move ' + dir;
      btn.disabled = disabled;
      btn.addEventListener('click', () => {
        const cfg = getFilterChipCategoryConfig();
        const j = dir === 'up' ? idx - 1 : idx + 1;
        if (j < 0 || j >= cfg.length) return;
        const moved = cfg.splice(idx, 1).at(0);
        cfg.splice(j, 0, moved);
        saveFilterChipCategoryConfig(cfg);
        renderFilterChipCategoryTable();
        if (typeof renderActiveFilters === 'function') renderActiveFilters();
      });
      return btn;
    };
    tdMove.appendChild(makeBtn('up', idx === 0));
    tdMove.appendChild(makeBtn('down', idx === config.length - 1));

    tr.append(tdCheck, tdLabel, tdGroup, tdMove);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
};

// Expose globally
if (typeof window !== 'undefined') {
  window.showSettingsModal = showSettingsModal;
  window.hideSettingsModal = hideSettingsModal;
  window.switchSettingsSection = switchSettingsSection;
  window.switchProviderTab = switchProviderTab;
  window.setupSettingsEventListeners = setupSettingsEventListeners;
  window.renderInlineChipConfigTable = renderInlineChipConfigTable;
  window.renderFilterChipCategoryTable = renderFilterChipCategoryTable;
  window.setupProviderTabDrag = setupProviderTabDrag;
  window.loadProviderTabOrder = loadProviderTabOrder;
  window.saveProviderTabOrder = saveProviderTabOrder;
}

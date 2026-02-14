// SETTINGS MODAL
// =============================================================================

/**
 * Opens the unified Settings modal, optionally navigating to a section.
 * @param {string} [section='site'] - Section to display: 'site', 'system', 'table', 'grouping', 'api', 'files', 'cloud', 'goldback', 'changelog'
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
 * @param {string} name - Section key: 'site', 'system', 'table', 'grouping', 'api', 'files', 'cloud', 'goldback', 'changelog'
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

  // Render the active log sub-tab when switching to the changelog section
  if (name === 'changelog') {
    const activeTab = document.querySelector('.settings-log-tab.active');
    const activeKey = activeTab ? activeTab.dataset.logTab : 'changelog';
    switchLogTab(activeKey);
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
 * Switches the visible log sub-tab in the Activity Log panel.
 * Lazy-renders each sub-tab on first activation via data-rendered attribute.
 * @param {string} key - Sub-tab key: 'changelog', 'metals', 'catalogs', 'pricehistory'
 */
const switchLogTab = (key) => {
  // Hide all log panels
  document.querySelectorAll('.settings-log-panel').forEach(panel => {
    panel.style.display = 'none';
  });

  // Show target panel
  const target = document.getElementById(`logPanel_${key}`);
  if (target) target.style.display = 'block';

  // Update active tab
  document.querySelectorAll('.settings-log-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.logTab === key);
  });

  // Lazy-render on first activation
  if (target && !target.dataset.rendered) {
    renderLogTab(key);
    target.dataset.rendered = '1';
  }

  // Always re-render changelog (existing behavior — it may have changed)
  if (key === 'changelog') {
    renderLogTab(key);
  }
};

/** Dispatch map: log sub-tab key → window function name */
const LOG_TAB_RENDERERS = {
  changelog: 'renderChangeLog',
  metals: 'renderSpotHistoryTable',
  catalogs: 'renderCatalogHistoryForSettings',
  pricehistory: 'renderItemPriceHistoryTable',
};

/**
 * Dispatches to the appropriate render function for a log sub-tab.
 * @param {string} key - Sub-tab key
 */
const renderLogTab = (key) => {
  const fn = window[LOG_TAB_RENDERERS[key]];
  if (typeof fn === 'function') fn();
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

  // Dynamic name chips — sync toggle with feature flag
  const dynamicSetting = document.getElementById('settingsDynamicChips');
  if (dynamicSetting && window.featureFlags) {
    const dVal = featureFlags.isEnabled('DYNAMIC_NAME_CHIPS') ? 'yes' : 'no';
    dynamicSetting.querySelectorAll('.chip-sort-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === dVal);
    });
  }

  // Chip quantity badge — sync toggle with feature flag
  const qtyBadgeSetting = document.getElementById('settingsChipQtyBadge');
  if (qtyBadgeSetting && window.featureFlags) {
    const qVal = featureFlags.isEnabled('CHIP_QTY_BADGE') ? 'yes' : 'no';
    qtyBadgeSetting.querySelectorAll('.chip-sort-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === qVal);
    });
  }

  // Fuzzy autocomplete — sync toggle with feature flag
  const autocompleteSetting = document.getElementById('settingsFuzzyAutocomplete');
  if (autocompleteSetting && window.featureFlags) {
    const aVal = featureFlags.isEnabled('FUZZY_AUTOCOMPLETE') ? 'yes' : 'no';
    autocompleteSetting.querySelectorAll('.chip-sort-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === aVal);
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

  // PCGS usage bar
  if (typeof renderPcgsUsageBar === 'function') {
    renderPcgsUsageBar();
  }

  // Display currency (STACK-50)
  if (typeof syncCurrencySettingsUI === 'function') {
    syncCurrencySettingsUI();
  }

  // Goldback denomination pricing (STACK-45)
  if (typeof syncGoldbackSettingsUI === 'function') {
    syncGoldbackSettingsUI();
  }

  // Header shortcuts (STACK-54)
  syncHeaderToggleUI();
  // Layout visibility (STACK-54)
  syncLayoutVisibilityUI();

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

  // Log sub-tabs
  document.querySelectorAll('[data-log-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      switchLogTab(tab.dataset.logTab);
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

  // Display currency (STACK-50)
  const currencySelect = document.getElementById('settingsDisplayCurrency');
  if (currencySelect) {
    currencySelect.addEventListener('change', () => {
      saveDisplayCurrency(currencySelect.value);
      // Re-render all display with new currency conversion (STACK-50)
      if (typeof renderTable === 'function') renderTable();
      if (typeof updateSummary === 'function') updateSummary();
      if (typeof updateAllSparklines === 'function') updateAllSparklines();
      // Update Goldback denomination symbols (STACK-50)
      if (typeof syncGoldbackSettingsUI === 'function') syncGoldbackSettingsUI();
    });
  }

  // Header shortcuts (STACK-54)
  const headerThemeCb = document.getElementById('settingsHeaderThemeBtn');
  if (headerThemeCb) {
    headerThemeCb.addEventListener('change', () => {
      localStorage.setItem('headerThemeBtnVisible', headerThemeCb.checked ? 'true' : 'false');
      applyHeaderToggleVisibility();
    });
  }

  const headerCurrencyCb = document.getElementById('settingsHeaderCurrencyBtn');
  if (headerCurrencyCb) {
    headerCurrencyCb.addEventListener('change', () => {
      localStorage.setItem('headerCurrencyBtnVisible', headerCurrencyCb.checked ? 'true' : 'false');
      applyHeaderToggleVisibility();
    });
  }

  // Theme cycle header button (STACK-54)
  if (elements.headerThemeBtn) {
    elements.headerThemeBtn.addEventListener('click', () => {
      if (typeof toggleTheme === 'function') toggleTheme();
      if (typeof updateThemeButton === 'function') updateThemeButton();
      // Sync settings picker if open
      const currentTheme = localStorage.getItem(THEME_KEY) || 'light';
      document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === currentTheme);
      });
    });
  }

  // Currency picker header button (STACK-54)
  // Opens a floating dropdown to switch display currency directly from the header.
  if (elements.headerCurrencyBtn) {
    elements.headerCurrencyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCurrencyDropdown();
    });
  }

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
    dynamicChipsSetting.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip-sort-btn');
      if (!btn) return;
      const isEnabled = btn.dataset.val === 'yes';
      if (window.featureFlags) {
        if (isEnabled) featureFlags.enable('DYNAMIC_NAME_CHIPS');
        else featureFlags.disable('DYNAMIC_NAME_CHIPS');
      }
      dynamicChipsSetting.querySelectorAll('.chip-sort-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.val === btn.dataset.val);
      });
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

  // Fuzzy autocomplete toggle
  const autocompleteSettingEl = document.getElementById('settingsFuzzyAutocomplete');
  if (autocompleteSettingEl) {
    autocompleteSettingEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip-sort-btn');
      if (!btn) return;
      const isEnabled = btn.dataset.val === 'yes';
      if (window.featureFlags) {
        if (isEnabled) featureFlags.enable('FUZZY_AUTOCOMPLETE');
        else featureFlags.disable('FUZZY_AUTOCOMPLETE');
      }
      // Update active state
      autocompleteSettingEl.querySelectorAll('.chip-sort-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.val === btn.dataset.val);
      });
      // Re-initialize or tear down autocomplete live
      if (isEnabled && typeof initializeAutocomplete === 'function') {
        initializeAutocomplete(inventory);
      }
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

  // Goldback pricing toggle (STACK-45)
  const gbToggle = document.getElementById('settingsGoldbackEnabled');
  if (gbToggle) {
    gbToggle.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip-sort-btn');
      if (!btn) return;
      const isEnabled = btn.dataset.val === 'on';
      if (typeof saveGoldbackEnabled === 'function') saveGoldbackEnabled(isEnabled);
      gbToggle.querySelectorAll('.chip-sort-btn').forEach(b => b.classList.toggle('active', b === btn));
      if (typeof renderTable === 'function') renderTable();
    });
  }

  // Goldback estimation toggle (STACK-52)
  const gbEstToggle = document.getElementById('settingsGoldbackEstimateEnabled');
  if (gbEstToggle) {
    gbEstToggle.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip-sort-btn');
      if (!btn) return;
      const isEnabled = btn.dataset.val === 'on';
      if (typeof saveGoldbackEstimateEnabled === 'function') saveGoldbackEstimateEnabled(isEnabled);
      gbEstToggle.querySelectorAll('.chip-sort-btn').forEach(b => b.classList.toggle('active', b === btn));
      // If turning ON, immediately populate prices from current gold spot
      if (isEnabled && typeof onGoldSpotPriceChanged === 'function') onGoldSpotPriceChanged();
      if (typeof syncGoldbackSettingsUI === 'function') syncGoldbackSettingsUI();
      if (typeof renderTable === 'function') renderTable();
    });
  }

  // Goldback estimation refresh button (STACK-52)
  const gbEstRefreshBtn = document.getElementById('goldbackEstimateRefreshBtn');
  if (gbEstRefreshBtn) {
    gbEstRefreshBtn.addEventListener('click', async () => {
      if (typeof syncProviderChain !== 'function') return;
      const origText = gbEstRefreshBtn.textContent;
      gbEstRefreshBtn.textContent = 'Refreshing...';
      gbEstRefreshBtn.disabled = true;
      try {
        await syncProviderChain({ showProgress: false, forceSync: true });
        // onGoldSpotPriceChanged() is called by the hooks in api.js after sync
      } catch (err) {
        console.warn('Goldback estimate refresh failed:', err);
      } finally {
        gbEstRefreshBtn.textContent = origText;
        gbEstRefreshBtn.disabled = false;
      }
    });
  }

  // Goldback estimation modifier input (STACK-52)
  const gbModifierInput = document.getElementById('goldbackEstimateModifierInput');
  if (gbModifierInput) {
    gbModifierInput.addEventListener('change', () => {
      const val = parseFloat(gbModifierInput.value);
      if (isNaN(val) || val <= 0) {
        gbModifierInput.value = goldbackEstimateModifier.toFixed(2);
        return;
      }
      if (typeof saveGoldbackEstimateModifier === 'function') saveGoldbackEstimateModifier(val);
      if (goldbackEstimateEnabled && typeof onGoldSpotPriceChanged === 'function') onGoldSpotPriceChanged();
      if (typeof syncGoldbackSettingsUI === 'function') syncGoldbackSettingsUI();
      if (typeof renderTable === 'function') renderTable();
    });
  }

  // Goldback save prices button (STACK-45)
  const gbSaveBtn = document.getElementById('goldbackSavePricesBtn');
  if (gbSaveBtn) {
    gbSaveBtn.addEventListener('click', () => {
      const tbody = document.getElementById('goldbackPriceTableBody');
      if (!tbody) return;
      const now = Date.now();
      // Convert entered display-currency values back to USD for storage (STACK-50)
      const fxRate = (typeof getExchangeRate === 'function') ? getExchangeRate() : 1;
      tbody.querySelectorAll('tr[data-denom]').forEach(row => {
        const denom = row.dataset.denom;
        const input = row.querySelector('input[type="number"]');
        if (!input) return;
        const displayVal = parseFloat(input.value);
        if (!isNaN(displayVal) && displayVal > 0) {
          const usdVal = fxRate !== 1 ? displayVal / fxRate : displayVal;
          goldbackPrices[denom] = { price: usdVal, updatedAt: now };
        }
      });
      if (typeof saveGoldbackPrices === 'function') saveGoldbackPrices();
      if (typeof recordGoldbackPrices === 'function') recordGoldbackPrices();
      if (typeof syncGoldbackSettingsUI === 'function') syncGoldbackSettingsUI();
      if (typeof renderTable === 'function') renderTable();
    });
  }

  // Goldback quick-fill button (STACK-45)
  const gbQuickFillBtn = document.getElementById('goldbackQuickFillBtn');
  if (gbQuickFillBtn) {
    gbQuickFillBtn.addEventListener('click', () => {
      const input = document.getElementById('goldbackQuickFillInput');
      if (!input) return;
      const rate = parseFloat(input.value);
      if (isNaN(rate) || rate <= 0) {
        alert('Enter a valid 1 Goldback rate.');
        return;
      }
      // Fill all denomination inputs proportionally (round to nearest cent)
      const tbody = document.getElementById('goldbackPriceTableBody');
      if (!tbody || typeof GOLDBACK_DENOMINATIONS === 'undefined') return;
      tbody.querySelectorAll('tr[data-denom]').forEach(row => {
        const denom = parseFloat(row.dataset.denom);
        const priceInput = row.querySelector('input[type="number"]');
        if (priceInput) {
          priceInput.value = (Math.round(rate * denom * 100) / 100).toFixed(2);
        }
      });
    });
  }

  // Goldback history button (STACK-45)
  const gbHistoryBtn = document.getElementById('goldbackHistoryBtn');
  if (gbHistoryBtn) {
    gbHistoryBtn.addEventListener('click', () => {
      if (typeof showGoldbackHistoryModal === 'function') showGoldbackHistoryModal();
    });
  }

  // Goldback history modal close
  const gbHistoryCloseBtn = document.getElementById('goldbackHistoryCloseBtn');
  if (gbHistoryCloseBtn) {
    gbHistoryCloseBtn.addEventListener('click', () => {
      if (typeof hideGoldbackHistoryModal === 'function') hideGoldbackHistoryModal();
    });
  }

  // Goldback history modal backdrop click
  const gbHistoryModal = document.getElementById('goldbackHistoryModal');
  if (gbHistoryModal) {
    gbHistoryModal.addEventListener('click', (e) => {
      if (e.target === gbHistoryModal) {
        if (typeof hideGoldbackHistoryModal === 'function') hideGoldbackHistoryModal();
      }
    });
  }

  // Goldback history export button
  const gbExportBtn = document.getElementById('exportGoldbackHistoryBtn');
  if (gbExportBtn) {
    gbExportBtn.addEventListener('click', () => {
      if (typeof exportGoldbackHistory === 'function') exportGoldbackHistory();
    });
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

/**
 * Syncs the display currency dropdown with current state (STACK-50).
 * Populates options from SUPPORTED_CURRENCIES on first call.
 */
const syncCurrencySettingsUI = () => {
  const sel = document.getElementById('settingsDisplayCurrency');
  if (!sel) return;
  if (sel.options.length === 0) {
    SUPPORTED_CURRENCIES.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = `${c.code} \u2014 ${c.name}`;
      sel.appendChild(opt);
    });
  }
  sel.value = displayCurrency;
};

/**
 * Syncs the Goldback settings panel UI with current state.
 * Renders denomination price rows and updates enabled toggle.
 */
const syncGoldbackSettingsUI = () => {
  // Toggle — Goldback pricing enabled
  const toggleGroup = document.getElementById('settingsGoldbackEnabled');
  if (toggleGroup) {
    toggleGroup.querySelectorAll('.chip-sort-btn').forEach(btn => {
      const isOn = btn.dataset.val === 'on';
      btn.classList.toggle('active', goldbackEnabled ? isOn : !isOn);
    });
  }

  // Toggle — estimation enabled
  const estToggle = document.getElementById('settingsGoldbackEstimateEnabled');
  if (estToggle) {
    estToggle.querySelectorAll('.chip-sort-btn').forEach(btn => {
      const isOn = btn.dataset.val === 'on';
      btn.classList.toggle('active', goldbackEstimateEnabled ? isOn : !isOn);
    });
  }

  // Refresh button — visible only when estimation ON
  const refreshBtn = document.getElementById('goldbackEstimateRefreshBtn');
  if (refreshBtn) {
    refreshBtn.style.display = goldbackEstimateEnabled ? '' : 'none';
  }

  // Modifier row — visible only when estimation ON
  const modifierRow = document.getElementById('goldbackEstimateModifierRow');
  if (modifierRow) {
    modifierRow.style.display = goldbackEstimateEnabled ? '' : 'none';
  }
  const modifierInput = document.getElementById('goldbackEstimateModifierInput');
  if (modifierInput) {
    modifierInput.value = goldbackEstimateModifier.toFixed(2);
  }

  // Info line — show estimated rate + gold spot reference
  const infoEl = document.getElementById('goldbackEstimateInfo');
  if (infoEl) {
    const goldSpot = spotPrices && spotPrices.gold ? spotPrices.gold : 0;
    if (goldbackEstimateEnabled && goldSpot > 0) {
      const rate = typeof computeGoldbackEstimatedRate === 'function'
        ? computeGoldbackEstimatedRate(goldSpot)
        : 0;
      const fmtRate = typeof formatCurrency === 'function' ? formatCurrency(rate) : '$' + rate.toFixed(2);
      const fmtSpot = typeof formatCurrency === 'function' ? formatCurrency(goldSpot) : '$' + goldSpot.toFixed(2);
      infoEl.textContent = `Estimated 1 GB rate: ${fmtRate}  (gold spot: ${fmtSpot})`;
      infoEl.style.display = '';
    } else {
      infoEl.style.display = 'none';
    }
  }

  // Denomination table
  const tbody = document.getElementById('goldbackPriceTableBody');
  if (!tbody || typeof GOLDBACK_DENOMINATIONS === 'undefined') return;

  tbody.innerHTML = '';
  // Convert stored USD prices to display currency for the input fields (STACK-50)
  const fxRate = (typeof getExchangeRate === 'function') ? getExchangeRate() : 1;
  for (const d of GOLDBACK_DENOMINATIONS) {
    const key = String(d.weight);
    const entry = goldbackPrices[key];
    const usdPrice = entry ? entry.price : '';
    const displayPrice = (usdPrice !== '' && fxRate !== 1) ? (usdPrice * fxRate).toFixed(2) : usdPrice;
    let updatedAt = entry && entry.updatedAt
      ? new Date(entry.updatedAt).toLocaleString()
      : '\u2014';
    if (goldbackEstimateEnabled && entry && entry.updatedAt) {
      updatedAt += ' (auto)';
    }

    const tr = document.createElement('tr');
    tr.dataset.denom = key;
    // nosemgrep: javascript.browser.security.insecure-innerhtml.insecure-innerhtml, javascript.browser.security.insecure-document-method.insecure-document-method
    tr.innerHTML = `
      <td>${d.label}</td>
      <td>${d.goldOz} oz</td>
      <td><span class="gb-denom-symbol" style="margin-right:2px;">${typeof getCurrencySymbol === 'function' ? getCurrencySymbol() : '$'}</span><input type="number" min="0" step="0.01" value="${displayPrice}" style="width:80px;" /></td>
      <td style="font-size:0.85em;color:var(--text-secondary);">${updatedAt}</td>
    `;
    tbody.appendChild(tr);
  }

  // Update Quick Fill currency symbol (STACK-50)
  const gbQfSymbol = document.getElementById('gbQuickFillSymbol');
  if (gbQfSymbol && typeof getCurrencySymbol === 'function') {
    gbQfSymbol.textContent = getCurrencySymbol();
  }
};

// =============================================================================
// HEADER TOGGLE & LAYOUT VISIBILITY (STACK-54)
// =============================================================================

/**
 * Syncs the header shortcut checkboxes in Settings with stored state.
 */
const syncHeaderToggleUI = () => {
  const themeVisible = localStorage.getItem('headerThemeBtnVisible') !== 'false';
  const currencyVisible = localStorage.getItem('headerCurrencyBtnVisible') !== 'false';

  const themeCb = document.getElementById('settingsHeaderThemeBtn');
  const currencyCb = document.getElementById('settingsHeaderCurrencyBtn');
  if (themeCb) themeCb.checked = themeVisible;
  if (currencyCb) currencyCb.checked = currencyVisible;

  applyHeaderToggleVisibility();
};

/**
 * Shows/hides the header shortcut buttons based on stored preferences.
 * Default is visible (true) unless explicitly set to 'false'.
 */
const applyHeaderToggleVisibility = () => {
  const themeVisible = localStorage.getItem('headerThemeBtnVisible') !== 'false';
  const currencyVisible = localStorage.getItem('headerCurrencyBtnVisible') !== 'false';

  if (elements.headerThemeBtn) {
    elements.headerThemeBtn.style.display = themeVisible ? '' : 'none';
  }
  if (elements.headerCurrencyBtn) {
    elements.headerCurrencyBtn.style.display = currencyVisible ? '' : 'none';
  }
};
window.applyHeaderToggleVisibility = applyHeaderToggleVisibility;

/**
 * Syncs layout section config table in Settings and applies layout order.
 */
const syncLayoutVisibilityUI = () => {
  renderLayoutSectionConfigTable();
  applyLayoutOrder();
};

/**
 * Renders the layout section config table in Settings > Layout.
 * Each row has a checkbox (enable/disable) and up/down arrows for reordering.
 */
const renderLayoutSectionConfigTable = () => {
  const container = document.getElementById('layoutSectionConfigContainer');
  if (!container || typeof getLayoutSectionConfig !== 'function') return;

  const config = getLayoutSectionConfig();
  container.textContent = '';

  if (!config.length) {
    const empty = document.createElement('div');
    empty.className = 'chip-grouping-empty';
    empty.textContent = 'No sections available';
    container.appendChild(empty);
    return;
  }

  const table = document.createElement('table');
  table.className = 'chip-grouping-table';
  const tbody = document.createElement('tbody');

  config.forEach((section, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.sectionId = section.id;

    // Checkbox cell
    const tdCheck = document.createElement('td');
    tdCheck.style.cssText = 'width:2rem;text-align:center';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = section.enabled;
    cb.className = 'inline-chip-toggle';
    cb.title = 'Toggle ' + section.label;
    cb.addEventListener('change', () => {
      const cfg = getLayoutSectionConfig();
      const item = cfg.at(idx);
      if (item) {
        item.enabled = cb.checked;
        saveLayoutSectionConfig(cfg);
        applyLayoutOrder();
      }
    });
    tdCheck.appendChild(cb);

    // Label cell
    const tdLabel = document.createElement('td');
    tdLabel.textContent = section.label;

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
        const cfg = getLayoutSectionConfig();
        const j = dir === 'up' ? idx - 1 : idx + 1;
        if (j < 0 || j >= cfg.length) return;
        const moved = cfg.splice(idx, 1).at(0);
        cfg.splice(j, 0, moved);
        saveLayoutSectionConfig(cfg);
        renderLayoutSectionConfigTable();
        applyLayoutOrder();
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
 * Shows/hides and reorders major page sections based on layout section config.
 * Reads from localStorage and applies both visibility and DOM order.
 */
const applyLayoutOrder = () => {
  const config = getLayoutSectionConfig();
  const sectionMap = {
    spotPrices: elements.spotPricesSection,
    totals:     elements.totalsSectionEl,
    search:     elements.searchSectionEl,
    table:      elements.tableSectionEl,
  };
  const container = document.querySelector('.container');
  if (!container) return;

  for (const section of config) {
    const el = sectionMap[section.id];
    if (!el) continue;
    el.style.display = section.enabled ? '' : 'none';
    container.append(el);
  }
};
const applyLayoutVisibility = applyLayoutOrder;
window.applyLayoutVisibility = applyLayoutVisibility;
window.applyLayoutOrder = applyLayoutOrder;

/**
 * Toggles the floating currency picker dropdown anchored to the header button.
 * Creates the dropdown lazily on first use; subsequent calls toggle visibility.
 */
const toggleCurrencyDropdown = () => {
  const btn = document.getElementById('headerCurrencyBtn');
  if (!btn) return;

  // If dropdown already open, close it
  const existing = document.getElementById('headerCurrencyDropdown');
  if (existing) {
    closeCurrencyDropdown();
    return;
  }

  // Build dropdown
  const dropdown = document.createElement('div');
  dropdown.id = 'headerCurrencyDropdown';
  dropdown.className = 'header-currency-dropdown';

  const currentCode = displayCurrency || 'USD';

  SUPPORTED_CURRENCIES.forEach(c => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'header-currency-item';
    if (c.code === currentCode) item.classList.add('active');

    const symbol = getCurrencySymbol(c.code);
    item.textContent = `${symbol}  ${c.code} — ${c.name}`;

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      saveDisplayCurrency(c.code);
      if (typeof renderTable === 'function') renderTable();
      if (typeof updateSummary === 'function') updateSummary();
      if (typeof updateAllSparklines === 'function') updateAllSparklines();
      if (typeof syncGoldbackSettingsUI === 'function') syncGoldbackSettingsUI();
      // Sync settings dropdown if open
      const sel = document.getElementById('settingsDisplayCurrency');
      if (sel) sel.value = c.code;
      closeCurrencyDropdown();
    });

    dropdown.appendChild(item);
  });

  // Position below button
  document.body.appendChild(dropdown);
  const rect = btn.getBoundingClientRect();
  dropdown.style.top = (rect.bottom + 4) + 'px';
  // Align right edge of dropdown with right edge of button
  dropdown.style.right = (window.innerWidth - rect.right) + 'px';

  // Close on outside click; header button click already stops propagation
  document.addEventListener('click', closeCurrencyDropdownOnOutside);
};

/** Closes the currency dropdown and removes the outside-click listener. */
const closeCurrencyDropdown = () => {
  const el = document.getElementById('headerCurrencyDropdown');
  if (el) el.remove();
  document.removeEventListener('click', closeCurrencyDropdownOnOutside);
};

/** Click-outside handler for the currency dropdown. */
const closeCurrencyDropdownOnOutside = (e) => {
  const dropdown = document.getElementById('headerCurrencyDropdown');
  const btn = elements.headerCurrencyBtn;
  if (dropdown && !dropdown.contains(e.target) && e.target !== btn) {
    closeCurrencyDropdown();
  }
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
  window.renderLayoutSectionConfigTable = renderLayoutSectionConfigTable;
  window.setupProviderTabDrag = setupProviderTabDrag;
  window.loadProviderTabOrder = loadProviderTabOrder;
  window.saveProviderTabOrder = saveProviderTabOrder;
  window.syncGoldbackSettingsUI = syncGoldbackSettingsUI;
  window.syncCurrencySettingsUI = syncCurrencySettingsUI;
  window.syncHeaderToggleUI = syncHeaderToggleUI;
  window.syncLayoutVisibilityUI = syncLayoutVisibilityUI;
}

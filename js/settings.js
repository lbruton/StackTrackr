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

  // Render Numista bulk sync UI when switching to Numista tab (STACK-87/88)
  if (key === 'NUMISTA' && typeof renderNumistaSyncUI === 'function') {
    const syncGroup = document.getElementById('numistaBulkSyncGroup');
    if (syncGroup && syncGroup.style.display !== 'none') {
      renderNumistaSyncUI();
    }
  }
};

/**
 * Switches the visible log sub-tab in the Activity Log panel.
 * Re-renders the tab content on every switch to ensure fresh data.
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

  // Always re-render to show fresh data
  renderLogTab(key);
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

  // Numista name matching — sync toggle with feature flag
  const numistaLookupSetting = document.getElementById('settingsNumistaLookup');
  if (numistaLookupSetting && window.featureFlags) {
    const nlVal = featureFlags.isEnabled('NUMISTA_SEARCH_LOOKUP') ? 'yes' : 'no';
    numistaLookupSetting.querySelectorAll('.chip-sort-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === nlVal);
    });
  }

  // Numista lookup rule tables
  renderSeedRuleTable();
  renderCustomRuleTable();

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

  // Numista bulk sync visibility (STACK-87/88)
  const numistaSyncGroup = document.getElementById('numistaBulkSyncGroup');
  if (numistaSyncGroup) {
    const showBulkSync = window.featureFlags?.isEnabled('COIN_IMAGES') &&
                         window.imageCache?.isAvailable();
    numistaSyncGroup.style.display = showBulkSync ? '' : 'none';
  }

  // Display timezone (STACK-63)
  const tzSelect = document.getElementById('settingsTimezone');
  if (tzSelect) {
    tzSelect.value = localStorage.getItem(TIMEZONE_KEY) || 'auto';
  }

  // Spot compare mode (STACK-92)
  const spotCompareSelect = document.getElementById('settingsSpotCompareMode');
  if (spotCompareSelect) {
    spotCompareSelect.value = localStorage.getItem(SPOT_COMPARE_MODE_KEY) || 'close-close';
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
const updateSettingsFooter = async () => {
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
    const lsMb = (totalBytes / (1024 * 1024)).toFixed(2);
    storageText = `LS: ${lsMb} MB / 5 MB`;

    // Append IndexedDB usage if available
    if (window.imageCache?.isAvailable()) {
      try {
        const idbUsage = await imageCache.getStorageUsage();
        const idbMb = (idbUsage.totalBytes / (1024 * 1024)).toFixed(2);
        const idbLimit = (idbUsage.limitBytes / (1024 * 1024)).toFixed(0);
        storageText += `  \u00b7  IDB: ${idbMb} MB / ${idbLimit} MB`;
      } catch { /* ignore */ }
    }
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

  // Display timezone (STACK-63)
  const tzSelect = document.getElementById('settingsTimezone');
  if (tzSelect) {
    tzSelect.addEventListener('change', () => {
      localStorage.setItem(TIMEZONE_KEY, tzSelect.value);
      // Timestamps appear across many sections (spot cards, change log, API status, etc.)
      // A full reload ensures all timestamp-driven UI picks up the new timezone
      window.location.reload();
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

  // Spot compare mode (STACK-92)
  const spotCompareSetting = document.getElementById('settingsSpotCompareMode');
  if (spotCompareSetting) {
    spotCompareSetting.addEventListener('change', () => {
      try { localStorage.setItem(SPOT_COMPARE_MODE_KEY, spotCompareSetting.value); } catch (e) { /* ignore */ }
      if (typeof updateAllSparklines === 'function') updateAllSparklines();
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

  // Numista name matching toggle
  const numistaLookupSettingEl = document.getElementById('settingsNumistaLookup');
  if (numistaLookupSettingEl) {
    numistaLookupSettingEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip-sort-btn');
      if (!btn) return;
      const isEnabled = btn.dataset.val === 'yes';
      if (window.featureFlags) {
        if (isEnabled) featureFlags.enable('NUMISTA_SEARCH_LOOKUP');
        else featureFlags.disable('NUMISTA_SEARCH_LOOKUP');
      }
      numistaLookupSettingEl.querySelectorAll('.chip-sort-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.val === btn.dataset.val);
      });
    });
  }

  // Numista view modal field toggles
  const numistaViewContainer = document.getElementById('numistaViewFieldToggles');
  if (numistaViewContainer) {
    // Load saved state and apply to checkboxes
    const nfConfig = typeof getNumistaViewFieldConfig === 'function' ? getNumistaViewFieldConfig() : {};
    numistaViewContainer.querySelectorAll('input[data-nf]').forEach(cb => {
      const field = cb.dataset.nf;
      if (nfConfig[field] !== undefined) cb.checked = nfConfig[field];
    });
    // Save on change
    numistaViewContainer.addEventListener('change', () => {
      const config = {};
      numistaViewContainer.querySelectorAll('input[data-nf]').forEach(cb => {
        config[cb.dataset.nf] = cb.checked;
      });
      if (typeof saveNumistaViewFieldConfig === 'function') saveNumistaViewFieldConfig(config);
    });
  }

  // Add Numista lookup rule button
  const addNumistaRuleBtn = document.getElementById('addNumistaRuleBtn');
  if (addNumistaRuleBtn) {
    addNumistaRuleBtn.addEventListener('click', () => {
      const patternInput = document.getElementById('numistaRulePatternInput');
      const replacementInput = document.getElementById('numistaRuleReplacementInput');
      const idInput = document.getElementById('numistaRuleIdInput');
      if (!patternInput || !replacementInput) return;

      const pattern = patternInput.value.trim();
      const replacement = replacementInput.value.trim();
      const numistaId = idInput ? idInput.value.trim() : '';

      if (!pattern || !replacement) {
        alert('Pattern and Numista query are required.');
        return;
      }

      if (!window.NumistaLookup) return;
      const result = NumistaLookup.addRule(pattern, replacement, numistaId || null);
      if (!result.success) {
        alert(result.error);
        return;
      }

      patternInput.value = '';
      replacementInput.value = '';
      if (idInput) idInput.value = '';
      renderCustomRuleTable();
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

  // Numista Bulk Sync inline controls (STACK-87/88)
  const nsStartBtn = document.getElementById('numistaSyncStartBtn');
  if (nsStartBtn) {
    nsStartBtn.addEventListener('click', () => {
      if (typeof startBulkSync === 'function') startBulkSync();
    });
  }
  const nsCancelBtn = document.getElementById('numistaSyncCancelBtn');
  if (nsCancelBtn) {
    nsCancelBtn.addEventListener('click', () => {
      if (window.BulkImageCache) BulkImageCache.abort();
      nsCancelBtn.style.display = 'none';
    });
  }
  const nsClearBtn = document.getElementById('numistaSyncClearBtn');
  if (nsClearBtn) {
    nsClearBtn.addEventListener('click', () => {
      if (typeof clearAllCachedData === 'function') clearAllCachedData();
    });
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

  // Provider priority dropdowns (STACK-90)
  setupProviderPriority();
};

/**
 * One-time migration from legacy apiProviderOrder + syncMode to priority numbers (STACK-90).
 * Maps first "always" provider → 1, remaining providers → 2,3 in order, disabled → 0.
 * @returns {Object} Priority map { METALS_DEV: 1, METALS_API: 2, ... }
 */
const migrateProviderPriority = () => {
  const priorities = {};
  const metalsProviders = Object.keys(API_PROVIDERS);
  let order;
  try {
    const stored = localStorage.getItem('apiProviderOrder');
    order = stored ? JSON.parse(stored) : null;
  } catch (e) { /* ignore */ }
  if (!Array.isArray(order) || order.length === 0) {
    order = metalsProviders;
  }

  // Read legacy sync modes
  let syncModes = {};
  try {
    const cfg = loadApiConfig();
    syncModes = cfg.syncMode || {};
  } catch (e) { /* ignore */ }

  let nextPriority = 1;
  // First pass: assign based on legacy order + sync mode
  order.forEach(prov => {
    if (!metalsProviders.includes(prov)) return;
    const mode = syncModes[prov] || 'always';
    if (mode === 'backup' && nextPriority === 1) {
      // All backup = assign sequentially starting at 2
      priorities[prov] = nextPriority++;
    } else {
      priorities[prov] = nextPriority++;
    }
  });

  // Ensure any providers not in legacy order get a priority
  metalsProviders.forEach(prov => {
    if (!(prov in priorities)) {
      priorities[prov] = nextPriority++;
    }
  });

  saveProviderPriorities(priorities);
  return priorities;
};

/**
 * Loads provider priority map from localStorage.
 * Falls back to migration if not found.
 * @returns {Object} Priority map { METALS_DEV: 1, METALS_API: 2, ... }
 */
const loadProviderPriorities = () => {
  try {
    const stored = localStorage.getItem('providerPriority');
    if (stored) {
      const priorities = JSON.parse(stored);
      if (typeof priorities === 'object' && priorities !== null) return priorities;
    }
  } catch (e) { /* ignore */ }
  return migrateProviderPriority();
};

/**
 * Saves provider priority map and writes backward-compatible apiProviderOrder (STACK-90).
 * @param {Object} priorities - { METALS_DEV: 1, METALS_API: 2, ... }
 */
const saveProviderPriorities = (priorities) => {
  try {
    localStorage.setItem('providerPriority', JSON.stringify(priorities));
    // Backward compatibility: write apiProviderOrder sorted by priority (non-disabled only)
    const sorted = Object.entries(priorities)
      .filter(([, p]) => p > 0)
      .sort((a, b) => a[1] - b[1])
      .map(([prov]) => prov);
    localStorage.setItem('apiProviderOrder', JSON.stringify(sorted));
  } catch (e) { /* ignore */ }
};

/**
 * Sets all priority <select> values from a priority map.
 * @param {Object} priorities - { METALS_DEV: 1, ... }
 */
const syncProviderPriorityUI = (priorities) => {
  Object.entries(priorities).forEach(([prov, val]) => {
    const sel = document.getElementById(`providerPriority_${prov}`);
    if (sel) sel.value = String(val);
  });
};

/**
 * Sets up change listeners on provider priority selects (STACK-90).
 * Auto-shifts: setting provider X to priority N bumps any existing N holder to N+1 (cascade).
 */
const setupProviderPriority = () => {
  const selects = document.querySelectorAll('.provider-priority-select');
  if (!selects.length) return;

  selects.forEach(sel => {
    sel.addEventListener('change', () => {
      const provider = sel.dataset.provider;
      const newVal = parseInt(sel.value, 10);
      const priorities = loadProviderPriorities();

      if (newVal === 0) {
        // Disabled — just set it
        priorities[provider] = 0;
      } else {
        // Auto-shift: bump any provider already at this priority
        const oldVal = priorities[provider];
        Object.keys(priorities).forEach(prov => {
          if (prov !== provider && priorities[prov] === newVal && priorities[prov] > 0) {
            // Cascade: shift this one to the old slot (or next available)
            priorities[prov] = oldVal > 0 ? oldVal : newVal + 1;
          }
        });
        priorities[provider] = newVal;
      }

      saveProviderPriorities(priorities);
      syncProviderPriorityUI(priorities);
      if (typeof autoSelectDefaultProvider === 'function') {
        autoSelectDefaultProvider();
      }
    });
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
 * Renders the built-in (seed) Numista lookup rules as a read-only table.
 */
const renderSeedRuleTable = () => {
  const container = document.getElementById('seedRuleTableContainer');
  if (!container || !window.NumistaLookup) return;

  const rules = NumistaLookup.listSeedRules();
  const countBadge = document.getElementById('seedRuleCount');
  if (countBadge) countBadge.textContent = `(${rules.length})`;

  container.textContent = '';
  if (!rules.length) {
    const empty = document.createElement('div');
    empty.className = 'chip-grouping-empty';
    empty.textContent = 'No built-in patterns';
    container.appendChild(empty);
    return;
  }

  const table = document.createElement('table');
  table.className = 'chip-grouping-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Pattern', 'Numista Query', 'N#'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    th.style.cssText = 'font-size:0.75rem;font-weight:normal;opacity:0.6;padding:0.2rem 0.4rem';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const esc = typeof escapeHtml === 'function' ? escapeHtml : (s) => s;
  for (const rule of rules) {
    const tr = document.createElement('tr');

    const tdPattern = document.createElement('td');
    tdPattern.style.cssText = 'font-family:monospace;font-size:0.8rem;word-break:break-all';
    tdPattern.textContent = rule.pattern;

    const tdReplacement = document.createElement('td');
    tdReplacement.textContent = rule.replacement;

    const tdId = document.createElement('td');
    tdId.style.cssText = 'font-size:0.85rem;opacity:0.7;white-space:nowrap';
    tdId.textContent = rule.numistaId || '\u2014';

    tr.append(tdPattern, tdReplacement, tdId);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  container.appendChild(table);
};

/**
 * Renders the custom Numista lookup rules table with delete buttons.
 */
const renderCustomRuleTable = () => {
  const container = document.getElementById('customRuleTableContainer');
  if (!container || !window.NumistaLookup) return;

  const rules = NumistaLookup.listCustomRules();
  container.textContent = '';

  if (!rules.length) {
    const empty = document.createElement('div');
    empty.className = 'chip-grouping-empty';
    empty.textContent = 'No custom patterns';
    container.appendChild(empty);
    return;
  }

  const table = document.createElement('table');
  table.className = 'chip-grouping-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Pattern', 'Numista Query', 'N#', ''].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    th.style.cssText = 'font-size:0.75rem;font-weight:normal;opacity:0.6;padding:0.2rem 0.4rem';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const rule of rules) {
    const tr = document.createElement('tr');

    const tdPattern = document.createElement('td');
    tdPattern.style.cssText = 'font-family:monospace;font-size:0.8rem;word-break:break-all';
    tdPattern.textContent = rule.pattern;

    const tdReplacement = document.createElement('td');
    tdReplacement.textContent = rule.replacement;

    const tdId = document.createElement('td');
    tdId.style.cssText = 'font-size:0.85rem;opacity:0.7;white-space:nowrap';
    tdId.textContent = rule.numistaId || '\u2014';

    const tdDelete = document.createElement('td');
    tdDelete.style.cssText = 'width:2rem;text-align:center';
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'inline-chip-move';
    delBtn.textContent = '\u2715';
    delBtn.title = 'Delete rule';
    delBtn.addEventListener('click', () => {
      NumistaLookup.removeRule(rule.id);
      renderCustomRuleTable();
    });
    tdDelete.appendChild(delBtn);

    tr.append(tdPattern, tdReplacement, tdId, tdDelete);
    tbody.appendChild(tr);
  }

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
      ? (typeof formatTimestamp === 'function' ? formatTimestamp(entry.updatedAt) : new Date(entry.updatedAt).toLocaleString())
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
  window.renderSeedRuleTable = renderSeedRuleTable;
  window.renderCustomRuleTable = renderCustomRuleTable;
}

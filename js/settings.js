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

  // Populate Images data and sync toggles when switching to Images section (STACK-96)
  if (name === 'images') {
    syncChipToggle('tableImagesToggle', localStorage.getItem('tableImagesEnabled') !== 'false');
    syncChipToggle('numistaOverrideToggle', localStorage.getItem('numistaOverridePersonal') === 'true');
    const sidesSync = safeGetElement('tableImageSidesToggle');
    if (sidesSync) {
      const curSides = localStorage.getItem('tableImageSides') || 'both';
      sidesSync.querySelectorAll('.chip-sort-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.val === curSides));
    }
    populateImagesSection();
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
  const ippSelect = safeGetElement('settingsItemsPerPage');
  if (ippSelect) {
    ippSelect.value = itemsPerPage === Infinity ? 'all' : String(itemsPerPage);
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

  // Card style (STAK-118)
  const cardStyleSelect = document.getElementById('settingsCardStyle');
  if (cardStyleSelect) {
    cardStyleSelect.value = localStorage.getItem(CARD_STYLE_KEY) || 'A';
  }

  // Desktop card view toggle (STAK-118)
  const desktopCardToggle = document.getElementById('settingsDesktopCardView');
  if (desktopCardToggle) {
    const dcVal = localStorage.getItem(DESKTOP_CARD_VIEW_KEY) === 'true' ? 'yes' : 'no';
    desktopCardToggle.querySelectorAll('.chip-sort-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === dcVal);
    });
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
 * Wires a yes/no chip toggle to a feature flag.
 * Handles click delegation, flag enable/disable, active-class sync,
 * optional mirror element sync, and optional callback.
 *
 * @param {string} elementId - DOM id of the toggle container
 * @param {string} flagName - Feature flag key (e.g. 'GROUPED_NAME_CHIPS')
 * @param {Object} [opts]
 * @param {string} [opts.syncId] - DOM id of a mirror toggle to keep in sync
 * @param {Function} [opts.onApply] - Called after toggle with (isEnabled) arg
 */
const wireFeatureFlagToggle = (elementId, flagName, opts = {}) => {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip-sort-btn');
    if (!btn) return;
    const isEnabled = btn.dataset.val === 'yes';
    if (window.featureFlags) {
      if (isEnabled) featureFlags.enable(flagName);
      else featureFlags.disable(flagName);
    }
    el.querySelectorAll('.chip-sort-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.val === btn.dataset.val);
    });
    if (opts.syncId) {
      const syncEl = document.getElementById(opts.syncId);
      if (syncEl) syncEl.querySelectorAll('.chip-sort-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.val === btn.dataset.val);
      });
    }
    if (opts.onApply) opts.onApply(isEnabled);
  });
};
window.wireFeatureFlagToggle = wireFeatureFlagToggle;

/**
 * Syncs a chip-sort-toggle's active state from a boolean value.
 * @param {string} elementId - DOM id of the .chip-sort-toggle container
 * @param {boolean} isOn - Whether the 'yes' button should be active
 */
const syncChipToggle = (elementId, isOn) => {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.querySelectorAll('.chip-sort-btn').forEach(btn => {
    const btnIsYes = btn.dataset.val === 'yes';
    btn.classList.toggle('active', isOn ? btnIsYes : !btnIsYes);
  });
};

/**
 * Wires a yes/no chip toggle to a raw localStorage key (not a feature flag).
 * Handles click delegation, localStorage read/write, active-class sync, and optional callback.
 *
 * @param {string} elementId - DOM id of the toggle container
 * @param {string} storageKey - localStorage key to read/write ('true'/'false')
 * @param {Object} [opts]
 * @param {boolean} [opts.defaultVal=false] - Default value when no localStorage entry exists
 * @param {Function} [opts.onApply] - Called after toggle with (isEnabled) arg
 */
const wireStorageToggle = (elementId, storageKey, opts = {}) => {
  const el = document.getElementById(elementId);
  if (!el) return;
  // Set initial state
  const defaultVal = opts.defaultVal ?? false;
  const stored = localStorage.getItem(storageKey);
  const isOn = stored !== null ? stored === 'true' : defaultVal;
  syncChipToggle(elementId, isOn);

  el.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip-sort-btn');
    if (!btn) return;
    const isEnabled = btn.dataset.val === 'yes';
    localStorage.setItem(storageKey, isEnabled ? 'true' : 'false');
    syncChipToggle(elementId, isEnabled);
    if (opts.onApply) opts.onApply(isEnabled);
  });
};
window.wireStorageToggle = wireStorageToggle;
window.syncChipToggle = syncChipToggle;

/**
 * Wires a chip sort order toggle (alpha/count) with bidirectional sync.
 *
 * @param {string} elementId - DOM id of the toggle container
 * @param {string} [syncId] - DOM id of a mirror toggle to keep in sync
 */
const wireChipSortToggle = (elementId, syncId) => {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip-sort-btn');
    if (!btn) return;
    const val = btn.dataset.sort;
    localStorage.setItem('chipSortOrder', val);
    el.querySelectorAll('.chip-sort-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.sort === val);
    });
    if (syncId) {
      const syncEl = document.getElementById(syncId);
      if (syncEl) syncEl.querySelectorAll('.chip-sort-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.sort === val);
      });
    }
    if (typeof renderActiveFilters === 'function') renderActiveFilters();
  });
};
window.wireChipSortToggle = wireChipSortToggle;

// STAK-135:
// setupSettingsEventListeners() moved to js/settings-listeners.js to keep
// listener wiring split by settings tab/concern.

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

  // Ensure STAKTRAKR is always rank 1 for fresh migrations
  if (priorities.STAKTRAKR && priorities.STAKTRAKR !== 1) {
    const currentRank1 = Object.entries(priorities).find(([, p]) => p === 1);
    if (currentRank1) priorities[currentRank1[0]] = priorities.STAKTRAKR;
    priorities.STAKTRAKR = 1;
  }

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
      if (typeof priorities === 'object' && priorities !== null) {
        // Inject STAKTRAKR at rank 1 for existing users upgrading
        if (!('STAKTRAKR' in priorities)) {
          Object.keys(priorities).forEach(prov => {
            if (priorities[prov] > 0) priorities[prov]++;
          });
          priorities.STAKTRAKR = 1;
          saveProviderPriorities(priorities);
        }
        return priorities;
      }
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
 * Delegates to the generic _renderSectionConfigTable helper.
 */
const renderInlineChipConfigTable = () => _renderSectionConfigTable({
  containerId: 'inlineChipConfigContainer',
  getConfig: getInlineChipConfig,
  saveConfig: saveInlineChipConfig,
  emptyText: 'No chip types available',
  onApply: typeof renderTable === 'function' ? renderTable : null,
  onRender: () => renderInlineChipConfigTable(),
});

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
 * Renders the built-in (seed) Numista lookup rules table with enable/disable toggles.
 */
const renderSeedRuleTable = () => {
  const container = document.getElementById('seedRuleTableContainer');
  if (!container || !window.NumistaLookup) return;

  const rules = NumistaLookup.listSeedRules();
  const enabledCount = typeof NumistaLookup.getEnabledSeedRuleCount === 'function'
    ? NumistaLookup.getEnabledSeedRuleCount() : rules.length;
  const countBadge = document.getElementById('seedRuleCount');
  if (countBadge) countBadge.textContent = `(${enabledCount}/${rules.length})`;

  container.textContent = '';
  if (!rules.length) {
    const empty = document.createElement('div');
    empty.className = 'chip-grouping-empty';
    empty.textContent = 'No built-in patterns';
    container.appendChild(empty);
    return;
  }

  // Bulk toggle buttons
  const btnBar = document.createElement('div');
  btnBar.style.cssText = 'display:flex;gap:0.5rem;margin-bottom:0.5rem';

  const enableAllBtn = document.createElement('button');
  enableAllBtn.type = 'button';
  enableAllBtn.className = 'btn';
  enableAllBtn.textContent = 'Enable All';
  enableAllBtn.style.cssText = 'font-size:0.75rem;padding:0.2rem 0.6rem';
  enableAllBtn.addEventListener('click', () => {
    NumistaLookup.setAllSeedRulesEnabled(true);
    renderSeedRuleTable();
  });

  const disableAllBtn = document.createElement('button');
  disableAllBtn.type = 'button';
  disableAllBtn.className = 'btn';
  disableAllBtn.textContent = 'Disable All';
  disableAllBtn.style.cssText = 'font-size:0.75rem;padding:0.2rem 0.6rem';
  disableAllBtn.addEventListener('click', () => {
    NumistaLookup.setAllSeedRulesEnabled(false);
    renderSeedRuleTable();
  });

  btnBar.append(enableAllBtn, disableAllBtn);
  container.appendChild(btnBar);

  const table = document.createElement('table');
  table.className = 'chip-grouping-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Enabled', 'Pattern', 'Numista Query', 'N#'].forEach(text => {
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

    // Enabled checkbox
    const tdEnabled = document.createElement('td');
    tdEnabled.style.cssText = 'width:2.5rem;text-align:center';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = typeof NumistaLookup.isSeedRuleEnabled === 'function'
      ? NumistaLookup.isSeedRuleEnabled(rule.id) : true;
    cb.title = 'Toggle ' + rule.id;
    cb.addEventListener('change', () => {
      if (typeof NumistaLookup.setSeedRuleEnabled === 'function') {
        NumistaLookup.setSeedRuleEnabled(rule.id, cb.checked);
      }
      // Update count badge
      const newCount = typeof NumistaLookup.getEnabledSeedRuleCount === 'function'
        ? NumistaLookup.getEnabledSeedRuleCount() : rules.length;
      if (countBadge) countBadge.textContent = `(${newCount}/${rules.length})`;
    });
    tdEnabled.appendChild(cb);

    const tdPattern = document.createElement('td');
    tdPattern.style.cssText = 'font-family:monospace;font-size:0.8rem;word-break:break-all';
    tdPattern.textContent = rule.pattern;

    const tdReplacement = document.createElement('td');
    tdReplacement.textContent = rule.replacement;

    const tdId = document.createElement('td');
    tdId.style.cssText = 'font-size:0.85rem;opacity:0.7;white-space:nowrap';
    tdId.textContent = rule.numistaId || '\u2014';

    tr.append(tdEnabled, tdPattern, tdReplacement, tdId);
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
  const themeVisible = localStorage.getItem('headerThemeBtnVisible') === 'true';
  const currencyVisible = localStorage.getItem('headerCurrencyBtnVisible') === 'true';
  const trendStored = localStorage.getItem(HEADER_TREND_BTN_KEY);
  const trendVisible = trendStored !== null ? trendStored === 'true' : true;
  const syncStored = localStorage.getItem(HEADER_SYNC_BTN_KEY);
  const syncVisible = syncStored !== null ? syncStored === 'true' : true;

  syncChipToggle('settingsHeaderThemeBtn', themeVisible);
  syncChipToggle('settingsHeaderThemeBtn_hdr', themeVisible);
  syncChipToggle('settingsHeaderCurrencyBtn', currencyVisible);
  syncChipToggle('settingsHeaderCurrencyBtn_hdr', currencyVisible);
  syncChipToggle('settingsHeaderTrendBtn', trendVisible);
  syncChipToggle('settingsHeaderTrendBtn_hdr', trendVisible);
  syncChipToggle('settingsHeaderSyncBtn', syncVisible);
  syncChipToggle('settingsHeaderSyncBtn_hdr', syncVisible);

  applyHeaderToggleVisibility();
};

/**
 * Shows/hides the header shortcut buttons based on stored preferences.
 * Theme and Currency default hidden; Trend and Sync default visible.
 */
const applyHeaderToggleVisibility = () => {
  const themeVisible = localStorage.getItem('headerThemeBtnVisible') === 'true';
  const currencyVisible = localStorage.getItem('headerCurrencyBtnVisible') === 'true';
  const trendStored = localStorage.getItem(HEADER_TREND_BTN_KEY);
  const trendVisible = trendStored !== null ? trendStored === 'true' : true;
  const syncStored = localStorage.getItem(HEADER_SYNC_BTN_KEY);
  const syncVisible = syncStored !== null ? syncStored === 'true' : true;

  if (elements.headerThemeBtn) {
    elements.headerThemeBtn.style.display = themeVisible ? '' : 'none';
  }
  if (elements.headerCurrencyBtn) {
    elements.headerCurrencyBtn.style.display = currencyVisible ? '' : 'none';
  }
  safeGetElement('headerTrendBtn').style.display = trendVisible ? '' : 'none';
  safeGetElement('headerSyncBtn').style.display = syncVisible ? '' : 'none';
};
window.applyHeaderToggleVisibility = applyHeaderToggleVisibility;

/**
 * Syncs layout section config table in Settings and applies layout order.
 */
const syncLayoutVisibilityUI = () => {
  renderLayoutSectionConfigTable();
  renderViewModalSectionConfigTable();
  renderMetalOrderConfigTable();
  renderInlineChipConfigTable();
  applyLayoutOrder();
};

/**
 * Generic section-config table renderer.
 * Builds a checkbox + arrow reorder table for any {id, label, enabled}[] config.
 *
 * @param {Object} opts
 * @param {string} opts.containerId - DOM id of the container element
 * @param {function} opts.getConfig - Returns the current config array
 * @param {function} opts.saveConfig - Persists the updated config array
 * @param {string} [opts.emptyText] - Text shown when config is empty (default: 'No sections available')
 * @param {function} [opts.onApply] - Called after every change (e.g. applyLayoutOrder)
 * @param {function} [opts.onRender] - Called to re-render after reorder (defaults to self)
 */
const _renderSectionConfigTable = (opts) => {
  const container = document.getElementById(opts.containerId);
  if (!container || typeof opts.getConfig !== 'function') return;

  const config = opts.getConfig();
  container.textContent = '';

  if (!config.length) {
    const empty = document.createElement('div');
    empty.className = 'chip-grouping-empty';
    empty.textContent = opts.emptyText || 'No sections available';
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
      const cfg = opts.getConfig();
      const item = cfg.at(idx);
      if (item) {
        item.enabled = cb.checked;
        opts.saveConfig(cfg);
        if (opts.onApply) opts.onApply();
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
        const cfg = opts.getConfig();
        const j = dir === 'up' ? idx - 1 : idx + 1;
        if (j < 0 || j >= cfg.length) return;
        const moved = cfg.splice(idx, 1).at(0);
        cfg.splice(j, 0, moved);
        opts.saveConfig(cfg);
        (opts.onRender || (() => _renderSectionConfigTable(opts)))();
        if (opts.onApply) opts.onApply();
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

/** Renders the main page layout section config table in Settings > Layout. */
const renderLayoutSectionConfigTable = () => _renderSectionConfigTable({
  containerId: 'layoutSectionConfigContainer',
  getConfig: getLayoutSectionConfig,
  saveConfig: saveLayoutSectionConfig,
  onApply: typeof applyLayoutOrder === 'function' ? applyLayoutOrder : null,
  onRender: () => renderLayoutSectionConfigTable(),
});

/** Renders the view modal section config table in Settings > Layout. */
const renderViewModalSectionConfigTable = () => _renderSectionConfigTable({
  containerId: 'viewModalSectionConfigContainer',
  getConfig: getViewModalSectionConfig,
  saveConfig: saveViewModalSectionConfig,
  onRender: () => renderViewModalSectionConfigTable(),
});

// =============================================================================
// METAL ORDER CONFIG
// =============================================================================

const METAL_ORDER_DEFAULTS = [
  { id: 'silver',    label: 'Silver',     enabled: true },
  { id: 'gold',      label: 'Gold',       enabled: true },
  { id: 'platinum',  label: 'Platinum',   enabled: true },
  { id: 'palladium', label: 'Palladium',  enabled: true },
  { id: 'all',       label: 'All Metals', enabled: true },
];

/**
 * Returns the current metal order config, merging stored data with defaults.
 * New metals added to defaults will be appended to existing stored configs.
 * @returns {Array<{id:string, label:string, enabled:boolean}>}
 */
const getMetalOrderConfig = () => {
  const stored = localStorage.getItem(METAL_ORDER_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Append any new defaults not yet in stored config
      const knownIds = new Set(parsed.map(m => m.id));
      METAL_ORDER_DEFAULTS.filter(m => !knownIds.has(m.id)).forEach(m => parsed.push({ ...m }));
      return parsed;
    } catch (e) { /* fall through to defaults */ }
  }
  return METAL_ORDER_DEFAULTS.map(m => ({ ...m }));
};

const saveMetalOrderConfig = (config) => {
  localStorage.setItem(METAL_ORDER_KEY, JSON.stringify(config));
};

/**
 * Applies metal order config: reorders and shows/hides spot price cards and totals cards.
 */
const applyMetalOrder = () => {
  const config = getMetalOrderConfig();
  const spotGrid     = document.querySelector('.spot-cards-grid');
  const totalsEl     = document.getElementById('totalsCarousel');

  const spotMap = {
    silver:   document.querySelector('.spot-input.silver'),
    gold:     document.querySelector('.spot-input.gold'),
    platinum: document.querySelector('.spot-input.platinum'),
    palladium:document.querySelector('.spot-input.palladium'),
  };
  const totalsMap = {
    silver:   document.querySelector('.total-card.silver'),
    gold:     document.querySelector('.total-card.gold'),
    platinum: document.querySelector('.total-card.platinum'),
    palladium:document.querySelector('.total-card.palladium'),
    all:      document.querySelector('.total-card.total-card-all'),
  };

  config.forEach(({ id, enabled }) => {
    const spotEl = spotMap[id];
    if (spotEl && spotGrid) {
      spotEl.style.display = enabled ? '' : 'none';
      spotGrid.appendChild(spotEl);
    }
    const totalEl = totalsMap[id];
    if (totalEl && totalsEl) {
      totalEl.style.display = enabled ? '' : 'none';
      totalsEl.appendChild(totalEl);
    }
  });

  if (typeof window.refreshTotalsDots === 'function') window.refreshTotalsDots();
};
window.applyMetalOrder = applyMetalOrder;

/** Renders the metal order config table in Settings > Chips. */
const renderMetalOrderConfigTable = () => _renderSectionConfigTable({
  containerId: 'metalOrderConfigContainer',
  getConfig: getMetalOrderConfig,
  saveConfig: saveMetalOrderConfig,
  onApply: applyMetalOrder,
  onRender: () => renderMetalOrderConfigTable(),
});
window.renderMetalOrderConfigTable = renderMetalOrderConfigTable;

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

// =============================================================================
// IMAGES SETTINGS TAB (STACK-96)
// =============================================================================

/**
 * Populate all sub-sections of the Images settings tab.
 */
const populateImagesSection = () => {
  renderImageStorageStats();
  renderCustomPatternRules();
  renderUserImageGrid();
};

/**
 * Create a thumbnail element (img or placeholder) for a given blob URL.
 * @param {string|null} src - Object URL or null
 * @param {string} alt - Alt text
 * @returns {HTMLElement}
 */
const createThumbEl = (src, alt) => {
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.className = 'pattern-rule-thumb';
    return img;
  }
  const placeholder = document.createElement('div');
  placeholder.className = 'pattern-rule-thumb pattern-rule-thumb-empty';
  placeholder.textContent = 'No img';
  return placeholder;
};

/**
 * Render user-created pattern image rules with dual thumbnails, edit, and delete.
 */
const renderCustomPatternRules = async () => {
  const container = document.getElementById('customPatternImageRules');
  if (!container) return;

  if (typeof NumistaLookup === 'undefined') {
    container.innerHTML = '<p style="font-size:0.85em;color:var(--text-secondary)">NumistaLookup not available.</p>';
    return;
  }

  const rules = NumistaLookup.listCustomRules();
  if (!rules.length) {
    container.innerHTML = '<p style="font-size:0.85em;color:var(--text-secondary)">No custom pattern rules yet. Use the form above to add one.</p>';
    return;
  }

  container.textContent = '';

  for (const rule of rules) {
    const row = document.createElement('div');
    row.className = 'pattern-rule-row';

    // Dual thumbnails (obverse + reverse)
    const thumbs = document.createElement('div');
    thumbs.className = 'pattern-rule-thumbs';

    let obverseSrc = null;
    let reverseSrc = null;
    if (rule.seedImageId && window.imageCache?.isAvailable()) {
      try { obverseSrc = await imageCache.getPatternImageUrl(rule.seedImageId, 'obverse'); } catch { /* ignore */ }
      try { reverseSrc = await imageCache.getPatternImageUrl(rule.seedImageId, 'reverse'); } catch { /* ignore */ }
    }
    thumbs.appendChild(createThumbEl(obverseSrc, rule.pattern + ' obverse'));
    thumbs.appendChild(createThumbEl(reverseSrc, rule.pattern + ' reverse'));
    row.appendChild(thumbs);

    // Info
    const info = document.createElement('div');
    info.className = 'pattern-rule-info';
    info.innerHTML = `<div class="rule-pattern">/${rule.pattern}/i</div>
      <div class="rule-replacement">${rule.replacement || '\u2014'}${rule.numistaId ? ' (N#' + rule.numistaId + ')' : ''}</div>`;
    row.appendChild(info);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'pattern-rule-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn';
    editBtn.textContent = 'Edit';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', async () => {
      NumistaLookup.removeRule(rule.id);
      if (rule.seedImageId && window.imageCache?.isAvailable()) {
        await imageCache.deletePatternImage(rule.seedImageId);
      }
      renderCustomPatternRules();
      renderImageStorageStats();
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    row.appendChild(actions);

    // Inline edit form (hidden by default)
    const editForm = document.createElement('div');
    editForm.className = 'pattern-rule-edit-form';
    editForm.style.display = 'none';
    editForm.innerHTML = `
      <div class="edit-form-fields">
        <label>Pattern <input type="text" class="edit-pattern" value="${rule.pattern.replace(/"/g, '&quot;')}" /></label>
        <label>Replacement <input type="text" class="edit-replacement" value="${(rule.replacement || '').replace(/"/g, '&quot;')}" /></label>
        <label>N# <input type="text" class="edit-numista-id" value="${rule.numistaId || ''}" /></label>
        <label>Obverse <input type="file" class="edit-obverse" accept="image/*" /></label>
        <label>Reverse <input type="file" class="edit-reverse" accept="image/*" /></label>
      </div>
      <div class="edit-form-actions">
        <button type="button" class="btn edit-save-btn">Save</button>
        <button type="button" class="btn edit-cancel-btn">Cancel</button>
      </div>`;

    // Toggle edit form
    editBtn.addEventListener('click', () => {
      const isVisible = editForm.style.display !== 'none';
      editForm.style.display = isVisible ? 'none' : 'block';
      editBtn.textContent = isVisible ? 'Edit' : 'Editing...';
    });

    // Cancel
    editForm.querySelector('.edit-cancel-btn').addEventListener('click', () => {
      editForm.style.display = 'none';
      editBtn.textContent = 'Edit';
    });

    // Save
    editForm.querySelector('.edit-save-btn').addEventListener('click', async () => {
      const newPattern = editForm.querySelector('.edit-pattern').value.trim();
      const newReplacement = editForm.querySelector('.edit-replacement').value.trim();
      const newNumistaId = editForm.querySelector('.edit-numista-id').value.trim();

      if (!newPattern || !newReplacement) {
        alert('Pattern and replacement are required.');
        return;
      }

      const result = NumistaLookup.updateRule(rule.id, {
        pattern: newPattern,
        replacement: newReplacement,
        numistaId: newNumistaId || null
      });

      if (!result.success) {
        alert(result.error || 'Failed to update rule.');
        return;
      }

      // Handle new image uploads
      const obvFile = editForm.querySelector('.edit-obverse').files[0];
      const revFile = editForm.querySelector('.edit-reverse').files[0];
      if ((obvFile || revFile) && window.imageCache?.isAvailable()) {
        const ruleId = rule.seedImageId || rule.id;
        const processor = typeof imageProcessor !== 'undefined' ? imageProcessor : null;
        let obvBlob = null;
        let revBlob = null;

        try {
          if (obvFile) {
            obvBlob = processor ? (await processor.processFile(obvFile))?.blob || null : obvFile;
          }
          if (revFile) {
            revBlob = processor ? (await processor.processFile(revFile))?.blob || null : revFile;
          }
        } catch (err) {
          console.error('Image processing failed:', err);
          alert('Failed to process image: ' + err.message);
          return;
        }

        // Preserve existing side when only one side is uploaded
        if (rule.seedImageId && !(obvFile && revFile)) {
          const existing = await imageCache.getPatternImage(rule.seedImageId);
          await imageCache.cachePatternImage(ruleId, obvBlob || existing?.obverse || null, revBlob || existing?.reverse || null);
        } else {
          await imageCache.cachePatternImage(ruleId, obvBlob, revBlob);
        }

        // Ensure seedImageId is set on the rule
        if (!rule.seedImageId) {
          NumistaLookup.updateRule(rule.id, { seedImageId: ruleId });
        }
      }

      renderCustomPatternRules();
      renderImageStorageStats();
    });

    row.appendChild(editForm);
    container.appendChild(row);
  }
};

/**
 * Render storage statistics for the image system.
 */
const renderImageStorageStats = async () => {
  const container = document.getElementById('imageStorageStats');
  if (!container) return;

  if (!window.imageCache?.isAvailable()) {
    container.innerHTML = '<span class="stat-item">IndexedDB unavailable</span>';
    return;
  }

  const usage = await imageCache.getStorageUsage();
  const totalMB = (usage.totalBytes / 1024 / 1024).toFixed(1);
  const limitMB = (usage.limitBytes / 1024 / 1024).toFixed(0);
  const pct = usage.limitBytes > 0 ? ((usage.totalBytes / usage.limitBytes) * 100).toFixed(1) : 0;

  container.innerHTML = `
    <span class="stat-item">Total: ${totalMB} / ${limitMB} MB (${pct}%)</span>
    <span class="stat-item">Numista: ${usage.numistaCount}</span>
    <span class="stat-item">Pattern: ${usage.patternImageCount || 0}</span>
    <span class="stat-item">User: ${usage.userImageCount}</span>
    <span class="stat-item">Metadata: ${usage.metadataCount}</span>
  `;
};

/**
 * Render user-uploaded images as rows with dual thumbnails, edit link, and delete.
 */
const renderUserImageGrid = async () => {
  const container = document.getElementById('userImageGrid');
  if (!container) return;

  if (!window.imageCache?.isAvailable()) {
    container.innerHTML = '<p style="font-size:0.85em;color:var(--text-secondary)">IndexedDB unavailable.</p>';
    return;
  }

  let userImages;
  try {
    userImages = await imageCache.exportAllUserImages();
  } catch {
    container.innerHTML = '<p style="font-size:0.85em;color:var(--text-secondary)">Could not load user images.</p>';
    return;
  }

  if (!userImages?.length) {
    container.innerHTML = '<p style="font-size:0.85em;color:var(--text-secondary)">No user-uploaded images yet.</p>';
    return;
  }

  container.textContent = '';

  for (const rec of userImages) {
    const row = document.createElement('div');
    row.className = 'pattern-rule-row';

    // Dual thumbnails
    const thumbs = document.createElement('div');
    thumbs.className = 'pattern-rule-thumbs';
    let obverseSrc = null;
    let reverseSrc = null;
    if (rec.obverse) { try { obverseSrc = URL.createObjectURL(rec.obverse); } catch { /* ignore */ } }
    if (rec.reverse) { try { reverseSrc = URL.createObjectURL(rec.reverse); } catch { /* ignore */ } }
    thumbs.appendChild(createThumbEl(obverseSrc, 'obverse'));
    thumbs.appendChild(createThumbEl(reverseSrc, 'reverse'));
    row.appendChild(thumbs);

    // Item name
    const item = typeof inventory !== 'undefined' ? inventory.find(i => i.uuid === rec.uuid) : null;
    const itemIndex = item && typeof inventory !== 'undefined' ? inventory.indexOf(item) : -1;
    const name = item ? item.name : rec.uuid.slice(0, 8) + '...';

    const info = document.createElement('div');
    info.className = 'pattern-rule-info';
    info.innerHTML = `<div class="rule-replacement">${name}</div>`;
    row.appendChild(info);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'pattern-rule-actions';

    // Edit link — opens item's edit modal
    if (itemIndex >= 0) {
      const editLink = document.createElement('button');
      editLink.className = 'btn';
      editLink.textContent = 'Edit';
      editLink.addEventListener('click', () => {
        hideSettingsModal();
        if (typeof editItem === 'function') editItem(itemIndex);
      });
      actions.appendChild(editLink);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Delete images for "' + name + '"?')) return;
      await imageCache.deleteUserImage(rec.uuid);
      renderUserImageGrid();
      renderImageStorageStats();
    });
    actions.appendChild(deleteBtn);
    row.appendChild(actions);

    container.appendChild(row);
  }
};

// Expose globally
if (typeof window !== 'undefined') {
  window.showSettingsModal = showSettingsModal;
  window.hideSettingsModal = hideSettingsModal;
  window.switchSettingsSection = switchSettingsSection;
  window.switchProviderTab = switchProviderTab;
  window.renderInlineChipConfigTable = renderInlineChipConfigTable;
  window.renderFilterChipCategoryTable = renderFilterChipCategoryTable;
  window.renderLayoutSectionConfigTable = renderLayoutSectionConfigTable;
  window.syncGoldbackSettingsUI = syncGoldbackSettingsUI;
  window.syncCurrencySettingsUI = syncCurrencySettingsUI;
  window.syncHeaderToggleUI = syncHeaderToggleUI;
  window.syncLayoutVisibilityUI = syncLayoutVisibilityUI;
  window.renderSeedRuleTable = renderSeedRuleTable;
  window.renderCustomRuleTable = renderCustomRuleTable;
  window.populateImagesSection = populateImagesSection;
}

/**
 * Settings modal listener binders (STAK-135)
 *
 * Keeps listener wiring split by concern while preserving existing behavior.
 */

// Saved table items-per-page value used when toggling card view.
let _savedTableIpp = null;
let _patternMode = 'keywords';

const getExistingElement = (id) => {
  const el = safeGetElement(id);
  return el && el.id ? el : null;
};

const applyViewIpp = () => {
  const enteringCard = localStorage.getItem(DESKTOP_CARD_VIEW_KEY) === 'true';
  let ippStr;
  if (enteringCard) {
    // Save current table IPP before overwriting.
    if (_savedTableIpp === null && itemsPerPage !== Infinity) {
      _savedTableIpp = String(itemsPerPage);
    }
    itemsPerPage = Infinity;
    ippStr = 'all';
  } else {
    // Restore table IPP.
    const restored = _savedTableIpp || 'all';
    _savedTableIpp = null;
    itemsPerPage = restored === 'all' ? Infinity : Number(restored);
    ippStr = restored;
  }
  try { localStorage.setItem(ITEMS_PER_PAGE_KEY, ippStr); } catch (e) { /* ignore */ }
  if (elements.itemsPerPage) elements.itemsPerPage.value = ippStr;
  const settingsIpp = getExistingElement('settingsItemsPerPage');
  if (settingsIpp) settingsIpp.value = ippStr;
};

const bindSettingsNavigationListeners = () => {
  // Sidebar navigation.
  document.querySelectorAll('.settings-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      switchSettingsSection(item.dataset.section);
    });
  });

  // Provider tabs.
  document.querySelectorAll('.settings-provider-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchProviderTab(tab.dataset.provider);
    });
  });

  // Log sub-tabs.
  document.querySelectorAll('[data-log-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      switchLogTab(tab.dataset.logTab);
    });
  });
};

const bindAppearanceAndHeaderListeners = () => {
  // Theme picker buttons.
  document.querySelectorAll('.theme-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      if (typeof setTheme === 'function') {
        setTheme(theme);
      }
      if (typeof updateThemeButton === 'function') {
        updateThemeButton();
      }
      document.querySelectorAll('.theme-option').forEach((b) => {
        b.classList.toggle('active', b.dataset.theme === theme);
      });
    });
  });

  // Display currency (STACK-50).
  const currencySelect = getExistingElement('settingsDisplayCurrency');
  if (currencySelect) {
    currencySelect.addEventListener('change', () => {
      saveDisplayCurrency(currencySelect.value);
      if (typeof renderTable === 'function') renderTable();
      if (typeof updateSummary === 'function') updateSummary();
      if (typeof updateAllSparklines === 'function') updateAllSparklines();
      if (typeof syncGoldbackSettingsUI === 'function') syncGoldbackSettingsUI();
    });
  }

  // Display timezone (STACK-63).
  const tzSelect = getExistingElement('settingsTimezone');
  if (tzSelect) {
    tzSelect.addEventListener('change', () => {
      localStorage.setItem(TIMEZONE_KEY, tzSelect.value);
      window.location.reload();
    });
  }

  wireStorageToggle('settingsHeaderThemeBtn', 'headerThemeBtnVisible', {
    defaultVal: false,
    onApply: () => applyHeaderToggleVisibility(),
  });
  wireStorageToggle('settingsHeaderThemeBtn_hdr', 'headerThemeBtnVisible', {
    defaultVal: false,
    onApply: () => applyHeaderToggleVisibility(),
  });

  wireStorageToggle('settingsHeaderCurrencyBtn', 'headerCurrencyBtnVisible', {
    defaultVal: false,
    onApply: () => applyHeaderToggleVisibility(),
  });
  wireStorageToggle('settingsHeaderCurrencyBtn_hdr', 'headerCurrencyBtnVisible', {
    defaultVal: false,
    onApply: () => applyHeaderToggleVisibility(),
  });

  wireStorageToggle('settingsHeaderTrendBtn', HEADER_TREND_BTN_KEY, {
    defaultVal: true,
    onApply: () => applyHeaderToggleVisibility(),
  });
  wireStorageToggle('settingsHeaderTrendBtn_hdr', HEADER_TREND_BTN_KEY, {
    defaultVal: true,
    onApply: () => applyHeaderToggleVisibility(),
  });

  wireStorageToggle('settingsHeaderSyncBtn', HEADER_SYNC_BTN_KEY, {
    defaultVal: true,
    onApply: () => applyHeaderToggleVisibility(),
  });
  wireStorageToggle('settingsHeaderSyncBtn_hdr', HEADER_SYNC_BTN_KEY, {
    defaultVal: true,
    onApply: () => applyHeaderToggleVisibility(),
  });

  // Trend cycle header button.
  const headerTrendBtn = safeGetElement('headerTrendBtn');
  if (headerTrendBtn) {
    headerTrendBtn.addEventListener('click', () => {
      if (typeof window.cycleSpotTrend === 'function') window.cycleSpotTrend();
    });
  }

  // Sync all spot prices header button.
  const headerSyncBtn = safeGetElement('headerSyncBtn');
  if (headerSyncBtn) {
    headerSyncBtn.addEventListener('click', () => {
      ['Silver', 'Gold', 'Platinum', 'Palladium'].forEach(m => {
        const btn = document.getElementById(`syncIcon${m}`);
        if (btn && !btn.disabled) btn.click();
      });
    });
  }

  // Theme cycle header button (STACK-54).
  if (elements.headerThemeBtn) {
    elements.headerThemeBtn.addEventListener('click', () => {
      if (typeof toggleTheme === 'function') toggleTheme();
      if (typeof updateThemeButton === 'function') updateThemeButton();
      const currentTheme = localStorage.getItem(THEME_KEY) || 'light';
      document.querySelectorAll('.theme-option').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.theme === currentTheme);
      });
    });
  }

  // Currency picker header button (STACK-54).
  if (elements.headerCurrencyBtn) {
    elements.headerCurrencyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCurrencyDropdown();
    });
  }

  const ippSelect = getExistingElement('settingsItemsPerPage');
  if (ippSelect) {
    ippSelect.addEventListener('change', () => {
      const ippVal = ippSelect.value;
      itemsPerPage = ippVal === 'all' ? Infinity : parseInt(ippVal, 10);
      try { localStorage.setItem(ITEMS_PER_PAGE_KEY, ippVal); } catch (e) { /* ignore */ }
      if (elements.itemsPerPage) elements.itemsPerPage.value = ippVal;
      renderTable();
    });
  }

  const spotCompareSetting = getExistingElement('settingsSpotCompareMode');
  if (spotCompareSetting) {
    spotCompareSetting.addEventListener('change', () => {
      try { localStorage.setItem(SPOT_COMPARE_MODE_KEY, spotCompareSetting.value); } catch (e) { /* ignore */ }
      if (typeof updateAllSparklines === 'function') updateAllSparklines();
    });
  }
};

const bindFilterAndNumistaListeners = () => {
  const chipMinSetting = getExistingElement('settingsChipMinCount');
  if (chipMinSetting) {
    chipMinSetting.addEventListener('change', () => {
      const val = chipMinSetting.value;
      localStorage.setItem('chipMinCount', val);
      const chipMinInline = getExistingElement('chipMinCount');
      if (chipMinInline) chipMinInline.value = val;
      if (typeof renderActiveFilters === 'function') renderActiveFilters();
    });
  }

  wireFeatureFlagToggle('settingsGroupNameChips', 'GROUPED_NAME_CHIPS', {
    syncId: 'groupNameChips',
    onApply: () => { if (typeof renderActiveFilters === 'function') renderActiveFilters(); },
  });

  wireFeatureFlagToggle('settingsDynamicChips', 'DYNAMIC_NAME_CHIPS', {
    onApply: () => { if (typeof renderActiveFilters === 'function') renderActiveFilters(); },
  });

  wireFeatureFlagToggle('settingsChipQtyBadge', 'CHIP_QTY_BADGE', {
    onApply: () => { if (typeof renderActiveFilters === 'function') renderActiveFilters(); },
  });

  wireFeatureFlagToggle('settingsFuzzyAutocomplete', 'FUZZY_AUTOCOMPLETE', {
    onApply: (isEnabled) => {
      if (isEnabled && typeof initializeAutocomplete === 'function') initializeAutocomplete(inventory);
    },
  });

  wireFeatureFlagToggle('settingsNumistaLookup', 'NUMISTA_SEARCH_LOOKUP');

  const numistaViewContainer = getExistingElement('numistaViewFieldToggles');
  if (numistaViewContainer) {
    const nfConfig = typeof getNumistaViewFieldConfig === 'function' ? getNumistaViewFieldConfig() : {};
    numistaViewContainer.querySelectorAll('input[data-nf]').forEach((cb) => {
      const field = cb.dataset.nf;
      if (nfConfig[field] !== undefined) cb.checked = nfConfig[field];
    });
    numistaViewContainer.addEventListener('change', () => {
      const config = {};
      numistaViewContainer.querySelectorAll('input[data-nf]').forEach((cb) => {
        config[cb.dataset.nf] = cb.checked;
      });
      if (typeof saveNumistaViewFieldConfig === 'function') saveNumistaViewFieldConfig(config);
    });
  }

  const addNumistaRuleBtn = getExistingElement('addNumistaRuleBtn');
  if (addNumistaRuleBtn) {
    addNumistaRuleBtn.addEventListener('click', () => {
      const patternInput = getExistingElement('numistaRulePatternInput');
      const replacementInput = getExistingElement('numistaRuleReplacementInput');
      const idInput = getExistingElement('numistaRuleIdInput');
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

  wireChipSortToggle('settingsChipSortOrder', 'chipSortOrder');
  if (typeof window.setupChipGroupingEvents === 'function') {
    window.setupChipGroupingEvents();
  }
};

const bindNumistaBulkSyncListeners = () => {
  const nsStartBtn = getExistingElement('numistaSyncStartBtn');
  if (nsStartBtn) {
    nsStartBtn.addEventListener('click', () => {
      if (typeof startBulkSync === 'function') startBulkSync();
    });
  }

  const nsCancelBtn = getExistingElement('numistaSyncCancelBtn');
  if (nsCancelBtn) {
    nsCancelBtn.addEventListener('click', () => {
      if (window.BulkImageCache) BulkImageCache.abort();
      nsCancelBtn.style.display = 'none';
    });
  }

  const nsClearBtn = getExistingElement('numistaSyncClearBtn');
  if (nsClearBtn) {
    nsClearBtn.addEventListener('click', () => {
      if (typeof clearAllCachedData === 'function') clearAllCachedData();
    });
  }
};

const bindSettingsModalShellListeners = () => {
  const closeBtn = getExistingElement('settingsCloseBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', hideSettingsModal);
  }

  const modal = getExistingElement('settingsModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideSettingsModal();
    });
  }

  // Provider priority dropdowns (STACK-90).
  setupProviderPriority();
};

const bindGoldbackToggleListeners = () => {
  const gbToggle = getExistingElement('settingsGoldbackEnabled');
  if (gbToggle) {
    gbToggle.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip-sort-btn');
      if (!btn) return;
      const isEnabled = btn.dataset.val === 'on';
      if (typeof saveGoldbackEnabled === 'function') saveGoldbackEnabled(isEnabled);
      gbToggle.querySelectorAll('.chip-sort-btn').forEach((b) => b.classList.toggle('active', b === btn));
      if (typeof renderTable === 'function') renderTable();
    });
  }

  const gbEstToggle = getExistingElement('settingsGoldbackEstimateEnabled');
  if (gbEstToggle) {
    gbEstToggle.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip-sort-btn');
      if (!btn) return;
      const isEnabled = btn.dataset.val === 'on';
      if (typeof saveGoldbackEstimateEnabled === 'function') saveGoldbackEstimateEnabled(isEnabled);
      gbEstToggle.querySelectorAll('.chip-sort-btn').forEach((b) => b.classList.toggle('active', b === btn));
      if (isEnabled && typeof onGoldSpotPriceChanged === 'function') onGoldSpotPriceChanged();
      if (typeof syncGoldbackSettingsUI === 'function') syncGoldbackSettingsUI();
      if (typeof renderTable === 'function') renderTable();
    });
  }

  const gbEstRefreshBtn = getExistingElement('goldbackEstimateRefreshBtn');
  if (gbEstRefreshBtn) {
    gbEstRefreshBtn.addEventListener('click', async () => {
      if (typeof syncProviderChain !== 'function') return;
      const origText = gbEstRefreshBtn.textContent;
      gbEstRefreshBtn.textContent = 'Refreshing...';
      gbEstRefreshBtn.disabled = true;
      try {
        await syncProviderChain({ showProgress: false, forceSync: true });
      } catch (err) {
        console.warn('Goldback estimate refresh failed:', err);
      } finally {
        gbEstRefreshBtn.textContent = origText;
        gbEstRefreshBtn.disabled = false;
      }
    });
  }

  const gbModifierInput = getExistingElement('goldbackEstimateModifierInput');
  if (gbModifierInput) {
    gbModifierInput.addEventListener('change', () => {
      const val = parseFloat(gbModifierInput.value);
      if (isNaN(val) || val <= 0) {
        gbModifierInput.value = goldbackEstimateModifier.toFixed(2);
        return;
      }
      if (typeof saveGoldbackEstimateModifier === 'function') saveGoldbackEstimateModifier(val);
      if (goldbackEstimateEnabled && typeof onGoldSpotPriceChanged === 'function') onGoldSpotPriceChanged();
      if (typeof recordAllItemPriceSnapshots === 'function') recordAllItemPriceSnapshots();
      if (typeof syncGoldbackSettingsUI === 'function') syncGoldbackSettingsUI();
      if (typeof renderTable === 'function') renderTable();
    });
  }
};

const bindGoldbackActionListeners = () => {
  const gbSaveBtn = getExistingElement('goldbackSavePricesBtn');
  if (gbSaveBtn) {
    gbSaveBtn.addEventListener('click', () => {
      const tbody = getExistingElement('goldbackPriceTableBody');
      if (!tbody) return;
      const now = Date.now();
      const fxRate = (typeof getExchangeRate === 'function') ? getExchangeRate() : 1;
      tbody.querySelectorAll('tr[data-denom]').forEach((row) => {
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
      if (typeof recordAllItemPriceSnapshots === 'function') recordAllItemPriceSnapshots();
      if (typeof syncGoldbackSettingsUI === 'function') syncGoldbackSettingsUI();
      if (typeof renderTable === 'function') renderTable();
    });
  }

  const gbQuickFillBtn = getExistingElement('goldbackQuickFillBtn');
  if (gbQuickFillBtn) {
    gbQuickFillBtn.addEventListener('click', () => {
      const input = getExistingElement('goldbackQuickFillInput');
      if (!input) return;
      const rate = parseFloat(input.value);
      if (isNaN(rate) || rate <= 0) {
        alert('Enter a valid 1 Goldback rate.');
        return;
      }
      const tbody = getExistingElement('goldbackPriceTableBody');
      if (!tbody || typeof GOLDBACK_DENOMINATIONS === 'undefined') return;
      tbody.querySelectorAll('tr[data-denom]').forEach((row) => {
        const denom = parseFloat(row.dataset.denom);
        const priceInput = row.querySelector('input[type="number"]');
        if (priceInput) {
          priceInput.value = (Math.round(rate * denom * 100) / 100).toFixed(2);
        }
      });
    });
  }

  const gbHistoryBtn = getExistingElement('goldbackHistoryBtn');
  if (gbHistoryBtn) {
    gbHistoryBtn.addEventListener('click', () => {
      if (typeof showGoldbackHistoryModal === 'function') showGoldbackHistoryModal();
    });
  }

  const gbHistoryCloseBtn = getExistingElement('goldbackHistoryCloseBtn');
  if (gbHistoryCloseBtn) {
    gbHistoryCloseBtn.addEventListener('click', () => {
      if (typeof hideGoldbackHistoryModal === 'function') hideGoldbackHistoryModal();
    });
  }

  const gbHistoryModal = getExistingElement('goldbackHistoryModal');
  if (gbHistoryModal) {
    gbHistoryModal.addEventListener('click', (e) => {
      if (e.target === gbHistoryModal) {
        if (typeof hideGoldbackHistoryModal === 'function') hideGoldbackHistoryModal();
      }
    });
  }

  const gbExportBtn = getExistingElement('exportGoldbackHistoryBtn');
  if (gbExportBtn) {
    gbExportBtn.addEventListener('click', () => {
      if (typeof exportGoldbackHistory === 'function') exportGoldbackHistory();
    });
  }
};

const bindImageSyncListeners = () => {
  const clearImagesBtn = getExistingElement('clearAllImagesBtn');
  if (clearImagesBtn) {
    clearImagesBtn.addEventListener('click', async () => {
      if (!confirm('Clear all cached images, pattern rules, user uploads, AND image URLs from inventory items?')) return;
      if (window.imageCache?.isAvailable()) await imageCache.clearAll();
      let cleared = 0;
      for (const item of inventory) {
        if (item.obverseImageUrl || item.reverseImageUrl) {
          item.obverseImageUrl = '';
          item.reverseImageUrl = '';
          cleared++;
        }
      }
      if (cleared > 0 && typeof saveInventory === 'function') saveInventory();
      populateImagesSection();
      if (typeof renderTable === 'function') renderTable();
      alert(`Cleared all image data. ${cleared} item URL(s) reset.`);
    });
  }

  const syncImageUrlsBtn = getExistingElement('syncImageUrlsBtn');
  if (syncImageUrlsBtn) {
    syncImageUrlsBtn.addEventListener('click', async () => {
      const config = typeof catalogConfig !== 'undefined' ? catalogConfig.getNumistaConfig() : null;
      if (!config?.apiKey) {
        alert('Numista API key not configured.');
        return;
      }
      const eligible = inventory.filter(i => i.numistaId);
      if (!eligible.length) {
        alert('No items with Numista IDs found.');
        return;
      }
      if (!confirm(`Sync image URLs for ${eligible.length} items from Numista API?\nThis bypasses cache and uses your API quota.`)) {
        return;
      }

      syncImageUrlsBtn.disabled = true;
      syncImageUrlsBtn.textContent = 'Syncing…';
      let synced = 0;
      let failed = 0;
      let skipped = 0;
      const seen = new Set();
      const urlByCatId = new Map();
      try {
        for (const item of eligible) {
          const catId = item.numistaId;
          if (seen.has(catId)) {
            const donor = urlByCatId.get(catId);
            if (donor) {
              item.obverseImageUrl = donor.obverseImageUrl;
              item.reverseImageUrl = donor.reverseImageUrl;
              synced++;
            } else {
              skipped++;
            }
            continue;
          }
          seen.add(catId);
          try {
            const url = `https://api.numista.com/v3/types/${catId}?lang=en`;
            const resp = await fetch(url, {
              headers: { 'Numista-API-Key': config.apiKey, 'Content-Type': 'application/json' },
              cache: 'no-cache',
            });
            if (!resp.ok) {
              failed++;
              continue;
            }
            const data = await resp.json();
            const obv = data.obverse_thumbnail || data.obverse?.thumbnail || '';
            const rev = data.reverse_thumbnail || data.reverse?.thumbnail || '';
            urlByCatId.set(catId, { obverseImageUrl: obv, reverseImageUrl: rev });
            for (const inv of eligible) {
              if (inv.numistaId === catId) {
                inv.obverseImageUrl = obv;
                inv.reverseImageUrl = rev;
              }
            }
            synced++;
            await new Promise((resolve) => setTimeout(resolve, 200));
          } catch {
            failed++;
          }
        }
        if (typeof saveInventory === 'function') saveInventory();
        populateImagesSection();
        alert(`Image URL sync complete.\n${synced} synced, ${failed} failed, ${skipped} skipped (dupes).`);
      } finally {
        syncImageUrlsBtn.disabled = false;
        syncImageUrlsBtn.textContent = 'Sync Image URLs from Numista';
      }
    });
  }
};

const bindPatternRuleModeListeners = () => {
  const patternModeKeywords = getExistingElement('patternModeKeywords');
  const patternModeRegex = getExistingElement('patternModeRegex');
  const patternInput = getExistingElement('patternRulePattern');
  const patternTip = getExistingElement('patternRuleTip');

  if (patternModeKeywords && patternModeRegex) {
    patternModeKeywords.addEventListener('click', () => {
      _patternMode = 'keywords';
      patternModeKeywords.classList.add('active');
      patternModeRegex.classList.remove('active');
      if (patternInput) patternInput.placeholder = 'e.g. morgan, peace, walking liberty';
      if (patternTip) patternTip.textContent = 'Separate keywords with commas or semicolons. Matches item names containing any keyword.';
    });
    patternModeRegex.addEventListener('click', () => {
      _patternMode = 'regex';
      patternModeRegex.classList.add('active');
      patternModeKeywords.classList.remove('active');
      if (patternInput) patternInput.placeholder = 'e.g. \\bmorgan\\b|\\bpeace\\b';
      if (patternTip) patternTip.textContent = 'Case-insensitive regex. Use \\b for word boundaries, | for OR, .* for wildcards.';
    });
  }

  if (patternInput && typeof attachAutocomplete === 'function') {
    attachAutocomplete(patternInput, 'names');
  }

  // Camera capture buttons — bridge capture input → main file input via DataTransfer
  [['patternRuleObverseCamera', 'patternRuleObverseCapture', 'patternRuleObverse'],
   ['patternRuleReverseCamera', 'patternRuleReverseCapture', 'patternRuleReverse']].forEach(([btnId, captureId, mainId]) => {
    const btn = getExistingElement(btnId);
    const captureInput = getExistingElement(captureId);
    const mainInput = getExistingElement(mainId);
    if (btn && captureInput && mainInput) {
      btn.addEventListener('click', () => captureInput.click());
      captureInput.addEventListener('change', () => {
        if (!captureInput.files?.length) return;
        const dt = new DataTransfer();
        dt.items.add(captureInput.files[0]);
        mainInput.files = dt.files;
        mainInput.dispatchEvent(new Event('change'));
      });
    }
  });

  const addPatternRuleBtn = getExistingElement('addPatternRuleBtn');
  if (addPatternRuleBtn) {
    addPatternRuleBtn.addEventListener('click', async () => {
      const obverseInput = getExistingElement('patternRuleObverse');
      const reverseInput = getExistingElement('patternRuleReverse');

      const rawPattern = patternInput?.value?.trim();
      const replacement = rawPattern || '';

      if (!rawPattern) {
        alert('Pattern is required.');
        return;
      }

      let pattern = rawPattern;
      if (_patternMode === 'keywords') {
        const terms = rawPattern.split(/[,;]/).map(t => t.trim()).filter(t => t.length > 0);
        if (terms.length === 0) {
          alert('Enter at least one keyword.');
          return;
        }
        pattern = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      }

      try {
        new RegExp(pattern, 'i');
      } catch (e) {
        alert('Invalid pattern: ' + e.message);
        return;
      }

      if (!obverseInput?.files?.[0] && !reverseInput?.files?.[0]) {
        alert('Please select at least one image (obverse or reverse).');
        return;
      }

      let obverseBlob = null;
      let reverseBlob = null;
      const processor = typeof imageProcessor !== 'undefined' ? imageProcessor : null;

      try {
        if (obverseInput?.files?.[0]) {
          if (processor) {
            const result = await processor.processFile(obverseInput.files[0]);
            obverseBlob = result?.blob || null;
          } else {
            obverseBlob = obverseInput.files[0];
          }
        }

        if (reverseInput?.files?.[0]) {
          if (processor) {
            const result = await processor.processFile(reverseInput.files[0]);
            reverseBlob = result?.blob || null;
          } else {
            reverseBlob = reverseInput.files[0];
          }
        }
      } catch (err) {
        console.error('Image processing failed:', err);
        alert('Failed to process image: ' + err.message);
        return;
      }

      const ruleId = 'custom-img-' + Date.now();
      const addResult = NumistaLookup.addRule(pattern, replacement, null, ruleId);
      if (!addResult.success) {
        alert(addResult.error || 'Failed to add rule.');
        return;
      }

      if ((obverseBlob || reverseBlob) && window.imageCache?.isAvailable()) {
        await imageCache.cachePatternImage(ruleId, obverseBlob, reverseBlob);
      }

      if (patternInput) patternInput.value = '';
      if (obverseInput) obverseInput.value = '';
      if (reverseInput) reverseInput.value = '';

      renderCustomPatternRules();
      renderImageStorageStats();
    });
  }
};

const bindCardAndTableImageListeners = () => {
  // Card style toggle (A/B/C/D chip buttons in Appearance > Inventory)
  const cardStyleToggleEl = getExistingElement('settingsCardStyleToggle');
  if (cardStyleToggleEl) {
    const savedStyle = localStorage.getItem(CARD_STYLE_KEY) || 'A';
    cardStyleToggleEl.querySelectorAll('.chip-sort-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.style === savedStyle);
    });
    cardStyleToggleEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-style]');
      if (!btn) return;
      const val = btn.dataset.style;
      localStorage.setItem(CARD_STYLE_KEY, val);
      cardStyleToggleEl.querySelectorAll('.chip-sort-btn').forEach(b => b.classList.toggle('active', b === btn));
      // Sync live sort bar toggle
      const liveSortToggle = document.getElementById('cardStyleToggle');
      if (liveSortToggle) {
        liveSortToggle.querySelectorAll('[data-style]').forEach(b => b.classList.toggle('active', b.dataset.style === val));
      }
      if (typeof renderTable === 'function') renderTable();
    });
  }

  // Default sort column
  const defaultSortColEl = getExistingElement('settingsDefaultSortColumn');
  if (defaultSortColEl) {
    const savedCol = localStorage.getItem(DEFAULT_SORT_COL_KEY);
    if (savedCol !== null) defaultSortColEl.value = savedCol;
    defaultSortColEl.addEventListener('change', () => {
      const val = parseInt(defaultSortColEl.value, 10);
      localStorage.setItem(DEFAULT_SORT_COL_KEY, String(val));
      sortColumn = val;
      if (typeof updateCardSortBar === 'function') updateCardSortBar();
      if (typeof renderTable === 'function') renderTable();
    });
  }

  // Default sort direction
  const defaultSortDirEl = getExistingElement('settingsDefaultSortDir');
  if (defaultSortDirEl) {
    const savedDir = localStorage.getItem(DEFAULT_SORT_DIR_KEY) || 'asc';
    defaultSortDirEl.querySelectorAll('.chip-sort-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === savedDir);
    });
    defaultSortDirEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-val]');
      if (!btn) return;
      const val = btn.dataset.val;
      localStorage.setItem(DEFAULT_SORT_DIR_KEY, val);
      sortDirection = val;
      defaultSortDirEl.querySelectorAll('.chip-sort-btn').forEach(b => b.classList.toggle('active', b === btn));
      if (typeof updateCardSortBar === 'function') updateCardSortBar();
      if (typeof renderTable === 'function') renderTable();
    });
  }

  wireStorageToggle('settingsDesktopCardView', DESKTOP_CARD_VIEW_KEY, {
    defaultVal: false,
    onApply: (isEnabled) => {
      document.body.classList.toggle('force-card-view', isEnabled);
      applyViewIpp();
      if (typeof renderTable === 'function') renderTable();
    },
  });

  wireStorageToggle('tableImagesToggle', 'tableImagesEnabled', {
    defaultVal: true,
    onApply: () => { if (typeof renderTable === 'function') renderTable(); },
  });

  const sidesEl = getExistingElement('tableImageSidesToggle');
  if (sidesEl) {
    const curSides = localStorage.getItem('tableImageSides') || 'both';
    sidesEl.querySelectorAll('.chip-sort-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.val === curSides);
    });
    sidesEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip-sort-btn');
      if (!btn) return;
      localStorage.setItem('tableImageSides', btn.dataset.val);
      sidesEl.querySelectorAll('.chip-sort-btn').forEach((b) => b.classList.toggle('active', b === btn));
      if (typeof renderTable === 'function') renderTable();
    });
  }

  wireStorageToggle('numistaOverrideToggle', 'numistaOverridePersonal', {
    defaultVal: false,
  });
};

// ---------------------------------------------------------------------------
// Image Export/Import helpers
// ---------------------------------------------------------------------------

const blobToWebP = (blob, quality = 0.85) => new Promise((resolve) => {
  if (!blob) return resolve(null);
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d').drawImage(img, 0, 0);
    canvas.toBlob(resolve, 'image/webp', quality);
  };
  img.onerror = () => { URL.revokeObjectURL(url); resolve(blob); };
  img.src = url;
});

const buildImageExportZip = async ({ includeCdn = false, onProgress = null } = {}) => {
  const zip = new JSZip();
  const manifest = [];
  const addedCatalogIds = new Set();

  // 1. User images
  const userImages = await imageCache.exportAllUserImages();
  for (const rec of userImages) {
    if (rec.obverse) zip.file(`user/${rec.uuid}_obverse.webp`, rec.obverse);
    if (rec.reverse) zip.file(`user/${rec.uuid}_reverse.webp`, rec.reverse);
  }

  // 2. Pattern images + rules
  const patternImages = await imageCache.exportAllPatternImages();
  for (const rec of patternImages) {
    if (rec.obverse) zip.file(`pattern/${rec.ruleId}_obverse.webp`, rec.obverse);
    if (rec.reverse) zip.file(`pattern/${rec.ruleId}_reverse.webp`, rec.reverse);
  }
  const customRules = NumistaLookup.listCustomRules();
  zip.file('pattern_rules.json', JSON.stringify(customRules, null, 2));

  // 3. Existing coinImages from IndexedDB (always included)
  const coinImages = await imageCache.exportAllCoinImages();
  for (const rec of coinImages) {
    const { catalogId } = rec;
    addedCatalogIds.add(catalogId);
    const obvWebP = await blobToWebP(rec.obverse);
    const revWebP = await blobToWebP(rec.reverse);
    if (obvWebP) zip.file(`cdn/${catalogId}_obverse.webp`, obvWebP);
    if (revWebP) zip.file(`cdn/${catalogId}_reverse.webp`, revWebP);
    const item = typeof inventory !== 'undefined'
      ? inventory.find(i => BulkImageCache.resolveCatalogId(i) === catalogId)
      : null;
    manifest.push({
      catalogId,
      uuid: item?.uuid || '',
      name: item?.name || '',
      numistaId: item?.numistaId || '',
      obverseFile: obvWebP ? `cdn/${catalogId}_obverse.webp` : null,
      reverseFile: revWebP ? `cdn/${catalogId}_reverse.webp` : null,
    });
  }

  // 4. Optionally fetch CDN images not yet in IndexedDB
  if (includeCdn) {
    const eligible = BulkImageCache.buildEligibleList();
    const toFetch = eligible.filter(e => !addedCatalogIds.has(e.catalogId));
    for (let i = 0; i < toFetch.length; i++) {
      const { item, catalogId } = toFetch[i];
      if (onProgress) onProgress(i + 1, toFetch.length, catalogId);
      if (item.obverseImageUrl || item.reverseImageUrl) {
        await imageCache.cacheImages(catalogId, item.obverseImageUrl || '', item.reverseImageUrl || '');
      }
      const rec = await imageCache.getImages(catalogId);
      if (rec) {
        const obvWebP = await blobToWebP(rec.obverse);
        const revWebP = await blobToWebP(rec.reverse);
        if (obvWebP) zip.file(`cdn/${catalogId}_obverse.webp`, obvWebP);
        if (revWebP) zip.file(`cdn/${catalogId}_reverse.webp`, revWebP);
        manifest.push({
          catalogId,
          uuid: item.uuid || '',
          name: item.name || '',
          numistaId: item.numistaId || '',
          obverseFile: obvWebP ? `cdn/${catalogId}_obverse.webp` : null,
          reverseFile: revWebP ? `cdn/${catalogId}_reverse.webp` : null,
        });
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (manifest.length > 0) {
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  }

  return zip;
};

const _restoreCdnFolderFromZip = async (zip) => {
  const cdnFolder = zip.folder('cdn');
  if (!cdnFolder) return;
  const cdnMap = new Map();
  cdnFolder.forEach((relativePath, zipEntry) => {
    const match = relativePath.match(/^(.+)_(obverse|reverse)\.webp$/);
    if (match) {
      const [, catalogId, side] = match;
      if (!cdnMap.has(catalogId)) cdnMap.set(catalogId, {});
      cdnMap.get(catalogId)[side] = zipEntry;
    }
  });
  for (const [catalogId, sides] of cdnMap) {
    const alreadyCached = await imageCache.hasImages(catalogId);
    if (alreadyCached) continue;
    const obverse = sides.obverse ? await sides.obverse.async('blob') : null;
    const reverse = sides.reverse ? await sides.reverse.async('blob') : null;
    const item = typeof inventory !== 'undefined'
      ? inventory.find(i => BulkImageCache.resolveCatalogId(i) === catalogId)
      : null;
    await imageCache._put('coinImages', {
      catalogId,
      obverse,
      reverse,
      obverseUrl: item?.obverseImageUrl || '',
      reverseUrl: item?.reverseImageUrl || '',
      cachedAt: Date.now(),
      size: (obverse?.size || 0) + (reverse?.size || 0),
    });
  }
};

const bindImageImportExportListeners = () => {
  const exportBtn = getExistingElement('exportAllImagesBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      if (!window.imageCache?.isAvailable()) {
        alert('IndexedDB unavailable.');
        return;
      }
      if (typeof JSZip === 'undefined') {
        alert('JSZip not loaded.');
        return;
      }

      const eligibleCount = typeof BulkImageCache !== 'undefined'
        ? BulkImageCache.buildEligibleList().length
        : 0;
      // nosemgrep: javascript.browser.security.insecure-document-method.insecure-document-method
      const includeCdn = eligibleCount > 0 && confirm(
        'Download CDN catalog images for offline use?\n\n' +
        'This fetches images for items with Numista IDs (1 second between each). ' +
        'Already-cached images are included automatically.'
      );

      let progressEl = null;
      if (includeCdn) {
        progressEl = document.createElement('div');
        progressEl.id = 'imageCdnProgress';
        progressEl.innerHTML = '<span id="imageCdnProgressText">Preparing\u2026</span>' +
          '<progress id="imageCdnProgressBar" value="0" max="1"></progress>';
        exportBtn.parentNode.insertBefore(progressEl, exportBtn.nextSibling);
      }

      exportBtn.disabled = true;
      exportBtn.textContent = 'Exporting\u2026';

      try {
        const zip = await buildImageExportZip({
          includeCdn,
          onProgress: (current, total, catalogId) => {
            if (!progressEl) return;
            const textEl = document.getElementById('imageCdnProgressText');
            const barEl = document.getElementById('imageCdnProgressBar');
            if (textEl) textEl.textContent = `Fetching ${catalogId} (${current} of ${total})\u2026`;
            if (barEl) { barEl.value = current; barEl.max = total; }
          },
        });

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'staktrakr-images.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Image export failed:', err);
        alert('Export failed: ' + err.message);
      } finally {
        exportBtn.textContent = 'Export All Images';
        exportBtn.disabled = false;
        if (progressEl) progressEl.remove();
      }
    });
  }

  const importBtn = getExistingElement('importImagesBtn');
  const importFile = getExistingElement('importImagesFile');
  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (typeof JSZip === 'undefined') {
        alert('JSZip not loaded.');
        return;
      }
      if (!window.imageCache?.isAvailable()) {
        alert('IndexedDB unavailable.');
        return;
      }

      importBtn.textContent = 'Importing...';
      importBtn.disabled = true;

      try {
        const zip = await JSZip.loadAsync(file);

        const rulesFile = zip.file('pattern_rules.json');
        if (rulesFile) {
          const rulesJson = await rulesFile.async('string');
          const rules = JSON.parse(rulesJson);
          const existingPatterns = new Set(NumistaLookup.listCustomRules().map(r => r.pattern));
          for (const rule of rules) {
            if (!rule.pattern || existingPatterns.has(rule.pattern)) continue;
            NumistaLookup.addRule(rule.pattern, rule.replacement || '', rule.numistaId || null, rule.seedImageId || null);
            existingPatterns.add(rule.pattern);
          }
        }

        const patternFiles = zip.folder('pattern');
        if (patternFiles) {
          const patternMap = new Map();
          patternFiles.forEach((relativePath, zipEntry) => {
            const match = relativePath.match(/^(.+)_(obverse|reverse)\.webp$/);
            if (match) {
              const [, ruleId, side] = match;
              if (!patternMap.has(ruleId)) patternMap.set(ruleId, {});
              patternMap.get(ruleId)[side] = zipEntry;
            }
          });
          for (const [ruleId, sides] of patternMap) {
            const obverse = sides.obverse ? await sides.obverse.async('blob') : null;
            const reverse = sides.reverse ? await sides.reverse.async('blob') : null;
            await imageCache.cachePatternImage(ruleId, obverse, reverse);
          }
        }

        const userFolder = zip.folder('user');
        if (userFolder) {
          const userMap = new Map();
          userFolder.forEach((relativePath, zipEntry) => {
            const match = relativePath.match(/^(.+)_(obverse|reverse)\.webp$/);
            if (match) {
              const [, uuid, side] = match;
              if (!userMap.has(uuid)) userMap.set(uuid, {});
              userMap.get(uuid)[side] = zipEntry;
            }
          });
          for (const [uuid, sides] of userMap) {
            const obverse = sides.obverse ? await sides.obverse.async('blob') : null;
            const reverse = sides.reverse ? await sides.reverse.async('blob') : null;
            if (obverse) await imageCache.cacheUserImage(uuid, obverse, reverse);
          }
        }

        // Restore CDN catalog images
        await _restoreCdnFolderFromZip(zip);

        populateImagesSection();
      } catch (err) {
        console.error('Image import failed:', err);
        alert('Import failed: ' + err.message);
      } finally {
        importBtn.textContent = 'Import Images';
        importBtn.disabled = false;
        importFile.value = '';
      }
    });
  }


};

const bindImageSettingsListeners = () => {
  bindImageSyncListeners();
  bindPatternRuleModeListeners();
  bindCardAndTableImageListeners();
  bindImageImportExportListeners();
};

/**
 * Render the backup list for a cloud provider.
 */
const renderCloudBackupList = (provider, backups) => {
  const listEl = document.getElementById('cloudBackupList_' + provider);
  if (!listEl) return;

  if (!backups || backups.length === 0) {
    listEl.style.display = '';
    listEl.innerHTML = '<div class="cloud-backup-empty">No backups found</div>';
    return;
  }

  listEl.style.display = '';
  // nosemgrep: javascript.browser.security.insecure-innerhtml.insecure-innerhtml
  listEl.innerHTML = backups.map(function (b) {
    const d = new Date(b.server_modified);
    const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const sizeStr = b.size < 1024 ? b.size + ' B' :
      b.size < 1048576 ? (b.size / 1024).toFixed(0) + ' KB' :
        (b.size / 1048576).toFixed(1) + ' MB';
    return '<button class="cloud-backup-entry" data-provider="' + sanitizeHtml(provider) +
      '" data-filename="' + sanitizeHtml(b.name) + '" data-size="' + b.size + '">' +
      '<span class="cloud-backup-date">' + sanitizeHtml(dateStr) + '</span>' +
      '<span class="cloud-backup-size">' + sanitizeHtml(sizeStr) + '</span>' +
      '</button>';
  }).join('');
};

/**
 * Wires cloud storage connect/disconnect/backup/restore buttons.
 */
const bindCloudCacheListeners = () => {
  // Session-only password cache — no toggle needed, auto-caches on first use
};

/**
 * Perform a cached-password cloud backup (encrypt + upload, no vault modal).
 */
const _cloudBackupWithCachedPw = async (provider, password, btn) => {
  var origHtml = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = 'Encrypting\u2026';
  try {
    var payload = typeof collectVaultData === 'function' ? collectVaultData() : null;
    if (!payload) throw new Error('No data to export.');
    var plaintext = new TextEncoder().encode(JSON.stringify(payload));
    var salt = vaultRandomBytes(32);
    var iv = vaultRandomBytes(12);
    var key = await vaultDeriveKey(password, salt, VAULT_PBKDF2_ITERATIONS);
    var ciphertext = await vaultEncrypt(plaintext, key, iv);
    var fileBytes = serializeVaultFile(salt, iv, VAULT_PBKDF2_ITERATIONS, ciphertext);

    btn.textContent = 'Uploading\u2026';
    await cloudUploadVault(provider, fileBytes);
    if (typeof showCloudToast === 'function') showCloudToast('Backup complete.');
    if (typeof showKrakenToastIfFirst === 'function') showKrakenToastIfFirst();
  } catch (err) {
    alert('Backup failed: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = origHtml;
  }
};

/**
 * Perform a cached-password cloud restore (decrypt + restore, no vault modal).
 */
const _cloudRestoreWithCachedPw = async (provider, password, fileBytes) => {
  try {
    var parsed = parseVaultFile(new Uint8Array(fileBytes));
    var key = await vaultDeriveKey(password, parsed.salt, parsed.iterations);
    var plaintext = await vaultDecrypt(parsed.ciphertext, key, parsed.iv);
    var json = JSON.parse(new TextDecoder().decode(plaintext));
    restoreVaultData(json);
    if (typeof showCloudToast === 'function') showCloudToast('Restore complete. Reloading\u2026');
    setTimeout(function () { location.reload(); }, 1200);
  } catch (err) {
    alert('Decryption failed. Opening password prompt.');
    openVaultModal('cloud-import', {
      provider: provider,
      fileBytes: fileBytes,
    });
  }
};

const bindCloudStorageListeners = () => {
  var panel = document.getElementById('settingsPanel_cloud');
  if (!panel) return;

  bindCloudCacheListeners();

  panel.addEventListener('click', async function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var provider = btn.dataset.provider;
    if (!provider) return;

    if (btn.classList.contains('cloud-connect-btn')) {
      if (typeof cloudAuthStart === 'function') cloudAuthStart(provider);

    } else if (btn.classList.contains('cloud-disconnect-btn')) {
      if (typeof cloudDisconnect === 'function') cloudDisconnect(provider);

    } else if (btn.classList.contains('cloud-backup-btn')) {
      var backupOrigHtml = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Checking\u2026';
      try {
        // Check for conflicts
        var conflict = await cloudCheckConflict(provider);
        if (conflict.conflict) {
          var rd = new Date(conflict.remote.timestamp);
          var remoteInfo = rd.toLocaleDateString() + ' ' + rd.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
          if (conflict.remote.itemCount) remoteInfo += ' (' + conflict.remote.itemCount + ' items)';
          if (!confirm('A newer backup exists on the server:\n' + remoteInfo +
            '\n\nOverwrite with current local data?')) {
            return;
          }
        }
        // Try cached password
        var cachedPw = typeof cloudGetCachedPassword === 'function' ? cloudGetCachedPassword(provider) : null;
        if (cachedPw) {
          await _cloudBackupWithCachedPw(provider, cachedPw, btn);
          return;
        }
        // Open vault modal for password entry
        openVaultModal('cloud-export', { provider: provider });
        if (typeof showKrakenToastIfFirst === 'function') showKrakenToastIfFirst();
      } catch (err) {
        alert('Conflict check failed: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = backupOrigHtml;
      }

    } else if (btn.classList.contains('cloud-restore-btn')) {
      // Toggle backup list
      var listEl = document.getElementById('cloudBackupList_' + provider);
      if (listEl && listEl.style.display !== 'none' && listEl.innerHTML) {
        listEl.style.display = 'none';
        listEl.innerHTML = '';
        return;
      }

      var restoreOrigHtml = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Loading\u2026';
      try {
        var backups = await cloudListBackups(provider);
        renderCloudBackupList(provider, backups);
      } catch (err) {
        alert('Failed to list backups: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = restoreOrigHtml;
      }

    } else if (btn.classList.contains('cloud-backup-entry')) {
      // Clicked a specific backup to restore
      var filename = btn.dataset.filename;
      var size = parseInt(btn.dataset.size, 10) || 0;
      var sizeStr = size < 1024 ? size + ' B' : size < 1048576 ? (size / 1024).toFixed(0) + ' KB' : (size / 1048576).toFixed(1) + ' MB';
      if (!confirm('Restore "' + filename + '" (' + sizeStr + ')?\n\nThis will overwrite all local data.')) return;
      btn.disabled = true;
      btn.textContent = 'Downloading\u2026';
      try {
        var fileBytes = await cloudDownloadVaultByName(provider, filename);
        // Try cached password
        var cachedPw = typeof cloudGetCachedPassword === 'function' ? cloudGetCachedPassword(provider) : null;
        if (cachedPw) {
          await _cloudRestoreWithCachedPw(provider, cachedPw, fileBytes);
          return;
        }
        openVaultModal('cloud-import', {
          provider: provider,
          fileBytes: fileBytes,
          filename: filename,
          size: size,
        });
      } catch (err) {
        alert('Download failed: ' + err.message);
      } finally {
        // Re-render the list to restore button state
        var parentList = btn.closest('.cloud-backup-list');
        if (parentList) {
          try {
            var refreshed = await cloudListBackups(provider);
            renderCloudBackupList(provider, refreshed);
          } catch (_) { /* ignore */ }
        }
      }
    }
  });
};

/**
 * Wires up all Settings modal event listeners.
 * Called once during initialization.
 */
const setupSettingsEventListeners = () => {
  bindSettingsNavigationListeners();
  bindAppearanceAndHeaderListeners();
  bindFilterAndNumistaListeners();
  bindNumistaBulkSyncListeners();
  bindSettingsModalShellListeners();
  bindGoldbackToggleListeners();
  bindGoldbackActionListeners();
  bindImageSettingsListeners();
  bindCloudStorageListeners();
};

if (typeof window !== 'undefined') {
  window.setupSettingsEventListeners = setupSettingsEventListeners;
}

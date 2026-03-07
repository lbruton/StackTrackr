/**
 * DiffModal — Reusable change-review modal for StakTrakr (STAK-184)
 *
 * Displays categorized item diffs (added/modified/deleted) with per-item
 * checkboxes, optional conflict resolution, optional settings diff, and
 * Select All / Deselect All controls. Works for three callers:
 *   1. Cloud sync pull (manifest-first or vault-first)
 *   2. CSV import
 *   3. JSON import
 *
 * Dependencies: utils.js (sanitizeHtml, safeGetElement, openModalById, closeModalById)
 * Optional:    DiffEngine.computeItemKey() for key derivation
 *
 * @module diff-modal
 */

/* eslint-disable no-var */
/* global safeGetElement, sanitizeHtml, openModalById, closeModalById, DiffEngine */

(function () {
  'use strict';

  // ── Constants ──
  var MODAL_ID = 'diffReviewModal';

  // ── Settings categories for grouped display ──
  var SETTINGS_CATEGORIES = {
    'Display & Appearance': {
      icon: '\uD83C\uDFA8',
      keys: ['displayCurrency','appTheme','cardViewStyle','desktopCardView','defaultSortColumn','defaultSortDir','showRealizedGainLoss','metalOrderConfig','settingsItemsPerPage','appTimeZone']
    },
    'Chips & Filters': {
      icon: '\uD83C\uDFF7\uFE0F',
      keys: ['inlineChipConfig','filterChipCategoryConfig','viewModalSectionConfig','chipMinCount','chipMaxCount','chipCustomGroups','chipBlacklist','chipSortOrder']
    },
    'Layout': {
      icon: '\uD83D\uDCD0',
      keys: ['layoutSectionConfig','tableImagesEnabled','tableImageSides']
    },
    'Tags': {
      icon: '\uD83D\uDD16',
      keys: ['tagBlacklist']
    },
    'Header Buttons': {
      icon: '\uD83D\uDD18',
      keys: ['headerThemeBtnVisible','headerCurrencyBtnVisible','headerTrendBtnVisible','headerSyncBtnVisible','headerMarketBtnVisible','headerVaultBtnVisible','headerRestoreBtnVisible','headerCloudSyncBtnVisible','headerBtnShowText','headerBtnOrder','headerAboutBtnVisible']
    },
    'Goldback & Providers': {
      icon: '\uD83E\uDE99',
      keys: ['goldback-enabled','goldback-estimate-enabled','goldback-estimate-modifier','enabledSeedRules','apiProviderOrder','providerPriority']
    },
    'Numista': {
      icon: '\uD83D\uDCDA',
      keys: ['numista_tags_auto','numistaLookupRules','numistaViewFields']
    }
  };

  var SETTINGS_LABELS = {
    'displayCurrency': 'Display Currency',
    'appTheme': 'Theme',
    'cardViewStyle': 'Card View Style',
    'desktopCardView': 'Desktop Card View',
    'defaultSortColumn': 'Default Sort Column',
    'defaultSortDir': 'Default Sort Direction',
    'showRealizedGainLoss': 'Show Realized Gain/Loss',
    'metalOrderConfig': 'Metal Order',
    'settingsItemsPerPage': 'Items Per Page',
    'appTimeZone': 'Time Zone',
    'inlineChipConfig': 'Inline Chips',
    'filterChipCategoryConfig': 'Filter Chip Categories',
    'viewModalSectionConfig': 'View Modal Sections',
    'chipMinCount': 'Chip Min Count',
    'chipMaxCount': 'Chip Max Count',
    'chipCustomGroups': 'Custom Chip Groups',
    'chipBlacklist': 'Hidden Chips',
    'chipSortOrder': 'Chip Sort Order',
    'layoutSectionConfig': 'Section Layout',
    'tableImagesEnabled': 'Table Images',
    'tableImageSides': 'Table Image Sides',
    'tagBlacklist': 'Hidden Tags',
    'headerThemeBtnVisible': 'Theme Button',
    'headerCurrencyBtnVisible': 'Currency Button',
    'headerTrendBtnVisible': 'Trend Button',
    'headerSyncBtnVisible': 'Sync Button',
    'headerMarketBtnVisible': 'Market Button',
    'headerVaultBtnVisible': 'Vault Button',
    'headerRestoreBtnVisible': 'Restore Button',
    'headerCloudSyncBtnVisible': 'Cloud Sync Button',
    'headerBtnShowText': 'Button Labels',
    'headerBtnOrder': 'Button Order',
    'headerAboutBtnVisible': 'About Button',
    'goldback-enabled': 'Goldback Enabled',
    'goldback-estimate-enabled': 'Goldback Estimates',
    'goldback-estimate-modifier': 'Estimate Modifier',
    'enabledSeedRules': 'Seed Rules',
    'apiProviderOrder': 'Provider Order',
    'providerPriority': 'Provider Priority',
    'numista_tags_auto': 'Auto-Tag on Lookup',
    'numistaLookupRules': 'Lookup Rules',
    'numistaViewFields': 'View Fields',
    'metalApiConfig': 'API Keys'
  };

  function _groupByItem(conflictsArray) {
    var grouped = {};
    if (!conflictsArray || !conflictsArray.length) return grouped;
    for (var i = 0; i < conflictsArray.length; i++) {
      var c = conflictsArray[i];
      var name = c.itemName || c.itemKey || '';
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push({ field: c.field, localVal: c.localVal, remoteVal: c.remoteVal, idx: i });
    }
    return grouped;
  }

  function _formatSettingValue(key, value) {
    if (key === 'metalApiConfig') return value ? '\u2022\u2022\u2022 configured' : 'not set';
    if (value === null || value === undefined) return '\u2014';
    if (typeof value === 'boolean') return value ? 'On' : 'Off';
    if (Array.isArray(value)) {
      var label = value.length + ' items';
      if (value.length > 0 && typeof value[0] === 'string') {
        var preview = value.slice(0, 2).join(', ');
        if (value.length > 2) preview += ', \u2026';
        label += ' (' + _esc(preview) + ')';
      }
      return label;
    }
    if (typeof value === 'object') return Object.keys(value).length + ' entries';
    return _esc(String(value));
  }

  // ── Internal state ──
  var _options = null;
  var _checkedItems = {};      // { 'added-0': true, 'modified-2': false, ... }
  var _checkedFields = {};      // { 'modified-0-purchasePrice': true, ... }
  var _conflictResolutions = {}; // { 'c0': 'local'|'remote', ... }
  var _collapsedCategories = {}; // { added: true, ... }
  var _expandedModified = {};    // { 0: true, 1: false, ... }
  var _expandedSettingsCategories = {}; // { 'Display & Appearance': true, ... }
  var _selectAllState = 0;  // 0=none, 1=added+modified, 2=all
  var _showAllItems = {};    // { added: true, deleted: true, modified: true }

  // ── Helpers ──

  /** Safe HTML escape — falls back to inline if sanitizeHtml not loaded */
  function _esc(text) {
    if (typeof sanitizeHtml === 'function') return sanitizeHtml(text);
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _titleCase(key) {
    return key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  }

  /** Derive a display key for an item */
  function _itemKey(item) {
    if (typeof DiffEngine !== 'undefined' && DiffEngine.computeItemKey) {
      return DiffEngine.computeItemKey(item);
    }
    return String(item.serial || item.name || '');
  }

  /** Count currently checked items */
  function _checkedCount() {
    var count = 0;
    var diff = _options ? _options.diff || {} : {};
    for (var k in _checkedItems) {
      if (!_checkedItems.hasOwnProperty(k) || !_checkedItems[k]) continue;
      // For modified items, count individual fields instead of the whole item
      if (k.indexOf('modified-') === 0) {
        var mIdx = parseInt(k.split('-')[1], 10);
        var modItem = (diff.modified || [])[mIdx];
        if (modItem) {
          var changes = modItem.changes || [];
          for (var c = 0; c < changes.length; c++) {
            if (_checkedFields['modified-' + mIdx + '-' + changes[c].field] !== false) {
              count++;
            }
          }
        }
      } else {
        count++;
      }
    }
    return count;
  }

  /**
   * Compute the projected inventory count after applying selected changes.
   * Formula: localCount + selectedAdded - selectedDeleted
   * (modified items do not change net count)
   */
  function _computeProjectedCount() {
    if (!_options) return 0;
    const localCount = _options.localCount != null ? _options.localCount : 0;
    const diff = _options.diff || {};
    const added = diff.added || [];
    const deleted = diff.deleted || [];
    let selectedAdded = 0;
    let selectedDeleted = 0;
    for (let a = 0; a < added.length; a++) {
      if (_checkedItems['added-' + a] !== false) selectedAdded++;
    }
    for (let d = 0; d < deleted.length; d++) {
      if (_checkedItems['deleted-' + d] !== false) selectedDeleted++;
    }
    return localCount + selectedAdded - selectedDeleted;
  }

  /**
   * Update the count row and warning div in the modal header.
   * Only renders when backupCount and localCount are both provided.
   * Also calls onSelectionChange if provided.
   */
  function _updateCountRow() {
    if (!_options) return;
    const backupCount = _options.backupCount;
    const localCount = _options.localCount;
    const countRowEl = safeGetElement('diffReviewCountRow');
    const warningEl = safeGetElement('diffReviewCountWarning');

    if (backupCount != null && localCount != null) {
      const projectedCount = _computeProjectedCount();

      if (countRowEl) {
        countRowEl.innerHTML = 'Backup: <strong>' + backupCount + '</strong> items'
          + ' &nbsp;|&nbsp; Current: <strong>' + localCount + '</strong> items'
          + ' &nbsp;|&nbsp; After import: <strong>' + projectedCount + '</strong>';
        countRowEl.style.display = '';
      }

      if (warningEl) {
        const missing = backupCount - projectedCount;
        if (missing > 0) {
          warningEl.textContent = missing + ' item' + (missing > 1 ? 's' : '') + ' from the backup will not be imported (e.g., skipped due to validation errors, not selected, or already present locally).';
          warningEl.style.display = '';
        } else {
          warningEl.textContent = '';
          warningEl.style.display = 'none';
        }
      }

      // Fire onSelectionChange callback if provided
      if (typeof _options.onSelectionChange === 'function') {
        const selected = _buildSelectedChanges();
        _options.onSelectionChange(selected, projectedCount);
      }
    } else {
      if (countRowEl) countRowEl.style.display = 'none';
      if (warningEl) warningEl.style.display = 'none';
    }
  }

  /** Get the header title based on source type */
  function _getTitle(source) {
    if (!source) return 'Review Changes';
    switch (source.type) {
      case 'sync': return 'Review Sync Changes';
      case 'csv':  return 'Review CSV Import';
      case 'json': return 'Review JSON Import';
      default:     return 'Review Changes';
    }
  }

  /** Get source icon HTML entity */
  function _getSourceIcon(source) {
    if (!source) return '';
    switch (source.type) {
      case 'sync': return '&#9729; ';  // cloud
      case 'csv':  return '&#128196; '; // page
      case 'json': return '&#128230; '; // package
      default:     return '';
    }
  }

  // ── Rendering ──

  function _renderSummaryDashboard(container, diff, conflicts) {
    if (!container) return;
    var matched = (diff.unchanged || []).length;
    var conflictCount = (conflicts && conflicts.conflicts || []).length;
    var remoteOnly = (diff.added || []).length;
    var localOnly = (diff.deleted || []).length;

    var cards = [
      { count: matched, label: 'Matched', target: 'diffSectionModified', color: '', style: 'opacity:0.5' },
      { count: conflictCount, label: 'Conflicts', target: 'diffSectionConflicts', color: conflictCount > 0 ? 'color:#d97706' : '', style: '' },
      { count: remoteOnly, label: 'Remote Only', target: 'diffSectionModified', color: '', style: '' },
      { count: localOnly, label: 'Local Only', target: 'diffSectionModified', color: '', style: '' }
    ];

    var cardStyle = 'flex:1;min-width:120px;border-radius:8px;padding:0.6rem;border:1px solid var(--border-color,#ddd);cursor:pointer;text-align:center';
    var html = '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin:0.75rem 0">';
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var numStyle = 'font-size:1.4rem;font-weight:700';
      if (card.style) numStyle += ';' + card.style;
      if (card.color) numStyle += ';' + card.color;
      html += '<div data-scroll-target="' + _esc(card.target) + '" style="' + cardStyle + '">';
      html += '<div style="' + numStyle + '">' + card.count + '</div>';
      html += '<div style="font-size:0.7rem;opacity:0.6">' + _esc(card.label) + '</div>';
      html += '</div>';
    }
    html += '</div>';

    container.innerHTML = html;
    container.onclick = function(e) {
      var target = e.target.closest('[data-scroll-target]');
      if (target) {
        var el = safeGetElement(target.getAttribute('data-scroll-target'));
        if (el instanceof HTMLElement) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
  }

  function _renderProgressTracker(container, conflicts, source) {
    if (!container) return;
    if (!source || source.type !== 'sync') {
      container.style.display = 'none';
      return;
    }

    var total = 0;
    var resolved = 0;
    for (var key in _conflictResolutions) {
      if (_conflictResolutions.hasOwnProperty(key) && key.charAt(0) === 'c' && key.indexOf('setting-') !== 0) {
        total++;
        if (_conflictResolutions[key]) resolved++;
      }
    }

    var pct = total > 0 ? Math.round((resolved / total) * 100) : 100;
    var html = '<div style="height:6px;border-radius:3px;background:var(--border-color,#ddd);margin:0.5rem 0">';
    html += '<div style="height:100%;border-radius:3px;background:#22c55e;width:' + pct + '%;transition:width 0.3s"></div>';
    html += '</div>';
    html += '<div id="diffProgressText" style="font-size:0.75rem;opacity:0.6">' + resolved + ' of ' + total + ' conflicts resolved';
    if (pct === 100 && total > 0) html += ' &#9989;';
    html += '</div>';

    container.innerHTML = html;
    container.style.display = '';
  }

  function _updateProgress() {
    var container = safeGetElement('diffProgressTracker');
    if (!container) return;

    var total = 0;
    var resolved = 0;
    for (var key in _conflictResolutions) {
      if (_conflictResolutions.hasOwnProperty(key) && key.charAt(0) === 'c' && key.indexOf('setting-') !== 0) {
        total++;
        if (_conflictResolutions[key]) resolved++;
      }
    }

    var pct = total > 0 ? Math.round((resolved / total) * 100) : 100;
    var bar = container.querySelector('div > div');
    if (bar) bar.style.width = pct + '%';

    var textDiv = safeGetElement('diffProgressText');
    if (!(textDiv instanceof HTMLElement)) textDiv = null;
    if (textDiv) {
      var txt = resolved + ' of ' + total + ' conflicts resolved';
      if (pct === 100 && total > 0) txt += ' \u2705';
      textDiv.textContent = txt;
    }
  }

  function _renderConflictCards(container, conflicts) {
    if (!container) return;
    if (!conflicts || !conflicts.conflicts || conflicts.conflicts.length === 0) {
      container.style.display = 'none';
      return;
    }

    var grouped = _groupByItem(conflicts.conflicts);
    var html = '';

    for (var itemName in grouped) {
      if (!grouped.hasOwnProperty(itemName)) continue;
      var fields = grouped[itemName];

      html += '<div data-conflict-card="' + _esc(itemName) + '" style="border-radius:8px;border:1px solid var(--border-color,#ddd);padding:0.75rem;margin-bottom:0.75rem">';

      // Card header
      html += '<div>';
      html += '<span style="font-weight:600;font-size:0.85rem">' + _esc(itemName) + '</span>';
      html += '<span style="display:inline-block;background:rgba(217,119,6,0.1);color:#d97706;border-radius:12px;padding:0.1rem 0.5rem;font-size:0.7rem;margin-left:0.5rem">' + fields.length + ' field' + (fields.length !== 1 ? 's' : '') + '</span>';
      html += '</div>';

      // Field rows
      for (var f = 0; f < fields.length; f++) {
        var conflict = fields[f];
        var resKey = 'c' + conflict.idx + '-' + conflict.field;
        var selected = _conflictResolutions[resKey] || '';
        var localStyle = 'padding:0.25rem 0.6rem;border-radius:4px;cursor:pointer;font-size:0.8rem;';
        var remoteStyle = 'padding:0.25rem 0.6rem;border-radius:4px;cursor:pointer;font-size:0.8rem;';

        if (selected === 'local') {
          localStyle += 'border:1px solid #22c55e;background:rgba(34,197,94,0.08)';
          remoteStyle += 'border:1px solid transparent';
        } else if (selected === 'remote') {
          localStyle += 'border:1px solid transparent';
          remoteStyle += 'border:1px solid #22c55e;background:rgba(34,197,94,0.08)';
        } else {
          localStyle += 'border:1px solid transparent';
          remoteStyle += 'border:1px solid transparent';
        }

        var localDisplay = _esc(String(conflict.localVal != null ? conflict.localVal : '\u2014'));
        var remoteDisplay = _esc(String(conflict.remoteVal != null ? conflict.remoteVal : '\u2014'));

        html += '<div style="display:flex;align-items:center;gap:0.4rem;padding:0.3rem 0">';
        html += '<span style="min-width:100px;font-size:0.78rem;opacity:0.6">' + _esc(conflict.field) + '</span>';
        html += '<span data-resolution="' + _esc(resKey) + '" data-side="local" style="' + localStyle + '">' + localDisplay + '</span>';
        html += '<span style="opacity:0.3;font-size:0.7rem">\u21C4</span>';
        html += '<span data-resolution="' + _esc(resKey) + '" data-side="remote" style="' + remoteStyle + '">' + remoteDisplay + '</span>';
        html += '</div>';
      }

      html += '</div>';
    }

    container.innerHTML = html;

    container.onclick = function(e) {
      var btn = e.target.closest('[data-resolution]');
      if (!btn) return;
      var key = btn.getAttribute('data-resolution');
      var side = btn.getAttribute('data-side');
      _conflictResolutions[key] = side;
      _renderConflictCards(container, conflicts);
      if (typeof _updateProgress === 'function') _updateProgress();
    };

    container.style.display = '';
  }

  function _renderSettingsCards(container, settingsDiff) {
    if (!container) return;
    var changed = (settingsDiff && settingsDiff.changed) ? settingsDiff.changed : [];
    var matched = (settingsDiff && (settingsDiff.unchanged || settingsDiff.matched)) ? (settingsDiff.unchanged || settingsDiff.matched) : [];
    if (changed.length === 0 && matched.length === 0) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    // Build category lookup for each entry
    var catNames = Object.keys(SETTINGS_CATEGORIES);
    function _findCategory(key) {
      for (var ci = 0; ci < catNames.length; ci++) {
        var cat = SETTINGS_CATEGORIES[catNames[ci]];
        for (var ki = 0; ki < cat.keys.length; ki++) {
          if (cat.keys[ki] === key) return catNames[ci];
        }
      }
      return 'Other';
    }

    // Group changed and matched by category
    var changedByCat = {};
    var matchedByCat = {};
    var i;
    for (i = 0; i < changed.length; i++) {
      var cCat = _findCategory(changed[i].key);
      if (!changedByCat[cCat]) changedByCat[cCat] = [];
      changedByCat[cCat].push(changed[i]);
    }
    for (i = 0; i < matched.length; i++) {
      var mCat = _findCategory(matched[i].key);
      if (!matchedByCat[mCat]) matchedByCat[mCat] = [];
      matchedByCat[mCat].push(matched[i]);
    }

    // Collect all categories that have entries
    var allCats = {};
    var catKey;
    for (catKey in changedByCat) {
      if (changedByCat.hasOwnProperty(catKey)) allCats[catKey] = true;
    }
    for (catKey in matchedByCat) {
      if (matchedByCat.hasOwnProperty(catKey)) allCats[catKey] = true;
    }

    var html = '';
    var renderedCount = 0;

    for (catKey in allCats) {
      if (!allCats.hasOwnProperty(catKey)) continue;
      var catChanged = changedByCat[catKey] || [];
      var catMatched = matchedByCat[catKey] || [];
      if (catChanged.length === 0 && catMatched.length === 0) continue;

      var catDef = SETTINGS_CATEGORIES[catKey];
      var catIcon = catDef ? catDef.icon : '\u2699\uFE0F';

      html += '<div style="border-radius:8px;border:1px solid var(--border-color,#ddd);padding:0.75rem;margin-bottom:0.75rem">';

      // Card header
      html += '<div style="display:flex;align-items:center">';
      html += '<span style="font-weight:600;font-size:0.85rem">' + catIcon + ' ' + _esc(catKey) + '</span>';
      if (catChanged.length > 0) {
        html += '<span style="display:inline-block;background:rgba(217,119,6,0.1);color:#d97706;border-radius:12px;padding:0.1rem 0.5rem;font-size:0.7rem;margin-left:0.5rem">' + catChanged.length + ' diff' + (catChanged.length !== 1 ? 's' : '') + '</span>';
      }
      html += '</div>';

      // Changed setting rows
      for (var ci2 = 0; ci2 < catChanged.length; ci2++) {
        var entry = catChanged[ci2];
        var resKey = 'setting-' + entry.key;
        var selected = _conflictResolutions[resKey] || '';
        var localBtnStyle = 'padding:0.25rem 0.6rem;border-radius:4px;cursor:pointer;font-size:0.8rem;';
        var remoteBtnStyle = 'padding:0.25rem 0.6rem;border-radius:4px;cursor:pointer;font-size:0.8rem;';

        if (selected === 'local') {
          localBtnStyle += 'border:1px solid #22c55e;background:rgba(34,197,94,0.08)';
          remoteBtnStyle += 'border:1px solid transparent';
        } else if (selected === 'remote') {
          localBtnStyle += 'border:1px solid transparent';
          remoteBtnStyle += 'border:1px solid #22c55e;background:rgba(34,197,94,0.08)';
        } else {
          localBtnStyle += 'border:1px solid transparent';
          remoteBtnStyle += 'border:1px solid transparent';
        }

        var label = SETTINGS_LABELS[entry.key] || _titleCase(entry.key);

        html += '<div style="display:flex;align-items:center;gap:0.4rem;padding:0.3rem 0">';
        html += '<span style="min-width:120px;font-size:0.78rem;opacity:0.6">' + _esc(label) + '</span>';
        html += '<span data-setting-resolution="' + _esc(resKey) + '" data-side="local" style="' + localBtnStyle + '">' + _formatSettingValue(entry.key, entry.localVal) + '</span>';
        html += '<span style="opacity:0.3;font-size:0.7rem">\u21C4</span>';
        html += '<span data-setting-resolution="' + _esc(resKey) + '" data-side="remote" style="' + remoteBtnStyle + '">' + _formatSettingValue(entry.key, entry.remoteVal) + '</span>';
        html += '</div>';
      }

      // Matched settings section (collapsed by default)
      if (catMatched.length > 0) {
        var isExpanded = _expandedSettingsCategories[catKey] || false;
        html += '<div data-toggle-matched="' + _esc(catKey) + '" style="font-size:0.73rem;cursor:pointer;color:var(--primary,#3b82f6);margin-top:0.3rem">';
        html += (isExpanded ? 'Hide' : 'Show') + ' ' + catMatched.length + ' matched';
        html += '</div>';

        if (isExpanded) {
          for (var mi = 0; mi < catMatched.length; mi++) {
            var mEntry = catMatched[mi];
            var mLabel = SETTINGS_LABELS[mEntry.key] || _titleCase(mEntry.key);
            html += '<div style="display:flex;align-items:center;gap:0.4rem;padding:0.2rem 0;opacity:0.6">';
            html += '<span style="font-size:0.78rem">\u2713</span>';
            html += '<span style="min-width:120px;font-size:0.78rem">' + _esc(mLabel) + '</span>';
            html += '<span style="font-size:0.78rem">both: ' + _formatSettingValue(mEntry.key, mEntry.localVal) + '</span>';
            html += '</div>';
          }
        }
      }

      html += '</div>';
      renderedCount++;
    }

    container.innerHTML = html;
    container.style.display = renderedCount > 0 ? '' : 'none';

    // Event delegation
    container.onclick = function(e) {
      var btn = e.target.closest('[data-setting-resolution]');
      if (btn) {
        var key = btn.getAttribute('data-setting-resolution');
        var side = btn.getAttribute('data-side');
        _conflictResolutions[key] = side;
        _renderSettingsCards(container, settingsDiff);
        return;
      }
      var toggle = e.target.closest('[data-toggle-matched]');
      if (toggle) {
        var cat = toggle.getAttribute('data-toggle-matched');
        _expandedSettingsCategories[cat] = !_expandedSettingsCategories[cat];
        _renderSettingsCards(container, settingsDiff);
      }
    };
  }

  function _updateApplyButton() {
    var applyBtn = safeGetElement('diffReviewApplyBtn');
    if (!applyBtn) return;
    var count = _checkedCount();
    var hasSelectableItems = Object.keys(_checkedItems).length > 0;
    var hasSettings = _options && _options.settingsDiff && _options.settingsDiff.changed && _options.settingsDiff.changed.length > 0;
    applyBtn.textContent = count > 0 ? 'Apply (' + count + ')' : 'Apply';
    applyBtn.disabled = hasSelectableItems && count === 0 && !hasSettings;
    applyBtn.style.opacity = (hasSelectableItems && count === 0 && !hasSettings) ? '0.4' : '';
  }

  function _render() {
    if (!_options) return;

    var titleEl = safeGetElement('diffReviewTitle');
    var sourceEl = safeGetElement('diffReviewSource');

    var diff = _options.diff || {};
    var added = diff.added || [];
    var modified = diff.modified || [];
    var deleted = diff.deleted || [];
    var conflicts = _options.conflicts;
    var meta = _options.meta;
    var source = _options.source || {};

    // Title
    if (titleEl) titleEl.textContent = _getTitle(source);

    // Source badge + meta
    if (sourceEl) {
      var sourceHtml = '<div style="display:inline-flex;align-items:center;gap:0.35rem;font-size:0.78rem;font-weight:500;padding:0.2rem 0.55rem;border-radius:6px;background:rgba(59,130,246,0.12);color:var(--primary,#3b82f6)">';
      sourceHtml += _getSourceIcon(source) + _esc(source.label || '');
      sourceHtml += '</div>';

      // Meta row (sync only)
      if (meta && source.type === 'sync') {
        sourceHtml += '<div class="cloud-sync-update-meta" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:0.5rem;margin-top:0.6rem;padding:0.5rem 0.65rem;border-radius:8px;background:var(--bg-secondary,var(--bg-elev-1,#f1f5f9));font-size:0.8rem">';
        sourceHtml += _metaCell('Remote Items', meta.itemCount != null ? String(meta.itemCount) : '\u2014');
        if (typeof inventory !== 'undefined') {
          sourceHtml += _metaCell('Local Items', String(inventory.length));
        }
        sourceHtml += _metaCell('Device', meta.deviceId ? meta.deviceId.slice(0, 8) + '\u2026' : 'unknown');
        sourceHtml += _metaCell('Version', meta.appVersion ? 'v' + meta.appVersion : '\u2014');
        sourceHtml += '</div>';
      }

      sourceEl.innerHTML = sourceHtml;
    }

    // Count row (backup import flow only)
    _updateCountRow();

    // Summary dashboard (replaces old summary chips)
    _renderSummaryDashboard(safeGetElement('diffSummaryDashboard'), diff, conflicts);

    // Progress tracker (sync only)
    _renderProgressTracker(safeGetElement('diffProgressTracker'), conflicts, source);

    // Conflict cards (replaces old inline conflict rendering)
    _renderConflictCards(safeGetElement('diffSectionConflicts'), conflicts);

    // Item cards — Added and Deleted render to #diffSectionOrphans
    var orphanEl = safeGetElement('diffSectionOrphans');
    if (orphanEl) {
      var orphanHtml = '';
      orphanHtml += _renderItemCards(orphanEl, added, 'added', 'Added');
      orphanHtml += _renderItemCards(orphanEl, deleted, 'deleted', 'Deleted');
      if (orphanHtml) {
        orphanEl.style.display = '';
        orphanEl.innerHTML = orphanHtml;
      } else {
        orphanEl.style.display = 'none';
        orphanEl.innerHTML = '';
      }
    }

    // Item cards — Modified renders to #diffSectionModified
    var modEl = safeGetElement('diffSectionModified');
    if (modEl) {
      var modHtml = _renderModifiedCards(modEl, modified);
      if (modHtml) {
        modEl.style.display = '';
        modEl.innerHTML = modHtml;
      } else {
        modEl.style.display = 'none';
        modEl.innerHTML = '';
      }
    }

    // No changes message
    if (added.length + modified.length + deleted.length === 0) {
      var noChangesHtml = '<div style="padding:2rem;text-align:center;opacity:0.45;font-size:0.85rem">No item changes detected</div>';
      if (modEl) { modEl.style.display = ''; modEl.innerHTML = noChangesHtml; }
    }

    // Set indeterminate state on master checkboxes (must happen after innerHTML)
    var modal = safeGetElement('diffReviewModal');
    if (modal) {
      var indets = modal.querySelectorAll('[data-indeterminate="true"]');
      for (var ii = 0; ii < indets.length; ii++) {
        indets[ii].indeterminate = true;
      }
    }

    // Async image loading
    _loadItemImages();

    // Settings cards (replaces old settings <details>)
    _renderSettingsCards(safeGetElement('diffReviewSettings'), _options.settingsDiff);

    // Apply button
    _updateApplyButton();
  }

  /** Render a meta cell for the source info row */
  function _metaCell(label, value) {
    return '<div style="display:flex;flex-direction:column;gap:0.1rem">'
      + '<span style="font-size:0.65rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.05em">' + _esc(label) + '</span>'
      + '<strong style="font-weight:600">' + _esc(value) + '</strong>'
      + '</div>';
  }

  /** Color configs per category */
  var _catColors = {
    added:   { bg: 'rgba(5,150,105,0.12)', color: 'var(--success,#059669)' },
    modified:{ bg: 'rgba(217,119,6,0.12)',  color: 'var(--warning,#d97706)' },
    deleted: { bg: 'rgba(220,38,38,0.12)',  color: 'var(--danger,#dc2626)' }
  };


  /** Metal emoji for item card image placeholders */
  function _metalEmoji(metal) {
    var m = (metal || '').toLowerCase();
    if (m === 'gold') return '\uD83E\uDE99';
    if (m === 'silver') return '\uD83E\uDE99';
    if (m === 'platinum') return '\uD83E\uDE99';
    if (m === 'palladium') return '\uD83E\uDE99';
    return '\uD83E\uDE99';
  }

  /** Background color per metal for card image area */
  function _metalBgColor(metal) {
    var m = (metal || '').toLowerCase();
    if (m === 'gold') return 'rgba(255,215,0,0.12)';
    if (m === 'silver') return 'rgba(192,192,192,0.12)';
    if (m === 'platinum') return 'rgba(229,228,226,0.12)';
    if (m === 'palladium') return 'rgba(206,208,206,0.12)';
    return 'rgba(255,255,255,0.06)';
  }

  /** Text color per metal for card image area */
  function _metalTextColor(metal) {
    var m = (metal || '').toLowerCase();
    if (m === 'gold') return 'var(--gold,#FFD700)';
    if (m === 'silver') return 'var(--silver,#C0C0C0)';
    if (m === 'platinum') return 'var(--platinum,#E5E4E2)';
    if (m === 'palladium') return 'var(--palladium,#CED0CE)';
    return 'var(--text-secondary)';
  }

  /** Render Added or Deleted items as bordered cards */
  function _renderItemCards(container, items, type, label) {
    if (!container || !items || items.length === 0) {
      if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
      }
      return '';
    }

    var cc = _catColors[type];
    var collapsed = _collapsedCategories[type];
    var icon = (type === 'deleted') ? '&minus;' : '+';
    var html = '';

    // Section header
    html += '<div data-cat-toggle="' + type + '" style="display:flex;align-items:center;gap:0.4rem;padding:0.5rem 0.65rem;cursor:pointer;user-select:none">';
    html += '<span style="font-size:0.6rem;opacity:0.4;transition:transform 0.2s;' + (collapsed ? 'transform:rotate(-90deg)' : '') + '">&#9660;</span>';
    html += '<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;font-size:0.7rem;font-weight:700;background:' + cc.bg + ';color:' + cc.color + '">' + icon + '</span>';
    html += '<span style="font-weight:600;font-size:0.8rem">' + _esc(label) + '</span>';
    html += '<span style="font-weight:400;opacity:0.5;font-size:0.73rem">(' + items.length + ')</span>';
    html += '</div>';

    // Card container
    html += '<div style="padding:0 0.65rem;' + (collapsed ? 'display:none' : '') + '">';

    var limit = (_showAllItems[type] || items.length <= 20) ? items.length : 20;
    for (var i = 0; i < limit; i++) {
      var item = items[i];
      var key = type + '-' + i;
      var checked = _checkedItems[key] !== false;
      var name = _esc(item.name || 'Unnamed item');
      var metalBg = _metalBgColor(item.metal);
      var metalCol = _metalTextColor(item.metal);

      // Card wrapper
      html += '<div style="border-radius:8px;border:1px solid var(--border-color,rgba(255,255,255,0.08));padding:0.65rem;margin-bottom:0.5rem;background:var(--bg-card,#1a1d27)">';
      html += '<div style="display:flex;gap:0.5rem;align-items:center">';

      // Checkbox
      html += '<input type="checkbox" data-check="' + key + '" ' + (checked ? 'checked' : '') + ' style="width:16px;height:16px;min-width:16px;padding:0;border:none;accent-color:var(--primary,#3b82f6);flex-shrink:0;cursor:pointer">';

      // Image area
      html += '<div' + (item.uuid ? ' data-uuid="' + _esc(item.uuid) + '"' : '') + ' style="width:40px;height:40px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;background:' + metalBg + ';color:' + metalCol + '">';
      html += _metalEmoji(item.metal);
      html += '</div>';

      // Content area
      html += '<div style="flex:1;min-width:0">';
      html += '<div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + name + '</div>';

      // Metadata
      var detail = [];
      if (item.metal) detail.push(_esc(item.metal));
      if (item.weight != null) detail.push(item.weight + _esc(item.weightUnit || 'oz'));
      if (item.qty != null) detail.push('\u00d7 ' + item.qty);
      if (detail.length > 0) {
        html += '<div style="font-size:0.73rem;opacity:0.5;margin-top:0.1rem">' + detail.join(' \u00b7 ') + '</div>';
      }

      html += '</div>'; // content area
      html += '</div>'; // flex row
      html += '</div>'; // card
    }

    // "Show N more" button
    if (items.length > 20) {
      var remaining = items.length - 20;
      html += '<div data-show-more="' + type + '" style="font-size:0.78rem;text-align:center;cursor:pointer;padding:0.5rem;opacity:0.6">Show ' + remaining + ' more</div>';
    }

    html += '</div>'; // card container

    return html;
  }

  /** Render Modified items as expandable cards with per-field checkboxes */
  function _renderModifiedCards(container, modifiedItems) {
    if (!container || !modifiedItems || modifiedItems.length === 0) {
      if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
      }
      return '';
    }

    var cc = _catColors.modified;
    var collapsed = _collapsedCategories.modified;
    var html = '';

    // Section header
    html += '<div data-cat-toggle="modified" style="display:flex;align-items:center;gap:0.4rem;padding:0.5rem 0.65rem;cursor:pointer;user-select:none">';
    html += '<span style="font-size:0.6rem;opacity:0.4;transition:transform 0.2s;' + (collapsed ? 'transform:rotate(-90deg)' : '') + '">&#9660;</span>';
    html += '<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;font-size:0.7rem;font-weight:700;background:' + cc.bg + ';color:' + cc.color + '">&#9998;</span>';
    html += '<span style="font-weight:600;font-size:0.8rem">' + _esc('Modified') + '</span>';
    html += '<span style="font-weight:400;opacity:0.5;font-size:0.73rem">(' + modifiedItems.length + ')</span>';
    html += '</div>';

    // Card container
    html += '<div style="padding:0 0.65rem;' + (collapsed ? 'display:none' : '') + '">';

    var limit = (_showAllItems.modified || modifiedItems.length <= 20) ? modifiedItems.length : 20;
    for (var i = 0; i < limit; i++) {
      var mod = modifiedItems[i];
      var item = mod.item;
      var changes = mod.changes || [];
      var key = 'modified-' + i;
      var checked = _checkedItems[key] !== false;
      var name = _esc(item.name || 'Unnamed item');
      var metalBg = _metalBgColor(item.metal);
      var metalCol = _metalTextColor(item.metal);
      var expanded = _expandedModified[i];

      // Count checked fields for indeterminate hint
      var checkedFieldCount = 0;
      for (var fc = 0; fc < changes.length; fc++) {
        if (_checkedFields[key + '-' + changes[fc].field] !== false) {
          checkedFieldCount++;
        }
      }
      var allFieldsChecked = checkedFieldCount === changes.length;
      var someFieldsChecked = checkedFieldCount > 0 && !allFieldsChecked;

      // Card wrapper
      html += '<div style="border-radius:8px;border:1px solid var(--border-color,rgba(255,255,255,0.08));padding:0.65rem;margin-bottom:0.5rem;background:var(--bg-card,#1a1d27)">';
      html += '<div style="display:flex;gap:0.5rem;align-items:center">';

      // Master checkbox
      html += '<input type="checkbox" data-check="' + key + '"' + (someFieldsChecked ? ' data-indeterminate="true"' : '') + ' ' + (checked ? 'checked' : '') + ' style="width:16px;height:16px;min-width:16px;padding:0;border:none;accent-color:var(--primary,#3b82f6);flex-shrink:0;cursor:pointer">';

      // Image area
      html += '<div' + (item.uuid ? ' data-uuid="' + _esc(item.uuid) + '"' : '') + ' style="width:40px;height:40px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;background:' + metalBg + ';color:' + metalCol + '">';
      html += _metalEmoji(item.metal);
      html += '</div>';

      // Item identity
      html += '<div style="flex:1;min-width:0">';
      html += '<div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + name;
      html += '<span style="display:inline-block;background:rgba(217,119,6,0.1);color:#d97706;border-radius:12px;padding:0.1rem 0.5rem;font-size:0.7rem;margin-left:0.4rem">' + changes.length + ' field' + (changes.length !== 1 ? 's' : '') + ' changed</span>';
      html += '</div>';
      html += '</div>';

      // Expand toggle
      html += '<div class="diff-mod-toggle" data-mod-idx="' + i + '" style="cursor:pointer;padding:0.25rem 0.4rem;user-select:none">';
      html += '<span style="font-size:0.65rem;opacity:0.35;transition:transform 0.2s;display:inline-block;' + (expanded ? '' : 'transform:rotate(-90deg)') + '">&#9660;</span>';
      html += '</div>';

      html += '</div>'; // flex row

      // Expanded field rows
      if (expanded) {
        for (var fi = 0; fi < changes.length; fi++) {
          var ch = changes[fi];
          var fieldKey = key + '-' + ch.field;
          var fieldChecked = _checkedFields[fieldKey] !== false;
          var localDisplay = ch.localVal == null ? '\u2014' : _esc(String(ch.localVal));
          var remoteDisplay = ch.remoteVal == null ? '\u2014' : _esc(String(ch.remoteVal));

          html += '<div style="display:flex;align-items:center;gap:0.5rem;padding:0.2rem 0 0.2rem 3rem">';
          html += '<input type="checkbox" data-field-check="' + fieldKey + '" ' + (fieldChecked ? 'checked' : '') + ' style="width:14px;height:14px;min-width:14px;padding:0;border:none;accent-color:var(--primary,#3b82f6);flex-shrink:0;cursor:pointer">';
          html += '<span style="min-width:100px;font-size:0.78rem;opacity:0.5">' + _esc(ch.field) + '</span>';
          html += '<span style="text-decoration:line-through;opacity:0.45;font-size:0.78rem">' + localDisplay + '</span>';
          html += '<span style="opacity:0.35;font-size:0.7rem">&rarr;</span>';
          html += '<span style="font-weight:500;color:var(--warning,#d97706);font-size:0.78rem">' + remoteDisplay + '</span>';
          html += '</div>';
        }
      }

      html += '</div>'; // card
    }

    // "Show N more" button
    if (modifiedItems.length > 20) {
      var remaining = modifiedItems.length - 20;
      html += '<div data-show-more="modified" style="font-size:0.78rem;text-align:center;cursor:pointer;padding:0.5rem;opacity:0.6">Show ' + remaining + ' more</div>';
    }

    html += '</div>'; // card container

    return html;
  }

  /** Load item images asynchronously for cards with data-uuid */
  function _loadItemImages() {
    try {
      if (typeof imageCache === 'undefined' || !imageCache || !imageCache.getUserImageUrl) return;
      var modal = safeGetElement('diffReviewModal');
      if (!modal) return;
      var els = modal.querySelectorAll('[data-uuid]');
      for (var i = 0; i < els.length; i++) {
        (function (el) {
          imageCache.getUserImageUrl(el.dataset.uuid, 'obverse').then(function (url) {
            if (url) {
              el.innerHTML = '<img src="' + url + '" style="width:40px;height:40px;object-fit:cover;border-radius:6px" alt="">';
            }
          }).catch(function () { /* silent fallback — keep emoji */ });
        })(els[i]);
      }
    } catch (ex) {
      // imageCache not available — silently keep emoji placeholders
    }
  }

  // ── Event delegation ──

  function _onListClick(e) {
    var target = e.target;

    // Per-field checkbox toggle
    if (target.type === 'checkbox' && target.dataset.fieldCheck) {
      var fKey = target.dataset.fieldCheck;
      _checkedFields[fKey] = target.checked;
      // Sync master checkbox — parse item index from key like 'modified-0-fieldName'
      var parts = fKey.split('-');
      var itemIdx = parseInt(parts[1], 10);
      var masterKey = 'modified-' + itemIdx;
      var diff = _options.diff || {};
      var modItem = (diff.modified || [])[itemIdx];
      if (modItem) {
        var changes = modItem.changes || [];
        var allChecked = true;
        var noneChecked = true;
        for (var fc = 0; fc < changes.length; fc++) {
          var cfk = 'modified-' + itemIdx + '-' + changes[fc].field;
          if (_checkedFields[cfk] !== false) {
            noneChecked = false;
          } else {
            allChecked = false;
          }
        }
        // Update master checkbox state
        _checkedItems[masterKey] = !noneChecked;
        var masterCb = target.closest('[data-cat="modified"]') || safeGetElement('diffSectionModified');
        if (masterCb) {
          var mc = masterCb.querySelector('[data-check="' + masterKey + '"]');
          if (mc) {
            mc.checked = !noneChecked;
            mc.indeterminate = !allChecked && !noneChecked;
          }
        }
      }
      _updateApplyCount();
      return;
    }

    // Checkbox toggle
    if (target.type === 'checkbox' && target.dataset.check) {
      var chkKey = target.dataset.check;
      _checkedItems[chkKey] = target.checked;
      // If this is a modified master checkbox, toggle all field checkboxes too
      if (chkKey.indexOf('modified-') === 0) {
        var mIdx = parseInt(chkKey.split('-')[1], 10);
        var diff2 = _options.diff || {};
        var modItem2 = (diff2.modified || [])[mIdx];
        if (modItem2) {
          var changes2 = modItem2.changes || [];
          for (var fc2 = 0; fc2 < changes2.length; fc2++) {
            _checkedFields['modified-' + mIdx + '-' + changes2[fc2].field] = target.checked;
          }
          // Update field checkbox DOM elements without full re-render
          var container2 = target.closest('[style*="border-radius:8px"]');
          if (container2) {
            var fieldCbs = container2.querySelectorAll('[data-field-check]');
            for (var fi2 = 0; fi2 < fieldCbs.length; fi2++) {
              fieldCbs[fi2].checked = target.checked;
            }
          }
        }
        target.indeterminate = false;
      }
      _updateApplyCount();
      return;
    }

    // Category collapse toggle
    var catToggle = target.closest('[data-cat-toggle]');
    if (catToggle) {
      var cat = catToggle.dataset.catToggle;
      _collapsedCategories[cat] = !_collapsedCategories[cat];
      _render();
      return;
    }

    // Modified row expand toggle
    var modToggle = target.closest('.diff-mod-toggle');
    if (modToggle) {
      var idx = parseInt(modToggle.dataset.modIdx, 10);
      _expandedModified[idx] = !_expandedModified[idx];
      _render();
      return;
    }

    // "Show more" button
    var showMoreBtn = target.closest('[data-show-more]');
    if (showMoreBtn) {
      _showAllItems[showMoreBtn.dataset.showMore] = true;
      _render();
      return;
    }
  }

  function _onConflictsChange(e) {
    if (e.target.type === 'radio' && e.target.dataset.conflict != null) {
      _conflictResolutions['c' + e.target.dataset.conflict] = e.target.value;
    }
  }

  /** Update just the Apply button count without full re-render */
  function _updateApplyCount() {
    var applyBtn = safeGetElement('diffReviewApplyBtn');
    if (applyBtn) {
      var count = _checkedCount();
      var hasSelectableItems = Object.keys(_checkedItems).length > 0;
      var hasSettings = _options && _options.settingsDiff && _options.settingsDiff.changed && _options.settingsDiff.changed.length > 0;
      applyBtn.textContent = count > 0 ? 'Apply (' + count + ')' : 'Apply';
      applyBtn.disabled = hasSelectableItems && count === 0 && !hasSettings;
      applyBtn.style.opacity = (hasSelectableItems && count === 0 && !hasSettings) ? '0.4' : '';
    }
    _updateCountRow();
  }

  // ── Select All / Deselect All ──

  function _selectAll() {
    var diff = _options.diff || {};
    for (var i = 0; i < (diff.added || []).length; i++) _checkedItems['added-' + i] = true;
    for (var j = 0; j < (diff.modified || []).length; j++) _checkedItems['modified-' + j] = true;
    for (var k = 0; k < (diff.deleted || []).length; k++) _checkedItems['deleted-' + k] = true;
    _render(); // _render calls _updateCountRow internally
  }

  function _deselectAll() {
    for (var key in _checkedItems) {
      if (_checkedItems.hasOwnProperty(key)) _checkedItems[key] = false;
    }
    _render(); // _render calls _updateCountRow internally
  }

  /**
   * Toggle "Select All / Deselect All" for the backup import flow.
   * First call selects all added + modified; label changes to "Deselect All".
   * Second call deselects all; label goes back to "Select All".
   */
  function _toggleSelectAll() {
    const diff = _options ? _options.diff || {} : {};
    _selectAllState = (_selectAllState + 1) % 3;
    if (_selectAllState === 1) {
      // First press: select added + modified, keep deleted unchecked
      for (let i = 0; i < (diff.added || []).length; i++) _checkedItems['added-' + i] = true;
      for (let j = 0; j < (diff.modified || []).length; j++) _checkedItems['modified-' + j] = true;
      for (let k = 0; k < (diff.deleted || []).length; k++) _checkedItems['deleted-' + k] = false;
    } else if (_selectAllState === 2) {
      // Second press: also select deleted rows
      for (let k = 0; k < (diff.deleted || []).length; k++) _checkedItems['deleted-' + k] = true;
    } else {
      // Third press: deselect all
      for (const key in _checkedItems) {
        if (_checkedItems.hasOwnProperty(key)) _checkedItems[key] = false;
      }
    }
    const toggleBtn = safeGetElement('diffReviewSelectAllToggle');
    if (toggleBtn) {
      const labels = ['Select All', 'Add Deleted', 'Deselect All'];
      toggleBtn.textContent = labels[_selectAllState];
    }
    _render(); // _render calls _updateCountRow internally
  }

  // ── Apply / Cancel ──

  function _buildSelectedChanges() {
    var diff = _options.diff || {};
    var result = [];
    var added = diff.added || [];
    var modified = diff.modified || [];
    var deleted = diff.deleted || [];

    // Added items
    for (var a = 0; a < added.length; a++) {
      if (_checkedItems['added-' + a] !== false) {
        result.push({ type: 'add', item: added[a] });
      }
    }

    // Modified items — one entry per checked field
    for (var m = 0; m < modified.length; m++) {
      if (_checkedItems['modified-' + m] !== false) {
        var mod = modified[m];
        var key = _itemKey(mod.item);
        for (var c = 0; c < mod.changes.length; c++) {
          var ch = mod.changes[c];
          // Only emit fields that are individually checked (backward compat: if key missing, treat as true)
          if (_checkedFields['modified-' + m + '-' + ch.field] !== false) {
            result.push({
              type: 'modify',
              itemKey: key,
              field: ch.field,
              value: ch.remoteVal
            });
          }
        }
      }
    }

    // Deleted items
    for (var d = 0; d < deleted.length; d++) {
      if (_checkedItems['deleted-' + d] !== false) {
        result.push({ type: 'delete', itemKey: _itemKey(deleted[d]) });
      }
    }

    // Item conflict resolutions — per-field local/remote picks
    var conflictsArr = (_options.conflicts && _options.conflicts.conflicts) || [];
    for (var ci = 0; ci < conflictsArr.length; ci++) {
      var conf = conflictsArr[ci];
      var resKey = 'c' + ci + '-' + conf.field;
      var side = _conflictResolutions[resKey] || 'remote';
      var itemKey = conf.itemKey || conf.itemName || '';
      result.push({
        type: 'modify',
        itemKey: itemKey,
        field: conf.field,
        value: (side === 'local') ? conf.localVal : conf.remoteVal
      });
    }

    // Settings changes — resolution-aware (local/remote toggle per setting)
    var settingsDiff = _options.settingsDiff || {};
    var changedSettings = settingsDiff.changed || [];
    for (var s = 0; s < changedSettings.length; s++) {
      var setting = changedSettings[s];
      var resolution = _conflictResolutions['setting-' + setting.key];
      var value = (resolution === 'local') ? setting.localVal : setting.remoteVal;
      result.push({ type: 'setting', key: setting.key, value: value });
    }

    return result;
  }

  function _onApply() {
    var selected = _buildSelectedChanges();
    // STAK-402: When _checkedItems is empty (empty diff — no selectable items were shown),
    // pass null instead of [] to signal "accept all / full overwrite". Callers that
    // check `selectedChanges &&` treat null as "no selective picks, do full restore".
    // This differs from the intentional "deselect all" case where _checkedItems has
    // entries but they are all false (then selected is [] and apply-nothing is correct).
    if (Object.keys(_checkedItems).length === 0) selected = null;
    // Capture callback before close() — close() nullifies _options
    var callback = _options && _options.onApply;
    DiffModal.close();
    if (typeof callback === 'function') {
      callback(selected);
    }
  }

  function _onCancel() {
    // Capture callback before close() — close() nullifies _options
    var callback = _options && _options.onCancel;
    DiffModal.close();
    if (typeof callback === 'function') {
      callback();
    }
  }

  // ── Wire buttons (called once per show) ──

  function _wireEvents() {
    var listEl = safeGetElement('diffSectionModified');
    var selectAllBtn = safeGetElement('diffReviewSelectAll');
    var deselectAllBtn = safeGetElement('diffReviewDeselectAll');
    var selectAllToggleBtn = safeGetElement('diffReviewSelectAllToggle');
    var applyBtn = safeGetElement('diffReviewApplyBtn');
    var cancelBtn = safeGetElement('diffReviewCancelBtn');
    var dismissX = safeGetElement('diffReviewDismissX');

    // Determine whether we're in backup-count mode
    var hasBackupCount = _options && _options.backupCount != null;

    // Event delegation on item list
    if (listEl) {
      listEl.removeEventListener('click', _onListClick);
      listEl.addEventListener('click', _onListClick);
    }

    // Event delegation on orphan items (added/deleted cards)
    var orphanListEl = safeGetElement('diffSectionOrphans');
    if (orphanListEl) {
      orphanListEl.removeEventListener('click', _onListClick);
      orphanListEl.addEventListener('click', _onListClick);
    }

    // Pill buttons
    var btnStyle = 'display:inline-flex;align-items:center;gap:0.3rem;border-radius:999px;font-size:0.73rem;font-weight:500;cursor:pointer;transition:all 0.15s;';

    if (selectAllBtn) {
      if (hasBackupCount) {
        selectAllBtn.style.display = 'none';
      } else {
        selectAllBtn.style.display = '';
        selectAllBtn.onclick = _selectAll;
        selectAllBtn.setAttribute('style', btnStyle + 'padding:0.3rem 0.7rem;background:none;border:1.5px solid var(--border,#cbd5e1);color:var(--text-muted,#64748b)');
      }
    }
    if (deselectAllBtn) {
      if (hasBackupCount) {
        deselectAllBtn.style.display = 'none';
      } else {
        deselectAllBtn.style.display = '';
        deselectAllBtn.onclick = _deselectAll;
        deselectAllBtn.setAttribute('style', btnStyle + 'padding:0.3rem 0.7rem;background:none;border:1.5px solid var(--border,#cbd5e1);color:var(--text-muted,#64748b)');
      }
    }

    // Select All toggle button — only shown when backupCount is provided
    if (selectAllToggleBtn) {
      if (hasBackupCount) {
        selectAllToggleBtn.textContent = ['Select All', 'Add Deleted', 'Deselect All'][_selectAllState];
        selectAllToggleBtn.onclick = _toggleSelectAll;
        selectAllToggleBtn.setAttribute('style', btnStyle + 'padding:0.3rem 0.7rem;background:none;border:1.5px solid var(--border,#cbd5e1);color:var(--text-muted,#64748b)');
        selectAllToggleBtn.style.display = '';
      } else {
        selectAllToggleBtn.style.display = 'none';
        selectAllToggleBtn.onclick = null;
      }
    }

    if (cancelBtn) {
      cancelBtn.onclick = _onCancel;
      cancelBtn.setAttribute('style', btnStyle + 'padding:0.45rem 1rem;font-size:0.8rem;background:none;border:1.5px solid var(--border,#cbd5e1);color:var(--text-muted,#64748b)');
    }
    if (applyBtn) {
      applyBtn.onclick = _onApply;
      applyBtn.setAttribute('style', btnStyle + 'padding:0.45rem 1.2rem;font-size:0.8rem;font-weight:600;background:#d97706;color:#fff;border:1.5px solid #d97706');
    }
    if (dismissX) {
      dismissX.onclick = _onCancel;
    }
  }

  // ── Public API ──

  var DiffModal = {
    /**
     * Show the diff review modal.
     * @param {object} options
     * @param {object} options.source - { type: 'sync'|'csv'|'json', label: string }
     * @param {object} options.diff - DiffEngine.compareItems() result
     * @param {object} [options.settingsDiff] - DiffEngine.compareSettings() result
     * @param {object} [options.conflicts] - DiffEngine.detectConflicts() result
     * @param {object} [options.meta] - { deviceId, timestamp, itemCount, appVersion }
     * @param {function} options.onApply - Called with array of selected changes
     * @param {function} options.onCancel - Called when user cancels
     * @param {number} [options.backupCount] - Total items in backup file; enables count header and Select All toggle
     * @param {number} [options.localCount] - Current local inventory count; required alongside backupCount for projected count
     * @param {function} [options.onSelectionChange] - Fires on every checkbox toggle with (selectedChanges, projectedCount)
     */
    show: function (options) {
      _options = options || {};

      // Reset internal state
      _checkedItems = {};
      _checkedFields = {};
      _conflictResolutions = {};
      _collapsedCategories = {};
      _expandedModified = {};
      _expandedSettingsCategories = {};
      _selectAllState = 0;
      _showAllItems = {};

      // Default all items to checked
      var diff = _options.diff || {};
      for (var a = 0; a < (diff.added || []).length; a++) _checkedItems['added-' + a] = true;
      for (var m = 0; m < (diff.modified || []).length; m++) _checkedItems['modified-' + m] = true;
      for (var d = 0; d < (diff.deleted || []).length; d++) _checkedItems['deleted-' + d] = true;

      // Default all modified item fields to checked (accept remote)
      for (var mf = 0; mf < (diff.modified || []).length; mf++) {
        var modChanges = diff.modified[mf].changes || [];
        for (var c = 0; c < modChanges.length; c++) {
          _checkedFields['modified-' + mf + '-' + modChanges[c].field] = true;
        }
      }

      // Default conflict resolutions to 'remote' (per-field keys)
      if (_options.conflicts && _options.conflicts.conflicts) {
        for (var ci = 0; ci < _options.conflicts.conflicts.length; ci++) {
          var conflict = _options.conflicts.conflicts[ci];
          _conflictResolutions['c' + ci + '-' + conflict.field] = null;
        }
      }

      // Default settings resolutions to 'remote'
      if (_options.settingsDiff && _options.settingsDiff.changed) {
        for (var si = 0; si < _options.settingsDiff.changed.length; si++) {
          _conflictResolutions['setting-' + _options.settingsDiff.changed[si].key] = 'remote';
        }
      }

      // Render content
      _render();

      // Wire event handlers
      _wireEvents();

      // Open modal
      if (typeof openModalById === 'function') {
        openModalById(MODAL_ID);
      } else {
        var modal = safeGetElement(MODAL_ID);
        if (modal) modal.style.display = 'flex';
      }
    },

    /**
     * Close the modal programmatically.
     */
    close: function () {
      if (typeof closeModalById === 'function') {
        closeModalById(MODAL_ID);
      } else {
        var modal = safeGetElement(MODAL_ID);
        if (modal) modal.style.display = 'none';
      }
      _options = null;
    }
  };

  // Export globally
  if (typeof window !== 'undefined') {
    window.DiffModal = DiffModal;
  }

})();

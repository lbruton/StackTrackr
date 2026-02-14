// IMAGE CACHE MANAGER MODAL
// =============================================================================
// Sub-modal opened from Settings > System to manage cached coin images.
// Shows stats, eligible item table with per-row status, real-time activity log,
// and bulk cache controls. Resolves catalog IDs from catalogManager.
// =============================================================================

/** @type {Map<string, HTMLElement>} Status cells keyed by catalogId for live updates */
let _statusCells = new Map();

/**
 * Opens the Image Cache Manager modal, rendering stats and item table.
 */
const showImageCacheModal = async () => {
  _statusCells.clear();
  if (typeof openModalById === 'function') {
    openModalById('imageCacheModal');
  }
  await renderCacheStats();
  await renderEligibleItemsTable();
};

/**
 * Closes the Image Cache Manager modal.
 */
const hideImageCacheModal = () => {
  if (typeof closeModalById === 'function') {
    closeModalById('imageCacheModal');
  }
};

// ---------------------------------------------------------------------------
// Stats bar
// ---------------------------------------------------------------------------

/**
 * Renders the cache statistics bar: count, total size, quota percentage.
 */
const renderCacheStats = async () => {
  const container = document.getElementById('imageCacheStats');
  if (!container) return;

  if (!window.imageCache?.isAvailable()) {
    container.textContent = 'Image cache not available';
    return;
  }

  const usage = await imageCache.getStorageUsage();
  const sizeMb = (usage.totalBytes / (1024 * 1024)).toFixed(2);
  const limitMb = (usage.limitBytes / (1024 * 1024)).toFixed(0);
  const pct = usage.limitBytes > 0 ? ((usage.totalBytes / usage.limitBytes) * 100).toFixed(1) : '0.0';

  // Count eligible items for the summary line
  const eligible = window.BulkImageCache ? BulkImageCache.buildEligibleList() : [];

  container.textContent = '';

  const statsText = document.createElement('span');
  statsText.textContent = `${usage.count} cached \u00b7 ${eligible.length} eligible \u00b7 ${sizeMb} MB / ${limitMb} MB (${pct}%)`;
  container.appendChild(statsText);

  const bar = document.createElement('progress');
  bar.value = usage.totalBytes;
  bar.max = usage.limitBytes;
  bar.style.cssText = 'width:100%;margin-top:0.35rem;';
  container.appendChild(bar);
};

// ---------------------------------------------------------------------------
// Eligible items table (shows all N# items with cache status)
// ---------------------------------------------------------------------------

/**
 * Renders the table of all inventory items that have Numista catalog IDs.
 * Each row shows: N#, item name, cache status, and action buttons.
 * Status cells are tracked in _statusCells for live updates during bulk cache.
 */
const renderEligibleItemsTable = async () => {
  const container = document.getElementById('cachedImagesTableContainer');
  if (!container) return;

  container.textContent = '';
  _statusCells.clear();

  if (!window.imageCache?.isAvailable()) {
    const empty = document.createElement('div');
    empty.className = 'chip-grouping-empty';
    empty.textContent = 'Image cache not available';
    container.appendChild(empty);
    return;
  }

  // Get eligible items from BulkImageCache (resolves catalogManager mappings)
  const entries = window.BulkImageCache ? BulkImageCache.buildEligibleList() : [];

  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'chip-grouping-empty';
    empty.textContent = 'No items with Numista catalog IDs found';
    container.appendChild(empty);
    return;
  }

  const table = document.createElement('table');
  table.className = 'chip-grouping-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['N#', 'Item Name', 'Status', ''].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    th.style.cssText = 'font-size:0.75rem;font-weight:normal;opacity:0.6;padding:0.2rem 0.4rem';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  for (const { item, catalogId } of entries) {
    const isCached = await imageCache.hasImages(catalogId);
    const hasUrls = !!(item.obverseImageUrl || item.reverseImageUrl);

    const tr = document.createElement('tr');

    // Catalog ID cell
    const tdId = document.createElement('td');
    tdId.style.cssText = 'font-family:monospace;font-size:0.85rem;white-space:nowrap';
    tdId.textContent = catalogId;

    // Item name cell
    const tdName = document.createElement('td');
    tdName.textContent = item.name || '\u2014';
    tdName.style.cssText = 'max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';

    // Status cell (updated live during bulk cache)
    const tdStatus = document.createElement('td');
    tdStatus.style.cssText = 'font-size:0.8rem;white-space:nowrap';
    if (isCached) {
      tdStatus.textContent = '\u2713 Cached';
      tdStatus.style.color = 'var(--success-color, green)';
    } else if (hasUrls) {
      tdStatus.textContent = 'Ready';
      tdStatus.style.color = 'var(--text-secondary, #888)';
    } else {
      tdStatus.textContent = 'Needs API lookup';
      tdStatus.style.color = 'var(--warning-color, orange)';
    }
    _statusCells.set(catalogId, tdStatus);

    // Actions cell
    const tdActions = document.createElement('td');
    tdActions.style.cssText = 'white-space:nowrap;text-align:right';

    if (isCached) {
      // Re-sync button
      const syncBtn = document.createElement('button');
      syncBtn.type = 'button';
      syncBtn.className = 'inline-chip-move';
      syncBtn.textContent = '\u21BB';
      syncBtn.title = 'Re-sync images';
      syncBtn.addEventListener('click', async () => {
        syncBtn.disabled = true;
        await resyncCachedEntry(catalogId);
        syncBtn.disabled = false;
        await renderEligibleItemsTable();
        await renderCacheStats();
      });

      // Delete button
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'inline-chip-move';
      delBtn.textContent = '\u2715';
      delBtn.title = 'Delete cached images';
      delBtn.addEventListener('click', async () => {
        await imageCache.deleteImages(catalogId);
        logCacheActivity(`Deleted cache for ${catalogId}`, 'warn');
        await renderEligibleItemsTable();
        await renderCacheStats();
      });

      tdActions.append(syncBtn, delBtn);
    }

    tr.append(tdId, tdName, tdStatus, tdActions);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  container.appendChild(table);
};

/**
 * Re-syncs a single cached entry: deletes then re-fetches from inventory/API URLs.
 * @param {string} catalogId
 */
const resyncCachedEntry = async (catalogId) => {
  const item = (typeof inventory !== 'undefined' ? inventory : []).find(i => {
    const resolved = window.BulkImageCache ? BulkImageCache.resolveCatalogId(i) : '';
    return resolved === catalogId;
  });

  await imageCache.deleteImages(catalogId);

  let obverseUrl = item?.obverseImageUrl || '';
  let reverseUrl = item?.reverseImageUrl || '';

  // If no URLs on item, try Numista API
  if (!obverseUrl && !reverseUrl && window.catalogAPI) {
    logCacheActivity(`${catalogId}: Looking up URLs from Numista...`, 'info');
    try {
      const result = await catalogAPI.lookupItem(catalogId);
      obverseUrl = result?.imageUrl || '';
      reverseUrl = result?.reverseImageUrl || '';
      if (item) {
        if (obverseUrl) item.obverseImageUrl = obverseUrl;
        if (reverseUrl) item.reverseImageUrl = reverseUrl;
        if (typeof saveInventory === 'function') saveInventory();
      }
    } catch (err) {
      logCacheActivity(`${catalogId}: API lookup failed: ${err.message}`, 'error');
      return;
    }
  }

  if (!obverseUrl && !reverseUrl) {
    logCacheActivity(`${catalogId}: No image URLs available`, 'warn');
    return;
  }

  logCacheActivity(`${catalogId}: Re-fetching images...`, 'info');
  const ok = await imageCache.cacheImages(catalogId, obverseUrl, reverseUrl);
  if (ok) {
    logCacheActivity(`${catalogId}: Re-synced successfully`, 'success');
  } else {
    logCacheActivity(`${catalogId}: Re-sync failed`, 'error');
  }
};

// ---------------------------------------------------------------------------
// Activity log
// ---------------------------------------------------------------------------

/**
 * Appends a timestamped line to the activity log and auto-scrolls.
 * @param {string} message
 * @param {'info'|'success'|'warn'|'error'} [type='info']
 */
const logCacheActivity = (message, type = 'info') => {
  const logEl = document.getElementById('imageCacheLog');
  if (!logEl) return;

  const line = document.createElement('div');
  line.style.cssText = 'font-size:0.8rem;font-family:monospace;padding:0.1rem 0;';

  const colorMap = { info: 'inherit', success: 'var(--success-color, green)', warn: 'var(--warning-color, orange)', error: 'var(--danger-color, red)' };
  line.style.color = colorMap[type] || 'inherit';

  const now = new Date();
  const ts = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  line.textContent = `[${ts}] ${message}`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
};

/**
 * Updates a status cell in the eligible items table for live feedback.
 * @param {string} catalogId
 * @param {string} text
 * @param {string} color - CSS color value
 */
const updateStatusCell = (catalogId, text, color) => {
  const cell = _statusCells.get(catalogId);
  if (!cell) return;
  cell.textContent = text;
  cell.style.color = color;
};

// ---------------------------------------------------------------------------
// Bulk cache from modal
// ---------------------------------------------------------------------------

/**
 * Starts the bulk cache operation from within the modal.
 * Updates per-row status cells in real time as items are processed.
 */
const startBulkCacheFromModal = () => {
  if (!window.BulkImageCache || BulkImageCache.isRunning()) return;

  const startBtn = document.getElementById('imageCacheStartBtn');
  const cancelBtn = document.getElementById('imageCacheCancelBtn');
  const progressBar = document.getElementById('imageCacheProgress');

  if (startBtn) startBtn.disabled = true;
  if (cancelBtn) cancelBtn.style.display = '';
  if (progressBar) {
    progressBar.style.display = '';
    progressBar.value = 0;
    progressBar.max = 0;
  }

  logCacheActivity('Starting bulk image cache...', 'info');

  const statusColorMap = {
    'skip-cached': ['var(--success-color, green)', '\u2713 Cached'],
    'skip-no-url': ['var(--warning-color, orange)', 'No URLs'],
    'api-lookup': ['var(--text-secondary, #888)', 'API lookup...'],
    'caching': ['var(--text-secondary, #888)', 'Downloading...'],
    'cached': ['var(--success-color, green)', '\u2713 Cached'],
    'browser-cached': ['var(--color-info, #5b9bd5)', '\u2295 Browser'],
    'failed': ['var(--danger-color, red)', '\u2717 Failed'],
    'quota': ['var(--danger-color, red)', 'Quota exceeded'],
  };

  BulkImageCache.cacheAll({
    onProgress: ({ current, total }) => {
      if (progressBar) {
        progressBar.max = total;
        progressBar.value = current;
      }
    },
    onLog: ({ catalogId, status, message }) => {
      // Update the table row status cell
      const [color, label] = statusColorMap[status] || ['inherit', status];
      updateStatusCell(catalogId, label, color);

      // Log to activity log
      const logTypeMap = {
        'skip-cached': 'info', 'skip-no-url': 'warn', 'api-lookup': 'info',
        'caching': 'info', 'cached': 'success', 'failed': 'error', 'quota': 'error'
      };
      logCacheActivity(`${catalogId}: ${message}`, logTypeMap[status] || 'info');
    },
    onComplete: async ({ cached, skipped, failed, apiLookups, quotaExceeded, elapsed }) => {
      if (startBtn) startBtn.disabled = false;
      if (cancelBtn) cancelBtn.style.display = 'none';
      if (progressBar) progressBar.style.display = 'none';

      const secs = (elapsed / 1000).toFixed(1);
      let msg = `Complete in ${secs}s: ${cached} cached, ${skipped} skipped, ${failed} failed`;
      if (apiLookups > 0) msg += `, ${apiLookups} API lookups`;
      msg += '.';
      if (quotaExceeded) msg += ' Quota limit reached.';
      logCacheActivity(msg, failed > 0 || quotaExceeded ? 'warn' : 'success');

      // Refresh table and stats
      await renderEligibleItemsTable();
      await renderCacheStats();

      // Refresh settings footer storage display
      if (typeof updateSettingsFooter === 'function') updateSettingsFooter();
    }
  });
};

/**
 * Clears all cached images after confirmation.
 */
const clearAllCachedImages = async () => {
  if (!window.imageCache?.isAvailable()) return;

  const usage = await imageCache.getStorageUsage();
  if (usage.count === 0) {
    logCacheActivity('No cached images to clear', 'info');
    return;
  }

  // eslint-disable-next-line no-restricted-globals
  if (!confirm(`Delete all ${usage.count} cached images? This cannot be undone.`)) return;

  const ok = await imageCache.clearAll();
  if (ok) {
    logCacheActivity(`Cleared all ${usage.count} cached images`, 'warn');
  } else {
    logCacheActivity('Failed to clear cache', 'error');
  }

  await renderEligibleItemsTable();
  await renderCacheStats();
  if (typeof updateSettingsFooter === 'function') updateSettingsFooter();
};

// ---------------------------------------------------------------------------
// Global exports
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  window.showImageCacheModal = showImageCacheModal;
  window.hideImageCacheModal = hideImageCacheModal;
  window.startBulkCacheFromModal = startBulkCacheFromModal;
  window.clearAllCachedImages = clearAllCachedImages;
}

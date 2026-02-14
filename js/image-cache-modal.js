// NUMISTA BULK SYNC UI (STACK-87/88)
// =============================================================================
// Inline UI within Settings > API > Numista card for bulk syncing metadata
// and images. Replaces the former standalone Image Cache Manager modal.
// Shows stats, eligible item table with per-row status, real-time activity log,
// and sync controls. Resolves catalog IDs from catalogManager.
// =============================================================================

/** @type {Map<string, HTMLElement>} Status cells keyed by catalogId for live updates */
let _statusCells = new Map();

/**
 * Renders the Numista Bulk Sync inline UI: stats, eligible items table.
 * Called when the Numista provider tab is shown and conditions are met.
 */
const renderNumistaSyncUI = async () => {
  _statusCells.clear();
  await renderSyncStats();
  await renderEligibleItemsTable();
};

// ---------------------------------------------------------------------------
// Stats bar
// ---------------------------------------------------------------------------

/**
 * Renders the cache statistics bar: count, total size, quota percentage.
 */
const renderSyncStats = async () => {
  const container = document.getElementById('numistaSyncStats');
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
 * Status cells are tracked in _statusCells for live updates during bulk sync.
 */
const renderEligibleItemsTable = async () => {
  const container = document.getElementById('numistaSyncTableContainer');
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
    const hasMeta = !!(await imageCache.getMetadata(catalogId));
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

    // Status cell (updated live during bulk sync)
    const tdStatus = document.createElement('td');
    tdStatus.style.cssText = 'font-size:0.8rem;white-space:nowrap';
    if (isCached && hasMeta) {
      tdStatus.textContent = '\u2713 Synced';
      tdStatus.style.color = 'var(--success-color, green)';
    } else if (isCached) {
      tdStatus.textContent = '\u2713 Cached';
      tdStatus.style.color = 'var(--success-color, green)';
    } else if (hasMeta) {
      tdStatus.textContent = '\u2295 Meta only';
      tdStatus.style.color = 'var(--color-info, #5b9bd5)';
    } else if (hasUrls) {
      tdStatus.textContent = 'Ready';
      tdStatus.style.color = 'var(--text-secondary, #888)';
    } else {
      tdStatus.textContent = 'Needs sync';
      tdStatus.style.color = 'var(--warning-color, orange)';
    }
    _statusCells.set(catalogId, tdStatus);

    // Actions cell
    const tdActions = document.createElement('td');
    tdActions.style.cssText = 'white-space:nowrap;text-align:right';

    if (isCached || hasMeta) {
      // Re-sync button
      const syncBtn = document.createElement('button');
      syncBtn.type = 'button';
      syncBtn.className = 'inline-chip-move';
      syncBtn.textContent = '\u21BB';
      syncBtn.title = 'Re-sync';
      syncBtn.addEventListener('click', async () => {
        syncBtn.disabled = true;
        await resyncCachedEntry(catalogId);
        syncBtn.disabled = false;
        await renderEligibleItemsTable();
        await renderSyncStats();
      });

      // Delete button
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'inline-chip-move';
      delBtn.textContent = '\u2715';
      delBtn.title = 'Delete cached data';
      delBtn.addEventListener('click', async () => {
        await imageCache.deleteImages(catalogId);
        logSyncActivity(`Deleted cache for ${catalogId}`, 'warn');
        await renderEligibleItemsTable();
        await renderSyncStats();
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

  // Fetch metadata + image URLs from Numista API
  if (window.catalogAPI) {
    logSyncActivity(`${catalogId}: Syncing from Numista...`, 'info');
    try {
      const result = await catalogAPI.lookupItem(catalogId);
      if (!obverseUrl && result?.imageUrl) obverseUrl = result.imageUrl;
      if (!reverseUrl && result?.reverseImageUrl) reverseUrl = result.reverseImageUrl;
      if (item) {
        if (obverseUrl) item.obverseImageUrl = obverseUrl;
        if (reverseUrl) item.reverseImageUrl = reverseUrl;
        if (typeof saveInventory === 'function') saveInventory();
      }
      // Cache metadata
      await imageCache.cacheMetadata(catalogId, result);
      logSyncActivity(`${catalogId}: Metadata synced`, 'success');
    } catch (err) {
      logSyncActivity(`${catalogId}: API lookup failed: ${err.message}`, 'error');
    }
  }

  if (!obverseUrl && !reverseUrl) {
    logSyncActivity(`${catalogId}: No image URLs available`, 'warn');
    return;
  }

  logSyncActivity(`${catalogId}: Re-fetching images...`, 'info');
  const ok = await imageCache.cacheImages(catalogId, obverseUrl, reverseUrl);
  if (ok) {
    logSyncActivity(`${catalogId}: Re-synced successfully`, 'success');
  } else {
    logSyncActivity(`${catalogId}: Image cache failed`, 'error');
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
const logSyncActivity = (message, type = 'info') => {
  const logEl = document.getElementById('numistaSyncLog');
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
// Bulk sync from inline UI
// ---------------------------------------------------------------------------

/**
 * Starts the bulk sync operation from the inline Numista card.
 * Updates per-row status cells in real time as items are processed.
 */
const startBulkSync = () => {
  if (!window.BulkImageCache || BulkImageCache.isRunning()) return;

  const startBtn = document.getElementById('numistaSyncStartBtn');
  const cancelBtn = document.getElementById('numistaSyncCancelBtn');
  const progressBar = document.getElementById('numistaSyncProgress');

  if (startBtn) startBtn.disabled = true;
  if (cancelBtn) cancelBtn.style.display = '';
  if (progressBar) {
    progressBar.style.display = '';
    progressBar.value = 0;
    progressBar.max = 0;
  }

  logSyncActivity('Starting bulk sync...', 'info');

  const statusColorMap = {
    'skip-cached': ['var(--success-color, green)', '\u2713 Cached'],
    'skip-no-url': ['var(--warning-color, orange)', 'No URLs'],
    'api-lookup': ['var(--text-secondary, #888)', 'Syncing...'],
    'metadata': ['var(--color-info, #5b9bd5)', '\u2295 Metadata'],
    'meta-failed': ['var(--warning-color, orange)', '\u26a0 Meta fail'],
    'caching': ['var(--text-secondary, #888)', 'Downloading...'],
    'cached': ['var(--success-color, green)', '\u2713 Synced'],
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
        'metadata': 'success', 'meta-failed': 'warn',
        'caching': 'info', 'cached': 'success', 'failed': 'error', 'quota': 'error'
      };
      logSyncActivity(`${catalogId}: ${message}`, logTypeMap[status] || 'info');
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
      logSyncActivity(msg, failed > 0 || quotaExceeded ? 'warn' : 'success');

      // Refresh table and stats
      await renderEligibleItemsTable();
      await renderSyncStats();

      // Refresh Numista usage bar + settings footer storage display
      if (typeof renderNumistaUsageBar === 'function') renderNumistaUsageBar();
      if (typeof updateSettingsFooter === 'function') updateSettingsFooter();
    }
  });
};

/**
 * Clears all cached images and metadata after confirmation.
 */
const clearAllCachedData = async () => {
  if (!window.imageCache?.isAvailable()) return;

  const usage = await imageCache.getStorageUsage();
  if (usage.count === 0) {
    logSyncActivity('No cached data to clear', 'info');
    return;
  }

  // eslint-disable-next-line no-restricted-globals
  if (!confirm(`Delete all ${usage.count} cached entries (images + metadata)? This cannot be undone.`)) return;

  const ok = await imageCache.clearAll();
  if (ok) {
    logSyncActivity(`Cleared all ${usage.count} cached entries`, 'warn');
  } else {
    logSyncActivity('Failed to clear cache', 'error');
  }

  await renderEligibleItemsTable();
  await renderSyncStats();
  if (typeof updateSettingsFooter === 'function') updateSettingsFooter();
};

// ---------------------------------------------------------------------------
// Global exports
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  window.renderNumistaSyncUI = renderNumistaSyncUI;
  window.startBulkSync = startBulkSync;
  window.clearAllCachedData = clearAllCachedData;
}

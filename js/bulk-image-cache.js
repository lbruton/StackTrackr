// BULK SYNC (STACK-87/88)
// =============================================================================
// Syncs metadata for inventory items that have Numista catalog IDs.
// Sequential with configurable delay to avoid API rate-limiting.
// Resolves catalog IDs from catalogManager when not directly on items.
// Fetches metadata + image URLs from Numista API, caches metadata to IndexedDB.
// Image caching is handled on-demand by the view modal (viewModal.js).
// =============================================================================

// eslint-disable-next-line no-unused-vars
const BulkImageCache = (() => {
  let _aborted = false;
  let _running = false;

  /**
   * Resolves catalog ID for an inventory item.
   * Checks item.numistaId first, then catalogManager mappings.
   * @param {Object} item
   * @returns {string} Catalog ID or empty string
   */
  function resolveCatalogId(item) {
    if (item.numistaId && String(item.numistaId).trim()) {
      return String(item.numistaId).trim();
    }
    // Fall back to catalogManager mapping by serial
    if (item.serial && window.catalogManager) {
      const mapped = catalogManager.getCatalogId(String(item.serial));
      if (mapped && String(mapped).trim()) return String(mapped).trim();
    }
    return '';
  }

  /**
   * Build the list of unique {item, catalogId} entries eligible for caching.
   * @returns {Array<{item: Object, catalogId: string}>}
   */
  function buildEligibleList() {
    const seen = new Set();
    const list = [];
    for (const item of (typeof inventory !== 'undefined' ? inventory : [])) {
      const catId = resolveCatalogId(item);
      if (!catId) continue;
      if (seen.has(catId)) continue;
      seen.add(catId);
      list.push({ item, catalogId: catId });
    }
    return list;
  }

  /**
   * Sync metadata for all inventory items that have Numista catalog IDs.
   * Resolves IDs from catalogManager and fetches metadata + image URLs from
   * the Numista API. Image downloading is NOT performed here — images are
   * loaded on-demand when the user opens the view modal.
   * @param {Object} opts
   * @param {function({current:number, total:number, catalogId:string}):void} [opts.onProgress]
   * @param {function({synced:number, skipped:number, failed:number, apiLookups:number, elapsed:number}):void} [opts.onComplete]
   * @param {function({catalogId:string, status:string, message:string}):void} [opts.onLog]
   * @param {number} [opts.delay=200] - Delay (ms) between network requests
   * @returns {Promise<void>}
   */
  async function cacheAll({ onProgress, onComplete, onLog, delay = 200 } = {}) {
    if (_running) return;
    if (!window.imageCache?.isAvailable()) return;

    _running = true;
    _aborted = false;

    const startTime = Date.now();
    let synced = 0;
    let skipped = 0;
    let failed = 0;
    let apiLookups = 0;

    const entries = buildEligibleList();
    const total = entries.length;

    for (let i = 0; i < entries.length; i++) {
      if (_aborted) break;

      const { item, catalogId } = entries[i];

      if (onProgress) {
        onProgress({ current: i + 1, total, catalogId });
      }

      // Check if metadata is already cached — skip if so
      const hasMetaCached = !!(await imageCache.getMetadata(catalogId));
      if (hasMetaCached) {
        skipped++;
        if (onLog) onLog({ catalogId, status: 'skip-cached', message: 'Already synced' });
        continue;
      }

      // Resolve image URLs from item properties first
      const _valid = (u) => ImageCache.isValidImageUrl(u);
      let obverseUrl = _valid(item.obverseImageUrl) ? item.obverseImageUrl : '';
      let reverseUrl = _valid(item.reverseImageUrl) ? item.reverseImageUrl : '';

      // Fetch & cache metadata from Numista API (also resolves image URLs)
      if (window.catalogAPI) {
        if (onLog) onLog({ catalogId, status: 'api-lookup', message: 'Syncing metadata from Numista...' });
        try {
          const apiResult = await catalogAPI.lookupItem(catalogId);
          apiLookups++;

          // Persist image URLs back to item for CDN fallback in view modal
          if (!obverseUrl && apiResult.imageUrl) {
            obverseUrl = apiResult.imageUrl;
            item.obverseImageUrl = obverseUrl;
          }
          if (!reverseUrl && apiResult.reverseImageUrl) {
            reverseUrl = apiResult.reverseImageUrl;
            item.reverseImageUrl = reverseUrl;
          }
          // Also sync numistaId back to item if it was only in catalogManager
          if (!item.numistaId) item.numistaId = catalogId;

          // Cache metadata to IndexedDB
          await imageCache.cacheMetadata(catalogId, apiResult);
          synced++;
          if (onLog) onLog({ catalogId, status: 'metadata', message: 'Metadata synced' });
        } catch (err) {
          failed++;
          if (onLog) onLog({ catalogId, status: 'meta-failed', message: `Metadata: ${err.message}` });
        }
      } else {
        failed++;
        if (onLog) onLog({ catalogId, status: 'meta-failed', message: 'Catalog API not available' });
      }

      // Delay between requests to avoid rate-limiting
      if (i < entries.length - 1 && !_aborted) {
        await new Promise(r => setTimeout(r, delay));
      }
    }

    _running = false;

    // Persist any URL updates back to localStorage
    if (apiLookups > 0 && typeof saveInventory === 'function') {
      saveInventory();
    }

    const elapsed = Date.now() - startTime;
    if (onComplete) {
      onComplete({ synced, skipped, failed, apiLookups, elapsed });
    }
  }

  /**
   * Abort a running bulk cache operation.
   */
  function abort() {
    _aborted = true;
  }

  /**
   * Whether a bulk cache operation is currently running.
   * @returns {boolean}
   */
  function isRunning() {
    return _running;
  }

  return { cacheAll, abort, isRunning, buildEligibleList, resolveCatalogId };
})();

if (typeof window !== 'undefined') {
  window.BulkImageCache = BulkImageCache;
}

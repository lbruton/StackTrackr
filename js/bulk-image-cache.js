// BULK SYNC (STACK-87/88)
// =============================================================================
// Syncs metadata and images for inventory items that have Numista catalog IDs.
// Sequential with configurable delay to avoid API/CDN rate-limiting.
// Resolves catalog IDs from catalogManager when not directly on items.
// Fetches metadata + image URLs from Numista API, caches both to IndexedDB.
// Reuses imageCache.cacheImages() pipeline (fetch → resize → compress → store).
// =============================================================================

// eslint-disable-next-line no-unused-vars
const BulkImageCache = (() => {
  let _aborted = false;
  let _running = false;

  /**
   * Preloads image URLs into the browser cache via hidden <img> elements.
   * Works on file:// protocol where fetch/canvas are blocked by CORS.
   * @param {string} obverseUrl
   * @param {string} reverseUrl
   * @returns {Promise<boolean>} true if at least one image loaded
   */
  function _preloadViaBrowserCache(obverseUrl, reverseUrl) {
    const urls = [obverseUrl, reverseUrl].filter(Boolean);
    if (!urls.length) return Promise.resolve(false);

    return new Promise((resolve) => {
      let loaded = 0;
      let succeeded = false;
      const total = urls.length;

      for (const url of urls) {
        const img = new Image();
        img.onload = () => {
          succeeded = true;
          if (++loaded >= total) resolve(succeeded);
        };
        img.onerror = () => {
          if (++loaded >= total) resolve(succeeded);
        };
        img.src = url;
      }

      // Safety timeout — don't hang forever
      setTimeout(() => resolve(succeeded), 15000);
    });
  }

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
   * Cache images for all inventory items that have Numista catalog IDs.
   * Resolves IDs from catalogManager and fetches image URLs from Numista API
   * when they are not stored on the inventory item.
   * @param {Object} opts
   * @param {function({current:number, total:number, catalogId:string}):void} [opts.onProgress]
   * @param {function({cached:number, skipped:number, failed:number, apiLookups:number, quotaExceeded:boolean, elapsed:number}):void} [opts.onComplete]
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
    let cached = 0;
    let skipped = 0;
    let failed = 0;
    let apiLookups = 0;
    let quotaExceeded = false;

    const entries = buildEligibleList();
    const total = entries.length;

    for (let i = 0; i < entries.length; i++) {
      if (_aborted) break;

      const { item, catalogId } = entries[i];

      if (onProgress) {
        onProgress({ current: i + 1, total, catalogId });
      }

      // Check what's already synced
      const hasImagesCached = await imageCache.hasImages(catalogId);
      const hasMetaCached = !!(await imageCache.getMetadata(catalogId));

      // Skip if both images and metadata are already cached
      if (hasImagesCached && hasMetaCached) {
        skipped++;
        if (onLog) onLog({ catalogId, status: 'skip-cached', message: 'Already synced' });
        continue;
      }

      // Check quota before fetching
      const usage = await imageCache.getStorageUsage();
      if (usage.totalBytes >= usage.limitBytes) {
        quotaExceeded = true;
        if (onLog) onLog({ catalogId, status: 'quota', message: 'Storage quota exceeded — stopping' });
        break;
      }

      // Resolve image URLs from item properties first
      // Validate URLs — corrupted strings (missing ://) must be treated as empty
      const _valid = (u) => ImageCache.isValidImageUrl(u);
      let obverseUrl = _valid(item.obverseImageUrl) ? item.obverseImageUrl : '';
      let reverseUrl = _valid(item.reverseImageUrl) ? item.reverseImageUrl : '';

      // Fetch & cache metadata from Numista API (also resolves image URLs)
      if (!hasMetaCached && window.catalogAPI) {
        if (onLog) onLog({ catalogId, status: 'api-lookup', message: 'Syncing metadata from Numista...' });
        try {
          const apiResult = await catalogAPI.lookupItem(catalogId);
          apiLookups++;

          // Persist image URLs back to item
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
          if (onLog) onLog({ catalogId, status: 'metadata', message: 'Metadata synced' });
        } catch (err) {
          if (onLog) onLog({ catalogId, status: 'meta-failed', message: `Metadata: ${err.message}` });
          // Continue to image caching even if metadata fails
        }
      }

      // Skip image caching if already done
      if (hasImagesCached) continue;

      // Check existing IDB record for stored URLs if still missing
      if (!obverseUrl && !reverseUrl) {
        const imgRecord = await imageCache.getImages(catalogId);
        obverseUrl = _valid(imgRecord?.obverseUrl) ? imgRecord.obverseUrl : '';
        reverseUrl = _valid(imgRecord?.reverseUrl) ? imgRecord.reverseUrl : '';
      }

      if (!obverseUrl && !reverseUrl) {
        skipped++;
        if (onLog) onLog({ catalogId, status: 'skip-no-url', message: 'No image URLs available' });
        continue;
      }

      if (onLog) {
        const urlInfo = [obverseUrl ? 'obverse' : '', reverseUrl ? 'reverse' : ''].filter(Boolean).join(' + ');
        onLog({ catalogId, status: 'caching', message: `Downloading: ${urlInfo} ...` });
      }

      try {
        const result = await imageCache.cacheImages(catalogId, obverseUrl, reverseUrl);
        if (result) {
          cached++;
          if (onLog) onLog({ catalogId, status: 'cached', message: 'Cached successfully' });
        } else {
          // IDB caching failed — try browser-cache preload via <img> elements
          const preloaded = await _preloadViaBrowserCache(obverseUrl, reverseUrl);
          if (preloaded) {
            cached++;
            if (onLog) onLog({ catalogId, status: 'browser-cached',
              message: 'Preloaded to browser cache (file:// mode)' });
          } else {
            failed++;
            const urls = [obverseUrl, reverseUrl].filter(Boolean).join(', ');
            if (onLog) onLog({ catalogId, status: 'failed',
              message: `All cache strategies failed — URLs: ${urls}` });
          }
        }
      } catch (err) {
        // IDB threw — try browser-cache preload as last resort
        const preloaded = await _preloadViaBrowserCache(obverseUrl, reverseUrl);
        if (preloaded) {
          cached++;
          if (onLog) onLog({ catalogId, status: 'browser-cached',
            message: 'Preloaded to browser cache (file:// mode)' });
        } else {
          failed++;
          if (onLog) onLog({ catalogId, status: 'failed', message: err.message || 'Unknown error' });
        }
      }

      // Delay between requests to avoid rate-limiting
      if (i < entries.length - 1 && !_aborted) {
        await new Promise(r => setTimeout(r, delay));
      }
    }

    _running = false;

    // Persist any URL updates back to localStorage
    if ((cached > 0 || apiLookups > 0) && typeof saveInventory === 'function') {
      saveInventory();
    }

    const elapsed = Date.now() - startTime;
    if (onComplete) {
      onComplete({ cached, skipped, failed, apiLookups, quotaExceeded, elapsed });
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

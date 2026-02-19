// IMAGE CACHE — IndexedDB storage for coin images and Numista metadata
// =============================================================================

/**
 * ImageCache provides persistent IndexedDB storage for coin images (obverse/reverse)
 * and enriched Numista metadata. Images are resized and compressed to JPEG before storage.
 *
 * Schema:
 *   DB: StakTrakrImages v3
 *   Store "coinImages"    — keyPath: catalogId (Numista N# string)
 *   Store "coinMetadata"  — keyPath: catalogId (Numista N# string)
 *   Store "userImages"    — keyPath: uuid (item UUID string)
 *   Store "patternImages" — keyPath: ruleId (pattern rule ID string)
 *
 * @class
 */
class ImageCache {
  constructor() {
    /** @type {IDBDatabase|null} */
    this._db = null;
    /** @type {boolean} */
    this._available = false;
    /** @type {number} Default storage quota in bytes (50 MB) */
    this._quotaBytes = 50 * 1024 * 1024;
    /** @type {number} Max image dimension (px) for resize */
    this._maxDim = typeof IMAGE_MAX_DIM !== 'undefined' ? IMAGE_MAX_DIM : 600;
    /** @type {number} Compression quality (0-1) */
    this._quality = typeof IMAGE_QUALITY !== 'undefined' ? IMAGE_QUALITY : 0.75;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Open (or create) the IndexedDB database. Safe to call multiple times.
   * @returns {Promise<boolean>} true if DB opened successfully
   */
  async init() {
    if (this._db) return true;

    if (typeof indexedDB === 'undefined') {
      console.warn('ImageCache: IndexedDB not available');
      return false;
    }

    try {
      this._db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('StakTrakrImages', 3);

        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('coinImages')) {
            db.createObjectStore('coinImages', { keyPath: 'catalogId' });
          }
          if (!db.objectStoreNames.contains('coinMetadata')) {
            db.createObjectStore('coinMetadata', { keyPath: 'catalogId' });
          }
          // v2: User-uploaded images keyed by item UUID (STACK-32)
          if (!db.objectStoreNames.contains('userImages')) {
            db.createObjectStore('userImages', { keyPath: 'uuid' });
          }
          // v3: Pattern images keyed by rule ID (user pattern image rules)
          if (e.oldVersion < 3) {
            if (!db.objectStoreNames.contains('patternImages')) {
              db.createObjectStore('patternImages', { keyPath: 'ruleId' });
            }
          }
        };

        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
      });

      // Detect browser-initiated connection closure
      this._db.onclose = () => {
        console.warn('ImageCache: DB connection closed by browser');
        this._db = null;
        this._available = false;
      };

      this._available = true;
      debugLog('ImageCache: initialized');
      return true;
    } catch (err) {
      console.warn('ImageCache: failed to open DB', err);
      this._available = false;
      return false;
    }
  }

  /**
   * Whether IndexedDB opened successfully.
   * @returns {boolean}
   */
  isAvailable() {
    return this._available;
  }

  /**
   * Ensure the DB connection is alive, reconnecting if stale.
   * Call this before every public operation to guard against
   * browser-initiated connection closures (storage pressure,
   * tab backgrounding, etc.).
   * @returns {Promise<boolean>}
   */
  async _ensureDb() {
    if (this._db) {
      try {
        // Lightweight probe — creating a transaction will throw if connection is dead
        this._db.transaction('coinImages', 'readonly');
        return true;
      } catch {
        console.warn('ImageCache: DB connection stale, reconnecting...');
        this._db = null;
        this._available = false;
      }
    }
    return this.init();
  }

  // ---------------------------------------------------------------------------
  // Image storage
  // ---------------------------------------------------------------------------

  /**
   * Fetch, resize, compress, and store obverse/reverse images for a coin type.
   * @param {string} catalogId - Numista N# identifier
   * @param {string} obverseUrl - CDN URL for obverse image
   * @param {string} reverseUrl - CDN URL for reverse image
   * @returns {Promise<boolean>} true if at least one image was cached
   */
  async cacheImages(catalogId, obverseUrl, reverseUrl) {
    if (!catalogId || !(await this._ensureDb())) return false;

    // Skip if already cached
    if (await this.hasImages(catalogId)) return true;

    // Check quota before proceeding
    const usage = await this.getStorageUsage();
    if (usage.totalBytes >= this._quotaBytes) {
      console.warn('ImageCache: quota exceeded, skipping cache');
      return false;
    }

    const obverseBlob = obverseUrl ? await this._fetchAndResize(obverseUrl) : null;
    const reverseBlob = reverseUrl ? await this._fetchAndResize(reverseUrl) : null;

    if (!obverseBlob && !reverseBlob) return false;

    const size = (obverseBlob?.size || 0) + (reverseBlob?.size || 0);

    const record = {
      catalogId,
      obverse: obverseBlob,
      reverse: reverseBlob,
      obverseUrl: obverseUrl || '',
      reverseUrl: reverseUrl || '',
      cachedAt: Date.now(),
      size
    };

    return this._put('coinImages', record);
  }

  /**
   * Store enriched Numista metadata for a coin type.
   * @param {string} catalogId - Numista N# identifier
   * @param {Object} numistaResult - Normalized Numista result object
   * @returns {Promise<boolean>}
   */
  async cacheMetadata(catalogId, numistaResult) {
    if (!catalogId || !numistaResult || !(await this._ensureDb())) return false;

    const record = {
      catalogId,
      title: numistaResult.name || '',
      country: numistaResult.country || '',
      denomination: numistaResult.denomination || '',
      diameter: numistaResult.diameter || numistaResult.size || 0,
      thickness: numistaResult.thickness || 0,
      weight: numistaResult.weight || 0,
      shape: numistaResult.shape || '',
      composition: numistaResult.composition || numistaResult.metal || '',
      orientation: numistaResult.orientation || '',
      commemorative: !!numistaResult.commemorative,
      commemorativeDesc: numistaResult.commemorativeDesc || '',
      rarityIndex: numistaResult.rarityIndex || 0,
      kmReferences: numistaResult.kmReferences || [],
      mintageByYear: numistaResult.mintageByYear || [],
      technique: numistaResult.technique || '',
      tags: numistaResult.tags || [],
      obverseDesc: numistaResult.obverseDesc || '',
      reverseDesc: numistaResult.reverseDesc || '',
      edgeDesc: numistaResult.edgeDesc || '',
      cachedAt: Date.now()
    };

    return this._put('coinMetadata', record);
  }

  /**
   * Retrieve the full image record for a coin type.
   * @param {string} catalogId
   * @returns {Promise<Object|null>}
   */
  async getImages(catalogId) {
    if (!catalogId || !(await this._ensureDb())) return null;
    return this._get('coinImages', catalogId);
  }

  /**
   * Retrieve the metadata record for a coin type.
   * @param {string} catalogId
   * @returns {Promise<Object|null>}
   */
  async getMetadata(catalogId) {
    if (!catalogId || !(await this._ensureDb())) return null;
    return this._get('coinMetadata', catalogId);
  }

  /**
   * Create an object URL from a cached image blob.
   * Caller is responsible for revoking via URL.revokeObjectURL().
   * @param {string} catalogId
   * @param {'obverse'|'reverse'} side
   * @returns {Promise<string|null>} Object URL or null
   */
  async getImageUrl(catalogId, side) {
    const record = await this.getImages(catalogId);
    const blob = record?.[side];
    // Reject empty blobs (e.g. opaque responses that lost data in IDB round-trip)
    if (!blob || (blob.size === 0 && !blob.type)) return null;
    return URL.createObjectURL(blob);
  }

  /**
   * Quick existence check without loading blobs.
   * @param {string} catalogId
   * @returns {Promise<boolean>}
   */
  async hasImages(catalogId) {
    if (!catalogId || !(await this._ensureDb())) return false;

    return new Promise((resolve) => {
      try {
        const tx = this._db.transaction('coinImages', 'readonly');
        const req = tx.objectStore('coinImages').count(IDBKeyRange.only(catalogId));
        req.onsuccess = () => resolve(req.result > 0);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * List all cached catalog IDs without loading blob data.
   * Uses key-only cursor for minimal memory footprint.
   * @returns {Promise<string[]>}
   */
  async listAllCachedIds() {
    if (!(await this._ensureDb())) return [];
    return new Promise((resolve) => {
      try {
        const tx = this._db.transaction('coinImages', 'readonly');
        const req = tx.objectStore('coinImages').getAllKeys();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch { resolve([]); }
    });
  }

  /**
   * Remove a single image record.
   * @param {string} catalogId
   * @returns {Promise<boolean>}
   */
  async deleteImages(catalogId) {
    if (!catalogId || !(await this._ensureDb())) return false;
    return this._delete('coinImages', catalogId);
  }

  /**
   * Delete cached metadata for a catalog ID.
   * @param {string} catalogId
   * @returns {Promise<boolean>}
   */
  async deleteMetadata(catalogId) {
    if (!catalogId || !(await this._ensureDb())) return false;
    return this._delete('coinMetadata', catalogId);
  }

  // ---------------------------------------------------------------------------
  // Export / Import (for ZIP backup — STACK-88)
  // ---------------------------------------------------------------------------

  /**
   * Export all image records (with blobs) for backup.
   * @returns {Promise<Array>}
   */
  async exportAllImages() {
    if (!(await this._ensureDb())) return [];
    return this._getAll('coinImages');
  }

  /**
   * Export all metadata records for backup.
   * @returns {Promise<Array>}
   */
  async exportAllMetadata() {
    if (!(await this._ensureDb())) return [];
    return this._getAll('coinMetadata');
  }

  /**
   * Import a single image record (from ZIP restore).
   * @param {Object} record - Image record with catalogId, obverse, reverse blobs
   * @returns {Promise<boolean>}
   */
  async importImageRecord(record) {
    if (!record?.catalogId || !(await this._ensureDb())) return false;
    return this._put('coinImages', record);
  }

  /**
   * Import a single metadata record (from ZIP restore).
   * @param {Object} record - Metadata record with catalogId key
   * @returns {Promise<boolean>}
   */
  async importMetadataRecord(record) {
    if (!record?.catalogId || !(await this._ensureDb())) return false;
    return this._put('coinMetadata', record);
  }

  /**
   * Clear both object stores.
   * @returns {Promise<boolean>}
   */
  async clearAll() {
    if (!(await this._ensureDb())) return false;

    try {
      const stores = ['coinImages', 'coinMetadata'];
      if (this._db.objectStoreNames.contains('userImages')) stores.push('userImages');
      if (this._db.objectStoreNames.contains('patternImages')) stores.push('patternImages');
      const tx = this._db.transaction(stores, 'readwrite');
      for (const s of stores) tx.objectStore(s).clear();
      await this._txComplete(tx);
      debugLog('ImageCache: cleared all stores');
      return true;
    } catch (err) {
      console.warn('ImageCache: clearAll failed', err);
      return false;
    }
  }

  /**
   * Calculate current storage usage across all stores.
   * @returns {Promise<{count: number, totalBytes: number, limitBytes: number, metadataCount: number, userImageCount: number, patternImageCount: number, numistaCount: number}>}
   */
  async getStorageUsage() {
    const result = { count: 0, totalBytes: 0, metadataCount: 0, userImageCount: 0, patternImageCount: 0, numistaCount: 0, limitBytes: this._quotaBytes };
    if (!(await this._ensureDb())) return result;

    try {
      const records = await this._getAll('coinImages');
      result.count = records.length;
      result.numistaCount = records.length;
      for (const rec of records) {
        result.totalBytes += rec.size || 0;
      }
    } catch {
      // ignore
    }

    try {
      const metaRecords = await this._getAll('coinMetadata');
      result.metadataCount = metaRecords.length;
      for (const rec of metaRecords) {
        result.totalBytes += new Blob([JSON.stringify(rec)]).size;
      }
    } catch {
      // ignore
    }

    try {
      if (this._db.objectStoreNames.contains('userImages')) {
        const userRecords = await this._getAll('userImages');
        result.userImageCount = userRecords.length;
        for (const rec of userRecords) {
          result.totalBytes += rec.size || 0;
        }
      }
    } catch {
      // ignore
    }

    try {
      if (this._db.objectStoreNames.contains('patternImages')) {
        const patternRecords = await this._getAll('patternImages');
        result.patternImageCount = patternRecords.length;
        for (const rec of patternRecords) {
          result.totalBytes += rec.size || 0;
        }
      }
    } catch {
      // ignore
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Image resolution cascade (STACK-32)
  // ---------------------------------------------------------------------------

  /**
   * Resolve the best available image for an inventory item.
   * Default:  user upload → pattern image → numista cache → null.
   * Override: numista cache → user upload → pattern image → null.
   *
   * @param {Object} item - Inventory item with uuid, numistaId, name, metal, type fields
   * @returns {Promise<{catalogId: string, source: 'user'|'pattern'|'numista'}|null>}
   */
  async resolveImageForItem(item) {
    if (!item || !(await this._ensureDb())) return null;

    // Check Numista override toggle
    // When ON:  numista cache → user upload → pattern image
    // When OFF: user upload → pattern image → numista cache
    const numistaOverride = localStorage.getItem('numistaOverridePersonal') === 'true';

    // Helper: check user-uploaded image (by UUID in userImages store)
    const _checkUserImage = async () => {
      if (!item.uuid || !this._db.objectStoreNames.contains('userImages')) return null;
      const userRec = await this._get('userImages', item.uuid);
      if (userRec?.obverse?.size > 0) {
        return { catalogId: item.uuid, source: 'user' };
      }
      return null;
    };

    // Helper: check pattern images store for a matching rule
    const _checkPatternImage = async () => {
      if (typeof NumistaLookup === 'undefined') return null;
      const match = NumistaLookup.matchQuery(item.name || '');
      if (!match?.rule?.seedImageId) return null;
      const ruleImageId = match.rule.seedImageId;
      if (this._db.objectStoreNames.contains('patternImages')) {
        const rec = await this._get('patternImages', ruleImageId);
        if (rec?.obverse?.size > 0) {
          return { catalogId: ruleImageId, source: 'pattern' };
        }
      }
      return null;
    };

    // Helper: check Numista API cache
    const _checkNumistaCache = async () => {
      const catalogId = item.numistaId || '';
      if (catalogId && await this.hasImages(catalogId)) {
        return { catalogId, source: 'numista' };
      }
      return null;
    };

    if (numistaOverride) {
      // Override mode: Numista wins over everything
      const numista = await _checkNumistaCache();
      if (numista) return numista;
      const user = await _checkUserImage();
      if (user) return user;
      const pattern = await _checkPatternImage();
      if (pattern) return pattern;
    } else {
      // Default: user uploads → pattern rules → Numista cache
      const user = await _checkUserImage();
      if (user) return user;
      const pattern = await _checkPatternImage();
      if (pattern) return pattern;
      const numista = await _checkNumistaCache();
      if (numista) return numista;
    }

    return null;
  }

  /**
   * Resolves and returns an object URL for the best available image side.
   * Uses resolveImageForItem() to select source, then loads the requested side.
   *
   * @param {Object} item - Inventory item with uuid/numistaId/name metadata
   * @param {'obverse'|'reverse'} [side='obverse']
   * @returns {Promise<string|null>} Object URL (caller must revoke) or null
   */
  async resolveImageUrlForItem(item, side = 'obverse') {
    const normalizedSide = side === 'reverse' ? 'reverse' : 'obverse';
    const resolved = await this.resolveImageForItem(item);
    if (!resolved) return null;

    if (resolved.source === 'user') {
      return this.getUserImageUrl(resolved.catalogId, normalizedSide);
    }
    if (resolved.source === 'pattern') {
      return this.getPatternImageUrl(resolved.catalogId, normalizedSide);
    }
    return this.getImageUrl(resolved.catalogId, normalizedSide);
  }

  /**
   * Get a user-uploaded image as an object URL.
   * Caller must revoke the URL when done.
   * @param {string} uuid - Item UUID
   * @param {'obverse'|'reverse'} [side='obverse']
   * @returns {Promise<string|null>}
   */
  async getUserImageUrl(uuid, side = 'obverse') {
    if (!uuid || !(await this._ensureDb())) return null;
    if (!this._db.objectStoreNames.contains('userImages')) return null;
    const rec = await this._get('userImages', uuid);
    const blob = rec?.[side];
    if (!blob || blob.size === 0) return null;
    return URL.createObjectURL(blob);
  }

  // ---------------------------------------------------------------------------
  // User image CRUD (STACK-32)
  // ---------------------------------------------------------------------------

  /**
   * Store a user-uploaded image for an inventory item.
   * @param {string} uuid - Item UUID
   * @param {Blob} obverse - Processed obverse image blob
   * @param {Blob} [reverse] - Optional reverse image blob
   * @returns {Promise<boolean>}
   */
  async cacheUserImage(uuid, obverse, reverse = null) {
    if (!uuid || !obverse) {
      debugLog('ImageCache.cacheUserImage: missing uuid or obverse blob');
      return false;
    }
    if (!(await this._ensureDb())) {
      debugLog('ImageCache.cacheUserImage: DB not available, attempting re-init');
      // Defensive retry: re-open DB in case v2 upgrade didn't complete
      this._db = null;
      this._available = false;
      if (!(await this.init())) {
        debugLog('ImageCache.cacheUserImage: re-init failed');
        return false;
      }
    }
    if (!this._db.objectStoreNames.contains('userImages')) {
      debugLog('ImageCache.cacheUserImage: userImages store missing — DB may need upgrade');
      return false;
    }

    const size = (obverse?.size || 0) + (reverse?.size || 0);
    const record = {
      uuid,
      obverse,
      reverse: reverse || null,
      cachedAt: Date.now(),
      size,
    };

    const result = await this._put('userImages', record);
    debugLog(`ImageCache.cacheUserImage: uuid=${uuid} size=${size} saved=${result}`);
    return result;
  }

  /**
   * Retrieve a user-uploaded image record.
   * @param {string} uuid - Item UUID
   * @returns {Promise<Object|null>}
   */
  async getUserImage(uuid) {
    if (!uuid || !(await this._ensureDb())) return null;
    if (!this._db.objectStoreNames.contains('userImages')) return null;
    return this._get('userImages', uuid);
  }

  /**
   * Delete a user-uploaded image.
   * @param {string} uuid - Item UUID
   * @returns {Promise<boolean>}
   */
  async deleteUserImage(uuid) {
    if (!uuid || !(await this._ensureDb())) return false;
    if (!this._db.objectStoreNames.contains('userImages')) return false;
    return this._delete('userImages', uuid);
  }

  /**
   * Export all user images for backup.
   * @returns {Promise<Array>}
   */
  async exportAllUserImages() {
    if (!(await this._ensureDb())) return [];
    if (!this._db.objectStoreNames.contains('userImages')) return [];
    return this._getAll('userImages');
  }

  /**
   * Import a single user image record (from ZIP restore).
   * @param {Object} record - User image record with uuid key
   * @returns {Promise<boolean>}
   */
  async importUserImageRecord(record) {
    if (!record?.uuid || !(await this._ensureDb())) return false;
    if (!this._db.objectStoreNames.contains('userImages')) return false;
    return this._put('userImages', record);
  }

  // ---------------------------------------------------------------------------
  // Pattern image CRUD (user pattern image rules)
  // ---------------------------------------------------------------------------

  /**
   * Store pattern rule images (obverse/reverse blobs).
   * @param {string} ruleId - Pattern rule ID
   * @param {Blob|null} obverseBlob
   * @param {Blob|null} reverseBlob
   * @returns {Promise<boolean>}
   */
  async cachePatternImage(ruleId, obverseBlob, reverseBlob) {
    if (!ruleId || !(await this._ensureDb())) return false;
    if (!this._db.objectStoreNames.contains('patternImages')) return false;

    const size = (obverseBlob?.size || 0) + (reverseBlob?.size || 0);
    const record = {
      ruleId,
      obverse: obverseBlob || null,
      reverse: reverseBlob || null,
      cachedAt: Date.now(),
      size,
    };
    return this._put('patternImages', record);
  }

  /**
   * Retrieve a pattern image record by rule ID.
   * @param {string} ruleId
   * @returns {Promise<Object|null>}
   */
  async getPatternImage(ruleId) {
    if (!ruleId || !(await this._ensureDb())) return null;
    if (!this._db.objectStoreNames.contains('patternImages')) return null;
    return this._get('patternImages', ruleId);
  }

  /**
   * Get a pattern image as an object URL.
   * Caller must revoke the URL when done.
   * @param {string} ruleId
   * @param {'obverse'|'reverse'} [side='obverse']
   * @returns {Promise<string|null>}
   */
  async getPatternImageUrl(ruleId, side = 'obverse') {
    const rec = await this.getPatternImage(ruleId);
    const blob = rec?.[side];
    if (!blob || blob.size === 0) return null;
    return URL.createObjectURL(blob);
  }

  /**
   * Delete a pattern image record.
   * @param {string} ruleId
   * @returns {Promise<boolean>}
   */
  async deletePatternImage(ruleId) {
    if (!ruleId || !(await this._ensureDb())) return false;
    if (!this._db.objectStoreNames.contains('patternImages')) return false;
    return this._delete('patternImages', ruleId);
  }

  /**
   * Export all pattern image records for backup.
   * @returns {Promise<Array>}
   */
  async exportAllPatternImages() {
    if (!(await this._ensureDb())) return [];
    if (!this._db.objectStoreNames.contains('patternImages')) return [];
    return this._getAll('patternImages');
  }

  /**
   * Export all coin (CDN) image records for backup.
   * @returns {Promise<Array>}
   */
  async exportAllCoinImages() {
    if (!(await this._ensureDb())) return [];
    if (!this._db.objectStoreNames.contains('coinImages')) return [];
    return this._getAll('coinImages');
  }

  /**
   * Import a single pattern image record (from ZIP restore).
   * @param {Object} record - Pattern image record with ruleId key
   * @returns {Promise<boolean>}
   */
  async importPatternImageRecord(record) {
    if (!record?.ruleId || !(await this._ensureDb())) return false;
    if (!this._db.objectStoreNames.contains('patternImages')) return false;
    return this._put('patternImages', record);
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  /**
   * Check whether a string looks like a usable image URL.
   * Rejects corrupted URLs that have had special characters stripped.
   * @param {string} url
   * @returns {boolean}
   */
  static isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return /^https?:\/\/.+\..+/i.test(url);
  }

  // ---------------------------------------------------------------------------
  // Image pipeline (private)
  // ---------------------------------------------------------------------------

  /**
   * Fetch an image URL using a multi-strategy cascade that gracefully
   * degrades when CORS headers are unavailable (e.g. Numista CDN).
   *
   * Strategy A: fetch(CORS) → createImageBitmap → canvas resize → JPEG blob
   * Strategy B: fetch(CORS) succeeded but canvas tainted → store raw blob
   * Strategy C: Image element (no crossOrigin) → canvas → JPEG blob
   * Strategy D: fetch(no-cors) → non-opaque blob if available (opaque blobs rejected — lose data in IDB)
   *
   * @param {string} url
   * @returns {Promise<Blob|null>}
   */
  async _fetchAndResize(url) {
    if (!url || !ImageCache.isValidImageUrl(url)) return null;

    // --- Strategy A: CORS fetch → ImageProcessor pipeline ---
    try {
      const resp = await fetch(url, { mode: 'cors' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();

      // Prefer ImageProcessor (WebP + byte budget) when available
      if (typeof imageProcessor !== 'undefined') {
        const result = await imageProcessor.processFile(blob, {
          maxDim: this._maxDim,
          quality: this._quality,
        });
        if (result?.blob) return result.blob;
      }

      // Fallback: bitmap → canvas resize
      const imgBitmap = await createImageBitmap(blob);
      const resized = await this._resizeAndCompress(imgBitmap);
      if (resized) return resized;

      // Strategy B: fetch succeeded but canvas failed — use raw blob
      console.warn('ImageCache: Strategy A canvas failed, using raw blob for', url);
      return blob;
    } catch (errA) {
      console.warn('ImageCache: Strategy A (CORS fetch) failed for', url, errA.message);
    }

    // --- Strategy C: Image element without crossOrigin → canvas ---
    try {
      const img = await this._loadImageElement(url, false);
      const resized = await this._resizeAndCompress(img);
      if (resized) return resized;
      console.warn('ImageCache: Strategy C canvas tainted for', url);
    } catch (errC) {
      console.warn('ImageCache: Strategy C (Image element) failed for', url, errC.message);
    }

    // --- Strategy D: no-cors fetch → opaque blob (displayable via object URL) ---
    try {
      const blob = await this._fetchBlobDirect(url);
      if (blob) {
        console.warn('ImageCache: Strategy D (no-cors blob) succeeded for', url);
        return blob;
      }
    } catch (errD) {
      console.warn('ImageCache: Strategy D (no-cors) failed for', url, errD.message);
    }

    console.warn('ImageCache: all strategies failed for', url);
    return null;
  }

  /**
   * Resize and compress an image source using ImageProcessor (STACK-95).
   * Falls back to inline Canvas JPEG if ImageProcessor is unavailable.
   * @param {ImageBitmap|HTMLImageElement} source
   * @returns {Promise<Blob|null>}
   */
  async _resizeAndCompress(source) {
    // Delegate to ImageProcessor when available
    if (typeof imageProcessor !== 'undefined') {
      try {
        // Convert source to blob first so ImageProcessor can handle it
        const canvas = document.createElement('canvas');
        canvas.width = source.width;
        canvas.height = source.height;
        canvas.getContext('2d').drawImage(source, 0, 0);
        const srcBlob = await new Promise((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/png');
        });
        if (!srcBlob) return null;
        const result = await imageProcessor.processFile(srcBlob, {
          maxDim: this._maxDim,
          quality: this._quality,
        });
        return result?.blob || null;
      } catch {
        // Fall through to legacy path
      }
    }

    // Legacy fallback: inline Canvas JPEG resize
    let width = source.width;
    let height = source.height;
    const scale = Math.min(this._maxDim / width, this._maxDim / height, 1);
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(source, 0, 0, width, height);

    try {
      return await new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('toBlob returned null')),
          'image/jpeg',
          this._quality
        );
      });
    } catch {
      return null;
    }
  }

  /**
   * Try to get a raw blob for a URL without canvas processing.
   * Falls back to no-cors fetch (opaque blob — still displayable via object URL).
   * @param {string} url
   * @returns {Promise<Blob|null>}
   */
  async _fetchBlobDirect(url) {
    // Try standard fetch first
    try {
      const resp = await fetch(url);
      if (resp.ok) return await resp.blob();
    } catch { /* fall through */ }

    // Try no-cors fetch — only accept non-opaque blobs (opaque blobs report
    // size === 0 and lose their data during IDB structured clone round-trips)
    try {
      const resp = await fetch(url, { mode: 'no-cors' });
      const blob = await resp.blob();
      if (blob && blob.size > 0) return blob;
    } catch { /* fall through */ }

    return null;
  }

  /**
   * Load an image via HTMLImageElement.
   * @param {string} url
   * @param {boolean} [useCors=false] - Whether to set crossOrigin='anonymous'
   * @returns {Promise<ImageBitmap>}
   */
  _loadImageElement(url, useCors = false) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (useCors) img.crossOrigin = 'anonymous';
      img.onload = () => {
        createImageBitmap(img).then(resolve).catch(reject);
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = url;
    });
  }

  // ---------------------------------------------------------------------------
  // IndexedDB helpers (private)
  // ---------------------------------------------------------------------------

  /** @returns {Promise<boolean>} */
  async _put(storeName, record) {
    try {
      const tx = this._db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(record);
      await this._txComplete(tx);
      return true;
    } catch (err) {
      console.warn(`ImageCache: put to ${storeName} failed`, err);
      return false;
    }
  }

  /** @returns {Promise<Object|null>} */
  _get(storeName, key) {
    return new Promise((resolve) => {
      try {
        const tx = this._db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  /** @returns {Promise<Array>} */
  _getAll(storeName) {
    return new Promise((resolve) => {
      try {
        const tx = this._db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  /** @returns {Promise<boolean>} */
  async _delete(storeName, key) {
    try {
      const tx = this._db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      await this._txComplete(tx);
      return true;
    } catch {
      return false;
    }
  }

  /** Wait for a transaction to complete. */
  _txComplete(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
}

// Singleton instance exposed globally
const imageCache = new ImageCache();
if (typeof window !== 'undefined') {
  window.imageCache = imageCache;
}

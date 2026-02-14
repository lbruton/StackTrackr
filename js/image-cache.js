// IMAGE CACHE — IndexedDB storage for coin images and Numista metadata
// =============================================================================

/**
 * ImageCache provides persistent IndexedDB storage for coin images (obverse/reverse)
 * and enriched Numista metadata. Images are resized and compressed to JPEG before storage.
 *
 * Schema:
 *   DB: StakTrakrImages v1
 *   Store "coinImages"   — keyPath: catalogId (Numista N# string)
 *   Store "coinMetadata"  — keyPath: catalogId (Numista N# string)
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
    this._maxDim = 400;
    /** @type {number} JPEG quality (0-1) */
    this._jpegQuality = 0.80;
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
        const req = indexedDB.open('StakTrakrImages', 1);

        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('coinImages')) {
            db.createObjectStore('coinImages', { keyPath: 'catalogId' });
          }
          if (!db.objectStoreNames.contains('coinMetadata')) {
            db.createObjectStore('coinMetadata', { keyPath: 'catalogId' });
          }
        };

        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
      });

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
    if (!this._available || !catalogId) return false;

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
      width: this._maxDim,
      height: this._maxDim,
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
    if (!this._available || !catalogId || !numistaResult) return false;

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
    if (!this._available || !catalogId) return null;
    return this._get('coinImages', catalogId);
  }

  /**
   * Retrieve the metadata record for a coin type.
   * @param {string} catalogId
   * @returns {Promise<Object|null>}
   */
  async getMetadata(catalogId) {
    if (!this._available || !catalogId) return null;
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
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }

  /**
   * Quick existence check without loading blobs.
   * @param {string} catalogId
   * @returns {Promise<boolean>}
   */
  async hasImages(catalogId) {
    if (!this._available || !catalogId) return false;

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
   * Remove a single image record.
   * @param {string} catalogId
   * @returns {Promise<boolean>}
   */
  async deleteImages(catalogId) {
    if (!this._available || !catalogId) return false;
    return this._delete('coinImages', catalogId);
  }

  /**
   * Clear both object stores.
   * @returns {Promise<boolean>}
   */
  async clearAll() {
    if (!this._available) return false;

    try {
      const tx = this._db.transaction(['coinImages', 'coinMetadata'], 'readwrite');
      tx.objectStore('coinImages').clear();
      tx.objectStore('coinMetadata').clear();
      await this._txComplete(tx);
      debugLog('ImageCache: cleared all stores');
      return true;
    } catch (err) {
      console.warn('ImageCache: clearAll failed', err);
      return false;
    }
  }

  /**
   * Calculate current storage usage across both stores.
   * @returns {Promise<{count: number, totalBytes: number, limitBytes: number}>}
   */
  async getStorageUsage() {
    const result = { count: 0, totalBytes: 0, limitBytes: this._quotaBytes };
    if (!this._available) return result;

    try {
      const records = await this._getAll('coinImages');
      result.count = records.length;
      for (const rec of records) {
        result.totalBytes += rec.size || 0;
      }
    } catch {
      // ignore
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Image pipeline (private)
  // ---------------------------------------------------------------------------

  /**
   * Fetch an image URL → resize to max dimension → compress as JPEG blob.
   * Falls back to Image element if fetch fails (CORS on file://).
   * @param {string} url
   * @returns {Promise<Blob|null>}
   */
  async _fetchAndResize(url) {
    if (!url) return null;

    let imgBitmap;

    try {
      // Primary: fetch as blob
      const resp = await fetch(url, { mode: 'cors' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      imgBitmap = await createImageBitmap(blob);
    } catch {
      // Fallback: Image element (works when fetch CORS fails)
      try {
        imgBitmap = await this._loadImageElement(url);
      } catch (e2) {
        console.warn('ImageCache: failed to load image', url, e2);
        return null;
      }
    }

    // Resize to fit within maxDim × maxDim, preserving aspect ratio
    let { width, height } = imgBitmap;
    const scale = Math.min(this._maxDim / width, this._maxDim / height, 1);
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgBitmap, 0, 0, width, height);

    // Compress to JPEG
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        this._jpegQuality
      );
    });
  }

  /**
   * Load an image via HTMLImageElement (fallback for CORS-restricted fetch).
   * @param {string} url
   * @returns {Promise<ImageBitmap>}
   */
  _loadImageElement(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
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

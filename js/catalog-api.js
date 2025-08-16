// CATALOG API SYSTEM
// =============================================================================
// Provider-agnostic catalog API architecture for StackTrackr
// Designed for easy swapping between Numista and rSynk APIs

/**
 * Simple encryption utilities for API key storage
 */
class CryptoUtils {
  /**
   * Encrypt text using a password
   * @param {string} text - Text to encrypt
   * @param {string} password - Password for encryption
   * @returns {string} Encrypted text
   */
  static async encrypt(text, password) {
    try {
      // Create a key from the password
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      // Generate a salt
      const salt = crypto.getRandomValues(new Uint8Array(16));
      
      // Derive encryption key
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      // Generate IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt the text
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encoder.encode(text)
      );

      // Combine salt + iv + encrypted data
      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encrypted), salt.length + iv.length);

      // Return as base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt API key');
    }
  }

  /**
   * Decrypt text using a password
   * @param {string} encryptedText - Base64 encrypted text
   * @param {string} password - Password for decryption
   * @returns {string} Decrypted text
   */
  static async decrypt(encryptedText, password) {
    try {
      // Decode from base64
      const combined = new Uint8Array(
        atob(encryptedText).split('').map(char => char.charCodeAt(0))
      );

      // Extract components
      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const encrypted = combined.slice(28);

      // Create key from password
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      // Derive decryption key
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt API key - check your password');
    }
  }
}

/**
 * Catalog API Configuration with encrypted storage
 */
/**
 * Catalog API Configuration with encrypted storage
 */
class CatalogConfig {
  constructor() {
    this.storageKey = 'catalog_api_config';
    this.sessionKey = 'catalog_session_keys'; // Runtime storage for decrypted keys
    this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.config = JSON.parse(stored);
      } else {
        this.config = this.getDefaultConfig();
      }
      
      // Initialize session storage for decrypted keys
      this.sessionKeys = {};
    } catch (error) {
      console.warn('Failed to load catalog config:', error);
      this.config = this.getDefaultConfig();
      this.sessionKeys = {};
    }
  }

  getDefaultConfig() {
    return {
      numista: {
        encryptedApiKey: '', // Encrypted API key
        clientName: '',
        clientId: '',
        quota: 2000,
        hasKey: false // Flag to show if encrypted key exists
      },
      rsynk: {
        encryptedApiKey: '',
        hasKey: false
      },
      local: {
        enabled: true
      }
    };
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save catalog config:', error);
    }
  }

  /**
   * Set and encrypt Numista API key
   * @param {string} apiKey - Plain text API key
   * @param {string} password - Encryption password
   * @param {string} clientName - Client name (optional)
   * @param {string} clientId - Client ID (optional)
   * @param {number} quota - API quota (optional)
   */
  async setNumistaConfig(apiKey, password, clientName = '', clientId = '', quota = 2000) {
    try {
      if (!apiKey || !password) {
        throw new Error('API key and password are required');
      }

      const encryptedApiKey = await CryptoUtils.encrypt(apiKey, password);
      
      this.config.numista = {
        encryptedApiKey,
        clientName,
        clientId,
        quota,
        hasKey: true
      };
      
      // Store decrypted key in session for immediate use
      this.sessionKeys.numista = apiKey;
      
      this.save();
      return true;
    } catch (error) {
      console.error('Failed to encrypt API key:', error);
      throw error;
    }
  }

  /**
   * Decrypt and load Numista API key for session
   * @param {string} password - Decryption password
   */
  async unlockNumistaKey(password) {
    try {
      if (!this.config.numista.encryptedApiKey) {
        throw new Error('No encrypted API key found');
      }

      const decryptedKey = await CryptoUtils.decrypt(this.config.numista.encryptedApiKey, password);
      this.sessionKeys.numista = decryptedKey;
      return true;
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      throw error;
    }
  }

  /**
   * Get current Numista configuration
   */
  getNumistaConfig() {
    return {
      ...this.config.numista,
      apiKey: this.sessionKeys.numista || '', // Include decrypted key if available
      isUnlocked: !!this.sessionKeys.numista
    };
  }

  /**
   * Check if Numista is properly configured and unlocked
   */
  isNumistaEnabled() {
    return this.config.numista.hasKey && !!this.sessionKeys.numista;
  }

  /**
   * Clear all session keys (lock the API)
   */
  lockKeys() {
    this.sessionKeys = {};
  }

  /**
   * Clear stored encrypted key
   */
  clearNumistaKey() {
    this.config.numista = {
      encryptedApiKey: '',
      clientName: '',
      clientId: '',
      quota: 2000,
      hasKey: false
    };
    delete this.sessionKeys.numista;
    this.save();
  }

  /**
   * Check if user has stored an encrypted key
   */
  hasNumistaKey() {
    return this.config.numista.hasKey && !!this.config.numista.encryptedApiKey;
  }
}

// Global catalog configuration instance
const catalogConfig = new CatalogConfig();

console.log('🔌 Catalog API system ready - configure API keys through settings');

/**
 * Base interface for all catalog providers
 * Ensures consistent API regardless of provider
 */
class CatalogProvider {
  constructor(config = {}) {
    this.name = config.name || 'Unknown';
    this.apiKey = config.apiKey || '';
    this.baseUrl = config.baseUrl || '';
    this.rateLimit = config.rateLimit || 60; // requests per minute
    this.timeout = config.timeout || 10000; // 10 seconds
    this.lastRequest = 0;
    this.requestCount = 0;
    this.requestWindow = 60000; // 1 minute window
  }

  /**
   * Check if we can make a request (rate limiting)
   * @returns {boolean} True if request is allowed
   */
  canMakeRequest() {
    const now = Date.now();
    if (now - this.lastRequest > this.requestWindow) {
      this.requestCount = 0;
      this.lastRequest = now;
    }
    return this.requestCount < this.rateLimit;
  }

  /**
   * Make rate-limited HTTP request
   * @param {string} url - Request URL
   * @param {Object} options - Fetch options
   * @returns {Promise} Fetch response
   */
  async request(url, options = {}) {
    if (!this.canMakeRequest()) {
      throw new Error(`Rate limit exceeded for ${this.name}. Try again later.`);
    }

    this.requestCount++;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout for ${this.name}`);
      }
      throw error;
    }
  }

  /**
   * Lookup item by catalog ID - MUST be implemented by providers
   * @param {string} catalogId - Catalog identifier
   * @returns {Promise<Object>} Standardized item data
   */
  async lookupItem(catalogId) {
    throw new Error('lookupItem must be implemented by provider');
  }

  /**
   * Search for items by query - MUST be implemented by providers
   * @param {string} query - Search term
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} Array of standardized item data
   */
  async searchItems(query, filters = {}) {
    throw new Error('searchItems must be implemented by provider');
  }

  /**
   * Get current market value for item - MUST be implemented by providers
   * @param {string} catalogId - Catalog identifier
   * @returns {Promise<number>} Current market value in USD
   */
  async getMarketValue(catalogId) {
    throw new Error('getMarketValue must be implemented by provider');
  }
}

/**
 * Numista API Provider
 * Implements Numista-specific API calls
 */
class NumistaProvider extends CatalogProvider {
  constructor() {
    const config = catalogConfig.getNumistaConfig();
    super({
      name: 'Numista',
      apiKey: config.apiKey,
      baseUrl: 'https://api.numista.com/api/v3',
      rateLimit: 100, // Numista allows 100 requests per minute
      timeout: 15000
    });
    this.clientName = config.clientName;
    this.clientId = config.clientId;
    this.quota = config.quota;
  }

  /**
   * Lookup item by Numista catalog ID
   * @param {string} catalogId - Numista item ID
   * @returns {Promise<Object>} Standardized item data
   */
  async lookupItem(catalogId) {
    if (!catalogId) throw new Error('Catalog ID is required');
    
    const url = `${this.baseUrl}/items/${catalogId}?apikey=${this.apiKey}`;
    
    try {
      const response = await this.request(url);
      const data = await response.json();
      
      return this.normalizeItemData(data);
    } catch (error) {
      console.error(`Numista lookup failed for ID ${catalogId}:`, error);
      throw new Error(`Failed to lookup item ${catalogId} from Numista: ${error.message}`);
    }
  }

  /**
   * Search for items on Numista
   * @param {string} query - Search term
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} Array of standardized item data
   */
  async searchItems(query, filters = {}) {
    const params = new URLSearchParams({
      apikey: this.apiKey,
      q: query,
      limit: filters.limit || 20
    });

    if (filters.country) params.append('country', filters.country);
    if (filters.metal) params.append('metal', filters.metal);
    if (filters.year) params.append('year', filters.year);

    const url = `${this.baseUrl}/items/search?${params.toString()}`;
    
    try {
      const response = await this.request(url);
      const data = await response.json();
      
      return data.items ? data.items.map(item => this.normalizeItemData(item)) : [];
    } catch (error) {
      console.error('Numista search failed:', error);
      throw new Error(`Numista search failed: ${error.message}`);
    }
  }

  /**
   * Get current market value from Numista
   * @param {string} catalogId - Numista item ID
   * @returns {Promise<number>} Current market value in USD
   */
  async getMarketValue(catalogId) {
    // Note: Numista doesn't provide real-time market values
    // This would need to be enhanced or combined with other sources
    try {
      const item = await this.lookupItem(catalogId);
      return item.estimatedValue || 0;
    } catch (error) {
      console.warn(`Could not get market value for ${catalogId}:`, error);
      return 0;
    }
  }

  /**
   * Normalize Numista data to standard format
   * @param {Object} numistaData - Raw Numista API response
   * @returns {Object} Standardized item data
   */
  normalizeItemData(numistaData) {
    return {
      catalogId: numistaData.id?.toString() || '',
      name: numistaData.title || '',
      year: numistaData.year || '',
      country: numistaData.country || '',
      metal: this.normalizeMetal(numistaData.composition || ''),
      weight: numistaData.weight || 0,
      diameter: numistaData.diameter || 0,
      type: this.normalizeType(numistaData.type || ''),
      mintage: numistaData.mintage || 0,
      estimatedValue: numistaData.value || 0,
      imageUrl: numistaData.image_url || '',
      description: numistaData.description || '',
      provider: 'Numista',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Normalize metal composition from Numista format
   * @param {string} composition - Numista composition string
   * @returns {string} Standardized metal name
   */
  normalizeMetal(composition) {
    const comp = composition.toLowerCase();
    if (comp.includes('gold') || comp.includes('au')) return 'Gold';
    if (comp.includes('silver') || comp.includes('ag')) return 'Silver';
    if (comp.includes('platinum') || comp.includes('pt')) return 'Platinum';
    if (comp.includes('palladium') || comp.includes('pd')) return 'Palladium';
    if (comp.includes('copper') || comp.includes('bronze') || comp.includes('brass')) return 'Alloy/Other';
    return 'Alloy/Other';
  }

  /**
   * Normalize item type from Numista format
   * @param {string} type - Numista type string
   * @returns {string} Standardized type
   */
  normalizeType(type) {
    const t = type.toLowerCase();
    if (t.includes('coin') || t.includes('circulation')) return 'Coin';
    if (t.includes('bar') || t.includes('ingot')) return 'Bar';
    if (t.includes('round')) return 'Round';
    if (t.includes('note') || t.includes('bill')) return 'Note';
    return 'Other';
  }
}

/**
 * rSynk API Provider (Future Implementation)
 * Ready for rSynk API when available
 */
class rSynkProvider extends CatalogProvider {
  constructor(apiKey) {
    super({
      name: 'rSynk',
      apiKey: apiKey,
      baseUrl: 'https://api.rsynk.com/v1', // Placeholder URL
      rateLimit: 120, // Assumed rate limit
      timeout: 10000
    });
  }

  async lookupItem(catalogId) {
    // TODO: Implement rSynk-specific lookup
    throw new Error('rSynk provider not yet implemented');
  }

  async searchItems(query, filters = {}) {
    // TODO: Implement rSynk-specific search
    throw new Error('rSynk provider not yet implemented');
  }

  async getMarketValue(catalogId) {
    // TODO: Implement rSynk-specific market value lookup
    throw new Error('rSynk provider not yet implemented');
  }
}

/**
 * Local Provider (Fallback)
 * Uses local data when external APIs are unavailable
 */
class LocalProvider extends CatalogProvider {
  constructor() {
    super({
      name: 'Local',
      rateLimit: 1000, // No real rate limit for local data
      timeout: 1000
    });
    this.localData = this.loadLocalData();
  }

  loadLocalData() {
    // Load any cached catalog data from localStorage
    try {
      const stored = localStorage.getItem('stackrtrackr.catalog.cache');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Could not load local catalog cache:', error);
      return {};
    }
  }

  async lookupItem(catalogId) {
    const item = this.localData[catalogId];
    if (!item) {
      throw new Error(`Item ${catalogId} not found in local cache`);
    }
    return item;
  }

  async searchItems(query, filters = {}) {
    const results = Object.values(this.localData).filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
    );
    return results.slice(0, filters.limit || 20);
  }

  async getMarketValue(catalogId) {
    const item = this.localData[catalogId];
    return item ? (item.estimatedValue || 0) : 0;
  }

  /**
   * Cache item data locally
   * @param {string} catalogId - Catalog identifier
   * @param {Object} itemData - Standardized item data
   */
  cacheItem(catalogId, itemData) {
    this.localData[catalogId] = itemData;
    try {
      localStorage.setItem('stackrtrackr.catalog.cache', JSON.stringify(this.localData));
    } catch (error) {
      console.warn('Could not cache item data:', error);
    }
  }
}

/**
 * Main Catalog API Manager
 * Coordinates multiple providers with fallback chain
 */
class CatalogAPI {
  constructor() {
    this.providers = [];
    this.localProvider = new LocalProvider();
    this.activeProvider = null;
    this.settings = this.loadSettings();
    
    this.initializeProviders();
  }

  /**
   * Load API settings from localStorage
   */
  loadSettings() {
    try {
      const stored = localStorage.getItem('stackrtrackr.catalog.settings');
      return stored ? JSON.parse(stored) : {
        activeProvider: 'numista',
        numistaApiKey: '',
        rsynkApiKey: '',
        enableFallback: true,
        cacheDuration: 3600000 // 1 hour
      };
    } catch (error) {
      console.warn('Could not load catalog API settings:', error);
      return {};
    }
  }

  /**
   * Save API settings to localStorage
   */
  saveSettings() {
    try {
      localStorage.setItem('stackrtrackr.catalog.settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Could not save catalog API settings:', error);
    }
  }

  /**
   * Initialize available providers based on API keys
   */
  initializeProviders() {
    this.providers = [];

    // Add Numista provider if configured and enabled
    if (catalogConfig.isNumistaEnabled()) {
      try {
        const numista = new NumistaProvider();
        this.providers.push(numista);
        this.activeProvider = numista;
        console.log('✅ Numista provider initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Numista provider:', error);
      }
    }

    // Add rSynk provider if API key is available (future)
    if (this.settings.rsynkApiKey) {
      try {
        const rsynk = new rSynkProvider(this.settings.rsynkApiKey);
        this.providers.push(rsynk);
        if (this.settings.activeProvider === 'rsynk') {
          this.activeProvider = rsynk;
        }
        console.log('✅ rSynk provider initialized');
      } catch (error) {
        console.error('❌ Failed to initialize rSynk provider:', error);
      }
    }

    // Default to first available provider if none set
    if (!this.activeProvider && this.providers.length > 0) {
      this.activeProvider = this.providers[0];
    }

    console.log(`🔌 Catalog API initialized with ${this.providers.length} provider(s)`);
  }

  /**
   * Set API key for a provider
   * @param {string} provider - Provider name ('numista' or 'rsynk')
   * @param {string} apiKey - API key
   */
  setApiKey(provider, apiKey) {
    if (provider === 'numista') {
      this.settings.numistaApiKey = apiKey;
    } else if (provider === 'rsynk') {
      this.settings.rsynkApiKey = apiKey;
    }
    
    this.saveSettings();
    this.initializeProviders();
  }

  /**
   * Switch active provider
   * @param {string} providerName - Provider name to switch to
   */
  switchProvider(providerName) {
    const provider = this.providers.find(p => p.name.toLowerCase() === providerName.toLowerCase());
    if (provider) {
      this.activeProvider = provider;
      this.settings.activeProvider = providerName.toLowerCase();
      this.saveSettings();
      console.log(`Switched to ${provider.name} catalog provider`);
    } else {
      throw new Error(`Provider ${providerName} not available`);
    }
  }

  /**
   * Lookup item with fallback chain
   * @param {string} catalogId - Catalog identifier
   * @returns {Promise<Object>} Standardized item data
   */
  async lookupItem(catalogId) {
    const providers = this.settings.enableFallback ? 
      [this.activeProvider, ...this.providers.filter(p => p !== this.activeProvider), this.localProvider] :
      [this.activeProvider];

    let lastError;

    for (const provider of providers) {
      if (!provider) continue;

      try {
        console.log(`Attempting lookup with ${provider.name}...`);
        const result = await provider.lookupItem(catalogId);
        
        // Cache successful results locally
        if (provider !== this.localProvider) {
          this.localProvider.cacheItem(catalogId, result);
        }
        
        return result;
      } catch (error) {
        console.warn(`${provider.name} lookup failed:`, error.message);
        lastError = error;
        continue;
      }
    }

    throw lastError || new Error('All catalog providers failed');
  }

  /**
   * Search items with active provider
   * @param {string} query - Search term
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} Array of standardized item data
   */
  async searchItems(query, filters = {}) {
    if (!this.activeProvider) {
      throw new Error('No catalog provider available');
    }

    return await this.activeProvider.searchItems(query, filters);
  }

  /**
   * Get market value with fallback
   * @param {string} catalogId - Catalog identifier
   * @returns {Promise<number>} Current market value in USD
   */
  async getMarketValue(catalogId) {
    const providers = this.settings.enableFallback ? 
      [this.activeProvider, ...this.providers.filter(p => p !== this.activeProvider)] :
      [this.activeProvider];

    for (const provider of providers) {
      if (!provider) continue;

      try {
        return await provider.getMarketValue(catalogId);
      } catch (error) {
        console.warn(`${provider.name} market value lookup failed:`, error.message);
        continue;
      }
    }

    return 0; // Fallback to 0 if all providers fail
  }

  /**
   * Get provider status information
   * @returns {Object} Status of all providers
   */
  getProviderStatus() {
    return {
      active: this.activeProvider ? this.activeProvider.name : 'None',
      available: this.providers.map(p => p.name),
      settings: this.settings
    };
  }
}

// Global catalog API instance
let catalogAPI = new CatalogAPI();

// Test function for Numista API
async function testNumistaAPI() {
  if (!catalogConfig.isNumistaEnabled()) {
    console.log('❌ Numista API not configured');
    return;
  }

  console.log('🧪 Testing Numista API...');
  
  try {
    // Test with a known coin ID (American Silver Eagle)
    const testId = '5685'; // This is a common test ID for American Silver Eagle 1986
    const result = await catalogAPI.lookupItem(testId);
    console.log('✅ Numista API test successful:', result);
    return result;
  } catch (error) {
    console.error('❌ Numista API test failed:', error);
    return null;
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.catalogAPI = catalogAPI;
  window.catalogConfig = catalogConfig;
  window.testNumistaAPI = testNumistaAPI;
  window.CatalogAPI = CatalogAPI;
  window.NumistaProvider = NumistaProvider;
  window.rSynkProvider = rSynkProvider;
  window.LocalProvider = LocalProvider;
}

// Initialize UI event handlers when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Numista API key input handler
  const numistaApiKeyInput = document.getElementById('numistaApiKey');
  const testNumistaBtn = document.getElementById('testNumistaBtn');
  const clearNumistaBtn = document.getElementById('clearNumistaBtn');

  if (numistaApiKeyInput) {
    // Load existing API key
    const existingConfig = catalogConfig.getNumistaConfig();
    if (existingConfig.apiKey) {
      numistaApiKeyInput.value = existingConfig.apiKey;
    }

    // Save API key when input changes
    numistaApiKeyInput.addEventListener('change', function() {
      const apiKey = this.value.trim();
      if (apiKey) {
        catalogConfig.setNumistaConfig(apiKey, '', '', 2000);
        catalogAPI.initializeProviders(); // Reinitialize providers
        console.log('✅ Numista API key saved');
      }
    });
  }

  // Test connection button
  if (testNumistaBtn) {
    testNumistaBtn.addEventListener('click', async function() {
      const apiKey = numistaApiKeyInput?.value.trim();
      if (!apiKey) {
        alert('Please enter your Numista API key first');
        return;
      }

      // Save the key first
      catalogConfig.setNumistaConfig(apiKey, '', '', 2000);
      catalogAPI.initializeProviders();

      // Test the connection
      this.textContent = 'Testing...';
      this.disabled = true;

      try {
        const result = await testNumistaAPI();
        if (result) {
          alert('✅ Numista API connection successful!');
        } else {
          alert('❌ Numista API connection failed. Please check your API key.');
        }
      } catch (error) {
        alert('❌ Connection failed: ' + error.message);
      } finally {
        this.textContent = 'Test Connection';
        this.disabled = false;
      }
    });
  }

  // Clear API key button
  if (clearNumistaBtn) {
    clearNumistaBtn.addEventListener('click', function() {
      if (confirm('Are you sure you want to clear your Numista API key?')) {
        catalogConfig.setNumistaConfig('', '', '', 2000);
        if (numistaApiKeyInput) {
          numistaApiKeyInput.value = '';
        }
        catalogAPI.initializeProviders();
        console.log('🗑️ Numista API key cleared');
      }
    });
  }
});

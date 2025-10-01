/**
 * rEngine API Relay Client for StackTrackr
 * 
 * This client routes all API calls through the rEngine relay infrastructure
 * for intelligent caching, rate limiting, and market intelligence aggregation.
 * 
 * @fileoverview Enhanced API client using rEngine relay services
 * @version 1.0.0
 * @requires StackTrackr v3.04.86+
 */

/**
 * rEngine API Relay Configuration
 */
const RENGINE_CONFIG = {
  // Production relay endpoints
  relay: {
    production: 'https://api.rengine.dev/relay',
    staging: 'https://staging-api.rengine.dev/relay',
    development: 'http://localhost:8080/relay'
  },
  
  // Client identification
  client: {
    name: 'StackTrackr',
    version: '3.04.86',
    capabilities: ['metals-tracking', 'market-intelligence', 'community-data']
  },
  
  // Service tiers and limits
  serviceTiers: {
    free: { requestsPerMonth: 1000, marketIntel: false },
    pro: { requestsPerMonth: 10000, marketIntel: true },
    enterprise: { requestsPerMonth: 100000, marketIntel: true, priority: true }
  },
  
  // Caching strategy
  cache: {
    spotPrices: 15 * 60 * 1000,      // 15 minutes
    marketIntel: 60 * 60 * 1000,     // 1 hour
    numistaMeta: 24 * 60 * 60 * 1000 // 24 hours
  }
};

/**
 * Enhanced API Client using rEngine Relay Infrastructure
 */
class rEngineAPIClient {
  constructor(userTier = 'free', apiKey = null) {
    this.userTier = userTier;
    this.apiKey = apiKey;
    this.baseURL = this.getRelayEndpoint();
    this.cache = new Map();
    this.requestCount = 0;
    this.lastResetDate = new Date().toDateString();
    
    this.loadUsageFromStorage();
  }

  /**
   * Get appropriate relay endpoint based on environment
   */
  getRelayEndpoint() {
    if (window.location.hostname === 'localhost') {
      return RENGINE_CONFIG.relay.development;
    } else if (window.location.hostname.includes('staging')) {
      return RENGINE_CONFIG.relay.staging;
    } else {
      return RENGINE_CONFIG.relay.production;
    }
  }

  /**
   * Enhanced spot price fetching through rEngine relay
   * @param {Array} metals - Metals to fetch prices for
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Enhanced spot price data with market intelligence
   */
  async fetchSpotPrices(metals = ['silver', 'gold', 'platinum', 'palladium'], options = {}) {
    try {
      // Check rate limits
      if (!this.checkRateLimit()) {
        throw new Error(`Rate limit exceeded for ${this.userTier} tier`);
      }

      // Check cache first
      const cacheKey = `spot_prices_${metals.join('_')}`;
      const cached = this.getFromCache(cacheKey, RENGINE_CONFIG.cache.spotPrices);
      
      if (cached && !options.forceRefresh) {
        console.log('📦 Using cached spot prices from rEngine');
        return cached;
      }

      // Prepare request
      const requestPayload = {
        metals: metals,
        format: 'usd_per_ounce',
        includeMarketIntel: this.hasMarketIntelAccess(),
        clientInfo: RENGINE_CONFIG.client,
        userTier: this.userTier,
        requestId: this.generateRequestId()
      };

      console.log('🔄 Fetching spot prices through rEngine relay...');
      
      const response = await fetch(`${this.baseURL}/metals/spot`, {
        method: 'POST',
        headers: this.getRequestHeaders(),
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new Error(`rEngine relay error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Track usage
      this.incrementUsage();
      
      // Cache successful response
      this.setCache(cacheKey, data, RENGINE_CONFIG.cache.spotPrices);
      
      console.log(`✅ Spot prices fetched via rEngine (${data.source})`);
      
      return this.enhanceSpotPriceResponse(data);
      
    } catch (error) {
      console.error('rEngine API Error:', error);
      return this.handleAPIError(error, 'spot_prices');
    }
  }

  /**
   * Fetch market intelligence data
   * @param {Object} criteria - Intelligence criteria
   * @returns {Promise<Object>} Market intelligence data
   */
  async fetchMarketIntelligence(criteria = {}) {
    if (!this.hasMarketIntelAccess()) {
      throw new Error('Market intelligence requires Pro or Enterprise tier');
    }

    try {
      const cacheKey = `market_intel_${JSON.stringify(criteria)}`;
      const cached = this.getFromCache(cacheKey, RENGINE_CONFIG.cache.marketIntel);
      
      if (cached) {
        console.log('📊 Using cached market intelligence from rEngine');
        return cached;
      }

      const requestPayload = {
        criteria: criteria,
        clientInfo: RENGINE_CONFIG.client,
        userTier: this.userTier,
        requestId: this.generateRequestId()
      };

      console.log('📊 Fetching market intelligence through rEngine...');

      const response = await fetch(`${this.baseURL}/market/intelligence`, {
        method: 'POST',
        headers: this.getRequestHeaders(),
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new Error(`Market intelligence error: ${response.status}`);
      }

      const data = await response.json();
      
      this.incrementUsage();
      this.setCache(cacheKey, data, RENGINE_CONFIG.cache.marketIntel);
      
      console.log('✅ Market intelligence fetched via rEngine');
      
      return data;
      
    } catch (error) {
      console.error('Market Intelligence Error:', error);
      throw error;
    }
  }

  /**
   * Contribute anonymized purchase data to community intelligence
   * @param {Array} purchaseData - Anonymized purchase data
   * @returns {Promise<Object>} Contribution result
   */
  async contributeMarketData(purchaseData) {
    // Only contribute if user has opted in
    if (!this.hasUserOptedIn()) {
      console.log('User has not opted in to data sharing');
      return { contributed: false, reason: 'user_opt_out' };
    }

    try {
      // Anonymize and fuzz data before sending
      const anonymizedData = this.anonymizeForCommunity(purchaseData);
      
      const requestPayload = {
        data: anonymizedData,
        dataVersion: '1.0',
        clientInfo: RENGINE_CONFIG.client,
        userTier: this.userTier,
        requestId: this.generateRequestId()
      };

      console.log('🤝 Contributing anonymized data to rEngine community...');

      const response = await fetch(`${this.baseURL}/market/contribute`, {
        method: 'POST',
        headers: this.getRequestHeaders(),
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new Error(`Data contribution error: ${response.status}`);
      }

      const result = await response.json();
      
      console.log(`✅ Contributed ${anonymizedData.length} anonymized purchases to community`);
      
      return result;
      
    } catch (error) {
      console.error('Data Contribution Error:', error);
      // Queue for retry later
      this.queueForRetry('contribute', purchaseData);
      return { contributed: false, error: error.message };
    }
  }

  /**
   * Enhanced Numista search through rEngine intelligence
   * @param {Object} searchCriteria - Search parameters
   * @returns {Promise<Object>} Intelligent Numista results
   */
  async searchNumistaIntelligent(searchCriteria) {
    try {
      const cacheKey = `numista_${JSON.stringify(searchCriteria)}`;
      const cached = this.getFromCache(cacheKey, RENGINE_CONFIG.cache.numistaMeta);
      
      if (cached) {
        console.log('🪙 Using cached Numista data from rEngine');
        return cached;
      }

      const requestPayload = {
        search: searchCriteria,
        enhanceWithAI: this.hasMarketIntelAccess(),
        clientInfo: RENGINE_CONFIG.client,
        userTier: this.userTier,
        requestId: this.generateRequestId()
      };

      console.log('🪙 Searching Numista through rEngine intelligence...');

      const response = await fetch(`${this.baseURL}/numista/search`, {
        method: 'POST',
        headers: this.getRequestHeaders(),
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new Error(`Numista search error: ${response.status}`);
      }

      const data = await response.json();
      
      this.incrementUsage();
      this.setCache(cacheKey, data, RENGINE_CONFIG.cache.numistaMeta);
      
      console.log(`✅ Found ${data.results.length} Numista matches via rEngine`);
      
      return data;
      
    } catch (error) {
      console.error('Numista Search Error:', error);
      throw error;
    }
  }

  /**
   * Get request headers for rEngine API calls
   */
  getRequestHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'X-Client-App': RENGINE_CONFIG.client.name,
      'X-Client-Version': RENGINE_CONFIG.client.version,
      'X-User-Tier': this.userTier,
      'X-Request-Time': new Date().toISOString()
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  /**
   * Enhance spot price response with additional data
   */
  enhanceSpotPriceResponse(data) {
    return {
      // Core spot prices
      spotPrices: data.current,
      
      // Enhanced metadata
      metadata: {
        source: data.source,
        lastUpdated: data.timestamp,
        cacheHit: data.cacheHit || false,
        relayLatency: data.relayLatency,
        dataAge: data.dataAge
      },
      
      // Market intelligence (if available)
      marketIntelligence: data.intelligence || null,
      
      // Premium trends
      premiumTrends: data.premiums || null,
      
      // Regional variations (Pro/Enterprise only)
      regionalData: data.regional || null,
      
      // Community insights
      communityInsights: data.community || null
    };
  }

  /**
   * Anonymize purchase data for community contribution
   */
  anonymizeForCommunity(purchaseData) {
    return purchaseData.map(item => ({
      // Keep core market data
      metal: item.metal,
      type: item.type,
      weight: parseFloat(item.weight),
      
      // Fuzz pricing data (±5% noise)
      purchasePrice: this.addPriceNoise(parseFloat(item.price)),
      premiumPerOz: item.premiumPerOz ? this.addPriceNoise(parseFloat(item.premiumPerOz)) : null,
      
      // Generalize temporal data
      purchaseMonth: new Date(item.date).toISOString().slice(0, 7), // YYYY-MM only
      
      // Generalize location data
      region: this.generalizeLocation(item.purchaseLocation),
      
      // Anonymous metadata
      itemCategory: this.categorizeItem(item),
      isCollectable: item.isCollectable || false,
      
      // Remove all PII
      anonymousId: this.generateAnonymousHash(item)
    }));
  }

  /**
   * Add privacy-preserving noise to price data
   */
  addPriceNoise(price, noisePercentage = 0.05) {
    const noise = (Math.random() - 0.5) * 2 * noisePercentage;
    return Math.round((price * (1 + noise)) * 100) / 100;
  }

  /**
   * Generalize location for privacy
   */
  generalizeLocation(location) {
    if (!location) return 'Unknown';
    
    // Map specific dealers to categories
    const dealerCategories = {
      'apmex': 'Major Online Dealer',
      'jm bullion': 'Major Online Dealer',
      'provident': 'Major Online Dealer',
      'local coin shop': 'Local Dealer',
      'coin show': 'Coin Show',
      'private party': 'Private Sale'
    };
    
    const normalized = location.toLowerCase();
    for (const [dealer, category] of Object.entries(dealerCategories)) {
      if (normalized.includes(dealer)) {
        return category;
      }
    }
    
    return 'Other Dealer';
  }

  /**
   * Cache management
   */
  getFromCache(key, maxAge) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  setCache(key, data, ttl) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    // Cleanup old entries periodically
    if (this.cache.size > 100) {
      this.cleanupCache();
    }
  }

  /**
   * Rate limiting and usage tracking
   */
  checkRateLimit() {
    const today = new Date().toDateString();
    
    // Reset counter if new day
    if (this.lastResetDate !== today) {
      this.requestCount = 0;
      this.lastResetDate = today;
      this.saveUsageToStorage();
    }
    
    const limit = RENGINE_CONFIG.serviceTiers[this.userTier].requestsPerMonth;
    const dailyLimit = Math.floor(limit / 30); // Rough daily limit
    
    return this.requestCount < dailyLimit;
  }

  incrementUsage() {
    this.requestCount++;
    this.saveUsageToStorage();
  }

  /**
   * Feature access control
   */
  hasMarketIntelAccess() {
    return RENGINE_CONFIG.serviceTiers[this.userTier].marketIntel;
  }

  hasUserOptedIn() {
    return localStorage.getItem('stacktrackr_data_sharing_opt_in') === 'true';
  }

  /**
   * Utility methods
   */
  generateRequestId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateAnonymousHash(item) {
    // Simple hash for anonymous tracking
    return btoa(`${item.name}_${item.date}_${Math.floor(item.price)}`).slice(0, 12);
  }

  saveUsageToStorage() {
    localStorage.setItem('rengine_api_usage', JSON.stringify({
      requestCount: this.requestCount,
      lastResetDate: this.lastResetDate,
      userTier: this.userTier
    }));
  }

  loadUsageFromStorage() {
    try {
      const stored = localStorage.getItem('rengine_api_usage');
      if (stored) {
        const usage = JSON.parse(stored);
        this.requestCount = usage.requestCount || 0;
        this.lastResetDate = usage.lastResetDate || new Date().toDateString();
      }
    } catch (error) {
      console.warn('Failed to load usage data:', error);
    }
  }

  /**
   * Error handling with fallback strategies
   */
  handleAPIError(error, operation) {
    console.error(`rEngine API Error (${operation}):`, error);
    
    // Try to get cached fallback data
    const fallbackData = this.getFallbackData(operation);
    if (fallbackData) {
      console.log('📦 Using fallback cached data');
      return fallbackData;
    }
    
    // If no fallback available, throw error for upstream handling
    throw new Error(`rEngine relay unavailable: ${error.message}`);
  }

  getFallbackData(operation) {
    // Look for any cached data that might be useful
    for (const [key, cached] of this.cache.entries()) {
      if (key.includes(operation)) {
        return cached.data;
      }
    }
    return null;
  }
}

/**
 * Integration with existing StackTrackr API system
 */
class StackTrackrEnhancedAPI {
  constructor() {
    // Determine user tier (this would come from user settings/subscription)
    this.userTier = this.getUserTier();
    this.apiKey = this.getAPIKey();
    
    // Initialize rEngine client
    this.rEngineClient = new rEngineAPIClient(this.userTier, this.apiKey);
    
    // Keep reference to legacy API for fallback
    this.legacyAPI = window.apiConfig;
  }

  /**
   * Enhanced spot price sync using rEngine relay
   */
  async syncSpotPrices(metals = ['silver', 'gold', 'platinum', 'palladium']) {
    try {
      console.log('🚀 Syncing spot prices via rEngine relay...');
      
      const enhancedData = await this.rEngineClient.fetchSpotPrices(metals);
      
      // Update spot prices in StackTrackr
      this.updateSpotPricesInUI(enhancedData.spotPrices);
      
      // Update market intelligence if available
      if (enhancedData.marketIntelligence) {
        this.updateMarketIntelligence(enhancedData.marketIntelligence);
      }
      
      // Show enhanced metadata
      this.showEnhancedMetadata(enhancedData.metadata);
      
      return enhancedData;
      
    } catch (error) {
      console.warn('rEngine relay failed, falling back to direct API');
      return this.fallbackToDirectAPI(metals);
    }
  }

  /**
   * Contribute user data to community intelligence
   */
  async shareDataWithCommunity() {
    if (!this.rEngineClient.hasUserOptedIn()) {
      console.log('User has not opted in to data sharing');
      return;
    }

    try {
      // Get user's inventory data
      const inventory = window.inventory || [];
      
      // Filter for recent purchases (last 30 days)
      const recentPurchases = inventory.filter(item => {
        const purchaseDate = new Date(item.date);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return purchaseDate > thirtyDaysAgo;
      });

      if (recentPurchases.length === 0) {
        console.log('No recent purchases to share');
        return;
      }

      const result = await this.rEngineClient.contributeMarketData(recentPurchases);
      
      if (result.contributed) {
        console.log(`✅ Shared ${recentPurchases.length} purchases with community`);
        this.showCommunityContributionSuccess(result);
      }
      
    } catch (error) {
      console.error('Community data sharing failed:', error);
    }
  }

  /**
   * Get user tier from settings or subscription
   */
  getUserTier() {
    // This would integrate with your subscription system
    const stored = localStorage.getItem('rengine_user_tier');
    return stored || 'free';
  }

  getAPIKey() {
    // Get rEngine API key from user settings
    return localStorage.getItem('rengine_api_key');
  }

  /**
   * Update StackTrackr UI with enhanced data
   */
  updateSpotPricesInUI(spotPrices) {
    Object.entries(spotPrices).forEach(([metal, price]) => {
      const metalConfig = Object.values(METALS).find(m => m.key === metal);
      if (metalConfig && price > 0) {
        localStorage.setItem(metalConfig.localStorageKey, price.toString());
        if (window.spotPrices) {
          window.spotPrices[metal] = price;
        }
        
        // Update display
        const display = document.getElementById(`spotPrice${metalConfig.name}`);
        if (display) {
          display.textContent = formatCurrency(price);
        }
      }
    });
    
    // Update summary if function exists
    if (typeof updateSummary === 'function') {
      updateSummary();
    }
  }

  updateMarketIntelligence(intelligence) {
    // Create or update market intelligence panel
    this.createMarketIntelligencePanel(intelligence);
  }

  showEnhancedMetadata(metadata) {
    console.log('📊 rEngine Enhanced Metadata:', metadata);
    
    // Show data source and freshness
    const statusElement = document.getElementById('api-status');
    if (statusElement) {
      statusElement.innerHTML = `
        <span class="rengine-badge">⚡ rEngine</span>
        Source: ${metadata.source} | 
        Age: ${this.formatDataAge(metadata.dataAge)} |
        ${metadata.cacheHit ? '📦 Cached' : '🌐 Live'}
      `;
    }
  }

  formatDataAge(ageMs) {
    const minutes = Math.floor(ageMs / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }
}

// Initialize enhanced API client
window.rEngineAPI = new StackTrackrEnhancedAPI();

// Integration hook for existing StackTrackr code
if (typeof window.enhanceWithrEngine !== 'undefined') {
  window.enhanceWithrEngine();
}

console.log('✅ rEngine API Relay Client Loaded - StackTrackr Enhanced');

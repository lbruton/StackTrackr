/**
 * rSynk Client Integration for StackTrackr
 * 
 * Integrates local LLM-powered search enhancement via rEngine API relay
 * Provides fallback to local AI and traditional search for reliability
 * 
 * @fileoverview rSynk client-side integration
 * @version 1.0.0
 * @requires StackTrackr core functionality
 */

/**
 * rSynk Configuration
 */
const RSYNK_CONFIG = {
  // Server endpoints
  serverUrl: 'https://rsynk.your-domain.com',  // Replace with actual rSynk server
  localUrl: 'http://localhost:5000',           // For development/testing
  
  // Fallback settings
  fallbackToLocal: true,        // Use local AI if rSynk unavailable
  fallbackToTraditional: true,  // Use traditional search as final fallback
  
  // Performance settings
  timeout: 2000,               // 2 second timeout for rSynk calls
  retryAttempts: 2,            // Retry failed requests
  cacheResults: true,          // Cache results locally
  
  // Feature flags
  enabled: false,              // Disabled by default - user must enable
  debugMode: false,            // Log detailed information
  
  // Rate limiting (client-side)
  maxRequestsPerMinute: 60,    // Prevent API abuse
  requestCooldown: 1000        // 1 second between requests
};

/**
 * rSynk Client Class
 * Handles communication with rSynk server and fallback mechanisms
 */
class rSynkClient {
  constructor(config = RSYNK_CONFIG) {
    this.config = { ...RSYNK_CONFIG, ...config };
    this.requestHistory = [];
    this.cache = new Map();
    this.isAvailable = false;
    
    // Test server availability on initialization
    this.testConnection();
  }
  
  /**
   * Test connection to rSynk server
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.getServerUrl()}/api/health`, {
        method: 'GET',
        timeout: this.config.timeout
      });
      
      if (response.ok) {
        const health = await response.json();
        this.isAvailable = true;
        
        if (this.config.debugMode) {
          console.log('🟢 rSynk server available:', health);
        }
        
        // Update UI to show rSynk is available
        this.updateUIStatus(true);
        
        return true;
      }
    } catch (error) {
      if (this.config.debugMode) {
        console.warn('🟡 rSynk server unavailable:', error.message);
      }
    }
    
    this.isAvailable = false;
    this.updateUIStatus(false);
    return false;
  }
  
  /**
   * Enhanced search with rSynk intelligence
   * @param {string} query - User's search query
   * @param {Array} inventory - Current inventory data
   * @returns {Promise<Object>} Enhanced search results
   */
  async enhanceSearch(query, inventory = []) {
    // Check if rSynk is enabled and available
    if (!this.config.enabled) {
      return this.fallbackToLocalAI(query, inventory);
    }
    
    // Rate limiting check
    if (!this.checkRateLimit()) {
      console.warn('🟡 rSynk rate limit exceeded, using fallback');
      return this.fallbackToLocalAI(query, inventory);
    }
    
    // Check cache first
    const cacheKey = this.generateCacheKey(query, inventory.length);
    if (this.config.cacheResults && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 30 * 60 * 1000) { // 30 minute cache
        if (this.config.debugMode) {
          console.log('🧠 rSynk cache hit:', query);
        }
        return cached.result;
      }
    }
    
    try {
      // Prepare request data
      const requestData = {
        query: query,
        inventory_context: this.extractInventoryContext(inventory),
        timestamp: Date.now(),
        user_id: this.getUserId() // For personalization
      };
      
      // Call rSynk server
      const response = await fetch(`${this.getServerUrl()}/api/search/enhance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'StackTrackr-rSynk/1.0'
        },
        body: JSON.stringify(requestData),
        timeout: this.config.timeout
      });
      
      if (!response.ok) {
        throw new Error(`rSynk API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.result) {
        // Process and enhance the result
        const enhancedResult = this.processrSynkResponse(data.result, query, inventory);
        
        // Cache the result
        if (this.config.cacheResults) {
          this.cache.set(cacheKey, {
            result: enhancedResult,
            timestamp: Date.now()
          });
        }
        
        // Record successful request
        this.recordRequest(true);
        
        if (this.config.debugMode) {
          console.log('🧠 rSynk enhancement successful:', enhancedResult);
        }
        
        return enhancedResult;
      } else {
        throw new Error('Invalid rSynk response format');
      }
      
    } catch (error) {
      console.warn('🟡 rSynk enhancement failed:', error.message);
      this.recordRequest(false);
      
      // Fallback to local AI or traditional search
      return this.fallbackToLocalAI(query, inventory);
    }
  }
  
  /**
   * Process rSynk server response and integrate with StackTrackr
   * @param {Object} rsynkResult - Raw rSynk response
   * @param {string} originalQuery - Original search query
   * @param {Array} inventory - Current inventory
   * @returns {Object} Processed search result
   */
  processrSynkResponse(rsynkResult, originalQuery, inventory) {
    // Apply rSynk suggestions to actual inventory
    const enhancedMatches = this.applyAISuggestions(rsynkResult, inventory);
    
    // Get traditional results for comparison
    const traditionalResults = this.getTraditionalResults(originalQuery, inventory);
    
    // Merge results intelligently
    const mergedResults = this.mergeSearchResults(traditionalResults, enhancedMatches);
    
    return {
      results: mergedResults,
      aiEnhanced: true,
      source: 'rSynk',
      interpretation: rsynkResult.search_intent,
      confidence: rsynkResult.confidence,
      suggestions: rsynkResult.suggestions || [],
      enhanced_query: rsynkResult.enhanced_query,
      processing_time: Date.now(),
      ai_metadata: {
        primary_keywords: rsynkResult.primary_keywords,
        metal_filters: rsynkResult.metal_filters,
        type_filters: rsynkResult.type_filters
      }
    };
  }
  
  /**
   * Apply AI suggestions to find inventory matches
   * @param {Object} rsynkResult - AI interpretation
   * @param {Array} inventory - Current inventory
   * @returns {Array} Matching inventory items
   */
  applyAISuggestions(rsynkResult, inventory) {
    const matches = new Set();
    
    // Apply primary keywords
    if (rsynkResult.primary_keywords) {
      rsynkResult.primary_keywords.forEach(keyword => {
        const keywordMatches = this.findByKeyword(keyword, inventory);
        keywordMatches.forEach(item => matches.add(item));
      });
    }
    
    // Apply metal filters
    if (rsynkResult.metal_filters && rsynkResult.metal_filters.length > 0) {
      const metalMatches = inventory.filter(item => 
        rsynkResult.metal_filters.includes(item.metal)
      );
      metalMatches.forEach(item => matches.add(item));
    }
    
    // Apply type filters
    if (rsynkResult.type_filters && rsynkResult.type_filters.length > 0) {
      const typeMatches = inventory.filter(item => 
        rsynkResult.type_filters.includes(item.type)
      );
      typeMatches.forEach(item => matches.add(item));
    }
    
    // Apply enhanced query with fuzzy matching
    if (rsynkResult.enhanced_query) {
      const enhancedMatches = this.fuzzySearch(rsynkResult.enhanced_query, inventory);
      enhancedMatches.forEach(item => matches.add(item));
    }
    
    return Array.from(matches);
  }
  
  /**
   * Fuzzy search implementation for flexible matching
   * @param {string} query - Search query
   * @param {Array} inventory - Inventory to search
   * @returns {Array} Matching items
   */
  fuzzySearch(query, inventory) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);
    
    return inventory.filter(item => {
      const searchText = [
        item.name,
        item.metal,
        item.type,
        item.composition || '',
        item.notes || ''
      ].join(' ').toLowerCase();
      
      // Check if all query words appear in item (fuzzy AND logic)
      return queryWords.every(word => {
        // Exact match
        if (searchText.includes(word)) return true;
        
        // Handle common abbreviations
        const abbreviations = {
          'ase': 'american silver eagle',
          'age': 'american gold eagle', 
          'cml': 'canadian maple leaf',
          'ap': 'austrian philharmonic'
        };
        
        if (abbreviations[word] && searchText.includes(abbreviations[word])) {
          return true;
        }
        
        // Simple fuzzy matching for typos
        return this.fuzzyWordMatch(word, searchText);
      });
    });
  }
  
  /**
   * Simple fuzzy word matching
   * @param {string} word - Word to match
   * @param {string} text - Text to search in
   * @returns {boolean} Whether word fuzzy matches
   */
  fuzzyWordMatch(word, text) {
    if (word.length < 3) return false;
    
    // Split text into words and check each
    const textWords = text.split(/\s+/);
    
    return textWords.some(textWord => {
      if (textWord.length < 3) return false;
      
      // Calculate simple edit distance
      const maxErrors = Math.floor(word.length * 0.25); // Allow 25% errors
      return this.editDistance(word, textWord) <= maxErrors;
    });
  }
  
  /**
   * Calculate edit distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  editDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  /**
   * Fallback to local AI enhancement
   * @param {string} query - Search query
   * @param {Array} inventory - Current inventory
   * @returns {Promise<Object>} Search results
   */
  async fallbackToLocalAI(query, inventory) {
    if (this.config.fallbackToLocal && window.aiSearchEngine) {
      try {
        const traditionalResults = this.getTraditionalResults(query, inventory);
        const aiResult = await window.aiSearchEngine.enhanceSearch(
          query, 
          inventory, 
          traditionalResults
        );
        
        return {
          ...aiResult,
          source: 'local_ai',
          fallback_reason: 'rSynk unavailable'
        };
      } catch (error) {
        console.warn('🟡 Local AI fallback failed:', error);
      }
    }
    
    // Final fallback to traditional search
    return this.fallbackToTraditional(query, inventory);
  }
  
  /**
   * Fallback to traditional StackTrackr search
   * @param {string} query - Search query
   * @param {Array} inventory - Current inventory
   * @returns {Object} Traditional search results
   */
  fallbackToTraditional(query, inventory) {
    const results = this.getTraditionalResults(query, inventory);
    
    return {
      results: results,
      aiEnhanced: false,
      source: 'traditional',
      fallback_reason: 'AI enhancement unavailable',
      query: query
    };
  }
  
  /**
   * Get traditional search results using existing StackTrackr logic
   * @param {string} query - Search query
   * @param {Array} inventory - Current inventory
   * @returns {Array} Traditional search results
   */
  getTraditionalResults(query, inventory) {
    // Use existing StackTrackr search if available
    if (typeof window.filterInventory === 'function') {
      const originalQuery = window.searchQuery;
      window.searchQuery = query;
      const results = window.filterInventory();
      window.searchQuery = originalQuery;
      return results;
    }
    
    // Simple fallback search implementation
    return this.simpleSearch(query, inventory);
  }
  
  /**
   * Simple search implementation for fallback
   * @param {string} query - Search query
   * @param {Array} inventory - Current inventory
   * @returns {Array} Search results
   */
  simpleSearch(query, inventory) {
    if (!query || !query.trim()) return inventory;
    
    const queryLower = query.toLowerCase();
    
    return inventory.filter(item => {
      return [
        item.name,
        item.metal,
        item.type,
        item.composition || '',
        item.notes || ''
      ].some(field => field && field.toLowerCase().includes(queryLower));
    });
  }
  
  /**
   * Utility methods
   */
  
  getServerUrl() {
    // Use local URL for development, remote for production
    return window.location.hostname === 'localhost' ? 
           this.config.localUrl : this.config.serverUrl;
  }
  
  generateCacheKey(query, inventorySize) {
    return `rsynk:${query}:${inventorySize}`;
  }
  
  extractInventoryContext(inventory) {
    if (!inventory || inventory.length === 0) return null;
    
    return {
      total_items: inventory.length,
      metals: [...new Set(inventory.map(item => item.metal))],
      types: [...new Set(inventory.map(item => item.type))],
      sample_names: inventory.slice(0, 20).map(item => item.name)
    };
  }
  
  getUserId() {
    // Generate or retrieve anonymous user ID
    let userId = localStorage.getItem('rsynk_user_id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('rsynk_user_id', userId);
    }
    return userId;
  }
  
  checkRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old requests
    this.requestHistory = this.requestHistory.filter(time => time > oneMinuteAgo);
    
    // Check if under limit
    if (this.requestHistory.length >= this.config.maxRequestsPerMinute) {
      return false;
    }
    
    // Check cooldown
    const lastRequest = this.requestHistory[this.requestHistory.length - 1] || 0;
    if (now - lastRequest < this.config.requestCooldown) {
      return false;
    }
    
    return true;
  }
  
  recordRequest(success) {
    this.requestHistory.push(Date.now());
    
    // Update success rate for monitoring
    if (!this.stats) {
      this.stats = { total: 0, successful: 0 };
    }
    this.stats.total++;
    if (success) this.stats.successful++;
  }
  
  findByKeyword(keyword, inventory) {
    return inventory.filter(item => {
      const searchText = [item.name, item.metal, item.type].join(' ').toLowerCase();
      return searchText.includes(keyword.toLowerCase());
    });
  }
  
  mergeSearchResults(traditional, aiEnhanced) {
    // Combine results, prioritizing AI-enhanced matches
    const combined = [...aiEnhanced];
    
    // Add traditional results that aren't already included
    const existingIds = new Set(aiEnhanced.map(item => item.serial || item.name));
    
    traditional.forEach(item => {
      const itemId = item.serial || item.name;
      if (!existingIds.has(itemId)) {
        combined.push(item);
      }
    });
    
    return combined;
  }
  
  updateUIStatus(available) {
    // Update rSynk status indicator in UI
    const statusElement = document.getElementById('rsynk-status');
    if (statusElement) {
      statusElement.className = available ? 'rsynk-available' : 'rsynk-unavailable';
      statusElement.textContent = available ? 'rSynk: Online' : 'rSynk: Offline';
    }
  }
  
  // Public API methods
  enable() {
    this.config.enabled = true;
    localStorage.setItem('rsynk_enabled', 'true');
    this.testConnection();
  }
  
  disable() {
    this.config.enabled = false;
    localStorage.setItem('rsynk_enabled', 'false');
  }
  
  isEnabled() {
    return this.config.enabled;
  }
  
  getStats() {
    return {
      enabled: this.config.enabled,
      available: this.isAvailable,
      stats: this.stats,
      cacheSize: this.cache.size
    };
  }
}

/**
 * Initialize rSynk integration
 */
function initializerSynk() {
  // Load saved preferences
  const savedEnabled = localStorage.getItem('rsynk_enabled');
  if (savedEnabled !== null) {
    RSYNK_CONFIG.enabled = savedEnabled === 'true';
  }
  
  // Create global rSynk instance
  window.rSynk = new rSynkClient(RSYNK_CONFIG);
  
  // Integrate with existing StackTrackr search
  if (typeof window.filterInventory === 'function') {
    const originalFilterInventory = window.filterInventory;
    
    window.filterInventory = async function() {
      if (window.rSynk && window.rSynk.isEnabled()) {
        try {
          const query = window.searchQuery || '';
          const inventory = window.inventory || [];
          
          const enhanced = await window.rSynk.enhanceSearch(query, inventory);
          return enhanced.results;
        } catch (error) {
          console.warn('rSynk integration error:', error);
          return originalFilterInventory();
        }
      } else {
        return originalFilterInventory();
      }
    };
  }
  
  console.log('🔍 rSynk integration initialized');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializerSynk);
} else {
  initializerSynk();
}

// Export for manual usage
window.rSynkClient = rSynkClient;
window.initializerSynk = initializerSynk;

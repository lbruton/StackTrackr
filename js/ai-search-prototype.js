/**
 * StackTrackr AI-Powered Search Engine Prototype
 * 
 * This prototype demonstrates how GPT can enhance the existing sophisticated
 * search system with natural language interpretation while maintaining
 * backward compatibility.
 * 
 * @fileoverview AI search enhancement for StackTrackr
 * @version 1.0.0
 * @requires GPT API access
 */

/**
 * AI Search Engine Configuration
 */
const AI_SEARCH_CONFIG = {
  // Model selection based on rEngine cost optimization matrix
  models: {
    primary: 'gpt-4o-mini',     // $0.50-1.00 per task
    fallback: 'claude-haiku',   // $0.25-0.50 per task  
    premium: 'gpt-4o'          // $3.00-6.00 per complex tasks
  },
  
  // Caching strategy for cost optimization
  cache: {
    ttl: 24 * 60 * 60 * 1000,  // 24 hours
    maxSize: 1000,              // Maximum cached responses
    storageKey: 'stacktrackr_ai_search_cache'
  },
  
  // Search enhancement settings
  search: {
    confidenceThreshold: 0.7,   // Minimum confidence for AI suggestions
    maxSuggestions: 8,          // Maximum AI-generated suggestions
    fallbackToTraditional: true // Use traditional search as fallback
  }
};

/**
 * AI-Enhanced Search Engine Class
 * Integrates with existing StackTrackr search functionality
 */
class AISearchEngine {
  constructor(apiKey, model = AI_SEARCH_CONFIG.models.primary) {
    this.apiKey = apiKey;
    this.model = model;
    this.cache = new Map();
    this.loadCacheFromStorage();
  }

  /**
   * Enhance existing search with AI interpretation
   * @param {string} query - User's natural language query
   * @param {Array} inventory - Current inventory data
   * @param {Array} traditionalResults - Results from existing search
   * @returns {Promise<Object>} Enhanced search results with AI insights
   */
  async enhanceSearch(query, inventory, traditionalResults) {
    try {
      // Check cache first for cost optimization
      const cacheKey = this.generateCacheKey(query, inventory.length);
      if (this.cache.has(cacheKey)) {
        console.log('🧠 AI Search: Using cached response');
        return this.cache.get(cacheKey);
      }

      // Generate AI interpretation
      const aiInterpretation = await this.interpretQuery(query, inventory);
      
      // Merge traditional and AI results
      const enhancedResults = this.mergeResults(
        traditionalResults, 
        aiInterpretation, 
        inventory
      );

      // Cache the result
      this.cacheResult(cacheKey, enhancedResults);
      
      return enhancedResults;

    } catch (error) {
      console.error('AI Search Error:', error);
      // Graceful fallback to traditional search
      return {
        results: traditionalResults,
        aiEnhanced: false,
        error: error.message,
        suggestions: []
      };
    }
  }

  /**
   * Interpret user query using GPT
   * @param {string} query - User's natural language query
   * @param {Array} inventory - Current inventory for context
   * @returns {Promise<Object>} AI interpretation results
   */
  async interpretQuery(query, inventory) {
    // Create context-aware prompt
    const prompt = this.buildSearchPrompt(query, inventory);
    
    // Call GPT API (using configured model)
    const response = await this.callGPTAPI(prompt);
    
    // Parse and validate response
    return this.parseAIResponse(response);
  }

  /**
   * Build intelligent search prompt with inventory context
   * @param {string} query - User query
   * @param {Array} inventory - Current inventory
   * @returns {string} Optimized GPT prompt
   */
  buildSearchPrompt(query, inventory) {
    // Extract unique inventory context for efficient prompting
    const inventoryContext = this.extractInventoryContext(inventory);
    
    return `
You are a precious metals expert helping users search their inventory. 

USER QUERY: "${query}"

AVAILABLE INVENTORY CONTEXT:
- Unique Names: ${inventoryContext.names.slice(0, 20).join(', ')}
- Metals: ${inventoryContext.metals.join(', ')}
- Types: ${inventoryContext.types.join(', ')}
- Total Items: ${inventory.length}

TASK: Interpret the user's natural language query and provide:

1. SEARCH_INTENT: What the user is looking for
2. METAL_FILTER: Specific metals mentioned or implied
3. KEYWORD_MATCHES: Important terms to search for
4. SUGGESTIONS: Alternative spellings or related terms
5. CONFIDENCE: How confident you are in the interpretation (0-1)

RULES:
- Handle spelling variations and abbreviations (ASE = American Silver Eagle)
- Understand collector terminology 
- Consider natural language descriptions
- Provide specific, searchable terms
- Include confidence scores for each suggestion

RESPONSE FORMAT (JSON):
{
  "searchIntent": "description of what user wants",
  "metalFilter": ["Silver", "Gold", etc.],
  "keywordMatches": ["exact", "terms", "to", "search"],
  "suggestions": [
    {"term": "suggestion", "confidence": 0.95, "reason": "why this matches"}
  ],
  "overallConfidence": 0.85,
  "naturalLanguageInterpretation": "human readable explanation"
}`;
  }

  /**
   * Extract relevant inventory context for prompt optimization
   * @param {Array} inventory - Full inventory
   * @returns {Object} Condensed inventory context
   */
  extractInventoryContext(inventory) {
    return {
      names: [...new Set(inventory.map(item => item.name))],
      metals: [...new Set(inventory.map(item => item.metal))],
      types: [...new Set(inventory.map(item => item.type))],
      compositions: [...new Set(inventory.map(item => item.composition).filter(Boolean))]
    };
  }

  /**
   * Call GPT API with error handling and retries
   * @param {string} prompt - Formatted prompt
   * @returns {Promise<Object>} API response
   */
  async callGPTAPI(prompt) {
    const requestBody = {
      model: this.model,
      messages: [
        {
          role: "system",
          content: "You are a precious metals inventory search expert. Respond only with valid JSON."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.3, // Low temperature for consistent results
      max_tokens: 500
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`GPT API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Parse and validate AI response
   * @param {string} responseText - Raw GPT response
   * @returns {Object} Parsed AI interpretation
   */
  parseAIResponse(responseText) {
    try {
      const parsed = JSON.parse(responseText);
      
      // Validate required fields
      const required = ['searchIntent', 'keywordMatches', 'overallConfidence'];
      for (const field of required) {
        if (!(field in parsed)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      return parsed;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('Invalid AI response format');
    }
  }

  /**
   * Merge traditional search results with AI insights
   * @param {Array} traditionalResults - Existing search results
   * @param {Object} aiInterpretation - AI analysis
   * @param {Array} inventory - Full inventory for additional matching
   * @returns {Object} Combined results
   */
  mergeResults(traditionalResults, aiInterpretation, inventory) {
    // Start with traditional results
    let results = [...traditionalResults];
    
    // Add AI-discovered items that traditional search might have missed
    if (aiInterpretation.overallConfidence >= AI_SEARCH_CONFIG.search.confidenceThreshold) {
      const aiMatches = this.findAIMatches(aiInterpretation, inventory);
      
      // Merge without duplicates
      const existingIds = new Set(results.map(item => item.serial || item.name));
      const newMatches = aiMatches.filter(item => 
        !existingIds.has(item.serial || item.name)
      );
      
      results = [...results, ...newMatches];
    }

    return {
      results,
      aiEnhanced: true,
      aiInterpretation,
      totalFound: results.length,
      aiContribution: results.length - traditionalResults.length,
      suggestions: aiInterpretation.suggestions || []
    };
  }

  /**
   * Find additional matches using AI interpretation
   * @param {Object} aiInterpretation - AI analysis
   * @param {Array} inventory - Full inventory
   * @returns {Array} Additional matching items
   */
  findAIMatches(aiInterpretation, inventory) {
    const matches = [];
    
    // Apply AI-suggested keywords with fuzzy matching
    for (const keyword of aiInterpretation.keywordMatches) {
      const fuzzyMatches = inventory.filter(item => {
        return this.fuzzyMatch(keyword, [
          item.name,
          item.metal, 
          item.composition,
          item.type,
          item.notes
        ].join(' '));
      });
      
      matches.push(...fuzzyMatches);
    }

    // Apply metal filters if specified
    if (aiInterpretation.metalFilter && aiInterpretation.metalFilter.length > 0) {
      const metalMatches = inventory.filter(item => 
        aiInterpretation.metalFilter.includes(item.metal)
      );
      matches.push(...metalMatches);
    }

    // Remove duplicates
    return [...new Map(matches.map(item => [item.serial || item.name, item])).values()];
  }

  /**
   * Fuzzy string matching for flexible search
   * @param {string} needle - Search term
   * @param {string} haystack - Text to search in
   * @returns {boolean} Whether there's a fuzzy match
   */
  fuzzyMatch(needle, haystack) {
    const normalizedNeedle = needle.toLowerCase().trim();
    const normalizedHaystack = haystack.toLowerCase();
    
    // Exact match
    if (normalizedHaystack.includes(normalizedNeedle)) {
      return true;
    }
    
    // Handle common abbreviations
    const abbreviations = {
      'ase': 'american silver eagle',
      'age': 'american gold eagle',
      'cml': 'canadian maple leaf',
      'ap': 'austrian philharmonic'
    };
    
    if (abbreviations[normalizedNeedle]) {
      return normalizedHaystack.includes(abbreviations[normalizedNeedle]);
    }
    
    // Simple fuzzy matching for typos
    if (normalizedNeedle.length > 3) {
      const threshold = Math.floor(normalizedNeedle.length * 0.8);
      return this.levenshteinDistance(normalizedNeedle, normalizedHaystack) <= threshold;
    }
    
    return false;
  }

  /**
   * Calculate Levenshtein distance for fuzzy matching
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  levenshteinDistance(str1, str2) {
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
   * Generate cache key for result caching
   * @param {string} query - Search query
   * @param {number} inventorySize - Size of inventory
   * @returns {string} Cache key
   */
  generateCacheKey(query, inventorySize) {
    return `${query.toLowerCase().trim()}_${inventorySize}_${this.model}`;
  }

  /**
   * Cache result with TTL management
   * @param {string} key - Cache key
   * @param {Object} result - Result to cache
   */
  cacheResult(key, result) {
    const cacheEntry = {
      result,
      timestamp: Date.now(),
      ttl: AI_SEARCH_CONFIG.cache.ttl
    };
    
    this.cache.set(key, cacheEntry);
    
    // Cleanup old entries
    this.cleanupCache();
    
    // Persist to localStorage
    this.saveCacheToStorage();
  }

  /**
   * Load cache from localStorage
   */
  loadCacheFromStorage() {
    try {
      const stored = localStorage.getItem(AI_SEARCH_CONFIG.cache.storageKey);
      if (stored) {
        const cacheData = JSON.parse(stored);
        this.cache = new Map(Object.entries(cacheData));
      }
    } catch (error) {
      console.warn('Failed to load AI search cache:', error);
    }
  }

  /**
   * Save cache to localStorage
   */
  saveCacheToStorage() {
    try {
      const cacheObject = Object.fromEntries(this.cache);
      localStorage.setItem(
        AI_SEARCH_CONFIG.cache.storageKey, 
        JSON.stringify(cacheObject)
      );
    } catch (error) {
      console.warn('Failed to save AI search cache:', error);
    }
  }

  /**
   * Cleanup expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
    
    // Enforce max size limit
    if (this.cache.size > AI_SEARCH_CONFIG.cache.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      
      // Keep only the most recent entries
      const toKeep = entries.slice(0, AI_SEARCH_CONFIG.cache.maxSize);
      this.cache = new Map(toKeep);
    }
  }
}

/**
 * Integration with existing StackTrackr search system
 * Enhances the existing filterInventory function with AI capabilities
 */
async function enhanceExistingSearch() {
  // Only enhance if AI is enabled and configured
  if (!window.aiSearchEnabled || !window.aiApiKey) {
    return window.filterInventory(); // Use traditional search
  }

  try {
    // Get traditional results first
    const traditionalResults = window.filterInventory();
    
    // Initialize AI engine if not already done
    if (!window.aiSearchEngine) {
      window.aiSearchEngine = new AISearchEngine(window.aiApiKey);
    }
    
    // Enhance with AI
    const enhancedResults = await window.aiSearchEngine.enhanceSearch(
      window.searchQuery || '',
      window.inventory || [],
      traditionalResults
    );
    
    // Update UI with enhanced results
    if (enhancedResults.aiEnhanced) {
      console.log(`🧠 AI Enhanced Search: Found ${enhancedResults.totalFound} items (${enhancedResults.aiContribution} AI-discovered)`);
      
      // Show AI insights in UI
      displayAIInsights(enhancedResults.aiInterpretation);
    }
    
    return enhancedResults.results;
    
  } catch (error) {
    console.error('AI Search Enhancement Failed:', error);
    // Graceful fallback to traditional search
    return window.filterInventory();
  }
}

/**
 * Display AI insights in the UI
 * @param {Object} aiInterpretation - AI analysis results
 */
function displayAIInsights(aiInterpretation) {
  // Create or update AI insights panel
  let insightsPanel = document.getElementById('ai-insights-panel');
  
  if (!insightsPanel) {
    insightsPanel = document.createElement('div');
    insightsPanel.id = 'ai-insights-panel';
    insightsPanel.className = 'ai-insights-panel';
    
    // Insert after search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.parentNode) {
      searchInput.parentNode.insertBefore(insightsPanel, searchInput.nextSibling);
    }
  }
  
  // Update content
  insightsPanel.innerHTML = `
    <div class="ai-insight">
      <span class="ai-badge">🧠 AI</span>
      <span class="ai-interpretation">${aiInterpretation.naturalLanguageInterpretation || aiInterpretation.searchIntent}</span>
      ${aiInterpretation.suggestions && aiInterpretation.suggestions.length > 0 ? `
        <div class="ai-suggestions">
          <span class="suggestions-label">Suggestions:</span>
          ${aiInterpretation.suggestions.map(s => 
            `<span class="suggestion-chip" data-term="${s.term}">${s.term}</span>`
          ).join('')}
        </div>
      ` : ''}
    </div>
  `;
  
  // Add click handlers for suggestions
  insightsPanel.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const term = e.target.dataset.term;
      document.getElementById('searchInput').value = term;
      // Trigger new search
      if (window.searchInventory) {
        window.searchInventory();
      }
    });
  });
}

// Export for integration
window.AISearchEngine = AISearchEngine;
window.enhanceExistingSearch = enhanceExistingSearch;

console.log('✅ StackTrackr AI Search Engine Prototype Loaded');

// ENHANCED FILE PROTOCOL COMPATIBILITY
// =============================================================================
// Enhanced file:// protocol fixes without conflicts
const safeDebug = (...args) => {
  if (typeof debugLog === 'function') {
    debugLog(...args);
  } else {
    console.log('[DEBUG]', ...args);
  }
};

safeDebug('Loading enhanced file:// protocol compatibility...');

// Only provide essential localStorage fallback for file:// protocol
if (window.location.protocol === 'file:') {
  safeDebug('File protocol detected - enabling full compatibility mode');
  
  // Create memory storage fallback if localStorage fails
  window.tempStorage = window.tempStorage || {};
  
  // Override localStorage methods with fallback
  const originalSetItem = localStorage.setItem;
  const originalGetItem = localStorage.getItem;
  const originalRemoveItem = localStorage.removeItem;
  
  // Create essential function stubs for early initialization
  // These will be replaced by real implementations when their scripts load
  
  // Core inventory functions
  if (!window.loadInventory) {
    window.loadInventory = function stubLoadInventory() {
      console.warn('Stub loadInventory called - waiting for real implementation');
      return [];
    };
  }
  
  if (!window.updateSummary) {
    window.updateSummary = function stubUpdateSummary() {
      console.warn('Stub updateSummary called - waiting for real implementation');
    };
  }
  
  if (!window.toggleCollectable) {
    window.toggleCollectable = function stubToggleCollectable() {
      console.warn('Stub toggleCollectable called - waiting for real implementation');
    };
  }
  
  // Prevent fetch errors for local file access
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    if (url.startsWith('docs/') || url.startsWith('./docs/')) {
      console.warn('File protocol fetch intercepted for:', url);
      return Promise.reject(new Error('Local file access not supported with file:// protocol'));
    }
    return originalFetch(url, options);
  };
  
  localStorage.setItem = function(key, value) {
    try {
      return originalSetItem.call(this, key, value);
    } catch (error) {
      console.warn('LocalStorage failed, using memory fallback');
      window.tempStorage[key] = value;
    }
  };
  
  localStorage.getItem = function(key) {
    try {
      return originalGetItem.call(this, key);
    } catch (error) {
      return window.tempStorage[key] || null;
    }
  };
  
  localStorage.removeItem = function(key) {
    try {
      return originalRemoveItem.call(this, key);
    } catch (error) {
      delete window.tempStorage[key];
    }
  };
}

safeDebug('File protocol compatibility loaded');

// =============================================================================

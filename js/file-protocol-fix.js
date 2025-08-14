// ENHANCED FILE PROTOCOL COMPATIBILITY
// =============================================================================
// Comprehensive file:// protocol fixes for module loading and localStorage
const safeDebug = (...args) => {
  if (typeof debugLog === 'function') {
    debugLog(...args);
  } else {
    console.log('[DEBUG]', ...args);
  }
};

safeDebug('Loading enhanced file:// protocol compatibility...');

// Provide comprehensive file:// protocol support
if (window.location.protocol === 'file:') {
  safeDebug('File protocol detected - enabling enhanced compatibility mode');
  
  // Create memory storage fallback if localStorage fails
  window.tempStorage = window.tempStorage || {};
  
  // Override localStorage methods with fallback
  const originalSetItem = localStorage.setItem;
  const originalGetItem = localStorage.getItem;
  const originalRemoveItem = localStorage.removeItem;
  
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
  
  // Create function stub fallbacks for critical functions
  // This ensures the app doesn't crash if functions are called before they're defined
  window.loadInventory = window.loadInventory || function() {
    console.warn('Stub loadInventory called before real implementation loaded');
    return [];
  };
  
  window.renderTable = window.renderTable || function() {
    console.warn('Stub renderTable called before real implementation loaded');
  };
  
  window.showDetailsModal = window.showDetailsModal || function() {
    console.warn('Stub showDetailsModal called before real implementation loaded');
  };
  
  window.toggleCollectable = window.toggleCollectable || function() {
    console.warn('Stub toggleCollectable called before real implementation loaded');
  };
  
  // Add module dependency safety mechanism for file:// protocol
  // This ensures modules can find each other regardless of load order
  window.moduleRegistry = window.moduleRegistry || {};
  window.registerModule = function(moduleName, moduleExports) {
    window.moduleRegistry[moduleName] = moduleExports;
    safeDebug(`Module registered: ${moduleName}`);
  };
  
  window.requireModule = function(moduleName) {
    if (window.moduleRegistry[moduleName]) {
      return window.moduleRegistry[moduleName];
    } else {
      console.warn(`Module not found: ${moduleName}, returning empty object`);
      return {};
    }
  };
  
  // Add a load completion tracker
  window.moduleLoadStatus = {
    total: 0,
    loaded: 0,
    reportLoaded: function(moduleName) {
      this.loaded++;
      safeDebug(`Module loaded: ${moduleName} (${this.loaded}/${this.total})`);
      if (this.loaded >= this.total) {
        safeDebug('All modules loaded');
        if (typeof initializeApplication === 'function') {
          safeDebug('Initializing application');
          initializeApplication();
        }
      }
    }
  };
  
  // Create a safer init wrapper
  window.initializeApplication = function() {
    safeDebug('Safe initialization running');
    // Attempt to run the main initialization
    try {
      if (typeof loadInventory !== 'function') {
        throw new Error("Can't find function: loadInventory");
      }
      // Re-run any required initialization
      loadInventory();
      if (typeof renderTable === 'function') renderTable();
    } catch (error) {
      console.error('Application initialization failed:', error);
      
      // Show user-friendly error
      const errorDiv = document.createElement('div');
      errorDiv.style.position = 'fixed';
      errorDiv.style.top = '50%';
      errorDiv.style.left = '50%';
      errorDiv.style.transform = 'translate(-50%, -50%)';
      errorDiv.style.backgroundColor = '#333';
      errorDiv.style.color = 'white';
      errorDiv.style.padding = '20px';
      errorDiv.style.borderRadius = '5px';
      errorDiv.style.zIndex = '9999';
      errorDiv.style.maxWidth = '80%';
      
      errorDiv.innerHTML = `
        <h3>Application initialization failed: ${error.message}</h3>
        <p>Please refresh the page and try again. If the problem persists, check the browser console for more details.</p>
        <button style="padding: 5px 10px; margin-top: 10px;">Close</button>
      `;
      
      document.body.appendChild(errorDiv);
      
      const closeButton = errorDiv.querySelector('button');
      closeButton.addEventListener('click', () => {
        errorDiv.remove();
      });
    }
  };
}

safeDebug('Enhanced file protocol compatibility loaded');

// =============================================================================

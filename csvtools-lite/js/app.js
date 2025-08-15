// Main application logic
document.addEventListener('DOMContentLoaded', function() {
  console.log('CSV Tools Lite - Application Started');
  
  // Initialize all components
  initializeApp();
});

function initializeApp() {
  // Set up global error handling
  window.addEventListener('error', function(e) {
    console.error('Application error:', e.error);
    showNotification('An error occurred. Please check the console for details.', 'error');
  });

  // Initialize drag and drop for the entire document
  document.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Only handle if dropped on upload area
    if (e.target.closest('.upload-area')) {
      handleDrop(e);
    }
  });

  // Set up upload area click handler
  const uploadArea = document.querySelector('.upload-area');
  if (uploadArea) {
    uploadArea.addEventListener('click', function() {
      document.getElementById('csvFile').click();
    });
  }

  debugLog('Application initialized successfully');
}

// Modal functions
function toggleHelp() {
  const modal = document.getElementById('helpModal');
  if (modal) {
    const isVisible = modal.style.display === 'block';
    modal.style.display = isVisible ? 'none' : 'block';
  }
}

// Export functionality
function exportData() {
  const data = window.csvTools.data;
  
  if (!data.length) {
    showNotification('No data to export', 'error');
    return;
  }

  const exportData = {
    data: data,
    exported: new Date().toISOString(),
    version: '1.0',
    application: 'CSV Tools Lite'
  };

  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `csvtools-export-${new Date().toISOString().split('T')[0]}.json`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showNotification('Data exported successfully', 'success');
}

// Import functionality
function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const importedData = JSON.parse(e.target.result);
        
        if (importedData.data && Array.isArray(importedData.data)) {
          window.csvTools.addData(importedData.data);
          showNotification(`Imported ${importedData.data.length} records`, 'success');
        } else {
          throw new Error('Invalid data format');
        }
      } catch (error) {
        console.error('Import error:', error);
        showNotification('Error importing data. Please check file format.', 'error');
      }
    };
    
    reader.readAsText(file);
  };
  
  input.click();
}

// Clear data functionality
function clearAllData() {
  if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
    window.csvTools.clearData();
    showNotification('All data cleared', 'success');
  }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
  // Ctrl/Cmd + O for open file
  if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
    e.preventDefault();
    document.getElementById('csvFile').click();
  }
  
  // Ctrl/Cmd + E for export
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
    e.preventDefault();
    exportData();
  }
  
  // Ctrl/Cmd + I for import
  if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
    e.preventDefault();
    importData();
  }
  
  // Escape to close modals and AI panel
  if (e.key === 'Escape') {
    // Close help modal
    const helpModal = document.getElementById('helpModal');
    if (helpModal && helpModal.style.display === 'block') {
      toggleHelp();
    }
    
    // Close AI panel
    const aiPanel = document.getElementById('aiPanel');
    if (aiPanel && !aiPanel.classList.contains('hidden')) {
      toggleAI();
    }
  }
});

// Touch support for mobile
let touchStartY = 0;
let touchEndY = 0;

document.addEventListener('touchstart', function(e) {
  touchStartY = e.changedTouches[0].screenY;
});

document.addEventListener('touchend', function(e) {
  touchEndY = e.changedTouches[0].screenY;
  handleSwipe();
});

function handleSwipe() {
  const swipeThreshold = 50;
  const diff = touchStartY - touchEndY;
  
  if (Math.abs(diff) > swipeThreshold) {
    if (diff > 0) {
      // Swiped up - could open AI panel
      debugLog('Swipe up detected');
    } else {
      // Swiped down - could close panels
      debugLog('Swipe down detected');
    }
  }
}

// Performance monitoring
function trackPerformance() {
  if (window.performance && window.performance.timing) {
    const timing = window.performance.timing;
    const loadTime = timing.loadEventEnd - timing.navigationStart;
    debugLog(`Application load time: ${loadTime}ms`);
  }
}

// Track performance after load
window.addEventListener('load', trackPerformance);

// Version check
const APP_VERSION = '1.0.0';
debugLog(`CSV Tools Lite v${APP_VERSION} ready`);

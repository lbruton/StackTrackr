// Core utilities and shared functions
class CSVToolsLite {
  constructor() {
    this.data = [];
    this.charts = {};
    this.aiAssistant = null;
    this.init();
  }

  init() {
    console.log('CSV Tools Lite initialized');
    this.loadStoredData();
    this.setupEventListeners();
  }

  loadStoredData() {
    const stored = localStorage.getItem('csvtools-data');
    if (stored) {
      try {
        this.data = JSON.parse(stored);
        this.updateDashboard();
      } catch (e) {
        console.error('Error loading stored data:', e);
      }
    }
  }

  saveData() {
    localStorage.setItem('csvtools-data', JSON.stringify(this.data));
  }

  setupEventListeners() {
    // File upload click handler
    const uploadArea = document.querySelector('.upload-area');
    if (uploadArea) {
      uploadArea.addEventListener('click', () => {
        document.getElementById('csvFile').click();
      });
    }

    // Enter key for AI input
    const aiInput = document.getElementById('aiInput');
    if (aiInput) {
      aiInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          sendMessage();
        }
      });
    }
  }

  updateDashboard() {
    if (this.data.length === 0) {
      document.getElementById('dashboard').style.display = 'none';
      return;
    }

    document.getElementById('dashboard').style.display = 'block';
    this.calculateVPRScores();
    this.updateCharts();
  }

  calculateVPRScores() {
    const scores = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    this.data.forEach(row => {
      const severity = (row.severity || '').toLowerCase();
      const vpr = parseFloat(row.vpr || row.VPR || 0);
      
      if (scores.hasOwnProperty(severity)) {
        scores[severity] += vpr;
      }
    });

    // Update UI
    document.getElementById('criticalVPR').textContent = scores.critical.toFixed(1);
    document.getElementById('highVPR').textContent = scores.high.toFixed(1);
    document.getElementById('mediumVPR').textContent = scores.medium.toFixed(1);
    document.getElementById('lowVPR').textContent = scores.low.toFixed(1);

    return scores;
  }

  updateCharts() {
    const scores = this.calculateVPRScores();
    
    // Update distribution chart
    if (window.chartManager) {
      window.chartManager.updateDistributionChart(scores);
      window.chartManager.updateTrendChart(this.data);
    }
  }

  addData(newData) {
    this.data = this.data.concat(newData);
    this.saveData();
    this.updateDashboard();
  }

  clearData() {
    this.data = [];
    this.saveData();
    this.updateDashboard();
  }
}

// Global utility functions
function debugLog(...args) {
  if (window.DEBUG) {
    console.log('[CSV Tools Debug]:', ...args);
  }
}

function formatNumber(num) {
  return new Intl.NumberFormat().format(num);
}

function formatDate(date) {
  return new Intl.DateTimeFormat().format(new Date(date));
}

// Initialize app
window.csvTools = new CSVToolsLite();
window.DEBUG = true;

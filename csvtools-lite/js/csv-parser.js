// CSV parsing functionality using PapaParse
class CSVParser {
  constructor() {
    this.supportedFormats = ['.csv', '.txt'];
  }

  async parseFile(file) {
    return new Promise((resolve, reject) => {
      if (!this.isValidFile(file)) {
        reject(new Error('Invalid file format. Please upload a CSV file.'));
        return;
      }

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('CSV parsing warnings:', results.errors);
          }
          
          const processedData = this.processData(results.data);
          resolve({
            data: processedData,
            meta: results.meta,
            filename: file.name,
            timestamp: new Date().toISOString()
          });
        },
        error: (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        }
      });
    });
  }

  isValidFile(file) {
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    return this.supportedFormats.includes(extension);
  }

  processData(data) {
    return data.map(row => {
      // Normalize common column names
      const normalizedRow = {};
      
      Object.keys(row).forEach(key => {
        const normalizedKey = key.toLowerCase().trim();
        let value = row[key];

        // Handle common VPR column variations
        if (normalizedKey.includes('vpr') || normalizedKey.includes('priority rating')) {
          normalizedRow.vpr = this.parseNumber(value);
        }
        // Handle severity variations
        else if (normalizedKey.includes('severity') || normalizedKey.includes('risk level')) {
          normalizedRow.severity = this.parseSeverity(value);
        }
        // Handle vulnerability ID
        else if (normalizedKey.includes('id') || normalizedKey.includes('cve')) {
          normalizedRow.id = value;
        }
        // Handle description/title
        else if (normalizedKey.includes('description') || normalizedKey.includes('title') || normalizedKey.includes('name')) {
          normalizedRow.description = value;
        }
        // Keep original data as well
        else {
          normalizedRow[normalizedKey] = value;
        }
      });

      return normalizedRow;
    });
  }

  parseNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  parseSeverity(value) {
    if (!value) return 'unknown';
    
    const severity = value.toString().toLowerCase().trim();
    
    if (severity.includes('critical') || severity.includes('crit')) return 'critical';
    if (severity.includes('high')) return 'high';
    if (severity.includes('medium') || severity.includes('med')) return 'medium';
    if (severity.includes('low')) return 'low';
    
    return severity;
  }
}

// File handling functions
function handleDrop(event) {
  event.preventDefault();
  const files = Array.from(event.dataTransfer.files);
  processFiles(files);
}

function handleDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  processFiles(files);
}

async function processFiles(files) {
  const parser = new CSVParser();
  const results = [];

  try {
    for (const file of files) {
      debugLog('Processing file:', file.name);
      const result = await parser.parseFile(file);
      results.push(result);
      
      // Add to main data
      window.csvTools.addData(result.data);
    }

    // Show success message
    showNotification(`Successfully processed ${files.length} file(s)`, 'success');
    
  } catch (error) {
    console.error('File processing error:', error);
    showNotification(`Error processing files: ${error.message}`, 'error');
  }
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Style the notification
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: type === 'error' ? '#ff6b6b' : type === 'success' ? '#4ecdc4' : '#45b7d1',
    color: 'white',
    padding: '1rem 2rem',
    borderRadius: '8px',
    zIndex: '10000',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
  });

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// Initialize parser
window.csvParser = new CSVParser();

// Bulk Upload Module for VPR Score tracking

// Function to handle multiple file uploads
async function handleBulkUpload(files) {
  const results = [];
  const warnings = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const data = await parseCSVFile(file);
      results.push({
        filename: file.name,
        date: new Date(),
        data: processVPRData(data)
      });
    } catch (error) {
      warnings.push(`Error processing ${file.name}: ${error.message}`);
    }
  }
  
  return { results, warnings };
}

// Parse a CSV file using PapaParse
function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: function(results) {
        if (results.errors && results.errors.length > 0) {
          reject(new Error(`Parse errors in ${file.name}: ${results.errors.map(e => e.message).join(', ')}`));
          return;
        }
        
        const data = results.data.filter(row => row.length > 0);
        if (data.length < 2) {
          reject(new Error(`No valid data rows in ${file.name}`));
          return;
        }
        
        resolve(data);
      },
      error: function(error) {
        reject(error);
      }
    });
  });
}

// Process VPR data from parsed CSV
function processVPRData(data) {
  const headers = data[0];
  const rows = data.slice(1);
  
  // Find severity and score columns
  const colSeverity = headers.findIndex(h => h.trim().toLowerCase() === 'definition.vpr.severity');
  const colScore = headers.findIndex(h => h.trim().toLowerCase() === 'definition.vpr.score');
  
  if (colSeverity === -1 || colScore === -1) {
    throw new Error('Missing required columns: definition.vpr.severity or definition.vpr.score');
  }
  
  const severities = ['low', 'medium', 'high', 'critical'];
  const results = {};
  
  // Calculate stats for each severity
  severities.forEach(sev => {
    let sum = 0, count = 0, min = null, max = null;
    
    for (const row of rows) {
      if (String(row[colSeverity]).trim().toLowerCase() === sev) {
        const score = parseFloat(String(row[colScore]).replace(/,/g, ''));
        if (!isNaN(score)) {
          sum += score;
          count++;
          if (min === null || score < min) min = score;
          if (max === null || score > max) max = score;
        }
      }
    }
    
    results[sev] = {
      count,
      sum,
      mean: count ? sum / count : 0,
      min: min ?? 0,
      max: max ?? 0
    };
  });
  
  // Calculate total
  let totalSum = 0, totalCount = 0, totalMin = null, totalMax = null;
  
  for (const row of rows) {
    const score = parseFloat(String(row[colScore]).replace(/,/g, ''));
    if (!isNaN(score)) {
      totalSum += score;
      totalCount++;
      if (totalMin === null || score < totalMin) totalMin = score;
      if (totalMax === null || score > totalMax) totalMax = score;
    }
  }
  
  results.total = {
    count: totalCount,
    sum: totalSum,
    mean: totalCount ? totalSum / totalCount : 0,
    min: totalMin ?? 0,
    max: totalMax ?? 0
  };
  
  return results;
}

// Save processed results to history
function saveResultsToHistory(results) {
  // Get existing history or create new
  let history = JSON.parse(localStorage.getItem('vprHistory') || '[]');
  
  // Add new results
  history = history.concat(results);
  
  // Sort by date
  history.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Save back to storage
  localStorage.setItem('vprHistory', JSON.stringify(history));
  
  return history;
}

export {
  handleBulkUpload,
  parseCSVFile,
  processVPRData,
  saveResultsToHistory
};

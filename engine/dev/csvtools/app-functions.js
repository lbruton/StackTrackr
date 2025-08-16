// Add the missing functions to app.js

// Display the latest results in the panels
function displayLatestResults(result) {
  if (!result || !result.data) return;
  
  const data = result.data;
  const severities = ['low', 'medium', 'high', 'critical', 'total'];
  const maxSum = Math.max(data.low.sum, data.medium.sum, data.high.sum, data.critical.sum);
  
  severities.forEach((sev, idx) => {
    const panelIndex = idx + 1;
    const stats = data[sev];
    
    if (!stats) return;
    
    // Format output with styled rows
    let output = `
      <div class="stat-row"><span class="stat-label">Count:</span> <span class="stat-value">${stats.count}</span></div>
      <div class="stat-row"><span class="stat-label">Sum:</span> <span class="stat-value">${stats.sum.toFixed(2)}</span></div>
      <div class="stat-row"><span class="stat-label">Mean:</span> <span class="stat-value">${stats.mean.toFixed(2)}</span></div>
      <div class="stat-row"><span class="stat-label">Min:</span> <span class="stat-value">${stats.min}</span></div>
      <div class="stat-row"><span class="stat-label">Max:</span> <span class="stat-value">${stats.max}</span></div>
    `;
    
    document.getElementById(`output-${panelIndex}`).innerHTML = output;
    
    // Update progress bar
    const percentage = maxSum > 0 ? (stats.sum / (sev === 'total' ? stats.sum : maxSum) * 100) : 0;
    document.getElementById(`progress-${panelIndex}`).style.width = `${Math.min(100, percentage)}%`;
  });
  
  document.getElementById('filename').textContent = result.filename;
}

// Generate HTML report from history data
function generateHTMLReport(history) {
  if (!history || history.length === 0) {
    return '<div>No history data available</div>';
  }
  
  // Sort history by date (newest first)
  const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>VPR Score Vulnerability Report</title>
      <style>
        body {
          font-family: Inter, Arial, sans-serif;
          line-height: 1.5;
          color: #e3e6ed;
          background: #181a20;
          margin: 0;
          padding: 20px;
        }
        .report-container {
          max-width: 1200px;
          margin: 0 auto;
          background: #23262f;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.18);
        }
        h1, h2, h3 {
          color: #fff;
          margin-top: 0;
        }
        h1 {
          border-bottom: 1px solid #353945;
          padding-bottom: 15px;
          margin-bottom: 30px;
        }
        .summary-box {
          background: #181a20;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 25px;
          border: 1px solid #353945;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 15px;
          margin-bottom: 30px;
        }
        .stat-card {
          background: #2c2f38;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .low { border-left: 4px solid #16c784; }
        .medium { border-left: 4px solid #f3d53c; }
        .high { border-left: 4px solid #f7931a; }
        .critical { border-left: 4px solid #ea3943; }
        .total { border-left: 4px solid #3861fb; }
        .stat-header {
          margin-top: 0;
          font-size: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #353945;
        }
        th {
          background: #2c2f38;
          font-weight: 600;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #b1b5c3;
          font-size: 14px;
        }
        .progress-bar {
          height: 6px;
          background: #353945;
          border-radius: 3px;
          margin-top: 10px;
          overflow: hidden;
        }
        .progress-value {
          height: 100%;
          border-radius: 3px;
        }
        .low-bg { background-color: #16c784; }
        .medium-bg { background-color: #f3d53c; }
        .high-bg { background-color: #f7931a; }
        .critical-bg { background-color: #ea3943; }
        .total-bg { background-color: #3861fb; }
      </style>
    </head>
    <body>
      <div class="report-container">
        <h1>VPR Score Vulnerability Report</h1>
        
        <div class="summary-box">
          <h2>Executive Summary</h2>
          <p>This report presents an analysis of vulnerability scores across ${sortedHistory.length} scans, 
          showing the distribution and trends of vulnerabilities by severity level.</p>
          <p>Report generated on: ${new Date().toLocaleString()}</p>
        </div>
        
        <h2>Latest Scan Results</h2>
        ${generateLatestResultsHTML(sortedHistory[0])}
        
        <h2>Historical Trends</h2>
        <div class="summary-box">
          <p>See the interactive application for detailed trend charts and analysis.</p>
        </div>
        
        <h2>Scan History</h2>
        ${generateHistoryTableHTML(sortedHistory)}
        
        <div class="footer">
          <p>Generated by Lonnie's CISA-Army Knife | ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return html;
}

// Generate HTML for the latest scan results in report
function generateLatestResultsHTML(latestScan) {
  if (!latestScan || !latestScan.data) return '<p>No scan data available</p>';
  
  const data = latestScan.data;
  const maxSum = Math.max(
    data.low.sum,
    data.medium.sum,
    data.high.sum,
    data.critical.sum
  );
  
  return `
    <div class="stats-grid">
      <div class="stat-card low">
        <h3 class="stat-header">Low</h3>
        <p>Count: ${data.low.count}</p>
        <p>Sum: ${data.low.sum.toFixed(2)}</p>
        <p>Mean: ${data.low.mean.toFixed(2)}</p>
        <div class="progress-bar">
          <div class="progress-value low-bg" style="width: ${(data.low.sum / maxSum * 100) || 0}%"></div>
        </div>
      </div>
      
      <div class="stat-card medium">
        <h3 class="stat-header">Medium</h3>
        <p>Count: ${data.medium.count}</p>
        <p>Sum: ${data.medium.sum.toFixed(2)}</p>
        <p>Mean: ${data.medium.mean.toFixed(2)}</p>
        <div class="progress-bar">
          <div class="progress-value medium-bg" style="width: ${(data.medium.sum / maxSum * 100) || 0}%"></div>
        </div>
      </div>
      
      <div class="stat-card high">
        <h3 class="stat-header">High</h3>
        <p>Count: ${data.high.count}</p>
        <p>Sum: ${data.high.sum.toFixed(2)}</p>
        <p>Mean: ${data.high.mean.toFixed(2)}</p>
        <div class="progress-bar">
          <div class="progress-value high-bg" style="width: ${(data.high.sum / maxSum * 100) || 0}%"></div>
        </div>
      </div>
      
      <div class="stat-card critical">
        <h3 class="stat-header">Critical</h3>
        <p>Count: ${data.critical.count}</p>
        <p>Sum: ${data.critical.sum.toFixed(2)}</p>
        <p>Mean: ${data.critical.mean.toFixed(2)}</p>
        <div class="progress-bar">
          <div class="progress-value critical-bg" style="width: ${(data.critical.sum / maxSum * 100) || 0}%"></div>
        </div>
      </div>
      
      <div class="stat-card total">
        <h3 class="stat-header">Total</h3>
        <p>Count: ${data.total.count}</p>
        <p>Sum: ${data.total.sum.toFixed(2)}</p>
        <p>Mean: ${data.total.mean.toFixed(2)}</p>
        <div class="progress-bar">
          <div class="progress-value total-bg" style="width: 100%"></div>
        </div>
      </div>
    </div>
  `;
}

// Generate HTML table for scan history in report
function generateHistoryTableHTML(history) {
  if (!history || history.length === 0) return '<p>No history data available</p>';
  
  let tableRows = '';
  
  history.forEach(scan => {
    const date = new Date(scan.date).toLocaleDateString();
    const data = scan.data;
    
    tableRows += `
      <tr>
        <td>${date}</td>
        <td>${scan.filename}</td>
        <td>${data.low.count} (${data.low.sum.toFixed(2)})</td>
        <td>${data.medium.count} (${data.medium.sum.toFixed(2)})</td>
        <td>${data.high.count} (${data.high.sum.toFixed(2)})</td>
        <td>${data.critical.count} (${data.critical.sum.toFixed(2)})</td>
        <td>${data.total.count}</td>
        <td>${data.total.sum.toFixed(2)}</td>
      </tr>
    `;
  });
  
  return `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Filename</th>
          <th>Low (Score)</th>
          <th>Medium (Score)</th>
          <th>High (Score)</th>
          <th>Critical (Score)</th>
          <th>Total Count</th>
          <th>Total Score</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;
}

// Update history charts from localStorage data
function updateHistoryCharts() {
  const history = JSON.parse(localStorage.getItem('vprHistory') || '[]');
  if (!history || history.length === 0) return;
  
  // Sort by date
  history.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Prepare chart data
  const labels = history.map(entry => {
    const date = new Date(entry.date);
    return date.toLocaleDateString();
  });
  
  // Create datasets for each severity
  const lowData = history.map(entry => entry.data.low.sum);
  const mediumData = history.map(entry => entry.data.medium.sum);
  const highData = history.map(entry => entry.data.high.sum);
  const criticalData = history.map(entry => entry.data.critical.sum);
  const totalData = history.map(entry => entry.data.total.sum);
  
  // Create the charts
  createHistoryChart('histchart-1', labels, lowData, '#16c784', 'Low Severity Score');
  createHistoryChart('histchart-2', labels, mediumData, '#f3d53c', 'Medium Severity Score');
  createHistoryChart('histchart-3', labels, highData, '#f7931a', 'High Severity Score');
  createHistoryChart('histchart-4', labels, criticalData, '#ea3943', 'Critical Severity Score');
  createHistoryChart('histchart-5', labels, totalData, '#3861fb', 'Total Score');
  
  // Create history tables
  createHistoryTable('histtable-1', history, 'low');
  createHistoryTable('histtable-2', history, 'medium');
  createHistoryTable('histtable-3', history, 'high');
  createHistoryTable('histtable-4', history, 'critical');
  createHistoryTable('histtable-5', history, 'total');
}

// Create a line chart for history data
function createHistoryChart(canvasId, labels, data, color, label) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  
  // Destroy existing chart if any
  if (window[`_${canvasId}`]) {
    window[`_${canvasId}`].destroy();
  }
  
  // Create new chart
  window[`_${canvasId}`] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: data,
        borderColor: color,
        backgroundColor: color + '33', // Add transparency
        fill: true,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Create a history table for a specific severity
function createHistoryTable(tableId, history, severity) {
  const tableEl = document.getElementById(tableId);
  if (!tableEl) return;
  
  const lastFiveEntries = [...history].reverse().slice(0, 5);
  
  let tableHTML = `
    <table class="history-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Score</th>
          <th>Count</th>
          <th>Change</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  lastFiveEntries.forEach((entry, index) => {
    const date = new Date(entry.date).toLocaleDateString();
    const score = entry.data[severity].sum.toFixed(2);
    const count = entry.data[severity].count;
    
    // Calculate change from previous entry
    let change = '';
    if (index < lastFiveEntries.length - 1) {
      const prevScore = lastFiveEntries[index + 1].data[severity].sum;
      const diff = entry.data[severity].sum - prevScore;
      
      if (diff > 0) {
        change = `<span class="trends-up">▲ ${diff.toFixed(2)}</span>`;
      } else if (diff < 0) {
        change = `<span class="trends-down">▼ ${Math.abs(diff).toFixed(2)}</span>`;
      } else {
        change = `<span class="trends-equal">=</span>`;
      }
    }
    
    tableHTML += `
      <tr>
        <td>${date}</td>
        <td>${score}</td>
        <td>${count}</td>
        <td>${change}</td>
      </tr>
    `;
  });
  
  tableHTML += `
      </tbody>
    </table>
  `;
  
  tableEl.innerHTML = tableHTML;
}

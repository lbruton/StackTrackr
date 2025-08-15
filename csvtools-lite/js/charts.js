// Chart management using Chart.js
class ChartManager {
  constructor() {
    this.distributionChart = null;
    this.trendChart = null;
    this.init();
  }

  init() {
    this.initDistributionChart();
    this.initTrendChart();
  }

  initDistributionChart() {
    const ctx = document.getElementById('distributionChart');
    if (!ctx) return;

    this.distributionChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
          data: [0, 0, 0, 0],
          backgroundColor: [
            '#ff6b6b',
            '#ffa500',
            '#ffd700',
            '#96ceb4'
          ],
          borderColor: [
            '#ff6b6b',
            '#ffa500',
            '#ffd700',
            '#96ceb4'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'VPR Distribution by Severity',
            color: '#e0e0e0',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            position: 'bottom',
            labels: {
              color: '#e0e0e0',
              padding: 20,
              usePointStyle: true
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${label}: ${value.toFixed(1)} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  initTrendChart() {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Critical',
            data: [],
            borderColor: '#ff6b6b',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            tension: 0.4,
            fill: false
          },
          {
            label: 'High',
            data: [],
            borderColor: '#ffa500',
            backgroundColor: 'rgba(255, 165, 0, 0.1)',
            tension: 0.4,
            fill: false
          },
          {
            label: 'Medium',
            data: [],
            borderColor: '#ffd700',
            backgroundColor: 'rgba(255, 215, 0, 0.1)',
            tension: 0.4,
            fill: false
          },
          {
            label: 'Low',
            data: [],
            borderColor: '#96ceb4',
            backgroundColor: 'rgba(150, 206, 180, 0.1)',
            tension: 0.4,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'VPR Trends Over Time',
            color: '#e0e0e0',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            position: 'bottom',
            labels: {
              color: '#e0e0e0',
              padding: 20,
              usePointStyle: true
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#e0e0e0'
            },
            grid: {
              color: 'rgba(224, 224, 224, 0.1)'
            }
          },
          y: {
            ticks: {
              color: '#e0e0e0'
            },
            grid: {
              color: 'rgba(224, 224, 224, 0.1)'
            }
          }
        }
      }
    });
  }

  updateDistributionChart(scores) {
    if (!this.distributionChart) return;

    const data = [
      scores.critical || 0,
      scores.high || 0,
      scores.medium || 0,
      scores.low || 0
    ];

    this.distributionChart.data.datasets[0].data = data;
    this.distributionChart.update('active');
  }

  updateTrendChart(data) {
    if (!this.trendChart || !data.length) return;

    // Group data by date for trending
    const dateGroups = {};
    
    data.forEach(row => {
      const date = row.timestamp ? new Date(row.timestamp).toLocaleDateString() : 'Unknown';
      if (!dateGroups[date]) {
        dateGroups[date] = { critical: 0, high: 0, medium: 0, low: 0 };
      }
      
      const severity = (row.severity || '').toLowerCase();
      const vpr = parseFloat(row.vpr || 0);
      
      if (dateGroups[date].hasOwnProperty(severity)) {
        dateGroups[date][severity] += vpr;
      }
    });

    const sortedDates = Object.keys(dateGroups).sort((a, b) => new Date(a) - new Date(b));
    
    this.trendChart.data.labels = sortedDates;
    this.trendChart.data.datasets[0].data = sortedDates.map(date => dateGroups[date].critical);
    this.trendChart.data.datasets[1].data = sortedDates.map(date => dateGroups[date].high);
    this.trendChart.data.datasets[2].data = sortedDates.map(date => dateGroups[date].medium);
    this.trendChart.data.datasets[3].data = sortedDates.map(date => dateGroups[date].low);
    
    this.trendChart.update('active');
  }

  destroy() {
    if (this.distributionChart) {
      this.distributionChart.destroy();
    }
    if (this.trendChart) {
      this.trendChart.destroy();
    }
  }
}

// Initialize chart manager
window.chartManager = new ChartManager();

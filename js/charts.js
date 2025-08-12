// CHART UTILITIES
// =============================================================================

/**
 * Generates a color palette for pie chart segments
 * 
 * @param {number} count - Number of colors needed
 * @returns {Array} Array of color strings
 */
const generateColors = (count) => {
  const colors = [
    '#3b82f6', // Primary blue
    '#ef4444', // Red
    '#10b981', // Green
    '#f59e0b', // Yellow
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#84cc16', // Lime
    '#ec4899', // Pink
    '#6b7280', // Gray
    '#14b8a6', // Teal
    '#f43f5e', // Rose
  ];

  // If we need more colors than predefined, generate them
  if (count > colors.length) {
    for (let i = colors.length; i < count; i++) {
      const hue = (i * 137.508) % 360; // Golden ratio for good distribution
      colors.push(`hsl(${hue}, 70%, 50%)`);
    }
  }

  return colors.slice(0, count);
};

/**
 * Gets appropriate background color for charts based on current theme
 * 
 * @returns {string} Background color
 */
const getChartBackgroundColor = () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return isDark ? '#1e293b' : '#f8fafc';
};

/**
 * Gets appropriate text color for charts based on current theme
 * 
 * @returns {string} Text color
 */
const getChartTextColor = () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return isDark ? '#f8fafc' : '#1e293b';
};

/**
 * Creates a pie chart with the given data
 * 
 * @param {HTMLCanvasElement} canvas - Canvas element to render chart on
 * @param {Object} data - Chart data with labels and values
 * @param {string} title - Chart title
 * @returns {Chart} Chart.js instance
 */
const createPieChart = (canvas, data, title) => {
  const labels = Object.keys(data);
  const values = Object.values(data).map(item => item.value);
  const colors = generateColors(labels.length);

  const ctx = canvas.getContext('2d');

  return new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: colors.map(color => color + '80'), // Add transparency
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: getChartTextColor(),
            padding: 15,
            usePointStyle: true,
            font: {
              size: 12
            },
            generateLabels: function(chart) {
              const data = chart.data;
              if (data.labels.length && data.datasets.length) {
                return data.labels.map((label, i) => {
                  const value = data.datasets[0].data[i];
                  const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);

                  return {
                    text: `${label} (${formatCurrency(value)} - ${percentage}%)`,
                    fillStyle: data.datasets[0].backgroundColor[i],
                    strokeStyle: data.datasets[0].borderColor[i],
                    lineWidth: data.datasets[0].borderWidth,
                    hidden: false,
                    index: i
                  };
                });
              }
              return [];
            }
          }
        },
        tooltip: {
          backgroundColor: getChartBackgroundColor(),
          titleColor: getChartTextColor(),
          bodyColor: getChartTextColor(),
          borderColor: getChartTextColor(),
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);

              // Get breakdown data for additional info
              const breakdownItem = data[label];
              const count = breakdownItem ? breakdownItem.count : 0;
              const weight = breakdownItem ? breakdownItem.weight.toFixed(2) : '0.00';

              return [
                `${label}: ${formatCurrency(value)} (${percentage}%)`,
                `Items: ${count}`,
                `Weight: ${weight} oz`
              ];
            }
          }
        }
      },
      animation: {
        animateRotate: true,
        animateScale: false,
        duration: 1000,
        easing: 'easeOutQuart'
      }
    }
  });
};

/**
 * Destroys existing chart instances to prevent memory leaks
 */
const destroyCharts = () => {
  Object.keys(chartInstances).forEach(key => {
    if (chartInstances[key]) {
      chartInstances[key].destroy();
      chartInstances[key] = null;
    }
  });
};

// =============================================================================

// Database Module for VPR Score tracking with SQLite support

let dbConnection = null;

// Initialize database based on config
async function initDatabase(config) {
  if (config.type === 'sqlite') {
    return await initSQLite(config);
  } else {
    // Default to browser storage
    return initLocalStorage();
  }
}

// Initialize local storage "database"
function initLocalStorage() {
  return {
    type: 'local',
    saveHistory: (history) => {
      localStorage.setItem('vprHistory', JSON.stringify(history));
      return Promise.resolve(true);
    },
    getHistory: () => {
      return Promise.resolve(JSON.parse(localStorage.getItem('vprHistory') || '[]'));
    },
    addScan: (scan) => {
      const history = JSON.parse(localStorage.getItem('vprHistory') || '[]');
      history.push(scan);
      localStorage.setItem('vprHistory', JSON.stringify(history));
      return Promise.resolve(true);
    },
    close: () => {
      return Promise.resolve(true);
    }
  };
}

// Initialize SQLite database (would work in Electron or Node.js context)
async function initSQLite(config) {
  try {
    // This is a placeholder - in a real implementation, we'd use better-sqlite3 or similar
    // For browser context, we'd need to use a different approach like IndexedDB
    console.log('SQLite support requires server-side implementation or Electron');
    
    // For this demo, we'll simulate SQLite with localStorage
    return {
      type: 'sqlite',
      saveHistory: (history) => {
        localStorage.setItem('sqliteHistory', JSON.stringify(history));
        return Promise.resolve(true);
      },
      getHistory: () => {
        return Promise.resolve(JSON.parse(localStorage.getItem('sqliteHistory') || '[]'));
      },
      addScan: (scan) => {
        const history = JSON.parse(localStorage.getItem('sqliteHistory') || '[]');
        history.push(scan);
        localStorage.setItem('sqliteHistory', JSON.stringify(history));
        return Promise.resolve(true);
      },
      close: () => {
        return Promise.resolve(true);
      }
    };
  } catch (error) {
    console.error('Error initializing SQLite:', error);
    // Fall back to local storage
    return initLocalStorage();
  }
}

// Docker persistence instructions - return a string with setup info
function getDockerPersistenceInstructions() {
  return `
# Dockerfile for VPR Tracker
FROM nginx:alpine

# Copy application files
COPY . /usr/share/nginx/html/

# Create data directory for persistence
RUN mkdir -p /usr/share/nginx/html/data

# Configure nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Set up volume for persistent data
VOLUME /usr/share/nginx/html/data

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
  `;
}

export {
  initDatabase,
  getDockerPersistenceInstructions
};

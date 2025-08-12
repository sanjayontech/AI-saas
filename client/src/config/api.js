// API Configuration
// Centralized configuration for API endpoints

const API_CONFIG = {
  // Base URL for the API server
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
  
  // Server URL for WebSocket connections
  SERVER_URL: import.meta.env.VITE_SERVER_URL || 'http://localhost:3001',
  
  // Timeout for API requests (in milliseconds)
  TIMEOUT: 10000,
  
  // Default headers for API requests
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },
};

export default API_CONFIG;
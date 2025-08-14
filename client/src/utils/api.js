import API_CONFIG from '../config/api';

const API_BASE_URL = API_CONFIG.BASE_URL;

// Generic API request helper
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();
    
    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401) {
        // Clear invalid token and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth';
        throw new Error('Authentication required');
      }
      
      throw new Error(data.error?.message || 'API request failed');
    }
    
    return data;
  } catch (error) {
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Please check your connection.');
    }
    throw new Error(error.message || 'Network error');
  }
};

// Chatbot API functions
export const chatbotAPI = {
  // Get all chatbots for the current user
  getAll: () => apiRequest('/chatbots'),
  
  // Get a specific chatbot by ID
  getById: (id) => apiRequest(`/chatbots/${id}`),
  
  // Create a new chatbot
  create: (chatbotData) => apiRequest('/chatbots', {
    method: 'POST',
    body: JSON.stringify(chatbotData),
  }),
  
  // Update an existing chatbot
  update: (id, chatbotData) => apiRequest(`/chatbots/${id}`, {
    method: 'PUT',
    body: JSON.stringify(chatbotData),
  }),
  
  // Delete a chatbot
  delete: (id) => apiRequest(`/chatbots/${id}`, {
    method: 'DELETE',
  }),
  
  // Test chatbot with a message
  testMessage: (id, message, context = {}) => apiRequest(`/chatbots/${id}/test`, {
    method: 'POST',
    body: JSON.stringify({ message, context }),
  }),
  
  // Get chatbot analytics
  getAnalytics: (id, timeRange = '7d') => apiRequest(`/chatbots/${id}/analytics?timeRange=${timeRange}`),
  
  // Generate embed code
  getEmbedCode: (id) => apiRequest(`/chatbots/${id}/embed`),
};

// Analytics API functions
export const analyticsAPI = {
  // Get dashboard metrics for a chatbot
  getDashboardMetrics: (chatbotId, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiRequest(`/analytics/${chatbotId}/dashboard${queryParams ? `?${queryParams}` : ''}`);
  },
  
  // Get conversation insights
  getConversationInsights: (chatbotId, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiRequest(`/analytics/${chatbotId}/insights${queryParams ? `?${queryParams}` : ''}`);
  },
  
  // Get conversation history with search and filtering
  getConversationHistory: (chatbotId, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiRequest(`/analytics/${chatbotId}/conversations${queryParams ? `?${queryParams}` : ''}`);
  },
  
  // Get performance insights
  getPerformanceInsights: (chatbotId, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiRequest(`/analytics/${chatbotId}/performance${queryParams ? `?${queryParams}` : ''}`);
  },
  
  // Get user analytics summary
  getUserAnalyticsSummary: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiRequest(`/analytics/summary${queryParams ? `?${queryParams}` : ''}`);
  },
  
  // Export analytics data
  exportAnalyticsData: (chatbotId, params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiRequest(`/analytics/${chatbotId}/export${queryParams ? `?${queryParams}` : ''}`);
  }
};

// Authentication API functions
export const authAPI = {
  // Refresh user token with updated data (useful after email verification)
  refreshToken: () => apiRequest('/auth/refresh-user-token', {
    method: 'POST',
  }),
};

// User Management API functions
export const userAPI = {
  // Get complete user profile including preferences and usage stats
  getProfile: () => apiRequest('/users/profile'),
  
  // Update user profile preferences
  updateProfile: (profileData) => apiRequest('/users/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  }),
  
  // Get user usage statistics
  getUsageStats: () => apiRequest('/users/usage'),
  
  // Export user data (GDPR compliance)
  exportData: () => apiRequest('/users/export'),
  
  // Delete user account
  deleteAccount: (confirmEmail) => apiRequest('/users/account', {
    method: 'DELETE',
    body: JSON.stringify({ confirmEmail }),
  }),
  
  // Track message usage (internal)
  trackMessage: () => apiRequest('/users/track/message', {
    method: 'POST',
  }),
  
  // Update user activity (internal)
  updateActivity: () => apiRequest('/users/activity', {
    method: 'PUT',
  }),
};

export default apiRequest;
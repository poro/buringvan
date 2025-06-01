import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken,
          });

          const { token } = response.data.data;
          Cookies.set('authToken', token, { expires: 7 });

          // Retry the original request
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        Cookies.remove('authToken');
        Cookies.remove('refreshToken');
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/api/auth/register', userData),
  login: (credentials) => api.post('/api/auth/login', credentials),
  logout: () => api.post('/api/auth/logout'),
  getProfile: () => api.get('/api/auth/profile'),
  updateProfile: (userData) => api.put('/api/auth/profile', userData),
  forgotPassword: (email) => api.post('/api/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/api/auth/reset-password', { token, password }),
  refreshToken: (refreshToken) => api.post('/api/auth/refresh', { refreshToken }),
};

// Content API
export const contentAPI = {
  getContent: (params) => api.get('/api/content', { params }),
  getContentById: (id) => api.get(`/api/content/${id}`),
  createContent: (contentData) => api.post('/api/content', contentData),
  updateContent: (id, contentData) => api.put(`/api/content/${id}`, contentData),
  deleteContent: (id) => api.delete(`/api/content/${id}`),
  scheduleContent: (id, scheduleData) => api.post(`/api/content/${id}/schedule`, scheduleData),
};

// Campaign API
export const campaignAPI = {
  getCampaigns: (params) => api.get('/api/content/campaigns', { params }),
  getCampaignById: (id) => api.get(`/api/content/campaigns/${id}`),
  createCampaign: (campaignData) => api.post('/api/content/campaigns', campaignData),
  updateCampaign: (id, campaignData) => api.put(`/api/content/campaigns/${id}`, campaignData),
  deleteCampaign: (id) => api.delete(`/api/content/campaigns/${id}`),
};

// AI API
export const aiAPI = {
  generateContent: (prompt) => api.post('/api/ai/generate', prompt),
  optimizeContent: (contentData) => api.post('/api/ai/optimize', contentData),
  analyzeContent: (contentData) => api.post('/api/ai/analyze', contentData),
  getTemplates: () => api.get('/api/ai/templates'),
  createTemplate: (templateData) => api.post('/api/ai/templates', templateData),
};

// Social API
export const socialAPI = {
  getAccounts: () => api.get('/api/social/accounts'),
  connectAccount: (platform, authData) => api.post(`/api/social/accounts`, { platform, ...authData }),
  disconnectAccount: (id) => api.delete(`/api/social/accounts/${id}`),
  postContent: (postData) => api.post('/api/social/post', postData),
  getPosts: (params) => api.get('/api/social/posts', { params }),
  getAuthUrl: (platform) => api.post(`/api/social/auth/${platform}`),
};

// Analytics API
export const analyticsAPI = {
  getMetrics: (params) => api.get('/api/analytics/metrics', { params }),
  getReports: (params) => api.get('/api/analytics/reports', { params }),
  createReport: (reportData) => api.post('/api/analytics/reports', reportData),
  getReportById: (id) => api.get(`/api/analytics/reports/${id}`),
  generateReport: (id) => api.post(`/api/analytics/reports/${id}/generate`),
};

// Notifications API
export const notificationAPI = {
  getNotifications: (params) => api.get('/api/notifications', { params }),
  markAsRead: (id) => api.put(`/api/notifications/${id}/read`),
  getTemplates: () => api.get('/api/notifications/templates'),
  createTemplate: (templateData) => api.post('/api/notifications/templates', templateData),
  sendNotification: (notificationData) => api.post('/api/notifications', notificationData),
};

export default api;

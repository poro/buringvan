import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:3000'; // Change to your API gateway URL

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
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
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
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken,
          });

          const { token } = response.data.data;
          await AsyncStorage.setItem('authToken', token);

          // Retry the original request
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, remove tokens
        await AsyncStorage.multiRemove(['authToken', 'refreshToken']);
        // Navigate to login would be handled by auth context
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData: any) => api.post('/api/auth/register', userData),
  login: (credentials: any) => api.post('/api/auth/login', credentials),
  logout: () => api.post('/api/auth/logout'),
  getProfile: () => api.get('/api/auth/profile'),
  updateProfile: (userData: any) => api.put('/api/auth/profile', userData),
  refreshToken: (refreshToken: string) => api.post('/api/auth/refresh', { refreshToken }),
};

// Content API
export const contentAPI = {
  getContent: (params?: any) => api.get('/api/content', { params }),
  getContentById: (id: string) => api.get(`/api/content/${id}`),
  createContent: (contentData: any) => api.post('/api/content', contentData),
  updateContent: (id: string, contentData: any) => api.put(`/api/content/${id}`, contentData),
  deleteContent: (id: string) => api.delete(`/api/content/${id}`),
  approveContent: (id: string, approvalData: any) => api.post(`/api/content/${id}/approve`, approvalData),
  rejectContent: (id: string, rejectionData: any) => api.post(`/api/content/${id}/reject`, rejectionData),
  getCampaigns: (params?: any) => api.get('/api/content/campaigns', { params }),
  createCampaign: (campaignData: any) => api.post('/api/content/campaigns', campaignData),
  updateCampaign: (id: string, campaignData: any) => api.put(`/api/content/campaigns/${id}`, campaignData),
};

// AI API
export const aiAPI = {
  generateContent: (prompt: any) => api.post('/api/ai/generate', prompt),
  getTemplates: () => api.get('/api/ai/templates'),
  createTemplate: (templateData: any) => api.post('/api/ai/templates', templateData),
  optimizeContent: (contentData: any) => api.post('/api/ai/optimize', contentData),
  getInsights: (contentId: string) => api.get(`/api/ai/insights/${contentId}`),
};

// Social API
export const socialAPI = {
  getAccounts: () => api.get('/api/social/accounts'),
  connectAccount: (platform: string, authData: any) => api.post('/api/social/accounts', { platform, ...authData }),
  disconnectAccount: (id: string) => api.delete(`/api/social/accounts/${id}`),
  postContent: (postData: any) => api.post('/api/social/post', postData),
  getPosts: (params?: any) => api.get('/api/social/posts', { params }),
  getAuthUrl: (platform: string) => api.post(`/api/social/auth/${platform}`),
};

// Analytics API
export const analyticsAPI = {
  getMetrics: (params?: any) => api.get('/api/analytics/metrics', { params }),
  getReports: (params?: any) => api.get('/api/analytics/reports', { params }),
  createReport: (reportData: any) => api.post('/api/analytics/reports', reportData),
  getReportById: (id: string) => api.get(`/api/analytics/reports/${id}`),
  generateReport: (id: string) => api.post(`/api/analytics/reports/${id}/generate`),
};

// Notifications API
export const notificationAPI = {
  getNotifications: (params?: any) => api.get('/api/notifications', { params }),
  markAsRead: (id: string) => api.put(`/api/notifications/${id}/read`),
  markAllAsRead: () => api.put('/api/notifications/read-all'),
  getUnreadCount: () => api.get('/api/notifications/unread-count'),
  updatePreferences: (preferences: any) => api.put('/api/notifications/preferences', preferences),
};

export default api;

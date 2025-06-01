import axios from 'axios';
import Cookies from 'js-cookie';

const AI_API_URL = process.env.REACT_APP_AI_API_URL || 'http://localhost:3003';

// Create dedicated AI service axios instance
const aiApi = axios.create({
  baseURL: AI_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
aiApi.interceptors.request.use(
  (config) => {
    const token = Cookies.get('authToken') || Cookies.get('jwt');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const aiService = {
  generateContent: async (params) => {
    const response = await aiApi.post('/api/ai/generate', params);
    return response.data;
  }
};

export default aiService; 
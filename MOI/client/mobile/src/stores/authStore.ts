import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await axios.post('http://localhost:3000/api/auth/login', {
            email,
            password
          });

          const { user, token } = response.data;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          });

          // Set auth token for future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } catch (error) {
          set({
            error: error.response?.data?.message || 'Login failed',
            isLoading: false
          });
          throw error;
        }
      },

      register: async (name: string, email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });

          const response = await axios.post('http://localhost:3000/api/auth/register', {
            name,
            email,
            password
          });

          const { user, token } = response.data;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          });

          // Set auth token for future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } catch (error) {
          set({
            error: error.response?.data?.message || 'Registration failed',
            isLoading: false
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true });

          // Clear auth token
          delete axios.defaults.headers.common['Authorization'];

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false
          });
        } catch (error) {
          set({
            error: 'Logout failed',
            isLoading: false
          });
          throw error;
        }
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      getStorage: () => AsyncStorage
    }
  )
); 
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import * as authService from '../../services/authService';

// Mock the auth service
jest.mock('../../services/authService');

// Test component to access auth context
const TestComponent = () => {
  const { user, loading, login, logout, register } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => register({
        email: 'new@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe'
      })}>Register</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should show loading initially', () => {
      authService.getCurrentUser.mockResolvedValue(null);
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('loading');
      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    });

    it('should load user from localStorage if token exists', async () => {
      const mockUser = { 
        id: '1', 
        email: 'test@example.com', 
        firstName: 'John', 
        lastName: 'Doe' 
      };
      
      localStorage.setItem('token', 'mock-token');
      authService.getCurrentUser.mockResolvedValue({ success: true, user: mockUser });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      });

      expect(authService.getCurrentUser).toHaveBeenCalled();
    });

    it('should handle invalid token in localStorage', async () => {
      localStorage.setItem('token', 'invalid-token');
      authService.getCurrentUser.mockResolvedValue({ success: false });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      });

      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('Login', () => {
    it('should login user successfully', async () => {
      const mockUser = { 
        id: '1', 
        email: 'test@example.com', 
        firstName: 'John', 
        lastName: 'Doe' 
      };
      const mockTokens = { 
        accessToken: 'access-token', 
        refreshToken: 'refresh-token' 
      };

      authService.getCurrentUser.mockResolvedValue(null);
      authService.login.mockResolvedValue({ 
        success: true, 
        user: mockUser, 
        tokens: mockTokens 
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // Perform login
      await act(async () => {
        screen.getByText('Login').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      });

      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password');
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'access-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token');
    });

    it('should handle login failure', async () => {
      authService.getCurrentUser.mockResolvedValue(null);
      authService.login.mockResolvedValue({ 
        success: false, 
        message: 'Invalid credentials' 
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      await act(async () => {
        screen.getByText('Login').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      });

      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Register', () => {
    it('should register user successfully', async () => {
      const mockUser = { 
        id: '1', 
        email: 'new@example.com', 
        firstName: 'John', 
        lastName: 'Doe' 
      };
      const mockTokens = { 
        accessToken: 'access-token', 
        refreshToken: 'refresh-token' 
      };

      authService.getCurrentUser.mockResolvedValue(null);
      authService.register.mockResolvedValue({ 
        success: true, 
        user: mockUser, 
        tokens: mockTokens 
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      await act(async () => {
        screen.getByText('Register').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('new@example.com');
      });

      expect(authService.register).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe'
      });
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'access-token');
    });
  });

  describe('Logout', () => {
    it('should logout user successfully', async () => {
      const mockUser = { 
        id: '1', 
        email: 'test@example.com', 
        firstName: 'John', 
        lastName: 'Doe' 
      };

      localStorage.setItem('token', 'mock-token');
      authService.getCurrentUser.mockResolvedValue({ success: true, user: mockUser });
      authService.logout.mockResolvedValue({ success: true });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for user to load
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      });

      // Logout
      await act(async () => {
        screen.getByText('Logout').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      });

      expect(authService.logout).toHaveBeenCalled();
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
    });

    it('should clear user data even if logout API fails', async () => {
      const mockUser = { 
        id: '1', 
        email: 'test@example.com', 
        firstName: 'John', 
        lastName: 'Doe' 
      };

      localStorage.setItem('token', 'mock-token');
      authService.getCurrentUser.mockResolvedValue({ success: true, user: mockUser });
      authService.logout.mockRejectedValue(new Error('Network error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      });

      await act(async () => {
        screen.getByText('Logout').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      });

      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
    });
  });

  describe('Error Handling', () => {
    it('should handle getCurrentUser API error', async () => {
      localStorage.setItem('token', 'mock-token');
      authService.getCurrentUser.mockRejectedValue(new Error('Network error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      });

      expect(localStorage.getItem('token')).toBeNull();
    });
  });
});

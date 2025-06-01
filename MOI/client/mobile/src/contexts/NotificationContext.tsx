import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { notificationAPI } from '../services/api';
import { useAuth } from './AuthContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

interface NotificationContextType extends NotificationState {
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearError: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
};

type NotificationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'SET_UNREAD_COUNT'; payload: number }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.payload, loading: false };
    case 'SET_UNREAD_COUNT':
      return { ...state, unreadCount: action.payload };
    case 'MARK_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, read: true }
            : notification
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    case 'MARK_ALL_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification => ({ ...notification, read: true })),
        unreadCount: 0,
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await notificationAPI.getNotifications({ limit: 50 });
      dispatch({ type: 'SET_NOTIFICATIONS', payload: response.data.data });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch notifications';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      dispatch({ type: 'SET_UNREAD_COUNT', payload: response.data.data.count });
    } catch (error) {
      // Ignore errors for unread count
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationAPI.markAsRead(id);
      dispatch({ type: 'MARK_AS_READ', payload: id });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to mark notification as read';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      dispatch({ type: 'MARK_ALL_AS_READ' });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to mark all notifications as read';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  return (
    <NotificationContext.Provider
      value={{
        ...state,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        clearError,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;

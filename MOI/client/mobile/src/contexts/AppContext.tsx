import React, { createContext, useContext, useState, useCallback } from 'react';
import { Alert } from 'react-native';

interface AppContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  showError: (message: string, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const showError = useCallback((message: string, title = 'Error') => {
    Alert.alert(title, message);
  }, []);

  const showSuccess = useCallback((message: string, title = 'Success') => {
    Alert.alert(title, message);
  }, []);

  return (
    <AppContext.Provider
      value={{
        isLoading,
        setLoading,
        showError,
        showSuccess,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}; 
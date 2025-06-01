import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/contexts/AppContext';
import LoadingOverlay from './src/components/LoadingOverlay';
import AppNavigator from './src/navigation/AppNavigator';
import { notificationService } from './src/services/notificationService';

const App = () => {
  useEffect(() => {
    notificationService.initialize();
  }, []);

  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer>
          <AppNavigator />
          <LoadingOverlay />
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
};

export default App; 
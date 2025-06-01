import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import AppNavigator from './navigation/AppNavigator';
import { theme } from './utils/theme';

const App = () => {
  return (
    <PaperProvider theme={theme}>
      <AuthProvider>
        <NotificationProvider>
          <NavigationContainer>
            <StatusBar 
              barStyle="dark-content" 
              backgroundColor={theme.colors.surface}
            />
            <AppNavigator />
          </NavigationContainer>
        </NotificationProvider>
      </AuthProvider>
    </PaperProvider>
  );
};

export default App;

import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#1976d2',
    secondary: '#dc004e',
    surface: '#ffffff',
    background: '#f5f5f5',
    error: '#ff3b30',
    success: '#34c759',
    warning: '#ff9500',
    info: '#007aff',
  },
  roundness: 8,
};

export const colors = theme.colors;

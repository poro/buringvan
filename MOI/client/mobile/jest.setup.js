import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('@react-native-firebase/messaging', () => {
  const AUTHORIZED = 1;
  const PROVISIONAL = 2;
  function messaging() {
    return {
      requestPermission: jest.fn(() => Promise.resolve(AUTHORIZED)),
      getToken: jest.fn(() => Promise.resolve('mock-token')),
      onMessage: jest.fn(),
      setBackgroundMessageHandler: jest.fn(),
      onNotificationOpenedApp: jest.fn(),
      getInitialNotification: jest.fn(() => Promise.resolve(null)),
      AuthorizationStatus: { AUTHORIZED, PROVISIONAL },
    };
  }
  messaging.AuthorizationStatus = { AUTHORIZED, PROVISIONAL };
  const exported = messaging;
  exported.AuthorizationStatus = { AUTHORIZED, PROVISIONAL };
  return {
    __esModule: true,
    default: exported,
    AuthorizationStatus: { AUTHORIZED, PROVISIONAL },
  };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Mock the navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
  };
});

// Silence the warning: Animated: `useNativeDriver` is not supported
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper'); 
# MOI Mobile App

React Native mobile application for the AI-Powered Social Media Management System.

## Features

- **Authentication**: Secure login and registration with JWT tokens
- **Dashboard**: Analytics and performance metrics with interactive charts
- **Content Management**: View, create, and manage social media content
- **Content Approval**: Review and approve AI-generated content with platform previews
- **Real-time Notifications**: Multi-channel notification system (push, email, SMS, in-app)
- **Profile Management**: User settings, preferences, and platform configurations
- **Cross-Platform**: Works on both iOS and Android devices

## Technology Stack

- **React Native**: Cross-platform mobile framework
- **React Navigation v6**: Navigation and routing
- **React Native Paper**: Material Design components
- **React Hook Form**: Form handling and validation
- **React Native Chart Kit**: Data visualization and charts
- **React Native Vector Icons**: Icon library
- **Context API**: State management for auth and notifications
- **TypeScript**: Type safety and better development experience

## Prerequisites

- Node.js (>= 16.x)
- React Native CLI
- Xcode (for iOS development)
- Android Studio (for Android development)
- Java Development Kit (JDK 11 or newer)

## Installation

1. **Navigate to the mobile app directory:**
   ```bash
   cd client/mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **iOS Setup (macOS only):**
   ```bash
   cd ios && pod install && cd ..
   ```

4. **Android Setup:**
   - Ensure Android Studio is installed
   - Set up Android SDK and emulator
   - Configure ANDROID_HOME environment variable

## Development

### Running on iOS

```bash
# Start Metro bundler
npm start

# Run on iOS simulator
npm run ios

# Run on specific iOS device
npm run ios -- --device "iPhone 14"
```

### Running on Android

```bash
# Start Metro bundler
npm start

# Run on Android emulator/device
npm run android

# Run on specific Android device
npm run android -- --deviceId DEVICE_ID
```

### Development Commands

```bash
# Start Metro bundler
npm start

# Reset Metro cache
npm run start -- --reset-cache

# Run tests
npm test

# Type checking
npm run type-check

# Lint code
npm run lint

# Format code
npm run format
```

## Configuration

### Environment Variables

Create a `.env` file in the mobile directory:

```env
API_BASE_URL=http://localhost:3000
WS_URL=ws://localhost:3000
ENVIRONMENT=development
```

### API Configuration

The app communicates with the backend services through the API gateway. Ensure the backend services are running before testing the mobile app.

## Project Structure

```
src/
├── components/          # Reusable UI components
│   └── PlatformPreview.tsx
├── contexts/           # React contexts for state management
│   ├── AuthContext.tsx
│   └── NotificationContext.tsx
├── navigation/         # Navigation configuration
│   ├── AppNavigator.tsx
│   ├── AuthNavigator.tsx
│   └── MainNavigator.tsx
├── screens/           # Screen components
│   ├── auth/          # Authentication screens
│   ├── main/          # Main app screens
│   ├── content/       # Content management screens
│   └── common/        # Common screens (loading, error)
├── services/          # API services and utilities
│   └── api.ts
├── utils/             # Utility functions and configurations
│   └── theme.ts
└── App.tsx           # Main app component
```

## Key Features

### Authentication Flow
- Secure login/registration with form validation
- JWT token management with automatic refresh
- Persistent authentication state

### Content Management
- List view of all content with filtering and search
- Detailed content view with platform-specific previews
- Approval workflow with platform previews
- Content creation and editing capabilities

### Analytics Dashboard
- Performance metrics with interactive charts
- Platform-specific analytics
- Real-time data updates

### Notifications
- Multi-channel notification support
- Real-time push notifications
- Notification preferences and settings
- In-app notification center

### Profile Management
- User profile editing
- Notification preferences
- Platform configurations
- App settings and logout

## Platform Previews

The app includes realistic previews for different social media platforms:

- **LinkedIn**: Professional post format with reactions
- **Twitter/X**: Tweet format with retweets and likes
- **Instagram**: Photo post with story-like interface
- **TikTok**: Video post with hashtags and engagement
- **YouTube Shorts**: Video thumbnail with metadata

## Testing

### Unit Tests
```bash
npm test
```

### E2E Tests
```bash
# Install Detox (if not already installed)
npm install -g detox-cli

# Build the app for testing
detox build

# Run E2E tests
detox test
```

## Building for Production

### iOS

1. **Open Xcode project:**
   ```bash
   open ios/MOIMobile.xcworkspace
   ```

2. **Configure signing and provisioning profiles**

3. **Build for release:**
   - Select "Generic iOS Device" as target
   - Product → Archive
   - Upload to App Store Connect

### Android

1. **Generate release APK:**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

2. **Generate signed APK:**
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

## Troubleshooting

### Common Issues

1. **Metro bundler issues:**
   ```bash
   npx react-native start --reset-cache
   ```

2. **iOS build issues:**
   ```bash
   cd ios && pod install && cd ..
   npx react-native run-ios --clean
   ```

3. **Android build issues:**
   ```bash
   cd android && ./gradlew clean && cd ..
   npx react-native run-android
   ```

4. **Package conflicts:**
   ```bash
   rm -rf node_modules
   npm install
   ```

### Debug Information

- **React Native Debugger**: Use for debugging React components and Redux state
- **Flipper**: Built-in debugging tool for React Native
- **Chrome DevTools**: For JavaScript debugging when running in development

## Contributing

1. Follow the existing code style and patterns
2. Write unit tests for new features
3. Update documentation as needed
4. Test on both iOS and Android platforms
5. Follow React Native and TypeScript best practices

## Performance Optimization

- **Images**: Use optimized images and lazy loading
- **Lists**: Implement FlatList with proper optimization props
- **Navigation**: Use lazy loading for screens
- **State**: Minimize unnecessary re-renders with useMemo and useCallback
- **Bundle**: Analyze and optimize bundle size

## Security Considerations

- **API Security**: All API calls use JWT authentication
- **Data Storage**: Sensitive data is stored securely using Keychain (iOS) and Keystore (Android)
- **Network**: HTTPS only in production
- **Permissions**: Request minimal required permissions
- **Code Obfuscation**: Enable ProGuard for Android release builds

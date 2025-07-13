# Video Analysis Mobile App

A React Native mobile application for real-time hockey game commentary and video analysis.

## Features

- Real-time comment capture with timestamps
- Rink location and game selection
- Offline data storage with sync capabilities
- Session management and history
- Beautiful, intuitive UI with Material Design

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development) or Android Studio (for Android development)

## Installation

1. **Install dependencies:**
   ```bash
   cd mobile-app
   npm install
   ```

2. **Install Expo Go on your device** (for testing on physical device):
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

## Development

1. **Start the development server:**
   ```bash
   npm start
   ```

2. **Run on specific platform:**
   ```bash
   # iOS
   npm run ios
   
   # Android
   npm run android
   
   # Web (for testing)
   npm run web
   ```

3. **Scan QR code** with Expo Go app to run on your device

## Project Structure

```
mobile-app/
├── src/
│   ├── components/          # Reusable UI components
│   │   └── TabBarIcon.tsx   # Navigation icons
│   ├── screens/             # App screens
│   │   ├── HomeScreen.tsx   # Main dashboard
│   │   ├── SessionScreen.tsx # Real-time comment capture
│   │   ├── CommentScreen.tsx # Individual comment input
│   │   ├── HistoryScreen.tsx # Session history
│   │   └── SettingsScreen.tsx # App settings
│   ├── stores/              # State management
│   │   └── sessionStore.ts  # Zustand store for sessions
│   ├── services/            # API and external services
│   ├── utils/               # Helper functions
│   └── types/               # TypeScript definitions
├── assets/                  # Images, fonts, etc.
├── App.tsx                  # Main app component
└── package.json
```

## Key Components

### HomeScreen
- Dashboard with active sessions
- Quick start for new sessions
- Recent session history
- Rink and team selection

### SessionScreen
- Real-time comment recording
- Timestamp capture
- Game time input
- Live session status

### SessionStore (Zustand)
- Persistent session storage
- Comment management
- Offline-first architecture
- Real-time state updates

## Configuration

### Environment Variables
Create a `.env` file in the mobile-app directory:

```env
API_BASE_URL=http://localhost:3001
EXPO_PUBLIC_API_URL=http://localhost:3001
```

### API Integration
The app communicates with the backend processor via REST API and WebSocket connections for real-time updates.

## Building for Production

1. **Configure app.json** with your app details
2. **Build for specific platform:**
   ```bash
   # iOS
   expo build:ios
   
   # Android
   expo build:android
   ```

3. **Submit to app stores:**
   ```bash
   expo submit:ios
   expo submit:android
   ```

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- HomeScreen.test.tsx
```

## Troubleshooting

### Common Issues

1. **Metro bundler issues:**
   ```bash
   npx expo start --clear
   ```

2. **iOS build issues:**
   ```bash
   cd ios && pod install && cd ..
   ```

3. **Android build issues:**
   - Ensure Android SDK is properly configured
   - Check ANDROID_HOME environment variable

### Debug Mode
- Shake device or press Cmd+D (iOS) / Cmd+M (Android) in simulator
- Enable remote debugging for better debugging experience

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation as needed
4. Use TypeScript for all new code

## License

This project is licensed under the MIT License. 
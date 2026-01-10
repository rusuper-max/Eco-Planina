# EcoLogistics - Waste Management Logistics App

A React Native (Expo) mobile application for smart waste management logistics. The app provides two distinct views for waste generators (clients) and logistics managers (owners).

## Features

### Welcome Screen
- 3 onboarding slides showcasing:
  - Containers & Boxes (Kontejneri i Kutije)
  - Glass Bottles (Staklene Flase)
  - Stretch Film & Nylon (Stretch Folija i Najlon)

### Client View (Waste Generator)
- Request waste pickup with:
  - **Container Type**: Container 5m3, Press, Cage, Barrel
  - **Waste Type**: Cardboard, Plastic, Metal, Glass, Stretch Film/Nylon
  - **Fill Level**: 50%, 80%, 100%
  - **Importance Level**: Low, Medium, High, Critical
  - **Additional Notes**

### Owner View (Logistics Manager)
- Full-screen map with pickup request markers
- Color-coded markers based on urgency:
  - Green: Low priority
  - Yellow: Medium priority
  - Orange: High priority
  - Red: Critical/100% full
- Interactive callouts showing request details
- Bottom sheet with active requests list
- Mark requests as completed

## Tech Stack

- **React Native** with **Expo SDK**
- **React Navigation** (Stack Navigator)
- **react-native-maps** for map interface
- **React Hooks** (useState, useContext) for state management
- **StyleSheet** for modern, clean styling

## Color Palette

- Primary: Emerald Green (#10B981)
- White (#FFFFFF)
- Dark Gray (#1F2937)

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (for testing)

### Installation

1. Clone or navigate to the project:
```bash
cd EcoLogistics
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npx expo start
```

4. Scan the QR code with:
   - **iOS**: Camera app or Expo Go
   - **Android**: Expo Go app

### Running on Simulators

```bash
# iOS Simulator
npx expo start --ios

# Android Emulator
npx expo start --android
```

## Google Maps Setup (Optional)

For full Google Maps functionality on Android, add your API key in `app.json`:

```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_ANDROID_GOOGLE_MAPS_API_KEY"
    }
  }
}
```

For iOS:
```json
"ios": {
  "config": {
    "googleMapsApiKey": "YOUR_IOS_GOOGLE_MAPS_API_KEY"
  }
}
```

**Note**: On iOS, the app uses Apple Maps by default which doesn't require an API key.

## Project Structure

```
EcoLogistics/
├── App.js                          # Main app entry with navigation
├── app.json                        # Expo configuration
├── src/
│   ├── context/
│   │   └── AppContext.js           # Global state management
│   └── screens/
│       ├── WelcomeScreen.js        # Onboarding slides
│       ├── HomeScreen.js           # Role selection
│       ├── ClientViewScreen.js     # Pickup request form
│       └── OwnerViewScreen.js      # Map & requests management
└── assets/                         # Images and icons
```

## Building for Production

### Android APK
```bash
npx expo build:android -t apk
```

### iOS IPA
```bash
npx expo build:ios -t archive
```

### Using EAS Build (Recommended)
```bash
npm install -g eas-cli
eas build --platform all
```

## Demo Mode

The app includes a role switcher on the home screen to easily demo both views:
- **Client View**: Submit pickup requests
- **Owner View**: View and manage all requests on map

Initial mock data is pre-populated for demonstration purposes.

## Bilingual Support

The app includes both English and Serbian (Srpski) text throughout the interface.

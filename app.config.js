/**
 * Expo App Configuration
 * Uses environment variables for sensitive data
 */
import 'dotenv/config';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyDND-OkRxWmKkNuoZ6hdFgkQ5crVhyXpX0';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vmsfsstxxndpxbsdylog.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_IvJ2RkPfu_4HC2qffHi4bA_118ZZatm';

export default {
  expo: {
    name: "Eco Planina",
    slug: "EcoPlanina",
    version: "1.0.0",
    orientation: "default",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#10B981"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.ecoplanina.app",
      config: {
        googleMapsApiKey: GOOGLE_MAPS_API_KEY
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "EcoLogistics needs your location to show nearby pickup requests on the map.",
        ITSAppUsesNonExemptEncryption: false,
        UIBackgroundModes: ["remote-notification"]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#10B981"
      },
      edgeToEdgeEnabled: true,
      package: "com.ecoplanina.app",
      config: {
        googleMaps: {
          apiKey: GOOGLE_MAPS_API_KEY
        }
      },
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_LOCATION"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-location",
        {
          locationWhenInUsePermission: "EcoLogistics koristi vašu lokaciju da prikaže zahteve na mapi.",
          locationAlwaysAndWhenInUsePermission: "EcoLogistics koristi vašu lokaciju u pozadini da menadžeri mogu pratiti vozače.",
          locationAlwaysPermission: "EcoLogistics koristi vašu lokaciju u pozadini da menadžeri mogu pratiti vozače.",
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#10B981",
          sounds: []
        }
      ],
      "@react-native-community/datetimepicker"
    ],
    extra: {
      eas: {
        projectId: "f7ec23e5-6fd1-44a2-9273-6e241959e906"
      },
      googleMapsApiKey: GOOGLE_MAPS_API_KEY,
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY
    },
    updates: {
      enabled: true,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 0,
      url: "https://u.expo.dev/f7ec23e5-6fd1-44a2-9273-6e241959e906"
    },
    runtimeVersion: {
      policy: "appVersion"
    }
  }
};

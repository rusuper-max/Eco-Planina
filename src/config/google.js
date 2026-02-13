/**
 * Google API Configuration
 * Reads from Expo Constants (set via app.config.js)
 */
import Constants from 'expo-constants';

export const GOOGLE_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey ||
                              process.env.GOOGLE_MAPS_API_KEY ||
                              '';

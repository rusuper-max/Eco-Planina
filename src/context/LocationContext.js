import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { AppState, Platform } from 'react-native';
import { supabase } from '../config/supabase';

const LocationContext = createContext(null);

// Update interval in milliseconds (30 seconds)
const UPDATE_INTERVAL = 30000;

// Minimum distance change to trigger update (meters)
const DISTANCE_THRESHOLD = 50;

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(null);

  const locationSubscription = useRef(null);
  const updateIntervalRef = useRef(null);
  const lastUploadedLocation = useRef(null);
  const appState = useRef(AppState.currentState);

  // Request location permissions
  const requestPermissions = useCallback(async () => {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(foregroundStatus);

      if (foregroundStatus !== 'granted') {
        setErrorMsg('Dozvola za lokaciju nije odobrena');
        return false;
      }

      // Request background permission on Android
      if (Platform.OS === 'android') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          console.log('[Location] Background permission not granted');
        }
      }

      return true;
    } catch (error) {
      console.error('[Location] Permission error:', error);
      setErrorMsg('Greška pri traženju dozvole za lokaciju');
      return false;
    }
  }, []);

  // Get current location once
  const getCurrentLocation = useCallback(async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation(currentLocation);
      return currentLocation;
    } catch (error) {
      console.error('[Location] Error getting current location:', error);
      setErrorMsg('Greška pri dobijanju lokacije');
      return null;
    }
  }, [requestPermissions]);

  // Upload location to Supabase
  const uploadLocation = useCallback(async (locationData, userId) => {
    if (!locationData || !userId) return;

    try {
      // Get battery info
      let batteryLevel = null;
      let isCharging = false;

      try {
        batteryLevel = await Battery.getBatteryLevelAsync();
        batteryLevel = Math.round(batteryLevel * 100);
        const batteryState = await Battery.getBatteryStateAsync();
        isCharging = batteryState === Battery.BatteryState.CHARGING;
      } catch (e) {
        // Battery API might not be available on all devices
        console.log('[Location] Battery info not available');
      }

      // Check if location changed significantly
      if (lastUploadedLocation.current) {
        const distance = calculateDistance(
          lastUploadedLocation.current.latitude,
          lastUploadedLocation.current.longitude,
          locationData.coords.latitude,
          locationData.coords.longitude
        );

        if (distance < DISTANCE_THRESHOLD) {
          console.log('[Location] Location unchanged, skipping upload');
          return;
        }
      }

      // Call RPC function to update location
      const { data, error } = await supabase.rpc('update_driver_location', {
        p_driver_id: userId,
        p_latitude: locationData.coords.latitude,
        p_longitude: locationData.coords.longitude,
        p_accuracy: locationData.coords.accuracy,
        p_heading: locationData.coords.heading,
        p_speed: locationData.coords.speed,
        p_altitude: locationData.coords.altitude,
        p_battery_level: batteryLevel,
        p_is_charging: isCharging,
      });

      if (error) {
        console.error('[Location] Upload error:', error);
        return;
      }

      lastUploadedLocation.current = {
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
      };

      console.log('[Location] Location uploaded successfully');
    } catch (error) {
      console.error('[Location] Upload error:', error);
    }
  }, []);

  // Start continuous location tracking
  const startTracking = useCallback(async (userId) => {
    console.log('[Location] startTracking called for user:', userId);

    if (isTracking) {
      console.log('[Location] Already tracking, skipping');
      return;
    }

    try {
      console.log('[Location] Requesting permissions...');
      const hasPermission = await requestPermissions();
      console.log('[Location] Permission result:', hasPermission);

      if (!hasPermission) {
        console.log('[Location] No permission, cannot start tracking');
        return;
      }

      console.log('[Location] Starting location tracking...');

      // Start watching location
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: UPDATE_INTERVAL,
          distanceInterval: DISTANCE_THRESHOLD,
        },
        (newLocation) => {
          setLocation(newLocation);
          uploadLocation(newLocation, userId);
        }
      );

      // Also set up periodic upload as backup
      updateIntervalRef.current = setInterval(async () => {
        if (location) {
          uploadLocation(location, userId);
        }
      }, UPDATE_INTERVAL);

      setIsTracking(true);
      console.log('[Location] Tracking started');
    } catch (error) {
      console.error('[Location] Error starting tracking:', error);
      setErrorMsg('Greška pri pokretanju praćenja lokacije');
    }
  }, [isTracking, location, requestPermissions, uploadLocation]);

  // Stop location tracking
  const stopTracking = useCallback(() => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    setIsTracking(false);
    lastUploadedLocation.current = null;
    console.log('[Location] Tracking stopped');
  }, []);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground
        console.log('[Location] App came to foreground');
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  const value = {
    // State
    location,
    errorMsg,
    isTracking,
    permissionStatus,

    // Actions
    requestPermissions,
    getCurrentLocation,
    startTracking,
    stopTracking,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export default LocationContext;

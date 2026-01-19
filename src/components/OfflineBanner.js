import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOffline } from '../context/OfflineContext';

const OfflineBanner = () => {
  const { isOnline, isConnected, queueLength, isSyncing, manualSync } = useOffline();
  const insets = useSafeAreaInsets();
  const bannerHeight = 44 + insets.top;
  const slideAnim = useRef(new Animated.Value(-bannerHeight)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Animate banner in/out based on online status
  useEffect(() => {
    if (!isOnline || queueLength > 0) {
      // Show banner
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Hide banner
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -60,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOnline, queueLength]);

  // Don't render if online and no queued items
  if (isOnline && queueLength === 0) {
    return null;
  }

  const handleSync = async () => {
    if (isOnline && !isSyncing) {
      await manualSync();
    }
  };

  // Determine banner color and message
  const getBannerStyle = () => {
    if (!isConnected) {
      return { bg: styles.bgRed, icon: 'cloud-offline', message: 'Nema internet konekcije' };
    }
    if (!isOnline) {
      return { bg: styles.bgOrange, icon: 'cloud-offline', message: 'Ograničena konekcija' };
    }
    if (queueLength > 0) {
      return { bg: styles.bgYellow, icon: 'time-outline', message: `${queueLength} akcija čeka sinhronizaciju` };
    }
    return { bg: styles.bgGreen, icon: 'checkmark-circle', message: 'Online' };
  };

  const { bg, icon, message } = getBannerStyle();

  return (
    <Animated.View
      style={[
        styles.container,
        bg,
        {
          paddingTop: insets.top + 10,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name={icon} size={20} color="#fff" />
        <Text style={styles.text}>{message}</Text>
      </View>

      {isOnline && queueLength > 0 && (
        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="sync" size={16} color="#fff" />
              <Text style={styles.syncText}>Sync</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    zIndex: 1000,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  syncText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  bgRed: {
    backgroundColor: '#EF4444',
  },
  bgOrange: {
    backgroundColor: '#F97316',
  },
  bgYellow: {
    backgroundColor: '#F59E0B',
  },
  bgGreen: {
    backgroundColor: '#10B981',
  },
});

export default OfflineBanner;

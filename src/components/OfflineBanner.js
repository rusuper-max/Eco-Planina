import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useOffline } from '../context/OfflineContext';

const OfflineBanner = () => {
  const { isOnline, isSyncing, queueLength } = useOffline();

  if (isOnline && !isSyncing && queueLength === 0) {
    return null;
  }

  if (!isOnline) {
    return (
      <View style={styles.banner}>
        <Text style={styles.text}>Nema internet konekcije - Offline režim</Text>
        {queueLength > 0 && (
          <Text style={styles.subText}>{queueLength} akcija čeka sinhronizaciju</Text>
        )}
      </View>
    );
  }

  if (isSyncing) {
    return (
      <View style={[styles.banner, styles.syncingBanner]}>
        <Text style={styles.text}>Sinhronizacija u toku...</Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  syncingBanner: {
    backgroundColor: '#F59E0B',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  subText: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 2,
    opacity: 0.9,
  },
});

export default OfflineBanner;

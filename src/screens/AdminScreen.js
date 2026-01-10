import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';

const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',
  white: '#FFFFFF',
  darkGray: '#1F2937',
  lightGray: '#F3F4F6',
  mediumGray: '#6B7280',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  purple: '#7C3AED',
  purpleLight: '#EDE9FE',
  orange: '#F59E0B',
  orangeLight: '#FEF3C7',
  red: '#EF4444',
};

const AdminScreen = ({ navigation }) => {
  const { user, getAdminStats, isGod, logout } = useAppContext();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStats();
  }, []);

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>Ucitavanje...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.purple]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>{isGod() ? '👑' : '🛡️'}</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>Admin Panel</Text>
              <Text style={styles.headerSubtitle}>{user?.name}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>Odjava</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        {stats && (
          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: COLORS.blueLight }]}
              onPress={() => navigation.navigate('AdminUsers')}
            >
              <Text style={styles.statIcon}>👥</Text>
              <Text style={[styles.statValue, { color: COLORS.blue }]}>{stats.totalUsers}</Text>
              <Text style={styles.statLabel}>Korisnika</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: COLORS.orangeLight }]}
              onPress={() => navigation.navigate('AdminCompanies')}
            >
              <Text style={styles.statIcon}>🏢</Text>
              <Text style={[styles.statValue, { color: COLORS.orange }]}>{stats.totalCompanies}</Text>
              <Text style={styles.statLabel}>Firmi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: COLORS.purpleLight }]}
              onPress={() => navigation.navigate('AdminCodes')}
            >
              <Text style={styles.statIcon}>🔑</Text>
              <Text style={[styles.statValue, { color: COLORS.purple }]}>{stats.totalCodes}</Text>
              <Text style={styles.statLabel}>Kodova</Text>
            </TouchableOpacity>

            <View style={[styles.statCard, { backgroundColor: COLORS.primaryLight }]}>
              <Text style={styles.statIcon}>✅</Text>
              <Text style={[styles.statValue, { color: COLORS.primary }]}>{stats.availableCodes}</Text>
              <Text style={styles.statLabel}>Slobodnih</Text>
            </View>
          </View>
        )}

        {/* User Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Pregled korisnika</Text>
          <View style={styles.breakdownList}>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownIcon, { backgroundColor: COLORS.purpleLight }]}>
                <Text>🛡️</Text>
              </View>
              <Text style={styles.breakdownLabel}>Administratora</Text>
              <Text style={styles.breakdownValue}>{stats?.totalAdmins || 0}</Text>
            </View>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownIcon, { backgroundColor: COLORS.blueLight }]}>
                <Text>📊</Text>
              </View>
              <Text style={styles.breakdownLabel}>Menadzera</Text>
              <Text style={styles.breakdownValue}>{stats?.totalManagers || 0}</Text>
            </View>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Text>🏢</Text>
              </View>
              <Text style={styles.breakdownLabel}>Klijenata</Text>
              <Text style={styles.breakdownValue}>{stats?.totalClients || 0}</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Brze akcije</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('AdminCodes')}
            >
              <Text style={styles.actionIcon}>🔑</Text>
              <Text style={styles.actionText}>Generiši Master Code</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('AdminUsers')}
            >
              <Text style={styles.actionIcon}>👥</Text>
              <Text style={styles.actionText}>Pregledaj korisnike</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('AdminCompanies')}
            >
              <Text style={styles.actionIcon}>🏢</Text>
              <Text style={styles.actionText}>Pregledaj firme</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.mediumGray,
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminBadge: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: COLORS.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBadgeText: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.mediumGray,
  },
  logoutBtn: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.red,
  },
  logoutBtnText: {
    color: COLORS.red,
    fontWeight: '600',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.mediumGray,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 16,
  },
  breakdownList: {
    gap: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 15,
    color: COLORS.darkGray,
  },
  breakdownValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  actionsGrid: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.darkGray,
  },
});

export default AdminScreen;

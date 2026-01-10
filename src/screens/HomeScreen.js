import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
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
  orange: '#F59E0B',
  orangeLight: '#FEF3C7',
};

const HomeScreen = ({ navigation }) => {
  const { setUserRole, pickupRequests } = useAppContext();

  const handleRoleSelect = (role) => {
    setUserRole(role);
    if (role === 'client') {
      navigation.navigate('ClientView');
    } else {
      navigation.navigate('OwnerView');
    }
  };

  const pendingRequests = pickupRequests.filter((r) => r.status === 'pending').length;
  const urgentRequests = pickupRequests.filter(
    (r) => r.status === 'pending' && r.fillLevel === 100
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>♻️</Text>
          <View>
            <Text style={styles.logoText}>EcoLogistics</Text>
            <Text style={styles.tagline}>Smart Waste Management</Text>
          </View>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: COLORS.primaryLight }]}>
          <Text style={styles.statNumber}>{pendingRequests}</Text>
          <Text style={styles.statLabel}>Active Requests</Text>
          <Text style={styles.statLabelSr}>Aktivnih zahteva</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.orangeLight }]}>
          <Text style={[styles.statNumber, { color: COLORS.orange }]}>{urgentRequests}</Text>
          <Text style={styles.statLabel}>Urgent</Text>
          <Text style={styles.statLabelSr}>Hitno</Text>
        </View>
      </View>

      {/* Role Selection */}
      <View style={styles.roleSection}>
        <Text style={styles.sectionTitle}>Select Your Role</Text>
        <Text style={styles.sectionSubtitle}>Izaberite vašu ulogu</Text>

        {/* Client Role Card */}
        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => handleRoleSelect('client')}
          activeOpacity={0.8}
        >
          <View style={styles.roleIconContainer}>
            <Text style={styles.roleIcon}>🏢</Text>
          </View>
          <View style={styles.roleTextContainer}>
            <Text style={styles.roleTitle}>Client View</Text>
            <Text style={styles.roleTitleSr}>Klijent</Text>
            <Text style={styles.roleDescription}>
              Request waste pickups, track container status
            </Text>
            <Text style={styles.roleDescriptionSr}>
              Zahtevaj preuzimanje otpada, prati status kontejnera
            </Text>
          </View>
          <Text style={styles.roleArrow}>→</Text>
        </TouchableOpacity>

        {/* Owner Role Card */}
        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => handleRoleSelect('owner')}
          activeOpacity={0.8}
        >
          <View style={[styles.roleIconContainer, { backgroundColor: COLORS.blueLight }]}>
            <Text style={styles.roleIcon}>🗺️</Text>
          </View>
          <View style={styles.roleTextContainer}>
            <Text style={styles.roleTitle}>Owner View</Text>
            <Text style={styles.roleTitleSr}>Menadžer Logistike</Text>
            <Text style={styles.roleDescription}>
              View all requests on map, manage pickups
            </Text>
            <Text style={styles.roleDescriptionSr}>
              Pregledaj sve zahteve na mapi, upravljaj preuzimanjima
            </Text>
          </View>
          <Text style={styles.roleArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Info */}
      <View style={styles.bottomInfo}>
        <Text style={styles.bottomText}>
          Demo Mode - Switch between roles anytime
        </Text>
        <Text style={styles.bottomTextSr}>
          Demo režim - Menjajte uloge u bilo kom trenutku
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  logoText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.darkGray,
    fontWeight: '600',
    marginTop: 5,
  },
  statLabelSr: {
    fontSize: 12,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  roleSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: COLORS.mediumGray,
    marginBottom: 20,
  },
  roleCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  roleIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  roleIcon: {
    fontSize: 30,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  roleTitleSr: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 5,
  },
  roleDescription: {
    fontSize: 13,
    color: COLORS.mediumGray,
    lineHeight: 18,
  },
  roleDescriptionSr: {
    fontSize: 12,
    color: COLORS.mediumGray,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  roleArrow: {
    fontSize: 24,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  bottomInfo: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  bottomText: {
    fontSize: 14,
    color: COLORS.mediumGray,
    textAlign: 'center',
  },
  bottomTextSr: {
    fontSize: 12,
    color: COLORS.mediumGray,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
});

export default HomeScreen;

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput,
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

const AdminUsersScreen = ({ navigation }) => {
  const { fetchAllUsers, promoteToAdmin, demoteFromAdmin, deleteUser, isGod, loginAsUser } = useAppContext();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filterRole, setFilterRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleting, setDeleting] = useState(false);

  const loadUsers = async () => {
    try {
      const filters = {};
      if (filterRole) filters.role = filterRole;
      const data = await fetchAllUsers(filters);
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [filterRole]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUsers();
  }, [filterRole]);

  const handlePromote = async () => {
    try {
      await promoteToAdmin(selectedUser.id);
      Alert.alert('Uspeh', 'Korisnik je promovisan u admina');
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      Alert.alert('Greska', error.message);
    }
  };

  const handleDemote = async () => {
    try {
      await demoteFromAdmin(selectedUser.id);
      Alert.alert('Uspeh', 'Admin status je uklonjen');
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      Alert.alert('Greska', error.message);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    Alert.alert(
      'Potvrda brisanja',
      `Da li ste SIGURNI da zelite da obrisete korisnika "${selectedUser.name}"?\n\nOva akcija je NEPOVRATNA!`,
      [
        { text: 'Otkazi', style: 'cancel' },
        {
          text: 'Obrisi',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteUser(selectedUser.id);
              Alert.alert('Uspeh', 'Korisnik je uspesno obrisan');
              setSelectedUser(null);
              loadUsers();
            } catch (error) {
              Alert.alert('Greska', error.message);
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  const handleLoginAsUser = async () => {
    if (!selectedUser) return;

    Alert.alert(
      'Potvrda',
      `Da li zelite da se ulogujete kao "${selectedUser.name}"?\n\nBicete prebaceni na njihov nalog.`,
      [
        { text: 'Otkazi', style: 'cancel' },
        {
          text: 'Uloguj se',
          onPress: async () => {
            try {
              await loginAsUser(selectedUser);
              setSelectedUser(null);
              // Navigation will be handled automatically by App.js based on role
            } catch (error) {
              Alert.alert('Greska', error.message);
            }
          }
        }
      ]
    );
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'god':
        return { label: 'GOD', bg: COLORS.orangeLight, color: COLORS.orange, icon: '👑' };
      case 'admin':
        return { label: 'Admin', bg: COLORS.purpleLight, color: COLORS.purple, icon: '🛡️' };
      case 'manager':
        return { label: 'Menadzer', bg: COLORS.blueLight, color: COLORS.blue, icon: '📊' };
      default:
        return { label: 'Klijent', bg: COLORS.primaryLight, color: COLORS.primary, icon: '🏢' };
    }
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    return u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           u.phone?.includes(searchQuery);
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.purple} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Nazad</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Korisnici</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Pretrazi po imenu ili telefonu..."
          placeholderTextColor={COLORS.mediumGray}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        <View style={styles.filterContent}>
          {[
            { value: '', label: 'Svi' },
            { value: 'god', label: 'GOD' },
            { value: 'admin', label: 'Admin' },
            { value: 'manager', label: 'Menadzer' },
            { value: 'client', label: 'Klijent' },
          ].map(filter => (
            <TouchableOpacity
              key={filter.value}
              style={[styles.filterPill, filterRole === filter.value && styles.filterPillActive]}
              onPress={() => setFilterRole(filter.value)}
            >
              <Text style={[styles.filterPillText, filterRole === filter.value && styles.filterPillTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Users List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.purple]} />
        }
      >
        <Text style={styles.countText}>{filteredUsers.length} korisnika</Text>

        {filteredUsers.map(user => {
          const badge = getRoleBadge(user.role);
          return (
            <TouchableOpacity
              key={user.id}
              style={styles.userCard}
              onPress={() => isGod() && user.role !== 'god' ? setSelectedUser(user) : null}
              activeOpacity={isGod() && user.role !== 'god' ? 0.7 : 1}
            >
              <View style={[styles.userAvatar, { backgroundColor: badge.bg }]}>
                <Text style={styles.avatarText}>{badge.icon}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userPhone}>{user.phone}</Text>
                {user.company_code && (
                  <Text style={styles.userCompany}>Firma: {user.company_code}</Text>
                )}
              </View>
              <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.roleBadgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* User Action Modal */}
      <Modal visible={!!selectedUser} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedUser && (
              <>
                <Text style={styles.modalTitle}>Upravljanje korisnikom</Text>

                <View style={styles.modalUserInfo}>
                  <Text style={styles.modalUserName}>{selectedUser.name}</Text>
                  <Text style={styles.modalUserPhone}>{selectedUser.phone}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleBadge(selectedUser.role).bg, marginTop: 8 }]}>
                    <Text style={[styles.roleBadgeText, { color: getRoleBadge(selectedUser.role).color }]}>
                      {getRoleBadge(selectedUser.role).label}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  {/* Login as user button - for managers and clients */}
                  {(selectedUser.role === 'manager' || selectedUser.role === 'client') && (
                    <TouchableOpacity style={styles.loginAsBtn} onPress={handleLoginAsUser}>
                      <Text style={styles.loginAsBtnText}>🔑 Uloguj se kao ovaj korisnik</Text>
                    </TouchableOpacity>
                  )}

                  {selectedUser.role === 'admin' ? (
                    <TouchableOpacity style={styles.demoteBtn} onPress={handleDemote}>
                      <Text style={styles.demoteBtnText}>Ukloni Admin status</Text>
                    </TouchableOpacity>
                  ) : selectedUser.role === 'manager' ? (
                    <TouchableOpacity style={styles.promoteBtn} onPress={handlePromote}>
                      <Text style={styles.promoteBtnText}>Promovisi u Admina</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.noActionText}>
                      Samo menadžeri mogu biti promovisani u admine
                    </Text>
                  )}

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={handleDeleteUser}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={styles.deleteBtnText}>🗑️ Obrisi korisnika</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedUser(null)}>
                    <Text style={styles.closeBtnText}>Zatvori</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backBtn: {
    padding: 8,
  },
  backBtnText: {
    color: COLORS.purple,
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.darkGray,
  },
  filterRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
    maxHeight: 50,
  },
  filterContent: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  filterPillActive: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purple,
  },
  filterPillText: {
    fontSize: 13,
    color: COLORS.mediumGray,
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: COLORS.white,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
  },
  countText: {
    fontSize: 13,
    color: COLORS.mediumGray,
    marginBottom: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  userPhone: {
    fontSize: 13,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  userCompany: {
    fontSize: 12,
    color: COLORS.blue,
    marginTop: 4,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalUserInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalUserName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  modalUserPhone: {
    fontSize: 14,
    color: COLORS.mediumGray,
    marginTop: 4,
  },
  modalActions: {
    gap: 12,
  },
  loginAsBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  loginAsBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  promoteBtn: {
    backgroundColor: COLORS.purple,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  promoteBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  demoteBtn: {
    backgroundColor: COLORS.orange,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  demoteBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  deleteBtn: {
    backgroundColor: COLORS.red,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  noActionText: {
    textAlign: 'center',
    color: COLORS.mediumGray,
    fontSize: 14,
    paddingVertical: 12,
  },
  closeBtn: {
    backgroundColor: COLORS.lightGray,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: COLORS.mediumGray,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default AdminUsersScreen;

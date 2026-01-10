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
  TextInput,
  Alert,
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
  redLight: '#FEE2E2',
};

const AdminCompaniesScreen = ({ navigation }) => {
  const { fetchAllCompanies, deleteCompany, isGod } = useAppContext();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleting, setDeleting] = useState(false);

  const loadCompanies = async () => {
    try {
      const data = await fetchAllCompanies();
      setCompanies(data);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCompanies();
  }, []);

  const handleDeleteCompany = async () => {
    if (!selectedCompany) return;

    Alert.alert(
      'Potvrda brisanja',
      `Da li ste SIGURNI da zelite da obrisete firmu "${selectedCompany.name}"?\n\nSvi korisnici ove firme ce takodje biti obrisani!\n\nOva akcija je NEPOVRATNA!`,
      [
        { text: 'Otkazi', style: 'cancel' },
        {
          text: 'Obrisi',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteCompany(selectedCompany.code);
              Alert.alert('Uspeh', 'Firma je uspesno obrisana');
              setSelectedCompany(null);
              loadCompanies();
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

  const filteredCompanies = companies.filter(c => {
    if (!searchQuery) return true;
    return c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           c.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           c.pib?.includes(searchQuery);
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
        <Text style={styles.headerTitle}>Firme</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Pretrazi po imenu, kodu ili PIB-u..."
          placeholderTextColor={COLORS.mediumGray}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>{filteredCompanies.length} firmi</Text>
      </View>

      {/* Companies List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.purple]} />
        }
      >
        {filteredCompanies.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏢</Text>
            <Text style={styles.emptyTitle}>Nema firmi</Text>
            <Text style={styles.emptyText}>Nema registrovanih firmi</Text>
          </View>
        ) : (
          filteredCompanies.map(company => (
            <TouchableOpacity
              key={company.id}
              style={styles.companyCard}
              onPress={() => setSelectedCompany(company)}
            >
              <View style={styles.companyIcon}>
                <Text style={styles.companyIconText}>🏢</Text>
              </View>
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{company.name}</Text>
                <Text style={styles.companyCode}>{company.code}</Text>
                {company.pib && (
                  <Text style={styles.companyPib}>PIB: {company.pib}</Text>
                )}
              </View>
              <View style={styles.companyStats}>
                <View style={styles.companyStat}>
                  <Text style={styles.companyStatValue}>{company.managerCount || 0}</Text>
                  <Text style={styles.companyStatLabel}>Menadz.</Text>
                </View>
                <View style={styles.companyStat}>
                  <Text style={styles.companyStatValue}>{company.clientCount || 0}</Text>
                  <Text style={styles.companyStatLabel}>Klijenata</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Company Detail Modal */}
      <Modal visible={!!selectedCompany} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedCompany && (
              <>
                <Text style={styles.modalTitle}>{selectedCompany.name}</Text>

                <View style={styles.detailGroup}>
                  <Text style={styles.detailLabel}>Kod firme</Text>
                  <View style={styles.codeContainer}>
                    <Text style={styles.codeText}>{selectedCompany.code}</Text>
                  </View>
                </View>

                {selectedCompany.pib && (
                  <View style={styles.detailGroup}>
                    <Text style={styles.detailLabel}>PIB</Text>
                    <Text style={styles.detailValue}>{selectedCompany.pib}</Text>
                  </View>
                )}

                <View style={styles.detailGroup}>
                  <Text style={styles.detailLabel}>Statistika</Text>
                  <View style={styles.modalStats}>
                    <View style={styles.modalStat}>
                      <Text style={styles.modalStatIcon}>📊</Text>
                      <Text style={styles.modalStatValue}>{selectedCompany.managerCount || 0}</Text>
                      <Text style={styles.modalStatLabel}>menadzera</Text>
                    </View>
                    <View style={styles.modalStat}>
                      <Text style={styles.modalStatIcon}>🏢</Text>
                      <Text style={styles.modalStatValue}>{selectedCompany.clientCount || 0}</Text>
                      <Text style={styles.modalStatLabel}>klijenata</Text>
                    </View>
                  </View>
                </View>

                {selectedCompany.equipment_types?.length > 0 && (
                  <View style={styles.detailGroup}>
                    <Text style={styles.detailLabel}>Tipovi opreme</Text>
                    <View style={styles.equipmentTags}>
                      {selectedCompany.equipment_types.map((eq, i) => (
                        <View key={i} style={styles.equipmentTag}>
                          <Text style={styles.equipmentTagText}>{eq}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {isGod() && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={handleDeleteCompany}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={styles.deleteBtnText}>🗑️ Obrisi firmu</Text>
                    )}
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedCompany(null)}>
                  <Text style={styles.closeBtnText}>Zatvori</Text>
                </TouchableOpacity>
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
  statsContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  statsText: {
    fontSize: 13,
    color: COLORS.mediumGray,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.mediumGray,
  },
  companyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  companyIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyIconText: {
    fontSize: 24,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  companyCode: {
    fontSize: 13,
    color: COLORS.purple,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  companyPib: {
    fontSize: 12,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  companyStats: {
    flexDirection: 'row',
    gap: 12,
  },
  companyStat: {
    alignItems: 'center',
  },
  companyStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  companyStatLabel: {
    fontSize: 10,
    color: COLORS.mediumGray,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    marginBottom: 24,
    textAlign: 'center',
  },
  detailGroup: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.mediumGray,
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
    color: COLORS.darkGray,
  },
  codeContainer: {
    backgroundColor: COLORS.purpleLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  codeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.purple,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  modalStats: {
    flexDirection: 'row',
    gap: 24,
  },
  modalStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalStatIcon: {
    fontSize: 18,
  },
  modalStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  modalStatLabel: {
    fontSize: 14,
    color: COLORS.mediumGray,
  },
  equipmentTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  equipmentTag: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  equipmentTagText: {
    fontSize: 13,
    color: COLORS.primaryDark,
    fontWeight: '500',
  },
  deleteBtn: {
    backgroundColor: COLORS.red,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  deleteBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  closeBtn: {
    backgroundColor: COLORS.lightGray,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  closeBtnText: {
    color: COLORS.mediumGray,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default AdminCompaniesScreen;

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
  Clipboard,
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
  red: '#EF4444',
  redLight: '#FEE2E2',
};

const AdminCodesScreen = ({ navigation }) => {
  const { fetchAllMasterCodes, generateMasterCode } = useAppContext();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newCodeNote, setNewCodeNote] = useState('');
  const [generating, setGenerating] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const loadCodes = async () => {
    try {
      const data = await fetchAllMasterCodes();
      setCodes(data);
    } catch (error) {
      console.error('Error loading codes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCodes();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCodes();
  }, []);

  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      const newCode = await generateMasterCode(newCodeNote);
      Alert.alert(
        'Kod generisan',
        `Novi Master Code:\n\n${newCode.code}\n\nKopirajte ga i prosledite firmi.`,
        [
          { text: 'Kopiraj', onPress: () => Clipboard.setString(newCode.code) },
          { text: 'OK' }
        ]
      );
      setShowModal(false);
      setNewCodeNote('');
      loadCodes();
    } catch (error) {
      Alert.alert('Greska', error.message);
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = (code) => {
    Clipboard.setString(code);
    Alert.alert('Kopirano', 'Kod je kopiran u clipboard');
  };

  const filteredCodes = codes.filter(c => {
    if (!filterStatus) return true;
    return c.status === filterStatus;
  });

  const availableCount = codes.filter(c => c.status === 'available').length;
  const usedCount = codes.filter(c => c.status === 'used').length;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

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
        <Text style={styles.headerTitle}>Master Kodovi</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ Novi</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <TouchableOpacity
          style={[styles.statPill, !filterStatus && styles.statPillActive]}
          onPress={() => setFilterStatus('')}
        >
          <Text style={[styles.statPillText, !filterStatus && styles.statPillTextActive]}>
            Svi ({codes.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statPill, filterStatus === 'available' && styles.statPillActiveGreen]}
          onPress={() => setFilterStatus('available')}
        >
          <Text style={[styles.statPillText, filterStatus === 'available' && styles.statPillTextActive]}>
            Slobodni ({availableCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statPill, filterStatus === 'used' && styles.statPillActiveRed]}
          onPress={() => setFilterStatus('used')}
        >
          <Text style={[styles.statPillText, filterStatus === 'used' && styles.statPillTextActive]}>
            Iskorisceni ({usedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Codes List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.purple]} />
        }
      >
        {filteredCodes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔑</Text>
            <Text style={styles.emptyTitle}>Nema kodova</Text>
            <Text style={styles.emptyText}>Generišite prvi Master Code</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowModal(true)}>
              <Text style={styles.emptyBtnText}>+ Generiši kod</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredCodes.map(code => (
            <View key={code.id} style={styles.codeCard}>
              <View style={styles.codeHeader}>
                <TouchableOpacity onPress={() => copyCode(code.code)} style={styles.codeValue}>
                  <Text style={styles.codeText}>{code.code}</Text>
                  <Text style={styles.copyHint}>📋</Text>
                </TouchableOpacity>
                <View style={[
                  styles.statusBadge,
                  code.status === 'available' ? styles.statusAvailable : styles.statusUsed
                ]}>
                  <Text style={styles.statusText}>
                    {code.status === 'available' ? 'Slobodan' : 'Iskoriscen'}
                  </Text>
                </View>
              </View>

              <View style={styles.codeDetails}>
                <Text style={styles.detailText}>
                  Kreirao: {code.creator?.name || 'Nepoznato'}
                </Text>
                <Text style={styles.detailText}>
                  Datum: {formatDate(code.created_at)}
                </Text>
                {code.company && (
                  <Text style={styles.detailText}>
                    Firma: {code.company.name}
                  </Text>
                )}
                {code.pib && (
                  <Text style={styles.detailText}>
                    PIB: {code.pib}
                  </Text>
                )}
                {code.note && (
                  <Text style={styles.noteText}>
                    Napomena: {code.note}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Generate Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Generiši Master Code</Text>
            <Text style={styles.modalSubtitle}>
              Kod će moći da koristi jedna firma za registraciju
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Napomena (opciono)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="npr. Za firmu XYZ..."
                placeholderTextColor={COLORS.mediumGray}
                value={newCodeNote}
                onChangeText={setNewCodeNote}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowModal(false);
                  setNewCodeNote('');
                }}
                disabled={generating}
              >
                <Text style={styles.cancelBtnText}>Otkazi</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.generateBtn}
                onPress={handleGenerateCode}
                disabled={generating}
              >
                {generating ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.generateBtnText}>Generiši</Text>
                )}
              </TouchableOpacity>
            </View>
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
  addBtn: {
    backgroundColor: COLORS.purple,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  statPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  statPillActive: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purple,
  },
  statPillActiveGreen: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  statPillActiveRed: {
    backgroundColor: COLORS.red,
    borderColor: COLORS.red,
  },
  statPillText: {
    fontSize: 13,
    color: COLORS.mediumGray,
    fontWeight: '500',
  },
  statPillTextActive: {
    color: COLORS.white,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
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
    marginBottom: 20,
  },
  emptyBtn: {
    backgroundColor: COLORS.purple,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 15,
  },
  codeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  codeValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.purple,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  copyHint: {
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusAvailable: {
    backgroundColor: COLORS.primaryLight,
  },
  statusUsed: {
    backgroundColor: COLORS.redLight,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  codeDetails: {
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.mediumGray,
  },
  noteText: {
    fontSize: 13,
    color: COLORS.blue,
    fontStyle: 'italic',
    marginTop: 4,
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
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.mediumGray,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.darkGray,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORS.mediumGray,
    fontWeight: '600',
    fontSize: 16,
  },
  generateBtn: {
    flex: 1,
    backgroundColor: COLORS.purple,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  generateBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default AdminCodesScreen;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';

const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',
  white: '#FFFFFF',
  darkGray: '#1F2937',
  lightGray: '#F3F4F6',
  mediumGray: '#6B7280',
  red: '#EF4444',
  redLight: '#FEE2E2',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
};

const ClientsScreen = ({ navigation }) => {
  const {
    fetchCompanyClients,
    fetchCompanyEquipmentTypes,
    updateClientDetails,
  } = useAppContext();
  const { t } = useLanguage();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [equipmentTypes, setEquipmentTypes] = useState([]);

  // Edit Client State
  const [editingClient, setEditingClient] = useState(null);
  const [clientNote, setClientNote] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientsData, eqTypes] = await Promise.all([
        fetchCompanyClients(),
        fetchCompanyEquipmentTypes(),
      ]);
      setClients(clientsData || []);
      setEquipmentTypes(eqTypes || []);
    } catch (error) {
      Alert.alert(t('error'), t('unableToLoadData'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditClient = (client) => {
    setEditingClient({
      ...client,
      equipment_types: client.equipment_types || [] // Ensure it's an array
    });
    setClientNote(client.manager_note || '');
    setShowEditModal(true);
  };

  const toggleEquipmentType = (type) => {
    if (!editingClient) return;
    const currentTypes = editingClient.equipment_types || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    setEditingClient({ ...editingClient, equipment_types: newTypes });
  };

  const handleSaveClientDetails = async () => {
    if (!editingClient) return;
    try {
      await updateClientDetails(
        editingClient.id,
        editingClient.equipment_types || [],
        clientNote
      );

      setClients(clients.map(c =>
        c.id === editingClient.id
          ? { ...c, equipment_types: editingClient.equipment_types, manager_note: clientNote }
          : c
      ));

      setShowEditModal(false);
      setEditingClient(null);
    } catch (error) {
      Alert.alert(t('error'), t('unableToSaveChanges'));
    }
  };

  const handleViewOnMap = (client) => {
    if (client.latitude && client.longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${client.latitude},${client.longitude}`;
      Linking.openURL(url).catch(() => {
        Alert.alert(t('error'), t('unableToOpenMap'));
      });
    } else {
      Alert.alert(t('noLocation'), t('noLocationSaved'));
    }
  };

  const renderClientItem = ({ item }) => (
    <View style={styles.clientCard}>
      <View style={styles.clientCardHeader}>
        <Text style={styles.clientIcon}>🏢</Text>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{item.name}</Text>
          <Text style={styles.clientAddress} numberOfLines={2}>{item.address}</Text>
          {item.latitude && item.longitude && (
            <TouchableOpacity
              style={styles.mapLinkBtn}
              onPress={() => handleViewOnMap(item)}
            >
              <Text style={styles.mapLinkText}>📍 {t('viewOnMap')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.clientContact}>
        <TouchableOpacity
          style={styles.contactItem}
          onPress={() => {
            Alert.alert(
              t('call'),
              `${t('callQuestion')} ${item.name}?`,
              [
                { text: t('cancel'), style: 'cancel' },
                { text: t('call'), onPress: () => Linking.openURL(`tel:${item.phone}`) }
              ]
            );
          }}
        >
          <Text style={styles.contactIcon}>📞</Text>
          <Text style={styles.contactText}>{item.phone}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.clientMeta}>
        <Text style={styles.clientMetaText}>
          🏭 {item.equipment_types?.length > 0 ? item.equipment_types.join(', ') : t('notAssigned')}
        </Text>
        {item.manager_note ? (
          <Text style={styles.clientMetaText} numberOfLines={1}>
            📝 {item.manager_note}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        style={styles.editClientBtn}
        onPress={() => handleEditClient(item)}
      >
        <Text style={styles.editClientBtnText}>{t('editAssignEquipment')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('myClients')}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text>{t('loading')}</Text>
          </View>
        ) : clients.length === 0 ? (
          <View style={styles.emptyList}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>{t('noClients')}</Text>
            <Text style={styles.emptySubtext}>{t('shareCodeToClients')}</Text>
          </View>
        ) : (
          <FlatList
            data={clients}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={renderClientItem}
          />
        )}
      </View>

      {/* Edit Client Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEditModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.editCard}
          >
            <TouchableOpacity activeOpacity={1}>
              <Text style={styles.editTitle}>{t('editClient')}</Text>
              <Text style={styles.editSubtitle}>{editingClient?.name}</Text>

              <Text style={styles.inputLabel}>{t('equipmentTypes')}:</Text>
              <Text style={styles.multiSelectHint}>{t('selectMultipleEquipment')}</Text>
              <View style={styles.equipmentChips}>
                {equipmentTypes.map(type => {
                  const isSelected = editingClient?.equipment_types?.includes(type);
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.eqChip,
                        isSelected && styles.eqChipSelected
                      ]}
                      onPress={() => toggleEquipmentType(type)}
                    >
                      <Text style={[
                        styles.eqChipText,
                        isSelected && styles.eqChipTextSelected
                      ]}>{isSelected ? '✓ ' : ''}{type}</Text>
                    </TouchableOpacity>
                  );
                })}
                {equipmentTypes.length === 0 && (
                  <Text style={styles.noEqText}>{t('noEquipmentDefined')}</Text>
                )}
              </View>

              <Text style={styles.inputLabel}>{t('note')}:</Text>
              <TextInput
                style={styles.noteInput}
                multiline
                numberOfLines={4}
                value={clientNote}
                onChangeText={setClientNote}
                placeholder={t('enterNote')}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveClientDetails}>
                <Text style={styles.saveBtnText}>{t('saveChanges')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 22,
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.darkGray,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyList: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.mediumGray,
    marginTop: 4,
  },
  clientCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  clientCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientIcon: {
    fontSize: 24,
    marginRight: 12,
    backgroundColor: COLORS.lightGray,
    width: 44,
    height: 44,
    borderRadius: 22,
    textAlign: 'center',
    lineHeight: 44,
    overflow: 'hidden',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  clientAddress: {
    fontSize: 13,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  mapLinkBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  mapLinkText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '600',
  },
  clientContact: {
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    paddingTop: 12,
    flexDirection: 'row',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  contactText: {
    fontSize: 14,
    color: COLORS.blue,
    fontWeight: '500',
  },
  clientMeta: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  clientMetaText: {
    fontSize: 12,
    color: COLORS.mediumGray,
    marginBottom: 4,
  },
  editClientBtn: {
    marginTop: 10,
    backgroundColor: COLORS.blueLight,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  editClientBtnText: {
    color: COLORS.blue,
    fontWeight: '600',
    fontSize: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  editTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  editSubtitle: {
    fontSize: 14,
    color: COLORS.mediumGray,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 4,
  },
  multiSelectHint: {
    fontSize: 12,
    color: COLORS.mediumGray,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  equipmentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  eqChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  eqChipSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  eqChipText: {
    color: COLORS.mediumGray,
  },
  eqChipTextSelected: {
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  noEqText: {
    fontSize: 12,
    color: COLORS.red,
    fontStyle: 'italic',
  },
  noteInput: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelBtn: {
    padding: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORS.mediumGray,
    fontSize: 14,
  },
});

export default ClientsScreen;

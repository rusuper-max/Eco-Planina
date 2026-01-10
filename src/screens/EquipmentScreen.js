import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
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
};

const EquipmentScreen = ({ navigation }) => {
  const {
    fetchCompanyEquipmentTypes,
    updateCompanyEquipmentTypes,
  } = useAppContext();
  const { t } = useLanguage();

  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [newEquipmentType, setNewEquipmentType] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    setLoading(true);
    try {
      const types = await fetchCompanyEquipmentTypes();
      setEquipmentTypes(types || []);
    } catch (error) {
      Alert.alert(t('error'), t('unableToLoadEquipment'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddEquipment = async () => {
    if (!newEquipmentType.trim()) return;
    try {
      const newTypes = [...equipmentTypes, newEquipmentType.trim()];
      await updateCompanyEquipmentTypes(newTypes);
      setEquipmentTypes(newTypes);
      setNewEquipmentType('');
    } catch (error) {
      Alert.alert(t('error'), t('unableToAddEquipment'));
    }
  };

  const handleDeleteEquipment = async (type) => {
    Alert.alert(
      t('confirm'),
      `${t('deleteQuestion')} "${type}"?`,
      [
        { text: t('no'), style: 'cancel' },
        {
          text: t('yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              const newTypes = equipmentTypes.filter(t => t !== type);
              await updateCompanyEquipmentTypes(newTypes);
              setEquipmentTypes(newTypes);
            } catch (error) {
              Alert.alert(t('error'), t('unableToDeleteEquipment'));
            }
          },
        },
      ]
    );
  };

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
        <Text style={styles.title}>{t('equipment')}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Add Equipment Row */}
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder={t('newEquipment')}
            value={newEquipmentType}
            onChangeText={setNewEquipmentType}
            autoCorrect={false}
            placeholderTextColor={COLORS.mediumGray}
          />
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAddEquipment}
          >
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Equipment List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text>{t('loading')}</Text>
          </View>
        ) : equipmentTypes.length === 0 ? (
          <View style={styles.emptyList}>
            <Text style={styles.emptyIcon}>🏭</Text>
            <Text style={styles.emptyText}>{t('noEquipment')}</Text>
            <Text style={styles.emptySubtext}>{t('addEquipmentHint')}</Text>
          </View>
        ) : (
          <FlatList
            data={equipmentTypes}
            keyExtractor={(item) => item}
            contentContainerStyle={{ paddingTop: 10 }}
            renderItem={({ item }) => (
              <View style={styles.equipmentItem}>
                <Text style={styles.equipmentText}>{item}</Text>
                <TouchableOpacity onPress={() => handleDeleteEquipment(item)}>
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
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
    padding: 16,
  },
  addRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    fontSize: 16,
    color: COLORS.darkGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addBtn: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  addBtnText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
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
  equipmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  equipmentText: {
    fontSize: 16,
    color: COLORS.darkGray,
  },
  deleteIcon: {
    fontSize: 18,
  },
});

export default EquipmentScreen;

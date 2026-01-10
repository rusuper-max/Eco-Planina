import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import LocationPicker from '../components/LocationPicker';

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
  orange: '#F59E0B',
  orangeLight: '#FEF3C7',
  yellow: '#FBBF24',
  yellowLight: '#FEF9C3',
};

// Static waste type config (labels will be translated in component)
const WASTE_TYPE_CONFIG = [
  { id: 'cardboard', labelKey: 'cardboard', sublabelKey: 'cardboardDesc', icon: '📦', color: '#D97706', bgColor: '#FEF3C7' },
  { id: 'glass', labelKey: 'glass', sublabelKey: 'glassDesc', icon: '🍾', color: '#059669', bgColor: '#D1FAE5' },
  { id: 'plastic', labelKey: 'plastic', sublabelKey: 'plasticDesc', icon: '♻️', color: '#7C3AED', bgColor: '#EDE9FE' },
];

const FILL_LEVEL_CONFIG = [
  { value: 50, label: '50%', descKey: 'halfFull' },
  { value: 80, label: '80%', descKey: 'almostFull' },
  { value: 100, label: '100%', descKey: 'completelyFull' },
];

const URGENCY_CONFIG = [
  { value: '24h', label: '24h', descKey: 'urgent', color: COLORS.red, bgColor: COLORS.redLight },
  { value: '48h', label: '48h', descKey: 'medium', color: COLORS.orange, bgColor: COLORS.orangeLight },
  { value: '72h', label: '72h', descKey: 'notUrgent', color: COLORS.primary, bgColor: COLORS.primaryLight },
];

const ClientViewScreen = ({ navigation }) => {
  const { addPickupRequest, user, logout, updateClientLocation } = useAppContext();
  const { language, changeLanguage, t } = useLanguage();

  const [selectedWaste, setSelectedWaste] = useState(null);
  const [fillLevel, setFillLevel] = useState(null);
  const [urgency, setUrgency] = useState(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showFillLevel, setShowFillLevel] = useState(false);

  // Location update state
  const handleLocationSelect = async (location) => {
    setShowMap(false);
    try {
      await updateClientLocation(location.address, location.lat, location.lng);
      Alert.alert(t('success'), t('locationUpdated'));
    } catch (error) {
      Alert.alert(t('error'), t('locationUpdateError'));
    }
  };

  const handleSubmit = async () => {
    if (!selectedWaste) {
      Alert.alert(t('error'), t('pleaseSelectWaste'));
      return;
    }
    if (!urgency) {
      Alert.alert(t('error'), t('pleaseSelectUrgency'));
      return;
    }

    setIsSubmitting(true);

    try {
      const wasteInfo = WASTE_TYPE_CONFIG.find((w) => w.id === selectedWaste);

      await addPickupRequest({
        wasteType: selectedWaste,
        wasteLabel: t(wasteInfo.labelKey),
        fillLevel: fillLevel?.value || null,
        urgency: urgency.value,
        note: note.trim(),
      });

      Alert.alert(
        t('requestSentTitle') + ' ✅',
        t('requestSentMessage'),
        [
          {
            text: t('ok'),
            onPress: () => {
              setSelectedWaste(null);
              setFillLevel(null);
              setUrgency(null);
              setNote('');
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(t('error'), t('errorOccurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('logoutTitle'),
      t('logoutConfirmClient'),
      [
        { text: t('no'), style: 'cancel' },
        {
          text: t('yes'),
          onPress: () => {
            logout();
            // Navigation handled by App.js
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>{t('hello')},</Text>
              <Text style={styles.userName}>{user?.name || t('user')}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={() => setShowSettings(true)}>
              <Text style={styles.logoutIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* User Info Banner */}
          <View style={styles.infoBanner}>
            <Text style={styles.infoIcon}>📍</Text>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>{t('yourLocation')}:</Text>
              <Text style={styles.infoValue}>{user?.address || t('notEntered')}</Text>
            </View>
          </View>

          {/* Waste Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('whatToPickup')}</Text>
            <Text style={styles.sectionSubtitle}>{t('selectWasteTypeDesc')}</Text>

            <View style={styles.wasteGrid}>
              {WASTE_TYPE_CONFIG.map((waste) => (
                <TouchableOpacity
                  key={waste.id}
                  style={[
                    styles.wasteCard,
                    { backgroundColor: waste.bgColor },
                    selectedWaste === waste.id && styles.wasteCardSelected,
                    selectedWaste === waste.id && { borderColor: waste.color },
                  ]}
                  onPress={() => setSelectedWaste(waste.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.wasteIcon}>{waste.icon}</Text>
                  <Text style={[styles.wasteLabel, { color: waste.color }]}>
                    {t(waste.labelKey)}
                  </Text>
                  <Text style={styles.wasteSublabel}>{t(waste.sublabelKey)}</Text>
                  {selectedWaste === waste.id && (
                    <View style={[styles.checkBadge, { backgroundColor: waste.color }]}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Fill Level - Collapsible */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={() => setShowFillLevel(!showFillLevel)}
              activeOpacity={0.7}
            >
              <View style={styles.collapsibleTitleContainer}>
                <Text style={styles.sectionTitle}>{t('fillLevelTitle')}</Text>
                {fillLevel && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>{fillLevel.label}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.expandArrow}>{showFillLevel ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {showFillLevel && (
              <>
                <Text style={styles.sectionSubtitle}>{t('howFullContainer')}</Text>
                <View style={styles.fillLevelContainer}>
                  {FILL_LEVEL_CONFIG.map((level) => (
                    <TouchableOpacity
                      key={level.value}
                      style={[
                        styles.fillLevelCard,
                        fillLevel?.value === level.value && styles.fillLevelCardSelected,
                        level.value === 100 && fillLevel?.value === level.value && styles.fillLevelCardUrgent,
                      ]}
                      onPress={() => {
                        setFillLevel(level);
                        setShowFillLevel(false);
                      }}
                    >
                      <Text style={[
                        styles.fillLevelValue,
                        fillLevel?.value === level.value && styles.fillLevelValueSelected,
                      ]}>
                        {level.label}
                      </Text>
                      <Text style={[
                        styles.fillLevelDescription,
                        fillLevel?.value === level.value && styles.fillLevelDescriptionSelected,
                      ]}>
                        {t(level.descKey)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* Urgency Level - 24h/48h/72h */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('pickupUrgency')}</Text>
            <Text style={styles.sectionSubtitle}>{t('whenPickup')}</Text>

            <View style={styles.urgencyContainer}>
              {URGENCY_CONFIG.map((level) => (
                <TouchableOpacity
                  key={level.value}
                  style={[
                    styles.urgencyCard,
                    { borderColor: level.color },
                    urgency?.value === level.value && { backgroundColor: level.bgColor },
                  ]}
                  onPress={() => setUrgency(level)}
                >
                  <Text style={[styles.urgencyValue, { color: level.color }]}>
                    {level.label}
                  </Text>
                  <Text style={[styles.urgencyDescription, { color: level.color }]}>
                    {t(level.descKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Note */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('additionalNoteLabel')}</Text>
            <TextInput
              style={styles.noteInput}
              placeholder={t('notePlaceholder')}
              placeholderTextColor={COLORS.mediumGray}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!selectedWaste || !urgency) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!selectedWaste || !urgency || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.submitButtonIcon}>📤</Text>
                <Text style={styles.submitButtonText}>{t('sendRequest')}</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSettings(false)}
        >
          <View style={styles.settingsCard}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>⚙️ {t('settings')}</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Text style={styles.settingsClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>{t('myLocation')}</Text>
              <Text style={styles.currentAddressLabel}>{t('currentAddress')}:</Text>
              <Text style={styles.currentAddress}>{user?.address || t('notEntered')}</Text>

              <TouchableOpacity
                style={styles.editLocationBtn}
                onPress={() => {
                  setShowSettings(false);
                  setTimeout(() => setShowMap(true), 100);
                }}
              >
                <Text style={styles.editLocationBtnText}>📍 {t('editLocation')}</Text>
              </TouchableOpacity>
            </View>

            {/* Language Switcher */}
            <View style={styles.languageSection}>
              <Text style={styles.settingsSectionTitle}>{t('language')}</Text>
              <View style={styles.languageButtons}>
                <TouchableOpacity
                  style={[
                    styles.languageBtn,
                    language === 'sr' && styles.languageBtnActive
                  ]}
                  onPress={() => changeLanguage('sr')}
                >
                  <Text style={styles.languageFlag}>🇷🇸</Text>
                  <Text style={[
                    styles.languageBtnText,
                    language === 'sr' && styles.languageBtnTextActive
                  ]}>{t('serbian')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.languageBtn,
                    language === 'en' && styles.languageBtnActive
                  ]}
                  onPress={() => changeLanguage('en')}
                >
                  <Text style={styles.languageFlag}>🇬🇧</Text>
                  <Text style={[
                    styles.languageBtnText,
                    language === 'en' && styles.languageBtnTextActive
                  ]}>{t('english')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.modalLogoutBtn} onPress={handleLogout}>
              <Text style={styles.modalLogoutBtnText}>{t('logout')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <LocationPicker
        visible={showMap}
        onClose={() => setShowMap(false)}
        onSelect={handleLocationSelect}
        initialLocation={user?.latitude && user?.longitude ? { lat: user.latitude, lng: user.longitude } : null}
      />
    </SafeAreaView >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.mediumGray,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIcon: {
    fontSize: 22,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    marginBottom: 10,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.primaryDark,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.darkGray,
    fontWeight: '500',
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.mediumGray,
    marginBottom: 15,
  },
  // Collapsible styles
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 8,
  },
  collapsibleTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  expandArrow: {
    fontSize: 14,
    color: COLORS.mediumGray,
    paddingHorizontal: 8,
  },
  selectedBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  wasteGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  wasteCard: {
    width: '31%',
    aspectRatio: 0.9,
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
    position: 'relative',
  },
  wasteCardSelected: {
    borderWidth: 3,
  },
  wasteIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  wasteLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  wasteSublabel: {
    fontSize: 10,
    color: COLORS.mediumGray,
    textAlign: 'center',
    marginTop: 2,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  fillLevelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fillLevelCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fillLevelCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  fillLevelCardUrgent: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.redLight,
  },
  fillLevelValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  fillLevelValueSelected: {
    color: COLORS.primary,
  },
  fillLevelDescription: {
    fontSize: 11,
    color: COLORS.mediumGray,
    marginTop: 4,
  },
  fillLevelDescriptionSelected: {
    color: COLORS.primaryDark,
  },
  urgencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  urgencyCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 2,
  },
  urgencyValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  urgencyDescription: {
    fontSize: 11,
    marginTop: 4,
  },
  noteInput: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: COLORS.darkGray,
    minHeight: 80,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.mediumGray,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: 40,
  },
  bottomPadding: {
    height: 40,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  settingsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  settingsClose: {
    fontSize: 20,
    color: COLORS.mediumGray,
    padding: 5,
  },
  settingsSection: {
    marginBottom: 20,
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 10,
  },
  currentAddressLabel: {
    fontSize: 12,
    color: COLORS.mediumGray,
  },
  currentAddress: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginBottom: 15,
    marginTop: 2,
  },
  editLocationBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  editLocationBtnText: {
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  modalLogoutBtn: {
    backgroundColor: COLORS.lightGray,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalLogoutBtnText: {
    color: COLORS.red,
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Language Switcher
  languageSection: {
    marginBottom: 20,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  languageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
  },
  languageBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  languageFlag: {
    fontSize: 20,
    marginRight: 8,
  },
  languageBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.mediumGray,
  },
  languageBtnTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
});

export default ClientViewScreen;

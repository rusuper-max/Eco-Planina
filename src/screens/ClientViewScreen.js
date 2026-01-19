import React, { useState, useEffect, useMemo } from 'react';
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
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import LocationPicker from '../components/LocationPicker';
import CountdownTimer from '../components/CountdownTimer';

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

// Default colors for waste types (cycling through these)
const WASTE_TYPE_COLORS = [
  { color: '#D97706', bgColor: '#FEF3C7' }, // amber
  { color: '#059669', bgColor: '#D1FAE5' }, // emerald
  { color: '#7C3AED', bgColor: '#EDE9FE' }, // violet
  { color: '#DC2626', bgColor: '#FEE2E2' }, // red
  { color: '#2563EB', bgColor: '#DBEAFE' }, // blue
  { color: '#EA580C', bgColor: '#FFEDD5' }, // orange
];

// Country codes za telefon
const COUNTRY_CODES = [
  { code: '+381', country: 'Srbija', flag: '🇷🇸' },
  { code: '+387', country: 'BiH', flag: '🇧🇦' },
  { code: '+385', country: 'Hrvatska', flag: '🇭🇷' },
  { code: '+386', country: 'Slovenija', flag: '🇸🇮' },
  { code: '+382', country: 'Crna Gora', flag: '🇲🇪' },
  { code: '+389', country: 'S. Makedonija', flag: '🇲🇰' },
  { code: '+43', country: 'Austrija', flag: '🇦🇹' },
  { code: '+49', country: 'Nemacka', flag: '🇩🇪' },
  { code: '+41', country: 'Svajcarska', flag: '🇨🇭' },
];

// Funkcija za boju na osnovu popunjenosti (0-100) - kao na webu
const getFillLevelStyle = (value) => {
  if (value <= 25) return { color: '#10b981', bgLight: '#d1fae5' }; // emerald
  if (value <= 50) return { color: '#84cc16', bgLight: '#ecfccb' }; // lime
  if (value <= 75) return { color: '#f59e0b', bgLight: '#fef3c7' }; // amber
  return { color: '#ef4444', bgLight: '#fee2e2' }; // red
};

// Labela za nivo popunjenosti
const getFillLabel = (value) => {
  if (value <= 25) return 'Skoro prazan';
  if (value <= 50) return 'Polupun';
  if (value <= 75) return 'Skoro pun';
  return 'Potpuno pun';
};

const ClientViewScreen = ({ navigation }) => {
  const {
    addPickupRequest,
    removePickupRequest,
    user,
    logout,
    updateClientLocation,
    updateUserProfile,
    clientRequests,
    fetchClientRequests,
    fetchWasteTypes,
    processedNotification,
    clearProcessedNotification,
    maxPickupHours,
    startChatWithUser,
  } = useAppContext();
  const { language, changeLanguage, t } = useLanguage();

  const [selectedWaste, setSelectedWaste] = useState(null);
  const [fillLevel, setFillLevel] = useState(50); // Default 50% kao na webu
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [wasteTypes, setWasteTypes] = useState([]);
  const [loadingWasteTypes, setLoadingWasteTypes] = useState(true);
  const [deletingRequestId, setDeletingRequestId] = useState(null);
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'requests'

  // Edit profile state
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCountryCode, setEditCountryCode] = useState('+381');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Stil za trenutni nivo popunjenosti
  const fillStyle = useMemo(() => getFillLevelStyle(fillLevel), [fillLevel]);

  // Load requests and waste types on mount
  useEffect(() => {
    fetchClientRequests();
    loadWasteTypes();
  }, []);

  const loadWasteTypes = async () => {
    setLoadingWasteTypes(true);
    try {
      const types = await fetchWasteTypes();
      setWasteTypes(types);
    } catch (error) {
      console.error('Error loading waste types:', error);
    } finally {
      setLoadingWasteTypes(false);
    }
  };

  // Helper to get color for waste type by index
  const getWasteTypeColor = (index) => {
    return WASTE_TYPE_COLORS[index % WASTE_TYPE_COLORS.length];
  };

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchClientRequests(), loadWasteTypes()]);
    setRefreshing(false);
  };

  const handleSubmit = async () => {
    if (!selectedWaste) {
      Alert.alert(t('error'), t('pleaseSelectWaste'));
      return;
    }

    setIsSubmitting(true);

    try {
      const wasteInfo = wasteTypes.find((w) => w.id === selectedWaste);

      await addPickupRequest({
        wasteType: selectedWaste,
        wasteLabel: wasteInfo?.name || 'Nepoznato',
        fillLevel: fillLevel,
        urgency: 'standard', // Fiksna hitnost - koristi max_pickup_hours iz firme
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
              setFillLevel(50);
              setNote('');
              fetchClientRequests();
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
          },
        },
      ]
    );
  };

  // Parse existing phone number to extract country code
  const parsePhoneNumber = (phone) => {
    if (!phone) return { countryCode: '+381', number: '' };
    for (const cc of COUNTRY_CODES) {
      if (phone.startsWith(cc.code)) {
        return { countryCode: cc.code, number: phone.slice(cc.code.length) };
      }
    }
    return { countryCode: '+381', number: phone };
  };

  const openEditProfile = () => {
    setEditName(user?.name || '');
    const parsed = parsePhoneNumber(user?.phone);
    setEditCountryCode(parsed.countryCode);
    setEditPhoneNumber(parsed.number);
    setShowEditProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert(t('error'), 'Unesite ime');
      return;
    }

    setSavingProfile(true);
    try {
      const fullPhone = editPhoneNumber.trim()
        ? editCountryCode + editPhoneNumber.trim().replace(/^0+/, '')
        : null;

      await updateUserProfile({
        name: editName.trim(),
        phone: fullPhone,
      });

      setShowEditProfile(false);
      Alert.alert(t('success'), 'Profil uspešno ažuriran');
    } catch (error) {
      Alert.alert(t('error'), 'Greška pri ažuriranju profila');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle delete request
  const handleDeleteRequest = (request) => {
    // Check if request is assigned to a driver
    if (request.assignment) {
      Alert.alert(
        'Zahtev dodeljen vozaču',
        `Vaš zahtev je već dodeljen vozaču${request.assignment.driver_name ? ` (${request.assignment.driver_name})` : ''}. Kontaktirajte menadžera za otkazivanje.`,
        [
          { text: 'Zatvori', style: 'cancel' },
          {
            text: 'Kontaktiraj menadžera',
            onPress: () => {
              if (request.assignment.assigned_by_id && startChatWithUser) {
                startChatWithUser(request.assignment.assigned_by_id);
                // Navigate to chat if we have navigation
                // The chat will open in the driver view or wherever chat is handled
              } else {
                Alert.alert('Info', 'Kontaktirajte menadžera putem telefona ili emaila.');
              }
            },
          },
        ]
      );
      return;
    }

    // Request is not assigned, allow deletion
    Alert.alert(
      'Obriši zahtev',
      `Da li ste sigurni da želite da obrišete zahtev za "${request.waste_label || request.waste_type}"?`,
      [
        { text: 'Ne', style: 'cancel' },
        {
          text: 'Da, obriši',
          style: 'destructive',
          onPress: async () => {
            setDeletingRequestId(request.id);
            try {
              await removePickupRequest(request.id);
              await fetchClientRequests();
              Alert.alert('Uspešno', 'Zahtev je obrisan.');
            } catch (error) {
              Alert.alert('Greška', 'Nije moguće obrisati zahtev. Pokušajte ponovo.');
            } finally {
              setDeletingRequestId(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('sr-RS', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Helper za određivanje nivoa hitnosti na osnovu preostalog vremena
  const getUrgencyLevel = (createdAt) => {
    if (!createdAt) return 'normal';
    const created = new Date(createdAt);
    const hoursToAdd = maxPickupHours || 48;
    const deadline = new Date(created.getTime() + hoursToAdd * 60 * 60 * 1000);
    const now = new Date();
    const diff = deadline - now;
    if (diff <= 0) return 'expired';
    const hoursLeft = diff / (1000 * 60 * 60);
    const percentLeft = hoursLeft / hoursToAdd;
    if (percentLeft <= 0.25) return 'urgent';
    if (percentLeft <= 0.50) return 'warning';
    return 'normal';
  };

  const getUrgencyColor = (createdAt) => {
    const level = getUrgencyLevel(createdAt);
    switch (level) {
      case 'expired':
      case 'urgent': return COLORS.red;
      case 'warning': return COLORS.orange;
      default: return COLORS.primary;
    }
  };

  const getUrgencyBgColor = (createdAt) => {
    const level = getUrgencyLevel(createdAt);
    switch (level) {
      case 'expired':
      case 'urgent': return COLORS.redLight;
      case 'warning': return COLORS.orangeLight;
      default: return COLORS.primaryLight;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>{t('hello')},</Text>
              <Text style={styles.userName}>{user?.name || t('user')}</Text>
            </View>
            <TouchableOpacity style={styles.settingsButton} onPress={() => setShowSettings(true)}>
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
              onPress={() => setActiveTab('requests')}
            >
              <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
                Moji zahtevi {clientRequests.length > 0 && `(${clientRequests.length})`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'new' && styles.tabActive]}
              onPress={() => setActiveTab('new')}
            >
              <Text style={[styles.tabText, activeTab === 'new' && styles.tabTextActive]}>
                Novi zahtev
              </Text>
            </TouchableOpacity>
          </View>

          {/* Processed Notification Banner */}
          {processedNotification && (
            <View style={styles.processedBanner}>
              <View style={styles.processedContent}>
                <Text style={styles.processedIcon}>✅</Text>
                <View style={styles.processedTextContainer}>
                  <Text style={styles.processedTitle}>{t('requestProcessedNotification')}</Text>
                  <Text style={styles.processedMessage}>
                    {t('requestProcessedDesc')} "{processedNotification.wasteLabel}"
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={clearProcessedNotification}
              >
                <Text style={styles.confirmButtonText}>{t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TAB: Moji zahtevi */}
          {activeTab === 'requests' && (
            <View style={styles.activeRequestsSection}>
              {clientRequests.length === 0 ? (
                <View style={styles.emptyRequests}>
                  <Text style={styles.emptyRequestsIcon}>📋</Text>
                  <Text style={styles.emptyRequestsTitle}>Nema aktivnih zahteva</Text>
                  <Text style={styles.emptyRequestsText}>Kreirajte novi zahtev u tabu "Novi zahtev"</Text>
                </View>
              ) : (
                <>
              {clientRequests.map((request) => (
                <View key={request.id} style={styles.activeRequestCard}>
                  <View style={styles.requestRow}>
                    <View style={styles.requestWasteInfo}>
                      <Text style={styles.requestWasteIcon}>
                        {wasteTypes.find(w => w.id === request.waste_type)?.icon || '📦'}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                          {request.request_code && (
                            <Text style={styles.requestCodeBadge}>{request.request_code}</Text>
                          )}
                          <Text style={styles.requestWasteLabel}>
                            {request.waste_label || request.waste_type}
                          </Text>
                        </View>
                        <Text style={styles.requestDateSmall}>
                          {formatDate(request.created_at)} {formatTime(request.created_at)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.requestBadges}>
                      <CountdownTimer createdAt={request.created_at} maxPickupHours={maxPickupHours} />
                      {request.assignment ? (
                        <View style={styles.assignedBadge}>
                          <Text style={styles.assignedIcon}>🚛</Text>
                          <Text style={styles.assignedText}>Dodeljen vozač</Text>
                        </View>
                      ) : (
                        <View style={styles.pendingBadge}>
                          <View style={styles.pendingDot} />
                          <Text style={styles.pendingText}>{t('pending')}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {request.fill_level && (
                    <View style={styles.fillLevelRowSmall}>
                      <View style={styles.fillBarSmall}>
                        <View style={[styles.fillBarProgressSmall, { width: `${request.fill_level}%` }]} />
                      </View>
                      <Text style={styles.fillPercentSmall}>{request.fill_level}%</Text>
                    </View>
                  )}
                  {/* Delete button */}
                  <TouchableOpacity
                    style={[
                      styles.deleteRequestButton,
                      request.assignment && styles.deleteRequestButtonDisabled
                    ]}
                    onPress={() => handleDeleteRequest(request)}
                    disabled={deletingRequestId === request.id}
                  >
                    {deletingRequestId === request.id ? (
                      <ActivityIndicator size="small" color={COLORS.red} />
                    ) : (
                      <>
                        <Text style={styles.deleteRequestIcon}>🗑️</Text>
                        <Text style={[
                          styles.deleteRequestText,
                          request.assignment && styles.deleteRequestTextDisabled
                        ]}>
                          {request.assignment ? 'Kontaktiraj menadžera' : 'Obriši zahtev'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
                </>
              )}
            </View>
          )}

          {/* TAB: Novi zahtev */}
          {activeTab === 'new' && (
            <>
          {/* Waste Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('whatToPickup')}</Text>
            <Text style={styles.sectionSubtitle}>{t('selectWasteTypeDesc')}</Text>

            {loadingWasteTypes ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>Ucitavanje...</Text>
              </View>
            ) : wasteTypes.length === 0 ? (
              <View style={styles.emptyWasteTypes}>
                <Text style={styles.emptyWasteTypesIcon}>📦</Text>
                <Text style={styles.emptyWasteTypesText}>
                  Nema dostupnih vrsta robe
                </Text>
              </View>
            ) : (
              <View style={styles.wasteGrid}>
                {wasteTypes.map((waste, index) => {
                  const colors = getWasteTypeColor(index);
                  return (
                    <TouchableOpacity
                      key={waste.id}
                      style={[
                        styles.wasteCard,
                        { backgroundColor: colors.bgColor },
                        selectedWaste === waste.id && styles.wasteCardSelected,
                        selectedWaste === waste.id && { borderColor: colors.color },
                      ]}
                      onPress={() => setSelectedWaste(waste.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.wasteIcon}>{waste.icon || '📦'}</Text>
                      <Text style={[styles.wasteLabel, { color: colors.color }]}>
                        {waste.name}
                      </Text>
                      {selectedWaste === waste.id && (
                        <View style={[styles.checkBadge, { backgroundColor: colors.color }]}>
                          <Text style={styles.checkMark}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Fill Level - Slider sa gradijentom kao na webu */}
          <View style={styles.section}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sectionTitle}>{t('fillLevelTitle')}</Text>
              <View style={[styles.fillLevelBadge, { backgroundColor: fillStyle.bgLight }]}>
                <Text style={[styles.fillLevelBadgeText, { color: fillStyle.color }]}>
                  {fillLevel}% - {getFillLabel(fillLevel)}
                </Text>
              </View>
            </View>

            {/* Slider sa gradijentom */}
            <View style={styles.sliderContainer}>
              {/* Gradijent pozadina */}
              <LinearGradient
                colors={['#10b981', '#84cc16', '#f59e0b', '#ef4444']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sliderGradient}
              />

              {/* Native slider (transparentan, samo za interakciju) */}
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                step={1}
                value={fillLevel}
                onValueChange={setFillLevel}
                minimumTrackTintColor="transparent"
                maximumTrackTintColor="transparent"
                thumbTintColor={fillStyle.color}
              />

              {/* Thumb indikator sa bojom */}
              <View
                style={[
                  styles.sliderThumb,
                  {
                    left: `${fillLevel}%`,
                    borderColor: fillStyle.color,
                  },
                ]}
                pointerEvents="none"
              >
                <View style={[styles.sliderThumbInner, { backgroundColor: fillStyle.color }]} />
              </View>
            </View>

            {/* Scale markeri */}
            <View style={styles.scaleMarkers}>
              <Text style={styles.scaleText}>0%</Text>
              <Text style={styles.scaleText}>25%</Text>
              <Text style={styles.scaleText}>50%</Text>
              <Text style={styles.scaleText}>75%</Text>
              <Text style={styles.scaleText}>100%</Text>
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
              !selectedWaste && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!selectedWaste || isSubmitting}
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
            </>
          )}

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

            {/* Profile Section */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Profil</Text>
              <View style={styles.profileInfoRow}>
                <Text style={styles.profileLabel}>Ime:</Text>
                <Text style={styles.profileValue}>{user?.name || 'Nije unet'}</Text>
              </View>
              <View style={styles.profileInfoRow}>
                <Text style={styles.profileLabel}>Telefon:</Text>
                <Text style={styles.profileValue}>{user?.phone || 'Nije unet'}</Text>
              </View>
              <TouchableOpacity
                style={styles.editProfileBtn}
                onPress={() => {
                  setShowSettings(false);
                  setTimeout(() => openEditProfile(), 100);
                }}
              >
                <Text style={styles.editProfileBtnText}>✏️ Izmeni profil</Text>
              </TouchableOpacity>
            </View>

            {/* Location Section */}
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

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfile}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditProfile(false)}
      >
        <View style={styles.editProfileOverlay}>
          <View style={styles.editProfileCard}>
            <View style={styles.editProfileHeader}>
              <Text style={styles.editProfileTitle}>Izmeni profil</Text>
              <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                <Text style={styles.editProfileClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Name Input */}
            <View style={styles.editProfileField}>
              <Text style={styles.editProfileLabel}>Ime / Naziv firme</Text>
              <TextInput
                style={styles.editProfileInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Unesite ime"
                placeholderTextColor={COLORS.mediumGray}
              />
            </View>

            {/* Phone Input with Country Code */}
            <View style={styles.editProfileField}>
              <Text style={styles.editProfileLabel}>Broj telefona</Text>
              <View style={styles.phoneInputRow}>
                <TouchableOpacity
                  style={styles.countryCodeBtn}
                  onPress={() => setShowCountryPicker(!showCountryPicker)}
                >
                  <Text style={styles.countryCodeText}>
                    {COUNTRY_CODES.find(c => c.code === editCountryCode)?.flag} {editCountryCode}
                  </Text>
                  <Text style={styles.countryCodeArrow}>▼</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.phoneNumberInput}
                  value={editPhoneNumber}
                  onChangeText={setEditPhoneNumber}
                  placeholder="61234567"
                  placeholderTextColor={COLORS.mediumGray}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Country Code Picker */}
              {showCountryPicker && (
                <View style={styles.countryPickerDropdown}>
                  <ScrollView style={styles.countryPickerScroll} nestedScrollEnabled>
                    {COUNTRY_CODES.map((cc) => (
                      <TouchableOpacity
                        key={cc.code}
                        style={[
                          styles.countryPickerItem,
                          editCountryCode === cc.code && styles.countryPickerItemActive,
                        ]}
                        onPress={() => {
                          setEditCountryCode(cc.code);
                          setShowCountryPicker(false);
                        }}
                      >
                        <Text style={styles.countryPickerFlag}>{cc.flag}</Text>
                        <Text style={styles.countryPickerCode}>{cc.code}</Text>
                        <Text style={styles.countryPickerName}>{cc.country}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveProfileBtn, savingProfile && styles.saveProfileBtnDisabled]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.saveProfileBtnText}>Sačuvaj</Text>
              )}
            </TouchableOpacity>
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
    paddingBottom: 10,
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
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 22,
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.mediumGray,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Empty requests state
  emptyRequests: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  emptyRequestsIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyRequestsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  emptyRequestsText: {
    fontSize: 14,
    color: COLORS.mediumGray,
    textAlign: 'center',
  },
  // Processed notification banner
  processedBanner: {
    backgroundColor: COLORS.primaryLight,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  processedContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  processedIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  processedTextContainer: {
    flex: 1,
  },
  processedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
    marginBottom: 4,
  },
  processedMessage: {
    fontSize: 14,
    color: COLORS.darkGray,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Active requests section
  activeRequestsSection: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  activeRequestsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 10,
  },
  activeRequestCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  requestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestWasteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestWasteIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  requestWasteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  requestCodeBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  regionIdBadge: {
    fontSize: 10,
    fontWeight: '500',
    color: '#7C3AED',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  requestDateSmall: {
    fontSize: 11,
    color: COLORS.mediumGray,
  },
  requestBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urgencyBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgencyBadgeTextSmall: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.orange,
    marginRight: 4,
  },
  pendingText: {
    fontSize: 11,
    color: COLORS.orange,
    fontWeight: '500',
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  assignedIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  assignedText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '500',
  },
  deleteRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteRequestButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  deleteRequestIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  deleteRequestText: {
    fontSize: 13,
    color: COLORS.red,
    fontWeight: '600',
  },
  deleteRequestTextDisabled: {
    color: '#6B7280',
  },
  fillLevelRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  fillBarSmall: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.lightGray,
    borderRadius: 3,
    marginRight: 8,
  },
  fillBarProgressSmall: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  fillPercentSmall: {
    fontSize: 11,
    color: COLORS.darkGray,
    fontWeight: '600',
    width: 30,
  },
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.mediumGray,
    opacity: 0.3,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: COLORS.mediumGray,
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
  loadingContainer: {
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.mediumGray,
    fontSize: 14,
  },
  emptyWasteTypes: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: COLORS.white,
    borderRadius: 16,
  },
  emptyWasteTypesIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyWasteTypesText: {
    color: COLORS.mediumGray,
    fontSize: 14,
    textAlign: 'center',
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
  // Slider styles za fill level
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  fillLevelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  fillLevelBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  sliderContainer: {
    position: 'relative',
    height: 40,
    justifyContent: 'center',
  },
  sliderGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 12,
    borderRadius: 6,
  },
  slider: {
    position: 'absolute',
    left: -8,
    right: -8,
    height: 40,
  },
  sliderThumb: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 3,
    marginLeft: -14,
    top: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderThumbInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  scaleMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 2,
  },
  scaleText: {
    fontSize: 11,
    color: COLORS.mediumGray,
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
  // Profile styles in settings
  profileInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  profileLabel: {
    fontSize: 14,
    color: COLORS.mediumGray,
    width: 70,
  },
  profileValue: {
    fontSize: 14,
    color: COLORS.darkGray,
    fontWeight: '500',
    flex: 1,
  },
  editProfileBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  editProfileBtnText: {
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  // Edit Profile Modal styles
  editProfileOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  editProfileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  editProfileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editProfileTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  editProfileClose: {
    fontSize: 20,
    color: COLORS.mediumGray,
    padding: 5,
  },
  editProfileField: {
    marginBottom: 16,
  },
  editProfileLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  editProfileInput: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.darkGray,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  countryCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 4,
  },
  countryCodeText: {
    fontSize: 16,
    color: COLORS.darkGray,
  },
  countryCodeArrow: {
    fontSize: 10,
    color: COLORS.mediumGray,
  },
  phoneNumberInput: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.darkGray,
  },
  countryPickerDropdown: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  countryPickerScroll: {
    maxHeight: 200,
  },
  countryPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  countryPickerItemActive: {
    backgroundColor: COLORS.primaryLight,
  },
  countryPickerFlag: {
    fontSize: 20,
    marginRight: 10,
  },
  countryPickerCode: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
    width: 50,
  },
  countryPickerName: {
    fontSize: 14,
    color: COLORS.mediumGray,
  },
  saveProfileBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveProfileBtnDisabled: {
    opacity: 0.6,
  },
  saveProfileBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ClientViewScreen;

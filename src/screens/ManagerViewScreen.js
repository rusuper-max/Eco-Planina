import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  ScrollView,
  Share,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useAppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import RequestsMap from '../components/RequestsMap';
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
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
};

const WASTE_ICONS = {
  cardboard: '📦',
  glass: '🍾',
  plastic: '♻️',
  trash: '🗑️', // Generic trash icon for clients
};

// Helper za određivanje nivoa hitnosti na osnovu preostalog vremena
const getUrgencyLevel = (createdAt, maxPickupHours) => {
  if (!createdAt) return 'normal';
  const created = new Date(createdAt);
  const hoursToAdd = maxPickupHours || 48;
  const deadline = new Date(created.getTime() + hoursToAdd * 60 * 60 * 1000);
  const now = new Date();
  const diff = deadline - now;
  if (diff <= 0) return 'expired'; // Istekao
  const hoursLeft = diff / (1000 * 60 * 60);
  const percentLeft = hoursLeft / hoursToAdd;
  if (percentLeft <= 0.25) return 'urgent'; // <25% vremena
  if (percentLeft <= 0.50) return 'warning'; // 25-50% vremena
  return 'normal'; // >50% vremena
};

const getUrgencyColorByLevel = (level) => {
  switch (level) {
    case 'expired':
    case 'urgent': return COLORS.red;
    case 'warning': return COLORS.orange;
    default: return COLORS.primary;
  }
};

const getUrgencyBgColorByLevel = (level) => {
  switch (level) {
    case 'expired':
    case 'urgent': return COLORS.redLight;
    case 'warning': return COLORS.orangeLight;
    default: return COLORS.primaryLight;
  }
};

const ManagerViewScreen = ({ navigation }) => {
  const {
    pickupRequests,
    removePickupRequest,
    markRequestAsProcessed,
    user,
    logout,
    companyCode,
    companyName,
    maxPickupHours,
    selectedForPrint,
    toggleSelectForPrint,
    clearPrintSelection,
    getSelectedRequests,
    fetchCompanyClients,
  } = useAppContext();
  const { language, changeLanguage, t } = useLanguage();

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [mapFilter, setMapFilter] = useState('requests'); // 'requests' or 'all'
  const [showSettings, setShowSettings] = useState(false);
  const [clients, setClients] = useState([]);

  const pendingRequests = pickupRequests.filter((r) => r.status === 'pending');

  // Računa hitne zahteve - oni koji imaju manje od 25% preostalog vremena
  const getIsUrgent = (request) => {
    if (!request.created_at) return false;
    const created = new Date(request.created_at);
    const hoursToAdd = maxPickupHours || 48;
    const deadline = new Date(created.getTime() + hoursToAdd * 60 * 60 * 1000);
    const now = new Date();
    const diff = deadline - now;
    if (diff <= 0) return true; // Istekao
    const hoursLeft = diff / (1000 * 60 * 60);
    return hoursLeft < hoursToAdd * 0.25; // Hitno ako ima manje od 25% vremena
  };
  const urgentCount = pendingRequests.filter(getIsUrgent).length;

  const handleComplete = (id) => {
    Alert.alert(
      t('confirm'),
      t('completeConfirm'),
      [
        { text: t('no'), style: 'cancel' },
        {
          text: t('yes'),
          onPress: () => {
            removePickupRequest(id);
            setSelectedRequest(null);
            setShowDetail(false);
          },
        },
      ]
    );
  };

  const handleDeleteRequest = (id) => {
    Alert.alert(
      t('deleteRequest'),
      t('deleteRequestConfirm'),
      [
        { text: t('no'), style: 'cancel' },
        {
          text: t('yes'),
          style: 'destructive',
          onPress: () => {
            removePickupRequest(id);
            setSelectedRequest(null);
            setShowDetail(false);
          },
        },
      ]
    );
  };

  const handleRequestProcessed = (request) => {
    Alert.alert(
      t('requestProcessed'),
      t('requestProcessedConfirm'),
      [
        { text: t('no'), style: 'cancel' },
        {
          text: t('yes'),
          onPress: async () => {
            try {
              await markRequestAsProcessed(request);
              setSelectedRequest(null);
              setShowDetail(false);
            } catch (error) {
              Alert.alert(t('error'), t('unableToSaveChanges'));
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      t('logout'),
      t('logoutConfirm'),
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

  const handleCopyCode = async () => {
    if (companyCode) {
      await Clipboard.setStringAsync(companyCode);
      Alert.alert(t('copied'), t('codeCopied'));
    }
  };

  const handleViewClients = () => {
    setShowSettings(false);
    navigation.navigate('Clients');
  };

  const handleManageEquipment = () => {
    setShowSettings(false);
    navigation.navigate('Equipment');
  };

  
  const handlePrint = () => {
    const selected = getSelectedRequests();
    if (selected.length === 0) {
      Alert.alert(t('error'), t('selectSupplier'));
      return;
    }

    Alert.alert(
      t('shareOrNavigate'),
      `${t('selectActionFor')} ${selected.length} ${t('selectedLocations')}`,
      [
        {
          text: `📋 ${t('shareList')}`,
          onPress: () => handleShareList(selected),
        },
        {
          text: `🗺️ ${t('shareMap')}`,
          onPress: () => handleShareMap(selected),
        },
        {
          text: `🚗 ${t('openNavigation')}`,
          onPress: () => handleOpenNavigation(selected),
        },
        { text: t('cancel'), style: 'cancel' },
      ]
    );
  };

  const handleOpenNavigation = (selected) => {
    // Filter requests with valid coordinates
    const withCoords = selected.filter(
      (req) => req.latitude && req.longitude && !isNaN(req.latitude) && !isNaN(req.longitude)
    );

    if (withCoords.length === 0) {
      Alert.alert(t('error'), t('noValidCoords'));
      return;
    }

    // Generate Google Maps directions URL
    let mapsUrl = 'https://www.google.com/maps/dir/';
    withCoords.forEach((req) => {
      mapsUrl += `${req.latitude},${req.longitude}/`;
    });

    Linking.openURL(mapsUrl).catch(() => {
      Alert.alert(t('error'), t('cannotOpenMaps'));
    });
  };

  const handleShareList = async (selected) => {
    const dateLocale = language === 'sr' ? 'sr-RS' : 'en-US';
    // Generate printable text
    let printText = `=== ${t('pickupList')} ===\n`;
    printText += `${t('date')}: ${new Date().toLocaleDateString(dateLocale)}\n`;
    printText += `${t('numSuppliers')}: ${selected.length}\n`;
    printText += '================================\n\n';

    selected.forEach((req, index) => {
      printText += `${index + 1}. ${req.client_name}\n`;
      printText += `   ${t('addressLabel')} ${req.client_address}\n`;
      printText += `   ${t('phoneLabel')} ${req.client_phone}\n`;
      printText += `   ${t('wasteTypeLabel')} ${req.waste_label}\n`;
      printText += `   ${t('urgency')}: ${req.urgency}\n`;
      if (req.note) {
        printText += `   ${t('noteLabel')} ${req.note}\n`;
      }
      printText += '--------------------------------\n';
    });

    printText += `\n=== ${t('endList')} ===`;

    try {
      await Share.share({
        message: printText,
        title: t('shareListTitle'),
      });
    } catch (error) {
      Alert.alert(t('error'), t('cannotShareList'));
    }
  };

  const handleShareMap = async (selected) => {
    const dateLocale = language === 'sr' ? 'sr-RS' : 'en-US';
    // Filter requests with valid coordinates
    const withCoords = selected.filter(
      (req) => req.latitude && req.longitude && !isNaN(req.latitude) && !isNaN(req.longitude)
    );

    if (withCoords.length === 0) {
      Alert.alert(t('error'), t('noValidCoords'));
      return;
    }

    // Generate Google Maps route URL
    // Format: https://www.google.com/maps/dir/lat1,lng1/lat2,lng2/lat3,lng3
    let mapsUrl = 'https://www.google.com/maps/dir/';

    // Add each location as a waypoint
    withCoords.forEach((req) => {
      mapsUrl += `${req.latitude},${req.longitude}/`;
    });

    // Also create a text summary with the map link
    let shareText = `🗺️ ${t('pickupRoute')}\n`;
    shareText += `${t('date')}: ${new Date().toLocaleDateString(dateLocale)}\n`;
    shareText += `${t('numLocations')}: ${withCoords.length}\n\n`;

    shareText += `📍 ${t('locations')}:\n`;
    withCoords.forEach((req, index) => {
      shareText += `${index + 1}. ${req.client_name}\n`;
      shareText += `   ${req.client_address}\n`;
      shareText += `   📞 ${req.client_phone}\n\n`;
    });

    shareText += `🗺️ ${t('openGoogleMaps')}:\n`;
    shareText += mapsUrl;

    try {
      await Share.share({
        message: shareText,
        title: t('shareRouteTitle'),
        url: mapsUrl, // iOS will use this
      });
    } catch (error) {
      Alert.alert(t('error'), t('cannotShareMap'));
    }
  };

  const toggleSelectMode = () => {
    if (selectMode) {
      clearPrintSelection();
    }
    setSelectMode(!selectMode);
  };

  const renderRequestItem = ({ item }) => {
    const icon = WASTE_ICONS[item.waste_type] || '📦';
    const urgencyLevel = getUrgencyLevel(item.created_at, maxPickupHours);
    const urgencyColor = getUrgencyColorByLevel(urgencyLevel);
    const urgencyBgColor = getUrgencyBgColorByLevel(urgencyLevel);
    const isSelected = selectedForPrint.includes(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.requestCard,
          isSelected && styles.requestCardSelected,
        ]}
        onPress={() => {
          if (selectMode) {
            toggleSelectForPrint(item.id);
          } else {
            setSelectedRequest(item);
            setShowDetail(true);
          }
        }}
        activeOpacity={0.7}
      >
        {selectMode && (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Text style={styles.checkboxMark}>✓</Text>}
          </View>
        )}

        <View style={[styles.requestIcon, { backgroundColor: urgencyBgColor }]}>
          <Text style={styles.requestIconText}>{icon}</Text>
        </View>

        <View style={styles.requestInfo}>
          <Text style={styles.requestClient}>{item.client_name}</Text>
          <Text style={styles.requestAddress} numberOfLines={1}>{item.client_address}</Text>
          <Text style={styles.requestPhone}>{item.client_phone}</Text>
        </View>

        <View style={styles.requestRight}>
          <CountdownTimer createdAt={item.created_at} maxPickupHours={maxPickupHours} />
          <Text style={styles.wasteLabel}>{item.waste_label}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{companyName || t('manager')}</Text>
          <Text style={styles.userName}>{user?.name || ''}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.statBadge}>
            <Text style={styles.statNumber}>{pendingRequests.length}</Text>
            <Text style={styles.statLabel}>{t('totalRequests')}</Text>
          </View>
          {urgentCount > 0 && (
            <View style={[styles.statBadge, styles.statBadgeUrgent]}>
              <Text style={[styles.statNumber, { color: COLORS.red }]}>{urgentCount}</Text>
              <Text style={[styles.statLabel, { color: COLORS.red }]}>24h</Text>
            </View>
          )}
          <TouchableOpacity style={styles.settingsBtn} onPress={() => setShowSettings(true)}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Company Code Banner with Copy Button */}
      {companyCode && (
        <View style={styles.codeBanner}>
          <View style={styles.codeBannerLeft}>
            <Text style={styles.codeBannerLabel}>{t('companyCodeLabel')}</Text>
            <Text style={styles.codeBannerValue}>{companyCode}</Text>
          </View>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode}>
            <Text style={styles.copyBtnIcon}>📋</Text>
            <Text style={styles.copyBtnText}>{t('copy')}</Text>
          </TouchableOpacity>
        </View>
      )}


      {/* Action Bar */}
      <View style={styles.actionBar}>
        {/* View Mode Toggle */}
        <View style={styles.viewModeToggle}>
          <TouchableOpacity
            style={[
              styles.viewModeBtn,
              viewMode === 'list' && styles.viewModeBtnActive,
            ]}
            onPress={() => setViewMode('list')}
          >
            <Text style={styles.viewModeIcon}>📋</Text>
            <Text style={[
              styles.viewModeText,
              viewMode === 'list' && styles.viewModeTextActive,
            ]}>{t('list')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeBtn,
              viewMode === 'map' && styles.viewModeBtnActive,
            ]}
            onPress={() => setViewMode('map')}
          >
            <Text style={styles.viewModeIcon}>🗺️</Text>
            <Text style={[
              styles.viewModeText,
              viewMode === 'map' && styles.viewModeTextActive,
            ]}>{t('map')}</Text>
          </TouchableOpacity>
        </View>

        {viewMode === 'map' && (
          <View style={styles.mapFilterContainer}>
            <TouchableOpacity
              style={[styles.mapFilterBtn, mapFilter === 'requests' && styles.mapFilterBtnActive]}
              onPress={() => setMapFilter('requests')}
            >
              <Text style={[styles.mapFilterText, mapFilter === 'requests' && styles.mapFilterTextActive]}>
                {t('active')} ({pendingRequests.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mapFilterBtn, mapFilter === 'all' && styles.mapFilterBtnActive]}
              onPress={async () => {
                setMapFilter('all');
                // Fetch all clients with coords if not already loaded
                if (clients.length === 0) {
                  const data = await fetchCompanyClients();
                  setClients(data);
                }
              }}
            >
              <Text style={[styles.mapFilterText, mapFilter === 'all' && styles.mapFilterTextActive]}>
                {t('allClients')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {viewMode === 'list' && (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, selectMode && styles.actionBtnActive]}
              onPress={toggleSelectMode}
            >
              <Text style={styles.actionBtnIcon}>{selectMode ? '✕' : '☑️'}</Text>
              <Text style={[styles.actionBtnText, selectMode && styles.actionBtnTextActive]}>
                {selectMode ? t('cancel') : t('select')}
              </Text>
            </TouchableOpacity>

            {selectMode && (
              <View style={styles.selectInfo}>
                <Text style={styles.selectInfoText}>
                  {t('selected')}: {selectedForPrint.length}/10
                </Text>
              </View>
            )}

            {selectMode && selectedForPrint.length > 0 && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.printBtn]}
                onPress={handlePrint}
              >
                <Text style={styles.actionBtnIcon}>🖨️</Text>
                <Text style={[styles.actionBtnText, { color: COLORS.white }]}>
                  {t('print')} ({selectedForPrint.length})
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Map View */}
      {viewMode === 'map' && (
        <View style={styles.mapContainer}>
          <RequestsMap
            requests={mapFilter === 'requests' ? pendingRequests : clients.map(c => ({
              id: c.id,
              latitude: c.latitude,
              longitude: c.longitude,
              client_name: c.name,
              waste_type: 'trash'
            })).filter(c => c.latitude && c.longitude)}
            mode={mapFilter === 'requests' ? 'requests' : 'clients'}
            maxPickupHours={maxPickupHours}
            onMarkerPress={(item) => {
              if (mapFilter === 'requests') {
                setSelectedRequest(item);
                setShowDetail(true);
              } else {
                // For clients, just show their info - no request alert
                const client = clients.find(c => c.id === item.id);
                if (client) {
                  Alert.alert(
                    client.name,
                    `📍 ${client.address || t('addressNotEntered')}\n📞 ${client.phone || t('phoneNotEntered')}${client.equipment_types?.length > 0 ? `\n🏭 ${client.equipment_types.join(', ')}` : ''}`
                  );
                }
              }
            }}
            selectedId={selectedRequest?.id}
          />
        </View>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>{t('pickupRequests')}</Text>
            <Text style={styles.listSubtitle}>{t('sortedByUrgency')}</Text>
          </View>

          <FlatList
            data={[...pendingRequests].sort((a, b) => {
              // Calculate remaining time for each request
              const getTimeLeft = (request) => {
                const created = new Date(request.created_at);
                // Koristi maxPickupHours iz company settings
                const hoursToAdd = maxPickupHours || 48;
                const deadline = new Date(created.getTime() + hoursToAdd * 60 * 60 * 1000);
                return deadline - new Date();
              };
              // Sort by remaining time (least time left first)
              return getTimeLeft(a) - getTimeLeft(b);
            })}
            keyExtractor={(item) => item.id}
            renderItem={renderRequestItem}
            extraData={[selectedForPrint, selectMode]}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Text style={styles.emptyIcon}>✅</Text>
                <Text style={styles.emptyText}>{t('noActiveRequests')}</Text>
                <Text style={styles.emptySubtext}>{t('allProcessed')}</Text>
              </View>
            }
          />
        </View>
      )}

      {/* Detail Modal */}
      <Modal
        visible={showDetail && selectedRequest !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetail(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDetail(false)}
        >
          <View style={styles.detailCard}>
            {selectedRequest && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailHeader}>
                  <View style={[
                    styles.detailIcon,
                    { backgroundColor: getUrgencyBgColorByLevel(getUrgencyLevel(selectedRequest.created_at, maxPickupHours)) }
                  ]}>
                    <Text style={styles.detailIconText}>
                      {WASTE_ICONS[selectedRequest.waste_type] || '📦'}
                    </Text>
                  </View>
                  <View style={styles.detailTitleBox}>
                    <Text style={styles.detailTitle}>{selectedRequest.client_name}</Text>
                    <CountdownTimer createdAt={selectedRequest.created_at} maxPickupHours={maxPickupHours} />
                  </View>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => setShowDetail(false)}
                  >
                    <Text style={styles.closeBtnText}>×</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>{t('contactInfo')}</Text>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>📍 {t('addressLabel')}</Text>
                    <Text style={styles.detailValue}>{selectedRequest.client_address}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.detailRow}
                    onPress={() => {
                      const phoneNumber = selectedRequest.client_phone?.replace(/[^+\d]/g, '');
                      if (phoneNumber) {
                        Linking.openURL(`tel:${phoneNumber}`).catch((err) => {
                          console.error('Could not open phone app:', err);
                        });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.detailLabel}>📞 {t('phoneLabel')}</Text>
                    <Text style={[styles.detailValue, styles.phoneLink]}>{selectedRequest.client_phone}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>{t('requestDetails')}</Text>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('wasteTypeLabel')}</Text>
                    <Text style={styles.detailValue}>{selectedRequest.waste_label}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('fillLevelPercent')}</Text>
                    <Text style={styles.detailValue}>{selectedRequest.fill_level}%</Text>
                  </View>

                  {selectedRequest.note ? (
                    <View style={styles.noteBox}>
                      <Text style={styles.detailLabel}>{t('noteLabel')}</Text>
                      <Text style={styles.noteText}>"{selectedRequest.note}"</Text>
                    </View>
                  ) : null}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={styles.processedButton}
                    onPress={() => handleRequestProcessed(selectedRequest)}
                  >
                    <Text style={styles.processedButtonIcon}>✓</Text>
                    <Text style={styles.processedButtonText}>{t('requestProcessed')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteRequestButton}
                    onPress={() => handleDeleteRequest(selectedRequest.id)}
                  >
                    <Text style={styles.deleteRequestButtonIcon}>🗑️</Text>
                    <Text style={styles.deleteRequestButtonText}>{t('deleteRequest')}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <TouchableOpacity
          style={styles.settingsModalOverlay}
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

            {/* Company Info */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>{t('companyInfo')}</Text>

              <View style={styles.settingsRow}>
                <Text style={styles.settingsLabel}>{t('companyNameLabel')}</Text>
                <Text style={styles.settingsValue}>{companyName || 'N/A'}</Text>
              </View>

              <View style={styles.settingsRow}>
                <Text style={styles.settingsLabel}>{t('yourCode')}:</Text>
                <View style={styles.settingsCodeRow}>
                  <Text style={styles.settingsCodeValue}>{companyCode}</Text>
                  <TouchableOpacity
                    style={styles.settingsCopyBtn}
                    onPress={() => {
                      handleCopyCode();
                      setShowSettings(false);
                    }}
                  >
                    <Text style={styles.settingsCopyBtnText}>📋 {t('copy')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingsRow}>
                <Text style={styles.settingsLabel}>{t('managerLabel')}</Text>
                <Text style={styles.settingsValue}>{user?.name || 'N/A'}</Text>
              </View>

              <TouchableOpacity style={styles.viewClientsBtn} onPress={handleViewClients}>
                <Text style={styles.viewClientsBtnIcon}>👥</Text>
                <Text style={styles.viewClientsBtnText}>{t('myClients')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.viewClientsBtn, { marginTop: 10 }]} onPress={handleManageEquipment}>
                <Text style={styles.viewClientsBtnIcon}>🏭</Text>
                <Text style={styles.viewClientsBtnText}>{t('equipmentTypes')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.viewClientsBtn, { marginTop: 10, backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary }]}
                onPress={() => {
                  setShowSettings(false);
                  navigation.navigate('History');
                }}
              >
                <Text style={[styles.viewClientsBtnIcon]}>📊</Text>
                <Text style={[styles.viewClientsBtnText, { color: COLORS.primaryDark }]}>{t('history')}</Text>
              </TouchableOpacity>
            </View>

            {/* Info Box */}
            <View style={styles.settingsInfoBox}>
              <Text style={styles.settingsInfoIcon}>💡</Text>
              <Text style={styles.settingsInfoText}>
                {t('shareCodeInfo')}
              </Text>
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

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonIcon}>🚪</Text>
              <Text style={styles.logoutButtonText}>{t('logout')}</Text>
            </TouchableOpacity>
          </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.mediumGray,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  statBadgeUrgent: {
    backgroundColor: COLORS.redLight,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.primaryDark,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 20,
  },
  // Company Code Banner
  codeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  codeBannerLabel: {
    fontSize: 13,
    color: COLORS.primaryDark,
    marginRight: 8,
  },
  codeBannerValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
    flex: 1,
  },
  codeBannerHint: {
    fontSize: 11,
    color: COLORS.primaryDark,
    fontStyle: 'italic',
  },
  // Action Bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    gap: 10,
    flexWrap: 'wrap',
  },
  mapFilterContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    gap: 10,
  },
  mapFilterBtn: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  mapFilterBtnActive: {
    backgroundColor: COLORS.primary,
  },
  mapFilterText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  mapFilterTextActive: {
    color: 'white',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
  },
  actionBtnActive: {
    backgroundColor: COLORS.redLight,
  },
  actionBtnIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  actionBtnTextActive: {
    color: COLORS.red,
  },
  selectInfo: {
    flex: 1,
  },
  selectInfoText: {
    fontSize: 14,
    color: COLORS.mediumGray,
  },
  printBtn: {
    backgroundColor: COLORS.primary,
  },
  // View Mode Toggle
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    padding: 4,
    marginRight: 10,
  },
  viewModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewModeBtnActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewModeIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  viewModeText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.mediumGray,
  },
  viewModeTextActive: {
    color: COLORS.darkGray,
  },
  // Map Container
  mapContainer: {
    flex: 1,
    marginTop: 8,
  },
  // List
  listContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    marginTop: 8,
  },
  listHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  listSubtitle: {
    fontSize: 13,
    color: COLORS.mediumGray,
  },
  listContent: {
    padding: 12,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  requestCardSelected: {
    backgroundColor: COLORS.blueLight,
    borderWidth: 2,
    borderColor: COLORS.blue,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.mediumGray,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.blue,
    borderColor: COLORS.blue,
  },
  checkboxMark: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  requestIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  requestIconText: {
    fontSize: 24,
  },
  requestInfo: {
    flex: 1,
  },
  requestClient: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  requestAddress: {
    fontSize: 13,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  requestPhone: {
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 2,
  },
  requestRight: {
    alignItems: 'flex-end',
  },
  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  urgencyText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  wasteLabel: {
    fontSize: 12,
    color: COLORS.mediumGray,
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
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '80%',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  detailIconText: {
    fontSize: 28,
  },
  detailTitleBox: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  urgencyBadgeLarge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  urgencyTextLarge: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 24,
    color: COLORS.mediumGray,
    lineHeight: 26,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.mediumGray,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.mediumGray,
  },
  detailValue: {
    fontSize: 15,
    color: COLORS.darkGray,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  phoneLink: {
    color: COLORS.blue,
    textDecorationLine: 'underline',
  },
  noteBox: {
    paddingVertical: 10,
  },
  noteText: {
    fontSize: 14,
    color: COLORS.darkGray,
    fontStyle: 'italic',
    marginTop: 6,
  },
  completeButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 10,
  },
  completeButtonIcon: {
    fontSize: 20,
    color: COLORS.white,
    marginRight: 10,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  // Action Buttons Container
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  processedButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  processedButtonIcon: {
    fontSize: 18,
    color: COLORS.white,
    marginRight: 8,
  },
  processedButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  deleteRequestButton: {
    flex: 1,
    backgroundColor: COLORS.redLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.red,
  },
  deleteRequestButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  deleteRequestButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.red,
  },
  // Code Banner additions
  codeBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  copyBtnIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Settings Modal
  settingsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  settingsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  settingsClose: {
    fontSize: 24,
    color: COLORS.mediumGray,
    padding: 5,
  },
  settingsSection: {
    marginBottom: 20,
  },
  settingsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.mediumGray,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  settingsLabel: {
    fontSize: 14,
    color: COLORS.mediumGray,
  },
  settingsValue: {
    fontSize: 15,
    color: COLORS.darkGray,
    fontWeight: '500',
  },
  settingsCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingsCodeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  settingsCopyBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  settingsCopyBtnText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  settingsInfoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.blueLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  settingsInfoIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  settingsInfoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.blue,
    lineHeight: 18,
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
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.redLight,
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.red,
  },
  // Clients View
  viewClientsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.blueLight,
    paddingVertical: 12,
    marginTop: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.blue,
  },
  viewClientsBtnIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  viewClientsBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.blue,
  },
  });

export default ManagerViewScreen;

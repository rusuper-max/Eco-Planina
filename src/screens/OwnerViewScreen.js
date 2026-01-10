import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Animated,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';

const { width, height } = Dimensions.get('window');

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
  green: '#22C55E',
  mapBg: '#E8F5E9',
};

const getMarkerColor = (fillLevel, importance) => {
  if (fillLevel === 100 || importance === 'Critical') return COLORS.red;
  if (fillLevel === 80 || importance === 'High') return COLORS.orange;
  if (importance === 'Medium') return COLORS.yellow;
  return COLORS.green;
};

const getImportanceStyle = (importance) => {
  switch (importance) {
    case 'Critical':
      return { bg: COLORS.redLight, text: COLORS.red };
    case 'High':
      return { bg: COLORS.orangeLight, text: COLORS.orange };
    case 'Medium':
      return { bg: '#FEF9C3', text: COLORS.yellow };
    default:
      return { bg: COLORS.primaryLight, text: COLORS.primary };
  }
};

// Simple visual map component that works in Expo Go
const SimpleMapView = ({ requests, onMarkerPress, selectedId }) => {
  // Map markers to visual positions (scaled from lat/lng)
  const getPosition = (location) => {
    // Belgrade center: 44.8176, 20.4633
    // Scale to fit in our map view
    const baseX = width * 0.5;
    const baseY = 150;
    const scale = 2000;

    const x = baseX + (location.longitude - 20.4633) * scale;
    const y = baseY - (location.latitude - 44.8176) * scale;

    return { x: Math.max(30, Math.min(width - 50, x)), y: Math.max(20, Math.min(280, y)) };
  };

  return (
    <View style={styles.mapContainer}>
      {/* Map background with grid */}
      <View style={styles.mapBackground}>
        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={`h-${i}`} style={[styles.gridLineH, { top: 60 * i }]} />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={`v-${i}`} style={[styles.gridLineV, { left: (width - 40) / 5 * i + 20 }]} />
        ))}

        {/* City label */}
        <View style={styles.cityLabel}>
          <Text style={styles.cityLabelText}>Belgrade / Beograd</Text>
        </View>

        {/* Markers */}
        {requests.map((request) => {
          const pos = getPosition(request.location);
          const color = getMarkerColor(request.fillLevel, request.importance);
          const isSelected = selectedId === request.id;

          return (
            <TouchableOpacity
              key={request.id}
              style={[
                styles.marker,
                {
                  left: pos.x - 20,
                  top: pos.y - 20,
                  backgroundColor: color,
                  transform: [{ scale: isSelected ? 1.3 : 1 }],
                  zIndex: isSelected ? 100 : 1,
                },
              ]}
              onPress={() => onMarkerPress(request)}
              activeOpacity={0.8}
            >
              <Text style={styles.markerText}>
                {request.fillLevel === 100 ? '!' : request.fillLevel + '%'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.green }]} />
          <Text style={styles.legendText}>Low</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.yellow }]} />
          <Text style={styles.legendText}>Medium</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.orange }]} />
          <Text style={styles.legendText}>High</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.red }]} />
          <Text style={styles.legendText}>Critical</Text>
        </View>
      </View>
    </View>
  );
};

const OwnerViewScreen = ({ navigation }) => {
  const { pickupRequests, removePickupRequest } = useAppContext();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const pendingRequests = pickupRequests.filter((r) => r.status === 'pending');

  const handleMarkerPress = (request) => {
    setSelectedRequest(request);
    setShowDetail(true);
  };

  const handleComplete = (id) => {
    removePickupRequest(id);
    setSelectedRequest(null);
    setShowDetail(false);
  };

  const handleSelectFromList = (request) => {
    setSelectedRequest(request);
    setShowDetail(true);
  };

  const renderRequestItem = ({ item }) => {
    const markerColor = getMarkerColor(item.fillLevel, item.importance);
    const importanceStyle = getImportanceStyle(item.importance);

    return (
      <TouchableOpacity
        style={[
          styles.requestCard,
          selectedRequest?.id === item.id && styles.requestCardSelected,
        ]}
        onPress={() => handleSelectFromList(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.requestIndicator, { backgroundColor: markerColor }]}>
          <Text style={styles.requestIndicatorText}>{item.fillLevel}%</Text>
        </View>

        <View style={styles.requestInfo}>
          <Text style={styles.requestTitle}>{item.containerType}</Text>
          <Text style={styles.requestSubtitle}>{item.wasteType}</Text>
          {item.note ? (
            <Text style={styles.requestNote} numberOfLines={1}>
              {item.note}
            </Text>
          ) : null}
        </View>

        <View style={styles.requestActions}>
          <View style={[styles.importanceBadge, { backgroundColor: importanceStyle.bg }]}>
            <Text style={[styles.importanceBadgeText, { color: importanceStyle.text }]}>
              {item.importance}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => handleComplete(item.id)}
          >
            <Text style={styles.completeButtonText}>✓</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Logistics Map</Text>
          <Text style={styles.headerSubtitle}>Mapa Logistike</Text>
        </View>
        <View style={styles.headerStats}>
          <Text style={styles.statsNumber}>{pendingRequests.length}</Text>
          <Text style={styles.statsLabel}>Active</Text>
        </View>
      </View>

      {/* Map */}
      <SimpleMapView
        requests={pendingRequests}
        onMarkerPress={handleMarkerPress}
        selectedId={selectedRequest?.id}
      />

      {/* Bottom List */}
      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandle}>
          <View style={styles.handleBar} />
          <Text style={styles.sheetTitle}>
            Active Requests ({pendingRequests.length})
          </Text>
          <Text style={styles.sheetSubtitle}>Aktivni zahtevi</Text>
        </View>

        <FlatList
          data={pendingRequests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequestItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No active requests</Text>
              <Text style={styles.emptyTextSr}>Nema aktivnih zahteva</Text>
            </View>
          }
        />
      </View>

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
              <>
                <View style={styles.detailHeader}>
                  <View style={[
                    styles.detailIndicator,
                    { backgroundColor: getMarkerColor(selectedRequest.fillLevel, selectedRequest.importance) }
                  ]}>
                    <Text style={styles.detailIndicatorText}>
                      {selectedRequest.fillLevel}%
                    </Text>
                  </View>
                  <View style={styles.detailTitleContainer}>
                    <Text style={styles.detailTitle}>{selectedRequest.containerType}</Text>
                    <Text style={styles.detailSubtitle}>{selectedRequest.wasteType}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowDetail(false)}
                  >
                    <Text style={styles.closeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fill Level / Popunjenost:</Text>
                  <Text style={[
                    styles.detailValue,
                    { color: getMarkerColor(selectedRequest.fillLevel, selectedRequest.importance) }
                  ]}>
                    {selectedRequest.fillLevel}%
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Importance / Hitnost:</Text>
                  <View style={[
                    styles.importanceBadgeLarge,
                    { backgroundColor: getImportanceStyle(selectedRequest.importance).bg }
                  ]}>
                    <Text style={[
                      styles.importanceBadgeTextLarge,
                      { color: getImportanceStyle(selectedRequest.importance).text }
                    ]}>
                      {selectedRequest.importance}
                    </Text>
                  </View>
                </View>

                {selectedRequest.note ? (
                  <View style={styles.noteContainer}>
                    <Text style={styles.detailLabel}>Note / Napomena:</Text>
                    <Text style={styles.noteText}>"{selectedRequest.note}"</Text>
                  </View>
                ) : null}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location / Lokacija:</Text>
                  <Text style={styles.detailValueSmall}>
                    {selectedRequest.location.latitude.toFixed(4)}, {selectedRequest.location.longitude.toFixed(4)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.completeButtonLarge}
                  onPress={() => handleComplete(selectedRequest.id)}
                >
                  <Text style={styles.completeButtonLargeIcon}>✓</Text>
                  <View>
                    <Text style={styles.completeButtonLargeText}>Mark as Completed</Text>
                    <Text style={styles.completeButtonLargeTextSr}>Oznaci kao zavrseno</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
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
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.darkGray,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  headerStats: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  statsNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statsLabel: {
    fontSize: 11,
    color: COLORS.primaryDark,
  },
  // Map styles
  mapContainer: {
    height: 320,
    margin: 15,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.mapBg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  mapBackground: {
    flex: 1,
    position: 'relative',
  },
  gridLineH: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  gridLineV: {
    position: 'absolute',
    top: 20,
    bottom: 20,
    width: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  cityLabel: {
    position: 'absolute',
    top: 10,
    left: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cityLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  marker: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  legend: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.darkGray,
  },
  // Bottom Sheet Styles
  bottomSheet: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  sheetHandle: {
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.mediumGray,
    borderRadius: 2,
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: COLORS.mediumGray,
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
  },
  requestCardSelected: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  requestIndicator: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  requestIndicatorText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  requestSubtitle: {
    fontSize: 13,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  requestNote: {
    fontSize: 12,
    color: COLORS.mediumGray,
    fontStyle: 'italic',
    marginTop: 4,
  },
  requestActions: {
    alignItems: 'flex-end',
  },
  importanceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  importanceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  completeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.mediumGray,
    fontWeight: '500',
  },
  emptyTextSr: {
    fontSize: 14,
    color: COLORS.mediumGray,
    fontStyle: 'italic',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    paddingBottom: 40,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailIndicator: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  detailIndicatorText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailTitleContainer: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  detailSubtitle: {
    fontSize: 16,
    color: COLORS.primary,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: COLORS.mediumGray,
    lineHeight: 26,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.mediumGray,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailValueSmall: {
    fontSize: 14,
    color: COLORS.darkGray,
  },
  importanceBadgeLarge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  importanceBadgeTextLarge: {
    fontSize: 14,
    fontWeight: '600',
  },
  noteContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  noteText: {
    fontSize: 15,
    color: COLORS.darkGray,
    fontStyle: 'italic',
    marginTop: 8,
  },
  completeButtonLarge: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  completeButtonLargeIcon: {
    fontSize: 24,
    color: COLORS.white,
    marginRight: 12,
  },
  completeButtonLargeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  completeButtonLargeTextSr: {
    fontSize: 13,
    color: COLORS.white,
    opacity: 0.9,
  },
});

export default OwnerViewScreen;

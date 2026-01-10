import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

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

const HistoryScreen = ({ navigation }) => {
  const { fetchProcessedRequests, fetchCompanyClients, companyName } = useAppContext();
  const { t } = useLanguage();

  const [history, setHistory] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedWasteType, setSelectedWasteType] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    byWasteType: {},
    byClient: {},
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [historyData, clientsData] = await Promise.all([
        fetchProcessedRequests(),
        fetchCompanyClients(),
      ]);
      setHistory(historyData);
      setClients(clientsData);
      calculateStats(historyData);
    } catch (error) {
      Alert.alert(t('error'), t('unableToLoadData'));
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (startDate) {
        filters.startDate = startDate.toISOString();
      }
      if (endDate) {
        // Set end of day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filters.endDate = endOfDay.toISOString();
      }
      if (selectedClient) {
        filters.clientId = selectedClient.id;
      }
      if (selectedWasteType) {
        filters.wasteType = selectedWasteType;
      }

      const historyData = await fetchProcessedRequests(filters);
      setHistory(historyData);
      calculateStats(historyData);
      setShowFilters(false);
    } catch (error) {
      Alert.alert(t('error'), t('unableToLoadData'));
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = async () => {
    setStartDate(null);
    setEndDate(null);
    setSelectedClient(null);
    setSelectedWasteType(null);
    setShowFilters(false);
    loadData();
  };

  const calculateStats = (data) => {
    const byWasteType = {};
    const byClient = {};

    data.forEach(item => {
      // By waste type
      const wasteKey = item.waste_label || item.waste_type;
      byWasteType[wasteKey] = (byWasteType[wasteKey] || 0) + 1;

      // By client
      const clientKey = item.client_name;
      byClient[clientKey] = (byClient[clientKey] || 0) + 1;
    });

    setStats({
      total: data.length,
      byWasteType,
      byClient,
    });
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

  const formatDateForDisplay = (date) => {
    if (!date) return t('selectDate');
    return date.toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Generate Excel file and export
  const handleExport = async () => {
    if (history.length === 0) {
      Alert.alert(t('noData'), t('noDataToExport'));
      return;
    }

    try {
      // Prepare data for Excel
      const excelData = history.map(item => ({
        [t('date')]: formatDate(item.processed_at),
        [t('time')]: formatTime(item.processed_at),
        [t('clientName')]: item.client_name || '',
        [t('address')]: item.client_address || '',
        [t('wasteType')]: item.waste_label || item.waste_type || '',
        [t('fillLevel')]: item.fill_level ? `${item.fill_level}%` : '',
        [t('urgency')]: item.urgency || '',
        [t('note')]: item.note || '',
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('history'));

      // Set column widths
      ws['!cols'] = [
        { wch: 12 }, // Date
        { wch: 8 },  // Time
        { wch: 25 }, // Client Name
        { wch: 35 }, // Address
        { wch: 15 }, // Waste Type
        { wch: 10 }, // Fill Level
        { wch: 8 },  // Urgency
        { wch: 30 }, // Note
      ];

      // Generate Excel file as base64
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

      // Create filename
      const dateRange = startDate && endDate
        ? `${formatDate(startDate).replace(/\./g, '-')}_${formatDate(endDate).replace(/\./g, '-')}`
        : 'svi_podaci';
      const fileName = `${companyName || 'EcoLogistics'}_istorija_${dateRange}.xlsx`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      // Write file
      await FileSystem.writeAsStringAsync(filePath, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: t('exportExcel'),
        });
      } else {
        Alert.alert(t('error'), t('sharingNotAvailable'));
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert(t('error'), t('exportError'));
    }
  };

  // Get unique waste types from history
  const wasteTypes = [...new Set(history.map(h => h.waste_type).filter(Boolean))];

  const renderHistoryItem = ({ item }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View style={styles.dateTimeContainer}>
          <Text style={styles.historyDate}>{formatDate(item.processed_at)}</Text>
          <Text style={styles.historyTime}>{formatTime(item.processed_at)}</Text>
        </View>
        <View style={styles.wasteTypeBadge}>
          <Text style={styles.wasteTypeText}>{item.waste_label || item.waste_type}</Text>
        </View>
      </View>

      <View style={styles.historyBody}>
        <Text style={styles.clientName}>{item.client_name}</Text>
        <Text style={styles.clientAddress} numberOfLines={1}>{item.client_address}</Text>
      </View>

      <View style={styles.historyFooter}>
        {item.fill_level && (
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>{t('fillLevel')}:</Text>
            <Text style={styles.metaValue}>{item.fill_level}%</Text>
          </View>
        )}
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>{t('urgency')}:</Text>
          <Text style={styles.metaValue}>{item.urgency}</Text>
        </View>
      </View>

      {item.note ? (
        <Text style={styles.noteText} numberOfLines={2}>📝 {item.note}</Text>
      ) : null}
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
        <Text style={styles.title}>{t('history')}</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Text style={styles.filterButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>{t('totalProcessed')}</Text>
        </View>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExport}
        >
          <Text style={styles.exportIcon}>📤</Text>
          <Text style={styles.exportText}>{t('exportExcel')}</Text>
        </TouchableOpacity>
      </View>

      {/* Active Filters Display */}
      {(startDate || endDate || selectedClient || selectedWasteType) && (
        <View style={styles.activeFilters}>
          <Text style={styles.activeFiltersLabel}>{t('activeFilters')}:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {startDate && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>{t('from')}: {formatDateForDisplay(startDate)}</Text>
              </View>
            )}
            {endDate && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>{t('to')}: {formatDateForDisplay(endDate)}</Text>
              </View>
            )}
            {selectedClient && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>{selectedClient.name}</Text>
              </View>
            )}
            {selectedWasteType && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>{selectedWasteType}</Text>
              </View>
            )}
          </ScrollView>
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearFiltersText}>{t('clearAll')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* History List */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text>{t('loading')}</Text>
          </View>
        ) : history.length === 0 ? (
          <View style={styles.emptyList}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>{t('noHistory')}</Text>
            <Text style={styles.emptySubtext}>{t('noHistoryHint')}</Text>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={renderHistoryItem}
          />
        )}
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilters(false)}
        >
          <View style={styles.filterModal}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.filterHeader}>
                <Text style={styles.filterTitle}>{t('filters')}</Text>
                <TouchableOpacity onPress={() => setShowFilters(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Date Range */}
              <Text style={styles.filterSectionTitle}>{t('dateRange')}</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text style={styles.dateLabel}>{t('from')}</Text>
                  <Text style={styles.dateValue}>{formatDateForDisplay(startDate)}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text style={styles.dateLabel}>{t('to')}</Text>
                  <Text style={styles.dateValue}>{formatDateForDisplay(endDate)}</Text>
                </TouchableOpacity>
              </View>

              {/* Client Filter */}
              <Text style={styles.filterSectionTitle}>{t('client')}</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowClientPicker(!showClientPicker)}
              >
                <Text style={styles.selectButtonText}>
                  {selectedClient ? selectedClient.name : t('allClients')}
                </Text>
                <Text style={styles.selectArrow}>▼</Text>
              </TouchableOpacity>

              {showClientPicker && (
                <View style={styles.pickerDropdown}>
                  <TouchableOpacity
                    style={styles.pickerOption}
                    onPress={() => {
                      setSelectedClient(null);
                      setShowClientPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{t('allClients')}</Text>
                  </TouchableOpacity>
                  {clients.map(client => (
                    <TouchableOpacity
                      key={client.id}
                      style={[
                        styles.pickerOption,
                        selectedClient?.id === client.id && styles.pickerOptionSelected
                      ]}
                      onPress={() => {
                        setSelectedClient(client);
                        setShowClientPicker(false);
                      }}
                    >
                      <Text style={styles.pickerOptionText}>{client.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Quick Filters */}
              <Text style={styles.filterSectionTitle}>{t('quickFilters')}</Text>
              <View style={styles.quickFiltersRow}>
                <TouchableOpacity
                  style={styles.quickFilterBtn}
                  onPress={() => {
                    const today = new Date();
                    setStartDate(today);
                    setEndDate(today);
                  }}
                >
                  <Text style={styles.quickFilterText}>{t('today')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickFilterBtn}
                  onPress={() => {
                    const today = new Date();
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    setStartDate(weekAgo);
                    setEndDate(today);
                  }}
                >
                  <Text style={styles.quickFilterText}>{t('last7Days')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickFilterBtn}
                  onPress={() => {
                    const today = new Date();
                    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                    setStartDate(monthAgo);
                    setEndDate(today);
                  }}
                >
                  <Text style={styles.quickFilterText}>{t('last30Days')}</Text>
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View style={styles.filterActions}>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={clearFilters}
                >
                  <Text style={styles.clearButtonText}>{t('clearFilters')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={applyFilters}
                >
                  <Text style={styles.applyButtonText}>{t('applyFilters')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowStartPicker(false);
            if (date) setStartDate(date);
          }}
          maximumDate={new Date()}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowEndPicker(false);
            if (date) setEndDate(date);
          }}
          maximumDate={new Date()}
        />
      )}
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
  filterButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 22,
  },
  filterButtonText: {
    fontSize: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCard: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.mediumGray,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  exportIcon: {
    fontSize: 18,
  },
  exportText: {
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  activeFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.orangeLight,
    gap: 8,
  },
  activeFiltersLabel: {
    fontSize: 12,
    color: COLORS.orange,
    fontWeight: '600',
  },
  filterChip: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 12,
    color: COLORS.darkGray,
  },
  clearFiltersText: {
    fontSize: 12,
    color: COLORS.orange,
    fontWeight: '600',
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
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  historyCard: {
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
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  historyTime: {
    fontSize: 12,
    color: COLORS.mediumGray,
  },
  wasteTypeBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  wasteTypeText: {
    fontSize: 12,
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  historyBody: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  clientAddress: {
    fontSize: 13,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  historyFooter: {
    flexDirection: 'row',
    paddingTop: 12,
    gap: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: COLORS.mediumGray,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  noteText: {
    fontSize: 12,
    color: COLORS.mediumGray,
    fontStyle: 'italic',
    marginTop: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  closeButton: {
    fontSize: 24,
    color: COLORS.mediumGray,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 8,
    marginTop: 16,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateButton: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    padding: 12,
    borderRadius: 12,
  },
  dateLabel: {
    fontSize: 12,
    color: COLORS.mediumGray,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginTop: 4,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    padding: 14,
    borderRadius: 12,
  },
  selectButtonText: {
    fontSize: 14,
    color: COLORS.darkGray,
  },
  selectArrow: {
    fontSize: 12,
    color: COLORS.mediumGray,
  },
  pickerDropdown: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    maxHeight: 200,
  },
  pickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  pickerOptionSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  pickerOptionText: {
    fontSize: 14,
    color: COLORS.darkGray,
  },
  quickFiltersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickFilterBtn: {
    flex: 1,
    backgroundColor: COLORS.blueLight,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickFilterText: {
    fontSize: 12,
    color: COLORS.blue,
    fontWeight: '600',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  clearButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
  },
  clearButtonText: {
    fontSize: 16,
    color: COLORS.mediumGray,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  applyButtonText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default HistoryScreen;

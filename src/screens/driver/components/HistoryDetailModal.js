/**
 * HistoryDetailModal - Modal za detalje istorije dostave
 * Ekstraktovano iz DriverViewScreen.js radi održivosti
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { styles } from '../styles';
import { COLORS } from '../constants';

const getWasteIcon = (wasteType) => {
  switch (wasteType) {
    case 'cardboard': return '📦';
    case 'glass': return '🍾';
    case 'plastic': return '♻️';
    default: return '📦';
  }
};

export const HistoryDetailModal = ({
  visible,
  item,
  onClose,
  formatDate,
  isRetroactive,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.historyDetailModal}>
        <View style={styles.historyDetailHeader}>
          <Text style={styles.historyDetailTitle}>Detalji dostave</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.historyDetailClose}>✕</Text>
          </TouchableOpacity>
        </View>

        {item && (
          <ScrollView style={styles.historyDetailContent}>
            {/* Waste Type */}
            <View style={styles.historyDetailSection}>
              <View style={styles.historyDetailWasteHeader}>
                <Text style={styles.historyDetailWasteIcon}>
                  {getWasteIcon(item.waste_type)}
                </Text>
                <View>
                  <Text style={styles.historyDetailWasteLabel}>
                    {item.waste_label || item.waste_type}
                  </Text>
                  <View style={styles.historyDetailStatusBadge}>
                    <Text style={styles.historyDetailStatusText}>✓ Zavrseno</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Client Info */}
            <View style={styles.historyDetailSection}>
              <Text style={styles.historyDetailSectionTitle}>Klijent</Text>
              <View style={styles.historyDetailRow}>
                <Text style={styles.historyDetailRowIcon}>👤</Text>
                <Text style={styles.historyDetailRowText}>{item.client_name}</Text>
              </View>
              <View style={styles.historyDetailRow}>
                <Text style={styles.historyDetailRowIcon}>📍</Text>
                <Text style={styles.historyDetailRowText}>
                  {item.client_address || 'Adresa nije dostupna'}
                </Text>
              </View>
              {item.client_phone && (
                <View style={styles.historyDetailRow}>
                  <Text style={styles.historyDetailRowIcon}>📞</Text>
                  <Text style={styles.historyDetailRowText}>{item.client_phone}</Text>
                </View>
              )}
            </View>

            {/* Details */}
            <View style={styles.historyDetailSection}>
              <Text style={styles.historyDetailSectionTitle}>Podaci o dostavi</Text>
              {item.fill_level && (
                <View style={styles.historyDetailRow}>
                  <Text style={styles.historyDetailRowIcon}>📊</Text>
                  <Text style={styles.historyDetailRowText}>
                    Popunjenost: {item.fill_level}%
                  </Text>
                </View>
              )}
              {item.urgency && (
                <View style={styles.historyDetailRow}>
                  <Text style={styles.historyDetailRowIcon}>⏰</Text>
                  <Text style={styles.historyDetailRowText}>
                    Hitnost: {item.urgency}
                  </Text>
                </View>
              )}
              {item.note && (
                <View style={styles.historyDetailRow}>
                  <Text style={styles.historyDetailRowIcon}>📝</Text>
                  <Text style={styles.historyDetailRowText}>
                    {item.note}
                  </Text>
                </View>
              )}
            </View>

            {/* Timeline or Retroactive Assignment Notice */}
            {isRetroactive ? (
              <View style={styles.historyDetailSection}>
                <View style={styles.retroactiveNotice}>
                  <Text style={styles.retroactiveIcon}>📋</Text>
                  <View style={styles.retroactiveContent}>
                    <Text style={styles.retroactiveTitle}>Evidentirano naknadno</Text>
                    <Text style={styles.retroactiveText}>
                      Ovaj zahtev je obrađen od strane menadžera, a vi ste evidentirani kao vozač naknadno.
                    </Text>
                    <Text style={styles.retroactiveTime}>
                      Obrađeno: {formatDate(item.delivered_at || item.completed_at)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.historyDetailSection}>
                <Text style={styles.historyDetailSectionTitle}>Vremenska linija</Text>
                <View style={styles.historyTimeline}>
                  <View style={styles.historyTimelineItem}>
                    <View style={[styles.historyTimelineDot, { backgroundColor: COLORS.blue }]} />
                    <View style={styles.historyTimelineContent}>
                      <Text style={styles.historyTimelineLabel}>Zahtev kreiran</Text>
                      <Text style={styles.historyTimelineTime}>
                        {formatDate(item.created_at)}
                      </Text>
                    </View>
                  </View>
                  {item.assigned_at && (
                    <View style={styles.historyTimelineItem}>
                      <View style={[styles.historyTimelineDot, { backgroundColor: COLORS.purple }]} />
                      <View style={styles.historyTimelineContent}>
                        <Text style={styles.historyTimelineLabel}>Dodeljeno</Text>
                        <Text style={styles.historyTimelineTime}>
                          {formatDate(item.assigned_at)}
                        </Text>
                      </View>
                    </View>
                  )}
                  {item.picked_up_at && (
                    <View style={styles.historyTimelineItem}>
                      <View style={[styles.historyTimelineDot, { backgroundColor: COLORS.amber }]} />
                      <View style={styles.historyTimelineContent}>
                        <Text style={styles.historyTimelineLabel}>Preuzeto</Text>
                        <Text style={styles.historyTimelineTime}>
                          {formatDate(item.picked_up_at)}
                        </Text>
                      </View>
                    </View>
                  )}
                  <View style={styles.historyTimelineItem}>
                    <View style={[styles.historyTimelineDot, { backgroundColor: COLORS.primary }]} />
                    <View style={styles.historyTimelineContent}>
                      <Text style={styles.historyTimelineLabel}>Dostavljeno</Text>
                      <Text style={styles.historyTimelineTime}>
                        {formatDate(item.delivered_at)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        <TouchableOpacity
          style={styles.historyDetailCloseButton}
          onPress={onClose}
        >
          <Text style={styles.historyDetailCloseButtonText}>Zatvori</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export default HistoryDetailModal;

/**
 * TaskCard - Kartica zadatka za vozača
 * Ekstraktovano iz DriverViewScreen.js radi održivosti
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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

export const TaskCard = ({
  request,
  isPickedUp = false,
  bulkMode,
  isBulkSelected,
  isRouteSelected,
  isProcessing,
  urgencyColors,
  timeInfo,
  onBulkSelect,
  onRouteSelect,
  onLongPress,
  onPickup,
  onDelivery,
  onCallClient,
  onNavigate,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.requestCard,
        isPickedUp && styles.requestCardPickedUp,
        bulkMode && isBulkSelected && styles.requestCardBulkSelected
      ]}
      activeOpacity={bulkMode ? 0.7 : 1}
      onPress={bulkMode ? onBulkSelect : undefined}
      onLongPress={!bulkMode ? onLongPress : undefined}
    >
      {/* Status badge for picked up */}
      {isPickedUp && (
        <View style={styles.pickedUpBadge}>
          <Text style={styles.pickedUpBadgeText}>📦 Na zadatku</Text>
        </View>
      )}

      {/* Header Row */}
      <View style={styles.requestHeader}>
        {/* Bulk Selection Checkbox - shown in bulk mode */}
        {bulkMode && (
          <TouchableOpacity
            style={styles.bulkSelectTouch}
            onPress={onBulkSelect}
          >
            <View style={[styles.bulkCheckbox, isBulkSelected && styles.bulkCheckboxChecked]}>
              {isBulkSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
        )}
        {/* Route Selection Checkbox - hidden in bulk mode */}
        {!bulkMode && request.latitude && request.longitude && (
          <TouchableOpacity
            style={styles.routeSelectTouch}
            onPress={onRouteSelect}
          >
            <View style={[styles.routeCheckbox, isRouteSelected && styles.routeCheckboxChecked]}>
              {isRouteSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
        )}
        <View style={styles.wasteInfo}>
          <Text style={styles.wasteIcon}>
            {getWasteIcon(request.waste_type)}
          </Text>
          <View style={styles.wasteDetails}>
            <Text style={styles.wasteLabel}>
              {request.waste_label || request.waste_type}
            </Text>
            <View style={styles.clientNameRow}>
              <Text style={styles.clientName}>{request.client_name}</Text>
              {request.client_phone && (
                <TouchableOpacity
                  style={styles.callIconButton}
                  onPress={onCallClient}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.callIconText}>📞</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Time remaining */}
        <View style={[styles.timeBadge, { backgroundColor: urgencyColors.bg }]}>
          <Text style={[styles.timeIcon, timeInfo.isOverdue && { color: COLORS.red }]}>
            {timeInfo.isOverdue ? '⚠️' : '⏱️'}
          </Text>
          <Text style={[styles.timeText, { color: urgencyColors.text }]}>
            {timeInfo.text}
          </Text>
        </View>
      </View>

      {/* Address */}
      <View style={styles.addressRow}>
        <Text style={styles.addressIcon}>📍</Text>
        <Text style={styles.addressText} numberOfLines={2}>
          {request.client_address || 'Adresa nije dostupna'}
        </Text>
      </View>

      {/* Fill Level */}
      {request.fill_level !== null && request.fill_level !== undefined && (
        <View style={styles.fillLevelRow}>
          <Text style={styles.fillLabel}>Popunjenost:</Text>
          <View style={styles.fillBar}>
            <View style={[styles.fillProgress, { width: `${request.fill_level}%` }]} />
          </View>
          <Text style={styles.fillPercent}>{request.fill_level}%</Text>
        </View>
      )}

      {/* Note */}
      {request.note && (
        <View style={styles.noteRow}>
          <Text style={styles.noteIcon}>📝</Text>
          <Text style={styles.noteText}>{request.note}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {/* Navigation buttons */}
        {request.latitude && request.longitude ? (
          <>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => onNavigate('google')}
            >
              <Text style={styles.navButtonText}>🗺️ Google</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonWaze]}
              onPress={() => onNavigate('waze')}
            >
              <Text style={styles.navButtonText}>🚗 Waze</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.noLocationBadge}>
            <Text style={styles.noLocationText}>⚠️ Nema lokacije</Text>
          </View>
        )}

        {/* Action button - hidden in bulk mode */}
        {!bulkMode && (
          isPickedUp ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.deliveredButton, isProcessing && styles.buttonDisabled]}
              onPress={onDelivery}
              disabled={isProcessing}
            >
              <Text style={styles.actionButtonText}>
                {isProcessing ? '...' : '✅ Dostavljeno'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.pickupButton, isProcessing && styles.buttonDisabled]}
              onPress={onPickup}
              disabled={isProcessing}
            >
              <Text style={styles.actionButtonText}>
                {isProcessing ? '...' : '📦 Preuzeto'}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </TouchableOpacity>
  );
};

export default TaskCard;

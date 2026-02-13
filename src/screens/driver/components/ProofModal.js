/**
 * ProofModal - Modal za upload dokaza (pickup/delivery/bulk)
 * Ekstraktovano iz DriverViewScreen.js radi održivosti
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { styles } from '../styles';
import { COLORS } from '../constants';

// Pickup Proof Modal
export const PickupProofModal = ({
  visible,
  request,
  proofImage,
  uploadingProof,
  onClose,
  onConfirm,
  onPickCamera,
  onPickGallery,
  onRemoveImage,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.proofModalOverlay}>
      <View style={styles.proofModalContent}>
        <Text style={styles.proofModalTitle}>📦 Potvrdi preuzimanje</Text>
        <Text style={styles.proofModalSubtitle}>
          {request?.client_name} - {request?.waste_label}
        </Text>

        {/* Image Preview or Buttons */}
        {proofImage ? (
          <View style={styles.proofImageContainer}>
            <View style={styles.proofImagePreview}>
              <Text style={styles.proofImagePlaceholder}>📷 Slika izabrana</Text>
            </View>
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={onRemoveImage}
            >
              <Text style={styles.removeImageText}>✕ Ukloni</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.proofButtonsRow}>
            <TouchableOpacity
              style={styles.proofImageButton}
              onPress={onPickCamera}
            >
              <Text style={styles.proofImageButtonIcon}>📷</Text>
              <Text style={styles.proofImageButtonText}>Kamera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.proofImageButton}
              onPress={onPickGallery}
            >
              <Text style={styles.proofImageButtonIcon}>🖼️</Text>
              <Text style={styles.proofImageButtonText}>Galerija</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.proofOptionalText}>
          Prilaganje slike je opciono
        </Text>

        {/* Action Buttons */}
        <View style={styles.proofActionButtons}>
          <TouchableOpacity
            style={styles.proofCancelButton}
            onPress={onClose}
            disabled={uploadingProof}
          >
            <Text style={styles.proofCancelButtonText}>Otkaži</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.proofConfirmButton, uploadingProof && styles.buttonDisabled]}
            onPress={onConfirm}
            disabled={uploadingProof}
          >
            {uploadingProof ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.proofConfirmButtonText}>✅ Potvrdi</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// Delivery Proof Modal
export const DeliveryProofModal = ({
  visible,
  request,
  proofImage,
  driverWeight,
  driverWeightUnit,
  uploadingProof,
  onClose,
  onConfirm,
  onPickCamera,
  onPickGallery,
  onRemoveImage,
  onWeightChange,
  onWeightUnitChange,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.proofModalOverlay}
    >
      <View style={styles.proofModalContent}>
        <Text style={styles.proofModalTitle}>✅ Potvrdi dostavu</Text>
        <Text style={styles.proofModalSubtitle}>
          {request?.client_name} - {request?.waste_label}
        </Text>

        {/* Weight Input */}
        <View style={styles.weightInputContainer}>
          <Text style={styles.weightLabel}>Kilaža (opciono):</Text>
          <View style={styles.weightInputRow}>
            <TextInput
              style={styles.weightInput}
              value={driverWeight}
              onChangeText={onWeightChange}
              placeholder="0"
              keyboardType="decimal-pad"
              placeholderTextColor={COLORS.mediumGray}
            />
            <View style={styles.weightUnitPicker}>
              <TouchableOpacity
                style={[styles.weightUnitButton, driverWeightUnit === 'kg' && styles.weightUnitButtonActive]}
                onPress={() => onWeightUnitChange('kg')}
              >
                <Text style={[styles.weightUnitText, driverWeightUnit === 'kg' && styles.weightUnitTextActive]}>kg</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.weightUnitButton, driverWeightUnit === 't' && styles.weightUnitButtonActive]}
                onPress={() => onWeightUnitChange('t')}
              >
                <Text style={[styles.weightUnitText, driverWeightUnit === 't' && styles.weightUnitTextActive]}>t</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Image Preview or Buttons */}
        {proofImage ? (
          <View style={styles.proofImageContainer}>
            <View style={styles.proofImagePreview}>
              <Text style={styles.proofImagePlaceholder}>📷 Slika izabrana</Text>
            </View>
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={onRemoveImage}
            >
              <Text style={styles.removeImageText}>✕ Ukloni</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.proofButtonsRow}>
            <TouchableOpacity
              style={styles.proofImageButton}
              onPress={onPickCamera}
            >
              <Text style={styles.proofImageButtonIcon}>📷</Text>
              <Text style={styles.proofImageButtonText}>Kamera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.proofImageButton}
              onPress={onPickGallery}
            >
              <Text style={styles.proofImageButtonIcon}>🖼️</Text>
              <Text style={styles.proofImageButtonText}>Galerija</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.proofOptionalText}>
          Prilaganje slike je opciono
        </Text>

        {/* Action Buttons */}
        <View style={styles.proofActionButtons}>
          <TouchableOpacity
            style={styles.proofCancelButton}
            onPress={onClose}
            disabled={uploadingProof}
          >
            <Text style={styles.proofCancelButtonText}>Otkaži</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.proofConfirmButton, uploadingProof && styles.buttonDisabled]}
            onPress={onConfirm}
            disabled={uploadingProof}
          >
            {uploadingProof ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.proofConfirmButtonText}>✅ Potvrdi</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

// Bulk Action Modal
export const BulkActionModal = ({
  visible,
  type, // 'pickup' or 'delivery'
  selectedCount,
  proofImage,
  driverWeight,
  driverWeightUnit,
  uploadingProof,
  onClose,
  onConfirm,
  onPickCamera,
  onPickGallery,
  onRemoveImage,
  onWeightChange,
  onWeightUnitChange,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.proofModalOverlay}
    >
      <View style={styles.proofModalContent}>
        <Text style={styles.proofModalTitle}>
          {type === 'pickup' ? '📦 Grupno preuzimanje' : '✅ Grupna dostava'}
        </Text>
        <Text style={styles.proofModalSubtitle}>
          {selectedCount} zahteva izabrano
        </Text>

        {/* Weight Input - only for delivery */}
        {type === 'delivery' && (
          <View style={styles.weightInputContainer}>
            <Text style={styles.weightLabel}>Ukupna kilaža (opciono):</Text>
            <View style={styles.weightInputRow}>
              <TextInput
                style={styles.weightInput}
                value={driverWeight}
                onChangeText={onWeightChange}
                placeholder="0"
                keyboardType="decimal-pad"
                placeholderTextColor={COLORS.mediumGray}
              />
              <View style={styles.weightUnitPicker}>
                <TouchableOpacity
                  style={[styles.weightUnitButton, driverWeightUnit === 'kg' && styles.weightUnitButtonActive]}
                  onPress={() => onWeightUnitChange('kg')}
                >
                  <Text style={[styles.weightUnitText, driverWeightUnit === 'kg' && styles.weightUnitTextActive]}>kg</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.weightUnitButton, driverWeightUnit === 't' && styles.weightUnitButtonActive]}
                  onPress={() => onWeightUnitChange('t')}
                >
                  <Text style={[styles.weightUnitText, driverWeightUnit === 't' && styles.weightUnitTextActive]}>t</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Image Preview or Buttons */}
        {proofImage ? (
          <View style={styles.proofImageContainer}>
            <View style={styles.proofImagePreview}>
              <Text style={styles.proofImagePlaceholder}>📷 Slika izabrana</Text>
            </View>
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={onRemoveImage}
            >
              <Text style={styles.removeImageText}>✕ Ukloni</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.proofButtonsRow}>
            <TouchableOpacity
              style={styles.proofImageButton}
              onPress={onPickCamera}
            >
              <Text style={styles.proofImageButtonIcon}>📷</Text>
              <Text style={styles.proofImageButtonText}>Kamera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.proofImageButton}
              onPress={onPickGallery}
            >
              <Text style={styles.proofImageButtonIcon}>🖼️</Text>
              <Text style={styles.proofImageButtonText}>Galerija</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.proofOptionalText}>
          Jedna slika za sve zahteve (opciono)
        </Text>

        {/* Action Buttons */}
        <View style={styles.proofActionButtons}>
          <TouchableOpacity
            style={styles.proofCancelButton}
            onPress={onClose}
            disabled={uploadingProof}
          >
            <Text style={styles.proofCancelButtonText}>Otkaži</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.proofConfirmButton, uploadingProof && styles.buttonDisabled]}
            onPress={onConfirm}
            disabled={uploadingProof}
          >
            {uploadingProof ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.proofConfirmButtonText}>
                {type === 'pickup' ? '📦 Preuzmi sve' : '✅ Dostavi sve'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

export default {
  PickupProofModal,
  DeliveryProofModal,
  BulkActionModal,
};

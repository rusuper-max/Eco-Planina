/**
 * useProofUpload - Hook za upload dokaza preuzimanja/dostave
 * Ekstraktovano iz DriverViewScreen.js radi održivosti
 */
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../../config/supabase';

export const useProofUpload = ({ user, updateDriverAssignmentStatus }) => {
  // Proof upload modal state
  const [pickupProofModal, setPickupProofModal] = useState({ visible: false, request: null });
  const [deliveryProofModal, setDeliveryProofModal] = useState({ visible: false, request: null });
  const [proofImage, setProofImage] = useState(null);
  const [driverWeight, setDriverWeight] = useState('');
  const [driverWeightUnit, setDriverWeightUnit] = useState('kg');
  const [uploadingProof, setUploadingProof] = useState(false);

  // Pick image from camera or gallery
  const pickImage = useCallback(async (useCamera = false) => {
    try {
      // Dynamically import ImagePicker to prevent crash if native module missing
      let ImagePicker;
      try {
        ImagePicker = await import('expo-image-picker');
      } catch (importError) {
        console.warn('[DriverViewScreen] expo-image-picker not available:', importError.message);
        Alert.alert('Nedostupno', 'Fotografisanje nije dostupno u ovoj verziji aplikacije. Potreban je novi build.');
        return;
      }

      // Request permissions first
      if (useCamera) {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (permissionResult.status !== 'granted') {
          Alert.alert('Greška', 'Potrebna je dozvola za kameru. Molimo omogućite pristup u podešavanjima telefona.');
          return;
        }
      } else {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.status !== 'granted') {
          Alert.alert('Greška', 'Potrebna je dozvola za galeriju. Molimo omogućite pristup u podešavanjima telefona.');
          return;
        }
      }

      // Use ImagePicker.MediaTypeOptions for compatibility
      const mediaTypeOptions = ImagePicker.MediaTypeOptions || { Images: 'Images' };

      const options = {
        mediaTypes: mediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        exif: false, // Disable EXIF to reduce memory usage
      };

      let result;
      if (useCamera) {
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      // Handle result - check both old and new API formats
      if (!result.canceled && !result.cancelled) {
        const asset = result.assets ? result.assets[0] : result;
        if (asset && asset.uri) {
          setProofImage(asset);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      // More specific error message
      if (error.message && error.message.includes('permission')) {
        Alert.alert('Greška', 'Nema dozvole za pristup kameri ili galeriji.');
      } else {
        Alert.alert('Greška', 'Nije moguće izabrati sliku. Pokušajte ponovo.');
      }
    }
  }, []);

  // Upload proof image to Supabase storage
  const uploadProofImage = useCallback(async (assignmentId, proofType) => {
    if (!proofImage) return null;

    try {
      const fileExt = proofImage.uri.split('.').pop() || 'jpg';
      const fileName = `${proofType}_${assignmentId}_${Date.now()}.${fileExt}`;
      const filePath = `driver-proofs/${fileName}`;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(proofImage.uri, {
        encoding: 'base64',
      });

      // Upload using base64 decode
      const { data, error } = await supabase.storage
        .from('proofs')
        .upload(filePath, decode(base64), {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage.from('proofs').getPublicUrl(filePath);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading proof:', error);
      throw error;
    }
  }, [proofImage]);

  // Mark as picked up - opens modal for optional proof
  const handleMarkAsPickedUp = useCallback((request) => {
    setProofImage(null);
    setPickupProofModal({ visible: true, request });
  }, []);

  // Mark as delivered - opens modal for optional proof + weight
  const handleMarkAsDelivered = useCallback((request) => {
    setProofImage(null);
    setDriverWeight('');
    setDriverWeightUnit('kg');
    setDeliveryProofModal({ visible: true, request });
  }, []);

  // Confirm pickup with optional proof
  const confirmPickup = useCallback(async (onSuccess) => {
    const request = pickupProofModal.request;
    if (!request) return;

    setUploadingProof(true);
    try {
      let proofUrl = null;
      if (proofImage) {
        proofUrl = await uploadProofImage(request.assignment_id, 'pickup');
      }

      await updateDriverAssignmentStatus(request.assignment_id, 'picked_up', {
        pickup_proof_url: proofUrl,
      });

      setPickupProofModal({ visible: false, request: null });
      setProofImage(null);

      if (onSuccess) {
        onSuccess(request.id);
      }
    } catch (error) {
      console.error('Error confirming pickup:', error);
      Alert.alert('Greška', 'Došlo je do greške pri potvrdi preuzimanja.');
    } finally {
      setUploadingProof(false);
    }
  }, [pickupProofModal, proofImage, uploadProofImage, updateDriverAssignmentStatus]);

  // Confirm delivery with optional proof + weight
  const confirmDelivery = useCallback(async (onSuccess) => {
    const request = deliveryProofModal.request;
    if (!request) return;

    setUploadingProof(true);
    try {
      let proofUrl = null;
      if (proofImage) {
        proofUrl = await uploadProofImage(request.assignment_id, 'delivery');
      }

      const weight = driverWeight ? parseFloat(driverWeight.replace(',', '.')) : null;

      await updateDriverAssignmentStatus(request.assignment_id, 'delivered', {
        delivery_proof_url: proofUrl,
        driver_weight: weight,
        driver_weight_unit: driverWeightUnit,
      });

      setDeliveryProofModal({ visible: false, request: null });
      setProofImage(null);
      setDriverWeight('');

      if (onSuccess) {
        onSuccess(request.id);
      }
    } catch (error) {
      console.error('Error confirming delivery:', error);
      Alert.alert('Greška', 'Došlo je do greške pri potvrdi dostave.');
    } finally {
      setUploadingProof(false);
    }
  }, [deliveryProofModal, proofImage, driverWeight, driverWeightUnit, uploadProofImage, updateDriverAssignmentStatus]);

  // Reset modals
  const closePickupModal = useCallback(() => {
    setPickupProofModal({ visible: false, request: null });
    setProofImage(null);
  }, []);

  const closeDeliveryModal = useCallback(() => {
    setDeliveryProofModal({ visible: false, request: null });
    setProofImage(null);
    setDriverWeight('');
  }, []);

  return {
    // Modal state
    pickupProofModal,
    deliveryProofModal,
    proofImage,
    driverWeight,
    driverWeightUnit,
    uploadingProof,

    // Setters
    setProofImage,
    setDriverWeight,
    setDriverWeightUnit,

    // Actions
    pickImage,
    uploadProofImage,
    handleMarkAsPickedUp,
    handleMarkAsDelivered,
    confirmPickup,
    confirmDelivery,
    closePickupModal,
    closeDeliveryModal,
  };
};

export default useProofUpload;

/**
 * useBulkActions - Hook za grupne akcije (bulk pickup/delivery)
 * Ekstraktovano iz DriverViewScreen.js radi održivosti
 */
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

export const useBulkActions = ({
  assignments,
  setAssignments,
  updateDriverAssignmentStatus,
  uploadProofImage,
  proofImage,
  setProofImage,
  driverWeight,
  setDriverWeight,
  driverWeightUnit,
  setDriverWeightUnit,
  uploadingProof,
  setUploadingProof,
}) => {
  // Bulk action state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedForBulk, setSelectedForBulk] = useState(new Set());
  const [bulkActionModal, setBulkActionModal] = useState({ visible: false, type: null });

  // Pending and picked up requests for calculations
  const pendingRequests = assignments.filter(
    a => a.assignment_status === 'assigned' || a.assignment_status === 'in_progress'
  );
  const pickedUpRequests = assignments.filter(
    a => a.assignment_status === 'picked_up'
  );

  // Toggle bulk selection for a request
  const toggleBulkSelection = useCallback((requestId) => {
    setSelectedForBulk(prev => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  }, []);

  // Select/deselect all for bulk action (based on current status)
  const toggleSelectAllForBulk = useCallback((status) => {
    const targetAssignments = status === 'pending' ? pendingRequests : pickedUpRequests;
    const targetIds = targetAssignments.map(r => r.id);
    const allSelected = targetIds.length > 0 && targetIds.every(id => selectedForBulk.has(id));

    if (allSelected) {
      // Deselect all from this status
      setSelectedForBulk(prev => {
        const next = new Set(prev);
        targetIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      // Select all from this status
      setSelectedForBulk(prev => {
        const next = new Set(prev);
        targetIds.forEach(id => next.add(id));
        return next;
      });
    }
  }, [pendingRequests, pickedUpRequests, selectedForBulk]);

  // Enter bulk mode with initial selection
  const enterBulkMode = useCallback((initialRequestId) => {
    setBulkMode(true);
    setSelectedForBulk(new Set([initialRequestId]));
  }, []);

  // Exit bulk mode
  const exitBulkMode = useCallback(() => {
    setBulkMode(false);
    setSelectedForBulk(new Set());
  }, []);

  // Open bulk action modal
  const openBulkActionModal = useCallback((type) => {
    if (selectedForBulk.size === 0) {
      Alert.alert('Greška', 'Izaberite bar jedan zahtev');
      return;
    }
    setProofImage(null);
    setDriverWeight('');
    setDriverWeightUnit('kg');
    setBulkActionModal({ visible: true, type });
  }, [selectedForBulk.size, setProofImage, setDriverWeight, setDriverWeightUnit]);

  // Close bulk action modal
  const closeBulkActionModal = useCallback(() => {
    setBulkActionModal({ visible: false, type: null });
  }, []);

  // Confirm bulk pickup
  const confirmBulkPickup = useCallback(async () => {
    const selectedIds = Array.from(selectedForBulk);
    const selectedAssignments = assignments.filter(a =>
      selectedIds.includes(a.id) &&
      (a.assignment_status === 'assigned' || a.assignment_status === 'in_progress')
    );

    if (selectedAssignments.length === 0) {
      Alert.alert('Greška', 'Nema izabranih zahteva za preuzimanje');
      return;
    }

    setUploadingProof(true);
    try {
      let proofUrl = null;
      if (proofImage) {
        // Upload single image for all bulk items
        proofUrl = await uploadProofImage(`bulk_${Date.now()}`, 'pickup');
      }

      // Update all selected assignments
      for (const assignment of selectedAssignments) {
        await updateDriverAssignmentStatus(assignment.assignment_id, 'picked_up', {
          pickup_proof_url: proofUrl,
        });
      }

      // Update local state
      setAssignments(prev => prev.map(a =>
        selectedIds.includes(a.id) && (a.assignment_status === 'assigned' || a.assignment_status === 'in_progress')
          ? { ...a, assignment_status: 'picked_up', picked_up_at: new Date().toISOString() }
          : a
      ));

      setBulkActionModal({ visible: false, type: null });
      exitBulkMode();
      Alert.alert('Uspešno', `${selectedAssignments.length} zahteva označeno kao preuzeto.`);
    } catch (error) {
      console.error('Error confirming bulk pickup:', error);
      Alert.alert('Greška', 'Došlo je do greške pri obradi.');
    } finally {
      setUploadingProof(false);
    }
  }, [
    selectedForBulk,
    assignments,
    proofImage,
    uploadProofImage,
    updateDriverAssignmentStatus,
    setAssignments,
    setUploadingProof,
    exitBulkMode,
  ]);

  // Confirm bulk delivery
  const confirmBulkDelivery = useCallback(async () => {
    const selectedIds = Array.from(selectedForBulk);
    const selectedAssignments = assignments.filter(a =>
      selectedIds.includes(a.id) &&
      a.assignment_status === 'picked_up'
    );

    if (selectedAssignments.length === 0) {
      Alert.alert('Greška', 'Nema izabranih zahteva za dostavu');
      return;
    }

    setUploadingProof(true);
    try {
      let proofUrl = null;
      if (proofImage) {
        proofUrl = await uploadProofImage(`bulk_${Date.now()}`, 'delivery');
      }

      const weight = driverWeight ? parseFloat(driverWeight.replace(',', '.')) : null;

      // Update all selected assignments
      for (const assignment of selectedAssignments) {
        await updateDriverAssignmentStatus(assignment.assignment_id, 'delivered', {
          delivery_proof_url: proofUrl,
          driver_weight: weight,
          driver_weight_unit: driverWeightUnit,
        });
      }

      // Remove from local state
      setAssignments(prev => prev.filter(a => !selectedIds.includes(a.id) || a.assignment_status !== 'picked_up'));

      setBulkActionModal({ visible: false, type: null });
      exitBulkMode();
      Alert.alert('Uspešno', `${selectedAssignments.length} dostava završeno.`);
    } catch (error) {
      console.error('Error confirming bulk delivery:', error);
      Alert.alert('Greška', 'Došlo je do greške pri obradi.');
    } finally {
      setUploadingProof(false);
    }
  }, [
    selectedForBulk,
    assignments,
    proofImage,
    driverWeight,
    driverWeightUnit,
    uploadProofImage,
    updateDriverAssignmentStatus,
    setAssignments,
    setUploadingProof,
    exitBulkMode,
  ]);

  // Check if any pending requests are selected
  const hasPendingSelected = Array.from(selectedForBulk).some(id => {
    const a = assignments.find(x => x.id === id);
    return a && (a.assignment_status === 'assigned' || a.assignment_status === 'in_progress');
  });

  // Check if any picked_up requests are selected
  const hasPickedUpSelected = Array.from(selectedForBulk).some(id => {
    const a = assignments.find(x => x.id === id);
    return a && a.assignment_status === 'picked_up';
  });

  return {
    // State
    bulkMode,
    selectedForBulk,
    bulkActionModal,

    // Computed
    hasPendingSelected,
    hasPickedUpSelected,

    // Actions
    toggleBulkSelection,
    toggleSelectAllForBulk,
    enterBulkMode,
    exitBulkMode,
    openBulkActionModal,
    closeBulkActionModal,
    confirmBulkPickup,
    confirmBulkDelivery,
  };
};

export default useBulkActions;

/**
 * useClientOperations - Hook za operacije sa klijentima
 * Ekstraktovano iz Dashboard.jsx
 */
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';

export const useClientOperations = ({
  deleteClient: deleteClientApi,
  updateClientDetails,
  setClientLocationWithRequests,
  fetchPickupRequests,
  companyCode
}) => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingClientLocation, setEditingClientLocation] = useState(null);
  const [editingClientEquipment, setEditingClientEquipment] = useState(null);

  // Delete client
  const handleDeleteClient = useCallback(async (id) => {
    if (!window.confirm('Obrisati klijenta?')) return;
    const previousClients = clients;
    setClients(prev => prev.filter(c => c.id !== id)); // Optimistic update
    try {
      await deleteClientApi?.(id);
    } catch (err) {
      setClients(previousClients); // Rollback on error
      toast.error(err.message);
    }
  }, [clients, deleteClientApi]);

  // Handle click on client name in requests table
  const handleClientClick = useCallback((clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) setSelectedClient(client);
  }, [clients]);

  // Save client location
  const handleSaveClientLocation = useCallback(async (position) => {
    if (!editingClientLocation) return;

    try {
      // Reverse geocode to get address
      let newAddress = editingClientLocation.address || '';
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position[0]}&lon=${position[1]}&accept-language=sr`);
        const geoData = await response.json();
        if (geoData.display_name) {
          const parts = [];
          if (geoData.address?.road) parts.push(geoData.address.road);
          if (geoData.address?.house_number) parts.push(geoData.address.house_number);
          if (geoData.address?.city || geoData.address?.town || geoData.address?.village) {
            parts.push(geoData.address.city || geoData.address.town || geoData.address.village);
          }
          newAddress = parts.length > 0 ? parts.join(' ') : geoData.display_name.split(',').slice(0, 3).join(',');
        }
      } catch (geoError) {
        console.warn('Reverse geocoding failed:', geoError);
      }

      // Update user and all pending requests
      await setClientLocationWithRequests(editingClientLocation.id, position[0], position[1]);

      // Update address in users and pending pickup_requests
      const { error: userError } = await supabase
        .from('users')
        .update({ address: newAddress })
        .eq('id', editingClientLocation.id)
        .eq('company_code', companyCode);
      if (userError) throw userError;

      const { error: requestsError } = await supabase
        .from('pickup_requests')
        .update({ client_address: newAddress })
        .eq('user_id', editingClientLocation.id)
        .eq('company_code', companyCode)
        .eq('status', 'pending');
      if (requestsError) throw requestsError;

      // Update local state
      setClients(prev => prev.map(c =>
        c.id === editingClientLocation.id
          ? { ...c, latitude: position[0], longitude: position[1], address: newAddress }
          : c
      ));
      await fetchPickupRequests();

      toast.success('Lokacija uspešno sačuvana');
      setEditingClientLocation(null);
    } catch (err) {
      console.error('Error saving location:', err);
      toast.error('Greška pri čuvanju lokacije: ' + err.message);
    }
  }, [editingClientLocation, setClientLocationWithRequests, companyCode, fetchPickupRequests]);

  // Save client equipment/details
  const handleSaveClientEquipment = useCallback(async (clientId, equipmentTypes, note, pib, allowedWasteTypes = null) => {
    try {
      await updateClientDetails(clientId, equipmentTypes, note, pib, allowedWasteTypes);
      setClients(prev => prev.map(c =>
        c.id === clientId
          ? { ...c, equipment_types: equipmentTypes, manager_note: note, pib: pib, allowed_waste_types: allowedWasteTypes }
          : c
      ));
    } catch (err) {
      throw err;
    }
  }, [updateClientDetails]);

  return {
    clients,
    setClients,
    selectedClient,
    setSelectedClient,
    editingClientLocation,
    setEditingClientLocation,
    editingClientEquipment,
    setEditingClientEquipment,
    handleDeleteClient,
    handleClientClick,
    handleSaveClientLocation,
    handleSaveClientEquipment
  };
};

export default useClientOperations;

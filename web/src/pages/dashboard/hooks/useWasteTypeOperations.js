/**
 * useWasteTypeOperations - Hook za operacije sa vrstama robe
 * Ekstraktovano iz Dashboard.jsx
 */
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useWasteTypeOperations = ({
  createWasteType,
  updateWasteType,
  deleteWasteType: deleteWasteTypeApi,
  updateClientDetails,
  fetchCompanyClients
}) => {
  const [wasteTypes, setWasteTypes] = useState([]);

  // Add waste type
  const handleAddWasteType = useCallback(async (newType) => {
    try {
      const created = await createWasteType(newType);
      setWasteTypes(prev => [...prev, created]);
      toast.success('Vrsta robe dodana');
    } catch (e) {
      toast.error('Greška pri čuvanju: ' + e.message);
    }
  }, [createWasteType]);

  // Delete waste type
  const handleDeleteWasteType = useCallback(async (id) => {
    if (window.confirm('Obrisati vrstu robe?')) {
      try {
        await deleteWasteTypeApi(id);
        setWasteTypes(prev => prev.filter(wt => wt.id !== id));
        toast.success('Vrsta robe obrisana');
      } catch (e) {
        toast.error('Greška pri brisanju: ' + e.message);
      }
    }
  }, [deleteWasteTypeApi]);

  // Edit waste type
  const handleEditWasteType = useCallback(async (updatedType) => {
    try {
      const updated = await updateWasteType(updatedType.id, {
        label: updatedType.label,
        icon: updatedType.icon,
        customImage: updatedType.customImage,
        name: updatedType.name,
        description: updatedType.description,
        region_id: updatedType.region_id
      });
      setWasteTypes(prev => prev.map(wt => wt.id === updated.id ? updated : wt));
      return updated;
    } catch (e) {
      toast.error('Greška pri izmeni: ' + e.message);
      throw e;
    }
  }, [updateWasteType]);

  // Update allowed waste types for a client
  const handleUpdateClientWasteTypes = useCallback(async (clientId, allowedWasteTypes, clients, setClients) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    try {
      await updateClientDetails(
        clientId,
        client.equipment_types || [],
        client.manager_note || '',
        client.pib || '',
        allowedWasteTypes
      );
      setClients(prev => prev.map(c =>
        c.id === clientId
          ? { ...c, allowed_waste_types: allowedWasteTypes }
          : c
      ));
    } catch (err) {
      throw err;
    }
  }, [updateClientDetails]);

  // Bulk update waste types for multiple clients
  const handleBulkWasteTypeUpdate = useCallback(async ({ mode, wasteTypeIds, clientIds }, clients, setClients, companyCode) => {
    try {
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < clientIds.length; i += batchSize) {
        batches.push(clientIds.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const updates = batch.map(async (clientId) => {
          const client = clients.find(c => c.id === clientId);
          if (!client) return;

          let currentAllowed = client.allowed_waste_types || [];
          if (currentAllowed.length === 0) {
            currentAllowed = wasteTypes.map(wt => wt.id);
          }

          let newAllowed;
          if (mode === 'add') {
            newAllowed = [...new Set([...currentAllowed, ...wasteTypeIds])];
          } else {
            newAllowed = currentAllowed.filter(id => !wasteTypeIds.includes(id));
          }

          await updateClientDetails(
            clientId,
            client.equipment_types || [],
            client.manager_note || '',
            client.pib || '',
            newAllowed
          );

          return { clientId, newAllowed };
        });

        await Promise.all(updates);
      }

      const refreshed = await fetchCompanyClients(companyCode);
      setClients(refreshed || []);
      toast.success(`Uspešno ažurirano ${clientIds.length} klijenata`);
    } catch (err) {
      toast.error('Greška pri ažuriranju: ' + err.message);
      throw err;
    }
  }, [wasteTypes, updateClientDetails, fetchCompanyClients]);

  return {
    wasteTypes,
    setWasteTypes,
    handleAddWasteType,
    handleDeleteWasteType,
    handleEditWasteType,
    handleUpdateClientWasteTypes,
    handleBulkWasteTypeUpdate
  };
};

export default useWasteTypeOperations;

/**
 * useEquipmentOperations - Hook za operacije sa opremom
 * Ekstraktovano iz Dashboard.jsx
 */
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useEquipmentOperations = ({
  createEquipment,
  updateEquipment,
  deleteEquipment,
  clients
}) => {
  const [equipment, setEquipment] = useState([]);

  // Add new equipment
  const handleAddEquipment = useCallback(async (newEq) => {
    try {
      const created = await createEquipment(newEq);
      setEquipment(prev => [...prev, created]);
      toast.success('Oprema uspešno dodata');
    } catch (err) {
      console.error('Error adding equipment:', err);
      toast.error('Greška pri dodavanju opreme');
    }
  }, [createEquipment]);

  // Assign equipment to client
  const handleAssignEquipment = useCallback(async (eqId, clientId) => {
    try {
      const client = clients.find(c => c.id === clientId);
      await updateEquipment(eqId, { assigned_to: clientId || null });
      setEquipment(prev => prev.map(eq =>
        eq.id === eqId
          ? { ...eq, assigned_to: clientId, assigned_to_name: client?.name || null }
          : eq
      ));
      toast.success(clientId ? 'Oprema dodeljena klijentu' : 'Dodela opreme uklonjena');
    } catch (err) {
      console.error('Error assigning equipment:', err);
      toast.error('Greška pri dodeli opreme');
    }
  }, [clients, updateEquipment]);

  // Delete equipment
  const handleDeleteEquipment = useCallback(async (id) => {
    const eq = equipment.find(e => e.id === id);
    const confirmMessage = eq?.assigned_to
      ? `Ova oprema je dodeljena klijentu "${eq.assigned_to_name || 'Nepoznat'}". Da li ste sigurni da želite da je obrišete?`
      : 'Obrisati opremu?';
    if (window.confirm(confirmMessage)) {
      try {
        await deleteEquipment(id);
        setEquipment(prev => prev.filter(e => e.id !== id));
        toast.success('Oprema obrisana');
      } catch (err) {
        console.error('Error deleting equipment:', err);
        toast.error('Greška pri brisanju opreme');
      }
    }
  }, [equipment, deleteEquipment]);

  // Edit equipment
  const handleEditEquipment = useCallback(async (updated) => {
    try {
      await updateEquipment(updated.id, updated);
      setEquipment(prev => prev.map(eq => eq.id === updated.id ? { ...updated } : eq));
      toast.success('Oprema ažurirana');
    } catch (err) {
      console.error('Error updating equipment:', err);
      toast.error('Greška pri ažuriranju opreme');
    }
  }, [updateEquipment]);

  return {
    equipment,
    setEquipment,
    handleAddEquipment,
    handleAssignEquipment,
    handleDeleteEquipment,
    handleEditEquipment
  };
};

export default useEquipmentOperations;

/**
 * useDriverOperations - Hook za operacije sa vozačima
 * Ekstraktovano iz Dashboard.jsx
 */
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';

export const useDriverOperations = ({ companyCode, fetchDriverAssignments }) => {
  const [companyDrivers, setCompanyDrivers] = useState([]);

  // Fetch company drivers for map assignment
  const fetchCompanyDrivers = useCallback(async () => {
    if (!companyCode) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, phone')
        .eq('company_code', companyCode)
        .eq('role', 'driver')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      setCompanyDrivers(data || []);
    } catch (err) {
      console.error('Error fetching drivers:', err);
    }
  }, [companyCode]);

  // Assign requests to driver from map
  const handleAssignDriverFromMap = useCallback(async (requestIds, driverId) => {
    try {
      const { data, error } = await supabase.rpc('assign_requests_to_driver', {
        p_request_ids: requestIds,
        p_driver_id: driverId,
        p_company_code: companyCode
      });

      if (error) throw error;

      // RPC returns JSON object with success and assigned_count
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result?.success) {
        throw new Error(result?.error || 'Nemate dozvolu za ovu akciju');
      }

      const driver = companyDrivers.find(d => d.id === driverId);
      toast.success(`${result.assigned_count || requestIds.length} zahtev(a) dodeljeno vozaču: ${driver?.name || 'Nepoznato'}`);
    } catch (err) {
      console.error('Error assigning driver:', err);
      throw err;
    }
  }, [companyCode, companyDrivers]);

  // Quick assign single request to driver (from requests table)
  const handleQuickAssignDriver = useCallback(async (requestId, driverId) => {
    try {
      const { data, error } = await supabase.rpc('assign_requests_to_driver', {
        p_request_ids: [requestId],
        p_driver_id: driverId,
        p_company_code: companyCode
      });

      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;

      if (!result?.success) {
        throw new Error(result?.error || 'Nemate dozvolu za ovu akciju');
      }

      if (result?.assigned_count === 0) {
        throw new Error('Zahtev nije pronađen ili ne pripada vašoj firmi');
      }

      const driver = companyDrivers.find(d => d.id === driverId);
      toast.success(`Zahtev dodeljen vozaču: ${driver?.name || 'Nepoznato'}`);

      // Refresh driver assignments to update UI immediately
      if (fetchDriverAssignments) {
        await fetchDriverAssignments(companyCode);
      }
    } catch (err) {
      console.error('Error quick assigning driver:', err);
      toast.error('Greška pri dodeli vozača: ' + err.message);
    }
  }, [companyCode, companyDrivers, fetchDriverAssignments]);

  // Retroactively assign driver to processed request (from history table)
  const handleAssignDriverToProcessed = useCallback(async (requestId, driverId, setProcessedRequests) => {
    try {
      const driver = companyDrivers.find(d => d.id === driverId);

      const { error } = await supabase
        .from('processed_requests')
        .update({
          driver_id: driverId,
          driver_name: driver?.name || null
        })
        .eq('id', requestId)
        .eq('company_code', companyCode);

      if (error) throw error;

      // Update local state
      if (setProcessedRequests) {
        setProcessedRequests(prev => prev.map(r =>
          r.id === requestId
            ? { ...r, driver_id: driverId, driver_name: driver?.name || null }
            : r
        ));
      }

      toast.success(`Vozač ${driver?.name || 'Nepoznato'} evidentiran za zahtev`);
    } catch (err) {
      console.error('Error assigning driver to processed request:', err);
      toast.error('Greška pri evidentiranju vozača: ' + err.message);
    }
  }, [companyCode, companyDrivers]);

  return {
    companyDrivers,
    setCompanyDrivers,
    fetchCompanyDrivers,
    handleAssignDriverFromMap,
    handleQuickAssignDriver,
    handleAssignDriverToProcessed
  };
};

export default useDriverOperations;

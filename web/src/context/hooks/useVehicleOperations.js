/**
 * useVehicleOperations - Hook za operacije sa vozilima
 * Ekstraktovano iz DataContext.jsx
 */
import { supabase } from '../../config/supabase';

export const useVehicleOperations = ({ user, companyCode }) => {
    // Fetch all vehicles for the company
    const fetchVehicles = async () => {
        if (!companyCode) return [];
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .select(`
                    *,
                    vehicle_drivers(
                        id,
                        driver_id,
                        is_primary,
                        assigned_at,
                        driver:driver_id(id, name, phone)
                    )
                `)
                .eq('company_code', companyCode)
                .is('deleted_at', null)
                .order('registration', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching vehicles:', error);
            return [];
        }
    };

    // Create a new vehicle
    const createVehicle = async (vehicleData) => {
        if (!companyCode) throw new Error('Niste prijavljeni');
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .insert({
                    company_code: companyCode,
                    registration: vehicleData.registration?.trim().toUpperCase(),
                    name: vehicleData.name?.trim() || null,
                    brand: vehicleData.brand?.trim() || null,
                    model: vehicleData.model?.trim() || null,
                    year: vehicleData.year || null,
                    capacity_kg: vehicleData.capacity_kg || null,
                    status: vehicleData.status || 'active',
                    notes: vehicleData.notes?.trim() || null
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating vehicle:', error);
            throw error;
        }
    };

    // Update a vehicle
    const updateVehicle = async (vehicleId, vehicleData) => {
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .update({
                    registration: vehicleData.registration?.trim().toUpperCase(),
                    name: vehicleData.name?.trim() || null,
                    brand: vehicleData.brand?.trim() || null,
                    model: vehicleData.model?.trim() || null,
                    year: vehicleData.year || null,
                    capacity_kg: vehicleData.capacity_kg || null,
                    status: vehicleData.status || 'active',
                    notes: vehicleData.notes?.trim() || null
                })
                .eq('id', vehicleId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating vehicle:', error);
            throw error;
        }
    };

    // Delete a vehicle (soft delete)
    const deleteVehicle = async (vehicleId) => {
        try {
            const { error } = await supabase
                .from('vehicles')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', vehicleId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting vehicle:', error);
            throw error;
        }
    };

    // Assign a driver to a vehicle
    const assignDriverToVehicle = async (vehicleId, driverId, isPrimary = false) => {
        try {
            const { data, error } = await supabase
                .from('vehicle_drivers')
                .insert({
                    vehicle_id: vehicleId,
                    driver_id: driverId,
                    is_primary: isPrimary,
                    assigned_by: user?.id
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error assigning driver to vehicle:', error);
            throw error;
        }
    };

    // Remove a driver from a vehicle
    const removeDriverFromVehicle = async (vehicleId, driverId) => {
        try {
            const { error } = await supabase
                .from('vehicle_drivers')
                .delete()
                .eq('vehicle_id', vehicleId)
                .eq('driver_id', driverId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error removing driver from vehicle:', error);
            throw error;
        }
    };

    // Set primary vehicle for a driver
    const setPrimaryVehicle = async (vehicleId, driverId) => {
        try {
            // First, unset all primary flags for this driver
            await supabase
                .from('vehicle_drivers')
                .update({ is_primary: false })
                .eq('driver_id', driverId);

            // Then set the new primary
            const { error } = await supabase
                .from('vehicle_drivers')
                .update({ is_primary: true })
                .eq('vehicle_id', vehicleId)
                .eq('driver_id', driverId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error setting primary vehicle:', error);
            throw error;
        }
    };

    // Get vehicles for a specific driver
    const getDriverVehicles = async (driverId) => {
        try {
            const { data, error } = await supabase
                .from('vehicle_drivers')
                .select(`
                    id,
                    is_primary,
                    vehicle:vehicle_id(*)
                `)
                .eq('driver_id', driverId);

            if (error) throw error;
            return (data || []).map(vd => ({
                ...vd.vehicle,
                is_primary: vd.is_primary
            }));
        } catch (error) {
            console.error('Error getting driver vehicles:', error);
            return [];
        }
    };

    return {
        fetchVehicles,
        createVehicle,
        updateVehicle,
        deleteVehicle,
        assignDriverToVehicle,
        removeDriverFromVehicle,
        setPrimaryVehicle,
        getDriverVehicles
    };
};

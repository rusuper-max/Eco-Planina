import { useCallback } from 'react';
import { supabase } from '../../config/supabase';

/**
 * Hook za upravljanje evidencijom goriva
 */
export const useFuelOperations = () => {

    /**
     * Dohvati sve fuel logove za kompaniju
     */
    const fetchFuelLogs = useCallback(async (options = {}) => {
        const { vehicleId, driverId, fromDate, toDate, limit = 100 } = options;

        let query = supabase
            .from('fuel_logs')
            .select(`
                *,
                vehicle:vehicle_id(id, registration, brand, model),
                driver:driver_id(id, name, phone)
            `)
            .order('date', { ascending: false })
            .limit(limit);

        if (vehicleId) {
            query = query.eq('vehicle_id', vehicleId);
        }
        if (driverId) {
            query = query.eq('driver_id', driverId);
        }
        if (fromDate) {
            query = query.gte('date', fromDate);
        }
        if (toDate) {
            query = query.lte('date', toDate);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }, []);

    /**
     * Kreiraj novi fuel log
     */
    const createFuelLog = useCallback(async (fuelData) => {
        // Izračunaj total_price ako nije prosleđen
        if (fuelData.liters && fuelData.price_per_liter && !fuelData.total_price) {
            fuelData.total_price = parseFloat(fuelData.liters) * parseFloat(fuelData.price_per_liter);
        }

        const { data, error } = await supabase
            .from('fuel_logs')
            .insert(fuelData)
            .select()
            .single();

        if (error) throw error;
        return data;
    }, []);

    /**
     * Ažuriraj fuel log
     */
    const updateFuelLog = useCallback(async (id, updates) => {
        // Izračunaj total_price ako se menjaju liters ili price_per_liter
        if (updates.liters && updates.price_per_liter) {
            updates.total_price = parseFloat(updates.liters) * parseFloat(updates.price_per_liter);
        }

        const { data, error } = await supabase
            .from('fuel_logs')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }, []);

    /**
     * Obriši fuel log
     */
    const deleteFuelLog = useCallback(async (id) => {
        const { error } = await supabase
            .from('fuel_logs')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }, []);

    /**
     * Dohvati statistiku po vozilima
     */
    const fetchFuelStatsByVehicle = useCallback(async () => {
        const { data, error } = await supabase
            .from('fuel_stats_by_vehicle')
            .select('*');

        if (error) throw error;
        return data || [];
    }, []);

    /**
     * Dohvati mesečnu statistiku
     */
    const fetchFuelStatsMonthly = useCallback(async (vehicleId = null) => {
        let query = supabase
            .from('fuel_stats_monthly')
            .select('*')
            .order('month', { ascending: false })
            .limit(24); // Poslednjih 24 meseca

        if (vehicleId) {
            query = query.eq('vehicle_id', vehicleId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }, []);

    /**
     * Izračunaj potrošnju goriva za vozilo
     */
    const calculateConsumption = useCallback(async (vehicleId, fromDate = null, toDate = null) => {
        const { data, error } = await supabase
            .rpc('calculate_fuel_consumption', {
                p_vehicle_id: vehicleId,
                p_from_date: fromDate,
                p_to_date: toDate
            });

        if (error) throw error;
        return data || [];
    }, []);

    /**
     * Upload slike računa
     */
    const uploadReceipt = useCallback(async (file, fuelLogId) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${fuelLogId}.${fileExt}`;
        const filePath = `fuel-receipts/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from('uploads')
            .getPublicUrl(filePath);

        // Ažuriraj fuel log sa URL-om slike
        await updateFuelLog(fuelLogId, { receipt_image_url: urlData.publicUrl });

        return urlData.publicUrl;
    }, [updateFuelLog]);

    return {
        fetchFuelLogs,
        createFuelLog,
        updateFuelLog,
        deleteFuelLog,
        fetchFuelStatsByVehicle,
        fetchFuelStatsMonthly,
        calculateConsumption,
        uploadReceipt
    };
};

export default useFuelOperations;

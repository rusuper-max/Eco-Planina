/**
 * useEquipmentOperations - Hook za operacije sa opremom
 * Ekstraktovano iz DataContext.jsx
 */
import { supabase } from '../../config/supabase';

export const useEquipmentOperations = ({ companyCode }) => {
    // Fetch all equipment for current company (RLS handles region filtering)
    const fetchCompanyEquipment = async () => {
        if (!companyCode) return [];
        try {
            let result = await supabase
                .from('equipment')
                .select('*, region:region_id(id, name), assigned_user:assigned_to(id, name)')
                .eq('company_code', companyCode)
                .is('deleted_at', null)
                .order('name');

            // Fallback if region_id or assigned_to column doesn't exist
            if (result.error?.code === 'PGRST200' || result.error?.message?.includes('region_id') || result.error?.message?.includes('assigned_to')) {
                result = await supabase
                    .from('equipment')
                    .select('*')
                    .eq('company_code', companyCode)
                    .is('deleted_at', null)
                    .order('name');
            }

            if (result.error) {
                if (result.error.code === '42P01') return [];
                throw result.error;
            }

            return (result.data || []).map(eq => ({
                ...eq,
                assigned_to_name: eq.assigned_user?.name || null
            }));
        } catch (error) {
            console.error('Error fetching equipment:', error);
            return [];
        }
    };

    // Create new equipment
    const createEquipment = async (equipmentData) => {
        if (!companyCode) throw new Error('Niste prijavljeni');
        try {
            const insertData = {
                company_code: companyCode,
                name: equipmentData.name?.trim(),
                description: equipmentData.description?.trim() || null,
                custom_image_url: equipmentData.customImage || null
            };

            if (equipmentData.region_id !== undefined) {
                insertData.region_id = equipmentData.region_id;
            }

            let result = await supabase
                .from('equipment')
                .insert([insertData])
                .select('*, region:region_id(id, name)')
                .single();

            // Fallback if region_id doesn't exist
            if (result.error?.code === 'PGRST200' || result.error?.message?.includes('region_id')) {
                delete insertData.region_id;
                result = await supabase
                    .from('equipment')
                    .insert([insertData])
                    .select('*')
                    .single();
            }

            const { data, error } = result;
            if (error) throw error;
            return data;
        } catch (error) {
            throw error;
        }
    };

    // Update equipment
    const updateEquipment = async (equipmentId, equipmentData) => {
        if (!equipmentId) throw new Error('Nedostaje ID opreme');
        try {
            const updates = {};
            if (equipmentData.name !== undefined) updates.name = equipmentData.name?.trim();
            if (equipmentData.description !== undefined) updates.description = equipmentData.description?.trim() || null;
            if (equipmentData.customImage !== undefined) updates.custom_image_url = equipmentData.customImage || null;
            if (equipmentData.region_id !== undefined) updates.region_id = equipmentData.region_id;
            if (equipmentData.assigned_to !== undefined) updates.assigned_to = equipmentData.assigned_to;

            let result = await supabase
                .from('equipment')
                .update(updates)
                .eq('id', equipmentId)
                .select('*, region:region_id(id, name)')
                .single();

            // Fallback if region_id doesn't exist
            if (result.error?.code === 'PGRST200' || result.error?.message?.includes('region_id')) {
                delete updates.region_id;
                result = await supabase
                    .from('equipment')
                    .update(updates)
                    .eq('id', equipmentId)
                    .select('*')
                    .single();
            }

            if (result.error) throw result.error;
            return result.data;
        } catch (error) {
            throw error;
        }
    };

    // Delete equipment (soft delete)
    const deleteEquipment = async (equipmentId) => {
        if (!equipmentId) throw new Error('Nedostaje ID opreme');
        try {
            const { error } = await supabase
                .from('equipment')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', equipmentId);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    // Migrate equipment from localStorage to database (one-time migration)
    const migrateEquipmentFromLocalStorage = async () => {
        if (!companyCode) return { migrated: 0 };
        try {
            const localKey = 'ecomountaint_equipment';
            const saved = localStorage.getItem(localKey);
            if (!saved) return { migrated: 0 };

            const localEquipment = JSON.parse(saved);
            if (!Array.isArray(localEquipment) || localEquipment.length === 0) {
                return { migrated: 0 };
            }

            // Check if we already have equipment in DB
            const existing = await fetchCompanyEquipment();
            if (existing.length > 0) {
                localStorage.removeItem(localKey);
                return { migrated: 0, message: 'Već migrirano' };
            }

            // Insert all local equipment to database
            const toInsert = localEquipment.map(eq => ({
                company_code: companyCode,
                name: eq.name?.trim() || eq.label?.trim() || 'Bez naziva',
                description: eq.description?.trim() || null,
                custom_image_url: eq.customImage || null
            }));

            const { data, error } = await supabase
                .from('equipment')
                .insert(toInsert)
                .select();

            if (error) throw error;

            localStorage.removeItem(localKey);
            return { migrated: data?.length || 0 };
        } catch (error) {
            console.error('Error migrating equipment:', error);
            return { migrated: 0, error: error.message };
        }
    };

    return {
        fetchCompanyEquipment,
        createEquipment,
        updateEquipment,
        deleteEquipment,
        migrateEquipmentFromLocalStorage
    };
};

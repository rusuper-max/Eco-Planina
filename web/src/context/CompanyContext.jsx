import { createContext, useContext } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';

const CompanyContext = createContext(null);

export const useCompany = () => {
    const context = useContext(CompanyContext);
    if (!context) {
        throw new Error('useCompany must be used within CompanyProvider');
    }
    return context;
};

export const CompanyProvider = ({ children }) => {
    const { user, companyCode, companyName, setUser, setCompanyName } = useAuth();

    const fetchCompanyEquipmentTypes = async () => {
        if (!companyCode) return [];
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('equipment_types')
                .eq('code', companyCode)
                .is('deleted_at', null)
                .single();
            if (error) throw error;
            return data?.equipment_types || [];
        } catch (error) {
            console.error('Error fetching equipment types:', error);
            return [];
        }
    };

    const updateCompanyEquipmentTypes = async (equipmentTypes) => {
        if (!companyCode) throw new Error('Nema kompanije');
        try {
            const { error } = await supabase.from('companies').update({ equipment_types: equipmentTypes }).eq('code', companyCode);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const fetchCompanyWasteTypes = async () => {
        if (!companyCode) return [];
        try {
            // First try new waste_types table
            const { data: tableData, error: tableError } = await supabase
                .from('waste_types')
                .select('id, name, icon, description, region_id, custom_image_url, updated_at')
                .eq('company_code', companyCode)
                .is('deleted_at', null)
                .order('name');

            // If waste_types table exists and has data, use it
            // Map 'name' to 'label' and 'custom_image_url' to 'customImage' for UI compatibility
            if (!tableError && tableData && tableData.length > 0) {
                const mapped = tableData.map(wt => ({
                    ...wt,
                    label: wt.name, // UI uses 'label', DB uses 'name'
                    customImage: wt.custom_image_url, // UI uses 'customImage', DB uses 'custom_image_url'
                }));
                return mapped;
            }

            // Fallback to JSONB in companies table (legacy)
            const { data, error } = await supabase
                .from('companies')
                .select('waste_types')
                .eq('code', companyCode)
                .is('deleted_at', null)
                .maybeSingle(); // Use maybeSingle instead of single to avoid 406 error

            if (error) {
                console.error('Error fetching company waste types:', error);
                return [];
            }
            return data?.waste_types || [];
        } catch (error) {
            console.error('Error fetching waste types:', error);
            return [];
        }
    };

    // Legacy function - updates JSONB in companies table
    // New approach uses waste_types table with region support
    const updateCompanyWasteTypes = async (wasteTypes) => {
        if (!companyCode) throw new Error('Nema kompanije');
        try {
            // Also update legacy JSONB for backwards compatibility
            const { error } = await supabase.from('companies').update({ waste_types: wasteTypes }).eq('code', companyCode);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    // New waste_types table CRUD functions
    const createWasteType = async (wasteTypeData) => {
        if (!companyCode) throw new Error('Niste prijavljeni');
        try {
            // UI sends 'label', DB expects 'name'; UI sends 'customImage', DB expects 'custom_image_url'
            const insertData = {
                company_code: companyCode,
                name: (wasteTypeData.name || wasteTypeData.label)?.trim(),
                icon: wasteTypeData.icon || '📦',
                description: wasteTypeData.description?.trim() || null
            };
            if (wasteTypeData.region_id !== undefined) {
                insertData.region_id = wasteTypeData.region_id;
            }
            if (wasteTypeData.customImage !== undefined || wasteTypeData.custom_image_url !== undefined) {
                insertData.custom_image_url = wasteTypeData.custom_image_url || wasteTypeData.customImage || null;
            }

            let result = await supabase
                .from('waste_types')
                .insert([insertData])
                .select('*')
                .single();

            if (result.error) throw result.error;
            // Map back to UI format
            return { ...result.data, label: result.data.name, customImage: result.data.custom_image_url };
        } catch (error) {
            throw error;
        }
    };

    const updateWasteType = async (wasteTypeId, wasteTypeData) => {
        if (!wasteTypeId) throw new Error('Nedostaje ID vrste');

        try {
            // Prepare parameters for RPC function
            const name = (wasteTypeData.name || wasteTypeData.label)?.trim() || null;
            const icon = wasteTypeData.icon || null;
            const description = wasteTypeData.description?.trim() || null;
            const region_id = wasteTypeData.region_id || null;
            // customImage (UI field) takes priority over custom_image_url (DB field)
            let custom_image_url = null;
            if (wasteTypeData.customImage !== undefined) {
                custom_image_url = wasteTypeData.customImage || null;
            } else if (wasteTypeData.custom_image_url !== undefined) {
                custom_image_url = wasteTypeData.custom_image_url || null;
            }

            // Use RPC function to bypass RLS
            const { data: rpcResult, error: rpcError } = await supabase.rpc('update_waste_type', {
                p_waste_type_id: wasteTypeId,
                p_name: name,
                p_icon: icon,
                p_description: description,
                p_region_id: region_id,
                p_custom_image_url: custom_image_url
            });

            if (rpcError) throw rpcError;
            if (!rpcResult) throw new Error('No data returned from update');

            // Map back to UI format
            return {
                ...rpcResult,
                label: rpcResult.name,
                customImage: rpcResult.custom_image_url,
                updated_at: rpcResult.updated_at
            };
        } catch (error) {
            console.error('Error updating waste type:', error);
            throw error;
        }
    };

    const deleteWasteType = async (wasteTypeId) => {
        if (!wasteTypeId) throw new Error('Nedostaje ID vrste');
        if (!companyCode) throw new Error('Nema kompanije');
        try {
            const { error } = await supabase
                .from('waste_types')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', wasteTypeId)
                .eq('company_code', companyCode);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const updateProfile = async (newName) => {
        if (!user) throw new Error('Niste prijavljeni');
        try {
            const { error } = await supabase.from('users').update({ name: newName }).eq('id', user.id);
            if (error) throw error;
            const updatedUser = { ...user, name: newName };
            setUser(updatedUser);
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const updateCompanyName = async (newName) => {
        if (!companyCode) throw new Error('Nemate firmu');
        try {
            const { error } = await supabase.from('companies').update({ name: newName }).eq('code', companyCode);
            if (error) throw error;
            setCompanyName(newName);
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const updateLocation = async (address, lat, lng) => {
        if (!user) throw new Error('Niste prijavljeni');
        try {
            const { error } = await supabase.from('users').update({ address, latitude: lat, longitude: lng }).eq('id', user.id);
            if (error) throw error;
            setUser({ ...user, address, latitude: lat, longitude: lng });
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const fetchCompanyDetails = async (code) => {
        try {
            const { data, error } = await supabase.from('companies').select('*').eq('code', code).is('deleted_at', null).maybeSingle();
            if (error) throw error;
            return data;
        } catch (error) {
            return null;
        }
    };

    // Get company's max pickup hours setting
    const fetchMaxPickupHours = async () => {
        if (!companyCode) return 48; // Default
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('max_pickup_hours')
                .eq('code', companyCode)
                .is('deleted_at', null)
                .maybeSingle();
            if (error) throw error;
            return data?.max_pickup_hours || 48;
        } catch (error) {
            console.error('Error fetching max pickup hours:', error);
            return 48;
        }
    };

    // Update company's max pickup hours setting
    const updateMaxPickupHours = async (hours) => {
        if (!companyCode) throw new Error('Nema kompanije');
        try {
            const { error } = await supabase
                .from('companies')
                .update({ max_pickup_hours: hours })
                .eq('code', companyCode);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const value = {
        fetchCompanyEquipmentTypes,
        updateCompanyEquipmentTypes,
        fetchCompanyWasteTypes,
        updateCompanyWasteTypes,
        // New waste_types table functions
        createWasteType,
        updateWasteType,
        deleteWasteType,
        // Profile functions
        updateProfile,
        updateCompanyName,
        updateLocation,
        fetchCompanyDetails,
        // Pickup settings
        fetchMaxPickupHours,
        updateMaxPickupHours,
    };

    return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
};

export default CompanyContext;

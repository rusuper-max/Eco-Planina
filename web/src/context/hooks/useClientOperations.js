/**
 * useClientOperations - Hook za operacije sa klijentima
 * Ekstraktovano iz DataContext.jsx
 */
import { supabase } from '../../config/supabase';

export const useClientOperations = ({ user, companyCode, supervisorRegionIds }) => {
    const fetchCompanyClients = async () => {
        if (!companyCode) return [];
        try {
            let query = supabase
                .from('users')
                .select('*, region:regions(id, name)')
                .eq('company_code', companyCode)
                .eq('role', 'client')
                .is('deleted_at', null)
                .order('name');

            if (user?.role === 'manager' && user?.region_id) {
                query = query.eq('region_id', user.region_id);
            } else if (user?.role === 'supervisor' && supervisorRegionIds.length > 0) {
                query = query.in('region_id', supervisorRegionIds);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching clients:', error);
            return [];
        }
    };

    const fetchCompanyMembers = async () => {
        if (!companyCode) return [];
        try {
            let query = supabase
                .from('users')
                .select('*, region:regions(id, name)')
                .eq('company_code', companyCode)
                .is('deleted_at', null)
                .order('role', { ascending: false });

            if (user?.role === 'supervisor' && supervisorRegionIds.length > 0) {
                query = query.in('region_id', supervisorRegionIds);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching members:', error);
            return [];
        }
    };

    const updateClientDetails = async (clientId, equipmentTypes, note, pib, allowedWasteTypes = null) => {
        try {
            const { data, error } = await supabase.rpc('update_client_details', {
                p_client_id: clientId,
                p_equipment_types: equipmentTypes || [],
                p_manager_note: note || '',
                p_pib: pib || '',
                p_allowed_waste_types: allowedWasteTypes
            });
            if (error) throw error;
            if (data === false) {
                throw new Error('Nemate dozvolu za ovu akciju');
            }
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const deleteClient = async (clientId) => {
        if (!clientId) throw new Error('Nedostaje ID klijenta');
        if (!user?.id) throw new Error('Korisnik nije prijavljen');
        try {
            const { error } = await supabase.rpc('delete_user_permanently', {
                p_target_user_id: clientId,
                p_requesting_user_id: user.id
            });
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    return {
        fetchCompanyClients,
        fetchCompanyMembers,
        updateClientDetails,
        deleteClient
    };
};

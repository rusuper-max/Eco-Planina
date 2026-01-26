/**
 * useRegionOperations - Hook za operacije sa filijalama
 * Ekstraktovano iz DataContext.jsx
 */
import { supabase } from '../../config/supabase';
import { matchesSearch } from '../../utils/transliterate';

export const useRegionOperations = ({ user, companyCode, supervisorRegionIds, fetchPickupRequests }) => {
    // Fetch all regions for current company
    const fetchCompanyRegions = async () => {
        if (!companyCode) return [];
        try {
            const { data, error } = await supabase
                .from('regions')
                .select(`
                    id,
                    name,
                    inventory_id,
                    created_at,
                    users:users(count)
                `)
                .eq('company_code', companyCode)
                .is('deleted_at', null)
                .is('users.deleted_at', null)
                .order('name');
            if (error) throw error;
            return (data || []).map(r => ({
                ...r,
                userCount: r.users?.[0]?.count || 0
            }));
        } catch (error) {
            console.error('Error fetching regions:', error);
            return [];
        }
    };

    // Create a new region
    const createRegion = async (name) => {
        if (!companyCode || !name) throw new Error('Nedostaju podaci');
        try {
            const { data, error } = await supabase
                .from('regions')
                .insert([{ company_code: companyCode, name: name.trim() }])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            throw error;
        }
    };

    // Update region name
    const updateRegion = async (regionId, name) => {
        if (!regionId || !name) throw new Error('Nedostaju podaci');
        try {
            const { error } = await supabase
                .from('regions')
                .update({ name: name.trim() })
                .eq('id', regionId);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    // Delete region (hard delete)
    const deleteRegion = async (regionId) => {
        if (!regionId) throw new Error('Nedostaje ID filijale');
        if (!user?.id) throw new Error('Korisnik nije prijavljen');
        try {
            const { error } = await supabase.rpc('delete_region', {
                p_region_id: regionId,
                p_user_id: user.id
            });
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    // Assign multiple users to a region (batch update)
    const assignUsersToRegion = async (userIds, regionId) => {
        if (!userIds || userIds.length === 0) return { success: false, message: 'Nema korisnika za dodeljivanje' };
        try {
            const { error } = await supabase
                .from('users')
                .update({ region_id: regionId || null })
                .in('id', userIds)
                .eq('company_code', companyCode);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    // Update own region_id (for first-time region selection)
    const updateOwnRegion = async (regionId) => {
        if (!user?.id) throw new Error('Niste prijavljeni');
        if (!regionId) throw new Error('Morate izabrati filijalu');
        try {
            const { error } = await supabase
                .from('users')
                .update({ region_id: regionId })
                .eq('id', user.id);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    // Set client location and update all their pending requests
    const setClientLocationWithRequests = async (clientId, latitude, longitude) => {
        if (!user) throw new Error('Niste prijavljeni');
        if (!['manager', 'supervisor', 'company_admin', 'admin', 'developer'].includes(user.role)) {
            throw new Error('Nemate dozvolu za ovu akciju');
        }
        const latNum = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
        const lngNum = typeof longitude === 'string' ? parseFloat(longitude) : longitude;

        if (!clientId || !Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
            throw new Error('Nedostaju podaci za lokaciju');
        }

        try {
            const { data: success, error: rpcError } = await supabase.rpc('update_client_location', {
                client_id: clientId,
                lat: latNum,
                lng: lngNum
            });

            if (rpcError) throw rpcError;
            if (!success) throw new Error('Nemate dozvolu za ažuriranje lokacije ovog klijenta');

            await fetchPickupRequests(companyCode);
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    // Fetch users by address pattern (for batch assignment)
    const fetchUsersByAddressPattern = async (pattern, roleFilter = null) => {
        if (!companyCode) return [];
        try {
            let query = supabase
                .from('users')
                .select('id, name, phone, address, role, region_id')
                .eq('company_code', companyCode)
                .is('deleted_at', null)
                .neq('role', 'company_admin')
                .order('name');

            if (roleFilter && roleFilter !== 'all') {
                query = query.eq('role', roleFilter);
            }

            const { data, error } = await query;
            if (error) throw error;

            let results = data || [];

            if (pattern && pattern.trim()) {
                results = results.filter(user =>
                    matchesSearch(user.address, pattern)
                );
            }

            return results;
        } catch (error) {
            console.error('Error searching users by address:', error);
            return [];
        }
    };

    // Get users grouped by region (for visual editor)
    const fetchUsersGroupedByRegion = async () => {
        if (!companyCode) return { regions: [], unassigned: [] };
        try {
            const [regionsRes, usersRes, processedRes, assignmentsRes] = await Promise.all([
                supabase
                    .from('regions')
                    .select('id, name')
                    .eq('company_code', companyCode)
                    .is('deleted_at', null)
                    .order('name'),
                supabase
                    .from('users')
                    .select('id, name, role, region_id, address, pib, allowed_waste_types, phone, created_at, equipment_types')
                    .eq('company_code', companyCode)
                    .is('deleted_at', null)
                    .order('name'),
                supabase
                    .from('processed_requests')
                    .select('client_id, processed_by_id, driver_id')
                    .eq('company_code', companyCode)
                    .is('deleted_at', null),
                supabase
                    .from('driver_assignments')
                    .select('driver_id')
                    .eq('company_code', companyCode)
                    .is('deleted_at', null)
                    .in('status', ['assigned', 'in_progress'])
            ]);

            if (regionsRes.error) throw regionsRes.error;
            if (usersRes.error) throw usersRes.error;

            const clientRequestCounts = {};
            const processedByCounts = {};
            const driverProcessedCounts = {};

            if (!processedRes.error && processedRes.data) {
                processedRes.data.forEach(req => {
                    if (req.client_id) {
                        clientRequestCounts[req.client_id] = (clientRequestCounts[req.client_id] || 0) + 1;
                    }
                    if (req.processed_by_id) {
                        processedByCounts[req.processed_by_id] = (processedByCounts[req.processed_by_id] || 0) + 1;
                    }
                    if (req.driver_id) {
                        driverProcessedCounts[req.driver_id] = (driverProcessedCounts[req.driver_id] || 0) + 1;
                    }
                });
            }

            const activeAssignmentCounts = {};
            if (!assignmentsRes.error && assignmentsRes.data) {
                assignmentsRes.data.forEach(a => {
                    if (a.driver_id) {
                        activeAssignmentCounts[a.driver_id] = (activeAssignmentCounts[a.driver_id] || 0) + 1;
                    }
                });
            }

            const usersWithStats = (usersRes.data || []).map(u => ({
                ...u,
                request_count: clientRequestCounts[u.id] || 0,
                processed_count: u.role === 'manager'
                    ? (processedByCounts[u.id] || 0)
                    : u.role === 'driver'
                        ? (driverProcessedCounts[u.id] || 0)
                        : 0,
                assigned_count: activeAssignmentCounts[u.id] || 0
            }));

            const regions = (regionsRes.data || []).map(region => ({
                ...region,
                users: usersWithStats.filter(u => u.region_id === region.id)
            }));

            const unassigned = usersWithStats.filter(u => !u.region_id);

            return { regions, unassigned };
        } catch (error) {
            console.error('Error fetching users grouped by region:', error);
            return { regions: [], unassigned: [] };
        }
    };

    return {
        fetchCompanyRegions,
        createRegion,
        updateRegion,
        deleteRegion,
        assignUsersToRegion,
        updateOwnRegion,
        setClientLocationWithRequests,
        fetchUsersByAddressPattern,
        fetchUsersGroupedByRegion
    };
};

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';
import { getSearchVariants, matchesSearch } from '../utils/transliterate';

const DataContext = createContext(null);

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within DataProvider');
    }
    return context;
};

export const DataProvider = ({ children }) => {
    const { user, companyCode } = useAuth();
    const [pickupRequests, setPickupRequests] = useState([]);
    const [clientRequests, setClientRequests] = useState([]);
    const [processedNotification, setProcessedNotification] = useState(null);

    // Real-time subscriptions for pickup requests
    useEffect(() => {
        if (!companyCode) return;
        fetchPickupRequests(companyCode);
        const channelName = `pickup_requests_web_${companyCode}`;
        const subscription = supabase
            .channel(channelName)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pickup_requests', filter: `company_code=eq.${companyCode}` }, () => fetchPickupRequests(companyCode))
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pickup_requests', filter: `company_code=eq.${companyCode}` }, () => fetchPickupRequests(companyCode))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pickup_requests' }, () => fetchPickupRequests(companyCode))
            .subscribe();
        return () => { supabase.removeChannel(subscription); };
    }, [companyCode]);

    // Real-time for client requests
    useEffect(() => {
        if (!user || user.role !== 'client') return;
        fetchClientRequests(user);
        const channelName = `client_requests_${user.id}`;
        const subscription = supabase
            .channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pickup_requests', filter: `user_id=eq.${user.id}` }, (payload) => {
                if (payload.eventType === 'UPDATE' && payload.new.status === 'processed' && payload.old?.status === 'pending') {
                    setProcessedNotification({ wasteLabel: payload.new.waste_label || payload.new.waste_type, processedAt: payload.new.processed_at });
                }
                fetchClientRequests(user);
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pickup_requests' }, () => fetchClientRequests(user))
            .subscribe();
        return () => { supabase.removeChannel(subscription); };
    }, [user]);

    const fetchClientRequests = async (currentUser = user) => {
        if (!currentUser) return;
        try {
            // Fetch requests
            const { data: requests, error } = await supabase
                .from('pickup_requests')
                .select('*')
                .eq('user_id', currentUser.id)
                .eq('status', 'pending')
                .is('deleted_at', null)
                .order('created_at', { ascending: false });
            if (error) throw error;

            // Fetch driver assignments for these requests
            if (requests && requests.length > 0) {
                const requestIds = requests.map(r => r.id);
                const { data: assignments, error: assignError } = await supabase
                    .from('driver_assignments')
                    .select('request_id, status, driver:driver_id(id, name, phone), assigned_at')
                    .in('request_id', requestIds)
                    .is('deleted_at', null);

                if (!assignError && assignments) {
                    // Merge assignment data with requests
                    const requestsWithDrivers = requests.map(r => {
                        const assignment = assignments.find(a => a.request_id === r.id);
                        return {
                            ...r,
                            driver_assignment: assignment ? {
                                status: assignment.status,
                                driver_name: assignment.driver?.name,
                                driver_phone: assignment.driver?.phone,
                                assigned_at: assignment.assigned_at
                            } : null
                        };
                    });
                    setClientRequests(requestsWithDrivers);
                    return;
                }
            }
            setClientRequests(requests || []);
        } catch (error) {
            console.error('Error fetching client requests:', error);
        }
    };

    const clearProcessedNotification = () => setProcessedNotification(null);

    const fetchClientHistory = async () => {
        if (!user) return [];
        try {
            const { data, error } = await supabase
                .from('processed_requests')
                .select('*')
                .eq('client_id', user.id)
                .is('deleted_at', null)
                .order('processed_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching client history:', error);
            return [];
        }
    };

    const fetchPickupRequests = async (code = companyCode) => {
        if (!code) return;
        try {
            let query = supabase
                .from('pickup_requests')
                .select('*')
                .eq('company_code', code)
                .eq('status', 'pending')
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            // Menadžeri vide samo zahteve iz svoje filijale
            // Company admin, admin i developer vide sve zahteve
            if (user?.role === 'manager' && user?.region_id) {
                query = query.eq('region_id', user.region_id);
            }

            const { data, error } = await query;
            if (error) throw error;
            setPickupRequests(data || []);
        } catch (error) {
            console.error('Error fetching requests:', error);
        }
    };

    const removePickupRequest = async (id) => {
        try {
            const { error } = await supabase.from('pickup_requests').delete().eq('id', id);
            if (error) throw error;
            setPickupRequests(prev => prev.filter(req => req.id !== id));
        } catch (error) {
            throw error;
        }
    };

    const markRequestAsProcessed = async (request, proofImageUrl = null, processingNote = null, weightData = null) => {
        try {
            const processedRecord = {
                company_code: request.company_code,
                client_id: request.user_id,
                client_name: request.client_name,
                client_address: request.client_address,
                waste_type: request.waste_type,
                waste_label: request.waste_label,
                fill_level: request.fill_level,
                urgency: request.urgency,
                note: request.note,
                processing_note: processingNote,
                created_at: request.created_at,
                proof_image_url: proofImageUrl,
                request_id: request.id, // Store original request ID for linking with driver history
                region_id: request.region_id, // Copy region from pickup_request for RLS filtering
                processed_by_id: user?.id || null, // Track who processed the request
                processed_by_name: user?.name || null, // Store name for easier display
            };

            if (weightData) {
                console.log('weightData received:', weightData);
                // Store weight directly in the weight column (which exists in DB)
                processedRecord.weight = weightData.weight;
                processedRecord.weight_unit = weightData.weight_unit || 'kg';
            }

            console.log('Inserting processedRecord:', processedRecord);
            const { error: insertError } = await supabase.from('processed_requests').insert([processedRecord]);
            if (insertError) throw insertError;

            // Update driver assignment status to 'completed' if exists
            // This preserves driver history after manager processes the request
            await supabase
                .from('driver_assignments')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })
                .eq('request_id', request.id)
                .is('deleted_at', null);

            const { error: deleteError } = await supabase.from('pickup_requests').delete().eq('id', request.id);
            if (deleteError) throw deleteError;

            setPickupRequests(prev => prev.filter(req => req.id !== request.id));
            setProcessedNotification({ wasteLabel: request.waste_label || request.waste_type });
        } catch (error) {
            throw error;
        }
    };

    const updateProcessedRequest = async (id, updates) => {
        try {
            const { error } = await supabase.from('processed_requests').update(updates).eq('id', id);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const deleteProcessedRequest = async (id) => {
        try {
            // Soft delete
            const { error } = await supabase
                .from('processed_requests')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const fetchCompanyClients = async () => {
        console.log('DEBUG fetchCompanyClients, companyCode:', companyCode);
        if (!companyCode) return [];
        try {
            let query = supabase
                .from('users')
                .select('*')
                .eq('company_code', companyCode)
                .eq('role', 'client')
                .is('deleted_at', null)
                .order('name');

            // Menadžeri vide samo klijente iz svoje filijale
            // Company admin, admin i developer vide sve klijente
            if (user?.role === 'manager' && user?.region_id) {
                query = query.eq('region_id', user.region_id);
            }

            const { data, error } = await query;
            console.log('DEBUG fetchCompanyClients result:', { count: data?.length, error });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching clients:', error);
            return [];
        }
    };

    const fetchCompanyMembers = async () => {
        console.log('DEBUG fetchCompanyMembers, companyCode:', companyCode);
        if (!companyCode) return [];
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('company_code', companyCode)
                .is('deleted_at', null)
                .order('role', { ascending: false });
            console.log('DEBUG fetchCompanyMembers result:', { count: data?.length, error });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching members:', error);
            return [];
        }
    };

    const fetchProcessedRequests = async () => {
        if (!companyCode) return [];
        try {
            let query = supabase
                .from('processed_requests')
                .select('*')
                .eq('company_code', companyCode)
                .is('deleted_at', null)
                .order('processed_at', { ascending: false });

            // Menadžeri vide samo svoju filijalu
            // Company admin, admin i developer vide sve filijale
            if (user?.role === 'manager' && user?.region_id) {
                query = query.eq('region_id', user.region_id);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching processed requests:', error);
            return [];
        }
    };

    // Koristi SECURITY DEFINER funkciju za update klijenta
    const updateClientDetails = async (clientId, equipmentTypes, note, pib, allowedWasteTypes = null) => {
        try {
            const { data, error } = await supabase.rpc('update_client_details', {
                p_client_id: clientId,
                p_equipment_types: equipmentTypes || [],
                p_manager_note: note || '',
                p_pib: pib || '',
                p_allowed_waste_types: allowedWasteTypes // null means all types allowed
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

    // Generate short request code (e.g., "A3X7KP")
    const generateRequestCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like 0/O, 1/I
        return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };

    const addPickupRequest = async (requestData) => {
        if (!user || !companyCode) throw new Error('Niste prijavljeni ili nemate firmu');
        try {
            // Map camelCase to snake_case for database
            const { fillLevel, wasteType, wasteLabel, ...rest } = requestData;
            const requestCode = generateRequestCode();
            const { data, error } = await supabase.from('pickup_requests').insert([{
                user_id: user.id,
                company_code: companyCode,
                client_name: user.name,
                client_address: user.address,
                latitude: user.latitude || null,    // Include client's location
                longitude: user.longitude || null,  // Include client's location
                fill_level: fillLevel,
                waste_type: wasteType,
                waste_label: wasteLabel,
                request_code: requestCode,
                region_id: user.region_id || null, // Inherit region from client
                ...rest,
                status: 'pending'
            }]).select().single();
            if (error) throw error;
            return data;
        } catch (error) {
            throw error;
        }
    };

    // Manager creates request on behalf of a client (phone call scenario)
    const createRequestForClient = async (requestData) => {
        if (!user || !companyCode) throw new Error('Niste prijavljeni ili nemate firmu');
        if (user.role !== 'manager' && user.role !== 'company_admin') {
            throw new Error('Nemate dozvolu za ovu akciju');
        }
        try {
            const { userId, clientName, clientAddress, wasteType, wasteLabel, fillLevel, urgency, note, latitude, longitude } = requestData;
            const requestCode = generateRequestCode();

            // Get client's region_id
            const { data: clientData } = await supabase
                .from('users')
                .select('region_id')
                .eq('id', userId)
                .single();

            // Use manager's region if client has no region
            const regionId = clientData?.region_id || user.region_id || null;

            const { error } = await supabase.from('pickup_requests').insert([{
                user_id: userId,
                company_code: companyCode,
                client_name: clientName,
                client_address: clientAddress,
                fill_level: fillLevel,
                waste_type: wasteType,
                waste_label: wasteLabel,
                request_code: requestCode,
                urgency: urgency,
                note: note,
                latitude: latitude,
                longitude: longitude,
                region_id: regionId,
                status: 'pending',
                created_by_manager: user.id // Track who created it
            }]);
            // Note: Removed .select() to avoid SELECT RLS issues for clients without region

            if (error) throw error;

            // Return constructed data since we can't select it back
            return {
                request_code: requestCode,
                client_name: clientName,
                waste_label: wasteLabel,
                status: 'pending'
            };
        } catch (error) {
            throw error;
        }
    };

    const deleteClient = async (clientId) => {
        try {
            // Soft delete
            await supabase.from('users').update({ deleted_at: new Date().toISOString() }).eq('id', clientId);
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    // ============================================
    // REGIONS / FILIJALE FUNKCIJE
    // ============================================

    // Fetch all regions for current company
    const fetchCompanyRegions = async () => {
        if (!companyCode) return [];
        try {
            const { data, error } = await supabase
                .from('regions')
                .select(`
                    id,
                    name,
                    created_at,
                    users:users(count)
                `)
                .eq('company_code', companyCode)
                .is('deleted_at', null)
                .order('name');
            if (error) throw error;
            // Transform count from array to number
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

    // Delete region (soft delete)
    const deleteRegion = async (regionId) => {
        if (!regionId) throw new Error('Nedostaje ID filijale');
        try {
            const { error } = await supabase
                .from('regions')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', regionId);
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

    // Fetch users by address pattern (for batch assignment)
    // Uses transliteration to match both Latin and Cyrillic addresses
    const fetchUsersByAddressPattern = async (pattern, roleFilter = null) => {
        if (!companyCode) return [];
        try {
            let query = supabase
                .from('users')
                .select('id, name, phone, address, role, region_id')
                .eq('company_code', companyCode)
                .is('deleted_at', null)
                .neq('role', 'company_admin') // Exclude company owner from assignment
                .order('name');

            // Apply role filter if provided (at database level for efficiency)
            if (roleFilter && roleFilter !== 'all') {
                query = query.eq('role', roleFilter);
            }

            const { data, error } = await query;
            if (error) throw error;

            let results = data || [];

            // Apply address filter with transliteration (client-side for script-agnostic matching)
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
            const [regionsRes, usersRes] = await Promise.all([
                supabase
                    .from('regions')
                    .select('id, name')
                    .eq('company_code', companyCode)
                    .is('deleted_at', null)
                    .order('name'),
                supabase
                    .from('users')
                    .select('id, name, role, region_id, address')
                    .eq('company_code', companyCode)
                    .is('deleted_at', null)
                    .order('name')
            ]);

            if (regionsRes.error) throw regionsRes.error;
            if (usersRes.error) throw usersRes.error;

            const regions = (regionsRes.data || []).map(region => ({
                ...region,
                users: (usersRes.data || []).filter(u => u.region_id === region.id)
            }));

            const unassigned = (usersRes.data || []).filter(u => !u.region_id);

            return { regions, unassigned };
        } catch (error) {
            console.error('Error fetching users grouped by region:', error);
            return { regions: [], unassigned: [] };
        }
    };

    // ============================================
    // EQUIPMENT / OPREMA FUNKCIJE
    // ============================================

    // Fetch all equipment for current company (RLS handles region filtering)
    const fetchCompanyEquipment = async () => {
        if (!companyCode) return [];
        try {
            // Try with region join first
            let result = await supabase
                .from('equipment')
                .select('*, region:region_id(id, name)')
                .eq('company_code', companyCode)
                .is('deleted_at', null)
                .order('name');

            // If region_id column doesn't exist (PGRST200), fallback to simple query
            if (result.error?.code === 'PGRST200' || result.error?.message?.includes('region_id')) {
                result = await supabase
                    .from('equipment')
                    .select('*')
                    .eq('company_code', companyCode)
                    .is('deleted_at', null)
                    .order('name');
            }

            if (result.error) {
                // If table doesn't exist yet, return empty array
                if (result.error.code === '42P01') return [];
                throw result.error;
            }
            return result.data || [];
        } catch (error) {
            console.error('Error fetching equipment:', error);
            return [];
        }
    };

    // Create new equipment
    // - company_admin: can create company-wide (region_id = null) or for specific region
    // - manager: must specify their region_id (enforced by RLS)
    const createEquipment = async (equipmentData) => {
        if (!companyCode) throw new Error('Niste prijavljeni');
        try {
            const insertData = {
                company_code: companyCode,
                name: equipmentData.name?.trim(),
                description: equipmentData.description?.trim() || null,
                custom_image_url: equipmentData.customImage || null
            };

            // If region_id is provided, include it (manager must provide their region)
            // If null/undefined, it's company-wide (only company_admin can do this via RLS)
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
                // Already migrated, clear localStorage
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

            // Clear localStorage after successful migration
            localStorage.removeItem(localKey);

            return { migrated: data?.length || 0 };
        } catch (error) {
            console.error('Error migrating equipment:', error);
            return { migrated: 0, error: error.message };
        }
    };

    const value = {
        pickupRequests,
        clientRequests,
        processedNotification,
        clearProcessedNotification,
        fetchClientRequests,
        fetchClientHistory,
        removePickupRequest,
        markRequestAsProcessed,
        updateProcessedRequest,
        deleteProcessedRequest,
        fetchCompanyClients,
        fetchCompanyMembers,
        fetchProcessedRequests,
        updateClientDetails,
        addPickupRequest,
        createRequestForClient,
        fetchPickupRequests,
        deleteClient,
        // Region functions
        fetchCompanyRegions,
        createRegion,
        updateRegion,
        deleteRegion,
        assignUsersToRegion,
        fetchUsersByAddressPattern,
        fetchUsersGroupedByRegion,
        // Equipment functions
        fetchCompanyEquipment,
        createEquipment,
        updateEquipment,
        deleteEquipment,
        migrateEquipmentFromLocalStorage,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export default DataContext;

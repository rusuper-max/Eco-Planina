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
    const [driverAssignments, setDriverAssignments] = useState([]); // All active assignments for company
    const [driverLocations, setDriverLocations] = useState([]); // Real-time driver locations
    const [processedNotification, setProcessedNotification] = useState(null);

    // Real-time subscriptions for pickup requests and driver assignments
    useEffect(() => {
        if (!companyCode) return;
        fetchPickupRequests(companyCode);
        fetchDriverAssignments(companyCode);

        const channelRequest = supabase
            .channel(`pickup_requests_web_${companyCode}_${user?.region_id || 'all'}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pickup_requests', filter: `company_code=eq.${companyCode}` }, () => fetchPickupRequests(companyCode))
            .subscribe();

        const channelAssignments = supabase
            .channel(`driver_assignments_web_${companyCode}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_assignments', filter: `company_code=eq.${companyCode}` }, () => fetchDriverAssignments(companyCode))
            .subscribe();

        // Fallback polling every 45 seconds for driver assignment status updates
        // This ensures manager sees status changes even if realtime subscription fails
        const pollInterval = setInterval(() => {
            fetchDriverAssignments(companyCode);
        }, 45000);

        return () => {
            supabase.removeChannel(channelRequest);
            supabase.removeChannel(channelAssignments);
            clearInterval(pollInterval);
        };
    }, [companyCode, user?.region_id]);

    // Refresh data when tab becomes visible again (handles minimize, tab switch, etc.)
    useEffect(() => {
        if (!companyCode) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Tab is now visible - refresh data
                fetchPickupRequests(companyCode);
                fetchDriverAssignments(companyCode);
                if (['manager', 'company_admin', 'admin', 'developer'].includes(user?.role)) {
                    fetchDriverLocations(companyCode);
                }
            }
        };

        const handleFocus = () => {
            // Window regained focus - refresh data
            fetchPickupRequests(companyCode);
            fetchDriverAssignments(companyCode);
            if (['manager', 'company_admin', 'admin', 'developer'].includes(user?.role)) {
                fetchDriverLocations(companyCode);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [companyCode, user?.role]);

    // Real-time subscriptions for driver locations
    useEffect(() => {
        if (!companyCode || !['manager', 'company_admin', 'admin', 'developer'].includes(user?.role)) return;
        fetchDriverLocations(companyCode);

        const channelLocations = supabase
            .channel(`driver_locations_web_${companyCode}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_locations', filter: `company_code=eq.${companyCode}` }, () => fetchDriverLocations(companyCode))
            .subscribe();

        return () => {
            supabase.removeChannel(channelLocations);
        };
    }, [companyCode, user?.role]);

    // Fetch driver locations
    const fetchDriverLocations = async (code = companyCode) => {
        if (!code) return;
        try {
            const { data, error } = await supabase
                .from('driver_locations')
                .select('*, driver:driver_id(id, name, phone, role)')
                .eq('company_code', code)
                .gte('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // Last 30 minutes

            if (error) throw error;
            setDriverLocations(data || []);
        } catch (error) {
            console.error('Error fetching driver locations:', error);
        }
    };

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
                    .select('request_id, status, assigned_by, driver:driver_id(id, name, phone), assigner:assigned_by(id, name), assigned_at')
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
                                assigned_by_id: assignment.assigned_by,
                                assigned_by_name: assignment.assigner?.name,
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
                .is('client_hidden_at', null) // Client's own hide filter
                .order('processed_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching client history:', error);
            return [];
        }
    };

    // Client can hide processed request from their own history
    const hideClientHistoryItem = async (id) => {
        if (!user) throw new Error('Niste prijavljeni');
        try {
            const { data, error } = await supabase
                .from('processed_requests')
                .update({ client_hidden_at: new Date().toISOString() })
                .eq('id', id)
                .eq('client_id', user.id) // Security: only own requests
                .select();

            if (error) {
                console.error('Hide client history error:', error);
                throw error;
            }

            if (!data || data.length === 0) {
                throw new Error('Zahtev nije pronađen');
            }

            return { success: true };
        } catch (error) {
            console.error('hideClientHistoryItem failed:', error);
            throw error;
        }
    };

    const fetchDriverAssignments = async (code = companyCode) => {
        if (!code) return;
        try {
            const { data, error } = await supabase
                .from('driver_assignments')
                .select(`
                    *,
                    driver:driver_id(id, name, phone),
                    assigner:assigned_by(id, name)
                `)
                .eq('company_code', code)
                .is('deleted_at', null)
                .neq('status', 'completed') // Maybe show completed too? Dashboard logic implies active ones?
                // Actually Dashboard uses it to find assignment for pending request.
                // If the request is pending, the assignment MUST be active (not completed).
                // Or if it IS completed but not processed?
                // Let's fetch ALL non-deleted assignments for safety, or just active ones.
                // Given "pending requests" context, active ones are most relevant.
                // But let's filter purely by deleted_at for now to be safe.
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDriverAssignments(data || []);
        } catch (error) {
            console.error('Error fetching driver assignments:', error);
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

    // Reject request - uses atomic RPC to prevent duplicates
    const rejectPickupRequest = async (request, rejectionNote = null) => {
        try {
            const { data, error } = await supabase.rpc('reject_pickup_request', {
                p_request_id: request.id,
                p_company_code: request.company_code,
                p_processor_id: user?.id || null,
                p_processor_name: user?.name || 'Nepoznato',
                p_notes: rejectionNote || 'Zahtev odbijen'
            });

            if (error) throw error;

            // Check RPC result
            if (!data?.success) {
                throw new Error(data?.error || 'Greška pri odbijanju zahteva');
            }

            setPickupRequests(prev => prev.filter(req => req.id !== request.id));
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    // Process request - uses atomic RPC to prevent duplicates
    const markRequestAsProcessed = async (request, proofImageUrl = null, processingNote = null, weightData = null, retroactiveDriverInfo = null) => {
        try {
            const { data, error } = await supabase.rpc('process_pickup_request', {
                p_request_id: request.id,
                p_company_code: request.company_code,
                p_processor_id: user?.id || null,
                p_processor_name: user?.name || 'Nepoznato',
                p_status: 'completed',
                p_notes: processingNote,
                p_driver_id: retroactiveDriverInfo?.id || null,
                p_driver_name: retroactiveDriverInfo?.name || null,
                p_proof_image_url: proofImageUrl,
                p_weight: weightData?.weight || null,
                p_weight_unit: weightData?.weight_unit || 'kg'
            });

            if (error) throw error;

            // Check RPC result
            if (!data?.success) {
                throw new Error(data?.error || 'Greška pri obradi zahteva');
            }

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
            // Soft delete - add company_code filter for security
            const { data, error } = await supabase
                .from('processed_requests')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)
                .eq('company_code', companyCode)
                .select();

            if (error) {
                console.error('Delete processed request error:', error);
                throw error;
            }

            // Check if any rows were affected
            if (!data || data.length === 0) {
                console.warn('No rows updated - request may not exist or belong to different company');
                throw new Error('Zahtev nije pronađen ili nemate dozvolu za brisanje');
            }

            return { success: true };
        } catch (error) {
            console.error('deleteProcessedRequest failed:', error);
            throw error;
        }
    };

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

            // Menadžeri vide samo klijente iz svoje filijale
            // Company admin, admin i developer vide sve klijente
            if (user?.role === 'manager' && user?.region_id) {
                query = query.eq('region_id', user.region_id);
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
            const { data, error } = await supabase
                .from('users')
                .select('*, region:regions(id, name)')
                .eq('company_code', companyCode)
                .is('deleted_at', null)
                .order('role', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching members:', error);
            return [];
        }
    };

    const fetchProcessedRequests = async ({ page = 1, pageSize = 10, filters = {} } = {}) => {
        if (!companyCode) return { data: [], count: 0 };
        try {
            let query = supabase
                .from('processed_requests')
                .select('*', { count: 'exact' })
                .eq('company_code', companyCode)
                .is('deleted_at', null)
                .order('processed_at', { ascending: false });

            // RLS filter is strict, but manual filtering doesn't hurt
            if (user?.role === 'manager' && user?.region_id) {
                query = query.eq('region_id', user.region_id);
            }

            // Apply filters
            if (filters.search) {
                const s = filters.search.toLowerCase();
                // Naive client-side search isn't possible with server-side pagination efficiently 
                // unless we use .or() with ilike.
                // For now, let's try basic text matching on client_name or waste_label
                query = query.or(`client_name.ilike.%${filters.search}%,waste_label.ilike.%${filters.search}%`);
            }
            if (filters.wasteType && filters.wasteType !== 'all') {
                query = query.eq('waste_type', filters.wasteType);
            }

            // Pagination
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;

            return {
                data: data || [],
                count: count || 0,
                totalPages: Math.ceil((count || 0) / pageSize)
            };
        } catch (error) {
            console.error('Error fetching processed requests:', error);
            return { data: [], count: 0 };
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
        if (!clientId) throw new Error('Nedostaje ID klijenta');
        if (!user?.id) throw new Error('Korisnik nije prijavljen');
        try {
            // Hard delete using RPC
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
                    inventory_id,
                    created_at,
                    users:users(count)
                `)
                .eq('company_code', companyCode)
                .is('deleted_at', null)
                .is('users.deleted_at', null)
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
    // Uses RPC function that updates both users and pickup_requests in one atomic operation
    const setClientLocationWithRequests = async (clientId, latitude, longitude) => {
        if (!user) throw new Error('Niste prijavljeni');
        if (!['manager', 'company_admin', 'admin', 'developer'].includes(user.role)) {
            throw new Error('Nemate dozvolu za ovu akciju');
        }
        const latNum = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
        const lngNum = typeof longitude === 'string' ? parseFloat(longitude) : longitude;

        if (!clientId || !Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
            throw new Error('Nedostaju podaci za lokaciju');
        }

        try {
            // RPC function updates both client and all their pending requests atomically
            const { data: success, error: rpcError } = await supabase.rpc('update_client_location', {
                client_id: clientId,
                lat: latNum,
                lng: lngNum
            });

            if (rpcError) throw rpcError;
            if (!success) throw new Error('Nemate dozvolu za ažuriranje lokacije ovog klijenta');

            // Refresh pickup requests to reflect new location
            await fetchPickupRequests(companyCode);

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
                // Fetch processed requests for stats (client_id, processed_by_id, driver_id)
                supabase
                    .from('processed_requests')
                    .select('client_id, processed_by_id, driver_id')
                    .eq('company_code', companyCode)
                    .is('deleted_at', null),
                // Fetch active assignments for drivers
                supabase
                    .from('driver_assignments')
                    .select('driver_id')
                    .eq('company_code', companyCode)
                    .is('deleted_at', null)
                    .in('status', ['assigned', 'in_progress'])
            ]);

            if (regionsRes.error) throw regionsRes.error;
            if (usersRes.error) throw usersRes.error;
            // Note: processedRes and assignmentsRes errors are non-fatal - we just won't have stats

            // Count stats per user
            const clientRequestCounts = {};  // How many requests a client made
            const processedByCounts = {};    // How many requests a manager processed
            const driverProcessedCounts = {}; // How many requests a driver completed

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

            // Count active assignments per driver
            const activeAssignmentCounts = {};
            if (!assignmentsRes.error && assignmentsRes.data) {
                assignmentsRes.data.forEach(a => {
                    if (a.driver_id) {
                        activeAssignmentCounts[a.driver_id] = (activeAssignmentCounts[a.driver_id] || 0) + 1;
                    }
                });
            }

            // Add stats to users based on role
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

    // ============================================
    // EQUIPMENT / OPREMA FUNKCIJE
    // ============================================

    // Fetch all equipment for current company (RLS handles region filtering)
    const fetchCompanyEquipment = async () => {
        if (!companyCode) return [];
        try {
            // Try with region and assigned_to joins first
            let result = await supabase
                .from('equipment')
                .select('*, region:region_id(id, name), assigned_user:assigned_to(id, name)')
                .eq('company_code', companyCode)
                .is('deleted_at', null)
                .order('name');

            // If region_id or assigned_to column doesn't exist, fallback to simple query
            if (result.error?.code === 'PGRST200' || result.error?.message?.includes('region_id') || result.error?.message?.includes('assigned_to')) {
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

            // Map assigned_user to assigned_to_name for frontend compatibility
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

    // =============================================================================
    // INVENTORY FUNCTIONS
    // =============================================================================

    // Fetch all inventories for the company
    const fetchInventories = async () => {
        if (!companyCode) return [];
        try {
            const { data, error } = await supabase
                .from('inventories')
                .select('*')
                .eq('company_code', companyCode)
                .is('deleted_at', null)
                .order('name');
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching inventories:', error);
            return [];
        }
    };

    // Create a new inventory (warehouse)
    const createInventory = async (inventoryData) => {
        if (!companyCode) throw new Error('Niste prijavljeni');
        try {
            const { data, error } = await supabase
                .from('inventories')
                .insert({
                    company_code: companyCode,
                    name: inventoryData.name?.trim(),
                    description: inventoryData.description?.trim() || null,
                    manager_visibility: inventoryData.manager_visibility || 'full'
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating inventory:', error);
            throw error;
        }
    };

    // Update an inventory
    const updateInventory = async (inventoryId, updates) => {
        try {
            const { data, error } = await supabase
                .from('inventories')
                .update({
                    name: updates.name?.trim(),
                    description: updates.description?.trim() || null,
                    manager_visibility: updates.manager_visibility
                })
                .eq('id', inventoryId)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating inventory:', error);
            throw error;
        }
    };

    // Delete an inventory (soft delete)
    const deleteInventory = async (inventoryId) => {
        try {
            const { error } = await supabase
                .from('inventories')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', inventoryId);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting inventory:', error);
            throw error;
        }
    };

    // Fetch inventory items (stock levels) for an inventory or all
    const fetchInventoryItems = async (inventoryId = null) => {
        if (!companyCode) return [];
        try {
            let query = supabase
                .from('inventory_items')
                .select(`
                    *,
                    inventory:inventory_id(id, name, company_code),
                    waste_type:waste_type_id(id, name, icon)
                `);

            if (inventoryId) {
                query = query.eq('inventory_id', inventoryId);
            }

            const { data, error } = await query.order('quantity_kg', { ascending: false });
            if (error) throw error;

            // Filter by company_code (RLS should handle this, but double check)
            return (data || []).filter(item =>
                item.inventory?.company_code === companyCode
            );
        } catch (error) {
            console.error('Error fetching inventory items:', error);
            return [];
        }
    };

    // Fetch inventory transactions (history)
    const fetchInventoryTransactions = async (filters = {}) => {
        if (!companyCode) return [];
        try {
            let query = supabase
                .from('inventory_transactions')
                .select(`
                    *,
                    inventory:inventory_id(id, name, company_code),
                    waste_type:waste_type_id(id, name, icon),
                    region:region_id(id, name)
                `)
                .order('created_at', { ascending: false });

            if (filters.inventoryId) {
                query = query.eq('inventory_id', filters.inventoryId);
            }
            if (filters.regionId) {
                query = query.eq('region_id', filters.regionId);
            }
            if (filters.wasteTypeId) {
                query = query.eq('waste_type_id', filters.wasteTypeId);
            }
            if (filters.transactionType) {
                query = query.eq('transaction_type', filters.transactionType);
            }
            if (filters.startDate) {
                query = query.gte('created_at', filters.startDate);
            }
            if (filters.endDate) {
                query = query.lte('created_at', filters.endDate);
            }
            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Filter by company_code
            return (data || []).filter(t =>
                t.inventory?.company_code === companyCode
            );
        } catch (error) {
            console.error('Error fetching inventory transactions:', error);
            return [];
        }
    };

    // Create manual inventory adjustment
    const createInventoryAdjustment = async (inventoryId, wasteTypeId, quantity, transactionType, notes) => {
        if (!companyCode) throw new Error('Niste prijavljeni');
        try {
            const { data, error } = await supabase.rpc('create_inventory_adjustment', {
                p_inventory_id: inventoryId,
                p_waste_type_id: wasteTypeId,
                p_quantity_kg: quantity,
                p_transaction_type: transactionType,
                p_notes: notes,
                p_created_by: user?.id,
                p_created_by_name: user?.name
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating adjustment:', error);
            throw error;
        }
    };

    // Assign a region to an inventory
    const assignRegionToInventory = async (regionId, inventoryId) => {
        if (!companyCode) throw new Error('Niste prijavljeni');
        try {
            const { data, error } = await supabase.rpc('assign_region_inventory', {
                p_region_id: regionId,
                p_inventory_id: inventoryId ?? null
            });
            if (error) throw error;
            if (!data) throw new Error('Dodela nije sačuvana');
            return data; // Returns updated region
        } catch (error) {
            console.error('Error assigning region to inventory:', error);
            throw error;
        }
    };

    // Get aggregated inventory stats by region (for manager view)
    const getInventoryStatsByRegion = async (inventoryId) => {
        if (!companyCode) return [];
        try {
            const { data, error } = await supabase
                .from('inventory_transactions')
                .select(`
                    region_id,
                    region_name,
                    waste_type_id,
                    transaction_type,
                    quantity_kg
                `)
                .eq('inventory_id', inventoryId)
                .eq('transaction_type', 'in');

            if (error) throw error;

            // Aggregate by region
            const stats = {};
            (data || []).forEach(t => {
                const key = t.region_id || 'unknown';
                if (!stats[key]) {
                    stats[key] = {
                        region_id: t.region_id,
                        region_name: t.region_name || 'Nepoznato',
                        total_kg: 0,
                        by_waste_type: {}
                    };
                }
                stats[key].total_kg += parseFloat(t.quantity_kg) || 0;
                const wtKey = t.waste_type_id;
                stats[key].by_waste_type[wtKey] = (stats[key].by_waste_type[wtKey] || 0) + (parseFloat(t.quantity_kg) || 0);
            });

            return Object.values(stats).sort((a, b) => b.total_kg - a.total_kg);
        } catch (error) {
            console.error('Error getting inventory stats by region:', error);
            return [];
        }
    };

    // =============================================================================
    // INVENTORY OUTBOUND FUNCTIONS
    // =============================================================================

    // Fetch all outbounds for company
    const fetchOutbounds = async (filters = {}) => {
        if (!companyCode) return [];
        try {
            let query = supabase
                .from('inventory_outbound')
                .select(`
                    *,
                    inventory:inventory_id(id, name),
                    waste_type:waste_type_id(id, name, icon),
                    creator:created_by(id, name),
                    sender:sent_by(id, name),
                    confirmer:confirmed_by(id, name),
                    region:region_id(id, name)
                `)
                .eq('company_code', companyCode)
                .order('created_at', { ascending: false });

            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.inventoryId) {
                query = query.eq('inventory_id', filters.inventoryId);
            }
            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching outbounds:', error);
            return [];
        }
    };

    // Create new outbound
    const createOutbound = async (outboundData) => {
        if (!companyCode) throw new Error('Niste prijavljeni');
        try {
            const { data, error } = await supabase.rpc('create_outbound', {
                p_inventory_id: outboundData.inventory_id,
                p_waste_type_id: outboundData.waste_type_id,
                p_quantity_kg: outboundData.quantity_kg,
                p_recipient_name: outboundData.recipient_name,
                p_recipient_address: outboundData.recipient_address || null,
                p_recipient_contact: outboundData.recipient_contact || null,
                p_price_per_kg: outboundData.price_per_kg || null,
                p_notes: outboundData.notes || null
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating outbound:', error);
            throw error;
        }
    };

    // Send outbound (pending -> sent)
    const sendOutbound = async (outboundId) => {
        try {
            const { data, error } = await supabase.rpc('send_outbound', {
                p_outbound_id: outboundId
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error sending outbound:', error);
            throw error;
        }
    };

    // Confirm outbound (sent -> confirmed)
    const confirmOutbound = async (outboundId, quantityReceivedKg) => {
        try {
            const { data, error } = await supabase.rpc('confirm_outbound', {
                p_outbound_id: outboundId,
                p_quantity_received_kg: quantityReceivedKg
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error confirming outbound:', error);
            throw error;
        }
    };

    // Cancel outbound
    const cancelOutbound = async (outboundId) => {
        try {
            const { data, error } = await supabase.rpc('cancel_outbound', {
                p_outbound_id: outboundId
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error cancelling outbound:', error);
            throw error;
        }
    };

    // Fetch kalo records
    const fetchKalo = async (filters = {}) => {
        if (!companyCode) return [];
        try {
            let query = supabase
                .from('inventory_kalo')
                .select(`
                    *,
                    inventory:inventory_id(id, name),
                    waste_type:waste_type_id(id, name, label, icon),
                    outbound:outbound_id(id, recipient_name, quantity_planned_kg, quantity_received_kg)
                `)
                .eq('company_code', companyCode)
                .order('created_at', { ascending: false });

            if (filters.inventoryId) {
                query = query.eq('inventory_id', filters.inventoryId);
            }
            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching kalo:', error);
            return [];
        }
    };

    // =============================================================================
    // ANALYTICS FUNCTIONS
    // =============================================================================

    // Reset all manager analytics (delete all processed_requests for company)
    // This is a company_admin only function
    const resetManagerAnalytics = async () => {
        if (!companyCode) throw new Error('Niste prijavljeni');
        if (user?.role !== 'company_admin' && !user?.is_owner) {
            throw new Error('Samo vlasnik firme može resetovati statistiku');
        }
        try {
            // Soft delete all processed requests for this company
            const { error } = await supabase
                .from('processed_requests')
                .update({ deleted_at: new Date().toISOString() })
                .eq('company_code', companyCode)
                .is('deleted_at', null);

            if (error) throw error;

            // Also clean up completed driver assignments
            await supabase
                .from('driver_assignments')
                .update({ deleted_at: new Date().toISOString() })
                .eq('company_code', companyCode)
                .eq('status', 'completed')
                .is('deleted_at', null);

            return { success: true };
        } catch (error) {
            console.error('Error resetting analytics:', error);
            throw error;
        }
    };

    // =============================================================================
    // VEHICLE FUNCTIONS
    // =============================================================================

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

    const value = {
        pickupRequests,
        driverAssignments,
        driverLocations,
        clientRequests,
        processedNotification,
        clearProcessedNotification,
        fetchClientRequests,
        fetchClientHistory,
        hideClientHistoryItem,
        removePickupRequest,
        rejectPickupRequest,
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
        fetchDriverAssignments,
        deleteClient,
        // Region functions
        fetchCompanyRegions,
        createRegion,
        updateRegion,
        deleteRegion,
        assignUsersToRegion,
        updateOwnRegion,
        setClientLocationWithRequests,
        fetchUsersByAddressPattern,
        fetchUsersGroupedByRegion,
        // Equipment functions
        fetchCompanyEquipment,
        createEquipment,
        updateEquipment,
        deleteEquipment,
        migrateEquipmentFromLocalStorage,
        // Analytics functions
        resetManagerAnalytics,
        // Vehicle functions
        fetchVehicles,
        createVehicle,
        updateVehicle,
        deleteVehicle,
        assignDriverToVehicle,
        removeDriverFromVehicle,
        setPrimaryVehicle,
        getDriverVehicles,
        // Inventory functions
        fetchInventories,
        createInventory,
        updateInventory,
        deleteInventory,
        fetchInventoryItems,
        fetchInventoryTransactions,
        createInventoryAdjustment,
        assignRegionToInventory,
        getInventoryStatsByRegion,
        // Outbound functions
        fetchOutbounds,
        createOutbound,
        sendOutbound,
        confirmOutbound,
        cancelOutbound,
        fetchKalo,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export default DataContext;

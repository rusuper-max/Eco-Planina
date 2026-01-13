import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';

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
            const { data, error } = await supabase
                .from('pickup_requests')
                .select('*')
                .eq('company_code', code)
                .eq('status', 'pending')
                .is('deleted_at', null)
                .order('created_at', { ascending: false });
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
        if (!companyCode) return [];
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('company_code', companyCode)
                .eq('role', 'client')
                .is('deleted_at', null)
                .order('name');
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
                .select('*')
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

    const fetchProcessedRequests = async () => {
        if (!companyCode) return [];
        try {
            const { data, error } = await supabase
                .from('processed_requests')
                .select('*')
                .eq('company_code', companyCode)
                .is('deleted_at', null)
                .order('processed_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching processed requests:', error);
            return [];
        }
    };

    // Koristi SECURITY DEFINER funkciju za update klijenta
    const updateClientDetails = async (clientId, equipmentTypes, note, pib) => {
        try {
            const { data, error } = await supabase.rpc('update_client_details', {
                p_client_id: clientId,
                p_equipment_types: equipmentTypes || [],
                p_manager_note: note || '',
                p_pib: pib || ''
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

    // Generate short request code (e.g., "REQ-A3X7")
    const generateRequestCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like 0/O, 1/I
        const code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        return `REQ-${code}`;
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
                fill_level: fillLevel,
                waste_type: wasteType,
                waste_label: wasteLabel,
                request_code: requestCode,
                ...rest,
                status: 'pending'
            }]).select().single();
            if (error) throw error;
            return data;
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
        fetchPickupRequests,
        deleteClient,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export default DataContext;

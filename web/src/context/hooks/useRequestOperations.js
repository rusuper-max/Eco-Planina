/**
 * useRequestOperations - Hook za operacije sa zahtevima
 * Ekstraktovano iz DataContext.jsx
 */
import { useState } from 'react';
import { supabase } from '../../config/supabase';

export const useRequestOperations = ({ user, companyCode, supervisorRegionIds, setPickupRequests, setClientRequests, setProcessedNotification }) => {
    // Generate short request code (e.g., "A3X7KP")
    const generateRequestCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
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

            if (user?.role === 'manager' && user?.region_id) {
                query = query.eq('region_id', user.region_id);
            } else if (user?.role === 'supervisor' && supervisorRegionIds.length > 0) {
                query = query.in('region_id', supervisorRegionIds);
            }

            const { data, error } = await query;
            if (error) throw error;
            setPickupRequests(data || []);
        } catch (error) {
            console.error('Error fetching requests:', error);
        }
    };

    const fetchClientRequests = async (currentUser = user) => {
        if (!currentUser) return;
        try {
            const { data: requests, error } = await supabase
                .from('pickup_requests')
                .select('*')
                .eq('user_id', currentUser.id)
                .eq('status', 'pending')
                .is('deleted_at', null)
                .order('created_at', { ascending: false });
            if (error) throw error;

            if (requests && requests.length > 0) {
                const requestIds = requests.map(r => r.id);
                const { data: assignments, error: assignError } = await supabase
                    .from('driver_assignments')
                    .select('request_id, status, assigned_by, driver:driver_id(id, name, phone), assigner:assigned_by(id, name), assigned_at')
                    .in('request_id', requestIds)
                    .is('deleted_at', null);

                if (!assignError && assignments) {
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

    const fetchClientHistory = async () => {
        if (!user) return [];
        try {
            const { data, error } = await supabase
                .from('processed_requests')
                .select('*')
                .eq('client_id', user.id)
                .is('deleted_at', null)
                .is('client_hidden_at', null)
                .order('processed_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching client history:', error);
            return [];
        }
    };

    const hideClientHistoryItem = async (id) => {
        if (!user) throw new Error('Niste prijavljeni');
        try {
            const { data, error } = await supabase
                .from('processed_requests')
                .update({ client_hidden_at: new Date().toISOString() })
                .eq('id', id)
                .eq('client_id', user.id)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) throw new Error('Zahtev nije pronađen');
            return { success: true };
        } catch (error) {
            console.error('hideClientHistoryItem failed:', error);
            throw error;
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
            if (!data?.success) throw new Error(data?.error || 'Greška pri odbijanju zahteva');

            setPickupRequests(prev => prev.filter(req => req.id !== request.id));
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

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
            if (!data?.success) throw new Error(data?.error || 'Greška pri obradi zahteva');

            setPickupRequests(prev => prev.filter(req => req.id !== request.id));
            setProcessedNotification({ wasteLabel: request.waste_label || request.waste_type });
        } catch (error) {
            throw error;
        }
    };

    const addPickupRequest = async (requestData) => {
        if (!user || !companyCode) throw new Error('Niste prijavljeni ili nemate firmu');
        try {
            const { fillLevel, wasteType, wasteLabel, ...rest } = requestData;
            const requestCode = generateRequestCode();
            const { data, error } = await supabase.from('pickup_requests').insert([{
                user_id: user.id,
                company_code: companyCode,
                client_name: user.name,
                client_address: user.address,
                latitude: user.latitude || null,
                longitude: user.longitude || null,
                fill_level: fillLevel,
                waste_type: wasteType,
                waste_label: wasteLabel,
                request_code: requestCode,
                region_id: user.region_id || null,
                ...rest,
                status: 'pending'
            }]).select().single();
            if (error) throw error;
            return data;
        } catch (error) {
            throw error;
        }
    };

    const createRequestForClient = async (requestData) => {
        if (!user || !companyCode) throw new Error('Niste prijavljeni ili nemate firmu');
        if (!['manager', 'supervisor', 'company_admin'].includes(user.role)) {
            throw new Error('Nemate dozvolu za ovu akciju');
        }
        try {
            const { userId, clientName, clientAddress, wasteType, wasteLabel, fillLevel, urgency, note, latitude, longitude } = requestData;
            const requestCode = generateRequestCode();

            const { data: clientData } = await supabase
                .from('users')
                .select('region_id')
                .eq('id', userId)
                .single();

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
                created_by_manager: user.id
            }]);

            if (error) throw error;

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
            const { data, error } = await supabase
                .from('processed_requests')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)
                .eq('company_code', companyCode)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error('Zahtev nije pronađen ili nemate dozvolu za brisanje');
            }
            return { success: true };
        } catch (error) {
            console.error('deleteProcessedRequest failed:', error);
            throw error;
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

            if (user?.role === 'manager' && user?.region_id) {
                query = query.eq('region_id', user.region_id);
            } else if (user?.role === 'supervisor' && supervisorRegionIds.length > 0) {
                query = query.in('region_id', supervisorRegionIds);
            }

            if (filters.search) {
                query = query.or(`client_name.ilike.%${filters.search}%,waste_label.ilike.%${filters.search}%`);
            }
            if (filters.wasteType && filters.wasteType !== 'all') {
                query = query.eq('waste_type', filters.wasteType);
            }

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

    return {
        fetchPickupRequests,
        fetchClientRequests,
        fetchClientHistory,
        hideClientHistoryItem,
        removePickupRequest,
        rejectPickupRequest,
        markRequestAsProcessed,
        addPickupRequest,
        createRequestForClient,
        updateProcessedRequest,
        deleteProcessedRequest,
        fetchProcessedRequests
    };
};

/**
 * useDriverHistory - Hook za istoriju vozača
 * Ekstraktovano iz DriverDashboard.jsx
 */
import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabase';

export const useDriverHistory = ({ userId, isActive }) => {
    const [historyRequests, setHistoryRequests] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (isActive && userId) {
            loadHistory();
        }
    }, [isActive, userId]);

    const loadHistory = async () => {
        setLoadingHistory(true);
        try {
            // Get processed requests where this driver worked
            const { data: processedRequests, error: processedError } = await supabase
                .from('processed_requests')
                .select('*')
                .eq('driver_id', userId)
                .is('deleted_at', null)
                .order('processed_at', { ascending: false })
                .limit(50);

            if (processedError) {
                console.error('[Driver History] processed_requests error:', processedError);
            }

            // Get driver_assignments for these processed requests
            const assignmentIds = (processedRequests || [])
                .map(p => p.driver_assignment_id)
                .filter(Boolean);

            let assignmentsMap = {};
            if (assignmentIds.length > 0) {
                const { data: assignments, error: assignmentsError } = await supabase
                    .from('driver_assignments')
                    .select('*')
                    .in('id', assignmentIds);

                if (!assignmentsError && assignments) {
                    assignments.forEach(a => {
                        assignmentsMap[a.id] = a;
                    });
                }
            }

            // Get in-progress assignments (delivered but not yet processed)
            const { data: pendingAssignments, error: pendingError } = await supabase
                .from('driver_assignments')
                .select('*')
                .eq('driver_id', userId)
                .eq('status', 'delivered')
                .is('deleted_at', null)
                .order('delivered_at', { ascending: false })
                .limit(20);

            if (pendingError) {
                console.error('[Driver History] pending assignments error:', pendingError);
            }

            // Build combined history from processed_requests with assignment data
            const historyFromProcessed = (processedRequests || []).map(p => {
                const assignment = assignmentsMap[p.driver_assignment_id];
                const isRetroactive = !assignment || (!assignment.assigned_at && !assignment.picked_up_at);

                return {
                    id: p.id,
                    processed_request_id: p.id,
                    driver_assignment_id: p.driver_assignment_id,
                    status: 'completed',
                    source: isRetroactive ? 'processed_request' : 'driver_assignment',
                    client_name: p.client_name,
                    client_address: p.client_address,
                    waste_type: p.waste_type,
                    waste_label: p.waste_label,
                    latitude: p.latitude,
                    longitude: p.longitude,
                    assigned_at: assignment?.assigned_at || null,
                    picked_up_at: assignment?.picked_up_at || null,
                    delivered_at: assignment?.delivered_at || p.processed_at,
                    completed_at: assignment?.completed_at || p.processed_at,
                    processed_at: p.processed_at,
                    created_at: p.created_at,
                    weight: p.weight,
                    weight_unit: p.weight_unit,
                    proof_url: p.proof_image_url,
                    notes: p.processing_note
                };
            });

            // Add pending assignments
            const pendingHistory = (pendingAssignments || []).map(a => ({
                id: a.id,
                driver_assignment_id: a.id,
                status: 'delivered',
                source: 'driver_assignment',
                client_name: a.client_name,
                client_address: a.client_address,
                waste_type: a.waste_type,
                waste_label: a.waste_label,
                latitude: a.latitude,
                longitude: a.longitude,
                assigned_at: a.assigned_at,
                picked_up_at: a.picked_up_at,
                delivered_at: a.delivered_at,
                completed_at: null,
                processed_at: null,
                created_at: a.created_at
            }));

            // Combine and deduplicate
            const processedAssignmentIds = new Set(historyFromProcessed.map(h => h.driver_assignment_id).filter(Boolean));
            const uniquePending = pendingHistory.filter(p => !processedAssignmentIds.has(p.driver_assignment_id));

            const combined = [...historyFromProcessed, ...uniquePending];

            // Sort by most recent timestamp
            combined.sort((a, b) => {
                const dateA = new Date(a.delivered_at || a.completed_at || a.processed_at || a.created_at);
                const dateB = new Date(b.delivered_at || b.completed_at || b.processed_at || b.created_at);
                return dateB - dateA;
            });

            setHistoryRequests(combined);
        } catch (err) {
            console.error('Error loading history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    return {
        historyRequests,
        loadingHistory,
        loadHistory
    };
};

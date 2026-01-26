/**
 * useDriverAssignments - Hook za operacije sa dodelama vozača
 * Ekstraktovano iz DriverDashboard.jsx
 */
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../config/supabase';
import toast from 'react-hot-toast';
import { getCurrentUrgency, getRemainingTime } from '../../DashboardComponents';

export const useDriverAssignments = ({ user, pickupRequests }) => {
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [assignments, setAssignments] = useState([]);
    const [todayStats, setTodayStats] = useState({ picked: 0, delivered: 0 });

    const myUserId = user?.id;
    const isDriver = user?.role === 'driver';

    // Safety timeout - never show loading for more than 5 seconds
    useEffect(() => {
        if (!loading) return;
        const safetyTimeout = setTimeout(() => {
            console.warn('Driver dashboard safety timeout triggered - forcing loading off');
            setLoading(false);
        }, 5000);
        return () => clearTimeout(safetyTimeout);
    }, [loading]);

    // Fetch driver's assignments when user is loaded
    useEffect(() => {
        if (!user) return;

        if (myUserId && isDriver) {
            fetchMyAssignments();
            fetchTodayStats();
        } else {
            setLoading(false);
        }
    }, [myUserId, isDriver, user]);

    // Realtime updates for driver assignments
    useEffect(() => {
        if (!myUserId || !isDriver) return;

        const channel = supabase
            .channel(`driver_assignments_${myUserId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_assignments', filter: `driver_id=eq.${myUserId}` }, async () => {
                await fetchMyAssignments();
                await fetchTodayStats();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [myUserId, isDriver]);

    const fetchMyAssignments = async () => {
        try {
            const { data, error } = await supabase
                .from('driver_assignments')
                .select('*, assigned_by_user:assigned_by(id, name, phone)')
                .eq('driver_id', myUserId)
                .in('status', ['assigned', 'in_progress', 'picked_up'])
                .is('deleted_at', null);

            if (error) throw error;
            setAssignments(data || []);
        } catch (err) {
            console.error('Error fetching assignments:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTodayStats = async () => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const [pickedResult, deliveredResult] = await Promise.all([
                supabase
                    .from('driver_assignments')
                    .select('*', { count: 'exact', head: true })
                    .eq('driver_id', myUserId)
                    .in('status', ['picked_up', 'delivered'])
                    .gte('picked_up_at', today.toISOString()),
                supabase
                    .from('driver_assignments')
                    .select('*', { count: 'exact', head: true })
                    .eq('driver_id', myUserId)
                    .eq('status', 'delivered')
                    .gte('delivered_at', today.toISOString())
            ]);

            setTodayStats({
                picked: pickedResult.count || 0,
                delivered: deliveredResult.count || 0
            });
        } catch (err) {
            console.error('Error fetching today stats:', err);
        }
    };

    // Handle pickup (Step 1)
    const handlePickup = async (request) => {
        if (processing) return;
        if (!window.confirm(`Označiti "${request.waste_label}" kao PREUZETO od klijenta?`)) return;

        setProcessing(true);
        try {
            const { error } = await supabase
                .from('driver_assignments')
                .update({
                    status: 'picked_up',
                    picked_up_at: new Date().toISOString(),
                    client_name: request.client_name,
                    client_address: request.client_address,
                    waste_type: request.waste_type,
                    waste_label: request.waste_label,
                    latitude: request.latitude,
                    longitude: request.longitude
                })
                .eq('id', request.assignmentId);

            if (error) throw error;

            await fetchMyAssignments();
            await fetchTodayStats();
        } catch (err) {
            toast.error('Greška: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    // Handle delivery (Step 2)
    const handleDelivery = async (request) => {
        if (processing) return;
        if (!window.confirm(`Označiti "${request.waste_label}" kao DOSTAVLJENO/ISPRAŽNJENO?`)) return;

        setProcessing(true);
        try {
            const { error } = await supabase
                .from('driver_assignments')
                .update({
                    status: 'delivered',
                    delivered_at: new Date().toISOString()
                })
                .eq('id', request.assignmentId);

            if (error) throw error;

            await fetchMyAssignments();
            await fetchTodayStats();
        } catch (err) {
            toast.error('Greška: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    // Get assigned request IDs
    const assignedRequestIds = useMemo(() => {
        return new Set(assignments.map(a => a.request_id));
    }, [assignments]);

    // Get pending requests - filtered by assignments for drivers
    const getPendingRequests = (urgencyFilter = 'all') => {
        if (!pickupRequests) return [];

        let requests = pickupRequests.filter(r => r.status === 'pending');

        if (isDriver && assignedRequestIds.size > 0) {
            requests = requests.filter(r => assignedRequestIds.has(r.id));
        } else if (isDriver && assignedRequestIds.size === 0 && !loading) {
            return [];
        }

        // Add assignment status and manager info
        requests = requests.map(r => {
            const assignment = assignments.find(a => a.request_id === r.id);
            return {
                ...r,
                currentUrgency: getCurrentUrgency(r.created_at, r.urgency),
                remainingTime: getRemainingTime(r.created_at, r.urgency),
                assignmentStatus: assignment?.status || 'assigned',
                assignmentId: assignment?.id,
                assignedByName: assignment?.assigned_by_user?.name,
                assignedByPhone: assignment?.assigned_by_user?.phone
            };
        });

        // Apply urgency filter
        if (urgencyFilter !== 'all') {
            requests = requests.filter(r => r.currentUrgency === urgencyFilter);
        }

        return requests.sort((a, b) => a.remainingTime.ms - b.remainingTime.ms);
    };

    // Get all requests (unfiltered by urgency) for stats
    const getAllRequests = () => {
        if (!pickupRequests) return [];
        let requests = pickupRequests.filter(r => r.status === 'pending');
        if (isDriver && assignedRequestIds.size > 0) {
            requests = requests.filter(r => assignedRequestIds.has(r.id));
        }
        return requests.map(r => ({
            ...r,
            currentUrgency: getCurrentUrgency(r.created_at, r.urgency)
        }));
    };

    // Route optimization - multi-select
    const [urgencyFilter, setUrgencyFilter] = useState('all');
    const [selectedForRoute, setSelectedForRoute] = useState(new Set());

    const toggleRouteSelection = (requestId) => {
        setSelectedForRoute(prev => {
            const next = new Set(prev);
            if (next.has(requestId)) {
                next.delete(requestId);
            } else {
                next.add(requestId);
            }
            return next;
        });
    };

    const toggleSelectAllForRoute = (pendingRequests) => {
        const validIds = pendingRequests
            .filter(r => r.latitude && r.longitude)
            .map(r => r.id);
        const allSelected = validIds.every(id => selectedForRoute.has(id));

        if (allSelected) {
            setSelectedForRoute(new Set());
        } else {
            setSelectedForRoute(new Set(validIds));
        }
    };

    return {
        loading,
        processing,
        assignments,
        todayStats,
        isDriver,
        assignedRequestIds,
        urgencyFilter,
        setUrgencyFilter,
        selectedForRoute,
        handlePickup,
        handleDelivery,
        getPendingRequests,
        getAllRequests,
        toggleRouteSelection,
        toggleSelectAllForRoute
    };
};

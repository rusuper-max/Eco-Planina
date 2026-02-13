/**
 * useDriverTasks - Hook za upravljanje zadacima vozača
 * Ekstraktovano iz DriverViewScreen.js radi održivosti
 *
 * FIX: Resolved list lag/jump-to-top issue caused by:
 * 1. setLoading(true) on every refetch (showed spinner, unmounted list)
 * 2. No debouncing on realtime events (rapid successive refetches)
 * 3. 30s polling on top of realtime (unnecessary extra refetches)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../config/supabase';

export const useDriverTasks = ({
  user,
  fetchDriverAssignments,
  maxPickupHours,
}) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isInitialLoad = useRef(true);
  const debounceTimer = useRef(null);

  // Load assignments from API
  // showLoader=true only on initial load, false for background refreshes
  const loadAssignments = useCallback(async (showLoader = false) => {
    if (!user?.id) return;
    if (showLoader) setLoading(true);
    try {
      const data = await fetchDriverAssignments();
      setAssignments(data || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      if (showLoader) setLoading(false);
      isInitialLoad.current = false;
    }
  }, [user?.id, fetchDriverAssignments]);

  // Debounced refresh for realtime events - prevents rapid successive refetches
  const debouncedRefresh = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      loadAssignments(false);
    }, 1000);
  }, [loadAssignments]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAssignments(false);
    setRefreshing(false);
  }, [loadAssignments]);

  // Load on mount and subscribe to realtime updates
  useEffect(() => {
    // Initial load with loading spinner
    loadAssignments(true);

    if (!user?.id) return;

    // Subscribe to driver_assignments changes for this driver
    const assignmentsChannel = supabase
      .channel(`driver_assignments_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_assignments',
          filter: `driver_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Driver assignment change:', payload.eventType);
          // Debounced background refresh - no loading spinner, no list jump
          debouncedRefresh();
        }
      )
      .subscribe();

    // Fallback polling every 2 minutes (reduced from 30s since realtime handles it)
    const pollInterval = setInterval(() => {
      loadAssignments(false);
    }, 120000);

    return () => {
      assignmentsChannel.unsubscribe();
      clearInterval(pollInterval);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [user?.id, loadAssignments, debouncedRefresh]);

  // Calculate remaining time or overdue
  const getRemainingTime = useCallback((request) => {
    if (!request.created_at) return { text: '-', ms: 0, isOverdue: false };

    const createdAt = new Date(request.created_at);
    const now = new Date();
    // Koristi maxPickupHours iz company settings
    const deadlineHours = maxPickupHours || 48;
    const deadline = new Date(createdAt.getTime() + deadlineHours * 60 * 60 * 1000);

    const diffMs = deadline - now;
    const isOverdue = diffMs < 0;
    const absDiffMs = Math.abs(diffMs);

    const hours = Math.floor(absDiffMs / (1000 * 60 * 60));
    const mins = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));

    let text;
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      text = isOverdue ? `Kasni ${days}d ${hours % 24}h` : `${days}d ${hours % 24}h`;
    } else {
      text = isOverdue ? `Kasni ${hours}h ${mins}m` : `${hours}h ${mins}m`;
    }

    return { text, ms: diffMs, isOverdue };
  }, [maxPickupHours]);

  // Get urgency level based on remaining time percentage
  const getUrgencyLevel = useCallback((request) => {
    const { ms, isOverdue } = getRemainingTime(request);
    if (isOverdue) return 'urgent';
    const hours = ms / (1000 * 60 * 60);
    const hoursToAdd = maxPickupHours || 48;
    const percentLeft = hours / hoursToAdd;
    if (percentLeft <= 0.25) return 'urgent'; // <25% vremena
    if (percentLeft <= 0.50) return 'warning'; // 25-50% vremena
    return 'normal'; // >50% vremena
  }, [getRemainingTime, maxPickupHours]);

  // Get urgency colors - matches original COLORS constants
  const getUrgencyColors = useCallback((level) => {
    switch (level) {
      case 'urgent': return { bg: '#FEE2E2', text: '#EF4444' }; // COLORS.redLight, COLORS.red
      case 'warning': return { bg: '#FEF3C7', text: '#F59E0B' }; // COLORS.amberLight, COLORS.amber
      default: return { bg: '#D1FAE5', text: '#10B981' }; // COLORS.primaryLight, COLORS.primary
    }
  }, []);

  // Split assignments into pending and picked up
  const pendingRequests = assignments.filter(
    a => a.assignment_status === 'assigned' || a.assignment_status === 'in_progress'
  );
  const pickedUpRequests = assignments.filter(
    a => a.assignment_status === 'picked_up'
  );

  // Sort by urgency (most urgent first)
  const sortByUrgency = (a, b) => {
    const aTime = getRemainingTime(a);
    const bTime = getRemainingTime(b);
    return aTime.ms - bTime.ms;
  };

  const sortedPending = [...pendingRequests].sort(sortByUrgency);
  const sortedPickedUp = [...pickedUpRequests].sort(sortByUrgency);

  // Stats
  const urgentCount = assignments.filter(a => getUrgencyLevel(a) === 'urgent').length;
  const mediumCount = assignments.filter(a => getUrgencyLevel(a) === 'warning').length;

  return {
    // State
    assignments,
    setAssignments,
    loading,
    refreshing,

    // Actions
    loadAssignments,
    handleRefresh,

    // Computed
    pendingRequests,
    pickedUpRequests,
    sortedPending,
    sortedPickedUp,
    urgentCount,
    mediumCount,

    // Helpers
    getRemainingTime,
    getUrgencyLevel,
    getUrgencyColors,
  };
};

export default useDriverTasks;

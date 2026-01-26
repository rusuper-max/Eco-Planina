/**
 * DataContext.jsx - Kontekst za podatke aplikacije
 * Refaktorisano: Logika je ekstraktovana u hook-ove u ./hooks/ folderu
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';

// Import hook implementations
import { useRequestOperations } from './hooks/useRequestOperations';
import { useRegionOperations } from './hooks/useRegionOperations';
import { useInventoryOperations } from './hooks/useInventoryOperations';
import { useOutboundOperations } from './hooks/useOutboundOperations';
import { useVehicleOperations } from './hooks/useVehicleOperations';
import { useEquipmentOperations } from './hooks/useEquipmentOperations';
import { useClientOperations } from './hooks/useClientOperations';
import { useFuelOperations } from './hooks/useFuelOperations';

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

    // Core state
    const [pickupRequests, setPickupRequests] = useState([]);
    const [clientRequests, setClientRequests] = useState([]);
    const [driverAssignments, setDriverAssignments] = useState([]);
    const [driverLocations, setDriverLocations] = useState([]);
    const [processedNotification, setProcessedNotification] = useState(null);
    const [supervisorRegionIds, setSupervisorRegionIds] = useState([]);

    // Shared context for hooks
    const hookContext = { user, companyCode, supervisorRegionIds };

    // =========================================================================
    // SUPERVISOR REGIONS
    // =========================================================================
    const fetchSupervisorRegions = async () => {
        if (!user || user.role !== 'supervisor') {
            setSupervisorRegionIds([]);
            return [];
        }
        try {
            const { data, error } = await supabase
                .from('supervisor_regions')
                .select('region_id')
                .eq('supervisor_id', user.id);

            if (error) throw error;
            const regionIds = (data || []).map(r => r.region_id);
            setSupervisorRegionIds(regionIds);
            return regionIds;
        } catch (error) {
            console.error('Error fetching supervisor regions:', error);
            setSupervisorRegionIds([]);
            return [];
        }
    };

    useEffect(() => {
        if (user?.role === 'supervisor') {
            fetchSupervisorRegions();
        } else {
            setSupervisorRegionIds([]);
        }
    }, [user?.id, user?.role]);

    // =========================================================================
    // DRIVER ASSIGNMENTS
    // =========================================================================
    const fetchDriverAssignments = async (code = companyCode) => {
        if (!code) return;
        try {
            const { data, error } = await supabase
                .from('driver_assignments')
                .select(`*, driver:driver_id(id, name, phone), assigner:assigned_by(id, name)`)
                .eq('company_code', code)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDriverAssignments(data || []);
        } catch (error) {
            console.error('Error fetching driver assignments:', error);
        }
    };

    // =========================================================================
    // DRIVER LOCATIONS
    // =========================================================================
    const fetchDriverLocations = async (code = companyCode) => {
        if (!code) return;
        try {
            const { data, error } = await supabase
                .from('driver_locations')
                .select('*, driver:driver_id(id, name, phone, role)')
                .eq('company_code', code)
                .gte('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());

            if (error) throw error;
            setDriverLocations(data || []);
        } catch (error) {
            console.error('Error fetching driver locations:', error);
        }
    };

    // =========================================================================
    // INITIALIZE HOOKS
    // =========================================================================
    const requestOps = useRequestOperations({
        ...hookContext,
        setPickupRequests,
        setClientRequests,
        setProcessedNotification
    });

    const regionOps = useRegionOperations({
        ...hookContext,
        fetchPickupRequests: requestOps.fetchPickupRequests
    });

    const inventoryOps = useInventoryOperations(hookContext);
    const outboundOps = useOutboundOperations(hookContext);
    const vehicleOps = useVehicleOperations(hookContext);
    const equipmentOps = useEquipmentOperations(hookContext);
    const clientOps = useClientOperations(hookContext);
    const fuelOps = useFuelOperations();

    // =========================================================================
    // REALTIME SUBSCRIPTIONS
    // =========================================================================

    // Pickup requests & driver assignments
    useEffect(() => {
        if (!companyCode) return;
        requestOps.fetchPickupRequests(companyCode);
        fetchDriverAssignments(companyCode);

        const channelRequest = supabase
            .channel(`pickup_requests_web_${companyCode}_${user?.region_id || 'all'}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pickup_requests', filter: `company_code=eq.${companyCode}` }, () => requestOps.fetchPickupRequests(companyCode))
            .subscribe();

        const channelAssignments = supabase
            .channel(`driver_assignments_web_${companyCode}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_assignments', filter: `company_code=eq.${companyCode}` }, () => fetchDriverAssignments(companyCode))
            .subscribe();

        const pollInterval = setInterval(() => {
            fetchDriverAssignments(companyCode);
        }, 45000);

        return () => {
            supabase.removeChannel(channelRequest);
            supabase.removeChannel(channelAssignments);
            clearInterval(pollInterval);
        };
    }, [companyCode, user?.region_id]);

    // Visibility change handler
    useEffect(() => {
        if (!companyCode) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                requestOps.fetchPickupRequests(companyCode);
                fetchDriverAssignments(companyCode);
                if (['manager', 'supervisor', 'company_admin', 'admin', 'developer'].includes(user?.role)) {
                    fetchDriverLocations(companyCode);
                }
            }
        };

        const handleFocus = () => {
            requestOps.fetchPickupRequests(companyCode);
            fetchDriverAssignments(companyCode);
            if (['manager', 'supervisor', 'company_admin', 'admin', 'developer'].includes(user?.role)) {
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

    // Driver locations subscription
    useEffect(() => {
        if (!companyCode || !['manager', 'supervisor', 'company_admin', 'admin', 'developer'].includes(user?.role)) return;
        fetchDriverLocations(companyCode);

        const channelLocations = supabase
            .channel(`driver_locations_web_${companyCode}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_locations', filter: `company_code=eq.${companyCode}` }, () => fetchDriverLocations(companyCode))
            .subscribe();

        return () => {
            supabase.removeChannel(channelLocations);
        };
    }, [companyCode, user?.role]);

    // Client requests subscription
    useEffect(() => {
        if (!user || user.role !== 'client') return;
        requestOps.fetchClientRequests(user);

        const channelName = `client_requests_${user.id}`;
        const subscription = supabase
            .channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pickup_requests', filter: `user_id=eq.${user.id}` }, (payload) => {
                if (payload.eventType === 'UPDATE' && payload.new.status === 'processed' && payload.old?.status === 'pending') {
                    setProcessedNotification({ wasteLabel: payload.new.waste_label || payload.new.waste_type, processedAt: payload.new.processed_at });
                }
                requestOps.fetchClientRequests(user);
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pickup_requests' }, () => requestOps.fetchClientRequests(user))
            .subscribe();

        return () => { supabase.removeChannel(subscription); };
    }, [user]);

    // =========================================================================
    // ANALYTICS
    // =========================================================================
    const resetManagerAnalytics = async () => {
        if (!companyCode) throw new Error('Niste prijavljeni');
        if (user?.role !== 'company_admin' && !user?.is_owner) {
            throw new Error('Samo vlasnik firme može resetovati statistiku');
        }
        try {
            const { error } = await supabase
                .from('processed_requests')
                .update({ deleted_at: new Date().toISOString() })
                .eq('company_code', companyCode)
                .is('deleted_at', null);

            if (error) throw error;

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

    // =========================================================================
    // CONTEXT VALUE
    // =========================================================================
    const clearProcessedNotification = () => setProcessedNotification(null);

    const value = {
        // State
        pickupRequests,
        driverAssignments,
        driverLocations,
        clientRequests,
        processedNotification,
        clearProcessedNotification,

        // Request operations
        fetchPickupRequests: requestOps.fetchPickupRequests,
        fetchClientRequests: requestOps.fetchClientRequests,
        fetchClientHistory: requestOps.fetchClientHistory,
        hideClientHistoryItem: requestOps.hideClientHistoryItem,
        removePickupRequest: requestOps.removePickupRequest,
        rejectPickupRequest: requestOps.rejectPickupRequest,
        markRequestAsProcessed: requestOps.markRequestAsProcessed,
        addPickupRequest: requestOps.addPickupRequest,
        createRequestForClient: requestOps.createRequestForClient,
        updateProcessedRequest: requestOps.updateProcessedRequest,
        deleteProcessedRequest: requestOps.deleteProcessedRequest,
        fetchProcessedRequests: requestOps.fetchProcessedRequests,

        // Driver operations
        fetchDriverAssignments,

        // Client operations
        fetchCompanyClients: clientOps.fetchCompanyClients,
        fetchCompanyMembers: clientOps.fetchCompanyMembers,
        updateClientDetails: clientOps.updateClientDetails,
        deleteClient: clientOps.deleteClient,

        // Region operations
        fetchCompanyRegions: regionOps.fetchCompanyRegions,
        createRegion: regionOps.createRegion,
        updateRegion: regionOps.updateRegion,
        deleteRegion: regionOps.deleteRegion,
        assignUsersToRegion: regionOps.assignUsersToRegion,
        updateOwnRegion: regionOps.updateOwnRegion,
        setClientLocationWithRequests: regionOps.setClientLocationWithRequests,
        fetchUsersByAddressPattern: regionOps.fetchUsersByAddressPattern,
        fetchUsersGroupedByRegion: regionOps.fetchUsersGroupedByRegion,

        // Equipment operations
        fetchCompanyEquipment: equipmentOps.fetchCompanyEquipment,
        createEquipment: equipmentOps.createEquipment,
        updateEquipment: equipmentOps.updateEquipment,
        deleteEquipment: equipmentOps.deleteEquipment,
        migrateEquipmentFromLocalStorage: equipmentOps.migrateEquipmentFromLocalStorage,

        // Analytics
        resetManagerAnalytics,

        // Vehicle operations
        fetchVehicles: vehicleOps.fetchVehicles,
        createVehicle: vehicleOps.createVehicle,
        updateVehicle: vehicleOps.updateVehicle,
        deleteVehicle: vehicleOps.deleteVehicle,
        assignDriverToVehicle: vehicleOps.assignDriverToVehicle,
        removeDriverFromVehicle: vehicleOps.removeDriverFromVehicle,
        setPrimaryVehicle: vehicleOps.setPrimaryVehicle,
        getDriverVehicles: vehicleOps.getDriverVehicles,

        // Inventory operations
        fetchInventories: inventoryOps.fetchInventories,
        createInventory: inventoryOps.createInventory,
        updateInventory: inventoryOps.updateInventory,
        deleteInventory: inventoryOps.deleteInventory,
        fetchInventoryItems: inventoryOps.fetchInventoryItems,
        fetchInventoryTransactions: inventoryOps.fetchInventoryTransactions,
        createInventoryAdjustment: inventoryOps.createInventoryAdjustment,
        assignRegionToInventory: inventoryOps.assignRegionToInventory,
        getInventoryStatsByRegion: inventoryOps.getInventoryStatsByRegion,

        // Outbound operations
        fetchOutbounds: outboundOps.fetchOutbounds,
        createOutbound: outboundOps.createOutbound,
        sendOutbound: outboundOps.sendOutbound,
        confirmOutbound: outboundOps.confirmOutbound,
        cancelOutbound: outboundOps.cancelOutbound,
        fetchKalo: outboundOps.fetchKalo,

        // Fuel operations
        fetchFuelLogs: fuelOps.fetchFuelLogs,
        createFuelLog: fuelOps.createFuelLog,
        updateFuelLog: fuelOps.updateFuelLog,
        deleteFuelLog: fuelOps.deleteFuelLog,
        fetchFuelStatsByVehicle: fuelOps.fetchFuelStatsByVehicle,
        fetchFuelStatsMonthly: fuelOps.fetchFuelStatsMonthly,
        calculateConsumption: fuelOps.calculateConsumption,
        uploadFuelReceipt: fuelOps.uploadReceipt,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export default DataContext;

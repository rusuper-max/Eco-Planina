/**
 * Dashboard.jsx - Glavni dashboard komponenta
 * Refaktorisano: Ekstraktovani su hook-ovi, komponente i konfiguracije
 */
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import {
    // Hooks
    useState, useEffect, useMemo,
    useNavigate,
    useAuth,
    supabase,
    // Map components
    MapContainer, TileLayer,
    // Icons
    Settings, LogOut, Mountain, MapPin, Menu, X,
    Building2, CheckCircle2, Copy,
    RefreshCw, Globe, ChevronDown, MessageCircle,
    AlertTriangle,
    // Components
    WASTE_TYPES,
    SidebarItem, Modal, ModalWithFooter,
    NotificationBell, HelpButton, HelpOverlay,
    getStablePosition, DraggableMarker, LocationPicker,
    RequestDetailsModal, ClientDetailsModal, ClientEquipmentModal, ImportClientsModal, ProcessRequestModal, CreateRequestModal,
    CompanyEditModal, UserEditModal,
    ChatInterface
} from './DashboardComponents';
import DriverDashboard from './DriverDashboard';

// Import refactored config and components
import { getMenuByRole, getRoleLabel } from './dashboard/config';
import { ClientDashboard, AdminDashboard, ManagerDashboard, SupervisorDashboard, CompanyAdminDashboard } from './dashboard/components';

export default function Dashboard() {
    const navigate = useNavigate();
    const { user, logout, companyCode, companyName, regionName, pickupRequests, clientRequests, processedNotification, clearProcessedNotification, addPickupRequest, markRequestAsProcessed, removePickupRequest, rejectPickupRequest, fetchProcessedRequests, fetchClientHistory, getAdminStats, fetchAllCompanies, fetchAllUsers, fetchAllMasterCodes, generateMasterCode, deleteMasterCode, deleteUser, isDeveloper, deleteClient, unreadCount, fetchMessages, sendMessage, markMessagesAsRead, getConversations, updateClientDetails, sendMessageToAdmins, fetchCompanyAdmin, sendMessageToCompanyAdmin, updateProfile, updateCompanyName, updateLocation, originalUser, impersonateUser, exitImpersonation, changeUserRole, resetUserPassword, deleteConversation, updateUser, updateCompany, deleteCompany, subscribeToMessages, deleteProcessedRequest, updateProcessedRequest, fetchCompanyWasteTypes, updateCompanyWasteTypes, updateMasterCodePrice, fetchCompanyRegions, createWasteType, updateWasteType, deleteWasteType, createShadowClients, updateUserSettings } = useAuth();
    const { fetchCompanyEquipment, createEquipment, updateEquipment, deleteEquipment, migrateEquipmentFromLocalStorage, fetchCompanyMembers, fetchCompanyClients, createRequestForClient, resetManagerAnalytics, updateOwnRegion, setClientLocationWithRequests, fetchPickupRequests, driverAssignments, fetchDriverAssignments, hideClientHistoryItem } = useData();

    // State declarations
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(() => {
        const saved = localStorage.getItem('ecomountaint_activeTab');
        const isClient = user?.role === 'client';
        if (isClient && (!saved || saved === 'dashboard')) {
            return 'new';
        }
        return saved || 'dashboard';
    });
    const [mapType, setMapType] = useState('requests');
    const [stats, setStats] = useState(null);
    const [clients, setClients] = useState([]);
    const [regions, setRegions] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [users, setUsers] = useState([]);
    const [masterCodes, setMasterCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [processingRequest, setProcessingRequest] = useState(null);
    const [selectedClient, setSelectedClient] = useState(null);
    const [editingClientLocation, setEditingClientLocation] = useState(null);
    const [showChatDropdown, setShowChatDropdown] = useState(false);
    const [equipment, setEquipment] = useState([]);
    const [wasteTypes, setWasteTypes] = useState(WASTE_TYPES);
    const [processedRequests, setProcessedRequests] = useState([]);
    const [editingClientEquipment, setEditingClientEquipment] = useState(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showCreateRequestModal, setShowCreateRequestModal] = useState(false);
    const [language, setLanguage] = useState('sr');
    const [editingProfile, setEditingProfile] = useState({ name: '', phone: '', companyName: '', address: '', latitude: null, longitude: null });
    const [urgencyFilter, setUrgencyFilter] = useState('all');
    const [editingUser, setEditingUser] = useState(null);
    const [editingCompany, setEditingCompany] = useState(null);
    const [clientHistory, setClientHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [companyDrivers, setCompanyDrivers] = useState([]);
    const [companyMembers, setCompanyMembers] = useState([]);
    const [showRegionSelectModal, setShowRegionSelectModal] = useState(false);
    const [selectedRegionId, setSelectedRegionId] = useState('');
    const [showImportClientsModal, setShowImportClientsModal] = useState(false);
    const [savingRegion, setSavingRegion] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    // History pagination state
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotalPages, setHistoryTotalPages] = useState(1);
    const [historyCount, setHistoryCount] = useState(0);
    const [initialDataLoaded, setInitialDataLoaded] = useState(false);

    // User settings
    const allowBulkMapAssignment = user?.settings?.allow_bulk_map_assignment ?? true;

    const userRole = ['developer', 'admin'].includes(user?.role) ? 'admin' : user?.role === 'company_admin' ? 'company_admin' : user?.role || 'client';

    // Driver ima svoj odvojeni UI (DriverDashboard)
    if (userRole === 'driver') {
        return <DriverDashboard />;
    }

    // Save activeTab to localStorage
    useEffect(() => {
        localStorage.setItem('ecomountaint_activeTab', activeTab);
    }, [activeTab]);

    // Refresh processed requests when switching to history tab
    useEffect(() => {
        if (activeTab === 'history' && fetchProcessedRequests) {
            fetchProcessedRequests({ page: historyPage }).then(result => {
                if (result?.data) {
                    setProcessedRequests(result.data);
                    setHistoryCount(result.count || 0);
                    setHistoryTotalPages(result.totalPages || 1);
                }
            });
        }
    }, [activeTab]);

    // Polling fallback - refresh data every 30 seconds
    useEffect(() => {
        if (!companyCode || !['manager', 'supervisor', 'company_admin'].includes(userRole)) return;

        const intervalId = setInterval(() => {
            fetchProcessedRequests({ page: historyPage }).then(result => {
                if (result?.data) {
                    setProcessedRequests(result.data);
                    setHistoryCount(result.count || 0);
                    setHistoryTotalPages(result.totalPages || 1);
                }
            });
        }, 30000);

        return () => clearInterval(intervalId);
    }, [companyCode, userRole, fetchProcessedRequests]);

    // Realtime processed requests updates
    useEffect(() => {
        if (!companyCode) return;
        const channel = supabase
            .channel(`processed_requests_company_${companyCode}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'processed_requests',
                    filter: `company_code=eq.${companyCode}`
                },
                async () => {
                    const result = await fetchProcessedRequests({ page: historyPage });
                    setProcessedRequests(result?.data || []);
                    if (result?.count) setHistoryCount(result.count);
                    if (result?.totalPages) setHistoryTotalPages(result.totalPages);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [companyCode, fetchProcessedRequests]);

    // Load equipment from database
    useEffect(() => {
        const loadEquipment = async () => {
            if (!companyCode || userRole === 'client') return;
            try {
                const migrationResult = await migrateEquipmentFromLocalStorage();
                if (migrationResult.migrated > 0) {
                    toast.success(`Migrirano ${migrationResult.migrated} tipova opreme u bazu`);
                }
                const dbEquipment = await fetchCompanyEquipment();
                setEquipment(dbEquipment);
            } catch (err) {
                console.error('Error loading equipment:', err);
            }
        };
        loadEquipment();
    }, [companyCode, userRole]);

    // Initial data load
    useEffect(() => {
        if (companyCode || userRole === 'admin') {
            loadInitialData();
        }
    }, [userRole, companyCode]);

    // Tab-specific data load
    useEffect(() => {
        if (initialDataLoaded) {
            loadTabData();
        }
    }, [activeTab, initialDataLoaded]);

    // Load client history
    useEffect(() => {
        if (userRole === 'client' && (activeTab === 'history' || activeTab === 'dashboard')) {
            if (clientHistory.length === 0) {
                setHistoryLoading(true);
                fetchClientHistory().then(data => {
                    setClientHistory(data || []);
                    setHistoryLoading(false);
                });
            }
        }
    }, [activeTab, userRole]);

    // Fetch company drivers
    const fetchCompanyDriversLocal = async () => {
        if (!companyCode) return;
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, name, phone')
                .eq('company_code', companyCode)
                .eq('role', 'driver')
                .is('deleted_at', null)
                .order('name');
            if (error) throw error;
            setCompanyDrivers(data || []);
        } catch (err) {
            console.error('Error fetching drivers:', err);
        }
    };

    // Load initial data
    const loadInitialData = async () => {
        setLoading(true);
        try {
            if (userRole === 'admin') {
                setStats(await getAdminStats());
            } else if (userRole === 'manager' || userRole === 'client' || userRole === 'company_admin' || userRole === 'supervisor') {
                const companyWasteTypes = await fetchCompanyWasteTypes();
                setWasteTypes(companyWasteTypes || []);

                if (userRole === 'manager') {
                    setClients(await fetchCompanyClients() || []);
                    setRegions(await fetchCompanyRegions() || []);
                    await fetchCompanyDriversLocal();
                }

                if (userRole === 'supervisor') {
                    const clientsData = await fetchCompanyClients();
                    const membersData = await fetchCompanyMembers();
                    const regionsData = await fetchCompanyRegions();
                    setClients(clientsData || []);
                    setRegions(regionsData || []);
                    setCompanyMembers(membersData || []);
                    await fetchCompanyDriversLocal();
                }

                if (userRole === 'company_admin') {
                    const clientsData = await fetchCompanyClients();
                    const membersData = await fetchCompanyMembers();
                    const regionsData = await fetchCompanyRegions();
                    setClients(clientsData || []);
                    setRegions(regionsData || []);
                    setCompanyMembers(membersData || []);
                    const companyWasteTypesAdmin = await fetchCompanyWasteTypes();
                    if (companyWasteTypesAdmin && companyWasteTypesAdmin.length > 0) {
                        setWasteTypes(companyWasteTypesAdmin);
                    }
                    await fetchCompanyDriversLocal();
                }
            }
            setInitialDataLoaded(true);

            // Check if user needs to select a region
            if (user?.role && !['company_admin', 'supervisor'].includes(user.role) && !user.region_id && companyCode) {
                const regionsData = await fetchCompanyRegions();
                if (regionsData && regionsData.length > 0) {
                    setRegions(regionsData);
                    setShowRegionSelectModal(true);
                }
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // Load tab-specific data
    const loadTabData = async () => {
        try {
            if (userRole === 'admin') {
                if (activeTab === 'companies' && companies.length === 0) setCompanies(await fetchAllCompanies());
                if (activeTab === 'users' && users.length === 0) setUsers(await fetchAllUsers());
                if (activeTab === 'codes' && masterCodes.length === 0) setMasterCodes(await fetchAllMasterCodes());
            } else if (['manager', 'supervisor', 'company_admin'].includes(userRole)) {
                if ((activeTab === 'history' || activeTab === 'analytics' || activeTab === 'manager-analytics' || activeTab === 'driver-analytics')) {
                    if (activeTab === 'history' && (processedRequests.length === 0)) {
                        await loadHistoryPage(1);
                    }
                    else if (processedRequests.length === 0) {
                        if (activeTab === 'analytics' || activeTab === 'manager-analytics' || activeTab === 'driver-analytics') {
                            const allData = await fetchProcessedRequests({ page: 1, pageSize: 10000 });
                            setProcessedRequests(allData.data || []);
                        }
                    }
                }
            }
        } catch (err) { console.error(err); }
    };

    const loadHistoryPage = async (page) => {
        setHistoryLoading(true);
        try {
            const result = await fetchProcessedRequests({ page, pageSize: 10 });
            setProcessedRequests(result.data || []);
            setHistoryCount(result.count || 0);
            setHistoryTotalPages(result.totalPages || 1);
            setHistoryPage(page);
        } catch (error) {
            console.error(error);
        } finally {
            setHistoryLoading(false);
        }
    };

    // Handlers
    const handleLogout = () => { if (window.confirm('Odjaviti se?')) { logout(); navigate('/'); } };
    const handleNewRequest = async (data) => { setSubmitLoading(true); try { await addPickupRequest(data); setActiveTab('requests'); } catch (err) { toast.error(err.message); } finally { setSubmitLoading(false); } };
    const handleProcessRequest = (req) => setProcessingRequest(req);
    const handleConfirmProcess = async (req, proofImageUrl, note, weightData, retroactiveDriverInfo = null) => {
        await markRequestAsProcessed(req, proofImageUrl, note, weightData, retroactiveDriverInfo);
    };
    const handleRejectRequest = async (request) => {
        const note = window.prompt('Unesite razlog odbijanja (opciono):', '');
        if (note === null) return;
        try {
            await rejectPickupRequest(request, note || null);
            toast.success('Zahtev odbijen');
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleDeleteClient = async (id) => {
        if (!window.confirm('Obrisati klijenta?')) return;
        const previousClients = clients;
        setClients(prev => prev.filter(c => c.id !== id));
        try {
            await deleteClient?.(id);
        } catch (err) {
            setClients(previousClients);
            toast.error(err.message);
        }
    };

    const handleGenerateCode = async () => { try { await generateMasterCode(); setMasterCodes(await fetchAllMasterCodes()); } catch (err) { toast.error(err.message); } };
    const handleCopyCode = (code) => { navigator.clipboard.writeText(code); toast.success('Kopirano!'); };
    const handleDeleteCode = async (id) => { if (window.confirm('Obrisati?')) try { await deleteMasterCode(id); setMasterCodes(await fetchAllMasterCodes()); } catch (err) { toast.error(err.message); } };
    const handleUpdateCodePrice = async (codeId, priceData) => { try { await updateMasterCodePrice(codeId, priceData); setMasterCodes(await fetchAllMasterCodes()); } catch (err) { toast.error(err.message); } };
    const handleDeleteUser = async (id) => { if (window.confirm('Obrisati?')) try { await deleteUser(id); setUsers(await fetchAllUsers()); } catch (err) { toast.error(err.message); } };

    const handleImpersonateUser = async (userId) => {
        if (!window.confirm('Želite da pristupite ovom nalogu?')) return;
        try {
            const result = await impersonateUser(userId);
            if (result.role === 'company_admin') navigate('/company-admin');
            else if (result.role === 'manager') navigate('/manager');
            else if (result.role === 'driver') navigate('/driver');
            else if (result.role === 'client') navigate('/client');
            else navigate('/admin');
            window.location.reload();
        } catch (err) {
            toast.error(`Greška: ${err.message}. Ako problem i dalje postoji, osvežite stranicu.`);
        }
    };

    const refreshUsers = async () => { setUsers(await fetchAllUsers()); };
    const refreshCompanies = async () => { setCompanies(await fetchAllCompanies()); };
    const handleResetPassword = async (userId, newPassword) => {
        try {
            await resetUserPassword(userId, newPassword);
            toast.success('Lozinka uspesno resetovana');
        } catch (err) {
            throw err;
        }
    };

    // Equipment handlers
    const handleAddEquipment = async (newEq) => {
        try {
            const created = await createEquipment(newEq);
            setEquipment(prev => [...prev, created]);
            toast.success('Oprema uspešno dodata');
        } catch (err) {
            console.error('Error adding equipment:', err);
            toast.error('Greška pri dodavanju opreme');
        }
    };

    const handleAssignEquipment = async (eqId, clientId) => {
        try {
            const client = clients.find(c => c.id === clientId);
            await updateEquipment(eqId, { assigned_to: clientId || null });
            setEquipment(prev => prev.map(eq => eq.id === eqId ? { ...eq, assigned_to: clientId, assigned_to_name: client?.name || null } : eq));
            toast.success(clientId ? 'Oprema dodeljena klijentu' : 'Dodela opreme uklonjena');
        } catch (err) {
            console.error('Error assigning equipment:', err);
            toast.error('Greška pri dodeli opreme');
        }
    };

    const handleDeleteEquipment = async (id) => {
        const eq = equipment.find(e => e.id === id);
        const confirmMessage = eq?.assigned_to
            ? `Ova oprema je dodeljena klijentu "${eq.assigned_to_name || 'Nepoznat'}". Da li ste sigurni da želite da je obrišete?`
            : 'Obrisati opremu?';
        if (window.confirm(confirmMessage)) {
            try {
                await deleteEquipment(id);
                setEquipment(prev => prev.filter(e => e.id !== id));
                toast.success('Oprema obrisana');
            } catch (err) {
                console.error('Error deleting equipment:', err);
                toast.error('Greška pri brisanju opreme');
            }
        }
    };

    const handleEditEquipment = async (updated) => {
        try {
            await updateEquipment(updated.id, updated);
            setEquipment(prev => prev.map(eq => eq.id === updated.id ? { ...updated } : eq));
            toast.success('Oprema ažurirana');
        } catch (err) {
            console.error('Error updating equipment:', err);
            toast.error('Greška pri ažuriranju opreme');
        }
    };

    const handleClientClick = (clientId) => {
        const client = clients.find(c => c.id === clientId);
        if (client) setSelectedClient(client);
    };

    // Waste types handlers
    const handleAddWasteType = async (newType) => {
        try {
            const created = await createWasteType(newType);
            setWasteTypes(prev => [...prev, created]);
            toast.success('Vrsta robe dodana');
        } catch (e) {
            toast.error('Greška pri čuvanju: ' + e.message);
        }
    };

    const handleDeleteWasteType = async (id) => {
        if (window.confirm('Obrisati vrstu robe?')) {
            try {
                await deleteWasteType(id);
                setWasteTypes(prev => prev.filter(wt => wt.id !== id));
                toast.success('Vrsta robe obrisana');
            } catch (e) {
                toast.error('Greška pri brisanju: ' + e.message);
            }
        }
    };

    const handleEditWasteType = async (updatedType) => {
        try {
            const updated = await updateWasteType(updatedType.id, {
                label: updatedType.label,
                icon: updatedType.icon,
                customImage: updatedType.customImage,
                name: updatedType.name,
                description: updatedType.description,
                region_id: updatedType.region_id
            });
            setWasteTypes(prev => prev.map(wt => wt.id === updated.id ? updated : wt));
            return updated;
        } catch (e) {
            toast.error('Greška pri izmeni: ' + e.message);
            throw e;
        }
    };

    // Client location handler
    const handleSaveClientLocation = async (position) => {
        if (editingClientLocation) {
            try {
                let newAddress = editingClientLocation.address || '';
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position[0]}&lon=${position[1]}&accept-language=sr`);
                    const geoData = await response.json();
                    if (geoData.display_name) {
                        const parts = [];
                        if (geoData.address?.road) parts.push(geoData.address.road);
                        if (geoData.address?.house_number) parts.push(geoData.address.house_number);
                        if (geoData.address?.city || geoData.address?.town || geoData.address?.village) {
                            parts.push(geoData.address.city || geoData.address.town || geoData.address.village);
                        }
                        newAddress = parts.length > 0 ? parts.join(' ') : geoData.display_name.split(',').slice(0, 3).join(',');
                    }
                } catch (geoError) {
                    console.warn('Reverse geocoding failed:', geoError);
                }

                await setClientLocationWithRequests(editingClientLocation.id, position[0], position[1]);

                const { error: userError } = await supabase
                    .from('users')
                    .update({ address: newAddress })
                    .eq('id', editingClientLocation.id)
                    .eq('company_code', companyCode);
                if (userError) throw userError;

                const { error: requestsError } = await supabase
                    .from('pickup_requests')
                    .update({ client_address: newAddress })
                    .eq('user_id', editingClientLocation.id)
                    .eq('company_code', companyCode)
                    .eq('status', 'pending');
                if (requestsError) throw requestsError;

                setClients(prev => prev.map(c =>
                    c.id === editingClientLocation.id
                        ? { ...c, latitude: position[0], longitude: position[1], address: newAddress }
                        : c
                ));
                await fetchPickupRequests();

                toast.success('Lokacija uspešno sačuvana');
                setEditingClientLocation(null);
            } catch (err) {
                console.error('Error saving location:', err);
                toast.error('Greška pri čuvanju lokacije: ' + err.message);
            }
        }
    };

    // Client equipment handler
    const handleSaveClientEquipment = async (clientId, equipmentTypes, note, pib, allowedWasteTypes = null) => {
        try {
            await updateClientDetails(clientId, equipmentTypes, note, pib, allowedWasteTypes);
            setClients(prev => prev.map(c =>
                c.id === clientId
                    ? { ...c, equipment_types: equipmentTypes, manager_note: note, pib: pib, allowed_waste_types: allowedWasteTypes }
                    : c
            ));
        } catch (err) {
            throw err;
        }
    };

    const handleUpdateClientWasteTypes = async (clientId, allowedWasteTypes) => {
        const client = clients.find(c => c.id === clientId);
        if (!client) return;
        try {
            await updateClientDetails(
                clientId,
                client.equipment_types || [],
                client.manager_note || '',
                client.pib || '',
                allowedWasteTypes
            );
            setClients(prev => prev.map(c =>
                c.id === clientId
                    ? { ...c, allowed_waste_types: allowedWasteTypes }
                    : c
            ));
        } catch (err) {
            throw err;
        }
    };

    const handleBulkWasteTypeUpdate = async ({ mode, wasteTypeIds, clientIds }) => {
        try {
            const batchSize = 50;
            const batches = [];
            for (let i = 0; i < clientIds.length; i += batchSize) {
                batches.push(clientIds.slice(i, i + batchSize));
            }

            for (const batch of batches) {
                const updates = batch.map(async (clientId) => {
                    const client = clients.find(c => c.id === clientId);
                    if (!client) return;

                    let currentAllowed = client.allowed_waste_types || [];
                    if (currentAllowed.length === 0) {
                        currentAllowed = wasteTypes.map(wt => wt.id);
                    }

                    let newAllowed;
                    if (mode === 'add') {
                        newAllowed = [...new Set([...currentAllowed, ...wasteTypeIds])];
                    } else {
                        newAllowed = currentAllowed.filter(id => !wasteTypeIds.includes(id));
                    }

                    await updateClientDetails(
                        clientId,
                        client.equipment_types || [],
                        client.manager_note || '',
                        client.pib || '',
                        newAllowed
                    );

                    return { clientId, newAllowed };
                });

                await Promise.all(updates);
            }

            const refreshed = await fetchCompanyClients(companyCode);
            setClients(refreshed || []);
            toast.success(`Uspešno ažurirano ${clientIds.length} klijenata`);
        } catch (err) {
            toast.error('Greška pri ažuriranju: ' + err.message);
            throw err;
        }
    };

    // Driver operations
    const handleAssignDriverFromMap = async (requestIds, driverId) => {
        try {
            const { data, error } = await supabase.rpc('assign_requests_to_driver', {
                p_request_ids: requestIds,
                p_driver_id: driverId,
                p_company_code: companyCode
            });

            if (error) throw error;

            const result = typeof data === 'string' ? JSON.parse(data) : data;
            if (!result?.success) {
                throw new Error(result?.error || 'Nemate dozvolu za ovu akciju');
            }

            const driver = companyDrivers.find(d => d.id === driverId);
            toast.success(`${result.assigned_count || requestIds.length} zahtev(a) dodeljeno vozaču: ${driver?.name || 'Nepoznato'}`);
        } catch (err) {
            console.error('Error assigning driver:', err);
            throw err;
        }
    };

    const handleQuickAssignDriver = async (requestId, driverId) => {
        try {
            const { data, error } = await supabase.rpc('assign_requests_to_driver', {
                p_request_ids: [requestId],
                p_driver_id: driverId,
                p_company_code: companyCode
            });

            if (error) throw error;

            const result = typeof data === 'string' ? JSON.parse(data) : data;

            if (!result?.success) {
                throw new Error(result?.error || 'Nemate dozvolu za ovu akciju');
            }

            if (result?.assigned_count === 0) {
                throw new Error('Zahtev nije pronađen ili ne pripada vašoj firmi');
            }

            const driver = companyDrivers.find(d => d.id === driverId);
            toast.success(`Zahtev dodeljen vozaču: ${driver?.name || 'Nepoznato'}`);

            await fetchDriverAssignments(companyCode);
        } catch (err) {
            console.error('Error quick assigning driver:', err);
            toast.error('Greška pri dodeli vozača: ' + err.message);
        }
    };

    const handleAssignDriverToProcessed = async (requestId, driverId) => {
        try {
            const driver = companyDrivers.find(d => d.id === driverId);

            const { error } = await supabase
                .from('processed_requests')
                .update({
                    driver_id: driverId,
                    driver_name: driver?.name || null
                })
                .eq('id', requestId)
                .eq('company_code', companyCode);

            if (error) throw error;

            setProcessedRequests(prev => prev.map(r =>
                r.id === requestId
                    ? { ...r, driver_id: driverId, driver_name: driver?.name || null }
                    : r
            ));

            toast.success(`Vozač ${driver?.name || 'Nepoznato'} evidentiran za zahtev`);
        } catch (err) {
            console.error('Error assigning driver to processed request:', err);
            toast.error('Greška pri evidentiranju vozača: ' + err.message);
        }
    };

    // Export functions
    const exportToCSV = (data, filename, headers) => {
        const csvContent = [
            headers.map(h => h.label).join(';'),
            ...data.map(row => headers.map(h => `"${(row[h.key] || '').toString().replace(/"/g, '""')}"`).join(';'))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const handleExportUsers = () => {
        const headers = [
            { key: 'name', label: 'Ime' },
            { key: 'phone', label: 'Telefon' },
            { key: 'role', label: 'Uloga' },
            { key: 'companyName', label: 'Firma' },
            { key: 'address', label: 'Adresa' }
        ];
        const data = users.map(u => ({
            name: u.name,
            phone: u.phone,
            role: u.role === 'developer' ? 'Developer' : u.role === 'admin' ? 'Admin' : u.role === 'manager' ? 'Menadžer' : 'Klijent',
            companyName: u.company?.name || '',
            address: u.address || ''
        }));
        exportToCSV(data, 'korisnici', headers);
    };

    const handleExportCompanies = () => {
        const headers = [
            { key: 'name', label: 'Naziv' },
            { key: 'code', label: 'ECO Kod' },
            { key: 'status', label: 'Status' },
            { key: 'managerCount', label: 'Menadžeri' },
            { key: 'clientCount', label: 'Klijenti' }
        ];
        const data = companies.map(c => ({
            name: c.name,
            code: c.code,
            status: c.status === 'frozen' ? 'Zamrznuta' : 'Aktivna',
            managerCount: c.managerCount || 0,
            clientCount: c.clientCount || 0
        }));
        exportToCSV(data, 'firme', headers);
    };

    // Menu and stats
    const menu = getMenuByRole(userRole, pickupRequests, clientRequests, unreadCount);
    const pending = useMemo(() => pickupRequests?.filter(r => r.status === 'pending') || [], [pickupRequests]);

    const selectedRequest = useMemo(() => {
        if (!selectedRequestId) return null;
        return pickupRequests?.find(r => r.id === selectedRequestId) || null;
    }, [selectedRequestId, pickupRequests]);

    const setSelectedRequest = (request) => {
        setSelectedRequestId(request?.id || null);
    };

    // Render content based on role
    const renderContent = () => {
        // Chat is available for both managers and clients
        if (activeTab === 'messages') {
            return <ChatInterface user={user} fetchMessages={fetchMessages} sendMessage={sendMessage} markMessagesAsRead={markMessagesAsRead} getConversations={getConversations} fetchCompanyClients={fetchCompanyClients} fetchCompanyMembers={fetchCompanyMembers} sendMessageToAdmins={sendMessageToAdmins} fetchCompanyAdmin={fetchCompanyAdmin} sendMessageToCompanyAdmin={sendMessageToCompanyAdmin} userRole={userRole} subscribeToMessages={subscribeToMessages} deleteConversation={deleteConversation} />;
        }

        if (userRole === 'client') {
            return (
                <ClientDashboard
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    wasteTypes={wasteTypes}
                    user={user}
                    clientRequests={clientRequests}
                    clientHistory={clientHistory}
                    historyLoading={historyLoading}
                    unreadCount={unreadCount}
                    handleNewRequest={handleNewRequest}
                    submitLoading={submitLoading}
                    removePickupRequest={removePickupRequest}
                    hideClientHistoryItem={hideClientHistoryItem}
                />
            );
        }

        if (userRole === 'manager') {
            return (
                <ManagerDashboard
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    pending={pending}
                    processedRequests={processedRequests}
                    clients={clients}
                    regions={regions}
                    equipment={equipment}
                    wasteTypes={wasteTypes}
                    companyDrivers={companyDrivers}
                    driverAssignments={driverAssignments}
                    companyCode={companyCode}
                    user={user}
                    userRole={userRole}
                    mapType={mapType}
                    setMapType={setMapType}
                    historyPage={historyPage}
                    companyMembers={companyMembers}
                    handleProcessRequest={handleProcessRequest}
                    handleRejectRequest={handleRejectRequest}
                    setSelectedRequest={setSelectedRequest}
                    handleClientClick={handleClientClick}
                    setUrgencyFilter={setUrgencyFilter}
                    urgencyFilter={urgencyFilter}
                    handleQuickAssignDriver={handleQuickAssignDriver}
                    setEditingClientLocation={setEditingClientLocation}
                    setShowCreateRequestModal={setShowCreateRequestModal}
                    fetchProcessedRequests={fetchProcessedRequests}
                    setProcessedRequests={setProcessedRequests}
                    setHistoryCount={setHistoryCount}
                    updateProcessedRequest={updateProcessedRequest}
                    deleteProcessedRequest={deleteProcessedRequest}
                    handleAssignDriverToProcessed={handleAssignDriverToProcessed}
                    setSelectedClient={setSelectedClient}
                    handleDeleteClient={handleDeleteClient}
                    setEditingClientEquipment={setEditingClientEquipment}
                    setShowImportClientsModal={setShowImportClientsModal}
                    handleAddEquipment={handleAddEquipment}
                    handleAssignEquipment={handleAssignEquipment}
                    handleDeleteEquipment={handleDeleteEquipment}
                    handleEditEquipment={handleEditEquipment}
                    handleAddWasteType={handleAddWasteType}
                    handleDeleteWasteType={handleDeleteWasteType}
                    handleEditWasteType={handleEditWasteType}
                    handleUpdateClientWasteTypes={handleUpdateClientWasteTypes}
                    handleBulkWasteTypeUpdate={handleBulkWasteTypeUpdate}
                    handleAssignDriverFromMap={handleAssignDriverFromMap}
                    setClientLocationWithRequests={setClientLocationWithRequests}
                    fetchCompanyClients={fetchCompanyClients}
                    toast={toast}
                    allowBulkMapAssignment={allowBulkMapAssignment}
                />
            );
        }

        if (userRole === 'supervisor') {
            return (
                <SupervisorDashboard
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    pending={pending}
                    processedRequests={processedRequests}
                    clients={clients}
                    regions={regions}
                    equipment={equipment}
                    wasteTypes={wasteTypes}
                    companyDrivers={companyDrivers}
                    driverAssignments={driverAssignments}
                    companyCode={companyCode}
                    user={user}
                    userRole={userRole}
                    mapType={mapType}
                    setMapType={setMapType}
                    historyPage={historyPage}
                    companyMembers={companyMembers}
                    handleProcessRequest={handleProcessRequest}
                    handleRejectRequest={handleRejectRequest}
                    setSelectedRequest={setSelectedRequest}
                    handleClientClick={handleClientClick}
                    handleQuickAssignDriver={handleQuickAssignDriver}
                    setEditingClientLocation={setEditingClientLocation}
                    setShowCreateRequestModal={setShowCreateRequestModal}
                    fetchProcessedRequests={fetchProcessedRequests}
                    setProcessedRequests={setProcessedRequests}
                    updateProcessedRequest={updateProcessedRequest}
                    deleteProcessedRequest={deleteProcessedRequest}
                    handleAssignDriverToProcessed={handleAssignDriverToProcessed}
                    resetManagerAnalytics={resetManagerAnalytics}
                    setSelectedClient={setSelectedClient}
                    handleDeleteClient={handleDeleteClient}
                    setEditingClientEquipment={setEditingClientEquipment}
                    handleAddEquipment={handleAddEquipment}
                    handleAssignEquipment={handleAssignEquipment}
                    handleDeleteEquipment={handleDeleteEquipment}
                    handleEditEquipment={handleEditEquipment}
                    handleAddWasteType={handleAddWasteType}
                    handleDeleteWasteType={handleDeleteWasteType}
                    handleEditWasteType={handleEditWasteType}
                    handleUpdateClientWasteTypes={handleUpdateClientWasteTypes}
                    handleBulkWasteTypeUpdate={handleBulkWasteTypeUpdate}
                    handleAssignDriverFromMap={handleAssignDriverFromMap}
                    setClientLocationWithRequests={setClientLocationWithRequests}
                    fetchCompanyClients={fetchCompanyClients}
                    toast={toast}
                    allowBulkMapAssignment={allowBulkMapAssignment}
                />
            );
        }

        if (userRole === 'company_admin') {
            return (
                <CompanyAdminDashboard
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    pending={pending}
                    processedRequests={processedRequests}
                    clients={clients}
                    regions={regions}
                    equipment={equipment}
                    wasteTypes={wasteTypes}
                    companyDrivers={companyDrivers}
                    driverAssignments={driverAssignments}
                    companyCode={companyCode}
                    user={user}
                    userRole={userRole}
                    historyPage={historyPage}
                    companyMembers={companyMembers}
                    setSelectedRequest={setSelectedRequest}
                    handleClientClick={handleClientClick}
                    fetchProcessedRequests={fetchProcessedRequests}
                    setProcessedRequests={setProcessedRequests}
                    updateProcessedRequest={updateProcessedRequest}
                    deleteProcessedRequest={deleteProcessedRequest}
                    handleAssignDriverToProcessed={handleAssignDriverToProcessed}
                    resetManagerAnalytics={resetManagerAnalytics}
                    handleAddEquipment={handleAddEquipment}
                    handleAssignEquipment={handleAssignEquipment}
                    handleDeleteEquipment={handleDeleteEquipment}
                    handleEditEquipment={handleEditEquipment}
                    handleAddWasteType={handleAddWasteType}
                    handleDeleteWasteType={handleDeleteWasteType}
                    handleEditWasteType={handleEditWasteType}
                    handleUpdateClientWasteTypes={handleUpdateClientWasteTypes}
                    handleBulkWasteTypeUpdate={handleBulkWasteTypeUpdate}
                    setClientLocationWithRequests={setClientLocationWithRequests}
                    fetchCompanyClients={fetchCompanyClients}
                    toast={toast}
                />
            );
        }

        if (userRole === 'admin') {
            return (
                <AdminDashboard
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    stats={stats}
                    companies={companies}
                    users={users}
                    masterCodes={masterCodes}
                    isDeveloper={isDeveloper}
                    handleDeleteUser={handleDeleteUser}
                    handleImpersonateUser={handleImpersonateUser}
                    changeUserRole={changeUserRole}
                    handleResetPassword={handleResetPassword}
                    refreshUsers={refreshUsers}
                    setEditingUser={setEditingUser}
                    setEditingCompany={setEditingCompany}
                    handleGenerateCode={handleGenerateCode}
                    handleCopyCode={handleCopyCode}
                    handleDeleteCode={handleDeleteCode}
                    handleUpdateCodePrice={handleUpdateCodePrice}
                    handleExportUsers={handleExportUsers}
                    handleExportCompanies={handleExportCompanies}
                />
            );
        }

        return null;
    };

    return (
        <div className="min-h-screen bg-slate-100 flex">
            {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}
            <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-800 transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="h-full flex flex-col">
                    <div className="h-20 flex items-center justify-between px-6 border-b border-slate-700">
                        <div className="flex items-center gap-2"><div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white shrink-0"><Mountain size={20} /></div><div className="flex flex-col leading-tight"><span className="font-bold text-lg text-white">EcoMountain</span><span className="font-bold text-sm text-emerald-400">Tracking</span></div></div>
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400"><X size={24} /></button>
                    </div>
                    <nav className="flex-1 p-4 space-y-1">
                        {menu.map(m => {
                            const processItem = (item) => ({
                                ...item,
                                active: activeTab === item.id,
                                onClick: () => {
                                    if (!item.children && !item.isLink) {
                                        setActiveTab(item.id);
                                        setSidebarOpen(false);
                                    }
                                },
                                children: item.children ? item.children.map(processItem) : undefined
                            });

                            return <SidebarItem key={m.id || m.label} {...processItem(m)} />;
                        })}
                    </nav>
                    <div className="p-4 border-t border-slate-700"><SidebarItem icon={LogOut} label="Odjavi se" onClick={handleLogout} /></div>
                </div>
            </aside>
            <div className="flex-1 flex flex-col min-w-0 relative">
                <div className={`absolute inset-0 bg-cover bg-center pointer-events-none ${userRole === 'client' ? 'opacity-70' : 'opacity-10'}`} style={{ backgroundImage: 'url(https://vmsfsstxxndpxbsdylog.supabase.co/storage/v1/object/public/assets/background.jpg)' }} />
                {/* Impersonation Banner */}
                {originalUser && (
                    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between relative z-40">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={18} />
                            <span className="font-medium">Prijavljen kao: <strong>{user?.name}</strong> ({user?.role})</span>
                        </div>
                        <button
                            onClick={() => { exitImpersonation(); navigate('/admin'); window.location.reload(); }}
                            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg font-medium transition-colors"
                        >
                            <LogOut size={16} />
                            Vrati se na {originalUser.user?.name}
                        </button>
                    </div>
                )}
                <header className="h-20 bg-white/80 backdrop-blur-sm border-b flex items-center justify-between px-6 relative z-30">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-500 lg:hidden"><Menu size={24} /></button>
                        {userRole !== 'admin' && companyCode && (
                            <button
                                onClick={() => { navigator.clipboard.writeText(companyCode); toast.success('ECO kod kopiran!'); }}
                                className="hidden md:flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl px-4 py-2.5 transition-colors"
                            >
                                <Building2 size={18} className="text-emerald-600" />
                                <span className="text-sm font-medium text-emerald-700">ECO Kod:</span>
                                <code className="text-sm font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">{companyCode}</code>
                                <Copy size={14} className="text-emerald-500" />
                            </button>
                        )}
                        {['manager', 'driver'].includes(userRole) && regionName && (
                            <div className="hidden md:flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-4 py-2.5">
                                <MapPin size={18} className="text-purple-600" />
                                <span className="text-sm font-medium text-purple-700">Filijala:</span>
                                <span className="text-sm font-bold text-purple-800">{regionName}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Chat */}
                        {true && (
                            <div className="relative">
                                <button
                                    onClick={() => { setShowChatDropdown(!showChatDropdown); setShowNotifications(false); setShowProfileMenu(false); }}
                                    className="relative p-2.5 text-slate-500 hover:bg-slate-50 rounded-full"
                                >
                                    <MessageCircle size={20} />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium animate-pulse">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>
                                {showChatDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowChatDropdown(false)} />
                                        <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-16 sm:top-full mt-0 sm:mt-2 w-auto sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden max-w-[calc(100vw-2rem)]">
                                            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                                                <h3 className="font-bold text-slate-800">Poruke</h3>
                                                <button
                                                    onClick={() => { setShowChatDropdown(false); setActiveTab('messages'); }}
                                                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                                >
                                                    Otvori sve
                                                </button>
                                            </div>
                                            <div className="max-h-80 overflow-y-auto">
                                                {unreadCount > 0 ? (
                                                    <button
                                                        onClick={() => { setShowChatDropdown(false); setActiveTab('messages'); }}
                                                        className="w-full px-4 py-4 text-left hover:bg-slate-50 flex items-center gap-3"
                                                    >
                                                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                                            <MessageCircle size={20} className="text-emerald-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-700">Imate {unreadCount} nepročitanih poruka</p>
                                                            <p className="text-xs text-slate-500">Kliknite da vidite</p>
                                                        </div>
                                                    </button>
                                                ) : (
                                                    <div className="px-4 py-8 text-center text-slate-400">
                                                        <MessageCircle size={24} className="mx-auto mb-2 opacity-50" />
                                                        <p className="text-sm">Nema novih poruka</p>
                                                        <button
                                                            onClick={() => { setShowChatDropdown(false); setActiveTab('messages'); }}
                                                            className="mt-2 text-emerald-600 text-sm font-medium"
                                                        >
                                                            Otvori poruke
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        {['manager', 'supervisor', 'company_admin'].includes(userRole) && (
                            <HelpButton />
                        )}
                        <NotificationBell />
                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
                                className="flex items-center gap-3 pl-4 border-l hover:bg-slate-50 rounded-xl py-1 pr-2 transition-colors"
                            >
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-bold">{user?.name}</p>
                                    <p className="text-xs text-slate-500">{getRoleLabel(user?.role)}{companyName ? ` • ${companyName}` : ''}</p>
                                </div>
                                <div className="w-11 h-11 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-lg">{user?.name?.charAt(0)}</div>
                                <ChevronDown size={16} className="text-slate-400 hidden sm:block" />
                            </button>
                            {showProfileMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                                    <div className="fixed sm:absolute right-4 sm:right-0 top-16 sm:top-full mt-0 sm:mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 py-2">
                                        <div className="px-4 py-3 border-b border-slate-100">
                                            <p className="font-bold text-slate-800">{user?.name}</p>
                                            <p className="text-xs text-slate-500">{user?.phone}</p>
                                        </div>
                                        {userRole !== 'admin' && companyCode && (
                                            <button
                                                onClick={() => { navigator.clipboard.writeText(companyCode); toast.success('ECO kod kopiran!'); setShowProfileMenu(false); }}
                                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-left md:hidden"
                                            >
                                                <Copy size={18} className="text-slate-400" />
                                                <div>
                                                    <p className="text-sm font-medium">ECO Kod</p>
                                                    <p className="text-xs text-slate-500">{companyCode}</p>
                                                </div>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { setShowSettings(true); setShowProfileMenu(false); setEditingProfile({ name: user?.name || '', phone: user?.phone || '', companyName: companyName || '', address: user?.address || '', latitude: user?.latitude || null, longitude: user?.longitude || null }); }}
                                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-left"
                                        >
                                            <Settings size={18} className="text-slate-400" />
                                            <span className="text-sm">{language === 'sr' ? 'Podešavanja' : 'Settings'}</span>
                                        </button>
                                        <button
                                            onClick={() => { setLanguage(language === 'sr' ? 'en' : 'sr'); setShowProfileMenu(false); }}
                                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-left"
                                        >
                                            <Globe size={18} className="text-slate-400" />
                                            <span className="text-sm">{language === 'sr' ? 'English' : 'Srpski'}</span>
                                        </button>
                                        <div className="border-t border-slate-100 mt-2 pt-2">
                                            <button
                                                onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 text-left text-red-600"
                                            >
                                                <LogOut size={18} />
                                                <span className="text-sm">{language === 'sr' ? 'Odjavi se' : 'Log out'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>
                <main className={`flex-1 overflow-y-auto relative z-10 ${activeTab === 'map' || activeTab === 'dashboard' ? 'p-0 overflow-hidden' : 'p-6 lg:p-8'}`}>
                    <div className={`${activeTab === 'map' || activeTab === 'dashboard' ? 'w-full h-full flex flex-col' : 'max-w-7xl mx-auto'}`}>
                        {activeTab !== 'map' && activeTab !== 'dashboard' && activeTab !== 'regions' && activeTab !== 'history' && activeTab !== 'drivers' && activeTab !== 'analytics' && activeTab !== 'equipment' && activeTab !== 'wastetypes' && activeTab !== 'codes' && <div className="mb-8"><h1 className="text-2xl font-bold">{activeTab === 'new' ? 'Novi zahtev' : activeTab === 'requests' ? 'Zahtevi' : activeTab === 'clients' ? 'Klijenti' : activeTab === 'print' ? 'Štampaj / Export' : activeTab === 'messages' ? 'Poruke' : activeTab === 'companies' ? 'Firme' : activeTab === 'users' ? 'Korisnici' : activeTab === 'visual' ? 'Vizuelni Editor' : ''}</h1></div>}
                        {loading ? <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-emerald-600" size={32} /></div> : renderContent()}
                    </div>
                </main>
            </div>
            {/* Modals */}
            <RequestDetailsModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />
            <ProcessRequestModal
                request={processingRequest}
                onProcess={handleConfirmProcess}
                onClose={() => setProcessingRequest(null)}
                hasDriverAssignment={!!(driverAssignments || []).find(a => a.request_id === processingRequest?.id)}
                driverAssignment={(driverAssignments || []).find(a => a.request_id === processingRequest?.id) || null}
                drivers={companyDrivers}
                onQuickAssign={handleQuickAssignDriver}
            />
            <CreateRequestModal
                open={showCreateRequestModal}
                onClose={() => setShowCreateRequestModal(false)}
                clients={clients}
                wasteTypes={wasteTypes}
                managerName={user?.name}
                onSubmit={async (data) => {
                    await createRequestForClient(data);
                    toast.success('Zahtev uspešno kreiran');
                }}
            />
            <ClientDetailsModal client={selectedClient} equipment={equipment} wasteTypes={wasteTypes} onClose={() => setSelectedClient(null)} />
            {editingClientLocation && (
                <Modal open={!!editingClientLocation} onClose={() => setEditingClientLocation(null)} title="Podesi lokaciju klijenta">
                    <LocationPicker
                        initialPosition={editingClientLocation.latitude && editingClientLocation.longitude ? [editingClientLocation.latitude, editingClientLocation.longitude] : getStablePosition(editingClientLocation.id)}
                        onSave={handleSaveClientLocation}
                        onCancel={() => setEditingClientLocation(null)}
                        clientName={editingClientLocation.name}
                    />
                </Modal>
            )}
            {editingClientEquipment && (
                <ClientEquipmentModal
                    client={editingClientEquipment}
                    equipment={equipment}
                    wasteTypes={wasteTypes}
                    onSave={handleSaveClientEquipment}
                    onClose={() => setEditingClientEquipment(null)}
                />
            )}
            <ImportClientsModal
                open={showImportClientsModal}
                onClose={() => setShowImportClientsModal(false)}
                companyCode={companyCode}
                existingPhones={clients.map(c => c.phone)}
                onImport={async (clientsToImport) => {
                    const result = await createShadowClients(clientsToImport);
                    if (result.created > 0) {
                        const refreshed = await fetchCompanyClients(companyCode);
                        setClients(refreshed || []);
                        toast.success(`Uspešno importovano ${result.created} klijent${result.created === 1 ? '' : 'a'}`);
                    }
                    return result;
                }}
            />
            {processedNotification && <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-50"><CheckCircle2 size={24} /><div><p className="font-semibold">{language === 'sr' ? 'Zahtev obrađen!' : 'Request processed!'}</p><p className="text-sm opacity-90">"{processedNotification.wasteLabel}" {language === 'sr' ? 'preuzet' : 'picked up'}</p></div><button onClick={clearProcessedNotification} className="p-1 hover:bg-white/20 rounded-lg"><X size={20} /></button></div>}
            {/* Settings Modal */}
            <ModalWithFooter
                open={showSettings}
                onClose={() => setShowSettings(false)}
                title={language === 'sr' ? 'Podešavanja' : 'Settings'}
                size="xl"
                footer={
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowSettings(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium"
                        >
                            {language === 'sr' ? 'Odustani' : 'Cancel'}
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    if (editingProfile.name && editingProfile.name !== user?.name) {
                                        await updateProfile(editingProfile.name);
                                    }
                                    if (editingProfile.latitude && editingProfile.longitude && (editingProfile.latitude !== user?.latitude || editingProfile.longitude !== user?.longitude || editingProfile.address !== user?.address)) {
                                        await updateLocation(editingProfile.latitude, editingProfile.longitude, editingProfile.address);
                                    }
                                    toast.success(language === 'sr' ? 'Podešavanja sačuvana' : 'Settings saved');
                                    setShowSettings(false);
                                } catch (error) {
                                    console.error('Error saving settings:', error);
                                    toast.error(language === 'sr' ? 'Greška pri čuvanju' : 'Error saving settings');
                                }
                            }}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-sm shadow-emerald-200"
                        >
                            {language === 'sr' ? 'Sačuvaj izmene' : 'Save Changes'}
                        </button>
                    </div>
                }
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 h-full">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">{language === 'sr' ? 'Jezik / Language' : 'Language / Jezik'}</label>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setLanguage('sr')}
                                    className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${language === 'sr' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <span className="text-xl mb-1 block">🇷🇸</span>
                                    <span className="text-sm font-medium">Srpski</span>
                                </button>
                                <button
                                    onClick={() => setLanguage('en')}
                                    className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${language === 'en' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <span className="text-xl mb-1 block">🇬🇧</span>
                                    <span className="text-sm font-medium">English</span>
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'sr' ? 'Ime i prezime' : 'Full name'}</label>
                            <input
                                type="text"
                                value={editingProfile.name}
                                onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'sr' ? 'Broj telefona' : 'Phone number'}</label>
                            <input
                                type="tel"
                                value={editingProfile.phone}
                                disabled
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-slate-400 mt-1">{language === 'sr' ? 'Broj telefona se ne može menjati jer se koristi za prijavu' : 'Phone number cannot be changed as it is used for login'}</p>
                        </div>
                        {userRole !== 'admin' && companyCode && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'sr' ? 'ECO Kod firme' : 'Company ECO Code'}</label>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-mono font-bold">{companyCode}</code>
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(companyCode); toast.success(language === 'sr' ? 'Kopirano!' : 'Copied!'); }}
                                        className="p-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl transition-colors"
                                    >
                                        <Copy size={20} />
                                    </button>
                                </div>
                            </div>
                        )}
                        {/* Map settings - only for manager/supervisor/company_admin */}
                        {['manager', 'supervisor', 'company_admin'].includes(userRole) && (
                            <div className="pt-4 border-t border-slate-100">
                                <label className="block text-sm font-medium text-slate-700 mb-3">
                                    {language === 'sr' ? 'Podešavanja mape' : 'Map Settings'}
                                </label>
                                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={user?.settings?.allow_bulk_map_assignment ?? true}
                                        onChange={async (e) => {
                                            try {
                                                await updateUserSettings({ allow_bulk_map_assignment: e.target.checked });
                                                toast.success(e.target.checked
                                                    ? (language === 'sr' ? 'Grupna dodela omogućena' : 'Bulk assignment enabled')
                                                    : (language === 'sr' ? 'Grupna dodela onemogućena' : 'Bulk assignment disabled')
                                                );
                                            } catch (err) {
                                                toast.error(language === 'sr' ? 'Greška pri čuvanju' : 'Error saving');
                                            }
                                        }}
                                        className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">
                                            {language === 'sr' ? 'Dozvoli grupnu dodelu iz mape' : 'Allow bulk assignment from map'}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {language === 'sr'
                                                ? 'Kada kliknete na cluster na mapi, ponudiće vam opciju da dodelite sve zahteve jednom vozaču'
                                                : 'When you click a cluster on the map, it will offer to assign all requests to one driver'
                                            }
                                        </p>
                                    </div>
                                </label>
                            </div>
                        )}
                    </div>
                    {userRole !== 'admin' && (
                        <div className="flex flex-col h-full min-h-[400px]">
                            <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'sr' ? 'Moja lokacija' : 'My location'}</label>
                            <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 mb-2 relative min-h-[300px]">
                                <MapContainer
                                    center={[editingProfile.latitude || 44.8, editingProfile.longitude || 20.45]}
                                    zoom={editingProfile.latitude ? 15 : 11}
                                    style={{ height: '100%', width: '100%', minHeight: '100%' }}
                                >
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <DraggableMarker
                                        position={editingProfile.latitude && editingProfile.longitude ? [editingProfile.latitude, editingProfile.longitude] : [44.8, 20.45]}
                                        onPositionChange={async (newPos) => {
                                            try {
                                                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newPos[0]}&lon=${newPos[1]}&accept-language=sr`);
                                                const data = await response.json();
                                                setEditingProfile({
                                                    ...editingProfile,
                                                    latitude: newPos[0],
                                                    longitude: newPos[1],
                                                    address: data.display_name || editingProfile.address
                                                });
                                            } catch {
                                                setEditingProfile({
                                                    ...editingProfile,
                                                    latitude: newPos[0],
                                                    longitude: newPos[1]
                                                });
                                            }
                                        }}
                                    />
                                </MapContainer>
                            </div>
                            {editingProfile.address && (
                                <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                                    <MapPin size={12} className="text-emerald-500 shrink-0" />
                                    <span className="truncate">{editingProfile.address}</span>
                                </p>
                            )}
                            {editingProfile.latitude && editingProfile.longitude && (
                                <p className="text-xs text-emerald-600">
                                    {language === 'sr' ? 'Koordinate' : 'Coordinates'}: {editingProfile.latitude.toFixed(4)}, {editingProfile.longitude.toFixed(4)}
                                </p>
                            )}
                            <p className="text-xs text-slate-400 mt-2 italic border-t pt-2">
                                {language === 'sr' ? 'Savet: Prevucite crveni marker na mapi da podesite tačnu lokaciju vašeg objekta.' : 'Tip: Drag the red marker on the map to set the exact location of your facility.'}
                            </p>
                        </div>
                    )}
                </div>
            </ModalWithFooter>
            {editingUser && (
                <UserEditModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={async (userId, data) => {
                        await updateUser(userId, data);
                        refreshUsers();
                        setEditingUser(null);
                    }}
                />
            )}
            {editingCompany && (
                <CompanyEditModal
                    company={editingCompany}
                    onClose={() => setEditingCompany(null)}
                    onSave={async (companyCodeEdit, data) => {
                        await updateCompany(companyCodeEdit, data);
                        refreshCompanies();
                        setEditingCompany(null);
                    }}
                    onDelete={async (companyCodeDelete) => {
                        await deleteCompany(companyCodeDelete);
                        refreshCompanies();
                        setEditingCompany(null);
                    }}
                />
            )}
            {['manager', 'supervisor', 'company_admin'].includes(userRole) && (
                <HelpOverlay />
            )}
            {showRegionSelectModal && regions.length > 0 && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                            <div className="flex items-center gap-3 mb-2">
                                <MapPin size={28} />
                                <h2 className="text-xl font-bold">Dobrodošli!</h2>
                            </div>
                            <p className="text-emerald-100 text-sm">
                                Pre nego što nastavite, molimo izaberite filijalu kojoj pripadate.
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Vaša filijala
                                </label>
                                <select
                                    value={selectedRegionId}
                                    onChange={(e) => setSelectedRegionId(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800"
                                >
                                    <option value="">-- Izaberite filijalu --</option>
                                    {regions.map(region => (
                                        <option key={region.id} value={region.id}>
                                            {region.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={async () => {
                                    if (!selectedRegionId) {
                                        toast.error('Molimo izaberite filijalu');
                                        return;
                                    }
                                    setSavingRegion(true);
                                    try {
                                        await updateOwnRegion(selectedRegionId);
                                        toast.success('Filijala uspešno podešena!');
                                        setShowRegionSelectModal(false);
                                        window.location.reload();
                                    } catch (err) {
                                        toast.error('Greška: ' + err.message);
                                    } finally {
                                        setSavingRegion(false);
                                    }
                                }}
                                disabled={savingRegion || !selectedRegionId}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {savingRegion ? (
                                    <>
                                        <RefreshCw size={18} className="animate-spin" />
                                        Čuvanje...
                                    </>
                                ) : (
                                    'Potvrdi izbor'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

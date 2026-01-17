import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import {
    // Hooks
    useState, useEffect, useCallback, useMemo, useRef,
    useNavigate,
    useAuth,
    supabase,
    // Map components
    MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap,
    L,
    // Icons
    LayoutDashboard, Truck, Users, Settings, LogOut, Mountain, MapPin, Search, Menu, X, Plus, Recycle, BarChart3,
    FileText, Building2, AlertCircle, CheckCircle2, Clock, Package, Send, Trash2, Eye, Copy, ChevronRight, Phone,
    RefreshCw, Info, Box, ArrowUpDown, ArrowUp, ArrowDown, Filter, Upload, Image, Globe, ChevronDown, MessageCircle, Edit3, ArrowLeft, Loader2, History, Calendar, XCircle, Printer, Download, FileSpreadsheet,
    Lock, Unlock, AlertTriangle, LogIn, Network, UserCheck, ClipboardList,
    // Components
    createIcon, urgencyIcons, URGENCY_COLORS, WASTE_ICONS_MAP, createCustomIcon,
    markerStyles, getRemainingTime, getCurrentUrgency, WASTE_TYPES, uploadImage,
    ImageUploader, StatCard, SidebarItem, Modal, ModalWithFooter, EmptyState, FillLevelBar,
    NewRequestForm, ClientRequestsView, ClientHistoryView, ManagerRequestsTable,
    PrintExport, HistoryTable, ClientsTable, EquipmentManagement, WasteTypesManagement, NotificationBell, HelpButton, HelpOverlay,
    getStablePosition, DraggableMarker, LocationPicker, FitBounds, MapView,
    RequestDetailsModal, ClientDetailsModal, ClientEquipmentModal, ImportClientsModal, ProcessRequestModal, CreateRequestModal,
    AdminCompaniesTable, AdminUsersTable, MasterCodesTable, ChatInterface,
    UserDetailsModal, CompanyEditModal, UserEditModal, DeleteConfirmationModal,
    AnalyticsPage,
    ManagerAnalyticsPage,
    DriverAnalyticsPage,
    RegionsPage,
    CompanyStaffPage,
    RegionNodeEditor,
    CompanySettingsPage,
    ActivityLogPage
} from './DashboardComponents';
import DriverManagement from './DriverManagement';
import DriverDashboard from './DriverDashboard';

export default function Dashboard() {
    const navigate = useNavigate();
    const { user, logout, companyCode, companyName, regionName, pickupRequests, clientRequests, processedNotification, clearProcessedNotification, addPickupRequest, markRequestAsProcessed, removePickupRequest, fetchProcessedRequests, fetchClientHistory, getAdminStats, fetchAllCompanies, fetchAllUsers, fetchAllMasterCodes, generateMasterCode, deleteMasterCode, deleteUser, isDeveloper, deleteClient, unreadCount, fetchMessages, sendMessage, markMessagesAsRead, getConversations, updateClientDetails, sendMessageToAdmins, fetchCompanyAdmin, sendMessageToCompanyAdmin, updateProfile, updateCompanyName, updateLocation, originalUser, impersonateUser, exitImpersonation, changeUserRole, resetUserPassword, deleteConversation, updateUser, updateCompany, deleteCompany, subscribeToMessages, deleteProcessedRequest, updateProcessedRequest, fetchCompanyWasteTypes, updateCompanyWasteTypes, updateMasterCodePrice, fetchCompanyRegions, createWasteType, updateWasteType, deleteWasteType, createShadowClients } = useAuth();
    const { fetchCompanyEquipment, createEquipment, updateEquipment, deleteEquipment, migrateEquipmentFromLocalStorage, fetchCompanyMembers, fetchCompanyClients, createRequestForClient, resetManagerAnalytics, updateOwnRegion, setClientLocationWithRequests, fetchPickupRequests, hideClientHistoryItem } = useData();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(() => {
        const saved = localStorage.getItem('ecomountaint_activeTab');
        // For clients, default to 'new' (request form) if no saved tab or saved tab is 'dashboard'
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
    const [selectedRequest, setSelectedRequest] = useState(null);
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
    const [driverAssignments, setDriverAssignments] = useState([]);
    const [companyDrivers, setCompanyDrivers] = useState([]);
    const [companyMembers, setCompanyMembers] = useState([]);
    const [showRegionSelectModal, setShowRegionSelectModal] = useState(false);
    const [selectedRegionId, setSelectedRegionId] = useState('');
    const [showImportClientsModal, setShowImportClientsModal] = useState(false);
    const [savingRegion, setSavingRegion] = useState(false);

    const userRole = ['developer', 'admin'].includes(user?.role) ? 'admin' : user?.role === 'company_admin' ? 'company_admin' : user?.role || 'client';

    // Helper za prikaz uloge na srpskom
    const getRoleLabel = (role) => {
        const labels = {
            developer: 'Developer',
            admin: 'Administrator',
            company_admin: 'Admin firme',
            manager: 'Menadžer',
            driver: 'Vozač',
            client: 'Klijent'
        };
        return labels[role] || 'Korisnik';
    };

    // Driver ima svoj odvojeni UI (DriverDashboard)
    if (userRole === 'driver') {
        return <DriverDashboard />;
    }

    // Save activeTab to localStorage
    useEffect(() => {
        localStorage.setItem('ecomountaint_activeTab', activeTab);
    }, [activeTab]);

    // Realtime driver assignment updates (manager/company_admin)
    useEffect(() => {
        if (!companyCode) return;
        const channel = supabase
            .channel(`driver_assignments_company_${companyCode}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'driver_assignments',
                    filter: `company_code=eq.${companyCode}`
                },
                async () => {
                    await fetchDriverAssignments();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [companyCode]);

    // Realtime processed requests updates (manager/company_admin)
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
                    const updated = await fetchProcessedRequests();
                    setProcessedRequests(updated || []);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [companyCode]);

    // Load equipment from database (with one-time migration from localStorage)
    useEffect(() => {
        const loadEquipment = async () => {
            if (!companyCode || userRole === 'client') return;
            try {
                // First, try to migrate any localStorage data
                const migrationResult = await migrateEquipmentFromLocalStorage();
                if (migrationResult.migrated > 0) {
                    toast.success(`Migrirano ${migrationResult.migrated} tipova opreme u bazu`);
                }
                // Then fetch from database
                const dbEquipment = await fetchCompanyEquipment();
                setEquipment(dbEquipment);
            } catch (err) {
                console.error('Error loading equipment:', err);
            }
        };
        loadEquipment();
    }, [companyCode, userRole]);



    // Initial data load - only when role or companyCode changes (not on tab change!)
    const [initialDataLoaded, setInitialDataLoaded] = useState(false);
    useEffect(() => {
        if (companyCode || userRole === 'admin') {
            loadInitialData();
        }
    }, [userRole, companyCode]);

    // Tab-specific data load (without blocking UI)
    useEffect(() => {
        if (initialDataLoaded) {
            loadTabData();
        }
    }, [activeTab, initialDataLoaded]);

    // Load client history when client logs in or history tab is opened
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

    // NOTE: Real-time countdown moved to CountdownTimer component in ManagerRequestsTable
    // to avoid re-rendering entire Dashboard every second

    // Load initial data once (waste types, clients, stats) - blocks UI
    const loadInitialData = async () => {
        setLoading(true);
        try {
            if (userRole === 'admin') {
                setStats(await getAdminStats());
            } else if (userRole === 'manager' || userRole === 'client' || userRole === 'company_admin') {
                // Fetch company specific settings - only once
                // No fallback to hardcoded defaults - show real DB data
                const companyWasteTypes = await fetchCompanyWasteTypes();
                setWasteTypes(companyWasteTypes || []);

                if (userRole === 'manager') {
                    setClients(await fetchCompanyClients() || []);
                    setRegions(await fetchCompanyRegions() || []);
                    // Fetch driver assignments for status display
                    await fetchDriverAssignments();
                    // Fetch drivers for map assignment
                    await fetchCompanyDrivers();
                }

                if (userRole === 'company_admin') {
                    console.log('DEBUG company_admin loadInitialData, companyCode:', companyCode);
                    const clientsData = await fetchCompanyClients();
                    const membersData = await fetchCompanyMembers();
                    const regionsData = await fetchCompanyRegions();
                    console.log('DEBUG company_admin data:', { clients: clientsData?.length, members: membersData?.length, regions: regionsData?.length });
                    setClients(clientsData || []);
                    setRegions(regionsData || []);
                    setCompanyMembers(membersData || []);
                    // Load equipment and waste types for company admin
                    const companyWasteTypes = await fetchCompanyWasteTypes();
                    if (companyWasteTypes && companyWasteTypes.length > 0) {
                        setWasteTypes(companyWasteTypes);
                    }
                    // Equipment is loaded from database via useEffect
                    // Fetch drivers for history table retroactive assignment
                    await fetchCompanyDrivers();
                    // Fetch driver assignments for driver analytics
                    await fetchDriverAssignments();
                }
            }
            setInitialDataLoaded(true);

            // Check if user needs to select a region (first login without region)
            // Only for manager, driver, client - not company_admin
            if (user?.role && user.role !== 'company_admin' && !user.region_id && companyCode) {
                // Fetch regions to check if company has any
                const regionsData = await fetchCompanyRegions();
                if (regionsData && regionsData.length > 0) {
                    setRegions(regionsData);
                    setShowRegionSelectModal(true);
                }
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // Fetch driver assignments for manager view
    const fetchDriverAssignments = async () => {
        if (!companyCode) return;
        try {
            console.log('DEBUG fetchDriverAssignments: fetching for company', companyCode);
            const { data, error } = await supabase
                .from('driver_assignments')
                .select('*, driver:driver_id(id, name)')
                .eq('company_code', companyCode)
                .in('status', ['assigned', 'in_progress', 'picked_up', 'delivered'])
                .is('deleted_at', null);
            if (error) throw error;
            console.log('DEBUG fetchDriverAssignments: received', data?.length, 'assignments', data);
            setDriverAssignments(data || []);
        } catch (err) {
            console.error('Error fetching driver assignments:', err);
        }
    };

    // Fetch company drivers for map assignment
    const fetchCompanyDrivers = async () => {
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

    // Assign requests to driver from map
    const handleAssignDriverFromMap = async (requestIds, driverId) => {
        try {
            const { data, error } = await supabase.rpc('assign_requests_to_driver', {
                p_request_ids: requestIds,
                p_driver_id: driverId,
                p_company_code: companyCode
            });

            if (error) throw error;

            // RPC returns JSON object with success and assigned_count
            const result = typeof data === 'string' ? JSON.parse(data) : data;
            if (!result?.success) {
                throw new Error(result?.error || 'Nemate dozvolu za ovu akciju');
            }

            // Refresh assignments
            await fetchDriverAssignments();

            const driver = companyDrivers.find(d => d.id === driverId);
            toast.success(`${result.assigned_count || requestIds.length} zahtev(a) dodeljeno vozaču: ${driver?.name || 'Nepoznato'}`);
        } catch (err) {
            console.error('Error assigning driver:', err);
            throw err;
        }
    };

    // Quick assign single request to driver (from requests table)
    const handleQuickAssignDriver = async (requestId, driverId) => {
        try {
            console.log('DEBUG handleQuickAssignDriver: calling RPC with', { requestId, driverId, companyCode });
            const { data, error } = await supabase.rpc('assign_requests_to_driver', {
                p_request_ids: [requestId],
                p_driver_id: driverId,
                p_company_code: companyCode
            });

            console.log('DEBUG handleQuickAssignDriver: RPC response', { data, error });

            if (error) throw error;

            // RPC returns JSON object with success and assigned_count
            const result = typeof data === 'string' ? JSON.parse(data) : data;
            console.log('DEBUG handleQuickAssignDriver: parsed result', result);

            // VAŽNO: Proveri da li je assigned_count > 0
            if (!result?.success) {
                throw new Error(result?.error || 'Nemate dozvolu za ovu akciju');
            }

            if (result?.assigned_count === 0) {
                throw new Error('Zahtev nije pronađen ili ne pripada vašoj firmi');
            }

            console.log('DEBUG handleQuickAssignDriver: assigned_count =', result?.assigned_count);

            // Refresh assignments
            console.log('DEBUG handleQuickAssignDriver: refreshing assignments...');
            await fetchDriverAssignments();

            const driver = companyDrivers.find(d => d.id === driverId);
            toast.success(`Zahtev dodeljen vozaču: ${driver?.name || 'Nepoznato'}`);
        } catch (err) {
            console.error('Error quick assigning driver:', err);
            toast.error('Greška pri dodeli vozača: ' + err.message);
        }
    };

    // Retroactively assign driver to processed request (from history table)
    // Updates driver_id and driver_name directly in processed_requests table
    const handleAssignDriverToProcessed = async (requestId, driverId) => {
        try {
            const driver = companyDrivers.find(d => d.id === driverId);

            // Update processed_requests directly with driver info
            const { error } = await supabase
                .from('processed_requests')
                .update({
                    driver_id: driverId,
                    driver_name: driver?.name || null
                })
                .eq('id', requestId)
                .eq('company_code', companyCode);

            if (error) throw error;

            // Update local state
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

    // Load tab-specific data (doesn't block UI with spinner)
    const loadTabData = async () => {
        try {
            if (userRole === 'admin') {
                if (activeTab === 'companies' && companies.length === 0) setCompanies(await fetchAllCompanies());
                if (activeTab === 'users' && users.length === 0) setUsers(await fetchAllUsers());
                if (activeTab === 'codes' && masterCodes.length === 0) setMasterCodes(await fetchAllMasterCodes());
            } else if (userRole === 'manager' || userRole === 'company_admin') {
                if ((activeTab === 'history' || activeTab === 'analytics' || activeTab === 'manager-analytics' || activeTab === 'driver-analytics') && processedRequests.length === 0) {
                    setProcessedRequests(await fetchProcessedRequests() || []);
                }
            }
        } catch (err) { console.error(err); }
    };

    const handleLogout = () => { if (window.confirm('Odjaviti se?')) { logout(); navigate('/'); } };
    const handleNewRequest = async (data) => { setSubmitLoading(true); try { await addPickupRequest(data); setActiveTab('requests'); } catch (err) { toast.error(err.message); } finally { setSubmitLoading(false); } };
    const handleProcessRequest = (req) => setProcessingRequest(req);
    const handleConfirmProcess = async (req, proofImageUrl, note, weightData) => {
        await markRequestAsProcessed(req, proofImageUrl, note, weightData);
    };
    const handleDeleteRequest = async (id) => { if (window.confirm('Obrisati?')) try { await removePickupRequest(id); } catch (err) { toast.error(err.message); } };
    const handleDeleteClient = async (id) => {
        if (!window.confirm('Obrisati klijenta?')) return;
        const previousClients = clients;
        setClients(prev => prev.filter(c => c.id !== id)); // Optimistic update
        try {
            await deleteClient?.(id);
        } catch (err) {
            setClients(previousClients); // Rollback on error
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
            // Navigate based on role
            if (result.role === 'company_admin') navigate('/company-admin');
            else if (result.role === 'manager') navigate('/manager');
            else if (result.role === 'driver') navigate('/driver');
            else if (result.role === 'client') navigate('/client');
            else navigate('/admin');
            window.location.reload();
        } catch (err) {
            // More detailed error for debugging
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
            throw err; // Re-throw so modal can display error
        }
    };

    // Equipment handlers (connected to Supabase)
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
    const handleAssignEquipment = (eqId, clientId) => {
        // TODO: Implement equipment assignment to clients via database
        const client = clients.find(c => c.id === clientId);
        setEquipment(prev => prev.map(eq => eq.id === eqId ? { ...eq, assigned_to: clientId, assigned_to_name: client?.name } : eq));
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

    // Handle click on client name in requests table
    const handleClientClick = (clientId) => {
        const client = clients.find(c => c.id === clientId);
        if (client) setSelectedClient(client);
    };

    // Waste types handlers (connected to Supabase)
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
        console.log('DEBUG Dashboard handleEditWasteType - updatedType:', updatedType);
        console.log('DEBUG Dashboard handleEditWasteType - customImage value:', updatedType.customImage);
        console.log('DEBUG Dashboard handleEditWasteType - all keys:', Object.keys(updatedType));
        try {
            // Pass explicit object to ensure all properties are included
            const dataToSend = {
                id: updatedType.id,
                label: updatedType.label,
                icon: updatedType.icon,
                customImage: updatedType.customImage,
                name: updatedType.name,
                description: updatedType.description,
                region_id: updatedType.region_id
            };
            console.log('DEBUG Dashboard - dataToSend:', dataToSend);
            const updated = await updateWasteType(updatedType.id, dataToSend);
            setWasteTypes(prev => prev.map(wt => wt.id === updated.id ? updated : wt));
            toast.success('Vrsta robe ažurirana');
        } catch (e) {
            toast.error('Greška pri izmeni: ' + e.message);
        }
    };

    // Client location handler - koristi SECURITY DEFINER funkciju
    const handleSaveClientLocation = async (position) => {
        if (editingClientLocation) {
            try {
                // Debug: proveri auth
                const { data: authData } = await supabase.auth.getUser();
                console.log('DEBUG - Auth user:', authData?.user?.id);
                console.log('DEBUG - Client ID:', editingClientLocation.id);
                console.log('DEBUG - Position:', position);

                // Reverse geocode to get address
                let newAddress = editingClientLocation.address || '';
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position[0]}&lon=${position[1]}&accept-language=sr`);
                    const geoData = await response.json();
                    if (geoData.display_name) {
                        // Extract shorter address format
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

                // 1) Ažuriraj korisnika i SVE njegove pending zahteve (lat/lng) preko centralne funkcije
                await setClientLocationWithRequests(editingClientLocation.id, position[0], position[1]);

                // 2) Osveži adresu u users i pending pickup_requests (da se u listama/mapi vidi nova adresa)
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

                // Update local state with new address too
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
            // Update local state
            setClients(prev => prev.map(c =>
                c.id === clientId
                    ? { ...c, equipment_types: equipmentTypes, manager_note: note, pib: pib, allowed_waste_types: allowedWasteTypes }
                    : c
            ));
        } catch (err) {
            throw err;
        }
    };

    // Bulk update allowed waste types for a client (from WasteTypesManagement)
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
            // Update local state
            setClients(prev => prev.map(c =>
                c.id === clientId
                    ? { ...c, allowed_waste_types: allowedWasteTypes }
                    : c
            ));
        } catch (err) {
            throw err;
        }
    };

    // Bulk update waste types for multiple clients (Enterprise feature)
    const handleBulkWasteTypeUpdate = async ({ mode, wasteTypeIds, clientIds }) => {
        try {
            // Process clients in batches to avoid overwhelming the database
            const batchSize = 50;
            const batches = [];
            for (let i = 0; i < clientIds.length; i += batchSize) {
                batches.push(clientIds.slice(i, i + batchSize));
            }

            for (const batch of batches) {
                const updates = batch.map(async (clientId) => {
                    const client = clients.find(c => c.id === clientId);
                    if (!client) return;

                    // Current allowed waste types (null/empty = all types)
                    let currentAllowed = client.allowed_waste_types || [];
                    // If empty, start with all types
                    if (currentAllowed.length === 0) {
                        currentAllowed = wasteTypes.map(wt => wt.id);
                    }

                    let newAllowed;
                    if (mode === 'add') {
                        // Add selected types (merge)
                        newAllowed = [...new Set([...currentAllowed, ...wasteTypeIds])];
                    } else {
                        // Remove selected types
                        newAllowed = currentAllowed.filter(id => !wasteTypeIds.includes(id));
                    }

                    // Update in database
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

            // Refresh clients from server
            const refreshed = await fetchCompanyClients(companyCode);
            setClients(refreshed || []);
            toast.success(`Uspešno ažurirano ${clientIds.length} klijenata`);
        } catch (err) {
            toast.error('Greška pri ažuriranju: ' + err.message);
            throw err;
        }
    };

    const getMenu = () => {
        if (userRole === 'admin') return [{ id: 'dashboard', icon: LayoutDashboard, label: 'Pregled' }, { id: 'companies', icon: Building2, label: 'Firme' }, { id: 'users', icon: Users, label: 'Korisnici' }, { id: 'codes', icon: FileText, label: 'Master Kodovi' }, { id: 'messages', icon: MessageCircle, label: 'Poruke', badge: unreadCount > 0 ? unreadCount : null }];
        if (userRole === 'company_admin') return [
            { id: 'dashboard', icon: LayoutDashboard, label: 'Pregled', helpKey: 'sidebar-dashboard' },
            { id: 'map', icon: Globe, label: 'Mapa', helpKey: 'sidebar-map' },
            { id: 'requests', icon: ClipboardList, label: 'Aktivni zahtevi', badge: pickupRequests?.filter(r => r.status === 'pending').length, helpKey: 'sidebar-requests' },
            { id: 'staff', icon: Users, label: 'Osoblje', helpKey: 'sidebar-staff' },
            { id: 'regions', icon: MapPin, label: 'Filijale', helpKey: 'sidebar-regions' },
            { id: 'visual', icon: Network, label: 'Vizuelni Editor', helpKey: 'sidebar-visual-editor' },
            { id: 'analytics', icon: BarChart3, label: 'Analitika', helpKey: 'sidebar-analytics' },
            { id: 'manager-analytics', icon: UserCheck, label: 'Učinak menadžera', helpKey: 'sidebar-manager-analytics' },
            { id: 'driver-analytics', icon: Truck, label: 'Učinak vozača', helpKey: 'sidebar-driver-analytics' },
            { id: 'history', icon: History, label: 'Istorija zahteva', helpKey: 'sidebar-history' },
            { id: 'activity-log', icon: History, label: 'Aktivnosti', helpKey: 'sidebar-activity-log' },
            { id: 'messages', icon: MessageCircle, label: 'Poruke', badge: unreadCount > 0 ? unreadCount : null, helpKey: 'sidebar-messages' },
            { id: 'settings', icon: Settings, label: 'Podešavanja', helpKey: 'sidebar-settings' }
        ];
        if (userRole === 'manager') return [
            { id: 'dashboard', icon: LayoutDashboard, label: 'Pregled', helpKey: 'sidebar-dashboard' },
            { id: 'requests', icon: Truck, label: 'Zahtevi', badge: pickupRequests?.filter(r => r.status === 'pending').length, helpKey: 'sidebar-requests' },
            { id: 'drivers', icon: Users, label: 'Vozači', helpKey: 'sidebar-drivers' },
            { id: 'history', icon: History, label: 'Istorija', helpKey: 'sidebar-history' },
            { id: 'activity-log', icon: History, label: 'Aktivnosti', helpKey: 'sidebar-activity-log' },
            { id: 'analytics', icon: BarChart3, label: 'Analitika', helpKey: 'sidebar-analytics' },
            { id: 'clients', icon: Building2, label: 'Klijenti', helpKey: 'sidebar-clients' },
            { id: 'messages', icon: MessageCircle, label: 'Poruke', badge: unreadCount > 0 ? unreadCount : null, helpKey: 'sidebar-messages' },
            { id: 'print', icon: Printer, label: 'Štampaj/Export', helpKey: 'sidebar-print' },
            { id: 'equipment', icon: Box, label: 'Oprema', helpKey: 'sidebar-equipment' },
            { id: 'wastetypes', icon: Recycle, label: 'Vrste robe', helpKey: 'sidebar-wastetypes' },
            { id: 'map', icon: MapPin, label: 'Mapa', helpKey: 'sidebar-map' }
        ];
        // Default: client menu - "Novi zahtev" is the main/home page for clients
        return [
            { id: 'new', icon: Plus, label: 'Novi zahtev' },
            { id: 'requests', icon: Truck, label: 'Zahtevi', badge: clientRequests?.length },
            { id: 'history', icon: Clock, label: 'Istorija' },
            { id: 'info', icon: Info, label: 'Informacije' },
            { id: 'messages', icon: MessageCircle, label: 'Poruke', badge: unreadCount > 0 ? unreadCount : null }
        ];
    };

    const getStats = () => {
        if (userRole === 'admin' && stats) return [
            { label: 'Firme', value: stats.totalCompanies, icon: <Building2 className="w-6 h-6 text-emerald-600" />, onClick: () => setActiveTab('companies') },
            { label: 'Korisnici', value: stats.totalUsers, subtitle: `${stats.totalManagers || 0} menadž. / ${stats.totalClients || 0} klij. / ${stats.totalDrivers || 0} voz.`, icon: <Users className="w-6 h-6 text-blue-600" />, onClick: () => setActiveTab('users') },
            { label: 'Master kodovi', value: stats.totalCodes, icon: <FileText className="w-6 h-6 text-orange-600" />, onClick: () => setActiveTab('codes') },
            { label: 'Dostupni', value: stats.availableCodes, icon: <Recycle className="w-6 h-6 text-green-600" />, onClick: () => setActiveTab('codes') }
        ];
        if (userRole === 'manager') {
            const p = pickupRequests?.filter(r => r.status === 'pending') || [];
            return [
                { label: 'Zahtevi', value: p.length, icon: <Truck className="w-6 h-6 text-emerald-600" />, onClick: () => { setUrgencyFilter('all'); setActiveTab('requests'); } },
                { label: 'Klijenti', value: clients.length, icon: <Users className="w-6 h-6 text-blue-600" />, onClick: () => setActiveTab('clients') },
                { label: 'Hitni', value: p.filter(r => getCurrentUrgency(r.created_at, r.urgency) === '24h').length, icon: <AlertCircle className="w-6 h-6 text-red-600" />, onClick: () => { setUrgencyFilter('24h'); setActiveTab('requests'); } }
            ];
        }
        return [{ label: 'Aktivni zahtevi', value: clientRequests?.length || 0, icon: <Truck className="w-6 h-6 text-emerald-600" />, onClick: () => setActiveTab('requests') }];
    };

    const menu = getMenu();
    const statCards = getStats();
    const pending = useMemo(() => pickupRequests?.filter(r => r.status === 'pending') || [], [pickupRequests]);

    // Export functions - using semicolon as separator for Excel compatibility in Serbian locale
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

    const renderContent = () => {
        // Chat is available for both managers and clients
        if (activeTab === 'messages') {
            return <ChatInterface user={user} fetchMessages={fetchMessages} sendMessage={sendMessage} markMessagesAsRead={markMessagesAsRead} getConversations={getConversations} fetchCompanyClients={fetchCompanyClients} fetchCompanyMembers={fetchCompanyMembers} sendMessageToAdmins={sendMessageToAdmins} fetchCompanyAdmin={fetchCompanyAdmin} sendMessageToCompanyAdmin={sendMessageToCompanyAdmin} userRole={userRole} subscribeToMessages={subscribeToMessages} deleteConversation={deleteConversation} />;
        }
        if (userRole === 'client') {
            // Filter waste types based on client's allowed types (null/empty = all allowed)
            // Debug: Log what we're filtering
            console.log('[Client WasteTypes] user.allowed_waste_types:', user?.allowed_waste_types);
            console.log('[Client WasteTypes] wasteTypes:', wasteTypes?.map(wt => ({ id: wt.id, name: wt.name, label: wt.label })));

            const clientWasteTypes = user?.allowed_waste_types?.length > 0
                ? wasteTypes.filter(wt => user.allowed_waste_types.includes(wt.id))
                : wasteTypes;

            console.log('[Client WasteTypes] Filtered result:', clientWasteTypes?.length, 'types');

            if (activeTab === 'requests') return <ClientRequestsView requests={clientRequests} wasteTypes={wasteTypes} onDeleteRequest={removePickupRequest} />;
            if (activeTab === 'history') return <ClientHistoryView history={clientHistory} loading={historyLoading} wasteTypes={wasteTypes} onHide={async (id) => {
                const previous = clientHistory;
                setClientHistory(prev => prev.filter(r => r.id !== id)); // Optimistic
                try {
                    await hideClientHistoryItem(id);
                } catch (err) {
                    setClientHistory(previous); // Rollback
                    throw err;
                }
            }} />;
            if (activeTab === 'info') {
                // Informacije tab - overview of client's activity
                return (
                    <div className="space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-2xl border p-5 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('requests')}>
                                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
                                    <Truck className="w-6 h-6 text-emerald-600" />
                                </div>
                                <p className="text-2xl font-bold text-slate-800">{clientRequests?.length || 0}</p>
                                <p className="text-sm text-slate-500">Aktivni zahtevi</p>
                            </div>
                            <div className="bg-white rounded-2xl border p-5 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('history')}>
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                                    <History className="w-6 h-6 text-blue-600" />
                                </div>
                                <p className="text-2xl font-bold text-slate-800">{clientHistory?.length || 0}</p>
                                <p className="text-sm text-slate-500">Obrađeni zahtevi</p>
                            </div>
                            <div className="bg-white rounded-2xl border p-5 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('new')}>
                                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
                                    <Plus className="w-6 h-6 text-amber-600" />
                                </div>
                                <p className="text-2xl font-bold text-slate-800">+</p>
                                <p className="text-sm text-slate-500">Novi zahtev</p>
                            </div>
                            <div className="bg-white rounded-2xl border p-5 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('messages')}>
                                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
                                    <MessageCircle className="w-6 h-6 text-purple-600" />
                                </div>
                                <p className="text-2xl font-bold text-slate-800">{unreadCount || 0}</p>
                                <p className="text-sm text-slate-500">Nove poruke</p>
                            </div>
                        </div>

                        {/* Active Requests Preview */}
                        {clientRequests?.length > 0 && (
                            <div className="bg-white rounded-2xl border overflow-hidden">
                                <div className="p-5 border-b flex justify-between items-center">
                                    <h2 className="font-bold text-lg">Aktivni zahtevi</h2>
                                    <button onClick={() => setActiveTab('requests')} className="text-emerald-600 text-sm font-medium hover:text-emerald-700 flex items-center gap-1">
                                        Vidi sve <ChevronRight size={16} />
                                    </button>
                                </div>
                                <div className="divide-y">
                                    {clientRequests.slice(0, 3).map(r => {
                                        const assignment = r.driver_assignment;
                                        const hasDriver = !!assignment;
                                        const statusLabel = assignment?.status === 'in_progress' ? 'Vozač na putu' : hasDriver ? 'Dodeljen vozač' : 'Na čekanju';
                                        const statusColor = assignment?.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : hasDriver ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700';

                                        return (
                                            <div key={r.id} className="p-4 hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl">
                                                            {WASTE_TYPES.find(w => w.id === r.waste_type)?.icon || '📦'}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-slate-800">{r.waste_label}</h4>
                                                            <p className="text-sm text-slate-500 flex items-center gap-2">
                                                                <Calendar size={14} />
                                                                {new Date(r.created_at).toLocaleDateString('sr-RS', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full">
                                                            <FillLevelBar fillLevel={r.fill_level} />
                                                        </div>
                                                        <span className={`px-3 py-1.5 text-xs font-medium rounded-full flex items-center gap-1 ${statusColor}`}>
                                                            {hasDriver ? <Truck size={12} /> : <Clock size={12} />} {statusLabel}
                                                        </span>
                                                    </div>
                                                </div>
                                                {/* Show driver info when assigned */}
                                                {hasDriver && (
                                                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                                                                <Users size={14} className="text-emerald-600" />
                                                            </div>
                                                            <span className="text-slate-600">{assignment.driver_name}</span>
                                                        </div>
                                                        {assignment.driver_phone && (
                                                            <a href={`tel:${assignment.driver_phone}`} className="flex items-center gap-1 text-emerald-600 text-sm font-medium hover:text-emerald-700">
                                                                <Phone size={14} /> Pozovi
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Quick Action */}
                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-8 text-white text-center">
                            <Recycle size={48} className="mx-auto mb-4 opacity-90" />
                            <h3 className="text-2xl font-bold mb-2">
                                {clientRequests?.length ? `Imate ${clientRequests.length} aktivna zahteva` : 'Sve je pod kontrolom!'}
                            </h3>
                            <p className="text-emerald-100 mb-6">Podnesite novi zahtev za preuzimanje robe</p>
                            <button
                                onClick={() => setActiveTab('new')}
                                className="bg-white text-emerald-600 px-8 py-3 rounded-xl font-semibold hover:bg-emerald-50 transition-colors inline-flex items-center gap-2"
                            >
                                <Plus size={20} /> Novi zahtev
                            </button>
                        </div>
                    </div>
                );
            }
            // Default: Novi zahtev form (home page for clients)
            return <NewRequestForm onSubmit={handleNewRequest} loading={submitLoading} wasteTypes={clientWasteTypes} />;
        }
        if (userRole === 'manager') {
            if (activeTab === 'requests') return (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-800">Zahtevi na čekanju</h2>
                        <button
                            onClick={() => setShowCreateRequestModal(true)}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2 font-medium"
                        >
                            <Plus size={18} /> Kreiraj zahtev
                        </button>
                    </div>
                    <ManagerRequestsTable requests={pending} onProcess={handleProcessRequest} onDelete={handleDeleteRequest} onView={setSelectedRequest} onClientClick={handleClientClick} wasteTypes={wasteTypes} initialUrgencyFilter={urgencyFilter} onUrgencyFilterChange={setUrgencyFilter} assignments={driverAssignments} drivers={companyDrivers} onQuickAssign={handleQuickAssignDriver} />
                </div>
            );
            if (activeTab === 'drivers') return <DriverManagement wasteTypes={wasteTypes} />;
            if (activeTab === 'history') return <HistoryTable requests={processedRequests} wasteTypes={wasteTypes} drivers={companyDrivers} onAssignDriverToProcessed={handleAssignDriverToProcessed} onEdit={async (id, updates) => {
                try {
                    await updateProcessedRequest(id, updates);
                    // Refresh the list
                    const updated = await fetchProcessedRequests();
                    setProcessedRequests(updated);
                } catch (err) {
                    toast.error('Greška pri ažuriranju: ' + err.message);
                }
            }} onDelete={async (id) => {
                const previous = processedRequests;
                setProcessedRequests(prev => prev.filter(r => r.id !== id)); // Optimistic
                try {
                    await deleteProcessedRequest(id);
                    toast.success('Zahtev je obrisan iz istorije');
                } catch (err) {
                    setProcessedRequests(previous); // Rollback
                    toast.error('Greška pri brisanju: ' + (err.message || 'Nepoznata greška'));
                }
            }} />;
            if (activeTab === 'analytics') return <AnalyticsPage processedRequests={processedRequests} clients={clients} wasteTypes={wasteTypes} drivers={companyDrivers} pickupRequests={pending} />;
            if (activeTab === 'activity-log') return <ActivityLogPage companyCode={companyCode} userRole={userRole} />;
            if (activeTab === 'clients') return <ClientsTable clients={clients} onView={setSelectedClient} onDelete={handleDeleteClient} onEditLocation={setEditingClientLocation} onEditEquipment={setEditingClientEquipment} onImport={() => setShowImportClientsModal(true)} equipment={equipment} wasteTypes={wasteTypes} regions={regions} showRegionColumn={userRole === 'company_admin'} />;
            if (activeTab === 'print') return <PrintExport clients={clients} requests={pending} processedRequests={processedRequests} wasteTypes={wasteTypes} onClientClick={handleClientClick} />;
            if (activeTab === 'equipment') return <EquipmentManagement equipment={equipment} onAdd={handleAddEquipment} onAssign={handleAssignEquipment} onDelete={handleDeleteEquipment} onEdit={handleEditEquipment} clients={clients} />;
            if (activeTab === 'wastetypes') return <WasteTypesManagement wasteTypes={wasteTypes} onAdd={handleAddWasteType} onDelete={handleDeleteWasteType} onEdit={handleEditWasteType} clients={clients} onUpdateClientWasteTypes={handleUpdateClientWasteTypes} onBulkUpdate={handleBulkWasteTypeUpdate} />;
            if (activeTab === 'map') return (
                <div className="flex flex-col h-full">
                    <div className="flex gap-2 p-3 bg-white border-b shrink-0">
                        <button onClick={() => setMapType('requests')} className={`px-4 py-2 rounded-xl text-sm font-medium ${mapType === 'requests' ? 'bg-emerald-600 text-white' : 'bg-white border'}`}>Zahtevi ({pending.length})</button>
                        <button onClick={() => setMapType('clients')} className={`px-4 py-2 rounded-xl text-sm font-medium ${mapType === 'clients' ? 'bg-emerald-600 text-white' : 'bg-white border'}`}>Klijenti ({clients.length})</button>
                    </div>
                    <MapView
                        requests={pending}
                        clients={clients}
                        type={mapType}
                        onClientLocationEdit={setEditingClientLocation}
                        wasteTypes={wasteTypes}
                        drivers={companyDrivers}
                        onAssignDriver={handleAssignDriverFromMap}
                        driverAssignments={driverAssignments}
                        onSetClientLocation={async (clientId, lat, lng) => {
                            await setClientLocationWithRequests(clientId, lat, lng);
                            await fetchCompanyClients();
                        }}
                    />
                </div>
            );
            // Sort by remaining time (most urgent first) for dashboard preview
            const sortedByUrgency = [...pending].sort((a, b) => {
                const remA = getRemainingTime(a.created_at, a.urgency);
                const remB = getRemainingTime(b.created_at, b.urgency);
                return remA.ms - remB.ms;
            });
            return <div className="space-y-8"><div className="grid md:grid-cols-3 gap-6">{statCards.map((s, i) => <StatCard key={i} {...s} />)}</div>{pending.length > 0 && <div><div className="flex justify-between mb-4"><h2 className="text-lg font-bold">Najhitniji zahtevi</h2><button onClick={() => setActiveTab('requests')} className="text-emerald-600 text-sm font-medium">Vidi sve ({pending.length}) <ChevronRight size={16} className="inline" /></button></div><ManagerRequestsTable requests={sortedByUrgency.slice(0, 5)} onProcess={handleProcessRequest} onDelete={handleDeleteRequest} onView={setSelectedRequest} onClientClick={handleClientClick} wasteTypes={wasteTypes} assignments={driverAssignments} drivers={companyDrivers} onQuickAssign={handleQuickAssignDriver} /></div>}</div>;
        }
        // Company Admin - bird's eye view of company (no operations)
        if (userRole === 'company_admin') {
            if (activeTab === 'requests') return (
                <div className="space-y-4">
                    <div>
                        <h1 className="text-2xl font-bold">Aktivni zahtevi</h1>
                        <p className="text-slate-500">Pregled svih aktivnih zahteva u firmi (samo za čitanje)</p>
                    </div>
                    <ManagerRequestsTable
                        requests={pending}
                        wasteTypes={wasteTypes}
                        onView={setSelectedRequest}
                        onClientClick={handleClientClick}
                        assignments={driverAssignments}
                        drivers={companyDrivers}
                        readOnly={true}
                    />
                </div>
            );
            if (activeTab === 'staff') return <CompanyStaffPage />;
            if (activeTab === 'regions') return <RegionsPage />;
            if (activeTab === 'visual') return <RegionNodeEditor fullscreen={false} />;
            if (activeTab === 'analytics') return <AnalyticsPage processedRequests={processedRequests} wasteTypes={wasteTypes} clients={clients} drivers={companyDrivers} equipment={equipment} pickupRequests={pending} />;
            if (activeTab === 'manager-analytics') return (
                <ManagerAnalyticsPage
                    processedRequests={processedRequests}
                    members={companyMembers}
                    wasteTypes={wasteTypes}
                    driverAssignments={driverAssignments}
                    onResetStats={async () => {
                        await resetManagerAnalytics();
                        // Refresh the data after reset
                        const fresh = await fetchProcessedRequests();
                        setProcessedRequests(fresh);
                        toast.success('Statistika je uspešno resetovana');
                    }}
                />
            );
            if (activeTab === 'driver-analytics') return (
                <DriverAnalyticsPage
                    driverAssignments={driverAssignments}
                    drivers={companyDrivers}
                    wasteTypes={wasteTypes}
                    processedRequests={processedRequests}
                    onResetStats={async () => {
                        await resetManagerAnalytics();
                        const fresh = await fetchProcessedRequests();
                        setProcessedRequests(fresh);
                        toast.success('Statistika je resetovana');
                    }}
                />
            );
            if (activeTab === 'history') return (
                <div className="space-y-4">
                    <h1 className="text-2xl font-bold">Istorija svih zahteva</h1>
                    <p className="text-slate-500">Kliknite na strelicu za prikaz timeline-a akcija za svaki zahtev</p>
                    <HistoryTable
                        requests={processedRequests}
                        wasteTypes={wasteTypes}
                        onView={setSelectedRequest}
                        showDetailedView={true}
                        drivers={companyDrivers}
                        onAssignDriverToProcessed={handleAssignDriverToProcessed}
                        onEdit={async (id, updates) => {
                            try {
                                await updateProcessedRequest(id, updates);
                                const updated = await fetchProcessedRequests();
                                setProcessedRequests(updated);
                            } catch (err) {
                                toast.error('Greška pri ažuriranju: ' + err.message);
                            }
                        }}
                        onDelete={async (id) => {
                            const previous = processedRequests;
                            setProcessedRequests(prev => prev.filter(r => r.id !== id));
                            try {
                                await deleteProcessedRequest(id);
                                toast.success('Zahtev je obrisan iz istorije');
                            } catch (err) {
                                setProcessedRequests(previous);
                                toast.error('Greška pri brisanju: ' + (err.message || 'Nepoznata greška'));
                            }
                        }}
                    />
                </div>
            );
            if (activeTab === 'activity-log') return <ActivityLogPage companyCode={companyCode} userRole={userRole} />;
            if (activeTab === 'map') return (
                <div className="flex flex-col h-full">
                    <MapView
                        requests={pending}
                        clients={clients}
                        type="requests"
                        wasteTypes={wasteTypes}
                        drivers={[]}
                        onSetClientLocation={async (clientId, lat, lng) => {
                            await setClientLocationWithRequests(clientId, lat, lng);
                            // Refresh data after location update
                            await fetchCompanyClients();
                        }}
                    />
                </div>
            );
            if (activeTab === 'settings') return (
                <div className="space-y-8">
                    <CompanySettingsPage />
                    <div className="border-t pt-8">
                        <h2 className="text-xl font-bold mb-6">Vrste otpada i oprema</h2>
                        <WasteTypesManagement wasteTypes={wasteTypes} onAdd={handleAddWasteType} onDelete={handleDeleteWasteType} onEdit={handleEditWasteType} clients={clients} onUpdateClientWasteTypes={handleUpdateClientWasteTypes} onBulkUpdate={handleBulkWasteTypeUpdate} />
                    </div>
                    <div className="border-t pt-8">
                        <EquipmentManagement equipment={equipment} onAdd={handleAddEquipment} onAssign={handleAssignEquipment} onDelete={handleDeleteEquipment} onEdit={handleEditEquipment} clients={clients} />
                    </div>
                </div>
            );
            // Company Admin Dashboard - Overview stats
            const staffCount = companyMembers?.filter(m => ['manager', 'driver'].includes(m.role)).length || 0;
            const managerCount = companyMembers?.filter(m => m.role === 'manager').length || 0;
            const driverCount = companyMembers?.filter(m => m.role === 'driver').length || 0;
            return (
                <div className="space-y-6">
                    <h1 className="text-2xl font-bold">Pregled firme</h1>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl border p-5 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('map')}>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                    <Truck className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-slate-800">{pending.length}</p>
                                    <p className="text-sm text-slate-500">Aktivnih zahteva</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border p-5 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('staff')}>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <Users className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-slate-800">{staffCount}</p>
                                    <p className="text-sm text-slate-500">{managerCount} menadž. / {driverCount} voz.</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border p-5 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('regions')}>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                    <MapPin className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-slate-800">{regions.length}</p>
                                    <p className="text-sm text-slate-500">Filijala</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                                    <Building2 className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-slate-800">{clients.length}</p>
                                    <p className="text-sm text-slate-500">Klijenata</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Quick actions */}
                    <div className="bg-white rounded-2xl border p-6">
                        <h2 className="font-bold mb-4">Brze akcije</h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <button onClick={() => setActiveTab('map')} className="p-4 bg-slate-50 rounded-xl hover:bg-emerald-50 text-left transition-colors">
                                <Globe size={20} className="mb-3 text-slate-500" />
                                <p className="font-semibold">Pregled mape</p>
                                <p className="text-xs text-slate-500">Svi zahtevi na mapi</p>
                            </button>
                            <button onClick={() => setActiveTab('staff')} className="p-4 bg-slate-50 rounded-xl hover:bg-blue-50 text-left transition-colors">
                                <Users size={20} className="mb-3 text-slate-500" />
                                <p className="font-semibold">Upravljaj osobljem</p>
                                <p className="text-xs text-slate-500">Menadžeri i vozači</p>
                            </button>
                            <button onClick={() => setActiveTab('regions')} className="p-4 bg-slate-50 rounded-xl hover:bg-purple-50 text-left transition-colors">
                                <MapPin size={20} className="mb-3 text-slate-500" />
                                <p className="font-semibold">Filijale</p>
                                <p className="text-xs text-slate-500">Upravljanje lokacijama</p>
                            </button>
                            <button onClick={() => setActiveTab('settings')} className="p-4 bg-slate-50 rounded-xl hover:bg-amber-50 text-left transition-colors">
                                <Settings size={20} className="mb-3 text-slate-500" />
                                <p className="font-semibold">Podešavanja</p>
                                <p className="text-xs text-slate-500">Tipovi otpada, oprema</p>
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        if (userRole === 'admin') {
            if (activeTab === 'companies') return <AdminCompaniesTable companies={companies} onEdit={setEditingCompany} />;
            if (activeTab === 'users') return <AdminUsersTable users={users} onDelete={handleDeleteUser} isDeveloper={isDeveloper()} isAdmin={true} onImpersonate={handleImpersonateUser} onChangeRole={changeUserRole} onResetPassword={handleResetPassword} onRefresh={refreshUsers} onEditUser={setEditingUser} />;
            if (activeTab === 'codes') return <MasterCodesTable codes={masterCodes} onGenerate={handleGenerateCode} onCopy={handleCopyCode} onDelete={handleDeleteCode} onUpdatePrice={handleUpdateCodePrice} isDeveloper={isDeveloper()} isAdmin={true} />;
            return <div className="space-y-8"><div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">{statCards.map((s, i) => <StatCard key={i} {...s} />)}</div><div className="bg-white rounded-2xl border p-6"><h2 className="font-bold mb-4">Brze akcije</h2><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[{ icon: FileText, label: 'Generiši kod', onClick: handleGenerateCode }, { icon: Building2, label: 'Firme', onClick: () => setActiveTab('companies') }, { icon: Users, label: 'Korisnici', onClick: () => setActiveTab('users') }, { icon: BarChart3, label: 'Kodovi', onClick: () => setActiveTab('codes') }].map((a, i) => <button key={i} onClick={a.onClick} className="p-4 bg-slate-50 rounded-xl hover:bg-emerald-50 text-left"><a.icon size={20} className="mb-3 text-slate-500" /><p className="font-semibold">{a.label}</p></button>)}</div></div><div className="bg-white rounded-2xl border p-6"><h2 className="font-bold mb-4">Export podataka</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"><button onClick={handleExportUsers} className="p-4 bg-blue-50 rounded-xl hover:bg-blue-100 text-left flex items-center gap-3"><Download size={20} className="text-blue-600" /><div><p className="font-semibold text-blue-900">Korisnici</p><p className="text-xs text-blue-600">Export u CSV</p></div></button><button onClick={handleExportCompanies} className="p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 text-left flex items-center gap-3"><Download size={20} className="text-emerald-600" /><div><p className="font-semibold text-emerald-900">Firme</p><p className="text-xs text-emerald-600">Export u CSV</p></div></button></div></div></div>;
        }
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
                    <nav className="flex-1 p-4 space-y-1">{menu.map(m => <SidebarItem key={m.id} icon={m.icon} label={m.label} active={activeTab === m.id} badge={m.badge} isLink={m.isLink} href={m.href} helpKey={m.helpKey} onClick={() => { if (!m.isLink) { setActiveTab(m.id); setSidebarOpen(false); } }} />)}</nav>
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
                        {/* ECO Kod firme */}
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
                        {/* Filijala - prikaži samo za managere/vozače koji imaju dodeljenu filijalu */}
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
                        {/* Help Button - samo za manager i company_admin */}
                        {(userRole === 'manager' || userRole === 'company_admin') && (
                            <HelpButton />
                        )}
                        {/* Notifications */}
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
                                        {/* ECO kod za mobilne */}
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
                <main className={`flex-1 overflow-y-auto relative z-10 ${activeTab === 'map' ? 'p-0 overflow-hidden' : 'p-6 lg:p-8'}`}>
                    <div className={`${activeTab === 'map' ? 'w-full h-full flex flex-col' : 'max-w-7xl mx-auto'}`}>
                        {activeTab !== 'map' && <div className="mb-8"><h1 className="text-2xl font-bold">{activeTab === 'dashboard' ? `Dobrodošli, ${user?.name?.split(' ')[0]}!` : activeTab === 'new' ? 'Novi zahtev' : activeTab === 'requests' ? 'Zahtevi' : activeTab === 'drivers' ? 'Vozači' : activeTab === 'history' ? 'Istorija zahteva' : activeTab === 'analytics' ? 'Analitika' : activeTab === 'clients' ? 'Klijenti' : activeTab === 'print' ? 'Štampaj / Export' : activeTab === 'equipment' ? 'Upravljanje opremom' : activeTab === 'wastetypes' ? 'Vrste robe' : activeTab === 'messages' ? 'Poruke' : activeTab === 'companies' ? 'Firme' : activeTab === 'users' ? 'Korisnici' : activeTab === 'regions' ? 'Filijale' : activeTab === 'visual' ? 'Vizuelni Editor' : activeTab === 'codes' ? 'Master kodovi' : ''}</h1></div>}
                        {loading ? <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-emerald-600" size={32} /></div> : renderContent()}
                    </div>
                </main>
            </div>
            <RequestDetailsModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />
            <ProcessRequestModal
                request={processingRequest}
                onProcess={handleConfirmProcess}
                onClose={() => setProcessingRequest(null)}
                hasDriverAssignment={!!driverAssignments.find(a => a.request_id === processingRequest?.id)}
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
                    // Requests will auto-refresh via realtime subscription
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
            {/* Import Clients Modal */}
            <ImportClientsModal
                open={showImportClientsModal}
                onClose={() => setShowImportClientsModal(false)}
                companyCode={companyCode}
                existingPhones={clients.map(c => c.phone)}
                onImport={async (clientsToImport) => {
                    const result = await createShadowClients(clientsToImport);
                    // Refresh clients after import
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
                                    // Save name if changed
                                    if (editingProfile.name && editingProfile.name !== user?.name) {
                                        await updateProfile(editingProfile.name);
                                    }

                                    // Save location if changed
                                    if (editingProfile.latitude && editingProfile.longitude && (editingProfile.latitude !== user?.latitude || editingProfile.longitude !== user?.longitude || editingProfile.address !== user?.address)) {
                                        await updateProfileLocation(editingProfile.latitude, editingProfile.longitude, editingProfile.address);
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
                    {/* LEFT COLUMN: Profile & Info */}
                    <div className="space-y-6">
                        {/* Language Selection */}
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

                        {/* Profile Info */}
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



                        {/* ECO Code Display */}
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
                    </div>

                    {/* RIGHT COLUMN: Map & Location */}
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
                                            // Reverse geocode to get address
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
                    onSave={async (companyCode, data) => {
                        await updateCompany(companyCode, data);
                        refreshCompanies();
                        setEditingCompany(null);
                    }}
                    onDelete={async (companyCode) => {
                        await deleteCompany(companyCode);
                        refreshCompanies();
                        setEditingCompany(null);
                    }}
                />
            )}
            {/* Help Mode Overlay - samo za manager i company_admin */}
            {(userRole === 'manager' || userRole === 'company_admin') && (
                <HelpOverlay />
            )}

            {/* Region Selection Modal - shown on first login if user has no region */}
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
                                        // Reload the page to refresh user data with new region
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

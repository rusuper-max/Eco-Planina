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
    LayoutDashboard, Truck, Users, Settings, LogOut, Mountain, MapPin, Bell, Search, Menu, X, Plus, Recycle, BarChart3,
    FileText, Building2, AlertCircle, CheckCircle2, Clock, Package, Send, Trash2, Eye, Copy, ChevronRight, Phone,
    RefreshCw, Info, Box, ArrowUpDown, ArrowUp, ArrowDown, Filter, Upload, Image, Globe, ChevronDown, MessageCircle, Edit3, ArrowLeft, Loader2, History, Calendar, XCircle, Printer, Download, FileSpreadsheet,
    Lock, Unlock, AlertTriangle, LogIn,
    // Components
    createIcon, urgencyIcons, URGENCY_COLORS, WASTE_ICONS_MAP, createCustomIcon,
    markerStyles, getRemainingTime, getCurrentUrgency, WASTE_TYPES, uploadImage,
    ImageUploader, StatCard, SidebarItem, Modal, EmptyState,
    NewRequestForm, ClientRequestsView, ClientHistoryView, ManagerRequestsTable,
    PrintExport, HistoryTable, ClientsTable, EquipmentManagement, WasteTypesManagement,
    getStablePosition, DraggableMarker, LocationPicker, FitBounds, MapView,
    RequestDetailsModal, ClientDetailsModal, ClientEquipmentModal, ProcessRequestModal,
    AdminCompaniesTable, AdminUsersTable, MasterCodesTable, ChatInterface,
    UserDetailsModal, CompanyEditModal, UserEditModal, DeleteConfirmationModal,
    AnalyticsPage
} from './DashboardComponents';

export default function Dashboard() {
    const navigate = useNavigate();
    const { user, logout, companyCode, companyName, pickupRequests, clientRequests, processedNotification, clearProcessedNotification, addPickupRequest, markRequestAsProcessed, removePickupRequest, fetchCompanyClients, fetchCompanyMembers, fetchProcessedRequests, fetchClientHistory, getAdminStats, fetchAllCompanies, fetchAllUsers, fetchAllMasterCodes, generateMasterCode, deleteMasterCode, deleteUser, isDeveloper, deleteClient, unreadCount, fetchMessages, sendMessage, markMessagesAsRead, getConversations, updateClientDetails, sendMessageToAdmins, updateProfile, updateCompanyName, updateLocation, originalUser, impersonateUser, exitImpersonation, changeUserRole, deleteConversation, updateUser, updateCompany, deleteCompany, subscribeToMessages, deleteProcessedRequest } = useAuth();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(() => {
        const saved = localStorage.getItem('ecomountaint_activeTab');
        return saved || 'dashboard';
    });
    const [mapType, setMapType] = useState('requests');
    const [stats, setStats] = useState(null);
    const [clients, setClients] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [users, setUsers] = useState([]);
    const [masterCodes, setMasterCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [processingRequest, setProcessingRequest] = useState(null);
    const [selectedClient, setSelectedClient] = useState(null);
    const [editingClientLocation, setEditingClientLocation] = useState(null);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showChatDropdown, setShowChatDropdown] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [prevRequestCount, setPrevRequestCount] = useState(0);
    const [prevClientCount, setPrevClientCount] = useState(0);
    const [equipment, setEquipment] = useState(() => {
        const saved = localStorage.getItem('ecomountaint_equipment');
        return saved ? JSON.parse(saved) : [];
    });
    const [wasteTypes, setWasteTypes] = useState(() => {
        const saved = localStorage.getItem('ecomountaint_wastetypes');
        return saved ? JSON.parse(saved) : WASTE_TYPES;
    });
    const [processedRequests, setProcessedRequests] = useState([]);
    const [editingClientEquipment, setEditingClientEquipment] = useState(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [language, setLanguage] = useState('sr');
    const [editingProfile, setEditingProfile] = useState({ name: '', phone: '', companyName: '', address: '', latitude: null, longitude: null });
    const [urgencyFilter, setUrgencyFilter] = useState('all');
    const [editingUser, setEditingUser] = useState(null);
    const [editingCompany, setEditingCompany] = useState(null);
    const [clientHistory, setClientHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const userRole = ['developer', 'admin'].includes(user?.role) ? 'admin' : user?.role || 'client';

    // Save activeTab to localStorage
    useEffect(() => {
        localStorage.setItem('ecomountaint_activeTab', activeTab);
    }, [activeTab]);

    // Save equipment to localStorage
    useEffect(() => {
        localStorage.setItem('ecomountaint_equipment', JSON.stringify(equipment));
    }, [equipment]);

    // Save wasteTypes to localStorage
    useEffect(() => {
        localStorage.setItem('ecomountaint_wastetypes', JSON.stringify(wasteTypes));
    }, [wasteTypes]);

    useEffect(() => { loadData(); }, [userRole, activeTab]);

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

    // Track new requests/clients for notifications
    useEffect(() => {
        if (userRole === 'manager' && pickupRequests) {
            const currentCount = pickupRequests.filter(r => r.status === 'pending').length;
            if (prevRequestCount > 0 && currentCount > prevRequestCount) {
                const newCount = currentCount - prevRequestCount;
                setNotifications(prev => [{ id: Date.now(), type: 'request', text: `${newCount} novi zahtev${newCount > 1 ? 'a' : ''}`, time: new Date() }, ...prev.slice(0, 9)]);
            }
            setPrevRequestCount(currentCount);
        }
    }, [pickupRequests, userRole]);

    useEffect(() => {
        if (userRole === 'manager' && clients.length > 0) {
            if (prevClientCount > 0 && clients.length > prevClientCount) {
                const newClient = clients[0];
                setNotifications(prev => [{ id: Date.now(), type: 'client', text: `Novi klijent: ${newClient.name}`, time: new Date() }, ...prev.slice(0, 9)]);
            }
            setPrevClientCount(clients.length);
        }
    }, [clients, userRole]);

    const clearNotification = (id) => setNotifications(prev => prev.filter(n => n.id !== id));
    const clearAllNotifications = () => setNotifications([]);

    // Real-time countdown refresh
    const [, setTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            if (userRole === 'admin') {
                setStats(await getAdminStats());
                if (activeTab === 'companies') setCompanies(await fetchAllCompanies());
                if (activeTab === 'users') setUsers(await fetchAllUsers());
                if (activeTab === 'codes') setMasterCodes(await fetchAllMasterCodes());
            } else if (userRole === 'manager') {
                setClients(await fetchCompanyClients() || []);
                if (activeTab === 'history') {
                    setProcessedRequests(await fetchProcessedRequests() || []);
                }
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleLogout = () => { if (window.confirm('Odjaviti se?')) { logout(); navigate('/'); } };
    const handleNewRequest = async (data) => { setSubmitLoading(true); try { await addPickupRequest(data); setActiveTab('requests'); } catch (err) { alert(err.message); } finally { setSubmitLoading(false); } };
    const handleProcessRequest = (req) => setProcessingRequest(req);
    const handleConfirmProcess = async (req, proofImageUrl, note, weightData) => {
        await markRequestAsProcessed(req, proofImageUrl, note, weightData);
    };
    const handleDeleteRequest = async (id) => { if (window.confirm('Obrisati?')) try { await removePickupRequest(id); } catch (err) { alert(err.message); } };
    const handleDeleteClient = async (id) => { if (window.confirm('Obrisati klijenta?')) try { await deleteClient?.(id); setClients(await fetchCompanyClients()); } catch (err) { alert(err.message); } };
    const handleGenerateCode = async () => { try { await generateMasterCode(); setMasterCodes(await fetchAllMasterCodes()); } catch (err) { alert(err.message); } };
    const handleCopyCode = (code) => { navigator.clipboard.writeText(code); alert('Kopirano!'); };
    const handleDeleteCode = async (id) => { if (window.confirm('Obrisati?')) try { await deleteMasterCode(id); setMasterCodes(await fetchAllMasterCodes()); } catch (err) { alert(err.message); } };
    const handleDeleteUser = async (id) => { if (window.confirm('Obrisati?')) try { await deleteUser(id); setUsers(await fetchAllUsers()); } catch (err) { alert(err.message); } };
    const handleImpersonateUser = async (userId) => {
        if (!window.confirm('Želite da pristupite ovom nalogu?')) return;
        try {
            const result = await impersonateUser(userId);
            // Navigate based on role
            if (result.role === 'manager') navigate('/manager');
            else if (result.role === 'client') navigate('/client');
            else navigate('/admin');
            window.location.reload();
        } catch (err) { alert(err.message); }
    };
    const refreshUsers = async () => { setUsers(await fetchAllUsers()); };
    const refreshCompanies = async () => { setCompanies(await fetchAllCompanies()); };

    // Equipment handlers (local state for now, later connect to Supabase)
    const handleAddEquipment = (newEq) => {
        const eq = { id: Date.now().toString(), ...newEq, assigned_to: null, assigned_to_name: null };
        setEquipment(prev => [...prev, eq]);
    };
    const handleAssignEquipment = (eqId, clientId) => {
        const client = clients.find(c => c.id === clientId);
        setEquipment(prev => prev.map(eq => eq.id === eqId ? { ...eq, assigned_to: clientId, assigned_to_name: client?.name } : eq));
    };
    const handleDeleteEquipment = (id) => { if (window.confirm('Obrisati opremu?')) setEquipment(prev => prev.filter(eq => eq.id !== id)); };
    const handleEditEquipment = (updated) => {
        setEquipment(prev => prev.map(eq => eq.id === updated.id ? updated : eq));
    };

    // Handle click on client name in requests table
    const handleClientClick = (clientId) => {
        const client = clients.find(c => c.id === clientId);
        if (client) setSelectedClient(client);
    };

    // Waste types handlers (local state for now, later connect to Supabase)
    const handleAddWasteType = (newType) => {
        setWasteTypes(prev => [...prev, newType]);
    };
    const handleDeleteWasteType = (id) => { if (window.confirm('Obrisati vrstu robe?')) setWasteTypes(prev => prev.filter(wt => wt.id !== id)); };
    const handleEditWasteType = (updated) => {
        setWasteTypes(prev => prev.map(wt => wt.id === updated.id ? updated : wt));
    };

    // Client location handler
    const handleSaveClientLocation = async (position) => {
        if (editingClientLocation) {
            try {
                // Update in Supabase
                const { error } = await supabase
                    .from('users')
                    .update({ latitude: position[0], longitude: position[1] })
                    .eq('id', editingClientLocation.id);

                if (error) throw error;

                // Update local state
                setClients(prev => prev.map(c =>
                    c.id === editingClientLocation.id
                        ? { ...c, latitude: position[0], longitude: position[1] }
                        : c
                ));
                setEditingClientLocation(null);
            } catch (err) {
                alert('Greška pri čuvanju lokacije: ' + err.message);
            }
        }
    };

    // Client equipment handler
    const handleSaveClientEquipment = async (clientId, equipmentTypes, note, pib) => {
        try {
            await updateClientDetails(clientId, equipmentTypes, note, pib);
            // Update local state
            setClients(prev => prev.map(c =>
                c.id === clientId
                    ? { ...c, equipment_types: equipmentTypes, manager_note: note, pib: pib }
                    : c
            ));
        } catch (err) {
            throw err;
        }
    };

    const getMenu = () => {
        if (userRole === 'admin') return [{ id: 'dashboard', icon: LayoutDashboard, label: 'Pregled' }, { id: 'companies', icon: Building2, label: 'Firme' }, { id: 'users', icon: Users, label: 'Korisnici' }, { id: 'codes', icon: FileText, label: 'Master Kodovi' }, { id: 'messages', icon: MessageCircle, label: 'Poruke', badge: unreadCount > 0 ? unreadCount : null }];
        if (userRole === 'manager') return [
            { id: 'dashboard', icon: LayoutDashboard, label: 'Pregled' },
            { id: 'requests', icon: Truck, label: 'Zahtevi', badge: pickupRequests?.filter(r => r.status === 'pending').length },
            { id: 'history', icon: History, label: 'Istorija' },
            { id: 'analytics', icon: BarChart3, label: 'Analitika' },
            { id: 'clients', icon: Users, label: 'Klijenti' },
            { id: 'messages', icon: MessageCircle, label: 'Poruke', badge: unreadCount > 0 ? unreadCount : null },
            { id: 'print', icon: Printer, label: 'Štampaj/Export' },
            { id: 'equipment', icon: Box, label: 'Oprema' },
            { id: 'wastetypes', icon: Recycle, label: 'Vrste robe' },
            { id: 'map', icon: MapPin, label: 'Mapa' }
        ];
        return [
            { id: 'dashboard', icon: LayoutDashboard, label: 'Početna' },
            { id: 'new', icon: Plus, label: 'Novi zahtev' },
            { id: 'requests', icon: Truck, label: 'Zahtevi', badge: clientRequests?.length },
            { id: 'history', icon: Clock, label: 'Istorija' },
            { id: 'messages', icon: MessageCircle, label: 'Poruke', badge: unreadCount > 0 ? unreadCount : null }
        ];
    };

    const getStats = () => {
        if (userRole === 'admin' && stats) return [
            { label: 'Firme', value: stats.totalCompanies, icon: <Building2 className="w-6 h-6 text-emerald-600" />, onClick: () => setActiveTab('companies') },
            { label: 'Korisnici', value: stats.totalUsers, icon: <Users className="w-6 h-6 text-blue-600" />, onClick: () => setActiveTab('users') },
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
    const pending = pickupRequests?.filter(r => r.status === 'pending') || [];

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
            return <ChatInterface user={user} fetchMessages={fetchMessages} sendMessage={sendMessage} markMessagesAsRead={markMessagesAsRead} getConversations={getConversations} fetchCompanyClients={fetchCompanyClients} fetchCompanyMembers={fetchCompanyMembers} sendMessageToAdmins={sendMessageToAdmins} userRole={userRole} subscribeToMessages={subscribeToMessages} />;
        }
        if (userRole === 'client') {
            if (activeTab === 'new') return <NewRequestForm onSubmit={handleNewRequest} loading={submitLoading} />;
            if (activeTab === 'requests') return <ClientRequestsView requests={clientRequests} wasteTypes={WASTE_TYPES} />;
            if (activeTab === 'history') return <ClientHistoryView history={clientHistory} loading={historyLoading} wasteTypes={WASTE_TYPES} />;
            // Dashboard/Početna for client
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
                                {clientRequests.slice(0, 3).map(r => (
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
                                                <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${r.urgency === '24h' ? 'bg-red-100 text-red-700' : r.urgency === '48h' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {r.urgency === '24h' ? 'Hitno (24h)' : r.urgency === '48h' ? 'Srednje (48h)' : 'Normalno (72h)'}
                                                </span>
                                                <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                                                    <Clock size={12} /> Na čekanju
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
        if (userRole === 'manager') {
            if (activeTab === 'requests') return <ManagerRequestsTable requests={pending} onProcess={handleProcessRequest} onDelete={handleDeleteRequest} onView={setSelectedRequest} onClientClick={handleClientClick} wasteTypes={wasteTypes} initialUrgencyFilter={urgencyFilter} onUrgencyFilterChange={setUrgencyFilter} />;
            if (activeTab === 'history') return <HistoryTable requests={processedRequests} wasteTypes={wasteTypes} onDelete={async (id) => { await deleteProcessedRequest(id); const updated = await fetchProcessedRequests(); setProcessedRequests(updated); }} />;
            if (activeTab === 'analytics') return <AnalyticsPage processedRequests={processedRequests} clients={clients} wasteTypes={wasteTypes} />;
            if (activeTab === 'clients') return <ClientsTable clients={clients} onView={setSelectedClient} onDelete={handleDeleteClient} onEditLocation={setEditingClientLocation} onEditEquipment={setEditingClientEquipment} equipment={equipment} />;
            if (activeTab === 'print') return <PrintExport clients={clients} requests={pending} processedRequests={processedRequests} wasteTypes={wasteTypes} onClientClick={handleClientClick} />;
            if (activeTab === 'equipment') return <EquipmentManagement equipment={equipment} onAdd={handleAddEquipment} onAssign={handleAssignEquipment} onDelete={handleDeleteEquipment} onEdit={handleEditEquipment} clients={clients} />;
            if (activeTab === 'wastetypes') return <WasteTypesManagement wasteTypes={wasteTypes} onAdd={handleAddWasteType} onDelete={handleDeleteWasteType} onEdit={handleEditWasteType} />;
            if (activeTab === 'map') return <div className="space-y-4"><div className="flex gap-2"><button onClick={() => setMapType('requests')} className={`px-4 py-2 rounded-xl text-sm font-medium ${mapType === 'requests' ? 'bg-emerald-600 text-white' : 'bg-white border'}`}>Zahtevi ({pending.length})</button><button onClick={() => setMapType('clients')} className={`px-4 py-2 rounded-xl text-sm font-medium ${mapType === 'clients' ? 'bg-emerald-600 text-white' : 'bg-white border'}`}>Klijenti ({clients.length})</button></div><MapView requests={pending} clients={clients} type={mapType} onClientLocationEdit={setEditingClientLocation} /></div>;
            // Sort by remaining time (most urgent first) for dashboard preview
            const sortedByUrgency = [...pending].sort((a, b) => {
                const remA = getRemainingTime(a.created_at, a.urgency);
                const remB = getRemainingTime(b.created_at, b.urgency);
                return remA.ms - remB.ms;
            });
            return <div className="space-y-8"><div className="grid md:grid-cols-3 gap-6">{statCards.map((s, i) => <StatCard key={i} {...s} />)}</div>{pending.length > 0 && <div><div className="flex justify-between mb-4"><h2 className="text-lg font-bold">Najhitniji zahtevi</h2><button onClick={() => setActiveTab('requests')} className="text-emerald-600 text-sm font-medium">Vidi sve ({pending.length}) <ChevronRight size={16} className="inline" /></button></div><ManagerRequestsTable requests={sortedByUrgency.slice(0, 5)} onProcess={handleProcessRequest} onDelete={handleDeleteRequest} onView={setSelectedRequest} onClientClick={handleClientClick} wasteTypes={wasteTypes} /></div>}</div>;
        }
        if (userRole === 'admin') {
            if (activeTab === 'companies') return <AdminCompaniesTable companies={companies} onEdit={setEditingCompany} />;
            if (activeTab === 'users') return <AdminUsersTable users={users} onDelete={handleDeleteUser} isDeveloper={isDeveloper()} isAdmin={true} onImpersonate={handleImpersonateUser} onChangeRole={changeUserRole} onRefresh={refreshUsers} onEditUser={setEditingUser} />;
            if (activeTab === 'codes') return <MasterCodesTable codes={masterCodes} onGenerate={handleGenerateCode} onCopy={handleCopyCode} onDelete={handleDeleteCode} isDeveloper={isDeveloper()} isAdmin={true} />;
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
                    <nav className="flex-1 p-4 space-y-1">{menu.map(m => <SidebarItem key={m.id} icon={m.icon} label={m.label} active={activeTab === m.id} badge={m.badge} onClick={() => { setActiveTab(m.id); setSidebarOpen(false); }} />)}</nav>
                    <div className="p-4 border-t border-slate-700"><SidebarItem icon={LogOut} label="Odjavi se" onClick={handleLogout} /></div>
                </div>
            </aside>
            <div className="flex-1 flex flex-col min-w-0 relative">
                <div className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none" style={{ backgroundImage: 'url(https://vmsfsstxxndpxbsdylog.supabase.co/storage/v1/object/public/assets/background.jpg)' }} />
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
                                onClick={() => { navigator.clipboard.writeText(companyCode); alert('ECO kod kopiran!'); }}
                                className="hidden md:flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl px-4 py-2.5 transition-colors"
                            >
                                <Building2 size={18} className="text-emerald-600" />
                                <span className="text-sm font-medium text-emerald-700">ECO Kod:</span>
                                <code className="text-sm font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">{companyCode}</code>
                                <Copy size={14} className="text-emerald-500" />
                            </button>
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
                                        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
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
                        {/* Notifications */}
                        <div className="relative">
                            <button onClick={() => { setShowNotifications(!showNotifications); setShowChatDropdown(false); setShowProfileMenu(false); }} className="relative p-2.5 text-slate-500 hover:bg-slate-50 rounded-full">
                                <Bell size={20} />
                                {(notifications.length > 0 || pending.some(r => getCurrentUrgency(r.created_at, r.urgency) === '24h')) && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />}
                            </button>
                            {showNotifications && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                                        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                                            <h3 className="font-bold text-slate-800">{language === 'sr' ? 'Obaveštenja' : 'Notifications'}</h3>
                                            {notifications.length > 0 && <button onClick={clearAllNotifications} className="text-xs text-emerald-600 hover:text-emerald-700">{language === 'sr' ? 'Obriši sve' : 'Clear all'}</button>}
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            {pending.filter(r => getCurrentUrgency(r.created_at, r.urgency) === '24h').length > 0 && (
                                                <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-start gap-3">
                                                    <AlertCircle size={18} className="text-red-500 mt-0.5" />
                                                    <div>
                                                        <p className="text-sm font-medium text-red-700">{pending.filter(r => getCurrentUrgency(r.created_at, r.urgency) === '24h').length} {language === 'sr' ? 'hitnih zahteva' : 'urgent requests'}</p>
                                                        <p className="text-xs text-red-500">{language === 'sr' ? 'Potrebna hitna akcija' : 'Urgent action needed'}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {notifications.length > 0 ? notifications.map(n => (
                                                <div key={n.id} className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 flex items-start gap-3">
                                                    {n.type === 'request' ? <Truck size={18} className="text-emerald-500 mt-0.5" /> : <Users size={18} className="text-blue-500 mt-0.5" />}
                                                    <div className="flex-1">
                                                        <p className="text-sm text-slate-700">{n.text}</p>
                                                        <p className="text-xs text-slate-400">{new Date(n.time).toLocaleTimeString('sr-RS')}</p>
                                                    </div>
                                                    <button onClick={() => clearNotification(n.id)} className="p-1 text-slate-300 hover:text-slate-500"><X size={14} /></button>
                                                </div>
                                            )) : pending.filter(r => getCurrentUrgency(r.created_at, r.urgency) === '24h').length === 0 && (
                                                <div className="px-4 py-8 text-center text-slate-400">
                                                    <Bell size={24} className="mx-auto mb-2 opacity-50" />
                                                    <p className="text-sm">{language === 'sr' ? 'Nema novih obaveštenja' : 'No new notifications'}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
                                className="flex items-center gap-3 pl-4 border-l hover:bg-slate-50 rounded-xl py-1 pr-2 transition-colors"
                            >
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-bold">{user?.name}</p>
                                    <p className="text-xs text-slate-500">{companyName || (userRole === 'admin' ? 'Administrator' : 'Korisnik')}</p>
                                </div>
                                <div className="w-11 h-11 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-lg">{user?.name?.charAt(0)}</div>
                                <ChevronDown size={16} className="text-slate-400 hidden sm:block" />
                            </button>
                            {showProfileMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 py-2">
                                        <div className="px-4 py-3 border-b border-slate-100">
                                            <p className="font-bold text-slate-800">{user?.name}</p>
                                            <p className="text-xs text-slate-500">{user?.phone}</p>
                                        </div>
                                        {/* ECO kod za mobilne */}
                                        {userRole !== 'admin' && companyCode && (
                                            <button
                                                onClick={() => { navigator.clipboard.writeText(companyCode); alert('ECO kod kopiran!'); setShowProfileMenu(false); }}
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
                <main className="flex-1 overflow-y-auto p-6 lg:p-8 relative z-10">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-8"><h1 className="text-2xl font-bold">{activeTab === 'dashboard' ? `Dobrodošli, ${user?.name?.split(' ')[0]}!` : activeTab === 'new' ? 'Novi zahtev' : activeTab === 'requests' ? 'Zahtevi' : activeTab === 'history' ? 'Istorija zahteva' : activeTab === 'analytics' ? 'Analitika' : activeTab === 'clients' ? 'Klijenti' : activeTab === 'print' ? 'Štampaj / Export' : activeTab === 'equipment' ? 'Upravljanje opremom' : activeTab === 'wastetypes' ? 'Vrste robe' : activeTab === 'map' ? 'Mapa' : activeTab === 'messages' ? 'Poruke' : activeTab === 'companies' ? 'Firme' : activeTab === 'users' ? 'Korisnici' : 'Master kodovi'}</h1></div>
                        {loading ? <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-emerald-600" size={32} /></div> : renderContent()}
                    </div>
                </main>
            </div>
            <RequestDetailsModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />
            <ProcessRequestModal request={processingRequest} onProcess={handleConfirmProcess} onClose={() => setProcessingRequest(null)} />
            <ClientDetailsModal client={selectedClient} equipment={equipment} onClose={() => setSelectedClient(null)} />
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
                    onSave={handleSaveClientEquipment}
                    onClose={() => setEditingClientEquipment(null)}
                />
            )}
            {processedNotification && <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-50"><CheckCircle2 size={24} /><div><p className="font-semibold">{language === 'sr' ? 'Zahtev obrađen!' : 'Request processed!'}</p><p className="text-sm opacity-90">"{processedNotification.wasteLabel}" {language === 'sr' ? 'preuzet' : 'picked up'}</p></div><button onClick={clearProcessedNotification} className="p-1 hover:bg-white/20 rounded-lg"><X size={20} /></button></div>}
            {/* Settings Modal */}
            <Modal open={showSettings} onClose={() => setShowSettings(false)} title={language === 'sr' ? 'Podešavanja' : 'Settings'}>
                <div className="space-y-6">
                    {/* Language Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">{language === 'sr' ? 'Jezik' : 'Language'}</label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setLanguage('sr')}
                                className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${language === 'sr' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                            >
                                <span className="text-2xl mb-2 block">🇷🇸</span>
                                <span className="text-sm font-medium">Srpski</span>
                            </button>
                            <button
                                onClick={() => setLanguage('en')}
                                className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${language === 'en' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                            >
                                <span className="text-2xl mb-2 block">🇬🇧</span>
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
                    {/* Company Name (for managers only) */}
                    {userRole === 'manager' && companyCode && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'sr' ? 'Ime firme' : 'Company name'}</label>
                            <input
                                type="text"
                                value={editingProfile.companyName}
                                onChange={(e) => setEditingProfile({ ...editingProfile, companyName: e.target.value })}
                                placeholder={language === 'sr' ? 'Unesite ime firme...' : 'Enter company name...'}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            />
                        </div>
                    )}
                    {/* Location Setting - for clients and managers */}
                    {userRole !== 'admin' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'sr' ? 'Moja lokacija' : 'My location'}</label>
                            <div className="h-48 rounded-xl overflow-hidden border border-slate-200 mb-2">
                                <MapContainer
                                    center={[editingProfile.latitude || 44.8, editingProfile.longitude || 20.45]}
                                    zoom={editingProfile.latitude ? 15 : 11}
                                    style={{ height: '100%', width: '100%' }}
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
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <MapPin size={12} className="text-emerald-500" />
                                    {editingProfile.address.length > 80 ? editingProfile.address.substring(0, 80) + '...' : editingProfile.address}
                                </p>
                            )}
                            {editingProfile.latitude && editingProfile.longitude && (
                                <p className="text-xs text-emerald-600 mt-1">
                                    {language === 'sr' ? 'Koordinate' : 'Coordinates'}: {editingProfile.latitude.toFixed(4)}, {editingProfile.longitude.toFixed(4)}
                                </p>
                            )}
                            <p className="text-xs text-slate-400 mt-1">{language === 'sr' ? 'Prevucite marker na mapi da podesite tačnu lokaciju' : 'Drag the marker on the map to set exact location'}</p>
                        </div>
                    )}
                    {/* ECO Code Display */}
                    {userRole !== 'admin' && companyCode && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'sr' ? 'ECO Kod firme' : 'Company ECO Code'}</label>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-mono font-bold">{companyCode}</code>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(companyCode); alert(language === 'sr' ? 'Kopirano!' : 'Copied!'); }}
                                    className="p-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl transition-colors"
                                >
                                    <Copy size={20} />
                                </button>
                            </div>
                        </div>
                    )}
                    {/* Save Button */}
                    <button
                        onClick={async () => {
                            try {
                                // Save name if changed
                                if (editingProfile.name && editingProfile.name !== user?.name) {
                                    await updateProfile(editingProfile.name);
                                }
                                // Save company name if changed (managers only)
                                if (userRole === 'manager' && editingProfile.companyName && editingProfile.companyName !== companyName) {
                                    await updateCompanyName(editingProfile.companyName);
                                }
                                // Save location if changed
                                if (editingProfile.latitude && editingProfile.longitude && (editingProfile.latitude !== user?.latitude || editingProfile.longitude !== user?.longitude || editingProfile.address !== user?.address)) {
                                    await updateLocation(editingProfile.address, editingProfile.latitude, editingProfile.longitude);
                                }
                                alert(language === 'sr' ? 'Podešavanja su sačuvana!' : 'Settings saved!');
                                setShowSettings(false);
                            } catch (error) {
                                alert(language === 'sr' ? 'Greška pri čuvanju: ' + error.message : 'Error saving: ' + error.message);
                            }
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl transition-colors"
                    >
                        {language === 'sr' ? 'Sačuvaj promene' : 'Save changes'}
                    </button>
                </div>
            </Modal>
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
        </div>
    );
}

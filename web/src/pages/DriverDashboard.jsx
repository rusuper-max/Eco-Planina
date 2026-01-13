import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    MapPin, LogOut, Truck, Clock, Navigation, CheckCircle2,
    AlertCircle, Phone, RefreshCw, List, Map as MapIcon, User,
    MessageCircle, History, Send, ArrowLeft, Check, CheckCheck
} from 'lucide-react';

// Import shared utilities
import {
    createCustomIcon, getRemainingTime, getCurrentUrgency,
    WASTE_TYPES, CountdownTimer, FitBounds, FillLevelBar
} from './DashboardComponents';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function DriverDashboard() {
    const navigate = useNavigate();
    const {
        user, logout, companyCode, companyName, pickupRequests, markRequestAsProcessed, fetchCompanyWasteTypes,
        fetchMessages, sendMessage, markMessagesAsRead, getConversations, subscribeToMessages, unreadCount
    } = useAuth();
    const [view, setView] = useState('map'); // 'map', 'list', 'messages', 'history'
    const [wasteTypes, setWasteTypes] = useState(WASTE_TYPES);
    const [processing, setProcessing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState([]);
    const [myUserId, setMyUserId] = useState(null);
    const [todayCompleted, setTodayCompleted] = useState(0);

    // Messages state
    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const messagesEndRef = useRef(null);

    // History state
    const [historyRequests, setHistoryRequests] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Check if user is a driver
    const isDriver = user?.role === 'driver';

    // Get current user's ID from users table
    useEffect(() => {
        const fetchMyUserId = async () => {
            const { data: authUser } = await supabase.auth.getUser();
            if (authUser?.user?.id) {
                const { data } = await supabase
                    .from('users')
                    .select('id')
                    .eq('auth_id', authUser.user.id)
                    .single();
                if (data) setMyUserId(data.id);
            }
        };
        fetchMyUserId();
    }, []);

    // Fetch driver's assignments
    useEffect(() => {
        if (myUserId && isDriver) {
            fetchMyAssignments();
            fetchTodayCompleted();
        } else if (!isDriver) {
            setLoading(false);
        }
    }, [myUserId, isDriver]);

    const fetchMyAssignments = async () => {
        try {
            const { data, error } = await supabase
                .from('driver_assignments')
                .select('request_id')
                .eq('driver_id', myUserId)
                .in('status', ['assigned', 'in_progress'])
                .is('deleted_at', null);

            if (error) throw error;
            setAssignments(data || []);
        } catch (err) {
            console.error('Error fetching assignments:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTodayCompleted = async () => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { count, error } = await supabase
                .from('driver_assignments')
                .select('*', { count: 'exact', head: true })
                .eq('driver_id', myUserId)
                .eq('status', 'completed')
                .gte('completed_at', today.toISOString());

            if (!error) setTodayCompleted(count || 0);
        } catch (err) {
            console.error('Error fetching today completed:', err);
        }
    };

    // Load waste types
    useEffect(() => {
        fetchCompanyWasteTypes().then(types => {
            if (types && types.length > 0) setWasteTypes(types);
        });
    }, []);

    // Subscribe to messages
    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToMessages((msg, type) => {
            if (selectedChat && (msg.sender_id === selectedChat.id || msg.receiver_id === selectedChat.id)) {
                setChatMessages(prev => [...prev, msg]);
            }
            loadConversations();
        });
        return () => unsubscribe();
    }, [user, selectedChat]);

    // Load conversations when switching to messages view
    useEffect(() => {
        if (view === 'messages') {
            loadConversations();
        }
    }, [view]);

    // Load history when switching to history view
    useEffect(() => {
        if (view === 'history' && myUserId) {
            loadHistory();
        }
    }, [view, myUserId]);

    const loadConversations = async () => {
        const convos = await getConversations();
        setConversations(convos);
    };

    const loadHistory = async () => {
        setLoadingHistory(true);
        try {
            const { data, error } = await supabase
                .from('driver_assignments')
                .select(`
                    *,
                    pickup_requests:request_id (
                        client_name, client_address, waste_type, waste_label
                    )
                `)
                .eq('driver_id', myUserId)
                .eq('status', 'completed')
                .is('deleted_at', null)
                .order('completed_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setHistoryRequests(data || []);
        } catch (err) {
            console.error('Error loading history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const openChat = async (partner) => {
        setSelectedChat(partner);
        setLoadingMessages(true);
        const msgs = await fetchMessages(partner.id);
        setChatMessages(msgs);
        await markMessagesAsRead(partner.id);
        setLoadingMessages(false);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat || sendingMessage) return;

        setSendingMessage(true);
        try {
            await sendMessage(selectedChat.id, newMessage.trim());
            setNewMessage('');
            const msgs = await fetchMessages(selectedChat.id);
            setChatMessages(msgs);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (err) {
            alert('Greška pri slanju poruke');
        } finally {
            setSendingMessage(false);
        }
    };

    // Get assigned request IDs
    const assignedRequestIds = useMemo(() => {
        return new Set(assignments.map(a => a.request_id));
    }, [assignments]);

    // Get pending requests - filtered by assignments for drivers
    const pendingRequests = useMemo(() => {
        if (!pickupRequests) return [];

        let requests = pickupRequests.filter(r => r.status === 'pending');

        // If user is a driver, only show assigned requests
        if (isDriver && assignedRequestIds.size > 0) {
            requests = requests.filter(r => assignedRequestIds.has(r.id));
        } else if (isDriver && assignedRequestIds.size === 0 && !loading) {
            return [];
        }

        return requests
            .map(r => ({
                ...r,
                currentUrgency: getCurrentUrgency(r.created_at, r.urgency),
                remainingTime: getRemainingTime(r.created_at, r.urgency)
            }))
            .sort((a, b) => a.remainingTime.ms - b.remainingTime.ms);
    }, [pickupRequests, isDriver, assignedRequestIds, loading]);

    // Get waste icon
    const getWasteIcon = (wasteTypeId) => {
        const wt = wasteTypes.find(w => w.id === wasteTypeId);
        return wt?.icon || '📦';
    };

    // Handle quick complete
    const handleQuickComplete = async (request) => {
        if (processing) return;
        if (!window.confirm(`Označiti "${request.waste_label}" kao preuzeto?`)) return;

        setProcessing(true);
        try {
            await markRequestAsProcessed(request, null, 'Preuzeto via vozački portal');

            // Update assignment status if driver
            if (isDriver) {
                await supabase
                    .from('driver_assignments')
                    .update({ status: 'completed', completed_at: new Date().toISOString() })
                    .eq('request_id', request.id)
                    .eq('driver_id', myUserId);

                // Refresh assignments and stats
                await fetchMyAssignments();
                await fetchTodayCompleted();
            }
        } catch (err) {
            alert('Greška: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    // Prepare markers
    const markers = useMemo(() => {
        return pendingRequests
            .filter(r => r.latitude && r.longitude)
            .map(r => ({
                item: r,
                position: [parseFloat(r.latitude), parseFloat(r.longitude)],
                hasCoords: true
            }));
    }, [pendingRequests]);

    const allPositions = useMemo(() => markers.map(m => m.position), [markers]);

    // Stats
    const urgentCount = pendingRequests.filter(r => r.currentUrgency === '24h').length;
    const mediumCount = pendingRequests.filter(r => r.currentUrgency === '48h').length;
    const normalCount = pendingRequests.filter(r => r.currentUrgency === '72h').length;

    const handleLogout = () => {
        if (window.confirm('Odjaviti se?')) {
            logout();
            navigate('/');
        }
    };

    // Format time ago
    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Upravo';
        if (diffMins < 60) return `${diffMins} min`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return date.toLocaleDateString('sr-RS');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center">
                <RefreshCw className="animate-spin text-emerald-600" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {/* Header */}
            <header className="h-16 bg-slate-800 text-white flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                            <Truck size={18} />
                        </div>
                        <div className="hidden sm:block">
                            <p className="font-bold text-sm">Vozački Portal</p>
                            <p className="text-xs text-slate-400">{companyName || 'EcoMountain'}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Today completed badge */}
                    {isDriver && todayCompleted > 0 && (
                        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 rounded-lg">
                            <CheckCircle2 size={14} className="text-emerald-400" />
                            <span className="text-xs text-emerald-300">Danas: <strong>{todayCompleted}</strong></span>
                        </div>
                    )}
                    {/* User info */}
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-700 rounded-lg">
                        <User size={16} className="text-slate-400" />
                        <span className="text-sm">{user?.name}</span>
                    </div>
                    {/* View Toggle */}
                    <div className="flex bg-slate-700 rounded-lg p-1">
                        <button
                            onClick={() => setView('map')}
                            className={`px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${view === 'map' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'}`}
                        >
                            <MapIcon size={16} /> <span className="hidden sm:inline">Mapa</span>
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={`px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${view === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'}`}
                        >
                            <List size={16} /> <span className="hidden sm:inline">Lista</span>
                        </button>
                        <button
                            onClick={() => setView('messages')}
                            className={`px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 relative ${view === 'messages' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'}`}
                        >
                            <MessageCircle size={16} /> <span className="hidden sm:inline">Poruke</span>
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setView('history')}
                            className={`px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${view === 'history' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'}`}
                        >
                            <History size={16} /> <span className="hidden sm:inline">Istorija</span>
                        </button>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 hover:bg-slate-700 rounded-lg"
                        title="Odjavi se"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* Stats Bar - only for map/list views */}
            {(view === 'map' || view === 'list') && (
                <div className="bg-white border-b px-4 py-3 flex items-center gap-4 overflow-x-auto shrink-0">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                        <Truck size={16} className="text-slate-600" />
                        <span className="font-bold">{pendingRequests.length}</span>
                        <span className="text-sm text-slate-500">{isDriver ? 'dodeljeno' : 'ukupno'}</span>
                    </div>
                    {urgentCount > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 rounded-lg">
                            <AlertCircle size={16} className="text-red-600" />
                            <span className="font-bold text-red-700">{urgentCount}</span>
                            <span className="text-sm text-red-600">hitno</span>
                        </div>
                    )}
                    {mediumCount > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 rounded-lg">
                            <Clock size={16} className="text-amber-600" />
                            <span className="font-bold text-amber-700">{mediumCount}</span>
                            <span className="text-sm text-amber-600">srednje</span>
                        </div>
                    )}
                    {normalCount > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 rounded-lg">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            <span className="font-bold text-emerald-700">{normalCount}</span>
                            <span className="text-sm text-emerald-600">normalno</span>
                        </div>
                    )}
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Map View */}
                {view === 'map' && (
                    <div className="flex-1 relative">
                        {pendingRequests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4">
                                <Truck size={64} className="mb-4 opacity-50" />
                                <p className="text-xl font-medium text-center">
                                    {isDriver ? 'Nemate dodeljenih zahteva' : 'Nema aktivnih zahteva'}
                                </p>
                                <p className="text-sm mt-2 text-center">
                                    {isDriver
                                        ? 'Sačekajte da vam menadžer dodeli zahteve za preuzimanje'
                                        : 'Trenutno nema zahteva za prikaz'
                                    }
                                </p>
                            </div>
                        ) : (
                            <MapContainer
                                center={[44.8, 20.45]}
                                zoom={11}
                                style={{ height: '100%', width: '100%' }}
                                zoomControl={false}
                            >
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                {allPositions.length > 0 && <FitBounds positions={allPositions} />}
                                <MarkerClusterGroup
                                    chunkedLoading
                                    maxClusterRadius={50}
                                    spiderfyOnMaxZoom={true}
                                    showCoverageOnHover={false}
                                    iconCreateFunction={(cluster) => {
                                        const count = cluster.getChildCount();
                                        const childMarkers = cluster.getAllChildMarkers();
                                        const hasUrgent = childMarkers.some(m => m.options.urgencyLevel === '24h');
                                        const hasMedium = childMarkers.some(m => m.options.urgencyLevel === '48h');
                                        const color = hasUrgent ? '#EF4444' : hasMedium ? '#F59E0B' : '#10B981';
                                        return L.divIcon({
                                            html: `<div style="background-color: ${color}; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${count}</div>`,
                                            className: 'custom-cluster-icon',
                                            iconSize: L.point(40, 40, true),
                                        });
                                    }}
                                >
                                    {markers.map(({ item, position }) => (
                                        <Marker
                                            key={item.id}
                                            position={position}
                                            icon={createCustomIcon(item.currentUrgency, getWasteIcon(item.waste_type), false)}
                                            urgencyLevel={item.currentUrgency}
                                        >
                                            <Popup>
                                                <div className="min-w-[220px]">
                                                    <p className="font-bold text-lg">{item.client_name}</p>
                                                    <p className="text-sm text-slate-600">{item.waste_label}</p>
                                                    <p className="text-xs text-slate-500 mt-1">{item.client_address}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-xs text-slate-500">Popunjenost:</span>
                                                        <FillLevelBar fillLevel={item.fill_level} />
                                                    </div>
                                                    <div className={`text-sm font-bold mt-2 ${item.currentUrgency === '24h' ? 'text-red-600' : item.currentUrgency === '48h' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                        <CountdownTimer createdAt={item.created_at} urgency={item.urgency} />
                                                    </div>
                                                    <div className="flex gap-2 mt-3">
                                                        <a
                                                            href={`https://www.google.com/maps/dir/?api=1&destination=${position[0]},${position[1]}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 text-center font-medium"
                                                        >
                                                            Google Maps
                                                        </a>
                                                        <a
                                                            href={`https://waze.com/ul?ll=${position[0]},${position[1]}&navigate=yes`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-1 px-3 py-2 bg-cyan-600 text-white text-xs rounded-lg hover:bg-cyan-700 text-center font-medium"
                                                        >
                                                            Waze
                                                        </a>
                                                    </div>
                                                    <button
                                                        onClick={() => handleQuickComplete(item)}
                                                        disabled={processing}
                                                        className="w-full mt-2 px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                        Označi kao preuzeto
                                                    </button>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}
                                </MarkerClusterGroup>
                            </MapContainer>
                        )}

                        {/* Floating list of requests without location */}
                        {pendingRequests.filter(r => !r.latitude || !r.longitude).length > 0 && (
                            <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white rounded-xl shadow-lg border max-h-48 overflow-y-auto">
                                <div className="p-3 border-b bg-amber-50">
                                    <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                                        <AlertCircle size={16} />
                                        Zahtevi bez lokacije ({pendingRequests.filter(r => !r.latitude || !r.longitude).length})
                                    </p>
                                </div>
                                <div className="divide-y">
                                    {pendingRequests.filter(r => !r.latitude || !r.longitude).map(r => (
                                        <div key={r.id} className="p-3 hover:bg-slate-50">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-sm">{r.client_name}</p>
                                                    <p className="text-xs text-slate-500">{r.waste_label}</p>
                                                </div>
                                                <CountdownTimer createdAt={r.created_at} urgency={r.urgency} />
                                            </div>
                                            {r.client_phone && (
                                                <a href={`tel:${r.client_phone}`} className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                                                    <Phone size={12} /> {r.client_phone}
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* List View */}
                {view === 'list' && (
                    <div className="flex-1 overflow-y-auto p-4">
                        {pendingRequests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Truck size={64} className="mb-4 opacity-50" />
                                <p className="text-xl font-medium">
                                    {isDriver ? 'Nemate dodeljenih zahteva' : 'Nema aktivnih zahteva'}
                                </p>
                                <p className="text-sm mt-2">
                                    {isDriver
                                        ? 'Sačekajte da vam menadžer dodeli zahteve za preuzimanje'
                                        : 'Svi zahtevi su obrađeni'
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-w-2xl mx-auto">
                                {pendingRequests.map(request => (
                                    <div
                                        key={request.id}
                                        className={`bg-white rounded-xl border-l-4 shadow-sm overflow-hidden ${
                                            request.currentUrgency === '24h' ? 'border-l-red-500' :
                                            request.currentUrgency === '48h' ? 'border-l-amber-500' : 'border-l-emerald-500'
                                        }`}
                                    >
                                        <div className="p-4">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl">
                                                        {getWasteIcon(request.waste_type)}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-800">{request.client_name}</h3>
                                                        <p className="text-sm text-slate-500">{request.waste_label}</p>
                                                    </div>
                                                </div>
                                                <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                                                    request.currentUrgency === '24h' ? 'bg-red-100 text-red-700' :
                                                    request.currentUrgency === '48h' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    <CountdownTimer createdAt={request.created_at} urgency={request.urgency} />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-xs text-slate-500">Popunjenost:</span>
                                                <FillLevelBar fillLevel={request.fill_level} />
                                            </div>

                                            {request.client_address && (
                                                <p className="text-sm text-slate-600 mb-3 flex items-start gap-2">
                                                    <MapPin size={16} className="shrink-0 mt-0.5 text-slate-400" />
                                                    {request.client_address}
                                                </p>
                                            )}

                                            <div className="flex gap-2">
                                                {request.latitude && request.longitude ? (
                                                    <>
                                                        <a
                                                            href={`https://www.google.com/maps/dir/?api=1&destination=${request.latitude},${request.longitude}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 text-center font-medium flex items-center justify-center gap-2"
                                                        >
                                                            <Navigation size={16} /> Google Maps
                                                        </a>
                                                        <a
                                                            href={`https://waze.com/ul?ll=${request.latitude},${request.longitude}&navigate=yes`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-1 px-4 py-2.5 bg-cyan-600 text-white text-sm rounded-xl hover:bg-cyan-700 text-center font-medium flex items-center justify-center gap-2"
                                                        >
                                                            <Navigation size={16} /> Waze
                                                        </a>
                                                    </>
                                                ) : (
                                                    <div className="flex-1 px-4 py-2.5 bg-amber-100 text-amber-700 text-sm rounded-xl text-center font-medium flex items-center justify-center gap-2">
                                                        <AlertCircle size={16} /> Lokacija nije podešena
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => handleQuickComplete(request)}
                                                    disabled={processing}
                                                    className="px-4 py-2.5 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 disabled:opacity-50 font-medium flex items-center gap-2"
                                                >
                                                    <CheckCircle2 size={16} />
                                                </button>
                                            </div>

                                            {request.client_phone && (
                                                <a
                                                    href={`tel:${request.client_phone}`}
                                                    className="mt-3 flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                                >
                                                    <Phone size={16} /> Pozovi: {request.client_phone}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Messages View */}
                {view === 'messages' && (
                    <div className="flex-1 flex flex-col bg-white">
                        {!selectedChat ? (
                            // Conversations list
                            <div className="flex-1 overflow-y-auto">
                                <div className="p-4 border-b bg-slate-50">
                                    <h2 className="font-bold text-slate-800">Poruke</h2>
                                    <p className="text-sm text-slate-500">Razgovori sa menadžerima i adminima</p>
                                </div>
                                {conversations.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                        <MessageCircle size={48} className="mb-3 opacity-50" />
                                        <p className="text-sm">Nemate poruka</p>
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {conversations.map(conv => (
                                            <button
                                                key={conv.partnerId}
                                                onClick={() => openChat(conv.partner)}
                                                className="w-full p-4 hover:bg-slate-50 text-left flex items-center gap-3"
                                            >
                                                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                                                    <User size={24} className="text-slate-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-medium text-slate-800 truncate">{conv.partner.name}</p>
                                                        <span className="text-xs text-slate-400">{formatTimeAgo(conv.lastMessageAt)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm text-slate-500 truncate flex-1">{conv.lastMessage}</p>
                                                        {conv.unread > 0 && (
                                                            <span className="w-5 h-5 bg-emerald-600 text-white text-xs rounded-full flex items-center justify-center">
                                                                {conv.unread}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Chat view
                            <>
                                <div className="p-4 border-b bg-slate-50 flex items-center gap-3">
                                    <button
                                        onClick={() => setSelectedChat(null)}
                                        className="p-2 hover:bg-slate-200 rounded-lg"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                                        <User size={20} className="text-slate-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-800">{selectedChat.name}</p>
                                        <p className="text-xs text-slate-500 capitalize">{selectedChat.role}</p>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {loadingMessages ? (
                                        <div className="flex items-center justify-center h-32">
                                            <RefreshCw className="animate-spin text-slate-400" size={24} />
                                        </div>
                                    ) : chatMessages.length === 0 ? (
                                        <div className="text-center text-slate-400 py-8">
                                            <p className="text-sm">Započnite razgovor</p>
                                        </div>
                                    ) : (
                                        chatMessages.map(msg => (
                                            <div
                                                key={msg.id}
                                                className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                                                        msg.sender_id === user?.id
                                                            ? 'bg-emerald-600 text-white rounded-br-md'
                                                            : 'bg-slate-200 text-slate-800 rounded-bl-md'
                                                    }`}
                                                >
                                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                                    <div className={`flex items-center justify-end gap-1 mt-1 ${msg.sender_id === user?.id ? 'text-emerald-200' : 'text-slate-400'}`}>
                                                        <span className="text-xs">{formatTimeAgo(msg.created_at)}</span>
                                                        {msg.sender_id === user?.id && (
                                                            msg.is_read ? <CheckCheck size={14} /> : <Check size={14} />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                                <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="Napišite poruku..."
                                            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim() || sendingMessage}
                                            className="px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {sendingMessage ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                )}

                {/* History View */}
                {view === 'history' && (
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-4 border-b bg-white sticky top-0">
                            <h2 className="font-bold text-slate-800">Istorija preuzimanja</h2>
                            <p className="text-sm text-slate-500">Poslednjih 50 završenih zahteva</p>
                        </div>
                        {loadingHistory ? (
                            <div className="flex items-center justify-center h-64">
                                <RefreshCw className="animate-spin text-emerald-600" size={32} />
                            </div>
                        ) : historyRequests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                <History size={48} className="mb-3 opacity-50" />
                                <p className="text-lg font-medium">Nema završenih zahteva</p>
                                <p className="text-sm">Vaša istorija će se pojaviti ovde</p>
                            </div>
                        ) : (
                            <div className="p-4 space-y-3 max-w-2xl mx-auto">
                                {historyRequests.map(item => (
                                    <div key={item.id} className="bg-white rounded-xl border shadow-sm p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                                    <CheckCircle2 size={20} className="text-emerald-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">
                                                        {item.pickup_requests?.client_name || 'Nepoznat klijent'}
                                                    </p>
                                                    <p className="text-sm text-slate-500">
                                                        {item.pickup_requests?.waste_label || 'Nepoznata vrsta'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-slate-400">
                                                    {new Date(item.completed_at).toLocaleDateString('sr-RS')}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {new Date(item.completed_at).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                        {item.pickup_requests?.client_address && (
                                            <p className="mt-2 text-sm text-slate-500 flex items-center gap-2">
                                                <MapPin size={14} className="text-slate-400" />
                                                {item.pickup_requests.client_address}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

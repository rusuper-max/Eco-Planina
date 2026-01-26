/**
 * DriverDashboard - Vozački portal
 * Refaktorisano: Logika i komponente ekstraktovane u ./driver-dashboard/
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    Truck, LogOut, Clock, User, MessageCircle, History,
    Map as MapIcon, List, AlertCircle, CheckCircle2, Package, PackageCheck,
    Filter, RefreshCw, ArrowLeft
} from 'lucide-react';
import { WASTE_TYPES } from './DashboardComponents';

// Import hooks
import { useDriverAssignments, useDriverHistory, useDriverMessages } from './driver-dashboard/hooks';

// Import components
import { DriverMapView, DriverListView, DriverMessagesView, DriverHistoryView } from './driver-dashboard/components';

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
        user, logout, companyName, pickupRequests, fetchCompanyWasteTypes,
        fetchMessages, sendMessage, markMessagesAsRead, getConversations, subscribeToMessages, unreadCount,
        fetchCompanyMembers, exitImpersonation, originalUser
    } = useAuth();

    const [view, setView] = useState('map'); // 'map', 'list', 'messages', 'history'
    const [wasteTypes, setWasteTypes] = useState(WASTE_TYPES);

    // Initialize hooks
    const assignmentsHook = useDriverAssignments({ user, pickupRequests });
    const historyHook = useDriverHistory({ userId: user?.id, isActive: view === 'history' });
    const messagesHook = useDriverMessages({
        user,
        isActive: view === 'messages',
        fetchMessages,
        sendMessage,
        markMessagesAsRead,
        getConversations,
        subscribeToMessages,
        fetchCompanyMembers
    });

    const {
        loading, processing, todayStats, isDriver,
        urgencyFilter, setUrgencyFilter, selectedForRoute,
        handlePickup, handleDelivery, getPendingRequests, getAllRequests,
        toggleRouteSelection, toggleSelectAllForRoute
    } = assignmentsHook;

    const { historyRequests, loadingHistory } = historyHook;

    const {
        conversations, selectedChat, setSelectedChat, chatMessages,
        newMessage, setNewMessage, sendingMessage, loadingMessages,
        showNewChatModal, setShowNewChatModal, companyMembers, messagesEndRef,
        openChat, handleSendMessage
    } = messagesHook;

    // Get pending requests with current filter
    const pendingRequests = getPendingRequests(urgencyFilter);
    const allRequests = getAllRequests();

    // Stats
    const urgentCount = allRequests.filter(r => r.currentUrgency === '24h').length;
    const mediumCount = allRequests.filter(r => r.currentUrgency === '48h').length;
    const normalCount = allRequests.filter(r => r.currentUrgency === '72h').length;

    // Load waste types
    useEffect(() => {
        fetchCompanyWasteTypes().then(types => {
            if (types && types.length > 0) setWasteTypes(types);
        });
    }, []);

    const handleLogout = async () => {
        if (window.confirm('Odjaviti se?')) {
            await logout();
            navigate('/');
        }
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
                    {/* Exit impersonation (if active) */}
                    {originalUser && (
                        <button
                            onClick={() => { exitImpersonation(); window.location.reload(); }}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded-lg font-semibold shadow-sm flex items-center gap-1"
                        >
                            <ArrowLeft size={14} />
                            Nazad
                        </button>
                    )}
                    {/* Today stats badge */}
                    {isDriver && (todayStats.picked > 0 || todayStats.delivered > 0) && (
                        <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-slate-700 rounded-lg">
                            <div className="flex items-center gap-1.5">
                                <Package size={14} className="text-amber-400" />
                                <span className="text-xs text-amber-300">{todayStats.picked}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <PackageCheck size={14} className="text-emerald-400" />
                                <span className="text-xs text-emerald-300">{todayStats.delivered}</span>
                            </div>
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
                <div className="bg-white border-b px-4 py-3 flex items-center gap-2 overflow-x-auto shrink-0">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                        <Truck size={16} className="text-slate-600" />
                        <span className="font-bold">{allRequests.length}</span>
                        <span className="text-sm text-slate-500 hidden sm:inline">{isDriver ? 'dodeljeno' : 'ukupno'}</span>
                    </div>

                    {/* Clickable urgency filters */}
                    <button
                        onClick={() => setUrgencyFilter(urgencyFilter === '24h' ? 'all' : '24h')}
                        disabled={urgentCount === 0}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${urgencyFilter === '24h'
                            ? 'bg-red-600 text-white ring-2 ring-red-300'
                            : urgentCount > 0
                                ? 'bg-red-100 hover:bg-red-200 cursor-pointer'
                                : 'bg-red-50 opacity-50 cursor-not-allowed'
                            }`}
                    >
                        <AlertCircle size={16} className={urgencyFilter === '24h' ? 'text-white' : 'text-red-600'} />
                        <span className={`font-bold ${urgencyFilter === '24h' ? 'text-white' : 'text-red-700'}`}>{urgentCount}</span>
                        <span className={`text-sm hidden sm:inline ${urgencyFilter === '24h' ? 'text-red-100' : 'text-red-600'}`}>hitno</span>
                    </button>

                    <button
                        onClick={() => setUrgencyFilter(urgencyFilter === '48h' ? 'all' : '48h')}
                        disabled={mediumCount === 0}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${urgencyFilter === '48h'
                            ? 'bg-amber-600 text-white ring-2 ring-amber-300'
                            : mediumCount > 0
                                ? 'bg-amber-100 hover:bg-amber-200 cursor-pointer'
                                : 'bg-amber-50 opacity-50 cursor-not-allowed'
                            }`}
                    >
                        <Clock size={16} className={urgencyFilter === '48h' ? 'text-white' : 'text-amber-600'} />
                        <span className={`font-bold ${urgencyFilter === '48h' ? 'text-white' : 'text-amber-700'}`}>{mediumCount}</span>
                        <span className={`text-sm hidden sm:inline ${urgencyFilter === '48h' ? 'text-amber-100' : 'text-amber-600'}`}>srednje</span>
                    </button>

                    <button
                        onClick={() => setUrgencyFilter(urgencyFilter === '72h' ? 'all' : '72h')}
                        disabled={normalCount === 0}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${urgencyFilter === '72h'
                            ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                            : normalCount > 0
                                ? 'bg-emerald-100 hover:bg-emerald-200 cursor-pointer'
                                : 'bg-emerald-50 opacity-50 cursor-not-allowed'
                            }`}
                    >
                        <CheckCircle2 size={16} className={urgencyFilter === '72h' ? 'text-white' : 'text-emerald-600'} />
                        <span className={`font-bold ${urgencyFilter === '72h' ? 'text-white' : 'text-emerald-700'}`}>{normalCount}</span>
                        <span className={`text-sm hidden sm:inline ${urgencyFilter === '72h' ? 'text-emerald-100' : 'text-emerald-600'}`}>normalno</span>
                    </button>

                    {urgencyFilter !== 'all' && (
                        <button
                            onClick={() => setUrgencyFilter('all')}
                            className="ml-2 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm text-slate-600 flex items-center gap-1"
                        >
                            <Filter size={14} /> Pokaži sve
                        </button>
                    )}
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Map View */}
                {view === 'map' && (
                    <DriverMapView
                        pendingRequests={pendingRequests}
                        wasteTypes={wasteTypes}
                        urgencyFilter={urgencyFilter}
                        setUrgencyFilter={setUrgencyFilter}
                        processing={processing}
                        handlePickup={handlePickup}
                        handleDelivery={handleDelivery}
                    />
                )}

                {/* List View */}
                {view === 'list' && (
                    <div className="flex-1 overflow-y-auto p-4">
                        <DriverListView
                            pendingRequests={pendingRequests}
                            wasteTypes={wasteTypes}
                            urgencyFilter={urgencyFilter}
                            setUrgencyFilter={setUrgencyFilter}
                            processing={processing}
                            handlePickup={handlePickup}
                            handleDelivery={handleDelivery}
                            selectedForRoute={selectedForRoute}
                            toggleRouteSelection={toggleRouteSelection}
                            toggleSelectAllForRoute={toggleSelectAllForRoute}
                        />
                    </div>
                )}

                {/* Messages View */}
                {view === 'messages' && (
                    <div className="flex-1 flex flex-col bg-white">
                        <DriverMessagesView
                            user={user}
                            conversations={conversations}
                            selectedChat={selectedChat}
                            setSelectedChat={setSelectedChat}
                            chatMessages={chatMessages}
                            newMessage={newMessage}
                            setNewMessage={setNewMessage}
                            sendingMessage={sendingMessage}
                            loadingMessages={loadingMessages}
                            showNewChatModal={showNewChatModal}
                            setShowNewChatModal={setShowNewChatModal}
                            companyMembers={companyMembers}
                            messagesEndRef={messagesEndRef}
                            openChat={openChat}
                            handleSendMessage={handleSendMessage}
                        />
                    </div>
                )}

                {/* History View */}
                {view === 'history' && (
                    <DriverHistoryView
                        historyRequests={historyRequests}
                        loadingHistory={loadingHistory}
                        wasteTypes={wasteTypes}
                    />
                )}
            </div>
        </div>
    );
}

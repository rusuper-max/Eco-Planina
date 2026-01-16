import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context';
import { supabase } from '../config/supabase';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    MapPin, LogOut, Truck, Clock, Navigation, CheckCircle2,
    AlertCircle, Phone, RefreshCw, List, Map as MapIcon, User,
    MessageCircle, History, Send, ArrowLeft, Check, CheckCheck,
    Package, PackageCheck, Filter, Users, Plus, ChevronDown, ChevronUp,
    FileText, Scale, Image as ImageIcon, X
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

// Calculate time difference between two dates
const getTimeDiff = (start, end) => {
    if (!start || !end) return null;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate - startDate;

    if (diffMs < 0) return null;

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h ${diffMins % 60}min`;
    return `${diffDays}d ${diffHours % 24}h`;
};

// Format date/time for display
const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('sr-RS', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// History Card with Timeline
const HistoryCard = ({ item, wasteTypes }) => {
    const [expanded, setExpanded] = useState(false);
    const [showProofModal, setShowProofModal] = useState(false);

    const wasteIcon = wasteTypes?.find(w => w.id === item.waste_type)?.icon || '📦';

    // Check if this is a "retroactive assignment" (driver assigned after processing, not before)
    const isRetroactiveAssignment = item.source === 'processed_request' || (!item.assigned_at && !item.picked_up_at);

    // Timeline steps - only show if driver actually worked on this request
    const steps = isRetroactiveAssignment ? [] : [
        {
            key: 'assigned',
            label: 'Dodeljeno',
            icon: Truck,
            time: item.assigned_at,
            color: 'bg-blue-500',
            completed: !!item.assigned_at
        },
        {
            key: 'picked_up',
            label: 'Preuzeto',
            icon: Package,
            time: item.picked_up_at,
            color: 'bg-amber-500',
            completed: !!item.picked_up_at
        },
        {
            key: 'delivered',
            label: 'Dostavljeno',
            icon: PackageCheck,
            time: item.delivered_at,
            color: 'bg-emerald-500',
            completed: !!item.delivered_at
        }
    ];

    // Processed data is now included directly in item from loadHistory
    const processedData = item.processed_at ? {
        processed_at: item.processed_at,
        weight: item.weight,
        weight_unit: item.weight_unit,
        proof_url: item.proof_url,
        notes: item.notes
    } : null;

    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            {/* Header - always visible */}
            <div
                className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl">
                            {wasteIcon}
                        </div>
                        <div>
                            <p className="font-medium text-slate-800">
                                {item.client_name || 'Nepoznat klijent'}
                            </p>
                            <p className="text-sm text-slate-500">
                                {item.waste_label || 'Nepoznata vrsta'}
                            </p>
                            {item.client_address && (
                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1 max-w-[180px] sm:max-w-none">
                                    <MapPin size={10} className="shrink-0" />
                                    <span className="truncate">{item.client_address}</span>
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                            <p className="text-xs font-medium text-emerald-600 whitespace-nowrap">
                                {item.delivered_at ? new Date(item.delivered_at).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\. /g, '.').replace(/\.$/, '') : '-'}
                            </p>
                            <p className="text-xs text-slate-400">
                                {item.delivered_at ? new Date(item.delivered_at).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </p>
                        </div>
                        {expanded ? <ChevronUp size={20} className="text-slate-400 shrink-0" /> : <ChevronDown size={20} className="text-slate-400 shrink-0" />}
                    </div>
                </div>

                {/* Mini timeline preview (collapsed) */}
                {!expanded && (
                    <div className="flex items-center gap-1 mt-3">
                        {isRetroactiveAssignment ? (
                            // Show special badge for retroactive assignments
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                Evidentirano naknadno
                            </span>
                        ) : (
                            // Normal timeline dots
                            <>
                                {steps.map((step, idx) => (
                                    <div key={step.key} className="flex items-center">
                                        <div className={`w-2 h-2 rounded-full ${step.completed ? step.color : 'bg-slate-200'}`} />
                                        {idx < steps.length - 1 && (
                                            <div className={`w-8 h-0.5 ${step.completed && steps[idx + 1].completed ? 'bg-slate-300' : 'bg-slate-200'}`} />
                                        )}
                                    </div>
                                ))}
                                {/* Show processed (purple) dot if status is 'completed' */}
                                {item.status === 'completed' && (
                                    <>
                                        <div className="w-8 h-0.5 bg-slate-300" />
                                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                                    </>
                                )}
                                <span className="text-xs text-slate-400 ml-2">
                                    Ukupno: {getTimeDiff(item.assigned_at, item.delivered_at) || '-'}
                                </span>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Expanded content */}
            {expanded && (
                <div className="px-4 pb-4 border-t bg-slate-50">
                    {/* Show different content for retroactive assignments */}
                    {isRetroactiveAssignment ? (
                        <div className="py-4">
                            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center shrink-0">
                                        <FileText size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-purple-800">Evidentirano naknadno</p>
                                        <p className="text-sm text-purple-600 mt-1">
                                            Ovaj zahtev je obrađen od strane menadžera, a vi ste evidentirani kao vozač naknadno.
                                        </p>
                                        <p className="text-xs text-purple-500 mt-2">
                                            Obrađeno: {formatDateTime(item.delivered_at || item.completed_at)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Normal timeline */
                        <div className="py-4">
                            <div className="relative">
                                {steps.map((step, idx) => {
                                    const Icon = step.icon;
                                    const nextStep = steps[idx + 1];
                                    const timeDiff = nextStep ? getTimeDiff(step.time, nextStep.time) : null;

                                    return (
                                        <div key={step.key} className="flex items-start mb-0">
                                            {/* Icon and line */}
                                            <div className="flex flex-col items-center mr-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step.completed ? step.color : 'bg-slate-200'}`}>
                                                    <Icon size={16} className="text-white" />
                                                </div>
                                                {idx < steps.length - 1 && (
                                                    <div className="relative w-0.5 h-12 bg-slate-200 my-1">
                                                        {step.completed && nextStep?.completed && (
                                                            <div className="absolute inset-0 bg-slate-400" />
                                                        )}
                                                        {/* Time diff badge */}
                                                        {timeDiff && (
                                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap">
                                                                <span className="text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded border">
                                                                    {timeDiff}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 pb-4">
                                                <div className="flex items-center justify-between">
                                                    <p className={`font-medium ${step.completed ? 'text-slate-800' : 'text-slate-400'}`}>
                                                        {step.label}
                                                    </p>
                                                    <span className="text-xs text-slate-500">
                                                        {formatDateTime(step.time)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Processed step (if data exists) */}
                                {processedData && (
                                    <div className="flex items-start">
                                        <div className="flex flex-col items-center mr-3">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-500">
                                                <FileText size={16} className="text-white" />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className="font-medium text-slate-800">Obrađeno</p>
                                                <span className="text-xs text-slate-500">
                                                    {formatDateTime(processedData.processed_at)}
                                                </span>
                                            </div>

                                            {/* Weight and proof */}
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {processedData.weight && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
                                                        <Scale size={12} />
                                                        {processedData.weight} {processedData.weight_unit || 'kg'}
                                                    </span>
                                                )}
                                                {processedData.proof_url && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setShowProofModal(true); }}
                                                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                                                    >
                                                        <ImageIcon size={12} />
                                                        Dokaznica
                                                    </button>
                                                )}
                                            </div>

                                            {processedData.notes && (
                                                <p className="mt-2 text-xs text-slate-500 italic">
                                                    "{processedData.notes}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    )}

                    {/* Summary footer - only for normal timeline */}
                    {!isRetroactiveAssignment && (
                        <div className="pt-3 border-t border-slate-200">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Ukupno vreme:</span>
                                <span className="font-medium text-slate-700">
                                    {getTimeDiff(item.assigned_at, item.delivered_at) || '-'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Proof Modal */}
            {showProofModal && processedData?.proof_url && (
                <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowProofModal(false)}
                >
                    <div className="relative max-w-2xl max-h-[90vh]">
                        <button
                            onClick={() => setShowProofModal(false)}
                            className="absolute -top-10 right-0 text-white hover:text-slate-300"
                        >
                            <X size={24} />
                        </button>
                        <img
                            src={processedData.proof_url}
                            alt="Dokaznica"
                            className="max-w-full max-h-[80vh] rounded-lg object-contain"
                        />
                        <div className="mt-2 text-center text-white text-sm">
                            <p>{item.client_name} - {item.waste_label}</p>
                            {processedData.weight && (
                                <p className="text-emerald-400 font-medium">
                                    {processedData.weight} {processedData.weight_unit || 'kg'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function DriverDashboard() {
    const navigate = useNavigate();
    const {
        user, logout, companyCode, companyName, pickupRequests, fetchCompanyWasteTypes,
        fetchMessages, sendMessage, markMessagesAsRead, getConversations, subscribeToMessages, unreadCount,
        fetchCompanyMembers
    } = useAuth();
    const [view, setView] = useState('map'); // 'map', 'list', 'messages', 'history'
    const [wasteTypes, setWasteTypes] = useState(WASTE_TYPES);
    const [processing, setProcessing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState([]);
    const [todayStats, setTodayStats] = useState({ picked: 0, delivered: 0 });
    const [urgencyFilter, setUrgencyFilter] = useState('all'); // 'all', '24h', '48h', '72h'

    // Use user.id directly from AuthContext instead of fetching separately
    const myUserId = user?.id;

    // Safety timeout - never show loading for more than 5 seconds
    useEffect(() => {
        if (!loading) return; // Already not loading

        const safetyTimeout = setTimeout(() => {
            console.warn('Driver dashboard safety timeout triggered - forcing loading off');
            setLoading(false);
        }, 5000);

        return () => clearTimeout(safetyTimeout);
    }, [loading]);

    // Messages state
    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [companyMembers, setCompanyMembers] = useState([]);
    const messagesEndRef = useRef(null);

    // History state
    const [historyRequests, setHistoryRequests] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Check if user is a driver
    const isDriver = user?.role === 'driver';

    // Fetch driver's assignments when user is loaded
    useEffect(() => {
        console.log('Driver effect:', { myUserId, isDriver, user: user?.name });

        if (!user) {
            // User not loaded yet, keep loading
            return;
        }

        if (myUserId && isDriver) {
            fetchMyAssignments();
            fetchTodayStats();
        } else {
            // User exists but is not a driver, or no user ID
            console.log('Setting loading false - user exists but not driver or no ID');
            setLoading(false);
        }
    }, [myUserId, isDriver, user]);

    const fetchMyAssignments = async () => {
        try {
            // Fetch assignments with full request data and manager info
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

    // Load waste types
    useEffect(() => {
        fetchCompanyWasteTypes().then(types => {
            if (types && types.length > 0) setWasteTypes(types);
        });
    }, []);

    // Subscribe to messages
    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToMessages(async (msg, type) => {
            if (selectedChat && (msg.sender_id === selectedChat.id || msg.receiver_id === selectedChat.id)) {
                setChatMessages(prev => [...prev, msg]);
                // Mark as read if we're in this chat and received a message
                if (type === 'received') {
                    await markMessagesAsRead(selectedChat.id);
                    // Optimistically clear unread badge
                    setConversations(prev => prev.map(c =>
                        c.partnerId === selectedChat.id ? { ...c, unread: 0 } : c
                    ));
                }
            }
            await loadConversations();
        });
        return () => unsubscribe();
    }, [user, selectedChat]);

    // Load conversations when switching to messages view
    useEffect(() => {
        if (view === 'messages') {
            loadConversations();
            loadCompanyMembers();
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

    const loadCompanyMembers = async () => {
        const members = await fetchCompanyMembers();
        // Filter out self and only show managers and clients
        setCompanyMembers(members.filter(m => m.id !== user?.id && ['manager', 'client', 'admin', 'developer'].includes(m.role)));
    };

    const loadHistory = async () => {
        setLoadingHistory(true);
        try {
            // After migration 025: driver_assignments.request_id becomes NULL after processing
            // So we need to use processed_requests.driver_assignment_id to link them

            // 1. Get processed requests where this driver worked (either via proper flow or retroactive)
            const { data: processedRequests, error: processedError } = await supabase
                .from('processed_requests')
                .select('*')
                .eq('driver_id', myUserId)
                .is('deleted_at', null)
                .order('processed_at', { ascending: false })
                .limit(50);

            if (processedError) {
                console.error('[Driver History] processed_requests error:', processedError);
            }

            // 2. Get driver_assignments for these processed requests (to get timeline data)
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

            // 3. Also get in-progress assignments (delivered but not yet processed by manager)
            const { data: pendingAssignments, error: pendingError } = await supabase
                .from('driver_assignments')
                .select('*')
                .eq('driver_id', myUserId)
                .eq('status', 'delivered')
                .is('deleted_at', null)
                .order('delivered_at', { ascending: false })
                .limit(20);

            if (pendingError) {
                console.error('[Driver History] pending assignments error:', pendingError);
            }

            console.log('[Driver History] processed_requests:', processedRequests?.length || 0,
                'linked_assignments:', Object.keys(assignmentsMap).length,
                'pending_assignments:', pendingAssignments?.length || 0);

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
                    // Use assignment timestamps if available (driver actually worked), else use processed_at
                    assigned_at: assignment?.assigned_at || null,
                    picked_up_at: assignment?.picked_up_at || null,
                    delivered_at: assignment?.delivered_at || p.processed_at,
                    completed_at: assignment?.completed_at || p.processed_at,
                    processed_at: p.processed_at,
                    created_at: p.created_at,
                    // Include processed data for display
                    weight: p.weight,
                    weight_unit: p.weight_unit,
                    proof_url: p.proof_image_url,
                    notes: p.processing_note
                };
            });

            // Add pending assignments (delivered but not yet processed)
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

    const openChat = async (partner) => {
        setSelectedChat(partner);
        setShowNewChatModal(false);
        setLoadingMessages(true);
        const msgs = await fetchMessages(partner.id);
        setChatMessages(msgs);
        await markMessagesAsRead(partner.id);
        // Optimistically clear unread badge for this conversation immediately
        setConversations(prev => prev.map(c =>
            c.partnerId === partner.id ? { ...c, unread: 0 } : c
        ));
        // Then refresh from server to ensure sync
        await loadConversations();
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
            toast.error('Greška pri slanju poruke');
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

        // Add assignment status and manager info to each request
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
    }, [pickupRequests, isDriver, assignedRequestIds, loading, assignments, urgencyFilter]);

    // Get waste icon
    const getWasteIcon = (wasteTypeId) => {
        const wt = wasteTypes.find(w => w.id === wasteTypeId);
        return wt?.icon || '📦';
    };

    // Handle pickup (Step 1: Preuzeto od klijenta)
    const handlePickup = async (request) => {
        if (processing) return;
        if (!window.confirm(`Označiti "${request.waste_label}" kao PREUZETO od klijenta?`)) return;

        setProcessing(true);
        try {
            // Update assignment status to picked_up and store request data
            const { error } = await supabase
                .from('driver_assignments')
                .update({
                    status: 'picked_up',
                    picked_up_at: new Date().toISOString(),
                    // Store request data for history
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

    // Handle delivery (Step 2: Dostavljeno/Ispražnjeno)
    const handleDelivery = async (request) => {
        if (processing) return;
        if (!window.confirm(`Označiti "${request.waste_label}" kao DOSTAVLJENO/ISPRAŽNJENO?`)) return;

        setProcessing(true);
        try {
            // Update assignment status to delivered
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

    // Stats - counts before filter applied
    const allRequests = useMemo(() => {
        if (!pickupRequests) return [];
        let requests = pickupRequests.filter(r => r.status === 'pending');
        if (isDriver && assignedRequestIds.size > 0) {
            requests = requests.filter(r => assignedRequestIds.has(r.id));
        }
        return requests.map(r => ({
            ...r,
            currentUrgency: getCurrentUrgency(r.created_at, r.urgency)
        }));
    }, [pickupRequests, isDriver, assignedRequestIds]);

    const urgentCount = allRequests.filter(r => r.currentUrgency === '24h').length;
    const mediumCount = allRequests.filter(r => r.currentUrgency === '48h').length;
    const normalCount = allRequests.filter(r => r.currentUrgency === '72h').length;

    const handleLogout = async () => {
        if (window.confirm('Odjaviti se?')) {
            await logout();
            navigate('/');
        }
    };

    // Format time ago
    const formatTimeAgo = (dateString) => {
        if (!dateString) return '';
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

    // Get role label
    const getRoleLabel = (role) => {
        switch (role) {
            case 'manager': return 'Menadžer';
            case 'client': return 'Klijent';
            case 'admin': return 'Admin';
            case 'developer': return 'Developer';
            default: return role;
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
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                            urgencyFilter === '24h'
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
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                            urgencyFilter === '48h'
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
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                            urgencyFilter === '72h'
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
                    <div className="flex-1 relative">
                        {pendingRequests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4">
                                <Truck size={64} className="mb-4 opacity-50" />
                                <p className="text-xl font-medium text-center">
                                    {urgencyFilter !== 'all' ? 'Nema zahteva sa tim prioritetom' : isDriver ? 'Nemate dodeljenih zahteva' : 'Nema aktivnih zahteva'}
                                </p>
                                <p className="text-sm mt-2 text-center">
                                    {urgencyFilter !== 'all'
                                        ? 'Promenite filter ili prikažite sve zahteve'
                                        : isDriver
                                            ? 'Sačekajte da vam menadžer dodeli zahteve za preuzimanje'
                                            : 'Trenutno nema zahteva za prikaz'
                                    }
                                </p>
                            </div>
                        ) : (
                            <MapContainer
                                center={[44.8, 20.45]}
                                zoom={11}
                                preferCanvas={true}
                                wheelDebounceTime={20}
                                wheelPxPerZoomLevel={80}
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
                                            icon={createCustomIcon(item.currentUrgency, getWasteIcon(item.waste_type), item.assignmentStatus === 'picked_up')}
                                            urgencyLevel={item.currentUrgency}
                                        >
                                            <Popup>
                                                <div className="min-w-[240px]">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="font-semibold text-slate-900 text-base">{item.client_name}</p>
                                                        {item.assignmentStatus === 'picked_up' && (
                                                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-semibold">
                                                                Preuzeto
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-600 mb-1">{item.waste_label}</p>
                                                    {item.request_code && (
                                                        <p className="text-xs text-slate-400 font-mono mb-1">{item.request_code}</p>
                                                    )}
                                                    <p className="text-xs text-slate-500 leading-relaxed">{item.client_address}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-xs text-slate-500">Popunjenost:</span>
                                                        <FillLevelBar fillLevel={item.fill_level} />
                                                    </div>
                                                    <div className={`text-xs font-semibold mt-2 flex items-center gap-1 ${item.currentUrgency === '24h' ? 'text-red-600' : item.currentUrgency === '48h' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                        ⏱ <CountdownTimer createdAt={item.created_at} urgency={item.urgency} />
                                                    </div>
                                                    <div className="flex gap-2 mt-3">
                                                        <a
                                                            href={`https://www.google.com/maps/dir/?api=1&destination=${position[0]},${position[1]}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 text-center font-semibold shadow-sm"
                                                            style={{ color: '#fff' }}
                                                        >
                                                            Google Maps
                                                        </a>
                                                        <a
                                                            href={`https://waze.com/ul?ll=${position[0]},${position[1]}&navigate=yes`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex-1 px-3 py-2 bg-cyan-600 text-white text-xs rounded-lg hover:bg-cyan-700 text-center font-semibold shadow-sm"
                                                            style={{ color: '#fff' }}
                                                        >
                                                            Waze
                                                        </a>
                                                    </div>
                                                    {item.assignmentStatus === 'picked_up' ? (
                                                        <button
                                                            onClick={() => handleDelivery(item)}
                                                            disabled={processing}
                                                            className="w-full mt-3 px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-semibold flex items-center justify-center gap-2 shadow-sm"
                                                        >
                                                            <PackageCheck size={16} />
                                                            Dostavljeno
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handlePickup(item)}
                                                            disabled={processing}
                                                            className="w-full mt-3 px-3 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50 font-semibold flex items-center justify-center gap-2 shadow-sm"
                                                        >
                                                            <Package size={16} />
                                                            Preuzeto od klijenta
                                                        </button>
                                                    )}
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
                                    {urgencyFilter !== 'all' ? 'Nema zahteva sa tim prioritetom' : isDriver ? 'Nemate dodeljenih zahteva' : 'Nema aktivnih zahteva'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-w-2xl mx-auto">
                                {pendingRequests.map(request => (
                                    <div
                                        key={request.id}
                                        className={`bg-white rounded-xl border-l-4 shadow-sm overflow-hidden ${
                                            request.assignmentStatus === 'picked_up' ? 'border-l-amber-500' :
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
                                                        {request.request_code && (
                                                            <p className="text-xs text-slate-400 font-mono">{request.request_code}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    {request.assignmentStatus === 'picked_up' && (
                                                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                                                            Preuzeto
                                                        </span>
                                                    )}
                                                    <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                                                        request.currentUrgency === '24h' ? 'bg-red-100 text-red-700' :
                                                        request.currentUrgency === '48h' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                        <CountdownTimer createdAt={request.created_at} urgency={request.urgency} />
                                                    </div>
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

                                            {/* Manager who assigned this request */}
                                            {request.assignedByName && (
                                                <div className="mb-3 p-2 bg-slate-50 rounded-lg flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                                        <User size={14} className="text-slate-400" />
                                                        <span>Dodelio: <strong>{request.assignedByName}</strong></span>
                                                    </div>
                                                    {request.assignedByPhone && (
                                                        <a
                                                            href={`tel:${request.assignedByPhone}`}
                                                            className="flex items-center gap-1 text-emerald-600 text-sm font-medium hover:text-emerald-700"
                                                        >
                                                            <Phone size={14} /> Pozovi
                                                        </a>
                                                    )}
                                                </div>
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
                                                            <Navigation size={16} /> Google
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
                                                        <AlertCircle size={16} /> Nema lokacije
                                                    </div>
                                                )}
                                                {request.assignmentStatus === 'picked_up' ? (
                                                    <button
                                                        onClick={() => handleDelivery(request)}
                                                        disabled={processing}
                                                        className="px-4 py-2.5 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 disabled:opacity-50 font-medium flex items-center gap-2"
                                                    >
                                                        <PackageCheck size={16} />
                                                        <span className="hidden sm:inline">Dostavljeno</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handlePickup(request)}
                                                        disabled={processing}
                                                        className="px-4 py-2.5 bg-amber-600 text-white text-sm rounded-xl hover:bg-amber-700 disabled:opacity-50 font-medium flex items-center gap-2"
                                                    >
                                                        <Package size={16} />
                                                        <span className="hidden sm:inline">Preuzeto</span>
                                                    </button>
                                                )}
                                            </div>
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
                                <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                                    <div>
                                        <h2 className="font-bold text-slate-800">Poruke</h2>
                                        <p className="text-sm text-slate-500">Razgovori sa menadžerima i klijentima</p>
                                    </div>
                                    <button
                                        onClick={() => setShowNewChatModal(true)}
                                        className="px-3 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2 text-sm"
                                    >
                                        <Plus size={16} /> Nova poruka
                                    </button>
                                </div>
                                {conversations.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                        <MessageCircle size={48} className="mb-3 opacity-50" />
                                        <p className="text-sm">Nemate poruka</p>
                                        <button
                                            onClick={() => setShowNewChatModal(true)}
                                            className="mt-3 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                                        >
                                            Započni razgovor
                                        </button>
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
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-medium text-slate-800 truncate">{conv.partner.name}</p>
                                                            <span className="text-xs text-slate-400">({getRoleLabel(conv.partner.role)})</span>
                                                        </div>
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
                                        <p className="text-xs text-slate-500">{getRoleLabel(selectedChat.role)}</p>
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

                        {/* New Chat Modal */}
                        {showNewChatModal && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
                                    <div className="p-4 border-b flex items-center justify-between">
                                        <h3 className="font-bold text-slate-800">Nova poruka</h3>
                                        <button
                                            onClick={() => setShowNewChatModal(false)}
                                            className="p-2 hover:bg-slate-100 rounded-lg"
                                        >
                                            <ArrowLeft size={20} />
                                        </button>
                                    </div>
                                    <div className="overflow-y-auto max-h-96">
                                        {companyMembers.length === 0 ? (
                                            <div className="p-8 text-center text-slate-400">
                                                <Users size={32} className="mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">Nema dostupnih korisnika</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y">
                                                {companyMembers.map(member => (
                                                    <button
                                                        key={member.id}
                                                        onClick={() => openChat(member)}
                                                        className="w-full p-4 hover:bg-slate-50 text-left flex items-center gap-3"
                                                    >
                                                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                                                            <User size={20} className="text-slate-500" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-slate-800">{member.name}</p>
                                                            <p className="text-xs text-slate-500">{getRoleLabel(member.role)}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* History View */}
                {view === 'history' && (
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-4 border-b bg-white sticky top-0">
                            <h2 className="font-bold text-slate-800">Istorija dostava</h2>
                            <p className="text-sm text-slate-500">Poslednjih 50 dostavljenih zahteva - klikni za detalje</p>
                        </div>
                        {loadingHistory ? (
                            <div className="flex items-center justify-center h-64">
                                <RefreshCw className="animate-spin text-emerald-600" size={32} />
                            </div>
                        ) : historyRequests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                <History size={48} className="mb-3 opacity-50" />
                                <p className="text-lg font-medium">Nema završenih dostava</p>
                                <p className="text-sm">Vaša istorija će se pojaviti ovde</p>
                            </div>
                        ) : (
                            <div className="p-4 space-y-3 max-w-2xl mx-auto">
                                {historyRequests.map(item => (
                                    <HistoryCard key={item.id} item={item} wasteTypes={wasteTypes} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

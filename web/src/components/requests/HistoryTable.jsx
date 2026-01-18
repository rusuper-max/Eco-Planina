import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { History, Search, ArrowUpDown, ArrowUp, ArrowDown, Calendar, CheckCircle2, XCircle, Image, Edit3, Trash2, AlertTriangle, Download, User, Truck, Clock, ChevronDown, ChevronUp, PlayCircle, Package, MapPin, UserCheck } from 'lucide-react';
import { Modal, EmptyState, RecycleLoader } from '../common';
import ProofsModal from '../common/ProofsModal';
import { EditProcessedRequestModal } from './EditProcessedRequestModal';
import { supabase } from '../../config/supabase';

const DEFAULT_WASTE_TYPES = [
    { id: 'cardboard', label: 'Karton', icon: '📦' },
    { id: 'plastic', label: 'Plastika', icon: '♻️' },
    { id: 'glass', label: 'Staklo', icon: '🍾' },
];

/**
 * History Table (Processed/Rejected Requests)
 * Enhanced version for company_admin with driver/manager info and timeline
 */
export const HistoryTable = ({ requests, wasteTypes = DEFAULT_WASTE_TYPES, onEdit, onDelete, showDetailedView = false, drivers = [], onAssignDriverToProcessed, page = 1, totalPages = 1, totalCount = 0, onPageChange, loading = false }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [periodFilter, setPeriodFilter] = useState('all'); // all, month, week
    const [statusFilter, setStatusFilter] = useState('all'); // all, completed, rejected
    const [sortBy, setSortBy] = useState('processed_at');
    const [sortDir, setSortDir] = useState('desc');
    const [viewingProof, setViewingProof] = useState(null);
    const [editingRequest, setEditingRequest] = useState(null);
    const [deletingRequest, setDeletingRequest] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [expandedRow, setExpandedRow] = useState(null);
    const [driverAssignments, setDriverAssignments] = useState({});
    const [activityLogs, setActivityLogs] = useState({});
    const [loadingAssignments, setLoadingAssignments] = useState(false);

    // Fetch driver assignments for proof data (always needed for ProofsModal)
    useEffect(() => {
        if (requests?.length > 0) {
            fetchDriverAssignments();
        }
        // Fetch activity logs only for detailed view
        if (showDetailedView && requests?.length > 0) {
            fetchActivityLogs();
        }
    }, [showDetailedView, requests]);

    const fetchDriverAssignments = async () => {
        if (!requests?.length) return;
        setLoadingAssignments(true);
        try {
            // Get driver_assignment_ids from processed_requests (direct link after migration 025)
            const assignmentIds = requests
                .map(r => r.driver_assignment_id)
                .filter(Boolean);

            console.log('[HistoryTable] Looking for assignments by driver_assignment_ids:', assignmentIds);

            if (assignmentIds.length === 0) {
                console.log('[HistoryTable] No driver_assignment_ids found in processed_requests');
                setLoadingAssignments(false);
                return;
            }

            // Fetch assignments directly by their ID
            const { data, error } = await supabase
                .from('driver_assignments')
                .select(`
                    id,
                    request_id,
                    status,
                    assigned_at,
                    picked_up_at,
                    delivered_at,
                    completed_at,
                    assigned_by,
                    driver:driver_id(id, name, phone),
                    client_name,
                    pickup_proof_url,
                    delivery_proof_url,
                    driver_weight,
                    driver_weight_unit
                `)
                .in('id', assignmentIds);

            if (error) throw error;

            console.log('[HistoryTable] Fetched driver_assignments:', data?.length, 'records');
            if (data?.length > 0) {
                console.log('[HistoryTable] Sample assignment:', {
                    id: data[0].id,
                    picked_up_at: data[0].picked_up_at,
                    delivered_at: data[0].delivered_at,
                    driver_name: data[0].driver?.name
                });
            }

            // Map by assignment ID for easy lookup from processed_request.driver_assignment_id
            const assignmentMap = {};
            (data || []).forEach(a => {
                assignmentMap[a.id] = a;
            });

            console.log('[HistoryTable] Assignment map has', Object.keys(assignmentMap).length, 'entries');
            setDriverAssignments(assignmentMap);
        } catch (err) {
            console.error('Error fetching driver assignments:', err);
        } finally {
            setLoadingAssignments(false);
        }
    };

    // Fetch activity logs for requests to get full history (who assigned, driver changes, etc.)
    const fetchActivityLogs = async () => {
        if (!requests?.length) return;
        try {
            const requestIds = requests.map(r => r.request_id || r.original_request_id).filter(Boolean);
            if (requestIds.length === 0) return;

            // Query 1: Direct entity_id matches (for create, process, etc.)
            const { data: directLogs, error: directError } = await supabase
                .from('activity_logs')
                .select('*')
                .in('entity_id', requestIds)
                .in('action', ['create', 'process'])
                .order('created_at', { ascending: true });

            if (directError) throw directError;

            // Query 2: Driver assignment logs (entity_type = 'driver_assignment') 
            // where metadata->request_id matches our request IDs
            // Also get picked_up/delivered which are logged with entity_type = 'driver_assignment'
            const { data: assignmentLogs, error: assignmentError } = await supabase
                .from('activity_logs')
                .select('*')
                .eq('entity_type', 'driver_assignment')
                .in('action', ['assign', 'picked_up', 'delivered'])
                .order('created_at', { ascending: true });

            if (assignmentError) throw assignmentError;

            // Filter assignment logs to only those matching our request IDs (via metadata)
            const filteredAssignmentLogs = (assignmentLogs || []).filter(log => {
                const metadataRequestId = log.metadata?.request_id;
                return metadataRequestId && requestIds.includes(metadataRequestId);
            });

            // Combine all logs
            const allLogs = [...(directLogs || []), ...filteredAssignmentLogs];

            // Group by request_id (use metadata.request_id for assignment logs)
            const logsMap = {};
            allLogs.forEach(log => {
                const requestId = log.entity_type === 'driver_assignment'
                    ? log.metadata?.request_id
                    : log.entity_id;
                if (!requestId) return;
                if (!logsMap[requestId]) {
                    logsMap[requestId] = [];
                }
                logsMap[requestId].push(log);
            });

            // Sort each group by created_at
            Object.keys(logsMap).forEach(key => {
                logsMap[key].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            });

            setActivityLogs(logsMap);
        } catch (err) {
            console.error('Error fetching activity logs:', err);
        }
    };

    // Calculate time difference in human readable format
    const formatDuration = (start, end) => {
        if (!start || !end) return null;
        const diff = new Date(end) - new Date(start);
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ${minutes % 60}min`;
        const days = Math.floor(hours / 24);
        return `${days}d ${hours % 24}h`;
    };

    // Horizontal Timeline component for a single request
    const TimelineView = ({ assignment, request, logs = [] }) => {
        // Format time for display
        const formatTime = (date) => {
            if (!date) return '-';
            return new Date(date).toLocaleString('sr-RS', {
                day: 'numeric', month: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        };

        // Find who assigned the driver from activity logs
        const getAssignerName = () => {
            const assignLog = logs.find(l => l.action === 'assign');
            if (assignLog) {
                return assignLog.user_name || 'Menadžer';
            }
            return null;
        };

        // Build timeline steps based on available data
        const buildSteps = () => {
            const steps = [];
            const assignerName = getAssignerName();

            // Check if driver was assigned retroactively (after processing, without actually working)
            // Retroactive = driver_id is set on processed_request BUT:
            //   - No assignment record exists at all (driver was manually entered after processing)
            // NOT retroactive if:
            //   - Driver has assignment with picked_up_at or delivered_at (driver actually worked)
            //   - Assignment exists for the same driver (even without pickup/delivery - they were assigned through proper flow)
            const driverActuallyWorked = assignment?.picked_up_at || assignment?.delivered_at;
            const hasValidAssignment = assignment && assignment.driver?.id;
            const isRetroactiveDriver = request.driver_id && !driverActuallyWorked && !hasValidAssignment;
            const retroactiveDriverName = request.driver_name;

            // 1. Created - always show if we have created_at
            if (request.created_at) {
                steps.push({
                    key: 'created',
                    label: 'Kreiran',
                    actor: request.client_name || 'Klijent',
                    time: request.created_at,
                    icon: Package,
                    color: 'bg-blue-500',
                    bgColor: 'bg-blue-50',
                    textColor: 'text-blue-700'
                });
            }

            // 2. Assigned to driver (show who assigned + to whom) - only if driver actually worked
            if (assignment?.assigned_at && (assignment?.picked_up_at || assignment?.delivered_at)) {
                const driverName = assignment.driver?.name || request.driver_name || 'Vozač';
                steps.push({
                    key: 'assigned',
                    label: 'Dodeljen',
                    actor: driverName,
                    subActor: assignerName ? `od ${assignerName}` : null,
                    time: assignment.assigned_at,
                    icon: User,
                    color: 'bg-amber-500',
                    bgColor: 'bg-amber-50',
                    textColor: 'text-amber-700'
                });
            }

            // 3. Picked up by driver
            if (assignment?.picked_up_at) {
                steps.push({
                    key: 'picked_up',
                    label: 'Preuzeto',
                    actor: assignment.driver?.name || 'Vozač',
                    time: assignment.picked_up_at,
                    icon: MapPin,
                    color: 'bg-cyan-500',
                    bgColor: 'bg-cyan-50',
                    textColor: 'text-cyan-700'
                });
            }

            // 4. Delivered by driver
            if (assignment?.delivered_at) {
                steps.push({
                    key: 'delivered',
                    label: 'Dovezeno',
                    actor: assignment.driver?.name || 'Vozač',
                    time: assignment.delivered_at,
                    icon: Truck,
                    color: 'bg-purple-500',
                    bgColor: 'bg-purple-50',
                    textColor: 'text-purple-700'
                });
            }

            // 5. Processed/Rejected by manager
            if (request.processed_at) {
                const isRejected = request.status === 'rejected';
                steps.push({
                    key: 'processed',
                    label: isRejected ? 'Odbijeno' : 'Obrađeno',
                    actor: request.processed_by_name || 'Menadžer',
                    time: request.processed_at,
                    icon: isRejected ? XCircle : CheckCircle2,
                    color: isRejected ? 'bg-red-500' : 'bg-emerald-500',
                    bgColor: isRejected ? 'bg-red-50' : 'bg-emerald-50',
                    textColor: isRejected ? 'text-red-700' : 'text-emerald-700'
                });
            }

            // 6. Retroactive driver assignment (after processing)
            if (isRetroactiveDriver && retroactiveDriverName) {
                steps.push({
                    key: 'retroactive_driver',
                    label: 'Naknadno vozač',
                    actor: retroactiveDriverName,
                    subActor: 'evidentiran',
                    time: null, // No specific time
                    icon: UserCheck,
                    color: 'bg-violet-500',
                    bgColor: 'bg-violet-50',
                    textColor: 'text-violet-700'
                });
            }

            return steps;
        };

        const steps = buildSteps();

        if (steps.length === 0) {
            return (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-500 text-sm">
                    Nema dodatnih podataka za ovaj zahtev
                </div>
            );
        }

        return (
            <div className="p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl">
                {/* Horizontal Timeline */}
                <div className="relative overflow-x-auto pb-2">
                    {/* Steps container */}
                    <div className="flex items-start min-w-max">
                        {steps.map((step, idx) => {
                            const StepIcon = step.icon;

                            return (
                                <div key={step.key} className="flex items-start">
                                    {/* Step box */}
                                    <div className="flex flex-col items-center" style={{ minWidth: '110px' }}>
                                        {/* Icon circle */}
                                        <div className={`w-10 h-10 rounded-full ${step.color} flex items-center justify-center shadow-md z-10 border-2 border-white`}>
                                            <StepIcon size={18} className="text-white" />
                                        </div>

                                        {/* Label and info */}
                                        <div className={`mt-2 px-3 py-1.5 rounded-lg ${step.bgColor} text-center`}>
                                            <p className={`text-xs font-bold ${step.textColor}`}>{step.label}</p>
                                            <p className="text-[11px] text-slate-700 font-medium truncate max-w-[100px]" title={step.actor}>{step.actor}</p>
                                            {step.subActor && (
                                                <p className="text-[9px] text-slate-500 italic">{step.subActor}</p>
                                            )}
                                            {step.time && (
                                                <p className="text-[10px] text-slate-400 whitespace-nowrap mt-0.5">{formatTime(step.time)}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Arrow connector */}
                                    {idx < steps.length - 1 && (
                                        <div className="flex items-center h-10 px-1">
                                            <div className="w-8 h-0.5 bg-emerald-400" />
                                            <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-emerald-400" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Summary footer */}
                {request.created_at && request.processed_at && (
                    <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3 text-xs">
                            {request.weight && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium whitespace-nowrap">
                                    {request.weight} {request.weight_unit || 'kg'}
                                </span>
                            )}
                            {(assignment?.driver?.name || request.driver_name) && (
                                <span className="text-slate-500 flex items-center gap-1">
                                    <Truck size={12} />
                                    {assignment?.driver?.name || request.driver_name}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock size={12} />
                            <span>Ukupno: <span className="font-bold text-emerald-600">{formatDuration(request.created_at, request.processed_at)}</span></span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (!requests?.length) return <EmptyState icon={History} title="Nema istorije" desc="Obrađeni zahtevi će se prikazati ovde" />;

    // Filter by period helper
    const filterByPeriod = (req) => {
        if (periodFilter === 'all') return true;
        const now = new Date();
        const cutoff = new Date();
        if (periodFilter === 'month') cutoff.setMonth(now.getMonth() - 1);
        if (periodFilter === 'week') cutoff.setDate(now.getDate() - 7);
        return new Date(req.processed_at) >= cutoff;
    };

    // Filter requests
    let filtered = requests.filter(req => {
        // Period filter
        if (!filterByPeriod(req)) return false;
        // Status filter
        if (statusFilter !== 'all') {
            const reqStatus = req.status || 'completed'; // Default to completed for old records
            if (statusFilter !== reqStatus) return false;
        }
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesName = req.client_name?.toLowerCase().includes(query);
            const matchesType = req.waste_label?.toLowerCase().includes(query);
            const matchesCode = req.request_code?.toLowerCase().includes(query);
            if (!matchesName && !matchesType && !matchesCode) return false;
        }
        if (filterType !== 'all' && req.waste_type !== filterType) return false;
        return true;
    });

    // Sort
    filtered = [...filtered].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
            case 'processed_at':
                comparison = new Date(a.processed_at) - new Date(b.processed_at);
                break;
            case 'created_at':
                comparison = new Date(a.created_at) - new Date(b.created_at);
                break;
            case 'client':
                comparison = (a.client_name || '').localeCompare(b.client_name || '');
                break;
            default:
                comparison = 0;
        }
        return sortDir === 'asc' ? comparison : -comparison;
    });

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ column }) => {
        if (sortBy !== column) return <ArrowUpDown size={14} className="text-slate-300" />;
        return sortDir === 'asc' ? <ArrowUp size={14} className="text-emerald-600" /> : <ArrowDown size={14} className="text-emerald-600" />;
    };

    const formatDateTime = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        return `${d.toLocaleDateString('sr-RS')} ${d.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}`;
    };

    return (
        <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 md:max-w-xs">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                    <input
                        type="text"
                        placeholder="Pretraži..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none text-sm placeholder:text-slate-400"
                    />
                </div>
                <select
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm bg-white"
                >
                    <option value="all">Svi periodi</option>
                    <option value="month">Poslednjih mesec dana</option>
                    <option value="week">Poslednjih 7 dana</option>
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm bg-white"
                >
                    <option value="all">Svi statusi</option>
                    <option value="completed">✅ Obrađeni</option>
                    <option value="rejected">❌ Odbijeni</option>
                </select>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm bg-white"
                >
                    <option value="all">Sve vrste</option>
                    {wasteTypes.map(w => <option key={w.id} value={w.id}>{w.icon} {w.label}</option>)}
                </select>
            </div>

            {/* Results count */}
            <div className="text-sm text-slate-500">
                Prikazano {filtered.length} od {requests.length} zahteva
                {(searchQuery || filterType !== 'all' || periodFilter !== 'all' || statusFilter !== 'all') && (
                    <button onClick={() => { setSearchQuery(''); setFilterType('all'); setPeriodFilter('all'); setStatusFilter('all'); }} className="ml-2 text-emerald-600 hover:text-emerald-700">
                        Obriši filtere
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[800px]">
                        <thead className="bg-slate-50 text-slate-500 border-b">
                            <tr>
                                <th className="px-2 md:px-3 py-3 text-left text-xs">ID</th>
                                <th className="px-3 md:px-4 py-3 text-left">
                                    <button onClick={() => handleSort('client')} className="flex items-center gap-1.5 hover:text-slate-700">
                                        Klijent <SortIcon column="client" />
                                    </button>
                                </th>
                                <th className="px-3 md:px-4 py-3 text-left">Tip</th>
                                <th className="hidden md:table-cell px-4 py-3 text-left">
                                    <button onClick={() => handleSort('created_at')} className="flex items-center gap-1.5 hover:text-slate-700">
                                        Podneto <SortIcon column="created_at" />
                                    </button>
                                </th>
                                <th className="px-3 md:px-4 py-3 text-left">
                                    <button onClick={() => handleSort('processed_at')} className="flex items-center gap-1.5 hover:text-slate-700">
                                        Obrađeno <SortIcon column="processed_at" />
                                    </button>
                                </th>
                                <th className="hidden sm:table-cell px-4 py-3 text-center">Težina</th>
                                <th className="hidden xs:table-cell px-2 py-3 text-center w-16">Dokazi</th>
                                <th className="hidden md:table-cell px-4 py-3 text-left">Vozač</th>
                                <th className="px-2 py-3 text-center w-20">Akcije</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Nema rezultata za ovu pretragu</td></tr>
                            ) : filtered.map((req, idx) => {
                                // Find assignment by driver_assignment_id (direct link stored in processed_requests after migration 025)
                                const assignment = driverAssignments[req.driver_assignment_id];
                                const isExpanded = expandedRow === req.id;
                                return (
                                    <React.Fragment key={req.id || idx}>
                                        <tr className={`hover:bg-slate-50 ${isExpanded ? 'bg-slate-50' : ''}`}>
                                            <td className="px-2 md:px-3 py-3">
                                                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                    {req.request_code || '-'}
                                                </span>
                                            </td>
                                            <td className="px-3 md:px-4 py-3">
                                                <div className="font-medium text-sm">{req.client_name}</div>
                                                <div className="text-xs text-slate-500 md:hidden mt-0.5">{formatDateTime(req.created_at)}</div>
                                            </td>
                                            <td className="px-3 md:px-4 py-3">
                                                <span className="text-lg">{wasteTypes.find(w => w.id === req.waste_type)?.icon || '📦'}</span>
                                                <span className="hidden sm:inline ml-1">{req.waste_label}</span>
                                            </td>
                                            <td className="hidden md:table-cell px-4 py-3">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Calendar size={14} />
                                                    <span>{formatDateTime(req.created_at)}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 md:px-4 py-3">
                                                {req.status === 'rejected' ? (
                                                    <div className="flex items-center gap-2 text-red-600">
                                                        <XCircle size={14} />
                                                        <div>
                                                            <span className="text-xs md:text-sm">{formatDateTime(req.processed_at)}</span>
                                                            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded">ODBIJENO</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-emerald-600">
                                                        <CheckCircle2 size={14} />
                                                        <span className="text-xs md:text-sm">{formatDateTime(req.processed_at)}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="hidden sm:table-cell px-4 py-3 text-center">
                                                {req.weight ? (
                                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 whitespace-nowrap">
                                                        {req.weight} {req.weight_unit || 'kg'}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="hidden xs:table-cell px-2 py-3">
                                                <div className="flex items-center justify-center">
                                                    {/* Check for ANY proof: pickup, delivery, or processing */}
                                                    {(req.proof_image_url || assignment?.pickup_proof_url || assignment?.delivery_proof_url) ? (
                                                        <button
                                                            onClick={() => setViewingProof(req)}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                            title="Pogledaj dokaze"
                                                        >
                                                            <Image size={18} />
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-300"><Image size={18} /></span>
                                                    )}
                                                </div>
                                            </td>
                                            {/* Driver column - visible for all users */}
                                            <td className="hidden md:table-cell px-4 py-3">
                                                {/* First try driver_name from processed_requests, fallback to assignment lookup */}
                                                {req.driver_name ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center">
                                                            <Truck size={14} className="text-amber-600" />
                                                        </div>
                                                        <span className="text-sm text-slate-700">{req.driver_name}</span>
                                                    </div>
                                                ) : loadingAssignments ? (
                                                    <RecycleLoader size={16} className="animate-spin text-emerald-500" />
                                                ) : assignment?.driver ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center">
                                                            <Truck size={14} className="text-amber-600" />
                                                        </div>
                                                        <span className="text-sm text-slate-700">{assignment.driver.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-2 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    {/* Expand button for detailed view */}
                                                    {showDetailedView && (
                                                        <button
                                                            onClick={() => setExpandedRow(isExpanded ? null : req.id)}
                                                            className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                                                            title="Prikaži timeline"
                                                        >
                                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                        </button>
                                                    )}
                                                    {/* On very small screens, show proof button in actions if dokaz column is hidden */}
                                                    <button
                                                        onClick={() => req.proof_image_url && setViewingProof(req)}
                                                        className={`xs:hidden p-1.5 rounded-lg ${req.proof_image_url ? 'text-blue-600 hover:bg-blue-50' : 'text-slate-300 cursor-default'}`}
                                                        title={req.proof_image_url ? "Pogledaj dokaz" : "Nema dokaza"}
                                                    >
                                                        <Image size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingRequest(req)}
                                                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"
                                                        title="Dopuni podatke"
                                                    >
                                                        <Edit3 size={18} />
                                                    </button>
                                                    {onDelete && (
                                                        <button
                                                            onClick={() => setDeletingRequest(req)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                                            title="Obriši iz istorije"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Expanded row with timeline */}
                                        {showDetailedView && isExpanded && (
                                            <tr>
                                                <td colSpan={9} className="px-4 py-3 bg-white border-t">
                                                    <TimelineView
                                                        assignment={assignment}
                                                        request={req}
                                                        logs={activityLogs[req.request_id] || []}
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
                    <div className="text-sm text-slate-500">
                        Prikazano {(page - 1) * 10 + 1} - {Math.min(page * 10, totalCount)} od {totalCount} zahteva
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onPageChange(page - 1)}
                            disabled={page <= 1 || loading}
                            className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-1"
                        >
                            <ChevronDown className="rotate-90" size={16} />
                            Prethodna
                        </button>
                        <div className="flex items-center gap-1 px-2">
                            <span className="text-sm font-medium text-slate-700">
                                {page}
                            </span>
                            <span className="text-sm text-slate-400">/</span>
                            <span className="text-sm text-slate-500">
                                {totalPages}
                            </span>
                        </div>
                        <button
                            onClick={() => onPageChange(page + 1)}
                            disabled={page >= totalPages || loading}
                            className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-1"
                        >
                            Sledeća
                            <ChevronDown className="-rotate-90" size={16} />
                        </button>
                    </div>
                </div>
            )}



            {/* Proofs Modal (Multi-stage) */}
            {viewingProof && (
                <ProofsModal
                    open={!!viewingProof}
                    onClose={() => setViewingProof(null)}
                    requestCode={viewingProof.request_code}
                    clientName={viewingProof.client_name}
                    // Pickup proof (from driver assignments)
                    pickupProofUrl={driverAssignments[viewingProof.driver_assignment_id]?.pickup_proof_url}
                    pickupDriverName={viewingProof.driver_name}
                    pickupAt={driverAssignments[viewingProof.driver_assignment_id]?.picked_up_at}
                    // Delivery proof (from driver assignments)
                    deliveryProofUrl={driverAssignments[viewingProof.driver_assignment_id]?.delivery_proof_url}
                    deliveryDriverName={viewingProof.driver_name}
                    deliveryAt={driverAssignments[viewingProof.driver_assignment_id]?.delivered_at}
                    driverWeight={driverAssignments[viewingProof.driver_assignment_id]?.driver_weight}
                    driverWeightUnit={driverAssignments[viewingProof.driver_assignment_id]?.driver_weight_unit}
                    // Processing proof (from processed_requests)
                    processingProofUrl={viewingProof.proof_image_url}
                    processingManagerName={viewingProof.processed_by_name}
                    processedAt={viewingProof.processed_at}
                    processedWeight={viewingProof.weight}
                    processedWeightUnit={viewingProof.weight_unit}
                />
            )}

            {/* Edit Processed Request Modal */}
            {editingRequest && (
                <EditProcessedRequestModal
                    request={editingRequest}
                    wasteTypes={wasteTypes}
                    onSave={async (updates) => {
                        if (onEdit) {
                            await onEdit(editingRequest.id, updates);
                        }
                        setEditingRequest(null);
                    }}
                    onClose={() => setEditingRequest(null)}
                    drivers={drivers}
                    currentDriverId={driverAssignments[editingRequest.driver_assignment_id]?.driver?.id || editingRequest.driver_id || null}
                    onAssignDriver={onAssignDriverToProcessed}
                    driverAssignment={driverAssignments[editingRequest.driver_assignment_id]}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deletingRequest && (
                <Modal open={!!deletingRequest} onClose={() => setDeletingRequest(null)} title="Obriši iz istorije">
                    <div className="space-y-4">
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <p className="font-medium text-red-800">Obriši zahtev?</p>
                                    <p className="text-sm text-red-600">Ova akcija se ne može poništiti.</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl">
                            <p className="text-sm text-slate-500">Klijent</p>
                            <p className="font-medium">{deletingRequest.client_name}</p>
                            <p className="text-xs text-slate-400 mt-1">{deletingRequest.waste_label} • {formatDateTime(deletingRequest.processed_at)}</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeletingRequest(null)}
                                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium"
                            >
                                Odustani
                            </button>
                            <button
                                onClick={async () => {
                                    setIsDeleting(true);
                                    try {
                                        await onDelete(deletingRequest.id);
                                        setDeletingRequest(null);
                                    } catch (err) {
                                        toast.error('Greška: ' + err.message);
                                    } finally {
                                        setIsDeleting(false);
                                    }
                                }}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isDeleting ? <RecycleLoader size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                Obriši
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default HistoryTable;

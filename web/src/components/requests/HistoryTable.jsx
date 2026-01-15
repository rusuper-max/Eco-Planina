import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { History, Search, ArrowUpDown, ArrowUp, ArrowDown, Calendar, CheckCircle2, Image, Edit3, Trash2, AlertTriangle, Loader2, Download, User, Truck, Clock, ChevronDown, ChevronUp, PlayCircle, Package, MapPin, UserCheck } from 'lucide-react';
import { Modal, EmptyState } from '../common';
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
export const HistoryTable = ({ requests, wasteTypes = DEFAULT_WASTE_TYPES, onEdit, onDelete, showDetailedView = false, drivers = [], onAssignDriverToProcessed }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [sortBy, setSortBy] = useState('processed_at');
    const [sortDir, setSortDir] = useState('desc');
    const [viewingProof, setViewingProof] = useState(null);
    const [editingRequest, setEditingRequest] = useState(null);
    const [deletingRequest, setDeletingRequest] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [expandedRow, setExpandedRow] = useState(null);
    const [driverAssignments, setDriverAssignments] = useState({});
    const [loadingAssignments, setLoadingAssignments] = useState(false);

    // Fetch driver assignments for detailed view
    useEffect(() => {
        if (showDetailedView && requests?.length > 0) {
            fetchDriverAssignments();
        }
    }, [showDetailedView, requests]);

    const fetchDriverAssignments = async () => {
        if (!requests?.length) return;
        setLoadingAssignments(true);
        try {
            // Get request IDs
            const requestIds = requests.map(r => r.request_id).filter(Boolean);
            if (requestIds.length === 0) {
                setLoadingAssignments(false);
                return;
            }

            const { data, error } = await supabase
                .from('driver_assignments')
                .select(`
                    id,
                    request_id,
                    status,
                    assigned_at,
                    started_at,
                    picked_up_at,
                    delivered_at,
                    completed_at,
                    driver:driver_id(id, name, phone)
                `)
                .in('request_id', requestIds);

            if (error) throw error;

            // Map by request_id for quick lookup
            const assignmentMap = {};
            (data || []).forEach(a => {
                assignmentMap[a.request_id] = a;
            });
            setDriverAssignments(assignmentMap);
        } catch (err) {
            console.error('Error fetching driver assignments:', err);
        } finally {
            setLoadingAssignments(false);
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

    // Timeline component for a single request
    const TimelineView = ({ assignment, request }) => {
        if (!assignment && !request.processed_by_name) {
            return (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-500 text-sm">
                    Nema dodatnih podataka za ovaj zahtev
                </div>
            );
        }

        // Show processed by info even if no driver assignment
        if (!assignment) {
            return (
                <div className="p-4 bg-slate-50 rounded-xl">
                    {request.processed_by_name && (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                <UserCheck className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Obradio menadžer</p>
                                <p className="font-medium text-slate-800">{request.processed_by_name}</p>
                            </div>
                            {request.processed_at && (
                                <div className="ml-auto text-right">
                                    <p className="text-xs text-slate-400">Vreme obrade</p>
                                    <p className="text-sm text-slate-600">
                                        {new Date(request.processed_at).toLocaleString('sr-RS', {
                                            day: 'numeric', month: 'numeric', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        const steps = [
            { key: 'created', label: 'Kreiran zahtev', time: request.created_at, icon: Package },
            { key: 'assigned', label: 'Dodeljen vozaču', time: assignment.assigned_at, icon: User },
            { key: 'started', label: 'Vozač krenuo', time: assignment.started_at, icon: PlayCircle },
            { key: 'picked_up', label: 'Preuzeto', time: assignment.picked_up_at, icon: MapPin },
            { key: 'delivered', label: 'Isporučeno', time: assignment.delivered_at, icon: Truck },
            { key: 'completed', label: 'Završeno', time: assignment.completed_at || request.processed_at, icon: CheckCircle2 },
        ].filter(s => s.time);

        return (
            <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex flex-wrap items-center gap-3 mb-4 pb-3 border-b border-slate-200">
                    {/* Driver info */}
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                        <Truck className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Vozač</p>
                        <p className="font-medium text-slate-800">{assignment.driver?.name || 'Nepoznat vozač'}</p>
                    </div>

                    {/* Processed by info */}
                    {request.processed_by_name && (
                        <>
                            <div className="hidden sm:block w-px h-10 bg-slate-200 mx-2" />
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                <UserCheck className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Obradio</p>
                                <p className="font-medium text-slate-800">{request.processed_by_name}</p>
                            </div>
                        </>
                    )}

                    {request.created_at && request.processed_at && (
                        <div className="ml-auto text-right">
                            <p className="text-xs text-slate-400">Ukupno trajanje</p>
                            <p className="font-bold text-emerald-600">{formatDuration(request.created_at, request.processed_at)}</p>
                        </div>
                    )}
                </div>

                {/* Timeline */}
                <div className="relative pl-6">
                    <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200" />
                    {steps.map((step, idx) => {
                        const StepIcon = step.icon;
                        const nextStep = steps[idx + 1];
                        const duration = nextStep ? formatDuration(step.time, nextStep.time) : null;

                        return (
                            <div key={step.key} className="relative pb-4 last:pb-0">
                                <div className="absolute -left-4 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <StepIcon size={14} className="text-slate-400" />
                                        <span className="text-sm font-medium text-slate-700">{step.label}</span>
                                    </div>
                                    <span className="text-xs text-slate-500">
                                        {new Date(step.time).toLocaleString('sr-RS', {
                                            day: 'numeric', month: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                                {duration && (
                                    <div className="ml-6 mt-1 text-xs text-slate-400 flex items-center gap-1">
                                        <Clock size={10} />
                                        {duration}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (!requests?.length) return <EmptyState icon={History} title="Nema istorije" desc="Obrađeni zahtevi će se prikazati ovde" />;

    // Filter requests
    let filtered = requests.filter(req => {
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
                {(searchQuery || filterType !== 'all') && (
                    <button onClick={() => { setSearchQuery(''); setFilterType('all'); }} className="ml-2 text-emerald-600 hover:text-emerald-700">
                        Obriši filtere
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border overflow-hidden">
                <table className="w-full text-sm">
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
                            {showDetailedView && <th className="hidden lg:table-cell px-4 py-3 text-left">Obradio</th>}
                            <th className="hidden sm:table-cell px-4 py-3 text-center">Težina</th>
                            <th className="hidden xs:table-cell px-2 py-3 text-center w-16">Dokaz</th>
                            {showDetailedView && <th className="hidden md:table-cell px-4 py-3 text-left">Vozač</th>}
                            <th className="px-2 py-3 text-center w-20">Akcije</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={showDetailedView ? 10 : 8} className="px-4 py-8 text-center text-slate-500">Nema rezultata za ovu pretragu</td></tr>
                        ) : filtered.map((req, idx) => {
                            const assignment = driverAssignments[req.request_id];
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
                                    <div className="flex items-center gap-2 text-emerald-600">
                                        <CheckCircle2 size={14} />
                                        <span className="text-xs md:text-sm">{formatDateTime(req.processed_at)}</span>
                                    </div>
                                </td>
                                {/* Processed by column for Company Admin */}
                                {showDetailedView && (
                                    <td className="hidden lg:table-cell px-4 py-3">
                                        {req.processed_by_name ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center">
                                                    <UserCheck size={14} className="text-indigo-600" />
                                                </div>
                                                <span className="text-sm text-slate-700">{req.processed_by_name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400">-</span>
                                        )}
                                    </td>
                                )}
                                <td className="hidden sm:table-cell px-4 py-3 text-center">
                                    {req.weight ? (
                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                                            {req.weight} {req.weight_unit || 'kg'}
                                        </span>
                                    ) : (
                                        <span className="text-slate-300 text-xs">-</span>
                                    )}
                                </td>
                                <td className="hidden xs:table-cell px-2 py-3">
                                    <div className="flex items-center justify-center">
                                        {req.proof_image_url ? (
                                            <button
                                                onClick={() => setViewingProof(req)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                title="Pogledaj dokaz"
                                            >
                                                <Image size={18} />
                                            </button>
                                        ) : (
                                            <span className="text-slate-300"><Image size={18} /></span>
                                        )}
                                    </div>
                                </td>
                                {/* Driver column for detailed view */}
                                {showDetailedView && (
                                    <td className="hidden md:table-cell px-4 py-3">
                                        {loadingAssignments ? (
                                            <Loader2 size={16} className="animate-spin text-slate-400" />
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
                                )}
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
                                    <td colSpan={10} className="px-4 py-3 bg-white border-t">
                                        <TimelineView assignment={assignment} request={req} />
                                    </td>
                                </tr>
                            )}
                            </React.Fragment>
                        );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Proof Image/PDF Modal */}
            {viewingProof && (
                <Modal open={!!viewingProof} onClose={() => setViewingProof(null)} title="Dokaz o izvršenoj usluzi">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <span className="text-2xl">{wasteTypes.find(w => w.id === viewingProof.waste_type)?.icon}</span>
                            <div>
                                <p className="font-medium">{viewingProof.client_name}</p>
                                <p className="text-xs text-slate-500">{viewingProof.waste_label}</p>
                            </div>
                        </div>

                        {/* Check if PDF or Image */}
                        {viewingProof.proof_image_url?.toLowerCase().endsWith('.pdf') ? (
                            <div className="border rounded-xl overflow-hidden">
                                <iframe
                                    src={viewingProof.proof_image_url}
                                    className="w-full h-96"
                                    title="PDF Dokaz"
                                />
                            </div>
                        ) : (
                            <img
                                src={viewingProof.proof_image_url}
                                alt="Dokaz o izvršenoj usluzi"
                                className="w-full rounded-xl"
                            />
                        )}

                        {viewingProof.processing_note && (
                            <div className="p-3 bg-amber-50 rounded-xl">
                                <p className="text-xs text-amber-600 mb-1">Napomena pri obradi</p>
                                <p className="text-sm">{viewingProof.processing_note}</p>
                            </div>
                        )}

                        <p className="text-xs text-slate-500 text-center">
                            Obrađeno: {formatDateTime(viewingProof.processed_at)}
                        </p>

                        {/* Download button */}
                        <a
                            href={viewingProof.proof_image_url}
                            download={`dokaz_${viewingProof.id || Date.now()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium transition-colors"
                        >
                            <Download size={18} />
                            Preuzmi dokaz
                        </a>
                    </div>
                </Modal>
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
                    currentDriverId={driverAssignments[editingRequest.request_id]?.driver?.id || null}
                    onAssignDriver={onAssignDriverToProcessed}
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
                                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
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

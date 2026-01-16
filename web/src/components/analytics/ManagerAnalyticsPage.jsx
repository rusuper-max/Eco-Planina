import { useState, useMemo } from 'react';
import { UserCheck, TrendingUp, Package, Scale, Calendar, ChevronDown, ChevronUp, BarChart3, Users, RotateCcw, AlertTriangle, Loader2, Download, Truck } from 'lucide-react';
import { EmptyState, Modal } from '../common';
import * as XLSX from 'xlsx';

/**
 * Manager Analytics Page - Shows performance metrics for each manager
 * Used by Company Admin to track which managers processed the most requests
 * Also shows driver assignments made by each manager
 */
export const ManagerAnalyticsPage = ({ processedRequests = [], members = [], wasteTypes = [], onResetStats, driverAssignments = [] }) => {
    const [expandedManager, setExpandedManager] = useState(null);
    const [sortBy, setSortBy] = useState('count'); // count, weight, recent
    const [periodFilter, setPeriodFilter] = useState('all'); // all, month, week
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetting, setResetting] = useState(false);

    // Filter by period
    const filteredRequests = useMemo(() => {
        if (periodFilter === 'all') return processedRequests;

        const now = new Date();
        const cutoff = new Date();
        if (periodFilter === 'month') cutoff.setMonth(now.getMonth() - 1);
        if (periodFilter === 'week') cutoff.setDate(now.getDate() - 7);

        return processedRequests.filter(r => new Date(r.processed_at) >= cutoff);
    }, [processedRequests, periodFilter]);

    // Filter driver assignments by period
    const filteredAssignments = useMemo(() => {
        if (periodFilter === 'all') return driverAssignments;

        const now = new Date();
        const cutoff = new Date();
        if (periodFilter === 'month') cutoff.setMonth(now.getMonth() - 1);
        if (periodFilter === 'week') cutoff.setDate(now.getDate() - 7);

        return driverAssignments.filter(a => new Date(a.assigned_at) >= cutoff);
    }, [driverAssignments, periodFilter]);

    // Calculate stats per manager (both processed requests AND driver assignments)
    const managerStats = useMemo(() => {
        const stats = {};

        // Count processed requests
        filteredRequests.forEach(req => {
            const managerId = req.processed_by_id || 'unknown';
            const managerName = req.processed_by_name || 'Nepoznat';

            if (!stats[managerId]) {
                stats[managerId] = {
                    id: managerId,
                    name: managerName,
                    processedCount: 0,
                    assignedCount: 0,
                    totalWeight: 0,
                    wasteTypes: {},
                    clients: new Set(),
                    lastProcessed: null,
                    lastAssigned: null,
                    requests: [],
                    assignments: []
                };
            }

            stats[managerId].processedCount++;
            stats[managerId].totalWeight += parseFloat(req.weight) || 0;

            // Track waste types
            const wasteType = req.waste_type || 'other';
            stats[managerId].wasteTypes[wasteType] = (stats[managerId].wasteTypes[wasteType] || 0) + 1;

            // Track unique clients
            if (req.client_id) stats[managerId].clients.add(req.client_id);

            // Track latest processed
            const processedAt = new Date(req.processed_at);
            if (!stats[managerId].lastProcessed || processedAt > stats[managerId].lastProcessed) {
                stats[managerId].lastProcessed = processedAt;
            }

            // Store request for details
            stats[managerId].requests.push(req);
        });

        // Count driver assignments (who assigned drivers)
        filteredAssignments.forEach(assignment => {
            const assignerId = assignment.assigned_by || 'unknown';
            // Find assigner name from members
            const assigner = members.find(m => m.id === assignerId);
            const assignerName = assigner?.name || 'Nepoznat';

            if (!stats[assignerId]) {
                stats[assignerId] = {
                    id: assignerId,
                    name: assignerName,
                    processedCount: 0,
                    assignedCount: 0,
                    totalWeight: 0,
                    wasteTypes: {},
                    clients: new Set(),
                    lastProcessed: null,
                    lastAssigned: null,
                    requests: [],
                    assignments: []
                };
            }

            stats[assignerId].assignedCount++;

            // Track latest assignment
            const assignedAt = new Date(assignment.assigned_at);
            if (!stats[assignerId].lastAssigned || assignedAt > stats[assignerId].lastAssigned) {
                stats[assignerId].lastAssigned = assignedAt;
            }

            // Store assignment for details
            stats[assignerId].assignments.push(assignment);
        });

        // Convert to array and sort
        let result = Object.values(stats).map(s => ({
            ...s,
            clients: s.clients.size,
            count: s.processedCount // Keep count for backward compatibility
        }));

        // Sort
        if (sortBy === 'count') result.sort((a, b) => b.processedCount - a.processedCount);
        else if (sortBy === 'weight') result.sort((a, b) => b.totalWeight - a.totalWeight);
        else if (sortBy === 'recent') result.sort((a, b) => {
            const aDate = Math.max(a.lastProcessed || 0, a.lastAssigned || 0);
            const bDate = Math.max(b.lastProcessed || 0, b.lastAssigned || 0);
            return bDate - aDate;
        });
        else if (sortBy === 'assignments') result.sort((a, b) => b.assignedCount - a.assignedCount);

        return result;
    }, [filteredRequests, filteredAssignments, members, sortBy]);

    // Find manager info from members
    const getManagerInfo = (managerId) => {
        return members.find(m => m.id === managerId);
    };

    // Get waste type label from ID
    const getWasteTypeLabel = (typeId) => {
        const wasteType = wasteTypes.find(w => w.id === typeId);
        return wasteType?.label || typeId;
    };

    // Get waste type icon from ID
    const getWasteTypeIcon = (typeId) => {
        const wasteType = wasteTypes.find(w => w.id === typeId);
        return wasteType?.icon || '📦';
    };

    // Format weight
    const formatWeight = (kg) => {
        if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
        return `${kg.toFixed(1)} kg`;
    };

    // Calculate totals
    const totals = useMemo(() => ({
        requests: filteredRequests.length,
        assignments: filteredAssignments.length,
        weight: filteredRequests.reduce((sum, r) => sum + (parseFloat(r.weight) || 0), 0),
        managers: managerStats.filter(m => m.id !== 'unknown').length
    }), [filteredRequests, filteredAssignments, managerStats]);

    // Export to Excel
    const handleExportExcel = () => {
        // Prepare manager summary data
        const summaryData = managerStats.map((manager, index) => ({
            'Rang': index + 1,
            'Menadžer': manager.name,
            'Broj zahteva': manager.count,
            'Ukupna težina (kg)': manager.totalWeight.toFixed(1),
            'Broj klijenata': manager.clients,
            'Poslednja aktivnost': manager.lastProcessed
                ? manager.lastProcessed.toLocaleDateString('sr-RS')
                : 'N/A'
        }));

        // Prepare detailed requests data
        const detailedData = processedRequests.map(req => ({
            'Datum obrade': new Date(req.processed_at).toLocaleDateString('sr-RS'),
            'Vreme': new Date(req.processed_at).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' }),
            'Menadžer': req.processed_by_name || 'Nepoznat',
            'Klijent': req.client_name || 'Nepoznat',
            'Adresa': req.client_address || '',
            'Vrsta robe': getWasteTypeLabel(req.waste_type),
            'Težina (kg)': req.weight || '',
            'Napomena': req.processing_note || ''
        }));

        // Create workbook with multiple sheets
        const wb = XLSX.utils.book_new();

        // Summary sheet
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Pregled po menadžerima');

        // Detailed sheet
        const wsDetailed = XLSX.utils.json_to_sheet(detailedData);
        XLSX.utils.book_append_sheet(wb, wsDetailed, 'Svi zahtevi');

        // Generate filename with date
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `Ucinci_menadzera_${dateStr}.xlsx`;

        // Download
        XLSX.writeFile(wb, filename);
    };

    // Handle reset stats
    const handleResetStats = async () => {
        if (!onResetStats) return;
        setResetting(true);
        try {
            await onResetStats();
            setShowResetModal(false);
        } catch (err) {
            console.error('Error resetting stats:', err);
        } finally {
            setResetting(false);
        }
    };

    if (!processedRequests?.length) {
        return <EmptyState icon={UserCheck} title="Nema podataka" desc="Kada menadžeri obrade zahteve, ovde ćete videti njihovu statistiku" />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Učinak menadžera</h1>
                    <p className="text-slate-500 mt-1">Pregledajte koliko je svaki menadžer obradio zahteva</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={periodFilter}
                        onChange={(e) => setPeriodFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                    >
                        <option value="all">Svi periodi</option>
                        <option value="month">Poslednjih mesec dana</option>
                        <option value="week">Poslednjih 7 dana</option>
                    </select>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                    >
                        <option value="count">Po broju obrada</option>
                        <option value="assignments">Po broju dodela</option>
                        <option value="weight">Po težini</option>
                        <option value="recent">Po aktivnosti</option>
                    </select>
                    {onResetStats && (
                        <button
                            onClick={() => setShowResetModal(true)}
                            className="px-3 py-2 border border-red-200 text-red-600 rounded-xl text-sm bg-white hover:bg-red-50 flex items-center gap-1.5"
                        >
                            <RotateCcw size={16} />
                            <span className="hidden sm:inline">Restart</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Obrađeno</p>
                            <p className="text-2xl font-bold text-slate-800">{totals.requests}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                            <Truck className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Dodela</p>
                            <p className="text-2xl font-bold text-slate-800">{totals.assignments}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <Scale className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Ukupna težina</p>
                            <p className="text-2xl font-bold text-slate-800">{formatWeight(totals.weight)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Menadžera</p>
                            <p className="text-2xl font-bold text-slate-800">{totals.managers}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Manager Cards */}
            <div className="space-y-3">
                {managerStats.map((manager, index) => {
                    const isExpanded = expandedManager === manager.id;
                    const memberInfo = getManagerInfo(manager.id);
                    const percentage = totals.requests > 0 ? ((manager.count / totals.requests) * 100).toFixed(1) : 0;

                    return (
                        <div
                            key={manager.id}
                            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
                        >
                            {/* Main row */}
                            <div
                                className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => setExpandedManager(isExpanded ? null : manager.id)}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Rank badge */}
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                                        index === 0 ? 'bg-amber-100 text-amber-700' :
                                        index === 1 ? 'bg-slate-200 text-slate-600' :
                                        index === 2 ? 'bg-orange-100 text-orange-700' :
                                        'bg-slate-100 text-slate-500'
                                    }`}>
                                        {index + 1}
                                    </div>

                                    {/* Manager info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-slate-800 truncate">
                                                {manager.name}
                                            </h3>
                                            {manager.id === 'unknown' && (
                                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                                                    Bez podataka
                                                </span>
                                            )}
                                        </div>
                                        {memberInfo?.phone && (
                                            <p className="text-sm text-slate-500">{memberInfo.phone}</p>
                                        )}
                                    </div>

                                    {/* Stats */}
                                    <div className="hidden sm:flex items-center gap-4 text-center">
                                        <div>
                                            <p className="text-xl font-bold text-indigo-600">{manager.processedCount}</p>
                                            <p className="text-xs text-slate-500">obrada</p>
                                        </div>
                                        <div>
                                            <p className="text-xl font-bold text-amber-600">{manager.assignedCount}</p>
                                            <p className="text-xs text-slate-500">dodela</p>
                                        </div>
                                        <div>
                                            <p className="text-xl font-bold text-emerald-600">{formatWeight(manager.totalWeight)}</p>
                                            <p className="text-xs text-slate-500">težina</p>
                                        </div>
                                        <div>
                                            <p className="text-xl font-bold text-blue-600">{manager.clients}</p>
                                            <p className="text-xs text-slate-500">klijenata</p>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="hidden md:block w-32">
                                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                            <span>{percentage}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Expand icon */}
                                    <div className="text-slate-400">
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {/* Mobile stats */}
                                <div className="sm:hidden flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                                    <div className="flex-1 text-center">
                                        <p className="text-lg font-bold text-indigo-600">{manager.processedCount}</p>
                                        <p className="text-xs text-slate-500">obrada</p>
                                    </div>
                                    <div className="flex-1 text-center">
                                        <p className="text-lg font-bold text-amber-600">{manager.assignedCount}</p>
                                        <p className="text-xs text-slate-500">dodela</p>
                                    </div>
                                    <div className="flex-1 text-center">
                                        <p className="text-lg font-bold text-emerald-600">{formatWeight(manager.totalWeight)}</p>
                                        <p className="text-xs text-slate-500">težina</p>
                                    </div>
                                    <div className="flex-1 text-center">
                                        <p className="text-lg font-bold text-blue-600">{manager.clients}</p>
                                        <p className="text-xs text-slate-500">klijent</p>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded details */}
                            {isExpanded && (
                                <div className="px-4 pb-4 border-t border-slate-100 bg-slate-50">
                                    <div className="pt-4 space-y-4">
                                        {/* Waste types breakdown */}
                                        <div>
                                            <h4 className="text-sm font-medium text-slate-600 mb-2">Po vrstama robe</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(manager.wasteTypes).map(([type, count]) => (
                                                    <span
                                                        key={type}
                                                        className="px-3 py-1.5 bg-white rounded-lg text-sm border border-slate-200 flex items-center gap-1.5"
                                                    >
                                                        <span>{getWasteTypeIcon(type)}</span>
                                                        <span className="font-medium">{getWasteTypeLabel(type)}</span>
                                                        <span className="text-slate-500">({count})</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Recent activity */}
                                        <div>
                                            <h4 className="text-sm font-medium text-slate-600 mb-2">Poslednja aktivnost</h4>
                                            <div className="bg-white rounded-xl p-3 border border-slate-200">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar size={16} className="text-slate-400" />
                                                    <span className="text-slate-700">
                                                        {manager.lastProcessed
                                                            ? manager.lastProcessed.toLocaleString('sr-RS', {
                                                                day: 'numeric',
                                                                month: 'long',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })
                                                            : 'Nema podataka'
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Recent requests list */}
                                        <div>
                                            <h4 className="text-sm font-medium text-slate-600 mb-2">
                                                Poslednjih 5 obrađenih zahteva
                                            </h4>
                                            <div className="space-y-2">
                                                {manager.requests
                                                    .sort((a, b) => new Date(b.processed_at) - new Date(a.processed_at))
                                                    .slice(0, 5)
                                                    .map((req, idx) => (
                                                        <div
                                                            key={req.id || idx}
                                                            className="bg-white rounded-lg p-3 border border-slate-200 flex items-center justify-between"
                                                        >
                                                            <div>
                                                                <p className="font-medium text-sm text-slate-800">
                                                                    {req.client_name || 'Nepoznat klijent'}
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    {req.waste_label || req.waste_type}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm font-medium text-emerald-600">
                                                                    {req.weight ? `${req.weight} kg` : '-'}
                                                                </p>
                                                                <p className="text-xs text-slate-400">
                                                                    {new Date(req.processed_at).toLocaleDateString('sr-RS')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Reset Confirmation Modal */}
            {showResetModal && (
                <Modal open={showResetModal} onClose={() => setShowResetModal(false)} title="Restart statistike">
                    <div className="space-y-4">
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="font-medium text-amber-800">Pažnja!</p>
                                    <p className="text-sm text-amber-600 mt-1">
                                        Ova akcija će obrisati svu istoriju obrađenih zahteva i resetovati statistiku menadžera na nulu.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl">
                            <p className="text-sm text-slate-600 mb-3">Trenutna statistika:</p>
                            <div className="flex gap-4 text-center">
                                <div className="flex-1 p-2 bg-white rounded-lg border">
                                    <p className="text-xl font-bold text-indigo-600">{totals.requests}</p>
                                    <p className="text-xs text-slate-500">zahteva</p>
                                </div>
                                <div className="flex-1 p-2 bg-white rounded-lg border">
                                    <p className="text-xl font-bold text-emerald-600">{formatWeight(totals.weight)}</p>
                                    <p className="text-xs text-slate-500">težina</p>
                                </div>
                                <div className="flex-1 p-2 bg-white rounded-lg border">
                                    <p className="text-xl font-bold text-blue-600">{totals.managers}</p>
                                    <p className="text-xs text-slate-500">menadžera</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <p className="text-sm font-medium text-emerald-800 mb-2">
                                Preporučujemo da prvo preuzmete podatke:
                            </p>
                            <button
                                onClick={handleExportExcel}
                                className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2 font-medium"
                            >
                                <Download size={18} />
                                Preuzmi Excel izveštaj
                            </button>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowResetModal(false)}
                                disabled={resetting}
                                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium"
                            >
                                Otkaži
                            </button>
                            <button
                                onClick={handleResetStats}
                                disabled={resetting}
                                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium flex items-center justify-center gap-2"
                            >
                                {resetting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Brisanje...
                                    </>
                                ) : (
                                    <>
                                        <RotateCcw size={18} />
                                        Potvrdi restart
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ManagerAnalyticsPage;

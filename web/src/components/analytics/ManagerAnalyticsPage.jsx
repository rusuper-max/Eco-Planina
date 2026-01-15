import { useState, useMemo } from 'react';
import { UserCheck, TrendingUp, Package, Scale, Calendar, ChevronDown, ChevronUp, BarChart3, Users } from 'lucide-react';
import { EmptyState } from '../common';

/**
 * Manager Analytics Page - Shows performance metrics for each manager
 * Used by Company Admin to track which managers processed the most requests
 */
export const ManagerAnalyticsPage = ({ processedRequests = [], members = [], wasteTypes = [] }) => {
    const [expandedManager, setExpandedManager] = useState(null);
    const [sortBy, setSortBy] = useState('count'); // count, weight, recent
    const [periodFilter, setPeriodFilter] = useState('all'); // all, month, week

    // Filter by period
    const filteredRequests = useMemo(() => {
        if (periodFilter === 'all') return processedRequests;

        const now = new Date();
        const cutoff = new Date();
        if (periodFilter === 'month') cutoff.setMonth(now.getMonth() - 1);
        if (periodFilter === 'week') cutoff.setDate(now.getDate() - 7);

        return processedRequests.filter(r => new Date(r.processed_at) >= cutoff);
    }, [processedRequests, periodFilter]);

    // Calculate stats per manager
    const managerStats = useMemo(() => {
        const stats = {};

        filteredRequests.forEach(req => {
            const managerId = req.processed_by_id || 'unknown';
            const managerName = req.processed_by_name || 'Nepoznat';

            if (!stats[managerId]) {
                stats[managerId] = {
                    id: managerId,
                    name: managerName,
                    count: 0,
                    totalWeight: 0,
                    wasteTypes: {},
                    clients: new Set(),
                    lastProcessed: null,
                    requests: []
                };
            }

            stats[managerId].count++;
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

        // Convert to array and sort
        let result = Object.values(stats).map(s => ({
            ...s,
            clients: s.clients.size
        }));

        // Sort
        if (sortBy === 'count') result.sort((a, b) => b.count - a.count);
        else if (sortBy === 'weight') result.sort((a, b) => b.totalWeight - a.totalWeight);
        else if (sortBy === 'recent') result.sort((a, b) => (b.lastProcessed || 0) - (a.lastProcessed || 0));

        return result;
    }, [filteredRequests, sortBy]);

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
        weight: filteredRequests.reduce((sum, r) => sum + (parseFloat(r.weight) || 0), 0),
        managers: managerStats.filter(m => m.id !== 'unknown').length
    }), [filteredRequests, managerStats]);

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
                        <option value="count">Po broju zahteva</option>
                        <option value="weight">Po težini</option>
                        <option value="recent">Po aktivnosti</option>
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Ukupno obrađeno</p>
                            <p className="text-2xl font-bold text-slate-800">{totals.requests}</p>
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
                            <p className="text-sm text-slate-500">Aktivnih menadžera</p>
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
                                    <div className="hidden sm:flex items-center gap-6 text-center">
                                        <div>
                                            <p className="text-2xl font-bold text-indigo-600">{manager.count}</p>
                                            <p className="text-xs text-slate-500">zahteva</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-emerald-600">{formatWeight(manager.totalWeight)}</p>
                                            <p className="text-xs text-slate-500">težina</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-blue-600">{manager.clients}</p>
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
                                <div className="sm:hidden flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
                                    <div className="flex-1 text-center">
                                        <p className="text-lg font-bold text-indigo-600">{manager.count}</p>
                                        <p className="text-xs text-slate-500">zahteva</p>
                                    </div>
                                    <div className="flex-1 text-center">
                                        <p className="text-lg font-bold text-emerald-600">{formatWeight(manager.totalWeight)}</p>
                                        <p className="text-xs text-slate-500">težina</p>
                                    </div>
                                    <div className="flex-1 text-center">
                                        <p className="text-lg font-bold text-blue-600">{manager.clients}</p>
                                        <p className="text-xs text-slate-500">klijenata</p>
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

            {/* Empty state for unknown managers info */}
            {managerStats.some(m => m.id === 'unknown') && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                    <strong>Napomena:</strong> Zahtevi označeni kao "Bez podataka" su obrađeni pre uvođenja praćenja menadžera.
                    Novi zahtevi će automatski beležiti ko ih je obradio.
                </div>
            )}
        </div>
    );
};

export default ManagerAnalyticsPage;
